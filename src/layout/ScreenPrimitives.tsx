import React from 'react';
import { GUI_SLICES } from '../assets/reskin/guiSlices.ts';
import { GameUiShell } from '../components/game-ui/GameUiKit';
import { playGameSound } from '../audio/gameAudio';

type WrapperProps = {
  children: React.ReactNode;
  className?: string;
};

type GameScreenShellProps = WrapperProps & {
  backgroundImage?: string;
  overlayDisabled?: boolean;
  backgroundOpacity?: number;
};

const cn = (...parts: Array<string | false | null | undefined>) => parts.filter(Boolean).join(' ');

const ROLE_CARD_BASE =
  'relative overflow-hidden border border-white/16 shadow-[0_14px_28px_rgba(2,6,23,0.34)]';

const ROLE_RADIUS_HUD = 'rounded-[1rem] md:rounded-[1.35rem]';
const ROLE_RADIUS_CARD = 'rounded-[1.15rem] md:rounded-[1.6rem]';
const ROLE_RADIUS_PANEL = 'rounded-[0.95rem] md:rounded-[1.2rem]';

const fillSlice = (asset: string): React.CSSProperties => ({
  backgroundImage: `url(${asset})`,
  backgroundSize: '100% 100%',
  backgroundRepeat: 'no-repeat',
});

/**
 * Screen-level shells
 */
export const GameScreenShell: React.FC<GameScreenShellProps> = ({
  children,
  className = '',
  backgroundImage,
  overlayDisabled,
  backgroundOpacity,
}) => (
  <GameUiShell
    backgroundImage={backgroundImage}
    overlayDisabled={overlayDisabled}
    backgroundOpacity={backgroundOpacity}
  >
    <section
      className={cn(
        'app-screen app-screen-fixed premium-page-root game-shell-root relative flex h-[100dvh] max-h-[100dvh] w-full min-h-0 flex-col overflow-hidden md:h-full md:max-h-full',
        className,
      )}
    >
      {children}
    </section>
  </GameUiShell>
);

export const ScrollScreenShell: React.FC<WrapperProps> = ({ children, className = '' }) => (
  <section
    className={cn(
      'app-screen app-screen-scroll premium-page-root relative flex h-[100dvh] max-h-[100dvh] w-full min-h-0 flex-col overflow-y-auto overflow-x-hidden md:h-full md:max-h-full',
      className,
    )}
    style={{ WebkitOverflowScrolling: 'touch' }}
  >
    {children}
  </section>
);

/**
 * Role: Shell HUD text row only (label + title + trailing)
 */
type ShellHUDRowProps = {
  eyebrow?: string;
  title: React.ReactNode;
  trailing?: React.ReactNode;
  className?: string;
};

export const ShellHUDRow: React.FC<ShellHUDRowProps> = ({ eyebrow, title, trailing, className = '' }) => (
  <div className={cn('flex items-center justify-between gap-3', className)}>
    <div className="min-w-0">
      {eyebrow ? (
        <div className="text-[10px] font-black uppercase tracking-[0.22em] text-white/64">{eyebrow}</div>
      ) : null}
      <div className="min-w-0 truncate text-lg font-black tracking-tight text-white md:text-3xl">{title}</div>
    </div>
    {trailing ? <div className="shrink-0">{trailing}</div> : null}
  </div>
);

/**
 * Backward-compatible alias
 */
export const HUDBar = ShellHUDRow;

/**
 * Role: Mission / question strip
 * Strongly opinionated to be the only high-priority strip above puzzle content.
 */
type MissionStripProps = {
  eyebrow?: string;
  title?: React.ReactNode;
  trailing?: React.ReactNode;
  children?: React.ReactNode;
  className?: string;
  tone?: 'default' | 'focus';
};

export const MissionStrip: React.FC<MissionStripProps> = ({
  eyebrow,
  title,
  trailing,
  children,
  className = '',
  tone = 'default',
}) => (
  <div
    className={cn(
      ROLE_CARD_BASE,
      ROLE_RADIUS_HUD,
      'mission-strip mission-header-shell px-3 py-2.5 md:px-4 md:py-3',
      tone === 'focus'
        ? 'shadow-[0_16px_34px_rgba(8,145,178,0.22)]'
        : 'shadow-[0_12px_26px_rgba(2,6,23,0.28)]',
      className,
    )}
    style={fillSlice(GUI_SLICES.headerBar)}
  >
    <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(4,12,32,0.06),rgba(4,12,32,0.16))]" />
    <div className="relative z-10">
      {children ?? (title ? <ShellHUDRow eyebrow={eyebrow} title={title} trailing={trailing} /> : null)}
    </div>
  </div>
);

/**
 * Backward-compatible alias
 */
