import { ring } from '../utils/helpers.js';
import { getState } from '../state.js';
import { fetchWordOfTheDay } from '../utils/wotd.js';
import { speak } from '../utils/tts.js';
import courseworkData from '../data/coursework.json' with { type: 'json' };
import { openUnit } from './coursework.js';
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
  { id: 'placement', icon: '検', label: 'Placement Test', desc: 'Optional diagnostic to mark what you know', color: 'var(--gold)' },
  { id: 'ref',       icon: '本', label: 'Reference',  desc: 'Numbers, counters, expressions, verbs',  color: 'var(--ink2)' },
];

function tileHtml({ id, icon, label, desc, color, pct }) {
  return `
    <div class="card dash-card">
      <div class="dash-top">
        ${ring(pct, color)}
        <div>
          <div class="dash-name"><span class="dash-ic">${icon}</span> ${label}</div>
          <div class="dash-desc">${desc}</div>
        </div>
      </div>
      <button class="btn primary dash-cta" data-id="${id}">Start studying →</button>
    </div>`;
}

export function renderHome(navigate) {
  const P = getState();
  const main = document.getElementById('main');
  const isFresh = Object.keys(P.best).length === 0 && P.vocabLearned.length === 0 && (P.kanjiCanRead || []).length === 0;

  main.innerHTML = `
    <div class="sec-title">Japanese Study Dashboard</div>
    <div class="sec-sub">Class coursework first, then the JLPT N5 syllabus. Aim for 80%+ on every module — N5 pass needs ≥80/180 overall and ≥19 in each section.</div>

    <div id="wotd-mount"></div>

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

    <details class="collapsible" open>
      <summary>
        <span class="collapsible-title"><span class="dash-ic">級</span> Coursework</span>
        <ion-icon name="chevron-down-outline" class="collapsible-caret"></ion-icon>
      </summary>
      <div class="dash" id="dash-coursework"></div>
    </details>

    <details class="collapsible" open>
      <summary>
        <span class="collapsible-title"><span class="dash-ic">日</span> JLPT N5</span>
        <ion-icon name="chevron-down-outline" class="collapsible-caret"></ion-icon>
      </summary>
      <div class="dash" id="dash-jlpt"></div>
    </details>`;

  const dashJlpt = document.getElementById('dash-jlpt');
  JLPT_ITEMS.forEach(item => {
    const el = document.createElement('div');
    el.innerHTML = tileHtml({ ...item, pct: P.best[item.id] || 0 });
    const card = el.firstElementChild;
    card.querySelector('.dash-cta').addEventListener('click', () => navigate(item.id));
    dashJlpt.appendChild(card);
  });

  const dashCw = document.getElementById('dash-coursework');
  const unitsWithContent = UNITS.filter(u =>
    u.kanji.length || u.qaSections.length || (u.vocabSections || []).length || (u.grammarPractice || []).length);
  if (!unitsWithContent.length) {
    dashCw.innerHTML = `<p style="color:var(--ink2);font-size:13.5px;grid-column:1/-1">No coursework units have been added yet.</p>`;
  }
  unitsWithContent.forEach(u => {
    const el = document.createElement('div');
    el.innerHTML = tileHtml({
      id: 'coursework',
      icon: String(u.id),
      label: u.title,
      desc: u.subtitle,
      color: 'var(--red)',
      pct: P.best['coursework-' + u.id] || 0,
    });
    const card = el.firstElementChild;
    card.querySelector('.dash-cta').addEventListener('click', () => { openUnit(u.id); navigate('coursework'); });
    dashCw.appendChild(card);
  });

  const ptCta = document.getElementById('pt-cta');
  if (ptCta) ptCta.onclick = () => navigate('placement');

  mountWordOfTheDay();
}

function wotdSkeletonHtml() {
  return `
    <div class="card wotd-card" id="wotd-card">
      <div class="wotd-head"><ion-icon name="calendar-outline"></ion-icon> Japanese Word of the Day</div>
      <div class="wotd-loading">Fetching today's word…</div>
    </div>`;
}

function wotdContentHtml(d) {
  if (!d) {
    return `
      <div class="card wotd-card" id="wotd-card">
        <div class="wotd-head"><ion-icon name="calendar-outline"></ion-icon> Japanese Word of the Day</div>
        <div class="wotd-loading">Couldn't reach the word-of-the-day service right now — try again later.</div>
      </div>`;
  }
  return `
    <div class="card wotd-card" id="wotd-card">
      <div class="wotd-head"><ion-icon name="calendar-outline"></ion-icon> Japanese Word of the Day</div>
      <div class="wotd-main">
        <div class="wotd-word">
          <span class="wotd-kanji">${d.word}</span>
          <button class="btn icon-btn" id="wotd-speak" title="Listen"><ion-icon name="volume-high-outline"></ion-icon></button>
        </div>
        <div class="wotd-kana">${d.kana}${d.romaji ? ` <span class="wotd-romaji">(${d.romaji})</span>` : ''}</div>
        <div class="wotd-eng">${d.english}${d.pos ? ` <span class="wotd-pos">${d.pos}</span>` : ''}</div>
      </div>
      ${d.example ? `
        <div class="wotd-example">
          <div class="wotd-ex-jp">
            <span>${d.example.jp}</span>
            ${d.example.audio ? `<button class="btn icon-btn" id="wotd-ex-speak" title="Listen"><ion-icon name="volume-high-outline"></ion-icon></button>` : ''}
          </div>
          <div class="wotd-ex-kana">${d.example.kana}</div>
          <div class="wotd-ex-en">${d.example.en}</div>
        </div>` : ''}
    </div>`;
}

async function mountWordOfTheDay() {
  const mount = document.getElementById('wotd-mount');
  if (!mount) return;
  mount.innerHTML = wotdSkeletonHtml();
  const data = await fetchWordOfTheDay();
  if (!document.getElementById('wotd-mount')) return;
  mount.innerHTML = wotdContentHtml(data);
  const speakBtn = document.getElementById('wotd-speak');
  if (speakBtn && data) speakBtn.onclick = () => speak(data.audio || data.word);
  const exBtn = document.getElementById('wotd-ex-speak');
  if (exBtn && data?.example) exBtn.onclick = () => speak(data.example.audio || data.example.jp);
}
