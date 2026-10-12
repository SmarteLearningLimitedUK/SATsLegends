/** Keep the shell's reward decision in step with the mini-game's actual result. */
export function victoryHasEarnedProgress(stars: number, score: number, correctAnswers: number): boolean {
  return Number.isFinite(score) && Number.isFinite(stars) && stars > 0 && (score > 0 || correctAnswers > 0);
}

export function reportedAccuracy(correct: number, incorrect: number): number | null {
  const attempts = correct + incorrect;
  return attempts > 0 ? correct / attempts : null;
}
