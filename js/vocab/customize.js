// The Customize page (SakuraStudy.customize) -- one place to give any
// vocabulary table a custom name and icon. Reached from the gear in the
// masthead (#customize); routing and show/hide live in js/vocab/interactions.js.
//
// It writes through SakuraStudy.tableCustom, the same per-table personalisation
// store the inline section-header icon picker uses, so a change here shows up on
// the vocabulary page and in Flashcards > Manage, and syncs across devices while
// signed in. The dataset itself is never touched.
window.SakuraStudy = window.SakuraStudy || {};
window.SakuraStudy.customize = (function () {
  "use strict";

  var esc = window.SakuraStudy.shared.escapeHtml;
  var built = false;
  var hostEl = null;

  function tc() { return window.SakuraStudy.tableCustom; }
  function tables() { return window.SakuraStudy.data.vocabularyTables || []; }

  // Category (A-Z) > table (A-Z by its shipped name) -- the same grouping the
  // vocabulary page and the table directory use.
  function grouped() {
    var byCat = {};
    tables().forEach(function (t) {
      var cat = t.category || "Tables";
      (byCat[cat] = byCat[cat] || []).push(t);
    });
    return Object.keys(byCat).sort(function (a, b) { return a.localeCompare(b); }).map(function (cat) {
      return {
        name: cat,
        tables: byCat[cat].slice().sort(function (a, b) { return a.title.localeCompare(b.title); })
      };
    });
  }

  function iconSlot(id) {
    return window.SakuraStudy.vocab.tableIconGlyph
      ? window.SakuraStudy.vocab.tableIconGlyph(id) : "";
  }
  function isCustomised(id) {
    var e = tc() ? tc().entry(id) : {};
    return !!(e.icon || e.name);
  }

  function rowHtml(t) {
    var name = tc() ? tc().nameOf(t.id) : "";
    var customised = isCustomised(t.id);
    return '<li class="cz-row" data-table-id="' + t.id + '">' +
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
        (customised ? "" : " disabled") + ' title="Restore this table’s original name and icon">Reset</button>' +
      "</li>";
  }

  function html() {
    var groups = grouped().map(function (g) {
      return '<section class="cz-group">' +
        '<h3 class="cz-group-title">' + esc(g.name) +
          '<span class="cz-group-count">' + g.tables.length + "</span></h3>" +
        '<ul class="cz-list">' + g.tables.map(rowHtml).join("") + "</ul></section>";
    }).join("");
    return '<div class="cz-intro">' +
      "<h2>Customize tables</h2>" +
      '<p>Give any vocabulary table your own name and icon. Changes save as you make them and show up everywhere the table appears — its section header, the “Jump to a table” list, and Flashcards › Manage.</p>' +
      "<ul class=\"cz-tips\">" +
        "<li><strong>Icon</strong> — click the icon on a row to open the picker. It has ~165 line icons in five groups, plus an “Upload image…” option for your own.</li>" +
        "<li><strong>Name</strong> — type in the field. Leave it empty to keep the original (shown in grey).</li>" +
        "<li><strong>Reset</strong> puts a single table back to how it shipped.</li>" +
        "<li>Signed in on the Flashcards page? Your names and icons sync to your other devices. As a guest they’re saved in this browser only.</li>" +
      "</ul></div>" + groups;
  }

  function refresh() {
    if (!built || !hostEl) return;
    hostEl.querySelectorAll(".cz-row").forEach(function (row) {
      var id = row.dataset.tableId;
      var slot = row.querySelector(".section-icon");
      if (slot) {
        slot.classList.toggle("section-icon-empty", !(tc() && tc().iconOf(id)));
        slot.innerHTML = iconSlot(id);
      }
      var name = tc() ? tc().nameOf(id) : "";
      var input = row.querySelector(".cz-row-name");
      if (input && document.activeElement !== input) input.value = name;
      var original = row.querySelector(".cz-row-original");
      if (original) original.hidden = !name;
      var reset = row.querySelector(".cz-row-reset");
      if (reset) reset.disabled = !isCustomised(id);
    });
  }

  function commitName(input) {
    var row = input.closest(".cz-row");
    if (!row) return;
    tc().setName(row.dataset.tableId, input.value);
  }

  function render(host) {
    host = host || hostEl;
    if (!host) return;
    hostEl = host;
    if (!built) {
      host.innerHTML = html();
      built = true;
      // A committed edit (blur / Enter). Using "change" rather than "input"
      // keeps this from writing to storage -- and pushing to the account -- on
      // every keystroke.
      host.addEventListener("change", function (e) {
        if (e.target && e.target.classList.contains("cz-row-name")) commitName(e.target);
      });
      host.addEventListener("keydown", function (e) {
        if (e.key === "Enter" && e.target && e.target.classList.contains("cz-row-name")) {
          e.preventDefault();
          commitName(e.target);
          e.target.blur();
        }
      });
      host.addEventListener("click", function (e) {
        var reset = e.target.closest && e.target.closest(".cz-row-reset");
        if (reset && tc()) tc().clear(reset.dataset.resetFor);
        // The icon buttons reuse .section-icon-btn, so the delegated picker
        // handler in interactions.js opens the picker for them already.
      });
      if (tc()) tc().onChange(refresh);
    } else {
      refresh();
    }
  }

  return { render: render, refresh: refresh };
})();
