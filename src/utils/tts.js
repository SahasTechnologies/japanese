/**
 * Text-to-speech utilities.
 * Wraps the Web Speech API with graceful fallback.
 */

export const HAS_TTS = 'speechSynthesis' in window;

let _voices = [];
if (HAS_TTS) {
  // Voices may not be loaded immediately
  const loadVoices = () => { _voices = speechSynthesis.getVoices(); };
  loadVoices();
  speechSynthesis.onvoiceschanged = loadVoices;
}

/**
 * Speak a Japanese string.
 * @param {string} text - Japanese text to speak
 * @param {number} [rate=1] - Speech rate (0.1–10)
 */
export function speak(text, rate = 1) {
  if (!HAS_TTS) return;
  try {
    speechSynthesis.cancel();
    const utt = new SpeechSynthesisUtterance(text);
    utt.lang = 'ja-JP';
    utt.rate = rate;

    // Prefer a Japanese voice if available
    const jaVoice = _voices.find(
      v => v.lang.startsWith('ja') && !v.name.includes('novelty')
    );
    if (jaVoice) utt.voice = jaVoice;

    speechSynthesis.speak(utt);
  } catch (_) {}
}
