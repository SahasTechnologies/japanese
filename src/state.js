/**
 * Application state — localStorage-backed progress object.
 */

const KEY = 'n5app';

const DEFAULTS = {
  best: {},              // { sectionId: pct }
  kanjiLearned: [],      // legacy: treated as can-read
  kanjiCanRead: [],      // characters user can read
  kanjiCanWrite: [],     // characters user can write
  vocabLearned: [],      // word keys (expression) marked learned
  vocabHideKanji: false, // show kana-only in vocabulary
  mockBest: 0,
  flashPiles: {},        // { deckId: { know: [], dont: [] } }
};

let P = { ...DEFAULTS };

try {
  const raw = localStorage.getItem(KEY);
  if (raw) {
    P = Object.assign({ ...DEFAULTS }, JSON.parse(raw));
    // migrate legacy kanjiLearned → kanjiCanRead
    if (P.kanjiLearned?.length && !P.kanjiCanRead?.length) {
      P.kanjiCanRead = [...P.kanjiLearned];
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
    vocabHideKanji: false,
    flashPiles: {},
  };
  save();
}

/** Update best score for a section if higher, then save */
export function updateBest(id, score, total) {
  const pct = Math.round((score / total) * 100);
  P.best[id] = Math.max(P.best[id] || 0, pct);
  save();
}

export function toggleKanjiFlag(char, flag) {
  // flag: 'read' | 'write'
  const key = flag === 'write' ? 'kanjiCanWrite' : 'kanjiCanRead';
  const arr = P[key];
  const idx = arr.indexOf(char);
  if (idx >= 0) arr.splice(idx, 1);
  else arr.push(char);
  // keep legacy in sync for read
  if (flag === 'read') {
    P.kanjiLearned = [...P.kanjiCanRead];
  }
  save();
}

export function toggleVocabLearned(word) {
  const idx = P.vocabLearned.indexOf(word);
  if (idx >= 0) P.vocabLearned.splice(idx, 1);
  else P.vocabLearned.push(word);
  save();
}

export function setVocabHideKanji(on) {
  P.vocabHideKanji = !!on;
  save();
}

/** Does every kanji in `text` appear in kanjiCanRead? (kana-only words always ok) */
export function canShowKanjiForm(text) {
  const kanjiChars = [...text].filter(ch => /[\u4e00-\u9faf]/.test(ch));
  if (!kanjiChars.length) return true;
  const known = new Set(P.kanjiCanRead || []);
  return kanjiChars.every(ch => known.has(ch));
}
