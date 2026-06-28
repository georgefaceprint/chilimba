const CACHE_NAME = 'chilimba-v2';
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/how-it-works.html',
  '/dashboard.html',
  '/vendor-dashboard.html',
  '/signup.html',
  '/group-cart.html',
  '/manifest.json',
  '/products.json'
];

self.addEventListener('install', (event) => {
  self.skipWaiting(); // Force activate new version
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(ASSETS_TO_CACHE))
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName); // Delete old V1 cache
          }
        })
      );
    }).then(() => self.clients.claim()) // Take over clients immediately
  );
});

self.addEventListener('fetch', (event) => {
  // Stale-While-Revalidate Strategy
  // Returns cache instantly if available, but fetches from network in background to update cache for next load
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      const fetchPromise = fetch(event.request).then((networkResponse) => {
        if(networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, networkResponse.clone());
          });
        }
        return networkResponse;
      }).catch(() => {
        // Ignore network errors, just rely on cache
      });
      
      return cachedResponse || fetchPromise;
    })
  );
});
