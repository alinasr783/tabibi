// Check if we're in development mode
const isDevelopment = location.hostname === 'localhost' || location.hostname === '127.0.0.1' || location.hostname === '0.0.0.0';

// Skip service worker in development mode to avoid HMR conflicts
if (isDevelopment) {
  self.addEventListener('install', (event) => {
    event.waitUntil(self.skipWaiting());
  });
  
  self.addEventListener('activate', (event) => {
    event.waitUntil(self.clients.claim());
  });
  
  // In development, we don't want to unregister and reload continuously
  // Just provide a minimal fetch handler that lets requests pass through
  self.addEventListener('fetch', (event) => {
    // Do nothing in development - let requests pass through normally
  });
  
  // Optionally, unregister once and stop (but don't force reload)
  self.addEventListener('activate', (event) => {
    event.waitUntil(
      self.registration.unregister()
        .then(() => {
          console.log('[SW] Service worker unregistered in development mode');
        })
    );
  });
} else {
  // Production mode - implement caching logic
  const CACHE_NAME = 'tabibi-offline-v3'; // Updated cache version
  const urlsToCache = [
    '/',
    '/index.html',
    '/logo.jpeg',
    '/manifest.json',
    // Add other critical assets here
  ];

  // List of API endpoints to exclude from caching
  const EXCLUDED_PATH_PREFIXES = [
    '/rest/v1/',
    '/functions/v1/',
    '/auth/',
    '/storage/',
    '/graphql',
    '/realtime/'
  ];

  self.addEventListener('install', (event) => {
    // Perform install steps
    event.waitUntil(
      caches.open(CACHE_NAME)
        .then((cache) => {
          console.log('[SW] Opened cache');
          return cache.addAll(urlsToCache);
        })
    );
  });

  self.addEventListener('fetch', (event) => {
    // Guard against unsupported schemes
    if (!isValidRequest(event.request)) {
      return;
    }
    
    // Skip caching for excluded paths
    if (isExcludedPath(event.request.url)) {
      return;
    }
    
    // Implement stale-while-revalidate strategy for better cache invalidation
    event.respondWith(
      caches.open(CACHE_NAME).then((cache) => {
        return cache.match(event.request).then((response) => {
          const fetchPromise = fetch(event.request).then((networkResponse) => {
            // Update cache with fresh response
            cache.put(event.request, networkResponse.clone());
            return networkResponse;
          });
          
          // Return cached response if available, otherwise wait for network
          return response || fetchPromise;
        });
      })
    );
  });

  self.addEventListener('activate', (event) => {
    const cacheWhitelist = [CACHE_NAME];

    event.waitUntil(
      caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheWhitelist.indexOf(cacheName) === -1) {
              console.log('[SW] Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
    );
  });

  // Helper function to validate request schemes
  function isValidRequest(request) {
    const url = new URL(request.url);
    
    // Only cache http and https requests
    if (!url.protocol.startsWith('http')) {
      return false;
    }
    
    // Only cache requests from the same origin
    if (url.origin !== self.location.origin) {
      return false;
    }
    
    return true;
  }

  // Helper function to check if a path should be excluded from caching
  function isExcludedPath(url) {
    const path = new URL(url).pathname;
    
    for (const prefix of EXCLUDED_PATH_PREFIXES) {
      if (path.startsWith(prefix)) {
        return true;
      }
    }
    
    return false;
  }
}