import { PlatformType, HistoryItem, RecentSearchItem, DownloadOption, MediaResult, AutoClearDuration, Language, DownloadTask, SavedAccountItem, FileSizeUnit } from '../types';
import confetti from 'canvas-confetti';
import {
  cacheHistoryItemInServiceWorker,
  cacheSavedAccountInServiceWorker,
} from './serviceWorkerCache';

export const FACEBOOK_COOKIES_STORAGE_KEY = 'mediaflow_facebook_cookies_v1';
export const SOCIAL_COOKIES_STORAGE_KEY = 'mediaflow_social_cookies_v1';

export function getSavedFacebookCookies(): string {
  try {
    if (typeof window === 'undefined') return '';
    const stored = localStorage.getItem(FACEBOOK_COOKIES_STORAGE_KEY);
    if (stored && stored.trim()) return stored.trim();
    const envCookies = (import.meta as any).env?.VITE_FACEBOOK_COOKIES;
    if (envCookies && typeof envCookies === 'string' && envCookies.trim()) {
      return envCookies.trim();
    }
  } catch {
    // ignore storage errors
  }
  return '';
}

export function saveFacebookCookies(cookies: string): void {
  try {
    if (typeof window === 'undefined') return;
    const trimmed = (cookies || '').trim();
    if (trimmed) {
      localStorage.setItem(FACEBOOK_COOKIES_STORAGE_KEY, trimmed);
    } else {
      localStorage.removeItem(FACEBOOK_COOKIES_STORAGE_KEY);
    }
  } catch {
    // ignore storage errors
  }
}

export function buildBrowserSessionPayloadAndHeaders(targetUrl: string): {
  headers: Record<string, string>;
  sessionPayload: {
    platform: PlatformType;
    simulateBrowserSession: boolean;
    forceRefresh: boolean;
    cacheBust: string;
    userAgent: string;
    acceptLanguage: string;
    cookies?: string;
    facebookCookies?: string;
    browserHeaders: Record<string, string>;
  };
} {
  const clean = (targetUrl || '').trim();
  const platform = detectPlatform(clean);
  const isFacebook = platform === 'facebook' || /facebook\.com|fb\.watch|fb\.me|fb\.gg|fbcdn\.net/i.test(clean);
  const isTikTok = platform === 'tiktok' || /tiktok\.com|douyin\.com/i.test(clean);
  const isInstagram = platform === 'instagram' || /instagram\.com|instagr\.am/i.test(clean);

  const browserUa =
    typeof navigator !== 'undefined' && navigator.userAgent && !/headless/i.test(navigator.userAgent)
      ? navigator.userAgent
      : 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36';

  const acceptLang =
    typeof navigator !== 'undefined' && navigator.language
      ? `${navigator.language},en-US;q=0.9,en;q=0.8`
      : 'en-US,en;q=0.9';

  const savedFbCookies = getSavedFacebookCookies();
  // Default browser session cookies for Facebook (locale, viewport dimensions, pixel ratio) + any user-configured cookies
  const defaultFbSessionCookies = 'locale=en_US; wd=1920x1080; dpr=1';
  const effectiveFbCookies = isFacebook
    ? savedFbCookies
      ? `${defaultFbSessionCookies}; ${savedFbCookies}`
      : defaultFbSessionCookies
    : undefined;

  const referer = isFacebook
    ? 'https://www.facebook.com/'
    : isTikTok
    ? 'https://www.tiktok.com/'
    : isInstagram
    ? 'https://www.instagram.com/'
    : 'https://www.google.com/';

  const origin = isFacebook
    ? 'https://www.facebook.com'
    : isTikTok
    ? 'https://www.tiktok.com'
    : isInstagram
    ? 'https://www.instagram.com'
    : undefined;

  const secChUa = '"Not/A)Brand";v="8", "Chromium";v="126", "Google Chrome";v="126"';
  const secChUaPlatform = '"Windows"';

  const browserHeaders: Record<string, string> = {
    'User-Agent': browserUa,
    Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
    'Accept-Language': acceptLang,
    'Sec-CH-UA': secChUa,
    'Sec-CH-UA-Mobile': '?0',
    'Sec-CH-UA-Platform': secChUaPlatform,
    'Sec-Fetch-Dest': 'document',
    'Sec-Fetch-Mode': 'navigate',
    'Sec-Fetch-Site': 'none',
    'Sec-Fetch-User': '?1',
    'Upgrade-Insecure-Requests': '1',
    Referer: referer,
    ...(origin ? { Origin: origin } : {}),
    ...(effectiveFbCookies ? { Cookie: effectiveFbCookies } : {}),
  };

  const cacheBust = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

  const requestHeaders: Record<string, string> = {
    'Content-Type': 'application/json',
    'Cache-Control': 'no-cache, no-store, must-revalidate',
    Pragma: 'no-cache',
    'X-Cache-Bust': cacheBust,
    'X-Browser-User-Agent': browserUa,
    'X-Accept-Language': acceptLang,
    'X-Client-Platform': platform,
    'X-Simulate-Browser-Session': 'true',
    'X-Sec-Ch-Ua': secChUa,
    'X-Sec-Ch-Ua-Mobile': '?0',
    'X-Sec-Ch-Ua-Platform': secChUaPlatform,
    'X-Platform-Referer': referer,
    ...(effectiveFbCookies ? { 'X-Facebook-Cookies': effectiveFbCookies } : {}),
  };

  return {
    headers: requestHeaders,
    sessionPayload: {
      platform,
      simulateBrowserSession: true,
      forceRefresh: isTikTok,
      cacheBust,
      userAgent: browserUa,
      acceptLanguage: acceptLang,
      cookies: effectiveFbCookies,
      facebookCookies: effectiveFbCookies,
      browserHeaders,
    },
  };
}


export function detectPlatform(url: string): PlatformType {
  const clean = url.trim().toLowerCase();
  if (clean.includes('tiktok.com') || clean.includes('vt.tiktok.com') || clean.includes('vm.tiktok.com') || clean.includes('douyin.com') || clean.includes('tikwm.com') || clean.includes('tiktokcdn')) return 'tiktok';
  if (clean.includes('instagram.com') || clean.includes('instagr.am') || clean.includes('cdninstagram.com')) return 'instagram';
  if (clean.includes('facebook.com') || clean.includes('fb.watch') || clean.includes('fb.me') || clean.includes('fb.gg') || clean.includes('fbcdn.net')) return 'facebook';
  if (clean.includes('youtube.com') || clean.includes('youtu.be') || clean.includes('googlevideo.com')) return 'youtube';
  if (clean.includes('twitter.com') || clean.includes('x.com') || clean.includes('t.co') || clean.includes('twimg.com')) return 'twitter';
  if (clean.includes('pinterest.com') || clean.includes('pin.it') || clean.includes('pinimg.com')) return 'pinterest';
  if (clean.includes('threads.net') || clean.includes('threads.com')) return 'threads';
  if (clean.includes('reddit.com') || clean.includes('redd.it')) return 'reddit';
  if (clean.includes('snapchat.com')) return 'snapchat';
  if (clean.includes('linkedin.com')) return 'linkedin';
  if (clean.includes('vimeo.com')) return 'vimeo';
  if (clean.includes('dailymotion.com')) return 'dailymotion';
  return 'universal';
}

export function isValidSocialUrl(text: string): boolean {
  if (!text || typeof text !== 'string') return false;
  const clean = text.trim().toLowerCase();
  if (!clean.startsWith('http://') && !clean.startsWith('https://')) return false;
  
  const knownDomains = [
    'tiktok.com', 'douyin.com', 'tikwm.com', 'tiktokcdn',
    'instagram.com', 'instagr.am', 'cdninstagram.com',
    'facebook.com', 'fb.watch', 'fb.me', 'fb.gg', 'fbcdn.net',
    'youtube.com', 'youtu.be', 'googlevideo.com',
    'twitter.com', 'x.com', 't.co', 'twimg.com',
    'pinterest.com', 'pin.it', 'pinimg.com', 'threads.net', 'threads.com',
    'reddit.com', 'redd.it', 'snapchat.com', 'linkedin.com',
    'vimeo.com', 'dailymotion.com'
  ];

  return knownDomains.some(domain => clean.includes(domain)) || clean.endsWith('.mp4') || clean.endsWith('.m3u8');
}

export function cleanSocialUrl(url: string): string {
  try {
    const parsed = new URL(url.trim());
    // Strip analytics and tracking parameters
    const paramsToDelete = ['igsh', 'utm_source', 'utm_medium', 'utm_campaign', 'si', 'mibextid', 's', 't', 'fbclid', 'ref'];
    paramsToDelete.forEach(p => parsed.searchParams.delete(p));
    return parsed.toString();
  } catch {
    return url.trim();
  }
}

/**
 * Extracts all URLs from lines of text (e.g. from clipboard or multiline text block),
 * cleans trailing punctuation, and returns a deduplicated list of HTTP/HTTPS URLs.
 */
