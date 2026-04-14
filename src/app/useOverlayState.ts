import { Dispatch, SetStateAction, useCallback, useState } from 'react';
import { GameRulesMode, LevelResultState } from './types';

export interface OverlayStateController {
  showQuests: boolean;
  showAchievements: boolean;
  showGameRules: boolean;
  gameRulesMode: GameRulesMode;
  levelResult: LevelResultState | null;
  setShowQuests: Dispatch<SetStateAction<boolean>>;
  setShowAchievements: Dispatch<SetStateAction<boolean>>;
  setShowGameRules: Dispatch<SetStateAction<boolean>>;
  setGameRulesMode: Dispatch<SetStateAction<GameRulesMode>>;
  setLevelResult: Dispatch<SetStateAction<LevelResultState | null>>;
  closeGameRules: () => void;
}

export const useOverlayState = (): OverlayStateController => {
  const [showQuests, setShowQuests] = useState(false);
  const [showAchievements, setShowAchievements] = useState(false);
  const [showGameRules, setShowGameRules] = useState(false);
  const [gameRulesMode, setGameRulesMode] = useState<GameRulesMode>('help');
  const [levelResult, setLevelResult] = useState<LevelResultState | null>(null);

  const closeGameRules = useCallback(() => {
    setShowGameRules(false);
    setGameRulesMode('help');
  }, []);

  return {
    showQuests,
    showAchievements,
    showGameRules,
    gameRulesMode,
    levelResult,
    setShowQuests,
    setShowAchievements,
    setShowGameRules,
    setGameRulesMode,
    setLevelResult,
    closeGameRules,
  };
};
