
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
function printSelected(){
  const selected=[...document.querySelectorAll('.table-pick:checked')].map(x=>x.value);
  if(!selected.length){ alert('Select at least one table.'); return; }
  document.body.classList.add('print-only');
  document.querySelectorAll('.table-section').forEach(s=>{
    s.classList.toggle('print-target', selected.includes(s.dataset.table));
  });
  window.print();
}
function printAll(){
  document.body.classList.remove('print-only');
  document.querySelectorAll('.table-section').forEach(s=>s.classList.remove('print-target'));
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
function collapseAll() {
  document.querySelectorAll('.table-section').forEach(s=>{
    s.classList.add('collapsed');
    s.querySelector('.section-toggle').setAttribute('aria-expanded','false');
  });
}
function expandAll() {
  document.querySelectorAll('.table-section').forEach(expandSection);
}
function goToTable(i) {
  const section=document.querySelector(`.table-section[data-table="${i}"]`);
  if (!section) return;
  expandSection(section);
  if (document.body.classList.contains('carousel-mode') && window.__carousel) {
    window.__carousel.activate(section);
  } else {
    section.scrollIntoView({behavior:'smooth',block:'start'});
  }
  document.querySelectorAll('.category-dropdown a').forEach(a=>a.classList.remove('active'));
  const link=document.querySelector(`.category-dropdown a[data-target="${i}"]`);
  if(link) link.classList.add('active');
}
function updateNavOnScroll() {
  if (document.body.classList.contains('carousel-mode')) return;
  const sections=[...document.querySelectorAll('.table-section')];
  let current=sections[0];
  const y=window.scrollY+230;
  for(const sec of sections) if(sec.offsetTop<=y) current=sec;
  document.querySelectorAll('.category-dropdown a').forEach(a=>{
    a.classList.toggle('active', current && a.dataset.target===current.dataset.table);
  });
}
window.addEventListener('scroll',updateNavOnScroll,{passive:true});
window.addEventListener('load',updateNavOnScroll);

function toggleCategory(button) {
  const menu = button.closest('.category-menu');
  const wasOpen = menu.classList.contains('open');
  closeCategoryMenus();
  if (!wasOpen) {
    menu.classList.add('open');
    button.setAttribute('aria-expanded','true');
  }
}
function closeCategoryMenus() {
  document.querySelectorAll('.category-menu.open').forEach(menu => {
    menu.classList.remove('open');
    const button = menu.querySelector('.category-button');
    if (button) button.setAttribute('aria-expanded','false');
  });
}
document.addEventListener('click', e => {
  if (!e.target.closest('.category-menu')) closeCategoryMenus();
});
document.addEventListener('keydown', e => {
  if (e.key !== 'Escape') return;
  const openMenu = document.querySelector('.category-menu.open');
  if (!openMenu) return;
  const button = openMenu.querySelector('.category-button');
  closeCategoryMenus();
  if (button) button.focus();
});

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
      if(b!==button){b.dataset.sortDir='asc';b.textContent='A–Z';}
    });
    button.classList.add('active');
    button.textContent=dir==='asc'?'A–Z':'Z–A';
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
    return '<th>' + label + '<button type="button" class="sort-button" data-sort-col="' + col + '" data-sort-dir="asc">A–Z</button></th>';
  }
  function renderTable(t) {
    var tableClass = 'vocab' + (t.tableClass ? ' ' + t.tableClass : '');
    var rows = t.rows.map(function (row) { return row.type === 'verb-pair' ? verbPairRow(row) : wordRow(row); }).join('\n    ');
    return '<section class="table-section collapsed" data-table="' + t.id + '" id="table-' + t.id + '">' +
      '<div class="section-head">' +
      '<h2><button type="button" class="section-toggle" aria-expanded="false" aria-controls="vocab-' + t.id + '">' + esc(t.title) + '</button></h2>' +
      '<div class="controls">' +
      '<button type="button" class="print-one">Print this table</button>' +
      '<button type="button" class="hide-section">Hide</button>' +
      '<label class="pick"><input type="checkbox" class="table-pick" value="' + t.id + '"> Select</label>' +
      '</div></div>' +
      '<table class="' + tableClass + '" id="vocab-' + t.id + '"><thead><tr><th>Japanese</th>' + sortHeader('Romaji', 1) + sortHeader('English', 2) + '</tr></thead><tbody>\n    ' +
      rows + '\n  </tbody></table></section>';
  }

  var host = document.getElementById('vocabulary');
  if (host && window.vocabularyTables) {
    host.innerHTML = window.vocabularyTables.map(renderTable).join('\n');
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

    sections.forEach(section => {
      const tbody = section.querySelector('tbody');
      const ranked = [];
      let sectionRows = 0;
      tbody.querySelectorAll('tr').forEach(row => {
        const { match, rank } = evaluateRow(row, q, filter);
        row.classList.toggle('search-hidden', !match);
        if (match) { sectionRows++; ranked.push({ row, rank }); }
      });
      if (q) { ranked.sort((a, b) => a.rank - b.rank); ranked.forEach(r => tbody.appendChild(r.row)); }
      else restoreOrder(tbody);

      const visible = !q || sectionRows > 0;
      section.classList.toggle('search-hidden', !visible);
      if (q && sectionRows > 0) section.classList.remove('section-hidden');
      if (!q && section.dataset.userHidden === 'true') section.classList.add('section-hidden');
      if (visible && q) { totalTables++; totalRows += sectionRows; expandSection(section); }
    });
    count.textContent = q ? totalRows + ' matching row' + (totalRows === 1 ? '' : 's') + ' · ' + totalTables + ' table' + (totalTables === 1 ? '' : 's') : '';

    // A query needs every match visible at once, so it drops out of the one-table-at-a-time carousel.
    document.body.classList.toggle('carousel-mode', !q);
    if (!q && window.__carousel) window.__carousel.resume();
  }

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
  document.querySelectorAll('.hide-section').forEach(function (button) {
    button.addEventListener('click', function (event) {
      event.stopPropagation();
      const section = button.closest('.table-section');
      const wasActive = section.classList.contains('carousel-active');
      section.dataset.userHidden = 'true';
      section.classList.add('section-hidden');
      if (wasActive && window.__carousel) window.__carousel.step(1);
    });
  });
  document.querySelectorAll('.category-button').forEach(function (button) {
    button.addEventListener('click', function () { toggleCategory(button); });
  });
  document.querySelectorAll('.category-dropdown a').forEach(function (link) {
    link.addEventListener('click', function (event) {
      event.preventDefault();
      const section = document.querySelector('.table-section[data-table="' + link.dataset.target + '"]');
      if (section) { section.dataset.userHidden = 'false'; section.classList.remove('section-hidden'); }
      goToTable(link.dataset.target);
      closeCategoryMenus();
    });
  });

  document.querySelector('.print-selected')?.addEventListener('click', printSelected);
  document.querySelector('.print-all')?.addEventListener('click', printAll);
  document.querySelector('.expand-all')?.addEventListener('click', expandAll);
  document.querySelector('.collapse-all')?.addEventListener('click', collapseAll);
});