export function extractUrlsFromText(text: string): string[] {
  if (!text || typeof text !== 'string') return [];

  // Match HTTP and HTTPS links embedded in text or alone on a line
  const urlRegex = /(https?:\/\/[^\s<>"',;()[\]{}|\\^`]+)/gi;
  const rawMatches = text.match(urlRegex) || [];

  const validUrls: string[] = [];

  rawMatches.forEach((raw) => {
    // Strip trailing punctuation often caught in sentences like "https://tiktok.com/...)", "link," or "link."
    const cleaned = raw.replace(/[),.;:!?'"`\]>]+$/, '').trim();
    if (cleaned && (cleaned.startsWith('http://') || cleaned.startsWith('https://'))) {
      validUrls.push(cleaned);
    }
  });

  // Also check line by line in case URLs have slight spacing or formatting
  const lines = text.split(/\r?\n/);
  lines.forEach((line) => {
    const trimmed = line.trim();
    if (!trimmed) return;
    const lineMatches = trimmed.match(urlRegex);
    if (lineMatches) {
      lineMatches.forEach((m) => {
        const cleaned = m.replace(/[),.;:!?'"`\]>]+$/, '').trim();
        if (cleaned && !validUrls.includes(cleaned)) {
          validUrls.push(cleaned);
        }
      });
    }
  });

  return Array.from(new Set(validUrls)).filter(Boolean);
}

export interface BrowserDownloadProgressInfo {
  progress: number;
  downloadedBytes: number;
  totalBytes: number;
  sizeFormatted?: string;
  speedLabel: string;
  estimatedSeconds: number;
  stage: 'preparing' | 'extracting' | 'streaming' | 'completed';
}

export interface TriggerBrowserDownloadOptions {
  taskId?: string;
  expectedSizeStr?: string;
  signal?: AbortSignal;
  isPaused?: () => boolean;
  getSpeedCap?: () => string;
  onProgress?: (info: BrowserDownloadProgressInfo) => void;
}

let cachedFileSizeUnit: FileSizeUnit | null = null;

export function getSavedFileSizeUnit(): FileSizeUnit {
  if (cachedFileSizeUnit) return cachedFileSizeUnit;
  try {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('fileSizeUnit');
      if (saved === 'KB' || saved === 'MB') {
        cachedFileSizeUnit = saved;
        return saved;
      }
    }
  } catch {
    // ignore storage errors
  }
  cachedFileSizeUnit = 'MB';
  return 'MB';
}

export function setSavedFileSizeUnit(unit: FileSizeUnit): void {
  cachedFileSizeUnit = unit;
  try {
    if (typeof window !== 'undefined') {
      localStorage.setItem('fileSizeUnit', unit);
    }
  } catch {
    // ignore storage errors
  }
}

export function formatDisplayFileSize(
  sizeInput?: string | number | null,
  unitOverride?: FileSizeUnit
): string {
  if (sizeInput === undefined || sizeInput === null || sizeInput === '') return '';
  const unit = unitOverride || getSavedFileSizeUnit();

  let mb = 0;
  if (typeof sizeInput === 'number') {
    if (!isFinite(sizeInput) || sizeInput <= 0) return '';
    mb = sizeInput / (1024 * 1024);
  } else {
    const clean = sizeInput.trim();
    const match = clean.match(/^([\d,.]+)\s*(GB|GIB|MB|MIB|KB|KIB|BYTES|B)$/i);
    if (!match) {
      return clean;
    }
    const rawNum = parseFloat(match[1].replace(/,/g, ''));
    if (isNaN(rawNum) || rawNum <= 0) return clean;
    const srcUnit = (match[2] || 'MB').toUpperCase();
    if (srcUnit.startsWith('G')) mb = rawNum * 1024;
    else if (srcUnit.startsWith('K')) mb = rawNum / 1024;
    else if (srcUnit.startsWith('B') && !srcUnit.startsWith('M')) mb = rawNum / (1024 * 1024);
    else mb = rawNum;
  }

  if (unit === 'KB') {
    const kb = mb * 1024;
    if (kb >= 100) {
      return `${Math.round(kb).toLocaleString()} KB`;
    }
    return `${Math.max(0.1, Number(kb.toFixed(1)))} KB`;
  }

  if (mb >= 1024) {
    return `${(mb / 1024).toFixed(2)} GB`;
  }
  if (mb < 1) {
    return `${mb.toFixed(2)} MB`;
  }
  return `${mb.toFixed(1)} MB`;
}

export function formatBytesToReadableSize(bytes: number, unitOverride?: FileSizeUnit): string {
  if (!bytes || bytes <= 0 || !isFinite(bytes)) return '';
  return formatDisplayFileSize(bytes, unitOverride);
}

export async function triggerBrowserDownload(
  blobUrlOrHttp: string,
  filename: string,
  sourceUrl?: string,
  options?: TriggerBrowserDownloadOptions
) {
  // Strip any accidental .html / .htm / .m3u8 / .txt suffixes and enforce a clean binary media extension
  const cleanDownloadFilename = (rawName: string, fallbackExt: string = 'mp4'): string => {
    let base = (rawName || `mediaflow_hd.${fallbackExt}`)
      .replace(/\.(html?|htm|mhtml|php|asp|jsp|xml|txt|json|m3u8)+$/gi, '')
      .trim();
    if (!/\.(mp4|mp3|m4a|wav|webm|mov|mkv|jpe?g|png|webp|gif|zip)$/i.test(base)) {
      base = `${base}.${fallbackExt}`;
    }
    return base;
  };

  const getEnforcedMimeType = (cleanName: string): string => {
    const low = cleanName.toLowerCase();
    if (low.endsWith('.mp3')) return 'audio/mpeg';
    if (low.endsWith('.m4a')) return 'audio/mp4';
    if (low.endsWith('.wav')) return 'audio/wav';
    if (low.endsWith('.png')) return 'image/png';
    if (low.endsWith('.webp')) return 'image/webp';
    if (low.endsWith('.gif')) return 'image/gif';
    if (low.endsWith('.jpg') || low.endsWith('.jpeg')) return 'image/jpeg';
    if (low.endsWith('.zip')) return 'application/zip';
    if (low.endsWith('.webm')) return 'video/webm';
    return 'video/mp4';
  };

  const isInvalidTextOrHtmlMime = (ct: string | null | undefined): boolean => {
    if (!ct) return false;
    const low = ct.toLowerCase();
    return (
      low.includes('text/html') ||
      low.includes('application/xhtml+xml') ||
      low.includes('text/plain') ||
      low.includes('application/json') ||
      low.includes('application/xml') ||
      low.includes('text/xml') ||
      low.includes('mpegurl') ||
      low.includes('javascript')
    );
  };

  const isHtmlHeaderText = (headerText: string): boolean => {
    const trimmedHead = headerText.replace(/^\uFEFF/, '').trimStart().toLowerCase();
    return (
      trimmedHead.startsWith('<!doctype html') ||
      trimmedHead.startsWith('<html') ||
      trimmedHead.startsWith('<head') ||
      trimmedHead.startsWith('<body') ||
      trimmedHead.startsWith('<script') ||
      trimmedHead.startsWith('<meta') ||
      trimmedHead.startsWith('<?xml') ||
      trimmedHead.startsWith('<error') ||
      trimmedHead.startsWith('#extm3u') ||
      trimmedHead.startsWith('{"error"') ||
      trimmedHead.startsWith('{"success":false')
    );
  };

  const sanitizedFilename = cleanDownloadFilename(filename);

  // If it's already a blob: URL or data: URL, trigger direct anchor download with sanitized filename
  if (blobUrlOrHttp.startsWith('blob:') || blobUrlOrHttp.startsWith('data:')) {
    options?.onProgress?.({
      progress: 100,
      downloadedBytes: 100,
      totalBytes: 100,
      speedLabel: 'Finished',
      estimatedSeconds: 0,
      stage: 'completed',
    });
    const link = document.createElement('a');
    link.href = blobUrlOrHttp;
    link.download = sanitizedFilename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    try {
      confetti({ particleCount: 45, spread: 60, origin: { y: 0.8 } });
    } catch {}
    return;
  }

  // Parse parameters from option URL or sourceUrl
  let targetUrl = sourceUrl;
  let format = 'best';
  let directUrl: string | undefined;
  let height: string | undefined;
  let formatId: string | undefined;

  if (blobUrlOrHttp.includes('?') || blobUrlOrHttp.includes('url=')) {
    try {
      const parsed = new URL(blobUrlOrHttp, window.location.origin);
      if (!targetUrl) {
        targetUrl = parsed.searchParams.get('url') || undefined;
      }
      format = parsed.searchParams.get('format') || format;
      directUrl = parsed.searchParams.get('directUrl') || undefined;
      height = parsed.searchParams.get('height') || undefined;
      formatId = parsed.searchParams.get('formatId') || undefined;
    } catch {}
  }

  if (!targetUrl && blobUrlOrHttp.startsWith('http') && !blobUrlOrHttp.includes('/api/')) {
    targetUrl = blobUrlOrHttp;
  }

  const fallbackExt =
    format === 'audio' || format === 'mp3'
      ? 'mp3'
      : format === 'image' || format === 'jpg'
      ? 'jpg'
      : 'mp4';
  const finalFilename = cleanDownloadFilename(filename, fallbackExt);
  const effectiveTaskId =
    options?.taskId || 'dl_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7);

  let speedCap = options?.getSpeedCap ? options.getSpeedCap() : 'unlimited';
  if (!speedCap) {
    try {
      speedCap = localStorage.getItem('downloadSpeedCap') || 'unlimited';
    } catch {
      speedCap = 'unlimited';
    }
  }

  let downloadEndpoint = '';
  if (targetUrl) {
    const queryParams = new URLSearchParams();
    queryParams.set('url', targetUrl);
    queryParams.set('format', format);
    queryParams.set('filename', finalFilename);
    queryParams.set('taskId', effectiveTaskId);
    if (directUrl) queryParams.set('directUrl', directUrl);
    if (height) queryParams.set('height', height);
    if (formatId) queryParams.set('formatId', formatId);
    if (speedCap && speedCap !== 'unlimited') queryParams.set('speedCap', speedCap);
    downloadEndpoint = `/api/download?${queryParams.toString()}`;
  } else {
    const sep = blobUrlOrHttp.includes('?') ? '&' : '?';
    downloadEndpoint = blobUrlOrHttp.startsWith('/api/')
      ? `${blobUrlOrHttp}${sep}filename=${encodeURIComponent(finalFilename)}&taskId=${encodeURIComponent(effectiveTaskId)}`
      : `/api/download?url=${encodeURIComponent(blobUrlOrHttp)}&filename=${encodeURIComponent(finalFilename)}&taskId=${encodeURIComponent(effectiveTaskId)}`;
  }

  const estMb = parseSizeToMB(options?.expectedSizeStr || '12 MB');
  let expectedBytes = Math.max(1024 * 1024, Math.round(estMb * 1024 * 1024));
  let highestProgressSoFar = 0;

  options?.onProgress?.({
    progress: 0,
    downloadedBytes: 0,
    totalBytes: expectedBytes,
    speedLabel: 'Connecting...',
    estimatedSeconds: Math.max(1, Math.ceil(estMb / 3.2)),
    stage: 'preparing',
  });

  // Poll server-side extraction progress (/api/download-progress) while waiting for HTTP stream headers
  let headersReceived = false;
  let wasExtractedOnServer = false;
  const pollInterval = setInterval(async () => {
    if (headersReceived || options?.signal?.aborted) return;
    if (options?.isPaused && options.isPaused()) return;
    try {
      const resp = await fetch(
        `/api/download-progress?taskId=${encodeURIComponent(effectiveTaskId)}`,
        { signal: options?.signal }
      );
      if (!resp.ok || headersReceived) return;
      const json = await resp.json();
      const srv = json?.data;
      if (srv && !headersReceived) {
        if (srv.totalBytes && srv.totalBytes > 0) {
          expectedBytes = srv.totalBytes;
        }
        if (srv.stage === 'extracting' && srv.progress > 0) {
          wasExtractedOnServer = true;
          // Server yt-dlp extraction represents 0% -> 45% of total task; browser byte-stream represents 45% -> 100%
          const rawSrvRatio =
            srv.totalBytes > 0 && srv.downloadedBytes >= 0
              ? Math.min(1, srv.downloadedBytes / srv.totalBytes)
              : Math.min(1, srv.progress / 100);
          const mappedPct = Math.min(45, Math.max(highestProgressSoFar, Math.floor(rawSrvRatio * 45)));
          highestProgressSoFar = mappedPct;
          options?.onProgress?.({
            progress: highestProgressSoFar,
            downloadedBytes: Math.round((highestProgressSoFar / 100) * expectedBytes),
            totalBytes: expectedBytes,
            sizeFormatted: srv.totalBytes > 0 ? formatBytesToReadableSize(srv.totalBytes) : undefined,
            speedLabel: srv.speedLabel || '3.2 MB/s',
            estimatedSeconds: Math.max(1, (srv.etaSeconds || 1) + 2),
            stage: 'extracting',
          });
        } else if (srv.stage === 'preparing') {
          if (highestProgressSoFar < 4) {
            highestProgressSoFar += 1;
          }
          options?.onProgress?.({
            progress: highestProgressSoFar,
            downloadedBytes: Math.round((highestProgressSoFar / 100) * expectedBytes),
            totalBytes: expectedBytes,
            speedLabel: 'Preparing...',
            estimatedSeconds: Math.max(1, Math.ceil(expectedBytes / (3.2 * 1024 * 1024))),
            stage: 'preparing',
          });
        }
      }
    } catch {
      // Ignore polling errors
    }
  }, 280);

  try {
    const { headers: sessionHeaders } = buildBrowserSessionPayloadAndHeaders(
      targetUrl || blobUrlOrHttp
    );
    const { 'Content-Type': _omitCt, ...getDownloadHeaders } = sessionHeaders;
    const response = await fetch(downloadEndpoint, {
      method: 'GET',
      headers: getDownloadHeaders,
      signal: options?.signal,
    });
    headersReceived = true;
    clearInterval(pollInterval);

    const contentType = response.headers.get('content-type') || '';
    if (!response.ok || isInvalidTextOrHtmlMime(contentType)) {
      let errMsg = 'ویڈیو حاصل کرنے میں ناکامی، لنک دوبارہ چیک کریں (Failed to fetch video)';
      try {
        const errJson = await response.json();
        if (errJson?.error) errMsg = errJson.error;
      } catch {}
      throw new Error(errMsg);
    }

    const exactLenHeader =
      response.headers.get('x-exact-content-length') || response.headers.get('content-length');
    const parsedContentLen = exactLenHeader ? parseInt(exactLenHeader, 10) : 0;
    let hasExactLength = !isNaN(parsedContentLen) && parsedContentLen > 0;
    let totalBytes = hasExactLength
      ? parsedContentLen
      : Math.max(expectedBytes, 15 * 1024 * 1024);

    if (response.headers.get('x-was-extracted-on-Server') === '1' || response.headers.get('x-was-extracted-on-server') === '1') {
      wasExtractedOnServer = true;
    }

    const baseProgress = wasExtractedOnServer ? Math.min(45, highestProgressSoFar) : 0;
    const exactSizeFormatted = hasExactLength ? formatBytesToReadableSize(totalBytes) : undefined;

    if (!response.body || typeof response.body.getReader !== 'function') {
      // Fallback if browser doesn't expose ReadableStream on response.body
      const rawBlob = await response.blob();
      const isImageFile = /\.(jpe?g|png|webp|gif)$/i.test(finalFilename);
      const minBytes = isImageFile ? 1024 : 8192;
      if (!rawBlob || rawBlob.size < minBytes) {
        throw new Error('ویڈیو حاصل کرنے میں ناکامی، لنک دوبارہ چیک کریں (Failed to fetch video)');
      }
      const enforcedMime = getEnforcedMimeType(finalFilename);
      const safeBinaryBlob = new Blob([rawBlob], { type: enforcedMime });
      const blobUrl = URL.createObjectURL(safeBinaryBlob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = finalFilename;
      link.style.display = 'none';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setTimeout(() => URL.revokeObjectURL(blobUrl), 120000);
      options?.onProgress?.({
        progress: 100,
        downloadedBytes: rawBlob.size,
        totalBytes: rawBlob.size,
        sizeFormatted: formatBytesToReadableSize(rawBlob.size),
        speedLabel: 'Finished',
        estimatedSeconds: 0,
        stage: 'completed',
      });
      try {
        confetti({ particleCount: 45, spread: 60, origin: { y: 0.8 } });
      } catch {}
      return;
    }

    const reader = response.body.getReader();
    const chunks: Uint8Array[] = [];
    let receivedBytes = 0;
    const streamStartTime = performance.now();
    let lastUiEmitTime = 0;
    let checkedFirstChunkHeader = false;

    while (true) {
      if (options?.signal?.aborted) {
        try {
          await reader.cancel();
        } catch {}
        throw new DOMException('Download cancelled', 'AbortError');
      }

      // Support real-time stream pause
      while (options?.isPaused && options.isPaused()) {
        if (options?.signal?.aborted) {
          try {
            await reader.cancel();
          } catch {}
          throw new DOMException('Download cancelled', 'AbortError');
        }
        await new Promise((r) => setTimeout(r, 150));
      }

      const { done, value } = await reader.read();
      if (done) {
        break;
      }

      if (value && value.byteLength > 0) {
        if (!checkedFirstChunkHeader) {
          checkedFirstChunkHeader = true;
          try {
            const headSlice = value.subarray(0, Math.min(512, value.byteLength));
            const headText = new TextDecoder('utf-8', { fatal: false }).decode(headSlice);
            if (isHtmlHeaderText(headText)) {
              try {
                await reader.cancel();
              } catch {}
              throw new Error('ویڈیو حاصل کرنے میں ناکامی، لنک دوبارہ چیک کریں (Failed to fetch video)');
            }
          } catch (headErr: any) {
            if (headErr?.message?.includes('Failed to fetch video')) {
              throw headErr;
            }
          }
        }

        chunks.push(value);
        receivedBytes += value.byteLength;

        const nowMs = performance.now();
        const elapsedSec = Math.max(0.08, (nowMs - streamStartTime) / 1000);
        const bytesPerSec = receivedBytes / elapsedSec;
        const mbPerSec = bytesPerSec / (1024 * 1024);
        const speedLabel =
          mbPerSec >= 1
            ? `${mbPerSec.toFixed(1)} MB/s`
            : `${Math.max(1, Math.round(bytesPerSec / 1024))} KB/s`;

        let currentPct = highestProgressSoFar;
        let effectiveTotalBytes = totalBytes;

        if (hasExactLength && totalBytes > 0) {
          // Keep reported totalBytes solid and accurate to Content-Length
          if (receivedBytes > totalBytes) {
            totalBytes = receivedBytes;
          }
          effectiveTotalBytes = totalBytes;
          const ratio = Math.min(0.99, receivedBytes / Math.max(1, totalBytes));
          const mapped = Math.floor(baseProgress + ratio * (98 - baseProgress));
          currentPct = Math.min(98, Math.max(baseProgress, mapped));
        }

        if (!hasExactLength || totalBytes <= 0) {
          // Smooth asymptotic byte-stream estimation only when upstream Content-Length is omitted
          if (receivedBytes >= totalBytes * 0.95) {
            totalBytes = Math.round(receivedBytes + Math.max(2 * 1024 * 1024, receivedBytes * 0.2));
          }
          effectiveTotalBytes = totalBytes;
          const ratio = Math.min(0.92, receivedBytes / effectiveTotalBytes);
          const mapped = Math.floor(baseProgress + ratio * (92 - baseProgress));
          currentPct = Math.min(92, Math.max(highestProgressSoFar, mapped));
        }

        const remainingBytes = Math.max(0, effectiveTotalBytes - receivedBytes);
        const estimatedSeconds =
          bytesPerSec > 0 ? Math.max(1, Math.ceil(remainingBytes / bytesPerSec)) : 1;

        const reportedDownloadedBytes = wasExtractedOnServer
          ? Math.min(
              effectiveTotalBytes - 1,
              Math.round((currentPct / 100) * effectiveTotalBytes)
            )
          : receivedBytes;

        if (currentPct !== highestProgressSoFar || nowMs - lastUiEmitTime >= 80) {
          highestProgressSoFar = Math.max(highestProgressSoFar, currentPct);
          lastUiEmitTime = nowMs;
          options?.onProgress?.({
            progress: highestProgressSoFar,
            downloadedBytes: reportedDownloadedBytes,
            totalBytes: effectiveTotalBytes,
            sizeFormatted:
              exactSizeFormatted ||
              formatBytesToReadableSize(Math.max(effectiveTotalBytes, receivedBytes)),
            speedLabel,
            estimatedSeconds,
            stage: 'streaming',
          });
        }
      }
    }

    const isImageFile = /\.(jpe?g|png|webp|gif)$/i.test(finalFilename);
    const minBytes = isImageFile ? 1024 : 8192;
    if (receivedBytes < minBytes) {
      throw new Error('ویڈیو حاصل کرنے میں ناکامی، لنک دوبارہ چیک کریں (Failed to fetch video)');
    }

    // Emit 98% while assembling final Blob in memory before browser file dispatch
    const finalSizeStr = formatBytesToReadableSize(receivedBytes);
    options?.onProgress?.({
      progress: 98,
      downloadedBytes: Math.round(receivedBytes * 0.98),
      totalBytes: receivedBytes,
      sizeFormatted: finalSizeStr || exactSizeFormatted,
      speedLabel: 'Saving file...',
      estimatedSeconds: 1,
      stage: 'streaming',
    });

    // All 100% of bytes have been received in browser memory! Assemble Blob and trigger immediate save to device
    const enforcedMime = getEnforcedMimeType(finalFilename);
    const safeBinaryBlob = new Blob(chunks, { type: enforcedMime });
    const blobUrl = URL.createObjectURL(safeBinaryBlob);

    const link = document.createElement('a');
    link.href = blobUrl;
    link.download = finalFilename;
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => URL.revokeObjectURL(blobUrl), 120000);

    options?.onProgress?.({
      progress: 100,
      downloadedBytes: receivedBytes,
      totalBytes: receivedBytes,
      sizeFormatted: finalSizeStr || exactSizeFormatted,
      speedLabel: 'Finished',
      estimatedSeconds: 0,
      stage: 'completed',
    });

    // Play celebration confetti now that the entire video is 100% downloaded and saved
    try {
      confetti({
        particleCount: 45,
        spread: 60,
        origin: { y: 0.8 },
      });
    } catch {
      // Ignore if not supported
    }
  } finally {
    headersReceived = true;
    clearInterval(pollInterval);
  }
}

// Local Storage + In-Memory helpers for history (ensures Gallery always retains items even if localStorage quota or iframe storage is restricted)
const HISTORY_KEY = 'social_downloader_history_v1';
let memoryHistoryCache: HistoryItem[] | null = null;

export function getSavedHistory(): HistoryItem[] {
  try {
    if (typeof window !== 'undefined') {
      const raw = localStorage.getItem(HISTORY_KEY);
      if (raw !== null) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          const seen = new Set<string>();
          const unique: HistoryItem[] = [];
          parsed.forEach((item, idx) => {
            if (!item) return;
            const id = item.id || `hist_${idx}_${Date.now()}`;
            if (!seen.has(id)) {
              seen.add(id);
              unique.push({ ...item, id });
            }
          });
          memoryHistoryCache = unique.slice(0, 100);
          return [...memoryHistoryCache];
        }
      }
    }
  } catch {
    // Fallback to memoryHistoryCache
  }
  if (memoryHistoryCache !== null) {
    return [...memoryHistoryCache];
  }
  memoryHistoryCache = [];
  return [];
}

export function saveHistoryItem(item: HistoryItem): HistoryItem[] {
  const existing = getSavedHistory();
  const filtered = existing.filter((i) => i.id !== item.id);
  const updated = [item, ...filtered].slice(0, 100);
  memoryHistoryCache = updated;
  try {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(updated));
  } catch {
    try {
      localStorage.setItem(HISTORY_KEY, JSON.stringify(updated.slice(0, 30)));
    } catch {
      // memoryHistoryCache holds the items for the active session
    }
  }
  try {
    cacheHistoryItemInServiceWorker(item);
  } catch {
    // ignore SW cache errors
  }
  return [...updated];
}

