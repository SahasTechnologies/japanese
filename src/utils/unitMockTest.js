/**
 * Coursework Unit Mock Test — a paper-style writing drill built from
 * mockParts.json, part by part:
 *
 *   Word rows        — one point per scored cell. Hiragana cells are typed
 *                      (rōmaji → kana live); kanji cells are drawn freehand
 *                      in their own box and self-marked ✓ / ✗ against the
 *                      revealed character.
 *   Bunpou Check     — translate the English sentence into Japanese using the
 *                      same cells; each sentence is worth 3 marks (like the
 *                      real test), awarded proportionally to cells got right.
 *
 * Cells in the data are ordered segments of the answer:
 *   { "kana": "…" }          typed kana (auto-checked)
 *   { "kanji": "字", "read": "…" }  drawn kanji (self-checked; reading hint + furigana)
 *   { "fixed": "…" }         shown as-is, never scored
 *
 * Units without a mockParts entry fall back to auto rows from their vocab pool.
 */
import * as wanakana from 'wanakana';
import { mountFreehandBox } from './freehand.js';
import { unitVocabPool } from './courseworkPool.js';
import mockPartsData from '../data/mockParts.json' with { type: 'json' };

const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const hasKata = s => [...String(s)].some(ch => /[\u30a0-\u30ff]/.test(ch));
const clean = s => String(s || '').trim().replace(/\s+/g, '');

/** Per-part configs from mockParts.json, or auto rows from the unit vocab pool. */
function partsForUnit(u) {
  const cfg = mockPartsData.UNITS && mockPartsData.UNITS[String(u.id)];
  if (cfg && Array.isArray(cfg.parts) && cfg.parts.length) {
    return cfg.parts.map(p => ({
      name: p.name || 'Part',
      words: p.words || [],
      bunpou: p.bunpou || [],
    }));
  }
  const pool = unitVocabPool(u);
  const chunks = [];
  for (let i = 0; i < pool.length; i += 10) {
    chunks.push({
      name: `Part ${chunks.length + 1}`,
      words: pool.slice(i, i + 10).map(w => {
        const [expr, reading, meaning] = w;
        // fallback: type the whole reading in kana
        return { en: String(meaning || ''), cells: [{ kana: reading || expr }] };
      }),
      bunpou: [],
    });
  }
  return chunks;
}

const cellKind = c => (c && c.kanji ? 'kanji' : c && c.fixed ? 'fixed' : 'kana');
const cellText = c => String(c.kanji ?? c.kana ?? c.fixed ?? '');
const cellRead = c => (c && c.read ? String(c.read) : '');
/** is this cell typed kana or drawn kanji (i.e. scored)? */
const scored = c => cellKind(c) !== 'fixed';

/** ruby-marked model answer assembled from the item's cells + full stop. */
function answerHtml(item) {
  const parts = (item.cells || []).map(c => {
    const kind = cellKind(c);
    if (kind === 'kanji') {
      const r = cellRead(c);
      return r ? `<ruby>${esc(cellText(c))}<rt>${esc(r)}</rt></ruby>` : esc(cellText(c));
    }
    return esc(cellText(c));
  });
  return parts.join('') + '。';
}

/** full kana reading strip of an item (kana cells + kanji readings + fixed). */
function readingHint(item) {
  return (item.cells || []).map(c => {
    if (cellKind(c) === 'kanji') return cellRead(c);
    return cellText(c);
  }).join('');
}

/**
 * Render the unit's mock test as a full-page takeover.
 * @param {object} u - the unit object
 * @param {{onExit: () => void, onDone?: (score:number,total:number)=>void}} opts
 */
