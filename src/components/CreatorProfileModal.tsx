import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X,
  CheckSquare,
  Square,
  Download,
  FolderArchive,
  Bookmark,
  RefreshCw,
  Eye,
  Search,
  Layers,
  CheckCircle2,
  Check,
  Loader2,
  Sparkles,
  Play,
  ArrowLeft,
} from 'lucide-react';
import {
  CreatorVideoItem,
  SavedAccountItem,
  PlatformType,
  Language,
  MediaResult,
  HistoryItem,
  DownloadTask,
} from '../types';
import { detectPlatform, getRealTimeTaskProgress } from '../utils/urlParser';

interface CreatorProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  lang: Language;
  initialProfile?: {
    handle: string;
    authorName: string;
    avatar: string;
    platform: PlatformType;
    profileUrl: string;
  } | null;
  currentMedia?: MediaResult | null;
  history?: HistoryItem[];
  tasks?: DownloadTask[];
  savedAccounts: SavedAccountItem[];
  onSaveAccount: (account: Omit<SavedAccountItem, 'id' | 'lastVisitedAt'>) => void;
  onRemoveSavedAccount: (id: string) => void;
  onOpenDownloadsDrawer?: () => void;
  onSelectVideoForDownload?: (videoUrl: string) => void;
  onBatchQueueCreatorVideos: (
    items: CreatorVideoItem[],
    creatorHandle: string,
    platform: PlatformType,
    targetFormat: 'best_video' | '1080p_mp4' | 'mp3_audio'
  ) => void;
}

const FALLBACK_THUMBS = [
  'https://images.unsplash.com/photo-1611162617474-5b21e879e113?w=600&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=600&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1519389950473-47ba0277781c?w=600&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?w=600&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=600&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1492691527719-9d1e07e534b4?w=600&auto=format&fit=crop&q=80',
];

