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
    var SOCIALS = {
        website:   { label: 'Website',   short: '↗',  color: '#0d9488' },
        instagram: { label: 'Instagram', short: 'IG', color: '#E1306C' },
        x:         { label: 'X',         short: '𝕏',  color: '#111827' },
        linkedin:  { label: 'LinkedIn',  short: 'in', color: '#0A66C2' },
        facebook:  { label: 'Facebook',  short: 'f',  color: '#1877F2' },
        tiktok:    { label: 'TikTok',    short: 'TT', color: '#111827' },
        github:    { label: 'GitHub',    short: 'GH', color: '#24292e' },
        whatsapp:  { label: 'WhatsApp',  short: 'WA', color: '#25D366' },
        email:     { label: 'Email',     short: '@',  color: '#6b7280' }
    };
    var SOCIAL_ORDER = ['website', 'instagram', 'x', 'linkedin', 'facebook', 'tiktok', 'github', 'whatsapp', 'email'];

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

    var profileUrl = location.origin + location.pathname + '?u=' + encodeURIComponent(handle);
    var loaded = null;

    // ── boot ──────────────────────────────────────────────────────────────────
    if (!handle) { showState('pf-notfound'); return; }
    if (!sb) { showState('pf-notfound'); return; }

    sb.from('profiles').select('*').eq('username', handle).eq('status', 'active').maybeSingle()
        .then(function (res) {
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
        el('pf-loc').textContent = p.location ? p.location + ', Sarawak' : 'Sarawak';

        // Organisation logos (up to 3)
        var orgs = (p.org_photos && p.org_photos.length) ? p.org_photos : (p.org_photo ? [p.org_photo] : []);
        if (orgs.length) {
            el('pf-orgs').innerHTML = orgs.slice(0, 3).map(function (u) {
                return '<img class="pf-org" src="' + encodeURI(u) + '" alt="">';
            }).join('');
        }

        // Lead line
        var first = (p.name || '').split(/\s+/)[0];
        var lead = escapeHtml(first) + ' is';
        if (p.role) lead += ' <b>' + escapeHtml(p.role) + '</b>';
        if (p.industry) lead += ' in ' + escapeHtml(p.industry);
        lead += '.';
        el('pf-lead').innerHTML = lead;

        if (p.bio) { el('pf-bio').textContent = p.bio; el('pf-bio').hidden = false; }

        // Tags
        var tags = [p.category, p.industry, p.background].filter(Boolean);
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

        // Socials
        var links = p.links || {};
        var frag = document.createDocumentFragment();
        SOCIAL_ORDER.forEach(function (key) {
            if (!links[key]) return;
            var meta = SOCIALS[key];
            var a = document.createElement('a');
            a.className = 'pf-social';
            a.href = hrefFor(key, links[key]);
            if (key !== 'email' && key !== 'whatsapp') { a.target = '_blank'; a.rel = 'noopener noreferrer'; }
            a.innerHTML = '<span class="pf-social-ic" style="background:' + meta.color + '">' + meta.short + '</span>' + meta.label;
            frag.appendChild(a);
        });
        el('pf-socials').appendChild(frag);

        el('pf-url-label').textContent = location.host + location.pathname.replace(/[^/]*$/, '') + '?u=' + handle;
        showState('pf-content');
        wireActions(p);
    }

    // ── actions: QR, vCard, copy ───────────────────────────────────────────────
    function wireActions(p) {
        var backdrop = el('qr-backdrop');

        el('pf-qr-btn').addEventListener('click', function () {
            var qr = qrcode(0, 'M');
            qr.addData(profileUrl);
            qr.make();
            el('qr-img').src = qr.createDataURL(6, 10);
            el('qr-name').textContent = p.name || '';
            el('qr-url').textContent = el('pf-url-label').textContent;
            backdrop.classList.add('is-open');
        });
        function closeQr() { backdrop.classList.remove('is-open'); }
        el('qr-close').addEventListener('click', closeQr);
        backdrop.addEventListener('click', function (e) { if (e.target === backdrop) closeQr(); });
        document.addEventListener('keydown', function (e) { if (e.key === 'Escape') closeQr(); });

        el('qr-download').addEventListener('click', function () {
            var a = document.createElement('a');
            a.href = el('qr-img').src;
            a.download = (p.username || 'sarawak-talent') + '-qr.gif';
            a.click();
        });

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
    }

    function buildVCard(p) {
        var L = ['BEGIN:VCARD', 'VERSION:3.0', 'FN:' + (p.name || '')];
        if (p.role) L.push('TITLE:' + p.role);
        if (p.category) L.push('ORG:' + p.category);
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

    function escapeHtml(s) {
        return String(s).replace(/[&<>"']/g, function (c) {
            return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
        });
    }
})();
