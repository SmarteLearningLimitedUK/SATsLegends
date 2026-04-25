export type ReasoningQuestionType =
  | 'number'
  | 'fractionsDecimalsPercentages'
  | 'ratio'
  | 'algebra'
  | 'measurement'
  | 'geometry'
  | 'statistics'
  | 'time'
  | 'money'
  | 'area'
  | 'perimeter'
  | 'volume'
  | 'coordinates'
  | 'multiStep'
  | 'explanation';

export type ReasoningResponseMode =
  | 'numericInput'
  | 'textInput'
  | 'multipleChoice'
  | 'multiSelect'
  | 'tableInput'
  | 'coordinateInput'
  | 'ordering'
  | 'matching'
  | 'dragDrop';

export type ReasoningDifficulty = 'easy' | 'medium' | 'hard';

export type ReasoningQuestion = {
  id: number;
  question: string;
  answer: any;
  acceptedAnswers?: any[];
  marks: 1 | 2 | 3;
  type: ReasoningQuestionType;
  responseMode: ReasoningResponseMode;
  difficulty: ReasoningDifficulty;
  signature: string;
  choices?: any[];
  curriculumTags?: ReasoningQuestionType[];
  shapeData?: any;
  gridData?: any;
  chartData?: any;
  tableData?: any;
  numberLineData?: any;
  scaleData?: any;
  areaData?: any;
  perimeterData?: any;
  volumeData?: any;
  ratioData?: any;
  parts?: Array<{
    id: string;
    prompt: string;
    answer: any;
    marks: 1 | 2;
    responseMode: string;
    acceptedAnswers?: any[];
  }>;
  partialMarkRules?: any[];
};

export type ReasoningPaper = {
  paperId: string;
  seed: string | number;
  title: 'Reasoning Summit';
  totalMarks: 35;
  timeLimitSeconds: 2400;
  questions: ReasoningQuestion[];
};

export type ReasoningPaperResult = {
  score: number;
  totalMarks: 35;
  percentage: number;
  correctCount: number;
  results: Array<{
    questionId: number;
    question: string;
    userAnswer: any;
    correctAnswer: any;
    isCorrect: boolean;
    marksAwarded: number;
    marksAvailable: number;
    feedback?: string;
  }>;
  stars: 0 | 1 | 2 | 3;
  xpAwarded: number;
  passed: boolean;
};

type ReasoningTemplate =
  | 'number_order'
  | 'number_round'
  | 'number_missing_digit'
  | 'temperature_negative'
  | 'fdp_equivalent'
  | 'fdp_missing_decimal'
  | 'fraction_shape'
  | 'algebra_function'
  | 'measure_convert'
  | 'read_scale'
  | 'money_change'
  | 'time_duration'
  | 'geometry_symmetry'
  | 'geometry_angle_x'
  | 'coordinates_read'
  | 'stats_bar'
  | 'volume_count'
  | 'ratio_share'
  | 'ratio_recipe'
  | 'percent_context'
  | 'fraction_context'
  | 'algebra_sequence'
  | 'area_rectangle'
  | 'perimeter_missing'
  | 'stats_table'
  | 'graph_explain'
  | 'time_table_explain';

type DraftReasoningQuestion = Omit<ReasoningQuestion, 'id'> & {
  numberSet: Array<string | number>;
  contextKey: string;
};

const SUPPORTED_RESPONSE_MODES: ReasoningResponseMode[] = [
  'numericInput',
  'textInput',
  'multipleChoice',
  'multiSelect',
  'tableInput',
  'coordinateInput',
  'ordering',
  'matching',
  'dragDrop',
];

// Reasoning 2 should ramp earlier: still fair, but with trickier reasoning and
// more multi-step pressure appearing near the start of the paper.
const BASE_PLAN: ReasoningTemplate[] = [
  'number_round',
  'measure_convert',
  'ratio_share',
  'fdp_equivalent',
  'money_change',
  'coordinates_read',
  'algebra_function',
  'stats_bar',
  'geometry_angle_x',
  'time_duration',
  'read_scale',
  'ratio_recipe',
  'area_rectangle',
  'fdp_missing_decimal',
  'volume_count',
  'algebra_sequence',
  'perimeter_missing',
  'stats_table',
  'fraction_context',
  'percent_context',
  'geometry_symmetry',
  'graph_explain',
  'number_order',
  'temperature_negative',
  'time_table_explain',
];

const SHORT_PLAN: ReasoningTemplate[] = [
  'measure_convert',
  'ratio_share',
  'fdp_equivalent',
  'money_change',
  'coordinates_read',
  'algebra_function',
  'stats_bar',
  'geometry_angle_x',
  'time_duration',
  'read_scale',
  'ratio_recipe',
  'area_rectangle',
  'fdp_missing_decimal',
  'volume_count',
  'algebra_sequence',
  'perimeter_missing',
  'stats_table',
  'fraction_context',
  'percent_context',
  'geometry_symmetry',
  'graph_explain',
  'time_table_explain',
  'number_missing_digit',
];

const TEMPLATE_TYPE_MAP: Record<ReasoningTemplate, ReasoningQuestionType> = {
  number_order: 'number',
  number_round: 'number',
  number_missing_digit: 'number',
  temperature_negative: 'number',
  fdp_equivalent: 'fractionsDecimalsPercentages',
  fdp_missing_decimal: 'fractionsDecimalsPercentages',
  fraction_shape: 'fractionsDecimalsPercentages',
  algebra_function: 'algebra',
  measure_convert: 'measurement',
  read_scale: 'measurement',
  money_change: 'money',
  time_duration: 'time',
  geometry_symmetry: 'geometry',
  geometry_angle_x: 'geometry',
  coordinates_read: 'coordinates',
  stats_bar: 'statistics',
  volume_count: 'volume',
  ratio_share: 'ratio',
  ratio_recipe: 'ratio',
  percent_context: 'fractionsDecimalsPercentages',
  fraction_context: 'fractionsDecimalsPercentages',
  algebra_sequence: 'algebra',
  area_rectangle: 'area',
  perimeter_missing: 'perimeter',
  stats_table: 'statistics',
  graph_explain: 'explanation',
  time_table_explain: 'explanation',
};

const hashSeed = (value: string | number) => {
  const text = String(value);
  let hash = 2166136261;
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
};

