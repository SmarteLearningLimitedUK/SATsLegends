import { Dispatch, SetStateAction, useState } from 'react';
import { LevelResultState } from './types';

export interface OverlayStateController {
  showQuests: boolean;
  showAchievements: boolean;
  levelResult: LevelResultState | null;
  setShowQuests: Dispatch<SetStateAction<boolean>>;
  setShowAchievements: Dispatch<SetStateAction<boolean>>;
  setLevelResult: Dispatch<SetStateAction<LevelResultState | null>>;
}

export const useOverlayState = (): OverlayStateController => {
  const [showQuests, setShowQuests] = useState(false);
  const [showAchievements, setShowAchievements] = useState(false);
  const [levelResult, setLevelResult] = useState<LevelResultState | null>(null);

  return {
    showQuests,
    showAchievements,
    levelResult,
    setShowQuests,
    setShowAchievements,
    setLevelResult,
  };
};
