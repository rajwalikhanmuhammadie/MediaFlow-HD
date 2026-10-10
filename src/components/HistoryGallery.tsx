import React, { useState, useRef, useEffect } from 'react';
import {
  X,
  FolderDown,
  Trash2,
  Play,
  Pause,
  Search,
  ExternalLink,
  Music,
  Video,
  Image as ImageIcon,
  HardDrive,
  Copy,
  Check,
  QrCode,
  History,
  Clock,
  Zap,
  Share2,
  CheckCircle2,
  Volume2,
  VolumeX,
  Download,
  Music2,
  Instagram,
  Facebook,
  Youtube,
  Twitter,
  Pin,
  AtSign,
  Flame,
  Globe,
  ArrowLeft,
  ArrowUpDown,
  ArrowDownWideNarrow,
  ArrowUpNarrowWide,
  Calendar,
  ChevronDown,
  ChevronRight,
  FileText,
  Monitor,
  MoreVertical,
  EyeOff,
  Eye,
  Edit3,
  RotateCcw,
  RotateCw,
  Maximize2,
  Minimize2,
  Lock,
} from 'lucide-react';
import {
  HistoryItem,
  RecentSearchItem,
  Language,
  MediaType,
  PlatformType,
  AutoClearDuration,
  DownloadTask,
  FileSizeUnit,
} from '../types';
import { translations } from '../data/translations';
import {
  getRealTimeTaskProgress,
  deleteHistoryOlderThanDays,
  deleteRecentSearchesOlderThanDays,
  formatDisplayFileSize,
  renameHistoryItem,
  toggleHideHistoryItem,
} from '../utils/urlParser';

type SortCriterion = 'date' | 'size' | 'name' | 'duration' | 'resolution';
type SortDirection = 'desc' | 'asc';

interface HistoryGalleryProps {
  isOpen: boolean;
  onClose: () => void;
  history: HistoryItem[];
  tasks?: DownloadTask[];
  recentSearches: RecentSearchItem[];
  lang: Language;
  fileSizeUnit?: FileSizeUnit;
  onDeleteItem: (id: string) => void;
  onClearAll: () => void;
  onDeleteOlderThan7Days?: () => { deletedCount: number } | void;
  onPlayItem: (item: HistoryItem) => void;
  onReDownload: (item: HistoryItem) => void;
  onSaveToDrive?: (item: HistoryItem) => void;
  onOpenQrCode?: (item: HistoryItem) => void;
  onSelectRecentSearch: (url: string) => void;
  onDeleteRecentSearch: (id: string) => void;
  onClearAllRecentSearches: () => void;
  onOpenCreatorProfileForItem?: (item: HistoryItem) => void;
  autoClearDuration?: AutoClearDuration;
  onChangeAutoClearDuration?: (duration: AutoClearDuration) => void;
  onOpenQueueDrawer?: () => void;
  onRenameItem?: (id: string, newTitle: string) => void;
  onToggleHideItem?: (id: string) => void;
  onGoToPage?: (item: HistoryItem) => void;
  onPauseTask?: (id: string) => void;
  onResumeTask?: (id: string) => void;
  onCancelTask?: (id: string) => void;
  onRetryTask?: (id: string) => void;
}

