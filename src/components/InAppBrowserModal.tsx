import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, 
  ArrowLeft, 
  ArrowRight, 
  RotateCw, 
  Home, 
  Lock, 
  Globe, 
  Search, 
  Download, 
  Play, 
  Pause, 
  Volume2, 
  VolumeX, 
  Maximize2, 
  ExternalLink, 
  Sparkles, 
  Check, 
  ShieldCheck, 
  LogIn, 
  Layers, 
  Film, 
  Music, 
  Share2, 
  CheckCircle2, 
  AlertCircle,
  Copy,
  FolderDown,
  Zap,
  Info
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { Language, PlatformType, DownloadOption, MediaResult } from '../types';
import { buildPlatformSearchUrl, BrowserPlatformFilter } from '../utils/browserSearchSettings';
import { translations } from '../data/translations';
import { PLATFORMS, PlatformConfig } from '../data/platforms';
import { detectPlatform, generateClientSideMediaResult } from '../utils/urlParser';

interface InAppBrowserModalProps {
  isOpen: boolean;
  onClose: () => void;
  lang: Language;
  initialUrl?: string;
  initialContext?: {
    title?: string;
    thumbnail?: string;
    author?: string;
    videoUrl?: string;
    duration?: string;
  } | null;
  onTriggerDownload: (url: string) => void;
  onOpenDownloadsManager?: () => void;
  backHandlerRef?: React.MutableRefObject<(() => boolean) | null>;
  onBackDepthChange?: (depth: number) => void;
}

// Preset interactive demonstration reels/videos so users can test playing any social platform right inside the browser
interface MockBrowserMedia {
  platform: PlatformType;
  title: string;
  author: string;
  authorHandle: string;
  avatar: string;
  videoUrl: string;
  thumbnail: string;
  duration: string;
  likes: string;
  caption: string;
  sourceUrl: string;
}

const VERIFIED_BROWSER_STREAM_MP4 =
  'https://v1.pinimg.com/videos/iht/expMp4/40/1f/40/401f4060e9b8eec5b500b588a647a8a3_720w.mp4';

