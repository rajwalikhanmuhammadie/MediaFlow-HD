import React, { useEffect, useState } from 'react';
import { MediaFlowLogo } from './MediaFlowLogo';

interface SplashScreenProps {
  onComplete?: () => void;
}

/**
 * Full-Screen Animated Splash Screen for MediaFlow HD.
 * Displays on application open/reload with a dark navy background,
 * subtle electric blue & purple ambient gradients, centered master logo,
 * and exact brand title "MediaFlow HD" directly underneath.
 */
export const SplashScreen: React.FC<SplashScreenProps> = ({ onComplete }) => {
  const [isExiting, setIsExiting] = useState(false);
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const prefersReducedMotion =
      typeof window !== 'undefined' &&
      window.matchMedia &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const holdDuration = prefersReducedMotion ? 550 : 1450;
    const fadeDuration = prefersReducedMotion ? 200 : 450;

    const exitTimer = window.setTimeout(() => {
      setIsExiting(true);
    }, holdDuration);

    const unmountTimer = window.setTimeout(() => {
      setIsVisible(false);
      if (onComplete) onComplete();
    }, holdDuration + fadeDuration);

    return () => {
      window.clearTimeout(exitTimer);
      window.clearTimeout(unmountTimer);
    };
  }, [onComplete]);

  if (!isVisible) return null;

  return (
    <div
      id="mediaflow-splash-screen"
      role="status"
      aria-live="polite"
      aria-label="Loading MediaFlow HD"
      className={`fixed inset-0 z-[9999] w-screen h-screen min-h-[100dvh] flex flex-col items-center justify-center overflow-hidden select-none transition-all duration-450 ease-out ${
        isExiting
          ? 'opacity-0 scale-[1.03] pointer-events-none'
          : 'opacity-100 scale-100'
      }`}
      style={{
        background:
          'radial-gradient(circle at 50% 42%, rgba(37, 99, 235, 0.22) 0%, rgba(147, 51, 234, 0.14) 36%, rgba(6, 11, 25, 0.98) 74%), linear-gradient(160deg, #050914 0%, #091126 52%, #110c24 100%)',
      }}
    >
      {/* Subtle Ambient Electric Blue & Purple Glow Orbs */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute w-72 h-72 sm:w-96 sm:h-96 rounded-full blur-3xl opacity-35 animate-pulse"
        style={{
          background:
            'radial-gradient(circle, rgba(56, 189, 248, 0.45) 0%, rgba(147, 51, 234, 0.28) 55%, transparent 75%)',
        }}
      />

      {/* Centered Logo Symbol + Brand Name Container */}
      <div className="relative z-10 flex flex-col items-center justify-center px-6 text-center mediaflow-splash-content">
        {/* Prominent Animated Master Logo Emblem */}
        <div className="relative flex items-center justify-center mb-5 mediaflow-splash-logo-wrap">
          {/* Outer Subtle Halo Ring */}
          <div
            aria-hidden="true"
            className="absolute -inset-3 rounded-[32px] opacity-60 blur-md mediaflow-splash-halo"
            style={{
              background:
                'linear-gradient(135deg, rgba(56, 189, 248, 0.45) 0%, rgba(37, 99, 235, 0.35) 50%, rgba(168, 85, 247, 0.45) 100%)',
            }}
          />
          <MediaFlowLogo
            size={104}
            showText={false}
            animated={true}
            className="relative z-10 drop-shadow-[0_14px_34px_rgba(37,99,235,0.42)]"
          />
        </div>

        {/* Exact Brand Name Directly Underneath */}
        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white mediaflow-splash-title">
          MediaFlow{' '}
          <span className="bg-gradient-to-r from-[#38bdf8] via-[#3b82f6] to-[#a855f7] bg-clip-text text-transparent">
            HD
          </span>
        </h1>

        {/* Minimalist Animated Progress Line */}
        <div
          aria-hidden="true"
          className="mt-5 w-32 sm:w-36 h-1 rounded-full bg-slate-800/80 overflow-hidden border border-white/5"
        >
          <div className="h-full w-full rounded-full bg-gradient-to-r from-[#38bdf8] via-[#3b82f6] to-[#a855f7] mediaflow-splash-bar" />
        </div>
      </div>
    </div>
  );
};
