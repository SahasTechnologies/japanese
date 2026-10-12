/**
 * Coursework Unit Mock Test — a paper-style writing drill built from
 * mockParts.json, part by part:
 *
 *   Word rows        — one point per scored cell. Hiragana cells are typed
 *                      (rōmaji → kana live); kanji cells are drawn freehand
 *                      in their own box and self-marked ✓ / ✗ against the
 *                      revealed character (shown separately beside the box).
 *   Bunpou Check     — translate the English sentence into Japanese: type the
 *                      WHOLE sentence (structure, particles, everything) into
 *                      one box; each sentence is worth 3 marks like the real
 *                      test, awarded proportionally to the kana spelling that
 *                      is right. "Show answer" reveals the model sentence with
 *                      furigana over every kanji.
 *
 * Cells in mockParts data describe the expected answer:
 *   { "kana": "…" }          typed kana (auto-checked)
 *   { "kanji": "字", "read": "…" }  drawn kanji (self-checked, in word rows)
 *   { "fixed": "…" }         part of the expected sentence shown in reveals
 *                            (in Bunpou Check it must still be typed by hand)
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
/** strip spaces/punctuation and fold katakana→hiragana for fair comparisons */
const normKana = s => wanakana.toHiragana(String(s || '')).replace(/[。、．\s]/g, '');

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
const scored = c => cellKind(c) !== 'fixed';

/** ruby-marked model answer assembled from the item's cells + full stop. */
function answerHtml(item) {
  const parts = (item.cells || []).map(c => {
    if (cellKind(c) === 'kanji') {
      const r = cellRead(c);
      return r ? `<ruby>${esc(cellText(c))}<rt>${esc(r)}</rt></ruby>` : esc(cellText(c));
    }
    return esc(cellText(c));
  });
  return parts.join('') + '。';
}

/** the full expected kana spelling of an item (kanji → reading; all text). */
function expectedKana(item) {
  return (item.cells || []).map(c => (cellKind(c) === 'kanji' ? cellRead(c) : cellText(c))).join('');
}

/** full kana reading strip of an item for display hints. */
function readingHint(item) {
  return expectedKana(item);
}

/**
 * Kana input binding (self-contained, stateless). Instead of delegating to
 * wanakana's bind (which garbles typing on textareas by converting
 * keystrokes out of order), this converts every a–z romaji run currently in
 * the field with wanakana.toKana on each input event. Recomputing from the
 * whole current value is idempotent, so it works identically for normal
 * per-keystroke typing, batched/pasted input, and mid-word edits. A lone
 * trailing 'n' is held back (na… still possible); once a non-letter follows
 * it (space, 。…), or more letters arrive, it converts to ん.
 */
function bindKana(el, kata = false) {
  el.setAttribute('autocomplete', 'off');
  el.setAttribute('autocapitalize', 'off');
  el.setAttribute('autocorrect', 'off');
  el.setAttribute('spellcheck', 'false');
  el.lang = 'ja';

  const toKanaRun = r => {
    const k = wanakana.toKana(r, { IMEMode: false });
    return kata ? wanakana.toKatakana(k) : k;
  };
  let last = el.value;

  el.addEventListener('input', () => {
    const v = el.value;
    if (v === last) return;
    last = v;
    const caret = el.selectionStart ?? v.length;

    // collect maximal ascii runs in the whole value
    const runs = [];
    let i = 0;
    while (i < v.length) {
      if (/[a-zA-Z]/.test(v[i])) {
        let j = i;
        while (j < v.length && /[a-zA-Z]/.test(v[j])) j++;
        runs.push([i, j]);
        i = j;
      } else i++;
    }
    if (!runs.length) return;

    const edits = [];
    runs.forEach(([s, e]) => {
      const romaji = v.slice(s, e);
      // a lone 'n' still at the very end may yet become na… → leave it
      if (romaji.length === 1 && /^[nN]$/.test(romaji) && e === v.length) return;
      const kana = toKanaRun(romaji);
      if (kana && kana !== romaji) edits.push({ s, e, r: kana });
    });
    if (!edits.length) return;

    // rebuild from the end so earlier coordinates stay valid
    let out = v;
    for (let k = edits.length - 1; k >= 0; k--) {
      const ed = edits[k];
      out = out.slice(0, ed.s) + ed.r + out.slice(ed.e);
    }
    let delta = 0;
    edits.forEach(ed => { if (ed.e <= caret) delta += ed.r.length - (ed.e - ed.s); });
    const newCaret = Math.max(0, Math.min(caret + delta, out.length));
    el.value = out;
    el.setSelectionRange(newCaret, newCaret);
    last = out;
  });
}

