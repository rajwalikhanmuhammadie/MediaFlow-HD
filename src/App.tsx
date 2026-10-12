import React, { useState, useEffect, useRef } from 'react';
import { AnimatePresence } from 'motion/react';
import { Header } from './components/Header';
import { SplashScreen } from './components/SplashScreen';
import { LinkInputSection } from './components/LinkInputSection';
import {
  isCreatorAutoDownloadEnabled,
} from './components/RecentDownloadsMarquee';
import { PlatformQuickBar } from './components/PlatformQuickBar';
import { MediaResultCard } from './components/MediaResultCard';
import { CommunityComments } from './components/CommunityComments';
import { ColorfulBackground } from './components/ColorfulBackground';
import { ExpandablePreviewModal } from './components/ExpandablePreviewModal';
import { DownloadManagerDrawer } from './components/DownloadManagerDrawer';
import { HistoryGallery } from './components/HistoryGallery';
import { PlatformGuideModal } from './components/PlatformGuideModal';
import { BatchDownloadModal, BatchTargetFormat } from './components/BatchDownloadModal';
import { AICaptionModal } from './components/AICaptionModal';
import { GoogleDriveModal } from './components/GoogleDriveModal';
import { InstallAppModal } from './components/InstallAppModal';
import { QRCodeModal } from './components/QRCodeModal';
import { ScheduleDownloadModal } from './components/ScheduleDownloadModal';
import { FloatingDownloadButton } from './components/FloatingDownloadButton';
import { InAppBrowserModal } from './components/InAppBrowserModal';
import { GeminiChatModal } from './components/GeminiChatModal';
import { CreatorProfileModal } from './components/CreatorProfileModal';
import { FrequentlyDownloadedModal } from './components/FrequentlyDownloadedModal';
import { BuiltInChromeBrowser } from './components/BuiltInChromeBrowser';
import { backgroundKeepAlive } from './utils/backgroundKeepAlive';
import { 
  Language, 
  Theme,
  MediaResult, 
  DownloadTask, 
  HistoryItem, 
  RecentSearchItem,
  DownloadOption, 
  PlatformType,
  AutoClearDuration,
  AutoClearRetentionMode,
  MaxAutoDownloadSize,
  DownloadSpeedCap,
  SavedAccountItem,
  CreatorVideoItem,
  FileSizeUnit
} from './types';
import { PlatformConfig, PLATFORMS } from './data/platforms';
import { translations } from './data/translations';
import { 
  getSavedHistory, 
  saveHistoryItem, 
  removeHistoryItem, 
  renameHistoryItem,
  toggleHideHistoryItem,
  clearAllHistory, 
  pruneExpiredHistoryItems,
  deleteHistoryOlderThanDays,
  getSavedRecentSearches,
  saveRecentSearch,
  removeRecentSearch,
  clearAllRecentSearches,
  deleteRecentSearchesOlderThanDays,
  getSavedAccounts,
  saveOrUpdateAccount,
  removeSavedAccount,
  clearAllSavedAccounts,
  deriveCreatorProfile,
  parseCreatorProfileInput,
  extractUrlsFromText,
  triggerBrowserDownload, 
  generateClientSideMediaResult,
  ensureCompleteMediaResolutionOptions,
  calculateEstimatedSecondsRemaining,
  formatEstimatedTimeRemaining,
  getSavedDesktopNotifications,
  saveDesktopNotifications,
  requestDesktopNotificationPermission,
  sendDownloadNotification,
  parseSizeToMb,
  getSavedFileSizeUnit,
  setSavedFileSizeUnit,
  formatDisplayFileSize,
  cleanSocialUrl,
  detectPlatform,
  buildBrowserSessionPayloadAndHeaders
} from './utils/urlParser';
import { syncOfflineHistoryAndAccountsToSW } from './utils/serviceWorkerCache';
import { 
  initAuth, 
  uploadMediaToDrive 
} from './services/driveService';
import { User } from 'firebase/auth';
import { 
  ShieldCheck, 
  Zap, 
  Sparkles, 
  CheckCircle2, 
  DownloadCloud, 
  Layers, 
  FolderDown, 
  Film, 
  Music, 
  Image as ImageIcon,
  HardDrive,
  AlertCircle,
  RotateCcw,
  Settings,
  MessageSquare,
  X,
  Eye,
  Clock,
  Play,
  Loader2,
  Download,
  LayoutGrid,
  Compass
} from 'lucide-react';

