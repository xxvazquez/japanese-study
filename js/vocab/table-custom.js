// Per-table personalisation (icon now; custom name later) layered over the
// Git-only vocabulary data. Stored in this browser only -- one localStorage
// key, { [tableId]: { icon } } -- so it never touches the dataset or its
// validation. Reusable anywhere a table id is known.
window.SakuraStudy = window.SakuraStudy || {};
window.SakuraStudy.tableCustom = (function () {
  "use strict";

  var KEY = "sakura-table-custom";
  var cache = null;
  var listeners = [];

  function load() {
    if (cache) return cache;
    try {
      var raw = window.localStorage.getItem(KEY);
      cache = raw ? JSON.parse(raw) : {};
    } catch (e) { cache = {}; }
    if (!cache || typeof cache !== "object") cache = {};
    return cache;
  }
  function save() {
    try { window.localStorage.setItem(KEY, JSON.stringify(cache)); } catch (e) {}
    listeners.forEach(function (fn) { try { fn(); } catch (e) {} });
  }

  function entry(id) { return load()[String(id)] || {}; }
  function iconOf(id) { return entry(id).icon || ""; }

  function setIcon(id, icon) {
    var c = load(), k = String(id);
    if (icon) { c[k] = c[k] || {}; c[k].icon = icon; }
    else if (c[k]) { delete c[k].icon; if (!Object.keys(c[k]).length) delete c[k]; }
    save();
  }

  function onChange(fn) { listeners.push(fn); }

  return { iconOf: iconOf, setIcon: setIcon, entry: entry, onChange: onChange, STORAGE_KEY: KEY };
})();
