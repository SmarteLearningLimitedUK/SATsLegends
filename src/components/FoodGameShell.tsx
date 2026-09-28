import React from 'react';
import { GameUiShell } from './game-ui/GameUiKit';
import { GAME_SCENE_META } from '../gameSceneMeta';
import './food-game-shell.css';

interface FoodGameShellProps {
  gameType: 'take_out_rush' | 'monster_market';
  backgroundImage?: string;
  overlayDisabled?: boolean;
  backgroundOpacity?: number;
  backgroundPosition?: string;
  children: React.ReactNode;
  className?: string;
}

const FoodGameShell: React.FC<FoodGameShellProps> = ({
  gameType,
  backgroundImage,
  overlayDisabled,
  backgroundOpacity,
  backgroundPosition,
  children,
  className = '',
}) => {
  const resolvedBackground = backgroundImage || GAME_SCENE_META[gameType]?.background;

  return (
    <GameUiShell
      backgroundImage={resolvedBackground}
      overlayDisabled={overlayDisabled}
      backgroundOpacity={backgroundOpacity}
      backgroundPosition={backgroundPosition}
    >
      <div data-food-game={gameType} className={`food-game-shell food-game-shell--${gameType} ${className}`}>
        <div className="relative z-10 flex h-full min-h-0 flex-col gap-2 md:gap-3">
          {children}
        </div>
      </div>
    </GameUiShell>
  );
};

export default FoodGameShell;
