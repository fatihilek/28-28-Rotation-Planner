const CACHE_NAME = 'rotation-planner-v4';
const API_CACHE = 'rotation-planner-api-v1';
const CORE_ASSETS = ['./', './index.html', './manifest.webmanifest', './icon.svg'];
const NETWORK_FIRST_DESTINATIONS = new Set(['document', 'script', 'style', 'worker', 'manifest']);

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(CORE_ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME && key !== API_CACHE)
          .map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

const networkFirst = async (request, cacheName) => {
  const cache = await caches.open(cacheName);
  try {
    const response = await fetch(request);
    if (response.ok || response.type === 'opaque') {
      cache.put(request, response.clone());
    }
    return response;
  } catch (error) {
    const cached = await cache.match(request);
    if (cached) return cached;
    throw error;
  }
};

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);

  if (url.hostname === 'calendarific.com') {
    event.respondWith(networkFirst(request, API_CACHE));
    return;
  }

  if (url.origin !== self.location.origin) {
    return;
  }

  if (request.mode === 'navigate' || NETWORK_FIRST_DESTINATIONS.has(request.destination)) {
    event.respondWith(networkFirst(request, CACHE_NAME));
    return;
  }

  event.respondWith(
    caches.open(CACHE_NAME).then(async (cache) => {
      const cached = await cache.match(request);
      if (cached) return cached;

      const response = await fetch(request);
      if (response.ok) {
        cache.put(request, response.clone());
      }
      return response;
    })
  );
});
