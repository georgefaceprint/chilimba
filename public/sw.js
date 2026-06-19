const CACHE_NAME = 'chilimba-v1-cache';
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/manifest.json',
  '/assets/css/tailwind.css',
  '/assets/sounds/payment-success.mp3',
  '/assets/images/logo.png',
  '/assets/images/offline-fallback.png'
];

// Install Event - Pre-cache essential structural Shell assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
  self.skipWaiting();
});

// Activate Event - Clean up older legacy caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) {
            return caches.delete(cache);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Fetch Event - Handle intelligent offline fallback routing
self.addEventListener('fetch', (event) => {
  const requestUrl = new URL(event.request.url);

  // Strategy A: Network-First for real-time tracking API streams
  if (requestUrl.pathname.includes('/api/v1/tracking') || requestUrl.pathname.includes('/sync')) {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseClone);
          });
          return response;
        })
        .catch(() => {
          return caches.match(event.request); // Fallback to stale tracking status if offline
        })
    );
    return;
  }

  // Strategy B: Cache-First for static marketplace asset catalogs and images
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }
      return fetch(event.request).then((response) => {
        if (response.status === 200 && response.type === 'basic') {
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseClone);
          });
        }
        return response;
      });
    })
  );
});
