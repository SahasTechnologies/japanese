import { quiz } from './quiz.js';

/**
 * Take over the entire #main content area with a quiz, so it's never squeezed
 * beneath leftover page chrome. Exits back to whatever the caller wants via
 * a back button pinned to the top-left.
 *
 * @param {Array} questions
 * @param {{
 *   onExit: () => void,
 *   onDone?: (score:number, total:number) => void,
 *   time?: number, rate?: number, backLabel?: string
 * }} opts
 */
export function runFullQuiz(questions, opts = {}) {
  const main = document.getElementById('main');
  main.innerHTML = `
    <button class="btn qz-exit-btn" id="qz-exit"><ion-icon name="arrow-back-outline"></ion-icon> ${opts.backLabel || 'Back'}</button>
    <div id="qz-full-area" style="margin-top:16px"></div>`;
  window.scrollTo({ top: 0, behavior: 'instant' });

  const exit = () => { if (opts.onExit) opts.onExit(); };
  document.getElementById('qz-exit').onclick = exit;

  quiz(document.getElementById('qz-full-area'), questions, { ...opts, back: exit });
}
