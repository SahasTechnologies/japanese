import { ring } from '../utils/helpers.js';
import { getState } from '../state.js';
import courseworkData from '../data/coursework.json' with { type: 'json' };
const { UNITS } = courseworkData;

const JLPT_ITEMS = [
  { id: 'kana',      icon: 'あ', label: 'Kana',       desc: 'Hiragana & Katakana — charts + drills',   color: 'var(--red)' },
  { id: 'kanji',     icon: '漢', label: 'Kanji',      desc: '103 kanji · stroke order · tracing',     color: 'var(--blue)' },
  { id: 'vocab',     icon: '語', label: 'Vocabulary', desc: '700+ words · kana-only mode · learned tracking', color: 'var(--green)' },
  { id: 'grammar',   icon: '文', label: 'Grammar',    desc: '25 patterns + particle drills',          color: 'var(--gold)' },
  { id: 'writing',   icon: '書', label: 'Writing',    desc: 'Type rōmaji, watch it become kana',       color: 'var(--green)' },
  { id: 'reading',   icon: '読', label: 'Reading',    desc: 'Short passages & comprehension',         color: 'var(--red-deep)' },
  { id: 'listening', icon: '聴', label: 'Listening',  desc: 'Ear training via text-to-speech',        color: 'var(--blue)' },
  { id: 'flash',     icon: '札', label: 'Flashcards', desc: 'Flip cards · Know / Don\'t know piles',  color: 'var(--gold)' },
  { id: 'mock',      icon: '試', label: 'Mock Test',  desc: 'Full multimodal mock (60+ q)',           color: 'var(--red)' },
  { id: 'ref',       icon: '本', label: 'Reference',  desc: 'Numbers, counters, expressions, verbs',  color: 'var(--ink2)' },
];

export function renderHome(navigate) {
  const P = getState();
  const main = document.getElementById('main');
  const isFresh = Object.keys(P.best).length === 0 && P.vocabLearned.length === 0 && (P.kanjiCanRead || []).length === 0;
  const unitsWithContent = UNITS.filter(u => u.kanji.length || u.qaSections.length || u.vocabSections.length || u.grammarPractice.length);

  main.innerHTML = `
    <div class="sec-title">Japanese Study Dashboard</div>
    <div class="sec-sub">JLPT N5 pass needs ≥80/180 overall and ≥19 in each section. Aim for 80%+ on every module — plus your own class coursework below.</div>

    ${isFresh ? `
      <div class="card" style="margin-bottom:20px;border-color:var(--red)">
        <div style="display:flex;gap:14px;align-items:flex-start;flex-wrap:wrap">
          <div style="font-size:26px">検</div>
          <div style="flex:1;min-width:200px">
            <div style="font:700 16px var(--sans);margin-bottom:4px">New here? Take the placement test</div>
            <div style="font-size:13.5px;color:var(--ink2)">If you already know some Japanese, a quick diagnostic will mark words and kanji you know so you're not starting from zero.</div>
          </div>
          <button class="btn primary" id="pt-cta">Take placement test →</button>
        </div>
      </div>` : ''}

    <div class="kg-label">Coursework</div>
    <div class="dash" style="margin-bottom:28px">
      <div class="card dash-card">
        <div class="dash-top">
          ${ring(0, 'var(--red)')}
          <div>
            <div class="dash-name"><span class="dash-ic">級</span> My Coursework</div>
            <div class="dash-desc">${unitsWithContent.length} unit${unitsWithContent.length === 1 ? '' : 's'} ready — kanji, sentences, grammar &amp; vocab from class</div>
          </div>
        </div>
        <button class="btn primary dash-cta" id="cw-cta">Open coursework →</button>
      </div>
    </div>

    <div class="kg-label">JLPT N5</div>
    <div class="dash" id="dash"></div>`;

  const dash = document.getElementById('dash');
  JLPT_ITEMS.forEach(({ id, icon, label, desc, color }) => {
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

  document.getElementById('cw-cta').onclick = () => navigate('coursework');
  const ptCta = document.getElementById('pt-cta');
  if (ptCta) ptCta.onclick = () => navigate('placement');
}
