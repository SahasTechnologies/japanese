import courseworkData from '../data/coursework.json' with { type: 'json' };
import kanjiData from '../data/kanji.json' with { type: 'json' };
const { UNITS } = courseworkData;
const { KANJI, RADICALS } = kanjiData;
import { speak } from '../utils/tts.js';
import { shuffle } from '../utils/helpers.js';
import { writingPractice } from '../utils/writing.js';
import { exampleSentences } from './vocab.js';
import { updateBest, getState, toggleCourseworkLearned } from '../state.js';
import { mountKanjiPractice } from './kanji.js';
import { runFullQuiz } from '../utils/fullQuiz.js';
import { unitHasContent, unitVocabPool } from '../utils/courseworkPool.js';
import { renderUnitMockTest } from '../utils/unitMockTest.js';

const kanjiByGlyph = {};
KANJI.forEach(k => { kanjiByGlyph[k[0]] = k; });

let selUnit = null;
let navigate = null; // set by renderCoursework(navigate)
let openVocabWord = null; // [expr, reading, meaning] currently expanded, coursework vocab

/** Allow Home (or anywhere) to jump straight to a specific unit */
export function openUnit(id) {
  selUnit = UNITS.find(u => u.id === id) || null;
  openVocabWord = null;
}

export function renderCoursework(nav) {
  if (nav) navigate = nav;
  if (selUnit === null) renderUnitList();
  else renderUnitDetail();
}

function unitQuizQuestions(u, n = 10) {
  const pool = unitVocabPool(u);
  const picks = shuffle(pool).slice(0, Math.min(n, pool.length));
  return picks.map(w => {
    const correct = w[2];
    const distractors = shuffle(pool.filter(x => x[2] !== correct)).slice(0, 3).map(x => x[2]);
    const options = shuffle([correct, ...distractors]);
    return {
      q: `<span class="big-kana">${esc(w[0])}</span><div style="font-size:14px;color:var(--ink2);margin-top:6px">${esc(w[1])}</div>`,
      options, a: options.indexOf(correct),
    };
  });
}

