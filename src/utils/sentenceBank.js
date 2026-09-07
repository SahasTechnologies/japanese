/**
 * Per-unit sentence bank — the "sentence questions" pool behind a coursework
 * unit's Practice lessons.
 *
 * A unit ships with only ~15–45 handwritten sentences — far too small for a
 * 15-question mixed lesson that should feel fresh each session. This module
 * assembles a much larger pool (~300 per unit) from three sources:
 *
 *   1. The unit's own handwritten sentences (kanji examples, phrase chevrons,
 *      grammar Q&A) — always first; these are the highest-quality items and
 *      carry a kana reading where the data has one.
 *   2. Generated sentences that slot the unit's vocabulary into a small set of
 *      grammatically safe N5-level frames chosen per word by its part of
 *      speech (polite verbs, common nouns by category, colours, times, …).
 *      Only word kinds with safe frames are generated; number counters, fixed
 *      phrases and odd labels are left to the multiple-choice/typing drills.
 *   3. A top-up from the rest of the app's real sentences (other units and the
 *      JLPT grammar examples) when the unit still has room.
 *
 * Generated text is always kana (kanji is added back on display only when the
 * learner knows it), so tokens need no extra reading lookups.
 */
import courseworkData from '../data/coursework.json' with { type: 'json' };
import grammarData from '../data/grammar.json' with { type: 'json' };
import { shuffle } from './helpers.js';

const { UNITS: ALL_UNITS } = courseworkData;
const { GRAMMAR } = grammarData;

const hasKanji = s => /[\u4e00-\u9faf]/.test(String(s || ''));

/** Strip learner-friendly spacing + sentence punctuation (compare/split form). */
export const compact = s => String(s || '').replace(/[。、．\s]/g, '');

function dedupe(list) {
  const seen = new Set();
  const out = [];
  for (const it of list) {
    const key = String(it.en || '').trim().toLowerCase();
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push(it);
  }
  return out;
}

/* ------------------------------------------------------------------ */
/*  Real sentences                                                     */
/* ------------------------------------------------------------------ */

/** Collect the {en, jp, kana} sentence pairs a unit actually teaches. */
export function unitRealSentences(u) {
  const pool = [];
  const push = (en, jp, kana) => { if (en && jp) pool.push({ en, jp, kana: kana || '' }); };
  (u.kanji || []).forEach(k => (k.sentences || []).forEach(s => push(s.en, s.kanji, s.kana)));
  (u.phraseChevrons || []).forEach(sec => (sec.groups || []).forEach(g => (g.items || []).forEach(it => push(it.en, it.jp, it.kana))));
  (u.grammarPractice || []).forEach(gp => {
    ['example', 'example2'].forEach(key => {
      const ex = gp[key];
      if (!ex) return;
      ['q', 'a', 'a1', 'a2'].forEach(k => {
        const part = ex[k];
        if (part && part.en && part.jp) push(part.en, part.jp, part.kana || '');
      });
    });
  });
  (u.qaSections || []).forEach(sec => (sec.pairs || []).forEach(p => {
    push(p.q.en, p.q.jp, p.q.kana || '');
    push(p.a.en, p.a.jp, p.a.kana || '');
  }));
  return dedupe(pool);
}

/** Real sentences from every coursework unit and the JLPT grammar patterns. */
export function globalRealSentences() {
  const bank = [];
  ALL_UNITS.forEach(u => bank.push(...unitRealSentences(u)));
  GRAMMAR.forEach(g => (g.x || []).forEach(([jp, en]) => { if (jp && en) bank.push({ en, jp }); }));
  return dedupe(bank);
}

/* ------------------------------------------------------------------ */
/*  Small text helpers                                                 */
/* ------------------------------------------------------------------ */

/** First clean reading: split alternates, drop notes and spacing → kana. */
function cleanReading(r) {
  const s = String(r || '').split(/[／/]/)[0].replace(/[（(][^）)]*[）)]/g, '').trim();
  return s.replace(/\s+/g, '');
}

function coreMeaning(meaning) {
  return String(meaning || '').trim().replace(/[（(][^）)]*[）)]/g, ' ').replace(/\s+/g, ' ').trim();
}

/** First alternative of a meaning (split on ' / ' or '／'). */
function firstAlt(text) {
  return String(text).split(/\s*\/\s*/)[0].split(/／/)[0].trim();
}

function enCap(s) {
  const t = String(s).trim();
  if (!t) return t;
  return t[0].toUpperCase() + t.slice(1);
}

