# JLPT N5 Study

> [!NOTE]
> I created this app to help me study for the JLPT N5 exam. However, I started N5 study in August, and don't have time to code and also do the actual studying. I also wanted to experiment with different AI tools, and how to use AI to boost my productivity and education. So, this project was created entirely by AI with the exception of this single paragraph, and it has saved me so much time and effort, while also helping me better understand and become more familiar with dedicated AI coding tools. You can access the application at [JLPT N5 Study — 日本語能力試験](https://jlpt-n5.shimpi.dev), hosted on GitHub Pages. This website has helped me so, so much to study for the JLPT N5 exam, and I hope it will help you too! 頑張ってください！このサイトがJLPT N5の合格に役立つことを願っています！

Interactive study app for the Japanese-Language Proficiency Test **N5**.

Covers kana, kanji (stroke order + tracing), vocabulary, grammar, reading, listening, flashcards, mock tests, and quick-reference tables.

## Features

- **Kana** — Hiragana & Katakana charts with TTS and reading quizzes
- **Kanji** — 103 N5 characters with:
  - Full stroke-order animation (autoplay watch mode)
  - Trace practice with optional stroke guide and background outline
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
- **Reading** — 60+ short passages and 120+ comprehension questions, plus mixed quizzes
- **Listening** — Word quizzes from vocabulary (TTS) plus scripted dialogues; normal and slow rates
- **Flashcards** — Vocab, kanji, hiragana, and katakana decks with flip + Know / Don’t-know piles
- **Mock test** — Multimodal exam (~65 questions, 45 min): kanji reading, vocab, grammar, reading, listening; plus a quick 25-question mode
- **Reference** — Numbers, counters, days, months, expressions, verb groups
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

Study content lives as JSON under `src/data/` (`vocab.json`, `kanji.json`, `reading.json`, `grammar.json`, etc.) and is imported directly in components (Vite supports JSON imports natively).

Kanji stroke paths are **not** hand-maintained: `scripts/fetch-kanjivg.js` downloads them from [KanjiVG](https://kanjivg.tagaini.net/) on **every** `npm run dev` and `npm run build`, writing `src/data/kanjivg-strokes.json`.

## Tech

- Vanilla JS (ES modules)
- [Vite](https://vitejs.dev/)
- Web Speech API for Japanese TTS
- [Ionicons](https://ionic.io/ionicons/) for UI icons
- Kanji stroke paths from KanjiVG

## License

Study content is for personal learning. KanjiVG stroke data is licensed under [CC BY-SA 3.0](https://creativecommons.org/licenses/by-sa/3.0/).
