import { useEffect } from 'react';
import { getMiniGame } from '../games';
import { GameScreen, LevelData } from '../types';
import { resolveMiniGameRegistryKey } from './miniGameResolver';

interface UseMiniGameLifecycleArgs {
  screen: GameScreen;
  selectedLevel: LevelData | null;
}

export const useMiniGameLifecycle = ({ screen, selectedLevel }: UseMiniGameLifecycleArgs) => {
  useEffect(() => {
    if (screen !== 'gameplay' || !selectedLevel) return;

    const miniGameKey = resolveMiniGameRegistryKey(selectedLevel);
    if (!miniGameKey) return;

    const miniGame = getMiniGame(miniGameKey);
    miniGame.init();
    miniGame.update(0);
    miniGame.handleInput({
      type: 'mount',
      payload: {
        gameType: selectedLevel.gameType,
        levelId: selectedLevel.id,
        blueprintKey: selectedLevel.blueprintKey,
      },
    });
  }, [screen, selectedLevel]);
};
