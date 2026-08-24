/**
 * Cloudflare Pages Function — Japanese Word of the Day proxy.
 *
 * JapanesePod101's public WOTD widget (innovativelanguage.com) does not send
 * CORS headers, so the browser cannot fetch it directly. This function POSTs
 * to their large-widget endpoint server-side and returns the HTML fragment
 * the client already knows how to parse.
 *
 * Caching is aligned to the word's daily rollover: the response is cached
 * only until the next midnight in Japan (UTC+9), never across it. A rolling
 * TTL here would let yesterday's word leak into today (and the client would
 * then pin it for the whole day), so stale-while-revalidate is deliberately
 * not used.
 *
 * Route: GET /api/wotd
 */
const UPSTREAM = 'https://www.innovativelanguage.com/widgets/wotd/large.php';

/** Seconds from now until the next 15:00 UTC (= midnight Japan), 60s–24h. */
function secondsUntilJstMidnight() {
  const now = new Date();
  const next = new Date(Date.UTC(
    now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 15, 0, 0
  ));
  if (now.getUTCHours() >= 15) next.setUTCDate(next.getUTCDate() + 1);
  const secs = Math.floor((next.getTime() - now.getTime()) / 1000);
  return Math.min(Math.max(secs, 60), 86400);
}

export async function onRequestGet() {
  try {
    const up = await fetch(UPSTREAM, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': 'JapaneseStudy/1.0 (Word of the Day proxy)',
        Accept: 'text/html',
      },
      body: 'language=Japanese&date=&affiliate_id=',
    });

    if (!up.ok) {
      return new Response('Upstream error', { status: 502 });
    }

    const maxAge = secondsUntilJstMidnight();
    const html = await up.text();
    return new Response(html, {
      status: 200,
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': `public, max-age=${maxAge}, s-maxage=${maxAge}`,
      },
    });
  } catch {
    return new Response('Word of the Day unavailable', { status: 502 });
  }
}
