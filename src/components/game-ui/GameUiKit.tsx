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
  overlayDisabled?: boolean;
  backgroundOpacity?: number;
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
    icon: 44,
    secondary: 48,
    primary: 56,
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
      'ui-icon-button inline-flex h-11 w-11 items-center justify-center rounded-full border border-white/20',
      'bg-white/10 text-white shadow-[0_10px_20px_rgba(15,23,42,0.28)]',
      'transition active:translate-y-[1px] disabled:cursor-not-allowed disabled:opacity-60',
    )}
  >
    {icon}
  </button>
);

export const GameUiShell: React.FC<GameUiShellProps> = ({
  children,
  className,
  backgroundImage,
  overlayDisabled = false,
  backgroundOpacity = 0.5,
}) => (
  <div
    className={cn(
      'relative flex h-full w-full flex-col overflow-hidden',
      typeof document !== 'undefined' && document.querySelector('[data-gameplay-content-viewport="true"]') && !backgroundImage
        ? 'bg-transparent'
        : 'bg-[radial-gradient(circle_at_top,#0f172a_0%,#0b1224_45%,#050914_100%)]',
      className,
    )}
  >
    {backgroundImage ? (
      <div
        className="pointer-events-none absolute inset-0 bg-cover bg-center"
        style={{ backgroundImage: `url(${backgroundImage})`, opacity: backgroundOpacity }}
      />
    ) : null}
    {overlayDisabled ? null : (
      (!backgroundImage && typeof document !== 'undefined' && document.querySelector('[data-gameplay-content-viewport="true"]'))
        ? null
        : (
          <>
            <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(2,6,23,0.18),rgba(2,6,23,0.38))]" />
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(59,130,246,0.12),rgba(59,130,246,0)_55%)]" />
          </>
        )
    )}
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
      'ui-button-primary inline-flex h-[56px] w-full items-center justify-center gap-2 rounded-[1.8rem] border',
      'px-4 text-[clamp(14px,2vh,18px)] font-black tracking-[0.01em]',
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
      'ui-button-secondary inline-flex h-[48px] items-center justify-center rounded-[1.4rem] border',
      'px-3 text-[10px] font-black uppercase tracking-[0.1em]',
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
      'licensed-game-card mission-panel-shell rounded-[1.1rem] px-3 py-2 text-center text-slate-100',
      className,
    )}
  >
    {children}
  </div>
);

export const TaskCard: React.FC<WrapperProps> = ({ children, className }) => (
  <div
    className={cn(
      'licensed-game-card mission-panel-shell rounded-[1.1rem] px-3 py-2.5 text-slate-100',
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
      'licensed-game-card mission-panel-shell rounded-[1.1rem] border px-3 py-2 text-center text-[13px] font-black shadow-[0_10px_18px_rgba(15,23,42,0.22)]',
      tone === 'success'
        ? 'border-emerald-200/50 text-emerald-50'
        : tone === 'warning'
          ? 'border-amber-200/50 text-amber-100'
          : 'border-cyan-100/20 text-cyan-100',
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
}) => {
  const shouldHideLocalHud =
    typeof document !== 'undefined'
    && Boolean(document.querySelector('[data-unified-minigame-hud="true"]'));

  if (shouldHideLocalHud) return null;

  return (
    <div className={cn('flex items-center justify-between gap-1.5', className)}>
      <div className="flex items-center gap-1.5">
        <IconButton icon={<ArrowLeft className="h-5 w-5" />} label="Back" onClick={onBack} />
        {progressLabel ? (
          <div className="inline-flex h-9 items-center rounded-full border border-white/20 bg-white/10 px-2.5 text-[10px] font-black uppercase tracking-[0.1em] text-white">
            {progressLabel}
          </div>
        ) : null}
      </div>
      <div className="flex items-center gap-1.5">
        {typeof lives === 'number' ? (
          <div className="inline-flex h-9 items-center gap-1.5 rounded-full border border-white/20 bg-white/10 px-2.5 text-[10px] font-black uppercase tracking-[0.1em] text-white">
            <Heart className="h-3.5 w-3.5 text-amber-200" />
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
};
