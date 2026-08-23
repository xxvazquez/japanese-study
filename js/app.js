
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

/* Final unified search and viewing controls. */
(function () {
  const input = document.getElementById('tableSearch');
  if (!input) return;
  const freshInput = input.cloneNode(true);
  input.replaceWith(freshInput);
  const count = document.getElementById('searchCount');
  const box = freshInput.closest('.search-box');
  const sections = [...document.querySelectorAll('.table-section')];
  function runSearch() {
    const q = freshInput.value.trim().toLocaleLowerCase();
    box.classList.toggle('has-value', Boolean(q));
    let rows = 0, tables = 0;
    sections.forEach(section => {
      let sectionRows = 0;
      section.querySelectorAll('tbody tr').forEach(row => {
        const match = !q || row.textContent.toLocaleLowerCase().includes(q);
        row.classList.toggle('search-hidden', !match);
        if (match) sectionRows++;
      });
      const visible = !q || sectionRows > 0;
      section.classList.toggle('search-hidden', !visible);
      if (visible && q) { tables++; rows += sectionRows; expandSection(section); }
    });
    count.textContent = q ? rows + ' matching row' + (rows === 1 ? '' : 's') + ' · ' + tables + ' table' + (tables === 1 ? '' : 's') : '';
  }
  freshInput.addEventListener('input', runSearch);
  document.getElementById('clearSearch').addEventListener('click', function () {
    freshInput.value = ''; runSearch(); freshInput.focus();
  });
  freshInput.addEventListener('keydown', function (event) {
    if (event.key === 'Enter') {
      const first = document.querySelector('.table-section:not(.search-hidden) tbody tr:not(.search-hidden)');
      if (first) first.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  });
  document.addEventListener('keydown', function (event) {
    if (event.key === '/' && !/input|textarea|select/i.test(document.activeElement.tagName)) {
      event.preventDefault(); freshInput.focus();
    } else if (event.key === 'Escape' && document.activeElement === freshInput) {
      freshInput.value = ''; runSearch(); freshInput.blur();
    }
  });
  document.querySelectorAll('.view-mode button').forEach(button => button.addEventListener('click', function () {
    const mode = button.dataset.mode;
    document.body.classList.remove('mode-japanese', 'mode-english');
    if (mode !== 'all') document.body.classList.add('mode-' + mode);
    document.querySelectorAll('.view-mode button').forEach(b => b.classList.toggle('active', b === button));
  }));
})();



function toggleSection(section) {
  section.classList.toggle('collapsed');
  const head=section.querySelector('.section-head');
  head.setAttribute('aria-expanded', String(!section.classList.contains('collapsed')));
}
function expandSection(section) {
  section.classList.remove('collapsed');
  section.querySelector('.section-head').setAttribute('aria-expanded','true');
}
function collapseAll() {
  document.querySelectorAll('.table-section').forEach(s=>{
    s.classList.add('collapsed');
    s.querySelector('.section-head').setAttribute('aria-expanded','false');
  });
}
function expandAll() {
  document.querySelectorAll('.table-section').forEach(expandSection);
}
function goToTable(i) {
  const section=document.querySelector(`.table-section[data-table="${i}"]`);
  if (!section) return;
  expandSection(section);
  section.scrollIntoView({behavior:'smooth',block:'start'});
  document.querySelectorAll('.category-dropdown a').forEach(a=>a.classList.remove('active'));
  const link=document.querySelector(`.category-dropdown a[data-target="${i}"]`);
  if(link) link.classList.add('active');
}
function updateNavOnScroll() {
  const sections=[...document.querySelectorAll('.table-section')];
  let current=sections[0];
  const y=window.scrollY+170;
  for(const sec of sections) if(sec.offsetTop<=y) current=sec;
  document.querySelectorAll('.category-dropdown a').forEach(a=>{
    a.classList.toggle('active', current && a.dataset.target===current.dataset.table);
  });
}
window.addEventListener('scroll',updateNavOnScroll,{passive:true});
window.addEventListener('load',updateNavOnScroll);

/* Search should open sections containing matches. */
document.addEventListener('DOMContentLoaded',()=>{
  const input=document.getElementById('tableSearch');
  if(input){
    input.addEventListener('input',()=>{
      setTimeout(()=>{
        const q=input.value.trim().toLowerCase();
        if(q){
          document.querySelectorAll('.table-section').forEach(sec=>{
            const rows=sec.querySelectorAll('tbody tr');
            const has=[...rows].some(r=>r.textContent.toLowerCase().includes(q));
            if(has) expandSection(sec);
          });
        }
      },0);
    });
  }
});



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



window.addEventListener('load', function () {
  const input = document.getElementById('tableSearch');
  if (!input) return;
  const clean = input.cloneNode(true);
  input.replaceWith(clean);
  const count = document.getElementById('searchCount');
  const box = clean.closest('.search-box');
  const sections = [...document.querySelectorAll('.table-section')];
  function search() {
    const q = clean.value.trim().toLocaleLowerCase();
    box.classList.toggle('has-value', !!q);
    let rows = 0, tables = 0;
    sections.forEach(section => {
      let hits = 0;
      section.querySelectorAll('tbody tr').forEach(row => {
        const ok = !q || row.textContent.toLocaleLowerCase().includes(q);
        row.classList.toggle('search-hidden', !ok);
        if (ok) hits++;
      });
      section.classList.toggle('search-hidden', !!q && !hits);
      if (q && hits) { rows += hits; tables++; expandSection(section); }
    });
    count.textContent = q ? rows + ' matching row' + (rows === 1 ? '' : 's') + ' · ' + tables + ' table' + (tables === 1 ? '' : 's') : '';
  }
  clean.addEventListener('input', search);
  document.getElementById('clearSearch').onclick = () => { clean.value = ''; search(); clean.focus(); };
  clean.onkeydown = event => {
    if (event.key === 'Enter') {
      const first = document.querySelector('.table-section:not(.search-hidden) tbody tr:not(.search-hidden)');
      if (first) first.scrollIntoView({behavior:'smooth', block:'center'});
    }
  };
  document.addEventListener('keydown', event => {
    if (event.key === '/' && !/INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName)) { event.preventDefault(); clean.focus(); }
    if (event.key === 'Escape' && document.activeElement === clean) { clean.value = ''; search(); clean.blur(); }
  });
});


