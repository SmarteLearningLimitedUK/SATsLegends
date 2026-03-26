export type GameRulesMode = 'start' | 'help';

export interface LevelResultState {
  type: 'victory' | 'gameover';
  title: string;
  subtitle: string;
  score: number;
  stars: number;
  coinsEarned: number;
  xpEarned: number;
  islandUnlockedName?: string;
  achievementsUnlocked?: string[];
}
