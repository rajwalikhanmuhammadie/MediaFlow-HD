import React, { useState, useEffect } from 'react';
import { X, Sparkles, Copy, Check, Hash, MessageSquare, Send } from 'lucide-react';
import { MediaResult, Language } from '../types';
import { translations } from '../data/translations';

interface AICaptionModalProps {
  isOpen: boolean;
  onClose: () => void;
  media: MediaResult | null;
  lang: Language;
}

export const AICaptionModal: React.FC<AICaptionModalProps> = ({
  isOpen,
  onClose,
  media,
  lang,
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [urduCaption, setUrduCaption] = useState('');
  const [englishCaption, setEnglishCaption] = useState('');
  const [hashtags, setHashtags] = useState<string[]>([]);
  const [insight, setInsight] = useState('Best posting time: 6 PM - 9 PM for maximum engagement.');
  const [copiedSection, setCopiedSection] = useState<string | null>(null);

  useEffect(() => {
    if (media) {
      setUrduCaption(`🔥 شاندار اور وائرل ${media.platform} ویڈیو! دیکھ کر لطف اندوز ہوں اور دوستوں کے ساتھ شیئر کریں۔ #وائرل #${media.platform}`);
      setEnglishCaption(`✨ Incredible clip from ${media.platform}! Must watch & save. #${media.platform} #trending #viral`);
      setHashtags([
        `#${media.platform}`,
        '#viralvideo',
        '#trending',
        '#reels',
        '#fyp',
        '#explorepage',
        '#foryou',
        '#shorts',
        '#urdu',
        '#contentcreator'
      ]);
    }
  }, [media]);

  if (!isOpen || !media) return null;
  const t = translations[lang];

  const handleGenerate = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/ai-analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: media.title,
          platform: media.platform,
          caption: media.caption,
        }),
      });
      const data = await res.json();
      if (data.success) {
        if (data.urduCaption) setUrduCaption(data.urduCaption);
        if (data.englishCaption) setEnglishCaption(data.englishCaption);
        if (data.viralHashtags) setHashtags(data.viralHashtags);
        if (data.aiInsight) setInsight(data.aiInsight);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopy = (text: string, sectionId: string) => {
    navigator.clipboard.writeText(text);
    setCopiedSection(sectionId);
    setTimeout(() => setCopiedSection(null), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2.5 sm:p-6 bg-slate-900/60 backdrop-blur-xs animate-fade-in">
      <div className="relative w-full max-w-xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl sm:rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] transition-colors">
        
        {/* Header */}
        <div className="p-3.5 sm:p-5 md:p-6 border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5 sm:gap-3">
            <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl sm:rounded-2xl bg-amber-100 dark:bg-amber-950/80 text-amber-700 dark:text-amber-300 flex items-center justify-center font-bold shadow-xs border border-amber-200 dark:border-amber-800 shrink-0">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-sm sm:text-base md:text-lg text-slate-900 dark:text-white">
                {t.aiCaptions}
              </h3>
              <p className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 font-medium line-clamp-1 sm:line-clamp-none">
                {lang === 'ur' ? 'ویڈیو ری پوسٹ کرنے کے لیے وائرل کیپشنز اور ہیش ٹیگز' : 'AI-generated viral captions & hashtags for reposting'}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 sm:p-2 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-xl hover:bg-slate-200/60 dark:hover:bg-slate-800 transition-colors cursor-pointer min-h-[36px] min-w-[36px] flex items-center justify-center"
            title={t.close}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 sm:p-6 space-y-4 flex-1 overflow-y-auto">
          
          {/* Refresh AI button */}
          <button
            onClick={handleGenerate}
            disabled={isLoading}
            className="w-full py-3 px-4 rounded-2xl bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-md shadow-blue-500/20 transition-all disabled:opacity-50 cursor-pointer"
          >
            <Sparkles className="w-4 h-4" />
            <span>{isLoading ? t.aiGenerating : t.aiGenerate}</span>
          </button>

          {/* Urdu Caption Box */}
          <div className="bg-slate-50 dark:bg-slate-800/80 rounded-2xl p-4 border border-slate-200 dark:border-slate-700">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-slate-900 dark:text-white">
                {t.urduCaption}
              </span>
              <button
                onClick={() => handleCopy(urduCaption, 'ur')}
                className="text-xs text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-bold flex items-center gap-1 cursor-pointer"
              >
                {copiedSection === 'ur' ? <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedSection === 'ur' ? t.copied : t.copyLink}</span>
              </button>
            </div>
            <p className="text-sm text-slate-800 dark:text-slate-100 leading-relaxed font-sans" dir="rtl">
              {urduCaption}
            </p>
          </div>

          {/* English Caption Box */}
          <div className="bg-slate-50 dark:bg-slate-800/80 rounded-2xl p-4 border border-slate-200 dark:border-slate-700">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-slate-900 dark:text-white">
                {t.englishCaption}
              </span>
              <button
                onClick={() => handleCopy(englishCaption, 'en')}
                className="text-xs text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-bold flex items-center gap-1 cursor-pointer"
              >
                {copiedSection === 'en' ? <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedSection === 'en' ? t.copied : t.copyLink}</span>
              </button>
            </div>
            <p className="text-sm text-slate-800 dark:text-slate-100 leading-relaxed">
              {englishCaption}
            </p>
          </div>

          {/* Hashtags */}
          <div className="bg-slate-50 dark:bg-slate-800/80 rounded-2xl p-4 border border-slate-200 dark:border-slate-700">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1">
                <Hash className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                {t.viralHashtags}
              </span>
              <button
                onClick={() => handleCopy(hashtags.join(' '), 'tags')}
                className="text-xs text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-bold flex items-center gap-1 cursor-pointer"
              >
                {copiedSection === 'tags' ? <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedSection === 'tags' ? t.copied : t.copyLink}</span>
              </button>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {hashtags.map((tag, idx) => (
                <span
                  key={`${tag}_${idx}`}
                  className="px-2.5 py-1 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-blue-700 dark:text-blue-300 text-xs font-mono font-semibold shadow-2xs"
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>

          {/* AI Tip Insight */}
          {insight && (
            <div className="p-3.5 bg-amber-50 dark:bg-amber-950/60 rounded-2xl border border-amber-200 dark:border-amber-800 text-xs text-amber-900 dark:text-amber-300 font-medium flex items-center gap-2">
              <Sparkles className="w-4 h-4 shrink-0 text-amber-600 dark:text-amber-400" />
              <span>💡 {insight}</span>
            </div>
          )}

        </div>

      </div>
    </div>
  );
};
