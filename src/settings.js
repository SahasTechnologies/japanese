/**
 * Settings panel — theme, custom colours, fonts, and progress reset.
 * Replaces the old header theme-toggle + reset buttons.
 */

import { resetState } from './state.js';

const SETTINGS_KEY = 'n5app-settings';
const LEGACY_THEME_KEY = 'n5-theme';

const LIGHT_COLORS = {
  paper: '#f5f0e4',
  card: '#fffdf7',
  ink: '#23211c',
  ink2: '#6e675c',
  line: '#e6ddc8',
  red: '#c73e2e',
  btnBg: '#23211c',
  btnFg: '#ffffff',
};

const DARK_COLORS = {
  paper: '#1a1814',
  card: '#24201c',
  ink: '#f0ebe0',
  ink2: '#a89f8e',
  line: '#3a342c',
  red: '#e05a4a',
  btnBg: '#e8e0d4',
  btnFg: '#1a1814',
};

const COLOR_FIELDS = [
  { key: 'paper', label: 'Background' },
  { key: 'card', label: 'Cards' },
  { key: 'ink', label: 'Text' },
  { key: 'ink2', label: 'Muted text' },
  { key: 'line', label: 'Borders' },
  { key: 'red', label: 'Accent' },
  { key: 'btnBg', label: 'Button' },
  { key: 'btnFg', label: 'Button text' },
];

const JP_FONTS = [
  { id: 'shippori-mincho', name: 'Shippori Mincho — traditional', family: "'Shippori Mincho', serif", href: 'https://fonts.googleapis.com/css2?family=Shippori+Mincho:wght@400;600;800&display=swap' },
  { id: 'noto-serif-jp', name: 'Noto Serif JP — print serif', family: "'Noto Serif JP', serif", href: 'https://fonts.googleapis.com/css2?family=Noto+Serif+JP:wght@400;600;700&display=swap' },
  { id: 'noto-sans-jp', name: 'Noto Sans JP — clean gothic', family: "'Noto Sans JP', sans-serif", href: 'https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@400;500;700&display=swap' },
  { id: 'biz-udpgothic', name: 'BIZ UDPGothic — textbook', family: "'BIZ UDPGothic', sans-serif", href: 'https://fonts.googleapis.com/css2?family=BIZ+UDPGothic:wght@400;700&display=swap' },
  { id: 'klee-one', name: 'Klee One — handwriting', family: "'Klee One', serif", href: 'https://fonts.googleapis.com/css2?family=Klee+One:wght@400;600&display=swap' },
  { id: 'kiwi-maru', name: 'Kiwi Maru — rounded', family: "'Kiwi Maru', serif", href: 'https://fonts.googleapis.com/css2?family=Kiwi+Maru:wght@400;500&display=swap' },
  { id: 'zen-maru', name: 'Zen Maru Gothic — rounded gothic', family: "'Zen Maru Gothic', sans-serif", href: 'https://fonts.googleapis.com/css2?family=Zen+Maru+Gothic:wght@400;500;700&display=swap' },
  { id: 'hina-mincho', name: 'Hina Mincho — decorative', family: "'Hina Mincho', serif", href: 'https://fonts.googleapis.com/css2?family=Hina+Mincho&display=swap' },
  { id: 'yuji-syuku', name: 'Yuji Syuku — brush', family: "'Yuji Syuku', serif", href: 'https://fonts.googleapis.com/css2?family=Yuji+Syuku&display=swap' },
];

