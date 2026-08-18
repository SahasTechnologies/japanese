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
 * Returns HTML string.
 */
export function formatVocabWord(expr, reading) {
  const mode = P.vocabKanjiMode || 'learned';
  const furi = P.showFurigana !== false;
  const hasKanji = /[\u4e00-\u9faf]/.test(expr);

  let showKanji = false;
  if (mode === 'all') showKanji = hasKanji;
  else if (mode === 'learned') showKanji = hasKanji && canShowKanjiForm(expr);
  // mode === 'none' → always kana

  if (!showKanji) {
    return `<span class="vw-kana">${escapeHtml(reading)}</span>`;
  }
  if (furi && reading && reading !== expr) {
    return `<ruby class="vw-ruby">${escapeHtml(expr)}<rt>${escapeHtml(reading)}</rt></ruby>`;
  }
  return `<span class="vw-kanji">${escapeHtml(expr)}</span>`;
}

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
