import React from 'react';
import { GameUiShell } from './game-ui/GameUiKit';
import { GAME_SCENE_META } from '../gameSceneMeta';

interface FoodGameShellProps {
  gameType: 'take_out_rush' | 'monster_market';
  backgroundImage?: string;
  children: React.ReactNode;
}

const FoodGameShell: React.FC<FoodGameShellProps> = ({
  gameType,
  backgroundImage,
  children,
}) => {
  const resolvedBackground = backgroundImage || GAME_SCENE_META[gameType]?.background;

  return (
    <GameUiShell backgroundImage={resolvedBackground}>
      <div className="relative flex h-full w-full flex-col px-2 pb-2 pt-1 md:px-4 md:pb-4">
        <div className="relative z-10 flex h-full min-h-0 flex-col gap-2 md:gap-3">
          {children}
        </div>
      </div>
    </GameUiShell>
  );
};

export default FoodGameShell;
