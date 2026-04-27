import { shuffle } from '../../utils/questionShuffle';
import { AnswerOption, pickNextQuestionAvoidingImmediateRepeat } from '../../utils/answerOptions';

export type FactorProblemType = 'missing_factor' | 'all_factors' | 'common_factors' | 'prime_factors' | 'fallback';
export type FactorRuleType =
  | 'factor_of'
  | 'not_factor_of'
  | 'multiple_of'
  | 'not_multiple_of'
  | 'common_factor'
  | 'common_multiple'
  | 'missing_factor'
  | 'prime_factor';

export interface FactorProblem {
  id: number;
  type: FactorProblemType;
  ruleType: FactorRuleType;
  number: number;
  number2?: number;
  options: AnswerOption<number>[];
  correctAnswers: number[];
  question: string;
}

const OPTION_COUNT = 4;
const MAX_GENERATION_RETRIES = 20;
const factorQuestionFallbackIndex = new Map<string, number>();

const getFactors = (input: number): number[] => {
  const number = Math.abs(Math.trunc(input));
  if (number <= 0) return [];
  const factors: number[] = [];
  for (let factor = 1; factor <= number; factor += 1) {
    if (number % factor === 0) factors.push(factor);
  }
  return factors;
};

const getPrimeFactors = (input: number): number[] => {
  const factors: number[] = [];
  let divisor = 2;
  let remaining = Math.abs(Math.trunc(input));

  while (remaining > 1) {
    while (remaining % divisor === 0) {
      factors.push(divisor);
      remaining /= divisor;
    }
    divisor += 1;
  }

  return [...new Set(factors)];
};

const normalizeUniqueValues = (values: number[]) =>
  Array.from(
    new Set(
      values
        .map((value) => Math.trunc(value))
        .filter((value) => Number.isFinite(value) && value > 0),
    ),
  );

const createFisherYatesAnswerOptions = (
  questionId: string,
  correctAnswers: number[],
  distractors: number[],
  optionCount = OPTION_COUNT,
): AnswerOption<number>[] => {
  const uniqueCorrectAnswers = normalizeUniqueValues(correctAnswers);
  const correctSet = new Set(uniqueCorrectAnswers);
  const uniqueDistractors = normalizeUniqueValues(distractors).filter((value) => !correctSet.has(value));
  const requiredDistractors = Math.max(0, optionCount - uniqueCorrectAnswers.length);
  const selectedDistractors = shuffle(uniqueDistractors).slice(0, requiredDistractors);

  if (selectedDistractors.length < requiredDistractors) {
    const synthetic: number[] = [];
    const seeds = uniqueCorrectAnswers.length > 0 ? uniqueCorrectAnswers : [6, 8, 9, 12];
    let step = 1;
    while (selectedDistractors.length + synthetic.length < requiredDistractors && step <= 25) {
      for (const seed of seeds) {
        const high = seed + step;
        const low = seed - step;
        if (high > 0 && !correctSet.has(high) && !selectedDistractors.includes(high) && !synthetic.includes(high)) synthetic.push(high);
        if (selectedDistractors.length + synthetic.length >= requiredDistractors) break;
        if (low > 0 && !correctSet.has(low) && !selectedDistractors.includes(low) && !synthetic.includes(low)) synthetic.push(low);
        if (selectedDistractors.length + synthetic.length >= requiredDistractors) break;
      }
      step += 1;
    }
    selectedDistractors.push(...synthetic.slice(0, requiredDistractors - selectedDistractors.length));
  }

  const pool = [...uniqueCorrectAnswers, ...selectedDistractors].slice(0, optionCount);
  const shuffled = shuffle(pool).map((value, index) => ({
    id: `${questionId}-${index}-${value}`,
    label: String(value),
    value,
    isCorrect: correctSet.has(value),
  }));

  if (!shuffled.some((option) => option.isCorrect) && shuffled.length > 0 && uniqueCorrectAnswers.length > 0) {
    const forcedValue = uniqueCorrectAnswers[0];
    shuffled[0] = {
      id: `${questionId}-forced-${forcedValue}`,
      label: String(forcedValue),
      value: forcedValue,
      isCorrect: true,
    };
  }

  return shuffled;
};

const pickDisplayedAnswers = (answers: number[], minAnswers = 1, maxAnswers = 3) => {
  const uniqueAnswers = Array.from(new Set(answers)).sort((a, b) => a - b);
  if (uniqueAnswers.length <= maxAnswers) return uniqueAnswers;

  const clampedMin = Math.max(1, Math.min(minAnswers, maxAnswers));
  const targetCount = Math.min(
    uniqueAnswers.length,
    clampedMin + Math.floor(Math.random() * (maxAnswers - clampedMin + 1)),
  );

  return shuffle(uniqueAnswers).slice(0, targetCount).sort((a, b) => a - b);
};

