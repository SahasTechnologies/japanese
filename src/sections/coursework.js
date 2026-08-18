import courseworkData from '../data/coursework.json' with { type: 'json' };
import kanjiData from '../data/kanji.json' with { type: 'json' };
const { UNITS } = courseworkData;
const { KANJI, RADICALS } = kanjiData;
import { speak } from '../utils/tts.js';

const kanjiByGlyph = {};
KANJI.forEach(k => { kanjiByGlyph[k[0]] = k; });

let selUnit = null;

export function renderCoursework() {
  if (selUnit === null) renderUnitList();
  else renderUnitDetail();
}

function unitHasContent(u) {
  return u.kanji.length || u.qaSections.length || u.vocabSections.length || u.grammarPractice.length;
}

function renderUnitList() {
  const main = document.getElementById('main');
  main.innerHTML = `
    <div class="sec-title">Coursework</div>
    <div class="sec-sub">Your class units, 1–12 — kanji, sentence examples, grammar Q&amp;A, and vocabulary for each unit.</div>
    <div class="cw-unit-grid" id="cwug"></div>`;

  const grid = document.getElementById('cwug');
  UNITS.forEach(u => {
    const has = unitHasContent(u);
    const tile = document.createElement('button');
    tile.type = 'button';
    tile.className = 'cw-unit-tile' + (has ? '' : ' empty');
    tile.innerHTML = `
      <div class="cw-unit-num">${u.id}</div>
      <div class="cw-unit-title">${u.title}</div>
      <div class="cw-unit-sub">${u.subtitle}</div>`;
    tile.onclick = () => { selUnit = u; renderCoursework(); window.scrollTo({ top: 0, behavior: 'instant' }); };
    grid.appendChild(tile);
  });
}

