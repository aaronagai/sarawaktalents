/**
 * Reicon helpers — CDN custom element (<re-icon>).
 * Browse icons: https://reicon.dev/icons (kebab-case: search, shield-check, home, …)
 * Props: size (px), color, weight ("outline" | "filled"), inherits currentColor via CSS.
 */
const Icons = {
  /**
   * @param {string} name - kebab-case icon name from reicon.dev/icons
   * @param {{ size?: number, color?: string, weight?: 'outline'|'filled', className?: string, ariaHidden?: boolean }} [opts]
   * @returns {HTMLElement}
   */
  create(name, { size = 24, color, weight = 'outline', className, ariaHidden = true } = {}) {
    const el = document.createElement('re-icon');
    el.setAttribute('icon', name);
    el.setAttribute('size', String(size));
    el.setAttribute('weight', weight);
    if (color) el.setAttribute('color', color);
    if (className) el.className = className;
    if (ariaHidden) el.setAttribute('aria-hidden', 'true');
    return el;
  },

  /**
   * Replace an inline SVG (or any element) with a <re-icon>.
   * @param {Element} el - element to replace (e.g. button.querySelector('svg'))
   * @param {string} name
   * @param {object} [opts] - same options as create()
   * @returns {HTMLElement}
   */
  replace(el, name, opts = {}) {
    const icon = Icons.create(name, opts);
    el.replaceWith(icon);
    return icon;
  },
};

window.Icons = Icons;
