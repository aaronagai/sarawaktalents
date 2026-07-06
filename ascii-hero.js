/* ── Hero ASCII backdrop (Mulu National Park pinnacles) ─────────────
   Loads the Mulu photo and renders it as a full-width ASCII field
   behind the hero text. The bright limestone spires map to the DENSE
   characters (so they read as solid shapes, not gaps), and the whole
   field drifts slowly like a lazy camera pan. Recolourable via CSS
   (see .hero-ascii-pre) and centre-masked so the headline stays legible.
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
    var ZOOM = 0.92;       // crop inside the cover rect → room to pan
    var CROP_BIAS_Y = 0.32; // 0 = top of photo, 0.5 = centre

    var canvas = document.createElement('canvas');
    var ctx = canvas.getContext('2d', { willReadFrequently: true });

    var img = new Image();
    var imgReady = false;

    var CHAR_ASPECT = 0.6; // monospace: char width ≈ 0.6 × font-size

    // Layout state (recomputed on resize)
    var L = null;

    function targetCell() {
        var w = window.innerWidth;
        if (w >= 1280) return 7;
        if (w >= 1024) return 7;
        if (w >= 640) return 6;
        return 6;
    }

    function computeLayout() {
        var boxW = hero.clientWidth;
        var boxH = hero.clientHeight;
        if (boxW < 2 || boxH < 2 || !imgReady) { L = null; return; }

        var cell = targetCell();
        var cols = Math.ceil(boxW / cell) + 1;
        var rows = Math.ceil(boxH / cell) + 1;

        var fontPx = cell / CHAR_ASPECT;
        pre.style.fontSize = fontPx + 'px';
        pre.style.lineHeight = cell + 'px';

        canvas.width = cols;
        canvas.height = rows;

        // Cover-fit the image to the grid's physical aspect.
        var gridAspect = (cols * cell) / (rows * cell); // = cols/rows
        var iw = img.naturalWidth, ih = img.naturalHeight;
        var sw = iw, sh = ih, sx = 0, sy = 0;
        if (iw / ih > gridAspect) { sw = ih * gridAspect; sx = (iw - sw) / 2; sy = (ih - sh) * CROP_BIAS_Y; }
        else { sh = iw / gridAspect; sy = (ih - sh) * CROP_BIAS_Y; }

        // Zoom in slightly to leave margin for the drifting pan.
        var cropW = sw * ZOOM, cropH = sh * ZOOM;
        L = {
            cols: cols, rows: rows,
            cx: sx + sw / 2, cy: sy + sh / 2,
            cropW: cropW, cropH: cropH,
            marginX: (sw - cropW) / 2, marginY: (sh - cropH) / 2
        };
    }

    function draw(phase) {
        if (!L) return;
        var dx = Math.sin(phase) * L.marginX * 0.85;
        var dy = Math.cos(phase * 0.55) * L.marginY * 0.55;
        var sx = (L.cx + dx) - L.cropW / 2;
        var sy = (L.cy + dy) - L.cropH / 2;

        ctx.clearRect(0, 0, L.cols, L.rows);
        ctx.drawImage(img, sx, sy, L.cropW, L.cropH, 0, 0, L.cols, L.rows);

        var data = ctx.getImageData(0, 0, L.cols, L.rows).data;
        var last = RAMP.length - 1;
        // RAMP is dense→sparse. The limestone spires are the bright subject, so
        // bright pixels get the dense purple glyphs (t = 1 - lum) → they read as
        // solid, tonally-shaded forms against the sparse jungle.
        var lines = new Array(L.rows);
        for (var r = 0; r < L.rows; r++) {
            var line = '';
            var rowOff = r * L.cols * 4;
            for (var c = 0; c < L.cols; c++) {
                var i = rowOff + c * 4;
                var lum = (0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]) / 255;
                lum = (lum - 0.5) * CONTRAST + 0.5;
                if (lum < 0) lum = 0; else if (lum > 1) lum = 1;
                // Density = brightness (spires = ink), with a coverage boost so the
                // bright scene renders as a full photo instead of a pale wash.
                var t = Math.pow(1 - lum, COVERAGE);
                line += RAMP[Math.round(t * last)];
            }
            lines[r] = line;
        }
        pre.textContent = lines.join('\n');
        bg.classList.add('is-ready');
    }

    // Animation loop (slow drift), throttled
    var phase = 0;
    var lastTs = 0;
    var FPS = 12;
    var running = false;
    var rafId = null;

    function frame(ts) {
        if (!running) return;
        if (ts - lastTs >= 1000 / FPS) {
            lastTs = ts;
            phase += 0.02;
            draw(phase);
        }
        rafId = requestAnimationFrame(frame);
    }

    var mqMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

    function start() {
        if (running || !L) return;
        running = true;
        lastTs = 0;
        rafId = requestAnimationFrame(frame);
    }
    function stop() {
        running = false;
        if (rafId) cancelAnimationFrame(rafId);
    }
    function update() {
        if (!L) return;
        if (mqMotion.matches) { stop(); draw(0); return; }
        start();
    }

    // Debounced resize → recompute layout, then keep animating
    var rt = null;
    function onResize() {
        if (rt) clearTimeout(rt);
        rt = setTimeout(function () { computeLayout(); update(); }, 150);
    }

    img.onload = function () {
        imgReady = true;
        computeLayout();
        update();
    };
    img.src = 'photos/mulu.jpg';

    window.addEventListener('resize', onResize);
    // Re-render immediately when the light/dark theme is toggled.
    new MutationObserver(function () { draw(phase); })
        .observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    (mqMotion.addEventListener ? mqMotion.addEventListener('change', update) : mqMotion.addListener(update));
    document.addEventListener('visibilitychange', function () {
        if (document.hidden) stop(); else update();
    });
})();
