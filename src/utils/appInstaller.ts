export const PRODUCTION_APP_URL = 'https://mediaflow-hd.ai.studio';

export type DetectedDevicePlatform = 'android' | 'ios' | 'windows' | 'mac' | 'linux';

export interface BeforeInstallPromptEvent extends Event {
  readonly platforms?: string[];
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
  prompt(): Promise<void>;
}

export interface InstallProgressInfo {
  progress: number;
  stageEn: string;
  stageUr: string;
  completed: boolean;
  promptShown?: boolean;
}

export function detectDevicePlatform(): DetectedDevicePlatform {
  if (typeof window === 'undefined') return 'windows';
  const ua = window.navigator.userAgent.toLowerCase();
  if (/iphone|ipad|ipod/.test(ua)) return 'ios';
  if (/android/.test(ua)) return 'android';
  if (/macintosh|mac os x/.test(ua)) return 'mac';
  if (/linux/.test(ua)) return 'linux';
  return 'windows';
}

export function isAppAlreadyInstalled(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      window.matchMedia('(display-mode: window-controls-overlay)').matches ||
      (window.navigator as unknown as { standalone?: boolean }).standalone === true;
    if (isStandalone) return true;
    return localStorage.getItem('mediaflow_pwa_installed') === 'true';
  } catch {
    return false;
  }
}

export function markAppAsInstalled(): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem('mediaflow_pwa_installed', 'true');
    (window as any).__pwaInstalled = true;
    window.dispatchEvent(new CustomEvent('pwa-installed'));
  } catch {
    // ignore storage errors
  }
}

export function getDeferredPwaPrompt(externalPrompt?: BeforeInstallPromptEvent | null): BeforeInstallPromptEvent | null {
  if (externalPrompt && typeof externalPrompt.prompt === 'function') {
    return externalPrompt;
  }
  if (typeof window !== 'undefined' && (window as any).__deferredPwaPrompt) {
    const globalPrompt = (window as any).__deferredPwaPrompt as BeforeInstallPromptEvent;
    if (typeof globalPrompt.prompt === 'function') {
      return globalPrompt;
    }
  }
  return null;
}

/**
 * Triggers native PWA installation using the standard `beforeinstallprompt` browser event,
 * and ensures the Service Worker (`/sw.js`), Web App Manifest (`/manifest.json`), and
 * icons (`pwa-192x192.png`, `pwa-512x512.png`, `apple-touch-icon.png`) are registered and cached
 * for https://mediaflow-hd.ai.studio.
 */
export async function executeFullAppInstallation(options?: {
  deferredPrompt?: BeforeInstallPromptEvent | null;
  targetDevice?: DetectedDevicePlatform;
  onProgress?: (info: InstallProgressInfo) => void;
}): Promise<{ installedViaNativePrompt: boolean; completed: boolean }> {
  const notify = (
    progress: number,
    stageEn: string,
    stageUr: string,
    completed = false,
    promptShown = false
  ) => {
    options?.onProgress?.({ progress, stageEn, stageUr, completed, promptShown });
  };

  notify(
    25,
    'Verifying MediaFlow HD (https://mediaflow-hd.ai.studio) manifest & icons...',
    'MediaFlow HD (https://mediaflow-hd.ai.studio) مینیفیسٹ اور آئیکنز کی تصدیق ہو رہی ہے...'
  );

  // 1. Register Service Worker for standalone PWA compliance
  if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
    try {
      await navigator.serviceWorker.register('/sw.js', { scope: '/' });
    } catch {
      // ignore if restricted by environment
    }
  }

  // 2. Pre-cache core PWA manifest & brand icons for standalone launch
  if (typeof window !== 'undefined' && 'caches' in window) {
    try {
      const cache = await caches.open('mediaflow-hd-pwa-v2');
      const assets = [
        '/',
        '/index.html',
        '/manifest.json',
        '/manifest.webmanifest',
        '/icon.svg',
        '/apple-touch-icon.png',
        '/pwa-192x192.png',
        '/pwa-512x512.png',
        '/pwa-maskable-512x512.png',
      ];
      await Promise.allSettled(
        assets.map((assetUrl) =>
          fetch(assetUrl)
            .then((res) => {
              if (res && res.ok) return cache.put(assetUrl, res);
            })
            .catch(() => {})
        )
      );
    } catch {
      // ignore cache errors
    }
  }

  // 3. Trigger native browser `beforeinstallprompt` installation dialog if available
  const promptEvent = getDeferredPwaPrompt(options?.deferredPrompt);

  if (promptEvent) {
    try {
      notify(
        70,
        'Opening native browser PWA installation prompt...',
        'براؤزر کا آفیشل ایپ انسٹال ڈائیلاگ کھولا جا رہا ہے...',
        false,
        true
      );
      await promptEvent.prompt();
      const choice = await promptEvent.userChoice;
      if (choice && choice.outcome === 'accepted') {
        if (typeof window !== 'undefined') {
          (window as any).__deferredPwaPrompt = null;
        }
        markAppAsInstalled();
        notify(
          100,
          'MediaFlow HD installed on your home screen / desktop!',
          'MediaFlow HD آپ کی ہوم اسکرین / ڈیسک ٹاپ پر انسٹال ہو گئی ہے!',
          true,
          true
        );
        return { installedViaNativePrompt: true, completed: true };
      } else {
        notify(
          100,
          'Install prompt dismissed. Tap Download App again anytime to install.',
          'انسٹال پرامپٹ بند کر دیا گیا۔ دوبارہ انسٹال کرنے کے لیے بٹن دبائیں۔',
          false,
          true
        );
        return { installedViaNativePrompt: false, completed: false };
      }
    } catch {
      // Fall through to browser-assisted PWA installation state
    }
  }

  notify(
    100,
    'MediaFlow HD (https://mediaflow-hd.ai.studio) is ready to install on your device!',
    'MediaFlow HD (https://mediaflow-hd.ai.studio) آپ کی ڈیوائس پر انسٹالیشن کے لیے تیار ہے!',
    true,
    false
  );

  return { installedViaNativePrompt: false, completed: true };
}

