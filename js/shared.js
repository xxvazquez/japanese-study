// Helpers shared across more than one feature, published as SakuraStudy.shared.
// Deliberately tiny -- formatting that belongs to a single feature stays with
// that feature. See the load-order comment in index.html.
window.SakuraStudy = window.SakuraStudy || {};
window.SakuraStudy.shared = (function () {
  "use strict";

  // Escape text for interpolation into an HTML string. Identical behaviour to
  // the private `esc()` that previously lived in both js/app.js and
  // js/flashcards.js.
  function escapeHtml(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }

  return { escapeHtml: escapeHtml };
})();
