# Feature backlog

Ideas not yet started. Order is rough priority, not commitment. Nothing here is
required — the app is complete as-is.

---

## How to use this file (for whoever picks this up)

**Only touch an item when the user explicitly asks for it.** Don't
proactively start one. When the user picks one:

1. Implement it following the workflow below.
2. **Delete that entire section from this file** as part of the same change —
   removing the section is the "done" signal. (If the user adds new ideas, append
   them here.)
3. `PLAN.md` is gitignored / untracked — it is a scratch file, never part of a
   commit or PR.

### Delivery workflow (applies to every change in this repo)

The user (Laura) reviews and lands every change herself. Your job is to prepare
the change, not ship it.

- **Never** run `git commit`, create a branch to commit on, or open a pull
  request. Leave the working tree dirty and uncommitted. Don't `git
  checkout`/`reset` in a way that discards edits.
- For each change, deliver **four things**:
  1. the code edits in the working tree,
  2. a **PR title** — short, imperative, plain (e.g. "Add a self-test mode to
     the reference tables"),
  3. a **PR description** — brief, concise, human. A few sentences: what was
     wrong / missing, and what changed. **One line per paragraph, blank line
     between paragraphs — never hard-wrap** (hard wrapping breaks copy-paste into
     GitHub). No bullet lists unless genuinely needed.
  4. an updated **`README.md`** reflecting the change.
- **One PR per message.** If two things are ready, either one PR covering both,
  or separate messages — never two PR titles/descriptions in one message.
- Before presenting: run `npm run validate` **and** `npm test`; both must pass.
  Say so, with the numbers.

### Project constraints (don't break these)

- **Vanilla JS, no build step, no TypeScript, no bundler.** Plain `<script>`
  tags in `index.html`, loaded in a fixed order. One global namespace
  `window.SakuraStudy` with sub-namespaces (`.data`, `.config`, `.shared`,
  `.vocab`, `.flashcards`, `.kanaRomaji`, `.icons`, `.tableCustom`,
  `.iconPicker`, `.customize`). A file may only read namespaces populated by a
  file loaded above it. Works from `file://`.
- **Adding a new JS file** means updating all of: `index.html` (script tag +
  the load-order comment), `sw.js` `VERSIONED`, `scripts/sw-test.js`
  `REFERENCE_SHELL` (or `FLASHCARDS_SHELL`), `package.json` `validate` (a
  `node --check`). Miss one and `npm test` fails.
- **CSP is strict:** `style-src 'self'` with no `'unsafe-inline'` — inline
  `style="…"` attributes are blocked and the smoke test asserts
  `document.querySelectorAll("[style]").length === 0`. All positioning/styling
  goes through CSS classes. `img-src 'self' data:` (so `<img src="data:…">` is
  fine, e.g. uploaded icons).
- **Gates:** `npm run validate` = `node --check` on every JS file +
  `scripts/validate-vocabulary.js`. `npm test` = `scripts/smoke-test.js`
  (jsdom, DOM-coupled — expect to update assertions when intended DOM changes) +
  `scripts/sw-test.js`. Add smoke coverage for new behaviour.
- **Verifying in a real browser:** the service worker caches aggressively. To
  see changes you must `navigator.serviceWorker.getRegistrations()` →
  `unregister()`, `caches.keys()` → `caches.delete()`, then hard-reload (a new
  query string forces a full document load).
- **Design:** quiet reference aesthetic — Space Grotesk wordmark, Inter
  everywhere else, hairline tables, no page titles on the reference, 4-item nav
  (utility screens like Customize/Help hang off the masthead, not the nav),
  always-on furigana, light/dark/system theme. Match the surrounding code's
  comment density and idiom.
- **Storage/sync pattern** (used by flashcards and table customisations):
  `localStorage` is the immediate source of truth; when signed in it also syncs
  through Supabase (`flashcard_settings` row). `supabase/schema.sql` uses
  `add column if not exists` so it's safe to paste/re-run.

---

## 1. Section-wide and full-reference print

**What:** Print an entire section (all its tables) or the whole reference, not
just one table.

**Why:** Print is per-table only right now (`printOne` in `interactions.js`).
Printing a category or the lot for offline study is an obvious gap.

**Approach:**
- `interactions.js` `printOne(i)` becomes `printScope({table|section|all})`;
  toggle a body class and mark the target sections `.print-target` instead of
  exactly one.
- A "Print section" item in… the expand-bar? or a small menu on the section
  heading. Keep it discoverable but quiet.
- `@media print` already hides chrome and lays tables out A4-friendly; verify
  multi-table page breaks (`break-inside: avoid` on `.table-section`).

**Files:** `js/vocab/interactions.js`, `index.html` (a control), `css/site.css`
(`@media print`), smoke test.
**Size:** S–M.

---

## 2. Offline / pending-sync indicator

**What:** A small status chip (masthead or Flashcards identity line) that shows
when the browser is offline, and when signed-in reviews are queued but not yet
synced.

**Why:** The PWA works offline and `data-ops.js` has an offline outbox
(`logsOutbox`, `syncOutbox`), but nothing surfaces that state — a user can't
tell whether their reviews are safe.

**Approach:**
- `navigator.onLine` + `online`/`offline` events for the connectivity half.
- Outbox depth: expose `getCache().logsOutbox.length` via a small
  `dataOps` getter; re-check after each `syncOutbox` run and on review submit.
- Render a chip: "Offline — changes saved here" / "Syncing N reviews…" /
  nothing when clean. Live-region so it's announced.
- Guest mode: never show a sync state (there's nothing to sync); an offline
  hint is still fine.

**Files:** `js/flashcards/data-ops.js` (getter + a change callback),
`js/flashcards/bootstrap.js` (render the chip), `css/site.css`, smoke test.
**Size:** S–M.

---

## 3. Reading-input practice (kana → romaji)

**What:** A drill that shows a kana word from the tables and asks you to type
its romaji; checks with the same lenient matching flashcards use
(`normalizeAnswer` — macron/long-vowel folding already handled).

**Why:** The kana→romaji converter (`js/vocab/kana-romaji.js`) and the lenient
answer checker (`js/flashcards/vocab-index.js`) already exist; this is mostly
glue. Good for cementing kana reading specifically, which flashcards don't
target directly.

**Approach:**
- Could live as a mode on the reference (a "Practice readings" button that
  walks visible kana rows) or a small tab in Flashcards. Reference-side keeps
  it zero-commitment (no cards created).
- Reuse `kanaRomaji.toRomaji` for the expected answer, `vidx.normalizeAnswer`
  for comparison.
- Session-only, no scheduling, no storage.

**Files:** new small module, `index.html`, `css/site.css`, `sw.js` +
`sw-test.js` + `package.json` if a new file, smoke test, README.
**Size:** M.
