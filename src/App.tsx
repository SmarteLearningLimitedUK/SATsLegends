import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { GAME_META, GameRuleSet } from './gameMeta';
import { getLevelGameTitle } from './utils/gameNames';
import { GAME_HUD_RESTART_EVENT } from './gameHudEvents';
import { triggerHaptic } from './haptics';
import { getBlueprintRuleSet } from './systems/content/islandBlueprint';
import {
  ISLANDS,
} from './constants';
import DailyQuestsModal from './components/modals/DailyQuestsModal';
import AchievementsModal from './components/modals/AchievementsModal';
import LevelResultsModal from './components/results/LevelResultsModal';
import UnifiedMiniGameHud from './components/UnifiedMiniGameHud';
import GameActionDock from './components/GameActionDock';
import AssetIcon from './components/AssetIcon';
import { IslandData, LevelData, PlayerData } from './types';
import { AppRouter } from './app/AppRouter';
import { useScreenFlow } from './app/useScreenFlow';
import { useOverlayState } from './app/useOverlayState';
import { usePlayerProgression } from './app/usePlayerProgression';
import {
  useGameplaySession,
} from './app/useGameplaySession';
import { GameplaySessionEventHandlers, GameplaySessionEventPayload, GameplaySessionState } from './app/gameplaySessionContract';
import { useMiniGameLifecycle } from './app/useMiniGameLifecycle';
import { LevelResultState } from './app/types';
import {
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
import { calculateQuestionXP, XpDifficulty } from './lib/progression/calculateXp';
import { CACHE_BUSTER } from './cacheBuster';
import { playGameSound } from './audio/gameAudio';
import { useLevelBackgroundAudio } from './audio/useLevelBackgroundAudio';
import { useWelcomeBackgroundAudio } from './audio/useWelcomeBackgroundAudio';
import { playClickSound } from './utils/soundManager';
import FeedbackToast, { FeedbackToastState } from './components/feedback/FeedbackToast';
import { getVisualTestSeed, isVisualTestMode } from './utils/visualTestMode';
import { makeSeededRandom } from './utils/seededRandom';
import VisualPauseModal from './components/visual/VisualPauseModal';
import { WELLBEING_ACTIVITIES } from './wellbeing/data';
import { getLevelRouteNumber, getLevelRouteSlug } from './app/routeConfig';

type SessionMetricsState = {
  correct: number;
  incorrect: number;
  hintsUsed: number;
  questionXP: number[];
  streakCount: number;
};

const App: React.FC = () => {
  const buildId = import.meta.env.VITE_BUILD_ID ?? CACHE_BUSTER;
  const visualTestMode = isVisualTestMode();

  // Patch randomness for deterministic screenshot exports (visual test mode only).
  useMemo(() => {
    if (!visualTestMode) return;
    const seed = getVisualTestSeed();
    if (seed === null) return;
    const seeded = makeSeededRandom(seed);
    // eslint-disable-next-line no-global-assign
    Math.random = seeded;
  }, [visualTestMode]);

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
    goToMathsHelpHub,
    goToAchievements,
    goToParentDashboard,
  } = useScreenFlow();

  const canonicalGameTitle = screen === 'ratio_racer'
    ? 'Ratio Racer'
    : screen === 'scale_builder'
      ? 'Scale Builder'
    : screen === 'share_splitter'
      ? 'Share Splitter'
      : getLevelGameTitle(selectedLevel);

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

  const [sessionMetrics, setSessionMetrics] = useState<SessionMetricsState>({
    correct: 0,
    incorrect: 0,
    hintsUsed: 0,
    questionXP: [],
    streakCount: 0,
  });
  const [feedbackToast, setFeedbackToast] = useState<FeedbackToastState>({
    isOpen: false,
    tone: 'success',
    message: 'Correct!',
  });
  const [visualPauseOpen, setVisualPauseOpen] = useState(false);
  const questionStartedAtRef = useRef(Date.now());
  const currentQuestionHadIncorrectRef = useRef(false);

  const resetSessionMetrics = useCallback(() => {
    questionStartedAtRef.current = Date.now();
    currentQuestionHadIncorrectRef.current = false;
    setSessionMetrics({ correct: 0, incorrect: 0, hintsUsed: 0, questionXP: [], streakCount: 0 });
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

      if (!shouldUpdate) return prev;

      const achievementState = reconcileAchievementState(next);
      return {
        ...next,
        achievementState,
        achievements: achievementState.earned,
      };
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

  const backToWellbeingHub = useCallback(() => {
    setWellbeingActivityId(null);
    setWellbeingCompletion(null);
    setScreen('wellbeing_hub');
  }, [setScreen]);

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
    globalMiniGameHudDurationSeconds,
    globalMiniGameLives,
    consumeLife,
  } = useGameplaySession({
    screen,
    selectedLevel,
    onLifeDepleted: () => handleGameOverRef.current(0),
    onTimeDepleted: () => handleGameOverRef.current(0),
  });

  useMiniGameLifecycle({ screen, selectedLevel });

  useEffect(() => {
    const handleGlobalButtonClick = (event: MouseEvent) => {
      const target = event.target;
      if (!(target instanceof Element)) return;

      const button = target.closest('button');
      if (!button) return;
      if (button.hasAttribute('disabled')) return;
      if (button.getAttribute('aria-disabled') === 'true') return;

      playClickSound();
    };

    document.addEventListener('click', handleGlobalButtonClick, true);
    return () => {
      document.removeEventListener('click', handleGlobalButtonClick, true);
    };
  }, []);

  const sessionState: GameplaySessionState = useMemo(() => ({
    timeLeft: globalMiniGameHudTimeLeft,
    totalTime: globalMiniGameHudDurationSeconds,
    lives: globalMiniGameLives,
  }), [globalMiniGameHudDurationSeconds, globalMiniGameHudTimeLeft, globalMiniGameLives]);

  const resolveXpDifficulty = useCallback((): XpDifficulty => {
    if (selectedLevel?.isBoss) return 'boss';
    const levelNumber = selectedLevel?.miniGameLevel ?? selectedLevel?.id ?? 1;
    if (levelNumber >= 7) return 'hard';
    if (levelNumber >= 4) return 'medium';
    return 'easy';
  }, [selectedLevel?.id, selectedLevel?.isBoss, selectedLevel?.miniGameLevel]);

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
    playGameSound('fail', undefined, selectedLevel?.blueprintKey);
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
    const questionXP = sessionMetrics.questionXP.length > 0
      ? sessionMetrics.questionXP
      : undefined;
    const progressionResult = completeProgressionLevel({
      levelId: levelKey!,
      completed: false,
      score: XP,
      accuracy,
      hintsUsed: sessionMetrics.hintsUsed,
      livesRemaining: sessionState.lives,
      mistakes: sessionMetrics.incorrect,
      timeMs,
      questionXP,
      correctAnswers: sessionMetrics.correct,
      totalQuestions: totalAttempts,
      timeRemaining: sessionState.timeLeft,
      totalTime: sessionState.totalTime,
      difficulty: resolveXpDifficulty(),
    });

    const achievementsUnlocked: string[] = [];
    setPlayer((prev) => {
      const previousEarned = prev.achievementState?.earned ?? prev.achievements ?? [];
      const nextBase: PlayerData = {
        ...prev,
        level: progressionResult.newLevel,
        xp: progressionResult.currentXp,
        stats: {
          ...prev.stats,
          totalGamesPlayed: (prev.stats?.totalGamesPlayed || 0) + 1,
        },
      };
      const achievementState = reconcileAchievementState(nextBase);
      const newlyUnlocked = achievementState.earned.filter((id) => !previousEarned.includes(id));
      achievementsUnlocked.splice(0, achievementsUnlocked.length, ...newlyUnlocked);
      return {
        ...nextBase,
        achievementState,
        achievements: achievementState.earned,
      };
    });

    const levelTitle = resolveLevelTitle();
    setLevelResult({
      type: 'gameover',
      title: levelTitle,
      subtitle: wellbeingSuggested
        ? 'Three tough failures in a row. Want to take a minute in a calm break?'
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
      achievementsUnlocked,
      wellbeingSuggested,
    });
  }, [buildPracticeLevelResult, completeProgressionLevel, resolveLevelTitle, resolveXpDifficulty, selectedIsland, selectedLevel, sessionMetrics.correct, sessionMetrics.hintsUsed, sessionMetrics.incorrect, sessionMetrics.questionXP, sessionState.lives, sessionState.timeLeft, sessionState.totalTime, setLevelResult]);

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
      if (!selectedLevel?.isPractice) return null;
      if (selectedLevel.blueprintKey === 'place_value_panic') {
        return {
          title: 'Place Value Panic',
          summary: 'Place value is the value of a digit based on its position within a number.\nRead the question and then drag each number to its corresponding place.',
          bullets: [],
        };
      }
      if (selectedLevel.blueprintKey === 'number_line_ninja') {
        return {
          title: 'Number Line Ninja',
          summary: 'Use the Number Line to identify and choose the correct answer.',
          bullets: [],
        };
      }
      if (selectedLevel.blueprintKey === 'mean_machine') {
        return {
          title: 'Mean Machine',
          summary: "The Mean Machine must be tamed. It's the source of all fun for the Monster Mind. Spin the reels and follow the instructions to identify MEAN, MODE, and MEDIAN.",
          bullets: [],
        };
      }
      if (selectedLevel.blueprintKey === 'multiplication_mine') {
        return {
          title: 'Multiplication Mine',
          summary: "You've made it to the Mines but there are boulders in the way. Solve the multiplication problems and smash your way through!",
          bullets: [],
        };
      }
      if (selectedLevel.blueprintKey === 'data_detective' || selectedLevel.blueprintKey === 'whodunnit_data') {
        return {
          title: 'Data Detective',
          summary: "Stop! Show me some ID.. oh, sorry, I'm a seargent down today and we could use your help. There have been thefts, and I need some help looking through the evidence to find our suspect. Can you help?",
          bullets: [],
        };
      }
      if (selectedLevel.blueprintKey === 'take_out_rush') {
        return {
          title: 'Take-Out Rush',
          summary: 'Welcome to Monster Munch Diner. These monster Mnds are sure impatient. Complete their order in time to keep them happy.',
          bullets: [],
        };
      }
      if (selectedLevel.blueprintKey === 'polygon_palace') {
        return {
          title: 'Polygon Palace',
          summary: 'Welcome traveller! I need a hand to categorise these shapes. Read the question and select the correct answer, or answers, as there may be more than one. Some of the later shapes are 3D, so be ready to count faces, edges, and vertices too!',
          bullets: [],
        };
      }
      if (selectedLevel.blueprintKey === 'area_architect') {
        return {
          title: 'Area Architect',
          summary: 'We need to figure out the area of the underground tunnels beneath Monster Mind headquarters. Using the blueprints, can you help us work out the dimensions?',
          bullets: [],
        };
      }
      if (selectedLevel.blueprintKey === 'perimeter_path') {
        return {
          title: 'Perimeter Path',
          summary: 'We are mapping out the castle tunnels. We need to make sure we have enough fuse to run the dynamite. Can you help us calculate the perimeter? Remember... Perimeter is defined as the total distance around a two-dimensional shape.',
          bullets: [],
        };
      }
      if (selectedLevel.blueprintKey === 'order_ops_arena') {
        return {
          title: 'Order Ops Arena',
          summary: 'HALT! Who goes there. I require order... order of operatons that is! The BIDMAS rule is an acronym to help us remember the order of operations in calculations. Let\'s duel!',
          bullets: [],
        };
      }
      if (selectedLevel.blueprintKey === 'formula_forge') {
        return {
          title: 'Formula Forge',
          summary: 'Algebra is like a puzzle where letters stand for numbers we don’t know yet, helping us solve problems step by step. Can you complete the formula?',
          bullets: [],
        };
      }
      if (selectedLevel.blueprintKey === 'factor_frenzy') {
        return {
          title: 'Factor Frenzy',
          summary: 'A factor is a number that divides another number exactly, without leaving any remainder. Factors can also be seen as pairs of numbers that, when multiplied together, result in the original number. Help find the hidden factors.',
          bullets: [],
        };
      }
      if (selectedLevel.blueprintKey === 'remainder_run') {
        return {
          title: 'Remainder Run',
          summary: 'Use long division to work out the quotient, remainder, or decimal answer. Look at the visual, then pick the correct answer.',
          bullets: [],
        };
      }
      if (selectedLevel.blueprintKey === 'coordinate_quest') {
        return {
          title: 'Coordinate Quest',
          summary: "We can't get through! That Monster Mind has hidden traps. Navigate the map from the co-ordinates given, and make it through the pass safely. Remember: the X axis runs left to right â†’, and the Y axis runs bottom to top â†‘.",
          bullets: [],
        };
      }
      if (selectedLevel.blueprintKey === 'angle_arena') {
        return {
          title: 'Angle Arena',
          summary: "Greetings! We've managed to build our cannon here to destroy the Monster Mind's look-out towers. We need your maths skills to work out the angle of launch. Select the correct angle and let's blast them.",
          bullets: [],
        };
      }
      if (selectedLevel.blueprintKey === 'simplify_sprint') {
        return {
          title: 'Simplify Sprint',
          summary: "The Monster Mind has encrypted the values to make them as large as possible. That makes it harder for our researchers to solve. Help the researchers by simplifying the fraction to its smallest form.",
          bullets: [],
        };
      }
      if (selectedLevel.blueprintKey === 'rotation_reflection') {
        return {
          title: 'Rotation Station',
          summary: 'We need to pack our caravan, but some of the items wont fit unless we are smart with the packing. can you take a look at our shapes and help us out? we may need to flip, mirror or rotate.',
          bullets: [],
        };
      }
      const baseRules = selectedRuleSet || {
        title: canonicalGameTitle || 'Practice',
        summary: `This is the practice run for ${canonicalGameTitle || 'this game'}. Use it to learn the controls before the real level.`,
        bullets: [
          'Read the mission at the top before you begin.',
          'Use the on-screen tools to learn how the game works.',
          'Tap help any time you want a reminder.',
        ],
      };
      if (!baseRules) return null;
      const titleOverride = canonicalGameTitle?.trim();
      const resolvedRules = titleOverride
        ? { ...baseRules, title: titleOverride }
        : baseRules;
      const kidRules = buildKidRules(resolvedRules);
      if (!kidRules) return null;
      if (selectedLevel?.isPractice) {
        return {
          ...kidRules,
          summary: `Practice run for ${kidRules.title}. Learn the controls here, then skip or start level one.`,
        };
      }
      return kidRules;
    },
    [buildKidRules, selectedLevel, selectedRuleSet],
  );

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!buildId) return;
    try {
      const storageKey = 'sats_legends_build_id';
      const previous = window.localStorage.getItem(storageKey);
      if (previous && previous !== buildId) {
        const clearBrowserState = async () => {
          try {
            window.localStorage.clear();
            window.sessionStorage.clear();
            if ('caches' in window) {
              const keys = await caches.keys();
              await Promise.all(keys.map((key) => caches.delete(key)));
            }
          } catch {
            // Ignore cache/storage errors so we can still recover on reload.
          }
        };

        void (async () => {
          await clearBrowserState();
          window.localStorage.setItem(storageKey, buildId);
          window.location.reload();
        })();
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
    document.body.style.touchAction = 'none';
    document.body.style.overscrollBehaviorY = 'none';
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
    playGameSound('complete', undefined, selectedLevel?.blueprintKey);
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
    const questionXP = sessionMetrics.questionXP.length > 0
      ? sessionMetrics.questionXP
      : undefined;
    const progressionResult = completeProgressionLevel({
      levelId: levelKey,
      completed: true,
      score: XP,
      accuracy,
      hintsUsed: sessionMetrics.hintsUsed,
      livesRemaining: sessionState.lives,
      mistakes: sessionMetrics.incorrect,
      timeMs,
      questionXP,
      correctAnswers: sessionMetrics.correct || Math.round(accuracy * Math.max(totalAttempts, 1)),
      totalQuestions: Math.max(totalAttempts, sessionMetrics.correct, 1),
      timeRemaining: sessionState.timeLeft,
      totalTime: sessionState.totalTime,
      difficulty: resolveXpDifficulty(),
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

  const handleReturnToMapFromResults = () => {
    setLevelResult(null);
    setSelectedLevel(null);
    if (selectedIsland) {
      goToIslandLevels();
      return;
    }
    goToWorldMap();
  };

  const handleContinueFromResults = () => {
    setLevelResult(null);
    if (!selectedIsland || !selectedLevel) {
      goToWorldMap();
      return;
    }

    const levels = selectedIsland.levels ?? [];
    const index = levels.findIndex((level) => level.id === selectedLevel.id);
    const next = index >= 0 ? levels[index + 1] : null;

    if (next) {
      setSelectedLevel(next);
      setGameplayRestartKey((prev) => prev + 1);
      goToGameplay();
      return;
    }

    // No next level: return to island selection.
    setSelectedLevel(null);
    goToIslandLevels();
  };

  const buildVisualLevelResult = (kind: 'victory' | 'gameover'): LevelResultState => ({
    type: kind,
    title: kind === 'victory' ? 'Level Complete!' : 'Try Again',
    subtitle: kind === 'victory' ? 'Visual review capture.' : 'Visual review capture.',
    score: kind === 'victory' ? 1234 : 350,
    practice: false,
    stars: kind === 'victory' ? 3 : 0,
    xpGained: kind === 'victory' ? 180 : 20,
    bonuses: [],
    previousLevel: 4,
    newLevel: kind === 'victory' ? 5 : 4,
    previousXp: 120,
    currentXp: 300,
    xpRequiredForNextLevel: 500,
    leveledUp: false,
    accuracy: kind === 'victory' ? 1 : 0.6,
    hintsUsed: 0,
    mistakes: kind === 'victory' ? 0 : 3,
    timeMs: 42000,
    completed: kind === 'victory',
    xpEarned: kind === 'victory' ? 180 : 20,
  });

  useEffect(() => {
    if (!visualTestMode) return;
    window.__SAT_VISUAL__ = {
      getLevelRoutes: () => {
        return ISLANDS.flatMap((island) =>
          island.levels.map((level) => {
            const slug = getLevelRouteSlug(level);
            const num = getLevelRouteNumber(island, level);
            const label = level.displayName || slug;
            return {
              islandId: island.id,
              levelId: level.id,
              path: `/game/${island.id}/${slug}/${num}`,
              label,
              isBoss: Boolean(level.isBoss),
            };
          }),
        );
      },
      getWellbeingActivities: () => WELLBEING_ACTIVITIES.map((activity) => activity.id),
      openWellbeingActivity: (id: string) => {
        setWellbeingActivityId(id as any);
        setScreen('wellbeing_activity');
      },
      showCorrectFeedback: () => setFeedbackToast({ isOpen: true, tone: 'success', message: 'Correct!' }),
      showWrongFeedback: () => setFeedbackToast({ isOpen: true, tone: 'warning', message: 'Not quite' }),
      openPauseModal: () => setVisualPauseOpen(true),
      closePauseModal: () => setVisualPauseOpen(false),
      openEndLevel: (kind: 'victory' | 'gameover') => setLevelResult(buildVisualLevelResult(kind)),
      closeEndLevel: () => setLevelResult(null),
      openWellbeingComplete: (titleOverride?: string) => {
        setWellbeingCompletion({
          activityId: (wellbeingActivityId ?? WELLBEING_ACTIVITIES[0]?.id ?? 'bubble_breath') as any,
          rewardLabel: createWellbeingRewardLabel((player.calmTokens || 0) + 1),
          title: titleOverride,
        } as any);
      },
      closeWellbeingComplete: () => setWellbeingCompletion(null),
    };

    return () => {
      if (window.__SAT_VISUAL__) {
        delete window.__SAT_VISUAL__;
      }
    };
  }, [createWellbeingRewardLabel, player.calmTokens, setScreen, visualTestMode, wellbeingActivityId]);

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

  const getExpectedSecondsPerQuestion = useCallback(() => {
    const answeredQuestions = sessionMetrics.correct + sessionMetrics.incorrect + 1;
    if (sessionState.totalTime <= 0) return 20;
    return Math.max(1, sessionState.totalTime / Math.max(1, answeredQuestions));
  }, [sessionMetrics.correct, sessionMetrics.incorrect, sessionState.totalTime]);

  const sessionEvents: GameplaySessionEventHandlers = useMemo(() => ({
    onCorrectAnswer: (event) => {
      playGameSound('correct', undefined, selectedLevel?.blueprintKey);
      triggerHaptic('selection');
      setFeedbackToast({ isOpen: true, tone: 'success', message: 'Correct!' });
      const now = Date.now();
      const secondsTaken = Math.max(0, (now - questionStartedAtRef.current) / 1000);
      const firstTry = !currentQuestionHadIncorrectRef.current;
      questionStartedAtRef.current = now;
      currentQuestionHadIncorrectRef.current = false;
      setSessionMetrics((prev) => {
        const streakCount = prev.streakCount + 1;
        const questionXP = calculateQuestionXP({
          isCorrect: true,
          difficulty: resolveXpDifficulty(),
          secondsTaken,
          expectedSeconds: getExpectedSecondsPerQuestion(),
          streakCount,
          firstTry,
          mode: selectedLevel?.isBoss ? 'boss' : 'normal',
        });
        return {
          ...prev,
          correct: prev.correct + 1,
          streakCount,
          questionXP: [...prev.questionXP, questionXP],
        };
      });
      recordTelemetryEvent('correct_answer', event);
    },
    onIncorrectAnswer: (event) => {
      playGameSound('incorrect', undefined, selectedLevel?.blueprintKey);
      triggerHaptic('error');
      setFeedbackToast({ isOpen: true, tone: 'warning', message: 'Not quite' });
      questionStartedAtRef.current = Date.now();
      currentQuestionHadIncorrectRef.current = true;
      setSessionMetrics((prev) => ({
        ...prev,
        incorrect: prev.incorrect + 1,
        streakCount: 0,
        questionXP: [...prev.questionXP, 0],
      }));
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
  }), [consumeLife, getExpectedSecondsPerQuestion, recordTelemetryEvent, resolveXpDifficulty, screen, selectedLevel?.blueprintKey, selectedLevel?.isBoss, setSessionMetrics]);

  const screenBehavior = SCREEN_BEHAVIOR[screen];
  const backgroundIntensityClass = screenBehavior.family === 'hub'
    ? 'bg-intensity-hub'
    : screenBehavior.family === 'game'
      ? 'bg-intensity-game'
      : 'bg-intensity-overlay';
  const isWellbeingScreen = screen === 'wellbeing_hub' || screen === 'wellbeing_activity';
  const isSplashScreen = screen === 'splash';
  const isStartScreen = isSplashScreen || screen === 'profile_setup' || screen === 'avatar_selection';
  const shouldPlayWelcomeBackgroundAudio = isSplashScreen || screen === 'profile_setup' || screen === 'avatar_selection';
  const isGameplayScreen = screen === 'gameplay' || screen === 'ratio_racer' || screen === 'scale_builder' || screen === 'share_splitter';
  const isStandaloneRatioRacer = screen === 'ratio_racer';
  const isStandaloneScaleBuilder = screen === 'scale_builder';
  const isStandaloneShareSplitter = screen === 'share_splitter';
  const isMapLayoutScreen = MAP_LAYOUT_SCREENS.includes(screen);
  const isWorldMapScreen = screen === 'world_map';
  const selectedGameType = isStandaloneRatioRacer ? 'ratio_fractions' : isStandaloneScaleBuilder ? 'scale_safari' : isStandaloneShareSplitter ? 'ratio_rapids' : selectedLevel?.gameType;
  const gameplayTypeClass = selectedGameType ? `game-type-${selectedGameType.replace(/_/g, '-')}` : '';
  const usesQuestionMatchFrame = Boolean(selectedGameType && QUESTION_MATCH_FRAME_GAMES.includes(selectedGameType));
  const globalDockOffsetClass = '';
  const viewportShellClass = isGameplayScreen
    ? 'sat-shell-standard bg-transparent'
    : isWorldMapScreen
    ? 'sat-shell-map licensed-playfield-bg bg-transparent'
    : isMapLayoutScreen
      ? 'sat-shell-map licensed-playfield-bg bg-transparent pt-3 pb-3'
      : 'sat-shell-standard licensed-playfield-bg bg-transparent px-3 py-3 md:px-8 md:py-4';
  const contentShellClass = isGameplayScreen
    ? 'sat-screen-full-bleed items-stretch'
    : isWorldMapScreen
      ? 'sat-screen-full-bleed items-stretch'
      : isMapLayoutScreen
      ? 'sat-screen-map-content'
      : 'sat-screen-standard-content items-stretch';
  const appViewportOverflowClass = isWorldMapScreen ? 'overflow-y-auto overflow-x-hidden' : 'overflow-hidden';
  const appScreenOverflowClass = isWorldMapScreen ? 'overflow-visible' : 'overflow-hidden';
  const screenEnterScale = 1;
  const screenExitScale = 1;
  const isExamBoss = selectedLevel?.gameType === 'crystal_core'
    || selectedLevel?.gameType === 'mirror_gate'
    || selectedLevel?.gameType === 'matrix_match';
  useWelcomeBackgroundAudio(shouldPlayWelcomeBackgroundAudio);
  useLevelBackgroundAudio(
    screen === 'gameplay' && Boolean(selectedLevel) && !levelResult,
    selectedLevel ? `${selectedIsland?.id ?? 'unknown'}-${selectedLevel.id}-${gameplayRestartKey}` : null,
    Boolean(selectedLevel?.isBoss) || isExamBoss,
  );
  const hideShellTimer = (LEVEL_TIMERS_DISABLED && !isExamBoss)
    || !isGameplayScreen
    || isStandaloneRatioRacer
    || isStandaloneScaleBuilder
    || isStandaloneShareSplitter
    || selectedLevel?.isPractice
    || selectedLevel?.gameType === 'potion_pour';
  const hideShellLives = isExamBoss;
  const hideGlobalBottomDock = false;
  const gameplayBackHandler = levelResult ? handleCloseLevelResult : goToIslandLevels;
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
        <div className="mt-0.5 flex w-full max-w-[calc(100vw-0.7rem)] shrink-0 items-center justify-center overflow-hidden">
          <div className="relative w-fit max-w-full shrink-0 rounded-[1.15rem] border border-cyan-100/26 bg-[linear-gradient(180deg,rgba(16,40,96,0.84)_0%,rgba(9,24,64,0.88)_100%)] px-2 py-1.5 shadow-[0_10px_18px_rgba(2,6,23,0.38),inset_0_1px_0_rgba(255,255,255,0.08)] backdrop-blur-[2px]">
            <div className="pointer-events-none absolute inset-[1px] rounded-[1.05rem] border border-cyan-100/14" />
            <div className="pointer-events-none absolute inset-x-3 top-[3px] h-3 rounded-full bg-cyan-200/10 blur-[2px]" />

            <div className="relative flex items-center gap-1.5 sm:gap-2">
              <button
                type="button"
                onClick={goToProfile}
                className={mapDockButtonClass}
                aria-label="Open player profile"
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
              <button
                type="button"
                onClick={goToMathsHelpHub}
                className={mapDockButtonClass}
                aria-label="Open glossary"
                title="Glossary"
              >
                <AssetIcon name="question" className={mapDockIconClass} />
              </button>
              <button
                type="button"
                onClick={goToParentDashboard}
                className={mapDockButtonClass}
                aria-label="Open parent portal"
              >
                <AssetIcon name="doc" className={mapDockIconClass} />
              </button>
              <button
                type="button"
                onClick={() => openWellbeingHub({ origin: 'world_map', islandId: selectedIsland?.id ?? null })}
                className={mapDockButtonClass}
                aria-label="Open Calm Grove"
                title="Calm Grove"
              >
                <AssetIcon name="tree" className={mapDockIconClass} />
              </button>
            </div>
          </div>
        </div>
      )
    : null;

  return (
    <div className={`game-viewport ${isGameplayScreen ? 'game-viewport--gameplay' : 'game-viewport--shell'}`}>
      <header className="top-hud">
        {!isStartScreen && !(screen === 'world_map' || screen === 'island_levels' || screen === 'profile' || screen === 'achievements_tracker' || screen === 'parent_dashboard' || screen === 'maths_help_hub') ? (
          <UnifiedMiniGameHud
            avatarId={player.avatarId}
            timeLeft={globalMiniGameHudTimeLeft}
            totalTime={globalMiniGameHudDurationSeconds}
            gameTitle={canonicalGameTitle}
            lives={globalMiniGameLives}
            hideTimer={hideShellTimer}
            forceTimer={isExamBoss}
            hideTimerBar={isExamBoss}
            hideAvatar={false}
            hideLives={hideShellLives}
            onBack={isStandaloneRatioRacer || isStandaloneScaleBuilder || isStandaloneShareSplitter ? goToHome : isGameplayScreen ? gameplayBackHandler : handleGlobalDockBack}
            variant={isGameplayScreen ? 'gameplay' : 'hub'}
            showActions={false}
          />
        ) : null}
      </header>
      <main className="game-stage">
          <div
            data-screen-family={screenBehavior.family}
            className={`app-viewport sat-theme-bluegold app-background-intensity ${backgroundIntensityClass} app-shell-family-${screenBehavior.family} screen-${screen.replace(/_/g, '-')} ${isGameplayScreen ? gameplayTypeClass : ''} relative w-full flex flex-col items-center ${appViewportOverflowClass} ${viewportShellClass}`}
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
                className={`app-screen-content relative z-10 flex ${isWorldMapScreen ? 'min-h-full' : 'h-full min-h-0'} w-full flex-1 justify-center ${appScreenOverflowClass} pointer-events-auto ${contentShellClass} ${globalDockOffsetClass}`}
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
                  globalMiniGameHudDurationSeconds={globalMiniGameHudDurationSeconds}
                  sessionState={sessionState}
                  sessionEvents={sessionEvents}
                  onStartAdventure={handleStartAdventure}
                  onAvatarSelect={(id) => setPlayer(prev => ({ ...prev, avatarId: id }))}
                  onAvatarConfirm={handleAvatarConfirm}
                  onGoHome={goToHome}
                  onBackToSplash={goToHome}
                  onSelectIsland={handleIslandSelect}
                  onSelectLevel={handleLevelSelect}
                  onBackToIslandLevels={goToIslandLevels}
                  onOpenWellbeingHub={() => openWellbeingHub({ origin: screen === 'world_map' ? 'world_map' : 'manual', islandId: selectedIsland?.id ?? null })}
                  onOpenWellbeingActivity={(activityId) => openWellbeingActivity(activityId, { origin: screen === 'island_levels' ? 'island_levels' : wellbeingLaunchContext.origin, islandId: selectedIsland?.id ?? null })}
                  onExitWellbeing={returnFromWellbeing}
                  onExitWellbeingActivity={backToWellbeingHub}
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

                {null}
              </motion.div>
            </AnimatePresence>

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
                achievementsUnlocked: levelResult.achievementsUnlocked,
              } : null}
              onRetry={handleRetryLevel}
              onContinue={handleContinueFromResults}
              onMap={handleReturnToMapFromResults}
              calmBreakLabel={levelResult?.type === 'gameover' && levelResult.wellbeingSuggested ? 'Take A Calm Break' : undefined}
              onCalmBreak={levelResult?.type === 'gameover' && levelResult.wellbeingSuggested
                ? () => openWellbeingHub({ origin: 'post_fail', islandId: selectedIsland?.id ?? null, suggested: true })
                : undefined}
            />

            <FeedbackToast
              toast={feedbackToast}
              onDismiss={() => setFeedbackToast((prev) => (prev.isOpen ? { ...prev, isOpen: false } : prev))}
              placement="aboveAnswers"
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

            <VisualPauseModal
              isOpen={visualTestMode && visualPauseOpen}
              onClose={() => setVisualPauseOpen(false)}
            />

            {null}

          </div>
      </main>
      <footer className="bottom-hud">
        {!isStartScreen && !hideGlobalBottomDock ? (
          mapHudDock || (
            <GameActionDock
              onBack={isStandaloneRatioRacer || isStandaloneScaleBuilder || isStandaloneShareSplitter ? goToHome : isGameplayScreen ? gameplayBackHandler : handleGlobalDockBack}
              compact
              variant="global"
            />
          )
        ) : null}
      </footer>
    </div>
  );
};

export default App;





