import { Dispatch, SetStateAction, useCallback, useState } from 'react';
import { GameScreen, IslandData, LevelData } from '../types';

export interface ScreenFlowController {
  screen: GameScreen;
  selectedIsland: IslandData | null;
  selectedLevel: LevelData | null;
  setScreen: Dispatch<SetStateAction<GameScreen>>;
  setSelectedIsland: Dispatch<SetStateAction<IslandData | null>>;
  setSelectedLevel: Dispatch<SetStateAction<LevelData | null>>;
  goToHome: () => void;
  goToProfileSetup: () => void;
  goToAvatarSelection: () => void;
  goToWorldMap: () => void;
  goToIslandLevels: () => void;
  goToGameplay: () => void;
  goToWellbeingHub: () => void;
  goToWellbeingActivity: () => void;
  handleIslandSelect: (island: IslandData) => void;
  handleLevelSelect: (level: LevelData) => void;
  handleGlobalDockBack: () => void;
}

export const useScreenFlow = (): ScreenFlowController => {
  const [screen, setScreen] = useState<GameScreen>('splash');
  const [selectedIsland, setSelectedIsland] = useState<IslandData | null>(null);
  const [selectedLevel, setSelectedLevel] = useState<LevelData | null>(null);

  const goToHome = useCallback(() => {
    setSelectedLevel(null);
    setScreen('world_map');
  }, []);

  const goToProfileSetup = useCallback(() => setScreen('profile_setup'), []);
  const goToAvatarSelection = useCallback(() => setScreen('avatar_selection'), []);
  const goToWorldMap = useCallback(() => setScreen('world_map'), []);
  const goToIslandLevels = useCallback(() => setScreen('island_levels'), []);
  const goToGameplay = useCallback(() => setScreen('gameplay'), []);
  const goToWellbeingHub = useCallback(() => setScreen('wellbeing_hub'), []);
  const goToWellbeingActivity = useCallback(() => setScreen('wellbeing_activity'), []);

  const handleIslandSelect = useCallback((island: IslandData) => {
    setSelectedIsland(island);
    setSelectedLevel(null);
    setScreen('island_levels');
  }, []);

  const handleLevelSelect = useCallback((level: LevelData) => {
    setSelectedLevel(level);
    setScreen('gameplay');
  }, []);

  const handleGlobalDockBack = useCallback(() => {
    if (screen === 'gameplay') {
      setScreen('island_levels');
      return;
    }

    if (screen === 'avatar_selection') {
      setScreen('profile_setup');
      return;
    }

    if (screen === 'profile_setup') {
      setScreen('splash');
      return;
    }

    if (screen === 'shop' || screen === 'profile' || screen === 'settings' || screen === 'parent_dashboard') {
      goToHome();
      return;
    }

    if (screen === 'splash') {
      setScreen('splash');
      return;
    }

    goToHome();
  }, [goToHome, screen]);

  return {
    screen,
    selectedIsland,
    selectedLevel,
    setScreen,
    setSelectedIsland,
    setSelectedLevel,
    goToHome,
    goToProfileSetup,
    goToAvatarSelection,
    goToWorldMap,
    goToIslandLevels,
    goToGameplay,
    goToWellbeingHub,
    goToWellbeingActivity,
    handleIslandSelect,
    handleLevelSelect,
    handleGlobalDockBack,
  };
};
