const CACHE = 'sarawaktalents-v59';
// Relative paths so the app works both at the domain root (sarawaktalents.com)
// and under the /sarawaktalents/ project path.
const ASSETS = [
  './',
  './index.html',
  './site-paths.js',
  './hero-dots.js',
  './profile/',
  './profile/index.html',
  './join/',
  './join/index.html',
  './admin/',
  './admin/index.html',
  './style.css',
  './transitions/index.css',
  './transitions/_root.css',
  './transitions.js',
  './icons.js',
  './script.js',
  './manifest.json',
  './sslogo.png',
  './sslogo.svg',
  './favicon-32.png',
  './icon-192.png',
  './icon-512.png',
];

// Install: cache core assets
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting())
  );
});

// Activate: remove old caches
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

// Fetch: cache-first for assets, network-first for photos
self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);

  // Photos: network first, fall back to cache
  if (url.pathname.includes('/photos/')) {
    e.respondWith(
      fetch(e.request)
        .then(r => { caches.open(CACHE).then(c => c.put(e.request, r.clone())); return r; })
        .catch(() => caches.match(e.request))
    );
    return;
  }

  // Everything else: cache first
  e.respondWith(
    caches.match(e.request).then(r => r || fetch(e.request))
  );
});
