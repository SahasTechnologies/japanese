/**
 * Full multimodal mock test modelled on the official JLPT N5 structure:
 *
 *  Section 1 — Vocabulary: kanji reading, orthography (kana → kanji),
 *              contextually-defined expressions, paraphrases
 *  Section 2 — Grammar: sentence grammar (particles), sentence composition
 *              (★ ordering), text grammar (blanks inside a passage)
 *  Section 3 — Reading: short passages, medium passages, information retrieval
 *  Section 4 — Listening: task comprehension (dialogues), point comprehension,
 *              quick responses
 */
import VOCAB from '../data/vocab.json' with { type: 'json' };
import kanjiData from '../data/kanji.json' with { type: 'json' };
import READING from '../data/reading.json' with { type: 'json' };
import grammar from '../data/grammar.json' with { type: 'json' };
import QUICK_RESPONSES from '../data/quickResponses.json' with { type: 'json' };
import LISTENING_SCRIPTS from '../data/listening.json' with { type: 'json' };
const ALLVOCAB = Object.values(VOCAB).flat();
const { KANJI } = kanjiData;
const { PARTICLE_QUIZ } = grammar;
import { runFullQuiz } from '../utils/fullQuiz.js';
import { shuffle } from '../utils/helpers.js';
import { HAS_TTS } from '../utils/tts.js';
import { furigana, rubyWord } from '../utils/furigana.js';
import { tokenize } from '../utils/sentenceBuilder.js';
import { getState, updateBest, save } from '../state.js';

const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;');
const label = t => `<div class="mock-label">${t}</div>`;
const underline = (sentence, word) => {
  const i = sentence.indexOf(word);
  if (i === -1) return furigana(sentence);
  return furigana(sentence.slice(0, i)) + `<u class="mock-under">${furigana(word)}</u>` + furigana(sentence.slice(i + word.length));
};

/** Example sentences for a vocab word (from the shared generator) */
function exampleFor(w) {
  const [expr, reading, meaning] = w;
  const m = (meaning || '').toLowerCase();
  if (/^to\s/.test(m)) {
    // verbs: rough masu-form so the sentence reads naturally
    const stem = /[る]$/.test(expr) ? expr.slice(0, -1) : /[う]$/.test(expr) ? expr.slice(0, -1) + 'い' : expr;
    return `${stem}ます。`;
  }
  if (/place|school|station|home|store/.test(m)) return `${expr}へ 行きます。`;
  if (/food|drink|water|tea|rice|bread/.test(m)) return `${expr}を 食べます。`;
  if (/person|friend|teacher|family/.test(m)) return `${expr}は 親切です。`;
  if (m.includes('i-adj')) return `これは${expr}です。`;
  return `${expr}が 好きです。`;
}

/* ---- Section 1: Vocabulary ---- */

// ① Kanji reading — underlined kanji word in a sentence → its reading
function kanjiReadingQs(n) {
  const pool = shuffle(ALLVOCAB.filter(w => w[0] !== w[1] && /[\u4e00-\u9faf]/.test(w[0]))).slice(0, n * 2);
  const qs = [];
  for (const w of pool) {
    if (qs.length >= n) break;
    const sentence = exampleFor(w);
    if (!sentence.includes(w[0])) continue;
    const distractors = shuffle(ALLVOCAB.filter(x => x[1] !== w[1] && x[1] !== x[0]))
      .slice(0, 12).map(x => x[1])
      .filter(r => r !== w[1]).slice(0, 3);
    if (distractors.length < 3) continue;
    const options = shuffle([w[1], ...distractors]);
    qs.push({
      q: `${label('語彙 · Kanji reading')}${underline(sentence, w[0])}<div style="font-size:13px;color:var(--ink2);margin-top:6px">下線の ことばの 読み方</div>`,
      options: options.map(furigana),
      a: options.indexOf(w[1]),
    });
  }
  return qs;
}

