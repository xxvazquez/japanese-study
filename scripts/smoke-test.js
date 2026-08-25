// A small browser-level smoke test: loads the real index.html/app.js/vocabulary.js
// in jsdom and exercises the behaviors the static checks in validate-vocabulary.js
// can't see -- rendering, category-page navigation, search, view-mode accessible
// state, keyboard-operable toggles, and the print-selection class dance. Not a
// substitute for opening the page; a tripwire for the regressions a text diff
// wouldn't catch.
const path = require("path");
const { JSDOM } = require("jsdom");

let failures = 0;
function check(label, cond) {
  if (cond) { console.log("  ok  " + label); }
  else { console.error("  FAIL " + label); failures++; }
}

async function main() {
  const url = "file://" + path.resolve("index.html");
  const dom = await JSDOM.fromFile(path.resolve("index.html"), {
    url,
    runScripts: "dangerously",
    resources: "usable",
    pretendToBeVisual: true
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
  check("renders 14 table sections", sections.length === 14);
  const totalRows = document.querySelectorAll(".vocab tbody tr").length;
  check("renders 354 vocabulary rows", totalRows === 354);
  check("every Japanese cell is marked lang=\"ja\"", [...document.querySelectorAll("td.jp")].every(td => td.getAttribute("lang") === "ja"));
  check("section toggle is a real <button> (native keyboard activation)", document.querySelector(".section-toggle").tagName === "BUTTON");
  check("controls are siblings of the toggle, not nested inside it", !document.querySelector(".section-toggle .print-one"));
  check("every table section carries its category", [...sections].every(s => s.dataset.category));

  console.log("Default landing page is the Overview table of contents");
  check("vocabulary starts hidden", document.getElementById("vocabulary").hidden === true);
  check("overview page starts visible", document.getElementById("overviewPage").hidden === false);
  check("the Overview sidebar link starts active", document.querySelector(".sidebar-overview").classList.contains("active"));

  console.log("Overview table of contents");
  const overviewGroups = document.querySelectorAll(".overview-group");
  check("overview renders one group per category", overviewGroups.length === 4);
  check("overview links cover every table", document.querySelectorAll(".overview-group-items a").length === 14);
  const overviewNames = [...overviewGroups].map(g => g.querySelector(".cat-name").textContent.trim());
  check("overview categories are ordered alphabetically", JSON.stringify(overviewNames) === JSON.stringify([...overviewNames].sort((a, b) => a.localeCompare(b))));

  console.log("Sidebar table index");
  const sidebarGroups = document.querySelectorAll(".sidebar-group");
  check("sidebar renders category groups", sidebarGroups.length === 4);
  check("each group header carries a colored icon", [...sidebarGroups].every(g => !!g.querySelector(".cat-icon svg")));
  check("each group header shows a table count", [...sidebarGroups].every(g => /^\d+$/.test(g.querySelector(".cat-count").textContent.trim())));
  const groupNames = [...sidebarGroups].map(g => g.querySelector(".cat-name").textContent.trim());
  check("categories are ordered alphabetically", JSON.stringify(groupNames) === JSON.stringify([...groupNames].sort((a, b) => a.localeCompare(b))));
  const firstGroupLinks = [...sidebarGroups[0].querySelectorAll(".sidebar-group-items a")].map(a => a.textContent.trim());
  check("tables are ordered alphabetically within a category", JSON.stringify(firstGroupLinks) === JSON.stringify([...firstGroupLinks].sort((a, b) => a.localeCompare(b))));
  check("sidebar links cover every table", document.querySelectorAll(".sidebar-group-items a").length === 14);

  console.log("Sidebar accordion (independent of which page is open)");
  const chevron = sidebarGroups[0].querySelector(".sidebar-group-chevron");
  chevron.click();
  check("clicking a chevron collapses that group", sidebarGroups[0].classList.contains("collapsed"));
  check("aria-expanded tracks the collapsed state", chevron.getAttribute("aria-expanded") === "false");
  chevron.click();
  check("clicking it again re-expands the group", !sidebarGroups[0].classList.contains("collapsed"));

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

  console.log("Removed controls stay removed");
  check("no expand-all button", !document.querySelector(".expand-all"));
  check("no collapse-all button", !document.querySelector(".collapse-all"));
  check("no print-all button", !document.querySelector(".print-all"));
  check("no print-selected button", !document.querySelector(".print-selected"));
  check("no hide-section button", !document.querySelector(".hide-section"));
  check("no table-pick checkboxes", !document.querySelector(".table-pick"));

  console.log("Print this table (icon button)");
  const printOneBtn = document.querySelector('.table-section[data-table="0"] .print-one');
  check("print-one is icon-only with an accessible label", printOneBtn.getAttribute("aria-label") === "Print this table" && printOneBtn.textContent.trim() === "");
  printOneBtn.click();
  check("clicking it marks body.print-only", document.body.classList.contains("print-only"));
  check("clicking it marks its own table as the print target", document.querySelector('.table-section[data-table="0"]').classList.contains("print-target"));
  check("other tables are not print targets", !document.querySelector('.table-section[data-table="1"]').classList.contains("print-target"));
  window.dispatchEvent(new window.Event("afterprint"));
  check("afterprint clears print-only", !document.body.classList.contains("print-only"));
  check("afterprint clears print-target", !document.querySelector('.table-section[data-table="0"]').classList.contains("print-target"));

  console.log(failures === 0 ? "\nSmoke test passed." : "\n" + failures + " smoke test check(s) failed.");
  process.exit(failures === 0 ? 0 : 1);
}

main().catch(err => { console.error(err); process.exit(1); });
