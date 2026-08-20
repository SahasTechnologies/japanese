import kanjiData from '../data/kanji.json' with { type: 'json' };
const { KANJI } = kanjiData;
const kanjiByGlyph = {};
KANJI.forEach(k => { kanjiByGlyph[k[0]] = k; });

export function unitHasContent(u) {
  return u.kanji.length || u.qaSections.length || (u.vocabSections || []).length ||
    (u.grammarPractice || []).length || (u.phraseChevrons || []).length;
}

/** All vocab-style [expr, reading, meaning] triples for a unit, used for quiz/flashcards/writing/mock test */
export function unitVocabPool(u) {
  const pool = [];
  (u.vocabSections || []).forEach(sec => sec.words.forEach(w => pool.push(w)));
  (u.kanji || []).forEach(k => {
    const entry = kanjiByGlyph[k.glyph];
    if (entry) {
      const raw = (entry[2] || entry[1] || '').split('、')[0];
      const reading = raw.replace(/[()]/g, '');
      if (reading) pool.push([entry[0], reading, entry[3]]);
    }
  });
  return pool;
}