const createNonRepeatingTemplateOrder = (
  rng: () => number,
  templates: ReasoningTemplate[],
): ReasoningTemplate[] => {
  const ordered = shuffle(rng, templates);
  const build = (
    remaining: ReasoningTemplate[],
    lastType: ReasoningQuestionType | null,
  ): ReasoningTemplate[] | null => {
    if (remaining.length === 0) return [];

    const candidates = shuffle(rng, remaining).sort((left, right) => {
      const leftSameAsPrevious = TEMPLATE_TYPE_MAP[left] === lastType ? 1 : 0;
      const rightSameAsPrevious = TEMPLATE_TYPE_MAP[right] === lastType ? 1 : 0;
      return leftSameAsPrevious - rightSameAsPrevious;
    });

    for (const candidate of candidates) {
      const candidateType = TEMPLATE_TYPE_MAP[candidate];
      if (lastType && candidateType === lastType) continue;

      const nextRemaining = remaining.filter((item) => item !== candidate);
      const tail = build(nextRemaining, candidateType);
      if (tail) {
        return [candidate, ...tail];
      }
    }

    return null;
  };

  return build(ordered, null) ?? ordered;
};

const createProfiledTemplateOrder = (
  rng: () => number,
  templates: ReasoningTemplate[],
  introCount: number,
  segmentSize: number,
): ReasoningTemplate[] => {
  const intro = templates.slice(0, introCount);
  const remainder = templates.slice(introCount);
  const ordered: ReasoningTemplate[] = [...intro];

  for (let index = 0; index < remainder.length; index += segmentSize) {
    const segment = remainder.slice(index, index + segmentSize);
    const lastType = ordered.length > 0 ? TEMPLATE_TYPE_MAP[ordered[ordered.length - 1]] : null;
    const segmentOrder = createNonRepeatingTemplateOrder(rng, segment);
    if (lastType && segmentOrder.length > 1 && TEMPLATE_TYPE_MAP[segmentOrder[0]] === lastType) {
      const swapIndex = segmentOrder.findIndex((template) => TEMPLATE_TYPE_MAP[template] !== lastType);
      if (swapIndex > 0) {
        [segmentOrder[0], segmentOrder[swapIndex]] = [segmentOrder[swapIndex], segmentOrder[0]];
      }
    }
    ordered.push(...segmentOrder);
  }

  return ordered;
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
const shuffle = <T,>(rng: () => number, items: T[]) => [...items].sort(() => rng() - 0.5);
const gcd = (a: number, b: number): number => (b === 0 ? Math.abs(a) : gcd(b, a % b));
const formatDecimal = (value: number) => Number(value.toFixed(2)).toString();

const simplifyFraction = (numerator: number, denominator: number) => {
  const divisor = gcd(numerator, denominator);
  const simpleNumerator = numerator / divisor;
  const simpleDenominator = denominator / divisor;
  return simpleDenominator === 1 ? String(simpleNumerator) : `${simpleNumerator}/${simpleDenominator}`;
};

const stableHash = (value: unknown) => JSON.stringify(value ?? null);

const signature = (
  type: ReasoningQuestionType,
  template: ReasoningTemplate,
  keyNumbers: Array<string | number>,
  difficulty: ReasoningDifficulty,
  visualData?: unknown,
) => `${type}|${template}|${keyNumbers.join('|')}|${stableHash(visualData)}|${difficulty}`;

const withChoices = (rng: () => number, correct: any, wrongs: any[]) => (
  shuffle(rng, Array.from(new Set([correct, ...wrongs].map(String)))).slice(0, 4)
);

const money = (pence: number) => `£${(pence / 100).toFixed(2)}`;

const draftQuestion = (rng: () => number, template: ReasoningTemplate): DraftReasoningQuestion => {
  switch (template) {
    case 'number_order': {
      const values = shuffle(rng, [randomInt(rng, 1200, 2400), randomInt(rng, 2600, 3900), randomInt(rng, 4100, 5600), randomInt(rng, 5800, 7600)]);
      const orderedValues = [...values].sort((a, b) => a - b).map(String);
      const direction = rng() > 0.5 ? 'smallest to largest' : 'greatest to smallest';
      const answerValues = direction === 'smallest to largest' ? orderedValues : [...orderedValues].reverse();
      return {
        question: `Put these numbers in order from ${direction}.`,
        answer: answerValues,
        acceptedAnswers: [answerValues.join('|'), answerValues.join(', ')],
        choices: shuffle(rng, values.map(String)),
        marks: 1,
        type: 'number',
        responseMode: 'ordering',
        difficulty: 'easy',
        signature: signature('number', template, values, 'easy'),
        numberSet: values,
        contextKey: 'order_numbers',
        curriculumTags: ['number'],
      };
    }
    case 'number_round': {
      const value = randomInt(rng, 12450, 98750);
      const rounded = Math.round(value / 1000) * 1000;
      return {
        question: `Round ${value.toLocaleString('en-GB')} to the nearest 1,000.`,
        answer: rounded,
        marks: 1,
        type: 'number',
        responseMode: 'numericInput',
        difficulty: 'easy',
        signature: signature('number', template, [value], 'easy'),
        numberSet: [value],
        contextKey: 'round_number',
        curriculumTags: ['number'],
      };
    }
    case 'number_missing_digit': {
      const digit = randomInt(rng, 3, 8);
      const value = Number(`4${digit}62`);
      return {
        question: `The number 4□62 is greater than 45 62 when the missing digit is what?`,
        answer: digit,
        marks: 1,
        type: 'number',
        responseMode: 'numericInput',
        difficulty: 'easy',
        signature: signature('number', template, [value, digit], 'easy'),
        numberSet: [value, digit],
        contextKey: 'missing_digit_compare',
        curriculumTags: ['number'],
      };
    }
    case 'temperature_negative': {
      const morning = -randomInt(rng, 2, 8);
      const rise = randomInt(rng, 5, 13);
      const answer = morning + rise;
      return {
        question: `At 7 am the temperature was ${morning}°C. By midday it had risen by ${rise}°C. What was the temperature at midday?`,
        answer,
        acceptedAnswers: [`${answer}°C`, `${answer}C`],
        marks: 1,
        type: 'number',
        responseMode: 'numericInput',
        difficulty: 'easy',
        signature: signature('number', template, [morning, rise], 'easy'),
        numberSet: [morning, rise],
        contextKey: 'temperature',
        curriculumTags: ['number', 'measurement'],
      };
    }
    case 'fdp_equivalent': {
      const set = pick(rng, [
        { fraction: '1/2', decimal: '0.5', percent: '50%' },
        { fraction: '1/4', decimal: '0.25', percent: '25%' },
        { fraction: '3/4', decimal: '0.75', percent: '75%' },
        { fraction: '1/5', decimal: '0.2', percent: '20%' },
      ]);
      return {
        question: `Which value is equivalent to ${set.fraction}?`,
        answer: set.decimal,
        acceptedAnswers: [set.percent, set.fraction],
        choices: withChoices(rng, set.decimal, ['0.15', '0.35', '0.6', '80%']),
        marks: 1,
        type: 'fractionsDecimalsPercentages',
        responseMode: 'multipleChoice',
        difficulty: 'easy',
        signature: signature('fractionsDecimalsPercentages', template, [set.fraction], 'easy'),
        numberSet: [set.fraction, set.decimal, set.percent],
        contextKey: 'fdp_equivalence',
        curriculumTags: ['fractionsDecimalsPercentages'],
      };
    }
    case 'fdp_missing_decimal': {
      const denominator = pick(rng, [4, 5, 10]);
      const numerator = randomInt(rng, 1, denominator - 1);
      const answer = formatDecimal(numerator / denominator);
      return {
        question: `Complete the equivalent value: ${numerator}/${denominator} = □`,
        answer,
        acceptedAnswers: [`${(numerator / denominator) * 100}%`],
        marks: 1,
        type: 'fractionsDecimalsPercentages',
        responseMode: 'numericInput',
        difficulty: 'easy',
        signature: signature('fractionsDecimalsPercentages', template, [numerator, denominator], 'easy'),
        numberSet: [numerator, denominator],
        contextKey: 'missing_decimal',
        curriculumTags: ['fractionsDecimalsPercentages'],
      };
    }
    case 'fraction_shape': {
      const shaded = randomInt(rng, 2, 5);
      const total = 8;
      const answer = simplifyFraction(shaded, total);
      const areaData = {
        gridWidth: 4,
        gridHeight: 2,
        shadedCells: Array.from({ length: shaded }, (_, index) => ({ x: index % 4, y: Math.floor(index / 4) })),
        unit: 'part',
      };
      return {
        question: 'What fraction of the shape is shaded?',
        answer,
        acceptedAnswers: [`${shaded}/${total}`],
        marks: 1,
        type: 'fractionsDecimalsPercentages',
        responseMode: 'numericInput',
        difficulty: 'easy',
        signature: signature('fractionsDecimalsPercentages', template, [shaded, total], 'easy', areaData),
        areaData,
        numberSet: [shaded, total],
        contextKey: 'fraction_shape_grid',
        curriculumTags: ['fractionsDecimalsPercentages', 'geometry', 'area'],
      };
    }
    case 'algebra_function': {
      const multiplier = randomInt(rng, 2, 6);
      const add = randomInt(rng, 3, 12);
      const input = randomInt(rng, 4, 15);
      const answer = (input * multiplier) + add;
      return {
        question: `A function machine multiplies by ${multiplier}, then adds ${add}. What is the output for input ${input}?`,
        answer,
        marks: 1,
        type: 'algebra',
        responseMode: 'numericInput',
        difficulty: 'easy',
        signature: signature('algebra', template, [multiplier, add, input], 'easy'),
        numberSet: [multiplier, add, input],
        contextKey: 'function_machine',
        curriculumTags: ['algebra', 'multiStep'],
      };
    }
    case 'measure_convert': {
      const metres = randomInt(rng, 2, 8);
      const cm = randomInt(rng, 10, 90);
      const answer = (metres * 100) + cm;
      return {
        question: `A ribbon is ${metres} m ${cm} cm long. How many centimetres is this?`,
        answer,
        acceptedAnswers: [`${answer}cm`, `${answer} cm`],
        marks: 1,
        type: 'measurement',
        responseMode: 'numericInput',
        difficulty: 'easy',
        signature: signature('measurement', template, [metres, cm], 'easy'),
        numberSet: [metres, cm],
        contextKey: 'length_conversion',
        curriculumTags: ['measurement'],
      };
    }
    case 'read_scale': {
      const step = pick(rng, [2, 5, 10]);
      const value = step * randomInt(rng, 4, 14);
      const scaleData = { min: 0, max: step * 20, step, marker: value, unit: 'g' };
      return {
        question: 'Read the value shown on the scale.',
        answer: value,
        acceptedAnswers: [`${value}g`, `${value} g`],
        marks: 1,
        type: 'measurement',
        responseMode: 'numericInput',
        difficulty: 'easy',
        signature: signature('measurement', template, [step, value], 'easy', scaleData),
        scaleData,
        numberSet: [step, value],
        contextKey: 'read_scale',
        curriculumTags: ['measurement', 'volume'],
      };
    }
    case 'money_change': {
      const cost = pick(rng, [175, 225, 340, 465, 575, 625]);
      const paid = pick(rng, [500, 1000]);
      const answer = paid - cost;
      return {
        question: `A compass costs ${money(cost)}. Sam pays with ${money(paid)}. How much change should Sam get?`,
        answer: money(answer),
        acceptedAnswers: [answer, `${answer}p`],
        marks: 1,
        type: 'money',
        responseMode: 'numericInput',
        difficulty: 'easy',
        signature: signature('money', template, [cost, paid], 'easy'),
        numberSet: [cost, paid],
        contextKey: 'money_change',
        curriculumTags: ['money', 'measurement', 'multiStep'],
      };
    }
    case 'time_duration': {
      const startHour = randomInt(rng, 9, 14);
      const startMinute = pick(rng, [5, 10, 20, 25, 35, 45]);
      const duration = pick(rng, [35, 45, 70, 85, 95]);
      const total = (startHour * 60) + startMinute + duration;
      const answer = `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`;
      return {
        question: `A club starts at ${startHour}:${String(startMinute).padStart(2, '0')} and lasts ${duration} minutes. What time does it finish?`,
        answer,
        marks: 1,
        type: 'time',
        responseMode: 'textInput',
        difficulty: 'easy',
        signature: signature('time', template, [startHour, startMinute, duration], 'easy'),
        numberSet: [startHour, startMinute, duration],
        contextKey: 'time_duration',
        curriculumTags: ['time', 'measurement', 'multiStep'],
      };
    }
    case 'geometry_symmetry': {
      const knownAngle = pick(rng, [42, 55, 63, 68, 72, 78, 84, 105, 118, 126]);
      const answer = 180 - knownAngle;
      const wrongs = [
        knownAngle,
        Math.max(10, answer + 10),
        Math.max(10, answer - 10),
        180,
      ].filter((value, index, list) => value !== answer && list.indexOf(value) === index);
      return {
        question: 'Look at the diagram.\n\nWhat is the size of angle x?\n\nChoose the correct answer.',
        answer: `${answer}°`,
        acceptedAnswers: [answer, `${answer}`, `${answer} degrees`],
        choices: withChoices(rng, `${answer}°`, wrongs.map((value) => `${value}°`)),
        marks: 1,
        type: 'geometry',
        responseMode: 'multipleChoice',
        difficulty: 'medium',
        signature: signature('geometry', template, [knownAngle, answer], 'medium'),
        shapeData: {
          shapeType: 'angleLine',
          knownAngle,
          targetLabel: 'x',
          targetAngle: answer,
          relationship: 'anglesOnStraightLine',
        },
        numberSet: [knownAngle, answer],
        contextKey: 'angle_x_straight_line',
        curriculumTags: ['geometry', 'measurement', 'explanation'],
      };
    }
    case 'geometry_angle_x': {
      const knownAngle = pick(rng, [42, 55, 63, 68, 72, 78, 84, 105, 118, 126]);
      const answer = 180 - knownAngle;
      const wrongs = [
        knownAngle,
        Math.max(10, answer + 10),
        Math.max(10, answer - 10),
        180,
      ].filter((value, index, list) => value !== answer && list.indexOf(value) === index);
      return {
        question: 'Look at the diagram.\n\nWhat is the size of angle x?\n\nChoose the correct answer.',
        answer: `${answer}°`,
        acceptedAnswers: [answer, `${answer}`, `${answer} degrees`],
        choices: withChoices(rng, `${answer}°`, wrongs.map((value) => `${value}°`)),
        marks: 1,
        type: 'geometry',
        responseMode: 'multipleChoice',
        difficulty: 'medium',
        signature: signature('geometry', template, [knownAngle, answer], 'medium'),
        shapeData: {
          shapeType: 'angleLine',
          knownAngle,
          targetLabel: 'x',
          targetAngle: answer,
          relationship: 'anglesOnStraightLine',
        },
        numberSet: [knownAngle, answer],
        contextKey: 'angle_x_straight_line',
        curriculumTags: ['geometry', 'measurement'],
      };
    }
    case 'coordinates_read': {
      const x = randomInt(rng, 1, 5);
      const y = randomInt(rng, 1, 5);
      const gridData = { xMin: 0, xMax: 6, yMin: 0, yMax: 6, points: [{ label: 'A', x, y }] };
      return {
        question: 'What are the coordinates of point A?',
        answer: [x, y],
        acceptedAnswers: [`(${x},${y})`, `${x},${y}`, `${x} ${y}`],
        marks: 1,
        type: 'coordinates',
        responseMode: 'coordinateInput',
        difficulty: 'easy',
        signature: signature('coordinates', template, [x, y], 'easy', gridData),
        gridData,
        numberSet: [x, y],
        contextKey: 'coordinate_read',
        curriculumTags: ['coordinates', 'geometry'],
      };
    }
    case 'stats_bar': {
      const labels = ['Red', 'Blue', 'Green', 'Gold'];
      const values = labels.map(() => randomInt(rng, 4, 14));
      const maxIndex = values.indexOf(Math.max(...values));
      return {
        question: 'The bar chart shows tokens collected. Which colour has the most tokens?',
        answer: labels[maxIndex],
        choices: labels,
        marks: 1,
        type: 'statistics',
        responseMode: 'multipleChoice',
        difficulty: 'easy',
        signature: signature('statistics', template, values, 'easy', { labels, values }),
        chartData: { chartType: 'bar', labels, values, xLabel: 'Colour', yLabel: 'Tokens' },
        numberSet: values,
        contextKey: 'bar_chart_tokens',
        curriculumTags: ['statistics'],
      };
    }
    case 'volume_count': {
      const length = randomInt(rng, 2, 4);
      const width = randomInt(rng, 2, 3);
      const height = randomInt(rng, 2, 3);
      const cubeStacks = Array.from({ length: length * width }, (_, index) => ({
        x: index % length,
        y: Math.floor(index / length),
        z: height,
      }));
      return {
        question: 'The cuboid is built from centimetre cubes. What is its volume?',
        answer: length * width * height,
        acceptedAnswers: [`${length * width * height}cm3`, `${length * width * height} cm3`, `${length * width * height} cm³`],
        marks: 1,
        type: 'volume',
        responseMode: 'numericInput',
        difficulty: 'easy',
        signature: signature('volume', template, [length, width, height], 'easy', cubeStacks),
        volumeData: { cubeStacks, unit: 'cm', dimensions: { length, width, height } },
        numberSet: [length, width, height],
        contextKey: 'cube_volume',
        curriculumTags: ['volume', 'measurement', 'geometry'],
      };
    }
    case 'ratio_share': {
      const ratioA = randomInt(rng, 2, 5);
      const ratioB = randomInt(rng, 2, 5);
      const unit = randomInt(rng, 6, 14);
      const total = (ratioA + ratioB) * unit;
      const answer = ratioA * unit;
      return {
        question: `A cake is shared in the ratio ${ratioA}:${ratioB}. There are ${total} slices. How many slices are in the first share?`,
        answer,
        marks: 2,
        type: 'ratio',
        responseMode: 'numericInput',
        difficulty: 'medium',
        signature: signature('ratio', template, [ratioA, ratioB, total], 'medium'),
        ratioData: { context: 'cake', ratio: [ratioA, ratioB], total, labels: ['first share', 'second share'] },
        numberSet: [ratioA, ratioB, total],
        contextKey: 'cake_ratio_share',
        curriculumTags: ['ratio', 'multiStep'],
      };
    }
    case 'ratio_recipe': {
      const ratioA = randomInt(rng, 2, 4);
      const ratioB = randomInt(rng, 3, 7);
      const multiplier = randomInt(rng, 3, 9);
      const known = ratioA * multiplier;
      const answer = ratioB * multiplier;
      return {
        question: `A potion recipe uses red and blue drops in the ratio ${ratioA}:${ratioB}. If there are ${known} red drops, how many blue drops are needed?`,
        answer,
        marks: 2,
        type: 'ratio',
        responseMode: 'numericInput',
        difficulty: 'medium',
        signature: signature('ratio', template, [ratioA, ratioB, known], 'medium'),
        ratioData: { context: 'potion', ratio: [ratioA, ratioB], labels: ['red drops', 'blue drops'] },
        numberSet: [ratioA, ratioB, known],
        contextKey: 'potion_ratio_recipe',
        curriculumTags: ['ratio', 'measurement', 'multiStep'],
      };
    }
    case 'percent_context': {
      const percent = pick(rng, [15, 20, 25, 30, 40]);
      const amount = pick(rng, [120, 160, 200, 240, 320]);
      const answer = (percent * amount) / 100;
      return {
        question: `${percent}% of the ${amount} seats are filled. How many seats are filled?`,
        answer,
        marks: 2,
        type: 'fractionsDecimalsPercentages',
        responseMode: 'numericInput',
        difficulty: 'medium',
        signature: signature('fractionsDecimalsPercentages', template, [percent, amount], 'medium'),
        numberSet: [percent, amount],
        contextKey: 'percentage_context',
        curriculumTags: ['fractionsDecimalsPercentages', 'multiStep'],
      };
    }
    case 'fraction_context': {
      const denominator = pick(rng, [5, 6, 8, 10]);
      const numerator = randomInt(rng, 2, denominator - 2);
      const used = randomInt(rng, 1, numerator - 1);
      const answer = simplifyFraction(numerator - used, denominator);
      return {
        question: `A tank was ${numerator}/${denominator} full. ${used}/${denominator} of the tank was used. What fraction of the tank is left?`,
        answer,
        acceptedAnswers: [`${numerator - used}/${denominator}`],
        marks: 2,
        type: 'fractionsDecimalsPercentages',
        responseMode: 'numericInput',
        difficulty: 'medium',
        signature: signature('fractionsDecimalsPercentages', template, [numerator, used, denominator], 'medium'),
        numberSet: [numerator, used, denominator],
        contextKey: 'fraction_subtract_context',
        curriculumTags: ['fractionsDecimalsPercentages', 'measurement', 'multiStep'],
      };
    }
    case 'algebra_sequence': {
      const start = randomInt(rng, 4, 18);
      const step = randomInt(rng, 3, 9);
      const sequence = [start, start + step, start + step * 2, start + step * 3];
      const answer = start + step * 5;
      return {
        question: `The sequence is ${sequence.join(', ')}, □, □. What is the second missing number?`,
        answer,
        marks: 2,
        type: 'algebra',
        responseMode: 'numericInput',
        difficulty: 'medium',
        signature: signature('algebra', template, [start, step], 'medium'),
        numberSet: [start, step],
        contextKey: 'sequence_rule',
        curriculumTags: ['algebra', 'number'],
      };
    }
    case 'area_rectangle': {
      const width = randomInt(rng, 5, 13);
      const height = randomInt(rng, 4, 9);
      return {
        question: `A rectangle is ${width} cm wide and ${height} cm high. What is its area?`,
        answer: width * height,
        acceptedAnswers: [`${width * height}cm2`, `${width * height} cm2`, `${width * height} cm²`],
        marks: 2,
        type: 'area',
        responseMode: 'numericInput',
        difficulty: 'medium',
        signature: signature('area', template, [width, height], 'medium'),
        areaData: { gridWidth: width, gridHeight: height, shadedCells: [], unit: 'cm' },
        numberSet: [width, height],
        contextKey: 'rectangle_area',
        curriculumTags: ['area', 'measurement', 'geometry', 'multiStep'],
      };
    }
    case 'perimeter_missing': {
      const width = randomInt(rng, 7, 15);
      const height = randomInt(rng, 4, 10);
      const perimeter = (width + height) * 2;
      return {
        question: `A rectangle has a perimeter of ${perimeter} cm. One side is ${width} cm. What is the length of the other side?`,
        answer: height,
        acceptedAnswers: [`${height}cm`, `${height} cm`],
        marks: 2,
        type: 'perimeter',
        responseMode: 'numericInput',
        difficulty: 'medium',
        signature: signature('perimeter', template, [width, perimeter], 'medium'),
        perimeterData: {
          shapeType: 'rectilinear',
          sides: [{ label: 'width', value: width }, { label: 'height' }, { label: 'width', value: width }, { label: 'height' }],
          target: 'missingSide',
          perimeter,
        },
        numberSet: [width, height, perimeter],
        contextKey: 'missing_perimeter_side',
        curriculumTags: ['perimeter', 'measurement', 'geometry', 'multiStep'],
      };
    }
    case 'stats_table': {
      const labels = ['Mon', 'Tue', 'Wed', 'Thu'];
      const values = labels.map(() => randomInt(rng, 8, 24));
      const answer = Math.max(...values) - Math.min(...values);
      return {
        question: 'Use the table. What is the difference between the greatest and smallest values?',
        answer,
        marks: 2,
        type: 'statistics',
        responseMode: 'numericInput',
        difficulty: 'medium',
        signature: signature('statistics', template, values, 'medium', { labels, values }),
        chartData: { chartType: 'table', labels, values, xLabel: 'Day', yLabel: 'Visitors' },
        tableData: { headers: ['Day', 'Visitors'], rows: labels.map((label, index) => [label, values[index]]) },
        numberSet: values,
        contextKey: 'statistics_table_difference',
        curriculumTags: ['statistics', 'multiStep'],
      };
    }
    case 'graph_explain': {
      const labels = ['A', 'B', 'C', 'D'];
      const values = [randomInt(rng, 5, 10), randomInt(rng, 11, 16), randomInt(rng, 17, 24), randomInt(rng, 25, 32)];
      const increase = values[3] - values[0];
      return {
        question: 'A pupil says, "The line graph shows the value went up every time." Select the two statements that justify this.',
        answer: ['Each point is higher than the previous point', `The total increase is ${increase}`],
        choices: [
          'Each point is higher than the previous point',
          `The total increase is ${increase}`,
          'The value stayed the same once',
          'The graph goes down at the end',
        ],
        marks: 3,
        type: 'explanation',
        responseMode: 'multiSelect',
        difficulty: 'hard',
        signature: signature('explanation', template, values, 'hard', { labels, values }),
        chartData: { chartType: 'line', labels, values, xLabel: 'Point', yLabel: 'Value' },
        numberSet: values,
        contextKey: 'line_graph_explain',
        curriculumTags: ['statistics', 'multiStep', 'explanation'],
        parts: [
          { id: 'a', prompt: 'Trend statement', answer: 'Each point is higher than the previous point', marks: 1, responseMode: 'multiSelect' },
          { id: 'b', prompt: 'Total increase', answer: `The total increase is ${increase}`, marks: 2, responseMode: 'multiSelect' },
        ],
      };
    }
    case 'time_table_explain': {
      const labels = ['Bus A', 'Bus B', 'Bus C'];
      const values = [35, 50, 65].map((value) => value + randomInt(rng, 0, 2) * 5);
      return {
        question: 'A pupil says Bus C takes more than 1 hour. Select all evidence that proves the pupil is correct.',
        answer: ['Bus C takes 65 minutes or more', '1 hour is 60 minutes'],
        choices: ['Bus C takes 65 minutes or more', '1 hour is 60 minutes', 'Bus A is shortest', 'Bus B takes exactly 1 hour'],
        marks: 3,
        type: 'explanation',
        responseMode: 'multiSelect',
        difficulty: 'hard',
        signature: signature('explanation', template, values, 'hard', { labels, values }),
        chartData: { chartType: 'table', labels, values, xLabel: 'Bus', yLabel: 'Minutes' },
        tableData: { headers: ['Bus', 'Minutes'], rows: labels.map((label, index) => [label, values[index]]) },
        numberSet: values,
        contextKey: 'time_table_explain',
        curriculumTags: ['statistics', 'time', 'measurement', 'multiStep', 'explanation'],
        parts: [
          { id: 'a', prompt: 'Bus C duration', answer: 'Bus C takes 65 minutes or more', marks: 1, responseMode: 'multiSelect' },
          { id: 'b', prompt: 'Hour conversion', answer: '1 hour is 60 minutes', marks: 2, responseMode: 'multiSelect' },
        ],
      };
    }
    default:
      throw new Error(`Unhandled Reasoning 2 template: ${template}`);
  }
};

const buildQuestion = (rng: () => number, template: ReasoningTemplate, id: number): ReasoningQuestion => {
  const draft = draftQuestion(rng, template);
  return {
    id,
    question: draft.question,
    answer: draft.answer,
    acceptedAnswers: draft.acceptedAnswers,
    marks: draft.marks,
    type: draft.type,
    responseMode: draft.responseMode,
    difficulty: draft.difficulty,
    signature: draft.signature,
    choices: draft.choices,
    curriculumTags: draft.curriculumTags,
    shapeData: draft.shapeData,
    gridData: draft.gridData,
    chartData: draft.chartData,
    tableData: draft.tableData,
    numberLineData: draft.numberLineData,
    scaleData: draft.scaleData,
    areaData: draft.areaData,
    perimeterData: draft.perimeterData,
    volumeData: draft.volumeData,
    ratioData: draft.ratioData,
    parts: draft.parts,
    partialMarkRules: draft.partialMarkRules,
  };
};

const questionVisualKey = (question: ReasoningQuestion) => stableHash({
  ...(question.shapeData ? { shapeData: question.shapeData } : {}),
  ...(question.gridData ? { gridData: question.gridData } : {}),
  ...(question.chartData ? { chartData: question.chartData } : {}),
  ...(question.tableData ? { tableData: question.tableData } : {}),
  ...(question.numberLineData ? { numberLineData: question.numberLineData } : {}),
  ...(question.scaleData ? { scaleData: question.scaleData } : {}),
  ...(question.areaData ? { areaData: question.areaData } : {}),
  ...(question.perimeterData ? { perimeterData: question.perimeterData } : {}),
  ...(question.volumeData ? { volumeData: question.volumeData } : {}),
  ...(question.ratioData ? { ratioData: question.ratioData } : {}),
});

const hasRenderableVisualData = (question: ReasoningQuestion) => {
  const hasVisual = Boolean(
    question.shapeData
    || question.gridData
    || question.chartData
    || question.tableData
    || question.numberLineData
    || question.scaleData
    || question.areaData
    || question.perimeterData
    || question.volumeData
    || question.ratioData,
  );

  if (!hasVisual) return true;
  if (question.chartData) return ['bar', 'line', 'table', 'pictogram'].includes(question.chartData.chartType);
  if (question.gridData) return Array.isArray(question.gridData.points);
  if (question.areaData) return Number.isFinite(question.areaData.gridWidth) && Number.isFinite(question.areaData.gridHeight);
  if (question.volumeData) return Array.isArray(question.volumeData.cubeStacks);
  return true;
};

const answerExists = (answer: any) => {
  if (answer === null || answer === undefined) return false;
  if (Array.isArray(answer)) return answer.length > 0;
  if (typeof answer === 'string') return answer.trim().length > 0;
  return true;
};

export const validateReasoning2Paper = (paper: ReasoningPaper): { valid: boolean; errors: string[] } => {
  const errors: string[] = [];
  if (paper.title !== 'Reasoning Summit') errors.push('Title must be Reasoning Summit.');
  if (paper.totalMarks !== 35) errors.push('Total marks must be 35.');
  if (paper.timeLimitSeconds !== 2400) errors.push('Time limit must be 2400 seconds.');
  if (paper.questions.length < 23 || paper.questions.length > 30) errors.push('Question count must be between 23 and 30.');
  const markTotal = paper.questions.reduce((sum, question) => sum + question.marks, 0);
  if (markTotal !== 35) errors.push(`Question marks total ${markTotal}, expected 35.`);

  const textSet = new Set<string>();
  const signatureSet = new Set<string>();
  const numberSet = new Set<string>();
  const visualSet = new Set<string>();
  const contextSet = new Set<string>();
  const counts: Record<ReasoningQuestionType, number> = {
    number: 0,
    fractionsDecimalsPercentages: 0,
    ratio: 0,
    algebra: 0,
    measurement: 0,
    geometry: 0,
    statistics: 0,
    time: 0,
    money: 0,
    area: 0,
    perimeter: 0,
    volume: 0,
    coordinates: 0,
    multiStep: 0,
    explanation: 0,
  };
  const markCounts = { 1: 0, 2: 0, 3: 0 } as Record<1 | 2 | 3, number>;

  paper.questions.forEach((question, index) => {
    if (question.id !== index + 1) errors.push(`Question ${index + 1} has non-sequential id ${question.id}.`);
    if (index > 0 && paper.questions[index - 1].type === question.type) {
      errors.push(`Questions ${paper.questions[index - 1].id} and ${question.id} repeat the same type (${question.type}).`);
    }
    if (!answerExists(question.answer)) errors.push(`Question ${question.id} is missing an answer.`);
    if (!SUPPORTED_RESPONSE_MODES.includes(question.responseMode)) errors.push(`Question ${question.id} has unsupported response mode.`);
    if (!hasRenderableVisualData(question)) errors.push(`Question ${question.id} has visual data that cannot be rendered.`);
    if (textSet.has(question.question)) errors.push(`Duplicate question text: ${question.question}`);
    if (signatureSet.has(question.signature)) errors.push(`Duplicate signature: ${question.signature}`);
    textSet.add(question.question);
    signatureSet.add(question.signature);
    const keyNumbers = question.signature.split('|').slice(1, 4).join('|');
    if (numberSet.has(keyNumbers)) errors.push(`Duplicate number set in question ${question.id}.`);
    numberSet.add(keyNumbers);
    const visualKey = questionVisualKey(question);
    if (visualKey !== '{}' && visualSet.has(visualKey)) errors.push(`Duplicate visual data in question ${question.id}.`);
    if (visualKey !== '{}') visualSet.add(visualKey);
    const contextKey = `${question.type}|${question.question.replace(/\d+/g, '#').toLowerCase()}`;
    if (contextSet.has(contextKey)) errors.push(`Repeated context pattern in question ${question.id}.`);
    contextSet.add(contextKey);
    markCounts[question.marks] += 1;
    [question.type, ...(question.curriculumTags ?? [])].forEach((tag) => {
      counts[tag] += 1;
    });
  });

  if (counts.number < 3) errors.push('Needs at least 3 number/place value questions.');
  if (counts.fractionsDecimalsPercentages < 4) errors.push('Needs at least 4 fractions/decimals/percentages questions.');
  if (counts.ratio < 3) errors.push('Needs at least 3 ratio/proportion questions.');
  if (counts.algebra < 2) errors.push('Needs at least 2 missing-value/algebra questions.');
  if (counts.measurement < 5) errors.push('Needs at least 5 measurement questions.');
  if (counts.geometry < 4) errors.push('Needs at least 4 geometry questions.');
  if (counts.statistics < 3) errors.push('Needs at least 3 statistics/data questions.');
  if (counts.time + counts.money < 2) errors.push('Needs at least 2 time or money questions.');
  if (counts.coordinates < 1) errors.push('Needs at least 1 coordinates question.');
  if (counts.area < 1) errors.push('Needs at least 1 area question.');
  if (counts.perimeter < 1) errors.push('Needs at least 1 perimeter question.');
  if (counts.volume < 1) errors.push('Needs at least 1 volume/capacity/mass question.');
  if (counts.multiStep < 5) errors.push('Needs at least 5 multi-step questions.');
  if (counts.explanation < 3) errors.push('Needs at least 3 explanation/justify questions.');
  if (markCounts[1] < 12 || markCounts[1] > 15) errors.push('One-mark spread is outside the target range.');
  if (markCounts[2] < 8 || markCounts[2] > 10) errors.push('Two-mark spread is outside the target range.');
  if (markCounts[3] < 2 || markCounts[3] > 4) errors.push('Three-mark spread is outside the target range.');
  const earlyMultiStepIndex = paper.questions.findIndex((question) => question.type === 'multiStep' || (question.curriculumTags ?? []).includes('multiStep'));
  if (earlyMultiStepIndex < 0 || earlyMultiStepIndex > 9) {
    errors.push('Needs at least one multi-step question before Q10.');
  }
  if (paper.questions.every((question) => ['number', 'fractionsDecimalsPercentages'].includes(question.type))) {
    errors.push('Paper is arithmetic-only.');
  }

  return { valid: errors.length === 0, errors };
};

export const generateReasoning2Paper = (seed: string | number = `${Date.now()}-${Math.random()}`): ReasoningPaper => {
  for (let attempt = 0; attempt < 40; attempt += 1) {
    const attemptSeed = `${seed}-${attempt}`;
    const rng = createRandom(attemptSeed);
    const basePlan = rng() > 0.52 ? BASE_PLAN : SHORT_PLAN;
    const plan = createProfiledTemplateOrder(rng, basePlan, 10, 3);
    const usedTexts = new Set<string>();
    const usedSignatures = new Set<string>();
    const usedNumberSets = new Set<string>();
    const usedVisualData = new Set<string>();
    const usedContexts = new Set<string>();
    const questions: ReasoningQuestion[] = [];
    let totalMarks = 0;

    for (const template of plan) {
      let question: ReasoningQuestion | null = null;
      for (let guard = 0; guard < 80 && !question; guard += 1) {
        const candidate = buildQuestion(rng, template, questions.length + 1);
        const numberKey = candidate.signature.split('|').slice(1, 4).join('|');
        const visualKey = questionVisualKey(candidate);
        const contextKey = `${candidate.type}|${candidate.question.replace(/\d+/g, '#').toLowerCase()}`;
        if (
          totalMarks + candidate.marks <= 35
          && !usedTexts.has(candidate.question)
          && !usedSignatures.has(candidate.signature)
          && !usedNumberSets.has(numberKey)
          && (visualKey === '{}' || !usedVisualData.has(visualKey))
          && !usedContexts.has(contextKey)
          && answerExists(candidate.answer)
        ) {
          question = candidate;
          usedTexts.add(candidate.question);
          usedSignatures.add(candidate.signature);
          usedNumberSets.add(numberKey);
          if (visualKey !== '{}') usedVisualData.add(visualKey);
          usedContexts.add(contextKey);
        }
      }
      if (question) {
        questions.push(question);
        totalMarks += question.marks;
      }
    }

    const paper: ReasoningPaper = {
      paperId: `reasoning-2-${hashSeed(attemptSeed).toString(36)}`,
      seed: attemptSeed,
      title: 'Reasoning Summit',
      totalMarks: 35,
      timeLimitSeconds: 2400,
      questions,
    };
    const validation = validateReasoning2Paper(paper);
    if (validation.valid) return paper;
    if (typeof window !== 'undefined' && window.localStorage.getItem('sats_legends_debug_reasoning') === 'true') {
      // Debug-only diagnostics for paper generation; learners never see this.
      console.debug('Reasoning 2 validation failed', { seed: attemptSeed, errors: validation.errors });
    }
  }

  throw new Error('Unable to generate a valid Reasoning 2 paper.');
};

const unicodeFractions: Record<string, string> = {
  '½': '1/2',
  '¼': '1/4',
  '¾': '3/4',
  '⅓': '1/3',
  '⅔': '2/3',
  '⅕': '1/5',
  '⅖': '2/5',
  '⅗': '3/5',
  '⅘': '4/5',
  '⅙': '1/6',
  '⅚': '5/6',
  '⅛': '1/8',
  '⅜': '3/8',
  '⅝': '5/8',
  '⅞': '7/8',
};

export const normaliseReasoningAnswer = (value: any): string => {
  if (value === null || value === undefined) return '';
  if (Array.isArray(value)) return value.map(normaliseReasoningAnswer).join('|');
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value)
    .trim()
    .replace(/[½¼¾⅓⅔⅕⅖⅗⅘⅙⅚⅛⅜⅝⅞]/g, (match) => unicodeFractions[match] ?? match)
    .replace(/,/g, '')
    .replace(/\s+/g, ' ')
    .toLowerCase();
};

