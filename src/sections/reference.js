import ref from '../data/reference.json' with { type: 'json' };
const { EXPRESSIONS, NUMBERS, COUNTERS, DAYS, MONTHS, VERB_CONJUGATION } = ref;
const TOC = [
  { id: 'ref-numbers', label: 'Numbers (数字)', section: null },
  { id: 'ref-counters', label: 'Counters (助数詞)', section: null },
  { id: 'ref-days', label: 'Days of the week', section: null },
  { id: 'ref-months', label: 'Months', section: null },
  { id: 'ref-expr', label: 'Common expressions', section: null },
  { id: 'ref-verbs', label: 'Verb groups & て-form', section: null },
  { id: 'go-kana', label: '→ Kana trainer', section: 'kana' },
  { id: 'go-kanji', label: '→ Kanji (103 characters)', section: 'kanji' },
  { id: 'go-vocab', label: '→ Vocabulary (~700 words)', section: 'vocab' },
  { id: 'go-grammar', label: '→ Grammar & particles', section: 'grammar' },
  { id: 'go-writing', label: '→ Writing practice', section: 'writing' },
  { id: 'go-reading', label: '→ Reading practice', section: 'reading' },
  { id: 'go-listening', label: '→ Listening practice', section: 'listening' },
  { id: 'go-flash', label: '→ Flashcards', section: 'flash' },
  { id: 'go-mock', label: '→ Mock test', section: 'mock' },
  { id: 'go-placement', label: '→ Placement test', section: 'placement' },
  { id: 'go-coursework', label: '→ Coursework', section: 'coursework' },
];

function refCard(id, title, body) {
  return `<div class="card ref-card" id="${id}" style="margin-bottom:16px">
    <h3 class="ref-heading">${title}</h3>
    ${body}
  </div>`;
}

export function renderRef(navigateTo) {
  const main = document.getElementById('main');

  let html = `
    <div class="sec-title">Reference</div>
    <div class="sec-sub">Everything covered in this app — jump to a table or open a study section.</div>

    <nav class="ref-toc card" aria-label="Reference contents">
      <div class="ref-toc-title">Contents</div>
      <ul class="ref-toc-list">
        ${TOC.map(t => `
          <li>
            <a href="#${t.id}" class="ref-toc-link" data-section="${t.section || ''}">${t.label}</a>
          </li>`).join('')}
      </ul>
    </nav>
  `;

  html += refCard(
    'ref-numbers',
    'Numbers (数字)',
    `<table class="reftable">
      <thead><tr><th>Value</th><th>Reading</th></tr></thead>
      <tbody>${NUMBERS.map(n => `<tr><td>${n[0]}</td><td>${n[1]}</td></tr>`).join('')}</tbody>
    </table>`
  );

  html += refCard(
    'ref-counters',
    'Counters (助数詞)',
    `<table class="reftable">
      <thead><tr><th>Counter</th><th>Used for</th></tr></thead>
      <tbody>${COUNTERS.map(c => `<tr><td>${c[0]}</td><td>${c[1]}</td></tr>`).join('')}</tbody>
    </table>`
  );

  html += refCard(
    'ref-days',
    'Days of the Week (曜日)',
    `<table class="reftable">
      <thead><tr><th>Day</th><th>Reading</th><th>English</th></tr></thead>
      <tbody>${DAYS.map(d => `<tr><td>${d[0]}</td><td>${d[1]}</td><td>${d[2]}</td></tr>`).join('')}</tbody>
    </table>`
  );

  html += refCard(
    'ref-months',
    'Months (月)',
    `<table class="reftable">
      <thead><tr><th>#</th><th>Japanese</th><th>English</th></tr></thead>
      <tbody>${MONTHS.map(m => `<tr><td>${m[0]}</td><td>${m[1]}</td><td>${m[2]}</td></tr>`).join('')}</tbody>
    </table>`
  );

  html += refCard(
    'ref-expr',
    'Common Expressions (挨拶・日常)',
    `<table class="reftable">
      <thead><tr><th>Japanese</th><th>Meaning</th></tr></thead>
      <tbody>${EXPRESSIONS.map(e => `<tr><td>${e[0]}</td><td>${e[1]}</td></tr>`).join('')}</tbody>
    </table>`
  );

  html += refCard(
    'ref-verbs',
    'Verb Groups & Te-form (動詞のグループとて形)',
    `<div class="glist">
      ${VERB_CONJUGATION.map(v => `
        <div class="gcard" style="margin-bottom:8px">
          <h4>${v.group}</h4>
          <p><strong>Rule:</strong> ${v.rule}</p>
          ${v.examples.map(ex => `
            <div class="gex">${ex[0]} <span class="tr">${ex[1]}</span></div>
          `).join('')}
        </div>
      `).join('')}
    </div>`
  );

  // Coverage summary
  html += refCard(
    'ref-coverage',
    'What this app covers',
    `<ul class="ref-coverage">
      <li><button type="button" class="ref-jump" data-go="kana"><strong>Kana</strong> — full hiragana & katakana charts + quizzes</button></li>
      <li><button type="button" class="ref-jump" data-go="kanji"><strong>Kanji</strong> — 103 N5 characters, stroke order, trace, can-read / can-write</button></li>
      <li><button type="button" class="ref-jump" data-go="vocab"><strong>Vocabulary</strong> — 700+ N5 words, example sentences, kana/kanji modes</button></li>
      <li><button type="button" class="ref-jump" data-go="grammar"><strong>Grammar</strong> — core patterns and particle drills</button></li>
      <li><button type="button" class="ref-jump" data-go="writing"><strong>Writing</strong> — type rōmaji, watch it become kana, kanji accepted too</button></li>
      <li><button type="button" class="ref-jump" data-go="reading"><strong>Reading</strong> — 60+ passages, 120+ questions</button></li>
      <li><button type="button" class="ref-jump" data-go="listening"><strong>Listening</strong> — word quizzes + scripted dialogues (TTS)</button></li>
      <li><button type="button" class="ref-jump" data-go="flash"><strong>Flashcards</strong> — vocab, kanji, kana with know / don’t-know piles</button></li>
      <li><button type="button" class="ref-jump" data-go="mock"><strong>Mock test</strong> — multimodal timed exam (~65 questions)</button></li>
      <li><button type="button" class="ref-jump" data-go="placement"><strong>Placement test</strong> — optional diagnostic to mark what you already know</button></li>
      <li><button type="button" class="ref-jump" data-go="coursework"><strong>Coursework</strong> — your class units, with kanji, sentences, grammar Q&amp;A, and vocabulary</button></li>
    </ul>`
  );

  main.innerHTML = html;

  main.querySelectorAll('.ref-toc-link').forEach(a => {
    a.addEventListener('click', e => {
      const sec = a.dataset.section;
      if (sec) {
        e.preventDefault();
        if (navigateTo) navigateTo(sec);
        return;
      }
      // smooth scroll to in-page anchor
      const id = a.getAttribute('href')?.slice(1);
      const el = id && document.getElementById(id);
      if (el) {
        e.preventDefault();
        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    });
  });

  main.querySelectorAll('.ref-jump').forEach(btn => {
    btn.onclick = () => navigateTo && navigateTo(btn.dataset.go);
  });
}