export function removeHistoryItem(id: string): HistoryItem[] {
  const existing = getSavedHistory();
  const updated = existing.filter((i) => i.id !== id);
  memoryHistoryCache = updated;
  try {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(updated));
  } catch {
    // ignore
  }
  return [...updated];
}

export function renameHistoryItem(id: string, newTitle: string): HistoryItem[] {
  const trimmed = newTitle.trim();
  if (!trimmed) return getSavedHistory();
  const existing = getSavedHistory();
  const updated = existing.map((item) =>
    item.id === id ? { ...item, title: trimmed } : item
  );
  memoryHistoryCache = updated;
  try {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(updated));
  } catch {
    // ignore
  }
  return [...updated];
}

export function toggleHideHistoryItem(id: string): HistoryItem[] {
  const existing = getSavedHistory();
  const updated = existing.map((item) =>
    item.id === id ? { ...item, isHidden: !item.isHidden } : item
  );
  memoryHistoryCache = updated;
  try {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(updated));
  } catch {
    // ignore
  }
  return [...updated];
}

const REMEMBER_CHOICE_ENABLED_KEY = 'mediaflow_remember_choice_enabled_v1';
const REMEMBERED_FORMAT_PREF_KEY = 'mediaflow_remembered_format_pref_v1';

export interface RememberedFormatPref {
  type: 'video' | 'audio' | 'image';
  resolution: string;
  format: string;
  quality: string;
  optionId?: string;
}

