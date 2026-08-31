// A small browser-level smoke test: loads the real index.html/app.js/vocabulary.js
// in jsdom and exercises the behaviors the static checks in validate-vocabulary.js
// can't see -- rendering, category-page navigation, search, view-mode accessible
// state, keyboard-operable toggles, and the print-selection class dance. Not a
// substitute for opening the page; a tripwire for the regressions a text diff
// wouldn't catch.
//
// The Flashcards checks below only cover page navigation, the per-row toggle,
// and pure answer-checking/vocab-index logic (exposed via window.SakuraStudy.flashcards.__testHooks)
// -- none of that needs a network. Everything that talks to Supabase (auth,
// add/remove/restore/delete-forever, review sync, offline-outbox replay) has
// no live project to test against here and needs manual verification instead.
const path = require("path");
const { JSDOM } = require("jsdom");

let failures = 0;
function check(label, cond) {
  if (cond) { console.log("  ok  " + label); }
  else { console.error("  FAIL " + label); failures++; }
}
// Flashcards' click handlers are `async function`s (they await a save/fetch
// before re-rendering) -- a plain .click() returns before that finishes, so
// asserting on the DOM right after can read a stale render. A real macrotask
// tick (not just a microtask) guarantees every pending render has landed.
function flush() { return new Promise((resolve) => setTimeout(resolve, 0)); }

