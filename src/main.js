import './style.css';
import { getState } from './state.js';
import { initSettings } from './settings.js';
import kanjiData from './data/kanji.json' with { type: 'json' };
import VOCAB from './data/vocab.json' with { type: 'json' };
import grammar from './data/grammar.json' with { type: 'json' };
import courseworkData from './data/coursework.json' with { type: 'json' };
import { renderHome } from './sections/home.js';
import { renderKana } from './sections/kana.js';
import { renderKanji } from './sections/kanji.js';
import { renderKanji4 } from './sections/kanji-n4.js';
import { renderVocab } from './sections/vocab.js';
import { renderVocab4 } from './sections/vocab-n4.js';
import { renderGrammar } from './sections/grammar.js';
import { renderGrammar4 } from './sections/grammar-n4.js';
import { renderReading } from './sections/reading.js';
import { renderReading4 } from './sections/reading-n4.js';
import { renderListening } from './sections/listening.js';
import { renderListening4 } from './sections/listening-n4.js';
import { renderMock } from './sections/mock.js';
import { renderRef } from './sections/reference.js';
import { renderFlashcards } from './sections/flashcards.js';
import { renderCoursework, openUnit } from './sections/coursework.js';
import { renderWriting } from './sections/writing.js';
import { renderPlacement } from './sections/placement.js';
import kanjiData4 from './data/kanji-n4.json' with { type: 'json' };
import VOCAB4 from './data/vocab-n4.json' with { type: 'json' };
import grammar4 from './data/grammar-n4.json' with { type: 'json' };

const { KANJI } = kanjiData;
const { GRAMMAR } = grammar;
const { UNITS } = courseworkData;
const ALLVOCAB = Object.values(VOCAB).flat();
const { KANJI: KANJI4 } = kanjiData4;
const { GRAMMAR: GRAMMAR4 } = grammar4;
const ALLVOCAB4 = Object.values(VOCAB4).flat();

/* Two-tier navigation. JLPT sub-tabs are split into learning pages and
   testing/practice pages with a divider; Coursework sub-tabs jump straight
   to a unit. */
const JLPT_LEARN = [
  { id: 'kana',    ic: 'あ', label: 'Kana' },
  { id: 'kanji',   ic: '漢', label: 'Kanji' },
  { id: 'vocab',   ic: '語', label: 'Vocabulary' },
  { id: 'grammar', ic: '文', label: 'Grammar' },
  { id: 'writing', ic: '書', label: 'Writing' },
  { id: 'ref',     ic: '本', label: 'Reference' },
];
const JLPT_TEST = [
  { id: 'reading',   ic: '読', label: 'Reading' },
  { id: 'listening', ic: '聴', label: 'Listening' },
  { id: 'flash',     ic: '札', label: 'Flashcards' },
  { id: 'mock',      ic: '試', label: 'Mock Test' },
  { id: 'placement', ic: '検', label: 'Placement' },
];
/* JLPT N4 sub-tabs. Kana, writing practice, mock test, and placement are
   shared/not yet duplicated for N4, so only the N4-specific pages are listed;
   Flashcards and Reference route to the same shared pages (they already
   include N4 decks / cover both levels). */
const JLPT4_LEARN = [
  { id: 'kanji4',   ic: '漢', label: 'Kanji' },
  { id: 'vocab4',   ic: '語', label: 'Vocabulary' },
  { id: 'grammar4', ic: '文', label: 'Grammar' },
  { id: 'ref',      ic: '本', label: 'Reference' },
];
const JLPT4_TEST = [
  { id: 'reading4',   ic: '読', label: 'Reading' },
  { id: 'listening4', ic: '聴', label: 'Listening' },
  { id: 'flash',      ic: '札', label: 'Flashcards' },
];
const GROUPS = [
  { id: 'home', ic: '家', label: 'Home' },
  { id: 'jlpt', ic: '日', label: 'JLPT N5' },
  { id: 'jlpt4', ic: '四', label: 'JLPT N4' },
  { id: 'coursework', ic: '級', label: 'Coursework' },
];
const GROUP_OF = {};
JLPT_LEARN.concat(JLPT_TEST).forEach(t => { GROUP_OF[t.id] = 'jlpt'; });
JLPT4_LEARN.concat(JLPT4_TEST).forEach(t => { if (!GROUP_OF[t.id]) GROUP_OF[t.id] = 'jlpt4'; });

let curTab = 'home';
let curUnitId = null; // which coursework unit is open (nav highlight)

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
  kanji4: renderKanji4,
  vocab4: renderVocab4,
  grammar4: renderGrammar4,
  reading4: renderReading4,
  listening4: renderListening4,
};

export function navigateTo(tabId) {
  if (routes[tabId]) {
    curTab = tabId;
    renderNav();
    route();
  }
}

/** Coursework pages call this so the unit switcher highlights the open unit. */
export function setNavUnit(id) {
  if (curUnitId !== id) {
    curUnitId = id;
    renderNav();
  }
}

function goUnit(id) {
  openUnit(id);
  curTab = 'coursework';
  renderNav();
  route();
}