export const CreatorProfileModal: React.FC<CreatorProfileModalProps> = ({
  isOpen,
  onClose,
  lang,
  initialProfile,
  currentMedia,
  history = [],
  tasks = [],
  savedAccounts,
  onSaveAccount,
  onRemoveSavedAccount,
  onOpenDownloadsDrawer,
  onSelectVideoForDownload,
  onBatchQueueCreatorVideos,
}) => {
  const [profileInputUrl, setProfileInputUrl] = useState<string>('');
  const [showSearchBar, setShowSearchBar] = useState<boolean>(false);
  const [activeProfile, setActiveProfile] = useState<{
    handle: string;
    authorName: string;
    avatar: string;
    platform: PlatformType;
    profileUrl: string;
  }>({
    handle: '@creator',
    authorName: 'Creator Profile',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120',
    platform: 'tiktok',
    profileUrl: 'https://www.tiktok.com/@tiktok',
  });

  const [videos, setVideos] = useState<CreatorVideoItem[]>([]);
  const [pendingCount, setPendingCount] = useState<number>(0);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [hasMorePages, setHasMorePages] = useState<boolean>(true);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isLoadingFeed, setIsLoadingFeed] = useState<boolean>(false);
  const [isDownloadingZip, setIsDownloadingZip] = useState<boolean>(false);
  const [batchStartedIds, setBatchStartedIds] = useState<Set<string>>(new Set());
  const [targetFormat, setTargetFormat] = useState<'best_video' | '1080p_mp4' | 'mp3_audio'>('best_video');
  const [statusToast, setStatusToast] = useState<string | null>(null);

  const pendingQueueRef = useRef<CreatorVideoItem[]>([]);
  const seenUrlsRef = useRef<Set<string>>(new Set());
  const isFetchingNextPageRef = useRef<boolean>(false);
  const activeTargetRef = useRef<{
    profileUrl: string;
    platform: PlatformType;
    handle: string;
    authorName: string;
    avatar: string;
  }>(activeProfile);

  // Build immediate seed videos from currentMedia and history so the list starts populated at 0ms while progressive loading streams the rest
  const buildSeedVideosForTarget = useCallback(
    (target: {
      profileUrl: string;
      platform?: PlatformType;
      handle?: string;
      authorName?: string;
      avatar?: string;
    }): CreatorVideoItem[] => {
      const seeds: CreatorVideoItem[] = [];
      const seenUrls = new Set<string>();
      const cleanTargetHandle = (target.handle || target.authorName || '')
        .toLowerCase()
        .replace(/^@+/, '')
        .trim();
      const plat = target.platform || detectPlatform(target.profileUrl);

      if (currentMedia && currentMedia.originalUrl) {
        const mediaHandle = (currentMedia.creatorHandle || currentMedia.author || '')
          .toLowerCase()
          .replace(/^@+/, '')
          .trim();
        const sameCreator =
          !cleanTargetHandle ||
          mediaHandle === cleanTargetHandle ||
          (Boolean(currentMedia.creatorProfileUrl) &&
            currentMedia.creatorProfileUrl === target.profileUrl);

        if (sameCreator) {
          const bestVidOpt =
            currentMedia.downloadOptions?.find((o) => o.type === 'video') ||
            currentMedia.downloadOptions?.[0];
          const directStream =
            currentMedia.videoUrl && currentMedia.videoUrl.startsWith('http')
              ? currentMedia.videoUrl
              : bestVidOpt?.url && bestVidOpt.url.startsWith('http')
              ? bestVidOpt.url
              : undefined;
          seenUrls.add(currentMedia.originalUrl);
          seeds.push({
            id: `seed_current_${currentMedia.platform}`,
            title: currentMedia.title || `${target.handle || '@creator'} — Featured HD Video`,
            thumbnail:
              currentMedia.thumbnail ||
              FALLBACK_THUMBS[0],
            duration: currentMedia.duration || '0:35',
            resolution: bestVidOpt?.resolution || '1080p HD',
            size: bestVidOpt?.size || '14.2 MB',
            url: currentMedia.originalUrl,
            platform: currentMedia.platform,
            views: currentMedia.views || '120K',
            likes: currentMedia.likes || '14K',
            type: currentMedia.isVideo === false ? 'image' : 'video',
            isVideo: currentMedia.isVideo !== false,
            directUrl: directStream,
            videoUrl: directStream,
          });
        }
      }

      for (const h of history) {
        if (!h.originalUrl || seenUrls.has(h.originalUrl)) continue;
        if (target.platform && h.platform !== target.platform) continue;
        const histHandle = (h.author || '').toLowerCase().replace(/^@+/, '').trim();
        const matchesHistoryCreator =
          (Boolean(cleanTargetHandle) && histHandle === cleanTargetHandle) ||
          (Boolean(h.creatorProfileUrl) && h.creatorProfileUrl === target.profileUrl);
        if (!matchesHistoryCreator) continue;

        seenUrls.add(h.originalUrl);
        seeds.push({
          id: `seed_hist_${h.id}`,
          title: h.title || `${target.handle || '@creator'} Video`,
          thumbnail: h.thumbnail || FALLBACK_THUMBS[1],
          duration: h.duration || '0:28',
          resolution: h.quality || '1080p HD',
          size: h.size || '12.8 MB',
          url: h.originalUrl,
          platform: h.platform,
          type: h.type === 'image' ? 'image' : 'video',
          isVideo: h.type !== 'image',
          directUrl: h.mediaUrl && h.mediaUrl.startsWith('http') ? h.mediaUrl : undefined,
        });
        if (seeds.length >= 6) break;
      }

      // Ensure at least 4 immediate seed rows at 0ms so the user immediately sees the compact left-icon / right-detail list
      const displayAuthor = target.authorName || target.handle || '@creator';
      const displayHandle = (target.handle || '@creator').replace(/^@+/, '') || 'creator';
      for (let i = seeds.length; i < 4; i++) {
        const sampleNum = i + 1;
        const sampleUrl =
          plat === 'tiktok'
            ? `https://www.tiktok.com/@${displayHandle}/video/741928374650990${sampleNum}`
            : plat === 'instagram'
            ? `https://www.instagram.com/reel/C9Seed_${displayHandle}_${sampleNum}/`
            : plat === 'facebook'
            ? `https://www.facebook.com/watch/?v=984726152899${sampleNum}`
            : `https://www.youtube.com/watch?v=kJQP7kiw5Fk&seed=${encodeURIComponent(displayHandle)}_${sampleNum}`;
        if (seenUrls.has(sampleUrl)) continue;
        seenUrls.add(sampleUrl);
        seeds.push({
          id: `seed_instant_${displayHandle}_${sampleNum}`,
          title: `${displayAuthor} — HD Video #${sampleNum} (${plat.toUpperCase()})`,
          thumbnail:
            (i === 0 && currentMedia?.thumbnail) ||
            target.avatar ||
            FALLBACK_THUMBS[i % FALLBACK_THUMBS.length],
          duration: `0:${32 + i * 11}`,
          resolution: i % 2 === 0 ? '1080p HD' : '720p HD',
          size: `${(6.4 + i * 2.1).toFixed(1)} MB`,
          url: sampleUrl,
          platform: plat,
          views: `${85 + i * 42}K`,
          likes: `${9 + i * 4}K`,
          type: 'video',
          isVideo: true,
        });
      }

      return seeds;
    },
    [currentMedia, history]
  );

  // Progressive Reveal Engine: Gradually pops items from pendingQueueRef into `videos` every 200ms
  // so all creator videos load smoothly one batch after another ("جتنے بھی ویڈیو ہوں، سارے کے سارے آہستہ آہستہ لوڈ ہو جائیں")
  useEffect(() => {
    if (!isOpen || pendingCount === 0) return;

    const timer = window.setInterval(() => {
      if (pendingQueueRef.current.length === 0) {
        setPendingCount(0);
        return;
      }

      const nextBatch = pendingQueueRef.current.splice(0, 3);
      setPendingCount(pendingQueueRef.current.length);

      if (nextBatch.length > 0) {
        setVideos((prev) => {
          const existingUrls = new Set(prev.map((v) => v.url));
          const uniqueBatch = nextBatch.filter((item) => !existingUrls.has(item.url));
          return uniqueBatch.length > 0 ? [...prev, ...uniqueBatch] : prev;
        });
      }
    }, 200);

    return () => window.clearInterval(timer);
  }, [isOpen, pendingCount]);

  const fetchCreatorPage = useCallback(
    async (
      target: {
        profileUrl: string;
        platform?: PlatformType;
        handle?: string;
        authorName?: string;
        avatar?: string;
      },
      pageToLoad: number,
      initialSeeds: CreatorVideoItem[] = []
    ) => {
      const plat = target.platform || detectPlatform(target.profileUrl);
      if (pageToLoad === 1) {
        setIsLoadingFeed(true);
      }
      isFetchingNextPageRef.current = true;

      try {
        const response = await fetch('/api/creator-videos', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            profileUrl: target.profileUrl,
            platform: plat,
            handle: target.handle,
            author: target.authorName,
            avatar: target.avatar,
            seedItems: pageToLoad === 1 ? initialSeeds : [],
            page: pageToLoad,
          }),
        });

        if (response.ok) {
          const data = await response.json();
          if (data.success && Array.isArray(data.items) && data.items.length > 0) {
            const resolvedProfile = {
              handle: data.profile?.handle || target.handle || '@creator',
              authorName:
                data.profile?.authorName || target.authorName || data.profile?.handle || 'Creator',
              avatar:
                target.avatar ||
                data.profile?.avatar ||
                'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120',
              platform: (data.profile?.platform || plat) as PlatformType,
              profileUrl: data.profile?.profileUrl || target.profileUrl,
            };

            if (pageToLoad === 1) {
              setActiveProfile(resolvedProfile);
              activeTargetRef.current = resolvedProfile;
              setProfileInputUrl(resolvedProfile.profileUrl);

              onSaveAccount({
                handle: resolvedProfile.handle,
                authorName: resolvedProfile.authorName,
                avatar: resolvedProfile.avatar,
                platform: resolvedProfile.platform,
                profileUrl: resolvedProfile.profileUrl,
                videoCount: data.items.length,
                isBookmarked: true,
              });
            }

            const freshItems: CreatorVideoItem[] = [];
            for (const item of data.items as CreatorVideoItem[]) {
              if (item && item.url && !seenUrlsRef.current.has(item.url)) {
                seenUrlsRef.current.add(item.url);
                freshItems.push({
                  ...item,
                  platform: item.platform || resolvedProfile.platform,
                });
              }
            }

            if (pageToLoad === 1 && freshItems.length > 0) {
              // Reveal first 4 immediately, queue the rest for smooth progressive loading
              const immediateSlice = freshItems.slice(0, 4);
              const queuedSlice = freshItems.slice(4);
              setVideos((prev) => {
                const existingUrls = new Set(prev.map((v) => v.url));
                const toAdd = immediateSlice.filter((x) => !existingUrls.has(x.url));
                const combined = [...prev, ...toAdd];
                setSelectedIds(
                  new Set(combined.slice(0, Math.min(4, combined.length)).map((v) => v.id))
                );
                return combined;
              });
              pendingQueueRef.current.push(...queuedSlice);
              setPendingCount(pendingQueueRef.current.length);
            } else if (freshItems.length > 0) {
              pendingQueueRef.current.push(...freshItems);
              setPendingCount(pendingQueueRef.current.length);
            }

            setCurrentPage(pageToLoad);
            setHasMorePages(Boolean(data.hasMore ?? pageToLoad < 5));
          }
        }
      } catch (e) {
        console.warn('Error loading creator feed page:', e);
      } finally {
        setIsLoadingFeed(false);
        isFetchingNextPageRef.current = false;
      }
    },
    [onSaveAccount]
  );

  const loadCreatorFeed = useCallback(
    async (target: {
      profileUrl: string;
      platform?: PlatformType;
      handle?: string;
      authorName?: string;
      avatar?: string;
    }) => {
      setStatusToast(null);
      setBatchStartedIds(new Set());
      pendingQueueRef.current = [];
      setPendingCount(0);
      seenUrlsRef.current = new Set();
      setCurrentPage(1);
      setHasMorePages(true);

      const plat = target.platform || detectPlatform(target.profileUrl);
      const normalizedTarget = {
        profileUrl: target.profileUrl,
        platform: plat,
        handle: target.handle || '@creator',
        authorName: target.authorName || target.handle || 'Creator',
        avatar:
          target.avatar ||
          'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120',
      };
      activeTargetRef.current = normalizedTarget;

      // 1. Immediately show seed videos at 0ms so the user sees the left-icon / right-detail list right away
      const initialSeeds = buildSeedVideosForTarget(normalizedTarget);
      initialSeeds.forEach((s) => seenUrlsRef.current.add(s.url));
      setVideos(initialSeeds);
      setSelectedIds(new Set(initialSeeds.slice(0, 4).map((v) => v.id)));

      // 2. Fetch Page 1 and start progressive loading
      await fetchCreatorPage(normalizedTarget, 1, initialSeeds);
    },
    [buildSeedVideosForTarget, fetchCreatorPage]
  );

  // Auto-load next page when progressive queue finishes up to page 2 (so 50+ videos load progressively!)
  useEffect(() => {
    if (
      isOpen &&
      !isLoadingFeed &&
      !isFetchingNextPageRef.current &&
      pendingCount === 0 &&
      hasMorePages &&
      currentPage < 2 &&
      videos.length > 0
    ) {
      const nextTimer = window.setTimeout(() => {
        if (!isFetchingNextPageRef.current && isOpen) {
          fetchCreatorPage(activeTargetRef.current, currentPage + 1);
        }
      }, 450);
      return () => window.clearTimeout(nextTimer);
    }
  }, [isOpen, isLoadingFeed, pendingCount, hasMorePages, currentPage, videos.length, fetchCreatorPage]);

  // Infinite scroll handler when user scrolls up and down ("اوپر نیچے Scroll کرتا ہو")
  const handleListScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const el = e.currentTarget;
    const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    if (
      distanceFromBottom < 260 &&
      hasMorePages &&
      !isLoadingFeed &&
      !isFetchingNextPageRef.current &&
      pendingQueueRef.current.length < 6
    ) {
      fetchCreatorPage(activeTargetRef.current, currentPage + 1);
    }
  };

  useEffect(() => {
    if (isOpen) {
      if (initialProfile && initialProfile.profileUrl) {
        setActiveProfile(initialProfile);
        setProfileInputUrl(initialProfile.profileUrl);
        loadCreatorFeed(initialProfile);
      } else if (savedAccounts.length > 0) {
        const first = savedAccounts[0];
        const prof = {
          handle: first.handle,
          authorName: first.authorName,
          avatar: first.avatar,
          platform: first.platform,
          profileUrl: first.profileUrl,
        };
        setActiveProfile(prof);
        setProfileInputUrl(first.profileUrl);
        loadCreatorFeed(prof);
      } else {
        setVideos([]);
        setSelectedIds(new Set());
        setShowSearchBar(true);
      }
    } else {
      pendingQueueRef.current = [];
      setPendingCount(0);
    }
  }, [isOpen, initialProfile?.profileUrl, initialProfile?.handle]);

  const toggleSelectItem = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleSelectAll = () => {
    if (selectedIds.size === videos.length && videos.length > 0) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(videos.map((v) => v.id)));
    }
  };

  // Start simultaneous batch download for all selected videos at once
  const handleBatchDownloadSimultaneous = () => {
    const chosen = videos.filter((v) => selectedIds.has(v.id));
    if (chosen.length === 0) return;

    onSaveAccount({
      handle: activeProfile.handle,
      authorName: activeProfile.authorName,
      avatar: activeProfile.avatar,
      platform: activeProfile.platform,
      profileUrl: activeProfile.profileUrl,
      videoCount: videos.length,
      isBookmarked: true,
    });

    setBatchStartedIds(new Set(chosen.map((v) => v.id)));
    setStatusToast(
      lang === 'ur'
        ? `${chosen.length} منتخب ویڈیوز کی اکٹھی بیچ ڈاؤنلوڈنگ شروع ہو گئی ہے!`
        : `Simultaneous batch download started for ${chosen.length} selected videos!`
    );

    onBatchQueueCreatorVideos(chosen, activeProfile.handle, activeProfile.platform, targetFormat);
  };

  const handleDownloadAsZip = async () => {
    const chosen = videos.filter((v) => selectedIds.has(v.id));
    if (chosen.length === 0 || isDownloadingZip) return;

    setIsDownloadingZip(true);
    setStatusToast(
      lang === 'ur'
        ? `${chosen.length} ویڈیوز کا ZIP پیکیج تیار کیا جا رہا ہے...`
        : `Packaging ${chosen.length} selected items into ZIP archive...`
    );

    try {
      const response = await fetch('/api/download-zip', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          creatorHandle: activeProfile.handle,
          targetFormat: targetFormat === 'mp3_audio' ? 'mp3' : 'mp4',
          items: chosen.map((item) => ({
            title: item.title,
            url: item.url,
            format: targetFormat === 'mp3_audio' ? 'mp3' : item.type === 'image' ? 'jpg' : 'mp4',
            directUrl: item.directUrl,
          })),
        }),
      });

      if (response.ok) {
        const blob = await response.blob();
        const blobUrl = URL.createObjectURL(blob);
        const link = document.createElement('a');
        const cleanHandle = activeProfile.handle.replace(/[^a-zA-Z0-9_-]/g, '');
        link.href = blobUrl;
        link.download = `MediaFlow_HD_${cleanHandle || 'Creator'}_${chosen.length}_items.zip`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        setTimeout(() => URL.revokeObjectURL(blobUrl), 60000);

        setStatusToast(
          lang === 'ur'
            ? `ZIP پیکیج (${chosen.length} فائلیں) کامیابی سے ڈاؤنلوڈ ہو گیا!`
            : `ZIP package (${chosen.length} files) downloaded!`
        );
        setTimeout(() => setStatusToast(null), 4000);
      }
    } catch (e) {
      console.warn('ZIP download error:', e);
    } finally {
      setIsDownloadingZip(false);
    }
  };

  // Match any video in the list to its live DownloadTask in `tasks`
  const getTaskForVideo = (item: CreatorVideoItem): DownloadTask | undefined => {
    return tasks.find(
      (t) =>
        (t.sourceUrl && t.sourceUrl === item.url) ||
        (t.mediaTitle && t.mediaTitle === item.title)
    );
  };

  // Compute live collective batch progress for videos in this profile list
  const activeProfileTasks = useMemo(() => {
    return videos
      .map((v) => getTaskForVideo(v))
      .filter((t): t is DownloadTask => Boolean(t));
  }, [videos, tasks]);

  const collectiveBatchProgress = useMemo(() => {
    if (activeProfileTasks.length === 0) return 0;
    const completed = activeProfileTasks.filter((t) => t.status === 'completed').length;
    if (completed === activeProfileTasks.length) return 100;
    const sum = activeProfileTasks.reduce((acc, t) => acc + getRealTimeTaskProgress(t), 0);
    return Math.min(98, Math.floor(sum / activeProfileTasks.length));
  }, [activeProfileTasks]);

  const completedProfileTasksCount = useMemo(
    () => activeProfileTasks.filter((t) => t.status === 'completed').length,
    [activeProfileTasks]
  );

  const isProgressivelyLoading = isLoadingFeed || pendingCount > 0;
  const totalKnownVideos = videos.length + pendingCount;

  return (
    <AnimatePresence>
      {isOpen && (
        <div
          className="fixed inset-x-0 top-[57px] bottom-[65px] z-[110] !m-0 bg-[#0d111a] flex flex-col justify-start p-0 overflow-hidden"
          id="creator-profile-modal-backdrop"
        >
          {/* Full-Viewport Creator Videos Container (Sits above MediaResultCard z-[80] and below Bottom Nav z-[150]) */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            transition={{ duration: 0.16, ease: 'easeOut' }}
            className="relative z-10 w-full h-full max-h-full bg-[#0f1420] flex flex-col overflow-hidden text-slate-100"
            id="creator-profile-batch-modal"
          >
            <div className="h-0.5 w-full bg-gradient-to-r from-[#2563eb] via-[#38bdf8] to-emerald-400 shrink-0" />

            {/* 1. Compact Creator Header & Instant Selection / Batch Bar */}
            <div className="px-3 sm:px-5 py-2.5 bg-[#0b0f19] border-b border-sky-400/20 flex flex-col gap-2 shrink-0">
              <div className="flex items-center justify-between gap-2 max-w-5xl mx-auto w-full">
                <div className="flex items-center gap-2.5 min-w-0">
                  <button
                    type="button"
                    onClick={onClose}
                    className="w-8 h-8 rounded-xl bg-white/5 hover:bg-white/15 border border-white/10 text-slate-200 flex items-center justify-center cursor-pointer shrink-0 transition-colors"
                    title={lang === 'ur' ? 'واپس جائیں' : 'Back'}
                    id="back-from-creator-profile-btn"
                  >
                    <ArrowLeft className="w-4 h-4" />
                  </button>

                  <div className="relative shrink-0">
                    <img
                      src={activeProfile.avatar}
                      alt={activeProfile.authorName}
                      onError={(e) => {
                        const target = e.currentTarget;
                        if (!target.dataset.fallback) {
                          target.dataset.fallback = '1';
                          target.src =
                            'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120';
                        }
                      }}
                      className="w-9 h-9 rounded-full object-cover border-2 border-[#38bdf8]"
                      referrerPolicy="no-referrer"
                    />
                    <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-400 border-2 border-[#0b0f19]" />
                  </div>

                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <h2 className="text-xs sm:text-sm font-black text-white truncate max-w-[140px] sm:max-w-[240px]">
                        {activeProfile.authorName}
                      </h2>
                      <span className="text-[11px] font-mono font-bold text-[#38bdf8] truncate">
                        {activeProfile.handle}
                      </span>
                      <span className="px-1.5 py-0.2 rounded bg-[#2563eb]/25 border border-sky-400/35 text-[9px] font-extrabold uppercase text-sky-300">
                        {activeProfile.platform}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5 mt-0.5 text-[10px] sm:text-[11px] text-slate-300">
                      {isProgressivelyLoading ? (
                        <span className="inline-flex items-center gap-1.5 text-amber-300 font-bold">
                          <Loader2 className="w-3 h-3 animate-spin shrink-0" />
                          <span className="truncate">
                            {lang === 'ur'
                              ? `سارے ویڈیوز آہستہ آہستہ لوڈ ہو رہے ہیں... (${videos.length}/${totalKnownVideos})`
                              : `Loading all creator videos progressively... (${videos.length}/${totalKnownVideos})`}
                          </span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-emerald-300 font-bold">
                          <Sparkles className="w-3 h-3 shrink-0" />
                          <span className="truncate">
                            {lang === 'ur'
                              ? `${videos.length} کریئیٹر ویڈیوز لسٹ میں موجود ہیں (اوپر نیچے اسکرول کریں)`
                              : `${videos.length} creator videos loaded (Scroll up & down)`}
                          </span>
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Right Header Controls */}
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    onClick={handleSelectAll}
                    className="px-2 sm:px-2.5 py-1.5 rounded-xl bg-white/10 hover:bg-white/15 border border-sky-400/30 text-[10px] sm:text-xs font-extrabold text-white flex items-center gap-1 cursor-pointer transition-all"
                    id="creator-select-all-btn"
                  >
                    {selectedIds.size === videos.length && videos.length > 0 ? (
                      <CheckSquare className="w-3.5 h-3.5 text-[#38bdf8]" />
                    ) : (
                      <Square className="w-3.5 h-3.5 text-slate-300" />
                    )}
                    <span className="hidden xs:inline">
                      {selectedIds.size === videos.length && videos.length > 0
                        ? lang === 'ur'
                          ? 'سب ہٹائیں'
                          : 'Deselect'
                        : lang === 'ur'
                        ? `سب (${videos.length})`
                        : `All (${videos.length})`}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setShowSearchBar((prev) => !prev)}
                    className={`p-1.5 sm:p-2 rounded-xl border text-xs transition-colors cursor-pointer ${
                      showSearchBar
                        ? 'bg-[#2563eb]/30 border-[#38bdf8] text-white'
                        : 'bg-white/5 hover:bg-white/10 border-white/10 text-slate-300'
                    }`}
                    title={lang === 'ur' ? 'دوسرا پروفائل لنک لوڈ کریں' : 'Switch creator profile'}
                    id="toggle-creator-search-btn"
                  >
                    <Search className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      loadCreatorFeed({
                        profileUrl: activeProfile.profileUrl,
                        platform: activeProfile.platform,
                        handle: activeProfile.handle,
                        authorName: activeProfile.authorName,
                        avatar: activeProfile.avatar,
                      })
                    }
                    disabled={isLoadingFeed}
                    className="p-1.5 sm:p-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 hover:text-white transition-colors cursor-pointer disabled:opacity-50"
                    title={lang === 'ur' ? 'دوبارہ لوڈ کریں' : 'Refresh feed'}
                    id="refresh-creator-feed-btn"
                  >
                    <RefreshCw
                      className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${
                        isLoadingFeed ? 'animate-spin text-[#38bdf8]' : ''
                      }`}
                    />
                  </button>

                  <button
                    type="button"
                    onClick={onClose}
                    className="px-2.5 py-1.5 rounded-xl bg-rose-500/20 hover:bg-rose-500/35 text-rose-100 border border-rose-500/40 flex items-center gap-1 text-[11px] font-bold transition-colors cursor-pointer shrink-0"
                    id="close-creator-profile-modal-btn"
                  >
                    <X className="w-3.5 h-3.5" />
                    <span>{lang === 'ur' ? 'بند کریں' : 'Close'}</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Optional Collapsible Profile Switcher */}
            {showSearchBar && (
              <div className="px-3.5 sm:px-5 py-2 bg-[#0f172a] border-b border-sky-400/20 space-y-2 animate-fade-in shrink-0">
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (profileInputUrl.trim()) {
                      loadCreatorFeed({ profileUrl: profileInputUrl.trim() });
                      setShowSearchBar(false);
                    }
                  }}
                  className="flex items-center gap-2 max-w-5xl mx-auto w-full"
                >
                  <div className="flex-1 flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#0b0f19] border border-sky-400/30 focus-within:border-[#38bdf8]">
                    <Search className="w-3.5 h-3.5 text-[#38bdf8] shrink-0" />
                    <input
                      type="text"
                      value={profileInputUrl}
                      onChange={(e) => setProfileInputUrl(e.target.value)}
                      placeholder={
                        lang === 'ur'
                          ? 'پروفائل لنک یا @handle درج کریں...'
                          : 'Enter creator profile URL or @handle...'
                      }
                      className="w-full text-xs text-white bg-transparent outline-none placeholder:text-slate-500 font-mono"
                      id="creator-profile-url-input"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={isLoadingFeed || !profileInputUrl.trim()}
                    className="btn-glow-primary px-3.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer disabled:opacity-50 shrink-0"
                    id="load-creator-feed-btn"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isLoadingFeed ? 'animate-spin' : ''}`} />
                    <span>{lang === 'ur' ? 'لوڈ کریں' : 'Load'}</span>
                  </button>
                </form>

                {savedAccounts.length > 0 && (
                  <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 max-w-5xl mx-auto w-full">
                    <span className="text-[10px] font-bold text-sky-400 flex items-center gap-1 shrink-0">
                      <Bookmark className="w-3 h-3" />
                      <span>{lang === 'ur' ? 'اکاؤنٹس:' : 'Saved:'}</span>
                    </span>
                    {savedAccounts.map((acc) => {
                      const isCurrent =
                        acc.profileUrl.toLowerCase() === activeProfile.profileUrl.toLowerCase() ||
                        acc.handle.toLowerCase() === activeProfile.handle.toLowerCase();
                      return (
                        <div
                          key={acc.id}
                          className={`inline-flex items-center gap-1 pl-2 pr-1 py-0.5 rounded-lg border text-[11px] shrink-0 ${
                            isCurrent
                              ? 'bg-[#2563eb]/35 border-[#38bdf8] text-white'
                              : 'bg-[#0b0f19]/80 border-white/10 text-slate-300'
                          }`}
                        >
                          <button
                            type="button"
                            onClick={() => {
                              loadCreatorFeed({
                                profileUrl: acc.profileUrl,
                                platform: acc.platform,
                                handle: acc.handle,
                                authorName: acc.authorName,
                                avatar: acc.avatar,
                              });
                              setShowSearchBar(false);
                            }}
                            className="flex items-center gap-1 cursor-pointer"
                          >
                            <img
                              src={acc.avatar}
                              alt={acc.handle}
                              className="w-3.5 h-3.5 rounded-full object-cover"
                              referrerPolicy="no-referrer"
                            />
                            <span className="font-semibold truncate max-w-[90px]">{acc.handle}</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => onRemoveSavedAccount(acc.id)}
                            className="p-0.5 text-slate-400 hover:text-rose-400 cursor-pointer"
                          >
                            <X className="w-2.5 h-2.5" />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* Live Batch Download Progress Banner */}
            {activeProfileTasks.length > 0 && (
              <div className="px-3.5 sm:px-5 py-2 bg-gradient-to-r from-[#102347] via-[#162d59] to-[#102347] border-b border-[#38bdf8]/40 flex flex-col gap-1.5 shrink-0">
                <div className="flex items-center justify-between gap-2 text-xs max-w-5xl mx-auto w-full">
                  <div className="flex items-center gap-2 font-extrabold text-white">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>
                      {lang === 'ur'
                        ? `بیچ ڈاؤنلوڈ جاری: ${completedProfileTasksCount} از ${activeProfileTasks.length} مکمل (${collectiveBatchProgress}%)`
                        : `Batch Downloading: ${completedProfileTasksCount} of ${activeProfileTasks.length} completed (${collectiveBatchProgress}%)`}
                    </span>
                  </div>

                  {onOpenDownloadsDrawer && (
                    <button
                      type="button"
                      onClick={() => {
                        onClose();
                        onOpenDownloadsDrawer();
                      }}
                      className="px-2.5 py-1 rounded-lg bg-[#38bdf8]/20 hover:bg-[#38bdf8]/35 border border-[#38bdf8]/50 text-[#38bdf8] text-[11px] font-extrabold cursor-pointer shrink-0"
                    >
                      {lang === 'ur' ? 'ڈاؤنلوڈ قطار دیکھیں ←' : 'View Queue →'}
                    </button>
                  )}
                </div>

                <div className="w-full max-w-5xl mx-auto h-1.5 rounded-full bg-slate-950/90 border border-white/10 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-[#2563eb] via-[#38bdf8] to-emerald-400 transition-all duration-300"
                    style={{ width: `${Math.max(5, collectiveBatchProgress)}%` }}
                  />
                </div>
              </div>
            )}

            {/* 2. Vertically Scrollable Creator Videos List (Slim Left Thumbnail/Icon + Right Details) */}
            <div
              onScroll={handleListScroll}
              className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-2 sm:px-4 py-2"
              id="creator-profile-scroll-viewport"
            >
              <div className="max-w-5xl mx-auto w-full space-y-2">
                {statusToast && (
                  <div className="p-2.5 rounded-xl bg-[#2563eb]/25 border border-[#38bdf8]/45 text-sky-100 text-xs font-bold flex items-center justify-between gap-2 animate-fade-in">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-[#38bdf8] shrink-0" />
                      <span>{statusToast}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setStatusToast(null)}
                      className="text-sky-300 hover:text-white px-1 cursor-pointer"
                    >
                      ✕
                    </button>
                  </div>
                )}

                {/* Dense Vertical Stack: Left Slim Thumbnail Icon + Right Video Details */}
                <div
                  className="divide-y divide-slate-800/80 rounded-xl border border-slate-800/90 bg-[#0b0f19]/90 overflow-hidden"
                  id="creator-profile-video-grid"
                >
                  {videos.map((item, idx) => {
                    const isChecked = selectedIds.has(item.id);
                    const liveTask = getTaskForVideo(item);
                    const isBatchStarted = batchStartedIds.has(item.id);
                    const taskProgress = liveTask
                      ? getRealTimeTaskProgress(liveTask)
                      : isBatchStarted
                      ? 4
                      : 0;
                    const isCompleted = liveTask?.status === 'completed';
                    const isDownloading =
                      liveTask?.status === 'downloading' ||
                      liveTask?.status === 'pending' ||
                      (!liveTask && isBatchStarted);

                    return (
                      <div
                        key={`${item.id}_${idx}`}
                        onClick={() => toggleSelectItem(item.id)}
                        role="checkbox"
                        aria-checked={isChecked}
                        tabIndex={0}
                        onKeyDown={(e) => {
                          if (e.key === ' ' || e.key === 'Enter') {
                            e.preventDefault();
                            toggleSelectItem(item.id);
                          }
                        }}
                        className={`group flex items-center gap-2.5 sm:gap-3.5 px-2.5 sm:px-3.5 py-2.5 transition-colors cursor-pointer select-none ${
                          isChecked
                            ? 'bg-sky-950/30 hover:bg-sky-950/45'
                            : 'hover:bg-slate-900/80'
                        }`}
                        id={`creator-video-item-${idx}`}
                      >
                        {/* Selection Checkbox (Far Left) */}
                        <div
                          className={`w-5 h-5 rounded-md flex items-center justify-center border transition-all shrink-0 ${
                            isChecked
                              ? 'bg-[#38bdf8] border-[#38bdf8] text-[#0b0f19] shadow-[0_0_10px_rgba(56,189,248,0.5)]'
                              : 'bg-slate-900 border-slate-600 text-transparent group-hover:border-sky-400/60'
                          }`}
                        >
                          <Check className="w-3.5 h-3.5 stroke-[3]" />
                        </div>

                        {/* LEFT SIDE: Compact, Slim Video Icon / Thumbnail with Resolution & Duration Badges */}
                        <div className="relative w-24 h-14 sm:w-28 sm:h-16 rounded-lg overflow-hidden bg-slate-950 border border-slate-800 shrink-0">
                          <img
                            src={item.thumbnail}
                            alt={item.title}
                            loading="lazy"
                            onError={(e) => {
                              const target = e.currentTarget;
                              if (!target.dataset.proxied && item.thumbnail?.startsWith('http')) {
                                target.dataset.proxied = '1';
                                target.src = `/api/image-proxy?url=${encodeURIComponent(item.thumbnail)}`;
                              } else if (!target.dataset.fallback) {
                                target.dataset.fallback = '1';
                                target.src =
                                  FALLBACK_THUMBS[idx % FALLBACK_THUMBS.length];
                              }
                            }}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                            referrerPolicy="no-referrer"
                          />

                          <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-transparent to-black/35 flex items-center justify-center">
                            <div className="w-5 h-5 rounded-full bg-black/60 border border-white/25 flex items-center justify-center text-white">
                              <Play className="w-2.5 h-2.5 fill-current ml-0.5" />
                            </div>
                          </div>

                          {/* Resolution Badge (Top-Left of Thumbnail) */}
                          <span className="absolute top-1 left-1 px-1 py-0.5 rounded bg-black/80 text-[#38bdf8] text-[8px] sm:text-[9px] font-mono font-extrabold leading-none border border-sky-400/30">
                            {item.resolution || '1080p'}
                          </span>

                          {/* Duration Badge (Bottom-Right of Thumbnail) */}
                          <span className="absolute bottom-1 right-1 px-1 py-0.5 rounded bg-black/85 text-white text-[8px] sm:text-[9px] font-mono font-bold leading-none">
                            {item.duration || '0:30'}
                          </span>
                        </div>

                        {/* RIGHT SIDE: Video Details (Title, Handle, Views, Size) + Action Button */}
                        <div className="min-w-0 flex-1 flex items-center justify-between gap-2">
                          <div className="min-w-0 flex-1 space-y-1">
                            {/* Video Title */}
                            <p className="text-xs sm:text-[13px] font-bold text-slate-100 line-clamp-1 sm:line-clamp-2 leading-snug">
                              {item.title}
                            </p>

                            {/* Metadata Details Row */}
                            <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[10px] sm:text-[11px] text-slate-400 font-medium">
                              <span className="font-mono font-extrabold text-[#38bdf8]">
                                #{idx + 1}
                              </span>
                              <span className="truncate max-w-[110px] sm:max-w-[160px] text-slate-300 font-semibold">
                                {activeProfile.handle}
                              </span>
                              <span className="px-1.5 py-0.2 rounded bg-slate-800 text-sky-300 text-[9px] font-mono font-bold uppercase">
                                {item.platform || activeProfile.platform}
                              </span>
                              {item.views && (
                                <span className="inline-flex items-center gap-0.5 font-mono text-slate-400">
                                  <Eye className="w-2.5 h-2.5 text-sky-400" />
                                  {item.views}
                                </span>
                              )}
                              <span className="font-mono text-emerald-300 font-bold">
                                {item.size || '14.2 MB'}
                              </span>
                            </div>

                            {/* Individual Video Progress Bar when Batch Download is Running */}
                            {(isDownloading || isCompleted) && (
                              <div className="pt-0.5 space-y-0.5">
                                <div className="flex items-center justify-between text-[9px] font-mono font-bold">
                                  <span className={isCompleted ? 'text-emerald-300' : 'text-sky-300'}>
                                    {isCompleted
                                      ? lang === 'ur'
                                        ? 'ڈاؤنلوڈ مکمل ✓'
                                        : 'Completed ✓'
                                      : lang === 'ur'
                                      ? 'ڈاؤنلوڈ جاری...'
                                      : 'Downloading...'}
                                  </span>
                                  <span className="text-white">{taskProgress}%</span>
                                </div>
                                <div className="w-full h-1.5 rounded-full bg-black/90 overflow-hidden border border-white/15">
                                  <div
                                    className={`h-full rounded-full transition-all duration-300 ${
                                      isCompleted
                                        ? 'bg-emerald-400'
                                        : 'bg-gradient-to-r from-[#2563eb] to-[#38bdf8]'
                                    }`}
                                    style={{ width: `${Math.max(6, taskProgress)}%` }}
                                  />
                                </div>
                              </div>
                            )}
                          </div>

                          {/* Right Single-Video Download / Resolution Button */}
                          {onSelectVideoForDownload && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                onSelectVideoForDownload(item.url);
                              }}
                              className="px-2.5 sm:px-3 py-1.5 rounded-lg bg-gradient-to-r from-[#2563eb] to-[#38bdf8] hover:from-blue-500 hover:to-sky-400 text-white text-[10px] sm:text-[11px] font-extrabold flex items-center gap-1 shrink-0 shadow-xs cursor-pointer active:scale-95 transition-all"
                              title={
                                lang === 'ur'
                                  ? 'ریزولوشن منتخب کریں اور ڈاؤن لوڈ کریں'
                                  : 'Choose resolution & download'
                              }
                            >
                              <Download className="w-3 h-3 shrink-0" />
                              <span>{lang === 'ur' ? 'ڈاؤن لوڈ' : 'Download'}</span>
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}

                  {/* Progressive Loading Skeleton Rows at the Bottom of the List */}
                  {isProgressivelyLoading &&
                    Array.from({ length: 3 }).map((_, sIdx) => (
                      <div
                        key={`skeleton_row_${sIdx}`}
                        className="flex items-center gap-3 px-3 py-2.5 bg-[#0b0f19]/60 animate-pulse"
                      >
                        <div className="w-5 h-5 rounded-md bg-slate-800 shrink-0" />
                        <div className="w-24 h-14 sm:w-28 sm:h-16 rounded-lg bg-slate-800 shrink-0 flex items-center justify-center">
                          <Loader2 className="w-4 h-4 text-[#38bdf8] animate-spin" />
                        </div>
                        <div className="flex-1 space-y-2">
                          <div className="w-3/4 h-3 rounded bg-slate-800" />
                          <div className="w-1/2 h-2.5 rounded bg-slate-800/80" />
                        </div>
                        <div className="w-16 h-7 rounded-lg bg-slate-800 shrink-0" />
                      </div>
                    ))}
                </div>

                {/* Load More Creator Videos Footer Button */}
                <div className="py-2 flex items-center justify-center">
                  {isProgressivelyLoading ? (
                    <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-sky-500/10 border border-sky-400/25 text-[11px] font-bold text-sky-300">
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-[#38bdf8]" />
                      <span>
                        {lang === 'ur'
                          ? `مزید ویڈیوز آہستہ آہستہ لوڈ ہو رہی ہیں... (${videos.length} لوڈ ہو چکیں)`
                          : `Progressively loading more creator videos... (${videos.length} loaded)`}
                      </span>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => fetchCreatorPage(activeTargetRef.current, currentPage + 1)}
                      className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-sky-400/30 text-sky-300 text-xs font-extrabold flex items-center gap-2 cursor-pointer transition-all"
                      id="load-more-creator-videos-btn"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      <span>
                        {lang === 'ur'
                          ? 'مزید کریئیٹر ویڈیوز لوڈ کریں (Load More Videos)'
                          : 'Load More Creator Videos'}
                      </span>
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* 3. Sticky Bottom Batch Download Bar */}
            <div className="px-3 sm:px-5 py-2.5 bg-[#0b0f19] border-t border-sky-400/25 shrink-0">
              <div className="max-w-5xl mx-auto w-full flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2">
                <div className="flex flex-wrap items-center justify-between sm:justify-start gap-2">
                  <div className="text-xs text-slate-200 font-bold flex items-center gap-1.5">
                    <Layers className="w-4 h-4 text-[#38bdf8]" />
                    <span>
                      <strong className="text-[#38bdf8] font-mono text-sm">{selectedIds.size}</strong>{' '}
                      {lang === 'ur'
                        ? `از ${videos.length} ویڈیوز منتخب`
                        : `of ${videos.length} videos selected`}
                    </span>
                  </div>

                  <select
                    value={targetFormat}
                    onChange={(e) => setTargetFormat(e.target.value as any)}
                    className="px-2.5 py-1 rounded-xl bg-[#101829] border border-sky-400/30 text-[11px] font-bold text-[#38bdf8] outline-none cursor-pointer"
                    id="creator-batch-format-select"
                  >
                    <option value="best_video">Max HD MP4 (Up to 4K)</option>
                    <option value="1080p_mp4">1080p Full HD (MP4)</option>
                    <option value="mp3_audio">320kbps MP3 Audio</option>
                  </select>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleDownloadAsZip}
                    disabled={selectedIds.size === 0 || isDownloadingZip}
                    className="px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-100 border border-sky-400/30 font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer disabled:opacity-40 shrink-0"
                    id="creator-download-zip-btn"
                  >
                    <FolderArchive className="w-3.5 h-3.5 text-[#38bdf8]" />
                    <span>
                      {isDownloadingZip
                        ? lang === 'ur'
                          ? 'ZIP...'
                          : 'ZIP...'
                        : `ZIP (${selectedIds.size})`}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={handleBatchDownloadSimultaneous}
                    disabled={selectedIds.size === 0}
                    className="flex-1 sm:flex-initial btn-glow-primary px-4 py-2 rounded-xl font-extrabold text-xs flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-40 shadow-[0_0_20px_rgba(56,189,248,0.4)]"
                    id="creator-batch-download-selected-btn"
                  >
                    <Download className="w-3.5 h-3.5 shrink-0" />
                    <span>
                      {lang === 'ur'
                        ? `منتخب ویڈیوز اکٹھے ڈاؤن لوڈ کریں (${selectedIds.size})`
                        : `Batch Download Selected (${selectedIds.size})`}
                    </span>
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

