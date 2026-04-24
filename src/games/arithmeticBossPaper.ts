export type ArithmeticQuestionType =
  | 'addition'
  | 'subtraction'
  | 'multiplication'
  | 'division'
  | 'decimal'
  | 'fraction'
  | 'percentage'
  | 'scaling'
  | 'mixed';

export type ArithmeticDifficulty = 'easy' | 'medium' | 'hard';

export type ArithmeticQuestion = {
  id: number;
  question: string;
  answer: string | number;
  acceptedAnswers?: Array<string | number>;
  marks: 1 | 2;
  type: ArithmeticQuestionType;
  difficulty: ArithmeticDifficulty;
  signature: string;
  choices: Array<string | number>;
};

export type ArithmeticPaper = {
  paperId: string;
  seed: string | number;
  totalMarks: 40;
  timeLimitSeconds: 1800;
  questions: ArithmeticQuestion[];
};

export type ArithmeticPaperResult = {
  score: number;
  totalMarks: 40;
  percentage: number;
  correctCount: number;
  results: Array<{
    questionId: number;
    userAnswer: string;
    correctAnswer: string | number;
    isCorrect: boolean;
    marksAwarded: number;
    marksAvailable: number;
  }>;
  stars: 1 | 2 | 3;
  xpAwarded: number;
  passed: boolean;
};

type QuestionTemplate =
  | 'easy_addition'
  | 'easy_subtraction'
  | 'easy_multiplication'
  | 'easy_division'
  | 'easy_decimal'
  | 'easy_scaling'
  | 'medium_addition'
  | 'medium_subtraction'
  | 'medium_multiplication'
  | 'medium_division'
  | 'medium_decimal'
  | 'medium_fraction_of_amount'
  | 'medium_fraction_common'
  | 'medium_percentage'
  | 'medium_scaling'
  | 'hard_long_multiplication'
  | 'hard_long_division'
  | 'hard_mixed'
  | 'hard_decimal'
  | 'hard_fraction_of_amount'
  | 'hard_percentage'
  | 'hard_add_sub';

type DraftQuestion = Omit<ArithmeticQuestion, 'id' | 'choices'> & {
  operation: string;
  keyNumbers: Array<string | number>;
};

const PAPER_TEMPLATE: QuestionTemplate[] = [
  'easy_addition',
  'easy_subtraction',
  'easy_multiplication',
  'easy_division',
  'easy_decimal',
  'easy_scaling',
  'easy_addition',
  'easy_multiplication',
  'easy_division',
  'easy_subtraction',
  'medium_addition',
  'medium_subtraction',
  'medium_multiplication',
  'medium_division',
  'medium_decimal',
  'medium_fraction_of_amount',
  'medium_percentage',
  'medium_fraction_common',
  'medium_scaling',
  'medium_decimal',
  'medium_multiplication',
  'medium_division',
  'medium_fraction_of_amount',
  'medium_addition',
  'medium_decimal',
  'hard_long_multiplication',
  'hard_long_division',
  'hard_mixed',
  'hard_decimal',
  'hard_fraction_of_amount',
  'hard_percentage',
  'hard_long_multiplication',
  'hard_long_division',
  'hard_mixed',
  'hard_decimal',
  'hard_fraction_of_amount',
  'hard_add_sub',
  'hard_mixed',
  'hard_decimal',
  'hard_fraction_of_amount',
];

const DROPPABLE_TEMPLATE_INDEXES = [27, 33, 37, 38];
const MIN_QUESTION_COUNT = 36;
const MAX_QUESTION_COUNT = 38;
const MIN_ACCEPTED_QUESTION_COUNT = 36;
const MAX_ACCEPTED_QUESTION_COUNT = 40;

const hashSeed = (value: string | number) => {
  const text = String(value);
  let hash = 2166136261;
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
};

const createRandom = (seed: string | number) => {
  let state = hashSeed(seed) || 1;
  return () => {
    state += 0x6D2B79F5;
    let next = state;
    next = Math.imul(next ^ (next >>> 15), next | 1);
    next ^= next + Math.imul(next ^ (next >>> 7), next | 61);
    return ((next ^ (next >>> 14)) >>> 0) / 4294967296;
  };
};