function renderNav() {
  const nav = document.getElementById('nav');
  const navsub = document.getElementById('navsub');
  if (!nav || !navsub) return;

  nav.innerHTML = '';
  GROUPS.forEach(g => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'tab' + (curTab === g.id || (g.id === 'jlpt' && GROUP_OF[curTab] === 'jlpt') || (g.id === 'jlpt4' && GROUP_OF[curTab] === 'jlpt4') ? ' on' : '');
    btn.innerHTML = `<span class="ic">${g.ic}</span>${g.label}`;
    btn.onclick = () => {
      if (g.id === 'jlpt') navigateTo('kana');
      else if (g.id === 'jlpt4') navigateTo('kanji4');
      else if (g.id === 'coursework') goUnit(curUnitId || (UNITS[0] && UNITS[0].id) || 1);
      else navigateTo('home');
    };
    nav.appendChild(btn);
  });

  // Secondary row
  navsub.innerHTML = '';
  if (GROUP_OF[curTab] === 'jlpt' || GROUP_OF[curTab] === 'jlpt4') {
    navsub.style.display = '';
    const mk = (t) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'tab sub' + (curTab === t.id ? ' on' : '');
      btn.innerHTML = `<span class="ic">${t.ic}</span>${t.label}`;
      btn.onclick = () => navigateTo(t.id);
      navsub.appendChild(btn);
    };
    const learnTabs = GROUP_OF[curTab] === 'jlpt4' ? JLPT4_LEARN : JLPT_LEARN;
    const testTabs = GROUP_OF[curTab] === 'jlpt4' ? JLPT4_TEST : JLPT_TEST;
    learnTabs.forEach(mk);
    const div = document.createElement('span');
    div.className = 'nav-div';
    div.setAttribute('role', 'separator');
    div.title = 'Practice & testing';
    navsub.appendChild(div);
    testTabs.forEach(mk);
  } else if (curTab === 'coursework') {
    navsub.style.display = '';
    const all = document.createElement('button');
    all.type = 'button';
    all.className = 'tab sub' + (curUnitId === null ? ' on' : '');
    all.textContent = 'All units';
    all.onclick = () => { openUnit(null); curUnitId = null; renderNav(); route(); };
    navsub.appendChild(all);
    UNITS.forEach(u => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'tab sub' + (curUnitId === u.id ? ' on' : '');
      btn.innerHTML = `<span class="ic">${u.id}</span>${u.title}`;
      btn.onclick = () => goUnit(u.id);
      navsub.appendChild(btn);
    });
  } else {
    navsub.style.display = 'none';
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
  renderNav();
  const render = routes[curTab] || routes.home;
  render();
  updateMasteredCount();
}

const logoBtn = document.getElementById('logoHome');
if (logoBtn) logoBtn.onclick = () => navigateTo('home');

initSettings({ onReset: route });

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
      KANJI.forEach(k => {
        const hay = (k[0] + ' ' + (k[1]||'') + ' ' + (k[2]||'') + ' ' + k[3]).toLowerCase();
        if (hay.includes(q) || k[0].includes(q)) {
          hits.push({ type: 'Kanji · N5', title: k[0] + ' — ' + k[3], meta: `ON ${k[1]||'–'} · KUN ${k[2]||'–'}`, go: () => { navigateTo('kanji'); } });
        }
      });
      KANJI4.forEach(k => {
        const hay = (k[0] + ' ' + (k[1]||'') + ' ' + (k[2]||'') + ' ' + k[3]).toLowerCase();
        if (hay.includes(q) || k[0].includes(q)) {
          hits.push({ type: 'Kanji · N4', title: k[0] + ' — ' + k[3], meta: `ON ${k[1]||'–'} · KUN ${k[2]||'–'}`, go: () => { navigateTo('kanji4'); } });
        }
      });
      ALLVOCAB.forEach(w => {
        const hay = (w[0] + ' ' + w[1] + ' ' + w[2]).toLowerCase();
        if (hay.includes(q)) {
          hits.push({ type: 'Vocab · N5', title: w[0] + '（' + w[1] + '）', meta: w[2], go: () => navigateTo('vocab') });
        }
      });
      ALLVOCAB4.forEach(w => {
        const hay = (w[0] + ' ' + w[1] + ' ' + w[2]).toLowerCase();
        if (hay.includes(q)) {
          hits.push({ type: 'Vocab · N4', title: w[0] + '（' + w[1] + '）', meta: w[2], go: () => navigateTo('vocab4') });
        }
      });
      GRAMMAR.forEach(g => {
        const hay = (g.t + ' ' + g.p + ' ' + g.e).toLowerCase();
        if (hay.includes(q)) {
          hits.push({ type: 'Grammar · N5', title: g.t, meta: g.p, go: () => navigateTo('grammar') });
        }
      });
      GRAMMAR4.forEach(g => {
        const hay = (g.t + ' ' + g.p + ' ' + g.e).toLowerCase();
        if (hay.includes(q)) {
          hits.push({ type: 'Grammar · N4', title: g.t, meta: g.p, go: () => navigateTo('grammar4') });
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

window.addEventListener('storage', updateMasteredCount);

route();
