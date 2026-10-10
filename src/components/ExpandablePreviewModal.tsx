import React, { useRef, useState, useEffect, useCallback } from 'react';
import { 
  X, 
  ArrowLeft,
  Play, 
  Pause, 
  Volume2, 
  VolumeX, 
  Maximize2, 
  Minimize2, 
  RotateCw,
  RotateCcw,
  ZoomIn, 
  ZoomOut, 
  RefreshCw, 
  Download, 
  FastForward, 
  Repeat, 
  Tv, 
  Image as ImageIcon, 
  Film, 
  Copy, 
  Check, 
  ExternalLink,
  Smartphone,
  ShieldCheck,
  Sparkles,
  Move
} from 'lucide-react';
import { MediaResult, Language, DownloadOption } from '../types';
import { translations } from '../data/translations';
import { triggerBrowserDownload } from '../utils/urlParser';

interface ExpandablePreviewModalProps {
  media: MediaResult | null;
  lang: Language;
  isOpen: boolean;
  onClose: () => void;
  onDownloadPrimary: () => void;
  onDownloadOption?: (option: DownloadOption) => void;
  initialMode?: 'video' | 'image';
}

export const ExpandablePreviewModal: React.FC<ExpandablePreviewModalProps> = ({
  media,
  lang,
  isOpen,
  onClose,
  onDownloadPrimary,
  onDownloadOption,
  initialMode,
}) => {
  const t = translations[lang];
  const modalContainerRef = useRef<HTMLDivElement>(null);
  
  // Mode: 'video' | 'image'
  const [activeTab, setActiveTab] = useState<'video' | 'image'>('video');

  // Video State
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [isLooping, setIsLooping] = useState(false);
  const [isPiPActive, setIsPiPActive] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [hasVideoError, setHasVideoError] = useState(false);
  const [activeSourceIndex, setActiveSourceIndex] = useState(0);

  // Image Viewer State
  const [zoomLevel, setZoomLevel] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [isFlippedH, setIsFlippedH] = useState(false);
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [copiedLink, setCopiedLink] = useState(false);

  // Video sources
  const fallbackVideos = [
    media?.videoUrl,
    media?.originalUrl ? `/api/stream?url=${encodeURIComponent(media.originalUrl)}&format=video` : undefined,
  ].filter(Boolean) as string[];

  // Initialize or reset view on open/change
  useEffect(() => {
    if (isOpen && media) {
      if (initialMode) {
        setActiveTab(initialMode);
      } else {
        setActiveTab(media.isVideo ? 'video' : 'image');
      }
      // Reset Image state
      setZoomLevel(1);
      setRotation(0);
      setIsFlippedH(false);
      setPanOffset({ x: 0, y: 0 });
      // Reset Video state
      setActiveSourceIndex(0);
      setHasVideoError(false);
      setIsPlaying(false);
    }
  }, [isOpen, media, initialMode]);

  // Autoplay video when modal opens in video mode
  useEffect(() => {
    if (isOpen && activeTab === 'video' && videoRef.current) {
      const playPromise = videoRef.current.play();
      if (playPromise !== undefined) {
        playPromise
          .then(() => setIsPlaying(true))
          .catch(() => setIsPlaying(false));
      }
    }
  }, [isOpen, activeTab, activeSourceIndex]);

  // Handle Global Keyboard Controls (Esc, Space, F, +, -, 0, R)
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Avoid intercepting if user is typing in an input
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes((e.target as HTMLElement)?.tagName)) {
        return;
      }

      if (e.key === 'Escape') {
        onClose();
      } else if (e.code === 'Space') {
        e.preventDefault();
        if (activeTab === 'video') {
          togglePlay();
        }
      } else if (e.key === 'f' || e.key === 'F') {
        e.preventDefault();
        toggleFullscreen();
      } else if (e.key === 'm' || e.key === 'M') {
        if (activeTab === 'video') {
          toggleMute();
        }
      } else if (e.key === '+' || e.key === '=') {
        if (activeTab === 'image') {
          handleZoomIn();
        }
      } else if (e.key === '-' || e.key === '_') {
        if (activeTab === 'image') {
          handleZoomOut();
        }
      } else if (e.key === '0') {
        if (activeTab === 'image') {
          handleResetImage();
        }
      } else if (e.key === 'r' || e.key === 'R') {
        if (activeTab === 'image') {
          handleRotateCw();
        }
      } else if (e.key === 'ArrowRight' && activeTab === 'video' && videoRef.current) {
        videoRef.current.currentTime = Math.min(videoRef.current.duration || 0, videoRef.current.currentTime + 5);
      } else if (e.key === 'ArrowLeft' && activeTab === 'video' && videoRef.current) {
        videoRef.current.currentTime = Math.max(0, videoRef.current.currentTime - 5);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, activeTab, isPlaying, zoomLevel, rotation]);

  // Support mobile hardware back button when preview modal is open
  useEffect(() => {
    if (!isOpen) return;
    try {
      window.history.pushState({ mediaflowExpandablePreview: true }, '');
    } catch {}

    const handlePopState = () => {
      onClose();
    };

    window.addEventListener('popstate', handlePopState);
    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, [isOpen]);

  if (!isOpen || !media) return null;

  // --- Video Handlers ---
  const handleVideoError = () => {
    if (activeSourceIndex < fallbackVideos.length - 1) {
      setActiveSourceIndex(prev => prev + 1);
    } else {
      setHasVideoError(true);
      setIsPlaying(false);
    }
  };

  const togglePlay = () => {
    if (!videoRef.current) return;
    if (isPlaying) {
      videoRef.current.pause();
      setIsPlaying(false);
    } else {
      const p = videoRef.current.play();
      if (p !== undefined) {
        p.then(() => setIsPlaying(true)).catch(() => setIsPlaying(false));
      }
    }
  };

  const handleTimeUpdate = () => {
    if (videoRef.current) {
      setCurrentTime(videoRef.current.currentTime);
      setDuration(videoRef.current.duration || 0);
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = parseFloat(e.target.value);
    if (videoRef.current) {
      videoRef.current.currentTime = time;
      setCurrentTime(time);
    }
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    setVolume(val);
    if (videoRef.current) {
      videoRef.current.volume = val;
      setIsMuted(val === 0);
    }
  };

  const toggleMute = () => {
    if (!videoRef.current) return;
    if (isMuted) {
      videoRef.current.muted = false;
      setIsMuted(false);
      videoRef.current.volume = volume || 1;
    } else {
      videoRef.current.muted = true;
      setIsMuted(true);
    }
  };

  const changeSpeed = () => {
    const rates = [0.5, 0.75, 1, 1.25, 1.5, 2];
    const nextIdx = (rates.indexOf(playbackRate) + 1) % rates.length;
    const nextRate = rates[nextIdx];
    setPlaybackRate(nextRate);
    if (videoRef.current) {
      videoRef.current.playbackRate = nextRate;
    }
  };

  const toggleLoop = () => {
    setIsLooping(prev => !prev);
    if (videoRef.current) {
      videoRef.current.loop = !isLooping;
    }
  };

  const togglePictureInPicture = async () => {
    try {
      if (!videoRef.current) return;
      if (document.pictureInPictureElement) {
        await document.exitPictureInPicture();
        setIsPiPActive(false);
      } else if (document.pictureInPictureEnabled) {
        await videoRef.current.requestPictureInPicture();
        setIsPiPActive(true);
      }
    } catch (e) {
      console.warn('PiP error:', e);
    }
  };

  const toggleFullscreen = () => {
    if (!modalContainerRef.current) return;
    if (!document.fullscreenElement) {
      modalContainerRef.current.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  };

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  // --- Image Viewer Handlers ---
  const handleZoomIn = () => {
    setZoomLevel(prev => Math.min(4, +(prev + 0.25).toFixed(2)));
  };

  const handleZoomOut = () => {
    setZoomLevel(prev => {
      const next = Math.max(0.5, +(prev - 0.25).toFixed(2));
      if (next <= 1) setPanOffset({ x: 0, y: 0 });
      return next;
    });
  };

  const handleResetImage = () => {
    setZoomLevel(1);
    setRotation(0);
    setIsFlippedH(false);
    setPanOffset({ x: 0, y: 0 });
  };

  const handleRotateCw = () => {
    setRotation(prev => (prev + 90) % 360);
  };

  const handleRotateCcw = () => {
    setRotation(prev => (prev - 90 + 360) % 360);
  };

  const handleToggleFlipH = () => {
    setIsFlippedH(prev => !prev);
  };

  // Mouse/Touch Drag for Panning
  const handleMouseDown = (e: React.MouseEvent) => {
    if (zoomLevel <= 1) return;
    setIsDragging(true);
    setDragStart({ x: e.clientX - panOffset.x, y: e.clientY - panOffset.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || zoomLevel <= 1) return;
    setPanOffset({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y,
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Wheel Zoom
  const handleWheel = (e: React.WheelEvent) => {
    if (activeTab !== 'image') return;
    e.preventDefault();
    if (e.deltaY < 0) {
      handleZoomIn();
    } else {
      handleZoomOut();
    }
  };

  const handleCopyImageLink = () => {
    navigator.clipboard.writeText(media.thumbnail);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleDownloadImage = () => {
    const photoOpt = media.downloadOptions.find(o => o.type === 'image' || o.format === 'JPG' || o.format === 'PNG');
    if (photoOpt && onDownloadOption) {
      onDownloadOption(photoOpt);
    } else if (media.thumbnail) {
      triggerBrowserDownload(media.thumbnail, `${media.platform}_photo_${Date.now()}.jpg`).catch(() => {});
    }
  };

  // Best photo option if available
  const photoOption = media.downloadOptions.find(o => o.type === 'image' || o.format === 'JPG' || o.format === 'PNG');

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 md:p-6 bg-slate-950/85 backdrop-blur-md animate-fade-in"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      id="expandable-preview-backdrop"
    >
      <div 
        ref={modalContainerRef}
        className="relative w-full max-w-5xl bg-slate-950 rounded-2xl sm:rounded-3xl overflow-hidden shadow-2xl border border-slate-800 flex flex-col max-h-[92vh]"
        id="expandable-preview-modal"
      >
        {/* Top Header Bar with Prominent Mobile Back Button */}
        <div className="flex items-center justify-between px-3 sm:px-5 py-3 sm:py-3.5 bg-slate-900/95 border-b border-slate-800 z-20 shrink-0 gap-2">
          
          {/* Left: Back Button + Platform & Title */}
          <div className="flex items-center gap-2 sm:gap-2.5 min-w-0 pr-2 flex-1">
            <button
              type="button"
              onClick={onClose}
              id="expandable-preview-back-btn"
              className="px-3 py-1.5 rounded-xl bg-white/15 hover:bg-white/25 active:scale-95 text-white text-xs sm:text-sm font-extrabold flex items-center gap-1.5 border border-white/20 shadow-md cursor-pointer shrink-0 transition-all"
              title={lang === 'ur' ? 'واپس جائیں' : 'Back'}
            >
              <ArrowLeft className="w-4 h-4 text-[#FFCC00]" />
              <span>{lang === 'ur' ? 'واپس' : 'Back'}</span>
            </button>

            <span className="text-[10px] sm:text-xs font-black px-2.5 py-0.5 rounded-full bg-blue-600 text-white shadow-xs uppercase tracking-wider shrink-0">
              {media.platform}
            </span>
            <div className="min-w-0">
              <h3 className="text-xs sm:text-sm font-bold text-white truncate max-w-xs sm:max-w-md md:max-w-lg">
                {media.title}
              </h3>
              <p className="text-[10px] sm:text-xs text-slate-400 font-mono truncate">
                {media.author}
              </p>
            </div>
          </div>

          {/* Center/Right: View Switcher (Video Clip vs HD Image) */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            {media.isVideo && (
              <div className="flex items-center p-1 rounded-xl bg-slate-800 border border-slate-700/80">
                <button
                  onClick={() => setActiveTab('video')}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    activeTab === 'video'
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'text-slate-400 hover:text-white'
                  }`}
                  id="tab-video-btn"
                >
                  <Film className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">{t.videoClip}</span>
                </button>
                <button
                  onClick={() => setActiveTab('image')}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    activeTab === 'image'
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'text-slate-400 hover:text-white'
                  }`}
                  id="tab-image-btn"
                >
                  <ImageIcon className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">{t.hdPhoto}</span>
                </button>
              </div>
            )}

            {/* Fullscreen Modal Toggle */}
            <button
              onClick={toggleFullscreen}
              className="p-1.5 sm:p-2 text-slate-400 hover:text-white rounded-xl bg-slate-800/80 hover:bg-slate-800 transition-colors cursor-pointer"
              title={isFullscreen ? "Exit Fullscreen" : "Fullscreen (F)"}
            >
              {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>

            {/* Close Modal Button */}
            <button
              onClick={onClose}
              className="p-1.5 sm:p-2 text-slate-400 hover:text-white rounded-xl bg-slate-800/80 hover:bg-slate-800 transition-colors cursor-pointer"
              title={t.close}
              id="close-expandable-preview-btn"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

        </div>

        {/* Main Display Stage */}
        <div className="relative flex-1 bg-black flex items-center justify-center min-h-[320px] sm:min-h-[440px] md:min-h-[500px] overflow-hidden select-none">
          
          {/* 1. VIDEO VIEW */}
          {activeTab === 'video' && (
            <div className="relative w-full h-full flex items-center justify-center">
              {!hasVideoError ? (
                <video
                  ref={videoRef}
                  key={`preview_video_${activeSourceIndex}_${fallbackVideos[activeSourceIndex] || ''}`}
                  src={fallbackVideos[activeSourceIndex]}
                  poster={media.thumbnail}
                  onTimeUpdate={handleTimeUpdate}
                  onEnded={() => setIsPlaying(false)}
                  onError={handleVideoError}
                  onClick={togglePlay}
                  className="max-h-[68vh] w-auto max-w-full object-contain cursor-pointer"
                  playsInline
                  preload="metadata"
                />
              ) : (
                <div className="flex flex-col items-center justify-center p-8 text-center text-slate-400">
                  <img 
                    src={media.thumbnail} 
                    alt={media.title} 
                    className="w-48 h-28 object-cover rounded-xl mb-4 border border-slate-700 opacity-60" 
                  />
                  <p className="text-sm font-bold text-white mb-1">
                    {lang === 'ur' ? 'ویڈیو لوڈ نہیں ہو سکی' : 'Video stream unavailable'}
                  </p>
                  <p className="text-xs text-slate-400 max-w-xs mb-4">
                    {lang === 'ur' 
                      ? 'براہ کرم براہ راست ڈاؤن لوڈ کے بٹن پر کلک کر کے ویڈیو محفوظ کریں۔' 
                      : 'You can still download the video directly to your device.'}
                  </p>
                  <button
                    onClick={onDownloadPrimary}
                    className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-all cursor-pointer"
                  >
                    {t.startDownload}
                  </button>
                </div>
              )}

              {/* Big Center Play Ripple Button if paused */}
              {!isPlaying && !hasVideoError && (
                <button
                  onClick={togglePlay}
                  className="absolute inset-0 m-auto w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-blue-600/90 text-white flex items-center justify-center shadow-2xl hover:scale-110 active:scale-95 transition-transform cursor-pointer border border-white/20"
                >
                  <Play className="w-8 h-8 sm:w-10 sm:h-10 fill-white ml-1.5" />
                </button>
              )}
            </div>
          )}

          {/* 2. FULL-SCREEN IMAGE VIEWER (PHOTOS & HIGH-RES ART) */}
          {activeTab === 'image' && (
            <div 
              className={`relative w-full h-full min-h-[360px] sm:min-h-[460px] flex items-center justify-center overflow-hidden ${
                zoomLevel > 1 ? 'cursor-grab active:cursor-grabbing' : 'cursor-default'
              }`}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
              onWheel={handleWheel}
            >
              <div 
                className="transition-transform duration-100 ease-out will-change-transform flex items-center justify-center"
                style={{
                  transform: `translate(${panOffset.x}px, ${panOffset.y}px) scale(${zoomLevel}) rotate(${rotation}deg) scaleX(${isFlippedH ? -1 : 1})`,
                }}
              >
                <img
                  src={media.thumbnail}
                  alt={media.title}
                  className="max-h-[68vh] max-w-[85vw] object-contain rounded-lg shadow-2xl pointer-events-none select-none"
                  referrerPolicy="no-referrer"
                  draggable={false}
                />
              </div>

              {/* Zoom & Pan Overlay Indicator */}
              {zoomLevel > 1 && (
                <div className="absolute top-4 left-4 px-3 py-1.5 rounded-xl bg-slate-900/80 backdrop-blur-md border border-slate-700 text-white text-xs font-mono flex items-center gap-2 shadow-lg">
                  <Move className="w-3.5 h-3.5 text-blue-400" />
                  <span>{Math.round(zoomLevel * 100)}% • Drag to Pan</span>
                </div>
              )}
            </div>
          )}

        </div>

        {/* Bottom Control Bar */}
        
        {/* If Active Tab is Video: Show Scrub Bar & Video Controls */}
        {activeTab === 'video' && (
          <div className="bg-slate-900 border-t border-slate-800 p-3 sm:p-4 flex flex-col gap-2.5 z-20 shrink-0">
            
            {/* Scrubber Range */}
            <div className="flex items-center gap-2 sm:gap-3">
              <span className="text-[10px] sm:text-xs font-mono text-slate-400 w-9 sm:w-10 text-right font-semibold">
                {formatTime(currentTime)}
              </span>

              <input
                type="range"
                min={0}
                max={duration || 100}
                value={currentTime}
                onChange={handleSeek}
                className="flex-1 h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
              />

              <span className="text-[10px] sm:text-xs font-mono text-slate-400 w-9 sm:w-10 font-semibold">
                {formatTime(duration)}
              </span>
            </div>

            {/* Buttons Row */}
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div className="flex items-center gap-1 sm:gap-2">
                
                {/* Play/Pause */}
                <button
                  onClick={togglePlay}
                  className="p-2 text-white hover:text-blue-400 rounded-xl hover:bg-slate-800 transition-colors cursor-pointer min-h-[36px] min-w-[36px] flex items-center justify-center"
                  title={isPlaying ? "Pause (Space)" : "Play (Space)"}
                >
                  {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 fill-current" />}
                </button>

                {/* Volume & Mute */}
                <div className="hidden xs:flex items-center gap-1 group px-1">
                  <button 
                    onClick={toggleMute} 
                    className="p-1.5 text-slate-400 hover:text-white cursor-pointer"
                    title={isMuted ? "Unmute (M)" : "Mute (M)"}
                  >
                    {isMuted ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4" />}
                  </button>
                  <input
                    type="range"
                    min={0}
                    max={1}
                    step={0.05}
                    value={isMuted ? 0 : volume}
                    onChange={handleVolumeChange}
                    className="w-14 sm:w-20 h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
                  />
                </div>

                {/* Speed Selector */}
                <button
                  onClick={changeSpeed}
                  className="px-2 sm:px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-[11px] sm:text-xs font-mono font-bold text-slate-200 border border-slate-700 cursor-pointer"
                  title="Playback Speed"
                >
                  {playbackRate}x
                </button>

                {/* Loop Video */}
                <button
                  onClick={toggleLoop}
                  className={`p-1.5 sm:p-2 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                    isLooping ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white bg-slate-800/80 hover:bg-slate-800'
                  }`}
                  title={t.loopVideo}
                >
                  <Repeat className="w-4 h-4" />
                </button>

                {/* PiP Mode */}
                {typeof document !== 'undefined' && 'pictureInPictureEnabled' in document && (
                  <button
                    onClick={togglePictureInPicture}
                    className={`p-1.5 sm:p-2 rounded-lg text-xs font-bold transition-colors cursor-pointer hidden sm:flex ${
                      isPiPActive ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white bg-slate-800/80 hover:bg-slate-800'
                    }`}
                    title={t.pipMode}
                  >
                    <Tv className="w-4 h-4" />
                  </button>
                )}

              </div>

              {/* Right: Primary Download Button */}
              <div className="flex items-center gap-2">
                <button
                  onClick={onDownloadPrimary}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-md shadow-blue-500/20 transition-all active:scale-95 cursor-pointer whitespace-nowrap"
                  id="expanded-download-video-btn"
                >
                  <Download className="w-4 h-4" />
                  <span>{t.downloadVideo}</span>
                </button>
              </div>

            </div>

          </div>
        )}

        {/* If Active Tab is Image: Show High-Res Image Manipulation Tools */}
        {activeTab === 'image' && (
          <div className="bg-slate-900 border-t border-slate-800 p-3 sm:p-4 flex flex-col sm:flex-row items-center justify-between gap-3 z-20 shrink-0">
            
            {/* Image Zoom & Manipulation Buttons */}
            <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap justify-center">
              
              {/* Zoom Controls */}
              <div className="flex items-center gap-1 bg-slate-800 p-1 rounded-xl border border-slate-700">
                <button
                  onClick={handleZoomOut}
                  className="p-1.5 text-slate-300 hover:text-white rounded-lg hover:bg-slate-700 transition-colors cursor-pointer disabled:opacity-40"
                  disabled={zoomLevel <= 0.5}
                  title={t.zoomOut}
                >
                  <ZoomOut className="w-4 h-4" />
                </button>
                <span className="text-xs font-mono font-bold text-slate-200 px-2 min-w-[48px] text-center">
                  {Math.round(zoomLevel * 100)}%
                </span>
                <button
                  onClick={handleZoomIn}
                  className="p-1.5 text-slate-300 hover:text-white rounded-lg hover:bg-slate-700 transition-colors cursor-pointer disabled:opacity-40"
                  disabled={zoomLevel >= 4}
                  title={t.zoomIn}
                >
                  <ZoomIn className="w-4 h-4" />
                </button>
              </div>

              {/* Reset Zoom */}
              <button
                onClick={handleResetImage}
                className="px-2.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-bold border border-slate-700 transition-colors cursor-pointer flex items-center gap-1"
                title={t.resetZoom}
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">{t.actualSize}</span>
              </button>

              {/* Rotate Tools */}
              <div className="flex items-center gap-1 bg-slate-800 p-1 rounded-xl border border-slate-700">
                <button
                  onClick={handleRotateCcw}
                  className="p-1.5 text-slate-300 hover:text-white rounded-lg hover:bg-slate-700 transition-colors cursor-pointer"
                  title={t.rotateCounterClockwise}
                >
                  <RotateCcw className="w-4 h-4" />
                </button>
                <button
                  onClick={handleRotateCw}
                  className="p-1.5 text-slate-300 hover:text-white rounded-lg hover:bg-slate-700 transition-colors cursor-pointer"
                  title={t.rotateClockwise}
                >
                  <RotateCw className="w-4 h-4" />
                </button>
              </div>

              {/* Flip Horizontal */}
              <button
                onClick={handleToggleFlipH}
                className={`px-2.5 py-2 rounded-xl text-xs font-bold border transition-colors cursor-pointer ${
                  isFlippedH
                    ? 'bg-blue-600 border-blue-500 text-white'
                    : 'bg-slate-800 border-slate-700 text-slate-300 hover:text-white hover:bg-slate-700'
                }`}
                title="Flip Horizontal"
              >
                Flip
              </button>

            </div>

            {/* Right: Actions (Copy link & Download HD Photo) */}
            <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
              <button
                onClick={handleCopyImageLink}
                className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold border border-slate-700 transition-colors cursor-pointer flex items-center gap-1.5"
                title="Copy Image URL"
              >
                {copiedLink ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                <span className="hidden sm:inline">{copiedLink ? t.copiedImageLink : 'Copy Link'}</span>
              </button>

              <button
                onClick={handleDownloadImage}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-md shadow-blue-500/20 transition-all active:scale-95 cursor-pointer whitespace-nowrap"
                id="expanded-download-photo-btn"
              >
                <Download className="w-4 h-4" />
                <span>{t.downloadPhoto}</span>
              </button>
            </div>

          </div>
        )}

      </div>
    </div>
  );
};