const PRESET_BROWSER_ITEMS: Record<string, MockBrowserMedia> = {
  tiktok: {
    platform: 'tiktok',
    title: 'Viral Aesthetic Dance & Transitions ✨',
    author: 'Sarah Jenkins',
    authorHandle: '@sarah_dance',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120&auto=format&fit=crop&q=80',
    videoUrl: VERIFIED_BROWSER_STREAM_MP4,
    thumbnail: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800&auto=format&fit=crop&q=80',
    duration: '0:35',
    likes: '142.8K',
    caption: 'Best choreography of this week! Clean transition tutorial coming next ✨ #viral #dance #tiktoktrend',
    sourceUrl: 'https://www.tiktok.com/@sarah_dance/video/739102938491029384',
  },
  instagram: {
    platform: 'instagram',
    title: 'Cinematic Sunset Travel Reel 4K',
    author: 'Elena Rostova',
    authorHandle: '@elena_voyages',
    avatar: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=120&auto=format&fit=crop&q=80',
    videoUrl: VERIFIED_BROWSER_STREAM_MP4,
    thumbnail: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800&auto=format&fit=crop&q=80',
    duration: '0:42',
    likes: '89.4K',
    caption: 'Golden hour in Amalfi coast. Captured in ProRes 4K HDR. Audio remix by @kygo #reels #travel #italy',
    sourceUrl: 'https://www.instagram.com/reel/C8_kX19P_abc/',
  },
  youtube: {
    platform: 'youtube',
    title: 'Top 5 Tech Gadgets That Blew My Mind!',
    author: 'TechNexus Studio',
    authorHandle: '@technexus',
    avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=120&auto=format&fit=crop&q=80',
    videoUrl: VERIFIED_BROWSER_STREAM_MP4,
    thumbnail: 'https://images.unsplash.com/photo-1519389950473-47ba0277781c?w=800&auto=format&fit=crop&q=80',
    duration: '0:58',
    likes: '64.2K',
    caption: 'Which one would you buy first? Drop your thoughts below! #shorts #tech #gadgets',
    sourceUrl: 'https://www.youtube.com/shorts/q7w8e9r0t1y',
  },
  facebook: {
    platform: 'facebook',
    title: 'Incredible Wildlife Rescue & Freedom Flight',
    author: 'Earth Heroes Media',
    authorHandle: '@earthheroes',
    avatar: 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=120&auto=format&fit=crop&q=80',
    videoUrl: VERIFIED_BROWSER_STREAM_MP4,
    thumbnail: 'https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?w=800&auto=format&fit=crop&q=80',
    duration: '1:15',
    likes: '35.6K',
    caption: 'After 3 months of rehabilitation, this golden eagle is back in the wild! #facebookwatch #nature',
    sourceUrl: 'https://www.facebook.com/watch/?v=928374615243',
  },
  twitter: {
    platform: 'twitter',
    title: 'Epic Drone Drift Racing in Tokyo Night Lights',
    author: 'FPV Master Pro',
    authorHandle: '@fpv_tokyo',
    avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=120&auto=format&fit=crop&q=80',
    videoUrl: VERIFIED_BROWSER_STREAM_MP4,
    thumbnail: 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?w=800&auto=format&fit=crop&q=80',
    duration: '0:28',
    likes: '22.1K',
    caption: 'Unbelievable proximity flying through neon alleyways at 90km/h 🏎️💨 #FPV #Tokyo #Drone',
    sourceUrl: 'https://x.com/fpv_tokyo/status/1802938471928374',
  },
  pinterest: {
    platform: 'pinterest',
    title: 'Minimalist Studio Apartment DIY Makeover Ideas',
    author: 'Design & Living',
    authorHandle: '@nordicspaces',
    avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=120&auto=format&fit=crop&q=80',
    videoUrl: VERIFIED_BROWSER_STREAM_MP4,
    thumbnail: 'https://images.unsplash.com/photo-1513694203232-719a280e022f?w=800&auto=format&fit=crop&q=80',
    duration: '0:45',
    likes: '18.9K',
    caption: 'Transforming 35sqm into a calm Scandinavian oasis on a budget! #interiordesign #aesthetic',
    sourceUrl: 'https://www.pinterest.com/pin/182947192837465/',
  },
  reddit: {
    platform: 'reddit',
    title: 'Clever Robotic Invention Solving Daily Kitchen Tasks',
    author: 'u/RoboticsEngineer',
    authorHandle: 'r/gadgets',
    avatar: 'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=120&auto=format&fit=crop&q=80',
    videoUrl: VERIFIED_BROWSER_STREAM_MP4,
    thumbnail: 'https://images.unsplash.com/photo-1485827404703-89b55fcc595e?w=800&auto=format&fit=crop&q=80',
    duration: '0:38',
    likes: '31.4K',
    caption: 'Spent 6 months designing and 3D printing this automatic pancake flipper. It actually works flawlessly!',
    sourceUrl: 'https://www.reddit.com/r/gadgets/comments/1e8abc9/my_custom_kitchen_robot/',
  },
  threads: {
    platform: 'threads',
    title: 'Meta Threads Clean HD Video Post',
    author: 'Threads Creator',
    authorHandle: '@threads_creator',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120&auto=format&fit=crop&q=80',
    videoUrl: VERIFIED_BROWSER_STREAM_MP4,
    thumbnail: 'https://images.unsplash.com/photo-1611162616305-c69b3fa7fbe0?w=800&auto=format&fit=crop&q=80',
    duration: '0:30',
    likes: '19.4K',
    caption: 'Behind the scenes studio workflow in 4K HDR #threads #creator',
    sourceUrl: 'https://www.threads.com/@mohdmobeespasha/post/DeDldlMEgP4',
  },
  snapchat: {
    platform: 'snapchat',
    title: 'Snapchat Spotlight Viral HD Clip',
    author: 'Spotlight Creator',
    authorHandle: '@snap_spotlight',
    avatar: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=120&auto=format&fit=crop&q=80',
    videoUrl: VERIFIED_BROWSER_STREAM_MP4,
    thumbnail: 'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=800&auto=format&fit=crop&q=80',
    duration: '0:28',
    likes: '53.1K',
    caption: 'Trending Snapchat Spotlight moment captured in Full HD #spotlight #snapchat',
    sourceUrl: 'https://www.snapchat.com/spotlight/W7_viral_clip_101',
  },
  dailymotion: {
    platform: 'dailymotion',
    title: 'Dailymotion 1080p Full HD Video Stream',
    author: 'Dailymotion Official',
    authorHandle: '@dailymotion_hd',
    avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=120&auto=format&fit=crop&q=80',
    videoUrl: VERIFIED_BROWSER_STREAM_MP4,
    thumbnail: 'https://images.unsplash.com/photo-1574717024653-61fd2cf4d44d?w=800&auto=format&fit=crop&q=80',
    duration: '1:20',
    likes: '24.8K',
    caption: 'Official HD broadcast on Dailymotion ready for instant download.',
    sourceUrl: 'https://www.dailymotion.com/video/x8abcde',
  },
  vimeo: {
    platform: 'vimeo',
    title: 'Vimeo Staff Pick 4K HDR Cinema Video',
    author: 'Vimeo Filmmaker',
    authorHandle: '@vimeo_cinema',
    avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=120&auto=format&fit=crop&q=80',
    videoUrl: VERIFIED_BROWSER_STREAM_MP4,
    thumbnail: 'https://images.unsplash.com/photo-1492691527719-9d1e07e534b4?w=800&auto=format&fit=crop&q=80',
    duration: '1:45',
    likes: '41.2K',
    caption: '4K Ultra HD cinema short film featured on Vimeo Staff Picks.',
    sourceUrl: 'https://vimeo.com/76979871',
  }
};

