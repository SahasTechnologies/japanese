import { defineConfig } from 'vite';

const WOTD_UPSTREAM = 'https://www.innovativelanguage.com/widgets/wotd/large.php';
const MURF_VOICE = 'VM017394160576626PQ';
const MURF_STYLE = 'Conversational';

async function proxyWotd(_req, res) {
  try {
    const up = await fetch(WOTD_UPSTREAM, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': 'JapaneseStudy/1.0 (Word of the Day proxy)',
        Accept: 'text/html',
      },
      body: 'language=Japanese&date=&affiliate_id=',
    });
    const html = await up.text();
    res.statusCode = up.ok ? 200 : 502;
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Cache-Control', 'public, max-age=300');
    res.end(html);
  } catch {
    res.statusCode = 502;
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.end('Word of the Day upstream failed');
  }
}

async function proxyTts(req, res) {
  try {
    const u = new URL(req.url, 'http://localhost');
    const text = (u.searchParams.get('text') || '').trim();
    if (!text || text.length > 300) {
      res.statusCode = 400;
      res.end('Bad text');
      return;
    }
    const murf = `https://murf.ai/Prod/anonymous-tts/audio?text=${encodeURIComponent(text)}&voiceId=${MURF_VOICE}&style=${MURF_STYLE}`;
    const up = await fetch(murf, {
      headers: {
        'User-Agent': 'Mozilla/5.0',
        Accept: 'audio/mpeg,audio/*;q=0.9,*/*;q=0.5',
        Referer: 'https://murf.ai/text-to-speech/japanese',
      },
    });
    if (!up.ok) {
      res.statusCode = 502;
      res.end('TTS upstream error');
      return;
    }
    const buf = Buffer.from(await up.arrayBuffer());
    if (!buf.length) {
      res.statusCode = 502;
      res.end('Empty TTS');
      return;
    }
    res.statusCode = 200;
    res.setHeader('Content-Type', 'audio/mpeg');
    res.setHeader('Cache-Control', 'public, max-age=86400');
    res.setHeader('Content-Length', String(buf.length));
    res.end(buf);
  } catch {
    res.statusCode = 502;
    res.end('TTS unavailable');
  }
}

function apiPlugin() {
  const mount = (server) => {
    server.middlewares.use((req, res, next) => {
      const path = (req.url || '').split('?')[0];
      if (req.method !== 'GET' && req.method !== 'HEAD') return next();
      if (path === '/api/wotd') return proxyWotd(req, res);
      if (path === '/api/tts') return proxyTts(req, res);
      next();
    });
  };
  return {
    name: 'study-api',
    configureServer: mount,
    configurePreviewServer: mount,
  };
}

export default defineConfig({
  root: '.',
  publicDir: 'public',
  plugins: [apiPlugin()],
  server: {
    host: '0.0.0.0',
    port: Number(process.env.PORT) || 5173,
  },
  preview: {
    host: '0.0.0.0',
    port: Number(process.env.PORT) || 4173,
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },
});
