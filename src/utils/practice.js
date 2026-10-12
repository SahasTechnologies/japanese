/**
 * Practice — the merged per-unit drill that replaces the old separate
 * "Writing practice" and "Sentence builder" widgets on Coursework pages.
 *
 *   setup screen  → pick lesson length + which question types are on
 *   lesson        → up to N questions mixing the chosen types
 *   result screen → score + the ones you got wrong (with answers) each time;
 *                   "Redo the wrong ones" keeps at them until you get them right
 *
 * Question types:
 *   mc    multiple choice — meaning (both directions) + kanji readings
 *   sb    sentence building — drag/place the word tokens into the box
 *   write type the answer (rōmaji converts to kana live; kanji accepted)
 *   draw  kanji drawing in a freehand box (self-checked)
 *   trans Japanese → English translation (self-checked, reveal available)
 *
 * Words whose kanji the learner hasn't marked "can read" are shown in hiragana
 * instead (same rule as the rest of the app) and every question has a
 * Reveal-answer button. Vocab you miss is scheduled back into the unit's SRS
 * so the review queue brings it back soon.
 */
import * as wanakana from 'wanakana';
import kanjiData from '../data/kanji.json' with { type: 'json' };
import { shuffle } from './helpers.js';
import { getState } from '../state.js';
import { srsRate } from './srs.js';
import { speakWithBtn } from './tts.js';
import { furigana } from './furigana.js';
import { tokenize } from './sentenceBuilder.js';
import { mountFreehandBox } from './freehand.js';
import { buildUnitSentenceBank, unitRealSentences, compact } from './sentenceBank.js';

const { KANJI } = kanjiData;
const kanjiInfo = {};
KANJI.forEach(k => { kanjiInfo[k[0]] = k; });

const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const hasKanji = s => /[\u4e00-\u9faf]/.test(String(s || ''));
const isKanji = ch => /[\u4e00-\u9faf]/.test(ch);
const RUBY_RE = /<ruby>([^<]*)<rt>([^<]*)<\/rt><\/ruby>/g;

function furiganaToKana(html) {
  return String(html || '').replace(RUBY_RE, (_, __, rt) => rt).replace(/<[^>]+>/g, '');
}

/** True when every kanji char in the text is one the learner can read. */
function knowsAllKanji(text) {
  const P = getState();
  const known = new Set(P.kanjiCanRead || []);
  return [...String(text)].every(ch => !isKanji(ch) || known.has(ch));
}

/** Japanese word display: kana unless the learner knows the kanji (+ ruby). */
function wordHtml(expr, reading) {
  const P = getState();
  if (!expr || expr === reading || !hasKanji(expr)) return esc(reading || expr);
  if (!knowsAllKanji(expr)) return esc(reading || expr);
  if (P.showFurigana === false) return esc(expr);
  return furigana(expr) || esc(expr);
}

/** kana clean form for comparing typed answers */
function cleanAnswer(s) {
  return compact(String(s || ''))
    .split(/[／/]/)[0]
    .replace(/[（(].*?[）)]/g, '')
    .replace(/[。、．]/g, '');
}

/* ------------------------------------------------------------------ */
/*  Deck builders                                                      */
/* ------------------------------------------------------------------ */

/** the unit's own vocab section words only (no kanji-table extras) */
function sectionWords(u) {
  const seen = new Set();
  const out = [];
  (u.vocabSections || []).forEach(sec => (sec.words || []).forEach(w => {
    if (!Array.isArray(w) || !w[0] || !w[1]) return;
    const key = String(w[0]) + '|' + String(w[1]);
    if (seen.has(key)) return;
    seen.add(key);
    out.push(w);
  }));
  return out;
}

