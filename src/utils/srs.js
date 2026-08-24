/**
 * Spaced repetition engine (SM-2 lite).
 *
 * Card state lives in the main progress object (P.srs) so it is saved,
 * reset, and backed up together with everything else. Each entry:
 *   { e: ease (2.5 default), iv: interval in days, due: 'YYYY-M-D', r: total reviews }
 *
 * Ratings: 'again' → short relearn step (due tomorrow at the earliest),
 * 'hard' → small step, 'good' → full interval × ease, 'easy' → interval ×
 * ease × boost. New cards start on a 1-day learning step.
 */
import { getState, save } from '../state.js';

function todayKey(offsetDays = 0) {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** Normalize a stored due key (older entries may be unpadded: 2026-8-9). */
function normDue(due) {
  const parts = String(due || '').split('-').map(Number);
  if (parts.length !== 3 || parts.some(isNaN)) return '';
  return `${parts[0]}-${String(parts[1]).padStart(2, '0')}-${String(parts[2]).padStart(2, '0')}`;
}

/** Rate a card and persist. */
export function srsRate(id, rating) {
  const P = getState();
  if (!P.srs || typeof P.srs !== 'object') P.srs = {};
  const s = { ...(P.srs[id] || { e: 2.5, iv: 0, r: 0 }) };
  s.e = Math.max(1.3, s.e);
  s.r++;

  if (rating === 'again') {
    s.iv = 0;
    s.e = Math.max(1.3, s.e - 0.2);
  } else if (rating === 'hard') {
    s.iv = s.iv === 0 ? 0.5 : Math.max(1, s.iv * 1.2);
    s.e = Math.max(1.3, s.e - 0.05);
  } else if (rating === 'easy') {
    s.iv = s.iv === 0 ? 3 : s.iv * s.e * 1.3;
    s.e += 0.1;
  } else { // good
    s.iv = s.iv === 0 ? 1 : (s.iv < 1 ? 1 : s.iv * s.e);
  }

  s.due = todayKey(Math.max(1, Math.round(s.iv)));
  P.srs[id] = s;
  save();
}

/** Split a list of card ids into { due, fresh } counts. */
export function srsCounts(ids) {
  const P = getState();
  const map = P.srs || {};
  let due = 0, fresh = 0;
  for (const id of ids) {
    const s = map[id];
    if (!s) fresh++;
    else if (normDue(s.due) <= todayKey()) due++;
  }
  return { due, fresh, total: ids.length };
}

/**
 * Build a review queue: new cards first (up to newLimit), then due cards
 * (up to dueLimit), shuffled within each group.
 */
export function srsQueue(ids, { newLimit = 8, dueLimit = 40 } = {}) {
  const P = getState();
  const map = P.srs || {};
  const fresh = [];
  const due = [];
  for (const id of ids) {
    const s = map[id];
    if (!s) fresh.push(id);
    else if (normDue(s.due) <= todayKey()) due.push(id);
  }
  const shuffle = a => {
    const x = a.slice();
    for (let i = x.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [x[i], x[j]] = [x[j], x[i]];
    }
    return x;
  };
  return [...shuffle(fresh).slice(0, newLimit), ...shuffle(due).slice(0, dueLimit)];
}