const UI_FONTS = [
  { id: 'noto-sans-jp', name: 'Noto Sans JP', family: "'Noto Sans JP', sans-serif", href: 'https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@400;500;700&display=swap' },
  { id: 'ibm-plex-sans-jp', name: 'IBM Plex Sans JP', family: "'IBM Plex Sans JP', sans-serif", href: 'https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+JP:wght@400;500;600&display=swap' },
  { id: 'zen-kaku', name: 'Zen Kaku Gothic New', family: "'Zen Kaku Gothic New', sans-serif", href: 'https://fonts.googleapis.com/css2?family=Zen+Kaku+Gothic+New:wght@400;500;700&display=swap' },
  { id: 'mplus-1p', name: 'M PLUS 1p', family: "'M PLUS 1p', sans-serif", href: 'https://fonts.googleapis.com/css2?family=M+PLUS+1p:wght@400;500;700&display=swap' },
  { id: 'kosugi-maru', name: 'Kosugi Maru', family: "'Kosugi Maru', sans-serif", href: 'https://fonts.googleapis.com/css2?family=Kosugi+Maru&display=swap' },
  { id: 'system', name: 'System UI', family: 'system-ui, -apple-system, "Segoe UI", sans-serif', href: null },
];

const DEFAULTS = {
  theme: 'light',
  colors: { ...LIGHT_COLORS },
  jpFont: 'shippori-mincho',
  uiFont: 'noto-sans-jp',
};

let onResetProgress = null;

function loadSettings() {
  let s = { ...DEFAULTS, colors: { ...LIGHT_COLORS } };
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      s = {
        ...s,
        ...parsed,
        colors: { ...LIGHT_COLORS, ...(parsed.colors || {}) },
      };
    } else {
      const legacy = localStorage.getItem(LEGACY_THEME_KEY);
      if (legacy === 'dark' || legacy === 'light') s.theme = legacy;
      else if (window.matchMedia('(prefers-color-scheme: dark)').matches) s.theme = 'dark';
      if (s.theme === 'dark') s.colors = { ...DARK_COLORS };
    }
  } catch (_) { /* ignore */ }
  if (!['light', 'dark', 'custom'].includes(s.theme)) s.theme = 'light';
  if (!JP_FONTS.some(f => f.id === s.jpFont)) s.jpFont = DEFAULTS.jpFont;
  if (!UI_FONTS.some(f => f.id === s.uiFont)) s.uiFont = DEFAULTS.uiFont;
  return s;
}

function saveSettings(s) {
  try { localStorage.setItem(SETTINGS_KEY, JSON.stringify(s)); } catch (_) {}
}

function hexToRgb(hex) {
  const n = String(hex || '').replace('#', '');
  if (n.length !== 6) return [0, 0, 0];
  return [parseInt(n.slice(0, 2), 16), parseInt(n.slice(2, 4), 16), parseInt(n.slice(4, 6), 16)];
}

function rgbToHex(r, g, b) {
  const c = (x) => Math.max(0, Math.min(255, Math.round(x))).toString(16).padStart(2, '0');
  return `#${c(r)}${c(g)}${c(b)}`;
}

function mix(a, b, t) {
  const A = hexToRgb(a);
  const B = hexToRgb(b);
  return rgbToHex(A[0] + (B[0] - A[0]) * t, A[1] + (B[1] - A[1]) * t, A[2] + (B[2] - A[2]) * t);
}

function luminance(hex) {
  const [r, g, b] = hexToRgb(hex);
  return (r * 299 + g * 587 + b * 114) / 1000;
}

function loadFont(id, href) {
  if (!href) return;
  const tagId = `font-dyn-${id}`;
  if (document.getElementById(tagId)) return;
  const link = document.createElement('link');
  link.id = tagId;
  link.rel = 'stylesheet';
  link.href = href;
  document.head.appendChild(link);
}

