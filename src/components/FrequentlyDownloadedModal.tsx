import React, { useState, useMemo } from 'react';
import {
  X,
  Trash2,
  Users,
  Search,
  Layers,
  ExternalLink,
  Sparkles,
} from 'lucide-react';
import { Language, SavedAccountItem } from '../types';

interface FrequentlyDownloadedModalProps {
  isOpen: boolean;
  onClose: () => void;
  lang: Language;
  savedAccounts: SavedAccountItem[];
  onSelectAccount: (account: SavedAccountItem) => void;
  onRemoveAccount: (id: string) => void;
  onClearAllAccounts: () => void;
  onOpenNewCreatorBatch?: () => void;
}

export const FrequentlyDownloadedModal: React.FC<FrequentlyDownloadedModalProps> = ({
  isOpen,
  onClose,
  lang,
  savedAccounts,
  onSelectAccount,
  onRemoveAccount,
  onClearAllAccounts,
  onOpenNewCreatorBatch,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [confirmClearAll, setConfirmClearAll] = useState(false);

  const filteredAccounts = useMemo(() => {
    if (!searchQuery.trim()) return savedAccounts;
    const q = searchQuery.toLowerCase();
    return savedAccounts.filter(
      (acc) =>
        acc.handle.toLowerCase().includes(q) ||
        (acc.authorName && acc.authorName.toLowerCase().includes(q)) ||
        acc.platform.toLowerCase().includes(q)
    );
  }, [savedAccounts, searchQuery]);

  if (!isOpen) return null;

  const platformColors: Record<string, string> = {
    tiktok: 'bg-black text-cyan-400 border-cyan-400/50',
    instagram: 'bg-gradient-to-tr from-amber-500 via-pink-500 to-purple-600 text-white border-pink-400/50',
    youtube: 'bg-red-600 text-white border-red-400/50',
    facebook: 'bg-blue-600 text-white border-blue-400/50',
    twitter: 'bg-neutral-900 text-white border-white/30',
    pinterest: 'bg-rose-600 text-white border-rose-400/50',
    threads: 'bg-slate-800 text-white border-white/30',
    reddit: 'bg-orange-600 text-white border-orange-400/50',
  };

  const getPlatformShortLabel = (platform: string) => {
    switch (platform) {
      case 'tiktok':
        return 'TT';
      case 'instagram':
        return 'IG';
      case 'youtube':
        return 'YT';
      case 'facebook':
        return 'FB';
      case 'twitter':
        return 'X';
      case 'pinterest':
        return 'PIN';
      case 'threads':
        return 'TH';
      case 'reddit':
        return 'RD';
      default:
        return platform.slice(0, 2).toUpperCase();
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/80 backdrop-blur-md animate-fade-in"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-4xl bg-gradient-to-b from-[#0b0f19] via-[#121829] to-[#161f35] border border-rose-500/30 rounded-2xl sm:rounded-3xl shadow-[0_20px_60px_rgba(0,0,0,0.85)] overflow-hidden flex flex-col max-h-[90vh] text-slate-100"
        id="frequently-downloaded-modal"
      >
        <div className="lens-flare-line w-full" />

        {/* Modal Header with Clear All & Close */}
        <div className="px-4 py-3.5 border-b border-white/10 bg-[#0b0f19]/95 flex flex-wrap items-center justify-between gap-2.5 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-rose-500/20 border border-rose-500/40 text-rose-400 flex items-center justify-center shadow-[0_0_15px_rgba(244,63,94,0.25)] shrink-0">
              <Users className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-extrabold text-sm sm:text-base text-white">
                  {lang === 'ur'
                    ? 'اکثر ڈاؤن لوڈ کیے گئے اکاؤنٹس (Frequently Downloaded)'
                    : 'Frequently Downloaded Accounts'}
                </h3>
                <span className="px-2 py-0.5 rounded-full bg-rose-500/20 border border-rose-500/40 text-[11px] font-black text-rose-300 font-mono">
                  {savedAccounts.length}
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                {lang === 'ur'
                  ? 'کسی بھی اکاؤنٹ پر کلک کر کے اس کی تمام پروفائل ویڈیوز گرڈ میں کھولیں'
                  : 'Tap any creator to open their profile videos grid for batch downloading'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Clear All Button */}
            {savedAccounts.length > 0 && (
              confirmClearAll ? (
                <div className="flex items-center gap-1.5 bg-rose-950/90 border border-rose-500/50 px-2.5 py-1 rounded-xl">
                  <span className="text-[11px] font-bold text-rose-200">
                    {lang === 'ur' ? 'سب حذف کریں؟' : 'Clear all?'}
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      onClearAllAccounts();
                      setConfirmClearAll(false);
                    }}
                    className="px-2 py-0.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-[11px] font-extrabold cursor-pointer transition-colors"
                    id="confirm-clear-all-freq-btn"
                  >
                    {lang === 'ur' ? 'ہاں (Yes)' : 'Yes'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmClearAll(false)}
                    className="px-2 py-0.5 rounded-lg bg-white/10 hover:bg-white/20 text-slate-200 text-[11px] font-bold cursor-pointer transition-colors"
                  >
                    {lang === 'ur' ? 'نہیں' : 'No'}
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setConfirmClearAll(true)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-500/15 hover:bg-rose-600 text-rose-300 hover:text-white border border-rose-500/35 text-xs font-extrabold transition-all cursor-pointer"
                  id="clear-all-freq-accounts-btn"
                  title={lang === 'ur' ? 'سب کلیئر کریں (Clear All)' : 'Clear All Frequently Downloaded'}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>{lang === 'ur' ? 'کلیئر آل (Clear All)' : 'Clear All'}</span>
                </button>
              )
            )}

            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 rounded-xl bg-white/5 hover:bg-white/15 text-slate-300 hover:text-white border border-white/10 flex items-center justify-center transition-colors cursor-pointer shrink-0"
              title={lang === 'ur' ? 'بند کریں' : 'Close'}
              id="close-freq-downloaded-modal-btn"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Search & Quick Action Sub-bar (shown when accounts exist) */}
        {savedAccounts.length > 0 && (
          <div className="px-4 py-2.5 bg-[#0e1424]/90 border-b border-white/10 flex flex-wrap items-center justify-between gap-2 shrink-0">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={
                  lang === 'ur'
                    ? 'اکاؤنٹ یا کریئیٹر تلاش کریں...'
                    : 'Search saved accounts...'
                }
                className="w-full pl-8 pr-8 py-1.5 rounded-xl bg-[#0b0f19] border border-white/10 focus:border-rose-500/50 text-xs text-white placeholder:text-slate-500 outline-none"
                id="freq-accounts-search-input"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {onOpenNewCreatorBatch && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenNewCreatorBatch();
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-sky-500/15 hover:bg-sky-500/25 text-sky-300 border border-sky-500/30 text-xs font-bold transition-all cursor-pointer shrink-0"
              >
                <Layers className="w-3.5 h-3.5" />
                <span>{lang === 'ur' ? 'نیا پروفائل لنک کھولیں' : 'Load New Profile URL'}</span>
              </button>
            )}
          </div>
        )}

        {/* Scrollable Maximum-Density Grid Body */}
        <div
          className="p-3.5 sm:p-4 overflow-y-auto flex-1 min-h-[260px]"
          id="freq-accounts-scrollable-grid-container"
        >
          {savedAccounts.length === 0 ? (
            <div className="py-12 px-4 text-center flex flex-col items-center justify-center gap-3">
              <div className="w-14 h-14 rounded-2xl bg-rose-500/10 border border-rose-500/25 text-rose-400 flex items-center justify-center">
                <Sparkles className="w-6 h-6" />
              </div>
              <div className="max-w-sm space-y-1">
                <h4 className="text-sm sm:text-base font-extrabold text-white">
                  {lang === 'ur'
                    ? 'ابھی کوئی فریکوینٹلی ڈاؤن لوڈ اکاؤنٹ موجود نہیں ہے'
                    : 'No Frequently Downloaded Accounts Yet'}
                </h4>
                <p className="text-xs text-slate-400 leading-relaxed">
                  {lang === 'ur'
                    ? 'جب آپ کوئی ویڈیو ڈاؤن لوڈ کرتے ہیں یا کسی کریئیٹر کی پروفائل ویڈیوز کھولتے ہیں تو وہ خودکار طور پر یہاں محفوظ ہو جاتے ہیں۔'
                    : 'Whenever you download videos or browse a creator profile, their account will appear here for one-tap access.'}
                </p>
              </div>
              {onOpenNewCreatorBatch && (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onOpenNewCreatorBatch();
                  }}
                  className="mt-1 px-4 py-2 rounded-xl bg-gradient-to-r from-rose-600 to-pink-600 hover:from-rose-500 hover:to-pink-500 text-white text-xs font-extrabold shadow-lg transition-all cursor-pointer flex items-center gap-2"
                >
                  <Layers className="w-4 h-4" />
                  <span>
                    {lang === 'ur' ? 'پروفائل بیچ ڈاؤنلوڈر کھولیں' : 'Open Creator Batch Loader'}
                  </span>
                </button>
              )}
            </div>
          ) : filteredAccounts.length === 0 ? (
            <div className="py-10 text-center text-xs text-slate-400">
              {lang === 'ur' ? 'کوئی مماثل اکاؤنٹ نہیں ملا۔' : 'No matching accounts found.'}
            </div>
          ) : (
            <div
              className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-2.5 sm:gap-3"
              id="frequently-downloaded-accounts-grid"
            >
              {filteredAccounts.map((acc) => {
                const badgeClass =
                  platformColors[acc.platform] || 'bg-rose-600 text-white border-rose-400/50';

                return (
                  <div
                    key={acc.id}
                    className="group relative flex flex-col items-center gap-2 p-2.5 sm:p-3 rounded-2xl bg-[#141a2e]/90 hover:bg-[#1d2642] border border-white/10 hover:border-rose-500/50 transition-all shadow-md"
                    id={`freq-grid-item-${acc.id}`}
                  >
                    {/* Individual Delete Button (ہر اکاؤنٹ کو ہٹانے / ڈیلیٹ کا آپشن) */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onRemoveAccount(acc.id);
                      }}
                      className="absolute top-1.5 right-1.5 z-10 w-6 h-6 rounded-lg bg-black/70 hover:bg-rose-600 text-slate-300 hover:text-white border border-white/15 hover:border-rose-400 flex items-center justify-center transition-all cursor-pointer shadow-md"
                      title={lang === 'ur' ? 'فہرست سے ہٹائیں (Delete)' : 'Remove from list'}
                      aria-label={`Delete ${acc.handle}`}
                      id={`delete-freq-account-${acc.id}`}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>

                    {/* Clickable Area to Open Creator Profile Videos Grid */}
                    <button
                      type="button"
                      onClick={() => {
                        onClose();
                        onSelectAccount(acc);
                      }}
                      className="w-full flex flex-col items-center gap-2 cursor-pointer active:scale-95 transition-transform pt-1"
                      title={
                        lang === 'ur'
                          ? `${acc.handle} کی ویڈیوز گرڈ کھولیں`
                          : `Open ${acc.handle} videos grid`
                      }
                    >
                      <div className="relative">
                        <img
                          src={acc.avatar}
                          alt={acc.handle}
                          className="w-14 h-14 sm:w-16 sm:h-16 rounded-full object-cover border-2 border-rose-500/50 group-hover:border-rose-400 shadow-lg transition-transform group-hover:scale-105 bg-slate-800"
                          referrerPolicy="no-referrer"
                          onError={(e) => {
                            const target = e.currentTarget;
                            target.onerror = null;
                            target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(
                              acc.authorName || acc.handle
                            )}&background=e11d48&color=fff&bold=true`;
                          }}
                        />
                        <span
                          className={`absolute -bottom-1 -right-1 w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-black uppercase border shadow-md ${badgeClass}`}
                        >
                          {getPlatformShortLabel(acc.platform)}
                        </span>
                      </div>

                      <div className="text-center min-w-0 w-full">
                        <p className="text-xs font-extrabold text-white group-hover:text-rose-300 truncate">
                          {acc.authorName || acc.handle}
                        </p>
                        <p className="text-[10px] text-slate-400 truncate font-mono">
                          {acc.handle}
                        </p>
                      </div>

                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-rose-500/15 border border-rose-500/30 text-[10px] font-bold text-rose-300 group-hover:bg-rose-600 group-hover:text-white transition-colors">
                        <ExternalLink className="w-2.5 h-2.5" />
                        <span>{lang === 'ur' ? 'ویڈیوز کھولیں' : 'Open Grid'}</span>
                      </span>
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
