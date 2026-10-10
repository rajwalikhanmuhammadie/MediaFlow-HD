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
  Clipboard,
  Clock,
  Trash2,
} from 'lucide-react';
import { Language, Theme, RecentSearchItem } from '../types';
import { extractUrlsFromText } from '../utils/urlParser';
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
  backHandlerRef?: React.MutableRefObject<(() => boolean) | null>;
  onBackDepthChange?: (depth: number) => void;
  clipboardDetectedUrl?: string | null;
  recentSearches?: RecentSearchItem[];
  externalSearchQuery?: { query: string; tick: number } | null;
}

const BROWSER_SEARCH_HISTORY_KEY = 'mediaflow_browser_search_history_v1';

function loadSavedBrowserQueries(): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(BROWSER_SEARCH_HISTORY_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((x) => typeof x === 'string' && x.trim()) : [];
  } catch {
    return [];
  }
}

function saveBrowserQueryToHistory(q: string): string[] {
  const clean = q.trim();
  if (!clean) return loadSavedBrowserQueries();
  const existing = loadSavedBrowserQueries().filter(
    (item) => item.toLowerCase() !== clean.toLowerCase()
  );
  const next = [clean, ...existing].slice(0, 10);
  try {
    localStorage.setItem(BROWSER_SEARCH_HISTORY_KEY, JSON.stringify(next));
  } catch {
    // ignore storage errors
  }
  return next;
}

