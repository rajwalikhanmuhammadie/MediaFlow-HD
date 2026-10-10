import React, { useState, useEffect, useRef } from 'react';
import { 
  X, 
  Send, 
  Sparkles, 
  Bot, 
  User as UserIcon, 
  Copy, 
  Check, 
  Trash2, 
  Zap, 
  Flame, 
  Film, 
  Languages, 
  Edit3, 
  Settings2, 
  Maximize2, 
  Minimize2, 
  RotateCcw,
  AlertCircle,
  HelpCircle,
  Hash
} from 'lucide-react';
import { Language, Theme, ChatMessage, ChatModelType, ChatRolePreset } from '../types';
import { translations } from '../data/translations';

interface GeminiChatModalProps {
  isOpen: boolean;
  onClose: () => void;
  lang: Language;
  theme: Theme;
  initialContext?: {
    videoTitle?: string;
    platform?: string;
    initialPrompt?: string;
  } | null;
}

const ROLE_PRESETS: ChatRolePreset[] = [
  {
    id: 'growth-expert',
    name: 'Social Media Growth & Viral Expert',
    nameUrdu: 'وائرل سوشل میڈیا و گروتھ ایکسپرٹ',
    description: 'Expert advice on hashtags, trending hooks, algorithms & optimal posting schedules',
    descriptionUrdu: 'ہیش ٹیگز، ٹرینڈنگ ساؤنڈز، الگورتھم کے راز اور ویڈیو وائرل کرنے کے گر',
    icon: '🚀',
    systemInstruction: `You are a premier Social Media Growth & Viral Strategy Expert. 
Your goal is to help creators, marketers, and everyday users grow rapidly on TikTok, Instagram, YouTube Shorts, and Facebook.
Provide high-engagement viral hooks, optimal posting times, content structure, and winning hashtag strategies.
Respond in the language requested by the user (Urdu or English). Use friendly, enthusiastic tone with helpful bullet points and emojis.`,
  },
  {
    id: 'downloader-tech',
    name: 'Media & Download Specialist',
    nameUrdu: 'ویڈیو و آڈیو ڈاؤنلوڈر ٹیکنیکل گائیڈ',
    description: 'Guidance on watermark removal, 1080p 60fps bitrates, 320kbps MP3 vs AAC & codecs',
    descriptionUrdu: 'واٹر مارک ہٹانے، 1080p بٹ ریٹ، 320kbps ایم پی تھری اور ویڈیو فارمیٹس کی رہنمائی',
    icon: '🎬',
    systemInstruction: `You are the technical advisor for this Social Media Video Downloader application.
You know everything about video and audio downloading:
1. TikTok watermark removal (direct CDN mp4 extraction bypassing overlay logos).
2. Audio bitrates (Studio 320kbps MP3 vs 256kbps AAC vs 128kbps).
3. Video resolutions (1080p 60fps, 720p HD, 480p Data Saver, WEBM).
4. Cross-platform downloads (TikTok, Instagram Reels, Facebook HD, YouTube Shorts, Twitter/X, Pinterest, Reddit).
Explain technical media concepts simply and clearly in Urdu or English.`,
  },
  {
    id: 'bilingual-assistant',
    name: 'Bilingual Urdu & English Creator Assistant',
    nameUrdu: 'اردو اور انگریزی مواد معاون',
    description: 'Fluent conversational help in Urdu & English tailored for creators in Pakistan & worldwide',
    descriptionUrdu: 'پاکستانی اور عالمی صارفین کے لیے خالص اور عام فہم اردو اور انگریزی معاونت',
    icon: '🇵🇰',
    systemInstruction: `آپ سوشل میڈیا تخلیق کاروں کے لیے ایک بہترین اردو اور انگریزی معاون (Bilingual Assistant) ہیں۔
آپ صارف کے سوال کے مطابق نہایت شائستہ، بامحاورہ اور عام فہم اردو یا انگریزی میں جواب دیتے ہیں۔
اگر صارف اردو میں سوال پوچھے تو اردو میں مکمل اور جامع جواب دیں اور اگر انگریزی میں پوچھے تو انگریزی میں۔
سوشل میڈیا، ویڈیوز ڈاؤنلوڈنگ، وائرل کیپشنز اور آن لائن ٹرینڈز میں مدد فراہم کریں۔`,
  },
  {
    id: 'caption-writer',
    name: 'Viral Caption & Script Creator',
    nameUrdu: 'وائرل کیپشن و سکرپٹ رائٹر',
    description: 'Instantly crafts eye-catching captions, video scripts, hooks, and hashtags',
    descriptionUrdu: 'دلچسپ کیپشنز، یوٹیوب و ٹک ٹاک سکرپٹس اور ہٹ ہیش ٹیگز فوری تیار کریں',
    icon: '✍️',
    systemInstruction: `You are an elite copywriter and scriptwriter specializing in short-form video (TikTok, Instagram Reels, YouTube Shorts).
When asked, craft captivating, curiosity-inducing captions with high-performing hashtags and clear Calls to Action (CTAs).
Provide both Urdu and English caption versions whenever appropriate.`,
  },
];

