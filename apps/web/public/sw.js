const CACHE_NAME = 'assetly-pwa-v1';
const STATIC_ASSETS = [
  '/',
  '/mobile',
  '/index.html',
  '/manifest.json',
  '/favicon.png',
  '/favicon.svg',
  '/logo.png'
];

// Install: Cache core app shell assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS);
    }).then(() => self.skipWaiting())
  );
});

// Activate: Clean up older cache stores
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch: Stale-while-revalidate for static files, Network-first for API
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Ignore API requests or non-GET requests from service worker caching
  if (url.pathname.startsWith('/api/') || event.request.method !== 'GET') {
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      const fetchPromise = fetch(event.request).then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
        }
        return networkResponse;
      }).catch(() => {
        // Return cached page or app fallback if offline
        return cachedResponse;
      });

      return cachedResponse || fetchPromise;
    })
  );
});
