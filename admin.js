/* ── Admin: invite generation + member management ────────────────────
   Visible only to users in the `admins` table (enforced by RLS; the UI
   just reflects it). Requires live Supabase config.
   -------------------------------------------------------------------- */
(function () {
    'use strict';

    var sb = window.stSupabase;
    var el = function (id) { return document.getElementById(id); };
    var show = function (id) { el(id).hidden = false; };
    var hide = function (id) { el(id).hidden = true; };

    // Base URL of the site folder → for building invite links.
    var baseUrl = location.origin + location.pathname.replace(/[^/]*$/, '');

    function state(which) {
        ['admin-loading', 'admin-signin', 'admin-denied', 'admin-panel'].forEach(hide);
        show(which);
    }

    if (!sb) { state('admin-signin'); return; }

    sb.auth.getSession().then(function (res) {
        var session = res.data && res.data.session;
        if (!session) { state('admin-signin'); return; }
        // Admin? (RLS lets only admins read the admins table)
        sb.from('admins').select('user_id').eq('user_id', session.user.id).maybeSingle()
            .then(function (a) {
                if (!a.data) { state('admin-denied'); return; }
                state('admin-panel');
                loadInvites();
                loadMembers();
            });
    });

    // ── Invites ──────────────────────────────────────────────────────────────
    function genCode() {
        var chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';   // no ambiguous 0/O/1/I
        var s = '';
        for (var i = 0; i < 6; i++) s += chars[Math.floor(Math.random() * chars.length)];
        return 'ST-' + s;
    }

    el('new-invite-btn').addEventListener('click', function () {
        var btn = this;
        btn.disabled = true;
        var note = el('invite-note').value.trim() || null;
        sb.from('invites').insert({ code: genCode(), note: note }).then(function (res) {
            btn.disabled = false;
            if (res.error) { alert('Could not create invite: ' + res.error.message); return; }
            el('invite-note').value = '';
            loadInvites();
        });
    });

    function loadInvites() {
        sb.from('invites').select('*').order('created_at', { ascending: false }).then(function (res) {
            var list = el('invites-list');
            list.innerHTML = '';
            if (res.error) { list.textContent = res.error.message; return; }
            (res.data || []).forEach(function (inv) {
                var used = !!inv.used_by;
                var row = document.createElement('div');
                row.className = 'admin-row';
                row.innerHTML =
                    '<div class="admin-row-main">' +
                        '<div class="admin-row-title"><span class="admin-code">' + inv.code + '</span>' +
                            '<span class="admin-pill ' + (used ? 'admin-pill--used' : 'admin-pill--open') + '">' +
                            (used ? 'used' : 'open') + '</span></div>' +
                        (inv.note ? '<div class="admin-row-sub">' + escapeHtml(inv.note) + '</div>' : '') +
                    '</div>';
                if (!used) {
                    var copy = document.createElement('button');
                    copy.className = 'admin-btn-sm';
                    copy.textContent = 'Copy link';
                    copy.addEventListener('click', function () {
                        var link = baseUrl + 'join.html?invite=' + encodeURIComponent(inv.code);
                        navigator.clipboard.writeText(link).then(function () {
                            copy.textContent = 'Copied!';
                            setTimeout(function () { copy.textContent = 'Copy link'; }, 1500);
                        });
                    });
                    row.appendChild(copy);
                }
                list.appendChild(row);
            });
            if (!res.data || !res.data.length) list.innerHTML = '<div class="admin-note">No invites yet.</div>';
        });
    }

    // ── Members ──────────────────────────────────────────────────────────────
    function loadMembers() {
        sb.from('profiles').select('*').order('created_at', { ascending: false }).then(function (res) {
            var list = el('members-list');
            list.innerHTML = '';
            if (res.error) { list.textContent = res.error.message; return; }
            var rows = res.data || [];
            el('members-count').textContent = rows.length ? '· ' + rows.length : '';
            rows.forEach(function (p) {
                var hidden = p.status === 'hidden';
                var row = document.createElement('div');
                row.className = 'admin-row';
                var img = p.avatar_url ? '<img class="admin-avatar" src="' + p.avatar_url + '" alt="">'
                                       : '<div class="admin-avatar"></div>';
                row.innerHTML = img +
                    '<div class="admin-row-main">' +
                        '<div class="admin-row-title">' + escapeHtml(p.name || '') +
                            (hidden ? ' <span class="admin-pill admin-pill--hidden">hidden</span>' : '') + '</div>' +
                        '<div class="admin-row-sub">' + (p.username ? '@' + escapeHtml(p.username) + ' · ' : '') +
                            escapeHtml(p.role || '') + '</div>' +
                    '</div>';
                var toggle = document.createElement('button');
                toggle.className = 'admin-btn-sm';
                toggle.textContent = hidden ? 'Unhide' : 'Hide';
                toggle.addEventListener('click', function () {
                    toggle.disabled = true;
                    sb.from('profiles').update({ status: hidden ? 'active' : 'hidden' })
                        .eq('id', p.id).then(function (r) {
                            toggle.disabled = false;
                            if (r.error) { alert(r.error.message); return; }
                            loadMembers();
                        });
                });
                row.appendChild(toggle);
                list.appendChild(row);
            });
            if (!rows.length) list.innerHTML = '<div class="admin-note">No members yet.</div>';
        });
    }

    function escapeHtml(s) {
        return String(s).replace(/[&<>"']/g, function (c) {
            return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
        });
    }
})();