function enFmt(num) {
  const map = { 1: 'one', 2: 'two', 3: 'three', 4: 'four', 5: 'five', 6: 'six', 7: 'seven', 8: 'eight', 9: 'nine', 10: 'ten', 11: 'eleven', 12: 'twelve' };
  return map[num] || num;
}

/** parse '6 o'clock', 'half-past 2', '5 minutes to 1'. */
function clockParts(en) {
  const t = String(en);
  let m = t.match(/half-past\s+(\d+)/i);
  if (m) return { type: 'half', num: m[1] };
  m = t.match(/(\d+)\s*o'clock/i);
  if (m) return { type: 'o', num: m[1] };
  m = t.match(/(\d+)\s*minutes?\s+to\s+(\d+)/i);
  if (m) return { type: 'to', num: m[2], to: m[1] };
  m = t.match(/(\d+):(\d+)/);
  if (m) return { type: 'digital', num: m[1], to: m[2] };
  return null;
}

/** conjugate a ます-reading verb into polite forms */
function politeForms(expr, reading) {
  const r = cleanReading(reading);
  if (!r || !/ます$/.test(r)) return null;
  const base = r.replace(/ます$/, '');
  const glue = kana => {
    if (!hasKanji(expr)) return kana;
    // overwrite the trailing kana of the expression with the conjugated form
    const ex = String(expr).replace(/\s+/g, '');
    if (ex.endsWith(r)) return ex.slice(0, ex.length - r.length) + kana;
    return ex;
  };
  return {
    masu: glue(r), neg: glue(r.replace(/ます$/, 'ません')),
    past: glue(r.replace(/ます$/, 'ました')),
    tai: glue(base + 'たいです'),
    masho: glue(base + 'ましょう'),
  };
}

const PAST = {
  go: 'went', come: 'came', eat: 'ate', drink: 'drank', see: 'saw', read: 'read',
  write: 'wrote', take: 'took', give: 'gave', get: 'got', make: 'made', buy: 'bought',
  meet: 'met', speak: 'spoke', swim: 'swam', run: 'ran', sleep: 'slept', stand: 'stood',
  sit: 'sat', think: 'thought', know: 'knew', understand: 'understood', forget: 'forgot',
  wear: 'wore', sing: 'sang', win: 'won', pay: 'paid', send: 'sent', find: 'found',
  hear: 'heard', say: 'said', do: 'did', have: 'had', study: 'studied', play: 'played',
  watch: 'watched', wash: 'washed', work: 'worked', walk: 'walked', talk: 'talked',
  listen: 'listened', visit: 'visited', help: 'helped', live: 'lived', start: 'started',
  cook: 'cooked', learn: 'learned', clean: 'cleaned', rest: 'rested', wait: 'waited',
  open: 'opened', close: 'closed', use: 'used', travel: 'traveled', hike: 'hiked',
  fish: 'fished', ski: 'skied', telephone: 'telephoned', exercise: 'exercised',
  jog: 'jogged', shop: 'shopped', dance: 'danced', drive: 'drove', ride: 'rode',
  fly: 'flew', return: 'returned', stay: 'stayed', arrive: 'arrived', leave: 'left',
  enter: 'entered', snowboard: 'snowboarded',
};

function pastEn(base) {
  const words = String(base).split(' ');
  if (words.length > 1) return [pastEn(words[0]), ...words.slice(1)].join(' ');
  if (PAST[words[0]]) return PAST[words[0]];
  const w = words[0];
  if (/[^aeiou]y$/.test(w)) return w.slice(0, -1) + 'ied';
  if (/e$/.test(w)) return w + 'd';
  return w + 'ed';
}

/* ------------------------------------------------------------------ */
/*  Word classification + per-kind frames                              */
/* ------------------------------------------------------------------ */

/** Kind of a vocab word; only kinds with safe frames generate sentences. */
function kindOf(w) {
  const [expr, reading, meaning] = w;
  const text = firstAlt(coreMeaning(meaning));
  const lower = text.toLowerCase();
  const r = cleanReading(reading);

  const nounWord = String(expr || '');
  const naMark = /（な）/.test(String(meaning)) || /（な）/.test(nounWord);

  // fixed polite phrases / full-sentence vocab (いらっしゃいませ, ごちそうさま（でした）…)
  if (/(ませ|ください|ました|ましょう|です|でしょう|ます)$/.test(r) && !/^to\s/i.test(lower)) return 'skip';
  if (/^(i |welcome|certainly|sorry|please |let's|cheers|excuse me|good morning|good night|thank you|nice to meet|have a|how do you|it's)/i.test(text)) return 'skip';
  if (/^\d|^(what|when|where|who|why|how many|how much|how long)\b/i.test(text)) return 'skip';
  if (/\byears?\b|\bgrade\b|\byear\b/.test(lower)) return 'skip';

  if (/ます$/.test(r)) return /^to\s/i.test(lower) ? 'verb' : 'skip';
  if (/^to\s/i.test(lower) && /[\u3040-\u309f\u4e00-\u9faf]$/.test(r)) return 'verb';
  if (naMark && !/い$/.test(r)) return 'naadj';
  if (/い$/.test(r)) {
    // noun-y words that happen to end in い (clock とけい, teacher せんせい…)
    if (/clock|teacher|person|people|man|woman|child|friend|family|student|station|store|shop|office|toilet|school|room|house|home|bed|desk|bag|book|movie|music|company|job|work|doctor|train|bus|car|ticket|medicine|glass|pen|pencil|watch|key|food|fish|drink|tea|coffee|juice|water/.test(lower) && lower.length > 1) return 'skip';
    if (lower.length > 1 && /^[a-z]/.test(lower)) return 'iadj';
    return 'skip';
  }
  if (/(a\.m\.|p\.m\.)/.test(lower)) return 'ampm';
  if (clockParts(text)) return 'clock';
  if (/\b(minute|minutes|second|seconds)\b/.test(lower)) return 'duration';
  if (/^(weather report|temperature|degrees|zero degrees|maximum temperature|minimum temperature|what temperature|how many)/i.test(text)) return 'skip';
  if (/\s/.test(String(expr)) && !/ます$/.test(r)) return 'skip'; // multiword phrase
  if (/\b(living room|kitchen|toilet|garden|entrance|room|house|apartment|flat|bedroom|school|classroom|station|store|shop|office|park|library|bank|hospital|city|town|country|restaurant|supermarket|building|alcove)\b/.test(lower)) return 'place';
  if (/\b(person|people|man|woman|child|friend|family|teacher|student|doctor|father|mother|brother|sister|grandfather|grandmother|boy|girl|dad|mum|uncle|aunt)\b/.test(lower)) return 'person';
  if (/\b(food|drink|water|tea|coffee|rice|bread|meat|fish|fruit|breakfast|lunch|dinner|meal|soup|juice|milk|cake|egg|vegetable|noodle|beer|wine|dish|snack)\b/.test(lower)) return 'food';
  if (/\b(body|head|hand|leg|foot|arm|eye|ear|nose|mouth|face|hair|tooth|stomach|back|neck|knee|finger|shoulder|legs|hands|arms|feet|ears|eyes)\b/.test(lower)) return 'body';
  if (/red|blue|green|yellow|white|black|brown|purple|pink|orange|grey|gray/.test(lower)) return 'colour';
  if (/^(weather|sunny|cloudy|rain|rainy|snow|snowy|typhoon|stormy|blizzard)/i.test(text)) return 'nature';

  const blocked = /^(on top|under|in front|behind|inside|in the middle|outside|side|next to|above|below|between|near|left|right|1|2|3|4|5|6|7|8|9|10)$/i.test(text)
    || /^\d/.test(lower) || lower.length < 2 || lower.length > 36
    || !/^[a-z]/.test(lower) || lower.endsWith('!') || lower.endsWith('?');
  if (blocked) return 'skip';
  return 'noun';
}

/** Frame sentences for one vocab word. */
function framesForWord(w) {
  const [expr, reading, meaning] = w;
  const text = firstAlt(coreMeaning(meaning));
  const kind = kindOf(w);
  const out = [];
  const add = (jp, en) => {
    if (!jp || !en) return;
    const raw = String(en);
    const end = /[!]$/.test(raw) ? '!' : /[?]$/.test(raw) ? '?' : '.';
    out.push({ en: raw.replace(/[.!?]+\s*$/, '') + end, jp });
  };
  const read = cleanReading(reading);
  if (!read) return out;
  if (kind === 'skip' || kind === 'ampm') return out;
  if (kind !== 'verb' && /\s/.test(String(expr))) return out;

  if (kind === 'verb') {
    const f = politeForms(expr, reading);
    if (!f) return out;
    const base = text.replace(/^to\s+/i, '');
    const fr = s => `${s}${s.trim().endsWith('。') ? '' : '。'}`;
    add(fr(f.masu), `I ${base}.`);
    add(fr(`毎日、${f.masu}`), `I ${base} every day.`);
    add(fr(`きのう、${f.past}`), `I ${pastEn(base)} yesterday.`);
    add(fr(`ひまな 時に、${f.masu}`), `I ${base} in my free time.`);
    add(fr(`いっしょに ${f.masho}`), `Let's ${base} together.`);
    add(fr(`私は ${f.tai}`), `I want to ${base}.`);
    add(fr(f.neg), `I don't ${base}.`);
    return dedupe(out);
  }

  const N = text; // keep mid-sentence casing from the data (lowercase nouns)
  if (kind === 'clock') {
    const cp = clockParts(text);
    if (cp.type === 'half') {
      add(`いま、${read}です。`, `It is ${enFmt(cp.num)} thirty now.`);
      add(`${read}に 起きます。`, `I get up at ${enFmt(cp.num)} thirty.`);
      add(`${read}に 会いましょう。`, `Let's meet at ${enFmt(cp.num)} thirty.`);
    } else if (cp.type === 'o') {
      add(`いま、${read}です。`, `It is ${enFmt(cp.num)} o'clock now.`);
      add(`${read}に 起きます。`, `I get up at ${enFmt(cp.num)} o'clock.`);
      add(`${read}に 学校へ 行きます。`, `I go to school at ${enFmt(cp.num)} o'clock.`);
      add(`${read}に ねます。`, `I go to bed at ${enFmt(cp.num)} o'clock.`);
    } else if (cp.type === 'to') {
      add(`いま、${read}です。`, `It is ${cp.to} minutes to ${enFmt(cp.num)} now.`);
    } else if (cp.type === 'digital') {
      add(`いま、${read}です。`, `It is ${cp.num}:${cp.to} now.`);
    }
    return out;
  }
  if (kind === 'duration') {
    add(`あと ${read} あります。`, `There are ${N} left.`);
    add(`毎日 ${read} べんきょうします。`, `I study for ${N} every day.`);
    return out;
  }
  if (kind === 'iadj') {
    add(`とても ${read}です。`, `It is very ${N}.`);
    add(`とても ${read}ですね。`, `It is very ${N}, isn't it?`);
    add(`${read}ものが 好きです。`, `I like ${N} things.`);
    return out;
  }
  if (kind === 'naadj') {
    const like = /^(like|dislike|unlike|likeable|unlikeable|favourite|favorite)/i.test(text);
    if (like) {
      add(`私は ${read}です。`, text.toLowerCase().startsWith('dislike') || text.toLowerCase().startsWith('unlike')
        ? `I dislike it.` : `I like it.`);
      add(`私は これが ${read}です。`, text.toLowerCase().startsWith('dislike') || text.toLowerCase().startsWith('unlike')
        ? `I dislike this.` : `I like this.`);
    } else {
      add(`とても ${read}です。`, `It is very ${N}.`);
      add(`とても ${read}ですね。`, `It is very ${N}, isn't it?`);
    }
    return out;
  }
  if (kind === 'place') {
    add(`${read}へ 行きます。`, `I go to ${N}.`);
    add(`${read}で 会いましょう。`, `Let's meet at ${N}.`);
    add(`${read}は どこですか。`, `Where is ${N}?`);
    add(`${read}に います。`, `I am at ${N}.`);
    return out;
  }
  if (kind === 'person') {
    add(`あの人は ${read}です。`, `That person is ${N}.`);
    add(`${read}と 話します。`, `I talk with ${N}.`);
    add(`${read}に 会います。`, `I meet ${N}.`);
    return out;
  }
  if (kind === 'food') {
    add(`${read}を 食べます。`, `I eat ${N}.`);
    add(`${read}が 好きです。`, `I like ${N}.`);
    add(`${read}を ください。`, `Please give me ${N}.`);
    return out;
  }
  if (kind === 'body') {
    add(`これは ${read}です。`, `This is ${N}.`);
    add(`${read}が 痛いです。`, `My ${N} hurts.`);
    add(`${read}を 見て ください。`, `Please look at your ${N}.`);
    return out;
  }
  if (kind === 'colour') {
    const base = read.replace(/の$/, '');
    add(`これは ${base}です。`, `This is ${N}.`);
    add(`私は ${base}が 好きです。`, `I like ${N}.`);
    add(`${base}の 車が あります。`, `There is a ${N} car.`);
    return out;
  }
  if (kind === 'nature') {
    add(`今日は ${read}です。`, `Today it is ${N}.`);
    if (/^(rain|rainy|snow|snowy)/i.test(text)) {
      add(`${read}が ふります。`, text.toLowerCase().startsWith('snow') ? `It will snow.` : `It will rain.`);
    }
    return out;
  }
  // plain concrete noun
  add(`これは ${read}です。`, `This is ${N}.`);
  add(`${read}が あります。`, `There is ${N}.`);
  add(`私は ${read}が 好きです。`, `I like ${N}.`);
  add(`${read}を 見て ください。`, `Please look at the ${N}.`);
  add(`あの ${read}を ください。`, `Please give me that ${N}.`);
  return dedupe(out);
}

/** is this vocab entry a fixed everyday phrase we can still offer as a phrase? */
function fixedPhraseLine(w) {
  const [expr, reading, meaning] = w;
  const read = cleanReading(reading);
  if (!read) return null;
  if (!/(ませ|ください|ました|ましょう|ます)$/.test(read)) return null;
  const text = coreMeaning(meaning);
  if (/^to\s/i.test(text) || text.length < 2 || text.length > 42) return null;
  const jp = `${read}。`.replace(/^かんぱい。/, 'かんぱい！');
  return { en: `${enCap(text.replace(/[.!?]+$/, ''))}.`, jp };
}

/** '7 a.m.'-style english clock string, or null. */
function clockEn(apWord, clockMeaning) {
  const cp = clockParts(clockMeaning);
  if (!cp || cp.type !== 'o') return null;
  return `${cp.num} ${apWord}`;
}

/**
 * Generate sentences for a unit. Returns deduped [{ en, jp }]; jp is kana
 * (kanji is re-added on display only when the learner knows it).
 */
export function generateUnitSentences(u, { perWord = 8, maxTotal = 420 } = {}) {
  const words = (u.vocabSections || []).flatMap(sec => (sec.words || []).filter(Array.isArray));
  const out = [];

  // 午前/午後 combined with o'clock words → real clock expressions
  const apList = words.filter(w => /^(午前|午後|ごぜん|ごご)$/.test(String(w[0]).replace(/\s+/g, '')));
  const clocks = words
    .map(w => ({ w, cp: clockParts(firstAlt(coreMeaning(w[2]))) }))
    .filter(x => x.cp && x.cp.type === 'o')
    .map(x => x.w);
  for (const ap of apList) {
    const apRead = cleanReading(ap[1]);
    const apEn = firstAlt(coreMeaning(ap[2])).toLowerCase().replace(/\./g, '');
    for (const ck of clocks) {
      const en = clockEn(apEn, firstAlt(coreMeaning(ck[2])));
      const ckRead = cleanReading(ck[1]);
      if (!en) continue;
      out.push({ en: `It is ${en} now.`, jp: `いま、${apRead} ${ckRead}です。` });
      out.push({ en: `I get up at ${en}.`, jp: `${apRead} ${ckRead}に 起きます。` });
      out.push({ en: `I go to school at ${en}.`, jp: `${apRead} ${ckRead}に 学校へ 行きます。` });
      out.push({ en: `Let's meet at ${en}.`, jp: `${apRead} ${ckRead}に 会いましょう。` });
    }
  }

  for (const w of shuffle(words)) {
    if (out.length >= maxTotal) break;
    const frames = framesForWord(w);
    const picks = frames.length ? frames : [];
    for (const f of shuffle(picks).slice(0, perWord)) {
      if (out.length >= maxTotal) break;
      out.push(f);
    }
    if (!picks.length && out.length < maxTotal) {
      const line = fixedPhraseLine(w);
      if (line) out.push(line);
    }
  }
  return dedupe(out);
}

/** Full bank for a unit: real → generated → global top-up. */
export function buildUnitSentenceBank(u, { target = 300 } = {}) {
  const bank = [];
  const seen = new Set();
  const push = it => {
    const key = String(it.en || '').trim().toLowerCase();
    if (!key || seen.has(key)) return;
    seen.add(key);
    bank.push(it);
  };
  unitRealSentences(u).forEach(push);
  generateUnitSentences(u).forEach(push);
  if (bank.length < target) {
    const extra = shuffle(globalRealSentences());
    for (const it of extra) {
      if (bank.length >= target) break;
      push(it);
    }
  }
  return bank;
}
