import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { GAME_META } from './gameMeta';
import {
  GAME_HUD_HELP_EVENT,
  GAME_HUD_RESTART_EVENT,
} from './gameHudEvents';
import { triggerHaptic } from './haptics';
import { getBlueprintRuleSet } from './systems/content/islandBlueprint';
import {
  ISLANDS,
} from './constants';
import DailyRewardsModal from './components/modals/DailyRewardsModal';
import DailyQuestsModal from './components/modals/DailyQuestsModal';
import AchievementsModal from './components/modals/AchievementsModal';
import LevelResultModal from './components/LevelResultModal';
import GameRulesModal from './components/GameRulesModal';
import GameActionDock from './components/GameActionDock';
import UnifiedMiniGameHud from './components/UnifiedMiniGameHud';
import { IslandData, LevelData, PlayerData } from './types';
import { AppRouter } from './app/AppRouter';
import { useScreenFlow } from './app/useScreenFlow';
import { useOverlayState } from './app/useOverlayState';
import { usePlayerProgression } from './app/usePlayerProgression';
import {
  GLOBAL_MINIGAME_HUD_DURATION_SECONDS,
  useGameplaySession,
} from './app/useGameplaySession';
import { GameplaySessionEventHandlers, GameplaySessionEventPayload, GameplaySessionState } from './app/gameplaySessionContract';
import { useMiniGameLifecycle } from './app/useMiniGameLifecycle';
import { getBossVisualForLevel } from './bossVisuals';
import { LevelResultState } from './app/types';
import {
  IPHONE_STAGE_HEIGHT,
  IPHONE_STAGE_WIDTH,
  IPAD_STAGE_HEIGHT,
  IPAD_STAGE_WIDTH,
  MAP_LAYOUT_SCREENS,
  QUESTION_MATCH_FRAME_GAMES,
  SCREEN_BEHAVIOR,
} from './app/screenConfig';
import { WellbeingActivityId, WellbeingCompletionState, WellbeingLaunchContext } from './wellbeing/types';
import { createWellbeingRewardLabel } from './wellbeing/integration/wellbeingRewards';
import { shouldSuggestWellbeing, WellbeingSignals } from './wellbeing/integration/wellbeingSuggestion';
import WellbeingCompleteModal from './wellbeing/WellbeingCompleteModal';
import { WELLBEING_BY_ID } from './wellbeing/data';
import { applyTelemetryEvent } from './systems/progression/telemetry';
import { reconcileAchievementState } from './systems/progression/achievementCatalog';

