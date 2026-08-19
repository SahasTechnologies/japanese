import VOCAB from '../data/vocab.json' with { type: 'json' };
import kanjiData from '../data/kanji.json' with { type: 'json' };
const ALLVOCAB = Object.values(VOCAB).flat();
const { KANJI } = kanjiData;
import { writingPractice } from '../utils/writing.js';
import { updateBest, getState } from '../state.js';

let cat = Object.keys(VOCAB)[0];

export function renderWriting() {
  const main = document.getElementById('main');
  const P = getState();

  main.innerHTML = `
    <div class="sec-title">Writing Practice</div>
    <div class="sec-sub">Type the rōmaji for each prompt — it converts to kana live, like a Japanese IME.
      Kanji answers are accepted too if your keyboard/IME produces them.</div>

    <div class="btnrow" style="justify-content:flex-start;margin-bottom:14px;flex-wrap:wrap">
      <button class="btn primary" id="wp-vocab-cat">Vocabulary — ${cat}</button>
      <button class="btn" id="wp-vocab-all">Vocabulary — all</button>
      <button class="btn" id="wp-kanji">Kanji readings</button>
      <button class="btn" id="wp-learned" ${P.vocabLearned.length < 5 ? 'disabled title="Mark at least 5 words as learned"' : ''}>
        Learned words (${P.vocabLearned.length})
      </button>
    </div>

    <div class="vcat-tabs" id="wct"></div>
    <div id="wp-area" style="margin-top:16px"></div>`;

  const wct = document.getElementById('wct');
  Object.keys(VOCAB).forEach(c => {
    const b = document.createElement('button');
    b.className = 'vcat' + (c === cat ? ' on' : '');
    b.textContent = c;
    b.onclick = () => { cat = c; renderWriting(); };
    wct.appendChild(b);
  });

  const area = document.getElementById('wp-area');
  const onDone = (s, t) => updateBest('writing', s, t);

  document.getElementById('wp-vocab-cat').onclick = () =>
    writingPractice(area, VOCAB[cat], { onDone });
  document.getElementById('wp-vocab-all').onclick = () =>
    writingPractice(area, ALLVOCAB, { onDone });
  document.getElementById('wp-kanji').onclick = () => {
    const items = KANJI.map(k => {
      const raw = (k[2] || k[1] || '').split('、')[0];
      const reading = raw.replace(/[()]/g, '');
      return [k[0], reading, k[3]];
    }).filter(x => x[1]);
    writingPractice(area, items, { onDone });
  };
  const wl = document.getElementById('wp-learned');
  if (wl && !wl.disabled) {
    wl.onclick = () => {
      const learned = ALLVOCAB.filter(w => P.vocabLearned.includes(w[0]));
      writingPractice(area, learned, { onDone });
    };
  }

  // Auto-start with the current category
  writingPractice(area, VOCAB[cat], { onDone });
}
