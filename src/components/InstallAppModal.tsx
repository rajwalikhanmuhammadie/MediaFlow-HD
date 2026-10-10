import React from 'react';
import { X, ExternalLink } from 'lucide-react';
import { Language } from '../types';

interface InstallAppModalProps {
  isOpen: boolean;
  onClose: () => void;
  lang: Language;
  onTriggerInstall?: () => void;
  canInstallPrompt?: boolean;
  autoStartInstall?: boolean;
}

export const InstallAppModal: React.FC<InstallAppModalProps> = ({
  isOpen,
  onClose,
  lang,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-fade-in">
      <div
        className="relative w-full max-w-md bg-white dark:bg-[#0d1322] rounded-2xl sm:rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col overflow-hidden text-slate-800 dark:text-slate-100 p-6 space-y-4 text-center"
        id="install-app-modal"
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 w-8 h-8 rounded-xl flex items-center justify-center text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          id="close-install-modal-btn"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="space-y-2 pt-2">
          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 font-medium">
            {lang === 'ur'
              ? 'ایپ ڈاؤن لوڈ کرنے کے لیے نیچے دیے گئے لنک پر کلک کریں (کروم میں نیا ٹیب کھلے گا):'
              : 'Click the link below to open in a new Chrome tab and download the app:'}
          </p>

          <a
            href="https://mediaflow-hd.ai.studio"
            target="_blank"
            rel="noopener noreferrer"
            onClick={onClose}
            className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-emerald-600/10 hover:bg-emerald-600/20 border border-emerald-500/30 text-emerald-500 font-mono font-bold text-sm sm:text-base underline underline-offset-4 transition-colors cursor-pointer"
          >
            <span>https://mediaflow-hd.ai.studio</span>
            <ExternalLink className="w-4 h-4 shrink-0" />
          </a>
        </div>
      </div>
    </div>
  );
};