function esc(s) {
  return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

/** Bold specific substrings within a Japanese line, e.g. bold: ["何時に"] */
function boldify(jp, bold) {
  if (!bold || !bold.length) return esc(jp);
  let html = esc(jp);
  bold.forEach(b => {
    const escB = esc(b);
    html = html.split(escB).join(`<strong>${escB}</strong>`);
  });
  return html;
}

function kanjiCardHtml(entry) {
  const k = kanjiByGlyph[entry.glyph];
  if (!k) return '';
  const rad = RADICALS[k[4]] || ['—', ''];
  return `
    <div class="cw-kanji-card card">
      <div class="cw-kanji-top">
        <div class="cw-kanji-glyph">${k[0]}</div>
        <div class="cw-kanji-meta">
          <div class="cw-kanji-meaning">${esc(k[3])}</div>
          <div class="cw-kanji-yomi">
            <span class="chip on" title="On-yomi">ON ${esc(k[1] || '–')}</span>
            <span class="chip kun" title="Kun-yomi">KUN ${esc(k[2] || '–')}</span>
          </div>
          <div class="cw-kanji-rad">
            <span class="rad-label">Radical (部首)</span>
            <span class="cw-rad-glyph">${k[4]}</span>
            <span class="cw-rad-name">${rad[0]}</span>
          </div>
        </div>
      </div>
      <div class="cw-sentences">
        ${entry.sentences.map(s => `
          <div class="cw-sentence-row">
            <div class="cw-sentence-jp">
              <span class="cw-sentence-kanji">${esc(s.kanji)}</span>
              <span class="cw-arrow">→</span>
              <span class="cw-sentence-kana">${esc(s.kana)}</span>
              <button class="btn v-speaker cw-speak" data-say="${esc(s.kanji)}" title="Listen" aria-label="Listen">
                <ion-icon name="volume-high-outline"></ion-icon>
              </button>
            </div>
            <div class="cw-sentence-en">${esc(s.en)}</div>
          </div>`).join('')}
      </div>
    </div>`;
}

function qaCardHtml(sec) {
  return `
    <div class="card cw-qa-card">
      <h3 class="ref-heading">${esc(sec.title)}</h3>
      ${sec.note ? `<p class="cw-note">${esc(sec.note)}</p>` : ''}
      ${sec.pairs.map(p => `
        <div class="cw-qa-pair">
          <div class="cw-qa-line q"><span class="cw-qa-tag">Q</span><span class="cw-qa-jp">${boldify(p.q.jp, p.q.bold)}</span></div>
          <div class="cw-qa-en">${esc(p.q.en)}</div>
          <div class="cw-qa-line a"><span class="cw-qa-tag">A</span><span class="cw-qa-jp">${boldify(p.a.jp, p.a.bold)}</span></div>
          <div class="cw-qa-en">${esc(p.a.en)}</div>
        </div>`).join('')}
    </div>`;
}

function vocabTableHtml(sec) {
  return `
    <div class="card cw-vocab-card">
      <h3 class="ref-heading">${esc(sec.title)}</h3>
      <table class="reftable">
        <thead><tr><th>Kanji</th><th>Reading</th><th>Meaning</th></tr></thead>
        <tbody>
          ${sec.words.map(w => `<tr><td>${esc(w[0])}</td><td>${esc(w[1])}</td><td>${esc(w[2])}</td></tr>`).join('')}
        </tbody>
      </table>
    </div>`;
}

function patternTableHtml(pattern) {
  return `
    <table class="cw-pattern-table">
      <tbody>
        ${pattern.rows.map(row => `
          <tr>
            <td class="cw-pat-tag">${esc(row[0])}</td>
            ${row.slice(1).map(cell => `<td>${esc(cell)}</td>`).join('')}
          </tr>`).join('')}
      </tbody>
    </table>`;
}

function grammarPracticeHtml(gp) {
  let html = `<div class="card cw-gp-card">
    <h3 class="ref-heading">${esc(gp.title)}</h3>
    ${gp.note ? `<p class="cw-note">${esc(gp.note)}</p>` : ''}`;

  // Worked example (single q/a, or q/a1/a2)
  const exampleKeys = Object.keys(gp.example || {}).filter(k => k !== 'q');
  if (gp.example) {
    html += `<div class="cw-qa-pair">
      <div class="cw-qa-line q"><span class="cw-qa-tag">Q</span><span class="cw-qa-jp">${boldify(gp.example.q.jp, gp.example.q.bold)}</span></div>
      <div class="cw-qa-en">${esc(gp.example.q.en)}</div>`;
    exampleKeys.forEach(k => {
      const a = gp.example[k];
      const tag = k === 'a1' ? 'A1' : k === 'a2' ? 'A2' : 'A';
      html += `
        <div class="cw-qa-line a"><span class="cw-qa-tag">${tag}</span><span class="cw-qa-jp">${boldify(a.jp, a.bold)}</span></div>
        <div class="cw-qa-en">${esc(a.en)}</div>`;
    });
    html += `</div>`;
  }

  // Pattern table
  if (gp.pattern) {
    html += `<div class="cw-pattern-wrap">${patternTableHtml(gp.pattern)}</div>`;
  }

  // Drills (plain arrow rows)
  if (gp.drills && gp.drills.length) {
    html += `<div class="cw-drills">
      ${gp.drills.map(d => `<div class="cw-drill-row">${d.map(esc).join('<span class="cw-arrow">→</span>')}</div>`).join('')}
    </div>`;
  }

  // Time-word groups (past/present/future)
  if (gp.timeWords) {
    html += `<div class="cw-timewords">
      <div class="cw-timeword-when"><span class="cw-qa-tag">いつ</span> ${esc(gp.timeWords['いつ'])}</div>
      <div class="cw-timeword-groups">
        ${gp.timeWords.groups.map(g => `
          <div class="cw-timeword-group">
            <div class="cw-tw-label">${esc(g.label)}</div>
            ${g.words.map(w => `<div class="cw-tw-row"><span>${esc(w[0])}</span>${w[0] !== w[1] ? `<span class="cw-tw-kana">${esc(w[1])}</span>` : ''}<span class="cw-tw-en">${esc(w[2])}</span></div>`).join('')}
          </div>`).join('')}
      </div>
    </div>`;
  }

  // Vocab list (places, verbs, etc.)
  if (gp.vocabList) {
    html += `
      <h4 class="cw-vocablist-title">${esc(gp.vocabList.title)}</h4>
      <div class="cw-vocablist-grid">
        ${gp.vocabList.words.map(w => `<div class="cw-vocablist-item">${esc(w[0])}<span class="cw-vocablist-en">${esc(w[2])}</span></div>`).join('')}
      </div>
      ${gp.vocabList.footnote ? `<p class="cw-footnote">${esc(gp.vocabList.footnote)}</p>` : ''}`;
  }

  html += `</div>`;
  return html;
}

function renderUnitDetail() {
  const u = selUnit;
  const main = document.getElementById('main');

  let html = `
    <button class="btn" id="cw-back">← All units</button>
    <div class="sec-title" style="margin-top:14px">${esc(u.title)}</div>
    <div class="sec-sub">${esc(u.subtitle)}</div>`;

  if (!unitHasContent(u)) {
    html += `<div class="card" style="text-align:center;padding:40px 20px;color:var(--ink2)">
      This unit hasn't been filled in yet. Ask your assistant to add its kanji, sentences,
      grammar and vocabulary and it'll appear here in the same style as Unit 1.
    </div>`;
  } else {
    if (u.kanji.length) {
      html += `<div class="kg-label">Kanji</div>
        <div class="cw-kanji-list">${u.kanji.map(kanjiCardHtml).join('')}</div>`;
    }
    if (u.qaSections.length) {
      html += `<div class="kg-label">Grammar</div>
        <div class="cw-section-list">${u.qaSections.map(qaCardHtml).join('')}</div>`;
    }
    if (u.vocabSections.length) {
      html += `<div class="kg-label">Vocabulary</div>
        <div class="cw-section-list">${u.vocabSections.map(vocabTableHtml).join('')}</div>`;
    }
    if (u.grammarPractice.length) {
      html += `<div class="kg-label">Grammar practice</div>
        <div class="cw-section-list">${u.grammarPractice.map(grammarPracticeHtml).join('')}</div>`;
    }
  }

  main.innerHTML = html;

  document.getElementById('cw-back').onclick = () => { selUnit = null; renderCoursework(); };
  main.querySelectorAll('.cw-speak').forEach(btn => {
    btn.onclick = ev => { ev.stopPropagation(); speak(btn.dataset.say); };
  });
}
