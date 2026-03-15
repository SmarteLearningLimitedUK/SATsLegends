import React from 'react';

type WrapperProps = {
  children: React.ReactNode;
  className?: string;
};

export const GameScreenShell: React.FC<WrapperProps> = ({ children, className = '' }) => (
  <div className={`relative flex h-full w-full min-h-0 flex-col overflow-hidden ${className}`.trim()}>
    {children}
  </div>
);

export const ScrollScreenShell: React.FC<WrapperProps> = ({ children, className = '' }) => (
  <div
    className={`relative flex h-full w-full min-h-0 flex-col overflow-y-auto overflow-x-hidden ${className}`.trim()}
    style={{ WebkitOverflowScrolling: 'touch' }}
  >
    {children}
  </div>
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

export const PuzzleStage: React.FC<WrapperProps> = ({ children, className = '' }) => (
  <div className={`licensed-board-frame relative flex min-h-0 flex-1 flex-col overflow-hidden p-3 md:p-5 ${className}`.trim()}>
    {children}
  </div>
);

export const BottomActionTray: React.FC<WrapperProps> = ({ children, className = '' }) => (
  <div className={`shrink-0 ${className}`.trim()}>
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
