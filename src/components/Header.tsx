import React, { useState, useEffect, useRef } from 'react';
import {
  Download,
  HelpCircle,
  Globe,
  ShieldCheck,
  Sun,
  Moon,
  ClipboardCheck,
  ClipboardX,
  HardDrive,
  Layers,
  X,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Bell,
  BellRing,
  BellOff,
  Gauge,
  MessageSquare,
  Compass,
  Settings,
  Zap,
  Sparkles,
  Bookmark,
  UserCheck,
  Trash2,
  Palette,
  Check,
  FileSpreadsheet,
  FileDown,
  LayoutGrid,
  KeyRound,
  LogOut,
} from 'lucide-react';
import {
  Language,
  DownloadTask,
  Theme,
  MaxAutoDownloadSize,
  DownloadSpeedCap,
  SavedAccountItem,
  AutoClearDuration,
  AutoClearRetentionMode,
  FileSizeUnit,
} from '../types';
import { APP_THEMES } from './ColorfulBackground';
import { MediaFlowLogo } from './MediaFlowLogo';
import { translations, LANGUAGE_OPTIONS } from '../data/translations';
import { formatAutoClearLabel, exportRecordsToCSV, getSavedHistory } from '../utils/urlParser';
import { reauthorizeDrive, logout } from '../services/driveService';
import { User } from 'firebase/auth';
import {
  ALL_BROWSER_PLATFORMS,
  BrowserPlatformId,
  BrowserSearchSettings,
  loadBrowserSearchSettings,
  saveBrowserSearchSettings,
  BROWSER_SETTINGS_CHANGED_EVENT,
} from '../utils/browserSearchSettings';

export type WorkspaceTab = 'downloader' | 'platforms' | 'community';

interface HeaderProps {
  lang: Language;
  onToggleLang: () => void;
  onSelectLang?: (nextLang: Language) => void;
  theme: Theme;
  onToggleTheme: () => void;
  onSelectTheme?: (theme: Theme) => void;
  autoDetectClipboard: boolean;
  onToggleAutoDetectClipboard: () => void;
  enableFloatingButton?: boolean;
  onToggleFloatingButton?: () => void;
  removeWatermark?: boolean;
  onToggleWatermark?: (val: boolean) => void;
  desktopNotifications?: boolean;
  onToggleDesktopNotifications?: () => void;
  onTestNotification?: () => void;
  maxAutoDownloadSize?: MaxAutoDownloadSize;
  onChangeMaxAutoDownloadSize?: (size: MaxAutoDownloadSize) => void;
  downloadSpeedCap?: DownloadSpeedCap;
  onChangeDownloadSpeedCap?: (cap: DownloadSpeedCap) => void;
  autoClearDuration?: AutoClearDuration;
  onChangeAutoClearDuration?: (dur: AutoClearDuration) => void;
  autoClearRetentionMode?: AutoClearRetentionMode;
  onChangeAutoClearRetentionMode?: (mode: AutoClearRetentionMode) => void;
  clearSuccessfullyFinished?: boolean;
  onToggleClearSuccessfullyFinished?: (val?: boolean) => void;
  fileSizeUnit?: FileSizeUnit;
  onToggleFileSizeUnit?: (unit?: FileSizeUnit) => void;
  onChangeFileSizeUnit?: (unit: FileSizeUnit) => void;
  onClearCompletedNow?: () => void;
  onDeleteOlderThan7Days?: () => void;
  activeDownloads: DownloadTask[];
  onOpenDownloadsDrawer: () => void;
  onOpenGallery: () => void;
  onOpenGuide: () => void;
  onOpenDrive: () => void;
  onOpenInstall?: () => void;
  onOpenBatch?: () => void;
  onOpenBrowser?: () => void;
  onOpenGeminiChat?: () => void;
  onOpenCreatorProfile?: (account?: SavedAccountItem) => void;
  onOpenFrequentlyDownloaded?: () => void;
  frequentlyDownloadedCount?: number;
  savedAccounts?: SavedAccountItem[];
  onRemoveSavedAccount?: (id: string) => void;
  onClearSavedAccounts?: () => void;
  historyCount: number;
  user: User | null;
  onAuthChange?: (user: User | null) => void;
  activeTab?: WorkspaceTab;
  onSelectTab?: (tab: WorkspaceTab) => void;
  activeSection?: WorkspaceTab;
  onChangeSection?: (tab: WorkspaceTab) => void;
  onSelectPlatform?: (platform: any) => void;
  isSettingsOpen?: boolean;
  onToggleSettingsOpen?: (open: boolean) => void;
  isMoreOpen?: boolean;
  onToggleMoreOpen?: (open: boolean) => void;
}

