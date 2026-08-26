// Minimal offline/installability layer for the PWA. Kept deliberately simple
// for a small static reference site: the deploy workflow already stamps
// css/js/data URLs with `?v=<commit-sha>` (see .github/workflows -- the
// __CACHEBUST__ replacement), so those responses are immutable per deploy
// and safe to cache-first forever. The HTML itself has no such marker, so
// it's always fetched network-first with a cache fallback for offline use.
const CACHE = 'sakura-v1';
const APP_SHELL = [
  './',
  'index.html',
  'manifest.webmanifest',
  'logo.png',
  'icons/icon-192.png',
  'icons/icon-512.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE)
      .then((cache) => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return; // let cross-origin (Google Fonts) go straight to the network

  const isNavigation = req.mode === 'navigate';
  const isVersioned = url.searchParams.has('v');

  if (isNavigation) {
    // Network-first: always try to get the latest page (and therefore the
    // latest versioned asset URLs) when online; fall back to the cached
    // shell when offline.
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE).then((cache) => cache.put(req, copy));
          return res;
        })
        .catch(() => caches.match('index.html'))
    );
    return;
  }

  if (isVersioned) {
    // Cache-first: the query string changes every deploy, so a cached hit
    // is guaranteed to be the right version.
    event.respondWith(
      caches.match(req).then((cached) => cached || fetch(req).then((res) => {
        const copy = res.clone();
        caches.open(CACHE).then((cache) => cache.put(req, copy));
        return res;
      }))
    );
    return;
  }

  // Everything else (icons, logo, manifest): stale-while-revalidate.
  event.respondWith(
    caches.match(req).then((cached) => {
      const network = fetch(req).then((res) => {
        const copy = res.clone();
        caches.open(CACHE).then((cache) => cache.put(req, copy));
        return res;
      }).catch(() => cached);
      return cached || network;
    })
  );
});
