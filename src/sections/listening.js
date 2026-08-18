import VOCAB from '../data/vocab.json' with { type: 'json' };
import LISTENING_SCRIPTS from '../data/listening.json' with { type: 'json' };
const ALLVOCAB = Object.values(VOCAB).flat();
import { quiz } from '../utils/quiz.js';
import { shuffle } from '../utils/helpers.js';
import { HAS_TTS, speak } from '../utils/tts.js';
import { updateBest } from '../state.js';

/** Vocab-based listening (word → meaning) */
export function listeningQs(n) {
  const pool = shuffle(ALLVOCAB).slice(0, n);
  return pool.map(w => {
    const correct = w[2];
    const distractors = shuffle(ALLVOCAB.filter(x => x[2] !== correct)).slice(0, 3).map(x => x[2]);
    const options = shuffle([correct, ...distractors]);
    return {
      q: HAS_TTS
        ? '<ion-icon name="volume-high-outline"></ion-icon> Listen carefully — what does it mean?'
        : `${w[0]}（${w[1]}）`,
      speak: w[0],
      options,
      a: options.indexOf(correct),
    };
  });
}

/** Scripted dialogue questions — speak full script then ask */
function scriptQs() {
  return LISTENING_SCRIPTS.flatMap(s =>
    s.qs.map(q => ({
      q: HAS_TTS
        ? `<div style="font-size:12px;color:var(--ink2);margin-bottom:6px">${s.title}</div>
           <ion-icon name="volume-high-outline"></ion-icon> Listen to the dialogue, then answer.`
        : `<div style="font-size:12px;color:var(--ink2)">${s.title}</div>
           <div class="passage" style="font-size:14px;margin:8px 0">${s.script}</div>${q.q}`,
      speak: s.script,
      options: q.o,
      a: q.a,
      // show the question text after speaking in TTS mode
      _prompt: q.q,
    }))
  );
}

export function renderListening() {
  const main = document.getElementById('main');
  const scriptCount = LISTENING_SCRIPTS.reduce((n, s) => n + s.qs.length, 0);

  main.innerHTML = `
    <div class="sec-title">Listening</div>
    <div class="sec-sub">${
      HAS_TTS
        ? `Word quizzes from vocabulary plus ${LISTENING_SCRIPTS.length} scripted dialogues (${scriptCount} questions). Use speakers or headphones.`
        : 'Your browser has no speech synthesis — text fallback is shown.'
    }</div>
    <div class="btnrow" style="justify-content:flex-start;flex-wrap:wrap">
      <button class="btn primary" id="lq-btn"><ion-icon name="headset-outline"></ion-icon> Word quiz · 20</button>
      <button class="btn" id="lmany-btn"><ion-icon name="list-outline"></ion-icon> Word quiz · 50</button>
      <button class="btn" id="lscript-btn"><ion-icon name="chatbubbles-outline"></ion-icon> Dialogues · ${scriptCount} q</button>
      <button class="btn" id="lslow-btn"><ion-icon name="speedometer-outline"></ion-icon> Slow words (0.7×)</button>
    </div>
    <div id="lqz" style="margin-top:24px"></div>`;

  const onDone = (s, t) => updateBest('listening', s, t);

  document.getElementById('lq-btn').onclick = () =>
    quiz(document.getElementById('lqz'), listeningQs(20), { onDone });

  document.getElementById('lmany-btn').onclick = () =>
    quiz(document.getElementById('lqz'), listeningQs(50), { onDone });

  document.getElementById('lscript-btn').onclick = () => {
    const qs = shuffle(scriptQs()).map(q => {
      // For TTS: put the actual question under the listen prompt after first play
      if (HAS_TTS && q._prompt) {
        return {
          ...q,
          q: q.q + `<div style="margin-top:10px;font-size:15px">${q._prompt}</div>`,
        };
      }
      return q;
    });
    quiz(document.getElementById('lqz'), qs, { onDone, rate: 0.9 });
  };

  document.getElementById('lslow-btn').onclick = () =>
    quiz(document.getElementById('lqz'), listeningQs(20), { rate: 0.7, onDone });
}
