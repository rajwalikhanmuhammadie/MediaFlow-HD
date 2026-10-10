import React from 'react';
import {
  X,
  HelpCircle,
  Copy,
  Download,
  CheckCircle2,
  Instagram,
  Music2,
  Facebook,
  Twitter,
  Youtube,
  Pin,
  AtSign,
  Flame,
  Camera,
  Briefcase,
  PlaySquare,
  Film,
  Sparkles,
  Layers,
  ClipboardPaste,
} from 'lucide-react';
import { PLATFORMS } from '../data/platforms';
import { Language, PlatformType } from '../types';
import { translations } from '../data/translations';

interface PlatformGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
  lang: Language;
  initialPlatform?: PlatformType;
  onSelectSample: (sampleUrl: string) => void;
}

export const PlatformGuideModal: React.FC<PlatformGuideModalProps> = ({
  isOpen,
  onClose,
  lang,
  onSelectSample,
}) => {
  if (!isOpen) return null;
  const t = translations[lang];

  const renderIcon = (iconName: string, className: string = 'w-4 h-4') => {
    switch (iconName) {
      case 'Instagram':
        return <Instagram className={className} />;
      case 'Music2':
        return <Music2 className={className} />;
      case 'Facebook':
        return <Facebook className={className} />;
      case 'Twitter':
        return <Twitter className={className} />;
      case 'Pin':
        return <Pin className={className} />;
      case 'AtSign':
        return <AtSign className={className} />;
      case 'Flame':
        return <Flame className={className} />;
      case 'Camera':
        return <Camera className={className} />;
      case 'Briefcase':
        return <Briefcase className={className} />;
      case 'PlaySquare':
        return <PlaySquare className={className} />;
      case 'Film':
        return <Film className={className} />;
      default:
        return <Youtube className={className} />;
    }
  };

  const getPlatformIconStyle = (id: PlatformType) => {
    switch (id) {
      case 'instagram':
        return 'bg-gradient-to-tr from-amber-500 via-pink-500 to-purple-600 text-white';
      case 'tiktok':
        return 'bg-slate-900 text-cyan-400 border border-cyan-400/40';
      case 'facebook':
        return 'bg-[#1877F2] text-white';
      case 'youtube':
        return 'bg-red-600 text-white';
      case 'twitter':
        return 'bg-slate-900 text-sky-400 border border-sky-400/40';
      case 'pinterest':
        return 'bg-rose-600 text-white';
      case 'threads':
        return 'bg-slate-800 text-white border border-white/20';
      case 'reddit':
        return 'bg-orange-600 text-white';
      default:
        return 'bg-[#2563eb] text-white';
    }
  };

  const unifiedSteps =
    lang === 'ur'
      ? [
          {
            icon: Copy,
            title: '1. ویڈیو یا پروفائل کا لنک کاپی کریں (Copy Link)',
            desc: 'کسی بھی سوشل میڈیا ایپ (TikTok, Instagram, YouTube, Facebook, X, Pinterest, Threads, Reddit) میں مطلوبہ ویڈیو، ریل، تصویر یا پروفائل کھولیں اور Share بٹن دبا کر Copy Link پر کلک کریں۔',
          },
          {
            icon: ClipboardPaste,
            title: '2. لنک سرچ باکس میں پیسٹ کریں (Paste Link)',
            desc: 'ایپ کے مین صفحہ پر موجود لنک باکس میں کاپی شدہ لنک پیسٹ کریں (یا Paste بٹن دبائیں)۔',
          },
          {
            icon: Download,
            title: '3. ڈاؤن لوڈ دبائیں — سیدھا گیلری میں محفوظ (Download & Auto-Save)',
            desc: 'Download بٹن دباتے ہی تمام دستیاب ریزولوشنز (360p تا 4K MP4 اور 320kbps MP3) آ جائیں گی۔ کسی بھی کوالٹی پر کلک کریں، ڈاؤن لوڈ مکمل ہوتے ہی فائل خودکار طور پر گیلری میں محفوظ ہو جائے گی۔',
          },
        ]
      : [
          {
            icon: Copy,
            title: '1. Copy Video or Profile Link',
            desc: 'Open any supported social media app (TikTok, Instagram, YouTube, Facebook, X, Pinterest, Threads, or Reddit), tap Share on any video/reel/post, and select Copy Link.',
          },
          {
            icon: ClipboardPaste,
            title: '2. Paste Link into the Input Box',
            desc: 'Return to the main page and paste the link into the input bar (or tap the Paste button).',
          },
          {
            icon: Download,
            title: '3. Tap Download — Auto-Saved to Gallery',
            desc: 'Click Download to fetch all available MP4 resolutions (up to 4K) and 320kbps MP3 audio. Once downloaded, files are automatically saved directly into your Gallery.',
          },
        ];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-2.5 sm:p-4 bg-black/75 backdrop-blur-md animate-fade-in"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-xl bg-gradient-to-b from-[#0b0f19] via-[#101829] to-[#162038] border border-sky-400/30 rounded-2xl sm:rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] text-slate-100"
        id="supported-platforms-guide-modal"
      >
        <div className="lens-flare-line w-full" />

        {/* Header */}
        <div className="px-4 py-3.5 border-b border-sky-400/15 bg-[#0b0f19]/90 flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#2563eb] to-[#38bdf8] text-white flex items-center justify-center shadow-[0_0_15px_rgba(56,189,248,0.35)] shrink-0">
              <Layers className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-extrabold text-sm sm:text-base text-white">
                {lang === 'ur'
                  ? 'سپورٹڈ پلیٹ فارمز اور ڈاؤن لوڈ کا طریقہ'
                  : 'Supported Platforms & How to Download'}
              </h3>
              <p className="text-[11px] text-slate-400">
                {lang === 'ur'
                  ? 'تمام پلیٹ فارمز کے لیے ایک ہی آسان طریقہ کار'
                  : 'One universal download method across all supported platforms'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white border border-white/10 flex items-center justify-center transition-colors cursor-pointer shrink-0"
            title={t.close}
            id="close-platforms-guide-btn"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="p-4 sm:p-5 space-y-5 overflow-y-auto">
          {/* 1. Fine Symbolic Platform Icons Grid (باریک علامتی گرڈ) */}
          <div>
            <div className="flex items-center justify-between mb-2.5">
              <span className="text-xs font-extrabold text-sky-300 uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-[#38bdf8]" />
                <span>
                  {lang === 'ur'
                    ? `سپورٹڈ پلیٹ فارمز (${PLATFORMS.length})`
                    : `Supported Platforms (${PLATFORMS.length})`}
                </span>
              </span>
              <span className="text-[10px] text-slate-400">
                {lang === 'ur' ? 'سیمپل ٹیسٹ کے لیے آئیکن دبائیں' : 'Tap any icon to test sample'}
              </span>
            </div>

            <div
              className="grid grid-cols-4 sm:grid-cols-6 gap-2"
              id="symbolic-platforms-fine-grid"
            >
              {PLATFORMS.map((platform, idx) => (
                <button
                  key={`sym_plat_${platform.id}_${idx}`}
                  type="button"
                  onClick={() => {
                    onSelectSample(platform.sampleUrl);
                    onClose();
                  }}
                  className="group flex flex-col items-center justify-center gap-1 p-2 rounded-xl bg-[#0b0f19]/80 hover:bg-[#16223b] border border-white/10 hover:border-[#38bdf8]/50 transition-all cursor-pointer active:scale-95"
                  title={`${platform.name} (${platform.maxResolution})`}
                  id={`symbolic-platform-item-${platform.id}-${idx}`}
                >
                  <div
                    className={`w-7 h-7 rounded-lg flex items-center justify-center shadow-xs ${getPlatformIconStyle(
                      platform.id
                    )} group-hover:scale-105 transition-transform`}
                  >
                    {renderIcon(platform.iconName, 'w-3.5 h-3.5')}
                  </div>
                  <span className="text-[10px] font-bold text-slate-200 group-hover:text-white truncate max-w-full leading-tight">
                    {lang === 'ur' ? platform.nameUrdu : platform.name}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* 2. Single Unified Download Method (سب پلیٹ فارمز کا ایک ہی طریقہ کار) */}
          <div className="space-y-2.5 pt-2 border-t border-sky-400/15">
            <div className="flex items-center gap-2">
              <HelpCircle className="w-4 h-4 text-[#38bdf8] shrink-0" />
              <h4 className="text-xs sm:text-sm font-extrabold text-white">
                {lang === 'ur'
                  ? 'ویڈیو، تصویر یا آڈیو ڈاؤن لوڈ کرنے کا طریقہ (تمام پلیٹ فارمز کے لیے یکساں)'
                  : 'Universal Download Method (Same for All Platforms)'}
              </h4>
            </div>

            <div className="space-y-2.5">
              {unifiedSteps.map((step, idx) => {
                const StepIcon = step.icon;
                return (
                  <div
                    key={`unified_step_${idx}`}
                    className="flex items-start gap-3 p-3.5 rounded-2xl bg-[#0b0f19]/85 border border-sky-400/20"
                  >
                    <div className="w-8 h-8 rounded-xl bg-[#2563eb]/25 border border-[#38bdf8]/40 text-[#38bdf8] flex items-center justify-center shrink-0 mt-0.5">
                      <StepIcon className="w-4 h-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-xs sm:text-sm font-extrabold text-white">
                        {step.title}
                      </div>
                      <p className="text-[11px] sm:text-xs text-slate-300 mt-1 leading-relaxed">
                        {step.desc}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Summary Capabilities Pill Bar */}
          <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/25 flex items-center gap-2 text-xs text-emerald-200 font-semibold">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>
              {lang === 'ur'
                ? 'واٹر مارک کے بغیر فل ایچ ڈی ویڈیو (4K تک)، اصل تصاویر اور 320kbps MP3 آڈیو سپورٹڈ ہے۔'
                : 'Supports watermark-free Full HD/4K MP4 videos, original HD images, and 320kbps MP3 audio.'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
