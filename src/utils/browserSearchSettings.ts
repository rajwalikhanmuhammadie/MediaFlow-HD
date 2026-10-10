export type BrowserPlatformId =
  | 'youtube'
  | 'tiktok'
  | 'instagram'
  | 'facebook'
  | 'pinterest'
  | 'twitter'
  | 'soundcloud'
  | 'dailymotion'
  | 'reddit'
  | 'threads'
  | 'snapchat'
  | 'vimeo';

export type BrowserPlatformFilter = 'all' | BrowserPlatformId;

export type BrowserMediaTypeFilter = 'all' | 'video' | 'audio' | 'photo';

export interface BrowserPlatformMeta {
  id: BrowserPlatformId;
  label: string;
  labelUr: string;
  dotColor: string;
  badgeBg: string;
  domain: string;
}

export const ALL_BROWSER_PLATFORMS: BrowserPlatformMeta[] = [
  {
    id: 'youtube',
    label: 'YouTube',
    labelUr: 'YouTube (یوٹیوب)',
    dotColor: 'bg-red-500',
    badgeBg: 'bg-red-600 text-white',
    domain: 'youtube.com',
  },
  {
    id: 'tiktok',
    label: 'TikTok',
    labelUr: 'TikTok (ٹک ٹاک)',
    dotColor: 'bg-cyan-400',
    badgeBg: 'bg-cyan-500 text-slate-950',
    domain: 'tiktok.com',
  },
  {
    id: 'instagram',
    label: 'Instagram',
    labelUr: 'Instagram (انسٹاگرام)',
    dotColor: 'bg-pink-500',
    badgeBg: 'bg-pink-600 text-white',
    domain: 'instagram.com',
  },
  {
    id: 'facebook',
    label: 'Facebook',
    labelUr: 'Facebook (فیس بک)',
    dotColor: 'bg-blue-500',
    badgeBg: 'bg-blue-600 text-white',
    domain: 'facebook.com',
  },
  {
    id: 'pinterest',
    label: 'Pinterest',
    labelUr: 'Pinterest (پنٹرسٹ)',
    dotColor: 'bg-rose-500',
    badgeBg: 'bg-rose-600 text-white',
    domain: 'pinterest.com',
  },
  {
    id: 'twitter',
    label: 'Twitter / X',
    labelUr: 'Twitter / X (ٹوئٹر)',
    dotColor: 'bg-slate-300',
    badgeBg: 'bg-slate-700 text-white',
    domain: 'x.com',
  },
  {
    id: 'soundcloud',
    label: 'SoundCloud',
    labelUr: 'SoundCloud (آڈیو)',
    dotColor: 'bg-orange-500',
    badgeBg: 'bg-orange-600 text-white',
    domain: 'soundcloud.com',
  },
  {
    id: 'dailymotion',
    label: 'Dailymotion',
    labelUr: 'Dailymotion (ڈیلی موشن)',
    dotColor: 'bg-indigo-400',
    badgeBg: 'bg-indigo-600 text-white',
    domain: 'dailymotion.com',
  },
  {
    id: 'reddit',
    label: 'Reddit',
    labelUr: 'Reddit (ریڈٹ)',
    dotColor: 'bg-orange-600',
    badgeBg: 'bg-orange-700 text-white',
    domain: 'reddit.com',
  },
  {
    id: 'threads',
    label: 'Threads',
    labelUr: 'Threads (تھریڈز)',
    dotColor: 'bg-emerald-400',
    badgeBg: 'bg-emerald-600 text-white',
    domain: 'threads.net',
  },
  {
    id: 'snapchat',
    label: 'Snapchat',
    labelUr: 'Snapchat (سنیپ چیٹ)',
    dotColor: 'bg-yellow-400',
    badgeBg: 'bg-yellow-400 text-slate-950',
    domain: 'snapchat.com',
  },
  {
    id: 'vimeo',
    label: 'Vimeo',
    labelUr: 'Vimeo (ویمیو)',
    dotColor: 'bg-sky-500',
    badgeBg: 'bg-sky-600 text-white',
    domain: 'vimeo.com',
  },
];

export interface BrowserSearchSettings {
  enabledPlatforms: Record<BrowserPlatformId, boolean>;
  mixAllPlatformsTogether: boolean;
  defaultPlatform: BrowserPlatformFilter;
  defaultMediaType: BrowserMediaTypeFilter;
  strictMediaOnly: boolean;
  resultsPerPlatform: number;
}

const STORAGE_KEY = 'sm_browser_platform_settings_v1';
export const BROWSER_SETTINGS_CHANGED_EVENT = 'sm_browser_platform_settings_changed';

