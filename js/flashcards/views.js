// Flashcards -- Manage / Settings / Help tabs + the vocabulary-page row toggle
// (SakuraStudy.flashcards.views).
//
// Manage: browse every vocab entry by category > table, add / pause / restore
// individually or a whole table at once. Settings: Study Directions, the FSRS
// knobs, and the daily new-card cap. Help: the reference card. Plus the
// "add to flashcards" toggle js/vocab/render.js draws on each vocabulary row.
// Nothing here deletes a card or its history -- pause only archives.
window.SakuraStudy = window.SakuraStudy || {};
window.SakuraStudy.flashcards = window.SakuraStudy.flashcards || {};
window.SakuraStudy.flashcards.views = (function () {
  "use strict";

  var fc = window.SakuraStudy.flashcards;
  var store = fc.store, vidx = fc.vocabIndex, dataOps = fc.dataOps, dashboard = fc.dashboard;
  var esc = window.SakuraStudy.shared.escapeHtml;

  var getCache = store.getCache, hasActiveSession = store.hasActiveSession;
  var DIRECTIONS = store.DIRECTIONS, DIRECTION_LABEL = store.DIRECTION_LABEL;
  var getVocabIndex = vidx.getVocabIndex;
  var addVocab = dataOps.addVocab, archiveVocab = dataOps.archiveVocab;
  var addVocabs = dataOps.addVocabs, archiveVocabs = dataOps.archiveVocabs, addVocabsRemote = dataOps.addVocabsRemote;
  var fetchAllFromServer = dataOps.fetchAllFromServer, refreshData = dataOps.refreshData;
  var saveFsrsSettings = dataOps.saveFsrsSettings, saveQueueSettings = dataOps.saveQueueSettings, saveDirectionSettings = dataOps.saveDirectionSettings;
  var invalidateInsights = dashboard.invalidateInsights;

  // The app shell / tab routing live in the bootstrap module -- reached lazily
  // so this file does not depend on its load order.
  function rerender() { window.SakuraStudy.flashcards.render(); }

  var manageFilter = "all"; // all | mine | archived
  var manageExpandedTables = {}; // tableId -> true; session-only UI state, collapsed (absent) by default
  // Same chevron used for every other collapse/expand control in the app
  // (sidebar groups, Overview rows) -- kept here rather than exported from
  // the vocab modules since it's a tiny, self-contained bit of markup.
  var CHEVRON_ICON = '<svg viewBox="0 0 18 18" width="12" height="12" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 7l4 4 4-4"/></svg>';

  function renderHelp(panel) {
    panel.innerHTML =
      '<div class="fc-settings-section"><h3>Adding &amp; pausing vocabulary</h3>' +
      '<ul class="fc-help-list">' +
      '<li><span class="fc-legend-term">Add</span> starts studying a word — or a whole table at once, from the Manage tab or the vocabulary page.</li>' +
      '<li><span class="fc-legend-term">Pause</span> stops reviewing a word but keeps every bit of its progress. Add it back any time and it resumes exactly where you left off.</li>' +
      '<li>Nothing is ever permanently deleted. A paused word keeps its full FSRS scheduling state and complete review history for good.</li>' +
      '</ul></div>' +
      '<div class="fc-settings-section"><h3>Status icons in Manage</h3>' +
      '<ul class="fc-help-list fc-help-status">' +
      '<li><span class="fc-status fc-status-none">' + STATUS_META.none.glyph + '</span> Not added</li>' +
      '<li><span class="fc-status fc-status-active">' + STATUS_META.active.glyph + '</span> In flashcards</li>' +
      '<li><span class="fc-status fc-status-due">' + STATUS_META.due.glyph + '</span> Due for review now</li>' +
      '</ul></div>' +
      '<div class="fc-settings-section"><h3>Review sessions</h3>' +
      '<ul class="fc-help-list">' +
      '<li>Each rating is saved the moment you pick it, so <span class="fc-legend-term">End session</span> (top-right of the card) never loses anything — it just stops early and shows the wrap-up.</li>' +
      '<li>The wrap-up counts what you reviewed and how many you got right; <span class="fc-legend-term">Keep going</span> appears when more cards are ready.</li>' +
      '</ul></div>' +
      '<div class="fc-settings-section"><h3>Review keyboard shortcuts</h3>' +
      '<ul class="fc-help-list">' +
      '<li><kbd>Space</kbd> or <kbd>Enter</kbd> — check your answer</li>' +
      '<li><kbd>1</kbd> <kbd>2</kbd> <kbd>3</kbd> <kbd>4</kbd> — rate Again / Hard / Good / Easy (only after the answer is checked)</li>' +
      '</ul></div>' +
      '<div class="fc-settings-section"><h3>Dashboard</h3>' +
      '<ul class="fc-help-list">' +
      '<li><span class="fc-legend-term">Today</span> — cards reviewed today against your daily target (New cards per day, under Settings → Daily Session).</li>' +
      '<li><span class="fc-legend-term">Next review</span> — when the next scheduled card is due, taken straight from the FSRS schedule.</li>' +
      '<li><span class="fc-legend-term">Missed today</span> — words you missed in today\'s reviews, most-missed first. Click one to practice it right away.</li>' +
      '<li><span class="fc-legend-term">Words to Review</span> — words you get wrong repeatedly over time, shown as a normal vocabulary table you can sort and print.</li>' +
      '</ul></div>' +
      '<div class="fc-settings-section"><h3>Casual &amp; polite forms</h3>' +
      '<p class="fc-note">On the vocabulary tables, the <span class="fc-legend-term">Show polite</span> toggle switches verb columns between the plain / dictionary form and the polite <span lang="ja">〜ます</span> form. One form is shown at a time. Words with no distinct polite form are left unchanged.</p>' +
      '</div>' +
      '<div class="fc-settings-section"><h3>Study directions</h3>' +
      '<p class="fc-note">Settings → Study Directions turns any of the four review directions on or off. Turning one off never deletes its cards or progress — it just leaves that direction out of review until you turn it back on.</p>' +
      '</div>';
  }

  // --- Manage: browse every vocab entry, add / pause / restore ---
  function cardsForVocab(vocabId) {
    return Object.keys(getCache().cards).map(function (id) { return getCache().cards[id]; }).filter(function (c) { return c.vocabId === vocabId; });
  }
  function vocabState(vocabId) {
    var cards = cardsForVocab(vocabId);
    if (!cards.length) return "none";
    if (cards.some(function (c) { return c.active; })) return "active";
    return "archived";
  }
  // A finer status for the Manage list's per-row indicator: like vocabState
  // but splitting "active" into whether anything is actually due right now.
  function vocabStatus(vocabId) {
    var state = vocabState(vocabId);
    if (state !== "active") return state; // none | archived
    var now = new Date();
    var due = cardsForVocab(vocabId).some(function (c) {
      return c.active && c.state !== 0 && new Date(c.due) <= now;
    });
    return due ? "due" : "active";
  }
  var STATUS_META = {
    none: { glyph: "○", label: "Not added" },
    active: { glyph: "●", label: "In flashcards" },
    due: { glyph: "◷", label: "Due for review" },
    archived: { glyph: "◌", label: "Paused" }
  };
  function statusIndicatorHtml(vocabId) {
    var s = vocabStatus(vocabId);
    var m = STATUS_META[s] || STATUS_META.none;
    return '<span class="fc-status fc-status-' + s + '" title="' + esc(m.label) + '" aria-label="' + esc(m.label) + '">' + m.glyph + '</span>';
  }

  // Rows currently hidden via "Manage rows" on the vocabulary page are read
  // straight from that page's own DOM (it's always fully rendered, just
  // hidden/shown by class -- see js/vocab/interactions.js) so a bulk table-add
  // here matches the same one on the vocabulary page exactly, regardless of
  // which page happens to be open right now.
  function visibleVocabIdsForTable(tableId) {
    var section = document.querySelector('.table-section[data-table="' + tableId + '"]');
    if (!section) return [];
    return [].slice.call(section.querySelectorAll("tbody tr:not(.row-hidden)"))
      .map(function (tr) { return tr.dataset.vocabId; }).filter(Boolean);
  }

  function renderManage(panel) {
    var index = getVocabIndex();
    var ids = Object.keys(index);
    var filtered = ids.filter(function (id) {
      var state = vocabState(id);
      if (manageFilter === "mine") return state === "active";
      if (manageFilter === "archived") return state === "archived";
      return true;
    });
    // Category > table, the same grouping the vocabulary page itself uses --
    // tables are the natural unit to add/remove in bulk, not a flat word list.
    var byCategory = {};
    filtered.forEach(function (id) {
      var entry = index[id];
      var cat = entry.category || "Tables";
      byCategory[cat] = byCategory[cat] || {};
      var tables = byCategory[cat];
      var key = entry.tableId;
      (tables[key] = tables[key] || { title: entry.tableTitle, ids: [] }).ids.push(id);
    });
    var catNames = Object.keys(byCategory).sort(function (a, b) { return a.localeCompare(b); });

    var html = '<div class="fc-manage-filters">' +
      [["all", "All vocabulary"], ["mine", "My flashcards"], ["archived", "Archived"]].map(function (f) {
        return '<button type="button" data-filter="' + f[0] + '" class="' + (manageFilter === f[0] ? "active" : "") + '">' + f[1] + "</button>";
      }).join("") + "</div>";

    if (!catNames.length) {
      html += '<div class="fc-manage-list"><div class="fc-empty">Nothing here yet.</div></div>';
    } else {
      catNames.forEach(function (cat) {
        var tableIds = Object.keys(byCategory[cat]).sort(function (a, b) { return byCategory[cat][a].title.localeCompare(byCategory[cat][b].title); });
        var totalInCategory = tableIds.reduce(function (n, k) { return n + byCategory[cat][k].ids.length; }, 0);
        html += '<details open class="fc-manage-group"><summary class="fc-manage-group-title">' + window.SakuraStudy.vocab.categoryHeaderHtml(cat, totalInCategory) + "</summary>";
        tableIds.forEach(function (tableId) {
          var table = byCategory[cat][tableId];
          var addedCount = table.ids.filter(function (id) { return vocabState(id) === "active"; }).length;
          // Collapsed by default -- with 14 tables and a few hundred words,
          // showing every row of every table at once makes this an
          // enormous scroll for what's usually just a couple of clicks on
          // "Add table". A row list is only worth expanding when actually
          // picking through individual words, so that's opt-in per table.
          var expanded = !!manageExpandedTables[tableId];
          html += '<div class="fc-manage-table' + (expanded ? "" : " fc-manage-table-collapsed") + '">' +
            '<div class="fc-manage-table-head">' +
            '<button type="button" class="fc-manage-table-toggle" data-table-id="' + tableId + '" aria-expanded="' + expanded + '" aria-label="' + (expanded ? "Collapse" : "Expand") + " " + esc(table.title) + '">' + CHEVRON_ICON + "</button>" +
            '<span class="fc-manage-table-label"><span class="fc-manage-table-title">' + esc(table.title) + '</span>' +
            '<span class="fc-manage-table-progress">' + addedCount + " / " + table.ids.length + " added</span></span>";
          // Table-level actions per filter: "all" gets both add + pause;
          // "My flashcards" gets Pause table (the whole point of that view);
          // "Archived" gets Restore table.
          if (manageFilter === "all") {
            html += '<div class="fc-manage-table-actions">' +
              '<button type="button" class="fc-btn" data-table-action="add-table" data-table-id="' + tableId + '" title="Adds every word in this table to your flashcards (skips any row you’ve hidden on the vocabulary page)">Add table</button>' +
              '<button type="button" class="fc-btn" data-table-action="remove-table" data-table-id="' + tableId + '" title="Keeps every word’s progress — add the table back anytime to pick up where you left off"' + (addedCount ? "" : " disabled") + '>Pause table</button>' +
              "</div>";
          } else if (manageFilter === "mine" && addedCount) {
            html += '<div class="fc-manage-table-actions">' +
              '<button type="button" class="fc-btn" data-table-action="remove-table" data-table-id="' + tableId + '" title="Pauses every word in this table — keeps all progress, add the table back anytime to resume">Pause table</button>' +
              "</div>";
          } else if (manageFilter === "archived") {
            html += '<div class="fc-manage-table-actions">' +
              '<button type="button" class="fc-btn" data-table-action="restore-table" data-table-id="' + tableId + '" title="Resumes reviewing every paused word in this table with its previous progress intact">Restore table</button>' +
              "</div>";
          }
          html += "</div><div class=\"fc-manage-list\">";
          table.ids.forEach(function (id) {
            var entry = index[id];
            var state = vocabState(id);
            html += '<div class="fc-manage-row">' +
              statusIndicatorHtml(id) +
              '<span class="fc-manage-word">' +
              '<span class="fc-jp" lang="ja">' + entry.jpHtml + "</span>" +
              '<span class="fc-ro">' + esc(entry.romajiDisplay) + "</span>" +
              '<span class="fc-en">' + esc(entry.englishDisplay) + "</span>" +
              (entry.romajiUsable ? "" : '<span class="fc-tag">EN only</span>') +
              "</span>" +
              '<span class="fc-actions">' + manageActionsFor(id, state) + "</span></div>";
          });
          html += "</div></div>";
        });
        html += "</details>";
      });
    }
    panel.innerHTML = html;

    panel.querySelectorAll(".fc-manage-filters button").forEach(function (btn) {
      btn.addEventListener("click", function () { manageFilter = btn.dataset.filter; rerender(); });
    });
    bindManageActionButtons(panel);
    panel.querySelectorAll("[data-table-action]").forEach(function (btn) {
      btn.addEventListener("click", function () { runTableAction(btn.dataset.tableAction, btn.dataset.tableId, btn); });
    });
    panel.querySelectorAll(".fc-manage-table-toggle").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var id = btn.dataset.tableId;
        manageExpandedTables[id] = !manageExpandedTables[id];
        rerender();
      });
    });
  }
  // Pause / Pause table only archive (active = false) -- nothing here ever
  // deletes a card or its history. A paused word keeps its full FSRS state
  // and review log, and Restore brings it back exactly as it was.
  function manageActionsFor(vocabId, state) {
    if (state === "active") return '<button type="button" class="fc-btn" data-action="remove" data-vocab-id="' + esc(vocabId) + '" title="Keeps its progress — add it back anytime to pick up where you left off">Pause</button>';
    if (state === "archived") return '<button type="button" class="fc-btn" data-action="restore" data-vocab-id="' + esc(vocabId) + '" title="Resumes reviewing this word with its previous progress intact">Restore</button>';
    return '<button type="button" class="fc-btn fc-btn-primary" data-action="add" data-vocab-id="' + esc(vocabId) + '">Add</button>';
  }
  function bindManageActionButtons(scope) {
    scope.querySelectorAll("[data-action]").forEach(function (btn) {
      btn.addEventListener("click", function () { runVocabAction(btn.dataset.action, btn.dataset.vocabId); });
    });
  }
  async function runVocabAction(action, vocabId) {
    try {
      if (action === "add" || action === "restore") await addVocab(vocabId);
      else if (action === "remove") await archiveVocab(vocabId);
      await refreshData();
      invalidateInsights();
      rerender();
      refreshRowToggleButtons();
    } catch (e) {
      window.alert("Couldn't update flashcards — " + (e.message || "check your connection and try again."));
    }
  }
  // Table-level bulk add/remove -- the default way to build a deck, per
  // table, rather than one word at a time. Add skips rows already hidden on
  // the vocabulary page (Manage rows' eye icon); Remove archives every
  // currently-active card from that table (never hard-deletes anything).
  async function runTableAction(action, tableId, btn) {
    var index = getVocabIndex();
    var allIds = Object.keys(index).filter(function (id) { return String(index[id].tableId) === String(tableId); });
    var originalText = btn.textContent;
    btn.disabled = true;
    btn.textContent = action === "remove-table" ? "Pausing…" : action === "restore-table" ? "Restoring…" : "Adding…";
    try {
      if (action === "add-table") {
        var visible = visibleVocabIdsForTable(tableId);
        var targetIds = visible.length ? visible.filter(function (id) { return allIds.indexOf(id) !== -1; }) : allIds;
        await addVocabs(targetIds);
      } else if (action === "restore-table") {
        await addVocabs(allIds.filter(function (id) { return vocabState(id) === "archived"; }));
      } else {
        var activeIds = allIds.filter(function (id) { return vocabState(id) === "active"; });
        await archiveVocabs(activeIds);
      }
      await refreshData();
      invalidateInsights();
      rerender();
      refreshRowToggleButtons();
    } catch (e) {
      btn.textContent = originalText;
      btn.disabled = false;
      window.alert("Couldn't update flashcards — " + (e.message || "check your connection and try again."));
    }
  }

  // --- Settings ---
  function renderSettings(panel) {
    var s = getCache().settings;
    panel.innerHTML =
      '<div class="fc-settings-section"><h3>Study Directions</h3><p class="fc-note">Which of the 4 directions "Study now" pulls cards from — turning one off never deletes its cards or progress, it is just left out of review until you turn it back on.</p>' +
      '<div class="fc-direction-checks">' + DIRECTIONS.map(function (d) {
        return '<label class="fc-direction-check"><input type="checkbox" data-direction="' + d + '" class="fc-dir-checkbox" ' + (s.enabled_directions[d] !== false ? "checked" : "") + ">" + esc(DIRECTION_LABEL[d]) + "</label>";
      }).join("") + "</div>" +
      '<div class="fc-auth-error" id="fcDirError" hidden>At least one direction has to stay on.</div>' +
      '<div class="fc-cta-row fc-cta-row-spaced"><button type="button" class="fc-btn fc-btn-primary" id="fcSaveDirections">Save</button></div></div>' +
      '<div class="fc-settings-section"><h3>FSRS Scheduling</h3><p class="fc-note">Tunable knobs FSRS-6 itself supports — the trained algorithm and its weights never change.</p>' +
      settingsField("Desired retention (%)", '<input type="number" id="fcRetention" min="70" max="99" value="' + Math.round(s.fsrs_request_retention * 100) + '">',
        "The recall probability FSRS-6 aims for when each card comes due. Higher means shorter, more frequent reviews and stronger recall; lower means longer gaps but more forgetting in between. 90% is FSRS's own recommended default.") +
      settingsField("Maximum interval (days)", '<input type="number" id="fcMaxInterval" min="30" max="36500" value="' + s.fsrs_maximum_interval + '">',
        "A ceiling on the longest gap FSRS-6 will ever schedule, however well you know a card. 36500 (100 years) effectively means no ceiling.") +
      settingsField("Fuzz scheduled intervals", '<input type="checkbox" id="fcFuzz" ' + (s.fsrs_enable_fuzz ? "checked" : "") + ">",
        "Adds a small random wobble to each computed interval, so a batch of cards added on the same day don't all come due on exactly the same day too.") +
      '<div class="fc-cta-row fc-cta-row-spaced"><button type="button" class="fc-btn fc-btn-primary" id="fcSaveFsrs">Save</button></div></div>' +
      '<div class="fc-settings-section"><h3>Daily Session</h3><p class="fc-note">Not an FSRS setting — just how many brand-new cards a review session introduces per day.</p>' +
      settingsField("New cards per day", '<input type="number" id="fcNewPerDay" min="0" max="200" value="' + s.queue_new_cards_per_day + '">',
        "A cap on how many never-studied cards \"Study now\" introduces in one day, on top of anything already due for review. Doesn't affect scheduling, only pacing.") +
      '<div class="fc-cta-row fc-cta-row-spaced"><button type="button" class="fc-btn fc-btn-primary" id="fcSaveQueue">Save</button></div></div>';

    // Settings are already saved to the local cache before the remote call
    // even goes out (see saveFsrsSettings/saveDirectionSettings), so a
    // failed sync never loses the change -- this just makes sure a failure
    // is actually reported instead of silently disappearing as an
    // unhandled rejection, consistent with how add/remove/delete already
    // surface errors.
    function reportSettingsError(e) {
      window.alert("Saved on this device, but couldn't sync — " + (e.message || "check your connection and try again."));
    }
    document.getElementById("fcSaveDirections").addEventListener("click", async function () {
      var enabledMap = {};
      panel.querySelectorAll(".fc-dir-checkbox").forEach(function (cb) { enabledMap[cb.dataset.direction] = cb.checked; });
      if (!DIRECTIONS.some(function (d) { return enabledMap[d]; })) {
        document.getElementById("fcDirError").hidden = false;
        return;
      }
      try { await saveDirectionSettings(enabledMap); } catch (e) { reportSettingsError(e); }
      rerender();
    });
    document.getElementById("fcSaveFsrs").addEventListener("click", async function () {
      var patch = {
        fsrs_request_retention: Math.min(0.99, Math.max(0.7, Number(document.getElementById("fcRetention").value) / 100)),
        fsrs_maximum_interval: Math.max(1, Number(document.getElementById("fcMaxInterval").value)),
        fsrs_enable_fuzz: document.getElementById("fcFuzz").checked
      };
      try { await saveFsrsSettings(patch); } catch (e) { reportSettingsError(e); }
      rerender();
    });
    document.getElementById("fcSaveQueue").addEventListener("click", async function () {
      var patch = { queue_new_cards_per_day: Math.max(0, Number(document.getElementById("fcNewPerDay").value)) };
      try { await saveQueueSettings(patch); } catch (e) { reportSettingsError(e); }
      rerender();
    });
  }
  function settingsField(label, controlHtml, help) {
    return '<div class="fc-settings-field"><div class="fc-settings-field-row"><label>' + esc(label) + "</label>" + controlHtml + "</div>" +
      (help ? '<p class="fc-settings-help">' + esc(help) + "</p>" : "") + "</div>";
  }

  // -----------------------------------------------------------------------
  // Row-level "add to flashcards" toggle, drawn by js/vocab/render.js next to
  // the existing eye/hide icon. This module owns all of its behavior/state.
  // -----------------------------------------------------------------------
  function refreshRowToggleButtons() {
    document.querySelectorAll(".fc-toggle-btn").forEach(function (btn) {
      var state = vocabState(btn.dataset.vocabId);
      var added = state === "active";
      btn.classList.toggle("fc-added", added);
      btn.setAttribute("aria-pressed", String(added));
      btn.title = added ? "Pause (keeps its progress — add it back anytime)" : "Add to flashcards";
      btn.setAttribute("aria-label", btn.title);
    });
  }
  document.addEventListener("click", function (event) {
    var btn = event.target.closest && event.target.closest(".fc-toggle-btn");
    if (!btn) return;
    event.stopPropagation();
    if (!hasActiveSession()) {
      if (window.SakuraStudy.vocab.showFlashcardsPage) window.SakuraStudy.vocab.showFlashcardsPage();
      return;
    }
    var vocabId = btn.dataset.vocabId;
    var state = vocabState(vocabId);
    runVocabAction(state === "active" ? "remove" : (state === "archived" ? "restore" : "add"), vocabId);
  });

  // "Add table to flashcards" -- the common case (add everything at once)
  // instead of requiring one click per word. Skips rows currently hidden in
  // that table (Manage rows' eye icon) -- if you've already hidden a row
  // because you know it, a bulk add shouldn't pull it back into flashcards.
  document.addEventListener("click", async function (event) {
    var btn = event.target.closest && event.target.closest(".fc-add-table-btn");
    if (!btn || btn.disabled) return;
    event.stopPropagation();
    if (!hasActiveSession()) {
      if (window.SakuraStudy.vocab.showFlashcardsPage) window.SakuraStudy.vocab.showFlashcardsPage();
      return;
    }
    var vocabIds = visibleVocabIdsForTable(btn.dataset.table);
    if (!vocabIds.length) return;
    var originalText = btn.textContent;
    btn.disabled = true;
    btn.textContent = "Adding…";
    try {
      await addVocabsRemote(vocabIds);
      await fetchAllFromServer();
      invalidateInsights();
      refreshRowToggleButtons();
      var activeTab = window.SakuraStudy.flashcards.getActiveTab();
      if (activeTab === "dashboard" || activeTab === "manage") rerender();
      btn.textContent = "Added " + vocabIds.length + " word" + (vocabIds.length === 1 ? "" : "s");
      setTimeout(function () { btn.textContent = originalText; btn.disabled = false; }, 2000);
    } catch (e) {
      btn.textContent = originalText;
      btn.disabled = false;
      window.alert("Couldn't add this table to flashcards — " + (e.message || "check your connection and try again."));
    }
  });

  // Kept on the namespace root too, so dashboard.js (which redraws the
  // "Words to Review" table) can refresh the row toggles without importing
  // this whole module.
  window.SakuraStudy.flashcards.refreshRowToggleButtons = refreshRowToggleButtons;

  return {
    renderManage: renderManage, renderSettings: renderSettings, renderHelp: renderHelp,
    refreshRowToggleButtons: refreshRowToggleButtons
  };
})();
