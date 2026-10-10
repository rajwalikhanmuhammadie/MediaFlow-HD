import React, { useState, useRef } from 'react';
import { QRCodeCanvas, QRCodeSVG } from 'qrcode.react';
import { 
  X, 
  QrCode, 
  Download, 
  Copy, 
  Check, 
  Smartphone, 
  ExternalLink, 
  FileVideo, 
  Music, 
  Image as ImageIcon, 
  Sparkles,
  Share2,
  ShieldCheck,
  Globe
} from 'lucide-react';
import { Language, DownloadOption } from '../types';
import { translations } from '../data/translations';

interface QRCodeModalProps {
  isOpen: boolean;
  onClose: () => void;
  lang: Language;
  title: string;
  platform: string;
  thumbnail?: string;
  downloadOption?: DownloadOption | null;
  directUrl: string;
  originalUrl?: string;
}

export const QRCodeModal: React.FC<QRCodeModalProps> = ({
  isOpen,
  onClose,
  lang,
  title,
  platform,
  thumbnail,
  downloadOption,
  directUrl,
  originalUrl,
}) => {
  const t = translations[lang];
  const [linkMode, setLinkMode] = useState<'direct' | 'app'>('direct');
  const [copied, setCopied] = useState(false);
  const [qrColor, setQrColor] = useState<'#0f172a' | '#2563eb' | '#7c3aed'>('#0f172a');
  const qrCanvasRef = useRef<HTMLDivElement>(null);

  if (!isOpen) return null;

  // Build the target link based on mode using official production domain
  const getAppDeepLink = () => {
    const target = originalUrl || directUrl;
    return `https://mediaflow-hd.ai.studio/?url=${encodeURIComponent(target)}`;
  };

  const currentUrl = linkMode === 'direct' ? directUrl : getAppDeepLink();

  const handleCopyLink = () => {
    navigator.clipboard.writeText(currentUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleDownloadQrImage = () => {
    if (!qrCanvasRef.current) return;
    const canvas = qrCanvasRef.current.querySelector('canvas');
    if (!canvas) return;

    const pngUrl = canvas.toDataURL('image/png');
    const downloadLink = document.createElement('a');
    const safeTitle = title.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 25);
    downloadLink.href = pngUrl;
    downloadLink.download = `QR_${platform}_${safeTitle}.png`;
    document.body.appendChild(downloadLink);
    downloadLink.click();
    document.body.removeChild(downloadLink);
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/80 backdrop-blur-md animate-fade-in"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      id="qr-code-modal-backdrop"
    >
      <div 
        className="relative w-full max-w-lg bg-white dark:bg-slate-900 rounded-2xl sm:rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col overflow-hidden text-slate-800 dark:text-slate-100"
        id="qr-code-modal"
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-5 sm:px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/60">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600 dark:bg-blue-500 flex items-center justify-center text-white shadow-md shadow-blue-500/20">
              <QrCode className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
                <span>{t.qrCode}</span>
                <span className="text-[10px] sm:text-xs font-extrabold uppercase px-2 py-0.5 rounded-md bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                  {platform}
                </span>
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                {t.scanQrCode}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-9 h-9 rounded-xl flex items-center justify-center text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            id="close-qr-modal-btn"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-5 sm:p-6 space-y-5 overflow-y-auto max-h-[80vh]">
          
          {/* Target URL Selector Tabs */}
          <div className="flex items-center gap-1.5 p-1 rounded-2xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700">
            <button
              onClick={() => setLinkMode('direct')}
              className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
                linkMode === 'direct'
                  ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              <Smartphone className="w-4 h-4" />
              <span>{t.qrDirectDownload}</span>
            </button>
            <button
              onClick={() => setLinkMode('app')}
              className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
                linkMode === 'app'
                  ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              <Globe className="w-4 h-4" />
              <span>{t.qrWebLink}</span>
            </button>
          </div>

          {/* Media Info Snippet */}
          <div className="flex items-center gap-3 p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
            {thumbnail && (
              <img 
                src={thumbnail} 
                alt="thumbnail" 
                className="w-12 h-12 rounded-xl object-cover shrink-0 border border-slate-200 dark:border-slate-700" 
                referrerPolicy="no-referrer"
              />
            )}
            <div className="min-w-0 flex-1">
              <h4 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-slate-100 truncate">
                {title}
              </h4>
              {downloadOption && (
                <div className="flex items-center gap-2 text-[11px] font-mono text-slate-500 dark:text-slate-400 mt-0.5">
                  <span className="font-bold text-blue-600 dark:text-blue-400">{downloadOption.quality}</span>
                  <span>•</span>
                  <span>{downloadOption.format}</span>
                  <span>•</span>
                  <span className="font-semibold text-slate-700 dark:text-slate-300">{downloadOption.size}</span>
                </div>
              )}
            </div>
          </div>

          {/* QR Code Display Canvas */}
          <div className="flex flex-col items-center justify-center gap-3 py-3">
            <div 
              ref={qrCanvasRef}
              className="p-5 rounded-3xl bg-white shadow-xl border-4 border-slate-100 dark:border-slate-800 flex items-center justify-center transition-transform hover:scale-102"
            >
              <QRCodeCanvas
                value={currentUrl}
                size={220}
                bgColor="#ffffff"
                fgColor={qrColor}
                level="Q"
                marginSize={1}
              />
            </div>

            {/* Instruction Tip */}
            <div className="flex items-center gap-2 text-center text-xs font-semibold text-slate-600 dark:text-slate-300 max-w-sm px-2">
              <Smartphone className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
              <span>{t.qrScanTip}</span>
            </div>
          </div>

          {/* Link URL Preview & Copy */}
          <div className="space-y-2">
            <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 flex items-center justify-between gap-2.5">
              <span className="text-xs font-mono text-slate-600 dark:text-slate-300 truncate select-all">
                {currentUrl}
              </span>
              <button
                onClick={handleCopyLink}
                className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-xs transition-all active:scale-95 cursor-pointer shrink-0 flex items-center gap-1.5"
                id="copy-qr-url-btn"
              >
                {copied ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-300" />
                    <span>{t.qrCopied}</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>{t.copyQrLink}</span>
                  </>
                )}
              </button>
            </div>
          </div>

        </div>

        {/* Modal Footer Actions */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-5 sm:px-6 py-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/60">
          <button
            onClick={handleDownloadQrImage}
            className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-100 font-bold text-xs transition-colors cursor-pointer"
            id="download-qr-png-btn"
          >
            <Download className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            <span>{t.downloadQrCode}</span>
          </button>

          <button
            onClick={onClose}
            className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs transition-all shadow-md shadow-blue-500/20 active:scale-95 cursor-pointer text-center"
          >
            {t.close}
          </button>
        </div>

      </div>
    </div>
  );
};