function applyColors(theme, colors) {
  const root = document.documentElement;
  const palette = theme === 'dark' ? DARK_COLORS : theme === 'light' ? LIGHT_COLORS : colors;

  if (theme === 'custom') {
    root.setAttribute('data-theme', luminance(palette.paper) < 140 ? 'dark' : 'light');
    const redDeep = mix(palette.red, '#000000', 0.22);
    const redSoft = mix(palette.red, palette.card, 0.88);
    const lineHover = mix(palette.line, palette.ink, 0.18);
    const surface = mix(palette.card, palette.paper, 0.45);
    const [pr, pg, pb] = hexToRgb(palette.paper);
    root.style.setProperty('--paper', palette.paper);
    root.style.setProperty('--card', palette.card);
    root.style.setProperty('--ink', palette.ink);
    root.style.setProperty('--ink2', palette.ink2);
    root.style.setProperty('--line', palette.line);
    root.style.setProperty('--line-hover', lineHover);
    root.style.setProperty('--red', palette.red);
    root.style.setProperty('--red-deep', redDeep);
    root.style.setProperty('--red-soft', redSoft);
    root.style.setProperty('--header-bg', `rgba(${pr}, ${pg}, ${pb}, 0.94)`);
    root.style.setProperty('--surface-soft', surface);
    root.style.setProperty('--canvas-bg', mix(palette.card, palette.paper, 0.25));
    root.style.setProperty('--stroke-ink', palette.ink);
    root.style.setProperty('--btn-primary-bg', palette.btnBg);
    root.style.setProperty('--btn-primary-fg', palette.btnFg);
    root.style.setProperty('--btn-primary-hover', mix(palette.btnBg, palette.ink, 0.15));
  } else {
    root.setAttribute('data-theme', theme);
    [
      '--paper', '--card', '--ink', '--ink2', '--line', '--line-hover',
      '--red', '--red-deep', '--red-soft', '--header-bg', '--surface-soft',
      '--canvas-bg', '--stroke-ink', '--btn-primary-bg', '--btn-primary-fg',
      '--btn-primary-hover',
    ].forEach(v => root.style.removeProperty(v));
  }
}

function applyFonts(jpId, uiId) {
  const jp = JP_FONTS.find(f => f.id === jpId) || JP_FONTS[0];
  const ui = UI_FONTS.find(f => f.id === uiId) || UI_FONTS[0];
  loadFont(jp.id, jp.href);
  loadFont(ui.id, ui.href);
  const root = document.documentElement;
  root.style.setProperty('--serif', jp.family);
  root.style.setProperty('--sans', ui.family);
}

export function applySettings(s) {
  applyColors(s.theme, s.colors);
  applyFonts(s.jpFont, s.uiFont);
}

function optionsHtml(list, selected) {
  return list.map(f => `<option value="${f.id}" ${f.id === selected ? 'selected' : ''}>${f.name}</option>`).join('');
}

function colorRowHtml(field, value) {
  return `
    <label class="set-color">
      <span class="set-color-swatch">
        <input type="color" data-color="${field.key}" value="${value}" aria-label="${field.label}">
      </span>
      <span class="set-color-meta">
        <span class="set-color-label">${field.label}</span>
        <span class="set-color-hex" data-hex="${field.key}">${value}</span>
      </span>
    </label>`;
}

