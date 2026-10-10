import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Download, ChevronLeft, ChevronRight, ArrowUpRight, Zap } from 'lucide-react';
import { DownloadTask, HistoryItem, Language, PlatformType, Theme } from '../types';

const AUTO_DOWNLOAD_CREATORS_STORAGE_KEY = 'mediaflow_auto_download_creators_v1';

export const normalizeCreatorKey = (creator?: string): string => {
  if (!creator) return '';
  return creator.trim().toLowerCase().replace(/^@+/, '');
};

export const getStoredAutoDownloadCreators = (): string[] => {
  try {
    const raw = localStorage.getItem(AUTO_DOWNLOAD_CREATORS_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((c) => typeof c === 'string') : [];
  } catch {
    return [];
  }
};

export const isCreatorAutoDownloadEnabled = (creator?: string): boolean => {
  const key = normalizeCreatorKey(creator);
  if (!key) return false;
  return getStoredAutoDownloadCreators().some((c) => normalizeCreatorKey(c) === key);
};

export interface LiveDownloadFeedItem {
  id: string;
  title: string;
  creator: string;
  platform: PlatformType;
  platformLabel: string;
  resolution: string;
  format: 'MP4' | 'MP3';
  size: string;
  url: string;
  noWatermark?: boolean;
  secondsAgo: number;
  downloadCount: number;
  isUserItem?: boolean;
}

interface RecentDownloadsMarqueeProps {
  lang: Language;
  theme: Theme;
  history: HistoryItem[];
  activeTasks: DownloadTask[];
  onSelectUrl: (url: string, autoDownload?: boolean) => void;
  onToggleCreatorAutoDownload?: (item: LiveDownloadFeedItem, enabled: boolean) => void;
}

const INITIAL_LIVE_FEED: Omit<LiveDownloadFeedItem, 'id' | 'secondsAgo'>[] = [
  {
    title: 'Cinematic Dolomites FPV Drone Flight HDR',
    creator: '@dolomites_fpv',
    platform: 'youtube',
    platformLabel: 'YouTube',
    resolution: '4K 2160p',
    format: 'MP4',
    size: '64.8 MB',
    url: 'https://www.youtube.com/watch?v=aqz-KE-bpKQ',
    noWatermark: true,
    downloadCount: 1842,
  },
  {
    title: 'Tokyo Shibuya Neon Street Walk Transition',
    creator: '@shibuya_walks',
    platform: 'tiktok',
    platformLabel: 'TikTok',
    resolution: '1080p HD',
    format: 'MP4',
    size: '14.2 MB',
    url: 'https://www.tiktok.com/@tiktok/video/7106594312292453675',
    noWatermark: true,
    downloadCount: 3290,
  },
  {
    title: 'Swiss Alps Glacier Express Golden Hour Reel',
    creator: '@alps_cinema',
    platform: 'instagram',
    platformLabel: 'Instagram',
    resolution: '1080p HD',
    format: 'MP4',
    size: '18.6 MB',
    url: 'https://www.instagram.com/reel/C8abc123xyz/',
    noWatermark: true,
    downloadCount: 1415,
  },
  {
    title: 'Lo-Fi Midnight Study Session Instrumental Mix',
    creator: '@lofi_girl',
    platform: 'youtube',
    platformLabel: 'YouTube',
    resolution: '320kbps',
    format: 'MP3',
    size: '7.4 MB',
    url: 'https://www.youtube.com/watch?v=jfKfPfyJRdk',
    downloadCount: 2764,
  },
  {
    title: 'Next-Gen AI Robotics Demo Keynote Clip',
    creator: '@ai_robotics_lab',
    platform: 'twitter',
    platformLabel: 'X (Twitter)',
    resolution: '1080p HD',
    format: 'MP4',
    size: '22.1 MB',
    url: 'https://x.com/i/status/1800000000000000001',
    noWatermark: true,
    downloadCount: 948,
  },
  {
    title: 'Iceland Northern Lights 8K Timelapse',
    creator: '@iceland_8k',
    platform: 'youtube',
    platformLabel: 'YouTube',
    resolution: '8K 4320p',
    format: 'MP4',
    size: '142.0 MB',
    url: 'https://www.youtube.com/watch?v=LXb3EKWsInQ',
    noWatermark: true,
    downloadCount: 2150,
  },
  {
    title: 'Artisan Espresso Workflow Slow Motion',
    creator: '@artisan_barista',
    platform: 'pinterest',
    platformLabel: 'Pinterest',
    resolution: '1080p HD',
    format: 'MP4',
    size: '11.9 MB',
    url: 'https://www.pinterest.com/pin/123456789012345678/',
    noWatermark: true,
    downloadCount: 685,
  },
  {
    title: 'UEFA Champions League Matchday Highlights',
    creator: '@uefa_official',
    platform: 'facebook',
    platformLabel: 'Facebook',
    resolution: '4K 2160p',
    format: 'MP4',
    size: '52.3 MB',
    url: 'https://www.facebook.com/watch/?v=10156049485672318',
    noWatermark: true,
    downloadCount: 4120,
  },
  {
    title: 'Acoustic Guitar Cover — Sunset Rooftop Session',
    creator: '@rooftop_sessions',
    platform: 'tiktok',
    platformLabel: 'TikTok',
    resolution: '320kbps',
    format: 'MP3',
    size: '4.8 MB',
    url: 'https://www.tiktok.com/@music/video/7200000000000000002',
    downloadCount: 1190,
  },
  {
    title: 'Minimalist Desk Setup Tour & Cable Guide',
    creator: '@minimal_setups',
    platform: 'reddit',
    platformLabel: 'Reddit',
    resolution: '1080p HD',
    format: 'MP4',
    size: '19.5 MB',
    url: 'https://www.reddit.com/r/battlestations/comments/1a2b3c/minimal_setup/',
    noWatermark: true,
    downloadCount: 830,
  },
];

const PLATFORM_LABELS: Record<PlatformType, string> = {
  youtube: 'YouTube',
  tiktok: 'TikTok',
  instagram: 'Instagram',
  facebook: 'Facebook',
  twitter: 'X (Twitter)',
  pinterest: 'Pinterest',
  threads: 'Threads',
  reddit: 'Reddit',
  snapchat: 'Snapchat',
  linkedin: 'LinkedIn',
  vimeo: 'Vimeo',
  dailymotion: 'Dailymotion',
  universal: 'Web Video',
};

type FilterMode = 'all' | 'uhd' | 'audio';

export const RecentDownloadsMarquee: React.FC<RecentDownloadsMarqueeProps> = ({
  lang,
  theme,
  history,
  activeTasks,
  onSelectUrl,
  onToggleCreatorAutoDownload,
}) => {
  const isLight = theme === 'light';
  const [filterMode, setFilterMode] = useState<FilterMode>('all');
  const [liveItems, setLiveItems] = useState<LiveDownloadFeedItem[]>(() =>
    INITIAL_LIVE_FEED.map((item, idx) => ({
      ...item,
      id: `seed-${idx}`,
      secondsAgo: (idx + 1) * 7,
    }))
  );
  const [autoDownloadCreators, setAutoDownloadCreators] = useState<string[]>(() =>
    getStoredAutoDownloadCreators()
  );
  const [creatorToggleToast, setCreatorToggleToast] = useState<string | null>(null);

  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const isDraggingRef = useRef(false);
  const hasDraggedRef = useRef(false);
  const dragStartXRef = useRef(0);
  const dragStartScrollLeftRef = useRef(0);
  const [isDragging, setIsDragging] = useState(false);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

  const updateScrollButtons = useCallback(() => {
    const el = scrollContainerRef.current;
    if (!el) return;
    const maxScrollLeft = el.scrollWidth - el.clientWidth;
    setCanScrollLeft(el.scrollLeft > 4);
    setCanScrollRight(maxScrollLeft - el.scrollLeft > 4);
  }, []);

  const formatCreatorHandle = (rawAuthor?: string, platform?: PlatformType): string => {
    if (rawAuthor && rawAuthor.trim()) {
      const cleaned = rawAuthor.trim();
      return cleaned.startsWith('@') ? cleaned : `@${cleaned.replace(/\s+/g, '_').toLowerCase()}`;
    }
    return `@${platform || 'media'}_creator`;
  };

  const combinedFeed = useMemo(() => {
    const urlSaveCounts = new Map<string, number>();
    history.forEach((h) => {
      const key = h.originalUrl || h.mediaUrl;
      urlSaveCounts.set(key, (urlSaveCounts.get(key) || 0) + 1);
    });
    activeTasks.forEach((t) => {
      const key = t.sourceUrl || t.url;
      urlSaveCounts.set(key, (urlSaveCounts.get(key) || 0) + 1);
    });

    const userTaskItems: LiveDownloadFeedItem[] = activeTasks
      .slice(0, 4)
      .map((t) => {
        const key = t.sourceUrl || t.url;
        return {
          id: `task-${t.id}`,
          title: t.mediaTitle || 'HD Media Stream',
          creator: formatCreatorHandle(t.author, t.platform),
          platform: t.platform,
          platformLabel: PLATFORM_LABELS[t.platform] || 'Video',
          resolution: t.resolution || t.quality || '1080p HD',
          format: t.format === 'MP3' || t.type === 'audio' ? 'MP3' : 'MP4',
          size: t.size || '16.4 MB',
          url: key,
          noWatermark: t.noWatermark,
          secondsAgo: Math.max(1, Math.round((Date.now() - t.createdAt) / 1000)),
          downloadCount: Math.max(1, urlSaveCounts.get(key) || 1),
          isUserItem: true,
        };
      });

    const userHistoryItems: LiveDownloadFeedItem[] = history
      .slice(0, 4)
      .map((h) => {
        const key = h.originalUrl || h.mediaUrl;
        return {
          id: `hist-${h.id}`,
          title: h.title || 'Saved HD Video',
          creator: formatCreatorHandle(h.author, h.platform),
          platform: h.platform,
          platformLabel: PLATFORM_LABELS[h.platform] || 'Video',
          resolution: h.quality || '1080p HD',
          format: h.format === 'MP3' || h.type === 'audio' ? 'MP3' : 'MP4',
          size: h.size || '14.8 MB',
          url: key,
          noWatermark: h.noWatermark,
          secondsAgo: Math.max(2, Math.round((Date.now() - h.downloadedAt) / 1000)),
          downloadCount: Math.max(1, urlSaveCounts.get(key) || 1),
          isUserItem: true,
        };
      });

    const merged = [...userTaskItems, ...userHistoryItems, ...liveItems];

    return merged.filter((item) => {
      if (filterMode === 'uhd') {
        return /4k|8k|2160|4320|1080/i.test(item.resolution);
      }
      if (filterMode === 'audio') {
        return item.format === 'MP3';
      }
      return true;
    });
  }, [activeTasks, history, liveItems, filterMode]);

  useEffect(() => {
    updateScrollButtons();
    const handleResize = () => updateScrollButtons();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [combinedFeed, updateScrollButtons]);

  const scrollByDirection = (direction: 'left' | 'right') => {
    const el = scrollContainerRef.current;
    if (!el) return;
    const step = Math.max(280, Math.round(el.clientWidth * 0.75));
    el.scrollBy({
      left: direction === 'left' ? -step : step,
      behavior: 'smooth',
    });
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.button !== 0) return;
    const el = scrollContainerRef.current;
    if (!el) return;
    isDraggingRef.current = true;
    hasDraggedRef.current = false;
    dragStartXRef.current = e.pageX - el.offsetLeft;
    dragStartScrollLeftRef.current = el.scrollLeft;
    setIsDragging(true);
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isDraggingRef.current) return;
    const el = scrollContainerRef.current;
    if (!el) return;
    const x = e.pageX - el.offsetLeft;
    const delta = x - dragStartXRef.current;
    if (Math.abs(delta) > 5) {
      hasDraggedRef.current = true;
      e.preventDefault();
      el.scrollLeft = dragStartScrollLeftRef.current - delta;
      updateScrollButtons();
    }
  };

  const stopDragging = () => {
    if (!isDraggingRef.current) return;
    isDraggingRef.current = false;
    setIsDragging(false);
    setTimeout(() => {
      hasDraggedRef.current = false;
    }, 50);
  };

  const handleWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    const el = scrollContainerRef.current;
    if (!el) return;
    if (Math.abs(e.deltaY) > Math.abs(e.deltaX) && el.scrollWidth > el.clientWidth) {
      el.scrollLeft += e.deltaY;
      updateScrollButtons();
    }
  };

  const formatRelativeTime = (seconds: number): string => {
    if (seconds < 60) {
      return lang === 'ur' ? `${seconds} سیکنڈ قبل` : `${seconds}s ago`;
    }
    const mins = Math.floor(seconds / 60);
    if (mins < 60) {
      return lang === 'ur' ? `${mins} منٹ قبل` : `${mins}m ago`;
    }
    const hrs = Math.floor(mins / 60);
    return lang === 'ur' ? `${hrs} گھنٹے قبل` : `${hrs}h ago`;
  };

  const formatDownloadCount = (count: number): string => {
    const formatted = count.toLocaleString('en-US');
    return lang === 'ur' ? `${formatted} بار محفوظ` : `${formatted} saves`;
  };

  const getActivityBadgeLabel = (item: LiveDownloadFeedItem): string => {
    if (item.isUserItem) {
      return lang === 'ur' ? 'آپ کا حالیہ ڈاؤن لوڈ' : 'Recently saved by you';
    }
    if (item.secondsAgo <= 20) {
      return lang === 'ur' ? 'ابھی محفوظ کیا گیا' : 'Recently saved';
    }
    return lang === 'ur' ? 'مقبول ڈاؤن لوڈ' : 'Verified HD save';
  };

  const isCreatorEnabled = useCallback(
    (creator: string): boolean => {
      const normalized = normalizeCreatorKey(creator);
      if (!normalized) return false;
      return autoDownloadCreators.some((c) => normalizeCreatorKey(c) === normalized);
    },
    [autoDownloadCreators]
  );

  const handleToggleCreatorSwitch = (
    e: React.MouseEvent<HTMLButtonElement>,
    item: LiveDownloadFeedItem
  ) => {
    e.stopPropagation();
    if (hasDraggedRef.current) return;
    const normalized = normalizeCreatorKey(item.creator);
    if (!normalized) return;

    const currentlyEnabled = isCreatorEnabled(item.creator);
    const nextEnabled = !currentlyEnabled;
    const nextList = nextEnabled
      ? Array.from(new Set([...autoDownloadCreators, item.creator]))
      : autoDownloadCreators.filter((c) => normalizeCreatorKey(c) !== normalized);

    setAutoDownloadCreators(nextList);
    try {
      localStorage.setItem(AUTO_DOWNLOAD_CREATORS_STORAGE_KEY, JSON.stringify(nextList));
    } catch {
      // ignore storage errors
    }

    setCreatorToggleToast(
      nextEnabled
        ? lang === 'ur'
          ? `${item.creator} کے ملتے جلتے مواد کا آٹو ڈاؤن لوڈ فعال کر دیا گیا`
          : `Auto-download enabled for similar content from ${item.creator}`
        : lang === 'ur'
        ? `${item.creator} کا آٹو ڈاؤن لوڈ بند کر دیا گیا`
        : `Auto-download turned off for ${item.creator}`
    );
    setTimeout(() => setCreatorToggleToast(null), 3500);

    if (onToggleCreatorAutoDownload) {
      onToggleCreatorAutoDownload(item, nextEnabled);
    }
  };

  const handleSelectMarqueeItem = (item: LiveDownloadFeedItem) => {
    if (hasDraggedRef.current) return;
    setLiveItems((prev) =>
      prev.map((entry) =>
        entry.url === item.url
          ? { ...entry, downloadCount: entry.downloadCount + 1, secondsAgo: 1 }
          : entry
      )
    );
    const shouldAutoDownload = isCreatorEnabled(item.creator);
    onSelectUrl(item.url, shouldAutoDownload);
  };

  return (
    <section
      id="recent-downloads-marquee-section"
      aria-labelledby="recent-downloads-marquee-heading"
      className={`w-full max-w-2xl mx-auto rounded-2xl border overflow-hidden transition-colors ${
        isLight
          ? 'bg-white border-slate-200/90 text-slate-900 shadow-xs'
          : 'bg-[#111827]/90 border-slate-800/90 text-slate-100 shadow-md'
      }`}
    >
      {/* Top Control & Status Bar */}
      <div
        className={`px-3.5 sm:px-4 py-2.5 border-b flex flex-wrap items-center justify-between gap-2 ${
          isLight ? 'border-slate-200/80 bg-slate-50/70' : 'border-slate-800/80 bg-[#0b0f19]/60'
        }`}
      >
        <div className="flex items-center gap-2 min-w-0">
          <span
            className="w-2 h-2 rounded-full bg-emerald-500 shrink-0"
            aria-hidden="true"
          />
          <h2
            id="recent-downloads-marquee-heading"
            className={`text-xs sm:text-sm font-semibold tracking-tight whitespace-nowrap ${
              isLight ? 'text-slate-900' : 'text-white'
            }`}
          >
            {lang === 'ur' ? 'حالیہ ڈاؤن لوڈز' : 'Recent Downloads'}
          </h2>
          <span
            aria-hidden="true"
            className={isLight ? 'text-slate-300' : 'text-slate-600'}
          >
            ·
          </span>
          <span
            className={`text-[11px] sm:text-xs font-mono tabular-nums truncate ${
              isLight ? 'text-slate-500' : 'text-slate-400'
            }`}
          >
            {creatorToggleToast
              ? creatorToggleToast
              : autoDownloadCreators.length > 0
              ? lang === 'ur'
                ? `${autoDownloadCreators.length} کریئیٹر آٹو ڈاؤن لوڈ فعال · دائیں بائیں اسکرول کریں`
                : `${autoDownloadCreators.length} creator auto-download active · Swipe or drag`
              : lang === 'ur'
              ? 'ہاتھ یا ماؤس سے دائیں بائیں اسکرول کریں'
              : 'Swipe or drag left & right · 8K / 4K / 1080p / MP3'}
          </span>
        </div>

        {/* Interactive Filter Tabs & Manual Left/Right Scroll Controls */}
        <div className="flex items-center gap-1.5 shrink-0">
          <div
            role="group"
            aria-label={lang === 'ur' ? 'فارمیٹ فلٹر' : 'Filter recent downloads'}
            className={`flex items-center gap-0.5 p-0.5 rounded-lg border ${
              isLight
                ? 'bg-slate-100 border-slate-200/80'
                : 'bg-[#0f172a] border-slate-800'
            }`}
          >
            <button
              type="button"
              onClick={() => setFilterMode('all')}
              className={`px-2 py-1 rounded-md text-[11px] font-medium transition-colors cursor-pointer whitespace-nowrap ${
                filterMode === 'all'
                  ? isLight
                    ? 'bg-white text-slate-900 shadow-2xs'
                    : 'bg-slate-800 text-white'
                  : isLight
                  ? 'text-slate-600 hover:text-slate-900'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {lang === 'ur' ? 'تمام' : 'All'}
            </button>
            <button
              type="button"
              onClick={() => setFilterMode('uhd')}
              className={`px-2 py-1 rounded-md text-[11px] font-mono font-medium transition-colors cursor-pointer whitespace-nowrap ${
                filterMode === 'uhd'
                  ? isLight
                    ? 'bg-white text-slate-900 shadow-2xs'
                    : 'bg-slate-800 text-white'
                  : isLight
                  ? 'text-slate-600 hover:text-slate-900'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              4K/HD
            </button>
            <button
              type="button"
              onClick={() => setFilterMode('audio')}
              className={`px-2 py-1 rounded-md text-[11px] font-mono font-medium transition-colors cursor-pointer whitespace-nowrap ${
                filterMode === 'audio'
                  ? isLight
                    ? 'bg-white text-slate-900 shadow-2xs'
                    : 'bg-slate-800 text-white'
                  : isLight
                  ? 'text-slate-600 hover:text-slate-900'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              MP3
            </button>
          </div>

          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => scrollByDirection('left')}
              disabled={!canScrollLeft}
              title={lang === 'ur' ? 'بائیں طرف اسکرول کریں' : 'Scroll left'}
              aria-label={lang === 'ur' ? 'بائیں طرف اسکرول کریں' : 'Scroll left'}
              className={`p-1.5 rounded-lg border transition-colors flex items-center justify-center ${
                !canScrollLeft
                  ? isLight
                    ? 'bg-slate-50 text-slate-300 border-slate-200/60 cursor-not-allowed'
                    : 'bg-[#0f172a]/50 text-slate-600 border-slate-800/60 cursor-not-allowed'
                  : isLight
                  ? 'bg-white hover:bg-slate-100 text-slate-700 border-slate-200 cursor-pointer'
                  : 'bg-[#0f172a] hover:bg-slate-800 text-slate-300 border-slate-800 cursor-pointer'
              }`}
            >
              <ChevronLeft className="w-3.5 h-3.5" aria-hidden="true" />
            </button>
            <button
              type="button"
              onClick={() => scrollByDirection('right')}
              disabled={!canScrollRight}
              title={lang === 'ur' ? 'دائیں طرف اسکرول کریں' : 'Scroll right'}
              aria-label={lang === 'ur' ? 'دائیں طرف اسکرول کریں' : 'Scroll right'}
              className={`p-1.5 rounded-lg border transition-colors flex items-center justify-center ${
                !canScrollRight
                  ? isLight
                    ? 'bg-slate-50 text-slate-300 border-slate-200/60 cursor-not-allowed'
                    : 'bg-[#0f172a]/50 text-slate-600 border-slate-800/60 cursor-not-allowed'
                  : isLight
                  ? 'bg-white hover:bg-slate-100 text-slate-700 border-slate-200 cursor-pointer'
                  : 'bg-[#0f172a] hover:bg-slate-800 text-slate-300 border-slate-800 cursor-pointer'
              }`}
            >
              <ChevronRight className="w-3.5 h-3.5" aria-hidden="true" />
            </button>
          </div>
        </div>
      </div>

      {/* Manual Horizontal Scroll & Drag Track (Touch Swipe + Mouse Drag) */}
      <div className="relative py-2.5 select-none">
        {/* Left & Right Subtle Edge Fade Scrims */}
        {canScrollLeft && (
          <div
            aria-hidden="true"
            className={`pointer-events-none absolute inset-y-0 left-0 w-6 z-10 bg-gradient-to-r ${
              isLight ? 'from-white to-transparent' : 'from-[#111827] to-transparent'
            }`}
          />
        )}
        {canScrollRight && (
          <div
            aria-hidden="true"
            className={`pointer-events-none absolute inset-y-0 right-0 w-6 z-10 bg-gradient-to-l ${
              isLight ? 'from-white to-transparent' : 'from-[#111827] to-transparent'
            }`}
          />
        )}

        <div
          ref={scrollContainerRef}
          onScroll={updateScrollButtons}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={stopDragging}
          onMouseLeave={stopDragging}
          onWheel={handleWheel}
          className={`overflow-x-auto overflow-y-hidden touch-pan-x touch-pan-y [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden ${
            isDragging ? 'cursor-grabbing' : 'cursor-grab'
          }`}
        >
          <ul
            role="list"
            aria-label={lang === 'ur' ? 'حالیہ ڈاؤن لوڈ کی گئی ویڈیوز' : 'Recently downloaded videos and audio'}
            className="flex items-stretch gap-2.5 px-3 w-max"
          >
            {combinedFeed.map((item) => {
              const autoCreatorOn = isCreatorEnabled(item.creator);
              return (
                <li key={item.id} className="shrink-0">
                  <div
                    className={`group rounded-xl border transition-colors flex flex-col justify-between max-w-[340px] sm:max-w-[380px] ${
                      autoCreatorOn
                        ? isLight
                          ? 'bg-emerald-50/50 border-emerald-300/90 text-slate-900'
                          : 'bg-[#0b151e]/95 border-emerald-500/45 text-slate-100'
                        : isLight
                        ? 'bg-slate-50/90 hover:bg-slate-100 border-slate-200/90 text-slate-900'
                        : 'bg-[#0b0f19]/90 hover:bg-slate-900 border-slate-800/90 text-slate-100'
                    }`}
                  >
                    {/* Main Clickable Area to Load / Auto-Download Media */}
                    <button
                      type="button"
                      draggable={false}
                      onClick={() => handleSelectMarqueeItem(item)}
                      title={
                        lang === 'ur'
                          ? `${item.title} (${formatDownloadCount(item.downloadCount)}) کو ڈاؤن لوڈر میں لوڈ کریں`
                          : `Load "${item.title}" (${item.resolution} ${item.format} · ${formatDownloadCount(item.downloadCount)}) into downloader`
                      }
                      className={`w-full px-3.5 pt-2.5 pb-2 text-left flex items-center gap-3 ${
                        isDragging ? 'cursor-grabbing' : 'cursor-pointer'
                      }`}
                    >
                      <div className="min-w-0 flex-1 space-y-1">
                        {/* Top Activity & Download Count Row (Unboxed Metadata with Tabular Numerals) */}
                        <div
                          className={`flex items-center gap-1.5 text-[11px] font-mono tabular-nums whitespace-nowrap overflow-hidden ${
                            isLight ? 'text-slate-500' : 'text-slate-400'
                          }`}
                        >
                          <span
                            className={`font-sans font-semibold ${
                              item.secondsAgo <= 20 || item.isUserItem
                                ? isLight
                                  ? 'text-emerald-700'
                                  : 'text-emerald-400'
                                : isLight
                                ? 'text-slate-700'
                                : 'text-slate-300'
                            }`}
                          >
                            {getActivityBadgeLabel(item)}
                          </span>
                          <span aria-hidden="true">·</span>
                          <span
                            className={`font-semibold ${
                              isLight ? 'text-slate-800' : 'text-slate-200'
                            }`}
                          >
                            {formatDownloadCount(item.downloadCount)}
                          </span>
                          <span aria-hidden="true">·</span>
                          <span>{formatRelativeTime(item.secondsAgo)}</span>
                        </div>

                        {/* Primary Title Row */}
                        <div className="flex items-center gap-1.5">
                          <Download
                            className={`w-3.5 h-3.5 shrink-0 ${
                              item.format === 'MP3' ? 'text-sky-500' : 'text-rose-500'
                            }`}
                            aria-hidden="true"
                          />
                          <span className="text-xs font-semibold truncate block">
                            {item.title}
                          </span>
                        </div>

                        {/* Clean Unboxed Technical & Creator Metadata Row */}
                        <div
                          className={`flex items-center gap-1.5 text-[11px] font-mono tabular-nums whitespace-nowrap overflow-hidden ${
                            isLight ? 'text-slate-500' : 'text-slate-400'
                          }`}
                        >
                          <span
                            className={`font-sans font-semibold ${
                              isLight ? 'text-slate-700' : 'text-slate-300'
                            }`}
                          >
                            {item.platformLabel}
                          </span>
                          <span aria-hidden="true">·</span>
                          <span
                            className={`truncate max-w-[115px] ${
                              isLight ? 'text-sky-700 font-medium' : 'text-sky-400 font-medium'
                            }`}
                          >
                            {item.creator}
                          </span>
                          <span aria-hidden="true">·</span>
                          <span
                            className={
                              /4k|8k|2160|4320/i.test(item.resolution)
                                ? isLight
                                  ? 'text-emerald-700 font-semibold'
                                  : 'text-emerald-400 font-semibold'
                                : ''
                            }
                          >
                            {item.resolution}
                          </span>
                          <span aria-hidden="true">·</span>
                          <span>{item.format}</span>
                          <span aria-hidden="true">·</span>
                          <span>{item.size}</span>
                        </div>
                      </div>

                      <ArrowUpRight
                        className={`w-3.5 h-3.5 shrink-0 opacity-50 group-hover:opacity-100 transition-opacity ${
                          isLight ? 'text-slate-600' : 'text-slate-300'
                        }`}
                        aria-hidden="true"
                      />
                    </button>

                    {/* Quick-Toggle Switch Row: Auto-download similar content from this creator */}
                    <div
                      className={`px-3.5 py-1.5 border-t flex items-center justify-between gap-2 ${
                        isLight
                          ? 'border-slate-200/75 bg-slate-100/60'
                          : 'border-slate-800/80 bg-[#080c14]/70'
                      }`}
                    >
                      <div className="flex items-center gap-1.5 min-w-0">
                        <Zap
                          className={`w-3 h-3 shrink-0 ${
                            autoCreatorOn
                              ? isLight
                                ? 'text-emerald-600'
                                : 'text-emerald-400'
                              : isLight
                              ? 'text-slate-400'
                              : 'text-slate-500'
                          }`}
                          aria-hidden="true"
                        />
                        <span
                          className={`text-[10px] font-medium truncate ${
                            autoCreatorOn
                              ? isLight
                                ? 'text-emerald-800 font-semibold'
                                : 'text-emerald-300 font-semibold'
                              : isLight
                              ? 'text-slate-600'
                              : 'text-slate-400'
                          }`}
                        >
                          {lang === 'ur'
                            ? 'اس کریئیٹر کا ملتا جلتا مواد خودکار ڈاؤن لوڈ کریں'
                            : 'Auto-download similar content from this creator'}
                        </span>
                      </div>

                      <button
                        type="button"
                        role="switch"
                        aria-checked={autoCreatorOn}
                        aria-label={
                          lang === 'ur'
                            ? `${item.creator} کا ملتا جلتا مواد خودکار ڈاؤن لوڈ کریں`
                            : `Auto-download similar content from ${item.creator}`
                        }
                        title={
                          lang === 'ur'
                            ? `${item.creator} سے ملتا جلتا مواد خودکار طور پر ڈاؤن لوڈ کریں`
                            : `Auto-download similar content from ${item.creator}`
                        }
                        onClick={(e) => handleToggleCreatorSwitch(e, item)}
                        className={`relative inline-flex h-4 w-7 shrink-0 cursor-pointer rounded-full border border-transparent transition-colors duration-150 focus:outline-none ${
                          autoCreatorOn
                            ? 'bg-emerald-600'
                            : isLight
                            ? 'bg-slate-300 hover:bg-slate-400'
                            : 'bg-slate-700 hover:bg-slate-600'
                        }`}
                      >
                        <span
                          aria-hidden="true"
                          className={`pointer-events-none inline-block h-3 w-3 transform rounded-full bg-white shadow-xs transition duration-150 ${
                            autoCreatorOn ? 'translate-x-3.5' : 'translate-x-0.5'
                          } mt-0.25`}
                        />
                      </button>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    </section>
  );
};
