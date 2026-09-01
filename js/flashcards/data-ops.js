// Flashcards -- authentication, sync and data operations
// (SakuraStudy.flashcards.dataOps).
//
// The Supabase client + auth, the remote store (Supabase is the source of
// truth when signed in), the guest-mode local store (the cache itself is the
// record), the mode-aware entry points the rest of the UI calls, the daily
// streak, and the offline review outbox + conflict-safe sync. Nothing here
// changes storage formats or sync semantics -- it is the same code, relocated.
window.SakuraStudy = window.SakuraStudy || {};
window.SakuraStudy.flashcards = window.SakuraStudy.flashcards || {};
window.SakuraStudy.flashcards.dataOps = (function () {
  "use strict";

  var store = window.SakuraStudy.flashcards.store;
  var sched = window.SakuraStudy.flashcards.scheduling;
  var vidx = window.SakuraStudy.flashcards.vocabIndex;
  var getCache = store.getCache, saveCache = store.saveCache, resetCacheForUser = store.resetCacheForUser;
  var isGuestMode = store.isGuestMode, uuid = store.uuid, localDateStr = store.localDateStr;
  var RATING_NAMES = store.RATING_NAMES;
  var getVocabIndex = vidx.getVocabIndex, directionsForEntry = vidx.directionsForEntry;
  var fsrsRowFields = sched.fsrsRowFields, getScheduler = sched.getScheduler, applyRating = sched.applyRating;

  // -----------------------------------------------------------------------
  // Supabase client + auth
  // -----------------------------------------------------------------------
  var supabaseClient = null;
  function configured() {
    var cfg = window.SakuraStudy.config || {};
    return !!(cfg.url && cfg.anonKey);
  }
  function getClient() {
    if (supabaseClient || !configured()) return supabaseClient;
    var cfg = window.SakuraStudy.config;
    supabaseClient = window.supabase.createClient(cfg.url, cfg.anonKey);
    return supabaseClient;
  }

  var authState = { session: null, ready: false };
  var authListeners = [];
  function onAuthChange(fn) { authListeners.push(fn); }
  function notifyAuthChange() { authListeners.forEach(function (fn) { fn(authState); }); }

  function initAuth() {
    var client = getClient();
    if (!client) { authState.ready = true; notifyAuthChange(); return; }
    client.auth.getSession().then(function (res) {
      authState.session = res.data.session;
      store.setSession(authState.session);
      authState.ready = true;
      if (authState.session) resetCacheForUser(authState.session.user.id);
      notifyAuthChange();
    });
    client.auth.onAuthStateChange(function (event, session) {
      var prevUserId = authState.session ? authState.session.user.id : null;
      authState.session = session;
      store.setSession(session);
      var newUserId = session ? session.user.id : null;
      if (newUserId !== prevUserId) resetCacheForUser(newUserId);
      notifyAuthChange();
    });
  }
  function currentUser() { return authState.session ? authState.session.user : null; }
  function signUp(email, password) { return getClient().auth.signUp({ email: email, password: password }); }
  function signIn(email, password) { return getClient().auth.signInWithPassword({ email: email, password: password }); }
  function signOut() { return getClient().auth.signOut(); }

  // -----------------------------------------------------------------------
  // Remote store (Supabase = source of truth)
  // -----------------------------------------------------------------------
  async function fetchAllFromServer() {
    var client = getClient(), user = currentUser();
    var cardsRes = await client.from("flashcards").select("*").eq("user_id", user.id);
    if (cardsRes.error) throw cardsRes.error;
    var settingsRes = await client.from("flashcard_settings").select("*").eq("user_id", user.id).maybeSingle();
    if (settingsRes.error) throw settingsRes.error;
    var settingsRow = settingsRes.data;
    if (!settingsRow) {
      var insertRes = await client.from("flashcard_settings").insert({ user_id: user.id }).select().single();
      if (insertRes.error) throw insertRes.error;
      settingsRow = insertRes.data;
    }
    var c = getCache();
    c.cards = {};
    cardsRes.data.forEach(function (row) {
      c.cards[row.id] = {
        id: row.id, vocabId: row.vocab_id, direction: row.direction, active: row.active,
        state: row.state, due: row.due, stability: row.stability, difficulty: row.difficulty,
        scheduled_days: row.scheduled_days, reps: row.reps, lapses: row.lapses,
        learning_steps: row.learning_steps, last_review: row.last_review
      };
    });
    c.settings = {
      fsrs_request_retention: settingsRow.fsrs_request_retention,
      fsrs_maximum_interval: settingsRow.fsrs_maximum_interval,
      fsrs_enable_fuzz: settingsRow.fsrs_enable_fuzz,
      queue_new_cards_per_day: settingsRow.queue_new_cards_per_day,
      schema_version: settingsRow.schema_version,
      current_streak: settingsRow.current_streak || 0,
      longest_streak: settingsRow.longest_streak || 0,
      last_study_date: settingsRow.last_study_date || null,
      // !== false rather than a plain truthy check -- an existing Supabase
      // project that hasn't re-run the latest supabase/schema.sql yet won't
      // have these columns at all, and undefined should mean "on" (today's
      // default), not "off".
      enabled_directions: {
        "jp-en": settingsRow.enabled_jp_en !== false, "jp-ro": settingsRow.enabled_jp_ro !== false,
        "ro-en": settingsRow.enabled_ro_en !== false, "en-ro": settingsRow.enabled_en_ro !== false
      }
    };
    c.userId = user.id;
    c.lastSyncedAt = new Date().toISOString();
    saveCache();
    // The vocabulary page's per-table icons live in this same row -- hand
    // them to their own store so a header icon set on another device shows up.
    if (window.SakuraStudy.tableCustom) {
      window.SakuraStudy.tableCustom.applyRemote(settingsRow.table_custom || {});
    }
  }

  async function addVocabRemote(vocabId) { return addVocabsRemote([vocabId]); }
  async function addVocabsRemote(vocabIds) {
    var client = getClient(), user = currentUser();
    var index = getVocabIndex();
    var rows = [];
    vocabIds.forEach(function (vocabId) {
      var entry = index[vocabId];
      if (!entry) return; // skip anything not resolvable (e.g. a stale id)
      directionsForEntry(entry).forEach(function (d) {
        rows.push({ user_id: user.id, vocab_id: vocabId, direction: d, active: true });
      });
    });
    if (!rows.length) return [];
    // Only user_id/vocab_id/direction/active are in the payload, so on a
    // conflict (an archived row already exists) Postgres's upsert only
    // touches `active` -- every FSRS field and its review history is left
    // exactly as it was. On no conflict it inserts a fresh row using the
    // table's own createEmptyCard-equivalent column defaults.
    var res = await client.from("flashcards").upsert(rows, { onConflict: "user_id,vocab_id,direction" }).select();
    if (res.error) throw res.error;
    return res.data;
  }
  async function archiveVocabRemote(vocabId) { return archiveVocabsRemote([vocabId]); }
  async function archiveVocabsRemote(vocabIds) {
    if (!vocabIds.length) return;
    var client = getClient(), user = currentUser();
    var res = await client.from("flashcards").update({ active: false }).eq("user_id", user.id).in("vocab_id", vocabIds);
    if (res.error) throw res.error;
  }
  async function saveFsrsSettingsRemote(patch) {
    var client = getClient(), user = currentUser();
    var res = await client.from("flashcard_settings").update(patch).eq("user_id", user.id);
    if (res.error) throw res.error;
  }
  // Vocabulary-page table icons ride along in the same settings row so they
  // sync across devices (see js/vocab/table-custom.js).
  async function saveTableCustomRemote(obj) {
    if (!getClient() || !currentUser()) return;
    return saveFsrsSettingsRemote({ table_custom: obj || {} });
  }
  async function saveQueueSettingsRemote(patch) {
    return saveFsrsSettingsRemote(patch);
  }

  // -----------------------------------------------------------------------
  // Guest-mode store -- the exact same operations as above, but entirely
  // local: no network, no account, nothing to set up. The cache itself
  // *is* the record here (see the store's cacheKey() picking a separate
  // localStorage key for guest mode) rather than a disposable read-through
  // copy of something else authoritative.
  // -----------------------------------------------------------------------
  function newLocalCard(vocabId, direction) {
    var id = uuid();
    return {
      id: id, vocabId: vocabId, direction: direction, active: true,
      state: 0, due: new Date().toISOString(), stability: 0, difficulty: 0,
      scheduled_days: 0, reps: 0, lapses: 0, learning_steps: 0, last_review: null
    };
  }
  function findLocalCard(c, vocabId, direction) {
    return Object.keys(c.cards).map(function (id) { return c.cards[id]; })
      .find(function (card) { return card.vocabId === vocabId && card.direction === direction; });
  }
  function addVocabsLocal(vocabIds) {
    var c = getCache();
    var index = getVocabIndex();
    vocabIds.forEach(function (vocabId) {
      var entry = index[vocabId];
      if (!entry) return;
      directionsForEntry(entry).forEach(function (d) {
        var existing = findLocalCard(c, vocabId, d);
        if (existing) existing.active = true; // restore -- FSRS state/history untouched
        else { var card = newLocalCard(vocabId, d); c.cards[card.id] = card; }
      });
    });
    saveCache();
  }
  function archiveVocabsLocal(vocabIds) {
    var c = getCache();
    Object.keys(c.cards).forEach(function (id) {
      if (vocabIds.indexOf(c.cards[id].vocabId) !== -1) c.cards[id].active = false;
    });
    saveCache();
  }

  // -----------------------------------------------------------------------
  // Mode-aware entry points -- everything outside this module (UI, review
  // flow, queue/stats) calls only these, never the *Remote/*Local functions
  // directly, so it doesn't need to know or care which mode is active.
  // -----------------------------------------------------------------------
  async function addVocabs(vocabIds) { return isGuestMode() ? addVocabsLocal(vocabIds) : addVocabsRemote(vocabIds); }
  async function addVocab(vocabId) { return addVocabs([vocabId]); }
  async function archiveVocabs(vocabIds) { return isGuestMode() ? archiveVocabsLocal(vocabIds) : archiveVocabsRemote(vocabIds); }
  async function archiveVocab(vocabId) { return archiveVocabs([vocabId]); }
  async function saveFsrsSettings(patch) {
    Object.assign(getCache().settings, patch);
    saveCache();
    if (!isGuestMode()) await saveFsrsSettingsRemote(patch);
  }
  async function saveQueueSettings(patch) { return saveFsrsSettings(patch); }
  // Separate from saveFsrsSettings because the shapes differ: the cache
  // keeps enabled directions as one nested object (for easy `enabled[dir]`
  // lookups in buildQueue/computeStats), but Supabase stores them as 4 flat
  // boolean columns -- same pattern (mutate cache, persist locally always,
  // push remotely when signed in), just with that one translation.
  async function saveDirectionSettings(enabledMap) {
    getCache().settings.enabled_directions = enabledMap;
    saveCache();
    if (!isGuestMode()) {
      await saveFsrsSettingsRemote({
        enabled_jp_en: enabledMap["jp-en"], enabled_jp_ro: enabledMap["jp-ro"],
        enabled_ro_en: enabledMap["ro-en"], enabled_en_ro: enabledMap["en-ro"]
      });
    }
  }
  // Guest mode has nothing to fetch -- its cache already is the record.
  async function refreshData() { if (!isGuestMode()) await fetchAllFromServer(); }

  // -----------------------------------------------------------------------
  // Daily study streak -- a motivational counter, not an FSRS concept.
  // Computed locally (so it still counts an offline review) and pushed to
  // Supabase best-effort; worst case (app closed before it syncs) it's off
  // by a day until the next review, never lost outright since it's derived
  // fresh from last_study_date each time, not incremented blindly.
  // -----------------------------------------------------------------------
  function recordStudyActivity(now) {
    var s = getCache().settings;
    var today = localDateStr(now);
    if (s.last_study_date === today) return; // already counted today
    var yesterday = localDateStr(new Date(now.getTime() - 86400000));
    s.current_streak = s.last_study_date === yesterday ? s.current_streak + 1 : 1;
    s.longest_streak = Math.max(s.longest_streak, s.current_streak);
    s.last_study_date = today;
    saveCache();
    syncStreakRemote(s).catch(function () {}); // best-effort; local cache already has it
  }
  async function syncStreakRemote(s) {
    if (!configured() || !currentUser()) return;
    await saveFsrsSettingsRemote({ current_streak: s.current_streak, longest_streak: s.longest_streak, last_study_date: s.last_study_date });
  }

  async function pushReviewLogRemote(entry) {
    var client = getClient(), user = currentUser();
    var res = await client.from("review_logs").insert({
      user_id: user.id, card_id: entry.cardId, client_review_id: entry.clientReviewId,
      rating: entry.logFields.rating, state: entry.logFields.state, due: entry.logFields.due,
      stability: entry.logFields.stability, difficulty: entry.logFields.difficulty,
      scheduled_days: entry.logFields.scheduled_days, learning_steps: entry.logFields.learning_steps,
      reviewed_at: entry.logFields.review
    });
    if (res.error && res.error.code !== "23505") throw res.error; // 23505 = already synced, fine
  }
  async function applyCardUpdateGuarded(cardId, resultCard, baseReps) {
    var client = getClient();
    var payload = fsrsRowFields(resultCard);
    payload.updated_at = new Date().toISOString();
    var res = await client.from("flashcards").update(payload).eq("id", cardId).eq("reps", baseReps).select();
    if (res.error) throw res.error;
    return res.data && res.data.length > 0;
  }
  async function fetchCardById(cardId) {
    var client = getClient();
    var res = await client.from("flashcards").select("*").eq("id", cardId).maybeSingle();
    if (res.error) throw res.error;
    return res.data;
  }

  // -----------------------------------------------------------------------
  // Outbox / sync -- offline reviews computed locally, queued, then synced.
  // -----------------------------------------------------------------------
  var syncing = false;

  // A tiny observable for the UI's offline / pending-sync chip: current
  // connectivity plus how many reviews are still queued locally. Guest mode
  // has nothing to sync, so its pending count is always 0 (an offline hint
  // is still meaningful there). Fired on connectivity changes and every time
  // the outbox depth moves.
  var syncStateListeners = [];
  function onSyncStateChange(fn) { syncStateListeners.push(fn); }
  function getSyncState() {
    var online = typeof navigator === "undefined" || navigator.onLine !== false;
    var pending = isGuestMode() ? 0 : (getCache().logsOutbox || []).length;
    return { online: online, pending: pending };
  }
  function notifySyncStateChange() {
    var st = getSyncState();
    syncStateListeners.forEach(function (fn) { try { fn(st); } catch (e) {} });
  }
  async function syncOutbox() {
    if (syncing || !configured() || !currentUser()) return;
    syncing = true;
    try {
      var c = getCache();
      while (c.logsOutbox.length) {
        var entry = c.logsOutbox[0];
        var outcome;
        try {
          outcome = await syncOne(entry);
        } catch (e) {
          break; // network/other error -- stop, retry on next trigger, leave entry queued
        }
        if (outcome === "retry") break;
        c.logsOutbox.shift();
        saveCache();
        notifySyncStateChange();
      }
    } finally {
      syncing = false;
      notifySyncStateChange();
    }
  }
  async function syncOne(entry) {
    await pushReviewLogRemote(entry);
    var ok = await applyCardUpdateGuarded(entry.cardId, entry.resultCard, entry.baseCard.reps);
    if (ok) return "done";
    // Conflict: another device moved this card first. Recompute the rating
    // deterministically from the server's current state instead of
    // overwriting it -- the review log above already recorded what the user
    // saw at the time; this only reconciles the card's live pointer.
    var server = await fetchCardById(entry.cardId);
    if (!server) return "deleted";
    var c = getCache();
    var scheduler = getScheduler(c.settings);
    var replayed = applyRating(scheduler, fsrsRowFields(server), new Date(entry.logFields.review), RATING_NAMES[entry.logFields.rating - 1]);
    var ok2 = await applyCardUpdateGuarded(entry.cardId, replayed.card, server.reps);
    if (!ok2) return "retry";
    entry.resultCard = replayed.card;
    return "done";
  }
  window.addEventListener("online", function () { notifySyncStateChange(); syncOutbox(); });
  window.addEventListener("offline", function () { notifySyncStateChange(); });

  return {
    configured: configured, getClient: getClient, currentUser: currentUser,
    signUp: signUp, signIn: signIn, signOut: signOut, initAuth: initAuth,
    onAuthChange: onAuthChange, authState: authState,
    fetchAllFromServer: fetchAllFromServer,
    addVocab: addVocab, addVocabs: addVocabs, addVocabsRemote: addVocabsRemote,
    archiveVocab: archiveVocab, archiveVocabs: archiveVocabs,
    saveFsrsSettings: saveFsrsSettings, saveQueueSettings: saveQueueSettings,
    saveDirectionSettings: saveDirectionSettings, refreshData: refreshData,
    saveTableCustomRemote: saveTableCustomRemote,
    recordStudyActivity: recordStudyActivity, syncOutbox: syncOutbox,
    onSyncStateChange: onSyncStateChange, getSyncState: getSyncState
  };
})();