const parseFractionValue = (value: string) => {
  const mixed = value.match(/^(-?\d+)\s+(\d+)\/(\d+)$/);
  if (mixed) {
    const whole = Number(mixed[1]);
    const numerator = Number(mixed[2]);
    const denominator = Number(mixed[3]);
    if (denominator !== 0) return whole + (numerator / denominator);
  }
  const fraction = value.match(/^(-?\d+)\/(\d+)$/);
  if (fraction) {
    const numerator = Number(fraction[1]);
    const denominator = Number(fraction[2]);
    if (denominator !== 0) return numerator / denominator;
  }
  if (value.endsWith('%')) {
    const percent = Number(value.slice(0, -1));
    return Number.isFinite(percent) ? percent / 100 : null;
  }
  const numeric = Number(value.replace(/[£a-z°]/g, ''));
  return Number.isFinite(numeric) ? numeric : null;
};

const parseCoordinate = (value: string) => {
  const cleaned = value.replace(/[()]/g, '').replace(/\s+/g, ',');
  const parts = cleaned.split(',').filter(Boolean).map(Number);
  return parts.length === 2 && parts.every(Number.isFinite) ? parts : null;
};

export const reasoningAnswersMatch = (userAnswer: any, correctAnswer: any, acceptedAnswers: any[] = []): boolean => {
  const possibleAnswers = [correctAnswer, ...acceptedAnswers];

  return possibleAnswers.some((answer) => {
    if (Array.isArray(answer)) {
      if (Array.isArray(userAnswer)) {
        if (
          answer.length === 2
          && userAnswer.length === 2
          && answer.every((item) => typeof item === 'number')
          && userAnswer.every((item) => Number.isFinite(Number(item)))
        ) {
          return Number(userAnswer[0]) === answer[0] && Number(userAnswer[1]) === answer[1];
        }
        const left = userAnswer.map(normaliseReasoningAnswer).sort();
        const right = answer.map(normaliseReasoningAnswer).sort();
        return left.length === right.length && left.every((item, index) => item === right[index]);
      }
      const userParts = normaliseReasoningAnswer(userAnswer).split('|').filter(Boolean).sort();
      const right = answer.map(normaliseReasoningAnswer).sort();
      return userParts.length === right.length && userParts.every((item, index) => item === right[index]);
    }

    if (typeof answer === 'object' && answer !== null) {
      return normaliseReasoningAnswer(userAnswer) === normaliseReasoningAnswer(answer);
    }

    const normalizedUser = normaliseReasoningAnswer(userAnswer);
    const normalizedAnswer = normaliseReasoningAnswer(answer);
    if (normalizedUser === normalizedAnswer) return true;

    const userCoord = parseCoordinate(normalizedUser);
    const answerCoord = parseCoordinate(normalizedAnswer);
    if (userCoord && answerCoord) {
      return userCoord[0] === answerCoord[0] && userCoord[1] === answerCoord[1];
    }

    const userNumber = parseFractionValue(normalizedUser);
    const answerNumber = parseFractionValue(normalizedAnswer);
    return userNumber !== null
      && answerNumber !== null
      && Math.abs(userNumber - answerNumber) < 0.0000001;
  });
};

