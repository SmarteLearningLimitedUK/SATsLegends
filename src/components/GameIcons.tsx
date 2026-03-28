import React from 'react';
import AssetIcon from './AssetIcon';
import type { AssetIconName } from './AssetIcon';

interface IconProps {
  className?: string;
  size?: number;
}

const frameStyle = {
  filter: 'drop-shadow(0 2px 0 rgba(74,44,23,0.35))',
} as const;

const ImageIcon: React.FC<{name: AssetIconName; className?: string; rotate?: number; size?: number}> = ({ name, className = 'w-5 h-5', rotate = 0, size }) => (
  <span className={`inline-flex items-center justify-center ${className}`} style={{ transform: rotate ? `rotate(${rotate}deg)` : undefined, width: size, height: size }}>
    <AssetIcon name={name} className="w-full h-full" />
  </span>
);

const ThemedSvg: React.FC<IconProps & { children: React.ReactNode; viewBox?: string }> = ({ className = 'w-5 h-5', size, children, viewBox = '0 0 64 64' }) => (
  <span className={`inline-flex items-center justify-center ${className}`} style={{ width: size, height: size }}>
    <svg viewBox={viewBox} className="w-full h-full" aria-hidden="true" style={frameStyle}>
      {children}
    </svg>
  </span>
);

const starName = (className='') => /fill-|text-(yellow|amber|orange)/.test(className) ? 'star' : 'starOutline';
const heartName = (className='') => /(fill-|text-red|text-pink)/.test(className) ? 'heart' : 'heartOutline';

const brown = '#5c3a1e';
const dark = '#3d2312';
const gold = '#f2b705';
const brass = '#d49a24';
const wood = '#9c6437';
const woodDark = '#7a4b28';
const teal = '#3cc7c4';
const blue = '#58b8ff';
const red = '#e54b4b';
const ember = '#ff8a2a';
const cream = '#f8edd6';
const green = '#63c66d';

export const Home: React.FC<IconProps> = ({ className, size }) => <ImageIcon name="home" className={className} size={size} />;
export const HelpCircle: React.FC<IconProps> = ({ className, size }) => <ImageIcon name="question" className={className} size={size} />;
export const Star: React.FC<IconProps> = ({ className, size }) => <ImageIcon name={starName(className)} className={className} size={size} />;
export const Timer: React.FC<IconProps> = ({ className, size }) => <ImageIcon name="timer" className={className} size={size} />;
export const Target: React.FC<IconProps> = ({ className, size }) => <ImageIcon name="medal" className={className} size={size} />;
export const Check: React.FC<IconProps> = ({ className, size }) => <ImageIcon name="check" className={className} size={size} />;
export const X: React.FC<IconProps> = ({ className, size }) => <ImageIcon name="x" className={className} size={size} />;

export const Key: React.FC<IconProps> = ({ className, size }) => (
  <ThemedSvg className={className} size={size}>
    <circle cx="20" cy="30" r="10" fill={gold} stroke={brown} strokeWidth="4" />
    <circle cx="20" cy="30" r="4" fill={cream} opacity="0.85" />
    <path d="M28 30h18v6h-4v6h-6v-6h-8z" fill={brass} stroke={brown} strokeWidth="4" strokeLinejoin="round" />
  </ThemedSvg>
);

export const Lock: React.FC<IconProps> = ({ className, size }) => (
  <ThemedSvg className={className} size={size}>
    <rect x="14" y="28" width="36" height="24" rx="6" fill={gold} stroke={brown} strokeWidth="4" />
    <path d="M22 28v-6c0-6 4-10 10-10s10 4 10 10v6" fill="none" stroke={brown} strokeWidth="4" strokeLinecap="round" />
    <circle cx="32" cy="40" r="4" fill={brown} />
  </ThemedSvg>
);

export const Unlock: React.FC<IconProps> = ({ className, size }) => (
  <ThemedSvg className={className} size={size}>
    <rect x="14" y="28" width="36" height="24" rx="6" fill={green} stroke={brown} strokeWidth="4" />
    <path d="M24 28v-4c0-7 4-12 10-12 5 0 8 2 10 6" fill="none" stroke={brown} strokeWidth="4" strokeLinecap="round" />
    <path d="M25 40l5 5 10-12" fill="none" stroke={cream} strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
  </ThemedSvg>
);

