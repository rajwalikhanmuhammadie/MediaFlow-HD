import React, { useState, useEffect } from 'react';
import { 
  X, 
  HardDrive, 
  Cloud, 
  CloudRain, 
  CheckCircle2, 
  ExternalLink, 
  Trash2, 
  RefreshCw, 
  Film, 
  Music, 
  Image as ImageIcon, 
  FileText, 
  Search, 
  UploadCloud, 
  AlertTriangle,
  FolderOpen,
  LogOut,
  User as UserIcon,
  ShieldCheck,
  KeyRound
} from 'lucide-react';
import { Language, DriveFileItem, DriveQuota } from '../types';
import { translations } from '../data/translations';
import { 
  googleSignIn, 
  reauthorizeDrive,
  logout, 
  getDriveQuota, 
  listDriveFiles, 
  deleteDriveFile,
  uploadMediaToDrive,
  formatBytes,
  getDriveSessionStatus,
  DriveSessionStatus
} from '../services/driveService';
import { User } from 'firebase/auth';

interface GoogleDriveModalProps {
  isOpen: boolean;
  onClose: () => void;
  lang: Language;
  user: User | null;
  onAuthChange: (user: User | null) => void;
}

export const GoogleDriveModal: React.FC<GoogleDriveModalProps> = ({
  isOpen,
  onClose,
  lang,
  user,
  onAuthChange,
}) => {
  const [isAuthenticating, setIsAuthenticating] = useState<boolean>(false);
  const [isReauthorizing, setIsReauthorizing] = useState<boolean>(false);
  const [isLoadingFiles, setIsLoadingFiles] = useState<boolean>(false);
  const [files, setFiles] = useState<DriveFileItem[]>([]);
  const [quota, setQuota] = useState<DriveQuota | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [activeFilter, setActiveFilter] = useState<'all' | 'video' | 'audio' | 'image'>('all');
  const [authError, setAuthError] = useState<string | null>(null);
  const [sessionStatus, setSessionStatus] = useState<DriveSessionStatus | null>(null);
  const [sessionNotice, setSessionNotice] = useState<string | null>(null);

  // Deletion Confirmation Modal State
  const [fileToDelete, setFileToDelete] = useState<DriveFileItem | null>(null);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);

  // Quick Direct Upload State
  const [uploadUrl, setUploadUrl] = useState<string>('');
  const [uploadFilename, setUploadFilename] = useState<string>('');
  const [isCustomUploading, setIsCustomUploading] = useState<boolean>(false);
  const [uploadSuccessMsg, setUploadSuccessMsg] = useState<string | null>(null);

  const t = translations[lang];

  const refreshSessionDiagnostics = async () => {
    const status = await getDriveSessionStatus();
    setSessionStatus(status);
  };

  // Fetch Drive Quota, Files, and Auth Status whenever modal is opened
  useEffect(() => {
    if (isOpen) {
      refreshSessionDiagnostics();
      if (user) {
        loadDriveData();
      }
    }
  }, [isOpen, user]);

  const loadDriveData = async () => {
    setIsLoadingFiles(true);
    setAuthError(null);
    try {
      const [quotaData, fileList] = await Promise.all([
        getDriveQuota(),
        listDriveFiles()
      ]);
      setQuota(quotaData);
      setFiles(fileList);
      await refreshSessionDiagnostics();
    } catch (err: any) {
      console.error('Error loading Google Drive data:', err);
      setAuthError(err.message || 'Failed to load Google Drive content');
    } finally {
      setIsLoadingFiles(false);
    }
  };

  const handleSignIn = async () => {
    setIsAuthenticating(true);
    setAuthError(null);
    setSessionNotice(null);
    try {
      const result = await googleSignIn();
      onAuthChange(result.user);
      await refreshSessionDiagnostics();
      await loadDriveData();
    } catch (err: any) {
      console.error('Sign-in failed:', err);
      setAuthError(err.message || 'Google sign-in was cancelled or failed.');
    } finally {
      setIsAuthenticating(false);
    }
  };

  const handleReauthorize = async () => {
    setIsReauthorizing(true);
    setAuthError(null);
    setSessionNotice(null);
    try {
      const result = await reauthorizeDrive();
      onAuthChange(result.user);
      await refreshSessionDiagnostics();
      await loadDriveData();
      setSessionNotice(
        lang === 'ur'
          ? 'گوگل ڈرائیو سیشن اور ٹوکن کامیابی سے دوبارہ تصدیق ہو گئے ہیں!'
          : 'Google Drive session & OAuth token successfully re-authorized!'
      );
      setTimeout(() => setSessionNotice(null), 4000);
    } catch (err: any) {
      console.error('Re-authorization failed:', err);
      setAuthError(
        err.message ||
          (lang === 'ur'
            ? 'دوبارہ تصدیق مکمل نہیں ہو سکی'
            : 'Re-authorization was cancelled or failed.')
      );
    } finally {
      setIsReauthorizing(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await logout();
      onAuthChange(null);
      setFiles([]);
      setQuota(null);
      await refreshSessionDiagnostics();
      setSessionNotice(
        lang === 'ur'
          ? 'آپ گوگل ڈرائیو سے کامیابی کے ساتھ لاگ آؤٹ ہو چکے ہیں۔'
          : 'You have been logged out of Google Drive.'
      );
      setTimeout(() => setSessionNotice(null), 4000);
    } catch (err: any) {
      console.error('Logout failed:', err);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!fileToDelete) return;
    setIsDeleting(true);
    try {
      await deleteDriveFile(fileToDelete.id);
      setFiles(prev => prev.filter(f => f.id !== fileToDelete.id));
      setFileToDelete(null);
      // Refresh quota in background
      getDriveQuota().then(q => q && setQuota(q));
    } catch (err: any) {
      alert(err.message || 'Failed to delete file from Google Drive');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleCustomUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadUrl.trim()) return;

    setIsCustomUploading(true);
    setUploadSuccessMsg(null);
    setAuthError(null);

    try {
      const fname = uploadFilename.trim() || `media-${Date.now()}.mp4`;
      const uploaded = await uploadMediaToDrive({
        mediaUrl: uploadUrl.trim(),
        filename: fname
      });
      setFiles(prev => [uploaded, ...prev]);
      setUploadSuccessMsg(t.uploadSuccess);
      setUploadUrl('');
      setUploadFilename('');
      setTimeout(() => setUploadSuccessMsg(null), 4000);
      getDriveQuota().then(q => q && setQuota(q));
    } catch (err: any) {
      setAuthError(err.message || t.uploadError);
    } finally {
      setIsCustomUploading(false);
    }
  };

  if (!isOpen) return null;

  const filteredFiles = files.filter(file => {
    const matchesSearch = file.name.toLowerCase().includes(searchQuery.toLowerCase());
    if (!matchesSearch) return false;

    if (activeFilter === 'video') {
      return file.mimeType.includes('video') || file.name.match(/\.(mp4|webm|mov|mkv)$/i);
    }
    if (activeFilter === 'audio') {
      return file.mimeType.includes('audio') || file.name.match(/\.(mp3|m4a|wav|aac|ogg)$/i);
    }
    if (activeFilter === 'image') {
      return file.mimeType.includes('image') || file.name.match(/\.(jpg|jpeg|png|webp|gif)$/i);
    }
    return true;
  });

  const getFileIcon = (file: DriveFileItem) => {
    if (file.mimeType.includes('video') || file.name.match(/\.(mp4|webm)$/i)) {
      return <Film className="w-5 h-5 text-blue-500" />;
    }
    if (file.mimeType.includes('audio') || file.name.match(/\.(mp3|m4a)$/i)) {
      return <Music className="w-5 h-5 text-purple-500" />;
    }
    if (file.mimeType.includes('image') || file.name.match(/\.(jpg|png|gif)$/i)) {
      return <ImageIcon className="w-5 h-5 text-emerald-500" />;
    }
    return <FileText className="w-5 h-5 text-slate-400" />;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/80 backdrop-blur-md animate-fade-in">
      <div 
        className="relative w-full max-w-4xl max-h-[92vh] bg-white dark:bg-slate-900 rounded-2xl sm:rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col overflow-hidden text-slate-800 dark:text-slate-100"
        id="google-drive-modal"
      >
        
        {/* Modal Header */}
        <div className="flex items-center justify-between px-5 sm:px-7 py-4 sm:py-5 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-500 via-emerald-500 to-blue-500 p-0.5 flex items-center justify-center shadow-md">
              <div className="w-full h-full bg-white dark:bg-slate-900 rounded-[10px] flex items-center justify-center">
                <HardDrive className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white tracking-tight">
                  {t.googleDrive}
                </h2>
                <span className="text-[11px] font-mono font-semibold text-slate-500 dark:text-slate-400">
                  · Cloud Backup
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                {user ? user.email : t.driveNotConnected}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-9 h-9 rounded-xl flex items-center justify-center text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            id="close-drive-modal-btn"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Visual Authentication & Session Management Status Bar */}
        <div
          id="drive-auth-status-banner"
          className="px-5 sm:px-7 py-3 border-b border-slate-100 dark:border-slate-800 bg-slate-100/70 dark:bg-slate-950/60 flex flex-wrap items-center justify-between gap-3"
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <span
              className={`w-2.5 h-2.5 rounded-full shrink-0 ${
                user
                  ? sessionStatus?.hasActiveToken !== false
                    ? 'bg-emerald-500 animate-pulse'
                    : 'bg-amber-500'
                  : 'bg-slate-400 dark:bg-slate-600'
              }`}
              aria-hidden="true"
            />
            <div className="min-w-0 text-xs">
              <div className="flex flex-wrap items-center gap-1.5 font-semibold text-slate-900 dark:text-slate-100">
                <span>
                  {user
                    ? lang === 'ur'
                      ? 'گوگل ڈرائیو سیشن فعال اور محفوظ ہے'
                      : 'Authentication Status: Connected & Persistent'
                    : lang === 'ur'
                    ? 'گوگل ڈرائیو سیشن منقطع ہے'
                    : 'Authentication Status: Disconnected'}
                </span>
                {user && (
                  <>
                    <span aria-hidden="true" className="text-slate-400">·</span>
                    <span className="font-mono text-[11px] tabular-nums text-emerald-700 dark:text-emerald-400">
                      {sessionStatus?.hasActiveToken !== false
                        ? lang === 'ur'
                          ? 'OAuth ٹوکن فعال'
                          : 'OAuth Token Active'
                        : lang === 'ur'
                        ? 'سیشن محفوظ (ٹوکن ریفریش دستیاب)'
                        : 'Session Saved (Token Ready to Renew)'}
                    </span>
                  </>
                )}
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 font-mono tabular-nums truncate">
                {user
                  ? lang === 'ur'
                    ? `ملٹی لیئر اسٹوریج (IndexedDB + Server) · کوڈ اپڈیٹس پر آٹو ریسٹور`
                    : `Auto-Restore Active (IndexedDB + Server Sync)${
                        sessionStatus?.updatedAt
                          ? ` · Synced ${new Date(sessionStatus.updatedAt).toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}`
                          : ''
                      }`
                  : lang === 'ur'
                  ? 'اپنا اکاؤنٹ جوڑنے کے لیے سائن ان یا دوبارہ تصدیق پر کلک کریں'
                  : 'Sign in or Re-authorize to connect your Google Drive session'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={handleReauthorize}
              disabled={isReauthorizing || isAuthenticating}
              id="drive-modal-reauthorize-btn"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-bold transition-colors cursor-pointer shadow-xs"
              title={
                lang === 'ur'
                  ? 'گوگل ڈرائیو سیشن کی دستی طور پر دوبارہ تصدیق کریں'
                  : 'Manually re-authorize Google Drive OAuth session'
              }
            >
              <KeyRound className={`w-3.5 h-3.5 ${isReauthorizing ? 'animate-spin' : ''}`} />
              <span>
                {isReauthorizing
                  ? lang === 'ur'
                    ? 'تصدیق جاری...'
                    : 'Re-authorizing...'
                  : lang === 'ur'
                  ? 'دوبارہ تصدیق (Re-authorize)'
                  : 'Re-authorize'}
              </span>
            </button>

            {user && (
              <button
                type="button"
                onClick={handleSignOut}
                id="drive-modal-status-logout-btn"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-50 dark:bg-rose-950/60 hover:bg-rose-100 dark:hover:bg-rose-900/60 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-800 text-xs font-bold transition-colors cursor-pointer"
                title={lang === 'ur' ? 'سیشن ختم کریں اور لاگ آؤٹ کریں' : 'Logout and clear persistent session'}
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>{lang === 'ur' ? 'لاگ آؤٹ (Logout)' : 'Logout'}</span>
              </button>
            )}
          </div>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-7 space-y-6">
          {sessionNotice && (
            <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800/80 text-emerald-700 dark:text-emerald-300 text-xs font-semibold flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
              <span>{sessionNotice}</span>
            </div>
          )}
          
          {/* If NOT Signed In: Prompt with official Google Sign-in */}
          {!user ? (
            <div className="flex flex-col items-center justify-center py-10 px-4 text-center">
              <div className="w-16 h-16 rounded-3xl bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800 flex items-center justify-center mb-5 text-blue-600 dark:text-blue-400 shadow-xl">
                <Cloud className="w-8 h-8 animate-bounce-subtle" />
              </div>
              <h3 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white mb-2">
                {lang === 'ur' ? 'گوگل ڈرائیو کے ساتھ جڑیں' : 'Connect Google Drive Cloud Storage'}
              </h3>
              <p className="text-sm text-slate-600 dark:text-slate-300 max-w-md mb-6 leading-relaxed">
                {lang === 'ur' 
                  ? 'اپنی ڈاؤنلوڈ کی گئی تمام سوشل میڈیا ویڈیوز اور آڈیو کو ایک کلک میں اپنے گوگل ڈرائیو میں محفوظ کریں تاکہ وہ کبھی ضائع نہ ہوں۔'
                  : 'Save high-definition reels, videos, and music directly to your Google Drive in a dedicated "Social Media Downloads" folder with one click.'}
              </p>

              {/* Official Google Sign-In Styled Button */}
              <button
                onClick={handleSignIn}
                disabled={isAuthenticating}
                id="google-signin-btn"
                className="group relative flex items-center justify-center gap-3 px-6 py-3.5 rounded-2xl bg-white dark:bg-slate-800 text-slate-800 dark:text-white font-bold text-sm border border-slate-300 dark:border-slate-700 shadow-md hover:shadow-xl hover:border-blue-400 dark:hover:border-blue-500 transition-all cursor-pointer active:scale-95 disabled:opacity-50"
              >
                {/* Official Google 'G' Icon */}
                <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.17z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 9.98 0 12s.45 3.82 1.25 5.42l4.03-3.15z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
                  />
                </svg>
                <span>{isAuthenticating ? t.analyzing : t.signInWithGoogle}</span>
              </button>

              {authError && (
                <div className="mt-4 p-3 rounded-xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 text-rose-600 dark:text-rose-400 text-xs font-semibold max-w-md">
                  {authError}
                </div>
              )}
            </div>
          ) : (
            <>
              {/* Connected User Profile & Quota Card */}
              <div className="p-4 sm:p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 flex flex-col md:flex-row md:items-center justify-between gap-4">
                
                {/* User Info */}
                <div className="flex items-center gap-3.5 min-w-0">
                  {user.photoURL ? (
                    <img 
                      src={user.photoURL} 
                      alt={user.displayName || 'Google User'} 
                      className="w-12 h-12 rounded-full border-2 border-white dark:border-slate-700 shadow-xs object-cover"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-full bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 font-bold flex items-center justify-center text-lg shadow-xs">
                      {user.displayName ? user.displayName.charAt(0).toUpperCase() : <UserIcon className="w-6 h-6" />}
                    </div>
                  )}
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-extrabold text-sm sm:text-base text-slate-900 dark:text-white truncate">
                        {user.displayName || 'Google User'}
                      </span>
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 dark:text-emerald-400">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> {t.driveConnected}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 font-medium truncate">
                      {user.email}
                    </p>
                  </div>
                </div>

                {/* Storage Quota Breakdown */}
                {quota && (
                  <div className="flex-1 max-w-xs space-y-1.5">
                    <div className="flex items-center justify-between text-xs font-bold text-slate-600 dark:text-slate-300 font-mono tabular-nums">
                      <span className="font-sans">{t.driveStorage}</span>
                      <span>{quota.usageFormatted} / {quota.limitFormatted} ({quota.percentage}%)</span>
                    </div>
                    <div className="w-full h-2.5 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
                      <div 
                        className={`h-full transition-all duration-500 rounded-full ${
                          quota.percentage > 85 ? 'bg-rose-500' : quota.percentage > 70 ? 'bg-amber-500' : 'bg-blue-600'
                        }`}
                        style={{ width: `${quota.percentage}%` }}
                      />
                    </div>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={loadDriveData}
                    disabled={isLoadingFiles}
                    className="p-2 rounded-xl bg-white dark:bg-slate-700 hover:bg-slate-100 dark:hover:bg-slate-600 border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-200 transition-colors shadow-xs cursor-pointer"
                    title={t.refreshDrive}
                  >
                    <RefreshCw className={`w-4 h-4 ${isLoadingFiles ? 'animate-spin text-blue-600' : ''}`} />
                  </button>
                  <button
                    onClick={handleReauthorize}
                    disabled={isReauthorizing}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-blue-50 dark:bg-blue-950/60 hover:bg-blue-100 dark:hover:bg-blue-900/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 text-xs font-bold transition-colors cursor-pointer"
                    title={lang === 'ur' ? 'دوبارہ تصدیق کریں' : 'Re-authorize Google Drive session'}
                  >
                    <KeyRound className={`w-3.5 h-3.5 ${isReauthorizing ? 'animate-spin' : ''}`} />
                    <span className="hidden sm:inline">
                      {lang === 'ur' ? 'دوبارہ تصدیق' : 'Re-authorize'}
                    </span>
                  </button>
                  <button
                    onClick={handleSignOut}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-rose-50 dark:bg-rose-950/60 hover:bg-rose-100 dark:hover:bg-rose-900/60 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-800 text-xs font-bold transition-colors cursor-pointer"
                    title={t.signOut}
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">{t.signOut}</span>
                  </button>
                </div>

              </div>

              {/* Quick Direct URL Upload Section */}
              <div className="p-4 rounded-2xl bg-blue-50/60 dark:bg-blue-950/30 border border-blue-100 dark:border-blue-900/50">
                <form onSubmit={handleCustomUpload} className="space-y-3">
                  <div className="flex items-center gap-2 text-xs font-black text-blue-700 dark:text-blue-300">
                    <UploadCloud className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                    <span>{lang === 'ur' ? 'براہ راست لنک سے گوگل ڈرائیو میں اپلوڈ کریں' : 'Quick Save from Media Link to Google Drive'}</span>
                  </div>
                  <div className="flex flex-col sm:flex-row gap-2">
                    <input
                      type="url"
                      placeholder={
                        lang === 'ur'
                          ? 'https://... (YouTube, TikTok, Instagram, Facebook یا ڈائریکٹ ویڈیو لنک)'
                          : 'https://... (YouTube, TikTok, Instagram, Facebook, or direct media link)'
                      }
                      value={uploadUrl}
                      onChange={(e) => setUploadUrl(e.target.value)}
                      className="flex-1 px-3 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <input
                      type="text"
                      placeholder={lang === 'ur' ? 'فائل کا نام (اختیاری)' : 'Filename (optional)'}
                      value={uploadFilename}
                      onChange={(e) => setUploadFilename(e.target.value)}
                      className="w-full sm:w-44 px-3 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <button
                      type="submit"
                      disabled={!uploadUrl.trim() || isCustomUploading}
                      className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-bold transition-all shadow-md shadow-blue-500/20 shrink-0 cursor-pointer flex items-center justify-center gap-1.5"
                    >
                      {isCustomUploading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <UploadCloud className="w-3.5 h-3.5" />}
                      <span>{isCustomUploading ? t.savingToDrive : t.saveToDrive}</span>
                    </button>
                  </div>
                  {uploadSuccessMsg && (
                    <p className="text-xs text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" /> {uploadSuccessMsg}
                    </p>
                  )}
                  {authError && (
                    <p className="text-xs text-rose-600 dark:text-rose-400 font-bold">
                      {authError}
                    </p>
                  )}
                </form>
              </div>

              {/* Filters & Search Toolbar */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
                {/* Search Bar */}
                <div className="relative w-full sm:w-72">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    placeholder={lang === 'ur' ? 'ڈرائیو فائلیں تلاش کریں...' : 'Search Drive files...'}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                {/* Filter Pills */}
                <div className="flex items-center gap-1.5 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
                  <button
                    onClick={() => setActiveFilter('all')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer shrink-0 ${
                      activeFilter === 'all'
                        ? 'bg-blue-600 text-white shadow-xs'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                    }`}
                  >
                    {t.all} ({files.length})
                  </button>
                  <button
                    onClick={() => setActiveFilter('video')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer shrink-0 flex items-center gap-1 ${
                      activeFilter === 'video'
                        ? 'bg-blue-600 text-white shadow-xs'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                    }`}
                  >
                    <Film className="w-3.5 h-3.5" />
                    <span>{t.videos}</span>
                  </button>
                  <button
                    onClick={() => setActiveFilter('audio')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer shrink-0 flex items-center gap-1 ${
                      activeFilter === 'audio'
                        ? 'bg-blue-600 text-white shadow-xs'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                    }`}
                  >
                    <Music className="w-3.5 h-3.5" />
                    <span>{t.audios}</span>
                  </button>
                  <button
                    onClick={() => setActiveFilter('image')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer shrink-0 flex items-center gap-1 ${
                      activeFilter === 'image'
                        ? 'bg-blue-600 text-white shadow-xs'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                    }`}
                  >
                    <ImageIcon className="w-3.5 h-3.5" />
                    <span>{t.photos}</span>
                  </button>
                </div>
              </div>

              {/* Drive Files List */}
              {isLoadingFiles ? (
                <div className="flex flex-col items-center justify-center py-16 text-slate-400">
                  <RefreshCw className="w-8 h-8 animate-spin text-blue-600 mb-3" />
                  <p className="text-xs font-bold">{lang === 'ur' ? 'ڈرائیو فائلیں لوڈ ہو رہی ہیں...' : 'Loading Google Drive items...'}</p>
                </div>
              ) : filteredFiles.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 px-4 text-center rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-800">
                  <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400 mb-3">
                    <FolderOpen className="w-6 h-6" />
                  </div>
                  <h4 className="text-sm font-bold text-slate-700 dark:text-slate-200 mb-1">
                    {t.noDriveFiles}
                  </h4>
                  <p className="text-xs text-slate-400 max-w-sm">
                    {t.uploadToDrivePrompt}
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {filteredFiles.map((file, fileIdx) => (
                    <div 
                      key={`drive_file_${file.id || 'file'}_${fileIdx}`}
                      className="group relative p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/70 border border-slate-200/80 dark:border-slate-700/80 hover:border-blue-400 dark:hover:border-blue-500 transition-all flex flex-col justify-between gap-3 shadow-xs hover:shadow-md"
                    >
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-xl bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 flex items-center justify-center shrink-0 shadow-xs">
                          {getFileIcon(file)}
                        </div>
                        <div className="min-w-0 flex-1">
                          <h4 className="text-xs font-bold text-slate-900 dark:text-white truncate" title={file.name}>
                            {file.name}
                          </h4>
                          <div className="flex items-center gap-2 mt-1 text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                            {file.size && <span>{formatBytes(Number(file.size))}</span>}
                            <span>•</span>
                            <span>{new Date(file.createdTime).toLocaleDateString()}</span>
                          </div>
                        </div>
                      </div>

                      {/* Card Actions */}
                      <div className="flex items-center justify-between pt-2 border-t border-slate-200/60 dark:border-slate-700/60 text-xs">
                        {file.webViewLink ? (
                          <a
                            href={file.webViewLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1 font-bold text-blue-600 dark:text-blue-400 hover:underline"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                            <span>{t.openInDrive}</span>
                          </a>
                        ) : (
                          <span />
                        )}

                        {/* Delete Button (Triggers Confirmation Modal) */}
                        <button
                          onClick={() => setFileToDelete(file)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/60 transition-colors cursor-pointer"
                          title={t.deleteFromDrive}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>

                    </div>
                  ))}
                </div>
              )}

            </>
          )}

        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between px-5 sm:px-7 py-3 sm:py-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 text-xs text-slate-500 dark:text-slate-400">
          <span className="flex items-center gap-1.5 font-medium">
            <ShieldCheck className="w-4 h-4 text-emerald-500" />
            {lang === 'ur' ? 'گوگل ڈرائیو ڈیٹا مکمل محفوظ اور انکرپٹڈ ہے' : 'Google Drive data encrypted & protected via official Google OAuth'}
          </span>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-100 font-bold transition-colors cursor-pointer"
          >
            {t.close}
          </button>
        </div>

      </div>

      {/* MANDATORY USER CONFIRMATION MODAL FOR DELETION */}
      {fileToDelete && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4">
            <div className="flex items-center gap-3 text-rose-600 dark:text-rose-400">
              <div className="w-12 h-12 rounded-2xl bg-rose-100 dark:bg-rose-950/80 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-6 h-6 text-rose-600 dark:text-rose-400" />
              </div>
              <div>
                <h3 className="text-base font-black text-slate-900 dark:text-white">
                  {t.confirmDeleteTitle}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Google Drive Permanent Deletion
                </p>
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs space-y-1">
              <p className="font-bold text-slate-900 dark:text-white truncate">
                📄 {fileToDelete.name}
              </p>
              {fileToDelete.size && (
                <p className="text-slate-500 dark:text-slate-400">
                  Size: {formatBytes(Number(fileToDelete.size))}
                </p>
              )}
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              {t.confirmDeleteDesc}
            </p>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                onClick={() => setFileToDelete(null)}
                disabled={isDeleting}
                className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold transition-colors cursor-pointer"
              >
                {t.cancelAction}
              </button>
              <button
                onClick={handleDeleteConfirm}
                disabled={isDeleting}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white text-xs font-bold transition-colors shadow-lg shadow-rose-500/20 cursor-pointer flex items-center gap-1.5"
              >
                {isDeleting ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                <span>{isDeleting ? t.analyzing : t.confirmAction}</span>
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
