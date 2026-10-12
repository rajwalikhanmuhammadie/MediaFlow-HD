import React, { useState, useRef, useEffect, useCallback } from 'react';
import { ChevronLeft, ChevronRight, Play, Pause } from 'lucide-react';
import { Language } from '../types';

interface DoubleTapSeekOverlayProps {
  onSeek: (deltaSeconds: number) => void;
  onTogglePlay: () => void;
  lang?: Language;
  disabled?: boolean;
  className?: string;
  children?: React.ReactNode;
}

export const DoubleTapSeekOverlay: React.FC<DoubleTapSeekOverlayProps> = ({
  onSeek,
  onTogglePlay,
  lang = 'en',
  disabled = false,
  className = '',
  children,
}) => {
  // Active seek animation state
  const [activeSide, setActiveSide] = useState<'left' | 'right' | null>(null);
  const [accumulatedSeconds, setAccumulatedSeconds] = useState<number>(0);
  const [rippleKey, setRippleKey] = useState<number>(0);
  const [centerIcon, setCenterIcon] = useState<'play' | 'pause' | null>(null);

  // Timers and gesture tracking
  const singleTapTimerRef = useRef<number | null>(null);
  const dismissTimerRef = useRef<number | null>(null);
  const centerIconTimerRef = useRef<number | null>(null);
  const lastTapRef = useRef<{ time: number; x: number; side: 'left' | 'right' | 'center' } | null>(null);
  const lastTouchTimeRef = useRef<number>(0);
  const accumulatedSecRef = useRef<number>(0);

  // Clear timers on unmount
  useEffect(() => {
    return () => {
      if (singleTapTimerRef.current) clearTimeout(singleTapTimerRef.current);
      if (dismissTimerRef.current) clearTimeout(dismissTimerRef.current);
      if (centerIconTimerRef.current) clearTimeout(centerIconTimerRef.current);
    };
  }, []);

  const triggerHaptic = useCallback(() => {
    try {
      if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
        navigator.vibrate?.([20, 30, 20]);
      }
    } catch {
      // Ignore haptic failures
    }
  }, []);

  const handleSeekGesture = useCallback(
    (side: 'left' | 'right') => {
      // Clear single tap timer since this is a double-tap
      if (singleTapTimerRef.current) {
        clearTimeout(singleTapTimerRef.current);
        singleTapTimerRef.current = null;
      }

      triggerHaptic();

      const delta = side === 'left' ? -10 : 10;
      onSeek(delta);

      // Accumulate 10s, 20s, 30s for rapid consecutive taps like YouTube
      const newSec = (activeSide === side ? accumulatedSecRef.current : 0) + 10;
      accumulatedSecRef.current = newSec;
      setAccumulatedSeconds(newSec);
      setActiveSide(side);
      setRippleKey((prev) => prev + 1);

      // Reset auto-dismiss timer
      if (dismissTimerRef.current) {
        clearTimeout(dismissTimerRef.current);
      }
      dismissTimerRef.current = window.setTimeout(() => {
        setActiveSide(null);
        setAccumulatedSeconds(0);
        accumulatedSecRef.current = 0;
      }, 700);
    },
    [activeSide, onSeek, triggerHaptic]
  );

  const handleTapCoordinate = useCallback(
    (clientX: number, containerRect: DOMRect) => {
      if (disabled) return;

      const now = Date.now();
      const relativeX = clientX - containerRect.left;
      const width = containerRect.width;
      if (width <= 0) return;

      const ratio = relativeX / width;
      // 0 - 38% = Left Double-Tap (Rewind 10s)
      // 62% - 100% = Right Double-Tap (Forward 10s)
      // 38% - 62% = Center (Single tap toggle play/pause)
      const currentSide: 'left' | 'right' | 'center' =
        ratio < 0.38 ? 'left' : ratio > 0.62 ? 'right' : 'center';

      const lastTap = lastTapRef.current;
      const timeDiff = lastTap ? now - lastTap.time : Infinity;

      // Check if this tap constitutes a double-tap on the left or right side
      if (
        lastTap &&
        timeDiff < 320 &&
        (currentSide === 'left' || currentSide === 'right') &&
        (lastTap.side === currentSide || activeSide === currentSide)
      ) {
        // Double-Tap (or Triple/Quadruple Tap) detected!
        lastTapRef.current = { time: now, x: relativeX, side: currentSide };
        handleSeekGesture(currentSide);
      } else {
        // First tap: register and debounce for potential double-tap
        lastTapRef.current = { time: now, x: relativeX, side: currentSide };

        if (singleTapTimerRef.current) {
          clearTimeout(singleTapTimerRef.current);
        }

        // If center side, short delay for immediate play/pause
        const debounceDelay = currentSide === 'center' ? 180 : 300;

        singleTapTimerRef.current = window.setTimeout(() => {
          // If no second tap arrived, execute single tap action (Toggle Play/Pause)
          onTogglePlay();
          lastTapRef.current = null;
        }, debounceDelay);
      }
    },
    [disabled, activeSide, handleSeekGesture, onTogglePlay]
  );

  // Mouse / Pointer Click Handler
  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    // Only process primary pointer (left click / touch)
    if (e.button !== 0 && e.pointerType === 'mouse') return;

    // Avoid reacting if clicking an interactive control inside children
    const target = e.target as HTMLElement;
    if (
      target.closest('button') ||
      target.closest('input') ||
      target.closest('a') ||
      target.closest('[data-no-seek="true"]')
    ) {
      return;
    }

    const rect = e.currentTarget.getBoundingClientRect();
    handleTapCoordinate(e.clientX, rect);
  };

  const getSeekLabel = (side: 'left' | 'right', sec: number) => {
    if (lang === 'ur') {
      return side === 'left' ? `${sec} سیکنڈ پیچھے` : `${sec} سیکنڈ آگے`;
    }
    return side === 'left' ? `${sec} seconds` : `${sec} seconds`;
  };

  return (
    <div
      onPointerDown={handlePointerDown}
      className={`relative w-full h-full overflow-hidden select-none touch-manipulation ${className}`}
      style={{ touchAction: 'manipulation' }}
      id="double-tap-seek-container"
    >
      {/* Underlying Video or Children */}
      {children}

      {/* LEFT DOUBLE-TAP REWIND RIPPLE OVERLAY (-10s, -20s...) */}
      {activeSide === 'left' && (
        <div
          key={`seek_left_${rippleKey}`}
          className="absolute inset-y-0 left-0 w-1/2 flex items-center justify-center pointer-events-none z-30 overflow-hidden"
          id="double-tap-seek-left-overlay"
        >
          {/* Semi-circular curved ripple container */}
          <div className="absolute inset-y-0 left-0 w-full bg-gradient-to-r from-white/20 via-white/10 to-transparent rounded-r-full backdrop-blur-xs flex flex-col items-center justify-center animate-fade-in pr-6">
            <div className="flex items-center gap-0.5 text-[#FFCC00] animate-bounce">
              <ChevronLeft className="w-8 h-8 stroke-[3] -mr-3 opacity-60" />
              <ChevronLeft className="w-9 h-9 stroke-[3] -mr-3 opacity-80" />
              <ChevronLeft className="w-10 h-10 stroke-[3]" />
            </div>
            <span className="text-xs sm:text-sm font-extrabold text-white mt-1.5 font-mono drop-shadow-[0_2px_8px_rgba(0,0,0,0.8)] tracking-wide bg-black/60 px-3 py-1 rounded-full border border-white/20">
              {getSeekLabel('left', accumulatedSeconds)}
            </span>
          </div>
        </div>
      )}

      {/* RIGHT DOUBLE-TAP FORWARD RIPPLE OVERLAY (+10s, +20s...) */}
      {activeSide === 'right' && (
        <div
          key={`seek_right_${rippleKey}`}
          className="absolute inset-y-0 right-0 w-1/2 flex items-center justify-center pointer-events-none z-30 overflow-hidden"
          id="double-tap-seek-right-overlay"
        >
          {/* Semi-circular curved ripple container */}
          <div className="absolute inset-y-0 right-0 w-full bg-gradient-to-l from-white/20 via-white/10 to-transparent rounded-l-full backdrop-blur-xs flex flex-col items-center justify-center animate-fade-in pl-6">
            <div className="flex items-center gap-0.5 text-[#FFCC00] animate-bounce">
              <ChevronRight className="w-10 h-10 stroke-[3]" />
              <ChevronRight className="w-9 h-9 stroke-[3] -ml-3 opacity-80" />
              <ChevronRight className="w-8 h-8 stroke-[3] -ml-3 opacity-60" />
            </div>
            <span className="text-xs sm:text-sm font-extrabold text-white mt-1.5 font-mono drop-shadow-[0_2px_8px_rgba(0,0,0,0.8)] tracking-wide bg-black/60 px-3 py-1 rounded-full border border-white/20">
              {getSeekLabel('right', accumulatedSeconds)}
            </span>
          </div>
        </div>
      )}
    </div>
  );
};
