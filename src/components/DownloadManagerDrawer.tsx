import React, { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, 
  Download, 
  Pause, 
  Play, 
  Trash2, 
  CheckCircle2, 
  CheckSquare,
  Square, 
  FolderOpen,
  ArrowDownToLine,
  Clock,
  Check,
  Timer,
  Gauge,
  Zap,
  HardDrive,
  RotateCcw,
  RefreshCw,
  AlertCircle,
  Settings2,
  QrCode,
  Bell,
  BellRing,
  BellOff,
  Calendar,
  ShieldCheck,
  Share2,
  Layers,
  ChevronDown,
  ChevronUp,
  Boxes,
  FileSpreadsheet,
  FileDown,
  Edit3,
  Tag,
  FileText,
  Palette
} from 'lucide-react';
import { DownloadTask, Language, AutoClearDuration, AutoClearRetentionMode, HistoryItem, DownloadSpeedCap, Theme, FileSizeUnit } from '../types';
import { APP_THEMES } from './ColorfulBackground';
import { translations } from '../data/translations';
import { 
  calculateEstimatedSecondsRemaining, 
  formatEstimatedTimeRemaining, 
  calculateDownloadedSize,
  parseSizeToMB,
  parseSpeedToMBps,
  exportRecordsToCSV,
  getSavedHistory,
  getRealTimeTaskProgress,
  formatDisplayFileSize
} from '../utils/urlParser';

export interface BatchGroupData {
  id: string;
  title: string;
  type: 'single_link_options' | 'bulk_import' | 'manual' | 'grouped';
  tasks: DownloadTask[];
  thumbnail: string;
  totalTasks: number;
  completedTasks: number;
  downloadingTasks: number;
  pausedTasks: number;
  failedTasks: number;
  scheduledTasks: number;
  totalSizeMB: number;
  downloadedSizeMB: number;
  aggregateProgress: number;
  aggregateSpeedMBps: number;
  aggregateSpeedFormatted: string;
  estimatedSecondsRemaining: number;
  etaText: string;
  hasActiveDownloads: boolean;
}

interface RadialProgressProps {
  progress: number;
  status: 'downloading' | 'paused' | 'completed' | 'failed' | 'pending' | 'scheduled' | 'error';
  size?: number;
  strokeWidth?: number;
}