export function getRememberChoiceState(): {
  enabled: boolean;
  pref: RememberedFormatPref | null;
} {
  try {
    if (typeof window === 'undefined') return { enabled: false, pref: null };
    const enabled = localStorage.getItem(REMEMBER_CHOICE_ENABLED_KEY) === 'true';
    const rawPref = localStorage.getItem(REMEMBERED_FORMAT_PREF_KEY);
    const pref = rawPref ? (JSON.parse(rawPref) as RememberedFormatPref) : null;
    return { enabled, pref };
  } catch {
    return { enabled: false, pref: null };
  }
}

export function saveRememberChoiceState(
  enabled: boolean,
  pref: RememberedFormatPref | null
): void {
  try {
    if (typeof window === 'undefined') return;
    localStorage.setItem(REMEMBER_CHOICE_ENABLED_KEY, enabled ? 'true' : 'false');
    if (enabled && pref) {
      localStorage.setItem(REMEMBERED_FORMAT_PREF_KEY, JSON.stringify(pref));
    } else if (!enabled) {
      localStorage.removeItem(REMEMBERED_FORMAT_PREF_KEY);
    }
  } catch {
    // ignore
  }
}

export function clearAllHistory(): void {
  memoryHistoryCache = [];
  try {
    localStorage.setItem(HISTORY_KEY, '[]');
  } catch {
    // ignore
  }
}

export function pruneExpiredHistoryItems(retentionMinutes: number): HistoryItem[] {
  if (!retentionMinutes || isNaN(retentionMinutes) || retentionMinutes <= 0) {
    return getSavedHistory();
  }
  const thresholdMs = retentionMinutes * 60 * 1000;
  const now = Date.now();
  const existing = getSavedHistory();
  const remaining = existing.filter((item) => {
    const ts = item.downloadedAt || 0;
    return ts > 0 ? now - ts < thresholdMs : true;
  });
  if (remaining.length !== existing.length) {
    memoryHistoryCache = remaining;
    try {
      localStorage.setItem(HISTORY_KEY, JSON.stringify(remaining));
    } catch {
      // ignore
    }
  }
  return [...remaining];
}

/**
 * Bulk-deletes history items that are older than the specified number of days (default: 7 days).
 * Preserves all items downloaded within the last `days` days.
 */
export function deleteHistoryOlderThanDays(days: number = 7): {
  remaining: HistoryItem[];
  deletedCount: number;
} {
  const validDays = !days || isNaN(days) || days <= 0 ? 7 : days;
  const thresholdMs = validDays * 24 * 60 * 60 * 1000;
  const now = Date.now();
  const existing = getSavedHistory();
  const remaining = existing.filter((item) => {
    const ts = typeof item.downloadedAt === 'number' ? item.downloadedAt : 0;
    if (!ts || ts <= 0) return false;
    return now - ts < thresholdMs;
  });
  const deletedCount = existing.length - remaining.length;
  memoryHistoryCache = remaining;
  try {
    if (typeof window !== 'undefined') {
      localStorage.setItem(HISTORY_KEY, JSON.stringify(remaining));
    }
  } catch {
    // ignore
  }
  return {
    remaining: [...remaining],
    deletedCount,
  };
}

// Local Storage helpers for Recent Searches (Last 10 URLs entered, top 5 shown in URL input dropdown)
const RECENT_SEARCHES_KEY = 'social_downloader_recent_searches_v1';
const MAX_RECENT_SEARCHES = 10;

const DEFAULT_RECENT_SEARCHES: RecentSearchItem[] = [
  {
    id: 'recent_default_1',
    url: 'https://www.tiktok.com/@zachking/video/728914526371892',
    platform: 'tiktok',
    searchedAt: Date.now() - 1000 * 60 * 12,
    title: 'Zach King — Magic Broomstick Illusion (4K Clean)',
  },
  {
    id: 'recent_default_2',
    url: 'https://www.instagram.com/reel/C8xYz91AbCd/',
    platform: 'instagram',
    searchedAt: Date.now() - 1000 * 60 * 35,
    title: 'Instagram Reel — Cinematic Travel Aerials 1080p',
  },
  {
    id: 'recent_default_3',
    url: 'https://www.youtube.com/watch?v=aqz-KE-bpKQ',
    platform: 'youtube',
    searchedAt: Date.now() - 1000 * 60 * 90,
    title: 'Big Buck Bunny 60fps 4K Ultra HD Official',
  },
  {
    id: 'recent_default_4',
    url: 'https://x.com/nasa/status/184152938471029',
    platform: 'twitter',
    searchedAt: Date.now() - 1000 * 60 * 180,
    title: 'NASA — Earth from International Space Station HD',
  },
  {
    id: 'recent_default_5',
    url: 'https://www.facebook.com/watch/?v=1092837465123',
    platform: 'facebook',
    searchedAt: Date.now() - 1000 * 60 * 320,
    title: 'Facebook Watch — Nature Documentary Highlight',
  },
];

let memoryRecentSearchesCache: RecentSearchItem[] | null = null;

export function getSavedRecentSearches(): RecentSearchItem[] {
  if (memoryRecentSearchesCache !== null) {
    return [...memoryRecentSearchesCache];
  }
  try {
    if (typeof window === 'undefined') return [...DEFAULT_RECENT_SEARCHES];
    const raw = localStorage.getItem(RECENT_SEARCHES_KEY);
    if (raw === null) {
      memoryRecentSearchesCache = [...DEFAULT_RECENT_SEARCHES];
      localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(DEFAULT_RECENT_SEARCHES));
      return [...DEFAULT_RECENT_SEARCHES];
    }
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [...DEFAULT_RECENT_SEARCHES];
    const seen = new Set<string>();
    const unique: RecentSearchItem[] = [];
    parsed.forEach((item, idx) => {
      if (!item || !item.url) return;
      const normUrl = String(item.url).trim().toLowerCase();
      if (!seen.has(normUrl)) {
        seen.add(normUrl);
        unique.push({
          ...item,
          id: item.id || `search_${idx}_${Date.now()}`,
          url: String(item.url).trim(),
        });
      }
    });
    memoryRecentSearchesCache = unique.slice(0, MAX_RECENT_SEARCHES);
    return [...memoryRecentSearchesCache];
  } catch {
    return [...DEFAULT_RECENT_SEARCHES];
  }
}

export function saveRecentSearch(rawUrl: string, explicitPlatform?: PlatformType, title?: string): RecentSearchItem[] {
  try {
    const cleanUrl = rawUrl.trim();
    if (!cleanUrl || (!cleanUrl.startsWith('http://') && !cleanUrl.startsWith('https://') && !cleanUrl.startsWith('@'))) {
      return getSavedRecentSearches();
    }

    const existing = getSavedRecentSearches();
    const platform = explicitPlatform || detectPlatform(cleanUrl);
    const prevMatch = existing.find(item => item.url.toLowerCase() === cleanUrl.toLowerCase());

    // Filter out previous occurrences of the exact same URL
    const filtered = existing.filter(item => item.url.toLowerCase() !== cleanUrl.toLowerCase());

    const newItem: RecentSearchItem = {
      id: prevMatch?.id || 'search_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
      url: cleanUrl,
      platform,
      searchedAt: Date.now(),
      title: title || prevMatch?.title || undefined,
    };

    const updated = [newItem, ...filtered].slice(0, MAX_RECENT_SEARCHES);
    memoryRecentSearchesCache = updated;
    if (typeof window !== 'undefined') {
      localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(updated));
    }
    return [...updated];
  } catch {
    return getSavedRecentSearches();
  }
}

export function removeRecentSearch(id: string): RecentSearchItem[] {
  try {
    const existing = getSavedRecentSearches();
    const updated = existing.filter(i => i.id !== id && i.url !== id);
    memoryRecentSearchesCache = updated;
    if (typeof window !== 'undefined') {
      localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(updated));
    }
    return [...updated];
  } catch {
    return [];
  }
}

export function clearAllRecentSearches(): void {
  memoryRecentSearchesCache = [];
  try {
    if (typeof window !== 'undefined') {
      localStorage.setItem(RECENT_SEARCHES_KEY, '[]');
    }
  } catch {
    // ignore
  }
}

export function deleteRecentSearchesOlderThanDays(days: number = 7): {
  remaining: RecentSearchItem[];
  deletedCount: number;
} {
  const validDays = !days || isNaN(days) || days <= 0 ? 7 : days;
  const thresholdMs = validDays * 24 * 60 * 60 * 1000;
  const now = Date.now();
  const existing = getSavedRecentSearches();
  const remaining = existing.filter((item) => {
    const ts = typeof item.searchedAt === 'number' ? item.searchedAt : 0;
    if (!ts || ts <= 0) return false;
    return now - ts < thresholdMs;
  });
  const deletedCount = existing.length - remaining.length;
  memoryRecentSearchesCache = remaining;
  try {
    if (typeof window !== 'undefined') {
      localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(remaining));
    }
  } catch {
    // ignore
  }
  return {
    remaining: [...remaining],
    deletedCount,
  };
}

// Local Storage helpers for auto-clear duration setting
const AUTO_CLEAR_DURATION_KEY = 'social_downloader_autoclear_duration_v1';

export function getSavedAutoClearDuration(): AutoClearDuration {
  try {
    const raw = localStorage.getItem('autoClearDuration') || localStorage.getItem(AUTO_CLEAR_DURATION_KEY);
    if (!raw) return '60'; // Default 1 hour (60 minutes)
    const validDurations: AutoClearDuration[] = ['never', '1', '5', '15', '30', '60', '360', '1440', '10080'];
    return validDurations.includes(raw as AutoClearDuration) ? (raw as AutoClearDuration) : '60';
  } catch {
    return '60';
  }
}

export function saveAutoClearDuration(duration: AutoClearDuration): void {
  try {
    localStorage.setItem('autoClearDuration', duration);
    localStorage.setItem(AUTO_CLEAR_DURATION_KEY, duration);
  } catch {
    // ignore
  }
}

