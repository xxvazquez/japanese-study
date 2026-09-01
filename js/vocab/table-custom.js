// Per-table personalisation (icon now, room in the same record for a custom
// name next) layered over the Git-only vocabulary data. localStorage is the
// immediate source of truth so
// headers render without waiting on the network; when the flashcards feature
// reports a signed-in account it also syncs through Supabase (see
// js/flashcards/data-ops.js + bootstrap.js), so a chosen icon follows you to
// another device. Never touches the dataset or its validation.
window.SakuraStudy = window.SakuraStudy || {};
window.SakuraStudy.tableCustom = (function () {
  "use strict";

  var KEY = "sakura-table-custom";
  var cache = null;
  var listeners = [];
  var remotePush = null;

  function load() {
    if (cache) return cache;
    try {
      var raw = window.localStorage.getItem(KEY);
      cache = raw ? JSON.parse(raw) : {};
    } catch (e) { cache = {}; }
    if (!cache || typeof cache !== "object") cache = {};
    return cache;
  }
  function persistLocal() {
    try { window.localStorage.setItem(KEY, JSON.stringify(cache)); } catch (e) {}
  }
  function announce() { listeners.forEach(function (fn) { try { fn(); } catch (e) {} }); }

  // A local edit: write through to localStorage, tell the UI, and push the
  // whole object to the account if one is connected (last edit wins).
  function mutate(fn) {
    load();
    fn();
    persistLocal();
    announce();
    if (remotePush) { try { remotePush(getAll()); } catch (e) {} }
  }

  function entry(id) { return load()[String(id)] || {}; }
  function iconOf(id) { return entry(id).icon || ""; }
  function getAll() { return JSON.parse(JSON.stringify(load())); }

  function setIcon(id, icon) {
    mutate(function () {
      var k = String(id);
      if (icon) { cache[k] = cache[k] || {}; cache[k].icon = icon; }
      else if (cache[k]) { delete cache[k].icon; if (!Object.keys(cache[k]).length) delete cache[k]; }
    });
  }

  // Remote state arriving from Supabase on sign-in / auth change -- it wins
  // over the local cache (icons are cheap to redo; simplest reconciliation).
  function applyRemote(obj) {
    var next = obj && typeof obj === "object" ? obj : {};
    load();
    if (JSON.stringify(next) === JSON.stringify(cache)) return;
    cache = JSON.parse(JSON.stringify(next));
    persistLocal();
    announce();
  }

  function onChange(fn) { listeners.push(fn); }
  function setRemotePush(fn) { remotePush = fn; }

  return {
    iconOf: iconOf, entry: entry, getAll: getAll, setIcon: setIcon,
    applyRemote: applyRemote, onChange: onChange, setRemotePush: setRemotePush,
    STORAGE_KEY: KEY
  };
})();
