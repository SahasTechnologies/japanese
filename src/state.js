/**
 * Application state — localStorage-backed progress object.
 */

const KEY = 'n5app';

const DEFAULTS = {
  best: {},
  kanjiLearned: [],
  kanjiCanRead: [],
  kanjiCanWrite: [],
  vocabLearned: [],
  // 'all' | 'learned' | 'none'
  vocabKanjiMode: 'learned',
  showFurigana: true,
  mockBest: 0,
  flashPiles: {},
};

let P = { ...DEFAULTS };

try {
  const raw = localStorage.getItem(KEY);
  if (raw) {
    const parsed = JSON.parse(raw);
    P = Object.assign({ ...DEFAULTS }, parsed);
    // migrate legacy
    if (P.kanjiLearned?.length && !P.kanjiCanRead?.length) {
      P.kanjiCanRead = [...P.kanjiLearned];
    }
    if (typeof parsed.vocabHideKanji === 'boolean' && parsed.vocabKanjiMode == null) {
      P.vocabKanjiMode = parsed.vocabHideKanji ? 'none' : 'learned';
    }
  }
} catch (_) {}

export function getState() { return P; }

export function save() {
  try { localStorage.setItem(KEY, JSON.stringify(P)); } catch (_) {}
}

export function resetState() {
  P = {
    ...DEFAULTS,
    best: {},
    kanjiLearned: [],
    kanjiCanRead: [],
    kanjiCanWrite: [],
    vocabLearned: [],
    vocabKanjiMode: 'learned',
    showFurigana: true,
    flashPiles: {},
  };
  save();
}

export function updateBest(id, score, total) {
  const pct = Math.round((score / total) * 100);
  P.best[id] = Math.max(P.best[id] || 0, pct);
  save();
}

export function toggleKanjiFlag(char, flag) {
  const key = flag === 'write' ? 'kanjiCanWrite' : 'kanjiCanRead';
  const arr = P[key];
  const idx = arr.indexOf(char);
  if (idx >= 0) arr.splice(idx, 1);
  else arr.push(char);
  if (flag === 'read') P.kanjiLearned = [...P.kanjiCanRead];
  save();
}

export function toggleVocabLearned(word) {
  const idx = P.vocabLearned.indexOf(word);
  if (idx >= 0) P.vocabLearned.splice(idx, 1);
  else P.vocabLearned.push(word);
  save();
}

export function setVocabKanjiMode(mode) {
  if (['all', 'learned', 'none'].includes(mode)) {
    P.vocabKanjiMode = mode;
    save();
  }
}

export function setShowFurigana(on) {
  P.showFurigana = !!on;
  save();
}

/** Every kanji in text is in kanjiCanRead (kana-only → true) */
export function canShowKanjiForm(text) {
  const kanjiChars = [...text].filter(ch => /[\u4e00-\u9faf]/.test(ch));
  if (!kanjiChars.length) return true;
  const known = new Set(P.kanjiCanRead || []);
  return kanjiChars.every(ch => known.has(ch));
}

/**
 * Format a word for display based on kanji mode + furigana setting.
 * Furigana is per-kanji character (ruby above each kanji only; kana left bare).
 * readingMap: optional Map/object of kanji → preferred reading (from KANJI data).
 */
export function formatVocabWord(expr, reading, readingMap = null) {
  const mode = P.vocabKanjiMode || 'learned';
  const furi = P.showFurigana !== false;
  const hasKanji = /[\u4e00-\u9faf]/.test(expr);

  let showKanji = false;
  if (mode === 'all') showKanji = hasKanji;
  else if (mode === 'learned') showKanji = hasKanji && canShowKanjiForm(expr);

  if (!showKanji) {
    return `<span class="vw-kana">${escapeHtml(reading)}</span>`;
  }
  if (!furi || !reading || reading === expr) {
    return `<span class="vw-kanji">${escapeHtml(expr)}</span>`;
  }
  return `<span class="vw-kanji">${rubyAnnotate(expr, reading, readingMap)}</span>`;
}

/**
 * Annotate only kanji with <ruby>, each kanji separately when possible.
 * Strategy:
 *  1) Okurigana: if expr ends with hiragana that matches end of reading, strip and
 *     put remaining reading over the leading kanji run (split per kanji if map allows).
 *  2) Use readingMap for single-kanji readings when available.
 *  3) Fallback: one ruby over the whole kanji run.
 */
function rubyAnnotate(expr, reading, readingMap) {
  const map = readingMap || _kanjiReadMap;
  const chars = [...expr];
  const isKanji = ch => /[\u4e00-\u9faf]/.test(ch);
  const isHira = ch => /[\u3040-\u309f]/.test(ch);

  // Strip okurigana: longest suffix of expr that is hiragana and equals suffix of reading
  let okuLen = 0;
  for (let n = 1; n <= Math.min(chars.length, reading.length); n++) {
    const suf = chars.slice(-n).join('');
    if ([...suf].every(isHira) && reading.endsWith(suf)) okuLen = n;
    else if (okuLen) break;
  }
  const stemChars = okuLen ? chars.slice(0, -okuLen) : chars;
  const oku = okuLen ? chars.slice(-okuLen).join('') : '';
  let stemReading = okuLen ? reading.slice(0, reading.length - okuLen) : reading;

  // Build HTML for stem
  let html = '';
  let i = 0;
  while (i < stemChars.length) {
    if (!isKanji(stemChars[i])) {
      html += escapeHtml(stemChars[i]);
      i++;
      continue;
    }
    // Collect consecutive kanji
    let j = i;
    while (j < stemChars.length && isKanji(stemChars[j])) j++;
    const run = stemChars.slice(i, j);
    if (run.length === 1 && map && map[run[0]]) {
      const rt = map[run[0]];
      html += `<ruby>${escapeHtml(run[0])}<rt>${escapeHtml(rt)}</rt></ruby>`;
      // consume that reading from stemReading if it matches prefix
      if (stemReading.startsWith(rt)) stemReading = stemReading.slice(rt.length);
    } else if (run.length === 1) {
      // single kanji without map — assign remaining stem reading if this is the only kanji run left
      const restKanji = stemChars.slice(j).some(isKanji);
      if (!restKanji && stemReading) {
        html += `<ruby>${escapeHtml(run[0])}<rt>${escapeHtml(stemReading)}</rt></ruby>`;
        stemReading = '';
      } else {
        html += escapeHtml(run[0]);
      }
    } else {
      // multi-kanji: try map each, else one ruby for the run
      let usedMap = true;
      let part = '';
      let rem = stemReading;
      for (const ch of run) {
        if (map && map[ch] && rem.startsWith(map[ch])) {
          part += `<ruby>${escapeHtml(ch)}<rt>${escapeHtml(map[ch])}</rt></ruby>`;
          rem = rem.slice(map[ch].length);
        } else {
          usedMap = false;
          break;
        }
      }
      if (usedMap) {
        html += part;
        stemReading = rem;
      } else {
        html += `<ruby>${escapeHtml(run.join(''))}<rt>${escapeHtml(stemReading)}</rt></ruby>`;
        stemReading = '';
      }
    }
    i = j;
  }
  if (oku) html += escapeHtml(oku);
  return html;
}

/** Optional external map: call setKanjiReadMap from main after loading KANJI data */
let _kanjiReadMap = null;
export function setKanjiReadMap(map) {
  _kanjiReadMap = map;
}

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
