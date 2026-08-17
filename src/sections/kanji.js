import { KANJI, KANJI_GROUPS, RADICALS } from '../data/kanji.js';
import { quiz } from '../utils/quiz.js';
import { shuffle } from '../utils/helpers.js';
import { updateBest, getState, save } from '../state.js';
// KanjiVG stroke data — pre-fetched at build time
import STROKES from '../data/kanjivg-strokes.json';

let selKanji = null;
let strokeMode = 'watch'; // 'watch' | 'trace'

/** Build meaning quiz questions from kanji pool */
export function kanjiQs(n) {
  const pool = shuffle(KANJI).slice(0, n);
  return pool.map(k => {
    const correct = k[3];
    const distractors = shuffle(KANJI.filter(x => x[3] !== k[3])).slice(0, 3).map(x => x[3]);
    const options = shuffle([correct, ...distractors]);
    return { q: `<span class="big-kana">${k[0]}</span>`, options, a: options.indexOf(correct) };
  });
}

export function renderKanji() {
  if (selKanji === null) renderKanjiList();
  else renderKanjiDetail();
}

function renderKanjiList() {
  const main = document.getElementById('main');
  main.innerHTML = `
    <div class="sec-title">Kanji Trainer</div>
    <div class="sec-sub">103 N5 kanji grouped by theme. Tap a kanji to see stroke order and trace it.</div>
    <div class="btnrow" style="justify-content:flex-start;margin-bottom:14px">
      <button class="btn primary" id="kqbtn">Kanji → Meaning quiz</button>
    </div>
    <div id="kg"></div>
    <div id="kqz" style="margin-top:24px"></div>`;

  const kg = document.getElementById('kg');
  let idx = 0;
  KANJI_GROUPS.forEach(g => {
    const lab = document.createElement('div');
    lab.className = 'kg-label';
    lab.innerHTML = `${g.name} <span class="mono" style="color:#b9ae94">${g.n}</span>`;
    kg.appendChild(lab);

    const grid = document.createElement('div');
    grid.className = 'kanji-grid';
    const P = getState();
    for (let j = 0; j < g.n; j++) {
      const k = KANJI[idx++];
      const tile = document.createElement('div');
      tile.className = 'ktile' + (P.kanjiLearned.includes(k[0]) ? ' learned' : '');
      tile.innerHTML = `<span class="k">${k[0]}</span>`;
      tile.title = k[3];
      tile.onclick = () => { selKanji = k; strokeMode = 'watch'; renderKanji(); };
      grid.appendChild(tile);
    }
    kg.appendChild(grid);
  });

  document.getElementById('kqbtn').onclick = () =>
    quiz(document.getElementById('kqz'), kanjiQs(12), {
      onDone: (s, t) => updateBest('kanji', s, t),
    });
}

function renderKanjiDetail() {
  const k = selKanji;
  const P = getState();
  const rad = RADICALS[k[4]] || ['—', ''];
  const main = document.getElementById('main');

  main.innerHTML = `
    <button class="btn" id="bk-btn">← All kanji</button>
    <div class="card" style="margin-top:14px">
      <div class="kd-head">
        <div class="kd-glyph">${k[0]}</div>
        <div>
          <div style="font:700 22px var(--sans)">${k[3]}</div>
          <div style="margin-top:6px">
            <span class="chip on" title="On-yomi">ON ${k[1] || '–'}</span>
          </div>
          <div>
            <span class="chip kun" title="Kun-yomi">KUN ${k[2] || '–'}</span>
          </div>
        </div>
      </div>

      <div class="rad-row">
        <div class="rad-glyph">${k[4]}</div>
        <div>
          <div style="font-weight:700">${rad[0]}</div>
          <div style="font-size:12.5px;color:var(--ink2)">${rad[1]}</div>
        </div>
      </div>

      <div class="mode-tabs" style="display:flex;gap:8px;margin:12px 0">
        <button class="btn ${strokeMode === 'watch' ? 'red' : ''}" id="mw-btn"><ion-icon name="play-outline"></ion-icon> Watch</button>
        <button class="btn ${strokeMode === 'trace' ? 'red' : ''}" id="mt-btn"><ion-icon name="pencil-outline"></ion-icon> Trace</button>
      </div>

      <div class="kanji-detail">
        <div>
          <div class="canvas-wrap" id="cw">
            <svg id="stage" viewBox="-8 -8 125 125"></svg>
            <div class="stamp" id="stamp">完</div>
          </div>
          <div id="ctl"></div>
          <div class="tp-msg" id="tpmsg"></div>
        </div>
        <div>
          <h4 style="margin-bottom:10px;font-size:14px">Example words</h4>
          <div id="exw"></div>
          <button class="btn primary" id="learn-btn" style="margin-top:12px">
            ${P.kanjiLearned.includes(k[0]) ? '<ion-icon name="checkmark-circle"></ion-icon> Learned' : 'Mark as learned'}
          </button>
        </div>
      </div>
    </div>`;

  document.getElementById('bk-btn').onclick = () => { selKanji = null; renderKanji(); };
  document.getElementById('mw-btn').onclick  = () => { strokeMode = 'watch'; renderKanjiDetail(); };
  document.getElementById('mt-btn').onclick  = () => { strokeMode = 'trace'; renderKanjiDetail(); };

  // Example words
  const exw = document.getElementById('exw');
  k[5].forEach(([word, reading, gloss]) => {
    const row = document.createElement('div');
    row.className = 'ex-row';
    row.innerHTML = `<span class="w">${word}</span><span class="r">${reading}</span><span class="g">${gloss}</span>`;
    exw.appendChild(row);
  });

  // Learn toggle
  document.getElementById('learn-btn').onclick = () => {
    const state = getState();
    const idx = state.kanjiLearned.indexOf(k[0]);
    if (idx >= 0) state.kanjiLearned.splice(idx, 1);
    else state.kanjiLearned.push(k[0]);
    save();
    renderKanjiDetail();
  };

  loadKanjiStrokes(k[0]);
}

