import { PlatformType } from '../types';

export const PLATFORM_ICON_CACHE_NAME = 'mediaflow-platform-icons-v1';
export const STATIC_ASSET_CACHE_NAME = 'mediaflow-static-assets-v1';

export const SUPPORTED_PLATFORM_IDS: PlatformType[] = [
  'tiktok',
  'instagram',
  'facebook',
  'youtube',
  'twitter',
  'pinterest',
  'threads',
  'reddit',
  'snapchat',
  'linkedin',
  'vimeo',
  'dailymotion',
];

export const PLATFORM_ICON_ASSETS: Record<PlatformType, string> = {
  tiktok: '/icons/platforms/tiktok.svg',
  instagram: '/icons/platforms/instagram.svg',
  facebook: '/icons/platforms/facebook.svg',
  youtube: '/icons/platforms/youtube.svg',
  twitter: '/icons/platforms/twitter.svg',
  pinterest: '/icons/platforms/pinterest.svg',
  threads: '/icons/platforms/threads.svg',
  reddit: '/icons/platforms/reddit.svg',
  snapchat: '/icons/platforms/snapchat.svg',
  linkedin: '/icons/platforms/linkedin.svg',
  vimeo: '/icons/platforms/vimeo.svg',
  dailymotion: '/icons/platforms/dailymotion.svg',
  universal: '/icon.svg',
};

export const CORE_STATIC_ASSETS: string[] = [
  '/',
  '/index.html',
  '/manifest.webmanifest',
  '/icon.svg',
  '/pwa-192x192.png',
  '/pwa-512x512.png',
  '/pwa-maskable-512x512.png',
  '/apple-touch-icon.png',
];

export interface OfflineCacheStats {
  isServiceWorkerSupported: boolean;
  isServiceWorkerActive: boolean;
  cachedPlatformIconsCount: number;
  totalPlatformIconsCount: number;
  cachedStaticAssetsCount: number;
  isReadyOffline: boolean;
}

export function getPlatformIconUrl(platformId: PlatformType): string {
  return PLATFORM_ICON_ASSETS[platformId] || '/icon.svg';
}

/**
 * Warms CacheStorage with all supported platform icons and static assets so that
 * icons and app shell remain available even on unstable or offline connections.
 */
export async function warmPlatformIconsAndStaticCache(): Promise<OfflineCacheStats> {
  const iconUrls = Object.values(PLATFORM_ICON_ASSETS);
  if (typeof window === 'undefined' || !('caches' in window)) {
    return {
      isServiceWorkerSupported: false,
      isServiceWorkerActive: false,
      cachedPlatformIconsCount: 0,
      totalPlatformIconsCount: iconUrls.length,
      cachedStaticAssetsCount: 0,
      isReadyOffline: false,
    };
  }

  try {
    const iconCache = await window.caches.open(PLATFORM_ICON_CACHE_NAME);
    await Promise.allSettled(
      iconUrls.map(async (url) => {
        const existing = await iconCache.match(url);
        if (!existing) {
          const response = await fetch(url, { cache: 'force-cache' });
          if (response.ok) {
            await iconCache.put(url, response.clone());
          }
        }
      })
    );

    const staticCache = await window.caches.open(STATIC_ASSET_CACHE_NAME);
    await Promise.allSettled(
      CORE_STATIC_ASSETS.map(async (url) => {
        const existing = await staticCache.match(url);
        if (!existing) {
          const response = await fetch(url, { cache: 'force-cache' });
          if (response.ok) {
            await staticCache.put(url, response.clone());
          }
        }
      })
    );
  } catch {
    // Ignore transient network errors when warming cache on unstable connection
  }

  return getOfflineCacheStats();
}

export async function getOfflineCacheStats(): Promise<OfflineCacheStats> {
  const iconUrls = Object.values(PLATFORM_ICON_ASSETS);
  if (typeof window === 'undefined' || !('caches' in window)) {
    return {
      isServiceWorkerSupported: false,
      isServiceWorkerActive: false,
      cachedPlatformIconsCount: 0,
      totalPlatformIconsCount: iconUrls.length,
      cachedStaticAssetsCount: 0,
      isReadyOffline: false,
    };
  }

  try {
    const iconCache = await window.caches.open(PLATFORM_ICON_CACHE_NAME);
    const iconKeys = await iconCache.keys();
    const staticCache = await window.caches.open(STATIC_ASSET_CACHE_NAME);
    const staticKeys = await staticCache.keys();

    const swSupported = 'serviceWorker' in navigator;
    const swActive = Boolean(
      swSupported && navigator.serviceWorker.controller
    );

    const cachedIcons = Math.min(iconKeys.length, iconUrls.length);
    return {
      isServiceWorkerSupported: swSupported,
      isServiceWorkerActive: swActive,
      cachedPlatformIconsCount: cachedIcons,
      totalPlatformIconsCount: iconUrls.length,
      cachedStaticAssetsCount: staticKeys.length,
      isReadyOffline: cachedIcons >= iconUrls.length && staticKeys.length > 0,
    };
  } catch {
    return {
      isServiceWorkerSupported: 'serviceWorker' in navigator,
      isServiceWorkerActive: false,
      cachedPlatformIconsCount: 0,
      totalPlatformIconsCount: iconUrls.length,
      cachedStaticAssetsCount: 0,
      isReadyOffline: false,
    };
  }
}

export async function registerServiceWorkerWithCaching(
  onStatusUpdate?: (stats: OfflineCacheStats) => void
): Promise<void> {
  if (typeof window === 'undefined') return;

  // Immediately warm CacheStorage with supported platform icons & static assets
  const initialStats = await warmPlatformIconsAndStaticCache();
  onStatusUpdate?.(initialStats);

  if (!('serviceWorker' in navigator)) return;

  try {
    const registration = await navigator.serviceWorker.register('/sw.js', {
      scope: '/',
    });

    if (registration.waiting) {
      registration.waiting.postMessage({ type: 'SKIP_WAITING' });
    }

    registration.addEventListener('updatefound', () => {
      const installingWorker = registration.installing;
      if (!installingWorker) return;
      installingWorker.addEventListener('statechange', async () => {
        if (installingWorker.state === 'activated') {
          const updatedStats = await warmPlatformIconsAndStaticCache();
          onStatusUpdate?.(updatedStats);
        }
      });
    });

    if (navigator.serviceWorker.controller) {
      navigator.serviceWorker.controller.postMessage({
        type: 'WARM_PLATFORM_ICONS',
        urls: Object.values(PLATFORM_ICON_ASSETS),
      });
    }

    const finalStats = await getOfflineCacheStats();
    onStatusUpdate?.({
      ...finalStats,
      isServiceWorkerActive: Boolean(
        registration.active || navigator.serviceWorker.controller
      ),
    });
  } catch {
    // Even if SW registration is restricted in an iframe context, CacheStorage warming still succeeds
    const fallbackStats = await getOfflineCacheStats();
    onStatusUpdate?.(fallbackStats);
  }
}