function mcDeck(u, words) {
  const deck = [];
  const uniqueM = [...new Set(words.map(w => String(w[2] || '').split('／')[0]))];
  words.forEach(w => {
    const [expr, reading, meaning] = w;
    const m = String(meaning || '').split('／')[0];
    const others = words.filter(x => String(x[2]).split('／')[0] !== m);

    // Japanese → English meaning
    if (others.length >= 1) {
      const optsM = shuffle(uniqueM.filter(x => x !== m)).slice(0, 3);
      const options = shuffle([m, ...optsM]);
      deck.push({
        kind: 'mc', dir: 'jpen', q: wordHtml(expr, reading),
        options: options.map(esc), a: options.indexOf(m), w, speak: expr,
      });
    }
    // English → Japanese word
    if (others.length >= 1) {
      const optsW = shuffle(others).slice(0, 3);
      const options = shuffle([w, ...optsW]);
      deck.push({
        kind: 'mc', dir: 'enjp', q: esc(m),
        options: options.map(x => wordHtml(x[0], x[1])), a: options.indexOf(w), w, speak: expr,
      });
    }
    // kanji reading
    if (expr !== reading && hasKanji(expr) && String(reading).length) {
      const optsR = shuffle(words.filter(x => x[1] !== reading)).slice(0, 3);
      const options = shuffle([w, ...optsR]);
      deck.push({
        kind: 'mc', dir: 'read', q: esc(expr),
        options: options.map(x => esc(String(x[1]).replace(/\s+/g, ''))), a: options.indexOf(w),
        w, speak: expr,
      });
    }
  });
  return deck;
}

/** a sentence as a buildable set of tokens (kana-first display) */
function builderItem(it) {
  const jp = compact(it.jp);
  const tokens = tokenize(jp);
  if (tokens.length < 3 || tokens.length > 9) return null;

  let kanaTokens = null;
  const kana = String(it.kana || '');
  if (kana && compact(kana).length) {
    const kt = tokenize(compact(kana));
    if (kt.length === tokens.length) kanaTokens = kt;
  }

  const pieces = [];
  let answer = '';
  let kanaLine = '';
  tokens.forEach((tok, i) => {
    let display = tok;
    if (kanaTokens) {
      display = knowsAllKanji(tok) && hasKanji(tok) ? tok : kanaTokens[i];
    } else if (hasKanji(tok)) {
      const guess = furiganaToKana(furigana(tok));
      display = knowsAllKanji(tok) ? tok : (guess || tok);
    }
    answer += compact(display);
    kanaLine += kanaTokens ? kanaTokens[i] : display;
    pieces.push({ t: tok, display, key: i });
  });

  if (answer.length < 2 || pieces.length < 3) return null;
  return { ...it, jp, tokens: pieces, answer, kanaLine };
}

function sbDeck(u) {
  const out = [];
  const bank = buildUnitSentenceBank(u, { target: 300 });
  // put the unit's own real sentences first (highest quality, and their kana
  // readings make nice kanji/reading mixed chips)
  const ordered = shuffle(unitRealSentences(u)).concat(shuffle(bank));
  const seen = new Set();
  for (const it of ordered) {
    const key = String(it.en).trim().toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    const b = builderItem(it);
    if (b) out.push({ kind: 'sb', item: b });
    if (out.length >= 150) break;
  }
  return out;
}

function transDeck(u) {
  const out = [];
  const bank = buildUnitSentenceBank(u, { target: 300 });
  for (const it of shuffle(bank)) {
    const jp = String(it.jp || '');
    const kana = String(it.kana || '') || furiganaToKana(furigana(jp));
    if (jp.length < 4 || kana.length < 4 || String(it.en).length < 4) continue;
    out.push({ kind: 'trans', item: { ...it, kana } });
    if (out.length >= 120) break;
  }
  return out;
}

function drawDeck(u) {
  const out = [];
  (u.kanji || []).forEach(k => {
    const glyph = k.glyph;
    if (!glyph) return;
    const info = kanjiInfo[glyph] || [];
    out.push({
      kind: 'draw', glyph,
      meaning: info[3] || '',
      reading: String(info[2] || info[1] || '').split(/[・、;,/]/)[0].trim(),
    });
  });
  return out;
}

/* ------------------------------------------------------------------ */
/*  Question plan                                                      */
/* ------------------------------------------------------------------ */

const KIND_ORDER = ['mc', 'sb', 'write', 'draw', 'trans'];

