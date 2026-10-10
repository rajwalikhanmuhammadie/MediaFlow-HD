import React from 'react';
import { Language, Theme } from '../types';

export type BackgroundPalette = 'aurora' | 'sunset' | 'cyber' | 'emerald';

interface ColorfulBackgroundProps {
  lang: Language;
  theme?: Theme;
  onPaletteChange?: (palette: BackgroundPalette) => void;
}

export interface ThemeMeta {
  id: Theme;
  nameUr: string;
  nameEn: string;
  descUr: string;
  descEn: string;
  dots: [string, string, string];
  bgGradient: string;
  drawerGradient: string;
  drawerHeaderBg: string;
  accentBorder: string;
  accentText: string;
  activeBtnClass: string;
}

export const APP_THEMES: ThemeMeta[] = [
  {
    id: 'dark',
    nameUr: 'سائبر بلیو (Cyber Blue)',
    nameEn: 'Cyber Dark Blue',
    descUr: 'ڈیپ نیوی بلیو اور نیون اسکائی گلو',
    descEn: 'Deep navy slate with electric sky glow',
    dots: ['#0b0f19', '#2563eb', '#38bdf8'],
    bgGradient: 'linear-gradient(145deg, #0b0f19 0%, #11192c 50%, #1a233a 100%)',
    drawerGradient: 'from-[#0b0f19] via-[#11192c] to-[#1a233a]',
    drawerHeaderBg: 'bg-[#0f172a]/90 border-sky-400/20',
    accentBorder: 'border-sky-400/30',
    accentText: 'text-[#38bdf8]',
    activeBtnClass: 'bg-gradient-to-r from-[#2563eb] to-[#0284c7] text-white border-sky-300/50 shadow-[0_0_14px_rgba(56,189,248,0.45)]',
  },
  {
    id: 'crimson',
    nameUr: 'کریمسن نیون (Crimson)',
    nameEn: 'Crimson Neon',
    descUr: 'گہرا روبی ریڈ اور نیون گلابی تھیم',
    descEn: 'Deep ruby obsidian with neon rose accents',
    dots: ['#16070d', '#e11d48', '#fb7185'],
    bgGradient: 'linear-gradient(145deg, #12060b 0%, #210b15 50%, #2e101e 100%)',
    drawerGradient: 'from-[#12060b] via-[#1f0a14] to-[#2c0f1d]',
    drawerHeaderBg: 'bg-[#1a0811]/90 border-rose-500/25',
    accentBorder: 'border-rose-500/35',
    accentText: 'text-rose-400',
    activeBtnClass: 'bg-gradient-to-r from-[#e11d48] to-[#f43f5e] text-white border-rose-300/50 shadow-[0_0_14px_rgba(244,63,94,0.45)]',
  },
  {
    id: 'emerald',
    nameUr: 'ایمرالڈ گرین (Emerald)',
    nameEn: 'Emerald Matrix',
    descUr: 'ڈارک فاریسٹ گرین اور سائبر ٹیل گلو',
    descEn: 'Dark forest matrix with cyber emerald glow',
    dots: ['#05140f', '#10b981', '#34d399'],
    bgGradient: 'linear-gradient(145deg, #04120d 0%, #082219 50%, #0d3125 100%)',
    drawerGradient: 'from-[#04120d] via-[#082219] to-[#0d3125]',
    drawerHeaderBg: 'bg-[#061a13]/90 border-emerald-400/25',
    accentBorder: 'border-emerald-400/35',
    accentText: 'text-emerald-400',
    activeBtnClass: 'bg-gradient-to-r from-emerald-600 to-teal-500 text-white border-emerald-300/50 shadow-[0_0_14px_rgba(16,185,129,0.45)]',
  },
  {
    id: 'sunset',
    nameUr: 'رائل سن سیٹ (Royal Gold)',
    nameEn: 'Royal Amethyst',
    descUr: 'شاہی پرپل اور گولڈن سن سیٹ تھیم',
    descEn: 'Royal violet dusk with warm amber highlights',
    dots: ['#130921', '#8b5cf6', '#f59e0b'],
    bgGradient: 'linear-gradient(145deg, #11081f 0%, #1d1033 50%, #2a1548 100%)',
    drawerGradient: 'from-[#11081f] via-[#1d1033] to-[#2a1548]',
    drawerHeaderBg: 'bg-[#170c29]/90 border-violet-400/25',
    accentBorder: 'border-violet-400/35',
    accentText: 'text-violet-300',
    activeBtnClass: 'bg-gradient-to-r from-violet-600 via-fuchsia-600 to-amber-500 text-white border-violet-300/50 shadow-[0_0_14px_rgba(139,92,246,0.45)]',
  },
  {
    id: 'amoled',
    nameUr: 'ایمولیڈ بلیک (AMOLED)',
    nameEn: 'AMOLED Pitch Black',
    descUr: 'مکمل سیاہ بیٹری سیور ہائی کنٹراسٹ',
    descEn: 'True pitch black OLED contrast mode',
    dots: ['#000000', '#06b6d4', '#f43f5e'],
    bgGradient: 'linear-gradient(145deg, #000000 0%, #040407 55%, #090910 100%)',
    drawerGradient: 'from-[#000000] via-[#050508] to-[#0b0b12]',
    drawerHeaderBg: 'bg-black/95 border-cyan-400/25',
    accentBorder: 'border-cyan-400/30',
    accentText: 'text-cyan-400',
    activeBtnClass: 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white border-cyan-300/50 shadow-[0_0_14px_rgba(6,182,212,0.45)]',
  },
  {
    id: 'light',
    nameUr: 'سفید تھیم (Pure White)',
    nameEn: 'Pure White Theme',
    descUr: 'مکمل سفید بیک گراؤنڈ اور انٹرفیس، صرف بٹن رنگین',
    descEn: '100% pure white background & interface with colorful buttons',
    dots: ['#ffffff', '#e11d48', '#2563eb'],
    bgGradient: '#ffffff',
    drawerGradient: 'from-white via-white to-white',
    drawerHeaderBg: 'bg-white border-rose-500/25',
    accentBorder: 'border-rose-500/30',
    accentText: 'text-rose-600',
    activeBtnClass: 'bg-gradient-to-r from-rose-600 to-blue-600 text-white border-rose-300/50 shadow-[0_0_14px_rgba(225,29,72,0.35)]',
  },
];

export const PALETTES = [
  {
    id: 'aurora' as BackgroundPalette,
    nameUr: 'ڈیپ سائبر بلیو (Dark Blue)',
    nameEn: 'Deep Cyber Blue',
    dots: ['#2563eb', '#38bdf8', '#0284c7'],
  },
  {
    id: 'cyber' as BackgroundPalette,
    nameUr: 'سائبر نیون (Cyber)',
    nameEn: 'Cyber Neon',
    dots: ['#06b6d4', '#3b82f6', '#10b981'],
  },
];

export const ColorfulBackground: React.FC<ColorfulBackgroundProps> = ({ theme = 'dark' }) => {
  const activeMeta = APP_THEMES.find((t) => t.id === theme) || APP_THEMES[0];

  if (theme === 'light') {
    return (
      <div
        className="fixed inset-0 pointer-events-none z-0 bg-[#f8fafc] transition-colors duration-200"
        aria-hidden="true"
      />
    );
  }

  return (
    <div
      className="fixed inset-0 pointer-events-none z-0 overflow-hidden select-none transition-colors duration-300"
      style={{
        background: activeMeta.bgGradient,
      }}
      aria-hidden="true"
    />
  );
};
