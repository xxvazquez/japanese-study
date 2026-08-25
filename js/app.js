
function printOne(i){
  document.body.classList.add('print-only');
  document.querySelectorAll('.table-section').forEach(s=>s.classList.remove('print-target'));
  const target = document.querySelector(`.table-section[data-table="${i}"]`);
  if (!target) {
    document.body.classList.remove('print-only');
    return;
  }
  target.classList.add('print-target');
  window.print();
}
window.addEventListener('afterprint',()=>{
  document.body.classList.remove('print-only');
  document.querySelectorAll('.table-section').forEach(s=>s.classList.remove('print-target'));
});

function toggleSection(section) {
  section.classList.toggle('collapsed');
  const toggle=section.querySelector('.section-toggle');
  toggle.setAttribute('aria-expanded', String(!section.classList.contains('collapsed')));
}
function expandSection(section) {
  section.classList.remove('collapsed');
  section.querySelector('.section-toggle').setAttribute('aria-expanded','true');
}
function openSidebar() {
  document.querySelector('.sidebar').classList.add('open');
  document.body.classList.add('sidebar-open');
  const toggle = document.querySelector('.sidebar-toggle');
  if (toggle) toggle.setAttribute('aria-expanded', 'true');
}
function closeSidebar() {
  document.querySelector('.sidebar').classList.remove('open');
  document.body.classList.remove('sidebar-open');
  const toggle = document.querySelector('.sidebar-toggle');
  if (toggle) toggle.setAttribute('aria-expanded', 'false');
}
/* Each category behaves like its own page: only its tables render at once,
   instead of one long scroll through everything. Overview is a separate
   table-of-contents page. Search is the one thing that reaches across
   category boundaries -- it un-hides matches from every category, then
   restores whichever page was active when the query is cleared. */
function markActiveNav(categoryName, tableId) {
  document.querySelector('.sidebar-overview').classList.toggle('active', !categoryName);
  document.querySelectorAll('.sidebar-group-nav').forEach(b => b.classList.toggle('active', b.dataset.category === categoryName));
  document.querySelectorAll('.sidebar-group-items a').forEach(a => a.classList.toggle('active', tableId != null && a.dataset.target === String(tableId)));
}
function showCategoryPage(name) {
  if (window.clearSearchQuery) window.clearSearchQuery();
  document.body.dataset.activeCategory = name;
  document.getElementById('overviewPage').hidden = true;
  document.getElementById('vocabulary').hidden = false;
  document.querySelectorAll('.table-section').forEach(function (s) {
    const match = s.dataset.category === name;
    s.classList.toggle('page-hidden', !match);
    if (match) expandSection(s);
  });
  markActiveNav(name, null);
  window.scrollTo({ top: 0 });
  closeSidebar();
}
function showOverviewPage() {
  if (window.clearSearchQuery) window.clearSearchQuery();
  document.body.dataset.activeCategory = '';
  document.getElementById('vocabulary').hidden = true;
  document.getElementById('overviewPage').hidden = false;
  markActiveNav(null, null);
  window.scrollTo({ top: 0 });
  closeSidebar();
}
function goToTable(i) {
  const section=document.querySelector(`.table-section[data-table="${i}"]`);
  if (!section) return;
  showCategoryPage(section.dataset.category);
  expandSection(section);
  section.scrollIntoView({behavior:'smooth',block:'start'});
  markActiveNav(section.dataset.category, i);
}
function updateNavOnScroll() {
  if (document.getElementById('vocabulary').hidden) return;
  const sections=[...document.querySelectorAll('.table-section:not(.page-hidden):not(.search-hidden)')];
  if (!sections.length) return;
  let current=sections[0];
  const y=window.scrollY+230;
  for(const sec of sections) if(sec.offsetTop<=y) current=sec;
  document.querySelectorAll('.sidebar-group-items a').forEach(a=>{
    a.classList.toggle('active', current && a.dataset.target===current.dataset.table);
  });
}
window.addEventListener('scroll',updateNavOnScroll,{passive:true});
window.addEventListener('load',updateNavOnScroll);