const RadialProgressIndicator: React.FC<RadialProgressProps> = ({
  progress,
  status,
  size = 46,
  strokeWidth = 3.5,
}) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const normalizedProgress = status === 'completed' ? 100 : Math.min(Math.max(Math.floor(progress), 0), 98);
  const strokeDashoffset = circumference - (normalizedProgress / 100) * circumference;

  const isCompleted = status === 'completed';
  const isPaused = status === 'paused';
  const isDownloading = status === 'downloading';
  const isFailed = status === 'failed';
  const isError = status === 'error';
  const isScheduled = status === 'scheduled';

  let strokeColor = 'stroke-blue-600 dark:stroke-blue-400';
  let textColor = 'text-blue-600 dark:text-blue-400';
  let bgColor = 'bg-blue-50/60 dark:bg-blue-950/40';

  if (isCompleted) {
    strokeColor = 'stroke-emerald-500 dark:stroke-emerald-400';
    textColor = 'text-emerald-600 dark:text-emerald-400';
    bgColor = 'bg-emerald-50/70 dark:bg-emerald-950/40';
  } else if (isScheduled) {
    strokeColor = 'stroke-indigo-600 dark:stroke-indigo-400';
    textColor = 'text-indigo-600 dark:text-indigo-400';
    bgColor = 'bg-indigo-50/70 dark:bg-indigo-950/40';
  } else if (isPaused) {
    strokeColor = 'stroke-amber-500 dark:stroke-amber-400';
    textColor = 'text-amber-600 dark:text-amber-400';
    bgColor = 'bg-amber-50/70 dark:bg-amber-950/40';
  } else if (isFailed) {
    strokeColor = 'stroke-amber-500 dark:stroke-amber-400';
    textColor = 'text-amber-600 dark:text-amber-400';
    bgColor = 'bg-amber-50/70 dark:bg-amber-950/40';
  } else if (isError) {
    strokeColor = 'stroke-rose-500 dark:stroke-rose-400';
    textColor = 'text-rose-600 dark:text-rose-400';
    bgColor = 'bg-rose-50/70 dark:bg-rose-950/40';
  }

  return (
    <div className="relative flex items-center justify-center shrink-0">
      {/* Outer subtle glow ring on active download */}
      {isDownloading && (
        <div className="absolute inset-0 rounded-full bg-blue-400/20 dark:bg-blue-500/10 animate-ping pointer-events-none" />
      )}

      <div className={`relative flex items-center justify-center rounded-full ${bgColor} p-0.5 shadow-2xs`}>
        <svg
          width={size}
          height={size}
          className="transform -rotate-90"
        >
          {/* Background track circle */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke="currentColor"
            strokeWidth={strokeWidth}
            fill="transparent"
            className="text-slate-200/90 dark:text-slate-700/80"
          />
          {/* Animated Radial Progress Stroke */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke="currentColor"
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            fill="transparent"
            className={`${strokeColor} transition-[stroke-dashoffset] duration-300 ease-out`}
          />
        </svg>

        {/* Center Progress Text or Status Icon */}
        <div className={`absolute inset-0 flex flex-col items-center justify-center font-mono font-bold ${textColor}`}>
          {isCompleted ? (
            <div className="flex items-center justify-center animate-bounce">
              <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400 stroke-[3]" />
            </div>
          ) : isScheduled ? (
            <div className="flex items-center justify-center">
              <Clock className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
            </div>
          ) : isPaused ? (
            <div className="flex flex-col items-center leading-none">
              <span className="text-[10px] font-black">{normalizedProgress}%</span>
            </div>
          ) : isFailed ? (
            <div className="flex items-center justify-center">
              <RotateCcw className="w-3.5 h-3.5 text-amber-500 animate-spin" />
            </div>
          ) : isError ? (
            <div className="flex items-center justify-center">
              <AlertCircle className="w-4 h-4 text-rose-500 stroke-[2.5]" />
            </div>
          ) : (
            <div className="flex flex-col items-center leading-none">
              <span className="text-[10px] font-black tracking-tight">{normalizedProgress}%</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

interface DownloadManagerDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  tasks: DownloadTask[];
  history?: HistoryItem[];
  lang: Language;
  fileSizeUnit?: FileSizeUnit;
  onChangeFileSizeUnit?: (unit: FileSizeUnit) => void;
  onPauseTask: (id: string) => void;
  onResumeTask: (id: string) => void;
  onCancelTask: (id: string) => void;
  onRetryTask?: (id: string) => void;
  onSimulateFailTask?: (id: string) => void;
  onSaveToDevice: (task: DownloadTask) => void;
  onSaveToDrive?: (task: DownloadTask) => void;
  onOpenQrCode?: (task: DownloadTask) => void;
  onClearCompleted: () => void;
  autoClearDuration?: AutoClearDuration;
  onChangeAutoClearDuration?: (dur: AutoClearDuration) => void;
  autoClearRetentionMode?: AutoClearRetentionMode;
  onChangeAutoClearRetentionMode?: (mode: AutoClearRetentionMode) => void;
  clearSuccessfullyFinished?: boolean;
  onToggleClearSuccessfullyFinished?: (val?: boolean) => void;
  downloadSpeedCap?: DownloadSpeedCap;
  onChangeDownloadSpeedCap?: (cap: DownloadSpeedCap) => void;
  desktopNotifications?: boolean;
  onToggleDesktopNotifications?: () => void;
  onTestNotification?: () => void;
  onTriggerScheduledNow?: (id: string) => void;
  onRescheduleTask?: (task: DownloadTask) => void;
  keepAliveActive?: boolean;
  onToggleKeepAlive?: () => void;
  onShareTask?: (task: DownloadTask) => void;
  onBatchRename?: (
    taskIds: string[], 
    updates: { id: string; filename: string; mediaTitle?: string }[]
  ) => void;
  onDeleteHistoryItem?: (id: string) => void;
  onReDownloadHistory?: (item: HistoryItem) => void;
  theme?: Theme;
  onSelectTheme?: (theme: Theme) => void;
}

export const DownloadManagerDrawer: React.FC<DownloadManagerDrawerProps> = ({
  isOpen,
  onClose,
  tasks,
  history = [],
  lang,
  fileSizeUnit = 'MB' as FileSizeUnit,
  onChangeFileSizeUnit,
  onPauseTask,
  onResumeTask,
  onCancelTask,
  onRetryTask,
  onSimulateFailTask,
  onSaveToDevice,
  onSaveToDrive,
  onOpenQrCode,
  onClearCompleted,
  autoClearDuration = '30',
  onChangeAutoClearDuration,
  autoClearRetentionMode = 'clear_finished',
  onChangeAutoClearRetentionMode,
  clearSuccessfullyFinished = true,
  onToggleClearSuccessfullyFinished,
  downloadSpeedCap = 'unlimited',
  onChangeDownloadSpeedCap,
  desktopNotifications = false,
  onToggleDesktopNotifications,
  onTestNotification,
  onTriggerScheduledNow,
  onRescheduleTask,
  keepAliveActive = true,
  onToggleKeepAlive,
  onShareTask,
  onBatchRename,
  onDeleteHistoryItem,
  onReDownloadHistory,
  theme = 'dark',
  onSelectTheme,
}) => {
  const [showSettings, setShowSettings] = useState(false);
  const [isDrawerThemesOpen, setIsDrawerThemesOpen] = useState(false);
  const [activeDrawerTab, setActiveDrawerTab] = useState<'queue' | 'history'>('queue');
  const [sharedTaskId, setSharedTaskId] = useState<string | null>(null);
  const [shareToast, setShareToast] = useState<string | null>(null);
  const [isExportingCsv, setIsExportingCsv] = useState(false);

  // Batch Rename Modal State
  const [renamingBatch, setRenamingBatch] = useState<BatchGroupData | null>(null);
  const [renamePrefix, setRenamePrefix] = useState('');
  const [includeTimestamp, setIncludeTimestamp] = useState(true);
  const [includeIndex, setIncludeIndex] = useState(true);

  // Open Batch Rename Dialog
  const handleOpenBatchRename = (batch: BatchGroupData) => {
    // Generate intelligent default prefix from batch title or first task
    const firstTask = batch.tasks[0];
    const defaultPrefix = (firstTask?.platform ? `${firstTask.platform.toUpperCase()}_` : '') + 
      (batch.title.replace(/\s*\([^)]*\)\s*$/, '').trim().replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 20) || 'Download_Batch');
    setRenamePrefix(defaultPrefix);
    setIncludeTimestamp(true);
    setIncludeIndex(true);
    setRenamingBatch(batch);
  };

  // Compute preview for a given task under the rename configuration
  const computePreviewFilename = (task: DownloadTask, index: number, total: number) => {
    const ext = (task.format || 'mp4').toLowerCase().replace(/^\./, '');
    const cleanPrefix = renamePrefix.trim().replace(/[^a-zA-Z0-9_\-\s]/g, '_').replace(/\s+/g, '_') || 'Media';
    const dateStr = new Date().toISOString().slice(0, 10);
    const indexStr = total > 9 ? String(index + 1).padStart(2, '0') : String(index + 1);
    const qualityTag = task.quality ? `_${task.quality.replace(/[^a-zA-Z0-9]/g, '')}` : '';

    let parts: string[] = [cleanPrefix];
    if (includeTimestamp) {
      parts.push(dateStr);
    }
    if (includeIndex) {
      parts.push(`part${indexStr}`);
    }
    
    return `${parts.join('_')}${qualityTag}.${ext}`;
  };

  // Apply batch rename
  const handleApplyBatchRename = () => {
    if (!renamingBatch) return;
    const taskCount = renamingBatch.tasks.length;
    const updates = renamingBatch.tasks.map((task, idx) => {
      const newFilename = computePreviewFilename(task, idx, taskCount);
      const cleanPrefix = renamePrefix.trim() || 'Media';
      const newTitle = `${cleanPrefix} #${idx + 1} (${task.quality || task.format})`;
      return {
        id: task.id,
        filename: newFilename,
        mediaTitle: newTitle,
      };
    });

    if (onBatchRename) {
      onBatchRename(renamingBatch.tasks.map(t => t.id), updates);
    }

    setShareToast(translations[lang].renameAppliedSuccess);
    setTimeout(() => {
      setShareToast(null);
    }, 3500);

    setRenamingBatch(null);
  };

  // Export current tasks and download history to CSV for record-keeping
  const handleExportRecords = () => {
    setIsExportingCsv(true);
    const allHistory = history && history.length > 0 ? history : getSavedHistory();
    if (tasks.length === 0 && allHistory.length === 0) {
      setShareToast(translations[lang].exportCsvEmpty);
      setTimeout(() => {
        setShareToast(null);
        setIsExportingCsv(false);
      }, 3500);
      return;
    }

    const success = exportRecordsToCSV(tasks, allHistory);
    if (success) {
      setShareToast(translations[lang].exportCsvSuccess);
      setTimeout(() => {
        setShareToast(null);
        setIsExportingCsv(false);
      }, 4000);
    } else {
      setIsExportingCsv(false);
    }
  };

  const handleShareCompletedTask = async (task: DownloadTask) => {
    if (onShareTask) {
      onShareTask(task);
    }

    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    const pathname = typeof window !== 'undefined' ? window.location.pathname : '';
    const shareUrl = task.url || `${origin}${pathname}`;
    const shareTitle = `${task.mediaTitle} | ${task.platform.toUpperCase()} Downloader`;
    const shareText = lang === 'ur'
      ? `ڈاؤنلوڈ مکمل: ${task.mediaTitle} (${task.quality} ${task.format})\nسائز: ${task.size}\nپلیٹ فارم: ${task.platform.toUpperCase()}\nڈاؤنلوڈ لنک:`
      : `Downloaded: ${task.mediaTitle} (${task.quality} ${task.format})\nFile Size: ${task.size}\nPlatform: ${task.platform.toUpperCase()}\nDownload Link:`;

    const shareData = {
      title: shareTitle,
      text: shareText,
      url: shareUrl,
    };

    if (navigator.share) {
      try {
        await navigator.share(shareData);
        setSharedTaskId(task.id);
        setShareToast(lang === 'ur' ? 'کامیابی سے شیئر کیا گیا!' : 'Shared successfully!');
        setTimeout(() => {
          setSharedTaskId(null);
          setShareToast(null);
        }, 3000);
        return;
      } catch (err: any) {
        if (err.name === 'AbortError') return;
      }
    }

    // Fallback: Copy to clipboard
    try {
      await navigator.clipboard.writeText(`${shareText}\n${shareUrl}`);
      setSharedTaskId(task.id);
      setShareToast(lang === 'ur' ? 'ڈاؤنلوڈ لنک کلپ بورڈ میں کاپی ہو گیا!' : 'Download link & details copied to clipboard!');
      setTimeout(() => {
        setSharedTaskId(null);
        setShareToast(null);
      }, 3000);
    } catch {
      window.prompt(lang === 'ur' ? 'لنک کاپی کریں:' : 'Copy link to share:', shareUrl);
    }
  };

  const t = translations[lang];

  const activeCount = tasks.filter(t => t.status === 'downloading').length;
  const scheduledCount = tasks.filter(t => t.status === 'scheduled').length;
  const failedCount = tasks.filter(t => t.status === 'failed').length;
  const errorCount = tasks.filter(t => t.status === 'error').length;
  const pausedCount = tasks.filter(t => t.status === 'paused').length;

  const handlePauseAll = () => {
    tasks.forEach((taskItem) => {
      if (taskItem.status === 'downloading') {
        onPauseTask(taskItem.id);
      }
    });
  };

  const handleResumeAll = () => {
    tasks.forEach((taskItem) => {
      if (taskItem.status === 'paused') {
        onResumeTask(taskItem.id);
      }
    });
  };

  const handleRetryAll = () => {
    tasks.forEach((taskItem) => {
      if ((taskItem.status === 'failed' || taskItem.status === 'error') && onRetryTask) {
        onRetryTask(taskItem.id);
      } else if (taskItem.status === 'paused') {
        onResumeTask(taskItem.id);
      }
    });
  };

  const [collapsedBatches, setCollapsedBatches] = useState<Record<string, boolean>>({});
  const [selectedTaskIds, setSelectedTaskIds] = useState<Set<string>>(new Set());

  const effectiveHistory = useMemo(() => {
    return history && history.length > 0 ? history : getSavedHistory();
  }, [history]);

  const historyOnlyItems = useMemo(() => {
    const taskIds = new Set(tasks.map((tItem) => tItem.id));
    return effectiveHistory.filter((hItem) => !taskIds.has(hItem.id));
  }, [effectiveHistory, tasks]);

  const allSelectableIds = useMemo(() => {
    return [
      ...tasks.map((tItem) => tItem.id),
      ...historyOnlyItems.map((hItem) => hItem.id),
    ];
  }, [tasks, historyOnlyItems]);

  // Keep selectedTaskIds in sync when tasks or history items are removed
  useEffect(() => {
    setSelectedTaskIds((prev) => {
      if (prev.size === 0) return prev;
      const validIds = new Set(allSelectableIds);
      const next = new Set<string>();
      prev.forEach((id) => {
        if (validIds.has(id)) next.add(id);
      });
      return next.size === prev.size ? prev : next;
    });
  }, [allSelectableIds]);

  const isAllSelected =
    allSelectableIds.length > 0 && selectedTaskIds.size === allSelectableIds.length;
  const selectedTasksList = useMemo(
    () => tasks.filter((tItem) => selectedTaskIds.has(tItem.id)),
    [tasks, selectedTaskIds]
  );
  const selectedHistoryList = useMemo(
    () => historyOnlyItems.filter((hItem) => selectedTaskIds.has(hItem.id)),
    [historyOnlyItems, selectedTaskIds]
  );
  const selectedRetryableCount = useMemo(
    () =>
      selectedTasksList.filter(
        (tItem) => tItem.status === 'failed' || tItem.status === 'error' || tItem.status === 'paused'
      ).length + selectedHistoryList.length,
    [selectedTasksList, selectedHistoryList]
  );

  const toggleSelectTask = (id: string) => {
    setSelectedTaskIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleToggleSelectAll = () => {
    if (isAllSelected) {
      setSelectedTaskIds(new Set());
    } else {
      setSelectedTaskIds(new Set(allSelectableIds));
    }
  };

  const handleSelectAllFailed = () => {
    const failedIds = tasks
      .filter((tItem) => tItem.status === 'failed' || tItem.status === 'error')
      .map((tItem) => tItem.id);
    setSelectedTaskIds(new Set(failedIds));
  };

  const handleToggleSelectBatch = (batch: BatchGroupData) => {
    const batchIds = batch.tasks.map((tItem) => tItem.id);
    const allBatchSelected = batchIds.every((id) => selectedTaskIds.has(id));
    setSelectedTaskIds((prev) => {
      const next = new Set(prev);
      if (allBatchSelected) {
        batchIds.forEach((id) => next.delete(id));
      } else {
        batchIds.forEach((id) => next.add(id));
      }
      return next;
    });
  };

  const handleRetrySelected = () => {
    if (selectedTaskIds.size === 0) return;
    selectedTasksList.forEach((taskItem) => {
      if ((taskItem.status === 'failed' || taskItem.status === 'error') && onRetryTask) {
        onRetryTask(taskItem.id);
      } else if (taskItem.status === 'paused') {
        onResumeTask(taskItem.id);
      } else if (onRetryTask) {
        onRetryTask(taskItem.id);
      }
    });
    selectedHistoryList.forEach((histItem) => {
      if (onReDownloadHistory) {
        onReDownloadHistory(histItem);
      }
    });
    setShareToast(
      lang === 'ur'
        ? `${selectedTaskIds.size} منتخب آئٹمز دوبارہ شروع کر دیے گئے!`
        : `Retrying ${selectedTaskIds.size} selected item(s)!`
    );
    setTimeout(() => setShareToast(null), 3000);
  };

  const handleCancelSelected = () => {
    if (selectedTaskIds.size === 0) return;
    const count = selectedTaskIds.size;
    selectedTasksList.forEach((taskItem) => onCancelTask(taskItem.id));
    selectedHistoryList.forEach((histItem) => {
      if (onDeleteHistoryItem) {
        onDeleteHistoryItem(histItem.id);
      }
    });
    setSelectedTaskIds(new Set());
    setShareToast(
      lang === 'ur'
        ? `${count} منتخب آئٹمز منسوخ/حذف کر دیے گئے!`
        : `Cancelled & removed ${count} selected item(s)!`
    );
    setTimeout(() => setShareToast(null), 3000);
  };

  const toggleBatchCollapse = (batchId: string) => {
    setCollapsedBatches((prev) => ({
      ...prev,
      [batchId]: !prev[batchId],
    }));
  };

  const { batchGroups, standaloneTasks } = useMemo(() => {
    // 1. Group tasks with explicit batchId
    const groupsMap = new Map<string, DownloadTask[]>();
    const unassignedTasks: DownloadTask[] = [];

    tasks.forEach((task) => {
      if (task.batchId) {
        const list = groupsMap.get(task.batchId) || [];
        list.push(task);
        groupsMap.set(task.batchId, list);
      } else {
        unassignedTasks.push(task);
      }
    });

    // 2. Cluster unassigned tasks that share common origin/prefix
    const clusterMap = new Map<string, DownloadTask[]>();
    const trueSingleTasks: DownloadTask[] = [];

    unassignedTasks.forEach((task) => {
      const isBatchPrefix = task.id.startsWith('batch_') || task.id.startsWith('opt_batch_');
      let clusterKey: string | null = null;

      if (task.sourceUrl) {
        clusterKey = `url_${task.sourceUrl}`;
      } else if (isBatchPrefix) {
        const parts = task.id.split('_');
        clusterKey = parts.slice(0, 3).join('_');
      } else if (task.thumbnail && task.platform) {
        clusterKey = `thumb_${task.platform}_${task.thumbnail}`;
      }

      if (clusterKey) {
        const list = clusterMap.get(clusterKey) || [];
        list.push(task);
        clusterMap.set(clusterKey, list);
      } else {
        trueSingleTasks.push(task);
      }
    });

    clusterMap.forEach((clustered, key) => {
      if (clustered.length >= 2) {
        groupsMap.set('cluster_' + key, clustered);
      } else {
        trueSingleTasks.push(...clustered);
      }
    });

    const groups: BatchGroupData[] = [];
    const groupedTaskIds = new Set<string>();

    groupsMap.forEach((groupTasks, groupId) => {
      if (groupTasks.length < 2) {
        trueSingleTasks.push(...groupTasks);
        return;
      }

      groupTasks.forEach((t) => groupedTaskIds.add(t.id));

      const first = groupTasks[0];
      const totalTasks = groupTasks.length;
      const downloadingTasks = groupTasks.filter((t) => t.status === 'downloading').length;
      const completedTasks = groupTasks.filter((t) => t.status === 'completed').length;
      const pausedTasks = groupTasks.filter((t) => t.status === 'paused').length;
      const failedTasks = groupTasks.filter((t) => t.status === 'failed' || t.status === 'error').length;
      const scheduledTasks = groupTasks.filter((t) => t.status === 'scheduled').length;

      let totalSizeMB = 0;
      let downloadedSizeMB = 0;
      let sumSpeedMBps = 0;

      groupTasks.forEach((t) => {
        const taskPct = getRealTimeTaskProgress(t);
        const sizeMB =
          typeof t.totalBytes === 'number' && t.totalBytes > 0
            ? t.totalBytes / (1024 * 1024)
            : parseSizeToMB(t.size);
        totalSizeMB += sizeMB;
        const itemDownloadedMB =
          t.status === 'completed'
            ? sizeMB
            : typeof t.downloadedBytes === 'number' &&
              typeof t.totalBytes === 'number' &&
              t.totalBytes > 0
            ? Math.min(sizeMB * 0.98, t.downloadedBytes / (1024 * 1024))
            : sizeMB * (taskPct / 100);
        downloadedSizeMB += itemDownloadedMB;
        if (t.status === 'downloading') {
          sumSpeedMBps += parseSpeedToMBps(t.speed);
        }
      });

      const rawAggregateProgress = totalSizeMB > 0 
        ? Math.floor((downloadedSizeMB / totalSizeMB) * 100)
        : Math.floor(groupTasks.reduce((acc, t) => acc + getRealTimeTaskProgress(t), 0) / totalTasks);
      const aggregateProgress =
        completedTasks === totalTasks
          ? 100
          : Math.min(98, Math.max(0, rawAggregateProgress));

      const remainingMB = Math.max(0, totalSizeMB - downloadedSizeMB);
      const estimatedSecondsRemaining = sumSpeedMBps > 0 && remainingMB > 0 
        ? remainingMB / sumSpeedMBps 
        : 0;

      let etaText = '';
      if (completedTasks === totalTasks) {
        etaText = lang === 'ur' ? 'مکمل ہو گیا' : 'Completed';
      } else if (downloadingTasks === 0 && pausedTasks > 0) {
        etaText = lang === 'ur' ? 'روکا گیا ہے' : 'Paused';
      } else if (downloadingTasks === 0 && scheduledTasks > 0) {
        etaText = lang === 'ur' ? 'شیڈول شدہ' : 'Scheduled';
      } else {
        etaText = formatEstimatedTimeRemaining(estimatedSecondsRemaining, 'downloading', lang);
      }

      const isBulk = first.batchType === 'bulk_import' || first.id.startsWith('batch_');
      const title = first.batchTitle || 
        (isBulk
          ? (lang === 'ur' ? `بلک ڈاؤنلوڈ (${totalTasks} فائلیں)` : `Bulk Import (${totalTasks} files)`)
          : `${first.mediaTitle.replace(/\s*\([^)]*\)\s*$/, '').trim()} (${totalTasks} ${lang === 'ur' ? 'فارمیٹس' : 'formats'})`);

      const hasActiveDownloads = downloadingTasks > 0 || (pausedTasks > 0 && completedTasks < totalTasks);

      groups.push({
        id: groupId,
        title,
        type: first.batchType || 'grouped',
        tasks: groupTasks,
        thumbnail: first.thumbnail,
        totalTasks,
        completedTasks,
        downloadingTasks,
        pausedTasks,
        failedTasks,
        scheduledTasks,
        totalSizeMB,
        downloadedSizeMB,
        aggregateProgress,
        aggregateSpeedMBps: sumSpeedMBps,
        aggregateSpeedFormatted: sumSpeedMBps > 0 ? `${sumSpeedMBps.toFixed(1)} MB/s` : '0 MB/s',
        estimatedSecondsRemaining,
        etaText,
        hasActiveDownloads,
      });
    });

    const standalone = tasks.filter((t) => !groupedTaskIds.has(t.id));

    return { batchGroups: groups, standaloneTasks: standalone };
  }, [tasks, lang]);

  // Collective Progress Summary across all active batch & concurrent tasks in the drawer
  const collectiveQueueSummary = useMemo(() => {
    const totalCount = tasks.length;
    if (totalCount === 0) {
      return {
        totalCount: 0,
        activeCount: 0,
        completedCount: 0,
        pausedCount: 0,
        failedCount: 0,
        scheduledCount: 0,
        totalSizeMB: 0,
        downloadedSizeMB: 0,
        remainingActiveMB: 0,
        totalPercentage: 0,
        combinedSpeedMBps: 0,
        combinedSpeedFormatted: '0.0 MB/s',
        totalEstimatedSeconds: 0,
        etaText: '',
        finishTimeFormatted: '',
        isAllCompleted: false,
      };
    }

    let totalSizeMB = 0;
    let downloadedSizeMB = 0;
    let remainingActiveMB = 0;
    let sumSpeedMBps = 0;
    let progressSum = 0;
    let sumActiveTaskSeconds = 0;

    tasks.forEach((tItem) => {
      const pct = getRealTimeTaskProgress(tItem);
      progressSum += pct;
      const sizeMB =
        typeof tItem.totalBytes === 'number' && tItem.totalBytes > 0
          ? tItem.totalBytes / (1024 * 1024)
          : parseSizeToMB(tItem.size);
      totalSizeMB += sizeMB;
      const itemDownloadedMB =
        tItem.status === 'completed'
          ? sizeMB
          : typeof tItem.downloadedBytes === 'number' &&
            typeof tItem.totalBytes === 'number' &&
            tItem.totalBytes > 0
          ? Math.min(sizeMB * 0.98, tItem.downloadedBytes / (1024 * 1024))
          : sizeMB * (pct / 100);
      downloadedSizeMB += itemDownloadedMB;

      if (tItem.status === 'downloading') {
        const itemRemainingMB = Math.max(0, sizeMB - itemDownloadedMB);
        remainingActiveMB += itemRemainingMB;
        const speedMBps = parseSpeedToMBps(tItem.speed);
        sumSpeedMBps += speedMBps;

        const itemEstSec =
          typeof tItem.estimatedSeconds === 'number' && tItem.estimatedSeconds > 0
            ? tItem.estimatedSeconds
            : calculateEstimatedSecondsRemaining(
                tItem.size,
                pct,
                tItem.speed,
                tItem.downloadedBytes,
                tItem.totalBytes
              );
        sumActiveTaskSeconds += Math.max(1, itemEstSec);
      }
    });

    const completedCount = tasks.filter((tItem) => tItem.status === 'completed').length;
    const rawTotalPercentage =
      totalSizeMB > 0
        ? Math.floor((downloadedSizeMB / totalSizeMB) * 100)
        : Math.floor(progressSum / totalCount);
    const totalPercentage =
      completedCount === totalCount && totalCount > 0
        ? 100
        : Math.min(98, Math.max(0, rawTotalPercentage));
    const dlCount = tasks.filter((tItem) => tItem.status === 'downloading').length;
    const psCount = tasks.filter((tItem) => tItem.status === 'paused').length;
    const flCount = tasks.filter((tItem) => tItem.status === 'failed' || tItem.status === 'error').length;
    const scCount = tasks.filter((tItem) => tItem.status === 'scheduled').length;

    // Combined estimated seconds remaining for all active downloads in the queue
    const bandwidthEstSeconds =
      sumSpeedMBps > 0 && remainingActiveMB > 0
        ? Math.ceil(remainingActiveMB / (sumSpeedMBps / Math.max(1, dlCount)))
        : 0;
    const totalEstimatedSeconds =
      dlCount > 0 ? Math.max(sumActiveTaskSeconds, bandwidthEstSeconds, 1) : 0;

    const formatCombinedDuration = (secs: number): string => {
      const rounded = Math.max(1, Math.ceil(secs));
      const hrs = Math.floor(rounded / 3600);
      const mins = Math.floor((rounded % 3600) / 60);
      const remSecs = rounded % 60;
      if (hrs > 0) {
        return lang === 'ur'
          ? `${hrs} گھنٹے ${mins} منٹ باقی`
          : `${hrs}h ${mins}m ${remSecs}s remaining`;
      }
      if (mins > 0) {
        return lang === 'ur'
          ? `${mins} منٹ ${remSecs} سیکنڈ باقی`
          : `${mins}m ${remSecs}s remaining`;
      }
      return lang === 'ur' ? `${remSecs} سیکنڈ باقی` : `${remSecs}s remaining`;
    };

    let etaText = '';
    let finishTimeFormatted = '';
    if (completedCount === totalCount) {
      etaText = lang === 'ur' ? 'تمام مکمل ✓' : 'All Completed ✓';
    } else if (dlCount === 0 && psCount > 0) {
      etaText = lang === 'ur' ? 'روکا گیا (Paused)' : 'Queue Paused';
    } else if (dlCount === 0 && scCount > 0) {
      etaText = lang === 'ur' ? 'شیڈول شدہ' : 'Scheduled';
    } else if (dlCount === 0 && flCount > 0) {
      etaText = lang === 'ur' ? 'دوبارہ کوشش درکار' : 'Retry Needed';
    } else {
      etaText = formatCombinedDuration(totalEstimatedSeconds);
      try {
        const finishDate = new Date(Date.now() + totalEstimatedSeconds * 1000);
        finishTimeFormatted = finishDate.toLocaleTimeString([], {
          hour: '2-digit',
          minute: '2-digit',
          second: totalEstimatedSeconds < 60 ? '2-digit' : undefined,
        });
      } catch {
        finishTimeFormatted = '';
      }
    }

    return {
      totalCount,
      activeCount: dlCount,
      completedCount,
      pausedCount: psCount,
      failedCount: flCount,
      scheduledCount: scCount,
      totalSizeMB,
      downloadedSizeMB,
      remainingActiveMB,
      totalPercentage,
      combinedSpeedMBps: sumSpeedMBps,
      combinedSpeedFormatted: sumSpeedMBps > 0 ? `${sumSpeedMBps.toFixed(1)} MB/s` : '0.0 MB/s',
      totalEstimatedSeconds,
      etaText,
      finishTimeFormatted,
      isAllCompleted: completedCount === totalCount && totalCount > 0,
    };
  }, [tasks, lang]);

  const renderTaskItem = (task: DownloadTask, isGroupedInBatch: boolean = false, indexSuffix?: number | string, parentId?: string) => {
    const isCompleted = task.status === 'completed';
    const isPaused = task.status === 'paused';
    const isDownloading = task.status === 'downloading';
    const isFailed = task.status === 'failed';
    const isError = task.status === 'error';
    const isScheduled = task.status === 'scheduled';
    const isSelected = selectedTaskIds.has(task.id);

    const realTimeProgress = getRealTimeTaskProgress(task);
    const estimatedSec = calculateEstimatedSecondsRemaining(
      task.size,
      realTimeProgress,
      task.speed,
      task.downloadedBytes,
      task.totalBytes
    );
    const etaText = task.timeRemaining || formatEstimatedTimeRemaining(
      estimatedSec,
      task.status,
      lang
    );
    const downloadedDisplay = calculateDownloadedSize(
      task.size,
      realTimeProgress,
      task.downloadedBytes,
      task.totalBytes,
      fileSizeUnit
    );

    return (
      <div
        key={`task_${parentId ? parentId + '_' : ''}${task.id}_${isGroupedInBatch ? 'batch' : 'single'}_${indexSuffix ?? ''}`}
        className={`bg-white dark:bg-slate-900 rounded-2xl p-3.5 border shadow-sm transition-all flex flex-col gap-2.5 ${
          isSelected
            ? 'border-blue-500 dark:border-sky-400 ring-2 ring-blue-500/25 dark:ring-sky-400/25 bg-blue-50/20 dark:bg-sky-950/20'
            : isGroupedInBatch
            ? 'border-slate-200/80 dark:border-slate-800/80 bg-slate-50/40 dark:bg-slate-900/50'
            : isError
            ? 'border-rose-300 dark:border-rose-900/80 bg-rose-50/20 dark:bg-rose-950/20'
            : isFailed 
            ? 'border-amber-300 dark:border-amber-900/80 bg-amber-50/20 dark:bg-amber-950/20' 
            : isScheduled
            ? 'border-indigo-300 dark:border-indigo-900/80 bg-indigo-50/20 dark:bg-indigo-950/20'
            : 'border-slate-200/80 dark:border-slate-800 hover:border-blue-300 dark:hover:border-blue-500'
        }`}
        id={`download-task-${task.id}`}
      >
        {/* Top info */}
        <div className="flex items-center gap-2.5">
          {/* Individual Selection Toggle Checkbox */}
          <label
            htmlFor={`select-task-checkbox-${task.id}`}
            onClick={(e) => e.stopPropagation()}
            className={`p-1 rounded-lg transition-colors cursor-pointer shrink-0 flex items-center justify-center ${
              isSelected
                ? 'text-blue-600 dark:text-sky-400 bg-blue-50 dark:bg-sky-950/60'
                : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
            title={lang === 'ur' ? 'ٹاسک منتخب کریں' : 'Select task for bulk action'}
          >
            <input
              type="checkbox"
              id={`select-task-checkbox-${task.id}`}
              checked={isSelected}
              onChange={() => toggleSelectTask(task.id)}
              aria-label={`Select ${task.mediaTitle}`}
              className="sr-only"
            />
            {isSelected ? (
              <CheckSquare className="w-4 h-4 stroke-[2.5]" />
            ) : (
              <Square className="w-4 h-4" />
            )}
          </label>

          <img
            src={task.thumbnail}
            alt={task.mediaTitle}
            className="w-12 h-12 rounded-xl object-cover bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shrink-0"
            referrerPolicy="no-referrer"
          />

          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-1">
              <span className="font-bold text-xs text-slate-800 dark:text-slate-100 truncate">
                {task.mediaTitle}
              </span>
              {(isError || isFailed) && (
                <span className="px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-400 border border-rose-500/40 text-[10px] font-black uppercase tracking-wider shrink-0">
                  {lang === 'ur' ? 'ناکام (Failed)' : 'Failed'}
                </span>
              )}
              {isPaused && (
                <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/40 text-[10px] font-black uppercase tracking-wider shrink-0">
                  {lang === 'ur' ? 'رکا ہوا (Paused)' : 'Paused'}
                </span>
              )}
            </div>

            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="text-[10px] font-mono font-extrabold px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950/80 text-blue-600 dark:text-blue-300 shrink-0 uppercase border border-blue-100 dark:border-blue-800">
                {task.format} • {task.quality}
              </span>
              {isGroupedInBatch && (
                <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border border-slate-200/80 dark:border-slate-700">
                  {lang === 'ur' ? 'بیچ فائل' : 'Batch File'}
                </span>
              )}
            </div>

            {task.filename && (
              <div className="flex items-center gap-1 mt-0.5 text-[10px] text-slate-500 dark:text-slate-400 font-mono truncate" title={task.filename}>
                <FileText className="w-2.5 h-2.5 shrink-0 text-slate-400" />
                <span className="truncate">{task.filename}</span>
              </div>
            )}

            {/* Download Size, Speed, and Status */}
            <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 mt-1 font-mono">
              <span className="font-semibold text-slate-700 dark:text-slate-300">
                {isDownloading && downloadedDisplay ? downloadedDisplay : formatDisplayFileSize(task.size, fileSizeUnit)}
              </span>
              {isDownloading && task.speed && (
                <span className="text-blue-600 dark:text-blue-400 font-bold flex items-center gap-1">
                  <Gauge className="w-3 h-3 shrink-0" />
                  {task.speed}
                </span>
              )}
              {isScheduled && (
                <span className="text-indigo-600 dark:text-indigo-400 font-bold flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5" />
                  <span>{task.scheduledCountdown || (lang === 'ur' ? 'شیڈول شدہ' : 'Scheduled')}</span>
                </span>
              )}
              {isCompleted && (
                <span className="text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" /> {t.completed}
                </span>
              )}
              {isPaused && (
                <span className="text-amber-600 dark:text-amber-400 font-bold flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5" /> {t.paused}
                </span>
              )}
              {isFailed && (
                <span className="text-amber-600 dark:text-amber-400 font-bold flex items-center gap-1">
                  <RotateCcw className="w-3.5 h-3.5 animate-spin shrink-0" />
                  <span className="truncate">
                    {task.timeRemaining || `${t.retrying} (${task.retryCount || 0}/${task.maxRetries || 3})`}
                  </span>
                </span>
              )}
              {isError && (
                <span className="text-rose-600 dark:text-rose-400 font-bold flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  <span className="truncate">
                    {task.errorReason || (lang === 'ur' ? '3 کوششوں کے بعد ناکام' : 'Failed after 3 retries')}
                  </span>
                </span>
              )}
            </div>
          </div>

          {/* Radial Progress Indicator Animation */}
          <RadialProgressIndicator
            progress={realTimeProgress}
            status={task.status}
            size={44}
          />
        </div>

        {/* Linear Progress Bar */}
        {!isCompleted && (
          <div className="w-full bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden relative">
            <div
              className={`h-full transition-all duration-300 rounded-full ${
                isScheduled
                  ? 'bg-indigo-600 w-full animate-pulse'
                  : isPaused 
                  ? 'bg-amber-500' 
                  : isError
                  ? 'bg-rose-500'
                  : isFailed 
                  ? 'bg-amber-500' 
                  : 'bg-gradient-to-r from-blue-600 to-indigo-500'
              }`}
              style={{ width: `${isError || isScheduled ? 100 : realTimeProgress}%` }}
            />
          </div>
        )}

        {/* Action Controls & Estimated Time Remaining */}
        <div className="flex items-center justify-between pt-1.5 border-t border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-slate-400 dark:text-slate-500 font-mono font-semibold">
              {isCompleted 
                ? '100% Downloaded' 
                : isScheduled
                ? (task.scheduledFormatted || (lang === 'ur' ? 'شیڈول شدہ' : 'Scheduled'))
                : isError 
                ? (task.errorReason || (lang === 'ur' ? 'خرابی: 3 کوششیں مکمل' : 'Error: 3 Retries Exceeded'))
                : isFailed 
                ? (task.errorReason || `${t.autoRetryAttempt} ${(task.retryCount || 0) + 1}/3`) 
                : `${realTimeProgress}%`}
            </span>

            {/* Estimated Time Remaining Pill or Scheduled Date */}
            {isDownloading && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-blue-50 dark:bg-blue-950/70 border border-blue-100 dark:border-blue-800 text-[10px] font-mono font-bold text-blue-700 dark:text-blue-300">
                <Timer className="w-3 h-3 text-blue-600 dark:text-blue-400 shrink-0" />
                <span>{etaText}</span>
              </span>
            )}

            {isScheduled && task.scheduledCountdown && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-indigo-50 dark:bg-indigo-950/70 border border-indigo-100 dark:border-indigo-800 text-[10px] font-mono font-bold text-indigo-700 dark:text-indigo-300">
                <Clock className="w-3 h-3 text-indigo-600 dark:text-indigo-400 shrink-0" />
                <span>{task.scheduledCountdown}</span>
              </span>
            )}
          </div>

          <div className="flex items-center gap-1.5">
            {isScheduled && (
              <>
                {onTriggerScheduledNow && (
                  <button
                    onClick={() => onTriggerScheduledNow(task.id)}
                    className="px-2.5 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold flex items-center gap-1 cursor-pointer shadow-xs active:scale-95 transition-all"
                    title={lang === 'ur' ? 'ابھی ڈاؤنلوڈ شروع کریں' : 'Start Download Now'}
                    id={`start-scheduled-btn-${task.id}`}
                  >
                    <Play className="w-3 h-3 fill-current" />
                    <span>{lang === 'ur' ? 'ابھی شروع کریں' : 'Start Now'}</span>
                  </button>
                )}
                {onRescheduleTask && (
                  <button
                    onClick={() => onRescheduleTask(task)}
                    className="px-2 py-1 rounded-lg bg-indigo-50 dark:bg-indigo-950/80 hover:bg-indigo-100 dark:hover:bg-indigo-900 text-indigo-700 dark:text-indigo-300 text-xs font-bold flex items-center gap-1 cursor-pointer border border-indigo-200 dark:border-indigo-800 transition-colors shadow-2xs"
                    title={lang === 'ur' ? 'وقت تبدیل کریں' : 'Reschedule'}
                    id={`reschedule-task-btn-${task.id}`}
                  >
                    <Clock className="w-3 h-3" />
                    <span className="hidden xs:inline">{lang === 'ur' ? 'وقت بدلیں' : 'Reschedule'}</span>
                  </button>
                )}
              </>
            )}

            {isDownloading && (
              <>
                {onSimulateFailTask && (
                  <button
                    onClick={() => onSimulateFailTask(task.id)}
                    className="px-2 py-1 rounded-lg bg-amber-50 dark:bg-amber-950/60 hover:bg-amber-100 dark:hover:bg-amber-900/80 text-amber-700 dark:text-amber-300 text-xs font-bold flex items-center gap-1 cursor-pointer transition-colors border border-amber-200/80 dark:border-amber-800/80 shadow-2xs"
                    title={t.simulateErrorDesc}
                    id={`simulate-drop-btn-${task.id}`}
                  >
                    <Zap className="w-3 h-3 text-amber-500 fill-amber-500/30" />
                    <span className="hidden xs:inline">{t.simulateError}</span>
                  </button>
                )}
                <button
                  onClick={() => onPauseTask(task.id)}
                  className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold flex items-center gap-1 cursor-pointer"
                >
                  <Pause className="w-3 h-3" />
                  <span>{t.pause}</span>
                </button>
              </>
            )}

            {isPaused && (
              <button
                onClick={() => onResumeTask(task.id)}
                className="px-2.5 py-1 rounded-lg bg-blue-50 dark:bg-blue-950/80 hover:bg-blue-100 dark:hover:bg-blue-900 text-blue-600 dark:text-blue-300 text-xs font-bold flex items-center gap-1 cursor-pointer"
              >
                <Play className="w-3 h-3 fill-current" />
                <span>{t.resume}</span>
              </button>
            )}

            {(isError || isFailed) && onRetryTask && (
              <>
                <button
                  onClick={() => onRetryTask(task.id)}
                  className="px-2.5 py-1 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold flex items-center gap-1 cursor-pointer shadow-sm shadow-rose-600/30 transition-all"
                  title={t.manualRetry}
                  id={`retry-task-btn-${task.id}`}
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>{lang === 'ur' ? 'دوبارہ کوشش (Retry)' : 'Retry'}</span>
                </button>
                <button
                  onClick={() => {
                    setShareToast(
                      lang === 'ur'
                        ? `فیڈ بیک بھیج دیا گیا: "${task.mediaTitle.slice(0, 28)}..." لنک رپورٹ ہو گیا۔`
                        : `Feedback submitted for "${task.mediaTitle.slice(0, 28)}..."`
                    );
                    setTimeout(() => setShareToast(null), 3500);
                  }}
                  className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold flex items-center gap-1 cursor-pointer border border-slate-200 dark:border-slate-700 transition-colors"
                  title={lang === 'ur' ? 'خراب لنک کی شکایت بھیجیں' : 'Send Feedback on Failed Download'}
                  id={`feedback-task-btn-${task.id}`}
                >
                  <AlertCircle className="w-3 h-3 text-amber-500" />
                  <span>{lang === 'ur' ? 'فیڈ بیک (Feedback)' : 'Feedback'}</span>
                </button>
              </>
            )}

            {isCompleted && (
              <>
                {/* Social Media Share Button */}
                <button
                  onClick={() => handleShareCompletedTask(task)}
                  className={`p-1.5 rounded-lg text-xs font-bold flex items-center gap-1 border transition-all shadow-2xs cursor-pointer ${
                    sharedTaskId === task.id
                      ? 'bg-emerald-600 text-white border-emerald-600'
                      : 'bg-blue-50/80 dark:bg-blue-950/60 hover:bg-blue-100 dark:hover:bg-blue-900/60 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800'
                  }`}
                  title={lang === 'ur' ? 'سوشل میڈیا پر ڈاؤنلوڈ شیئر کریں' : 'Share download to Social Media'}
                  id={`share-completed-task-btn-${task.id}`}
                >
                  {sharedTaskId === task.id ? (
                    <Check className="w-3.5 h-3.5 text-white" />
                  ) : (
                    <Share2 className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                  )}
                  <span className="hidden sm:inline">
                    {sharedTaskId === task.id ? (lang === 'ur' ? 'شیئر ہو گیا' : 'Shared!') : t.share}
                  </span>
                </button>

                {onOpenQrCode && (
                  <button
                    onClick={() => onOpenQrCode(task)}
                    className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-blue-50 dark:hover:bg-blue-950/60 text-slate-700 hover:text-blue-600 dark:text-slate-300 dark:hover:text-blue-400 text-xs font-bold flex items-center gap-1 border border-slate-200 dark:border-slate-700 transition-colors shadow-2xs cursor-pointer"
                    title={t.scanQrCode}
                    id={`qr-drawer-task-btn-${task.id}`}
                  >
                    <QrCode className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">{t.qrCode}</span>
                  </button>
                )}
                {onSaveToDrive && (
                  <button
                    onClick={() => onSaveToDrive(task)}
                    className="p-1.5 rounded-lg bg-amber-50 dark:bg-amber-950/60 hover:bg-amber-100 dark:hover:bg-amber-900/60 text-amber-700 dark:text-amber-300 text-xs font-bold flex items-center gap-1 border border-amber-200 dark:border-amber-800 transition-colors shadow-2xs cursor-pointer"
                    title={t.saveToDrive}
                  >
                    <HardDrive className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">{t.googleDrive}</span>
                  </button>
                )}
                <span className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold text-xs flex items-center gap-1">
                  <Check className="w-3 h-3 text-sky-400" />
                  <span>{lang === 'ur' ? 'گیلری میں محفوظ' : 'Saved in Gallery'}</span>
                </span>
              </>
            )}

            <button
              onClick={() => onCancelTask(task.id)}
              className="p-1 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/60 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 transition-colors cursor-pointer"
              title={t.cancel}
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

      </div>
    );
  };

  const renderBatchSummaryCard = (batch: BatchGroupData, batchIdx: number = 0) => {
    const isCollapsed = !!collapsedBatches[batch.id];
    const isDownloading = batch.downloadingTasks > 0;
    const isAllDone = batch.completedTasks === batch.totalTasks;
    const isPaused = !isDownloading && batch.pausedTasks > 0;

    return (
      <div
        key={`batch-summary-${batch.id}_${batchIdx}`}
        className="bg-white dark:bg-slate-900 rounded-2xl border-2 border-blue-500/30 dark:border-blue-500/40 shadow-md p-4 transition-all duration-200 overflow-hidden relative flex flex-col gap-3"
        id={`batch-summary-card-${batch.id}`}
      >
        {/* Decorative top accent gradient bar */}
        <div className="absolute top-0 right-0 left-0 h-1 bg-gradient-to-r from-blue-600 via-indigo-600 to-emerald-500" />

        {/* Header info */}
        <div className="flex items-start justify-between gap-2.5 pt-0.5">
          <div className="flex items-center gap-2.5 min-w-0">
            <button
              type="button"
              role="checkbox"
              aria-checked={batch.tasks.every((tItem) => selectedTaskIds.has(tItem.id))}
              onClick={() => handleToggleSelectBatch(batch)}
              className={`p-1.5 rounded-xl border transition-colors cursor-pointer shrink-0 ${
                batch.tasks.every((tItem) => selectedTaskIds.has(tItem.id))
                  ? 'bg-blue-50 dark:bg-sky-950/70 border-blue-400 dark:border-sky-400 text-blue-600 dark:text-sky-400'
                  : 'bg-slate-50 dark:bg-slate-800/80 border-slate-200 dark:border-slate-700 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'
              }`}
              title={lang === 'ur' ? 'پورا بیچ منتخب کریں' : 'Select all tasks in batch'}
              id={`select-batch-checkbox-${batch.id}`}
            >
              {batch.tasks.every((tItem) => selectedTaskIds.has(tItem.id)) ? (
                <CheckSquare className="w-4 h-4 stroke-[2.5]" />
              ) : (
                <Square className="w-4 h-4" />
              )}
            </button>

            <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/80 border border-blue-200 dark:border-blue-800 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0 shadow-2xs">
              <Layers className="w-5 h-5" />
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-xs font-black text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                  {t.batchSummaryTitle || (lang === 'ur' ? 'بیچ خلاصہ' : 'Batch Summary')}
                </span>
                {isDownloading && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-blue-100 dark:bg-blue-950/80 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-600 dark:bg-blue-400 animate-ping" />
                    <span>{t.activeBatchBadge || (lang === 'ur' ? 'ایکٹیو بیچ' : 'Active Batch')}</span>
                  </span>
                )}
                {isAllDone && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                    <CheckCircle2 className="w-3 h-3" />
                    <span>{lang === 'ur' ? 'مکمل' : 'Complete'}</span>
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate mt-0.5 font-medium" title={batch.title}>
                {batch.title}
              </p>
            </div>
          </div>

          {/* Aggregate Progress Number badge */}
          <div className="text-right shrink-0">
            <span className="text-xl font-black font-mono tracking-tight text-blue-600 dark:text-blue-400 block">
              {batch.aggregateProgress}%
            </span>
            <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 block">
              {batch.completedTasks}/{batch.totalTasks} {lang === 'ur' ? 'مکمل' : 'done'}
            </span>
          </div>
        </div>

        {/* Aggregate Progress Bar & Per-Task Segmented Strip */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-[11px] font-mono tabular-nums text-slate-500 dark:text-slate-400">
            <span>
              {lang === 'ur'
                ? `مجموعی بیچ پیش رفت: ${batch.completedTasks} از ${batch.totalTasks} مکمل`
                : `Collective Batch Progress · ${batch.completedTasks} of ${batch.totalTasks} completed`}
            </span>
            <span className="font-bold text-blue-600 dark:text-sky-400">
              {batch.aggregateProgress}%
            </span>
          </div>
          <div
            className="w-full bg-slate-100 dark:bg-slate-800 h-2.5 rounded-full overflow-hidden relative shadow-inner"
            role="progressbar"
            aria-valuenow={batch.aggregateProgress}
            aria-valuemin={0}
            aria-valuemax={100}
          >
            <div
              className={`h-full transition-all duration-300 rounded-full ${
                isAllDone
                  ? 'bg-gradient-to-r from-[#2563eb] to-[#38bdf8]'
                  : isPaused
                  ? 'bg-amber-500'
                  : 'bg-gradient-to-r from-blue-600 via-indigo-600 to-sky-400'
              }`}
              style={{ width: `${batch.aggregateProgress}%` }}
            />
          </div>

          {/* Per-Task Concurrent Slice Indicators */}
          {batch.tasks.length > 1 && (
            <div className="grid gap-1 pt-0.5" style={{ gridTemplateColumns: `repeat(${Math.min(batch.tasks.length, 12)}, minmax(0, 1fr))` }}>
              {batch.tasks.slice(0, 12).map((bTask) => {
                const bPct = getRealTimeTaskProgress(bTask);
                return (
                  <div
                    key={`slice_${batch.id}_${bTask.id}`}
                    className="h-1 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden"
                    title={`${bTask.mediaTitle}: ${bPct}%`}
                  >
                    <div
                      className={`h-full transition-all duration-300 ${
                        bTask.status === 'completed'
                          ? 'bg-sky-400'
                          : bTask.status === 'failed' || bTask.status === 'error'
                          ? 'bg-rose-500'
                          : bTask.status === 'paused'
                          ? 'bg-amber-400'
                          : 'bg-blue-500'
                      }`}
                      style={{ width: `${bPct}%` }}
                    />
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Aggregate Metrics Grid: Data Size, Combined Speed, Estimated Time to Completion */}
        <div className="grid grid-cols-3 gap-2 p-2.5 rounded-xl bg-slate-50/80 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 text-[11px]">
          {/* Data Size */}
          <div className="flex flex-col min-w-0">
            <span className="text-[10px] text-slate-400 dark:text-slate-500 font-medium truncate">
              {t.aggregateProgress || (lang === 'ur' ? 'مجموعی سائز' : 'Data Size')}
            </span>
            <span className="font-mono font-bold text-slate-700 dark:text-slate-200 truncate mt-0.5">
              {fileSizeUnit === 'KB'
                ? `${Math.round(batch.downloadedSizeMB * 1024).toLocaleString()} KB / ${Math.round(batch.totalSizeMB * 1024).toLocaleString()} KB`
                : `${
                    batch.downloadedSizeMB >= 1000
                      ? `${(batch.downloadedSizeMB / 1024).toFixed(2)} GB`
                      : `${batch.downloadedSizeMB.toFixed(1)} MB`
                  } / ${
                    batch.totalSizeMB >= 1000
                      ? `${(batch.totalSizeMB / 1024).toFixed(2)} GB`
                      : `${batch.totalSizeMB.toFixed(1)} MB`
                  }`}
            </span>
          </div>

          {/* Combined Speed */}
          <div className="flex flex-col min-w-0">
            <span className="text-[10px] text-slate-400 dark:text-slate-500 font-medium truncate flex items-center gap-1">
              <Gauge className="w-3 h-3 text-blue-500 shrink-0" />
              {t.combinedSpeed || (lang === 'ur' ? 'رفتار' : 'Speed')}
            </span>
            <span className="font-mono font-bold text-blue-600 dark:text-blue-400 truncate mt-0.5">
              {batch.aggregateSpeedFormatted}
            </span>
          </div>

          {/* Estimated Time to Completion */}
          <div className="flex flex-col min-w-0">
            <span className="text-[10px] text-slate-400 dark:text-slate-500 font-medium truncate flex items-center gap-1">
              <Timer className="w-3 h-3 text-indigo-500 shrink-0" />
              {t.estimatedTimeToCompletion || (lang === 'ur' ? 'تخمینہ وقت' : 'ETA')}
            </span>
            <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400 truncate mt-0.5">
              {batch.etaText}
            </span>
          </div>
        </div>

        {/* Batch Controls Bar */}
        <div className="flex items-center justify-between gap-1.5 pt-2 border-t border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-1.5 flex-wrap">
            {/* Pause Batch / Resume Batch */}
            {batch.downloadingTasks > 0 && (
              <button
                onClick={() => {
                  batch.tasks
                    .filter((t) => t.status === 'downloading')
                    .forEach((t) => onPauseTask(t.id));
                }}
                className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold flex items-center gap-1 cursor-pointer transition-colors"
                title={t.pauseBatch || 'Pause Batch'}
                id={`pause-batch-btn-${batch.id}`}
              >
                <Pause className="w-3 h-3" />
                <span>{t.pauseBatch || (lang === 'ur' ? 'بیچ روکیں' : 'Pause All')}</span>
              </button>
            )}

            {batch.pausedTasks > 0 && (
              <button
                onClick={() => {
                  batch.tasks
                    .filter((t) => t.status === 'paused')
                    .forEach((t) => onResumeTask(t.id));
                }}
                className="px-2.5 py-1 rounded-lg bg-blue-50 dark:bg-blue-950/80 hover:bg-blue-100 dark:hover:bg-blue-900 text-blue-600 dark:text-blue-300 text-xs font-bold flex items-center gap-1 cursor-pointer transition-colors"
                title={t.resumeBatch || 'Resume Batch'}
                id={`resume-batch-btn-${batch.id}`}
              >
                <Play className="w-3 h-3 fill-current" />
                <span>{t.resumeBatch || (lang === 'ur' ? 'بیچ چلائیں' : 'Resume All')}</span>
              </button>
            )}

            {/* Completed Files Auto-Saved Indicator (No extra button press required) */}
            {batch.completedTasks > 0 && (
              <span
                className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs font-bold flex items-center gap-1 border border-slate-200 dark:border-slate-700"
              >
                <Check className="w-3 h-3 text-sky-400" />
                <span>{lang === 'ur' ? `گیلری میں محفوظ (${batch.completedTasks})` : `In Gallery (${batch.completedTasks})`}</span>
              </span>
            )}

            {/* Cancel Entire Batch */}
            <button
              onClick={() => {
                if (window.confirm(lang === 'ur' ? 'کیا آپ اس پورے بیچ کو منسوخ کرنا چاہتے ہیں؟' : 'Cancel all files in this batch?')) {
                  batch.tasks.forEach((t) => onCancelTask(t.id));
                }
              }}
              className="p-1 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/60 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 transition-colors cursor-pointer"
              title={t.cancelBatch || 'Cancel Batch'}
              id={`cancel-batch-btn-${batch.id}`}
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>

            {/* Batch Rename Button: Custom prefix or timestamp */}
            <button
              onClick={() => handleOpenBatchRename(batch)}
              className="px-2 py-1 rounded-lg bg-indigo-50 dark:bg-indigo-950/80 hover:bg-indigo-100 dark:hover:bg-indigo-900 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 text-xs font-bold flex items-center gap-1 cursor-pointer transition-colors shadow-2xs"
              title={t.batchRenameDesc || 'Apply custom prefix or timestamp to all files in this batch'}
              id={`batch-rename-btn-${batch.id}`}
            >
              <Edit3 className="w-3 h-3 text-indigo-600 dark:text-indigo-400" />
              <span>{t.renameBatchFiles || (lang === 'ur' ? 'بیچ نام بدلیں' : 'Batch Rename')}</span>
            </button>
          </div>

          {/* Expand / Collapse Individual Files Toggle */}
          <button
            onClick={() => toggleBatchCollapse(batch.id)}
            className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 text-xs font-semibold flex items-center gap-1 cursor-pointer transition-colors ml-auto"
            id={`toggle-batch-expand-${batch.id}`}
          >
            <span>
              {isCollapsed 
                ? `${t.showBatchFiles || (lang === 'ur' ? 'دکھائیں' : 'Show')} (${batch.totalTasks})` 
                : (t.hideBatchFiles || (lang === 'ur' ? 'چھپائیں' : 'Hide'))}
            </span>
            {isCollapsed ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />}
          </button>
        </div>

        {/* When expanded, show the grouped individual files directly beneath the summary */}
        {!isCollapsed && (
          <div className="mt-1 pt-3 border-t border-slate-100 dark:border-slate-800 space-y-2.5">
            <div className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider flex items-center justify-between">
              <span>{lang === 'ur' ? 'بیچ فائلز لسٹ' : 'Batch Items'} ({batch.totalTasks})</span>
            </div>
            {batch.tasks.map((task, taskIdx) => renderTaskItem(task, true, taskIdx, batch.id))}
          </div>
        )}
      </div>
    );
  };

  return (
    <>
      <AnimatePresence>
        {isOpen && (
          <div key="drawer-root-wrapper" className="fixed inset-0 z-50 flex justify-end">
          {/* Backdrop overlay smoothly fading in and out */}
          <motion.div
            key="drawer-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            onClick={onClose}
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs"
          />

          {/* Drawer container smoothly sliding into view from the right */}
          <motion.div 
            key="drawer-panel"
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 280 }}
            className="relative w-full max-w-full sm:max-w-md bg-white dark:bg-slate-900 h-full border-l border-slate-200 dark:border-slate-800 shadow-2xl flex flex-col justify-between transition-colors z-10"
            id="download-manager-drawer"
          >
            {/* Drawer Header */}
        <div className="p-3.5 sm:p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-800/60">
          <div className="flex items-center gap-2.5 sm:gap-3">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-blue-50 dark:bg-blue-950/80 text-blue-600 dark:text-blue-400 flex items-center justify-center border border-blue-200 dark:border-blue-800 shadow-xs shrink-0">
              <Download className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-sm sm:text-base text-slate-900 dark:text-white flex items-center gap-1.5 sm:gap-2">
                <span>{t.downloadManager}</span>
                {activeCount > 0 && (
                  <span className="px-2 py-0.5 rounded-full bg-blue-600 text-white text-[10px] sm:text-[11px] font-black animate-pulse shadow-xs">
                    {activeCount} Active
                  </span>
                )}
                {scheduledCount > 0 && (
                  <span className="px-2 py-0.5 rounded-full bg-indigo-600 text-white text-[10px] sm:text-[11px] font-black shadow-xs flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {scheduledCount} {lang === 'ur' ? 'شیڈول' : 'Scheduled'}
                  </span>
                )}
              </h3>
              <p className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 font-medium flex items-center gap-1.5">
                <span>{tasks.length} {t.itemsCount}</span>
                {downloadSpeedCap !== 'unlimited' && (
                  <span className="px-1.5 py-0.5 rounded-md bg-blue-100 dark:bg-blue-950/90 text-blue-700 dark:text-cyan-300 border border-blue-200 dark:border-cyan-500/30 text-[10px] font-mono font-bold">
                    Cap: {downloadSpeedCap === '0.5' ? '500 KB/s' : `${downloadSpeedCap} MB/s`}
                  </span>
                )}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2">
            {/* Export CSV for Record-Keeping Button in Header */}
            <button
              type="button"
              onClick={handleExportRecords}
              disabled={isExportingCsv}
              className="inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/70 dark:hover:bg-emerald-900/70 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 text-xs font-bold transition-all shadow-xs cursor-pointer min-h-[36px]"
              title={t.exportCsvTitle}
              id="header-export-csv-btn"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <span className="hidden sm:inline">{t.exportCsvBtn}</span>
            </button>

            <button
              onClick={() => setShowSettings(!showSettings)}
              className={`p-2 rounded-xl transition-colors cursor-pointer min-h-[36px] min-w-[36px] flex items-center justify-center border ${
                showSettings 
                  ? 'bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300 border-blue-300 dark:border-blue-700'
                  : 'text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 border-transparent'
              }`}
              title={t.autoClearTitle}
              id="auto-clear-settings-toggle"
            >
              <Settings2 className="w-4 h-4" />
            </button>
            {tasks.some(t => t.status === 'completed') && (
              <button
                onClick={onClearCompleted}
                className="text-xs px-2.5 sm:px-3 py-1.5 rounded-xl bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 font-bold transition-colors shadow-xs cursor-pointer min-h-[32px]"
                title={t.clearHistory}
              >
                {t.clearButton}
              </button>
            )}
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer min-h-[36px] min-w-[36px] flex items-center justify-center"
              title={t.close}
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Settings Panel (Themes, Speed Cap, Auto-Clear & Desktop Notifications) */}
        {showSettings && (
          <div className="p-3.5 bg-blue-50/70 dark:bg-blue-950/40 border-b border-blue-100 dark:border-blue-900/50 animate-fade-in space-y-3">
            {/* Setting: App Themes Collapsible Button & Expandable Selector */}
            {onSelectTheme && (
              <div className="pb-2.5 border-b border-blue-200/60 dark:border-blue-900/60" id="drawer-settings-theme-section">
                <button
                  type="button"
                  onClick={() => setIsDrawerThemesOpen((prev) => !prev)}
                  aria-expanded={isDrawerThemesOpen}
                  id="drawer-themes-toggle-btn"
                  className="w-full py-2 px-2.5 rounded-xl bg-white/80 dark:bg-slate-900/80 border border-blue-200 dark:border-blue-800 flex items-center justify-between gap-2 cursor-pointer hover:border-blue-400 transition-colors"
                >
                  <span className="text-xs font-extrabold text-blue-900 dark:text-blue-200 flex items-center gap-1.5">
                    <Palette className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                    <span>{lang === 'ur' ? 'تھیمز (Themes)' : 'Themes'}</span>
                  </span>
                  <span className="flex items-center gap-1.5 text-[10px] font-mono text-blue-600 dark:text-blue-400 font-bold">
                    <span>
                      {lang === 'ur'
                        ? (APP_THEMES.find((item) => item.id === theme) || APP_THEMES[0]).nameUr
                        : (APP_THEMES.find((item) => item.id === theme) || APP_THEMES[0]).nameEn}
                    </span>
                    {isDrawerThemesOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                  </span>
                </button>
                {isDrawerThemesOpen && (
                  <div className="grid grid-cols-3 gap-1.5 mt-2 animate-fade-in">
                    {APP_THEMES.map((tOption) => {
                      const isSelected = theme === tOption.id;
                      return (
                        <button
                          key={`drawer_theme_${tOption.id}`}
                          type="button"
                          id={`drawer-theme-btn-${tOption.id}`}
                          onClick={() => onSelectTheme(tOption.id)}
                          className={`py-1.5 px-2 rounded-lg text-[10px] font-bold transition-all cursor-pointer flex items-center gap-1.5 border ${
                            isSelected
                              ? 'bg-blue-600 text-white border-blue-400 shadow-xs'
                              : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border-blue-200 dark:border-blue-800 hover:border-blue-400'
                          }`}
                        >
                          <span
                            className="w-2.5 h-2.5 rounded-full border border-white/40 shrink-0"
                            style={{ backgroundColor: tOption.dots[1] }}
                          />
                          <span className="truncate">{lang === 'ur' ? tOption.nameUr.split(' ')[0] : tOption.nameEn.split(' ')[0]}</span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* Setting 0: Download Speed Cap */}
            {onChangeDownloadSpeedCap && (
              <div className="pb-2.5 border-b border-blue-200/60 dark:border-blue-900/60">
                <div className="flex items-center justify-between gap-2 mb-1.5">
                  <label className="text-xs font-extrabold text-blue-900 dark:text-blue-200 flex items-center gap-1.5">
                    <Gauge className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                    <span>{lang === 'ur' ? 'ڈاؤنلوڈ سپیڈ کیپ (بینڈوتھ)' : 'Download Speed Cap'}</span>
                  </label>
                  <span className="text-[10px] font-mono text-blue-600 dark:text-blue-400 font-bold">
                    {downloadSpeedCap === 'unlimited'
                      ? (lang === 'ur' ? 'لامحدود' : 'Unlimited')
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
                      key={`drawer_speed_cap_${item.val}`}
                      type="button"
                      onClick={() => onChangeDownloadSpeedCap(item.val)}
                      className={`py-1.5 px-2 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                        downloadSpeedCap === item.val
                          ? 'bg-blue-600 text-white shadow-xs'
                          : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border border-blue-200 dark:border-blue-800 hover:border-blue-400'
                      }`}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Setting 1: 'Clear Successfully Finished' Toggle & Auto-Clear Configuration Menu */}
            {onChangeAutoClearDuration && (
              <div className="p-2.5 rounded-xl bg-white/70 dark:bg-slate-900/70 border border-blue-200/80 dark:border-blue-800/80 space-y-2.5">
                <div className="flex items-center justify-between gap-2" id="drawer-clear-successfully-finished-row">
                  <div className="flex items-center gap-2">
                    <div
                      className={`w-6 h-6 rounded-lg flex items-center justify-center text-xs ${
                        clearSuccessfullyFinished
                          ? 'bg-emerald-600 text-white shadow-2xs'
                          : 'bg-slate-200 dark:bg-slate-800 text-slate-500'
                      }`}
                    >
                      <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                    </div>
                    <div>
                      <label
                        htmlFor="drawer-clear-successfully-finished-toggle"
                        className="text-xs font-extrabold text-blue-950 dark:text-blue-100 flex items-center gap-1.5 cursor-pointer"
                      >
                        <span>
                          {lang === 'ur'
                            ? 'مکمل شدہ خودکار صاف کریں (Clear Successfully Finished)'
                            : 'Clear Successfully Finished'}
                        </span>
                      </label>
                      <p className="text-[10px] text-slate-500 dark:text-slate-400">
                        {lang === 'ur'
                          ? 'مکمل شدہ آئٹمز کو ڈاؤن لوڈ قطار سے خودکار ہٹائیں اور ہسٹری ٹیب میں محفوظ رکھیں'
                          : 'Automates removal of completed items from download queue while keeping them in History tab'}
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    role="switch"
                    aria-checked={clearSuccessfullyFinished}
                    aria-label="Clear Successfully Finished"
                    id="drawer-clear-successfully-finished-toggle"
                    onClick={() => {
                      const nextState = !clearSuccessfullyFinished;
                      if (onToggleClearSuccessfullyFinished) {
                        onToggleClearSuccessfullyFinished(nextState);
                      } else if (onChangeAutoClearRetentionMode) {
                        onChangeAutoClearRetentionMode(nextState ? 'clear_finished' : 'keep_for_history');
                      }
                    }}
                    className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full p-0.5 transition-colors duration-300 border ${
                      clearSuccessfullyFinished
                        ? 'bg-emerald-600 border-emerald-700'
                        : 'bg-slate-300 dark:bg-slate-700 border-slate-300 dark:border-slate-600'
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-xs transition-transform duration-300 ${
                        clearSuccessfullyFinished
                          ? 'translate-x-5'
                          : 'translate-x-0.5'
                      }`}
                    />
                  </button>
                </div>

                {/* Explicit UI Toggle: 'Clear Successfully Finished' vs 'Keep in Queue & History' */}
                <div
                  className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 pt-1"
                  role="group"
                  aria-label="Task Retention Mode"
                  id="drawer-auto-clear-retention-mode-group"
                >
                  <button
                    type="button"
                    id="drawer-auto-clear-mode-clear-finished"
                    aria-pressed={clearSuccessfullyFinished}
                    onClick={() => {
                      if (onToggleClearSuccessfullyFinished) {
                        onToggleClearSuccessfullyFinished(true);
                      }
                      if (onChangeAutoClearRetentionMode) {
                        onChangeAutoClearRetentionMode('clear_finished');
                      }
                    }}
                    className={`p-2 rounded-xl border text-left rtl:text-right transition-all cursor-pointer flex items-start gap-1.5 ${
                      clearSuccessfullyFinished
                        ? 'bg-emerald-600 text-white border-emerald-500 shadow-xs'
                        : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 border-blue-200 dark:border-blue-800 hover:border-emerald-400'
                    }`}
                  >
                    <Check
                      className={`w-3.5 h-3.5 mt-0.5 shrink-0 ${
                        clearSuccessfullyFinished
                          ? 'text-white'
                          : 'text-slate-400'
                      }`}
                    />
                    <div className="min-w-0 flex-1">
                      <div className="text-[11px] font-bold leading-snug">
                        {lang === 'ur'
                          ? 'مکمل شدہ خودکار صاف کریں (Clear Successfully Finished)'
                          : 'Clear Successfully Finished'}
                      </div>
                      <p
                        className={`text-[9px] mt-0.5 leading-tight ${
                          clearSuccessfullyFinished
                            ? 'text-emerald-100'
                            : 'text-slate-500 dark:text-slate-400'
                        }`}
                      >
                        {lang === 'ur'
                          ? 'قطار سے ہٹائیں، ہسٹری ٹیب میں محفوظ رکھیں'
                          : 'Remove from queue, keep in History tab'}
                      </p>
                    </div>
                  </button>

                  <button
                    type="button"
                    id="drawer-auto-clear-mode-keep-history"
                    aria-pressed={!clearSuccessfullyFinished}
                    onClick={() => {
                      if (onToggleClearSuccessfullyFinished) {
                        onToggleClearSuccessfullyFinished(false);
                      }
                      if (onChangeAutoClearRetentionMode) {
                        onChangeAutoClearRetentionMode('keep_for_history');
                      }
                    }}
                    className={`p-2 rounded-xl border text-left rtl:text-right transition-all cursor-pointer flex items-start gap-1.5 ${
                      !clearSuccessfullyFinished
                        ? 'bg-blue-600 text-white border-blue-500 shadow-xs'
                        : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 border-blue-200 dark:border-blue-800 hover:border-blue-400'
                    }`}
                  >
                    <Check
                      className={`w-3.5 h-3.5 mt-0.5 shrink-0 ${
                        !clearSuccessfullyFinished
                          ? 'text-white'
                          : 'text-slate-400'
                      }`}
                    />
                    <div className="min-w-0 flex-1">
                      <div className="text-[11px] font-bold leading-snug">
                        {lang === 'ur'
                          ? 'قطار اور ہسٹری میں رکھیں (Keep in Queue & History)'
                          : 'Keep in Queue & History'}
                      </div>
                      <p
                        className={`text-[9px] mt-0.5 leading-tight ${
                          !clearSuccessfullyFinished
                            ? 'text-blue-100'
                            : 'text-slate-500 dark:text-slate-400'
                        }`}
                      >
                        {lang === 'ur'
                          ? 'قطار اور ہسٹری دونوں میں محفوظ رکھیں'
                          : 'Keep finished items in queue & History'}
                      </p>
                    </div>
                  </button>
                </div>

                {/* Quick Retention Time Preset Pills */}
                <div className="grid grid-cols-4 gap-1">
                  {(
                    [
                      { val: '5', labelEn: '5m', labelUr: '5 منٹ' },
                      { val: '15', labelEn: '15m', labelUr: '15 منٹ' },
                      { val: '60', labelEn: '1 Hour', labelUr: '1 گھنٹہ' },
                      { val: '360', labelEn: '6 Hours', labelUr: '6 گھنٹے' },
                      { val: '1440', labelEn: '1 Day', labelUr: '1 دن' },
                      { val: '10080', labelEn: '7 Days', labelUr: '7 دن' },
                      { val: '1', labelEn: '1m', labelUr: '1 منٹ' },
                      { val: '30', labelEn: '30m', labelUr: '30 منٹ' },
                    ] as { val: AutoClearDuration; labelEn: string; labelUr: string }[]
                  ).map((preset) => (
                    <button
                      key={`drawer_retention_pill_${preset.val}`}
                      type="button"
                      onClick={() => onChangeAutoClearDuration(preset.val)}
                      className={`py-1 px-1.5 rounded-lg text-[10px] font-bold transition-all cursor-pointer border ${
                        autoClearDuration === preset.val
                          ? 'bg-emerald-600 text-white border-emerald-500 shadow-2xs'
                          : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border-blue-200 dark:border-blue-800 hover:border-emerald-400'
                      }`}
                    >
                      {lang === 'ur' ? preset.labelUr : preset.labelEn}
                    </button>
                  ))}
                </div>

                <select
                  id="auto-clear-select"
                  value={autoClearDuration}
                  onChange={(e) => onChangeAutoClearDuration(e.target.value as AutoClearDuration)}
                  className="w-full text-xs font-semibold p-2 rounded-xl bg-white dark:bg-slate-900 border border-blue-200 dark:border-blue-800 text-slate-800 dark:text-slate-100 cursor-pointer shadow-xs focus:ring-2 focus:ring-blue-500"
                >
                  <option value="never">{t.autoClearOff}</option>
                  <option value="1">{t.autoClear1m}</option>
                  <option value="5">{t.autoClear5m}</option>
                  <option value="15">{t.autoClear15m}</option>
                  <option value="30">{t.autoClear30m}</option>
                  <option value="60">{t.autoClear1h}</option>
                  <option value="360">{lang === 'ur' ? '6 گھنٹے بعد' : 'After 6 hours'}</option>
                  <option value="1440">{t.autoClear24h}</option>
                  <option value="10080">{lang === 'ur' ? '7 دن بعد' : 'After 7 days'}</option>
                </select>
              </div>
            )}

            {/* Setting 2: Desktop Notifications Toggle */}
            {onToggleDesktopNotifications && (
              <div className="pt-2.5 border-t border-blue-200/60 dark:border-blue-900/60">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <div className={`w-6 h-6 rounded-lg flex items-center justify-center text-xs ${
                      desktopNotifications 
                        ? 'bg-blue-600 text-white shadow-2xs' 
                        : 'bg-slate-200 dark:bg-slate-800 text-slate-500'
                    }`}>
                      {desktopNotifications ? <BellRing className="w-3.5 h-3.5" /> : <BellOff className="w-3.5 h-3.5" />}
                    </div>
                    <div>
                      <div className="text-xs font-extrabold text-blue-950 dark:text-blue-100 flex items-center gap-1.5">
                        <span>{t.desktopNotifications}</span>
                        {desktopNotifications && (
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" />
                        )}
                      </div>
                      <p className="text-[10px] text-slate-500 dark:text-slate-400 line-clamp-1">
                        {desktopNotifications ? t.notificationsEnabled : t.notificationsDisabled}
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={onToggleDesktopNotifications}
                    role="switch"
                    aria-checked={desktopNotifications}
                    id="drawer-notifications-toggle-switch"
                    className={`group relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full p-0.5 transition-colors duration-300 ease-in-out border ${
                      desktopNotifications
                        ? 'bg-blue-600 border-blue-700'
                        : 'bg-slate-300 dark:bg-slate-700 border-slate-300 dark:border-slate-600'
                    }`}
                  >
                    <span
                      className={`pointer-events-none flex h-5 w-5 transform items-center justify-center rounded-full bg-white shadow-sm transition-all duration-300 ease-in-out ${
                        desktopNotifications ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    >
                      {desktopNotifications && <Check className="w-3 h-3 text-blue-600 stroke-[3]" />}
                    </span>
                  </button>
                </div>

                {desktopNotifications && onTestNotification && (
                  <div className="mt-2 flex items-center justify-end">
                    <button
                      type="button"
                      onClick={onTestNotification}
                      className="text-[10px] font-bold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      <Bell className="w-2.5 h-2.5" />
                      <span>{t.sendTestNotification}</span>
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Setting 3: Export CSV for Record Keeping */}
            <div className="pt-2.5 border-t border-blue-200/60 dark:border-blue-900/60 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-6 h-6 rounded-lg bg-emerald-600 text-white flex items-center justify-center text-xs shadow-2xs shrink-0">
                  <FileSpreadsheet className="w-3.5 h-3.5" />
                </div>
                <div className="min-w-0">
                  <div className="text-xs font-extrabold text-blue-950 dark:text-blue-100 truncate">
                    {t.exportCsvBtn}
                  </div>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 line-clamp-1">
                    {lang === 'ur' ? 'ٹاسکس اور ہسٹری کو CSV فائل میں محفوظ کریں' : 'Export tasks & history to spreadsheet'}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={handleExportRecords}
                disabled={isExportingCsv}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white text-xs font-extrabold shadow-xs transition-all cursor-pointer shrink-0"
                id="settings-export-csv-btn"
                title={t.exportCsvTitle}
              >
                <FileDown className="w-3.5 h-3.5" />
                <span>{lang === 'ur' ? 'ایکسپورٹ' : 'Export'}</span>
              </button>
            </div>

          </div>
        )}

        {/* Background Keep-Alive status banner */}
        <div className="px-3.5 py-2 bg-indigo-50/70 dark:bg-indigo-950/40 border-b border-indigo-100 dark:border-indigo-900/50 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <div>
              <span className="text-xs font-bold text-slate-800 dark:text-slate-100 flex items-center gap-1.5">
                <span>{lang === 'ur' ? 'بیک گراؤنڈ کیپ الائیو' : 'Background Keep-Alive'}</span>
                {keepAliveActive && (
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse inline-block" />
                )}
              </span>
              <span className="text-[10px] text-slate-500 dark:text-slate-400 block line-clamp-1">
                {scheduledCount > 0
                  ? (lang === 'ur' ? 'شیڈول شدہ ڈاؤنلوڈز کے لیے ویک لاک فعال ہے' : 'Wake Lock active for scheduled downloads')
                  : (lang === 'ur' ? 'اسکرین اور ٹائمرز کو ایکٹیو رکھتا ہے' : 'Prevents browser sleep & throttled timers')}
              </span>
            </div>
          </div>
          {onToggleKeepAlive && (
            <button
              onClick={onToggleKeepAlive}
              className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border transition-colors cursor-pointer ${
                keepAliveActive
                  ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-700'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-500 border-slate-200 dark:border-slate-700'
              }`}
            >
              {keepAliveActive ? (lang === 'ur' ? 'فعال' : 'Active') : (lang === 'ur' ? 'غیر فعال' : 'Inactive')}
            </button>
          )}
        </div>

        {/* Always-Visible 'Clear Successfully Finished' Toggle Bar */}
        <div
          className="px-3.5 py-2 bg-slate-100/80 dark:bg-slate-800/70 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2"
          id="drawer-quick-retention-policy-bar"
        >
          <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-700 dark:text-slate-200">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <span>
              {lang === 'ur'
                ? 'مکمل شدہ خودکار صاف کریں (Clear Successfully Finished):'
                : 'Clear Successfully Finished:'}
            </span>
          </div>

          <div
            className="inline-flex items-center rounded-xl bg-white dark:bg-slate-900 p-0.5 border border-slate-200 dark:border-slate-700 shadow-2xs"
            role="group"
            aria-label="Clear Successfully Finished Toggle"
          >
            <button
              type="button"
              id="quick-toggle-clear-finished-btn"
              aria-pressed={clearSuccessfullyFinished}
              onClick={() => {
                if (onToggleClearSuccessfullyFinished) {
                  onToggleClearSuccessfullyFinished(true);
                }
                if (onChangeAutoClearRetentionMode) {
                  onChangeAutoClearRetentionMode('clear_finished');
                }
              }}
              className={`px-2 py-1 rounded-lg text-[10px] font-bold transition-all cursor-pointer flex items-center gap-1 ${
                clearSuccessfullyFinished
                  ? 'bg-emerald-600 text-white shadow-2xs'
                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <span>
                {lang === 'ur'
                  ? 'فعال — قطار سے ہٹائیں (Clear Successfully Finished)'
                  : 'Clear Successfully Finished'}
              </span>
            </button>

            <button
              type="button"
              id="quick-toggle-keep-history-btn"
              aria-pressed={!clearSuccessfullyFinished}
              onClick={() => {
                if (onToggleClearSuccessfullyFinished) {
                  onToggleClearSuccessfullyFinished(false);
                }
                if (onChangeAutoClearRetentionMode) {
                  onChangeAutoClearRetentionMode('keep_for_history');
                }
              }}
              className={`px-2 py-1 rounded-lg text-[10px] font-bold transition-all cursor-pointer flex items-center gap-1 ${
                !clearSuccessfullyFinished
                  ? 'bg-blue-600 text-white shadow-2xs'
                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <span>
                {lang === 'ur'
                  ? 'قطار میں رکھیں (Keep in Queue)'
                  : 'Keep in Queue'}
              </span>
            </button>
          </div>
        </div>

        {/* Download Queue vs History Tab Switcher */}
        <div
          className="px-3.5 py-2 bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 grid grid-cols-2 gap-2"
          role="tablist"
          aria-label="Download Queue and History Tabs"
          id="drawer-queue-history-tabs"
        >
          <button
            type="button"
            role="tab"
            id="drawer-tab-queue"
            aria-selected={activeDrawerTab === 'queue'}
            onClick={() => setActiveDrawerTab('queue')}
            className={`py-2 px-3 rounded-xl text-xs font-extrabold transition-all cursor-pointer flex items-center justify-center gap-2 border ${
              activeDrawerTab === 'queue'
                ? 'bg-blue-600 text-white border-blue-500 shadow-xs'
                : 'bg-white dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Download className="w-3.5 h-3.5 shrink-0" />
            <span>{lang === 'ur' ? 'ڈاؤن لوڈ قطار (Queue)' : 'Download Queue'}</span>
            <span className="text-[10px] font-mono tabular-nums">({tasks.length})</span>
          </button>

          <button
            type="button"
            role="tab"
            id="drawer-tab-history"
            aria-selected={activeDrawerTab === 'history'}
            onClick={() => setActiveDrawerTab('history')}
            className={`py-2 px-3 rounded-xl text-xs font-extrabold transition-all cursor-pointer flex items-center justify-center gap-2 border ${
              activeDrawerTab === 'history'
                ? 'bg-emerald-600 text-white border-emerald-500 shadow-xs'
                : 'bg-white dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <FolderOpen className="w-3.5 h-3.5 shrink-0" />
            <span>{lang === 'ur' ? 'ہسٹری ٹیب (History)' : 'History'}</span>
            <span className="text-[10px] font-mono tabular-nums">({effectiveHistory.length})</span>
          </button>
        </div>

        {/* Collective Batch & Concurrent Downloads Progress Summary Bar */}
        {tasks.length > 0 && (
          <div
            className="px-4 py-3 bg-slate-900/95 text-slate-100 border-b border-sky-500/25 space-y-2"
            id="drawer-collective-progress-summary"
          >
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <Layers className="w-4 h-4 text-[#38bdf8] shrink-0" />
                <div className="min-w-0">
                  <div className="text-xs font-extrabold text-white truncate">
                    {lang === 'ur'
                      ? `مجموعی ڈاؤنلوڈ پیش رفت (${collectiveQueueSummary.completedCount}/${collectiveQueueSummary.totalCount})`
                      : `Collective Batch Progress (${collectiveQueueSummary.completedCount} of ${collectiveQueueSummary.totalCount})`}
                  </div>
                  <div className="text-[11px] text-slate-400 font-mono tabular-nums flex flex-wrap items-center gap-1.5 mt-0.5">
                    <span>
                      {fileSizeUnit === 'KB'
                        ? `${Math.round(collectiveQueueSummary.downloadedSizeMB * 1024).toLocaleString()} KB / ${Math.round(collectiveQueueSummary.totalSizeMB * 1024).toLocaleString()} KB`
                        : `${
                            collectiveQueueSummary.downloadedSizeMB >= 1000
                              ? `${(collectiveQueueSummary.downloadedSizeMB / 1024).toFixed(2)} GB`
                              : `${collectiveQueueSummary.downloadedSizeMB.toFixed(1)} MB`
                          } / ${
                            collectiveQueueSummary.totalSizeMB >= 1000
                              ? `${(collectiveQueueSummary.totalSizeMB / 1024).toFixed(2)} GB`
                              : `${collectiveQueueSummary.totalSizeMB.toFixed(1)} MB`
                          }`}
                    </span>
                    {collectiveQueueSummary.activeCount > 0 && (
                      <>
                        <span aria-hidden="true">·</span>
                        <span className="text-[#38bdf8] font-semibold">
                          {collectiveQueueSummary.combinedSpeedFormatted}
                        </span>
                      </>
                    )}
                    {collectiveQueueSummary.etaText && (
                      <>
                        <span aria-hidden="true">·</span>
                        <span className="text-sky-200">{collectiveQueueSummary.etaText}</span>
                      </>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={handlePauseAll}
                  disabled={collectiveQueueSummary.activeCount === 0}
                  className="px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/15 disabled:opacity-40 disabled:cursor-not-allowed text-slate-200 text-[11px] font-bold flex items-center gap-1 transition-colors cursor-pointer"
                  id="collective-pause-all-btn"
                  title={lang === 'ur' ? 'تمام جاری ڈاؤنلوڈز روکیں' : 'Pause all active downloads'}
                >
                  <Pause className="w-3 h-3" />
                  <span>
                    {lang === 'ur' ? 'سب روکیں' : 'Pause All'}
                    {collectiveQueueSummary.activeCount > 0 ? ` (${collectiveQueueSummary.activeCount})` : ''}
                  </span>
                </button>
                <button
                  type="button"
                  onClick={handleResumeAll}
                  disabled={collectiveQueueSummary.pausedCount === 0}
                  className="px-2.5 py-1 rounded-lg bg-[#2563eb]/30 hover:bg-[#2563eb]/50 disabled:opacity-40 disabled:cursor-not-allowed border border-[#38bdf8]/40 text-sky-200 text-[11px] font-bold flex items-center gap-1 transition-colors cursor-pointer"
                  id="collective-resume-all-btn"
                  title={lang === 'ur' ? 'تمام رکے ہوئے ڈاؤنلوڈز دوبارہ چلائیں' : 'Resume all paused downloads'}
                >
                  <Play className="w-3 h-3 fill-current" />
                  <span>
                    {lang === 'ur' ? 'سب چلائیں' : 'Resume All'}
                    {collectiveQueueSummary.pausedCount > 0 ? ` (${collectiveQueueSummary.pausedCount})` : ''}
                  </span>
                </button>
                <span
                  className="text-base sm:text-lg font-black font-mono tabular-nums text-[#38bdf8]"
                  id="drawer-collective-percentage-value"
                >
                  {collectiveQueueSummary.totalPercentage}%
                </span>
              </div>
            </div>

            {/* Collective Progress Bar Track */}
            <div
              className="w-full h-2.5 rounded-full bg-slate-950 border border-white/10 overflow-hidden p-[1px]"
              id="drawer-collective-progress-bar"
              role="progressbar"
              aria-valuenow={collectiveQueueSummary.totalPercentage}
              aria-valuemin={0}
              aria-valuemax={100}
            >
              <div
                className="h-full rounded-full transition-all duration-300 ease-out bg-gradient-to-r from-[#2563eb] via-[#38bdf8] to-cyan-300 shadow-[0_0_12px_rgba(56,189,248,0.45)]"
                style={{ width: `${Math.max(3, collectiveQueueSummary.totalPercentage)}%` }}
              />
            </div>

            {/* Dedicated Combined Queue Time Remaining (Total ETA) Banner */}
            <div
              className="flex items-center justify-between gap-2 px-3 py-2 rounded-xl bg-slate-950/80 border border-sky-500/20 text-[11px] font-mono tabular-nums"
              id="drawer-collective-total-eta"
            >
              <div className="flex items-center gap-1.5 text-slate-300 min-w-0">
                <Timer className="w-3.5 h-3.5 text-[#38bdf8] shrink-0" />
                <span className="font-sans font-semibold text-slate-300 truncate">
                  {lang === 'ur'
                    ? 'پوری قطار کا متوقع باقی وقت:'
                    : 'Total Queue Time Remaining:'}
                </span>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <span className="font-bold text-[#38bdf8]" id="drawer-collective-eta-countdown">
                  {collectiveQueueSummary.etaText}
                </span>
                {collectiveQueueSummary.activeCount > 0 && collectiveQueueSummary.finishTimeFormatted && (
                  <>
                    <span aria-hidden="true" className="text-slate-600">·</span>
                    <span className="text-slate-400 text-[10px]">
                      {lang === 'ur'
                        ? `تکمیل ~${collectiveQueueSummary.finishTimeFormatted}`
                        : `Est. finish ~${collectiveQueueSummary.finishTimeFormatted}`}
                    </span>
                  </>
                )}
              </div>
            </div>

            {/* Concurrent Task Status Breakdown Line */}
            <div className="flex items-center justify-between text-[10px] font-mono tabular-nums text-slate-400">
              <div className="flex items-center gap-2">
                <span>
                  {lang === 'ur'
                    ? `${collectiveQueueSummary.activeCount} جاری`
                    : `${collectiveQueueSummary.activeCount} downloading`}
                </span>
                <span aria-hidden="true">·</span>
                <span>
                  {lang === 'ur'
                    ? `${collectiveQueueSummary.completedCount} گیلری میں محفوظ`
                    : `${collectiveQueueSummary.completedCount} saved in gallery`}
                </span>
                {collectiveQueueSummary.pausedCount > 0 && (
                  <>
                    <span aria-hidden="true">·</span>
                    <span className="text-amber-300">
                      {collectiveQueueSummary.pausedCount} {lang === 'ur' ? 'رکے ہوئے' : 'paused'}
                    </span>
                  </>
                )}
                {collectiveQueueSummary.failedCount > 0 && (
                  <>
                    <span aria-hidden="true">·</span>
                    <span className="text-rose-400">
                      {collectiveQueueSummary.failedCount} {lang === 'ur' ? 'ناکام' : 'failed'}
                    </span>
                  </>
                )}
              </div>
              {batchGroups.length > 0 && (
                <span className="text-sky-300">
                  {batchGroups.length} {lang === 'ur' ? 'بیچ گروپس' : batchGroups.length === 1 ? 'batch group' : 'batch groups'}
                </span>
              )}
            </div>
          </div>
        )}

        {/* Persistent Select All Checkbox & Bulk Action Toolbar ('Cancel Selected', 'Retry Selected') */}
        <div
          className="px-3.5 py-2.5 bg-slate-100/90 dark:bg-slate-900/95 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2"
          id="drawer-bulk-selection-bar"
        >
          <div className="flex items-center gap-2 flex-wrap">
            <label
              htmlFor="drawer-select-all-checkbox"
              className={`px-2.5 py-1.5 rounded-lg border text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer select-none ${
                isAllSelected
                  ? 'bg-blue-50 dark:bg-sky-950/70 border-blue-400 dark:border-sky-400 text-blue-700 dark:text-sky-300'
                  : 'bg-white dark:bg-slate-800/90 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:border-blue-400'
              }`}
            >
              <input
                type="checkbox"
                id="drawer-select-all-checkbox"
                checked={isAllSelected}
                onChange={handleToggleSelectAll}
                aria-label="Select All"
                className="w-3.5 h-3.5 rounded accent-blue-600 cursor-pointer"
              />
              <span>
                {lang === 'ur'
                  ? `سب منتخب کریں (Select All${allSelectableIds.length > 0 ? ` • ${allSelectableIds.length}` : ''})`
                  : `Select All${allSelectableIds.length > 0 ? ` (${allSelectableIds.length})` : ''}`}
              </span>
            </label>

            {failedCount + errorCount > 0 && (
              <button
                type="button"
                onClick={handleSelectAllFailed}
                className="px-2 py-1 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-600 dark:text-rose-300 text-[11px] font-bold transition-colors cursor-pointer"
                id="drawer-select-failed-btn"
              >
                {lang === 'ur'
                  ? `ناکام منتخب کریں (${failedCount + errorCount})`
                  : `Select Failed (${failedCount + errorCount})`}
              </button>
            )}

            {selectedTaskIds.size > 0 && (
              <span
                className="text-[11px] font-mono font-bold text-blue-600 dark:text-sky-400"
                id="drawer-selected-count-badge"
              >
                {selectedTaskIds.size} {lang === 'ur' ? 'منتخب' : 'selected'}
              </span>
            )}
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={handleRetrySelected}
              disabled={selectedTaskIds.size === 0}
              className="px-2.5 py-1.5 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 disabled:opacity-40 disabled:cursor-not-allowed border border-amber-500/35 text-amber-700 dark:text-amber-300 text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer"
              id="drawer-retry-selected-btn"
              title={
                lang === 'ur'
                  ? 'منتخب کردہ ٹاسکس یا ہسٹری آئٹمز دوبارہ ڈاؤنلوڈ کریں'
                  : 'Retry or re-download all selected items'
              }
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>
                {lang === 'ur' ? 'Retry Selected (منتخب دوبارہ کوشش)' : 'Retry Selected'}
                {selectedTaskIds.size > 0
                  ? ` (${selectedRetryableCount > 0 ? selectedRetryableCount : selectedTaskIds.size})`
                  : ''}
              </span>
            </button>

            <button
              type="button"
              onClick={handleCancelSelected}
              disabled={selectedTaskIds.size === 0}
              className="px-2.5 py-1.5 rounded-lg bg-rose-500/15 hover:bg-rose-500/25 disabled:opacity-40 disabled:cursor-not-allowed border border-rose-500/35 text-rose-600 dark:text-rose-300 text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer"
              id="drawer-cancel-selected-btn"
              title={
                lang === 'ur'
                  ? 'منتخب کردہ ٹاسکس یا ہسٹری آئٹمز منسوخ/حذف کریں'
                  : 'Cancel and remove all selected queue or history items'
              }
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>
                {lang === 'ur' ? 'Cancel Selected (منتخب منسوخ کریں)' : 'Cancel Selected'}
                {selectedTaskIds.size > 0 ? ` (${selectedTaskIds.size})` : ''}
              </span>
            </button>
          </div>
        </div>

        {/* Task & History List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50/50 dark:bg-slate-950/40">
          {/* Share Notification Banner */}
          {shareToast && (
            <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/80 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 text-xs font-bold flex items-center gap-2 animate-fade-in shadow-xs">
              <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <span className="flex-1">{shareToast}</span>
            </div>
          )}

          {activeDrawerTab === 'queue' ? (
            tasks.length === 0 ? (
              <div
                className="h-64 flex flex-col items-center justify-center text-center p-6 text-slate-400 dark:text-slate-500"
                id="drawer-empty-queue-state"
              >
                <ArrowDownToLine className="w-12 h-12 text-slate-300 dark:text-slate-700 mb-3" />
                <p className="font-bold text-slate-700 dark:text-slate-300">
                  {lang === 'ur' ? 'ڈاؤن لوڈ قطار خالی ہے' : 'Download Queue is Empty'}
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-xs">
                  {clearSuccessfullyFinished && effectiveHistory.length > 0
                    ? lang === 'ur'
                      ? `مکمل شدہ ڈاؤن لوڈز خودکار طور پر قطار سے ہٹا دی گئی ہیں اور ہسٹری ٹیب (${effectiveHistory.length}) میں محفوظ ہیں۔`
                      : `Completed items were automatically removed from the download queue and kept in the History tab (${effectiveHistory.length}).`
                    : lang === 'ur'
                    ? 'کوئی بھی ویڈیو یا آڈیو ڈاؤن لوڈ شروع کریں، اس کی پروگریس یہاں نظر آئے گی۔'
                    : 'Start downloading any video, photo or audio to track live progress here.'}
                </p>
                {effectiveHistory.length > 0 && (
                  <button
                    type="button"
                    id="drawer-view-history-tab-btn"
                    onClick={() => setActiveDrawerTab('history')}
                    className="mt-3 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-extrabold flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
                  >
                    <FolderOpen className="w-3.5 h-3.5" />
                    <span>
                      {lang === 'ur'
                        ? `ہسٹری ٹیب دیکھیں (${effectiveHistory.length})`
                        : `View History Tab (${effectiveHistory.length})`}
                    </span>
                  </button>
                )}
              </div>
            ) : (
              <div className="space-y-4" id="drawer-active-queue-panel">
                {/* Top of Active Downloads List: 'Pause All' / 'Resume All' */}
                <div
                  className="flex flex-col gap-2.5 p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 shadow-2xs"
                  id="active-downloads-top-controls"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2 text-xs font-extrabold text-slate-800 dark:text-slate-100">
                      <span
                        className={`w-2 h-2 rounded-full ${
                          activeCount > 0
                            ? 'bg-blue-500 animate-ping'
                            : pausedCount > 0
                            ? 'bg-amber-400'
                            : 'bg-sky-400'
                        }`}
                      />
                      <span>
                        {lang === 'ur' ? 'فعال ڈاؤنلوڈز کنٹرول' : 'Active Downloads Queue'}
                      </span>
                      <span className="text-[11px] font-mono tabular-nums font-semibold text-slate-500 dark:text-slate-400">
                        ({activeCount} {lang === 'ur' ? 'جاری' : 'active'} · {pausedCount} {lang === 'ur' ? 'رکے ہوئے' : 'paused'})
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={handlePauseAll}
                        disabled={activeCount === 0}
                        className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed text-slate-700 dark:text-slate-200 text-xs font-bold flex items-center gap-1.5 border border-slate-200 dark:border-slate-700 transition-colors cursor-pointer"
                        id="list-top-pause-all-btn"
                      >
                        <Pause className="w-3.5 h-3.5 text-amber-500" />
                        <span>
                          {lang === 'ur' ? 'سب روکیں (Pause All)' : 'Pause All'}
                          {activeCount > 0 ? ` (${activeCount})` : ''}
                        </span>
                      </button>

                      <button
                        type="button"
                        onClick={handleResumeAll}
                        disabled={pausedCount === 0}
                        className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-bold flex items-center gap-1.5 shadow-2xs transition-colors cursor-pointer"
                        id="list-top-resume-all-btn"
                      >
                        <Play className="w-3.5 h-3.5 fill-current" />
                        <span>
                          {lang === 'ur' ? 'سب چلائیں (Resume All)' : 'Resume All'}
                          {pausedCount > 0 ? ` (${pausedCount})` : ''}
                        </span>
                      </button>
                    </div>
                  </div>
                </div>

                {/* Batch Summary Cards */}
                {batchGroups.map((batch, batchIdx) => renderBatchSummaryCard(batch, batchIdx))}

                {/* Standalone or ungrouped downloads */}
                {standaloneTasks.length > 0 && (
                  <div className="space-y-3">
                    {batchGroups.length > 0 && (
                      <div className="pt-1 text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider flex items-center justify-between">
                        <span>{lang === 'ur' ? 'انفرادی ڈاؤنلوڈز' : 'Single Downloads'}</span>
                        <span className="text-[10px] text-slate-500 font-mono">
                          {standaloneTasks.length} {lang === 'ur' ? 'فائلیں' : 'items'}
                        </span>
                      </div>
                    )}
                    {standaloneTasks.map((task, taskIdx) => renderTaskItem(task, false, taskIdx, 'standalone'))}
                  </div>
                )}
              </div>
            )
          ) : effectiveHistory.length === 0 ? (
            <div
              className="h-64 flex flex-col items-center justify-center text-center p-6 text-slate-400 dark:text-slate-500"
              id="drawer-empty-history-state"
            >
              <FolderOpen className="w-12 h-12 text-slate-300 dark:text-slate-700 mb-3" />
              <p className="font-bold text-slate-700 dark:text-slate-300">{t.emptyHistory}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-xs">
                {lang === 'ur'
                  ? 'مکمل ہونے والی تمام ڈاؤن لوڈز یہاں ہسٹری ٹیب میں محفوظ رہتی ہیں۔'
                  : 'All completed downloads are automatically preserved here in the History tab.'}
              </p>
            </div>
          ) : (
            <div className="space-y-2.5 pt-1" id="drawer-history-items-section">
              <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center justify-between">
                <span>
                  {lang === 'ur' ? 'ڈاؤن لوڈ ہسٹری ٹیب (Saved History)' : 'Saved Download History'}
                </span>
                <span className="text-[10px] text-slate-600 dark:text-slate-400 font-mono">
                  {effectiveHistory.length} {lang === 'ur' ? 'ریکارڈز' : 'saved'}
                </span>
              </div>

              {effectiveHistory.map((hItem) => {
                const isHistSelected = selectedTaskIds.has(hItem.id);
                return (
                  <div
                    key={`drawer_hist_${hItem.id}`}
                    className={`bg-white dark:bg-slate-900 rounded-2xl p-3 border shadow-xs transition-all flex items-center justify-between gap-2.5 ${
                      isHistSelected
                        ? 'border-blue-500 dark:border-sky-400 ring-2 ring-blue-500/20 dark:ring-sky-400/20 bg-blue-50/20 dark:bg-sky-950/20'
                        : 'border-slate-200/80 dark:border-slate-800 hover:border-blue-300 dark:hover:border-blue-600'
                    }`}
                    id={`drawer-history-item-${hItem.id}`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0 flex-1">
                      <label
                        htmlFor={`select-history-checkbox-${hItem.id}`}
                        className={`p-1 rounded-lg transition-colors cursor-pointer shrink-0 flex items-center justify-center ${
                          isHistSelected
                            ? 'text-blue-600 dark:text-sky-400 bg-blue-50 dark:bg-sky-950/60'
                            : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
                        }`}
                        title={lang === 'ur' ? 'ہسٹری آئٹم منتخب کریں' : 'Select history item'}
                      >
                        <input
                          type="checkbox"
                          id={`select-history-checkbox-${hItem.id}`}
                          checked={isHistSelected}
                          onChange={() => toggleSelectTask(hItem.id)}
                          aria-label={`Select ${hItem.title}`}
                          className="sr-only"
                        />
                        {isHistSelected ? (
                          <CheckSquare className="w-4 h-4 stroke-[2.5]" />
                        ) : (
                          <Square className="w-4 h-4" />
                        )}
                      </label>

                      <img
                        src={hItem.thumbnail}
                        alt={hItem.title}
                        className="w-10 h-10 rounded-xl object-cover bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shrink-0"
                        referrerPolicy="no-referrer"
                      />

                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-bold text-slate-800 dark:text-slate-100 truncate">
                          {hItem.title}
                        </p>
                        <div className="flex items-center gap-1.5 mt-0.5 text-[10px] font-mono text-slate-500 dark:text-slate-400">
                          <span className="text-emerald-600 dark:text-emerald-400 font-bold uppercase">
                            {hItem.format} · {hItem.quality}
                          </span>
                          {hItem.size && <span>· {formatDisplayFileSize(hItem.size, fileSizeUnit)}</span>}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      {onReDownloadHistory && (
                        <button
                          type="button"
                          onClick={() => onReDownloadHistory(hItem)}
                          className="px-2 py-1 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 text-amber-700 dark:text-amber-300 border border-amber-500/30 text-[11px] font-bold flex items-center gap-1 cursor-pointer transition-colors"
                          title={lang === 'ur' ? 'دوبارہ ڈاؤنلوڈ کریں' : 'Retry / Re-download'}
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                          <span className="hidden sm:inline">
                            {lang === 'ur' ? 'دوبارہ' : 'Retry'}
                          </span>
                        </button>
                      )}
                      {onDeleteHistoryItem && (
                        <button
                          type="button"
                          onClick={() => onDeleteHistoryItem(hItem.id)}
                          className="p-1.5 rounded-lg hover:bg-rose-500/15 text-slate-400 hover:text-rose-500 transition-colors cursor-pointer"
                          title={lang === 'ur' ? 'حذف کریں' : 'Remove item'}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer info, Prominent Retry All Button & CSV Export Action Bar */}
        <div className="p-3.5 sm:p-4 bg-[#181826] border-t border-white/10 space-y-2.5">
          {/* Prominent Retry All Button at the bottom of the Download Queue */}
          {tasks.length > 0 && (
            <button
              type="button"
              onClick={handleRetryAll}
              className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-rose-600 via-pink-600 to-rose-500 hover:from-rose-500 hover:to-pink-500 text-white font-black text-xs sm:text-sm flex items-center justify-center gap-2 shadow-lg shadow-rose-600/30 active:scale-[0.99] transition-all cursor-pointer border border-rose-400/30"
              id="drawer-footer-retry-all-btn"
            >
              <RotateCcw className="w-4 h-4" />
              <span>
                {lang === 'ur'
                  ? `تمام دوبارہ کوشش کریں (Retry All${failedCount + errorCount + pausedCount > 0 ? ` • ${failedCount + errorCount + pausedCount}` : ''})`
                  : `Retry All${failedCount + errorCount + pausedCount > 0 ? ` (${failedCount + errorCount + pausedCount} Paused & Failed)` : ''}`}
              </span>
            </button>
          )}

          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-8 h-8 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 flex items-center justify-center shrink-0">
                <FileSpreadsheet className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <div className="text-xs font-bold text-slate-100 truncate">
                  {lang === 'ur' ? 'ریکارڈ کیپنگ و آڈٹ لاگ' : 'Record Keeping & Audit Trail'}
                </div>
                <div className="text-[10px] text-slate-400 font-medium truncate">
                  {tasks.length} {lang === 'ur' ? 'ٹاسکس' : 'tasks'} + {(history && history.length > 0 ? history : getSavedHistory()).length} {lang === 'ur' ? 'محفوظ ریکارڈز' : 'history'}
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={handleExportRecords}
              disabled={isExportingCsv}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-extrabold text-xs shadow-md shadow-emerald-600/20 transition-all cursor-pointer shrink-0 disabled:opacity-40 disabled:cursor-not-allowed"
              title={t.exportCsvTitle}
              id="drawer-footer-export-csv-btn"
            >
              <FileDown className="w-4 h-4 shrink-0" />
              <span>{t.exportCsvBtn}</span>
            </button>
          </div>
        </div>

          </motion.div>
        </div>
      )}
      </AnimatePresence>

      {/* Batch Rename Modal Dialog */}
      <AnimatePresence>
        {renamingBatch && (
          <div key={`batch-rename-wrapper-${renamingBatch.id}`} className="fixed inset-0 z-60 flex items-center justify-center p-3 sm:p-4 bg-slate-950/75 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="relative w-full max-w-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl sm:rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
            >
              {/* Header */}
              <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-md shadow-indigo-500/25 shrink-0">
                    <Edit3 className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-sm sm:text-base text-slate-900 dark:text-white">
                      {t.batchRenameModalTitle}
                    </h3>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      {renamingBatch.tasks.length} {t.itemsCount} • {renamingBatch.title}
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => setRenamingBatch(null)}
                  className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-lg hover:bg-slate-200/60 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Form Body */}
              <div className="p-4 sm:p-5 space-y-4 overflow-y-auto">
                {/* Prefix Input */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-1.5">
                    <Tag className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                    <span>{t.prefixLabel}</span>
                  </label>
                  <input
                    type="text"
                    value={renamePrefix}
                    onChange={(e) => setRenamePrefix(e.target.value)}
                    placeholder={t.prefixPlaceholder}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50 text-slate-800 dark:text-slate-100 text-xs sm:text-sm font-semibold focus:outline-hidden focus:ring-2 focus:ring-indigo-500 transition-all font-mono"
                  />
                  <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1">
                    {lang === 'ur' ? 'یہ نام ہر فائل کے آغاز پر لگے گا' : 'This prefix will appear at the start of every filename in the batch.'}
                  </p>
                </div>

                {/* Options Checklist */}
                <div className="space-y-2 pt-1">
                  {/* Timestamp Option */}
                  <div
                    onClick={() => setIncludeTimestamp(!includeTimestamp)}
                    className="flex items-center justify-between p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 hover:bg-slate-100/70 dark:hover:bg-slate-800/70 cursor-pointer select-none transition-all"
                  >
                    <div className="flex items-center gap-2.5">
                      <Calendar className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                      <span className="text-xs font-semibold text-slate-700 dark:text-slate-200">
                        {t.addTimestamp}
                      </span>
                    </div>
                    <div className={`w-5 h-5 rounded-md flex items-center justify-center border transition-colors ${
                      includeTimestamp 
                        ? 'bg-indigo-600 border-indigo-600 text-white' 
                        : 'border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900'
                    }`}>
                      {includeTimestamp && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                    </div>
                  </div>

                  {/* Sequential Index Option */}
                  <div
                    onClick={() => setIncludeIndex(!includeIndex)}
                    className="flex items-center justify-between p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 hover:bg-slate-100/70 dark:hover:bg-slate-800/70 cursor-pointer select-none transition-all"
                  >
                    <div className="flex items-center gap-2.5">
                      <Clock className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                      <span className="text-xs font-semibold text-slate-700 dark:text-slate-200">
                        {t.addSequentialNumber}
                      </span>
                    </div>
                    <div className={`w-5 h-5 rounded-md flex items-center justify-center border transition-colors ${
                      includeIndex 
                        ? 'bg-indigo-600 border-indigo-600 text-white' 
                        : 'border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900'
                    }`}>
                      {includeIndex && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                    </div>
                  </div>
                </div>

                {/* Live Preview List */}
                <div className="pt-2">
                  <div className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-2 flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <FileText className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                      <span>{t.previewNewFilenames}</span>
                    </span>
                    <span className="text-[10px] font-mono text-slate-400 font-normal">
                      {renamingBatch.tasks.length} {lang === 'ur' ? 'فائلز' : 'files'}
                    </span>
                  </div>

                  <div className="max-h-40 overflow-y-auto space-y-1.5 p-2 rounded-xl bg-slate-100 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 font-mono text-[11px]">
                    {renamingBatch.tasks.map((task, idx) => (
                      <div
                        key={`${task.id}_rename_${idx}`}
                        className="flex items-center justify-between gap-2 p-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800/60"
                      >
                        <div className="flex items-center gap-1.5 min-w-0">
                          <span className="w-5 h-5 rounded-md bg-indigo-50 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300 flex items-center justify-center text-[10px] font-extrabold shrink-0">
                            {idx + 1}
                          </span>
                          <span className="text-slate-800 dark:text-slate-200 truncate font-semibold">
                            {computePreviewFilename(task, idx, renamingBatch.tasks.length)}
                          </span>
                        </div>
                        <span className="text-[9px] uppercase px-1.5 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-500 font-mono shrink-0">
                          {task.quality || task.format}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="p-4 bg-slate-50 dark:bg-slate-800/60 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setRenamingBatch(null)}
                  className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-bold hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors cursor-pointer"
                >
                  {t.cancel}
                </button>
                <button
                  type="button"
                  onClick={handleApplyBatchRename}
                  className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-extrabold shadow-md shadow-indigo-600/25 transition-all active:scale-95 cursor-pointer flex items-center gap-1.5"
                  id="apply-batch-rename-btn"
                >
                  <Check className="w-4 h-4 stroke-[3]" />
                  <span>{t.applyRename}</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
};