const randomInt = (rng: () => number, min: number, max: number) => Math.floor(rng() * (max - min + 1)) + min;
const pick = <T,>(rng: () => number, items: T[]) => items[randomInt(rng, 0, items.length - 1)];
const formatDecimal = (value: number) => Number(value.toFixed(2)).toString();
const gcd = (a: number, b: number): number => (b === 0 ? Math.abs(a) : gcd(b, a % b));

const simplifyFraction = (numerator: number, denominator: number) => {
  const divisor = gcd(numerator, denominator);
  const simpleNumerator = numerator / divisor;
  const simpleDenominator = denominator / divisor;
  return simpleDenominator === 1 ? String(simpleNumerator) : `${simpleNumerator}/${simpleDenominator}`;
};

const signature = (
  type: ArithmeticQuestionType | string,
  operation: string,
  keyNumbers: Array<string | number>,
  difficulty: ArithmeticDifficulty,
) => `${type}|${operation}|${keyNumbers.join('|')}|${difficulty}`;

const buildChoices = (rng: () => number, answer: string | number, type: ArithmeticQuestionType): Array<string | number> => {
  const answerText = String(answer);
  const numeric = Number(answerText);
  const choices = new Set<string | number>([answer]);

  if (answerText.includes('/')) {
    const [numeratorText, denominatorText] = answerText.split('/');
    const numerator = Number(numeratorText);
    const denominator = Number(denominatorText);
    [
      `${numerator + 1}/${denominator}`,
      `${Math.max(1, numerator - 1)}/${denominator}`,
      `${numerator}/${denominator + 1}`,
      String(Math.round((numerator / denominator) * 100) / 100),
    ].forEach((choice) => choices.add(choice));
  } else if (Number.isFinite(numeric)) {
    const offsets = type === 'decimal'
      ? [0.1, -0.1, 1, -1, 0.01, -0.01]
      : [1, -1, 2, -2, 10, -10, 5, -5];
    offsets.forEach((offset) => {
      const candidate = numeric + offset;
      if (candidate >= 0) choices.add(Number.isInteger(candidate) ? String(candidate) : formatDecimal(candidate));
    });
  }

  let guard = 0;
  while (choices.size < 4 && guard < 20) {
    guard += 1;
    choices.add(`${answerText}${guard}`);
  }

  return [...choices]
    .slice(0, 6)
    .sort(() => rng() - 0.5)
    .slice(0, 4)
    .sort(() => rng() - 0.5);
};

