import './style.css';
import { getState, resetState, setKanjiReadMap } from './state.js';
import kanjiData from './data/kanji.json' with { type: 'json' };
import VOCAB from './data/vocab.json' with { type: 'json' };
import grammar from './data/grammar.json' with { type: 'json' };
import { renderHome } from './sections/home.js';
import { renderKana } from './sections/kana.js';
import { renderKanji } from './sections/kanji.js';
import { renderVocab } from './sections/vocab.js';
import { renderGrammar } from './sections/grammar.js';
import { renderReading } from './sections/reading.js';
import { renderListening } from './sections/listening.js';
import { renderMock } from './sections/mock.js';
import { renderRef } from './sections/reference.js';
import { renderFlashcards } from './sections/flashcards.js';
import { renderCoursework } from './sections/coursework.js';
import { renderWriting } from './sections/writing.js';
import { renderPlacement } from './sections/placement.js';

const { KANJI } = kanjiData;
const { GRAMMAR } = grammar;
const ALLVOCAB = Object.values(VOCAB).flat();

let curTab = 'home';

const routes = {
  home: () => renderHome(navigateTo),
  kana: renderKana,
  kanji: renderKanji,
  vocab: renderVocab,
  grammar: renderGrammar,
  writing: renderWriting,
  reading: renderReading,
  listening: renderListening,
  flash: renderFlashcards,
  mock: renderMock,
  placement: () => renderPlacement(navigateTo),
  coursework: () => renderCoursework(navigateTo),
  ref: () => renderRef(navigateTo),
};

export function navigateTo(tabId) {
  if (routes[tabId]) {
    curTab = tabId;
    route();
  }
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

// Logo → always returns Home
const logoBtn = document.getElementById('logoHome');
if (logoBtn) logoBtn.onclick = () => navigateTo('home');

// Reset button handler
const resetBtn = document.getElementById('resetBtn');
if (resetBtn) {
  resetBtn.onclick = () => {
    if (window.confirm('Reset all your Japanese study progress (JLPT N5 + Coursework)?')) {
      resetState();
      route();
    }
  };
}

// Dark mode
const THEME_KEY = 'n5-theme';
function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  const icon = document.getElementById('themeIcon');
  if (icon) icon.setAttribute('name', theme === 'dark' ? 'sunny-outline' : 'moon-outline');
}
function initTheme() {
  const saved = localStorage.getItem(THEME_KEY);
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  const theme = saved || (prefersDark ? 'dark' : 'light');
  applyTheme(theme);
}
const themeBtn = document.getElementById('themeBtn');
if (themeBtn) {
  themeBtn.onclick = () => {
    const cur = document.documentElement.getAttribute('data-theme') || 'light';
    const next = cur === 'dark' ? 'light' : 'dark';
    localStorage.setItem(THEME_KEY, next);
    applyTheme(next);
  };
}
initTheme();

// Global search
const searchInput = document.getElementById('searchInput');
if (searchInput) {
  let searchTimer = null;
  searchInput.addEventListener('input', () => {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(() => {
      const q = searchInput.value.trim().toLowerCase();
      if (!q) {
        route();
        return;
      }
      const main = document.getElementById('main');
      const hits = [];
      // Kanji
      KANJI.forEach(k => {
        const hay = (k[0] + ' ' + (k[1]||'') + ' ' + (k[2]||'') + ' ' + k[3]).toLowerCase();
        if (hay.includes(q) || k[0].includes(q)) {
          hits.push({ type: 'Kanji', title: k[0] + ' — ' + k[3], meta: `ON ${k[1]||'–'} · KUN ${k[2]||'–'}`, go: () => { navigateTo('kanji'); /* detail would need more state */ } });
        }
      });
      // Vocab
      ALLVOCAB.forEach(w => {
        const hay = (w[0] + ' ' + w[1] + ' ' + w[2]).toLowerCase();
        if (hay.includes(q)) {
          hits.push({ type: 'Vocab', title: w[0] + '（' + w[1] + '）', meta: w[2], go: () => navigateTo('vocab') });
        }
      });
      // Grammar
      GRAMMAR.forEach(g => {
        const hay = (g.t + ' ' + g.p + ' ' + g.e).toLowerCase();
        if (hay.includes(q)) {
          hits.push({ type: 'Grammar', title: g.t, meta: g.p, go: () => navigateTo('grammar') });
        }
      });
      main.innerHTML = `
        <div class="sec-title">Search results</div>
        <div class="sec-sub">${hits.length} match${hits.length === 1 ? '' : 'es'} for “${q.replace(/"/g,'')}”</div>
        <div class="search-results" id="sr"></div>`;
      const sr = document.getElementById('sr');
      if (!hits.length) {
        sr.innerHTML = '<p style="color:var(--ink2);padding:12px">No matches. Try a different keyword.</p>';
      } else {
        hits.slice(0, 80).forEach(h => {
          const el = document.createElement('div');
          el.className = 'search-hit';
          el.innerHTML = `<div class="sh-title">${h.title}</div><div class="sh-meta">${h.type} · ${h.meta}</div>`;
          el.onclick = () => h.go();
          sr.appendChild(el);
        });
      }
    }, 180);
  });
}

// Global update trigger for submodules when progress changes
window.addEventListener('storage', updateMasteredCount);

// Initialize app
route();
