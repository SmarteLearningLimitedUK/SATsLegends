import React from 'react';
import GameplayContentViewport from '../../components/GameplayContentViewport';

type GameplayViewportProps = {
  children: React.ReactNode;
  className?: string;
};

/**
 * Foundation slot: GameplayViewport.
 * This owns any scaling/fit behavior. Minigames must not implement viewport maths.
 */
const GameplayViewport: React.FC<GameplayViewportProps> = ({ children, className }) => (
  <div className={['gameplay-viewport', className].filter(Boolean).join(' ')} data-shell-slot="playfield">
    <GameplayContentViewport>{children}</GameplayContentViewport>
  </div>
);

export default GameplayViewport;

