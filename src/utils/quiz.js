/**
 * Reusable quiz engine.
 *
 * quiz(container, questions, options)
 *
 * Question shape: { q: string (HTML), options: string[], a: number (correct index),
 *                   speak?: string (TTS text) }
 * Options: { time?: number (seconds), rate?: number (TTS rate),
 *            back?: () => void, onDone?: (score, total) => void }
 */
import { HAS_TTS, speak } from './tts.js';
import { fmtTime, msgFor } from './helpers.js';

export function quiz(container, qs, opts = {}) {
  if (!qs.length) { container.innerHTML = '<p style="color:var(--ink2);padding:16px">No questions available.</p>'; return; }

  let i = 0, score = 0, timer = null;
  let timeLeft = opts.time || 0;

  function show() {
    const q = qs[i];
    container.innerHTML = `
      <div class="qz">
        ${opts.time ? `<div class="qz-timer" id="tm">⏱ ${fmtTime(timeLeft)}</div>` : ''}
        <div class="qz-head">
          <span>Question ${i + 1} / ${qs.length}</span>
          <span>Score <b>${score}</b></span>
        </div>
        <div class="qz-bar"><i id="qbar" style="width:${(i / qs.length) * 100}%"></i></div>
        <div class="qz-q">${q.q}</div>
        ${q.speak && HAS_TTS ? `<div class="btnrow"><button class="btn" id="sp-btn">🔊 Listen again</button></div>` : ''}
        <div class="qz-opts" id="qopts"></div>
        <div class="qz-fb" id="qfb"></div>
      </div>`;

    const box = container.querySelector('#qopts');
    const fb  = container.querySelector('#qfb');

    if (q.speak && HAS_TTS) {
      speak(q.speak, opts.rate);
      container.querySelector('#sp-btn').onclick = () => speak(q.speak, opts.rate);
    }

    q.options.forEach((op, idx) => {
      const b = document.createElement('button');
      b.className = 'qz-opt';
      b.textContent = op;
      b.id = `qopt-${idx}`;
      b.onclick = () => {
        [...box.children].forEach(c => { c.disabled = true; });
        if (idx === q.a) {
          b.classList.add('correct');
          score++;
          fb.textContent = '✓ Correct!';
          fb.className = 'qz-fb ok';
        } else {
          b.classList.add('wrong');
          box.children[q.a].classList.add('correct');
          fb.textContent = `✗  ${q.options[q.a]}`;
          fb.className = 'qz-fb err';
        }
        setTimeout(() => { i++; i < qs.length ? show() : finish(); }, 1100);
      };
      box.appendChild(b);
    });
  }

  function finish() {
    if (timer) { clearInterval(timer); timer = null; }
    const pct = Math.round((score / qs.length) * 100);
    container.innerHTML = `
      <div class="qz-end">
        <div class="qz-big"><b>${score}</b> / ${qs.length}</div>
        <div class="qz-pct">${pct}%</div>
        <div class="qz-msg">${msgFor(pct)}</div>
        <div class="btnrow">
          <button class="btn primary" id="ag-btn">Try again</button>
          ${opts.back ? `<button class="btn" id="bk-btn">← Back</button>` : ''}
        </div>
      </div>`;
    container.querySelector('#ag-btn').onclick = () => {
      i = 0; score = 0;
      if (opts.time) timeLeft = opts.time;
      show();
    };
    if (opts.back) container.querySelector('#bk-btn').onclick = () => opts.back();
    if (opts.onDone) opts.onDone(score, qs.length);
  }

  if (opts.time) {
    timer = setInterval(() => {
      timeLeft--;
      const el = container.querySelector('#tm');
      if (el) el.textContent = '⏱ ' + fmtTime(timeLeft);
      if (timeLeft <= 0) finish();
    }, 1000);
  }

  show();
}