/* Carousel: browsing shows one table at a time (buttons on desktop, swipe on mobile);
   a search query drops back to the plain stacked list so every match stays visible at once. */
document.addEventListener('DOMContentLoaded', function () {
  const prevBtn = document.querySelector('.carousel-prev');
  const nextBtn = document.querySelector('.carousel-next');
  const posEl = document.getElementById('carouselPosition');
  const vocab = document.getElementById('vocabulary');
  if (!prevBtn || !nextBtn || !vocab) return;

  function all() { return [...document.querySelectorAll('.table-section')]; }
  function isHidden(section) { return section.dataset.userHidden === 'true'; }
  function currentIndex(sections) {
    const idx = sections.findIndex(s => s.classList.contains('carousel-active'));
    return idx === -1 ? 0 : idx;
  }

  function activate(section) {
    all().forEach(s => s.classList.remove('carousel-active'));
    section.classList.add('carousel-active');
    expandSection(section);
    const sections = all();
    posEl.textContent = (sections.indexOf(section) + 1) + ' / ' + sections.length;
    document.querySelectorAll('.category-dropdown a').forEach(a => a.classList.remove('active'));
    const link = document.querySelector('.category-dropdown a[data-target="' + section.dataset.table + '"]');
    if (link) link.classList.add('active');
    window.scrollTo({ top: 0 });
  }

  function step(delta) {
    const sections = all();
    if (!sections.length) return;
    let idx = currentIndex(sections);
    for (let i = 0; i < sections.length; i++) {
      idx = (idx + delta + sections.length) % sections.length;
      if (!isHidden(sections[idx])) break;
    }
    activate(sections[idx]);
  }

  function resume() {
    const sections = all();
    const stillActive = sections.find(s => s.classList.contains('carousel-active') && !isHidden(s));
    activate(stillActive || sections.find(s => !isHidden(s)) || sections[0]);
  }

  window.__carousel = { activate, step, resume };

  prevBtn.addEventListener('click', () => step(-1));
  nextBtn.addEventListener('click', () => step(1));

  document.addEventListener('keydown', function (event) {
    if (!document.body.classList.contains('carousel-mode')) return;
    if (/input|textarea|select/i.test(document.activeElement.tagName)) return;
    if (event.key === 'ArrowRight') step(1);
    else if (event.key === 'ArrowLeft') step(-1);
  });

  let touchX = 0, touchY = 0, tracking = false;
  vocab.addEventListener('touchstart', function (event) {
    if (!document.body.classList.contains('carousel-mode')) return;
    tracking = true;
    touchX = event.touches[0].clientX;
    touchY = event.touches[0].clientY;
  }, { passive: true });
  vocab.addEventListener('touchend', function (event) {
    if (!tracking) return;
    tracking = false;
    const dx = event.changedTouches[0].clientX - touchX;
    const dy = event.changedTouches[0].clientY - touchY;
    if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.5) step(dx < 0 ? 1 : -1);
  }, { passive: true });

  const first = all().find(s => !isHidden(s)) || all()[0];
  if (first) activate(first);
});
