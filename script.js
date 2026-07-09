// ============================================================
//  SARAWAK TALENTS – COMMUNITY DIRECTORY
//  Where top Sarawakian talents gather
// ============================================================

// ── TRANSLATIONS ─────────────────────────────────────────────
let currentLang = 'en';
const translations = {
  en: {
    heroLine1:         'Top Sarawakian',
    heroLine2:         'talents gather here',
    heroSubtitle:      'The coolest network for Sarawakians. Juh, kita ngerami sama-sama!',
    logIn:             'Log In',
    getStarted:        'Get Started',
    profile:           'Profile',
    editProfile:       'Edit profile',
    memberCount:       '+92',
    subtitle:          'Where top Sarawakian talents gather',
    searchPlaceholder: 'Search by name, role, or city...',
    allFields:         'All Fields',
    allBackgrounds:    'All Backgrounds',
    allIndustries:     'All Industries',
    allTypes:          'All Types',
    rosterTitle:       'Talent Directory',
    resultSingle:      'talent',
    resultPlural:      'talents',
    noFound:           'No talents found',
    noFoundSub:        'Try adjusting your search or filters.',
    filterBtn:         'Filter',
    featured:          'Featured',
    member:            'Member',
    statusLabel:       'Type',
    fieldLabel:        'Field',
    sortId:            'ID',
    sortName:          'Name A–Z',
    sortField:         'Field',
    sortZone:          'City',
    clearFilters:      'Clear all filters',
    copyright:         '\u00a9 2026 Sarawak Talents. All rights reserved.',
    privacy:           'Privacy Policy',
    terms:             'Terms of Service',
    exploreTitle:      'Explore the Community',
    exploreSubtitle:   'Drag or swipe the card \u2014 or use the arrows',
    featuresHeading:   'Meet the people building Sarawak.',
    featuresSubheading:'From students and entrepreneurs to volunteers and creators, discover the community shaping what\u2019s next.',
    feature1Title:     'Discover local talent',
    feature1Desc:      'Find inspiring people across different industries and communities.',
    feature2Title:     'Exchange your profile instantly',
    feature2Desc:      'A digital name card that\u2019s always up to date.',
    feature3Title:     'Stay connected',
    feature3Desc:      'Turn a quick introduction into a lasting connection.',
    prideTitle:        'Pride',
    prideDesc:         'Show off what you\u2019re building. Organisation badges available for Sarawak\u2019s very own.',
    industryBrowseHeading: 'Browse by industry',
  },
  ms: {
    heroLine1:         'Bakat Terbaik Sarawak',
    heroLine2:         'berkumpul di sini',
    heroSubtitle:      'Rangkaian paling hebat untuk orang Sarawak. Juh, kita ngerami sama-sama!',
    logIn:             'Log Masuk',
    getStarted:        'Mula',
    profile:           'Profil',
    editProfile:       'Edit profil',
    memberCount:       '+92',
    subtitle:          'Di mana bakat terbaik Sarawak berkumpul',
    searchPlaceholder: 'Cari mengikut nama, peranan, atau bandar...',
    allFields:         'Semua Bidang',
    allBackgrounds:    'Semua Latar Belakang',
    allIndustries:     'Semua Industri',
    allTypes:          'Semua Jenis',
    rosterTitle:       'Direktori Bakat',
    resultSingle:      'bakat',
    resultPlural:      'bakat',
    noFound:           'Tiada bakat dijumpai',
    noFoundSub:        'Cuba laraskan carian atau penapis anda.',
    filterBtn:         'Tapis',
    featured:          'Pilihan',
    member:            'Ahli',
    statusLabel:       'Jenis',
    fieldLabel:        'Bidang',
    sortId:            'ID',
    sortName:          'Nama A–Z',
    sortField:         'Bidang',
    sortZone:          'Bandar',
    clearFilters:      'Kosongkan semua penapis',
    copyright:         '\u00a9 2026 Sarawak Talents. Hak cipta terpelihara.',
    privacy:           'Dasar Privasi',
    terms:             'Terma Perkhidmatan',
    exploreTitle:      'Terokai Komuniti',
    exploreSubtitle:   'Seret atau leret kad \u2014 atau gunakan anak panah',
    featuresHeading:   'Kenali orang yang membina Sarawak.',
    featuresSubheading:'Dari pelajar dan usahawan kepada sukarelawan dan pencipta, terokai komuniti yang membentuk masa depan.',
    feature1Title:     'Temui bakat tempatan',
    feature1Desc:      'Cari individu inspiratif merentasi pelbagai industri dan komuniti.',
    feature2Title:     'Kongsi profil anda serta-merta',
    feature2Desc:      'Kad nama digital yang sentiasa dikemas kini.',
    feature3Title:     'Kekal berhubung',
    feature3Desc:      'Jadikan perkenalan ringkas sebagai hubungan yang berkekalan.',
    prideTitle:        'Kebanggaan',
    prideDesc:         'Tunjuk apa yang anda bina. Lencana organisasi tersedia untuk milik Sarawak sendiri.',
    industryBrowseHeading: 'Cari mengikut industri',
  }
};