function renderDialog(s) {
  const customHidden = s.theme === 'custom' ? '' : 'hidden';
  return `
    <div class="set-panel">
      <div class="set-head">
        <div>
          <div class="set-title">Settings</div>
          <div class="set-sub">Appearance, type, and progress</div>
        </div>
        <button type="button" class="btn icon-btn" id="settingsClose" aria-label="Close settings">
          <ion-icon name="close-outline"></ion-icon>
        </button>
      </div>

      <section class="set-section">
        <h3 class="set-h">Theme</h3>
        <div class="set-seg" role="radiogroup" aria-label="Theme">
          ${['light', 'dark', 'custom'].map(t => `
            <button type="button" class="set-seg-btn ${s.theme === t ? 'on' : ''}" data-theme="${t}">
              ${t[0].toUpperCase() + t.slice(1)}
            </button>`).join('')}
        </div>
        <div class="set-colors ${customHidden}" id="setColors">
          ${COLOR_FIELDS.map(f => colorRowHtml(f, s.colors[f.key] || LIGHT_COLORS[f.key])).join('')}
        </div>
      </section>

      <section class="set-section">
        <h3 class="set-h">Fonts</h3>
        <p class="set-hint">Japanese text is used for kanji, kana, and headings. Switch away from a handwriting face if characters are hard to read.</p>
        <label class="set-field">
          <span>Japanese text</span>
          <select id="setJpFont">${optionsHtml(JP_FONTS, s.jpFont)}</select>
        </label>
        <label class="set-field">
          <span>Interface</span>
          <select id="setUiFont">${optionsHtml(UI_FONTS, s.uiFont)}</select>
        </label>
        <div class="set-preview" id="setPreview">
          <div class="set-preview-jp">日本語の漢字　ひらがな　カタカナ</div>
          <div class="set-preview-ui">The quick brown fox — 漢字が読める</div>
        </div>
      </section>

      <section class="set-section set-danger">
        <h3 class="set-h">Progress</h3>
        <p class="set-hint">Clears best scores, learned lists, and flashcard piles on this device. Settings are kept.</p>
        <button type="button" class="btn red" id="setReset">Reset all progress</button>
      </section>
    </div>`;
}

function bindDialog(dialog, getS, setS) {
  const close = () => dialog.open && dialog.close();
  dialog.querySelector('#settingsClose')?.addEventListener('click', close);
  dialog.addEventListener('click', (e) => {
    if (e.target === dialog) close();
  });

  dialog.querySelectorAll('[data-theme]').forEach(btn => {
    btn.addEventListener('click', () => {
      const s = getS();
      s.theme = btn.getAttribute('data-theme');
      if (s.theme === 'light') s.colors = { ...LIGHT_COLORS };
      if (s.theme === 'dark') s.colors = { ...DARK_COLORS };
      setS(s);
      dialog.innerHTML = renderDialog(s);
      bindDialog(dialog, getS, setS);
    });
  });

  dialog.querySelectorAll('[data-color]').forEach(input => {
    input.addEventListener('input', () => {
      const s = getS();
      s.theme = 'custom';
      s.colors[input.getAttribute('data-color')] = input.value;
      const hex = dialog.querySelector(`[data-hex="${input.getAttribute('data-color')}"]`);
      if (hex) hex.textContent = input.value;
      setS(s);
    });
  });

  const jpSel = dialog.querySelector('#setJpFont');
  const uiSel = dialog.querySelector('#setUiFont');
  if (jpSel) jpSel.addEventListener('change', () => {
    const s = getS();
    s.jpFont = jpSel.value;
    setS(s);
  });
  if (uiSel) uiSel.addEventListener('change', () => {
    const s = getS();
    s.uiFont = uiSel.value;
    setS(s);
  });

  dialog.querySelector('#setReset')?.addEventListener('click', () => {
    if (!window.confirm('Reset all your Japanese study progress (JLPT N5 + Coursework)? Settings will be kept.')) return;
    resetState();
    close();
    if (typeof onResetProgress === 'function') onResetProgress();
  });
}

export function initSettings({ onReset } = {}) {
  onResetProgress = onReset || null;
  let s = loadSettings();
  applySettings(s);

  const dialog = document.createElement('dialog');
  dialog.id = 'settingsDialog';
  dialog.className = 'settings-dialog';
  dialog.innerHTML = renderDialog(s);
  document.body.appendChild(dialog);

  const getS = () => s;
  const setS = (next) => {
    s = next;
    saveSettings(s);
    applySettings(s);
  };
  bindDialog(dialog, getS, setS);

  const btn = document.getElementById('settingsBtn');
  if (btn) {
    btn.addEventListener('click', () => {
      dialog.innerHTML = renderDialog(s);
      bindDialog(dialog, getS, setS);
      if (typeof dialog.showModal === 'function') dialog.showModal();
      else dialog.setAttribute('open', '');
    });
  }
}
