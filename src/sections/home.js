import { ring } from '../utils/helpers.js';
import { getState } from '../state.js';

const ITEMS = [
  { id: 'kana',      icon: 'あ', label: 'Kana',       desc: 'Hiragana & Katakana — charts + drills',   color: 'var(--red)' },
  { id: 'kanji',     icon: '漢', label: 'Kanji',      desc: '103 kanji · stroke order · tracing',     color: 'var(--blue)' },
  { id: 'vocab',     icon: '語', label: 'Vocabulary', desc: '700+ N5 words · kana-only mode · learned tracking',             color: 'var(--green)' },
  { id: 'grammar',   icon: '文', label: 'Grammar',    desc: '25 patterns + particle drills',          color: 'var(--gold)' },
  { id: 'reading',   icon: '読', label: 'Reading',    desc: 'Short passages & comprehension',         color: 'var(--red-deep)' },
  { id: 'listening', icon: '聴', label: 'Listening',  desc: 'Ear training via text-to-speech',        color: 'var(--blue)' },
  { id: 'flash',     icon: '札', label: 'Flashcards', desc: 'Flip cards · Know / Don\'t know piles',  color: 'var(--gold)' },
  { id: 'mock',      icon: '試', label: 'Mock Test',  desc: 'Full multimodal mock (60+ q)',           color: 'var(--red)' },
  { id: 'ref',       icon: '本', label: 'Reference',  desc: 'Numbers, counters, expressions, verbs',  color: 'var(--ink2)' },
];

export function renderHome(navigate) {
  const P = getState();
  const main = document.getElementById('main');
  main.innerHTML = `
    <div class="sec-title">JLPT N5 Dashboard</div>
    <div class="sec-sub">Pass needs ≥80/180 overall and ≥19 in each section. Aim for 80%+ on every module.</div>
    <div class="dash" id="dash"></div>`;

  const dash = document.getElementById('dash');
  ITEMS.forEach(({ id, icon, label, desc, color }) => {
    const pct = P.best[id] || 0;
    const card = document.createElement('div');
    card.className = 'card dash-card';
    card.innerHTML = `
      <div class="dash-top">
        ${ring(pct, color)}
        <div>
          <div class="dash-name"><span class="dash-ic">${icon}</span> ${label}</div>
          <div class="dash-desc">${desc}</div>
        </div>
      </div>
      <button class="btn primary dash-cta" data-id="${id}">Start studying →</button>`;
    card.querySelector('.dash-cta').addEventListener('click', () => navigate(id));
    dash.appendChild(card);
  });
}
