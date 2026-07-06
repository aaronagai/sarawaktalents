const CACHE = 'gps-prn13-v6';
const ASSETS = [
  '/gps-prn13-candidates/',
  '/gps-prn13-candidates/index.html',
  '/gps-prn13-candidates/style.css',
  '/gps-prn13-candidates/transitions/index.css',
  '/gps-prn13-candidates/transitions/_root.css',
  '/gps-prn13-candidates/transitions.js',
  '/gps-prn13-candidates/icons.js',
  '/gps-prn13-candidates/script.js',
  '/gps-prn13-candidates/manifest.json',
  '/gps-prn13-candidates/sslogo.png',
  '/gps-prn13-candidates/sslogo.svg',
  '/gps-prn13-candidates/favicon-32.png',
  '/gps-prn13-candidates/icon-192.png',
  '/gps-prn13-candidates/icon-512.png',
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