type PremiumHeaderBarProps = {
  eyebrow?: string;
  title: React.ReactNode;
  trailing?: React.ReactNode;
  className?: string;
};

export const PremiumHeaderBar: React.FC<PremiumHeaderBarProps> = ({
  eyebrow,
  title,
  trailing,
  className = '',
}) => (
  <MissionStrip eyebrow={eyebrow} title={title} trailing={trailing} className={className} />
);

/**
 * Role: Hero playfield card (main gameplay focus)
 */
export const HeroPlayfieldCard: React.FC<WrapperProps> = ({ children, className = '' }) => (
  <div
    className={cn(
      'game-shell-zone game-shell-zone-playfield licensed-board-frame mission-panel-shell structured-playfield-frame relative flex min-h-0 flex-1 flex-col overflow-hidden p-1.5 md:p-2.5',
      ROLE_CARD_BASE,
      ROLE_RADIUS_CARD,
      className,
    )}
  >
    {children}
  </div>
);

/**
 * Backward-compatible alias
 */
export const PuzzleStage = HeroPlayfieldCard;

/**
 * Role: Answer cluster card (answer buttons / keypad / quick input)
 */
export const AnswerClusterCard: React.FC<WrapperProps> = ({ children, className = '' }) => (
  <div className={cn('game-shell-zone game-shell-zone-actions shrink-0', className)}>
    <div
      className={cn(
        'licensed-game-card-dark mission-panel-shell p-1.5 md:p-2',
        ROLE_CARD_BASE,
        ROLE_RADIUS_CARD,
      )}
      style={fillSlice(GUI_SLICES.panelDark)}
    >
      {children}
    </div>
  </div>
);

/**
 * Backward-compatible alias
 */
export const BottomActionTray = AnswerClusterCard;

/**
 * Role: Primary reward/action CTA (high visual priority)
 */
type ActionButtonProps = {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
  disabled?: boolean;
  type?: 'button' | 'submit' | 'reset';
};

export const PrimaryActionCTA: React.FC<ActionButtonProps> = ({
  children,
  className = '',
  onClick,
  disabled,
  type = 'button',
}) => (
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
      'ui-button-primary gameplay-cta-primary mission-action-btn mission-action-btn-primary',
      'inline-flex min-h-[48px] items-center justify-center border-0 bg-transparent',
      'px-4 py-2 text-[10px] font-black uppercase tracking-[0.14em]',
      'disabled:cursor-not-allowed disabled:opacity-60',
      'md:min-h-[48px] md:px-5 md:py-2.5 md:text-xs',
      className,
    )}
    style={fillSlice(GUI_SLICES.buttonPrimary)}
  >
    {children}
  </button>
);

/**
 * Backward-compatible alias
 */
export const PrimaryActionButton = PrimaryActionCTA;

/**
 * Role: Secondary utility controls (lower visual weight than primary CTA)
 */
export const SecondaryUtilityButton: React.FC<ActionButtonProps> = ({
  children,
  className = '',
  onClick,
  disabled,
  type = 'button',
}) => (
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
      'ui-button-secondary gameplay-cta-secondary mission-action-btn mission-action-btn-secondary',
      'inline-flex min-h-[48px] items-center justify-center border-0 bg-transparent',
      'px-3 py-1.5 text-[9.5px] font-black uppercase tracking-[0.14em]',
      'disabled:cursor-not-allowed disabled:opacity-60',
      'md:min-h-[48px] md:px-4 md:py-2 md:text-[10px]',
      className,
    )}
    style={fillSlice(GUI_SLICES.buttonSecondary)}
  >
    {children}
  </button>
);

/**
 * Backward-compatible alias
 */
export const SecondaryActionButton = SecondaryUtilityButton;

/**
 * Role: Utility controls row container (for back/sound/help clusters etc.)
 */
export const UtilityControlsRow: React.FC<WrapperProps> = ({ children, className = '' }) => (
  <div
    className={cn(
      'game-utility-controls-row flex w-full items-center justify-center gap-2 md:gap-2.5',
      className,
    )}
  >
    {children}
  </div>
);

/**
 * Role: Overlay / modal surface
 */
type OverlaySurfaceProps = {
  children: React.ReactNode;
  className?: string;
  variant?: 'surface' | 'dark' | 'paper';
};