function applyLang(lang) {
  currentLang = lang;
  const t = translations[lang];

  // Update all data-i18n text elements
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.getAttribute('data-i18n');
    if (t[key] !== undefined) el.textContent = t[key];
  });

  // Update placeholders
  document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
    const key = el.getAttribute('data-i18n-placeholder');
    if (t[key] !== undefined) el.placeholder = t[key];
  });

  // Update sort option labels
  document.querySelectorAll('.sort-option').forEach(btn => {
    const key = btn.getAttribute('data-i18n');
    if (key && t[key]) btn.textContent = t[key];
  });

  // Update all multi-select labels
  if (typeof partyMS      !== 'undefined') partyMS.updateLabel();
  if (typeof parliamentMS !== 'undefined') parliamentMS.updateLabel();
  if (typeof statusMS     !== 'undefined') statusMS.relabel([
    { value: 'featured', label: t.featured },
    { value: 'member',   label: t.member },
  ]);

  // Update lang toggle aria-selected (pill position handled by initLangTabs)
  document.getElementById('lang-en').setAttribute('aria-selected', lang === 'en' ? 'true' : 'false');
  document.getElementById('lang-ms').setAttribute('aria-selected', lang === 'ms' ? 'true' : 'false');

  render();
}

const candidates = [
  { id: 1, dun_no: "T01", name: "Aaron Nagai",     dun: "Software Engineer", party: "Tech",     zone: "Kuching", parliamentary: "Software Development",    orgPhoto: "photos/badges/sarawak-energy-icon.svg" },
  { id: 2, dun_no: "T02", name: "Raden Hollywood", dun: "Musician",          party: "Arts",     zone: "Miri",    parliamentary: "Performing Arts",         orgPhoto: "photos/badges/air-borneo-icon.svg" },
  { id: 3, dun_no: "T03", name: "Andrea Livlo",    dun: "Entrepreneur",      party: "Business", zone: "Sibu",    parliamentary: "Startups & Commerce",     orgPhoto: "photos/badges/petros-icon.svg" },
  { id: 4, dun_no: "T04", name: "Aniq Ashwin",     dun: "Researcher",        party: "Science",  zone: "Bintulu", parliamentary: "Research & Innovation",   orgPhoto: "photos/badges/sarawakmetro-icon.svg" },
];

const members = new Set(['T02']);

function candidatePhoto(c) {
  if (c.avatar_url) return c.avatar_url;
  return `photos/user${c.id}.png`;
}

// Stable ordering key: live rows carry _seq; demo rows fall back to numeric id.
function seqOf(c) {
  return c._seq !== undefined ? c._seq : c.id;
}

const partyColours = {
  Tech:     { bg: '#f0fdfa', text: '#0d9488', border: '#99f6e4', dot: '#14b8a6' },
  Arts:     { bg: '#fff7ed', text: '#c2410c', border: '#fed7aa', dot: '#f97316' },
  Business: { bg: '#eff6ff', text: '#1e40af', border: '#bfdbfe', dot: '#3b82f6' },
  Science:  { bg: '#f0fdf4', text: '#15803d', border: '#bbf7d0', dot: '#16a34a' },
};