export const HistoryGallery: React.FC<HistoryGalleryProps> = ({
  isOpen,
  onClose,
  history,
  tasks = [],
  recentSearches,
  lang,
  fileSizeUnit,
  onDeleteItem,
  onClearAll,
  onDeleteOlderThan7Days,
  onReDownload,
  onSelectRecentSearch,
  onDeleteRecentSearch,
  onRenameItem,
  onToggleHideItem,
  onGoToPage,
  onPauseTask,
  onResumeTask,
  onCancelTask,
  onRetryTask,
}) => {
  const [activeTab, setActiveTab] = useState<'downloads' | 'hidden' | 'recent_searches'>('downloads');
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState<'all' | MediaType>('all');
  const [sortBy, setSortBy] = useState<SortCriterion>('date');
  const [sortOrder, setSortOrder] = useState<SortDirection>('desc');
  const [isSortDropdownOpen, setIsSortDropdownOpen] = useState(false);
  const [expandedCriterion, setExpandedCriterion] = useState<SortCriterion>('date');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Full-Screen Media Player State & Controls
  const [playingItem, setPlayingItem] = useState<HistoryItem | null>(null);
  const [isPlayerPlaying, setIsPlayerPlaying] = useState<boolean>(true);
  const [playerCurrentTime, setPlayerCurrentTime] = useState<number>(0);
  const [playerDuration, setPlayerDuration] = useState<number>(0);
  const [playerVolume, setPlayerVolume] = useState<number>(1);
  const [isPlayerMuted, setIsPlayerMuted] = useState<boolean>(false);
  const [isPlayerFullscreen, setIsPlayerFullscreen] = useState<boolean>(false);
  const videoPlayerRef = useRef<HTMLVideoElement | null>(null);
  const playerContainerRef = useRef<HTMLDivElement | null>(null);

  // Three-Dots Context Menu (⋮) Bottom Sheet State
  const [contextMenuItem, setContextMenuItem] = useState<HistoryItem | null>(null);

  // Rename Modal State
  const [renameTargetItem, setRenameTargetItem] = useState<HistoryItem | null>(null);
  const [renameInputText, setRenameInputText] = useState<string>('');

  const sortDropdownRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!isSortDropdownOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (sortDropdownRef.current && !sortDropdownRef.current.contains(e.target as Node)) {
        setIsSortDropdownOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsSortDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isSortDropdownOpen]);

  // Reset player state when opening a new video
  useEffect(() => {
    if (playingItem) {
      setIsPlayerPlaying(true);
      setPlayerCurrentTime(0);
      setPlayerDuration(0);
    }
  }, [playingItem]);

  if (!isOpen) return null;
  const t = translations[lang];

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 2800);
  };

  // Separate Active/Ongoing Downloads (at the top with progress bars) from Completed Downloads (listed below)
  const activeOngoingTasks = tasks.filter(
    (tk) =>
      tk.status === 'downloading' ||
      tk.status === 'pending' ||
      tk.status === 'paused' ||
      tk.status === 'failed' ||
      tk.status === 'error' ||
      tk.status === 'scheduled'
  );
  const activeTaskIds = new Set(activeOngoingTasks.map((tk) => tk.id));

  // Completed items from history (excluding any currently active task IDs so they don't duplicate while still in progress)
  const completedHistoryItems = history.filter((h) => !activeTaskIds.has(h.id));

  const visibleCompletedDownloads = completedHistoryItems.filter((i) => !i.isHidden);
  const hiddenDownloads = completedHistoryItems.filter((i) => !!i.isHidden);

  const currentListSource = activeTab === 'hidden' ? hiddenDownloads : visibleCompletedDownloads;
  const taskById = new Map<string, DownloadTask>(tasks.map((tk) => [tk.id, tk]));

  const videoCount = visibleCompletedDownloads.filter((i) => (i.type || 'video') === 'video').length;
  const imageCount = visibleCompletedDownloads.filter((i) => i.type === 'image').length;
  const audioCount = visibleCompletedDownloads.filter((i) => i.type === 'audio').length;

  // Format timestamp as YYYY-MM-DD
  const formatDateYYYYMMDD = (timestamp?: number): string => {
    const d = timestamp && timestamp > 0 ? new Date(timestamp) : new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // Extract clean quality/resolution badge (e.g. 1080p, 720p, 360p, MP3)
  const getCleanResolutionBadge = (item: HistoryItem, task?: DownloadTask): string => {
    const raw = `${item.resolution || ''} ${task?.resolution || ''} ${item.quality || ''}`.trim();
    const pMatch = raw.match(/\b(4320p|2160p|1440p|1080p|720p|540p|480p|360p|240p|144p|8K|4K|2K)\b/i);
    if (pMatch) return pMatch[1];
    if (item.type === 'audio') return 'MP3';
    if (item.type === 'image') return 'HD';
    return item.resolution || item.quality || '720p';
  };

  // Extract clean duration badge (e.g. 00:20)
  const getCleanDurationBadge = (item: HistoryItem, task?: DownloadTask): string => {
    const raw = (item.duration || task?.duration || '').trim();
    if (raw && /\d/.test(raw)) {
      if (/^\d+$/.test(raw)) {
        const secs = parseInt(raw, 10);
        const mins = Math.floor(secs / 60);
        const rem = secs % 60;
        return `${String(mins).padStart(2, '0')}:${String(rem).padStart(2, '0')}`;
      }
      return raw;
    }
    if (item.type === 'image') return 'IMG';
    return '00:20';
  };

  // Extract clean source domain or platform name
  const getSourceLabel = (item: HistoryItem): string => {
    try {
      if (item.originalUrl && item.originalUrl.startsWith('http')) {
        const u = new URL(item.originalUrl);
        return u.hostname.replace(/^www\./i, '');
      }
    } catch {
      // fallback
    }
    return `${item.platform}.com`;
  };

  const parseFileSizeToBytes = (sizeStr?: string, fallbackBytes?: number): number => {
    if (typeof fallbackBytes === 'number' && fallbackBytes > 0 && !Number.isNaN(fallbackBytes)) {
      return fallbackBytes;
    }
    if (!sizeStr || typeof sizeStr !== 'string') return -1;
    const match = sizeStr.trim().match(/([\d.]+)\s*(B|KB|MB|GB|TB)/i);
    if (!match) return -1;
    const value = parseFloat(match[1]);
    if (Number.isNaN(value) || value < 0) return -1;
    const unit = match[2].toUpperCase();
    const multipliers: Record<string, number> = {
      B: 1,
      KB: 1024,
      MB: 1024 * 1024,
      GB: 1024 * 1024 * 1024,
      TB: 1024 * 1024 * 1024 * 1024,
    };
    return Math.round(value * (multipliers[unit] || 1));
  };

  const parseDurationToSeconds = (durationStr?: string): number => {
    if (!durationStr || typeof durationStr !== 'string') return -1;
    const raw = durationStr.trim();
    if (!raw) return -1;
    if (raw.includes(':')) {
      const parts = raw.split(':').map((p) => parseFloat(p.trim()));
      if (parts.some((n) => Number.isNaN(n) || n < 0)) return -1;
      if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
      if (parts.length === 2) return parts[0] * 60 + parts[1];
    }
    const numeric = parseFloat(raw);
    return !Number.isNaN(numeric) && numeric >= 0 ? numeric : -1;
  };

  const parseResolutionToRank = (item: HistoryItem, task?: DownloadTask): number => {
    const combined = `${item.resolution || ''} ${task?.resolution || ''} ${item.quality || ''} ${item.format || ''}`.toLowerCase();
    if (!combined.trim()) return -1;
    const pMatch = combined.match(/\b(4320|2160|1440|1080|720|540|480|360|240|144)\s*p?\b/);
    if (pMatch) return parseInt(pMatch[1], 10);
    if (/\b8k\b/.test(combined)) return 4320;
    if (/\b4k\b/.test(combined)) return 2160;
    if (/\b2k\b/.test(combined)) return 1440;
    return -1;
  };

  const getShortSortLabel = (criterion: SortCriterion, direction: SortDirection): string => {
    const arrow = direction === 'desc' ? '↓' : '↑';
    switch (criterion) {
      case 'date':
        return `${lang === 'ur' ? 'تاریخ' : 'Date'} ${arrow}`;
      case 'size':
        return `${lang === 'ur' ? 'سائز' : 'Size'} ${arrow}`;
      case 'name':
        return `${lang === 'ur' ? 'نام' : 'Name'} ${arrow}`;
      case 'duration':
        return `${lang === 'ur' ? 'دورانیہ' : 'Duration'} ${arrow}`;
      case 'resolution':
        return `${lang === 'ur' ? 'ریزولوشن' : 'Resolution'} ${arrow}`;
    }
  };

  const sortCriteriaConfig: {
    id: SortCriterion;
    label: string;
    defaultOrder: SortDirection;
    icon: React.ReactNode;
    options: {
      direction: SortDirection;
      orderTypeLabel: string;
      detailLabel: string;
    }[];
  }[] = [
    {
      id: 'date',
      label: lang === 'ur' ? 'تاریخ (Date)' : 'Date',
      defaultOrder: 'desc',
      icon: <Calendar className="w-3.5 h-3.5 text-rose-400 shrink-0" />,
      options: [
        { direction: 'desc', orderTypeLabel: 'Descending', detailLabel: 'Newest First' },
        { direction: 'asc', orderTypeLabel: 'Ascending', detailLabel: 'Oldest First' },
      ],
    },
    {
      id: 'size',
      label: lang === 'ur' ? 'فائل سائز (File Size)' : 'File Size',
      defaultOrder: 'desc',
      icon: <HardDrive className="w-3.5 h-3.5 text-cyan-400 shrink-0" />,
      options: [
        { direction: 'desc', orderTypeLabel: 'Descending', detailLabel: 'Largest First' },
        { direction: 'asc', orderTypeLabel: 'Ascending', detailLabel: 'Smallest First' },
      ],
    },
    {
      id: 'name',
      label: lang === 'ur' ? 'نام (Name)' : 'Name',
      defaultOrder: 'asc',
      icon: <FileText className="w-3.5 h-3.5 text-emerald-400 shrink-0" />,
      options: [
        { direction: 'asc', orderTypeLabel: 'Ascending', detailLabel: 'A–Z' },
        { direction: 'desc', orderTypeLabel: 'Descending', detailLabel: 'Z–A' },
      ],
    },
    {
      id: 'duration',
      label: lang === 'ur' ? 'دورانیہ (Duration)' : 'Duration',
      defaultOrder: 'desc',
      icon: <Clock className="w-3.5 h-3.5 text-amber-400 shrink-0" />,
      options: [
        { direction: 'desc', orderTypeLabel: 'Descending', detailLabel: 'Longest First' },
        { direction: 'asc', orderTypeLabel: 'Ascending', detailLabel: 'Shortest First' },
      ],
    },
    {
      id: 'resolution',
      label: lang === 'ur' ? 'ریزولوشن (Resolution)' : 'Resolution',
      defaultOrder: 'desc',
      icon: <Monitor className="w-3.5 h-3.5 text-violet-400 shrink-0" />,
      options: [
        { direction: 'desc', orderTypeLabel: 'Descending', detailLabel: 'Highest to Lowest' },
        { direction: 'asc', orderTypeLabel: 'Ascending', detailLabel: 'Lowest to Highest' },
      ],
    },
  ];

  // Filter & sort completed downloads
  const filteredDownloads = currentListSource
    .filter((item) => {
      const q = search.toLowerCase();
      const matchesSearch =
        !q ||
        (item.title || '').toLowerCase().includes(q) ||
        (item.author || '').toLowerCase().includes(q) ||
        (item.platform || '').toLowerCase().includes(q) ||
        (item.originalUrl || '').toLowerCase().includes(q);
      const itemType = item.type || 'video';
      const matchesType = filterType === 'all' || itemType === filterType;
      return matchesSearch && matchesType;
    })
    .sort((a, b) => {
      const direction = sortOrder === 'asc' ? 1 : -1;
      const dateA = typeof a.downloadedAt === 'number' ? a.downloadedAt : 0;
      const dateB = typeof b.downloadedAt === 'number' ? b.downloadedAt : 0;

      if (sortBy === 'date') {
        if (dateA !== dateB) return (dateA - dateB) * direction;
        return (a.title || '').localeCompare(b.title || '');
      }
      if (sortBy === 'size') {
        const taskA = taskById.get(a.id);
        const taskB = taskById.get(b.id);
        const sizeA = parseFileSizeToBytes(a.size || taskA?.size, taskA?.totalBytes);
        const sizeB = parseFileSizeToBytes(b.size || taskB?.size, taskB?.totalBytes);
        if (sizeA !== sizeB) return (sizeA - sizeB) * direction;
        return dateB - dateA;
      }
      if (sortBy === 'name') {
        const nameA = (a.title || '').trim();
        const nameB = (b.title || '').trim();
        return nameA.localeCompare(nameB, undefined, { numeric: true }) * direction;
      }
      if (sortBy === 'duration') {
        const durA = parseDurationToSeconds(a.duration);
        const durB = parseDurationToSeconds(b.duration);
        if (durA !== durB) return (durA - durB) * direction;
        return dateB - dateA;
      }
      if (sortBy === 'resolution') {
        const resA = parseResolutionToRank(a);
        const resB = parseResolutionToRank(b);
        if (resA !== resB) return (resA - resB) * direction;
        return dateB - dateA;
      }
      return 0;
    });

  const filteredSearches = recentSearches.filter(
    (item) =>
      item.url.toLowerCase().includes(search.toLowerCase()) ||
      item.platform.toLowerCase().includes(search.toLowerCase())
  );

  const getPlatformIcon = (platform: PlatformType) => {
    switch (platform) {
      case 'tiktok':
        return <Music2 className="w-3.5 h-3.5 text-cyan-400 shrink-0" />;
      case 'instagram':
        return <Instagram className="w-3.5 h-3.5 text-pink-400 shrink-0" />;
      case 'youtube':
        return <Youtube className="w-3.5 h-3.5 text-red-500 shrink-0" />;
      case 'facebook':
        return <Facebook className="w-3.5 h-3.5 text-blue-500 shrink-0" />;
      case 'twitter':
        return <Twitter className="w-3.5 h-3.5 text-sky-400 shrink-0" />;
      case 'pinterest':
        return <Pin className="w-3.5 h-3.5 text-rose-500 shrink-0" />;
      case 'threads':
        return <AtSign className="w-3.5 h-3.5 text-slate-200 shrink-0" />;
      case 'reddit':
        return <Flame className="w-3.5 h-3.5 text-orange-400 shrink-0" />;
      default:
        return <Globe className="w-3.5 h-3.5 text-slate-400 shrink-0" />;
    }
  };

  const getPlayableStreamUrl = (item: HistoryItem): string => {
    if (item.type === 'image') {
      return item.thumbnail || item.mediaUrl;
    }
    if (item.type === 'audio') {
      return item.mediaUrl;
    }
    if (item.mediaUrl && item.mediaUrl.startsWith('/api/stream')) {
      return item.mediaUrl;
    }
    if (item.mediaUrl && item.mediaUrl.startsWith('/api/download')) {
      try {
        const parsed = new URL(item.mediaUrl, window.location.origin);
        const orig = parsed.searchParams.get('url');
        const direct = parsed.searchParams.get('directUrl');
        if (orig) {
          return `/api/stream?url=${encodeURIComponent(orig)}${direct ? `&directUrl=${encodeURIComponent(direct)}` : ''}`;
        }
      } catch {
        // fallback
      }
      return item.mediaUrl;
    }
    if (item.originalUrl && item.originalUrl.startsWith('http')) {
      return `/api/stream?url=${encodeURIComponent(item.originalUrl)}`;
    }
    return item.mediaUrl;
  };

  // Three-Dots Context Menu Actions
  const handleShareItem = async (item: HistoryItem) => {
    setContextMenuItem(null);
    const shareUrl = item.originalUrl || item.mediaUrl;
    const shareData = {
      title: item.title,
      text: `${item.title} (${item.platform.toUpperCase()})`,
      url: shareUrl,
    };

    if (navigator.share) {
      try {
        await navigator.share(shareData);
        showToast(lang === 'ur' ? 'کامیابی سے شیئر کیا گیا' : 'Shared successfully');
        return;
      } catch (err: any) {
        if (err?.name === 'AbortError') return;
      }
    }

    try {
      await navigator.clipboard.writeText(shareUrl);
      showToast(lang === 'ur' ? 'شیئر لنک کلپ بورڈ میں کاپی ہو گیا' : 'Link copied to clipboard for sharing');
    } catch {
      // ignore
    }
  };

  const handleHideOrUnhideItem = (item: HistoryItem) => {
    setContextMenuItem(null);
    if (onToggleHideItem) {
      onToggleHideItem(item.id);
    } else {
      toggleHideHistoryItem(item.id);
    }
    showToast(
      item.isHidden
        ? lang === 'ur'
          ? 'فائل پرائیویٹ فولڈر سے واپس لے آئی گئی'
          : 'Moved back to Downloads'
        : lang === 'ur'
        ? 'فائل پرائیویٹ/ہڈن فولڈر میں منتقل کر دی گئی'
        : 'Moved to Hidden / Private folder'
    );
  };

  const handleDeleteContextItem = (item: HistoryItem) => {
    setContextMenuItem(null);
    onDeleteItem(item.id);
    showToast(lang === 'ur' ? 'فائل مستقل طور پر حذف کر دی گئی' : 'File deleted permanently');
  };

  const handleGoToPageContextItem = (item: HistoryItem) => {
    setContextMenuItem(null);
    if (onGoToPage) {
      onGoToPage(item);
    }
  };

  const handleOpenRenameModal = (item: HistoryItem) => {
    setContextMenuItem(null);
    setRenameTargetItem(item);
    setRenameInputText(item.title || '');
  };

  const handleSaveRename = (e: React.FormEvent) => {
    e.preventDefault();
    if (!renameTargetItem) return;
    const trimmed = renameInputText.trim();
    if (!trimmed) return;
    if (onRenameItem) {
      onRenameItem(renameTargetItem.id, trimmed);
    } else {
      renameHistoryItem(renameTargetItem.id, trimmed);
    }
    setRenameTargetItem(null);
    showToast(lang === 'ur' ? 'فائل کا نام تبدیل کر دیا گیا' : 'File renamed successfully');
  };

  // Fullscreen Media Player Controls
  const togglePlayerPlay = () => {
    const vid = videoPlayerRef.current;
    if (!vid) return;
    if (vid.paused) {
      vid.play().then(() => setIsPlayerPlaying(true)).catch(() => {});
    } else {
      vid.pause();
      setIsPlayerPlaying(false);
    }
  };

  const handlePlayerSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = parseFloat(e.target.value);
    setPlayerCurrentTime(time);
    if (videoPlayerRef.current) {
      videoPlayerRef.current.currentTime = time;
    }
  };

  const handlePlayerSkip = (deltaSeconds: number) => {
    const vid = videoPlayerRef.current;
    if (!vid) return;
    const nextTime = Math.max(0, Math.min(vid.duration || 100, vid.currentTime + deltaSeconds));
    vid.currentTime = nextTime;
    setPlayerCurrentTime(nextTime);
  };

  const handlePlayerMuteToggle = () => {
    const vid = videoPlayerRef.current;
    if (!vid) return;
    const nextMuted = !isPlayerMuted;
    vid.muted = nextMuted;
    setIsPlayerMuted(nextMuted);
  };

  const handlePlayerVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    setPlayerVolume(val);
    if (videoPlayerRef.current) {
      videoPlayerRef.current.volume = val;
      videoPlayerRef.current.muted = val === 0;
      setIsPlayerMuted(val === 0);
    }
  };

  const handlePlayerFullscreenToggle = () => {
    const container = playerContainerRef.current;
    if (!container) return;
    if (!document.fullscreenElement) {
      container.requestFullscreen().then(() => setIsPlayerFullscreen(true)).catch(() => {});
    } else {
      document.exitFullscreen().then(() => setIsPlayerFullscreen(false)).catch(() => {});
    }
  };

  const formatPlayerTime = (seconds: number): string => {
    if (!seconds || Number.isNaN(seconds) || seconds < 0) return '00:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  const handleSelectSortOption = (criterion: SortCriterion, direction: SortDirection) => {
    setSortBy(criterion);
    setSortOrder(direction);
    setExpandedCriterion(criterion);
    setIsSortDropdownOpen(false);
  };

  const handleCopyLink = (e: React.MouseEvent, id: string, url: string) => {
    e.stopPropagation();
    navigator.clipboard.writeText(url);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleBulkDeleteOlderThan7Days = () => {
    if (onDeleteOlderThan7Days) {
      onDeleteOlderThan7Days();
    } else {
      deleteHistoryOlderThanDays(7);
      deleteRecentSearchesOlderThanDays(7);
    }
    showToast(lang === 'ur' ? '7 دن سے پرانی فائلیں صاف کر دی گئیں' : 'Cleared items older than 7 days');
  };

  return (
    <div
      className="fixed inset-x-0 top-14 bottom-16 z-[85] w-screen h-[calc(100dvh-7.5rem)] bg-[#0f1117] text-slate-100 flex flex-col overflow-hidden animate-fade-in"
      id="fullscreen-history-page"
    >
      {/* 1. Compact Top Navigation & Filter Bar */}
      <div
        id="history-compact-toolbar"
        className="h-12 px-2.5 sm:px-4 border-b border-white/10 bg-[#151821] flex items-center justify-between gap-2 shrink-0 relative z-30"
      >
        {/* Left: Back Button + Category & Folder Tabs */}
        <div className="flex items-center gap-1.5 min-w-0 overflow-x-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
          <button
            type="button"
            onClick={onClose}
            id="history-back-btn"
            className="h-8 px-2.5 rounded-lg bg-white/10 hover:bg-white/20 border border-white/15 text-xs font-extrabold text-white flex items-center gap-1 transition-colors cursor-pointer whitespace-nowrap shrink-0"
            title={lang === 'ur' ? 'واپس ہوم پیج پر جائیں' : 'Back to Home'}
          >
            <ArrowLeft className="w-3.5 h-3.5 shrink-0" />
            <span>{lang === 'ur' ? 'واپس (Back)' : 'Back'}</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab('downloads');
              setFilterType('all');
            }}
            id="tab-history-all"
            className={`h-8 px-2.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
              activeTab === 'downloads' && filterType === 'all'
                ? 'bg-[#FFCC00] text-slate-950'
                : 'bg-white/5 text-slate-300 hover:text-white'
            }`}
          >
            <FolderDown className="w-3.5 h-3.5 shrink-0" />
            <span>{lang === 'ur' ? 'تمام' : 'All'}</span>
            <span className="text-[11px] font-mono tabular-nums opacity-85">
              ({visibleCompletedDownloads.length})
            </span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab('downloads');
              setFilterType('video');
            }}
            id="tab-history-video"
            className={`h-8 px-2.5 rounded-lg text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
              activeTab === 'downloads' && filterType === 'video'
                ? 'bg-[#FFCC00] text-slate-950'
                : 'bg-white/5 text-slate-300 hover:text-white'
            }`}
          >
            <Video className="w-3.5 h-3.5 shrink-0" />
            <span className="hidden sm:inline">{lang === 'ur' ? 'ویڈیو' : 'Video'}</span>
            <span className="text-[11px] font-mono tabular-nums opacity-80">{videoCount}</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab('downloads');
              setFilterType('audio');
            }}
            id="tab-history-music"
            className={`h-8 px-2.5 rounded-lg text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
              activeTab === 'downloads' && filterType === 'audio'
                ? 'bg-[#FFCC00] text-slate-950'
                : 'bg-white/5 text-slate-300 hover:text-white'
            }`}
          >
            <Music className="w-3.5 h-3.5 shrink-0" />
            <span className="hidden sm:inline">MP3</span>
            <span className="text-[11px] font-mono tabular-nums opacity-80">{audioCount}</span>
          </button>

          {imageCount > 0 && (
            <button
              type="button"
              onClick={() => {
                setActiveTab('downloads');
                setFilterType('image');
              }}
              id="tab-history-image"
              className={`h-8 px-2.5 rounded-lg text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                activeTab === 'downloads' && filterType === 'image'
                  ? 'bg-[#FFCC00] text-slate-950'
                  : 'bg-white/5 text-slate-300 hover:text-white'
              }`}
            >
              <ImageIcon className="w-3.5 h-3.5 shrink-0" />
              <span className="text-[11px] font-mono tabular-nums">{imageCount}</span>
            </button>
          )}

          {/* Private / Hidden Folder Tab */}
          <button
            type="button"
            onClick={() => setActiveTab('hidden')}
            id="tab-history-hidden"
            className={`h-8 px-2.5 rounded-lg text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
              activeTab === 'hidden'
                ? 'bg-[#FFCC00] text-slate-950'
                : 'bg-white/5 text-slate-300 hover:text-white'
            }`}
            title={lang === 'ur' ? 'پرائیویٹ / ہڈن فولڈر' : 'Hidden / Private Folder'}
          >
            <Lock className="w-3.5 h-3.5 shrink-0" />
            <span className="hidden md:inline">{lang === 'ur' ? 'ہڈن' : 'Hidden'}</span>
            {hiddenDownloads.length > 0 && (
              <span className="text-[11px] font-mono tabular-nums">{hiddenDownloads.length}</span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('recent_searches')}
            id="tab-history-recent-searches"
            className={`h-8 px-2.5 rounded-lg text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
              activeTab === 'recent_searches'
                ? 'bg-[#FFCC00] text-slate-950'
                : 'bg-white/5 text-slate-300 hover:text-white'
            }`}
          >
            <History className="w-3.5 h-3.5 shrink-0" />
            <span className="hidden lg:inline">{lang === 'ur' ? 'حالیہ لنکس' : 'Links'}</span>
          </button>
        </div>

        {/* Right: Search + Sort + Close */}
        <div className="flex items-center gap-1.5 shrink-0">
          <div className="relative w-28 sm:w-44 md:w-56">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t.searchHistory}
              className="w-full h-8 pl-7 pr-6 bg-[#1e2230] border border-white/10 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#FFCC00] transition-colors"
              id="history-gallery-search-input"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch('')}
                className="absolute right-1.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {activeTab !== 'recent_searches' && (
            <div ref={sortDropdownRef} className="relative shrink-0" id="history-sort-dropdown-wrapper">
              <button
                type="button"
                id="history-sort-dropdown-btn"
                onClick={() => setIsSortDropdownOpen((prev) => !prev)}
                className="h-8 px-2.5 rounded-lg bg-[#1e2230] hover:bg-white/10 border border-white/10 text-xs font-bold text-slate-100 flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
              >
                <ArrowUpDown className="w-3.5 h-3.5 text-[#FFCC00] shrink-0" />
                <span className="hidden sm:inline">{getShortSortLabel(sortBy, sortOrder)}</span>
                <ChevronDown className="w-3 h-3 text-slate-400" />
              </button>

              {isSortDropdownOpen && (
                <div
                  id="history-sort-dropdown-menu"
                  className="absolute right-0 top-full mt-1.5 w-64 rounded-xl bg-[#181c28] border border-white/15 shadow-2xl p-1.5 z-50 animate-fade-in"
                >
                  {sortCriteriaConfig.map((criterion) => {
                    const isActiveCriterion = sortBy === criterion.id;
                    const isExpanded = expandedCriterion === criterion.id;
                    return (
                      <div key={criterion.id} className="rounded-lg">
                        <button
                          type="button"
                          onClick={() => {
                            if (expandedCriterion !== criterion.id) {
                              setExpandedCriterion(criterion.id);
                              setSortBy(criterion.id);
                              setSortOrder(criterion.defaultOrder);
                            } else {
                              handleSelectSortOption(
                                criterion.id,
                                sortOrder === 'desc' ? 'asc' : 'desc'
                              );
                            }
                          }}
                          className="w-full px-2.5 py-1.5 flex items-center justify-between text-xs font-semibold text-slate-100 hover:bg-white/5 rounded-lg cursor-pointer"
                        >
                          <div className="flex items-center gap-2">
                            {criterion.icon}
                            <span>{criterion.label}</span>
                          </div>
                          <ChevronRight
                            className={`w-3.5 h-3.5 text-slate-400 transition-transform ${
                              isExpanded ? 'rotate-90' : ''
                            }`}
                          />
                        </button>
                        {isExpanded && (
                          <div className="px-2 pb-1.5 pt-1 grid grid-cols-2 gap-1">
                            {criterion.options.map((opt) => {
                              const isSelected =
                                isActiveCriterion && sortOrder === opt.direction;
                              return (
                                <button
                                  key={opt.direction}
                                  type="button"
                                  onClick={() =>
                                    handleSelectSortOption(criterion.id, opt.direction)
                                  }
                                  className={`px-2 py-1 rounded text-[11px] font-bold flex items-center justify-between cursor-pointer ${
                                    isSelected
                                      ? 'bg-[#FFCC00] text-slate-950'
                                      : 'bg-black/30 text-slate-300 hover:bg-white/10'
                                  }`}
                                >
                                  <span>{opt.detailLabel}</span>
                                  {isSelected && <Check className="w-3 h-3" />}
                                </button>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {(visibleCompletedDownloads.length > 0 || activeOngoingTasks.length > 0) && (
            <button
              type="button"
              onClick={onClearAll}
              className="h-8 px-2.5 rounded-lg bg-rose-500/20 hover:bg-rose-600 text-rose-200 hover:text-white border border-rose-500/40 text-[11px] font-extrabold flex items-center gap-1 transition-colors cursor-pointer shrink-0 whitespace-nowrap"
              title={t.clearHistory}
              id="clear-all-downloads-btn"
            >
              <Trash2 className="w-3.5 h-3.5 shrink-0" />
              <span>{lang === 'ur' ? 'سب صاف (Clear All)' : 'Clear All'}</span>
            </button>
          )}
        </div>
      </div>

      {/* 2. Main Scrollable Downloads Content Area */}
      {activeTab !== 'recent_searches' && (
        <div className="flex-1 overflow-y-auto overscroll-contain px-2.5 sm:px-4 py-3 pb-24 max-w-4xl w-full mx-auto space-y-4">
          {/* SECTION A: Active / Ongoing Downloads Queue (Visually Separated at Top with Progress Bars) */}
          {activeTab === 'downloads' && activeOngoingTasks.length > 0 && (
            <section
              id="downloads-active-queue-section"
              className="rounded-2xl bg-[#161a26] border border-[#FFCC00]/35 overflow-hidden shadow-lg"
            >
              <div className="px-3.5 py-2 bg-[#1c2130] border-b border-white/10 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-[#FFCC00]" />
                  <h3 className="text-xs font-extrabold uppercase tracking-wider text-white">
                    {lang === 'ur'
                      ? `جاری ڈاؤن لوڈز (${activeOngoingTasks.length})`
                      : `Downloading (${activeOngoingTasks.length})`}
                  </h3>
                </div>
                <span className="text-[11px] font-mono tabular-nums text-[#FFCC00]">
                  {lang === 'ur' ? 'نان بلاکنگ قطار' : 'Active Queue'}
                </span>
              </div>

              <div className="divide-y divide-white/10">
                {activeOngoingTasks.map((task) => {
                  const prog = getRealTimeTaskProgress(task);
                  const isPaused = task.status === 'paused';
                  const isFailed = task.status === 'failed' || task.status === 'error';
                  const resBadge = task.resolution || task.quality || '720p';
                  const durBadge = task.duration || '00:20';

                  return (
                    <div
                      key={task.id}
                      id={`active-download-row-${task.id}`}
                      className="p-2.5 sm:p-3 flex items-center gap-3 bg-[#151822]"
                    >
                      {/* Left Thumbnail with Bottom-Left Resolution & Bottom-Right Duration */}
                      <div className="relative w-28 h-16 sm:w-32 sm:h-18 rounded-xl overflow-hidden bg-black shrink-0 border border-white/10">
                        <img
                          src={task.thumbnail}
                          alt={task.mediaTitle}
                          className="w-full h-full object-cover opacity-85"
                          referrerPolicy="no-referrer"
                        />
                        <span className="absolute bottom-1 left-1 px-1.5 py-0.2 rounded bg-black/85 text-white text-[10px] font-mono tabular-nums font-bold">
                          {resBadge}
                        </span>
                        <span className="absolute bottom-1 right-1 px-1.5 py-0.2 rounded bg-black/85 text-white text-[10px] font-mono tabular-nums font-bold">
                          {durBadge}
                        </span>
                      </div>

                      {/* Right Progress & Metadata */}
                      <div className="min-w-0 flex-1 space-y-1.5">
                        <div className="flex items-start justify-between gap-2">
                          <h4 className="text-xs sm:text-sm font-bold text-white truncate">
                            {task.mediaTitle}
                          </h4>
                          <div className="flex items-center gap-1 shrink-0">
                            {task.status === 'downloading' && onPauseTask && (
                              <button
                                type="button"
                                onClick={() => onPauseTask(task.id)}
                                className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-slate-200 cursor-pointer"
                                title="Pause"
                              >
                                <Pause className="w-3.5 h-3.5" />
                              </button>
                            )}
                            {isPaused && onResumeTask && (
                              <button
                                type="button"
                                onClick={() => onResumeTask(task.id)}
                                className="p-1.5 rounded-lg bg-[#FFCC00] text-slate-950 cursor-pointer"
                                title="Resume"
                              >
                                <Play className="w-3.5 h-3.5 fill-current" />
                              </button>
                            )}
                            {isFailed && onRetryTask && (
                              <button
                                type="button"
                                onClick={() => onRetryTask(task.id)}
                                className="p-1.5 rounded-lg bg-amber-500 text-slate-950 cursor-pointer"
                                title="Retry"
                              >
                                <RotateCcw className="w-3.5 h-3.5" />
                              </button>
                            )}
                            {onCancelTask && (
                              <button
                                type="button"
                                onClick={() => onCancelTask(task.id)}
                                className="p-1.5 rounded-lg bg-white/5 hover:bg-rose-600/30 text-slate-400 hover:text-rose-300 cursor-pointer"
                                title="Cancel"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Progress Bar */}
                        <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
                          <div
                            className={`h-full transition-all duration-300 ${
                              isFailed
                                ? 'bg-rose-500'
                                : isPaused
                                ? 'bg-amber-400'
                                : 'bg-[#FFCC00]'
                            }`}
                            style={{ width: `${Math.max(4, prog)}%` }}
                          />
                        </div>

                        <div className="flex items-center justify-between text-[11px] font-mono tabular-nums text-slate-400">
                          <span>
                            {isFailed
                              ? task.errorReason || 'Failed'
                              : isPaused
                              ? 'Paused'
                              : `${task.speed || '3.4 MB/s'} · ${formatDisplayFileSize(task.size, fileSizeUnit)}`}
                          </span>
                          <span className="font-bold text-[#FFCC00]">{prog}%</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          {/* SECTION B: Completed Downloads Compact List Layout */}
          <section id="downloads-completed-list-section" className="space-y-2">
            {/* Compact Action Header Bar directly above the Downloads List with Back & Clear All buttons */}
            <div className="px-1 py-1 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  id="downloads-section-back-btn"
                  className="px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/20 border border-white/15 text-[11px] font-bold text-slate-100 flex items-center gap-1 cursor-pointer transition-colors"
                >
                  <ArrowLeft className="w-3.5 h-3.5 text-[#FFCC00] shrink-0" />
                  <span>{lang === 'ur' ? 'واپس (Back)' : 'Back'}</span>
                </button>
                <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-300">
                  {lang === 'ur'
                    ? `ڈاؤن لوڈز (${filteredDownloads.length})`
                    : `Downloads (${filteredDownloads.length})`}
                </h3>
              </div>

              {(filteredDownloads.length > 0 || activeOngoingTasks.length > 0) && (
                <button
                  type="button"
                  onClick={onClearAll}
                  id="downloads-section-clear-all-btn"
                  className="px-2.5 py-1 rounded-lg bg-rose-500/20 hover:bg-rose-600 text-rose-200 hover:text-white border border-rose-500/40 text-[11px] font-bold flex items-center gap-1 cursor-pointer transition-colors"
                >
                  <Trash2 className="w-3 h-3 shrink-0" />
                  <span>{lang === 'ur' ? 'Clear All (سب صاف)' : 'Clear All'}</span>
                </button>
              )}
            </div>

            {filteredDownloads.length === 0 ? (
              <div className="min-h-[45vh] flex flex-col items-center justify-center text-center p-6 text-slate-400">
                <div className="w-14 h-14 rounded-2xl bg-[#181c28] border border-white/10 flex items-center justify-center mb-3 text-[#FFCC00]">
                  {activeTab === 'hidden' ? (
                    <Lock className="w-7 h-7" />
                  ) : (
                    <FolderDown className="w-7 h-7" />
                  )}
                </div>
                <p className="text-sm sm:text-base font-bold text-slate-200">
                  {activeTab === 'hidden'
                    ? lang === 'ur'
                      ? 'پرائیویٹ فولڈر خالی ہے'
                      : 'No hidden files'
                    : t.emptyHistory}
                </p>
                <p className="text-xs text-slate-400 mt-1 max-w-xs">
                  {activeTab === 'hidden'
                    ? lang === 'ur'
                      ? 'آپ کسی بھی ڈاؤن لوڈ فائل کے تین نقطوں (⋮) والے مینو سے Hide منتخب کر کے اسے یہاں محفوظ کر سکتے ہیں۔'
                      : 'Use the three-dots (⋮) menu on any downloaded file and tap Hide to move it here.'
                    : lang === 'ur'
                    ? 'آپ کی ڈاؤن لوڈ کردہ تمام ویڈیوز اور آڈیوز یہاں فہرست میں نظر آئیں گی۔'
                    : 'Your downloaded videos and music files will appear here in a compact list.'}
                </p>
              </div>
            ) : (
              <div
                id="downloads-compact-list-container"
                className="rounded-2xl bg-[#151822] border border-white/10 divide-y divide-white/10 overflow-hidden"
              >
                {filteredDownloads.map((item, idx) => {
                  const matchingTask = taskById.get(item.id);
                  const resolutionBadge = getCleanResolutionBadge(item, matchingTask);
                  const durationBadge = getCleanDurationBadge(item, matchingTask);
                  const formattedSize = formatDisplayFileSize(
                    item.size || matchingTask?.size || '5.02 MB',
                    fileSizeUnit
                  );
                  const formatBadge = (item.format || (item.type === 'audio' ? 'MP3' : item.type === 'image' ? 'JPG' : 'MP4')).toUpperCase();
                  const downloadDateStr = formatDateYYYYMMDD(item.downloadedAt);
                  const sourceDomain = getSourceLabel(item);

                  return (
                    <div
                      key={`dl_list_row_${item.id || idx}`}
                      id={`download-list-item-${item.id}`}
                      className="p-2.5 sm:p-3 hover:bg-white/[0.03] transition-colors flex items-center gap-3 group"
                    >
                      {/* Thumbnail Area (Left): Video thumbnail with Quality/Resolution at bottom-left & Duration at bottom-right */}
                      <button
                        type="button"
                        onClick={() => setPlayingItem(item)}
                        className="relative w-28 h-16 sm:w-32 sm:h-18 rounded-xl overflow-hidden bg-black shrink-0 border border-white/10 cursor-pointer group/thumb focus:outline-none focus:ring-2 focus:ring-[#FFCC00]"
                        title={lang === 'ur' ? 'ویڈیو چلائیں' : 'Tap to play in full-screen player'}
                        id={`download-thumbnail-btn-${item.id}`}
                      >
                        <img
                          src={
                            item.thumbnail ||
                            'https://images.unsplash.com/photo-1611162617474-5b21e879e113?w=600'
                          }
                          alt={item.title}
                          onError={(e) => {
                            const target = e.currentTarget;
                            if (!target.dataset.proxied && item.thumbnail?.startsWith('http')) {
                              target.dataset.proxied = '1';
                              target.src = `/api/image-proxy?url=${encodeURIComponent(item.thumbnail)}`;
                            }
                          }}
                          className="w-full h-full object-cover group-hover/thumb:scale-105 transition-transform duration-200"
                          referrerPolicy="no-referrer"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/15 to-transparent" />

                        {/* Center Subtle Play Icon */}
                        <div className="absolute inset-0 flex items-center justify-center">
                          <div className="w-7 h-7 rounded-full bg-black/60 text-white flex items-center justify-center border border-white/25 group-hover/thumb:scale-110 transition-transform">
                            {item.type === 'audio' ? (
                              <Music className="w-3.5 h-3.5" />
                            ) : (
                              <Play className="w-3.5 h-3.5 fill-current ml-0.5" />
                            )}
                          </div>
                        </div>

                        {/* Bottom-Left Overlay Badge: Quality/Resolution (e.g., 1080p, 360p) */}
                        <span
                          className="absolute bottom-1 left-1 px-1.5 py-0.2 rounded bg-black/85 text-white text-[10px] font-mono tabular-nums font-bold tracking-tight border border-white/15"
                          data-badge="resolution"
                        >
                          {resolutionBadge}
                        </span>

                        {/* Bottom-Right Overlay Badge: Duration (e.g., 00:20) */}
                        <span
                          className="absolute bottom-1 right-1 px-1.5 py-0.2 rounded bg-black/85 text-white text-[10px] font-mono tabular-nums font-bold tracking-tight border border-white/15"
                          data-badge="duration"
                        >
                          {durationBadge}
                        </span>
                      </button>

                      {/* Metadata Details (Right): File title at top + small sub-text (platform icon/source, file size, format badge, YYYY-MM-DD date) */}
                      <div
                        onClick={() => setPlayingItem(item)}
                        className="min-w-0 flex-1 cursor-pointer py-0.5"
                      >
                        <h4
                          className="text-xs sm:text-sm font-bold text-slate-100 line-clamp-2 leading-snug group-hover:text-[#FFCC00] transition-colors"
                          title={item.title}
                        >
                          {item.title}
                        </h4>

                        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mt-1.5 text-[11px] text-slate-400 font-mono tabular-nums">
                          {/* Platform Icon / Source */}
                          <span className="inline-flex items-center gap-1 text-slate-300 font-sans font-medium">
                            {getPlatformIcon(item.platform)}
                            <span className="truncate max-w-[110px]">{sourceDomain}</span>
                          </span>

                          <span aria-hidden="true">·</span>

                          {/* File Size (e.g., 5.02 MB) */}
                          <span>{formattedSize}</span>

                          <span aria-hidden="true">·</span>

                          {/* Format Label (MP4/JPG/MP3) */}
                          <span className="text-slate-200 font-semibold">{formatBadge}</span>

                          <span aria-hidden="true">·</span>

                          {/* Download Date (YYYY-MM-DD) */}
                          <span>{downloadDateStr}</span>
                        </div>
                      </div>

                      {/* Three-Dots Context Menu Button (⋮) */}
                      <button
                        type="button"
                        id={`download-item-menu-btn-${item.id}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          setContextMenuItem(item);
                        }}
                        className="min-h-[44px] min-w-[44px] -mr-1 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 flex items-center justify-center transition-colors cursor-pointer shrink-0"
                        aria-label="More options"
                        title={lang === 'ur' ? 'مزید اختیارات (⋮)' : 'Options (⋮)'}
                      >
                        <MoreVertical className="w-5 h-5" />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        </div>
      )}

      {/* Tab 3 Content: Recent Searches */}
      {activeTab === 'recent_searches' && (
        <div className="flex-1 overflow-y-auto overscroll-contain p-3 sm:p-5 pb-24 max-w-4xl w-full mx-auto space-y-2.5">
          {filteredSearches.length === 0 ? (
            <div className="min-h-[45vh] flex flex-col items-center justify-center text-center p-8 text-slate-400">
              <History className="w-8 h-8 text-slate-500 mb-2" />
              <p className="text-sm font-bold text-slate-200">{t.noRecentSearches}</p>
            </div>
          ) : (
            filteredSearches.map((searchItem, index) => (
              <div
                key={`hist_search_${searchItem.id || index}`}
                className="bg-[#151822] rounded-xl p-3 border border-white/10 flex items-center justify-between gap-2.5"
              >
                <div
                  onClick={() => onSelectRecentSearch(searchItem.url)}
                  className="min-w-0 flex-1 cursor-pointer"
                >
                  <div className="flex items-center gap-2 text-xs text-slate-300 font-semibold">
                    {getPlatformIcon(searchItem.platform)}
                    <span className="truncate">{searchItem.title || searchItem.url}</span>
                  </div>
                  <p className="text-[11px] font-mono text-slate-400 truncate mt-0.5">
                    {searchItem.url}
                  </p>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    onClick={(e) => handleCopyLink(e, searchItem.id, searchItem.url)}
                    className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-white/10 cursor-pointer"
                  >
                    {copiedId === searchItem.id ? (
                      <Check className="w-4 h-4 text-emerald-400" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => onDeleteRecentSearch(searchItem.id)}
                    className="p-2 text-slate-400 hover:text-rose-400 rounded-lg hover:bg-rose-500/10 cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* 3. THREE-DOTS CONTEXT MENU (⋮) BOTTOM SHEET / POPUP MENU */}
      {contextMenuItem && (
        <div
          className="fixed inset-0 z-[80] bg-black/70 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 animate-fade-in"
          id="download-item-context-menu-backdrop"
          onClick={() => setContextMenuItem(null)}
        >
          <div
            id="download-item-context-menu-sheet"
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md bg-[#181c26] text-slate-100 rounded-t-3xl sm:rounded-3xl border-t sm:border border-white/15 shadow-2xl overflow-hidden pb-safe"
          >
            {/* Grab Handle */}
            <div className="pt-2.5 pb-1 flex justify-center sm:hidden">
              <div className="w-10 h-1.5 rounded-full bg-slate-600" />
            </div>

            {/* Context Item Header Summary */}
            <div className="px-4 py-3 border-b border-white/10 flex items-center gap-3">
              <img
                src={contextMenuItem.thumbnail}
                alt={contextMenuItem.title}
                className="w-14 h-10 rounded-lg object-cover bg-black shrink-0 border border-white/10"
                referrerPolicy="no-referrer"
              />
              <div className="min-w-0 flex-1">
                <h4 className="text-xs sm:text-sm font-bold text-white truncate">
                  {contextMenuItem.title}
                </h4>
                <p className="text-[11px] text-slate-400 font-mono tabular-nums truncate">
                  {getSourceLabel(contextMenuItem)} ·{' '}
                  {formatDisplayFileSize(contextMenuItem.size, fileSizeUnit)} ·{' '}
                  {formatDateYYYYMMDD(contextMenuItem.downloadedAt)}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setContextMenuItem(null)}
                className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/15 text-slate-400 hover:text-white flex items-center justify-center cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* 5 Exact Context Menu Actions: Share, Hide, Delete, Go to Page, Rename */}
            <div className="p-2 divide-y divide-white/5">
              {/* 1. Share */}
              <button
                type="button"
                id="context-menu-share-btn"
                onClick={() => handleShareItem(contextMenuItem)}
                className="w-full px-3.5 py-3 rounded-xl hover:bg-white/5 flex items-center gap-3.5 text-left text-xs sm:text-sm font-semibold text-slate-100 cursor-pointer transition-colors"
              >
                <div className="w-9 h-9 rounded-xl bg-sky-500/15 text-sky-400 flex items-center justify-center shrink-0">
                  <Share2 className="w-4 h-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <span className="block">{lang === 'ur' ? 'شیئر کریں (Share)' : 'Share'}</span>
                  <span className="text-[11px] text-slate-400 font-normal block">
                    {lang === 'ur'
                      ? 'میڈیا فائل دیگر ایپس پر شیئر کریں'
                      : 'Share media file to external apps'}
                  </span>
                </div>
              </button>

              {/* 2. Hide (Move to hidden/private folder) */}
              <button
                type="button"
                id="context-menu-hide-btn"
                onClick={() => handleHideOrUnhideItem(contextMenuItem)}
                className="w-full px-3.5 py-3 rounded-xl hover:bg-white/5 flex items-center gap-3.5 text-left text-xs sm:text-sm font-semibold text-slate-100 cursor-pointer transition-colors"
              >
                <div className="w-9 h-9 rounded-xl bg-amber-500/15 text-amber-400 flex items-center justify-center shrink-0">
                  {contextMenuItem.isHidden ? (
                    <Eye className="w-4 h-4" />
                  ) : (
                    <EyeOff className="w-4 h-4" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <span className="block">
                    {contextMenuItem.isHidden
                      ? lang === 'ur'
                        ? 'ہڈن فولڈر سے نکالیں (Unhide)'
                        : 'Unhide from Private Folder'
                      : lang === 'ur'
                      ? 'چھپائیں (Hide)'
                      : 'Hide'}
                  </span>
                  <span className="text-[11px] text-slate-400 font-normal block">
                    {lang === 'ur'
                      ? 'فائل کو خفیہ/پرائیویٹ فولڈر میں منتقل کریں'
                      : 'Move file to hidden/private folder'}
                  </span>
                </div>
              </button>

              {/* 3.Go to Page (Opens in-app browser loading exact source URL with red floating Download button) */}
              <button
                type="button"
                id="context-menu-goto-page-btn"
                onClick={() => handleGoToPageContextItem(contextMenuItem)}
                className="w-full px-3.5 py-3 rounded-xl hover:bg-white/5 flex items-center gap-3.5 text-left text-xs sm:text-sm font-semibold text-slate-100 cursor-pointer transition-colors"
              >
                <div className="w-9 h-9 rounded-xl bg-red-500/15 text-red-400 flex items-center justify-center shrink-0">
                  <ExternalLink className="w-4 h-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <span className="block">
                    {lang === 'ur' ? 'صفحہ پر جائیں (Go to Page)' : 'Go to Page'}
                  </span>
                  <span className="text-[11px] text-slate-400 font-normal block truncate">
                    {lang === 'ur'
                      ? 'ان-ایپ براؤزر میں اصل ویڈیو پیج کھولیں'
                      : `Open source page (${getSourceLabel(contextMenuItem)}) in browser`}
                  </span>
                </div>
              </button>

              {/* 4. Rename */}
              <button
                type="button"
                id="context-menu-rename-btn"
                onClick={() => handleOpenRenameModal(contextMenuItem)}
                className="w-full px-3.5 py-3 rounded-xl hover:bg-white/5 flex items-center gap-3.5 text-left text-xs sm:text-sm font-semibold text-slate-100 cursor-pointer transition-colors"
              >
                <div className="w-9 h-9 rounded-xl bg-emerald-500/15 text-emerald-400 flex items-center justify-center shrink-0">
                  <Edit3 className="w-4 h-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <span className="block">
                    {lang === 'ur' ? 'نام تبدیل کریں (Rename)' : 'Rename'}
                  </span>
                  <span className="text-[11px] text-slate-400 font-normal block">
                    {lang === 'ur'
                      ? 'ڈاؤن لوڈ فائل کا عنوان تبدیل کریں'
                      : 'Edit the title of the downloaded file'}
                  </span>
                </div>
              </button>

              {/* 5. Delete */}
              <button
                type="button"
                id="context-menu-delete-btn"
                onClick={() => handleDeleteContextItem(contextMenuItem)}
                className="w-full px-3.5 py-3 rounded-xl hover:bg-rose-500/10 flex items-center gap-3.5 text-left text-xs sm:text-sm font-semibold text-rose-400 cursor-pointer transition-colors"
              >
                <div className="w-9 h-9 rounded-xl bg-rose-500/15 text-rose-400 flex items-center justify-center shrink-0">
                  <Trash2 className="w-4 h-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <span className="block">{lang === 'ur' ? 'حذف کریں (Delete)' : 'Delete'}</span>
                  <span className="text-[11px] text-rose-300/70 font-normal block">
                    {lang === 'ur'
                      ? 'ڈاؤن لوڈ فائل مستقل طور پر ختم کریں'
                      : 'Remove the downloaded file permanently'}
                  </span>
                </div>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 4. RENAME FILE MODAL */}
      {renameTargetItem && (
        <div
          className="fixed inset-0 z-[85] bg-black/75 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in"
          id="rename-history-item-modal"
          onClick={() => setRenameTargetItem(null)}
        >
          <form
            onSubmit={handleSaveRename}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md rounded-2xl bg-[#181c26] border border-white/15 p-4 sm:p-5 shadow-2xl space-y-4"
          >
            <div className="flex items-center justify-between">
              <h4 className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
                <Edit3 className="w-4 h-4 text-[#FFCC00]" />
                <span>{lang === 'ur' ? 'فائل کا نام تبدیل کریں' : 'Rename File'}</span>
              </h4>
              <button
                type="button"
                onClick={() => setRenameTargetItem(null)}
                className="text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <input
              type="text"
              value={renameInputText}
              onChange={(e) => setRenameInputText(e.target.value)}
              autoFocus
              placeholder="Enter new file title..."
              className="w-full h-11 px-3.5 rounded-xl bg-[#10131a] border border-white/15 text-sm text-white focus:outline-none focus:border-[#FFCC00]"
              id="rename-file-input"
            />

            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setRenameTargetItem(null)}
                className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-bold text-slate-300 cursor-pointer"
              >
                {lang === 'ur' ? 'منسوخ' : 'Cancel'}
              </button>
              <button
                type="submit"
                className="px-4 py-2 rounded-xl bg-[#FFCC00] hover:bg-[#f2c200] text-slate-950 text-xs font-extrabold cursor-pointer"
              >
                {lang === 'ur' ? 'محفوظ کریں' : 'Save'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* 5. FULL-SCREEN MEDIA PLAYER MODAL WITH RESPONSIVE VIDEO CONTROLS BELOW PLAYER */}
      {playingItem && (
        <div
          ref={playerContainerRef}
          className="fixed inset-0 z-[90] bg-black/95 backdrop-blur-xl flex flex-col justify-between animate-fade-in"
          id="history-instant-player-overlay"
        >
          {/* Top Bar */}
          <div className="px-4 py-3 bg-gradient-to-b from-black/90 to-transparent flex items-center justify-between gap-3 z-10">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 text-xs text-slate-300 font-mono tabular-nums">
                <span className="text-[#FFCC00] font-bold uppercase">{playingItem.platform}</span>
                <span>·</span>
                <span>{getCleanResolutionBadge(playingItem)}</span>
              </div>
              <h4 className="text-xs sm:text-sm font-bold text-white truncate mt-0.5">
                {playingItem.title}
              </h4>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              {onGoToPage && (
                <button
                  type="button"
                  onClick={() => {
                    const itemToOpen = playingItem;
                    setPlayingItem(null);
                    onGoToPage(itemToOpen);
                  }}
                  className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Go to Page</span>
                </button>
              )}
              <button
                type="button"
                onClick={() => onReDownload(playingItem)}
                className="px-3 py-1.5 rounded-xl bg-[#FFCC00] hover:bg-[#f2c200] text-slate-950 text-xs font-extrabold flex items-center gap-1.5 cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>{lang === 'ur' ? 'محفوظ کریں' : 'Save'}</span>
              </button>
              <button
                type="button"
                onClick={() => setPlayingItem(null)}
                className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white cursor-pointer"
                title={t.close}
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Center Media Canvas */}
          <div
            className="flex-1 flex items-center justify-center p-2 sm:p-4 overflow-hidden relative"
            onClick={togglePlayerPlay}
          >
            {playingItem.type === 'image' ? (
              <img
                src={getPlayableStreamUrl(playingItem)}
                alt={playingItem.title}
                className="max-w-full max-h-[75vh] object-contain rounded-2xl shadow-2xl"
                referrerPolicy="no-referrer"
              />
            ) : (
              <video
                ref={videoPlayerRef}
                src={getPlayableStreamUrl(playingItem)}
                poster={playingItem.thumbnail}
                autoPlay
                playsInline
                onTimeUpdate={() => {
                  if (videoPlayerRef.current) {
                    setPlayerCurrentTime(videoPlayerRef.current.currentTime);
                    setPlayerDuration(videoPlayerRef.current.duration || 0);
                  }
                }}
                onLoadedMetadata={() => {
                  if (videoPlayerRef.current) {
                    setPlayerDuration(videoPlayerRef.current.duration || 0);
                  }
                }}
                onPlay={() => setIsPlayerPlaying(true)}
                onPause={() => setIsPlayerPlaying(false)}
                onEnded={() => setIsPlayerPlaying(false)}
                className="max-w-full max-h-[72vh] w-auto h-auto rounded-xl shadow-2xl bg-black"
              />
            )}
          </div>

          {/* Responsive Video Control Buttons Below Video Player (Play/Pause, Seekbar, Forward/Rewind, Volume, Fullscreen) */}
          {playingItem.type !== 'image' && (
            <div
              id="media-player-bottom-controls"
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-3xl mx-auto px-4 py-3.5 bg-[#141720]/95 border-t sm:border border-white/10 sm:rounded-2xl sm:mb-4 space-y-2.5 z-20"
            >
              {/* Seekbar Row */}
              <div className="flex items-center gap-3">
                <span className="text-xs font-mono tabular-nums text-slate-300 w-11 text-right">
                  {formatPlayerTime(playerCurrentTime)}
                </span>
                <input
                  type="range"
                  min={0}
                  max={playerDuration || 100}
                  step={0.1}
                  value={playerCurrentTime}
                  onChange={handlePlayerSeek}
                  className="flex-1 h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-[#FFCC00]"
                  aria-label="Seek video timeline"
                />
                <span className="text-xs font-mono tabular-nums text-slate-300 w-11">
                  {formatPlayerTime(playerDuration)}
                </span>
              </div>

              {/* Control Buttons Row: Play/Pause, Rewind (-10s), Forward (+10s), Volume, Fullscreen */}
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5 sm:gap-2.5">
                  {/* Play / Pause */}
                  <button
                    type="button"
                    onClick={togglePlayerPlay}
                    className="w-10 h-10 rounded-xl bg-[#FFCC00] hover:bg-[#f2c200] text-slate-950 flex items-center justify-center cursor-pointer transition-transform active:scale-95"
                    title={isPlayerPlaying ? 'Pause' : 'Play'}
                  >
                    {isPlayerPlaying ? (
                      <Pause className="w-5 h-5 fill-current" />
                    ) : (
                      <Play className="w-5 h-5 fill-current ml-0.5" />
                    )}
                  </button>

                  {/* Rewind -10s */}
                  <button
                    type="button"
                    onClick={() => handlePlayerSkip(-10)}
                    className="h-10 px-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-white text-xs font-mono font-bold flex items-center gap-1 cursor-pointer"
                    title="Rewind 10 seconds"
                  >
                    <RotateCcw className="w-4 h-4" />
                    <span>-10s</span>
                  </button>

                  {/* Forward +10s */}
                  <button
                    type="button"
                    onClick={() => handlePlayerSkip(10)}
                    className="h-10 px-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-white text-xs font-mono font-bold flex items-center gap-1 cursor-pointer"
                    title="Forward 10 seconds"
                  >
                    <RotateCw className="w-4 h-4" />
                    <span>+10s</span>
                  </button>

                  {/* Volume Mute + Slider */}
                  <div className="flex items-center gap-1.5 pl-1">
                    <button
                      type="button"
                      onClick={handlePlayerMuteToggle}
                      className="w-9 h-9 rounded-xl bg-white/5 hover:bg-white/15 text-slate-200 flex items-center justify-center cursor-pointer"
                      title={isPlayerMuted ? 'Unmute' : 'Mute'}
                    >
                      {isPlayerMuted ? (
                        <VolumeX className="w-4 h-4 text-rose-400" />
                      ) : (
                        <Volume2 className="w-4 h-4" />
                      )}
                    </button>
                    <input
                      type="range"
                      min={0}
                      max={1}
                      step={0.05}
                      value={isPlayerMuted ? 0 : playerVolume}
                      onChange={handlePlayerVolumeChange}
                      className="hidden sm:block w-20 h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-[#FFCC00]"
                      aria-label="Volume"
                    />
                  </div>
                </div>

                {/* Fullscreen Toggle */}
                <button
                  type="button"
                  onClick={handlePlayerFullscreenToggle}
                  className="w-10 h-10 rounded-xl bg-white/10 hover:bg-white/20 text-white flex items-center justify-center cursor-pointer"
                  title="Fullscreen"
                >
                  {isPlayerFullscreen ? (
                    <Minimize2 className="w-4 h-4" />
                  ) : (
                    <Maximize2 className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-[95] bg-[#1e2230] text-white px-4 py-2.5 rounded-2xl shadow-2xl border border-[#FFCC00]/40 flex items-center gap-2 text-xs font-bold animate-fade-in">
          <CheckCircle2 className="w-4 h-4 text-[#FFCC00] shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  );
};
