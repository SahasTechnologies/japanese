import grammar from '../data/grammar-n4.json' with { type: 'json' };
const { GRAMMAR, PARTICLE_QUIZ } = grammar;
import { runFullQuiz } from '../utils/fullQuiz.js';
import { shuffle } from '../utils/helpers.js';
import { speakWithBtn } from '../utils/tts.js';
import { updateBest } from '../state.js';
import { srsCounts, srsQueue } from '../utils/srs.js';
import { mountSrsReview } from '../utils/srsReview.js';
import { runSentenceDrill } from '../utils/sentenceBuilder.js';

/** Build grammar/particle quiz questions */
export function grammarQs4() {
  return shuffle(PARTICLE_QUIZ).map(p => ({
    ...p,
    q: `<span style="font-family:var(--serif);font-size:22px">${p.q}</span>`,
  }));
}

export function renderGrammar4() {
  const main = document.getElementById('main');

  main.innerHTML = `
    <div class="sec-title">Grammar</div>
    <div class="sec-sub">${GRAMMAR.length} core N4 patterns — read the cards, then drill particles</div>
    <div class="btnrow" style="justify-content:flex-start;margin-bottom:16px">
      <button class="btn primary" id="gq-btn">Particle &amp; form drill</button>
      <button class="btn" id="gsrs-btn"><ion-icon name="layers-outline"></ion-icon> SRS review</button>
      <button class="btn" id="gsb-btn"><ion-icon name="puzzle-outline"></ion-icon> Sentence builder</button>
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

  // SRS review over the grammar patterns
  const gSrsCards = GRAMMAR.map(g => ({
    id: `g:${g.t}`,
    front: `<span class="big-kana">${g.p}</span>`,
    back: `<div class="srs-meaning">${g.t}</div><div class="srs-sub">${g.e}</div>`,
  }));
  const gSrsIds = gSrsCards.map(c => c.id);
  const gSc = srsCounts(gSrsIds);
  const gSrsBtn = document.getElementById('gsrs-btn');
  if (gSrsBtn) {
    gSrsBtn.innerHTML = `<ion-icon name="layers-outline"></ion-icon> SRS review <b class="mono">${gSc.due + gSc.fresh}</b>`;
    gSrsBtn.onclick = () => mountSrsReview({
      title: 'Grammar — spaced repetition',
      cards: gSrsCards,
      queue: srsQueue(gSrsIds),
      onExit: renderGrammar4,
    });
  }

  document.getElementById('gsb-btn').onclick = () => {
    const items = GRAMMAR.flatMap(g => (g.x || []).map(([jp, en]) => ({ jp, en })));
    const area = document.createElement('div');
    document.getElementById('gl').prepend(area);
    runSentenceDrill(area, items, { limit: 10 });
    area.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  };

  document.getElementById('gq-btn').onclick = () =>
    runFullQuiz(grammarQs4(), {
      onDone: (s, t) => updateBest('grammar4', s, t),
      onExit: renderGrammar4,
      backLabel: '← Grammar',
    });
}