// Render the vocabulary data after the page shell is ready.
document.addEventListener('DOMContentLoaded', function () {
  var host=document.getElementById('vocabulary');
  if (host && window.vocabularySections) host.innerHTML=window.vocabularySections.join('\n');
});

// CSP-safe delegated event wiring for generated vocabulary controls.
document.addEventListener("DOMContentLoaded", function () {
  document.querySelectorAll(".section-head").forEach(function (head) {
    head.addEventListener("click", function (event) {
      if (!event.target.closest("button, input, label")) toggleSection(head.parentElement);
    });
    head.addEventListener("keydown", function (event) {
      if (event.key === "Enter" || event.key === " ") { event.preventDefault(); toggleSection(head.parentElement); }
    });
  });
  document.querySelectorAll(".print-one").forEach(function (button) {
    button.addEventListener("click", function (event) { event.stopPropagation(); printOne(button.closest(".table-section").dataset.table); });
  });
  document.querySelectorAll(".sort-button").forEach(function (button) {
    button.addEventListener("click", function (event) { event.stopPropagation(); sortTableFromButton(button); });
  });
  document.querySelectorAll(".category-button").forEach(function (button) {
    button.addEventListener("click", function () { toggleCategory(button); });
  });
  document.querySelectorAll(".category-dropdown a").forEach(function (link) {
    link.addEventListener("click", function (event) { event.preventDefault(); goToTable(link.dataset.target); closeCategoryMenus(); });
  });
});
document.addEventListener("DOMContentLoaded", function () {
  document.querySelector(".toolbar .primary")?.addEventListener("click", printSelected);
  document.querySelector(".toolbar button:not(.primary)")?.addEventListener("click", printAll);
  document.querySelector(".nav-actions button:first-child")?.addEventListener("click", expandAll);
  document.querySelector(".nav-actions button:last-child")?.addEventListener("click", collapseAll);
});document.addEventListener("DOMContentLoaded", function () {
  document.querySelectorAll(".hide-section").forEach(function (button) {
    button.addEventListener("click", function (event) {
      event.stopPropagation();
      button.closest(".table-section").classList.add("section-hidden");
    });
  });
  document.querySelectorAll(".category-dropdown a[data-target]").forEach(function (link) {
    link.addEventListener("click", function () {
      var section = document.querySelector('.table-section[data-table="' + link.dataset.target + '"]');
      if (section) section.classList.remove("section-hidden");
    }, true);
  });
});
