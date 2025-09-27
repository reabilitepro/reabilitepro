const CACHE_NAME = 'reabilite-pro-cache-v2'; // Updated cache version
const urlsToCache = [
  '/',
  '/index.html',
  '/contato.html',
  '/login.html',
  '/admin.html',
  '/style.css',
  '/script.js',
  '/admin.js',
  'https://i.imgur.com/LN825NZ.png' 
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Opened cache and caching static assets');
        return cache.addAll(urlsToCache);
      })
  );
});

self.addEventListener('fetch', event => {
  // For API calls, use a Network First strategy
  if (event.request.url.includes('/api/')) {
    event.respondWith(
      caches.open(CACHE_NAME).then(cache => {
        return fetch(event.request)
          .then(response => {
            // If the network request is successful, cache the new response
            cache.put(event.request, response.clone());
            return response;
          })
          .catch(() => {
            // If the network request fails, try to return the cached response
            return caches.match(event.request);
          });
      })
    );
    return; // End execution for API calls
  }

  // For all other requests (static assets), use a Cache First strategy
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        if (response) {
          return response; // Return from cache if available
        }
        return fetch(event.request); // Otherwise, fetch from network
      })
  );
});

self.addEventListener('activate', event => {
  // Delete old caches
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            console.log('Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});
