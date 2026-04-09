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
  bestTimeMs: number | null;
  timesPlayed: number;
  firstClearXpAwarded: boolean;
};

export type CompleteLevelArgs = {
  levelId: string;
  completed: boolean;
  score: number;
  accuracy: number; // 0..1
  hintsUsed: number;
  livesRemaining: number;
  mistakes: number;
  timeMs: number;
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
