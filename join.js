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
    var params = new URLSearchParams(location.search);

    var avatarFile = null;
    var editMode = params.get('mode') === 'edit';
    var currentUsername = null;      // the signed-in user's existing handle (edit mode)

    if (!LIVE && banner) banner.hidden = false;

    // ── navigation ──────────────────────────────────────────────────────────
    function showStep(step) {
        steps.forEach(function (s) { s.hidden = String(s.dataset.step) !== String(step); });
        var idx = (step === 'done') ? 3 : Number(step);
        dots.forEach(function (d, i) { d.classList.toggle('is-active', i <= idx); });
        window.scrollTo({ top: 0, behavior: 'smooth' });
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

    // Pre-fill the form from an existing profile (edit mode)
    function prefillProfile(p) {
        currentUsername = p.username || null;
        nameEl.value = p.name || '';
        usernameEl.value = p.username || '';
        document.getElementById('pf-role').value = p.role || '';
        document.getElementById('pf-category').value = p.category || '';
        document.getElementById('pf-location').value = p.location || '';
        document.getElementById('pf-industry').value = p.industry || '';
        document.getElementById('pf-background').value = p.background || '';
        document.getElementById('pf-bio').value = p.bio || '';
        var links = p.links || {};
        document.getElementById('pf-link-web').value = links.website || '';
        document.getElementById('pf-link-linkedin').value = links.linkedin || '';
        if (p.avatar_url) {
            avatarImg.src = p.avatar_url;
            avatarImg.hidden = false;
            avatarInitials.style.display = 'none';
        }
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

    function collectProfile(uid) {
        var links = {};
        var web = document.getElementById('pf-link-web').value.trim();
        var li = document.getElementById('pf-link-linkedin').value.trim();
        if (web) links.website = web;
        if (li) links.linkedin = li;
        return {
            id: uid,
            username: usernameEl.value.trim().toLowerCase(),
            name: nameEl.value.trim(),
            role: document.getElementById('pf-role').value.trim(),
            category: document.getElementById('pf-category').value,
            location: document.getElementById('pf-location').value,
            industry: document.getElementById('pf-industry').value.trim() || null,
            background: document.getElementById('pf-background').value || null,
            bio: document.getElementById('pf-bio').value.trim() || null,
            links: links
        };
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
            uploadAvatar(user.id).then(function (avatarUrl) {
                var payload = collectProfile(user.id);
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

    function uploadAvatar(uid) {
        if (!avatarFile) return Promise.resolve(null);
        var ext = (avatarFile.name.split('.').pop() || 'jpg').toLowerCase();
        var path = uid + '/avatar.' + ext;
        return sb.storage.from('avatars').upload(path, avatarFile, { upsert: true })
            .then(function (res) {
                if (res.error) throw res.error;
                return sb.storage.from('avatars').getPublicUrl(path).data.publicUrl;
            });
    }

    function finish() {
        if (editMode) { location.href = 'index.html'; return; }
        showStep('done');
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
                    location.href = 'index.html'; return;  // already a member → directory
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
