// Vocabulary page -- interaction half of SakuraStudy.vocab.
//
// Section routing (Vocabulary / Grammar / Travel / Flashcards), the per-table
// accordion and overflow menus, print, cross-section search, the view-mode
// column filter, the four-item top navigation and the casual/polite toggle.
// Augments the SakuraStudy.vocab object that js/vocab/render.js creates. Loaded
// after render.js; keeps the exact DOMContentLoaded lifecycle the old
// js/app.js had.
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

  // Once you've opened/closed tables in a section (or used Expand all), that
  // section keeps its layout when you navigate away and back -- only a section
  // you've never touched falls to the first-table default.
  const sectionLayout = {}; // name -> { touched: true, expandAll: bool }
  function noteSectionLayout(name) {
    if (!name) return;
    sectionLayout[name] = { touched: true, expandAll: document.body.classList.contains('expand-all-mode') };
  }

  function toggleSection(section) {
    section.classList.toggle('collapsed');
    const toggle=section.querySelector('.section-toggle');
    toggle.setAttribute('aria-expanded', String(!section.classList.contains('collapsed')));
    // Accordion: opening one table in a category with several closes the others,
    // so a category only ever shows one open table at a time.
    if (!section.classList.contains('collapsed')) collapseSiblingSections(section);
    updatePoliteVisibility(); // expanding/collapsing the Verbs table changes whether "Show polite" applies
    noteSectionLayout(section.dataset.section);
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
  // Collapse every other table sharing this one's content category -- unless
  // "Expand all" is on, where every table stays open on purpose. (Search
  // results span sections and set their own state, so this only runs for
  // normal section navigation and manual toggles.)
  function collapseSiblingSections(section) {
    if (document.body.classList.contains('expand-all-mode')) return;
    const category=section.dataset.category;
    document.querySelectorAll('#vocabulary .table-section').forEach(function (s) {
      if (s !== section && s.dataset.category === category) collapseSection(s);
    });
  }

  function visibleSectionTables() {
    return [...document.querySelectorAll('#vocabulary .table-section:not(.page-hidden):not(.search-hidden)')];
  }
  // Accordion default: the section's first table open, the rest closed --
  // immediate content without the "why is *this* set of tables open?" of a
  // first-per-category rule. Everything else is one click (or Expand all).
  function collapseToAccordion(list) {
    list.forEach(function (s, i) {
      if (i === 0) expandSection(s);
      else collapseSection(s);
    });
  }
  function setExpandAll(on) {
    document.body.classList.toggle('expand-all-mode', on);
    const list = visibleSectionTables();
    if (on) list.forEach(expandSection);
    else collapseToAccordion(list);
    syncExpandAllBtn();
    if (vocab.syncTableIndexActive) vocab.syncTableIndexActive();
    updatePoliteVisibility();
    noteSectionLayout(document.body.dataset.activeSection || 'vocabulary');
  }
  function syncExpandAllBtn() {
    const btn = document.getElementById('expandAllBtn');
    if (!btn) return;
    const on = document.body.classList.contains('expand-all-mode');
    btn.textContent = on ? 'Collapse all' : 'Expand all';
    btn.setAttribute('aria-pressed', String(on));
  }
  function updateHiddenStatus(section) {
    const count = section.querySelectorAll('tbody tr.row-hidden').length;
    const status = section.querySelector('.rows-hidden-status');
    status.hidden = count === 0;
    status.querySelector('.rows-hidden-count').textContent = count + ' row' + (count === 1 ? '' : 's') + ' hidden';
  }
  // Close every open per-table overflow menu, resetting its button's aria state.
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
  // The "jump to a table" dropdown.
  function closeTableIndexMenu() {
    const menu = document.getElementById('tindexMenu');
    if (menu) menu.hidden = true;
    const trigger = document.querySelector('.tindex-trigger');
    if (trigger) trigger.setAttribute('aria-expanded', 'false');
  }

  /* The four main study areas. Vocabulary / Grammar / Travel each render a set
     of table-sections (Vocabulary keeps its content-category sub-headings);
     Flashcards is its own page. Search is the one thing that reaches across
     section boundaries -- it reveals matches everywhere, then restores the
     active section when the query is cleared. */
  function markActiveNav(sectionName) {
    const page = document.body.dataset.activePage;
    document.querySelectorAll('#siteNav .site-nav-link').forEach(function (link) {
      const on = link.dataset.page === 'flashcards'
        ? page === 'flashcards'
        : (page !== 'flashcards' && link.dataset.section === sectionName);
      link.classList.toggle('active', on);
    });
  }

  // Reflect the current view in the URL hash (#vocabulary / #grammar /
  // #travel / #flashcards / #table-N) so a section or a specific table can be
  // bookmarked, shared and survive a reload. `fromRoute` = we're already
  // responding to a hash, so don't push it again.
  function setHash(h, fromRoute) {
    if (fromRoute) return;
    if (('#' + h) === location.hash) return;
    try { history.pushState(null, '', '#' + h); } catch (e) { location.hash = h; }
  }

  function showSection(name, opts) {
    opts = opts || {};
    if (vocab.clearSearchQuery) vocab.clearSearchQuery();
    document.body.dataset.activeSection = name;
    document.body.dataset.activePage = name;
    document.getElementById('vocabPage').hidden = false;
    const flashcardsPage = document.getElementById('flashcardsPage');
    if (flashcardsPage) flashcardsPage.hidden = true;
    // Reset the "jump to a table" dropdown to this section (closed).
    const tableIndex = document.getElementById('tableIndex');
    if (tableIndex) {
      tableIndex.classList.remove('search-hidden');
      closeTableIndexMenu();
      tableIndex.querySelectorAll('.tindex-panel').forEach(function (p) {
        p.classList.toggle('page-hidden', p.dataset.section !== name);
      });
    }
    // Restore this section's remembered layout; a section never touched falls
    // to the accordion default (its first table open, the rest collapsed).
    const layout = sectionLayout[name];
    document.body.classList.toggle('expand-all-mode', !!(layout && layout.expandAll));
    syncExpandAllBtn();
    let firstShown = false;
    document.querySelectorAll('#vocabulary .table-section').forEach(function (s) {
      const inSection = s.dataset.section === name;
      s.classList.toggle('page-hidden', !inSection);
      s.classList.remove('search-hidden');
      if (!inSection) return;
      if (layout && layout.touched) return; // keep whatever the user left
      if (!firstShown) { firstShown = true; expandSection(s); }
      else collapseSection(s);
    });
    document.querySelectorAll('#vocabulary .cat-heading').forEach(function (h) {
      h.classList.remove('search-hidden');
      h.classList.toggle('page-hidden', h.dataset.section !== name);
    });
    markActiveNav(name);
    updatePoliteVisibility();
    if (vocab.syncTableIndexActive) vocab.syncTableIndexActive();
    setHash(name, opts.fromRoute);
    if (!opts.fromRoute || !/^#table-/.test(location.hash)) window.scrollTo({ top: 0 });
  }
  vocab.showSection = showSection;

  // Jump straight to a table: switch section if needed, open it (collapsing
  // its category siblings), scroll it into view.
  function goToTable(id, opts) {
    opts = opts || {};
    const section = document.querySelector('#vocabulary .table-section[data-table="' + id + '"]');
    if (!section) return;
    if (document.body.dataset.activeSection !== section.dataset.section) showSection(section.dataset.section, { fromRoute: true });
    expandSection(section);
    collapseSiblingSections(section);
    noteSectionLayout(section.dataset.section);
    section.scrollIntoView({ block: 'start' });
    // Mark this table current in the directory right away -- when it's already
    // on screen no scroll fires, so the scroll-spy alone wouldn't update.
    if (vocab.syncTableIndexActive) vocab.syncTableIndexActive(id);
    setHash('table-' + id, opts.fromRoute);
  }

  // Flashcards is a top-level page alongside the three vocabulary sections. Its
  // page-hiding plumbing lives here so js/flashcards/bootstrap.js can reuse it;
  // flashcards.js owns everything inside #flashcardsPage.
  vocab.showFlashcardsPage = function (opts) {
    opts = opts || {};
    if (vocab.clearSearchQuery) vocab.clearSearchQuery();
    document.body.dataset.activeSection = '';
    document.body.dataset.activePage = 'flashcards';
    document.getElementById('vocabPage').hidden = true;
    const flashcardsPage = document.getElementById('flashcardsPage');
    if (flashcardsPage) flashcardsPage.hidden = false;
    markActiveNav(null);
    setHash('flashcards', opts.fromRoute);
    window.scrollTo({ top: 0 });
  };

  // "Show polite" only does anything to verb tables (only the Verbs table has
  // them), so it only shows when a verb table's rows are actually on screen --
  // not just present-but-collapsed (or hidden by section routing / search).
  function updatePoliteVisibility() {
    const pt = document.getElementById('politeToggle');
    if (!pt) return;
    pt.hidden = !document.querySelector('#vocabulary .table-section:not(.page-hidden):not(.collapsed):not(.search-hidden) .verb-form');
  }
  vocab.updatePoliteVisibility = updatePoliteVisibility;

  // Route the current URL hash to a view. `fromRoute` everywhere so nothing
  // pushes a new history entry in response to one.
  function routeFromHash() {
    const h = (location.hash || '').replace(/^#/, '');
    const m = h.match(/^table-(.+)$/);
    if (h === 'flashcards') { vocab.showFlashcardsPage({ fromRoute: true }); return; }
    if (m && document.getElementById('table-' + m[1])) { goToTable(m[1], { fromRoute: true }); return; }
    if (h === 'grammar' || h === 'travel') { showSection(h, { fromRoute: true }); return; }
    showSection('vocabulary', { fromRoute: true });
  }
  vocab.routeFromHash = routeFromHash;
  window.addEventListener('popstate', routeFromHash);

  /* Search across whichever of Japanese / furigana / romaji / English is
     still visible (the column-visibility toggles below narrow it). Results
     rank exact > starts-with > ends-with > contains, reorder within their
     table, and highlight the matched text. */
  document.addEventListener('DOMContentLoaded', function () {
    const input = document.getElementById('tableSearch');
    if (!input) return;
    const count = document.getElementById('searchCount');
    const box = input.closest('.search-box');
    const vocabHost = document.getElementById('vocabulary');
    const sections = [...vocabHost.querySelectorAll('.table-section')];
    const headings = [...vocabHost.querySelectorAll('.cat-heading')];
    // The full, grouped child order of #vocabulary (headings + sections) --
    // restored verbatim when a search is cleared, since ranking reorders the
    // sections while a query is active.
    const vocabOrder = [...vocabHost.children];

    // Column visibility: each toolbar button hides its own thing (the
    // Japanese / Romaji / English columns, or just the furigana readings),
    // any combination -- never all three columns at once. Search then only
    // looks at what's still on screen.
    const COL_INDEX = { japanese: 1, romaji: 2, english: 3 };
    function isHidden(key) { return document.body.classList.contains('hide-' + key); }
    function visibleColKeys() {
      return Object.keys(COL_INDEX).filter(k => !isHidden(k));
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

    function fieldsForRow(row) {
      const fields = [];
      if (!isHidden('japanese')) {
        const jp = jpFields(row.cells[0]);
        fields.push({ cell: row.cells[0], text: jp.kanji });
        if (!isHidden('furigana')) fields.push({ cell: row.cells[0], text: jp.furigana });
      }
      if (!isHidden('romaji')) fields.push({ cell: row.cells[1], text: row.cells[1].textContent });
      if (!isHidden('english')) fields.push({ cell: row.cells[2], text: row.cells[2].textContent });
      return fields;
    }

    function clearHighlights(row) {
      row.querySelectorAll('mark.search-hit').forEach(mark => mark.replaceWith(document.createTextNode(mark.textContent)));
      row.querySelectorAll('.kr.search-hit').forEach(el => el.classList.remove('search-hit'));
      [...row.cells].forEach(cell => cell.normalize());
    }

    function markTextNode(textNode, idx, len) {
      const text = textNode.textContent;
      const mark = document.createElement('mark');
      mark.className = 'search-hit';
      mark.textContent = text.slice(idx, idx + len);
      const frag = document.createDocumentFragment();
      if (idx > 0) frag.appendChild(document.createTextNode(text.slice(0, idx)));
      frag.appendChild(mark);
      if (idx + len < text.length) frag.appendChild(document.createTextNode(text.slice(idx + len)));
      textNode.replaceWith(frag);
    }
    function highlightCell(cell, q) {
      // The Japanese cell wraps katakana in per-unit <span class="kr">, so a
      // match can straddle several nodes. Walk the cell's leaf nodes with a
      // running offset: split plain text nodes, and flag whole .kr spans that
      // fall inside the match (styled like <mark> via .kr.search-hit).
      const walker = document.createTreeWalker(cell, NodeFilter.SHOW_TEXT + NodeFilter.SHOW_ELEMENT, {
        acceptNode(n) {
          if (n.nodeType === 3) return n.parentElement.closest('.kr') ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT;
          return n.classList && n.classList.contains('kr') ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_SKIP;
        }
      });
      const segs = [];
      let n, pos = 0;
      while ((n = walker.nextNode())) {
        const text = n.textContent;
        segs.push({ node: n, start: pos, text });
        pos += text.length;
      }
      const full = segs.map(s => s.text).join('').toLocaleLowerCase();
      let from = 0, at;
      while ((at = full.indexOf(q, from)) !== -1) {
        const end = at + q.length;
        segs.forEach(s => {
          const sEnd = s.start + s.text.length;
          if (sEnd <= at || s.start >= end) return;
          if (s.node.nodeType === 3) {
            const lo = Math.max(0, at - s.start), hi = Math.min(s.text.length, end - s.start);
            markTextNode(s.node, lo, hi - lo);
          } else {
            s.node.classList.add('search-hit');
          }
        });
        from = end;
      }
    }

    function evaluateRow(row, q) {
      clearHighlights(row);
      if (!q) return { match: true, rank: null };
      let best = null;
      const matchedCells = new Set();
      fieldsForRow(row).forEach(f => {
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
      const activeSection = document.body.dataset.activeSection || 'vocabulary';
      let totalRows = 0, totalTables = 0;
      const sectionOrder = [];

      // Category sub-headings + the per-section table-index dropdown are
      // noise while results span every section.
      headings.forEach(h => {
        h.classList.toggle('search-hidden', Boolean(q));
        if (!q) h.classList.toggle('page-hidden', h.dataset.section !== activeSection);
      });
      const tableIndexEl = document.getElementById('tableIndex');
      if (tableIndexEl) {
        tableIndexEl.classList.toggle('search-hidden', Boolean(q));
        if (q) closeTableIndexMenu();
        else tableIndexEl.querySelectorAll('.tindex-panel').forEach(p => p.classList.toggle('page-hidden', p.dataset.section !== activeSection));
      }
      // "Expand all" is meaningless with search results (already all open).
      const expandBar = document.querySelector('.expand-bar');
      if (expandBar) expandBar.classList.toggle('search-hidden', Boolean(q));
      if (q) document.body.classList.remove('expand-all-mode');

      sections.forEach((section, originalIndex) => {
        const tbody = section.querySelector('tbody');
        const ranked = [];
        let sectionRows = 0, sectionBest = null;
        tbody.querySelectorAll('tr').forEach(row => {
          const { match, rank } = evaluateRow(row, q);
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
          section.classList.toggle('page-hidden', section.dataset.section !== activeSection);
        }
        sectionOrder.push({ section, rank: sectionBest === null ? Infinity : sectionBest, originalIndex });
      });
      count.textContent = q ? totalRows + ' matching row' + (totalRows === 1 ? '' : 's') + ' · ' + totalTables + ' table' + (totalTables === 1 ? '' : 's') : '';
      if (vocab.updatePoliteVisibility) vocab.updatePoliteVisibility();

      // The best match overall should be first on the page; ties keep table order.
      if (q) {
        sectionOrder.sort((a, b) => a.rank - b.rank || a.originalIndex - b.originalIndex);
        sectionOrder.forEach(s => vocabHost.appendChild(s.section));
      } else {
        vocabOrder.forEach(el => vocabHost.appendChild(el));
      }
    }
    vocab.clearSearchQuery = function () {
      if (input.value) { input.value = ''; runSearch(); }
    };
    // The `/` shortcut needs a vocabulary section on screen -- search only
    // lives there.
    vocab.focusSearch = function () {
      if (document.body.dataset.activePage === 'flashcards') showSection('vocabulary');
      input.scrollIntoView({ block: 'nearest' });
      input.focus();
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
        event.preventDefault();
        if (vocab.focusSearch) vocab.focusSearch();
      }
    });

    // A hidden column keeps its width and rules (CSS just makes its text
    // transparent); this keeps the accessible state in step -- aria-hidden on
    // its cells / the furigana, its sort control disabled -- and reflects each
    // button's pressed state (pressed = hidden).
    function applyColVisibility() {
      document.querySelectorAll('.view-mode button').forEach(b => {
        const off = isHidden(b.dataset.col);
        b.classList.toggle('col-hidden', off);
        b.setAttribute('aria-pressed', String(off));
      });
      document.querySelectorAll('.vocab').forEach(function (table) {
        Object.keys(COL_INDEX).forEach(function (key) {
          const col = COL_INDEX[key], hide = isHidden(key);
          table.querySelectorAll('th:nth-child(' + col + '), td:nth-child(' + col + ')').forEach(function (cell) {
            if (hide) cell.setAttribute('aria-hidden', 'true'); else cell.removeAttribute('aria-hidden');
            const sortBtn = cell.querySelector('.sort-button');
            if (sortBtn) sortBtn.disabled = hide;
          });
        });
        const furiHidden = isHidden('furigana') || isHidden('japanese');
        table.querySelectorAll('.furigana').forEach(function (rt) {
          if (furiHidden) rt.setAttribute('aria-hidden', 'true'); else rt.removeAttribute('aria-hidden');
        });
      });
    }
    function toggleColumn(key) {
      const cls = 'hide-' + key;
      const willHide = !document.body.classList.contains(cls);
      // Never hide the last remaining column (furigana isn't a column, so it
      // doesn't count toward that).
      if (willHide && key in COL_INDEX && visibleColKeys().length <= 1) return;
      document.body.classList.toggle(cls, willHide);
      applyColVisibility();
      if (document.body.dataset.activePage !== 'flashcards') runSearch();
    }
    document.addEventListener('click', function (event) {
      const button = event.target.closest && event.target.closest('.view-mode button');
      if (button && button.dataset.col) toggleColumn(button.dataset.col);
    });
  });

  // CSP-safe delegated event wiring for the generated vocabulary controls.
  document.addEventListener('DOMContentLoaded', function () {
    document.addEventListener('click', function (event) {
      const t = event.target;
      if (!t || !t.closest) return;
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

    // Top navigation -- rendered once by render.js, never rebuilt.
    document.querySelectorAll('#siteNav .site-nav-link').forEach(function (link) {
      link.addEventListener('click', function (event) {
        event.preventDefault();
        if (link.dataset.page === 'flashcards') { if (vocab.showFlashcardsPage) vocab.showFlashcardsPage(); }
        else if (link.dataset.section) showSection(link.dataset.section);
      });
    });
    const wordmark = document.querySelector('.wordmark');
    if (wordmark) {
      wordmark.addEventListener('click', function (event) { event.preventDefault(); showSection('vocabulary'); });
    }

    // Table-index dropdown -- rendered once. The trigger opens/closes the
    // menu; picking a table jumps to it and closes; outside-click / Esc
    // close it. The trigger label and the menu's `.current` mark track
    // whichever table is in view as you scroll.
    const tableIndex = document.getElementById('tableIndex');
    // Every table link in the visible panel -- the directory shows them all,
    // so keyboard nav walks the whole list.
    function tindexItems() { return [...document.querySelectorAll('#tindexMenu .tindex-panel:not(.page-hidden) a[data-target]')]; }
    function openTindexMenu() {
      const menu = document.getElementById('tindexMenu');
      closeSectionMenus();
      menu.hidden = false;
      document.querySelector('.tindex-trigger').setAttribute('aria-expanded', 'true');
      const items = tindexItems();
      const target = items.find(a => a.classList.contains('current')) || items[0];
      if (target) requestAnimationFrame(() => target.focus());
    }
    if (tableIndex) {
      tableIndex.addEventListener('click', function (event) {
        const trigger = event.target.closest('.tindex-trigger');
        if (trigger) {
          if (document.getElementById('tindexMenu').hidden) openTindexMenu();
          else closeTableIndexMenu();
          return;
        }
        // The mobile bottom-sheet scrim.
        if (event.target.closest('.tindex-scrim')) { closeTableIndexMenu(); return; }
        const link = event.target.closest('a[data-target]');
        if (!link) return;
        event.preventDefault();
        closeTableIndexMenu();
        goToTable(link.dataset.target);
        const t = document.querySelector('.tindex-trigger');
        if (t) t.focus();
      });
      // Arrow-key navigation once the menu is open.
      tableIndex.addEventListener('keydown', function (event) {
        const menu = document.getElementById('tindexMenu');
        if (menu.hidden) return;
        const items = tindexItems();
        const i = items.indexOf(document.activeElement);
        if (event.key === 'ArrowDown') { event.preventDefault(); (items[i + 1] || items[0]).focus(); }
        else if (event.key === 'ArrowUp') { event.preventDefault(); (items[i - 1] || items[items.length - 1]).focus(); }
        else if (event.key === 'Home') { event.preventDefault(); items[0] && items[0].focus(); }
        else if (event.key === 'End') { event.preventDefault(); items[items.length - 1] && items[items.length - 1].focus(); }
        else if (event.key === 'Tab') { closeTableIndexMenu(); }
      });
    }
    document.addEventListener('click', function (event) {
      if (!event.target.closest || !event.target.closest('#tableIndex')) closeTableIndexMenu();
    });
    document.addEventListener('keydown', function (event) {
      if (event.key !== 'Escape') return;
      const menu = document.getElementById('tindexMenu');
      if (menu && !menu.hidden) {
        closeTableIndexMenu();
        const t = document.querySelector('.tindex-trigger');
        if (t) t.focus();
      }
    });
    vocab.syncTableIndexActive = function (forceId) {
      const panel = document.querySelector('#tableIndex .tindex-panel:not(.page-hidden)');
      const label = document.querySelector('.tindex-trigger-label');
      if (!panel) return;
      const visible = [...document.querySelectorAll('#vocabulary .table-section:not(.page-hidden):not(.search-hidden)')];
      let current = visible[0];
      const y = window.scrollY + 130;
      for (const s of visible) if (s.offsetTop <= y) current = s;
      if (forceId) { const f = visible.find(s => s.dataset.table === String(forceId)); if (f) current = f; }
      panel.querySelectorAll('a[data-target]').forEach(function (a) {
        a.classList.toggle('current', !!current && a.dataset.target === current.dataset.table);
      });
      if (label) label.textContent = current ? (current.querySelector('.section-title-text')?.textContent || 'Jump to a table') : 'Jump to a table';
    };
    window.addEventListener('scroll', function () {
      if (document.getElementById('vocabPage').hidden) return;
      if (document.getElementById('tableSearch').value.trim()) return;
      vocab.syncTableIndexActive();
    }, { passive: true });

    // Expand all / collapse all -- read a whole category (or section) straight
    // through, then snap back to the one-open accordion.
    const expandAllBtn = document.getElementById('expandAllBtn');
    if (expandAllBtn) {
      expandAllBtn.addEventListener('click', function () {
        setExpandAll(!document.body.classList.contains('expand-all-mode'));
      });
    }

    // Light / dark / system theme. js/theme-init.js already set <html
    // data-theme + data-theme-choice> before paint; this wires the toggle
    // (a 3-way cycle: System -> Light -> Dark -> System), keeps "system"
    // following the OS live, and persists the choice.
    const THEME_KEY = 'sakura-theme';
    const THEME_ORDER = ['system', 'light', 'dark'];
    const THEME_LABEL = { system: 'System', light: 'Light', dark: 'Dark' };
    const themeToggle = document.getElementById('themeToggle');
    const darkMedia = window.matchMedia ? window.matchMedia('(prefers-color-scheme: dark)') : null;
    function currentThemeChoice() {
      const c = document.documentElement.getAttribute('data-theme-choice');
      return c === 'light' || c === 'dark' ? c : 'system';
    }
    function applyThemeChoice(choice) {
      const resolved = choice === 'system' ? (darkMedia && darkMedia.matches ? 'dark' : 'light') : choice;
      document.documentElement.setAttribute('data-theme', resolved);
      document.documentElement.setAttribute('data-theme-choice', choice);
      if (themeToggle) {
        const next = THEME_ORDER[(THEME_ORDER.indexOf(choice) + 1) % THEME_ORDER.length];
        themeToggle.setAttribute('aria-label', 'Theme: ' + THEME_LABEL[choice] + '. Switch to ' + THEME_LABEL[next] + '.');
        themeToggle.title = 'Theme: ' + THEME_LABEL[choice];
      }
      const meta = document.querySelector('meta[name="theme-color"]');
      if (meta) meta.setAttribute('content', resolved === 'dark' ? '#191d23' : '#f4f6f8');
      try {
        if (choice === 'system') localStorage.removeItem(THEME_KEY);
        else localStorage.setItem(THEME_KEY, choice);
      } catch (e) {}
    }
    if (themeToggle) {
      applyThemeChoice(currentThemeChoice());
      themeToggle.addEventListener('click', function () {
        applyThemeChoice(THEME_ORDER[(THEME_ORDER.indexOf(currentThemeChoice()) + 1) % THEME_ORDER.length]);
      });
    }
    if (darkMedia) {
      const onOsThemeChange = function () { if (currentThemeChoice() === 'system') applyThemeChoice('system'); };
      if (darkMedia.addEventListener) darkMedia.addEventListener('change', onOsThemeChange);
      else if (darkMedia.addListener) darkMedia.addListener(onOsThemeChange);
    }

    // Reading layer: on touch there's no hover, so a tap on a katakana unit
    // pins its romaji (`.kr-on`) and a tap anywhere else clears it. On desktop
    // the CSS :hover already handles it; a click just toggles the pin.
    document.addEventListener('click', function (event) {
      const kr = event.target.closest && event.target.closest('.kr');
      document.querySelectorAll('.kr.kr-on').forEach(function (el) { if (el !== kr) el.classList.remove('kr-on'); });
      if (kr) kr.classList.toggle('kr-on');
    });

    // Table icons: click a section's icon -> pick -> saved immediately, and
    // the chosen icon swaps in wherever that table shows (header + directory).
    function refreshTableIcon(id) {
      const tc = window.SakuraStudy.tableCustom, glyph = window.SakuraStudy.vocab.tableIconGlyph(id);
      const has = !!tc.iconOf(id);
      document.querySelectorAll('.section-icon-btn[data-icon-for="' + id + '"] .section-icon').forEach(function (slot) {
        slot.classList.toggle('section-icon-empty', !has);
        slot.innerHTML = glyph;
      });
      document.querySelectorAll('#tindexMenu a[data-target="' + id + '"]').forEach(function (a) {
        let el = a.querySelector('.tindex-icon');
        if (has) {
          if (!el) { el = document.createElement('span'); el.className = 'tindex-icon'; a.querySelector('.tindex-count').after(el); }
          el.innerHTML = glyph;
        } else if (el) { el.remove(); }
      });
    }
    document.addEventListener('click', function (event) {
      const btn = event.target.closest && event.target.closest('.section-icon-btn');
      if (!btn || !window.SakuraStudy.iconPicker) return;
      const id = btn.dataset.iconFor;
      window.SakuraStudy.iconPicker.open(window.SakuraStudy.tableCustom.iconOf(id), function (value) {
        window.SakuraStudy.tableCustom.setIcon(id, value);
        refreshTableIcon(id);
      }, btn);
    });

    // Landing view -- driven by the URL hash (#grammar, #table-15, …) so a
    // section or table can be linked to and survives a reload.
    routeFromHash();

    // Casual / polite: one page-wide switch. Verb tables carry both forms in the
    // markup; body.show-polite swaps which one is visible via CSS. Preference
    // persists client-side.
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
    updatePoliteVisibility();
  });
})();
