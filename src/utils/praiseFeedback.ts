const PRAISE_WORDS = ['Great', 'Amazing', 'Awesome', 'Fantastic'] as const;

export const PRAISE_QUICK_THRESHOLD_MS = 3200;

export const pickPraiseWord = () => {
  const index = Math.floor(Math.random() * PRAISE_WORDS.length);
  return PRAISE_WORDS[index] || PRAISE_WORDS[0];
};

export const buildPraiseMessage = () => `${pickPraiseWord()}!`;

export const shouldShowPraise = (attemptNumber: number, elapsedMs: number, quickThresholdMs = PRAISE_QUICK_THRESHOLD_MS) => (
  attemptNumber === 1 && elapsedMs <= quickThresholdMs
);
