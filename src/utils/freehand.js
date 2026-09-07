/**
 * A blank square the person can draw in freehand (canvas-based, no stroke
 * grading — this is for self-testing recall, not the guided KanjiVG tracer).
 * Includes Clear and a Reveal button; the answer is shown in its own area
 * next to the canvas (not overlaid), so a drawing made at any size/scale can
 * be compared side by side with the real glyph.
 *
 * @param {HTMLElement} root - container to mount into
 * @param {string} answer - the kanji/word to reveal for self-checking
 */
export function mountFreehandBox(root, answer) {
  root.innerHTML = `
    <div class="fhb">
      <div class="fhb-top">
        <div class="fhb-canvas-wrap">
          <canvas class="fhb-canvas" width="200" height="200"></canvas>
        </div>
        <div class="fhb-answer" data-role="reveal-area" role="img" aria-label="Correct answer: ${String(answer).replace(/"/g, '&quot;')}"></div>
      </div>
      <div class="btnrow" style="margin-top:8px;justify-content:flex-start">
        <button class="btn" data-role="clear-btn"><ion-icon name="refresh-outline"></ion-icon> Clear</button>
        <button class="btn" data-role="reveal-btn"><ion-icon name="eye-outline"></ion-icon> Show kanji</button>
      </div>
    </div>`;

  const canvas = root.querySelector('.fhb-canvas');
  const ctx = canvas.getContext('2d');
  ctx.lineWidth = 6;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.strokeStyle = getComputedStyle(document.documentElement).getPropertyValue('--ink') || '#1a1a1a';

  let drawing = false;

  function pos(ev) {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    return [(ev.clientX - rect.left) * scaleX, (ev.clientY - rect.top) * scaleY];
  }

  canvas.onpointerdown = ev => {
    ev.preventDefault();
    try { canvas.setPointerCapture(ev.pointerId); } catch (_) {}
    drawing = true;
    const [x, y] = pos(ev);
    ctx.beginPath();
    ctx.moveTo(x, y);
  };
  canvas.onpointermove = ev => {
    if (!drawing) return;
    const [x, y] = pos(ev);
    ctx.lineTo(x, y);
    ctx.stroke();
  };
  const stop = () => { drawing = false; };
  canvas.onpointerup = stop;
  canvas.onpointercancel = stop;

  root.querySelector('[data-role="clear-btn"]').onclick = () => {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  };
  const area = root.querySelector('[data-role="reveal-area"]');
  const btn = root.querySelector('[data-role="reveal-btn"]');
  const show = () => {
    const open = area.classList.toggle('show');
    if (open) {
      area.innerHTML = `<span class="fhb-answer-glyph">${String(answer).replace(/&/g, '&amp;').replace(/</g, '&lt;')}</span>`;
      btn.innerHTML = '<ion-icon name="eye-off-outline"></ion-icon> Hide kanji';
    } else {
      area.innerHTML = '';
      btn.innerHTML = '<ion-icon name="eye-outline"></ion-icon> Show kanji';
    }
  };
  btn.onclick = show;
}
