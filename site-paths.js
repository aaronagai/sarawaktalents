/* ── Clean URL helpers (no .html in public paths) ────────────────────
   Works at the domain root and under /sarawaktalents/ on GitHub Pages.
   -------------------------------------------------------------------- */
(function () {
    'use strict';

    function siteRoot() {
        var path = location.pathname
            .replace(/\/(?:profile|join|admin)(?:\/index\.html)?\/?$/, '/')
            .replace(/\/(?:profile|join|admin)\.html$/, '/');
        if (!path.endsWith('/')) path = path.replace(/\/[^/]*$/, '/');
        return path || '/';
    }

    /** Root-relative URL for site assets (badges, photos) stored without a leading slash. */
    function assetUrl(path) {
        if (!path) return path;
        if (/^https?:\/\//i.test(path) || /^data:/i.test(path) || /^blob:/i.test(path)) return path;
        return siteRoot() + String(path).replace(/^\//, '');
    }

    function joinPath(query) {
        var url = siteRoot() + 'join/';
        if (query) {
            url += (query.charAt(0) === '?' ? query : '?' + query);
        }
        return url;
    }

    window.ST_SITE = {
        root: siteRoot,
        asset: assetUrl,
        home: function () { return siteRoot(); },
        profile: function (username, withOrigin) {
            var url = siteRoot() + 'profile/?u=' + encodeURIComponent(username);
            return withOrigin ? location.origin + url : url;
        },
        join: joinPath,
        admin: function () { return siteRoot() + 'admin/'; }
    };
})();