export const Flame: React.FC<IconProps> = ({ className, size }) => (
  <ThemedSvg className={className} size={size}>
    <path d="M34 10c4 7 8 10 8 18 0 9-6 16-14 16s-14-6-14-14c0-8 6-13 11-18 1 4 2 7 5 10 0-4 2-8 4-12z" fill={ember} stroke={brown} strokeWidth="4" strokeLinejoin="round" />
    <path d="M30 25c3 4 4 6 4 9a7 7 0 1 1-14 0c0-3 2-6 5-9 1 2 2 4 5 5z" fill={gold} opacity="0.95" />
  </ThemedSvg>
);

export const Hammer: React.FC<IconProps> = ({ className, size }) => <ImageIcon name="gear" className={className} size={size} />;
export const Coins: React.FC<IconProps> = ({ className, size }) => <ImageIcon name="coin" className={className} size={size} />;
export const Store: React.FC<IconProps> = ({ className, size }) => <ImageIcon name="coin" className={className} size={size} />;
export const RotateCcw: React.FC<IconProps> = ({ className, size }) => <ImageIcon name="refresh" className={className} size={size} />;
export const CheckCircle2: React.FC<IconProps> = ({ className, size }) => <ImageIcon name="check" className={className} size={size} />;

export const FlaskConical: React.FC<IconProps> = ({ className, size }) => (
  <ThemedSvg className={className} size={size}>
    <path d="M26 10h12" stroke={brown} strokeWidth="4" strokeLinecap="round" />
    <path d="M29 10v12l-10 17a7 7 0 0 0 6 11h14a7 7 0 0 0 6-11L35 22V10" fill={blue} stroke={brown} strokeWidth="4" strokeLinejoin="round" />
    <path d="M22 40c4-3 6-3 10 0s6 3 10 0" fill="none" stroke={cream} strokeWidth="3" opacity="0.9" />
    <circle cx="28" cy="34" r="2.2" fill={cream} />
    <circle cx="36" cy="29" r="2" fill={cream} />
  </ThemedSvg>
);

export const Beaker: React.FC<IconProps> = ({ className, size }) => (
  <ThemedSvg className={className} size={size}>
    <path d="M22 12h20" stroke={brown} strokeWidth="4" strokeLinecap="round" />
    <path d="M24 12v7l-8 20a7 7 0 0 0 7 9h18a7 7 0 0 0 7-9l-8-20v-7" fill={teal} stroke={brown} strokeWidth="4" strokeLinejoin="round" />
    <path d="M20 35h24" stroke={cream} strokeWidth="3" opacity="0.8" />
    <circle cx="26" cy="30" r="2" fill={cream} />
    <circle cx="35" cy="38" r="2" fill={cream} />
  </ThemedSvg>
);

export const Droplets: React.FC<IconProps> = ({ className, size }) => (
  <ThemedSvg className={className} size={size}>
    <path d="M24 18c5 6 8 11 8 16a8 8 0 1 1-16 0c0-5 3-10 8-16z" fill={blue} stroke={brown} strokeWidth="4" />
    <path d="M42 24c4 5 6 8 6 12a6 6 0 1 1-12 0c0-4 2-7 6-12z" fill={teal} stroke={brown} strokeWidth="4" />
  </ThemedSvg>
);

export const Crosshair: React.FC<IconProps> = ({ className, size }) => (
  <ThemedSvg className={className} size={size}>
    <circle cx="32" cy="32" r="14" fill="none" stroke={brown} strokeWidth="4" />
    <circle cx="32" cy="32" r="5" fill={red} stroke={brown} strokeWidth="3" />
    <path d="M32 10v8M32 46v8M10 32h8M46 32h8" stroke={brown} strokeWidth="4" strokeLinecap="round" />
  </ThemedSvg>
);

export const Anchor: React.FC<IconProps> = ({ className, size }) => (
  <ThemedSvg className={className} size={size}>
    <circle cx="32" cy="12" r="5" fill={gold} stroke={brown} strokeWidth="4" />
    <path d="M32 17v24" stroke={brown} strokeWidth="5" strokeLinecap="round" />
    <path d="M20 28h24" stroke={brown} strokeWidth="5" strokeLinecap="round" />
    <path d="M16 30c0 10 7 18 16 18s16-8 16-18" fill="none" stroke={brown} strokeWidth="5" strokeLinecap="round" />
  </ThemedSvg>
);

export const Bomb: React.FC<IconProps> = ({ className, size }) => (
  <ThemedSvg className={className} size={size}>
    <circle cx="30" cy="34" r="14" fill={dark} stroke={brown} strokeWidth="4" />
    <path d="M34 18l4-5 7 3-6 7" fill={gold} stroke={brown} strokeWidth="4" strokeLinejoin="round" />
    <path d="M45 12c3 0 5 2 5 5" fill="none" stroke={ember} strokeWidth="4" strokeLinecap="round" />
  </ThemedSvg>
);

