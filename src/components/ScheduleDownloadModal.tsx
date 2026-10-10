import React, { useState, useEffect } from 'react';
import { 
  X, 
  Clock, 
  Calendar, 
  Sparkles, 
  CheckCircle2, 
  ShieldCheck, 
  Zap, 
  BellRing,
  Timer,
  Play
} from 'lucide-react';
import { DownloadOption, DownloadTask, Language, PlatformType } from '../types';
import { translations } from '../data/translations';
import { backgroundKeepAlive } from '../utils/backgroundKeepAlive';

interface ScheduleDownloadModalProps {
  isOpen: boolean;
  onClose: () => void;
  lang: Language;
  option?: DownloadOption | null;
  mediaTitle?: string;
  thumbnail?: string;
  platform?: PlatformType;
  existingTask?: DownloadTask | null;
  onConfirmSchedule: (timestamp: number, formatted: string) => void;
}

export const ScheduleDownloadModal: React.FC<ScheduleDownloadModalProps> = ({
  isOpen,
  onClose,
  lang,
  option,
  mediaTitle,
  thumbnail,
  platform,
  existingTask,
  onConfirmSchedule,
}) => {
  const t = translations[lang];

  // Selected relative minutes or 'custom'
  const [selectedPreset, setSelectedPreset] = useState<number | 'custom'>(15);
  const [customDateTime, setCustomDateTime] = useState<string>('');
  const [targetTimestamp, setTargetTimestamp] = useState<number>(Date.now() + 15 * 60 * 1000);
  const [keepAliveEnabled, setKeepAliveEnabled] = useState<boolean>(true);

  // Compute minimum date-time for picker (current local time in ISO YYYY-MM-DDTHH:mm)
  const getMinDateTime = () => {
    const now = new Date();
    now.setMinutes(now.getMinutes() + 1);
    const tzOffset = now.getTimezoneOffset() * 60000;
    const localISOTime = new Date(now.getTime() - tzOffset).toISOString().slice(0, 16);
    return localISOTime;
  };

  // Initialize or update timestamp whenever preset or custom value changes
  useEffect(() => {
    if (!isOpen) return;

    if (existingTask && existingTask.scheduledAt && existingTask.scheduledAt > Date.now()) {
      const diffMins = Math.round((existingTask.scheduledAt - Date.now()) / (60 * 1000));
      if ([5, 15, 30, 60, 180].includes(diffMins)) {
        setSelectedPreset(diffMins);
        setTargetTimestamp(existingTask.scheduledAt);
      } else {
        setSelectedPreset('custom');
        const d = new Date(existingTask.scheduledAt);
        const tzOffset = d.getTimezoneOffset() * 60000;
        setCustomDateTime(new Date(d.getTime() - tzOffset).toISOString().slice(0, 16));
        setTargetTimestamp(existingTask.scheduledAt);
      }
    } else {
      setSelectedPreset(15);
      setTargetTimestamp(Date.now() + 15 * 60 * 1000);
      setCustomDateTime(getMinDateTime());
    }
  }, [isOpen, existingTask]);

  const handleSelectPreset = (minutes: number) => {
    setSelectedPreset(minutes);
    setTargetTimestamp(Date.now() + minutes * 60 * 1000);
  };

  const handleSelectTonight = () => {
    setSelectedPreset('custom');
    const tonight = new Date();
    tonight.setHours(23, 0, 0, 0);
    if (tonight.getTime() <= Date.now()) {
      tonight.setDate(tonight.getDate() + 1);
    }
    const tzOffset = tonight.getTimezoneOffset() * 60000;
    setCustomDateTime(new Date(tonight.getTime() - tzOffset).toISOString().slice(0, 16));
    setTargetTimestamp(tonight.getTime());
  };

  const handleCustomDateTimeChange = (val: string) => {
    setCustomDateTime(val);
    if (val) {
      const parsedTime = new Date(val).getTime();
      if (!isNaN(parsedTime)) {
        setTargetTimestamp(parsedTime);
      }
    }
  };

  if (!isOpen) return null;

  // Format scheduled date and countdown
  const now = Date.now();
  const diffMs = Math.max(0, targetTimestamp - now);
  const diffMinutes = Math.ceil(diffMs / (60 * 1000));
  const diffHours = Math.floor(diffMs / (60 * 60 * 1000));
  const remainingMins = Math.floor((diffMs % (60 * 60 * 1000)) / (60 * 1000));

  const targetDate = new Date(targetTimestamp);
  const timeFormatted = targetDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const dateFormatted = targetDate.toLocaleDateString([], { month: 'short', day: 'numeric' });

  const countdownText = diffHours > 0 
    ? `${diffHours}h ${remainingMins}m`
    : `${diffMinutes} ${lang === 'ur' ? 'منٹ' : 'mins'}`;

  const fullDisplayDate = `${dateFormatted} • ${timeFormatted}`;

  const handleConfirm = () => {
    if (targetTimestamp <= Date.now()) {
      // If time is past or too close, default to 1 min in future
      const adjusted = Date.now() + 60 * 1000;
      onConfirmSchedule(adjusted, fullDisplayDate);
    } else {
      onConfirmSchedule(targetTimestamp, fullDisplayDate);
    }

    if (keepAliveEnabled) {
      backgroundKeepAlive.activate().catch(() => {});
    }

    onClose();
  };

  const displayTitle = existingTask?.mediaTitle || mediaTitle || 'Social Media Media';
  const displayQuality = existingTask ? `${existingTask.format} • ${existingTask.quality}` : (option ? `${option.resolution} • ${option.format}` : 'HD 1080p');
  const displayThumb = existingTask?.thumbnail || thumbnail || '';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-900/60 backdrop-blur-xs animate-fade-in">
      <div 
        className="relative w-full max-w-lg bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col transition-colors"
        id="schedule-download-modal"
      >
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-50 dark:bg-indigo-950/80 text-indigo-600 dark:text-indigo-400 flex items-center justify-center border border-indigo-200 dark:border-indigo-800 shadow-xs">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-base text-slate-900 dark:text-white flex items-center gap-2">
                <span>{existingTask ? (lang === 'ur' ? 'وقت تبدیل کریں' : 'Reschedule Download') : (lang === 'ur' ? 'ڈاؤنلوڈ شیڈول کریں' : 'Schedule Download')}</span>
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                {lang === 'ur' 
                  ? 'مستقبل کا وقت منتخب کریں، ایپ بیک گراؤنڈ میں فعال رہے گی' 
                  : 'Pick a future time to trigger download automatically'}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-xl hover:bg-slate-200/60 dark:hover:bg-slate-800 transition-colors cursor-pointer min-h-[36px] min-w-[36px] flex items-center justify-center"
            title={t.close}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-4 sm:p-6 space-y-4 max-h-[80vh] overflow-y-auto">
          
          {/* Target Item Card */}
          <div className="flex items-center gap-3 p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700">
            {displayThumb ? (
              <img
                src={displayThumb}
                alt={displayTitle}
                className="w-12 h-12 rounded-xl object-cover bg-slate-100 dark:bg-slate-700 shrink-0 border border-slate-200 dark:border-slate-600"
                referrerPolicy="no-referrer"
              />
            ) : (
              <div className="w-12 h-12 rounded-xl bg-indigo-100 dark:bg-indigo-900/60 text-indigo-600 dark:text-indigo-300 flex items-center justify-center shrink-0">
                <Clock className="w-6 h-6" />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <h4 className="font-bold text-xs sm:text-sm text-slate-800 dark:text-slate-100 truncate">
                {displayTitle}
              </h4>
              <span className="inline-block mt-0.5 text-[10px] font-mono font-extrabold px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950/80 text-blue-600 dark:text-blue-300 border border-blue-100 dark:border-blue-800">
                {displayQuality}
              </span>
            </div>
          </div>

          {/* Quick Preset Buttons */}
          <div>
            <label className="block text-xs font-extrabold text-slate-700 dark:text-slate-200 mb-2 uppercase tracking-wider">
              {lang === 'ur' ? 'فوری وقت کے اختیارات:' : 'Quick Presets:'}
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { mins: 5, labelEn: 'In 5 Mins', labelUr: '5 منٹ میں' },
                { mins: 15, labelEn: 'In 15 Mins', labelUr: '15 منٹ میں' },
                { mins: 30, labelEn: 'In 30 Mins', labelUr: '30 منٹ میں' },
                { mins: 60, labelEn: 'In 1 Hour', labelUr: '1 گھنٹے میں' },
                { mins: 180, labelEn: 'In 3 Hours', labelUr: '3 گھنٹوں میں' },
              ].map((p, pIdx) => {
                const isSelected = selectedPreset === p.mins;
                return (
                  <button
                    key={`sched_preset_${p.mins}_${pIdx}`}
                    type="button"
                    onClick={() => handleSelectPreset(p.mins)}
                    className={`py-2 px-2.5 rounded-xl text-xs font-bold transition-all flex flex-col items-center justify-center border cursor-pointer ${
                      isSelected
                        ? 'bg-indigo-600 text-white border-indigo-600 shadow-md shadow-indigo-500/20'
                        : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700 hover:border-indigo-300 dark:hover:border-indigo-600'
                    }`}
                  >
                    <span>{lang === 'ur' ? p.labelUr : p.labelEn}</span>
                  </button>
                );
              })}

              <button
                type="button"
                onClick={handleSelectTonight}
                className={`py-2 px-2.5 rounded-xl text-xs font-bold transition-all flex flex-col items-center justify-center border cursor-pointer ${
                  selectedPreset === 'custom' && customDateTime.includes('23:00')
                    ? 'bg-indigo-600 text-white border-indigo-600 shadow-md shadow-indigo-500/20'
                    : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700 hover:border-indigo-300 dark:hover:border-indigo-600'
                }`}
              >
                <span>{lang === 'ur' ? 'رات 11:00 بجے' : 'Tonight 11 PM'}</span>
              </button>
            </div>
          </div>

          {/* Custom Date & Time Picker */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-extrabold text-slate-700 dark:text-slate-200 uppercase tracking-wider">
                {lang === 'ur' ? 'اپنی مرضی کی تاریخ و وقت:' : 'Or Select Custom Time:'}
              </label>
              <button
                type="button"
                onClick={() => setSelectedPreset('custom')}
                className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
              >
                {lang === 'ur' ? 'حسب ضرورت' : 'Custom'}
              </button>
            </div>
            
            <div className="relative">
              <input
                type="datetime-local"
                value={customDateTime}
                min={getMinDateTime()}
                onChange={(e) => {
                  setSelectedPreset('custom');
                  handleCustomDateTimeChange(e.target.value);
                }}
                className="w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 text-sm font-sans focus:outline-none focus:border-indigo-500 dark:focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 dark:focus:ring-indigo-950 transition-all cursor-pointer"
                id="custom-schedule-datetime-input"
              />
            </div>
          </div>

          {/* Scheduled Summary Badge */}
          <div className="p-3.5 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800/80 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-indigo-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                <Timer className="w-4 h-4" />
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 block">
                  {lang === 'ur' ? 'ڈاؤنلوڈ شروع ہوگا:' : 'Download Triggers:'}
                </span>
                <span className="text-xs sm:text-sm font-black text-indigo-950 dark:text-indigo-100">
                  {fullDisplayDate}
                </span>
              </div>
            </div>

            <span className="px-2.5 py-1 rounded-full bg-indigo-200/80 dark:bg-indigo-900/90 text-indigo-800 dark:text-indigo-200 text-xs font-mono font-bold">
              {lang === 'ur' ? `${countdownText} بعد` : `in ${countdownText}`}
            </span>
          </div>

          {/* Background Keep-Alive Feature Notice */}
          <div className="p-3 rounded-2xl bg-emerald-50/70 dark:bg-emerald-950/40 border border-emerald-200/80 dark:border-emerald-800/80 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <span className="text-xs font-extrabold text-emerald-900 dark:text-emerald-200">
                  {lang === 'ur' ? 'بیک گراؤنڈ اسلیپ پریوینشن فعال' : 'Background Keep-Alive Active'}
                </span>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={keepAliveEnabled}
                  onChange={(e) => setKeepAliveEnabled(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-8 h-4 bg-slate-300 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-3 after:w-3.5 after:transition-all peer-checked:bg-emerald-600"></div>
              </label>
            </div>
            <p className="text-[11px] text-emerald-800/80 dark:text-emerald-300/80 leading-relaxed font-medium">
              {lang === 'ur'
                ? 'ایپ اسکرین ویک لاک اور ان تھروٹل بیک گراؤنڈ ورکر استعمال کرتی ہے تاکہ کمپیوٹر یا موبائل لاک ہونے پر بھی وقت پر ڈاؤنلوڈ شروع ہو سکے۔'
                : 'Engages Screen Wake Lock and unthrottled Web Worker timers so your device stays ready in the background when your schedule arrives.'}
            </p>
          </div>

        </div>

        {/* Footer Actions */}
        <div className="p-4 bg-slate-50 dark:bg-slate-800/60 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-200/60 dark:hover:bg-slate-700 transition-colors cursor-pointer"
          >
            {t.close}
          </button>

          <button
            type="button"
            onClick={handleConfirm}
            className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold flex items-center gap-2 shadow-md shadow-indigo-500/20 hover:shadow-indigo-500/30 transition-all active:scale-95 cursor-pointer"
            id="confirm-schedule-download-btn"
          >
            <Clock className="w-4 h-4" />
            <span>{existingTask ? (lang === 'ur' ? 'اپ ڈیٹ کریں' : 'Update Schedule') : (lang === 'ur' ? 'شیڈول محفوظ کریں' : 'Schedule Download')}</span>
          </button>
        </div>

      </div>
    </div>
  );
};
