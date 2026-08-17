#!/usr/bin/env node
/**
 * fetch-kanjivg.js
 * Downloads stroke path data for all 103 JLPT N5 kanji from KanjiVG
 * and writes them to src/data/kanjivg-strokes.json at build time.
 *
 * Run automatically before `vite dev` and `vite build`.
 */

import { writeFileSync, readFileSync, existsSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = join(__dirname, '../src/data/kanjivg-strokes.json');

// All 103 N5 kanji (must match KANJI array order in src/data/kanji.js)
const KANJI_LIST = [
  '一','二','三','四','五','六','七','八','九','十','百','千','万','半',
  '日','月','火','水','木','金','土','山','川','天','雨','空','花','魚',
  '東','西','南','北',
  '上','下','中','外','間','先','前','後','左','右',
  '人','女','男','子','父','母','友',
  '手','口','耳','目','足',
  '見','出','入','来','行','立','休','会','分','買','飲','食','読','書','話','聞','言','語',
  '年','週','毎','今','時','午',
  '大','小','少','多','長','高','新','古','安','白','円',
  '国','校','店','社','道','駅',
  '車','電','本','名','学','気','生','何',
];

const CDN = 'https://cdn.jsdelivr.net/gh/KanjiVG/kanjivg/kanji/';
const RAW = 'https://raw.githubusercontent.com/KanjiVG/kanjivg/main/kanji/';

function codepoint(ch) {
  return ch.codePointAt(0).toString(16).padStart(5, '0');
}

/**
 * Extract path `d` attributes from KanjiVG SVG text using regex.
 * KanjiVG SVGs have paths inside <g id="kvg:StrokePaths_..."> groups.
 */
function extractPaths(svgText) {
  // Find the StrokePaths group content
  const groupMatch = svgText.match(/id="kvg:StrokePaths[^"]*"[^>]*>([\s\S]*?)<\/g>/);
  const content = groupMatch ? groupMatch[1] : svgText;

  const paths = [];
  const pathRegex = /<path[^>]+\bd="([^"]+)"/g;
  let m;
  while ((m = pathRegex.exec(content)) !== null) {
    paths.push(m[1]);
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
  console.warn(`  ⚠  Could not fetch strokes for: ${ch} (U+${codepoint(ch)})`);
  return [];
}

async function main() {
  // If the file already exists and was generated recently (< 7 days), skip
  if (existsSync(OUT)) {
    const stat = readFileSync(OUT);
    try {
      const data = JSON.parse(stat);
      const keys = Object.keys(data);
      if (keys.length === KANJI_LIST.length) {
        console.log('✓ KanjiVG strokes already cached — skipping fetch.');
        return;
      }
    } catch (_) {}
  }

  console.log(`⬇  Fetching KanjiVG stroke data for ${KANJI_LIST.length} kanji…`);
  const result = {};
  let ok = 0;

  // Fetch in small batches to be polite to the CDN
  const BATCH = 8;
  for (let i = 0; i < KANJI_LIST.length; i += BATCH) {
    const batch = KANJI_LIST.slice(i, i + BATCH);
    await Promise.all(
      batch.map(async (ch) => {
        const paths = await fetchKanji(ch);
        result[ch] = paths;
        if (paths.length) ok++;
        process.stdout.write(`\r  ${i + batch.length}/${KANJI_LIST.length} fetched…`);
      })
    );
  }

  // Ensure output directory exists
  const dir = dirname(OUT);
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });

  writeFileSync(OUT, JSON.stringify(result, null, 0));
  console.log(`\n✅ Saved ${ok}/${KANJI_LIST.length} kanji stroke sets → src/data/kanjivg-strokes.json`);
}

main().catch((e) => { console.error(e); process.exit(1); });