export const ArrowRightLeft: React.FC<IconProps> = ({ className, size }) => (
  <ThemedSvg className={className} size={size}>
    <path d="M14 22h30" stroke={brown} strokeWidth="5" strokeLinecap="round" />
    <path d="M36 14l10 8-10 8" fill={gold} stroke={brown} strokeWidth="4" strokeLinejoin="round" />
    <path d="M50 42H20" stroke={brown} strokeWidth="5" strokeLinecap="round" />
    <path d="M28 34l-10 8 10 8" fill={gold} stroke={brown} strokeWidth="4" strokeLinejoin="round" />
  </ThemedSvg>
);

export const ArrowUpDown: React.FC<IconProps> = ({ className, size }) => (
  <ThemedSvg className={className} size={size}>
    <path d="M32 12v40" stroke={brown} strokeWidth="5" strokeLinecap="round" />
    <path d="M22 22l10-10 10 10" fill={gold} stroke={brown} strokeWidth="4" strokeLinejoin="round" />
    <path d="M22 42l10 10 10-10" fill={gold} stroke={brown} strokeWidth="4" strokeLinejoin="round" />
  </ThemedSvg>
);

export const Clock: React.FC<IconProps> = ({ className, size }) => <ImageIcon name="stopwatch" className={className} size={size} />;
export const Hourglass: React.FC<IconProps> = ({ className, size }) => <ImageIcon name="timer" className={className} size={size} />;

export const Castle: React.FC<IconProps> = ({ className, size }) => (
  <ThemedSvg className={className} size={size}>
    <path d="M14 20h36v28H14z" fill="#9ca3af" stroke={brown} strokeWidth="4" />
    <path d="M18 16h8v8h-8zM38 16h8v8h-8z" fill="#9ca3af" stroke={brown} strokeWidth="4" />
    <path d="M28 34c0-4 2-7 4-7s4 3 4 7v14h-8z" fill={woodDark} stroke={brown} strokeWidth="4" />
    <path d="M14 26l18-12 18 12" fill={gold} stroke={brown} strokeWidth="4" strokeLinejoin="round" />
  </ThemedSvg>
);

export const ChevronRight: React.FC<IconProps> = ({ className, size }) => <ImageIcon name="play" className={className} size={size} />;
export const ChevronLeft: React.FC<IconProps> = ({ className, size }) => <ImageIcon name="back" className={className} size={size} />;
export const Trophy: React.FC<IconProps> = ({ className, size }) => <ImageIcon name="trophy" className={className} size={size} />;
export const RefreshCw: React.FC<IconProps> = ({ className, size }) => <ImageIcon name="refresh" className={className} size={size} />;
export const XCircle: React.FC<IconProps> = ({ className, size }) => <ImageIcon name="x" className={className} size={size} />;

export const Lightbulb: React.FC<IconProps> = ({ className, size }) => (
  <ThemedSvg className={className} size={size}>
    <path d="M32 12c-8 0-14 6-14 13 0 4 2 7 5 10 2 2 3 4 3 7h12c0-3 1-5 3-7 3-3 5-6 5-10 0-7-6-13-14-13z" fill={gold} stroke={brown} strokeWidth="4" />
    <path d="M26 44h12v4a4 4 0 0 1-4 4h-4a4 4 0 0 1-4-4z" fill={wood} stroke={brown} strokeWidth="4" />
    <path d="M32 18v8M27 23h10" stroke={cream} strokeWidth="3" strokeLinecap="round" />
  </ThemedSvg>
);

export const ArrowLeft: React.FC<IconProps> = ({ className, size }) => <ImageIcon name="back" className={className} size={size} />;
export const ArrowRight: React.FC<IconProps> = ({ className, size }) => <ImageIcon name="play" className={className} size={size} />;
export const Heart: React.FC<IconProps> = ({ className, size }) => <ImageIcon name={heartName(className)} className={className} size={size} />;
export const RotateCw: React.FC<IconProps> = ({ className, size }) => <ImageIcon name="refresh" className={className} rotate={180} size={size} />;
export const FlipHorizontal: React.FC<IconProps> = ({ className, size }) => <ImageIcon name="refresh" className={className} rotate={45} size={size} />;
export const Sparkles: React.FC<IconProps> = ({ className, size }) => <ImageIcon name="gem" className={className} size={size} />;
