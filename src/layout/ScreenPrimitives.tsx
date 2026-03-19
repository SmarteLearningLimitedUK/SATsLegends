import React from 'react';
import { GUI_SLICES } from '../assets/reskin/guiSlices';

type WrapperProps = {
  children: React.ReactNode;
  className?: string;
};

export const GameScreenShell: React.FC<WrapperProps> = ({ children, className = '' }) => (
  <section className={`app-screen app-screen-fixed premium-page-root game-shell-root relative flex h-full w-full min-h-0 flex-col overflow-hidden ${className}`.trim()}>
    {children}
  </section>
);

export const ScrollScreenShell: React.FC<WrapperProps> = ({ children, className = '' }) => (
  <section
    className={`app-screen app-screen-scroll premium-page-root relative flex h-full w-full min-h-0 flex-col overflow-y-auto overflow-x-hidden ${className}`.trim()}
    style={{ WebkitOverflowScrolling: 'touch' }}
  >
    {children}
  </section>
);

type HUDBarProps = {
  eyebrow?: string;
  title: React.ReactNode;
  trailing?: React.ReactNode;
  className?: string;
};

export const HUDBar: React.FC<HUDBarProps> = ({ eyebrow, title, trailing, className = '' }) => (
  <div className={`flex items-center justify-between gap-3 ${className}`.trim()}>
    <div className="min-w-0">
      {eyebrow && (
        <div className="text-[10px] font-black uppercase tracking-[0.24em] text-white/58">
          {eyebrow}
        </div>
      )}
      <div className="min-w-0 truncate text-lg font-black tracking-tight text-white md:text-3xl">
        {title}
      </div>
    </div>
    {trailing && <div className="shrink-0">{trailing}</div>}
  </div>
);

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
  <div
    className={`premium-header-bar relative overflow-hidden rounded-[1.2rem] border border-white/16 px-4 py-3 shadow-[0_12px_26px_rgba(2,6,23,0.26)] md:rounded-[1.55rem] md:px-5 md:py-4 ${className}`.trim()}
    style={{
      backgroundImage: `url(${GUI_SLICES.headerBar})`,
      backgroundSize: '100% 100%',
      backgroundRepeat: 'no-repeat',
    }}
  >
    <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(3,10,28,0.18),rgba(3,10,28,0.36))]" />
    <div className="relative z-10">
      <HUDBar eyebrow={eyebrow} title={title} trailing={trailing} />
    </div>
  </div>
);

export const PuzzleStage: React.FC<WrapperProps> = ({ children, className = '' }) => (
  <div className={`game-shell-zone game-shell-zone-playfield licensed-board-frame structured-playfield-frame relative flex min-h-0 flex-1 flex-col overflow-hidden p-3 md:p-5 ${className}`.trim()}>
    {children}
  </div>
);

export const BottomActionTray: React.FC<WrapperProps> = ({ children, className = '' }) => (
  <div className={`game-shell-zone game-shell-zone-actions shrink-0 ${className}`.trim()}>
    <div className="licensed-game-card-dark rounded-[1.5rem] p-3 md:rounded-[1.9rem] md:p-4">
      {children}
    </div>
  </div>
);

export const RewardPanel: React.FC<WrapperProps> = ({ children, className = '' }) => (
  <div className={`licensed-slice-paper-panel rounded-[1.15rem] px-4 py-3 text-amber-950 md:rounded-[1.4rem] md:px-5 md:py-4 ${className}`.trim()}>
    {children}
  </div>
);

type FramedPanelProps = {
  children: React.ReactNode;
  className?: string;
  variant?: 'surface' | 'dark' | 'paper';
};

export const FramedPanel: React.FC<FramedPanelProps> = ({
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
      className={`rounded-[1.15rem] p-3 md:rounded-[1.5rem] md:p-4 ${variantClass} ${className}`.trim()}
      style={{
        backgroundImage: `url(${variantBackground})`,
        backgroundSize: '100% 100%',
        backgroundRepeat: 'no-repeat',
      }}
    >
      {children}
    </div>
  );
};

