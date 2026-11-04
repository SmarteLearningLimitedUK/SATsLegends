import { RatioFractionQuestion } from './types';

export type QuestionTier = 'early' | 'mid' | 'final';

/** Start with small totals; extra ingredients arrive only in later levels. */
export const isQuestionForDifficulty = (question: RatioFractionQuestion, level: number) => {
  const tier = Math.max(1, Math.min(5, Math.floor(level)));
  const total = question.ratio.reduce((sum, part) => sum + part, 0);
  const maxTotal = [5, 8, 10, 10, 12][tier - 1];
  const maxPart = [4, 5, 6, 5, 6][tier - 1];
  const ingredients = tier <= 3 ? 2 : 3;
  return question.ratio.length === ingredients && total <= maxTotal
    && question.ratio.every(part => part > 0 && part <= maxPart);
};

export const getQuestionTier = (progress: number): QuestionTier => {
  if (progress < 0.3) return 'early';
  if (progress < 0.7) return 'mid';
  return 'final';
};

export const pickQuestionForTier = (
  questions: RatioFractionQuestion[],
  tier: QuestionTier,
  roundIndex: number,
) => {
  const early = questions.filter((q) => q.ratio.length === 2 && (q.ratio[0] + q.ratio[1]) <= 6);
  const mid = questions.filter((q) => q.ratio.length === 3);
  const final = questions.filter((q) => q.ratio.length >= 4);
  const pool = tier === 'early' ? early : tier === 'mid' ? mid : final;
  const fallback = questions;
  const source = pool.length ? pool : fallback;
  return source[roundIndex % source.length];
};
