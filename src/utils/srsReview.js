/**
 * Reusable spaced-repetition review session — a full-page card flipper with
 * Again / Hard / Good / Easy grading. Takes over #main like the quiz engine.
 *
 * mountSrsReview({
 *   title, backLabel, onExit,
 *   cards: [{ id, front (HTML), back (HTML), speak? (string), hint? (HTML) }],
 *   queue: [cardId, ...]  // from srsQueue()
 * })
 */
import { srsRate } from './srs.js';
import { speakWithBtn } from './tts.js';

const RATINGS = [
  { id: 'again', label: 'Again', cls: 'srs-again' },
  { id: 'hard',  label: 'Hard',  cls: 'srs-hard' },
  { id: 'good',  label: 'Good',  cls: 'srs-good' },
  { id: 'easy',  label: 'Easy',  cls: 'srs-easy' },
];

export function mountSrsReview(opts) {
  const main = document.getElementById('main');
  const queue = opts.queue.slice();
  let i = 0;
  let stats = { again: 0, hard: 0, good: 0, easy: 0 };

  main.innerHTML = `
    <button class="btn qz-exit-btn" id="srs-exit"><ion-icon name="arrow-back-outline"></ion-icon> ${opts.backLabel || 'Back'}</button>
    <div class="sec-title" style="margin-top:16px">${opts.title}</div>
    <div class="srs-progress"><div class="srs-progress-bar"><i id="srs-bar"></i></div>
      <span class="mono" id="srs-count"></span></div>
    <div id="srs-stage" style="margin-top:18px"></div>`;

  const exit = () => opts.onExit?.();
  document.getElementById('srs-exit').onclick = exit;

  const stage = () => document.getElementById('srs-stage');

  function updHeader() {
    const bar = document.getElementById('srs-bar');
    const count = document.getElementById('srs-count');
    if (bar) bar.style.width = `${(i / Math.max(1, queue.length)) * 100}%`;
    if (count) count.textContent = `${Math.min(i + 1, queue.length)} / ${queue.length}`;
  }

  function showCard() {
    if (i >= queue.length) return finish();
    const card = opts.cards.find(c => c.id === queue[i]) || queue[i];
    updHeader();
    stage().innerHTML = `
      <div class="srs-card card" id="srs-card">
        <div class="srs-front">${card.front}</div>
        <div class="srs-back" id="srs-back" style="display:none">${card.back || ''}</div>
      </div>
      <div class="btnrow srs-actions" id="srs-actions" style="justify-content:center"></div>`;

    const actions = document.getElementById('srs-actions');
    const back = document.getElementById('srs-back');
    const reveal = document.createElement('button');
    reveal.className = 'btn primary';
    reveal.innerHTML = '<ion-icon name="eye-outline"></ion-icon> Show answer';
    reveal.onclick = () => {
      back.style.display = '';
      reveal.remove();
      RATINGS.forEach(r => {
        const b = document.createElement('button');
        b.className = `btn ${r.cls}`;
        b.innerHTML = `<ion-icon name="${r.id === 'again' ? 'close-circle-outline' : r.id === 'hard' ? 'help-circle-outline' : r.id === 'good' ? 'checkmark-circle-outline' : 'sparkles-outline'}"></ion-icon> ${r.label}`;
        b.onclick = () => {
          stats[r.id]++;
          srsRate(card.id, r.id);
          i++;
          showCard();
        };
        actions.appendChild(b);
      });
    };
    actions.appendChild(reveal);

    if (card.speak) {
      const say = document.createElement('button');
      say.className = 'btn icon-btn';
      say.title = 'Listen';
      say.setAttribute('aria-label', 'Listen');
      say.innerHTML = '<ion-icon name="volume-high-outline"></ion-icon>';
      say.onclick = () => speakWithBtn(card.speak, say);
      actions.insertBefore(say, reveal);
    }
  }

  function finish() {
    document.getElementById('srs-bar').style.width = '100%';
    document.getElementById('srs-count').textContent = `${queue.length} / ${queue.length}`;
    const total = queue.length;
    stage().innerHTML = `
      <div class="qz-end">
        <div class="qz-big"><b>${total}</b> reviewed</div>
        <div class="srs-stats mono">
          <span class="srs-again">Again ${stats.again}</span> ·
          <span class="srs-hard">Hard ${stats.hard}</span> ·
          <span class="srs-good">Good ${stats.good}</span> ·
          <span class="srs-easy">Easy ${stats.easy}</span>
        </div>
        <div class="btnrow">
          <button class="btn primary" id="srs-again2">Review again</button>
          <button class="btn" id="srs-back2">${opts.backLabel || '← Back'}</button>
        </div>
      </div>`;
    document.getElementById('srs-again2').onclick = () => {
      i = 0;
      stats = { again: 0, hard: 0, good: 0, easy: 0 };
      showCard();
    };
    document.getElementById('srs-back2').onclick = exit;
  }

  showCard();
}
