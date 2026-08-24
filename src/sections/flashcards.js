/**
 * Flashcard trainer — flip cards, sort into Know / Don't know piles.
 */
import kana from '../data/kana.json' with { type: 'json' };
import kanjiData from '../data/kanji.json' with { type: 'json' };
import VOCAB from '../data/vocab.json' with { type: 'json' };
const { HIRA, KATA } = kana;
const { KANJI } = kanjiData;
const ALLVOCAB = Object.values(VOCAB).flat();
import { shuffle } from '../utils/helpers.js';
import { speakWithBtn } from '../utils/tts.js';
import { getState, save, formatVocabWord } from '../state.js';

const DECKS = {
  vocab: {
    label: 'Vocabulary',
    build: () => ALLVOCAB.map(w => ({
      front: `<span class="fc-jp">${formatVocabWord(w[0], w[1])}</span>`,
      back: `<span class="fc-en">${w[2]}</span><div class="fc-sub">${w[1]}</div>`,
      speak: w[0],
      key: w[0],
    })),
  },
  kanji: {
    label: 'Kanji',
    build: () => KANJI.map(k => ({
      front: `<span class="fc-jp big">${k[0]}</span>`,
      back: `<span class="fc-en">${k[3]}</span>
             <div class="fc-sub">ON ${k[1] || '–'} · KUN ${k[2] || '–'}</div>`,
      speak: k[0],
      key: k[0],
    })),
  },
  hira: {
    label: 'Hiragana',
    build: () => HIRA.map(([ch, r]) => ({
      front: `<span class="fc-jp big">${ch}</span>`,
      back: `<span class="fc-en mono">${r}</span>`,
      speak: ch,
      key: ch,
    })),
  },
  kata: {
    label: 'Katakana',
    build: () => KATA.map(([ch, r]) => ({
      front: `<span class="fc-jp big">${ch}</span>`,
      back: `<span class="fc-en mono">${r}</span>`,
      speak: ch,
      key: ch,
    })),
  },
};

let deckId = 'vocab';
let cards = [];
let idx = 0;
let flipped = false;
let know = [];
let dont = [];
let mode = 'study'; // study | review

function persistPiles() {
  const S = getState();
  if (!S.flashPiles) S.flashPiles = {};
  S.flashPiles[deckId] = { know: know.map(c => c.key), dont: dont.map(c => c.key) };
  save();
}

function loadPiles(built) {
  const S = getState();
  const saved = (S.flashPiles && S.flashPiles[deckId]) || { know: [], dont: [] };
  const byKey = Object.fromEntries(built.map(c => [c.key, c]));
  know = saved.know.map(k => byKey[k]).filter(Boolean);
  dont = saved.dont.map(k => byKey[k]).filter(Boolean);
  const used = new Set([...saved.know, ...saved.dont]);
  return shuffle(built.filter(c => !used.has(c.key)));
}

export function renderFlashcards() {
  mode = 'study';
  const main = document.getElementById('main');
  main.innerHTML = `
    <div class="sec-title">Flashcards</div>
    <div class="sec-sub">Flip a card, then sort into <b>Know</b> or <b>Don't know</b>. Keys: ↑/↓ flip · ← don't know · → know.</div>
    <div class="btnrow" style="justify-content:flex-start;flex-wrap:wrap;margin-bottom:14px" id="deck-tabs"></div>
    <div id="fc-area"></div>`;

  const tabs = document.getElementById('deck-tabs');
  Object.entries(DECKS).forEach(([id, d]) => {
    const b = document.createElement('button');
    b.className = 'btn' + (id === deckId ? ' red' : '');
    b.dataset.deck = id;
    b.textContent = d.label;
    b.onclick = () => { deckId = id; startDeck(); };
    tabs.appendChild(b);
  });

  startDeck();
}

function startDeck() {
  // Update deck tab highlight
  document.querySelectorAll('#deck-tabs .btn').forEach(b => {
    const id = b.dataset.deck;
    b.className = 'btn' + (id === deckId ? ' red' : '');
  });
  const built = DECKS[deckId].build();
  cards = loadPiles(built);
  idx = 0;
  flipped = false;
  renderCard();
}

