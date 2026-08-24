/**
 * Japanese Word of the Day.
 *
 * Source content is not ours to hardcode — it's fetched live each day from
 * innovativelanguage.com's public WOTD widget and parsed from the HTML it
 * returns. That endpoint doesn't send CORS headers, so instead of relying on
 * public CORS-proxy relays (flaky, rate-limited, and outside our control),
 * the actual fetch happens server-side:
 *
 *   - Production: Cloudflare Pages Function at functions/api/wotd.js
 *   - Local / preview: Vite middleware in vite.config.js
 *
 * Both expose GET /api/wotd as a same-origin request. The function also
 * caches the upstream response at Cloudflare's edge for 12 hours.
 *
 * Audio is not generated: the widget already embeds JapanesePod101 mp3s on
 * CloudFront (a.wotd-widget-sentence-main-space-sound). We parse those URLs
 * and play them directly.
 *
 * The parsed result (including audio URLs) is cached in localStorage for the
 * rest of the day, so a given browser only calls /api/wotd once daily.
 */

const WOTD_ENDPOINT = '/api/wotd';
// v3: discard entries cached before the server aligned its cache expiry to the
// daily word rollover — those could pin yesterday's word under today's date.
const CACHE_KEY = 'n5app-wotd-v3';

function todayKey() {
  const d = new Date();
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
}

function fetchWithTimeout(url, ms) {
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), ms);
  // no-cache: revalidate with the function instead of trusting a stored
  // browser-cached copy (older deployments sent a 12h Cache-Control)
  return fetch(url, { signal: controller.signal, cache: 'no-cache' }).finally(() => clearTimeout(t));
}

function audioHref(el) {
  if (!el) return '';
  const a = el.querySelector('a.jp-audio-track, a.wotd-widget-sentence-main-space-sound');
  const href = a?.getAttribute('href') || '';
  return /^https?:\/\//i.test(href) ? href : '';
}

function parseWotdHtml(html) {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  const up = doc.querySelector('.wotd-widget-container-up');
  if (!up) return null;

  const word = up.querySelector('.wotd-widget-sentence-main-space-text')?.textContent.trim();
  const texts = [...up.querySelectorAll('.wotd-widget-sentence-quizmode-space-text')].map(e => e.textContent.trim());
  const [kana, romaji, english, pos] = texts;
  if (!word || !kana || !english) return null;

  const audio = audioHref(up.querySelector('.wotd-widget-sentence-main-space')) || audioHref(up);

  let example = null;
  const downBlock = doc.querySelector('.wotd-widget-container-down .wotd-widget-sentence-down-space');
  const downQuiz = downBlock?.nextElementSibling;
  if (downBlock && downQuiz) {
    const exJp = downBlock.querySelector('.wotd-widget-sentence-main-space-text')?.textContent.trim();
    const exTexts = [...downQuiz.querySelectorAll('.wotd-widget-sentence-quizmode-space-text')].map(e => e.textContent.trim());
    if (exJp && exTexts.length >= 2) {
      example = {
        jp: exJp,
        kana: exTexts[0],
        en: exTexts[exTexts.length - 1],
        audio: audioHref(downBlock),
      };
    }
  }

  return { word, kana, romaji, english, pos: pos || '', audio, example };
}

/** Returns the parsed word-of-the-day object, or null if it couldn't be fetched. */
export async function fetchWordOfTheDay() {
  try {
    const cached = JSON.parse(localStorage.getItem(CACHE_KEY) || 'null');
    if (cached && cached._key === todayKey() && cached.data) return cached.data;
  } catch (_) { /* ignore cache errors */ }

  try {
    const res = await fetchWithTimeout(WOTD_ENDPOINT, 8000);
    if (res.ok) {
      const html = await res.text();
      const data = parseWotdHtml(html);
      if (data) {
        try { localStorage.setItem(CACHE_KEY, JSON.stringify({ _key: todayKey(), data })); } catch (_) {}
        return data;
      }
    }
  } catch (_) { /* endpoint unavailable */ }

  return null;
}
