/**
 * Sentence-building drill — the JLPT "sentence composition" style.
 *
 * A Japanese sentence is split into tokens (particles + word chunks), shown
 * scrambled with furigana; the user taps them in the right order. Works with
 * mouse and touch. After a miss the correct token glints; the English hint is
 * always visible.
 */
import { furigana } from './furigana.js';
import { speakWithBtn } from './tts.js';
import { shuffle } from './helpers.js';

const PARTICLES = ['は', 'が', 'を', 'に', 'で', 'と', 'も', 'へ', 'の', 'か', 'ね', 'よ', 'し'];
const MULTI_PARTICLES = ['から', 'まで', 'より', 'ので'];

/** Split a sentence into chunk + particle tokens (JLPT ★ style). */
export function tokenize(jp) {
  const chars = [...String(jp).replace(/[。、．\s]/g, '')];
  const tokens = [];
  let buf = '';
  for (let i = 0; i < chars.length; i++) {
    const ch = chars[i];
    const two = ch + (chars[i + 1] || '');
    if (MULTI_PARTICLES.includes(two)) {
      if (buf) { tokens.push(buf); buf = ''; }
      tokens.push(two);
      i++;
      continue;
    }
    if (PARTICLES.includes(ch) && !'ゃゅょぁぃぅぇぉ'.includes(chars[i + 1] || '')) {
      if (buf) { tokens.push(buf); buf = ''; }
      tokens.push(ch);
      continue;
    }
    buf += ch;
  }
  if (buf) tokens.push(buf);

  // merge stray tails: tokens starting with a small kana / ー, or a single
  // hiragana that isn't a particle (e.g. the す of です) join the previous chunk
  const merged = [];
  for (const t of tokens) {
    if (merged.length &&
        (['ゃ', 'ゅ', 'ょ', 'ー'].includes(t[0]) ||
         (t.length === 1 && /[\u3040-\u309f]/.test(t) && !PARTICLES.includes(t) && !MULTI_PARTICLES.includes(t)))) {
      merged[merged.length - 1] += t;
    } else {
      merged.push(t);
    }
  }
  return merged.filter(t => t.length);
}

/**
 * Run an interactive drill over `items` ([{ jp, en }]) inside `container`.
 * Sentences with 3–8 tokens are used; others are skipped.
 */
export function runSentenceDrill(container, items, opts = {}) {
  const deck = shuffle(items)
    .map(it => ({ ...it, tokens: tokenize(it.jp) }))
    .filter(it => it.tokens.length >= 3 && it.tokens.length <= 8)
    .slice(0, opts.limit || 10);

  if (!deck.length) {
    container.innerHTML = '<p style="color:var(--ink2);padding:16px">Not enough suitable sentences for the builder yet.</p>';
    return;
  }

  let i = 0, score = 0, built = [], wrongOnce = false;

  function esc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;'); }

  function show() {
    if (i >= deck.length) return finish();
    const item = deck[i];
    built = [];
    wrongOnce = false;
    const scrambled = shuffle(item.tokens.map((t, idx) => ({ t, key: idx })));

    container.innerHTML = `
      <div class="sb-card card">
        <div class="sb-head"><span>Sentence ${i + 1} / ${deck.length}</span><span>Score <b>${score}</b></span></div>
        <div class="sb-hint">${esc(item.en || '')}</div>
        <div class="sb-answer" id="sb-answer"></div>
        <div class="sb-tokens" id="sb-tokens"></div>
        <div class="btnrow" style="margin-top:12px;justify-content:flex-start">
          <button class="btn" id="sb-undo"><ion-icon name="arrow-undo-outline"></ion-icon> Undo</button>
          <button class="btn" id="sb-reset"><ion-icon name="refresh-outline"></ion-icon> Clear</button>
          <button class="btn primary" id="sb-check"><ion-icon name="checkmark-outline"></ion-icon> Check</button>
          <button class="btn icon-btn" id="sb-speak" title="Listen"><ion-icon name="volume-high-outline"></ion-icon></button>
        </div>
        <div class="sb-fb" id="sb-fb"></div>
      </div>`;

    const answerEl = document.getElementById('sb-answer');
    const tokensEl = document.getElementById('sb-tokens');
    const fb = document.getElementById('sb-fb');

    const used = new Set();
    function renderTokens() {
      tokensEl.innerHTML = '';
      scrambled.forEach(({ t, key }) => {
        const b = document.createElement('button');
        b.className = 'sb-token';
        b.dataset.key = key;
        b.innerHTML = furigana(t);
        if (used.has(key)) b.classList.add('used');
        b.onclick = () => {
          if (used.has(key)) return;
          used.add(key);
          built.push({ t, key });
          renderTokens();
          renderAnswer();
        };
        tokensEl.appendChild(b);
      });
    }
    function renderAnswer() {
      answerEl.innerHTML = built.length
        ? built.map(b => `<span class="sb-chunk">${furigana(b.t)}</span>`).join('')
        : '<span class="sb-empty">Tap the pieces in order…</span>';
    }
    function undo() {
      const last = built.pop();
      if (last) used.delete(last.key);
      renderTokens();
      renderAnswer();
    }
    function reset() {
      built = [];
      used.clear();
      renderTokens();
      renderAnswer();
    }

    renderTokens();
    renderAnswer();
    document.getElementById('sb-undo').onclick = undo;
    document.getElementById('sb-reset').onclick = reset;
    document.getElementById('sb-speak').onclick = e => speakWithBtn(item.jp, e.currentTarget);
    document.getElementById('sb-check').onclick = () => {
      const attempt = built.map(b => b.t).join('');
      if (attempt === item.jp.replace(/[。、．\s]/g, '')) {
        if (!wrongOnce) score++;
        fb.innerHTML = '<ion-icon name="checkmark-circle"></ion-icon> Correct!';
        fb.className = 'sb-fb ok';
        [...tokensEl.children].forEach(t => (t.disabled = true));
        document.getElementById('sb-check').disabled = true;
        setTimeout(() => { i++; show(); }, 900);
      } else {
        wrongOnce = true;
        fb.innerHTML = 'Not quite — check the order and the particles.';
        fb.className = 'sb-fb err';
        container.querySelector('.sb-card').classList.remove('shake');
        void container.querySelector('.sb-card').offsetWidth;
        container.querySelector('.sb-card').classList.add('shake');
        // glint the next expected token
        const expected = item.tokens[built.length];
        [...tokensEl.children].forEach(t => {
          if (t.dataset.key !== undefined && scrambled.find(s => String(s.key) === t.dataset.key)?.t === expected) {
            t.classList.add('glint');
            setTimeout(() => t.classList.remove('glint'), 1200);
          }
        });
      }
    };
  }

  function finish() {
    container.innerHTML = `
      <div class="qz-end">
        <div class="qz-big"><b>${score}</b> / ${deck.length}</div>
        <div class="qz-msg">${score === deck.length ? '全部正解！ Perfect.' : 'Keep building!'}</div>
        <div class="btnrow">
          <button class="btn primary" id="sb-again">Try again</button>
          ${opts.onExit ? `<button class="btn" id="sb-exit">${opts.backLabel || '← Back'}</button>` : ''}
        </div>
      </div>`;
    document.getElementById('sb-again').onclick = () => runSentenceDrill(container, items, opts);
    if (opts.onExit) document.getElementById('sb-exit').onclick = () => opts.onExit();
  }

  show();
}