// DOM references
const grid             = document.getElementById('candidate-grid');
const emptyState       = document.getElementById('empty-state');
const searchInput      = document.getElementById('search-input');
const resultCount = document.getElementById('result-count');
const clearBtn    = document.getElementById('clear-filters');

// --- transitions.dev dropdown helpers ---
function dropdownIsOpen(el) {
  return el && el.classList.contains('is-open');
}

function toggleDropdownEl(el) {
  if (dropdownIsOpen(el)) Transitions.closeDropdown(el);
  else Transitions.openDropdown(el);
}

function closeAllFilterDropdowns() {
  ['party-dropdown', 'parliament-dropdown', 'status-dropdown'].forEach(id => {
    const el = document.getElementById(id);
    if (dropdownIsOpen(el)) Transitions.closeDropdown(el);
  });
}

// --- Filter panel accordion ---
function toggleFilters() {
  const panel = document.getElementById('filter-panel');
  const toggle = document.getElementById('filter-toggle');
  const open = panel.getAttribute('data-open') === 'true';
  panel.setAttribute('data-open', String(!open));
  if (toggle) toggle.setAttribute('aria-expanded', String(!open));
}

// --- Sort dropdown ---
const sortDropdown = document.getElementById('sort-dropdown');
const sortToggle   = document.getElementById('sort-toggle');

function toggleSort() {
  toggleDropdownEl(sortDropdown);
}

// --- Filter badge ---
function updateFilterBadge() {
  const badge = document.getElementById('filter-badge');
  if (!badge) return;
  const active =
    selectedParties.size > 0 ||
    selectedParliaments.size > 0 ||
    selectedStatuses.size > 0;
  const wasOpen = badge.getAttribute('data-open') === 'true';
  badge.setAttribute('data-open', active ? 'true' : 'false');
  badge.setAttribute('aria-hidden', active ? 'false' : 'true');
  if (active && !wasOpen) {
    badge.style.animation = 'none';
    void badge.offsetWidth;
    badge.style.animation = '';
  }
}

// --- Generic multi-select factory ---
// values passed to populate() can be plain strings OR {value, label} objects
function makeMultiSelect({ btnId, dropdownId, optionsId, labelId, allKey }) {
  const selected   = new Set();
  const labelMap   = {};  // value → display label
  const btn        = document.getElementById(btnId);
  const dropdown   = document.getElementById(dropdownId);
  const optionsEl  = document.getElementById(optionsId);
  const label      = document.getElementById(labelId);

  function updateLabel() {
    if (selected.size === 0) {
      label.textContent = translations[currentLang][allKey] || allKey;
      label.classList.replace('text-gray-700', 'text-gray-500');
    } else {
      label.textContent = [...selected].map(v => labelMap[v] || v).join(', ');
      label.classList.replace('text-gray-500', 'text-gray-700');
    }
  }

  btn.addEventListener('click', e => {
    e.stopPropagation();
    closeAllFilterDropdowns();
    if (dropdownIsOpen(dropdown)) Transitions.closeDropdown(dropdown);
    else Transitions.openDropdown(dropdown);
  });
  document.addEventListener('click', e => {
    if (!btn.contains(e.target) && !dropdown.contains(e.target) && dropdownIsOpen(dropdown)) {
      Transitions.closeDropdown(dropdown);
    }
  });

  function populate(values) {
    values.forEach(item => {
      const value = typeof item === 'object' ? item.value : item;
      const text  = typeof item === 'object' ? item.label : item;
      labelMap[value] = text;
      const lbl = document.createElement('label');
      lbl.className = 'flex items-center gap-2 px-3 py-2 hover:bg-gray-50 cursor-pointer text-sm text-gray-700';
      const cb = document.createElement('input');
      cb.type = 'checkbox'; cb.value = value; cb.dataset.labelKey = typeof item === 'object' ? item.labelKey || '' : '';
      cb.className = 'accent-teal-500 cursor-pointer';
      cb.addEventListener('change', () => {
        if (cb.checked) selected.add(value); else selected.delete(value);
        updateLabel();
        if (typeof updateFilterBadge === 'function') updateFilterBadge();
        render();
      });
      const textNode = document.createTextNode(text);
      lbl.appendChild(cb);
      lbl.appendChild(textNode);
      optionsEl.appendChild(lbl);
    });
  }

  function relabel(newItems) {
    // Update displayed text when language changes (for translated labels)
    newItems.forEach(item => {
      const value = item.value;
      const text  = item.label;
      labelMap[value] = text;
      const cb = optionsEl.querySelector(`input[value="${value}"]`);
      if (cb && cb.nextSibling) cb.nextSibling.textContent = text;
    });
    updateLabel();
  }

  function clear() {
    selected.clear();
    optionsEl.querySelectorAll('input[type="checkbox"]').forEach(cb => cb.checked = false);
    updateLabel();
  }

  return { selected, populate, relabel, clear, updateLabel };
}

