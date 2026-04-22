import React from 'react';
import { GAME_SCENE_META } from '../gameSceneMeta';
import { MiniGameType } from '../types';

interface GameplaySceneBackdropProps {
  gameType: MiniGameType;
  backgroundOverride?: string;
  minimalDecor?: boolean;
  className?: string;
}

const GameplaySceneBackdrop: React.FC<GameplaySceneBackdropProps> = ({
  gameType,
  backgroundOverride,
  minimalDecor = false,
  className = '',
}) => {
  const scene = GAME_SCENE_META[gameType];
  const backgroundImage = backgroundOverride || scene.background;
  void minimalDecor;

  return (
    <div
      className={`game-background-layer pointer-events-none absolute inset-0 overflow-hidden ${className}`.trim()}
      data-game-background-layer="true"
    >
      {backgroundImage ? (
        <img
          src={backgroundImage}
          alt=""
          className="absolute inset-0 h-full w-full object-contain object-center"
          draggable={false}
        />
      ) : null}
    </div>
  );
};

export default GameplaySceneBackdrop;
