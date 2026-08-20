import * as wanakana from 'wanakana';
import kanjiData from '../data/kanji.json' with { type: 'json' };
const { KANJI } = kanjiData;
const kanjiByGlyph = {};
KANJI.forEach(k => { kanjiByGlyph[k[0]] = k; });

import { shuffle } from './helpers.js';
import { mountFreehandBox } from './freehand.js';
import { unitVocabPool } from './courseworkPool.js';

/** Collect {en, jp} translation pairs the unit actually teaches, for the free-response section */
function unitTranslationPool(u) {
  const pool = [];
  (u.kanji || []).forEach(k => (k.sentences || []).forEach(s => {
    if (s.en && s.kanji) pool.push({ en: s.en, jp: s.kanji });
  }));
  (u.phraseChevrons || []).forEach(sec => (sec.groups || []).forEach(g => (g.items || []).forEach(it => {
    if (it.en && it.jp) pool.push({ en: it.en, jp: it.jp });
  })));
  (u.grammarPractice || []).forEach(gp => {
    ['example', 'example2'].forEach(key => {
      const ex = gp[key];
      if (!ex) return;
      ['q', 'a', 'a1', 'a2'].forEach(k => {
        if (ex[k] && ex[k].en && ex[k].jp) pool.push({ en: ex[k].en, jp: ex[k].jp });
      });
    });
  });
  (u.qaSections || []).forEach(sec => (sec.pairs || []).forEach(p => {
    if (p.q.en && p.q.jp) pool.push({ en: p.q.en, jp: p.q.jp });
    if (p.a.en && p.a.jp) pool.push({ en: p.a.en, jp: p.a.jp });
  }));
  // Dedupe by english text, keep sentences (not bare fragments) preferentially
  const seen = new Set();
  return pool.filter(p => {
    const key = p.en.trim().toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function isKatakanaWord(reading) {
  return [...reading].some(ch => /[\u30a0-\u30ff]/.test(ch));
}

function hasKanjiForm(word) {
  const [expr, reading] = word;
  if (expr === reading) return false;
  return [...expr].some(ch => /[\u4e00-\u9faf]/.test(ch));
}

/**
 * Render the unit's mock test as a full-page takeover.
 * @param {object} u - the unit object
 * @param {{onExit: () => void, onDone?: (score:number,total:number)=>void}} opts
 */
export function renderUnitMockTest(u, opts = {}) {
  const main = document.getElementById('main');
  const pool = unitVocabPool(u);
  const rows = shuffle(pool).slice(0, Math.min(20, pool.length));
  const translations = shuffle(unitTranslationPool(u)).slice(0, 3);

  main.innerHTML = `
    <button class="btn qz-exit-btn" id="umt-exit"><ion-icon name="arrow-back-outline"></ion-icon> ← ${u.title}</button>
    <div class="sec-title" style="margin-top:16px">${u.title} — Mock Test</div>
    <div class="sec-sub">Fill in the hiragana reading for each word, and draw the kanji where one exists. Then answer three translation questions. This is self-checked — no pressure.</div>

    <div class="card umt-table-card">
      <table class="umt-table">
        <thead>
          <tr><th>English</th><th>Hiragana</th><th>Kanji</th></tr>
        </thead>
        <tbody id="umt-tbody"></tbody>
      </table>
      <div class="btnrow" style="margin-top:16px;justify-content:flex-start">
        <button class="btn primary" id="umt-check">Check hiragana answers</button>
      </div>
      <div class="umt-score" id="umt-score"></div>
    </div>

    <div class="kg-label">Translation — English to Japanese</div>
    <div id="umt-translations"></div>

    <div class="btnrow" style="margin:24px 0 40px">
      <button class="btn primary" id="umt-finish">Finish</button>
    </div>`;

  document.getElementById('umt-exit').onclick = () => opts.onExit?.();
  window.scrollTo({ top: 0, behavior: 'instant' });

  // ---- Table rows ----
  const tbody = document.getElementById('umt-tbody');
  rows.forEach((w, i) => {
    const [expr, reading, meaning] = w;
    const kanjiApplicable = hasKanjiForm(w);
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td class="umt-en">${meaning}</td>
      <td>
        <input type="text" class="umt-hira-input" data-idx="${i}" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="${isKatakanaWord(reading) ? 'katakana…' : 'hiragana…'}" />
        <span class="umt-verdict" data-idx="${i}"></span>
      </td>
      <td>
        ${kanjiApplicable
          ? `<button class="btn umt-draw-btn" data-idx="${i}"><ion-icon name="brush-outline"></ion-icon> Draw</button>`
          : `<span class="umt-na">—</span>`}
        <div class="umt-draw-mount" data-idx="${i}" style="display:none"></div>
      </td>`;
    tbody.appendChild(tr);

    const input = tr.querySelector('.umt-hira-input');
    if (isKatakanaWord(reading)) wanakana.bind(input, { IMEMode: 'toKatakana' });
    else wanakana.bind(input, { IMEMode: true });

    const drawBtn = tr.querySelector('.umt-draw-btn');
    if (drawBtn) {
      drawBtn.onclick = () => {
        const mount = tr.querySelector('.umt-draw-mount');
        const open = mount.style.display !== 'none';
        mount.style.display = open ? 'none' : 'block';
        if (!open && !mount.dataset.mounted) {
          mountFreehandBox(mount, expr);
          mount.dataset.mounted = '1';
        }
      };
    }
  });

  document.getElementById('umt-check').onclick = () => {
    let correct = 0;
    rows.forEach((w, i) => {
      const [, reading] = w;
      const input = tbody.querySelector(`.umt-hira-input[data-idx="${i}"]`);
      const verdict = tbody.querySelector(`.umt-verdict[data-idx="${i}"]`);
      const val = input.value.trim();
      const ok = val === reading || wanakana.toHiragana(val.replace(/\s+/g, '')) === reading;
      if (ok) {
        correct++;
        verdict.innerHTML = '<ion-icon name="checkmark-circle" style="color:var(--green)"></ion-icon>';
      } else {
        verdict.innerHTML = `<ion-icon name="close-circle" style="color:var(--red)"></ion-icon> <span class="umt-answer">${reading}</span>`;
      }
    });
    document.getElementById('umt-score').textContent = `${correct} / ${rows.length} correct`;
  };

  // ---- Translation questions ----
  const transMount = document.getElementById('umt-translations');
  if (!translations.length) {
    transMount.innerHTML = `<p style="color:var(--ink2);font-size:13.5px">Not enough example sentences in this unit yet for translation questions.</p>`;
  }
  translations.forEach((t, i) => {
    const card = document.createElement('div');
    card.className = 'card umt-trans-card';
    card.innerHTML = `
      <div class="umt-trans-q">${i + 1}. ${t.en}</div>
      <textarea class="umt-trans-input" rows="2" placeholder="日本語で書いてください…"></textarea>
      <div class="btnrow" style="margin-top:8px;justify-content:flex-start">
        <button class="btn" data-role="reveal">Show answer</button>
      </div>
      <div class="umt-trans-answer" data-role="answer" style="display:none">${t.jp}</div>`;
    transMount.appendChild(card);
    card.querySelector('[data-role="reveal"]').onclick = () => {
      const ans = card.querySelector('[data-role="answer"]');
      ans.style.display = ans.style.display === 'none' ? 'block' : 'none';
    };
  });

  document.getElementById('umt-finish').onclick = () => {
    if (opts.onDone) {
      const scoreEl = document.getElementById('umt-score');
      const m = scoreEl.textContent.match(/(\d+) \/ (\d+)/);
      if (m) opts.onDone(+m[1], +m[2]);
    }
    opts.onExit?.();
  };
}
