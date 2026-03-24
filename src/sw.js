const CACHE_NAME = 'tabibi-offline-v6';
const urlsToCache = [
  '/',
  '/index.html',
  '/logo.jpeg',
  '/manifest.json'
];
self.__tabibiWbManifest = self.__WB_MANIFEST;

const EXCLUDED_PATH_PREFIXES = [
  '/rest/v1/',
  '/functions/v1/',
  '/auth/',
  '/storage/',
  '/graphql',
  '/realtime/'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(urlsToCache))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('fetch', (event) => {
  if (!isValidRequest(event.request)) return;
  if (isExcludedPath(event.request.url)) return;

  const request = event.request;
  const url = new URL(request.url);

  const isNavigation = request.mode === 'navigate' || (request.headers.get('accept') || '').includes('text/html');
  const isAsset = url.pathname.startsWith('/assets/') || url.pathname.match(/\.(js|css|json|png|jpg|jpeg|svg|ico|woff2?)$/i);

  if (isNavigation) {
    event.respondWith(
      fetch(request)
        .then((networkResponse) => {
          const clone = networkResponse.clone();
          event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.put('/index.html', clone)));
          return networkResponse;
        })
        .catch(() => caches.match('/index.html'))
    );
    return;
  }

  if (isAsset) {
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) return cached;
        return fetch(request)
          .then((networkResponse) => {
            if (networkResponse && networkResponse.status === 200) {
              const clone = networkResponse.clone();
              event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.put(request, clone)));
            }
            return networkResponse;
          })
          .catch(() => cached);
      })
    );
    return;
  }

  event.respondWith(
    fetch(request).catch(() => caches.match(request))
  );
});

self.addEventListener('sync', (event) => {
  if (event.tag === 'tabibi-sync') {
    event.waitUntil(
      self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
        clients.forEach((client) => {
          client.postMessage({ type: 'TABIBI_SYNC' });
        });
      })
    );
  }
});

self.addEventListener('activate', (event) => {
  const cacheWhitelist = [CACHE_NAME];

  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

function isValidRequest(request) {
  const url = new URL(request.url);
  if (!url.protocol.startsWith('http')) {
    return false;
  }
  if (url.origin !== self.location.origin) {
    return false;
  }
  return true;
}

function isExcludedPath(url) {
  const path = new URL(url).pathname;

  for (const prefix of EXCLUDED_PATH_PREFIXES) {
    if (path.startsWith(prefix)) {
      return true;
    }
  }

  return false;
}