export function formatAutoClearLabel(duration: AutoClearDuration | string, lang: Language = 'en'): string {
  switch (duration) {
    case 'never':
      return lang === 'ur' ? 'غیر فعال (ہمیشہ محفوظ)' : 'Off (Keep Forever)';
    case '1':
      return lang === 'ur' ? '1 منٹ' : '1 Minute';
    case '5':
      return lang === 'ur' ? '5 منٹ' : '5 Minutes';
    case '15':
      return lang === 'ur' ? '15 منٹ' : '15 Minutes';
    case '30':
      return lang === 'ur' ? '30 منٹ' : '30 Minutes';
    case '60':
      return lang === 'ur' ? '1 گھنٹہ' : '1 Hour';
    case '360':
      return lang === 'ur' ? '6 گھنٹے' : '6 Hours';
    case '1440':
      return lang === 'ur' ? '1 دن (24 گھنٹے)' : '1 Day (24h)';
    case '10080':
      return lang === 'ur' ? '7 دن (1 ہفتہ)' : '7 Days';
    default:
      return lang === 'ur' ? '1 گھنٹہ' : '1 Hour';
  }
}

// Local Storage helpers & Browser API for Desktop Notifications
const DESKTOP_NOTIFICATIONS_KEY = 'social_downloader_desktop_notifications_v1';

export function getSavedDesktopNotifications(): boolean {
  try {
    const raw = localStorage.getItem(DESKTOP_NOTIFICATIONS_KEY);
    if (raw === null) return false; // Off by default until user toggles or enables
    return raw === 'true';
  } catch {
    return false;
  }
}

export function saveDesktopNotifications(enabled: boolean): void {
  try {
    localStorage.setItem(DESKTOP_NOTIFICATIONS_KEY, enabled ? 'true' : 'false');
  } catch {
    // ignore
  }
}

export function isNotificationSupported(): boolean {
  return typeof window !== 'undefined' && 'Notification' in window;
}

export function getNotificationPermissionStatus(): NotificationPermission | 'unsupported' {
  if (!isNotificationSupported()) return 'unsupported';
  return Notification.permission;
}

export async function requestDesktopNotificationPermission(): Promise<boolean> {
  if (!isNotificationSupported()) return false;
  try {
    if (Notification.permission === 'granted') {
      return true;
    }
    const result = await Notification.requestPermission();
    return result === 'granted';
  } catch {
    return false;
  }
}

/**
 * Plays a short, pleasant two-tone completion chime using Web Audio API
 */
export function playNotificationSound(): void {
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const now = ctx.currentTime;

    // Tone 1
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(587.33, now); // D5
    gain1.gain.setValueAtTime(0.12, now);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(now);
    osc1.stop(now + 0.25);

    // Tone 2 (Higher, uplifting)
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(880, now + 0.12); // A5
    gain2.gain.setValueAtTime(0.15, now + 0.12);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.45);
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(now + 0.12);
    osc2.stop(now + 0.45);
  } catch {
    // Gracefully ignore audio context autoplay restrictions
  }
}

/**
 * Dispatches a native browser desktop notification for completed downloads
 */
export function sendDownloadNotification(
  title: string, 
  body: string, 
  iconUrl?: string
): boolean {
  if (!isNotificationSupported()) return false;

  playNotificationSound();

  if (Notification.permission === 'granted') {
    try {
      const notif = new Notification(title, {
        body,
        icon: iconUrl || '/favicon.ico',
        badge: '/favicon.ico',
        tag: 'social-download-finished-' + Date.now(),
        silent: false,
      });

      notif.onclick = () => {
        try {
          window.focus();
        } catch {
          // ignore
        }
        notif.close();
      };

      // Auto close notification after 8 seconds
      setTimeout(() => {
        try {
          notif.close();
        } catch {
          // ignore
        }
      }, 8000);

      return true;
    } catch (e) {
      console.warn('Desktop notification error:', e);
      return false;
    }
  }

  return false;
}

/**
 * Format remaining time until completed task gets automatically removed
 */
export function formatAutoClearRemaining(
  completedAt?: number,
  durationStr: AutoClearDuration = '30',
  lang: Language = 'en'
): string | null {
  if (durationStr === 'never' || !completedAt) return null;
  const minutes = parseInt(durationStr, 10);
  if (isNaN(minutes) || minutes <= 0) return null;

  const totalDurationMs = minutes * 60 * 1000;
  const elapsedMs = Date.now() - completedAt;
  const remainingMs = totalDurationMs - elapsedMs;

  if (remainingMs <= 0) {
    return lang === 'ur' ? 'ابھی صاف ہو رہا ہے...' : 'Cleaning up now...';
  }

  const remainingSec = Math.floor(remainingMs / 1000);
  if (remainingSec < 60) {
    return lang === 'ur' ? `${remainingSec} سیکنڈ باقی` : `${remainingSec}s left`;
  }
  const remainingMin = Math.ceil(remainingSec / 60);
  if (remainingMin >= 60) {
    const hours = Math.floor(remainingMin / 60);
    const mins = remainingMin % 60;
    if (lang === 'ur') {
      return `${hours} گھنٹہ ${mins > 0 ? mins + ' منٹ' : ''} باقی`;
    }
    return `${hours}h ${mins > 0 ? mins + 'm' : ''} left`;
  }
  return lang === 'ur' ? `${remainingMin} منٹ باقی` : `${remainingMin}m left`;
}

/**
 * Parse human readable file size string (e.g. "24.5 MB", "850 KB", "1.2 GB") into MegaBytes
 */
export function parseSizeToMB(sizeStr?: string): number {
  if (!sizeStr) return 15;
  const clean = sizeStr.trim().toUpperCase();
  const match = clean.match(/([\d.]+)\s*(GB|GIB|MB|MIB|KB|KIB|BYTES|B)(?!\s*PS|\w)/i);
  if (!match) return 15;
  const val = parseFloat(match[1]);
  if (isNaN(val) || val <= 0) return 15;
  const unit = (match[2] || 'MB').toUpperCase();

  if (unit.startsWith('G')) return val * 1024;
  if (unit.startsWith('K')) return val / 1024;
  if (unit.startsWith('B') && !unit.startsWith('M')) return val / (1024 * 1024);
  return val;
}

/**
 * Compute real-time byte-stream progress percentage for a DownloadTask.
 * Guarantees that the progress percentage reflects actual byte-stream status
 * and never reaches 100% until task.status === 'completed'.
 */
export function getRealTimeTaskProgress(task?: DownloadTask | null): number {
  if (!task) return 0;
  if (task.status === 'completed') return 100;

  // 1. If we have exact byte-stream telemetry (downloadedBytes & totalBytes), calculate exact byte ratio
  if (
    typeof task.downloadedBytes === 'number' &&
    typeof task.totalBytes === 'number' &&
    task.totalBytes > 0 &&
    task.downloadedBytes >= 0
  ) {
    const bytePercent = Math.floor((task.downloadedBytes / task.totalBytes) * 100);
    return Math.min(98, Math.max(0, bytePercent));
  }

  // 2. Fallback to reported progress, strictly clamped to 98% while not completed
  const raw =
    typeof task.progress === 'number' && !Number.isNaN(task.progress)
      ? Math.floor(task.progress)
      : 0;
  return Math.min(98, Math.max(0, raw));
}

/**
 * Parse speed string (e.g. "3.5 MB/s", "850 KB/s", "1.2 MB/s") into numerical MB/s
 */
export function parseSpeedToMBps(speedStr?: string): number {
  if (!speedStr) return 3.2;
  const clean = speedStr.trim().toUpperCase();
  if (clean.includes('PAUSED') || clean.includes('FINISHED') || clean.includes('RESUMING')) {
    return 0;
  }
  const match = clean.match(/([\d.]+)\s*(MB\/S|KB\/S|GB\/S|B\/S)?/i);
  if (!match) return 3.2;
  const val = parseFloat(match[1]);
  if (isNaN(val) || val <= 0) return 3.2;
  const unit = match[2] || 'MB/S';

  if (unit.startsWith('G')) return val * 1024;
  if (unit.startsWith('K')) return val / 1024;
  return val;
}

/**
 * Calculate estimated time remaining in seconds based on size, progress, and speed
 */
export function calculateEstimatedSecondsRemaining(
  sizeStr: string,
  progress: number,
  speedStr?: string,
  downloadedBytes?: number,
  totalBytes?: number
): number {
  if (progress >= 100) return 0;
  const speedMBps = parseSpeedToMBps(speedStr);
  if (speedMBps <= 0) return 0;

  if (
    typeof downloadedBytes === 'number' &&
    typeof totalBytes === 'number' &&
    totalBytes > 0 &&
    downloadedBytes >= 0
  ) {
    const remainingMB = Math.max(0, (totalBytes - downloadedBytes) / (1024 * 1024));
    return Math.max(0, remainingMB / speedMBps);
  }

  const totalMB = parseSizeToMB(sizeStr);
  const remainingMB = Math.max(0, totalMB * (1 - progress / 100));
  return Math.max(0, remainingMB / speedMBps);
}

/**
 * Calculate downloaded size representation (e.g., "12.2 MB / 24.5 MB")
 * Prioritizes real-time byte-stream counters when available.
 */
export function calculateDownloadedSize(
  sizeStr: string,
  progress: number,
  downloadedBytes?: number,
  totalBytes?: number,
  unitOverride?: FileSizeUnit
): string {
  const unit = unitOverride || getSavedFileSizeUnit();

  if (
    typeof downloadedBytes === 'number' &&
    downloadedBytes >= 0 &&
    typeof totalBytes === 'number' &&
    totalBytes > 0
  ) {
    const downloadedMB = downloadedBytes / (1024 * 1024);
    const totalMB = totalBytes / (1024 * 1024);
    const clampedDownloadedMB = progress >= 100 ? totalMB : Math.min(totalMB, downloadedMB);

    if (unit === 'KB') {
      return `${Math.round(clampedDownloadedMB * 1024).toLocaleString()} KB / ${Math.round(totalMB * 1024).toLocaleString()} KB`;
    }
    if (totalMB >= 1000) {
      return `${(clampedDownloadedMB / 1024).toFixed(2)} GB / ${(totalMB / 1024).toFixed(2)} GB`;
    }
    if (totalMB < 1) {
      return `${clampedDownloadedMB.toFixed(2)} MB / ${totalMB.toFixed(2)} MB`;
    }
    return `${clampedDownloadedMB.toFixed(1)} MB / ${totalMB.toFixed(1)} MB`;
  }

  if (!sizeStr) return '';
  const totalMB = parseSizeToMB(sizeStr);
  const downloadedMB = Math.min(totalMB, (totalMB * Math.max(0, progress)) / 100);

  if (unit === 'KB') {
    const totalKB = Math.round(totalMB * 1024);
    const downloadedKB = Math.round(downloadedMB * 1024);
    return `${downloadedKB.toLocaleString()} KB / ${totalKB.toLocaleString()} KB`;
  }

  if (totalMB >= 1000) {
    const totalGB = totalMB / 1024;
    const downloadedGB = downloadedMB / 1024;
    return `${downloadedGB.toFixed(2)} GB / ${totalGB.toFixed(2)} GB`;
  }

  if (totalMB < 1) {
    return `${downloadedMB.toFixed(2)} MB / ${totalMB.toFixed(2)} MB`;
  }

  return `${downloadedMB.toFixed(1)} MB / ${totalMB.toFixed(1)} MB`;
}

/**
 * Format estimated seconds into localized human-readable string
 */
