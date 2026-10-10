import React, { useState, useEffect } from 'react';
import { 
  MessageSquare, 
  Send, 
  Star, 
  Eye, 
  EyeOff, 
  Shield, 
  ShieldAlert, 
  Pin, 
  Trash2, 
  CornerDownRight, 
  ThumbsUp, 
  Sparkles, 
  Check, 
  Lock, 
  Unlock,
  Smile,
  Filter,
  Reply,
  ChevronDown,
  ChevronUp,
  MessageCircle
} from 'lucide-react';
import { CommentItem, CommentReply, Language } from '../types';
import { translations } from '../data/translations';

interface CommunityCommentsProps {
  lang: Language;
}

const AVATAR_OPTIONS = ['🔥', '⚡', '👑', '🌟', '🚀', '💎', '🎬', '🎯', '✨', '🎧'];
const PLATFORM_TAGS = ['General', 'TikTok', 'Instagram', 'Facebook', 'YouTube', 'Twitter/X', 'Pinterest', 'Reddit'];

const LOCAL_STORAGE_KEY = 'social_dl_community_comments_v2';
const LOCAL_STORAGE_ADMIN_KEY = 'social_dl_admin_mode_active';

export const CommunityComments: React.FC<CommunityCommentsProps> = ({ lang }) => {
  const t = translations[lang];

  // Comments state
  const [comments, setComments] = useState<CommentItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Main comment form input state
  const [userName, setUserName] = useState<string>('');
  const [avatar, setAvatar] = useState<string>('🔥');
  const [commentText, setCommentText] = useState<string>('');
  const [rating, setRating] = useState<number>(5);
  const [selectedPlatform, setSelectedPlatform] = useState<string>('General');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [submitSuccess, setSubmitSuccess] = useState<boolean>(false);

  // Nested reply form state
  const [activeReplyTarget, setActiveReplyTarget] = useState<{
    commentId: string;
    replyToUserName?: string;
  } | null>(null);
  const [replyUserName, setReplyUserName] = useState<string>('');
  const [replyAvatar, setReplyAvatar] = useState<string>('💬');
  const [replyUserText, setReplyUserText] = useState<string>('');
  const [isSubmittingReply, setIsSubmittingReply] = useState<boolean>(false);
  const [replySuccessCommentId, setReplySuccessCommentId] = useState<string | null>(null);

  // Expanded replies state (default all expanded so users see discussions)
  const [expandedReplies, setExpandedReplies] = useState<Record<string, boolean>>({});

  // Moderation / Admin State
  const [isAdminMode, setIsAdminMode] = useState<boolean>(false);
  const [showAdminLoginModal, setShowAdminLoginModal] = useState<boolean>(false);
  const [adminPasscode, setAdminPasscode] = useState<string>('');
  const [adminError, setAdminError] = useState<string>('');

  // Filtering
  const [filterTab, setFilterTab] = useState<'all' | 'top' | 'hidden'>('all');

  // Admin official reply dialog state
  const [replyingCommentId, setReplyingCommentId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState<string>('');

  // Initial load
  useEffect(() => {
    // Check saved admin status
    try {
      const savedAdmin = localStorage.getItem(LOCAL_STORAGE_ADMIN_KEY);
      if (savedAdmin === 'true') {
        setIsAdminMode(true);
      }
    } catch {
      // ignore
    }

    loadComments();
  }, [isAdminMode]);

  const loadComments = async () => {
    setIsLoading(true);
    try {
      const queryParam = isAdminMode ? '?all=true' : '';
      const res = await fetch(`/api/comments${queryParam}`);
      if (res.ok) {
        const data = await res.json();
        if (data.success && Array.isArray(data.comments)) {
          const seen = new Set<string>();
          const deduped = data.comments.filter((c: CommentItem) => {
            if (!c || !c.id || seen.has(c.id)) return false;
            seen.add(c.id);
            return true;
          });
          setComments(deduped);
          localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(deduped));
          setIsLoading(false);
          return;
        }
      }
    } catch (e) {
      console.warn('Could not fetch comments from server, using local fallback:', e);
    }

    // Fallback to local storage or defaults
    try {
      const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (saved) {
        const parsed: CommentItem[] = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const seen = new Set<string>();
          const deduped = parsed.filter((c: CommentItem) => {
            if (!c || !c.id || seen.has(c.id)) return false;
            seen.add(c.id);
            return true;
          });
          setComments(isAdminMode ? deduped : deduped.filter(c => c.isVisible !== false));
          setIsLoading(false);
          return;
        }
      }
    } catch {
      // ignore
    }

    // Default seed with nested replies
    const defaultSeed: CommentItem[] = [
      {
        id: 'c_1',
        userName: 'محمد علی (Karachi)',
        avatar: '🔥',
        text: 'بہترین ڈاؤنلوڈر ہے! ٹک ٹاک کی ویڈیو بغیر کسی واٹر مارک کے فوراً ڈاؤنلوڈ ہو گئی۔ اور فلوٹنگ بٹن کا فیچر بہت زبردست ہے۔',
        rating: 5,
        createdAt: Date.now() - 1000 * 60 * 60 * 24 * 2,
        isVisible: true,
        isPinned: true,
        likes: 24,
        platform: 'TikTok',
        adminReply: 'بہت شکریہ! ہماری کوشش ہے کہ تمام صارفین کو 100 فیصد صاف اور تیز رفتار سروس ملے۔',
        replies: [
          {
            id: 'r_1_1',
            commentId: 'c_1',
            userName: 'حمزہ قریشی',
            avatar: '⚡',
            text: 'بالکل درست کہا بھائی، خاص طور پر 1080p کوالٹی کے رزلٹس بہت زبردست آتے ہیں۔',
            createdAt: Date.now() - 1000 * 60 * 60 * 20,
            likes: 6,
            isVisible: true,
            replyToUserName: 'محمد علی (Karachi)',
          }
        ]
      },
      {
        id: 'c_2',
        userName: 'Ayesha Malik',
        avatar: '🌟',
        text: 'Instagram Reels audio extractor works like magic! 320kbps MP3 sound quality is crystal clear.',
        rating: 5,
        createdAt: Date.now() - 1000 * 60 * 60 * 18,
        isVisible: true,
        likes: 15,
        platform: 'Instagram',
        replies: [
          {
            id: 'r_2_1',
            commentId: 'c_2',
            userName: 'Bilal Dev',
            avatar: '🎧',
            text: 'Yes, even the album thumbnail is embedded cleanly into downloaded tracks!',
            createdAt: Date.now() - 1000 * 60 * 60 * 12,
            likes: 4,
            isVisible: true,
            replyToUserName: 'Ayesha Malik',
          }
        ]
      },
      {
        id: 'c_3',
        userName: 'سعد خان (Peshawar)',
        avatar: '🚀',
        text: 'بیک گراؤنڈ میں آٹو ڈاؤنلوڈنگ کی رفتار واقعی لاجواب ہے۔ فیس بک اور ٹویٹر کی 1080p ویڈیوز بھی آسانی سے مل جاتی ہیں۔',
        rating: 5,
        createdAt: Date.now() - 1000 * 60 * 60 * 6,
        isVisible: true,
        likes: 11,
        platform: 'Facebook',
        replies: []
      }
    ];
    setComments(defaultSeed);
    setIsLoading(false);
  };

  // Submit new primary comment
  const handleSubmitComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentText.trim()) return;

    setIsSubmitting(true);
    const finalUserName = userName.trim() || (lang === 'ur' ? 'گمنام صارف' : 'Anonymous User');

    const newComment: CommentItem = {
      id: 'c_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
      userName: finalUserName,
      avatar,
      text: commentText.trim(),
      rating,
      createdAt: Date.now(),
      isVisible: true, // Default visible to all users
      isPinned: false,
      likes: 0,
      platform: selectedPlatform,
      replies: [],
    };

    // Update local state immediately for instant feedback
    const updated = [newComment, ...comments];
    setComments(updated);
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updated));
    } catch {
      // ignore
    }

    // Post to server
    try {
      await fetch('/api/comments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userName: finalUserName,
          avatar,
          text: commentText.trim(),
          rating,
          platform: selectedPlatform,
        }),
      });
    } catch (err) {
      console.warn('Server comment save failed, kept locally:', err);
    }

    setCommentText('');
    setIsSubmitting(false);
    setSubmitSuccess(true);
    setTimeout(() => setSubmitSuccess(false), 3500);
  };

  // Submit direct nested reply to a specific comment
  const handleSubmitReply = async (e: React.FormEvent, commentId: string) => {
    e.preventDefault();
    if (!replyUserText.trim()) return;

    setIsSubmittingReply(true);
    const finalReplyUserName = replyUserName.trim() || (lang === 'ur' ? 'صارف' : 'User');
    const replyTargetUser = activeReplyTarget?.replyToUserName;

    const newReply: CommentReply = {
      id: 'r_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
      commentId,
      userName: finalReplyUserName,
      avatar: replyAvatar || '💬',
      text: replyUserText.trim(),
      createdAt: Date.now(),
      likes: 0,
      isVisible: true,
      replyToUserName: replyTargetUser,
    };

    // Update local state
    const updated = comments.map((c) => {
      if (c.id === commentId) {
        return {
          ...c,
          replies: [...(c.replies || []), newReply],
        };
      }
      return c;
    });

    setComments(updated);
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updated));
    } catch {
      // ignore
    }

    // Auto expand replies for this comment
    setExpandedReplies((prev) => ({ ...prev, [commentId]: true }));

    // Send to server
    try {
      await fetch(`/api/comments/${commentId}/replies`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userName: finalReplyUserName,
          avatar: replyAvatar,
          text: replyUserText.trim(),
          replyToUserName: replyTargetUser,
        }),
      });
    } catch (err) {
      console.warn('Server reply post failed, kept locally:', err);
    }

    setIsSubmittingReply(false);
    setReplyUserText('');
    setActiveReplyTarget(null);
    setReplySuccessCommentId(commentId);
    setTimeout(() => setReplySuccessCommentId(null), 3500);
  };

  // Start replying to comment or to a user within the thread
  const handleStartReply = (commentId: string, replyToUserName?: string) => {
    setActiveReplyTarget({ commentId, replyToUserName });
    setExpandedReplies((prev) => ({ ...prev, [commentId]: true }));
    if (!replyUserName && userName) {
      setReplyUserName(userName);
    }
  };

  // Like a nested reply
  const handleLikeReply = async (commentId: string, replyId: string) => {
    let nextLikes = 0;
    const updated = comments.map((c) => {
      if (c.id === commentId && c.replies) {
        const updatedReplies = c.replies.map((r) => {
          if (r.id === replyId) {
            nextLikes = r.likes + 1;
            return { ...r, likes: nextLikes };
          }
          return r;
        });
        return { ...c, replies: updatedReplies };
      }
      return c;
    });

    setComments(updated);
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updated));
    } catch {
      // ignore
    }

    try {
      await fetch(`/api/comments/${commentId}/replies/${replyId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ likes: nextLikes }),
      });
    } catch (err) {
      console.warn('Failed to save reply like:', err);
    }
  };

  // Moderation: Toggle Reply Visibility (Hide from other users / Make Public)
  const handleToggleReplyVisibility = async (commentId: string, replyId: string, currentVisible: boolean) => {
    const nextVisible = !currentVisible;
    const updated = comments.map((c) => {
      if (c.id === commentId && c.replies) {
        const updatedReplies = c.replies.map((r) => {
          if (r.id === replyId) {
            return { ...r, isVisible: nextVisible };
          }
          return r;
        });
        return { ...c, replies: updatedReplies };
      }
      return c;
    });

    setComments(updated);
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updated));
    } catch {
      // ignore
    }

    try {
      await fetch(`/api/comments/${commentId}/replies/${replyId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isVisible: nextVisible }),
      });
    } catch (err) {
      console.warn('Failed to update reply visibility on server:', err);
    }
  };

  // Delete a reply (admin only)
  const handleDeleteReply = async (commentId: string, replyId: string) => {
    if (!window.confirm(lang === 'ur' ? 'کیا آپ واقعی اس جواب کو ڈیلیٹ کرنا چاہتے ہیں؟' : 'Are you sure you want to delete this reply?')) {
      return;
    }

    const updated = comments.map((c) => {
      if (c.id === commentId && c.replies) {
        return {
          ...c,
          replies: c.replies.filter((r) => r.id !== replyId),
        };
      }
      return c;
    });

    setComments(updated);
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updated));
    } catch {
      // ignore
    }

    try {
      await fetch(`/api/comments/${commentId}/replies/${replyId}`, { method: 'DELETE' });
    } catch (err) {
      console.warn('Failed to delete reply on server:', err);
    }
  };

  // Toggle Visibility: If visible, hide from other users; if hidden, make visible
  const handleToggleVisibility = async (id: string, currentVisible: boolean) => {
    const nextVisible = !currentVisible;
    const updated = comments.map(c => c.id === id ? { ...c, isVisible: nextVisible } : c);
    setComments(updated);
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updated));
    } catch {
      // ignore
    }

    try {
      await fetch(`/api/comments/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isVisible: nextVisible }),
      });
    } catch (err) {
      console.warn('Error patching visibility on server:', err);
    }
  };

  // Toggle Pin
  const handleTogglePin = async (id: string, currentPinned?: boolean) => {
    const nextPinned = !currentPinned;
    const updated = comments.map(c => c.id === id ? { ...c, isPinned: nextPinned } : c);
    setComments(updated);
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updated));
    } catch {
      // ignore
    }

    try {
      await fetch(`/api/comments/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isPinned: nextPinned }),
      });
    } catch (err) {
      console.warn('Error patching pin on server:', err);
    }
  };

  // Delete Comment
  const handleDeleteComment = async (id: string) => {
    if (!window.confirm(lang === 'ur' ? 'کیا آپ واقعی اس تبصرے کو ڈیلیٹ کرنا چاہتے ہیں؟' : 'Are you sure you want to delete this comment?')) {
      return;
    }
    const updated = comments.filter(c => c.id !== id);
    setComments(updated);
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updated));
    } catch {
      // ignore
    }

    try {
      await fetch(`/api/comments/${id}`, { method: 'DELETE' });
    } catch (err) {
      console.warn('Error deleting comment on server:', err);
    }
  };

  // Like comment
  const handleLike = async (id: string) => {
    const updated = comments.map(c => c.id === id ? { ...c, likes: c.likes + 1 } : c);
    setComments(updated);
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updated));
    } catch {
      // ignore
    }

    try {
      const target = updated.find(c => c.id === id);
      if (target) {
        await fetch(`/api/comments/${id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ likes: target.likes }),
        });
      }
    } catch {
      // ignore
    }
  };

  // Save Admin Reply
  const handleSaveAdminReply = async (id: string) => {
    if (!replyText.trim()) return;
    const updated = comments.map(c => c.id === id ? { ...c, adminReply: replyText.trim() } : c);
    setComments(updated);
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updated));
    } catch {
      // ignore
    }

    try {
      await fetch(`/api/comments/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ adminReply: replyText.trim() }),
      });
    } catch (err) {
      console.warn('Error saving admin reply on server:', err);
    }

    setReplyingCommentId(null);
    setReplyText('');
  };

  // Admin login toggle
  const handleAdminToggleClick = () => {
    if (isAdminMode) {
      setIsAdminMode(false);
      localStorage.removeItem(LOCAL_STORAGE_ADMIN_KEY);
      setFilterTab('all');
    } else {
      setShowAdminLoginModal(true);
      setAdminPasscode('');
      setAdminError('');
    }
  };

  const handleVerifyPasscode = (e: React.FormEvent) => {
    e.preventDefault();
    if (adminPasscode.trim() === 'admin123' || adminPasscode.trim() === '1234' || adminPasscode.trim() === 'admin') {
      setIsAdminMode(true);
      setShowAdminLoginModal(false);
      setAdminPasscode('');
      setAdminError('');
      localStorage.setItem(LOCAL_STORAGE_ADMIN_KEY, 'true');
    } else {
      setAdminError(lang === 'ur' ? 'غلط پاس ورڈ! (ڈیفالٹ: admin123)' : 'Incorrect passcode! (Default: admin123)');
    }
  };

  // Toggle replies expanded for a comment
  const toggleRepliesForComment = (commentId: string) => {
    setExpandedReplies(prev => ({
      ...prev,
      [commentId]: prev[commentId] !== undefined ? !prev[commentId] : false
    }));
  };

  // Filtered comments
  const visibleToDisplay = comments.filter(c => {
    // If not admin, strictly hide comments where isVisible is false
    if (!isAdminMode && c.isVisible === false) {
      return false;
    }
    if (filterTab === 'hidden') {
      return c.isVisible === false;
    }
    if (filterTab === 'top') {
      return c.rating >= 5;
    }
    return true;
  });

  // Sort: pinned first, then newest
  const sortedComments = [...visibleToDisplay].sort((a, b) => {
    if (a.isPinned && !b.isPinned) return -1;
    if (!a.isPinned && b.isPinned) return 1;
    return b.createdAt - a.createdAt;
  });

  const hiddenCount = comments.filter(c => c.isVisible === false).length;

  return (
    <section className="w-full max-w-4xl mx-auto mt-6 mb-6 px-1 sm:px-0" id="community-comments-section">
      
      {/* Header Card */}
      <div className="bg-[#101829]/85 backdrop-blur-xl border border-blue-500/25 rounded-3xl p-5 sm:p-7 shadow-[0_20px_50px_rgba(0,0,0,0.5)] transition-colors">
        
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-5 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-purple-600 text-white flex items-center justify-center shadow-md shadow-blue-500/20 shrink-0">
              <MessageSquare className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-black text-base sm:text-lg text-slate-900 dark:text-white">
                  {t.communityComments}
                </h3>
                <span className="px-2.5 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 text-[11px] font-extrabold">
                  {comments.length}
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 max-w-xl leading-relaxed">
                {t.communityCommentsDesc}
              </p>
            </div>
          </div>

          {/* Admin / Moderator Toggle Button */}
          <button
            onClick={handleAdminToggleClick}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-2xl font-bold text-xs transition-all shadow-xs cursor-pointer min-h-[40px] whitespace-nowrap ${
              isAdminMode
                ? 'bg-amber-500 hover:bg-amber-600 text-white shadow-amber-500/25 ring-2 ring-amber-400/40'
                : 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300'
            }`}
            title={t.adminControls}
            id="admin-moderator-toggle-btn"
          >
            {isAdminMode ? (
              <>
                <Unlock className="w-4 h-4" />
                <span>{t.adminModeActive}</span>
              </>
            ) : (
              <>
                <Shield className="w-4 h-4 text-slate-500 dark:text-slate-400" />
                <span>{t.adminControls}</span>
              </>
            )}
          </button>
        </div>

        {/* Admin Mode Alert Notice Banner */}
        {isAdminMode && (
          <div className="mt-4 p-3.5 rounded-2xl bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800/80 flex items-center justify-between gap-3 text-xs text-amber-900 dark:text-amber-200 animate-fade-in">
            <div className="flex items-center gap-2.5">
              <ShieldAlert className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0" />
              <div>
                <span className="font-extrabold">
                  {lang === 'ur' 
                    ? 'نگران کنٹرول فعال ہے:' 
                    : 'Moderator Controls Active:'}
                </span>{' '}
                <span>
                  {lang === 'ur' 
                    ? 'آپ کسی بھی تبصرے یا جواب کو دوسرے صارفین سے چھپا سکتے ہیں یا مستقل پبلک رکھ سکتے ہیں۔' 
                    : 'You can hide unwanted comments or direct replies from public users or keep them visible.'}
                </span>
              </div>
            </div>
            <button
              onClick={() => {
                setIsAdminMode(false);
                localStorage.removeItem(LOCAL_STORAGE_ADMIN_KEY);
              }}
              className="text-[11px] font-bold px-2.5 py-1 rounded-lg bg-amber-200/80 dark:bg-amber-900/60 hover:bg-amber-300 dark:hover:bg-amber-800 transition-colors cursor-pointer"
            >
              {lang === 'ur' ? 'لاگ آؤٹ' : 'Exit Admin'}
            </button>
          </div>
        )}

        {/* Primary Comment Input Form */}
        <form onSubmit={handleSubmitComment} className="mt-6 space-y-4">
          
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
            {/* User Name */}
            <div className="sm:col-span-5">
              <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 mb-1">
                {t.yourName}
              </label>
              <input
                type="text"
                value={userName}
                onChange={(e) => setUserName(e.target.value)}
                placeholder={lang === 'ur' ? 'اپنا نام درج کریں (یا گمنام)' : 'Enter your name (or Anonymous)'}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                maxLength={40}
              />
            </div>

            {/* Avatar Picker */}
            <div className="sm:col-span-4">
              <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 mb-1">
                {lang === 'ur' ? 'اواتار آئیکن' : 'Avatar'}
              </label>
              <div className="flex items-center gap-1.5 overflow-x-auto py-1">
                {AVATAR_OPTIONS.map((av, avIdx) => (
                  <button
                    key={`comment_avatar_${av}_${avIdx}`}
                    type="button"
                    onClick={() => setAvatar(av)}
                    className={`w-8 h-8 rounded-lg text-sm flex items-center justify-center transition-all cursor-pointer ${
                      avatar === av
                        ? 'bg-blue-600 text-white scale-110 shadow-xs'
                        : 'bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700'
                    }`}
                  >
                    {av}
                  </button>
                ))}
              </div>
            </div>

            {/* 5-Star Rating */}
            <div className="sm:col-span-3">
              <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 mb-1">
                {t.rating}
              </label>
              <div className="flex items-center gap-1 py-1.5">
                {[1, 2, 3, 4, 5].map((starVal) => (
                  <button
                    key={`rating_star_${starVal}`}
                    type="button"
                    onClick={() => setRating(starVal)}
                    className="p-0.5 text-amber-400 hover:scale-125 transition-transform cursor-pointer"
                  >
                    <Star 
                      className={`w-5 h-5 ${starVal <= rating ? 'fill-amber-400 text-amber-400' : 'text-slate-300 dark:text-slate-600'}`} 
                    />
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Platform Tag Selector */}
          <div>
            <span className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 mb-1.5">
              {lang === 'ur' ? 'متعلقہ پلیٹ فارم' : 'Related Platform'}
            </span>
            <div className="flex flex-wrap items-center gap-1.5">
              {PLATFORM_TAGS.map((tag, tagIdx) => (
                <button
                  key={`platform_tag_${tag}_${tagIdx}`}
                  type="button"
                  onClick={() => setSelectedPlatform(tag)}
                  className={`px-2.5 py-1 rounded-xl text-[11px] font-bold transition-all cursor-pointer ${
                    selectedPlatform === tag
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                  }`}
                >
                  {tag}
                </button>
              ))}
            </div>
          </div>

          {/* Comment Textarea */}
          <div>
            <textarea
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              placeholder={t.writeComment}
              rows={3}
              className="w-full px-4 py-3 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-xs sm:text-sm text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              maxLength={500}
            />
            <div className="flex items-center justify-between text-[11px] text-slate-400 mt-1 px-1">
              <span>{commentText.length} / 500</span>
              {submitSuccess && (
                <span className="text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1 animate-fade-in">
                  <Check className="w-3.5 h-3.5" />
                  {t.commentPublished}
                </span>
              )}
            </div>
          </div>

          {/* Submit Button */}
          <div className="flex items-center justify-end">
            <button
              type="submit"
              disabled={isSubmitting || !commentText.trim()}
              className="flex items-center gap-2 px-6 py-2.5 rounded-2xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold text-xs sm:text-sm shadow-md shadow-blue-500/20 active:scale-95 transition-all cursor-pointer min-h-[42px]"
            >
              <Send className="w-4 h-4" />
              <span>{isSubmitting ? (lang === 'ur' ? 'شائع ہو رہا ہے...' : 'Posting...') : t.submitComment}</span>
            </button>
          </div>
        </form>

        {/* Filter Navigation Tabs */}
        <div className="mt-8 pt-5 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setFilterTab('all')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
                filterTab === 'all'
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              {t.filterAll} ({comments.length})
            </button>
            <button
              onClick={() => setFilterTab('top')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
                filterTab === 'top'
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              ⭐ {lang === 'ur' ? 'ٹاپ ریٹنگ (5★)' : 'Top Rated (5★)'}
            </button>

            {/* Admin Hidden Filter Tab */}
            {isAdminMode && (
              <button
                onClick={() => setFilterTab('hidden')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5 ${
                  filterTab === 'hidden'
                    ? 'bg-rose-600 text-white'
                    : 'bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-900/60'
                }`}
              >
                <EyeOff className="w-3.5 h-3.5" />
                <span>{t.filterHidden} ({hiddenCount})</span>
              </button>
            )}
          </div>

          <span className="text-[11px] text-slate-400 font-medium">
            {lang === 'ur' ? 'صارفین کے براہ راست مباحثے' : 'Interactive Community Feed'}
          </span>
        </div>

        {/* Comments Feed List */}
        <div className="mt-5 space-y-4">
          {isLoading ? (
            <div className="py-8 text-center text-xs text-slate-400 animate-pulse">
              {lang === 'ur' ? 'تبصرے لوڈ ہو رہے ہیں...' : 'Loading comments...'}
            </div>
          ) : sortedComments.length === 0 ? (
            <div className="py-10 text-center border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl">
              <Smile className="w-8 h-8 text-slate-400 mx-auto mb-2 opacity-60" />
              <p className="text-xs font-bold text-slate-500 dark:text-slate-400">
                {lang === 'ur' ? 'ابھی کوئی تبصرہ موجود نہیں ہے۔ پہلا تبصرہ آپ لکھیں!' : 'No comments yet in this tab. Be the first to share your thoughts!'}
              </p>
            </div>
          ) : (
            sortedComments.map((item, index) => {
              const isHidden = item.isVisible === false;
              const repliesList = item.replies || [];
              const visibleReplies = repliesList.filter(r => isAdminMode || r.isVisible !== false);
              const isReplyingToThisComment = activeReplyTarget?.commentId === item.id;
              // Default replies to open if not specified, or respect user toggle
              const areRepliesExpanded = expandedReplies[item.id] !== undefined ? expandedReplies[item.id] : true;

              return (
                <div
                  key={`comment_${item.id || 'cmt'}_${index}`}
                  className={`p-4 sm:p-5 rounded-2xl border transition-all ${
                    item.isPinned
                      ? 'bg-gradient-to-r from-blue-50/80 via-indigo-50/50 to-blue-50/80 dark:from-blue-950/40 dark:via-indigo-950/30 dark:to-blue-950/40 border-blue-200 dark:border-blue-800/80 shadow-xs'
                      : isHidden
                      ? 'bg-rose-50/50 dark:bg-rose-950/20 border-rose-200 dark:border-rose-900/50'
                      : 'bg-slate-50/70 dark:bg-slate-800/40 border-slate-100 dark:border-slate-800'
                  }`}
                  id={`comment-${item.id}`}
                >
                  {/* Top Bar: User info, badges & date */}
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center text-lg shrink-0 shadow-xs">
                        {item.avatar}
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="font-extrabold text-xs sm:text-sm text-slate-900 dark:text-white">
                            {item.userName}
                          </span>
                          {item.platform && (
                            <span className="px-2 py-0.5 rounded-full bg-slate-200 dark:bg-slate-700 text-[10px] font-bold text-slate-600 dark:text-slate-300">
                              {item.platform}
                            </span>
                          )}
                          {item.isPinned && (
                            <span className="px-2 py-0.5 rounded-full bg-blue-600 text-white text-[10px] font-black flex items-center gap-1 shadow-xs">
                              <Pin className="w-2.5 h-2.5 fill-white" />
                              {t.pinnedBadge}
                            </span>
                          )}
                        </div>

                        {/* Star Rating */}
                        <div className="flex items-center gap-0.5 mt-0.5">
                          {[1, 2, 3, 4, 5].map((starIdx) => (
                            <Star
                              key={`item_star_${item.id || 'cmt'}_${index}_${starIdx}`}
                              className={`w-3 h-3 ${starIdx <= item.rating ? 'fill-amber-400 text-amber-400' : 'text-slate-300 dark:text-slate-600'}`}
                            />
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Status Badge & Timestamp */}
                    <div className="flex items-center gap-2 text-[11px] text-slate-400">
                      {/* Visibility Badge for Admin Mode */}
                      {isAdminMode && (
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black flex items-center gap-1 ${
                          isHidden
                            ? 'bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300 border border-rose-300 dark:border-rose-800'
                            : 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800'
                        }`}>
                          {isHidden ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                          <span>{isHidden ? t.hiddenBadge : t.publicBadge}</span>
                        </span>
                      )}

                      <span>{new Date(item.createdAt).toLocaleDateString(lang === 'ur' ? 'ur-PK' : 'en-US')}</span>
                    </div>
                  </div>

                  {/* Comment Body */}
                  <p className="text-xs sm:text-sm text-slate-700 dark:text-slate-200 mt-3 leading-relaxed whitespace-pre-wrap">
                    {item.text}
                  </p>

                  {/* Admin Official Reply (if exists) */}
                  {item.adminReply && (
                    <div className="mt-3.5 p-3 rounded-xl bg-blue-50/80 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-900/60 flex items-start gap-2.5">
                      <CornerDownRight className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-[11px] font-black text-blue-700 dark:text-blue-300">
                            {lang === 'ur' ? 'ایڈمن کا باضابطہ جواب' : 'Official Team Reply'}
                          </span>
                          <span className="w-1.5 h-1.5 rounded-full bg-blue-600" />
                        </div>
                        <p className="text-xs text-slate-700 dark:text-slate-300 mt-1">
                          {item.adminReply}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Primary Comment Action Bar */}
                  <div className="mt-3.5 pt-2.5 border-t border-slate-200/60 dark:border-slate-700/60 flex flex-wrap items-center justify-between gap-2">
                    
                    <div className="flex items-center gap-2">
                      {/* Like Action */}
                      <button
                        onClick={() => handleLike(item.id)}
                        className="flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors cursor-pointer"
                        title={lang === 'ur' ? 'پسند کریں' : 'Like post'}
                      >
                        <ThumbsUp className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                        <span>{item.likes > 0 ? item.likes : ''} {lang === 'ur' ? 'پسند' : 'Like'}</span>
                      </button>

                      {/* USER DIRECT NESTED REPLY BUTTON */}
                      <button
                        onClick={() => handleStartReply(item.id, item.userName)}
                        className={`flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                          isReplyingToThisComment
                            ? 'bg-blue-600 text-white shadow-xs'
                            : 'bg-slate-200/70 hover:bg-blue-50 hover:text-blue-600 dark:bg-slate-700/70 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300'
                        }`}
                        title={t.replyAction}
                      >
                        <Reply className="w-3.5 h-3.5" />
                        <span>{t.replyAction}</span>
                      </button>

                      {/* Toggle Replies View button if replies exist */}
                      {visibleReplies.length > 0 && (
                        <button
                          onClick={() => toggleRepliesForComment(item.id)}
                          className="flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
                        >
                          <MessageCircle className="w-3.5 h-3.5" />
                          <span>
                            {visibleReplies.length} {t.nestedReplies}
                          </span>
                          {areRepliesExpanded ? (
                            <ChevronUp className="w-3.5 h-3.5" />
                          ) : (
                            <ChevronDown className="w-3.5 h-3.5" />
                          )}
                        </button>
                      )}
                    </div>

                    {/* Admin Moderation Actions */}
                    {isAdminMode && (
                      <div className="flex flex-wrap items-center gap-1.5">
                        
                        {/* TOGGLE VISIBILITY (HIDE FROM PUBLIC / MAKE PUBLIC) */}
                        <button
                          onClick={() => handleToggleVisibility(item.id, item.isVisible !== false)}
                          className={`flex items-center gap-1.5 px-3 py-1 rounded-xl text-[11px] font-black transition-colors cursor-pointer ${
                            isHidden
                              ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                              : 'bg-rose-600 hover:bg-rose-700 text-white'
                          }`}
                          title={isHidden ? t.makePublic : t.hideFromPublic}
                        >
                          {isHidden ? (
                            <>
                              <Eye className="w-3.5 h-3.5" />
                              <span>{t.makePublic}</span>
                            </>
                          ) : (
                            <>
                              <EyeOff className="w-3.5 h-3.5" />
                              <span>{t.hideFromPublic}</span>
                            </>
                          )}
                        </button>

                        {/* Pin / Unpin */}
                        <button
                          onClick={() => handleTogglePin(item.id, item.isPinned)}
                          className={`flex items-center gap-1 px-2.5 py-1 rounded-xl text-[11px] font-bold cursor-pointer transition-colors ${
                            item.isPinned
                              ? 'bg-blue-600 text-white'
                              : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-300'
                          }`}
                          title={t.pinComment}
                        >
                          <Pin className="w-3 h-3" />
                          <span>{item.isPinned ? (lang === 'ur' ? 'ان پن' : 'Unpin') : t.pinComment}</span>
                        </button>

                        {/* Admin Official Reply Button */}
                        <button
                          onClick={() => {
                            setReplyingCommentId(replyingCommentId === item.id ? null : item.id);
                            setReplyText(item.adminReply || '');
                          }}
                          className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 text-[11px] font-bold cursor-pointer"
                        >
                          <CornerDownRight className="w-3 h-3" />
                          <span>{t.replyComment}</span>
                        </button>

                        {/* Delete Button */}
                        <button
                          onClick={() => handleDeleteComment(item.id)}
                          className="p-1.5 rounded-xl text-rose-600 hover:bg-rose-100 dark:hover:bg-rose-950/80 transition-colors cursor-pointer"
                          title={t.deleteComment}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>

                      </div>
                    )}

                  </div>

                  {/* Inline Admin Reply Box */}
                  {isAdminMode && replyingCommentId === item.id && (
                    <div className="mt-3 p-3 bg-white dark:bg-slate-900 border border-blue-200 dark:border-blue-800 rounded-xl space-y-2 animate-fade-in">
                      <textarea
                        value={replyText}
                        onChange={(e) => setReplyText(e.target.value)}
                        placeholder={t.replyPlaceholder}
                        rows={2}
                        className="w-full p-2.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-blue-500 resize-none"
                      />
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => setReplyingCommentId(null)}
                          className="px-3 py-1 rounded-lg text-xs font-bold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
                        >
                          {lang === 'ur' ? 'منسوخ' : 'Cancel'}
                        </button>
                        <button
                          onClick={() => handleSaveAdminReply(item.id)}
                          className="px-4 py-1 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-xs cursor-pointer"
                        >
                          {t.replySubmit}
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Direct Nested Reply Submission Box */}
                  {isReplyingToThisComment && (
                    <form
                      onSubmit={(e) => handleSubmitReply(e, item.id)}
                      className="mt-3.5 p-3.5 sm:p-4 rounded-2xl bg-white dark:bg-slate-900 border border-blue-300 dark:border-blue-700 shadow-md animate-fade-in space-y-3"
                    >
                      <div className="flex items-center justify-between text-xs pb-2 border-b border-slate-100 dark:border-slate-800">
                        <div className="flex items-center gap-1.5 text-blue-600 dark:text-blue-400 font-bold">
                          <Reply className="w-3.5 h-3.5" />
                          <span>
                            {t.replyingToUser}{' '}
                            <span className="font-extrabold underline">
                              @{activeReplyTarget?.replyToUserName || item.userName}
                            </span>
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => setActiveReplyTarget(null)}
                          className="text-[11px] text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 font-bold cursor-pointer"
                        >
                          {t.cancelReply} ✕
                        </button>
                      </div>

                      {/* Name & Quick Avatar Selector for reply */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        <div>
                          <input
                            type="text"
                            value={replyUserName}
                            onChange={(e) => setReplyUserName(e.target.value)}
                            placeholder={lang === 'ur' ? 'آپ کا نام (یا صارف)' : 'Your name (or User)'}
                            className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500"
                            maxLength={35}
                          />
                        </div>
                        <div className="flex items-center gap-1.5 overflow-x-auto">
                          {['💬', '🔥', '⚡', '🌟', '🚀', '👑', '✨'].map((av, avIdx) => (
                            <button
                              key={`reply_avatar_${item.id || 'cmt'}_${index}_${av}_${avIdx}`}
                              type="button"
                              onClick={() => setReplyAvatar(av)}
                              className={`w-7 h-7 rounded-lg text-xs flex items-center justify-center cursor-pointer transition-all ${
                                replyAvatar === av
                                  ? 'bg-blue-600 text-white scale-110 shadow-xs'
                                  : 'bg-slate-100 dark:bg-slate-800'
                              }`}
                            >
                              {av}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Reply Message Input */}
                      <div>
                        <textarea
                          value={replyUserText}
                          onChange={(e) => setReplyUserText(e.target.value)}
                          placeholder={t.writeReplyPlaceholder}
                          rows={2}
                          autoFocus
                          className="w-full p-3 text-xs sm:text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                          maxLength={350}
                        />
                      </div>

                      {/* Submit Actions */}
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] text-slate-400">
                          {replyUserText.length} / 350
                        </span>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => setActiveReplyTarget(null)}
                            className="px-3 py-1.5 rounded-xl text-xs font-bold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                          >
                            {t.cancelReply}
                          </button>
                          <button
                            type="submit"
                            disabled={isSubmittingReply || !replyUserText.trim()}
                            className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold text-xs shadow-xs transition-all active:scale-95 cursor-pointer"
                          >
                            <Send className="w-3.5 h-3.5" />
                            <span>{isSubmittingReply ? (lang === 'ur' ? 'شائع ہو رہا ہے...' : 'Posting...') : t.submitReplyBtn}</span>
                          </button>
                        </div>
                      </div>
                    </form>
                  )}

                  {/* Feedback toast after submitting reply */}
                  {replySuccessCommentId === item.id && (
                    <div className="mt-2.5 p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 text-xs font-bold flex items-center gap-2 animate-fade-in">
                      <Check className="w-3.5 h-3.5" />
                      <span>{t.replyPublished}</span>
                    </div>
                  )}

                  {/* NESTED REPLIES THREAD */}
                  {visibleReplies.length > 0 && areRepliesExpanded && (
                    <div className="mt-4 pt-3 border-t border-dashed border-slate-200/80 dark:border-slate-700/80">
                      
                      <div className="border-l-2 rtl:border-l-0 rtl:border-r-2 border-blue-300 dark:border-blue-700/60 pl-3 sm:pl-4 rtl:pl-0 rtl:pr-3 sm:rtl:pr-4 space-y-3">
                        {visibleReplies.map((replyItem, replyIndex) => {
                          const isReplyHidden = replyItem.isVisible === false;

                          return (
                            <div
                              key={`reply_${item.id}_${replyItem.id || 'rep'}_${replyIndex}`}
                              className={`p-3 rounded-2xl border transition-all ${
                                isReplyHidden
                                  ? 'bg-rose-50/40 dark:bg-rose-950/20 border-rose-200 dark:border-rose-900/40'
                                  : 'bg-white/80 dark:bg-slate-900/80 border-slate-100 dark:border-slate-800/90 shadow-xs'
                              }`}
                            >
                              {/* Reply User Header */}
                              <div className="flex items-center justify-between gap-2">
                                <div className="flex items-center gap-2">
                                  <div className="w-6 h-6 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-xs shrink-0">
                                    {replyItem.avatar || '💬'}
                                  </div>
                                  <div className="flex items-center gap-1.5 flex-wrap">
                                    <span className="font-extrabold text-xs text-slate-900 dark:text-slate-100">
                                      {replyItem.userName}
                                    </span>
                                    {replyItem.replyToUserName && (
                                      <span className="text-[10px] font-semibold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/60 px-1.5 py-0.5 rounded-md">
                                        @{replyItem.replyToUserName}
                                      </span>
                                    )}
                                  </div>
                                </div>

                                <div className="flex items-center gap-2 text-[10px] text-slate-400">
                                  {isAdminMode && (
                                    <span className={`px-2 py-0.5 rounded-full text-[9px] font-black ${
                                      isReplyHidden
                                        ? 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300'
                                        : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
                                    }`}>
                                      {isReplyHidden ? t.hiddenBadge : t.publicBadge}
                                    </span>
                                  )}
                                  <span>{new Date(replyItem.createdAt).toLocaleDateString(lang === 'ur' ? 'ur-PK' : 'en-US')}</span>
                                </div>
                              </div>

                              {/* Reply Content */}
                              <p className="text-xs text-slate-700 dark:text-slate-300 mt-2 leading-relaxed whitespace-pre-wrap">
                                {replyItem.text}
                              </p>

                              {/* Reply Action Bar */}
                              <div className="mt-2.5 pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
                                <div className="flex items-center gap-2">
                                  {/* Like Reply */}
                                  <button
                                    onClick={() => handleLikeReply(item.id, replyItem.id)}
                                    className="flex items-center gap-1 text-[11px] font-bold text-slate-500 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 cursor-pointer"
                                  >
                                    <ThumbsUp className="w-3 h-3" />
                                    <span>{replyItem.likes > 0 ? replyItem.likes : ''} {lang === 'ur' ? 'پسند' : 'Like'}</span>
                                  </button>

                                  {/* Reply to this specific user */}
                                  <button
                                    onClick={() => handleStartReply(item.id, replyItem.userName)}
                                    className="flex items-center gap-1 text-[11px] font-bold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
                                  >
                                    <Reply className="w-3 h-3" />
                                    <span>{t.replyAction}</span>
                                  </button>
                                </div>

                                {/* Admin moderation for reply */}
                                {isAdminMode && (
                                  <div className="flex items-center gap-1.5">
                                    <button
                                      onClick={() => handleToggleReplyVisibility(item.id, replyItem.id, replyItem.isVisible !== false)}
                                      className={`p-1 rounded-lg text-[10px] font-bold cursor-pointer ${
                                        isReplyHidden
                                          ? 'text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950'
                                          : 'text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950'
                                      }`}
                                      title={isReplyHidden ? t.makePublic : t.hideFromPublic}
                                    >
                                      {isReplyHidden ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
                                    </button>
                                    <button
                                      onClick={() => handleDeleteReply(item.id, replyItem.id)}
                                      className="p-1 rounded-lg text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950 cursor-pointer"
                                      title={t.deleteComment}
                                    >
                                      <Trash2 className="w-3 h-3" />
                                    </button>
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>

                    </div>
                  )}

                </div>
              );
            })
          )}
        </div>

        {/* Non-Fixed Community Footer — Stays at the bottom of the reviews list and scrolls naturally */}
        <footer
          id="community-reviews-scrollable-footer"
          className="mt-6 pt-4 border-t border-rose-500/25 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-400"
        >
          <div className="flex items-center gap-2">
            <MessageSquare className="w-4 h-4 text-rose-400 shrink-0" />
            <span>
              {lang === 'ur'
                ? `کمیونٹی اینڈ ایپ ریویوز فوٹر • کل تبصرے: ${comments.length}`
                : `Community & App Reviews Footer • Total Reviews: ${comments.length}`}
            </span>
          </div>

          <button
            type="button"
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-rose-600 to-pink-600 hover:from-rose-500 hover:to-pink-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-xs transition-all cursor-pointer"
          >
            <ChevronUp className="w-3.5 h-3.5" />
            <span>{lang === 'ur' ? 'اوپر جائیں (Back to Top)' : 'Back to Top'}</span>
          </button>
        </footer>

      </div>

      {/* Admin Passcode Modal */}
      {showAdminLoginModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in">
          <div className="w-full max-w-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-2xl animate-scale-up">
            <div className="w-12 h-12 rounded-2xl bg-amber-100 dark:bg-amber-950/80 text-amber-600 dark:text-amber-400 flex items-center justify-center mx-auto mb-3">
              <Lock className="w-6 h-6" />
            </div>
            <h4 className="font-extrabold text-base text-center text-slate-900 dark:text-white">
              {t.adminControls}
            </h4>
            <p className="text-xs text-center text-slate-500 dark:text-slate-400 mt-1">
              {t.adminPasscodePrompt}
            </p>

            <form onSubmit={handleVerifyPasscode} className="mt-4 space-y-3">
              <input
                type="password"
                value={adminPasscode}
                onChange={(e) => setAdminPasscode(e.target.value)}
                placeholder="admin123"
                autoFocus
                className="w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-center font-mono text-sm tracking-widest focus:outline-none focus:ring-2 focus:ring-amber-500"
              />

              {adminError && (
                <p className="text-xs text-rose-500 text-center font-bold">
                  {adminError}
                </p>
              )}

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAdminLoginModal(false)}
                  className="flex-1 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold hover:bg-slate-200 cursor-pointer"
                >
                  {lang === 'ur' ? 'منسوخ' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold shadow-md shadow-amber-500/25 cursor-pointer"
                >
                  {lang === 'ur' ? 'تصدیق کریں' : 'Unlock'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </section>
  );
};
