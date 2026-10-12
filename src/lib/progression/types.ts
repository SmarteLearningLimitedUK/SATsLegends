export type StarCount = 0 | 1 | 2 | 3;

export type PlayerProfile = {
  avatarId: string;
  level: number;
  currentXp: number;
  totalXpEarned: number;
};

export type LevelProgress = {
  levelId: string;
  unlocked: boolean;
  completed: boolean;
  bestStars: StarCount;
  bestScore: number;
  bestAccuracy: number;
  bestAccuracyMeasured?: boolean;
  bestTimeMs: number | null;
  timesPlayed: number;
  firstClearXpAwarded: boolean;
};

export type CompleteLevelArgs = {
  levelId: string;
  completed: boolean;
  score: number;
  accuracy: number; // 0..1
  /** False when the mini-game has not reported individual answer attempts. */
  accuracyMeasured?: boolean;
  hintsUsed: number;
  livesRemaining: number;
  mistakes: number;
  timeMs: number;
  /** Use the mini-game's own earned rating when it has scored the clear. */
  reportedStars?: StarCount;
  /** Some scored adventures require a minimum star after meeting their own clear target. */
  minStarsOnComplete?: StarCount;
  /** Unsuccessful practice/mock attempts may be recorded without an XP award. */
  awardFailureXp?: boolean;
};

export type BonusBreakdown = {
  label: string;
  amount: number;
};

export type CompleteLevelResult = {
  stars: StarCount;
  xpGained: number;
  leveledUp: boolean;
  newLevel: number;
  currentXp: number;
  xpRequiredForNextLevel: number;
  previousLevel: number;
  previousXp: number;
  bonuses: BonusBreakdown[];
  firstClear: boolean;
  perfectAccuracy: boolean;
};
