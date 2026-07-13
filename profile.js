/* ── Public profile / digital name card ──────────────────────────────
   Loads a profile by its username (?u=handle), renders the card with all
   socials aggregated, and generates a QR that opens this very page —
   one scan, all your links.
   -------------------------------------------------------------------- */
(function () {
    'use strict';

    var sb = window.stSupabase;
    var params = new URLSearchParams(location.search);
    var handle = (params.get('u') || '').trim().toLowerCase();
    var el = function (id) { return document.getElementById(id); };

    el('pf-year').textContent = new Date().getFullYear();

    function showState(id) {
        ['pf-loading', 'pf-notfound', 'pf-content'].forEach(function (x) { el(x).hidden = (x !== id); });
    }

    // Platform metadata: label, short badge text, brand colour.
    // Brand glyphs from the open-source simple-icons set (official logos).
    var SOCIALS = {
        website:   { label: 'Website',   color: '#0d9488', path: 'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z' },
        instagram: { label: 'Instagram', color: '#E1306C', path: 'M7.0301.084c-1.2768.0602-2.1487.264-2.911.5634-.7888.3075-1.4575.72-2.1228 1.3877-.6652.6677-1.075 1.3368-1.3802 2.127-.2954.7638-.4956 1.6365-.552 2.914-.0564 1.2775-.0689 1.6882-.0626 4.947.0062 3.2586.0206 3.6671.0825 4.9473.061 1.2765.264 2.1482.5635 2.9107.308.7889.72 1.4573 1.388 2.1228.6679.6655 1.3365 1.0743 2.1285 1.38.7632.295 1.6361.4961 2.9134.552 1.2773.056 1.6884.069 4.9462.0627 3.2578-.0062 3.668-.0207 4.9478-.0814 1.28-.0607 2.147-.2652 2.9098-.5633.7889-.3086 1.4578-.72 2.1228-1.3881.665-.6682 1.0745-1.3378 1.3795-2.1284.2957-.7632.4966-1.636.552-2.9124.056-1.2809.0692-1.6898.063-4.948-.0063-3.2583-.021-3.6668-.0817-4.9465-.0607-1.2797-.264-2.1487-.5633-2.9117-.3084-.7889-.72-1.4568-1.3876-2.1228C21.2982 1.33 20.628.9208 19.8378.6165 19.074.321 18.2017.1197 16.9244.0645 15.6471.0093 15.236-.005 11.977.0014 8.718.0076 8.31.0215 7.0301.0839m.1402 21.6932c-1.17-.0509-1.8053-.2453-2.2287-.408-.5606-.216-.96-.4771-1.3819-.895-.422-.4178-.6811-.8186-.9-1.378-.1644-.4234-.3624-1.058-.4171-2.228-.0595-1.2645-.072-1.6442-.079-4.848-.007-3.2037.0053-3.583.0607-4.848.05-1.169.2456-1.805.408-2.2282.216-.5613.4762-.96.895-1.3816.4188-.4217.8184-.6814 1.3783-.9003.423-.1651 1.0575-.3614 2.227-.4171 1.2655-.06 1.6447-.072 4.848-.079 3.2033-.007 3.5835.005 4.8495.0608 1.169.0508 1.8053.2445 2.228.408.5608.216.96.4754 1.3816.895.4217.4194.6816.8176.9005 1.3787.1653.4217.3617 1.056.4169 2.2263.0602 1.2655.0739 1.645.0796 4.848.0058 3.203-.0055 3.5834-.061 4.848-.051 1.17-.245 1.8055-.408 2.2294-.216.5604-.4763.96-.8954 1.3814-.419.4215-.8181.6811-1.3783.9-.4224.1649-1.0577.3617-2.2262.4174-1.2656.0595-1.6448.072-4.8493.079-3.2045.007-3.5825-.006-4.848-.0608M16.953 5.5864A1.44 1.44 0 1 0 18.39 4.144a1.44 1.44 0 0 0-1.437 1.4424M5.8385 12.012c.0067 3.4032 2.7706 6.1557 6.173 6.1493 3.4026-.0065 6.157-2.7701 6.1506-6.1733-.0065-3.4032-2.771-6.1565-6.174-6.1498-3.403.0067-6.156 2.771-6.1496 6.1738M8 12.0077a4 4 0 1 1 4.008 3.9921A3.9996 3.9996 0 0 1 8 12.0077' },
        x:         { label: 'X',         color: '#111827', path: 'M18.901 1.153h3.68l-8.04 9.19L24 22.846h-7.406l-5.8-7.584-6.638 7.584H.474l8.6-9.83L0 1.154h7.594l5.243 6.932ZM17.61 20.644h2.039L6.486 3.24H4.298Z' },
        linkedin:  { label: 'LinkedIn',  color: '#0A66C2', path: 'M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z' },
        facebook:  { label: 'Facebook',  color: '#1877F2', path: 'M9.101 23.691v-7.98H6.627v-3.667h2.474v-1.58c0-4.085 1.848-5.978 5.858-5.978.401 0 .955.042 1.468.103a8.68 8.68 0 0 1 1.141.195v3.325a8.623 8.623 0 0 0-.653-.036 26.805 26.805 0 0 0-.733-.009c-.707 0-1.259.096-1.675.309a1.686 1.686 0 0 0-.679.622c-.258.42-.374.995-.374 1.752v1.297h3.919l-.386 2.103-.287 1.564h-3.246v8.245C19.396 23.238 24 18.179 24 12.044c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.628 3.874 10.35 9.101 11.647Z' },
        tiktok:    { label: 'TikTok',    color: '#111827', path: 'M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z' },
        github:    { label: 'GitHub',    color: '#24292e', path: 'M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12' },
        whatsapp:  { label: 'WhatsApp',  color: '#25D366', path: 'M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z' },
        email:     { label: 'Email',     color: '#6b7280', path: 'M20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4-8 5-8-5V6l8 5 8-5v2z' }
    };
    function iconHTML(meta) {
        return meta.path
            ? '<svg class="soc-svg" viewBox="' + (meta.vb || '0 0 24 24') + '" fill="#fff" aria-hidden="true"><path d="' + meta.path + '"/></svg>'
            : '<span>' + meta.short + '</span>';
    }
    var SOCIAL_ORDER = ['website', 'instagram', 'x', 'linkedin', 'facebook', 'tiktok', 'github', 'whatsapp', 'email'];
    // The member's own Sarawak Talents card — always the first, default QR option.
    var PROFILE_KEY = 'profile';
    var SSLOGO_PATH = 'M39.2,89.2L4.7,69.2C-.5,66.2.5,60,.1,55.1c-.9-12,2.9-22.9,12.2-29.4,9.5-6.7,21.4-7.8,32.4-1.9v62s-1.3,3-1.3,3c-.4.8-3.2.9-4.2.4Z M133.7,86.4c.7,12.4-2.9,23.3-12.2,29.8s-21.4,7.8-32.4,1.9v-62.1c.4-1.2,1.2-3.1,2-3.4s2.6,0,3.8.2l34.8,20.2c3.9,3.5,3.7,7.9,4,13.4Z M125.1,28.8c-20.7,14-45.9,15.8-67.1,3l-13.2-7.9L83.4,1.5c4.5-2.6,8.6-1.6,13,.9l32.8,19c.5,1,1.1,3.9.3,4.4l-4.3,2.9Z M51.2,139.9c-3.4,2-8,2.9-11.3,1L4.1,120c-2.2-3.8,2.9-5.7,4.8-7,19.9-13.6,44.6-15.8,65.5-3.6l14.6,8.6-37.7,21.9Z';
    var PROFILE_META = { label: 'Sarawak Talents', color: '#111827', vb: '0 0 133.8 141.9', path: SSLOGO_PATH };
    function metaFor(k) { return k === PROFILE_KEY ? PROFILE_META : SOCIALS[k]; }

    // Badge → organisation name, for the "affiliate of" tooltip on the profile.
    var BADGE_ORGS = {
        'photos/badges/sarawak-talents.svg': 'Sarawak Talents',
        'photos/badges/sarawak-energy-icon.svg': 'Sarawak Energy',
        'photos/badges/petros-icon.svg': 'Petros',
        'photos/badges/air-borneo-icon.svg': 'AirBorneo',
        'photos/badges/sarawakmetro-icon.svg': 'Sarawak Metro',
        'photos/badges/sswff-icon.svg': 'Sarawak Future Fund',
        'photos/badges/petrolprice-icon.svg': 'PetrolPrice',
        'photos/badges/timogah-icon.svg': 'Timogah'
    };
    function escapeHtml(s) {
        return String(s).replace(/[&<>"']/g, function (c) {
            return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
        });
    }
    function articleBefore(phrase) {
        var w = String(phrase).trim().toLowerCase();
        if (!w) return 'a';
        if (/^(uni|use|euro|one)/.test(w)) return 'a';   // consonant "y" / "w" sounds
        if (/^h[aeiou]/.test(w)) return 'an';              // hour, honest, heir…
        return /^[aeiou]/.test(w) ? 'an' : 'a';
    }
    function profileRoleLabel(p) {
        return String(p.role || p.dun || p.title || '').trim() || '';
    }
    function profileOrgName(p) {
        var textOrg = String(p.organisation || p.company || p.organization || p.org || '').trim();
        if (textOrg) return textOrg;
        var orgs = (p.org_photos && p.org_photos.length) ? p.org_photos : (p.org_photo ? [p.org_photo] : []);
        for (var i = 0; i < orgs.length; i++) {
            var name = BADGE_ORGS[orgs[i]];
            if (name) return name;
        }
        return '';
    }
    function roleAtOrgLine(p) {
        var role = profileRoleLabel(p);
        var org = profileOrgName(p);
        if (role && org) return role + ' at ' + org;
        return role || org || '';
    }

    function isUrl(v) { return /^https?:\/\//i.test(v); }
    function urlify(v) { return isUrl(v) ? v : 'https://' + v.replace(/^\/+/, ''); }
    function hrefFor(key, val) {
        var v = String(val).trim();
        switch (key) {
            case 'email': return 'mailto:' + v;
            case 'whatsapp': return 'https://wa.me/' + v.replace(/[^0-9]/g, '');
            case 'instagram': return isUrl(v) ? v : 'https://instagram.com/' + v.replace(/^@/, '');
            case 'x': return isUrl(v) ? v : 'https://x.com/' + v.replace(/^@/, '');
            case 'tiktok': return isUrl(v) ? v : 'https://tiktok.com/@' + v.replace(/^@/, '');
            case 'github': return isUrl(v) ? v : 'https://github.com/' + v.replace(/^@/, '');
            case 'facebook': return isUrl(v) ? v : 'https://facebook.com/' + v.replace(/^@/, '');
            default: return urlify(v);   // website, linkedin
        }
    }

    var profileUrl = ST_SITE.profile(handle, true);
    var loaded = null;
    var currentUser = null;   // signed-in viewer's id, or null

    function isOwnProfile(p) {
        return !!(currentUser && p && p.id === currentUser);
    }

    // ── boot ──────────────────────────────────────────────────────────────────
    if (!handle) { showState('pf-notfound'); return; }
    if (!sb) { showState('pf-notfound'); return; }

    Promise.all([
        sb.from('profiles').select('*').eq('username', handle).eq('status', 'active').maybeSingle(),
        sb.auth.getSession()
    ]).then(function (results) {
        var res = results[0];
        var session = results[1].data && results[1].data.session;
        currentUser = session ? session.user.id : null;
        if (res.error || !res.data) { showState('pf-notfound'); return; }
        render(res.data);
    });

    // ── render ────────────────────────────────────────────────────────────────
    function render(p) {
        loaded = p;
        document.title = p.name + ' · Sarawak Talents';

        // Avatar
        if (p.avatar_url) {
            var ai = el('pf-avatar-img'); ai.src = p.avatar_url; ai.hidden = false;
            el('pf-initials').style.display = 'none';
        } else {
            el('pf-initials').textContent = (p.name || '?').charAt(0).toUpperCase();
        }

        el('pf-name').textContent = p.name || '';
        var verifiedEl = document.querySelector('.pf-verified');
        if (verifiedEl) verifiedEl.hidden = !p.avatar_url;
        el('pf-loc').textContent = p.location ? p.location + ', Sarawak' : 'Sarawak';

        var roleOrgLine = roleAtOrgLine(p);
        var roleOrgEl = el('pf-role-org');
        if (roleOrgLine && roleOrgEl) {
            roleOrgEl.textContent = roleOrgLine;
            roleOrgEl.hidden = false;
        } else if (roleOrgEl) {
            roleOrgEl.hidden = true;
        }

        // Organisation marks (inline, next to the name) — one or more badges.
        // Hover (desktop) or tap (mobile) reveals an "affiliate of" tooltip.
        var orgs = (p.org_photos && p.org_photos.length) ? p.org_photos : (p.org_photo ? [p.org_photo] : []);
        if (orgs.length) {
            var oi = el('pf-org-inline');
            var firstName = (p.name || '').trim().split(/\s+/)[0] || 'This member';
            oi.innerHTML = orgs.map(function (u) {
                var org = BADGE_ORGS[u] || 'Sarawak Talents';
                var tip = escapeHtml(firstName + ' is an affiliate of ' + org);
                return '<span class="pf-org-badge" tabindex="0" role="img" aria-label="' + tip + '">' +
                       '<img src="' + encodeURI(ST_SITE.asset(u)) + '" alt="" />' +
                       '<span class="pf-org-tip">' + tip + '</span></span>';
            }).join('');
            oi.hidden = false;
        }

        // Lead line — grammar-proof for any combination of title / industry.
        var first = escapeHtml((p.name || '').split(/\s+/)[0]);
        var role = (p.role || '').trim();
        var industry = (p.industry || '').trim();
        var sameRI = role && industry && role.toLowerCase() === industry.toLowerCase();
        var lead;
        if (role && industry && !sameRI) {
            lead = first + ' is ' + articleBefore(role) + ' <b>' + escapeHtml(role) + '</b> in ' + escapeHtml(industry) + '.';
        } else if (sameRI || (industry && !role)) {
            lead = first + ' works in <b>' + escapeHtml(industry) + '</b>.';
        } else if (role) {
            lead = first + ' is ' + articleBefore(role) + ' <b>' + escapeHtml(role) + '</b>.';
        } else {
            lead = first + '.';
        }
        el('pf-lead').innerHTML = lead;

        if (p.bio) { el('pf-bio').textContent = p.bio; el('pf-bio').hidden = false; }

        // Tags (dedupe case-insensitively so category/industry don't repeat).
        var seenTag = {};
        var tags = [p.category, p.industry].filter(function (t) {
            if (!t) return false;
            var k = String(t).toLowerCase();
            if (seenTag[k]) return false;
            seenTag[k] = 1; return true;
        });
        el('pf-tags').innerHTML = tags.map(function (t) {
            return '<span class="pf-tag">' + escapeHtml(t) + '</span>';
        }).join('');

        // Education
        var edu = p.education || {};
        if (edu.program || edu.school) {
            var parts = [];
            if (edu.program) parts.push('<b>' + escapeHtml(edu.program) + '</b>');
            if (edu.school) parts.push(escapeHtml(edu.school));
            el('pf-edu').innerHTML = parts.join(' · ');
            el('pf-edu-section').hidden = false;
        }

        el('pf-url-label').textContent = location.host + ST_SITE.profile(handle, false);
        showState('pf-content');
        // Staggered blur-up entrance for the card (transitions.dev #18).
        var content = el('pf-content');
        content.classList.add('pf-reveal');
        requestAnimationFrame(function () {
            requestAnimationFrame(function () { content.classList.add('is-shown'); });
        });
        wireActions(p);
    }

    // ── actions: interactive QR, vCard, copy ───────────────────────────────────
    function wireActions(p) {
        buildInteractiveQR(p);

        el('pf-vcard-btn').addEventListener('click', function () {
            var vcf = buildVCard(p);
            var blob = new Blob([vcf], { type: 'text/vcard;charset=utf-8' });
            var a = document.createElement('a');
            a.href = URL.createObjectURL(blob);
            a.download = (p.username || 'contact') + '.vcf';
            a.click();
            setTimeout(function () { URL.revokeObjectURL(a.href); }, 2000);
        });

        el('pf-copy-btn').addEventListener('click', function () {
            navigator.clipboard.writeText(profileUrl).then(function () {
                var btn = el('pf-copy-btn'); var t = btn.textContent;
                btn.textContent = 'Copied!';
                setTimeout(function () { btn.textContent = t; }, 1400);
            });
        });

        wireAchievements(p);
    }

    // ── achievements: view log, Connect, referral link, badge list ──────────────
    function wireAchievements(p) {
        var isOwn = !!currentUser && currentUser === p.id;

        // View log — feeds Explorer (zone coverage) and Rising Star (monthly
        // counts), both scheduled checks, not real-time. Skipped for the
        // owner viewing their own profile so those can't be self-farmed.
        // viewer_id is null for anonymous visitors, which the RLS policy allows.
        if (!isOwn) {
            sb.from('profile_views').insert({ viewer_id: currentUser, viewed_profile_id: p.id });
        }

        var connectBtn = el('pf-connect-btn');
        if (currentUser && !isOwn) {
            connectBtn.hidden = false;
            sb.from('connections').select('id').eq('user_id', currentUser).eq('connected_user_id', p.id).maybeSingle()
                .then(function (r) {
                    if (r.data) { connectBtn.textContent = 'Connected'; connectBtn.disabled = true; }
                });
            connectBtn.addEventListener('click', function () {
                connectBtn.disabled = true;
                sb.from('connections').insert({ user_id: currentUser, connected_user_id: p.id }).then(function (r) {
                    if (r.error) { connectBtn.disabled = false; return; }
                    connectBtn.textContent = 'Connected';
                    sb.rpc('check_and_award_badges', { p_user_id: currentUser }).then(function (br) {
                        if (br.data && br.data.length && window.BadgeToast) BadgeToast.show(br.data);
                    });
                });
            });
        }

        var referBtn = el('pf-refer-btn');
        if (isOwn && p.username) {
            referBtn.hidden = false;
            referBtn.addEventListener('click', function () {
                var link = location.origin + ST_SITE.join('ref=' + encodeURIComponent(p.username));
                navigator.clipboard.writeText(link).then(function () {
                    var t = referBtn.textContent;
                    referBtn.textContent = 'Copied!';
                    setTimeout(function () { referBtn.textContent = t; }, 1400);
                });
            });
        }

        renderBadgesSection(p, isOwn);
    }

    // Own profile: every catalog badge, earned first then greyed-out locked
    // ones with a hover/tap "how to earn" hint (the badge's own description).
    // Public view: earned badges only, no locked placeholders.
    function renderBadgesSection(p, isOwn) {
        var section = el('pf-badges-section');
        var grid = el('pf-badges-grid');

        var earnedQuery = sb.from('user_badges').select('badge_id, badges(slug, name, description, icon)').eq('user_id', p.id);
        var allQuery = isOwn ? sb.from('badges').select('*') : Promise.resolve({ data: null });

        Promise.all([earnedQuery, allQuery]).then(function (results) {
            var earnedRows = (results[0].data || []).map(function (r) { return r.badges; }).filter(Boolean);
            var earnedSlugs = {};
            earnedRows.forEach(function (b) { earnedSlugs[b.slug] = true; });

            var html = earnedRows.map(function (b) { return badgeTileHtml(b, false); }).join('');
            if (isOwn) {
                var locked = (results[1].data || []).filter(function (b) { return !earnedSlugs[b.slug]; });
                html += locked.map(function (b) { return badgeTileHtml(b, true); }).join('');
            }

            if (html) { grid.innerHTML = html; section.hidden = false; }
        });
    }

    function badgeTileHtml(b, locked) {
        var tip = escapeHtml(b.description || '');
        return '<span class="pf-achv-badge' + (locked ? ' is-locked' : '') + '" tabindex="0" role="img" aria-label="' + escapeHtml(b.name) + ': ' + tip + '">' +
               '<span class="pf-achv-badge-icon" aria-hidden="true">' + (b.icon || '🏅') + '</span>' +
               escapeHtml(b.name) +
               '<span class="pf-achv-tip">' + tip + '</span></span>';
    }

    // ── Save / share the Sarawak Talents QR as a portrait image ─────────────────
    // Wallpaper-friendly card: grey field, top safe area for iOS clock, white
    // card with QR + avatar overlay, name, and role/org line.
    function loadImage(src, opts) {
        return new Promise(function (res, rej) {
            var im = new Image();
            if (opts && opts.cors) im.crossOrigin = 'anonymous';
            im.onload = function () { res(im); };
            im.onerror = rej;
            im.src = src;
        });
    }
    function roundRect(ctx, x, y, w, h, r) {
        ctx.beginPath();
        ctx.moveTo(x + r, y);
        ctx.arcTo(x + w, y, x + w, y + h, r);
        ctx.arcTo(x + w, y + h, x, y + h, r);
        ctx.arcTo(x, y + h, x, y, r);
        ctx.arcTo(x, y, x + w, y, r);
        ctx.closePath();
    }
    function drawAvatarOnQR(ctx, img, cx, cy, r, border) {
        ctx.beginPath();
        ctx.arc(cx, cy, r + border, 0, Math.PI * 2);
        ctx.fillStyle = '#ffffff';
        ctx.fill();
        ctx.save();
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.clip();
        var side = Math.min(img.width, img.height);
        var sx = (img.width - side) / 2;
        var sy = (img.height - side) / 2;
        ctx.drawImage(img, sx, sy, side, side, cx - r, cy - r, r * 2, r * 2);
        ctx.restore();
    }
    function qrDataUrl(text) {
        var qr = qrcode(0, 'M');
        qr.addData(text);
        qr.make();
        return qr.createDataURL(12, 12);
    }
    async function drawProfileCard(p) {
        var W = 1080, H = 1920;
        var canvas = document.createElement('canvas');
        canvas.width = W; canvas.height = H;
        var ctx = canvas.getContext('2d');
        var F = "-apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif";
        ctx.textAlign = 'center';

        // Layout tuned for iPhone lock-screen wallpaper. Percent-based so it
        // survives iOS crop/zoom — clock + widget row need ~52% of the height.
        var topSafe = Math.round(H * 0.52);
        var bottomSafe = Math.round(H * 0.15);
        var cardW = 560;
        var cardPad = 32;
        var cardR = 44;
        var qrSize = 440;
        var nameSize = 42;
        var roleSize = 30;
        var roleOrg = roleAtOrgLine(p);
        var cardH = cardPad + qrSize + 44 + (roleOrg ? 38 : 0) + cardPad + 12;
        var cardX = (W - cardW) / 2;
        var cardY = topSafe;
        var qrX = cardX + (cardW - qrSize) / 2;
        var qrY = cardY + cardPad;
        var nameY = qrY + qrSize + 44;
        var roleY = nameY + 36;

        ctx.fillStyle = '#b3b3b3';
        ctx.fillRect(0, 0, W, H);

        roundRect(ctx, cardX, cardY, cardW, cardH, cardR);
        ctx.fillStyle = '#ffffff';
        ctx.fill();

        var qrImg = await loadImage(qrDataUrl(profileUrl));
        ctx.imageSmoothingEnabled = false;
        ctx.drawImage(qrImg, qrX, qrY, qrSize, qrSize);
        ctx.imageSmoothingEnabled = true;

        if (p.avatar_url) {
            try {
                var avatarImg = await loadImage(p.avatar_url, { cors: true });
                var avatarR = Math.round(qrSize * 0.12);
                drawAvatarOnQR(ctx, avatarImg, qrX + qrSize / 2, qrY + qrSize / 2, avatarR, 7);
            } catch (e) { /* optional — card still exports without photo */ }
        }

        ctx.fillStyle = '#1a1a1b';
        ctx.font = '700 ' + nameSize + 'px ' + F;
        ctx.fillText(p.name || '', W / 2, nameY);

        if (roleOrg) {
            ctx.fillStyle = '#7e57c2';
            ctx.font = '600 ' + roleSize + 'px ' + F;
            ctx.fillText(roleOrg, W / 2, roleY);
        } else if (p.username) {
            ctx.fillStyle = '#7e57c2';
            ctx.font = '600 ' + roleSize + 'px ' + F;
            ctx.fillText('@' + p.username, W / 2, roleY);
        }

        var cardBottom = cardY + cardH;
        var scanY = cardBottom + 56;
        var urlY = Math.min(scanY + 54, H - Math.round(H * 0.07));

        ctx.fillStyle = '#ffffff';
        ctx.font = '600 38px ' + F;
        ctx.fillText('Scan to connect', W / 2, scanY);

        ctx.fillStyle = '#000000';
        ctx.font = '500 32px ' + F;
        ctx.fillText('sarawaktalents.com', W / 2, urlY);

        return new Promise(function (res) { canvas.toBlob(res, 'image/png'); });
    }
    async function exportProfileCard(p) {
        if (!isOwnProfile(p)) return;
        var btn = el('pf-saveqr-btn');
        var label = btn ? btn.textContent : '';
        if (btn) { btn.textContent = 'Preparing…'; btn.disabled = true; }
        try {
            var blob = await drawProfileCard(p);
            var file = new File([blob], (p.username || 'sarawaktalents') + '-qr.png', { type: 'image/png' });
            // Mobile: native share sheet → Save Image / post to IG story / etc.
            if (navigator.canShare && navigator.canShare({ files: [file] })) {
                await navigator.share({ files: [file], title: (p.name || 'Sarawak Talents') + ' · Sarawak Talents' });
            } else {
                var a = document.createElement('a');
                a.href = URL.createObjectURL(blob);
                a.download = file.name;
                a.click();
                setTimeout(function () { URL.revokeObjectURL(a.href); }, 2000);
            }
        } catch (e) {
            // Share cancelled or unsupported — ignore.
        }
        if (btn) { btn.textContent = label; btn.disabled = false; }
    }

    // Interactive QR: a ring of the person's socials around a live QR. Tap a
    // connected social and the code retargets to that link; unconnected socials
    // are dimmed. Defaults to the first connected social, else the profile URL.
    function buildInteractiveQR(p) {
        var links = p.links || {};
        var connected = SOCIAL_ORDER.filter(function (k) { return links[k]; });
        var buttons = el('qr-buttons');
        var openRow = el('qr-open-row');
        var imgs = document.querySelectorAll('.qr-live-img');
        var active = PROFILE_KEY;   // default → the member's own Sarawak Talents card

        function hrefForKey(k) { return k === PROFILE_KEY ? profileUrl : hrefFor(k, links[k]); }
        function targetHref() { return hrefForKey(active); }
        function setActive(k) { active = k; refresh(); }
        function openTarget(k) {
            var href = hrefForKey(k);
            if (k === 'email' || k === 'whatsapp') window.location.href = href;
            else window.open(href, '_blank', 'noopener');
        }
        // First tap selects the card (retargets the QR); tapping the already-active
        // card opens its destination — so no separate "Open" button is needed.
        function activateOrOpen(k) { if (active === k) openTarget(k); else setActive(k); }

        // Explicit "Open" affordance under the QR, so visiting a link is obvious
        // instead of relying on the hidden "tap the icon again" gesture.
        function updateOpenRow() {
            if (!openRow) return;
            openRow.innerHTML = '';
            // Sarawak Talents card selected → owners can save their wallpaper QR.
            if (active === PROFILE_KEY) {
                if (isOwnProfile(p)) {
                    var s = document.createElement('button');
                    s.type = 'button';
                    s.className = 'qr-open-btn';
                    s.id = 'pf-saveqr-btn';
                    s.innerHTML = 'Save QR <span aria-hidden="true">↓</span>';
                    s.addEventListener('click', function () { exportProfileCard(p); });
                    openRow.appendChild(s);
                    var hint = document.createElement('p');
                    hint.className = 'qr-open-hint';
                    hint.textContent = 'Save your card image, or tap an icon to open its link.';
                    openRow.appendChild(hint);
                } else {
                    var b = document.createElement('button');
                    b.type = 'button';
                    b.className = 'qr-open-btn';
                    b.innerHTML = 'Open Sarawak Talents <span aria-hidden="true">↗</span>';
                    b.addEventListener('click', function () { openTarget(PROFILE_KEY); });
                    openRow.appendChild(b);
                    var hintGuest = document.createElement('p');
                    hintGuest.className = 'qr-open-hint';
                    hintGuest.textContent = 'Tap an icon to open its link.';
                    openRow.appendChild(hintGuest);
                }
                return;
            }
            var meta = metaFor(active);
            var b = document.createElement('button');
            b.type = 'button';
            b.className = 'qr-open-btn';
            b.innerHTML = 'Open ' + escapeHtml(meta.label) + ' <span aria-hidden="true">↗</span>';
            b.addEventListener('click', function () { openTarget(active); });
            openRow.appendChild(b);
        }

        function refresh() {
            var qr = qrcode(0, 'M');
            qr.addData(targetHref());
            qr.make();
            var url = qr.createDataURL(6, 10);
            Array.prototype.forEach.call(imgs, function (im) { im.src = url; });
            Array.prototype.forEach.call(document.querySelectorAll('.pf-qr-live [data-key]'), function (c) {
                c.classList.toggle('is-active', c.dataset.key === active);
            });
            updateOpenRow();
        }

        // Sarawak Talents card first, then connected socials + "more soon".
        // Icon + platform name (name hidden on the phone icon grid).
        buttons.innerHTML = '';
        [PROFILE_KEY].concat(connected).forEach(function (k) {
            var meta = metaFor(k);
            var b = document.createElement('button');
            b.type = 'button';
            b.className = 'qr-social-btn';
            b.dataset.key = k;
            b.setAttribute('aria-label', meta.label);   // icons-only on phones
            b.innerHTML = '<span class="qr-social-ic" style="background:' + meta.color + '">' + iconHTML(meta) + '</span>' +
                          '<span class="qr-social-label">' + meta.label + '</span>' +
                          '<span class="qr-arrow" aria-hidden="true">→</span>';
            b.addEventListener('click', function () { activateOrOpen(k); });
            buttons.appendChild(b);
        });
        var soon = document.createElement('div');
        soon.className = 'qr-social-btn qr-social-btn--soon';
        soon.textContent = 'More coming soon';
        buttons.appendChild(soon);

        refresh();
    }

    function buildVCard(p) {
        var L = ['BEGIN:VCARD', 'VERSION:3.0', 'FN:' + (p.name || '')];
        if (p.role) L.push('TITLE:' + p.role);
        var org = profileOrgName(p);
        if (org) L.push('ORG:' + org);
        else if (p.category) L.push('ORG:' + p.category);
        L.push('URL:' + profileUrl);
        var links = p.links || {};
        if (links.email) L.push('EMAIL:' + links.email);
        if (links.whatsapp) L.push('TEL;TYPE=CELL:' + links.whatsapp.replace(/[^0-9+]/g, ''));
        ['website', 'instagram', 'x', 'linkedin', 'tiktok', 'github'].forEach(function (k) {
            if (links[k]) L.push('URL:' + hrefFor(k, links[k]));
        });
        if (p.bio) L.push('NOTE:' + p.bio.replace(/\n/g, ' '));
        L.push('END:VCARD');
        return L.join('\r\n');
    }
})();