const isMultipleOf = (value: number, base: number) => base !== 0 && value % base === 0;
const isCommonFactor = (value: number, left: number, right: number) => left % value === 0 && right % value === 0;
const isCommonMultiple = (value: number, left: number, right: number) => value % left === 0 && value % right === 0;

export const validateFactorFrenzyQuestion = (question: FactorProblem): boolean => {
  if (!question.question?.trim()) return false;
  if (!Array.isArray(question.correctAnswers) || question.correctAnswers.length === 0) return false;
  if (!Array.isArray(question.options) || question.options.length < OPTION_COUNT) return false;

  const optionValues = question.options.map((option) => option.value);
  const optionLabels = question.options.map((option) => option.label.trim());
  if (new Set(optionValues).size !== optionValues.length) return false;
  if (new Set(optionLabels).size !== optionLabels.length) return false;

  const markedCorrectValues = question.options
    .filter((option) => option.isCorrect)
    .map((option) => option.value)
    .sort((a, b) => a - b);
  const expectedCorrectValues = normalizeUniqueValues(question.correctAnswers).sort((a, b) => a - b);
  if (markedCorrectValues.length !== expectedCorrectValues.length) return false;
  if (!markedCorrectValues.every((value, index) => value === expectedCorrectValues[index])) return false;
  if (!expectedCorrectValues.every((value) => optionValues.includes(value))) return false;

  for (const answer of expectedCorrectValues) {
    switch (question.ruleType) {
      case 'factor_of':
      case 'missing_factor':
        if (question.number % answer !== 0) return false;
        break;
      case 'not_factor_of':
        if (question.number % answer === 0) return false;
        break;
      case 'multiple_of':
        if (!isMultipleOf(answer, question.number)) return false;
        break;
      case 'not_multiple_of':
        if (isMultipleOf(answer, question.number)) return false;
        break;
      case 'common_factor':
        if (!question.number2 || !isCommonFactor(answer, question.number, question.number2)) return false;
        break;
      case 'common_multiple':
        if (!question.number2 || !isCommonMultiple(answer, question.number, question.number2)) return false;
        break;
      case 'prime_factor': {
        const primeFactors = getPrimeFactors(question.number);
        if (!primeFactors.includes(answer)) return false;
        break;
      }
      default:
        return false;
    }
  }

  return true;
};

const fallbackBank: Omit<FactorProblem, 'id'>[] = [
  {
    type: 'fallback',
    ruleType: 'factor_of',
    number: 24,
    question: 'Which number is a factor of 24?',
    correctAnswers: [6],
    options: createFisherYatesAnswerOptions('fallback-factor-24', [6], [1, 2, 3, 4, 8, 12, 24, 5, 7]),
  },
  {
    type: 'fallback',
    ruleType: 'not_factor_of',
    number: 18,
    question: 'Which number is NOT a factor of 18?',
    correctAnswers: [5],
    options: createFisherYatesAnswerOptions('fallback-not-factor-18', [5], [1, 2, 3, 6, 9, 18, 7, 10]),
  },
  {
    type: 'fallback',
    ruleType: 'multiple_of',
    number: 7,
    question: 'Which number is a multiple of 7?',
    correctAnswers: [28],
    options: createFisherYatesAnswerOptions('fallback-multiple-7', [28], [7, 14, 21, 35, 42, 20, 26, 30]),
  },
  {
    type: 'fallback',
    ruleType: 'not_multiple_of',
    number: 5,
    question: 'Which number is NOT a multiple of 5?',
    correctAnswers: [27],
    options: createFisherYatesAnswerOptions('fallback-not-multiple-5', [27], [10, 15, 20, 25, 30, 35, 12, 22]),
  },
  {
    type: 'fallback',
    ruleType: 'common_factor',
    number: 12,
    number2: 18,
    question: 'Which number is a common factor of 12 and 18?',
    correctAnswers: [6],
    options: createFisherYatesAnswerOptions('fallback-common-factor-12-18', [6], [1, 2, 3, 4, 5, 7, 9]),
  },
  {
    type: 'fallback',
    ruleType: 'common_multiple',
    number: 3,
    number2: 4,
    question: 'Which number is a common multiple of 3 and 4?',
    correctAnswers: [24],
    options: createFisherYatesAnswerOptions('fallback-common-multiple-3-4', [24], [12, 36, 48, 18, 30, 40]),
  },
];

