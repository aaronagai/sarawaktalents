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
    }

    document.addEventListener('DOMContentLoaded', function () {
        if (window.Theme && Theme.init) Theme.init();
        initLang();
        wireCtas();
    });
})();
