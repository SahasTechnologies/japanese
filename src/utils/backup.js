/**
 * Encrypted progress backup.
 *
 * Export produces a single-line file:  JPS1.<iv>.<ciphertext>  (base64).
 * The payload is AES-256-GCM encrypted with a key derived via PBKDF2 from a
 * secret baked into the app bundle, so the file reads as random data and
 * cannot be inspected or hand-edited without the key, and GCM's auth tag
 * rejects any tampering or truncation.
 *
 * This is deliberately strong obfuscation, not DRM: the key ships with the
 * app, so a determined person could extract it from the bundle. The goal is
 * that the file itself reveals nothing and can't be casually forged.
 */
import { getState } from '../state.js';

const MAGIC = 'JPS1';
const SECRET = 'japanese-study|v1|7Kp2Qx9mW4nR8tZ3eY6uJ1cF5aH0sL';
const SALT_B64 = 'cHJvZ3Jlc3MtYmFja3VwLXYxLXN0YXRpYy1zYWx0'; // fixed, versioned with MAGIC

let _keyPromise = null;

function getKey() {
  if (!_keyPromise) {
    _keyPromise = (async () => {
      const enc = new TextEncoder();
      const salt = Uint8Array.from(atob(SALT_B64), c => c.charCodeAt(0));
      const base = await crypto.subtle.importKey('raw', enc.encode(SECRET), 'PBKDF2', false, ['deriveKey']);
      return crypto.subtle.deriveKey(
        { name: 'PBKDF2', salt, iterations: 150_000, hash: 'SHA-256' },
        base,
        { name: 'AES-GCM', length: 256 },
        false,
        ['encrypt', 'decrypt'],
      );
    })();
  }
  return _keyPromise;
}

function b64(buf) {
  const bytes = new Uint8Array(buf);
  let bin = '';
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin);
}

function unb64(s) {
  const bin = atob(s);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

/** Build the encrypted backup string from current progress. */
export async function exportProgressString() {
  const key = await getKey();
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const payload = { v: 1, exported: new Date().toISOString(), p: getState() };
  const ct = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    new TextEncoder().encode(JSON.stringify(payload)),
  );
  return `${MAGIC}.${b64(iv)}.${b64(ct)}`;
}

/**
 * Parse + decrypt a backup string.
 * @returns {Promise<{ok: true, state: object} | {ok: false, error: string}>}
 */
export async function importProgressString(str) {
  try {
    const parts = String(str || '').trim().split('.');
    if (parts.length !== 3 || parts[0] !== MAGIC) {
      return { ok: false, error: 'That doesn’t look like a progress backup file.' };
    }
    const key = await getKey();
    const pt = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: unb64(parts[1]) },
      key,
      unb64(parts[2]),
    );
    const payload = JSON.parse(new TextDecoder().decode(pt));
    if (!payload || typeof payload !== 'object' || !payload.p || typeof payload.p !== 'object') {
      return { ok: false, error: 'Backup is damaged or incomplete.' };
    }
    return { ok: true, state: payload.p };
  } catch (_) {
    return { ok: false, error: 'Could not decrypt this file — it may be corrupted or edited.' };
  }
}