/* Per-table sorting: numbers, weekdays, and months sort naturally; everything else falls back to locale order. */
(function(){
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
    const n=v.match(/^\d+(?:\.\d+)?/);
    if(n) return [0,Number(n[0])];
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
  window.sortTableFromButton=function(button){
    const table=button.closest('table');
    const tbody=table?.querySelector('tbody');
    if(!tbody) return;
    const col=Number(button.dataset.sortCol);
    const dir=button.dataset.sortDir || 'asc';
    const rows=[...tbody.querySelectorAll('tr')];
    rows.sort((a,b)=>cmp(val(a.cells[col]),val(b.cells[col]),dir));
    rows.forEach(r=>tbody.appendChild(r));
    table.querySelectorAll('.sort-button').forEach(b=>{
      b.classList.remove('active');
      if(b!==button){b.dataset.sortDir='asc';b.textContent='↑';}
    });
    button.classList.add('active');
    button.textContent=dir==='asc'?'↑':'↓';
    button.dataset.sortDir=dir==='asc'?'desc':'asc';
  };
})();

/* Render the vocabulary tables from structured data (data/vocabulary.js) --
   the markup for a table/row is written once here instead of being baked,
   repeated, and hand-edited 354 times over in the data file. */
(function () {
  function esc(s) {
    return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }
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
    if (row.numberValue) inner += '<span class="number-value">' + esc(row.numberValue) + '</span>';
    return '<td class="jp" lang="ja">' + inner + '</td>';
  }
  function wordRow(row) {
    return (row.irregular ? '<tr class="irregular-row">' : '<tr>') + jpCell(row) +
      '<td>' + esc(row.romaji) + '</td><td>' + esc(row.english) + '</td></tr>';
  }
  function verbPairRow(row) {
    var jp = row.forms.map(function (f) { return '<div class="verb-form"><span class="jpword">' + jpSegments(f.jp) + '</span></div>'; }).join('');
    var romaji = row.forms.map(function (f) { return '<div class="verb-form">' + esc(f.romaji) + '</div>'; }).join('');
    return '<tr><td class="jp" lang="ja">' + jp + '</td><td>' + romaji + '</td><td>' + esc(row.english) + '</td></tr>';
  }
  function sortHeader(label, col) {
    return '<th>' + label + '<button type="button" class="sort-button" data-sort-col="' + col + '" data-sort-dir="asc" aria-label="Sort ' + esc(label) + '">↑</button></th>';
  }
  var PRINT_ICON = '<svg viewBox="0 0 18 18" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 6V2.5h8V6"/><rect x="2.5" y="6" width="13" height="7" rx="1.2"/><path d="M5 11.5h8V15.5H5Z"/></svg>';
  function renderTable(t) {
    var tableClass = 'vocab' + (t.tableClass ? ' ' + t.tableClass : '');
    var rows = t.rows.map(function (row) { return row.type === 'verb-pair' ? verbPairRow(row) : wordRow(row); }).join('\n    ');
    return '<section class="table-section page-hidden" data-table="' + t.id + '" data-category="' + esc(t.category || '') + '" id="table-' + t.id + '">' +
      '<div class="section-head">' +
      '<h2><button type="button" class="section-toggle" aria-expanded="true" aria-controls="vocab-' + t.id + '">' + esc(t.title) + '</button></h2>' +
      '<div class="controls">' +
      '<button type="button" class="print-one" aria-label="Print this table" title="Print this table">' + PRINT_ICON + '</button>' +
      '</div></div>' +
      '<table class="' + tableClass + '" id="vocab-' + t.id + '"><thead><tr><th>Japanese</th>' + sortHeader('Romaji', 1) + sortHeader('English', 2) + '</tr></thead><tbody>\n    ' +
      rows + '\n  </tbody></table></section>';
  }

  // Small, hand-drawn line icons -- one per category, each its own color
  // from the existing palette, purely as a fast visual anchor when scanning.
  var CATEGORY_META = {
    'Grammar': { color: '#4c637a', icon: '<svg viewBox="0 0 18 18" width="15" height="15" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="3" y1="5" x2="15" y2="5"/><line x1="3" y1="9" x2="12.5" y2="9"/><line x1="3" y1="13" x2="9.5" y2="13"/></svg>' },
    'Food & Ingredients': { color: '#b97e91', icon: '<svg viewBox="0 0 18 18" width="15" height="15" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 7.5h12"/><path d="M3.5 7.5a5.5 5.5 0 0 0 11 0"/><path d="M9 7.5V3.8c1.4 0 2.2.9 2.2 2"/></svg>' },
    'Kitchen & Dining': { color: '#6a89a7', icon: '<svg viewBox="0 0 18 18" width="15" height="15" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="7" cy="9.5" r="4.2"/><line x1="10.8" y1="7.2" x2="15.5" y2="4.2"/></svg>' },
    'Numbers & Counting': { color: '#8f6a78', icon: '<svg viewBox="0 0 18 18" width="15" height="15" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="4" y1="4" x2="4" y2="14"/><line x1="7.3" y1="4" x2="7.3" y2="14"/><line x1="10.6" y1="4" x2="10.6" y2="14"/><line x1="3" y1="13.5" x2="12" y2="4.5"/></svg>' }
  };
  var DEFAULT_CATEGORY_META = { color: 'var(--muted)', icon: '<svg viewBox="0 0 18 18" width="15" height="15" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 3h8v12l-4-3-4 3Z"/></svg>' };
  var CHEVRON_ICON = '<svg viewBox="0 0 18 18" width="12" height="12" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 7l4 4 4-4"/></svg>';
  function categoryMeta(name) { return CATEGORY_META[name] || DEFAULT_CATEGORY_META; }
  function categoryHeaderHtml(name, count) {
    var meta = categoryMeta(name);
    return '<span class="cat-icon" style="color:' + meta.color + '">' + meta.icon + '</span>' +
      '<span class="cat-name">' + esc(name) + '</span>' +
      '<span class="cat-count">' + count + '</span>';
  }
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
  function renderSidebar(tables) {
    return groupByCategory(tables).map(function (g) {
      var links = g.tables.map(function (t) {
        return '<a href="#table-' + t.id + '" data-target="' + t.id + '">' + esc(t.title) + '</a>';
      }).join('');
      return '<div class="sidebar-group">' +
        '<div class="sidebar-group-head">' +
        '<button type="button" class="sidebar-group-nav" data-category="' + esc(g.name) + '">' + categoryHeaderHtml(g.name, g.tables.length) + '</button>' +
        '<button type="button" class="sidebar-group-chevron" aria-expanded="true" aria-label="Toggle ' + esc(g.name) + '">' + CHEVRON_ICON + '</button>' +
        '</div>' +
        '<div class="sidebar-group-items">' + links + '</div></div>';
    }).join('');
  }
  // Overview is a plain table of contents -- no accordion, just links.
  function renderOverview(tables) {
    return groupByCategory(tables).map(function (g) {
      var links = g.tables.map(function (t) {
        return '<a href="#table-' + t.id + '" data-target="' + t.id + '">' + esc(t.title) + '</a>';
      }).join('');
      return '<div class="overview-group">' +
        '<button type="button" class="overview-group-nav" data-category="' + esc(g.name) + '">' + categoryHeaderHtml(g.name, g.tables.length) + '</button>' +
        '<div class="overview-group-items">' + links + '</div></div>';
    }).join('');
  }

  var host = document.getElementById('vocabulary');
  var sidebarHost = document.querySelector('.sidebar-groups');
  var overviewHost = document.querySelector('.overview-groups');
  if (host && window.vocabularyTables) {
    host.innerHTML = window.vocabularyTables.map(renderTable).join('\n');
    if (sidebarHost) sidebarHost.innerHTML = renderSidebar(window.vocabularyTables);
    if (overviewHost) overviewHost.innerHTML = renderOverview(window.vocabularyTables);
  }
  document.querySelectorAll('.vocab tbody').forEach(function (tbody) {
    [...tbody.querySelectorAll('tr')].forEach(function (row, i) { row.dataset.originalIndex = i; });
  });
})();

