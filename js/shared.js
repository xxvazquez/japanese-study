// Helpers shared across more than one feature, published as RaumeStudy.shared.
// Deliberately tiny -- formatting that belongs to a single feature stays with
// that feature. See the load-order comment in index.html.
window.RaumeStudy = window.RaumeStudy || {};
window.RaumeStudy.shared = (function () {
  "use strict";

  // Escape text for safe interpolation into an HTML string (the vocab and
  // flashcards renderers both build markup as strings).
  function escapeHtml(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }

  // Spoken pronunciation via the browser's own Web Speech API -- no audio
  // files, no server, nothing to precache. Read live off window.speechSynthesis
  // on every call rather than caching it once, so a page that gains the API
  // later (or a test that stubs it in) is picked up without a reload.
  var speech = (function () {
    function getVoices() {
      return window.speechSynthesis ? window.speechSynthesis.getVoices() : [];
    }
    function findJapaneseVoice() {
      var voices = getVoices();
      for (var i = 0; i < voices.length; i++) {
        if (/^ja/i.test(voices[i].lang)) return voices[i];
      }
      return null;
    }
    function hasJapaneseVoice() { return !!findJapaneseVoice(); }
    // getVoices() is empty until the browser populates its voice list --
    // synchronous on some browsers, only ready after the async "voiceschanged"
    // event on others (notably Chrome). callback fires once a Japanese voice
    // is actually confirmed present, and never otherwise -- a caller uses this
    // to reveal a play control rather than show one that would silently do
    // nothing, or speak in the wrong voice, on a device with no ja voice.
    function onJapaneseVoiceReady(callback) {
      var synth = window.speechSynthesis;
      if (!synth) return;
      if (hasJapaneseVoice()) { callback(); return; }
      var fired = false;
      synth.addEventListener("voiceschanged", function handler() {
        if (fired || !hasJapaneseVoice()) return;
        fired = true;
        synth.removeEventListener("voiceschanged", handler);
        callback();
      });
    }
    function speak(text) {
      var synth = window.speechSynthesis;
      if (!synth || !text || typeof SpeechSynthesisUtterance === "undefined") return;
      synth.cancel(); // a second click shouldn't queue up behind the first
      var utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = "ja-JP";
      var voice = findJapaneseVoice();
      if (voice) utterance.voice = voice;
      synth.speak(utterance);
    }
    return { hasJapaneseVoice: hasJapaneseVoice, onJapaneseVoiceReady: onJapaneseVoiceReady, speak: speak };
  })();
  // Runs once at load: as soon as a Japanese voice is confirmed available,
  // mark it on the document so css/site.css can reveal every speaker button
  // at once -- one check governs the whole app instead of each button
  // re-deriving the same answer.
  speech.onJapaneseVoiceReady(function () {
    document.body.classList.add("ja-voice-ready");
  });

  return { escapeHtml: escapeHtml, speech: speech };
})();
