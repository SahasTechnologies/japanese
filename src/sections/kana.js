import kana from '../data/kana.json' with { type: 'json' };
const { HIRA, KATA, HIRA_ROWS, KATA_ROWS } = kana;
import { runFullQuiz } from '../utils/fullQuiz.js';
import { shuffle } from '../utils/helpers.js';
import { speakWithBtn } from '../utils/tts.js';
import { updateBest } from '../state.js';
import { mountKanjiPractice } from './kanji.js';
import STROKES from '../data/kanjivg-strokes.json' with { type: 'json' };

let kanaSet = 'hira';
let practiceChar = null; // kana currently open in the writing-practice panel

/** Build quiz questions for kana */
function kanaQs(set, n, reverse) {
  const pool = shuffle(set).slice(0, n);
  return pool.map(([ch, r]) => {
    const correct = reverse ? ch : r;
    const seen = new Set([correct]);
    const distractors = [];
    for (const x of shuffle(set)) {
      const v = reverse ? x[0] : x[1];
      if (!seen.has(v)) { seen.add(v); distractors.push(v); }
      if (distractors.length === 3) break;
    }
    const options = shuffle([correct, ...distractors]);
    return {
      q: reverse
        ? `Which kana is "<span class="mono">${r}</span>"?`
        : `<span class="big-kana">${ch}</span>`,
      options,
      a: options.indexOf(correct),
    };
  });
}

export function renderKana() {
  const main = document.getElementById('main');
  const set = kanaSet === 'hira' ? HIRA : KATA;
  const rows = kanaSet === 'hira' ? HIRA_ROWS : KATA_ROWS;

  main.innerHTML = `
    <div class="sec-title">Kana Trainer</div>
    <div class="sec-sub">Tap any character to hear it · Learn the charts · Then test yourself</div>
    <div class="kana-toggle">
      <button class="btn ${kanaSet === 'hira' ? 'red' : ''}" id="th-btn">あ Hiragana</button>
      <button class="btn ${kanaSet === 'kata' ? 'red' : ''}" id="tk-btn">ア Katakana</button>
      <span style="flex:1"></span>
      <button class="btn primary" id="qz1-btn">Kana → Reading</button>
      <button class="btn" id="qz2-btn">Reading → Kana</button>
    </div>
    <div id="kana-practice"></div>
    <div id="kgrid-wrap"></div>`;

  document.getElementById('th-btn').onclick = () => { kanaSet = 'hira'; practiceChar = null; renderKana(); };
  document.getElementById('tk-btn').onclick = () => { kanaSet = 'kata'; practiceChar = null; renderKana(); };

  // Build grid with row labels
  const wrap = document.getElementById('kgrid-wrap');
  const lookup = new Map(set.map(([ch, r]) => [ch, r]));
  const practiceMount = document.getElementById('kana-practice');

  rows.forEach(row => {
    const rowLabel = document.createElement('div');
    rowLabel.className = 'kana-row-label';
    rowLabel.textContent = row.label;
    wrap.appendChild(rowLabel);

    const grid = document.createElement('div');
    grid.className = 'kgrid';
    row.chars.forEach(ch => {
      const r = lookup.get(ch) || '?';
      const cell = document.createElement('div');
      cell.className = 'kcell' + (practiceChar === ch ? ' active' : '');
      cell.innerHTML = `<span class="k">${ch}</span><span class="r">${r}</span>`;
      cell.title = r;
      cell.onclick = () => speakWithBtn(ch, cell);
      // long-press / right-click opens writing practice when stroke data exists
      if (STROKES[ch]?.length) {
        cell.oncontextmenu = ev => {
          ev.preventDefault();
          openPractice(ch, r);
        };
        const pen = document.createElement('button');
        pen.className = 'kcell-pen';
        pen.title = 'Practice writing';
        pen.setAttribute('aria-label', `Practice writing ${ch}`);
        pen.innerHTML = '<ion-icon name="brush-outline"></ion-icon>';
        pen.onclick = ev => { ev.stopPropagation(); openPractice(ch, r); };
        cell.appendChild(pen);
      }
      grid.appendChild(cell);
    });
    wrap.appendChild(grid);
  });

  function openPractice(ch, r) {
    practiceChar = ch;
    practiceMount.innerHTML = `
      <div class="kana-practice-card card">
        <div class="kana-practice-head">
          <span class="kana-practice-title"><b>${ch}</b> <span class="mono">${r}</span> — writing practice</span>
          <button class="btn icon-btn" id="kana-practice-close" aria-label="Close practice"><ion-icon name="close-outline"></ion-icon></button>
        </div>
        <div id="kana-practice-mount"></div>
      </div>`;
    document.getElementById('kana-practice-close').onclick = () => {
      practiceChar = null;
      renderKana();
    };
    mountKanjiPractice(document.getElementById('kana-practice-mount'), ch, {
      mode: 'trace',
      label: r,
      sub: `${kanaSet === 'hira' ? 'hiragana' : 'katakana'} — ${r}`,
    });
    practiceMount.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    // highlight the active cell
    wrap.querySelectorAll('.kcell.active').forEach(c => c.classList.remove('active'));
    [...wrap.querySelectorAll('.kcell')].find(c => c.querySelector('.k')?.textContent === ch)
      ?.classList.add('active');
  }

  // Reopen the practice panel if a kana was open before re-render
  if (practiceChar && STROKES[practiceChar]?.length) {
    openPractice(practiceChar, lookup.get(practiceChar) || '?');
  }

  const onDone = (s, t) => { updateBest('kana', s, t); };
  document.getElementById('qz1-btn').onclick = () =>
    runFullQuiz(kanaQs(set, 12, false), { onDone, onExit: renderKana, backLabel: '← Kana Trainer' });
  document.getElementById('qz2-btn').onclick = () =>
    runFullQuiz(kanaQs(set, 12, true), { onDone, onExit: renderKana, backLabel: '← Kana Trainer' });
}
