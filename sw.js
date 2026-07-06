const CACHE = 'sarawaktalents-v7';
const ASSETS = [
  '/sarawaktalents/',
  '/sarawaktalents/index.html',
  '/sarawaktalents/style.css',
  '/sarawaktalents/transitions/index.css',
  '/sarawaktalents/transitions/_root.css',
  '/sarawaktalents/transitions.js',
  '/sarawaktalents/icons.js',
  '/sarawaktalents/script.js',
  '/sarawaktalents/manifest.json',
  '/sarawaktalents/sslogo.png',
  '/sarawaktalents/sslogo.svg',
  '/sarawaktalents/favicon-32.png',
  '/sarawaktalents/icon-192.png',
  '/sarawaktalents/icon-512.png',
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
