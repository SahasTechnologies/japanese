import { READING } from '../data/reading.js';
import { quiz } from '../utils/quiz.js';
import { updateBest } from '../state.js';

export function renderReading() {
  const main = document.getElementById('main');

  main.innerHTML = `
    <div class="sec-title">Reading</div>
    <div class="sec-sub">Read each passage carefully, then answer the comprehension questions</div>
    <div id="rd"></div>`;

  const rd = document.getElementById('rd');

  READING.forEach((passage, pi) => {
    const sec = document.createElement('div');
    sec.className = 'card';
    sec.style.marginBottom = '20px';

    // Preserve line breaks with white-space:pre-line
    sec.innerHTML = `
      <h4 style="font:700 15px var(--sans);margin-bottom:10px;color:var(--ink2);letter-spacing:.03em">
        ${pi + 1}. ${passage.title}
      </h4>
      <div class="passage">${passage.text}</div>
      <div id="rq-${pi}"></div>`;

    rd.appendChild(sec);

    quiz(
      sec.querySelector(`#rq-${pi}`),
      passage.qs,
      { onDone: (s, t) => updateBest('reading', s, t) }
    );
  });
}
