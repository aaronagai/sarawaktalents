/**
 * Theme mode — system | light | dark (localStorage: theme-mode).
 * Shared by index, profile, and any page with .footer-theme-pill.t-tabs.
 */
const Theme = (() => {
  const STORAGE_KEY = 'theme-mode';
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

  function syncThemeTabsUI() {
    const bar = document.querySelector('.footer-theme-pill.t-tabs');
    if (!bar) return;
    const tabId =
      themeMode === 'light'
        ? 'theme-light'
        : themeMode === 'dark'
          ? 'theme-dark'
          : 'theme-system';
    bar.querySelectorAll('.t-tab').forEach(t => {
      t.setAttribute('aria-selected', t.id === tabId ? 'true' : 'false');
    });
    if (bar._moveThemePill) {
      const active = bar.querySelector(`#${tabId}`);
      if (active) bar._moveThemePill(active, false);
    }
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
    syncThemeTabsUI();
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

  function initThemeTabs() {
    const bar = document.querySelector('.footer-theme-pill.t-tabs');
    if (!bar) return;
    const api = initSlidingTabs(bar, {
      onSelect(tab) {
        const mode =
          tab.id === 'theme-light'
            ? 'light'
            : tab.id === 'theme-dark'
              ? 'dark'
              : 'system';
        applyThemeMode(mode);
      },
    });
    if (api) bar._moveThemePill = api.moveTo;
  }

  function init() {
    initThemeSystemListener();
    initThemeTabs();
    applyThemeMode(getStoredThemeMode(), { persist: false });
  }

  return { init, initSlidingTabs, applyThemeMode, getStoredThemeMode };
})();

window.Theme = Theme;