const partyMS      = makeMultiSelect({ btnId: 'party-filter-btn',      dropdownId: 'party-dropdown',      optionsId: 'party-options',      labelId: 'party-filter-label',      allKey: 'allFields' });
const parliamentMS = makeMultiSelect({ btnId: 'parliament-filter-btn', dropdownId: 'parliament-dropdown', optionsId: 'parliament-options',  labelId: 'parliament-filter-label', allKey: 'allIndustries' });
const statusMS     = makeMultiSelect({ btnId: 'status-filter-btn',     dropdownId: 'status-dropdown',     optionsId: 'status-options',      labelId: 'status-filter-label',     allKey: 'allTypes' });

const selectedParties     = partyMS.selected;
const selectedParliaments = parliamentMS.selected;
const selectedStatuses    = statusMS.selected;

// --- Populate dynamic filter options ---
function populateFilters() {
  const catOrder = { Tech: 0, Arts: 1, Business: 2, Science: 3, Community: 4, Other: 5 };
  const parties = [...new Set(candidates.map(c => c.party).filter(Boolean))]
    .sort((a, b) => (catOrder[a] ?? 99) - (catOrder[b] ?? 99) || a.localeCompare(b));
  partyMS.populate(parties.length ? parties : ['Tech', 'Arts', 'Business', 'Science']);

  const parliaments = [...new Set(candidates.map(c => c.parliamentary))].sort();
  parliamentMS.populate(parliaments);

  const t = translations[currentLang];
  statusMS.populate([
    { value: 'featured', label: t.featured },
    { value: 'member',   label: t.member },
  ]);
}
populateFilters();

