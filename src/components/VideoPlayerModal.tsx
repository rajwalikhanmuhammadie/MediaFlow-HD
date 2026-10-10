import React, { useRef, useState, useEffect } from 'react';
import { 
  X, 
  ArrowLeft,
  Play, 
  Pause, 
  Volume2, 
  VolumeX, 
  Maximize2, 
  Minimize2, 
  RotateCcw, 
  Download, 
  FastForward,
  Layers,
  Sparkles
} from 'lucide-react';
import { MediaResult, Language } from '../types';
import { translations } from '../data/translations';

interface VideoPlayerModalProps {
  media: MediaResult | null;
  lang: Language;
  isOpen?: boolean;
  onClose: () => void;
  onDownloadPrimary: () => void;
}

export const VideoPlayerModal: React.FC<VideoPlayerModalProps> = ({
  media,
  lang,
  isOpen = true,
  onClose,
  onDownloadPrimary,
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [hasError, setHasError] = useState(false);
  const playerContainerRef = useRef<HTMLDivElement>(null);

  const fallbackVideos = [
    media?.videoUrl,
    media?.originalUrl
  ].filter(Boolean) as string[];

  const [activeSourceIndex, setActiveSourceIndex] = useState(0);

  useEffect(() => {
    setActiveSourceIndex(0);
    setHasError(false);
    setIsPlaying(false);
  }, [media?.videoUrl, media?.originalUrl]);

  useEffect(() => {
    if (isOpen && media && videoRef.current) {
      const playPromise = videoRef.current.play();
      if (playPromise !== undefined) {
        playPromise
          .then(() => setIsPlaying(true))
          .catch(() => {
            setIsPlaying(false);
          });
      }
    }
  }, [isOpen, media, activeSourceIndex]);

  useEffect(() => {
    if (!isOpen) return;
    try {
      window.history.pushState({ mediaflowVideoPlayerModal: true }, '');
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
  const t = translations[lang];

  const handleVideoError = () => {
    if (activeSourceIndex < fallbackVideos.length - 1) {
      setActiveSourceIndex(prev => prev + 1);
    } else {
      setHasError(true);
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
    const rates = [0.75, 1, 1.25, 1.5, 2];
    const nextIdx = (rates.indexOf(playbackRate) + 1) % rates.length;
    const nextRate = rates[nextIdx];
    setPlaybackRate(nextRate);
    if (videoRef.current) {
      videoRef.current.playbackRate = nextRate;
    }
  };

  const toggleFullscreen = () => {
    if (!playerContainerRef.current) return;
    if (!document.fullscreenElement) {
      playerContainerRef.current.requestFullscreen().catch(() => {});
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in">
      <div 
        ref={playerContainerRef}
        className="relative w-full max-w-4xl bg-slate-950 rounded-2xl sm:rounded-3xl overflow-hidden shadow-2xl border border-slate-800 flex flex-col"
      >
        {/* Top bar with Prominent Mobile Back Button */}
        <div className="flex items-center justify-between p-3 sm:p-4 bg-gradient-to-b from-black/90 via-black/70 to-transparent absolute top-0 inset-x-0 z-20 gap-2">
          <div className="flex items-center gap-2 min-w-0 pr-2 flex-1">
            <button
              type="button"
              onClick={onClose}
              id="video-player-back-btn"
              className="px-3 py-1.5 rounded-xl bg-white/15 hover:bg-white/25 active:scale-95 text-white text-xs sm:text-sm font-extrabold flex items-center gap-1.5 border border-white/20 shadow-md cursor-pointer shrink-0 transition-all"
              title={lang === 'ur' ? 'واپس جائیں' : 'Back'}
            >
              <ArrowLeft className="w-4 h-4 text-[#FFCC00]" />
              <span>{lang === 'ur' ? 'واپس' : 'Back'}</span>
            </button>
            <span className="text-[10px] sm:text-xs font-bold px-2 sm:px-2.5 py-0.5 rounded-full bg-blue-600 text-white shadow-xs shrink-0">
              {media.platform.toUpperCase()}
            </span>
            <span className="text-xs sm:text-sm font-semibold text-white truncate">
              {media.title}
            </span>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 sm:p-2 text-white/80 hover:text-white rounded-full bg-black/40 hover:bg-black/70 transition-colors shrink-0 cursor-pointer min-h-[32px] min-w-[32px] flex items-center justify-center"
            title={t.close}
            id="close-player-btn"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Video Canvas */}
        <div className="relative bg-black flex items-center justify-center min-h-[240px] sm:min-h-[360px] md:min-h-[440px]">
          {!hasError ? (
            <video
              ref={videoRef}
              key={`player_video_${activeSourceIndex}_${fallbackVideos[activeSourceIndex] || ''}`}
              src={fallbackVideos[activeSourceIndex]}
              poster={media.thumbnail}
              onTimeUpdate={handleTimeUpdate}
              onEnded={() => setIsPlaying(false)}
              onError={handleVideoError}
              onClick={togglePlay}
              className="max-h-[65vh] w-auto max-w-full object-contain cursor-pointer"
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
                className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-all"
              >
                {t.startDownload}
              </button>
            </div>
          )}

          {/* Large Center Play indicator if paused */}
          {!isPlaying && !hasError && (
            <button
              onClick={togglePlay}
              className="absolute inset-0 m-auto w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-blue-600/90 text-white flex items-center justify-center shadow-2xl hover:scale-110 active:scale-95 transition-transform cursor-pointer"
            >
              <Play className="w-7 h-7 sm:w-8 sm:h-8 fill-white ml-1" />
            </button>
          )}
        </div>

        {/* Bottom Custom Video Controls */}
        <div className="bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800 p-2.5 sm:p-4 flex flex-col gap-2 z-20 transition-colors">
          
          {/* Progress Seek bar */}
          <div className="flex items-center gap-2 sm:gap-3">
            <span className="text-[10px] sm:text-xs font-mono text-slate-500 dark:text-slate-400 w-9 sm:w-10 text-right font-semibold">
              {formatTime(currentTime)}
            </span>

            <input
              type="range"
              min={0}
              max={duration || 100}
              value={currentTime}
              onChange={handleSeek}
              className="flex-1 h-2 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-600 dark:accent-blue-500"
            />

            <span className="text-[10px] sm:text-xs font-mono text-slate-500 dark:text-slate-400 w-9 sm:w-10 font-semibold">
              {formatTime(duration)}
            </span>
          </div>

          {/* Buttons Row */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1 sm:gap-3">
              {/* Play/Pause */}
              <button
                onClick={togglePlay}
                className="p-1.5 sm:p-2 text-slate-800 dark:text-slate-100 hover:text-blue-600 dark:hover:text-blue-400 transition-colors cursor-pointer min-h-[32px] min-w-[32px] flex items-center justify-center"
              >
                {isPlaying ? <Pause className="w-4 h-4 sm:w-5 sm:h-5" /> : <Play className="w-4 h-4 sm:w-5 sm:h-5 fill-current" />}
              </button>

              {/* Volume & Mute */}
              <div className="hidden xs:flex items-center gap-1 group">
                <button onClick={toggleMute} className="p-1.5 text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-100 cursor-pointer">
                  {isMuted ? <VolumeX className="w-4 h-4 text-rose-500" /> : <Volume2 className="w-4 h-4" />}
                </button>
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.05}
                  value={isMuted ? 0 : volume}
                  onChange={handleVolumeChange}
                  className="w-12 sm:w-16 h-1.5 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-600 dark:accent-blue-500"
                />
              </div>

              {/* Speed Button */}
              <button
                onClick={changeSpeed}
                className="px-2 sm:px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-[11px] sm:text-xs font-mono font-bold text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 cursor-pointer"
                title="Playback Speed"
              >
                {playbackRate}x
              </button>
            </div>

            {/* Right action tools */}
            <div className="flex items-center gap-1.5 sm:gap-2">
              <button
                onClick={onDownloadPrimary}
                className="flex items-center gap-1.5 px-3 sm:px-4 py-1.5 sm:py-2 rounded-xl bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 text-white text-[11px] sm:text-xs font-bold shadow-md shadow-blue-500/20 transition-all active:scale-95 cursor-pointer whitespace-nowrap"
              >
                <Download className="w-3.5 h-3.5" />
                <span>{t.startDownload}</span>
              </button>

              <button
                onClick={toggleFullscreen}
                className="p-1.5 sm:p-2 text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-100 transition-colors cursor-pointer"
                title="Fullscreen"
              >
                {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
              </button>
            </div>

          </div>

        </div>

      </div>
    </div>
  );
};
