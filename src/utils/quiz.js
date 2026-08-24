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
import { HAS_TTS, speak, speakWithBtn } from './tts.js';
import { fmtTime, msgFor } from './helpers.js';

export function quiz(container, qs, opts = {}) {
  if (!qs.length) { container.innerHTML = '<p style="color:var(--ink2);padding:16px">No questions available.</p>'; return; }

  let i = 0, score = 0, timer = null, finished = false;
  let timeLeft = opts.time || 0;

  function startTimer() {
    if (!opts.time) return;
    stopTimer();
    timer = setInterval(() => {
      timeLeft--;
      const el = container.querySelector('#tm');
      if (el) el.innerHTML = `<ion-icon name="timer-outline"></ion-icon> ${fmtTime(timeLeft)}`;
      if (timeLeft <= 0) finish();
    }, 1000);
  }

  function stopTimer() {
    if (timer) { clearInterval(timer); timer = null; }
  }

  function show() {
    if (finished) return;
    const q = qs[i];
    // Support both `options` and legacy `o` keys used in some data files
    let options = (q.options || q.o || []).slice();
    // Much of the shipped data lists the correct answer first — shuffle and
    // recompute the answer index so position never gives it away
    let aIdx = q.a;
    if (options.length > 1) {
      const correct = options[aIdx];
      for (let k = options.length - 1; k > 0; k--) {
        const j = Math.floor(Math.random() * (k + 1));
        [options[k], options[j]] = [options[j], options[k]];
      }
      aIdx = options.indexOf(correct);
    }
    container.innerHTML = `
      <div class="qz">
        ${opts.time ? `<div class="qz-timer" id="tm"><ion-icon name="timer-outline"></ion-icon> ${fmtTime(timeLeft)}</div>` : ''}
        <div class="qz-head">
          <span>Question ${i + 1} / ${qs.length}</span>
          <span>Score <b>${score}</b></span>
        </div>
        <div class="qz-bar"><i id="qbar" style="width:${(i / qs.length) * 100}%"></i></div>
        <div class="qz-q">${q.q}</div>
        ${q.speak && HAS_TTS ? `<div class="btnrow"><button class="btn" id="sp-btn"><ion-icon name="volume-high-outline"></ion-icon> Listen again</button></div>` : ''}
        <div class="qz-opts" id="qopts"></div>
        <div class="qz-fb" id="qfb"></div>
      </div>`;

    const box = container.querySelector('#qopts');
    const fb  = container.querySelector('#qfb');

    if (q.speak && HAS_TTS) {
      speak(q.speak, opts.rate);
      const spBtn = container.querySelector('#sp-btn');
      spBtn.onclick = () => speakWithBtn(q.speak, spBtn, opts.rate);
    }

    options.forEach((op, idx) => {
      const b = document.createElement('button');
      b.className = 'qz-opt';
      // options may carry <ruby> furigana markup built from repo data
      b.innerHTML = op;
      b.id = `qopt-${idx}`;
      b.onclick = () => {
        [...box.children].forEach(c => { c.disabled = true; });
        if (idx === aIdx) {
          b.classList.add('correct');
          score++;
          fb.innerHTML = '<ion-icon name="checkmark-circle"></ion-icon> Correct!';
          fb.className = 'qz-fb ok';
        } else {
          b.classList.add('wrong');
          if (options[aIdx] !== undefined) box.children[aIdx].classList.add('correct');
          fb.innerHTML = `<ion-icon name="close-circle"></ion-icon>  ${options[aIdx]}`;
          fb.className = 'qz-fb err';
        }
        setTimeout(() => {
          if (finished) return;
          i++;
          i < qs.length ? show() : finish();
        }, 1100);
      };
      box.appendChild(b);
    });
  }

  function finish() {
    if (finished) return;
    finished = true;
    stopTimer();
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
      i = 0; score = 0; finished = false;
      if (opts.time) timeLeft = opts.time;
      show();
      startTimer();
    };
    if (opts.back) container.querySelector('#bk-btn').onclick = () => { finished = true; stopTimer(); opts.back(); };
    if (opts.onDone) opts.onDone(score, qs.length);
  }

  show();
  startTimer();
}
