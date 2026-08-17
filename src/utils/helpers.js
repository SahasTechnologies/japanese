/**
 * Shared utility helpers.
 */

/** Shorthand querySelector */
export const $ = (sel) => document.querySelector(sel);

/** Fisher-Yates shuffle — returns new array */
export function shuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** Generate SVG progress ring HTML */
export function ring(pct, color) {
  const r = 24, c = 2 * Math.PI * r, off = c * (1 - pct / 100);
  return `<div class="ring">
    <svg width="58" height="58" aria-hidden="true">
      <circle cx="29" cy="29" r="${r}" fill="none" stroke="var(--line)" stroke-width="6"/>
      <circle cx="29" cy="29" r="${r}" fill="none" stroke="${color}" stroke-width="6"
        stroke-linecap="round" stroke-dasharray="${c.toFixed(2)}" stroke-dashoffset="${off.toFixed(2)}"
        style="transition: stroke-dashoffset 0.7s ease"/>
    </svg>
    <span class="pct">${pct}%</span>
  </div>`;
}

/** Score-based feedback message */
export function msgFor(pct) {
  if (pct === 100) return 'Perfect! 満点!';
  if (pct >= 80)   return 'Excellent — よくできました!';
  if (pct >= 60)   return 'Good — keep going!';
  if (pct >= 40)   return 'Getting there — try again.';
  if (pct > 0)     return 'Keep practicing!';
  return 'Try watching the lessons first.';
}

/** Format seconds as M:SS */
export function fmtTime(s) {
  const m = Math.floor(s / 60), r = s % 60;
  return `${m}:${r < 10 ? '0' : ''}${r}`;
}
