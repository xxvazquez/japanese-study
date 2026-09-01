// A small, reusable icon picker. iconPicker.open(currentValue, onPick):
// opens a centred panel (bottom sheet on a phone) with a searchable grid of
// the built-in line icons plus an "upload your own" option; picking one calls
// onPick(value) and closes. value is a built-in name, a data: URL for an
// uploaded image, or "" for "no icon". No positioning is done in JS (the CSP
// forbids inline styles) -- layout is all CSS, modelled on the table
// directory's panel/scrim.
window.SakuraStudy = window.SakuraStudy || {};
window.SakuraStudy.iconPicker = (function () {
  "use strict";

  var icons = window.SakuraStudy.icons;
  var esc = window.SakuraStudy.shared.escapeHtml;
  var CLOSE = '<svg viewBox="0 0 18 18" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" aria-hidden="true"><path d="M4 4l10 10M14 4L4 14"/></svg>';
  var MAX_UPLOAD_BYTES = 512 * 1024; // 512 KB source cap; downscaled to 64px anyway

  var host = null, onPick = null, opener = null;

  function gridHtml(current) {
    return icons.groups.map(function (g) {
      var cells = g.names.filter(icons.has).map(function (name) {
        return '<button type="button" class="icon-cell' + (name === current ? " selected" : "") +
          '" data-icon="' + name + '" title="' + name.replace(/-/g, " ") + '" aria-label="' + name.replace(/-/g, " ") +
          '"' + (name === current ? ' aria-pressed="true"' : "") + ">" + icons.render(name) + "</button>";
      }).join("");
      return '<div class="icon-picker-group" data-group="' + esc(g.label) + '">' +
        '<p class="icon-picker-group-label">' + esc(g.label) + "</p>" +
        '<div class="icon-grid">' + cells + "</div></div>";
    }).join("");
  }

  function ensureHost() {
    if (host) return host;
    host = document.createElement("div");
    host.className = "icon-picker-root";
    host.hidden = true;
    host.innerHTML =
      '<div class="icon-picker-scrim" data-close></div>' +
      '<div class="icon-picker" role="dialog" aria-modal="true" aria-label="Choose an icon">' +
        '<div class="icon-picker-head">' +
          '<input type="search" class="icon-picker-search" placeholder="Search icons" aria-label="Search icons" autocomplete="off">' +
          '<button type="button" class="icon-picker-close" data-close aria-label="Close">' + CLOSE + "</button>" +
        "</div>" +
        '<div class="icon-picker-body"></div>' +
        '<div class="icon-picker-foot">' +
          '<label class="icon-picker-upload"><input type="file" accept="image/png,image/jpeg,image/svg+xml,image/webp" class="icon-picker-file" hidden><span>Upload image…</span></label>' +
          '<button type="button" class="icon-picker-remove" data-remove>Remove icon</button>' +
        "</div>" +
      "</div>";
    document.body.appendChild(host);
    wire();
    return host;
  }

  function wire() {
    var body = host.querySelector(".icon-picker-body");
    var search = host.querySelector(".icon-picker-search");
    var file = host.querySelector(".icon-picker-file");

    host.addEventListener("click", function (e) {
      if (e.target.closest("[data-close]")) { close(); return; }
      if (e.target.closest("[data-remove]")) { finish(""); return; }
      var cell = e.target.closest(".icon-cell");
      if (cell) finish(cell.dataset.icon);
    });
    search.addEventListener("input", function () {
      var q = search.value.trim().toLowerCase();
      body.querySelectorAll(".icon-cell").forEach(function (c) {
        c.hidden = q && (c.dataset.icon || "").replace(/-/g, " ").indexOf(q) === -1;
      });
      body.querySelectorAll(".icon-picker-group").forEach(function (g) {
        g.hidden = !g.querySelector(".icon-cell:not([hidden])");
      });
    });
    file.addEventListener("change", function () {
      var f = file.files && file.files[0];
      file.value = "";
      if (!f) return;
      if (f.size > MAX_UPLOAD_BYTES) { window.alert("That image is too large — pick one under 512 KB."); return; }
      var reader = new FileReader();
      reader.onload = function () { downscale(String(reader.result), function (url) { if (url) finish(url); }); };
      reader.readAsDataURL(f);
    });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && !host.hidden) close();
    });
  }

  // Redraw an uploaded raster image at <=64px as a PNG data URL; SVGs pass
  // through untouched (they're already tiny and scale on their own).
  function downscale(dataUrl, cb) {
    if (dataUrl.indexOf("data:image/svg") === 0) { cb(dataUrl); return; }
    var img = new Image();
    img.onload = function () {
      var max = 64, s = Math.min(1, max / Math.max(img.width, img.height));
      var c = document.createElement("canvas");
      c.width = Math.round(img.width * s); c.height = Math.round(img.height * s);
      c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
      try { cb(c.toDataURL("image/png")); } catch (e) { cb(dataUrl); }
    };
    img.onerror = function () { cb(null); };
    img.src = dataUrl;
  }

  function open(currentValue, pick, openerEl) {
    ensureHost();
    onPick = pick;
    opener = openerEl || null;
    host.querySelector(".icon-picker-body").innerHTML = gridHtml(currentValue || "");
    host.querySelector(".icon-picker-remove").hidden = !currentValue;
    host.querySelector(".icon-picker-search").value = "";
    host.hidden = false;
    document.body.classList.add("icon-picker-open");
    var s = host.querySelector(".icon-picker-search");
    if (s && !("ontouchstart" in window)) s.focus();
  }
  function close() {
    if (!host || host.hidden) return;
    host.hidden = true;
    document.body.classList.remove("icon-picker-open");
    onPick = null;
    if (opener && opener.focus) opener.focus();
    opener = null;
  }
  function finish(value) {
    var cb = onPick;
    close();
    if (cb) cb(value);
  }

  return { open: open, close: close };
})();
