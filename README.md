# The Code Corner

A static practice site for SQL, Power BI, Excel, DAX and data modelling: short questions with hints, instant feedback and explanations. Progress is saved in the visitor's browser (localStorage).

## Structure

```
index.html            Home: hero, topic cards with progress, stats, how it works
practice.html         Quiz: ?topic=sql|powerbi|excel|dax|model  &level=easy|medium|hard
assets/site.css       Page layout (header, chips, summary…)
assets/js/questions.js  Topics + question bank  ← add questions here
assets/js/common.js   Progress storage, stats, syntax highlighting
assets/js/home.js     Home page rendering
assets/js/practice.js Quiz engine (keyboard: A–D to pick, H for hint, Enter to check/next)
design/               Design system: tokens.css, components.css, fonts, style-guide.html
```

## Dark mode

Dark colours live in `design/tokens.css`. By default the site follows the visitor's system setting. The header toggle saves an explicit choice (`localStorage` key `tcc:theme`), and a small inline script in each page's `<head>` applies it before the first paint so the page doesn't flash. The dark tokens appear twice, once in the `prefers-color-scheme` block and once in the `[data-theme=dark]` block, so keep the two in sync. Text that sits on a solid accent or topic colour uses `var(--on-accent)`, not `#fff`.

## Run locally

No build step. Serve the folder over HTTP (fonts don't load from `file://`):

```bash
python3 -m http.server 8000
```

Then open http://localhost:8000.

## Adding a question

Append an object to the topic's array in `assets/js/questions.js`:

```js
{ id: 'sql-09', level: 'medium',
  prompt: 'Question text',
  code: { lang: 'sql', file: 'query.sql', text: 'SELECT 1;' }, // optional; lang: sql | dax | excel
  options: ['A', 'B', 'C', 'D'], answer: 1,                   // answer = index of the correct option
  hint: 'Nudge without giving it away.',
  explain: 'Why the answer is right.' }
```

Keep `id`s stable – saved progress refers to them.
