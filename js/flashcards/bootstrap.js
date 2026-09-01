// Flashcards -- bootstrap controller (SakuraStudy.flashcards, root).
//
// FSRS-6 spaced repetition on top of the existing vocabulary, split across
// js/flashcards/*.js (store -> vocab-index -> scheduling -> data-ops ->
// dashboard -> views -> this file; see the load-order comment in index.html).
// This module owns the app shell: which entry screen or tab panel is showing,
// the sign-in form, the active-tab state, and the one-time DOMContentLoaded
// init. It publishes render()/setActiveTab()/getActiveTab() for the view
// modules to call back into.
//
// Two independent ways to use Flashcards, the user's choice:
//   - Signed in: Supabase is the sole authoritative store for learning data.
//     localStorage there is only a read-through cache and an offline outbox.
//   - Guest mode: no account, no network -- localStorage *is* the record,
//     under its own separate key. Every feature works the same in both.
// No vocabulary *content* is ever stored anywhere; only each row's permanent
// id is referenced (and in guest mode it never leaves the browser at all).
window.SakuraStudy = window.SakuraStudy || {};
window.SakuraStudy.flashcards = window.SakuraStudy.flashcards || {};
(function () {
  "use strict";

  var S = window.SakuraStudy.flashcards;
  var store = S.store, vidx = S.vocabIndex, sched = S.scheduling;
  var dataOps = S.dataOps, dashboard = S.dashboard, views = S.views;
  var esc = window.SakuraStudy.shared.escapeHtml;

  var isGuestMode = store.isGuestMode, setStoredMode = store.setStoredMode, loadCache = store.loadCache;
  var computeStats = sched.computeStats;
  var authState = dataOps.authState;
  var configured = dataOps.configured, currentUser = dataOps.currentUser;
  var signUp = dataOps.signUp, signIn = dataOps.signIn, signOut = dataOps.signOut;
  var initAuth = dataOps.initAuth, onAuthChange = dataOps.onAuthChange;
  var fetchAllFromServer = dataOps.fetchAllFromServer, syncOutbox = dataOps.syncOutbox;
  var renderDashboard = dashboard.renderDashboard, invalidateInsights = dashboard.invalidateInsights;
  var renderManage = views.renderManage, renderSettings = views.renderSettings, renderHelp = views.renderHelp;
  var refreshRowToggleButtons = views.refreshRowToggleButtons;

  // -----------------------------------------------------------------------
  // App shell / tab routing
  // -----------------------------------------------------------------------
  var activeTab = "dashboard";

  function root() { return document.getElementById("flashcardsPage"); }

  function render() {
    var el = root();
    if (!el) return;
    // Guest mode never needs to wait on a network auth check -- it's a
    // stored on-device preference, not a session. Only fall through to
    // "is there an account session?" when guest mode hasn't been chosen.
    if (isGuestMode()) { renderShell(el); return; }
    if (!authState.ready) { el.innerHTML = "<h2>Flashcards</h2><p class=\"fc-lede\">Loading…</p>"; return; }
    if (authState.session) { renderShell(el); return; }
    renderEntryChoice(el);
  }

  var authMode = "signin";
  var authError = "";
  function authFormHtml() {
    return '<form class="fc-auth" id="fcAuthForm">' +
      (authError ? '<div class="fc-auth-error">' + esc(authError) + "</div>" : "") +
      '<div class="fc-auth-field"><label for="fcEmail">Email</label><input id="fcEmail" type="email" required autocomplete="email"></div>' +
      '<div class="fc-auth-field"><label for="fcPassword">Password</label><input id="fcPassword" type="password" required autocomplete="' + (authMode === "signup" ? "new-password" : "current-password") + '" minlength="6"></div>' +
      '<button type="submit" class="fc-btn fc-btn-primary">' + (authMode === "signup" ? "Sign up" : "Sign in") + "</button>" +
      '<div class="fc-auth-switch">' + (authMode === "signup" ? "Already have an account? " : "Need an account? ") +
      '<button type="button" id="fcAuthSwitch">' + (authMode === "signup" ? "Sign in" : "Sign up") + "</button></div>" +
      "</form>";
  }
  function bindAuthForm() {
    document.getElementById("fcAuthForm").addEventListener("submit", async function (event) {
      event.preventDefault();
      authError = "";
      var email = document.getElementById("fcEmail").value.trim();
      var password = document.getElementById("fcPassword").value;
      try {
        var res = authMode === "signup" ? await signUp(email, password) : await signIn(email, password);
        if (res.error) throw res.error;
        if (authMode === "signup" && res.data && !res.data.session) {
          authError = "Check your email to confirm your account, then sign in.";
          authMode = "signin";
          render();
        }
        // A successful sign-in re-renders via onAuthChange once the session
        // lands -- nothing else to do here.
      } catch (e) {
        authError = e.message || String(e);
        render();
      }
    });
    document.getElementById("fcAuthSwitch").addEventListener("click", function () {
      authMode = authMode === "signup" ? "signin" : "signup";
      authError = "";
      render();
    });
  }

  // Two equally valid ways in -- no account needed at all, or sign in for
  // cross-device sync. Guest mode works even without a Supabase project
  // configured; syncing obviously doesn't.
  function renderEntryChoice(el) {
    el.innerHTML = "<h2>Flashcards</h2>" +
      '<p class="fc-lede">Add vocabulary to your flashcards and track your reviews. Use it right here on this device, or sign in to keep it synced everywhere.</p>' +
      '<div class="fc-entry-grid">' +
      '<div class="fc-entry-card"><h3>This device only</h3>' +
      '<p class="fc-note">Stored in this browser — nothing to set up, nothing sent anywhere. Clearing site data or switching browsers loses it.</p>' +
      '<button type="button" class="fc-btn fc-btn-primary" id="fcUseGuest">Continue without an account</button></div>' +
      '<div class="fc-entry-card"><h3>Sync across devices</h3>' +
      (configured()
        ? '<p class="fc-note">Free account, backed by Supabase. Only you can see your data.</p>' + authFormHtml()
        : '<p class="fc-note">Needs a one-time setup — see <code>SUPABASE_SETUP.md</code> in the project, then fill in <code>js/config.js</code>.</p>') +
      "</div></div>";
    document.getElementById("fcUseGuest").addEventListener("click", function () {
      setStoredMode("guest");
      invalidateInsights();
      render();
      refreshRowToggleButtons(); // the vocabulary page's own "added" icons switch to this mode's (empty, at first) cache too
    });
    if (configured()) bindAuthForm();
  }

  var initialSyncDone = false;
  function renderShell(el) {
    if (!isGuestMode() && !initialSyncDone) {
      initialSyncDone = true;
      fetchAllFromServer().then(function () { invalidateInsights(); syncOutbox(); render(); }).catch(function (e) { console.error("Flashcards: could not load from Supabase", e); render(); });
    }
    var stats = computeStats(new Date());
    var identityHtml = isGuestMode()
      ? '<div class="fc-signed-in-as">Using this device only — not backed up <button type="button" id="fcGoAccount">Sign in to sync</button></div>'
      : '<div class="fc-signed-in-as">Signed in as ' + esc(currentUser().email) + ' <button type="button" id="fcSignOut">Sign out</button></div>';
    el.innerHTML =
      "<h2>Flashcards</h2>" +
      identityHtml +
      '<div class="fc-tabs" role="tablist">' +
      [["dashboard", "Dashboard"], ["manage", "Manage"], ["settings", "Settings"], ["help", "Help"]].map(function (t) {
        return '<button type="button" class="fc-tab' + (activeTab === t[0] ? " active" : "") + '" data-tab="' + t[0] + '" role="tab" aria-selected="' + (activeTab === t[0]) + '">' + t[1] + "</button>";
      }).join("") +
      "</div>" +
      '<div class="fc-tabpanel"' + (activeTab === "dashboard" ? "" : " hidden") + ' id="fcPanelDashboard"></div>' +
      '<div class="fc-tabpanel"' + (activeTab === "manage" ? "" : " hidden") + ' id="fcPanelManage"></div>' +
      '<div class="fc-tabpanel"' + (activeTab === "settings" ? "" : " hidden") + ' id="fcPanelSettings"></div>' +
      '<div class="fc-tabpanel"' + (activeTab === "help" ? "" : " hidden") + ' id="fcPanelHelp"></div>';

    if (isGuestMode()) {
      // Leaves the guest cache exactly as it is (own localStorage key) --
      // this only forgets the "use guest mode" preference so render() falls
      // through to the sign-in/sign-up choice again.
      document.getElementById("fcGoAccount").addEventListener("click", function () { setStoredMode(null); invalidateInsights(); render(); refreshRowToggleButtons(); });
    } else {
      document.getElementById("fcSignOut").addEventListener("click", function () { signOut(); });
    }
    el.querySelectorAll(".fc-tab").forEach(function (btn) {
      btn.addEventListener("click", function () { activeTab = btn.dataset.tab; dashboard.setSession(null); render(); });
    });

    if (activeTab === "dashboard") renderDashboard(document.getElementById("fcPanelDashboard"), stats);
    else if (activeTab === "manage") renderManage(document.getElementById("fcPanelManage"));
    else if (activeTab === "help") renderHelp(document.getElementById("fcPanelHelp"));
    else renderSettings(document.getElementById("fcPanelSettings"));
  }

  // Called back into by the view modules (dashboard.js, views.js).
  S.render = render;
  S.setActiveTab = function (t) { activeTab = t; };
  S.getActiveTab = function () { return activeTab; };

  onAuthChange(function () { invalidateInsights(); render(); refreshRowToggleButtons(); });

  // Vocabulary-page table icons: while signed in, a local pick is pushed to
  // the account (fetchAllFromServer pulls them back the other way on sign-in).
  if (window.SakuraStudy.tableCustom) {
    window.SakuraStudy.tableCustom.setRemotePush(function (obj) {
      if (authState.session) dataOps.saveTableCustomRemote(obj).catch(function () {});
    });
  }

  document.addEventListener("DOMContentLoaded", function () {
    loadCache();
    initAuth();
    render();
    refreshRowToggleButtons();
  });

  // Pure-logic hooks for scripts/smoke-test.js -- exposes nothing sensitive
  // (no network/auth/cache access), just lets answer-checking / vocab-index
  // behavior be tested without a live Supabase project.
  S.__testHooks = {
    normalizeAnswer: vidx.normalizeAnswer, checkAnswer: vidx.checkAnswer,
    getVocabIndex: vidx.getVocabIndex, directionsForEntry: vidx.directionsForEntry,
    isRomajiUsable: vidx.isRomajiUsable
  };
})();
