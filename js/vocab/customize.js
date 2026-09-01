// The Customize page (SakuraStudy.customize) -- one place to give any
// vocabulary table a custom name, icon, and running order. Reached from the
// gear in the masthead (#customize); routing and show/hide live in
// js/vocab/interactions.js.
//
// It writes through SakuraStudy.tableCustom, the same per-table personalisation
// store the inline section-header icon picker uses, so a change here shows up on
// the vocabulary page and in Flashcards > Manage, and syncs across devices while
// signed in. The dataset itself is never touched.
window.SakuraStudy = window.SakuraStudy || {};
window.SakuraStudy.customize = (function () {
  "use strict";

  var esc = window.SakuraStudy.shared.escapeHtml;
  var hostEl = null;
  var wired = false;
  var pendingFocus = null;

  function tc() { return window.SakuraStudy.tableCustom; }
  function V() { return window.SakuraStudy.vocab; }
  function tables() { return window.SakuraStudy.data.vocabularyTables || []; }

  var ARROW_UP = '<svg viewBox="0 0 18 18" width="12" height="12" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 13.5V4.5M4.5 9 9 4.5 13.5 9"/></svg>';
  var ARROW_DOWN = '<svg viewBox="0 0 18 18" width="12" height="12" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 4.5v9M4.5 9 9 13.5 13.5 9"/></svg>';

  // Section (fixed: Vocabulary / Grammar / Travel) > category (custom order,
  // then A-Z) > table (custom order, then A-Z) -- the exact sequence the
  // vocabulary page and the table directory now lay out in.
  function grouped() {
    var bySec = { vocabulary: [], grammar: [], travel: [] };
    tables().forEach(function (t) { bySec[V().sectionOf(t.category)].push(t); });
    var out = [];
    ["vocabulary", "grammar", "travel"].forEach(function (sec) {
      var byCat = {};
      bySec[sec].forEach(function (t) {
        var c = t.category || "Tables";
        (byCat[c] = byCat[c] || []).push(t);
      });
      var names = V().orderedCategoryNames(Object.keys(byCat), sec);
      names.forEach(function (name, i) {
        out.push({
          section: sec, name: name,
          canMoveUp: names.length > 1 && i > 0,
          canMoveDown: names.length > 1 && i < names.length - 1,
          tables: V().orderTables(name, byCat[name])
        });
      });
    });
    return out;
  }

  function iconSlot(id) { return V().tableIconGlyph ? V().tableIconGlyph(id) : ""; }
  function isCustomised(id) {
    var e = tc() ? tc().entry(id) : {};
    return !!(e.icon || e.name);
  }
  function moveBtns(kind, key, canUp, canDown) {
    return '<span class="cz-move">' +
      '<button type="button" class="cz-move-btn cz-move-up" data-move="' + kind + '" data-key="' + esc(String(key)) +
        '" data-dir="-1"' + (canUp ? "" : " disabled") + ' aria-label="Move up" title="Move up">' + ARROW_UP + "</button>" +
      '<button type="button" class="cz-move-btn cz-move-down" data-move="' + kind + '" data-key="' + esc(String(key)) +
        '" data-dir="1"' + (canDown ? "" : " disabled") + ' aria-label="Move down" title="Move down">' + ARROW_DOWN + "</button>" +
      "</span>";
  }

  function rowHtml(t, canUp, canDown) {
    var name = tc() ? tc().nameOf(t.id) : "";
    return '<li class="cz-row" data-table-id="' + t.id + '">' +
      moveBtns("table", t.id, canUp, canDown) +
      '<button type="button" class="section-icon-btn cz-row-icon" data-icon-for="' + t.id +
        '" title="Choose an icon" aria-label="Choose an icon for ' + esc(name || t.title) + '">' +
        '<span class="section-icon' + (tc() && tc().iconOf(t.id) ? "" : " section-icon-empty") + '">' + iconSlot(t.id) + "</span></button>" +
      '<label class="cz-row-field">' +
        '<input type="text" class="cz-row-name" maxlength="40" autocomplete="off" ' +
          'aria-label="Custom name for ' + esc(t.title) + '" placeholder="' + esc(t.title) + '"' +
          (name ? ' value="' + esc(name) + '"' : "") + ">" +
        '<span class="cz-row-original"' + (name ? "" : " hidden") + ">Originally " + esc(t.title) + "</span>" +
      "</label>" +
      '<button type="button" class="cz-row-reset" data-reset-for="' + t.id + '"' +
        (isCustomised(t.id) ? "" : " disabled") + ' title="Restore this table’s original name and icon">Reset</button>' +
      "</li>";
  }

  function html() {
    var groups = grouped().map(function (g) {
      var rows = g.tables.map(function (t, i) {
        return rowHtml(t, i > 0, i < g.tables.length - 1);
      }).join("");
      var head = '<h3 class="cz-group-title">' +
        (g.canMoveUp || g.canMoveDown ? moveBtns("category", g.name, g.canMoveUp, g.canMoveDown) : "") +
        '<span class="cz-group-name">' + esc(g.name) + "</span>" +
        '<span class="cz-group-count">' + g.tables.length + "</span></h3>";
      return '<section class="cz-group">' + head + '<ul class="cz-list">' + rows + "</ul></section>";
    }).join("");
    var canResetOrder = tc() && tc().hasCustomOrder();
    return '<div class="cz-intro">' +
      "<h2>Customize tables</h2>" +
      '<p>Give any vocabulary table your own name and icon, and put the tables and categories in the order you want. Changes save as you make them and show up everywhere the table appears — its section header, the “Jump to a table” list, and Flashcards › Manage.</p>' +
      "<ul class=\"cz-tips\">" +
        "<li><strong>Icon</strong> — click the icon on a row to open the picker (~165 line icons, plus “Upload image…” for your own).</li>" +
        "<li><strong>Name</strong> — type in the field. Leave it empty to keep the original (shown in grey).</li>" +
        "<li><strong>Order</strong> — the ▲▼ buttons move a table within its category, or a category within its section." +
          (canResetOrder ? ' <button type="button" class="cz-reset-order" data-reset-order>Reset order</button>' : "") + "</li>" +
        "<li><strong>Reset</strong> puts a single table’s name and icon back to how it shipped.</li>" +
        "<li>Signed in on the Flashcards page? Your changes sync to your other devices. As a guest they’re saved in this browser only.</li>" +
      "</ul></div>" + groups;
  }

  // ---- moves --------------------------------------------------------------
  function categoriesInSection(sec) {
    var names = {};
    tables().forEach(function (t) {
      if (V().sectionOf(t.category) === sec) names[t.category || "Tables"] = 1;
    });
    return V().orderedCategoryNames(Object.keys(names), sec);
  }
  function moveOne(list, item, dir) {
    var i = list.indexOf(item), j = i + dir;
    if (i < 0 || j < 0 || j >= list.length) return null;
    list.splice(i, 1);
    list.splice(j, 0, item);
    return list;
  }
  function moveTable(id, dir) {
    var t = tables().filter(function (x) { return String(x.id) === String(id); })[0];
    if (!t) return;
    var cat = t.category || "Tables";
    var sameCat = tables().filter(function (x) { return (x.category || "Tables") === cat; });
    var ids = V().orderTables(cat, sameCat).map(function (x) { return String(x.id); });
    if (moveOne(ids, String(id), dir)) {
      pendingFocus = '.cz-row[data-table-id="' + id + '"] .cz-move-btn:not([disabled])';
      tc().setTableOrder(cat, ids);
    }
  }
  function moveCategory(name, dir) {
    var sec = V().sectionOf(name);
    var names = categoriesInSection(sec);
    if (moveOne(names, name, dir)) {
      pendingFocus = '.cz-group-title .cz-move-btn[data-key="' + cssAttr(name) + '"]:not([disabled])';
      tc().setCategoryOrder(sec, names);
    }
  }
  function cssAttr(v) { return String(v).replace(/["\\]/g, "\\$&"); }

  function commitName(input) {
    var row = input.closest(".cz-row");
    if (row) tc().setName(row.dataset.tableId, input.value);
  }

  // ---- lifecycle --------------------------------------------------------
  function wire(host) {
    // A committed name edit (blur / Enter) -- "change", not "input", so this
    // doesn't write to storage (and push to the account) on every keystroke.
    host.addEventListener("change", function (e) {
      if (e.target.classList.contains("cz-row-name")) commitName(e.target);
    });
    host.addEventListener("keydown", function (e) {
      if (e.key === "Enter" && e.target.classList.contains("cz-row-name")) {
        e.preventDefault();
        commitName(e.target);
        e.target.blur();
      }
    });
    host.addEventListener("click", function (e) {
      var move = e.target.closest && e.target.closest(".cz-move-btn");
      if (move && !move.disabled) {
        var dir = Number(move.dataset.dir);
        if (move.dataset.move === "table") moveTable(move.dataset.key, dir);
        else moveCategory(move.dataset.key, dir);
        return;
      }
      var reset = e.target.closest && e.target.closest(".cz-row-reset");
      if (reset && tc()) { tc().clear(reset.dataset.resetFor); return; }
      if (e.target.closest && e.target.closest(".cz-reset-order") && tc()) tc().resetOrder();
      // .section-icon-btn is handled by the delegated picker hook in
      // interactions.js.
    });
    if (tc()) tc().onChange(function () { if (hostEl) render(hostEl); });
  }

  function render(host) {
    host = host || hostEl;
    if (!host) return;
    hostEl = host;
    host.innerHTML = html();
    if (!wired) { wire(host); wired = true; }
    if (pendingFocus) {
      var el = host.querySelector(pendingFocus);
      if (el) el.focus();
      pendingFocus = null;
    }
  }

  return { render: render };
})();
