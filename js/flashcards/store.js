// Flashcards -- state & storage (SakuraStudy.flashcards.store).
//
// The versioned, validated, disposable local cache plus the guest-vs-signed-in
// mode preference. In guest mode this cache *is* the record (its own
// localStorage key); signed in it is only a read-through copy of Supabase plus
// an offline outbox. Also holds the small shared vocabulary of the feature
// (direction ids/labels, rating names) and two persistence helpers (uuid,
// localDateStr). See the load-order comment in index.html.
window.SakuraStudy = window.SakuraStudy || {};
window.SakuraStudy.flashcards = window.SakuraStudy.flashcards || {};
window.SakuraStudy.flashcards.store = (function () {
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

  // Two ways to use Flashcards: signed in (Supabase is authoritative) or
  // entirely on-device ("guest" mode -- localStorage only, no account, no
  // network, nothing to set up). Guest mode is a stored preference, not a
  // session -- it's guest mode whenever there's no active Supabase session and
  // the user has previously chosen it. The active session is pushed in here by
  // the auth layer (data-ops) via setSession().
  //
  // inMemoryMode is a same-pageview fallback for when localStorage itself
  // is unavailable (private browsing in some browsers throws on any access,
  // rather than just declining to persist) -- without it, choosing "guest
  // mode" would silently fail to take effect at all rather than just fail
  // to be *remembered* next visit.
  var inMemoryMode = null;
  var currentSession = null;
  function setSession(session) { currentSession = session; }
  function getStoredMode() {
    try { return localStorage.getItem(MODE_KEY); } catch (e) { return inMemoryMode; }
  }
  function setStoredMode(m) {
    inMemoryMode = m;
    try { if (m) localStorage.setItem(MODE_KEY, m); else localStorage.removeItem(MODE_KEY); } catch (e) {}
  }
  function isGuestMode() { return !currentSession && getStoredMode() === "guest"; }
  function hasActiveSession() { return isGuestMode() || !!currentSession; }

  function uuid() {
    if (window.crypto && window.crypto.randomUUID) return window.crypto.randomUUID();
    return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function (c) {
      var r = (Math.random() * 16) | 0, v = c === "x" ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  }

  function localDateStr(d) {
    return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
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

  return {
    DIRECTIONS: DIRECTIONS, DIRECTION_LABEL: DIRECTION_LABEL, RATING_NAMES: RATING_NAMES,
    CACHE_SCHEMA_VERSION: CACHE_SCHEMA_VERSION,
    getStoredMode: getStoredMode, setStoredMode: setStoredMode,
    setSession: setSession, isGuestMode: isGuestMode, hasActiveSession: hasActiveSession,
    uuid: uuid, localDateStr: localDateStr,
    loadCache: loadCache, saveCache: saveCache, getCache: getCache, resetCacheForUser: resetCacheForUser
  };
})();
