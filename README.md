# Japanese Study Reference

A fast reference site for food, kitchen, and N5 vocabulary. Built for quick lookup while cooking or studying, and for printing clean study sheets.

Live at [xxvazquez.github.io/japanese-study](https://xxvazquez.github.io/japanese-study/).

## Brand

"sakura study" — the wordmark at the top of the sidebar, above the Overview link (`sakura` + a small tracked-out `STUDY` underneath), pairs with `logo.png`, a circular mark (sun, hills, a leaf, waves) in the same palette. The palette itself, as CSS custom properties in `css/site.css`:

| Swatch | Hex | CSS variable | Used for |
|---|---|---|---|
| Deep Teal | `#0F6B6D` | `--accent-dark` | smaller, deliberate emphasis — filled "managing rows" state, one category icon, particle highlights |
| Teal | `#2BA7A0` | `--accent` | the main brand color in use — the *specific selected table's* nav pill, links/hover accents, focus ring |
| Soft Teal | `#D6EFEE` | `--accent-soft` | soft hover/tint backgrounds |
| Light Gray | `#F4F7F8` | `--surface` / `--page-bg` | sidebar + content pane surface, and the table header row itself |
| Text Dark | `#1F2933` | `--ink` | primary text |
| Text Muted | `#6B7C85` | `--muted` | secondary text (romaji, counts, meta, table header labels) |

A dusty rose (`--rose`, `#B97E91`) rides alongside the brand palette as the one functional, non-brand accent — irregular-verb rows and search-match highlights only, never decorative. The overall visual direction follows the "Clean Comfort" concept: a light, airy shell (white/light-gray sidebar and toolbar, not a colored panel), table chrome that stays quiet and light rather than brand-colored, and Teal reserved for exactly one job — marking the specific table you're currently on. Note that only the specific selected *table* gets the solid Teal pill; its parent category is never filled in too, even though it's also "active" in the sense of containing the current page — otherwise two different things read as selected at once.

## What's here

- `index.html` — the page shell: header, search, sidebar, overview page
- `css/site.css` — styling and print rules
- `js/app.js` — renders the tables, search, sorting, view modes, printing, the whole UI
- `js/flashcards.js` — the Flashcards feature: FSRS-6 scheduling, Supabase sync, review UI (see Flashcards, below)
- `js/supabase-config.js` — your Supabase project URL + anon key (see `SUPABASE_SETUP.md`)
- `js/sw-register.js` — registers the service worker (see PWA, below)
- `data/vocabulary.js` — the actual vocab, as plain data (not HTML), each row carrying a permanent id
- `vendor/` — vendored `ts-fsrs` and `supabase-js`, static files (see Flashcards, below)
- `supabase/schema.sql` — the Postgres tables + Row Level Security policies for Flashcards
- `SUPABASE_SETUP.md` — step-by-step Supabase project setup
- `logo.png` — site mark / favicon
- `icons/` — generated app icons for the home-screen/install experience (see PWA)
- `manifest.webmanifest` — web app manifest (name, icons, theme color, display mode)
- `sw.js` — service worker: caches the app shell for offline use
- `scripts/` — a data validator, a vocab-id generator, and a smoke test, see below

No framework, no build step. Just open `index.html`.

## Features

- Search across Japanese, furigana, romaji, and English, with filters to scope it to just one of those
- Results sorted by how good the match is (exact → starts with → ends with → contains), matched text highlighted, and pulled in from every category even if you're not currently viewing it
- Tables are grouped into categories in the sidebar; each category is its own page, so you're never scrolling past the whole book to find one table
- An Overview page (also the sidebar's landing page) lists every category and table as a plain table of contents
- Sortable columns, per-table print, A4-friendly print layout
- "Manage rows" lets you hide individual rows you've already memorized, per table, with a one-click "Show all" to bring them back
- **Flashcards**: turn any vocabulary row into an FSRS-6-scheduled flashcard (see below)
- Furigana sits over the actual kanji it belongs to, not the whole word
- On mobile the sidebar tucks behind a menu button instead of eating screen space
- Installable as a PWA on iPhone and Android, and works offline once visited (see below)

## PWA (installing on iPhone / Android)

The site is an installable, offline-capable PWA:

- **Android / Chrome, desktop Chrome & Edge**: an "Install app" prompt appears automatically (or use the browser menu → "Install app" / "Add to Home Screen"). Backed by `manifest.webmanifest` plus `sw.js`, a service worker that precaches the app shell and caches versioned assets as you browse.
- **iPhone / iPad (Safari)**: iOS doesn't support the install prompt or manifest icons the way Android does, so those are covered separately — Share → "Add to Home Screen" uses the `apple-touch-icon` and `apple-mobile-web-app-*` meta tags in `index.html` for the icon, name, and standalone (no browser chrome) launch behavior.
- Regenerating icons: the source art is `logo.png` (transparent, not necessarily square or tightly cropped — the generation script crops to the opaque content's bounding box first, then pads it back out to a square before resizing, so icons stay centered regardless of the source file's own margins). See the Python/Pillow snippet used to derive `icons/*.png` in the git history if you need to regenerate them after changing the logo — sizes needed are 192/512 (`any`), 192/512 (`maskable`, ~72% safe-zone art), and a white-flattened 180×180 for `apple-touch-icon.png` (iOS doesn't composite transparency the way Android does).
- The service worker's cache name (`sakura-v1` in `sw.js`) only needs bumping if you change what the *app shell itself* precaches (the list at the top of `sw.js`) — versioned assets (`?v=<sha>`) already invalidate themselves on every deploy via the cache-busting step below.

## Flashcards

An additive feature on top of the existing vocabulary — it doesn't change or duplicate it. Every table has an "Add table to flashcards" button (next to "Manage rows") that adds every one of its rows at once — it skips any row you've already hidden in that table, so words you've marked as already-known don't get pulled back in. Prefer to pick individual words instead? "Manage rows" also puts a per-row add/remove toggle next to the eye icon. A "Flashcards" page in the sidebar then lets you review, browse, and track progress (including a daily study streak).

- Real **FSRS-6** scheduling via [`ts-fsrs`](https://github.com/open-spaced-repetition/ts-fsrs) (the official reference implementation, same org behind Anki's own FSRS), vendored as a static file at `vendor/ts-fsrs.js` — no build step added to the site itself.
- Each vocab entry becomes up to 4 independently-scheduled cards (Japanese→English, Japanese→Romaji, Romaji→English, English→Romaji) — never Japanese-to-type, and romaji-typing is skipped for the handful of Numbers-table rows whose "romaji" field is actually kana.
- Every vocabulary row has a **permanent id** (`v0001`, `v0002`, …, see `data/vocabulary.js` / `scripts/generate-vocab-ids.js`) that flashcards reference — never a copy of the row's content.
- **Supabase** (a free hosted Postgres + Auth project you create yourself — see [`SUPABASE_SETUP.md`](SUPABASE_SETUP.md)) is the sole authoritative store for flashcard state, review history, and settings, scoped per account by Row Level Security. The anon/public key in `js/supabase-config.js` is safe to commit — RLS is what protects the data, not secrecy of that key. Never put the *service role* key anywhere in this repo.
- `localStorage` is only a read-through cache and an offline outbox — reviews taken without a connection are computed locally and synced once you're back online; it's never the permanent record.
- Removing a vocab entry from flashcards **archives** it — its FSRS state and full review history are kept, and re-adding it later restores the same card rather than starting over. The only way to actually erase that history is the separate, clearly-marked **"Delete learning history permanently"** action on an archived entry.
- Re-vendoring the libraries after a version bump: `npm install && npm run vendor:libs`.

## Running it

Just open `index.html`. No server needed, though `python3 -m http.server` or similar works fine too if you want it on localhost — and you'll need it (or any local server) if you want to test the service worker/offline behavior, since browsers refuse to register one on a bare `file://` page. The rest of the site works fine either way.

## Scripts

```
npm run validate            # checks the vocab data is well-formed (no deps needed)
npm install && npm test     # actually renders the page and clicks around (uses jsdom)
npm run generate:vocab-ids  # assigns a permanent id to any vocab row that doesn't have one yet
npm run vendor:libs         # re-copies vendor/ts-fsrs.js and vendor/supabase.js after a version bump
```

Run `npm run validate` before committing data changes — it'll catch duplicate entries, missing fields, missing/duplicate ids, that sort of thing. `npm test` is heavier and checks real behavior (search, keyboard nav, print, flashcards navigation and answer-checking), worth running before anything that touches `app.js` or `flashcards.js`.

## Deploying

Pushing to `main` deploys via the GitHub Actions workflow in `.github/workflows/pages.yml`. It swaps a cache-busting token into the asset URLs on every deploy so you don't get stuck looking at a stale cached version. Set the repo's Pages source to "GitHub Actions" if you haven't already.
