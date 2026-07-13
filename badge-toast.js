/* ── Achievement badge toast ─────────────────────────────────────────
   window.BadgeToast.show(badges) — badges: array of rows shaped like
   { slug, name, description, icon } (exactly what the check_and_award_badges
   RPC returns). Queues one card per badge, auto-dismisses each after a few
   seconds. Loaded on profile/join pages only — no badge-earning action
   happens on the homepage.
   -------------------------------------------------------------------- */
(function () {
    'use strict';

    var DISMISS_MS = 5200;
    var stack = null;

    function ensureStack() {
        if (stack) return stack;
        stack = document.createElement('div');
        stack.className = 'badge-toast-stack';
        stack.setAttribute('aria-live', 'polite');
        document.body.appendChild(stack);
        return stack;
    }

    function showOne(badge) {
        var root = ensureStack();
        var card = document.createElement('div');
        card.className = 'badge-toast';
        card.innerHTML =
            '<span class="badge-toast-icon" aria-hidden="true">' + (badge.icon || '🏅') + '</span>' +
            '<span class="badge-toast-body">' +
                '<span class="badge-toast-eyebrow">Badge earned</span>' +
                '<span class="badge-toast-name">' + escapeHtml(badge.name || '') + '</span>' +
            '</span>' +
            '<button type="button" class="badge-toast-close" aria-label="Dismiss">' +
                '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 6l12 12M18 6L6 18"/></svg>' +
            '</button>';
        root.appendChild(card);

        function dismiss() {
            card.classList.remove('is-in');
            card.classList.add('is-out');
            setTimeout(function () { card.remove(); }, 260);
        }
        card.querySelector('.badge-toast-close').addEventListener('click', dismiss);
        var timer = setTimeout(dismiss, DISMISS_MS);
        card.addEventListener('mouseenter', function () { clearTimeout(timer); });
        card.addEventListener('mouseleave', function () { timer = setTimeout(dismiss, DISMISS_MS); });

        requestAnimationFrame(function () {
            requestAnimationFrame(function () { card.classList.add('is-in'); });
        });
    }

    function escapeHtml(s) {
        return String(s).replace(/[&<>"']/g, function (c) {
            return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
        });
    }

    window.BadgeToast = {
        show: function (badges) {
            (badges || []).forEach(function (b, i) {
                setTimeout(function () { showOne(b); }, i * 260);
            });
        }
    };
})();
