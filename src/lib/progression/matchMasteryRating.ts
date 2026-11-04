import { calculateStars } from './calculateStars';
import { StarCount } from './types';

interface VictoryRatingArgs {
  blueprintKey?: string;
  reportedStars: number;
  accuracy: number | null;
  hintsUsed: number;
  mistakes: number;
  livesRemaining: number;
}

/** Resolve an accepted clear once, before telemetry and progression record it. */
export const resolveVictoryStars = ({
  blueprintKey,
  reportedStars,
  accuracy,
  hintsUsed,
  mistakes,
  livesRemaining,
}: VictoryRatingArgs): StarCount => {
  if (blueprintKey !== 'match3_equivalence') {
    return Math.max(1, Math.min(3, Math.round(reportedStars))) as StarCount;
  }

  // Match Mastery stops at its score target, so overshoot cannot fairly rate a
  // clear. Use actual swap accuracy and the existing shared hint policy instead.
  const stars = calculateStars({
    completed: true,
    accuracy: accuracy ?? 0,
    hintsUsed,
    mistakes,
    livesRemaining,
  });
  return Math.max(1, stars) as StarCount;
};
