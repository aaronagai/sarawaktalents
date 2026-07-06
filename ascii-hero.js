/* ── Hero ASCII backdrop (Mulu National Park pinnacles) ─────────────
   Loads the Mulu photo and renders it as a full-width ASCII field
   behind the hero text. On load it "materialises" — the characters
   dissolve into the final pinnacle shape once, then hold perfectly
   still. Recolourable via CSS (see .hero-ascii-pre) and centre-masked
   so the headline stays legible.
   -------------------------------------------------------------------- */
(function () {
    'use strict';

    var pre = document.getElementById('ascii-bg');
    var bg = document.querySelector('.hero-ascii-bg');
    var hero = document.querySelector('.hero');
    if (!pre || !bg || !hero) return;

    // Dense → sparse photographic ramp (Paul Bourke 67-level) for smooth tone.
    var RAMP = "$@B%8&WM#*oahkbdpqwmZO0QLCJUYXzcvunxrjft/\\|()1{}[]?-_+~<>i!lI;:,\"^`'. ";
    var CONTRAST = 1.4;    // gentle → keeps photographic tone but reads clearly
    var COVERAGE = 2.1;    // >1 = more ink overall so the bright scene reads at 1×
    var ZOOM = 0.98;       // crop inside the cover rect
    var CROP_BIAS_Y = 0.32; // 0 = top of photo, 0.5 = centre

    var canvas = document.createElement('canvas');
    var ctx = canvas.getContext('2d', { willReadFrequently: true });

    var img = new Image();
    var imgReady = false;

    var CHAR_ASPECT = 0.6; // monospace: char width ≈ 0.6 × font-size

    // State
    var L = null;              // layout
    var finalChars = null;     // Array(cols*rows) — the settled image
    var thresholds = null;     // Float32Array — per-cell reveal order
    var introDone = false;
    var running = false;
    var rafId = null;
    var introStart = 0;
    var DURATION = 1900;       // ms for the materialise

    var mqMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

    function targetCell() {
        var w = window.innerWidth;
        if (w >= 640) return 7;
        return 6;
    }

    function computeLayout() {
        var boxW = hero.clientWidth;
        var boxH = hero.clientHeight;
        if (boxW < 2 || boxH < 2 || !imgReady) { L = null; return; }

        var cell = targetCell();
        var cols = Math.ceil(boxW / cell) + 1;
        var rows = Math.ceil(boxH / cell) + 1;

        pre.style.fontSize = (cell / CHAR_ASPECT) + 'px';
        pre.style.lineHeight = cell + 'px';

        canvas.width = cols;
        canvas.height = rows;

        var gridAspect = cols / rows;
        var iw = img.naturalWidth, ih = img.naturalHeight;
        var sw = iw, sh = ih, sx = 0, sy = 0;
        if (iw / ih > gridAspect) { sw = ih * gridAspect; sx = (iw - sw) / 2; sy = (ih - sh) * CROP_BIAS_Y; }
        else { sh = iw / gridAspect; sy = (ih - sh) * CROP_BIAS_Y; }

        var cropW = sw * ZOOM, cropH = sh * ZOOM;
        L = { cols: cols, rows: rows, sx: sx + (sw - cropW) / 2, sy: sy + (sh - cropH) / 2, cropW: cropW, cropH: cropH };
    }

    // Sample the settled image once, and assign each cell a reveal order.
    function sampleFinal() {
        if (!L) return;
        ctx.clearRect(0, 0, L.cols, L.rows);
        ctx.drawImage(img, L.sx, L.sy, L.cropW, L.cropH, 0, 0, L.cols, L.rows);
        var data = ctx.getImageData(0, 0, L.cols, L.rows).data;
        var last = RAMP.length - 1;
        var n = L.cols * L.rows;
        finalChars = new Array(n);
        thresholds = new Float32Array(n);
        for (var r = 0; r < L.rows; r++) {
            for (var c = 0; c < L.cols; c++) {
                var idx = r * L.cols + c;
                var i = idx * 4;
                var lum = (0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]) / 255;
                lum = (lum - 0.5) * CONTRAST + 0.5;
                if (lum < 0) lum = 0; else if (lum > 1) lum = 1;
                finalChars[idx] = RAMP[Math.round(Math.pow(1 - lum, COVERAGE) * last)];
                // Mostly-random dissolve, lightly swept top-left → bottom-right.
                var diag = (c / L.cols) * 0.5 + (r / L.rows) * 0.5;
                thresholds[idx] = 0.8 * Math.random() + 0.2 * diag;
            }
        }
    }

    function renderProgress(p) {
        var lines = new Array(L.rows);
        for (var r = 0; r < L.rows; r++) {
            var line = '';
            var base = r * L.cols;
            for (var c = 0; c < L.cols; c++) {
                var idx = base + c;
                line += (thresholds[idx] <= p) ? finalChars[idx] : ' ';
            }
            lines[r] = line;
        }
        pre.textContent = lines.join('\n');
    }

    function renderFinal() {
        if (!finalChars || !L) return;
        var lines = new Array(L.rows);
        for (var r = 0; r < L.rows; r++) {
            lines[r] = finalChars.slice(r * L.cols, r * L.cols + L.cols).join('');
        }
        pre.textContent = lines.join('\n');
        bg.classList.add('is-ready');
    }

    function easeOutCubic(x) { return 1 - Math.pow(1 - x, 3); }

    function introFrame(ts) {
        if (!running) return;
        if (!introStart) introStart = ts;
        var p = easeOutCubic(Math.min(1, (ts - introStart) / DURATION));
        renderProgress(p);
        bg.classList.add('is-ready');
        if (p >= 1) { running = false; introDone = true; renderFinal(); return; }
        rafId = requestAnimationFrame(introFrame);
    }

    function play() {
        if (!L || !finalChars) return;
        if (mqMotion.matches || introDone) { renderFinal(); return; }
        if (running) return;
        running = true;
        introStart = 0;
        rafId = requestAnimationFrame(introFrame);
    }

    function finalizeNow() {
        if (rafId) cancelAnimationFrame(rafId);
        running = false;
        introDone = true;
        renderFinal();
    }

    // Debounced resize → recompute + settle immediately (no re-animate).
    var rt = null;
    function onResize() {
        if (rt) clearTimeout(rt);
        rt = setTimeout(function () {
            computeLayout();
            sampleFinal();
            finalizeNow();
        }, 150);
    }

    img.onload = function () {
        imgReady = true;
        computeLayout();
        sampleFinal();
        play();
    };
    img.src = 'photos/mulu.jpg';

    window.addEventListener('resize', onResize);
    (mqMotion.addEventListener ? mqMotion.addEventListener('change', play) : mqMotion.addListener(play));
    document.addEventListener('visibilitychange', function () {
        // If the tab is hidden mid-materialise, just settle it.
        if (document.hidden && running) finalizeNow();
    });
})();
