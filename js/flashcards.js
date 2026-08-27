// Flashcards: FSRS-6 spaced repetition on top of the existing vocabulary.
//
// Supabase is the sole authoritative store for learning data (which vocab
// entries are in flashcards, their FSRS state, review history, settings).
// This file never stores vocabulary *content* anywhere but reads it live
// from window.vocabularyTables -- only each row's permanent `id` (see
// data/vocabulary.js / scripts/generate-vocab-ids.js) ever leaves the
// browser as a reference.
//
// localStorage here is only a read-through cache (for instant UI) and an
// offline outbox for reviews taken without a connection -- never treated as
// the record of truth. See sakura-flashcards-cache-v1 below.
(function () {
  "use strict";

  var DIRECTIONS = ["jp-en", "jp-ro", "ro-en", "en-ro"];
  var DIRECTION_LABEL = {
    "jp-en": "Japanese → English",
    "jp-ro": "Japanese → Romaji",
    "ro-en": "Romaji → English",
    "en-ro": "English → Romaji"
  };
  var RATING_NAMES = ["Again", "Hard", "Good", "Easy"];
  var CACHE_KEY = "sakura-flashcards-cache-v1";
  var CACHE_SCHEMA_VERSION = 1;

  function esc(s) {
    return String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }

  function uuid() {
    if (window.crypto && window.crypto.randomUUID) return window.crypto.randomUUID();
    return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function (c) {
      var r = (Math.random() * 16) | 0, v = c === "x" ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  }

  // -----------------------------------------------------------------------
  // Vocabulary index: read window.vocabularyTables live, never copy it.
  // -----------------------------------------------------------------------
  var JAPANESE_SCRIPT = /[ぁ-ゖァ-ヺ一-鿏々〆ヵヶ]/;

  function isRomajiUsable(str) {
    return !JAPANESE_SCRIPT.test(String(str || ""));
  }

  function foldMacrons(s) {
    return s
      .replace(/[āâ]/g, "a").replace(/[īî]/g, "i").replace(/[ūû]/g, "u")
      .replace(/[ēê]/g, "e").replace(/[ōô]/g, "o");
  }

  function normalizeAnswer(s, romaji) {
    var v = String(s == null ? "" : s).trim().replace(/\s+/g, " ").toLowerCase();
    if (romaji) {
      v = foldMacrons(v);
      v = v.replace(/^~/, "");
    }
    return v;
  }

  function splitAlternatives(s) {
    return String(s || "").split(" / ").map(function (x) { return x.trim(); }).filter(Boolean);
  }

  function jpPlainOf(segments) {
    return segments.map(function (seg) { return seg.kanji ? seg.kanji : seg.text; }).join("");
  }

  var vocabIndex = null;
  function buildVocabIndex() {
    var index = {};
    (window.vocabularyTables || []).forEach(function (table) {
      table.rows.forEach(function (row) {
        if (!row.id) return;
        var entry = { vocabId: row.id, category: table.category || "", tableTitle: table.title, tableId: table.id };
        var jpHtmlFn = window.jpSegmentsHtml || function () { return ""; };
        if (row.type === "verb-pair") {
          entry.jpHtml = row.forms.map(function (f) {
            return '<div class="verb-form"><span class="jpword">' + jpHtmlFn(f.jp) + "</span></div>";
          }).join("");
          entry.jpPlain = row.forms.map(function (f) { return jpPlainOf(f.jp); }).join(" / ");
          entry.romajiDisplay = row.forms.map(function (f) { return f.romaji; }).join(" / ");
          entry.romajiUsable = row.forms.every(function (f) { return isRomajiUsable(f.romaji); });
          entry.romajiAnswers = entry.romajiUsable
            ? row.forms.map(function (f) { return normalizeAnswer(f.romaji, true); })
            : [];
        } else {
          entry.jpHtml = '<span class="jpword">' + jpHtmlFn(row.jp) + "</span>";
          entry.jpPlain = jpPlainOf(row.jp);
          entry.romajiDisplay = row.romaji;
          entry.romajiUsable = isRomajiUsable(row.romaji);
          entry.romajiAnswers = entry.romajiUsable ? [normalizeAnswer(row.romaji, true)] : [];
        }
        entry.englishDisplay = row.english;
        entry.englishAnswers = splitAlternatives(row.english).map(function (a) { return normalizeAnswer(a, false); });
        index[row.id] = entry;
      });
    });
    return index;
  }
  function getVocabIndex() {
    if (!vocabIndex) vocabIndex = buildVocabIndex();
    return vocabIndex;
  }
  function directionsForEntry(entry) {
    return entry.romajiUsable ? DIRECTIONS.slice() : ["jp-en"];
  }

  function promptFor(entry, direction) {
    if (direction === "jp-en" || direction === "jp-ro") return { html: entry.jpHtml, lang: "ja" };
    if (direction === "ro-en") return { text: entry.romajiDisplay };
    return { text: entry.englishDisplay }; // en-ro
  }
  function askLabelFor(direction) {
    return direction === "jp-en" || direction === "ro-en" ? "Type the English meaning" : "Type the romaji";
  }
  function expectedDisplayFor(entry, direction) {
    return direction === "jp-en" || direction === "ro-en" ? entry.englishDisplay : entry.romajiDisplay;
  }
  function checkAnswer(entry, direction, input) {
    var isRomajiTarget = direction === "jp-ro" || direction === "en-ro";
    var norm = normalizeAnswer(input, isRomajiTarget);
    var answers = isRomajiTarget ? entry.romajiAnswers : entry.englishAnswers;
    return answers.indexOf(norm) !== -1;
  }

  // -----------------------------------------------------------------------
  // FSRS-6 wrapper (vendor/ts-fsrs.js -> window.FSRS)
  // -----------------------------------------------------------------------
  function getScheduler(settings) {
    var params = window.FSRS.generatorParameters({
      request_retention: settings.fsrs_request_retention,
      maximum_interval: settings.fsrs_maximum_interval,
      enable_fuzz: settings.fsrs_enable_fuzz
    });
    return window.FSRS.fsrs(params);
  }

  function formatInterval(now, due) {
    var ms = new Date(due).getTime() - now.getTime();
    if (ms <= 0) return "now";
    var mins = ms / 60000;
    if (mins < 1) return "<1m";
    if (mins < 60) return Math.round(mins) + "m";
    var hours = mins / 60;
    if (hours < 24) return Math.round(hours) + "h";
    var days = hours / 24;
    if (days < 30) return Math.round(days) + "d";
    var months = days / 30.44;
    if (months < 12) return Math.round(months) + "mo";
    return (days / 365.25).toFixed(1) + "y";
  }
  function formatWhen(due) {
    return new Date(due).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
  }

  function cardToFsrsInput(card) {
    return {
      due: card.due, stability: card.stability, difficulty: card.difficulty,
      scheduled_days: card.scheduled_days, learning_steps: card.learning_steps,
      reps: card.reps, lapses: card.lapses, state: card.state, last_review: card.last_review || undefined
    };
  }
  function fsrsCardToStorage(c) {
    return {
      due: c.due instanceof Date ? c.due.toISOString() : c.due,
      stability: c.stability, difficulty: c.difficulty, scheduled_days: c.scheduled_days,
      learning_steps: c.learning_steps, reps: c.reps, lapses: c.lapses, state: c.state,
      last_review: c.last_review ? (c.last_review instanceof Date ? c.last_review.toISOString() : c.last_review) : null
    };
  }
  function fsrsLogToStorage(l) {
    return {
      rating: l.rating, state: l.state,
      due: l.due instanceof Date ? l.due.toISOString() : l.due,
      stability: l.stability, difficulty: l.difficulty, scheduled_days: l.scheduled_days,
      learning_steps: l.learning_steps,
      review: l.review instanceof Date ? l.review.toISOString() : l.review
    };
  }

  function previewRatings(scheduler, card, now) {
    var record = scheduler.repeat(cardToFsrsInput(card), now);
    var out = {};
    RATING_NAMES.forEach(function (name) {
      var item = record[window.FSRS.Rating[name]];
      out[name] = { card: fsrsCardToStorage(item.card), log: fsrsLogToStorage(item.log), intervalLabel: formatInterval(now, item.card.due) };
    });
    return out;
  }
  function applyRating(scheduler, card, now, ratingName) {
    var result = scheduler.next(cardToFsrsInput(card), now, window.FSRS.Rating[ratingName]);
    return { card: fsrsCardToStorage(result.card), log: fsrsLogToStorage(result.log) };
  }
  function retrievabilityOf(scheduler, card, now) {
    if (!card.reps) return null;
    return scheduler.retrievability(cardToFsrsInput(card), now);
  }

  // -----------------------------------------------------------------------
  // Local cache -- versioned, validated, disposable. Never authoritative.
  // -----------------------------------------------------------------------
  function defaultSettings() {
    return {
      fsrs_request_retention: 0.9, fsrs_maximum_interval: 36500, fsrs_enable_fuzz: false,
      queue_new_cards_per_day: 20, schema_version: 1,
      current_streak: 0, longest_streak: 0, last_study_date: null
    };
  }
  function emptyCache(userId) {
    return { schemaVersion: CACHE_SCHEMA_VERSION, userId: userId || null, cards: {}, logsOutbox: [], settings: defaultSettings(), lastSyncedAt: null };
  }
  function isValidCardRecord(c) {
    return c && typeof c.id === "string" && typeof c.vocabId === "string" && DIRECTIONS.indexOf(c.direction) !== -1 &&
      typeof c.state === "number" && typeof c.due === "string" && typeof c.reps === "number";
  }
  function validateCache(raw) {
    if (!raw || typeof raw !== "object") return null;
    if (typeof raw.schemaVersion !== "number") return null;
    if (!raw.cards || typeof raw.cards !== "object") return null;
    if (!Array.isArray(raw.logsOutbox)) return null;
    var cards = {};
    Object.keys(raw.cards).forEach(function (id) {
      if (isValidCardRecord(raw.cards[id])) cards[id] = raw.cards[id];
    });
    return {
      schemaVersion: raw.schemaVersion, userId: raw.userId || null, cards: cards,
      logsOutbox: raw.logsOutbox.filter(function (e) { return e && e.clientReviewId && e.cardId; }),
      settings: raw.settings && typeof raw.settings === "object" ? Object.assign(defaultSettings(), raw.settings) : defaultSettings(),
      lastSyncedAt: raw.lastSyncedAt || null
    };
  }
  // Slot for future cache-shape upgrades -- a no-op today, kept so a v2
  // change has somewhere to live instead of a rewrite.
  function migrate(raw) {
    if (!raw || raw.schemaVersion === CACHE_SCHEMA_VERSION) return raw;
    return raw; // no migrations defined yet
  }

  var cache = null;
  function loadCache() {
    try {
      var raw = window.localStorage && localStorage.getItem(CACHE_KEY);
      var parsed = raw ? JSON.parse(raw) : null;
      var validated = validateCache(migrate(parsed));
      cache = validated || emptyCache();
    } catch (e) {
      cache = emptyCache();
    }
    return cache;
  }
  function saveCache() {
    try { localStorage.setItem(CACHE_KEY, JSON.stringify(cache)); } catch (e) {}
  }
  function getCache() { return cache || loadCache(); }
  function resetCacheForUser(userId) {
    cache = emptyCache(userId);
    saveCache();
  }

  // -----------------------------------------------------------------------
  // Supabase client + auth
  // -----------------------------------------------------------------------
  var supabaseClient = null;
  function configured() {
    var cfg = window.SUPABASE_CONFIG || {};
    return !!(cfg.url && cfg.anonKey);
  }
  function getClient() {
    if (supabaseClient || !configured()) return supabaseClient;
    supabaseClient = window.supabase.createClient(window.SUPABASE_CONFIG.url, window.SUPABASE_CONFIG.anonKey);
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
      authState.ready = true;
      if (authState.session) resetCacheForUser(authState.session.user.id);
      notifyAuthChange();
    });
    client.auth.onAuthStateChange(function (event, session) {
      var prevUserId = authState.session ? authState.session.user.id : null;
      authState.session = session;
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
  function fsrsRowFields(card) {
    return {
      state: card.state, due: card.due, stability: card.stability, difficulty: card.difficulty,
      scheduled_days: card.scheduled_days, reps: card.reps, lapses: card.lapses,
      learning_steps: card.learning_steps, last_review: card.last_review
    };
  }

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
      last_study_date: settingsRow.last_study_date || null
    };
    c.userId = user.id;
    c.lastSyncedAt = new Date().toISOString();
    saveCache();
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
  async function archiveVocabRemote(vocabId) {
    var client = getClient(), user = currentUser();
    var res = await client.from("flashcards").update({ active: false }).eq("user_id", user.id).eq("vocab_id", vocabId);
    if (res.error) throw res.error;
  }
  async function deleteHistoryForeverRemote(vocabId) {
    var client = getClient(), user = currentUser();
    var res = await client.from("flashcards").delete().eq("user_id", user.id).eq("vocab_id", vocabId);
    if (res.error) throw res.error;
  }
  async function saveFsrsSettingsRemote(patch) {
    var client = getClient(), user = currentUser();
    var res = await client.from("flashcard_settings").update(patch).eq("user_id", user.id);
    if (res.error) throw res.error;
  }
  async function saveQueueSettingsRemote(patch) {
    return saveFsrsSettingsRemote(patch);
  }

  // -----------------------------------------------------------------------
  // Daily study streak -- a motivational counter, not an FSRS concept.
  // Computed locally (so it still counts an offline review) and pushed to
  // Supabase best-effort; worst case (app closed before it syncs) it's off
  // by a day until the next review, never lost outright since it's derived
  // fresh from last_study_date each time, not incremented blindly.
  // -----------------------------------------------------------------------
  function localDateStr(d) {
    return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
  }
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
      }
    } finally {
      syncing = false;
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
  window.addEventListener("online", function () { syncOutbox(); });

  // -----------------------------------------------------------------------
  // Queue selection + stats
  // -----------------------------------------------------------------------
  function activeCards() {
    var c = getCache();
    return Object.keys(c.cards).map(function (id) { return c.cards[id]; }).filter(function (card) { return card.active; });
  }
  function statePriority(card) { return card.state === 1 || card.state === 3 ? 0 : card.state === 2 ? 1 : 2; }
  function buildQueue(now) {
    var c = getCache();
    var due = activeCards().filter(function (card) { return card.state !== 0 && new Date(card.due) <= now; });
    var fresh = activeCards().filter(function (card) { return card.state === 0; })
      .sort(function (a, b) { return new Date(a.due) - new Date(b.due); })
      .slice(0, Math.max(0, c.settings.queue_new_cards_per_day));
    var combined = due.concat(fresh);
    combined.sort(function (a, b) {
      var p = statePriority(a) - statePriority(b);
      return p !== 0 ? p : new Date(a.due) - new Date(b.due);
    });
    return combined.map(function (card) { return card.id; });
  }
  function computeStats(now) {
    var cards = activeCards();
    var newCount = 0, learningCount = 0, reviewCount = 0, dueCount = 0;
    var retSum = 0, retN = 0;
    var scheduler = getScheduler(getCache().settings);
    cards.forEach(function (card) {
      if (card.state === 0) newCount++;
      else if (card.state === 1 || card.state === 3) learningCount++;
      else reviewCount++;
      if (card.state !== 0 && new Date(card.due) <= now) dueCount++;
      var r = retrievabilityOf(scheduler, card, now);
      if (r != null) { retSum += r; retN++; }
    });
    var reviewsCompleted = 0;
    // Reviews completed is a lifetime count derived from each card's own
    // `reps` (ts-fsrs increments it once per review) rather than a separate
    // counter -- one less piece of state that could drift out of sync.
    Object.keys(getCache().cards).forEach(function (id) { reviewsCompleted += getCache().cards[id].reps || 0; });
    return {
      total: cards.length, newCount: newCount, learningCount: learningCount, reviewCount: reviewCount,
      dueCount: dueCount, reviewsCompleted: reviewsCompleted,
      estimatedRetention: retN ? retSum / retN : null
    };
  }

  // -----------------------------------------------------------------------
  // UI
  // -----------------------------------------------------------------------
  var activeTab = "dashboard";
  var manageFilter = "all"; // all | mine | archived
  var session = null; // review session state

  function root() { return document.getElementById("flashcardsPage"); }

  function render() {
    var el = root();
    if (!el) return;
    if (!authState.ready) { el.innerHTML = "<h2>Flashcards</h2><p class=\"fc-lede\">Loading…</p>"; return; }
    if (!configured()) { renderSetupNeeded(el); return; }
    if (!authState.session) { renderAuthGate(el); return; }
    renderShell(el);
  }

  function renderSetupNeeded(el) {
    el.innerHTML = "<h2>Flashcards</h2>" +
      '<p class="fc-lede">This feature needs a free Supabase project to store your flashcard progress. ' +
      "See <code>SUPABASE_SETUP.md</code> in the project for a step-by-step guide, then fill in " +
      "<code>js/supabase-config.js</code>.</p>";
  }

  var authMode = "signin";
  var authError = "";
  function renderAuthGate(el) {
    el.innerHTML = "<h2>Flashcards</h2>" +
      '<p class="fc-lede">Sign in to add vocabulary to your flashcards and track your reviews. The rest of the site works without an account.</p>' +
      '<form class="fc-auth" id="fcAuthForm">' +
      (authError ? '<div class="fc-auth-error">' + esc(authError) + "</div>" : "") +
      '<div class="fc-auth-field"><label for="fcEmail">Email</label><input id="fcEmail" type="email" required autocomplete="email"></div>' +
      '<div class="fc-auth-field"><label for="fcPassword">Password</label><input id="fcPassword" type="password" required autocomplete="' + (authMode === "signup" ? "new-password" : "current-password") + '" minlength="6"></div>' +
      '<button type="submit" class="fc-btn fc-btn-primary">' + (authMode === "signup" ? "Sign up" : "Sign in") + "</button>" +
      '<div class="fc-auth-switch">' + (authMode === "signup" ? "Already have an account? " : "Need an account? ") +
      '<button type="button" id="fcAuthSwitch">' + (authMode === "signup" ? "Sign in" : "Sign up") + "</button></div>" +
      "</form>";
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

  var initialSyncDone = false;
  function renderShell(el) {
    if (!initialSyncDone) {
      initialSyncDone = true;
      fetchAllFromServer().then(function () { syncOutbox(); render(); }).catch(function (e) { console.error("Flashcards: could not load from Supabase", e); render(); });
    }
    var stats = computeStats(new Date());
    el.innerHTML =
      "<h2>Flashcards</h2>" +
      '<div class="fc-signed-in-as">Signed in as ' + esc(currentUser().email) + ' <button type="button" id="fcSignOut">Sign out</button></div>' +
      '<div class="fc-tabs" role="tablist">' +
      ["dashboard", "manage", "settings"].map(function (t) {
        var label = t === "dashboard" ? "Dashboard" : t === "manage" ? "Manage" : "Settings";
        return '<button type="button" class="fc-tab' + (activeTab === t ? " active" : "") + '" data-tab="' + t + '" role="tab" aria-selected="' + (activeTab === t) + '">' + label + "</button>";
      }).join("") +
      "</div>" +
      '<div class="fc-tabpanel"' + (activeTab === "dashboard" ? "" : " hidden") + ' id="fcPanelDashboard"></div>' +
      '<div class="fc-tabpanel"' + (activeTab === "manage" ? "" : " hidden") + ' id="fcPanelManage"></div>' +
      '<div class="fc-tabpanel"' + (activeTab === "settings" ? "" : " hidden") + ' id="fcPanelSettings"></div>';

    document.getElementById("fcSignOut").addEventListener("click", function () { signOut(); });
    el.querySelectorAll(".fc-tab").forEach(function (btn) {
      btn.addEventListener("click", function () { activeTab = btn.dataset.tab; session = null; render(); });
    });

    if (activeTab === "dashboard") renderDashboard(document.getElementById("fcPanelDashboard"), stats);
    else if (activeTab === "manage") renderManage(document.getElementById("fcPanelManage"));
    else renderSettings(document.getElementById("fcPanelSettings"));
  }

  function renderDashboard(panel, stats) {
    if (session) { renderReview(panel); return; }
    var retentionText = stats.estimatedRetention == null ? "—" : Math.round(stats.estimatedRetention * 100) + "%";
    var settings = getCache().settings;
    var streak = settings.current_streak || 0;
    panel.innerHTML =
      '<div class="fc-stats-grid">' +
      statTile(streak, streak === 1 ? "Day streak" : "Day streak", false, true) +
      statTile(stats.total, "Total cards") +
      statTile(stats.newCount, "New") +
      statTile(stats.learningCount, "Learning") +
      statTile(stats.dueCount, "Due now", true) +
      statTile(stats.reviewsCompleted, "Reviews completed") +
      statTile(retentionText, "Estimated retention") +
      "</div>" +
      (settings.longest_streak > streak ? '<p class="fc-note fc-longest-streak">Longest streak: ' + settings.longest_streak + " day" + (settings.longest_streak === 1 ? "" : "s") + ".</p>" : "") +
      '<div class="fc-cta-row"><button type="button" class="fc-btn fc-btn-primary" id="fcStudyNow"' + (stats.dueCount + Math.min(stats.newCount, getCache().settings.queue_new_cards_per_day) === 0 ? " disabled" : "") + ">Study now</button>" +
      '<span class="fc-note">"Estimated retention" is FSRS’s forecasted recall probability across your reviewed cards — not a directly measured pass rate.</span></div>';
    var btn = document.getElementById("fcStudyNow");
    if (btn) btn.addEventListener("click", startSession);
  }
  function statTile(value, label, due, streak) {
    var cls = due ? " fc-stat-due" : streak ? " fc-stat-streak" : "";
    return '<div class="fc-stat-tile' + cls + '"><span class="fc-stat-value">' + esc(value) + '</span><span class="fc-stat-label">' + esc(label) + "</span></div>";
  }

  function startSession() {
    session = { queue: buildQueue(new Date()), index: 0, checked: false, preview: null, correct: null, reviewedCount: 0 };
    render();
  }

  function renderReview(panel) {
    if (!session.queue.length || session.index >= session.queue.length) {
      panel.innerHTML = '<div class="fc-session-done"><p>' + (session.reviewedCount ? "Session complete — " + session.reviewedCount + " card" + (session.reviewedCount === 1 ? "" : "s") + " reviewed." : "Nothing is due right now.") + '</p><button type="button" class="fc-btn" id="fcBackToDashboard">Back to Dashboard</button></div>';
      document.getElementById("fcBackToDashboard").addEventListener("click", function () { session = null; render(); });
      return;
    }
    var cardId = session.queue[session.index];
    var card = getCache().cards[cardId];
    var entry = getVocabIndex()[card.vocabId];
    if (!card || !card.active || !entry) { session.index++; renderReview(panel); return; }
    var prompt = promptFor(entry, card.direction);
    var now = new Date();

    var html = '<div class="fc-review-card">' +
      '<div class="fc-review-meta"><span>' + esc(DIRECTION_LABEL[card.direction]) + "</span><span>" + (session.index + 1) + " / " + session.queue.length + "</span></div>" +
      '<div class="fc-prompt-label">' + esc(askLabelFor(card.direction)) + "</div>" +
      '<div class="fc-prompt"' + (prompt.lang ? ' lang="ja"' : "") + ">" + (prompt.html || esc(prompt.text)) + "</div>" +
      '<form class="fc-answer-form" id="fcAnswerForm"><input id="fcAnswerInput" type="text" autocomplete="off" ' + (session.checked ? "disabled" : "autofocus") + '>' +
      (session.checked ? "" : '<button type="submit" class="fc-btn fc-btn-primary">Check</button>') +
      "</form>";

    if (session.checked) {
      html += '<div class="fc-result ' + (session.correct ? "fc-correct" : "fc-incorrect") + '">' +
        (session.correct ? "Correct" : "Not quite") +
        '<span class="fc-expected">Answer: ' + esc(expectedDisplayFor(entry, card.direction)) + "</span></div>";
      if (!session.rated) {
        html += '<div class="fc-rating-row">' + RATING_NAMES.map(function (name, i) {
          var p = session.preview[name];
          return '<button type="button" class="fc-rating-btn" data-rating="' + name.toLowerCase() + '"><span class="fc-rating-key">' + (i + 1) + '</span><span class="fc-rating-name">' + name + '</span><span class="fc-rating-interval">' + p.intervalLabel + "</span></button>";
        }).join("") + "</div>";
      } else {
        html += '<div class="fc-next-review">Next review: ' + esc(formatWhen(session.ratedDue)) + '</div>' +
          '<div class="fc-cta-row fc-cta-row-spaced"><button type="button" class="fc-btn fc-btn-primary" id="fcContinue">Continue</button></div>';
      }
    }
    html += "</div>";
    panel.innerHTML = html;

    var form = document.getElementById("fcAnswerForm");
    if (form) form.addEventListener("submit", function (event) {
      event.preventDefault();
      var input = document.getElementById("fcAnswerInput");
      session.correct = checkAnswer(entry, card.direction, input.value);
      session.checked = true;
      session.rated = false;
      var scheduler = getScheduler(getCache().settings);
      session.preview = previewRatings(scheduler, card, now);
      render();
    });
    panel.querySelectorAll(".fc-rating-btn").forEach(function (btn) {
      btn.addEventListener("click", function () { rate(btn.dataset.rating); });
    });
    var cont = document.getElementById("fcContinue");
    if (cont) cont.addEventListener("click", function () { session.index++; session.checked = false; session.rated = false; render(); });
  }

  function rate(ratingKey) {
    var ratingName = ratingKey.charAt(0).toUpperCase() + ratingKey.slice(1);
    var cardId = session.queue[session.index];
    var c = getCache();
    var card = c.cards[cardId];
    var scheduler = getScheduler(c.settings);
    var now = new Date();
    var base = fsrsRowFields(card);
    var result = applyRating(scheduler, base, now, ratingName);
    var outboxEntry = {
      clientReviewId: uuid(), cardId: cardId, baseCard: { reps: card.reps },
      resultCard: result.card, logFields: result.log
    };
    Object.assign(card, result.card);
    c.logsOutbox.push(outboxEntry);
    recordStudyActivity(now);
    saveCache();
    syncOutbox();
    session.rated = true;
    session.ratedDue = result.card.due;
    session.reviewedCount++;
    render();
  }

  document.addEventListener("keydown", function (event) {
    if (!session || document.body.dataset.activePage !== "flashcards") return;
    if (!session.checked || session.rated) return;
    var idx = ["1", "2", "3", "4"].indexOf(event.key);
    if (idx === -1) return;
    var btn = document.querySelector('.fc-rating-btn[data-rating="' + RATING_NAMES[idx].toLowerCase() + '"]');
    if (btn) btn.click();
  });

  // --- Manage: browse every vocab entry, add/remove/restore/delete-forever ---
  function vocabState(vocabId) {
    var cards = Object.keys(getCache().cards).map(function (id) { return getCache().cards[id]; }).filter(function (c) { return c.vocabId === vocabId; });
    if (!cards.length) return "none";
    if (cards.some(function (c) { return c.active; })) return "active";
    return "archived";
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
    var byCategory = {};
    filtered.forEach(function (id) {
      var cat = index[id].category || "Tables";
      (byCategory[cat] = byCategory[cat] || []).push(id);
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
        html += '<details open class="fc-manage-group"><summary class="fc-manage-group-title">' + esc(cat) + '</summary><div class="fc-manage-list">';
        byCategory[cat].forEach(function (id) {
          var entry = index[id];
          var state = vocabState(id);
          html += '<div class="fc-manage-row">' +
            '<span class="fc-jp" lang="ja">' + entry.jpHtml + "</span>" +
            '<span class="fc-en">' + esc(entry.englishDisplay) + "</span>" +
            (entry.romajiUsable ? "" : '<span class="fc-tag">EN only</span>') +
            '<span class="fc-actions">' + manageActionsFor(id, state) + "</span></div>";
        });
        html += "</div></details>";
      });
    }
    panel.innerHTML = html;

    panel.querySelectorAll(".fc-manage-filters button").forEach(function (btn) {
      btn.addEventListener("click", function () { manageFilter = btn.dataset.filter; render(); });
    });
    bindManageActionButtons(panel);
  }
  function manageActionsFor(vocabId, state) {
    if (state === "active") return '<button type="button" class="fc-btn" data-action="remove" data-vocab-id="' + esc(vocabId) + '">Remove</button>';
    if (state === "archived") return '<button type="button" class="fc-btn" data-action="restore" data-vocab-id="' + esc(vocabId) + '">Restore</button>' +
      '<button type="button" class="fc-btn fc-btn-danger" data-action="delete-forever" data-vocab-id="' + esc(vocabId) + '">Delete history permanently</button>';
    return '<button type="button" class="fc-btn fc-btn-primary" data-action="add" data-vocab-id="' + esc(vocabId) + '">Add</button>';
  }
  function bindManageActionButtons(scope) {
    scope.querySelectorAll("[data-action]").forEach(function (btn) {
      btn.addEventListener("click", function () { runVocabAction(btn.dataset.action, btn.dataset.vocabId); });
    });
  }
  async function runVocabAction(action, vocabId) {
    try {
      if (action === "add" || action === "restore") await addVocabRemote(vocabId);
      else if (action === "remove") await archiveVocabRemote(vocabId);
      else if (action === "delete-forever") {
        if (!window.confirm("Permanently delete all learning history for this entry? This cannot be undone.")) return;
        await deleteHistoryForeverRemote(vocabId);
      }
      await fetchAllFromServer();
      render();
      refreshRowToggleButtons();
    } catch (e) {
      window.alert("Couldn't update flashcards — " + (e.message || "check your connection and try again."));
    }
  }

  // --- Settings ---
  function renderSettings(panel) {
    var s = getCache().settings;
    panel.innerHTML =
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

    document.getElementById("fcSaveFsrs").addEventListener("click", async function () {
      var patch = {
        fsrs_request_retention: Math.min(0.99, Math.max(0.7, Number(document.getElementById("fcRetention").value) / 100)),
        fsrs_maximum_interval: Math.max(1, Number(document.getElementById("fcMaxInterval").value)),
        fsrs_enable_fuzz: document.getElementById("fcFuzz").checked
      };
      await saveFsrsSettingsRemote(patch);
      Object.assign(getCache().settings, patch);
      saveCache();
      render();
    });
    document.getElementById("fcSaveQueue").addEventListener("click", async function () {
      var patch = { queue_new_cards_per_day: Math.max(0, Number(document.getElementById("fcNewPerDay").value)) };
      await saveQueueSettingsRemote(patch);
      Object.assign(getCache().settings, patch);
      saveCache();
      render();
    });
  }
  function settingsField(label, controlHtml, help) {
    return '<div class="fc-settings-field"><div class="fc-settings-field-row"><label>' + esc(label) + "</label>" + controlHtml + "</div>" +
      (help ? '<p class="fc-settings-help">' + esc(help) + "</p>" : "") + "</div>";
  }

  // -----------------------------------------------------------------------
  // Row-level "add to flashcards" toggle, rendered by js/app.js next to the
  // existing eye/hide icon. This file owns all of its behavior/state.
  // -----------------------------------------------------------------------
  function refreshRowToggleButtons() {
    document.querySelectorAll(".fc-toggle-btn").forEach(function (btn) {
      var state = vocabState(btn.dataset.vocabId);
      var added = state === "active";
      btn.classList.toggle("fc-added", added);
      btn.setAttribute("aria-pressed", String(added));
      btn.title = added ? "Remove from flashcards" : "Add to flashcards";
      btn.setAttribute("aria-label", btn.title);
    });
  }
  document.addEventListener("click", function (event) {
    var btn = event.target.closest && event.target.closest(".fc-toggle-btn");
    if (!btn) return;
    event.stopPropagation();
    if (!configured() || !authState.session) {
      if (window.showFlashcardsPage) window.showFlashcardsPage();
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
    if (!configured() || !authState.session) {
      if (window.showFlashcardsPage) window.showFlashcardsPage();
      return;
    }
    var section = document.querySelector('.table-section[data-table="' + btn.dataset.table + '"]');
    if (!section) return;
    var vocabIds = [].slice.call(section.querySelectorAll("tbody tr:not(.row-hidden)"))
      .map(function (tr) { return tr.dataset.vocabId; })
      .filter(Boolean);
    if (!vocabIds.length) return;
    var originalText = btn.textContent;
    btn.disabled = true;
    btn.textContent = "Adding…";
    try {
      await addVocabsRemote(vocabIds);
      await fetchAllFromServer();
      refreshRowToggleButtons();
      if (activeTab === "dashboard" || activeTab === "manage") render();
      btn.textContent = "Added " + vocabIds.length + " word" + (vocabIds.length === 1 ? "" : "s");
      setTimeout(function () { btn.textContent = originalText; btn.disabled = false; }, 2000);
    } catch (e) {
      btn.textContent = originalText;
      btn.disabled = false;
      window.alert("Couldn't add this table to flashcards — " + (e.message || "check your connection and try again."));
    }
  });

  onAuthChange(function () { render(); refreshRowToggleButtons(); });

  document.addEventListener("DOMContentLoaded", function () {
    loadCache();
    initAuth();
    render();
    refreshRowToggleButtons();
  });

  // Pure-logic hooks for scripts/smoke-test.js -- exposes nothing sensitive
  // (no network/auth/cache access), just lets answer-checking/vocab-index
  // behavior be tested without a live Supabase project.
  window.__fcTestHooks = {
    normalizeAnswer: normalizeAnswer, checkAnswer: checkAnswer,
    getVocabIndex: getVocabIndex, directionsForEntry: directionsForEntry,
    isRomajiUsable: isRomajiUsable
  };
})();
