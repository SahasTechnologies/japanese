/**
 * Placement Test — an optional diagnostic quiz for people who already know
 * some Japanese. Mixes vocab, kanji, and short sentence questions; at the end
 * it gives a rough level readout and offers to mark the words/kanji the
 * person answered correctly as already-known, so progress tracking starts
 * from a realistic baseline instead of zero.
 */
import VOCAB from '../data/vocab.json' with { type: 'json' };
import kanjiData from '../data/kanji.json' with { type: 'json' };
import readingData from '../data/reading.json' with { type: 'json' };
const ALLVOCAB = Object.values(VOCAB).flat();
const { KANJI } = kanjiData;
import { shuffle } from '../utils/helpers.js';
import { toggleVocabLearned, toggleKanjiFlag, getState } from '../state.js';

const N_QUESTIONS = 20;

function buildQuestions() {
  const qs = [];

  // Vocab meaning questions
  shuffle(ALLVOCAB).slice(0, 10).forEach(w => {
    const distractors = shuffle(ALLVOCAB.filter(x => x[2] !== w[2])).slice(0, 3).map(x => x[2]);
    const options = shuffle([w[2], ...distractors]);
    qs.push({
      kind: 'vocab', key: w[0],
      q: `<span class="big-kana">${w[0]}</span><div style="font-size:14px;color:var(--ink2);margin-top:6px">${w[1]}</div>`,
      options, a: options.indexOf(w[2]),
    });
  });

  // Kanji meaning questions
  shuffle(KANJI).slice(0, 7).forEach(k => {
    const distractors = shuffle(KANJI.filter(x => x[3] !== k[3])).slice(0, 3).map(x => x[3]);
    const options = shuffle([k[3], ...distractors]);
    qs.push({
      kind: 'kanji', key: k[0],
      q: `<span class="big-kana">${k[0]}</span>`,
      options, a: options.indexOf(k[3]),
    });
  });

  // Short sentence comprehension, pulled from reading passages if available
  const allQs = (readingData || []).flatMap(p => (p.qs || []).map(q => ({ ...q, passage: p.text })));
  shuffle(allQs).slice(0, 3).forEach(rq => {
    const options = rq.o || rq.options;
    if (!options) return;
    qs.push({
      kind: 'sentence', key: null,
      q: `<div style="font-size:15px;margin-bottom:8px;white-space:pre-line">${rq.passage || ''}</div><div>${rq.q || ''}</div>`,
      options, a: rq.a,
    });
  });

  return shuffle(qs).slice(0, N_QUESTIONS);
}

export function renderPlacement(navigate) {
  const main = document.getElementById('main');
  main.innerHTML = `
    <div class="sec-title">Placement Test</div>
    <div class="sec-sub">Optional — if you already know some Japanese, take a quick ${N_QUESTIONS}-question
      spread across vocabulary, kanji, and short sentences so the app can start from where you actually are,
      instead of zero.</div>
    <div class="card" style="max-width:520px">
      <p style="margin-bottom:14px;color:var(--ink2);font-size:14px">
        This is a one-off diagnostic, not a pass/fail test. At the end you'll be able to mark the items
        you got right as already-known, which unlocks kanji display in Vocabulary and skips them
        in the learned-only drills.
      </p>
      <div class="btnrow" style="justify-content:flex-start">
        <button class="btn primary" id="pt-start">Start placement test</button>
        <button class="btn" id="pt-skip">Skip, start from zero</button>
      </div>
    </div>
    <div id="pt-area" style="margin-top:20px"></div>`;

  document.getElementById('pt-skip').onclick = () => navigate('home');
  document.getElementById('pt-start').onclick = () => runTest();

  function runTest() {
    const qs = buildQuestions();
    const area = document.getElementById('pt-area');
    let i = 0, score = 0;
    const correctVocab = [];
    const correctKanji = [];

    function show() {
      if (i >= qs.length) return finish();
      const q = qs[i];
      area.innerHTML = `
        <div class="qz">
          <div class="qz-head"><span>Question ${i + 1} / ${qs.length}</span><span>Score <b>${score}</b></span></div>
          <div class="qz-bar"><i style="width:${(i / qs.length) * 100}%"></i></div>
          <div class="qz-q">${q.q}</div>
          <div class="qz-opts" id="pt-opts"></div>
        </div>`;
      const box = document.getElementById('pt-opts');
      (q.options || []).forEach((op, idx) => {
        const b = document.createElement('button');
        b.className = 'qz-opt';
        b.textContent = op;
        b.onclick = () => {
          [...box.children].forEach(c => { c.disabled = true; });
          if (idx === q.a) {
            b.classList.add('correct');
            score++;
            if (q.kind === 'vocab') correctVocab.push(q.key);
            if (q.kind === 'kanji') correctKanji.push(q.key);
          } else {
            b.classList.add('wrong');
            if (q.a >= 0 && box.children[q.a]) box.children[q.a].classList.add('correct');
          }
          setTimeout(() => { i++; show(); }, 700);
        };
        box.appendChild(b);
      });
    }

    function finish() {
      const pct = Math.round((score / qs.length) * 100);
      let level = 'Complete beginner';
      if (pct >= 80) level = 'Solid N5 foundation';
      else if (pct >= 55) level = 'Partway through N5';
      else if (pct >= 25) level = 'Just getting started';

      area.innerHTML = `
        <div class="qz-end">
          <div class="qz-big"><b>${score}</b> / ${qs.length}</div>
          <div class="qz-pct">${pct}%</div>
          <div class="qz-msg">${level}</div>
          <p style="margin:14px 0;color:var(--ink2);font-size:13.5px">
            You got ${correctVocab.length} vocab word${correctVocab.length === 1 ? '' : 's'} and
            ${correctKanji.length} kanji right. Mark them as already known?
          </p>
          <div class="btnrow" style="justify-content:center">
            <button class="btn primary" id="pt-mark" ${(correctVocab.length + correctKanji.length) ? '' : 'disabled'}>
              Mark as known
            </button>
            <button class="btn" id="pt-home">Skip &amp; go to Home</button>
          </div>
        </div>`;
      const markBtn = document.getElementById('pt-mark');
      if (markBtn && !markBtn.disabled) {
        markBtn.onclick = () => {
          const P = getState();
          correctVocab.forEach(w => { if (!P.vocabLearned.includes(w)) toggleVocabLearned(w); });
          correctKanji.forEach(k => { if (!(P.kanjiCanRead || []).includes(k)) toggleKanjiFlag(k, 'read'); });
          navigate('home');
        };
      }
      document.getElementById('pt-home').onclick = () => navigate('home');
    }

    show();
  }
}
