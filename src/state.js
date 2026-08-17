/**
 * Application state — localStorage-backed progress object.
 */

const KEY = 'n5app';

const DEFAULTS = {
  best: {},           // { sectionId: pct }
  kanjiLearned: [],   // [char, ...]
  mockBest: 0,
};

let P = { ...DEFAULTS };

try {
  const raw = localStorage.getItem(KEY);
  if (raw) P = Object.assign({ ...DEFAULTS }, JSON.parse(raw));
} catch (_) {}

export function getState() { return P; }

export function save() {
  try { localStorage.setItem(KEY, JSON.stringify(P)); } catch (_) {}
}

export function resetState() {
  P = { ...DEFAULTS, best: {}, kanjiLearned: [] };
  save();
}

/** Update best score for a section if higher, then save */
export function updateBest(id, score, total) {
  const pct = Math.round((score / total) * 100);
  P.best[id] = Math.max(P.best[id] || 0, pct);
  save();
}
