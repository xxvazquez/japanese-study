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
const expectedTables = 19;
const expectedRows = 316;
if (tables !== expectedTables || rows !== expectedRows) {
  console.error("Vocabulary validation failed: found " + rows + " rows across " + tables + " tables; expected " + expectedRows + " rows across " + expectedTables + " tables.");
  process.exit(1);
}
if (!page.includes('role="status"') || !page.includes('aria-live="polite"')) { console.error("Accessibility validation failed: search results must use a live status region."); process.exit(1); }
if (!page.includes('aria-label="Search vocabulary"') || !css.includes(":focus-visible")) { console.error("Accessibility validation failed: search labeling or focus styling is missing."); process.exit(1); }
if (!source.includes("<th>")) { console.error("Accessibility validation failed: vocabulary tables must retain table headings."); process.exit(1); }
console.log("Vocabulary and accessibility validation passed: " + rows + " rows across " + tables + " tables.");