function makePlan(decks, enabled, n) {
  const active = KIND_ORDER.filter(k => enabled[k] && decks[k] && decks[k].length);
  const plan = [];
  let round = 0;
  while (plan.length < n && round < 2000) {
    let added = 0;
    for (const k of active) {
      if (plan.length >= n) break;
      const deck = decks[k];
      if (round < deck.length) {
        plan.push(deck[round]);
        added++;
      }
    }
    if (!added) break;
    round++;
  }
  return plan;
}

const KIND_META = {
  mc: { icon: 'help-circle-outline', name: 'Multiple choice' },
  sb: { icon: 'puzzle-outline', name: 'Sentence building' },
  write: { icon: 'create-outline', name: 'Type the word' },
  draw: { icon: 'brush-outline', name: 'Kanji drawing' },
  trans: { icon: 'swap-horizontal-outline', name: 'Translation' },
};

function kindIcon(q) { return `<ion-icon name="${(KIND_META[q.kind] || KIND_META.mc).icon}"></ion-icon>`; }
function kindName(q) { return (KIND_META[q.kind] || KIND_META.mc).name; }

/* ------------------------------------------------------------------ */
/*  Setup screen                                                       */
/* ------------------------------------------------------------------ */

export function openUnitPractice(u, opts = {}) {
  const main = document.getElementById('main');
  const words = sectionWords(u);
  const bank = buildUnitSentenceBank(u, { target: 300 });
  const sbN = bank.filter(b => {
    const t = tokenize(compact(b.jp));
    return t.length >= 3 && t.length <= 9;
  }).length;

  const counts = {
    mc: words.length * 2 + words.filter(w => w[0] !== w[1] && hasKanji(w[0])).length,
    sb: Math.min(150, sbN),
    write: words.length,
    draw: (u.kanji || []).length,
    trans: bank.length,
  };

  const back = () => { if (opts.onExit) opts.onExit(); };

  main.innerHTML = `
    <button class="btn qz-exit-btn" id="pr-exit"><ion-icon name="arrow-back-outline"></ion-icon> ${esc(u.title)}</button>
    <div class="sec-title" style="margin-top:16px">Practice — ${esc(u.title)}</div>
    <div class="sec-sub">A mixed lesson: multiple choice, kanji drawing, sentence building, typing and translation built from this unit's own words and sentences — with a bank of hundreds so it stays fresh.</div>

    <div class="card pr-setup" style="max-width:660px">
      <div class="vc-row" style="margin-bottom:16px">
        <span class="vc-label">Lesson length</span>
        <div class="seg-control" id="pr-length" role="group" aria-label="Lesson length">
          ${[10, 15, 20].map(n => `<button type="button" class="seg ${n === 15 ? 'on' : ''}" data-n="${n}">${n} questions</button>`).join('')}
        </div>
      </div>
      <div class="vc-row" style="align-items:flex-start">
        <span class="vc-label" style="min-width:120px">Question types</span>
        <div class="pr-types" id="pr-types"></div>
      </div>
      <p class="pr-empty" id="pr-empty" style="display:none;color:var(--red-deep);font-size:13px;margin-top:10px">Turn on at least one question type to start.</p>
      <div class="btnrow" style="margin-top:20px;justify-content:flex-start">
        <button class="btn primary" id="pr-go"><ion-icon name="play-outline"></ion-icon> Start lesson</button>
        <button class="btn" id="pr-exit2">← Back to unit</button>
      </div>
    </div>`;

  document.getElementById('pr-exit').onclick = back;
  document.getElementById('pr-exit2').onclick = back;

  const segWrap = document.getElementById('pr-length');
  segWrap.querySelectorAll('.seg').forEach(b => {
    b.onclick = () => segWrap.querySelectorAll('.seg').forEach(x => x.classList.toggle('on', x === b));
  });

  const enabled = { mc: true, sb: true, write: true, draw: true, trans: true };
  const emptyMsg = document.getElementById('pr-empty');
  const typesEl = document.getElementById('pr-types');
  const TYPES = [
    { id: 'mc', icon: 'help-circle-outline', name: 'Multiple choice', desc: 'Meanings & kanji readings' },
    { id: 'sb', icon: 'puzzle-outline', name: 'Sentence building', desc: 'Drag the words into the box' },
    { id: 'write', icon: 'create-outline', name: 'Type the word', desc: 'Romaji → kana as you type' },
    { id: 'draw', icon: 'brush-outline', name: 'Kanji drawing', desc: 'Draw each kanji, self-check' },
    { id: 'trans', icon: 'swap-horizontal-outline', name: 'Translate to English', desc: 'Read Japanese, write the meaning' },
  ];
  TYPES.forEach(t => {
    const lab = document.createElement('label');
    lab.className = 'pr-type';
    lab.innerHTML = `
      <input type="checkbox" data-id="${t.id}" checked />
      <span class="pr-type-ic"><ion-icon name="${t.icon}"></ion-icon></span>
      <span class="pr-type-txt"><b>${t.name}</b><small>${t.desc}</small></span>
      <span class="pr-type-count mono">${counts[t.id]}</span>`;
    lab.querySelector('input').onchange = e => {
      enabled[t.id] = e.target.checked;
      emptyMsg.style.display = Object.values(enabled).some(Boolean) ? 'none' : 'block';
    };
    typesEl.appendChild(lab);
  });

  document.getElementById('pr-go').onclick = () => {
    const seg = segWrap.querySelector('.seg.on');
    const n = seg ? +seg.dataset.n : 15;
    const on = KIND_ORDER.filter(k => enabled[k]);
    if (!on.length) { emptyMsg.style.display = 'block'; return; }
    runLesson(u, { n, enabled: { ...enabled } }, { back, onDone: opts.onDone });
  };

  if (Object.values(counts).reduce((a, b) => a + b, 0) < 4) {
    document.getElementById('pr-go').disabled = true;
  }
}

