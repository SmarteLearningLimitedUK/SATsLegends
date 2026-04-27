export type RangeRodeoDifficulty = 1 | 2 | 3 | 4 | 5;

export interface RangeRodeoQuestion {
  id: string;
  difficulty: RangeRodeoDifficulty;
  question: string;
  values?: number[];
  answers: string[];
  correctIndex: number;
  correctAnswer: number;
  explanation: string;
  questionType: string;
}

export interface RangeRodeoRoundContext {
  correctStreak?: number;
  lostLifeRecently?: boolean;
}

type Rng = () => number;

const EPSILON = 1e-9;

export const randomInt = (min: number, max: number, rng: Rng = Math.random): number => (
  Math.floor(rng() * (max - min + 1)) + min
);

export const randomDecimal = (min: number, max: number, rng: Rng = Math.random): number => {
  const value = min + rng() * (max - min);
  return Math.round(value * 10) / 10;
};

export const shuffleArray = <T,>(items: T[], rng: Rng = Math.random): T[] => {
  const next = [...items];
  for (let index = next.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(rng() * (index + 1));
    [next[index], next[swapIndex]] = [next[swapIndex], next[index]];
  }
  return next;
};

const roundToOne = (value: number): number => Math.round(value * 10) / 10;

const formatNumber = (value: number): string => {
  if (Math.abs(value - Math.round(value)) < EPSILON) return String(Math.round(value));
  return roundToOne(value).toFixed(1);
};

const parseAnswerValue = (value: string): number | null => {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const numeric = Number(trimmed.replace(/,/g, ''));
  return Number.isFinite(numeric) ? roundToOne(numeric) : null;
};

export const calculateRange = (values: number[]): number => {
  if (values.length === 0) return 0;
  const minValue = Math.min(...values);
  const maxValue = Math.max(...values);
  return roundToOne(Math.max(0, maxValue - minValue));
};

export const uniqueAnswers = (correct: number, distractors: number[]): number[] => {
  const output: number[] = [];
  const seen = new Set<string>();

  const addValue = (value: number) => {
    const normalized = roundToOne(value);
    const key = formatNumber(normalized);
    if (normalized < 0) return;
    if (seen.has(key)) return;
    seen.add(key);
    output.push(normalized);
  };

  addValue(correct);
  distractors.forEach(addValue);

  let guard = 1;
  while (output.length < 4) {
    addValue(correct + guard);
    guard += 1;
  }

  return output.slice(0, 4);
};

export const createDistractors = (
  correct: number,
  min: number,
  max: number,
  values: number[],
): number[] => {
  const sorted = [...values].sort((a, b) => a - b);
  const secondLargest = sorted.length > 1 ? sorted[sorted.length - 2] : max;
  const offByOne = correct > 0 ? correct - 1 : correct + 1;
  const reversedSubtractionMistake = Math.abs(min - secondLargest);

  const candidates = [
    max,
    min,
    max + min,
    offByOne,
    reversedSubtractionMistake,
    correct + 1,
    correct + 2,
  ];

  return candidates
    .map(roundToOne)
    .filter((candidate) => candidate >= 0 && Math.abs(candidate - correct) > EPSILON);
};

const makeQuestionId = (difficulty: RangeRodeoDifficulty): string => (
  `range-rodeo-d${difficulty}-${Date.now()}-${Math.floor(Math.random() * 1_000_000)}`
);

const buildQuestionPayload = (
  difficulty: RangeRodeoDifficulty,
  question: string,
  values: number[] | undefined,
  correctAnswer: number,
  distractors: number[],
  explanation: string,
  questionType: string,
  rng: Rng,
): RangeRodeoQuestion => {
  const answerPool = uniqueAnswers(correctAnswer, distractors);
  const shuffledAnswers = shuffleArray(answerPool, rng);
  const answerStrings = shuffledAnswers.map(formatNumber);
  const correctString = formatNumber(correctAnswer);
  const correctIndex = answerStrings.findIndex((answer) => answer === correctString);

  return {
    id: makeQuestionId(difficulty),
    difficulty,
    question,
    values,
    answers: answerStrings,
    correctIndex,
    correctAnswer: roundToOne(correctAnswer),
    explanation,
    questionType,
  };
};

const buildDifficulty1 = (rng: Rng): RangeRodeoQuestion => {
  const count = randomInt(3, 4, rng);
  const values = Array.from({ length: count }, () => randomInt(0, 20, rng));
  const minValue = Math.min(...values);
  const maxValue = Math.max(...values);
  const correct = calculateRange(values);
  const distractors = createDistractors(correct, minValue, maxValue, values);
  return buildQuestionPayload(
    1,
    `What is the range of ${values.map(formatNumber).join(', ')}?`,
    values,
    correct,
    distractors,
    `Highest value is ${formatNumber(maxValue)} and lowest value is ${formatNumber(minValue)}, so ${formatNumber(maxValue)} - ${formatNumber(minValue)} = ${formatNumber(correct)}.`,
    'direct_range',
    rng,
  );
};