function renderCard() {
  const area = document.getElementById('fc-area');
  if (!area) return;

  if (mode === 'review' && cards.length === 0) {
    area.innerHTML = `
      <div class="card fc-done">
        <p>Don't-know pile is empty. Great work!</p>
        <button class="btn primary" id="fc-back-study">Back to study</button>
      </div>`;
    document.getElementById('fc-back-study').onclick = () => { mode = 'study'; startDeck(); };
    return;
  }

  if (mode === 'study' && cards.length === 0 && idx >= cards.length) {
    area.innerHTML = `
      <div class="card fc-done">
        <h3 style="margin-bottom:8px">Deck finished</h3>
        <p>Know: <b>${know.length}</b> · Don't know: <b>${dont.length}</b></p>
        <div class="btnrow" style="margin-top:16px;justify-content:center">
          <button class="btn primary" id="fc-review" ${dont.length ? '' : 'disabled'}>
            <ion-icon name="refresh-outline"></ion-icon> Review Don't-know (${dont.length})
          </button>
          <button class="btn" id="fc-reset">
            <ion-icon name="shuffle-outline"></ion-icon> Shuffle & restart
          </button>
        </div>
      </div>`;
    const rev = document.getElementById('fc-review');
    if (rev && !rev.disabled) {
      rev.onclick = () => {
        mode = 'review';
        cards = shuffle(dont.slice());
        dont = [];
        idx = 0;
        flipped = false;
        persistPiles();
        renderCard();
      };
    }
    document.getElementById('fc-reset').onclick = () => {
      know = []; dont = [];
      persistPiles();
      startDeck();
    };
    return;
  }

  if (idx >= cards.length) {
    // finished current run
    cards = [];
    renderCard();
    return;
  }

  const c = cards[idx];
  area.innerHTML = `
    <div class="fc-stats">
      <span>Card ${idx + 1} / ${cards.length}</span>
      <span class="fc-pile-ok"><ion-icon name="checkmark-circle-outline"></ion-icon> ${know.length}</span>
      <span class="fc-pile-no"><ion-icon name="close-circle-outline"></ion-icon> ${dont.length}</span>
    </div>
    <div class="fc-card ${flipped ? 'flipped' : ''}" id="fc-card" role="button" tabindex="0" aria-label="Flip card">
      <div class="fc-face fc-front">${c.front}</div>
      <div class="fc-face fc-back">${c.back}</div>
    </div>
    <div class="btnrow" style="margin-top:16px;justify-content:center;flex-wrap:wrap">
      ${c.speak ? `<button class="btn" id="fc-speak"><ion-icon name="volume-high-outline"></ion-icon> Listen</button>` : ''}
      <button class="btn" id="fc-flip"><ion-icon name="sync-outline"></ion-icon> Flip</button>
      <button class="btn primary" id="fc-know" ${flipped ? '' : 'disabled'}>
        <ion-icon name="checkmark-outline"></ion-icon> Know
      </button>
      <button class="btn red" id="fc-dont" ${flipped ? '' : 'disabled'}>
        <ion-icon name="close-outline"></ion-icon> Don't know
      </button>
    </div>`;

  const cardEl = document.getElementById('fc-card');
  const flip = () => {
    flipped = !flipped;
    cardEl.classList.toggle('flipped', flipped);
    const knowBtn = document.getElementById('fc-know');
    const dontBtn = document.getElementById('fc-dont');
    if (knowBtn) knowBtn.disabled = !flipped;
    if (dontBtn) dontBtn.disabled = !flipped;
  };
  cardEl.onclick = flip;
  cardEl.onkeydown = e => { if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); flip(); } };
  document.getElementById('fc-flip').onclick = flip;

  if (c.speak) {
    document.getElementById('fc-speak').onclick = () => speakWithBtn(c.speak, document.getElementById('fc-speak'));
  }

  document.getElementById('fc-know').onclick = () => {
    if (!flipped) return;
    know.push(c);
    idx++;
    flipped = false;
    persistPiles();
    renderCard();
  };
  document.getElementById('fc-dont').onclick = () => {
    if (!flipped) return;
    dont.push(c);
    idx++;
    flipped = false;
    persistPiles();
    renderCard();
  };

  // Keyboard: ← don't know, → know, ↑/↓ flip
  const onKey = (e) => {
    if (e.target.matches('input, textarea')) return;
    if (e.key === 'ArrowUp' || e.key === 'ArrowDown' || e.key === ' ') {
      e.preventDefault();
      flip();
    } else if (e.key === 'ArrowRight') {
      e.preventDefault();
      if (flipped) document.getElementById('fc-know')?.click();
      else flip();
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      if (flipped) document.getElementById('fc-dont')?.click();
      else flip();
    }
  };
  window.__fcKeyHandler && window.removeEventListener('keydown', window.__fcKeyHandler);
  window.__fcKeyHandler = onKey;
  window.addEventListener('keydown', onKey);
}
