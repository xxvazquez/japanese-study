const fs = require("fs");
const vm = require("vm");
const source = fs.readFileSync("data/vocabulary.js", "utf8");
const page = fs.readFileSync("index.html", "utf8");
const css = fs.readFileSync("css/site.css", "utf8");
const sandbox = { window: {} };
vm.runInNewContext(source, sandbox);
const sections = sandbox.window.vocabularySections || [];
const tables = sections.length;
const rows = sections.reduce((total, section) => total + ((section.match(/<tr>/g) || []).length - 1), 0);
const expectedTables = 10;
const expectedRows = 346;
if (tables !== expectedTables || rows !== expectedRows) {
  console.error("Vocabulary validation failed: found " + rows + " rows across " + tables + " tables; expected " + expectedRows + " rows across " + expectedTables + " tables.");
  process.exit(1);
}
if (!page.includes('role="status"') || !page.includes('aria-live="polite"')) { console.error("Accessibility validation failed: search results must use a live status region."); process.exit(1); }
if (!page.includes('aria-label="Search vocabulary"') || !css.includes(":focus-visible")) { console.error("Accessibility validation failed: search labeling or focus styling is missing."); process.exit(1); }
if (!source.includes("<th>")) { console.error("Accessibility validation failed: vocabulary tables must retain table headings."); process.exit(1); }
console.log("Vocabulary and accessibility validation passed: " + rows + " rows across " + tables + " tables.");

const stripTags = value => value.replace(/<[^>]*>/g, "").replace(/&amp;/g, "&").trim();
const japanesePattern = /[ぁ-ゖァ-ヺ一-龯々〆ヵヶ〜]/;
const seenVocabulary = new Set();
for (const section of sections) {
  const body = section.match(/<tbody>([\s\S]*?)<\/tbody>/)?.[1] || "";
  for (const row of body.matchAll(/<tr>([\s\S]*?)<\/tr>/g)) {
    const cells = [...row[1].matchAll(/<td[^>]*>([\s\S]*?)<\/td>/g)].map(match => stripTags(match[1]));
    if (cells.length < 3 || cells.length > 4) {
      console.error("Vocabulary quality validation failed: every body row must have three or four cells.");
      process.exit(1);
    }
    const japaneseCell = cells.find(cell => japanesePattern.test(cell));
    if (!japaneseCell) {
      console.error("Vocabulary quality validation failed: Japanese cells must contain Japanese script: " + cells[0]);
      process.exit(1);
    }
    if (cells.slice(0, 3).some(cell => !cell)) {
      console.error("Vocabulary quality validation failed: romaji/polite form and English meaning cannot be empty.");
      process.exit(1);
    }
    const key = japaneseCell + "|" + cells[cells.length - 1];
    if (seenVocabulary.has(key)) {
      console.error("Vocabulary quality validation failed: duplicate Japanese/meaning pair: " + key);
      process.exit(1);
    }
    seenVocabulary.add(key);
  }
}
