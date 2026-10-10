import React, { useState, useEffect, useRef } from 'react';
import { 
  Download, 
  Check, 
  Sparkles, 
  X, 
  ClipboardPaste, 
  ArrowDownToLine, 
  ExternalLink,
  GripHorizontal,
  Bell,
  HardDrive
} from 'lucide-react';
import { DownloadTask, Language } from '../types';
import { translations } from '../data/translations';
import { getRealTimeTaskProgress } from '../utils/urlParser';

interface FloatingDownloadButtonProps {
  lang: Language;
  tasks: DownloadTask[];
  onTriggerQuickDownload: (url: string) => Promise<void> | void;
  onOpenDownloadsDrawer: () => void;
  onRequestNotificationPermission?: () => void;
  hasNotificationPermission?: boolean;
}

export const FloatingDownloadButton: React.FC<FloatingDownloadButtonProps> = ({
  lang,
  tasks,
  onTriggerQuickDownload,
  onOpenDownloadsDrawer,
  onRequestNotificationPermission,
  hasNotificationPermission = false,
}) => {
  const t = translations[lang];
  
  // Storage key for button position
  const STORAGE_KEY = 'social_downloader_floating_btn_pos_v2';

  // Position state (default to bottom-right)
  const [position, setPosition] = useState<{ x: number; y: number }>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) {
          const parsed = JSON.parse(saved);
          if (typeof parsed.x === 'number' && typeof parsed.y === 'number') {
            return parsed;
          }
        }
      } catch {
        // fallback
      }
      return {
        x: Math.max(16, window.innerWidth - 80),
        y: Math.max(80, window.innerHeight - 150),
      };
    }
    return { x: 300, y: 500 };
  });

  const [isOpen, setIsOpen] = useState(false);
  const [quickInput, setQuickInput] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [justFinished, setJustFinished] = useState(false);
  const [clipboardDetected, setClipboardDetected] = useState<string | null>(null);
  const [feedbackToast, setFeedbackToast] = useState<string | null>(null);

  // Dragging logic refs
  const isDraggingRef = useRef(false);
  const dragStartRef = useRef<{ startX: number; startY: number; initX: number; initY: number }>({
    startX: 0,
    startY: 0,
    initX: 0,
    initY: 0,
  });
  const buttonRef = useRef<HTMLDivElement>(null);

  // Active tasks calculation
  const activeTasks = tasks.filter((t) => t.status === 'downloading');
  const completedTasks = tasks.filter((t) => t.status === 'completed');
  const primaryActiveTask = activeTasks[0];

  // Watch for newly completed tasks to trigger visual celebratory flash
  const prevCompletedCountRef = useRef(completedTasks.length);
  useEffect(() => {
    if (completedTasks.length > prevCompletedCountRef.current) {
      setJustFinished(true);
      const timer = setTimeout(() => setJustFinished(false), 4000);
      return () => clearTimeout(timer);
    }
    prevCompletedCountRef.current = completedTasks.length;
  }, [completedTasks.length]);

  // Read clipboard on panel open or focus
  const checkClipboardQuick = async () => {
    try {
      if (navigator.clipboard && navigator.clipboard.readText) {
        const clip = await navigator.clipboard.readText();
        if (
          clip &&
          /(instagram\.com|tiktok\.com|facebook\.com|fb\.watch|twitter\.com|x\.com|pinterest\.com|reddit\.com|youtube\.com|youtu\.be|snapchat\.com|threads\.net)/i.test(clip)
        ) {
          setClipboardDetected(clip.trim());
          return clip.trim();
        }
      }
    } catch {
      // ignore clipboard permission error
    }
    return null;
  };

  useEffect(() => {
    if (isOpen) {
      checkClipboardQuick();
    }
  }, [isOpen]);

  // Save position when changed
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(position));
    } catch {
      // ignore
    }
  }, [position]);

  // Make sure button stays within window bounds upon resize
  useEffect(() => {
    const handleResize = () => {
      setPosition((prev) => {
        const maxX = Math.max(16, window.innerWidth - 72);
        const maxY = Math.max(16, window.innerHeight - 72);
        return {
          x: Math.min(Math.max(16, prev.x), maxX),
          y: Math.min(Math.max(16, prev.y), maxY),
        };
      });
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Pointer / Touch drag events
  const handlePointerDown = (e: React.PointerEvent) => {
    // Only primary button
    if (e.button !== 0) return;
    
    isDraggingRef.current = false;
    dragStartRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      initX: position.x,
      initY: position.y,
    };

    const handlePointerMove = (moveEvent: PointerEvent) => {
      const deltaX = moveEvent.clientX - dragStartRef.current.startX;
      const deltaY = moveEvent.clientY - dragStartRef.current.startY;

      // Only treat as drag if moved more than 6px
      if (Math.hypot(deltaX, deltaY) > 6) {
        isDraggingRef.current = true;
      }

      if (isDraggingRef.current) {
        const maxX = Math.max(16, window.innerWidth - 64);
        const maxY = Math.max(16, window.innerHeight - 64);

        const newX = Math.min(Math.max(12, dragStartRef.current.initX + deltaX), maxX);
        const newY = Math.min(Math.max(12, dragStartRef.current.initY + deltaY), maxY);

        setPosition({ x: newX, y: newY });
      }
    };

    const handlePointerUp = () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
  };

  const handleButtonClick = () => {
    // If was dragging, do not open
    if (isDraggingRef.current) {
      isDraggingRef.current = false;
      return;
    }
    setIsOpen((prev) => !prev);
  };

  const handleExecuteQuickDownload = async (targetUrl: string) => {
    const clean = targetUrl.trim();
    if (!clean) return;
    setIsSubmitting(true);
    try {
      await onTriggerQuickDownload(clean);
      setQuickInput('');
      setFeedbackToast(t.backgroundDownloadStarted);
      setTimeout(() => setFeedbackToast(null), 3000);
      setIsOpen(false);
    } catch {
      setFeedbackToast(lang === 'ur' ? 'خرابی پیش آئی' : 'Failed to start');
      setTimeout(() => setFeedbackToast(null), 3000);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePasteFromClipboardAndDownload = async () => {
    const clip = await checkClipboardQuick();
    if (clip) {
      handleExecuteQuickDownload(clip);
    } else {
      setFeedbackToast(lang === 'ur' ? 'کلپ بورڈ میں کوئی سوشل لنک نہیں ملا' : 'No supported link found in clipboard');
      setTimeout(() => setFeedbackToast(null), 3000);
    }
  };

  // Compute popover placement (align inward if near edge)
  const isNearRight = position.x > (typeof window !== 'undefined' ? window.innerWidth / 2 : 300);
  const isNearBottom = position.y > (typeof window !== 'undefined' ? window.innerHeight / 2 : 400);

  return (
    <>
      {/* Toast popup for feedback */}
      {feedbackToast && (
        <div 
          className="fixed z-50 transition-all duration-300 pointer-events-none"
          style={{
            left: Math.max(16, Math.min(position.x - 100, (typeof window !== 'undefined' ? window.innerWidth : 400) - 260)),
            top: Math.max(20, position.y - 50),
          }}
        >
          <div className="px-4 py-2 rounded-2xl bg-emerald-600 text-white text-xs font-black shadow-xl flex items-center gap-2 animate-fade-in border border-emerald-400/40">
            <Check className="w-4 h-4 text-emerald-200" />
            <span>{feedbackToast}</span>
          </div>
        </div>
      )}

      {/* Floating Action Popover HUD */}
      {isOpen && (
        <div
          className="fixed z-50 w-80 sm:w-96 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl rounded-3xl shadow-2xl border border-slate-200/80 dark:border-slate-800/80 overflow-hidden animate-fade-in text-slate-800 dark:text-slate-100"
          style={{
            left: isNearRight ? undefined : Math.max(12, position.x),
            right: isNearRight ? Math.max(12, (typeof window !== 'undefined' ? window.innerWidth : 800) - position.x - 60) : undefined,
            top: isNearBottom ? undefined : Math.max(12, position.y + 64),
            bottom: isNearBottom ? Math.max(12, (typeof window !== 'undefined' ? window.innerHeight : 600) - position.y + 12) : undefined,
          }}
          id="floating-downloader-hud"
        >
          {/* Header */}
          <div className="p-3.5 sm:p-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center">
                <ArrowDownToLine className="w-4 h-4 text-white animate-bounce-subtle" />
              </div>
              <div>
                <h4 className="text-xs sm:text-sm font-black tracking-tight flex items-center gap-1.5">
                  {t.floatingQuickDownload}
                  <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-white/25 font-bold uppercase">
                    Background
                  </span>
                </h4>
                <p className="text-[10px] text-blue-100 font-medium">
                  {t.floatingKeepAliveNotice}
                </p>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="p-1 rounded-lg hover:bg-white/20 text-white transition-colors cursor-pointer"
              title={t.floatingCloseMini}
              id="close-floating-hud-btn"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="p-4 space-y-3.5">
            {/* Notification Permission Prompt if not enabled */}
            {!hasNotificationPermission && onRequestNotificationPermission && (
              <div className="p-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2 text-amber-800 dark:text-amber-200 font-bold">
                  <Bell className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
                  <span>{lang === 'ur' ? 'نوٹیفیکیشن فعال کریں تاکہ مکمل ہونے پر پتا چلے' : 'Enable notifications for completion alerts'}</span>
                </div>
                <button
                  onClick={onRequestNotificationPermission}
                  className="px-2.5 py-1 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-black text-[11px] cursor-pointer"
                  id="floating-enable-notif-btn"
                >
                  {lang === 'ur' ? 'فعال کریں' : 'Enable'}
                </button>
              </div>
            )}

            {/* Quick Clipboard Download Card if URL found */}
            {clipboardDetected && (
              <div className="p-3 rounded-2xl bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800 flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-black text-blue-800 dark:text-blue-300 flex items-center gap-1.5">
                    <ClipboardPaste className="w-3.5 h-3.5 text-blue-600" />
                    {lang === 'ur' ? 'کلپ بورڈ سے لنک ملا:' : 'Detected in Clipboard:'}
                  </span>
                  <span className="text-[10px] text-blue-500 font-bold uppercase truncate max-w-[120px]">
                    {clipboardDetected.replace(/^https?:\/\/(www\.)?/, '').split('/')[0]}
                  </span>
                </div>
                <p className="text-[11px] text-slate-600 dark:text-slate-300 truncate font-mono bg-white dark:bg-slate-900 px-2 py-1 rounded-lg border border-blue-100 dark:border-blue-900/60">
                  {clipboardDetected}
                </p>
                <button
                  onClick={() => handleExecuteQuickDownload(clipboardDetected)}
                  disabled={isSubmitting}
                  className="w-full py-2 px-3 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-xs font-black shadow-md flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                  id="floating-dl-clipboard-btn"
                >
                  <Sparkles className="w-3.5 h-3.5 text-yellow-300" />
                  <span>{t.floatingDownloadCopied}</span>
                </button>
              </div>
            )}

            {/* Manual Link Input Form */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 block">
                {lang === 'ur' ? 'کوئی بھی ویڈیو یا ریل لنک ڈالیں:' : 'Or paste any video link directly:'}
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="url"
                  placeholder="https://..."
                  value={quickInput}
                  onChange={(e) => setQuickInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handleExecuteQuickDownload(quickInput);
                    }
                  }}
                  className="flex-1 px-3 py-2 text-xs rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  id="floating-quick-input"
                />
                <button
                  onClick={() => handleExecuteQuickDownload(quickInput)}
                  disabled={!quickInput.trim() || isSubmitting}
                  className="px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-sm cursor-pointer disabled:opacity-50 shrink-0"
                  id="floating-quick-submit-btn"
                >
                  {isSubmitting ? '...' : (lang === 'ur' ? 'ڈاؤنلوڈ' : 'Start')}
                </button>
              </div>
            </div>

            {/* Quick paste from clipboard fallback button */}
            {!clipboardDetected && (
              <button
                onClick={handlePasteFromClipboardAndDownload}
                className="w-full py-2 px-3 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-xs flex items-center justify-center gap-1.5 border border-slate-200 dark:border-slate-700 cursor-pointer"
                id="floating-paste-btn"
              >
                <ClipboardPaste className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                <span>{lang === 'ur' ? 'کلپ بورڈ سے فوری ڈاؤنلوڈ کریں' : 'Quick Download from Clipboard'}</span>
              </button>
            )}

            {/* Active Download Preview if running */}
            {primaryActiveTask && (
              <div className="p-3 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 space-y-1.5">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="font-black text-indigo-900 dark:text-indigo-200 truncate max-w-[180px]">
                    {primaryActiveTask.mediaTitle}
                  </span>
                  <span className="font-mono font-black text-indigo-600 dark:text-indigo-400">
                    {getRealTimeTaskProgress(primaryActiveTask)}%
                  </span>
                </div>
                <div className="w-full h-1.5 bg-indigo-200 dark:bg-indigo-900 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-indigo-600 rounded-full transition-all duration-300"
                    style={{ width: `${getRealTimeTaskProgress(primaryActiveTask)}%` }}
                  />
                </div>
                <div className="flex items-center justify-between text-[10px] text-slate-500 dark:text-slate-400">
                  <span>{primaryActiveTask.speed}</span>
                  <span>{primaryActiveTask.timeRemaining}</span>
                </div>
              </div>
            )}

            {/* Bottom Actions Bar */}
            <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px]">
              <div className="flex items-center gap-1.5 text-slate-400 dark:text-slate-500">
                <GripHorizontal className="w-3.5 h-3.5" />
                <span>{t.floatingDragHint}</span>
              </div>
              <button
                onClick={() => {
                  setIsOpen(false);
                  onOpenDownloadsDrawer();
                }}
                className="text-blue-600 dark:text-blue-400 font-black hover:underline flex items-center gap-1 cursor-pointer"
                id="floating-open-drawer-btn"
              >
                <span>{t.downloadManager}</span>
                <ExternalLink className="w-3 h-3" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Draggable Floating Button Widget */}
      <div
        ref={buttonRef}
        onPointerDown={handlePointerDown}
        onClick={handleButtonClick}
        style={{
          left: `${position.x}px`,
          top: `${position.y}px`,
          touchAction: 'none',
        }}
        className={`fixed z-40 select-none cursor-grab active:cursor-grabbing transition-shadow duration-200 ${
          activeTasks.length > 0 ? 'scale-105' : ''
        }`}
        id="draggable-floating-download-btn"
        title={t.floatingWidgetTooltip}
      >
        <div className="relative group">
          {/* Outer Pulsing Aura when downloading */}
          {activeTasks.length > 0 && (
            <div className="absolute -inset-1.5 rounded-full bg-gradient-to-r from-blue-500 to-indigo-600 opacity-75 blur-sm animate-pulse" />
          )}

          {/* Main Button Body */}
          <div
            className={`relative w-14 h-14 sm:w-16 sm:h-16 rounded-full flex flex-col items-center justify-center shadow-2xl border-2 transition-all duration-300 ${
              activeTasks.length > 0
                ? 'bg-gradient-to-tr from-blue-600 via-indigo-600 to-violet-600 border-white/80 dark:border-slate-800 text-white'
                : 'bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-blue-500/30 text-blue-600 dark:text-blue-400 hover:border-blue-500'
            }`}
          >
            {/* SVG Progress Ring if task active */}
            {primaryActiveTask && (
              <svg className="absolute inset-0 w-full h-full -rotate-90 pointer-events-none">
                <circle
                  cx="50%"
                  cy="50%"
                  r="24"
                  className="stroke-white/20"
                  strokeWidth="3.5"
                  fill="none"
                />
                <circle
                  cx="50%"
                  cy="50%"
                  r="24"
                  className="stroke-white transition-all duration-300"
                  strokeWidth="3.5"
                  strokeDasharray="150"
                  strokeDashoffset={150 - (150 * getRealTimeTaskProgress(primaryActiveTask)) / 100}
                  strokeLinecap="round"
                  fill="none"
                />
              </svg>
            )}

            {/* Inner Icon */}
            {justFinished ? (
              <Check className="w-6 h-6 text-white animate-bounce-subtle" />
            ) : activeTasks.length > 0 ? (
              <div className="flex flex-col items-center">
                <ArrowDownToLine className="w-5 h-5 text-white animate-bounce-subtle" />
                <span className="text-[10px] font-black leading-none mt-0.5 font-mono">
                  {getRealTimeTaskProgress(primaryActiveTask)}%
                </span>
              </div>
            ) : (
              <div className="flex flex-col items-center">
                <Download className="w-5 h-5 sm:w-6 sm:h-6" />
                <span className="text-[9px] font-black tracking-tight leading-none mt-0.5 hidden sm:inline">
                  {lang === 'ur' ? 'ڈاؤنلوڈ' : 'DL'}
                </span>
              </div>
            )}

            {/* Active Downloads Counter Badge */}
            {activeTasks.length > 0 && (
              <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-rose-500 text-white font-black text-[10px] flex items-center justify-center border-2 border-white dark:border-slate-900 shadow-md">
                {activeTasks.length}
              </span>
            )}
          </div>
        </div>
      </div>
    </>
  );
};
