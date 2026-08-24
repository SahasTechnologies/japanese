import VOCAB from '../data/vocab.json' with { type: 'json' };
const ALLVOCAB = Object.values(VOCAB).flat();
import { runFullQuiz } from '../utils/fullQuiz.js';
import { shuffle } from '../utils/helpers.js';
import { speakWithBtn } from '../utils/tts.js';
import {
  updateBest, getState,
  toggleVocabLearned, setVocabKanjiMode, setShowFurigana,
  formatVocabWord,
} from '../state.js';
import { rubyWord } from '../utils/furigana.js';
import { srsCounts, srsQueue } from '../utils/srs.js';
import { mountSrsReview } from '../utils/srsReview.js';
import { pitchHtml } from '../utils/pitch.js';

let vcat = Object.keys(VOCAB)[0];
let selectedWord = null; // [expr, reading, meaning] currently expanded

/** SRS catalog for the whole vocab list */
function vocabSrsCards() {
  return ALLVOCAB.map(w => ({
    id: `v:${w[0]}`,
    front: `<span class="big-kana">${rubyWord(w[0], w[1])}</span>`,
    back: `<div class="srs-meaning">${w[2]}</div>
      <div class="srs-sub">${w[1]}${pitchHtml(w[0], w[1])}</div>`,
    speak: w[0],
  }));
}

/** Simple N5-style example sentences for a word */
export function exampleSentences(expr, reading, meaning) {
  const m = (meaning || '').toLowerCase();
  const w = expr;
  const r = reading;
  const examples = [];

  // Prefer natural patterns by rough POS
  if (/^to\s/.test(m) || m.includes('(v.') || m.includes('verb')) {
    examples.push({
      jp: `${w}ます。`,
      en: `I / someone ${m.replace(/^to\s+/, '')}.`,
    });
    examples.push({
      jp: `毎日、${w}ます。`,
      en: `I ${m.replace(/^to\s+/, '')} every day.`,
    });
  } else if (m.includes('i-adj') || /(い)$/.test(r) && /(big|small|new|old|good|bad|hot|cold|high|long|short|interesting|busy|beautiful|delicious|difficult|easy|expensive|cheap|early|late|young|old)/.test(m)) {
    examples.push({
      jp: `これは${w}です。`,
      en: `This is ${m.split(/[;,]/)[0].trim()}.`,
    });
    examples.push({
      jp: `${w}い${w.includes('い') ? '' : ''}本です。`.replace('いいい', 'いい'),
      en: `It is a ${m.split(/[;,]/)[0].trim()} book.`,
    });
  } else if (/(person|man|woman|student|teacher|friend|family|child|doctor)/.test(m)) {
    examples.push({
      jp: `あの人は${w}です。`,
      en: `That person is ${m.split(/[;,]/)[0].trim()}.`,
    });
    examples.push({
      jp: `${w}と話します。`,
      en: `I talk with ${m.split(/[;,]/)[0].trim()}.`,
    });
  } else if (/(place|school|station|home|house|park|hospital|store|shop|office|library)/.test(m)) {
    examples.push({
      jp: `${w}に行きます。`,
      en: `I go to ${m.split(/[;,]/)[0].trim()}.`,
    });
    examples.push({
      jp: `${w}で勉強します。`,
      en: `I study at ${m.split(/[;,]/)[0].trim()}.`,
    });
  } else if (/(food|drink|water|tea|rice|bread|meat|fish|fruit|meal)/.test(m)) {
    examples.push({
      jp: `${w}を食べます。`,
      en: `I eat ${m.split(/[;,]/)[0].trim()}.`,
    });
    examples.push({
      jp: `${w}が好きです。`,
      en: `I like ${m.split(/[;,]/)[0].trim()}.`,
    });
  } else if (/(time|day|week|month|year|today|tomorrow|morning|hour)/.test(m)) {
    examples.push({
      jp: `${w}、学校に行きます。`,
      en: `${m.split(/[;,]/)[0].trim()}, I go to school.`,
    });
  } else {
    examples.push({
      jp: `これは${w}です。`,
      en: `This is ${m.split(/[;,]/)[0].trim() || reading}.`,
    });
    examples.push({
      jp: `${w}があります。`,
      en: `There is ${m.split(/[;,]/)[0].trim() || reading}.`,
    });
  }

  // Deduplicate weird doubles
  return examples.slice(0, 2);
}

function displayHtml(w) {
  return formatVocabWord(w[0], w[1]);
}

export function vocabQs(words, n) {
  const pool = shuffle(words).slice(0, n);
  return pool.map(w => {
    const correct = w[2];
    const distractors = shuffle(words.filter(x => x[2] !== correct)).slice(0, 3).map(x => x[2]);
    const options = shuffle([correct, ...distractors]);
    return {
      q: displayHtml(w),
      options,
      a: options.indexOf(correct),
    };
  });
}

