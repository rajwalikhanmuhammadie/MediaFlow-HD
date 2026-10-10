import React, { useId } from 'react';

interface MediaFlowLogoProps {
  /** Size preset or custom pixel dimension for the icon emblem */
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | number;
  /** Whether to render the "MediaFlow HD" brand name alongside or below the symbol */
  showText?: boolean;
  /** Layout orientation when showText is true */
  layout?: 'horizontal' | 'vertical';
  /** Light theme adaptation for text color */
  isLight?: boolean;
  /** Optional className for outer wrapper */
  className?: string;
  /** Optional className for the brand text */
  textClassName?: string;
  /** Whether to animate subtle internal elements (e.g. on splash/loading screens) */
  animated?: boolean;
}

const SIZE_MAP: Record<'xs' | 'sm' | 'md' | 'lg' | 'xl', number> = {
  xs: 24,
  sm: 34,
  md: 42,
  lg: 64,
  xl: 108,
};

/**
 * Unified Master Brand Logo for MediaFlow HD.
 * Features a modern video play symbol combined with a downward download arrow
 * in a dark navy, electric blue, and purple gradient color scheme.
 */
export const MediaFlowLogo: React.FC<MediaFlowLogoProps> = ({
  size = 'sm',
  showText = false,
  layout = 'horizontal',
  isLight = false,
  className = '',
  textClassName = '',
  animated = false,
}) => {
  const uid = useId().replace(/:/g, '');
  const px = typeof size === 'number' ? size : SIZE_MAP[size];

  const bgId = `mf-bg-${uid}`;
  const glowId = `mf-glow-${uid}`;
  const rimId = `mf-rim-${uid}`;
  const playId = `mf-play-${uid}`;
  const arrowId = `mf-arrow-${uid}`;
  const shadowId = `mf-shadow-${uid}`;

  return (
    <div
      className={`inline-flex items-center ${
        layout === 'vertical' ? 'flex-col justify-center gap-3.5' : 'flex-row gap-2.5'
      } ${className}`}
    >
      <div
        style={{ width: px, height: px }}
        className="relative shrink-0 flex items-center justify-center select-none"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 512 512"
          fill="none"
          className="w-full h-full block overflow-visible"
          role="img"
          aria-label="MediaFlow HD Logo"
        >
          <defs>
            {/* Premium Dark Navy Background Gradient */}
            <linearGradient id={bgId} x1="0" y1="0" x2="512" y2="512" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#060b19" />
              <stop offset="50%" stopColor="#0b132b" />
              <stop offset="100%" stopColor="#140f2d" />
            </linearGradient>

            {/* Subtle Ambient Radial Glow */}
            <radialGradient id={glowId} cx="256" cy="240" r="220" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.32" />
              <stop offset="55%" stopColor="#8b5cf6" stopOpacity="0.16" />
              <stop offset="100%" stopColor="#060b19" stopOpacity="0" />
            </radialGradient>

            {/* Border Rim Gradient (Electric Blue to Purple) */}
            <linearGradient id={rimId} x1="32" y1="32" x2="480" y2="480" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.7" />
              <stop offset="50%" stopColor="#3b82f6" stopOpacity="0.5" />
              <stop offset="100%" stopColor="#a855f7" stopOpacity="0.7" />
            </linearGradient>

            {/* Primary Play Symbol Gradient (Electric Blue to Vibrant Purple) */}
            <linearGradient id={playId} x1="120" y1="100" x2="400" y2="380" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#38bdf8" />
              <stop offset="45%" stopColor="#2563eb" />
              <stop offset="100%" stopColor="#9333ea" />
            </linearGradient>

            {/* Downward Download Arrow Accent Gradient */}
            <linearGradient id={arrowId} x1="256" y1="150" x2="256" y2="400" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#ffffff" />
              <stop offset="65%" stopColor="#e0f2fe" />
              <stop offset="100%" stopColor="#c084fc" />
            </linearGradient>

            {/* Soft Drop Shadow for Central Emblem */}
            <filter id={shadowId} x="-15%" y="-15%" width="130%" height="130%">
              <feDropShadow dx="0" dy="10" stdDeviation="14" floodColor="#1d4ed8" floodOpacity="0.38" />
            </filter>
          </defs>

          {/* Rounded Squircle Icon Base */}
          <rect width="512" height="512" rx="116" fill={`url(#${bgId})`} />
          <rect width="512" height="512" rx="116" fill={`url(#${glowId})`} />
          <rect x="8" y="8" width="496" height="496" rx="108" stroke={`url(#${rimId})`} strokeWidth="6" />

          {/* Unified Emblem: Modern Video Play Triangle + Downward Download Arrow */}
          <g filter={`url(#${shadowId})`}>
            {/* Video Play Symbol Frame */}
            <path
              d="M154 128.5C154 106.8 177.5 93.3 196.3 104.2L378.8 209.7C397.5 220.5 397.5 247.5 378.8 258.3L196.3 363.8C177.5 374.7 154 361.2 154 339.5V128.5Z"
              fill={`url(#${playId})`}
            />

            {/* Inner Cutout / Depth Layer for High-Contrast Download Arrow */}
            <path
              d="M256 164V298M256 298L202 244M256 298L310 244"
              stroke="#070c1b"
              strokeWidth="46"
              strokeLinecap="round"
              strokeLinejoin="round"
              opacity="0.45"
            />

            {/* Downward Download Arrow */}
            <path
              d="M256 160V294M256 294L202 240M256 294L310 240"
              stroke={`url(#${arrowId})`}
              strokeWidth="34"
              strokeLinecap="round"
              strokeLinejoin="round"
              className={animated ? 'mediaflow-arrow-pulse' : undefined}
            />

            {/* Sleek Download Base Tray Underneath */}
            <path
              d="M168 404H344"
              stroke={`url(#${playId})`}
              strokeWidth="28"
              strokeLinecap="round"
            />
            <path
              d="M204 404H308"
              stroke="#e0f2fe"
              strokeWidth="12"
              strokeLinecap="round"
              opacity="0.85"
            />
          </g>
        </svg>
      </div>

      {showText && (
        <span
          className={`font-extrabold tracking-tight whitespace-nowrap select-none ${
            textClassName ||
            (layout === 'vertical'
              ? 'text-2xl sm:text-3xl text-white'
              : `text-base sm:text-lg ${isLight ? 'text-slate-900' : 'text-white'}`)
          }`}
        >
          MediaFlow{' '}
          <span className="bg-gradient-to-r from-[#38bdf8] via-[#3b82f6] to-[#a855f7] bg-clip-text text-transparent">
            HD
          </span>
        </span>
      )}
    </div>
  );
};
