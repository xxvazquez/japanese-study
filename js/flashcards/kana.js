// Flashcards -- the Kana tab (SakuraStudy.flashcards.kana).
//
// A hiragana / katakana reading trainer that sits alongside the vocabulary
// flashcards: pick which kana groups to drill (gojuon, dakuten, combos, per
// script -- see kana-data.js), then review them one glyph at a time, typing
// the romaji. Every kana + direction is its own FSRS-6 card, scheduled with
// the same vendored scheduler the vocabulary cards use.
//
// Storage, for now, is local only: a single localStorage key, independent of
// the vocab flashcards cache and of guest-vs-signed-in mode. Syncing kana
// progress through Supabase (its own table) is a later step; until then this
// key is shared by whoever uses the browser.
//
// Direction: kana -> type romaji only, for now. The reverse (romaji -> recall
// the kana, flip-and-rate) is a later step.
window.SakuraStudy = window.SakuraStudy || {};
window.SakuraStudy.flashcards = window.SakuraStudy.flashcards || {};
window.SakuraStudy.flashcards.kana = (function () {
  "use strict";

  var S = window.SakuraStudy.flashcards;
  var kanaData = S.kanaData;
  var sched = S.scheduling;
  var store = S.store;
  var vidx = S.vocabIndex;
  var esc = window.SakuraStudy.shared.escapeHtml;

  var getScheduler = sched.getScheduler, previewRatings = sched.previewRatings;
  var applyRating = sched.applyRating, shuffle = sched.shuffle;
  var RATING_NAMES = store.RATING_NAMES, localDateStr = store.localDateStr;

  // FSRS knobs -- the library defaults, same as a fresh vocab-flashcards
  // account. Not user-tunable here (yet); kept as a plain object so the
  // shared scheduler wrapper can read it.
  var FSRS_SETTINGS = { fsrs_request_retention: 0.9, fsrs_maximum_interval: 36500, fsrs_enable_fuzz: false };
  var NEW_PER_DAY = 15;
  var LEARN_AHEAD_MS = 20 * 60 * 1000; // match scheduling.js: a short learning step counts as ready
  var DIRECTION = "k2r"; // kana -> romaji (the only direction for now)

  // -----------------------------------------------------------------------
  // Local store -- own key, own tiny shape. try/catch + a same-pageview
  // in-memory fallback, exactly like js/flashcards/store.js does for its
  // cache (private-mode browsers throw on any localStorage access).
  // -----------------------------------------------------------------------
  var KEY = "sakura-kana-v1";
  var mem = null;
  function fresh() { return { v: 1, groups: kanaData.DEFAULT_GROUPS.slice(), cards: {}, day: null }; }
  function sanitize(raw) {
    if (!raw || typeof raw !== "object" || !raw.cards || typeof raw.cards !== "object") return null;
    var groups = Array.isArray(raw.groups) ? raw.groups.filter(kanaData.isGroupId) : kanaData.DEFAULT_GROUPS.slice();
    var day = raw.day && typeof raw.day.date === "string" ? { date: raw.day.date, count: raw.day.count | 0 } : null;
    return { v: 1, groups: groups, cards: raw.cards, day: day };
  }
  function load() {
    if (mem) return mem;
    try {
      var raw = window.localStorage && localStorage.getItem(KEY);
      mem = (raw && sanitize(JSON.parse(raw))) || fresh();
    } catch (e) {
      mem = fresh();
    }
    return mem;
  }
  function save(s) {
    mem = s;
    try { localStorage.setItem(KEY, JSON.stringify(s)); } catch (e) {}
  }

  function cardKey(item) { return item.id + "|" + DIRECTION; }
  function newCard(now) {
    return {
      state: 0, due: now.toISOString(), stability: 0, difficulty: 0,
      scheduled_days: 0, reps: 0, lapses: 0, learning_steps: 0, last_review: null
    };
  }
  function todayNew(s, now) {
    return s.day && s.day.date === localDateStr(now) ? s.day.count : 0;
  }
  function bumpNew(s, now) {
    var today = localDateStr(now);
    if (!s.day || s.day.date !== today) s.day = { date: today, count: 0 };
    s.day.count++;
  }

  // -----------------------------------------------------------------------
  // Groups + queue
  // -----------------------------------------------------------------------
  function selectedGroupIds() { return load().groups.slice(); }
  function setGroup(id, on) {
    if (!kanaData.isGroupId(id)) return;
    var s = load();
    var i = s.groups.indexOf(id);
    if (on && i === -1) s.groups.push(id);
    else if (!on && i !== -1) s.groups.splice(i, 1);
    save(s);
  }
  function selectedItems() { return kanaData.itemsFor(selectedGroupIds()); }

  function dueState(card, now) {
    var ahead = (card.state === 1 || card.state === 3) ? LEARN_AHEAD_MS : 0;
    return new Date(card.due).getTime() <= now.getTime() + ahead;
  }
  // The queue: every selected kana whose card is due (learning steps count a
  // short way ahead, like the vocab queue), plus that day's remaining new
  // allowance, shuffled together.
  function buildQueue(now) {
    var s = load(), items = selectedItems();
    var due = [], unseen = [];
    items.forEach(function (it) {
      var c = s.cards[cardKey(it)];
      if (!c) unseen.push(it);
      else if (dueState(c, now)) due.push(it);
    });
    var allowance = Math.max(0, NEW_PER_DAY - todayNew(s, now));
    return shuffle(due.concat(shuffle(unseen.slice()).slice(0, allowance)));
  }
  // For the overview summary line.
  function progress(now) {
    var s = load(), items = selectedItems();
    var started = 0, dueNow = 0;
    items.forEach(function (it) {
      var c = s.cards[cardKey(it)];
      if (!c) return;
      started++;
      if (dueState(c, now)) dueNow++;
    });
    return { total: items.length, started: started, due: dueNow, unseen: items.length - started };
  }

  // -----------------------------------------------------------------------
  // Review session
  // -----------------------------------------------------------------------
  var session = null;
  function rerender() { S.render(); }
  function clearSession() { session = null; }

  function startSession() {
    var queue = buildQueue(new Date());
    session = { queue: queue, index: 0, checked: false, correct: null, userAnswer: "", preview: null, reviewedCount: 0, correctCount: 0, seen: {}, done: false };
    rerender();
  }
  function endSession() {
    if (!session) return;
    if (!session.reviewedCount) { session = null; rerender(); return; }
    session.done = true;
    rerender();
  }

  function normalize(v) { return vidx.normalizeAnswer(v, true); }
  function checkKana(item, input) {
    var n = normalize(input);
    return item.answers.some(function (a) { return normalize(a) === n; });
  }

  function submitCheck() {
    if (!session || session.checked) return;
    var item = session.queue[session.index];
    var input = document.getElementById("fcKanaInput");
    if (!item || !input) return;
    session.userAnswer = input.value;
    session.correct = checkKana(item, input.value);
    session.checked = true;
    var base = load().cards[cardKey(item)] || newCard(new Date());
    session.preview = previewRatings(getScheduler(FSRS_SETTINGS), base, new Date());
    rerender();
  }

  // Rating commits the review and moves straight on -- no separate "next"
  // step, same as the vocabulary review flow. `ratingKey` is the lowercase
  // data-rating ("again" … "easy").
  function rate(ratingKey) {
    if (!session || !session.checked) return;
    var ratingName = ratingKey.charAt(0).toUpperCase() + ratingKey.slice(1);
    if (RATING_NAMES.indexOf(ratingName) === -1) return;
    var item = session.queue[session.index];
    if (!item) return;
    var now = new Date();
    var s = load();
    var key = cardKey(item);
    var isNew = !s.cards[key];
    var base = s.cards[key] || newCard(now);
    var res = applyRating(getScheduler(FSRS_SETTINGS), base, now, ratingName);
    s.cards[key] = res.card;
    if (isNew) bumpNew(s, now);
    save(s);
    session.reviewedCount++;
    if (session.correct === true) session.correctCount++;
    session.seen[key] = true;
    session.index++;
    session.checked = false;
    session.correct = null;
    session.userAnswer = "";
    session.preview = null;
    rerender();
  }

  // -----------------------------------------------------------------------
  // Rendering
  // -----------------------------------------------------------------------
  function renderKana(panel) {
    if (!panel) return;
    if (session && (session.done || session.index >= session.queue.length)) renderDone(panel);
    else if (session) renderReview(panel);
    else renderOverview(panel);
  }

  function groupCheckbox(g, on) {
    return '<label class="fc-kana-group"><input type="checkbox" class="fc-kana-group-cb" data-group="' + g.id + '"' +
      (on ? " checked" : "") + "> " + esc(g.label) +
      ' <span class="fc-kana-group-n">' + g.count + "</span></label>";
  }
  function renderOverview(panel) {
    var selected = selectedGroupIds();
    var groups = kanaData.groups();
    var byScript = { hiragana: [], katakana: [] };
    groups.forEach(function (g) { byScript[g.script].push(g); });
    var p = progress(new Date());
    var canStudy = buildQueue(new Date()).length > 0;

    var summary = !selected.length
      ? "Choose at least one group to practise."
      : p.due + " due · " + p.started + " started · " + p.unseen + " not started";

    panel.innerHTML =
      '<p class="fc-note">Learn to read hiragana and katakana: pick the groups you want, then type each kana’s romaji. Cards are FSRS-scheduled, the same as the vocabulary flashcards. Progress is saved on this device.</p>' +
      '<div class="fc-kana-groups">' +
      ["hiragana", "katakana"].map(function (script) {
        return '<fieldset class="fc-kana-fieldset"><legend>' + (script === "hiragana" ? "Hiragana" : "Katakana") + "</legend>" +
          byScript[script].map(function (g) { return groupCheckbox(g, selected.indexOf(g.id) !== -1); }).join("") +
          "</fieldset>";
      }).join("") +
      "</div>" +
      '<p class="fc-kana-summary" id="fcKanaSummary">' + esc(summary) + "</p>" +
      '<button type="button" class="fc-btn fc-btn-primary" id="fcKanaStart"' + (canStudy ? "" : " disabled") + ">Study now</button>";

    panel.querySelectorAll(".fc-kana-group-cb").forEach(function (cb) {
      cb.addEventListener("change", function () { setGroup(cb.dataset.group, cb.checked); rerender(); });
    });
    var start = document.getElementById("fcKanaStart");
    if (start) start.addEventListener("click", startSession);
  }

  function renderReview(panel) {
    var item = session.queue[session.index];
    var html = '<div class="fc-review-card">' +
      '<div class="fc-review-meta"><span>Kana → Romaji · ' + (session.index + 1) + " / " + session.queue.length + "</span>" +
      '<button type="button" class="fc-session-exit" id="fcKanaEnd">End session</button></div>' +
      '<div class="fc-prompt-label">Type the romaji reading</div>' +
      '<div class="fc-prompt fc-prompt-kana' + (item.word ? " fc-prompt-kana-word" : "") + '" lang="ja">' + esc(item.kana) + "</div>" +
      '<form class="fc-answer-form" id="fcKanaForm"><input id="fcKanaInput" type="text" autocomplete="off" autocapitalize="off" autocorrect="off" spellcheck="false" placeholder="Romaji…" ' +
      (session.checked ? "disabled" : "autofocus") + ">" +
      (session.checked ? "" : '<button type="submit" class="fc-btn fc-btn-primary">Check</button>') +
      "</form>";

    if (session.checked) {
      html += '<div class="fc-result ' + (session.correct ? "fc-correct" : "fc-incorrect") + '">' +
        '<span class="fc-result-label">' + (session.correct ? "Correct" : "Not quite") + "</span>" +
        (session.correct ? "" : '<span class="fc-your-answer">You typed: ' + esc(session.userAnswer || "(nothing)") + "</span>") +
        "</div>" +
        '<div class="fc-answer-reveal"><span class="fc-answer-reveal-label">Answer</span>' +
        '<span class="fc-expected">' + esc(item.romaji) + "</span></div>" +
        '<div class="fc-rating-row' + (session.correct === false ? " fc-rating-row-missed" : "") + '">' +
        RATING_NAMES.map(function (name, i) {
          var pr = session.preview[name];
          return '<button type="button" class="fc-rating-btn" data-rating="' + name.toLowerCase() + '">' +
            '<span class="fc-rating-key">' + (i + 1) + '</span><span class="fc-rating-name">' + name +
            '</span><span class="fc-rating-interval">' + pr.intervalLabel + "</span></button>";
        }).join("") + "</div>";
    }
    html += "</div>";
    panel.innerHTML = html;

    var end = document.getElementById("fcKanaEnd");
    if (end) end.addEventListener("click", endSession);
    var input = document.getElementById("fcKanaInput");
    if (input && !session.checked) input.focus();
    var form = document.getElementById("fcKanaForm");
    if (form) form.addEventListener("submit", function (e) { e.preventDefault(); submitCheck(); });
    panel.querySelectorAll(".fc-rating-btn").forEach(function (btn) {
      btn.addEventListener("click", function () { rate(btn.dataset.rating); });
    });
  }

  function renderDone(panel) {
    var reviewed = session.reviewedCount, correct = session.correctCount;
    var html = '<div class="fc-session-done">';
    if (!reviewed) {
      html += '<p class="fc-session-done-title">Nothing to review right now</p>';
    } else {
      var pct = Math.round((correct / reviewed) * 100);
      html += '<p class="fc-session-done-title">' + (session.done ? "Session ended" : "Session complete") + "</p>" +
        '<p class="fc-session-done-stats">' + reviewed + " reviewed · " + correct + " correct (" + pct + "%)</p>";
    }
    var moreReady = buildQueue(new Date()).some(function (it) { return !session.seen[cardKey(it)]; });
    html += '<div class="fc-cta-row">' +
      (moreReady ? '<button type="button" class="fc-btn fc-btn-primary" id="fcKanaMore">Keep going</button>' : "") +
      '<button type="button" class="fc-btn' + (moreReady ? "" : " fc-btn-primary") + '" id="fcKanaBack">Back to groups</button>' +
      "</div></div>";
    panel.innerHTML = html;
    document.getElementById("fcKanaBack").addEventListener("click", function () { session = null; rerender(); });
    var more = document.getElementById("fcKanaMore");
    if (more) more.addEventListener("click", startSession);
  }

  // Review keyboard shortcuts, mirroring the vocabulary review flow: Enter /
  // Space check (Space passes through while the field is focused), then 1-4
  // rate. Only fires on the Kana tab with a live session.
  document.addEventListener("keydown", function (event) {
    if (!session || document.body.dataset.activePage !== "flashcards") return;
    if (S.getActiveTab && S.getActiveTab() !== "kana") return;
    var isSubmitKey = event.key === "Enter" || event.key === " ";

    var back = document.getElementById("fcKanaBack");
    if (back) { if (isSubmitKey) { event.preventDefault(); back.click(); } return; }

    var typing = document.activeElement === document.getElementById("fcKanaInput");
    if (!session.checked) {
      if (isSubmitKey && !typing) { event.preventDefault(); submitCheck(); }
      return;
    }
    var idx = ["1", "2", "3", "4"].indexOf(event.key);
    if (idx === -1) return;
    event.preventDefault();
    var btn = document.querySelector('#fcPanelKana .fc-rating-btn[data-rating="' + RATING_NAMES[idx].toLowerCase() + '"]');
    if (btn) btn.click();
  });

  return {
    renderKana: renderKana, clearSession: clearSession,
    // pure hooks for scripts/smoke-test.js
    __testHooks: { checkKana: checkKana, buildQueue: buildQueue, selectedItems: selectedItems, setGroup: setGroup }
  };
})();