const draftQuestion = (rng: () => number, template: QuestionTemplate): DraftQuestion => {
  switch (template) {
    case 'easy_addition': {
      const a = randomInt(rng, 18, 79);
      const b = randomInt(rng, 11, 69);
      return {
        question: `${a} + ${b} =`,
        answer: a + b,
        marks: 1,
        type: 'addition',
        difficulty: 'easy',
        operation: 'addition',
        keyNumbers: [a, b],
        signature: signature('addition', 'addition', [a, b], 'easy'),
      };
    }
    case 'easy_subtraction': {
      const b = randomInt(rng, 11, 58);
      const answer = randomInt(rng, 15, 90);
      const a = answer + b;
      return {
        question: `${a} - ${b} =`,
        answer,
        marks: 1,
        type: 'subtraction',
        difficulty: 'easy',
        operation: 'subtraction',
        keyNumbers: [a, b],
        signature: signature('subtraction', 'subtraction', [a, b], 'easy'),
      };
    }
    case 'easy_multiplication': {
      const a = randomInt(rng, 3, 12);
      const b = randomInt(rng, 3, 12);
      return {
        question: `${a} x ${b} =`,
        answer: a * b,
        marks: 1,
        type: 'multiplication',
        difficulty: 'easy',
        operation: 'times_tables',
        keyNumbers: [a, b],
        signature: signature('multiplication', 'times_tables', [a, b], 'easy'),
      };
    }
    case 'easy_division': {
      const divisor = randomInt(rng, 2, 12);
      const quotient = randomInt(rng, 3, 12);
      const dividend = divisor * quotient;
      return {
        question: `${dividend} / ${divisor} =`,
        answer: quotient,
        marks: 1,
        type: 'division',
        difficulty: 'easy',
        operation: 'basic_division',
        keyNumbers: [dividend, divisor],
        signature: signature('division', 'basic_division', [dividend, divisor], 'easy'),
      };
    }
    case 'easy_decimal': {
      const a = randomInt(rng, 12, 89) / 10;
      const b = randomInt(rng, 2, 35) / 10;
      const op = rng() > 0.5 ? 'decimal_addition' : 'decimal_subtraction';
      const left = op === 'decimal_subtraction' ? Math.max(a, b) : a;
      const right = op === 'decimal_subtraction' ? Math.min(a, b) : b;
      const answer = op === 'decimal_addition' ? left + right : left - right;
      return {
        question: `${formatDecimal(left)} ${op === 'decimal_addition' ? '+' : '-'} ${formatDecimal(right)} =`,
        answer: formatDecimal(answer),
        marks: 1,
        type: 'decimal',
        difficulty: 'easy',
        operation: op,
        keyNumbers: [formatDecimal(left), formatDecimal(right)],
        signature: signature('decimal', op, [formatDecimal(left), formatDecimal(right)], 'easy'),
      };
    }
    case 'easy_scaling': {
      const value = randomInt(rng, 12, 98);
      const scale = pick(rng, [10, 100]);
      const op = rng() > 0.5 ? 'multiply_by_scale' : 'divide_by_scale';
      const answer = op === 'multiply_by_scale' ? value * scale : value / scale;
      return {
        question: `${value} ${op === 'multiply_by_scale' ? 'x' : '/'} ${scale} =`,
        answer: formatDecimal(answer),
        marks: 1,
        type: 'scaling',
        difficulty: 'easy',
        operation: op,
        keyNumbers: [value, scale],
        signature: signature('scaling', op, [value, scale], 'easy'),
      };
    }
    case 'medium_addition': {
      const a = randomInt(rng, 220, 899);
      const b = randomInt(rng, 120, 799);
      return {
        question: `${a} + ${b} =`,
        answer: a + b,
        marks: 1,
        type: 'addition',
        difficulty: 'medium',
        operation: 'larger_addition',
        keyNumbers: [a, b],
        signature: signature('addition', 'larger_addition', [a, b], 'medium'),
      };
    }
    case 'medium_subtraction': {
      const b = randomInt(rng, 120, 799);
      const answer = randomInt(rng, 120, 799);
      const a = answer + b;
      return {
        question: `${a} - ${b} =`,
        answer,
        marks: 1,
        type: 'subtraction',
        difficulty: 'medium',
        operation: 'larger_subtraction',
        keyNumbers: [a, b],
        signature: signature('subtraction', 'larger_subtraction', [a, b], 'medium'),
      };
    }
    case 'medium_multiplication': {
      const a = randomInt(rng, 14, 98);
      const b = randomInt(rng, 3, 9);
      return {
        question: `${a} x ${b} =`,
        answer: a * b,
        marks: 1,
        type: 'multiplication',
        difficulty: 'medium',
        operation: 'short_multiplication',
        keyNumbers: [a, b],
        signature: signature('multiplication', 'short_multiplication', [a, b], 'medium'),
      };
    }
    case 'medium_division': {
      const divisor = randomInt(rng, 3, 9);
      const quotient = randomInt(rng, 14, 98);
      const dividend = divisor * quotient;
      return {
        question: `${dividend} / ${divisor} =`,
        answer: quotient,
        marks: 1,
        type: 'division',
        difficulty: 'medium',
        operation: 'short_division',
        keyNumbers: [dividend, divisor],
        signature: signature('division', 'short_division', [dividend, divisor], 'medium'),
      };
    }
    case 'medium_decimal': {
      const a = randomInt(rng, 150, 999) / 100;
      const b = randomInt(rng, 25, 599) / 100;
      const op = rng() > 0.5 ? 'decimal_addition' : 'decimal_subtraction';
      const left = op === 'decimal_subtraction' ? Math.max(a, b) : a;
      const right = op === 'decimal_subtraction' ? Math.min(a, b) : b;
      const answer = op === 'decimal_addition' ? left + right : left - right;
      return {
        question: `${formatDecimal(left)} ${op === 'decimal_addition' ? '+' : '-'} ${formatDecimal(right)} =`,
        answer: formatDecimal(answer),
        marks: 1,
        type: 'decimal',
        difficulty: 'medium',
        operation: op,
        keyNumbers: [formatDecimal(left), formatDecimal(right)],
        signature: signature('decimal', op, [formatDecimal(left), formatDecimal(right)], 'medium'),
      };
    }
    case 'medium_fraction_of_amount':
    case 'hard_fraction_of_amount': {
      const difficulty = template === 'hard_fraction_of_amount' ? 'hard' : 'medium';
      const denominator = pick(rng, difficulty === 'hard' ? [6, 8, 9, 10, 12] : [3, 4, 5, 8, 10]);
      const numerator = randomInt(rng, 1, denominator - 1);
      const amount = denominator * randomInt(rng, difficulty === 'hard' ? 18 : 8, difficulty === 'hard' ? 70 : 30);
      const answer = (amount / denominator) * numerator;
      return {
        question: `${numerator}/${denominator} of ${amount} =`,
        answer,
        acceptedAnswers: [String(answer)],
        marks: 1,
        type: 'fraction',
        difficulty,
        operation: 'fraction_of_amount',
        keyNumbers: [`${numerator}/${denominator}`, amount],
        signature: signature('fraction_of_amount', `${numerator}/${denominator}`, [amount], difficulty),
      };
    }
    case 'medium_fraction_common': {
      const denominator = pick(rng, [5, 6, 8, 10, 12]);
      const a = randomInt(rng, 1, Math.floor(denominator / 2));
      const b = randomInt(rng, 1, denominator - a - 1);
      const answer = simplifyFraction(a + b, denominator);
      return {
        question: `${a}/${denominator} + ${b}/${denominator} =`,
        answer,
        acceptedAnswers: [`${a + b}/${denominator}`],
        marks: 1,
        type: 'fraction',
        difficulty: 'medium',
        operation: 'fraction_addition_common_denominator',
        keyNumbers: [`${a}/${denominator}`, `${b}/${denominator}`],
        signature: signature('fraction', 'common_denominator_addition', [a, b, denominator], 'medium'),
      };
    }
    case 'medium_percentage':
    case 'hard_percentage': {
      const difficulty = template === 'hard_percentage' ? 'hard' : 'medium';
      const percent = pick(rng, difficulty === 'hard' ? [5, 15, 20, 25, 75] : [10, 20, 25, 50, 75]);
      const amount = pick(rng, difficulty === 'hard' ? [160, 240, 320, 480, 640, 800] : [40, 60, 80, 120, 160, 200]);
      const answer = (percent * amount) / 100;
      return {
        question: `${percent}% of ${amount} =`,
        answer,
        marks: 1,
        type: 'percentage',
        difficulty,
        operation: 'percentage_of_amount',
        keyNumbers: [percent, amount],
        signature: signature('percentage', 'percentage_of_amount', [percent, amount], difficulty),
      };
    }
    case 'medium_scaling': {
      const value = randomInt(rng, 11, 999);
      const scale = pick(rng, [10, 100, 1000]);
      const op = rng() > 0.5 ? 'multiply_by_scale' : 'divide_by_scale';
      const answer = op === 'multiply_by_scale' ? value * scale : value / scale;
      return {
        question: `${value} ${op === 'multiply_by_scale' ? 'x' : '/'} ${scale} =`,
        answer: formatDecimal(answer),
        marks: 1,
        type: 'scaling',
        difficulty: 'medium',
        operation: op,
        keyNumbers: [value, scale],
        signature: signature('scaling', op, [value, scale], 'medium'),
      };
    }
    case 'hard_long_multiplication': {
      const a = randomInt(rng, 126, 987);
      const b = randomInt(rng, 12, 89);
      return {
        question: `${a} x ${b} =`,
        answer: a * b,
        marks: 1,
        type: 'multiplication',
        difficulty: 'hard',
        operation: 'long_multiplication',
        keyNumbers: [a, b],
        signature: signature('long_multiplication', 'formal_method', [a, b], 'hard'),
      };
    }
    case 'hard_long_division': {
      const divisor = randomInt(rng, 12, 32);
      const quotient = randomInt(rng, 24, 140);
      const dividend = divisor * quotient;
      return {
        question: `${dividend} / ${divisor} =`,
        answer: quotient,
        marks: 1,
        type: 'division',
        difficulty: 'hard',
        operation: 'long_division',
        keyNumbers: [dividend, divisor],
        signature: signature('long_division', 'formal_method', [dividend, divisor], 'hard'),
      };
    }
    case 'hard_mixed': {
      const a = randomInt(rng, 8, 30);
      const b = randomInt(rng, 3, 12);
      const c = randomInt(rng, 25, 180);
      return {
        question: `${a} x ${b} + ${c} =`,
        answer: (a * b) + c,
        marks: 1,
        type: 'mixed',
        difficulty: 'hard',
        operation: 'mixed_operations',
        keyNumbers: [a, b, c],
        signature: signature('mixed', 'multiply_then_add', [a, b, c], 'hard'),
      };
    }
    case 'hard_decimal': {
      const a = randomInt(rng, 12, 99) / 10;
      const b = pick(rng, [2, 3, 4, 5, 6, 8]);
      const op = rng() > 0.5 ? 'decimal_multiplication' : 'decimal_division';
      const left = op === 'decimal_division' ? a * b : a;
      const answer = op === 'decimal_multiplication' ? a * b : left / b;
      return {
        question: `${formatDecimal(left)} ${op === 'decimal_multiplication' ? 'x' : '/'} ${b} =`,
        answer: formatDecimal(answer),
        marks: 1,
        type: 'decimal',
        difficulty: 'hard',
        operation: op,
        keyNumbers: [formatDecimal(left), b],
        signature: signature('decimal', op, [formatDecimal(left), b], 'hard'),
      };
    }
    case 'hard_add_sub': {
      const a = randomInt(rng, 2000, 9999);
      const b = randomInt(rng, 1000, 8999);
      const op = rng() > 0.5 ? 'large_addition' : 'large_subtraction';
      const left = op === 'large_subtraction' ? Math.max(a, b) : a;
      const right = op === 'large_subtraction' ? Math.min(a, b) : b;
      return {
        question: `${left} ${op === 'large_addition' ? '+' : '-'} ${right} =`,
        answer: op === 'large_addition' ? left + right : left - right,
        marks: 1,
        type: op === 'large_addition' ? 'addition' : 'subtraction',
        difficulty: 'hard',
        operation: op,
        keyNumbers: [left, right],
        signature: signature(op === 'large_addition' ? 'addition' : 'subtraction', op, [left, right], 'hard'),
      };
    }
    default:
      throw new Error(`Unhandled arithmetic template: ${template}`);
  }
};