export default function App() {
  const [lang, setLang] = useState<Language>(() => {
    if (typeof window !== 'undefined') {
      const savedLang = localStorage.getItem('lang') as Language | null;
      if (
        savedLang === 'en' ||
        savedLang === 'ur' ||
        savedLang === 'es' ||
        savedLang === 'fr' ||
        savedLang === 'hi'
      ) {
        return savedLang;
      }
    }
    return 'en';
  });
  const [theme, setTheme] = useState<Theme>(() => {
    if (typeof window !== 'undefined') {
      const savedTheme = localStorage.getItem('theme') as Theme | null;
      if (
        savedTheme === 'dark' ||
        savedTheme === 'crimson' ||
        savedTheme === 'emerald' ||
        savedTheme === 'sunset' ||
        savedTheme === 'amoled' ||
        savedTheme === 'light'
      ) {
        return savedTheme;
      }
    }
    return 'dark';
  });
  const [activeSection, setActiveSection] = useState<'downloader' | 'platforms' | 'community'>('downloader');
  const [isSettingsDrawerOpen, setIsSettingsDrawerOpen] = useState<boolean>(false);
  const [isMoreDrawerOpen, setIsMoreDrawerOpen] = useState<boolean>(false);

  const [autoDetectClipboard, setAutoDetectClipboard] = useState<boolean>(true);
  const [clipboardDetectedUrl, setClipboardDetectedUrl] = useState<string | null>(null);
  const [showClipboardToast, setShowClipboardToast] = useState<boolean>(false);
  const [isClipboardQuickPreviewOpen, setIsClipboardQuickPreviewOpen] = useState<boolean>(false);
  const [clipboardPreviewMedia, setClipboardPreviewMedia] = useState<MediaResult | null>(null);
  const [isClipboardPreviewLoading, setIsClipboardPreviewLoading] = useState<boolean>(false);
  const [isClipboardInlineVideoPlaying, setIsClipboardInlineVideoPlaying] = useState<boolean>(false);
  const clipboardPreviewReqIdRef = useRef<number>(0);

  // Floating Download Button Setting (Default: false - moved out of main screen view into Settings Menu)
  const [enableFloatingButton, setEnableFloatingButton] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('enableFloatingButton') === 'true';
    }
    return false;
  });

  const handleToggleFloatingButton = () => {
    setEnableFloatingButton((prev) => {
      const next = !prev;
      if (typeof window !== 'undefined') {
        localStorage.setItem('enableFloatingButton', String(next));
      }
      return next;
    });
  };

  // Saved Creator Accounts / Profiles History (Bookmarks)
  const [savedAccounts, setSavedAccounts] = useState<SavedAccountItem[]>(() => {
    return getSavedAccounts();
  });
  const [isFreqModalOpen, setIsFreqModalOpen] = useState<boolean>(false);
  const [isCreatorProfileModalOpen, setIsCreatorProfileModalOpen] = useState<boolean>(false);
  const [creatorModalProfile, setCreatorModalProfile] = useState<{
    handle: string;
    authorName: string;
    avatar: string;
    platform: PlatformType;
    profileUrl: string;
  } | null>(null);

  const [url, setUrl] = useState<string>('');
  const [removeWatermark, setRemoveWatermark] = useState<boolean>(true);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [loadingMessage, setLoadingMessage] = useState<string>('');
  const [media, setMedia] = useState<MediaResult | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Download Tasks & Gallery History
  const [tasks, setTasks] = useState<DownloadTask[]>([]);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [recentSearches, setRecentSearches] = useState<RecentSearchItem[]>(() => getSavedRecentSearches());

  // Auto-Clear Duration Setting (Default: 30 minutes)
  const [autoClearDuration, setAutoClearDuration] = useState<AutoClearDuration>(() => {
    if (typeof window !== 'undefined') {
      return (localStorage.getItem('autoClearDuration') as AutoClearDuration) || '30';
    }
    return '30';
  });

  // Auto-Clear Retention Mode: 'clear_finished' vs 'keep_for_history'
  const [autoClearRetentionMode, setAutoClearRetentionMode] = useState<AutoClearRetentionMode>(() => {
    if (typeof window !== 'undefined') {
      const savedMode = localStorage.getItem('autoClearRetentionMode') as AutoClearRetentionMode | null;
      if (savedMode === 'clear_finished' || savedMode === 'keep_for_history') {
        return savedMode;
      }
    }
    return 'clear_finished';
  });

  // 'Clear Successfully Finished' Toggle:
  // Automates removal of completed items from the download queue while keeping them in the History tab
  const [clearSuccessfullyFinished, setClearSuccessfullyFinished] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('clearSuccessfullyFinished');
      if (saved !== null) {
        return saved === 'true';
      }
      const savedMode = localStorage.getItem('autoClearRetentionMode');
      if (savedMode === 'keep_for_history') {
        return false;
      }
    }
    return true;
  });

  // Maximum File Size for Auto-Background Downloads (Default: 100 MB)
  const [maxAutoDownloadSize, setMaxAutoDownloadSize] = useState<MaxAutoDownloadSize>(() => {
    if (typeof window !== 'undefined') {
      return (localStorage.getItem('maxAutoDownloadSize') as MaxAutoDownloadSize) || '100';
    }
    return '100';
  });

  const handleSetMaxAutoDownloadSize = (val: MaxAutoDownloadSize) => {
    setMaxAutoDownloadSize(val);
    if (typeof window !== 'undefined') {
      localStorage.setItem('maxAutoDownloadSize', val);
    }
  };

  // File Size Display Unit (MB vs KB for better precision on smaller files)
  const [fileSizeUnit, setFileSizeUnit] = useState<FileSizeUnit>(() => {
    return getSavedFileSizeUnit();
  });

  const handleChangeFileSizeUnit = (unit: FileSizeUnit) => {
    setFileSizeUnit(unit);
    setSavedFileSizeUnit(unit);
    // Also re-format existing media options and active task sizes immediately
    setMedia((prevMedia) => {
      if (!prevMedia) return prevMedia;
      return {
        ...prevMedia,
        downloadOptions: prevMedia.downloadOptions.map((opt) => ({
          ...opt,
          size: formatDisplayFileSize(opt.size, unit),
        })),
      };
    });
    setTasks((prevTasks) =>
      prevTasks.map((tItem) => ({
        ...tItem,
        size: formatDisplayFileSize(tItem.size, unit),
      }))
    );
    setHistory((prevHist) =>
      prevHist.map((hItem) => ({
        ...hItem,
        size: formatDisplayFileSize(hItem.size, unit),
      }))
    );
  };

  // Download Speed Cap / Bandwidth Limiter Setting (Default: unlimited)
  const [downloadSpeedCap, setDownloadSpeedCap] = useState<DownloadSpeedCap>(() => {
    if (typeof window !== 'undefined') {
      return (localStorage.getItem('downloadSpeedCap') as DownloadSpeedCap) || 'unlimited';
    }
    return 'unlimited';
  });
  const downloadSpeedCapRef = useRef<DownloadSpeedCap>(downloadSpeedCap);
  useEffect(() => {
    downloadSpeedCapRef.current = downloadSpeedCap;
  }, [downloadSpeedCap]);

  const getEffectiveDownloadSpeed = (cap: DownloadSpeedCap = downloadSpeedCapRef.current): {
    speedLabel: string;
    speedMbPerSec: number;
  } => {
    if (cap !== 'unlimited') {
      const capNum = parseFloat(cap);
      if (!isNaN(capNum) && capNum > 0) {
        const jitter = 0.92 + Math.random() * 0.08;
        const effective = capNum * jitter;
        if (capNum < 1) {
          return {
            speedLabel: `${Math.round(effective * 1024)} KB/s`,
            speedMbPerSec: effective,
          };
        }
        return {
          speedLabel: `${effective.toFixed(1)} MB/s`,
          speedMbPerSec: effective,
        };
      }
    }
    const uncapped = Math.random() * 2.0 + 3.2;
    return {
      speedLabel: `${uncapped.toFixed(1)} MB/s`,
      speedMbPerSec: uncapped,
    };
  };

  const handleSetDownloadSpeedCap = (cap: DownloadSpeedCap) => {
    setDownloadSpeedCap(cap);
    downloadSpeedCapRef.current = cap;
    if (typeof window !== 'undefined') {
      localStorage.setItem('downloadSpeedCap', cap);
    }
    // Immediately update active downloading tasks to reflect the new speed cap
    setTasks((prev) =>
      prev.map((task) => {
        if (task.status !== 'downloading') return task;
        const { speedLabel } = getEffectiveDownloadSpeed(cap);
        const estSec = calculateEstimatedSecondsRemaining(task.size, task.progress, speedLabel);
        return {
          ...task,
          speed: speedLabel,
          estimatedSeconds: estSec,
          timeRemaining: formatEstimatedTimeRemaining(estSec, 'downloading', lang),
        };
      })
    );
  };

  // Desktop Notifications Setting
  const [desktopNotifications, setDesktopNotifications] = useState<boolean>(() => {
    return getSavedDesktopNotifications();
  });
  const desktopNotificationsRef = useRef<boolean>(desktopNotifications);
  useEffect(() => {
    desktopNotificationsRef.current = desktopNotifications;
  }, [desktopNotifications]);

  // Google Drive Auth & Storage
  const [driveUser, setDriveUser] = useState<User | null>(null);
  const [isDriveModalOpen, setIsDriveModalOpen] = useState<boolean>(false);
  const [driveNotification, setDriveNotification] = useState<{
    type: 'info' | 'success' | 'error';
    message: string;
  } | null>(null);

  // PWA Installation state
  const [isInstallModalOpen, setIsInstallModalOpen] = useState<boolean>(false);
  const [deferredInstallPrompt, setDeferredInstallPrompt] = useState<any>(null);

  // QR Code Modal state
  const [isQrModalOpen, setIsQrModalOpen] = useState<boolean>(false);
  const [qrModalData, setQrModalData] = useState<{
    title: string;
    platform: string;
    thumbnail?: string;
    downloadOption?: DownloadOption | null;
    directUrl: string;
    originalUrl?: string;
  } | null>(null);

  // Modals state
  const [isDownloadsDrawerOpen, setIsDownloadsDrawerOpen] = useState<boolean>(false);
  const [isGalleryOpen, setIsGalleryOpen] = useState<boolean>(false);
  const [isGuideOpen, setIsGuideOpen] = useState<boolean>(false);
  const [guideInitialPlatform, setGuideInitialPlatform] = useState<PlatformType>('instagram');
  const [isBatchOpen, setIsBatchOpen] = useState<boolean>(false);
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState<boolean>(false);
  const [previewInitialMode, setPreviewInitialMode] = useState<'video' | 'image'>('video');
  const [isAICaptionOpen, setIsAICaptionOpen] = useState<boolean>(false);
  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState<boolean>(false);
  const [scheduleTargetOption, setScheduleTargetOption] = useState<DownloadOption | null>(null);
  const [scheduleTargetTask, setScheduleTargetTask] = useState<DownloadTask | null>(null);
  const [isBrowserOpen, setIsBrowserOpen] = useState<boolean>(false);
  const [browserInitialUrl, setBrowserInitialUrl] = useState<string>('https://www.tiktok.com');
  const [browserInitialContext, setBrowserInitialContext] = useState<{
    title?: string;
    thumbnail?: string;
    author?: string;
    videoUrl?: string;
    duration?: string;
  } | null>(null);
  const [keepAliveActive, setKeepAliveActive] = useState<boolean>(true);

  // Gemini Chatbot modal state
  const [isGeminiChatOpen, setIsGeminiChatOpen] = useState<boolean>(false);
  const [geminiChatContext, setGeminiChatContext] = useState<{
    videoTitle?: string;
    platform?: string;
    initialPrompt?: string;
  } | null>(null);

  const handleOpenGeminiChat = (context?: { videoTitle?: string; platform?: string; initialPrompt?: string }) => {
    if (context) {
      setGeminiChatContext(context);
    }
    setIsGeminiChatOpen(true);
  };

  const t = translations[lang];

  // Sync theme with HTML document root element
  useEffect(() => {
    const root = document.documentElement;
    root.setAttribute('data-theme', theme);
    if (theme === 'light') {
      root.classList.remove('dark');
    } else {
      root.classList.add('dark');
    }
    try {
      localStorage.setItem('theme', theme);
    } catch {
      // Handle localStorage restrictions
    }
  }, [theme]);

  // Persist Auto-Clear Setting
  const handleChangeAutoClearDuration = (dur: AutoClearDuration) => {
    setAutoClearDuration(dur);
    try {
      localStorage.setItem('autoClearDuration', dur);
    } catch {
      // Handle localStorage restrictions
    }
    if (dur === 'never') {
      setAutoClearRetentionMode('keep_for_history');
      setClearSuccessfullyFinished(false);
      try {
        localStorage.setItem('autoClearRetentionMode', 'keep_for_history');
        localStorage.setItem('clearSuccessfullyFinished', 'false');
      } catch {
        // Ignore storage errors
      }
    }
  };

  // Helper: Ensure completed tasks are saved in History tab and remove them from the download queue
  const removeCompletedFromQueueKeepInHistory = () => {
    setTasks((prevTasks) => {
      const completedTasks = prevTasks.filter((t) => t.status === 'completed');
      if (completedTasks.length === 0) return prevTasks;

      let latestHistory = getSavedHistory();
      completedTasks.forEach((task) => {
        processedCompletedIdsRef.current.add(task.id);
        latestHistory = saveHistoryItem({
          id: task.id,
          title: task.mediaTitle,
          platform: task.platform,
          format: task.format,
          quality: task.quality,
          size: task.size,
          thumbnail: task.thumbnail,
          mediaUrl: task.url,
          type: task.type || 'video',
          downloadedAt: task.completedAt || Date.now(),
          originalUrl: task.sourceUrl || task.url,
          author: task.author || '@creator',
          creatorProfileUrl: task.creatorProfileUrl,
        });
      });
      setHistory([...latestHistory]);

      return prevTasks.filter((t) => t.status !== 'completed');
    });
  };

  // Toggle 'Clear Successfully Finished' setting
  const handleToggleClearSuccessfullyFinished = (explicitVal?: boolean) => {
    setClearSuccessfullyFinished((prev) => {
      const next = typeof explicitVal === 'boolean' ? explicitVal : !prev;
      const nextMode: AutoClearRetentionMode = next ? 'clear_finished' : 'keep_for_history';
      setAutoClearRetentionMode(nextMode);
      try {
        localStorage.setItem('clearSuccessfullyFinished', String(next));
        localStorage.setItem('autoClearRetentionMode', nextMode);
      } catch {
        // Handle localStorage restrictions
      }
      if (next && autoClearDuration === 'never') {
        setAutoClearDuration('30');
        try {
          localStorage.setItem('autoClearDuration', '30');
        } catch {
          // Ignore storage errors
        }
      }
      if (next) {
        setTimeout(() => {
          removeCompletedFromQueueKeepInHistory();
        }, 0);
      }
      return next;
    });
  };

  // Persist Auto-Clear Retention Mode ('clear_finished' vs 'keep_for_history')
  const handleChangeAutoClearRetentionMode = (mode: AutoClearRetentionMode) => {
    const isClearFinished = mode === 'clear_finished';
    setAutoClearRetentionMode(mode);
    setClearSuccessfullyFinished(isClearFinished);
    try {
      localStorage.setItem('autoClearRetentionMode', mode);
      localStorage.setItem('clearSuccessfullyFinished', String(isClearFinished));
    } catch {
      // Handle localStorage restrictions
    }
    if (isClearFinished && autoClearDuration === 'never') {
      setAutoClearDuration('30');
      try {
        localStorage.setItem('autoClearDuration', '30');
      } catch {
        // Ignore storage errors
      }
    }
    if (isClearFinished) {
      setTimeout(() => {
        removeCompletedFromQueueKeepInHistory();
      }, 0);
    }
  };

  // Desktop Notifications Toggle & Test Handlers
  const handleToggleDesktopNotifications = async () => {
    if (!desktopNotifications) {
      const granted = await requestDesktopNotificationPermission();
      if (granted) {
        setDesktopNotifications(true);
        saveDesktopNotifications(true);
        sendDownloadNotification(
          translations[lang].testNotificationTitle,
          translations[lang].testNotificationBody
        );
      } else {
        setDesktopNotifications(false);
        saveDesktopNotifications(false);
      }
    } else {
      setDesktopNotifications(false);
      saveDesktopNotifications(false);
    }
  };

  const handleTestDesktopNotification = () => {
    sendDownloadNotification(
      translations[lang].testNotificationTitle,
      translations[lang].testNotificationBody
    );
  };

  // Google Drive Auth State Listener
  useEffect(() => {
    const unsubscribe = initAuth(
      (user) => setDriveUser(user),
      () => setDriveUser(null)
    );
    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, []);

  // Listen for PWA beforeinstallprompt event (including early capture from index.html)
  useEffect(() => {
    if (typeof window !== 'undefined' && (window as any).__deferredPwaPrompt) {
      setDeferredInstallPrompt((window as any).__deferredPwaPrompt);
    }

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      (window as any).__deferredPwaPrompt = e;
      setDeferredInstallPrompt(e);
    };

    const handleCustomInstallAvailable = (e: Event) => {
      const detail = (e as CustomEvent).detail || (window as any).__deferredPwaPrompt;
      if (detail) {
        setDeferredInstallPrompt(detail);
      }
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('pwa-install-available', handleCustomInstallAvailable);
    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('pwa-install-available', handleCustomInstallAvailable);
    };
  }, []);

  const handleTriggerPwaInstall = async () => {
    const promptObj =
      deferredInstallPrompt ||
      (typeof window !== 'undefined' ? (window as any).__deferredPwaPrompt : null);

    if (promptObj && typeof promptObj.prompt === 'function') {
      try {
        await promptObj.prompt();
        const { outcome } = await promptObj.userChoice;
        if (outcome === 'accepted') {
          (window as any).__deferredPwaPrompt = null;
          setDeferredInstallPrompt(null);
          setIsInstallModalOpen(false);
          return;
        }
      } catch {
        // Fall through to full app installer modal
      }
    }
    setIsInstallModalOpen(true);
  };

  // Auto-Clear Completed Tasks from Download Queue while keeping them in the History tab
  useEffect(() => {
    if (!clearSuccessfullyFinished && (autoClearDuration === 'never' || autoClearRetentionMode === 'keep_for_history')) {
      return;
    }

    const runAutoClearPass = () => {
      if (clearSuccessfullyFinished) {
        removeCompletedFromQueueKeepInHistory();
        return;
      }

      const minutes = parseInt(autoClearDuration, 10);
      if (isNaN(minutes) || minutes <= 0) return;
      const thresholdMs = minutes * 60 * 1000;
      const now = Date.now();

      // Clear ONLY successfully finished downloads ('completed') from the download queue while keeping them in History
      setTasks((prevTasks) => {
        const remaining = prevTasks.filter((task) => {
          if (task.status === 'completed') {
            const finishedTimestamp = task.completedAt || task.createdAt || now;
            return now - finishedTimestamp < thresholdMs;
          }
          return true;
        });
        return remaining.length !== prevTasks.length ? remaining : prevTasks;
      });
    };

    const interval = setInterval(runAutoClearPass, 3000);

    return () => clearInterval(interval);
  }, [clearSuccessfullyFinished, autoClearDuration, autoClearRetentionMode]);

  // Pre-fetch metadata for a detected clipboard URL so Quick-Preview opens immediately with rich metadata
  const prefetchClipboardMetadata = async (targetUrl: string) => {
    const clean = targetUrl.trim();
    if (!clean) return;
    const reqId = ++clipboardPreviewReqIdRef.current;

    // 1. Immediately populate instant client-side metadata so Quick-Preview is ready at 0ms
    const instantPreview = generateClientSideMediaResult(clean, removeWatermark);
    setClipboardPreviewMedia({
      ...instantPreview,
      downloadOptions: instantPreview.downloadOptions.map((opt) => ({
        ...opt,
        size: formatDisplayFileSize(opt.size, fileSizeUnit),
      })),
    });
    setIsClipboardInlineVideoPlaying(false);
    setIsClipboardPreviewLoading(true);

    // 2. Enrich with real backend metadata in the background (with browser session, Facebook cookie emulation & TikTok cache-busting)
    try {
      const { headers, sessionPayload } = buildBrowserSessionPayloadAndHeaders(clean);
      const response = await fetch(`/api/analyze-link?_cb=${encodeURIComponent(sessionPayload.cacheBust)}`, {
        method: 'POST',
        cache: 'no-store',
        headers,
        body: JSON.stringify({
          url: clean,
          removeWatermark,
          ...sessionPayload,
        }),
      });
      if (clipboardPreviewReqIdRef.current !== reqId) return;
      if (response.ok) {
        const result = await response.json();
        if (clipboardPreviewReqIdRef.current !== reqId) return;
        if (result?.success && result?.data) {
          const enrichedData = ensureCompleteMediaResolutionOptions(result.data, removeWatermark);
          setClipboardPreviewMedia({
            ...enrichedData,
            downloadOptions: (enrichedData.downloadOptions || []).map((opt: DownloadOption) => ({
              ...opt,
              size: formatDisplayFileSize(opt.size, fileSizeUnit),
            })),
          });
        }
      }
    } catch {
      // Keep the instant client-side preview metadata on network fallback
    } finally {
      if (clipboardPreviewReqIdRef.current === reqId) {
        setIsClipboardPreviewLoading(false);
      }
    }
  };

  // Clipboard Auto-Detection & Toast Notification with Quick-Preview Support
  useEffect(() => {
    if (!autoDetectClipboard) return;

    const processCandidateClipboardText = (rawText: string) => {
      if (!rawText || !rawText.trim()) return;
      const extracted = extractUrlsFromText(rawText);
      const candidateUrl = (extracted.length > 0 ? extracted[0] : rawText.trim()).trim();

      if (!candidateUrl || !/^https?:\/\/[^\s]+\.[^\s]+/i.test(candidateUrl)) {
        return;
      }

      // If the user copied a brand-new link that is different from the previously seen clipboard link,
      // allow that new link to be detected while keeping the current cleared link blocked if unchanged.
      if (
        lastClipboardProcessedUrlRef.current &&
        lastClipboardProcessedUrlRef.current !== candidateUrl
      ) {
        unmarkUrlAsCleared(lastClipboardProcessedUrlRef.current);
      }

      if (
        candidateUrl !== urlRef.current.trim() &&
        candidateUrl !== lastAutoAnalyzedUrlRef.current &&
        candidateUrl !== lastClipboardProcessedUrlRef.current &&
        !clearedUrlsRef.current.has(candidateUrl)
      ) {
        lastClipboardProcessedUrlRef.current = candidateUrl;
        setClipboardDetectedUrl(candidateUrl);
        setShowClipboardToast(true);
        prefetchClipboardMetadata(candidateUrl);
      }
    };

    const checkClipboardAndProcess = async () => {
      try {
        if (navigator.clipboard && navigator.clipboard.readText) {
          const text = await navigator.clipboard.readText();
          if (text) {
            processCandidateClipboardText(text);
          }
        }
      } catch {
        // Clipboard read permission might require user interaction in some browsers
      }
    };

    const handleDocumentCopy = () => {
      setTimeout(() => {
        try {
          const selectedText = window.getSelection()?.toString() || '';
          if (selectedText && /^https?:\/\/[^\s]+\.[^\s]+/i.test(selectedText.trim())) {
            processCandidateClipboardText(selectedText);
          } else {
            checkClipboardAndProcess();
          }
        } catch {
          checkClipboardAndProcess();
        }
      }, 60);
    };

    // Run immediately when app opens
    checkClipboardAndProcess();

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        checkClipboardAndProcess();
      }
    };

    window.addEventListener('focus', checkClipboardAndProcess);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    document.addEventListener('copy', handleDocumentCopy);
    return () => {
      window.removeEventListener('focus', checkClipboardAndProcess);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      document.removeEventListener('copy', handleDocumentCopy);
    };
  }, [autoDetectClipboard]);

  const handleToggleTheme = () => {
    const order: Theme[] = ['dark', 'crimson', 'emerald', 'sunset', 'amoled', 'light'];
    setTheme((prev) => {
      const idx = order.indexOf(prev);
      return order[(idx + 1) % order.length];
    });
  };

  const handleSelectTheme = (nextTheme: Theme) => {
    setTheme(nextTheme);
  };

  const handleToggleAutoDetectClipboard = () => {
    setAutoDetectClipboard((prev) => !prev);
  };

  // Load saved history & recent searches, and check for shared deep link in URL query parameters on startup
  useEffect(() => {
    const saved = getSavedHistory();
    setHistory(saved);
    const savedSearches = getSavedRecentSearches();
    setRecentSearches(savedSearches);
    try {
      syncOfflineHistoryAndAccountsToSW(saved, getSavedAccounts());
    } catch {
      // ignore SW sync errors
    }

    if (typeof window !== 'undefined') {
      try {
        const searchParams = new URLSearchParams(window.location.search);
        const sharedRaw = 
          searchParams.get('url') || 
          searchParams.get('text') || 
          searchParams.get('share_url') || 
          searchParams.get('link');

        if (sharedRaw) {
          const decoded = decodeURIComponent(sharedRaw);
          const extracted = extractUrlsFromText(decoded);
          const targetUrl = extracted.length > 0 ? extracted[0] : decoded.trim();
          setUrl(targetUrl);

          // Silent background download by default when shared from external apps
          // without interrupting the screen or forcing open modals
          const isExplicitInspect = searchParams.get('inspect') === 'true' || searchParams.get('view') === 'true';
          if (!isExplicitInspect) {
            handleTriggerQuickBackgroundDownload(targetUrl, true);
          } else {
            handleAnalyzeUrl(targetUrl);
          }
        }
      } catch (e) {
        console.error('Error parsing shared URL query param:', e);
      }
    }
  }, []);

  // Global Keyboard Shortcuts (Ctrl+/ to focus URL, Ctrl+D for downloads, Ctrl+H for history)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isModifier = e.ctrlKey || e.metaKey;
      if (!isModifier) return;

      // 1. Ctrl+/ or Cmd+/ -> Focus URL input box
      if (e.key === '/' || e.code === 'Slash' || e.key === '?') {
        e.preventDefault();
        const inputEl = document.getElementById('video-url-input') as HTMLInputElement | null;
        if (inputEl) {
          inputEl.focus();
          inputEl.select();
          inputEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
        return;
      }

      // 2. Ctrl+D or Cmd+D -> Toggle/Open Downloads Manager Drawer
      if (e.key === 'd' || e.key === 'D' || e.code === 'KeyD') {
        e.preventDefault();
        setIsDownloadsDrawerOpen((prev) => !prev);
        return;
      }

      // 3. Ctrl+H or Cmd+H -> Toggle History Gallery Modal
      if (e.key === 'h' || e.key === 'H' || e.code === 'KeyH') {
        e.preventDefault();
        setIsGalleryOpen((prev) => !prev);
        return;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Track completed task IDs and active real-time stream runners
  const processedCompletedIdsRef = useRef<Set<string>>(new Set());
  const dispatchedBrowserDownloadIdsRef = useRef<Set<string>>(new Set());
  const activeDownloadRunnersRef = useRef<Set<string>>(new Set());
  const downloadAbortControllersRef = useRef<Map<string, AbortController>>(new Map());
  const pausedTaskIdsRef = useRef<Set<string>>(new Set());
  const simulatedDropTaskIdsRef = useRef<Set<string>>(new Set());
  const [runnerQueueTick, setRunnerQueueTick] = useState<number>(0);
  const langRef = useRef<Language>(lang);
  useEffect(() => {
    langRef.current = lang;
  }, [lang]);

  // Dedicated effect that guarantees 100% of completed tasks are persisted to Gallery (History)
  // and automatically removes completed items from the download queue when 'Clear Successfully Finished' is enabled
  useEffect(() => {
    const newlyCompleted = tasks.filter(
      (t) => t.status === 'completed' && !processedCompletedIdsRef.current.has(t.id)
    );

    if (newlyCompleted.length > 0) {
      let latestHistory = getSavedHistory();
      newlyCompleted.forEach((task) => {
        processedCompletedIdsRef.current.add(task.id);
        const historyEntry: HistoryItem = {
          id: task.id,
          title: task.mediaTitle,
          platform: task.platform,
          format: task.format,
          quality: task.quality,
          resolution: task.resolution || task.quality,
          duration: task.duration,
          size: task.size,
          thumbnail: task.thumbnail,
          mediaUrl: task.url,
          type: task.type || 'video',
          downloadedAt: Date.now(),
          originalUrl: task.sourceUrl || task.url,
          author: task.author || '@creator',
          creatorProfileUrl: task.creatorProfileUrl,
        };
        latestHistory = saveHistoryItem(historyEntry);

        if (
          desktopNotificationsRef.current ||
          (typeof Notification !== 'undefined' && Notification.permission === 'granted')
        ) {
          const notifTitle =
            lang === 'ur' ? 'ویڈیو گیلری میں محفوظ ہو گئی! 🎉' : 'Saved to Gallery! 🎉';
          const notifBody = `${task.mediaTitle} • ${task.platform.toUpperCase()} (${task.quality})`;
          sendDownloadNotification(notifTitle, notifBody, task.thumbnail);
        }
      });

      setHistory([...latestHistory]);
    }

    if (clearSuccessfullyFinished && tasks.some((t) => t.status === 'completed')) {
      const timer = setTimeout(() => {
        removeCompletedFromQueueKeepInHistory();
      }, 600);
      return () => clearTimeout(timer);
    }
  }, [tasks, lang, clearSuccessfullyFinished]);

  // Real Byte-Stream Download Runner: Drives every 'downloading' task from 0% to 100% based on actual bytes received
  useEffect(() => {
    const MAX_CONCURRENT_DOWNLOADS = 3;
    const activeCount = activeDownloadRunnersRef.current.size;
    if (activeCount >= MAX_CONCURRENT_DOWNLOADS) return;

    const pendingToStart = tasks.filter(
      (t) =>
        t.status === 'downloading' &&
        !activeDownloadRunnersRef.current.has(t.id) &&
        !pausedTaskIdsRef.current.has(t.id)
    );

    if (pendingToStart.length === 0) return;

    const slotsAvailable = MAX_CONCURRENT_DOWNLOADS - activeCount;
    const tasksToLaunch = pendingToStart.slice(0, slotsAvailable);

    tasksToLaunch.forEach((task) => {
      activeDownloadRunnersRef.current.add(task.id);
      const abortController = new AbortController();
      downloadAbortControllersRef.current.set(task.id, abortController);

      triggerBrowserDownload(task.url, task.filename, task.sourceUrl, {
        taskId: task.id,
        expectedSizeStr: task.size,
        signal: abortController.signal,
        isPaused: () => pausedTaskIdsRef.current.has(task.id),
        getSpeedCap: () => downloadSpeedCapRef.current,
        onProgress: (info) => {
          setTasks((prev) =>
            prev.map((t) => {
              if (t.id !== task.id) return t;
              if (t.status === 'paused' || t.status === 'completed' || t.status === 'failed' || t.status === 'error') {
                return t;
              }
              const currentLang = langRef.current;
              const timeRem =
                info.stage === 'preparing'
                  ? currentLang === 'ur'
                    ? 'ویڈیو سٹریم سے جڑ رہا ہے...'
                    : 'Connecting to stream...'
                  : info.stage === 'extracting'
                  ? currentLang === 'ur'
                    ? `سرور سے ویڈیو تیار ہو رہی ہے (${formatEstimatedTimeRemaining(info.estimatedSeconds, 'downloading', currentLang)})`
                    : `Preparing stream (${formatEstimatedTimeRemaining(info.estimatedSeconds, 'downloading', currentLang)})`
                  : formatEstimatedTimeRemaining(info.estimatedSeconds, 'downloading', currentLang);

              const bytePct =
                typeof info.downloadedBytes === 'number' &&
                typeof info.totalBytes === 'number' &&
                info.totalBytes > 0 &&
                info.downloadedBytes >= 0
                  ? Math.min(98, Math.max(0, Math.floor((info.downloadedBytes / info.totalBytes) * 100)))
                  : Math.min(98, Math.max(0, Math.floor(info.progress)));

              return {
                ...t,
                progress: bytePct,
                downloadedBytes: info.downloadedBytes,
                totalBytes: info.totalBytes,
                size: info.sizeFormatted || t.size,
                speed: info.speedLabel || t.speed,
                estimatedSeconds: info.estimatedSeconds,
                timeRemaining: timeRem,
              };
            })
          );
        },
      })
        .then(() => {
          dispatchedBrowserDownloadIdsRef.current.add(task.id);
          const currentLang = langRef.current;
          setTasks((prev) =>
            prev.map((t) =>
              t.id === task.id
                ? {
                    ...t,
                    progress: 100,
                    downloadedBytes: t.totalBytes && t.totalBytes > 0 ? t.totalBytes : t.downloadedBytes,
                    totalBytes: t.totalBytes && t.totalBytes > 0 ? t.totalBytes : t.downloadedBytes,
                    status: 'completed' as const,
                    speed: 'Finished',
                    estimatedSeconds: 0,
                    completedAt: Date.now(),
                    timeRemaining:
                      currentLang === 'ur' ? 'گیلری میں محفوظ ✓' : 'Saved to Gallery ✓',
                  }
                : t
            )
          );
        })
        .catch((err: any) => {
          if (simulatedDropTaskIdsRef.current.has(task.id)) {
            simulatedDropTaskIdsRef.current.delete(task.id);
            return;
          }
          if (abortController.signal.aborted || err?.name === 'AbortError') {
            return;
          }
          const currentLang = langRef.current;
          setTasks((prev) =>
            prev.map((t) =>
              t.id === task.id
                ? {
                    ...t,
                    status: 'failed' as const,
                    speed: currentLang === 'ur' ? 'رابطہ منقطع' : 'Connection lost',
                    errorReason:
                      err?.message ||
                      (currentLang === 'ur'
                        ? 'نیٹ ورک رابطہ منقطع ہو گیا'
                        : 'Network connection interrupted'),
                    retryCountdown: 2,
                  }
                : t
            )
          );
        })
        .finally(() => {
          activeDownloadRunnersRef.current.delete(task.id);
          downloadAbortControllersRef.current.delete(task.id);
          setRunnerQueueTick((c) => c + 1);
        });
    });
  }, [tasks, runnerQueueTick]);

  // Auto-Retry & Scheduled Download Timer Loop (1-second real clock ticks)
  useEffect(() => {
    const interval = setInterval(() => {
      setTasks((prevTasks) => {
        let changed = false;
        const updated = prevTasks.map((task) => {
          // 1. FAILED STATE: AUTOMATIC RETRY LOGIC (UP TO 3 RETRIES BEFORE 'error')
          if (task.status === 'failed') {
            changed = true;
            const currentRetries = task.retryCount ?? 0;
            const maxRetries = task.maxRetries ?? 3;

            // Check if we still have retry attempts remaining (< 3)
            if (currentRetries < maxRetries) {
              const countdown = task.retryCountdown ?? 2;

              if (countdown > 0) {
                // Step countdown for real-time visual feedback
                const nextAttempt = currentRetries + 1;
                const countdownMsg = lang === 'ur'
                  ? `خودکار دوبارہ کوشش (${nextAttempt}/${maxRetries}) ${countdown}s میں...`
                  : `Auto-retrying (${nextAttempt}/${maxRetries}) in ${countdown}s...`;

                return {
                  ...task,
                  retryCountdown: countdown - 1,
                  speed: lang === 'ur' ? 'دوبارہ کوشش' : 'Retrying...',
                  timeRemaining: countdownMsg,
                };
              } else {
                // Execute automatic retry attempt
                const nextRetryCount = currentRetries + 1;
                const { speedLabel: retrySpeed } = getEffectiveDownloadSpeed();
                const estSec = calculateEstimatedSecondsRemaining(task.size, 0, retrySpeed);
                const retryEta = formatEstimatedTimeRemaining(estSec, 'downloading', lang);

                return {
                  ...task,
                  status: 'downloading' as const,
                  retryCount: nextRetryCount,
                  retryCountdown: undefined,
                  progress: 0,
                  downloadedBytes: 0,
                  speed: retrySpeed,
                  estimatedSeconds: estSec,
                  timeRemaining: retryEta,
                  errorReason: undefined,
                };
              }
            } else {
              // 3 retries attempted and failed: Transition status to 'error'
              return {
                ...task,
                status: 'error' as const,
                retryCountdown: undefined,
                speed: lang === 'ur' ? 'ناکام' : 'Failed',
                estimatedSeconds: 0,
                timeRemaining: lang === 'ur' ? 'خرابی' : 'Error',
                errorReason: lang === 'ur'
                  ? '3 کوششوں کے بعد ڈاؤنلوڈ ناکام ہو گیا'
                  : 'Download failed after 3 retry attempts',
              };
            }
          }

          // 2. SCHEDULED STATE: CHECK TRIGGER TIME & UPDATE LIVE COUNTDOWN
          if (task.status === 'scheduled' && task.scheduledAt) {
            changed = true;
            const now = Date.now();
            if (now >= task.scheduledAt) {
              // Scheduled time arrived! Trigger download
              const initialSpeed = 'Connecting...';
              const initEstSec = calculateEstimatedSecondsRemaining(task.size, 0, '3.5 MB/s');
              
              // Notify user if desktop notifications are enabled
              if (desktopNotificationsRef.current) {
                const notifTitle = lang === 'ur'
                  ? 'شیڈول ڈاؤنلوڈ شروع ہو رہا ہے! ⏰'
                  : 'Scheduled Download Starting! ⏰';
                const notifBody = `${task.mediaTitle} (${task.quality})`;
                sendDownloadNotification(notifTitle, notifBody, task.thumbnail);
              }

              return {
                ...task,
                status: 'downloading' as const,
                progress: 0,
                speed: initialSpeed,
                estimatedSeconds: initEstSec,
                timeRemaining: formatEstimatedTimeRemaining(initEstSec, 'downloading', lang),
                scheduledCountdown: undefined,
              };
            } else {
              // Still waiting for scheduled time: update countdown string
              const diffMs = task.scheduledAt - now;
              const diffMins = Math.ceil(diffMs / (60 * 1000));
              const diffHours = Math.floor(diffMs / (60 * 60 * 1000));
              const remMins = Math.floor((diffMs % (60 * 60 * 1000)) / (60 * 1000));
              const countdown = diffHours > 0 
                ? (lang === 'ur' ? `${diffHours} گھنٹے ${remMins} منٹ میں` : `in ${diffHours}h ${remMins}m`)
                : (lang === 'ur' ? `${diffMins} منٹ میں` : `in ${diffMins}m`);

              return {
                ...task,
                scheduledCountdown: countdown,
                timeRemaining: countdown,
              };
            }
          }

          return task;
        });

        return changed ? updated : prevTasks;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [lang]);

  // Keep-Alive Service Lifecycle Hook: Keeps app awake when tasks are active or scheduled
  useEffect(() => {
    const hasScheduledOrActive = tasks.some(
      (t) => t.status === 'scheduled' || t.status === 'downloading'
    );

    if (hasScheduledOrActive && keepAliveActive) {
      backgroundKeepAlive.activate().catch(() => {});
    } else if (!hasScheduledOrActive && !keepAliveActive) {
      backgroundKeepAlive.deactivate();
    }
  }, [tasks, keepAliveActive]);

  // Subscribe keep-alive Web Worker unthrottled timer ticks to run even when tab is backgrounded
  useEffect(() => {
    const unsubscribe = backgroundKeepAlive.subscribeTick(() => {
      setTasks((prev) => {
        const now = Date.now();
        const hasOverdue = prev.some(
          (t) => t.status === 'scheduled' && t.scheduledAt && now >= t.scheduledAt
        );
        if (!hasOverdue) return prev;

        return prev.map((t) => {
          if (t.status === 'scheduled' && t.scheduledAt && now >= t.scheduledAt) {
            const initialSpeed = '4.0 MB/s';
            const initEstSec = calculateEstimatedSecondsRemaining(t.size, 5, initialSpeed);
            if (desktopNotificationsRef.current) {
              const notifTitle = lang === 'ur'
                ? 'شیڈول ڈاؤنلوڈ شروع ہو رہا ہے! ⏰'
                : 'Scheduled Download Starting! ⏰';
              sendDownloadNotification(notifTitle, `${t.mediaTitle} (${t.quality})`, t.thumbnail);
            }
            return {
              ...t,
              status: 'downloading' as const,
              progress: 5,
              speed: initialSpeed,
              estimatedSeconds: initEstSec,
              timeRemaining: formatEstimatedTimeRemaining(initEstSec, 'downloading', lang),
              scheduledCountdown: undefined,
            };
          }
          return t;
        });
      });
    });

    return () => {
      unsubscribe();
    };
  }, [lang]);

  const handleSelectLang = (nextLang: Language) => {
    setLang(nextLang);
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('lang', nextLang);
      } catch {
        // ignore storage errors
      }
    }
  };

  const handleToggleLang = () => {
    const order: Language[] = ['en', 'ur', 'es', 'fr', 'hi'];
    setLang((prev) => {
      const idx = order.indexOf(prev);
      const next = order[(idx + 1) % order.length];
      if (typeof window !== 'undefined') {
        try {
          localStorage.setItem('lang', next);
        } catch {
          // ignore storage errors
        }
      }
      return next;
    });
  };

  // Track last auto-analyzed URL and cleared URLs so cleared videos never auto-reload
  const lastAutoAnalyzedUrlRef = useRef<string>('');
  const lastClipboardProcessedUrlRef = useRef<string>('');
  const analyzeRequestIdRef = useRef<number>(0);
  const urlRef = useRef<string>(url);
  urlRef.current = url;

  const clearedUrlsRef = useRef<Set<string>>((() => {
    try {
      const saved = sessionStorage.getItem('vidflow_cleared_urls');
      return saved ? new Set<string>(JSON.parse(saved)) : new Set<string>();
    } catch {
      return new Set<string>();
    }
  })());

  const markUrlAsCleared = (u?: string | null) => {
    if (!u || !u.trim()) return;
    clearedUrlsRef.current.add(u.trim());
    try {
      sessionStorage.setItem('vidflow_cleared_urls', JSON.stringify(Array.from(clearedUrlsRef.current)));
    } catch {
      // ignore storage errors
    }
  };

  const unmarkUrlAsCleared = (u?: string | null) => {
    if (!u || !u.trim()) return;
    clearedUrlsRef.current.delete(u.trim());
    try {
      sessionStorage.setItem('vidflow_cleared_urls', JSON.stringify(Array.from(clearedUrlsRef.current)));
    } catch {
      // ignore storage errors
    }
  };

  const pendingAutoHdDownloadRef = useRef<boolean>(false);

  const pickBestHdOption = (targetMedia: MediaResult | null): DownloadOption | null => {
    if (!targetMedia || !Array.isArray(targetMedia.downloadOptions) || targetMedia.downloadOptions.length === 0) {
      return null;
    }

    const options = targetMedia.downloadOptions;
    const vOpts = options.filter((o) => o.type === 'video');

    if (vOpts.length > 0) {
      // Prefer non-watermarked streams when available, otherwise consider all video options
      const candidatePool = vOpts.filter((o) => !o.id?.endsWith('-wm'));
      const basePool = candidatePool.length > 0 ? candidatePool : vOpts;

      // Prefer options that have an authentic extracted stream (directUrl or formatId) over synthetic ladder placeholders
      const verifiedStreamPool = basePool.filter(
        (o) => Boolean(o.formatId) || (typeof o.url === 'string' && o.url.includes('directUrl='))
      );
      const pool =
        verifiedStreamPool.length > 0 && targetMedia.platform !== 'youtube'
          ? verifiedStreamPool
          : basePool;

      // Priority-ordered regex patterns from highest (8K/4320p, 4K/2160p, 2K/1440p) down to 1080p and lower
      const resolutionPriorityPatterns: RegExp[] = [
        /\b(?:1080p?|fhd|full\s*hd)\b|1080|fhd|full\s*hd/i,
        /\b(?:2160p?|4k|uhd)\b|2160|4k/i,
        /\b(?:1440p?|2k|qhd)\b|1440|2k|qhd/i,
        /\b(?:4320p?|8k)\b|4320|8k/i,
        /\b(?:720p?|hd)\b|720/i,
        /\b(?:480p?|sd)\b|480/i,
        /\b360p?\b|360/i,
        /\b240p?\b|240/i,
        /\b144p?\b|144/i,
      ];

      const matchesOption = (opt: DownloadOption, pattern: RegExp): boolean =>
        pattern.test(String(opt.resolution || '')) ||
        pattern.test(String(opt.quality || '')) ||
        pattern.test(String(opt.label || '')) ||
        pattern.test(String(opt.id || ''));

      for (const pattern of resolutionPriorityPatterns) {
        const matched = pool.find((opt) => matchesOption(opt, pattern));
        if (matched) {
          return matched;
        }
      }

      return pool[0];
    }

    const iOpts = options.filter((o) => o.type === 'image');
    return iOpts[0] || options[0];
  };

  // Analyze URL with real backend multi-platform extractor & all server resolutions (no demo fallback)
  const handleAnalyzeUrl = async (
    customUrl?: string,
    autoStartHd: boolean = false,
    _isManual: boolean = false
  ) => {
    const rawTarget = (customUrl || url).trim();
    const extractedUrls = extractUrlsFromText(rawTarget);
    const targetUrl = (extractedUrls.length > 0 ? extractedUrls[0] : rawTarget).trim();
    if (!targetUrl) {
      setErrorMessage(t.invalidUrlError);
      return;
    }

    // Always allow explicit or clicked link analysis to proceed
    unmarkUrlAsCleared(targetUrl);
    if (targetUrl !== url) {
      setUrl(targetUrl);
    }

    pendingAutoHdDownloadRef.current = autoStartHd;

    // Only reuse existing media if it is for the EXACT same normalized non-TikTok URL and was genuinely extracted from the server
    const detectedTargetPlatform = detectPlatform(targetUrl);
    const isSameAlreadyExtractedMedia =
      detectedTargetPlatform !== 'tiktok' &&
      media &&
      !isLoading &&
      cleanSocialUrl(media.originalUrl) === cleanSocialUrl(targetUrl) &&
      media.watermarkMethod !== `${media.platform.toUpperCase()} Direct Extraction Pipeline`;

    lastAutoAnalyzedUrlRef.current = targetUrl;

    if (isSameAlreadyExtractedMedia && media) {
      if (pendingAutoHdDownloadRef.current) {
        pendingAutoHdDownloadRef.current = false;
        const hdOpt = pickBestHdOption(media);
        if (hdOpt) {
          handleStartDownload(hdOpt, media);
          return;
        }
      }
      return;
    }

    const currentReqId = ++analyzeRequestIdRef.current;

    // Save and track in recent searches (stores last 10 entered URLs)
    const updatedSearches = saveRecentSearch(targetUrl);
    setRecentSearches(updatedSearches);

    // If user pasted a Creator Profile URL or @handle directly, open the Creator Profile Videos Grid immediately
    const parsedProfile = parseCreatorProfileInput(targetUrl);
    if (parsedProfile) {
      setErrorMessage(null);
      handleOpenCreatorProfile({
        handle: parsedProfile.handle,
        authorName: parsedProfile.authorName,
        avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120',
        platform: parsedProfile.platform,
        profileUrl: parsedProfile.profileUrl,
      });
      return;
    }

    setErrorMessage(null);
    setIsLoading(true);
    setLoadingMessage(
      lang === 'ur'
        ? 'سرور سے ویڈیو اور تمام ریزولوشنز نکالی جا رہی ہیں...'
        : 'Extracting video & all server resolutions...'
    );

    const timer = setTimeout(() => {
      if (analyzeRequestIdRef.current === currentReqId) {
        setLoadingMessage(
          lang === 'ur'
            ? 'سرور پر موجود تمام ایچ ڈی ریزولوشنز کے لنکس حاصل کیے جا رہے ہیں...'
            : 'Fetching all available resolution links from server...'
        );
      }
    }, 700);

    try {
      const { headers, sessionPayload } = buildBrowserSessionPayloadAndHeaders(targetUrl);
      const analyzeEndpoint = `/api/analyze-link?_cb=${encodeURIComponent(sessionPayload.cacheBust)}`;
      let response = await fetch(analyzeEndpoint, {
        method: 'POST',
        cache: 'no-store',
        headers,
        body: JSON.stringify({
          url: targetUrl,
          removeWatermark,
          ...sessionPayload,
        }),
      });

      // If first attempt returned non-OK, retry once with fresh browser session headers & cache-bust token
      if (!response.ok) {
        await new Promise((r) => setTimeout(r, 350));
        const retrySession = buildBrowserSessionPayloadAndHeaders(targetUrl);
        response = await fetch(`/api/analyze-link?_cb=${encodeURIComponent(retrySession.sessionPayload.cacheBust)}`, {
          method: 'POST',
          cache: 'no-store',
          headers: retrySession.headers,
          body: JSON.stringify({
            url: targetUrl,
            removeWatermark,
            ...retrySession.sessionPayload,
            retryAttempt: 1,
          }),
        });
      }

      if (analyzeRequestIdRef.current !== currentReqId) {
        return;
      }

      let resolvedMedia: MediaResult | null = null;

      if (response.ok) {
        const result = await response.json();
        if (analyzeRequestIdRef.current !== currentReqId) {
          return;
        }
        if (result.success && result.data) {
          resolvedMedia = ensureCompleteMediaResolutionOptions(result.data, removeWatermark);
          setMedia(resolvedMedia);
          setErrorMessage(null);
          setRecentSearches(saveRecentSearch(targetUrl, resolvedMedia.platform, resolvedMedia.title));

          // Automatically parse and save creator profile to Saved Accounts History
          try {
            const derived = deriveCreatorProfile(
              result.data.originalUrl || targetUrl,
              result.data.platform,
              result.data.author,
              result.data.creatorProfileUrl,
              result.data.creatorHandle
            );
            const updatedAccounts = saveOrUpdateAccount({
              handle: derived.handle,
              authorName: result.data.author || derived.handle,
              avatar: result.data.authorAvatar || result.data.thumbnail,
              platform: result.data.platform,
              profileUrl: derived.profileUrl,
            });
            setSavedAccounts(updatedAccounts);
          } catch {
            // ignore storage errors
          }
        } else {
          setMedia(null);
          setErrorMessage(
            result.error ||
              (lang === 'ur'
                ? 'ویڈیو حاصل کرنے میں ناکامی، براہ کرم لنک دوبارہ چیک کریں۔'
                : 'Could not extract video from this link. Please check the URL and try again.')
          );
        }
      } else {
        const errJson = await response.json().catch(() => null);
        setMedia(null);
        setErrorMessage(
          errJson?.error ||
            (lang === 'ur'
              ? 'ویڈیو حاصل کرنے میں ناکامی، براہ کرم لنک دوبارہ چیک کریں۔'
              : 'Could not extract video from this link. Please check the URL and try again.')
        );
      }

      if (
        resolvedMedia &&
        pendingAutoHdDownloadRef.current &&
        analyzeRequestIdRef.current === currentReqId
      ) {
        pendingAutoHdDownloadRef.current = false;
        const hdOpt = pickBestHdOption(resolvedMedia);
        if (hdOpt) {
          handleStartDownload(hdOpt, resolvedMedia);
        }
      }
    } catch {
      if (analyzeRequestIdRef.current !== currentReqId) {
        return;
      }
      setMedia(null);
      setErrorMessage(
        lang === 'ur'
          ? 'سرور سے رابطہ کرنے میں مسئلہ پیش آیا، دوبارہ کوشش کریں۔'
          : 'Network error while extracting video resolutions. Please try again.'
      );
    } finally {
      clearTimeout(timer);
      if (analyzeRequestIdRef.current === currentReqId) {
        setIsLoading(false);
        setLoadingMessage('');
      }
    }
  };

  // Instant HD Download when the user taps the 'HD Download' button
  const handleInstantHdDownload = (customUrl?: string, isManual: boolean = true) => {
    const targetUrl = (customUrl || url).trim();
    if (!targetUrl) {
      setErrorMessage(t.invalidUrlError);
      return;
    }

    if (isManual) {
      unmarkUrlAsCleared(targetUrl);
    }

    // If the exact link has already been genuinely extracted by the backend, start HD download immediately!
    if (
      media &&
      !isLoading &&
      cleanSocialUrl(media.originalUrl) === cleanSocialUrl(targetUrl) &&
      media.watermarkMethod !== `${media.platform.toUpperCase()} Direct Extraction Pipeline`
    ) {
      const hdOpt = pickBestHdOption(media);
      if (hdOpt) {
        handleStartDownload(hdOpt, media);
        return;
      }
    }

    // If the link is currently being processed right now for the same URL, queue immediate HD download upon completion
    if (isLoading && cleanSocialUrl(lastAutoAnalyzedUrlRef.current) === cleanSocialUrl(targetUrl)) {
      pendingAutoHdDownloadRef.current = true;
      return;
    }

    // Otherwise process the link and immediately trigger HD download as soon as ready
    handleAnalyzeUrl(targetUrl, true, isManual);
  };

  // Reset media & clear interface to prepare for new video download
  const handleDownloadNewVideo = () => {
    // Cancel any in-flight analysis so it cannot repopulate after clearing
    analyzeRequestIdRef.current += 1;
    pendingAutoHdDownloadRef.current = false;

    const currentUrl = urlRef.current.trim();
    if (currentUrl) {
      markUrlAsCleared(currentUrl);
      lastClipboardProcessedUrlRef.current = currentUrl;
    }
    if (media?.originalUrl) {
      markUrlAsCleared(media.originalUrl.trim());
    }
    if (clipboardDetectedUrl) {
      markUrlAsCleared(clipboardDetectedUrl.trim());
    }
    if (lastAutoAnalyzedUrlRef.current) {
      markUrlAsCleared(lastAutoAnalyzedUrlRef.current);
      lastClipboardProcessedUrlRef.current = lastAutoAnalyzedUrlRef.current;
    }

    // Also mark current clipboard content as cleared so window focus / visibility events don't re-process it
    if (navigator.clipboard && navigator.clipboard.readText) {
      navigator.clipboard
        .readText()
        .then((clipText) => {
          if (clipText && clipText.trim()) {
            const extracted = extractUrlsFromText(clipText);
            const clipUrl = (extracted.length > 0 ? extracted[0] : clipText.trim()).trim();
            if (clipUrl) {
              markUrlAsCleared(clipUrl);
              lastClipboardProcessedUrlRef.current = clipUrl;
            }
          }
        })
        .catch(() => {});
    }

    setIsLoading(false);
    setLoadingMessage('');
    setMedia(null);
    setUrl('');
    urlRef.current = '';
    setShowClipboardToast(false);
    setIsClipboardQuickPreviewOpen(false);
    setErrorMessage(null);
  };

  // Quick Select Platform from grid
  const handleSelectPlatform = (platform: PlatformConfig) => {
    setUrl(platform.sampleUrl);
    handleAnalyzeUrl(platform.sampleUrl);
  };

  // Open Guide for specific platform
  const handleOpenGuideForPlatform = (platform: PlatformConfig) => {
    setGuideInitialPlatform(platform.id);
    setIsGuideOpen(true);
  };

  // One-Tap / Silent Background Downloader
  // Automatically analyzes link, picks optimal clean video stream, and downloads in background
  const handleTriggerQuickBackgroundDownload = async (targetUrl: string, silent: boolean = true) => {
    const extracted = extractUrlsFromText(targetUrl);
    const cleanUrl = extracted.length > 0 ? extracted[0] : targetUrl.trim();
    if (!cleanUrl) return;

    // Enable background keep-alive
    backgroundKeepAlive.activate();

    // Auto request notification permission if not yet decided
    if (typeof Notification !== 'undefined' && Notification.permission === 'default') {
      try {
        await Notification.requestPermission();
      } catch {
        // ignore
      }
    }

    // Save in recent searches
    const updatedSearches = saveRecentSearch(cleanUrl);
    setRecentSearches(updatedSearches);

    let parsedMedia: MediaResult | null = null;
    try {
      const { headers, sessionPayload } = buildBrowserSessionPayloadAndHeaders(cleanUrl);
      const response = await fetch(`/api/analyze-link?_cb=${encodeURIComponent(sessionPayload.cacheBust)}`, {
        method: 'POST',
        cache: 'no-store',
        headers,
        body: JSON.stringify({ 
          url: cleanUrl,
          removeWatermark: true,
          ...sessionPayload,
        }),
      });

      if (response.ok) {
        const result = await response.json();
        if (result.success && result.data) {
          parsedMedia = ensureCompleteMediaResolutionOptions(result.data, true);
        }
      }
    } catch {
      // Fallback
    }

    if (!parsedMedia) {
      setErrorMessage(lang === 'ur' ? 'ویڈیو حاصل کرنے میں ناکامی ہوئی۔' : 'Could not analyze video for background download.');
      return;
    }

    if (!parsedMedia || !parsedMedia.downloadOptions || parsedMedia.downloadOptions.length === 0) {
      return;
    }

    // Automatically pick highest available video resolution (8K 4320p, 4K 2160p, 2K 1440p, 1080p, 720p, or first video option)
    const bestOption = pickBestHdOption(parsedMedia) || parsedMedia.downloadOptions[0];

    // Enforce maximum file size limit for Auto-Background Downloads
    if (maxAutoDownloadSize !== 'unlimited') {
      const maxMb = parseFloat(maxAutoDownloadSize);
      const optionSizeMb = parseSizeToMb(bestOption.size);
      if (optionSizeMb > maxMb) {
        if (desktopNotificationsRef.current) {
          sendDownloadNotification(
            lang === 'ur' ? 'آٹو ڈاؤنلوڈ منسوخ: فائل سائز بہت بڑا ہے! ⚠️' : 'Auto-Download Prevented: File Too Large! ⚠️',
            lang === 'ur'
              ? `${parsedMedia.title} کا سائز (${bestOption.size}) آپ کی آٹو ڈاؤنلوڈ حد (${maxMb} MB) سے زیادہ ہے۔`
              : `${parsedMedia.title} (${bestOption.size}) exceeds your background download limit of ${maxMb} MB.`,
            parsedMedia.thumbnail
          );
        }
        setErrorMessage(
          lang === 'ur'
            ? `آٹو ڈاؤنلوڈ روکا گیا: فائل کا سائز (${bestOption.size}) مقررہ حد (${maxMb} MB) سے زیادہ ہے۔ ڈاؤنلوڈ کے لیے دستی طور پر کوالٹی منتخب کریں۔`
            : `Auto-Background download prevented: File size (${bestOption.size}) exceeds your maximum limit of ${maxMb} MB.`
        );
        setTimeout(() => setErrorMessage(null), 6000);
        return;
      }
    }

    const taskId = 'dl_bg_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5);
    const extension = bestOption.format.toLowerCase();
    const safeTitle = parsedMedia.title.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 30);
    const filename = `${parsedMedia.platform}_${safeTitle}_${bestOption.quality.replace(/\s+/g, '_')}.${extension}`;

    const initialSpeed = lang === 'ur' ? 'جڑ رہا ہے...' : 'Connecting...';
    const initEstSec = calculateEstimatedSecondsRemaining(bestOption.size, 0, '3.2 MB/s');

    const newTask: DownloadTask = {
      id: taskId,
      mediaTitle: parsedMedia.title,
      platform: parsedMedia.platform,
      thumbnail: parsedMedia.thumbnail,
      format: bestOption.format,
      quality: bestOption.quality,
      progress: 0,
      status: 'downloading',
      size: bestOption.size,
      speed: initialSpeed,
      estimatedSeconds: initEstSec,
      timeRemaining: formatEstimatedTimeRemaining(initEstSec, 'downloading', lang),
      url: bestOption.url,
      filename,
      type: bestOption.type,
      createdAt: Date.now(),
      retryCount: 0,
      maxRetries: 3,
      sourceUrl: parsedMedia.originalUrl,
      resolution: bestOption.resolution || bestOption.quality,
      duration: parsedMedia.duration,
    };

    setTasks((prev) => [newTask, ...prev]);

    // If silent is false, open the drawer
    if (!silent) {
      setIsDownloadsDrawerOpen(true);
    }
  };

  // Start download for an option — starts at 0% and tracks real byte stream progress to 100%
  const handleStartDownload = (option: DownloadOption, customMedia?: MediaResult) => {
    const activeMedia = customMedia || media;
    if (!activeMedia) return;

    // Abort any existing active download for this exact option before starting fresh
    tasks.forEach((existing) => {
      if (
        existing.sourceUrl === activeMedia.originalUrl &&
        (existing.optionId === option.id || existing.url === option.url)
      ) {
        const ctrl = downloadAbortControllersRef.current.get(existing.id);
        if (ctrl) ctrl.abort();
        activeDownloadRunnersRef.current.delete(existing.id);
        pausedTaskIdsRef.current.delete(existing.id);
      }
    });

    const taskId = 'dl_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5);
    const extension = option.format.toLowerCase();
    const safeTitle = activeMedia.title.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 30);
    const filename = `${activeMedia.platform}_${safeTitle}_${option.quality.replace(/\s+/g, '_')}.${extension}`;

    const initialSpeed = lang === 'ur' ? 'جڑ رہا ہے...' : 'Connecting...';
    const initEstSec = calculateEstimatedSecondsRemaining(option.size, 0, '3.2 MB/s');

    const newTask: DownloadTask = {
      id: taskId,
      mediaTitle: activeMedia.title,
      platform: activeMedia.platform,
      thumbnail: activeMedia.thumbnail,
      format: option.format,
      quality: option.quality,
      progress: 0,
      status: 'downloading',
      size: option.size,
      speed: initialSpeed,
      estimatedSeconds: initEstSec,
      timeRemaining: lang === 'ur' ? 'سٹریم جڑ رہی ہے...' : 'Connecting to stream...',
      url: option.url,
      filename,
      type: option.type || 'video',
      createdAt: Date.now(),
      retryCount: 0,
      maxRetries: 3,
      sourceUrl: activeMedia.originalUrl,
      optionId: option.id,
      resolution: option.resolution || option.quality,
      duration: activeMedia.duration,
      author: activeMedia.author || activeMedia.creatorHandle,
      creatorProfileUrl: activeMedia.creatorProfileUrl,
    };

    // Also save immediately to Gallery history so it is always visible in Gallery
    const immediateHistoryEntry: HistoryItem = {
      id: taskId,
      title: activeMedia.title,
      platform: activeMedia.platform,
      format: option.format,
      quality: option.quality,
      resolution: option.resolution || option.quality,
      duration: activeMedia.duration,
      size: option.size,
      thumbnail: activeMedia.thumbnail,
      mediaUrl: option.url,
      type: option.type || 'video',
      downloadedAt: Date.now(),
      originalUrl: activeMedia.originalUrl,
      author: activeMedia.author || activeMedia.creatorHandle || '@creator',
      creatorProfileUrl: activeMedia.creatorProfileUrl,
    };
    const updatedHist = saveHistoryItem(immediateHistoryEntry);
    setHistory([...updatedHist]);

    // Replace any previous task for the same option on this media so the progress bar runs cleanly
    setTasks((prev) => [
      newTask,
      ...prev.filter(
        (t) => !(t.sourceUrl === activeMedia.originalUrl && (t.optionId === option.id || t.url === option.url))
      ),
    ]);
    setIsDownloadsDrawerOpen(true);
  };

  // Pause / Resume / Cancel / Retry tasks
  const handlePauseTask = (id: string) => {
    pausedTaskIdsRef.current.add(id);
    setTasks((prev) =>
      prev.map((t) => (t.id === id ? { ...t, status: 'paused' as const, speed: 'Paused' } : t))
    );
  };

  const handleResumeTask = (id: string) => {
    pausedTaskIdsRef.current.delete(id);
    setTasks((prev) =>
      prev.map((t) => (t.id === id ? { ...t, status: 'downloading' as const, speed: 'Resuming...' } : t))
    );
    setRunnerQueueTick((c) => c + 1);
  };

  const handleCancelTask = (id: string) => {
    const ctrl = downloadAbortControllersRef.current.get(id);
    if (ctrl) ctrl.abort();
    activeDownloadRunnersRef.current.delete(id);
    downloadAbortControllersRef.current.delete(id);
    pausedTaskIdsRef.current.delete(id);
    setTasks((prev) => prev.filter((t) => t.id !== id));
  };

  // Batch Rename Handler: Updates filenames and titles of tasks within a specific batch or list of IDs
  const handleBatchRename = (
    taskIds: string[], 
    updates: { id: string; filename: string; mediaTitle?: string }[]
  ) => {
    const updateMap = new Map<string, { filename: string; mediaTitle?: string }>();
    updates.forEach((u) => updateMap.set(u.id, u));

    setTasks((prev) =>
      prev.map((t) => {
        const match = updateMap.get(t.id);
        if (match) {
          return {
            ...t,
            filename: match.filename,
            ...(match.mediaTitle ? { mediaTitle: match.mediaTitle } : {}),
          };
        }
        return t;
      })
    );
  };

  // Retry Mechanism (Manual & Automatic)
  const handleRetryTask = (id: string) => {
    const existingCtrl = downloadAbortControllersRef.current.get(id);
    if (existingCtrl) existingCtrl.abort();
    activeDownloadRunnersRef.current.delete(id);
    downloadAbortControllersRef.current.delete(id);
    pausedTaskIdsRef.current.delete(id);

    setTasks((prev) =>
      prev.map((t) => {
        if (t.id === id) {
          const retrySpeed = lang === 'ur' ? 'جڑ رہا ہے...' : 'Connecting...';
          const initEstSec = calculateEstimatedSecondsRemaining(t.size, 0, '3.2 MB/s');
          return {
            ...t,
            status: 'downloading' as const,
            progress: 0,
            speed: retrySpeed,
            retryCount: 0,
            retryCountdown: undefined,
            errorReason: undefined,
            estimatedSeconds: initEstSec,
            timeRemaining: formatEstimatedTimeRemaining(initEstSec, 'downloading', lang),
          };
        }
        return t;
      })
    );
    setRunnerQueueTick((c) => c + 1);
  };

  // Simulate connection failure on an active download task (to test 3x auto-retry & error transition)
  const handleSimulateFailTask = (id: string) => {
    simulatedDropTaskIdsRef.current.add(id);
    const ctrl = downloadAbortControllersRef.current.get(id);
    if (ctrl) ctrl.abort();
    activeDownloadRunnersRef.current.delete(id);
    downloadAbortControllersRef.current.delete(id);
    pausedTaskIdsRef.current.delete(id);

    setTasks((prev) =>
      prev.map((t) => {
        if (t.id === id && (t.status === 'downloading' || t.status === 'paused')) {
          return {
            ...t,
            status: 'failed' as const,
            speed: lang === 'ur' ? 'رابطہ منقطع' : 'Connection lost',
            errorReason: lang === 'ur' ? 'نیٹ ورک رابطہ منقطع ہو گیا' : 'Network connection lost',
            retryCountdown: 2,
          };
        }
        return t;
      })
    );
  };

  const handleSaveToDevice = (task: DownloadTask) => {
    triggerBrowserDownload(task.url, task.filename, task.sourceUrl).catch(() => {});
  };

  const handleClearCompleted = () => {
    removeCompletedFromQueueKeepInHistory();
  };

  // Schedule Download Handlers
  const handleOpenScheduleForOption = (option: DownloadOption) => {
    setScheduleTargetOption(option);
    setScheduleTargetTask(null);
    setIsScheduleModalOpen(true);
  };

  const handleRescheduleTask = (task: DownloadTask) => {
    setScheduleTargetTask(task);
    setScheduleTargetOption(null);
    setIsScheduleModalOpen(true);
  };

  const handleTriggerScheduledNow = (id: string) => {
    setTasks((prev) =>
      prev.map((t) => {
        if (t.id === id) {
          const initialSpeed = '4.0 MB/s';
          const initEstSec = calculateEstimatedSecondsRemaining(t.size, 5, initialSpeed);
          return {
            ...t,
            status: 'downloading' as const,
            progress: 5,
            speed: initialSpeed,
            estimatedSeconds: initEstSec,
            timeRemaining: formatEstimatedTimeRemaining(initEstSec, 'downloading', lang),
            scheduledCountdown: undefined,
          };
        }
        return t;
      })
    );
  };

  const handleConfirmSchedule = (timestamp: number, formatted: string) => {
    const now = Date.now();
    const diffMs = Math.max(0, timestamp - now);
    const diffMins = Math.ceil(diffMs / (60 * 1000));
    const diffHours = Math.floor(diffMs / (60 * 60 * 1000));
    const remMins = Math.floor((diffMs % (60 * 60 * 1000)) / (60 * 1000));
    const countdown = diffHours > 0 
      ? (lang === 'ur' ? `${diffHours} گھنٹے ${remMins} منٹ میں` : `in ${diffHours}h ${remMins}m`)
      : (lang === 'ur' ? `${diffMins} منٹ میں` : `in ${diffMins}m`);

    if (scheduleTargetTask) {
      setTasks((prev) =>
        prev.map((t) =>
          t.id === scheduleTargetTask.id
            ? {
                ...t,
                status: 'scheduled' as const,
                scheduledAt: timestamp,
                scheduledFormatted: formatted,
                scheduledCountdown: countdown,
                timeRemaining: countdown,
              }
            : t
        )
      );
    } else if (scheduleTargetOption && media) {
      const taskId = 'sched_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5);
      const extension = scheduleTargetOption.format.toLowerCase();
      const safeTitle = media.title.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 30);
      const filename = `${media.platform}_${safeTitle}_${scheduleTargetOption.quality.replace(/\s+/g, '_')}.${extension}`;

      const newTask: DownloadTask = {
        id: taskId,
        mediaTitle: media.title,
        platform: media.platform,
        thumbnail: media.thumbnail,
        format: scheduleTargetOption.format,
        quality: scheduleTargetOption.quality,
        progress: 0,
        status: 'scheduled',
        size: scheduleTargetOption.size,
        speed: lang === 'ur' ? 'شیڈول شدہ' : 'Scheduled',
        estimatedSeconds: 0,
        timeRemaining: countdown,
        url: scheduleTargetOption.url,
        filename,
        type: scheduleTargetOption.type,
        createdAt: Date.now(),
        scheduledAt: timestamp,
        scheduledFormatted: formatted,
        scheduledCountdown: countdown,
        retryCount: 0,
        maxRetries: 3,
      };

      setTasks((prev) => [newTask, ...prev]);
      setIsDownloadsDrawerOpen(true);
    }

    backgroundKeepAlive.activate().catch(() => {});
    setKeepAliveActive(true);
  };

  const handleToggleKeepAlive = () => {
    setKeepAliveActive((prev) => {
      const next = !prev;
      if (next) {
        backgroundKeepAlive.activate().catch(() => {});
      } else {
        backgroundKeepAlive.deactivate();
      }
      return next;
    });
  };

  // Save directly to Google Drive
  const handleSaveMediaToDrive = async (mediaUrl: string, filename: string) => {
    if (!driveUser) {
      setIsDriveModalOpen(true);
      setDriveNotification({
        type: 'info',
        message: lang === 'ur' 
          ? 'گوگل ڈرائیو میں محفوظ کرنے کے لیے پہلے سائن ان کریں' 
          : 'Please sign in to Google Drive first.'
      });
      setTimeout(() => setDriveNotification(null), 4500);
      return;
    }

    setDriveNotification({
      type: 'info',
      message: lang === 'ur' ? 'گوگل ڈرائیو میں اپلوڈ ہو رہا ہے...' : 'Uploading to Google Drive...'
    });

    try {
      await uploadMediaToDrive({
        mediaUrl,
        filename: filename || `media_${Date.now()}.mp4`,
      });
      setDriveNotification({
        type: 'success',
        message: lang === 'ur' 
          ? 'گوگل ڈرائیو کے "Social Media Downloads" فولڈر میں محفوظ ہو گیا!' 
          : 'Successfully saved to Google Drive "Social Media Downloads" folder!'
      });
      setTimeout(() => setDriveNotification(null), 5000);
    } catch (err: any) {
      console.error('Drive upload failed:', err);
      setDriveNotification({
        type: 'error',
        message: err.message || (lang === 'ur' ? 'گوگل ڈرائیو پر محفوظ کرنے میں مسئلہ پیش آیا' : 'Failed to save to Google Drive')
      });
      setTimeout(() => setDriveNotification(null), 5000);
    }
  };

  // Batch process
  const handleProcessBatch = (
    urls: string[], 
    formatTarget: BatchTargetFormat = 'best_video', 
    stripWatermark: boolean = removeWatermark
  ) => {
    if (urls.length === 0) return;
    const bulkBatchId = 'bulk_' + Date.now();
    const bulkBatchTitle = lang === 'ur' 
      ? `بلک امپورٹ (${urls.length} لنکس)` 
      : `Bulk Import (${urls.length} links)`;

    urls.forEach((singleUrl, idx) => {
      const generated = generateClientSideMediaResult(singleUrl, stripWatermark);
      let chosenOptions: DownloadOption[] = [];

      if (formatTarget === 'best_video') {
        const best = generated.downloadOptions.find(o => o.type === 'video') || generated.downloadOptions[0];
        chosenOptions = [best];
      } else if (formatTarget === 'audio_only') {
        const audio = generated.downloadOptions.find(o => o.type === 'audio') || generated.downloadOptions[0];
        chosenOptions = [audio];
      } else if (formatTarget === 'photo_only') {
        const img = generated.downloadOptions.find(o => o.type === 'image') || generated.downloadOptions[0];
        chosenOptions = [img];
      } else if (formatTarget === 'all_package') {
        chosenOptions = generated.downloadOptions;
      } else {
        chosenOptions = [generated.downloadOptions[0]];
      }

      chosenOptions.forEach((opt, optIdx) => {
        const taskId = 'batch_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6) + '_' + idx + '_' + optIdx;
        const ext = opt.format.toLowerCase();
        const filename = `${generated.platform}_batch_${idx + 1}_${opt.quality.replace(/\s+/g, '_')}.${ext}`;
        const batchSpeed = getEffectiveDownloadSpeed().speedLabel;
        const batchEstSec = calculateEstimatedSecondsRemaining(opt.size, 0, batchSpeed);

        const newTask: DownloadTask = {
          id: taskId,
          mediaTitle: `${generated.platform.toUpperCase()} Item #${idx + 1} (${opt.quality})`,
          platform: generated.platform,
          thumbnail: generated.thumbnail,
          format: opt.format,
          quality: opt.quality,
          progress: 0,
          status: 'downloading',
          size: opt.size,
          speed: batchSpeed,
          estimatedSeconds: batchEstSec,
          timeRemaining: formatEstimatedTimeRemaining(batchEstSec, 'downloading', lang),
          url: opt.url,
          filename,
          type: opt.type,
          createdAt: Date.now() + idx * 100 + optIdx * 10,
          retryCount: 0,
          maxRetries: 3,
          batchId: bulkBatchId,
          batchType: 'bulk_import',
          batchTitle: bulkBatchTitle,
          sourceUrl: singleUrl,
        };

        setTimeout(() => {
          setTasks((prev) => [newTask, ...prev]);
        }, (idx * 250) + (optIdx * 80));
      });
    });

    setIsDownloadsDrawerOpen(true);
  };

  // Batch download multiple format options for current single media
  const handleBatchDownloadOptions = (options: DownloadOption[], openDrawer: boolean = false) => {
    if (!media || options.length === 0) return;
    const linkBatchId = 'link_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6);
    const linkBatchTitle = lang === 'ur'
      ? `${media.title} (${options.length} فارمیٹس)`
      : `${media.title} (${options.length} formats)`;

    const selectedOptionIds = new Set(options.map((o) => o.id));
    // Clear any previous tasks for these exact options on the current media so fresh individual progress bars run cleanly
    setTasks((prev) =>
      prev.filter(
        (t) => !(t.sourceUrl === media.originalUrl && t.optionId && selectedOptionIds.has(t.optionId))
      )
    );

    options.forEach((opt, idx) => {
      const taskId = 'opt_batch_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6) + '_' + idx;
      const ext = opt.format.toLowerCase();
      const safeTitle = media.title.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 30);
      const filename = `${media.platform}_${safeTitle}_${(opt.resolution || opt.quality).replace(/\s+/g, '_')}.${ext}`;
      const batchSpeed = lang === 'ur' ? 'جڑ رہا ہے...' : 'Connecting...';
      const initialProg = 0;
      const batchEstSec = calculateEstimatedSecondsRemaining(opt.size, initialProg, '3.2 MB/s');

      const newTask: DownloadTask = {
        id: taskId,
        mediaTitle: `${media.title} (${opt.resolution || opt.quality})`,
        platform: media.platform,
        thumbnail: media.thumbnail,
        format: opt.format,
        quality: opt.quality,
        resolution: opt.resolution,
        progress: initialProg,
        status: 'downloading',
        size: opt.size,
        speed: batchSpeed,
        estimatedSeconds: batchEstSec,
        timeRemaining: formatEstimatedTimeRemaining(batchEstSec, 'downloading', lang),
        url: opt.url,
        filename,
        type: opt.type,
        createdAt: Date.now() + idx * 50,
        retryCount: 0,
        maxRetries: 3,
        batchId: linkBatchId,
        batchType: 'single_link_options',
        batchTitle: linkBatchTitle,
        sourceUrl: media.originalUrl,
        optionId: opt.id,
        duration: media.duration,
        author: media.author || media.creatorHandle,
        creatorProfileUrl: media.creatorProfileUrl,
      };

      setTimeout(() => {
        setTasks((prev) => [newTask, ...prev]);
      }, idx * 140);
    });

    if (openDrawer) {
      setIsDownloadsDrawerOpen(true);
    }
  };

  // History Gallery Handlers — permanently remove deleted/cleared items so they never reload
  const handleDeleteHistoryItem = (id: string) => {
    processedCompletedIdsRef.current.add(id);
    const updated = removeHistoryItem(id);
    setHistory(updated);
    setTasks((prev) => prev.filter((t) => t.id !== id));
  };

  const handleRenameHistoryItem = (id: string, newTitle: string) => {
    const updated = renameHistoryItem(id, newTitle);
    setHistory(updated);
    setTasks((prev) =>
      prev.map((t) => (t.id === id ? { ...t, mediaTitle: newTitle.trim() } : t))
    );
  };

  const handleToggleHideHistoryItem = (id: string) => {
    const updated = toggleHideHistoryItem(id);
    setHistory(updated);
  };

  const handleGoToPageForHistoryItem = (item: HistoryItem) => {
    const sourceUrl =
      item.originalUrl && item.originalUrl.startsWith('http')
        ? item.originalUrl
        : `https://www.${item.platform}.com`;
    setBrowserInitialUrl(sourceUrl);
    setBrowserInitialContext({
      title: item.title,
      thumbnail: item.thumbnail,
      author: item.author,
      videoUrl: item.mediaUrl,
      duration: item.duration,
    });
    setIsBrowserOpen(true);
  };

  const handleClearAllHistory = () => {
    tasks.forEach((t) => processedCompletedIdsRef.current.add(t.id));
    clearAllHistory();
    setHistory([]);
    setTasks((prev) => prev.filter((t) => t.status === 'downloading'));
  };

  const handleDeleteOlderThan7Days = (): { deletedCount: number } => {
    const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;
    const now = Date.now();
    const histRes = deleteHistoryOlderThanDays(7);
    const recentRes = deleteRecentSearchesOlderThanDays(7);
    setHistory(histRes.remaining);
    setRecentSearches(recentRes.remaining);

    let removedTaskCount = 0;
    setTasks((prev) =>
      prev.filter((t) => {
        if (t.status === 'downloading') return true;
        const ts = t.createdAt || 0;
        const isOlder = ts > 0 && now - ts >= sevenDaysMs;
        if (isOlder) {
          processedCompletedIdsRef.current.add(t.id);
          removedTaskCount += 1;
          return false;
        }
        return true;
      })
    );

    return {
      deletedCount: histRes.deletedCount + recentRes.deletedCount + removedTaskCount,
    };
  };

  // Recent Searches Handlers
  const handleSelectRecentSearch = (selectedUrl: string) => {
    setUrl(selectedUrl);
    setIsGalleryOpen(false);
    handleAnalyzeUrl(selectedUrl);
  };

  const handleDeleteRecentSearch = (id: string) => {
    const updated = removeRecentSearch(id);
    setRecentSearches(updated);
  };

  const handleClearAllRecentSearches = () => {
    clearAllRecentSearches();
    setRecentSearches([]);
  };

  const handlePlayHistoryItem = (item: HistoryItem) => {
    const fakeMedia: MediaResult = ensureCompleteMediaResolutionOptions(
      {
        originalUrl: item.originalUrl,
        platform: item.platform,
        title: item.title,
        author: item.author,
        authorAvatar: item.thumbnail,
        thumbnail: item.thumbnail,
        videoUrl: item.mediaUrl,
        isVideo: item.type === 'video',
        timestamp: new Date(item.downloadedAt).toISOString(),
        downloadOptions: [],
      },
      removeWatermark
    );
    setMedia(fakeMedia);
    setPreviewInitialMode(item.type === 'video' ? 'video' : 'image');
    setIsPreviewModalOpen(true);
  };

  const handleOpenExpandablePreview = (mode?: 'video' | 'image') => {
    if (!media) return;
    setPreviewInitialMode(mode || (media.isVideo ? 'video' : 'image'));
    setIsPreviewModalOpen(true);
  };

  const handleReDownloadHistory = (item: HistoryItem) => {
    triggerBrowserDownload(
      item.mediaUrl,
      `${item.platform}_${item.title}.${(item.format || 'mp4').toLowerCase()}`,
      item.originalUrl
    ).catch(() => {});
  };

  // QR Code Handlers
  const handleOpenQrCodeForMedia = (opt?: DownloadOption) => {
    if (!media) return;
    const targetOpt = opt || media.downloadOptions[0];
    const directUrl = targetOpt ? targetOpt.url : (media.videoUrl || media.originalUrl);
    setQrModalData({
      title: media.title,
      platform: media.platform,
      thumbnail: media.thumbnail,
      downloadOption: targetOpt || null,
      directUrl,
      originalUrl: media.originalUrl,
    });
    setIsQrModalOpen(true);
  };

  const handleOpenQrCodeForTask = (task: DownloadTask) => {
    setQrModalData({
      title: task.mediaTitle,
      platform: task.platform,
      thumbnail: task.thumbnail,
      downloadOption: {
        id: task.id,
        label: `${task.quality} ${task.format}`,
        quality: task.quality,
        format: task.format,
        size: task.size,
        url: task.url,
        type: task.type,
      },
      directUrl: task.url,
      originalUrl: task.url,
    });
    setIsQrModalOpen(true);
  };

  const handleOpenQrCodeForHistory = (item: HistoryItem) => {
    setQrModalData({
      title: item.title,
      platform: item.platform,
      thumbnail: item.thumbnail,
      downloadOption: {
        id: item.id,
        label: `${item.quality} ${item.format}`,
        quality: item.quality,
        format: item.format,
        size: item.size,
        url: item.mediaUrl,
        type: item.type,
      },
      directUrl: item.mediaUrl,
      originalUrl: item.originalUrl,
    });
    setIsQrModalOpen(true);
  };

  const handleOpenBrowser = (initialUrl?: string) => {
    setBrowserInitialContext(null);
    if (initialUrl && initialUrl.trim()) {
      setBrowserInitialUrl(initialUrl.trim());
    } else {
      setBrowserInitialUrl('https://www.tiktok.com');
    }
    setIsBrowserOpen(true);
  };

  const handleOpenBrowserForPlatform = (platform: PlatformConfig) => {
    setBrowserInitialContext(null);
    setBrowserInitialUrl(platform.sampleUrl || 'https://www.tiktok.com');
    setIsBrowserOpen(true);
  };

  // Creator Profile & Batch Downloader Handlers
  const handleOpenCreatorProfile = (profile?: {
    handle: string;
    authorName: string;
    avatar: string;
    platform: PlatformType;
    profileUrl: string;
  }) => {
    if (profile) {
      setCreatorModalProfile(profile);
      const updated = saveOrUpdateAccount({
        handle: profile.handle,
        authorName: profile.authorName,
        avatar: profile.avatar,
        platform: profile.platform,
        profileUrl: profile.profileUrl,
      });
      setSavedAccounts(updated);
    } else if (media) {
      const derived = deriveCreatorProfile(
        media.originalUrl,
        media.platform,
        media.author,
        media.creatorProfileUrl,
        media.creatorHandle
      );
      setCreatorModalProfile({
        handle: derived.handle,
        authorName: media.author || derived.handle,
        avatar: media.authorAvatar || media.thumbnail,
        platform: media.platform,
        profileUrl: derived.profileUrl,
      });
    } else if (savedAccounts.length > 0) {
      const first = savedAccounts[0];
      setCreatorModalProfile({
        handle: first.handle,
        authorName: first.authorName,
        avatar: first.avatar,
        platform: first.platform,
        profileUrl: first.profileUrl,
      });
    } else {
      setCreatorModalProfile(null);
    }
    setIsCreatorProfileModalOpen(true);
  };

  const handleSaveCreatorAccount = (account: Omit<SavedAccountItem, 'id' | 'lastVisitedAt'>) => {
    const updated = saveOrUpdateAccount(account);
    setSavedAccounts(updated);
  };

  const handleRemoveSavedAccount = (id: string) => {
    const updated = removeSavedAccount(id);
    setSavedAccounts(updated);
  };

  const handleClearSavedAccounts = () => {
    clearAllSavedAccounts();
    setSavedAccounts([]);
  };

  const handleBatchQueueCreatorVideos = (
    items: CreatorVideoItem[],
    creatorHandle: string,
    platform: PlatformType,
    targetFormat: 'best_video' | '1080p_mp4' | 'mp3_audio'
  ) => {
    if (!items || items.length === 0) return;
    const batchId = 'creator_' + Date.now();
    const batchTitle = `${creatorHandle} (${items.length} items)`;
    const now = Date.now();

    const newBatchTasks: DownloadTask[] = items.map((item, idx) => {
      const isAudio = targetFormat === 'mp3_audio';
      const isImage = (item.type === 'image' || item.isVideo === false) && !isAudio;
      const format = isAudio ? 'MP3' : isImage ? 'JPG' : 'MP4';
      const quality = isAudio
        ? '320kbps Audio'
        : isImage
        ? 'Full HD Image'
        : targetFormat === '1080p_mp4'
        ? '1080p Full HD'
        : item.resolution || '1080p HD';
      const size = item.size || (isAudio ? '3.4 MB' : '14.5 MB');
      const validDirect = item.directUrl && item.directUrl.startsWith('http') ? item.directUrl : undefined;
      const downloadUrl = isAudio
        ? `/api/download?url=${encodeURIComponent(item.url)}&format=audio${validDirect ? `&directUrl=${encodeURIComponent(validDirect)}` : ''}`
        : isImage
        ? `/api/download?url=${encodeURIComponent(item.url)}&format=image&directUrl=${encodeURIComponent(validDirect || item.thumbnail)}`
        : `/api/download?url=${encodeURIComponent(item.url)}&format=video&height=${targetFormat === '1080p_mp4' ? 1080 : 2160}${validDirect ? `&directUrl=${encodeURIComponent(validDirect)}` : ''}`;

      const safeTitle = (item.title || `video_${idx + 1}`).replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 32);
      const filename = `${platform}_${creatorHandle.replace('@', '')}_${safeTitle}.${format.toLowerCase()}`;
      const batchSpeed = lang === 'ur' ? 'جڑ رہا ہے...' : 'Connecting...';
      const initialProg = 0;
      const batchEstSec = calculateEstimatedSecondsRemaining(size, initialProg, '3.2 MB/s');

      return {
        id: `creator_dl_${now}_${idx}_${Math.random().toString(36).slice(2, 6)}`,
        mediaTitle: item.title || `${creatorHandle} #${idx + 1}`,
        platform,
        thumbnail: item.thumbnail,
        format,
        quality,
        progress: initialProg,
        status: 'downloading',
        size,
        speed: batchSpeed,
        estimatedSeconds: batchEstSec,
        timeRemaining: formatEstimatedTimeRemaining(batchEstSec, 'downloading', lang),
        url: downloadUrl,
        filename,
        type: isAudio ? 'audio' : isImage ? 'image' : 'video',
        createdAt: now + idx,
        retryCount: 0,
        maxRetries: 3,
        batchId,
        batchType: 'bulk_import',
        batchTitle,
        sourceUrl: item.url,
        resolution: item.resolution || quality,
        duration: item.duration,
        author: creatorHandle,
        creatorProfileUrl: creatorModalProfile?.profileUrl,
      };
    });

    // Immediately register all selected videos in Gallery history so they are always visible in Gallery
    let latestHist = getSavedHistory();
    newBatchTasks.forEach((task) => {
      latestHist = saveHistoryItem({
        id: task.id,
        title: task.mediaTitle,
        platform: task.platform,
        format: task.format,
        quality: task.quality,
        resolution: task.resolution || task.quality,
        duration: task.duration,
        size: task.size,
        thumbnail: task.thumbnail,
        mediaUrl: task.url,
        type: task.type || 'video',
        downloadedAt: Date.now(),
        originalUrl: task.sourceUrl || task.url,
        author: task.author || creatorHandle,
        creatorProfileUrl: task.creatorProfileUrl,
      });
    });
    setHistory([...latestHist]);

    // Queue and start ALL selected videos simultaneously at once
    setTasks((prev) => [...newBatchTasks, ...prev]);
  };

  const activeTaskCount = tasks.filter((tItem) => tItem.status === 'downloading').length;
  const pausedAndFailedCount = tasks.filter(
    (tItem) => tItem.status === 'paused' || tItem.status === 'failed' || tItem.status === 'error'
  ).length;
  const totalAttentionCount = activeTaskCount + pausedAndFailedCount;

  // ============================================================================
  // UNIFIED MOBILE HARDWARE / SYSTEM BACK BUTTON & IN-APP BACK NAVIGATION
  // ============================================================================
  const builtInBrowserBackRef = useRef<(() => boolean) | null>(null);
  const inAppBrowserBackRef = useRef<(() => boolean) | null>(null);
  const historyGalleryBackRef = useRef<(() => boolean) | null>(null);

  const [builtInBrowserBackDepth, setBuiltInBrowserBackDepth] = useState<number>(0);
  const [inAppBrowserBackDepth, setInAppBrowserBackDepth] = useState<number>(0);
  const [historyGalleryBackDepth, setHistoryGalleryBackDepth] = useState<number>(0);
  const [isDownloadedVideoPlaying, setIsDownloadedVideoPlaying] = useState<boolean>(false);
  const [externalBrowserSearch, setExternalBrowserSearch] = useState<{
    query: string;
    tick: number;
  } | null>(null);

  const pushedHistoryCountRef = useRef<number>(0);
  const prevAppBackDepthRef = useRef<number>(0);
  const isHandlingPopStateRef = useRef<boolean>(false);

  // Total active back-steps available in the application
  const appBackDepth =
    (isPreviewModalOpen ? 1 : 0) +
    (isQrModalOpen ? 1 : 0) +
    (isAICaptionOpen ? 1 : 0) +
    (isScheduleModalOpen ? 1 : 0) +
    (isClipboardQuickPreviewOpen ? 1 : 0) +
    (isBrowserOpen ? 1 + inAppBrowserBackDepth : 0) +
    (isCreatorProfileModalOpen ? 1 : 0) +
    (isGeminiChatOpen ? 1 : 0) +
    (isBatchOpen ? 1 : 0) +
    (isFreqModalOpen ? 1 : 0) +
    (isInstallModalOpen ? 1 : 0) +
    (isDriveModalOpen ? 1 : 0) +
    (isGuideOpen ? 1 : 0) +
    (isGalleryOpen ? 1 + historyGalleryBackDepth : 0) +
    (isDownloadsDrawerOpen ? 1 : 0) +
    (isSettingsDrawerOpen ? 1 : 0) +
    (isMoreDrawerOpen ? 1 : 0) +
    (activeSection !== 'downloader' ? 1 : 0) +
    (media !== null || errorMessage !== null || isLoading ? 1 : 0) +
    builtInBrowserBackDepth +
    (url.trim() !== '' && !media ? 1 : 0);

  const canAppGoBack = appBackDepth > 0;

  // Priority-ordered back handler that unwinds the topmost active modal, drawer, view, or browser step
  const handleAppBack = (): boolean => {
    if (isPreviewModalOpen) {
      setIsPreviewModalOpen(false);
      return true;
    }
    if (isQrModalOpen) {
      setIsQrModalOpen(false);
      return true;
    }
    if (isAICaptionOpen) {
      setIsAICaptionOpen(false);
      return true;
    }
    if (isScheduleModalOpen) {
      setIsScheduleModalOpen(false);
      setScheduleTargetOption(null);
      setScheduleTargetTask(null);
      return true;
    }
    if (isClipboardQuickPreviewOpen) {
      setIsClipboardQuickPreviewOpen(false);
      setIsClipboardInlineVideoPlaying(false);
      return true;
    }
    if (isBrowserOpen) {
      if (inAppBrowserBackRef.current && inAppBrowserBackRef.current()) {
        return true;
      }
      setIsBrowserOpen(false);
      return true;
    }
    if (isCreatorProfileModalOpen) {
      setIsCreatorProfileModalOpen(false);
      return true;
    }
    if (isGeminiChatOpen) {
      setIsGeminiChatOpen(false);
      setGeminiChatContext(null);
      return true;
    }
    if (isBatchOpen) {
      setIsBatchOpen(false);
      return true;
    }
    if (isFreqModalOpen) {
      setIsFreqModalOpen(false);
      return true;
    }
    if (isInstallModalOpen) {
      setIsInstallModalOpen(false);
      return true;
    }
    if (isDriveModalOpen) {
      setIsDriveModalOpen(false);
      return true;
    }
    if (isGuideOpen) {
      setIsGuideOpen(false);
      return true;
    }
    if (isGalleryOpen) {
      if (historyGalleryBackRef.current && historyGalleryBackRef.current()) {
        return true;
      }
      setIsGalleryOpen(false);
      return true;
    }
    if (isDownloadsDrawerOpen) {
      setIsDownloadsDrawerOpen(false);
      return true;
    }
    if (isSettingsDrawerOpen) {
      setIsSettingsDrawerOpen(false);
      return true;
    }
    if (isMoreDrawerOpen) {
      setIsMoreDrawerOpen(false);
      return true;
    }
    if (activeSection !== 'downloader') {
      setActiveSection('downloader');
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return true;
    }
    if (media !== null || errorMessage !== null || isLoading) {
      handleDownloadNewVideo();
      return true;
    }
    if (builtInBrowserBackRef.current && builtInBrowserBackRef.current()) {
      return true;
    }
    if (url.trim() !== '') {
      handleDownloadNewVideo();
      return true;
    }
    if (typeof window !== 'undefined' && window.scrollY > 100) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return true;
    }
    return false;
  };

  const handleAppBackRef = useRef(handleAppBack);
  handleAppBackRef.current = handleAppBack;

  const appBackDepthRef = useRef(appBackDepth);
  appBackDepthRef.current = appBackDepth;

  // Push browser history entries as app navigation depth increases so mobile hardware/swipe Back triggers popstate
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const prevDepth = prevAppBackDepthRef.current;
    prevAppBackDepthRef.current = appBackDepth;

    if (isHandlingPopStateRef.current) {
      isHandlingPopStateRef.current = false;
      // Ensure at least 1 history guard entry remains if the app still has active back layers
      if (appBackDepth > 0 && pushedHistoryCountRef.current === 0) {
        try {
          window.history.pushState({ mediaflowAppBack: true, depth: appBackDepth }, '');
          pushedHistoryCountRef.current = 1;
        } catch {
          // ignore history state errors in restricted contexts
        }
      }
      return;
    }

    if (appBackDepth > prevDepth) {
      const diff = appBackDepth - prevDepth;
      const stepsToPush = Math.min(diff, 3);
      for (let i = 0; i < stepsToPush; i++) {
        try {
          window.history.pushState(
            { mediaflowAppBack: true, depth: pushedHistoryCountRef.current + 1 },
            ''
          );
          pushedHistoryCountRef.current += 1;
        } catch {
          // ignore
        }
      }
    } else if (appBackDepth > 0 && pushedHistoryCountRef.current === 0) {
      try {
        window.history.pushState({ mediaflowAppBack: true, depth: appBackDepth }, '');
        pushedHistoryCountRef.current = 1;
      } catch {
        // ignore
      }
    }
  }, [appBackDepth]);

  // Intercept mobile hardware Back button & iOS/Android swipe-back gesture via popstate
  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Arm a base history entry on first user touch/click so mobile Back stays inside the app
    const armInitialHistoryGuard = () => {
      if (pushedHistoryCountRef.current === 0) {
        try {
          window.history.pushState({ mediaflowAppBack: true, depth: 0 }, '');
          pushedHistoryCountRef.current = 1;
        } catch {
          // ignore
        }
      }
    };

    const handlePopState = () => {
      isHandlingPopStateRef.current = true;
      pushedHistoryCountRef.current = Math.max(0, pushedHistoryCountRef.current - 1);

      const handled = handleAppBackRef.current();
      if (handled && appBackDepthRef.current > 1 && pushedHistoryCountRef.current === 0) {
        try {
          window.history.pushState({ mediaflowAppBack: true, depth: appBackDepthRef.current - 1 }, '');
          pushedHistoryCountRef.current = 1;
        } catch {
          // ignore
        }
      }
    };

    window.addEventListener('touchstart', armInitialHistoryGuard, { once: true, passive: true });
    window.addEventListener('click', armInitialHistoryGuard, { once: true });
    window.addEventListener('popstate', handlePopState);
    return () => {
      window.removeEventListener('touchstart', armInitialHistoryGuard);
      window.removeEventListener('click', armInitialHistoryGuard);
      window.removeEventListener('popstate', handlePopState);
    };
  }, []);

  return (
    <div className={`relative min-h-screen flex flex-col font-sans transition-colors duration-300 overflow-x-hidden ${
      theme === 'light'
        ? 'bg-white text-slate-900'
        : theme === 'amoled'
        ? 'bg-black text-slate-100'
        : theme === 'crimson'
        ? 'bg-[#12060b] text-rose-50'
        : theme === 'emerald'
        ? 'bg-[#04120d] text-emerald-50'
        : theme === 'sunset'
        ? 'bg-[#11081f] text-violet-50'
        : 'bg-[#121212] text-slate-100'
    } ${lang === 'ur' ? 'direction-rtl' : ''}`}>
      
      {/* Full-Screen Animated Splash Screen on Application Open / Reload */}
      <SplashScreen />

      {/* Dynamic Ambient Background Mesh */}
      <ColorfulBackground lang={lang} theme={theme} />

      {/* Navigation Bar & Side Menu Drawer */}
      <Header
        lang={lang}
        onToggleLang={handleToggleLang}
        onSelectLang={handleSelectLang}
        theme={theme}
        onToggleTheme={handleToggleTheme}
        onSelectTheme={handleSelectTheme}
        autoDetectClipboard={autoDetectClipboard}
        onToggleAutoDetectClipboard={handleToggleAutoDetectClipboard}
        enableFloatingButton={enableFloatingButton}
        onToggleFloatingButton={handleToggleFloatingButton}
        removeWatermark={removeWatermark}
        onToggleWatermark={setRemoveWatermark}
        desktopNotifications={desktopNotifications}
        onToggleDesktopNotifications={handleToggleDesktopNotifications}
        onTestNotification={handleTestDesktopNotification}
        maxAutoDownloadSize={maxAutoDownloadSize}
        onChangeMaxAutoDownloadSize={handleSetMaxAutoDownloadSize}
        fileSizeUnit={fileSizeUnit}
        onChangeFileSizeUnit={handleChangeFileSizeUnit}
        downloadSpeedCap={downloadSpeedCap}
        onChangeDownloadSpeedCap={handleSetDownloadSpeedCap}
        autoClearDuration={autoClearDuration}
        onChangeAutoClearDuration={handleChangeAutoClearDuration}
        autoClearRetentionMode={autoClearRetentionMode}
        onChangeAutoClearRetentionMode={handleChangeAutoClearRetentionMode}
        clearSuccessfullyFinished={clearSuccessfullyFinished}
        onToggleClearSuccessfullyFinished={handleToggleClearSuccessfullyFinished}
        onClearCompletedNow={() => {
          handleClearCompleted();
        }}
        onDeleteOlderThan7Days={() => {
          handleDeleteOlderThan7Days();
        }}
        activeDownloads={tasks}
        onOpenDownloadsDrawer={() => setIsDownloadsDrawerOpen(true)}
        onOpenGallery={() => setIsGalleryOpen(true)}
        onOpenGuide={() => setIsGuideOpen(true)}
        onOpenDrive={() => setIsDriveModalOpen(true)}
        onOpenInstall={() => handleTriggerPwaInstall()}
        onOpenBatch={() => setIsBatchOpen(true)}
        onOpenBrowser={() => handleOpenBrowser()}
        onOpenGeminiChat={() => handleOpenGeminiChat()}
        onOpenCreatorProfile={(acc) =>
          handleOpenCreatorProfile(
            acc
              ? {
                  handle: acc.handle,
                  authorName: acc.authorName,
                  avatar: acc.avatar,
                  platform: acc.platform,
                  profileUrl: acc.profileUrl,
                }
              : undefined
          )
        }
        onOpenFrequentlyDownloaded={() => setIsFreqModalOpen(true)}
        frequentlyDownloadedCount={savedAccounts.length}
        savedAccounts={savedAccounts}
        onRemoveSavedAccount={handleRemoveSavedAccount}
        onClearSavedAccounts={handleClearSavedAccounts}
        historyCount={history.length}
        user={driveUser}
        onAuthChange={setDriveUser}
        activeSection={activeSection}
        onChangeSection={setActiveSection}
        isSettingsOpen={isSettingsDrawerOpen}
        onToggleSettingsOpen={(val) => {
          setIsSettingsDrawerOpen(val);
          if (val) setIsMoreDrawerOpen(false);
        }}
        isMoreOpen={isMoreDrawerOpen}
        onToggleMoreOpen={(val) => {
          setIsMoreDrawerOpen(val);
          if (val) setIsSettingsDrawerOpen(false);
        }}
        onSelectPlatform={(platformId) => {
          setActiveSection('downloader');
          const found = PLATFORMS.find(p => p.id === platformId);
          if (found) {
            handleSelectPlatform(found);
          }
        }}
        canAppGoBack={canAppGoBack}
        onAppBack={() => {
          handleAppBack();
        }}
      />

      {/* Floating Google Drive Toast Notification */}
      {driveNotification && (
        <div className="fixed top-20 sm:top-24 left-1/2 -translate-x-1/2 z-50 w-[94%] sm:w-11/12 max-w-md animate-fade-in">
          <div className={`p-3.5 sm:p-4 rounded-2xl border shadow-2xl backdrop-blur-xl flex items-center justify-between gap-3 ${
            driveNotification.type === 'success'
              ? 'bg-emerald-950/90 border-emerald-500/40 text-emerald-200'
              : driveNotification.type === 'error'
              ? 'bg-rose-950/90 border-rose-500/40 text-rose-200'
              : 'bg-[#101829]/95 border-cyan-500/40 text-cyan-200'
          }`}>
            <div className="flex items-center gap-2.5 min-w-0">
              <HardDrive className="w-5 h-5 shrink-0" />
              <p className="text-xs font-bold truncate">
                {driveNotification.message}
              </p>
            </div>
            <button
              onClick={() => setDriveNotification(null)}
              className="p-1 text-slate-400 hover:text-white cursor-pointer"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* Floating Clipboard Auto-Detect Toast Banner (Disabled to prevent overlapping top search bar) */}
      {false && showClipboardToast && clipboardDetectedUrl && (
        <div
          className="fixed top-20 sm:top-24 left-1/2 -translate-x-1/2 z-50 w-[95%] sm:w-11/12 max-w-xl animate-fade-in"
          id="clipboard-auto-detect-toast"
        >
          <div className="p-3 sm:p-3.5 rounded-2xl bg-[#101829]/95 backdrop-blur-xl border border-cyan-500/45 shadow-[0_0_30px_rgba(56,189,248,0.22)] flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-3">
            <div className="flex items-center gap-2.5 min-w-0 flex-1">
              {clipboardPreviewMedia?.thumbnail ? (
                <button
                  type="button"
                  onClick={() => {
                    if (!clipboardPreviewMedia || clipboardPreviewMedia.originalUrl !== clipboardDetectedUrl) {
                      prefetchClipboardMetadata(clipboardDetectedUrl);
                    }
                    setIsClipboardQuickPreviewOpen(true);
                  }}
                  className="relative w-10 h-10 rounded-xl overflow-hidden bg-slate-900 border border-cyan-400/40 shrink-0 group cursor-pointer"
                  title={lang === 'ur' ? 'فوری پریویو کھولیں' : 'Open Quick-Preview'}
                >
                  <img
                    src={clipboardPreviewMedia.thumbnail}
                    alt={clipboardPreviewMedia.title}
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform"
                    referrerPolicy="no-referrer"
                  />
                  <span className="absolute inset-0 bg-black/35 flex items-center justify-center">
                    <Eye className="w-3.5 h-3.5 text-cyan-300" />
                  </span>
                </button>
              ) : (
                <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 shrink-0 animate-ping" />
              )}

              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <p className="text-[11px] sm:text-xs font-bold text-white truncate">
                    {lang === 'ur' ? 'کلپ بورڈ سے لنک مل گیا:' : 'Copied link detected:'}
                  </p>
                  {clipboardPreviewMedia?.duration && (
                    <span className="px-1.5 py-0.5 rounded bg-cyan-500/15 border border-cyan-400/30 text-[10px] font-mono text-cyan-300 shrink-0">
                      {clipboardPreviewMedia.duration}
                    </span>
                  )}
                </div>
                <p className="text-xs font-mono text-cyan-400 truncate">
                  {clipboardDetectedUrl}
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-1.5 shrink-0">
              <button
                type="button"
                id="clipboard-toast-quick-preview-btn"
                onClick={() => {
                  if (!clipboardPreviewMedia || clipboardPreviewMedia.originalUrl !== clipboardDetectedUrl) {
                    prefetchClipboardMetadata(clipboardDetectedUrl);
                  }
                  setIsClipboardQuickPreviewOpen(true);
                }}
                className="px-2.5 py-1.5 rounded-xl bg-slate-800/95 hover:bg-slate-700 text-cyan-200 border border-cyan-400/40 text-xs font-bold flex items-center gap-1.5 transition-all active:scale-95 cursor-pointer whitespace-nowrap shadow-xs"
              >
                <Eye className="w-3.5 h-3.5 text-cyan-300 shrink-0" />
                <span>{lang === 'ur' ? 'فوری پریویو' : 'Quick-Preview'}</span>
              </button>

              <button
                type="button"
                id="clipboard-toast-paste-fetch-btn"
                onClick={() => {
                  setActiveSection('downloader');
                  unmarkUrlAsCleared(clipboardDetectedUrl);
                  setUrl(clipboardDetectedUrl);
                  if (
                    clipboardPreviewMedia &&
                    clipboardPreviewMedia.originalUrl === clipboardDetectedUrl &&
                    !isClipboardPreviewLoading
                  ) {
                    setMedia(clipboardPreviewMedia);
                    lastAutoAnalyzedUrlRef.current = clipboardDetectedUrl;
                  } else {
                    handleAnalyzeUrl(clipboardDetectedUrl, false, true);
                  }
                  setShowClipboardToast(false);
                  setIsClipboardQuickPreviewOpen(false);
                }}
                className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-[#2563eb] to-[#38bdf8] text-white text-xs font-bold shadow-[0_0_15px_rgba(56,189,248,0.4)] transition-transform active:scale-95 cursor-pointer whitespace-nowrap"
              >
                {lang === 'ur' ? 'پیسٹ اور فیچ' : 'Paste & Fetch'}
              </button>

              <button
                type="button"
                onClick={() => {
                  setShowClipboardToast(false);
                  markUrlAsCleared(clipboardDetectedUrl);
                }}
                className="p-1.5 text-slate-400 hover:text-white cursor-pointer min-h-[32px] min-w-[32px] flex items-center justify-center"
                title={lang === 'ur' ? 'بند کریں' : 'Dismiss'}
              >
                ✕
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Clipboard Quick-Preview Metadata Modal */}
      {isClipboardQuickPreviewOpen && clipboardDetectedUrl && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="clipboard-quick-preview-title"
          id="clipboard-quick-preview-modal"
          className="fixed inset-0 z-[85] bg-black/75 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 animate-fade-in"
          onClick={() => {
            setIsClipboardQuickPreviewOpen(false);
            setIsClipboardInlineVideoPlaying(false);
          }}
        >
          {(() => {
            const previewData =
              clipboardPreviewMedia ||
              generateClientSideMediaResult(clipboardDetectedUrl, removeWatermark);
            const bestHdOpt = pickBestHdOption(previewData);
            const bestResolution = bestHdOpt?.resolution || 'Original HD';
            const bestSize =
              bestHdOpt?.size && /\d/.test(bestHdOpt.size)
                ? formatDisplayFileSize(bestHdOpt.size, fileSizeUnit)
                : 'Direct Stream';
            const videoOpts = (previewData.downloadOptions || []).filter(
              (o) => o.type === 'video' && o.url && o.url.trim().length > 0
            );
            const hasAudioOpt = (previewData.downloadOptions || []).some(
              (o) => o.type === 'audio' && o.url && o.url.trim().length > 0
            );

            return (
              <div
                className="w-full max-w-md rounded-3xl bg-[#0e1526] border border-cyan-500/40 shadow-[0_0_40px_rgba(56,189,248,0.22)] overflow-hidden flex flex-col"
                onClick={(e) => e.stopPropagation()}
              >
                {/* Modal Header */}
                <div className="px-4 py-3 bg-gradient-to-r from-[#0f172a] via-[#13203a] to-[#0f172a] border-b border-cyan-500/25 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="w-7 h-7 rounded-xl bg-cyan-500/20 border border-cyan-400/40 flex items-center justify-center text-cyan-300 shrink-0">
                      <Eye className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <h3
                        id="clipboard-quick-preview-title"
                        className="text-xs sm:text-sm font-black text-white truncate"
                      >
                        {lang === 'ur'
                          ? 'فوری لنک پریویو (Quick-Preview)'
                          : 'Clipboard Link Quick-Preview'}
                      </h3>
                      <p className="text-[10px] text-cyan-300/90 font-mono truncate">
                        {previewData.platform.toUpperCase()} ·{' '}
                        {isClipboardPreviewLoading
                          ? lang === 'ur'
                            ? 'لائیو میٹا ڈیٹا لوڈ ہو رہا ہے...'
                            : 'Refreshing live metadata...'
                          : lang === 'ur'
                          ? 'میٹا ڈیٹا تیار ہے'
                          : 'Metadata Ready'}
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setIsClipboardQuickPreviewOpen(false);
                      setIsClipboardInlineVideoPlaying(false);
                    }}
                    className="p-1.5 rounded-xl bg-white/5 hover:bg-white/15 text-slate-300 hover:text-white text-xs font-bold cursor-pointer"
                    title={lang === 'ur' ? 'بند کریں' : 'Close'}
                    id="close-clipboard-quick-preview-btn"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* Modal Body */}
                <div className="p-4 space-y-3.5">
                  {/* Thumbnail & Inline Video Preview */}
                  <div className="relative rounded-2xl overflow-hidden bg-black aspect-video border border-cyan-400/25 shadow-lg">
                    {isClipboardInlineVideoPlaying && previewData.isVideo ? (
                      <video
                        src={
                          previewData.videoUrl ||
                          bestHdOpt?.url ||
                          `/api/stream?url=${encodeURIComponent(clipboardDetectedUrl)}`
                        }
                        poster={previewData.thumbnail}
                        controls
                        autoPlay
                        playsInline
                        className="w-full h-full object-contain bg-black"
                      />
                    ) : (
                      <div
                        onClick={() => {
                          if (previewData.isVideo) {
                            setIsClipboardInlineVideoPlaying(true);
                          }
                        }}
                        className="w-full h-full relative group cursor-pointer"
                      >
                        <img
                          src={previewData.thumbnail}
                          alt={previewData.title}
                          onError={(e) => {
                            const target = e.currentTarget;
                            if (!target.dataset.proxied && previewData.thumbnail?.startsWith('http')) {
                              target.dataset.proxied = '1';
                              target.src = `/api/image-proxy?url=${encodeURIComponent(previewData.thumbnail)}`;
                            }
                          }}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          referrerPolicy="no-referrer"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-black/35" />

                        {/* Platform Badge Top-Left */}
                        <div className="absolute top-2.5 left-2.5 px-2.5 py-0.5 rounded-full bg-black/75 backdrop-blur-xs border border-cyan-400/40 text-cyan-300 text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
                          <span>{previewData.platform}</span>
                        </div>

                        {/* Resolution Badge Top-Right */}
                        <div className="absolute top-2.5 right-2.5 px-2 py-0.5 rounded-md bg-emerald-500/85 text-white text-[10px] font-mono font-black border border-emerald-300/50">
                          {bestResolution}
                        </div>

                        {/* Center Play Preview Trigger */}
                        {previewData.isVideo && (
                          <div className="absolute inset-0 flex items-center justify-center">
                            <div className="w-11 h-11 rounded-full bg-cyan-500/90 group-hover:bg-cyan-400 text-slate-950 flex items-center justify-center shadow-[0_0_20px_rgba(56,189,248,0.65)] group-hover:scale-110 transition-all">
                              <Play className="w-5 h-5 fill-current ml-0.5" />
                            </div>
                          </div>
                        )}

                        {/* Duration Overlay Bottom-Right */}
                        {previewData.duration && (
                          <div className="absolute bottom-2.5 right-2.5 px-2 py-0.5 rounded-md bg-black/80 text-white text-[11px] font-mono font-bold border border-white/15 flex items-center gap-1">
                            <Clock className="w-3 h-3 text-cyan-400" />
                            <span>{previewData.duration}</span>
                          </div>
                        )}

                        {/* Watermark Free Badge Bottom-Left */}
                        {previewData.watermarkRemoved && (
                          <div className="absolute bottom-2.5 left-2.5 px-2 py-0.5 rounded-md bg-black/75 text-emerald-300 text-[10px] font-bold border border-emerald-400/30 flex items-center gap-1">
                            <ShieldCheck className="w-3 h-3" />
                            <span>{lang === 'ur' ? 'بغیر واٹر مارک' : 'No Watermark'}</span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Title & Creator Row */}
                  <div className="space-y-1">
                    <div className="flex items-start justify-between gap-2">
                      <h4 className="text-xs sm:text-sm font-bold text-white line-clamp-2 leading-snug">
                        {previewData.title}
                      </h4>
                      {isClipboardPreviewLoading && (
                        <Loader2 className="w-4 h-4 text-cyan-400 animate-spin shrink-0 mt-0.5" />
                      )}
                    </div>
                    <div className="flex items-center justify-between text-[11px] text-slate-400">
                      <span className="font-semibold text-cyan-300 truncate">
                        {previewData.author || '@creator'}
                      </span>
                      <span className="font-mono text-[10px] text-slate-500 truncate max-w-[200px]">
                        {clipboardDetectedUrl}
                      </span>
                    </div>
                  </div>

                  {/* Key Metadata Pills Grid (Duration, Resolution, Est. File Size) */}
                  <div className="grid grid-cols-3 gap-2">
                    <div className="p-2.5 rounded-xl bg-[#131d33] border border-white/10 text-center">
                      <span className="text-[10px] text-slate-400 block">
                        {lang === 'ur' ? 'دورانیہ (Duration)' : 'Duration'}
                      </span>
                      <span className="text-xs font-mono font-extrabold text-white mt-0.5 block">
                        {previewData.duration || '00:45'}
                      </span>
                    </div>

                    <div className="p-2.5 rounded-xl bg-[#131d33] border border-cyan-500/25 text-center">
                      <span className="text-[10px] text-slate-400 block">
                        {lang === 'ur' ? 'ریزولوشن (Resolution)' : 'Top Quality'}
                      </span>
                      <span className="text-xs font-mono font-extrabold text-cyan-300 mt-0.5 block">
                        {bestResolution}
                      </span>
                    </div>

                    <div className="p-2.5 rounded-xl bg-[#131d33] border border-emerald-500/25 text-center">
                      <span className="text-[10px] text-slate-400 block">
                        {lang === 'ur' ? 'فائل سائز (Size)' : 'Est. Size'}
                      </span>
                      <span className="text-xs font-mono font-extrabold text-emerald-300 mt-0.5 block">
                        {bestSize}
                      </span>
                    </div>
                  </div>

                  {/* Available Resolutions Summary Chips */}
                  <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                    <span className="text-[10px] font-bold text-slate-400 mr-1">
                      {lang === 'ur' ? 'دستیاب فارمیٹس:' : 'Available:'}
                    </span>
                    {videoOpts.slice(0, 4).map((vOpt) => (
                      <span
                        key={vOpt.id}
                        className="px-2 py-0.5 rounded-md bg-slate-800/90 border border-slate-700 text-[10px] font-mono text-slate-200"
                      >
                        {vOpt.resolution} ({formatDisplayFileSize(vOpt.size, fileSizeUnit)})
                      </span>
                    ))}
                    {hasAudioOpt && (
                      <span className="px-2 py-0.5 rounded-md bg-indigo-950/80 border border-indigo-500/35 text-[10px] font-mono text-indigo-200">
                        MP3 320kbps
                      </span>
                    )}
                  </div>

                  {/* Primary Action Buttons */}
                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <button
                      type="button"
                      id="quick-preview-paste-fetch-btn"
                      onClick={() => {
                        setActiveSection('downloader');
                        unmarkUrlAsCleared(clipboardDetectedUrl);
                        setUrl(clipboardDetectedUrl);
                        if (
                          clipboardPreviewMedia &&
                          clipboardPreviewMedia.originalUrl === clipboardDetectedUrl &&
                          !isClipboardPreviewLoading
                        ) {
                          setMedia(clipboardPreviewMedia);
                          lastAutoAnalyzedUrlRef.current = clipboardDetectedUrl;
                        } else {
                          handleAnalyzeUrl(clipboardDetectedUrl, false, true);
                        }
                        setIsClipboardQuickPreviewOpen(false);
                        setIsClipboardInlineVideoPlaying(false);
                        setShowClipboardToast(false);
                      }}
                      className="py-2.5 px-3 rounded-xl bg-gradient-to-r from-[#2563eb] to-[#38bdf8] hover:from-blue-500 hover:to-sky-400 text-white text-xs font-black flex items-center justify-center gap-1.5 shadow-[0_0_18px_rgba(56,189,248,0.35)] cursor-pointer transition-all active:scale-98"
                    >
                      <Zap className="w-3.5 h-3.5 shrink-0" />
                      <span>{lang === 'ur' ? 'پیسٹ اور فیچ (Paste & Fetch)' : 'Paste & Fetch'}</span>
                    </button>

                    <button
                      type="button"
                      id="quick-preview-hd-download-btn"
                      onClick={() => {
                        setActiveSection('downloader');
                        unmarkUrlAsCleared(clipboardDetectedUrl);
                        setUrl(clipboardDetectedUrl);
                        setMedia(previewData);
                        lastAutoAnalyzedUrlRef.current = clipboardDetectedUrl;
                        if (bestHdOpt) {
                          handleStartDownload(bestHdOpt, previewData);
                        } else {
                          handleInstantHdDownload(clipboardDetectedUrl, true);
                        }
                        setIsClipboardQuickPreviewOpen(false);
                        setIsClipboardInlineVideoPlaying(false);
                        setShowClipboardToast(false);
                      }}
                      className="py-2.5 px-3 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-black flex items-center justify-center gap-1.5 shadow-[0_0_18px_rgba(16,185,129,0.3)] cursor-pointer transition-all active:scale-98"
                    >
                      <Download className="w-3.5 h-3.5 shrink-0" />
                      <span>{lang === 'ur' ? 'فوری HD ڈاؤن لوڈ' : 'HD Download'}</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })()}
        </div>
      )}

      {/* Main Content Area — Padded for fixed top header and fixed bottom navigation bar */}
      <main className="relative flex-1 max-w-4xl w-full mx-auto px-3.5 sm:px-6 pt-18 sm:pt-20 pb-24 sm:pb-26 space-y-4 flex flex-col">
        
        {/* Error Alert if any */}
        {errorMessage && (
          <div
            className={`max-w-2xl w-full mx-auto p-3.5 rounded-2xl border text-xs sm:text-sm font-medium flex items-center justify-between animate-fade-in ${
              theme === 'light'
                ? 'bg-rose-50 border-rose-200 text-rose-800'
                : 'bg-rose-950/80 border-rose-500/40 text-rose-200'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
              <span>{errorMessage}</span>
            </div>
            <button
              type="button"
              onClick={() => setErrorMessage(null)}
              className="text-rose-500 hover:opacity-80 font-bold px-2 cursor-pointer"
            >
              ✕
            </button>
          </div>
        )}

        {activeSection === 'downloader' && (
          <div className="flex-1 flex flex-col space-y-4 sm:space-y-5 animate-fade-in">
            {/* 1. Main Download Link Extraction Section (Directly Below Header) */}
            <LinkInputSection
              lang={lang}
              theme={theme}
              url={url}
              onChangeUrl={(newVal) => {
                if (newVal.trim()) {
                  unmarkUrlAsCleared(newVal.trim());
                }
                setUrl(newVal);
              }}
              onClear={handleDownloadNewVideo}
              onAnalyze={(customUrl) => handleAnalyzeUrl(customUrl, false, true)}
              onHdDownload={(customUrl) => handleAnalyzeUrl(customUrl, false, true)}
              clipboardDetectedUrl={clipboardDetectedUrl}
              onSearchKeyword={(keyword) => {
                setExternalBrowserSearch({ query: keyword, tick: Date.now() });
              }}
              hdReadyOption={
                media
                  ? (() => {
                      const opt = pickBestHdOption(media);
                      return opt
                        ? { resolution: opt.resolution, size: formatDisplayFileSize(opt.size, fileSizeUnit) }
                        : null;
                    })()
                  : null
              }
              isLoading={isLoading}
              loadingMessage={loadingMessage}
              onOpenBatch={() => setIsBatchOpen(true)}
              onOpenInstall={() => handleTriggerPwaInstall()}
              onSelectSample={(sample) => {
                setUrl(sample);
                handleAnalyzeUrl(sample, false, true);
              }}
              removeWatermark={removeWatermark}
              onToggleWatermark={setRemoveWatermark}
              onProcessBatch={handleProcessBatch}
              onOpenBrowser={(urlToOpen) => handleOpenBrowser(urlToOpen)}
              onOpenCreatorBatch={() => handleOpenCreatorProfile()}
              onOpenFrequentlyDownloaded={() => setIsFreqModalOpen(true)}
              frequentlyDownloadedCount={savedAccounts.length}
              onOpenCommunity={() => {
                setActiveSection('community');
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              recentSearches={recentSearches}
              onRemoveRecentSearch={(id) => setRecentSearches(removeRecentSearch(id))}
              onClearRecentSearches={() => {
                clearAllRecentSearches();
                setRecentSearches([]);
              }}
              onDeleteOlderThan7Days={() => {
                handleDeleteOlderThan7Days();
              }}
            />

            {/* 2. In-App Browser & Search Engine Section (Moves to top & expands full-screen on focus/search) */}
            <BuiltInChromeBrowser
              lang={lang}
              theme={theme}
              backHandlerRef={builtInBrowserBackRef}
              onBackDepthChange={setBuiltInBrowserBackDepth}
              clipboardDetectedUrl={clipboardDetectedUrl}
              recentSearches={recentSearches}
              externalSearchQuery={externalBrowserSearch}
              onDownloadUrl={(selectedUrl) => {
                setActiveSection('downloader');
                setUrl(selectedUrl);
                handleAnalyzeUrl(selectedUrl, false, true);
              }}
            />

            {/* 3. Full Link Parsing Bottom Sheet Modal (Triggered on Download / Analyze) */}
            <AnimatePresence>
              {media && (
                <MediaResultCard
                  key={`media_card_${media.platform || 'universal'}_${cleanSocialUrl(media.originalUrl || 'card')}`}
                  media={media}
                  lang={lang}
                  fileSizeUnit={fileSizeUnit}
                  tasks={tasks}
                  onStartDownload={handleStartDownload}
                  onBatchDownloadOptions={handleBatchDownloadOptions}
                  onRetryTask={handleRetryTask}
                  onPauseTask={handlePauseTask}
                  onResumeTask={handleResumeTask}
                  onOpenDownloadsDrawer={() => setIsDownloadsDrawerOpen(true)}
                  onPlayVideo={() => handleOpenExpandablePreview('video')}
                  onOpenExpandablePreview={handleOpenExpandablePreview}
                  onOpenAICaptions={() => setIsAICaptionOpen(true)}
                  onOpenGeminiChat={handleOpenGeminiChat}
                  onOpenQrCode={handleOpenQrCodeForMedia}
                  onScheduleDownload={handleOpenScheduleForOption}
                  onDownloadNewVideo={handleDownloadNewVideo}
                  onOpenCreatorProfile={(prof) => handleOpenCreatorProfile(prof)}
                  onSaveToDrive={(opt) => {
                    const ext = opt.format.toLowerCase();
                    const safeTitle = media.title.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 30);
                    const filename = `${media.platform}_${safeTitle}_${opt.quality.replace(/\s+/g, '_')}.${ext}`;
                    const targetStreamUrl =
                      opt.url && opt.url.startsWith('/api/')
                        ? opt.url
                        : `/api/download?url=${encodeURIComponent(media.originalUrl || url || opt.url)}&format=${encodeURIComponent(opt.type === 'audio' ? 'mp3' : 'best')}${opt.url && opt.url.startsWith('http') ? `&directUrl=${encodeURIComponent(opt.url)}` : ''}`;
                    handleSaveMediaToDrive(targetStreamUrl, filename);
                  }}
                />
              )}
            </AnimatePresence>

            {/* 4. App Download Link Positioned at the Very Bottom of the Page */}
            <div
              id="home-app-download-bar"
              className={`mt-auto pt-4 pb-1 flex items-center justify-center gap-2 text-xs sm:text-sm ${
                theme === 'light' ? 'text-slate-600' : 'text-slate-300'
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
        )}

        {activeSection === 'platforms' && (
          <div className="space-y-4 animate-fade-in max-w-3xl w-full mx-auto">
            <div
              className={`p-4 sm:p-6 rounded-2xl sm:rounded-3xl border space-y-5 overflow-hidden ${
                theme === 'light'
                  ? 'bg-white border-slate-200 text-slate-900 shadow-xs'
                  : 'bg-[#111827] border-slate-800 text-slate-100 shadow-lg'
              }`}
            >
              <div className="flex items-center justify-between border-b pb-3 border-slate-200/40 dark:border-slate-800">
                <div className="flex items-center gap-2">
                  <Compass className="w-5 h-5 text-sky-500" />
                  <h2 className="text-sm sm:text-base font-bold">
                    {lang === 'ur'
                      ? 'سپورٹڈ پلیٹ فارمز (Supported Platforms)'
                      : 'Supported Platforms'}
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveSection('downloader')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 cursor-pointer border ${
                    theme === 'light'
                      ? 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200'
                      : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700'
                  }`}
                >
                  <X className="w-3.5 h-3.5" />
                  <span>{lang === 'ur' ? 'واپس ہوم' : 'Back to Home'}</span>
                </button>
              </div>

              <PlatformQuickBar
                lang={lang}
                theme={theme}
                onSelectPlatform={(platform) => {
                  setActiveSection('downloader');
                  handleSelectPlatform(platform);
                }}
                onOpenGuideForPlatform={handleOpenGuideForPlatform}
                onOpenBrowserForPlatform={handleOpenBrowserForPlatform}
              />

              <div
                className={`pt-4 border-t space-y-2.5 ${
                  theme === 'light' ? 'border-slate-200' : 'border-slate-800'
                }`}
              >
                <h3 className="text-xs sm:text-sm font-bold">
                  {lang === 'ur'
                    ? 'ڈاؤن لوڈ کا طریقہ (تمام پلیٹ فارمز کے لیے)'
                    : 'How to Download (Works for All Platforms)'}
                </h3>
                <div
                  className={`space-y-2 text-xs ${
                    theme === 'light' ? 'text-slate-600' : 'text-slate-300'
                  }`}
                >
                  <div
                    className={`p-3 rounded-xl border ${
                      theme === 'light'
                        ? 'bg-slate-50 border-slate-200'
                        : 'bg-[#0b0f19] border-slate-800'
                    }`}
                  >
                    <span className="font-bold text-sky-500">1. </span>
                    {lang === 'ur'
                      ? 'کسی بھی سوشل میڈیا ایپ سے ویڈیو، ریل یا تصویر کا لنک کاپی کریں۔'
                      : 'Copy the video, reel, or photo link from any supported platform.'}
                  </div>
                  <div
                    className={`p-3 rounded-xl border ${
                      theme === 'light'
                        ? 'bg-slate-50 border-slate-200'
                        : 'bg-[#0b0f19] border-slate-800'
                    }`}
                  >
                    <span className="font-bold text-sky-500">2. </span>
                    {lang === 'ur'
                      ? 'ہوم پیج پر لنک پیسٹ کریں اور Download بٹن دبائیں۔'
                      : 'Paste the link on the Home page and tap Download.'}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeSection === 'community' && (
          <div
            className={`w-full flex-1 flex flex-col rounded-2xl sm:rounded-3xl border animate-fade-in ${
              theme === 'light'
                ? 'bg-white border-slate-200 text-slate-900 shadow-xs'
                : 'bg-[#111827] border-slate-800 text-slate-100 shadow-lg'
            }`}
            id="fullscreen-community-page"
          >
            {/* Community Top Bar */}
            <div
              className={`px-4 py-3 sm:px-6 flex items-center justify-between border-b rounded-t-2xl sm:rounded-t-3xl shrink-0 ${
                theme === 'light'
                  ? 'bg-white border-slate-200 text-slate-900'
                  : 'bg-[#0b0f19] border-slate-800 text-white'
              }`}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-xl bg-sky-600 text-white flex items-center justify-center shrink-0">
                  <MessageSquare className="w-4 h-4" />
                </div>
                <h3 className="font-bold text-sm sm:text-base truncate">
                  {lang === 'ur'
                    ? 'کمیونٹی اور صارفین کی رائے (Community)'
                    : 'Community & App Reviews'}
                </h3>
              </div>

              <button
                type="button"
                onClick={() => {
                  setActiveSection('downloader');
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                id="close-fullscreen-community-btn"
                title={lang === 'ur' ? 'واپس ہوم پیج' : 'Back to Home'}
                className={`p-2 rounded-xl border transition-colors cursor-pointer flex items-center justify-center ${
                  theme === 'light'
                    ? 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200'
                    : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700'
                }`}
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Natural Page-Scrollable Community Body */}
            <div className="flex-1 p-3 sm:p-5 max-w-5xl w-full mx-auto">
              <CommunityComments lang={lang} />
            </div>
          </div>
        )}

      </main>

      {/* Bottom Footer Navigation Bar — 4 Clear Items: Home | Downloads | More | Settings (Hidden when full-screen video player or preview is active) */}
      <footer
        className={`fixed bottom-0 left-0 right-0 w-full z-[150] flex flex-col items-center transition-all duration-200 ${
          isDownloadedVideoPlaying || isPreviewModalOpen ? 'hidden opacity-0 pointer-events-none' : ''
        }`}
      >
        <nav
          className={`w-full backdrop-blur-md border-t transition-colors duration-200 ${
            theme === 'light'
              ? 'bg-white/95 border-slate-200 text-slate-900 shadow-[0_-4px_16px_rgba(15,23,42,0.05)]'
              : 'bg-[#0b0f19]/95 border-slate-800 text-slate-100 shadow-[0_-4px_16px_rgba(0,0,0,0.4)]'
          }`}
          aria-label="Bottom Navigation"
          id="fixed-bottom-navigation-bar"
        >
          <div className="max-w-xl mx-auto grid grid-cols-4 h-16 px-2 sm:px-4 gap-1.5 items-center">
            {/* 1. HOME */}
            <button
              type="button"
              onClick={() => {
                setIsGalleryOpen(false);
                setIsBrowserOpen(false);
                setIsDownloadsDrawerOpen(false);
                setIsGeminiChatOpen(false);
                setIsMoreDrawerOpen(false);
                setIsSettingsDrawerOpen(false);
                setActiveSection('downloader');
                window.scrollTo({ top: 0, behavior: 'smooth' });
                setTimeout(() => {
                  const inputEl =
                    document.getElementById('builtin-browser-omnibox-input') ||
                    document.getElementById('video-url-input');
                  if (inputEl) inputEl.focus();
                }, 80);
              }}
              className={`flex flex-col items-center justify-center min-h-[48px] rounded-xl font-semibold text-[11px] sm:text-xs transition-colors cursor-pointer ${
                !isGalleryOpen &&
                !isMoreDrawerOpen &&
                !isSettingsDrawerOpen &&
                !isGeminiChatOpen &&
                activeSection === 'downloader'
                  ? 'bg-rose-600 text-white'
                  : theme === 'light'
                  ? 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
              id="bottom-nav-home-tab"
            >
              <DownloadCloud className="w-5 h-5 mb-0.5" />
              <span className="truncate">
                {lang === 'ur'
                  ? 'ہوم'
                  : lang === 'es'
                  ? 'Inicio'
                  : lang === 'fr'
                  ? 'Accueil'
                  : lang === 'hi'
                  ? 'होम'
                  : 'Home'}
              </span>
            </button>

            {/* 2. DOWNLOADS */}
            <button
              type="button"
              onClick={() => {
                setActiveSection('downloader');
                setIsBrowserOpen(false);
                setIsDownloadsDrawerOpen(false);
                setIsGeminiChatOpen(false);
                setIsMoreDrawerOpen(false);
                setIsSettingsDrawerOpen(false);
                setIsGalleryOpen(true);
              }}
              className={`relative flex flex-col items-center justify-center min-h-[48px] rounded-xl font-semibold text-[11px] sm:text-xs transition-colors cursor-pointer ${
                isGalleryOpen
                  ? 'bg-rose-600 text-white'
                  : theme === 'light'
                  ? 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
              id="bottom-nav-history-tab"
            >
              <div className="relative flex items-center justify-center">
                <Layers className="w-5 h-5 mb-0.5" />
                {(totalAttentionCount > 0 || history.length > 0) && (
                  <span
                    className={`ml-1 px-1.5 py-0.2 rounded-full text-[10px] font-bold font-mono ${
                      isGalleryOpen
                        ? 'bg-white/25 text-white'
                        : totalAttentionCount > 0
                        ? 'bg-rose-600 text-white'
                        : 'bg-sky-600 text-white'
                    }`}
                  >
                    {totalAttentionCount > 0 ? totalAttentionCount : history.length}
                  </span>
                )}
              </div>
              <span className="truncate">{t.downloadManager}</span>
            </button>

            {/* 3. MORE */}
            <button
              type="button"
              onClick={() => {
                setIsGalleryOpen(false);
                setIsBrowserOpen(false);
                setIsDownloadsDrawerOpen(false);
                setIsGeminiChatOpen(false);
                setIsSettingsDrawerOpen(false);
                setIsMoreDrawerOpen((prev) => !prev);
              }}
              className={`flex flex-col items-center justify-center min-h-[48px] rounded-xl font-semibold text-[11px] sm:text-xs transition-colors cursor-pointer ${
                isMoreDrawerOpen || activeSection === 'platforms' || activeSection === 'community'
                  ? 'bg-rose-600 text-white'
                  : theme === 'light'
                  ? 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
              id="bottom-nav-more-tab"
            >
              <LayoutGrid className="w-5 h-5 mb-0.5" />
              <span className="truncate">
                {lang === 'ur'
                  ? 'مزید'
                  : lang === 'es'
                  ? 'Más'
                  : lang === 'fr'
                  ? 'Plus'
                  : lang === 'hi'
                  ? 'अधिक'
                  : 'More'}
              </span>
            </button>

            {/* 4. SETTINGS */}
            <button
              type="button"
              onClick={() => {
                setIsGalleryOpen(false);
                setIsBrowserOpen(false);
                setIsDownloadsDrawerOpen(false);
                setIsGeminiChatOpen(false);
                setIsMoreDrawerOpen(false);
                setIsSettingsDrawerOpen((prev) => !prev);
              }}
              className={`flex flex-col items-center justify-center min-h-[48px] rounded-xl font-semibold text-[11px] sm:text-xs transition-colors cursor-pointer ${
                isSettingsDrawerOpen
                  ? 'bg-rose-600 text-white'
                  : theme === 'light'
                  ? 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
              id="bottom-nav-settings-tab"
            >
              <Settings className="w-5 h-5 mb-0.5" />
              <span className="truncate">
                {lang === 'ur'
                  ? 'سیٹنگز'
                  : lang === 'es'
                  ? 'Ajustes'
                  : lang === 'fr'
                  ? 'Paramètres'
                  : lang === 'hi'
                  ? 'सेटिंग्स'
                  : 'Settings'}
              </span>
            </button>
          </div>
        </nav>
      </footer>

      {/* Modals */}
      <ExpandablePreviewModal
        media={media}
        lang={lang}
        isOpen={isPreviewModalOpen}
        initialMode={previewInitialMode}
        onClose={() => setIsPreviewModalOpen(false)}
        onDownloadPrimary={() => {
          if (media && media.downloadOptions[0]) {
            handleStartDownload(media.downloadOptions[0]);
          }
        }}
        onDownloadOption={handleStartDownload}
      />

      <DownloadManagerDrawer
        isOpen={isDownloadsDrawerOpen}
        onClose={() => setIsDownloadsDrawerOpen(false)}
        tasks={tasks}
        history={history}
        lang={lang}
        fileSizeUnit={fileSizeUnit}
        onChangeFileSizeUnit={handleChangeFileSizeUnit}
        onPauseTask={handlePauseTask}
        onResumeTask={handleResumeTask}
        onCancelTask={handleCancelTask}
        onRetryTask={handleRetryTask}
        onSimulateFailTask={handleSimulateFailTask}
        onSaveToDevice={handleSaveToDevice}
        onSaveToDrive={(task) => handleSaveMediaToDrive(task.url, task.filename)}
        onOpenQrCode={handleOpenQrCodeForTask}
        onClearCompleted={handleClearCompleted}
        autoClearDuration={autoClearDuration}
        onChangeAutoClearDuration={handleChangeAutoClearDuration}
        autoClearRetentionMode={autoClearRetentionMode}
        onChangeAutoClearRetentionMode={handleChangeAutoClearRetentionMode}
        clearSuccessfullyFinished={clearSuccessfullyFinished}
        onToggleClearSuccessfullyFinished={handleToggleClearSuccessfullyFinished}
        downloadSpeedCap={downloadSpeedCap}
        onChangeDownloadSpeedCap={handleSetDownloadSpeedCap}
        desktopNotifications={desktopNotifications}
        onToggleDesktopNotifications={handleToggleDesktopNotifications}
        onTestNotification={handleTestDesktopNotification}
        onTriggerScheduledNow={handleTriggerScheduledNow}
        onRescheduleTask={handleRescheduleTask}
        keepAliveActive={keepAliveActive}
        onToggleKeepAlive={handleToggleKeepAlive}
        onBatchRename={handleBatchRename}
        onDeleteHistoryItem={handleDeleteHistoryItem}
        onReDownloadHistory={handleReDownloadHistory}
        theme={theme}
        onSelectTheme={handleSelectTheme}
      />

      <HistoryGallery
        isOpen={isGalleryOpen}
        onClose={() => setIsGalleryOpen(false)}
        backHandlerRef={historyGalleryBackRef}
        onBackDepthChange={setHistoryGalleryBackDepth}
        onPlayerOpenChange={setIsDownloadedVideoPlaying}
        history={history}
        tasks={tasks}
        recentSearches={recentSearches}
        lang={lang}
        fileSizeUnit={fileSizeUnit}
        onDeleteItem={handleDeleteHistoryItem}
        onClearAll={handleClearAllHistory}
        onDeleteOlderThan7Days={handleDeleteOlderThan7Days}
        onPlayItem={handlePlayHistoryItem}
        onReDownload={handleReDownloadHistory}
        onSaveToDrive={(item) => handleSaveMediaToDrive(item.mediaUrl, `${item.platform}_${item.title}.${item.format.toLowerCase()}`)}
        onOpenQrCode={handleOpenQrCodeForHistory}
        onSelectRecentSearch={handleSelectRecentSearch}
        onDeleteRecentSearch={handleDeleteRecentSearch}
        onClearAllRecentSearches={handleClearAllRecentSearches}
        autoClearDuration={autoClearDuration}
        onChangeAutoClearDuration={handleChangeAutoClearDuration}
        onRenameItem={handleRenameHistoryItem}
        onToggleHideItem={handleToggleHideHistoryItem}
        onGoToPage={handleGoToPageForHistoryItem}
        onPauseTask={handlePauseTask}
        onResumeTask={handleResumeTask}
        onCancelTask={handleCancelTask}
        onRetryTask={handleRetryTask}
        onOpenQueueDrawer={() => {
          setIsGalleryOpen(false);
          setIsDownloadsDrawerOpen(true);
        }}
        onOpenCreatorProfileForItem={(item) => {
          const derived = deriveCreatorProfile(
            item.originalUrl,
            item.platform,
            item.author,
            item.creatorProfileUrl,
            item.author
          );
          setIsGalleryOpen(false);
          handleOpenCreatorProfile({
            handle: derived.handle,
            authorName: item.author || derived.handle,
            avatar: item.thumbnail,
            platform: item.platform,
            profileUrl: derived.profileUrl,
          });
        }}
      />

      <PlatformGuideModal
        isOpen={isGuideOpen}
        onClose={() => setIsGuideOpen(false)}
        lang={lang}
        initialPlatform={guideInitialPlatform}
        onSelectSample={(sample) => {
          setUrl(sample);
          handleAnalyzeUrl(sample);
        }}
      />

      <FrequentlyDownloadedModal
        isOpen={isFreqModalOpen}
        onClose={() => setIsFreqModalOpen(false)}
        lang={lang}
        savedAccounts={savedAccounts}
        onSelectAccount={(acc) =>
          handleOpenCreatorProfile({
            handle: acc.handle,
            authorName: acc.authorName,
            avatar: acc.avatar,
            platform: acc.platform,
            profileUrl: acc.profileUrl,
          })
        }
        onRemoveAccount={handleRemoveSavedAccount}
        onClearAllAccounts={handleClearSavedAccounts}
        onOpenNewCreatorBatch={() => handleOpenCreatorProfile()}
      />

      <BatchDownloadModal
        isOpen={isBatchOpen}
        onClose={() => setIsBatchOpen(false)}
        lang={lang}
        onProcessBatch={handleProcessBatch}
      />

      <AICaptionModal
        isOpen={isAICaptionOpen}
        onClose={() => setIsAICaptionOpen(false)}
        media={media}
        lang={lang}
      />

      <GoogleDriveModal
        isOpen={isDriveModalOpen}
        onClose={() => setIsDriveModalOpen(false)}
        lang={lang}
        user={driveUser}
        onAuthChange={setDriveUser}
      />

      <InstallAppModal
        isOpen={isInstallModalOpen}
        onClose={() => setIsInstallModalOpen(false)}
        lang={lang}
        onTriggerInstall={handleTriggerPwaInstall}
        canInstallPrompt={!!deferredInstallPrompt}
      />

      {/* QR Code Modal for Mobile Quick Scan */}
      {qrModalData && (
        <QRCodeModal
          isOpen={isQrModalOpen}
          onClose={() => setIsQrModalOpen(false)}
          lang={lang}
          title={qrModalData.title}
          platform={qrModalData.platform}
          thumbnail={qrModalData.thumbnail}
          downloadOption={qrModalData.downloadOption}
          directUrl={qrModalData.directUrl}
          originalUrl={qrModalData.originalUrl}
        />
      )}

      {/* Schedule Download Modal */}
      <ScheduleDownloadModal
        isOpen={isScheduleModalOpen}
        onClose={() => {
          setIsScheduleModalOpen(false);
          setScheduleTargetOption(null);
          setScheduleTargetTask(null);
        }}
        lang={lang}
        option={scheduleTargetOption}
        mediaTitle={scheduleTargetTask ? scheduleTargetTask.mediaTitle : media?.title}
        thumbnail={scheduleTargetTask ? scheduleTargetTask.thumbnail : media?.thumbnail}
        platform={scheduleTargetTask ? scheduleTargetTask.platform : media?.platform}
        existingTask={scheduleTargetTask}
        onConfirmSchedule={handleConfirmSchedule}
      />

      {/* Built-in Social Video In-App Browser Modal with Prominent Red Floating Download Button */}
      <InAppBrowserModal
        isOpen={isBrowserOpen}
        onClose={() => setIsBrowserOpen(false)}
        backHandlerRef={inAppBrowserBackRef}
        onBackDepthChange={setInAppBrowserBackDepth}
        lang={lang}
        initialUrl={browserInitialUrl}
        initialContext={browserInitialContext}
        onTriggerDownload={(targetUrl) => {
          setIsBrowserOpen(false);
          setIsGalleryOpen(false);
          setActiveSection('downloader');
          unmarkUrlAsCleared(targetUrl);
          setUrl(targetUrl);
          handleAnalyzeUrl(targetUrl, false, true);
        }}
        onOpenDownloadsManager={() => {
          setIsBrowserOpen(false);
          setIsGalleryOpen(true);
        }}
      />

      {/* Creator Profile & Batch / Bulk Downloader Modal */}
      <CreatorProfileModal
        isOpen={isCreatorProfileModalOpen}
        onClose={() => setIsCreatorProfileModalOpen(false)}
        lang={lang}
        initialProfile={creatorModalProfile}
        currentMedia={media}
        history={history}
        tasks={tasks}
        savedAccounts={savedAccounts}
        onSaveAccount={handleSaveCreatorAccount}
        onRemoveSavedAccount={handleRemoveSavedAccount}
        onOpenDownloadsDrawer={() => setIsDownloadsDrawerOpen(true)}
        onSelectVideoForDownload={(targetVideoUrl) => {
          setIsCreatorProfileModalOpen(false);
          setIsGalleryOpen(false);
          setActiveSection('downloader');
          unmarkUrlAsCleared(targetVideoUrl);
          setUrl(targetVideoUrl);
          handleAnalyzeUrl(targetVideoUrl, false, true);
        }}
        onBatchQueueCreatorVideos={handleBatchQueueCreatorVideos}
      />

      {/* Multi-turn Gemini AI Chatbot Modal */}
      <GeminiChatModal
        isOpen={isGeminiChatOpen}
        onClose={() => {
          setIsGeminiChatOpen(false);
          setGeminiChatContext(null);
        }}
        lang={lang}
        theme={theme}
        initialContext={geminiChatContext}
      />

      {/* Draggable Floating Download Button Widget (Controlled via Settings Menu toggle) */}
      {enableFloatingButton && (
        <FloatingDownloadButton
          lang={lang}
          tasks={tasks}
          onTriggerQuickDownload={(quickUrl) => handleTriggerQuickBackgroundDownload(quickUrl, true)}
          onOpenDownloadsDrawer={() => setIsDownloadsDrawerOpen(true)}
          onRequestNotificationPermission={handleToggleDesktopNotifications}
          hasNotificationPermission={desktopNotifications}
        />
      )}

    </div>
  );
}
