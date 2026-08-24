import grammar from '../data/grammar.json' with { type: 'json' };
const { GRAMMAR, PARTICLE_QUIZ } = grammar;
import { runFullQuiz } from '../utils/fullQuiz.js';
import { shuffle } from '../utils/helpers.js';
import { speakWithBtn } from '../utils/tts.js';
import { updateBest } from '../state.js';

/** Build grammar/particle quiz questions */
export function grammarQs() {
  return shuffle(PARTICLE_QUIZ).map(p => ({
    ...p,
    q: `<span style="font-family:var(--serif);font-size:22px">${p.q}</span>`,
  }));
}

export function renderGrammar() {
  const main = document.getElementById('main');

  main.innerHTML = `
    <div class="sec-title">Grammar</div>
    <div class="sec-sub">${GRAMMAR.length} core N5 patterns — read the cards, then drill particles</div>
    <div class="btnrow" style="justify-content:flex-start;margin-bottom:16px">
      <button class="btn primary" id="gq-btn">Particle &amp; form drill</button>
    </div>
    <div class="glist" id="gl"></div>`;

  const gl = document.getElementById('gl');
  GRAMMAR.forEach(g => {
    const card = document.createElement('div');
    card.className = 'gcard';
    card.innerHTML = `
      <div class="gcard-header" role="button" tabindex="0" aria-expanded="false">
        <h4>${g.t} <span class="pat">${g.p}</span></h4>
        <span class="gcaret">›</span>
      </div>
      <div class="gcard-body">
        <p>${g.e}</p>
        ${g.x.map(([jp, en]) => `
          <div class="gex">
            <span class="gex-jp">${jp}
              <button class="btn icon-btn gex-speak" data-say="${String(jp).replace(/"/g, '&quot;')}" title="Listen" aria-label="Listen"><ion-icon name="volume-high-outline"></ion-icon></button>
            </span>
            <span class="tr">${en}</span>
          </div>`).join('')}
      </div>`;

    const header = card.querySelector('.gcard-header');
    const body   = card.querySelector('.gcard-body');
    body.style.display = 'none';

    const toggle = () => {
      const open = body.style.display !== 'none';
      body.style.display = open ? 'none' : 'block';
      header.setAttribute('aria-expanded', String(!open));
      card.querySelector('.gcaret').textContent = open ? '›' : '∨';
    };
    header.onclick = toggle;
    header.onkeydown = e => { if (e.key === 'Enter' || e.key === ' ') toggle(); };

    card.querySelectorAll('.gex-speak').forEach(btn => {
      btn.onclick = ev => {
        ev.stopPropagation();
        speakWithBtn(btn.dataset.say, btn);
      };
    });

    gl.appendChild(card);
  });

  document.getElementById('gq-btn').onclick = () =>
    runFullQuiz(grammarQs(), {
      onDone: (s, t) => updateBest('grammar', s, t),
      onExit: renderGrammar,
      backLabel: '← Grammar',
    });
}