// --- Helper: Get Initials ---
function getInitials(name) {
  const clean = name.replace(/Datuk Patinggi Tan Sri|Datuk Patinggi|Datuk Amar|Datuk Sri|Datuk Seri|Datuk|Dato Sri|Dato'|Dato|Tan Sri|Tun|Dr |Ir |Datu /gi, '').trim();
  const parts = clean.split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return parts[0].slice(0, 2).toUpperCase();
}

// --- Card Builder ---
function cardGradientClass(party) {
  const map = { Tech: 'tech', Arts: 'arts', Business: 'business', Science: 'science' };
  return `card-gradient-${map[party] || 'tech'}`;
}

function buildCard(c) {
  // Live profiles become links to their own name-card page; demo cards stay divs.
  const card = document.createElement(c.username ? 'a' : 'div');
  card.className = 'talent-card no-underline text-current flex items-center gap-3 sm:gap-4 p-3 sm:p-4 bg-white rounded-xl border border-gray-100 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 cursor-pointer';
  if (c.username) card.href = ST_SITE.profile(c.username, false);
  card.style.animation = 'fadeUp 0.3s ease both';
  card.dataset.id = c.id;

  card.innerHTML = `
    <div class="shrink-0 w-12 h-12 sm:w-14 sm:h-14 rounded-full overflow-hidden bg-gray-100">
      <img src="${candidatePhoto(c)}"
           alt=""
           class="w-full h-full object-cover transition-opacity duration-300 opacity-0"
           loading="lazy"
           onload="this.classList.remove('opacity-0')"
           onerror="this.style.display='none';" />
    </div>
    <div class="min-w-0 flex-1">
      <div class="flex items-center gap-1.5 min-w-0">
        <p class="font-semibold text-gray-900 text-sm sm:text-base leading-tight truncate">${c.name}</p>
        <re-icon icon="verified" size="18" weight="filled" class="talent-verified-icon${c.id === 1 ? ' talent-verified-icon--gold' : ''} shrink-0" aria-hidden="true"></re-icon>
        ${(c.orgPhotos && c.orgPhotos.length ? c.orgPhotos : (c.orgPhoto ? [c.orgPhoto] : [])).slice(0, 3).map(b => `<span class="talent-org-badge shrink-0" aria-hidden="true"><img src="${ST_SITE.asset(b)}" alt="" loading="lazy" /></span>`).join('')}
      </div>
      <p class="talent-sub text-xs sm:text-sm text-gray-500 mt-0.5 truncate">${c.dun}</p>
    </div>
  `;
  return card;
}

let currentSort = 'dun';

const partyOrder = { Tech: 0, Arts: 1, Business: 2, Science: 3 };

// --- Render Logic ---
function render() {
  const q = searchInput.value.toLowerCase().trim();

  const filtered = candidates.filter(c => {
    const matchParty      = selectedParties.size     === 0 || selectedParties.has(c.party);
    const matchParliament = selectedParliaments.size === 0 || selectedParliaments.has(c.parliamentary);
    const isMember    = members.has(c.dun_no);
    const matchStatus     = selectedStatuses.size    === 0 ||
      (selectedStatuses.has('member')   && isMember) ||
      (selectedStatuses.has('featured') && !isMember);
    const party = (c.party || '').toLowerCase();
    const matchSearch = !q ||
      c.name.toLowerCase().includes(q) ||
      c.dun.toLowerCase().includes(q)  ||
      c.dun_no.toLowerCase().includes(q) ||
      c.parliamentary.toLowerCase().includes(q) ||
      (party && (party.includes(q) || q.includes(party)));
    return matchParty && matchParliament && matchStatus && matchSearch;
  });

  filtered.sort((a, b) => {
    if (currentSort === 'name')  return a.name.localeCompare(b.name);
    if (currentSort === 'party') return (partyOrder[a.party] ?? 99) - (partyOrder[b.party] ?? 99) || seqOf(a) - seqOf(b);
    if (currentSort === 'zone')  return a.zone.localeCompare(b.zone) || seqOf(a) - seqOf(b);
    return seqOf(a) - seqOf(b); // default order
  });

  grid.innerHTML = '';
  const t = translations[currentLang];
  resultCount.textContent = `${filtered.length} ${filtered.length !== 1 ? t.resultPlural : t.resultSingle}`;

  if (filtered.length === 0) {
    emptyState.classList.remove('hidden');
    emptyState.classList.add('flex');
  } else {
    emptyState.classList.add('hidden');
    emptyState.classList.remove('flex');
    filtered.forEach((c, i) => {
      const card = buildCard(c);
      card.style.animationDelay = `${Math.min(i * 0.03, 0.5)}s`;
      grid.appendChild(card);
    });
  }

}

// Event Listeners
searchInput.addEventListener('input', render);
document.querySelectorAll('.sort-option').forEach(btn => {
  btn.addEventListener('click', () => {
    currentSort = btn.dataset.sort;
    document.querySelectorAll('.sort-option').forEach(b => b.classList.remove('text-brand-600', 'font-semibold'));
    btn.classList.add('text-brand-600', 'font-semibold');
    if (dropdownIsOpen(sortDropdown)) Transitions.closeDropdown(sortDropdown);
    render();
  });
});

function clearAllFilters() {
  searchInput.value = '';
  partyMS.clear();
  parliamentMS.clear();
  statusMS.clear();
  if (typeof updateFilterBadge === 'function') updateFilterBadge();
  render();
}

clearBtn.addEventListener('click', clearAllFilters);
document.getElementById('clear-filters-panel')?.addEventListener('click', clearAllFilters);

document.getElementById('filter-toggle')?.addEventListener('click', toggleFilters);
sortToggle?.addEventListener('click', e => { e.stopPropagation(); toggleSort(); });
document.addEventListener('click', e => {
  if (sortToggle && sortDropdown && !sortToggle.contains(e.target) && !sortDropdown.contains(e.target) && dropdownIsOpen(sortDropdown)) {
    Transitions.closeDropdown(sortDropdown);
  }
});

// Language tabs — sliding pill
function initLangTabs() {
  const bar = document.querySelector('.footer-lang-pill.t-tabs');
  if (!bar) return;
  const pill = bar.querySelector('.t-tabs-pill');
  const tabs = [...bar.querySelectorAll('.t-tab')];

  function moveTo(tab, animate) {
    if (!pill || !tab) return;
    if (!animate) {
      const prev = pill.style.transition;
      pill.style.transition = 'none';
      pill.style.transform = `translateX(${tab.offsetLeft}px)`;
      pill.style.width = `${tab.offsetWidth}px`;
      void pill.offsetWidth;
      pill.style.transition = prev;
    } else {
      pill.style.transform = `translateX(${tab.offsetLeft}px)`;
      pill.style.width = `${tab.offsetWidth}px`;
    }
  }

  const active = () => tabs.find(t => t.getAttribute('aria-selected') === 'true') || tabs[0];

  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      const lang = tab.id === 'lang-en' ? 'en' : 'ms';
      tabs.forEach(t => t.setAttribute('aria-selected', t === tab ? 'true' : 'false'));
      applyLang(lang);
      moveTo(tab, true);
    });
  });

  requestAnimationFrame(() => moveTo(active(), false));
  window.addEventListener('resize', () => moveTo(active(), false));
}