export const Header: React.FC<HeaderProps> = ({
  lang,
  onToggleLang,
  onSelectLang,
  theme,
  onToggleTheme,
  onSelectTheme,
  autoDetectClipboard,
  onToggleAutoDetectClipboard,
  enableFloatingButton = false,
  onToggleFloatingButton,
  removeWatermark = true,
  onToggleWatermark,
  desktopNotifications = false,
  onToggleDesktopNotifications,
  onTestNotification,
  maxAutoDownloadSize = '100',
  onChangeMaxAutoDownloadSize,
  downloadSpeedCap = 'unlimited',
  onChangeDownloadSpeedCap,
  autoClearDuration = '60',
  onChangeAutoClearDuration,
  autoClearRetentionMode = 'clear_finished',
  onChangeAutoClearRetentionMode,
  clearSuccessfullyFinished = true,
  onToggleClearSuccessfullyFinished,
  fileSizeUnit = 'MB' as FileSizeUnit,
  onToggleFileSizeUnit: onToggleFileSizeUnitProp,
  onChangeFileSizeUnit,
  onClearCompletedNow,
  onDeleteOlderThan7Days,
  activeDownloads,
  onOpenDownloadsDrawer,
  onOpenGuide,
  onOpenDrive,
  onOpenInstall,
  onOpenBatch,
  onOpenGeminiChat,
  onOpenCreatorProfile,
  onOpenFrequentlyDownloaded,
  frequentlyDownloadedCount = 0,
  historyCount,
  user,
  onAuthChange,
  activeTab: activeTabProp,
  onSelectTab: onSelectTabProp,
  activeSection,
  onChangeSection,
  isSettingsOpen,
  onToggleSettingsOpen,
  isMoreOpen,
  onToggleMoreOpen,
}) => {
  const isLight = theme === 'light';
  const onSelectTab = onChangeSection || onSelectTabProp;
  const onToggleFileSizeUnit = onToggleFileSizeUnitProp || onChangeFileSizeUnit;
  const t = translations[lang];
  const activeThemeMeta = APP_THEMES.find((item) => item.id === theme) || APP_THEMES[0];

  const [internalSettingsOpen, setInternalSettingsOpen] = useState(false);
  const [internalMoreOpen, setInternalMoreOpen] = useState(false);
  const [isThemesExpanded, setIsThemesExpanded] = useState(false);
  const [isDriveBusy, setIsDriveBusy] = useState(false);
  const [browserSettings, setBrowserSettings] = useState<BrowserSearchSettings>(() =>
    loadBrowserSearchSettings()
  );

  useEffect(() => {
    const handleSync = (e: Event) => {
      const customEv = e as CustomEvent<BrowserSearchSettings>;
      if (customEv.detail) {
        setBrowserSettings(customEv.detail);
      } else {
        setBrowserSettings(loadBrowserSearchSettings());
      }
    };
    window.addEventListener(BROWSER_SETTINGS_CHANGED_EVENT, handleSync);
    return () => window.removeEventListener(BROWSER_SETTINGS_CHANGED_EVENT, handleSync);
  }, []);

  const handleToggleBrowserPlatform = (platId: BrowserPlatformId) => {
    const nextEnabled = {
      ...browserSettings.enabledPlatforms,
      [platId]: !browserSettings.enabledPlatforms[platId],
    };
    if (!Object.values(nextEnabled).some(Boolean)) {
      nextEnabled[platId] = true;
    }
    const updated: BrowserSearchSettings = {
      ...browserSettings,
      enabledPlatforms: nextEnabled,
    };
    setBrowserSettings(updated);
    saveBrowserSearchSettings(updated);
  };

  const handleEnableAllBrowserPlatforms = () => {
    const allOn = {} as Record<BrowserPlatformId, boolean>;
    for (const p of ALL_BROWSER_PLATFORMS) {
      allOn[p.id] = true;
    }
    const updated: BrowserSearchSettings = {
      ...browserSettings,
      enabledPlatforms: allOn,
      mixAllPlatformsTogether: true,
    };
    setBrowserSettings(updated);
    saveBrowserSearchSettings(updated);
  };

  const handleHeaderReauthorizeDrive = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsDriveBusy(true);
    try {
      const res = await reauthorizeDrive();
      if (onAuthChange) onAuthChange(res.user);
    } catch {
      // Ignore cancelled popup
    } finally {
      setIsDriveBusy(false);
    }
  };

  const handleHeaderLogoutDrive = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsDriveBusy(true);
    try {
      await logout();
      if (onAuthChange) onAuthChange(null);
    } catch {
      // Ignore error
    } finally {
      setIsDriveBusy(false);
    }
  };

  const settingsDrawerOpen =
    typeof isSettingsOpen === 'boolean' ? isSettingsOpen : internalSettingsOpen;
  const setSettingsDrawerOpen = (val: boolean) => {
    setInternalSettingsOpen(val);
    if (onToggleSettingsOpen) {
      onToggleSettingsOpen(val);
    }
  };

  const moreDrawerOpen =
    typeof isMoreOpen === 'boolean' ? isMoreOpen : internalMoreOpen;
  const setMoreDrawerOpen = (val: boolean) => {
    setInternalMoreOpen(val);
    if (onToggleMoreOpen) {
      onToggleMoreOpen(val);
    }
  };

  const settingsRef = useRef<HTMLDivElement>(null);
  const moreRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const targetEl = event.target as HTMLElement | null;
      if (
        targetEl &&
        (targetEl.closest('#bottom-nav-settings-tab') ||
          targetEl.closest('#bottom-nav-more-tab'))
      ) {
        return;
      }
      if (
        settingsDrawerOpen &&
        settingsRef.current &&
        !settingsRef.current.contains(event.target as Node)
      ) {
        setSettingsDrawerOpen(false);
      }
      if (
        moreDrawerOpen &&
        moreRef.current &&
        !moreRef.current.contains(event.target as Node)
      ) {
        setMoreDrawerOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        if (settingsDrawerOpen) setSettingsDrawerOpen(false);
        if (moreDrawerOpen) setMoreDrawerOpen(false);
      }
    };

    if (settingsDrawerOpen || moreDrawerOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [settingsDrawerOpen, moreDrawerOpen]);

  const handleMoreAction = (action?: () => void) => {
    setMoreDrawerOpen(false);
    if (action) action();
  };

  const activeDownloadingCount = activeDownloads.filter(
    (d) => d.status === 'downloading'
  ).length;

  const cardSurfaceClass = isLight
    ? 'bg-slate-50 border-slate-200 text-slate-900'
    : 'bg-slate-900/90 border-slate-800 text-slate-100';

  const subTextClass = isLight ? 'text-slate-500' : 'text-slate-400';

  return (
    <>
      {/* Clean, Minimal Fixed Top Header */}
      <header
        id="fixed-top-header-bar"
        className={`fixed top-0 left-0 right-0 z-[90] w-full backdrop-blur-md border-b transition-colors duration-200 ${
          isLight
            ? 'bg-white/95 border-slate-200 text-slate-900'
            : 'bg-[#0b0f19]/95 border-slate-800/80 text-slate-100'
        }`}
      >
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-3">
          {/* Zone 1: Brand Title + Subtle Tagline */}
          <button
            type="button"
            onClick={() => {
              setSettingsDrawerOpen(false);
              setMoreDrawerOpen(false);
              if (onSelectTab) onSelectTab('downloader');
              setTimeout(() => {
                const inputEl = document.getElementById('video-url-input');
                if (inputEl) inputEl.focus();
              }, 80);
            }}
            className="flex items-center gap-2 min-w-0 text-left cursor-pointer group"
          >
            <MediaFlowLogo
              size={34}
              showText={true}
              isLight={isLight}
              className="group-hover:opacity-95 transition-opacity shrink-0"
            />
            <span
              className={`text-[10px] sm:text-xs font-medium tracking-tight truncate ${
                isLight ? 'text-slate-500' : 'text-slate-400'
              }`}
            >
              Free HD Video Downloader
            </span>
          </button>

          {/* Zone 3: Active Queue Quick Status (Only shown when tasks exist, otherwise quiet) */}
          <div className="flex items-center gap-2 shrink-0">
            {activeDownloads.length > 0 && (
              <button
                type="button"
                onClick={onOpenDownloadsDrawer}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 border cursor-pointer transition-colors min-h-[36px] ${
                  activeDownloadingCount > 0
                    ? 'bg-rose-600 text-white border-rose-500'
                    : isLight
                    ? 'bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200'
                    : 'bg-slate-800 text-slate-200 border-slate-700 hover:bg-slate-700'
                }`}
                title={lang === 'ur' ? 'ڈاؤن لوڈ قطار دیکھیں' : 'View Download Queue'}
              >
                <Download className="w-3.5 h-3.5" />
                <span className="font-mono">{activeDownloads.length}</span>
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Backdrop overlay when either More or Settings Drawer is open */}
      {(settingsDrawerOpen || moreDrawerOpen) && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-xs z-40 transition-opacity animate-fade-in"
          onClick={() => {
            setSettingsDrawerOpen(false);
            setMoreDrawerOpen(false);
          }}
        />
      )}

      {/* =====================================================================
          MORE DRAWER (Full-Page View on Mobile & Laptop: Tools, Explore, App)
         ===================================================================== */}
      {moreDrawerOpen && (
        <aside
          ref={moreRef}
          id="mediaflow-more-drawer"
          aria-label={lang === 'ur' ? 'مزید فیچرز (More)' : 'More Features'}
          className={`fixed inset-x-0 top-0 bottom-16 z-[70] w-screen h-[calc(100dvh-4rem)] flex flex-col overflow-hidden animate-fade-in transition-colors ${
            isLight
              ? 'bg-white text-slate-900'
              : 'bg-[#0b0f19] text-slate-100'
          }`}
        >
          {/* Top Accent Spacer (preserves nth-of-type structure) */}
          <div className="hidden" aria-hidden="true" />

          {/* Full-Width Page Header (div:nth-of-type(2)) */}
          <div
            className={`w-full px-4 sm:px-8 py-3.5 border-b shrink-0 ${
              isLight ? 'border-slate-200 bg-white' : 'border-slate-800 bg-[#0b0f19]'
            }`}
          >
            <div className="max-w-6xl mx-auto flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-sky-600 text-white flex items-center justify-center shadow-xs shrink-0">
                  <LayoutGrid className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-bold">
                    {lang === 'ur' ? 'مزید ٹولز اور فیچرز (More)' : 'More Tools & Features'}
                  </h3>
                  <p className={`text-[11px] sm:text-xs ${subTextClass}`}>
                    {lang === 'ur'
                      ? 'سیکنڈری ٹولز، پلیٹ فارمز اور کمیونٹی'
                      : 'Secondary tools, supported platforms & community'}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setMoreDrawerOpen(false)}
                className={`w-9 h-9 rounded-xl flex items-center justify-center border transition-colors cursor-pointer shrink-0 ${
                  isLight
                    ? 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200'
                    : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700'
                }`}
                aria-label={t.close}
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Full-Page Categorized More Menu Body (div:nth-of-type(3)) */}
          <div className="flex-1 w-full px-4 sm:px-8 py-5 pb-20 overflow-y-auto">
            <div className="max-w-6xl mx-auto space-y-6">
              {/* CATEGORY 1: TOOLS */}
              <div className="space-y-3">
                <div className={`text-xs sm:text-sm font-bold px-1 ${subTextClass}`}>
                  {lang === 'ur' ? 'ٹولز (Tools)' : 'Tools'}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  {onOpenBatch && (
                    <button
                      type="button"
                      onClick={() => handleMoreAction(onOpenBatch)}
                      id="menu-item-batch"
                      className={`w-full flex items-center justify-between p-4 rounded-2xl border transition-colors cursor-pointer text-left min-h-[68px] ${
                        isLight
                          ? 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-900'
                          : 'bg-[#111827] hover:bg-slate-800/90 border-slate-800 text-slate-100'
                      }`}
                    >
                      <div className="flex items-center gap-3.5 min-w-0">
                        <div className="w-10 h-10 rounded-xl bg-indigo-500/15 text-indigo-500 flex items-center justify-center shrink-0">
                          <Layers className="w-5 h-5" />
                        </div>
                        <div className="min-w-0">
                          <div className="text-sm font-bold truncate">
                            {lang === 'ur' ? 'بیچ ڈاؤن لوڈ (Batch Download)' : 'Batch Download'}
                          </div>
                          <p className={`text-xs truncate mt-0.5 ${subTextClass}`}>
                            {lang === 'ur'
                              ? 'ایک ساتھ متعدد ویڈیو لنکس ڈاؤن لوڈ کریں'
                              : 'Download multiple video links at once'}
                          </p>
                        </div>
                      </div>
                      <ChevronRight className={`w-4 h-4 shrink-0 ${subTextClass}`} />
                    </button>
                  )}

                  {onOpenGeminiChat && (
                    <button
                      type="button"
                      onClick={() => handleMoreAction(onOpenGeminiChat)}
                      id="menu-item-ai-chat"
                      className={`w-full flex items-center justify-between p-4 rounded-2xl border transition-colors cursor-pointer text-left min-h-[68px] ${
                        isLight
                          ? 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-900'
                          : 'bg-[#111827] hover:bg-slate-800/90 border-slate-800 text-slate-100'
                      }`}
                    >
                      <div className="flex items-center gap-3.5 min-w-0">
                        <div className="w-10 h-10 rounded-xl bg-violet-500/15 text-violet-500 flex items-center justify-center shrink-0">
                          <Sparkles className="w-5 h-5" />
                        </div>
                        <div className="min-w-0">
                          <div className="text-sm font-bold truncate">
                            {lang === 'ur' ? 'AI چیٹ اسسٹنٹ (AI Chat)' : 'AI Chat'}
                          </div>
                          <p className={`text-xs truncate mt-0.5 ${subTextClass}`}>
                            {lang === 'ur'
                              ? 'کیپشنز، ہیش ٹیگز اور ڈاؤن لوڈ مددگار'
                              : 'Viral captions, hashtags & media assistant'}
                          </p>
                        </div>
                      </div>
                      <ChevronRight className={`w-4 h-4 shrink-0 ${subTextClass}`} />
                    </button>
                  )}

                  {onOpenCreatorProfile && (
                    <button
                      type="button"
                      onClick={() => handleMoreAction(() => onOpenCreatorProfile())}
                      id="menu-item-creator-tools"
                      className={`w-full flex items-center justify-between p-4 rounded-2xl border transition-colors cursor-pointer text-left min-h-[68px] ${
                        isLight
                          ? 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-900'
                          : 'bg-[#111827] hover:bg-slate-800/90 border-slate-800 text-slate-100'
                      }`}
                    >
                      <div className="flex items-center gap-3.5 min-w-0">
                        <div className="w-10 h-10 rounded-xl bg-rose-500/15 text-rose-500 flex items-center justify-center shrink-0">
                          <UserCheck className="w-5 h-5" />
                        </div>
                        <div className="min-w-0">
                          <div className="text-sm font-bold truncate">
                            {lang === 'ur' ? 'کریئیٹر ٹولز (Creator Tools)' : 'Creator Tools'}
                          </div>
                          <p className={`text-xs truncate mt-0.5 ${subTextClass}`}>
                            {lang === 'ur'
                              ? 'پروفائل ویڈیوز اور بلک لوڈر'
                              : 'Creator profile videos & bulk loader'}
                          </p>
                        </div>
                      </div>
                      <ChevronRight className={`w-4 h-4 shrink-0 ${subTextClass}`} />
                    </button>
                  )}

                  <div
                    className={`w-full p-4 rounded-2xl border transition-colors text-left space-y-2.5 flex flex-col justify-between ${
                      isLight
                        ? 'bg-slate-50 border-slate-200 text-slate-900'
                        : 'bg-[#111827] border-slate-800 text-slate-100'
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => handleMoreAction(onOpenDrive)}
                      id="menu-item-drive"
                      className="w-full flex items-center justify-between cursor-pointer text-left"
                    >
                      <div className="flex items-center gap-3.5 min-w-0">
                        <div className="w-10 h-10 rounded-xl bg-amber-500/15 text-amber-500 flex items-center justify-center shrink-0">
                          <HardDrive className="w-5 h-5" />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="text-sm font-bold truncate">{t.googleDrive}</span>
                            <span
                              className={`w-2 h-2 rounded-full shrink-0 ${
                                user ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'
                              }`}
                              aria-hidden="true"
                            />
                          </div>
                          <p className={`text-xs truncate mt-0.5 ${subTextClass}`}>
                            {user
                              ? `${user.email || t.driveConnected} · Persistent`
                              : lang === 'ur'
                              ? 'منقطع · کلاؤڈ اسٹوریج پر بیک اپ'
                              : 'Disconnected · Save directly to Google Drive'}
                          </p>
                        </div>
                      </div>
                      <ChevronRight className={`w-4 h-4 shrink-0 ${subTextClass}`} />
                    </button>

                    {/* Inline Session Controls: Re-authorize & Logout */}
                    <div className="flex items-center gap-2 pt-2 border-t border-slate-200/70 dark:border-slate-800">
                      <button
                        type="button"
                        onClick={handleHeaderReauthorizeDrive}
                        disabled={isDriveBusy}
                        className="flex-1 py-1.5 px-3 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
                      >
                        <KeyRound className={`w-3.5 h-3.5 ${isDriveBusy ? 'animate-spin' : ''}`} />
                        <span>{lang === 'ur' ? 'دوبارہ تصدیق (Re-authorize)' : 'Re-authorize'}</span>
                      </button>
                      {user && (
                        <button
                          type="button"
                          onClick={handleHeaderLogoutDrive}
                          disabled={isDriveBusy}
                          className="py-1.5 px-3 rounded-lg bg-rose-600/15 hover:bg-rose-600/25 text-rose-500 text-xs font-semibold flex items-center justify-center gap-1 cursor-pointer transition-colors"
                        >
                          <LogOut className="w-3.5 h-3.5" />
                          <span>{lang === 'ur' ? 'لاگ آؤٹ' : 'Logout'}</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* CATEGORY 2: EXPLORE */}
              <div className="space-y-3">
                <div className={`text-xs sm:text-sm font-bold px-1 ${subTextClass}`}>
                  {lang === 'ur' ? 'ایکسپلور (Explore)' : 'Explore'}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  {onSelectTab && (
                    <button
                      type="button"
                      onClick={() =>
                        handleMoreAction(() => {
                          onSelectTab('platforms');
                          window.scrollTo({ top: 0, behavior: 'smooth' });
                        })
                      }
                      id="menu-item-supported-platforms"
                      className={`w-full flex items-center justify-between p-4 rounded-2xl border transition-colors cursor-pointer text-left min-h-[68px] ${
                        isLight
                          ? 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-900'
                          : 'bg-[#111827] hover:bg-slate-800/90 border-slate-800 text-slate-100'
                      }`}
                    >
                      <div className="flex items-center gap-3.5 min-w-0">
                        <div className="w-10 h-10 rounded-xl bg-sky-500/15 text-sky-500 flex items-center justify-center shrink-0">
                          <Compass className="w-5 h-5" />
                        </div>
                        <div className="min-w-0">
                          <div className="text-sm font-bold truncate">
                            {lang === 'ur'
                              ? 'سپورٹڈ پلیٹ فارمز (Supported Platforms)'
                              : 'Supported Platforms'}
                          </div>
                          <p className={`text-xs truncate mt-0.5 ${subTextClass}`}>
                            {lang === 'ur'
                              ? 'TikTok، Instagram، YouTube، Facebook اور دیگر'
                              : 'View all supported social platforms & sample links'}
                          </p>
                        </div>
                      </div>
                      <ChevronRight className={`w-4 h-4 shrink-0 ${subTextClass}`} />
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => handleMoreAction(onOpenGuide)}
                    id="menu-item-guide"
                    className={`w-full flex items-center justify-between p-4 rounded-2xl border transition-colors cursor-pointer text-left min-h-[68px] ${
                      isLight
                        ? 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-900'
                        : 'bg-[#111827] hover:bg-slate-800/90 border-slate-800 text-slate-100'
                    }`}
                  >
                    <div className="flex items-center gap-3.5 min-w-0">
                      <div className="w-10 h-10 rounded-xl bg-teal-500/15 text-teal-500 flex items-center justify-center shrink-0">
                        <HelpCircle className="w-5 h-5" />
                      </div>
                      <div className="min-w-0">
                        <div className="text-sm font-bold truncate">{t.howToDownload}</div>
                        <p className={`text-xs truncate mt-0.5 ${subTextClass}`}>
                          {lang === 'ur'
                            ? 'سوشل ایپس سے لنک کاپی اور ڈاؤن لوڈ گائیڈ'
                            : 'Step-by-step platform download guides'}
                        </p>
                      </div>
                    </div>
                    <ChevronRight className={`w-4 h-4 shrink-0 ${subTextClass}`} />
                  </button>

                  {onOpenFrequentlyDownloaded && (
                    <button
                      type="button"
                      onClick={() => handleMoreAction(onOpenFrequentlyDownloaded)}
                      id="menu-item-frequently-downloaded"
                      className={`w-full flex items-center justify-between p-4 rounded-2xl border transition-colors cursor-pointer text-left min-h-[68px] ${
                        isLight
                          ? 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-900'
                          : 'bg-[#111827] hover:bg-slate-800/90 border-slate-800 text-slate-100'
                      }`}
                    >
                      <div className="flex items-center gap-3.5 min-w-0">
                        <div className="w-10 h-10 rounded-xl bg-pink-500/15 text-pink-500 flex items-center justify-center shrink-0">
                          <Bookmark className="w-5 h-5" />
                        </div>
                        <div className="min-w-0">
                          <div className="text-sm font-bold truncate">
                            {lang === 'ur'
                              ? 'فریکوینٹلی ڈاؤن لوڈڈ (Frequently Downloaded)'
                              : 'Frequently Downloaded'}
                          </div>
                          <p className={`text-xs truncate mt-0.5 ${subTextClass}`}>
                            {lang === 'ur'
                              ? `محفوظ کردہ پروفائلز (${frequentlyDownloadedCount})`
                              : `Saved creator profiles (${frequentlyDownloadedCount})`}
                          </p>
                        </div>
                      </div>
                      <ChevronRight className={`w-4 h-4 shrink-0 ${subTextClass}`} />
                    </button>
                  )}

                  {onSelectTab && (
                    <button
                      type="button"
                      onClick={() =>
                        handleMoreAction(() => {
                          onSelectTab('community');
                          window.scrollTo({ top: 0, behavior: 'smooth' });
                        })
                      }
                      id="menu-item-community"
                      className={`w-full flex items-center justify-between p-4 rounded-2xl border transition-colors cursor-pointer text-left min-h-[68px] ${
                        isLight
                          ? 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-900'
                          : 'bg-[#111827] hover:bg-slate-800/90 border-slate-800 text-slate-100'
                      }`}
                    >
                      <div className="flex items-center gap-3.5 min-w-0">
                        <div className="w-10 h-10 rounded-xl bg-blue-500/15 text-blue-500 flex items-center justify-center shrink-0">
                          <MessageSquare className="w-5 h-5" />
                        </div>
                        <div className="min-w-0">
                          <div className="text-sm font-bold truncate">
                            {lang === 'ur' ? 'کمیونٹی اور رائے (Community)' : 'Community'}
                          </div>
                          <p className={`text-xs truncate mt-0.5 ${subTextClass}`}>
                            {lang === 'ur'
                              ? 'صارفین کی رائے اور تبصرے پڑھیں'
                              : 'Read user reviews & share feedback'}
                          </p>
                        </div>
                      </div>
                      <ChevronRight className={`w-4 h-4 shrink-0 ${subTextClass}`} />
                    </button>
                  )}
                </div>
              </div>

              {/* CATEGORY 3: APP */}
              {onOpenInstall && (
                <div className="space-y-3">
                  <div className={`text-xs sm:text-sm font-bold px-1 ${subTextClass}`}>
                    {lang === 'ur' ? 'ایپ (App)' : 'App'}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    <a
                      href="https://mediaflow-hd.ai.studio"
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={() => setMoreDrawerOpen(false)}
                      id="menu-item-install"
                      className={`w-full flex items-center justify-between p-4 rounded-2xl border transition-all cursor-pointer text-left min-h-[68px] ${
                        isLight
                          ? 'bg-emerald-50/70 hover:bg-emerald-100/80 border-emerald-200 text-slate-900'
                          : 'bg-emerald-950/25 hover:bg-emerald-900/35 border-emerald-500/35 text-slate-100'
                      }`}
                    >
                      <div className="flex items-center gap-3.5 min-w-0">
                        <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                          <Download className="w-5 h-5" />
                        </div>
                        <div className="min-w-0">
                          <span className="text-sm font-mono font-bold text-emerald-500 underline underline-offset-4 truncate block">
                            https://mediaflow-hd.ai.studio
                          </span>
                          <p className={`text-xs truncate mt-0.5 ${subTextClass}`}>
                            {lang === 'ur'
                              ? 'نئے ٹیب میں کھول کر ایپ ڈاؤن لوڈ کریں'
                              : 'Open in a new Chrome tab to download the app'}
                          </p>
                        </div>
                      </div>
                      <ChevronRight className="w-4 h-4 shrink-0 text-emerald-500" />
                    </a>
                  </div>
                </div>
              )}
            </div>
          </div>
        </aside>
      )}

      {/* =====================================================================
          SETTINGS DRAWER (Full-Page View on Mobile & Laptop: Appearance, Language, Downloads, Privacy)
         ===================================================================== */}
      {settingsDrawerOpen && (
        <aside
          ref={settingsRef}
          id="mediaflow-side-drawer"
          aria-label={lang === 'ur' ? 'سیٹنگز (Settings)' : 'Settings'}
          className={`fixed inset-x-0 top-0 bottom-16 z-[70] w-screen h-[calc(100dvh-4rem)] flex flex-col overflow-hidden animate-fade-in transition-colors duration-200 ${
            isLight
              ? 'bg-white text-slate-900'
              : 'bg-[#0b0f19] text-slate-100'
          }`}
        >
          {/* Full-Width Page Header (div:nth-of-type(1)) */}
          <div
            className={`w-full px-4 sm:px-8 py-3.5 border-b shrink-0 ${
              isLight ? 'bg-white border-slate-200' : 'bg-[#0b0f19] border-slate-800'
            }`}
          >
            <div className="max-w-6xl mx-auto flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-xs shrink-0">
                  <Settings className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-bold">
                    {t.settingsAndTools}
                  </h3>
                  <p className={`text-[11px] sm:text-xs ${subTextClass}`}>
                    {lang === 'ur'
                      ? 'تھیم، زبان، ڈاؤن لوڈ اور پرائیویسی ترتیبات'
                      : lang === 'es'
                      ? 'Apariencia, idioma, descargas y automatización'
                      : lang === 'fr'
                      ? 'Apparence, langue, téléchargements et automatisation'
                      : lang === 'hi'
                      ? 'दिखावट, भाषा, डाउनलोड और ऑटोमेशन सेटिंग्स'
                      : 'Appearance, language, downloads & automation'}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setSettingsDrawerOpen(false)}
                className={`w-9 h-9 rounded-xl flex items-center justify-center border transition-colors cursor-pointer shrink-0 ${
                  isLight
                    ? 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200'
                    : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700'
                }`}
                id="close-menu-dropdown-btn"
                title={t.close}
                aria-label={t.close}
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Full-Page Settings Body (div:nth-of-type(2)) */}
          <div className="flex-1 w-full px-4 sm:px-8 py-5 pb-24 overflow-y-auto">
            <div className="max-w-6xl mx-auto space-y-6">
              {/* 1. APPEARANCE & LANGUAGE */}
              <div className="space-y-3">
                <div className={`text-xs sm:text-sm font-bold px-1 ${subTextClass}`}>
                  {lang === 'ur'
                    ? 'ظاہری شکل اور زبان (Appearance & Language)'
                    : lang === 'es'
                    ? 'Apariencia e Idioma'
                    : lang === 'fr'
                    ? 'Apparence et Langue'
                    : lang === 'hi'
                    ? 'दिखावट और भाषा (Appearance & Language)'
                    : 'Appearance & Language'}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                  {/* Direct Light / Dark Mode Switch */}
                  <div
                    className={`p-4 rounded-2xl border flex items-center justify-between gap-3 ${cardSurfaceClass}`}
                  >
                    <div className="flex items-center gap-3">
                      {isLight ? (
                        <Sun className="w-5 h-5 text-amber-500 shrink-0" />
                      ) : (
                        <Moon className="w-5 h-5 text-sky-400 shrink-0" />
                      )}
                      <div>
                        <div className="text-sm font-bold">
                          {t.themeMode}
                        </div>
                        <div className={`text-xs mt-0.5 ${subTextClass}`}>
                          {isLight ? t.lightMode : t.darkMode}
                        </div>
                      </div>
                    </div>

                    <div
                      className={`flex items-center gap-1 p-1 rounded-lg border ${
                        isLight ? 'bg-white border-slate-200' : 'bg-[#0b0f19] border-slate-800'
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => onSelectTheme && onSelectTheme('dark')}
                        className={`px-2.5 py-1 rounded-md text-xs font-semibold flex items-center gap-1 cursor-pointer transition-colors ${
                          !isLight
                            ? 'bg-slate-800 text-white'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        <Moon className="w-3.5 h-3.5" />
                        <span>{t.darkMode}</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => onSelectTheme && onSelectTheme('light')}
                        className={`px-2.5 py-1 rounded-md text-xs font-semibold flex items-center gap-1 cursor-pointer transition-colors ${
                          isLight
                            ? 'bg-slate-900 text-white'
                            : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        <Sun className="w-3.5 h-3.5" />
                        <span>{t.lightMode}</span>
                      </button>
                    </div>
                  </div>

                  {/* Multi-Language Switcher (English, Urdu, Spanish, French, Hindi) */}
                  <div
                    className={`flex flex-col justify-between gap-3 p-4 rounded-2xl border ${cardSurfaceClass}`}
                    id="settings-language-selector-card"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <Globe className="w-5 h-5 text-sky-500 shrink-0" />
                        <div>
                          <div className="text-sm font-bold">{t.languageSelection}</div>
                          <div className={`text-xs mt-0.5 ${subTextClass}`}>
                            {(() => {
                              const activeLangMeta =
                                LANGUAGE_OPTIONS.find((item) => item.code === lang) ||
                                LANGUAGE_OPTIONS[0];
                              return `${activeLangMeta.nativeName} (${activeLangMeta.name})`;
                            })()}
                          </div>
                        </div>
                      </div>
                      <span className="px-2 py-0.5 rounded-md text-[11px] font-mono font-bold bg-sky-500/15 text-sky-400 border border-sky-500/30 uppercase">
                        {lang}
                      </span>
                    </div>

                    <div
                      className={`grid grid-cols-5 gap-1.5 p-1.5 rounded-xl border ${
                        isLight ? 'bg-white border-slate-200' : 'bg-[#0b0f19] border-slate-800'
                      }`}
                      role="group"
                      aria-label={t.languageSelection}
                    >
                      {LANGUAGE_OPTIONS.map((langOpt) => {
                        const isSelected = lang === langOpt.code;
                        return (
                          <button
                            key={langOpt.code}
                            type="button"
                            onClick={() => {
                              if (onSelectLang) {
                                onSelectLang(langOpt.code);
                              } else if (lang !== langOpt.code) {
                                onToggleLang();
                              }
                            }}
                            aria-pressed={isSelected}
                            className={`px-2 py-2 rounded-lg text-xs font-bold cursor-pointer transition-all flex flex-col items-center justify-center gap-0.5 ${
                              isSelected
                                ? 'bg-sky-600 text-white shadow-xs'
                                : isLight
                                ? 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                                : 'text-slate-400 hover:text-white hover:bg-slate-800/70'
                            }`}
                            id={`dropdown-lang-${langOpt.code}-btn`}
                            title={`${langOpt.nativeName} (${langOpt.name})`}
                          >
                            <span className="leading-tight truncate max-w-full">
                              {langOpt.nativeName}
                            </span>
                            <span
                              className={`text-[10px] font-medium leading-none ${
                                isSelected ? 'text-sky-100' : subTextClass
                              }`}
                            >
                              {langOpt.name}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* Theme Palette Selector */}
                <div
                  className={`rounded-2xl border overflow-hidden transition-all ${cardSurfaceClass}`}
                  id="settings-theme-selector-card"
                >
                  <button
                    type="button"
                    onClick={() => setIsThemesExpanded((prev) => !prev)}
                    aria-expanded={isThemesExpanded}
                    id="settings-themes-toggle-btn"
                    className="w-full p-4 flex items-center justify-between gap-2.5 text-left rtl:text-right cursor-pointer"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <Palette className="w-5 h-5 text-rose-500 shrink-0" />
                      <div className="min-w-0">
                        <div className="text-sm font-bold">
                          {lang === 'ur' ? 'تھیم پیلیٹ (Theme)' : 'Theme Palette'}
                        </div>
                        <div className={`text-xs truncate mt-0.5 ${subTextClass}`}>
                          {lang === 'ur' ? activeThemeMeta.nameUr : activeThemeMeta.nameEn}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <div className="flex items-center gap-1">
                        {activeThemeMeta.dots.map((dotColor, dIdx) => (
                          <span
                            key={`active_dot_${dIdx}`}
                            className="w-2.5 h-2.5 rounded-full border border-slate-400/40"
                            style={{ backgroundColor: dotColor }}
                          />
                        ))}
                      </div>
                      {isThemesExpanded ? (
                        <ChevronUp className="w-4 h-4" />
                      ) : (
                        <ChevronDown className="w-4 h-4" />
                      )}
                    </div>
                  </button>

                  {isThemesExpanded && (
                    <div
                      className={`px-4 pb-4 pt-3 border-t space-y-2.5 ${
                        isLight ? 'border-slate-200' : 'border-slate-800'
                      }`}
                    >
                      <div
                        className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5"
                        id="settings-theme-selector-grid"
                      >
                        {APP_THEMES.map((tOption) => {
                          const isSelected = theme === tOption.id;
                          return (
                            <button
                              key={`settings_theme_${tOption.id}`}
                              type="button"
                              id={`theme-option-${tOption.id}`}
                              onClick={() => {
                                if (onSelectTheme) {
                                  onSelectTheme(tOption.id);
                                } else {
                                  onToggleTheme();
                                }
                              }}
                              className={`p-3 rounded-xl border text-left rtl:text-right transition-all cursor-pointer flex flex-col gap-1.5 ${
                                isSelected
                                  ? 'bg-rose-600 text-white border-rose-500'
                                  : isLight
                                  ? 'bg-white hover:bg-slate-100 text-slate-800 border-slate-200'
                                  : 'bg-[#0b0f19] hover:bg-slate-800 text-slate-200 border-slate-800'
                              }`}
                            >
                              <div className="flex items-center justify-between gap-1.5 w-full">
                                <div className="flex items-center gap-1">
                                  {tOption.dots.map((dotColor, dIdx) => (
                                    <span
                                      key={`dot_${tOption.id}_${dIdx}`}
                                      className="w-2.5 h-2.5 rounded-full border border-white/30 shrink-0"
                                      style={{ backgroundColor: dotColor }}
                                    />
                                  ))}
                                </div>
                                {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                              </div>
                              <div className="text-xs font-bold truncate">
                                {lang === 'ur' ? tOption.nameUr : tOption.nameEn}
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* 1B. BROWSER & ALL-PLATFORMS SEARCH SETTINGS */}
              <div className="space-y-3" id="settings-browser-all-platforms-section">
                <div className="flex flex-wrap items-center justify-between gap-2 px-1">
                  <div className={`text-xs sm:text-sm font-bold flex items-center gap-2 ${subTextClass}`}>
                    <Globe className="w-4 h-4 text-sky-500" />
                    <span>
                      {lang === 'ur'
                        ? 'براؤزر اور تمام پلیٹ فارمز کی سرچ سیٹنگز (All Platforms Search Settings)'
                        : 'Browser & All-Platforms Search Settings'}
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={handleEnableAllBrowserPlatforms}
                    className="px-3 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-colors"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>
                      {lang === 'ur'
                        ? 'سب 12 پلیٹ فارمز آن کریں (Enable All)'
                        : 'Enable All 12 Platforms'}
                    </span>
                  </button>
                </div>

                <div className={`p-4 rounded-2xl border space-y-3.5 ${cardSurfaceClass}`}>
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <div className="text-sm font-bold">
                        {lang === 'ur'
                          ? 'سب پلیٹ فارمز کی ویڈیوز ایک ساتھ دکھائیں (Mix All Platforms)'
                          : 'Mix All Platforms Together in Browser Search'}
                      </div>
                      <div className={`text-xs mt-0.5 ${subTextClass}`}>
                        {lang === 'ur'
                          ? 'براؤزر میں سرچ کرنے پر YouTube, TikTok, Instagram, Facebook, Pinterest وغیرہ سب کی ویڈیوز ایک ساتھ دکھائیں'
                          : 'Show videos from YouTube, TikTok, Instagram, Facebook, Pinterest, and all enabled platforms together'}
                      </div>
                    </div>

                    <button
                      type="button"
                      role="switch"
                      aria-checked={browserSettings.mixAllPlatformsTogether}
                      onClick={() => {
                        const updated: BrowserSearchSettings = {
                          ...browserSettings,
                          mixAllPlatformsTogether: !browserSettings.mixAllPlatformsTogether,
                        };
                        setBrowserSettings(updated);
                        saveBrowserSearchSettings(updated);
                      }}
                      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full p-0.5 transition-colors ${
                        browserSettings.mixAllPlatformsTogether
                          ? 'bg-emerald-600'
                          : 'bg-slate-400 dark:bg-slate-700'
                      }`}
                    >
                      <span
                        className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform ${
                          browserSettings.mixAllPlatformsTogether
                            ? 'translate-x-5'
                            : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>

                  {/* Grid of all 12 Platforms */}
                  <div
                    className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2"
                    dir="ltr"
                  >
                    {ALL_BROWSER_PLATFORMS.map((plat) => {
                      const isEnabled = browserSettings.enabledPlatforms[plat.id] !== false;
                      return (
                        <button
                          key={`drawer_plat_${plat.id}`}
                          type="button"
                          onClick={() => handleToggleBrowserPlatform(plat.id)}
                          className={`p-2.5 rounded-xl border text-left flex items-center justify-between gap-2 cursor-pointer transition-all ${
                            isEnabled
                              ? isLight
                                ? 'bg-sky-50 border-sky-400 text-slate-900'
                                : 'bg-sky-500/15 border-sky-500/60 text-white'
                              : isLight
                              ? 'bg-white border-slate-200 text-slate-400'
                              : 'bg-[#0b0f19] border-slate-800 text-slate-500'
                          }`}
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${plat.dotColor}`} />
                            <span className="text-xs font-bold truncate">{plat.label}</span>
                          </div>
                          <span
                            className={`w-5 h-5 rounded-md flex items-center justify-center shrink-0 text-[10px] font-bold ${
                              isEnabled
                                ? 'bg-emerald-500 text-slate-950'
                                : 'bg-slate-700/30 text-slate-400'
                            }`}
                          >
                            {isEnabled ? <Check className="w-3.5 h-3.5 stroke-[3]" /> : 'Off'}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* 2. DOWNLOADS */}
              <div className="space-y-3">
                <div className={`text-xs sm:text-sm font-bold px-1 ${subTextClass}`}>
                  {lang === 'ur' ? 'ڈاؤن لوڈ ترتیبات (Downloads)' : 'Downloads'}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                  {/* No Watermark Toggle */}
                  {onToggleWatermark && (
                    <div
                      className={`flex items-center justify-between p-4 rounded-2xl border ${cardSurfaceClass}`}
                      id="settings-watermark-card"
                    >
                      <div className="flex items-center gap-3 pr-2">
                        <ShieldCheck
                          className={`w-5 h-5 shrink-0 ${
                            removeWatermark ? 'text-emerald-500' : subTextClass
                          }`}
                        />
                        <div>
                          <div className="text-sm font-bold">
                            {lang === 'ur'
                              ? 'واٹر مارک کے بغیر (No Watermark · Clean HD)'
                              : 'No Watermark (Clean HD)'}
                          </div>
                          <div className={`text-xs mt-0.5 ${subTextClass}`}>
                            {removeWatermark
                              ? lang === 'ur'
                                ? 'ویڈیوز واٹر مارک کے بغیر صاف HD کوالٹی میں ڈاؤن لوڈ ہوں گی'
                                : 'Videos download clean without watermarks'
                              : lang === 'ur'
                              ? 'اصل سورس اسٹریم (واٹر مارک سمیت)'
                              : 'Original stream with watermark'}
                          </div>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => onToggleWatermark(!removeWatermark)}
                        role="switch"
                        aria-checked={removeWatermark}
                        id="watermark-toggle-btn"
                        className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full p-0.5 transition-colors ${
                          removeWatermark ? 'bg-emerald-600' : 'bg-slate-400 dark:bg-slate-700'
                        }`}
                      >
                        <span
                          className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform ${
                            removeWatermark ? 'translate-x-5' : 'translate-x-0'
                          }`}
                        />
                      </button>
                    </div>
                  )}

                  {/* File Size Unit (MB / KB) */}
                  {onToggleFileSizeUnit && (
                    <div
                      className={`p-4 rounded-2xl border space-y-2.5 ${cardSurfaceClass}`}
                      id="settings-file-size-unit-card"
                    >
                      <div className="flex items-center justify-between gap-2.5">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-8 h-8 rounded-lg bg-sky-500/15 text-sky-500 flex items-center justify-center shrink-0 font-mono text-xs font-bold">
                            {fileSizeUnit}
                          </div>
                          <div className="min-w-0">
                            <div className="text-sm font-bold">
                              {lang === 'ur'
                                ? 'فائل سائز یونٹ (File Size Unit: MB / KB)'
                                : 'File Size Display Unit (MB / KB)'}
                            </div>
                            <div className={`text-xs mt-0.5 ${subTextClass}`}>
                              {lang === 'ur'
                                ? 'چھوٹی فائلوں کی بہتر پیمائش کے لیے MB یا KB منتخب کریں'
                                : 'Switch between MB or KB for precision'}
                            </div>
                          </div>
                        </div>

                        <button
                          type="button"
                          role="switch"
                          aria-checked={fileSizeUnit === 'KB'}
                          aria-label="Display file sizes in KB instead of MB"
                          id="settings-file-size-unit-toggle"
                          onClick={() =>
                            onToggleFileSizeUnit(fileSizeUnit === 'MB' ? 'KB' : 'MB')
                          }
                          className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full p-0.5 transition-colors ${
                            fileSizeUnit === 'KB' ? 'bg-sky-600' : 'bg-emerald-600'
                          }`}
                        >
                          <span
                            className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform ${
                              fileSizeUnit === 'KB' ? 'translate-x-5' : 'translate-x-0'
                            }`}
                          />
                        </button>
                      </div>

                      <div className="grid grid-cols-2 gap-1.5" role="group" aria-label="File Size Unit Selection">
                        <button
                          type="button"
                          id="file-size-unit-mb-btn"
                          aria-pressed={fileSizeUnit === 'MB'}
                          onClick={() => onToggleFileSizeUnit('MB')}
                          className={`py-1.5 px-2.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer border ${
                            fileSizeUnit === 'MB'
                              ? 'bg-emerald-600 text-white border-emerald-600'
                              : isLight
                              ? 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                              : 'bg-[#0b0f19] text-slate-300 border-slate-800 hover:bg-slate-800'
                          }`}
                        >
                          MB (Standard)
                        </button>

                        <button
                          type="button"
                          id="file-size-unit-kb-btn"
                          aria-pressed={fileSizeUnit === 'KB'}
                          onClick={() => onToggleFileSizeUnit('KB')}
                          className={`py-1.5 px-2.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer border ${
                            fileSizeUnit === 'KB'
                              ? 'bg-sky-600 text-white border-sky-600'
                              : isLight
                              ? 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                              : 'bg-[#0b0f19] text-slate-300 border-slate-800 hover:bg-slate-800'
                          }`}
                        >
                          KB (Precision)
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Download Speed Cap */}
                  {onChangeDownloadSpeedCap && (
                    <div
                      className={`p-4 rounded-2xl border space-y-2.5 ${cardSurfaceClass}`}
                      id="settings-download-speed-cap"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <Zap className="w-4 h-4 text-sky-500 shrink-0" />
                          <span className="text-sm font-bold">
                            {lang === 'ur' ? 'ڈاؤنلوڈ سپیڈ لمٹ' : 'Download Speed Cap'}
                          </span>
                        </div>
                        <span className="text-xs font-mono font-semibold text-sky-500">
                          {downloadSpeedCap === 'unlimited'
                            ? lang === 'ur'
                              ? 'لامحدود'
                              : 'Unlimited'
                            : downloadSpeedCap === '0.5'
                            ? '500 KB/s'
                            : `${downloadSpeedCap} MB/s`}
                        </span>
                      </div>

                      <div className="grid grid-cols-3 gap-1.5">
                        {(
                          [
                            { val: '0.5', label: '500 KB/s' },
                            { val: '1', label: '1 MB/s' },
                            { val: '2', label: '2 MB/s' },
                            { val: '5', label: '5 MB/s' },
                            { val: '10', label: '10 MB/s' },
                            { val: 'unlimited', label: lang === 'ur' ? 'Unlimited' : 'Unlimited' },
                          ] as { val: DownloadSpeedCap; label: string }[]
                        ).map((item) => (
                          <button
                            key={`speed_cap_${item.val}`}
                            type="button"
                            onClick={() => onChangeDownloadSpeedCap(item.val)}
                            id={`speed-cap-btn-${item.val}`}
                            className={`py-1.5 px-2 rounded-lg text-[11px] font-semibold transition-colors cursor-pointer border ${
                              downloadSpeedCap === item.val
                                ? 'bg-sky-600 text-white border-sky-600'
                                : isLight
                                ? 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                                : 'bg-[#0b0f19] text-slate-300 border-slate-800 hover:bg-slate-800'
                            }`}
                          >
                            {item.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Max Auto Download Size */}
                  {onChangeMaxAutoDownloadSize && (
                    <div className={`p-4 rounded-2xl border space-y-2.5 ${cardSurfaceClass}`}>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Gauge className="w-4 h-4 text-sky-500" />
                          <span className="text-sm font-bold">{t.maxAutoDownloadSize}</span>
                        </div>
                        <span className="text-xs font-mono text-sky-500 font-bold">
                          {maxAutoDownloadSize === 'unlimited' ? '∞' : `${maxAutoDownloadSize} MB`}
                        </span>
                      </div>
                      <div className="grid grid-cols-4 gap-1.5 pt-1">
                        {(['25', '50', '100', '250', '500', '1000', 'unlimited'] as MaxAutoDownloadSize[]).map(
                          (val, idx) => (
                            <button
                              key={`max_size_${val}_${idx}`}
                              type="button"
                              onClick={() => onChangeMaxAutoDownloadSize(val)}
                              className={`py-1.5 px-1.5 rounded-lg text-[11px] font-semibold cursor-pointer border ${
                                maxAutoDownloadSize === val
                                  ? 'bg-sky-600 text-white border-sky-600'
                                  : isLight
                                  ? 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                                  : 'bg-[#0b0f19] text-slate-300 border-slate-800 hover:bg-slate-800'
                              }`}
                            >
                              {val === 'unlimited' ? 'No Limit' : val === '1000' ? '1 GB' : `${val}M`}
                            </button>
                          )
                        )}
                      </div>
                    </div>
                  )}

                  {/* Auto-Clear Configuration */}
                  {onChangeAutoClearDuration && (
                    <div
                      className={`p-4 rounded-2xl border space-y-3 ${cardSurfaceClass}`}
                      id="settings-auto-clear-menu"
                    >
                      <div
                        className="flex items-center justify-between gap-2"
                        id="settings-clear-successfully-finished-row"
                      >
                        <div className="min-w-0">
                          <div className="text-sm font-bold">
                            {lang === 'ur'
                              ? 'مکمل شدہ خودکار صاف کریں (Auto-Clear)'
                              : 'Clear Successfully Finished'}
                          </div>
                          <div className={`text-xs mt-0.5 ${subTextClass}`}>
                            {lang === 'ur'
                              ? 'مکمل شدہ آئٹمز کو قطار سے ہٹائیں اور ہسٹری میں محفوظ رکھیں'
                              : 'Remove finished items from queue while keeping in History'}
                          </div>
                        </div>

                        <button
                          type="button"
                          role="switch"
                          aria-checked={clearSuccessfullyFinished}
                          aria-label="Clear Successfully Finished"
                          id="settings-clear-successfully-finished-toggle"
                          onClick={() => {
                            const nextState = !clearSuccessfullyFinished;
                            if (onToggleClearSuccessfullyFinished) {
                              onToggleClearSuccessfullyFinished(nextState);
                            } else if (onChangeAutoClearRetentionMode) {
                              onChangeAutoClearRetentionMode(
                                nextState ? 'clear_finished' : 'keep_for_history'
                              );
                            }
                          }}
                          className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full p-0.5 transition-colors ${
                            clearSuccessfullyFinished
                              ? 'bg-emerald-600'
                              : 'bg-slate-400 dark:bg-slate-700'
                          }`}
                        >
                          <span
                            className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform ${
                              clearSuccessfullyFinished ? 'translate-x-5' : 'translate-x-0'
                            }`}
                          />
                        </button>
                      </div>

                      <div className="flex items-center gap-2">
                        <select
                          id="settings-auto-clear-select"
                          aria-label="Auto-Clear Retention Time"
                          value={autoClearDuration}
                          onChange={(e) =>
                            onChangeAutoClearDuration(e.target.value as AutoClearDuration)
                          }
                          className={`flex-1 border rounded-lg px-2.5 py-1.5 text-xs font-semibold cursor-pointer outline-none ${
                            isLight
                              ? 'bg-white border-slate-200 text-slate-800'
                              : 'bg-[#0b0f19] border-slate-800 text-slate-200'
                          }`}
                        >
                          <option value="never">
                            {lang === 'ur' ? 'کبھی نہیں — آٹو کلیئر بند' : 'Never — Auto-Clear Off'}
                          </option>
                          <option value="1">{lang === 'ur' ? '1 منٹ بعد' : 'After 1 Minute'}</option>
                          <option value="5">{lang === 'ur' ? '5 منٹ بعد' : 'After 5 Minutes'}</option>
                          <option value="15">{lang === 'ur' ? '15 منٹ بعد' : 'After 15 Minutes'}</option>
                          <option value="30">{lang === 'ur' ? '30 منٹ بعد' : 'After 30 Minutes'}</option>
                          <option value="60">{lang === 'ur' ? '1 گھنٹہ بعد' : 'After 1 Hour'}</option>
                          <option value="360">{lang === 'ur' ? '6 گھنٹے بعد' : 'After 6 Hours'}</option>
                          <option value="1440">{lang === 'ur' ? '1 دن بعد' : 'After 1 Day'}</option>
                          <option value="10080">{lang === 'ur' ? '7 دن بعد' : 'After 7 Days'}</option>
                        </select>

                        {onClearCompletedNow && (
                          <button
                            type="button"
                            onClick={onClearCompletedNow}
                            id="settings-clear-finished-now-btn"
                            className="px-2.5 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold flex items-center gap-1 shrink-0 cursor-pointer transition-colors"
                          >
                            <Trash2 className="w-3 h-3" />
                            <span>{lang === 'ur' ? 'صاف کریں' : 'Clear Now'}</span>
                          </button>
                        )}
                      </div>

                      {onDeleteOlderThan7Days && (
                        <button
                          type="button"
                          onClick={onDeleteOlderThan7Days}
                          id="settings-delete-older-than-7-days-btn"
                          className={`w-full py-2 px-3 rounded-lg border text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer transition-colors ${
                            isLight
                              ? 'bg-white hover:bg-slate-100 text-slate-700 border-slate-200'
                              : 'bg-[#0b0f19] hover:bg-slate-800 text-slate-300 border-slate-800'
                          }`}
                        >
                          <Trash2 className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                          <span>
                            {lang === 'ur'
                              ? '7 دن سے پرانی ہسٹری حذف کریں'
                              : 'Delete History Older Than 7 Days'}
                          </span>
                        </button>
                      )}
                    </div>
                  )}

                  {/* Export Downloads CSV */}
                  <div
                    className={`flex items-center justify-between p-4 rounded-2xl border ${cardSurfaceClass}`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <FileSpreadsheet className="w-5 h-5 text-emerald-500 shrink-0" />
                      <div className="min-w-0">
                        <div className="text-sm font-bold truncate">
                          {lang === 'ur' ? 'ڈاؤنلوڈ ریکارڈز CSV ایکسپورٹ' : 'Export Downloads CSV'}
                        </div>
                        <div className={`text-xs truncate mt-0.5 ${subTextClass}`}>
                          {lang === 'ur'
                            ? `${historyCount} محفوظ ریکارڈز`
                            : `${historyCount} saved records`}
                        </div>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => exportRecordsToCSV(activeDownloads, getSavedHistory())}
                      id="settings-export-history-csv-btn"
                      className="px-3.5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5 shrink-0 cursor-pointer transition-colors"
                    >
                      <FileDown className="w-3.5 h-3.5" />
                      <span>CSV</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* 3. PRIVACY & AUTOMATION */}
              <div className="space-y-3">
                <div className={`text-xs sm:text-sm font-bold px-1 ${subTextClass}`}>
                  {lang === 'ur'
                    ? 'پرائیویسی اور آٹومیشن (Privacy & Automation)'
                    : 'Privacy & Automation'}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                  {/* Clipboard Auto-Detect */}
                  <div
                    className={`flex items-center justify-between p-4 rounded-2xl border ${cardSurfaceClass}`}
                  >
                    <div className="flex items-center gap-3 pr-2">
                      {autoDetectClipboard ? (
                        <ClipboardCheck className="w-5 h-5 text-emerald-500 shrink-0" />
                      ) : (
                        <ClipboardX className={`w-5 h-5 shrink-0 ${subTextClass}`} />
                      )}
                      <div>
                        <div className="text-sm font-bold">{t.clipboardAutoDetect}</div>
                        <div className={`text-xs mt-0.5 ${subTextClass}`}>
                          {autoDetectClipboard ? t.autoDetectOn : t.autoDetectOff}
                        </div>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={onToggleAutoDetectClipboard}
                      role="switch"
                      aria-checked={autoDetectClipboard}
                      id="dropdown-clipboard-toggle-switch"
                      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full p-0.5 transition-colors ${
                        autoDetectClipboard ? 'bg-emerald-600' : 'bg-slate-400 dark:bg-slate-700'
                      }`}
                    >
                      <span
                        className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform ${
                          autoDetectClipboard ? 'translate-x-5' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>

                  {/* Desktop Notifications */}
                  <div className={`p-4 rounded-2xl border space-y-2.5 ${cardSurfaceClass}`}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3 pr-2">
                        {desktopNotifications ? (
                          <BellRing className="w-5 h-5 text-sky-500 shrink-0" />
                        ) : (
                          <BellOff className={`w-5 h-5 shrink-0 ${subTextClass}`} />
                        )}
                        <div>
                          <div className="text-sm font-bold">{t.desktopNotifications}</div>
                          <div className={`text-xs mt-0.5 ${subTextClass}`}>
                            {desktopNotifications
                              ? t.notificationsEnabled
                              : t.notificationsDisabled}
                          </div>
                        </div>
                      </div>
                      {onToggleDesktopNotifications && (
                        <button
                          type="button"
                          onClick={onToggleDesktopNotifications}
                          role="switch"
                          aria-checked={desktopNotifications}
                          id="dropdown-notifications-toggle-switch"
                          className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full p-0.5 transition-colors ${
                            desktopNotifications ? 'bg-sky-600' : 'bg-slate-400 dark:bg-slate-700'
                          }`}
                        >
                          <span
                            className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform ${
                              desktopNotifications ? 'translate-x-5' : 'translate-x-0'
                            }`}
                          />
                        </button>
                      )}
                    </div>
                    {desktopNotifications && onTestNotification && (
                      <button
                        type="button"
                        onClick={onTestNotification}
                        id="send-test-notification-btn"
                        className="w-full py-1.5 rounded-lg bg-sky-600/15 hover:bg-sky-600/25 text-sky-500 text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <Bell className="w-3.5 h-3.5" />
                        <span>{t.sendTestNotification}</span>
                      </button>
                    )}
                  </div>

                  {/* Floating Download Button */}
                  {onToggleFloatingButton && (
                    <div
                      className={`flex items-center justify-between p-4 rounded-2xl border ${cardSurfaceClass}`}
                      id="settings-floating-button-card"
                    >
                      <div className="flex items-center gap-3 pr-2">
                        <Download
                          className={`w-5 h-5 shrink-0 ${
                            enableFloatingButton ? 'text-sky-500' : subTextClass
                          }`}
                        />
                        <div>
                          <div className="text-sm font-bold">
                            {lang === 'ur'
                              ? 'فلوٹنگ ڈاؤنلوڈ بٹن فعال کریں'
                              : 'Enable Floating Button'}
                          </div>
                          <div className={`text-xs mt-0.5 ${subTextClass}`}>
                            {enableFloatingButton
                              ? lang === 'ur'
                                ? 'فلوٹنگ وجیٹ اسکرین پر فعال ہے'
                                : 'Floating quick-download overlay is visible'
                              : lang === 'ur'
                              ? 'اسکرین صاف رکھنے کے لیے پوشیدہ ہے'
                              : 'Hidden to keep main screen view clean'}
                          </div>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={onToggleFloatingButton}
                        role="switch"
                        aria-checked={enableFloatingButton}
                        id="settings-floating-button-toggle"
                        className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full p-0.5 transition-colors ${
                          enableFloatingButton ? 'bg-sky-600' : 'bg-slate-400 dark:bg-slate-700'
                        }`}
                      >
                        <span
                          className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform ${
                            enableFloatingButton ? 'translate-x-5' : 'translate-x-0'
                          }`}
                        />
                      </button>
                    </div>
                  )}

                  {/* Google Drive Authentication Status & Session Control in Settings */}
                  <div
                    className={`p-4 rounded-2xl border space-y-2.5 ${cardSurfaceClass}`}
                    id="settings-google-drive-session-card"
                  >
                    <div className="flex items-center justify-between gap-2.5">
                      <div className="flex items-center gap-3 min-w-0">
                        <HardDrive
                          className={`w-5 h-5 shrink-0 ${
                            user ? 'text-emerald-500' : subTextClass
                          }`}
                        />
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="text-sm font-bold">
                              {lang === 'ur'
                                ? 'گوگل ڈرائیو سیشن (Google Drive Auth)'
                                : 'Google Drive Session'}
                            </span>
                            <span
                              className={`w-2 h-2 rounded-full shrink-0 ${
                                user ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'
                              }`}
                              aria-hidden="true"
                            />
                          </div>
                          <div className={`text-xs truncate mt-0.5 ${subTextClass}`}>
                            {user
                              ? lang === 'ur'
                                ? `منسلک: ${user.email || 'Active'} · کوڈ اپڈیٹ پر محفوظ`
                                : `Connected: ${user.email || 'Active'} · Auto-Restore On`
                              : lang === 'ur'
                              ? 'منقطع ہے · سائن ان یا دوبارہ تصدیق کریں'
                              : 'Disconnected · Re-authorize to connect'}
                          </div>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setSettingsDrawerOpen(false);
                          onOpenDrive();
                        }}
                        className={`px-2.5 py-1 rounded-lg border text-xs font-semibold cursor-pointer shrink-0 ${
                          isLight
                            ? 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100'
                            : 'bg-[#0b0f19] border-slate-800 text-slate-200 hover:bg-slate-800'
                        }`}
                      >
                        {lang === 'ur' ? 'ڈرائیو کھولیں' : 'Open Drive'}
                      </button>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={handleHeaderReauthorizeDrive}
                        disabled={isDriveBusy}
                        id="settings-drive-reauthorize-btn"
                        className="flex-1 py-1.5 px-3 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
                      >
                        <KeyRound className={`w-3.5 h-3.5 ${isDriveBusy ? 'animate-spin' : ''}`} />
                        <span>
                          {lang === 'ur' ? 'دوبارہ تصدیق (Re-authorize)' : 'Re-authorize'}
                        </span>
                      </button>
                      {user && (
                        <button
                          type="button"
                          onClick={handleHeaderLogoutDrive}
                          disabled={isDriveBusy}
                          id="settings-drive-logout-btn"
                          className="py-1.5 px-3 rounded-lg bg-rose-600/15 hover:bg-rose-600/25 text-rose-500 text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
                        >
                          <LogOut className="w-3.5 h-3.5" />
                          <span>{lang === 'ur' ? 'لاگ آؤٹ (Logout)' : 'Logout'}</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </aside>
      )}
    </>
  );
};
