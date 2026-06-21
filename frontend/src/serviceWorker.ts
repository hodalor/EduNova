const STATIC_ASSETS = 'eduova-static-v1';
const API_CACHE = 'eduova-api-v1';
const DATA_CACHE = 'eduova-data-v1';

const STATIC_URLS = ['/', '/logo192.png', '/logo512.png', '/favicon.ico'];

self.addEventListener('install', (event: Event) => {
  const installEvent = event as Event & { waitUntil: (promise: Promise<unknown>) => void };
  installEvent.waitUntil(
    caches.open(STATIC_ASSETS).then((cache) => cache.addAll(STATIC_URLS))
  );
});

self.addEventListener('fetch', (event: Event) => {
  const fetchEvent = event as Event & { request: Request; respondWith: (response: Promise<Response | undefined>) => void };
  const { request } = fetchEvent;

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
    fetchEvent.respondWith(
      caches.match(request).then((cached) => cached || fetch(request))
    );
    return;
  }

  if (isApiRequest || isCachedView) {
    const cacheName = isApiRequest ? API_CACHE : DATA_CACHE;
    fetchEvent.respondWith(
      fetch(request)
        .then((response) => {
          const clone = response.clone();
          void caches.open(cacheName).then((cache) => cache.put(request, clone));
          return response;
        })
        .catch(() => caches.match(request))
    );
  }
});

export {};