/* ============================================================
   Stroke animation (build-time bundled KanjiVG data)
   ============================================================ */
const NS = 'http://www.w3.org/2000/svg';
function svgEl(tag, attrs) {
  const el = document.createElementNS(NS, tag);
  for (const k in attrs) el.setAttribute(k, attrs[k]);
  return el;
}

const GUIDES = `
  <rect class="guide-rect" x="0" y="0" width="109" height="109" fill="none" stroke-width="1" rx="2"/>
  <line class="guide-mid" x1="54.5" y1="0" x2="54.5" y2="109" stroke-width=".7" stroke-dasharray="3.5 3.5"/>
  <line class="guide-mid" x1="0" y1="54.5" x2="109" y2="54.5" stroke-width=".7" stroke-dasharray="3.5 3.5"/>
  <line class="guide-diag" x1="0" y1="0" x2="109" y2="109" stroke-width=".55" stroke-dasharray="2.5 4"/>
  <line class="guide-diag" x1="109" y1="0" x2="0" y2="109" stroke-width=".55" stroke-dasharray="2.5 4"/>`;

function loadKanjiStrokes(ch) {
  const svg  = document.getElementById('stage');
  const cw   = document.getElementById('cw');
  const ctl  = document.getElementById('ctl');
  const msg  = document.getElementById('tpmsg');

  svg.innerHTML = '';
  cw.classList.remove('trace');
  document.getElementById('stamp').classList.remove('show');

  const ds = STROKES[ch];
  if (!ds || ds.length === 0) {
    msg.textContent = 'Stroke data not available for this character.';
    msg.className = 'tp-msg err';
    return;
  }

  svg.innerHTML = GUIDES;

  const ghostG  = svgEl('g', {});
  const strokeG = svgEl('g', {});
  const numG    = svgEl('g', {});
  svg.appendChild(ghostG);
  svg.appendChild(strokeG);
  svg.appendChild(numG);

  const paths = [];
  ds.forEach((d, j) => {
    ghostG.appendChild(svgEl('path', { d, class: 'ghost' }));
    const sp = svgEl('path', { d, class: 'stroke' });
    strokeG.appendChild(sp);
    const len = sp.getTotalLength();
    sp.style.strokeDasharray = len;
    sp.style.strokeDashoffset = len;

    const m  = d.match(/M\s*([-0-9.]+)[\s,]+([-0-9.]+)/);
    const sx = Math.min(Math.max(m ? +m[1] : 0, 3), 106);
    const sy = Math.min(Math.max(m ? +m[2] : 0, 3), 106);

    const g = svgEl('g', {});
    g.appendChild(svgEl('circle', { cx: sx, cy: sy, r: 3.4, class: 'stroke-num-dot' }));
    const tx = svgEl('text', { x: sx, y: sy, dy: '0.34em', 'text-anchor': 'middle' });
    tx.textContent = j + 1;
    tx.setAttribute('fill', '#fff');
    tx.setAttribute('font-size', '4.9');
    tx.setAttribute('font-family', 'IBM Plex Mono');
    g.appendChild(tx);
    numG.appendChild(g);

    paths.push({ el: sp, len, d, sx, sy });
  });

  if (strokeMode === 'watch') setupWatch(paths, ctl, msg);
  else setupTrace(paths, svg, cw, ctl, msg);
}

