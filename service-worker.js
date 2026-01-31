const CACHE_NAME = 'chronoflip-v1';

// Files to cache immediately
const PRECACHE_URLS = [
  '/',
  '/index.html',
  '/index.tsx',
  '/manifest.json',
  '/icon.svg',
  '/types.ts',
  '/App.tsx',
  '/metadata.json',
  '/services/audioService.ts',
  '/hooks/useLocalStorage.ts',
  '/components/ClockView.tsx',
  '/components/AlarmView.tsx',
  '/components/TimerView.tsx',
  '/components/TimetableView.tsx',
  '/components/FlipDigit.tsx',
  '/components/WheelPicker.tsx',
  '/components/SoundPicker.tsx'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
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
            if(!response || response.status !== 200) {
              return response;
            }

            // We only want to cache basic requests or CORS requests (external libs)
            // Note: Opaque responses (type 'opaque') from no-cors requests 
            // generally cannot be cached safely for reuse, but in this specific 
            // dev environment we will try to cache mostly everything to support offline.
            
            const responseToCache = response.clone();

            caches.open(CACHE_NAME)
              .then((cache) => {
                // Don't cache POST requests or other mutations
                if (event.request.method === 'GET') {
                    cache.put(event.request, responseToCache);
                }
              });

            return response;
          }
        );
      })
  );
});