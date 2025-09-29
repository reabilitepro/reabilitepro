const CACHE_NAME = 'reabilite-pro-cache-v3'; // Incremented cache version
const urlsToCache = [
  '/',
  '/index.html',
  '/style.css',
  '/manifest.json',
  '/admin.html',
  '/admin.js',
  '/anamnesis.html',
  '/anamnesis.js',
  '/app.js',
  '/patient-dashboard.html',
  '/patient-dashboard.js',
  '/patient-details.html',
  '/patient-details.js',
  '/patient-login.js',
  '/patient-registration.html',
  '/patient-registration.js',
  '/professional-dashboard.html',
  '/professional-dashboard.js',
  '/professional-login.js',
  '/professional-registration.html',
  '/professional-registration.js',
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
  if (event.request.url.includes('/api/')) {
    event.respondWith(
      caches.open(CACHE_NAME).then(cache => {
        return fetch(event.request)
          .then(response => {
            if(response.ok) { // Only cache successful responses
              cache.put(event.request, response.clone());
            }
            return response;
          })
          .catch(() => {
            return caches.match(event.request);
          });
      })
    );
    return;
  }

  event.respondWith(
    caches.match(event.request)
      .then(response => {
        return response || fetch(event.request);
      })
  );
});

self.addEventListener('activate', event => {
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