initLangTabs();

// ── Theme toggle ─────────────────────────────────────────────
const moonIcon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" width="16" height="16"><path fill-rule="evenodd" d="M9.528 1.718a.75.75 0 0 1 .162.819A8.97 8.97 0 0 0 9 6a9 9 0 0 0 9 9 8.97 8.97 0 0 0 3.463-.69.75.75 0 0 1 .981.98 10.503 10.503 0 0 1-9.694 6.46c-5.799 0-10.5-4.7-10.5-10.5 0-4.368 2.667-8.112 6.46-9.694a.75.75 0 0 1 .818.162Z" clip-rule="evenodd"/></svg>`;
const sunIcon  = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" width="16" height="16"><path d="M12 2.25a.75.75 0 0 1 .75.75v2.25a.75.75 0 0 1-1.5 0V3a.75.75 0 0 1 .75-.75ZM7.5 12a4.5 4.5 0 1 1 9 0 4.5 4.5 0 0 1-9 0ZM18.894 6.166a.75.75 0 0 0-1.06-1.06l-1.591 1.59a.75.75 0 1 0 1.06 1.061l1.591-1.59ZM21.75 12a.75.75 0 0 1-.75.75h-2.25a.75.75 0 0 1 0-1.5H21a.75.75 0 0 1 .75.75ZM17.834 18.894a.75.75 0 0 0 1.06-1.06l-1.59-1.591a.75.75 0 1 0-1.061 1.06l1.59 1.591ZM12 18a.75.75 0 0 1 .75.75V21a.75.75 0 0 1-1.5 0v-2.25A.75.75 0 0 1 12 18ZM7.758 17.303a.75.75 0 0 0-1.061-1.06l-1.591 1.59a.75.75 0 0 0 1.06 1.061l1.591-1.59ZM6 12a.75.75 0 0 1-.75.75H3a.75.75 0 0 1 0-1.5h2.25A.75.75 0 0 1 6 12ZM6.697 7.757a.75.75 0 0 0 1.06-1.06l-1.59-1.591a.75.75 0 0 0-1.061 1.06l1.59 1.591Z"/></svg>`;

function applyTheme(dark) {
  document.documentElement.classList.toggle('dark', dark);
  const btn = document.getElementById('theme-toggle');
  if (btn) btn.innerHTML = dark ? sunIcon : moonIcon;
  localStorage.setItem('theme', dark ? 'dark' : 'light');
  const themeMeta = document.querySelector('meta[name="theme-color"]');
  if (themeMeta) themeMeta.content = dark ? '#0a0a0a' : '#f3f4f6';
}

document.getElementById('theme-toggle').addEventListener('click', () => {
  applyTheme(!document.documentElement.classList.contains('dark'));
});

applyTheme(localStorage.getItem('theme') === 'dark');

// Initial run
render();