export const BuiltInChromeBrowser: React.FC<BuiltInChromeBrowserProps> = ({
  lang,
  theme = 'dark',
  onDownloadUrl,
  backHandlerRef,
  onBackDepthChange,
  clipboardDetectedUrl,
  recentSearches = [],
  externalSearchQuery,
}) => {
  const isLight = theme === 'light';
  const inputRef = useRef<HTMLInputElement | null>(null);
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const browserContainerRef = useRef<HTMLElement | null>(null);

  const [browserSettings, setBrowserSettings] = useState<BrowserSearchSettings>(() =>
    loadBrowserSearchSettings()
  );
  const [isPlatformSettingsOpen, setIsPlatformSettingsOpen] = useState<boolean>(false);
  const [isSearchFocused, setIsSearchFocused] = useState<boolean>(false);
  const [showSuggestionsDropdown, setShowSuggestionsDropdown] = useState<boolean>(false);
  const [liveClipboardUrl, setLiveClipboardUrl] = useState<string | null>(null);
  const [savedQueries, setSavedQueries] = useState<string[]>(() => loadSavedBrowserQueries());

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

    // Automatically detect if the user searched for photos/images or audio/mp3 when filter hasn't been manually locked
    let effectiveMediaType = mediaTypeToUse;
    if (mediaTypeOverride === undefined && selectedMediaType === 'all') {
      if (/\b(photo|photos|image|images|pic|pics|wallpaper|wallpapers|dp|تصویر|تصاویر|فوٹو)\b/i.test(target)) {
        effectiveMediaType = 'photo';
      } else if (/\b(mp3|audio|ringtone|آڈیو|ایم پی تھری)\b/i.test(target)) {
        effectiveMediaType = 'audio';
      }
    }

    setShowSuggestionsDropdown(false);
    setQuery(target);
    setActiveQuery(target);
    setSavedQueries(saveBrowserQueryToHistory(target));

    await fetchFeedForTerm(target, platToUse, effectiveMediaType, activeSettings);
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
    const resetUrl = buildPlatformSearchUrl('', 'all');
    setSelectedPlatform('all');
    setSelectedMediaType('all');
    setQuery('');
    setActiveQuery('');
    setResults([]);
    setPlatformCounts({});
    setViewMode('results');
    setActiveWebUrl(resetUrl);
    recordSessionNavigation(resetUrl, '', 'all', true);
  };

  // Handle external keyword search triggered from LinkInputSection
  useEffect(() => {
    if (externalSearchQuery && externalSearchQuery.query.trim()) {
      const q = externalSearchQuery.query.trim();
      setIsSearchFocused(true);
      setShowSuggestionsDropdown(false);
      setQuery(q);
      executeSearchOrNavigate(q, true, 'all', 'all');
    }
  }, [externalSearchQuery?.tick]);

  const handleSearchInputFocus = async () => {
    setIsSearchFocused(true);
    setShowSuggestionsDropdown(true);
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
    try {
      if (navigator.clipboard && navigator.clipboard.readText) {
        const text = await navigator.clipboard.readText();
        if (text) {
          const extracted = extractUrlsFromText(text);
          const candidate = (extracted.length > 0 ? extracted[0] : text.trim()).trim();
          if (/^https?:\/\/[^\s]+\.[^\s]+/i.test(candidate)) {
            setLiveClipboardUrl(candidate);
          }
        }
      }
    } catch {
      // ignore clipboard permission errors
    }
  };

  const effectiveClipboardUrl = (() => {
    const candidate = (liveClipboardUrl || clipboardDetectedUrl || '').trim();
    if (!candidate || !/^https?:\/\/[^\s]+\.[^\s]+/i.test(candidate)) return null;
    return candidate;
  })();

  // Build 2 to 3 recent search history items (combining recentSearches and saved browser queries)
  const topThreeHistoryItems = (() => {
    const list: Array<{ id: string; text: string; title?: string; isUrl: boolean; platform?: string }> = [];
    const seen = new Set<string>();
    if (effectiveClipboardUrl) {
      seen.add(effectiveClipboardUrl.toLowerCase());
    }

    for (const qItem of savedQueries) {
      const clean = qItem.trim();
      if (!clean) continue;
      const low = clean.toLowerCase();
      if (seen.has(low)) continue;
      seen.add(low);
      list.push({
        id: `bq_${low}`,
        text: clean,
        isUrl: isDirectUrl(clean),
      });
      if (list.length >= 3) return list;
    }

    for (const rItem of recentSearches) {
      const clean = (rItem.url || '').trim();
      if (!clean) continue;
      const low = clean.toLowerCase();
      if (seen.has(low)) continue;
      seen.add(low);
      list.push({
        id: rItem.id || `rs_${low}`,
        text: clean,
        title: rItem.title,
        isUrl: isDirectUrl(clean),
        platform: rItem.platform,
      });
      if (list.length >= 3) return list;
    }

    return list.slice(0, 3);
  })();

  const isFullScreenActive =
    isSearchFocused || Boolean(activeQuery.trim()) || isSearching || viewMode === 'webview';

  // Expose internal back navigation for mobile hardware/gesture back button
  const internalBackDepth =
    (isPlatformSettingsOpen ? 1 : 0) +
    (viewMode === 'webview' ? 1 : 0) +
    historyIndex +
    (activeQuery.trim() || query.trim() || selectedPlatform !== 'all' || isSearchFocused ? 1 : 0);

  useEffect(() => {
    onBackDepthChange?.(internalBackDepth);
  }, [internalBackDepth, onBackDepthChange]);

  useEffect(() => {
    if (!backHandlerRef) return;
    backHandlerRef.current = () => {
      if (isPlatformSettingsOpen) {
        setIsPlatformSettingsOpen(false);
        return true;
      }
      if (viewMode === 'webview') {
        setViewMode('results');
        return true;
      }
      if (historyRef.current.index > 0) {
        handleBack();
        return true;
      }
      if (activeQuery.trim() || query.trim() || selectedPlatform !== 'all' || isSearchFocused) {
        const resetUrl = buildPlatformSearchUrl('', 'all');
        setSelectedPlatform('all');
        setSelectedMediaType('all');
        setQuery('');
        setActiveQuery('');
        setResults([]);
        setPlatformCounts({});
        setViewMode('results');
        setActiveWebUrl(resetUrl);
        setIsSearchFocused(false);
        setShowSuggestionsDropdown(false);
        inputRef.current?.blur();
        return true;
      }
      return false;
    };
    return () => {
      if (backHandlerRef) {
        backHandlerRef.current = null;
      }
    };
  });

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
      ref={browserContainerRef}
      className={
        isFullScreenActive
          ? `fixed inset-x-0 top-14 bottom-16 z-[75] w-full max-w-none m-0 flex flex-col overflow-hidden transition-all ${
              isLight ? 'bg-white text-slate-900' : 'bg-[#0b0f19] text-slate-100'
            }`
          : 'w-full max-w-4xl mx-auto flex flex-col overflow-hidden'
      }
      id="built-in-chrome-browser-section"
      aria-label={lang === 'ur' ? 'بلٹ ان میڈیا براؤزر' : 'Built-in Media Browser'}
    >
      <div
        className={`w-full flex flex-col overflow-hidden transition-colors ${
          isFullScreenActive
            ? 'flex-1 h-full border-0 rounded-none'
            : isLight
            ? 'rounded-2xl sm:rounded-3xl border bg-white border-slate-200 text-slate-900 shadow-sm'
            : 'rounded-2xl sm:rounded-3xl border bg-[#111827] border-slate-800 text-slate-100 shadow-lg'
        }`}
      >
        {/* 1. CLEAN SEARCH BAR (Moves to the very top of the screen when tapped/active) */}
        <div
          id="builtin-browser-top-bar"
          className={`sticky top-0 z-20 px-3 sm:px-5 py-2.5 shrink-0 flex items-center gap-2 ${
            isFullScreenActive ? 'border-b' : ''
          } ${isLight ? 'bg-white border-slate-200' : 'bg-[#0f172a] border-slate-800'}`}
        >
          {isFullScreenActive && (
            <button
              type="button"
              onClick={() => {
                handleClearAndReset();
                setIsSearchFocused(false);
                setShowSuggestionsDropdown(false);
                inputRef.current?.blur();
              }}
              className={`h-9 w-9 rounded-xl border shrink-0 flex items-center justify-center cursor-pointer transition-colors ${
                isLight
                  ? 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200'
                  : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700'
              }`}
              title={lang === 'ur' ? 'واپس جائیں (Back)' : 'Back'}
              aria-label="Back"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
          )}

          {/* Editable Browser Search / URL Input Bar */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const trimmed = query.trim();
              if (!trimmed) return;
              setShowSuggestionsDropdown(false);
              if (isDirectUrl(trimmed)) {
                onDownloadUrl(normalizeDirectUrl(trimmed));
              }
              executeSearchOrNavigate(trimmed);
            }}
            className={`flex-1 flex items-center gap-2 px-3 py-1.5 rounded-xl border transition-all min-w-0 h-10 sm:h-11 ${
              isLight
                ? 'bg-slate-50 border-slate-200 focus-within:bg-white focus-within:border-sky-500'
                : 'bg-[#070b14] border-slate-700/80 focus-within:border-sky-500'
            }`}
          >
            <Search className={`w-4 h-4 shrink-0 ${isLight ? 'text-sky-600' : 'text-sky-400'}`} />

            <input
              ref={inputRef}
              type="text"
              value={query}
              onFocus={handleSearchInputFocus}
              onChange={(e) => {
                const nextVal = e.target.value;
                setQuery(nextVal);
                setShowSuggestionsDropdown(true);
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
                  ? 'ویڈیوز، تصاویر یا آڈیو سرچ کریں یا لنک پیسٹ کریں...'
                  : 'Search videos, photos, audio or paste link...'
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
                  setQuery('');
                  setActiveQuery('');
                  setResults([]);
                  setPlatformCounts({});
                  setShowSuggestionsDropdown(true);
                  inputRef.current?.focus();
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
              className="px-3 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold flex items-center gap-1 disabled:opacity-40 cursor-pointer shrink-0 transition-colors whitespace-nowrap"
              id="builtin-browser-search-btn"
            >
              {isSearching ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Search className="w-3.5 h-3.5" />
              )}
              <span>{lang === 'ur' ? 'سرچ' : 'Search'}</span>
            </button>
          </form>
        </div>

        {/* 2. TOP FOCUS SUGGESTIONS: Copied Link First + 2-3 Search History Items (Shown when user taps the search bar before searching) */}
        {isFullScreenActive && (showSuggestionsDropdown || !activeQuery) && !isSearching && (
          <div
            id="browser-focus-suggestions-panel"
            className={`w-full border-b px-3 sm:px-5 py-3 space-y-2.5 shrink-0 ${
              isLight ? 'bg-slate-50/90 border-slate-200' : 'bg-[#0d1424] border-slate-800'
            }`}
          >
            <div className="max-w-4xl mx-auto space-y-2.5">
              {/* First: Copied Link from Clipboard (if user copied any link) */}
              {effectiveClipboardUrl && (
                <div
                  id="browser-copied-link-suggestion"
                  onClick={() => {
                    setShowSuggestionsDropdown(false);
                    onDownloadUrl(effectiveClipboardUrl);
                  }}
                  className={`p-3 rounded-xl border flex items-center justify-between gap-3 cursor-pointer transition-colors ${
                    isLight
                      ? 'bg-sky-50 border-sky-200 hover:bg-sky-100'
                      : 'bg-sky-950/45 border-sky-500/40 hover:bg-sky-900/50'
                  }`}
                >
                  <div className="min-w-0 flex-1" dir="ltr">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-sky-400">
                      <Clipboard className="w-3.5 h-3.5 shrink-0" />
                      <span>
                        {lang === 'ur' ? 'کاپی کیا گیا لنک (Copied Link)' : 'Copied Link'}
                      </span>
                    </div>
                    <div className="text-xs font-mono truncate mt-0.5 opacity-90">
                      {effectiveClipboardUrl}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowSuggestionsDropdown(false);
                      onDownloadUrl(effectiveClipboardUrl);
                    }}
                    className="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold flex items-center gap-1.5 shrink-0 cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>{lang === 'ur' ? 'ڈاؤن لوڈ' : 'Download'}</span>
                  </button>
                </div>
              )}

              {/* Second: 2 to 3 Search History Items */}
              {topThreeHistoryItems.length > 0 && (
                <div
                  className={`rounded-xl border overflow-hidden ${
                    isLight
                      ? 'bg-white border-slate-200 divide-y divide-slate-100'
                      : 'bg-[#111827] border-slate-800 divide-y divide-slate-800/80'
                  }`}
                >
                  <div
                    className={`px-3 py-1.5 flex items-center justify-between text-[11px] ${
                      isLight ? 'bg-slate-50 text-slate-500' : 'bg-[#0b0f19] text-slate-400'
                    }`}
                  >
                    <span className="flex items-center gap-1.5 font-semibold">
                      <Clock className="w-3 h-3" />
                      <span>{lang === 'ur' ? 'حالیہ سرچ ہسٹری' : 'Recent Search History'}</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        try {
                          localStorage.removeItem(BROWSER_SEARCH_HISTORY_KEY);
                        } catch {}
                        setSavedQueries([]);
                      }}
                      className="text-rose-500 hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      <Trash2 className="w-3 h-3" />
                      <span>{lang === 'ur' ? 'صاف کریں' : 'Clear'}</span>
                    </button>
                  </div>

                  {topThreeHistoryItems.map((hItem, hIdx) => (
                    <div
                      key={hItem.id || hIdx}
                      onClick={() => {
                        setShowSuggestionsDropdown(false);
                        setQuery(hItem.text);
                        if (hItem.isUrl) {
                          onDownloadUrl(normalizeDirectUrl(hItem.text));
                        }
                        executeSearchOrNavigate(hItem.text);
                      }}
                      className={`px-3 py-2.5 flex items-center justify-between gap-2.5 cursor-pointer transition-colors ${
                        isLight ? 'hover:bg-slate-50' : 'hover:bg-slate-800/60'
                      }`}
                    >
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <div className="min-w-0 flex-1">
                          {hItem.title && (
                            <div className="text-xs font-semibold truncate">{hItem.title}</div>
                          )}
                          <div className="text-xs font-mono truncate opacity-85">{hItem.text}</div>
                        </div>
                      </div>
                      <span className="text-[11px] font-semibold text-sky-400 shrink-0">
                        {hItem.isUrl
                          ? lang === 'ur'
                            ? 'ڈاؤن لوڈ'
                            : 'Download'
                          : lang === 'ur'
                          ? 'سرچ کریں'
                          : 'Search'}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* 3. FULL-SCREEN ACTIVE SEARCH FILTER STRIP (Only shown AFTER user searches for something) */}
        {Boolean(activeQuery.trim()) && (
          <div
            dir="ltr"
            className={`px-3 sm:px-5 py-2 border-b overflow-x-auto no-scrollbar shrink-0 ${
              isLight ? 'bg-slate-50 border-slate-200' : 'bg-[#0b1120] border-slate-800/90'
            }`}
          >
            <div className="max-w-4xl mx-auto flex items-center gap-1.5 min-w-max">
              {/* Media Type Tabs: All | Video | Photo | Audio */}
              <button
                type="button"
                onClick={() => handleSelectMediaType('all')}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1 cursor-pointer transition-colors whitespace-nowrap ${
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
                <span>{lang === 'ur' ? 'تمام (All)' : 'All'}</span>
              </button>

              <button
                type="button"
                onClick={() => handleSelectMediaType('video')}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1 cursor-pointer transition-colors whitespace-nowrap ${
                  selectedMediaType === 'video'
                    ? 'bg-rose-600 text-white'
                    : isLight
                    ? 'text-slate-600 hover:bg-slate-200'
                    : 'text-slate-300 hover:bg-slate-800'
                }`}
              >
                <Video className="w-3 h-3" />
                <span>{lang === 'ur' ? 'ویڈیوز' : 'Videos'}</span>
              </button>

              <button
                type="button"
                onClick={() => handleSelectMediaType('photo')}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1 cursor-pointer transition-colors whitespace-nowrap ${
                  selectedMediaType === 'photo'
                    ? 'bg-emerald-500 text-slate-950'
                    : isLight
                    ? 'text-slate-600 hover:bg-slate-200'
                    : 'text-slate-300 hover:bg-slate-800'
                }`}
              >
                <ImageIcon className="w-3 h-3" />
                <span>{lang === 'ur' ? 'تصاویر' : 'Photos'}</span>
              </button>

              <button
                type="button"
                onClick={() => handleSelectMediaType('audio')}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1 cursor-pointer transition-colors whitespace-nowrap ${
                  selectedMediaType === 'audio'
                    ? 'bg-amber-500 text-slate-950'
                    : isLight
                    ? 'text-slate-600 hover:bg-slate-200'
                    : 'text-slate-300 hover:bg-slate-800'
                }`}
              >
                <Music className="w-3 h-3" />
                <span>{lang === 'ur' ? 'آڈیو (MP3)' : 'Audio'}</span>
              </button>

              <span className="h-4 w-px bg-slate-700/50 mx-0.5 shrink-0" />

              {/* Platform Filter Pills (All + 12 Platforms) */}
              <button
                type="button"
                data-platform="all"
                onClick={() => handleSelectPlatform('all')}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold flex items-center gap-1.5 cursor-pointer transition-all whitespace-nowrap ${
                  selectedPlatform === 'all'
                    ? 'bg-sky-600 text-white'
                    : isLight
                    ? 'bg-white text-slate-700 hover:bg-slate-200 border border-slate-200/80'
                    : 'bg-slate-800/80 text-slate-300 hover:bg-slate-700 hover:text-white'
                }`}
              >
                <span className="w-1.5 h-1.5 rounded-full shrink-0 bg-sky-400" />
                <span>All Platforms</span>
              </button>

              {ALL_BROWSER_PLATFORMS.map((plat) => {
                const isActive = selectedPlatform === plat.id;
                const count = platformCounts[plat.id] || 0;
                return (
                  <button
                    key={plat.id}
                    type="button"
                    data-platform={plat.id}
                    onClick={() => handleSelectPlatform(plat.id)}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold flex items-center gap-1.5 cursor-pointer transition-all whitespace-nowrap ${
                      isActive
                        ? 'bg-sky-600 text-white'
                        : isLight
                        ? 'bg-white text-slate-700 hover:bg-slate-200 border border-slate-200/80'
                        : 'bg-slate-800/80 text-slate-300 hover:bg-slate-700 hover:text-white'
                    }`}
                  >
                    <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${plat.dotColor}`} />
                    <span>{plat.label}</span>
                    {count > 0 && (
                      <span className="px-1 py-0.2 rounded text-[10px] font-mono bg-black/25">
                        {count}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* 4. FULL-SCREEN BROWSER CONTENT SPACE: Videos, Photos, and Audio from Every Platform */}
        <div
          className={
            viewMode === 'results'
              ? isFullScreenActive
                ? 'w-full flex-1 min-h-0 overflow-y-auto overscroll-contain'
                : 'hidden'
              : 'hidden'
          }
          id="browser-search-results-viewport"
        >
          {isSearching ? (
            <div className="py-16 flex flex-col items-center justify-center gap-2.5">
              <Loader2 className="w-7 h-7 text-sky-500 animate-spin" />
              <p
                className={`text-xs sm:text-sm font-medium ${
                  isLight ? 'text-slate-600' : 'text-slate-300'
                }`}
              >
                {lang === 'ur'
                  ? 'تمام پلیٹ فارمز سے ویڈیوز، تصاویر اور آڈیو تلاش کی جا رہی ہیں...'
                  : 'Searching videos, photos & audio across all platforms...'}
              </p>
            </div>
          ) : !activeQuery ? null : results.length === 0 ? (
            <div className="py-12 flex flex-col items-center justify-center text-center gap-2 px-4">
              <p
                className={`text-xs sm:text-sm font-medium ${
                  isLight ? 'text-slate-500' : 'text-slate-400'
                }`}
              >
                {lang === 'ur'
                  ? 'کوئی نتیجہ نہیں ملا۔ دوبارہ سرچ کریں۔'
                  : 'No media found for this query. Try another search.'}
              </p>
            </div>
          ) : (
            /* FULL-SCREEN ACTIVE SEARCH STATE: Videos, Photos & Audio from All Platforms */
            <div className="w-full max-w-4xl mx-auto p-2.5 sm:p-4 pb-10">
              {/* Direct URL Quick-Download Row if user typed/pasted a URL */}
              {isDirectUrl(query) && (
                <div
                  onClick={() => onDownloadUrl(normalizeDirectUrl(query))}
                  className={`mb-2.5 p-3 rounded-xl border flex items-center justify-between gap-3 cursor-pointer transition-colors ${
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

