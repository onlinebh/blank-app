You are translating one chunk of the book "Everything Is a 1-2-3" (a trading book by Mohamed Ahmed about the teacher Charles B. Goodman, with stories, research papers and trading-chart explanations) into simple, eloquent Modern Standard Arabic (العربية الفصحى المبسّطة), and annotating it.

INPUT: /ABS/work/chunks/{ID}.en.txt . It starts with a `##CTX` line (context only), then blocks. Each block is `@@bNNN tag` on one line, followed by the block's inner HTML, then a blank line.

OUTPUT (write both with the Write tool):
1. /ABS/work/chunks/{ID}.ar.txt — the SAME blocks, same `@@bNNN tag` header lines, same order, same count, with the inner HTML translated into Arabic. Do not write the ##CTX line.
2. /ABS/work/chunks/{ID}.meta.json — annotations (format below).

TRANSLATION RULES
- Style: clear, natural, elegant but simple Fusha. Short sentences. Readable by an ordinary educated Arab reader. No dialect, no stiff literal translation. Keep the author's warm, personal voice (first person letters, stories).
- PRESERVE TERMS: keep every technical / trading / Goodman-specific term in its original English (Latin script) exactly as written, inline inside the Arabic sentence. This includes: proper names (Charlie, Michael, Goodman, Mohamed Ahmed, places), coined or capitalized concepts (Matrix, Setup, Jumbo, Dagger, Outward, Return, Cancel count, Goodman Box, Propagation lens, 3-C, DM, GWT, Rung names such as Being/Knowing/Seeing/Deciding/Acting/Measuring/Doing Right/Feeling/Learning/The System, "Goodmanisms" ...), trading jargon (bar, swing, trend, pullback, stop, entry, target, risk, pips, timeframes like 5-minute, 1-hour, Long/Short, support/resistance, volume, breakout ...), tickers/symbols (GBPCHF), indicators, acronyms, book/paper titles. You may add a very short Arabic gloss in parentheses the FIRST time a term appears in your chunk when it clearly helps (e.g. "الـ Matrix (المصفوفة)"), never more. Everyday words (market, buyers, sellers, chart, price...) may be translated normally: سوق، مشترون، بائعون، رسم بياني، سعر — but if the book uses them as a defined term with a capital letter or in italics/bold as a concept, keep English.
- Numbers, dates, symbols, percentages: keep Western digits (0-9) as in the source. Keep quotation marks as «» or "" consistently. Keep Charlie's quoted sayings accurate and strong.
- HTML: keep ALL inline tags and structure exactly (<strong>, <em>, <p>, <ul>, <li>, <blockquote>, <table>, <tr>, <td>, <th>, <thead>, <tbody>, <br>, <img data-img="N"> ...). Translate only text. Never drop, merge, add or reorder blocks. Do not translate `tag` header lines. Headings keep their numbering ("1.2", "Example 1"). "Figure: ..." captions are translated (start with "الشكل:"), keeping chart details such as symbols and dates.
- Do not summarize or omit anything. Every sentence must be translated.
- Do not use <mark> in the Arabic unless it is a highlight (see below).

HIGHLIGHTING (importance): in the ARABIC text wrap the most important passages in <mark>...</mark> (important: definitions, principles, rules, key lessons, Charlie's sayings, warnings, the "try this on your next chart" takeaways) and <mark class="key">...</mark> (the very core: at most 1-2 per ~500 words). Highlight whole phrases or sentences (not single words, not whole paragraphs); about 8-12% of the text overall. Marks must sit inside one block and must not cross other tags in a way that breaks nesting.
For the ENGLISH side, put the matching highlights in the meta file so the build can mark the English text: each entry is an exact verbatim substring copied from the source block's HTML (it must not cross any HTML tag, and must be at least 12 characters, copy it character-for-character including punctuation and line breaks as they appear in the source file).

META JSON FORMAT (valid JSON, UTF-8):
{
 "chunk": "{ID}",
 "highlights": [ {"b": "b123", "en": "exact substring", "level": 1}, ... ],   // level 1 = <mark>, level 2 = key
 "mindmap": [   // 2 to 6 top-level topic nodes covering the chunk in order; be detailed
   { "b": "b123",            // first block id where the topic is discussed (required on top-level nodes)
     "en": "Short label (2-6 words, English; keep terms)", "ar": "تسمية قصيرة بالعربية (مع إبقاء المصطلحات)",
     "note_en": "One or two sentences explaining it.", "note_ar": "جملة أو جملتان.",
     "imp": 1,               // 1 normal, 2 important, 3 core idea
     "children": [ { "b": "b130", "en": "...", "ar": "...", "note_en": "...", "note_ar": "...", "imp": 2, "children": [ ...up to 3 levels deep... ] } ]
   } ]
}
Mind-map guidance: each top-level node = a main idea/story/section of the chunk; children = the concepts, rules, steps, examples, terms, people, numbers, warnings, and lessons inside it; go to 3 levels where the material is rich. Labels are short; notes carry the substance. Mark imp 3 only for the central principles. For story chapters include the lesson learned as a child node.

QUALITY: after writing, verify (e.g. with a small python check via Bash) that the .ar.txt has exactly the same list of `@@bNNN tag` header lines as the source, that every <img data-img="N"> in the source appears in the output, that the meta file parses as JSON and that every highlight "en" string is found verbatim in its source block. Fix any problem. Finally reply with just one line: the chunk id and "ok" (or the problem).
