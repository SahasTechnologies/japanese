/**
 * Japanese Word of the Day.
 *
 * Source content is not ours to hardcode — it's fetched live from
 * innovativelanguage.com's public WOTD widget each day and parsed from the
 * HTML it returns. Since that endpoint doesn't send CORS headers, we go
 * through a rotating list of public CORS proxies and use whichever answers
 * first; the result is cached in localStorage for the rest of the day so we
 * don't hit the proxies on every page load.
 */

const WOTD_URL = 'https://www.innovativelanguage.com/widgets/wotd/embed.php?language=Japanese&type=large&bg=%23FFFFFF&content=%23000&header=%23EB2A2E&highlight=%23F9F9FA&opacity=1&scrollbg=%2300CAED&sound=%2300ACED&text=%2300ACED&quiz=N';

const PROXIES = [
  url => `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`,
  url => `https://corsproxy.io/?url=${encodeURIComponent(url)}`,
  url => `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(url)}`,
  url => `https://thingproxy.freeboard.io/fetch/${url}`,
];

const CACHE_KEY = 'n5app-wotd';

function todayKey() {
  const d = new Date();
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
}

function fetchWithTimeout(url, ms) {
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), ms);
  return fetch(url, { signal: controller.signal }).finally(() => clearTimeout(t));
}

function parseWotdHtml(html) {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  const up = doc.querySelector('.wotd-widget-container-up');
  if (!up) return null;

  const word = up.querySelector('.wotd-widget-sentence-main-space-text')?.textContent.trim();
  const texts = [...up.querySelectorAll('.wotd-widget-sentence-quizmode-space-text')].map(e => e.textContent.trim());
  const [kana, romaji, english, pos] = texts;
  if (!word || !kana || !english) return null;

  let example = null;
  const downBlock = doc.querySelector('.wotd-widget-container-down .wotd-widget-sentence-down-space');
  const downQuiz = downBlock?.nextElementSibling;
  if (downBlock && downQuiz) {
    const exJp = downBlock.querySelector('.wotd-widget-sentence-main-space-text')?.textContent.trim();
    const exTexts = [...downQuiz.querySelectorAll('.wotd-widget-sentence-quizmode-space-text')].map(e => e.textContent.trim());
    if (exJp && exTexts.length >= 2) {
      example = { jp: exJp, kana: exTexts[0], en: exTexts[exTexts.length - 1] };
    }
  }

  return { word, kana, romaji, english, pos: pos || '' , example };
}

/** Returns the parsed word-of-the-day object, or null if every proxy failed. */
export async function fetchWordOfTheDay() {
  try {
    const cached = JSON.parse(localStorage.getItem(CACHE_KEY) || 'null');
    if (cached && cached._key === todayKey() && cached.data) return cached.data;
  } catch (_) { /* ignore cache errors */ }

  for (const buildProxy of PROXIES) {
    try {
      const res = await fetchWithTimeout(buildProxy(WOTD_URL), 7000);
      if (!res.ok) continue;
      const html = await res.text();
      const data = parseWotdHtml(html);
      if (data) {
        try { localStorage.setItem(CACHE_KEY, JSON.stringify({ _key: todayKey(), data })); } catch (_) {}
        return data;
      }
    } catch (_) { /* try the next proxy */ }
  }
  return null;
}