const SUGGESTED_PROMPTS = [
  {
    ur: "ٹک ٹاک سے واٹر مارک کے بغیر ویڈیو کیسے ڈاؤنلوڈ کریں؟",
    en: "How do I download TikTok videos without watermark?",
  },
  {
    ur: "انسٹاگرام ریلز وائرل کرنے کے 5 بہترین طریقے بتائیں",
    en: "5 best proven strategies to make Instagram Reels go viral",
  },
  {
    ur: "MP3 320kbps اور 128kbps آڈیو کوالٹی میں کیا فرق ہے؟",
    en: "What is the difference between 320kbps and 128kbps MP3?",
  },
  {
    ur: "فیس بک اور ٹک ٹاک پر ویڈیو پوسٹ کرنے کا بہترین وقت کیا ہے؟",
    en: "What is the best time to post videos on TikTok & Facebook?",
  },
];

const STORAGE_MESSAGES_KEY = 'gemini_chatbot_messages_v1';
const STORAGE_MODEL_KEY = 'gemini_chatbot_model_v1';
const STORAGE_ROLE_KEY = 'gemini_chatbot_role_v1';

export const GeminiChatModal: React.FC<GeminiChatModalProps> = ({
  isOpen,
  onClose,
  lang,
  theme,
  initialContext,
}) => {
  const t = translations[lang];

  // Model selection (Lite for fast, Flash for general, Pro for complex)
  const [selectedModel, setSelectedModel] = useState<ChatModelType>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(STORAGE_MODEL_KEY) as ChatModelType;
      if (saved && ['gemini-3.1-flash-lite', 'gemini-3.5-flash', 'gemini-3.1-pro-preview'].includes(saved)) {
        return saved;
      }
    }
    return 'gemini-3.5-flash';
  });

  // Selected role
  const [selectedRole, setSelectedRole] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(STORAGE_ROLE_KEY);
      if (saved && (ROLE_PRESETS.some(r => r.id === saved) || saved === 'custom')) {
        return saved;
      }
    }
    return 'growth-expert';
  });

  const [customInstruction, setCustomInstruction] = useState<string>('');
  const [isEditingCustomRole, setIsEditingCustomRole] = useState<boolean>(false);

  // Messages state
  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem(STORAGE_MESSAGES_KEY);
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed) && parsed.length > 0) {
            const seen = new Set<string>();
            return parsed.map((m, idx) => {
              const uniqueId = m && m.id && !seen.has(m.id) 
                ? m.id 
                : `msg_${Date.now()}_${idx}_${Math.random().toString(36).slice(2, 6)}`;
              seen.add(uniqueId);
              return { ...m, id: uniqueId };
            });
          }
        }
      } catch {
        // ignore
      }
    }
    return [];
  });

  const [input, setInput] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [isMaximized, setIsMaximized] = useState<boolean>(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Save messages to localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(STORAGE_MESSAGES_KEY, JSON.stringify(messages));
      } catch {
        // quota exceeded or private mode
      }
    }
  }, [messages]);

  // Save model & role
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_MODEL_KEY, selectedModel);
      localStorage.setItem(STORAGE_ROLE_KEY, selectedRole);
    }
  }, [selectedModel, selectedRole]);

  // Handle pre-seeded initialContext
  useEffect(() => {
    if (isOpen && initialContext && initialContext.initialPrompt) {
      setInput(initialContext.initialPrompt);
      if (inputRef.current) {
        inputRef.current.focus();
      }
    }
  }, [isOpen, initialContext]);

  // Scroll to bottom on new messages
  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isLoading, isOpen]);

  // Focus input on open
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 150);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const currentRolePreset = ROLE_PRESETS.find(r => r.id === selectedRole);
  const activeSystemInstruction = selectedRole === 'custom'
    ? (customInstruction.trim() || 'You are a helpful AI assistant.')
    : (currentRolePreset?.systemInstruction || 'You are a helpful AI assistant.');

  const handleSendMessage = async (textToSend?: string) => {
    const messageContent = (textToSend || input).trim();
    if (!messageContent || isLoading) return;

    const userMessage: ChatMessage = {
      id: 'msg_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7) + '_u',
      role: 'user',
      content: messageContent,
      timestamp: Date.now(),
    };

    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInput('');
    setErrorMessage(null);
    setIsLoading(true);

    try {
      const response = await fetch('/api/gemini/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: newMessages.map(m => ({
            role: m.role,
            content: m.content,
          })),
          model: selectedModel,
          systemInstruction: activeSystemInstruction,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to get response from Gemini AI');
      }

      const modelMessage: ChatMessage = {
        id: 'msg_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7) + '_m',
        role: 'model',
        content: data.reply || 'No response content returned.',
        timestamp: Date.now(),
        modelUsed: data.modelUsed || selectedModel,
      };

      setMessages(prev => [...prev, modelMessage]);
    } catch (err: any) {
      console.error('Chat error:', err);
      const errorMsg = err.message || 'Error communicating with Gemini service';
      setErrorMessage(errorMsg);
      const errorChatMsg: ChatMessage = {
        id: 'msg_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7) + '_err',
        role: 'model',
        content: lang === 'ur'
          ? `⚠️ معذرت، رابطہ قائم کرنے میں مسئلہ آیا: ${errorMsg}\nبراہ کرم دوبارہ کوشش کریں یا ماڈل تبدیل کریں۔`
          : `⚠️ Sorry, there was an issue communicating with Gemini: ${errorMsg}\nPlease try again or switch model.`,
        timestamp: Date.now(),
        isError: true,
      };
      setMessages(prev => [...prev, errorChatMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleClearChat = () => {
    if (confirm(lang === 'ur' ? 'کیا آپ تمام چیٹ ہسٹری صاف کرنا چاہتے ہیں؟' : 'Are you sure you want to clear this conversation?')) {
      setMessages([]);
      localStorage.removeItem(STORAGE_MESSAGES_KEY);
      setErrorMessage(null);
    }
  };

  const handleCopyText = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const isLight = theme === 'light';

  return (
    <div
      className={`fixed inset-0 z-50 w-screen h-screen flex flex-col overflow-hidden pb-16 animate-fade-in ${
        isLight ? 'bg-white text-slate-900' : 'bg-[#121212] text-slate-100'
      }`}
      dir={lang === 'ur' ? 'rtl' : 'ltr'}
      id="fullscreen-gemini-chat-page"
    >
      {/* Minimal Clean Top Header */}
      <div
        className={`px-4 py-2.5 sm:px-6 flex items-center justify-between border-b border-rose-500/30 shrink-0 ${
          isLight ? 'bg-white text-slate-900' : 'bg-[#161622] text-white'
        }`}
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-purple-600 flex items-center justify-center text-white shadow-md shadow-indigo-500/20 shrink-0">
            <Sparkles className="w-4 h-4" />
          </div>
          <h3 className="font-black text-sm sm:text-base truncate">
            {lang === 'ur' ? 'جیمنائی اے آئی چیٹ (Gemini AI Chat)' : 'Gemini AI Chat'}
          </h3>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {messages.length > 0 && (
            <button
              type="button"
              onClick={handleClearChat}
              title={t.geminiClearChat}
              id="gemini-clear-chat-btn"
              className="p-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-xs transition-colors cursor-pointer"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
          <button
            type="button"
            onClick={onClose}
            id="close-gemini-chat-btn"
            title={t.close}
            className="p-2 rounded-xl bg-gradient-to-r from-rose-600 to-pink-600 hover:from-rose-500 hover:to-pink-500 text-white shadow-xs transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Full-Screen Scrollable Chat Canvas (Clean & Uncluttered) */}
      <div className="flex-1 overflow-y-auto overscroll-contain px-3 sm:px-6 py-4 space-y-4 max-w-4xl w-full mx-auto">
        {messages.length === 0 && (
          <div className="h-full min-h-[55vh] flex flex-col items-center justify-center text-center px-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-purple-600 flex items-center justify-center text-white shadow-lg shadow-indigo-500/20 mb-3">
              <Sparkles className="w-7 h-7" />
            </div>
            <h4 className="text-base sm:text-lg font-extrabold">
              {lang === 'ur' ? 'جیمنائی اے آئی کے ساتھ بات چیت شروع کریں' : 'Start chatting with Gemini AI'}
            </h4>
            <p className="text-xs sm:text-sm text-slate-400 mt-1 max-w-md">
              {lang === 'ur'
                ? 'نیچے اپنا سوال یا پیغام لکھیں — پورا صفحہ صرف آپ کی چیٹنگ کے لیے حاضر ہے۔'
                : 'Type your message below — full-screen distraction-free chat.'}
            </p>
          </div>
        )}

        {/* Conversation Thread */}
        {messages.map((message, index) => {
          const isUser = message.role === 'user';
          return (
            <div
              key={`${message.id || 'msg'}_${index}`}
              className={`flex gap-2.5 sm:gap-3 ${isUser ? 'justify-end' : 'justify-start'}`}
            >
              {!isUser && (
                <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 flex-shrink-0 flex items-center justify-center text-white shadow-sm mt-1">
                  <Sparkles className="w-4 h-4" />
                </div>
              )}

              <div
                className={`max-w-[86%] sm:max-w-[78%] rounded-2xl px-4 py-3 shadow-xs relative group ${
                  isUser
                    ? 'bg-blue-600 text-white rounded-tr-none'
                    : message.isError
                    ? 'bg-red-500/10 border border-red-500/20 text-red-500 dark:text-red-400 rounded-tl-none'
                    : isLight
                    ? 'bg-white text-slate-800 border border-slate-200 rounded-tl-none'
                    : 'bg-[#1e1e2e] text-slate-100 border border-white/10 rounded-tl-none'
                }`}
              >
                <div className="text-sm leading-relaxed whitespace-pre-wrap select-text font-sans">
                  {message.content}
                </div>

                {!isUser && !message.isError && (
                  <div className="mt-2 pt-1.5 flex items-center justify-between border-t border-white/10 text-xs">
                    <button
                      type="button"
                      onClick={() => handleCopyText(message.id, message.content)}
                      className="inline-flex items-center gap-1 text-slate-400 hover:text-white transition-colors cursor-pointer"
                      title={lang === 'ur' ? 'کاپی کریں' : 'Copy'}
                    >
                      {copiedId === message.id ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-400" />
                          <span className="text-emerald-400 text-[11px] font-medium">{t.copied}</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" />
                          <span className="text-[11px]">{lang === 'ur' ? 'کاپی کریں' : 'Copy'}</span>
                        </>
                      )}
                    </button>

                    <span className="text-[10px] text-slate-400">
                      {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                )}
              </div>

              {isUser && (
                <div className="w-8 h-8 rounded-full bg-slate-700 flex-shrink-0 flex items-center justify-center text-slate-200 shadow-sm mt-1">
                  <UserIcon className="w-4 h-4" />
                </div>
              )}
            </div>
          );
        })}

        {/* Loading Indicator */}
        {isLoading && (
          <div className="flex gap-3 justify-start animate-fade-in">
            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 flex-shrink-0 flex items-center justify-center text-white shadow-sm mt-1 animate-pulse">
              <Sparkles className="w-4 h-4" />
            </div>
            <div
              className={`p-3.5 rounded-2xl rounded-tl-none border shadow-xs ${
                isLight ? 'bg-white border-slate-200 text-slate-800' : 'bg-[#1e1e2e] border-white/10 text-slate-200'
              }`}
            >
              <div className="flex items-center gap-2 text-xs text-slate-400">
                <div className="flex gap-1">
                  <span className="w-2 h-2 rounded-full bg-blue-500 animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="w-2 h-2 rounded-full bg-indigo-500 animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="w-2 h-2 rounded-full bg-purple-500 animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
                <span>{t.geminiThinking}</span>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Clean Bottom Message Input Bar */}
      <div
        className={`p-3 sm:p-4 border-t shrink-0 ${
          isLight ? 'border-slate-200 bg-white' : 'border-white/10 bg-[#161622]'
        }`}
      >
        <div className="max-w-4xl mx-auto relative flex items-end gap-2">
          <textarea
            ref={inputRef}
            rows={1}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={t.geminiTypePlaceholder}
            disabled={isLoading}
            id="gemini-chat-input"
            className={`w-full resize-none px-3.5 py-3 text-sm rounded-2xl border transition-all outline-hidden focus:ring-2 focus:ring-blue-500/50 ${
              isLight
                ? 'bg-slate-50 border-slate-300 text-slate-900 placeholder-slate-400'
                : 'bg-[#1e1e2e] border-white/10 text-white placeholder-slate-400'
            }`}
          />
          <button
            type="button"
            onClick={() => handleSendMessage()}
            disabled={!input.trim() || isLoading}
            id="gemini-chat-send-btn"
            className={`p-3 rounded-2xl flex-shrink-0 font-medium transition-all flex items-center justify-center cursor-pointer ${
              !input.trim() || isLoading
                ? 'bg-slate-700/50 text-slate-500 cursor-not-allowed'
                : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white shadow-md shadow-blue-500/20 active:scale-95'
            }`}
            title={lang === 'ur' ? 'بھیجیں' : 'Send'}
          >
            <Send className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
};