// ② Orthography — underlined kana word → its kanji writing
function orthographyQs(n) {
  const pool = shuffle(ALLVOCAB.filter(w => w[0] !== w[1] && /[\u4e00-\u9faf]/.test(w[0]))).slice(0, n * 2);
  const qs = [];
  for (const w of pool) {
    if (qs.length >= n) break;
    const sentence = exampleFor(w);
    if (!sentence.includes(w[0])) continue;
    const kanaSentence = sentence.split(w[0]).join(w[1]);
    const distractors = shuffle(ALLVOCAB.filter(x => x[0] !== w[0] && /[\u4e00-\u9faf]/.test(x[0]) && x[0] !== x[1]))
      .slice(0, 12).map(x => x[0])
      .filter(e => e !== w[0]).slice(0, 3);
    if (distractors.length < 3) continue;
    const options = shuffle([w[0], ...distractors]);
    const i = kanaSentence.indexOf(w[1]);
    const marked = furigana(kanaSentence.slice(0, i)) + `<u class="mock-under">${esc(w[1])}</u>` + furigana(kanaSentence.slice(i + w[1].length));
    qs.push({
      q: `${label('語彙 · Orthography')}${marked}<div style="font-size:13px;color:var(--ink2);margin-top:6px">下線の ことばの 漢字</div>`,
      options: options.map(o => rubyWord(o, ALLVOCAB.find(x => x[0] === o)?.[1] || o)),
      a: options.indexOf(w[0]),
    });
  }
  return qs;
}

// ③ Contextually-defined — sentence with a blank → the word that fits
function contextQs(n) {
  const pool = shuffle(ALLVOCAB.filter(w => /[\u4e00-\u9faf]/.test(w[0]))).slice(0, n * 2);
  const qs = [];
  for (const w of pool) {
    if (qs.length >= n) break;
    const sentence = exampleFor(w);
    if (!sentence.includes(w[0])) continue;
    const blanked = sentence.replace(w[0], '＿＿');
    const distractors = shuffle(ALLVOCAB.filter(x => x[0] !== w[0] && /[\u4e00-\u9faf]/.test(x[0])))
      .slice(0, 12).map(x => x[0]).filter(e => e !== w[0]).slice(0, 3);
    if (distractors.length < 3) continue;
    const options = shuffle([w[0], ...distractors]);
    qs.push({
      q: `${label('語彙 · In context')}${furigana(blanked)}<div style="font-size:13px;color:var(--ink2);margin-top:6px">＿＿に 入る ことば</div>`,
      options: options.map(o => rubyWord(o, ALLVOCAB.find(x => x[0] === o)?.[1] || o)),
      a: options.indexOf(w[0]),
    });
  }
  return qs;
}

// ④ Paraphrase — which meaning is closest
function paraphraseQs(n) {
  const pool = shuffle(ALLVOCAB).slice(0, n);
  return pool.map(w => {
    const correct = w[2];
    const distractors = shuffle(ALLVOCAB.filter(x => x[2] !== correct)).slice(0, 3).map(x => x[2]);
    const options = shuffle([correct, ...distractors]);
    return {
      q: `${label('語彙 · Paraphrase')}<span class="mock-word">${rubyWord(w[0], w[1])}</span><div style="font-size:13px;color:var(--ink2);margin-top:6px">いみが 一番 近いもの</div>`,
      options,
      a: options.indexOf(correct),
    };
  });
}

/* ---- Section 2: Grammar ---- */

// ⑤ Sentence grammar — particles / forms
function sentenceGrammarQs(n) {
  return shuffle(PARTICLE_QUIZ).slice(0, n).map(p => ({
    q: `${label('文法 · Sentence grammar')}<span class="mock-word">${furigana(p.q)}</span>`,
    options: (p.o || p.options).map(furigana),
    a: p.a,
  }));
}

// ⑥ Sentence composition (★) — which piece goes in the starred slot
function compositionQs(n) {
  const bank = [];
  READING.filter(p => !p.retrieval).forEach(p => {
    (p.text || '').split(/\n+/).forEach(line => {
      const t = line.trim();
      if (t && !t.includes('※') && !t.includes('：') && !/\d{1,2}:\d{2}/.test(t) && t.length <= 40) bank.push(t);
    });
  });
  ALLVOCAB.filter(w => /[\u4e00-\u9faf]/.test(w[0])).slice(0, 60).forEach(w => bank.push(exampleFor(w)));
  const candidates = shuffle(bank.map(s => ({ s, tokens: tokenize(s) })).filter(x => x.tokens.length >= 4 && x.tokens.length <= 6));
  const allTokens = new Set();
  candidates.forEach(c => c.tokens.forEach(t => allTokens.add(t)));
  const tokenList = [...allTokens];

  const qs = [];
  for (const c of candidates) {
    if (qs.length >= n) break;
    const starIdx = 2;
    const answer = c.tokens[starIdx];
    const shown = c.tokens.map((t, i) => (i === starIdx ? '★' : furigana(t)));
    const distractors = shuffle(tokenList.filter(t => t !== answer && !c.tokens.includes(t))).slice(0, 3);
    if (distractors.length < 3) continue;
    const options = shuffle([answer, ...distractors]);
    qs.push({
      q: `${label('文法 · Sentence composition')}<div class="mock-passage">${shown.join('　')}</div>
          <div style="font-size:13px;color:var(--ink2);margin-bottom:6px">★に 入るもの</div>`,
      options: options.map(furigana),
      a: options.indexOf(answer),
    });
  }
  return qs;
}

