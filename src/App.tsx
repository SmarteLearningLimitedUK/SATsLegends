import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { TreePine } from 'lucide-react';
import { GAME_META, GameRuleSet } from './gameMeta';
import { getLevelGameTitle } from './utils/gameNames';
import { GAME_HUD_RESTART_EVENT } from './gameHudEvents';
import { triggerHaptic } from './haptics';
import { getBlueprintRuleSet } from './systems/content/islandBlueprint';
import { getLearnerGuide } from './systems/content/learnerGuides';
import { LearnerGuideContext } from './components/game-ui/LearnerGuideContext';
import { isBossEncounterGameType } from './games/bossEncounterTypes';
import { getLevelProgressIds } from './systems/content/gameDifficulty';
import {
  ISLANDS,
} from './constants';
import DailyQuestsModal from './components/modals/DailyQuestsModal';
import AchievementsModal from './components/modals/AchievementsModal';
import LevelResultsModal from './components/results/LevelResultsModal';
import UnifiedMiniGameHud from './components/UnifiedMiniGameHud';
import AssetIcon from './components/AssetIcon';
import PracticeIntroPopup from './components/game-ui/PracticeIntroPopup';
import { IslandData, LevelData, PlayerData } from './types';
import { AppRouter } from './app/AppRouter';
import { useScreenFlow } from './app/useScreenFlow';
import { useOverlayState } from './app/useOverlayState';
import { usePlayerProgression } from './app/usePlayerProgression';
import {
  getSessionDurationSeconds,
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
import { LEVEL_TIMERS_DISABLED } from './app/testingFlags';
import { WellbeingActivityId, WellbeingCompletionState, WellbeingLaunchContext } from './wellbeing/types';
import { createWellbeingRewardLabel } from './wellbeing/integration/wellbeingRewards';
import { shouldSuggestWellbeing, WellbeingSignals } from './wellbeing/integration/wellbeingSuggestion';
import WellbeingCompleteModal from './wellbeing/WellbeingCompleteModal';
import { WELLBEING_BY_ID } from './wellbeing/data';
import { applyTelemetryEvent } from './systems/progression/telemetry';
import { reconcileAchievementState } from './systems/progression/achievementCatalog';
import { useProgressionStore } from './store/useProgressionStore';
import { LevelProgress } from './lib/progression/types';
import { getXpRequiredForLevel } from './lib/progression/getXpRequiredForLevel';
import { playGameSound } from './audio/gameAudio';

const PHONE_STAGE_MIN_HEIGHT = 635;
const getViewportSize = () => {
  if (typeof window === 'undefined') return { width: 0, height: 0 };
  // Keep the layout viewport stable while the browser magnifies the visual viewport.
  const isZoomed = (window.visualViewport?.scale ?? 1) > 1.01;
  return {
    width: isZoomed ? window.innerWidth : window.visualViewport?.width ?? window.innerWidth,
    height: isZoomed ? window.innerHeight : window.visualViewport?.height ?? window.innerHeight,
  };
};

const App: React.FC = () => {
  const [stageScale, setStageScale] = useState(1);
  const [stageRenderMultiplier, setStageRenderMultiplier] = useState(1);
  const [questionCardScale, setQuestionCardScale] = useState(1);
  const [potionCauldronShift, setPotionCauldronShift] = useState('0px');
  const [viewportSize, setViewportSize] = useState(getViewportSize);

  const {
    screen,
    selectedIsland,
    selectedLevel,
    setScreen,
    setSelectedLevel,
    goToHome,
    goToAvatarSelection,
    goToWorldMap,
    goToIslandLevels,
    goToGameplay,
    handleIslandSelect: selectIslandInFlow,
    handleLevelSelect: selectLevelInFlow,
    handleGlobalDockBack,
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
    saveProfileName,
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
  const [answerStreak, setAnswerStreak] = useState(0);
  const [gameplayHelpOpen, setGameplayHelpOpen] = useState(false);

  const resetSessionMetrics = useCallback(() => {
    setSessionMetrics({ correct: 0, incorrect: 0, hintsUsed: 0 });
    setAnswerStreak(0);
    setGameplayHelpOpen(false);
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

  const initialLegacyHydration = useMemo(() => ({
    levelStars: player.levelStars || {},
    completedLevels: player.completedLevels || {},
    playerLevel: player.level,
    playerXp: player.xp,
  }), [player.completedLevels, player.level, player.levelStars, player.xp]);

  useEffect(() => {
    if (legacyHydrationAppliedRef.current) return;
    legacyHydrationAppliedRef.current = true;
    hydrateFromLegacy(initialLegacyHydration);
  }, [hydrateFromLegacy, initialLegacyHydration]);

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
    showQuests,
    showAchievements,
    levelResult,
    setShowQuests,
    setShowAchievements,
    setLevelResult,
  } = useOverlayState();

  const [wellbeingActivityId, setWellbeingActivityId] = useState<WellbeingActivityId | null>(null);
  const [wellbeingLaunchContext, setWellbeingLaunchContext] = useState<WellbeingLaunchContext>({ origin: 'manual' });
  const [wellbeingCompletion, setWellbeingCompletion] = useState<WellbeingCompletionState | null>(null);
  const [storedLevelResult, setStoredLevelResult] = useState<LevelResultState | null>(null);
  const [gameplayRestartKey, setGameplayRestartKey] = useState(0);
  const [dismissedPracticeGuide, setDismissedPracticeGuide] = useState('');
  const practiceGuideKey = `${selectedLevel?.blueprintKey}:${selectedLevel?.id}:${gameplayRestartKey}`;
  const practiceBriefingOpen = Boolean(screen === 'gameplay' && selectedLevel?.isPractice && getLearnerGuide(selectedLevel.blueprintKey) && dismissedPracticeGuide !== practiceGuideKey);
  const legacyHydrationAppliedRef = useRef(false);
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
    paused: gameplayHelpOpen || practiceBriefingOpen || Boolean(levelResult),
    restartKey: gameplayRestartKey,
    onLifeDepleted: () => handleGameOverRef.current(0),
    onTimeDepleted: () => handleGameOverRef.current(0),
  });

  useMiniGameLifecycle({ screen, selectedLevel });

  useEffect(() => {
    if (screen !== 'gameplay') return undefined;

    const handleGameplayClick = (event: MouseEvent) => {
      const target = event.target;
      if (!(target instanceof Element)) return;

      const button = target.closest('button');
      if (!button) return;
      if (button.hasAttribute('data-ui-sound')) return;
      if (button.hasAttribute('disabled')) return;

      playGameSound('tap');
    };

    document.addEventListener('click', handleGameplayClick, true);
    return () => {
      document.removeEventListener('click', handleGameplayClick, true);
    };
  }, [screen]);

  const sessionState: GameplaySessionState = useMemo(() => ({
    timeLeft: globalMiniGameHudTimeLeft,
    totalTime: getSessionDurationSeconds(selectedLevel),
    lives: globalMiniGameLives,
    paused: gameplayHelpOpen || practiceBriefingOpen || Boolean(levelResult),
  }), [gameplayHelpOpen, practiceBriefingOpen, globalMiniGameHudTimeLeft, globalMiniGameLives, levelResult, selectedLevel]);

  const resolveLevelTitle = useCallback(() => {
    if (!selectedLevel) return 'Level over';
    if (canonicalGameTitle) return canonicalGameTitle;
    return 'Level over';
  }, [canonicalGameTitle]);

  const buildPracticeLevelResult = useCallback((
    type: 'victory' | 'gameover',
    score: number,
    accuracy: number,
    timeMs: number,
  ): LevelResultState | null => {
    if (!selectedIsland || !selectedLevel) return null;

    return {
      type,
      title: resolveLevelTitle(),
      subtitle: type === 'victory'
        ? 'Practice complete. No XP or brainpower earned.'
        : 'Practice session over. No XP or brainpower earned.',
      score,
      practice: true,
      stars: 0,
      xpGained: 0,
      bonuses: [],
      previousLevel: progressionPlayer.level,
      newLevel: progressionPlayer.level,
      previousXp: progressionPlayer.currentXp,
      currentXp: progressionPlayer.currentXp,
      xpRequiredForNextLevel: getXpRequiredForLevel(progressionPlayer.level),
      leveledUp: false,
      accuracy,
      hintsUsed: sessionMetrics.hintsUsed,
      mistakes: sessionMetrics.incorrect,
      timeMs,
      completed: type === 'victory',
      coinsEarned: 0,
      xpEarned: 0,
      achievementsUnlocked: [],
      wellbeingSuggested: false,
    };
  }, [
    progressionPlayer.currentXp,
    progressionPlayer.level,
    resolveLevelTitle,
    selectedIsland,
    selectedLevel,
    sessionMetrics.hintsUsed,
    sessionMetrics.incorrect,
  ]);

  const handleGameOver = useCallback((XP: number) => {
    playGameSound('fail');
    triggerHaptic('error');
    if (selectedLevel?.isPractice) {
      if (!selectedIsland || !selectedLevel) return;
      const totalAttempts = sessionMetrics.correct + sessionMetrics.incorrect;
      const accuracy = totalAttempts > 0 ? sessionMetrics.correct / totalAttempts : 0;
      const timeMs = Math.max(0, (sessionState.totalTime - sessionState.timeLeft) * 1000);
      const practiceResult = buildPracticeLevelResult('gameover', XP, accuracy, timeMs);
      if (practiceResult) setLevelResult(practiceResult);
      return;
    }

    const now = Date.now();
    const levelKey = selectedIsland && selectedLevel ? `${selectedIsland.id}-${selectedLevel.id}` : null;
    let levelFailCount = 0;
    if (levelKey) {
      levelFailCountsRef.current[levelKey] = (levelFailCountsRef.current[levelKey] || 0) + 1;
      levelFailCount = levelFailCountsRef.current[levelKey];
    }
    const nextSignals = {
      ...wellbeingSignals,
      consecutiveFails: wellbeingSignals.consecutiveFails + 1,
      gamesPlayedSinceBreak: wellbeingSignals.gamesPlayedSinceBreak + 1,
    };
    const wellbeingSuggested = levelFailCount >= 3 || shouldSuggestWellbeing(nextSignals, now);
    setWellbeingSignals(wellbeingSuggested
      ? { ...nextSignals, lastSuggestionTime: now }
      : nextSignals);
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
        ? "That was a tough round. Take a calm minute, then come back when you're ready."
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
  }, [buildPracticeLevelResult, completeProgressionLevel, resolveLevelTitle, selectedIsland, selectedLevel, sessionMetrics.correct, sessionMetrics.hintsUsed, sessionMetrics.incorrect, sessionState.lives, sessionState.timeLeft, sessionState.totalTime, setLevelResult, wellbeingSignals]);

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
      // Prefer blueprint rules because island mini-game packs often share engine "gameType" keys.
      getBlueprintRuleSet(selectedLevel?.blueprintKey)
      || (selectedLevel?.gameType ? GAME_META[selectedLevel.gameType]?.rules || null : null)
    ),
    [selectedLevel?.blueprintKey, selectedLevel?.gameType],
  );

  const hintRuleSet = useMemo(() => getLearnerGuide(selectedLevel?.blueprintKey), [selectedLevel?.blueprintKey]);
  const isMockAssessment = Boolean(selectedLevel?.isBoss && isBossEncounterGameType(selectedLevel.gameType));

  useEffect(() => {
    if (screen === 'profile_setup') {
      setDraftName(player.playerName || '');
    }
  }, [player.playerName, screen, setDraftName]);

  useEffect(() => {
    const updateStageScale = () => {
      const { width: viewportWidth, height: viewportHeight } = getViewportSize();
      setViewportSize({ width: viewportWidth, height: viewportHeight });
      const isPortraitPhone = viewportWidth < 700 && viewportHeight >= viewportWidth;
      const baseWidth = IPHONE_STAGE_WIDTH;
      const baseHeight = IPHONE_STAGE_HEIGHT;
      const isTabletViewport = Math.min(viewportWidth, viewportHeight) >= 700;
      const isDesktopViewport = Math.min(viewportWidth, viewportHeight) >= 1100;
      const renderMultiplier = isDesktopViewport ? 1.25 : isTabletViewport ? 1.12 : 1;
      const rawScale = Math.min(
        viewportWidth / (baseWidth * renderMultiplier),
        viewportHeight / (baseHeight * renderMultiplier),
      );
      const scale = rawScale * (isTabletViewport ? 0.95 : 1);
      setStageScale(isPortraitPhone
        ? Math.min(1, viewportHeight / PHONE_STAGE_MIN_HEIGHT)
        : Number.isFinite(scale) && scale > 0 ? scale : 1);
      setStageRenderMultiplier(renderMultiplier);
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
    const allowVerticalPan = screen === 'world_map' || screen === 'island_levels'
      || screen === 'parent_dashboard' || screen === 'wellbeing_hub';
    document.body.style.touchAction = allowVerticalPan ? 'pan-y' : 'none';
    document.body.style.overscrollBehaviorY = allowVerticalPan ? 'contain' : 'none';
  }, [screen]);

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
    if (hasCompletedProfile) {
      goToWorldMap();
      return;
    }
    setDraftName(player.playerName.trim() || 'Explorer');
    goToAvatarSelection();
  };

  const handleAvatarConfirm = () => {
    triggerHaptic('success');
    saveProfileName();
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
    playGameSound('complete');
    triggerHaptic('success');
    if (selectedLevel?.isPractice) {
      const totalAttempts = sessionMetrics.correct + sessionMetrics.incorrect;
      const fallbackAccuracy = stars >= 3 ? 1 : stars === 2 ? 0.85 : stars === 1 ? 0.65 : 0.5;
      const accuracy = totalAttempts > 0 ? sessionMetrics.correct / totalAttempts : fallbackAccuracy;
      const timeMs = Math.max(0, (sessionState.totalTime - sessionState.timeLeft) * 1000);
      const practiceResult = buildPracticeLevelResult('victory', XP, accuracy, timeMs);
      if (practiceResult) setLevelResult(practiceResult);
      return;
    }

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
    const isLevelConsideredComplete = (level: LevelData) => (
      getLevelProgressIds(level).some((id) => completedInIsland.includes(id))
      || level.id === selectedLevel.id
    );

    const laneNextLevel = selectedLevel.miniGameKey && !selectedLevel.isBoss
      ? selectedIsland.levels.find((level) => (
        level.miniGameKey === selectedLevel.miniGameKey
        && !level.isPractice
        && level.miniGameLevel === (selectedLevel.miniGameLevel ?? 0) + 1
      ))
      : undefined;
    const sequentialNextLevel = !selectedLevel.miniGameKey || selectedLevel.isBoss
      ? selectedIsland.levels.find(level => level.id === selectedLevel.id + 1)
      : undefined;
    const nextLevel = laneNextLevel || sequentialNextLevel;
    setLevelResult(null);

    if (nextLevel) {
      const canEnterNextLevel = nextLevel.isBoss
        ? selectedIsland.levels
            .filter(level => !level.isPractice && !level.isBoss && level.id < nextLevel.id)
            .every(isLevelConsideredComplete)
          && (player.stats?.totalCoinsEarned || 0) >= (nextLevel.bossUnlockCoins || 0)
        : isSequentialIsland
          ? nextLevel.miniGameKey && nextLevel.miniGameLevel
            ? selectedIsland.levels
                .filter((level) => (
                  level.miniGameKey === nextLevel.miniGameKey
                  && !level.isPractice
                  && (level.miniGameLevel || 0) < (nextLevel.miniGameLevel || 0)
                ))
                .every(isLevelConsideredComplete)
            : selectedIsland.levels
                .filter(level => !level.isPractice && level.id < nextLevel.id)
                .every(isLevelConsideredComplete)
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
    goToIslandLevels();
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
      playGameSound('correct');
      triggerHaptic('selection');
      setSessionMetrics((prev) => ({ ...prev, correct: prev.correct + 1 }));
      setAnswerStreak((previous) => previous + 1);
      recordTelemetryEvent('correct_answer', event);
    },
    onIncorrectAnswer: (event) => {
      playGameSound('incorrect');
      triggerHaptic('error');
      setSessionMetrics((prev) => ({ ...prev, incorrect: prev.incorrect + 1 }));
      setAnswerStreak(0);
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
      recordTelemetryEvent('game_complete', event);
    },
    onGameFailed: (event) => {
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
  const hasWideGameViewport = viewportSize.width >= 700 && viewportSize.height >= 600;
  const hasDesktopAdventureViewport = viewportSize.width >= 900 && viewportSize.height >= 600;
  const usesWideGameComposition = isMockAssessment || selectedGameType === 'change_counter'
    || (selectedGameType === 'take_out_rush' && selectedLevel?.blueprintKey !== 'fraction_forge')
    || selectedGameType === 'ratio_fractions'
    || (selectedGameType === 'ratio_rapids'
      && selectedLevel?.blueprintKey !== 'share_splitter'
      && selectedLevel?.blueprintKey !== 'maths_vs_zombies');
  const adaptPortraitGame = isGameplayScreen && hasWideGameViewport && !usesWideGameComposition;
  const useUnboundedStageShell = screen === 'parent_dashboard' || isWellbeingScreen
    || (isGameplayScreen && hasWideGameViewport)
    || (hasDesktopAdventureViewport && (isSplashScreen || isWorldMapScreen))
    || (isGameplayScreen && selectedLevel?.blueprintKey === 'place_value_panic'
      && viewportSize.width >= 560 && viewportSize.width > viewportSize.height && viewportSize.height <= 420);
  const globalDockOffsetClass = screen !== 'splash' && !isGameplayScreen && screen !== 'avatar_selection' && screen !== 'profile_setup'
    ? 'pb-[calc((4.35rem+env(safe-area-inset-bottom))/var(--game-stage-scale))] md:pb-[calc((4.65rem+env(safe-area-inset-bottom))/var(--game-stage-scale))]'
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
  const useFlatScreenScaleTransition = isAvatarSelectionScreen || screen === 'profile_setup';
  const screenEnterScale = useFlatScreenScaleTransition ? 1 : 0.98;
  const screenExitScale = useFlatScreenScaleTransition ? 1 : 1.02;
  const hideShellTimer = LEVEL_TIMERS_DISABLED
    || !isGameplayScreen
    || selectedLevel?.isPractice
    || selectedLevel?.gameType === 'potion_pour';
  const goToProfile = useCallback(() => {
    setScreen('profile');
  }, [setScreen]);
  const mapDockButtonClass = 'legend-map-dock-button';
  const mapDockIconClass = 'legend-map-dock-icon';
    const mapHudDock = screen === 'world_map'
      ? (
        <div className="mt-0.5 flex w-full max-w-[calc(100vw-0.7rem)] shrink-0 items-center justify-center overflow-hidden">
          <div className="legend-map-dock">
            <div className="relative flex flex-nowrap items-center justify-center gap-1.5">
              <button
                type="button"
                onClick={goToProfile}
                className={`${mapDockButtonClass} shrink-0`}
                aria-label="Open player profile"
              >
                <AssetIcon name="user" className={mapDockIconClass} /><span>Profile</span>
              </button>
              <button
                type="button"
                onClick={goToAchievements}
                className={`${mapDockButtonClass} shrink-0`}
                aria-label="Open achievements"
              >
                <AssetIcon name="trophy" className={mapDockIconClass} /><span>Rewards</span>
              </button>
              <button
                type="button"
                onClick={goToParentDashboard}
                className={`${mapDockButtonClass} shrink-0`}
                aria-label="Open parent portal"
              >
                <AssetIcon name="doc" className={mapDockIconClass} /><span>Parent</span>
              </button>
              <button
                type="button"
                onClick={() => openWellbeingHub({ origin: 'world_map', islandId: selectedIsland?.id ?? null })}
                className={`${mapDockButtonClass} shrink-0`}
                aria-label="Open Calm Grove"
                title="Open Calm Grove"
              >
                <TreePine className={mapDockIconClass} /><span>Calm</span>
              </button>
            </div>
          </div>
        </div>
      )
    : null;
  const isPortraitPhone = viewportSize.width > 0 && viewportSize.width < 700 && viewportSize.height >= viewportSize.width;
  const useScrollableStageShell = !useUnboundedStageShell && viewportSize.width > viewportSize.height;
  const preferredWideStageScale = viewportSize.width >= 1100 ? 1.3 : viewportSize.width >= 900 ? 1.15 : 1;
  const wideStageScale = viewportSize.height >= IPHONE_STAGE_HEIGHT
    ? Math.min(preferredWideStageScale, viewportSize.height / IPHONE_STAGE_HEIGHT)
    : 1;
  const effectiveStageScale = useScrollableStageShell ? wideStageScale : stageScale;
  const stageWidth = useScrollableStageShell ? IPHONE_STAGE_WIDTH : isPortraitPhone ? viewportSize.width / stageScale : IPHONE_STAGE_WIDTH;
  const stageHeight = isPortraitPhone ? viewportSize.height / stageScale : IPHONE_STAGE_HEIGHT;
  const effectiveRenderMultiplier = useScrollableStageShell ? 1 : stageRenderMultiplier;
  const stageStyle = {
    '--game-stage-width': `${Math.round(useUnboundedStageShell ? viewportSize.width : stageWidth * effectiveRenderMultiplier)}px`,
    '--game-stage-height': `${Math.round(useUnboundedStageShell ? viewportSize.height : stageHeight * effectiveRenderMultiplier)}px`,
    '--game-stage-scale': `${useUnboundedStageShell ? 1 : effectiveStageScale}`,
    '--question-card-scale': `${useUnboundedStageShell ? 1 : questionCardScale}`,
    '--potion-cauldron-shift': potionCauldronShift,
  } as React.CSSProperties;
  const viewportStyle = viewportSize.height > 0
    ? { height: `${viewportSize.height}px`, maxHeight: `${viewportSize.height}px` }
    : undefined;

  return (
    <div className={`iphone-game-viewport${useScrollableStageShell ? ' iphone-game-viewport-scrollable' : ''}${screen === 'world_map' ? ' iphone-game-viewport-map' : ''}`} style={viewportStyle}>
      <div className={`iphone-game-stage${useUnboundedStageShell ? ' iphone-game-stage-unbounded' : ''}${useScrollableStageShell ? ' iphone-game-stage-scrollable' : ''}`} style={stageStyle} data-stage-layout={useUnboundedStageShell ? 'responsive' : useScrollableStageShell ? 'scrollable' : 'portrait'}>
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
                className={`app-screen-content relative z-10 flex min-h-0 w-full flex-1 justify-center pointer-events-auto ${screenBehavior.scrollable && screen !== 'parent_dashboard' ? 'overflow-y-auto overflow-x-hidden' : 'overflow-hidden'} ${contentShellClass} ${globalDockOffsetClass}`}
                style={screenBehavior.scrollable ? { WebkitOverflowScrolling: 'touch' } : undefined}
              >
                <LearnerGuideContext.Provider value={{ guide: hintRuleSet, introManaged: Boolean(selectedLevel?.isPractice), introDismissed: dismissedPracticeGuide === practiceGuideKey }}>
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
                  adaptPortraitGame={adaptPortraitGame}
                  gameplayRestartKey={gameplayRestartKey}
                  usesQuestionMatchFrame={usesQuestionMatchFrame}
                  globalMiniGameHudTimeLeft={globalMiniGameHudTimeLeft}
                  globalMiniGameLives={globalMiniGameLives}
                  globalMiniGameHudDurationSeconds={getSessionDurationSeconds(selectedLevel)}
                  sessionState={sessionState}
                  sessionEvents={sessionEvents}
                  onStartAdventure={handleStartAdventure}
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
                  onOpenShop={goToProfile}
                  onOpenAchievements={goToAchievements}
                  onOpenParentReport={goToParentDashboard}
                  onUpdatePlayer={handleUpdatePlayer}
                />

                </LearnerGuideContext.Provider>
                {null}
              </motion.div>
            </AnimatePresence>

            {!isStartScreen ? (
              <UnifiedMiniGameHud
                avatarId={player.avatarId}
                title={isGameplayScreen ? canonicalGameTitle : 'SATs Legends'}
                levelLabel={selectedLevel ? selectedLevel.isPractice ? 'Practice' : selectedLevel.isBoss ? 'Mock adventure' : `Level ${selectedLevel.difficultyTier ?? selectedLevel.miniGameLevel ?? 1} of 5` : 'Adventure'}
                streak={answerStreak}
                isPractice={Boolean(isGameplayScreen && selectedLevel?.isPractice)}
                onHelp={isGameplayScreen ? () => setGameplayHelpOpen(true) : undefined}
                timeLeft={globalMiniGameHudTimeLeft}
                totalTime={getSessionDurationSeconds(selectedLevel)}
                lives={globalMiniGameLives}
                hideTimer={isMockAssessment ? false : hideShellTimer}
                assessment={isMockAssessment}
                hideTopBar={screen === 'world_map' || screen === 'island_levels' || screen === 'profile' || screen === 'achievements_tracker' || screen === 'parent_dashboard'}
                onBack={isGameplayScreen ? goToIslandLevels : handleGlobalDockBack}
                variant={isGameplayScreen ? 'gameplay' : 'hub'}
                bottomContent={mapHudDock || undefined}
              />
            ) : null}

            <PracticeIntroPopup
              open={practiceBriefingOpen}
              title={canonicalGameTitle || 'Practice'} body="Learn the method, then try the mission." briefing={hintRuleSet}
              onAction={() => setDismissedPracticeGuide(practiceGuideKey)}
            />
            <PracticeIntroPopup
              open={gameplayHelpOpen && isGameplayScreen}
              kind="help"
              title={canonicalGameTitle || 'Your mission'}
              body="Read the mission, explore the playfield, then choose your answer."
              briefing={hintRuleSet || selectedRuleSet}
              actionLabel="Back to mission"
              onAction={() => setGameplayHelpOpen(false)}
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
                practice: levelResult.practice,
                xpGained: levelResult.xpGained,
                bonuses: levelResult.bonuses,
                previousLevel: levelResult.previousLevel,
                newLevel: levelResult.newLevel,
              previousXp: levelResult.previousXp,
              currentXp: levelResult.currentXp,
              xpRequiredForNextLevel: levelResult.xpRequiredForNextLevel,
              leveledUp: levelResult.leveledUp,
              accuracy: levelResult.accuracy,
              timeMs: levelResult.timeMs,
            } : null}
              onRetry={handleRetryLevel}
              onNext={levelResult?.type === 'victory' ? handleAdvanceAfterVictory : undefined}
              onMap={handleCloseLevelResult}
              calmBreakLabel={levelResult?.type === 'gameover' && levelResult.wellbeingSuggested ? 'Take A Calm Break' : undefined}
              onCalmBreak={levelResult?.type === 'gameover' && levelResult.wellbeingSuggested
                ? () => openWellbeingHub({ origin: 'post_fail', islandId: selectedIsland?.id ?? null, suggested: true })
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
      {useScrollableStageShell ? <div className="iphone-game-scroll-spacer" style={{ height: `${Math.ceil(IPHONE_STAGE_HEIGHT * effectiveStageScale)}px` }} aria-hidden="true" /> : null}
    </div>
  );
};

export default App;