const App: React.FC = () => {
  const [stageScale, setStageScale] = useState(1);

  const {
    screen,
    selectedIsland,
    selectedLevel,
    setScreen,
    setSelectedLevel,
    goToHome,
    goToProfileSetup,
    goToAvatarSelection,
    goToWorldMap,
    goToIslandLevels,
    goToGameplay,
    handleIslandSelect: selectIslandInFlow,
    handleLevelSelect: selectLevelInFlow,
    handleGlobalDockBack,
    goToShop,
    goToAchievements,
    goToParentDashboard,
  } = useScreenFlow();

  const {
    player,
    setPlayer,
    draftName,
    setDraftName,
    hasCompletedProfile,
    dailyRewardsNudge,
    saveProfileName,
    claimDailyReward,
    claimQuest,
    applyGameVictory,
  } = usePlayerProgression();

  const handleUpdatePlayer = useCallback((updater: (prev: PlayerData) => PlayerData) => {
    setPlayer((prev) => {
      const next = updater(prev);
      const achievementState = reconcileAchievementState(next);
      return {
        ...next,
        achievementState,
        achievements: achievementState.earned,
      };
    });
  }, [setPlayer]);

  const {
    showDailyRewards,
    showQuests,
    showAchievements,
    showGameRules,
    gameRulesMode,
    levelResult,
    setShowDailyRewards,
    setShowQuests,
    setShowAchievements,
    setShowGameRules,
    setGameRulesMode,
    setLevelResult,
    closeGameRules,
  } = useOverlayState();

  const [wellbeingActivityId, setWellbeingActivityId] = useState<WellbeingActivityId | null>(null);
  const [wellbeingLaunchContext, setWellbeingLaunchContext] = useState<WellbeingLaunchContext>({ origin: 'manual' });
  const [wellbeingCompletion, setWellbeingCompletion] = useState<WellbeingCompletionState | null>(null);
  const [storedLevelResult, setStoredLevelResult] = useState<LevelResultState | null>(null);
  const [gameplayRestartKey, setGameplayRestartKey] = useState(0);
  const lastIncorrectLifeLossRef = useRef<{ signature: string; at: number }>({ signature: '', at: 0 });
  const levelFailCountsRef = useRef<Record<string, number>>({});
  const [wellbeingSignals, setWellbeingSignals] = useState<WellbeingSignals>({
    consecutiveFails: 0,
    gamesPlayedSinceBreak: 0,
    sessionStartTime: Date.now(),
    lastWellbeingTime: null,
    lastSuggestionTime: null,
  });

  const openWellbeingHub = useCallback((context: WellbeingLaunchContext) => {
    if (context.origin === 'post_fail' && levelResult) {
      setStoredLevelResult(levelResult);
      setLevelResult(null);
    }
    setWellbeingLaunchContext(context);
    setWellbeingActivityId(null);
    setScreen('wellbeing_hub');
  }, [levelResult, setLevelResult, setScreen]);

  const openWellbeingActivity = useCallback((activityId: WellbeingActivityId, context?: Partial<WellbeingLaunchContext>) => {
    const resolvedContext: WellbeingLaunchContext = {
      origin: context?.origin || wellbeingLaunchContext.origin || 'manual',
      islandId: context?.islandId ?? wellbeingLaunchContext.islandId ?? selectedIsland?.id ?? null,
      suggested: context?.suggested ?? wellbeingLaunchContext.suggested,
    };

    if (resolvedContext.origin === 'post_fail' && levelResult) {
      setStoredLevelResult(levelResult);
      setLevelResult(null);
    }

    setWellbeingLaunchContext(resolvedContext);
    setWellbeingActivityId(activityId);
    setScreen('wellbeing_activity');
  }, [levelResult, selectedIsland?.id, setLevelResult, setScreen, wellbeingLaunchContext]);

  const returnFromWellbeing = useCallback(() => {
    setWellbeingActivityId(null);
    setWellbeingCompletion(null);

    if (wellbeingLaunchContext.origin === 'post_fail' && storedLevelResult) {
      setScreen('gameplay');
      setLevelResult(storedLevelResult);
      setStoredLevelResult(null);
      return;
    }

    if (wellbeingLaunchContext.origin === 'island_levels' && selectedIsland) {
      setScreen('island_levels');
      return;
    }

    if (wellbeingLaunchContext.origin === 'gameplay_break') {
      setSelectedLevel(null);
      setScreen('island_levels');
      return;
    }

    setScreen('world_map');
  }, [selectedIsland, setLevelResult, setScreen, setSelectedLevel, storedLevelResult, wellbeingLaunchContext.origin]);

  const handleWellbeingComplete = useCallback(() => {
    if (!wellbeingActivityId) return;

    const nextCalmTokenCount = (player.calmTokens || 0) + 1;
    setPlayer((prev) => ({
      ...prev,
      calmTokens: nextCalmTokenCount,
    }));
    setWellbeingSignals((prev) => ({
      ...prev,
      consecutiveFails: 0,
      gamesPlayedSinceBreak: 0,
      lastWellbeingTime: Date.now(),
      lastSuggestionTime: null,
    }));
    setWellbeingCompletion({
      activityId: wellbeingActivityId,
      rewardLabel: createWellbeingRewardLabel(nextCalmTokenCount),
    });
  }, [player.calmTokens, setPlayer, wellbeingActivityId]);

  const handleGameOver = useCallback((XP: number) => {
    triggerHaptic('error');
    let wellbeingSuggested = false;
    const now = Date.now();
    const levelKey = selectedIsland && selectedLevel ? `${selectedIsland.id}-${selectedLevel.id}` : null;
    let levelFailCount = 0;
    if (levelKey) {
      levelFailCountsRef.current[levelKey] = (levelFailCountsRef.current[levelKey] || 0) + 1;
      levelFailCount = levelFailCountsRef.current[levelKey];
    }
    setWellbeingSignals((prev) => {
      const nextSignals = {
        ...prev,
        consecutiveFails: prev.consecutiveFails + 1,
        gamesPlayedSinceBreak: prev.gamesPlayedSinceBreak + 1,
      };
      wellbeingSuggested = levelFailCount >= 3 || shouldSuggestWellbeing(nextSignals, now);
      return wellbeingSuggested
        ? { ...nextSignals, lastSuggestionTime: now }
        : nextSignals;
    });
    setLevelResult({
      type: 'gameover',
      title: 'Round over',
      subtitle: wellbeingSuggested
        ? 'Three tough rounds in a row. Want to take a minute in a calm break?'
        : 'No rewards lost forever. Reset, tighten the route, and take another shot.',
      XP,
      stars: 0,
      coinsEarned: 0,
      xpEarned: 0,
      achievementsUnlocked: [],
      wellbeingSuggested,
    });
  }, [selectedIsland, selectedLevel, setLevelResult]);

  const handleResetFailCount = useCallback(() => {
    if (!selectedIsland || !selectedLevel) return;
    const levelKey = `${selectedIsland.id}-${selectedLevel.id}`;
    levelFailCountsRef.current[levelKey] = 0;
  }, [selectedIsland, selectedLevel]);

  const {
    globalMiniGameHudTimeLeft,
    globalMiniGameLives,
    consumeLife,
  } = useGameplaySession({
    screen,
    selectedLevel,
    onLifeDepleted: () => handleGameOver(0),
    onTimeDepleted: () => handleGameOver(0),
  });

  useMiniGameLifecycle({ screen, selectedLevel });

  const selectedRuleSet = useMemo(
    () => (
      getBlueprintRuleSet(selectedLevel?.blueprintKey)
      || (selectedLevel?.gameType ? GAME_META[selectedLevel.gameType]?.rules || null : null)
    ),
    [selectedLevel?.blueprintKey, selectedLevel?.gameType],
  );

  const hintRuleSet = useMemo(
    () => (
      selectedLevel?.gameType === 'potion_pour'
        ? {
            title: selectedLevel.displayName || 'Potion Panic',
            summary: 'Tap the right bottles to build the exact potion, then press Brew to check it.',
            bullets: [
              'Watch the target mix and the goal bars for each ingredient.',
              'Add only the ingredients in the recipe and stop when each one reaches its target.',
              'Press Brew when your totals and ratio match the potion you need.',
            ],
          }
      : (
      selectedRuleSet
      || (selectedLevel
        ? {
            title: selectedLevel.displayName || 'How To Play',
            summary: 'Follow the on-screen objective and complete the activity step by step.',
            bullets: [
              'Read the mission text first, then choose, place, or build your answer.',
              'Use the hint button any time you want a reminder of the rules.',
              'If the screen gives you a visual tool or scene object, use that to solve the task.',
            ],
          }
        : null)
      )
    ),
    [selectedLevel, selectedRuleSet],
  );

  useEffect(() => {
    if (dailyRewardsNudge > 0) {
      setShowDailyRewards(true);
    }
  }, [dailyRewardsNudge, setShowDailyRewards]);

  useEffect(() => {
    if (screen === 'profile_setup') {
      setDraftName(player.playerName || '');
    }
  }, [player.playerName, screen, setDraftName]);

  useEffect(() => {
    const updateStageScale = () => {
      const viewportWidth = window.visualViewport?.width ?? window.innerWidth;
      const viewportHeight = window.visualViewport?.height ?? window.innerHeight;
      const ua = navigator.userAgent || '';
      const isIPad = /iPad/i.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
      const isTabletViewport = isIPad || Math.min(viewportWidth, viewportHeight) >= 700;
      const baseWidth = isTabletViewport ? IPAD_STAGE_WIDTH : IPHONE_STAGE_WIDTH;
      const baseHeight = isTabletViewport ? IPAD_STAGE_HEIGHT : IPHONE_STAGE_HEIGHT;
      const rawScale = Math.min(
        viewportWidth / baseWidth,
        viewportHeight / baseHeight,
      );
      const maxScale = isTabletViewport ? 0.9 : 1;
      const scale = Math.min(rawScale, maxScale);
      setStageScale(Number.isFinite(scale) && scale > 0 ? scale : 1);
    };

    const visualViewport = window.visualViewport;
    updateStageScale();
    window.addEventListener('resize', updateStageScale);
    window.addEventListener('orientationchange', updateStageScale);
    visualViewport?.addEventListener('resize', updateStageScale);
    visualViewport?.addEventListener('scroll', updateStageScale);

    return () => {
      window.removeEventListener('resize', updateStageScale);
      window.removeEventListener('orientationchange', updateStageScale);
      visualViewport?.removeEventListener('resize', updateStageScale);
      visualViewport?.removeEventListener('scroll', updateStageScale);
    };
  }, []);

  useEffect(() => {
    const allowVerticalPan = screen === 'world_map' || screen === 'island_levels';
    document.body.style.touchAction = allowVerticalPan ? 'pan-y' : 'none';
    document.body.style.overscrollBehaviorY = allowVerticalPan ? 'contain' : 'none';
  }, [screen]);

  useEffect(() => {
    if (screen !== 'gameplay' || !selectedLevel) return;
    setShowGameRules(false);
    setGameRulesMode('help');
  }, [screen, selectedLevel?.id, setGameRulesMode, setShowGameRules]);

  useEffect(() => {
    const handleOpenHelp = () => {
      if (screen === 'gameplay' && hintRuleSet) {
        setGameRulesMode('help');
        setShowGameRules(true);
      }
    };

    window.addEventListener(GAME_HUD_HELP_EVENT, handleOpenHelp as EventListener);
    return () => {
      window.removeEventListener(GAME_HUD_HELP_EVENT, handleOpenHelp as EventListener);
    };
  }, [hintRuleSet, screen, setGameRulesMode, setShowGameRules]);

  useEffect(() => {
    const handleRestart = () => {
      setGameplayRestartKey((prev) => prev + 1);
    };

    window.addEventListener(GAME_HUD_RESTART_EVENT, handleRestart as EventListener);
    return () => {
      window.removeEventListener(GAME_HUD_RESTART_EVENT, handleRestart as EventListener);
    };
  }, []);

  const handleStartAdventure = () => {
    triggerHaptic('tap');
    if (!player.playerName.trim()) {
      setDraftName('Explorer');
      goToProfileSetup();
      return;
    }

    goToAvatarSelection();
  };

  const handleSaveProfileName = () => {
    triggerHaptic('selection');
    saveProfileName();
    goToAvatarSelection();
  };

  const handleAvatarConfirm = () => {
    triggerHaptic('success');
    goToWorldMap();
  };

  const handleIslandSelect = (island: IslandData) => {
    triggerHaptic('selection');
    selectIslandInFlow(island);
  };

  const handleLevelSelect = (level: LevelData) => {
    triggerHaptic('selection');
    selectLevelInFlow(level);
  };

  const handleGameVictory = (stars: number, XP: number) => {
    triggerHaptic('success');
    setWellbeingSignals((prev) => ({
      ...prev,
      consecutiveFails: 0,
      gamesPlayedSinceBreak: prev.gamesPlayedSinceBreak + 1,
    }));
    handleResetFailCount();
    const result = applyGameVictory(selectedIsland, selectedLevel, stars, XP);
    if (result) setLevelResult(result);
  };

  const handleCloseLevelResult = () => {
    setLevelResult(null);
    setSelectedLevel(null);
    goToIslandLevels();
  };

  const handleRetryLevel = () => {
    setLevelResult(null);
    setGameplayRestartKey((prev) => prev + 1);
    goToGameplay();
  };

  const handleAdvanceAfterVictory = () => {
    if (!selectedIsland || !selectedLevel) {
      setLevelResult(null);
      goToHome();
      return;
    }

    const completedInIsland = player.completedLevels[selectedIsland.id] || [];
    const isSequentialIsland = selectedIsland.id === 1;
    const isLevelConsideredComplete = (levelId: number) => (
      completedInIsland.includes(levelId) || levelId === selectedLevel.id
    );

    const isPlaceValuePanic = selectedLevel.blueprintKey === 'place_value_panic';

    const laneNextLevel = selectedLevel.miniGameKey && selectedLevel.miniGameLevel
      ? selectedIsland.levels.find((level) => (
        level.miniGameKey === selectedLevel.miniGameKey
        && level.miniGameLevel === selectedLevel.miniGameLevel! + 1
      ))
      : undefined;

    const placeValueNextLevel = isPlaceValuePanic
      ? selectedIsland.levels
          .filter((level) => level.blueprintKey === 'place_value_panic')
          .sort((a, b) => ((a.miniGameLevel || a.id) - (b.miniGameLevel || b.id)))
          .find((level) => (
            (level.miniGameLevel || level.id)
            > (selectedLevel.miniGameLevel || selectedLevel.id)
          ))
      : undefined;

    const sequentialNextLevel = selectedIsland.levels.find(level => level.id === selectedLevel.id + 1);
    const nextLevel = placeValueNextLevel || laneNextLevel || sequentialNextLevel;
    setLevelResult(null);

    if (nextLevel) {
      const canEnterNextLevel = nextLevel.isBoss
        ? selectedIsland.levels
            .filter(level => level.id < nextLevel.id)
            .every(level => isLevelConsideredComplete(level.id))
          && (player.stats?.totalCoinsEarned || 0) >= (nextLevel.bossUnlockCoins || 0)
        : isSequentialIsland
          ? nextLevel.miniGameKey && nextLevel.miniGameLevel
            ? selectedIsland.levels
                .filter((level) => (
                  level.miniGameKey === nextLevel.miniGameKey
                  && (level.miniGameLevel || 0) < (nextLevel.miniGameLevel || 0)
                ))
                .every(level => isLevelConsideredComplete(level.id))
            : selectedIsland.levels
                .filter(level => level.id < nextLevel.id)
                .every(level => isLevelConsideredComplete(level.id))
          : true;

      if (!canEnterNextLevel) {
        setSelectedLevel(null);
        goToIslandLevels();
        return;
      }

      setSelectedLevel(nextLevel);
      goToGameplay();
      return;
    }

    setSelectedLevel(null);
    goToHome();
  };

  const handleClaimDailyReward = (reward: { type: string; amount: number }) => {
    triggerHaptic('success');
    claimDailyReward(reward);
    setShowDailyRewards(false);
  };

  const handleClaimQuest = (questId: string) => {
    const quest = player.dailyQuests.find(q => q.id === questId);
    if (!quest || quest.isClaimed || quest.current < quest.target) return;
    triggerHaptic('success');
    claimQuest(questId);
  };

  const sessionState: GameplaySessionState = useMemo(() => ({
    timeLeft: globalMiniGameHudTimeLeft,
    totalTime: GLOBAL_MINIGAME_HUD_DURATION_SECONDS,
    lives: globalMiniGameLives,
  }), [globalMiniGameHudTimeLeft, globalMiniGameLives]);

  const buildTelemetryContext = useCallback((event?: GameplaySessionEventPayload) => {
    const durationSec = sessionState.totalTime && sessionState.timeLeft >= 0
      ? Math.max(0, Math.round(sessionState.totalTime - sessionState.timeLeft))
      : undefined;
    return {
      gameType: event?.gameType ?? selectedLevel?.gameType,
      levelId: event?.levelId ?? selectedLevel?.id,
      blueprintKey: selectedLevel?.blueprintKey,
      skillTags: selectedLevel?.skillTags,
      score: typeof event?.score === 'number' ? event?.score : undefined,
      durationSec,
    };
  }, [selectedLevel?.blueprintKey, selectedLevel?.gameType, selectedLevel?.id, selectedLevel?.skillTags, sessionState.timeLeft, sessionState.totalTime]);

  const recordTelemetryEvent = useCallback((type: 'correct_answer' | 'incorrect_answer' | 'game_complete' | 'game_failed', event?: GameplaySessionEventPayload) => {
    const context = buildTelemetryContext(event);
    setPlayer((prev) => {
      const next = applyTelemetryEvent(prev, type, context);
      const achievementState = reconcileAchievementState(next);
      return {
        ...next,
        achievementState,
        achievements: achievementState.earned,
      };
    });
  }, [buildTelemetryContext, setPlayer]);

  const sessionEvents: GameplaySessionEventHandlers = useMemo(() => ({
    onCorrectAnswer: (event) => {
      triggerHaptic('selection');
      recordTelemetryEvent('correct_answer', event);
    },
    onIncorrectAnswer: (event) => {
      triggerHaptic('error');
      recordTelemetryEvent('incorrect_answer', event);
      if (screen === 'gameplay') {
        const metadataKey = JSON.stringify(event.metadata ?? {});
        const signature = `${event.gameType ?? 'unknown'}:${event.levelId ?? 'unknown'}:${metadataKey}`;
        const now = Date.now();
        const isDuplicateBurst =
          lastIncorrectLifeLossRef.current.signature === signature
          && now - lastIncorrectLifeLossRef.current.at < 300;

        if (isDuplicateBurst) return;

        lastIncorrectLifeLossRef.current = { signature, at: now };
        consumeLife(1);
      }
    },
    onPuzzleComplete: () => {
      triggerHaptic('selection');
    },
    onGameComplete: (event) => {
      triggerHaptic('success');
      recordTelemetryEvent('game_complete', event);
    },
    onGameFailed: (event) => {
      triggerHaptic('error');
      recordTelemetryEvent('game_failed', event);
    },
  }), [consumeLife, recordTelemetryEvent, screen]);

  const screenBehavior = SCREEN_BEHAVIOR[screen];
  const backgroundIntensityClass = screenBehavior.family === 'hub'
    ? 'bg-intensity-hub'
    : screenBehavior.family === 'game'
      ? 'bg-intensity-game'
      : 'bg-intensity-overlay';
  const isWellbeingScreen = screen === 'wellbeing_hub' || screen === 'wellbeing_activity';
  const isSplashScreen = screen === 'splash';
  const isStartScreen = isSplashScreen || screen === 'profile_setup' || screen === 'avatar_selection';
  const isAvatarSelectionScreen = screen === 'avatar_selection';
  const isGameplayScreen = screen === 'gameplay';
  const isMapLayoutScreen = MAP_LAYOUT_SCREENS.includes(screen);
  const isWorldMapScreen = screen === 'world_map';
  const selectedGameType = selectedLevel?.gameType;
  const activeBossArt = useMemo(
    () => getBossVisualForLevel(selectedLevel?.gameType, selectedLevel?.id),
    [selectedLevel?.gameType, selectedLevel?.id],
  );
  const shouldShowResultEnemyArt = false;
  const gameplayTypeClass = selectedGameType ? `game-type-${selectedGameType.replace(/_/g, '-')}` : '';
  const usesQuestionMatchFrame = Boolean(selectedGameType && QUESTION_MATCH_FRAME_GAMES.includes(selectedGameType));
  const useUnboundedStageShell = isSplashScreen || isAvatarSelectionScreen || isWorldMapScreen;
  const globalDockOffsetClass = screen !== 'splash' && !isGameplayScreen
    ? 'pb-[calc(5rem+env(safe-area-inset-bottom))] md:pb-[calc(5.2rem+env(safe-area-inset-bottom))]'
    : '';
  const viewportShellClass = isGameplayScreen
    ? 'sat-shell-standard bg-transparent'
    : isWorldMapScreen
    ? 'sat-shell-map licensed-playfield-bg bg-transparent pb-[env(safe-area-inset-bottom)]'
    : useUnboundedStageShell
      ? 'sat-shell-standard licensed-playfield-bg bg-transparent'
      : isMapLayoutScreen
      ? 'sat-shell-map licensed-playfield-bg bg-transparent pb-[env(safe-area-inset-bottom)]'
      : 'sat-shell-standard licensed-playfield-bg bg-transparent px-3 pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)] md:px-8 md:pt-[max(1rem,env(safe-area-inset-top))] md:pb-[max(1rem,env(safe-area-inset-bottom))]';
  const contentShellClass = isGameplayScreen
    ? 'sat-screen-full-bleed items-stretch'
    : useUnboundedStageShell
    ? 'sat-screen-full-bleed items-stretch'
    : isWorldMapScreen
      ? 'sat-screen-full-bleed items-stretch'
      : isMapLayoutScreen
      ? 'sat-screen-map-content'
      : 'sat-screen-standard-content items-stretch';
  const useFlatScreenScaleTransition = isAvatarSelectionScreen;
  const screenEnterScale = useFlatScreenScaleTransition ? 1 : 0.98;
  const screenExitScale = useFlatScreenScaleTransition ? 1 : 1.02;
  const hideShellTimer = !isGameplayScreen
    || (selectedLevel?.gameType === 'mean_machine' && selectedLevel.blueprintKey === 'mean_machine')
    || selectedLevel?.gameType === 'potion_pour';
  const isTabletStage = typeof window !== 'undefined' && (() => {
    const viewportWidth = window.visualViewport?.width ?? window.innerWidth;
    const viewportHeight = window.visualViewport?.height ?? window.innerHeight;
    const ua = navigator.userAgent || '';
    const isIPad = /iPad/i.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    return isIPad || Math.min(viewportWidth, viewportHeight) >= 700;
  })();
  const stageStyle = {
    '--game-stage-width': `${isTabletStage ? IPAD_STAGE_WIDTH : IPHONE_STAGE_WIDTH}px`,
    '--game-stage-height': `${isTabletStage ? IPAD_STAGE_HEIGHT : IPHONE_STAGE_HEIGHT}px`,
    '--game-stage-scale': `${stageScale}`,
  } as React.CSSProperties;

  return (
    <div className="iphone-game-viewport">
      <div className={`iphone-game-stage${useUnboundedStageShell ? ' iphone-game-stage-unbounded' : ''}`} style={useUnboundedStageShell ? undefined : stageStyle}>
        <div className="iphone-game-stage-inner">
          <div
            data-screen-family={screenBehavior.family}
            className={`app-viewport sat-theme-bluegold app-background-intensity ${backgroundIntensityClass} app-shell-family-${screenBehavior.family} screen-${screen.replace(/_/g, '-')} ${isGameplayScreen ? gameplayTypeClass : ''} relative w-full flex flex-col items-center overflow-hidden ${viewportShellClass}`}
          >
            <AnimatePresence mode="wait">
              <motion.div
                key={screen}
                initial={{ opacity: 0, scale: screenEnterScale }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: screenExitScale }}
                data-qa-root="screen"
                data-qa-screen={screen}
                data-qa-scrollable={screenBehavior.scrollable ? 'true' : 'false'}
                className={`app-screen-content relative z-10 flex min-h-0 w-full flex-1 justify-center pointer-events-auto ${screenBehavior.scrollable ? 'overflow-y-auto overflow-x-hidden' : 'overflow-hidden'} ${contentShellClass} ${globalDockOffsetClass}`}
                style={screenBehavior.scrollable ? { WebkitOverflowScrolling: 'touch' } : undefined}
              >
                <AppRouter
                  screen={screen}
                  player={player}
                  draftName={draftName}
                  setDraftName={setDraftName}
                  selectedIsland={selectedIsland}
                  selectedLevel={selectedLevel}
                  selectedRuleSet={selectedRuleSet}
                  hintRuleSet={hintRuleSet}
                  gameplayTypeClass={gameplayTypeClass}
                  gameplayRestartKey={gameplayRestartKey}
                  usesQuestionMatchFrame={usesQuestionMatchFrame}
                  globalMiniGameHudTimeLeft={globalMiniGameHudTimeLeft}
                  globalMiniGameLives={globalMiniGameLives}
                  globalMiniGameHudDurationSeconds={GLOBAL_MINIGAME_HUD_DURATION_SECONDS}
                  sessionState={sessionState}
                  sessionEvents={sessionEvents}
                  onStartAdventure={handleStartAdventure}
                  onSaveProfileName={handleSaveProfileName}
                  onAvatarSelect={(id) => setPlayer(prev => ({ ...prev, avatarId: id }))}
                  onAvatarConfirm={handleAvatarConfirm}
                  onGoHome={goToHome}
                  onBackToSplash={() => setScreen('splash')}
                  onSelectIsland={handleIslandSelect}
                  onSelectLevel={handleLevelSelect}
                  onBackToIslandLevels={goToIslandLevels}
                  onOpenWellbeingHub={() => openWellbeingHub({ origin: screen === 'world_map' ? 'world_map' : 'manual', islandId: selectedIsland?.id ?? null })}
                  onOpenWellbeingActivity={(activityId) => openWellbeingActivity(activityId, { origin: screen === 'island_levels' ? 'island_levels' : wellbeingLaunchContext.origin, islandId: selectedIsland?.id ?? null })}
                  onExitWellbeing={returnFromWellbeing}
                  onCompleteWellbeingActivity={handleWellbeingComplete}
                  wellbeingActivityId={wellbeingActivityId}
                  calmTokens={player.calmTokens || 0}
                  onGameplayVictory={handleGameVictory}
                  onGameplayOver={handleGameOver}
                  onOpenShop={goToShop}
                  onOpenAchievements={goToAchievements}
                  onOpenParentReport={goToParentDashboard}
                  onUpdatePlayer={handleUpdatePlayer}
                />

                {null}
              </motion.div>
            </AnimatePresence>

            {!isStartScreen && !isMapLayoutScreen ? (
              <UnifiedMiniGameHud
                avatarId={player.avatarId}
                timeLeft={globalMiniGameHudTimeLeft}
                totalTime={GLOBAL_MINIGAME_HUD_DURATION_SECONDS}
                lives={globalMiniGameLives}
                hideTimer={hideShellTimer}
                onBack={isGameplayScreen ? goToIslandLevels : handleGlobalDockBack}
                variant={isGameplayScreen ? 'gameplay' : 'hub'}
              />
            ) : null}

            <DailyRewardsModal
              isOpen={showDailyRewards}
              onClose={() => setShowDailyRewards(false)}
              Combo={player.dailyStreak}
              claimedToday={player.claimedDailyRewardToday}
              onClaim={handleClaimDailyReward}
            />

            <DailyQuestsModal
              isOpen={showQuests}
              onClose={() => setShowQuests(false)}
              quests={player.dailyQuests}
              onClaimQuest={handleClaimQuest}
            />

            <AchievementsModal
              isOpen={showAchievements}
              onClose={() => setShowAchievements(false)}
              player={player}
            />

            <LevelResultModal
              isOpen={Boolean(levelResult)}
              enemyArt={shouldShowResultEnemyArt ? (activeBossArt || undefined) : undefined}
              result={levelResult ? {
                ...levelResult,
                primaryLabel: levelResult.type === 'victory' ? 'Continue adventure' : 'Try again',
                onPrimary: levelResult.type === 'victory' ? handleAdvanceAfterVictory : handleRetryLevel,
                secondaryLabel: levelResult.type === 'victory' ? 'Replay level' : 'Level select',
                onSecondary: levelResult.type === 'victory' ? handleRetryLevel : handleCloseLevelResult,
                tertiaryLabel: levelResult.type === 'gameover' && levelResult.wellbeingSuggested ? 'Take A Calm Break' : undefined,
                onTertiary: levelResult.type === 'gameover' && levelResult.wellbeingSuggested
                  ? () => openWellbeingHub({ origin: 'post_fail', islandId: selectedIsland?.id ?? null, suggested: true })
                  : undefined,
              } : null}
            />

            <GameRulesModal
              isOpen={showGameRules}
              onClose={closeGameRules}
              rules={hintRuleSet}
              actionLabel={gameRulesMode === 'start' ? 'Start Game' : 'Back To Game'}
              secondaryActionLabel={screen === 'gameplay' ? 'Leave For Calm Break' : undefined}
              onSecondaryAction={screen === 'gameplay'
                ? () => {
                    closeGameRules();
                    openWellbeingHub({ origin: 'gameplay_break', islandId: selectedIsland?.id ?? null });
                  }
                : undefined}
            />

            <WellbeingCompleteModal
              isOpen={Boolean(wellbeingCompletion)}
              title={wellbeingCompletion ? WELLBEING_BY_ID[wellbeingCompletion.activityId]?.title || 'Calm break' : 'Calm break'}
              rewardLabel={wellbeingCompletion?.rewardLabel || ''}
              onContinue={returnFromWellbeing}
              onPlayAnother={() => {
                setWellbeingCompletion(null);
                setWellbeingActivityId(null);
                setScreen('wellbeing_hub');
              }}
              onBackToHub={() => {
                setWellbeingCompletion(null);
                setWellbeingActivityId(null);
                setScreen('wellbeing_hub');
              }}
            />

            {null}

          </div>
        </div>
      </div>
    </div>
  );
};

export default App;