// ⑦ Text grammar — numbered blanks inside a short passage
function textGrammarQs(n) {
  const qs = [];
  const particlePool = ['は', 'が', 'を', 'に', 'で', 'と', 'も', 'へ', 'の'];
  const sentences = shuffle(ALLVOCAB.filter(w => /[\u4e00-\u9faf]/.test(w[0]) && w[0] !== w[1]))
    .slice(0, n * 3)
    .map(w => exampleFor(w))
    .filter(s => s.includes('を') || s.includes('に') || s.includes('で'));
  for (let i = 0; i + 1 < sentences.length && qs.length < n; i += 2) {
    const s1 = sentences[i];
    const s2 = sentences[i + 1];
    const p1 = ['を', 'に', 'で'].find(p => s1.includes(p));
    const p2 = ['は', 'が', 'も', 'へ'].find(p => s2.includes(p));
    if (!p1 || !p2) continue;
    const passage = `${furigana(s1.replace(p1, '［①］'))}<br>${furigana(s2.replace(p2, '［②］'))}`;
    const mk = (num, correct) => {
      const distractors = shuffle(particlePool.filter(p => p !== correct)).slice(0, 3);
      const options = shuffle([correct, ...distractors]);
      return {
        q: `${label(i === 0 && num === 1 ? '文法 · Text grammar' : '文法 · Text grammar (つづき)')}${num === 1 ? `<div class="mock-passage">${passage}</div>` : ''}
            <div style="font-size:13px;color:var(--ink2);margin-bottom:6px">［${num}］に 入るもの</div>`,
        options: options.map(furigana),
        a: options.indexOf(correct),
      };
    };
    qs.push(mk('①', p1));
    qs.push(mk('②', p2));
  }
  return qs.slice(0, n);
}

/* ---- Section 3: Reading ---- */

function readingQs(nShort, nMedium, nRetrieval) {
  const out = [];
  const retrieval = READING.filter(p => p.retrieval);
  const normal = READING.filter(p => !p.retrieval);
  const mkQ = (p, q, tag) => ({
    q: `${label(`読解 · ${tag} · ${p.title}`)}
        <div class="passage mock-passage">${furigana(p.text)}</div>
        <div class="qz-q-text">${furigana(q.q || '')}</div>`,
    options: (q.o || q.options).map(furigana),
    a: q.a,
  });
  shuffle(normal.filter(p => p.qs.length === 1)).slice(0, nShort)
    .forEach(p => out.push(mkQ(p, p.qs[0], 'Short passage')));
  shuffle(normal.filter(p => p.qs.length >= 2)).slice(0, nMedium)
    .slice(0, Math.max(1, Math.ceil(nMedium / 2)))
    .forEach(p => p.qs.slice(0, 2).forEach(q => out.push(mkQ(p, q, 'Medium passage'))));
  shuffle(retrieval).slice(0, nRetrieval)
    .forEach(p => p.qs.slice(0, 2).forEach(q => out.push(mkQ(p, q, 'Information retrieval'))));
  return out;
}

/* ---- Section 4: Listening ---- */

function listeningTaskQs(n) {
  return shuffle(LISTENING_SCRIPTS.flatMap(s =>
    s.qs.map(q => ({
      q: HAS_TTS
        ? `${label('聴解 · Task comprehension')}<ion-icon name="volume-high-outline"></ion-icon> ${esc(s.title)} — Listen to the dialogue.`
        : `${label('聴解 · Task comprehension')}<div class="passage mock-passage">${esc(s.script)}</div>${q.q}`,
      speak: HAS_TTS ? s.script : undefined,
      options: (q.o || q.options).map(furigana),
      a: q.a,
    }))
  )).slice(0, n);
}

