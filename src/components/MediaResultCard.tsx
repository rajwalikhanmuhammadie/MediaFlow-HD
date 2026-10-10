import React, { useState, useEffect, useMemo } from 'react';
import { motion } from 'motion/react';
import {
  Play,
  Download,
  Music,
  Video,
  Clock,
  ChevronDown,
  ChevronUp,
  X,
  Image as ImageIcon,
  Check,
  Settings2,
  Globe,
  Layers,
  QrCode,
  HardDrive,
} from 'lucide-react';
import {
  MediaResult,
  DownloadOption,
  DownloadTask,
  Language,
  FileSizeUnit,
} from '../types';
import {
  deriveCreatorProfile,
  formatDisplayFileSize,
  getRememberChoiceState,
  saveRememberChoiceState,
  RememberedFormatPref,
} from '../utils/urlParser';

interface MediaResultCardProps {
  media: MediaResult;
  lang: Language;
  fileSizeUnit?: FileSizeUnit;
  tasks?: DownloadTask[];
  onStartDownload: (option: DownloadOption) => void;
  onBatchDownloadOptions?: (options: DownloadOption[], openDrawer?: boolean) => void;
  onRetryTask?: (taskId: string) => void;
  onPauseTask?: (taskId: string) => void;
  onResumeTask?: (taskId: string) => void;
  onOpenDownloadsDrawer?: () => void;
  onPlayVideo: () => void;
  onOpenExpandablePreview?: (mode?: 'video' | 'image') => void;
  onOpenAICaptions: () => void;
  onOpenGeminiChat?: (context?: {
    videoTitle?: string;
    platform?: string;
    initialPrompt?: string;
  }) => void;
  onSaveToDrive?: (option: DownloadOption) => void;
  onOpenQrCode?: (option?: DownloadOption) => void;
  onScheduleDownload?: (option: DownloadOption) => void;
  onDownloadNewVideo?: () => void;
  onOpenCreatorProfile?: (profile: {
    handle: string;
    authorName: string;
    avatar: string;
    platform: any;
    profileUrl: string;
  }) => void;
}

