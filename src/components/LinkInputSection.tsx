import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  Clipboard,
  X,
  Link2,
  CheckCircle2,
  Instagram,
  Music2,
  Facebook,
  Twitter,
  Pin,
  Youtube,
  Flame,
  Camera,
  AtSign,
  Briefcase,
  Download,
  Clock,
  CornerDownLeft,
  Trash2,
} from 'lucide-react';
import { Language, PlatformType, BatchTargetFormat, RecentSearchItem, Theme } from '../types';
import { translations } from '../data/translations';
import {
  detectPlatform,
  extractUrlsFromText,
  getSavedRecentSearches,
  removeRecentSearch,
  clearAllRecentSearches,
} from '../utils/urlParser';

interface LinkInputSectionProps {
  lang: Language;
  theme?: Theme;
  url: string;
  onChangeUrl: (val: string) => void;
  onClear?: () => void;
  onAnalyze: (customUrl?: string) => void;
  onHdDownload?: (customUrl?: string) => void;
  hdReadyOption?: { resolution: string; size: string } | null;
  isLoading: boolean;
  loadingMessage?: string;
  onOpenBatch?: () => void;
  onOpenInstall?: () => void;
  onSelectSample?: (sampleUrl: string) => void;
  removeWatermark?: boolean;
  onToggleWatermark?: (val: boolean) => void;
  onProcessBatch?: (urls: string[], formatTarget?: BatchTargetFormat, removeWatermark?: boolean) => void;
  onOpenBrowser?: (url?: string) => void;
  onOpenCreatorBatch?: () => void;
  onOpenFrequentlyDownloaded?: () => void;
  frequentlyDownloadedCount?: number;
  onOpenSupportedPlatforms?: () => void;
  onOpenCommunity?: () => void;
  recentSearches?: RecentSearchItem[];
  onRemoveRecentSearch?: (id: string) => void;
  onClearRecentSearches?: () => void;
  onDeleteOlderThan7Days?: () => void;
}