/* Search across Japanese, furigana, romaji and English. A filter (All/Japanese/Romaji/English)
   scopes which field(s) are matched; results rank exact > starts-with > ends-with > contains,
   reorder within their table, and highlight the matched text. */
document.addEventListener('DOMContentLoaded', function () {
  const input = document.getElementById('tableSearch');
  if (!input) return;
  const count = document.getElementById('searchCount');
  const box = input.closest('.search-box');
  const sections = [...document.querySelectorAll('.table-section')];

  function currentFilter() {
    const active = document.querySelector('.view-mode button.active');
    return active ? active.dataset.mode : 'all';
  }

  // The jp cell mixes kanji/kana with <rt class="furigana"> readings; split them
  // so "Japanese" search covers both without garbling them into one string.
  function jpFields(td) {
    const clone = td.cloneNode(true);
    const furiganaEls = [...clone.querySelectorAll('.furigana')];
    const furigana = furiganaEls.map(el => el.textContent).join('');
    furiganaEls.forEach(el => el.remove());
    return { kanji: clone.textContent, furigana };
  }

  function rankOf(text, q) {
    if (!text) return null;
    const t = text.toLocaleLowerCase();
    if (!t.includes(q)) return null;
    if (t === q) return 0;
    if (t.startsWith(q)) return 1;
    if (t.endsWith(q)) return 2;
    return 3;
  }

  function fieldsForFilter(row, filter) {
    const fields = [];
    if (filter === 'all' || filter === 'japanese') {
      const jp = jpFields(row.cells[0]);
      fields.push({ cell: row.cells[0], text: jp.kanji });
      fields.push({ cell: row.cells[0], text: jp.furigana });
    }
    if (filter === 'all' || filter === 'romaji') fields.push({ cell: row.cells[1], text: row.cells[1].textContent });
    if (filter === 'all' || filter === 'english') fields.push({ cell: row.cells[2], text: row.cells[2].textContent });
    return fields;
  }

  function clearHighlights(row) {
    row.querySelectorAll('mark.search-hit').forEach(mark => mark.replaceWith(document.createTextNode(mark.textContent)));
    [...row.cells].forEach(cell => cell.normalize());
  }

  function highlightCell(cell, q) {
    const walker = document.createTreeWalker(cell, NodeFilter.SHOW_TEXT);
    const nodes = [];
    let node;
    while ((node = walker.nextNode())) nodes.push(node);
    nodes.forEach(textNode => {
      const text = textNode.textContent;
      const idx = text.toLocaleLowerCase().indexOf(q);
      if (idx === -1) return;
      const mark = document.createElement('mark');
      mark.className = 'search-hit';
      mark.textContent = text.slice(idx, idx + q.length);
      const frag = document.createDocumentFragment();
      if (idx > 0) frag.appendChild(document.createTextNode(text.slice(0, idx)));
      frag.appendChild(mark);
      if (idx + q.length < text.length) frag.appendChild(document.createTextNode(text.slice(idx + q.length)));
      textNode.replaceWith(frag);
    });
  }

  function evaluateRow(row, q, filter) {
    clearHighlights(row);
    if (!q) return { match: true, rank: null };
    let best = null;
    const matchedCells = new Set();
    fieldsForFilter(row, filter).forEach(f => {
      const r = rankOf(f.text, q);
      if (r !== null) {
        if (best === null || r < best) best = r;
        matchedCells.add(f.cell);
      }
    });
    matchedCells.forEach(cell => highlightCell(cell, q));
    return { match: best !== null, rank: best };
  }

  function restoreOrder(tbody) {
    const rows = [...tbody.querySelectorAll('tr')].sort((a, b) => Number(a.dataset.originalIndex) - Number(b.dataset.originalIndex));
    rows.forEach(r => tbody.appendChild(r));
  }

  function runSearch() {
    const q = input.value.trim().toLocaleLowerCase();
    box.classList.toggle('has-value', Boolean(q));
    const filter = currentFilter();
    let totalRows = 0, totalTables = 0;
    const sectionOrder = [];
    const overviewPage = document.getElementById('overviewPage');
    const vocabHost = document.getElementById('vocabulary');
    const activeCategory = document.body.dataset.activeCategory || '';

    // A query needs matches from every category, not just the one currently
    // open -- so search temporarily lifts the per-category page restriction.
    if (q) { vocabHost.hidden = false; overviewPage.hidden = true; }
    else if (activeCategory) { vocabHost.hidden = false; overviewPage.hidden = true; }
    else { vocabHost.hidden = true; overviewPage.hidden = false; }

    sections.forEach((section, originalIndex) => {
      const tbody = section.querySelector('tbody');
      const ranked = [];
      let sectionRows = 0, sectionBest = null;
      tbody.querySelectorAll('tr').forEach(row => {
        const { match, rank } = evaluateRow(row, q, filter);
        row.classList.toggle('search-hidden', !match);
        if (match) {
          sectionRows++;
          ranked.push({ row, rank });
          if (sectionBest === null || rank < sectionBest) sectionBest = rank;
        }
      });
      if (q) { ranked.sort((a, b) => a.rank - b.rank); ranked.forEach(r => tbody.appendChild(r.row)); }
      else restoreOrder(tbody);

      if (q) {
        section.classList.remove('page-hidden');
        section.classList.toggle('search-hidden', sectionRows === 0);
        if (sectionRows > 0) { totalTables++; totalRows += sectionRows; expandSection(section); }
      } else {
        section.classList.remove('search-hidden');
        section.classList.toggle('page-hidden', Boolean(activeCategory) && section.dataset.category !== activeCategory);
      }
      sectionOrder.push({ section, rank: sectionBest === null ? Infinity : sectionBest, originalIndex });
    });
    count.textContent = q ? totalRows + ' matching row' + (totalRows === 1 ? '' : 's') + ' · ' + totalTables + ' table' + (totalTables === 1 ? '' : 's') : '';

    // The best match overall should be the first thing on the page, not just first
    // within whichever table happens to sort earliest -- so reorder the table
    // sections themselves by their best contained match, ties kept in table order.
    if (q) {
      sectionOrder.sort((a, b) => a.rank - b.rank || a.originalIndex - b.originalIndex);
      sectionOrder.forEach(s => vocabHost.appendChild(s.section));
    } else {
      sections.forEach(section => vocabHost.appendChild(section));
    }
  }
  window.clearSearchQuery = function () {
    if (input.value) { input.value = ''; runSearch(); }
  };

  input.addEventListener('input', runSearch);
  document.getElementById('clearSearch').addEventListener('click', function () {
    input.value = ''; runSearch(); input.focus();
  });
  input.addEventListener('keydown', function (event) {
    if (event.key === 'Enter') {
      const first = document.querySelector('.table-section:not(.search-hidden) tbody tr:not(.search-hidden)');
      if (first) first.scrollIntoView({ behavior: 'smooth', block: 'center' });
    } else if (event.key === 'Escape') {
      input.value = ''; runSearch(); input.blur();
    }
  });
  document.addEventListener('keydown', function (event) {
    if (event.key === '/' && !/input|textarea|select/i.test(document.activeElement.tagName)) {
      event.preventDefault(); input.focus();
    }
  });

  // The view-mode filter visually dims other columns (color: transparent) so the grid,
  // borders and colors stay intact -- but that leaves the text readable to a screen
  // reader and its sort button focusable. Mark the hidden columns aria-hidden and
  // disable their sort control so the accessible state matches what's visually shown.
  function applyViewModeAccessibility(mode) {
    const hiddenByMode = { japanese: [2, 3], romaji: [1, 3], english: [1, 2] };
    const hidden = hiddenByMode[mode] || [];
    document.querySelectorAll('.vocab').forEach(function (table) {
      [1, 2, 3].forEach(function (col) {
        const isHidden = hidden.indexOf(col) !== -1;
        table.querySelectorAll('th:nth-child(' + col + '), td:nth-child(' + col + ')').forEach(function (cell) {
          if (isHidden) cell.setAttribute('aria-hidden', 'true'); else cell.removeAttribute('aria-hidden');
          const sortBtn = cell.querySelector('.sort-button');
          if (sortBtn) sortBtn.disabled = isHidden;
        });
      });
    });
  }

  document.querySelectorAll('.view-mode button').forEach(button => button.addEventListener('click', function () {
    const mode = button.dataset.mode;
    document.body.classList.remove('mode-japanese', 'mode-romaji', 'mode-english');
    if (mode !== 'all') document.body.classList.add('mode-' + mode);
    document.querySelectorAll('.view-mode button').forEach(b => {
      b.classList.toggle('active', b === button);
      b.setAttribute('aria-pressed', String(b === button));
    });
    applyViewModeAccessibility(mode);
    runSearch();
  }));
});

