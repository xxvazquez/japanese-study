// A small curated set of monochrome line icons for the table-customisation
// picker -- stroke-based, single colour (currentColor), no fills, in the same
// spirit as the app's own inline SVGs. Paths are a hand-picked subset adapted
// from Lucide (ISC licence, see vendor/lucide.LICENSE.txt), all on a 24x24
// grid so they scale cleanly at any display size.
window.SakuraStudy = window.SakuraStudy || {};
window.SakuraStudy.icons = (function () {
  "use strict";

  // name -> inner SVG markup (paths only; the <svg> wrapper is added by render)
  var PATHS = {
    // Food & drink
    "utensils": '<path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2"/><path d="M7 2v20"/><path d="M21 15V2a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2z"/><path d="M18 15v7"/>',
    "coffee": '<path d="M17 8h1a4 4 0 1 1 0 8h-1"/><path d="M3 8h14v9a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4Z"/><line x1="6" x2="6" y1="2" y2="4"/><line x1="10" x2="10" y1="2" y2="4"/><line x1="14" x2="14" y1="2" y2="4"/>',
    "wine": '<path d="M8 22h8"/><path d="M7 10h10"/><path d="M12 15v7"/><path d="M12 15a5 5 0 0 0 5-5c0-2-.5-4-2-8H9c-1.5 4-2 6-2 8a5 5 0 0 0 5 5Z"/>',
    "cup": '<path d="M6 8h12l-1 12a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2Z"/><path d="M6 8a3 3 0 0 1 0-6h9a3 3 0 0 1 3 3v3"/><path d="M9 12h6"/>',
    "milk": '<path d="M8 2h8"/><path d="M9 2v3a4 4 0 0 1-.7 2.2l-.6 1A4 4 0 0 0 7 10.5V20a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2v-9.5a4 4 0 0 0-.7-2.3l-.6-1A4 4 0 0 1 15 5V2"/><path d="M7 15a6 6 0 0 1 5 0 6 6 0 0 0 5 0"/>',
    "apple": '<path d="M12 21c1.5 0 2.7 1 4 1 3 0 6-8 6-12a5 5 0 0 0-5-5c-2.2 0-4 1.4-5 2-1-.6-2.8-2-5-2a5 5 0 0 0-5 5c0 4 3 12 6 12 1.2 0 2.5-1 4-1Z"/><path d="M10 2c1 .5 2 2 2 5"/>',
    "carrot": '<path d="M2.3 21.7s9.9-3.5 12.7-6.4a4.5 4.5 0 0 0-6.3-6.3C5.8 11.8 2.3 21.7 2.3 21.7Z"/><path d="M8.6 14 6.6 12"/><path d="M15.3 15l-2.5-2.5"/><path d="M22 9s-1.3-2-3.5-2S15 9 15 9s1.3 2 3.5 2S22 9 22 9Z"/><path d="M15 2s-2 1.3-2 3.5S15 9 15 9s2-1.8 2-3.5C17 3.3 15 2 15 2Z"/>',
    "egg": '<path d="M12 22c5 0 8-4 8-9 0-4-3-11-8-11S4 9 4 13c0 5 3 9 8 9Z"/>',
    "fish": '<path d="M6.5 12c1-3.5 5-6 8.5-6s6 2.5 7 6c-1 3.5-3.5 6-7 6s-7.5-2.5-8.5-6Z"/><path d="M18 12v0"/><path d="M2 16c1.5-1 1.5-7 0-8 3 0 5 2 5 4s-2 4-5 4Z"/><path d="M12 6c-.3-1.4-1.3-3-2.5-4"/><path d="M9.5 22c1.2-1 2.2-2.6 2.5-4"/>',

    // Travel & places
    "plane": '<path d="M17.8 19.2 16 11l3.5-3.5C21 6 21.5 4 21 3c-1-.5-3 0-4.5 1.5L13 8 4.8 6.2c-.5-.1-.9.1-1.1.5l-.3.5c-.2.5-.1 1 .3 1.3L9 12l-2 3H4l-1 1 3 2 2 3 1-1v-3l3-2 3.5 5.3c.3.4.8.5 1.3.3l.5-.2c.4-.3.6-.7.5-1.2Z"/>',
    "train": '<path d="M8 3.1V7a4 4 0 0 0 8 0V3.1"/><path d="M9 19c-2.8 0-5-2.2-5-5v-4a8 8 0 0 1 16 0v4c0 2.8-2.2 5-5 5Z"/><path d="m8 19-2 3"/><path d="m16 19 2 3"/><path d="m9 15-1-1"/><path d="m15 15 1-1"/>',
    "bus": '<path d="M4 17h16M8 6v6m8-6v6M2 12h20"/><path d="M18 18h3s.5-1.7.8-2.8c.1-.4.2-.8.2-1.2s-.1-.8-.2-1.2L20.6 8C20 6.8 19.1 6 18 6H4a2 2 0 0 0-2 2v10h3"/><circle cx="7" cy="18" r="2"/><circle cx="16" cy="18" r="2"/><path d="M9 18h5"/>',
    "bike": '<circle cx="18.5" cy="17.5" r="3.5"/><circle cx="5.5" cy="17.5" r="3.5"/><circle cx="15" cy="5" r="1"/><path d="M12 17.5V14l-3-3 4-3 2 3h2"/>',
    "ship": '<path d="M2 21c.6.5 1.2 1 2.5 1 2.5 0 2.5-2 5-2s2.5 2 5 2 2.5-2 5-2c1.3 0 1.9.5 2.5 1"/><path d="M19.4 20A11.6 11.6 0 0 0 21 14l-8.2-3.6a2 2 0 0 0-1.6 0L3 14a11.6 11.6 0 0 0 1.6 6"/><path d="M12 10V4M12 2v2M5 13V7a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v6"/>',
    "map-pin": '<path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/>',
    "signpost": '<path d="M12 3v3M12 13v8"/><path d="M18.5 13h-13L2 9.5 5.5 6h13L22 9.5Z"/>',
    "building": '<rect width="16" height="20" x="4" y="2" rx="2"/><path d="M9 22v-4h6v4"/><path d="M8 6h.01M12 6h.01M16 6h.01M8 10h.01M12 10h.01M16 10h.01M8 14h.01M12 14h.01M16 14h.01"/>',
    "bed": '<path d="M2 4v16M2 8h18a2 2 0 0 1 2 2v10M2 17h20M6 8v9"/>',
    "door": '<path d="M13 4h3a2 2 0 0 1 2 2v14"/><path d="M2 20h3M13 20h9M10 12v.01"/><path d="M13 4.6v16.8a1 1 0 0 1-1.4.9l-4-1.8A1 1 0 0 1 7 20.6V3.4a1 1 0 0 1 .6-.9l4-1.8A1 1 0 0 1 13 1.6Z"/>',

    // Home & objects
    "shopping-cart": '<circle cx="8" cy="21" r="1"/><circle cx="19" cy="21" r="1"/><path d="M2 2h2l2.6 12.4a2 2 0 0 0 2 1.6h9.8a2 2 0 0 0 1.9-1.6L23 6H5"/>',
    "credit-card": '<rect width="20" height="14" x="2" y="5" rx="2"/><line x1="2" x2="22" y1="10" y2="10"/>',
    "gift": '<rect x="3" y="8" width="18" height="4" rx="1"/><path d="M12 8v13M19 12v7a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-7"/><path d="M7.5 8a2.5 2.5 0 0 1 0-5C11 3 12 8 12 8s1-5 4.5-5a2.5 2.5 0 0 1 0 5"/>',
    "shirt": '<path d="M20.4 3.5 16 2a4 4 0 0 1-8 0L3.6 3.5a2 2 0 0 0-1.3 2.2l.6 3.5a1 1 0 0 0 1 .8H6v10c0 1.1.9 2 2 2h8a2 2 0 0 0 2-2V10h2.1a1 1 0 0 0 1-.8l.6-3.5a2 2 0 0 0-1.3-2.2Z"/>',
    "trash": '<path d="M3 6h18M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/><line x1="10" x2="10" y1="11" y2="17"/><line x1="14" x2="14" y1="11" y2="17"/>',
    "recycle": '<path d="M7 19H4.8a1.8 1.8 0 0 1-1.6-2.7L7.2 9.5M11 19h8.2a1.8 1.8 0 0 0 1.6-2.7l-1.2-2.1"/><path d="m14 16-3 3 3 3M8.3 13.6 7.2 9.5 3.1 10.6M9.3 5.8l1.1-1.9A1.8 1.8 0 0 1 13.5 4l3.9 6.8"/><path d="m13.4 9.6 4.1 1.1 1.1-4.1"/>',
    "washer": '<rect width="18" height="20" x="3" y="2" rx="2"/><path d="M3 6h3M17 6h.01"/><circle cx="12" cy="13" r="5"/><path d="M12 18a2.5 2.5 0 0 0 0-5 2.5 2.5 0 0 1 0-5"/>',
    "lamp": '<path d="M8 2h8l4 10H4Z"/><path d="M12 12v6M8 22v-2a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2Z"/>',
    "toilet": '<path d="M7 12h13a1 1 0 0 1 1 1 5 5 0 0 1-5 5h-.6a.5.5 0 0 0-.4.8l1.5 2.4a.5.5 0 0 1-.4.8H5.4a.5.5 0 0 1-.4-.8L7 18"/><path d="M8 18a5 5 0 0 1-5-5V4a2 2 0 0 1 2-2h3a2 2 0 0 1 2 2v9"/>',
    "book": '<path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20"/>',
    "calculator": '<rect width="16" height="20" x="4" y="2" rx="2"/><line x1="8" x2="16" y1="6" y2="6"/><path d="M8 10h.01M12 10h.01M16 10h.01M8 14h.01M12 14h.01M8 18h.01M12 18h.01"/><line x1="16" x2="16" y1="14" y2="18"/>',

    // Nature & weather
    "droplet": '<path d="M12 22a7 7 0 0 0 7-7c0-2-1-3.9-3-5.5s-3.5-4-4-6.5c-.5 2.5-2 4.9-4 6.5C6 11.1 5 13 5 15a7 7 0 0 0 7 7Z"/>',
    "flame": '<path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.4-.5-2-1-3-1.1-2.1-1-4.2 0-6-1.9 1-4.9 3.9-5 8a5 5 0 1 0 10 0c0-1.4-.5-2-1-3"/>',
    "leaf": '<path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.5 19 2c1 2 2 4.2 2 8a10 10 0 0 1-19 4"/><path d="M2 21c0-3 1.9-6 3.9-8"/>',
    "sun": '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M6.3 17.7l-1.4 1.4M19.1 4.9l-1.4 1.4"/>',
    "snowflake": '<line x1="2" x2="22" y1="12" y2="12"/><line x1="12" x2="12" y1="2" y2="22"/><path d="m20 16-4-4 4-4M4 8l4 4-4 4M16 4l-4 4-4-4M8 20l4-4 4 4"/>',

    // Symbols
    "hash": '<line x1="4" x2="20" y1="9" y2="9"/><line x1="4" x2="20" y1="15" y2="15"/><line x1="10" x2="8" y1="3" y2="21"/><line x1="16" x2="14" y1="3" y2="21"/>',
    "tag": '<path d="M12.6 2.6A2 2 0 0 0 11.2 2H4a2 2 0 0 0-2 2v7.2a2 2 0 0 0 .6 1.4l8.7 8.7a2 2 0 0 0 2.8 0l6.6-6.6a2 2 0 0 0 0-2.8Z"/><circle cx="7.5" cy="7.5" r=".8"/>',
    "star": '<polygon points="12 2 15 8.3 22 9.3 17 14.1 18.2 21 12 17.8 5.8 21 7 14.1 2 9.3 8.9 8.3"/>',
    "heart": '<path d="M19 14c1.5-1.5 3-3.2 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.8 0-3 .5-4.5 2-1.5-1.5-2.7-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4 3 5.5l7 7Z"/>',
    "flag": '<path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1Z"/><line x1="4" x2="4" y1="22" y2="15"/>',
    "bell": '<path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.9 1.9 0 0 0 3.4 0"/>',
    "bookmark": '<path d="m19 21-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2Z"/>',
    "compass": '<circle cx="12" cy="12" r="10"/><polygon points="16.2 7.8 14.1 14.1 7.8 16.2 9.9 9.9"/>',
    "globe": '<circle cx="12" cy="12" r="10"/><line x1="2" x2="22" y1="12" y2="12"/><path d="M12 2a15 15 0 0 1 4 10 15 15 0 0 1-4 10 15 15 0 0 1-4-10 15 15 0 0 1 4-10Z"/>',
    "languages": '<path d="m5 8 6 6M4 14l6-6 2-3M2 5h12M7 2h1M22 22l-5-10-5 10M14 18h6"/>',
    "grid": '<rect width="7" height="7" x="3" y="3" rx="1"/><rect width="7" height="7" x="14" y="3" rx="1"/><rect width="7" height="7" x="14" y="14" rx="1"/><rect width="7" height="7" x="3" y="14" rx="1"/>',
    "home": '<path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2Z"/><path d="M9 22V12h6v10"/>',
    "message": '<path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z"/>',
    "key": '<circle cx="7.5" cy="15.5" r="5.5"/><path d="m21 2-9.6 9.6M15.5 7.5l3 3L22 7l-3-3"/>'
  };

  var GROUPS = [
    { label: "Food & drink", names: ["utensils", "coffee", "wine", "cup", "milk", "apple", "carrot", "egg", "fish"] },
    { label: "Travel & places", names: ["plane", "train", "bus", "bike", "ship", "map-pin", "signpost", "building", "bed", "door"] },
    { label: "Home & objects", names: ["shopping-cart", "credit-card", "gift", "shirt", "trash", "recycle", "washer", "lamp", "toilet", "book", "calculator"] },
    { label: "Nature & weather", names: ["droplet", "flame", "leaf", "sun", "snowflake"] },
    { label: "Symbols", names: ["hash", "tag", "star", "heart", "flag", "bell", "bookmark", "compass", "globe", "languages", "grid", "home", "message", "key"] }
  ];

  function has(name) { return Object.prototype.hasOwnProperty.call(PATHS, name); }

  // Render a built-in icon (by name) or an uploaded one (a data: URL) as inline
  // markup. Returns "" for anything unrecognised so a stale value degrades to
  // no icon rather than broken output.
  function render(value, extraClass) {
    var cls = "si" + (extraClass ? " " + extraClass : "");
    if (typeof value === "string" && value.indexOf("data:image/") === 0) {
      return '<img class="' + cls + '" src="' + value.replace(/"/g, "&quot;") + '" alt="" aria-hidden="true">';
    }
    if (!has(value)) return "";
    return '<svg class="' + cls + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" ' +
      'stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + PATHS[value] + "</svg>";
  }

  return { render: render, has: has, names: Object.keys(PATHS), groups: GROUPS };
})();