/* ---- Watch mode ---- */
function setupWatch(paths, ctl, msg) {
  ctl.innerHTML = `
    <div class="btnrow" style="margin-top:12px">
      <button class="btn primary" id="play-btn"><ion-icon name="play-outline"></ion-icon> Replay</button>
      <button class="btn" id="rst-btn"><ion-icon name="refresh-outline"></ion-icon> Restart</button>
    </div>`;

  let i = 0, playing = false, raf = null;

  function reset() {
    paths.forEach(p => { p.el.style.strokeDashoffset = p.len; p.el.classList.remove('current'); });
    i = 0;
    document.getElementById('stamp')?.classList.remove('show');
  }

  function finishStroke(j) {
    paths[j].el.style.strokeDashoffset = 0;
    paths[j].el.classList.remove('current');
    if (j + 1 >= paths.length) document.getElementById('stamp')?.classList.add('show');
  }

  function step() {
    if (i >= paths.length) {
      playing = false;
      return;
    }
    const p = paths[i];
    p.el.classList.add('current');
    const dur = Math.max(160, (p.len / 210) * 1000);
    const t0 = performance.now();
    function fr(now) {
      const pr = Math.min(1, (now - t0) / dur);
      const ease = 1 - Math.pow(1 - pr, 1.35);
      p.el.style.strokeDashoffset = p.len * (1 - ease);
      if (pr < 1) {
        raf = requestAnimationFrame(fr);
      } else {
        finishStroke(i);
        i++;
        if (playing && i < paths.length) setTimeout(step, 200);
        else playing = false;
      }
    }
    raf = requestAnimationFrame(fr);
  }

  function play() {
    if (playing) return;
    if (i >= paths.length) reset();
    playing = true;
    step();
  }

  document.getElementById('play-btn').onclick = () => play();
  document.getElementById('rst-btn').onclick = () => {
    playing = false;
    if (raf) cancelAnimationFrame(raf);
    reset();
    // Auto-play again after restart
    setTimeout(play, 80);
  };

  // Autoplay on load: entire kanji is already shown as light ghost paths;
  // strokes animate on top of the full background outline.
  reset();
  setTimeout(play, 180);
}

/* ---- Trace mode ---- */
const SAMPLES = 22;

function resample(poly, n) {
  if (poly.length < 2) return null;
  const d = [0];
  for (let i = 1; i < poly.length; i++)
    d[i] = d[i - 1] + Math.hypot(poly[i][0] - poly[i - 1][0], poly[i][1] - poly[i - 1][1]);
  const total = d[d.length - 1];
  if (total < 0.001) return null;
  const out = [];
  let seg = 1;
  for (let i = 0; i < n; i++) {
    const t = (total * i) / (n - 1);
    while (seg < poly.length - 1 && d[seg] < t) seg++;
    const d0 = d[seg - 1], d1 = d[seg];
    const f = d1 > d0 ? (t - d0) / (d1 - d0) : 0;
    out.push([
      poly[seg - 1][0] + (poly[seg][0] - poly[seg - 1][0]) * f,
      poly[seg - 1][1] + (poly[seg][1] - poly[seg - 1][1]) * f,
    ]);
  }
  return out;
}

function distStats(a, b) {
  let s = 0, mx = 0;
  for (let i = 0; i < a.length; i++) {
    const dd = Math.hypot(a[i][0] - b[i][0], a[i][1] - b[i][1]);
    s += dd;
    if (dd > mx) mx = dd;
  }
  return { mean: s / a.length, max: mx };
}