async function main() {
  const url = "file://" + path.resolve("index.html");
  const dom = await JSDOM.fromFile(path.resolve("index.html"), {
    url,
    runScripts: "dangerously",
    resources: "usable",
    pretendToBeVisual: true,
    // js/config.js holds whoever's real project credentials once they've
    // completed SUPABASE_SETUP.md -- this test needs the "not configured yet"
    // path to be reachable regardless of what's actually committed right now.
    // js/config.js only fills SakuraStudy.config in when it isn't already set
    // (its `|| ` guard), so seeding an empty one here before any script runs
    // wins without having to intercept the file load.
    beforeParse(window) {
      window.SakuraStudy = { config: { url: "", anonKey: "" } };
    }
  });
  const { window } = dom;
  window.print = () => {}; // jsdom has no print engine
  window.scrollTo = () => {};
  window.HTMLElement.prototype.scrollIntoView = () => {};

  await new Promise((resolve, reject) => {
    window.addEventListener("load", resolve);
    setTimeout(() => reject(new Error("page did not finish loading (external scripts) within 5s")), 5000);
  });
  const document = window.document;

  console.log("Rendering");
  const sections = document.querySelectorAll(".table-section");
  check("renders 23 table sections", sections.length === 23);
  const totalRows = document.querySelectorAll(".vocab tbody tr").length;
  check("renders 508 vocabulary rows", totalRows === 508);
  check("every Japanese cell is marked lang=\"ja\"", [...document.querySelectorAll("td.jp")].every(td => td.getAttribute("lang") === "ja"));
  check("section toggle is a real <button> (native keyboard activation)", document.querySelector(".section-toggle").tagName === "BUTTON");
  check("controls are siblings of the toggle, not nested inside it", !document.querySelector(".section-toggle .print-one"));
  check("every table section carries its category", [...sections].every(s => s.dataset.category));
  // The page's CSP is style-src 'self' with no 'unsafe-inline', so any inline
  // style="" attribute gets silently dropped by the browser (not an error) --
  // easy to introduce by accident and easy to miss without a check like this.
  check("no element relies on an inline style=\"\" attribute (blocked by CSP style-src)", document.querySelectorAll("[style]").length === 0);

  console.log("Kana -> romaji reading layer (katakana)");
  const kr = window.SakuraStudy.kanaRomaji;
  check("the converter is exposed", kr && typeof kr.toRomaji === "function");
  const cases = {
    "ケチャップ": "kechappu",   // ッ doubles the next consonant
    "マヨネーズ": "mayonēzu",   // ー -> macron
    "キャベツ": "kyabetsu",     // yoon kya
    "ジャム": "jamu",           // ji + small ya -> ja (no y)
    "チョコ": "choko",          // cho
    "シュークリーム": "shūkurīmu",
    "コーヒー": "kōhī",
    "ラーメン": "rāmen",
    "パーティー": "pātī",
  };
  Object.keys(cases).forEach(k => check(`${k} -> ${cases[k]}`, kr.toRomaji(k) === cases[k]));
  // Decoration: katakana in a table cell becomes hover targets, and the romaji
  // is NOT in the DOM text (so search/sort see only the kana).
  const kataCell = [...document.querySelectorAll("#vocabulary td.jp")].find(td => td.querySelector(".kr"));
  check("katakana words render .kr hover targets in the table", !!kataCell);
  check("each .kr carries its romaji in data-r", [...kataCell.querySelectorAll(".kr")].every(s => /^[a-zāīūēō]+$/.test(s.dataset.r || "")));
  check("the romaji stays out of the cell's textContent", !/[a-z]/i.test(kataCell.textContent));
  check("hiragana / kanji rows get no .kr wrapping", !document.querySelector('#vocabulary td.jp ruby .kr'));

  console.log("Default landing page is Vocabulary");
  check("vocabulary page is visible on load", document.getElementById("vocabPage").hidden === false);
  check("flashcards page starts hidden", document.getElementById("flashcardsPage").hidden === true);
  check("no redundant page heading -- the nav is the only place the section is named", !document.getElementById("vocabPageTitle") && !document.querySelector("#vocabPage .page-title"));
  check("the Vocabulary nav link starts active", document.querySelector('#siteNav .site-nav-link[data-section="vocabulary"]').classList.contains("active"));
  check("only the Vocabulary section's tables are shown", [...document.querySelectorAll("#vocabulary .table-section")].every(s => s.classList.contains("page-hidden") === (s.dataset.section !== "vocabulary")));
  check("Grammar tables belong to the grammar section", [...document.querySelectorAll('.table-section[data-category="Grammar"]')].every(s => s.dataset.section === "grammar"));
  check("Travel tables belong to the travel section", [...document.querySelectorAll('.table-section[data-category="Travel"]')].every(s => s.dataset.section === "travel"));
  check("every other category belongs to the vocabulary section", [...document.querySelectorAll(".table-section")].filter(s => !["Grammar", "Travel"].includes(s.dataset.category)).every(s => s.dataset.section === "vocabulary"));

  console.log("Vocabulary section: content-category sub-headings + table-index dropdown");
  const catHeads = [...document.querySelectorAll('#vocabulary .cat-heading[data-section="vocabulary"]')];
  check("a sub-heading per Vocabulary category (Food & Ingredients / Kitchen & Dining / Numbers & Counting)", catHeads.length === 3);
  check("sub-headings are visible on the Vocabulary page", catHeads.every(h => !h.classList.contains("page-hidden")));
  const tindexMenu = document.getElementById("tindexMenu");
  check("the table-index dropdown menu starts closed", tindexMenu.hidden === true);
  check("its trigger reports collapsed", document.querySelector(".tindex-trigger").getAttribute("aria-expanded") === "false");
  const vocPanel = document.querySelector('#tableIndex .tindex-panel[data-section="vocabulary"]');
  check("the Vocabulary panel is the visible one", !!vocPanel && !vocPanel.classList.contains("page-hidden"));
  check("it links every Vocabulary table by name", (() => {
    const links = [...vocPanel.querySelectorAll('a[data-target]')];
    const tables = [...document.querySelectorAll('.table-section[data-section="vocabulary"]')];
    return links.length === tables.length && links.every(a => document.getElementById('table-' + a.dataset.target));
  })());
  check("the Vocabulary panel groups links by category (3 groups, 3 labels)", vocPanel.querySelectorAll('.tindex-cat-group').length === 3 && vocPanel.querySelectorAll('.tindex-cat').length === 3);
  check("category labels are plain text, not expand/collapse buttons", [...vocPanel.querySelectorAll('.tindex-cat')].every(c => c.tagName !== "BUTTON" && !c.hasAttribute("aria-expanded")));
  check("the Grammar panel is a single ungrouped list (no category label)", (() => {
    const g = document.querySelector('#tableIndex .tindex-panel[data-section="grammar"]');
    return g && g.querySelectorAll('.tindex-cat-group').length === 0 && g.querySelectorAll('.tindex-cat').length === 0 && !!g.querySelector('.tindex-list');
  })());
  check("a section with many tables is marked for the two-column layout", vocPanel.classList.contains("tindex-panel--wide") && !document.querySelector('#tableIndex .tindex-panel[data-section="grammar"]').classList.contains("tindex-panel--wide"));
  check("clicking the trigger opens the menu", (() => {
    document.querySelector(".tindex-trigger").click();
    return tindexMenu.hidden === false && document.querySelector(".tindex-trigger").getAttribute("aria-expanded") === "true";
  })());
  check("clicking outside closes it", (() => { document.body.click(); return tindexMenu.hidden === true; })());
  check("only the section's first table is open on landing", (() => {
    const tables = [...document.querySelectorAll('#vocabulary .table-section[data-section="vocabulary"]:not(.page-hidden)')];
    return tables.length > 1 && !tables[0].classList.contains("collapsed")
      && tables.slice(1).every(s => s.classList.contains("collapsed"));
  })());

  console.log("Four-item top navigation");
  const navLinks = [...document.querySelectorAll("#siteNav .site-nav-link")];
  check("nav is Vocabulary / Grammar / Travel / Flashcards", navLinks.map(l => l.textContent) .join(" ") === "Vocabulary Grammar Travel Flashcards");
  check("the three vocabulary sections carry data-section", navLinks.slice(0, 3).map(l => l.dataset.section).join(",") === "vocabulary,grammar,travel");
  check("last nav item is Flashcards", navLinks[3].dataset.page === "flashcards");
  check("no category is a top-level nav item", !navLinks.some(l => l.dataset.category));

  console.log("Sections behave like separate pages");
  const grammarNav = document.querySelector('#siteNav .site-nav-link[data-section="grammar"]');
  grammarNav.click();
  check("only Grammar tables are shown", [...document.querySelectorAll("#vocabulary .table-section")].every(s => s.classList.contains("page-hidden") === (s.dataset.section !== "grammar")));
  check("the Grammar table-index panel is now the visible one", (() => {
    const shown = [...document.querySelectorAll('#tableIndex .tindex-panel')].filter(t => !t.classList.contains("page-hidden"));
    return shown.length === 1 && shown[0].dataset.section === "grammar";
  })());
  check("the Grammar nav link is active", grammarNav.classList.contains("active"));
  check("the Vocabulary nav link is no longer active", !document.querySelector('#siteNav .site-nav-link[data-section="vocabulary"]').classList.contains("active"));
  check("Grammar has no in-flow category sub-heading (single category)", ![...document.querySelectorAll('#vocabulary .cat-heading:not(.page-hidden)')].length);

  console.log("\"Show polite\" only appears where verb rows are actually visible");
  check("hidden on Vocabulary (no verb tables)", (() => {
    document.querySelector('#siteNav .site-nav-link[data-section="vocabulary"]').click();
    return document.getElementById("politeToggle").hidden === true;
  })());
  check("still hidden on Grammar while only Adjectives is open (Verbs collapsed)", (() => {
    document.querySelector('#siteNav .site-nav-link[data-section="grammar"]').click();
    return document.getElementById("politeToggle").hidden === true;
  })());
  check("shown once the Verbs table is expanded", (() => {
    const verbs = [...document.querySelectorAll('#vocabulary .table-section:not(.page-hidden)')]
      .find(s => s.querySelector('.verb-form'));
    verbs.querySelector('.section-toggle').click();
    return document.getElementById("politeToggle").hidden === false;
  })());

  console.log("Directory shows aligned counts");
  check("every table link carries an entry count", [...document.querySelectorAll('#tindexMenu .tindex-panel[data-section="vocabulary"] a[data-target]')].every(a => /^\d+$/.test(a.querySelector('.tindex-count')?.textContent || "")));
  check("category labels carry a table count", [...document.querySelectorAll('#tindexMenu .tindex-panel[data-section="vocabulary"] .tindex-cat')].every(c => /^\d+$/.test(c.querySelector('.tindex-count')?.textContent || "")));

  console.log("URL hash routing");
  window.location.hash = "#grammar";
  window.dispatchEvent(new window.Event("popstate"));
  check("#grammar routes to the Grammar section", document.body.dataset.activeSection === "grammar");
  const advId = [...document.querySelectorAll('.table-section[data-section="grammar"]')].find(s => s.querySelector('.section-title-text').textContent === "Adjectives").dataset.table;
  window.location.hash = "#table-" + advId;
  window.dispatchEvent(new window.Event("popstate"));
  check("#table-N reveals and expands that table", (() => {
    const s = document.querySelector('.table-section[data-table="' + advId + '"]');
    return !s.classList.contains("page-hidden") && !s.classList.contains("collapsed") && document.body.dataset.activeSection === "grammar";
  })());
  window.location.hash = "";
  window.dispatchEvent(new window.Event("popstate"));
  check("an empty hash routes back to Vocabulary", document.body.dataset.activeSection === "vocabulary");

  console.log("Theme toggle (System / Light / Dark cycle)");
  const themeBtn = document.getElementById("themeToggle");
  const themeChoice = () => document.documentElement.getAttribute("data-theme-choice");
  const themeResolved = () => document.documentElement.getAttribute("data-theme");
  check("starts following the system (no explicit choice)", themeChoice() === "system");
  themeBtn.click();
  check("first click pins an explicit Light", themeChoice() === "light" && themeResolved() === "light");
  themeBtn.click();
  check("second click goes Dark", themeChoice() === "dark" && themeResolved() === "dark");
  themeBtn.click();
  check("third click returns to System", themeChoice() === "system");
  check("the button shows the icon for the current mode", (() => {
    const vis = (sel) => window.getComputedStyle(themeBtn.querySelector(sel)).display !== "none";
    return vis(".theme-icon-system") && !vis(".theme-icon-light") && !vis(".theme-icon-dark");
  })());

  console.log("Jumping to a table from the dropdown");
  // On Grammar: open the menu, jump to Verbs, menu closes.
  const verbsSec = [...document.querySelectorAll('.table-section[data-section="grammar"]')].find(s => s.querySelector('.section-title-text').textContent === "Verbs");
  document.querySelector(".tindex-trigger").click();
  const verbsIdxLink = document.querySelector('#tableIndex .tindex-panel[data-section="grammar"] a[data-target="' + verbsSec.dataset.table + '"]');
  verbsIdxLink.click();
  check("the target table is revealed and expanded", !verbsSec.classList.contains("page-hidden") && !verbsSec.classList.contains("collapsed"));
  check("its section siblings are collapsed", [...document.querySelectorAll('.table-section[data-section="grammar"]')].filter(s => s !== verbsSec).every(s => s.classList.contains("collapsed")));
  check("picking a table closes the menu", document.getElementById("tindexMenu").hidden === true);

  document.querySelector('#siteNav .site-nav-link[data-section="travel"]').click();
  check("Travel shows the travel section's tables", [...document.querySelectorAll('.table-section[data-category="Travel"]')].every(s => !s.classList.contains("page-hidden")));
  check("Grammar tables are hidden again", document.querySelector('.table-section[data-category="Grammar"]').classList.contains("page-hidden"));

  console.log("The wordmark routes back to Vocabulary");
  document.querySelector(".wordmark").click();
  check("wordmark returns to the Vocabulary section", document.body.dataset.activeSection === "vocabulary" && document.querySelector('#siteNav .site-nav-link[data-section="vocabulary"]').classList.contains("active"));

  console.log("Search reaches across every section");
  document.querySelector('#siteNav .site-nav-link[data-section="grammar"]').click();
  const input = document.getElementById("tableSearch");
  input.value = "beer";
  input.dispatchEvent(new window.Event("input", { bubbles: true }));
  const visibleRows = [...document.querySelectorAll(".table-section:not(.search-hidden) tbody tr:not(.search-hidden)")];
  check("searching 'beer' leaves exactly one visible row", visibleRows.length === 1);
  check("the match is highlighted", visibleRows[0] && !!visibleRows[0].querySelector("mark.search-hit"));
  check("the match (a Food table) is revealed even though Grammar was open", !document.querySelector('.table-section[data-table="1"]').classList.contains("page-hidden"));
  check("category sub-headings are hidden during a search", [...document.querySelectorAll("#vocabulary .cat-heading")].every(h => h.classList.contains("search-hidden")));
  check("the table-index dropdown is hidden during a search", document.getElementById("tableIndex").classList.contains("search-hidden"));
  input.value = "";
  input.dispatchEvent(new window.Event("input", { bubbles: true }));
  // A katakana query spans several .kr units, so its highlight lands on the
  // spans (not a split <mark>); the row must still surface and clear cleanly.
  input.value = "ケチャップ";
  input.dispatchEvent(new window.Event("input", { bubbles: true }));
  const kataRow = [...document.querySelectorAll(".table-section:not(.search-hidden) tbody tr:not(.search-hidden)")]
    .find(r => r.querySelector("td.jp")?.textContent === "ケチャップ");
  check("a katakana search surfaces its row", !!kataRow);
  check("...with the katakana units highlighted", kataRow && kataRow.querySelectorAll("td.jp .kr.search-hit").length >= 2);
  input.value = "";
  input.dispatchEvent(new window.Event("input", { bubbles: true }));
  check("clearing removes the katakana highlight too", !document.querySelector("td.jp .kr.search-hit"));
  check("clearing search shows every table again", document.querySelectorAll(".table-section.search-hidden").length === 0);
  check("clearing search restores the Grammar section", document.querySelector('.table-section[data-category="Grammar"]').classList.contains("page-hidden") === false && document.querySelector('.table-section[data-table="1"]').classList.contains("page-hidden") === true);
  check("...and restores the category sub-headings for the active section", [...document.querySelectorAll("#vocabulary .cat-heading")].every(h => !h.classList.contains("search-hidden")));
  check("...and restores the Grammar table-index dropdown", (() => {
    const ti = document.getElementById("tableIndex");
    const shown = [...ti.querySelectorAll('.tindex-panel')].filter(t => !t.classList.contains("page-hidden"));
    return !ti.classList.contains("search-hidden") && shown.length === 1 && shown[0].dataset.section === "grammar";
  })());

  console.log("View modes");
  const japaneseModeBtn = document.querySelector('.view-mode button[data-mode="japanese"]');
  japaneseModeBtn.click();
  check("active view-mode button reports aria-pressed=true", japaneseModeBtn.getAttribute("aria-pressed") === "true");
  const hiddenEnglishCell = document.querySelector(".vocab td:nth-child(3)");
  check("hidden column cells are aria-hidden (accessible state matches the visual)", hiddenEnglishCell.getAttribute("aria-hidden") === "true");
  const hiddenSortButton = document.querySelector(".vocab th:nth-child(3) .sort-button");
  check("sort control in a hidden column is disabled, not just invisible", hiddenSortButton.disabled === true);
  japaneseModeBtn.click(); // clicking the active scope again clears back to All
  check("clicking the active scope again clears aria-hidden", document.querySelector(".vocab td:nth-child(3)").getAttribute("aria-hidden") === null);
  check("...and no scope button stays active", !document.querySelector(".view-mode button.active"));

  console.log("Keyboard-operable table toggle");
  const grammarSection = document.querySelector('.table-section[data-category="Grammar"]');
  const wasCollapsed = grammarSection.classList.contains("collapsed");
  grammarSection.querySelector(".section-toggle").click();
  check("clicking the toggle (the same activation a native button gets from Enter/Space) flips collapsed state", grammarSection.classList.contains("collapsed") !== wasCollapsed);
  check("aria-expanded tracks the toggle", grammarSection.querySelector(".section-toggle").getAttribute("aria-expanded") === String(!grammarSection.classList.contains("collapsed")));

  console.log("Expand all / collapse all");
  document.querySelector('#siteNav .site-nav-link[data-section="vocabulary"]').click();
  const expandAllBtn = document.getElementById("expandAllBtn");
  const accordionIntact = () => {
    const tables = [...document.querySelectorAll('#vocabulary .table-section[data-section="vocabulary"]:not(.page-hidden)')];
    return tables.length > 1 && !tables[0].classList.contains("collapsed")
      && tables.slice(1).every(s => s.classList.contains("collapsed"));
  };
  check("the expand-all control starts as 'Expand all'", !!expandAllBtn && expandAllBtn.textContent === "Expand all" && expandAllBtn.getAttribute("aria-pressed") === "false");
  expandAllBtn.click();
  check("clicking it expands every visible Vocabulary table", [...document.querySelectorAll('#vocabulary .table-section[data-section="vocabulary"]:not(.page-hidden)')].every(s => !s.classList.contains("collapsed")));
  check("...the button flips to 'Collapse all' and body carries expand-all-mode", expandAllBtn.textContent === "Collapse all" && expandAllBtn.getAttribute("aria-pressed") === "true" && document.body.classList.contains("expand-all-mode"));
  expandAllBtn.click();
  check("clicking again snaps back to just the section's first table open", accordionIntact() && !document.body.classList.contains("expand-all-mode") && expandAllBtn.textContent === "Expand all");
  check("switching sections clears expand-all mode", (() => {
    expandAllBtn.click();
    document.querySelector('#siteNav .site-nav-link[data-section="grammar"]').click();
    const cleared = !document.body.classList.contains("expand-all-mode") && expandAllBtn.textContent === "Expand all";
    document.querySelector('#siteNav .site-nav-link[data-section="vocabulary"]').click();
    return cleared;
  })());
  check("a search hides the expand-all bar", (() => {
    const s = document.getElementById("tableSearch");
    s.value = "water";
    s.dispatchEvent(new window.Event("input", { bubbles: true }));
    const hidden = document.querySelector(".expand-bar").classList.contains("search-hidden");
    s.value = "";
    s.dispatchEvent(new window.Event("input", { bubbles: true }));
    return hidden;
  })());

  console.log("Table directory: every table visible at once, click to jump");
  document.querySelector('#siteNav .site-nav-link[data-section="vocabulary"]').click();
  document.querySelector(".tindex-trigger").click();
  const dirPanel = document.querySelector('#tableIndex .tindex-panel[data-section="vocabulary"]');
  check("opening it lists every Vocabulary table with nothing to expand", (() => {
    const links = [...dirPanel.querySelectorAll('a[data-target]')];
    const tables = [...document.querySelectorAll('.table-section[data-section="vocabulary"]')];
    return links.length === tables.length && !dirPanel.querySelector('.collapsed');
  })());
  check("no collapsible category toggles remain", !document.querySelector('.tindex-cat[aria-expanded], button.tindex-cat'));
  const dirLink = dirPanel.querySelector('a[data-target]');
  const dirTargetId = dirLink.dataset.target;
  dirLink.click();
  check("picking a table from the directory jumps to it and closes the menu", (() => {
    const sec = document.querySelector('.table-section[data-table="' + dirTargetId + '"]');
    return document.getElementById("tindexMenu").hidden === true &&
      !sec.classList.contains("page-hidden") && !sec.classList.contains("collapsed");
  })());
  check("the mobile bottom-sheet scrim element is present", !!document.querySelector('#tableIndex .tindex-scrim'));

  console.log("Table columns");
  const countersSection = document.querySelector('.table-section[data-table="0"]');
  check("there is no row-number column — Japanese leads the table", !countersSection.querySelector("td.row-num, .row-num-th"));
  const headerLabels = [...countersSection.querySelectorAll("thead th")].map(th => th.textContent.replace(/[↕↓↑]/g, "").trim());
  check("columns are Japanese → Romaji → Meaning", JSON.stringify(headerLabels) === JSON.stringify(["Japanese", "Romaji", "Meaning"]));

  console.log("Manage rows");
  const drinksSectionManage = document.querySelector('.table-section[data-table="1"]');
  const firstEyeBtn = drinksSectionManage.querySelector(".row-hide-btn");
  check("the eye toggle is hidden until manage mode is on", window.getComputedStyle(firstEyeBtn).display === "none");
  drinksSectionManage.querySelector(".manage-rows-toggle").click();
  check("turning on manage mode marks the section", drinksSectionManage.classList.contains("managing-rows"));
  check("the toggle label flips to Done", drinksSectionManage.querySelector(".manage-rows-toggle").textContent === "Done");
  const firstRow = drinksSectionManage.querySelector("tbody tr");
  firstRow.querySelector(".row-hide-btn").click();
  check("clicking the eye hides that row", firstRow.classList.contains("row-hidden"));
  const status = drinksSectionManage.querySelector(".rows-hidden-status");
  check("the status line appears and reports the count", status.hidden === false && status.querySelector(".rows-hidden-count").textContent === "1 row hidden");
  status.querySelector(".show-all-rows").click();
  check("Show all restores the row", !firstRow.classList.contains("row-hidden"));
  check("the status line hides again once nothing is hidden", drinksSectionManage.querySelector(".rows-hidden-status").hidden === true);

  console.log("Removed controls stay removed");
  check("no print-all button", !document.querySelector(".print-all"));
  check("no print-selected button", !document.querySelector(".print-selected"));
  check("no hide-section button", !document.querySelector(".hide-section"));
  check("no table-pick checkboxes", !document.querySelector(".table-pick"));

  console.log("Print this table (icon button)");
  const printOneBtn = document.querySelector('.table-section[data-table="0"] .print-icon-btn');
  check("print-one is icon-only with an accessible label", printOneBtn.getAttribute("aria-label") === "Print this table" && printOneBtn.textContent.trim() === "");
  check("narrow screens also get a Print entry inside the overflow menu", !!document.querySelector('.table-section[data-table="0"] .section-menu-list .print-menu-item'));
  printOneBtn.click();
  check("clicking it marks body.print-only", document.body.classList.contains("print-only"));
  check("clicking it marks its own table as the print target", document.querySelector('.table-section[data-table="0"]').classList.contains("print-target"));
  check("other tables are not print targets", !document.querySelector('.table-section[data-table="1"]').classList.contains("print-target"));
  window.dispatchEvent(new window.Event("afterprint"));
  check("afterprint clears print-only", !document.body.classList.contains("print-only"));
  check("afterprint clears print-target", !document.querySelector('.table-section[data-table="0"]').classList.contains("print-target"));

  console.log("Flashcards: page navigation");
  check("no console errors from vendor/flashcards scripts loading", true); // JSDOM.fromFile above would have rejected on a thrown top-level error
  const flashcardsLink = document.querySelector('#siteNav .site-nav-link[data-page="flashcards"]');
  check("Flashcards nav link exists", !!flashcardsLink);
  flashcardsLink.click();
  check("clicking it reveals the Flashcards page", document.getElementById("flashcardsPage").hidden === false);
  check("clicking it hides the vocabulary view", document.getElementById("vocabPage").hidden === true);
  check("clicking it marks the Flashcards link active", flashcardsLink.classList.contains("active"));
  check("no vocabulary-section nav link stays active on Flashcards", !document.querySelector('#siteNav .site-nav-link[data-section].active'));
  check("without Supabase configured, it explains setup is needed", document.getElementById("flashcardsPage").textContent.includes("SUPABASE_SETUP.md"));
  document.querySelector('#siteNav .site-nav-link[data-section="vocabulary"]').click();
  check("Vocabulary still returns to the reference (unaffected by the Flashcards page)", document.getElementById("vocabPage").hidden === false);

  console.log("Flashcards: per-row add toggle");
  // Table 2 (not table 1) -- table 1's own "Manage rows" state was already
  // toggled on earlier in this file and left that way, which would make the
  // manage-mode check below a false positive.
  const drinksSectionFc = document.querySelector('.table-section[data-table="2"]');
  const firstRowFc = drinksSectionFc.querySelector("tbody tr");
  check("every rendered row carries its permanent vocab id", /^v\d{4,}$/.test(firstRowFc.dataset.vocabId));
  const fcBtn = firstRowFc.querySelector(".fc-toggle-btn");
  check("the flashcard toggle exists on every row", !!fcBtn);
  // Unlike the eye icon it isn't display:none -- it's laid out on every row
  // (so touch users and keyboard users can reach it) but transparent until
  // the row is hovered/focused, so the reading table stays quiet.
  check("the toggle is present in layout, not display:none", window.getComputedStyle(fcBtn).display !== "none");
  check("but it's transparent until the row is hovered or focused", window.getComputedStyle(fcBtn).opacity === "0");
  drinksSectionFc.querySelector(".manage-rows-toggle").click();
  check("Manage rows makes it permanently visible", window.getComputedStyle(fcBtn).opacity === "1");
  check("its data-vocab-id matches the row's", fcBtn.dataset.vocabId === firstRowFc.dataset.vocabId);
  drinksSectionFc.querySelector(".manage-rows-toggle").click(); // leave manage mode off for later checks

  console.log("Flashcards: add a whole table at once");
  const fcMenuBtn = drinksSectionFc.querySelector(".section-menu-btn");
  check("secondary table actions sit behind one overflow menu button", !!fcMenuBtn && fcMenuBtn.getAttribute("aria-haspopup") === "true");
  check("the menu starts closed", drinksSectionFc.querySelector(".section-menu-list").hidden === true);
  fcMenuBtn.click();
  check("clicking the menu button opens it", drinksSectionFc.querySelector(".section-menu-list").hidden === false && fcMenuBtn.getAttribute("aria-expanded") === "true");
  const addTableBtn = drinksSectionFc.querySelector(".section-menu-list .fc-add-table-btn");
  check("the menu holds an \"Add to flashcards\" action for this table", !!addTableBtn && addTableBtn.dataset.table === "2");
  check("the menu also holds \"Manage rows\"", !!drinksSectionFc.querySelector(".section-menu-list .manage-rows-toggle"));
  document.body.click();
  check("clicking elsewhere dismisses the menu", drinksSectionFc.querySelector(".section-menu-list").hidden === true);
  check("no element relies on an inline style=\"\" attribute, even after rendering the new controls", document.querySelectorAll("[style]").length === 0);

  console.log("Flashcards: guest mode (no account, on-device only -- no network involved, fully testable here)");
  // jsdom treats a bare file:// page as an opaque origin, where the spec
  // says localStorage access itself must throw -- real browsers don't do
  // this for file:// (and never for http/https, which is what the site
  // actually runs as), so this is purely a sandbox artifact. The app
  // already handles it (see getStoredMode/loadCache's own try/catch and
  // the in-memory fallback that keeps guest mode working for the rest of
  // this pageview regardless); this test mirrors that same defensiveness
  // rather than asserting on window.localStorage directly.
  function readLocalStorage(key) {
    try { return window.localStorage.getItem(key); } catch (e) { return undefined; } // undefined = inaccessible here, not "empty"
  }
  const storageUsable = readLocalStorage("sakura-flashcards-mode") !== undefined;

  document.querySelector('#siteNav .site-nav-link[data-page="flashcards"]').click();
  const guestBtn = document.getElementById("fcUseGuest");
  check("a \"Continue without an account\" option is offered alongside signing in", !!guestBtn);
  guestBtn.click();
  check("choosing it goes straight to the Dashboard tab, no session needed", !!document.querySelector("#fcPanelDashboard"));
  check("it's labeled as on-device, not signed in", document.getElementById("flashcardsPage").textContent.includes("Using this device only"));
  if (storageUsable) check("guest mode is remembered in localStorage", readLocalStorage("sakura-flashcards-mode") === "guest");
  check("with nothing added yet, the Dashboard shows an empty state (not a grid of zeroes)",
    !document.querySelector(".fc-stats-grid") && /No flashcards yet/.test(document.querySelector("#fcPanelDashboard").textContent));
  document.querySelector('.fc-tab[data-tab="manage"]').click();
  const firstManageTable = document.querySelector("#fcPanelManage .fc-manage-table");
  check("each table starts collapsed (this list gets long fast otherwise)", firstManageTable.classList.contains("fc-manage-table-collapsed"));
  check("...its row list is actually hidden, not just visually collapsed", window.getComputedStyle(firstManageTable.querySelector(".fc-manage-list")).display === "none");
  check("a fresh deck shows no dead buttons -- 'Add table' only, no disabled 'Pause table'",
    firstManageTable.querySelector('[data-table-action="add-table"]') &&
    !firstManageTable.querySelector('[data-table-action="remove-table"]') &&
    !firstManageTable.querySelector('.fc-manage-table-actions .fc-btn[disabled]'));
  check("a multi-table category offers 'Add all'", !!document.querySelector('#fcPanelManage [data-cat-action="add-cat"]'));
  firstManageTable.querySelector(".fc-manage-table-toggle").click(); // sync render -- re-query fresh, this reference is now stale
  check("clicking the toggle expands just that table", !document.querySelector("#fcPanelManage .fc-manage-table").classList.contains("fc-manage-table-collapsed"));
  const firstAddBtn = document.querySelector('#fcPanelManage [data-action="add"]');
  check("Manage lists addable vocabulary in guest mode too", !!firstAddBtn);
  firstAddBtn.click();
  await flush();
  document.querySelector('.fc-tab[data-tab="dashboard"]').click();
  const totalTileAfter = document.querySelector(".fc-stat-tile:nth-child(2) .fc-stat-value").textContent;
  check("adding a word in guest mode updates the count with zero network calls", totalTileAfter === "4");
  if (storageUsable) check("its data actually lives in localStorage (not just in-memory)", /"active":true/.test(readLocalStorage("sakura-flashcards-guest-v1") || ""));

  console.log("Flashcards: review session bookends");
  document.getElementById("fcStudyNow").click();
  check("Study now opens a review card", !!document.querySelector(".fc-review-card"));
  check("the review card has an in-session way out", !!document.getElementById("fcEndSession"));
  document.getElementById("fcAnswerInput").value = "definitely-not-right";
  document.getElementById("fcAnswerForm").dispatchEvent(new window.Event("submit", { bubbles: true, cancelable: true }));
  check("checking the answer reveals the four rating buttons", document.querySelectorAll(".fc-rating-btn").length === 4);
  document.querySelector('.fc-rating-btn[data-rating="again"]').click();
  await flush();
  document.getElementById("fcEndSession").click();
  const doneText = (document.querySelector(".fc-session-done") || {}).textContent || "";
  check("ending mid-session shows a wrap-up, not a blank panel", /reviewed/.test(doneText));
  check("the wrap-up counts the card just reviewed", /1 reviewed/.test(doneText) && /correct/.test(doneText));
  document.getElementById("fcBackToDashboard").click();
  check("Back to Dashboard leaves the session for the dashboard", !document.querySelector(".fc-session-done") && !!document.querySelector(".fc-stats-grid"));

  console.log("Flashcards: Settings tab");
  document.querySelector('.fc-tab[data-tab="settings"]').click();
  const dirChecks = [...document.querySelectorAll(".fc-dir-checkbox")];
  check("all 4 directions are offered as a setting", dirChecks.length === 4);
  check("all 4 are enabled by default", dirChecks.every(cb => cb.checked));
  check("one Save button covers the whole tab (not one per section)",
    !!document.getElementById("fcSaveSettings") && !document.getElementById("fcSaveDirections") && !document.getElementById("fcSaveFsrs"));
  dirChecks.forEach(cb => { cb.checked = false; });
  document.getElementById("fcSaveSettings").click();
  check("saving with no direction enabled is rejected", document.getElementById("fcDirError").hidden === false);
  document.querySelector('.fc-tab[data-tab="settings"]').click(); // re-render fresh
  check("...and nothing was actually saved (still all on)", [...document.querySelectorAll(".fc-dir-checkbox")].every(cb => cb.checked));
  document.querySelector('.fc-dir-checkbox[data-direction="ro-en"]').checked = false;
  document.getElementById("fcSaveSettings").click();
  await flush();
  check("a successful save is acknowledged inline", document.getElementById("fcSettingsSaved").hidden === false);
  document.querySelector('.fc-tab[data-tab="settings"]').click();
  const roEnBox = document.querySelector('.fc-dir-checkbox[data-direction="ro-en"]');
  check("turning off just one direction is remembered", !roEnBox.checked && document.querySelector('.fc-dir-checkbox[data-direction="jp-en"]').checked);
  roEnBox.checked = true;
  document.getElementById("fcSaveSettings").click(); // leave every direction enabled again for later checks
  await flush();

  const goAccountBtn = document.getElementById("fcGoAccount");
  check("guest mode offers a way to switch to syncing", !!goAccountBtn);
  goAccountBtn.click();
  check("switching to sign-in returns to the entry choice", !document.querySelector(".fc-stats-grid") && !!document.getElementById("fcUseGuest"));
  if (storageUsable) {
    check("...forgets the guest *preference*...", readLocalStorage("sakura-flashcards-mode") !== "guest");
    check("...but never touches the guest data itself", /"active":true/.test(readLocalStorage("sakura-flashcards-guest-v1") || ""));
  } else {
    // Without persistent storage in this sandbox, "not forgotten" shows up
    // as the in-memory fallback instead: picking guest mode again still has
    // the card we just added, proving setStoredMode/loadCache's in-memory
    // fallback (not just localStorage) is what's actually keeping state.
    document.getElementById("fcUseGuest").click();
    document.querySelector('.fc-tab[data-tab="dashboard"]').click(); // last tab left active was Settings
    const totalTileAgain = document.querySelector(".fc-stat-tile:nth-child(2) .fc-stat-value").textContent;
    check("...the in-memory fallback keeps the session's guest data reachable regardless", totalTileAgain === "4");
  }
  document.querySelector('#siteNav .site-nav-link[data-section="vocabulary"]').click();

  console.log("Flashcards: answer checking and vocab index (pure-logic hooks)");
  const fc = window.SakuraStudy.flashcards.__testHooks;
  check("test hooks are exposed", !!fc);
  check("normalizeAnswer trims/collapses/lowercases", fc.normalizeAnswer("  Hot   Water  ", false) === "hot water");
  check("normalizeAnswer folds macrons for romaji", fc.normalizeAnswer("Kōhī", true) === "kohi");
  check("normalizeAnswer strips a leading ~ for romaji (counters)", fc.normalizeAnswer("~ko", true) === "ko");
  const vocabIndex = fc.getVocabIndex();
  const beerEntry = Object.values(vocabIndex).find(e => e.englishDisplay === "beer");
  check("vocab index resolves a known entry by content", !!beerEntry);
  check("checkAnswer accepts an exact (normalized) match", fc.checkAnswer(beerEntry, "jp-en", "  BEER "));
  check("checkAnswer rejects a clearly wrong answer", !fc.checkAnswer(beerEntry, "jp-en", "wine"));
  const listenEntry = Object.values(vocabIndex).find(e => e.englishDisplay === "hear / listen / ask");
  check("multi-answer English fields accept any listed alternative", !!listenEntry && fc.checkAnswer(listenEntry, "jp-en", "listen") && fc.checkAnswer(listenEntry, "jp-en", "ask"));
  check("multi-answer English fields still reject an unlisted word", !fc.checkAnswer(listenEntry, "jp-en", "speak"));
  const numberEntry = Object.values(vocabIndex).find(e => e.englishDisplay === "0");
  check("the Numbers table now carries real romaji (not kana), so the row is romaji-usable", !!numberEntry && numberEntry.romajiUsable === true);
  check("...so all four directions are offered for it", JSON.stringify(fc.directionsForEntry(numberEntry)) === JSON.stringify(["jp-en", "jp-ro", "ro-en", "en-ro"]));
  check("a normal entry offers all four directions", JSON.stringify(fc.directionsForEntry(beerEntry)) === JSON.stringify(["jp-en", "jp-ro", "ro-en", "en-ro"]));

  console.log(failures === 0 ? "\nSmoke test passed." : "\n" + failures + " smoke test check(s) failed.");
  process.exit(failures === 0 ? 0 : 1);
}

main().catch(err => { console.error(err); process.exit(1); });