export function formatEstimatedTimeRemaining(
  seconds: number,
  status: string,
  lang: Language = 'en'
): string {
  if (status === 'completed') {
    if (lang === 'ur') return 'مکمل ہو گیا';
    if (lang === 'es') return 'Completado';
    if (lang === 'fr') return 'Terminé';
    if (lang === 'hi') return 'पूर्ण हो गया';
    return 'Completed';
  }
  if (status === 'paused') {
    if (lang === 'ur') return 'روکا گیا ہے';
    if (lang === 'es') return 'En pausa';
    if (lang === 'fr') return 'En pause';
    if (lang === 'hi') return 'रोका गया';
    return 'Paused';
  }
  if (status === 'error') {
    if (lang === 'ur') return 'خرابی';
    if (lang === 'es') return 'Error';
    if (lang === 'fr') return 'Erreur';
    if (lang === 'hi') return 'त्रुटि';
    return 'Error';
  }
  if (status === 'failed') {
    if (lang === 'ur') return 'دوبارہ کوشش جاری ہے...';
    if (lang === 'es') return 'Reintentando...';
    if (lang === 'fr') return 'Nouvelle tentative...';
    if (lang === 'hi') return 'पुनः प्रयास कर रहा है...';
    return 'Retrying...';
  }
  if (seconds <= 0 || !isFinite(seconds)) {
    if (lang === 'ur') return 'چند لمحے باقی...';
    if (lang === 'es') return 'Unos instantes...';
    if (lang === 'fr') return 'Quelques instants...';
    if (lang === 'hi') return 'कुछ ही क्षण शेष...';
    return 'Few moments left...';
  }

  const totalSec = Math.ceil(seconds);
  const remWord =
    lang === 'ur'
      ? 'باقی'
      : lang === 'es'
      ? 'restantes'
      : lang === 'fr'
      ? 'restantes'
      : lang === 'hi'
      ? 'शेष'
      : 'remaining';

  if (totalSec < 60) {
    return `${totalSec}s ${remWord}`;
  }
  
  const minutes = Math.floor(totalSec / 60);
  const remSec = totalSec % 60;
  
  if (minutes < 60) {
    if (remSec === 0) {
      return `${minutes}m ${remWord}`;
    }
    return `${minutes}m ${remSec}s ${remWord}`;
  }

  const hours = Math.floor(minutes / 60);
  const remMin = minutes % 60;
  return `${hours}h ${remMin}m ${remWord}`;
}

export interface ResolutionSpec {
  tier: number;
  id: string;
  resolution: string;
  label: string;
  quality: string;
  badge: string;
  size: string;
  width: number;
  height: number;
}

export const STANDARD_VIDEO_RESOLUTION_LADDER: ResolutionSpec[] = [
  {
    tier: 4320,
    id: 'opt-4320p',
    resolution: '4320p',
    label: '8K Ultra HD (4320p)',
    quality: '8K Ultra HD (4320p)',
    badge: '8K (4320p)',
    size: '58.4 MB',
    width: 7680,
    height: 4320,
  },
  {
    tier: 2160,
    id: 'opt-2160p',
    resolution: '2160p',
    label: '4K Ultra HD (2160p)',
    quality: '4K Ultra HD (2160p)',
    badge: '4K (2160p)',
    size: '31.2 MB',
    width: 3840,
    height: 2160,
  },
  {
    tier: 1440,
    id: 'opt-1440p',
    resolution: '1440p',
    label: '2K QHD (1440p)',
    quality: '2K QHD (1440p)',
    badge: '2K (1440p)',
    size: '17.6 MB',
    width: 2560,
    height: 1440,
  },
  {
    tier: 1080,
    id: 'opt-1080p',
    resolution: '1080p',
    label: 'Full HD (1080p)',
    quality: 'Full HD (1080p)',
    badge: 'Full HD (1080p)',
    size: '9.8 MB',
    width: 1920,
    height: 1080,
  },
  {
    tier: 720,
    id: 'opt-720p',
    resolution: '720p',
    label: 'HD (720p)',
    quality: 'HD (720p)',
    badge: 'HD (720p)',
    size: '5.4 MB',
    width: 1280,
    height: 720,
  },
  {
    tier: 480,
    id: 'opt-480p',
    resolution: '480p',
    label: 'SD (480p)',
    quality: 'SD (480p)',
    badge: 'SD (480p)',
    size: '3.2 MB',
    width: 854,
    height: 480,
  },
  {
    tier: 360,
    id: 'opt-360p',
    resolution: '360p',
    label: '360p',
    quality: '360p',
    badge: '360p',
    size: '2.1 MB',
    width: 640,
    height: 360,
  },
  {
    tier: 240,
    id: 'opt-240p',
    resolution: '240p',
    label: '240p',
    quality: '240p',
    badge: '240p',
    size: '1.3 MB',
    width: 426,
    height: 240,
  },
  {
    tier: 144,
    id: 'opt-144p',
    resolution: '144p',
    label: '144p',
    quality: '144p',
    badge: '144p',
    size: '0.8 MB',
    width: 256,
    height: 144,
  },
];

export const PLATFORM_DOWNLOAD_RESOLUTION_MAP: Record<PlatformType, ResolutionSpec[]> = {
  tiktok: STANDARD_VIDEO_RESOLUTION_LADDER,
  instagram: STANDARD_VIDEO_RESOLUTION_LADDER,
  facebook: STANDARD_VIDEO_RESOLUTION_LADDER,
  youtube: STANDARD_VIDEO_RESOLUTION_LADDER,
  twitter: STANDARD_VIDEO_RESOLUTION_LADDER,
  pinterest: STANDARD_VIDEO_RESOLUTION_LADDER,
  threads: STANDARD_VIDEO_RESOLUTION_LADDER,
  reddit: STANDARD_VIDEO_RESOLUTION_LADDER,
  snapchat: STANDARD_VIDEO_RESOLUTION_LADDER,
  linkedin: STANDARD_VIDEO_RESOLUTION_LADDER,
  vimeo: STANDARD_VIDEO_RESOLUTION_LADDER,
  dailymotion: STANDARD_VIDEO_RESOLUTION_LADDER,
  universal: STANDARD_VIDEO_RESOLUTION_LADDER,
};

export function getPlatformVideoDownloadOptions(
  platform: PlatformType,
  cleanUrl: string,
  removeWatermark: boolean = true
): DownloadOption[] {
  const ladder = PLATFORM_DOWNLOAD_RESOLUTION_MAP[platform] || STANDARD_VIDEO_RESOLUTION_LADDER;
  return ladder.map((spec, index) => ({
    id: spec.id,
    label: spec.label,
    resolution: spec.resolution,
    format: 'MP4',
    size: spec.size,
    quality: spec.quality,
    url: `/api/download?url=${encodeURIComponent(cleanUrl)}&format=mp4&height=${spec.tier}`,
    type: 'video',
    badge: index === 0 ? 'Original Source Quality' : spec.badge,
    noWatermark: removeWatermark,
    width: spec.width,
    height: spec.height,
  }));
}

export function ensureCompleteMediaResolutionOptions(
  mediaData: MediaResult,
  removeWatermark: boolean = true
): MediaResult {
  if (!mediaData || !Array.isArray(mediaData.downloadOptions)) {
    return mediaData;
  }

  const validOptions = mediaData.downloadOptions.filter(
    (opt) =>
      opt &&
      typeof opt.url === 'string' &&
      opt.url.trim().length > 0 &&
      (opt.url.startsWith('http://') ||
        opt.url.startsWith('https://') ||
        opt.url.startsWith('/api/'))
  );

  const videoOptions: DownloadOption[] = [];
  const audioOptions: DownloadOption[] = [];
  const imageOptions: DownloadOption[] = [];
  const seenVideoKeys = new Set<string>();
  const seenAudioKeys = new Set<string>();
  const seenImageKeys = new Set<string>();

  for (const opt of validOptions) {
    if (opt.type === 'video') {
      const key = `${String(opt.resolution || opt.quality || opt.id || '').toLowerCase()}::${
        opt.noWatermark === false ? 'wm' : 'clean'
      }`;
      if (!seenVideoKeys.has(key)) {
        seenVideoKeys.add(key);
        videoOptions.push(opt);
      }
    } else if (opt.type === 'audio') {
      const key = String(opt.format || opt.resolution || opt.id || 'audio').toLowerCase();
      if (!seenAudioKeys.has(key)) {
        seenAudioKeys.add(key);
        audioOptions.push(opt);
      }
    } else if (opt.type === 'image') {
      const key = String(opt.url || opt.id || 'image');
      if (!seenImageKeys.has(key)) {
        seenImageKeys.add(key);
        imageOptions.push(opt);
      }
    }
  }

  const parseTierRank = (opt: DownloadOption): number => {
    const m = String(opt.resolution || opt.quality || opt.label || opt.id || '').match(
      /(4320|2160|1440|1080|720|540|480|360|240|144)/
    );
    if (m) return parseInt(m[1], 10);
    if (/8k/i.test(opt.resolution || opt.label)) return 4320;
    if (/4k/i.test(opt.resolution || opt.label)) return 2160;
    if (/2k|qhd/i.test(opt.resolution || opt.label)) return 1440;
    if (/full\s*hd|fhd/i.test(opt.resolution || opt.label)) return 1080;
    if (/hd/i.test(opt.resolution || opt.label)) return 720;
    return 500;
  };

  videoOptions.sort((a, b) => parseTierRank(b) - parseTierRank(a));

  const taggedVideoOptions = videoOptions.map((opt, index) => {
    if (index === 0) {
      return {
        ...opt,
        badge:
          opt.badge && /original|source/i.test(opt.badge)
            ? opt.badge
            : 'Original Source Quality',
      };
    }
    return opt;
  });

  return {
    ...mediaData,
    downloadOptions: [...taggedVideoOptions, ...audioOptions, ...imageOptions],
  };
}

// Fallback basic structure if network drops
export function generateClientSideMediaResult(url: string, removeWatermark: boolean = true): MediaResult {
  const platform = detectPlatform(url);
  const cleanUrl = cleanSocialUrl(url);

  const title = `${platform.toUpperCase()} Video`;
  const author = `@${platform}_creator`;
  const thumbnail = "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800&auto=format&fit=crop&q=80";
  const videoUrl = `/api/stream?url=${encodeURIComponent(cleanUrl)}`;

  const downloadOptions: DownloadOption[] = [
    ...getPlatformVideoDownloadOptions(platform, cleanUrl, removeWatermark),
    {
      id: 'opt-audio',
      label: 'Audio MP3 (320 kbps HQ)',
      resolution: '320 kbps',
      format: 'MP3',
      size: '3.5 MB',
      quality: 'HQ 320 kbps',
      url: `/api/download?url=${encodeURIComponent(cleanUrl)}&format=audio`,
      type: 'audio',
      badge: 'Lossless Audio',
      noWatermark: false,
    },
    {
      id: 'opt-thumb',
      label: 'Cover Photo (Original JPG)',
      resolution: 'Original',
      format: 'JPG',
      size: '450 KB',
      quality: 'Original Image',
      url: thumbnail,
      type: 'image',
      badge: 'HD Cover Image',
      noWatermark: true,
    },
  ];

  return {
    originalUrl: cleanUrl,
    platform,
    title,
    author,
    authorAvatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80',
    thumbnail,
    videoUrl,
    audioUrl: `/api/download?url=${encodeURIComponent(cleanUrl)}&format=audio`,
    isVideo: true,
    caption: `${platform.toUpperCase()} media ready for download`,
    timestamp: new Date().toISOString(),
    watermarkRemoved: removeWatermark,
    watermarkMethod: `${platform.toUpperCase()} Direct Extraction Pipeline`,
    downloadOptions,
  };
}