export function renderUnitMockTest(u, opts = {}) {
  const main = document.getElementById('main');
  const parts = partsForUnit(u);
  let partIdx = 0;
  const results = []; // per part: { got, total, cells: [{kind, ok|null, expected, value}] }

  if (!parts.length) {
    main.innerHTML = `
      <button class="btn qz-exit-btn" id="umt-exit"><ion-icon name="arrow-back-outline"></ion-icon> ← ${u.title}</button>
      <div class="sec-title" style="margin-top:16px">${u.title} — Mock Test</div>
      <p style="color:var(--ink2)">This unit has no vocabulary yet for a mock test.</p>`;
    document.getElementById('umt-exit').onclick = () => opts.onExit?.();
    return;
  }

  main.innerHTML = `
    <button class="btn qz-exit-btn" id="umt-exit"><ion-icon name="arrow-back-outline"></ion-icon> ← ${u.title}</button>
    <div class="sec-title" style="margin-top:16px">${u.title} — Mock Test</div>
    <div class="sec-sub">Type each word's kana and draw its kanji where one is expected — one point per box. Then do the Bunpou Check sentences (3 marks each, like the real test). Self-checked — no pressure.</div>

    <div class="umt-part-tabs" id="umt-part-tabs"></div>
    <div id="umt-part"></div>

    <div class="btnrow" style="margin:20px 0 40px">
      <button class="btn primary" id="umt-finish">Finish</button>
    </div>`;

  document.getElementById('umt-exit').onclick = () => opts.onExit?.();
  window.scrollTo({ top: 0, behavior: 'instant' });

  const tabs = document.getElementById('umt-part-tabs');
  parts.forEach((p, i) => {
    const tab = document.createElement('button');
    tab.type = 'button';
    tab.className = 'umt-part-tab';
    tab.textContent = p.name;
    tab.onclick = () => { partIdx = i; showPart(); };
    tabs.appendChild(tab);
  });

  function showPart() {
    const p = parts[partIdx];
    const partEl = document.getElementById('umt-part');
    [...tabs.children].forEach((el, i) => el.classList.toggle('active', i === partIdx));

    const wordPoints = p.words.reduce((n, w) => n + w.cells.filter(scored).length, 0);
    const bunpouCount = p.bunpou.length;

    partEl.innerHTML = `
      <div class="umt-part-head">
        <span class="umt-part-name">${esc(p.name)} — words &amp; kanji</span>
        <span class="umt-part-count">${wordPoints} points · ${bunpouCount} Bunpou Check sentence${bunpouCount === 1 ? '' : 's'} (3 marks each)</span>
      </div>
      <div class="card umt-table-card">
        <table class="umt-table">
          <thead><tr><th>English</th><th>Hiragana</th><th>Kanji</th></tr></thead>
          <tbody id="umt-tbody"></tbody>
        </table>
        <div class="btnrow" style="margin-top:16px;justify-content:flex-start">
          <button class="btn primary" id="umt-check"><ion-icon name="checkmark-outline"></ion-icon> Check answers</button>
          <span class="umt-score" id="umt-score"></span>
        </div>
      </div>
      ${p.bunpou.length ? `
        <div class="kg-label" style="margin:26px 0 8px">Bunpou Check — translate each sentence</div>
        <div id="umt-bunpou"></div>` : ''}
      <div id="umt-bunpou-score" class="umt-score" style="margin-top:12px"></div>`;

    // ---------- word table ----------
    const tbody = document.getElementById('umt-tbody');
    const prev = results[partIdx];

    p.words.forEach((w, wi) => {
      const tr = document.createElement('tr');
      const kanaCells = w.cells.filter(c => cellKind(c) === 'kana');
      const kanjiCells = w.cells.filter(c => cellKind(c) === 'kanji');
      const hasFixed = w.cells.some(c => cellKind(c) === 'fixed');
      const hint = kanjiCells.length || hasFixed ? readingHint(w) : '';

      tr.innerHTML = `
        <td class="umt-en">
          <div>${esc(w.en)}${w.typo ? ' <span class="umt-typo">(spelling!)</span>' : ''}</div>
          ${hint ? `<div class="umt-read">${esc(hint)}</div>` : ''}
        </td>
        <td class="umt-hira-col">${kanaColHtml(w, wi)}</td>
        <td class="umt-kanji-col">${kanjiColHtml(w, wi)}</td>`;
      tbody.appendChild(tr);

      // bind typed kana inputs
      w.cells.forEach((c, ci) => {
        if (cellKind(c) !== 'kana') return;
        const input = tbody.querySelector(`.umt-hira-input[data-w="${wi}"][data-c="${ci}"]`);
        if (hasKata(cellText(c))) wanakana.bind(input, { IMEMode: 'toKatakana' });
        else wanakana.bind(input, { IMEMode: true });
      });

      // mount one freehand box per kanji cell
      w.cells.forEach((c, ci) => {
        if (cellKind(c) !== 'kanji') return;
        const mount = tbody.querySelector(`.umt-draw-mount[data-w="${wi}"][data-c="${ci}"]`);
        mountFreehandBox(mount, cellText(c));
      });

      // restore any previous check state for this row
      if (prev) {
        w.cells.forEach((c, ci) => {
          const st = prev.cells[wi] && prev.cells[wi][ci];
          if (!st) return;
          if (cellKind(c) === 'kana') {
            const input = tbody.querySelector(`.umt-hira-input[data-w="${wi}"][data-c="${ci}"]`);
            if (input && st.value != null) input.value = st.value;
          }
          if (st.verdictHtml) {
            const v = tbody.querySelector(`.umt-verdict[data-w="${wi}"][data-c="${ci}"]`);
            if (v) v.innerHTML = st.verdictHtml;
          }
          if (cellKind(c) === 'kanji') {
            const box = tbody.querySelector(`.umt-box[data-w="${wi}"][data-c="${ci}"]`);
            if (box && st.ok != null) {
              box.dataset.mark = st.ok ? 'ok' : 'miss';
              box.querySelectorAll('.umt-mark-btn').forEach(b =>
                b.classList.toggle('chosen', b.dataset.mark === (st.ok ? 'ok' : 'miss')));
            }
          }
        });
      }
    });

    // ---------- kanji self-marking ----------
    tbody.querySelectorAll('.umt-mark-btn').forEach(btn => {
      btn.onclick = () => {
        const box = btn.closest('.umt-box');
        box.dataset.mark = btn.dataset.mark;
        box.querySelectorAll('.umt-mark-btn').forEach(b =>
          b.classList.toggle('chosen', b === btn));
      };
    });

    // ---------- Bunpou Check cards ----------
    const bunpouMount = document.getElementById('umt-bunpou');
    if (bunpouMount) {
      p.bunpou.forEach((item, bi) => {
        const card = document.createElement('div');
        card.className = 'card umt-bunpou-card';
        card.innerHTML = `
          <div class="umt-trans-q"><span class="umt-bunpou-tag">3 marks</span> ${bi + 1}. ${esc(item.en)}</div>
          <div class="umt-bunpou-line" id="ubp-line-${bi}"></div>
          <div class="btnrow" style="margin-top:10px;justify-content:flex-start">
            <button class="btn" data-role="reveal">Show answer</button>
            <span class="umt-score" data-role="marks"></span>
          </div>
          <div class="umt-trans-answer" data-role="answer" style="display:none">${answerHtml(item)}</div>`;
        bunpouMount.appendChild(card);

        const line = card.querySelector(`#ubp-line-${bi}`);
        item.cells.forEach((c, ci) => {
          const kind = cellKind(c);
          const wrap = document.createElement('div');
          wrap.className = 'ubp-cell';
          if (kind === 'fixed') {
            wrap.innerHTML = `<span class="umt-fixed">${esc(cellText(c))}</span>`;
          } else if (kind === 'kanji') {
            wrap.innerHTML = `
              <span class="umt-box-read">${esc(cellRead(c))}</span>
              <span class="ubp-draw-mount"></span>
              <span class="umt-box-marks">
                <button type="button" class="btn umt-mark-btn" data-mark="ok" title="I wrote it correctly"><ion-icon name="checkmark-outline"></ion-icon></button>
                <button type="button" class="btn umt-mark-btn" data-mark="miss" title="I got it wrong"><ion-icon name="close-outline"></ion-icon></button>
              </span>`;
            wrap.dataset.mark = '';
            wrap.dataset.i = bi;
            wrap.dataset.c = ci;
            wrap.classList.add('umt-box');
          } else {
            wrap.innerHTML = `
              <input type="text" class="umt-hira-input ubp-input" autocomplete="off" autocapitalize="off" spellcheck="false"
                placeholder="${hasKata(cellText(c)) ? 'katakana…' : 'hiragana…'}" />
              <span class="umt-verdict"></span>`;
            wrap.dataset.i = bi;
            wrap.dataset.c = ci;
            const input = wrap.querySelector('input');
            if (hasKata(cellText(c))) wanakana.bind(input, { IMEMode: 'toKatakana' });
            else wanakana.bind(input, { IMEMode: true });
          }
          line.appendChild(wrap);
          if (kind === 'kanji') mountFreehandBox(wrap.querySelector('.ubp-draw-mount'), cellText(c));
        });

        card.querySelector('[data-role="reveal"]').onclick = ev => {
          const ans = card.querySelector('[data-role="answer"]');
          const open = ans.style.display !== 'none';
          ans.style.display = open ? 'none' : 'block';
          ev.currentTarget.textContent = open ? 'Show answer' : 'Hide answer';
        };
      });
      bunpouMount.querySelectorAll('.umt-mark-btn').forEach(btn => {
        btn.onclick = () => {
          const box = btn.closest('.umt-box');
          box.dataset.mark = btn.dataset.mark;
          box.querySelectorAll('.umt-mark-btn').forEach(b =>
            b.classList.toggle('chosen', b === btn));
        };
      });

      // restore previous bunpou state
      if (prev) {
        p.bunpou.forEach((item, bi) => {
          item.cells.forEach((c, ci) => {
            const st = prev.bunpou && prev.bunpou[bi] && prev.bunpou[bi][ci];
            if (!st) return;
            if (cellKind(c) === 'kana') {
              const input = bunpouMount.querySelector(`.ubp-cell[data-i="${bi}"][data-c="${ci}"] input`);
              if (input && st.value != null) input.value = st.value;
            }
            if (st.verdictHtml) {
              const v = bunpouMount.querySelector(`.ubp-cell[data-i="${bi}"][data-c="${ci}"] .umt-verdict`);
              if (v) v.innerHTML = st.verdictHtml;
            }
            if (cellKind(c) === 'kanji') {
              const box = bunpouMount.querySelector(`.umt-box[data-i="${bi}"][data-c="${ci}"]`);
              if (box && st.ok != null) {
                box.dataset.mark = st.ok ? 'ok' : 'miss';
                box.querySelectorAll('.umt-mark-btn').forEach(b =>
                  b.classList.toggle('chosen', b.dataset.mark === (st.ok ? 'ok' : 'miss')));
              }
            }
          });
        });
        const cards = bunpouMount.querySelectorAll('.umt-bunpou-card');
        (prev.bunpouMarks || []).forEach((m, bi) => {
          const el = cards[bi] && cards[bi].querySelector('[data-role="marks"]');
          if (el && m != null) el.textContent = m;
        });
      }
    }

    // ---------- Check ----------
    const checkBtn = document.getElementById('umt-check');
    if (checkBtn) checkBtn.onclick = () => checkPart(p, partEl);

    if (prev && prev.wordScore) {
      document.getElementById('umt-score').textContent = prev.wordScore;
    }
    const bScore = document.getElementById('umt-bunpou-score');
    if (bScore && prev && prev.bunpouScore) bScore.textContent = prev.bunpouScore;
  }

  function kanaColHtml(w, wi) {
    const parts = [];
    w.cells.forEach((c, ci) => {
      if (cellKind(c) === 'kanji') return;
      if (cellKind(c) === 'fixed') {
        parts.push(`<span class="umt-fixed">${esc(cellText(c))}</span>`);
        return;
      }
      parts.push(`
        <div class="umt-kana-cell">
          <input type="text" class="umt-hira-input" data-w="${wi}" data-c="${ci}"
            autocomplete="off" autocapitalize="off" spellcheck="false"
            placeholder="${hasKata(cellText(c)) ? 'katakana…' : 'hiragana…'}" />
          <span class="umt-verdict" data-w="${wi}" data-c="${ci}"></span>
        </div>`);
    });
    return parts.length ? parts.join('') : '<span class="umt-na">—</span>';
  }

  function kanjiColHtml(w, wi) {
    const kanjiCells = w.cells.filter(c => cellKind(c) === 'kanji');
    if (!kanjiCells.length) return '<span class="umt-na">—</span>';
    return kanjiCells.map((c, i) => {
      const ci = w.cells.indexOf(c);
      return `
        <div class="umt-box" data-w="${wi}" data-c="${ci}" data-mark="">
          <span class="umt-box-read">${esc(cellRead(c))}</span>
          <span class="umt-draw-mount" data-w="${wi}" data-c="${ci}"></span>
          <span class="umt-box-marks">
            <button type="button" class="btn umt-mark-btn" data-mark="ok" title="I wrote it correctly"><ion-icon name="checkmark-outline"></ion-icon></button>
            <button type="button" class="btn umt-mark-btn" data-mark="miss" title="I got it wrong"><ion-icon name="close-outline"></ion-icon></button>
          </span>
        </div>`;
    }).join('');
  }

  function verdictHtml(ok, expected) {
    return ok
      ? '<ion-icon name="checkmark-circle" style="color:var(--green)"></ion-icon>'
      : `<ion-icon name="close-circle" style="color:var(--red)"></ion-icon> <span class="umt-answer">${esc(expected)}</span>`;
  }

  function checkPart(p, partEl) {
    let wordGot = 0, wordTotal = 0;
    const cellRecs = [];

    // words
    p.words.forEach((w, wi) => {
      const recs = [];
      w.cells.forEach((c, ci) => {
        if (!scored(c)) { recs.push(null); return; }
        wordTotal++;
        if (cellKind(c) === 'kana') {
          const input = partEl.querySelector(`.umt-hira-input[data-w="${wi}"][data-c="${ci}"]`);
          const expected = clean(cellText(c));
          const val = clean(input?.value || '');
          const ok = val === expected || wanakana.toHiragana(val) === expected;
          if (ok) wordGot++;
          const vEl = partEl.querySelector(`.umt-verdict[data-w="${wi}"][data-c="${ci}"]`);
          if (vEl) vEl.innerHTML = verdictHtml(ok, cellText(c));
          recs.push({ ok, value: input?.value || '', verdictHtml: vEl ? vEl.innerHTML : '' });
        } else {
          const box = partEl.querySelector(`.umt-box[data-w="${wi}"][data-c="${ci}"]`);
          const ok = box && box.dataset.mark === 'ok';
          if (ok) wordGot++;
          const vEl = partEl.querySelector(`.umt-verdict[data-w="${wi}"][data-c="${ci}"]`);
          recs.push({ ok: !!ok, verdictHtml: vEl ? vEl.innerHTML : '' });
        }
      });
      cellRecs.push(recs);
    });

    // bunpou
    const bunpouRecs = [];
    const bunpouMarks = [];
    p.bunpou.forEach((item, bi) => {
      const recs = [];
      let got = 0, total = 0;
      item.cells.forEach((c, ci) => {
        if (!scored(c)) { recs.push(null); return; }
        total++;
        if (cellKind(c) === 'kana') {
          const input = partEl.querySelector(`.ubp-cell[data-i="${bi}"][data-c="${ci}"] input`);
          const expected = clean(cellText(c));
          const val = clean(input?.value || '');
          const ok = val === expected || wanakana.toHiragana(val) === expected;
          if (ok) got++;
          const vEl = partEl.querySelector(`.ubp-cell[data-i="${bi}"][data-c="${ci}"] .umt-verdict`);
          if (vEl) vEl.innerHTML = verdictHtml(ok, cellText(c));
          recs.push({ ok, value: input?.value || '', verdictHtml: vEl ? vEl.innerHTML : '' });
        } else {
          const box = partEl.querySelector(`.umt-box[data-i="${bi}"][data-c="${ci}"]`);
          const ok = box && box.dataset.mark === 'ok';
          if (ok) got++;
          recs.push({ ok: !!ok, verdictHtml: '' });
        }
      });
      bunpouRecs.push(recs);
      const marks = total ? Math.round((got / total) * 3 * 10) / 10 : 0;
      bunpouMarks.push(`${marks} / 3`);
    });

    const wordScore = `${wordGot} / ${wordTotal} points`;
    document.getElementById('umt-score').textContent = wordScore;
    const bScoreEl = document.getElementById('umt-bunpou-score');
    if (bScoreEl && bunpouMarks.length) {
      bScoreEl.textContent = `Bunpou Check: ${bunpouMarks.join(' · ')}`;
    }
    // per-card marks
    const cards = partEl.querySelectorAll('.umt-bunpou-card');
    bunpouMarks.forEach((m, bi) => {
      const el = cards[bi] && cards[bi].querySelector('[data-role="marks"]');
      if (el) el.textContent = m;
    });

    results[partIdx] = {
      got: wordGot + bunpouRecs.reduce((a, r) => a + r.filter(Boolean).filter(x => x.ok).length, 0),
      total: wordTotal + bunpouRecs.reduce((a, r) => a + r.filter(Boolean).length, 0),
      cells: cellRecs,
      bunpou: bunpouRecs,
      bunpouMarks,
      wordScore,
      bunpouScore: bScoreEl ? bScoreEl.textContent : '',
    };
  }

  // ---------- Finish ----------
  document.getElementById('umt-finish').onclick = () => {
    if (opts.onDone) {
      const done = results.filter(r => r && r.total > 0);
      if (done.length) {
        const got = done.reduce((a, r) => a + r.got, 0);
        const total = done.reduce((a, r) => a + r.total, 0);
        opts.onDone(got, total);
      }
    }
    opts.onExit?.();
  };

  showPart();
}
