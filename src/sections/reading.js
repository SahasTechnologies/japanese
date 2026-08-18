import READING from '../data/reading.json' with { type: 'json' };
import { quiz } from '../utils/quiz.js';
import { shuffle } from '../utils/helpers.js';
import { updateBest } from '../state.js';

export function renderReading() {
  const main = document.getElementById('main');
  const totalQ = READING.reduce((n, p) => n + p.qs.length, 0);

  main.innerHTML = `
    <div class="sec-title">Reading</div>
    <div class="sec-sub">${READING.length} passages · ${totalQ} comprehension questions. Read carefully, then answer.</div>
    <div class="btnrow" style="justify-content:flex-start;margin-bottom:16px;flex-wrap:wrap">
      <button class="btn primary" id="rq-all"><ion-icon name="documents-outline"></ion-icon> Mixed quiz · 20 questions</button>
      <button class="btn" id="rq-long"><ion-icon name="library-outline"></ion-icon> Full practice · all questions</button>
    </div>
    <div id="rqz" style="margin-bottom:20px"></div>
    <div id="rd"></div>`;

  const allQs = READING.flatMap(p =>
    p.qs.map(q => ({
      ...q,
      q: `<div style="font-size:12px;color:var(--ink2);margin-bottom:6px">${p.title}</div>${q.q}`,
    }))
  );

  document.getElementById('rq-all').onclick = () =>
    quiz(document.getElementById('rqz'), shuffle(allQs).slice(0, 20), {
      onDone: (s, t) => updateBest('reading', s, t),
    });

  document.getElementById('rq-long').onclick = () =>
    quiz(document.getElementById('rqz'), shuffle(allQs), {
      onDone: (s, t) => updateBest('reading', s, t),
    });

  const rd = document.getElementById('rd');
  READING.forEach((passage, pi) => {
    const sec = document.createElement('div');
    sec.className = 'card';
    sec.style.marginBottom = '20px';
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
