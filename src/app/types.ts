export type GameRulesMode = 'start' | 'help';

export interface LevelResultState {
  type: 'victory' | 'gameover';
  title: string;
  subtitle: string;
  score?: number;
  stars: number;
  xpGained: number;
  bonuses: { label: string; amount: number }[];
  previousLevel: number;
  newLevel: number;
  previousXp: number;
  currentXp: number;
  xpRequiredForNextLevel: number;
  leveledUp: boolean;
  accuracy: number;
  hintsUsed: number;
  mistakes: number;
  timeMs: number;
  completed: boolean;
  coinsEarned?: number;
  xpEarned: number;
  islandUnlockedName?: string;
  achievementsUnlocked?: string[];
  wellbeingSuggested?: boolean;
}
