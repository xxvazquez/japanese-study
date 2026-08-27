// Flashcards: FSRS-6 spaced repetition on top of the existing vocabulary.
//
// Two independent ways to use this, the user's choice (see isGuestMode()):
//   - Signed in: Supabase is the sole authoritative store for learning data
//     (which vocab entries are in flashcards, their FSRS state, review
//     history, settings). localStorage there is only a read-through cache
//     (for instant UI) and an offline outbox for reviews taken without a
//     connection -- never treated as the record of truth.
//   - Guest mode: no account, no network at all -- localStorage *is* the
//     record, under its own separate key (GUEST_CACHE_KEY) so it never mixes
//     with a signed-in cache. Nothing here favors one mode over the other;
//     every feature works the same in both.
// This file never stores vocabulary *content* anywhere but reads it live
// from window.vocabularyTables -- only each row's permanent `id` (see
// data/vocabulary.js / scripts/generate-vocab-ids.js) ever leaves the
// browser as a reference (and in guest mode, it never even leaves the
// browser at all).
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
  var GUEST_CACHE_KEY = "sakura-flashcards-guest-v1";
  var MODE_KEY = "sakura-flashcards-mode";
  var CACHE_SCHEMA_VERSION = 1;

  // Two ways to use Flashcards: signed in (Supabase is authoritative, see
  // below) or entirely on-device ("guest" mode -- localStorage only, no
  // account, no network, nothing to set up). Guest mode is a stored
  // preference, not a session -- it's guest mode whenever there's no active
  // Supabase session and the user has previously chosen it.
  //
  // inMemoryMode is a same-pageview fallback for when localStorage itself
  // is unavailable (private browsing in some browsers throws on any access,
  // rather than just declining to persist) -- without it, choosing "guest
  // mode" would silently fail to take effect at all rather than just fail
  // to be *remembered* next visit.
  var inMemoryMode = null;
  function getStoredMode() {
    try { return localStorage.getItem(MODE_KEY); } catch (e) { return inMemoryMode; }
  }
  function setStoredMode(m) {
    inMemoryMode = m;
    try { if (m) localStorage.setItem(MODE_KEY, m); else localStorage.removeItem(MODE_KEY); } catch (e) {}
  }
  function isGuestMode() { return !authState.session && getStoredMode() === "guest"; }
  function hasActiveSession() { return isGuestMode() || !!authState.session; }

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
    return direction === "jp-en" || direction === "ro-en" ? "Type the English meaning" : "Type the romaji reading";
  }
  // Same "which language" cue as the label above the prompt, but repeated
  // right inside the input itself -- the label can be easy to skim past,
  // and this is exactly where your eyes are when you start typing.
  function answerPlaceholderFor(direction) {
    return direction === "jp-en" || direction === "ro-en" ? "English…" : "Romaji…";
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
      current_streak: 0, longest_streak: 0, last_study_date: null,
      // Which of the 4 directions actually get studied -- not an FSRS
      // setting, and independent of which cards exist: turning a direction
      // off just leaves its cards out of the queue/stats, never deletes or
      // resets them. All on by default, same as before this setting existed.
      enabled_directions: { "jp-en": true, "jp-ro": true, "ro-en": true, "en-ro": true }
    };
  }
  function emptyCache(userId) {
    return { schemaVersion: CACHE_SCHEMA_VERSION, userId: userId || null, cards: {}, logsOutbox: [], reviewLogs: [], settings: defaultSettings(), lastSyncedAt: null };
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
      // Only ever used in guest mode (signed-in mode reads its history from
      // Supabase's review_logs instead) -- one entry per review, carrying the
      // day plus (for the Dashboard's mistake insights) a timestamp, the
      // vocab id, the rating and whether the typed answer was wrong. Capped so
      // it can't grow forever; older {date}-only entries are still valid.
      reviewLogs: Array.isArray(raw.reviewLogs) ? raw.reviewLogs.filter(function (e) { return e && typeof e.date === "string"; }).slice(-1000) : [],
      settings: mergeSettings(raw.settings),
      lastSyncedAt: raw.lastSyncedAt || null
    };
  }
  // Object.assign is shallow, which would let a stored settings blob missing
  // (or only partially specifying) enabled_directions silently wipe out the
  // rest of that nested object's defaults -- merge it one level deeper so an
  // older cache (from before this setting existed) still comes back with
  // every direction enabled, not undefined/missing ones treated as off.
  function mergeSettings(raw) {
    var merged = Object.assign(defaultSettings(), raw && typeof raw === "object" ? raw : {});
    merged.enabled_directions = Object.assign({}, defaultSettings().enabled_directions, (raw && raw.enabled_directions) || {});
    return merged;
  }
  // Slot for future cache-shape upgrades -- a no-op today, kept so a v2
  // change has somewhere to live instead of a rewrite.
  function migrate(raw) {
    if (!raw || raw.schemaVersion === CACHE_SCHEMA_VERSION) return raw;
    return raw; // no migrations defined yet
  }

  // Guest mode and signed-in mode keep entirely separate caches (different
  // localStorage keys) so switching between them never overwrites or mixes
  // the other's data -- both are simply preserved, whichever you come back to.
  function cacheKey() { return isGuestMode() ? GUEST_CACHE_KEY : CACHE_KEY; }
  var cache = null;
  var cacheLoadedKey = null;
  // Same reasoning as inMemoryMode above: if localStorage itself is
  // unavailable, saveCache() below still keeps a same-pageview copy here so
  // that switching modes and back within one visit doesn't discard data
  // that was already added -- without this, loadCache() would rebuild an
  // empty cache from scratch every time the active key changes, even though
  // nothing was actually lost, just never persisted anywhere to read back.
  var inMemoryCaches = {};
  function loadCache() {
    var key = cacheKey();
    try {
      var raw = window.localStorage && localStorage.getItem(key);
      var parsed = raw ? JSON.parse(raw) : null;
      var validated = validateCache(migrate(parsed));
      cache = validated || inMemoryCaches[key] || emptyCache();
    } catch (e) {
      cache = inMemoryCaches[key] || emptyCache();
    }
    cacheLoadedKey = key;
    return cache;
  }
  function saveCache() {
    var key = cacheKey();
    inMemoryCaches[key] = cache;
    try { localStorage.setItem(key, JSON.stringify(cache)); } catch (e) {}
  }
  function getCache() {
    // Re-load if the active mode changed which key we should be reading
    // (e.g. signing in after having used guest mode) rather than continuing
    // to read/write the wrong one.
    if (!cache || cacheLoadedKey !== cacheKey()) return loadCache();
    return cache;
  }
  function resetCacheForUser(userId) {
    cache = emptyCache(userId);
    cacheLoadedKey = cacheKey();
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
  async function saveQueueSettingsRemote(patch) {
    return saveFsrsSettingsRemote(patch);
  }

  // -----------------------------------------------------------------------
  // Guest-mode store -- the exact same operations as above, but entirely
  // local: no network, no account, nothing to set up. The cache itself
  // *is* the record here (see cacheKey() picking a separate localStorage
  // key for guest mode) rather than a disposable read-through copy of
  // something else authoritative.
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
  // Mode-aware entry points -- everything above this line (UI, review flow,
  // queue/stats) calls only these, never the *Remote/*Local functions
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
  // Cards in a direction the user has switched off in Settings (Study
  // Directions) are left exactly as they are -- state, history, everything
  // -- just excluded from what gets studied or counted, the same way an
  // archived card is. Re-enabling the direction picks them back up with
  // nothing lost.
  function studyableCards() {
    var enabled = getCache().settings.enabled_directions;
    return activeCards().filter(function (card) { return enabled[card.direction] !== false; });
  }
  function shuffle(arr) {
    for (var i = arr.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var t = arr[i]; arr[i] = arr[j]; arr[j] = t;
    }
    return arr;
  }
  // Learning/relearning cards stay strictly ordered by due time (a card due
  // in 1 minute genuinely should come back before one due in 10) since
  // that's short-term reinforcement, not a memorization drill -- but which
  // due reviews and which fresh cards come up is shuffled, so a session
  // isn't a predictable march through the same word/direction order every
  // time (e.g. always all 4 directions of one word back to back).
  function buildQueue(now) {
    var c = getCache();
    var studyable = studyableCards();
    var learning = studyable.filter(function (card) { return (card.state === 1 || card.state === 3) && new Date(card.due) <= now; })
      .sort(function (a, b) { return new Date(a.due) - new Date(b.due); });
    var review = shuffle(studyable.filter(function (card) { return card.state === 2 && new Date(card.due) <= now; }));
    var fresh = shuffle(studyable.filter(function (card) { return card.state === 0; }))
      .slice(0, Math.max(0, c.settings.queue_new_cards_per_day));
    return learning.concat(review, fresh).map(function (card) { return card.id; });
  }
  function computeStats(now) {
    var cards = studyableCards();
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
  var manageExpandedTables = {}; // tableId -> true; session-only UI state, collapsed (absent) by default
  var session = null; // review session state
  // Same chevron used for every other collapse/expand control in the app
  // (sidebar groups, Overview rows) -- kept here rather than exported from
  // app.js since it's a tiny, self-contained bit of markup.
  var CHEVRON_ICON = '<svg viewBox="0 0 18 18" width="12" height="12" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 7l4 4 4-4"/></svg>';

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
        : '<p class="fc-note">Needs a one-time setup — see <code>SUPABASE_SETUP.md</code> in the project, then fill in <code>js/supabase-config.js</code>.</p>') +
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
      btn.addEventListener("click", function () { activeTab = btn.dataset.tab; session = null; render(); });
    });

    if (activeTab === "dashboard") renderDashboard(document.getElementById("fcPanelDashboard"), stats);
    else if (activeTab === "manage") renderManage(document.getElementById("fcPanelManage"));
    else if (activeTab === "help") renderHelp(document.getElementById("fcPanelHelp"));
    else renderSettings(document.getElementById("fcPanelSettings"));
  }

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
      '<div class="fc-settings-section"><h3>Review keyboard shortcuts</h3>' +
      '<ul class="fc-help-list">' +
      '<li><kbd>Space</kbd> or <kbd>Enter</kbd> — check your answer</li>' +
      '<li><kbd>1</kbd> <kbd>2</kbd> <kbd>3</kbd> <kbd>4</kbd> — rate Again / Hard / Good / Easy (only after the answer is checked)</li>' +
      '</ul></div>' +
      '<div class="fc-settings-section"><h3>Dashboard</h3>' +
      '<ul class="fc-help-list">' +
      '<li><span class="fc-legend-term">Today</span> — cards reviewed today against your daily target (New cards per day, under Settings → Daily Session).</li>' +
      '<li><span class="fc-legend-term">Next review</span> — when the next scheduled card is due, taken straight from the FSRS schedule.</li>' +
      '<li><span class="fc-legend-term">Recent mistakes</span> — words you missed today. Click one to practice it right away.</li>' +
      '<li><span class="fc-legend-term">Words to Review</span> — words you get wrong repeatedly over time, shown as a normal vocabulary table you can sort and print.</li>' +
      '</ul></div>' +
      '<div class="fc-settings-section"><h3>Casual &amp; polite forms</h3>' +
      '<p class="fc-note">On the vocabulary tables, the <span class="fc-legend-term">Show polite</span> toggle switches verb columns between the plain / dictionary form and the polite <span lang="ja">〜ます</span> form. One form is shown at a time. Words with no distinct polite form are left unchanged.</p>' +
      '</div>' +
      '<div class="fc-settings-section"><h3>Study directions</h3>' +
      '<p class="fc-note">Settings → Study Directions turns any of the four review directions on or off. Turning one off never deletes its cards or progress — it just leaves that direction out of review until you turn it back on.</p>' +
      '</div>';
  }

  function renderDashboard(panel, stats) {
    if (session) { renderReview(panel); return; }
    var retentionText = stats.estimatedRetention == null ? "—" : Math.round(stats.estimatedRetention * 100) + "%";
    var settings = getCache().settings;
    var streak = settings.current_streak || 0;
    var now = new Date();
    if (weeklyActivity === null && !weeklyActivityLoading) {
      weeklyActivityLoading = true;
      loadWeeklyActivity().catch(function () { weeklyActivity = []; }).then(function () { weeklyActivityLoading = false; render(); });
    }
    if (reviewInsights === null && !reviewInsightsLoading) {
      reviewInsightsLoading = true;
      loadReviewInsights().catch(function () { reviewInsights = emptyInsights(); }).then(function () { reviewInsightsLoading = false; render(); });
    }
    var newInSession = Math.min(stats.newCount, Math.max(0, settings.queue_new_cards_per_day));
    panel.innerHTML =
      '<div class="fc-top-row">' + nextReviewHtml(now) + todayProgressHtml() + "</div>" +
      '<div class="fc-stats-grid">' +
      statTile(streak, "Day streak", "streak") +
      statTile(stats.total, "Total cards") +
      statTile(stats.dueCount, "Due now", "due") +
      statTile(stats.reviewsCompleted, "Reviews completed") +
      statTile(retentionText, "Estimated retention") +
      "</div>" +
      (settings.longest_streak > streak ? '<p class="fc-note fc-longest-streak">Longest streak: ' + settings.longest_streak + " day" + (settings.longest_streak === 1 ? "" : "s") + ".</p>" : "") +
      '<div class="fc-viz-grid">' +
      '<div class="fc-viz-card"><h3 class="fc-viz-title">Card progress</h3>' + stateBreakdownChart(stats) + "</div>" +
      '<div class="fc-viz-card"><h3 class="fc-viz-title">Reviews this week</h3>' + (weeklyActivity ? weeklyActivityChart(weeklyActivity) : '<p class="fc-note">Loading…</p>') + "</div>" +
      '<div class="fc-viz-card"><h3 class="fc-viz-title">Recent mistakes</h3>' + recentMistakesHtml() + "</div>" +
      "</div>" +
      '<div class="fc-cta-row"><button type="button" class="fc-btn fc-btn-primary" id="fcStudyNow"' + (stats.dueCount + newInSession === 0 ? " disabled" : "") + ">Study now</button>" +
      '<span class="fc-note">"Estimated retention" is FSRS’s forecasted recall probability across your reviewed cards — not a directly measured pass rate.</span></div>' +
      '<div id="fcWordsToReview"></div>';
    var btn = document.getElementById("fcStudyNow");
    if (btn) btn.addEventListener("click", startSession);
    renderWordsToReview();
  }
  function statTile(value, label, variant) {
    var cls = variant ? " fc-stat-" + variant : "";
    return '<div class="fc-stat-tile' + cls + '"><span class="fc-stat-value">' + esc(value) + '</span><span class="fc-stat-label">' + esc(label) + "</span></div>";
  }

  // --- Dashboard: Today's progress, Next review, Recent mistakes, Words to Review ---

  function todayProgressHtml() {
    var target = Math.max(0, getCache().settings.queue_new_cards_per_day || 0);
    var done = reviewInsights ? reviewInsights.reviewedToday : 0;
    var pct = target > 0 ? Math.min(100, Math.round(done / target * 100)) : (done > 0 ? 100 : 0);
    return '<div class="fc-today">' +
      '<div class="fc-today-head"><span class="fc-today-label">Today</span>' +
      '<span class="fc-today-count">' + done + " / " + target + " cards</span>" +
      '<span class="fc-today-pct">' + pct + '%</span></div>' +
      '<div class="fc-progress"><svg viewBox="0 0 100 6" preserveAspectRatio="none" class="fc-progress-svg" aria-hidden="true">' +
      '<rect class="fc-progress-track" x="0" y="0" width="100" height="6"></rect>' +
      '<rect class="fc-progress-fill" x="0" y="0" width="' + pct + '" height="6"></rect></svg></div></div>';
  }

  // "in 8 minutes" for something imminent, "Tomorrow at 09:30" for something
  // further out -- both straight off each card's real FSRS `due`.
  function verboseUntil(now, ts) {
    var ms = ts - now.getTime();
    if (ms <= 0) return "now";
    var mins = Math.round(ms / 60000);
    if (mins < 60) return "in " + Math.max(1, mins) + " minute" + (mins === 1 ? "" : "s");
    var hrs = Math.round(mins / 60);
    if (hrs < 24) return "in " + hrs + " hour" + (hrs === 1 ? "" : "s");
    var days = Math.round(hrs / 24);
    return "in " + days + " day" + (days === 1 ? "" : "s");
  }
  function friendlyWhen(now, ts) {
    var d = new Date(ts);
    var time = d.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit", hour12: false });
    var startToday = new Date(now); startToday.setHours(0, 0, 0, 0);
    var dStart = new Date(ts); dStart.setHours(0, 0, 0, 0);
    var dayDiff = Math.round((dStart.getTime() - startToday.getTime()) / 86400000);
    if (dayDiff <= 0) return "Today at " + time;
    if (dayDiff === 1) return "Tomorrow at " + time;
    if (dayDiff < 7) return d.toLocaleDateString(undefined, { weekday: "long" }) + " at " + time;
    return d.toLocaleDateString(undefined, { month: "short", day: "numeric" }) + " at " + time;
  }
  function nextReviewHtml(now) {
    var scheduled = studyableCards().filter(function (c) { return c.state !== 0; });
    var endToday = new Date(now); endToday.setHours(23, 59, 59, 999);
    var dueToday = scheduled.filter(function (c) { return new Date(c.due) <= endToday; }).length;
    var futureTs = scheduled
      .map(function (c) { return new Date(c.due).getTime(); })
      .filter(function (t) { return t > now.getTime(); })
      .sort(function (a, b) { return a - b; });
    var nextTs = futureTs.length ? futureTs[0] : null;
    var title, sub, variant;
    if (dueToday > 0) {
      variant = "due";
      title = dueToday + " card" + (dueToday === 1 ? "" : "s") + " due today";
      sub = "Next review: " + (nextTs ? verboseUntil(now, nextTs) : "now");
    } else {
      variant = "clear";
      title = "All caught up";
      sub = "Next review: " + (nextTs ? friendlyWhen(now, nextTs) : "no cards scheduled yet");
    }
    return '<div class="fc-next-review fc-next-review-' + variant + '">' +
      '<span class="fc-next-review-title">' + esc(title) + "</span>" +
      '<span class="fc-next-review-sub">' + esc(sub) + "</span></div>";
  }

  function recentMistakesHtml() {
    if (!reviewInsights) return '<p class="fc-note">Loading…</p>';
    var list = reviewInsights.recentMistakes;
    if (!list.length) return '<p class="fc-note">No mistakes today.</p>';
    var idx = getVocabIndex();
    return '<ul class="fc-mini-list">' + list.map(function (m) {
      var e = idx[m.vocabId];
      if (!e) return "";
      return '<li><button type="button" class="fc-mini-row" data-review-vocab="' + esc(m.vocabId) + '">' +
        '<span class="fc-mini-word">' +
        '<span class="fc-jp" lang="ja">' + e.jpHtml + "</span>" +
        '<span class="fc-mini-ro">' + esc(e.romajiDisplay) + "</span>" +
        '<span class="fc-mini-en">' + esc(e.englishDisplay) + "</span>" +
        "</span>" +
        '<span class="fc-mini-meta">' + m.count + " mistake" + (m.count === 1 ? "" : "s") + " today</span>" +
        "</button></li>";
    }).join("") + "</ul>";
  }

  var rawRowById = null;
  function getRawVocabRow(vocabId) {
    if (!rawRowById) {
      rawRowById = {};
      (window.vocabularyTables || []).forEach(function (t) {
        t.rows.forEach(function (r) { if (r.id) rawRowById[r.id] = r; });
      });
    }
    return rawRowById[vocabId] || null;
  }
  // "Words to Review" is one of the standard vocabulary table sections
  // (window.buildVocabSection) filled with the entries missed most often --
  // so it sorts, prints and view-mode-filters exactly like every other table.
  function renderWordsToReview() {
    var host = document.getElementById("fcWordsToReview");
    if (!host) return;
    if (!reviewInsights) { host.innerHTML = '<p class="fc-note">Loading…</p>'; return; }
    var rows = reviewInsights.wordsToReview.map(function (m) { return getRawVocabRow(m.vocabId); }).filter(Boolean);
    if (!rows.length || !window.buildVocabSection) {
      host.innerHTML = '<div class="fc-viz-card"><h3 class="fc-viz-title">Words to Review</h3>' +
        '<p class="fc-note">Nothing stands out yet — words you miss more than once collect here so you can drill and print them.</p></div>';
      return;
    }
    host.innerHTML = window.buildVocabSection({
      id: "wtr", title: "Words to Review", rows: rows, presort: false,
      controls: { columnSelect: true, print: true }
    });
    refreshRowToggleButtons();
    if (window.syncViewModeControls) window.syncViewModeControls();
  }

  // Card-state breakdown -- a single stacked bar (New/Learning/Review),
  // colors reused from the existing palette (New: neutral faint, Learning:
  // the site's rose accent for "in progress", Review: brand teal for
  // "established") rather than introducing new hues. SVG attributes (not
  // style="") so the computed widths don't run into the page's CSP.
  function stateBreakdownChart(stats) {
    var segs = [
      { n: stats.newCount, cls: "fc-seg-new", label: "New" },
      { n: stats.learningCount, cls: "fc-seg-learning", label: "Learning" },
      { n: stats.reviewCount, cls: "fc-seg-review", label: "Review" }
    ];
    var total = Math.max(1, stats.newCount + stats.learningCount + stats.reviewCount);
    var w = 400, x = 0, rects = "";
    segs.forEach(function (s) {
      var sw = (s.n / total) * w;
      if (s.n > 0) rects += '<rect class="' + s.cls + '" x="' + x.toFixed(1) + '" y="0" width="' + sw.toFixed(1) + '" height="16"></rect>';
      x += sw;
    });
    var legend = segs.map(function (s) {
      return '<span class="fc-legend-item"><span class="fc-legend-dot ' + s.cls + '"></span>' + esc(s.label) + " " + s.n + "</span>";
    }).join("");
    return '<div class="fc-breakdown-bar-wrap"><svg viewBox="0 0 ' + w + ' 16" preserveAspectRatio="none" class="fc-breakdown-bar" role="img" aria-label="Card progress breakdown">' + rects + "</svg></div>" +
      '<div class="fc-breakdown-legend">' + legend + "</div>";
  }

  var weeklyActivity = null; // null = not fetched yet, [] = fetched, empty
  var weeklyActivityLoading = false;

  // -----------------------------------------------------------------------
  // Review insights (Dashboard): reviewed-today count, "Words to Review"
  // (missed repeatedly, over time) and "Recent mistakes" (missed today).
  // All derived from actual review history -- the guest cache's reviewLogs
  // or Supabase's review_logs -- never estimated. `reviewEvents` caches the
  // raw per-review list so the two derived views recompute cheaply (e.g.
  // when pausing a word changes which entries still count as active).
  // -----------------------------------------------------------------------
  var reviewInsights = null;
  var reviewInsightsLoading = false;
  var reviewEvents = null; // [{ vocabId, wrong, ts }]
  function emptyInsights() { return { reviewedToday: 0, wordsToReview: [], recentMistakes: [] }; }
  function invalidateInsights() { reviewInsights = null; reviewEvents = null; reviewInsightsLoading = false; }

  function computeInsights(events) {
    var todayStr = localDateStr(new Date());
    var agg = {};
    var reviewedToday = 0;
    events.forEach(function (e) {
      if (!e.vocabId) return;
      var a = agg[e.vocabId] || (agg[e.vocabId] = { reviews: 0, mistakes: 0, todayMistakes: 0, lastMistakeTs: 0 });
      var isToday = localDateStr(new Date(e.ts)) === todayStr;
      a.reviews++;
      if (isToday) reviewedToday++;
      if (e.wrong) {
        a.mistakes++;
        if (e.ts > a.lastMistakeTs) a.lastMistakeTs = e.ts;
        if (isToday) a.todayMistakes++;
      }
    });
    var activeVocab = {};
    Object.keys(getCache().cards).forEach(function (id) {
      var c = getCache().cards[id];
      if (c.active) activeVocab[c.vocabId] = true;
    });
    // Words to Review: missed at least twice (not a one-off slip) and still
    // being studied. Ranked by mistake count, then by miss rate.
    var wordsToReview = Object.keys(agg)
      .filter(function (v) { return agg[v].mistakes >= 2 && activeVocab[v]; })
      .map(function (v) { return { vocabId: v, mistakes: agg[v].mistakes, reviews: agg[v].reviews }; })
      .sort(function (a, b) { return b.mistakes - a.mistakes || (b.mistakes / b.reviews) - (a.mistakes / a.reviews); })
      .slice(0, 20);
    // Recent mistakes: whatever was missed today, most-missed first.
    var recentMistakes = Object.keys(agg)
      .filter(function (v) { return agg[v].todayMistakes >= 1; })
      .map(function (v) { return { vocabId: v, count: agg[v].todayMistakes, lastTs: agg[v].lastMistakeTs }; })
      .sort(function (a, b) { return b.count - a.count || b.lastTs - a.lastTs; })
      .slice(0, 6);
    return { reviewedToday: reviewedToday, wordsToReview: wordsToReview, recentMistakes: recentMistakes };
  }
  async function fetchReviewEvents() {
    if (isGuestMode()) {
      return getCache().reviewLogs.map(function (r) {
        return {
          vocabId: r.vocabId || null,
          wrong: r.wrong === true || r.rating === 1,
          ts: typeof r.ts === "number" ? r.ts : (Date.parse(r.date + "T12:00:00") || Date.now())
        };
      });
    }
    var client = getClient(), user = currentUser();
    var since = new Date(); since.setDate(since.getDate() - 120);
    var res = await client.from("review_logs").select("card_id, rating, reviewed_at").eq("user_id", user.id).gte("reviewed_at", since.toISOString());
    if (res.error) throw res.error;
    var cards = getCache().cards;
    return res.data.map(function (row) {
      var card = cards[row.card_id];
      return { vocabId: card ? card.vocabId : null, wrong: row.rating === 1, ts: new Date(row.reviewed_at).getTime() };
    });
  }
  async function loadReviewInsights() {
    if (!reviewEvents) reviewEvents = await fetchReviewEvents();
    reviewInsights = computeInsights(reviewEvents);
  }
  function last7DaysFromCounts(counts) {
    var days = [];
    for (var i = 6; i >= 0; i--) {
      var d = new Date(); d.setDate(d.getDate() - i);
      var key = localDateStr(d);
      days.push({ label: d.toLocaleDateString(undefined, { weekday: "short" }).slice(0, 2), count: counts[key] || 0 });
    }
    return days;
  }
  async function loadWeeklyActivity() {
    if (isGuestMode()) {
      var counts = {};
      getCache().reviewLogs.forEach(function (r) { counts[r.date] = (counts[r.date] || 0) + 1; });
      weeklyActivity = last7DaysFromCounts(counts);
      return;
    }
    return fetchWeeklyActivity();
  }
  async function fetchWeeklyActivity() {
    var client = getClient(), user = currentUser();
    var since = new Date(); since.setHours(0, 0, 0, 0); since.setDate(since.getDate() - 6);
    var res = await client.from("review_logs").select("reviewed_at").eq("user_id", user.id).gte("reviewed_at", since.toISOString());
    if (res.error) throw res.error;
    var counts = {};
    res.data.forEach(function (row) {
      var key = localDateStr(new Date(row.reviewed_at));
      counts[key] = (counts[key] || 0) + 1;
    });
    var days = last7DaysFromCounts(counts);
    weeklyActivity = days;
  }
  // Labels are plain HTML, not SVG <text> -- an SVG scales *everything*
  // inside it, text included, to fill its container (that's what stretched
  // a 9px label into something enormous on a narrow phone screen where the
  // chart is much wider, relative to its own coordinate system, than it is
  // on desktop). Keeping the bar's geometry as a tiny per-bar SVG (pure
  // shapes, no text) still gets CSP-safe proportional heights without
  // inline style="", but the count/day labels now size the same predictable
  // way as every other piece of text on the page.
  function weeklyActivityChart(days) {
    var max = Math.max(1, Math.max.apply(null, days.map(function (d) { return d.count; })));
    var cols = days.map(function (d) {
      var barH = d.count ? Math.max(6, Math.round((d.count / max) * 100)) : 3;
      var barCls = d.count ? "fc-week-bar" : "fc-week-bar fc-week-bar-empty";
      return '<div class="fc-week-col">' +
        '<span class="fc-week-count">' + d.count + "</span>" +
        '<svg viewBox="0 0 10 100" preserveAspectRatio="none" class="fc-week-barsvg" aria-hidden="true">' +
        '<rect class="' + barCls + '" x="0" y="' + (100 - barH) + '" width="10" height="' + barH + '"></rect></svg>' +
        '<span class="fc-week-label">' + esc(d.label) + "</span></div>";
    }).join("");
    return '<div class="fc-week-chart" role="img" aria-label="Reviews per day over the last 7 days">' + cols + "</div>";
  }

  function startSession() {
    session = { queue: buildQueue(new Date()), index: 0, checked: false, preview: null, correct: null, reviewedCount: 0 };
    render();
  }
  // Practice one word now (from "Recent mistakes") -- all of its active cards,
  // regardless of whether they're due yet.
  function startSessionForVocab(vocabId) {
    var ids = studyableCards().filter(function (c) { return c.vocabId === vocabId; }).map(function (c) { return c.id; });
    if (!ids.length) return;
    activeTab = "dashboard";
    session = { queue: shuffle(ids), index: 0, checked: false, preview: null, correct: null, reviewedCount: 0 };
    render();
  }
  // Extracted so the keyboard shortcut and the form's own submit both check
  // through one path. Never rates -- only reveals the answer + rating buttons.
  function submitCheck() {
    if (!session || session.checked) return;
    var card = getCache().cards[session.queue[session.index]];
    var entry = card && getVocabIndex()[card.vocabId];
    var input = document.getElementById("fcAnswerInput");
    if (!card || !entry || !input) return;
    session.userAnswer = input.value;
    session.correct = checkAnswer(entry, card.direction, input.value);
    session.checked = true;
    session.preview = previewRatings(getScheduler(getCache().settings), card, new Date());
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
      '<form class="fc-answer-form" id="fcAnswerForm"><input id="fcAnswerInput" type="text" autocomplete="off" placeholder="' + esc(answerPlaceholderFor(card.direction)) + '" ' + (session.checked ? "disabled" : "autofocus") + '>' +
      (session.checked ? "" : '<button type="submit" class="fc-btn fc-btn-primary">Check</button>') +
      "</form>";

    if (session.checked) {
      html += '<div class="fc-result ' + (session.correct ? "fc-correct" : "fc-incorrect") + '">' +
        (session.correct ? "Correct" : "Not quite") +
        (session.correct ? "" : '<span class="fc-your-answer">You typed: ' + esc(session.userAnswer || "(nothing)") + "</span>") +
        '<span class="fc-expected">Answer: ' + esc(expectedDisplayFor(entry, card.direction)) + "</span></div>" +
        '<div class="fc-rating-row">' + RATING_NAMES.map(function (name, i) {
          var p = session.preview[name];
          return '<button type="button" class="fc-rating-btn" data-rating="' + name.toLowerCase() + '"><span class="fc-rating-key">' + (i + 1) + '</span><span class="fc-rating-name">' + name + '</span><span class="fc-rating-interval">' + p.intervalLabel + "</span></button>";
        }).join("") + "</div>";
    }
    html += "</div>";
    panel.innerHTML = html;

    var input = document.getElementById("fcAnswerInput");
    if (input && !session.checked) input.focus();
    var form = document.getElementById("fcAnswerForm");
    if (form) form.addEventListener("submit", function (event) {
      event.preventDefault();
      submitCheck();
    });
    panel.querySelectorAll(".fc-rating-btn").forEach(function (btn) {
      btn.addEventListener("click", function () { rate(btn.dataset.rating); });
    });
  }

  // Rating immediately commits the review and advances to the next card --
  // no separate "next review" confirmation screen to click through. The
  // interval each rating will produce is already shown on its own button
  // (from previewRatings, before you pick), so nothing is lost by not
  // pausing here -- and the whole session can run keyboard-only: type,
  // Enter to check, 1-4 to rate and move on, repeat.
  function rate(ratingKey) {
    var ratingName = ratingKey.charAt(0).toUpperCase() + ratingKey.slice(1);
    var ratingNum = RATING_NAMES.indexOf(ratingName) + 1; // Again = 1 … Easy = 4
    var cardId = session.queue[session.index];
    var c = getCache();
    var card = c.cards[cardId];
    var scheduler = getScheduler(c.settings);
    var now = new Date();
    var base = fsrsRowFields(card);
    var baseReps = card.reps; // captured before mutation -- the sync guard's version number
    var result = applyRating(scheduler, base, now, ratingName);
    Object.assign(card, result.card);
    if (isGuestMode()) {
      // No server -- keep a capped local history. Beyond the day (for the
      // weekly chart) each entry carries what the Dashboard's mistake
      // insights need: which word, the rating, and whether the typed answer
      // was wrong (rating "Again" or a failed check both count as a miss).
      c.reviewLogs.push({
        date: localDateStr(now), ts: now.getTime(), vocabId: card.vocabId,
        rating: ratingNum, wrong: ratingNum === 1 || session.correct === false
      });
      if (c.reviewLogs.length > 1000) c.reviewLogs = c.reviewLogs.slice(-1000);
    } else {
      c.logsOutbox.push({
        clientReviewId: uuid(), cardId: cardId, baseCard: { reps: baseReps },
        resultCard: result.card, logFields: result.log
      });
    }
    recordStudyActivity(now);
    saveCache();
    if (!isGuestMode()) syncOutbox();
    // This review changed today's counts -- drop the cached weekly chart and
    // mistake insights so the Dashboard recomputes them on the next visit.
    weeklyActivity = null;
    invalidateInsights();
    session.reviewedCount++;
    session.index++;
    session.checked = false;
    session.userAnswer = "";
    render();
  }

  // Review keyboard shortcuts. Space / Enter check the answer (Space is left
  // alone while the answer field is focused so it can still be typed into
  // answers like "hot water"); once checked, only 1-4 rate. Nothing here can
  // pick a rating before the answer has been checked, or skip the check.
  document.addEventListener("keydown", function (event) {
    if (!session || document.body.dataset.activePage !== "flashcards") return;
    var isSubmitKey = event.key === "Enter" || event.key === " ";

    var backBtn = document.getElementById("fcBackToDashboard");
    if (backBtn) { // session-complete screen
      if (isSubmitKey) { event.preventDefault(); backBtn.click(); }
      return;
    }
    var typing = document.activeElement === document.getElementById("fcAnswerInput");
    if (!session.checked) {
      if (isSubmitKey && !typing) { event.preventDefault(); submitCheck(); }
      return;
    }
    var idx = ["1", "2", "3", "4"].indexOf(event.key);
    if (idx === -1) return;
    event.preventDefault();
    var btn = document.querySelector('.fc-rating-btn[data-rating="' + RATING_NAMES[idx].toLowerCase() + '"]');
    if (btn) btn.click();
  });

  // Practice a word straight from the Dashboard's "Recent mistakes" list.
  document.addEventListener("click", function (event) {
    var btn = event.target.closest && event.target.closest("[data-review-vocab]");
    if (!btn) return;
    startSessionForVocab(btn.dataset.reviewVocab);
  });

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
  // hidden/shown by class -- see js/app.js) so a bulk table-add here matches
  // the same one on the vocabulary page exactly, regardless of which page
  // happens to be open right now.
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
        html += '<details open class="fc-manage-group"><summary class="fc-manage-group-title">' + window.categoryHeaderHtml(cat, totalInCategory) + "</summary>";
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
            '<span class="fc-manage-table-title">' + esc(table.title) + '</span>' +
            '<span class="fc-manage-table-progress">' + addedCount + " / " + table.ids.length + " added</span>";
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
      btn.addEventListener("click", function () { manageFilter = btn.dataset.filter; render(); });
    });
    bindManageActionButtons(panel);
    panel.querySelectorAll("[data-table-action]").forEach(function (btn) {
      btn.addEventListener("click", function () { runTableAction(btn.dataset.tableAction, btn.dataset.tableId, btn); });
    });
    panel.querySelectorAll(".fc-manage-table-toggle").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var id = btn.dataset.tableId;
        manageExpandedTables[id] = !manageExpandedTables[id];
        render();
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
      render();
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
      render();
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
      render();
    });
    document.getElementById("fcSaveFsrs").addEventListener("click", async function () {
      var patch = {
        fsrs_request_retention: Math.min(0.99, Math.max(0.7, Number(document.getElementById("fcRetention").value) / 100)),
        fsrs_maximum_interval: Math.max(1, Number(document.getElementById("fcMaxInterval").value)),
        fsrs_enable_fuzz: document.getElementById("fcFuzz").checked
      };
      try { await saveFsrsSettings(patch); } catch (e) { reportSettingsError(e); }
      render();
    });
    document.getElementById("fcSaveQueue").addEventListener("click", async function () {
      var patch = { queue_new_cards_per_day: Math.max(0, Number(document.getElementById("fcNewPerDay").value)) };
      try { await saveQueueSettings(patch); } catch (e) { reportSettingsError(e); }
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
      btn.title = added ? "Pause (keeps its progress — add it back anytime)" : "Add to flashcards";
      btn.setAttribute("aria-label", btn.title);
    });
  }
  document.addEventListener("click", function (event) {
    var btn = event.target.closest && event.target.closest(".fc-toggle-btn");
    if (!btn) return;
    event.stopPropagation();
    if (!hasActiveSession()) {
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
    if (!hasActiveSession()) {
      if (window.showFlashcardsPage) window.showFlashcardsPage();
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
      if (activeTab === "dashboard" || activeTab === "manage") render();
      btn.textContent = "Added " + vocabIds.length + " word" + (vocabIds.length === 1 ? "" : "s");
      setTimeout(function () { btn.textContent = originalText; btn.disabled = false; }, 2000);
    } catch (e) {
      btn.textContent = originalText;
      btn.disabled = false;
      window.alert("Couldn't add this table to flashcards — " + (e.message || "check your connection and try again."));
    }
  });

  onAuthChange(function () { invalidateInsights(); render(); refreshRowToggleButtons(); });

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