// ── Candidate Modal ──────────────────────────────────────────
function openModal(c) {
  const col   = partyColours[c.party] || { bg: '#f3f4f6', text: '#374151', border: '#e5e7eb', dot: '#6b7280' };

  const modalBg = document.getElementById('modal-bg');
  modalBg.className = `modal-bg ${cardGradientClass(c.party)}`;
  modalBg.style.background = '';
  modalBg.textContent = '';

  const photo = document.getElementById('modal-photo');
  photo.style.display = '';
  photo.src = candidatePhoto(c);
  photo.onerror = () => { photo.style.display = 'none'; };

  const dunBadge   = document.getElementById('modal-dun-badge');
  const partyBadge = document.getElementById('modal-party-badge');
  const badgeStyle = `background:white;color:${col.text};border:1px solid ${col.border}`;
  dunBadge.textContent   = c.dun_no;   dunBadge.style.cssText   = badgeStyle;
  partyBadge.textContent = c.party;    partyBadge.style.cssText = badgeStyle;

  document.getElementById('modal-name').textContent            = c.name;
  document.getElementById('modal-dun-label').textContent       = c.dun;
  document.getElementById('modal-detail-party').textContent    = c.party;
  document.getElementById('modal-detail-zone').textContent     = c.zone;
  document.getElementById('modal-detail-parliament').textContent = c.parliamentary;

  const t = translations[currentLang];
  const isMember = members.has(c.dun_no);
  const statusEl = document.getElementById('modal-detail-status');
  statusEl.textContent = isMember ? t.member : t.featured;
  statusEl.className = `text-[11px] font-semibold ${isMember ? 'text-orange-500' : 'text-emerald-600'}`;

  const backdrop = document.getElementById('candidate-modal');
  const card = backdrop.querySelector('.modal-card');
  backdrop.classList.add('is-open');
  Transitions.openModal(card);
  document.body.style.overflow = 'hidden';
}

function closeModal() {
  const backdrop = document.getElementById('candidate-modal');
  if (!backdrop.classList.contains('is-open')) return;
  const card = backdrop.querySelector('.modal-card');
  backdrop.classList.remove('is-open');
  Transitions.closeModal(card, () => {
    document.body.style.overflow = '';
  });
}

// Open on grid card click
document.getElementById('candidate-grid').addEventListener('click', e => {
  const cardEl = e.target.closest('[data-id]');
  if (!cardEl) return;
  if (cardEl.tagName === 'A') return;   // live cards navigate to their own URL
  const c = candidates.find(x => String(x.id) === cardEl.dataset.id);
  if (c) openModal(c);
});

// Close handlers
document.getElementById('modal-close').addEventListener('click', closeModal);
document.getElementById('candidate-modal').addEventListener('click', e => {
  if (e.target === document.getElementById('candidate-modal')) closeModal();
});
document.addEventListener('keydown', e => { if (e.key === 'Escape') closeModal(); });

Transitions.initAvatarGroup('.hero-proof .t-avatar-group');

// ── Auth entry points ────────────────────────────────────────────────
// "Get Started" → invite-only join flow. "Log In" → straight to sign-in.
// For signed-in members these become "Profile" and "Edit profile".
let loginTarget = ST_SITE.join('mode=login');
let getStartedTarget = ST_SITE.join();
document.querySelectorAll('.hero-nav-btn--get-started').forEach(btn => {
  btn.addEventListener('click', () => { window.location.href = getStartedTarget; });
});
document.querySelectorAll('.hero-nav-btn--login').forEach(btn => {
  btn.addEventListener('click', () => { window.location.href = loginTarget; });
});

// ── Sticky header: transparent over the hero photo, frosted once the
//    user scrolls past the hero and into the content below. ────────────
(function initStickyHeader() {
  const header = document.getElementById('site-header');
  const hero = document.querySelector('.hero');
  if (!header) return;
  const threshold = () => (hero ? hero.offsetHeight - 72 : 320);
  let ticking = false;
  const update = () => {
    header.classList.toggle('is-scrolled', window.scrollY > threshold());
    ticking = false;
  };
  window.addEventListener('scroll', () => {
    if (!ticking) { ticking = true; requestAnimationFrame(update); }
  }, { passive: true });
  update();
})();

