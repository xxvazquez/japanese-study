// Vocabulary page -- interaction half of SakuraStudy.vocab.
//
// Page routing (Overview / category / Flashcards), the section accordion and
// overflow menus, print, cross-category search, the view-mode column filter,
// the sidebar (open/close, filter) and the casual/polite toggle. Augments the
// SakuraStudy.vocab object that js/vocab/render.js creates. Loaded after
// render.js; keeps the exact DOMContentLoaded lifecycle the old js/app.js had.
window.SakuraStudy = window.SakuraStudy || {};
window.SakuraStudy.vocab = window.SakuraStudy.vocab || {};
(function () {
  var vocab = window.SakuraStudy.vocab;

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
    // Accordion: opening one table in a category with several closes the others,
    // so a multi-table category page only ever shows one open table at a time.
    if (!section.classList.contains('collapsed')) collapseSiblingSections(section);
  }
  function expandSection(section) {
    section.classList.remove('collapsed');
    section.querySelector('.section-toggle').setAttribute('aria-expanded','true');
  }
  function collapseSection(section) {
    section.classList.add('collapsed');
    const toggle=section.querySelector('.section-toggle');
    if (toggle) toggle.setAttribute('aria-expanded','false');
  }
  // Collapse every other table sharing this one's category page (search results
  // span categories and set their own state, so this only runs for normal
  // category/table navigation).
  function collapseSiblingSections(section) {
    const category=section.dataset.category;
    document.querySelectorAll('.table-section').forEach(function (s) {
      if (s !== section && s.dataset.category === category) collapseSection(s);
    });
  }
  function updateHiddenStatus(section) {
    const count = section.querySelectorAll('tbody tr.row-hidden').length;
    const status = section.querySelector('.rows-hidden-status');
    status.hidden = count === 0;
    status.querySelector('.rows-hidden-count').textContent = count + ' row' + (count === 1 ? '' : 's') + ' hidden';
  }
  // Close every open per-table overflow menu, resetting its button's aria state.
  // `.table-section` normally clips to its rounded corners (overflow:hidden), so
  // the open menu also toggles `.menu-open` on the section to let the popover show.
  function closeSectionMenus(except) {
    document.querySelectorAll('.section-menu-list:not([hidden])').forEach(function (list) {
      if (list === except) return;
      list.hidden = true;
      const btn = list.parentElement && list.parentElement.querySelector('.section-menu-btn');
      if (btn) btn.setAttribute('aria-expanded', 'false');
    });
    document.querySelectorAll('.table-section.menu-open').forEach(function (section) {
      if (except && section.contains(except)) return;
      section.classList.remove('menu-open');
    });
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
    document.querySelector('.sidebar-overview').classList.toggle('active', !categoryName && document.body.dataset.activePage !== 'flashcards');
    const flashcardsLink = document.querySelector('.sidebar-flashcards');
    if (flashcardsLink) flashcardsLink.classList.toggle('active', document.body.dataset.activePage === 'flashcards');
    document.querySelectorAll('.sidebar-group-nav').forEach(b => b.classList.toggle('active', b.dataset.category === categoryName));
    document.querySelectorAll('.sidebar-group-items a').forEach(a => a.classList.toggle('active', tableId != null && a.dataset.target === String(tableId)));
    syncSidebarAccordion(categoryName);
  }
  // True accordion: only the active category's group is expanded. On Overview /
  // Flashcards (no active category) every group collapses, keeping the rail short.
  // The sidebar table filter forces its own groups open via the .filtering class,
  // which wins over .collapsed in CSS, so this is safe to run while filtering too.
  function syncSidebarAccordion(categoryName) {
    document.querySelectorAll('.sidebar-group').forEach(function (group) {
      const nav = group.querySelector('.sidebar-group-nav');
      const isActive = !!categoryName && nav && nav.dataset.category === categoryName;
      group.classList.toggle('collapsed', !isActive);
      const chevron = group.querySelector('.sidebar-group-chevron');
      if (chevron) chevron.setAttribute('aria-expanded', String(isActive));
    });
  }
  // Tracks whichever table is currently the active page, independent of the
  // sidebar's own DOM -- the sidebar gets fully re-rendered whenever a table
  // is hidden/shown from Overview (see SakuraStudy.vocab.refreshNav, in
  // render.js), which would otherwise wipe out the .active marking those
  // re-created nodes start without. refreshNav calls reapplyActiveNav() (below)
  // to re-apply it from this after every re-render.
  var currentTableId = null;
  vocab.reapplyActiveNav = function () {
    markActiveNav(document.body.dataset.activeCategory || null, currentTableId);
  };
  function showCategoryPage(name) {
    if (vocab.clearSearchQuery) vocab.clearSearchQuery();
    currentTableId = null;
    document.body.dataset.activeCategory = name;
    document.body.dataset.activePage = 'vocabulary';
    document.getElementById('overviewPage').hidden = true;
    document.getElementById('vocabulary').hidden = false;
    const flashcardsPage = document.getElementById('flashcardsPage');
    if (flashcardsPage) flashcardsPage.hidden = true;
    // Accordion: on a category page with several tables, only one is open at a
    // time. Landing on the page opens the alphabetically-first table (matching
    // the sidebar's own order); the rest start collapsed and open when picked.
    const matching = [...document.querySelectorAll('.table-section')].filter(function (s) { return s.dataset.category === name; });
    const firstByTitle = matching.slice().sort(function (a, b) {
      return (a.querySelector('.section-title-text')?.textContent || '').localeCompare(b.querySelector('.section-title-text')?.textContent || '');
    })[0];
    document.querySelectorAll('.table-section').forEach(function (s) {
      s.classList.toggle('page-hidden', s.dataset.category !== name);
    });
    matching.forEach(function (s) { s === firstByTitle ? expandSection(s) : collapseSection(s); });
    markActiveNav(name, null);
    window.scrollTo({ top: 0 });
    closeSidebar();
  }
  function showOverviewPage() {
    if (vocab.clearSearchQuery) vocab.clearSearchQuery();
    currentTableId = null;
    document.body.dataset.activeCategory = '';
    document.body.dataset.activePage = 'overview';
    document.getElementById('vocabulary').hidden = true;
    document.getElementById('overviewPage').hidden = false;
    const flashcardsPage = document.getElementById('flashcardsPage');
    if (flashcardsPage) flashcardsPage.hidden = true;
    markActiveNav(null, null);
    window.scrollTo({ top: 0 });
    closeSidebar();
  }
  // Flashcards is a third top-level page alongside Overview/vocabulary. Its
  // page-hiding plumbing (clearing search, resetting currentTableId, closing
  // the mobile sidebar) lives here so js/flashcards/bootstrap.js can reuse it instead of
  // duplicating it; flashcards.js owns everything that happens *inside*
  // #flashcardsPage once it's shown.
  vocab.showFlashcardsPage = function () {
    if (vocab.clearSearchQuery) vocab.clearSearchQuery();
    currentTableId = null;
    document.body.dataset.activeCategory = '';
    document.body.dataset.activePage = 'flashcards';
    document.getElementById('vocabulary').hidden = true;
    document.getElementById('overviewPage').hidden = true;
    const flashcardsPage = document.getElementById('flashcardsPage');
    if (flashcardsPage) flashcardsPage.hidden = false;
    markActiveNav(null, null);
    window.scrollTo({ top: 0 });
    closeSidebar();
  };
  function goToTable(i) {
    const section=document.querySelector(`.table-section[data-table="${i}"]`);
    if (!section) return;
    showCategoryPage(section.dataset.category);
    currentTableId = i;
    expandSection(section);
    collapseSiblingSections(section);
    section.scrollIntoView({block:'start'});
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
    vocab.clearSearchQuery = function () {
      if (input.value) { input.value = ''; runSearch(); }
    };

    input.addEventListener('input', runSearch);
    document.getElementById('clearSearch').addEventListener('click', function () {
      input.value = ''; runSearch(); input.focus();
    });
    input.addEventListener('keydown', function (event) {
      if (event.key === 'Enter') {
        const first = document.querySelector('.table-section:not(.search-hidden) tbody tr:not(.search-hidden)');
        if (first) first.scrollIntoView({ block: 'center' });
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
      // Columns: 1 = Japanese, 2 = Romaji, 3 = English.
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

    // One column-scope mode for the whole page (All/Japanese/Romaji/English),
    // driven by the header's segmented control via a delegated click handler.
    function setViewMode(mode) {
      document.body.classList.remove('mode-japanese', 'mode-romaji', 'mode-english');
      if (mode !== 'all') document.body.classList.add('mode-' + mode);
      syncViewModeControls();
      applyViewModeAccessibility(mode);
      // On the Flashcards page the vocabulary list isn't the thing on screen,
      // and runSearch() would fight its page-visibility handling.
      if (document.body.dataset.activePage !== 'flashcards') runSearch();
    }
    function syncViewModeControls() {
      const mode = document.body.classList.contains('mode-japanese') ? 'japanese'
        : document.body.classList.contains('mode-romaji') ? 'romaji'
        : document.body.classList.contains('mode-english') ? 'english' : 'all';
      document.querySelectorAll('.view-mode button').forEach(b => {
        const on = b.dataset.mode === mode;
        b.classList.toggle('active', on);
        b.setAttribute('aria-pressed', String(on));
      });
    }
    document.addEventListener('click', function (event) {
      const button = event.target.closest && event.target.closest('.view-mode button');
      if (button) setViewMode(button.dataset.mode);
    });
  });

  // CSP-safe delegated event wiring for the generated vocabulary controls -- one
  // document-level listener rather than a per-node forEach at load.
  document.addEventListener('DOMContentLoaded', function () {
    document.addEventListener('click', function (event) {
      const t = event.target;
      if (!t || !t.closest) return;
      // Any click outside a menu (button + popover) dismisses open menus.
      if (!t.closest('.section-menu')) closeSectionMenus();
      let el;
      if ((el = t.closest('.section-menu-btn'))) {
        event.stopPropagation();
        const list = el.parentElement.querySelector('.section-menu-list');
        const willOpen = list.hidden;
        closeSectionMenus();
        list.hidden = !willOpen;
        el.setAttribute('aria-expanded', String(willOpen));
        const section = el.closest('.table-section');
        if (section) section.classList.toggle('menu-open', willOpen);
        return;
      }
      if ((el = t.closest('.section-toggle'))) {
        toggleSection(el.closest('.table-section'));
      } else if ((el = t.closest('.print-one'))) {
        event.stopPropagation();
        closeSectionMenus();
        printOne(el.closest('.table-section').dataset.table);
      } else if ((el = t.closest('.manage-rows-toggle'))) {
        event.stopPropagation();
        const managing = el.closest('.table-section').classList.toggle('managing-rows');
        el.textContent = managing ? 'Done' : 'Manage rows';
        closeSectionMenus();
      } else if ((el = t.closest('.row-hide-btn'))) {
        event.stopPropagation();
        const section = el.closest('.table-section');
        el.closest('tr').classList.add('row-hidden');
        updateHiddenStatus(section);
      } else if ((el = t.closest('.show-all-rows'))) {
        event.stopPropagation();
        const section = el.closest('.table-section');
        section.querySelectorAll('tbody tr.row-hidden').forEach(function (row) { row.classList.remove('row-hidden'); });
        updateHiddenStatus(section);
      } else if ((el = t.closest('.sort-button'))) {
        event.stopPropagation();
        vocab.sortTableFromButton(el);
      } else if (t.closest('.fc-add-table-btn')) {
        // Handled in js/flashcards/views.js -- just dismiss the menu it lives in.
        closeSectionMenus();
      }
    });
    document.addEventListener('keydown', function (event) {
      if (event.key !== 'Escape') return;
      const open = document.querySelector('.section-menu-list:not([hidden])');
      if (!open) return;
      const btn = open.parentElement.querySelector('.section-menu-btn');
      closeSectionMenus();
      if (btn) btn.focus();
    });
    // The sidebar and Overview list both re-render themselves (hide/show-all
    // pulls a table from both at once, see SakuraStudy.vocab.refreshNav in
    // render.js), which destroys and recreates their nodes -- so their bindings
    // live in named, re-callable functions instead of a one-time forEach like
    // everything else here.
    vocab.bindSidebarEvents = function () {
      document.querySelectorAll('.sidebar-group-chevron').forEach(function (button) {
        button.addEventListener('click', function () {
          const group = button.closest('.sidebar-group');
          const willExpand = group.classList.contains('collapsed');
          // True accordion: expanding one group collapses the others.
          if (willExpand) {
            document.querySelectorAll('.sidebar-group').forEach(function (other) {
              if (other === group) return;
              other.classList.add('collapsed');
              const c = other.querySelector('.sidebar-group-chevron');
              if (c) c.setAttribute('aria-expanded', 'false');
            });
          }
          group.classList.toggle('collapsed', !willExpand);
          button.setAttribute('aria-expanded', String(willExpand));
        });
      });
      document.querySelectorAll('.sidebar-group-nav').forEach(function (button) {
        button.addEventListener('click', function () { showCategoryPage(button.dataset.category); });
      });
      document.querySelectorAll('.sidebar-group-items a').forEach(function (link) {
        link.addEventListener('click', function (event) {
          event.preventDefault();
          goToTable(link.dataset.target);
        });
      });
    };
    vocab.bindSidebarEvents();
    vocab.bindOverviewEvents = function () {
      document.querySelectorAll('.overview-group-nav').forEach(function (button) {
        button.addEventListener('click', function () { showCategoryPage(button.dataset.category); });
      });
      document.querySelectorAll('.overview-link').forEach(function (link) {
        link.addEventListener('click', function (event) {
          event.preventDefault();
          goToTable(link.dataset.target);
        });
      });
      document.querySelectorAll('.overview-hide-btn').forEach(function (button) {
        button.addEventListener('click', function (event) {
          event.preventDefault();
          event.stopPropagation();
          vocab.hideOverviewTable(button.dataset.target);
        });
      });
      document.querySelectorAll('.overview-show-hidden').forEach(function (button) {
        button.addEventListener('click', function (event) {
          event.preventDefault();
          event.stopPropagation();
          vocab.showOverviewCategory(button.dataset.category);
        });
      });
    };
    vocab.bindOverviewEvents();
    const overviewLink = document.querySelector('.sidebar-overview');
    if (overviewLink) {
      overviewLink.addEventListener('click', function (event) {
        event.preventDefault();
        showOverviewPage();
      });
    }
    const flashcardsLink = document.querySelector('.sidebar-flashcards');
    if (flashcardsLink) {
      flashcardsLink.addEventListener('click', function (event) {
        event.preventDefault();
        if (vocab.showFlashcardsPage) vocab.showFlashcardsPage();
      });
    }
    const sidebarToggle = document.querySelector('.sidebar-toggle');
    if (sidebarToggle) {
      sidebarToggle.addEventListener('click', function () {
        if (document.querySelector('.sidebar').classList.contains('open')) closeSidebar();
        else openSidebar();
      });
    }
    // Sidebar table filter -- narrows the nav tree to tables whose name matches,
    // hiding any category left with no matches. The input lives in static markup
    // (index.html), but .sidebar-groups is re-rendered by refreshNav, so the
    // filter is a re-appliable function called again at the end of every rebuild.
    const sidebarSearchInput = document.getElementById('sidebarSearch');
    let sidebarFilterQuery = '';
    vocab.applySidebarFilter = function () {
      const q = sidebarFilterQuery;
      let anyVisible = false;
      document.querySelectorAll('.sidebar-group').forEach(function (group) {
        let groupHasMatch = false;
        group.querySelectorAll('.sidebar-group-items a').forEach(function (link) {
          const match = !q || link.textContent.toLowerCase().includes(q);
          link.hidden = !match;
          if (match) groupHasMatch = true;
        });
        group.hidden = !groupHasMatch;
        if (groupHasMatch) anyVisible = true;
        // While filtering, force groups open so matches aren't hidden inside a
        // collapsed category; clearing the filter restores normal accordion use.
        group.classList.toggle('filtering', Boolean(q));
      });
      const empty = document.querySelector('.sidebar-search-empty');
      if (empty) empty.hidden = Boolean(!q) || anyVisible;
    };
    if (sidebarSearchInput) {
      sidebarSearchInput.addEventListener('input', function () {
        sidebarFilterQuery = sidebarSearchInput.value.trim().toLowerCase();
        vocab.applySidebarFilter();
      });
    }

    const sidebarBackdrop = document.querySelector('.sidebar-backdrop');
    if (sidebarBackdrop) sidebarBackdrop.addEventListener('click', closeSidebar);
    document.addEventListener('keydown', function (event) {
      if (event.key === 'Escape' && document.body.classList.contains('sidebar-open')) closeSidebar();
    });

    // Casual / polite: one page-wide switch. Verb tables carry both forms in the
    // markup (unchanged row structure); body.show-polite just swaps which one is
    // visible via CSS, so exactly one shows at a time. Rows with no distinct
    // polite form are unaffected. Preference persists client-side.
    const POLITE_KEY = 'sakura-show-polite';
    const politeToggle = document.getElementById('politeToggle');
    function applyPoliteMode(on) {
      document.body.classList.toggle('show-polite', on);
      if (politeToggle) {
        politeToggle.classList.toggle('active', on);
        politeToggle.setAttribute('aria-pressed', String(on));
      }
      try { localStorage.setItem(POLITE_KEY, on ? '1' : '0'); } catch (e) {}
    }
    if (politeToggle) {
      let startPolite = false;
      try { startPolite = localStorage.getItem(POLITE_KEY) === '1'; } catch (e) {}
      applyPoliteMode(startPolite);
      politeToggle.addEventListener('click', function () {
        applyPoliteMode(!document.body.classList.contains('show-polite'));
      });
    }
  });
})();