const isValidAnswer = (answer: string | number) => {
  const text = String(answer);
  if (!text.trim()) return false;
  if (text.includes('/')) {
    const [numerator, denominator] = text.split('/').map(Number);
    return Number.isFinite(numerator) && Number.isFinite(denominator) && denominator !== 0;
  }
  return Number.isFinite(Number(text));
};

const buildQuestion = (rng: () => number, template: QuestionTemplate, id: number): ArithmeticQuestion => {
  const draft = draftQuestion(rng, template);
  return {
    id,
    question: draft.question,
    answer: draft.answer,
    acceptedAnswers: draft.acceptedAnswers,
    marks: draft.marks,
    type: draft.type,
    difficulty: draft.difficulty,
    signature: draft.signature,
    choices: buildChoices(rng, draft.answer, draft.type),
  };
};

const buildPaperTemplate = (rng: () => number) => {
  const questionCount = randomInt(rng, MIN_QUESTION_COUNT, MAX_QUESTION_COUNT);
  const extraMarksNeeded = 40 - questionCount;
  const dropIndexes = new Set<number>(
    DROPPABLE_TEMPLATE_INDEXES
      .slice()
      .sort(() => rng() - 0.5)
      .slice(0, extraMarksNeeded),
  );

  return PAPER_TEMPLATE.filter((_, index) => !dropIndexes.has(index));
};

