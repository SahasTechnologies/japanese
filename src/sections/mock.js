/**
 * Full multimodal mock test modelled on official JLPT N5 structure:
 * - Kanji reading
 * - Vocabulary / orthography-style
 * - Grammar (particles & forms)
 * - Short reading comprehension
 * - Listening (TTS-based)
 */
import VOCAB from '../data/vocab.json' with { type: 'json' };
import kanjiData from '../data/kanji.json' with { type: 'json' };
import READING from '../data/reading.json' with { type: 'json' };
import grammar from '../data/grammar.json' with { type: 'json' };
const ALLVOCAB = Object.values(VOCAB).flat();
const { KANJI } = kanjiData;
const { PARTICLE_QUIZ } = grammar;
import { runFullQuiz } from '../utils/fullQuiz.js';
import { shuffle } from '../utils/helpers.js';
import { HAS_TTS } from '../utils/tts.js';
import { getState, updateBest, save } from '../state.js';
import { furigana, rubyWord } from '../utils/furigana.js';

function kanjiReadingQs(n) {
  const pool = shuffle(KANJI.filter(k => k[1] || k[2])).slice(0, n);
  return pool.map(k => {
    const correct = (k[2] || k[1] || '').split(/[・\/、,]/)[0].trim() || k[1];
    // distractors from other readings
    const others = shuffle(KANJI.filter(x => x[0] !== k[0]))
      .map(x => (x[2] || x[1] || '').split(/[・\/、,]/)[0].trim())
      .filter(r => r && r !== correct)
      .slice(0, 3);
    const options = shuffle([correct, ...others]);
    return {
      // no furigana here on purpose — the reading IS the answer
      q: `<div class="mock-label">Kanji reading</div><span class="big-kana">${k[0]}</span><div style="font-size:13px;color:var(--ink2);margin-top:6px">How is this read?</div>`,
      options,
      a: options.indexOf(correct),
    };
  });
}

function vocabContextQs(n) {
  const pool = shuffle(ALLVOCAB).slice(0, n);
  return pool.map(w => {
    const correct = w[2];
    const distractors = shuffle(ALLVOCAB.filter(x => x[2] !== correct)).slice(0, 3).map(x => x[2]);
    const options = shuffle([correct, ...distractors]);
    return {
      q: `<div class="mock-label">Vocabulary</div><span class="mock-word">${rubyWord(w[0], w[1])}</span>`,
      options,
      a: options.indexOf(correct),
    };
  });
}

function grammarQs(n) {
  return shuffle(PARTICLE_QUIZ).slice(0, n).map(p => ({
    q: `<div class="mock-label">Grammar</div><span class="mock-word">${furigana(p.q)}</span>`,
    options: (p.o || p.options).map(furigana),
    a: p.a,
  }));
}

function readingQs(n) {
  const all = READING.flatMap(p =>
    p.qs.map(q => ({
      q: `<div class="mock-label">Reading · ${p.title}</div>
          <div class="passage mock-passage">${furigana(p.text)}</div>
          <div class="qz-q-text">${furigana(q.q || '')}</div>`,
      options: (q.o || q.options).map(furigana),
      a: q.a,
    }))
  );
  return shuffle(all).slice(0, n);
}

function listeningQs(n) {
  const pool = shuffle(ALLVOCAB).slice(0, n);
  return pool.map(w => {
    const correct = w[2];
    const distractors = shuffle(ALLVOCAB.filter(x => x[2] !== correct)).slice(0, 3).map(x => x[2]);
    const options = shuffle([correct, ...distractors]);
    return {
      q: HAS_TTS
        ? `<div class="mock-label">Listening</div><ion-icon name="volume-high-outline"></ion-icon> Listen — what does it mean?`
        : `<div class="mock-label">Listening (text fallback)</div>${w[0]}（${w[1]}）`,
      speak: w[0],
      options,
      a: options.indexOf(correct),
    };
  });
}

/** Build a full multimodal mock (~65 questions) */
export function buildFullMock() {
  return shuffle([
    ...kanjiReadingQs(12),
    ...vocabContextQs(15),
    ...grammarQs(12),
    ...readingQs(14),
    ...listeningQs(12),
  ]);
}

/** Shorter practice mock */
export function buildQuickMock() {
  return shuffle([
    ...kanjiReadingQs(5),
    ...vocabContextQs(6),
    ...grammarQs(5),
    ...readingQs(5),
    ...listeningQs(4),
  ]);
}

export function renderMock() {
  const P = getState();
  const main = document.getElementById('main');

  main.innerHTML = `
    <div class="sec-title">Mock Test</div>
    <div class="sec-sub">
      Multimodal exam in the style of official JLPT N5 samples
      (kanji reading · vocab · grammar · reading · listening).
      Best score: <b class="mono" style="color:var(--red)">${P.mockBest || 0}%</b>
    </div>
    <div class="mock-info card" style="margin-bottom:16px">
      <div class="mock-grid">
        <div class="mock-stat"><span>65</span><small>Full questions</small></div>
        <div class="mock-stat"><span>45:00</span><small>Full time limit</small></div>
        <div class="mock-stat"><span>80%</span><small>Pass target</small></div>
      </div>
      <p style="margin-top:12px;font-size:13px;color:var(--ink2);line-height:1.5">
        Sections mirror real N5 item types: kanji readings, vocabulary in context,
        particle/grammar forms, short reading passages, and TTS listening.
      </p>
    </div>
    <div class="btnrow" style="justify-content:flex-start;flex-wrap:wrap">
      <button class="btn primary" id="m-full">
        <ion-icon name="school-outline"></ion-icon> Full mock · 65 questions · 45 min
      </button>
      <button class="btn" id="m-quick">
        <ion-icon name="flash-outline"></ion-icon> Quick mock · 25 questions · 15 min
      </button>
    </div>`;

  const run = (builder, seconds) => {
    const qs = builder();
    runFullQuiz(qs, {
      time: seconds,
      onExit: renderMock,
      backLabel: '← Mock Test',
      onDone: (s, t) => {
        const pct = Math.round((s / t) * 100);
        const state = getState();
        if (pct > (state.mockBest || 0)) state.mockBest = pct;
        updateBest('mock', s, t);
        save();
      },
    });
  };

  document.getElementById('m-full').onclick = () => run(buildFullMock, 45 * 60);
  document.getElementById('m-quick').onclick = () => run(buildQuickMock, 15 * 60);
}