export function renderVocab() {
  const main = document.getElementById('main');
  const P = getState();
  const learnedCount = P.vocabLearned.length;
  const mode = P.vocabKanjiMode || 'learned';

  main.innerHTML = `
    <div class="sec-title">Vocabulary</div>
    <div class="sec-sub">${ALLVOCAB.length} JLPT N5 words · ${learnedCount} marked learned
      · Kanji unlock after you mark them Can read</div>

    <div class="btnrow" style="justify-content:flex-start;margin-bottom:12px;flex-wrap:wrap;align-items:center;gap:10px">
      <button class="btn primary" id="vq-btn">Quiz — ${vcat}</button>
      <button class="btn" id="vqa-btn">Quiz — all</button>
      <button class="btn" id="vql-btn" ${learnedCount < 4 ? 'disabled title="Mark at least 4 words as learned"' : ''}>
        Learned quiz (${learnedCount})
      </button>
      <button class="btn" id="vsrs-btn"><ion-icon name="layers-outline"></ion-icon> SRS review</button>
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
          <input type="checkbox" id="furi-toggle" ${P.showFurigana !== false ? 'checked' : ''}/>
          <span>Furigana (ruby readings)</span>
        </label>
      </div>
    </div>

    <div class="vcat-tabs" id="vct"></div>
    <div class="vlist" id="vl"></div>`;

  // Segmented control
  main.querySelectorAll('.seg-control .seg').forEach(btn => {
    btn.onclick = () => {
      setVocabKanjiMode(btn.dataset.mode);
      selectedWord = null;
      renderVocab();
    };
  });
  document.getElementById('furi-toggle').onchange = e => {
    setShowFurigana(e.target.checked);
    renderVocab();
  };

  // Categories
  const vct = document.getElementById('vct');
  Object.keys(VOCAB).forEach(cat => {
    const b = document.createElement('button');
    b.className = 'vcat' + (cat === vcat ? ' on' : '');
    const n = VOCAB[cat].filter(w => P.vocabLearned.includes(w[0])).length;
    b.textContent = `${cat} (${VOCAB[cat].length}${n ? ` · ${n}✓` : ''})`;
    b.onclick = () => { vcat = cat; selectedWord = null; renderVocab(); };
    vct.appendChild(b);
  });

  // SRS review
  const srsCards = vocabSrsCards();
  const srsIds = srsCards.map(c => c.id);
  const sc = srsCounts(srsIds);
  const srsBtn = document.getElementById('vsrs-btn');
  if (srsBtn) {
    srsBtn.innerHTML = `<ion-icon name="layers-outline"></ion-icon> SRS review <b class="mono">${sc.due + sc.fresh}</b>`;
    srsBtn.onclick = () => mountSrsReview({
      title: 'Vocabulary — spaced repetition',
      cards: srsCards,
      queue: srsQueue(srsIds),
      onExit: renderVocab,
    });
  }

  // Cards
  const vl = document.getElementById('vl');
  VOCAB[vcat].forEach(w => {
    const learned = P.vocabLearned.includes(w[0]);
    const isOpen = selectedWord && selectedWord[0] === w[0] && selectedWord[1] === w[1];
    const card = document.createElement('div');
    card.className = 'vcard' + (learned ? ' learned' : '') + (isOpen ? ' open' : '');

    let detail = '';
    if (isOpen) {
      const exs = exampleSentences(w[0], w[1], w[2]);
      detail = `
        <div class="v-detail">
          <div class="v-reading-line">
            <span class="v-full">${formatVocabWord(w[0], w[1])}</span>
            <span class="v-kana-hint">${w[1]}</span>
            ${pitchHtml(w[0], w[1])}
          </div>
          <div class="v-examples">
            <div class="v-ex-title">Example sentences</div>
            ${exs.map(ex => `
              <div class="v-ex">
                <div class="v-ex-jp">${ex.jp}</div>
                <div class="v-ex-en">${ex.en}</div>
                <button class="btn v-ex-speak" data-say="${ex.jp.replace(/"/g, '&quot;')}" title="Listen">
                  <ion-icon name="volume-high-outline"></ion-icon>
                </button>
              </div>`).join('')}
          </div>
        </div>`;
    }

    card.innerHTML = `
      <div class="vcard-top">
        <span class="w">${displayHtml(w)}</span>
        <span class="v-speaker" title="Listen"><ion-icon name="volume-high-outline"></ion-icon></span>
      </div>
      <div class="m">${w[2]}</div>
      ${detail}
      <div class="vcard-actions">
        <button class="btn v-learn ${learned ? 'red' : ''}">
          ${learned ? '<ion-icon name="checkmark-circle"></ion-icon> Learned' : 'Mark learned'}
        </button>
        <button class="btn v-more">${isOpen ? 'Hide examples' : 'Examples'}</button>
      </div>`;

    card.querySelector('.v-speaker').onclick = ev => {
      ev.stopPropagation();
      speakWithBtn(w[0], card.querySelector('.v-speaker'));
    };
    card.querySelector('.v-learn').onclick = ev => {
      ev.stopPropagation();
      toggleVocabLearned(w[0]);
      renderVocab();
    };
    card.querySelector('.v-more').onclick = ev => {
      ev.stopPropagation();
      selectedWord = isOpen ? null : w;
      renderVocab();
    };
    card.querySelectorAll('.v-ex-speak').forEach(b => {
      b.onclick = ev => {
        ev.stopPropagation();
        speakWithBtn(b.dataset.say, b);
      };
    });
    // click card body toggles examples
    card.onclick = () => {
      selectedWord = isOpen ? null : w;
      renderVocab();
    };
    vl.appendChild(card);
  });

  const onDone = (s, t) => updateBest('vocab', s, t);
  document.getElementById('vq-btn').onclick = () =>
    runFullQuiz(vocabQs(VOCAB[vcat], Math.min(12, VOCAB[vcat].length)), { onDone, onExit: renderVocab, backLabel: '← Vocabulary' });
  document.getElementById('vqa-btn').onclick = () =>
    runFullQuiz(vocabQs(ALLVOCAB, 20), { onDone, onExit: renderVocab, backLabel: '← Vocabulary' });
  const vql = document.getElementById('vql-btn');
  if (vql && !vql.disabled) {
    vql.onclick = () => {
      const learnedWords = ALLVOCAB.filter(w => P.vocabLearned.includes(w[0]));
      runFullQuiz(vocabQs(learnedWords, Math.min(15, learnedWords.length)), { onDone, onExit: renderVocab, backLabel: '← Vocabulary' });
    };
  }
}
