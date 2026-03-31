import React from 'react';
import {
  ArrowLeft,
  HelpCircle,
  Heart,
  Volume2,
  VolumeX,
} from 'lucide-react';

type WrapperProps = {
  children: React.ReactNode;
  className?: string;
};

type GameUiShellProps = WrapperProps & {
  backgroundImage?: string;
};

type ButtonProps = {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
  disabled?: boolean;
  type?: 'button' | 'submit' | 'reset';
};

type IconButtonProps = {
  icon: React.ReactNode;
  label: string;
  onClick?: () => void;
  disabled?: boolean;
};

type FeedbackTone = 'neutral' | 'success' | 'warning';

type GameTopBarProps = {
  onBack: () => void;
  progressLabel?: string;
  lives?: number;
  audioEnabled?: boolean;
  onToggleAudio?: () => void;
  onHelp?: () => void;
  className?: string;
};

export const GAME_UI_TOKENS = {
  spacing: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
  },
  radius: {
    sm: 12,
    md: 16,
    lg: 24,
    xl: 32,
    full: 999,
  },
  buttonHeights: {
    icon: 48,
    secondary: 54,
    primary: 62,
  },
};

const cn = (...parts: Array<string | false | null | undefined>) => parts.filter(Boolean).join(' ');

export const IconButton: React.FC<IconButtonProps> = ({ icon, label, onClick, disabled }) => (
  <button
    type="button"
    onClick={onClick}
    disabled={disabled}
    aria-label={label}
    className={cn(
      'inline-flex h-12 w-12 items-center justify-center rounded-full border border-white/20',
      'bg-white/10 text-white shadow-[0_10px_20px_rgba(15,23,42,0.28)]',
      'transition active:translate-y-[1px] disabled:cursor-not-allowed disabled:opacity-60',
    )}
  >
    {icon}
  </button>
);

export const GameUiShell: React.FC<GameUiShellProps> = ({ children, className, backgroundImage }) => (
  <div
    className={cn(
      'relative flex h-full w-full flex-col overflow-hidden bg-[radial-gradient(circle_at_top,#0f172a_0%,#0b1224_45%,#050914_100%)]',
      className,
    )}
  >
    {backgroundImage ? (
      <div
        className="pointer-events-none absolute inset-0 bg-cover bg-center opacity-[0.5]"
        style={{ backgroundImage: `url(${backgroundImage})` }}
      />
    ) : null}
    <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(2,6,23,0.4),rgba(2,6,23,0.75))]" />
    <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(59,130,246,0.18),rgba(59,130,246,0)_45%)]" />
    <div className="relative z-10 flex h-full min-h-0 flex-col">
      {children}
    </div>
  </div>
);

export const PrimaryButton: React.FC<ButtonProps> = ({ children, className, onClick, disabled, type = 'button' }) => (
  <button
    type={type}
    onClick={onClick}
    disabled={disabled}
    className={cn(
      'inline-flex h-[62px] w-full items-center justify-center gap-2 rounded-[2rem] border',
      'border-cyan-100/80 bg-[linear-gradient(180deg,#5b96ff_0%,#2f67ec_62%,#204bc7_100%)]',
      'px-5 text-[clamp(15px,2.2vh,20px)] font-black tracking-[0.01em] text-white shadow-[0_16px_28px_rgba(37,99,235,0.4)]',
      'transition disabled:cursor-not-allowed disabled:opacity-60',
      className,
    )}
  >
    {children}
  </button>
);

export const SecondaryButton: React.FC<ButtonProps> = ({ children, className, onClick, disabled, type = 'button' }) => (
  <button
    type={type}
    onClick={onClick}
    disabled={disabled}
    className={cn(
      'inline-flex h-[54px] items-center justify-center rounded-[1.6rem] border border-white/20',
      'bg-white/5 px-4 text-[11px] font-black uppercase tracking-[0.1em] text-cyan-100/90',
      'transition disabled:cursor-not-allowed disabled:opacity-50',
      className,
    )}
  >
    {children}
  </button>
);

export const StoryCard: React.FC<WrapperProps> = ({ children, className }) => (
  <div
    className={cn(
      'rounded-[1.5rem] border border-white/12 bg-slate-950/24 px-4 py-2 text-center shadow-[0_12px_24px_rgba(15,23,42,0.18)]',
      'backdrop-blur-[2px]',
      className,
    )}
  >
    {children}
  </div>
);

export const TaskCard: React.FC<WrapperProps> = ({ children, className }) => (
  <div
    className={cn(
      'rounded-[1.5rem] border border-amber-200/35 bg-[#f7f1e3] px-4 py-3 text-slate-900 shadow-[0_14px_26px_rgba(15,23,42,0.2)]',
      className,
    )}
  >
    {children}
  </div>
);

export const FeedbackStrip: React.FC<{ tone?: FeedbackTone; children: React.ReactNode; className?: string }> = ({
  tone = 'neutral',
  children,
  className,
}) => (
  <div
    className={cn(
      'rounded-full border px-4 py-2 text-center text-sm font-black shadow-[0_10px_18px_rgba(15,23,42,0.22)]',
      tone === 'success'
        ? 'border-emerald-200/50 bg-emerald-500/24 text-emerald-50'
        : tone === 'warning'
          ? 'border-amber-200/50 bg-amber-300/20 text-amber-100'
          : 'border-cyan-100/20 bg-slate-950/35 text-cyan-100',
      className,
    )}
  >
    {children}
  </div>
);

export const GameTopBar: React.FC<GameTopBarProps> = ({
  onBack,
  progressLabel,
  lives,
  audioEnabled,
  onToggleAudio,
  onHelp,
  className,
}) => (
  <div className={cn('flex items-center justify-between gap-2', className)}>
    <div className="flex items-center gap-2">
      <IconButton icon={<ArrowLeft className="h-5 w-5" />} label="Back" onClick={onBack} />
      {progressLabel ? (
        <div className="inline-flex h-10 items-center rounded-full border border-white/20 bg-white/10 px-3 text-xs font-black uppercase tracking-[0.1em] text-white">
          {progressLabel}
        </div>
      ) : null}
    </div>
    <div className="flex items-center gap-2">
      {typeof lives === 'number' ? (
        <div className="inline-flex h-10 items-center gap-1.5 rounded-full border border-white/20 bg-white/10 px-3 text-xs font-black uppercase tracking-[0.1em] text-white">
          <Heart className="h-4 w-4 text-rose-200" />
          {lives}
        </div>
      ) : null}
      <IconButton
        icon={audioEnabled === false ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
        label="Audio"
        onClick={onToggleAudio}
        disabled={!onToggleAudio}
      />
      <IconButton
        icon={<HelpCircle className="h-5 w-5" />}
        label="Help"
        onClick={onHelp}
        disabled={!onHelp}
      />
    </div>
  </div>
);