// ── Live data from Supabase (falls back to demo data) ────────────────
function mapProfile(p, i) {
  return {
    id: p.id,
    dun_no: p.username ? '@' + p.username : '',
    username: p.username || '',
    name: p.name,
    dun: p.role || '',
    party: p.category || 'Other',
    zone: p.location || '',
    parliamentary: p.industry || '',
    orgPhoto: p.org_photo || '',
    orgPhotos: (p.org_photos && p.org_photos.length) ? p.org_photos : (p.org_photo ? [p.org_photo] : []),
    avatar_url: p.avatar_url || '',
    _seq: i
  };
}

// Fetch the public list from the edge-cached worker when DIRECTORY_API is set
// (collapses many visitors into one origin query). Returns null on any failure
// so the caller falls back to querying Supabase directly.
async function fetchDirectoryFromEdge() {
  const url = window.ST_CONFIG && window.ST_CONFIG.DIRECTORY_API;
  if (!url) return null;
  try {
    const res = await fetch(url, { headers: { Accept: 'application/json' } });
    if (!res.ok) return null;
    return await res.json();
  } catch (_) {
    return null;
  }
}

async function loadProfiles() {
  if (!window.ST_CONFIGURED || !window.stSupabase) return;   // keep demo data
  try {
    let data = await fetchDirectoryFromEdge();
    if (!data) {
      const res = await window.stSupabase
        .from('profiles')
        .select('id, username, name, role, category, location, industry, background, avatar_url, org_photo, org_photos, created_at')
        .eq('status', 'active')
        .order('created_at', { ascending: true });
      if (res.error) { console.warn('[directory] load failed:', res.error.message); return; }
      data = res.data;
    }
    if (!data || data.length === 0) return;                  // keep demo until first member
    candidates.length = 0;
    data.forEach((p, i) => candidates.push(mapProfile(p, i)));
    members.clear();
    populateFilters();
    render();
  } catch (e) {
    console.warn('[directory] load error:', e);
  }
}

// Signed-in members: "Log In" → "Edit profile", "Get Started" → "Profile".
async function reflectAuthState() {
  if (!window.ST_CONFIGURED || !window.stSupabase) return;
  const { data: { session } } = await window.stSupabase.auth.getSession();
  if (!session) return;
  const { data: prof } = await window.stSupabase
    .from('profiles').select('id, username').eq('id', session.user.id).maybeSingle();
  if (!prof) return;
  loginTarget = ST_SITE.join('mode=edit');
  document.querySelectorAll('.hero-nav-btn--login').forEach(btn => {
    btn.setAttribute('data-i18n', 'editProfile');
    btn.textContent = (translations[currentLang] || translations.en).editProfile;
  });
  if (prof.username) {
    getStartedTarget = ST_SITE.profile(prof.username, false);
    document.querySelectorAll('.hero-nav-btn--get-started').forEach(btn => {
      btn.setAttribute('data-i18n', 'profile');
      btn.textContent = (translations[currentLang] || translations.en).profile;
    });
  }
}

loadProfiles();
reflectAuthState();

// ── Browse by industry (homepage quick-pick chips) ─────────────────────
// Reuses the free-text search (which matches on industry and, now, field/
// category too) rather than the exact-match multi-select, since industry
// values are user-typed and won't always line up with the canonical list
// one-for-one — this will get sharper as more profiles pick from the new
// industry suggestions in the join/edit form instead of typing free text.
(() => {
  const row = document.getElementById('industry-chip-row');
  if (!row || !window.ST_INDUSTRIES_FEATURED) return;

  window.ST_INDUSTRIES_FEATURED.forEach(name => {
    const chip = document.createElement('button');
    chip.type = 'button';
    chip.className = 'industry-chip';
    chip.textContent = name;
    chip.dataset.query = name;
    row.appendChild(chip);
  });

  row.addEventListener('click', e => {
    const chip = e.target.closest('.industry-chip');
    if (!chip) return;
    const already = chip.classList.contains('is-active');
    row.querySelectorAll('.industry-chip').forEach(c => c.classList.remove('is-active'));
    if (already) {
      searchInput.value = '';
    } else {
      chip.classList.add('is-active');
      searchInput.value = chip.dataset.query;
    }
    render();
    searchInput.scrollIntoView({ behavior: 'smooth', block: 'center' });
  });
})();

