# Japanese Study Reference

A fast, searchable Japanese reference guide for food, kitchen, and N5 vocabulary designed for quick lookup and clean printing.

## Project structure

- `index.html` - page shell, header/brand, navigation, search controls, and print controls
- `css/site.css` - visual styles (Blue Gray palette + a restrained rose accent) and print layout rules
- `js/app.js` - search, navigation, sorting, viewing modes, collapse/expand, and printing behavior
- `data/vocabulary.js` - vocabulary tables, one `window.vocabularySections` array of pre-rendered table HTML
- `logo.png` - the site mark, used in the header and as the favicon
- `scripts/validate-vocabulary.js` - data/accessibility checks run by `npm run validate`
- `LICENSE` - project license

The project uses plain HTML, CSS, and JavaScript. It has no framework, build step, package dependency, database, account, or runtime service.

### Why the vocabulary data is one file, not one per table

`data/vocabulary.js` holds all 14 tables in a single array, one table per array entry and one `<tr>` per line. Splitting it into 14 files was considered and rejected:

- Cross-table searches while editing (`grep` for a word, checking for duplicates) need every table in scope at once; per-table files fragment that.
- `scripts/validate-vocabulary.js` already treats the data as one corpus (row/table counts, duplicate detection) - splitting it would just mean re-joining the files before checking anything.
- 14 extra `<script>` tags means 14 extra requests on a page whose main goal is fast loading, for no offsetting benefit on a repo this size (~350 rows total).

The thing that actually made the file hard to scan was formatting, not file count - it used to be a single 71 KB line. It's now one `<tr>` per line so `grep`, diffs, and manual edits stay readable without touching the runtime format.

## Run locally

Open `index.html` in a browser, or serve the repository with any simple static web server.

The tool supports:

- Search across Japanese, furigana, romaji, and English
- Automatic expansion of matching tables and hiding of empty tables
- Matching row/table counts
- `/` to focus search, `Esc` to clear, and `Enter` to jump to the first result
- All, Japanese-only, and English-only viewing modes (the hidden columns stay in place rather than letting the remaining column slide over)
- A compact "Browse" strip that previews table names and opens the full list on click
- Category navigation and collapse/expand controls
- Per-table sorting
- Printing one table, selected tables, or all tables
- A4-oriented print styling with repeated table headers and row-break prevention

Furigana is per-kanji, not per-word: a word like 茹でる shows ゆ only over 茹, with the でる okurigana left plain, matching how furigana is set in print.

## Validation and GitHub Pages

Run the local checks with:

    npm run validate

The validation script checks that the vocabulary data still contains 14 tables and 346 body rows, that every row has Japanese script and no empty cells, that Japanese/meaning pairs aren't duplicated, and that accessibility basics (live search region, search label, focus styling, table headings) are in place. It also runs `node --check` over both JS files.

The repository includes a GitHub Actions workflow at `.github/workflows/pages.yml`. It deploys the repository root as a static GitHub Pages site whenever changes are pushed to main. As part of that deploy, it substitutes the `__CACHEBUST__` placeholder in `index.html`'s asset URLs with the commit SHA, so every deploy forces browsers to fetch the new CSS/JS/data instead of serving a stale cached copy. In the repository settings, set Pages to use GitHub Actions as the deployment source.

The site includes a same-origin Content Security Policy, keyboard-focus styling, and an aria-live search result announcement.
