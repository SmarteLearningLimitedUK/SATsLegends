import { BonusBreakdown } from './types';

export type XpDifficulty = 'easy' | 'medium' | 'hard' | 'boss';
export type XpQuestionMode = 'normal' | 'boss';

export const xpConfig = {
  baseQuestionXP: 10,
  difficultyMultipliers: {
    easy: 1,
    medium: 1.25,
    hard: 1.5,
    boss: 2,
  },
  accuracyMultipliers: {
    firstTry: 1,
    retry: 0.5,
    incorrect: 0,
  },
  speedBonuses: {
    fast: 10,
    good: 6,
    okay: 3,
    bossFast: 8,
    bossGood: 5,
    bossOkay: 2,
  },
  streakBonuses: {
    streak3: 5,
    streak5: 10,
    streak10: 25,
  },
  completionBonuses: {
    perfect: 100,
    excellent: 75,
    strong: 40,
    developing: 20,
  },
  timeBonuses: {
    halfRemaining: 75,
    quarterRemaining: 40,
    someRemaining: 15,
  },
  replayMultipliers: {
    completedReplay: 0.5,
    dailyReplayLimitExceeded: 0.25,
  },
  bossPaper: {
    scoreMultiplier: 12,
    accuracyBonuses: {
      fullMarks: 300,
      excellent: 200,
      strong: 125,
      pass: 75,
    },
    timeBonuses: {
      halfRemaining: 150,
      quarterRemaining: 100,
      someRemaining: 50,
    },
    clearBonus: 150,
  },
} as const;

export type CalculateQuestionXPArgs = {
  isCorrect: boolean;
  difficulty: XpDifficulty;
  secondsTaken: number;
  expectedSeconds: number;
  streakCount: number;
  firstTry: boolean;
  mode: XpQuestionMode;
};

export type CalculateLevelXPArgs = {
  questionXP: number[];
  correctAnswers: number;
  totalQuestions: number;
  timeRemaining: number;
  totalTime: number;
  replayCount: number;
};

export type CalculateBossXPArgs = {
  score: number;
  totalMarks: number;
  timeRemaining: number;
  totalTime: number;
  passed: boolean;
  isBestAttemptToday: boolean;
};

const clampFinite = (value: number, fallback = 0) => (
  Number.isFinite(value) ? value : fallback
);

const getNormalSpeedBonus = (secondsTaken: number) => {
  if (secondsTaken <= 5) return xpConfig.speedBonuses.fast;
  if (secondsTaken <= 10) return xpConfig.speedBonuses.good;
  if (secondsTaken <= 20) return xpConfig.speedBonuses.okay;
  return 0;
};

const getBossSpeedBonus = (secondsTaken: number, expectedSeconds: number) => {
  if (expectedSeconds <= 0) return 0;
  const timeRemainingForQuestion = Math.max(0, expectedSeconds - secondsTaken);
  const speedRatio = timeRemainingForQuestion / expectedSeconds;
  if (speedRatio >= 0.75) return xpConfig.speedBonuses.bossFast;
  if (speedRatio >= 0.5) return xpConfig.speedBonuses.bossGood;
  if (speedRatio >= 0.25) return xpConfig.speedBonuses.bossOkay;
  return 0;
};

const getStreakBonus = (streakCount: number) => {
  if (streakCount > 0 && streakCount % 10 === 0) return xpConfig.streakBonuses.streak10;
  if (streakCount > 0 && streakCount % 5 === 0) return xpConfig.streakBonuses.streak5;
  if (streakCount > 0 && streakCount % 3 === 0) return xpConfig.streakBonuses.streak3;
  return 0;
};

export const calculateQuestionXP = ({
  isCorrect,
  difficulty,
  secondsTaken,
  expectedSeconds,
  streakCount,
  firstTry,
  mode,
}: CalculateQuestionXPArgs) => {
  if (!isCorrect) return 0;

  const base = xpConfig.baseQuestionXP
    * xpConfig.difficultyMultipliers[difficulty]
    * (firstTry ? xpConfig.accuracyMultipliers.firstTry : xpConfig.accuracyMultipliers.retry);
  const speedBonus = mode === 'boss'
    ? getBossSpeedBonus(clampFinite(secondsTaken), clampFinite(expectedSeconds))
    : getNormalSpeedBonus(clampFinite(secondsTaken));
  const streakBonus = getStreakBonus(Math.max(0, Math.floor(streakCount)));

  return Math.round(base + speedBonus + streakBonus);
};

const getCompletionBonus = (accuracyPercent: number) => {
  if (accuracyPercent >= 1) return xpConfig.completionBonuses.perfect;
  if (accuracyPercent >= 0.9) return xpConfig.completionBonuses.excellent;
  if (accuracyPercent >= 0.75) return xpConfig.completionBonuses.strong;
  if (accuracyPercent >= 0.5) return xpConfig.completionBonuses.developing;
  return 0;
};

