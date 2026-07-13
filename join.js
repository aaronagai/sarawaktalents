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

    // mode=edit can be lost across the Google OAuth round-trip (redirectTo used to
    // drop the query string). Persist it so returning members still land in edit.
    function joinMode() {
        var m = params.get('mode');
        if (m) return m;
        try { return sessionStorage.getItem(JOIN_MODE_KEY) || ''; } catch (e) { return ''; }
    }
    function isEditMode() { return joinMode() === 'edit'; }
    function persistJoinMode() {
        var m = params.get('mode');
        if (m === 'edit' || m === 'login') {
            try { sessionStorage.setItem(JOIN_MODE_KEY, m); } catch (e) {}
        }
    }
    function clearJoinMode() {
        try { sessionStorage.removeItem(JOIN_MODE_KEY); } catch (e) {}
    }
    function oauthRedirectTo() {
        return location.origin + location.pathname + (location.search || '');
    }

    var editMode = isEditMode();
    persistJoinMode();

    // Persist a referral (?ref=<username>) across the Google OAuth round-trip,
    // same idea as PENDING_KEY for invite codes. Only meaningful for a brand
    // new signup — never touched again once a profile exists.
    var refParam = params.get('ref');
    if (refParam && !editMode) localStorage.setItem(PENDING_REF_KEY, refParam.trim().toLowerCase());

    if (!LIVE && banner) banner.hidden = false;

    // ── Industry dropdown + live profile-line preview ───────────────────
    var industrySelect = document.getElementById('pf-industry-select');
    var industryOther = document.getElementById('pf-industry'); // holds the "Other" value
    var previewEl = document.getElementById('pf-preview');
    var roleOrgPreviewEl = document.getElementById('pf-role-org-preview');

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

    // The single source of truth for the chosen industry (dropdown or "Other").
    function currentIndustry() {
        if (!industrySelect) return industryOther ? industryOther.value.trim() : '';
        if (industrySelect.value === '__other') return industryOther ? industryOther.value.trim() : '';
        return industrySelect.value || '';
    }
    function setIndustry(val) {
        val = (val || '').trim();
        if (!industrySelect) { if (industryOther) industryOther.value = val; return; }
        var opt = Array.prototype.filter.call(industrySelect.options, function (o) {
            return o.value !== '__other' && o.value.toLowerCase() === val.toLowerCase();
        })[0];
        if (val && opt) {
            industrySelect.value = opt.value;
            if (industryOther) { industryOther.hidden = true; industryOther.value = ''; industryOther.required = false; }
        } else if (val) {
            industrySelect.value = '__other';
            if (industryOther) { industryOther.hidden = false; industryOther.value = val; industryOther.required = true; }
        } else {
            industrySelect.selectedIndex = 0;
            if (industryOther) { industryOther.hidden = true; industryOther.value = ''; industryOther.required = false; }
        }
        updatePreview();
    }

    // Grammar-proof profile line — mirrors the renderer in profile.js.
    function leadArticle(word) { return /^[aeiou]/i.test((word || '').trim()) ? 'an' : 'a'; }
    function buildLead(name, role, industry) {
        var first = (name || '').trim().split(/\s+/)[0] || 'You';
        role = (role || '').trim();
        industry = (industry || '').trim();
        var same = role && industry && role.toLowerCase() === industry.toLowerCase();
        if (role && industry && !same) return first + ' is ' + leadArticle(role) + ' ' + role + ' in ' + industry + '.';
        if (same || (industry && !role)) return first + ' works in ' + industry + '.';
        if (role) return first + ' is ' + leadArticle(role) + ' ' + role + '.';
        return '';
    }
    function updatePreview() {
        if (!previewEl) return;
        var nameEl = document.getElementById('pf-name');
        var roleEl = document.getElementById('pf-role');
        var line = buildLead(nameEl ? nameEl.value : '', roleEl ? roleEl.value : '', currentIndustry());
        if (line) { previewEl.textContent = 'Preview: ' + line; previewEl.hidden = false; }
        else { previewEl.hidden = true; }
        updateRoleOrgPreview();
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
        for (var i = 0; i < selectedBadges.length; i++) {
            var name = badgeOrgName(selectedBadges[i]);
            if (name) return name;
        }
        return '';
    }
    function updateRoleOrgPreview() {
        if (!roleOrgPreviewEl) return;
        var roleEl = document.getElementById('pf-role');
        var role = roleEl ? roleEl.value.trim() : '';
        var org = currentOrgName();
        var line = (role && org) ? role + ' at ' + org : (role || org || '');
        if (line) {
            roleOrgPreviewEl.textContent = 'Card line: ' + line;
            roleOrgPreviewEl.hidden = false;
        } else {
            roleOrgPreviewEl.hidden = true;
        }
    }

    if (industrySelect) {
        industrySelect.addEventListener('change', function () {
            var other = industrySelect.value === '__other';
            if (industryOther) {
                industryOther.hidden = !other;
                industryOther.required = other;
                if (other) industryOther.focus(); else industryOther.value = '';
            }
            updatePreview();
        });
    }
    ['pf-name', 'pf-role', 'pf-organisation'].forEach(function (id) {
        var e = document.getElementById(id);
        if (e) e.addEventListener('input', updatePreview);
    });
    if (industryOther) industryOther.addEventListener('input', updatePreview);

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
        updateRoleOrgPreview();
    }

    renderBadgePicker();

    // ── achievement tags ("Also skilled in...") — separate from the primary
    // Field/Industry selects above, purely for the Multi-Talented badge. Uses
    // the same source list as Industry (window.ST_INDUSTRIES) so it reads
    // against a familiar vocabulary, but never touches category/industry
    // themselves — those stay single-value scalars the directory's filter/
    // sort/search relies on. ─────────────────────────────────────────────────
    var ACHV_TAG_MAX = 6;
    var selectedTags = [];
    var tagPicker = document.getElementById('tag-picker');

    function renderTagPicker() {
        if (!tagPicker || !window.ST_INDUSTRIES) return;
        tagPicker.innerHTML = '';
        window.ST_INDUSTRIES.forEach(function (name) {
            var sel = selectedTags.indexOf(name) >= 0;
            var chip = document.createElement('button');
            chip.type = 'button';
            chip.className = 'join-tag-chip' + (sel ? ' is-selected' : '');
            chip.textContent = name;
            chip.addEventListener('click', function () { toggleTag(name); });
            tagPicker.appendChild(chip);
        });
    }

    function toggleTag(name) {
        var i = selectedTags.indexOf(name);
        if (i >= 0) selectedTags.splice(i, 1);
        else if (selectedTags.length < ACHV_TAG_MAX) selectedTags.push(name);
        else selectedTags = selectedTags.slice(0, ACHV_TAG_MAX - 1).concat(name);
        renderTagPicker();
    }

    renderTagPicker();

    // Pre-fill the form from an existing profile (edit mode)
    function prefillProfile(p) {
        currentUsername = p.username || null;
        nameEl.value = p.name || '';
        usernameEl.value = p.username || '';
        document.getElementById('pf-role').value = p.role || '';
        var orgEl = document.getElementById('pf-organisation');
        if (orgEl) orgEl.value = p.organisation || '';
        document.getElementById('pf-category').value = p.category || '';
        document.getElementById('pf-location').value = p.location || '';
        setIndustry(p.industry || '');
        document.getElementById('pf-bio').value = p.bio || '';
        var bioBmEl = document.getElementById('pf-bio-bm');
        if (bioBmEl) bioBmEl.value = p.bio_bm || '';
        if (LIVE) {
            sb.from('profile_tags').select('tag').eq('profile_id', p.id).then(function (res) {
                if (res.data) { selectedTags = res.data.map(function (r) { return r.tag; }); renderTagPicker(); }
            });
        }
        var links = p.links || {};
        LINK_KEYS.forEach(function (k) {
            var el = document.getElementById('pf-link-' + k);
            if (el) el.value = links[k] || '';
        });
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

    function collectProfile(uid) {
        var links = {};
        LINK_KEYS.forEach(function (k) {
            var el = document.getElementById('pf-link-' + k);
            var v = el ? el.value.trim() : '';
            if (v) links[k] = v;
        });
        return {
            id: uid,
            username: usernameEl.value.trim().toLowerCase(),
            name: nameEl.value.trim(),
            role: document.getElementById('pf-role').value.trim(),
            organisation: (document.getElementById('pf-organisation').value || '').trim() || null,
            category: document.getElementById('pf-category').value,
            location: document.getElementById('pf-location').value,
            industry: currentIndustry() || null,
            background: null,
            bio: document.getElementById('pf-bio').value.trim() || null,
            bio_bm: (document.getElementById('pf-bio-bm').value || '').trim() || null,
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
        if (!document.getElementById('pf-category').value) return 'Please choose a field.';
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

    // Replaces this profile's achievement tags with the current picker
    // selection, then re-checks real-time badges for this user AND (if this
    // profile was referred by someone) for the referrer — a referred
    // profile becoming complete is what makes Ambassador progress, and that
    // save happens in the REFERRED person's session, not the referrer's.
    // Doesn't block the "You're in" screen; the toast can land a beat later.
    function syncAchievementBadges(profile) {
        var uid = profile.id;
        sb.from('profile_tags').delete().eq('profile_id', uid).then(function () {
            var insert = selectedTags.length
                ? sb.from('profile_tags').insert(selectedTags.map(function (t) { return { profile_id: uid, tag: t }; }))
                : Promise.resolve(null);
            insert.then(function () {
                sb.rpc('check_and_award_badges', { p_user_id: uid }).then(function (r) {
                    if (r.data && r.data.length && window.BadgeToast) BadgeToast.show(r.data);
                });
                if (profile.referred_by) {
                    sb.rpc('check_and_award_badges', { p_user_id: profile.referred_by });
                }
            });
        });
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

        function proceed(sess) {
            if (!sess) {
                if (mode === 'login' || mode === 'edit') showStep(1);
                else showStep(0);
                return;
            }
            clearJoinMode();
            var uid = sess.user.id;
            sb.from('profiles').select('*').eq('id', uid).maybeSingle().then(function (p) {
                if (p.data) {
                    if (editing) { applyEditChrome(); prefillProfile(p.data); showStep(2); return; }
                    location.href = ST_SITE.home(); return;  // already a member → directory
                }
                if (editing) { showStep(0); return; }  // nothing to edit yet
                var code = localStorage.getItem(PENDING_KEY);
                if (!code) { showStep(0); return; }    // need an invite
                sb.rpc('claim_invite', { p_code: code }).then(function (c) {
                    if (c.error) { setError(inviteError, c.error.message); showStep(0); return; }
                    showStep(2); syncInitials();
                });
            });
        }

        if (session !== undefined) {
            proceed(session);
            return;
        }
        sb.auth.getSession().then(function (res) {
            proceed(res.data && res.data.session);
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
    // Wait for Supabase to finish restoring the session from storage / OAuth URL
    // before routing — getSession() alone can return null on the first tick.
    if (LIVE) {
        var authBooted = false;
        function bootAuth(session) {
            if (authBooted) return;
            authBooted = true;
            resumeFromSession(session);
        }
        sb.auth.onAuthStateChange(function (event, session) {
            if (event === 'INITIAL_SESSION' || event === 'SIGNED_IN') bootAuth(session);
        });
        sb.auth.getSession().then(function (res) {
            bootAuth(res.data && res.data.session);
        });
    } else {
        if (editMode) { applyEditChrome(); showStep(2); }
        else showStep(params.get('mode') === 'login' ? 1 : 0);
    }
})();