/** longest-common-subsequence length — drives partial marks on translations. */
function lcsLen(a, b) {
  const n = a.length, m = b.length;
  let prev = new Array(m + 1).fill(0);
  let cur = new Array(m + 1).fill(0);
  for (let i = 1; i <= n; i++) {
    for (let j = 1; j <= m; j++) {
      cur[j] = a[i - 1] === b[j - 1] ? prev[j - 1] + 1 : Math.max(prev[j], cur[j - 1]);
    }
    const t = prev; prev = cur; cur = t;
    cur[0] = 0;
  }
  return prev[m];
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
  const results = []; // per part: { wordGot, wordTotal, cells, bunpou: [{typed, marks}] }

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
    <div class="sec-sub">Type each word's kana and draw its kanji where one is expected — one point per box. Then translate each Bunpou Check sentence in full, 3 marks each like the real test. Self-checked — no pressure.</div>

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
        <div class="kg-label" style="margin:26px 0 8px">Bunpou Check — translate the whole sentence</div>
        <div id="umt-bunpou"></div>` : ''}
      <div id="umt-bunpou-score" class="umt-score" style="margin-top:12px"></div>`;

    // ---------- word table ----------
    const tbody = document.getElementById('umt-tbody');
    const prev = results[partIdx];

    p.words.forEach((w, wi) => {
      const tr = document.createElement('tr');
      const kanjiCells = w.cells.filter(c => cellKind(c) === 'kanji');
      const hint = (kanjiCells.length || w.cells.some(c => cellKind(c) === 'fixed')) ? readingHint(w) : '';

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
        bindKana(input, hasKata(cellText(c)));
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

    // kanji self-marking (word rows only)
    tbody.querySelectorAll('.umt-mark-btn').forEach(btn => {
      btn.onclick = () => {
        const box = btn.closest('.umt-box');
        box.dataset.mark = btn.dataset.mark;
        box.querySelectorAll('.umt-mark-btn').forEach(b =>
          b.classList.toggle('chosen', b === btn));
      };
    });

    // ---------- Bunpou Check: whole-sentence translation cards ----------
    const bunpouMount = document.getElementById('umt-bunpou');
    if (bunpouMount) {
      p.bunpou.forEach((item, bi) => {
        const card = document.createElement('div');
        card.className = 'card umt-bunpou-card';
        card.innerHTML = `
          <div class="umt-trans-q"><span class="umt-bunpou-tag">3 marks</span> ${bi + 1}. ${esc(item.en)}</div>
          <textarea class="umt-trans-input ubp-trans" rows="2"
            placeholder="Translate the whole sentence — romaji turns into kana; include every particle…"></textarea>
          <div class="btnrow" style="margin-top:8px;justify-content:flex-start">
            <button class="btn" data-role="reveal">Show answer</button>
            <span class="umt-score" data-role="marks"></span>
          </div>
          <div class="umt-trans-answer" data-role="answer" style="display:none">${answerHtml(item)}</div>`;
        bunpouMount.appendChild(card);

        const ta = card.querySelector('textarea');
        ta.dataset.i = bi;
        bindKana(ta);

        card.querySelector('[data-role="reveal"]').onclick = ev => {
          const ans = card.querySelector('[data-role="answer"]');
          const open = ans.style.display !== 'none';
          ans.style.display = open ? 'none' : 'block';
          ev.currentTarget.textContent = open ? 'Show answer' : 'Hide answer';
        };
      });

      // restore any previous bunpou state
      if (prev) {
        const cards = bunpouMount.querySelectorAll('.umt-bunpou-card');
        cards.forEach((card, bi) => {
          const st = prev.bunpou && prev.bunpou[bi];
          if (!st) return;
          const ta = card.querySelector('textarea');
          if (st.typed != null) ta.value = st.typed;
          const marks = card.querySelector('[data-role="marks"]');
          if (marks && st.marksText != null) marks.textContent = st.marksText;
        });
      }
    }

    // ---------- Check ----------
    const checkBtn = document.getElementById('umt-check');
    if (checkBtn) checkBtn.onclick = () => checkPart(p, partEl);

    if (prev && prev.wordScore) {
      partEl.querySelector('#umt-score').textContent = prev.wordScore;
    }
    const bScore = partEl.querySelector('#umt-bunpou-score');
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
    return kanjiCells.map(c => {
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
          recs.push({ ok: !!ok, verdictHtml: '' });
        }
      });
      cellRecs.push(recs);
    });

    // bunpou — whole-sentence translation, 3 marks each
    const bunpouRecs = [];
    const marksList = [];
    const cards = partEl.querySelectorAll('.umt-bunpou-card');
    p.bunpou.forEach((item, bi) => {
      const ta = partEl.querySelector(`.ubp-trans[data-i="${bi}"]`);
      const typed = clean(ta?.value || '');
      const expectedRaw = expectedKana(item);
      const exp = normKana(expectedRaw);
      const typ = normKana(typed);

      let marks = 0;
      if (exp.length) {
        if (typ === exp) marks = 3;
        else if (typ.length) {
          const ratio = lcsLen(typ, exp) / exp.length;
          marks = Math.round(Math.min(1, ratio) * 30) / 10;
        }
      }
      marksList.push(marks);

      const marksEl = cards[bi] && cards[bi].querySelector('[data-role="marks"]');
      if (marksEl) marksEl.textContent = `${marks.toFixed(1)} / 3`;
      bunpouRecs.push({
        typed,
        marks,
        marksText: marksEl ? marksEl.textContent : '',
      });
    });

    const wordScore = `${wordGot} / ${wordTotal} points`;
    partEl.querySelector('#umt-score').textContent = wordScore;
    const bScoreEl = partEl.querySelector('#umt-bunpou-score');
    if (bScoreEl && marksList.length) {
      bScoreEl.textContent = `Bunpou Check: ${marksList.map(m => `${m.toFixed(1)} / 3`).join(' · ')}`;
    }

    results[partIdx] = {
      wordGot,
      wordTotal,
      cells: cellRecs,
      bunpou: bunpouRecs,
      marksList,
      wordScore,
      bunpouScore: bScoreEl ? bScoreEl.textContent : '',
    };
  }

  // ---------- Finish ----------
  document.getElementById('umt-finish').onclick = () => {
    if (opts.onDone) {
      let got = 0, total = 0;
      parts.forEach((p, pi) => {
        const r = results[pi];
        if (!r || !r.wordTotal) return;
        got += r.wordGot + r.marksList.reduce((a, m) => a + m, 0);
        total += r.wordTotal + 3 * p.bunpou.length;
      });
      if (total > 0) opts.onDone(got, total);
    }
    opts.onExit?.();
  };

  showPart();
}
