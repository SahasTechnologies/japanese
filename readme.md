# Japanese Study

> [!NOTE]
> I created this app to help me study for the JLPT N5 exam. However, I started N5 study in August, and don't have time to code and also do the actual studying. I also wanted to experiment with different AI tools, and how to use AI to boost my productivity and education. So, this project was created entirely by AI with the exception of this single paragraph, and it has saved me so much time and effort, while also helping me better understand and become more familiar with dedicated AI coding tools. The app has since grown beyond just JLPT N5 — it now also tracks my actual class coursework unit by unit. You can access the application at [Japanese Study](https://jap.shimpi.dev), hosted on GitHub Pages. This website has helped me so, so much to study Japanese, and I hope it will help you too! 頑張ってください！このサイトが日本語の勉強に役立つことを願っています！

An interactive Japanese study app with two halves:

- **JLPT N5** — the full N5 syllabus: kana, kanji (stroke order + tracing), vocabulary, grammar, writing practice, reading, listening, flashcards, a mock test, an optional placement test, and quick-reference tables.
- **Coursework** — my own class units (1–12), each with its own kanji, sentence examples, grammar Q&amp;A, vocabulary, quizzes, flashcards, and writing practice, styled as chevron/arrow rows to match my course materials.

## Features

### JLPT N5
- **Kana** — Hiragana & Katakana charts with TTS and reading quizzes
- **Kanji** — 103 N5 characters with:
  - Full stroke-order animation (autoplay watch mode)
  - Trace practice with optional stroke guide, background outline, grid lines, and stroke numbers — turn any (or all) of them off for a fully freehand challenge
  - Freehand mode that shakes the canvas on mistakes
  - Separate **Can read** / **Can write** progress (green / yellow tile colors)
  - Learned-kanji quiz
- **Vocabulary** — ~700+ N5 words across categories, with:
  - TTS on every card
  - Example sentences on expand
  - Kanji display modes: **All kanji** · **Learned only** · **No kanji**
  - Optional furigana (`<ruby>` readings)
  - Learned tracking + learned-only quiz
  - Kanji forms unlock after you mark those characters as Can read
- **Grammar** — Core N5 patterns + particle drills
- **Writing** — Duolingo-style typing practice: type rōmaji and it converts to hiragana/katakana live (via [wanakana](https://github.com/WaniKani/WanaKana)), like a real IME. Answers are accepted as kana, as kanji (if your own keyboard/IME produces it), or as kana typed without spaces.
- **Reading** — 60+ short passages and 120+ comprehension questions, plus mixed quizzes
- **Listening** — Word quizzes from vocabulary (TTS) plus scripted dialogues; normal and slow rates
- **Flashcards** — Vocab, kanji, hiragana, and katakana decks with flip + Know / Don't-know piles
- **Mock test** — Multimodal exam (~65 questions, 45 min): kanji reading, vocab, grammar, reading, listening; plus a quick 25-question mode
- **Placement test** — Optional diagnostic (vocab, kanji, short sentences) for anyone who already knows some Japanese; correct answers can be marked as already-known so progress tracking starts from a realistic baseline instead of zero
- **Reference** — Numbers, counters, days, months, expressions, verb groups

### Coursework
- Unit picker (1–12); units without content yet show a placeholder
- Full-width kanji cards (readings, radical, and sentence examples) for units that introduce new kanji
- Grammar Q&amp;A blocks, pattern tables, and drills, matching the bunpou-renshuu style of the source material
- Vocabulary tables per topic
- Chevron/arrow-styled example rows (kanji → kana → English) matching the course handouts
- Per-unit **Quiz**, **Flashcards**, and **Writing practice**, built from that unit's own vocab and kanji
- Kanji introduced in a unit link straight into the same stroke-tracing tool used in the JLPT N5 section

### App-wide
- Two-tier navigation: **Home / JLPT N5 / Coursework**, with JLPT N5 expanding into its own sub-tabs
- **Search** — Instant search across kanji, vocab, and grammar
- **Dark mode** — Toggle in the header; preference is saved
- **Progress** — Best scores, kanji read/write flags, vocab learned list, and flashcard piles stored in `localStorage`

## Quick start

```bash
npm install
npm run dev
```

Then open the URL shown in the terminal (usually `http://localhost:5173`).

```bash
npm run build    # production build → dist/
npm run preview  # preview the production build
```

Study content lives as JSON under `src/data/` (`vocab.json`, `kanji.json`, `reading.json`, `grammar.json`, `coursework.json`, etc.) and is imported directly in components (Vite supports JSON imports natively).

Kanji stroke paths are **not** hand-maintained: `scripts/fetch-kanjivg.js` downloads them from [KanjiVG](https://kanjivg.tagaini.net/) on **every** `npm run dev` and `npm run build`, writing `src/data/kanjivg-strokes.json`.

### Adding a coursework unit

Each entry in `src/data/coursework.json` → `UNITS` can include any combination of:

- `kanji` — full-width cards; each glyph must already exist in `src/data/kanji.json` (for its readings/radical/stroke data), plus a list of `sentences`
- `phraseChevrons` — grouped example phrases rendered as chevron/arrow rows
- `qaSections` / `grammarPractice` — Q&amp;A blocks, pattern tables, and drills
- `vocabSections` — simple three-column vocab tables
- `grammarNotes` — free-form explanatory cards (particle usage notes, etc.)

Units with no content yet are left as empty placeholders (`"kanji": [], "qaSections": [], ...`) and show a "not filled in yet" card.

## Tech

- Vanilla JS (ES modules)
- [Vite](https://vitejs.dev/)
- [wanakana](https://github.com/WaniKani/WanaKana) for rōmaji ⇄ kana conversion in Writing practice
- Web Speech API for Japanese TTS
- [Ionicons](https://ionic.io/ionicons/) for UI icons
- Kanji stroke paths from KanjiVG

## License

Study content is for personal learning. KanjiVG stroke data is licensed under [CC BY-SA 3.0](https://creativecommons.org/licenses/by-sa/3.0/).
