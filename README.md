# Japanese Study Reference

A fast reference site for food, kitchen, and N5 vocabulary. Built for quick lookup while cooking or studying, and for printing clean study sheets.

Live at [xxvazquez.github.io/japanese-study](https://xxvazquez.github.io/japanese-study/).

## What's here

- `index.html` — the page shell: header, search, table nav
- `css/site.css` — styling and print rules
- `js/app.js` — renders the tables, search, sorting, view modes, printing, the whole UI
- `data/vocabulary.js` — the actual vocab, as plain data (not HTML)
- `logo.png` — site mark / favicon
- `scripts/` — a data validator and a smoke test, see below

No framework, no build step. Just open `index.html`.

## Features

- Search across Japanese, furigana, romaji, and English, with filters to scope it to just one of those
- Results sorted by how good the match is (exact → starts with → ends with → contains), matched text highlighted
- Browse one table at a time with arrow keys / swipe, or search to see every match at once across all tables
- Sortable columns, per-table or select-and-print, A4-friendly print layout
- Furigana sits over the actual kanji it belongs to, not the whole word

## Running it

Just open `index.html`. No server needed, though `python3 -m http.server` or similar works fine too if you want it on localhost.

## Scripts

```
npm run validate   # checks the vocab data is well-formed (no deps needed)
npm install && npm test   # actually renders the page and clicks around (uses jsdom)
```

Run `npm run validate` before committing data changes — it'll catch duplicate entries, missing fields, that sort of thing. `npm test` is heavier and checks real behavior (search, keyboard nav, print), worth running before anything that touches `app.js`.

## Deploying

Pushing to `main` deploys via the GitHub Actions workflow in `.github/workflows/pages.yml`. It swaps a cache-busting token into the asset URLs on every deploy so you don't get stuck looking at a stale cached version. Set the repo's Pages source to "GitHub Actions" if you haven't already.
