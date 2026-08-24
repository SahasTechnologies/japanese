#!/usr/bin/env node
/**
 * fetch-pitch.js
 * Builds src/data/pitch-accent.json — accent position per word, keyed
 * "expr|reading" — from the NHK Pronunciation dataset (javdejong/nhk-pronunciation,
 * ACCDB_unicode.csv). Only words actually used by the app are kept, so the
 * output stays tiny.
 *
 * The CSV's `ac` column is the accent kernel: morae from the nucleus onward
 * (2 = nucleus, 0 = low after, 1 = high; heiban words are all 1s, with っ not
 * counted as a mora). Accent position = (countedMorae - ac.length) + index of '2'.
 *
 * Runs as part of `npm run build` / `dev`. If the download fails the previous
 * data file is left untouched and the app simply hides pitch marks.
 */

import { writeFileSync, readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = join(__dirname, '../src/data/pitch-accent.json');
const CSV_URL = 'https://raw.githubusercontent.com/javdejong/nhk-pronunciation/master/ACCDB_unicode.csv';

const VOCAB_JSON = join(__dirname, '../src/data/vocab.json');
const COURSEWORK_JSON = join(__dirname, '../src/data/coursework.json');
const KANJI_JSON = join(__dirname, '../src/data/kanji.json');

const kataToHira = s => String(s || '').replace(/[\u30a1-\u30f6]/g, ch =>
  String.fromCharCode(ch.charCodeAt(0) - 0x60));

/** morae counted the way the NHK data counts them (small っ not counted) */
function countedMorae(reading) {
  const chars = [...String(reading || '')];
  let n = 0;
  for (const ch of chars) {
    if (ch === 'っ') continue;
    n++;
  }
  return n;
}

function accentFromAc(ac, morae) {
  const s = String(ac || '');
  const i = s.indexOf('2');
  if (i === -1) return 0; // no nucleus → heiban
  return Math.max(1, morae - s.length + i + 1);
}

async function main() {
  // Collect the words the app actually teaches
  const words = new Set();
  const add = (expr, reading) => {
    if (expr && reading) words.add(`${expr}|${reading}`);
    else if (expr) words.add(`${expr}|`);
  };
  try {
    const vocabRoot = JSON.parse(readFileSync(VOCAB_JSON, 'utf8'));
    // vocab.json's root is the category map itself
    Object.values(vocabRoot).flat().forEach(([expr, reading]) => add(expr, reading));
  } catch (_) {}
  try {
    const { UNITS } = JSON.parse(readFileSync(COURSEWORK_JSON, 'utf8'));
    UNITS.forEach(u => {
      (u.vocabSections || []).forEach(sec => (sec.words || []).forEach(w => add(w[0], w[1])));
    });
  } catch (_) {}
  console.log(`Pitch accents: ${words.size} app words to look up…`);

  let csv;
  try {
    const res = await fetch(CSV_URL);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    csv = await res.text();
  } catch (e) {
    console.warn(`Pitch accent download failed (${e.message}) — keeping previous data.`);
    process.exit(0);
  }

  // index CSV rows by 表記 (col 6), kanjiexpr (col 7), and hiragana midashigo (col 5)
  const byHyoki = new Map();
  const byMidashigo = new Map();
  const push = (map, k, c) => {
    if (!k) return;
    if (!map.has(k)) map.set(k, []);
    map.get(k).push(c);
  };
  for (const line of csv.split('\n')) {
    const c = line.split(',');
    if (c.length < 19) continue;
    const hira = kataToHira(c[5]);
    push(byHyoki, c[6], c);
    push(byHyoki, c[7], c);
    push(byMidashigo, hira, c);
  }

  const result = {};
  let found = 0;
  for (const key of words) {
    const [expr, rawReading] = key.split('|');
    const reading = rawReading.replace(/\([^)]*\)/g, ''); // ひと(つ) → ひと
    let rows = byHyoki.get(expr) || [];
    if (!rows.length && reading) rows = byMidashigo.get(reading) || [];
    if (!rows || !rows.length) continue;
    // prefer a row whose reading matches ours exactly, then by prefix
    const want = kataToHira(reading);
    let row = null;
    if (want) row = rows.find(r => kataToHira(r[5]) === want);
    if (!row) row = rows.find(r => want && kataToHira(r[5]).startsWith(want));
    if (!row) row = rows[0];
    const morae = countedMorae(want || kataToHira(row[5]));
    const accent = accentFromAc(row[18], Math.max(morae, row[18].length));
    if (accent > 0 || row[18]) {
      result[key] = accent;
      found++;
    }
  }

  writeFileSync(OUT, JSON.stringify(result));
  console.log(`Saved ${found}/${words.size} pitch accents → src/data/pitch-accent.json`);
}

main().catch(e => {
  console.warn('fetch-pitch failed:', e.message);
  process.exit(0); // non-fatal — app hides accents without data
});
