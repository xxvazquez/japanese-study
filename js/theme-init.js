// Runs in <head>, before first paint, so the page never flashes the wrong
// theme. Resolves to an explicit light/dark on <html data-theme>: a stored
// choice wins, otherwise the OS preference. The rest of the theme logic
// (the toggle, persistence) lives in js/vocab/interactions.js.
(function () {
  "use strict";
  var t;
  try {
    t = window.localStorage && localStorage.getItem("sakura-theme");
  } catch (e) { t = null; }
  if (t !== "light" && t !== "dark") {
    t = (window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches) ? "dark" : "light";
  }
  document.documentElement.setAttribute("data-theme", t);
})();