const buildDifficulty2 = (rng: Rng): RangeRodeoQuestion => {
  const count = randomInt(4, 5, rng);
  const values = Array.from({ length: count }, () => randomInt(0, 100, rng));
  if (rng() < 0.4) {
    values[randomInt(1, count - 1, rng)] = values[0];
  }
  const displayValues = shuffleArray(values, rng);
  const minValue = Math.min(...values);
  const maxValue = Math.max(...values);
  const correct = calculateRange(values);
  const distractors = createDistractors(correct, minValue, maxValue, values);

  return buildQuestionPayload(
    2,
    `Find the range of these values: ${displayValues.map(formatNumber).join(', ')}.`,
    displayValues,
    correct,
    distractors,
    `Highest value is ${formatNumber(maxValue)} and lowest value is ${formatNumber(minValue)}, so ${formatNumber(maxValue)} - ${formatNumber(minValue)} = ${formatNumber(correct)}.`,
    'unordered_values',
    rng,
  );
};

const buildDifficulty3 = (rng: Rng): RangeRodeoQuestion => {
  const minValue = randomInt(0, 30, rng);
  const maxValue = randomInt(minValue + 6, minValue + 24, rng);
  const range = maxValue - minValue;
  const innerA = randomInt(minValue + 1, maxValue - 1, rng);
  const innerB = randomInt(minValue + 1, maxValue - 1, rng);
  const hideLow = rng() < 0.5;
  const missingValue = hideLow ? minValue : maxValue;
  const shownValues = hideLow ? [maxValue, innerA, innerB] : [minValue, innerA, innerB];
  const orderedShown = shuffleArray(shownValues, rng);

  const distractors = [
    missingValue + 1,
    Math.max(0, missingValue - 1),
    innerA,
    innerB,
    hideLow ? maxValue - range + 1 : minValue + range - 1,
  ];

  const minShown = Math.min(...[...shownValues, missingValue]);
  const maxShown = Math.max(...[...shownValues, missingValue]);

  return buildQuestionPayload(
    3,
    `The range of ${orderedShown.map(formatNumber).join(', ')}, __ is ${formatNumber(range)}. What is the missing number?`,
    orderedShown,
    missingValue,
    distractors,
    `Range is highest minus lowest. To make a range of ${formatNumber(range)}, the missing value must be ${formatNumber(missingValue)} so ${formatNumber(maxShown)} - ${formatNumber(minShown)} = ${formatNumber(range)}.`,
    'missing_value',
    rng,
  );
};

const buildDifficulty4 = (rng: Rng): RangeRodeoQuestion => {
  const contexts = [
    { label: 'rodeo scores', unit: 'points' },
    { label: 'race times', unit: 'seconds' },
    { label: 'temperatures', unit: '°C' },
    { label: 'heights', unit: 'cm' },
    { label: 'team points', unit: 'points' },
    { label: 'distances', unit: 'm' },
  ] as const;
  const names = ['Ava', 'Jay', 'Noor', 'Mia', 'Leo', 'Ivy', 'Zara'];
  const context = contexts[randomInt(0, contexts.length - 1, rng)];
  const count = randomInt(4, 5, rng);
  const selectedNames = shuffleArray(names, rng).slice(0, count);
  const values = Array.from({ length: count }, () => randomInt(12, 120, rng));
  const minValue = Math.min(...values);
  const maxValue = Math.max(...values);
  const correct = calculateRange(values);

  const mapped = selectedNames
    .map((name, index) => `${name}: ${formatNumber(values[index])} ${context.unit}`)
    .join(', ');

  const distractors = createDistractors(correct, minValue, maxValue, values);

  return buildQuestionPayload(
    4,
    `In a ${context.label} round, these results were recorded: ${mapped}. What is the range?`,
    values,
    correct,
    distractors,
    `Highest value is ${formatNumber(maxValue)} ${context.unit} and lowest value is ${formatNumber(minValue)} ${context.unit}, so ${formatNumber(maxValue)} - ${formatNumber(minValue)} = ${formatNumber(correct)}.`,
    'word_problem',
    rng,
  );
};

