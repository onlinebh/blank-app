# Everything Is a 1-2-3 — bilingual calm reader + mind map

Open `index.html` (double-click works; or `python3 -m http.server` in this folder and visit http://localhost:8000).

**Reader**
- English · العربية (simple Modern Standard Arabic, technical/trading/Goodman terms kept in English) · side-by-side
- 11 calm colour themes + your own colours (background / text / accent / highlight), 4 English and 4 Arabic fonts,
  text size, line spacing, column width, justify, warm-light filter, brightness dimming, focus mode
- Important passages are highlighted in two levels (important / core); "Skim only" shows just the highlights
- Optional calm sound (rain / ocean / wind, generated in the browser), reading progress + time left, resume where you stopped,
  full-text search in both languages, chart zoom, print / PDF, keyboard shortcuts (← → T A M)

**Mind map** (`Mind map` tab): collapsible tree of the whole book — Parts → chapters → ideas → details — with importance levels,
search, zoom/pan (mouse, touch, pinch), "Important only" filter and a "read this passage" link on every node. Works in Arabic (mirrored).

**Rebuild** (`tools/`): `split.py` (docx→html→blocks/chunks), translation prompt `TRANSLATE_PROMPT.md`, `build.py` (assembles `data/`).
Translations and highlights live in `src/chunks/*.ar.txt` and `*.meta.json`; after editing them run
`python3 tools/build.py src .` from this folder.

Note: the 503 charts are images from the original book and keep their English labels; their captions are translated.
