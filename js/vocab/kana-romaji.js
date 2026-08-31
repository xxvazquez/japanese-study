// Kana -> romaji, for the interactive reading layer: hover (or tap) a kana
// unit to see its romaji, small and directly above, without permanently
// showing it. Currently katakana only.
//
// Not a general transliterator -- it covers the katakana that turns up in the
// vocabulary: the gojuon, yoon combos (キャ->kya, ジャ->ja), the common
// foreign-sound combos (ファ->fa, チェ->che), the long-vowel mark ー (macron,
// to match the romaji style already in the data), and the sokuon ッ (doubles
// the next consonant). It tokenises into display units so each hover target
// maps to exactly one romaji chunk (ケ->ke, チャ->cha, ネー->ne with a macron).
window.SakuraStudy = window.SakuraStudy || {};
window.SakuraStudy.kanaRomaji = (function () {
  "use strict";

  // Single katakana -> romaji (small ャュョ / ッ / ー handled specially below).
  var K = {
    "ア": "a", "イ": "i", "ウ": "u", "エ": "e", "オ": "o",
    "カ": "ka", "キ": "ki", "ク": "ku", "ケ": "ke", "コ": "ko",
    "ガ": "ga", "ギ": "gi", "グ": "gu", "ゲ": "ge", "ゴ": "go",
    "サ": "sa", "シ": "shi", "ス": "su", "セ": "se", "ソ": "so",
    "ザ": "za", "ジ": "ji", "ズ": "zu", "ゼ": "ze", "ゾ": "zo",
    "タ": "ta", "チ": "chi", "ツ": "tsu", "テ": "te", "ト": "to",
    "ダ": "da", "ヂ": "ji", "ヅ": "zu", "デ": "de", "ド": "do",
    "ナ": "na", "ニ": "ni", "ヌ": "nu", "ネ": "ne", "ノ": "no",
    "ハ": "ha", "ヒ": "hi", "フ": "fu", "ヘ": "he", "ホ": "ho",
    "バ": "ba", "ビ": "bi", "ブ": "bu", "ベ": "be", "ボ": "bo",
    "パ": "pa", "ピ": "pi", "プ": "pu", "ペ": "pe", "ポ": "po",
    "マ": "ma", "ミ": "mi", "ム": "mu", "メ": "me", "モ": "mo",
    "ヤ": "ya", "ユ": "yu", "ヨ": "yo",
    "ラ": "ra", "リ": "ri", "ル": "ru", "レ": "re", "ロ": "ro",
    "ワ": "wa", "ヰ": "wi", "ヱ": "we", "ヲ": "o", "ン": "n", "ヴ": "vu",
    "ァ": "a", "ィ": "i", "ゥ": "u", "ェ": "e", "ォ": "o",
    "ャ": "ya", "ュ": "yu", "ョ": "yo", "ヮ": "wa"
  };

  // Consonant onset for yoon (base kana + small ヤ/ユ/ヨ).
  var YOON = {
    "キ": "k", "ギ": "g", "シ": "sh", "ジ": "j", "チ": "ch", "ヂ": "j",
    "ニ": "n", "ヒ": "h", "ビ": "b", "ピ": "p", "ミ": "m", "リ": "r"
  };
  var SMALL_Y = { "ャ": "a", "ュ": "u", "ョ": "o" };

  // Two-kana foreign-sound combos (base + small vowel/glide).
  var COMBO = {
    "ウィ": "wi", "ウェ": "we", "ウォ": "wo", "イェ": "ye",
    "ヴァ": "va", "ヴィ": "vi", "ヴェ": "ve", "ヴォ": "vo", "ヴュ": "vyu",
    "ファ": "fa", "フィ": "fi", "フェ": "fe", "フォ": "fo", "フュ": "fyu",
    "ティ": "ti", "トゥ": "tu", "テュ": "tyu",
    "ディ": "di", "ドゥ": "du", "デュ": "dyu",
    "シェ": "she", "ジェ": "je", "チェ": "che",
    "ツァ": "tsa", "ツィ": "tsi", "ツェ": "tse", "ツォ": "tso",
    "クァ": "kwa", "グァ": "gwa"
  };

  var MACRON = { a: "ā", i: "ī", u: "ū", e: "ē", o: "ō" };

  // Katakana block + the prolonged-sound mark ー.
  function isKatakana(ch) { return /[ァ-ヺー]/.test(ch); }

  // A run of katakana -> [{ kana, romaji }] display units.
  function tokenize(str) {
    var units = [], i = 0, geminate = false;
    while (i < str.length) {
      var c1 = str[i], c2 = str[i + 1], kana, romaji;

      if (c1 === "ッ") { geminate = true; i += 1; continue; } // ッ

      if (c2 && COMBO[c1 + c2]) {
        kana = c1 + c2; romaji = COMBO[c1 + c2]; i += 2;
      } else if (c2 && YOON[c1] && SMALL_Y[c2]) {
        var base = YOON[c1];
        kana = c1 + c2;
        romaji = (base === "sh" || base === "ch" || base === "j")
          ? base + SMALL_Y[c2]                 // sha / shu / sho, cha..., ja...
          : base + "y" + SMALL_Y[c2];          // kya / gyu / ...
        i += 2;
      } else if (K[c1] != null) {
        kana = c1; romaji = K[c1]; i += 1;
      } else {                                 // not katakana we know -> passthrough
        if (geminate) { units.push({ kana: "ッ", romaji: "" }); geminate = false; }
        units.push({ kana: c1, romaji: c1 }); i += 1; continue;
      }

      if (geminate) {
        romaji = /^ch/.test(romaji) ? "t" + romaji : romaji.charAt(0) + romaji;
        kana = "ッ" + kana;
        geminate = false;
      }

      while (str[i] === "ー") {             // ー: lengthen the trailing vowel
        var last = romaji.charAt(romaji.length - 1);
        romaji = MACRON[last] ? romaji.slice(0, -1) + MACRON[last] : romaji + last;
        kana += "ー";
        i += 1;
      }

      units.push({ kana: kana, romaji: romaji });
    }
    if (geminate) units.push({ kana: "ッ", romaji: "" });
    return units;
  }

  function toRomaji(str) {
    return tokenize(String(str || "")).map(function (u) { return u.romaji; }).join("");
  }

  // Take raw (unescaped) text; return HTML where each katakana unit is a
  // hover/tap target carrying its romaji in data-r (shown by CSS ::after, so
  // it never lands in the DOM's textContent -- search and sort stay clean).
  // Everything else is passed through, HTML-escaped.
  function decorate(raw) {
    var esc = window.SakuraStudy.shared.escapeHtml;
    var out = "", run = "";
    function flush() {
      if (!run) return;
      tokenize(run).forEach(function (u) {
        out += u.romaji
          ? '<span class="kr" data-r="' + esc(u.romaji) + '">' + esc(u.kana) + "</span>"
          : esc(u.kana);
      });
      run = "";
    }
    for (var i = 0; i < raw.length; i++) {
      if (isKatakana(raw[i])) run += raw[i];
      else { flush(); out += esc(raw[i]); }
    }
    flush();
    return out;
  }

  return { toRomaji: toRomaji, tokenize: tokenize, decorate: decorate, isKatakana: isKatakana };
})();