export function getDefaultBrowserSearchSettings(): BrowserSearchSettings {
  const enabledPlatforms = {} as Record<BrowserPlatformId, boolean>;
  for (const p of ALL_BROWSER_PLATFORMS) {
    enabledPlatforms[p.id] = true;
  }
  return {
    enabledPlatforms,
    mixAllPlatformsTogether: true,
    defaultPlatform: 'all',
    defaultMediaType: 'all',
    strictMediaOnly: true,
    resultsPerPlatform: 6,
  };
}

export function loadBrowserSearchSettings(): BrowserSearchSettings {
  const defaults = getDefaultBrowserSearchSettings();
  if (typeof window === 'undefined') return defaults;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaults;
    const parsed = JSON.parse(raw);
    const mergedPlatforms = { ...defaults.enabledPlatforms };
    if (parsed && typeof parsed.enabledPlatforms === 'object') {
      for (const p of ALL_BROWSER_PLATFORMS) {
        if (typeof parsed.enabledPlatforms[p.id] === 'boolean') {
          mergedPlatforms[p.id] = parsed.enabledPlatforms[p.id];
        }
      }
    }
    // Ensure at least 1 platform is enabled
    const anyEnabled = Object.values(mergedPlatforms).some(Boolean);
    if (!anyEnabled) {
      for (const p of ALL_BROWSER_PLATFORMS) {
        mergedPlatforms[p.id] = true;
      }
    }

    return {
      enabledPlatforms: mergedPlatforms,
      mixAllPlatformsTogether:
        typeof parsed.mixAllPlatformsTogether === 'boolean'
          ? parsed.mixAllPlatformsTogether
          : defaults.mixAllPlatformsTogether,
      defaultPlatform: parsed.defaultPlatform || defaults.defaultPlatform,
      defaultMediaType: parsed.defaultMediaType || defaults.defaultMediaType,
      strictMediaOnly:
        typeof parsed.strictMediaOnly === 'boolean'
          ? parsed.strictMediaOnly
          : defaults.strictMediaOnly,
      resultsPerPlatform:
        typeof parsed.resultsPerPlatform === 'number' && parsed.resultsPerPlatform >= 2
          ? parsed.resultsPerPlatform
          : defaults.resultsPerPlatform,
    };
  } catch {
    return defaults;
  }
}

export function saveBrowserSearchSettings(settings: BrowserSearchSettings): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    window.dispatchEvent(
      new CustomEvent(BROWSER_SETTINGS_CHANGED_EVENT, { detail: settings })
    );
  } catch {
    // ignore storage errors
  }
}

export function getEnabledPlatformIds(settings: BrowserSearchSettings): BrowserPlatformId[] {
  const active = ALL_BROWSER_PLATFORMS.map((p) => p.id).filter(
    (id) => settings.enabledPlatforms[id] !== false
  );
  return active.length > 0 ? active : ALL_BROWSER_PLATFORMS.map((p) => p.id);
}

export function buildPlatformSearchUrl(
  rawQuery: string,
  platform: BrowserPlatformFilter
): string {
  const trimmed = (rawQuery || '').trim();
  if (
    trimmed &&
    (/^https?:\/\//i.test(trimmed) ||
      (/^[a-z0-9.-]+\.[a-z]{2,}(\/|$)/i.test(trimmed) && !trimmed.includes(' ')))
  ) {
    return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  }

  const encoded = encodeURIComponent(trimmed);

  switch (platform) {
    case 'youtube':
      return `https://www.youtube.com/results?search_query=${encoded}`;
    case 'tiktok':
      return `https://www.tiktok.com/search?q=${encoded}`;
    case 'instagram':
      return `https://www.instagram.com/explore/search/keyword/?q=${encoded}`;
    case 'facebook':
      return `https://www.facebook.com/search/videos/?q=${encoded}`;
    case 'pinterest':
      return `https://www.pinterest.com/search/pins/?q=${encoded}`;
    case 'twitter':
      return `https://twitter.com/search?q=${encoded}`;
    case 'soundcloud':
      return `https://soundcloud.com/search?q=${encoded}`;
    case 'dailymotion':
      return `https://www.dailymotion.com/search/${encoded}`;
    case 'reddit':
      return `https://www.reddit.com/search/?q=${encoded}`;
    case 'threads':
      return `https://www.threads.net/search?q=${encoded}`;
    case 'snapchat':
      return `https://www.snapchat.com/search?q=${encoded}`;
    case 'vimeo':
      return `https://vimeo.com/search?q=${encoded}`;
    case 'all':
    default:
      return `https://www.google.com/search?igu=1&tbm=vid&q=${encoded}`;
  }
}