const markQuestion = (question: ReasoningQuestion, userAnswer: any) => {
  if (question.responseMode === 'ordering') {
    const toSequence = (value: any) => (
      Array.isArray(value)
        ? value.map(normaliseReasoningAnswer)
        : normaliseReasoningAnswer(value).split('|').filter(Boolean)
    );
    const userSequence = toSequence(userAnswer);
    const answerSequence = toSequence(question.answer);
    const isCorrect = userSequence.length === answerSequence.length
      && userSequence.every((item, index) => item === answerSequence[index]);
    return {
      isCorrect,
      marksAwarded: isCorrect ? question.marks : 0,
    };
  }

  if (!question.parts?.length) {
    const isCorrect = reasoningAnswersMatch(userAnswer, question.answer, question.acceptedAnswers);
    return {
      isCorrect,
      marksAwarded: isCorrect ? question.marks : 0,
    };
  }

  const selectedValues = Array.isArray(userAnswer)
    ? userAnswer.map(normaliseReasoningAnswer)
    : normaliseReasoningAnswer(userAnswer).split('|').filter(Boolean);
  const marksAwarded = question.parts.reduce((sum, part) => {
    const partCorrect = selectedValues.some((value) => reasoningAnswersMatch(value, part.answer, part.acceptedAnswers));
    return sum + (partCorrect ? part.marks : 0);
  }, 0);
  return {
    isCorrect: marksAwarded === question.marks,
    marksAwarded: Math.min(question.marks, marksAwarded),
  };
};

