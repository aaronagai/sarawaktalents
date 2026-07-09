/* Auto-animated dot-grid hero.
   Renders the hero painting (photos/header.jpg) as a fine grid of dots coloured
   from the image, then continuously flows bands of brighter/larger dots across
   it using two slow diagonal waves — so it's alive without any interaction. On
   desktop the cursor adds an extra swell/push on top. Pauses when the hero is
   scrolled out of view; holds a static frame for reduced-motion users.
   Tunables live in CONFIG below. */
(function () {
    const canvas = document.querySelector('.hero-dots');
    const hero = document.querySelector('.hero');
    if (!canvas || !hero) return;

    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const canHover = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
    const ctx = canvas.getContext('2d', { alpha: true });

    const CONFIG = {
        gap: 14,          // spacing between dots (css px) — smaller = finer grid
        dotMin: 0.9,      // dot radius at a wave trough
        dotMax: 2.6,      // dot radius at a wave crest (and under the cursor)
        baseAlpha: 0.26,  // opacity at a trough
        peakAlpha: 0.9,   // opacity at a crest
        // Two travelling waves (wavelength px, direction deg, speed rad/s).
        wave1: { len: 300, angle: 22, speed: 0.55, weight: 0.6 },
        wave2: { len: 210, angle: -54, speed: -0.8, weight: 0.4 },
        sway: 1.6,        // gentle positional drift (css px)
        cursorRadius: 150,// cursor influence radius (css px)
        cursorPush: 20    // max outward displacement under the cursor (css px)
    };

    // Precompute wave vectors.
    function waveVec(w) {
        const k = (Math.PI * 2) / w.len;
        const a = w.angle * Math.PI / 180;
        return { kx: Math.cos(a) * k, ky: Math.sin(a) * k, speed: w.speed, weight: w.weight };
    }
    const WV1 = waveVec(CONFIG.wave1);
    const WV2 = waveVec(CONFIG.wave2);

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const mouse = { x: -9999, y: -9999, active: false };
    let dots = [];
    let W = 0, H = 0;
    let raf = 0;
    let running = false;
    let imgReady = false;
    const img = new Image();
    img.decoding = 'async';

    function buildDots() {
        const rect = hero.getBoundingClientRect();
        W = Math.max(1, Math.round(rect.width));
        H = Math.max(1, Math.round(rect.height));
        canvas.width = Math.round(W * dpr);
        canvas.height = Math.round(H * dpr);
        canvas.style.width = W + 'px';
        canvas.style.height = H + 'px';
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

        if (!imgReady) return;

        const cols = Math.ceil(W / CONFIG.gap);
        const rows = Math.ceil(H / CONFIG.gap);

        // Sample average colours by drawing the image into a tiny cols x rows
        // buffer, emulating CSS `background-size: cover; position: center 72%`.
        const off = document.createElement('canvas');
        off.width = cols;
        off.height = rows;
        const octx = off.getContext('2d');
        const scale = Math.max(cols / img.width, rows / img.height);
        const dw = img.width * scale;
        const dh = img.height * scale;
        const dx = (cols - dw) / 2;
        const dy = (rows - dh) * 0.72; // matches CSS `center 72%`
        octx.drawImage(img, dx, dy, dw, dh);
        const data = octx.getImageData(0, 0, cols, rows).data;

        dots = new Array(cols * rows);
        let n = 0;
        for (let gy = 0; gy < rows; gy++) {
            for (let gx = 0; gx < cols; gx++) {
                const i = (gy * cols + gx) * 4;
                const ox = gx * CONFIG.gap + CONFIG.gap / 2;
                const oy = gy * CONFIG.gap + CONFIG.gap / 2;
                dots[n++] = { ox, oy, r: data[i], g: data[i + 1], b: data[i + 2] };
            }
        }
    }

    function render(time) {
        ctx.clearRect(0, 0, W, H);
        const R2 = CONFIG.cursorRadius * CONFIG.cursorRadius;
        const dRad = CONFIG.dotMax - CONFIG.dotMin;
        const dAlpha = CONFIG.peakAlpha - CONFIG.baseAlpha;

        for (let k = 0; k < dots.length; k++) {
            const d = dots[k];

            // Flowing wave field → 0..1 crest strength.
            const p1 = d.ox * WV1.kx + d.oy * WV1.ky + time * WV1.speed;
            const p2 = d.ox * WV2.kx + d.oy * WV2.ky + time * WV2.speed;
            let w = 0.5 + 0.5 * (WV1.weight * Math.sin(p1) + WV2.weight * Math.sin(p2));

            let x = d.ox + Math.sin(p1) * CONFIG.sway;
            let y = d.oy + Math.cos(p2) * CONFIG.sway;

            // Cursor adds an extra crest + outward push on top of the waves.
            if (mouse.active) {
                const mx = d.ox - mouse.x;
                const my = d.oy - mouse.y;
                const dist2 = mx * mx + my * my;
                if (dist2 < R2) {
                    const dist = Math.sqrt(dist2) || 1;
                    const e = 1 - dist / CONFIG.cursorRadius;
                    const ee = e * e;
                    if (ee > w) w = ee;
                    const inv = 1 / dist;
                    x += mx * inv * CONFIG.cursorPush * ee;
                    y += my * inv * CONFIG.cursorPush * ee;
                }
            }

            ctx.beginPath();
            ctx.fillStyle = 'rgba(' + d.r + ',' + d.g + ',' + d.b + ',' + (CONFIG.baseAlpha + dAlpha * w) + ')';
            ctx.arc(x, y, CONFIG.dotMin + dRad * w, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    function loop() {
        render(performance.now() * 0.001);
        raf = requestAnimationFrame(loop);
    }
    function startLoop() {
        if (running || reduceMotion || !imgReady) return;
        running = true;
        raf = requestAnimationFrame(loop);
    }
    function stopLoop() {
        running = false;
        cancelAnimationFrame(raf);
    }

    // Cursor swell (desktop only).
    if (canHover) {
        window.addEventListener('mousemove', function (e) {
            const rect = hero.getBoundingClientRect();
            mouse.x = e.clientX - rect.left;
            mouse.y = e.clientY - rect.top;
            mouse.active = mouse.x >= 0 && mouse.x <= rect.width &&
                           mouse.y >= 0 && mouse.y <= rect.height;
        }, { passive: true });
        window.addEventListener('mouseout', function (e) {
            if (!e.relatedTarget) mouse.active = false;
        }, { passive: true });
    }

    let resizeTimer = 0;
    window.addEventListener('resize', function () {
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(function () {
            buildDots();
            if (reduceMotion) render(0);
        }, 150);
    }, { passive: true });

    // Only animate while the hero is on screen.
    if ('IntersectionObserver' in window) {
        new IntersectionObserver(function (entries) {
            entries.forEach(function (en) {
                if (en.isIntersecting) startLoop();
                else stopLoop();
            });
        }, { threshold: 0 }).observe(hero);
    }

    img.addEventListener('load', function () {
        imgReady = true;
        buildDots();
        if (reduceMotion) render(0);
        else startLoop();
    });
    img.addEventListener('error', function () {
        canvas.style.display = 'none'; // keep the plain photo if sampling fails
    });
    img.src = 'photos/header.jpg';
})();
