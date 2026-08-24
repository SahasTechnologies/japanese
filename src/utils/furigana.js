/**
 * Sentence-level furigana annotator.
 *
 * Wraps kanji runs in <ruby> with their readings so quiz questions, passages,
 * and answer choices are readable for learners. Readings come from two
 * dictionaries built once from the app's own data:
 *
 *   1. Vocab phrases (expr → reading) — exact longest matches win, e.g.
 *      図書館 gets としょかん as a whole.
 *   2. Per-kanji candidates derived from every vocab word containing the
 *      kanji, aligned by okurigana: for 食べる/たべる the kanji 食 covers た
 *      and the okurigana べる is literal, so in 食べます the ruby is 食(た)
 *      and the sentence's own べます stays — never たべべます. The candidate
 *      whose okurigana best matches what follows the run in the sentence is
 *      preferred, which disambiguates most homograph kanji in N5 text.
 *
 * Kanji that no dictionary entry covers are left bare (honest gap, no wrong
 * readings invented). All input is HTML-escaped.
 */
import VOCAB from '../data/vocab.json' with { type: 'json' };
import kanjiData from '../data/kanji.json' with { type: 'json' };

const { KANJI } = kanjiData;
const ALLVOCAB = Object.values(VOCAB).flat();

const isKanji = ch => /[\u4e00-\u9faf]/.test(ch);
const isHira = ch => /[\u3040-\u309f]/.test(ch);

function esc(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

const clean = s => String(s || '').replace(/[（(][^）)]*[）)]/g, '').trim();

/** phrase map: kanji-containing vocab exprs → reading, longest first */
const PHRASES = ALLVOCAB
  .filter(([expr, reading]) => expr !== reading && [...expr].some(isKanji))
  .map(([expr, reading]) => ({
    expr,
    // drop alternative lists like なん; なに — keep one readable reading
    reading: clean(reading).split(/[;・、]\s*/)[0].trim(),
  }))
  .filter(p => p.reading)
  .sort((a, b) => [...b.expr].length - [...a.expr].length);

/** kanji → candidates [{ stem, oku }] derived from vocab words containing it */
const KANJI_CANDIDATES = (() => {
  const map = new Map();
  const push = (kanji, stem, oku) => {
    if (!map.has(kanji)) map.set(kanji, []);
    const list = map.get(kanji);
    if (!list.some(c => c.stem === stem && c.oku === oku)) list.push({ stem, oku });
  };
  ALLVOCAB.forEach(([expr, rawReading]) => {
    const reading = clean(rawReading);
    if (!reading || expr === reading) return;
    const chars = [...expr];
    const rchars = [...reading];
    // segment expr into kanji runs and literal-kana runs
    const segs = [];
    let i = 0;
    while (i < chars.length) {
      if (isKanji(chars[i])) {
        let j = i;
        while (j < chars.length && isKanji(chars[j])) j++;
        segs.push({ type: 'k', text: chars.slice(i, j).join('') });
        i = j;
      } else {
        let j = i;
        while (j < chars.length && !isKanji(chars[j])) j++;
        segs.push({ type: 'lit', text: chars.slice(i, j).join('') });
        i = j;
      }
    }
    const runIdx = segs.findIndex(s => s.type === 'k');
    if (runIdx === -1) return;
    // only unambiguous entries: exactly one kanji run (multi-run splits like
    // 食べ物/たべもの cannot be aligned without a parser)
    if (segs.filter(s => s.type === 'k').length !== 1) return;
    const before = segs.slice(0, runIdx).filter(s => s.type === 'lit').map(s => s.text).join('');
    const after = segs.slice(runIdx + 1).filter(s => s.type === 'lit').map(s => s.text).join('');
    // literal kana must appear verbatim at the reading's head/tail
    if (before && !reading.startsWith(before)) return;
    if (after && !reading.endsWith(after)) return;
    const stem = reading.slice([...before].length, rchars.length - [...after].length);
    // drop alternative lists like なん; なに — keep one readable reading
    const firstStem = stem.split(/[;・、]\s*/)[0].trim();
    if (!firstStem) return;
    push(segs[runIdx].text, firstStem, after);
  });
  // last-resort candidates from the KANJI table (kun reading preferred)
  KANJI.forEach(k => {
    const [glyph, on, kun] = k;
    const raw = (kun || on || '').split(/[・\/、,;]+/)[0].trim();
    if (!raw) return;
    if (!map.has(glyph)) map.set(glyph, []);
    map.get(glyph).push({ stem: raw, oku: '', fallback: true });
  });
  return map;
})();

function commonPrefixLen(a, b) {
  let n = 0;
  const as = [...a], bs = [...b];
  while (n < as.length && n < bs.length && as[n] === bs[n]) n++;
  return n;
}

function pickCandidate(candidates, after, nextIsKanji) {
  const real = candidates.filter(c => !c.fallback);
  const pool = real.length ? real : candidates;
  if (!pool.length) return null;
  let best = null, bestScore = -1;
  for (const c of pool) {
    // how well the candidate's own okurigana explains what follows the run
    let score = c.oku ? commonPrefixLen(c.oku, after) : 0;
    // a kanji following the run means there is no okurigana at all
    if (!c.oku && nextIsKanji) score += 0.5;
    // tie-break: the shortest okurigana is the tightest alignment
    if (score > bestScore ||
        (score === bestScore && best && [...c.oku].length < [...best.oku].length)) {
      best = c; bestScore = score;
    }
  }
  return best;
}

function rubyHtml(kanji, reading) {
  return `<ruby>${esc(kanji)}<rt>${esc(reading)}</rt></ruby>`;
}

/**
 * Ruby for a single known word (expr, reading) — exact reading, no guessing.
 * Falls back to plain text when there is nothing to annotate.
 */
export function rubyWord(expr, reading) {
  expr = String(expr || '');
  reading = String(reading || '').split(/[;・、]\s*/)[0].trim();
  if (!reading || expr === reading || !hasKanji(expr)) return esc(expr);
  return rubyHtml(expr, reading);
}

/** Annotate plain Japanese text with ruby, returning HTML. */
export function furigana(text) {
  const chars = [...String(text || '')];
  let out = '';
  let i = 0;
  while (i < chars.length) {
    if (!isKanji(chars[i])) { out += esc(chars[i]); i++; continue; }

    // 1) exact phrase match at this position
    const rest = chars.slice(i).join('');
    const phrase = PHRASES.find(p => rest.startsWith(p.expr));
    if (phrase) {
      out += `<ruby>${esc(phrase.expr)}<rt>${esc(phrase.reading)}</rt></ruby>`;
      i += [...phrase.expr].length;
      continue;
    }

    // 2) kanji run with okurigana-aligned candidate
    const runStart = i;
    while (i < chars.length && isKanji(chars[i])) i++;
    const runText = chars.slice(runStart, i).join('');
    const after = chars.slice(i).join('');
    const candidates = KANJI_CANDIDATES.get(runText) || [];
    const best = pickCandidate(candidates, after, i < chars.length && isKanji(chars[i]));
    if (best) {
      out += `<ruby>${esc(runText)}<rt>${esc(best.stem)}</rt></ruby>`;
    } else {
      out += esc(runText);
    }
  }
  return out;
}

/** True if the text contains any kanji (skip annotation work otherwise). */
export function hasKanji(text) {
  return /[\u4e00-\u9faf]/.test(String(text || ''));
}