function setupTrace(paths, svg, cw, ctl, msg) {
  cw.classList.add('trace');
  ctl.innerHTML = `
    <div class="btnrow" style="margin-top:12px">
      <button class="btn" id="undo-btn"><ion-icon name="arrow-undo-outline"></ion-icon> Undo</button>
      <button class="btn" id="rst-btn"><ion-icon name="refresh-outline"></ion-icon> Reset</button>
      <button class="btn" id="show-btn"><ion-icon name="eye-outline"></ion-icon> Show order</button>
    </div>`;

  const targetG = svgEl('g', {});
  const doneG   = svgEl('g', {});
  const drawG   = svgEl('g', {});
  svg.appendChild(targetG);
  svg.appendChild(doneG);
  svg.appendChild(drawG);

  const samples = paths.map(p => {
    const L = p.el.getTotalLength();
    const pts = [];
    for (let i = 0; i < SAMPLES; i++) {
      const pt = p.el.getPointAtLength((L * i) / (SAMPLES - 1));
      pts.push([pt.x, pt.y]);
    }
    return { pts, len: L };
  });

  let cur = 0, drawing = false, pts = [], curLine = null, busy = false;

  function showTarget() {
    targetG.innerHTML = '';
    if (cur >= paths.length) return;
    targetG.appendChild(svgEl('path', { d: paths[cur].d, class: 'trace-target' }));
    targetG.appendChild(svgEl('circle', { cx: paths[cur].sx, cy: paths[cur].sy, r: 3.4, class: 'trace-dot' }));
    const t = svgEl('text', {
      x: paths[cur].sx,
      y: Math.max(paths[cur].sy - 6, 2.5),
      'text-anchor': 'middle',
    });
    t.textContent = cur + 1;
    t.setAttribute('fill', '#9c2b1e');
    t.setAttribute('font-size', '5');
    t.setAttribute('font-family', 'IBM Plex Mono');
    targetG.appendChild(t);
  }

  function updMsg() {
    if (cur >= paths.length) {
      msg.textContent = 'Complete! Beautiful.';
      msg.className = 'tp-msg ok';
      document.getElementById('stamp')?.classList.add('show');
    } else {
      msg.textContent = `Stroke ${cur + 1} of ${paths.length} — start at the red dot`;
      msg.className = 'tp-msg';
    }
  }

  function evaluate() {
    if (pts.length < 3) return { ok: false, msg: 'Draw the whole stroke in one motion.' };
    const s = samples[cur];
    const u = resample(pts, SAMPLES);
    if (!u) return { ok: false, msg: 'Draw the whole stroke.' };
    let uL = 0;
    for (let i = 1; i < pts.length; i++)
      uL += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
    if (uL < s.len * 0.3) return { ok: false, msg: 'Too short — follow the whole guide.' };
    const fwd = distStats(u, s.pts);
    const rev = distStats([...u].reverse(), s.pts);
    if (rev.mean < fwd.mean * 0.8) return { ok: false, msg: 'Wrong direction — start at the red dot.' };
    const sd = Math.hypot(u[0][0] - s.pts[0][0], u[0][1] - s.pts[0][1]);
    if (sd > 15) return { ok: false, msg: 'Start closer to the red dot.' };
    if (fwd.mean > 8.6 || fwd.max > 19) return { ok: false, msg: 'Off the guide — try again.' };
    return { ok: true };
  }

  function accept() {
    curLine?.remove(); curLine = null;
    doneG.appendChild(svgEl('path', { d: paths[cur].d, class: 'trace-done', pathLength: 1 }));
    cur++;
    showTarget();
    updMsg();
  }

  function reject(res) {
    curLine?.remove(); curLine = null;
    msg.textContent = res.msg;
    msg.className = 'tp-msg err';
  }

  function getXY(ev) {
    const rect = svg.getBoundingClientRect();
    return [
      ((ev.clientX - rect.left) / rect.width)  * 125 - 8,
      ((ev.clientY - rect.top)  / rect.height) * 125 - 8,
    ];
  }

  svg.onpointerdown = ev => {
    if (busy || cur >= paths.length) return;
    ev.preventDefault();
    try { svg.setPointerCapture(ev.pointerId); } catch (_) {}
    drawing = true;
    pts = [getXY(ev)];
    curLine = svgEl('polyline', { class: 'trace-user', points: `${pts[0][0].toFixed(1)},${pts[0][1].toFixed(1)}` });
    drawG.appendChild(curLine);
  };

  svg.onpointermove = ev => {
    if (!drawing) return;
    const p = getXY(ev), last = pts[pts.length - 1];
    if (Math.hypot(p[0] - last[0], p[1] - last[1]) > 0.6) {
      pts.push(p);
      curLine.setAttribute('points', pts.map(q => `${q[0].toFixed(1)},${q[1].toFixed(1)}`).join(' '));
    }
  };

  const end = () => { if (!drawing) return; drawing = false; const r = evaluate(); r.ok ? accept() : reject(r); };
  svg.onpointerup = end;
  svg.onpointercancel = end;

  document.getElementById('undo-btn').onclick = () => {
    if (busy || cur === 0) return;
    cur--;
    doneG.lastElementChild?.remove();
    document.getElementById('stamp')?.classList.remove('show');
    showTarget();
    updMsg();
  };

  document.getElementById('rst-btn').onclick = () => {
    if (busy) return;
    drawG.innerHTML = '';
    doneG.innerHTML = '';
    cur = 0;
    document.getElementById('stamp')?.classList.remove('show');
    showTarget();
    updMsg();
  };

  document.getElementById('show-btn').onclick = () => {
    if (busy || !paths.length) return;
    busy = true;
    targetG.innerHTML = '';
    const prevDisplay = doneG.style.display;
    doneG.style.display = 'none';
    drawG.innerHTML = '';
    paths.forEach((p, i) => {
      const pp = svgEl('path', { d: p.d, class: 'replay-anim', pathLength: 1 });
      pp.style.animationDelay = `${i * 0.55}s`;
      targetG.appendChild(pp);
    });
    setTimeout(() => {
      doneG.style.display = prevDisplay;
      busy = false;
      showTarget();
      updMsg();
    }, paths.length * 550 + 680);
  };

  showTarget();
  updMsg();
}
