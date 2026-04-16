import { Dispatch, SetStateAction, useCallback, useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ISLANDS } from '../constants';
import { GameScreen, IslandData, LevelData } from '../types';
import { buildRouteForScreen, parseRoute } from './routeConfig';

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
  goToShop: () => void;
  goToAchievements: () => void;
  goToParentDashboard: () => void;
  handleIslandSelect: (island: IslandData) => void;
  handleLevelSelect: (level: LevelData) => void;
  handleGlobalDockBack: () => void;
}

export const useScreenFlow = (): ScreenFlowController => {
  const location = useLocation();
  const navigate = useNavigate();
  const syncFromRouteRef = useRef(false);

  const resolveIsland = useCallback((islandId?: number) => {
    if (!islandId) return null;
    return ISLANDS.find((island) => island.id === islandId) ?? null;
  }, []);

  const resolveLevel = useCallback((island: IslandData | null, levelId?: number) => {
    if (!island || !levelId) return null;
    return island.levels.find((level) => level.id === levelId) ?? null;
  }, []);

  const initialRoute = parseRoute(location.pathname);
  const initialIsland = resolveIsland(initialRoute.islandId);
  const initialLevel = resolveLevel(initialIsland, initialRoute.levelId);

  const [screen, setScreen] = useState<GameScreen>(initialRoute.screen);
  const [selectedIsland, setSelectedIsland] = useState<IslandData | null>(initialIsland);
  const [selectedLevel, setSelectedLevel] = useState<LevelData | null>(initialLevel);

  useEffect(() => {
    const routeState = parseRoute(location.pathname);
    const routeIsland = routeState.islandId !== undefined ? resolveIsland(routeState.islandId) : undefined;
    const routeLevel = routeState.levelId !== undefined ? resolveLevel(routeIsland ?? null, routeState.levelId) : undefined;

    let nextScreen = routeState.screen;
    let nextIsland = routeIsland ?? null;
    let nextLevel = routeLevel ?? null;

    if (nextScreen === 'island_levels' && !routeIsland) {
      nextScreen = 'world_map';
    }

    if (nextScreen === 'gameplay' && (!routeIsland || !routeLevel)) {
      nextScreen = 'world_map';
    }

    syncFromRouteRef.current = true;
    if (screen !== nextScreen) setScreen(nextScreen);

    if (routeState.islandId !== undefined) {
      setSelectedIsland(routeIsland ?? null);
    }

    if (routeState.levelId !== undefined) {
      setSelectedLevel(routeLevel ?? null);
    }

    if (nextScreen === 'world_map' && (routeState.islandId !== undefined || routeState.levelId !== undefined)) {
      setSelectedIsland(null);
      setSelectedLevel(null);
    }

    if (nextScreen !== 'gameplay') {
      nextLevel = null;
    }

    if (nextScreen !== 'gameplay' && nextScreen !== 'island_levels') {
      nextIsland = null;
    }

    const expectedPath = buildRouteForScreen(nextScreen, nextIsland?.id, nextLevel?.id);
    if (location.pathname !== expectedPath) {
      navigate(expectedPath, { replace: true });
    }

    const resetId = window.setTimeout(() => {
      syncFromRouteRef.current = false;
    }, 0);

    return () => window.clearTimeout(resetId);
  }, [location.pathname, navigate, resolveIsland, resolveLevel]);

  useEffect(() => {
    if (syncFromRouteRef.current) return;
    const nextPath = buildRouteForScreen(screen, selectedIsland?.id, selectedLevel?.id);
    if (location.pathname !== nextPath) {
      navigate(nextPath);
    }
  }, [location.pathname, navigate, screen, selectedIsland, selectedLevel]);

  const goToHome = useCallback(() => {
    setSelectedLevel(null);
    setScreen('world_map');
  }, []);

  const goToProfileSetup = useCallback(() => setScreen('avatar_selection'), []);
  const goToAvatarSelection = useCallback(() => setScreen('avatar_selection'), []);
  const goToWorldMap = useCallback(() => setScreen('world_map'), []);
  const goToIslandLevels = useCallback(() => setScreen('island_levels'), []);
  const goToGameplay = useCallback(() => setScreen('gameplay'), []);
  const goToWellbeingHub = useCallback(() => setScreen('wellbeing_hub'), []);
  const goToWellbeingActivity = useCallback(() => setScreen('wellbeing_activity'), []);
  const goToShop = useCallback(() => setScreen('shop'), []);
  const goToAchievements = useCallback(() => setScreen('achievements_tracker'), []);
  const goToParentDashboard = useCallback(() => setScreen('parent_dashboard'), []);

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

    if (screen === 'avatar_selection' || screen === 'profile_setup') {
      setScreen('splash');
      return;
    }

    if (screen === 'shop' || screen === 'profile' || screen === 'settings' || screen === 'parent_dashboard' || screen === 'achievements_tracker') {
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
    goToShop,
    goToAchievements,
    goToParentDashboard,
    handleIslandSelect,
    handleLevelSelect,
    handleGlobalDockBack,
  };
};