function renderUnitList() {
  const main = document.getElementById('main');
  main.innerHTML = `
    <div class="sec-title">Coursework</div>
    <div class="sec-sub">Your class units, 1–12 — kanji, sentence examples, grammar Q&amp;A, vocabulary, quizzes and writing practice for each.</div>
    <div class="cw-unit-grid" id="cwug"></div>`;

  const grid = document.getElementById('cwug');
  UNITS.forEach(u => {
    const has = unitHasContent(u);
    const tile = document.createElement('button');
    tile.type = 'button';
    tile.className = 'cw-unit-tile' + (has ? '' : ' empty');
    tile.innerHTML = `
      <div class="cw-unit-num">${u.id}</div>
      <div class="cw-unit-title">${esc(u.title)}</div>
      <div class="cw-unit-sub">${esc(u.subtitle)}</div>`;
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

/** A 3-segment chevron/arrow row: kanji → kana → english (styled after the reference images) */
function chevRow(jp, kana, en, speakText) {
  return `
    <div class="chev-row">
      <div class="chev chev-a">${esc(jp)}</div>
      <div class="chev chev-b">${esc(kana)}</div>
      <div class="chev chev-c">${esc(en)}</div>
      ${speakText ? `<button class="btn v-speaker cw-speak" data-say="${esc(speakText)}" title="Listen" aria-label="Listen"><ion-icon name="volume-high-outline"></ion-icon></button>` : ''}
    </div>`;
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
        ${entry.sentences.map(s => chevRow(s.kanji, s.kana, s.en, s.kanji)).join('')}
      </div>
      <h4 class="cw-vocablist-title">Practice writing this kanji</h4>
      <div class="cw-kanji-practice" data-glyph="${esc(k[0])}"></div>
    </div>`;
}

function phraseChevronsHtml(sec) {
  return `
    <div class="card cw-phrase-card">
      <h3 class="ref-heading">${esc(sec.title)}</h3>
      ${sec.groups.map(g => `
        <div class="cw-phrase-group">
          <div class="cw-phrase-label">${esc(g.label)}</div>
          ${g.items.map(it => chevRow(it.jp, it.kana, it.en, it.jp)).join('')}
        </div>`).join('')}
    </div>`;
}

/** Wrap content in the same expandable accordion card used on the Grammar page, for a consistent feel */
function accordionWrap(title, subtitle, innerHtml) {
  return `
    <div class="gcard cw-gcard">
      <div class="gcard-header" role="button" tabindex="0" aria-expanded="false">
        <h4>${esc(title)} ${subtitle ? `<span class="pat">${esc(subtitle)}</span>` : ''}</h4>
        <span class="gcaret">›</span>
      </div>
      <div class="gcard-body">${innerHtml}</div>
    </div>`;
}

function qaCardHtml(sec) {
  const inner = `
    ${sec.note ? `<p class="cw-note">${esc(sec.note)}</p>` : ''}
    ${sec.pairs.map(p => `
      <div class="cw-qa-pair">
        <div class="cw-qa-line q"><span class="cw-qa-tag">Q</span><span class="cw-qa-jp">${boldify(p.q.jp, p.q.bold)}</span></div>
        <div class="cw-qa-en">${esc(p.q.en)}</div>
        <div class="cw-qa-line a"><span class="cw-qa-tag">A</span><span class="cw-qa-jp">${boldify(p.a.jp, p.a.bold)}</span></div>
        <div class="cw-qa-en">${esc(p.a.en)}</div>
      </div>`).join('')}`;
  return accordionWrap(sec.title, sec.note ? '' : '', inner);
}

function vocabCardsHtml(sec) {
  const P = getState();
  return `
    <div class="cw-vocab-card card">
      <h3 class="ref-heading">${esc(sec.title)}</h3>
      <div class="vlist cw-vlist">
        ${sec.words.map(w => vocabCardHtml(w, P)).join('')}
      </div>
    </div>`;
}

function vocabCardHtml(w, P) {
  const learned = (P.courseworkLearned || []).includes(w[0]);
  const isOpen = openVocabWord && openVocabWord[0] === w[0] && openVocabWord[1] === w[1];
  let detail = '';
  if (isOpen) {
    const exs = exampleSentences(w[0], w[1], w[2]);
    detail = `
      <div class="v-detail">
        <div class="v-examples">
          <div class="v-ex-title">Example sentences</div>
          ${exs.map(ex => `
            <div class="v-ex">
              <div class="v-ex-jp">${esc(ex.jp)}</div>
              <div class="v-ex-en">${esc(ex.en)}</div>
              <button class="btn v-ex-speak" data-say="${esc(ex.jp)}" title="Listen">
                <ion-icon name="volume-high-outline"></ion-icon>
              </button>
            </div>`).join('')}
        </div>
      </div>`;
  }
  return `
    <div class="vcard cw-vcard${learned ? ' learned' : ''}${isOpen ? ' open' : ''}" data-expr="${esc(w[0])}" data-reading="${esc(w[1])}">
      <div class="vcard-top">
        <span class="w">${esc(w[0])}${w[0] !== w[1] ? `<span class="cw-vcard-reading">（${esc(w[1])}）</span>` : ''}</span>
        <span class="v-speaker" title="Listen"><ion-icon name="volume-high-outline"></ion-icon></span>
      </div>
      <div class="m">${esc(w[2])}</div>
      ${detail}
      <div class="vcard-actions">
        <button class="btn v-learn ${learned ? 'red' : ''}">
          ${learned ? '<ion-icon name="checkmark-circle"></ion-icon> Learned' : 'Mark learned'}
        </button>
        <button class="btn v-more">${isOpen ? 'Hide examples' : 'Examples'}</button>
      </div>
    </div>`;
}

function genericTableHtml(t) {
  return `
    <div class="cw-pattern-wrap" style="margin-top:12px">
      <table class="reftable">
        <thead><tr>${t.headers.map(h => `<th>${esc(h)}</th>`).join('')}</tr></thead>
        <tbody>${t.rows.map(r => `<tr>${r.map(c => `<td>${esc(c)}</td>`).join('')}</tr>`).join('')}</tbody>
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

function qaExampleHtml(ex) {
  if (!ex) return '';
  const qTag = ex.qTag || 'Q';
  const aTag = ex.aTag || 'A';
  let html = `<div class="cw-qa-pair">
    <div class="cw-qa-line q"><span class="cw-qa-tag">${esc(qTag)}</span><span class="cw-qa-jp">${boldify(ex.q.jp, ex.q.bold)}</span></div>
    <div class="cw-qa-en">${esc(ex.q.en)}</div>`;
  ['a', 'a1', 'a2'].forEach(key => {
    if (!ex[key]) return;
    const tag = key === 'a1' ? 'A1' : key === 'a2' ? 'A2' : aTag;
    html += `
      <div class="cw-qa-line a"><span class="cw-qa-tag">${esc(tag)}</span><span class="cw-qa-jp">${boldify(ex[key].jp, ex[key].bold)}</span></div>
      <div class="cw-qa-en">${esc(ex[key].en)}</div>`;
  });
  html += `</div>`;
  return html;
}

function grammarPracticeHtml(gp) {
  let html = '';
  if (gp.note) html += `<p class="cw-note">${esc(gp.note)}</p>`;

  html += qaExampleHtml(gp.example);
  html += qaExampleHtml(gp.example2);

  if (gp.pattern) html += `<div class="cw-pattern-wrap">${patternTableHtml(gp.pattern)}</div>`;
  if (gp.table) html += genericTableHtml(gp.table);

  if (gp.drills && gp.drills.length) {
    html += `<div class="cw-drills">
      ${gp.drills.map(d => `<div class="cw-drill-row">${d.map(esc).join('<span class="cw-arrow">→</span>')}</div>`).join('')}
    </div>`;
  }

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

  if (gp.vocabList) {
    html += `
      <h4 class="cw-vocablist-title">${esc(gp.vocabList.title)}</h4>
      <div class="cw-vocablist-grid">
        ${gp.vocabList.words.map(w => `<div class="cw-vocablist-item">${esc(w[0])}<span class="cw-vocablist-en">${esc(w[2])}</span></div>`).join('')}
      </div>
      ${gp.vocabList.footnote ? `<p class="cw-footnote">${esc(gp.vocabList.footnote)}</p>` : ''}`;
  }

  return accordionWrap(gp.title, '', html);
}

function grammarNoteHtml(note) {
  const inner = `
    ${note.paragraphs.map(p => `<p class="cw-note" style="margin-bottom:8px">${esc(p)}</p>`).join('')}
    ${(note.examples || []).map(ex => `
      <div class="cw-drill-row" style="margin-bottom:6px">
        <span>${esc(ex.jp)}</span>
        <span class="cw-note-en">${esc(ex.en)}</span>
      </div>`).join('')}`;
  return accordionWrap(note.title, '', inner);
}

function renderUnitDetail() {
  const u = selUnit;
  const main = document.getElementById('main');
  const hasContent = unitHasContent(u);
  const pool = hasContent ? unitVocabPool(u) : [];

  let html = `
    <button class="btn" id="cw-back">← Home</button>
    <div class="sec-title" style="margin-top:14px">${esc(u.title)}</div>
    <div class="sec-sub">${esc(u.subtitle)}</div>`;

  if (!hasContent) {
    html += `<div class="card" style="text-align:center;padding:40px 20px;color:var(--ink2)">
      This unit hasn't been filled in yet. Share its kanji, sentences, grammar and vocabulary
      and it'll appear here in the same style as the other units.
    </div>`;
  } else {
    if (pool.length >= 4) {
      html += `<div class="btnrow" style="justify-content:flex-start;margin-bottom:18px;flex-wrap:wrap">
        <button class="btn primary" id="cw-quiz-btn"><ion-icon name="help-circle-outline"></ion-icon> Quiz this unit</button>
        <button class="btn" id="cw-flash-btn"><ion-icon name="albums-outline"></ion-icon> Flashcards</button>
        <button class="btn" id="cw-write-btn"><ion-icon name="create-outline"></ion-icon> Writing practice</button>
        ${pool.length >= 8 ? `<button class="btn red" id="cw-mock-btn"><ion-icon name="school-outline"></ion-icon> Unit mock test</button>` : ''}
      </div>
      <div id="cw-tool-area" style="margin-bottom:24px"></div>`;
    }

    if (u.kanji.length) {
      html += `<div class="kg-label">Kanji</div>
        <div class="cw-kanji-list">${u.kanji.map(kanjiCardHtml).join('')}</div>`;
    }
    if ((u.phraseChevrons || []).length) {
      html += `<div class="kg-label">Key phrases</div>
        <div class="cw-section-list">${u.phraseChevrons.map(phraseChevronsHtml).join('')}</div>`;
    }
    if ((u.vocabSections || []).length) {
      html += `<div class="kg-label">Vocabulary</div>
        <div class="cw-section-list">${u.vocabSections.map(vocabCardsHtml).join('')}</div>`;
    }
    if (u.qaSections.length || (u.grammarPractice || []).length || (u.grammarNotes || []).length) {
      html += `<div class="kg-label">Grammar</div>
        <div class="glist cw-glist">
          ${u.qaSections.map(qaCardHtml).join('')}
          ${(u.grammarPractice || []).map(grammarPracticeHtml).join('')}
          ${(u.grammarNotes || []).map(grammarNoteHtml).join('')}
        </div>`;
    }
  }

  main.innerHTML = html;

  document.getElementById('cw-back').onclick = () => { if (navigate) navigate('home'); };

  // TTS speaker buttons (chevron rows, vocab cards)
  main.querySelectorAll('.cw-speak, .v-speaker, .v-ex-speak').forEach(btn => {
    btn.onclick = ev => {
      ev.stopPropagation();
      const say = btn.dataset.say || btn.closest('.cw-vcard')?.dataset.expr;
      if (say) speak(say);
    };
  });

  // Inline kanji tracing widgets
  main.querySelectorAll('.cw-kanji-practice').forEach(el => {
    mountKanjiPractice(el, el.dataset.glyph, { mode: 'trace' });
  });

  // Vocab card interactions (learn toggle + expand examples), matching the JLPT Vocabulary page
  main.querySelectorAll('.cw-vcard').forEach(card => {
    const expr = card.dataset.expr, reading = card.dataset.reading;
    const isOpen = openVocabWord && openVocabWord[0] === expr && openVocabWord[1] === reading;
    card.querySelector('.v-learn').onclick = ev => {
      ev.stopPropagation();
      toggleCourseworkLearned(expr);
      renderUnitDetail();
    };
    const moreBtn = card.querySelector('.v-more');
    if (moreBtn) moreBtn.onclick = ev => {
      ev.stopPropagation();
      openVocabWord = isOpen ? null : [expr, reading];
      renderUnitDetail();
    };
    card.onclick = () => {
      openVocabWord = isOpen ? null : [expr, reading];
      renderUnitDetail();
    };
  });

  // Grammar accordion cards — same interaction as the JLPT Grammar page
  main.querySelectorAll('.cw-gcard').forEach(card => {
    const header = card.querySelector('.gcard-header');
    const body = card.querySelector('.gcard-body');
    body.style.display = 'none';
    const toggle = () => {
      const open = body.style.display !== 'none';
      body.style.display = open ? 'none' : 'block';
      header.setAttribute('aria-expanded', String(!open));
      card.querySelector('.gcaret').textContent = open ? '›' : '∨';
    };
    header.onclick = toggle;
    header.onkeydown = e => { if (e.key === 'Enter' || e.key === ' ') toggle(); };
  });

  const toolArea = document.getElementById('cw-tool-area');
  const onDone = (s, t) => updateBest('coursework-' + u.id, s, t);

  const quizBtn = document.getElementById('cw-quiz-btn');
  if (quizBtn) quizBtn.onclick = () =>
    runFullQuiz(unitQuizQuestions(u), { onDone, onExit: renderUnitDetail, backLabel: `← ${u.title}` });

  const flashBtn = document.getElementById('cw-flash-btn');
  if (flashBtn) flashBtn.onclick = () => renderUnitFlashcards(toolArea, pool);

  const writeBtn = document.getElementById('cw-write-btn');
  if (writeBtn) writeBtn.onclick = () => writingPractice(toolArea, pool, { onDone });

  const mockBtn = document.getElementById('cw-mock-btn');
  if (mockBtn) mockBtn.onclick = () =>
    renderUnitMockTest(u, { onDone: (s, t) => updateBest('coursework-mock-' + u.id, s, t), onExit: renderUnitDetail });
}

/** Lightweight flip-card viewer for a unit's vocab pool (reuses the global .fc-card styles). */
function renderUnitFlashcards(container, pool) {
  const cards = shuffle(pool);
  let idx = 0, flipped = false;

  function draw() {
    if (idx >= cards.length) {
      container.innerHTML = `<div class="card fc-done"><p>Deck finished — nice work!</p>
        <button class="btn primary" id="cwf-restart">Shuffle &amp; restart</button></div>`;
      document.getElementById('cwf-restart').onclick = () => { idx = 0; flipped = false; renderUnitFlashcards(container, pool); };
      return;
    }
    const c = cards[idx];
    container.innerHTML = `
      <div class="fc-stats"><span>Card ${idx + 1} / ${cards.length}</span></div>
      <div class="fc-card ${flipped ? 'flipped' : ''}" id="cwf-card" role="button" tabindex="0">
        <div class="fc-face fc-front"><span class="fc-jp">${esc(c[0])}</span></div>
        <div class="fc-face fc-back"><span class="fc-en">${esc(c[2])}</span><div class="fc-sub">${esc(c[1])}</div></div>
      </div>
      <div class="btnrow" style="margin-top:16px;justify-content:center">
        <button class="btn" id="cwf-speak"><ion-icon name="volume-high-outline"></ion-icon> Listen</button>
        <button class="btn" id="cwf-flip"><ion-icon name="sync-outline"></ion-icon> Flip</button>
        <button class="btn primary" id="cwf-next">Next →</button>
      </div>`;
    const flip = () => { flipped = !flipped; document.getElementById('cwf-card').classList.toggle('flipped', flipped); };
    document.getElementById('cwf-card').onclick = flip;
    document.getElementById('cwf-flip').onclick = flip;
    document.getElementById('cwf-speak').onclick = () => speak(c[0]);
    document.getElementById('cwf-next').onclick = () => { idx++; flipped = false; draw(); };
  }
  draw();
}
