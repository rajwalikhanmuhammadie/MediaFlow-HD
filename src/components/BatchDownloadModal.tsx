import React, { useState } from 'react';
import { 
  X, 
  Layers, 
  Sparkles, 
  Download, 
  CheckCircle2, 
  AlertCircle,
  Clipboard,
  Trash2,
  Video,
  Music,
  ImageIcon,
  Package,
  ShieldCheck,
  Check
} from 'lucide-react';
import { Language, PlatformType } from '../types';
import { translations } from '../data/translations';
import { detectPlatform, extractUrlsFromText } from '../utils/urlParser';

export type BatchTargetFormat = 'best_video' | 'audio_only' | 'photo_only' | 'all_package';

interface BatchDownloadModalProps {
  isOpen: boolean;
  onClose: () => void;
  lang: Language;
  onProcessBatch: (urls: string[], formatTarget?: BatchTargetFormat, removeWatermark?: boolean) => void;
  removeWatermark?: boolean;
}

export const BatchDownloadModal: React.FC<BatchDownloadModalProps> = ({
  isOpen,
  onClose,
  lang,
  onProcessBatch,
  removeWatermark = true,
}) => {
  const [batchText, setBatchText] = useState('');
  const [targetFormat, setTargetFormat] = useState<BatchTargetFormat>('best_video');
  const [stripWatermark, setStripWatermark] = useState<boolean>(removeWatermark);
  const [copiedNotification, setCopiedNotification] = useState(false);

  if (!isOpen) return null;
  const t = translations[lang];

  // Smart URL extraction: handles URLs separated by newlines, spaces, commas, or embedded in text
  const links: string[] = extractUrlsFromText(batchText);

  // Platform breakdown counts
  const platformCounts: Record<string, number> = {};
  links.forEach(l => {
    const plat = detectPlatform(l) || 'other';
    platformCounts[plat] = (platformCounts[plat] || 0) + 1;
  });

  const handlePasteDemo = (preset: 'mix' | 'reels' | 'tiktok' | 'shorts') => {
    if (preset === 'mix') {
      setBatchText(
        `https://www.tiktok.com/@creative_artist/video/73291823901928391\nhttps://www.instagram.com/reel/C8q7Y2sM3Kp/\nhttps://www.youtube.com/shorts/kJQP7kiw5Fk\nhttps://www.facebook.com/watch/?v=892374619284\nhttps://x.com/tech_trends/status/17892349812903`
      );
    } else if (preset === 'reels') {
      setBatchText(
        `https://www.instagram.com/reel/C8q7Y2sM3Kp/\nhttps://www.instagram.com/p/C9vB8xNM1qp/\nhttps://www.instagram.com/reel/C7b1A9tO8lk/`
      );
    } else if (preset === 'tiktok') {
      setBatchText(
        `https://www.tiktok.com/@creative_artist/video/73291823901928391\nhttps://www.tiktok.com/@viral_dance/video/72918274910283719\nhttps://www.tiktok.com/@music_beats/video/74019284719284719`
      );
    } else {
      setBatchText(
        `https://www.youtube.com/shorts/kJQP7kiw5Fk\nhttps://www.youtube.com/shorts/3JZ_D3ELwOQ\nhttps://www.youtube.com/shorts/9bZkp7q19f0`
      );
    }
  };

  const handlePasteClipboard = async () => {
    try {
      if (navigator.clipboard && navigator.clipboard.readText) {
        const text = await navigator.clipboard.readText();
        if (text) {
          setBatchText(prev => (prev ? prev + '\n' + text : text));
          setCopiedNotification(true);
          setTimeout(() => setCopiedNotification(false), 2000);
        }
      }
    } catch {
      // ignore
    }
  };

  const handleClear = () => {
    setBatchText('');
  };

  const handleStart = () => {
    if (links.length === 0) return;
    onProcessBatch(links, targetFormat, stripWatermark);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/70 backdrop-blur-xs animate-fade-in overflow-y-auto">
      <div className="relative w-full max-w-2xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl sm:rounded-3xl shadow-2xl overflow-hidden flex flex-col transition-colors my-auto max-h-[92vh]">
        
        {/* Header */}
        <div className="p-4 sm:p-5 md:p-6 border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl sm:rounded-2xl bg-blue-600 text-white flex items-center justify-center shadow-md shadow-blue-500/25 shrink-0">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-black text-base sm:text-lg text-slate-900 dark:text-white">
                  {t.batchTitle}
                </h3>
                <span className="px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-950/80 text-blue-700 dark:text-blue-300 font-extrabold text-[10px] uppercase tracking-wider border border-blue-200 dark:border-blue-800">
                  {lang === 'ur' ? 'ملٹی لنک' : 'Multi-Link'}
                </span>
              </div>
              <p className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 font-medium line-clamp-1 sm:line-clamp-none mt-0.5">
                {t.batchDesc}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-xl hover:bg-slate-200/60 dark:hover:bg-slate-800 transition-colors cursor-pointer min-h-[38px] min-w-[38px] flex items-center justify-center"
            title={t.close}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="p-4 sm:p-6 space-y-4 overflow-y-auto">
          
          {/* Quick presets & action bar */}
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-slate-500 dark:text-slate-400 font-bold flex items-center gap-1 text-[11px]">
                <Sparkles className="w-3 h-3 text-amber-500" />
                {lang === 'ur' ? 'سیمپل بیچز:' : 'Sample Batches:'}
              </span>
              <button
                type="button"
                onClick={() => handlePasteDemo('mix')}
                className="px-2.5 py-1 rounded-lg bg-blue-50 dark:bg-blue-950/60 hover:bg-blue-100 dark:hover:bg-blue-900/60 text-blue-700 dark:text-blue-300 font-bold text-[11px] border border-blue-200 dark:border-blue-800 transition-colors cursor-pointer"
              >
                {lang === 'ur' ? 'مکس سوشل' : 'Social Mix (5)'}
              </button>
              <button
                type="button"
                onClick={() => handlePasteDemo('tiktok')}
                className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold text-[11px] border border-slate-200 dark:border-slate-700 transition-colors cursor-pointer"
              >
                TikTok (3)
              </button>
              <button
                type="button"
                onClick={() => handlePasteDemo('reels')}
                className="px-2.5 py-1 rounded-lg bg-rose-50 dark:bg-rose-950/60 hover:bg-rose-100 dark:hover:bg-rose-900/60 text-rose-700 dark:text-rose-300 font-bold text-[11px] border border-rose-200 dark:border-rose-800 transition-colors cursor-pointer"
              >
                Reels (3)
              </button>
              <button
                type="button"
                onClick={() => handlePasteDemo('shorts')}
                className="px-2.5 py-1 rounded-lg bg-red-50 dark:bg-red-950/60 hover:bg-red-100 dark:hover:bg-red-900/60 text-red-700 dark:text-red-300 font-bold text-[11px] border border-red-200 dark:border-red-800 transition-colors cursor-pointer"
              >
                Shorts (3)
              </button>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={handlePasteClipboard}
                className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 font-bold text-[11px] border border-emerald-200 dark:border-emerald-800 transition-colors cursor-pointer"
                title={t.pasteClipboardBatch}
              >
                <Clipboard className="w-3 h-3" />
                <span>{t.pasteClipboardBatch}</span>
              </button>

              {batchText && (
                <button
                  type="button"
                  onClick={handleClear}
                  className="flex items-center gap-1 px-2 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-rose-50 dark:hover:bg-rose-950 text-slate-600 dark:text-slate-400 hover:text-rose-600 font-bold text-[11px] transition-colors cursor-pointer"
                  title={t.clearBatch}
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              )}
            </div>
          </div>

          {/* Textarea for Multi-Link entry */}
          <div className="relative">
            <textarea
              value={batchText}
              onChange={(e) => setBatchText(e.target.value)}
              placeholder={t.batchPlaceholder}
              rows={6}
              className="w-full p-4 bg-slate-50/90 dark:bg-slate-800/80 border-2 border-slate-200 dark:border-slate-700 rounded-2xl text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 text-xs sm:text-sm font-mono focus:outline-none focus:border-blue-600 dark:focus:border-blue-400 focus:bg-white dark:focus:bg-slate-850 transition-all leading-relaxed shadow-inner"
              id="batch-urls-textarea"
              autoFocus
            />

            {/* Counter badge in textarea */}
            <div className="absolute bottom-3 right-3 flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-white/90 dark:bg-slate-900/90 backdrop-blur-xs border border-slate-200 dark:border-slate-700 shadow-xs text-xs font-bold font-mono">
              <span className={links.length > 0 ? 'text-blue-600 dark:text-blue-400' : 'text-slate-400'}>
                {links.length} {lang === 'ur' ? 'لنکس' : 'links'}
              </span>
            </div>
          </div>

          {/* Detected Platform Chips */}
          {links.length > 0 && (
            <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700 flex flex-wrap items-center gap-2 text-xs">
              <span className="font-bold text-slate-700 dark:text-slate-300 text-[11px]">
                {t.detectedPlatforms}:
              </span>
              {Object.entries(platformCounts).map(([plat, count], idx) => (
                <span 
                  key={`plat_chip_${plat}_${idx}`}
                  className="px-2 py-0.5 rounded-md bg-white dark:bg-slate-750 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-650 font-mono font-bold text-[10px] flex items-center gap-1 shadow-2xs uppercase"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                  <span>{plat}</span>
                  <span className="text-blue-600 dark:text-blue-400">({count})</span>
                </span>
              ))}
            </div>
          )}

          {/* Target Download Format Selector */}
          <div className="space-y-2">
            <label className="text-xs font-black text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
              <Package className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
              <span>{t.batchQualityTarget}</span>
            </label>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <div 
                onClick={() => setTargetFormat('best_video')}
                className={`p-3 rounded-xl border-2 flex items-center gap-3 cursor-pointer transition-all ${
                  targetFormat === 'best_video' 
                    ? 'border-blue-600 bg-blue-50/70 dark:bg-blue-950/60 text-blue-900 dark:text-blue-200 shadow-xs' 
                    : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 bg-slate-50/50 dark:bg-slate-800/40 text-slate-700 dark:text-slate-300'
                }`}
              >
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${targetFormat === 'best_video' ? 'bg-blue-600 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'}`}>
                  <Video className="w-4 h-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="font-bold text-xs">{t.batchBestVideo}</div>
                  <div className="text-[10px] text-slate-500 dark:text-slate-400 font-mono">1080p Full HD MP4</div>
                </div>
                {targetFormat === 'best_video' && <Check className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />}
              </div>

              <div 
                onClick={() => setTargetFormat('audio_only')}
                className={`p-3 rounded-xl border-2 flex items-center gap-3 cursor-pointer transition-all ${
                  targetFormat === 'audio_only' 
                    ? 'border-purple-600 bg-purple-50/70 dark:bg-purple-950/60 text-purple-900 dark:text-purple-200 shadow-xs' 
                    : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 bg-slate-50/50 dark:bg-slate-800/40 text-slate-700 dark:text-slate-300'
                }`}
              >
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${targetFormat === 'audio_only' ? 'bg-purple-600 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'}`}>
                  <Music className="w-4 h-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="font-bold text-xs">{t.batchAudioOnly}</div>
                  <div className="text-[10px] text-slate-500 dark:text-slate-400 font-mono">320kbps High-Bitrate MP3</div>
                </div>
                {targetFormat === 'audio_only' && <Check className="w-4 h-4 text-purple-600 dark:text-purple-400 shrink-0" />}
              </div>

              <div 
                onClick={() => setTargetFormat('photo_only')}
                className={`p-3 rounded-xl border-2 flex items-center gap-3 cursor-pointer transition-all ${
                  targetFormat === 'photo_only' 
                    ? 'border-amber-600 bg-amber-50/70 dark:bg-amber-950/60 text-amber-900 dark:text-amber-200 shadow-xs' 
                    : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 bg-slate-50/50 dark:bg-slate-800/40 text-slate-700 dark:text-slate-300'
                }`}
              >
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${targetFormat === 'photo_only' ? 'bg-amber-600 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'}`}>
                  <ImageIcon className="w-4 h-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="font-bold text-xs">{t.batchPhotoOnly}</div>
                  <div className="text-[10px] text-slate-500 dark:text-slate-400 font-mono">Ultra-HD JPG Photos</div>
                </div>
                {targetFormat === 'photo_only' && <Check className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />}
              </div>

              <div 
                onClick={() => setTargetFormat('all_package')}
                className={`p-3 rounded-xl border-2 flex items-center gap-3 cursor-pointer transition-all ${
                  targetFormat === 'all_package' 
                    ? 'border-emerald-600 bg-emerald-50/70 dark:bg-emerald-950/60 text-emerald-900 dark:text-emerald-200 shadow-xs' 
                    : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 bg-slate-50/50 dark:bg-slate-800/40 text-slate-700 dark:text-slate-300'
                }`}
              >
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${targetFormat === 'all_package' ? 'bg-emerald-600 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'}`}>
                  <Package className="w-4 h-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="font-bold text-xs">{t.batchAllPackage}</div>
                  <div className="text-[10px] text-slate-500 dark:text-slate-400 font-mono">Video + Audio + Thumbnail</div>
                </div>
                {targetFormat === 'all_package' && <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />}
              </div>
            </div>
          </div>

          {/* Watermark stripper switch */}
          <div 
            onClick={() => setStripWatermark(!stripWatermark)}
            className="p-3 bg-slate-50 dark:bg-slate-800/70 rounded-xl border border-slate-200 dark:border-slate-700 flex items-center justify-between cursor-pointer select-none"
          >
            <div className="flex items-center gap-2.5">
              <ShieldCheck className={`w-4 h-4 ${stripWatermark ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400'}`} />
              <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                {t.batchAutoWatermark}
              </span>
            </div>
            <div className={`w-8 h-4.5 rounded-full p-0.5 transition-colors relative flex items-center ${stripWatermark ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-600'}`}>
              <div className={`w-3.5 h-3.5 rounded-full bg-white shadow-md transform transition-transform ${stripWatermark ? 'translate-x-3.5' : 'translate-x-0'}`} />
            </div>
          </div>

        </div>

        {/* Footer */}
        <div className="p-4 sm:p-5 bg-slate-50 dark:bg-slate-800/60 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between shrink-0">
          <button
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold shadow-xs cursor-pointer"
          >
            {t.cancel}
          </button>

          <button
            onClick={handleStart}
            disabled={links.length === 0}
            className="flex items-center gap-2 px-6 py-2.5 rounded-full bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 text-white font-black text-xs sm:text-sm shadow-lg shadow-blue-500/25 disabled:opacity-40 disabled:cursor-not-allowed transition-all active:scale-95 cursor-pointer min-h-[42px]"
            id="start-batch-submit-btn"
          >
            <Download className="w-4 h-4" />
            <span>{t.startBatchDownload} ({links.length})</span>
          </button>
        </div>

      </div>
    </div>
  );
};