export const validateArithmeticPaper = (paper: ArithmeticPaper): boolean => {
  if (paper.questions.length < MIN_ACCEPTED_QUESTION_COUNT || paper.questions.length > MAX_ACCEPTED_QUESTION_COUNT) return false;
  if (paper.totalMarks !== 40) return false;
  if (paper.timeLimitSeconds !== 1800) return false;
  if (paper.questions.reduce((sum, question) => sum + question.marks, 0) !== 40) return false;

  const questionTexts = new Set<string>();
  const signatures = new Set<string>();
  const counts = {
    additionSubtraction: 0,
    multiplication: 0,
    division: 0,
    fractionDecimalPercentage: 0,
    longMultiplication: 0,
    longDivision: 0,
    decimal: 0,
    fractionOfAmount: 0,
    percentage: 0,
    twoMarkFormal: 0,
  };

  for (let index = 0; index < paper.questions.length; index += 1) {
    const question = paper.questions[index];
    if (question.id !== index + 1) return false;
    if (!isValidAnswer(question.answer)) return false;
    if (questionTexts.has(question.question)) return false;
    if (signatures.has(question.signature)) return false;
    questionTexts.add(question.question);
    signatures.add(question.signature);

    if (question.type === 'addition' || question.type === 'subtraction') counts.additionSubtraction += 1;
    if (question.type === 'multiplication') counts.multiplication += 1;
    if (question.type === 'division') counts.division += 1;
    if (question.type === 'fraction' || question.type === 'decimal' || question.type === 'percentage') counts.fractionDecimalPercentage += 1;
    if (question.signature.startsWith('long_multiplication')) counts.longMultiplication += 1;
    if (question.signature.startsWith('long_division')) counts.longDivision += 1;
    if (
      question.marks === 2
      && (
        question.signature.startsWith('long_multiplication')
        || question.signature.startsWith('long_division')
      )
    ) counts.twoMarkFormal += 1;
    if (question.marks === 2 && !question.signature.startsWith('long_multiplication') && !question.signature.startsWith('long_division')) return false;
    if (question.type === 'decimal') counts.decimal += 1;
    if (question.signature.startsWith('fraction_of_amount')) counts.fractionOfAmount += 1;
    if (question.type === 'percentage') counts.percentage += 1;
  }

  return counts.additionSubtraction >= 6
    && counts.multiplication >= 6
    && counts.division >= 6
    && counts.fractionDecimalPercentage >= 8
    && counts.longMultiplication >= 2
    && counts.longDivision >= 2
    && counts.decimal >= 4
    && counts.fractionOfAmount >= 3
    && counts.percentage >= 2
    && counts.twoMarkFormal === 40 - paper.questions.length;
};

