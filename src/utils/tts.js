/**
 * All spoken audio goes through here.
 *
 * Word of the Day: play the JapanesePod101 mp3 URL parsed from the widget
 * (CloudFront). Everything else: on-demand Murf voice via same-origin
 * /api/tts (Cloudflare Pages Function in production, Vite middleware locally),
 * with Web Speech API as a fallback. We do not bake hundreds of generated
 * clips into the repo — that would bloat git, slow every build, and depend
 * on an unofficial demo endpoint at generate-time.
 */

const TTS_ENDPOINT = '/api/tts';
const MURF_MAX_CHARS = 300;

let currentAudio = null;

function stop() {
  if (currentAudio) {
    try {
      currentAudio.pause();
      currentAudio.removeAttribute('src');
      currentAudio.load();
    } catch (_) { /* ignore */ }
    currentAudio = null;
  }
  if (typeof speechSynthesis !== 'undefined') {
    try { speechSynthesis.cancel(); } catch (_) {}
  }
}

function speakBrowser(text, rate, opts = {}) {
  if (typeof speechSynthesis === 'undefined') { opts.onerror?.(); return; }
  try {
    const utt = new SpeechSynthesisUtterance(text);
    utt.lang = 'ja-JP';
    utt.rate = rate;
    const voices = speechSynthesis.getVoices();
    const ja = voices.find(v => v.lang.startsWith('ja') && !v.name.includes('novelty'));
    if (ja) utt.voice = ja;
    if (opts.onstart) utt.onstart = () => opts.onstart();
    if (opts.onerror) utt.onerror = () => opts.onerror();
    speechSynthesis.speak(utt);
  } catch (_) { opts.onerror?.(); }
}

function playUrl(url, rate, fallbackText, opts = {}) {
  const audio = new Audio(url);
  audio.preload = 'auto';
  audio.playbackRate = Math.min(2, Math.max(0.5, rate || 1));
  currentAudio = audio;
  const cleanup = () => { if (currentAudio === audio) currentAudio = null; };
  const fallback = () => {
    cleanup();
    opts.onerror?.();
    if (fallbackText) speakBrowser(fallbackText, rate, opts);
  };
  audio.addEventListener('error', fallback, { once: true });
  if (opts.onstart) audio.addEventListener('playing', () => opts.onstart(), { once: true });
  audio.play().catch(fallback);
}

/** True: Murf proxy and/or Web Speech can produce audio. */
export const HAS_TTS = true;

/* Very short kana/kanji (single kana, single kanji, 2-char words) sound
   glitchy through the Murf proxy sometimes — the built-in browser voice
   handles those instantly and reliably. */
const SHORT_TEXT_RE = /^[\u3040-\u30ff\u4e00-\u9faf]+$/;
function isVeryShort(text) {
  return text.length <= 3 && SHORT_TEXT_RE.test(text);
}

/**
 * Speak Japanese. If `text` is an http(s) URL, that file is played directly
 * (used for Word of the Day). Very short kana/kanji use the browser's built-in
 * speech; everything else goes through the Murf proxy.
 * @param {string} text
 * @param {number} [rate=1]
 * @param {{onstart?: ()=>void, onerror?: ()=>void}} [opts] - lifecycle callbacks
 */
export function speak(text, rate = 1, opts = {}) {
  if (!text) { opts.onerror?.(); return; }
  stop();

  if (/^https?:\/\//i.test(text)) {
    playUrl(text, rate, null, opts);
    return;
  }

  const clipped = text.length > MURF_MAX_CHARS ? text.slice(0, MURF_MAX_CHARS) : text;
  if (isVeryShort(clipped)) {
    speakBrowser(clipped, rate, opts);
    return;
  }
  const url = `${TTS_ENDPOINT}?text=${encodeURIComponent(clipped)}`;
  playUrl(url, rate, clipped, opts);
}

/**
 * Speak and show a loading spinner on `btn` while the audio loads (the /api/tts
 * fetch can take a moment). The spinner only appears if audio hasn't started
 * within ~200ms, so fast responses don't flash.
 * @param {string} text
 * @param {HTMLElement} [btn] - button/element that triggered the speech
 * @param {number} [rate=1]
 */
export function speakWithBtn(text, btn, rate = 1) {
  if (!btn || !text) { speak(text, rate); return; }
  let pending = true;
  const spinnerTimer = setTimeout(() => {
    if (pending) btn.classList.add('speak-loading');
  }, 200);
  const done = () => {
    if (!pending) return;
    pending = false;
    clearTimeout(spinnerTimer);
    clearTimeout(failsafe);
    btn.classList.remove('speak-loading');
  };
  // Never leave the spinner stuck if the engine never fires events
  const failsafe = setTimeout(done, 10000);
  speak(text, rate, { onstart: done, onerror: done });
}
