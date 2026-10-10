import React, { useEffect, useState } from 'react';
import { WifiOff, RefreshCw, CheckCircle2 } from 'lucide-react';
import { Language, Theme } from '../types';
import {
  OfflineCacheStats,
  warmPlatformIconsAndStaticCache,
} from '../utils/serviceWorkerCache';

export function useOnlineStatus() {
  const [isOnline, setIsOnline] = useState<boolean>(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );
  const [isUnstableConnection, setIsUnstableConnection] = useState<boolean>(false);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      setIsUnstableConnection(false);
    };
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    const nav = navigator as Navigator & {
      connection?: {
        effectiveType?: string;
        rtt?: number;
        downlink?: number;
        saveData?: boolean;
        addEventListener?: (type: string, listener: () => void) => void;
        removeEventListener?: (type: string, listener: () => void) => void;
      };
    };

    const checkConnectionQuality = () => {
      if (!nav.connection) return;
      const { effectiveType, rtt, downlink } = nav.connection;
      const slow =
        effectiveType === 'slow-2g' ||
        effectiveType === '2g' ||
        (typeof rtt === 'number' && rtt > 1200) ||
        (typeof downlink === 'number' && downlink > 0 && downlink < 0.4);
      setIsUnstableConnection(Boolean(slow));
    };

    checkConnectionQuality();
    nav.connection?.addEventListener?.('change', checkConnectionQuality);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      nav.connection?.removeEventListener?.('change', checkConnectionQuality);
    };
  }, []);

  return { isOnline, isUnstableConnection };
}

interface OfflineStatusBannerProps {
  lang: Language;
  theme?: Theme;
  cacheStats?: OfflineCacheStats | null;
  onCacheRefreshed?: (stats: OfflineCacheStats) => void;
}

export const OfflineStatusBanner: React.FC<OfflineStatusBannerProps> = ({
  lang,
  theme = 'dark',
  cacheStats,
  onCacheRefreshed,
}) => {
  const { isOnline, isUnstableConnection } = useOnlineStatus();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const isLight = theme === 'light';

  if (isOnline && !isUnstableConnection) {
    return null;
  }

  const handleRefreshCache = async () => {
    setIsRefreshing(true);
    try {
      const updated = await warmPlatformIconsAndStaticCache();
      onCacheRefreshed?.(updated);
    } finally {
      setIsRefreshing(false);
    }
  };

  return (
    <div
      id="offline-connectivity-banner"
      className="fixed bottom-16 left-1/2 -translate-x-1/2 z-40 w-[94%] max-w-xl animate-fade-in"
    >
      <div
        className={`flex items-center justify-between gap-3 px-3.5 py-2.5 rounded-xl border shadow-lg backdrop-blur-md ${
          !isOnline
            ? isLight
              ? 'bg-amber-50/95 border-amber-300 text-amber-950'
              : 'bg-amber-950/95 border-amber-500/40 text-amber-100'
            : isLight
            ? 'bg-sky-50/95 border-sky-200 text-sky-950'
            : 'bg-slate-900/95 border-slate-700 text-slate-100'
        }`}
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <div
            className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
              !isOnline
                ? 'bg-amber-500 text-white'
                : 'bg-sky-500 text-white'
            }`}
          >
            <WifiOff className="w-3.5 h-3.5" />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-bold truncate">
              {!isOnline
                ? lang === 'ur'
                  ? 'آف لائن موڈ — کیش شدہ پلیٹ فارم آئیکنز اور ڈیٹا فعال ہیں'
                  : 'Offline Mode — Cached platform icons & static assets active'
                : lang === 'ur'
                ? 'کمزور انٹرنیٹ کنکشن — آف لائن کیش استعمال ہو رہا ہے'
                : 'Unstable connection — Serving cached icons & assets'}
            </p>
            {cacheStats && (
              <p className="text-[10px] opacity-80 flex items-center gap-1 truncate">
                <CheckCircle2 className="w-3 h-3 text-emerald-500 shrink-0" />
                <span>
                  {lang === 'ur'
                    ? `${cacheStats.cachedPlatformIconsCount}/${cacheStats.totalPlatformIconsCount} پلیٹ فارم آئیکنز محفوظ ہیں`
                    : `${cacheStats.cachedPlatformIconsCount}/${cacheStats.totalPlatformIconsCount} platform icons cached`}
                </span>
              </p>
            )}
          </div>
        </div>

        <button
          type="button"
          onClick={handleRefreshCache}
          disabled={isRefreshing}
          className={`px-2.5 py-1.5 rounded-lg text-[11px] font-semibold flex items-center gap-1.5 shrink-0 cursor-pointer transition-colors ${
            isLight
              ? 'bg-white hover:bg-slate-100 text-slate-800 border border-slate-200'
              : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700'
          }`}
        >
          <RefreshCw className={`w-3 h-3 ${isRefreshing ? 'animate-spin' : ''}`} />
          <span>{lang === 'ur' ? 'ریفریش' : 'Retry'}</span>
        </button>
      </div>
    </div>
  );
};
