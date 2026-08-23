/**
 * Cloudflare Pages Function — on-demand Japanese TTS (Murf conversational).
 *
 * The Murf demo endpoint does not send CORS headers for this origin, so the
 * browser cannot call it directly. We fetch server-side and cache the mp3 at
 * the edge for a week. Not used for Word of the Day (that plays JapanesePod101's
 * own CloudFront URLs).
 *
 * Route: GET /api/tts?text=...
 */
const VOICE_ID = 'VM017394160576626PQ';
const STYLE = 'Conversational';
const MAX_LEN = 300;

export async function onRequestGet(context) {
  const url = new URL(context.request.url);
  const text = (url.searchParams.get('text') || '').trim();
  if (!text || text.length > MAX_LEN) {
    return new Response('Bad text', { status: 400 });
  }

  const murf = `https://murf.ai/Prod/anonymous-tts/audio?text=${encodeURIComponent(text)}&voiceId=${VOICE_ID}&style=${STYLE}`;
  try {
    const up = await fetch(murf, {
      headers: {
        'User-Agent': 'Mozilla/5.0',
        Accept: 'audio/mpeg,audio/*;q=0.9,*/*;q=0.5',
        Referer: 'https://murf.ai/text-to-speech/japanese',
      },
    });
    if (!up.ok) return new Response('TTS upstream error', { status: 502 });
    const buf = await up.arrayBuffer();
    if (!buf.byteLength) return new Response('Empty TTS', { status: 502 });
    return new Response(buf, {
      status: 200,
      headers: {
        'Content-Type': 'audio/mpeg',
        'Cache-Control': 'public, s-maxage=604800, max-age=86400',
      },
    });
  } catch {
    return new Response('TTS unavailable', { status: 502 });
  }
}
