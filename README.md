# Japanese Study Reference

A fast, searchable Japanese food, kitchen, and N5 reference tool designed for quick lookup and clean printing.

## Project structure

- `index.html` - page shell, navigation, search controls, and print controls
- `css/site.css` - visual styles and print layout rules
- `js/app.js` - search, navigation, sorting, viewing modes, collapse/expand, and printing behavior
- `data/vocabulary.js` - vocabulary tables and translations
- `LICENSE` - project license

The project uses plain HTML, CSS, and JavaScript. It has no framework, build step, package dependency, database, account, or runtime service.

## Run locally

Open `index.html` in a browser, or serve the repository with any simple static web server.

The tool supports:

- Search across Japanese, furigana, romaji, and English
- Automatic expansion of matching tables and hiding of empty tables
- Matching row/table counts
- `/` to focus search, `Esc` to clear, and `Enter` to jump to the first result
- All, Japanese-only, and English-only viewing modes
- Category navigation and collapse/expand controls
- Per-table sorting
- Printing one table, selected tables, or all tables
- A4-oriented print styling with repeated table headers and row-break prevention

## Verification

The current local refactor was checked for:

- JavaScript syntax errors
- Vocabulary row preservation
- Table preservation
- Whitespace and patch errors

The vocabulary data currently contains 346 body rows across 10 tables.

## Validation and GitHub Pages

Run the local checks with:

    npm run validate

The validation script checks that the vocabulary data still contains 10 tables and 346 body rows, then checks JavaScript syntax.

The repository includes a GitHub Actions workflow at .github/workflows/pages.yml. It deploys the repository root as a static GitHub Pages site whenever changes are pushed to main. In the repository settings, set Pages to use GitHub Actions as the deployment source.

The site includes a same-origin Content Security Policy, keyboard-focus styling, and an aria-live search result announcement.
