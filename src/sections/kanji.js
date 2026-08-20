import kanjiData from '../data/kanji.json' with { type: 'json' };
const { KANJI, KANJI_GROUPS, RADICALS } = kanjiData;
import { shuffle } from '../utils/helpers.js';
import { updateBest, getState, toggleKanjiFlag, setVocabKanjiMode, setShowFurigana } from '../state.js';
import { runFullQuiz } from '../utils/fullQuiz.js';
// KanjiVG stroke data — pre-fetched at build time
import STROKES from '../data/kanjivg-strokes.json' with { type: 'json' };

let selKanji = null;
let strokeMode = 'watch'; // 'watch' | 'trace'


/** Build meaning quiz questions from kanji pool (or learned-only) */
export function kanjiQs(n, onlyLearned = false) {
  const P = getState();
  let source = KANJI;
  if (onlyLearned) {
    source = KANJI.filter(k => (P.kanjiCanRead || P.kanjiLearned || []).includes(k[0]));
    if (source.length < 4) return [];
  }
  const pool = shuffle(source).slice(0, Math.min(n, source.length));
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
  const P = getState();
  const learnedCount = (P.kanjiCanRead || P.kanjiLearned || []).length;
  const mode = P.vocabKanjiMode || 'learned';
  main.innerHTML = `
    <div class="sec-title">Kanji Trainer</div>
    <div class="sec-sub">103 N5 kanji grouped by theme. Tap a kanji to see stroke order and trace it.</div>
    <div class="btnrow" style="justify-content:flex-start;margin-bottom:14px;flex-wrap:wrap">
      <button class="btn primary" id="kqbtn"><ion-icon name="help-circle-outline"></ion-icon> Meaning quiz</button>
      <button class="btn" id="klqbtn" ${learnedCount < 4 ? 'disabled title="Mark at least 4 kanji as learned"' : ''}>
        <ion-icon name="checkmark-done-outline"></ion-icon> Learned quiz (${learnedCount})
      </button>
    </div>
    <div class="vocab-controls card" style="margin-bottom:14px;padding:12px 14px">
      <div class="vc-row">
        <span class="vc-label">Kanji display</span>
        <div class="seg-control" role="group" aria-label="Kanji display mode">
          <button type="button" class="seg ${mode === 'all' ? 'on' : ''}" data-mode="all">All kanji</button>
          <button type="button" class="seg ${mode === 'learned' ? 'on' : ''}" data-mode="learned">Learned only</button>
          <button type="button" class="seg ${mode === 'none' ? 'on' : ''}" data-mode="none">No kanji</button>
        </div>
      </div>
      <div class="vc-row" style="margin-top:10px">
        <label class="toggle-label" style="border:none;padding:0;background:transparent">
          <input type="checkbox" id="kfuri-toggle" ${P.showFurigana !== false ? 'checked' : ''}/>
          <span>Furigana (ruby readings)</span>
        </label>
      </div>
      <p style="font-size:12px;color:var(--ink2);margin-top:8px">Applies to vocabulary and example words across the app. Yellow tile = can read · Green = can read + write.</p>
    </div>
    <div id="kg"></div>`;

  const kg = document.getElementById('kg');
  let idx = 0;
  KANJI_GROUPS.forEach(g => {
    const lab = document.createElement('div');
    lab.className = 'kg-label';
    lab.innerHTML = `${g.name} <span class="mono" style="color:var(--ink2)">${g.n}</span>`;
    kg.appendChild(lab);

    const grid = document.createElement('div');
    grid.className = 'kanji-grid';
    for (let j = 0; j < g.n; j++) {
      const k = KANJI[idx++];
      const tile = document.createElement('div');
      const canRead = (P.kanjiCanRead || P.kanjiLearned || []).includes(k[0]);
      const canWrite = (P.kanjiCanWrite || []).includes(k[0]);
      let cls = 'ktile';
      if (canRead && canWrite) cls += ' can-both';
      else if (canRead) cls += ' can-read';
      tile.className = cls;
      tile.innerHTML = `<span class="k">${k[0]}</span>`;
      tile.title = k[3] + (canRead ? ' · can read' : '') + (canWrite ? ' · can write' : '');
      tile.onclick = () => { selKanji = k; strokeMode = 'watch'; renderKanji(); };
      grid.appendChild(tile);
    }
    kg.appendChild(grid);
  });

  document.getElementById('kqbtn').onclick = () =>
    runFullQuiz(kanjiQs(12), {
      onDone: (s, t) => updateBest('kanji', s, t),
      onExit: renderKanjiList,
      backLabel: '← Kanji Trainer',
    });

  document.querySelectorAll('.seg-control .seg').forEach(btn => {
    btn.onclick = () => { setVocabKanjiMode(btn.dataset.mode); renderKanjiList(); };
  });
  const kf = document.getElementById('kfuri-toggle');
  if (kf) kf.onchange = e => { setShowFurigana(e.target.checked); renderKanjiList(); };

  const klq = document.getElementById('klqbtn');
  if (klq && !klq.disabled) {
    klq.onclick = () => {
      const qs = kanjiQs(12, true);
      if (!qs.length) return;
      runFullQuiz(qs, {
        onDone: (s, t) => updateBest('kanji', s, t),
        onExit: renderKanjiList,
        backLabel: '← Kanji Trainer',
      });
    };
  }
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
          <div class="rad-label">Radical (部首)</div>
          <div style="font-weight:700">${rad[0]}</div>
          <div style="font-size:12.5px;color:var(--ink2)">${rad[1]}</div>
        </div>
      </div>

      <div class="mode-tabs" style="display:flex;gap:8px;margin:12px 0">
        <button class="btn ${strokeMode === 'watch' ? 'red' : ''}" id="mw-btn"><ion-icon name="play-outline"></ion-icon> Watch</button>
        <button class="btn ${strokeMode === 'trace' ? 'red' : ''}" id="mt-btn"><ion-icon name="pencil-outline"></ion-icon> Trace</button>
      </div>

      <div class="kanji-detail">
        <div id="kp-mount"></div>
        <div>
          <h4 style="margin-bottom:10px;font-size:14px">Example words</h4>
          <div id="exw"></div>
          <div class="btnrow" style="margin-top:12px;justify-content:flex-start;flex-wrap:wrap">
            <button class="btn ${(P.kanjiCanRead || P.kanjiLearned || []).includes(k[0]) ? 'red' : 'primary'}" id="read-btn">
              ${(P.kanjiCanRead || P.kanjiLearned || []).includes(k[0])
                ? '<ion-icon name="checkmark-circle"></ion-icon> Can read'
                : 'Mark can read'}
            </button>
            <button class="btn ${(P.kanjiCanWrite || []).includes(k[0]) ? 'red' : ''}" id="write-btn">
              ${(P.kanjiCanWrite || []).includes(k[0])
                ? '<ion-icon name="checkmark-circle"></ion-icon> Can write'
                : 'Mark can write'}
            </button>
          </div>
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

  // Read / write toggles
  document.getElementById('read-btn').onclick = () => { toggleKanjiFlag(k[0], 'read'); renderKanjiDetail(); };
  document.getElementById('write-btn').onclick = () => { toggleKanjiFlag(k[0], 'write'); renderKanjiDetail(); };

  mountKanjiPractice(document.getElementById('kp-mount'), k[0], { mode: strokeMode });
}

