import { BonusBreakdown, StarCount } from './types';

interface CalculateXpArgs {
  completed: boolean;
  stars: StarCount;
  firstClear: boolean;
  perfectAccuracy: boolean;
  levelIndex?: number;
}

export const calculateXp = ({
  completed,
  stars,
  firstClear,
  perfectAccuracy,
  levelIndex = 0,
}: CalculateXpArgs): { xpGained: number; bonuses: BonusBreakdown[] } => {
  let xpGained = completed ? (stars === 3 ? 60 : stars === 2 ? 40 : 25) : 5;
  const bonuses: BonusBreakdown[] = [];

  const normalizedLevelIndex = Math.max(0, Math.floor(levelIndex));
  const levelBonus = Math.min(20, Math.floor(normalizedLevelIndex / 5) * 2);
  xpGained += levelBonus;

  if (completed && firstClear) {
    xpGained += 15;
    bonuses.push({ label: 'First Clear Bonus', amount: 15 });
  }

  if (completed && perfectAccuracy) {
    xpGained += 10;
    bonuses.push({ label: 'Perfect Accuracy Bonus', amount: 10 });
  }

  xpGained = Math.min(120, Math.max(0, Math.round(xpGained)));

  return { xpGained, bonuses };
};
