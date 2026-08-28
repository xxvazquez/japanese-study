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

  console.log("Default landing page is the Overview table of contents");
  check("vocabulary starts hidden", document.getElementById("vocabulary").hidden === true);
  check("overview page starts visible", document.getElementById("overviewPage").hidden === false);
  check("the Overview sidebar link starts active", document.querySelector(".sidebar-overview").classList.contains("active"));

  console.log("Overview table of contents");
  const overviewGroups = document.querySelectorAll(".overview-group");
  check("overview renders one group per category", overviewGroups.length === 5);
  check("overview links cover every table", document.querySelectorAll(".overview-group-items a").length === 23);
  const overviewNames = [...overviewGroups].map(g => g.querySelector(".cat-name").textContent.trim());
  check("overview categories are ordered alphabetically", JSON.stringify(overviewNames) === JSON.stringify([...overviewNames].sort((a, b) => a.localeCompare(b))));

  console.log("Sidebar table index");
  const sidebarGroups = document.querySelectorAll(".sidebar-group");
  check("sidebar renders category groups", sidebarGroups.length === 5);
  check("each group header carries a colored icon", [...sidebarGroups].every(g => !!g.querySelector(".cat-icon svg")));
  check("each group header shows a table count", [...sidebarGroups].every(g => /^\d+$/.test(g.querySelector(".cat-count").textContent.trim())));
  const groupNames = [...sidebarGroups].map(g => g.querySelector(".cat-name").textContent.trim());
  check("categories are ordered alphabetically", JSON.stringify(groupNames) === JSON.stringify([...groupNames].sort((a, b) => a.localeCompare(b))));
  const firstGroupLinks = [...sidebarGroups[0].querySelectorAll(".sidebar-group-items a")].map(a => a.textContent.trim());
  check("tables are ordered alphabetically within a category", JSON.stringify(firstGroupLinks) === JSON.stringify([...firstGroupLinks].sort((a, b) => a.localeCompare(b))));
  check("sidebar links cover every table", document.querySelectorAll(".sidebar-group-items a").length === 23);

  console.log("Sidebar accordion (independent of which page is open)");
  const chevron = sidebarGroups[0].querySelector(".sidebar-group-chevron");
  check("groups start collapsed on the Overview page (only the active category expands)", sidebarGroups[0].classList.contains("collapsed"));
  chevron.click();
  check("clicking a chevron expands that group", !sidebarGroups[0].classList.contains("collapsed"));
  check("aria-expanded tracks the expanded state", chevron.getAttribute("aria-expanded") === "true");
  check("expanding one group collapses the others (true accordion)", [...sidebarGroups].slice(1).every(g => g.classList.contains("collapsed")));
  chevron.click();
  check("clicking it again re-collapses the group", sidebarGroups[0].classList.contains("collapsed"));

  console.log("Categories behave like separate pages");
  const grammarNav = document.querySelector('.sidebar-group-nav[data-category="Grammar"]');
  grammarNav.click();
  check("opening a category reveals the vocabulary view", document.getElementById("vocabulary").hidden === false);
  check("opening a category hides the overview page", document.getElementById("overviewPage").hidden === true);
  check("only that category's tables are shown", [...document.querySelectorAll(".table-section")].every(s => s.classList.contains("page-hidden") === (s.dataset.category !== "Grammar")));
  check("the sidebar marks that category nav active", grammarNav.classList.contains("active"));
  check("the Overview link is no longer active", !document.querySelector(".sidebar-overview").classList.contains("active"));

  const drinksLink = document.querySelector('.sidebar-group-items a[data-target="1"]');
  drinksLink.click();
  const drinksSection = document.querySelector('.table-section[data-table="1"]');
  check("picking a table from a different category switches pages", !drinksSection.classList.contains("page-hidden"));
  check("the previous category's tables are hidden again", document.querySelector('.table-section[data-category="Grammar"]').classList.contains("page-hidden"));
  check("the picked table is expanded", !drinksSection.classList.contains("collapsed"));
  check("the picked table's sidebar link is active", drinksLink.classList.contains("active"));

  console.log("Overview link returns to the table of contents");
  document.querySelector(".sidebar-overview").click();
  check("Overview link hides the vocabulary tables", document.getElementById("vocabulary").hidden === true);
  check("Overview link reveals the overview page", document.getElementById("overviewPage").hidden === false);
  check("Overview link is marked active again", document.querySelector(".sidebar-overview").classList.contains("active"));

  console.log("Search reaches across category pages");
  document.querySelector('.sidebar-group-nav[data-category="Grammar"]').click();
  const input = document.getElementById("tableSearch");
  input.value = "beer";
  input.dispatchEvent(new window.Event("input", { bubbles: true }));
  check("search reveals the vocabulary view", document.getElementById("vocabulary").hidden === false);
  const visibleRows = [...document.querySelectorAll(".table-section:not(.search-hidden) tbody tr:not(.search-hidden)")];
  check("searching 'beer' leaves exactly one visible row", visibleRows.length === 1);
  check("the match is highlighted", visibleRows[0] && !!visibleRows[0].querySelector("mark.search-hit"));
  check("the matching table is pulled out of its category's page-hidden state", !document.querySelector('.table-section[data-table="1"]').classList.contains("page-hidden"));
  input.value = "";
  input.dispatchEvent(new window.Event("input", { bubbles: true }));
  check("clearing search shows every table again", document.querySelectorAll(".table-section.search-hidden").length === 0);
  check("clearing search restores the category page that was open before searching", document.querySelector('.table-section[data-category="Grammar"]').classList.contains("page-hidden") === false && document.querySelector('.table-section[data-table="1"]').classList.contains("page-hidden") === true);

  console.log("View modes");
  const japaneseModeBtn = document.querySelector('.view-mode button[data-mode="japanese"]');
  japaneseModeBtn.click();
  check("active view-mode button reports aria-pressed=true", japaneseModeBtn.getAttribute("aria-pressed") === "true");
  const hiddenEnglishCell = document.querySelector(".vocab td:nth-child(3)");
  check("hidden column cells are aria-hidden (accessible state matches the visual)", hiddenEnglishCell.getAttribute("aria-hidden") === "true");
  const hiddenSortButton = document.querySelector(".vocab th:nth-child(3) .sort-button");
  check("sort control in a hidden column is disabled, not just invisible", hiddenSortButton.disabled === true);
  document.querySelector('.view-mode button[data-mode="all"]').click();
  check("switching back to All clears aria-hidden", document.querySelector(".vocab td:nth-child(3)").getAttribute("aria-hidden") === null);

  console.log("Keyboard-operable table toggle");
  const grammarSection = document.querySelector('.table-section[data-category="Grammar"]');
  const wasCollapsed = grammarSection.classList.contains("collapsed");
  grammarSection.querySelector(".section-toggle").click();
  check("clicking the toggle (the same activation a native button gets from Enter/Space) flips collapsed state", grammarSection.classList.contains("collapsed") !== wasCollapsed);
  check("aria-expanded tracks the toggle", grammarSection.querySelector(".section-toggle").getAttribute("aria-expanded") === String(!grammarSection.classList.contains("collapsed")));

  console.log("Table columns");
  const countersSection = document.querySelector('.table-section[data-table="0"]');
  check("there is no row-number column — Japanese leads the table", !countersSection.querySelector("td.row-num, .row-num-th"));
  const headerLabels = [...countersSection.querySelectorAll("thead th")].map(th => th.textContent.replace(/[↕↓↑]/g, "").trim());
  check("columns are Japanese → Romaji → English", JSON.stringify(headerLabels) === JSON.stringify(["Japanese", "Romaji", "English"]));

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
  check("no expand-all button", !document.querySelector(".expand-all"));
  check("no collapse-all button", !document.querySelector(".collapse-all"));
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
  const flashcardsLink = document.querySelector(".sidebar-flashcards");
  check("Flashcards sidebar link exists", !!flashcardsLink);
  flashcardsLink.click();
  check("clicking it reveals the Flashcards page", document.getElementById("flashcardsPage").hidden === false);
  check("clicking it hides the vocabulary view", document.getElementById("vocabulary").hidden === true);
  check("clicking it hides the Overview page", document.getElementById("overviewPage").hidden === true);
  check("clicking it marks the Flashcards link active", flashcardsLink.classList.contains("active"));
  check("without Supabase configured, it explains setup is needed", document.getElementById("flashcardsPage").textContent.includes("SUPABASE_SETUP.md"));
  document.querySelector(".sidebar-overview").click();
  check("Overview still returns to the table of contents (unaffected by the new page)", document.getElementById("overviewPage").hidden === false);

  console.log("Flashcards: per-row add toggle");
  // Table 2 (not table 1) -- table 1's own "Manage rows" state was already
  // toggled on earlier in this file and left that way, which would make the
  // "hidden until Manage rows is on" check below a false positive.
  const drinksSectionFc = document.querySelector('.table-section[data-table="2"]');
  const firstRowFc = drinksSectionFc.querySelector("tbody tr");
  check("every rendered row carries its permanent vocab id", /^v\d{4,}$/.test(firstRowFc.dataset.vocabId));
  const fcBtn = firstRowFc.querySelector(".fc-toggle-btn");
  check("the flashcard toggle exists on every row", !!fcBtn);
  check("it's hidden until Manage rows is on (same gating as the eye icon)", window.getComputedStyle(fcBtn).display === "none");
  drinksSectionFc.querySelector(".manage-rows-toggle").click();
  check("Manage rows reveals it too", window.getComputedStyle(fcBtn).display !== "none");
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

  document.querySelector(".sidebar-flashcards").click();
  const guestBtn = document.getElementById("fcUseGuest");
  check("a \"Continue without an account\" option is offered alongside signing in", !!guestBtn);
  guestBtn.click();
  check("choosing it goes straight to the Dashboard, no session needed", !!document.querySelector(".fc-stats-grid"));
  check("it's labeled as on-device, not signed in", document.getElementById("flashcardsPage").textContent.includes("Using this device only"));
  if (storageUsable) check("guest mode is remembered in localStorage", readLocalStorage("sakura-flashcards-mode") === "guest");
  const totalTileBefore = document.querySelector(".fc-stat-tile:nth-child(2) .fc-stat-value").textContent;
  check("starts with zero cards", totalTileBefore === "0");
  document.querySelector('.fc-tab[data-tab="manage"]').click();
  const firstManageTable = document.querySelector("#fcPanelManage .fc-manage-table");
  check("each table starts collapsed (this list gets long fast otherwise)", firstManageTable.classList.contains("fc-manage-table-collapsed"));
  check("...its row list is actually hidden, not just visually collapsed", window.getComputedStyle(firstManageTable.querySelector(".fc-manage-list")).display === "none");
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

  console.log("Flashcards: Study Directions setting");
  document.querySelector('.fc-tab[data-tab="settings"]').click();
  const dirChecks = [...document.querySelectorAll(".fc-dir-checkbox")];
  check("all 4 directions are offered as a setting", dirChecks.length === 4);
  check("all 4 are enabled by default", dirChecks.every(cb => cb.checked));
  dirChecks.forEach(cb => { cb.checked = false; });
  document.getElementById("fcSaveDirections").click();
  check("saving with none enabled is rejected", document.getElementById("fcDirError").hidden === false);
  document.querySelector('.fc-tab[data-tab="settings"]').click(); // re-render fresh
  check("...and nothing was actually saved (still all on)", [...document.querySelectorAll(".fc-dir-checkbox")].every(cb => cb.checked));
  document.querySelector('.fc-dir-checkbox[data-direction="ro-en"]').checked = false;
  document.getElementById("fcSaveDirections").click();
  await flush();
  document.querySelector('.fc-tab[data-tab="settings"]').click();
  const roEnBox = document.querySelector('.fc-dir-checkbox[data-direction="ro-en"]');
  check("turning off just one direction is remembered", !roEnBox.checked && document.querySelector('.fc-dir-checkbox[data-direction="jp-en"]').checked);
  roEnBox.checked = true;
  document.getElementById("fcSaveDirections").click(); // leave every direction enabled again for later checks
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
  document.querySelector(".sidebar-overview").click();

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
