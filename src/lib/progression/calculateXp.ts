import { BonusBreakdown, StarCount } from './types';

interface CalculateXpArgs {
  completed: boolean;
  stars: StarCount;
  firstClear: boolean;
  perfectAccuracy: boolean;
}

export const calculateXp = ({
  completed,
  stars,
  firstClear,
  perfectAccuracy,
}: CalculateXpArgs): { xpGained: number; bonuses: BonusBreakdown[] } => {
  let xpGained = completed ? (stars === 3 ? 60 : stars === 2 ? 40 : 25) : 5;
  const bonuses: BonusBreakdown[] = [];

  if (completed && firstClear) {
    xpGained += 15;
    bonuses.push({ label: 'First Clear Bonus', amount: 15 });
  }

  if (completed && perfectAccuracy) {
    xpGained += 10;
    bonuses.push({ label: 'Perfect Accuracy Bonus', amount: 10 });
  }

  return { xpGained, bonuses };
};
