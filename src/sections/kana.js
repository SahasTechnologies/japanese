import kana from '../data/kana.json' with { type: 'json' };
const { HIRA, KATA, HIRA_ROWS, KATA_ROWS } = kana;
import { runFullQuiz } from '../utils/fullQuiz.js';
import { shuffle } from '../utils/helpers.js';
import { speak } from '../utils/tts.js';
import { updateBest } from '../state.js';

let kanaSet = 'hira';

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
    <div id="kgrid-wrap"></div>`;

  document.getElementById('th-btn').onclick = () => { kanaSet = 'hira'; renderKana(); };
  document.getElementById('tk-btn').onclick = () => { kanaSet = 'kata'; renderKana(); };

  // Build grid with row labels
  const wrap = document.getElementById('kgrid-wrap');
  const lookup = new Map(set.map(([ch, r]) => [ch, r]));

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
      cell.className = 'kcell';
      cell.innerHTML = `<span class="k">${ch}</span><span class="r">${r}</span>`;
      cell.title = r;
      cell.onclick = () => speak(ch);
      grid.appendChild(cell);
    });
    wrap.appendChild(grid);
  });

  const onDone = (s, t) => { updateBest('kana', s, t); };
  document.getElementById('qz1-btn').onclick = () =>
    runFullQuiz(kanaQs(set, 12, false), { onDone, onExit: renderKana, backLabel: '← Kana Trainer' });
  document.getElementById('qz2-btn').onclick = () =>
    runFullQuiz(kanaQs(set, 12, true), { onDone, onExit: renderKana, backLabel: '← Kana Trainer' });
}
