const OFFLINE_MEDIA_CACHE = 'mediaflow-offline-media-v1';
const OFFLINE_API_CACHE = 'mediaflow-offline-creator-api-v1';

self.addEventListener('message', (event) => {
  const data = event.data;
  if (!data || typeof data !== 'object') return;

  if (data.type === 'WARM_PLATFORM_ICONS' && Array.isArray(data.urls)) {
    event.waitUntil(
      caches.open(OFFLINE_MEDIA_CACHE).then((cache) =>
        Promise.allSettled(
          data.urls.map(async (url) => {
            if (typeof url !== 'string' || !url.trim()) return;
            const existing = await cache.match(url);
            if (!existing) {
              const res = await fetch(url, { credentials: 'same-origin' }).catch(() => null);
              if (res && res.ok) {
                await cache.put(url, res.clone());
              }
            }
          })
        )
      )
    );
  }

  if (data.type === 'CACHE_MEDIA_URLS' && Array.isArray(data.urls)) {
    event.waitUntil(
      caches.open(OFFLINE_MEDIA_CACHE).then((cache) =>
        Promise.allSettled(
          data.urls.slice(0, 40).map(async (rawUrl) => {
            if (typeof rawUrl !== 'string' || !rawUrl.trim()) return;
            const isCrossOriginSocial =
              rawUrl.startsWith('http') &&
              !rawUrl.startsWith(self.location.origin) &&
              /tiktokcdn|cdninstagram|fbcdn\.net|pinimg\.com/i.test(rawUrl);
            const fetchUrl = isCrossOriginSocial
              ? `/api/image-proxy?url=${encodeURIComponent(rawUrl)}`
              : rawUrl;
            const existing = await cache.match(fetchUrl);
            if (!existing) {
              const res = await fetch(fetchUrl, { mode: 'cors', credentials: 'same-origin' }).catch(() => null);
              if (res && res.ok) {
                await cache.put(fetchUrl, res.clone());
                if (fetchUrl !== rawUrl) {
                  await cache.put(rawUrl, res.clone());
                }
              }
            }
          })
        )
      )
    );
  }
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  let url;
  try {
    url = new URL(event.request.url);
  } catch {
    return;
  }

  if (url.origin === self.location.origin && url.pathname.startsWith('/api/creator-videos')) {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          if (response && response.status === 200) {
            const clone = response.clone();
            caches.open(OFFLINE_API_CACHE).then((cache) => cache.put(event.request, clone));
          }
          return response;
        })
        .catch(() => caches.open(OFFLINE_API_CACHE).then((cache) => cache.match(event.request)))
    );
    return;
  }

  const isProxiedImage = url.origin === self.location.origin && url.pathname.startsWith('/api/image-proxy');
  const isExternalThumbnail =
    url.origin !== self.location.origin &&
    /\.(jpg|jpeg|png|webp|gif|svg|avif)(\?|$)/i.test(url.pathname + url.search);

  if (isProxiedImage || isExternalThumbnail) {
    event.respondWith(
      caches.open(OFFLINE_MEDIA_CACHE).then((cache) =>
        cache.match(event.request).then((cachedResponse) => {
          const networkFetch = fetch(event.request)
            .then((networkResponse) => {
              if (networkResponse && networkResponse.status === 200) {
                cache.put(event.request, networkResponse.clone());
              }
              return networkResponse;
            })
            .catch(() => cachedResponse);
          return cachedResponse || networkFetch;
        })
      )
    );
  }
});
