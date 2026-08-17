import { ALLVOCAB } from '../data/vocab.js';
import { KANJI } from '../data/kanji.js';
import { quiz } from '../utils/quiz.js';
import { shuffle } from '../utils/helpers.js';
import { vocabQs } from './vocab.js';
import { kanjiQs } from './kanji.js';
import { grammarQs } from './grammar.js';
import { getState, updateBest, save } from '../state.js';

export function renderMock() {
  const P = getState();
  const main = document.getElementById('main');

  main.innerHTML = `
    <div class="sec-title">Mock Test</div>
    <div class="sec-sub">
      Timed mixed quiz · vocab + kanji + grammar — simulating exam pressure.
      Best: <b class="mono" style="color:var(--red)">${P.mockBest}%</b>
    </div>
    <div class="mock-info card" style="margin-bottom:16px">
      <div class="mock-grid">
        <div class="mock-stat"><span>15</span><small>Questions</small></div>
        <div class="mock-stat"><span>5:00</span><small>Time limit</small></div>
        <div class="mock-stat"><span>80%</span><small>Pass target</small></div>
      </div>
    </div>
    <div class="btnrow">
      <button class="btn primary" id="m1-btn">▶ Start Mock Test</button>
    </div>
    <div id="mq" style="margin-top:24px"></div>`;

  document.getElementById('m1-btn').onclick = () => {
    const qs = shuffle([
      ...vocabQs(ALLVOCAB, 6),
      ...kanjiQs(5),
      ...grammarQs().slice(0, 4),
    ]);
    quiz(document.getElementById('mq'), qs, {
      time: 300,
      back: renderMock,
      onDone: (s, t) => {
        const pct = Math.round((s / t) * 100);
        const state = getState();
        if (pct > state.mockBest) state.mockBest = pct;
        updateBest('mock', s, t);
        save();
      },
    });
  };
}