export const MediaResultCard: React.FC<MediaResultCardProps> = ({
  media,
  lang,
  fileSizeUnit,
  onStartDownload,
  onPlayVideo,
  onSaveToDrive,
  onOpenQrCode,
  onScheduleDownload,
  onDownloadNewVideo,
  onOpenCreatorProfile,
}) => {
  const [showAllFormats, setShowAllFormats] = useState<boolean>(false);
  const [rememberChoice, setRememberChoice] = useState<boolean>(() => {
    return getRememberChoiceState().enabled;
  });
  const [selectedOptionId, setSelectedOptionId] = useState<string | null>(null);

  // Derive creator profile for quick access if needed
  const { profileUrl: creatorProfileUrl, handle: creatorHandle } = deriveCreatorProfile(
    media.originalUrl,
    media.platform,
    media.author,
    media.creatorProfileUrl,
    media.creatorHandle
  );

  // Extract clean source domain (e.g., facebook.com, tiktok.com, youtube.com)
  const sourceDomain = useMemo(() => {
    try {
      const parsed = new URL(media.originalUrl);
      return parsed.hostname.replace(/^www\./i, '');
    } catch {
      const platformDomains: Record<string, string> = {
        facebook: 'facebook.com',
        tiktok: 'tiktok.com',
        instagram: 'instagram.com',
        youtube: 'youtube.com',
        twitter: 'x.com',
        pinterest: 'pinterest.com',
        threads: 'threads.net',
        reddit: 'reddit.com',
        snapchat: 'snapchat.com',
        linkedin: 'linkedin.com',
        vimeo: 'vimeo.com',
        dailymotion: 'dailymotion.com',
      };
      return platformDomains[media.platform] || `${media.platform}.com`;
    }
  }, [media.originalUrl, media.platform]);

  // Separate all dynamically extracted options into Music (Audio) and Video / Image sections
  const { audioOptions, videoOptions, imageOptions, allOptions } = useMemo(() => {
    const rawOptions = Array.isArray(media.downloadOptions) ? media.downloadOptions : [];

    // Audio options: Ensure at least "Fast" (128K MP3) and "Classic MP3" (320K MP3) exist alongside any extracted streams
    const extractedAudios = rawOptions.filter((o) => o.type === 'audio');
    const finalAudios: DownloadOption[] = [...extractedAudios];

    if (finalAudios.length === 0) {
      finalAudios.push(
        {
          id: 'synth_audio_fast_128',
          label: 'Fast MP3',
          resolution: '128K',
          format: 'MP3',
          size: '2.1 MB',
          quality: 'Fast (128K)',
          url: `/api/download?url=${encodeURIComponent(media.originalUrl)}&format=mp3`,
          type: 'audio',
        },
        {
          id: 'synth_audio_classic_320',
          label: 'Classic MP3',
          resolution: '320K',
          format: 'MP3',
          size: '4.6 MB',
          quality: 'Classic MP3 (320K)',
          url: `/api/download?url=${encodeURIComponent(media.originalUrl)}&format=mp3`,
          type: 'audio',
        }
      );
    } else if (finalAudios.length === 1) {
      const firstAudio = finalAudios[0];
      finalAudios.unshift({
        id: `${firstAudio.id}_fast_mp3`,
        label: 'Fast',
        resolution: '128K',
        format: 'MP3',
        size: '1.9 MB',
        quality: 'Fast',
        url: firstAudio.url,
        type: 'audio',
      });
    }

    const extractedVideos = rawOptions.filter((o) => o.type === 'video');
    const extractedImages = rawOptions.filter((o) => o.type === 'image');

    return {
      audioOptions: finalAudios,
      videoOptions: extractedVideos,
      imageOptions: extractedImages,
      allOptions: [...finalAudios, ...extractedVideos, ...extractedImages],
    };
  }, [media.downloadOptions, media.originalUrl]);

  // Primary compact video resolutions shown before clicking "More formats / All"
  const primaryVideoOptions = useMemo(() => {
    if (videoOptions.length <= 4) return videoOptions;
    // Pick up to 4 balanced primary options (e.g., 360p, 480p, 720p, 1080p) so mobile 2-col and laptop 4-col grids are balanced
    const picked: DownloadOption[] = [];
    const usedIds = new Set<string>();

    const findByRes = (patterns: RegExp[]) => {
      for (const pat of patterns) {
        const match = videoOptions.find(
          (o) =>
            !usedIds.has(o.id) &&
            (pat.test(o.resolution || '') || pat.test(o.quality || '') || pat.test(o.label || ''))
        );
        if (match) {
          usedIds.add(match.id);
          picked.push(match);
          return;
        }
      }
    };

    findByRes([/360p/i]);
    findByRes([/480p/i]);
    findByRes([/720p/i]);
    findByRes([/1080p/i, /2160p/i, /4k/i]);

    // Fill up to 4 if needed
    for (const v of videoOptions) {
      if (picked.length >= 4) break;
      if (!usedIds.has(v.id)) {
        usedIds.add(v.id);
        picked.push(v);
      }
    }

    return picked;
  }, [videoOptions]);

  const primaryAudioOptions = useMemo(() => {
    return showAllFormats ? audioOptions : audioOptions.slice(0, 2);
  }, [audioOptions, showAllFormats]);

  const displayedVideoOptions = useMemo(() => {
    return showAllFormats ? videoOptions : primaryVideoOptions;
  }, [videoOptions, primaryVideoOptions, showAllFormats]);

  // Friendly display label for Music & Video options matching the specification
  const getOptionFriendlyTitle = (opt: DownloadOption, idx: number): string => {
    if (opt.type === 'audio') {
      const q = `${opt.quality || ''} ${opt.resolution || ''} ${opt.label || ''}`.toLowerCase();
      if (q.includes('128') || q.includes('fast') || (idx === 0 && audioOptions.length > 1)) {
        return `Fast (${opt.format || 'MP3'})`;
      }
      if (q.includes('320') || q.includes('classic')) {
        return `Classic MP3 (${opt.resolution || '320K'})`;
      }
      return opt.quality || opt.label || `Audio (${opt.format})`;
    }

    if (opt.type === 'image') {
      return opt.quality || opt.resolution || 'Original Photo (JPG)';
    }

    const res = (opt.resolution || opt.quality || '').trim();
    if (/^480p$/i.test(res)) return 'Fast (480p)';
    if (/^360p$/i.test(res)) return 'Data Saver (360p)';
    if (/^240p$/i.test(res)) return 'Low Data (240p)';
    if (/^144p$/i.test(res)) return 'Ultra Light (144p)';
    if (/^720p$/i.test(res)) return 'High quality (720p)';
    if (/^1080p$/i.test(res)) return 'Full HD (1080p)';
    if (/1440p|2k/i.test(res)) return '2K QHD (1440p)';
    if (/2160p|4k/i.test(res)) return '4K Ultra HD (2160p)';
    if (/4320p|8k/i.test(res)) return '8K Master (4320p)';
    return opt.quality && opt.quality !== res ? `${opt.quality} (${res})` : res || opt.label;
  };

  // Pre-select option based on "Remember my choice" localStorage state
  useEffect(() => {
    const savedState = getRememberChoiceState();
    setRememberChoice(savedState.enabled);

    if (savedState.enabled && savedState.pref && allOptions.length > 0) {
      const { pref } = savedState;
      // 1. Exact option ID match
      let matched = allOptions.find((o) => o.id === pref.optionId);
      // 2. Match by type + resolution
      if (!matched && pref.resolution) {
        matched = allOptions.find(
          (o) =>
            o.type === pref.type &&
            (o.resolution || '').toLowerCase() === pref.resolution.toLowerCase()
        );
      }
      // 3. Match by type + quality
      if (!matched && pref.quality) {
        matched = allOptions.find(
          (o) =>
            o.type === pref.type &&
            (o.quality || '').toLowerCase() === pref.quality.toLowerCase()
        );
      }
      // 4. Match by type fallback (e.g., 720p or 1080p for video, first audio for audio)
      if (!matched) {
        matched =
          allOptions.find((o) => o.type === pref.type && /720p|1080p/i.test(o.resolution || '')) ||
          allOptions.find((o) => o.type === pref.type) ||
          allOptions[0];
      }

      if (matched) {
        setSelectedOptionId(matched.id);
        const inPrimaryVideo = primaryVideoOptions.some((v) => v.id === matched!.id);
        const inPrimaryAudio = audioOptions.slice(0, 2).some((a) => a.id === matched!.id);
        if (!inPrimaryVideo && !inPrimaryAudio) {
          setShowAllFormats(true);
        }
        return;
      }
    }

    if (!savedState.enabled) {
      setSelectedOptionId(null);
    }
  }, [media.originalUrl, allOptions, primaryVideoOptions, audioOptions]);

  const selectedOption = useMemo(() => {
    if (!selectedOptionId) return null;
    return allOptions.find((o) => o.id === selectedOptionId) || null;
  }, [allOptions, selectedOptionId]);

  const handleSelectOption = (opt: DownloadOption) => {
    setSelectedOptionId(opt.id);
    if (rememberChoice) {
      const pref: RememberedFormatPref = {
        type: opt.type,
        resolution: opt.resolution || '',
        format: opt.format || 'MP4',
        quality: opt.quality || '',
        optionId: opt.id,
      };
      saveRememberChoiceState(true, pref);
    }
  };

  const handleToggleRememberChoice = () => {
    const nextVal = !rememberChoice;
    setRememberChoice(nextVal);
    if (nextVal) {
      const targetOpt =
        selectedOption ||
        videoOptions.find((v) => /720p/i.test(v.resolution || '')) ||
        videoOptions[0] ||
        allOptions[0];
      if (targetOpt && !selectedOptionId) {
        setSelectedOptionId(targetOpt.id);
      }
      if (targetOpt) {
        saveRememberChoiceState(true, {
          type: targetOpt.type,
          resolution: targetOpt.resolution || '',
          format: targetOpt.format || 'MP4',
          quality: targetOpt.quality || '',
          optionId: targetOpt.id,
        });
      }
    } else {
      saveRememberChoiceState(false, null);
    }
  };

  const handleCloseSheet = () => {
    if (onDownloadNewVideo) {
      onDownloadNewVideo();
    }
  };

  // Main Yellow #FFCC00 Download Button Execution:
  // Immediately sends task to active download queue, closes bottom sheet, and clears input/home screen
  const handleConfirmDownload = () => {
    const targetOption =
      selectedOption ||
      (rememberChoice
        ? videoOptions.find((v) => /720p|1080p/i.test(v.resolution || '')) ||
          videoOptions[0] ||
          allOptions[0]
        : null);

    if (!targetOption) return;

    if (rememberChoice) {
      saveRememberChoiceState(true, {
        type: targetOption.type,
        resolution: targetOption.resolution || '',
        format: targetOption.format || 'MP4',
        quality: targetOption.quality || '',
        optionId: targetOption.id,
      });
    }

    // 1. Send task to active download queue on the Downloads Page
    onStartDownload(targetOption);

    // 2. Close the bottom sheet and clear input/home screen so user can immediately paste new links
    if (onDownloadNewVideo) {
      onDownloadNewVideo();
    }
  };

  // Lock background page scroll while Link Parsing / Download Modal is open
  useEffect(() => {
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, []);

  return (
    <div
      className="fixed inset-x-0 top-[57px] bottom-[65px] z-[80] !m-0 bg-[#10131c] flex flex-col justify-start p-0 overflow-hidden"
      id="link-extraction-bottom-sheet-backdrop"
      onClick={handleCloseSheet}
    >
      <motion.div
        id="link-extraction-bottom-sheet"
        initial={{ opacity: 0, scale: 0.99 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.99 }}
        whileHover={{
          scale: 1.004,
          boxShadow: '0 20px 50px -12px rgba(255, 204, 0, 0.16), 0 12px 30px -8px rgba(0, 0, 0, 0.65)',
        }}
        transition={{ duration: 0.2, ease: 'easeOut' }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-none h-full max-h-full bg-[#141720] text-slate-100 rounded-none border-0 overflow-hidden flex flex-col justify-start shadow-xl"
      >
        {/* Top Full-Width Accent Bar (div:nth-of-type(1)) */}
        <div className="h-0.5 w-full bg-gradient-to-r from-[#FFCC00]/60 via-[#FFCC00] to-[#FFCC00]/60 shrink-0" />

        {/* 1. HEADER ROW (div:nth-of-type(2)): Sits directly below the fixed top Header with video details & relocated visible action buttons */}
        <div className="w-full mt-0 px-3 sm:px-6 py-2.5 border-b border-white/10 bg-[#11141d] shrink-0 shadow-sm">
          <div className="max-w-5xl mx-auto w-full space-y-2">
            {/* Compact Thumbnail on Left + Title & Source Domain on Right */}
            <div className="flex items-center gap-2.5 sm:gap-3">
              <button
                type="button"
                onClick={onPlayVideo}
                className="relative w-16 h-11 sm:w-20 sm:h-12 rounded-lg overflow-hidden bg-black border border-white/15 shrink-0 group cursor-pointer"
                title={lang === 'ur' ? 'ویڈیو چلائیں' : 'Preview video'}
              >
                <img
                  src={media.thumbnail}
                  alt={media.title}
                  onError={(e) => {
                    const target = e.currentTarget;
                    if (!target.dataset.proxied && media.thumbnail?.startsWith('http')) {
                      target.dataset.proxied = '1';
                      target.src = `/api/image-proxy?url=${encodeURIComponent(media.thumbnail)}`;
                    }
                  }}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                  referrerPolicy="no-referrer"
                />
                <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                  <div className="w-4 h-4 sm:w-5 sm:h-5 rounded-full bg-black/65 text-white flex items-center justify-center border border-white/25 group-hover:scale-110 transition-transform">
                    <Play className="w-2.5 h-2.5 fill-current ml-0.5" />
                  </div>
                </div>
                {media.duration && (
                  <span className="absolute bottom-0.5 right-0.5 px-1 py-0.2 rounded bg-black/80 text-white text-[8px] sm:text-[9px] font-mono tabular-nums font-bold leading-none">
                    {media.duration}
                  </span>
                )}
              </button>

              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5 mb-0.5">
                  <h2
                    id="parse-dialog-header-title"
                    className="text-[10px] sm:text-xs font-extrabold uppercase tracking-wider text-[#FFCC00]"
                  >
                    {lang === 'ur' ? 'کاپی کی گئی ویڈیو (Video you copied)' : 'Video you copied'}
                  </h2>
                </div>
                <h3
                  className="text-xs sm:text-sm font-bold text-slate-100 line-clamp-1 leading-snug"
                  title={media.title}
                >
                  {media.title || 'Social Media Video'}
                </h3>
                <div className="flex items-center gap-1.5 mt-0.5 text-[10px] sm:text-[11px] text-slate-400">
                  <Globe className="w-3 h-3 text-slate-400 shrink-0" />
                  <span className="font-mono text-[10px] sm:text-[11px] text-slate-300 truncate">
                    {sourceDomain}
                  </span>
                  {media.author && (
                    <>
                      <span aria-hidden="true">·</span>
                      <span className="text-[10px] sm:text-[11px] text-slate-400 truncate">
                        {media.author}
                      </span>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Relocated, High-Visibility Action Bar for Mobile & Desktop (Creator Profile & Close Sheet) */}
            <div className="grid grid-cols-2 gap-2 pt-1">
              <button
                type="button"
                id="open-creator-profile-sheet-btn"
                onClick={() => {
                  if (onOpenCreatorProfile) {
                    onOpenCreatorProfile({
                      handle: creatorHandle,
                      authorName: media.author || creatorHandle,
                      avatar: media.authorAvatar || media.thumbnail,
                      platform: media.platform,
                      profileUrl: creatorProfileUrl,
                    });
                  }
                }}
                className="w-full px-3 py-1.5 rounded-xl bg-sky-500/20 hover:bg-sky-500/35 border border-sky-400/50 text-sky-100 text-xs font-extrabold flex items-center justify-center gap-1.5 cursor-pointer transition-all active:scale-98 shadow-xs"
                title={lang === 'ur' ? 'کریئیٹر کے تمام ویڈیوز کھولیں' : 'Open all Creator Videos'}
              >
                <Layers className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                <span className="truncate">
                  {lang === 'ur' ? `کریئیٹر ویڈیوز: ${creatorHandle}` : `Creator: ${creatorHandle}`}
                </span>
              </button>

              <button
                type="button"
                id="close-parse-bottom-sheet-btn"
                onClick={handleCloseSheet}
                className="w-full px-3 py-1.5 rounded-xl bg-rose-600/25 hover:bg-rose-600/40 border border-rose-500/50 text-rose-100 text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer transition-colors shadow-xs"
                aria-label="Close dialog"
              >
                <X className="w-3.5 h-3.5 text-rose-300 shrink-0" />
                <span>{lang === 'ur' ? 'بند کریں (Close)' : 'Close'}</span>
              </button>
            </div>
          </div>
        </div>

        {/* 2. SCROLLABLE CONTENT CONTAINER (div:nth-of-type(3)): Vertical auto-overflow containing Formats, 'Remember My Choice' toggle, and main 'Download' button */}
        <div
          id="parse-sheet-scrollable-content"
          className="w-full flex-1 min-h-0 overflow-y-auto overscroll-contain px-3 sm:px-6 pt-2 pb-16 sm:pb-12"
        >
          <div className="max-w-5xl mx-auto w-full space-y-2.5">
            {/* MUSIC SECTION */}
            {primaryAudioOptions.length > 0 && (
              <div id="parse-sheet-music-section" className="space-y-1">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-[11px] sm:text-xs font-extrabold uppercase tracking-wider text-slate-300">
                    <Music className="w-3 h-3 text-amber-400" />
                    <span>{lang === 'ur' ? 'میوزک (Music)' : 'Music'}</span>
                  </div>
                  <span className="text-[10px] text-slate-400 font-mono">MP3 / M4A</span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-1.5">
                  {primaryAudioOptions.map((opt, idx) => {
                    const isSelected = selectedOptionId === opt.id;
                    const displaySize = formatDisplayFileSize(opt.size || '2.8 MB', fileSizeUnit);
                    return (
                      <motion.label
                        key={opt.id}
                        whileHover={{
                          scale: 1.02,
                          boxShadow: '0 8px 20px -4px rgba(255, 204, 0, 0.18)',
                        }}
                        whileTap={{ scale: 0.98 }}
                        transition={{ duration: 0.16, ease: 'easeOut' }}
                        onClick={() => handleSelectOption(opt)}
                        className={`flex items-center justify-between gap-1.5 px-2.5 py-1.5 rounded-lg border cursor-pointer transition-colors select-none ${
                          isSelected
                            ? 'bg-[#FFCC00]/15 border-[#FFCC00] text-white shadow-xs'
                            : 'bg-[#1e2230] hover:bg-[#252a3a] border-white/10 text-slate-200'
                        }`}
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1">
                            <span className="text-[11px] sm:text-xs font-bold truncate leading-tight">
                              {getOptionFriendlyTitle(opt, idx)}
                            </span>
                          </div>
                          <div className="flex items-center gap-1 text-[10px] text-slate-400 font-mono tabular-nums leading-tight mt-0.5">
                            <span>{opt.resolution || '128K'}</span>
                            <span aria-hidden="true">·</span>
                            <span>{displaySize}</span>
                          </div>
                        </div>

                        {/* Compact Radio Selector */}
                        <input
                          type="radio"
                          name="media_download_format"
                          checked={isSelected}
                          onChange={() => handleSelectOption(opt)}
                          className="sr-only"
                        />
                        <span
                          className={`w-3.5 h-3.5 sm:w-4 sm:h-4 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${
                            isSelected
                              ? 'border-[#FFCC00] bg-[#FFCC00]'
                              : 'border-slate-500 bg-transparent'
                          }`}
                        >
                          {isSelected && <span className="w-1.5 h-1.5 rounded-full bg-slate-950" />}
                        </span>
                      </motion.label>
                    );
                  })}
                </div>
              </div>
            )}

            {/* VIDEO SECTION */}
            {displayedVideoOptions.length > 0 && (
              <div id="parse-sheet-video-section" className="space-y-1">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-[11px] sm:text-xs font-extrabold uppercase tracking-wider text-slate-300">
                    <Video className="w-3 h-3 text-[#FFCC00]" />
                    <span>{lang === 'ur' ? 'ویڈیو (Video)' : 'Video'}</span>
                  </div>
                  <span className="text-[10px] text-slate-400 font-mono tabular-nums">
                    {showAllFormats
                      ? `${videoOptions.length} ${lang === 'ur' ? 'ریزولوشنز' : 'resolutions'}`
                      : 'MP4 HD'}
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-1.5">
                  {displayedVideoOptions.map((opt, idx) => {
                    const isSelected = selectedOptionId === opt.id;
                    const displaySize = formatDisplayFileSize(opt.size || '8.4 MB', fileSizeUnit);
                    const isHdBadge = /1080p|1440p|2160p|4320p|2k|4k|8k|720p/i.test(
                      `${opt.resolution || ''} ${opt.quality || ''}`
                    );
                    return (
                      <motion.label
                        key={opt.id}
                        whileHover={{
                          scale: 1.02,
                          boxShadow: '0 8px 20px -4px rgba(255, 204, 0, 0.18)',
                        }}
                        whileTap={{ scale: 0.98 }}
                        transition={{ duration: 0.16, ease: 'easeOut' }}
                        onClick={() => handleSelectOption(opt)}
                        className={`flex items-center justify-between gap-1.5 px-2.5 py-1.5 rounded-lg border cursor-pointer transition-colors select-none ${
                          isSelected
                            ? 'bg-[#FFCC00]/15 border-[#FFCC00] text-white shadow-xs'
                            : 'bg-[#1e2230] hover:bg-[#252a3a] border-white/10 text-slate-200'
                        }`}
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1">
                            <span className="text-[11px] sm:text-xs font-bold truncate leading-tight">
                              {getOptionFriendlyTitle(opt, idx)}
                            </span>
                            {isHdBadge && (
                              <span className="px-1 py-0.2 rounded bg-[#FFCC00]/20 text-[#FFCC00] text-[8px] font-mono font-extrabold uppercase shrink-0 leading-none">
                                HD
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-1 text-[10px] text-slate-400 font-mono tabular-nums leading-tight mt-0.5">
                            <span>{opt.format || 'MP4'}</span>
                            <span aria-hidden="true">·</span>
                            <span>{displaySize}</span>
                          </div>
                        </div>

                        {/* Compact Radio Selector */}
                        <input
                          type="radio"
                          name="media_download_format"
                          checked={isSelected}
                          onChange={() => handleSelectOption(opt)}
                          className="sr-only"
                        />
                        <span
                          className={`w-3.5 h-3.5 sm:w-4 sm:h-4 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${
                            isSelected
                              ? 'border-[#FFCC00] bg-[#FFCC00]'
                              : 'border-slate-500 bg-transparent'
                          }`}
                        >
                          {isSelected && <span className="w-1.5 h-1.5 rounded-full bg-slate-950" />}
                        </span>
                      </motion.label>
                    );
                  })}
                </div>
              </div>
            )}

            {/* IMAGE OPTIONS (If photo post or when expanded) */}
            {(imageOptions.length > 0 && (showAllFormats || videoOptions.length === 0)) && (
              <div className="space-y-1">
                <div className="flex items-center gap-1.5 text-[11px] sm:text-xs font-extrabold uppercase tracking-wider text-slate-300">
                  <ImageIcon className="w-3 h-3 text-emerald-400" />
                  <span>{lang === 'ur' ? 'تصویر (Photo)' : 'Photo'}</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-1.5">
                  {imageOptions.map((opt, idx) => {
                    const isSelected = selectedOptionId === opt.id;
                    const displaySize = formatDisplayFileSize(opt.size || '1.8 MB', fileSizeUnit);
                    return (
                      <motion.label
                        key={opt.id}
                        whileHover={{
                          scale: 1.02,
                          boxShadow: '0 8px 20px -4px rgba(255, 204, 0, 0.18)',
                        }}
                        whileTap={{ scale: 0.98 }}
                        transition={{ duration: 0.16, ease: 'easeOut' }}
                        onClick={() => handleSelectOption(opt)}
                        className={`flex items-center justify-between gap-1.5 px-2.5 py-1.5 rounded-lg border cursor-pointer transition-colors select-none ${
                          isSelected
                            ? 'bg-[#FFCC00]/15 border-[#FFCC00] text-white shadow-xs'
                            : 'bg-[#1e2230] hover:bg-[#252a3a] border-white/10 text-slate-200'
                        }`}
                      >
                        <div className="min-w-0 flex-1">
                          <span className="text-[11px] sm:text-xs font-bold truncate block leading-tight">
                            {getOptionFriendlyTitle(opt, idx)}
                          </span>
                          <span className="text-[10px] text-slate-400 font-mono tabular-nums leading-tight mt-0.5 block">
                            {opt.format || 'JPG'} · {displaySize}
                          </span>
                        </div>
                        <span
                          className={`w-3.5 h-3.5 sm:w-4 sm:h-4 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${
                            isSelected
                              ? 'border-[#FFCC00] bg-[#FFCC00]'
                              : 'border-slate-500 bg-transparent'
                          }`}
                        >
                          {isSelected && <span className="w-1.5 h-1.5 rounded-full bg-slate-950" />}
                        </span>
                      </motion.label>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Compact "More Formats / All" + Secondary Utility Actions Row */}
            <div className="flex flex-wrap items-center justify-between gap-2 pt-0.5">
              {(videoOptions.length > primaryVideoOptions.length || audioOptions.length > 2) ? (
                <button
                  type="button"
                  id="more-formats-toggle-btn"
                  onClick={() => setShowAllFormats((prev) => !prev)}
                  className="flex-1 py-1.5 px-3 rounded-lg bg-white/[0.05] hover:bg-white/[0.1] border border-white/10 text-[11px] sm:text-xs font-bold text-slate-200 flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
                >
                  <span>
                    {showAllFormats
                      ? lang === 'ur'
                        ? 'کم فارمیٹس دکھائیں (Show Primary Formats)'
                        : 'Show Primary Formats'
                      : lang === 'ur'
                      ? `مزید فارمیٹس / تمام ریزولوشنز (${allOptions.length})`
                      : `More formats / All (${allOptions.length})`}
                  </span>
                  {showAllFormats ? (
                    <ChevronUp className="w-3.5 h-3.5 text-[#FFCC00]" />
                  ) : (
                    <ChevronDown className="w-3.5 h-3.5 text-[#FFCC00]" />
                  )}
                </button>
              ) : (
                <div />
              )}

              {selectedOption && (onScheduleDownload || onOpenQrCode || onSaveToDrive) && (
                <div className="flex items-center gap-1.5 shrink-0">
                  {onScheduleDownload && (
                    <button
                      type="button"
                      onClick={() => onScheduleDownload(selectedOption)}
                      className="px-2 py-1 rounded-md bg-white/5 hover:bg-white/10 text-slate-300 text-[10px] font-semibold flex items-center gap-1 cursor-pointer"
                    >
                      <Clock className="w-3 h-3 text-sky-400" />
                      <span>{lang === 'ur' ? 'شیڈول' : 'Schedule'}</span>
                    </button>
                  )}
                  {onOpenQrCode && (
                    <button
                      type="button"
                      onClick={() => onOpenQrCode(selectedOption)}
                      className="px-2 py-1 rounded-md bg-white/5 hover:bg-white/10 text-slate-300 text-[10px] font-semibold flex items-center gap-1 cursor-pointer"
                    >
                      <QrCode className="w-3 h-3 text-cyan-400" />
                      <span>QR</span>
                    </button>
                  )}
                  {onSaveToDrive && (
                    <button
                      type="button"
                      onClick={() => onSaveToDrive(selectedOption)}
                      className="px-2 py-1 rounded-md bg-white/5 hover:bg-white/10 text-slate-300 text-[10px] font-semibold flex items-center gap-1 cursor-pointer"
                    >
                      <HardDrive className="w-3 h-3 text-amber-400" />
                      <span>Drive</span>
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* 3. SETTINGS ("Remember My Choice" Toggle) & MAIN DOWNLOAD BUTTON: Inside scrollable content container so it is always reachable via internal scroll on smaller screens */}
            <div className="w-full p-2.5 sm:p-3 rounded-xl bg-[#11141d] border border-white/10 shadow-md space-y-2">
              {/* Settings & "Remember My Choice" Row */}
              <div
                className="flex items-center justify-between gap-2"
                id="remember-my-choice-row"
              >
                <div className="flex items-center gap-1.5 min-w-0">
                  <Settings2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <div className="min-w-0 flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-semibold text-slate-200">
                      {lang === 'ur' ? 'میرا انتخاب یاد رکھیں (Remember my choice)' : 'Remember my choice'}
                    </span>
                    {rememberChoice && selectedOption && (
                      <span className="text-[10px] text-[#FFCC00] font-mono">
                        ({selectedOption.resolution || selectedOption.quality} · {selectedOption.format})
                      </span>
                    )}
                  </div>
                </div>

                <button
                  type="button"
                  role="switch"
                  aria-checked={rememberChoice}
                  id="remember-my-choice-toggle"
                  onClick={handleToggleRememberChoice}
                  className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                    rememberChoice ? 'bg-[#FFCC00]' : 'bg-slate-700'
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-4 w-4 transform rounded-full shadow-md ring-0 transition duration-200 ease-in-out ${
                      rememberChoice
                        ? 'translate-x-4 bg-slate-950'
                        : 'translate-x-0 bg-white'
                    }`}
                  />
                </button>
              </div>

              {/* Single Prominent Yellow #FFCC00 Download Button */}
              <button
                type="button"
                id="parse-sheet-main-download-btn"
                disabled={!selectedOption}
                onClick={handleConfirmDownload}
                className={`w-full h-9 sm:h-10 rounded-xl font-extrabold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-lg transition-all cursor-pointer ${
                  selectedOption
                    ? 'bg-[#FFCC00] hover:bg-[#f2c200] text-slate-950 shadow-[#FFCC00]/20 active:scale-[0.98]'
                    : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                }`}
              >
                <Download className="w-4 h-4 stroke-[2.5]" />
                <span>
                  {selectedOption
                    ? lang === 'ur'
                      ? `ڈاؤن لوڈ (${selectedOption.resolution || selectedOption.quality} · ${formatDisplayFileSize(selectedOption.size, fileSizeUnit)})`
                      : `Download (${selectedOption.resolution || selectedOption.quality} · ${formatDisplayFileSize(selectedOption.size, fileSizeUnit)})`
                    : lang === 'ur'
                    ? 'ڈاؤن لوڈ کے لیے فارمیٹ منتخب کریں'
                    : 'Select a Format to Download'}
                </span>
              </button>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
};