export const generateArithmeticBossPaper = (seed: string | number = `${Date.now()}-${Math.random()}`): ArithmeticPaper => {
  for (let attempt = 0; attempt < 25; attempt += 1) {
    const attemptSeed = `${seed}-${attempt}`;
    const rng = createRandom(attemptSeed);
    const usedSignatures = new Set<string>();
    const usedQuestions = new Set<string>();
    const usedNumberPairs = new Set<string>();
    const questions: ArithmeticQuestion[] = [];
    const paperTemplate = buildPaperTemplate(rng);

    for (const template of paperTemplate) {
      let question: ArithmeticQuestion | null = null;
      for (let guard = 0; guard < 80 && !question; guard += 1) {
        const candidate = buildQuestion(rng, template, questions.length + 1);
        const numberPair = candidate.signature.split('|').slice(2, -1).join('|');
        if (
          !usedSignatures.has(candidate.signature)
          && !usedQuestions.has(candidate.question)
          && !usedNumberPairs.has(numberPair)
          && isValidAnswer(candidate.answer)
        ) {
          question = candidate;
          usedSignatures.add(candidate.signature);
          usedQuestions.add(candidate.question);
          usedNumberPairs.add(numberPair);
        }
      }
      if (question) questions.push(question);
    }

    const twoMarkQuestionCount = 40 - questions.length;
    questions
      .filter((question) => (
        question.signature.startsWith('long_multiplication')
        || question.signature.startsWith('long_division')
      ))
      .sort(() => rng() - 0.5)
      .slice(0, twoMarkQuestionCount)
      .forEach((question) => {
        question.marks = 2;
      });

    const paper: ArithmeticPaper = {
      paperId: `arithmetic-boss-${hashSeed(attemptSeed).toString(36)}`,
      seed: attemptSeed,
      totalMarks: 40,
      timeLimitSeconds: 1800,
      questions,
    };

    if (validateArithmeticPaper(paper)) return paper;
  }

  throw new Error('Unable to generate a valid arithmetic boss paper.');
};

