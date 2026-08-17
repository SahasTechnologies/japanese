import { EXPRESSIONS, NUMBERS, COUNTERS, DAYS, MONTHS, VERB_CONJUGATION } from '../data/reference.js';

function refCard(title, body) {
  return `<div class="card" style="margin-bottom:16px">
    <h3 style="font:700 16px var(--sans);margin-bottom:12px;color:var(--ink)">${title}</h3>
    ${body}
  </div>`;
}

export function renderRef() {
  const main = document.getElementById('main');

  let html = `
    <div class="sec-title">Reference</div>
    <div class="sec-sub">Quick-look tables and grammar summary sheets for test day.</div>`;

  // Numbers table
  html += refCard(
    'Numbers (数字)',
    `<table class="reftable">
      <thead><tr><th>Value</th><th>Reading</th></tr></thead>
      <tbody>${NUMBERS.map(n => `<tr><td>${n[0]}</td><td>${n[1]}</td></tr>`).join('')}</tbody>
    </table>`
  );

  // Counters table
  html += refCard(
    'Counters (助数詞)',
    `<table class="reftable">
      <thead><tr><th>Counter</th><th>Used for</th></tr></thead>
      <tbody>${COUNTERS.map(c => `<tr><td>${c[0]}</td><td>${c[1]}</td></tr>`).join('')}</tbody>
    </table>`
  );

  // Days of the week
  html += refCard(
    'Days of the Week (曜日)',
    `<table class="reftable">
      <thead><tr><th>Day</th><th>Reading</th><th>English</th></tr></thead>
      <tbody>${DAYS.map(d => `<tr><td>${d[0]}</td><td>${d[1]}</td><td>${d[2]}</td></tr>`).join('')}</tbody>
    </table>`
  );

  // Months
  html += refCard(
    'Months (月)',
    `<table class="reftable">
      <thead><tr><th>Number</th><th>Japanese</th><th>English</th></tr></thead>
      <tbody>${MONTHS.map(m => `<tr><td>${m[0]}</td><td>${m[1]}</td><td>${m[2]}</td></tr>`).join('')}</tbody>
    </table>`
  );

  // Common expressions
  html += refCard(
    'Common Expressions (挨拶・日常会話)',
    `<table class="reftable">
      <thead><tr><th>Japanese</th><th>Meaning</th></tr></thead>
      <tbody>${EXPRESSIONS.map(e => `<tr><td>${e[0]}</td><td>${e[1]}</td></tr>`).join('')}</tbody>
    </table>`
  );

  // Verb conjugation guide
  html += refCard(
    'Verb Groups & Te-form Conjugation (動詞のグループとて形)',
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

  main.innerHTML = html;
}
