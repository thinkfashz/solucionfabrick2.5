/* Soluciones Fabrick - Service Worker
 * Lightweight, dependency-free SW providing:
 *  - App-shell precache (home + offline fallback)
 *  - Runtime caching:
 *      · images/fonts → CacheFirst
 *      · static Next.js assets (/_next/static) → CacheFirst (immutable)
 *      · navigation requests → NetworkFirst with /offline fallback
 *      · API (/api/*) → NetworkFirst (no offline fallback, always attempt network first)
 *  - skipWaiting + clients.claim for fast updates
 */

const VERSION = 'fabrick-sw-v1';
const STATIC_CACHE = `${VERSION}-static`;
const RUNTIME_CACHE = `${VERSION}-runtime`;
const IMAGE_CACHE = `${VERSION}-images`;

const PRECACHE_URLS = [
  '/offline',
  '/manifest.webmanifest',
  '/favicon.svg',
  '/app-icon.svg',
  '/icon-192.png',
  '/icon-512.png',
  '/apple-touch-icon.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => cache.addAll(PRECACHE_URLS)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => !key.startsWith(VERSION))
          .map((key) => caches.delete(key))
      )
    ).then(() => self.clients.claim())
  );
});

function isImageRequest(request) {
  return request.destination === 'image';
}

function isFontRequest(request) {
  return request.destination === 'font';
}

function isStaticAsset(url) {
  return url.pathname.startsWith('/_next/static/');
}

function isApiRequest(url) {
  return url.pathname.startsWith('/api/');
}

async function cacheFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  if (cached) return cached;
  try {
    const response = await fetch(request);
    if (response && response.ok) cache.put(request, response.clone());
    return response;
  } catch (err) {
    if (cached) return cached;
    throw err;
  }
}

async function networkFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  try {
    const response = await fetch(request);
    if (response && response.ok) cache.put(request, response.clone());
    return response;
  } catch (err) {
    const cached = await cache.match(request);
    if (cached) return cached;
    throw err;
  }
}

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // Navigation requests (HTML documents)
  if (request.mode === 'navigate') {
    event.respondWith(
      (async () => {
        try {
          const fresh = await fetch(request);
          const cache = await caches.open(RUNTIME_CACHE);
          cache.put(request, fresh.clone());
          return fresh;
        } catch {
          const cache = await caches.open(RUNTIME_CACHE);
          const cached = await cache.match(request);
          if (cached) return cached;
          const offline = await caches.match('/offline');
          return offline || new Response('Sin conexión', { status: 503 });
        }
      })()
    );
    return;
  }

  if (isApiRequest(url)) {
    event.respondWith(networkFirst(request, RUNTIME_CACHE));
    return;
  }

  if (isStaticAsset(url)) {
    event.respondWith(cacheFirst(request, STATIC_CACHE));
    return;
  }

  if (isImageRequest(request) || isFontRequest(request)) {
    event.respondWith(cacheFirst(request, IMAGE_CACHE));
    return;
  }

  // Default: stale-while-revalidate
  event.respondWith(
    (async () => {
      const cache = await caches.open(RUNTIME_CACHE);
      const cached = await cache.match(request);
      const networkPromise = fetch(request)
        .then((response) => {
          if (response && response.ok) cache.put(request, response.clone());
          return response;
        })
        .catch(() => cached);
      return cached || networkPromise;
    })()
  );
});

// Allow the page to trigger an immediate update
self.addEventListener('message', (event) => {
  if (event.data === 'SKIP_WAITING') self.skipWaiting();
});

// ── Web Push ────────────────────────────────────────────────────
self.addEventListener('push', (event) => {
  let payload = { title: 'Soluciones Fabrick', body: 'Tienes una nueva notificación.', url: '/', icon: '/icon-192.png', tag: 'fabrick' };
  try {
    if (event.data) {
      const data = event.data.json();
      payload = { ...payload, ...data };
    }
  } catch (err) {
    // Payload wasn't JSON — fall back to the raw text in body.
    try {
      if (event.data) payload.body = event.data.text();
    } catch (_) { /* ignore */ }
  }

  event.waitUntil(
    self.registration.showNotification(payload.title, {
      body: payload.body,
      icon: payload.icon || '/icon-192.png',
      badge: '/icon-192.png',
      tag: payload.tag || 'fabrick',
      data: { url: payload.url || '/' },
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = (event.notification.data && event.notification.data.url) || '/';
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientsArr) => {
      const origin = self.location.origin;
      for (const client of clientsArr) {
        try {
          const clientUrl = new URL(client.url);
          if (clientUrl.origin === origin && 'focus' in client) {
            client.navigate(targetUrl).catch(() => undefined);
            return client.focus();
          }
        } catch (_) { /* ignore */ }
      }
      if (self.clients.openWindow) return self.clients.openWindow(targetUrl);
      return undefined;
    })
  );
});