const parseFraction = (value: string) => {
  if (!value.includes('/')) return null;
  const [numeratorText, denominatorText] = value.split('/');
  const numerator = Number(numeratorText);
  const denominator = Number(denominatorText);
  if (!Number.isFinite(numerator) || !Number.isFinite(denominator) || denominator === 0) return null;
  return numerator / denominator;
};

const normalizeAnswer = (value: string | number) => String(value)
  .trim()
  .replace(/,/g, '')
  .replace(/\s+/g, '')
  .toLowerCase();

const answersMatch = (left: string | number, right: string | number) => {
  const normalizedLeft = normalizeAnswer(left);
  const normalizedRight = normalizeAnswer(right);
  if (normalizedLeft === normalizedRight) return true;

  const leftFraction = parseFraction(normalizedLeft);
  const rightFraction = parseFraction(normalizedRight);
  const leftNumber = leftFraction ?? Number(normalizedLeft);
  const rightNumber = rightFraction ?? Number(normalizedRight);

  return Number.isFinite(leftNumber)
    && Number.isFinite(rightNumber)
    && Math.abs(leftNumber - rightNumber) < 0.0000001;
};

export const markArithmeticPaper = (
  paper: ArithmeticPaper,
  userAnswers: Record<number, string | number | undefined>,
  completedBeforeTimer = false,
): ArithmeticPaperResult => {
  const results = paper.questions.map((question) => {
    const userAnswer = userAnswers[question.id] ?? '';
    const possibleAnswers = [question.answer, ...(question.acceptedAnswers ?? [])];
    const isCorrect = possibleAnswers.some((answer) => answersMatch(userAnswer, answer));
    return {
      questionId: question.id,
      userAnswer: String(userAnswer),
      correctAnswer: question.answer,
      isCorrect,
      marksAwarded: isCorrect ? question.marks : 0,
      marksAvailable: question.marks,
    };
  });
  const score = results.reduce((sum, result) => sum + result.marksAwarded, 0);
  const percentage = Math.round((score / paper.totalMarks) * 100);
  const correctCount = results.filter((result) => result.isCorrect).length;
  const stars = score >= 34 ? 3 : score >= 24 ? 2 : 1;
  const xpAwarded = (score * 10)
    + (completedBeforeTimer ? 100 : 0)
    + (score >= 34 ? 150 : 0)
    + (score === 40 ? 250 : 0);

  return {
    score,
    totalMarks: 40,
    percentage,
    correctCount,
    results,
    stars,
    xpAwarded,
    passed: score >= 24,
  };
};
