export type RaceDifficulty = 'easy' | 'standard' | 'hard';

export type RaceTuning = {
  trackLength: number;
  playerAdvanceDistance: number;
  playerMoveDurationMs: number;
  playerBoostAnticipationMs: number;
  playerStumbleDistance: number;
  incorrectFeedbackMs: number;
  enemyMoveIntervalMs: number;
  enemyAdvanceDistance: number;
  enemyMoveDurationMs: number;
};

export const RACE_TUNING: Record<RaceDifficulty, RaceTuning> = {
  easy: {
    trackLength: 900,
    playerAdvanceDistance: 105,
    playerMoveDurationMs: 550,
    playerBoostAnticipationMs: 100,
    playerStumbleDistance: 8,
    incorrectFeedbackMs: 700,
    enemyMoveIntervalMs: 2900,
    enemyAdvanceDistance: 55,
    enemyMoveDurationMs: 600,
  },
  standard: {
    trackLength: 1000,
    playerAdvanceDistance: 95,
    playerMoveDurationMs: 550,
    playerBoostAnticipationMs: 100,
    playerStumbleDistance: 10,
    incorrectFeedbackMs: 700,
    enemyMoveIntervalMs: 2600,
    enemyAdvanceDistance: 62,
    enemyMoveDurationMs: 600,
  },
  hard: {
    trackLength: 1100,
    playerAdvanceDistance: 88,
    playerMoveDurationMs: 550,
    playerBoostAnticipationMs: 100,
    playerStumbleDistance: 12,
    incorrectFeedbackMs: 700,
    enemyMoveIntervalMs: 2350,
    enemyAdvanceDistance: 68,
    enemyMoveDurationMs: 600,
  },
};

export const DEFAULT_RACE_DIFFICULTY: RaceDifficulty = 'standard';
