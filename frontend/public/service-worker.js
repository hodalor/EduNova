const STATIC_ASSETS = 'eduova-static-v1';
const API_CACHE = 'eduova-api-v1';
const DATA_CACHE = 'eduova-data-v1';

const STATIC_URLS = ['/', '/logo192.png', '/logo512.png', '/favicon.ico'];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(STATIC_ASSETS).then((cache) => cache.addAll(STATIC_URLS)));
});

self.addEventListener('fetch', (event) => {
  const { request } = event;

  if (request.method !== 'GET') {
    return;
  }

  const url = new URL(request.url);
  const isStaticAsset = /\.(woff2?|png|jpg|jpeg|svg|webp|ico)$/.test(url.pathname);
  const isApiRequest = /\/api\//.test(url.pathname);
  const isCachedView =
    /\/students\/.+/.test(url.pathname) ||
    /\/timetable/.test(url.pathname) ||
    /\/attendance/.test(url.pathname);

  if (isStaticAsset) {
    event.respondWith(caches.match(request).then((cached) => cached || fetch(request)));
    return;
  }

  if (isApiRequest || isCachedView) {
    const cacheName = isApiRequest ? API_CACHE : DATA_CACHE;
    event.respondWith(
      fetch(request)
        .then((response) => {
          const clone = response.clone();
          caches.open(cacheName).then((cache) => cache.put(request, clone));
          return response;
        })
        .catch(() => caches.match(request))
    );
  }
});
