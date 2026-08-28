// Vocabulary page -- rendering half of SakuraStudy.vocab.
//
// Builds every vocabulary table, the sidebar tree and the Overview table of
// contents from SakuraStudy.data, and owns per-table sorting. Runs its render
// synchronously at load (same lifecycle as the old js/app.js). The interaction
// half -- navigation, search, event wiring -- lives in js/vocab/interactions.js
// and augments the same SakuraStudy.vocab object. See the load-order comment in
// index.html.
window.SakuraStudy = window.SakuraStudy || {};
window.SakuraStudy.vocab = window.SakuraStudy.vocab || {};

/* Per-table sorting: numbers, weekdays, and months sort naturally; everything else falls back to locale order. */
(function(){
  var vocab = window.SakuraStudy.vocab;
  const DAYS = {
    monday:0,tuesday:1,wednesday:2,thursday:3,friday:4,saturday:5,sunday:6,
    mon:0,tue:1,wed:2,thu:3,fri:4,sat:5,sun:6,
    '月曜日':0,'火曜日':1,'水曜日':2,'木曜日':3,'金曜日':4,'土曜日':5,'日曜日':6
  };
  const MONTHS = {
    january:0,february:1,march:2,april:3,may:4,june:5,july:6,august:7,september:8,october:9,november:10,december:11,
    jan:0,feb:1,mar:2,apr:3,may:4,jun:5,jul:6,aug:7,sep:8,oct:9,nov:10,dec:11,
    '一月':0,'二月':1,'三月':2,'四月':3,'五月':4,'六月':5,'七月':6,'八月':7,'九月':8,'十月':9,'十一月':10,'十二月':11
  };
  function val(cell){ return (cell?.textContent || '').trim(); }
  function key(v){
    v=v.toLowerCase().replace(/\s+/g,' ').trim();
    // Leading number, allowing thousands separators ("1,000", "300,000") so
    // the Numbers table sorts 0 → 1,000,000 rather than lexically by first digit.
    const n=v.match(/^[\d,]*\d(?:\.\d+)?/);
    if(n) return [0,Number(n[0].replace(/,/g,''))];
    if(v in DAYS) return [1,DAYS[v]];
    if(v in MONTHS) return [2,MONTHS[v]];
    return [3,v];
  }
  function cmp(a,b,dir){
    const x=key(a),y=key(b);
    let c;
    if(x[0]!==y[0]) c=x[0]-y[0];
    else if(typeof x[1]==='number' && typeof y[1]==='number') c=x[1]-y[1];
    else c=String(x[1]).localeCompare(String(y[1]),undefined,{numeric:true,sensitivity:'base'});
    return dir==='desc' ? -c : c;
  }
  // Shared with renderTable() (a separate IIFE below, run right after this one)
  // so the default a-z-by-English ordering the tables render in uses the exact
  // same comparison as the column sort buttons -- weekdays/months/numbers and
  // all -- rather than a second, subtly different sort.
  vocab.compareCellText = cmp;
  // Arrow convention: ↓ = currently sorted A-Z (numbers low-to-high),
  // ↑ = currently sorted Z-A (numbers high-to-low), ↕ = not the sort column.
  const SORT_GLYPH = { asc:'↓', desc:'↑', '':'↕' };
  vocab.sortTableFromButton=function(button){
    const table=button.closest('table');
    const tbody=table?.querySelector('tbody');
    if(!tbody) return;
    const col=Number(button.dataset.sortCol);
    const dir=button.dataset.sortDir==='asc' ? 'desc' : 'asc';
    const rows=[...tbody.querySelectorAll('tr')];
    rows.sort((a,b)=>cmp(val(a.cells[col]),val(b.cells[col]),dir));
    rows.forEach(r=>tbody.appendChild(r));
    table.querySelectorAll('.sort-button').forEach(b=>{
      b.classList.remove('active');
      b.dataset.sortDir='';
      b.textContent=SORT_GLYPH[''];
    });
    button.classList.add('active');
    button.dataset.sortDir=dir;
    button.textContent=SORT_GLYPH[dir];
  };
})();

