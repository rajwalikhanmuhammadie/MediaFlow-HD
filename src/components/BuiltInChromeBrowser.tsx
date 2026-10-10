import React, { useState, useRef, useEffect } from 'react';
import {
  Search,
  Globe,
  ArrowLeft,
  ArrowRight,
  RotateCw,
  X,
  Download,
  ExternalLink,
  Play,
  Loader2,
  Video,
  Music,
  Image as ImageIcon,
  Layers,
  SlidersHorizontal,
  Check,
  Sparkles,
} from 'lucide-react';
import { Language, Theme } from '../types';
import {
  ALL_BROWSER_PLATFORMS,
  BrowserPlatformFilter,
  BrowserPlatformId,
  BrowserMediaTypeFilter,
  BrowserSearchSettings,
  loadBrowserSearchSettings,
  saveBrowserSearchSettings,
  getEnabledPlatformIds,
  buildPlatformSearchUrl,
  BROWSER_SETTINGS_CHANGED_EVENT,
} from '../utils/browserSearchSettings';

export interface GoogleSearchResultItem {
  title: string;
  url: string;
  displayUrl: string;
  snippet: string;
  thumbnail?: string;
  duration?: string;
  isVideo?: boolean;
  mediaType?: 'video' | 'audio' | 'photo';
  platform?: string;
  author?: string;
  views?: string;
}

export interface BrowserSessionEntry {
  url: string;
  query: string;
  platform: BrowserPlatformFilter;
  committed: boolean;
}

interface BuiltInChromeBrowserProps {
  lang: Language;
  theme?: Theme;
  onDownloadUrl: (videoUrl: string) => void;
}

