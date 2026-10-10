const CACHE_NAME = 'mediaflow-hd-pwa-v3';
const OFFLINE_MEDIA_CACHE = 'mediaflow-offline-media-v1';
const OFFLINE_API_CACHE = 'mediaflow-offline-creator-api-v1';

const CORE_ASSETS = [
  '/',
  '/index.html',
  '/manifest.webmanifest',
  '/manifest.json',
  '/icon.svg',
  '/logo.svg',
  '/favicon.ico',
  '/favicon-32x32.png',
  '/apple-touch-icon.png',
  '/pwa-192x192.png',
  '/pwa-512x512.png',
  '/pwa-maskable-512x512.png',
];

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return Promise.allSettled(
        CORE_ASSETS.map((url) =>
          fetch(url, { cache: 'reload' })
            .then((res) => {
              if (res && res.ok) {
                return cache.put(url, res);
              }
            })
            .catch(() => {})
        )
      );
    })
  );
});

self.addEventListener('activate', (event) => {
  const allowedCaches = new Set([
    CACHE_NAME,
    OFFLINE_MEDIA_CACHE,
    OFFLINE_API_CACHE,
    'mediaflow-platform-icons-v1',
    'mediaflow-static-assets-v1',
  ]);
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys.map((key) => {
            if (!allowedCaches.has(key)) {
              return caches.delete(key);
            }
          })
        )
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener('message', (event) => {
  const data = event.data;
  if (!data || typeof data !== 'object') return;

  if (data.type === 'SKIP_WAITING') {
    self.skipWaiting();
    return;
  }

  if ((data.type === 'CACHE_MEDIA_URLS' || data.type === 'WARM_PLATFORM_ICONS') && Array.isArray(data.urls)) {
    const targetCacheName =
      data.type === 'WARM_PLATFORM_ICONS' ? 'mediaflow-platform-icons-v1' : OFFLINE_MEDIA_CACHE;
    event.waitUntil(
      caches.open(targetCacheName).then((cache) =>
        Promise.allSettled(
          data.urls.slice(0, 40).map(async (rawUrl) => {
            if (!rawUrl || typeof rawUrl !== 'string') return;
            const existing = await cache.match(rawUrl);
            if (!existing) {
              const res = await fetch(rawUrl, { mode: 'no-cors' }).catch(() => null);
              if (res) {
                await cache.put(rawUrl, res);
              }
            }
          })
        )
      )
    );
  }
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  // 1. Offline-capable caching for image proxy & external thumbnails/avatars (History & Saved Accounts)
  const isImageProxy = url.origin === self.location.origin && url.pathname === '/api/image-proxy';
  const isExternalImage =
    url.origin !== self.location.origin &&
    (req.destination === 'image' ||
      /\.(jpe?g|png|webp|gif|svg)(\?.*)?$/i.test(url.pathname) ||
      /images\.unsplash\.com|ytimg\.com|pinimg\.com|tiktokcdn|cdninstagram|fbcdn\.net/i.test(url.hostname));

  if (isImageProxy || isExternalImage) {
    event.respondWith(
      caches.open(OFFLINE_MEDIA_CACHE).then(async (cache) => {
        const cached = await cache.match(req);
        const networkPromise = fetch(req)
          .then((netRes) => {
            if (netRes && (netRes.ok || netRes.type === 'opaque')) {
              cache.put(req, netRes.clone()).catch(() => {});
            }
            return netRes;
          })
          .catch(() => null);

        return cached || (await networkPromise) || new Response('', { status: 404 });
      })
    );
    return;
  }

  // 2. Network-first with offline cache fallback for Creator Profile Feeds (/api/creator-videos)
  if (url.origin === self.location.origin && url.pathname === '/api/creator-videos') {
    event.respondWith(
      caches.open(OFFLINE_API_CACHE).then(async (cache) => {
        try {
          const netRes = await fetch(req);
          if (netRes && netRes.ok) {
            cache.put(req, netRes.clone()).catch(() => {});
          }
          return netRes;
        } catch {
          const cached = await cache.match(req);
          if (cached) return cached;
          return new Response(
            JSON.stringify({ success: false, offline: true, error: 'Offline mode' }),
            { status: 503, headers: { 'Content-Type': 'application/json' } }
          );
        }
      })
    );
    return;
  }

  if (url.origin !== self.location.origin) return;
  if (
    url.pathname.startsWith('/api/') ||
    url.pathname.startsWith('/@') ||
    url.pathname.startsWith('/src/') ||
    url.pathname.startsWith('/node_modules/')
  ) {
    return;
  }

  // 3. App Shell & Static Assets (Network-first with full offline fallback to cached asset or /index.html)
  event.respondWith(
    fetch(req)
      .then((networkRes) => {
        if (networkRes && networkRes.status === 200 && networkRes.type === 'basic') {
          const copy = networkRes.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(req, copy)).catch(() => {});
        }
        return networkRes;
      })
      .catch(() =>
        caches.match(req).then((cachedRes) => cachedRes || caches.match('/index.html'))
      )
  );
});