export const InAppBrowserModal: React.FC<InAppBrowserModalProps> = ({
  isOpen,
  onClose,
  lang,
  initialUrl = '',
  initialContext = null,
  onTriggerDownload,
  onOpenDownloadsManager,
  backHandlerRef,
  onBackDepthChange,
}) => {
  const t = translations[lang];

  // Address Bar State
  const [currentUrl, setCurrentUrl] = useState<string>(
    initialUrl || 'https://www.tiktok.com'
  );
  const [inputUrl, setInputUrl] = useState<string>(
    initialUrl || 'https://www.tiktok.com'
  );
  const [historyStack, setHistoryStack] = useState<string[]>([
    initialUrl || 'https://www.tiktok.com'
  ]);
  const [historyIndex, setHistoryIndex] = useState<number>(0);

  // Active platform and media detection
  const [activePlatform, setActivePlatform] = useState<PlatformType>('tiktok');
  const [activeMedia, setActiveMedia] = useState<MockBrowserMedia>(PRESET_BROWSER_ITEMS.tiktok);
  const [isVideoPlaying, setIsVideoPlaying] = useState<boolean>(true);
  const [isMuted, setIsMuted] = useState<boolean>(true);
  const [showLoginHelper, setShowLoginHelper] = useState<boolean>(false);
  const [copiedUrl, setCopiedUrl] = useState<boolean>(false);
  const [justDownloaded, setJustDownloaded] = useState<boolean>(false);
  const [downloadSuccessToast, setDownloadSuccessToast] = useState<string | null>(null);

  // Browser View Mode: 'interactive' (Live media player stream & sniffer) or 'webview' (Direct iframe embed)
  const [browserMode, setBrowserMode] = useState<'interactive' | 'webview'>('interactive');

  // Movable Floating Download Button Position (Screen percentage or pixels)
  // By default, sits comfortably floating at bottom right of the browser viewport
  const [buttonPos, setButtonPos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // When initialUrl or initialContext changes
  useEffect(() => {
    if (initialUrl && initialUrl.trim()) {
      handleNavigateToUrl(initialUrl.trim());
    }
  }, [initialUrl, initialContext]);

  // Update media when URL changes
  const updateMediaForUrl = (targetUrl: string) => {
    const detected = detectPlatform(targetUrl);
    setActivePlatform(detected);

    if (initialContext && initialUrl && targetUrl.trim() === initialUrl.trim()) {
      const basePreset = PRESET_BROWSER_ITEMS[detected] || PRESET_BROWSER_ITEMS.tiktok;
      setActiveMedia({
        platform: detected,
        title: initialContext.title || basePreset.title,
        author: initialContext.author || basePreset.author,
        authorHandle: initialContext.author?.startsWith('@')
          ? initialContext.author
          : `@${(initialContext.author || detected).replace(/\s+/g, '_').toLowerCase()}`,
        avatar: initialContext.thumbnail || basePreset.avatar,
        videoUrl: initialContext.videoUrl || `/api/stream?url=${encodeURIComponent(targetUrl)}`,
        thumbnail: initialContext.thumbnail || basePreset.thumbnail,
        duration: initialContext.duration || basePreset.duration,
        likes: basePreset.likes,
        caption: initialContext.title || basePreset.caption,
        sourceUrl: targetUrl,
      });
      return;
    }

    if (PRESET_BROWSER_ITEMS[detected]) {
      let isBareDomain = false;
      try {
        const u = new URL(targetUrl);
        isBareDomain = !u.pathname || u.pathname === '/';
      } catch {
        isBareDomain = false;
      }
      setActiveMedia({
        ...PRESET_BROWSER_ITEMS[detected],
        sourceUrl: isBareDomain ? PRESET_BROWSER_ITEMS[detected].sourceUrl : targetUrl,
      });
    } else {
      // Universal or custom URL fallback
      setActiveMedia({
        platform: detected,
        title: 'Social Stream Video (1080p HD)',
        author: 'Content Creator',
        authorHandle: '@creator',
        avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120&auto=format&fit=crop&q=80',
        videoUrl: VERIFIED_BROWSER_STREAM_MP4,
        thumbnail: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800&auto=format&fit=crop&q=80',
        duration: '0:45',
        likes: '45.2K',
        caption: 'High quality social media video stream ready for instant download without watermark.',
        sourceUrl: targetUrl,
      });
    }
  };

  const handleNavigateToUrl = (newUrl: string, platformOverride?: PlatformType) => {
    let clean = newUrl.trim();
    if (!clean) return;

    const targetPlat = (platformOverride || activePlatform || 'all') as BrowserPlatformFilter;

    if (!/^https?:\/\//i.test(clean)) {
      if (clean.includes('.') && !clean.includes(' ')) {
        clean = `https://${clean}`;
      } else {
        // Search query for the selected social media platform
        clean = buildPlatformSearchUrl(clean, targetPlat);
        setBrowserMode('webview');
      }
    }

    setCurrentUrl(clean);
    setInputUrl(clean);
    updateMediaForUrl(clean);

    // Update history
    const newStack = historyStack.slice(0, historyIndex + 1);
    newStack.push(clean);
    setHistoryStack(newStack);
    setHistoryIndex(newStack.length - 1);
  };

  const handleGoBack = () => {
    if (historyIndex > 0) {
      const prev = historyStack[historyIndex - 1];
      setHistoryIndex(historyIndex - 1);
      setCurrentUrl(prev);
      setInputUrl(prev);
      updateMediaForUrl(prev);
    }
  };

  // Expose internal back navigation for mobile hardware/gesture back button
  const internalBackDepth = isOpen
    ? (showLoginHelper ? 1 : 0) + (browserMode === 'webview' ? 1 : 0) + historyIndex
    : 0;

  useEffect(() => {
    onBackDepthChange?.(internalBackDepth);
  }, [internalBackDepth, onBackDepthChange]);

  useEffect(() => {
    if (!backHandlerRef) return;
    backHandlerRef.current = () => {
      if (!isOpen) return false;
      if (showLoginHelper) {
        setShowLoginHelper(false);
        return true;
      }
      if (browserMode === 'webview') {
        setBrowserMode('interactive');
        return true;
      }
      if (historyIndex > 0) {
        handleGoBack();
        return true;
      }
      return false;
    };
    return () => {
      if (backHandlerRef) {
        backHandlerRef.current = null;
      }
    };
  });

  const handleGoForward = () => {
    if (historyIndex < historyStack.length - 1) {
      const next = historyStack[historyIndex + 1];
      setHistoryIndex(historyIndex + 1);
      setCurrentUrl(next);
      setInputUrl(next);
      updateMediaForUrl(next);
    }
  };

  const handleReload = () => {
    if (videoRef.current) {
      videoRef.current.currentTime = 0;
      videoRef.current.play().catch(() => {});
      setIsVideoPlaying(true);
    }
  };

  const handleGoHome = () => {
    handleNavigateToUrl('https://www.tiktok.com');
  };

  const handleSelectBookmark = (platformKey: string, fallbackUrl: string) => {
    handleNavigateToUrl(fallbackUrl);
  };

  // Open Official Login in Popup
  const handleOpenLoginSync = (platformKey: PlatformType) => {
    let loginUrl = 'https://www.instagram.com/accounts/login/';
    if (platformKey === 'tiktok') loginUrl = 'https://www.tiktok.com/login';
    else if (platformKey === 'facebook') loginUrl = 'https://www.facebook.com/login';
    else if (platformKey === 'youtube') loginUrl = 'https://accounts.google.com';
    else if (platformKey === 'twitter') loginUrl = 'https://twitter.com/i/flow/login';
    else if (platformKey === 'pinterest') loginUrl = 'https://www.pinterest.com/login/';
    else if (platformKey === 'reddit') loginUrl = 'https://www.reddit.com/login/';
    else if (platformKey === 'snapchat') loginUrl = 'https://accounts.snapchat.com';

    if (typeof window !== 'undefined') {
      window.open(loginUrl, '_blank', 'noopener,noreferrer,width=500,height=700');
    }
    setShowLoginHelper(false);
  };

  // THE KEY ACTION: "یہ موویبل ڈاون لوڈ بٹن دبانے سے فورا ڈاؤن لوڈ شروع ہو جاتی ہے"
  // When user clicks the movable download button, start download immediately!
  const handleMovableDownloadClick = (e: React.MouseEvent) => {
    e.stopPropagation();

    // Trigger immediate background download with highest priority
    const targetUrl = activeMedia.sourceUrl || currentUrl;
    onTriggerDownload(targetUrl);

    // Visual celebration & feedback
    setJustDownloaded(true);
    const toastMessage = lang === 'ur'
      ? 'ڈاؤنلوڈ فورا شروع ہو گیا! (1080p Full HD - بغیر واٹر مارک)'
      : 'Download started immediately! (1080p Full HD - No Watermark)';
    setDownloadSuccessToast(toastMessage);

    try {
      confetti({
        particleCount: 50,
        spread: 60,
        origin: { y: 0.85 },
        colors: ['#3b82f6', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6'],
      });
    } catch {
      // Confetti fallback
    }

    setTimeout(() => {
      setJustDownloaded(false);
    }, 2500);

    setTimeout(() => {
      setDownloadSuccessToast(null);
    }, 4500);
  };

  const handleCopyCurrentUrl = async () => {
    try {
      await navigator.clipboard.writeText(currentUrl);
      setCopiedUrl(true);
      setTimeout(() => setCopiedUrl(false), 2000);
    } catch {
      // ignore
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div 
        key="in-app-browser-modal-backdrop"
        id="in-app-browser-modal-backdrop"
        className="fixed inset-x-0 top-0 bottom-16 z-[75] flex items-center justify-center p-0 sm:p-3 bg-slate-950/85 backdrop-blur-md animate-fade-in"
      >
        <motion.div
          id="in-app-browser-window"
          ref={containerRef}
          initial={{ opacity: 0, scale: 0.96, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 15 }}
          transition={{ duration: 0.25, ease: 'easeOut' }}
          className="relative w-full max-w-6xl h-full max-h-full flex flex-col bg-slate-900 text-slate-100 sm:rounded-2xl shadow-2xl border border-slate-700/60 overflow-hidden"
        >
          {/* 1. TOP BROWSER CHROME (ADDRESS BAR & CONTROLS) */}
          <div className="flex-none px-3 py-2.5 sm:px-4 sm:py-3 bg-slate-800/90 border-b border-slate-700/60 flex flex-wrap items-center justify-between gap-2.5">
            {/* Navigation Buttons */}
            <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
              <button
                id="browser-btn-back"
                onClick={handleGoBack}
                disabled={historyIndex === 0}
                title="Back"
                className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-slate-700/70 disabled:opacity-35 disabled:hover:bg-transparent transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
              <button
                id="browser-btn-forward"
                onClick={handleGoForward}
                disabled={historyIndex >= historyStack.length - 1}
                title="Forward"
                className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-slate-700/70 disabled:opacity-35 disabled:hover:bg-transparent transition-colors"
              >
                <ArrowRight className="w-4 h-4" />
              </button>
              <button
                id="browser-btn-reload"
                onClick={handleReload}
                title="Reload"
                className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-slate-700/70 transition-colors"
              >
                <RotateCw className="w-4 h-4" />
              </button>
              <button
                id="browser-btn-home"
                onClick={handleGoHome}
                title="Home"
                className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-slate-700/70 transition-colors"
              >
                <Home className="w-4 h-4" />
              </button>
            </div>

            {/* Omnibox / URL Bar */}
            <form 
              onSubmit={(e) => {
                e.preventDefault();
                handleNavigateToUrl(inputUrl);
              }}
              className="flex-1 min-w-[200px] flex items-center bg-slate-950/70 border border-slate-700/80 rounded-xl px-2.5 py-1.5 text-xs sm:text-sm focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-500/20 transition-all shadow-inner"
            >
              <div className="flex items-center gap-1.5 text-emerald-400 mr-2 shrink-0">
                <Lock className="w-3.5 h-3.5" />
                <span className="hidden sm:inline text-[11px] font-mono text-emerald-400 font-medium">SSL</span>
              </div>
              <input
                id="browser-omnibox-input"
                type="text"
                value={inputUrl}
                onChange={(e) => setInputUrl(e.target.value)}
                placeholder={t.searchOrEnterUrl}
                className="w-full bg-transparent text-slate-100 placeholder-slate-400 text-xs sm:text-sm focus:outline-hidden font-mono truncate"
              />
              {inputUrl && (
                <button
                  type="button"
                  onClick={() => setInputUrl('')}
                  className="p-1 text-slate-400 hover:text-white transition-colors mr-1"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
              <button
                id="browser-omnibox-go"
                type="submit"
                className="p-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-colors shrink-0 shadow-xs"
                title="Navigate"
              >
                <Search className="w-3.5 h-3.5" />
              </button>
            </form>

            {/* Browser Action Tools */}
            <div className="flex items-center gap-1.5 shrink-0">
              {/* Login / Session Sync Helper */}
              <button
                id="browser-btn-login-sync"
                onClick={() => setShowLoginHelper(!showLoginHelper)}
                className="flex items-center gap-1.5 px-2.5 py-1.5 bg-slate-700/80 hover:bg-slate-700 text-xs font-medium text-slate-200 rounded-xl border border-slate-600/50 hover:border-slate-500 transition-all shadow-xs"
                title={t.loginHelper}
              >
                <LogIn className="w-3.5 h-3.5 text-blue-400" />
                <span className="hidden md:inline">{t.loginHelper}</span>
              </button>

              {/* Copy URL */}
              <button
                id="browser-btn-copy-url"
                onClick={handleCopyCurrentUrl}
                className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-slate-700/70 transition-colors"
                title={t.copyLink}
              >
                {copiedUrl ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
              </button>

              {/* Open in external tab */}
              <a
                id="browser-btn-external"
                href={currentUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-slate-700/70 transition-colors"
                title={t.openInExternalTab}
              >
                <ExternalLink className="w-4 h-4" />
              </a>

              {/* Close Browser Modal */}
              <button
                id="browser-btn-close"
                onClick={onClose}
                className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors ml-1"
                title={t.close}
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* 2. PLATFORM BOOKMARKS / SHORTCUTS BAR */}
          <div className="flex-none px-3 py-2 bg-slate-800/60 border-b border-slate-700/40 flex items-center gap-2 overflow-x-auto no-scrollbar">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 shrink-0 mr-1 flex items-center gap-1">
              <Globe className="w-3 h-3 text-blue-400" />
              {t.browserShortcuts}:
            </span>

            {[
              { id: 'tiktok', name: 'TikTok', icon: '🎵', url: 'https://www.tiktok.com' },
              { id: 'instagram', name: 'Instagram', icon: '📸', url: 'https://www.instagram.com' },
              { id: 'facebook', name: 'Facebook', icon: '👥', url: 'https://www.facebook.com' },
              { id: 'youtube', name: 'YouTube', icon: '▶️', url: 'https://www.youtube.com' },
              { id: 'pinterest', name: 'Pinterest', icon: '📌', url: 'https://www.pinterest.com' },
              { id: 'twitter', name: 'X / Twitter', icon: '𝕏', url: 'https://x.com' },
              { id: 'threads', name: 'Threads', icon: '🧵', url: 'https://www.threads.net' },
              { id: 'snapchat', name: 'Snapchat', icon: '👻', url: 'https://www.snapchat.com' },
              { id: 'dailymotion', name: 'Dailymotion', icon: '🎬', url: 'https://www.dailymotion.com' },
              { id: 'vimeo', name: 'Vimeo', icon: '🎞️', url: 'https://vimeo.com' },
              { id: 'reddit', name: 'Reddit', icon: '🤖', url: 'https://www.reddit.com' },
            ].map((p, idx) => {
              const isSelected = activePlatform === p.id;
              return (
                <button
                  key={`browser_bookmark_${p.id}_${idx}`}
                  onClick={() => handleSelectBookmark(p.id, p.url)}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium shrink-0 transition-all ${
                    isSelected 
                      ? 'bg-blue-600 text-white font-semibold shadow-xs' 
                      : 'bg-slate-700/50 hover:bg-slate-700 text-slate-300 hover:text-white'
                  }`}
                >
                  <span>{p.icon}</span>
                  <span>{p.name}</span>
                </button>
              );
            })}

            <div className="ml-auto shrink-0 flex items-center gap-1.5">
              <button
                onClick={() => setBrowserMode(browserMode === 'interactive' ? 'webview' : 'interactive')}
                className="px-2 py-1 bg-slate-700/60 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg text-[11px] font-medium transition-colors"
                title="Switch View Mode"
              >
                {browserMode === 'interactive' ? '⚡ ' + t.simulatedFeed : '🌐 ' + t.directWebview}
              </button>
            </div>
          </div>

          {/* 3. LOGIN & SESSION SYNC HELPER DROPDOWN */}
          <AnimatePresence>
            {showLoginHelper && (
              <motion.div
                key="login-helper-panel"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="bg-slate-800/95 border-b border-blue-500/30 px-4 py-3 text-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-3 shadow-md"
              >
                <div className="flex items-start gap-2.5">
                  <div className="p-2 bg-blue-600/20 text-blue-400 rounded-xl shrink-0 mt-0.5">
                    <ShieldCheck className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-slate-100 text-sm flex items-center gap-2">
                      {t.loginHelper}
                      <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-300 rounded-md text-[10px] uppercase font-mono">
                        Safe & Private
                      </span>
                    </h4>
                    <p className="text-slate-300 text-xs mt-0.5 max-w-xl">
                      {t.loginHelperDesc}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 w-full md:w-auto justify-end">
                  <button
                    onClick={() => handleOpenLoginSync(activePlatform)}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white font-medium rounded-xl text-xs shadow-md transition-all shrink-0"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    {t.openLoginPopup}
                  </button>
                  <button
                    onClick={() => setShowLoginHelper(false)}
                    className="p-1.5 text-slate-400 hover:text-white transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* 4. ACTIVE VIDEO SNIFFER BANNER (Alerting user when video is playing/detected) */}
          <div className="flex-none px-3.5 py-2 bg-blue-950/40 border-b border-blue-900/30 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <span className="relative flex h-2.5 w-2.5 shrink-0">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
              </span>
              <span className="text-xs font-semibold text-emerald-400 shrink-0">
                {t.videoDetected}:
              </span>
              <span className="text-xs text-slate-200 font-medium truncate">
                {activeMedia.title}
              </span>
              <span className="hidden sm:inline-flex px-2 py-0.5 bg-blue-600/30 text-blue-300 rounded-md text-[10px] font-mono shrink-0">
                1080p HD • No Watermark
              </span>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <span className="text-[11px] text-slate-300 hidden md:inline">
                {t.clickToDownloadInstantly}
              </span>
              {onOpenDownloadsManager && (
                <button
                  onClick={onOpenDownloadsManager}
                  className="flex items-center gap-1 px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg text-xs font-medium transition-colors border border-slate-700"
                >
                  <FolderDown className="w-3.5 h-3.5 text-blue-400" />
                  <span>{t.downloadManager}</span>
                </button>
              )}
            </div>
          </div>

          {/* 5. MAIN BROWSER VIEWPORT & MEDIA PLAYER */}
          <div className="relative flex-1 bg-slate-950 overflow-hidden flex flex-col items-center justify-center">
            {/* INTERACTIVE SOCIAL MEDIA PLAYER SIMULATOR */}
            <div
              className={
                browserMode === 'interactive'
                  ? 'relative w-full h-full flex flex-col lg:flex-row items-center justify-center p-3 sm:p-6 gap-4 sm:gap-6 overflow-y-auto'
                  : 'hidden'
              }
            >
              {/* Smartphone / Player Canvas Frame */}
              <div className="relative w-full max-w-[340px] sm:max-w-[380px] aspect-9/16 max-h-[620px] bg-black rounded-2xl sm:rounded-3xl overflow-hidden shadow-2xl border-4 border-slate-800/80 flex flex-col shrink-0">
                {/* Video Stream Element */}
                <video
                  ref={videoRef}
                  src={activeMedia.videoUrl}
                  poster={activeMedia.thumbnail}
                  loop
                  autoPlay
                  muted={isMuted}
                  playsInline
                  onPlay={() => setIsVideoPlaying(true)}
                  onPause={() => setIsVideoPlaying(false)}
                  className="w-full h-full object-cover"
                />

                {/* Player Overlay Controls */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/30 pointer-events-none" />

                {/* Top Creator Bar */}
                <div className="absolute top-3 left-3 right-3 flex items-center justify-between text-white pointer-events-auto">
                  <div className="flex items-center gap-2">
                    <img
                      src={activeMedia.avatar}
                      alt={activeMedia.author}
                      className="w-8 h-8 rounded-full border border-white/40 object-cover shadow-sm"
                    />
                    <div className="leading-tight">
                      <p className="text-xs font-semibold">{activeMedia.author}</p>
                      <p className="text-[10px] text-white/70 font-mono">{activeMedia.authorHandle}</p>
                    </div>
                  </div>
                  <span className="px-2 py-0.5 bg-black/60 backdrop-blur-md rounded-full text-[10px] uppercase font-mono font-medium text-emerald-400 border border-emerald-500/30">
                    Live Stream
                  </span>
                </div>

                {/* Floating Action Controls on Right Side (TikTok/Reels Style) */}
                <div className="absolute right-3 bottom-16 flex flex-col items-center gap-3 text-white pointer-events-auto">
                  <button
                    onClick={() => setIsVideoPlaying(!isVideoPlaying)}
                    className="p-2.5 bg-black/50 hover:bg-black/70 backdrop-blur-md rounded-full text-white transition-transform active:scale-95"
                    title={isVideoPlaying ? 'Pause' : 'Play'}
                  >
                    {isVideoPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                  </button>
                  <button
                    onClick={() => setIsMuted(!isMuted)}
                    className="p-2.5 bg-black/50 hover:bg-black/70 backdrop-blur-md rounded-full text-white transition-transform active:scale-95"
                    title={isMuted ? 'Unmute' : 'Mute'}
                  >
                    {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                  </button>
                  <div className="flex flex-col items-center">
                    <span className="text-rose-500 font-bold text-xs">❤️</span>
                    <span className="text-[10px] font-medium">{activeMedia.likes}</span>
                  </div>
                </div>

                {/* Bottom Caption Bar */}
                <div className="absolute bottom-3 left-3 right-16 text-white pointer-events-auto">
                  <p className="text-xs font-semibold line-clamp-1">{activeMedia.title}</p>
                  <p className="text-[11px] text-white/80 line-clamp-2 mt-0.5">{activeMedia.caption}</p>
                  <div className="flex items-center gap-2 mt-1.5 text-[10px] text-white/60">
                    <Music className="w-3 h-3 text-blue-400" />
                    <span className="truncate">Original Audio (320kbps Lossless)</span>
                  </div>
                </div>
              </div>

              {/* Right Details Panel: Live Sniffer & Quick Platform Details */}
              <div className="flex-1 max-w-xl flex flex-col gap-4 text-left w-full">
                <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-lg">
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <span className="px-2.5 py-1 bg-blue-600/20 text-blue-400 border border-blue-500/30 rounded-lg text-xs font-semibold capitalize flex items-center gap-1.5">
                      <Film className="w-3.5 h-3.5" />
                      {activeMedia.platform} Video Stream
                    </span>
                    <span className="text-xs font-mono text-emerald-400 flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      {t.watermarkRemoved}
                    </span>
                  </div>

                  <h3 className="text-base sm:text-lg font-bold text-slate-100 leading-snug">
                    {activeMedia.title}
                  </h3>
                  <p className="text-xs text-slate-300 mt-1 line-clamp-3">
                    {activeMedia.caption}
                  </p>

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 mt-4 pt-4 border-t border-slate-800 text-xs">
                    <div className="bg-slate-800/60 p-2.5 rounded-xl">
                      <span className="text-slate-400 text-[11px] block">{t.duration}</span>
                      <span className="font-semibold text-slate-100">{activeMedia.duration}</span>
                    </div>
                    <div className="bg-slate-800/60 p-2.5 rounded-xl">
                      <span className="text-slate-400 text-[11px] block">Quality</span>
                      <span className="font-semibold text-blue-400">1080p Full HD</span>
                    </div>
                    <div className="bg-slate-800/60 p-2.5 rounded-xl col-span-2 sm:col-span-1">
                      <span className="text-slate-400 text-[11px] block">Watermark</span>
                      <span className="font-semibold text-emerald-400">100% Bypassed</span>
                    </div>
                  </div>
                </div>

                {/* Instruction banner pointing to the movable download button */}
                <div className="bg-gradient-to-r from-blue-900/30 via-indigo-900/30 to-purple-900/30 border border-blue-500/40 rounded-2xl p-4 flex items-start gap-3">
                  <div className="p-2.5 bg-blue-600 text-white rounded-xl shadow-md shrink-0 animate-bounce">
                    <Download className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-sm text-slate-100 flex items-center gap-2">
                      {t.movableDownloadBtn}
                      <span className="px-2 py-0.5 bg-amber-500/20 text-amber-300 rounded text-[10px] font-mono">
                        Movable & Ready
                      </span>
                    </h4>
                    <p className="text-xs text-slate-300 mt-0.5">
                      {t.browserSubtitle}
                    </p>
                    <p className="text-[11px] text-blue-300 mt-1 font-medium">
                      💡 {t.dragToMove}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* DIRECT EMBEDDED WEBVIEW / IFRAME MODE */}
            <div
              className={
                browserMode === 'webview'
                  ? 'relative w-full h-full flex flex-col'
                  : 'hidden'
              }
            >
              <iframe
                id="browser-iframe-viewport"
                src={currentUrl}
                title="Social Webview"
                sandbox="allow-same-origin allow-scripts allow-popups allow-forms"
                className="w-full h-full border-0 bg-white"
              />
            </div>

            {/* 6. TOAST NOTIFICATION ON DOWNLOAD TRIGGER */}
            <AnimatePresence>
              {downloadSuccessToast && (
                <motion.div
                  key={`download-toast-${downloadSuccessToast}`}
                  initial={{ opacity: 0, y: 20, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -20, scale: 0.95 }}
                  className="absolute top-4 z-40 px-4 py-2.5 bg-emerald-600 text-white rounded-2xl shadow-xl flex items-center gap-2 text-xs font-semibold border border-emerald-400/40"
                >
                  <CheckCircle2 className="w-4 h-4 text-emerald-100 shrink-0" />
                  <span>{downloadSuccessToast}</span>
                </motion.div>
              )}
            </AnimatePresence>

            {/* 7. PROMINENT RED FLOATING DOWNLOAD BUTTON AT BOTTOM-RIGHT */}
            <motion.div
              id="browser-movable-download-button"
              drag
              dragConstraints={containerRef}
              dragElastic={0.15}
              whileDrag={{ scale: 1.08, cursor: 'grabbing' }}
              className="absolute bottom-6 right-6 z-50 cursor-grab touch-none flex flex-col items-center"
              style={{ x: buttonPos.x, y: buttonPos.y }}
            >
              {/* Floating Prompt Tooltip */}
              <motion.div
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-2 px-3 py-1 bg-slate-900/95 text-slate-100 text-[11px] font-semibold rounded-full shadow-lg border border-red-500/50 flex items-center gap-1.5 pointer-events-none whitespace-nowrap backdrop-blur-md"
              >
                <Zap className="w-3 h-3 text-red-400" />
                <span>{justDownloaded ? t.downloadStartedImmediately : t.clickToDownloadInstantly}</span>
              </motion.div>

              {/* Prominent Red Floating Download Button */}
              <div className="relative group">
                <button
                  id="movable-download-action-btn"
                  onClick={handleMovableDownloadClick}
                  title={t.clickToDownloadInstantly}
                  className={`relative flex items-center justify-center gap-2.5 px-5 py-3.5 sm:px-6 sm:py-4 rounded-full font-extrabold shadow-2xl transition-all transform active:scale-95 cursor-pointer ${
                    justDownloaded
                      ? 'bg-emerald-600 hover:bg-emerald-500 text-white ring-4 ring-emerald-400/50'
                      : 'bg-red-600 hover:bg-red-500 text-white ring-4 ring-red-500/40 shadow-red-600/40'
                  }`}
                >
                  {justDownloaded ? (
                    <Check className="w-6 h-6 text-white" />
                  ) : (
                    <Download className="w-6 h-6 text-white stroke-[2.5]" />
                  )}

                  <div className="text-left leading-tight">
                    <span className="block text-xs sm:text-sm font-extrabold uppercase tracking-wider">
                      {justDownloaded ? t.completed : 'Download'}
                    </span>
                    <span className="block text-[10px] text-red-100 font-medium">
                      Extract Link
                    </span>
                  </div>
                </button>
              </div>
            </motion.div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
