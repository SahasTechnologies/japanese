import grammar from '../data/grammar.json' with { type: 'json' };
const { GRAMMAR, PARTICLE_QUIZ } = grammar;
import { quiz } from '../utils/quiz.js';
import { shuffle } from '../utils/helpers.js';
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
    <div class="glist" id="gl"></div>
    <div id="gqz" style="margin-top:24px"></div>`;

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
            ${jp}
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

    gl.appendChild(card);
  });

  document.getElementById('gq-btn').onclick = () =>
    quiz(document.getElementById('gqz'), grammarQs(), {
      onDone: (s, t) => updateBest('grammar', s, t),
    });
}
