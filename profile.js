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

        // Organisation mark (inline, next to the name)
        var orgs = (p.org_photos && p.org_photos.length) ? p.org_photos : (p.org_photo ? [p.org_photo] : []);
        if (orgs.length) { var oi = el('pf-org-inline'); oi.src = encodeURI(orgs[0]); oi.hidden = false; }

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
    }

    // Interactive QR: a ring of the person's socials around a live QR. Tap a
    // connected social and the code retargets to that link; unconnected socials
    // are dimmed. Defaults to the first connected social, else the profile URL.
    function buildInteractiveQR(p) {
        var links = p.links || {};
        var connected = SOCIAL_ORDER.filter(function (k) { return links[k]; });
        var ring = el('qr-ring');
        var buttons = el('qr-buttons');
        var imgs = document.querySelectorAll('.qr-live-img');
        var openBtn = el('qr-open');
        var active = connected.length ? connected[0] : null;   // null → whole card

        function targetHref() { return active ? hrefFor(active, links[active]) : profileUrl; }
        function targetLabel() { return active ? SOCIALS[active].label : 'card'; }
        function setActive(k) { active = k; refresh(); }

        function refresh() {
            var qr = qrcode(0, 'M');
            qr.addData(targetHref());
            qr.make();
            var url = qr.createDataURL(6, 10);
            Array.prototype.forEach.call(imgs, function (im) { im.src = url; });
            openBtn.textContent = 'Open ' + targetLabel();
            openBtn.href = targetHref();
            if (!active || active === 'email' || active === 'whatsapp') openBtn.removeAttribute('target');
            else openBtn.target = '_blank';
            Array.prototype.forEach.call(document.querySelectorAll('.pf-qr-live [data-key]'), function (c) {
                c.classList.toggle('is-active', c.dataset.key === active);
            });
        }

        // Mobile: ring of icons
        ring.innerHTML = '';
        var N = SOCIAL_ORDER.length;
        SOCIAL_ORDER.forEach(function (k, i) {
            var meta = SOCIALS[k];
            var on = !!links[k];
            var ang = (-90 + i * (360 / N)) * Math.PI / 180;
            var ic = document.createElement(on ? 'button' : 'div');
            ic.className = 'qr-ic' + (on ? '' : ' is-off');
            ic.dataset.key = k;
            ic.title = meta.label;
            ic.style.setProperty('--x', Math.cos(ang).toFixed(3));
            ic.style.setProperty('--y', Math.sin(ang).toFixed(3));
            if (on) ic.style.background = meta.color;
            ic.innerHTML = '<span>' + meta.short + '</span>';
            if (on) ic.addEventListener('click', function () { setActive(k); });
            ring.appendChild(ic);
        });

        // Desktop: stacked social buttons (connected only) + "more soon"
        buttons.innerHTML = '';
        connected.forEach(function (k) {
            var meta = SOCIALS[k];
            var b = document.createElement('button');
            b.type = 'button';
            b.className = 'qr-social-btn';
            b.dataset.key = k;
            b.innerHTML = '<span class="qr-social-ic" style="background:' + meta.color + '">' + meta.short + '</span>' +
                          '<span class="qr-social-label">' + meta.label + '</span>';
            b.addEventListener('click', function () { setActive(k); });
            buttons.appendChild(b);
        });
        var soon = document.createElement('div');
        soon.className = 'qr-social-btn qr-social-btn--soon';
        soon.textContent = 'More coming soon';
        buttons.appendChild(soon);

        el('qr-dl').addEventListener('click', function () {
            var a = document.createElement('a');
            a.href = imgs[0].src;
            a.download = (p.username || 'sarawak-talent') + '-qr.gif';
            a.click();
        });

        refresh();
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
