/* Interactive dot-grid hero.
   Renders the hero painting (photos/header.jpg) as a fine grid of dots coloured
   from the image. The grid holds steady; dots near the cursor push out, swell
   and brighten so the still image feels alive. Falls back to the plain photo on
   touch / reduced motion. Tunables live in CONFIG below. */
(function () {
    const canvas = document.querySelector('.hero-dots');
    const hero = document.querySelector('.hero');
    if (!canvas || !hero) return;

    // Cursor is required for the interaction; on touch the CSS hides the canvas.
    const canHover = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
    if (!canHover) return;

    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const ctx = canvas.getContext('2d', { alpha: true });

    const CONFIG = {
        gap: 14,          // spacing between dots (css px) — smaller = finer grid
        dotMin: 0.9,      // idle dot radius
        dotMax: 2.6,      // radius directly under the cursor
        baseAlpha: 0.32,  // steady opacity
        hoverAlpha: 1,    // opacity under the cursor
        radius: 150,      // cursor influence radius (css px)
        push: 20,         // max outward displacement (css px)
        ease: 0.16,       // spring return speed (0..1)
        imageFocusY: 0.72 // matches CSS `center 72%` on the photo
    };

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const mouse = { x: -9999, y: -9999, active: false };
    let dots = [];
    let W = 0, H = 0;
    let raf = 0;
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
        const dy = (rows - dh) * CONFIG.imageFocusY;
        octx.drawImage(img, dx, dy, dw, dh);
        const data = octx.getImageData(0, 0, cols, rows).data;

        dots = new Array(cols * rows);
        let n = 0;
        for (let gy = 0; gy < rows; gy++) {
            for (let gx = 0; gx < cols; gx++) {
                const i = (gy * cols + gx) * 4;
                const ox = gx * CONFIG.gap + CONFIG.gap / 2;
                const oy = gy * CONFIG.gap + CONFIG.gap / 2;
                dots[n++] = {
                    ox, oy,
                    x: ox, y: oy,
                    rr: CONFIG.dotMin,
                    aa: CONFIG.baseAlpha,
                    r: data[i], g: data[i + 1], b: data[i + 2]
                };
            }
        }
    }

    function render() {
        ctx.clearRect(0, 0, W, H);
        const R2 = CONFIG.radius * CONFIG.radius;

        for (let k = 0; k < dots.length; k++) {
            const d = dots[k];
            let tx = d.ox, ty = d.oy, tr = CONFIG.dotMin, ta = CONFIG.baseAlpha;

            if (mouse.active) {
                const dx = d.ox - mouse.x;
                const dy = d.oy - mouse.y;
                const dist2 = dx * dx + dy * dy;
                if (dist2 < R2) {
                    const dist = Math.sqrt(dist2) || 1;
                    const f = 1 - dist / CONFIG.radius; // 0..1
                    const e = f * f;
                    const inv = 1 / dist;
                    tx = d.ox + dx * inv * CONFIG.push * e;
                    ty = d.oy + dy * inv * CONFIG.push * e;
                    tr = CONFIG.dotMin + (CONFIG.dotMax - CONFIG.dotMin) * e;
                    ta = CONFIG.baseAlpha + (CONFIG.hoverAlpha - CONFIG.baseAlpha) * e;
                }
            }

            // Spring toward the targets for a soft, liquid feel.
            d.x += (tx - d.x) * CONFIG.ease;
            d.y += (ty - d.y) * CONFIG.ease;
            d.rr += (tr - d.rr) * CONFIG.ease;
            d.aa += (ta - d.aa) * CONFIG.ease;

            ctx.beginPath();
            ctx.fillStyle = 'rgba(' + d.r + ',' + d.g + ',' + d.b + ',' + d.aa + ')';
            ctx.arc(d.x, d.y, d.rr, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    function loop() {
        render();
        raf = requestAnimationFrame(loop);
    }

    function start() {
        cancelAnimationFrame(raf);
        if (reduceMotion) render();   // static grid, no cursor animation
        else loop();
    }

    // Map the pointer into hero-local coordinates.
    if (!reduceMotion) {
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
            if (reduceMotion) render();
        }, 150);
    }, { passive: true });

    img.addEventListener('load', function () {
        imgReady = true;
        buildDots();
        start();
    });
    img.addEventListener('error', function () {
        // Leave the plain photo in place if the image can't be sampled.
        canvas.style.display = 'none';
    });
    img.src = 'photos/header.jpg';
})();