export const OverlaySurface: React.FC<OverlaySurfaceProps> = ({
  children,
  className = '',
  variant = 'surface',
}) => {
  const variantClass = variant === 'dark'
    ? 'licensed-game-card-dark text-white'
    : variant === 'paper'
      ? 'licensed-slice-paper-panel text-amber-950'
      : 'licensed-game-card text-white';
  const variantBackground = variant === 'dark'
    ? GUI_SLICES.panelDark
    : variant === 'paper'
      ? GUI_SLICES.panelPaper
      : GUI_SLICES.panelPrimary;

  return (
    <div
      className={cn(
        ROLE_CARD_BASE,
        ROLE_RADIUS_PANEL,
        'overlay-surface p-2.5 md:p-3',
        variantClass,
        className,
      )}
      style={fillSlice(variantBackground)}
    >
      {children}
    </div>
  );
};

/**
 * Backward-compatible alias
 */
type FramedPanelProps = {
  children: React.ReactNode;
  className?: string;
  variant?: 'surface' | 'dark' | 'paper';
};

export const FramedPanel: React.FC<FramedPanelProps> = ({
  children,
  className = '',
  variant = 'surface',
}) => (
  <OverlaySurface className={className} variant={variant}>
    {children}
  </OverlaySurface>
);

/**
 * Role: Lightweight reward/info surface (used under mission strips and in overlays)
 */
export const RewardPanel: React.FC<WrapperProps> = ({ children, className = '' }) => (
  <div
    className={cn(
      'licensed-slice-paper-panel mission-paper-shell px-3 py-2.5 text-amber-950 md:px-4 md:py-3',
      ROLE_CARD_BASE,
      ROLE_RADIUS_PANEL,
      className,
    )}
    style={fillSlice(GUI_SLICES.panelPaper)}
  >
    {children}
  </div>
);

type HUDPillProps = {
  children: React.ReactNode;
  className?: string;
};

export const HUDPill: React.FC<HUDPillProps> = ({ children, className = '' }) => (
  <div
    className={cn(
      'licensed-slice-blue-banner mission-pill inline-flex min-h-[28px] items-center gap-1.5 rounded-full px-2.5 py-1 text-[9.5px] font-black uppercase tracking-[0.16em] text-white md:min-h-[32px] md:px-3 md:text-[10px]',
      className,
    )}
    style={fillSlice(GUI_SLICES.listPanel)}
  >
    {children}
  </div>
);

type PremiumProgressBarProps = {
  value: number;
  className?: string;
  toneClass?: string;
};

export const PremiumProgressBar: React.FC<PremiumProgressBarProps> = ({
  value,
  className = '',
  toneClass = 'bg-gradient-to-r from-cyan-300 via-sky-300 to-blue-400',
}) => {
  const safeValue = Math.max(0, Math.min(100, value));
  return (
    <div
      className={cn(
      'relative h-3.5 w-full overflow-hidden rounded-full border border-white/18 bg-black/35 md:h-4 mission-progress-shell',
        className,
      )}
      style={fillSlice(GUI_SLICES.progressBg)}
    >
      <div
        className="hud-progress-fill absolute inset-y-0 left-0 overflow-hidden rounded-full"
        style={{ width: `${safeValue}%` }}
      >
        <div className="h-full w-full" style={fillSlice(GUI_SLICES.progressFill)} />
        <div className={cn('absolute inset-0', toneClass)} />
      </div>
    </div>
  );
};

/**
 * Opinionated gameplay screen template:
 * 1) Shell HUD
 * 2) Mission strip
 * 3) Hero playfield card
 * 4) Answer cluster card
 */
type GameScreenTemplateProps = {
  hud: React.ReactNode;
  titleStrip?: React.ReactNode;
  playfield: React.ReactNode;
  actions: React.ReactNode;
  background?: React.ReactNode;
  decorations?: React.ReactNode;
  className?: string;
};

export const GameScreenTemplate: React.FC<GameScreenTemplateProps> = ({
  hud,
  titleStrip,
  playfield,
  actions,
  background,
  decorations,
  className = '',
}) => (
  <GameScreenShell className={cn('game-screen-template', className)} data-preserve-shell-zones="true">
    {background}
    {decorations}
    <div className="game-shell-content relative z-10 mx-auto flex h-full min-h-0 w-full max-w-full flex-1 flex-col gap-1 px-1 pb-[0.08rem] pt-[0.04rem] md:gap-1.5 md:px-1.5 md:pb-[0.1rem] md:pt-[0.08rem]">
      <div className="game-shell-zone game-shell-zone-hud shrink-0">{hud}</div>
      {titleStrip ? <div className="game-shell-zone game-shell-zone-title shrink-0">{titleStrip}</div> : null}
      <div className="game-shell-zone game-shell-zone-playfield-wrapper min-h-0 flex-1">
        <HeroPlayfieldCard>{playfield}</HeroPlayfieldCard>
      </div>
      <div className="game-shell-zone game-shell-zone-actions shrink-0">
        <AnswerClusterCard>{actions}</AnswerClusterCard>
      </div>
    </div>
  </GameScreenShell>
);