// CSP-safe delegated event wiring for generated vocabulary controls.
document.addEventListener('DOMContentLoaded', function () {
  document.querySelectorAll('.section-toggle').forEach(function (toggle) {
    toggle.addEventListener('click', function () { toggleSection(toggle.closest('.table-section')); });
  });
  document.querySelectorAll('.print-one').forEach(function (button) {
    button.addEventListener('click', function (event) { event.stopPropagation(); printOne(button.closest('.table-section').dataset.table); });
  });
  document.querySelectorAll('.sort-button').forEach(function (button) {
    button.addEventListener('click', function (event) { event.stopPropagation(); sortTableFromButton(button); });
  });
  document.querySelectorAll('.sidebar-group-chevron').forEach(function (button) {
    button.addEventListener('click', function () {
      const group = button.closest('.sidebar-group');
      const collapsed = group.classList.toggle('collapsed');
      button.setAttribute('aria-expanded', String(!collapsed));
    });
  });
  document.querySelectorAll('.sidebar-group-nav, .overview-group-nav').forEach(function (button) {
    button.addEventListener('click', function () { showCategoryPage(button.dataset.category); });
  });
  document.querySelectorAll('.sidebar-group-items a, .overview-group-items a').forEach(function (link) {
    link.addEventListener('click', function (event) {
      event.preventDefault();
      goToTable(link.dataset.target);
    });
  });
  const overviewLink = document.querySelector('.sidebar-overview');
  if (overviewLink) {
    overviewLink.addEventListener('click', function (event) {
      event.preventDefault();
      showOverviewPage();
    });
  }
  const sidebarToggle = document.querySelector('.sidebar-toggle');
  if (sidebarToggle) {
    sidebarToggle.addEventListener('click', function () {
      if (document.querySelector('.sidebar').classList.contains('open')) closeSidebar();
      else openSidebar();
    });
  }
  const sidebarBackdrop = document.querySelector('.sidebar-backdrop');
  if (sidebarBackdrop) sidebarBackdrop.addEventListener('click', closeSidebar);
  document.addEventListener('keydown', function (event) {
    if (event.key === 'Escape' && document.body.classList.contains('sidebar-open')) closeSidebar();
  });
});