export const LinkInputSection: React.FC<LinkInputSectionProps> = ({
  lang,
  theme = 'dark',
  url,
  onChangeUrl,
  onClear,
  onAnalyze,
  onHdDownload,
  hdReadyOption,
  isLoading,
  recentSearches,
  onRemoveRecentSearch,
  onClearRecentSearches,
}) => {
  const isLight = theme === 'light';
  const t = translations[lang];
  const [pasteNotice, setPasteNotice] = useState<string | null>(null);
  const [isRecentDropdownOpen, setIsRecentDropdownOpen] = useState<boolean>(false);
  const [highlightedIdx, setHighlightedIdx] = useState<number>(-1);
  const [localFallbackSearches, setLocalFallbackSearches] = useState<RecentSearchItem[]>(() =>
    getSavedRecentSearches()
  );
  const inputWrapperRef = useRef<HTMLDivElement>(null);
  const detected = url.trim() ? detectPlatform(url) : null;

  // Compact autocomplete suggestions (up to 4 items) when typing
  const recentFiveUrls = useMemo(() => {
    const rawList = recentSearches !== undefined ? recentSearches : localFallbackSearches;
    const seen = new Set<string>();
    const deduped: RecentSearchItem[] = [];

    const sorted = [...rawList].sort((a, b) => (b.searchedAt || 0) - (a.searchedAt || 0));
    for (const item of sorted) {
      if (!item || !item.url) continue;
      const key = item.url.trim().toLowerCase();
      if (!seen.has(key)) {
        seen.add(key);
        deduped.push(item);
      }
    }

    const q = url.trim().toLowerCase();
    if (!q) {
      return deduped.slice(0, 4);
    }

    return deduped
      .filter(
        (item) =>
          item.url.toLowerCase().includes(q) ||
          (item.title ? item.title.toLowerCase().includes(q) : false) ||
          item.platform.toLowerCase().includes(q)
      )
      .slice(0, 4);
  }, [recentSearches, localFallbackSearches, url]);

  const handleClearIndividualRecentItem = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    const updated = removeRecentSearch(id);
    setLocalFallbackSearches(updated);
    if (onRemoveRecentSearch) {
      onRemoveRecentSearch(id);
    }
  };

  const handleBulkClearAllRecent = (e: React.MouseEvent) => {
    e.stopPropagation();
    clearAllRecentSearches();
    setLocalFallbackSearches([]);
    if (onClearRecentSearches) {
      onClearRecentSearches();
    }
    setIsRecentDropdownOpen(false);
  };

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (inputWrapperRef.current && !inputWrapperRef.current.contains(e.target as Node)) {
        setIsRecentDropdownOpen(false);
        setHighlightedIdx(-1);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelectRecentUrl = (item: RecentSearchItem) => {
    onChangeUrl(item.url);
    setIsRecentDropdownOpen(false);
    setHighlightedIdx(-1);
    onAnalyze(item.url);
  };

  const handlePasteButton = async () => {
    try {
      if (navigator.clipboard && navigator.clipboard.readText) {
        const text = await navigator.clipboard.readText();
        if (text) {
          const extracted = extractUrlsFromText(text);
          const target = extracted.length > 0 ? extracted[0] : text.trim();
          onChangeUrl(target);
          setIsRecentDropdownOpen(false);
          setPasteNotice(
            lang === 'ur'
              ? 'لنک پیسٹ ہو گیا — ڈاؤن لوڈ بٹن دبائیں'
              : 'Link pasted — tap Download below'
          );
          setTimeout(() => setPasteNotice(null), 2500);
        }
      }
    } catch {
      // Clipboard read permission may require manual Ctrl+V in iframe
    }
  };

  const handleInputPaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    const pastedText = e.clipboardData.getData('text');
    if (pastedText && pastedText.trim().startsWith('http')) {
      e.preventDefault();
      const extracted = extractUrlsFromText(pastedText);
      const target = extracted.length > 0 ? extracted[0] : pastedText.trim();
      onChangeUrl(target);
      setIsRecentDropdownOpen(false);
      setPasteNotice(
        lang === 'ur'
          ? 'لنک پیسٹ ہو گیا — ڈاؤن لوڈ بٹن دبائیں'
          : 'Link pasted — tap Download below'
      );
      setTimeout(() => setPasteNotice(null), 2500);
    }
  };

  const handleClear = () => {
    setPasteNotice(null);
    setHighlightedIdx(-1);
    setIsRecentDropdownOpen(false);
    if (onClear) {
      onClear();
    } else {
      onChangeUrl('');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      if (recentFiveUrls.length > 0) {
        e.preventDefault();
        setIsRecentDropdownOpen(true);
        setHighlightedIdx((prev) => (prev + 1) % recentFiveUrls.length);
      }
      return;
    }
    if (e.key === 'ArrowUp') {
      if (recentFiveUrls.length > 0) {
        e.preventDefault();
        setIsRecentDropdownOpen(true);
        setHighlightedIdx((prev) => (prev <= 0 ? recentFiveUrls.length - 1 : prev - 1));
      }
      return;
    }
    if (e.key === 'Escape') {
      if (isRecentDropdownOpen) {
        e.preventDefault();
        setIsRecentDropdownOpen(false);
        setHighlightedIdx(-1);
      }
      return;
    }
    if (e.key === 'Enter') {
      if (isRecentDropdownOpen && highlightedIdx >= 0 && recentFiveUrls[highlightedIdx]) {
        e.preventDefault();
        handleSelectRecentUrl(recentFiveUrls[highlightedIdx]);
        return;
      }
      if (url.trim()) {
        setIsRecentDropdownOpen(false);
        onAnalyze(url.trim());
      }
    }
  };

  const getPlatformIcon = (platform: PlatformType | null) => {
    switch (platform) {
      case 'tiktok':
        return <Music2 className="w-5 h-5 text-cyan-500" />;
      case 'instagram':
        return <Instagram className="w-5 h-5 text-pink-500" />;
      case 'facebook':
        return <Facebook className="w-5 h-5 text-blue-500" />;
      case 'youtube':
        return <Youtube className="w-5 h-5 text-red-500" />;
      case 'twitter':
        return <Twitter className="w-5 h-5 text-sky-500" />;
      case 'pinterest':
        return <Pin className="w-5 h-5 text-rose-500" />;
      case 'threads':
        return <AtSign className={`w-5 h-5 ${isLight ? 'text-slate-700' : 'text-slate-200'}`} />;
      case 'reddit':
        return <Flame className="w-5 h-5 text-orange-500" />;
      case 'snapchat':
        return <Camera className="w-5 h-5 text-amber-500" />;
      case 'linkedin':
        return <Briefcase className="w-5 h-5 text-sky-500" />;
      default:
        return <Link2 className="w-5 h-5 text-rose-500" />;
    }
  };

  const handleUrlChange = (val: string) => {
    onChangeUrl(val);
    if (val.trim().length > 0 && recentFiveUrls.length > 0) {
      setIsRecentDropdownOpen(true);
    } else {
      setIsRecentDropdownOpen(false);
    }
    setHighlightedIdx(-1);
  };

  return (
    <section
      className="w-full max-w-4xl mx-auto"
      id="main-download-link-extraction-section"
      aria-label={lang === 'ur' ? 'ویڈیو لنک ڈاؤن لوڈر' : 'Main Download Link Extraction Section'}
    >
      <div
        className={`w-full rounded-2xl sm:rounded-3xl p-3 sm:p-4 border relative z-30 transition-colors ${
          isLight
            ? 'bg-white border-slate-200 shadow-sm'
            : 'bg-[#111827] border-slate-800 shadow-lg'
        }`}
      >
        {/* URL Input + Paste / Clear + Primary Download Button */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 sm:gap-3">
          <div className="relative flex-1 min-w-0" ref={inputWrapperRef}>
            <label htmlFor="video-url-input" className="sr-only">
              {lang === 'ur' ? 'ویڈیو کا لنک پیسٹ کریں' : 'Video URL to download'}
            </label>
            <div
              className={`url-input-inner-box w-full flex items-center px-3.5 sm:px-4 gap-2.5 rounded-xl sm:rounded-2xl border transition-all min-h-[50px] sm:min-h-[54px] ${
                isLight
                  ? 'bg-slate-50 border-slate-300 focus-within:bg-white focus-within:border-rose-500'
                  : 'bg-[#0b0f19] border-slate-700/80 focus-within:border-rose-500'
              }`}
            >
              <div className="shrink-0 flex items-center">{getPlatformIcon(detected)}</div>

              <input
                type="url"
                value={url}
                onFocus={() => {
                  if (url.trim().length > 0 && recentFiveUrls.length > 0) {
                    setIsRecentDropdownOpen(true);
                  }
                }}
                onChange={(e) => handleUrlChange(e.target.value)}
                onPaste={handleInputPaste}
                onKeyDown={handleKeyDown}
                dir={lang === 'ur' ? 'rtl' : 'ltr'}
                placeholder={
                  lang === 'ur'
                    ? 'ویڈیو کا لنک یہاں پیسٹ کریں...'
                    : 'Paste video or media link here...'
                }
                className={`w-full py-2.5 text-sm sm:text-base outline-none bg-transparent font-sans ${
                  isLight
                    ? 'text-slate-900 placeholder:text-slate-400'
                    : 'text-slate-100 placeholder:text-slate-400'
                }`}
                id="video-url-input"
                autoComplete="off"
                spellCheck="false"
                aria-expanded={isRecentDropdownOpen && recentFiveUrls.length > 0}
                aria-controls="recent-searched-urls-dropdown"
              />

              {/* Clear (when link exists) and Paste Button */}
              <div className="flex items-center gap-1.5 shrink-0">
                {url.trim().length > 0 && (
                  <button
                    type="button"
                    onClick={handleClear}
                    className={`w-8 h-8 flex items-center justify-center rounded-xl transition-colors cursor-pointer ${
                      isLight
                        ? 'bg-slate-200 hover:bg-slate-300 text-slate-700'
                        : 'bg-slate-800 hover:bg-slate-700 text-slate-200'
                    }`}
                    title={t.clearButton}
                    aria-label="Clear URL"
                    id="clear-url-btn"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}

                <button
                  type="button"
                  onClick={handlePasteButton}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer min-h-[36px] whitespace-nowrap ${
                    isLight
                      ? 'bg-slate-900 hover:bg-slate-800 text-white'
                      : 'bg-slate-800 hover:bg-slate-700 text-slate-100 border border-slate-700'
                  }`}
                  title={t.pasteButton}
                  id="paste-url-btn"
                >
                  <Clipboard className="w-3.5 h-3.5 shrink-0" />
                  <span>{t.pasteButton}</span>
                </button>
              </div>
            </div>

            {/* Compact Autocomplete Dropdown (only when typing/focused & matching items exist) */}
            {isRecentDropdownOpen && recentFiveUrls.length > 0 && (
              <div
                id="recent-searched-urls-dropdown"
                role="listbox"
                aria-label="Recent Searched URLs"
                className={`absolute left-0 right-0 top-full mt-2 z-50 rounded-xl border shadow-xl overflow-hidden animate-fade-in ${
                  isLight
                    ? 'bg-white border-slate-200 text-slate-900'
                    : 'bg-[#111827] border-slate-800 text-slate-100'
                }`}
              >
                <div
                  className={`px-3 py-1.5 border-b flex items-center justify-between text-[11px] ${
                    isLight
                      ? 'bg-slate-50 border-slate-200 text-slate-500'
                      : 'bg-[#0b0f19] border-slate-800 text-slate-400'
                  }`}
                >
                  <span className="flex items-center gap-1.5 font-medium">
                    <Clock className="w-3 h-3" />
                    <span>{lang === 'ur' ? 'حالیہ لنکس' : 'Recent links'}</span>
                  </span>
                  <button
                    type="button"
                    onClick={handleBulkClearAllRecent}
                    id="clear-recent-searched-urls-btn"
                    className="text-[11px] font-medium text-rose-500 hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <Trash2 className="w-3 h-3" />
                    <span>{lang === 'ur' ? 'صاف کریں' : 'Clear'}</span>
                  </button>
                </div>

                <div className="divide-y divide-slate-200/40 dark:divide-slate-800 max-h-56 overflow-y-auto">
                  {recentFiveUrls.map((item, idx) => {
                    const isHighlighted = highlightedIdx === idx;
                    return (
                      <div
                        key={`recent_url_item_${item.id || idx}`}
                        role="option"
                        aria-selected={isHighlighted}
                        onClick={() => handleSelectRecentUrl(item)}
                        id={`recent-url-option-${idx}`}
                        className={`px-3 py-2 flex items-center justify-between gap-2 cursor-pointer transition-colors ${
                          isHighlighted
                            ? isLight
                              ? 'bg-slate-100'
                              : 'bg-slate-800/80'
                            : isLight
                            ? 'hover:bg-slate-50'
                            : 'hover:bg-slate-800/50'
                        }`}
                      >
                        <div className="min-w-0 flex-1 text-left">
                          <div className="flex items-center gap-1.5 text-xs font-medium truncate">
                            <span className="uppercase text-[10px] font-semibold text-rose-500 shrink-0">
                              {item.platform}
                            </span>
                            {item.title && (
                              <>
                                <span className="opacity-40" aria-hidden="true">·</span>
                                <span className="truncate">{item.title}</span>
                              </>
                            )}
                          </div>
                          <div
                            className={`text-[11px] font-mono truncate ${
                              isLight ? 'text-slate-500' : 'text-slate-400'
                            }`}
                          >
                            {item.url}
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          <CornerDownLeft className="w-3.5 h-3.5 text-slate-400" />
                          <button
                            type="button"
                            onClick={(e) => handleClearIndividualRecentItem(e, item.id)}
                            aria-label="Remove recent link"
                            id={`clear-individual-recent-url-btn-${idx}`}
                            className={`p-1 rounded-md cursor-pointer ${
                              isLight
                                ? 'text-slate-400 hover:text-rose-600 hover:bg-slate-100'
                                : 'text-slate-400 hover:text-rose-400 hover:bg-slate-800'
                            }`}
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Large, Highly Visible "Download" Action Button Next To / Below Input Field */}
          <button
            type="button"
            onClick={() => {
              const target = url.trim();
              if (!target) return;
              setIsRecentDropdownOpen(false);
              onAnalyze(target);
            }}
            className="w-full sm:w-auto px-6 py-3.5 rounded-xl sm:rounded-2xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-sm sm:text-base flex items-center justify-center gap-2 whitespace-nowrap cursor-pointer min-h-[50px] sm:min-h-[54px] shadow-md shadow-rose-600/25 transition-all active:scale-[0.99]"
            id="fetch-download-btn"
          >
            {isLoading ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin shrink-0" />
                <span>
                  {lang === 'ur'
                    ? 'پروسس ہو رہا ہے...'
                    : 'Processing...'}
                </span>
              </>
            ) : (
              <>
                <Download className="w-4 h-4 shrink-0" />
                <span>{lang === 'ur' ? 'ڈاؤن لوڈ (Download)' : 'Download'}</span>
                {hdReadyOption && (
                  <span className="text-xs font-mono font-normal opacity-90">
                    ({hdReadyOption.resolution})
                  </span>
                )}
              </>
            )}
          </button>
        </div>

        {/* Subtle Auto-Paste Status Notice */}
        {pasteNotice && (
          <div
            className={`mt-3 px-3 py-2 rounded-xl border text-xs font-medium flex items-center gap-2 animate-fade-in ${
              isLight
                ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                : 'bg-emerald-950/50 border-emerald-800/60 text-emerald-300'
            }`}
          >
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{pasteNotice}</span>
          </div>
        )}

        {/* Direct clickable link to https://mediaflow-hd.ai.studio (Opens in a new tab in Chrome) */}
        <div
          id="home-app-download-bar"
          className={`mt-3 pt-2.5 border-t flex items-center justify-center gap-2 text-xs sm:text-sm ${
            isLight ? 'border-slate-200/80 text-slate-600' : 'border-slate-800/80 text-slate-300'
          }`}
        >
          <span>
            {lang === 'ur' ? 'ایپ ڈاؤن لوڈ لنک:' : 'Download App:'}
          </span>
          <a
            href="https://mediaflow-hd.ai.studio"
            target="_blank"
            rel="noopener noreferrer"
            id="home-direct-app-link"
            className="font-mono font-bold text-emerald-500 hover:text-emerald-400 underline underline-offset-4 transition-colors cursor-pointer"
          >
            https://mediaflow-hd.ai.studio
          </a>
        </div>
      </div>
    </section>
  );
};
