import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { GAME_META, GameRuleSet } from './gameMeta';
import { getLevelGameTitle } from './utils/gameNames';
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
import LevelResultsModal from './components/results/LevelResultsModal';
import GameRulesModal from './components/GameRulesModal';
import GameActionDock from './components/GameActionDock';
import UnifiedMiniGameHud from './components/UnifiedMiniGameHud';
import AssetIcon from './components/AssetIcon';
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
import { useProgressionStore } from './store/useProgressionStore';
import { LevelProgress } from './lib/progression/types';
import { CACHE_BUSTER } from './cacheBuster';

const App: React.FC = () => {
  const [stageScale, setStageScale] = useState(1);
  const [questionCardScale, setQuestionCardScale] = useState(1);
  const [potionCauldronShift, setPotionCauldronShift] = useState('0px');
  const buildId = import.meta.env.VITE_BUILD_ID ?? CACHE_BUSTER;

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

  const canonicalGameTitle = getLevelGameTitle(selectedLevel);

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

  const {
    player: progressionPlayer,
    levels: progressionLevels,
    completeLevel: completeProgressionLevel,
    hydrateFromLegacy,
    setAvatarId: setProgressionAvatarId,
  } = useProgressionStore();

  const [sessionMetrics, setSessionMetrics] = useState({
    correct: 0,
    incorrect: 0,
    hintsUsed: 0,
  });

  const resetSessionMetrics = useCallback(() => {
    setSessionMetrics({ correct: 0, incorrect: 0, hintsUsed: 0 });
  }, []);

  const mapProgressionToPlayer = useCallback((levels: Record<string, LevelProgress>) => {
    const completedLevels: Record<number, number[]> = {};
    const levelStars: Record<string, number> = {};
    let totalStars = 0;

    Object.values(levels).forEach((progress) => {
      const [islandIdRaw, levelIdRaw] = progress.levelId.split('-');
      const islandId = Number(islandIdRaw);
      const levelId = Number(levelIdRaw);
      if (!Number.isFinite(islandId) || !Number.isFinite(levelId)) return;

      if (progress.completed) {
        if (!completedLevels[islandId]) completedLevels[islandId] = [];
        if (!completedLevels[islandId].includes(levelId)) {
          completedLevels[islandId].push(levelId);
        }
      }

      levelStars[`${islandId}-${levelId}`] = progress.bestStars;
      totalStars += progress.bestStars;
    });

    return { completedLevels, levelStars, totalStars };
  }, []);

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

  useEffect(() => {
    hydrateFromLegacy({
      levelStars: player.levelStars || {},
      completedLevels: player.completedLevels || {},
      playerLevel: player.level,
      playerXp: player.xp,
    });
  }, [hydrateFromLegacy, player.completedLevels, player.level, player.levelStars, player.xp]);

  useEffect(() => {
    if (player.avatarId && player.avatarId !== progressionPlayer.avatarId) {
      setProgressionAvatarId(player.avatarId);
    }
  }, [player.avatarId, progressionPlayer.avatarId, setProgressionAvatarId]);

  useEffect(() => {
    const mapped = mapProgressionToPlayer(progressionLevels);
    setPlayer((prev) => {
      const next = {
        ...prev,
        level: progressionPlayer.level,
        xp: progressionPlayer.currentXp,
        completedLevels: mapped.completedLevels,
        levelStars: mapped.levelStars,
        stats: {
          ...prev.stats,
          totalStars: mapped.totalStars,
        },
      };

      const shouldUpdate = (
        prev.level !== next.level
        || prev.xp !== next.xp
        || JSON.stringify(prev.completedLevels) !== JSON.stringify(next.completedLevels)
        || JSON.stringify(prev.levelStars) !== JSON.stringify(next.levelStars)
        || (prev.stats?.totalStars || 0) !== (next.stats?.totalStars || 0)
      );

      return shouldUpdate ? next : prev;
    });
  }, [mapProgressionToPlayer, progressionLevels, progressionPlayer.currentXp, progressionPlayer.level, setPlayer]);

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
  const handleGameOverRef = useRef<(XP: number) => void>(() => {});
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

  const {
    globalMiniGameHudTimeLeft,
    globalMiniGameLives,
    consumeLife,
  } = useGameplaySession({
    screen,
    selectedLevel,
    onLifeDepleted: () => handleGameOverRef.current(0),
    onTimeDepleted: () => handleGameOverRef.current(0),
  });

  useMiniGameLifecycle({ screen, selectedLevel });

  const sessionState: GameplaySessionState = useMemo(() => ({
    timeLeft: globalMiniGameHudTimeLeft,
    totalTime: GLOBAL_MINIGAME_HUD_DURATION_SECONDS,
    lives: globalMiniGameLives,
  }), [globalMiniGameHudTimeLeft, globalMiniGameLives]);

  const resolveLevelTitle = useCallback(() => {
    if (!selectedLevel) return 'Round over';
    if (canonicalGameTitle) return canonicalGameTitle;
    return 'Round over';
  }, [canonicalGameTitle]);

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
    if (!selectedIsland || !selectedLevel) return;

    const totalAttempts = sessionMetrics.correct + sessionMetrics.incorrect;
    const accuracy = totalAttempts > 0 ? sessionMetrics.correct / totalAttempts : 0;
    const timeMs = Math.max(0, (sessionState.totalTime - sessionState.timeLeft) * 1000);
    const progressionResult = completeProgressionLevel({
      levelId: levelKey!,
      completed: false,
      score: XP,
      accuracy,
      hintsUsed: sessionMetrics.hintsUsed,
      livesRemaining: sessionState.lives,
      mistakes: sessionMetrics.incorrect,
      timeMs,
    });

    const levelTitle = resolveLevelTitle();
    setLevelResult({
      type: 'gameover',
      title: levelTitle,
      subtitle: wellbeingSuggested
        ? 'Three tough rounds in a row. Want to take a minute in a calm break?'
        : 'No rewards lost forever. Reset, tighten the route, and take another shot.',
      stars: progressionResult.stars,
      xpGained: progressionResult.xpGained,
      bonuses: progressionResult.bonuses,
      previousLevel: progressionResult.previousLevel,
      newLevel: progressionResult.newLevel,
      previousXp: progressionResult.previousXp,
      currentXp: progressionResult.currentXp,
      xpRequiredForNextLevel: progressionResult.xpRequiredForNextLevel,
      leveledUp: progressionResult.leveledUp,
      accuracy,
      hintsUsed: sessionMetrics.hintsUsed,
      mistakes: sessionMetrics.incorrect,
      timeMs,
      completed: false,
      coinsEarned: 0,
      xpEarned: progressionResult.xpGained,
      achievementsUnlocked: [],
      wellbeingSuggested,
    });
  }, [completeProgressionLevel, resolveLevelTitle, selectedIsland, selectedLevel, sessionMetrics.correct, sessionMetrics.hintsUsed, sessionMetrics.incorrect, sessionState.lives, sessionState.timeLeft, sessionState.totalTime, setLevelResult]);

  useEffect(() => {
    handleGameOverRef.current = handleGameOver;
  }, [handleGameOver]);

  const handleResetFailCount = useCallback(() => {
    if (!selectedIsland || !selectedLevel) return;
    const levelKey = `${selectedIsland.id}-${selectedLevel.id}`;
    levelFailCountsRef.current[levelKey] = 0;
  }, [selectedIsland, selectedLevel]);

  useEffect(() => {
    if (screen === 'gameplay' && selectedLevel) {
      resetSessionMetrics();
    }
  }, [gameplayRestartKey, resetSessionMetrics, screen, selectedLevel?.id]);

  const selectedRuleSet = useMemo(
    () => (
      (selectedLevel?.gameType ? GAME_META[selectedLevel.gameType]?.rules || null : null)
      || getBlueprintRuleSet(selectedLevel?.blueprintKey)
    ),
    [selectedLevel?.blueprintKey, selectedLevel?.gameType],
  );

  const buildKidRules = useCallback((rules: GameRuleSet | null) => {
    if (!rules) return null;
    const combined = `${rules.summary} ${rules.bullets.join(' ')}`.toLowerCase();
    const line1 = 'Read the question at the top.';
    let line2 = 'Use the tools on screen to find the answer.';
    let line3 = 'Tap the main button when you are ready.';

    if (combined.includes('drag') || combined.includes('drop') || combined.includes('place')) {
      line2 = 'Drag items to the right spot.';
    } else if (combined.includes('swap') || combined.includes('match')) {
      line2 = 'Swap tiles to make a match.';
    } else if (combined.includes('tap') && !combined.includes('drag')) {
      line2 = 'Tap the right choice.';
    }

    if (combined.includes('angle') || combined.includes('launch') || combined.includes('fire')) {
      line2 = 'Choose the angle, then fire.';
    }
    if (combined.includes('ratio')) {
      line2 = 'Use the ratio to build the correct mix.';
    }
    if (combined.includes('graph') || combined.includes('chart')) {
      line2 = 'Read the chart, then choose the correct answer.';
    }
    if (combined.includes('time')) {
      line2 = 'Set the time to match the question.';
    }
    if (combined.includes('measure') || combined.includes('scale') || combined.includes('weight')) {
      line2 = 'Add the right amounts to match the target.';
    }
    if (combined.includes('check')) {
      line3 = 'Tap Check when you are ready.';
    }

    return {
      title: rules.title,
      summary: `Here is how to play ${rules.title}.`,
      bullets: [line1, line2, line3],
    };
  }, []);

  const hintRuleSet = useMemo(
    () => {
      const baseRules = selectedLevel?.blueprintKey === 'place_value_panic'
        ? {
            title: canonicalGameTitle || 'Place Value Panic',
            summary: 'Sort the digits into the correct place-value slots to build the target number.',
            bullets: [
              'Read the number at the top and check each place-value column.',
              'Drag the digits into the correct column slots.',
              'When every digit is in the right place, the round clears.',
            ],
          }
        : selectedLevel?.gameType === 'potion_pour'
        ? {
            title: canonicalGameTitle || 'Potion Panic',
            summary: 'Tap the right bottles to build the exact potion, then press Brew to check it.',
            bullets: [
              'Watch the target mix and the goal bars for each ingredient.',
              'Add only the ingredients in the recipe and stop when each one reaches its target.',
              'Press Brew when your totals and ratio match the potion you need.',
            ],
          }
          : (selectedRuleSet || (selectedLevel
            ? {
                title: canonicalGameTitle || 'How To Play',
                summary: 'Follow the on-screen objective and complete the activity step by step.',
                bullets: [
                'Read the mission text first, then choose, place, or build your answer.',
                'Use the hint button any time you want a reminder of the rules.',
                'If the screen gives you a visual tool or scene object, use that to solve the task.',
              ],
            }
            : null));
      if (!baseRules) return null;
      const titleOverride = canonicalGameTitle?.trim();
      const resolvedRules = titleOverride
        ? { ...baseRules, title: titleOverride }
        : baseRules;
      return buildKidRules(resolvedRules);
    },
    [buildKidRules, selectedLevel, selectedRuleSet],
  );

  useEffect(() => {
    if (dailyRewardsNudge > 0) {
      setShowDailyRewards(true);
    }
  }, [dailyRewardsNudge, setShowDailyRewards]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!buildId) return;
    try {
      const storageKey = 'sats_legends_build_id';
      const previous = window.localStorage.getItem(storageKey);
      if (previous && previous !== buildId) {
        window.localStorage.setItem(storageKey, buildId);
        const reload = () => window.location.reload();
        if ('caches' in window) {
          caches
            .keys()
            .then((keys) => Promise.all(keys.map((key) => caches.delete(key))))
            .finally(reload);
        } else {
          reload();
        }
        return;
      }
      window.localStorage.setItem(storageKey, buildId);
    } catch {
      // Ignore storage/cache errors to avoid blocking render.
    }
  }, [buildId]);

  useEffect(() => {
    if (screen === 'profile_setup') {
      setDraftName(player.playerName || '');
    }
  }, [player.playerName, screen, setDraftName]);

  useEffect(() => {
    const updateStageScale = () => {
      const viewportWidth = window.visualViewport?.width ?? window.innerWidth;
      const viewportHeight = window.visualViewport?.height ?? window.innerHeight;
      const baseWidth = IPHONE_STAGE_WIDTH;
      const baseHeight = IPHONE_STAGE_HEIGHT;
      const rawScale = Math.min(
        viewportWidth / baseWidth,
        viewportHeight / baseHeight,
      );
      const isTabletViewport = Math.min(viewportWidth, viewportHeight) >= 700;
      const scale = rawScale * (isTabletViewport ? 0.95 : 1);
      setStageScale(Number.isFinite(scale) && scale > 0 ? scale : 1);
      setQuestionCardScale(isTabletViewport ? 0.92 : 1);
        setPotionCauldronShift(isTabletViewport ? '28px' : '0px');
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
    if (screen !== 'gameplay' || !selectedLevel || !hintRuleSet) return;
    if (selectedLevel.blueprintKey === 'rounding_rocket') return;
    const miniLevel = selectedLevel.miniGameLevel ?? selectedLevel.id;
    if (miniLevel > 3) return;
    setGameRulesMode('start');
    setShowGameRules(true);
  }, [screen, selectedLevel?.id, selectedLevel?.miniGameLevel, hintRuleSet, setGameRulesMode, setShowGameRules]);

  useEffect(() => {
    const handleOpenHelp = () => {
      if (screen === 'gameplay' && hintRuleSet) {
        setGameRulesMode('help');
        setShowGameRules(true);
        setSessionMetrics((prev) => ({ ...prev, hintsUsed: prev.hintsUsed + 1 }));
      }
    };

    window.addEventListener(GAME_HUD_HELP_EVENT, handleOpenHelp as EventListener);
    return () => {
      window.removeEventListener(GAME_HUD_HELP_EVENT, handleOpenHelp as EventListener);
    };
  }, [hintRuleSet, screen, setGameRulesMode, setSessionMetrics, setShowGameRules]);

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
    if (!selectedIsland || !selectedLevel) return;

    const totalAttempts = sessionMetrics.correct + sessionMetrics.incorrect;
    const fallbackAccuracy = stars >= 3 ? 1 : stars === 2 ? 0.85 : stars === 1 ? 0.65 : 0.5;
    const accuracy = totalAttempts > 0 ? sessionMetrics.correct / totalAttempts : fallbackAccuracy;
    const timeMs = Math.max(0, (sessionState.totalTime - sessionState.timeLeft) * 1000);
    const levelKey = `${selectedIsland.id}-${selectedLevel.id}`;
    const progressionResult = completeProgressionLevel({
      levelId: levelKey,
      completed: true,
      score: XP,
      accuracy,
      hintsUsed: sessionMetrics.hintsUsed,
      livesRemaining: sessionState.lives,
      mistakes: sessionMetrics.incorrect,
      timeMs,
    });

    const totalStarsEarned = useProgressionStore.getState().totalStars;
    const result = applyGameVictory(
      selectedIsland,
      selectedLevel,
      progressionResult,
      {
        score: XP,
        accuracy,
        hintsUsed: sessionMetrics.hintsUsed,
        mistakes: sessionMetrics.incorrect,
        timeMs,
      },
      totalStarsEarned,
    );

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
      setSessionMetrics((prev) => ({ ...prev, correct: prev.correct + 1 }));
      recordTelemetryEvent('correct_answer', event);
    },
    onIncorrectAnswer: (event) => {
      triggerHaptic('error');
      setSessionMetrics((prev) => ({ ...prev, incorrect: prev.incorrect + 1 }));
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
  }), [consumeLife, recordTelemetryEvent, screen, setSessionMetrics]);

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
  const gameplayTypeClass = selectedGameType ? `game-type-${selectedGameType.replace(/_/g, '-')}` : '';
  const usesQuestionMatchFrame = Boolean(selectedGameType && QUESTION_MATCH_FRAME_GAMES.includes(selectedGameType));
  const useUnboundedStageShell = false;
  const globalDockOffsetClass = screen !== 'splash' && !isGameplayScreen
    ? 'pb-[5rem] md:pb-[5.2rem]'
    : '';
  const viewportShellClass = isGameplayScreen
    ? 'sat-shell-standard bg-transparent'
    : isWorldMapScreen
    ? 'sat-shell-map licensed-playfield-bg bg-transparent pt-3 pb-3'
    : useUnboundedStageShell
      ? 'sat-shell-standard licensed-playfield-bg bg-transparent'
      : isMapLayoutScreen
      ? 'sat-shell-map licensed-playfield-bg bg-transparent pt-3 pb-3'
      : 'sat-shell-standard licensed-playfield-bg bg-transparent px-3 pt-3 pb-3 md:px-8 md:pt-4 md:pb-4';
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
    || selectedLevel?.gameType === 'potion_pour';
  const goToProfile = useCallback(() => {
    setScreen('profile');
  }, [setScreen]);
  const mapDockButtonClass = [
    'inline-flex items-center justify-center border text-slate-100',
    'border-cyan-100/40 bg-[linear-gradient(180deg,rgba(75,137,232,0.9)_0%,rgba(45,102,194,0.9)_54%,rgba(29,75,153,0.92)_100%)]',
    'shadow-[0_6px_12px_rgba(2,6,23,0.33),inset_0_1px_0_rgba(255,255,255,0.26)]',
    'transition-[transform,filter,box-shadow,background] duration-150 ease-out',
    'hover:brightness-105 active:translate-y-[1px] active:brightness-95',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-200 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0b1e4e]',
    'h-[42px] w-[42px] rounded-[0.85rem]',
  ].join(' ');
  const mapDockIconClass = 'h-[18px] w-[18px] drop-shadow-[0_2px_2px_rgba(0,0,0,0.26)]';
  const mapHudDock = screen === 'world_map'
    ? (
      <div className="mt-0.5 flex shrink-0 items-center justify-center">
        <div className="relative shrink-0 rounded-[1.15rem] border border-cyan-100/26 bg-[linear-gradient(180deg,rgba(16,40,96,0.84)_0%,rgba(9,24,64,0.88)_100%)] px-2 py-1.5 shadow-[0_10px_18px_rgba(2,6,23,0.38),inset_0_1px_0_rgba(255,255,255,0.08)] backdrop-blur-[2px]">
          <div className="pointer-events-none absolute inset-[1px] rounded-[1.05rem] border border-cyan-100/14" />
          <div className="pointer-events-none absolute inset-x-3 top-[3px] h-3 rounded-full bg-cyan-200/10 blur-[2px]" />

          <div className="relative grid grid-cols-3 gap-1.5">
            <button
              type="button"
              onClick={goToParentDashboard}
              className={mapDockButtonClass}
              aria-label="Open parent portal"
            >
              <AssetIcon name="people" className={mapDockIconClass} />
            </button>
            <button
              type="button"
              onClick={goToProfile}
              className={mapDockButtonClass}
              aria-label="Open player stats"
            >
              <AssetIcon name="user" className={mapDockIconClass} />
            </button>
            <button
              type="button"
              onClick={goToAchievements}
              className={mapDockButtonClass}
              aria-label="Open achievements"
            >
              <AssetIcon name="trophy" className={mapDockIconClass} />
            </button>
          </div>
        </div>
      </div>
    )
    : null;
  const stageWidth = IPHONE_STAGE_WIDTH;
  const stageHeight = IPHONE_STAGE_HEIGHT;
  const stageStyle = {
    '--game-stage-width': `${stageWidth}px`,
    '--game-stage-height': `${stageHeight}px`,
    '--game-stage-scale': `${stageScale}`,
    '--question-card-scale': `${questionCardScale}`,
    '--potion-cauldron-shift': potionCauldronShift,
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

            {!isStartScreen ? (
              <UnifiedMiniGameHud
                avatarId={player.avatarId}
                timeLeft={globalMiniGameHudTimeLeft}
                totalTime={GLOBAL_MINIGAME_HUD_DURATION_SECONDS}
                lives={globalMiniGameLives}
                hideTimer={hideShellTimer}
                hideTopBar={screen === 'world_map' || screen === 'island_levels'}
                onBack={isGameplayScreen ? goToIslandLevels : handleGlobalDockBack}
                variant={isGameplayScreen ? 'gameplay' : 'hub'}
                bottomContent={mapHudDock || undefined}
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

            <LevelResultsModal
              isOpen={Boolean(levelResult)}
              result={levelResult ? {
                type: levelResult.type,
                title: levelResult.title,
                subtitle: levelResult.subtitle,
                stars: levelResult.stars as 0 | 1 | 2 | 3,
                xpGained: levelResult.xpGained,
                bonuses: levelResult.bonuses,
                previousLevel: levelResult.previousLevel,
                newLevel: levelResult.newLevel,
                previousXp: levelResult.previousXp,
                currentXp: levelResult.currentXp,
                xpRequiredForNextLevel: levelResult.xpRequiredForNextLevel,
                leveledUp: levelResult.leveledUp,
              } : null}
              onRetry={handleRetryLevel}
              onNext={levelResult?.type === 'victory' ? handleAdvanceAfterVictory : undefined}
              onMap={handleCloseLevelResult}
              calmBreakLabel={levelResult?.type === 'gameover' && levelResult.wellbeingSuggested ? 'Take A Calm Break' : undefined}
              onCalmBreak={levelResult?.type === 'gameover' && levelResult.wellbeingSuggested
                ? () => openWellbeingHub({ origin: 'post_fail', islandId: selectedIsland?.id ?? null, suggested: true })
                : undefined}
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




