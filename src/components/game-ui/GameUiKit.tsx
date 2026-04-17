import React from 'react';
import { motion } from 'motion/react';
import {
  ArrowLeft,
  HelpCircle,
  Heart,
  Sparkles,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { playGameSound } from '../../audio/gameAudio';

type WrapperProps = {
  children: React.ReactNode;
  className?: string;
};

type GameUiShellProps = WrapperProps & {
  backgroundImage?: string;
  overlayDisabled?: boolean;
  backgroundOpacity?: number;
  backgroundPosition?: string;
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

type FeedbackTone = 'neutral' | 'success' | 'warning' | 'praise';

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

type GameQuestionCardProps = {
  title?: string;
  subtitle?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  titleClassName?: string;
  bodyClassName?: string;
  style?: React.CSSProperties;
};

/**
 * Standard question/prompt surface used across mini-games.
 * Visual source of truth lives in `.game-question-card` (src/index.css).
 */
export const GameQuestionCard: React.FC<GameQuestionCardProps> = ({
  title = 'Mission',
  subtitle,
  children,
  className,
  titleClassName,
  bodyClassName,
  style,
}) => (
  <div className={cn('game-question-card', className)} style={style}>
    {title ? (
      <div className={cn('question-title text-[11px] font-black uppercase tracking-[0.18em] text-amber-100/90', titleClassName)}>
        {title}
      </div>
    ) : null}
    <div className={cn('game-question-copy mt-0.5 whitespace-pre-line text-white', bodyClassName)}>
      {children}
    </div>
    {subtitle ? (
      <div className="question-subtitle mt-1 text-xs font-semibold text-white/75 md:text-sm">
        {subtitle}
      </div>
    ) : null}
  </div>
);

export const IconButton: React.FC<IconButtonProps> = ({ icon, label, onClick, disabled }) => (
  <button
    type="button"
    onClick={() => {
      if (disabled) return;
      playGameSound('tap');
      onClick?.();
    }}
    disabled={disabled}
    data-ui-sound="handled"
    aria-label={label}
    className={cn(
      'ui-icon-button inline-flex h-11 w-11 items-center justify-center p-0',
      'text-white disabled:cursor-not-allowed disabled:opacity-60',
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
  backgroundOpacity = 1,
  backgroundPosition,
}) => {
  // Gameplay screens already provide their own backdrop layer or image.
  // Keep the shared shell transparent there so we don't stack a second fallback background underneath.
  // Non-gameplay screens keep the default radial treatment.
  const inGameplayViewport =
    typeof document !== 'undefined'
    && Boolean(document.querySelector('[data-gameplay-content-viewport="true"]'));

  return (
    <div
      className={cn(
        'relative flex h-full w-full flex-col overflow-hidden',
        inGameplayViewport
          ? 'bg-transparent'
          : 'bg-[radial-gradient(circle_at_top,#0f172a_0%,#0b1224_45%,#050914_100%)]',
        className,
      )}
    >
      {backgroundImage ? (
        <div
          data-game-background-layer="true"
          className="game-background-layer pointer-events-none absolute inset-0 bg-cover bg-center"
          style={{
            backgroundImage: `url(${backgroundImage})`,
            opacity: backgroundOpacity,
            backgroundPosition: backgroundPosition || undefined,
          }}
        />
      ) : null}
      {overlayDisabled ? null : null}
      <div className="relative z-10 flex h-full min-h-0 flex-col">
        {children}
      </div>
    </div>
  );
};

export const PrimaryButton: React.FC<ButtonProps> = ({ children, className, onClick, disabled, type = 'button' }) => (
  <button
    type={type}
    onClick={() => {
      if (disabled) return;
      playGameSound('tap');
      onClick?.();
    }}
    disabled={disabled}
    data-ui-sound="handled"
    className={cn(
      'ui-button-primary inline-flex h-[48px] w-full items-center justify-center gap-2 border-0 bg-transparent',
      'px-4 text-[clamp(14px,2vh,18px)] font-black tracking-[0.01em]',
      'disabled:cursor-not-allowed disabled:opacity-60',
      className,
    )}
  >
    {children}
  </button>
);

export const SecondaryButton: React.FC<ButtonProps> = ({ children, className, onClick, disabled, type = 'button' }) => (
  <button
    type={type}
    onClick={() => {
      if (disabled) return;
      playGameSound('tap');
      onClick?.();
    }}
    disabled={disabled}
    data-ui-sound="handled"
    className={cn(
      'ui-button-secondary inline-flex h-[48px] items-center justify-center border-0 bg-transparent',
      'px-3 text-[10px] font-black uppercase tracking-[0.1em]',
      'disabled:cursor-not-allowed disabled:opacity-50',
      className,
    )}
  >
    {children}
  </button>
);

export const StoryCard: React.FC<WrapperProps> = ({ children, className }) => (
  <div
    className={cn(
      'game-question-card text-center text-slate-100',
      className,
    )}
  >
    {children}
  </div>
);

export const TaskCard: React.FC<WrapperProps> = ({ children, className }) => (
  <div
    className={cn(
      'game-question-card text-slate-100',
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
}) => {
  const baseClassName = cn(
    'licensed-game-card mission-panel-shell rounded-[1.1rem] border px-3 py-2 text-center text-[13px] font-black shadow-[0_10px_18px_rgba(15,23,42,0.22)]',
    tone === 'success'
      ? 'border-emerald-200/50 text-emerald-50'
      : tone === 'warning'
        ? 'border-amber-200/50 text-amber-100'
        : tone === 'praise'
          ? 'border-amber-100/65 bg-[linear-gradient(135deg,rgba(255,229,153,0.98),rgba(125,211,252,0.95))] text-slate-950 shadow-[0_0_0_1px_rgba(255,255,255,0.45),0_0_24px_rgba(251,191,36,0.58)]'
          : 'border-cyan-100/20 text-cyan-100',
    className,
  );

  if (tone !== 'praise') {
    return <div className={baseClassName}>{children}</div>;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10, scale: 0.94, rotate: -1 }}
      animate={{ opacity: 1, y: 0, scale: [1, 1.04, 1], rotate: 0 }}
      transition={{ duration: 0.38, ease: 'easeOut' }}
      className={cn('relative overflow-hidden', baseClassName)}
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_20%,rgba(255,255,255,0.82),transparent_38%),radial-gradient(circle_at_18%_22%,rgba(255,255,255,0.4),transparent_16%),radial-gradient(circle_at_82%_28%,rgba(255,255,255,0.35),transparent_16%)] opacity-90" />
      <div className="relative inline-flex items-center justify-center gap-1.5">
        <Sparkles className="h-4 w-4 text-amber-500" />
        <span>{children}</span>
        <Sparkles className="h-4 w-4 text-cyan-600" />
      </div>
    </motion.div>
  );
};

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
        {onHelp ? (
          <IconButton
            icon={<HelpCircle className="h-5 w-5" />}
            label="Help"
            onClick={onHelp}
          />
        ) : null}
      </div>
    </div>
  );
};


