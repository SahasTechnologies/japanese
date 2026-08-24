/**
 * Pitch accent display.
 *
 * Data comes from src/data/pitch-accent.json (built by scripts/fetch-pitch.js
 * from the NHK Pronunciation dataset): "expr|reading" → accent position
 * (0 = heiban/flat, n = nucleus on the n-th mora).
 */
import PITCH from '../data/pitch-accent.json' with { type: 'json' };

/** Split a kana reading into morae (ゃゅょぁぃぅぇぉ and ー attach to the previous). */
function splitMorae(reading) {
  const out = [];
  for (const ch of String(reading || '').replace(/\([^)]*\)/g, '')) {
    if (out.length && 'ゃゅょぁぃぅぇぉー'.includes(ch)) out[out.length - 1] += ch;
    else out.push(ch);
  }
  return out;
}

/** Accent number for a word, or null when unknown. */
function pitchOf(expr, reading) {
  const v = PITCH[`${expr}|${reading}`];
  return typeof v === 'number' ? v : null;
}

function accentLabel(accent, n) {
  if (accent === 0) return '0 平板';
  if (accent === 1) return '1 頭高';
  if (accent === n) return `${accent} 尾高`;
  return `${accent} 中高`;
}

/**
 * Compact SVG pitch-overline for a word: a step line over the morae
 * (high/low), red dot on the nucleus and a red drop where the pitch falls.
 * Returns '' when the accent is unknown.
 */
export function pitchHtml(expr, reading) {
  const accent = pitchOf(expr, reading);
  if (accent === null) return '';
  const morae = splitMorae(reading);
  if (!morae.length || accent < 0 || accent > morae.length) return '';

  // per-mora height: 1 = high, 0 = low
  const hi = morae.map((_, i) => {
    if (accent === 0) return i === 0 ? 0 : 1;      // L-H-H-…
    if (accent === 1) return i === 0 ? 1 : 0;      // H-L-L-…
    return i === 0 ? 0 : (i < accent ? 1 : 0);     // L-H…H-L… (n≥2)
  });

  const step = 15, pad = 6, yH = 5, yL = 15;
  const w = pad * 2 + morae.length * step;
  const pts = hi.map((h, i) => `${pad + i * step + step / 2},${h ? yH : yL}`);
  // step path through the mora centers
  let d = `M ${pts[0]}`;
  for (let i = 1; i < pts.length; i++) {
    const [x] = pts[i].split(',');
    const prevY = pts[i - 1].split(',')[1];
    d += ` L ${x},${prevY} L ${pts[i]}`;
  }
  // nucleus dot + drop mark
  const nucleus = Math.min(accent, morae.length) - 1;
  let marks = '';
  if (nucleus >= 0) {
    const [nx, ny] = pts[nucleus].split(',');
    marks = `<circle cx="${nx}" cy="${ny}" r="2.6" fill="var(--red)"/>`;
    if (nucleus + 1 < morae.length || accent !== 0) {
      const dropX = nucleus + 1 < morae.length ? pad + (nucleus + 1) * step + step / 2 : w - 3;
      marks += `<line x1="${nucleus + 1 < morae.length ? dropX : w - pad - 2}" y1="${yH}" x2="${dropX}" y2="${yL}" stroke="var(--red)" stroke-width="1.4"/>`;
    }
  }
  const label = `<span class="pitch-label">${accentLabel(accent, morae.length)}</span>`;
  return `<span class="pitch" title="Pitch accent: ${accentLabel(accent, morae.length)}">
    <svg viewBox="0 0 ${w} 22" width="${w}" height="22" aria-hidden="true">
      <path d="${d}" fill="none" stroke="currentColor" stroke-width="1.6"/>
      ${morae.map((_, i) => `<circle cx="${pad + i * step + step / 2}" cy="${hi[i] ? yH : yL}" r="1.8" fill="currentColor"/>`).join('')}
      ${marks}
    </svg>${label}</span>`;
}