const getLevelTimeBonus = (timeRemaining: number, totalTime: number) => {
  if (timeRemaining <= 0 || totalTime <= 0) return 0;
  const ratio = timeRemaining / totalTime;
  if (ratio >= 0.5) return xpConfig.timeBonuses.halfRemaining;
  if (ratio >= 0.25) return xpConfig.timeBonuses.quarterRemaining;
  if (ratio > 0) return xpConfig.timeBonuses.someRemaining;
  return 0;
};

const applyReplayMultiplier = (xp: number, replayCount: number) => {
  if (replayCount > 3) return xp * xpConfig.replayMultipliers.dailyReplayLimitExceeded;
  if (replayCount > 0) return xp * xpConfig.replayMultipliers.completedReplay;
  return xp;
};

export const calculateLevelXP = ({
  questionXP,
  correctAnswers,
  totalQuestions,
  timeRemaining,
  totalTime,
  replayCount,
}: CalculateLevelXPArgs): { xpGained: number; bonuses: BonusBreakdown[] } => {
  const safeTotalQuestions = Math.max(0, Math.floor(clampFinite(totalQuestions)));
  const safeCorrectAnswers = Math.max(0, Math.floor(clampFinite(correctAnswers)));
  const accuracyPercent = safeTotalQuestions > 0 ? safeCorrectAnswers / safeTotalQuestions : 0;
  const questionTotal = questionXP.reduce((total, xp) => total + Math.max(0, Math.round(clampFinite(xp))), 0);
  const completionBonus = getCompletionBonus(accuracyPercent);
  const timeBonus = getLevelTimeBonus(clampFinite(timeRemaining), clampFinite(totalTime));
  const rawTotal = questionTotal + completionBonus + timeBonus;
  const xpGained = Math.max(0, Math.round(applyReplayMultiplier(rawTotal, Math.max(0, Math.floor(replayCount)))));
  const bonuses: BonusBreakdown[] = [];

  if (completionBonus > 0) bonuses.push({ label: 'Accuracy Bonus', amount: completionBonus });
  if (timeBonus > 0) bonuses.push({ label: 'Time Bonus', amount: timeBonus });
  if (replayCount > 3) {
    bonuses.push({ label: 'Daily Replay Adjustment', amount: xpGained - Math.round(rawTotal) });
  } else if (replayCount > 0) {
    bonuses.push({ label: 'Replay Adjustment', amount: xpGained - Math.round(rawTotal) });
  }

  return { xpGained, bonuses };
};

const getBossAccuracyBonus = (score: number, totalMarks: number, isBestAttemptToday: boolean) => {
  if (!isBestAttemptToday || totalMarks <= 0) return 0;
  const accuracy = score / totalMarks;
  if (score >= totalMarks) return xpConfig.bossPaper.accuracyBonuses.fullMarks;
  if (accuracy >= 0.9) return xpConfig.bossPaper.accuracyBonuses.excellent;
  if (accuracy >= 0.75) return xpConfig.bossPaper.accuracyBonuses.strong;
  if (accuracy >= 0.6) return xpConfig.bossPaper.accuracyBonuses.pass;
  return 0;
};

const getBossTimeBonus = (timeRemaining: number, totalTime: number, isBestAttemptToday: boolean) => {
  if (!isBestAttemptToday || timeRemaining <= 0 || totalTime <= 0) return 0;
  const ratio = timeRemaining / totalTime;
  if (ratio >= 0.5) return xpConfig.bossPaper.timeBonuses.halfRemaining;
  if (ratio >= 0.25) return xpConfig.bossPaper.timeBonuses.quarterRemaining;
  if (ratio > 0) return xpConfig.bossPaper.timeBonuses.someRemaining;
  return 0;
};

export const calculateBossXP = ({
  score,
  totalMarks,
  timeRemaining,
  totalTime,
  passed,
  isBestAttemptToday,
}: CalculateBossXPArgs) => {
  const safeScore = Math.max(0, clampFinite(score));
  const baseBossXP = safeScore * xpConfig.bossPaper.scoreMultiplier;
  const accuracyBonus = getBossAccuracyBonus(safeScore, Math.max(0, clampFinite(totalMarks)), isBestAttemptToday);
  const timeBonus = getBossTimeBonus(clampFinite(timeRemaining), clampFinite(totalTime), isBestAttemptToday);
  const bossClearBonus = passed && isBestAttemptToday ? xpConfig.bossPaper.clearBonus : 0;

  return Math.round(baseBossXP + accuracyBonus + timeBonus + bossClearBonus);
};
