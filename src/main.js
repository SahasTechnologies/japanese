import './style.css';
import { getState, resetState } from './state.js';
import { renderHome } from './sections/home.js';
import { renderKana } from './sections/kana.js';
import { renderKanji } from './sections/kanji.js';
import { renderVocab } from './sections/vocab.js';
import { renderGrammar } from './sections/grammar.js';
import { renderReading } from './sections/reading.js';
import { renderListening } from './sections/listening.js';
import { renderMock } from './sections/mock.js';
import { renderRef } from './sections/reference.js';

const TABS = [
  { id: 'home',      ic: '家', label: 'Home' },
  { id: 'kana',      ic: 'あ', label: 'Kana' },
  { id: 'kanji',     ic: '漢', label: 'Kanji' },
  { id: 'vocab',     ic: '語', label: 'Vocabulary' },
  { id: 'grammar',   ic: '文', label: 'Grammar' },
  { id: 'reading',   ic: '読', label: 'Reading' },
  { id: 'listening', ic: '聴', label: 'Listening' },
  { id: 'mock',      ic: '試', label: 'Mock Test' },
  { id: 'ref',       ic: '本', label: 'Reference' },
];

let curTab = 'home';

const routes = {
  home: () => renderHome(navigateTo),
  kana: renderKana,
  kanji: renderKanji,
  vocab: renderVocab,
  grammar: renderGrammar,
  reading: renderReading,
  listening: renderListening,
  mock: renderMock,
  ref: renderRef,
};

export function navigateTo(tabId) {
  if (routes[tabId]) {
    curTab = tabId;
    renderNav();
    route();
  }
}

function renderNav() {
  const nav = document.getElementById('nav');
  nav.innerHTML = '';
  TABS.forEach(t => {
    const btn = document.createElement('button');
    btn.className = 'tab' + (t.id === curTab ? ' on' : '');
    btn.innerHTML = `<span class="ic">${t.ic}</span>${t.label}`;
    btn.onclick = () => navigateTo(t.id);
    nav.appendChild(btn);
  });
}

function updateMasteredCount() {
  const P = getState();
  const vals = Object.values(P.best);
  const mastered = vals.reduce((sum, v) => sum + (v >= 80 ? 1 : 0), 0);
  const el = document.getElementById('mastered');
  if (el) el.textContent = mastered;
}

function route() {
  window.scrollTo({ top: 0, behavior: 'instant' });
  const render = routes[curTab] || routes.home;
  render();
  updateMasteredCount();
}

// Reset button handler
const resetBtn = document.getElementById('resetBtn');
if (resetBtn) {
  resetBtn.onclick = () => {
    if (window.confirm('Reset all your JLPT N5 study progress?')) {
      resetState();
      route();
    }
  };
}

// Global update trigger for submodules when progress changes
window.addEventListener('storage', updateMasteredCount);

// Initialize app
renderNav();
route();