export const markReasoning2Paper = (
  paper: ReasoningPaper,
  userAnswers: Record<number, any>,
  completedBeforeTimer = false,
): ReasoningPaperResult => {
  const results = paper.questions.map((question) => {
    const userAnswer = userAnswers[question.id] ?? '';
    const marked = markQuestion(question, userAnswer);
    return {
      questionId: question.id,
      question: question.question,
      userAnswer,
      correctAnswer: question.answer,
      isCorrect: marked.isCorrect,
      marksAwarded: marked.marksAwarded,
      marksAvailable: question.marks,
    };
  });
  const score = results.reduce((sum, result) => sum + result.marksAwarded, 0);
  const percentage = Math.round((score / paper.totalMarks) * 100);
  const correctCount = results.filter((result) => result.isCorrect).length;
  const stars: 0 | 1 | 2 | 3 = score >= 30 ? 3 : score >= 21 ? 2 : score > 0 ? 1 : 0;
  const xpAwarded = (score * 12)
    + (completedBeforeTimer ? 100 : 0)
    + (score >= 30 ? 150 : 0)
    + (score === 35 ? 250 : 0);

  return {
    score,
    totalMarks: 35,
    percentage,
    correctCount,
    results,
    stars,
    xpAwarded,
    passed: score >= 21,
  };
};

