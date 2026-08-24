// A small browser-level smoke test: loads the real index.html/app.js/vocabulary.js
// in jsdom and exercises the behaviors the static checks in validate-vocabulary.js
// can't see -- rendering, search, view-mode accessible state, keyboard-operable
// toggles, and the print-selection class dance. Not a substitute for opening the
// page; a tripwire for the regressions a text diff wouldn't catch.
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

  console.log("Search");
  const input = document.getElementById("tableSearch");
  input.value = "beer";
  input.dispatchEvent(new window.Event("input", { bubbles: true }));
  const visibleRows = [...document.querySelectorAll(".table-section:not(.search-hidden) tbody tr:not(.search-hidden)")];
  check("searching 'beer' leaves exactly one visible row", visibleRows.length === 1);
  check("the match is highlighted", visibleRows[0] && !!visibleRows[0].querySelector("mark.search-hit"));
  check("search drops out of the one-table carousel", !document.body.classList.contains("carousel-mode"));
  input.value = "";
  input.dispatchEvent(new window.Event("input", { bubbles: true }));
  check("clearing search returns to carousel mode", document.body.classList.contains("carousel-mode"));

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
  const firstSection = sections[0];
  const wasCollapsed = firstSection.classList.contains("collapsed");
  firstSection.querySelector(".section-toggle").click();
  check("clicking the toggle (the same activation a native button gets from Enter/Space) flips collapsed state", firstSection.classList.contains("collapsed") !== wasCollapsed);
  check("aria-expanded tracks the toggle", firstSection.querySelector(".section-toggle").getAttribute("aria-expanded") === String(!firstSection.classList.contains("collapsed")));

  console.log("Print selection");
  document.querySelector('.table-section[data-table="0"] .table-pick').checked = true;
  document.querySelector('.table-section[data-table="2"] .table-pick').checked = true;
  document.querySelector(".print-selected").click();
  check("print-selected marks body.print-only", document.body.classList.contains("print-only"));
  check("selected tables get .print-target", document.querySelector('.table-section[data-table="0"]').classList.contains("print-target") && document.querySelector('.table-section[data-table="2"]').classList.contains("print-target"));
  check("unselected tables do not get .print-target", !document.querySelector('.table-section[data-table="1"]').classList.contains("print-target"));
  window.dispatchEvent(new window.Event("afterprint"));
  check("afterprint clears print-only", !document.body.classList.contains("print-only"));
  check("afterprint clears print-target", !document.querySelector('.table-section[data-table="0"]').classList.contains("print-target"));

  console.log(failures === 0 ? "\nSmoke test passed." : "\n" + failures + " smoke test check(s) failed.");
  process.exit(failures === 0 ? 0 : 1);
}

main().catch(err => { console.error(err); process.exit(1); });
