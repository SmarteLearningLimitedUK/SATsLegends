import { StarCount } from './types';

interface CalculateStarsArgs {
  completed: boolean;
  accuracy: number;
  hintsUsed: number;
  mistakes: number;
  livesRemaining: number;
}

export const calculateStars = ({
  completed,
  accuracy,
  hintsUsed,
  mistakes,
}: CalculateStarsArgs): StarCount => {
  if (!completed) return 0;

  const clampedAccuracy = Math.max(0, Math.min(1, accuracy));
  const isPerfect = clampedAccuracy === 1 && hintsUsed <= 0 && mistakes <= 1;

  if (isPerfect) return 3;
  if (clampedAccuracy >= 0.8) return 2;
  if (clampedAccuracy >= 0.6) return 1;
  return 0;
};
