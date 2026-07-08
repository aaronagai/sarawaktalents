/** Tailwind build config — replaces the render-blocking Play CDN
 *  (cdn.tailwindcss.com). Rebuild after changing markup/classes:
 *    npm run build:css      (or: npx tailwindcss@3 -i src/input.css -o tailwind.css --minify)
 *
 *  `content` must list every file that contains class names, INCLUDING the JS
 *  that builds card markup at runtime (script.js etc.) — otherwise those
 *  classes get purged and cards render unstyled.
 */
module.exports = {
    darkMode: 'class',
    content: [
        './index.html',
        './join/index.html',
        './profile/index.html',
        './admin/index.html',
        './script.js',
        './join.js',
        './profile.js',
        './admin.js',
        './transitions.js',
        './icons.js',
    ],
    theme: {
        extend: {
            fontFamily: {
                sans: ['SF Pro Rounded', '.SF Pro Rounded', 'SF Pro Rounded', '-apple-system', 'BlinkMacSystemFont', 'system-ui', 'sans-serif'],
            },
            fontWeight: {
                light: '300',
                normal: '300',
                medium: '300',
                semibold: '500',
                bold: '500',
                extrabold: '500',
            },
            colors: {
                brand: {
                    50: '#f0fdfa',
                    100: '#ccfbf1',
                    500: '#14b8a6',
                    600: '#0d9488',
                    900: '#134e4a',
                },
            },
        },
    },
};
