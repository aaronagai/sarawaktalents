// ============================================================
//  GPS SARAWAK – ELECTION CANDIDATES DASHBOARD
//  Data: 12th Sarawak State Election (December 18, 2021)
// ============================================================

// ── TRANSLATIONS ─────────────────────────────────────────────
let currentLang = 'en';
const translations = {
  en: {
    heroElection:      'PRN-13 \u00b7 Sarawak State Election',
    statCandidates:    'Candidates',
    statParties:       'Parties',
    statParliaments:   'Parliament Areas',
    subtitle:          'State Election Candidate Directory',
    searchPlaceholder: 'Search by Candidate Name or DUN...',
    allParties:        'All Parties',
    allRaces:          'All Races',
    allParliaments:    'All Parliaments',
    allStatuses:       'All Statuses',
    rosterTitle:       'Candidate Roster',
    resultSingle:      'candidate',
    resultPlural:      'candidates',
    noFound:           'No candidates found',
    noFoundSub:        'Try adjusting your search or filters.',
    filterBtn:         'Filter',
    incumbent:         'Incumbent',
    challenger:        'Challenger',
    statusLabel:       'Status',
sortDun:           'DUN No',
    sortName:          'Name A–Z',
    sortParty:         'Party',
    sortZone:          'Zone',
    clearFilters:      'Clear all filters',
    copyright:         '\u00a9 2026 TeamGPS. All rights reserved.',
    privacy:           'Privacy Policy',
    terms:             'Terms of Service',
    marquee:           '🗳️ Welcome to the GPS PRN-13 Candidate Directory · 👥 Explore all 82 candidates · 🏛️ Sarawak State Election 2026 · 🌐 Powered by keteq.xyz · ',
    disclaimer:        'This website compiles public data on the candidates of Gabungan Parti Sarawak (GPS) for the 13th Sarawak State Election. Developed by @aaronagai and open-sourced on GitHub.',
    exploreTitle:      'Explore the Roster',
    exploreSubtitle:   'Drag or swipe the card \u2014 or use the arrows',
  },
  ms: {
    heroElection:      'PRN-13 \u00b7 Pilihan Raya Negeri Sarawak',
    statCandidates:    'Calon',
    statParties:       'Parti',
    statParliaments:   'Kawasan Parlimen',
    subtitle:          'Direktori Calon Pilihan Raya Negeri',
    searchPlaceholder: 'Cari mengikut Nama Calon atau DUN...',
    allParties:        'Semua Parti',
    allRaces:          'Semua Kaum',
    allParliaments:    'Semua Parlimen',
    allStatuses:       'Semua Status',
    rosterTitle:       'Senarai Calon',
    resultSingle:      'calon',
    resultPlural:      'calon',
    noFound:           'Tiada calon dijumpai',
    noFoundSub:        'Cuba laraskan carian atau penapis anda.',
    filterBtn:         'Tapis',
    incumbent:         'Penyandang',
    challenger:        'Penentang',
    statusLabel:       'Status',
sortDun:           'No. DUN',
    sortName:          'Nama A–Z',
    sortParty:         'Parti',
    sortZone:          'Zon',
    clearFilters:      'Kosongkan semua penapis',
    copyright:         '\u00a9 2026 TeamGPS. Hak cipta terpelihara.',
    privacy:           'Dasar Privasi',
    terms:             'Terma Perkhidmatan',
    marquee:           '🗳️ Selamat datang ke Direktori Calon GPS PRN-13 · 👥 Terokai kesemua 82 calon · 🏛️ Pilihan Raya Negeri Sarawak 2026 · 🌐 Dikuasakan oleh keteq.xyz · ',
    disclaimer:        'Laman web ini mengumpul data awam berkenaan calon Gabungan Parti Sarawak (GPS) untuk Pilihan Raya Negeri Sarawak ke-13. Dibangunkan oleh @aaronagai dan dikongsi di GitHub.',
    exploreTitle:      'Terokai Senarai Calon',
    exploreSubtitle:   'Seret atau leret kad \u2014 atau gunakan anak panah',
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

  // Update marquee (needs text duplicated for seamless loop)
  const marqueeEl = document.getElementById('marquee-text');
  if (marqueeEl && t.marquee) marqueeEl.textContent = t.marquee + t.marquee;

  // Update disclaimer (keep links intact via innerHTML)
  const disclaimerEl = document.getElementById('hero-disclaimer');
  if (disclaimerEl && t.disclaimer) {
    const links = disclaimerEl.querySelectorAll('a');
    const xHref = links[0]?.href;
    const ghHref = links[1]?.href;
    disclaimerEl.innerHTML = t.disclaimer
      .replace('@aaronagai', `<a href="${xHref}" target="_blank" rel="noopener noreferrer" class="underline hover:text-gray-600 transition-colors">@aaronagai</a>`)
      .replace('GitHub', `<a href="${ghHref}" target="_blank" rel="noopener noreferrer" class="underline hover:text-gray-600 transition-colors">GitHub</a>`);
  }

  // Update sort option labels
  document.querySelectorAll('.sort-option').forEach(btn => {
    const key = btn.getAttribute('data-i18n');
    if (key && t[key]) btn.textContent = t[key];
  });

  // Update all multi-select labels
  if (typeof partyMS      !== 'undefined') partyMS.updateLabel();
  if (typeof raceMS       !== 'undefined') raceMS.updateLabel();
  if (typeof parliamentMS !== 'undefined') parliamentMS.updateLabel();
  if (typeof statusMS     !== 'undefined') statusMS.relabel([
    { value: 'incumbent',  label: t.incumbent },
    { value: 'challenger', label: t.challenger },
  ]);

  // Update toggle button styles
  const activeClass   = 'px-3 py-1 rounded-full text-xs font-semibold transition-colors bg-white text-gray-900 shadow-sm';
  const inactiveClass = 'px-3 py-1 rounded-full text-xs font-semibold transition-colors text-white/60 hover:text-white';
  document.getElementById('lang-en').className = lang === 'en' ? activeClass : inactiveClass;
  document.getElementById('lang-ms').className = lang === 'ms' ? activeClass : inactiveClass;

  render();
}

const candidates = [
  // ── KUCHING ──────────────────────────────────────────────
  { id: 1,  dun_no: "N01", name: "Billy Sujang",                                  dun: "Opar",          party: "SUPP", zone: "Kuching",   parliamentary: "P192 Mas Gading",      race: "Bidayuh"   },
  { id: 2,  dun_no: "N02", name: "Datuk Henry Harry Jinep",                       dun: "Tasik Biru",    party: "PDP",  zone: "Kuching",   parliamentary: "P192 Mas Gading",      race: "Bidayuh"   },
  { id: 3,  dun_no: "N03", name: "Azizul Annuar Adenan",                          dun: "Tanjung Datu",  party: "PBB",  zone: "Kuching",   parliamentary: "P193 Santubong",       race: "Malay"     },
  { id: 4,  dun_no: "N04", name: "Datuk Dr Abdul Rahman Junaidi",                 dun: "Pantai Damai",  party: "PBB",  zone: "Kuching",   parliamentary: "P193 Santubong",       race: "Malay"     },
  { id: 5,  dun_no: "N05", name: "Datuk Dr Hazland Abang Hipni",                  dun: "Demak Laut",    party: "PBB",  zone: "Kuching",   parliamentary: "P193 Santubong",       race: "Malay"     },
  { id: 6,  dun_no: "N06", name: "Dato Fazzrudin Abdul Rahman",                   dun: "Tupong",        party: "PBB",  zone: "Kuching",   parliamentary: "P194 Petra Jaya",      race: "Malay"     },
  { id: 7,  dun_no: "N07", name: "Datuk Sharifah Hasidah Sayeed",                 dun: "Samariang",     party: "PBB",  zone: "Kuching",   parliamentary: "P194 Petra Jaya",      race: "Malay"     },
  { id: 8,  dun_no: "N08", name: "Datuk Ibrahim Baki",                            dun: "Satok",         party: "PBB",  zone: "Kuching",   parliamentary: "P194 Petra Jaya",      race: "Malay"     },
  { id: 9,  dun_no: "N09", name: "Datuk Wee Hong Seng",                           dun: "Padungan",      party: "SUPP", zone: "Kuching",   parliamentary: "P195 Bandar Kuching",  race: "Chinese"   },
  { id: 10, dun_no: "N10", name: "Milton Foo",                                    dun: "Pending",       party: "SUPP", zone: "Kuching",   parliamentary: "P195 Bandar Kuching",  race: "Chinese"   },
  { id: 11, dun_no: "N11", name: "Sih Hua Tong",                                  dun: "Batu Lintang",  party: "SUPP", zone: "Kuching",   parliamentary: "P195 Bandar Kuching",  race: "Chinese"   },
  { id: 12, dun_no: "N12", name: "Yap Yau Sin",                                   dun: "Kota Sentosa",  party: "SUPP", zone: "Kuching",   parliamentary: "P196 Stampin",         race: "Chinese"   },
  { id: 13, dun_no: "N13", name: "Dato Lo Khere Chiang",                          dun: "Batu Kitang",   party: "SUPP", zone: "Kuching",   parliamentary: "P196 Stampin",         race: "Chinese"   },
  { id: 14, dun_no: "N14", name: "Datuk Amar Dr Sim Kui Hian",                    dun: "Batu Kawa",     party: "SUPP", zone: "Kuching",   parliamentary: "P196 Stampin",         race: "Chinese"   },

  // ── SAMARAHAN ─────────────────────────────────────────────
  { id: 15, dun_no: "N15", name: "Dato Sri Abd Karim Rahman Hamzah",              dun: "Asajaya",       party: "PBB",  zone: "Samarahan", parliamentary: "P197 Kota Samarahan",  race: "Malay"     },
  { id: 16, dun_no: "N16", name: "Dato Idris Buang",                              dun: "Muara Tuang",   party: "PBB",  zone: "Samarahan", parliamentary: "P197 Kota Samarahan",  race: "Malay"     },
  { id: 17, dun_no: "N17", name: "Datuk Hamzah Brahim",                           dun: "Stakan",        party: "PBB",  zone: "Samarahan", parliamentary: "P197 Kota Samarahan",  race: "Malay"     },
  { id: 18, dun_no: "N18", name: "Dato Miro Simuh",                               dun: "Serembu",       party: "PBB",  zone: "Samarahan", parliamentary: "P198 Puncak Borneo",   race: "Bidayuh"   },
  { id: 19, dun_no: "N19", name: "Datuk Jerip Susil",                             dun: "Mambong",       party: "PBB",  zone: "Samarahan", parliamentary: "P198 Puncak Borneo",   race: "Bidayuh"   },
  { id: 20, dun_no: "N20", name: "Dato Sri Roland Sagah Wee Inn",                 dun: "Tarat",         party: "PBB",  zone: "Samarahan", parliamentary: "P198 Puncak Borneo",   race: "Bidayuh"   },
  { id: 21, dun_no: "N21", name: "Dr Simon Sinang Bada",                          dun: "Tebedu",        party: "PBB",  zone: "Samarahan", parliamentary: "P199 Serian",          race: "Bidayuh"   },
  { id: 22, dun_no: "N22", name: "Datuk Martin Ben",                              dun: "Kedup",         party: "PBB",  zone: "Samarahan", parliamentary: "P199 Serian",          race: "Bidayuh"   },
  { id: 23, dun_no: "N23", name: "John Ilus",                                     dun: "Bukit Semuja",  party: "PBB",  zone: "Samarahan", parliamentary: "P199 Serian",          race: "Bidayuh"   },
  { id: 24, dun_no: "N24", name: "Datuk Aidel Lariwoo",                           dun: "Sadong Jaya",   party: "PBB",  zone: "Samarahan", parliamentary: "P200 Batang Sadong",   race: "Malay"     },
  { id: 25, dun_no: "N25", name: "Awla Dris",                                     dun: "Simunjan",      party: "PBB",  zone: "Samarahan", parliamentary: "P200 Batang Sadong",   race: "Malay"     },
  { id: 26, dun_no: "N26", name: "Datuk Patinggi Tan Sri (Dr) Abang Haji Abdul Rahman Zohari bin Tun Datuk Abang Haji Openg", dun: "Gedong",        party: "PBB",  zone: "Samarahan", parliamentary: "P200 Batang Sadong",   race: "Malay"     },
  { id: 27, dun_no: "N27", name: "Dato Sri Julaihi Narawi",                       dun: "Sebuyau",       party: "PBB",  zone: "Samarahan", parliamentary: "P201 Batang Lupar",    race: "Malay"     },
  { id: 28, dun_no: "N28", name: "Dayang Noorazah Awang Sohor",                   dun: "Lingga",        party: "PBB",  zone: "Samarahan", parliamentary: "P201 Batang Lupar",    race: "Malay"     },
  { id: 29, dun_no: "N29", name: "Razaili Gapor",                                 dun: "Beting Maro",   party: "PBB",  zone: "Samarahan", parliamentary: "P201 Batang Lupar",    race: "Malay"     },

  // ── SRI AMAN ──────────────────────────────────────────────
  { id: 30, dun_no: "N30", name: "Datuk Snowdan Lawan",                           dun: "Balai Ringin",  party: "PRS",  zone: "Sri Aman",  parliamentary: "P202 Sri Aman",        race: "Iban"      },
  { id: 31, dun_no: "N31", name: "Datuk Mong Dagang",                             dun: "Bukit Begunan", party: "PRS",  zone: "Sri Aman",  parliamentary: "P202 Sri Aman",        race: "Iban"      },
  { id: 32, dun_no: "N32", name: "Datuk Francis Harden Hollis",                   dun: "Simanggang",    party: "SUPP", zone: "Sri Aman",  parliamentary: "P202 Sri Aman",        race: "Iban"      },
  { id: 33, dun_no: "N33", name: "Desmond Sateng Sanjan",                         dun: "Engkilili",     party: "SUPP", zone: "Sri Aman",  parliamentary: "P203 Lubok Antu",      race: "Iban"      },
  { id: 34, dun_no: "N34", name: "Datuk Dr Malcolm Mussen Lamoh",                 dun: "Batang Ai",     party: "PRS",  zone: "Sri Aman",  parliamentary: "P203 Lubok Antu",      race: "Iban"      },

  // ── BETONG ────────────────────────────────────────────────
  { id: 35, dun_no: "N35", name: "Datuk Ricky Mohammad Razi Sitam",               dun: "Saribas",       party: "PBB",  zone: "Betong",    parliamentary: "P204 Betong",          race: "Malay"     },
  { id: 36, dun_no: "N36", name: "Datuk Gerald Rentap Jabu",                      dun: "Layar",         party: "PBB",  zone: "Betong",    parliamentary: "P204 Betong",          race: "Iban"      },
  { id: 37, dun_no: "N37", name: "Datuk Amar Douglas Uggah Ambas",                dun: "Bukit Saban",   party: "PBB",  zone: "Betong",    parliamentary: "P204 Betong",          race: "Iban"      },
  { id: 38, dun_no: "N38", name: "Mohamad Duri",                                  dun: "Kalaka",        party: "PBB",  zone: "Betong",    parliamentary: "P205 Saratok",         race: "Malay"     },
  { id: 39, dun_no: "N39", name: "Friday Belik",                                  dun: "Krian",         party: "PDP",  zone: "Betong",    parliamentary: "P205 Saratok",         race: "Iban"      },
  { id: 40, dun_no: "N40", name: "Dato Mohd Chee Kadir",                          dun: "Kabong",        party: "PBB",  zone: "Betong",    parliamentary: "P205 Saratok",         race: "Malay"     },

  // ── SARIKEI ───────────────────────────────────────────────
  { id: 41, dun_no: "N41", name: "Datuk Len Talif Salleh",                        dun: "Kuala Rajang",  party: "PBB",  zone: "Sarikei",   parliamentary: "P206 Tanjong Manis",   race: "Melanau"   },
  { id: 42, dun_no: "N42", name: "Datuk Abdullah Saidol",                         dun: "Semop",         party: "PBB",  zone: "Sarikei",   parliamentary: "P206 Tanjong Manis",   race: "Melanau"   },
  { id: 43, dun_no: "N43", name: "Dr Safiee Ahmad",                               dun: "Daro",          party: "PBB",  zone: "Sarikei",   parliamentary: "P207 Igan",            race: "Malay"     },
  { id: 44, dun_no: "N44", name: "Dato Dr Juanda Jaya",                           dun: "Jemoreng",      party: "PBB",  zone: "Sarikei",   parliamentary: "P207 Igan",            race: "Melanau"   },
  { id: 45, dun_no: "N45", name: "Dato Sri Huang Tiong Sii",                      dun: "Repok",         party: "SUPP", zone: "Sarikei",   parliamentary: "P208 Sarikei",         race: "Chinese"   },
  { id: 46, dun_no: "N46", name: "Datuk Ding Kong Hiing",                         dun: "Meradong",      party: "SUPP", zone: "Sarikei",   parliamentary: "P208 Sarikei",         race: "Chinese"   },
  { id: 47, dun_no: "N47", name: "Tan Sri William Mawan Ekom",                    dun: "Pakan",         party: "PBB",  zone: "Sarikei",   parliamentary: "P209 Julau",           race: "Iban"      },
  { id: 48, dun_no: "N48", name: "Dato Rolland Duat Jubin",                       dun: "Meluan",        party: "PDP",  zone: "Sarikei",   parliamentary: "P209 Julau",           race: "Iban"      },
  { id: 49, dun_no: "N49", name: "Anyi Jana",                                     dun: "Ngemah",        party: "PRS",  zone: "Sarikei",   parliamentary: "P210 Kanowit",         race: "Iban"      },

  // ── SIBU ──────────────────────────────────────────────────
  { id: 50, dun_no: "N50", name: "Allan Siden Gramong",                           dun: "Machan",        party: "PBB",  zone: "Sibu",      parliamentary: "P210 Kanowit",         race: "Iban"      },
  { id: 51, dun_no: "N51", name: "Chieng Jin Ek",                                 dun: "Bukit Assek",   party: "SUPP", zone: "Sibu",      parliamentary: "P211 Lanang",          race: "Chinese"   },
  { id: 52, dun_no: "N52", name: "Dato Sri Tiong King Sing",                      dun: "Dudong",        party: "PDP",  zone: "Sibu",      parliamentary: "P211 Lanang",          race: "Chinese"   },
  { id: 53, dun_no: "N53", name: "Robert Lau Hui Yew",                            dun: "Bawang Assan",  party: "SUPP", zone: "Sibu",      parliamentary: "P212 Sibu",            race: "Chinese"   },
  { id: 54, dun_no: "N54", name: "Datuk Michael Tiang Ming Tee",                  dun: "Pelawan",       party: "SUPP", zone: "Sibu",      parliamentary: "P212 Sibu",            race: "Chinese"   },
  { id: 55, dun_no: "N55", name: "Datuk Dr Annuar Rapaee",                        dun: "Nangka",        party: "PBB",  zone: "Sibu",      parliamentary: "P212 Sibu",            race: "Malay"     },
  { id: 56, dun_no: "N56", name: "Dato Sri Fatimah Abdullah",                     dun: "Dalat",         party: "PBB",  zone: "Sibu",      parliamentary: "P213 Mukah",           race: "Melanau"   },
  { id: 57, dun_no: "N57", name: "Royston Valentine",                             dun: "Tellian",       party: "PBB",  zone: "Sibu",      parliamentary: "P213 Mukah",           race: "Melanau"   },
  { id: 58, dun_no: "N58", name: "Abdul Yakub Arbi",                              dun: "Balingian",     party: "PBB",  zone: "Sibu",      parliamentary: "P213 Mukah",           race: "Melanau"   },

  // ── KAPIT ─────────────────────────────────────────────────
  { id: 59, dun_no: "N59", name: "Christopher Gira Sambang",                      dun: "Tamin",         party: "PRS",  zone: "Kapit",     parliamentary: "P214 Selangau",        race: "Iban"      },
  { id: 60, dun_no: "N60", name: "Dato Sri John Sikie Tayai",                     dun: "Kakus",         party: "PRS",  zone: "Kapit",     parliamentary: "P214 Selangau",        race: "Iban"      },
  { id: 61, dun_no: "N61", name: "Wilson Nyabong Ijang",                          dun: "Pelagus",       party: "PRS",  zone: "Kapit",     parliamentary: "P215 Kapit",           race: "Iban"      },
  { id: 62, dun_no: "N62", name: "Lidam Assan",                                   dun: "Katibas",       party: "PBB",  zone: "Kapit",     parliamentary: "P215 Kapit",           race: "Iban"      },
  { id: 63, dun_no: "N63", name: "Jefferson Jamit Unyat",                         dun: "Bukit Goram",   party: "PBB",  zone: "Kapit",     parliamentary: "P215 Kapit",           race: "Iban"      },
  { id: 64, dun_no: "N64", name: "Nicholas Kudi Jantai Masing",                   dun: "Baleh",         party: "PRS",  zone: "Kapit",     parliamentary: "P216 Hulu Rajang",     race: "Iban"      },
  { id: 65, dun_no: "N65", name: "Datuk Liwan Lagang",                            dun: "Belaga",        party: "PRS",  zone: "Kapit",     parliamentary: "P216 Hulu Rajang",     race: "Iban"      },
  { id: 66, dun_no: "N66", name: "Kennedy Chukpai Ugon",                          dun: "Murum",         party: "PRS",  zone: "Kapit",     parliamentary: "P216 Hulu Rajang",     race: "Orang Ulu" },

  // ── BINTULU ───────────────────────────────────────────────
  { id: 67, dun_no: "N67", name: "Iskandar Turkee",                               dun: "Jepak",         party: "PBB",  zone: "Bintulu",   parliamentary: "P217 Bintulu",         race: "Malay"     },
  { id: 68, dun_no: "N68", name: "Johnny Pang Leong Ming",                        dun: "Tanjong Batu",  party: "SUPP", zone: "Bintulu",   parliamentary: "P217 Bintulu",         race: "Chinese"   },
  { id: 69, dun_no: "N69", name: "Dato Sri Dr Stephen Rundi Utom",                dun: "Kemena",        party: "PBB",  zone: "Bintulu",   parliamentary: "P217 Bintulu",         race: "Iban"      },
  { id: 70, dun_no: "N70", name: "Datuk Majang Renggi",                           dun: "Samalaju",      party: "PRS",  zone: "Bintulu",   parliamentary: "P217 Bintulu",         race: "Iban"      },

  // ── MIRI ──────────────────────────────────────────────────
  { id: 71, dun_no: "N71", name: "Datuk Rosey Yunus",                             dun: "Bekenu",        party: "PBB",  zone: "Miri",      parliamentary: "P218 Sibuti",          race: "Malay"     },
  { id: 72, dun_no: "N72", name: "Datuk Dr Ripin Lamat",                          dun: "Lambir",        party: "PBB",  zone: "Miri",      parliamentary: "P218 Sibuti",          race: "Malay"     },
  { id: 73, dun_no: "N73", name: "Datuk Sebastian Ting Chiew Yew",                dun: "Piasau",        party: "SUPP", zone: "Miri",      parliamentary: "P219 Miri",            race: "Chinese"   },
  { id: 74, dun_no: "N74", name: "Adam Yii Siew Sang",                            dun: "Pujut",         party: "SUPP", zone: "Miri",      parliamentary: "P219 Miri",            race: "Chinese"   },
  { id: 75, dun_no: "N75", name: "Dato Sri Lee Kim Shin",                         dun: "Senadin",       party: "SUPP", zone: "Miri",      parliamentary: "P219 Miri",            race: "Chinese"   },
  { id: 76, dun_no: "N76", name: "Datuk Dr Penguang Manggil",                     dun: "Marudi",        party: "PDP",  zone: "Miri",      parliamentary: "P220 Baram",           race: "Iban"      },
  { id: 77, dun_no: "N77", name: "Dato Dennis Ngau",                              dun: "Telang Usan",   party: "PBB",  zone: "Miri",      parliamentary: "P220 Baram",           race: "Orang Ulu" },
  { id: 78, dun_no: "N78", name: "Datuk Gerawat Gala",                            dun: "Mulu",          party: "PBB",  zone: "Miri",      parliamentary: "P220 Baram",           race: "Orang Ulu" },
  { id: 79, dun_no: "N79", name: "Datuk Dr Abdul Rahman Ismail",                  dun: "Bukit Kota",    party: "PBB",  zone: "Miri",      parliamentary: "P221 Limbang",         race: "Malay"     },
  { id: 80, dun_no: "N80", name: "Dato Paulus Palu Gumbang",                      dun: "Batu Danau",    party: "PBB",  zone: "Miri",      parliamentary: "P221 Limbang",         race: "Orang Ulu" },
  { id: 81, dun_no: "N81", name: "Sam Jaya",                                      dun: "Ba'Kelalan",    party: "PDP",  zone: "Miri",      parliamentary: "P222 Lawas",           race: "Orang Ulu" },
  { id: 82, dun_no: "N82", name: "Datuk Amar Awang Tengah Ali Hassan",            dun: "Bukit Sari",    party: "PBB",  zone: "Miri",      parliamentary: "P222 Lawas",           race: "Malay"     },
];

const challengers = new Set(['N09', 'N10']);

const partyColours = {
  PBB:  { bg: '#fef2f2', text: '#dc2626', border: '#fecaca', dot: '#ef4444' },
  SUPP: { bg: '#fefce8', text: '#a16207', border: '#fde68a', dot: '#ca8a04' },
  PRS:  { bg: '#f0fdf4', text: '#15803d', border: '#bbf7d0', dot: '#16a34a' },
  PDP:  { bg: '#eff6ff', text: '#1e40af', border: '#bfdbfe', dot: '#3b82f6' },
};

// DOM references
const grid             = document.getElementById('candidate-grid');
const emptyState       = document.getElementById('empty-state');
const searchInput      = document.getElementById('search-input');
const resultCount = document.getElementById('result-count');
const clearBtn    = document.getElementById('clear-filters');

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

  btn.addEventListener('click', e => { e.stopPropagation(); dropdown.classList.toggle('hidden'); });
  document.addEventListener('click', e => {
    if (!btn.contains(e.target) && !dropdown.contains(e.target)) dropdown.classList.add('hidden');
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

const partyMS      = makeMultiSelect({ btnId: 'party-filter-btn',      dropdownId: 'party-dropdown',      optionsId: 'party-options',      labelId: 'party-filter-label',      allKey: 'allParties' });
const raceMS       = makeMultiSelect({ btnId: 'race-filter-btn',       dropdownId: 'race-dropdown',       optionsId: 'race-options',        labelId: 'race-filter-label',       allKey: 'allRaces' });
const parliamentMS = makeMultiSelect({ btnId: 'parliament-filter-btn', dropdownId: 'parliament-dropdown', optionsId: 'parliament-options',  labelId: 'parliament-filter-label', allKey: 'allParliaments' });
const statusMS     = makeMultiSelect({ btnId: 'status-filter-btn',     dropdownId: 'status-dropdown',     optionsId: 'status-options',      labelId: 'status-filter-label',     allKey: 'allStatuses' });

const selectedParties     = partyMS.selected;
const selectedRaces       = raceMS.selected;
const selectedParliaments = parliamentMS.selected;
const selectedStatuses    = statusMS.selected;

// --- Populate dynamic filter options ---
function populateFilters() {
  partyMS.populate(['PBB', 'SUPP', 'PRS', 'PDP']);

  const races = [...new Set(candidates.map(c => c.race).filter(r => r !== 'N/A'))].sort();
  raceMS.populate(races);

  const parliaments = [...new Set(candidates.map(c => c.parliamentary))].sort();
  parliamentMS.populate(parliaments);

  const t = translations[currentLang];
  statusMS.populate([
    { value: 'incumbent',  label: t.incumbent },
    { value: 'challenger', label: t.challenger },
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
function buildCard(c) {
  const col = partyColours[c.party] || partyColours.PBB;
  const initials = getInitials(c.name);

  const card = document.createElement('div');
  card.className = 'bg-white rounded-xl border border-gray-100 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 cursor-pointer';
  card.style.animation = 'fadeUp 0.3s ease both';
  card.dataset.id = c.id;

  card.innerHTML = `
    <div class="aspect-square flex items-center justify-center relative overflow-hidden rounded-t-xl" style="background-color: ${col.bg};">
      <img src="photos/${c.dun_no}.jpg"
           class="absolute inset-0 w-full h-full object-cover object-center transition-opacity duration-300 opacity-0"
           loading="lazy"
           onload="this.classList.remove('opacity-0')"
           onerror="this.style.display='none';" />
      <div class="w-8 h-8 sm:w-16 sm:h-16 rounded-full flex items-center justify-center text-sm sm:text-2xl font-semibold" style="background-color: ${col.dot}; color: white;">
        ${initials}
      </div>
      <span class="absolute top-1 left-1 sm:top-3 sm:left-3 text-[8px] sm:text-xs font-semibold px-1 sm:px-2 py-0.5 rounded-full border" style="background-color: ${col.bg}; color: ${col.text}; border-color: ${col.border};">${c.dun_no}</span>
      <span class="absolute top-1 right-1 sm:top-3 sm:right-3 text-[8px] sm:text-xs font-semibold px-1 sm:px-2 py-0.5 rounded-full border" style="background-color: ${col.bg}; color: ${col.text}; border-color: ${col.border};">
        ${c.party}
      </span>
    </div>
    <div class="p-1.5 sm:p-4">
      <p class="font-semibold text-gray-900 text-xs sm:text-sm leading-snug">${c.name}</p>
      <p class="text-[11px] sm:text-xs font-medium mt-0.5 sm:mt-1 text-gray-400">${c.dun}</p>
      <span class="inline-block mt-1 text-[9px] sm:text-[10px] font-semibold ${challengers.has(c.dun_no) ? 'text-orange-500' : 'text-emerald-600'}">
        ${challengers.has(c.dun_no) ? translations[currentLang].challenger : translations[currentLang].incumbent}
      </span>
    </div>
  `;
  return card;
}

let currentSort = 'dun';

const partyOrder = { PBB: 0, SUPP: 1, PRS: 2, PDP: 3 };


// --- Render Logic ---
function render() {
  const q = searchInput.value.toLowerCase().trim();

  const filtered = candidates.filter(c => {
    const matchParty      = selectedParties.size     === 0 || selectedParties.has(c.party);
    const matchParliament = selectedParliaments.size === 0 || selectedParliaments.has(c.parliamentary);
    const matchRace       = selectedRaces.size       === 0 || selectedRaces.has(c.race);
    const isChallenger    = challengers.has(c.dun_no);
    const matchStatus     = selectedStatuses.size    === 0 ||
      (selectedStatuses.has('challenger') && isChallenger) ||
      (selectedStatuses.has('incumbent')  && !isChallenger);
    const matchSearch = !q ||
      c.name.toLowerCase().includes(q) ||
      c.dun.toLowerCase().includes(q)  ||
      c.dun_no.toLowerCase().includes(q) ||
      c.parliamentary.toLowerCase().includes(q) ||
      c.race.toLowerCase().includes(q);
    return matchParty && matchParliament && matchRace && matchStatus && matchSearch;
  });

  filtered.sort((a, b) => {
    if (currentSort === 'name')  return a.name.localeCompare(b.name);
    if (currentSort === 'party') return (partyOrder[a.party] ?? 99) - (partyOrder[b.party] ?? 99) || a.id - b.id;
    if (currentSort === 'zone')  return a.zone.localeCompare(b.zone) || a.id - b.id;
    return a.id - b.id; // default: dun
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
    document.getElementById('sort-dropdown').classList.add('hidden');
    render();
  });
});

function clearAllFilters() {
  searchInput.value = '';
  partyMS.clear();
  raceMS.clear();
  parliamentMS.clear();
  statusMS.clear();
  if (typeof updateFilterBadge === 'function') updateFilterBadge();
  render();
}

clearBtn.addEventListener('click', clearAllFilters);
document.getElementById('clear-filters-panel')?.addEventListener('click', clearAllFilters);

// Language toggle
document.getElementById('lang-en').addEventListener('click', () => applyLang('en'));
document.getElementById('lang-ms').addEventListener('click', () => applyLang('ms'));

// ── DARK MODE ─────────────────────────────────────────────
const moonIcon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" width="16" height="16"><path fill-rule="evenodd" d="M9.528 1.718a.75.75 0 0 1 .162.819A8.97 8.97 0 0 0 9 6a9 9 0 0 0 9 9 8.97 8.97 0 0 0 3.463-.69.75.75 0 0 1 .981.98 10.503 10.503 0 0 1-9.694 6.46c-5.799 0-10.5-4.7-10.5-10.5 0-4.368 2.667-8.112 6.46-9.694a.75.75 0 0 1 .818.162Z" clip-rule="evenodd"/></svg>`;
const sunIcon  = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" width="16" height="16"><path d="M12 2.25a.75.75 0 0 1 .75.75v2.25a.75.75 0 0 1-1.5 0V3a.75.75 0 0 1 .75-.75ZM7.5 12a4.5 4.5 0 1 1 9 0 4.5 4.5 0 0 1-9 0ZM18.894 6.166a.75.75 0 0 0-1.06-1.06l-1.591 1.59a.75.75 0 1 0 1.06 1.061l1.591-1.59ZM21.75 12a.75.75 0 0 1-.75.75h-2.25a.75.75 0 0 1 0-1.5H21a.75.75 0 0 1 .75.75ZM17.834 18.894a.75.75 0 0 0 1.06-1.06l-1.59-1.591a.75.75 0 1 0-1.061 1.06l1.59 1.591ZM12 18a.75.75 0 0 1 .75.75V21a.75.75 0 0 1-1.5 0v-2.25A.75.75 0 0 1 12 18ZM7.758 17.303a.75.75 0 0 0-1.061-1.06l-1.591 1.59a.75.75 0 0 0 1.06 1.061l1.591-1.59ZM6 12a.75.75 0 0 1-.75.75H3a.75.75 0 0 1 0-1.5h2.25A.75.75 0 0 1 6 12ZM6.697 7.757a.75.75 0 0 0 1.06-1.06l-1.59-1.591a.75.75 0 0 0-1.061 1.06l1.59 1.591Z"/></svg>`;

function applyTheme(dark) {
  document.documentElement.classList.toggle('dark', dark);
  const btn = document.getElementById('theme-toggle');
  if (btn) btn.innerHTML = dark ? sunIcon : moonIcon;
  localStorage.setItem('theme', dark ? 'dark' : 'light');
}

document.getElementById('theme-toggle').addEventListener('click', () => {
  applyTheme(!document.documentElement.classList.contains('dark'));
});

const savedTheme = localStorage.getItem('theme');
applyTheme(savedTheme ? savedTheme === 'dark' : window.matchMedia('(prefers-color-scheme: dark)').matches);

// Initial run
render();
initSwipeStack();

// ── Candidate Modal ──────────────────────────────────────────
function openModal(c) {
  const col   = partyColours[c.party] || { bg: '#f3f4f6', text: '#374151', border: '#e5e7eb', dot: '#6b7280' };
  const color = col.dot;
  const initials = getInitials(c.name);

  document.getElementById('modal-bg').style.background = color;
  document.getElementById('modal-bg').textContent = initials;

  const photo = document.getElementById('modal-photo');
  photo.style.display = '';
  photo.src = `photos/${c.dun_no}.jpg`;
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
  document.getElementById('modal-detail-race').textContent     = c.race;

  const t = translations[currentLang];
  const isChallenger = challengers.has(c.dun_no);
  const statusEl = document.getElementById('modal-detail-status');
  statusEl.textContent = isChallenger ? t.challenger : t.incumbent;
  statusEl.className = `text-[11px] font-semibold ${isChallenger ? 'text-orange-500' : 'text-emerald-600'}`;

  document.getElementById('candidate-modal').classList.add('is-open');
  document.body.style.overflow = 'hidden';
}

function closeModal() {
  document.getElementById('candidate-modal').classList.remove('is-open');
  document.body.style.overflow = '';
}

// Open on grid card click
document.getElementById('candidate-grid').addEventListener('click', e => {
  const cardEl = e.target.closest('[data-id]');
  if (!cardEl) return;
  const c = candidates.find(x => x.id === +cardEl.dataset.id);
  if (c) openModal(c);
});

// Close handlers
document.getElementById('modal-close').addEventListener('click', closeModal);
document.getElementById('candidate-modal').addEventListener('click', e => {
  if (e.target === document.getElementById('candidate-modal')) closeModal();
});
document.addEventListener('keydown', e => { if (e.key === 'Escape') closeModal(); });

// ── Swipe Stack ─────────────────────────────────────────────
function initSwipeStack() {
  const stackEl   = document.getElementById('card-stack');
  const indicator = document.getElementById('stack-indicator');
  const prevBtn   = document.getElementById('stack-prev');
  const nextBtn   = document.getElementById('stack-next');
  if (!stackEl) return;

  const total = candidates.length;
  let currentIdx = candidates.findIndex(c => c.dun_no === 'N26');

  const PARTY_COLOR = { PBB: '#dc2626', SUPP: '#ca8a04', PRS: '#16a34a', PDP: '#3b82f6' };

  // Preload images into browser cache so cards appear instantly
  const _preloaded = new Set();
  function preloadImage(dunNo) {
    const src = `photos/${dunNo}.jpg`;
    if (_preloaded.has(src)) return;
    _preloaded.add(src);
    const img = new Image();
    img.src = src;
  }
  function preloadAround(idx) {
    for (let i = -2; i <= 5; i++) {
      preloadImage(candidates[(idx + i + total) % total].dun_no);
    }
  }

  function buildSwipeCard(c, pos) {
    const color = PARTY_COLOR[c.party] || '#6b7280';
    const col   = partyColours[c.party] || { bg: '#f3f4f6', text: '#374151', border: '#e5e7eb' };
    const initials = getInitials(c.name);
    const div = document.createElement('div');
    div.className   = 'swipe-card';
    div.dataset.pos = pos;
    div.innerHTML = `
      <div class="swipe-card-bg" style="background:${color}">
        <span class="swipe-card-initials">${initials}</span>
      </div>
      <img src="photos/${c.dun_no}.jpg" class="swipe-card-photo transition-opacity duration-300 opacity-0" loading="eager" onload="this.classList.remove('opacity-0')" onerror="this.style.display='none';" />
      <span class="swipe-card-dun-badge" style="background:white;color:${col.text};border:1px solid ${col.border}">${c.dun_no}</span>
      <span class="swipe-card-party-badge" style="background:white;color:${col.text};border:1px solid ${col.border}">${c.party}</span>
      <div class="swipe-card-overlay">
        <div class="swipe-card-overlay-name">${c.name}</div>
        <div class="swipe-card-overlay-dun">${c.dun}</div>
      </div>
    `;
    // If image already cached, show it immediately (onload won't fire for cached images in some browsers)
    const img = div.querySelector('.swipe-card-photo');
    if (img.complete && img.naturalWidth > 0) img.classList.remove('opacity-0');
    return div;
  }

  function renderStack() {
    stackEl.innerHTML = '';
    const prev = (currentIdx - 1 + total) % total;
    const next = (currentIdx + 1) % total;
    // Render back-to-front so the front card sits on top
    stackEl.appendChild(buildSwipeCard(candidates[next], 2)); // right peek
    stackEl.appendChild(buildSwipeCard(candidates[prev], 1)); // left peek
    stackEl.appendChild(buildSwipeCard(candidates[currentIdx], 0)); // front
    addDrag(stackEl.querySelector('[data-pos="0"]'));
    indicator.textContent = `${currentIdx + 1} of ${total}`;
    preloadAround(currentIdx);
  }

  let isAnimating = false;

  function advance(dir) {
    if (isAnimating) return;
    isAnimating = true;

    const leftCard  = stackEl.querySelector('[data-pos="1"]');
    const rightCard = stackEl.querySelector('[data-pos="2"]');
    const frontCard = stackEl.querySelector('[data-pos="0"]');
    const exitMs    = 200;
    const advancingCard = dir === 1 ? rightCard : leftCard;
    const exitingCard   = dir === 1 ? leftCard  : rightCard;
    const exitSign      = dir === 1 ? -1 : 1;

    if (frontCard) {
      frontCard.style.zIndex     = '5';
      frontCard.style.transition = `transform ${exitMs}ms cubic-bezier(0.4,0,1,1), opacity ${exitMs*0.7}ms ease`;
      frontCard.style.transform  = `translateX(${exitSign * window.innerWidth * 1.3}px)`;
      frontCard.style.opacity    = '0';
    }
    if (exitingCard) {
      exitingCard.style.zIndex     = '4';
      exitingCard.style.transition = `transform ${exitMs*0.8}ms cubic-bezier(0.4,0,1,1), opacity ${exitMs*0.6}ms ease`;
      exitingCard.style.transform  = `translateX(${exitSign * window.innerWidth * 1.2}px) rotate(${exitSign * -8}deg)`;
      exitingCard.style.opacity    = '0';
    }
    if (advancingCard) {
      advancingCard.style.zIndex     = '6';
      advancingCard.dataset.pos      = '0';
      advancingCard.style.transition = `transform ${exitMs*0.9}ms cubic-bezier(0.25,0.46,0.45,0.94)`;
      advancingCard.style.transform  = `translateX(0) translateY(0) rotate(0deg) scale(1)`;
    }

    currentIdx = (currentIdx + dir + total) % total;
    indicator.textContent = `${currentIdx + 1} of ${total}`;
    preloadAround(currentIdx);

    setTimeout(() => {
      frontCard?.remove();
      exitingCard?.remove();
      if (advancingCard && advancingCard.parentNode === stackEl) {
        advancingCard.style.transition = 'none';
        advancingCard.style.animation  = 'none';
        advancingCard.style.transform  = 'translateX(0) translateY(0) rotate(0deg) scale(1)';
        advancingCard.style.zIndex     = '3';
        addDrag(advancingCard);
        const newPrevIdx = (currentIdx - 1 + total) % total;
        const newNextIdx = (currentIdx + 1) % total;
        const newLeft  = buildSwipeCard(candidates[newPrevIdx], 1);
        const newRight = buildSwipeCard(candidates[newNextIdx], 2);
        stackEl.insertBefore(newRight, advancingCard);
        stackEl.insertBefore(newLeft,  newRight);
      } else {
        renderStack();
      }
      isAnimating = false;
    }, exitMs + 50);
  }

  function addDrag(card) {
    let startX = 0, startY = 0, deltaX = 0;
    let lastX = 0, lastTime = 0, velocityX = 0;
    let isDragging = false, rafId = null;

    function getBgCards() {
      return {
        left:  stackEl.querySelector('[data-pos="1"]'),
        right: stackEl.querySelector('[data-pos="2"]'),
      };
    }

    function updateBgCards(dx) {
      const progress = Math.min(Math.abs(dx) / 120, 1);
      const { left, right } = getBgCards();
      if (dx < 0) {
        // Dragging left: right (next) advances to center, left (prev) hides
        if (right) {
          const sc = 0.92 + 0.08 * progress;
          right.style.transform = `translateX(${44 * (1 - progress)}px) translateY(0px) rotate(0deg) scale(${sc})`;
          right.style.opacity   = '';
        }
        if (left) {
          left.style.opacity = `${Math.max(0, 1 - progress * 5)}`;
        }
      } else if (dx > 0) {
        // Dragging right: left (prev) advances to center, right (next) hides
        if (left) {
          const sc = 0.92 + 0.08 * progress;
          left.style.transform = `translateX(${-44 * (1 - progress)}px) translateY(0px) rotate(0deg) scale(${sc})`;
          left.style.opacity   = '';
        }
        if (right) {
          right.style.opacity = `${Math.max(0, 1 - progress * 5)}`;
        }
      }
    }

    function resetBgCards() {
      const { left, right } = getBgCards();
      const t = 'transform 0.5s cubic-bezier(0.34, 1.2, 0.64, 1), opacity 0.3s ease';
      if (left)  { left.style.transition  = t; left.style.transform  = ''; left.style.opacity  = ''; }
      if (right) { right.style.transition = t; right.style.transform = ''; right.style.opacity = ''; }
    }

    function applyDrag() {
      if (!isDragging) return;
      const progress = Math.min(Math.abs(deltaX) / 180, 1);
      const scale = 1 - progress * 0.05;
      card.style.transform = `translateX(${deltaX}px) scale(${scale})`;
      updateBgCards(deltaX);
      rafId = requestAnimationFrame(applyDrag);
    }

    function onMove(e) {
      const now = Date.now();
      const x = e.touches ? e.touches[0].clientX : e.clientX;
      const dt = now - lastTime;
      if (dt > 0 && dt < 100) {
        const instant = (x - lastX) / dt;
        velocityX = velocityX * 0.6 + instant * 0.4;
      }
      lastX = x; lastTime = now;
      deltaX = x - startX;
    }

    function onEnd() {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('touchmove', onMove);
      document.removeEventListener('mouseup',   onEnd);
      document.removeEventListener('touchend',  onEnd);
      isDragging = false;
      cancelAnimationFrame(rafId);

      const speed = Math.abs(velocityX);
      const shouldSwipe = Math.abs(deltaX) > 80 || speed > 0.4;
      const center = 'translateX(0) translateY(0) rotate(0deg) scale(1)';

      if (shouldSwipe) {
        const dir      = deltaX < 0 ? 1 : -1;
        const exitMs   = Math.max(150, Math.min(280, 240 - speed * 60));
        const exitX    = Math.sign(deltaX) * window.innerWidth * 1.3;
        const exitSign = dir === 1 ? -1 : 1;

        const leftCard  = stackEl.querySelector('[data-pos="1"]');
        const rightCard = stackEl.querySelector('[data-pos="2"]');
        const advancingCard = dir === 1 ? rightCard : leftCard;
        const exitingCard   = dir === 1 ? leftCard  : rightCard;

        // Middle card exits in the swipe direction
        card.style.zIndex     = '5';
        card.style.transition = `transform ${exitMs}ms cubic-bezier(0.4,0,1,1), opacity ${exitMs*0.7}ms ease`;
        card.style.transform  = `translateX(${exitX}px)`;
        card.style.opacity    = '0';

        // Exiting peek card also flies off the same side
        if (exitingCard) {
          exitingCard.style.zIndex     = '4';
          exitingCard.style.transition = `transform ${exitMs*0.8}ms cubic-bezier(0.4,0,1,1), opacity ${exitMs*0.6}ms ease`;
          exitingCard.style.transform  = `translateX(${exitSign * window.innerWidth * 1.2}px) rotate(${exitSign * -8}deg)`;
          exitingCard.style.opacity    = '0';
        }

        // Advancing peek card slides to center
        if (advancingCard) {
          advancingCard.style.zIndex     = '6';
          advancingCard.dataset.pos      = '0';
          advancingCard.style.transition = `transform ${exitMs*0.9}ms cubic-bezier(0.25,0.46,0.45,0.94)`;
          advancingCard.style.transform  = `translateX(0) translateY(0) rotate(0deg) scale(1)`;
          addDrag(advancingCard); // zero-lag: allow immediate re-swipe
        }

        // Advance index and insert fresh peek cards behind the animation
        currentIdx = (currentIdx + dir + total) % total;
        const newPrevIdx = (currentIdx - 1 + total) % total;
        const newNextIdx = (currentIdx + 1) % total;
        const newLeft  = buildSwipeCard(candidates[newPrevIdx], 1);
        const newRight = buildSwipeCard(candidates[newNextIdx], 2);
        stackEl.insertBefore(newRight, exitingCard || advancingCard);
        stackEl.insertBefore(newLeft,  newRight);

        indicator.textContent = `${currentIdx + 1} of ${total}`;
        preloadAround(currentIdx);

        // Clean up once animation finishes
        setTimeout(() => {
          card.remove();
          exitingCard?.remove();
          if (advancingCard && advancingCard.parentNode === stackEl) {
            advancingCard.style.transition = 'none';
            advancingCard.style.animation  = 'none';
            advancingCard.style.transform  = 'translateX(0) translateY(0) rotate(0deg) scale(1)';
            advancingCard.style.zIndex     = '3';
          }
        }, exitMs + 50);
      } else {
        // Spring snap-back with slight overshoot
        card.style.transition = 'transform 0.5s cubic-bezier(0.34, 1.4, 0.64, 1)';
        card.style.transform  = '';
        resetBgCards();
        // Tap detection: open modal if barely moved
        if (Math.abs(deltaX) < 8) openModal(candidates[currentIdx]);
      }
    }

    function onStart(e) {
      startX = e.touches ? e.touches[0].clientX : e.clientX;
      const rect = card.getBoundingClientRect();
      const touchY = e.touches ? e.touches[0].clientY : e.clientY;
      startY = touchY - (rect.top + rect.height / 2);

      lastX = startX; lastTime = Date.now();
      deltaX = 0; velocityX = 0; isDragging = true;

      card.style.animation     = 'none';
      card.style.transition    = 'none';
      card.style.transformOrigin = `50% ${startY > 0 ? '25%' : '75%'}`;

      const { left, right } = getBgCards();
      if (left)  { left.style.transition  = 'none'; left.style.opacity  = ''; }
      if (right) { right.style.transition = 'none'; right.style.opacity = ''; }

      document.addEventListener('mousemove', onMove);
      document.addEventListener('touchmove', onMove, { passive: true });
      document.addEventListener('mouseup',   onEnd);
      document.addEventListener('touchend',  onEnd);

      rafId = requestAnimationFrame(applyDrag);
    }

    card.addEventListener('mousedown',  onStart);
    card.addEventListener('touchstart', onStart, { passive: true });
  }

  prevBtn.addEventListener('click', () => advance(-1));
  nextBtn.addEventListener('click', () => advance(1));
  renderStack();
}
