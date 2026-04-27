import { shuffle } from './questionShuffle';

export interface AnswerOption<T = string | number> {
  id: string;
  label: string;
  value: T;
  isCorrect: boolean;
}

type OptionLike<T> = T | { label: string; value: T };

interface BuildAnswerOptionsInput<T = string | number> {
  correctAnswer: OptionLike<T>;
  distractors: OptionLike<T>[];
  optionCount?: number;
  questionId?: string;
}

interface BuildAnswerOptionsResult<T = string | number> {
  options: AnswerOption<T>[];
}

const lastCorrectIndexByQuestion = new Map<string, number>();

const isLabeledOption = <T,>(value: unknown): value is { label: string; value: T } => (
  typeof value === 'object'
  && value !== null
  && 'label' in value
  && 'value' in value
  && typeof (value as { label?: unknown }).label === 'string'
);

const normalizeOption = <T,>(raw: OptionLike<T>): { label: string; value: T } => {
  if (isLabeledOption<T>(raw)) {
    return { label: raw.label, value: raw.value };
  }
  return { label: String(raw), value: raw };
};

const optionKey = <T,>(option: { value: T; label: string }) => `${typeof option.value}:${String(option.value)}::${option.label}`;

const dedupeOptions = <T,>(options: Array<{ label: string; value: T }>) => {
  const seen = new Set<string>();
  const output: Array<{ label: string; value: T }> = [];
  for (const option of options) {
    const key = optionKey(option);
    if (seen.has(key)) continue;
    seen.add(key);
    output.push(option);
  }
  return output;
};

const tryCreateNumericDistractors = <T,>(
  correct: { label: string; value: T },
  existing: Array<{ label: string; value: T }>,
  needed: number,
) => {
  const numeric = Number(correct.value);
  if (!Number.isFinite(numeric)) return existing;
  const extra: Array<{ label: string; value: T }> = [];
  let step = 1;
  while (extra.length < needed && step <= 20) {
    const candidates = [numeric + step, numeric - step];
    for (const candidate of candidates) {
      if (!Number.isFinite(candidate)) continue;
      extra.push({ label: String(candidate), value: candidate as T });
      if (extra.length >= needed) break;
    }
    step += 1;
  }
  return dedupeOptions([...existing, ...extra]);
};

export const buildAnswerOptions = <T = string | number>({
  correctAnswer,
  distractors,
  optionCount = 4,
  questionId,
}: BuildAnswerOptionsInput<T>): BuildAnswerOptionsResult<T> => {
  const correct = normalizeOption(correctAnswer);
  const normalizedDistractors = distractors.map(normalizeOption);
  let unique = dedupeOptions([correct, ...normalizedDistractors]);
  const hasCorrect = unique.some((option) => optionKey(option) === optionKey(correct));

  if (!hasCorrect) unique = dedupeOptions([correct, ...unique]);
  if (unique.length < optionCount) {
    unique = tryCreateNumericDistractors(correct, unique, optionCount - unique.length);
  }
  if (unique.length < optionCount) {
    throw new Error(`buildAnswerOptions: not enough unique options for ${questionId ?? 'question'}`);
  }

  const sliced = [correct, ...unique.filter((option) => optionKey(option) !== optionKey(correct))].slice(0, optionCount);
  let shuffled = shuffle(sliced);

  if (questionId && shuffled.length > 1) {
    const nextCorrectIndex = shuffled.findIndex((option) => optionKey(option) === optionKey(correct));
    const lastCorrectIndex = lastCorrectIndexByQuestion.get(questionId);
    if (lastCorrectIndex !== undefined && nextCorrectIndex === lastCorrectIndex) {
      const swapIndex = (nextCorrectIndex + 1) % shuffled.length;
      [shuffled[nextCorrectIndex], shuffled[swapIndex]] = [shuffled[swapIndex], shuffled[nextCorrectIndex]];
    }
    const finalCorrectIndex = shuffled.findIndex((option) => optionKey(option) === optionKey(correct));
    if (finalCorrectIndex >= 0) {
      lastCorrectIndexByQuestion.set(questionId, finalCorrectIndex);
    }
  }

  const options = shuffled.map((option, index) => ({
    id: `${questionId ?? 'option'}-${index}-${optionKey(option)}`,
    label: option.label,
    value: option.value,
    isCorrect: optionKey(option) === optionKey(correct),
  }));

  return { options };
};

export const pickNextQuestionAvoidingImmediateRepeat = <T,>(
  generator: () => T,
  previous: T | null | undefined,
  keySelector: (item: T) => string,
  maxAttempts = 8,
) => {
  if (!previous) return generator();
  const previousKey = keySelector(previous);
  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    const next = generator();
    if (keySelector(next) !== previousKey) return next;
  }
  return generator();
};

if (import.meta.env.DEV) {
  const sample = buildAnswerOptions({
    correctAnswer: 24,
    distractors: [20, 22, 24, 26, 20],
    optionCount: 4,
    questionId: 'dev-assert',
  });
  console.assert(sample.options.length === 4, 'buildAnswerOptions should return 4 options');
  console.assert(new Set(sample.options.map((option) => `${typeof option.value}:${String(option.value)}`)).size === sample.options.length, 'buildAnswerOptions should remove duplicates');
  console.assert(sample.options.some((option) => option.isCorrect), 'buildAnswerOptions should keep the correct answer');
}