/**
 * Parses file size string (e.g. "45 MB", "1.2 GB", "500 KB") to megabytes as a number
 */
export function parseSizeToMb(sizeStr: string): number {
  if (!sizeStr) return 0;
  const clean = sizeStr.trim();
  const match = clean.match(/([\d.]+)\s*(GB|MB|KB|B)?/i);
  if (!match) return 0;
  const num = parseFloat(match[1]);
  if (isNaN(num)) return 0;
  const unit = (match[2] || 'MB').toUpperCase();
  if (unit === 'GB') return num * 1024;
  if (unit === 'KB') return num / 1024;
  if (unit === 'B') return num / (1024 * 1024);
  return num;
}

/**
 * Exports current download tasks and saved history items as a CSV file for record-keeping.
 * Uses UTF-8 BOM so Microsoft Excel, Apple Numbers, and Google Sheets display special characters accurately.
 */
export function exportRecordsToCSV(tasks: DownloadTask[] = [], history: HistoryItem[] = []): boolean {
  if (tasks.length === 0 && history.length === 0) {
    return false;
  }

  const escapeCSV = (str: string | number | undefined | null): string => {
    if (str === undefined || str === null) return '""';
    const s = String(str).replace(/"/g, '""');
    return `"${s}"`;
  };

  const headers = [
    'Record Type',
    'Media Title',
    'Platform',
    'Format',
    'Quality / Resolution',
    'File Size',
    'Current Status',
    'Progress (%)',
    'Transfer Speed',
    'Date Added / Downloaded',
    'Completed Timestamp',
    'Source / Original URL',
    'Target File Name',
    'Creator / Author',
    'No Watermark',
    'Batch Identifier',
    'Error Reason',
    'Record ID'
  ];

  const rows: string[][] = [];

  // 1. Current Task List
  tasks.forEach((t) => {
    rows.push([
      'Current Task',
      t.mediaTitle || 'Untitled',
      t.platform ? t.platform.toUpperCase() : 'UNKNOWN',
      t.format || 'MP4',
      t.quality || '',
      t.size || '',
      t.status,
      `${t.progress || 0}%`,
      t.speed || 'N/A',
      t.createdAt ? new Date(t.createdAt).toLocaleString() : 'N/A',
      t.completedAt ? new Date(t.completedAt).toLocaleString() : (t.status === 'completed' ? 'Completed' : 'In Progress'),
      t.sourceUrl || t.url || '',
      t.filename || '',
      'N/A',
      t.noWatermark ? 'Yes' : 'No',
      t.batchId || 'Standalone',
      t.errorReason || '',
      t.id
    ]);
  });

  // 2. Download History
  history.forEach((h) => {
    rows.push([
      'Download History',
      h.title || 'Untitled',
      h.platform ? h.platform.toUpperCase() : 'UNKNOWN',
      h.format || 'MP4',
      h.quality || '',
      h.size || '',
      'completed',
      '100%',
      'N/A',
      h.downloadedAt ? new Date(h.downloadedAt).toLocaleString() : 'N/A',
      h.downloadedAt ? new Date(h.downloadedAt).toLocaleString() : 'Completed',
      h.originalUrl || h.mediaUrl || '',
      `${h.platform || 'media'}_${(h.title || 'download').slice(0, 30)}.${(h.format || 'mp4').toLowerCase()}`,
      h.author || 'N/A',
      h.noWatermark ? 'Yes' : 'No',
      'Historical Archive',
      '',
      h.id
    ]);
  });

  const csvContent = '\uFEFF' + [
    headers.map(escapeCSV).join(','),
    ...rows.map((row) => row.map(escapeCSV).join(','))
  ].join('\r\n');

  try {
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const now = new Date();
    const dateStr = now.toISOString().slice(0, 10);
    const hours = String(now.getHours()).padStart(2, '0');
    const mins = String(now.getMinutes()).padStart(2, '0');
    const secs = String(now.getSeconds()).padStart(2, '0');
    link.setAttribute('href', url);
    link.setAttribute('download', `download_records_${dateStr}_${hours}${mins}${secs}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    return true;
  } catch (err) {
    console.error('Failed to export CSV:', err);
    return false;
  }
}

/**
 * Dedicated exporter for the entire Download History Gallery to a CSV file for backup and record keeping.
 * Formats every history item with detailed metadata and uses UTF-8 BOM for crystal-clear Urdu, Arabic, and Unicode support.
 */
export function exportHistoryGalleryToCSV(history: HistoryItem[] = []): boolean {
  if (!history || history.length === 0) {
    return false;
  }

  const escapeCSV = (str: string | number | undefined | null): string => {
    if (str === undefined || str === null) return '""';
    const s = String(str).replace(/"/g, '""');
    return `"${s}"`;
  };

  const headers = [
    'Index',
    'Media Title',
    'Platform',
    'Format',
    'Quality / Resolution',
    'Approx Size',
    'Media Type',
    'Author / Creator',
    'Download Date & Time',
    'Epoch Timestamp',
    'Direct Media Stream URL',
    'Original Source URL',
    'Thumbnail Preview URL',
    'Watermark Cleaned',
    'Device Storage Status',
    'History Record ID'
  ];

  const rows = history.map((h, idx) => [
    idx + 1,
    h.title || 'Untitled Video',
    h.platform ? h.platform.toUpperCase() : 'UNIVERSAL',
    h.format || 'MP4',
    h.quality || 'Standard HD',
    h.size || 'N/A',
    h.type || 'video',
    h.author || '@creator',
    h.downloadedAt ? new Date(h.downloadedAt).toLocaleString() : 'N/A',
    h.downloadedAt || '',
    h.mediaUrl || '',
    h.originalUrl || '',
    h.thumbnail || '',
    h.noWatermark ? 'Yes (Clean HD No Watermark)' : 'Original Stream',
    'Saved to Android / Device Storage',
    h.id
  ]);

  const csvContent = '\uFEFF' + [
    headers.map(escapeCSV).join(','),
    ...rows.map((row) => row.map(escapeCSV).join(','))
  ].join('\r\n');

  try {
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const now = new Date();
    const dateStr = now.toISOString().slice(0, 10);
    const hours = String(now.getHours()).padStart(2, '0');
    const mins = String(now.getMinutes()).padStart(2, '0');
    const secs = String(now.getSeconds()).padStart(2, '0');
    link.setAttribute('href', url);
    link.setAttribute('download', `download_history_backup_${dateStr}_${hours}${mins}${secs}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    return true;
  } catch (err) {
    console.error('Failed to export history CSV:', err);
    return false;
  }
}

const SAVED_ACCOUNTS_STORAGE_KEY = 'mediaflow_saved_accounts_v1';

/**
 * Automatically parses and identifies the creator's profile/account URL and handle
 * from a video URL, platform, and author string.
 */
export function deriveCreatorProfile(
  videoUrl: string,
  platform: PlatformType,
  author?: string,
  explicitProfileUrl?: string,
  explicitHandle?: string
): { profileUrl: string; handle: string } {
  const cleanUrl = (videoUrl || '').trim();
  const cleanExplicitProfile = (explicitProfileUrl || '').trim();
  const cleanAuthor = (author || '').trim().replace(/^@+/, '').replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_.-]/g, '');
  const cleanExplicitHandle = (explicitHandle || '').trim().replace(/^@+/, '').replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_.-]/g, '');
  const isNumericExplicit = /^\d{8,}$/.test(cleanExplicitHandle);

  let handle = (!isNumericExplicit && cleanExplicitHandle) ? cleanExplicitHandle : (cleanAuthor || cleanExplicitHandle);

  // Try extracting handle directly from URL or explicitProfileUrl patterns
  const combinedUrl = `${cleanExplicitProfile} ${cleanUrl}`;
  const tiktokMatch = combinedUrl.match(/tiktok\.com\/@([a-zA-Z0-9_.-]+)/i);
  const igMatch = combinedUrl.match(/instagram\.com\/(?!reel\/|p\/|tv\/|stories\/|explore\/|share\/)([a-zA-Z0-9_.-]+)/i);
  const xMatch = combinedUrl.match(/(?:twitter\.com|x\.com)\/(?!i\/|home|explore|search)([a-zA-Z0-9_]+)/i);
  const ytMatch = combinedUrl.match(/youtube\.com\/(@[a-zA-Z0-9_.-]+|channel\/[a-zA-Z0-9_-]+|c\/[a-zA-Z0-9_.-]+)/i);
  const threadsMatch = combinedUrl.match(/threads\.(?:net|com)\/(?!share\/|t\/|post\/)@?([a-zA-Z0-9_.-]+)/i);
  const redditMatch = combinedUrl.match(/reddit\.com\/(r\/[a-zA-Z0-9_]+|user\/[a-zA-Z0-9_-]+)/i);
  const pinMatch = combinedUrl.match(/pinterest\.com\/(?!pin\/)([a-zA-Z0-9_.-]+)/i);

  if (!handle || isNumericExplicit) {
    if (tiktokMatch?.[1]) handle = tiktokMatch[1];
    else if (igMatch?.[1]) handle = igMatch[1];
    else if (xMatch?.[1]) handle = xMatch[1];
    else if (ytMatch?.[1]) handle = ytMatch[1].replace(/^@/, '');
    else if (threadsMatch?.[1]) handle = threadsMatch[1];
    else if (redditMatch?.[1]) handle = redditMatch[1];
    else if (pinMatch?.[1]) handle = pinMatch[1];
    else if (cleanAuthor) handle = cleanAuthor;
  }

  if (!handle) {
    handle = `${platform}_creator`;
  }

  const displayHandle = handle.startsWith('@') || handle.startsWith('r/') ? handle : `@${handle}`;

  if (explicitProfileUrl && explicitProfileUrl.startsWith('http')) {
    return { profileUrl: explicitProfileUrl, handle: displayHandle };
  }

  const cleanHandle = handle.replace(/^@/, '');
  let profileUrl = `https://www.tiktok.com/@${cleanHandle}`;

  switch (platform) {
    case 'tiktok':
      profileUrl = `https://www.tiktok.com/@${cleanHandle}`;
      break;
    case 'instagram':
      profileUrl = `https://www.instagram.com/${cleanHandle}/`;
      break;
    case 'youtube':
      profileUrl = `https://www.youtube.com/@${cleanHandle}/videos`;
      break;
    case 'twitter':
      profileUrl = `https://x.com/${cleanHandle}`;
      break;
    case 'facebook':
      profileUrl = `https://www.facebook.com/${cleanHandle}`;
      break;
    case 'pinterest':
      profileUrl = `https://www.pinterest.com/${cleanHandle}/`;
      break;
    case 'threads':
      profileUrl = `https://www.threads.net/@${cleanHandle}`;
      break;
    case 'reddit':
      profileUrl = cleanHandle.startsWith('r/') || cleanHandle.startsWith('user/')
        ? `https://www.reddit.com/${cleanHandle}/`
        : `https://www.reddit.com/user/${cleanHandle}/`;
      break;
    default:
      profileUrl = cleanUrl;
      break;
  }

  return { profileUrl, handle: displayHandle };
}