type ActionButtonProps = {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
  disabled?: boolean;
  type?: 'button' | 'submit' | 'reset';
};

export const PrimaryActionButton: React.FC<ActionButtonProps> = ({
  children,
  className = '',
  onClick,
  disabled,
  type = 'button',
}) => (
  <button
    type={type}
    onClick={onClick}
    disabled={disabled}
    className={`ui-button-primary inline-flex min-h-[44px] items-center justify-center rounded-[1.05rem] border border-white/25 px-4 py-2.5 text-[11px] font-black uppercase tracking-[0.14em] text-white md:rounded-[1.25rem] md:px-5 md:py-3 md:text-sm ${className}`.trim()}
    style={{
      backgroundImage: `url(${GUI_SLICES.buttonPrimary})`,
      backgroundSize: '100% 100%',
      backgroundRepeat: 'no-repeat',
    }}
  >
    {children}
  </button>
);

export const SecondaryActionButton: React.FC<ActionButtonProps> = ({
  children,
  className = '',
  onClick,
  disabled,
  type = 'button',
}) => (
  <button
    type={type}
    onClick={onClick}
    disabled={disabled}
    className={`ui-button-secondary inline-flex min-h-[44px] items-center justify-center rounded-[1.05rem] border border-white/22 px-4 py-2.5 text-[11px] font-black uppercase tracking-[0.14em] text-white md:rounded-[1.25rem] md:px-5 md:py-3 md:text-sm ${className}`.trim()}
    style={{
      backgroundImage: `url(${GUI_SLICES.buttonSecondary})`,
      backgroundSize: '100% 100%',
      backgroundRepeat: 'no-repeat',
    }}
  >
    {children}
  </button>
);

type HUDPillProps = {
  children: React.ReactNode;
  className?: string;
};

export const HUDPill: React.FC<HUDPillProps> = ({ children, className = '' }) => (
  <div
    className={`licensed-slice-blue-banner inline-flex min-h-[30px] items-center gap-1.5 rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-white md:min-h-[34px] md:px-3.5 md:text-[11px] ${className}`.trim()}
    style={{
      backgroundImage: `url(${GUI_SLICES.listPanel})`,
      backgroundSize: '100% 100%',
      backgroundRepeat: 'no-repeat',
    }}
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
      className={`relative h-3 w-full overflow-hidden rounded-full border border-white/18 bg-black/35 md:h-3.5 ${className}`.trim()}
      style={{
        backgroundImage: `url(${GUI_SLICES.progressBg})`,
        backgroundSize: '100% 100%',
        backgroundRepeat: 'no-repeat',
      }}
    >
      <div
        className="absolute inset-y-0 left-0 overflow-hidden rounded-full"
        style={{ width: `${safeValue}%` }}
      >
        <div
          className="h-full w-full"
          style={{
            backgroundImage: `url(${GUI_SLICES.progressFill})`,
            backgroundSize: '100% 100%',
            backgroundRepeat: 'no-repeat',
          }}
        />
        <div className={`absolute inset-0 ${toneClass}`} />
      </div>
    </div>
  );
};

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
  <GameScreenShell className={`game-screen-template ${className}`.trim()}>
    {background}
    {decorations}
    <div className="game-shell-content relative z-10 mx-auto flex h-full min-h-0 w-full max-w-[76rem] flex-1 flex-col gap-2 px-2 pb-[calc(env(safe-area-inset-bottom)+0.35rem)] pt-[calc(env(safe-area-inset-top)+0.2rem)] md:gap-3 md:px-3 md:pb-[calc(env(safe-area-inset-bottom)+0.6rem)] md:pt-[calc(env(safe-area-inset-top)+0.35rem)]">
      <div className="game-shell-zone game-shell-zone-hud">{hud}</div>
      {titleStrip ? <div className="game-shell-zone game-shell-zone-title">{titleStrip}</div> : null}
      <div className="game-shell-zone game-shell-zone-playfield-wrapper min-h-0 flex-1">{playfield}</div>
      <div className="game-shell-zone game-shell-zone-actions">{actions}</div>
    </div>
  </GameScreenShell>
);
