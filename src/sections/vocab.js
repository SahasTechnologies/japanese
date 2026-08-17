import { VOCAB, ALLVOCAB } from '../data/vocab.js';
import { quiz } from '../utils/quiz.js';
import { shuffle } from '../utils/helpers.js';
import { speak } from '../utils/tts.js';
import { updateBest } from '../state.js';

let vcat = 'Pronouns';

/** Build vocab meaning quiz questions */
export function vocabQs(words, n) {
  const pool = shuffle(words).slice(0, n);
  return pool.map(w => {
    const correct = w[2];
    const distractors = shuffle(words.filter(x => x[2] !== correct)).slice(0, 3).map(x => x[2]);
    const options = shuffle([correct, ...distractors]);
    return {
      q: `${w[0]} <span style="color:var(--red);font-size:13px">（${w[1]}）</span>`,
      options,
      a: options.indexOf(correct),
    };
  });
}

export function renderVocab() {
  const main = document.getElementById('main');

  main.innerHTML = `
    <div class="sec-title">Vocabulary</div>
    <div class="sec-sub">${ALLVOCAB.length} core N5 words across ${Object.keys(VOCAB).length} categories — tap a card to hear it</div>
    <div class="btnrow" style="justify-content:flex-start;margin-bottom:14px">
      <button class="btn primary" id="vq-btn">Quiz — ${vcat}</button>
      <button class="btn" id="vqa-btn">Quiz — all words</button>
    </div>
    <div class="vcat-tabs" id="vct"></div>
    <div class="vlist" id="vl"></div>
    <div id="vqz" style="margin-top:24px"></div>`;

  // Category tabs
  const vct = document.getElementById('vct');
  Object.keys(VOCAB).forEach(cat => {
    const b = document.createElement('button');
    b.className = 'vcat' + (cat === vcat ? ' on' : '');
    b.textContent = `${cat} (${VOCAB[cat].length})`;
    b.onclick = () => { vcat = cat; renderVocab(); };
    vct.appendChild(b);
  });

  // Word cards
  const vl = document.getElementById('vl');
  VOCAB[vcat].forEach(w => {
    const card = document.createElement('div');
    card.className = 'vcard';
    card.innerHTML = `
      <div class="vcard-top">
        <span class="w">${w[0]}</span>
        <span class="r">${w[1]}</span>
        <span class="v-speaker" title="Listen" aria-label="Listen">🔊</span>
      </div>
      <div class="m">${w[2]}</div>`;
    card.onclick = () => speak(w[0]);
    vl.appendChild(card);
  });

  const onDone = (s, t) => updateBest('vocab', s, t);
  document.getElementById('vq-btn').onclick = () =>
    quiz(document.getElementById('vqz'), vocabQs(VOCAB[vcat], Math.min(10, VOCAB[vcat].length)), { onDone });
  document.getElementById('vqa-btn').onclick = () =>
    quiz(document.getElementById('vqz'), vocabQs(ALLVOCAB, 15), { onDone });
}
