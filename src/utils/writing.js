/**
 * Reusable "writing practice" widget — Duolingo-style typing practice.
 *
 * As the user types romaji, the input live-converts to hiragana (or katakana
 * for loanwords) using wanakana, mimicking a Japanese IME. The typed answer is
 * accepted if it matches the expected kana reading OR the expected kanji form
 * (useful if the person's own OS IME converts to kanji, or they paste kanji in).
 *
 * Note: a true kanji-producing IME needs a dictionary/conversion engine that
 * isn't available client-side, so this widget's own auto-conversion only goes
 * as far as kana — but it still accepts a correctly typed kanji answer.
 */
import * as wanakana from 'wanakana';
import { speak } from './tts.js';
import { shuffle } from './helpers.js';

/**
 * @param {HTMLElement} container
 * @param {Array<[expr, reading, meaning]>} words - vocab-style triples
 * @param {Object} opts - { onDone?: (score,total)=>void, back?: ()=>void, title?: string }
 */
export function writingPractice(container, words, opts = {}) {
  const pool = shuffle(words.filter(w => w[1])).slice(0, Math.min(15, words.length));
  if (!pool.length) {
    container.innerHTML = '<p style="color:var(--ink2);padding:16px">No words available for writing practice.</p>';
    return;
  }

  let i = 0, score = 0;

  function isKatakanaWord(reading) {
    return [...reading].some(ch => /[\u30a0-\u30ff]/.test(ch));
  }

  function show() {
    const w = pool[i];
    const [expr, reading, meaning] = w;
    const useKata = isKatakanaWord(reading);

    container.innerHTML = `
      <div class="wp-head">
        <span>Word ${i + 1} / ${pool.length}</span>
        <span>Score <b>${score}</b></span>
      </div>
      <div class="wp-bar"><i style="width:${(i / pool.length) * 100}%"></i></div>
      <div class="wp-card">
        <div class="wp-prompt">${meaning}</div>
        <div class="wp-hint">Type in rōmaji — it converts to ${useKata ? 'katakana' : 'hiragana'} as you go. Kanji is also accepted if your keyboard produces it.</div>
        <div class="wp-input-wrap">
          <input type="text" id="wp-input" class="wp-input" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="${useKata ? 'katakana word…' : 'type here…'}" />
          <button class="btn icon-btn" id="wp-speak" title="Listen"><ion-icon name="volume-high-outline"></ion-icon></button>
        </div>
        <div class="btnrow" style="margin-top:12px;justify-content:flex-start">
          <button class="btn primary" id="wp-check">Check</button>
          <button class="btn" id="wp-skip">Skip</button>
        </div>
        <div class="wp-fb" id="wp-fb"></div>
      </div>`;

    const input = document.getElementById('wp-input');
    if (useKata) wanakana.bind(input, { IMEMode: 'toKatakana' });
    else wanakana.bind(input, { IMEMode: true });
    input.focus();

    document.getElementById('wp-speak').onclick = () => speak(expr);

    const fb = document.getElementById('wp-fb');
    function check() {
      const val = input.value.trim();
      const okKana = val === reading;
      const okKanji = expr !== reading && val === expr;
      const okNoSpace = wanakana.toHiragana(val.replace(/\s+/g, '')) === reading;
      const ok = okKana || okKanji || okNoSpace;
      input.disabled = true;
      document.getElementById('wp-check').disabled = true;
      document.getElementById('wp-skip').disabled = true;
      if (ok) {
        score++;
        fb.innerHTML = `<ion-icon name="checkmark-circle"></ion-icon> Correct! <span class="wp-answer">${expr}${expr !== reading ? ` (${reading})` : ''}</span>`;
        fb.className = 'wp-fb ok';
      } else {
        fb.innerHTML = `<ion-icon name="close-circle"></ion-icon> Answer: <span class="wp-answer">${expr}${expr !== reading ? ` (${reading})` : ''}</span>`;
        fb.className = 'wp-fb err';
      }
      setTimeout(() => { i++; i < pool.length ? show() : finish(); }, 1300);
    }

    document.getElementById('wp-check').onclick = check;
    document.getElementById('wp-skip').onclick = () => {
      input.disabled = true;
      fb.innerHTML = `<ion-icon name="close-circle"></ion-icon> Answer: <span class="wp-answer">${expr}${expr !== reading ? ` (${reading})` : ''}</span>`;
      fb.className = 'wp-fb err';
      setTimeout(() => { i++; i < pool.length ? show() : finish(); }, 1000);
    };
    input.addEventListener('keydown', e => {
      if (e.key === 'Enter') { e.preventDefault(); check(); }
    });
  }

  function finish() {
    const pct = Math.round((score / pool.length) * 100);
    container.innerHTML = `
      <div class="qz-end">
        <div class="qz-big"><b>${score}</b> / ${pool.length}</div>
        <div class="qz-pct">${pct}%</div>
        <div class="btnrow">
          <button class="btn primary" id="wp-again">Try again</button>
          ${opts.back ? `<button class="btn" id="wp-back">← Back</button>` : ''}
        </div>
      </div>`;
    document.getElementById('wp-again').onclick = () => { i = 0; score = 0; show(); };
    if (opts.back) document.getElementById('wp-back').onclick = () => opts.back();
    if (opts.onDone) opts.onDone(score, pool.length);
  }

  show();
}
