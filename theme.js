/**
 * Theme mode — system | light | dark (localStorage: theme-mode).
 * Pages without #theme-toggle still apply the saved mode via init().
 */
const Theme = (() => {
  const STORAGE_KEY = 'theme-mode';
  const CYCLE = ['system', 'light', 'dark'];
  const MODE_UI = {
    system: { icon: 'monitor', label: 'System theme' },
    light: { icon: 'sun', label: 'Light theme' },
    dark: { icon: 'moon', label: 'Dark theme' },
  };
  let themeMode = 'system';
  let systemThemeMQ = null;

  function getStoredThemeMode() {
    const mode = localStorage.getItem(STORAGE_KEY);
    if (mode === 'system' || mode === 'light' || mode === 'dark') return mode;
    const legacy = localStorage.getItem('theme');
    if (legacy === 'dark' || legacy === 'light') return legacy;
    return 'system';
  }

  function resolveDark(mode) {
    if (mode === 'dark') return true;
    if (mode === 'light') return false;
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  }

  function updateThemeMeta(dark) {
    const themeMeta = document.querySelector('meta[name="theme-color"]');
    if (themeMeta) themeMeta.content = dark ? '#0a0a0a' : '#f3f4f6';
  }

  function initSlidingTabs(bar, { onSelect } = {}) {
    if (!bar) return null;
    const pill = bar.querySelector('.t-tabs-pill');
    const tabs = [...bar.querySelectorAll('.t-tab')];

    function moveTo(tab, animate) {
      if (!pill || !tab) return;
      const instant =
        !animate ||
        (typeof Transitions !== 'undefined' && Transitions.prefersReducedMotion());
      if (instant) {
        const prev = pill.style.transition;
        pill.style.transition = 'none';
        pill.style.transform = `translateX(${tab.offsetLeft}px)`;
        pill.style.width = `${tab.offsetWidth}px`;
        void pill.offsetWidth;
        pill.style.transition = prev;
      } else {
        pill.style.transform = `translateX(${tab.offsetLeft}px)`;
        pill.style.width = `${tab.offsetWidth}px`;
      }
    }

    const active = () =>
      tabs.find(t => t.getAttribute('aria-selected') === 'true') || tabs[0];

    tabs.forEach(tab => {
      tab.addEventListener('click', () => {
        tabs.forEach(t =>
          t.setAttribute('aria-selected', t === tab ? 'true' : 'false')
        );
        onSelect?.(tab);
        moveTo(tab, true);
      });
    });

    requestAnimationFrame(() => moveTo(active(), false));
    window.addEventListener('resize', () => moveTo(active(), false));
    return { moveTo, tabs, active };
  }

  function syncThemeToggleUI() {
    const btn = document.getElementById('theme-toggle');
    if (!btn) return;
    const iconEl = btn.querySelector('re-icon');
    const { icon, label } = MODE_UI[themeMode] || MODE_UI.system;
    btn.setAttribute('aria-label', label);
    if (!iconEl || iconEl.getAttribute('icon') === icon) return;

    const reduced =
      typeof Transitions !== 'undefined' && Transitions.prefersReducedMotion();
    if (reduced) {
      iconEl.setAttribute('icon', icon);
      return;
    }

    btn.classList.add('is-changing');
    window.setTimeout(() => {
      iconEl.setAttribute('icon', icon);
      btn.classList.remove('is-changing');
    }, 140);
  }

  function applyThemeMode(mode, { persist = true } = {}) {
    themeMode = mode;
    const dark = resolveDark(mode);
    document.documentElement.classList.toggle('dark', dark);
    if (persist) {
      localStorage.setItem(STORAGE_KEY, mode);
      localStorage.removeItem('theme');
    }
    updateThemeMeta(dark);
    syncThemeToggleUI();
  }

  function initThemeSystemListener() {
    if (systemThemeMQ) return;
    systemThemeMQ = window.matchMedia('(prefers-color-scheme: dark)');
    systemThemeMQ.addEventListener('change', () => {
      if (themeMode !== 'system') return;
      const dark = systemThemeMQ.matches;
      document.documentElement.classList.toggle('dark', dark);
      updateThemeMeta(dark);
    });
  }

  function initThemeToggle() {
    const btn = document.getElementById('theme-toggle');
    if (!btn) return;
    btn.addEventListener('click', () => {
      const idx = CYCLE.indexOf(themeMode);
      const next = CYCLE[(idx + 1) % CYCLE.length];
      applyThemeMode(next);
    });
  }

  function init() {
    initThemeSystemListener();
    applyThemeMode(getStoredThemeMode(), { persist: false });
    initThemeToggle();
  }

  return { init, initSlidingTabs, applyThemeMode, getStoredThemeMode };
})();

window.Theme = Theme;