const selectFallbackProblem = (level: number): FactorProblem => {
  const fallbackKey = `factor-frenzy-fallback-${level}`;
  const index = (factorQuestionFallbackIndex.get(fallbackKey) ?? -1) + 1;
  const nextIndex = index % fallbackBank.length;
  factorQuestionFallbackIndex.set(fallbackKey, nextIndex);

  const template = fallbackBank[nextIndex];
  return {
    ...template,
    id: Date.now() + Math.floor(Math.random() * 1000),
    options: shuffle(template.options).map((option, idx) => ({
      ...option,
      id: `fallback-${nextIndex}-${idx}-${option.value}`,
    })),
  };
};

const buildFactorProblem = (level: number): FactorProblem => {
  const problemTypes: FactorProblemType[] = ['missing_factor', 'all_factors', 'common_factors', 'prime_factors'];
  const type = problemTypes[Math.min(level - 1, problemTypes.length - 1)];
  const id = Date.now() + Math.floor(Math.random() * 1000);

  if (type === 'missing_factor') {
    const number = Math.floor(Math.random() * 50) + 10;
    const factors = getFactors(number);
    const factor = factors[Math.floor(Math.random() * factors.length)];
    const answer = number / factor;
    const distractors = [answer + 2, answer - 1, answer + 5, answer - 3, answer + 7, answer - 4, factor + 1, factor + 2];

    return {
      id,
      type,
      ruleType: 'missing_factor',
      number,
      question: `The Monster Minds broke the factor chain. Find the missing factor: ${factor} x ? = ${number}`,
      options: createFisherYatesAnswerOptions(`missing-factor-${id}`, [answer], distractors),
      correctAnswers: [answer],
    };
  }

  if (type === 'all_factors') {
    const number = [14, 15, 21, 22, 26, 33, 34, 35, 39, 46, 51, 55][Math.floor(Math.random() * 12)];
    const allFactors = getFactors(number);
    const correctAnswers = pickDisplayedAnswers(allFactors, 2, 3);
    const extras = [number + 1, number - 2, 7, 9, 11, 13, 17, 19, number + 3].filter((value) => value > 0 && !allFactors.includes(value));

    return {
      id,
      type,
      ruleType: 'factor_of',
      number,
      question: `Strike every factor of ${number} shown below to clear the swarm.`,
      options: createFisherYatesAnswerOptions(`all-factors-${id}`, correctAnswers, [...allFactors, ...extras]),
      correctAnswers,
    };
  }

  if (type === 'common_factors') {
    const pairs: Array<[number, number]> = [
      [12, 18],
      [18, 24],
      [24, 36],
      [20, 30],
      [30, 45],
    ];
    const [number, number2] = pairs[Math.floor(Math.random() * pairs.length)];
    const allCommonAnswers = getFactors(number).filter((value) => getFactors(number2).includes(value));
    const commonAnswers = pickDisplayedAnswers(allCommonAnswers, 2, 3);
    const extras = [5, 7, 9, 11, 13, 14, 15, 16].filter((value) => !allCommonAnswers.includes(value));

    return {
      id,
      type,
      ruleType: 'common_factor',
      number,
      number2,
      question: `Find every common factor shown for ${number} and ${number2} to break the Monster Minds' defence.`,
      options: createFisherYatesAnswerOptions(`common-factors-${id}`, commonAnswers, [...allCommonAnswers, ...extras]),
      correctAnswers: commonAnswers,
    };
  }

  const number = [12, 20, 30, 42, 60, 72, 84][Math.floor(Math.random() * 7)];
  const allPrimeFactors = getPrimeFactors(number);
  const correctAnswers = pickDisplayedAnswers(allPrimeFactors, 2, 3);
  const pool = shuffle([2, 3, 4, 5, 6, 7, 8, 9, 11, 13, ...allPrimeFactors]);

  return {
    id,
    type,
    ruleType: 'prime_factor',
    number,
    question: `Find every prime factor of ${number} shown below to disrupt the Monster Minds.`,
    options: createFisherYatesAnswerOptions(`prime-factors-${id}`, correctAnswers, pool),
    correctAnswers,
  };
};

export const generateValidatedProblem = (level: number, previousProblem?: FactorProblem | null): FactorProblem => {
  const baseGenerator = () => buildFactorProblem(level);
  const generator = () =>
    pickNextQuestionAvoidingImmediateRepeat(
      baseGenerator,
      previousProblem ?? null,
      (problem) => `${problem.type}-${problem.number}-${problem.number2 ?? 'x'}-${problem.question}`,
    );

  for (let attempt = 0; attempt < MAX_GENERATION_RETRIES; attempt += 1) {
    const candidate = generator();
    if (validateFactorFrenzyQuestion(candidate)) return candidate;
  }

  const fallback = selectFallbackProblem(level);
  if (validateFactorFrenzyQuestion(fallback)) return fallback;
  return { ...fallbackBank[0], id: Date.now() };
};

