// Runs in <head>, before first paint, so the page never flashes the wrong
// theme. Two attributes on <html>: data-theme-choice is what the user picked
// ("system" | "light" | "dark"; absent storage = system), data-theme is the
// resolved light/dark that the CSS actually keys off. The rest of the theme
// logic (the toggle, live OS-change following, persistence) lives in
// js/vocab/interactions.js.
(function () {
  "use strict";
  var choice;
  try {
    // js/storage-migration.js (the <head> script before this one) has already
    // moved this off the old "sakura-theme" name if it was there.
    choice = window.localStorage && localStorage.getItem("raume-theme");
  } catch (e) { choice = null; }
  if (choice !== "light" && choice !== "dark") choice = "system";
  var resolved = choice === "system"
    ? ((window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches) ? "dark" : "light")
    : choice;
  document.documentElement.setAttribute("data-theme", resolved);
  document.documentElement.setAttribute("data-theme-choice", choice);
})();
