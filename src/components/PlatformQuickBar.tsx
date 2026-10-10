import React from 'react';
import { Compass } from 'lucide-react';
import { Language, Theme } from '../types';
import { PLATFORMS, PlatformConfig } from '../data/platforms';
import { translations } from '../data/translations';
import { CachedPlatformIcon } from './CachedPlatformIcon';

interface PlatformQuickBarProps {
  lang: Language;
  theme?: Theme;
  onSelectPlatform: (platform: PlatformConfig) => void;
  onOpenGuideForPlatform?: (platform: PlatformConfig) => void;
  onSharePlatform?: (platform: PlatformConfig) => void;
  onOpenBrowserForPlatform?: (platform: PlatformConfig) => void;
  expandedView?: boolean;
}

export const PlatformQuickBar: React.FC<PlatformQuickBarProps> = ({
  lang,
  theme = 'dark',
  onSelectPlatform,
}) => {
  const isLight = theme === 'light';
  const t = translations[lang];

  return (
    <section className="w-full max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-3 px-1">
        <h3
          className={`text-sm font-bold flex items-center gap-2 ${
            isLight ? 'text-slate-900' : 'text-white'
          }`}
        >
          <Compass className="w-4 h-4 text-sky-500" />
          <span>{t.quickPlatforms}</span>
        </h3>
        <span
          className={`text-xs font-mono ${
            isLight ? 'text-slate-500' : 'text-slate-400'
          }`}
        >
          {PLATFORMS.length} {lang === 'ur' ? 'پلیٹ فارمز' : 'platforms'}
        </span>
      </div>

      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2.5">
        {PLATFORMS.map((platform, index) => (
          <button
            key={`quick_bar_platform_${platform.id}_${index}`}
            type="button"
            onClick={() => onSelectPlatform(platform)}
            className={`group flex flex-col items-center justify-center gap-2 p-3 rounded-xl border cursor-pointer transition-all min-h-[76px] active:scale-95 ${
              isLight
                ? 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-800'
                : 'bg-[#0b0f19] hover:bg-slate-800/80 border-slate-800 text-slate-200'
            }`}
            id={`platform-card-${platform.id}`}
            title={lang === 'ur' ? platform.nameUrdu : platform.name}
          >
            <div className="w-9 h-9 rounded-xl flex items-center justify-center shadow-xs group-hover:scale-105 transition-transform">
              <CachedPlatformIcon
                platformId={platform.id}
                iconName={platform.iconName}
                className="w-9 h-9"
              />
            </div>

            <span className="text-xs font-semibold truncate max-w-full leading-tight">
              {lang === 'ur' ? platform.nameUrdu : platform.name}
            </span>
          </button>
        ))}
      </div>
    </section>
  );
};
