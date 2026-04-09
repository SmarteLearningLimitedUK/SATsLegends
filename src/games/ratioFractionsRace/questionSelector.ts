import { RatioFractionQuestion } from './types';

export type QuestionTier = 'early' | 'mid' | 'final';

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
  const mid = questions.filter((q) => q.ratio.length === 2 && (q.ratio[0] + q.ratio[1]) > 6 && (q.ratio[0] + q.ratio[1]) <= 15);
  const final = questions.filter((q) => q.ratio.length >= 3);
  const pool = tier === 'early' ? early : tier === 'mid' ? mid : final;
  const fallback = questions;
  const source = pool.length ? pool : fallback;
  return source[roundIndex % source.length];
};