const buildDifficulty5 = (rng: Rng): RangeRodeoQuestion => {
  const variant = randomInt(1, 3, rng);

  if (variant === 1) {
    const count = randomInt(5, 7, rng);
    const values = Array.from({ length: count }, () => randomDecimal(-15, 35, rng));
    const minValue = Math.min(...values);
    const maxValue = Math.max(...values);
    const correct = calculateRange(values);
    const distractors = createDistractors(correct, minValue, maxValue, values);
    return buildQuestionPayload(
      5,
      `Find the range of these values: ${values.map(formatNumber).join(', ')}.`,
      values,
      correct,
      distractors,
      `Highest value is ${formatNumber(maxValue)} and lowest value is ${formatNumber(minValue)}, so ${formatNumber(maxValue)} - (${formatNumber(minValue)}) = ${formatNumber(correct)}.`,
      'advanced_decimals_negatives',
      rng,
    );
  }

  if (variant === 2) {
    const minValue = roundToOne(randomDecimal(-12, 8, rng));
    const maxValue = roundToOne(minValue + randomDecimal(8, 22, rng));
    const range = roundToOne(maxValue - minValue);
    const innerA = roundToOne(randomDecimal(minValue + 0.5, maxValue - 0.5, rng));
    const innerB = roundToOne(randomDecimal(minValue + 0.5, maxValue - 0.5, rng));
    const missingValue = rng() < 0.5 ? minValue : maxValue;
    const shownValues = missingValue === minValue ? [maxValue, innerA, innerB] : [minValue, innerA, innerB];
    const orderedShown = shuffleArray(shownValues, rng);
    const distractors = [
      roundToOne(missingValue + 1),
      roundToOne(missingValue - 1),
      roundToOne(innerA),
      roundToOne(innerB),
      roundToOne(missingValue + 0.5),
    ];
    return buildQuestionPayload(
      5,
      `The range of ${orderedShown.map(formatNumber).join(', ')}, __ is ${formatNumber(range)}. What is the missing value?`,
      orderedShown,
      missingValue,
      distractors,
      `Range is highest minus lowest. The missing endpoint must be ${formatNumber(missingValue)} so the range stays ${formatNumber(range)}.`,
      'advanced_missing_value',
      rng,
    );
  }

  const count = randomInt(6, 7, rng);
  const values = Array.from({ length: count }, () => randomInt(-25, 130, rng));
  const minValue = Math.min(...values);
  const maxValue = Math.max(...values);
  const correct = calculateRange(values);
  const distractors = createDistractors(correct, minValue, maxValue, values);
  return buildQuestionPayload(
    5,
    `A dataset contains ${values.map(formatNumber).join(', ')}. What is its range?`,
    values,
    correct,
    distractors,
    `Highest value is ${formatNumber(maxValue)} and lowest value is ${formatNumber(minValue)}, so ${formatNumber(maxValue)} - ${formatNumber(minValue)} = ${formatNumber(correct)}.`,
    'large_dataset',
    rng,
  );
};

export const generateRangeRodeoQuestion = (
  difficulty: RangeRodeoDifficulty,
): RangeRodeoQuestion => {
  const rng = Math.random;
  switch (difficulty) {
    case 1:
      return buildDifficulty1(rng);
    case 2:
      return buildDifficulty2(rng);
    case 3:
      return buildDifficulty3(rng);
    case 4:
      return buildDifficulty4(rng);
    case 5:
      return buildDifficulty5(rng);
    default:
      return buildDifficulty1(rng);
  }
};

const clampDifficulty = (difficulty: number): RangeRodeoDifficulty => {
  if (difficulty <= 1) return 1;
  if (difficulty >= 5) return 5;
  return difficulty as RangeRodeoDifficulty;
};

const getBaseDifficultyForQuestion = (questionNumber: number): RangeRodeoDifficulty => {
  if (questionNumber <= 3) return 1;
  if (questionNumber <= 6) return 2;
  if (questionNumber <= 9) return 3;
  if (questionNumber <= 12) return 4;
  return 5;
};

export const generateRangeRodeoRound = (
  currentScore: number,
  questionsAnswered: number,
  context: RangeRodeoRoundContext = {},
): RangeRodeoQuestion => {
  // reserved for seeded deterministic extension and adaptive logic expansion
  void currentScore;
  let difficulty = getBaseDifficultyForQuestion(questionsAnswered + 1);

  if ((context.correctStreak ?? 0) >= 3) {
    difficulty = clampDifficulty(difficulty + 1);
  }
  if (context.lostLifeRecently) {
    difficulty = clampDifficulty(difficulty - 1);
  }

  return generateRangeRodeoQuestion(difficulty);
};

export const isRangeRodeoAnswerCorrect = (
  question: Pick<RangeRodeoQuestion, 'answers' | 'correctAnswer' | 'correctIndex'>,
  answerIndex: number,
): boolean => {
  if (answerIndex === question.correctIndex) return true;
  const parsed = parseAnswerValue(question.answers[answerIndex] ?? '');
  return parsed !== null && Math.abs(parsed - question.correctAnswer) < EPSILON;
};