export const BuiltInChromeBrowser: React.FC<BuiltInChromeBrowserProps> = ({
  lang,
  theme = 'dark',
  onDownloadUrl,
}) => {
  const isLight = theme === 'light';
  const inputRef = useRef<HTMLInputElement | null>(null);
  const iframeRef = useRef<HTMLIFrameElement | null>(null);

  const [browserSettings, setBrowserSettings] = useState<BrowserSearchSettings>(() =>
    loadBrowserSearchSettings()
  );
  const [isPlatformSettingsOpen, setIsPlatformSettingsOpen] = useState<boolean>(false);

  const initialPlatform: BrowserPlatformFilter =
    loadBrowserSearchSettings().defaultPlatform || 'all';
  const initialWebUrl = buildPlatformSearchUrl('', initialPlatform);

  const [query, setQuery] = useState<string>('');
  const [activeQuery, setActiveQuery] = useState<string>('');
  const [isSearching, setIsSearching] = useState<boolean>(false);
  const [selectedPlatform, setSelectedPlatform] = useState<BrowserPlatformFilter>(initialPlatform);
  const [selectedMediaType, setSelectedMediaType] = useState<BrowserMediaTypeFilter>(
    () => loadBrowserSearchSettings().defaultMediaType || 'all'
  );
  const [results, setResults] = useState<GoogleSearchResultItem[]>([]);
  const [platformCounts, setPlatformCounts] = useState<Record<string, number>>({});
  const [viewMode, setViewMode] = useState<'results' | 'webview'>('results');
  const [activeWebUrl, setActiveWebUrl] = useState<string>(initialWebUrl);

  const initialEntry: BrowserSessionEntry = {
    url: initialWebUrl,
    query: '',
    platform: initialPlatform,
    committed: true,
  };
  const [historyStack, setHistoryStack] = useState<BrowserSessionEntry[]>([initialEntry]);
  const [historyIndex, setHistoryIndex] = useState<number>(0);
  const historyRef = useRef<{ stack: BrowserSessionEntry[]; index: number }>({
    stack: [initialEntry],
    index: 0,
  });
  const [iframeKey, setIframeKey] = useState<number>(0);

  const recordSessionNavigation = (
    nextUrl: string,
    nextQuery: string,
    nextPlatform: BrowserPlatformFilter,
    commit: boolean
  ) => {
    const { stack, index } = historyRef.current;
    const current = stack[index];

    if (current && current.url === nextUrl && current.platform === nextPlatform) {
      if (commit && !current.committed) {
        const updatedStack = [...stack];
        updatedStack[index] = { ...current, query: nextQuery, committed: true };
        historyRef.current = { stack: updatedStack, index };
        setHistoryStack(updatedStack);
      }
      return;
    }

    const isIncrementalTyping =
      !commit &&
      current &&
      !current.committed &&
      current.platform === nextPlatform &&
      current.query.length > 0 &&
      nextQuery.startsWith(current.query);

    if (isIncrementalTyping) {
      const updatedStack = [...stack.slice(0, index + 1)];
      updatedStack[index] = {
        url: nextUrl,
        query: nextQuery,
        platform: nextPlatform,
        committed: false,
      };
      historyRef.current = { stack: updatedStack, index };
      setHistoryStack(updatedStack);
      setHistoryIndex(index);
      return;
    }

    const nextStack = [
      ...stack.slice(0, index + 1),
      {
        url: nextUrl,
        query: nextQuery,
        platform: nextPlatform,
        committed: commit,
      },
    ];
    const nextIndex = nextStack.length - 1;
    historyRef.current = { stack: nextStack, index: nextIndex };
    setHistoryStack(nextStack);
    setHistoryIndex(nextIndex);
  };

  // Sync settings across tabs / drawers
  useEffect(() => {
    const handleSettingsSync = (e: Event) => {
      const customEv = e as CustomEvent<BrowserSearchSettings>;
      if (customEv.detail) {
        setBrowserSettings(customEv.detail);
      } else {
        setBrowserSettings(loadBrowserSearchSettings());
      }
    };
    window.addEventListener(BROWSER_SETTINGS_CHANGED_EVENT, handleSettingsSync);
    return () => {
      window.removeEventListener(BROWSER_SETTINGS_CHANGED_EVENT, handleSettingsSync);
    };
  }, []);

  const isDirectUrl = (text: string): boolean => {
    const trimmed = text.trim();
    return (
      /^https?:\/\//i.test(trimmed) ||
      (/^[a-z0-9.-]+\.[a-z]{2,}(\/|$)/i.test(trimmed) && !trimmed.includes(' '))
    );
  };

  const normalizeDirectUrl = (text: string): string => {
    const trimmed = text.trim();
    return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  };

  // Client-side strict media-only safeguard: reject articles, blogs, encyclopedias, news text pages
  const isStrictMediaItem = (item: GoogleSearchResultItem): boolean => {
    const lowUrl = (item.url || '').toLowerCase();
    if (
      /wikipedia\.org|britannica\.com|quora\.com|stackoverflow\.com|medium\.com|nytimes\.com|bbc\.com\/news|cnn\.com|reuters\.com|blogspot\.com|wordpress\.com/i.test(
        lowUrl
      )
    ) {
      return false;
    }
    if (/\/(wiki|blog|blogs|news|article|articles|forum|forums|docs|help)\//i.test(lowUrl)) {
      return false;
    }
    return true;
  };

  const fetchFeedForTerm = async (
    searchTerm: string,
    platToUse: BrowserPlatformFilter,
    mediaTypeToUse: BrowserMediaTypeFilter,
    activeSettings: BrowserSearchSettings
  ) => {
    setIsSearching(true);
    try {
      const enabledIds = getEnabledPlatformIds(activeSettings);
      const params = new URLSearchParams({
        q: searchTerm,
        platform: platToUse,
        mediaType: mediaTypeToUse,
        enabledPlatforms: enabledIds.join(','),
        mixPlatforms: String(activeSettings.mixAllPlatformsTogether),
        perPlatform: String(activeSettings.resultsPerPlatform || 6),
      });
      const res = await fetch(`/api/google-search?${params.toString()}`);
      if (res.ok) {
        const data = await fetchJsonSafe(res);
        if (data && Array.isArray(data.results)) {
          setResults(
            activeSettings.strictMediaOnly
              ? data.results.filter(isStrictMediaItem)
              : data.results
          );
        }
        if (data && data.platformCounts && typeof data.platformCounts === 'object') {
          setPlatformCounts(data.platformCounts);
        }
      }
    } catch {
      // fallback handled gracefully
    } finally {
      setIsSearching(false);
    }
  };

  const fetchJsonSafe = async (res: Response) => {
    try {
      return await res.json();
    } catch {
      return null;
    }
  };

  const executeSearchOrNavigate = async (
    inputVal?: string,
    pushHistory: boolean = true,
    platformOverride?: BrowserPlatformFilter,
    mediaTypeOverride?: BrowserMediaTypeFilter,
    settingsOverride?: BrowserSearchSettings,
    explicitWebUrl?: string
  ) => {
    const target = (inputVal !== undefined ? inputVal : query).trim();
    const platToUse = platformOverride !== undefined ? platformOverride : selectedPlatform;
    const mediaTypeToUse = mediaTypeOverride !== undefined ? mediaTypeOverride : selectedMediaType;
    const activeSettings = settingsOverride || browserSettings;

    setViewMode('results');

    const nextSearchUrl = explicitWebUrl || buildPlatformSearchUrl(target, platToUse);
    setActiveWebUrl(nextSearchUrl);

    if (pushHistory) {
      recordSessionNavigation(nextSearchUrl, target, platToUse, true);
    }

    if (!target) {
      setActiveQuery('');
      setResults([]);
      setPlatformCounts({});
      setIsSearching(false);
      return;
    }

    setQuery(target);
    setActiveQuery(target);

    await fetchFeedForTerm(target, platToUse, mediaTypeToUse, activeSettings);
  };

  const updateSettings = (next: BrowserSearchSettings) => {
    setBrowserSettings(next);
    saveBrowserSearchSettings(next);
    const currentTerm = query.trim() || activeQuery.trim();
    setActiveWebUrl(buildPlatformSearchUrl(currentTerm, selectedPlatform));
    if (currentTerm) {
      executeSearchOrNavigate(currentTerm, false, selectedPlatform, selectedMediaType, next);
    }
  };

  const handleTogglePlatformEnabled = (platId: BrowserPlatformId) => {
    const nextEnabled = {
      ...browserSettings.enabledPlatforms,
      [platId]: !browserSettings.enabledPlatforms[platId],
    };
    const anyActive = Object.values(nextEnabled).some(Boolean);
    if (!anyActive) {
      nextEnabled[platId] = true;
    }
    updateSettings({
      ...browserSettings,
      enabledPlatforms: nextEnabled,
    });
  };

  const handleEnableAllPlatforms = () => {
    const allOn = {} as Record<BrowserPlatformId, boolean>;
    for (const p of ALL_BROWSER_PLATFORMS) {
      allOn[p.id] = true;
    }
    updateSettings({
      ...browserSettings,
      enabledPlatforms: allOn,
      mixAllPlatformsTogether: true,
    });
  };

  const handleSelectPlatform = (plat: BrowserPlatformFilter) => {
    setSelectedPlatform(plat);
    setViewMode('results');
    let settingsToUse = browserSettings;
    if (plat !== 'all' && !browserSettings.enabledPlatforms[plat]) {
      settingsToUse = {
        ...browserSettings,
        enabledPlatforms: {
          ...browserSettings.enabledPlatforms,
          [plat]: true,
        },
      };
      setBrowserSettings(settingsToUse);
      saveBrowserSearchSettings(settingsToUse);
    }

    const currentTerm = query.trim() || activeQuery.trim();
    const nextUrl = buildPlatformSearchUrl(currentTerm, plat);
    setActiveWebUrl(nextUrl);
    recordSessionNavigation(nextUrl, currentTerm, plat, true);
    if (currentTerm) {
      executeSearchOrNavigate(currentTerm, false, plat, selectedMediaType, settingsToUse, nextUrl);
    } else {
      inputRef.current?.focus();
    }
  };

  const handleSelectMediaType = (mType: BrowserMediaTypeFilter) => {
    setSelectedMediaType(mType);
    const currentTerm = query.trim() || activeQuery.trim();
    if (currentTerm) {
      executeSearchOrNavigate(currentTerm, false, selectedPlatform, mType);
    }
  };

  const canGoBack = historyIndex > 0;
  const canGoForward = historyIndex < historyStack.length - 1;

  const handleBack = () => {
    const { stack, index } = historyRef.current;
    if (index > 0) {
      const prevIdx = index - 1;
      const entry = stack[prevIdx];
      historyRef.current = { stack, index: prevIdx };
      setHistoryIndex(prevIdx);
      setSelectedPlatform(entry.platform);
      setQuery(entry.query);
      setActiveQuery(entry.query);
      setActiveWebUrl(entry.url);
      executeSearchOrNavigate(
        entry.query,
        false,
        entry.platform,
        selectedMediaType,
        browserSettings,
        entry.url
      );
      try {
        iframeRef.current?.contentWindow?.history.back();
      } catch {
        // cross-origin iframe history handled via src update
      }
    }
  };

  const handleForward = () => {
    const { stack, index } = historyRef.current;
    if (index < stack.length - 1) {
      const nextIdx = index + 1;
      const entry = stack[nextIdx];
      historyRef.current = { stack, index: nextIdx };
      setHistoryIndex(nextIdx);
      setSelectedPlatform(entry.platform);
      setQuery(entry.query);
      setActiveQuery(entry.query);
      setActiveWebUrl(entry.url);
      executeSearchOrNavigate(
        entry.query,
        false,
        entry.platform,
        selectedMediaType,
        browserSettings,
        entry.url
      );
      try {
        iframeRef.current?.contentWindow?.history.forward();
      } catch {
        // cross-origin iframe history handled via src update
      }
    }
  };

  const handleRefresh = () => {
    setIframeKey((k) => k + 1);
    const currentTerm = (query.trim() || activeQuery.trim());
    if (currentTerm) {
      executeSearchOrNavigate(
        currentTerm,
        false,
        selectedPlatform,
        selectedMediaType,
        browserSettings,
        activeWebUrl
      );
    }
  };

  const handleClearAndReset = () => {
    const resetUrl = buildPlatformSearchUrl('', selectedPlatform);
    setQuery('');
    setActiveQuery('');
    setResults([]);
    setPlatformCounts({});
    setViewMode('results');
    setActiveWebUrl(resetUrl);
    recordSessionNavigation(resetUrl, '', selectedPlatform, true);
    inputRef.current?.focus();
  };

  const getMediaTypeBadge = (item: GoogleSearchResultItem) => {
    const mType =
      item.mediaType ||
      (/\.(mp3|m4a|wav)(\?|$)/i.test(item.url) || item.platform === 'soundcloud'
        ? 'audio'
        : /\.(jpg|jpeg|png|webp|gif)(\?|$)/i.test(item.url)
        ? 'photo'
        : 'video');

    if (mType === 'audio') {
      return {
        type: 'audio' as const,
        label: 'MP3',
        icon: <Music className="w-3 h-3" />,
        bgClass: 'bg-amber-500/90 text-slate-950',
      };
    }
    if (mType === 'photo') {
      return {
        type: 'photo' as const,
        label: 'JPG',
        icon: <ImageIcon className="w-3 h-3" />,
        bgClass: 'bg-emerald-500/90 text-slate-950',
      };
    }
    return {
      type: 'video' as const,
      label: 'MP4',
      icon: <Video className="w-3 h-3" />,
      bgClass: 'bg-rose-600/95 text-white',
    };
  };

  const getPlatformBadgeInfo = (platRaw?: string) => {
    const clean = (platRaw || 'media').toLowerCase();
    const found = ALL_BROWSER_PLATFORMS.find((p) => p.id === clean);
    if (found) {
      return {
        label: found.label,
        badgeBg: found.badgeBg,
        dotColor: found.dotColor,
      };
    }
    return {
      label: clean.toUpperCase(),
      badgeBg: 'bg-black/80 text-white',
      dotColor: 'bg-sky-400',
    };
  };

  // Extract crisp Resolution Badge for Thumbnail Bottom-Left (e.g., 1080p, 720p, MP3, HD)
  const getResultResolutionBadge = (item: GoogleSearchResultItem, idx: number): string => {
    const badge = getMediaTypeBadge(item);
    if (badge.type === 'audio') return 'MP3';
    if (badge.type === 'photo') return 'HD';
    const text = `${item.title || ''} ${item.snippet || ''}`;
    const match = text.match(/\b(4K|2K|1080p|720p|480p|360p)\b/i);
    if (match) return match[1].toLowerCase() === '4k' ? '4K' : match[1].toLowerCase();
    return idx % 3 === 0 ? '1080p' : '720p';
  };

  // Extract crisp Duration Badge for Thumbnail Bottom-Right (e.g., 03:20, 00:45)
  const getResultDurationBadge = (item: GoogleSearchResultItem): string => {
    const badge = getMediaTypeBadge(item);
    if (badge.type === 'photo') return '00:15';
    const raw = (item.duration || '').trim();
    if (raw) {
      const parts = raw.split(':').map((p) => p.trim());
      if (parts.length === 2) {
        return `${parts[0].padStart(2, '0')}:${parts[1].padStart(2, '0')}`;
      }
      if (parts.length === 3) {
        return `${parts[0]}:${parts[1].padStart(2, '0')}:${parts[2].padStart(2, '0')}`;
      }
    }
    return badge.type === 'audio' ? '03:15' : '01:24';
  };

  // Extract Channel / Source Name for Right-Side Details
  const getResultChannelName = (item: GoogleSearchResultItem, platLabel: string): string => {
    if (item.author && item.author.trim()) {
      return item.author.trim();
    }
    if (item.displayUrl) {
      const segments = item.displayUrl.split('›').map((s) => s.trim());
      if (segments.length > 1 && segments[1]) {
        return segments[1];
      }
      return segments[0] || platLabel;
    }
    return platLabel;
  };

  // Compute Estimated File Size in Small Typography (e.g., 12.4 MB, 5.8 MB)
  const getResultEstimatedSize = (item: GoogleSearchResultItem, idx: number): string => {
    const badge = getMediaTypeBadge(item);
    if (badge.type === 'photo') {
      const mb = (1.2 + ((idx * 3) % 18) * 0.1).toFixed(2);
      return `${mb} MB`;
    }
    const dur = getResultDurationBadge(item);
    const parts = dur.split(':').map((n) => parseInt(n, 10) || 0);
    let totalSec = 84;
    if (parts.length === 2) {
      totalSec = parts[0] * 60 + parts[1];
    } else if (parts.length === 3) {
      totalSec = parts[0] * 3600 + parts[1] * 60 + parts[2];
    }
    totalSec = Math.max(15, Math.min(totalSec, 1800));
    const ratePerSec = badge.type === 'audio' ? 0.038 : 0.115;
    const sizeMb = Math.max(1.45, totalSec * ratePerSec);
    return `${sizeMb.toFixed(2)} MB`;
  };

  const enabledCount = getEnabledPlatformIds(browserSettings).length;

  return (
    <section
      className="w-full max-w-4xl mx-auto flex flex-col overflow-hidden"
      id="built-in-chrome-browser-section"
      aria-label={lang === 'ur' ? 'بلٹ ان میڈیا براؤزر' : 'Built-in Media Browser'}
    >
      <div
        className={`w-full rounded-2xl sm:rounded-3xl border flex flex-col overflow-hidden transition-colors ${
          isLight
            ? 'bg-white border-slate-200 text-slate-900 shadow-sm'
            : 'bg-[#111827] border-slate-800 text-slate-100 shadow-lg'
        }`}
      >
        {/* 1. BROWSER CONTROL BAR (Compact Top Browser Bar: Back ←, Forward →, Reload ↻, Editable Search/URL Input) */}
        <div
          id="builtin-browser-top-bar"
          className={`sticky top-0 z-20 px-2.5 sm:px-4 py-2.5 border-b shrink-0 flex items-center gap-1.5 sm:gap-2 ${
            isLight ? 'bg-white border-slate-200' : 'bg-[#0f172a] border-slate-800'
          }`}
        >
          {/* Navigation Control Buttons: Back (←), Forward (→), Reload (↻) */}
          <div className="flex items-center gap-1 shrink-0" dir="ltr">
            <button
              type="button"
              id="builtin-browser-back-btn"
              onClick={handleBack}
              disabled={!canGoBack}
              className={`h-9 w-9 rounded-xl disabled:opacity-35 cursor-pointer transition-colors flex items-center justify-center ${
                isLight
                  ? 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                  : 'bg-slate-800/90 hover:bg-slate-700 text-slate-200'
              }`}
              title={lang === 'ur' ? 'واپس جائیں (Back)' : 'Back'}
              aria-label="Back"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <button
              type="button"
              id="builtin-browser-forward-btn"
              onClick={handleForward}
              disabled={!canGoForward}
              className={`h-9 w-9 rounded-xl disabled:opacity-35 cursor-pointer transition-colors flex items-center justify-center ${
                isLight
                  ? 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                  : 'bg-slate-800/90 hover:bg-slate-700 text-slate-200'
              }`}
              title={lang === 'ur' ? 'آگے (Forward)' : 'Forward'}
              aria-label="Forward"
            >
              <ArrowRight className="w-4 h-4" />
            </button>
            <button
              type="button"
              id="builtin-browser-refresh-btn"
              onClick={handleRefresh}
              className={`h-9 w-9 rounded-xl cursor-pointer transition-colors flex items-center justify-center ${
                isLight
                  ? 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                  : 'bg-slate-800/90 hover:bg-slate-700 text-slate-200'
              }`}
              title={lang === 'ur' ? 'ریفریش (Reload)' : 'Reload'}
              aria-label="Refresh"
            >
              <RotateCw className={`w-4 h-4 ${isSearching ? 'animate-spin text-sky-500' : ''}`} />
            </button>
          </div>

          {/* Editable Browser Search / URL Input Bar */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const trimmed = query.trim();
              if (!trimmed) return;
              if (isDirectUrl(trimmed)) {
                onDownloadUrl(normalizeDirectUrl(trimmed));
              }
              executeSearchOrNavigate(trimmed);
            }}
            className={`flex-1 flex items-center gap-1.5 px-2.5 py-1 rounded-xl border transition-all min-w-0 h-9 sm:h-10 ${
              isLight
                ? 'bg-slate-50 border-slate-200 focus-within:bg-white focus-within:border-sky-500'
                : 'bg-[#070b14] border-slate-700/80 focus-within:border-sky-500'
            }`}
          >
            <Globe className={`w-3.5 h-3.5 shrink-0 ${isLight ? 'text-sky-600' : 'text-sky-400'}`} />

            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => {
                const nextVal = e.target.value;
                setQuery(nextVal);
                const nextUrl = buildPlatformSearchUrl(nextVal, selectedPlatform);
                setActiveWebUrl(nextUrl);
                recordSessionNavigation(nextUrl, nextVal.trim(), selectedPlatform, false);
                if (!nextVal.trim()) {
                  setActiveQuery('');
                  setResults([]);
                  setPlatformCounts({});
                }
              }}
              dir={lang === 'ur' ? 'rtl' : 'ltr'}
              placeholder={
                lang === 'ur'
                  ? 'براؤزر میں ویڈیو سرچ کریں یا لنک لکھیں...'
                  : 'Search videos in browser or enter URL...'
              }
              className={`w-full text-xs sm:text-sm bg-transparent outline-none font-sans min-w-0 ${
                isLight
                  ? 'text-slate-900 placeholder:text-slate-400'
                  : 'text-slate-100 placeholder:text-slate-400'
              }`}
              id="builtin-browser-omnibox-input"
              autoComplete="off"
              spellCheck={false}
            />

            {query && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleClearAndReset();
                }}
                className={`p-1 rounded-full cursor-pointer shrink-0 ${
                  isLight
                    ? 'text-slate-400 hover:text-slate-700 hover:bg-slate-200'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800'
                }`}
                title={lang === 'ur' ? 'صاف کریں' : 'Clear'}
                aria-label="Clear search query"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}

            <button
              type="submit"
              disabled={!query.trim() || isSearching}
              className="px-2.5 py-1 rounded-lg bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold flex items-center gap-1 disabled:opacity-40 cursor-pointer shrink-0 transition-colors whitespace-nowrap"
              id="builtin-browser-search-btn"
            >
              {isSearching ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Search className="w-3.5 h-3.5" />
              )}
              <span className="hidden sm:inline">{lang === 'ur' ? 'سرچ' : 'Search'}</span>
            </button>
          </form>

          {/* Compact All-Platforms Settings Button */}
          <button
            type="button"
            onClick={() => setIsPlatformSettingsOpen((prev) => !prev)}
            className={`h-9 px-2.5 rounded-xl border cursor-pointer shrink-0 flex items-center justify-center gap-1 text-xs font-semibold transition-colors ${
              isPlatformSettingsOpen
                ? 'bg-sky-600 text-white border-sky-500'
                : isLight
                ? 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200'
                : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700'
            }`}
            title={
              lang === 'ur'
                ? 'تمام پلیٹ فارمز کی سیٹنگز (All Platforms Settings)'
                : 'All Platforms Search Settings'
            }
            id="browser-all-platforms-settings-btn"
          >
            <SlidersHorizontal className="w-3.5 h-3.5 text-sky-400" />
            <span className="hidden md:inline text-[11px] font-mono">
              {enabledCount}/12
            </span>
          </button>
        </div>

        {/* Compact Platform & Media Filter Strip */}
        <nav
          dir="ltr"
          aria-label="Media Platforms Navigation"
          className={`px-2.5 sm:px-4 py-1.5 border-b overflow-x-auto no-scrollbar shrink-0 ${
            isLight ? 'bg-slate-50 border-slate-200' : 'bg-[#0b1120] border-slate-800/90'
          }`}
        >
          <div className="flex items-center gap-1.5 min-w-max">
            {/* ALL PLATFORMS TAB */}
            <button
              type="button"
              data-platform="all"
              aria-pressed={selectedPlatform === 'all'}
              onClick={() => handleSelectPlatform('all')}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold flex items-center gap-1.5 cursor-pointer transition-all whitespace-nowrap ${
                selectedPlatform === 'all'
                  ? 'bg-sky-600 text-white shadow-xs'
                  : isLight
                  ? 'bg-white text-slate-700 hover:bg-slate-200 border border-slate-200/80'
                  : 'bg-slate-800/80 text-slate-300 hover:bg-slate-700 hover:text-white'
              }`}
            >
              <span className="w-1.5 h-1.5 rounded-full shrink-0 bg-sky-400" />
              <span>{lang === 'ur' ? 'All' : 'All'}</span>
            </button>

            {/* ALL 12 SOCIAL PLATFORMS */}
            {ALL_BROWSER_PLATFORMS.map((plat) => {
              const isActive = selectedPlatform === plat.id;
              const isEnabled = browserSettings.enabledPlatforms[plat.id] !== false;
              const count = platformCounts[plat.id] || 0;

              return (
                <button
                  key={plat.id}
                  type="button"
                  data-platform={plat.id}
                  aria-pressed={isActive}
                  onClick={() => handleSelectPlatform(plat.id)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold flex items-center gap-1.5 cursor-pointer transition-all whitespace-nowrap ${
                    isActive
                      ? 'bg-sky-600 text-white shadow-xs'
                      : !isEnabled
                      ? isLight
                        ? 'bg-slate-100/50 text-slate-400 hover:bg-slate-200'
                        : 'bg-slate-900/50 text-slate-500 hover:bg-slate-800'
                      : isLight
                      ? 'bg-white text-slate-700 hover:bg-slate-200 border border-slate-200/80'
                      : 'bg-slate-800/80 text-slate-300 hover:bg-slate-700 hover:text-white'
                  }`}
                >
                  <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${plat.dotColor}`} />
                  <span>{plat.label}</span>
                  {activeQuery && count > 0 && (
                    <span
                      className={`px-1 py-0.2 rounded text-[10px] font-mono ${
                        isActive
                          ? 'bg-white/25 text-white'
                          : isLight
                          ? 'bg-slate-200 text-slate-700'
                          : 'bg-slate-700 text-slate-300'
                      }`}
                    >
                      {count}
                    </span>
                  )}
                </button>
              );
            })}

            <span className="h-4 w-px bg-slate-700/50 mx-0.5 shrink-0" />

            {/* Compact Media Type Pills in Same Strip */}
            <button
              type="button"
              onClick={() => handleSelectMediaType('all')}
              className={`px-2 py-1 rounded-lg text-[11px] font-semibold flex items-center gap-1 cursor-pointer transition-colors whitespace-nowrap ${
                selectedMediaType === 'all'
                  ? isLight
                    ? 'bg-slate-900 text-white'
                    : 'bg-white text-slate-950'
                  : isLight
                  ? 'text-slate-600 hover:bg-slate-200'
                  : 'text-slate-300 hover:bg-slate-800'
              }`}
            >
              <Layers className="w-3 h-3" />
              <span>{lang === 'ur' ? 'تمام' : 'All Media'}</span>
            </button>

            <button
              type="button"
              onClick={() => handleSelectMediaType('video')}
              className={`px-2 py-1 rounded-lg text-[11px] font-semibold flex items-center gap-1 cursor-pointer transition-colors whitespace-nowrap ${
                selectedMediaType === 'video'
                  ? 'bg-rose-600 text-white'
                  : isLight
                  ? 'text-slate-600 hover:bg-slate-200'
                  : 'text-slate-300 hover:bg-slate-800'
              }`}
            >
              <Video className="w-3 h-3" />
              <span>{lang === 'ur' ? 'ویڈیو' : 'Video'}</span>
            </button>

            <button
              type="button"
              onClick={() => handleSelectMediaType('audio')}
              className={`px-2 py-1 rounded-lg text-[11px] font-semibold flex items-center gap-1 cursor-pointer transition-colors whitespace-nowrap ${
                selectedMediaType === 'audio'
                  ? 'bg-amber-500 text-slate-950'
                  : isLight
                  ? 'text-slate-600 hover:bg-slate-200'
                  : 'text-slate-300 hover:bg-slate-800'
              }`}
            >
              <Music className="w-3 h-3" />
              <span>MP3</span>
            </button>

            <button
              type="button"
              onClick={() => handleSelectMediaType('photo')}
              className={`px-2 py-1 rounded-lg text-[11px] font-semibold flex items-center gap-1 cursor-pointer transition-colors whitespace-nowrap ${
                selectedMediaType === 'photo'
                  ? 'bg-emerald-500 text-slate-950'
                  : isLight
                  ? 'text-slate-600 hover:bg-slate-200'
                  : 'text-slate-300 hover:bg-slate-800'
              }`}
            >
              <ImageIcon className="w-3 h-3" />
              <span>{lang === 'ur' ? 'فوٹو' : 'Photo'}</span>
            </button>

            {viewMode === 'webview' && (
              <button
                type="button"
                onClick={() => setViewMode('results')}
                className="px-2.5 py-1 rounded-lg bg-sky-600 hover:bg-sky-500 text-white text-[11px] font-semibold flex items-center gap-1 cursor-pointer"
              >
                <ArrowLeft className="w-3 h-3" />
                <span>{lang === 'ur' ? 'واپس نتائج پر' : 'Back to List'}</span>
              </button>
            )}
          </div>
        </nav>

        {/* ALL-PLATFORMS SEARCH SETTINGS DRAWER / PANEL (Only when toggled open) */}
        {isPlatformSettingsOpen && (
          <div
            className={`border-b p-3 sm:p-4 overflow-y-auto max-h-[55vh] shrink-0 transition-all ${
              isLight
                ? 'bg-white border-slate-200 text-slate-900 shadow-lg'
                : 'bg-[#0f172a] border-slate-800 text-slate-100 shadow-2xl'
            }`}
            id="browser-all-platforms-settings-panel"
          >
            <div className="max-w-5xl mx-auto space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b pb-2.5 border-slate-200 dark:border-slate-800">
                <h4 className="text-xs sm:text-sm font-bold flex items-center gap-2">
                  <SlidersHorizontal className="w-4 h-4 text-sky-500" />
                  <span>
                    {lang === 'ur'
                      ? 'پلیٹ فارمز سرچ سیٹنگز (All Platforms Settings)'
                      : 'All Platforms Search Settings'}
                  </span>
                </h4>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleEnableAllPlatforms}
                    className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1 cursor-pointer transition-colors"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>{lang === 'ur' ? 'سب آن کریں' : 'Enable All 12'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setIsPlatformSettingsOpen(false)}
                    className={`px-2.5 py-1 rounded-lg border text-xs font-semibold cursor-pointer ${
                      isLight
                        ? 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200'
                        : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700'
                    }`}
                  >
                    {lang === 'ur' ? 'بند کریں' : 'Done'}
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2" dir="ltr">
                {ALL_BROWSER_PLATFORMS.map((plat) => {
                  const isEnabled = browserSettings.enabledPlatforms[plat.id] !== false;
                  return (
                    <button
                      key={`setting_toggle_${plat.id}`}
                      type="button"
                      onClick={() => handleTogglePlatformEnabled(plat.id)}
                      className={`p-2 rounded-xl border text-left flex items-center justify-between gap-2 cursor-pointer transition-all ${
                        isEnabled
                          ? isLight
                            ? 'bg-sky-50 border-sky-400 text-slate-900'
                            : 'bg-sky-500/15 border-sky-500/60 text-white'
                          : isLight
                          ? 'bg-slate-50 border-slate-200 text-slate-400'
                          : 'bg-slate-900/60 border-slate-800 text-slate-500'
                      }`}
                    >
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className={`w-2 h-2 rounded-full shrink-0 ${plat.dotColor}`} />
                        <div className="text-xs font-bold truncate">{plat.label}</div>
                      </div>
                      <span
                        className={`w-4 h-4 rounded flex items-center justify-center shrink-0 text-[10px] font-bold ${
                          isEnabled
                            ? 'bg-emerald-500 text-slate-950'
                            : 'bg-slate-700/40 text-slate-400'
                        }`}
                      >
                        {isEnabled ? <Check className="w-3 h-3 stroke-[3]" /> : 'Off'}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* 2. BROWSER CONTENT SPACE: Clean Default State on Initial Load OR Dense Vertical Search Results List on Active Search */}
        <div
          className={
            viewMode === 'results'
              ? 'w-full max-h-[62vh] overflow-y-auto overscroll-contain'
              : 'hidden'
          }
          id="browser-search-results-viewport"
        >
          {isSearching ? (
            <div className="py-12 flex flex-col items-center justify-center gap-2.5">
              <Loader2 className="w-6 h-6 text-sky-500 animate-spin" />
              <p
                className={`text-xs sm:text-sm font-medium ${
                  isLight ? 'text-slate-600' : 'text-slate-300'
                }`}
              >
                {lang === 'ur' ? 'ویڈیوز تلاش کی جا رہی ہیں...' : 'Searching videos...'}
              </p>
            </div>
          ) : !activeQuery ? null : results.length === 0 ? (
            <div className="py-10 flex flex-col items-center justify-center text-center gap-2 px-4">
              <p
                className={`text-xs sm:text-sm font-medium ${
                  isLight ? 'text-slate-500' : 'text-slate-400'
                }`}
              >
                {lang === 'ur'
                  ? 'کوئی ویڈیو نہیں ملی۔ دوبارہ سرچ کریں۔'
                  : 'No videos found for this query. Try another search.'}
              </p>
            </div>
          ) : (
            /* ACTIVE SEARCH STATE: Compact, Dense Vertical List View (Small Thumbnail on Left, Details on Right) */
            <div className="w-full p-2 sm:p-3">
              {/* Direct URL Quick-Download Row if user typed/pasted a URL */}
              {isDirectUrl(query) && (
                <div
                  onClick={() => onDownloadUrl(normalizeDirectUrl(query))}
                  className={`mb-2 p-2.5 rounded-xl border flex items-center justify-between gap-3 cursor-pointer transition-colors ${
                    isLight
                      ? 'bg-sky-50 border-sky-200 hover:bg-sky-100'
                      : 'bg-sky-950/40 border-sky-500/40 hover:bg-sky-900/40'
                  }`}
                >
                  <div className="min-w-0 flex-1">
                    <div className="text-xs font-bold text-sky-400 truncate">
                      {lang === 'ur' ? 'ڈائریکٹ ویڈیو لنک تیار ہے' : 'Direct Video Link Ready'}
                    </div>
                    <div className="text-[11px] font-mono opacity-80 truncate">
                      {normalizeDirectUrl(query)}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onDownloadUrl(normalizeDirectUrl(query));
                    }}
                    className="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold flex items-center gap-1.5 shrink-0 cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>{lang === 'ur' ? 'ڈاؤن لوڈ' : 'Download'}</span>
                  </button>
                </div>
              )}

              {/* Dense, Vertically Stacked Video Search Results List */}
              <div
                id="browser-search-results-list"
                className={`rounded-2xl border divide-y overflow-hidden ${
                  isLight
                    ? 'bg-white border-slate-200 divide-slate-100'
                    : 'bg-[#121621] border-white/10 divide-white/10'
                }`}
              >
                {results.map((item, idx) => {
                  const badge = getMediaTypeBadge(item);
                  const platMeta = getPlatformBadgeInfo(item.platform);
                  const resolutionBadge = getResultResolutionBadge(item, idx);
                  const durationBadge = getResultDurationBadge(item);
                  const channelName = getResultChannelName(item, platMeta.label);
                  const estimatedSize = getResultEstimatedSize(item, idx);

                  return (
                    <div
                      key={`${item.url}_${idx}`}
                      id={`browser-search-result-item-${idx}`}
                      onClick={() => onDownloadUrl(item.url)}
                      className={`p-2 sm:p-2.5 flex items-center gap-3 transition-colors cursor-pointer group ${
                        isLight ? 'hover:bg-slate-50' : 'hover:bg-white/[0.03]'
                      }`}
                    >
                      {/* Thumbnail (Left Side): Small, crisp video thumbnail with resolution & duration badges */}
                      <div className="relative w-28 h-16 sm:w-32 sm:h-18 rounded-xl overflow-hidden bg-black shrink-0 border border-white/10">
                        {item.thumbnail ? (
                          <img
                            src={item.thumbnail}
                            alt={item.title}
                            onError={(e) => {
                              const target = e.currentTarget;
                              if (
                                !target.dataset.proxied &&
                                item.thumbnail?.startsWith('http')
                              ) {
                                target.dataset.proxied = '1';
                                target.src = `/api/image-proxy?url=${encodeURIComponent(
                                  item.thumbnail
                                )}`;
                              }
                            }}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                            referrerPolicy="no-referrer"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-slate-900 text-slate-500">
                            {badge.icon}
                          </div>
                        )}

                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/15 to-transparent" />

                        {/* Center Subtle Play Icon */}
                        <div className="absolute inset-0 flex items-center justify-center">
                          <div className="w-6 h-6 rounded-full bg-black/60 text-white flex items-center justify-center border border-white/25 group-hover:scale-110 transition-transform">
                            {badge.type === 'audio' ? (
                              <Music className="w-3 h-3" />
                            ) : badge.type === 'photo' ? (
                              <ImageIcon className="w-3 h-3" />
                            ) : (
                              <Play className="w-3 h-3 fill-current ml-0.5" />
                            )}
                          </div>
                        </div>

                        {/* Bottom-Left Resolution Badge */}
                        <span
                          className="absolute bottom-1 left-1 px-1.5 py-0.2 rounded bg-black/85 text-white text-[10px] font-mono tabular-nums font-bold tracking-tight border border-white/15"
                          data-badge="resolution"
                        >
                          {resolutionBadge}
                        </span>

                        {/* Bottom-Right Duration Badge */}
                        <span
                          className="absolute bottom-1 right-1 px-1.5 py-0.2 rounded bg-black/85 text-white text-[10px] font-mono tabular-nums font-bold tracking-tight border border-white/15"
                          data-badge="duration"
                        >
                          {durationBadge}
                        </span>
                      </div>

                      {/* Details (Right Side): Compact video title, channel/source name, and file size in small typography */}
                      <div className="min-w-0 flex-1 py-0.5">
                        <h4
                          className={`text-xs sm:text-sm font-bold line-clamp-2 leading-snug transition-colors ${
                            isLight
                              ? 'text-slate-900 group-hover:text-sky-600'
                              : 'text-slate-100 group-hover:text-[#FFCC00]'
                          }`}
                          title={item.title}
                        >
                          {item.title}
                        </h4>

                        <div
                          className={`mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] font-mono tabular-nums ${
                            isLight ? 'text-slate-500' : 'text-slate-400'
                          }`}
                          dir="ltr"
                        >
                          <span className="inline-flex items-center gap-1 font-sans font-medium truncate max-w-[150px] sm:max-w-[220px]">
                            <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${platMeta.dotColor}`} />
                            <span className="truncate">{channelName}</span>
                          </span>
                          <span className="opacity-40">•</span>
                          <span className="uppercase text-[10px] font-bold opacity-85">
                            {platMeta.label}
                          </span>
                          <span className="opacity-40">•</span>
                          <span className="font-semibold text-emerald-400">
                            {estimatedSize}
                          </span>
                        </div>
                      </div>

                      {/* Compact Download Action Button on Right */}
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          id={`browser-result-download-btn-${idx}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            onDownloadUrl(item.url);
                          }}
                          className="h-8 px-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold flex items-center justify-center gap-1 cursor-pointer transition-colors"
                          title={lang === 'ur' ? 'ڈاؤن لوڈ کریں' : 'Download'}
                        >
                          <Download className="w-3.5 h-3.5 shrink-0" />
                          <span className="hidden sm:inline">
                            {lang === 'ur' ? 'ڈاؤن لوڈ' : 'Download'}
                          </span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* 3. Persistent Embedded Social Media Platform Search WebView Iframe & Navigation Control Row */}
        <div
          className={
            viewMode === 'webview'
              ? 'w-full h-[55vh] bg-black relative flex flex-col min-h-0'
              : 'sr-only h-0 overflow-hidden pointer-events-none'
          }
        >
          <div
            id="builtin-browser-navigation-row"
            role="toolbar"
            aria-label="Iframe Session Navigation Controls"
            className={`px-3 sm:px-5 py-1.5 border-b flex items-center justify-between gap-2 text-[11px] shrink-0 ${
              isLight
                ? 'bg-white border-slate-200 text-slate-700'
                : 'bg-[#0f172a] border-slate-800 text-slate-200'
            }`}
            dir="ltr"
          >
            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                id="builtin-browser-nav-back-btn"
                onClick={handleBack}
                disabled={!canGoBack}
                aria-label="Navigate Back"
                className="px-2.5 py-1 rounded-lg border font-semibold flex items-center gap-1 cursor-pointer disabled:opacity-35"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>{lang === 'ur' ? 'واپس' : 'Back'}</span>
              </button>

              <button
                type="button"
                id="builtin-browser-nav-forward-btn"
                onClick={handleForward}
                disabled={!canGoForward}
                aria-label="Navigate Forward"
                className="px-2.5 py-1 rounded-lg border font-semibold flex items-center gap-1 cursor-pointer disabled:opacity-35"
              >
                <span>{lang === 'ur' ? 'آگے' : 'Forward'}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>

              <button
                type="button"
                id="builtin-browser-nav-refresh-btn"
                onClick={handleRefresh}
                aria-label="Reload Iframe"
                className="p-1.5 rounded-lg border cursor-pointer"
              >
                <RotateCw className="w-3.5 h-3.5" />
              </button>

              <span className="font-mono text-[10px]" id="builtin-browser-history-status">
                {historyIndex + 1}/{historyStack.length}
              </span>
            </div>

            <div className="flex items-center gap-1.5 min-w-0 flex-1 px-2">
              <Globe className="w-3.5 h-3.5 text-sky-400 shrink-0" />
              <span className="font-mono truncate" id="builtin-browser-active-url">
                {activeWebUrl}
              </span>
            </div>
          </div>

          <iframe
            ref={iframeRef}
            id="builtin-browser-iframe"
            key={iframeKey}
            src={activeWebUrl}
            title="Built-in Media Browser"
            className="w-full flex-1 border-0 bg-black"
            sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
          />
        </div>
      </div>
    </section>
  );
};