/* ============================================================
   Reusable kanji stroke/trace widget — mounts into ANY container,
   fully self-contained (scoped queries, no global IDs), so several
   instances can exist on the page at once (e.g. one per Coursework
   kanji card).
   ============================================================ */
const NS = 'http://www.w3.org/2000/svg';
function svgEl(tag, attrs) {
  const el = document.createElementNS(NS, tag);
  for (const k in attrs) el.setAttribute(k, attrs[k]);
  return el;
}

const GUIDES = `
  <g class="grid-group">
    <rect class="guide-rect" x="0" y="0" width="109" height="109" fill="none" stroke-width="1" rx="2"/>
    <line class="guide-mid" x1="54.5" y1="0" x2="54.5" y2="109" stroke-width=".7" stroke-dasharray="3.5 3.5"/>
    <line class="guide-mid" x1="0" y1="54.5" x2="109" y2="54.5" stroke-width=".7" stroke-dasharray="3.5 3.5"/>
    <line class="guide-diag" x1="0" y1="0" x2="109" y2="109" stroke-width=".55" stroke-dasharray="2.5 4"/>
    <line class="guide-diag" x1="109" y1="0" x2="0" y2="109" stroke-width=".55" stroke-dasharray="2.5 4"/>
  </g>`;

/**
 * Mount the stroke-order/trace widget into `root`.
 * @param {HTMLElement} root - empty container to render into
 * @param {string} glyph - the kanji character
 * @param {{mode?: 'watch'|'trace', onModeChange?: (mode:string)=>void}} opts
 */
