
const CACHE_NAME = 'chronoflip-v3';

// Files to cache immediately (The "App Shell")
// NOTE: We only cache raw assets here. 
// We do NOT cache .tsx/.ts files because in production (Vite build), 
// those files are bundled into hashed JS files and do not exist individually.
const PRECACHE_URLS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icon.svg',
  '/metadata.json'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
          return cache.addAll(PRECACHE_URLS).catch(err => {
              console.error("Failed to cache app shell:", err);
              // We don't throw here to allow partial installs if one file fails,
              // though ideally, the shell should be perfect.
          });
      })
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  // Handle requests
  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        // Cache hit - return response
        if (response) {
          return response;
        }

        // Clone the request because it's a stream and can only be consumed once
        const fetchRequest = event.request.clone();

        return fetch(fetchRequest).then(
          (response) => {
            // Check if we received a valid response
            if(!response || response.status !== 200 || response.type !== 'basic') {
              // Note: 'basic' type means it's a request from our origin. 
              // External requests (like Google Fonts) might be 'cors' or 'opaque'.
              // We return them but don't necessarily cache them blindly here.
              return response;
            }

            // We only want to cache GET requests
            if (event.request.method !== 'GET') {
                return response;
            }

            const responseToCache = response.clone();

            caches.open(CACHE_NAME)
              .then((cache) => {
                  cache.put(event.request, responseToCache);
              });

            return response;
          }
        );
      })
  );
});
