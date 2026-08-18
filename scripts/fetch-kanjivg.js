#!/usr/bin/env node
/**
 * fetch-kanjivg.js
 * Downloads stroke path data for all JLPT N5 kanji from KanjiVG
 * and writes them to src/data/kanjivg-strokes.json at build time.
 *
 * Always runs on `npm run dev` and `npm run build` (no cache skip).
 * Source of truth for the character list: src/data/kanji.json
 */

import { writeFileSync, readFileSync, existsSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = join(__dirname, '../src/data/kanjivg-strokes.json');
const KANJI_JSON = join(__dirname, '../src/data/kanji.json');

const CDN = 'https://cdn.jsdelivr.net/gh/KanjiVG/kanjivg/kanji/';
const RAW = 'https://raw.githubusercontent.com/KanjiVG/kanjivg/main/kanji/';

function loadKanjiList() {
  if (!existsSync(KANJI_JSON)) {
    throw new Error(`Missing ${KANJI_JSON} — cannot determine N5 kanji list`);
  }
  const { KANJI } = JSON.parse(readFileSync(KANJI_JSON, 'utf8'));
  const list = KANJI.map(row => row[0]);
  return [...new Set(list)];
}

function codepoint(ch) {
  return ch.codePointAt(0).toString(16).padStart(5, '0');
}

/** Extract stroke path `d` attributes from a KanjiVG SVG (handles nested groups). */
function extractPaths(svgText) {
  const paths = [];
  const pathRegex = /<path[^>]+\bd="([^"]+)"/g;
  let m;
  while ((m = pathRegex.exec(svgText)) !== null) {
    if (/^[Mm][\d\s,.\-]+/.test(m[1])) paths.push(m[1]);
  }
  return paths;
}

async function fetchKanji(ch) {
  const cp = codepoint(ch);
  const urls = [`${CDN}${cp}.svg`, `${RAW}${cp}.svg`];
  for (const url of urls) {
    try {
      const res = await fetch(url);
      if (!res.ok) continue;
      const text = await res.text();
      if (!text.includes('<svg')) continue;
      const paths = extractPaths(text);
      if (paths.length > 0) return paths;
    } catch (_) {}
  }
  console.warn(`  Could not fetch strokes for: ${ch} (U+${codepoint(ch)})`);
  return [];
}

async function main() {
  const KANJI_LIST = loadKanjiList();
  console.log(`Fetching KanjiVG stroke data for ${KANJI_LIST.length} kanji (every build)…`);

  const result = {};
  let ok = 0;
  const BATCH = 8;

  for (let i = 0; i < KANJI_LIST.length; i += BATCH) {
    const batch = KANJI_LIST.slice(i, i + BATCH);
    await Promise.all(
      batch.map(async (ch) => {
        const paths = await fetchKanji(ch);
        result[ch] = paths;
        if (paths.length) ok++;
        process.stdout.write(`\r  ${Math.min(i + batch.length, KANJI_LIST.length)}/${KANJI_LIST.length} fetched…`);
      })
    );
  }

  const dir = dirname(OUT);
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });

  writeFileSync(OUT, JSON.stringify(result));
  console.log(`\nSaved ${ok}/${KANJI_LIST.length} kanji stroke sets → src/data/kanjivg-strokes.json`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
