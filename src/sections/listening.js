import { ALLVOCAB } from '../data/vocab.js';
import { quiz } from '../utils/quiz.js';
import { shuffle } from '../utils/helpers.js';
import { HAS_TTS } from '../utils/tts.js';
import { updateBest } from '../state.js';

/** Build listening quiz questions */
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

export function renderListening() {
  const main = document.getElementById('main');

  main.innerHTML = `
    <div class="sec-title">Listening</div>
    <div class="sec-sub">${
      HAS_TTS
        ? 'Listen with your speakers/headphones and pick the correct meaning.'
        : 'Your browser has no speech synthesis — the words are shown instead.'
    }</div>
    <div class="btnrow" style="justify-content:flex-start;flex-wrap:wrap">
      <button class="btn primary" id="lq-btn"><ion-icon name="headset-outline"></ion-icon> Quiz · 15 questions</button>
      <button class="btn" id="lmany-btn"><ion-icon name="list-outline"></ion-icon> Long quiz · 40 questions</button>
      <button class="btn" id="lslow-btn"><ion-icon name="speedometer-outline"></ion-icon> Slow (0.7×)</button>
    </div>
    <div id="lqz" style="margin-top:24px"></div>`;

  const onDone = (s, t) => updateBest('listening', s, t);

  document.getElementById('lq-btn').onclick = () =>
    quiz(document.getElementById('lqz'), listeningQs(15), { onDone });

  document.getElementById('lmany-btn').onclick = () =>
    quiz(document.getElementById('lqz'), listeningQs(40), { onDone });

  document.getElementById('lslow-btn').onclick = () =>
    quiz(document.getElementById('lqz'), listeningQs(15), { rate: 0.7, onDone });
}
