import { defineConfig } from 'vite';

const WOTD_UPSTREAM = 'https://www.innovativelanguage.com/widgets/wotd/large.php';

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

function wotdPlugin() {
  const mount = (server) => {
    server.middlewares.use((req, res, next) => {
      const url = (req.url || '').split('?')[0];
      if (url !== '/api/wotd') return next();
      if (req.method !== 'GET' && req.method !== 'HEAD') return next();
      proxyWotd(req, res);
    });
  };
  return {
    name: 'wotd-api',
    configureServer: mount,
    configurePreviewServer: mount,
  };
}

export default defineConfig({
  root: '.',
  publicDir: 'public',
  plugins: [wotdPlugin()],
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
