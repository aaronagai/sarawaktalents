/**
 * transitions.dev helpers — https://transitions.dev
 * Loaded before script.js. Snippet CSS goes in transitions/index.css;
 * reference catalog: .agents/skills/transitions-dev/
 */
const Transitions = {
  /** Read a CSS custom property from :root (returns fallback if unset). */
  cssVar(name, fallback = 0) {
    const raw = getComputedStyle(document.documentElement)
      .getPropertyValue(name)
      .trim();
    if (!raw) return fallback;
    const n = parseFloat(raw);
    return Number.isFinite(n) ? n : raw;
  },

  /** Duration in ms from a --*-dur token (e.g. "--modal-close-dur"). */
  durationMs(varName, fallback = 150) {
    return this.cssVar(varName, fallback);
  },

  prefersReducedMotion() {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  },

  isDarkTheme() {
    const root = document.documentElement;
    return root.classList.contains('dark') || root.getAttribute('data-theme') === 'dark';
  },

  /** Force layout so enter animations replay after class removal. */
  reflow(el) {
    void el.offsetWidth;
    return el;
  },

  /**
   * Open/close pattern used by modal, dropdown, panel, etc.
   * Classes: .is-open (visible), .is-closing (exit animation).
   */
  open(el) {
    if (!el) return;
    el.classList.remove('is-closing');
    el.classList.add('is-open');
  },

  close(el, { durationVar = '--modal-close-dur', fallback = 150, onDone } = {}) {
    if (!el) return;
    el.classList.remove('is-open');
    if (this.prefersReducedMotion()) {
      el.classList.remove('is-closing');
      onDone?.();
      return;
    }
    el.classList.add('is-closing');
    const ms = this.durationMs(durationVar, fallback);
    window.setTimeout(() => {
      el.classList.remove('is-closing');
      onDone?.();
    }, ms);
  },

  /** Modal shorthand — reads --modal-close-dur from motion tokens. */
  openModal(el) {
    this.open(el);
  },

  closeModal(el, onDone) {
    this.close(el, { durationVar: '--modal-close-dur', fallback: 150, onDone });
  },

  /** Dropdown shorthand — reads --dropdown-close-dur. */
  openDropdown(el) {
    this.open(el);
  },

  closeDropdown(el, onDone) {
    this.close(el, { durationVar: '--dropdown-close-dur', fallback: 150, onDone });
  },

  /**
   * Replay a one-shot class (shake, swap, pop-in).
   * Removes className, reflows, re-adds after optional delay.
   */
  replayClass(el, className, { holdMs = 0 } = {}) {
    if (!el || this.prefersReducedMotion()) return;
    el.classList.remove(className);
    this.reflow(el);
    if (holdMs > 0) {
      window.setTimeout(() => el.classList.add(className), holdMs);
    } else {
      el.classList.add(className);
    }
  },

  /**
   * Avatar group hover — distance-falloff lift with direction-aware easing.
   * On narrow viewports, auto-plays the same left-to-right sweep (no hover needed).
   * Reads --avatar-* tokens from :root. Wire .t-avatar-group + .t-avatar in HTML.
   */
  initAvatarGroup(rootOrSelector, { autoPlayBelow = 640 } = {}) {
    if (this.prefersReducedMotion()) return;
    const root =
      typeof rootOrSelector === 'string'
        ? document.querySelector(rootOrSelector)
        : rootOrSelector;
    if (!root) return;

    const avatars = Array.from(root.querySelectorAll('.t-avatar'));
    if (!avatars.length) return;

    const cs = getComputedStyle(document.documentElement);
    const num = (name, fb) => {
      const v = parseFloat(cs.getPropertyValue(name));
      return Number.isFinite(v) ? v : fb;
    };
    const ease = (name, fb) => cs.getPropertyValue(name).trim() || fb;

    const setShifts = (activeIdx, phase) => {
      const lift = num('--avatar-lift', -4);
      const falloff = num('--avatar-falloff', 0.45);
      const scale = num('--avatar-scale', 1.05);
      const tf =
        phase === 'out'
          ? ease('--avatar-ease-out', 'cubic-bezier(0.34, 3.85, 0.64, 1)')
          : ease('--avatar-ease-in', 'cubic-bezier(0.22, 1, 0.36, 1)');

      avatars.forEach((el, i) => {
        el.style.transitionTimingFunction = tf;
        if (activeIdx == null) {
          el.style.setProperty('--shift', '0px');
          el.style.setProperty('--scale-active', '1');
          return;
        }
        const d = Math.abs(i - activeIdx);
        el.style.setProperty(
          '--shift',
          (lift * Math.pow(falloff, d)).toFixed(3) + 'px'
        );
        el.style.setProperty(
          '--scale-active',
          i === activeIdx ? String(scale) : '1'
        );
      });
    };

    const mq = window.matchMedia(`(max-width: ${autoPlayBelow - 1}px)`);
    let autoTimer = null;
    let autoIdx = 0;
    let autoEnabled = false;

    const clearAutoTimer = () => {
      if (autoTimer != null) {
        window.clearTimeout(autoTimer);
        autoTimer = null;
      }
    };

    const avatarDurMs = () => {
      const raw = cs.getPropertyValue('--avatar-dur').trim();
      if (!raw) return 320;
      if (raw.endsWith('ms')) return parseFloat(raw);
      if (raw.endsWith('s')) return parseFloat(raw) * 1000;
      const n = parseFloat(raw);
      return Number.isFinite(n) ? n : 320;
    };

    const stepAuto = () => {
      if (!autoEnabled || !mq.matches) return;
      setShifts(autoIdx, 'in');
      autoTimer = window.setTimeout(() => {
        autoIdx += 1;
        if (autoIdx >= avatars.length) {
          setShifts(null, 'out');
          autoIdx = 0;
          autoTimer = window.setTimeout(() => stepAuto(), avatarDurMs() + 450);
        } else {
          stepAuto();
        }
      }, 750);
    };

    const startAuto = () => {
      clearAutoTimer();
      autoEnabled = true;
      autoIdx = 0;
      setShifts(null, 'out');
      autoTimer = window.setTimeout(() => stepAuto(), 600);
    };

    const stopAuto = () => {
      autoEnabled = false;
      clearAutoTimer();
      autoIdx = 0;
      setShifts(null, 'out');
    };

    const syncAuto = () => {
      if (mq.matches) startAuto();
      else stopAuto();
    };

    avatars.forEach((el, i) => {
      el.addEventListener('mouseenter', () => {
        if (mq.matches) stopAuto();
        setShifts(i, 'in');
      });
    });
    root.addEventListener('mouseleave', () => {
      setShifts(null, 'out');
      if (mq.matches) startAuto();
    });

    mq.addEventListener('change', syncAuto);
    syncAuto();
  },
};

window.Transitions = Transitions;
