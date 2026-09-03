// Helpers shared across more than one feature, published as RaumeStudy.shared.
// Deliberately tiny -- formatting that belongs to a single feature stays with
// that feature. See the load-order comment in index.html.
window.RaumeStudy = window.RaumeStudy || {};
window.RaumeStudy.shared = (function () {
  "use strict";

  // Escape text for safe interpolation into an HTML string (the vocab and
  // flashcards renderers both build markup as strings).
  function escapeHtml(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }

  return { escapeHtml: escapeHtml };
})();
