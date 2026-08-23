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

function speakBrowser(text, rate) {
  if (typeof speechSynthesis === 'undefined') return;
  try {
    const utt = new SpeechSynthesisUtterance(text);
    utt.lang = 'ja-JP';
    utt.rate = rate;
    const voices = speechSynthesis.getVoices();
    const ja = voices.find(v => v.lang.startsWith('ja') && !v.name.includes('novelty'));
    if (ja) utt.voice = ja;
    speechSynthesis.speak(utt);
  } catch (_) {}
}

function playUrl(url, rate, fallbackText) {
  const audio = new Audio(url);
  audio.preload = 'auto';
  audio.playbackRate = Math.min(2, Math.max(0.5, rate || 1));
  currentAudio = audio;
  const fallback = () => {
    if (currentAudio === audio) currentAudio = null;
    if (fallbackText) speakBrowser(fallbackText, rate);
  };
  audio.addEventListener('error', fallback, { once: true });
  audio.play().catch(fallback);
}

/** True: Murf proxy and/or Web Speech can produce audio. */
export const HAS_TTS = true;

/**
 * Speak Japanese. If `text` is an http(s) URL, that file is played directly
 * (used for Word of the Day). Otherwise the Murf proxy is used.
 * @param {string} text
 * @param {number} [rate=1]
 */
export function speak(text, rate = 1) {
  if (!text) return;
  stop();

  if (/^https?:\/\//i.test(text)) {
    playUrl(text, rate);
    return;
  }

  const clipped = text.length > MURF_MAX_CHARS ? text.slice(0, MURF_MAX_CHARS) : text;
  const url = `${TTS_ENDPOINT}?text=${encodeURIComponent(clipped)}`;
  playUrl(url, rate, clipped);
}