/**
 * Checks if a user-entered string is a Creator Profile URL or @handle (rather than a single video post URL).
 */
export function parseCreatorProfileInput(
  rawInput: string
): { profileUrl: string; handle: string; authorName: string; platform: PlatformType } | null {
  const clean = (rawInput || '').trim();
  if (!clean) return null;

  // 1. Direct @handle input (e.g. "@zachking")
  if (/^@[a-zA-Z0-9_.-]{2,40}$/.test(clean)) {
    const h = clean.replace(/^@+/, '');
    return {
      profileUrl: `https://www.tiktok.com/@${h}`,
      handle: `@${h}`,
      authorName: h,
      platform: 'tiktok',
    };
  }

  // 2. TikTok Profile URL: tiktok.com/@user (without /video/ or /photo/)
  const ttProfile = clean.match(/^https?:\/\/(?:www\.|m\.)?tiktok\.com\/@([a-zA-Z0-9_.-]+)\/?(?:\?.*)?$/i);
  if (ttProfile?.[1] && !/\/video\/|\/photo\//i.test(clean)) {
    return {
      profileUrl: `https://www.tiktok.com/@${ttProfile[1]}`,
      handle: `@${ttProfile[1]}`,
      authorName: ttProfile[1],
      platform: 'tiktok',
    };
  }

  // 3. Instagram Profile URL: instagram.com/user (without /reel/, /p/, /tv/, /stories/, /share/)
  const igProfile = clean.match(
    /^https?:\/\/(?:www\.)?instagram\.com\/(?!reel\/|reels\/|p\/|tv\/|stories\/|explore\/|share\/)([a-zA-Z0-9_.-]+)\/?(?:\?.*)?$/i
  );
  if (igProfile?.[1]) {
    return {
      profileUrl: `https://www.instagram.com/${igProfile[1]}/`,
      handle: `@${igProfile[1]}`,
      authorName: igProfile[1],
      platform: 'instagram',
    };
  }

  // 4. YouTube Channel/Profile URL: youtube.com/@user or /channel/ or /c/ (without /watch or /shorts/)
  const ytProfile = clean.match(
    /^https?:\/\/(?:www\.|m\.)?youtube\.com\/(@[a-zA-Z0-9_.-]+|channel\/[a-zA-Z0-9_-]+|c\/[a-zA-Z0-9_.-]+|user\/[a-zA-Z0-9_.-]+)(?:\/videos|\/shorts|\/featured)?\/?(?:\?.*)?$/i
  );
  if (ytProfile?.[1] && !/\/watch|\/shorts\/[a-zA-Z0-9_-]{5,}/i.test(clean)) {
    const rawH = ytProfile[1].replace(/^(?:channel\/|c\/|user\/|@)/i, '');
    return {
      profileUrl: clean.split('?')[0],
      handle: `@${rawH}`,
      authorName: rawH,
      platform: 'youtube',
    };
  }

  // 5. Threads Profile URL: threads.net/@user or threads.com/@user (without /post/ or /t/ or /share/)
  const thProfile = clean.match(
    /^https?:\/\/(?:www\.)?threads\.(?:net|com)\/(?!post\/|t\/|share\/)@?([a-zA-Z0-9_.-]+)\/?(?:\?.*)?$/i
  );
  if (thProfile?.[1]) {
    return {
      profileUrl: `https://www.threads.net/@${thProfile[1]}`,
      handle: `@${thProfile[1]}`,
      authorName: thProfile[1],
      platform: 'threads',
    };
  }

  // 6. X / Twitter Profile URL: x.com/user or twitter.com/user (without /status/)
  const xProfile = clean.match(
    /^https?:\/\/(?:www\.|mobile\.)?(?:x\.com|twitter\.com)\/(?!i\/|home|explore|search|intent|share)([a-zA-Z0-9_]+)\/?(?:\?.*)?$/i
  );
  if (xProfile?.[1] && !/\/status\//i.test(clean)) {
    return {
      profileUrl: `https://x.com/${xProfile[1]}`,
      handle: `@${xProfile[1]}`,
      authorName: xProfile[1],
      platform: 'twitter',
    };
  }

  // 7. Pinterest Profile URL: pinterest.com/user/ (without /pin/)
  const pinProfile = clean.match(
    /^https?:\/\/(?:[a-z]{2,3}\.)?pinterest\.com\/(?!pin\/|search\/|ideas\/)([a-zA-Z0-9_.-]+)\/?(?:\?.*)?$/i
  );
  if (pinProfile?.[1]) {
    return {
      profileUrl: `https://www.pinterest.com/${pinProfile[1]}/`,
      handle: `@${pinProfile[1]}`,
      authorName: pinProfile[1],
      platform: 'pinterest',
    };
  }

  // 8. Reddit Subreddit or User Profile URL (without /comments/ or /s/)
  const rdProfile = clean.match(
    /^https?:\/\/(?:www\.|old\.)?reddit\.com\/(r\/[a-zA-Z0-9_]+|user\/[a-zA-Z0-9_-]+|u\/[a-zA-Z0-9_-]+)\/?(?:\?.*)?$/i
  );
  if (rdProfile?.[1] && !/\/comments\/|\/s\//i.test(clean)) {
    const h = rdProfile[1].replace(/^u\//i, 'user/');
    return {
      profileUrl: `https://www.reddit.com/${h}/`,
      handle: h.startsWith('r/') ? h : `@${h.replace(/^user\//i, '')}`,
      authorName: h,
      platform: 'reddit',
    };
  }

  return null;
}

const DEFAULT_SAVED_ACCOUNTS: SavedAccountItem[] = [
  {
    id: 'acc_default_tiktok',
    handle: '@tiktok',
    authorName: 'TikTok Official',
    avatar: 'https://images.unsplash.com/photo-1611605698335-8b1569810432?w=120&auto=format&fit=crop&q=80',
    platform: 'tiktok',
    profileUrl: 'https://www.tiktok.com/@tiktok',
    lastVisitedAt: Date.now() - 3600000,
    videoCount: 18,
    isBookmarked: true,
  },
  {
    id: 'acc_default_zachking',
    handle: '@zachking',
    authorName: 'Zach King',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120&auto=format&fit=crop&q=80',
    platform: 'tiktok',
    profileUrl: 'https://www.tiktok.com/@zachking',
    lastVisitedAt: Date.now() - 7200000,
    videoCount: 18,
    isBookmarked: true,
  },
  {
    id: 'acc_default_khabylame',
    handle: '@khaby.lame',
    authorName: 'Khaby Lame',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=120&auto=format&fit=crop&q=80',
    platform: 'tiktok',
    profileUrl: 'https://www.tiktok.com/@khaby.lame',
    lastVisitedAt: Date.now() - 10800000,
    videoCount: 18,
    isBookmarked: true,
  },
  {
    id: 'acc_default_nasa',
    handle: '@nasa',
    authorName: 'NASA Official',
    avatar: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=120&auto=format&fit=crop&q=80',
    platform: 'instagram',
    profileUrl: 'https://www.instagram.com/nasa/',
    lastVisitedAt: Date.now() - 14400000,
    videoCount: 15,
    isBookmarked: true,
  },
  {
    id: 'acc_default_pinterest',
    handle: '@pinterest',
    authorName: 'Pinterest Creators',
    avatar: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=120&auto=format&fit=crop&q=80',
    platform: 'pinterest',
    profileUrl: 'https://www.pinterest.com/pinterest/',
    lastVisitedAt: Date.now() - 18000000,
    videoCount: 12,
    isBookmarked: true,
  },
];

let memorySavedAccountsCache: SavedAccountItem[] | null = null;

export function getSavedAccounts(): SavedAccountItem[] {
  if (memorySavedAccountsCache !== null) {
    return [...memorySavedAccountsCache];
  }
  try {
    if (typeof window === 'undefined') return [];
    const raw = localStorage.getItem(SAVED_ACCOUNTS_STORAGE_KEY);
    if (raw === null) {
      memorySavedAccountsCache = [...DEFAULT_SAVED_ACCOUNTS];
      localStorage.setItem(SAVED_ACCOUNTS_STORAGE_KEY, JSON.stringify(DEFAULT_SAVED_ACCOUNTS));
      return [...DEFAULT_SAVED_ACCOUNTS];
    }
    const parsed = JSON.parse(raw);
    memorySavedAccountsCache = Array.isArray(parsed) ? parsed : [];
    return [...memorySavedAccountsCache];
  } catch {
    memorySavedAccountsCache = [];
    return [];
  }
}

export function saveOrUpdateAccount(
  item: Omit<SavedAccountItem, 'id' | 'lastVisitedAt'> & { id?: string }
): SavedAccountItem[] {
  try {
    const existing = getSavedAccounts();
    const normKey = `${item.platform}_${item.handle.toLowerCase().replace(/^@/, '')}`;
    const foundIdx = existing.findIndex(
      (a) =>
        a.profileUrl.toLowerCase() === item.profileUrl.toLowerCase() ||
        `${a.platform}_${a.handle.toLowerCase().replace(/^@/, '')}` === normKey
    );

    const updatedItem: SavedAccountItem = {
      id: foundIdx >= 0 ? existing[foundIdx].id : item.id || `acc_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      handle: item.handle,
      authorName: item.authorName || item.handle,
      avatar: item.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100',
      platform: item.platform,
      profileUrl: item.profileUrl,
      lastVisitedAt: Date.now(),
      videoCount: item.videoCount ?? (foundIdx >= 0 ? existing[foundIdx].videoCount : 12),
      isBookmarked: item.isBookmarked ?? (foundIdx >= 0 ? existing[foundIdx].isBookmarked : true),
      sampleVideoUrl: item.sampleVideoUrl ?? (foundIdx >= 0 ? existing[foundIdx].sampleVideoUrl : undefined),
    };

    const filtered = existing.filter((_, idx) => idx !== foundIdx);
    const next = [updatedItem, ...filtered].slice(0, 30);
    memorySavedAccountsCache = next;
    if (typeof window !== 'undefined') {
      localStorage.setItem(SAVED_ACCOUNTS_STORAGE_KEY, JSON.stringify(next));
    }
    try {
      cacheSavedAccountInServiceWorker(updatedItem);
    } catch {
      // ignore SW cache errors
    }
    return [...next];
  } catch {
    return getSavedAccounts();
  }
}

export function removeSavedAccount(id: string): SavedAccountItem[] {
  try {
    const existing = getSavedAccounts();
    const next = existing.filter((a) => a.id !== id && a.profileUrl !== id);
    memorySavedAccountsCache = next;
    if (typeof window !== 'undefined') {
      localStorage.setItem(SAVED_ACCOUNTS_STORAGE_KEY, JSON.stringify(next));
    }
    return [...next];
  } catch {
    return [];
  }
}

export function clearAllSavedAccounts(): void {
  memorySavedAccountsCache = [];
  try {
    if (typeof window !== 'undefined') {
      localStorage.setItem(SAVED_ACCOUNTS_STORAGE_KEY, '[]');
    }
  } catch {}
}