/* Render the vocabulary tables from structured data (data/vocabulary.js) --
   the markup for a table/row is written once here instead of being baked,
   repeated, and hand-edited once per row in the data file. */
(function () {
  var vocab = window.SakuraStudy.vocab;
  var esc = window.SakuraStudy.shared.escapeHtml;
  // Exposed so js/flashcards/vocab-index.js can render the exact same furigana markup
  // for a vocab entry's Japanese prompt instead of duplicating this logic.
  vocab.jpSegmentsHtml = jpSegments;
  function jpSegments(segments) {
    return segments.map(function (seg) {
      return seg.kanji
        ? '<ruby><rb class="jpmain">' + esc(seg.kanji) + '</rb><rt class="furigana">' + esc(seg.reading) + '</rt></ruby>'
        : esc(seg.text);
    }).join('');
  }
  function jpCell(row) {
    var inner = row.particle
      ? '<span class="particle">' + esc(row.jp[0].text) + '</span>'
      : '<span class="jpword">' + jpSegments(row.jp) + '</span>';
    return '<td class="jp" lang="ja">' + inner + '</td>';
  }
  var EYE_ICON = '<svg viewBox="0 0 18 18" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M2 9c1.8-3.2 4.5-4.8 7-4.8s5.2 1.6 7 4.8c-1.8 3.2-4.5 4.8-7 4.8S3.8 12.2 2 9Z"/><circle cx="9" cy="9" r="2"/></svg>';
  // Which tables are hidden from the Overview table-of-contents -- persisted
  // client-side (localStorage), independent of the sidebar/search/direct
  // links, which never consult this and always show every table. Guarded
  // against localStorage being unavailable (private browsing, some test
  // environments): the feature just silently stops persisting rather than
  // breaking the page.
  var HIDDEN_OVERVIEW_KEY = 'sakura-hidden-overview-tables';
  function loadHiddenOverviewTables() {
    try {
      var raw = window.localStorage && localStorage.getItem(HIDDEN_OVERVIEW_KEY);
      return raw ? new Set(JSON.parse(raw)) : new Set();
    } catch (e) { return new Set(); }
  }
  function saveHiddenOverviewTables(set) {
    try { localStorage.setItem(HIDDEN_OVERVIEW_KEY, JSON.stringify([...set])); } catch (e) {}
  }
  function rowHideButton() {
    return '<button type="button" class="row-hide-btn" aria-label="Hide this row" title="Hide this row">' + EYE_ICON + '</button>';
  }
  // Only emits the button + the row's permanent vocab id -- js/flashcards/
  // views.js (loaded after this file) owns all of its behavior and
  // active/removed styling, so this file's own footprint for the whole
  // flashcards feature stays this one small, self-contained button.
  var FLASHCARD_ICON = '<svg viewBox="0 0 18 18" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="2.5" y="4" width="11" height="8" rx="1.4"/><rect x="4.5" y="6" width="11" height="8" rx="1.4"/></svg>';
  function flashcardToggleButton(vocabId) {
    if (!vocabId) return '';
    return '<button type="button" class="fc-toggle-btn" data-vocab-id="' + esc(vocabId) + '" aria-label="Add to flashcards" aria-pressed="false" title="Add to flashcards">' + FLASHCARD_ICON + '</button>';
  }
  function wordRow(row) {
    var openTag = '<tr data-vocab-id="' + esc(row.id || '') + '"' + (row.irregular ? ' class="irregular-row">' : '>');
    return openTag + jpCell(row) +
      '<td>' + esc(row.romaji) + '</td><td>' + esc(row.english) + flashcardToggleButton(row.id) + rowHideButton() + '</td></tr>';
  }
  // forms[0] is the plain/dictionary form, forms[1] the polite (-masu) form --
  // tag each so CSS can tint the two consistently (plain vs polite) down both
  // the Japanese and Romaji columns.
  var VERB_FORM_CLASS = ['verb-form-plain', 'verb-form-polite'];
  function verbPairRow(row) {
    var jp = row.forms.map(function (f, fi) { return '<div class="verb-form ' + (VERB_FORM_CLASS[fi] || '') + '"><span class="jpword">' + jpSegments(f.jp) + '</span></div>'; }).join('');
    var romaji = row.forms.map(function (f, fi) { return '<div class="verb-form ' + (VERB_FORM_CLASS[fi] || '') + '">' + esc(f.romaji) + '</div>'; }).join('');
    return '<tr data-vocab-id="' + esc(row.id || '') + '"><td class="jp" lang="ja">' + jp + '</td><td>' + romaji + '</td><td>' + esc(row.english) + flashcardToggleButton(row.id) + rowHideButton() + '</td></tr>';
  }
  // isDefault marks the column the table renders sorted by (English) -- it
  // starts active and showing ↓ (A-Z); the others start neutral (↕).
  function sortHeader(label, col, isDefault) {
    return '<th>' + label + '<button type="button" class="sort-button' + (isDefault ? ' active' : '') +
      '" data-sort-col="' + col + '" data-sort-dir="' + (isDefault ? 'asc' : '') +
      '" aria-label="Sort ' + esc(label) + '">' + (isDefault ? '↓' : '↕') + '</button></th>';
  }
  var PRINT_ICON = '<svg viewBox="0 0 18 18" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 6V2.5h8V6"/><rect x="2.5" y="6" width="13" height="7" rx="1.2"/><path d="M5 11.5h8V15.5H5Z"/></svg>';
  var MENU_ICON = '<svg viewBox="0 0 18 18" width="14" height="14" fill="currentColor" aria-hidden="true"><circle cx="9" cy="4" r="1.45"/><circle cx="9" cy="9" r="1.45"/><circle cx="9" cy="14" r="1.45"/></svg>';
  function byEnglish(a, b) {
    return vocab.compareCellText(String(a.english || ''), String(b.english || ''), 'asc');
  }
  function rowsHtmlFor(rows) {
    return rows.map(function (row) { return row.type === 'verb-pair' ? verbPairRow(row) : wordRow(row); }).join('\n    ');
  }
  // Shared table-section markup -- every vocabulary table on the page goes
  // through here so it's structurally identical: same columns, sort controls,
  // print button, furigana markup, and every feature that keys off
  // `.table-section` / `.vocab` (search, print, view-mode, row hiding).
  function sectionMarkup(o) {
    var catMeta = categoryMeta(o.category || '');
    var controls = o.controls || {};
    var ctrlParts =['<span class="rows-hidden-status" hidden><span class="rows-hidden-count"></span> · <button type="button" class="show-all-rows">Show all</button></span>'];
    // Secondary actions collapse into a quiet overflow menu so only its icon
    // sits next to the title. Print is a standalone icon on desktop, but on
    // narrow screens the full title takes priority, so print folds into the
    // menu there too (the .print-menu-item copy, CSS-toggled by width) and the
    // standalone icon is hidden.
    var menuItems = [];
    if (controls.addTable) menuItems.push('<button type="button" class="fc-add-table-btn" role="menuitem" data-table="' + o.id + '" title="Add every row in this table to your flashcards">Add to flashcards</button>');
    if (controls.manageRows) menuItems.push('<button type="button" class="manage-rows-toggle" role="menuitem">Manage rows</button>');
    // Only fold print into the menu when the menu already exists for other
    // reasons -- a table whose only control is print keeps just the icon.
    if (controls.print && menuItems.length) menuItems.push('<button type="button" class="print-one print-menu-item" role="menuitem" aria-label="Print this table">Print</button>');
    if (menuItems.length) {
      ctrlParts.push('<div class="section-menu">' +
        '<button type="button" class="section-menu-btn" aria-haspopup="true" aria-expanded="false" aria-label="Table options" title="Table options">' + MENU_ICON + '</button>' +
        '<div class="section-menu-list" role="menu" hidden>' + menuItems.join('') + '</div></div>');
    }
    if (controls.print) ctrlParts.push('<button type="button" class="print-one print-icon-btn" aria-label="Print this table" title="Print this table">' + PRINT_ICON + '</button>');
    var defaultSort = o.defaultSort !== false;
    return '<section class="table-section ' + (o.sectionClass || '') + '" data-table="' + o.id + '" data-category="' + esc(o.category || '') + '" id="table-' + o.id + '">' +
      '<div class="section-head">' +
      '<h2 class="section-title"><button type="button" class="section-toggle" aria-expanded="true" aria-controls="vocab-' + o.id + '">' +
      '<span class="section-title-icon ' + catMeta.cls + '">' + catMeta.icon + '</span>' +
      '<span class="section-title-text">' + esc(o.title) + '</span>' +
      '<span class="section-toggle-icon">' + CHEVRON_ICON + '</span></button></h2>' +
      '<div class="controls">' + ctrlParts.join('') + '</div></div>' +
      '<table class="vocab' + (o.tableClass ? ' ' + o.tableClass : '') + '" id="vocab-' + o.id + '"><thead><tr>' +
      '<th>Japanese</th>' +
      sortHeader('Romaji', 1, false) + sortHeader('English', 2, defaultSort) + '</tr></thead><tbody>\n    ' +
      o.rowsHtml + '\n  </tbody></table></section>';
  }
  function renderTable(t) {
    var sortedRows = t.rows.slice().sort(byEnglish);
    return sectionMarkup({
      id: t.id, title: t.title, category: t.category, tableClass: t.tableClass,
      rowsHtml: rowsHtmlFor(sortedRows),
      controls: { addTable: true, manageRows: true, print: true },
      sectionClass: 'page-hidden', defaultSort: true
    });
  }
  // Build a standard vocabulary table section from an arbitrary set of rows
  // (raw data/vocabulary.js row objects). Flashcards' "Words to Review" uses it
  // so that list is a real, sortable, printable table rather than a bespoke
  // component. `presort:false` keeps the caller's order (e.g. most-missed
  // first) and starts every sort control neutral.
  vocab.buildVocabSection = function (config) {
    var rows = (config.rows || []).filter(Boolean);
    var ordered = config.presort === false ? rows : rows.slice().sort(byEnglish);
    return sectionMarkup({
      id: config.id, title: config.title, category: config.category || '', tableClass: config.tableClass,
      rowsHtml: rowsHtmlFor(ordered),
      controls: config.controls || { print: true },
      sectionClass: config.sectionClass || '',
      defaultSort: config.presort !== false
    });
  };

  // Small, hand-drawn line icons -- one per category, each its own color
  // from the existing palette, purely as a fast visual anchor when scanning.
  // Colors come from CSS classes rather than inline style="" -- the page's CSP
  // (style-src 'self', no 'unsafe-inline') silently drops inline style
  // attributes, so any per-category color has to live in the stylesheet.
  var CATEGORY_META = {
    'Grammar': { cls: 'cat-color-a', icon: '<svg viewBox="0 0 18 18" width="15" height="15" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="3" y1="5" x2="15" y2="5"/><line x1="3" y1="9" x2="12.5" y2="9"/><line x1="3" y1="13" x2="9.5" y2="13"/></svg>' },
    'Food & Ingredients': { cls: 'cat-color-b', icon: '<svg viewBox="0 0 18 18" width="15" height="15" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 7.5h12"/><path d="M3.5 7.5a5.5 5.5 0 0 0 11 0"/><path d="M9 7.5V3.8c1.4 0 2.2.9 2.2 2"/></svg>' },
    'Kitchen & Dining': { cls: 'cat-color-c', icon: '<svg viewBox="0 0 18 18" width="15" height="15" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="7" cy="9.5" r="4.2"/><line x1="10.8" y1="7.2" x2="15.5" y2="4.2"/></svg>' },
    'Numbers & Counting': { cls: 'cat-color-d', icon: '<svg viewBox="0 0 18 18" width="15" height="15" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="4" y1="4" x2="4" y2="14"/><line x1="7.3" y1="4" x2="7.3" y2="14"/><line x1="10.6" y1="4" x2="10.6" y2="14"/><line x1="3" y1="13.5" x2="12" y2="4.5"/></svg>' },
    'Travel': { cls: 'cat-color-e', icon: '<svg viewBox="0 0 18 18" width="15" height="15" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 15.5c3-3.3 4.5-6 4.5-8.2A4.5 4.5 0 0 0 9 2.8a4.5 4.5 0 0 0-4.5 4.5c0 2.2 1.5 4.9 4.5 8.2Z"/><circle cx="9" cy="7.2" r="1.6"/></svg>' }
  };
  var DEFAULT_CATEGORY_META = { cls: 'cat-color-default', icon: '<svg viewBox="0 0 18 18" width="15" height="15" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 3h8v12l-4-3-4 3Z"/></svg>' };
  var CHEVRON_ICON = '<svg viewBox="0 0 18 18" width="12" height="12" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 7l4 4 4-4"/></svg>';
  function categoryMeta(name) { return CATEGORY_META[name] || DEFAULT_CATEGORY_META; }
  function categoryHeaderHtml(name, count) {
    var meta = categoryMeta(name);
    return '<span class="cat-icon ' + meta.cls + '">' + meta.icon + '</span>' +
      '<span class="cat-name">' + esc(name) + '</span>' +
      '<span class="cat-count">' + count + '</span>';
  }
  // Exposed so js/flashcards/views.js's Manage tab renders the exact same
  // icon/color/count category header as the sidebar and Overview, instead
  // of a plain unstyled heading of its own.
  vocab.categoryHeaderHtml = categoryHeaderHtml;
  // Group tables by category (alphabetical categories, alphabetical tables
  // within each) -- shared by the sidebar and the Overview table of contents
  // so both stay in sync as tables/categories are added.
  function groupByCategory(tables) {
    var byName = {};
    tables.forEach(function (t) {
      var name = t.category || 'Tables';
      if (!byName[name]) byName[name] = [];
      byName[name].push(t);
    });
    var names = Object.keys(byName).sort(function (a, b) { return a.localeCompare(b); });
    return names.map(function (name) {
      return { name: name, tables: byName[name].slice().sort(function (a, b) { return a.title.localeCompare(b.title); }) };
    });
  }
  // Hidden tables are filtered out of both the sidebar and Overview -- the
  // same `hidden` set drives both, so hiding a table from Overview also
  // pulls it out of the sidebar's nav tree. It stays fully intact and
  // reachable everywhere else (its #table-N link, search, print) -- this
  // only ever affects the two navigation lists, never the data or routing.
  function renderSidebar(tables, hidden) {
    return groupByCategory(tables).map(function (g) {
      var visible = g.tables.filter(function (t) { return !hidden.has(String(t.id)); });
      var links = visible.map(function (t) {
        return '<a href="#table-' + t.id + '" data-target="' + t.id + '">' + esc(t.title) + '</a>';
      }).join('');
      // Accordion: every group renders collapsed; syncSidebarAccordion() (via
      // markActiveNav) opens just the active category. Category name + count
      // stay visible in the head either way.
      return '<div class="sidebar-group collapsed">' +
        '<div class="sidebar-group-head">' +
        '<button type="button" class="sidebar-group-nav" data-category="' + esc(g.name) + '">' + categoryHeaderHtml(g.name, visible.length) + '</button>' +
        '<button type="button" class="sidebar-group-chevron" aria-expanded="false" aria-label="Toggle ' + esc(g.name) + '">' + CHEVRON_ICON + '</button>' +
        '</div>' +
        '<div class="sidebar-group-items">' + links + '</div></div>';
    }).join('');
  }
  // Overview is a plain table of contents -- no accordion, just links. Each
  // row gets a trailing chevron (a rotated copy of CHEVRON_ICON, so it's the
  // same icon family as everywhere else) to read as a clickable list row
  // rather than wrapped inline text, plus a hide control.
  function renderOverview(tables, hidden) {
    return groupByCategory(tables).map(function (g) {
      var hiddenCount = 0;
      var links = g.tables.map(function (t) {
        if (hidden.has(String(t.id))) { hiddenCount++; return ''; }
        return '<div class="overview-row">' +
          '<a class="overview-link" href="#table-' + t.id + '" data-target="' + t.id + '">' +
          '<span class="overview-link-text">' + esc(t.title) + '</span>' +
          '<span class="overview-link-chevron">' + CHEVRON_ICON + '</span>' +
          '</a>' +
          '<button type="button" class="overview-hide-btn" data-target="' + t.id + '" aria-label="Hide ' + esc(t.title) + ' from Overview" title="Hide from Overview">' + EYE_ICON + '</button>' +
          '</div>';
      }).join('');
      var status = hiddenCount === 0 ? '' :
        '<div class="overview-hidden-status">' + hiddenCount + ' hidden · ' +
        '<button type="button" class="overview-show-hidden" data-category="' + esc(g.name) + '">Show all</button></div>';
      // The count matches the sidebar's (visible tables only) -- the
      // "N hidden · Show all" status line right below already accounts for
      // the rest, so the header count doesn't need to double as a total.
      return '<div class="overview-group">' +
        '<button type="button" class="overview-group-nav" data-category="' + esc(g.name) + '">' + categoryHeaderHtml(g.name, g.tables.length - hiddenCount) + '</button>' +
        '<div class="overview-group-items">' + links + '</div>' + status + '</div>';
    }).join('');
  }

  var host = document.getElementById('vocabulary');
  var sidebarHost = document.querySelector('.sidebar-groups');
  var overviewHost = document.querySelector('.overview-groups');
  var hiddenTables = loadHiddenOverviewTables();
  var vocabularyTables = window.SakuraStudy.data.vocabularyTables;
  if (host && vocabularyTables) {
    host.innerHTML = vocabularyTables.map(renderTable).join('\n');
    if (sidebarHost) sidebarHost.innerHTML = renderSidebar(vocabularyTables, hiddenTables);
    if (overviewHost) overviewHost.innerHTML = renderOverview(vocabularyTables, hiddenTables);
  }
  document.querySelectorAll('.vocab tbody').forEach(function (tbody) {
    [...tbody.querySelectorAll('tr')].forEach(function (row, i) { row.dataset.originalIndex = i; });
  });

  // Re-rendering the sidebar/Overview (after a hide/show-all) destroys any
  // listeners and UI state (collapsed groups, the active-page marker) on
  // their old nodes -- this rebuilds both from the same hidden set, re-binds
  // their delegated events (SakuraStudy.vocab.bindSidebarEvents /
  // bindOverviewEvents, defined in js/vocab/interactions.js) and reapplies the
  // active marker (reapplyActiveNav, also in interactions.js, which tracks the
  // active table id) since the freshly-rendered nodes start with no .active
  // class of their own.
  vocab.refreshNav = function () {
    if (sidebarHost) sidebarHost.innerHTML = renderSidebar(vocabularyTables, hiddenTables);
    if (overviewHost) overviewHost.innerHTML = renderOverview(vocabularyTables, hiddenTables);
    // reapplyActiveNav() below re-runs syncSidebarAccordion(), so the freshly
    // rendered groups end up with exactly the active category expanded.
    if (vocab.bindSidebarEvents) vocab.bindSidebarEvents();
    if (vocab.bindOverviewEvents) vocab.bindOverviewEvents();
    if (vocab.reapplyActiveNav) vocab.reapplyActiveNav();
    if (vocab.applySidebarFilter) vocab.applySidebarFilter();
  };
  vocab.hideOverviewTable = function (id) {
    hiddenTables.add(String(id));
    saveHiddenOverviewTables(hiddenTables);
    vocab.refreshNav();
  };
  vocab.showOverviewCategory = function (category) {
    vocabularyTables.forEach(function (t) {
      if ((t.category || 'Tables') === category) hiddenTables.delete(String(t.id));
    });
    saveHiddenOverviewTables(hiddenTables);
    vocab.refreshNav();
  };
})();
