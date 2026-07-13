/* ── Join flow controller ────────────────────────────────────────────
   Steps: 0 invite → 1 Google auth → 2 profile → done.
   Works in preview mode (no Supabase) and live mode.
   -------------------------------------------------------------------- */
(function () {
    'use strict';

    var sb = window.stSupabase;                 // null in preview mode
    var LIVE = !!sb;
    var PENDING_KEY = 'st_pending_invite';
    var PENDING_REF_KEY = 'st_pending_ref';      // referrer's @username, for the Ambassador badge

    var steps = Array.prototype.slice.call(document.querySelectorAll('.join-step'));
    var dots = Array.prototype.slice.call(document.querySelectorAll('.join-progress-dot'));
    var banner = document.getElementById('preview-banner');
    var stage = document.getElementById('join-stage');
    var mqReduce = window.matchMedia('(prefers-reduced-motion: reduce)');
    var currentStep = null;
    var params = new URLSearchParams(location.search);

    var avatarFile = null;
    var JOIN_MODE_KEY = 'st_join_mode';
    var currentUsername = null;      // the signed-in user's existing handle (edit mode)
    var authRouted = false;          // true once we've left the "checking session" state

    // mode=edit can be lost across the Google OAuth round-trip (redirectTo used to
    // drop the query string). Persist in localStorage so it survives the redirect
    // even if the return URL is stripped to /join/.
    function joinMode() {
        var m = params.get('mode');
        if (m) return m;
        try { return localStorage.getItem(JOIN_MODE_KEY) || ''; } catch (e) { return ''; }
    }
    function isEditMode() { return joinMode() === 'edit'; }
    function persistJoinMode() {
        var m = params.get('mode') || joinMode();
        if (m === 'edit' || m === 'login') {
            try { localStorage.setItem(JOIN_MODE_KEY, m); } catch (e) {}
        }
    }
    function clearJoinMode() {
        try { localStorage.removeItem(JOIN_MODE_KEY); } catch (e) {}
    }
    function oauthRedirectTo() {
        var mode = joinMode();
        var url = location.origin + location.pathname;
        if (mode === 'edit' || mode === 'login') url += '?mode=' + encodeURIComponent(mode);
        return url;
    }

    var editMode = isEditMode();
    persistJoinMode();

    // Persist a referral (?ref=<username>) across the Google OAuth round-trip,
    // same idea as PENDING_KEY for invite codes. Only meaningful for a brand
    // new signup — never touched again once a profile exists.
    var refParam = params.get('ref');
    if (refParam && !editMode) localStorage.setItem(PENDING_REF_KEY, refParam.trim().toLowerCase());

    if (!LIVE && banner) banner.hidden = false;

    // ── Industry dropdown (+ Other free text) + live profile-line preview ─
    var industrySelect = document.getElementById('pf-industry-select');
    var industryOther = document.getElementById('pf-industry');
    var previewEl = document.getElementById('pf-role-org-preview');

    (function populateIndustryOptions() {
        if (!industrySelect || !window.ST_INDUSTRIES) return;
        var otherOpt = industrySelect.querySelector('option[value="__other"]');
        window.ST_INDUSTRIES.forEach(function (name) {
            var opt = document.createElement('option');
            opt.value = name;
            opt.textContent = name;
            industrySelect.insertBefore(opt, otherOpt);
        });
    })();

    function currentIndustry() {
        if (!industrySelect) return industryOther ? industryOther.value.trim() : '';
        if (industrySelect.value === '__other') return industryOther ? industryOther.value.trim() : '';
        return industrySelect.value || '';
    }
    function setIndustry(val) {
        val = (val || '').trim();
        if (!industrySelect) {
            if (industryOther) industryOther.value = val;
            return;
        }
        var match = Array.prototype.filter.call(industrySelect.options, function (o) {
            return o.value !== '__other' && o.value && o.value.toLowerCase() === val.toLowerCase();
        })[0];
        if (val && match) {
            industrySelect.value = match.value;
            if (industryOther) {
                industryOther.hidden = true;
                industryOther.value = '';
                industryOther.required = false;
            }
        } else if (val) {
            industrySelect.value = '__other';
            if (industryOther) {
                industryOther.hidden = false;
                industryOther.value = val;
                industryOther.required = true;
            }
        } else {
            industrySelect.selectedIndex = 0;
            if (industryOther) {
                industryOther.hidden = true;
                industryOther.value = '';
                industryOther.required = false;
            }
        }
    }

    if (industrySelect) {
        industrySelect.addEventListener('change', function () {
            var other = industrySelect.value === '__other';
            if (industryOther) {
                industryOther.hidden = !other;
                industryOther.required = other;
                if (other) industryOther.focus();
                else industryOther.value = '';
            }
        });
    }

    // Grammar-proof profile line — mirrors the renderer in profile.js.
    // Format: "Name is a/an Role at Organisation."
    function leadArticle(word) { return /^[aeiou]/i.test((word || '').trim()) ? 'an' : 'a'; }
    function buildLead(name, role, org) {
        var displayName = (name || '').trim() || 'Name';
        role = (role || '').trim() || 'Role';
        org = (org || '').trim() || 'Organisation';
        return displayName + ' is ' + leadArticle(role) + ' ' + role + ' at ' + org + '.';
    }
    function badgeOrgName(src) {
        var map = {
            'photos/badges/sarawak-talents.svg': 'Sarawak Talents',
            'photos/badges/sarawak-energy-icon.svg': 'Sarawak Energy',
            'photos/badges/petros-icon.svg': 'Petros',
            'photos/badges/air-borneo-icon.svg': 'AirBorneo',
            'photos/badges/sarawakmetro-icon.svg': 'Sarawak Metro',
            'photos/badges/sswff-icon.svg': 'Sarawak Future Fund',
            'photos/badges/petrolprice-icon.svg': 'PetrolPrice',
            'photos/badges/timogah-icon.svg': 'Timogah'
        };
        return map[src] || '';
    }
    function currentOrgName() {
        var textEl = document.getElementById('pf-organisation');
        var textOrg = textEl ? textEl.value.trim() : '';
        if (textOrg) return textOrg;
        var badges = (typeof selectedBadges !== 'undefined' && selectedBadges) ? selectedBadges : [];
        for (var i = 0; i < badges.length; i++) {
            var name = badgeOrgName(badges[i]);
            if (name) return name;
        }
        return '';
    }
    function updatePreview() {
        if (!previewEl) return;
        var nameEl = document.getElementById('pf-name');
        var roleEl = document.getElementById('pf-role');
        var name = nameEl ? nameEl.value.trim() : '';
        var role = roleEl ? roleEl.value.trim() : '';
        var org = currentOrgName();
        var line = buildLead(name, role, org);
        var hasReal = !!(name || role || org);
        previewEl.hidden = false;
        if (hasReal) {
            previewEl.textContent = 'Preview: ' + line;
        } else {
            previewEl.innerHTML = 'Preview: <span class="join-preview-example">Name</span> is a <span class="join-preview-example">Role</span> at <span class="join-preview-example">Organisation</span>';
        }
    }

    ['pf-name', 'pf-role', 'pf-organisation'].forEach(function (id) {
        var e = document.getElementById(id);
        if (e) e.addEventListener('input', updatePreview);
    });
    updatePreview();

    // ── navigation: steps "fly" directionally + the tray height morphs ───────
    function stepEl(step) { return document.querySelector('.join-step[data-step="' + step + '"]'); }
    function stepIndex(step) { return step === 'done' ? 3 : Number(step); }

    function showStep(step) {
        step = String(step);
        var next = stepEl(step);
        if (!next) return;
        var prev = currentStep != null ? stepEl(currentStep) : null;
        dots.forEach(function (d, i) { d.classList.toggle('is-active', i <= stepIndex(step)); });
        currentStep = step;

        // First render, same step, or reduced motion → instant swap
        if (!prev || prev === next || mqReduce.matches) {
            steps.forEach(function (s) {
                s.hidden = (s !== next);
                s.classList.remove('is-anim');
                s.style.transform = ''; s.style.opacity = '';
            });
            stage.style.height = '';
            window.scrollTo({ top: 0, behavior: 'smooth' });
            return;
        }

        // Direction: forward flies in from the right, back from the left.
        var offset = 44 * (stepIndex(step) >= stepIndex(prev.dataset.step) ? 1 : -1);
        var h0 = prev.offsetHeight;

        next.hidden = false;
        next.classList.add('is-anim');
        next.style.transform = 'translateX(' + offset + 'px)';
        next.style.opacity = '0';
        var h1 = next.offsetHeight;      // measured while off-screen

        prev.classList.add('is-anim');
        stage.style.height = h0 + 'px';
        void stage.offsetHeight;         // reflow so the height transition runs

        requestAnimationFrame(function () {
            stage.style.height = h1 + 'px';
            prev.style.transform = 'translateX(' + (-offset) + 'px)';
            prev.style.opacity = '0';
            next.style.transform = 'translateX(0)';
            next.style.opacity = '1';
        });
        window.scrollTo({ top: 0, behavior: 'smooth' });

        window.setTimeout(function () {
            prev.hidden = true;
            prev.classList.remove('is-anim'); prev.style.transform = ''; prev.style.opacity = '';
            next.classList.remove('is-anim'); next.style.transform = ''; next.style.opacity = '';
            stage.style.height = '';       // back to natural flow
        }, 520);
    }

    // ── Confetti: high-intensity delight for the rare "You're in" moment ─────
    function fireConfetti() {
        var canvas = document.getElementById('confetti-canvas');
        if (!canvas || mqReduce.matches) return;
        var ctx = canvas.getContext('2d');
        var dpr = Math.min(window.devicePixelRatio || 1, 2);
        canvas.width = window.innerWidth * dpr;
        canvas.height = window.innerHeight * dpr;
        canvas.style.display = 'block';
        var colors = ['#7c3aed', '#a78bfa', '#22c55e', '#f59e0b', '#ec4899', '#38bdf8'];
        var parts = [];
        for (var i = 0; i < 130; i++) {
            parts.push({
                x: window.innerWidth * 0.5 * dpr + (Math.random() - 0.5) * 90 * dpr,
                y: window.innerHeight * 0.42 * dpr,
                vx: (Math.random() - 0.5) * 11 * dpr,
                vy: (Math.random() * -9 - 4) * dpr,
                g: 0.26 * dpr,
                w: (4 + Math.random() * 5) * dpr,
                h: (6 + Math.random() * 8) * dpr,
                rot: Math.random() * Math.PI,
                vr: (Math.random() - 0.5) * 0.32,
                color: colors[i % colors.length]
            });
        }
        var start = performance.now();
        (function frame(now) {
            var t = now - start;
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            var alive = false;
            for (var i = 0; i < parts.length; i++) {
                var p = parts[i];
                p.vy += p.g; p.x += p.vx; p.y += p.vy; p.rot += p.vr; p.vx *= 0.99;
                var a = t < 1700 ? 1 : Math.max(0, 1 - (t - 1700) / 700);
                if (p.y < canvas.height + 40 * dpr && a > 0) alive = true;
                ctx.save();
                ctx.globalAlpha = a;
                ctx.translate(p.x, p.y);
                ctx.rotate(p.rot);
                ctx.fillStyle = p.color;
                ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
                ctx.restore();
            }
            if (t < 2600 && alive) requestAnimationFrame(frame);
            else { ctx.clearRect(0, 0, canvas.width, canvas.height); canvas.style.display = 'none'; }
        })(start);
    }

    function setError(el, msg) {
        if (!el) return;
        el.textContent = msg || '';
        el.hidden = !msg;
    }

    // ── STEP 0 · invite ───────────────────────────────────────────────────────
    var inviteForm = document.getElementById('invite-form');
    var inviteInput = document.getElementById('invite-code');
    var inviteError = document.getElementById('invite-error');

    // Pre-fill the code from an invite link (?invite=CODE)
    var inviteParam = params.get('invite');
    if (inviteParam) inviteInput.value = inviteParam;

    inviteForm.addEventListener('submit', function (e) {
        e.preventDefault();
        var code = (inviteInput.value || '').trim();
        setError(inviteError, '');
        if (!code) { setError(inviteError, 'Enter your invite code.'); return; }

        if (!LIVE) {                                   // preview: accept anything
            localStorage.setItem(PENDING_KEY, code);
            showStep(1);
            return;
        }

        var btn = inviteForm.querySelector('button');
        btn.disabled = true;
        sb.rpc('validate_invite', { p_code: code }).then(function (res) {
            btn.disabled = false;
            if (res.error) { setError(inviteError, res.error.message); return; }
            if (!res.data) { setError(inviteError, 'That code is invalid or already used.'); return; }
            localStorage.setItem(PENDING_KEY, code);
            showStep(1);
        });
    });

    // ── STEP 1 · Google auth ──────────────────────────────────────────────────
    var googleBtn = document.getElementById('google-btn');
    var authNote = document.getElementById('auth-note');

    googleBtn.addEventListener('click', function () {
        if (!LIVE) {                                   // preview: simulate
            authNote.textContent = 'Preview mode — skipping real Google sign-in.';
            setTimeout(function () { showStep(2); syncInitials(); }, 400);
            return;
        }
        googleBtn.disabled = true;
        persistJoinMode();
        sb.auth.signInWithOAuth({
            provider: 'google',
            options: { redirectTo: oauthRedirectTo() }
        });
    });

    document.querySelectorAll('[data-back]').forEach(function (b) {
        b.addEventListener('click', function () { showStep(0); });
    });

    // ── STEP 2 · profile ───────────────────────────────────────────────────────
    var nameEl = document.getElementById('pf-name');
    var avatarInput = document.getElementById('avatar-input');
    var avatarImg = document.getElementById('avatar-img');
    var avatarInitials = document.getElementById('avatar-initials');
    var profileForm = document.getElementById('profile-form');
    var profileError = document.getElementById('profile-error');
    var submitBtn = document.getElementById('profile-submit');

    // ── Delete profile (edit mode only) ───────────────────────────────────────
    var deleteZone = document.getElementById('delete-profile-zone');
    var deleteTrigger = document.getElementById('delete-profile-trigger');
    var deleteModal = document.getElementById('delete-profile-modal');
    var deleteModalCard = deleteModal.querySelector('.modal-card');
    var deleteModalClose = document.getElementById('delete-modal-close');
    var deleteModalCancel = document.getElementById('delete-modal-cancel');
    var deleteModalConfirm = document.getElementById('delete-modal-confirm');
    var deleteModalError = document.getElementById('delete-modal-error');

    function openDeleteModal() {
        deleteModal.classList.add('is-open');
        deleteModalCard.classList.add('is-open');
    }
    function closeDeleteModal() {
        deleteModal.classList.remove('is-open');
        deleteModalCard.classList.remove('is-open');
        setError(deleteModalError, '');
    }
    deleteTrigger.addEventListener('click', openDeleteModal);
    deleteModalClose.addEventListener('click', closeDeleteModal);
    deleteModalCancel.addEventListener('click', closeDeleteModal);
    deleteModal.addEventListener('click', function (e) { if (e.target === deleteModal) closeDeleteModal(); });
    document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape' && deleteModal.classList.contains('is-open')) closeDeleteModal();
    });

    deleteModalConfirm.addEventListener('click', function () {
        setError(deleteModalError, '');
        if (!LIVE) {                                    // preview: simulate
            localStorage.removeItem(PENDING_KEY);
            location.href = ST_SITE.home();
            return;
        }
        deleteModalConfirm.disabled = true;
        sb.auth.getUser().then(function (u) {
            var user = u.data && u.data.user;
            if (!user) { location.href = ST_SITE.home(); return; }
            sb.from('profiles').delete().eq('id', user.id).then(function (res) {
                if (res.error) {
                    deleteModalConfirm.disabled = false;
                    setError(deleteModalError, res.error.message);
                    return;
                }
                sb.auth.signOut().then(function () { location.href = ST_SITE.home(); });
            });
        });
    });

    function syncInitials() {
        var n = (nameEl.value || '').trim();
        avatarInitials.textContent = n ? n.charAt(0).toUpperCase() : '?';
    }
    nameEl.addEventListener('input', syncInitials);

    // ── username reservation (live availability) ─────────────────────────────
    var usernameEl = document.getElementById('pf-username');
    var usernameStatus = document.getElementById('username-status');
    var usernameOk = false;
    var usernameTimer = null;

    function setUserStatus(cls, msg) {
        usernameStatus.className = 'join-username-status' + (cls ? ' ' + cls : '');
        usernameStatus.textContent = msg || '';
    }

    usernameEl.addEventListener('input', function () {
        var v = usernameEl.value.toLowerCase().replace(/[^a-z0-9_]/g, '');
        if (v !== usernameEl.value) usernameEl.value = v;   // sanitize as they type
        usernameOk = false;
        if (usernameTimer) clearTimeout(usernameTimer);
        if (v.length < 3) { setUserStatus('is-bad', v ? 'At least 3 characters.' : ''); return; }
        setUserStatus('is-checking', 'Checking…');
        usernameTimer = setTimeout(function () { checkUsername(v); }, 350);
    });

    function checkUsername(v) {
        if (v === currentUsername) { usernameOk = true; setUserStatus('is-ok', 'Your current handle'); return; }
        if (!LIVE) { usernameOk = true; setUserStatus('is-ok', '@' + v + ' is available'); return; }
        sb.rpc('username_available', { p_username: v }).then(function (res) {
            if (usernameEl.value.toLowerCase() !== v) return;   // input changed meanwhile
            if (res.error) { setUserStatus('is-bad', res.error.message); return; }
            if (res.data) { usernameOk = true; setUserStatus('is-ok', '@' + v + ' is available'); }
            else { usernameOk = false; setUserStatus('is-bad', '@' + v + ' is taken'); }
        });
    }

    avatarInput.addEventListener('change', function () {
        var f = avatarInput.files && avatarInput.files[0];
        if (!f) return;
        if (!f.size) {
            avatarFile = null;
            avatarInput.value = '';
            setError(profileError, 'That photo couldn\'t be read. Try a JPG or PNG, or skip the photo for now.');
            return;
        }
        setError(profileError, '');
        avatarFile = f;
        var reader = new FileReader();
        reader.onload = function (ev) {
            avatarImg.src = ev.target.result;
            avatarImg.hidden = false;
            avatarInitials.style.display = 'none';
        };
        reader.readAsDataURL(f);
    });

    // ── organisation badges (pick up to 3 from the official set) ─────────────
    // Beta: members can only choose badges we provide. To add one, drop the SVG
    // into photos/badges/ and add an entry here.
    var AVAILABLE_BADGES = [
        { label: 'Sarawak Energy',      src: 'photos/badges/sarawak-energy-icon.svg' },
        { label: 'Petros',              src: 'photos/badges/petros-icon.svg' },
        { label: 'AirBorneo',           src: 'photos/badges/air-borneo-icon.svg' },
        { label: 'Sarawak Metro',       src: 'photos/badges/sarawakmetro-icon.svg' },
        { label: 'Sarawak Future Fund', src: 'photos/badges/sswff-icon.svg' },
        { label: 'PetrolPrice',         src: 'photos/badges/petrolprice-icon.svg' }
    ];
    // Owner-only badges — never shown in the public picker, but still recognised
    // so aaron/marc/raden don't wipe their Sarawak Talents mark when they edit.
    var RESERVED_BADGES = ['photos/badges/sarawak-talents.svg'];
    // Assigned badges — display on profiles but never offered in the edit picker
    // (grant via admin / database — e.g. @heinekenl has the Timogah badge).
    var ASSIGNED_BADGES = ['photos/badges/timogah-icon.svg'];
    var MAX_BADGES = 1;                 // default cap for regular members
    var OWNER_USERNAMES = ['aaron', 'harting', 'khairulzaman'];  // owners may hold multiple badges
    var maxBadges = MAX_BADGES;         // raised for owners in edit mode
    var isOwner = false;
    var selectedBadges = [];            // chosen badge src paths

    var badgePicker = document.getElementById('badge-picker');
    var badgeHint = document.getElementById('badge-hint');

    function renderBadgePicker() {
        badgePicker.innerHTML = '';
        // Owners also see the reserved (Sarawak Talents) badges as pickable tiles.
        var pickable = AVAILABLE_BADGES.slice();
        if (isOwner) RESERVED_BADGES.forEach(function (src) { pickable.push({ label: 'Sarawak Talents', src: src }); });
        pickable.forEach(function (b) {
            var sel = selectedBadges.indexOf(b.src) >= 0;
            var tile = document.createElement('button');
            tile.type = 'button';
            tile.className = 'join-badge-tile' + (sel ? ' is-selected' : '');
            tile.title = b.label;
            tile.innerHTML = '<img src="' + ST_SITE.asset(b.src) + '" alt="' + b.label + '">' +
                (sel ? '<span class="join-badge-check">✓</span>' : '');
            tile.addEventListener('click', function () { toggleBadge(b.src); });
            badgePicker.appendChild(tile);
        });
        // Placeholder tile — more badges on the way.
        var soon = document.createElement('div');
        soon.className = 'join-badge-tile join-badge-tile--soon';
        soon.title = 'More coming soon';
        soon.innerHTML = '<span>More<br>coming<br>soon</span>';
        badgePicker.appendChild(soon);

        if (badgeHint) {
            badgeHint.textContent = isOwner
                ? 'You can select more than one badge. The first shows next to your name in the directory.'
                : (selectedBadges.length
                    ? 'This badge shows next to your name in the directory.'
                    : 'Pick one official badge (optional).');
        }
    }

    function toggleBadge(src) {
        var i = selectedBadges.indexOf(src);
        if (i >= 0) selectedBadges.splice(i, 1);                 // deselect
        else if (maxBadges === 1) selectedBadges = [src];        // single-select → replace
        else if (selectedBadges.length < maxBadges) selectedBadges.push(src);
        else selectedBadges = selectedBadges.slice(0, maxBadges - 1).concat(src);  // at cap → replace last
        renderBadgePicker();
        updatePreview();
    }

    renderBadgePicker();

    // Pre-fill the form from an existing profile (edit mode)
    function prefillProfile(p) {
        currentUsername = p.username || null;
        nameEl.value = p.name || '';
        usernameEl.value = p.username || '';
        document.getElementById('pf-role').value = p.role || '';
        var orgEl = document.getElementById('pf-organisation');
        if (orgEl) orgEl.value = p.organisation || '';
        document.getElementById('pf-location').value = p.location || '';
        setIndustry(p.industry || '');
        document.getElementById('pf-bio').value = p.bio || '';
        selectedLinks = {};
        var links = p.links || {};
        LINK_KEYS.forEach(function (k) {
            if (links[k]) selectedLinks[k] = collectLinkValue(k, links[k]);
        });
        renderSocialList();
        if (p.avatar_url) {
            avatarImg.src = p.avatar_url;
            avatarImg.hidden = false;
            avatarInitials.style.display = 'none';
        }
        // Organisation logos
        isOwner = OWNER_USERNAMES.indexOf((p.username || '').toLowerCase()) >= 0;
        maxBadges = isOwner ? 3 : MAX_BADGES;
        var orgs = (p.org_photos && p.org_photos.length) ? p.org_photos : (p.org_photo ? [p.org_photo] : []);
        var validSrcs = AVAILABLE_BADGES.map(function (b) { return b.src; })
            .concat(RESERVED_BADGES, ASSIGNED_BADGES);
        selectedBadges = orgs.filter(function (u) { return validSrcs.indexOf(u) >= 0; }).slice(0, maxBadges);
        renderBadgePicker();
        // Education
        var edu = p.education || {};
        document.getElementById('pf-edu-program').value = edu.program || '';
        document.getElementById('pf-edu-school').value = edu.school || '';
        usernameOk = true;
        setUserStatus('is-ok', 'Your current handle');
        syncInitials();
        updatePreview();
    }

    // Retitle the profile step for editing
    function applyEditChrome() {
        var title = document.querySelector('.join-step[data-step="2"] .join-title');
        var sub = document.querySelector('.join-step[data-step="2"] .join-sub');
        if (title) title.textContent = 'Edit your profile';
        if (sub) sub.textContent = 'Update what the community sees.';
        submitBtn.textContent = 'Save changes';
        deleteZone.hidden = false;
    }

    var LINK_KEYS = ['website', 'instagram', 'x', 'linkedin', 'facebook', 'tiktok', 'github', 'whatsapp', 'email'];
    var selectedLinks = {};
    var SOCIAL_META = {
        website:   { label: 'Website',   affix: '',                        affixClass: '', placeholder: 'yoursite.com', type: 'url' },
        instagram: { label: 'Instagram', affix: '@',                       affixClass: 'sm', placeholder: 'handle', type: 'text' },
        x:         { label: 'X (Twitter)', affix: '@',                     affixClass: 'sm', placeholder: 'handle', type: 'text' },
        linkedin:  { label: 'LinkedIn',  affix: 'www.linkedin.com/in/',    affixClass: 'lg', placeholder: 'your-name', type: 'text' },
        facebook:  { label: 'Facebook',  affix: 'facebook.com/',           affixClass: 'md', placeholder: 'your.page', type: 'text' },
        tiktok:    { label: 'TikTok',    affix: '@',                       affixClass: 'sm', placeholder: 'handle', type: 'text' },
        github:    { label: 'GitHub',    affix: '@',                       affixClass: 'sm', placeholder: 'handle', type: 'text' },
        whatsapp:  { label: 'WhatsApp',  affix: '',                        affixClass: '', placeholder: '60123456789', type: 'tel' },
        email:     { label: 'Email',     affix: '',                        affixClass: '', placeholder: 'you@email.com', type: 'email' }
    };

    var socialListEl = document.getElementById('social-list');
    var socialPlatformEl = document.getElementById('social-platform');
    var socialValueRow = document.getElementById('social-value-row');
    var socialAffixEl = document.getElementById('social-affix');
    var socialValueEl = document.getElementById('social-value');
    var socialAddBtn = document.getElementById('social-add-btn');

    // Prefixed social fields: UI shows the fixed part; store values profile.js can open.
    function stripLinkInput(key, raw) {
        var v = String(raw || '').trim();
        if (!v) return '';
        if (key === 'instagram' || key === 'x' || key === 'tiktok' || key === 'github') {
            v = v.replace(/^https?:\/\/(www\.)?(instagram\.com|x\.com|twitter\.com|tiktok\.com\/@?|github\.com)\//i, '');
            return v.replace(/^@+/, '').replace(/\/+$/, '');
        }
        if (key === 'linkedin') {
            v = v.replace(/^https?:\/\//i, '').replace(/^www\./i, '');
            v = v.replace(/^linkedin\.com\/in\//i, '');
            return v.replace(/^\/+|\/+$/g, '').split(/[?#]/)[0];
        }
        if (key === 'facebook') {
            v = v.replace(/^https?:\/\//i, '').replace(/^www\./i, '');
            v = v.replace(/^facebook\.com\/(?:profile\.php\?id=)?/i, '');
            return v.replace(/^@+/, '').replace(/^\/+|\/+$/g, '').split(/[?#]/)[0];
        }
        return v;
    }

    function collectLinkValue(key, raw) {
        var slug = stripLinkInput(key, raw);
        if (!slug) return '';
        if (key === 'instagram' || key === 'x' || key === 'facebook' || key === 'tiktok' || key === 'github') return slug;
        if (key === 'linkedin') return 'https://www.linkedin.com/in/' + slug;
        return String(raw || '').trim();
    }

    function displayLinkValue(key, stored) {
        var slug = stripLinkInput(key, stored);
        var meta = SOCIAL_META[key];
        if (!meta) return stored;
        if (meta.affix === '@') return '@' + slug;
        if (key === 'linkedin') return 'www.linkedin.com/in/' + slug;
        if (key === 'facebook') return 'facebook.com/' + slug;
        return stored;
    }

    function refreshSocialPlatformOptions() {
        if (!socialPlatformEl) return;
        var current = socialPlatformEl.value;
        Array.prototype.forEach.call(socialPlatformEl.options, function (opt) {
            if (!opt.value) return;
            opt.hidden = !!selectedLinks[opt.value];
            opt.disabled = !!selectedLinks[opt.value];
        });
        if (current && selectedLinks[current]) {
            socialPlatformEl.value = '';
            syncSocialInputChrome();
        }
    }

    function syncSocialInputChrome() {
        if (!socialPlatformEl || !socialValueRow || !socialValueEl || !socialAffixEl) return;
        var key = socialPlatformEl.value;
        var meta = SOCIAL_META[key];
        if (!meta) {
            socialValueRow.hidden = true;
            socialValueEl.value = '';
            return;
        }
        socialValueRow.hidden = false;
        socialValueEl.type = meta.type || 'text';
        socialValueEl.placeholder = meta.placeholder || '';
        socialValueEl.className = 'join-input';
        if (meta.affix) {
            socialAffixEl.hidden = false;
            socialAffixEl.textContent = meta.affix;
            socialAffixEl.className = 'join-affix' + (meta.affixClass === 'lg' || meta.affixClass === 'md' ? ' join-affix--long' : '');
            socialValueEl.classList.add(
                meta.affixClass === 'lg' ? 'join-input--affix-lg' :
                meta.affixClass === 'md' ? 'join-input--affix-md' : 'join-input--affix-sm'
            );
        } else {
            socialAffixEl.hidden = true;
            socialAffixEl.textContent = '';
        }
        socialValueEl.focus();
    }

    function renderSocialList() {
        if (!socialListEl) return;
        socialListEl.innerHTML = '';
        var keys = LINK_KEYS.filter(function (k) { return !!selectedLinks[k]; });
        socialListEl.hidden = keys.length === 0;
        keys.forEach(function (key) {
            var meta = SOCIAL_META[key] || { label: key };
            var li = document.createElement('li');
            li.className = 'join-social-chip';

            var text = document.createElement('span');
            text.className = 'join-social-chip-text';

            var label = document.createElement('span');
            label.className = 'join-social-chip-label';
            label.textContent = meta.label;

            var sep = document.createElement('span');
            sep.className = 'join-social-chip-sep';
            sep.setAttribute('aria-hidden', 'true');
            sep.textContent = '·';

            var value = document.createElement('span');
            value.className = 'join-social-chip-value';
            value.textContent = displayLinkValue(key, selectedLinks[key]);

            text.appendChild(label);
            text.appendChild(sep);
            text.appendChild(value);

            var remove = document.createElement('button');
            remove.type = 'button';
            remove.className = 'join-social-chip-x';
            remove.setAttribute('aria-label', 'Remove ' + meta.label);
            remove.textContent = '×';
            remove.addEventListener('click', function () {
                delete selectedLinks[key];
                renderSocialList();
                refreshSocialPlatformOptions();
            });

            li.appendChild(text);
            li.appendChild(remove);
            socialListEl.appendChild(li);
        });
        refreshSocialPlatformOptions();
    }

    function addSelectedSocial() {
        if (!socialPlatformEl || !socialValueEl) return;
        var key = socialPlatformEl.value;
        if (!key || !SOCIAL_META[key]) return;
        var stored = collectLinkValue(key, socialValueEl.value);
        if (!stored) {
            socialValueEl.focus();
            return;
        }
        selectedLinks[key] = stored;
        socialValueEl.value = '';
        socialPlatformEl.value = '';
        syncSocialInputChrome();
        renderSocialList();
    }

    if (socialPlatformEl) {
        socialPlatformEl.addEventListener('change', syncSocialInputChrome);
    }
    if (socialAddBtn) {
        socialAddBtn.addEventListener('click', addSelectedSocial);
    }
    if (socialValueEl) {
        socialValueEl.addEventListener('keydown', function (e) {
            if (e.key === 'Enter') {
                e.preventDefault();
                addSelectedSocial();
            }
        });
    }
    renderSocialList();

    function collectProfile(uid) {
        var links = {};
        LINK_KEYS.forEach(function (k) {
            if (selectedLinks[k]) links[k] = selectedLinks[k];
        });
        return {
            id: uid,
            username: usernameEl.value.trim().toLowerCase(),
            name: nameEl.value.trim(),
            role: document.getElementById('pf-role').value.trim(),
            organisation: (document.getElementById('pf-organisation').value || '').trim() || null,
            category: null,
            location: document.getElementById('pf-location').value,
            industry: currentIndustry() || null,
            background: null,
            bio: document.getElementById('pf-bio').value.trim() || null,
            links: links,
            education: collectEducation(),
            org_photos: selectedBadges.slice(0, maxBadges),
            org_photo: selectedBadges[0] || null        // primary → directory badge
        };
    }

    function collectEducation() {
        var e = {};
        var prog = document.getElementById('pf-edu-program').value.trim();
        var school = document.getElementById('pf-edu-school').value.trim();
        if (prog) e.program = prog;
        if (school) e.school = school;
        return e;
    }

    function validProfile() {
        if (!nameEl.value.trim()) return 'Please enter your name.';
        if (!/^[a-z0-9_]{3,20}$/.test(usernameEl.value)) return 'Pick a username (3–20 letters, numbers, _).';
        if (!usernameOk) return 'That username isn\'t available — try another.';
        if (!document.getElementById('pf-role').value.trim()) return 'Please enter your role.';
        if (!currentIndustry()) return 'Please choose your industry.';
        if (!document.getElementById('pf-location').value) return 'Please choose a location.';
        return null;
    }

    profileForm.addEventListener('submit', function (e) {
        e.preventDefault();
        setError(profileError, '');
        var err = validProfile();
        if (err) { setError(profileError, err); return; }

        if (!LIVE) {                                   // preview: just finish
            submitBtn.disabled = true;
            setTimeout(function () { finish(); }, 500);
            return;
        }
        submitLive();
    });

    function submitLive() {
        submitBtn.disabled = true;
        sb.auth.getUser().then(function (u) {
            var user = u.data && u.data.user;
            if (!user) { submitBtn.disabled = false; setError(profileError, 'Session expired — please sign in again.'); showStep(1); return; }
            // Only the avatar is uploaded now; badges are chosen from our set.
            // Photo is optional — a failed upload must not block profile creation.
            var avatarUploadFailed = false;
            // referred_by is only ever set at first creation (edit mode never
            // touches it — the DB also enforces this via a lock trigger).
            var refUsername = (!editMode && localStorage.getItem(PENDING_REF_KEY)) || null;
            var referredByPromise = refUsername
                ? sb.rpc('resolve_referrer', { p_username: refUsername })
                    .then(function (r) { return r.data || null; })
                    .catch(function () { return null; })
                : Promise.resolve(null);

            Promise.all([
                uploadImage(avatarFile, user.id, 'avatar').catch(function (err) {
                    avatarUploadFailed = true;
                    console.warn('[join] avatar upload failed:', err);
                    return null;
                }),
                referredByPromise
            ]).then(function (results) {
                var avatarUrl = results[0], referredBy = results[1];
                var payload = collectProfile(user.id);   // includes org_photos / org_photo
                if (avatarUrl) payload.avatar_url = avatarUrl;   // don't wipe existing on edit
                if (referredBy && referredBy !== user.id) payload.referred_by = referredBy;
                return sb.from('profiles').upsert(payload).select().single();
            }).then(function (res) {
                submitBtn.disabled = false;
                if (res.error) {
                    if (res.error.code === '23505' || /username/i.test(res.error.message || '')) {
                        usernameOk = false;
                        setUserStatus('is-bad', 'Just taken — pick another.');
                        setError(profileError, 'That username was just taken. Please choose another.');
                    } else {
                        setError(profileError, res.error.message);
                    }
                    return;
                }
                localStorage.removeItem(PENDING_KEY);
                localStorage.removeItem(PENDING_REF_KEY);
                if (avatarUploadFailed) {
                    setError(profileError, 'Profile saved — your photo didn\'t upload. You can add one from Edit profile.');
                }
                syncAchievementBadges(res.data);   // fire-and-forget: tags + badge check(s)
                finish();
            }).catch(function (ex) {
                submitBtn.disabled = false;
                var msg = (ex && ex.message) || 'Something went wrong.';
                if (/no content provided/i.test(msg)) {
                    msg = 'That photo couldn\'t be uploaded. Try a JPG or PNG, or submit without a photo.';
                }
                setError(profileError, msg);
            });
        });
    }

    // Re-checks real-time badges after a profile save. Doesn't block the
    // "You're in" screen; the toast can land a beat later. If this profile was
    // referred by someone, also re-check the referrer (Ambassador progress).
    function syncAchievementBadges(profile) {
        var uid = profile.id;
        sb.rpc('check_and_award_badges', { p_user_id: uid }).then(function (r) {
            if (r.data && r.data.length && window.BadgeToast) BadgeToast.show(r.data);
        });
        if (profile.referred_by) {
            sb.rpc('check_and_award_badges', { p_user_id: profile.referred_by });
        }
    }

    function uploadImage(file, uid, key) {
        if (!file || !file.size) return Promise.resolve(null);
        var ext = (file.name.split('.').pop() || 'jpg').toLowerCase();
        var path = uid + '/' + key + '.' + ext;
        var opts = { upsert: true };
        if (file.type) opts.contentType = file.type;
        return sb.storage.from('avatars').upload(path, file, opts)
            .then(function (res) {
                if (res.error) throw res.error;
                // cache-bust so a re-upload shows immediately
                return sb.storage.from('avatars').getPublicUrl(path).data.publicUrl + '?t=' + Date.now();
            });
    }

    function finish() {
        if (editMode) { location.href = ST_SITE.home(); return; }
        showStep('done');
        setTimeout(fireConfetti, 180);   // fire as the "done" tray settles
        var chk = document.querySelector('.join-done .t-success-check');
        if (chk) setTimeout(function () { chk.setAttribute('data-state', 'in'); }, 240);
    }

    // ── returning from Google OAuth (live mode) ────────────────────────────────
    function resumeFromSession(session) {
        if (!LIVE) return;
        var mode = joinMode();
        var editing = mode === 'edit';
        authRouted = true;

        if (!session) {
            if (mode === 'login' || mode === 'edit') showStep(1);
            else showStep(0);
            return;
        }

        var uid = session.user.id;
        sb.from('profiles').select('*').eq('id', uid).maybeSingle().then(function (p) {
            if (p.data) {
                if (editing) {
                    clearJoinMode();
                    applyEditChrome();
                    prefillProfile(p.data);
                    showStep(2);
                    return;
                }
                clearJoinMode();
                location.href = ST_SITE.home(); return;  // already a member → directory
            }
            if (editing) { showStep(0); return; }  // nothing to edit yet
            var code = localStorage.getItem(PENDING_KEY);
            if (!code) { showStep(0); return; }    // need an invite
            sb.rpc('claim_invite', { p_code: code }).then(function (c) {
                if (c.error) { setError(inviteError, c.error.message); showStep(0); return; }
                clearJoinMode();
                showStep(2); syncInitials();
            });
        });
    }

    // Resolve the session without racing a null getSession() against INITIAL_SESSION,
    // and without calling other auth/DB APIs inside onAuthStateChange (deadlocks the lock).
    function resolveSession() {
        return sb.auth.getSession().then(function (res) {
            var session = res.data && res.data.session;
            if (session) return session;
            // Late restore / token refresh — brief retry before treating as signed out.
            return new Promise(function (resolve) {
                setTimeout(function () {
                    sb.auth.getSession().then(function (res2) {
                        var s2 = res2.data && res2.data.session;
                        if (s2) { resolve(s2); return; }
                        sb.auth.getUser().then(function (u) {
                            if (!(u.data && u.data.user)) { resolve(null); return; }
                            sb.auth.getSession().then(function (res3) {
                                resolve(res3.data && res3.data.session);
                            });
                        }).catch(function () { resolve(null); });
                    });
                }, 150);
            });
        });
    }

    // ── Post-signup onboarding tour (3 slides) ─────────────────────────────────
    (function () {
        var overlay = document.getElementById('onboarding-overlay');
        if (!overlay) return;

        var startBtn = document.getElementById('start-onboarding-btn');
        var skipBtn = document.getElementById('onboarding-skip');
        var nextBtn = document.getElementById('onboarding-next');
        var backBtn = document.getElementById('onboarding-back');
        var slides = Array.prototype.slice.call(overlay.querySelectorAll('.onboarding-slide'));
        var dots = Array.prototype.slice.call(overlay.querySelectorAll('.onboarding-dot'));
        var total = slides.length;
        var current = 0;

        function goHome() { location.href = ST_SITE.home(); }

        function render() {
            slides.forEach(function (s, i) {
                s.hidden = i !== current;
                s.classList.toggle('is-active', i === current);
            });
            dots.forEach(function (d, i) { d.classList.toggle('is-active', i === current); });
            backBtn.hidden = current === 0;
            nextBtn.textContent = current === total - 1 ? 'Explore the directory' : 'Next';
        }

        if (startBtn) {
            startBtn.addEventListener('click', function () {
                current = 0;
                overlay.hidden = false;
                render();
            });
        }

        nextBtn.addEventListener('click', function () {
            if (current === total - 1) { goHome(); return; }
            current += 1;
            render();
        });

        backBtn.addEventListener('click', function () {
            if (current === 0) return;
            current -= 1;
            render();
        });

        if (skipBtn) skipBtn.addEventListener('click', goHome);

        document.addEventListener('keydown', function (e) {
            if (overlay.hidden) return;
            if (e.key === 'Escape') goHome();
            if (e.key === 'ArrowRight') nextBtn.click();
            if (e.key === 'ArrowLeft' && current > 0) backBtn.click();
        });
    })();

    // ── init ──────────────────────────────────────────────────────────────────
    if (LIVE) {
        // Defer routing until session restore finishes. Never lock onto a null
        // session from a racing first tick — that was sending signed-in members
        // to "Continue with Google" on every Edit profile click.
        resolveSession().then(function (session) {
            resumeFromSession(session);
        });

        // After Google OAuth returns, SIGNED_IN can arrive after our first resolve.
        // Defer out of the auth callback before touching DB (avoids auth deadlocks).
        sb.auth.onAuthStateChange(function (event, session) {
            if (event !== 'SIGNED_IN' || !session) return;
            setTimeout(function () {
                var mode = joinMode();
                if (mode === 'edit' || mode === 'login' || currentStep === '1' || !authRouted) {
                    resumeFromSession(session);
                }
            }, 0);
        });
    } else {
        if (editMode) { applyEditChrome(); showStep(2); }
        else showStep(params.get('mode') === 'login' ? 1 : 0);
    }
})();