export const getReasoning2DebugInfo = (paper: ReasoningPaper) => {
  const validation = validateReasoning2Paper(paper);
  const typeDistribution = paper.questions.reduce<Record<string, number>>((counts, question) => {
    counts[question.type] = (counts[question.type] ?? 0) + 1;
    return counts;
  }, {});
  const markDistribution = paper.questions.reduce<Record<string, number>>((counts, question) => {
    counts[question.marks] = (counts[question.marks] ?? 0) + 1;
    return counts;
  }, {});
  const visualComponentUsage = paper.questions.reduce<Record<string, number>>((counts, question) => {
    [
      ['shape', question.shapeData],
      ['grid', question.gridData],
      ['chart', question.chartData],
      ['table', question.tableData],
      ['scale', question.scaleData],
      ['area', question.areaData],
      ['perimeter', question.perimeterData],
      ['volume', question.volumeData],
      ['ratio', question.ratioData],
    ].forEach(([key, value]) => {
      if (value) counts[String(key)] = (counts[String(key)] ?? 0) + 1;
    });
    return counts;
  }, {});

  return {
    seed: paper.seed,
    totalMarks: paper.questions.reduce((sum, question) => sum + question.marks, 0),
    questionCount: paper.questions.length,
    typeDistribution,
    markDistribution,
    validationErrors: validation.errors,
    visualComponentUsage,
    duplicateChecks: {
      questionTexts: new Set(paper.questions.map((question) => question.question)).size === paper.questions.length,
      signatures: new Set(paper.questions.map((question) => question.signature)).size === paper.questions.length,
      visualData: (() => {
        const visualKeys = paper.questions.map(questionVisualKey).filter((key) => key !== '{}');
        return new Set(visualKeys).size === visualKeys.length;
      })(),
    },
  };
};
