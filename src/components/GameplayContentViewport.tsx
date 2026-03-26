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
    {children}
  </div>
);

export default GameplayContentViewport;