function listeningPointQs(n) {
  const pool = shuffle(ALLVOCAB).slice(0, n);
  return pool.map(w => {
    const correct = w[2];
    const distractors = shuffle(ALLVOCAB.filter(x => x[2] !== correct)).slice(0, 3).map(x => x[2]);
    const options = shuffle([correct, ...distractors]);
    return {
      q: HAS_TTS
        ? `${label('聴解 · Point comprehension')}<ion-icon name="volume-high-outline"></ion-icon> Listen — what does it mean?`
        : `${label('聴解 · Point comprehension (text fallback)')}${rubyWord(w[0], w[1])}`,
      speak: HAS_TTS ? w[0] : undefined,
      options,
      a: options.indexOf(correct),
    };
  });
}

function quickResponseQs(n) {
  return shuffle(QUICK_RESPONSES).slice(0, n).map(q => ({
    q: HAS_TTS
      ? `${label('聴解 · Quick response')}<ion-icon name="volume-high-outline"></ion-icon> Listen — choose the best reply.`
      : `${label('聴解 · Quick response')}<span class="mock-word">${furigana(q.prompt)}</span>`,
    speak: HAS_TTS ? q.prompt : undefined,
    options: q.o.map(furigana),
    a: q.a,
  }));
}

/* ---- Assemble ---- */

export function buildFullMock() {
  const sections = [
    ...kanjiReadingQs(10),
    ...orthographyQs(8),
    ...contextQs(8),
    ...paraphraseQs(6),
    ...sentenceGrammarQs(12),
    ...compositionQs(6),
    ...textGrammarQs(4),
    ...readingQs(6, 4, 4),
    ...listeningTaskQs(6),
    ...listeningPointQs(8),
    ...quickResponseQs(8),
  ];
  return sections;
}

export function buildQuickMock() {
  return [
    ...kanjiReadingQs(4),
    ...orthographyQs(3),
    ...contextQs(3),
    ...paraphraseQs(2),
    ...sentenceGrammarQs(5),
    ...compositionQs(2),
    ...textGrammarQs(2),
    ...readingQs(2, 2, 1),
    ...listeningTaskQs(2),
    ...listeningPointQs(3),
    ...quickResponseQs(3),
  ];
}

export function renderMock() {
  const P = getState();
  const main = document.getElementById('main');
  const fullN = buildFullMock().length;
  const quickN = buildQuickMock().length;

  main.innerHTML = `
    <div class="sec-title">Mock Test</div>
    <div class="sec-sub">
      Modelled on the official JLPT N5 sections: vocabulary, grammar,
      reading, and listening. Best score: <b class="mono" style="color:var(--red)">${P.mockBest || 0}%</b>
    </div>
    <div class="mock-info card" style="margin-bottom:16px">
      <div class="mock-grid">
        <div class="mock-stat"><span>${fullN}</span><small>Full questions</small></div>
        <div class="mock-stat"><span>50:00</span><small>Full time limit</small></div>
        <div class="mock-stat"><span>80%</span><small>Pass target</small></div>
      </div>
      <p style="margin-top:12px;font-size:13px;color:var(--ink2);line-height:1.5">
        語彙 — kanji reading · orthography · in context · paraphrase ｜
        文法 — particles · sentence composition ★ · text grammar ｜
        読解 — short &amp; medium passages · information retrieval ｜
        聴解 — task comprehension · point comprehension · quick responses
      </p>
    </div>
    <div class="btnrow" style="justify-content:flex-start;flex-wrap:wrap">
      <button class="btn primary" id="m-full">
        <ion-icon name="school-outline"></ion-icon> Full mock · ${fullN} questions · 50 min
      </button>
      <button class="btn" id="m-quick">
        <ion-icon name="flash-outline"></ion-icon> Quick mock · ${quickN} questions · 15 min
      </button>
    </div>`;

  const run = (builder, seconds) => {
    runFullQuiz(builder(), {
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

  document.getElementById('m-full').onclick = () => run(buildFullMock, 50 * 60);
  document.getElementById('m-quick').onclick = () => run(buildQuickMock, 15 * 60);
}