export function mountKanjiPractice(root, glyph, opts = {}) {
  let mode = opts.mode || 'watch';

  function paint() {
    root.innerHTML = `
      <div class="mode-tabs" style="display:flex;gap:8px;margin-bottom:12px">
        <button class="btn ${mode === 'watch' ? 'red' : ''}" data-role="mw"><ion-icon name="play-outline"></ion-icon> Watch</button>
        <button class="btn ${mode === 'trace' ? 'red' : ''}" data-role="mt"><ion-icon name="pencil-outline"></ion-icon> Trace</button>
      </div>
      <div class="canvas-wrap" data-role="cw">
        <svg data-role="stage" viewBox="-8 -8 125 125"></svg>
        <div class="stamp" data-role="stamp">完</div>
      </div>
      <div data-role="ctl"></div>
      <div class="tp-msg" data-role="tpmsg"></div>`;

    root.querySelector('[data-role="mw"]').onclick = () => { mode = 'watch'; opts.onModeChange?.(mode); paint(); };
    root.querySelector('[data-role="mt"]').onclick = () => { mode = 'trace'; opts.onModeChange?.(mode); paint(); };

    loadKanjiStrokes(root, glyph, mode);
  }

  paint();
}

function loadKanjiStrokes(root, ch, mode) {
  const svg  = root.querySelector('[data-role="stage"]');
  const cw   = root.querySelector('[data-role="cw"]');
  const ctl  = root.querySelector('[data-role="ctl"]');
  const msg  = root.querySelector('[data-role="tpmsg"]');

  svg.innerHTML = '';
  cw.classList.remove('trace');
  root.querySelector('[data-role="stamp"]')?.classList.remove('show');

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

  if (mode === 'watch') setupWatch(root, paths, ctl, msg);
  else setupTrace(root, paths, svg, cw, ctl, msg, numG);
}

