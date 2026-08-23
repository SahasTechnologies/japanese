/**
 * Cloudflare Pages Function — Japanese Word of the Day proxy.
 *
 * JapanesePod101's public WOTD widget (innovativelanguage.com) does not send
 * CORS headers, so the browser cannot fetch it directly. This function POSTs
 * to their large-widget endpoint server-side and returns the HTML fragment
 * the client already knows how to parse. Cached at the edge for 12 hours.
 *
 * Route: GET /api/wotd
 */
const UPSTREAM = 'https://www.innovativelanguage.com/widgets/wotd/large.php';

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

    const html = await up.text();
    return new Response(html, {
      status: 200,
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'public, s-maxage=43200, stale-while-revalidate=86400',
      },
    });
  } catch {
    return new Response('Word of the Day unavailable', { status: 502 });
  }
}
