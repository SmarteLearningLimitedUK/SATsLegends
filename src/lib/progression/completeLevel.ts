import { applyXpGain } from './applyXpGain';
import { calculateStars } from './calculateStars';
import { calculateXp } from './calculateXp';
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

  const { xpGained, bonuses } = calculateXp({
    completed: args.completed,
    stars,
    firstClear: firstClear && !previous.firstClearXpAwarded,
    perfectAccuracy,
    levelIndex,
  });

  const xpOutcome = applyXpGain(player, xpGained);

  const bestStars = Math.max(previous.bestStars, stars) as StarCount;
  const updatedProgress: LevelProgress = {
    ...previous,
    completed: previous.completed || args.completed,
    unlocked: true,
    timesPlayed: previous.timesPlayed + 1,
    firstClearXpAwarded: previous.firstClearXpAwarded || firstClear,
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
