// Vocabulary page -- reading practice (SakuraStudy.readingPractice).
//
// A session-only kana -> romaji typing drill over whatever kana-only words are
// on screen (the active section, or the current search results). No cards, no
// scheduling, no storage -- the reference-side counterpart to Flashcards'
// jp->ro direction, aimed squarely at cementing kana reading. Loaded after
// js/flashcards/vocab-index.js because it reuses that index's plain Japanese
// and normalized answers plus the kana->romaji converter; it deliberately
// touches nothing else in the flashcards stack.
window.SakuraStudy = window.SakuraStudy || {};
window.SakuraStudy.readingPractice = (function () {
  "use strict";

  var esc = window.SakuraStudy.shared.escapeHtml;
  function kr() { return window.SakuraStudy.kanaRomaji; }
  function vidx() { return window.SakuraStudy.flashcards && window.SakuraStudy.flashcards.vocabIndex; }

  function isAllKana(s) {
    var k = kr();
    if (!s || !k) return false;
    for (var i = 0; i < s.length; i++) if (!k.isKana(s[i])) return false;
    return true;
  }

  // Every romaji spelling accepted for one kana word: the reading derived
  // straight from its kana, plus the dataset's own romaji field -- both run
  // through the same lenient normaliser Flashcards uses (macron- and
  // long-vowel-insensitive), so "koohii" / "kouhii" / "kohi" all pass for コーヒー.
  function expectedAnswers(entry) {
    var v = vidx(), set = Object.create(null);
    (entry.romajiAnswers || []).forEach(function (a) { if (a) set[a] = true; });
    var derived = v.normalizeAnswer(kr().toRomaji(entry.jpPlain), true);
    if (derived) set[derived] = true;
    return Object.keys(set);
  }
  function checkReading(answers, input) {
    return answers.indexOf(vidx().normalizeAnswer(input, true)) !== -1;
  }

  // The kana words currently on screen: rows in a visible section (section
  // routing and search both narrow this), skipping hidden rows and anything
  // whose headword isn't pure kana. De-duped by permanent vocab id.
  function collectPool() {
    var v = vidx();
    if (!v) return [];
    var index = v.getVocabIndex(), seen = Object.create(null), out = [];
    document.querySelectorAll('#vocabulary .table-section:not(.page-hidden):not(.search-hidden) tbody tr:not(.row-hidden):not(.search-hidden)').forEach(function (tr) {
      var id = tr.dataset.vocabId;
      if (!id || seen[id]) return;
      var entry = index[id];
      if (!entry || !isAllKana(entry.jpPlain)) return;
      seen[id] = true;
      out.push({
        jp: entry.jpPlain,
        answers: expectedAnswers(entry),
        reading: entry.romajiUsable ? entry.romajiDisplay : kr().toRomaji(entry.jpPlain)
      });
    });
    return out;
  }

  function shuffle(a) {
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1)), t = a[i];
      a[i] = a[j]; a[j] = t;
    }
    return a;
  }

  var session = null;
  function host() { return document.getElementById("readingPracticeView"); }
  function active() { return document.body.classList.contains("reading-practice-mode"); }

  function start() {
    var vocab = window.SakuraStudy.vocab;
    if (vocab && vocab.exitStarred) vocab.exitStarred();
    session = { pool: shuffle(collectPool()), i: 0, phase: "ask", answer: "", correct: 0 };
    document.body.classList.add("reading-practice-mode");
    var h = host();
    if (h) h.hidden = false;
    syncToggle();
    render();
    window.scrollTo({ top: 0 });
  }
  function exit() {
    if (!active()) return;
    session = null;
    document.body.classList.remove("reading-practice-mode");
    var h = host();
    if (h) { h.hidden = true; h.innerHTML = ""; }
    syncToggle();
  }

  function syncToggle() {
    var btn = document.getElementById("readingToggle");
    if (!btn) return;
    btn.classList.toggle("active", active());
    btn.setAttribute("aria-pressed", String(active()));
  }

  function render() {
    var h = host();
    if (!h || !session) return;
    if (!session.pool.length) {
      h.innerHTML = '<div class="rp-card rp-message">' +
        '<p>No kana-only words are in view right now.</p>' +
        '<p class="rp-message-hint">Open a vocabulary section (or search for some words), then start again.</p>' +
        '<div class="rp-actions"><button type="button" class="rp-btn" data-rp="done">Done</button></div></div>';
      return;
    }
    if (session.i >= session.pool.length) { renderSummary(h); return; }

    var card = session.pool[session.i];
    var checked = session.phase === "checked";
    var ok = checked && checkReading(card.answers, session.answer);
    var out = '<div class="rp-card">' +
      '<div class="rp-meta"><span>' + (session.i + 1) + ' / ' + session.pool.length + '</span>' +
      '<button type="button" class="rp-exit" data-rp="done">End</button></div>' +
      '<div class="rp-prompt-label">Type the romaji reading</div>' +
      '<p class="rp-word" lang="ja">' + esc(card.jp) + '</p>' +
      '<form class="rp-form" id="rpForm">' +
      '<input id="rpInput" type="text" autocomplete="off" autocapitalize="off" autocorrect="off" spellcheck="false" ' +
      'placeholder="Romaji…" aria-label="Romaji reading"' + (checked ? " readonly" : "") + ' value="' + esc(session.answer) + '">' +
      '<button type="submit" class="rp-btn rp-btn-primary">' + (checked ? "Next" : "Check") + "</button>" +
      "</form>";
    if (checked) {
      out += '<div class="rp-result ' + (ok ? "rp-correct" : "rp-incorrect") + '">' +
        '<span class="rp-result-label">' + (ok ? "Correct" : "Not quite") + "</span>" +
        (ok ? "" : '<span class="rp-your">you typed “' + esc(session.answer || "—") + "”</span>") + "</div>";
      if (!ok) out += '<div class="rp-reveal"><span class="rp-reveal-label">Reading</span>' +
        '<span class="rp-expected">' + esc(card.reading) + "</span></div>";
    }
    out += "</div>";
    h.innerHTML = out;
    var input = document.getElementById("rpInput");
    if (input && !checked) input.focus();
  }

  function renderSummary(h) {
    h.innerHTML = '<div class="rp-card rp-message">' +
      '<p class="rp-summary">You read <strong>' + session.correct + "</strong> of <strong>" + session.pool.length + "</strong>.</p>" +
      '<div class="rp-actions">' +
      '<button type="button" class="rp-btn rp-btn-primary" data-rp="again">Practice again</button>' +
      '<button type="button" class="rp-btn" data-rp="done">Done</button></div></div>';
  }

  function submit() {
    if (!session) return;
    var card = session.pool[session.i];
    if (!card) return;
    if (session.phase === "ask") {
      var input = document.getElementById("rpInput");
      session.answer = input ? input.value : "";
      if (!session.answer.trim()) { if (input) input.focus(); return; }
      if (checkReading(card.answers, session.answer)) session.correct++;
      session.phase = "checked";
    } else {
      session.i++;
      session.phase = "ask";
      session.answer = "";
    }
    render();
  }

  document.addEventListener("DOMContentLoaded", function () {
    var btn = document.getElementById("readingToggle");
    if (btn) btn.addEventListener("click", function () { active() ? exit() : start(); });

    var h = host();
    if (h) {
      h.addEventListener("submit", function (e) {
        if (e.target && e.target.id === "rpForm") { e.preventDefault(); submit(); }
      });
      h.addEventListener("click", function (e) {
        var el = e.target.closest && e.target.closest("[data-rp]");
        if (!el) return;
        if (el.dataset.rp === "again") start();
        else exit();
      });
    }
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && active()) exit();
    });
  });

  // Section navigation / search drop the drill the same way they drop the
  // collected Starred view -- it's a transient overlay on the reference, not a
  // place you route to. js/vocab/interactions.js calls this next to its own
  // exitStarred() at each of those choke points.
  if (window.SakuraStudy.vocab) window.SakuraStudy.vocab.exitReadingPractice = exit;

  return {
    collectPool: collectPool, expectedAnswers: expectedAnswers,
    checkReading: checkReading, isAllKana: isAllKana, start: start, exit: exit
  };
})();
