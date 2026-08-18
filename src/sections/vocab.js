import { VOCAB, ALLVOCAB } from '../data/vocab.js';
import { quiz } from '../utils/quiz.js';
import { shuffle } from '../utils/helpers.js';
import { speak } from '../utils/tts.js';
import {
  updateBest, getState, save,
  toggleVocabLearned, setVocabHideKanji, canShowKanjiForm,
} from '../state.js';

let vcat = Object.keys(VOCAB)[0];

/** Display form of a word: kana-only if setting on, or if kanji not yet "can read" */
function displayWord(w) {
  const P = getState();
  const [expr, reading] = w;
  if (P.vocabHideKanji) return reading;
  if (!canShowKanjiForm(expr)) return reading;
  return expr;
}

/** Build vocab meaning quiz questions */
export function vocabQs(words, n) {
  const pool = shuffle(words).slice(0, n);
  return pool.map(w => {
    const correct = w[2];
    const distractors = shuffle(words.filter(x => x[2] !== correct)).slice(0, 3).map(x => x[2]);
    const options = shuffle([correct, ...distractors]);
    const shown = displayWord(w);
    const readingHint = shown === w[1] ? '' : ` <span style="color:var(--ink2);font-size:13px">（${w[1]}）</span>`;
    return {
      q: `${shown}${readingHint}`,
      options,
      a: options.indexOf(correct),
    };
  });
}

export function renderVocab() {
  const main = document.getElementById('main');
  const P = getState();
  const learnedCount = P.vocabLearned.length;

  main.innerHTML = `
    <div class="sec-title">Vocabulary</div>
    <div class="sec-sub">${ALLVOCAB.length} JLPT N5 words · ${learnedCount} marked learned
      · Kanji forms only appear after you mark those kanji as “can read”</div>
    <div class="btnrow" style="justify-content:flex-start;margin-bottom:12px;flex-wrap:wrap;align-items:center">
      <button class="btn primary" id="vq-btn">Quiz — ${vcat}</button>
      <button class="btn" id="vqa-btn">Quiz — all words</button>
      <button class="btn" id="vql-btn" ${learnedCount < 4 ? 'disabled title="Mark at least 4 words as learned"' : ''}>
        Learned quiz (${learnedCount})
      </button>
      <label class="toggle-label" title="Hide kanji; show only hiragana/katakana">
        <input type="checkbox" id="hide-kanji" ${P.vocabHideKanji ? 'checked' : ''}/>
        <span>Kana only (hide kanji)</span>
      </label>
    </div>
    <div class="vcat-tabs" id="vct"></div>
    <div class="vlist" id="vl"></div>
    <div id="vqz" style="margin-top:24px"></div>`;

  document.getElementById('hide-kanji').onchange = e => {
    setVocabHideKanji(e.target.checked);
    renderVocab();
  };

  // Category tabs
  const vct = document.getElementById('vct');
  Object.keys(VOCAB).forEach(cat => {
    const b = document.createElement('button');
    b.className = 'vcat' + (cat === vcat ? ' on' : '');
    const learnedInCat = VOCAB[cat].filter(w => P.vocabLearned.includes(w[0])).length;
    b.textContent = `${cat} (${VOCAB[cat].length}${learnedInCat ? ` · ${learnedInCat}✓` : ''})`;
    b.onclick = () => { vcat = cat; renderVocab(); };
    vct.appendChild(b);
  });

  // Word cards
  const vl = document.getElementById('vl');
  VOCAB[vcat].forEach(w => {
    const learned = P.vocabLearned.includes(w[0]);
    const shown = displayWord(w);
    const card = document.createElement('div');
    card.className = 'vcard' + (learned ? ' learned' : '');
    card.innerHTML = `
      <div class="vcard-top">
        <span class="w">${shown}</span>
        ${shown !== w[1] ? `<span class="r">${w[1]}</span>` : ''}
        <span class="v-speaker" title="Listen" aria-label="Listen"><ion-icon name="volume-high-outline"></ion-icon></span>
      </div>
      <div class="m">${w[2]}</div>
      <button class="btn v-learn ${learned ? 'red' : ''}" data-word="${w[0].replace(/"/g, '&quot;')}">
        ${learned ? '<ion-icon name="checkmark-circle"></ion-icon> Learned' : 'Mark learned'}
      </button>`;
    card.querySelector('.v-speaker').onclick = ev => { ev.stopPropagation(); speak(w[0]); };
    card.querySelector('.v-learn').onclick = ev => {
      ev.stopPropagation();
      toggleVocabLearned(w[0]);
      renderVocab();
    };
    card.onclick = () => speak(w[0]);
    vl.appendChild(card);
  });

  const onDone = (s, t) => updateBest('vocab', s, t);
  document.getElementById('vq-btn').onclick = () =>
    quiz(document.getElementById('vqz'), vocabQs(VOCAB[vcat], Math.min(12, VOCAB[vcat].length)), { onDone });
  document.getElementById('vqa-btn').onclick = () =>
    quiz(document.getElementById('vqz'), vocabQs(ALLVOCAB, 20), { onDone });
  const vql = document.getElementById('vql-btn');
  if (vql && !vql.disabled) {
    vql.onclick = () => {
      const learnedWords = ALLVOCAB.filter(w => P.vocabLearned.includes(w[0]));
      if (learnedWords.length < 4) return;
      quiz(document.getElementById('vqz'), vocabQs(learnedWords, Math.min(15, learnedWords.length)), { onDone });
    };
  }
}
