/* ── Sarawak Talents — marketing landing (apex: sarawaktalents.com) ──
   Standalone from the app. The only cross-surface concern is that the
   "Get Started" / "Log In" CTAs must hand off to the app, which lives on
   its own subdomain in production and same-origin everywhere else
   (staging preview / local), so the join flow always resolves.
   -------------------------------------------------------------------- */
(function () {
    'use strict';

    /** Origin of the app. Production apex hands off to app.sarawaktalents.com;
        anywhere else (pages.dev preview, localhost) the app is same-origin. */
    function appOrigin() {
        var h = location.hostname;
        if (h === 'sarawaktalents.com' || h === 'www.sarawaktalents.com') {
            return 'https://app.sarawaktalents.com';
        }
        return '';
    }
    function appUrl(path) { return appOrigin() + path; }

    // ── i18n (landing subset — mirrors the app's EN/BM keys) ──────────
    var translations = {
        en: {
            heroLine1:          'Top Sarawakian',
            heroLine2:          'talents gather here',
            heroSubtitle:       'The coolest network for Sarawakians. Juh, kita ngerami sama-sama!',
            logIn:              'Log In',
            getStarted:         'Get Started',
            memberCount:        '+92',
            featuresHeading:    'Meet the people building Sarawak.',
            featuresSubheading: 'From students and entrepreneurs to volunteers and creators, discover the community shaping what’s next.',
            feature1Title:      'Discover local talent',
            feature1Desc:       'Find inspiring people across different industries and communities.',
            feature2Title:      'Exchange your profile instantly',
            feature2Desc:       'A digital name card that’s always up to date.',
            feature3Title:      'Stay connected',
            feature3Desc:       'Turn a quick introduction into a lasting connection.',
            prideTitle:         'Pride',
            prideDesc:          'Show off what you’re building. Organisation badges available for Sarawak’s very own.',
            talentsPreviewHeading: 'Meet some of our talents.',
            findMoreTalents:    'Find more talents',
        },
        ms: {
            heroLine1:          'Bakat Terbaik Sarawak',
            heroLine2:          'berkumpul di sini',
            heroSubtitle:       'Rangkaian paling hebat untuk orang Sarawak. Juh, kita ngerami sama-sama!',
            logIn:              'Log Masuk',
            getStarted:         'Mula',
            memberCount:        '+92',
            featuresHeading:    'Kenali orang yang membina Sarawak.',
            featuresSubheading: 'Dari pelajar dan usahawan kepada sukarelawan dan pencipta, terokai komuniti yang membentuk masa depan.',
            feature1Title:      'Temui bakat tempatan',
            feature1Desc:       'Cari individu inspiratif merentasi pelbagai industri dan komuniti.',
            feature2Title:      'Kongsi profil anda serta-merta',
            feature2Desc:       'Kad nama digital yang sentiasa dikemas kini.',
            feature3Title:      'Kekal berhubung',
            feature3Desc:       'Jadikan perkenalan ringkas sebagai hubungan yang berkekalan.',
            prideTitle:         'Kebanggaan',
            prideDesc:          'Tunjuk apa yang anda bina. Lencana organisasi tersedia untuk milik Sarawak sendiri.',
            talentsPreviewHeading: 'Kenali sebahagian bakat kami.',
            findMoreTalents:    'Cari lebih ramai bakat',
        }
    };

    function applyLang(lang) {
        var t = translations[lang] || translations.en;
        document.querySelectorAll('[data-i18n]').forEach(function (el) {
            var key = el.getAttribute('data-i18n');
            if (t[key] !== undefined) el.textContent = t[key];
        });
        document.documentElement.lang = lang === 'ms' ? 'ms' : 'en';
        var en = document.getElementById('lang-en');
        var ms = document.getElementById('lang-ms');
        if (en) en.setAttribute('aria-selected', lang === 'en' ? 'true' : 'false');
        if (ms) ms.setAttribute('aria-selected', lang === 'ms' ? 'true' : 'false');
        try { localStorage.setItem('lang', lang); } catch (e) {}
    }

    function initLang() {
        var saved = 'en';
        try { saved = localStorage.getItem('lang') || 'en'; } catch (e) {}
        if (saved !== 'en' && saved !== 'ms') saved = 'en';

        var bar = document.querySelector('.footer-lang-pill');
        if (window.Theme && Theme.initSlidingTabs && bar) {
            Theme.initSlidingTabs(bar, {
                onSelect: function (tab) { applyLang(tab.id === 'lang-en' ? 'en' : 'ms'); }
            });
        } else {
            var en = document.getElementById('lang-en');
            var ms = document.getElementById('lang-ms');
            if (en) en.addEventListener('click', function () { applyLang('en'); });
            if (ms) ms.addEventListener('click', function () { applyLang('ms'); });
        }
        applyLang(saved);
    }

    function wireCtas() {
        var getStarted = appUrl('/join/');
        var login = appUrl('/join/?mode=login');
        document.querySelectorAll('.hero-nav-btn--get-started').forEach(function (b) {
            b.addEventListener('click', function () { window.location.href = getStarted; });
        });
        document.querySelectorAll('.hero-nav-btn--login').forEach(function (b) {
            b.addEventListener('click', function () { window.location.href = login; });
        });
        var findMore = document.getElementById('find-more-talents');
        if (findMore) {
            findMore.addEventListener('click', function () { window.location.href = appUrl('/join/'); });
        }
    }

    // ── Talent preview ────────────────────────────────────────────────
    // A teaser of the directory: the first 10 members. Cards are display-only
    // (no profile links) so the full, explorable list stays behind onboarding.
    function escapeHtml(s) {
        return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
            return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
        });
    }

    function talentCard(p) {
        var div = document.createElement('div');
        div.className = 'talent-card no-underline text-current flex items-center gap-3 sm:gap-4 p-3 sm:p-4 bg-white rounded-xl border border-gray-100 shadow-sm';
        var avatar = p.avatar_url
            ? '<img src="' + encodeURI(p.avatar_url) + '" alt="" class="w-full h-full object-cover transition-opacity duration-300 opacity-0" loading="lazy" decoding="async" onload="this.classList.remove(\'opacity-0\')" onerror="this.style.display=\'none\'">'
            : '';
        div.innerHTML =
            '<div class="shrink-0 w-12 h-12 sm:w-14 sm:h-14 rounded-full overflow-hidden bg-gray-100">' + avatar + '</div>' +
            '<div class="min-w-0 flex-1">' +
                '<div class="flex items-center gap-1.5 min-w-0">' +
                    '<p class="font-semibold text-gray-900 text-sm sm:text-base leading-tight truncate">' + escapeHtml(p.name) + '</p>' +
                    '<re-icon icon="verified" size="18" weight="filled" class="talent-verified-icon shrink-0" aria-hidden="true"></re-icon>' +
                '</div>' +
                '<p class="talent-sub text-xs sm:text-sm text-gray-500 mt-0.5 truncate">' + escapeHtml(p.role || '') + '</p>' +
            '</div>';
        return div;
    }

    async function loadTalentPreview() {
        var grid = document.getElementById('talent-preview-grid');
        var section = document.querySelector('.talents-preview-section');
        if (!grid) return;
        function hide() { if (section) section.style.display = 'none'; }
        if (!window.ST_CONFIGURED || !window.stSupabase) { hide(); return; }
        try {
            var res = await window.stSupabase
                .from('profiles')
                .select('id, username, name, role, avatar_url, created_at')
                .order('created_at', { ascending: true })
                .limit(10);
            var data = res && res.data;
            if (res.error || !data || !data.length) { hide(); return; }
            var frag = document.createDocumentFragment();
            data.forEach(function (p) { frag.appendChild(talentCard(p)); });
            grid.classList.remove('talent-preview-empty');
            grid.appendChild(frag);
        } catch (e) {
            hide();
        }
    }

    // Header is transparent over the hero photo, frosted once scrolled past it
    // (mirrors the app's initStickyHeader; script.js isn't loaded here).
    function initStickyHeader() {
        var header = document.getElementById('site-header');
        var hero = document.querySelector('.hero');
        if (!header) return;
        var threshold = function () { return hero ? hero.offsetHeight - 72 : 320; };
        var ticking = false;
        var update = function () {
            header.classList.toggle('is-scrolled', window.scrollY > threshold());
            ticking = false;
        };
        window.addEventListener('scroll', function () {
            if (!ticking) { ticking = true; requestAnimationFrame(update); }
        }, { passive: true });
        update();
    }

    document.addEventListener('DOMContentLoaded', function () {
        if (window.Theme && Theme.init) Theme.init();
        initLang();
        wireCtas();
        initStickyHeader();
        loadTalentPreview();
    });
})();
