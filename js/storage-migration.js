// Runs first, in <head>, before js/theme-init.js and every store -- so nothing
// downstream ever has to know the old key names.
//
// The project was renamed sakura -> raume in Sept 2026; on-device localStorage
// keys were left on the old "sakura-" prefix so the rename didn't orphan
// anyone's saved theme, flashcard progress or table customisations. This is the
// one-time migration to the "raume-" prefix: for each key, if the new name is
// unset and the old one is set, move the value across; then drop the old key.
// A fresh install and a second run are both no-ops.
//
// Safe to delete a few releases after 2026-09, once installs have converted.
(function () {
  "use strict";
  var SUFFIXES = [
    "theme",
    "show-polite",
    "table-custom",
    "flashcards-cache-v1",
    "flashcards-guest-v1",
    "flashcards-mode",
    "kana-v1",
    "kana-cache-v1"
  ];
  try {
    var ls = window.localStorage;
    if (!ls) return;
    for (var i = 0; i < SUFFIXES.length; i++) {
      var oldKey = "sakura-" + SUFFIXES[i];
      var newKey = "raume-" + SUFFIXES[i];
      var oldVal = ls.getItem(oldKey);
      if (oldVal === null) continue;
      if (ls.getItem(newKey) === null) ls.setItem(newKey, oldVal);
      ls.removeItem(oldKey);
    }
  } catch (e) {
    // Private mode / storage disabled -- there's nothing on-device to migrate.
  }
})();
