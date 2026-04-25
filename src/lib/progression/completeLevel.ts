import { applyXpGain } from './applyXpGain';
import { calculateStars } from './calculateStars';
import { calculateBossXP, calculateLevelXP, calculateQuestionXP, XpDifficulty } from './calculateXp';
import { getXpRequiredForLevel } from './getXpRequiredForLevel';
import { CompleteLevelArgs, CompleteLevelResult, LevelProgress, PlayerProfile, StarCount } from './types';

const createEmptyProgress = (levelId: string): LevelProgress => ({
  levelId,
  unlocked: true,
  completed: false,
  bestStars: 0,
  bestScore: 0,
  bestAccuracy: 0,
  bestTimeMs: null,
  timesPlayed: 0,
  firstClearXpAwarded: false,
});

const getTodayKey = () => new Date().toISOString().slice(0, 10);

const resolveDifficultyFromLevelIndex = (levelIndex: number, isBoss: boolean): XpDifficulty => {
  if (isBoss) return 'boss';
  if (levelIndex >= 50) return 'hard';
  if (levelIndex >= 20) return 'medium';
  return 'easy';
};

const buildEstimatedQuestionXP = (
  args: CompleteLevelArgs,
  stars: StarCount,
  levelIndex: number,
): number[] => {
  const totalQuestions = Math.max(0, Math.floor(args.totalQuestions ?? (args.correctAnswers ?? 0) + args.mistakes));
  const correctAnswers = Math.max(0, Math.min(totalQuestions, Math.floor(args.correctAnswers ?? Math.round(args.accuracy * totalQuestions))));
  if (totalQuestions <= 0) return [];

  const elapsedSeconds = Math.max(0, args.timeMs / 1000);
  const secondsTaken = totalQuestions > 0 ? elapsedSeconds / totalQuestions : elapsedSeconds;
  const expectedSeconds = args.totalTime && args.totalTime > 0 ? args.totalTime / totalQuestions : 20;
  const difficulty = args.difficulty ?? resolveDifficultyFromLevelIndex(levelIndex, Boolean(args.bossPaper));

  return Array.from({ length: totalQuestions }, (_, index) => (
    calculateQuestionXP({
      isCorrect: index < correctAnswers,
      difficulty,
      secondsTaken,
      expectedSeconds,
      streakCount: index + 1,
      firstTry: args.mistakes <= 0,
      mode: difficulty === 'boss' ? 'boss' : 'normal',
    })
  ));
};

export const completeLevel = (
  args: CompleteLevelArgs,
  player: PlayerProfile,
  existingProgress?: LevelProgress,
): {
  result: CompleteLevelResult;
  updatedPlayer: PlayerProfile;
  updatedProgress: LevelProgress;
} => {
  const previous = existingProgress ?? createEmptyProgress(args.levelId);
  const firstClear = !previous.completed && args.completed;
  const parseLevelIndex = () => {
    const [islandRaw, levelRaw] = args.levelId.split('-');
    const islandId = Number(islandRaw);
    const levelId = Number(levelRaw);
    if (!Number.isFinite(islandId) || !Number.isFinite(levelId)) return 0;
    return (Math.max(0, islandId - 1) * 10) + Math.max(0, levelId - 1);
  };
  const levelIndex = parseLevelIndex();
  const stars = calculateStars({
    completed: args.completed,
    accuracy: args.accuracy,
    hintsUsed: args.hintsUsed,
    mistakes: args.mistakes,
    livesRemaining: args.livesRemaining,
  });
  const perfectAccuracy = args.completed && args.accuracy === 1 && args.hintsUsed <= 0 && args.mistakes <= 1;
  const todayKey = getTodayKey();
  const attemptsToday = previous.xpAttemptDate === todayKey ? previous.xpAttemptsToday ?? 0 : 0;
  const replayCount = previous.completed ? attemptsToday + 1 : 0;
  const bossBestScoreToday = previous.bossBestScoreDate === todayKey ? previous.bossBestScoreToday ?? 0 : 0;
  const isBestBossAttemptToday = args.bossPaper ? args.bossPaper.score >= bossBestScoreToday : false;
  const totalQuestions = Math.max(0, Math.floor(args.totalQuestions ?? (args.correctAnswers ?? 0) + args.mistakes));
  const correctAnswers = Math.max(0, Math.min(totalQuestions, Math.floor(args.correctAnswers ?? Math.round(args.accuracy * totalQuestions))));

  const { xpGained, bonuses } = args.bossPaper
    ? {
        xpGained: calculateBossXP({
          ...args.bossPaper,
          isBestAttemptToday: isBestBossAttemptToday,
        }),
        bonuses: [
          { label: 'Boss Paper XP', amount: calculateBossXP({ ...args.bossPaper, isBestAttemptToday: isBestBossAttemptToday }) },
        ],
      }
    : calculateLevelXP({
        questionXP: args.questionXP ?? buildEstimatedQuestionXP(args, stars, levelIndex),
        correctAnswers,
        totalQuestions,
        timeRemaining: args.timeRemaining ?? 0,
        totalTime: args.totalTime ?? 0,
        replayCount,
      });

  const xpOutcome = applyXpGain(player, xpGained);

  const bestStars = Math.max(previous.bestStars, stars) as StarCount;
  const updatedProgress: LevelProgress = {
    ...previous,
    completed: previous.completed || args.completed,
    unlocked: true,
    timesPlayed: previous.timesPlayed + 1,
    firstClearXpAwarded: previous.firstClearXpAwarded || firstClear,
    xpAttemptDate: todayKey,
    xpAttemptsToday: attemptsToday + 1,
    bossBestScoreDate: args.bossPaper ? todayKey : previous.bossBestScoreDate,
    bossBestScoreToday: args.bossPaper
      ? Math.max(bossBestScoreToday, args.bossPaper.score)
      : previous.bossBestScoreToday,
    bestStars,
    bestScore: Math.max(previous.bestScore, args.score),
    bestAccuracy: Math.max(previous.bestAccuracy, args.accuracy),
    bestTimeMs: args.completed
      ? previous.bestTimeMs === null
        ? args.timeMs
        : Math.min(previous.bestTimeMs, args.timeMs)
      : previous.bestTimeMs,
  };

  return {
    result: {
      stars,
      xpGained,
      leveledUp: xpOutcome.leveledUp,
      newLevel: xpOutcome.player.level,
      currentXp: xpOutcome.player.currentXp,
      xpRequiredForNextLevel: getXpRequiredForLevel(xpOutcome.player.level),
      previousLevel: xpOutcome.previousLevel,
      previousXp: xpOutcome.previousXp,
      bonuses,
      firstClear,
      perfectAccuracy,
    },
    updatedPlayer: xpOutcome.player,
    updatedProgress,
  };
};
