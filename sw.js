const CACHE_NAME = 'jobtracker-v2';
const STATIC_ASSETS = new Set([
  './',
  './index.html',
  './styles.css',
  './app.js',
  './manifest.json',
  './firebase-config.local.js',
  './favicon-16x16.png',
  './favicon-32x32.png',
  './favicon-48x48.png',
  './apple-touch-icon.png',
  './icon-192x192.png',
  './icon-512x512.png'
]);

function isCacheableStaticRequest(request) {
  if (request.method !== 'GET') return false;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return false;

  const relativePath = `./${url.pathname.replace(self.location.pathname.replace(/sw\.js$/, ''), '')}`;
  return STATIC_ASSETS.has(relativePath) || STATIC_ASSETS.has(`.${url.pathname}`);
}

// Install event - cache essential app shell files only. Never cache Firestore,
// Firebase Storage, auth, reCAPTCHA, or other API responses that may contain PII.
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll([...STATIC_ASSETS]))
      .then(() => self.skipWaiting())
  );
});

// Activate event - clean up old caches
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

// Fetch event - use cache only for the static app shell. Everything else is
// network-only so customer information is not retained by the service worker.
self.addEventListener('fetch', (event) => {
  if (!isCacheableStaticRequest(event.request)) {
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        if (response && response.ok) {
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseClone);
          });
        }
        return response;
      })
      .catch(() => caches.match(event.request))
  );
});

// Listen for messages from the app
self.addEventListener('message', (event) => {
  if (event.data === 'skipWaiting') {
    self.skipWaiting();
  }
});
