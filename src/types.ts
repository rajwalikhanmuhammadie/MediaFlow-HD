export type PlatformType =
  | 'instagram'
  | 'tiktok'
  | 'facebook'
  | 'twitter'
  | 'pinterest'
  | 'threads'
  | 'youtube'
  | 'reddit'
  | 'snapchat'
  | 'linkedin'
  | 'vimeo'
  | 'dailymotion'
  | 'universal';

export type MediaType = 'video' | 'audio' | 'image';

export interface DownloadOption {
  id: string;
  label: string;
  resolution: string;
  format: 'MP4' | 'MP3' | 'JPG' | 'PNG' | 'M4A' | 'WEBM' | 'GIF';
  size: string;
  quality: string;
  url: string;
  type: MediaType;
  badge?: string;
  noWatermark?: boolean;
  bitrate?: string;
  fps?: string;
  formatId?: string;
  width?: number;
  height?: number;
  vcodec?: string;
  acodec?: string;
  ext?: string;
  filesize?: number;
  filesizeApprox?: number;
  tbr?: number;
}

export interface MediaResult {
  originalUrl: string;
  platform: PlatformType;
  title: string;
  author: string;
  authorAvatar: string;
  creatorProfileUrl?: string;
  creatorHandle?: string;
  duration?: string;
  thumbnail: string;
  videoUrl: string;
  audioUrl?: string;
  images?: string[];
  isVideo: boolean;
  caption?: string;
  likes?: string;
  views?: string;
  shares?: string;
  timestamp: string;
  watermarkRemoved?: boolean;
  watermarkMethod?: string;
  downloadOptions: DownloadOption[];
}

export interface CreatorVideoItem {
  id: string;
  title: string;
  url: string;
  thumbnail: string;
  duration: string;
  resolution: string;
  size: string;
  platform?: PlatformType;
  views?: string;
  likes?: string;
  type: 'video' | 'image';
  isVideo?: boolean;
  videoUrl?: string;
  directUrl?: string;
  publishedAt?: string;
}

export interface SavedAccountItem {
  id: string;
  handle: string;
  authorName: string;
  avatar: string;
  platform: PlatformType;
  profileUrl: string;
  lastVisitedAt: number;
  videoCount?: number;
  isBookmarked?: boolean;
  sampleVideoUrl?: string;
}

export type DownloadStatus = 'pending' | 'downloading' | 'completed' | 'paused' | 'failed' | 'error' | 'scheduled';

export type BatchTargetFormat = 'best_video' | 'audio_only' | 'photo_only' | 'all_package';

export interface DownloadTask {
  id: string;
  mediaTitle: string;
  platform: PlatformType;
  thumbnail: string;
  format: string;
  quality: string;
  progress: number;
  status: DownloadStatus;
  size: string;
  downloadedBytes?: number;
  totalBytes?: number;
  speed?: string;
  timeRemaining?: string;
  estimatedSeconds?: number;
  url: string;
  filename: string;
  type: MediaType;
  noWatermark?: boolean;
  createdAt: number;
  completedAt?: number;
  scheduledAt?: number;
  scheduledFormatted?: string;
  scheduledCountdown?: string;
  retryCount?: number;
  maxRetries?: number;
  retryCountdown?: number;
  errorReason?: string;
  batchId?: string;
  batchType?: 'single_link_options' | 'bulk_import' | 'manual';
  batchTitle?: string;
  sourceUrl?: string;
  optionId?: string;
  resolution?: string;
  duration?: string;
  author?: string;
  creatorProfileUrl?: string;
}

export type AutoClearDuration = 'never' | '1' | '5' | '15' | '30' | '60' | '360' | '1440' | '10080';
export type AutoClearRetentionMode = 'clear_finished' | 'keep_for_history';
export type MaxAutoDownloadSize = 'unlimited' | '25' | '50' | '100' | '250' | '500' | '1000';
export type DownloadSpeedCap = 'unlimited' | '0.5' | '1' | '2' | '5' | '10';
export type FileSizeUnit = 'MB' | 'KB';

export interface HistoryItem {
  id: string;
  title: string;
  platform: PlatformType;
  format: string;
  quality: string;
  resolution?: string;
  duration?: string;
  size: string;
  thumbnail: string;
  mediaUrl: string;
  type: MediaType;
  downloadedAt: number;
  originalUrl: string;
  author: string;
  creatorProfileUrl?: string;
  noWatermark?: boolean;
  isHidden?: boolean;
}

export interface RecentSearchItem {
  id: string;
  url: string;
  platform: PlatformType;
  searchedAt: number;
  title?: string;
}

export type Language = 'ur' | 'en' | 'es' | 'fr' | 'hi';
export type Theme = 'dark' | 'crimson' | 'emerald' | 'sunset' | 'amoled' | 'light';

export interface DriveFileItem {
  id: string;
  name: string;
  mimeType: string;
  size?: number | string;
  createdTime: string;
  webViewLink?: string;
  webContentLink?: string;
  thumbnailLink?: string;
  iconLink?: string;
}

export interface DriveQuota {
  usage: number;
  limit: number;
  usageInDrive?: number;
  usageFormatted: string;
  limitFormatted: string;
  percentage: number;
}

export interface CommentReply {
  id: string;
  commentId: string;
  userName: string;
  avatar: string;
  text: string;
  createdAt: number;
  likes: number;
  isVisible: boolean;
  replyToUserName?: string;
}

export interface CommentItem {
  id: string;
  userName: string;
  avatar: string;
  text: string;
  rating: number;
  createdAt: number;
  isVisible: boolean; // true = visible to everyone, false = hidden by admin from other users
  isPinned?: boolean;
  likes: number;
  platform?: string;
  adminReply?: string;
  replies?: CommentReply[];
}

export type ChatModelType = 'gemini-3.1-flash-lite' | 'gemini-3.5-flash' | 'gemini-3.1-pro-preview';

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  content: string;
  timestamp: number;
  modelUsed?: string;
  isError?: boolean;
}

export interface ChatRolePreset {
  id: string;
  name: string;
  nameUrdu: string;
  description: string;
  descriptionUrdu: string;
  icon: string;
  systemInstruction: string;
}