/* ------------------------------------------------------------------ */
/*  Lesson engine                                                      */
/* ------------------------------------------------------------------ */

function buildDecks(u) {
  const decks = {
    mc: mcDeck(u, sectionWords(u)),
    sb: sbDeck(u),
    write: shuffle(sectionWords(u).map(w => ({ kind: 'write', w }))),
    draw: drawDeck(u),
    trans: transDeck(u),
  };
  Object.keys(decks).forEach(k => { decks[k] = shuffle(decks[k]); });
  return decks;
}

function runLesson(u, cfg, api, starter = null) {
  const main = document.getElementById('main');
  const decks = buildDecks(u);
  let plan = starter ? starter.slice() : makePlan(decks, cfg.enabled, cfg.n);
  if (!plan.length) {
    if (api.back) { api.back(); return; }
    return;
  }
  let stats = { correct: 0, done: 0 };

  main.innerHTML = `
    <button class="btn qz-exit-btn" id="pr-x"><ion-icon name="arrow-back-outline"></ion-icon> ${esc(u.title)}</button>
    <div id="pr-stage" style="margin-top:14px"></div>`;
  const exitBtn = document.getElementById('pr-x');
  exitBtn.onclick = () => { if (api.back) api.back(); };

  function showQ(i, mistakes, retryOf) {
    const stage = document.getElementById('pr-stage');
    if (i >= plan.length) { finish(mistakes, retryOf); return; }
    const item = plan[i];
    const total = plan.length;
    let answered = false;

    stage.innerHTML = `
      <div class="qz-head pr-head"><span>${kindName(item)} · ${i + 1} / ${total}</span><span>Score <b>${stats.correct}</b> / ${stats.done}</span></div>
      <div class="qz-bar"><i style="width:${(i / total) * 100}%"></i></div>
      <div class="pr-card card">
        <div class="pr-kind">${kindIcon(item)} ${kindName(item)}${item.dir === 'jpen' ? ' · Japanese → English' : item.dir === 'enjp' ? ' · English → Japanese' : item.dir === 'read' ? ' · reading' : ''}</div>
        <div id="pr-body"></div>
      </div>
      <div class="qz-fb" id="pr-fb"></div>
      <div class="pr-actions btnrow" id="pr-actions" style="margin-top:10px;justify-content:center"></div>`;

    const body = document.getElementById('pr-body');
    const fb = document.getElementById('pr-fb');
    const actions = document.getElementById('pr-actions');

    const markAnswered = correct => {
      if (answered) return;
      answered = true;
      stats.done++;
      if (correct) stats.correct++; else mistakes.push(item);
      body.querySelectorAll('button,input,textarea').forEach(el => { el.disabled = true; });
      body.querySelectorAll('.pr-token').forEach(el => el.classList.add('used'));
      const head = document.querySelector('.pr-head');
      if (head) head.innerHTML = `<span>${kindName(item)} · ${Math.min(i + 1, total)} / ${total}</span><span>Score <b>${stats.correct}</b> / ${stats.done}</span>`;
      actions.innerHTML = '';
      const next = document.createElement('button');
      next.className = 'btn primary';
      next.innerHTML = '<ion-icon name="arrow-forward-outline"></ion-icon> Next';
      next.onclick = () => showQ(i + 1, mistakes, retryOf);
      actions.appendChild(next);
    };

    const revealBtn = document.createElement('button');
    revealBtn.className = 'btn';
    revealBtn.innerHTML = '<ion-icon name="eye-outline"></ion-icon> Reveal answer';

    const revealWith = html => {
      if (answered) return;
      fb.innerHTML = `<ion-icon name="close-circle"></ion-icon> ${html}`;
      fb.className = 'qz-fb err';
      markAnswered(false);
    };

    // self-graded question kinds (draw, translation): show the answer and let
    // the learner decide honestly whether they had it right
    const gradeSelf = (rightMsg) => {
      const okBtn = document.createElement('button');
      okBtn.className = 'btn';
      okBtn.innerHTML = '<ion-icon name="checkmark-circle-outline"></ion-icon> I got it right';
      okBtn.onclick = () => {
        if (answered) return;
        fb.innerHTML = `<ion-icon name="checkmark-circle"></ion-icon> ${rightMsg}`;
        fb.className = 'qz-fb ok';
        markAnswered(true);
      };
      const missBtn = document.createElement('button');
      missBtn.className = 'btn';
      missBtn.innerHTML = '<ion-icon name="close-circle-outline"></ion-icon> Not quite';
      missBtn.onclick = () => {
        if (answered) return;
        fb.innerHTML = `<ion-icon name="close-circle"></ion-icon> ${rightMsg}`;
        fb.className = 'qz-fb err';
        markAnswered(false);
      };
      actions.appendChild(okBtn);
      actions.appendChild(missBtn);
    };

    if (item.kind === 'mc') renderMc(item);
    else if (item.kind === 'sb') renderSb(item);
    else if (item.kind === 'write') renderWrite(item);
    else if (item.kind === 'draw') renderDraw(item);
    else if (item.kind === 'trans') renderTrans(item);

    function renderMc(it) {
      const sub = it.dir === 'enjp' ? 'Which word is this?' : it.dir === 'read' ? 'How do you read this kanji?' : 'What does it mean?';
      body.innerHTML = `
        <div class="pr-q"><span class="big-jp">${it.q}</span><div class="pr-q-sub">${sub}</div></div>
        <div class="qz-opts pr-opts" id="pr-opts"></div>`;
      const box = document.getElementById('pr-opts');
      it.options.forEach((op, idx) => {
        const b = document.createElement('button');
        b.className = 'qz-opt';
        b.innerHTML = op;
        b.onclick = () => {
          [...box.children].forEach(c => { c.disabled = true; });
          if (idx === it.a) {
            b.classList.add('correct');
            fb.innerHTML = '<ion-icon name="checkmark-circle"></ion-icon> Correct!';
            fb.className = 'qz-fb ok';
            markAnswered(true);
          } else {
            b.classList.add('wrong');
            box.children[it.a].classList.add('correct');
            fb.innerHTML = `<ion-icon name="close-circle"></ion-icon> <span style="font-family:var(--serif)">${it.options[it.a]}</span>`;
            fb.className = 'qz-fb err';
            markAnswered(false);
          }
        };
        box.appendChild(b);
      });
      revealBtn.innerHTML = '<ion-icon name="eye-outline"></ion-icon> Reveal answer';
      revealBtn.onclick = () => revealWith(`Answer: ${it.options[it.a]}`);
      actions.appendChild(revealBtn);
    }

    function renderWrite(it) {
      const [expr, reading, meaning] = it.w;
      const kata = /[\u30a0-\u30ff]/.test(reading);
      body.innerHTML = `
        <div class="pr-q"><span class="big">${esc(String(meaning).split('／')[0])}</span>
          <div class="pr-q-sub">Type the Japanese word — rōmaji converts to ${kata ? 'katakana' : 'hiragana'} as you go.</div>
        </div>
        <div class="wp-input-wrap">
          <input type="text" id="pr-write-input" class="wp-input" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="type here…" />
          <button type="button" class="btn icon-btn" id="pr-write-speak" title="Listen"><ion-icon name="volume-high-outline"></ion-icon></button>
        </div>
        <div class="btnrow" style="margin-top:12px;justify-content:flex-start">
          <button type="button" class="btn primary" id="pr-write-check">Check</button>
        </div>`;
      const input = document.getElementById('pr-write-input');
      document.getElementById('pr-write-speak').onclick = e => speakWithBtn(expr, e.currentTarget);
      if (kata) wanakana.bind(input, { IMEMode: 'toKatakana' });
      else wanakana.bind(input, { IMEMode: true });
      input.focus();
      const check = () => {
        if (answered) return;
        const val = cleanAnswer(input.value);
        const expect = cleanAnswer(reading);
        const ok = val === expect || (cleanAnswer(expr) && val === cleanAnswer(expr));
        fb.innerHTML = ok
          ? `<ion-icon name="checkmark-circle"></ion-icon> <span class="pr-ans-inline">${wordHtml(expr, reading)}</span>`
          : `<ion-icon name="close-circle"></ion-icon> Answer: <span class="pr-ans-inline">${wordHtml(expr, reading)}</span>`;
        fb.className = ok ? 'qz-fb ok' : 'qz-fb err';
        markAnswered(ok);
      };
      document.getElementById('pr-write-check').onclick = check;
      input.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); check(); } });
      revealBtn.onclick = () => revealWith(`Answer: <span class="pr-ans-inline">${wordHtml(expr, reading)}</span>`);
      actions.appendChild(revealBtn);
    }

    function renderSb(it) {
      const b = it.item;
      body.innerHTML = `
        <div class="pr-q"><span class="big">${esc(b.en)}</span></div>
        <div class="pr-q-sub">Tap or drag the pieces into the box in the right order.</div>
        <div class="sb-answer pr-answer-slot" id="pr-answer">…</div>
        <div class="sb-tokens pr-tray" id="pr-tray"></div>
        <div class="btnrow" style="margin-top:12px;justify-content:flex-start">
          <button type="button" class="btn" id="pr-sb-undo"><ion-icon name="arrow-undo-outline"></ion-icon> Undo</button>
          <button type="button" class="btn" id="pr-sb-clear"><ion-icon name="refresh-outline"></ion-icon> Clear</button>
          <button type="button" class="btn primary" id="pr-sb-check"><ion-icon name="checkmark-outline"></ion-icon> Check</button>
          <button type="button" class="btn icon-btn" id="pr-sb-speak" title="Listen"><ion-icon name="volume-high-outline"></ion-icon></button>
        </div>`;
      const slot = document.getElementById('pr-answer');
      const tray = document.getElementById('pr-tray');
      document.getElementById('pr-sb-speak').onclick = e => speakWithBtn(b.jp || b.kanaLine, e.currentTarget);

      const left = b.tokens.slice();
      const built = [];

      function makeToken(t, zone) {
        const el = document.createElement('button');
        el.type = 'button';
        el.className = 'sb-token pr-token';
        el.draggable = true;
        el.dataset.key = t.key;
        el.innerHTML = esc(t.display);
        const clickAction = zone === 'slot'
          ? () => moveOut(t)          // remove from answer
          : () => moveIn(t);          // add from tray
        el.onclick = clickAction;
        el.addEventListener('dragstart', ev => {
          ev.dataTransfer.setData('text/plain', String(t.key));
          ev.dataTransfer.effectAllowed = 'move';
        });
        return el;
      }
      function moveIn(t) {
        const i = left.findIndex(x => x.key === t.key);
        if (i === -1 || built.some(x => x.key === t.key)) return;
        left.splice(i, 1);
        built.push(t);
        paint();
      }
      function moveOut(t) {
        const i = built.findIndex(x => x.key === t.key);
        if (i === -1) return;
        built.splice(i, 1);
        left.push(t);
        paint();
      }
      function paint() {
        tray.innerHTML = '';
        slot.innerHTML = '';
        left.forEach(t => tray.appendChild(makeToken(t, 'tray')));
        built.forEach(t => slot.appendChild(makeToken(t, 'slot')));
        if (!built.length) slot.innerHTML = '<span class="sb-empty">Tap or drag the pieces into the box in the right order…</span>';
      }
      // drop: onto the answer box → place token; onto the tray → pull it back
      const onDrop = (ev, zone) => {
        ev.preventDefault();
        const key = +ev.dataTransfer.getData('text/plain');
        const t = left.find(x => x.key === key) || built.find(x => x.key === key);
        if (!t) return;
        if (zone === 'slot') moveIn(t); else moveOut(t);
      };
      slot.dataset.zone = 'slot';
      tray.dataset.zone = 'tray';
      [slot, tray].forEach(zone => {
        zone.addEventListener('dragover', ev => ev.preventDefault());
        zone.addEventListener('drop', ev => onDrop(ev, zone.dataset.zone || 'tray'));
      });

      const check = () => {
        if (answered) return;
        const attempt = built.map(x => x.t).join('');
        const ok = built.length === b.tokens.length && attempt === compact(b.jp || b.answer);
        fb.innerHTML = ok
          ? `<ion-icon name="checkmark-circle"></ion-icon> ${furigana(b.jp || b.answer)}`
          : `<ion-icon name="close-circle"></ion-icon> Answer: <span class="pr-ans-inline">${b.kanaLine ? esc(b.kanaLine) : furigana(b.jp || b.answer)}</span>`;
        fb.className = ok ? 'qz-fb ok' : 'qz-fb err';
        if (!ok) {
          const expected = b.tokens[built.length] && b.tokens[built.length].display;
          if (expected) {
            [...tray.children].forEach(el => {
              const t = left.find(x => x.key === +el.dataset.key);
              if (t && t.display === expected) {
                el.classList.add('glint');
                setTimeout(() => el.classList.remove('glint'), 1500);
              }
            });
          }
        }
        markAnswered(ok);
      };
      document.getElementById('pr-sb-check').onclick = check;
      document.getElementById('pr-sb-undo').onclick = () => {
        const last = built.pop();
        if (last) left.push(last);
        paint();
      };
      document.getElementById('pr-sb-clear').onclick = () => {
        built.splice(0, built.length);
        left.splice(0, left.length, ...b.tokens);
        paint();
      };
      paint();
      revealBtn.onclick = () => revealWith(`Answer: <span class="pr-ans-inline">${b.kanaLine ? esc(b.kanaLine) : furigana(b.jp || b.answer)}</span>`);
      actions.appendChild(revealBtn);
    }

    function renderDraw(it) {
      body.innerHTML = `
        <div class="pr-draw-head">
          <div>
            <div class="pr-q" style="margin-bottom:0">${esc(it.meaning || 'Write this kanji')}</div>
            ${it.reading ? `<div class="pr-q-sub">Reading: <b>${esc(it.reading)}</b></div>` : ''}
          </div>
          <div class="pr-glyph">${esc(it.glyph)}</div>
        </div>
        <div id="pr-draw-mount"></div>
        <p style="font-size:12.5px;color:var(--ink2);margin-top:6px">Draw the kanji from memory, then grade yourself honestly.</p>`;
      mountFreehandBox(document.getElementById('pr-draw-mount'), it.glyph);
      revealBtn.innerHTML = '<ion-icon name="eye-outline"></ion-icon> Reveal kanji';
      revealBtn.onclick = () => {
        if (answered) return;
        revealBtn.disabled = true;
        fb.innerHTML = `The kanji is <span class="pr-ans-inline" style="font-size:34px">${it.glyph}</span> — did you get it?`;
        fb.className = '';
        gradeSelf(`Nice — ${it.glyph} drawn from memory!`);
      };
      actions.appendChild(revealBtn);
    }

    function renderTrans(it) {
      const s = it.item;
      body.innerHTML = `
        <div class="pr-q"><span class="big-jp">${furigana(s.jp)}</span>
          ${s.kana && compact(s.kana) !== compact(s.jp) ? `<div class="pr-q-sub">${esc(s.kana)}</div>` : ''}
          <div class="pr-q-sub">What does this mean in English?</div>
        </div>
        <textarea id="pr-trans-in" class="umt-trans-input" rows="2" placeholder="Type the English translation…"></textarea>`;
      const ta = document.getElementById('pr-trans-in');
      ta.focus();
      revealBtn.innerHTML = '<ion-icon name="eye-outline"></ion-icon> Show translation';
      revealBtn.onclick = () => {
        if (answered) return;
        revealBtn.disabled = true;
        fb.innerHTML = `<ion-icon name="close-circle"></ion-icon> ${esc(s.en)} — did you get it?`;
        fb.className = '';
        gradeSelf('Nice — you translated it!');
      };
      actions.appendChild(revealBtn);
    }
  }

  function finish(mistakes, retryOf) {
    const stage = document.getElementById('pr-stage');
    const total = stats.done || plan.length;
    const pct = Math.round((stats.correct / Math.max(1, total)) * 100);

    // feed wrong answers into SRS so the unit's review brings them back.
    // vocab-keyed misses (mc / type-the-word) rate the word card; a kanji
    // drawing miss rates the unit's kanji card (same id the review uses).
    mistakes.forEach(q => {
      if (!q) return;
      let id = null;
      if (q.w) id = `cv:${u.id}:${q.w[0]}`;
      else if (q.kind === 'draw' && q.glyph) id = `cv:${u.id}:${q.glyph}`;
      if (id) { try { srsRate(id, 'again'); } catch (_) {} }
    });

    const wrongHtml = mistakes.length ? `
      <div class="pr-review">
        <div class="pr-review-title"><ion-icon name="alert-circle-outline"></ion-icon> You got ${mistakes.length} wrong this lesson</div>
        ${mistakes.map((q, i) => {
          let label, ans;
          if (q.kind === 'mc') { label = q.q; ans = q.options[q.a]; }
          else if (q.kind === 'sb') { label = esc(q.item.en); ans = q.item.kanaLine ? esc(q.item.kanaLine) : furigana(q.item.jp); }
          else if (q.kind === 'write') { label = esc(String(q.w[2]).split('／')[0]); ans = wordHtml(q.w[0], q.w[1]); }
          else if (q.kind === 'draw') { label = q.meaning || 'Write the kanji'; ans = esc(q.glyph); }
          else { label = furigana(q.item.jp); ans = esc(q.item.en); }
          return `<div class="pr-review-row"><span class="pr-rv-kind">${kindName(q)}</span>
              <span class="pr-rv-q">${label}</span>
              <span class="pr-rv-a">${ans}</span></div>`;
        }).join('')}
      </div>` : '';

    stage.innerHTML = `
      <div class="qz-end">
        <div class="qz-big"><b>${stats.correct}</b> / ${total}</div>
        <div class="qz-pct">${pct}%</div>
        <div class="qz-msg">${pct === 100 ? 'Perfect — 全部正解！' : pct >= 80 ? 'Excellent — almost there!' : 'Keep going — review the ones below.'}</div>
        ${wrongHtml}
        <div class="btnrow" style="justify-content:center">
          ${mistakes.length ? `<button type="button" class="btn red" id="pr-redo"><ion-icon name="refresh-outline"></ion-icon> Redo the ${mistakes.length} wrong</button>` : ''}
          <button type="button" class="btn primary" id="pr-again"><ion-icon name="play-outline"></ion-icon> New lesson</button>
          <button type="button" class="btn" id="pr-back">← Back to unit</button>
        </div>
      </div>`;

    if (api.onDone) api.onDone(stats.correct, total);
    const redo = document.getElementById('pr-redo');
    if (redo) redo.onclick = () => runLesson(u, cfg, { back: api.back, onDone: api.onDone }, mistakes.slice());
    document.getElementById('pr-again').onclick = () => runLesson(u, cfg, { back: api.back, onDone: api.onDone });
    document.getElementById('pr-back').onclick = () => { if (api.back) api.back(); };
  }

  showQ(0, [], false);
}
