/* ── Join flow controller ────────────────────────────────────────────
   Steps: 0 invite → 1 Google auth → 2 profile → done.
   Works in preview mode (no Supabase) and live mode.
   -------------------------------------------------------------------- */
(function () {
    'use strict';

    var sb = window.stSupabase;                 // null in preview mode
    var LIVE = !!sb;
    var PENDING_KEY = 'st_pending_invite';

    var steps = Array.prototype.slice.call(document.querySelectorAll('.join-step'));
    var dots = Array.prototype.slice.call(document.querySelectorAll('.join-progress-dot'));
    var banner = document.getElementById('preview-banner');
    var stage = document.getElementById('join-stage');
    var mqReduce = window.matchMedia('(prefers-reduced-motion: reduce)');
    var currentStep = null;
    var params = new URLSearchParams(location.search);

    var avatarFile = null;
    var editMode = params.get('mode') === 'edit';
    var currentUsername = null;      // the signed-in user's existing handle (edit mode)

    if (!LIVE && banner) banner.hidden = false;

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
        sb.auth.signInWithOAuth({
            provider: 'google',
            options: { redirectTo: location.origin + location.pathname }
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
            tile.innerHTML = '<img src="' + b.src + '" alt="' + b.label + '">' +
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
    }

    renderBadgePicker();

    // Pre-fill the form from an existing profile (edit mode)
    function prefillProfile(p) {
        currentUsername = p.username || null;
        nameEl.value = p.name || '';
        usernameEl.value = p.username || '';
        document.getElementById('pf-role').value = p.role || '';
        document.getElementById('pf-category').value = p.category || '';
        document.getElementById('pf-location').value = p.location || '';
        document.getElementById('pf-industry').value = p.industry || '';
        document.getElementById('pf-bio').value = p.bio || '';
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
        var validSrcs = AVAILABLE_BADGES.map(function (b) { return b.src; }).concat(RESERVED_BADGES);
        selectedBadges = orgs.filter(function (u) { return validSrcs.indexOf(u) >= 0; }).slice(0, maxBadges);
        renderBadgePicker();
        // Education
        var edu = p.education || {};
        document.getElementById('pf-edu-program').value = edu.program || '';
        document.getElementById('pf-edu-school').value = edu.school || '';
        usernameOk = true;
        setUserStatus('is-ok', 'Your current handle');
        syncInitials();
    }

    // Retitle the profile step for editing
    function applyEditChrome() {
        var title = document.querySelector('.join-step[data-step="2"] .join-title');
        var sub = document.querySelector('.join-step[data-step="2"] .join-sub');
        if (title) title.textContent = 'Edit your profile';
        if (sub) sub.textContent = 'Update what the community sees.';
        submitBtn.textContent = 'Save changes';
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
            category: document.getElementById('pf-category').value,
            location: document.getElementById('pf-location').value,
            industry: document.getElementById('pf-industry').value.trim() || null,
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
            uploadImage(avatarFile, user.id, 'avatar').then(function (avatarUrl) {
                var payload = collectProfile(user.id);   // includes org_photos / org_photo
                if (avatarUrl) payload.avatar_url = avatarUrl;   // don't wipe existing on edit
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
                finish();
            }).catch(function (ex) {
                submitBtn.disabled = false;
                setError(profileError, (ex && ex.message) || 'Something went wrong.');
            });
        });
    }

    function uploadImage(file, uid, key) {
        if (!file) return Promise.resolve(null);
        var ext = (file.name.split('.').pop() || 'jpg').toLowerCase();
        var path = uid + '/' + key + '.' + ext;
        return sb.storage.from('avatars').upload(path, file, { upsert: true })
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
    function resumeFromSession() {
        if (!LIVE) return;
        sb.auth.getSession().then(function (res) {
            var session = res.data && res.data.session;
            if (!session) {                            // not signed in yet
                var m = params.get('mode');
                if (m === 'login' || m === 'edit') showStep(1);
                return;
            }
            var uid = session.user.id;
            sb.from('profiles').select('*').eq('id', uid).maybeSingle().then(function (p) {
                if (p.data) {
                    if (editMode) { applyEditChrome(); prefillProfile(p.data); showStep(2); return; }
                    location.href = ST_SITE.home(); return;  // already a member → directory
                }
                if (editMode) { showStep(0); return; }  // nothing to edit yet
                var code = localStorage.getItem(PENDING_KEY);
                if (!code) { showStep(0); return; }    // need an invite
                sb.rpc('claim_invite', { p_code: code }).then(function (c) {
                    if (c.error) { setError(inviteError, c.error.message); showStep(0); return; }
                    showStep(2); syncInitials();
                });
            });
        });
    }

    // ── init ──────────────────────────────────────────────────────────────────
    if (LIVE) {
        resumeFromSession();
        var m0 = params.get('mode');
        if (m0 !== 'login' && m0 !== 'edit') showStep(0);
    } else {
        if (editMode) { applyEditChrome(); showStep(2); }
        else showStep(params.get('mode') === 'login' ? 1 : 0);
    }
})();
