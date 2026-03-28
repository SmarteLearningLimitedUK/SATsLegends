import React from 'react';

interface GameplayContentViewportProps {
  children: React.ReactNode;
}

/**
 * Shared gameplay content wrapper:
 * mini-games should render mission/puzzle/input/feedback only.
 * Shell-level chrome (top HUD + bottom utility dock) is owned by App shell.
 */
const GameplayContentViewport: React.FC<GameplayContentViewportProps> = ({ children }) => (
  <div
    data-gameplay-content-viewport="true"
    className="game-shell-zone game-shell-zone-playfield minigame-content-viewport relative flex h-full w-full min-h-0 flex-1 flex-col overflow-hidden"
  >
    <div className="pointer-events-none absolute inset-0 z-[1] bg-[linear-gradient(180deg,rgba(5,16,46,0.22)_0%,rgba(5,16,46,0.12)_35%,rgba(5,16,46,0.28)_100%)]" />
    <div className="pointer-events-none absolute inset-0 z-[1] bg-[radial-gradient(circle_at_22%_14%,rgba(56,189,248,0.14)_0%,rgba(56,189,248,0)_42%),radial-gradient(circle_at_82%_18%,rgba(251,191,36,0.13)_0%,rgba(251,191,36,0)_38%)]" />
    <div className="relative z-[2] flex h-full min-h-0 flex-1 flex-col overflow-hidden">
      {children}
    </div>
  </div>
);

export default GameplayContentViewport;