/* ---- Watch mode ---- */
function setupWatch(root, paths, ctl, msg) {
  ctl.innerHTML = `
    <div class="btnrow" style="margin-top:12px">
      <button class="btn primary" data-role="play-btn"><ion-icon name="play-outline"></ion-icon> Replay</button>
      <button class="btn" data-role="rst-btn"><ion-icon name="refresh-outline"></ion-icon> Restart</button>
    </div>`;

  let i = 0, playing = false, raf = null;

  function reset() {
    paths.forEach(p => { p.el.style.strokeDashoffset = p.len; p.el.classList.remove('current'); });
    i = 0;
    root.querySelector('[data-role="stamp"]')?.classList.remove('show');
  }

  function finishStroke(j) {
    paths[j].el.style.strokeDashoffset = 0;
    paths[j].el.classList.remove('current');
    if (j + 1 >= paths.length) root.querySelector('[data-role="stamp"]')?.classList.add('show');
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

  ctl.querySelector('[data-role="play-btn"]').onclick = () => play();
  ctl.querySelector('[data-role="rst-btn"]').onclick = () => {
    playing = false;
    if (raf) cancelAnimationFrame(raf);
    reset();
    setTimeout(play, 80);
  };

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

function setupTrace(root, paths, svg, cw, ctl, msg, numG) {
  cw.classList.add('trace');
  let showGuide = true;
  let showGhost = true;
  let showGrid = true;
  let showNums = true;
  const gridGroup = svg.querySelector('.grid-group');

  ctl.innerHTML = `
    <div class="btnrow" style="margin-top:12px;flex-wrap:wrap">
      <button class="btn" data-role="undo-btn"><ion-icon name="arrow-undo-outline"></ion-icon> Undo</button>
      <button class="btn" data-role="rst-btn"><ion-icon name="refresh-outline"></ion-icon> Reset</button>
      <button class="btn" data-role="show-btn"><ion-icon name="eye-outline"></ion-icon> Show order</button>
    </div>
    <div class="btnrow" style="margin-top:8px;flex-wrap:wrap">
      <button class="btn" data-role="guide-btn"><ion-icon name="locate-outline"></ion-icon> Guide: On</button>
      <button class="btn" data-role="ghost-btn"><ion-icon name="layers-outline"></ion-icon> Outline: On</button>
    </div>
    <div class="btnrow" style="margin-top:8px;flex-wrap:wrap">
      <button class="btn" data-role="grid-btn"><ion-icon name="grid-outline"></ion-icon> Grid lines: On</button>
      <button class="btn" data-role="num-btn"><ion-icon name="list-outline"></ion-icon> Numbers: On</button>
    </div>
    <p style="font-size:12px;color:var(--ink2);margin-top:8px">Turn everything off for a completely freehand challenge.</p>`;

  const targetG = svgEl('g', {});
  const doneG   = svgEl('g', {});
  const drawG   = svgEl('g', {});
  const startDot = svgEl('circle', { r: 3.4, class: 'trace-dot', visibility: 'hidden' });
  const startNum = svgEl('text', {
    'text-anchor': 'middle',
    fill: '#9c2b1e',
    'font-size': '5',
    'font-family': 'IBM Plex Mono',
  });
  targetG.appendChild(startDot);
  targetG.appendChild(startNum);
  svg.appendChild(targetG);
  svg.appendChild(doneG);
  svg.appendChild(drawG);

  const allGs = [...svg.querySelectorAll(':scope > g')];
  let ghostGroup = null;
  for (const g of allGs) {
    if (g.querySelector('path.ghost')) { ghostGroup = g; break; }
  }

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

  function setGhostVisible(on) {
    showGhost = on;
    if (ghostGroup) ghostGroup.style.display = on ? '' : 'none';
    ctl.querySelector('[data-role="ghost-btn"]').innerHTML =
      `<ion-icon name="layers-outline"></ion-icon> Outline: ${on ? 'On' : 'Off'}`;
  }

  function setGuideVisible(on) {
    showGuide = on;
    ctl.querySelector('[data-role="guide-btn"]').innerHTML =
      `<ion-icon name="locate-outline"></ion-icon> Guide: ${on ? 'On' : 'Off'}`;
    showTarget();
  }

  function showTarget() {
    [...targetG.querySelectorAll('path.trace-target')].forEach(el => el.remove());
    if (cur >= paths.length) {
      startDot.setAttribute('visibility', 'hidden');
      startNum.textContent = '';
      return;
    }
    if (showGuide) {
      const guidePath = svgEl('path', { d: paths[cur].d, class: 'trace-target' });
      targetG.insertBefore(guidePath, startDot);
      startDot.setAttribute('cx', paths[cur].sx);
      startDot.setAttribute('cy', paths[cur].sy);
      startDot.setAttribute('visibility', 'visible');
      startNum.setAttribute('x', paths[cur].sx);
      startNum.setAttribute('y', Math.max(paths[cur].sy - 6, 2.5));
      startNum.textContent = String(cur + 1);
    } else {
      startDot.setAttribute('visibility', 'hidden');
      startNum.textContent = '';
    }
  }

  function updMsg() {
    if (cur >= paths.length) {
      msg.textContent = 'Complete! Beautiful.';
      msg.className = 'tp-msg ok';
      root.querySelector('[data-role="stamp"]')?.classList.add('show');
    } else if (showGuide) {
      msg.textContent = `Stroke ${cur + 1} of ${paths.length} — start at the red dot`;
      msg.className = 'tp-msg';
    } else {
      msg.textContent = `Stroke ${cur + 1} of ${paths.length} — freehand (no guide)`;
      msg.className = 'tp-msg';
    }
  }

  function shakeCanvas() {
    cw.classList.remove('shake');
    void cw.offsetWidth;
    cw.classList.add('shake');
  }

  function evaluate() {
    if (pts.length < 3) return { ok: false, msg: 'Draw the whole stroke in one motion.' };
    const s = samples[cur];
    const u = resample(pts, SAMPLES);
    if (!u) return { ok: false, msg: 'Draw the whole stroke.' };
    let uL = 0;
    for (let i = 1; i < pts.length; i++)
      uL += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
    if (uL < s.len * 0.3) return { ok: false, msg: 'Too short — follow the whole stroke.' };
    const fwd = distStats(u, s.pts);
    const rev = distStats([...u].reverse(), s.pts);
    if (rev.mean < fwd.mean * 0.8) return { ok: false, msg: 'Wrong direction.' };
    if (showGuide) {
      const sd = Math.hypot(u[0][0] - s.pts[0][0], u[0][1] - s.pts[0][1]);
      if (sd > 15) return { ok: false, msg: 'Start closer to the red dot.' };
    }
    if (fwd.mean > (showGuide ? 8.6 : 12) || fwd.max > (showGuide ? 19 : 28)) {
      return { ok: false, msg: 'Off the stroke — try again.' };
    }
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
    shakeCanvas();
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

  const end = () => {
    if (!drawing) return;
    drawing = false;
    const r = evaluate();
    r.ok ? accept() : reject(r);
  };
  svg.onpointerup = end;
  svg.onpointercancel = end;

  ctl.querySelector('[data-role="undo-btn"]').onclick = () => {
    if (busy || cur === 0) return;
    cur--;
    doneG.lastElementChild?.remove();
    root.querySelector('[data-role="stamp"]')?.classList.remove('show');
    showTarget();
    updMsg();
  };

  ctl.querySelector('[data-role="rst-btn"]').onclick = () => {
    if (busy) return;
    drawG.innerHTML = '';
    doneG.innerHTML = '';
    cur = 0;
    root.querySelector('[data-role="stamp"]')?.classList.remove('show');
    showTarget();
    updMsg();
  };

  ctl.querySelector('[data-role="show-btn"]').onclick = () => {
    if (busy || !paths.length) return;
    busy = true;
    [...targetG.querySelectorAll('path.trace-target')].forEach(el => el.remove());
    startDot.setAttribute('visibility', 'hidden');
    startNum.textContent = '';
    const prevDisplay = doneG.style.display;
    doneG.style.display = 'none';
    drawG.innerHTML = '';
    paths.forEach((p, i) => {
      const pp = svgEl('path', { d: p.d, class: 'replay-anim', pathLength: 1 });
      pp.style.animationDelay = `${i * 0.55}s`;
      targetG.appendChild(pp);
    });
    setTimeout(() => {
      [...targetG.querySelectorAll('path.replay-anim')].forEach(el => el.remove());
      doneG.style.display = prevDisplay;
      busy = false;
      showTarget();
      updMsg();
    }, paths.length * 550 + 680);
  };

  ctl.querySelector('[data-role="guide-btn"]').onclick = () => setGuideVisible(!showGuide);
  ctl.querySelector('[data-role="ghost-btn"]').onclick = () => setGhostVisible(!showGhost);
  ctl.querySelector('[data-role="grid-btn"]').onclick = () => {
    showGrid = !showGrid;
    if (gridGroup) gridGroup.style.display = showGrid ? '' : 'none';
    ctl.querySelector('[data-role="grid-btn"]').innerHTML =
      `<ion-icon name="grid-outline"></ion-icon> Grid lines: ${showGrid ? 'On' : 'Off'}`;
  };
  ctl.querySelector('[data-role="num-btn"]').onclick = () => {
    showNums = !showNums;
    if (numG) numG.style.display = showNums ? '' : 'none';
    ctl.querySelector('[data-role="num-btn"]').innerHTML =
      `<ion-icon name="list-outline"></ion-icon> Numbers: ${showNums ? 'On' : 'Off'}`;
  };

  showTarget();
  updMsg();
}
