import {
  reshuffleAvoidingRepeat,
  shuffleOptionsWithAnswerIndex,
  shuffleOptionsWithCorrect,
} from '../../utils/questionShuffle';

export type SupportedChallengeGameType =
  | 'place_value_peaks'
  | 'calculation_clash'
  | 'coordinate_quest'
  | 'transform_temple'
  | 'scale_safari'
  | 'unit_mixer'
  | 'graph_grabber'
  | 'mean_machine'
  | 'equation_grove'
  | 'formula_forge'
  | 'rule_runner';

export type QuestionKind = 'fluency' | 'reasoning';

export interface CoordinatePoint {
  x: number;
  y: number;
  label: string;
  tone?: string;
}

export interface BarDatum {
  label: string;
  value: number;
  color: string;
}

export type VisualData =
  | { type: 'tokens'; items: string[]; accent?: string }
  | { type: 'equation'; lines: string[]; badge?: string; variant?: 'standard' | 'clash' }
  | { type: 'bars'; bars: BarDatum[]; caption?: string }
  | { type: 'coordinates'; points: CoordinatePoint[]; min: number; max: number; caption?: string; targetLabel: string }
  | { type: 'transform'; start: CoordinatePoint; image: CoordinatePoint; min: number; max: number; caption?: string }
  | { type: 'sequence'; values: string[]; caption?: string }
  | { type: 'ratio'; leftLabel: string; leftValue: string; rightLabel: string; rightValue: string; caption?: string }
  | { type: 'pulse'; centerLabel: string; orbitLabels: string[]; meterValue: number; meterLabel: string; caption?: string };

export interface ChallengeQuestion {
  kind?: QuestionKind;
  prompt: string;
  sublabel: string;
  options: string[];
  answerIndex: number;
  visual: VisualData;
}

export type DataDungeonPuzzleType = 'mean' | 'median' | 'mode' | 'range' | 'barchart';

export interface DataDungeonPuzzle {
  id: string;
  kind?: QuestionKind;
  type: DataDungeonPuzzleType;
  question: string;
  options: number[];
  answer: number;
  data: number[];
  chartData?: { label: string; value: number; color: string }[];
}

export interface MeasurementProblem {
  kind?: QuestionKind;
  question: string;
  options: string[];
  answer: string;
  itemType: 'sword' | 'shield' | 'potion' | 'armor';
}

export interface TimeProblem {
  kind?: QuestionKind;
  question: string;
  options: string[];
  answer: string;
}

interface BankEntry<T> {
  minLevel: number;
  value: T;
}

const cloneBankEntry = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T;

const ensureKind = <T extends { kind?: QuestionKind }>(value: T): T => ({
  ...value,
  kind: value.kind ?? 'fluency',
});

type QueueState<T> = {
  order: T[];
  index: number;
  last: T | null;
};

const bankQueues = new Map<string, QueueState<any>>();

const selectBankValue = <T extends { kind?: QuestionKind }>(
  bank: BankEntry<T>[],
  levelId: number,
  queueKey: string,
  shuffleValue?: (value: T) => T,
): T | null => {
  const eligible = bank.filter(entry => entry.minLevel <= levelId).map(entry => ensureKind(cloneBankEntry(entry.value)));
  if (!eligible.length) return null;
  const getKey = (item: T) => (
    (item as { id?: string; prompt?: string; question?: string }).id
    ?? (item as { prompt?: string }).prompt
    ?? (item as { question?: string }).question
    ?? JSON.stringify(item)
  );
  const key = `${queueKey}:${levelId}`;
  const cached = bankQueues.get(key) as QueueState<T> | undefined;
  const last = cached?.last ?? null;
  let order = cached?.order ?? reshuffleAvoidingRepeat(eligible, last, getKey);
  let index = cached?.index ?? 0;
  if (index >= order.length) {
    order = reshuffleAvoidingRepeat(eligible, last, getKey);
    index = 0;
  }
  const next = order[index];
  const value = shuffleValue ? shuffleValue(next) : next;
  bankQueues.set(key, { order, index: index + 1, last: next });
  return value;
};
const shuffleChallengeOptions = (question: ChallengeQuestion): ChallengeQuestion => {
  const shuffled = shuffleOptionsWithAnswerIndex(question.options, question.answerIndex);
  return { ...question, options: shuffled.options, answerIndex: shuffled.answerIndex };
};

const shuffleAnswerOptions = <T extends { options: V[]; answer: V }, V>(value: T): T => {
  const shuffled = shuffleOptionsWithCorrect(value.options, value.answer);
  return { ...value, options: shuffled.options };
};

const CHALLENGE_BANKS: Record<SupportedChallengeGameType, BankEntry<ChallengeQuestion>[]> = {
  place_value_peaks: [
    {
      minLevel: 1,
      value: {
        prompt: 'Which number is the greatest?',
        sublabel: 'Compare the highest-value digits first, then scan across.',
        options: ['4,305,019', '4,350,190', '4,305,901', '4,305,109'],
        answerIndex: 1,
        visual: { type: 'tokens', items: ['4,305,019', '4,350,190', '4,305,901', '4,305,109'], accent: 'amber' },
      },
    },
    {
      minLevel: 1,
      value: {
        prompt: 'What is the value of the digit 6 in 3,674,215?',
        sublabel: 'Look at the place occupied by the digit 6.',
        options: ['6', '60,000', '600,000', '6,000'],
        answerIndex: 2,
        visual: { type: 'tokens', items: ['3', '6', '7', '4', '2', '1', '5'], accent: 'emerald' },
      },
    },
    {
      minLevel: 2,
      value: {
        prompt: 'Which number rounds to 340,000 to the nearest 10,000?',
        sublabel: 'Check the thousands digit before you round.',
        options: ['345,120', '334,888', '344,921', '349,999'],
        answerIndex: 2,
        visual: { type: 'equation', lines: ['340,000 nearest 10,000', 'Find the one in the correct interval.'], badge: 'Round' },
      },
    },
    {
      minLevel: 2,
      value: {
        prompt: 'What is 10,000 more than 589,432?',
        sublabel: 'Only the ten-thousands place changes.',
        options: ['590,432', '599,432', '589,532', '579,432'],
        answerIndex: 1,
        visual: { type: 'equation', lines: ['589,432', '+ 10,000'], badge: 'Place Value' },
      },
    },
    {
      minLevel: 3,
      value: {
        prompt: 'What is the value of the digit 4 in 6,405,218?',
        sublabel: 'Read the digit in the millions number carefully.',
        options: ['4', '40,000', '400,000', '4,000,000'],
        answerIndex: 2,
        visual: { type: 'tokens', items: ['6', '4', '0', '5', '2', '1', '8'], accent: 'amber' },
      },
    },
    {
      minLevel: 3,
      value: {
        prompt: 'What is 10 times 46,208?',
        sublabel: 'Move the digits one place to the left.',
        options: ['462,080', '462,008', '4,620,800', '46,280'],
        answerIndex: 0,
        visual: { type: 'equation', lines: ['46,208', 'x 10 = ?'], badge: 'Multiply' },
      },
    },
    {
      minLevel: 3,
      value: {
        prompt: 'Which number is 7,000,000 + 80,000 + 4,000 + 60 + 9?',
        sublabel: 'Add the place values to make the number.',
        options: ['7,084,069', '7,840,069', '7,804,609', '7,084,609'],
        answerIndex: 0,
        visual: { type: 'equation', lines: ['7,000,000 + 80,000 + 4,000 + 60 + 9', '= ?'], badge: 'Compose' },
      },
    },
  ],
  calculation_clash: [
    {
      minLevel: 1,
      value: {
        prompt: 'Work out 84 + 67',
        sublabel: 'Add the two numbers.',
        options: ['141', '151', '161', '171'],
        answerIndex: 1,
        visual: { type: 'equation', lines: ['84 + 67', '= ?'], badge: 'Add', variant: 'clash' },
      },
    },
    {
      minLevel: 1,
      value: {
        prompt: 'Work out 960 ÷ 12',
        sublabel: 'Divide 960 by 12.',
        options: ['70', '80', '90', '120'],
        answerIndex: 1,
        visual: { type: 'equation', lines: ['960 ÷ 12', '= ?'], badge: 'Divide', variant: 'clash' },
      },
    },
    {
      minLevel: 2,
      value: {
        prompt: 'Calculate 47 × 6',
        sublabel: 'Multiply the two numbers.',
        options: ['252', '262', '282', '292'],
        answerIndex: 2,
        visual: { type: 'equation', lines: ['47 × 6', '= ?'], badge: 'Multiply', variant: 'clash' },
      },
    },
    {
      minLevel: 3,
      value: {
        prompt: 'Calculate 734 – 286',
        sublabel: 'Subtract carefully.',
        options: ['448', '458', '468', '478'],
        answerIndex: 0,
        visual: { type: 'equation', lines: ['734 – 286', '= ?'], badge: 'Subtract', variant: 'clash' },
      },
    },
    {
      minLevel: 2,
      value: {
        prompt: 'Work out 29 + 34 - 3 x 4',
        sublabel: 'Do the multiplication before the addition and subtraction.',
        options: ['51', '39', '63', '75'],
        answerIndex: 0,
        visual: { type: 'equation', lines: ['29 + 34 - 3 x 4', '= ?'], badge: 'Order', variant: 'clash' },
      },
    },
    {
      minLevel: 2,
      value: {
        prompt: 'Work out 5 + 18 ÷ 2',
        sublabel: 'Divide before you add.',
        options: ['14', '11', '19', '23'],
        answerIndex: 0,
        visual: { type: 'equation', lines: ['5 + 18 ÷ 2', '= ?'], badge: 'Order', variant: 'clash' },
      },
    },
    {
      minLevel: 3,
      value: {
        prompt: 'Work out 4 x (6 + 3)',
        sublabel: 'Calculate the bracket first.',
        options: ['24', '28', '36', '48'],
        answerIndex: 2,
        visual: { type: 'equation', lines: ['4 x (6 + 3)', '= ?'], badge: 'Brackets', variant: 'clash' },
      },
    },
    {
      minLevel: 3,
      value: {
        prompt: 'Work out 3² + 4 × 5',
        sublabel: 'Powers come before multiplication and addition.',
        options: ['22', '29', '31', '25'],
        answerIndex: 1,
        visual: { type: 'equation', lines: ['3² + 4 × 5', '= ?'], badge: 'Power', variant: 'clash' },
      },
    },
  ],
  coordinate_quest: [
    {
      minLevel: 1,
      value: {
        prompt: 'The Monster Mind has hidden beacon C in the ruined grid. Which coordinates are correct?',
        sublabel: 'Read across the x-axis first, then climb the y-axis to recover the beacon.',
        options: ['(6, 2)', '(2, 6)', '(0, 3)', '(8, 8)'],
        answerIndex: 2,
        visual: {
          type: 'coordinates',
          min: 0,
          max: 8,
          targetLabel: 'C',
          caption: 'Plot the beacon before the trail disappears.',
          points: [
            { label: 'A', x: 6, y: 2, tone: 'bg-cyan-300' },
            { label: 'B', x: 2, y: 6, tone: 'bg-emerald-300' },
            { label: 'C', x: 0, y: 3, tone: 'bg-sky-300' },
            { label: 'D', x: 8, y: 8, tone: 'bg-amber-300' },
          ],
        },
      },
    },
    {
      minLevel: 2,
      value: {
        prompt: 'Point P begins at (5, 8) on the Monster Mind\'s damaged map. Where does the route finish?',
        sublabel: 'Combine the translations carefully to follow the trail.',
        options: ['(7, 2)', '(7, 4)', '(9, 2)', '(3, 2)'],
        answerIndex: 0,
        visual: {
          type: 'equation',
          lines: ['Start at (5, 8)', '+4 on x, -6 on y, -2 on x', 'Final beacon position = ?'],
          badge: 'Route',
        },
      },
    },
    {
      minLevel: 2,
      value: {
        prompt: 'The Monster Mind marked one beacon at (4, 7). Which point is it?',
        sublabel: 'Match the coordinates to the labelled beacon before it is lost.',
        options: ['A', 'B', 'C', 'D'],
        answerIndex: 3,
        visual: {
          type: 'coordinates',
          min: 0,
          max: 8,
          targetLabel: 'D',
          caption: 'Find the labelled beacon at the given coordinates.',
          points: [
            { label: 'A', x: 1, y: 4, tone: 'bg-cyan-300' },
            { label: 'B', x: 6, y: 1, tone: 'bg-emerald-300' },
            { label: 'C', x: 3, y: 6, tone: 'bg-sky-300' },
            { label: 'D', x: 4, y: 7, tone: 'bg-amber-300' },
          ],
        },
      },
    },
    {
      minLevel: 3,
      value: {
        prompt: 'The beacon at (-2, 5) is which point?',
        sublabel: 'Scan across the x-axis first, then up the y-axis.',
        options: ['A', 'B', 'C', 'D'],
        answerIndex: 1,
        visual: {
          type: 'coordinates',
          min: -8,
          max: 8,
          targetLabel: 'B',
          caption: 'Use the full grid this time.',
          points: [
            { label: 'A', x: 4, y: -3, tone: 'bg-cyan-300' },
            { label: 'B', x: -2, y: 5, tone: 'bg-emerald-300' },
            { label: 'C', x: -6, y: -1, tone: 'bg-sky-300' },
            { label: 'D', x: 3, y: 7, tone: 'bg-amber-300' },
          ],
        },
      },
    },
    {
      minLevel: 3,
      value: {
        prompt: 'Point P starts at (-3, 4). It moves 5 left and 2 down. Where does it finish?',
        sublabel: 'Translate left first, then down.',
        options: ['(-8, 2)', '(-2, 6)', '(2, -2)', '(8, -2)'],
        answerIndex: 0,
        visual: {
          type: 'equation',
          lines: ['Start at (-3, 4)', '5 left, 2 down', 'Final position = ?'],
          badge: 'Route',
        },
      },
    },
  ],
  transform_temple: [
    {
      minLevel: 1,
      value: {
        prompt: 'Which translation moves A to A′?',
        sublabel: 'Read the horizontal move first, then the vertical move.',
        options: ['3 right, 2 up', '3 left, 2 up', '2 right, 3 up', '3 right, 2 down'],
        answerIndex: 0,
        visual: {
          type: 'transform',
          start: { label: 'A', x: -2, y: 1, tone: 'bg-amber-300' },
          image: { label: "A'", x: 1, y: 3, tone: 'bg-sky-300' },
          min: -4,
          max: 4,
          caption: 'A is the original point. A′ is its image.',
        },
      },
    },
    {
      minLevel: 2,
      value: {
        prompt: 'Which translation moves B to B′?',
        sublabel: 'Keep the direction words accurate.',
        options: ['4 left, 1 down', '4 left, 1 up', '1 left, 4 down', '4 right, 1 down'],
        answerIndex: 0,
        visual: {
          type: 'transform',
          start: { label: 'B', x: 3, y: 2, tone: 'bg-amber-300' },
          image: { label: "B'", x: -1, y: 1, tone: 'bg-sky-300' },
          min: -4,
          max: 4,
          caption: 'Trace the movement from the original point to the image.',
        },
      },
    },
    {
      minLevel: 3,
      value: {
        prompt: 'A shape moves 8 right. Which rule matches?',
        sublabel: 'Every point moves the same distance in the same direction.',
        options: ['translation 8 units right', 'reflection in a vertical line', 'translation 8 units left', 'rotation 90° clockwise'],
        answerIndex: 0,
        visual: {
          type: 'equation',
          lines: ['Original shape → image', 'Every point moves +8 on the x-axis'],
          badge: 'Transform',
        },
      },
    },
    {
      minLevel: 3,
      value: {
        prompt: 'Which translation moves A to A′?',
        sublabel: 'Read the horizontal move first, then the vertical move.',
        options: ['6 right, 4 up', '6 left, 4 up', '4 right, 6 up', '6 right, 4 down'],
        answerIndex: 0,
        visual: {
          type: 'transform',
          start: { label: 'A', x: -4, y: -2, tone: 'bg-amber-300' },
          image: { label: "A'", x: 2, y: 2, tone: 'bg-sky-300' },
          min: -8,
          max: 8,
          caption: 'Use the full grid to describe the move.',
        },
      },
    },
    {
      minLevel: 3,
      value: {
        prompt: 'Which translation moves B to B′?',
        sublabel: 'Keep the direction words accurate on the full grid.',
        options: ['2 left, 5 down', '2 left, 5 up', '5 left, 2 down', '2 right, 5 down'],
        answerIndex: 1,
        visual: {
          type: 'transform',
          start: { label: 'B', x: 5, y: -1, tone: 'bg-amber-300' },
          image: { label: "B'", x: 3, y: 4, tone: 'bg-sky-300' },
          min: -8,
          max: 8,
          caption: 'Trace the movement from the original point to the image.',
        },
      },
    },
  ],
  scale_safari: [
    {
      minLevel: 1,
      value: {
        prompt: 'A recipe uses 150 g of flour to make 3 equal portions. How many grams of flour are needed to make 9 portions?',
        sublabel: 'Scale every ingredient by the same factor.',
        options: ['300 g', '450 g', '600 g', '750 g'],
        answerIndex: 1,
        visual: {
          type: 'ratio',
          leftLabel: '3 portions',
          leftValue: '150 g',
          rightLabel: '9 portions',
          rightValue: '?',
          caption: 'Multiply by the scale factor.',
        },
      },
    },
    {
      minLevel: 2,
      value: {
        prompt: 'Convert 5.4 km to m.',
        sublabel: 'Use the correct place-value shift for kilometres to metres.',
        options: ['54 m', '540 m', '5,400 m', '54,000 m'],
        answerIndex: 2,
        visual: {
          type: 'equation',
          lines: ['1 km = 1,000 m', '5.4 km = ? m'],
          badge: 'Convert',
        },
      },
    },
    {
      minLevel: 2,
      value: {
        prompt: 'Convert 35.5 cm to m.',
        sublabel: 'A decimal conversion needs careful place value.',
        options: ['0.355 m', '3.55 m', '35.5 m', '0.0355 m'],
        answerIndex: 0,
        visual: {
          type: 'equation',
          lines: ['100 cm = 1 m', '35.5 cm = ? m'],
          badge: 'Scale',
        },
      },
    },
    {
      minLevel: 3,
      value: {
        prompt: 'A tower is 22 cm tall. A model is half as tall. How tall is the model?',
        sublabel: 'Use the multiplicative relationship, not subtraction.',
        options: ['10 cm', '11 cm', '12 cm', '44 cm'],
        answerIndex: 1,
        visual: {
          type: 'ratio',
          leftLabel: 'Tall tower',
          leftValue: '22 cm',
          rightLabel: 'Short tower',
          rightValue: '?',
          caption: 'The shorter tower is one-half as tall.',
        },
      },
    },
    {
      minLevel: 2,
      value: {
        prompt: 'On a map, 1 cm represents 5 km. What distance does 7 cm on the map represent?',
        sublabel: 'Multiply by the scale factor.',
        options: ['12 km', '25 km', '35 km', '45 km'],
        answerIndex: 2,
        visual: {
          type: 'ratio',
          leftLabel: '1 cm',
          leftValue: '5 km',
          rightLabel: '7 cm',
          rightValue: '?',
          caption: 'Scale the map distance.',
        },
      },
    },
    {
      minLevel: 2,
      value: {
        prompt: 'The ratio of flour to sugar is 2:3. If there are 10 g of flour, how much sugar is needed?',
        sublabel: 'Keep the ratio equivalent.',
        options: ['10 g', '12 g', '15 g', '18 g'],
        answerIndex: 2,
        visual: {
          type: 'ratio',
          leftLabel: 'Flour',
          leftValue: '2 parts',
          rightLabel: 'Sugar',
          rightValue: '3 parts',
          caption: 'Match the parts before scaling.',
        },
      },
    },
    {
      minLevel: 3,
      value: {
        prompt: 'A model is made at scale 1:4. A real tower is 28 cm tall. How tall is the model?',
        sublabel: 'Divide the real height by the scale factor.',
        options: ['4 cm', '6 cm', '7 cm', '8 cm'],
        answerIndex: 2,
        visual: {
          type: 'ratio',
          leftLabel: 'Real tower',
          leftValue: '28 cm',
          rightLabel: 'Model',
          rightValue: '?',
          caption: 'Scale down by 4.',
        },
      },
    },
  ],
  graph_grabber: [
    {
      minLevel: 1,
      value: {
        prompt: 'The chart shows the number of crates delivered by each boat. How many crates did Windward deliver?',
        sublabel: 'Read the Windward stack carefully.',
        options: ['4', '6', '7', '9'],
        answerIndex: 1,
        visual: {
          type: 'bars',
          caption: 'Supply boats',
          bars: [
            { label: 'Windward', value: 6, color: 'from-sky-400 to-cyan-300' },
            { label: 'Eden', value: 9, color: 'from-indigo-400 to-blue-300' },
            { label: 'Jerry', value: 7, color: 'from-emerald-400 to-lime-300' },
            { label: 'Ivy', value: 4, color: 'from-amber-300 to-yellow-300' },
          ],
        },
      },
    },
    {
      minLevel: 2,
      value: {
        prompt: 'The chart shows the number of crates delivered by each boat. Which boat delivered the most crates?',
        sublabel: 'Compare every boat before you answer.',
        options: ['Windward', 'Eden', 'Jerry', 'Ivy'],
        answerIndex: 1,
        visual: {
          type: 'bars',
          caption: 'Supply boats',
          bars: [
            { label: 'Windward', value: 6, color: 'from-sky-400 to-cyan-300' },
            { label: 'Eden', value: 9, color: 'from-indigo-400 to-blue-300' },
            { label: 'Jerry', value: 7, color: 'from-emerald-400 to-lime-300' },
            { label: 'Ivy', value: 4, color: 'from-amber-300 to-yellow-300' },
          ],
        },
      },
    },
    {
      minLevel: 2,
      value: {
        prompt: 'The chart shows the number of crates delivered by each boat. How many more crates did Eden deliver than Jerry?',
        sublabel: 'Subtract the Jerry stack from the Eden stack.',
        options: ['2', '3', '4', '5'],
        answerIndex: 1,
        visual: {
          type: 'bars',
          caption: 'Supply boats',
          bars: [
            { label: 'Windward', value: 5, color: 'from-sky-400 to-cyan-300' },
            { label: 'Eden', value: 12, color: 'from-indigo-400 to-blue-300' },
            { label: 'Jerry', value: 9, color: 'from-emerald-400 to-lime-300' },
            { label: 'Ivy', value: 4, color: 'from-amber-300 to-yellow-300' },
          ],
        },
      },
    },
    {
      minLevel: 3,
      value: {
        prompt: 'The chart shows the number of crates delivered by each boat. What is the total number of crates delivered by all four boats?',
        sublabel: 'Add all four boat stacks together.',
        options: ['22', '24', '26', '28'],
        answerIndex: 2,
        visual: {
          type: 'bars',
          caption: 'Supply boats',
          bars: [
            { label: 'Windward', value: 7, color: 'from-sky-400 to-cyan-300' },
            { label: 'Eden', value: 8, color: 'from-indigo-400 to-blue-300' },
            { label: 'Jerry', value: 5, color: 'from-emerald-400 to-lime-300' },
            { label: 'Ivy', value: 6, color: 'from-amber-300 to-yellow-300' },
          ],
        },
      },
    },
    {
      minLevel: 2,
      value: {
        prompt: 'The chart shows the number of crates delivered by each boat. How many crates did Windward and Jerry deliver altogether?',
        sublabel: 'Add the two matching boats only.',
        options: ['11', '12', '13', '14'],
        answerIndex: 2,
        visual: {
          type: 'bars',
          caption: 'Supply boats',
          bars: [
            { label: 'Windward', value: 6, color: 'from-sky-400 to-cyan-300' },
            { label: 'Eden', value: 9, color: 'from-indigo-400 to-blue-300' },
            { label: 'Jerry', value: 7, color: 'from-emerald-400 to-lime-300' },
            { label: 'Ivy', value: 4, color: 'from-amber-300 to-yellow-300' },
          ],
        },
      },
    },
    {
      minLevel: 3,
      value: {
        prompt: 'The chart shows the number of crates delivered by each boat. Which two boats deliver 15 crates altogether?',
        sublabel: 'Test each pair and look for the exact total.',
        options: ['Windward and Eden', 'Windward and Jerry', 'Eden and Ivy', 'Jerry and Ivy'],
        answerIndex: 0,
        visual: {
          type: 'bars',
          caption: 'Supply boats',
          bars: [
            { label: 'Windward', value: 6, color: 'from-sky-400 to-cyan-300' },
            { label: 'Eden', value: 9, color: 'from-indigo-400 to-blue-300' },
            { label: 'Jerry', value: 7, color: 'from-emerald-400 to-lime-300' },
            { label: 'Ivy', value: 4, color: 'from-amber-300 to-yellow-300' },
            { label: 'Oak', value: 8, color: 'from-fuchsia-400 to-pink-300' },
          ],
        },
      },
    },
  ],
  mean_machine: [
    {
      minLevel: 1,
      value: {
        prompt: 'Find the mean of 8, 10, 12 and 14.',
        sublabel: 'Add the values, then divide by how many there are.',
        options: ['11', '12', '44', '10'],
        answerIndex: 0,
        visual: { type: 'tokens', items: ['8', '10', '12', '14'], accent: 'blue' },
      },
    },
    {
      minLevel: 2,
      value: {
        prompt: 'The mean of 9, 12, 15 and □ is 13. What is □?',
        sublabel: 'Work out the total needed before finding the missing number.',
        options: ['14', '15', '16', '17'],
        answerIndex: 2,
        visual: { type: 'equation', lines: ['Mean = 13', '9 + 12 + 15 + □ = 52'], badge: 'Mean' },
      },
    },
    {
      minLevel: 3,
      value: {
        prompt: 'Five scores have a mean of 18. What is the total?',
        sublabel: 'Mean multiplied by number of scores gives the total.',
        options: ['23', '72', '90', '108'],
        answerIndex: 2,
        visual: { type: 'equation', lines: ['Mean = 18', '5 values in total'], badge: 'Total' },
      },
    },
    {
      minLevel: 2,
      value: {
        prompt: 'Find the mean of 6, 0, 12 and 18.',
        sublabel: 'Include the zero in the total before dividing.',
        options: ['8', '9', '10', '12'],
        answerIndex: 1,
        visual: { type: 'tokens', items: ['6', '0', '12', '18'], accent: 'blue' },
      },
    },
    {
      minLevel: 3,
      value: {
        prompt: 'The mean of four scores is 12. What is their total?',
        sublabel: 'Multiply the mean by the number of scores.',
        options: ['3', '16', '48', '36'],
        answerIndex: 2,
        visual: { type: 'tokens', items: ['4 scores', 'Mean = 12'], accent: 'blue' },
      },
    },
  ],
  equation_grove: [
    {
      minLevel: 1,
      value: {
        prompt: 'A number has 17 added to it. The result is 53. What is the number?',
        sublabel: 'Find the number that balances the equation.',
        options: ['34', '36', '70', '17'],
        answerIndex: 1,
        visual: { type: 'equation', lines: ['x + 17 = 53', 'Balance both sides.'], badge: 'Equation' },
      },
    },
    {
      minLevel: 2,
      value: {
        prompt: 'A number multiplied by 4 is 36. What is the number?',
        sublabel: 'Undo the multiplication to find n.',
        options: ['8', '9', '12', '32'],
        answerIndex: 1,
        visual: { type: 'equation', lines: ['4n = 36', 'n = ?'], badge: 'Grove' },
      },
    },
    {
      minLevel: 2,
      value: {
        prompt: 'The number of black beads is 4 more than 3 times the number of white beads. There are 9 white beads. How many black beads are there?',
        sublabel: 'Multiply the number of white beads by 3, then add 4.',
        options: ['27', '31', '36', '13'],
        answerIndex: 1,
        visual: { type: 'equation', lines: ['black = (white × 3) + 4', 'white = 9'], badge: 'Rule' },
      },
    },
    {
      minLevel: 3,
      value: {
        prompt: 'The number of black beads is 4 more than 3 times the number of white beads. There are 25 black beads. How many white beads are there?',
        sublabel: 'Work backwards through the rule.',
        options: ['5', '6', '7', '8'],
        answerIndex: 2,
        visual: { type: 'equation', lines: ['black = (white × 3) + 4', 'black = 25'], badge: 'Inverse' },
      },
    },
    {
      minLevel: 3,
      value: {
        prompt: 'Add 4 to a number, then multiply the result by 3. The answer is 27. What was the starting number?',
        sublabel: 'Undo the multiplication before undoing the addition.',
        options: ['4', '5', '6', '7'],
        answerIndex: 1,
        visual: { type: 'equation', lines: ['3(x + 4) = 27', 'x = ?'], badge: 'Brackets' },
      },
    },
    {
      minLevel: 3,
      value: {
        prompt: 'Add 6 to a number, then divide the result by 3. The answer is 5. What was the starting number?',
        sublabel: 'Multiply first, then subtract.',
        options: ['7', '8', '9', '10'],
        answerIndex: 2,
        visual: { type: 'equation', lines: ['(x + 6) ÷ 3 = 5', 'x = ?'], badge: 'Equation' },
      },
    },
  ],
  unit_mixer: [
    {
      minLevel: 1,
      value: {
        prompt: 'The lava path is unstable. Convert 3.5 km into m to find a safe crossing.',
        sublabel: 'Remember that 1 km = 1000 m.',
        options: ['3,500 m', '350 m', '35,000 m', '3.5 m'],
        answerIndex: 0,
        visual: { type: 'equation', lines: ['3.5 km', '× 1000 = ? m'], badge: 'Convert' },
      },
    },
    {
      minLevel: 1,
      value: {
        prompt: 'The lava path is unstable. Convert 420 cm into m to find a safe crossing.',
        sublabel: 'Divide by 100 to move from cm to m.',
        options: ['4.2 m', '42 m', '0.42 m', '420 m'],
        answerIndex: 0,
        visual: { type: 'equation', lines: ['420 cm', '÷ 100 = ? m'], badge: 'Length' },
      },
    },
    {
      minLevel: 2,
      value: {
        prompt: 'The lava path is unstable. Convert 1.2 litres into millilitres to find a safe crossing.',
        sublabel: 'Litres to millilitres is ×1000.',
        options: ['1,200 ml', '120 ml', '12,000 ml', '0.12 ml'],
        answerIndex: 0,
        visual: { type: 'equation', lines: ['1.2 l', '× 1000 = ? ml'], badge: 'Capacity' },
      },
    },
    {
      minLevel: 2,
      value: {
        prompt: 'The lava path is unstable. Convert 2.75 kg into g to find a safe crossing.',
        sublabel: 'Kilograms to grams is ×1000.',
        options: ['2,750 g', '275 g', '27,500 g', '2.75 g'],
        answerIndex: 0,
        visual: { type: 'equation', lines: ['2.75 kg', '× 1000 = ? g'], badge: 'Mass' },
      },
    },
    {
      minLevel: 3,
      value: {
        prompt: 'The lava path is unstable. Convert 1.8 m into cm to find a safe crossing.',
        sublabel: 'Multiply by 100.',
        options: ['180 cm', '18 cm', '1,800 cm', '1.8 cm'],
        answerIndex: 0,
        visual: { type: 'equation', lines: ['1.8 m', '× 100 = ? cm'], badge: 'Length' },
      },
    },
    {
      minLevel: 3,
      value: {
        prompt: 'The lava path is unstable. Convert 450 ml into litres to find a safe crossing.',
        sublabel: 'Millilitres to litres is ÷1000.',
        options: ['0.45 l', '4.5 l', '45 l', '0.045 l'],
        answerIndex: 0,
        visual: { type: 'equation', lines: ['450 ml', '÷ 1000 = ? l'], badge: 'Capacity' },
      },
    },
    {
      minLevel: 2,
      value: {
        prompt: 'The lava path is unstable. Convert 0.75 km into metres to find a safe crossing.',
        sublabel: 'Multiply by 1,000.',
        options: ['75 m', '750 m', '7,500 m', '0.075 m'],
        answerIndex: 1,
        visual: { type: 'equation', lines: ['0.75 km', 'x 1000 = ? m'], badge: 'Length' },
      },
    },
    {
      minLevel: 3,
      value: {
        prompt: 'The lava path is unstable. Convert 2.04 l into millilitres to find a safe crossing.',
        sublabel: 'Watch the decimal places as you convert.',
        options: ['204 ml', '2,040 ml', '20,400 ml', '24 ml'],
        answerIndex: 1,
        visual: { type: 'equation', lines: ['2.04 l', 'x 1000 = ? ml'], badge: 'Capacity' },
      },
    },
    {
      minLevel: 3,
      value: {
        prompt: '5,600 g = how many kilograms?',
        sublabel: 'Divide by 1,000 to move to kilograms.',
        options: ['0.56 kg', '5.06 kg', '5.6 kg', '56 kg'],
        answerIndex: 2,
        visual: { type: 'equation', lines: ['5,600 g', '÷ 1000 = ? kg'], badge: 'Mass' },
      },
    },
  ],
  formula_forge: [
    {
      minLevel: 1,
      value: {
        prompt: 'Use A = l × w. Find the area when l = 8 cm and w = 5 cm.',
        sublabel: 'Multiply the two values.',
        options: ['40 cm²', '13 cm²', '26 cm²', '85 cm²'],
        answerIndex: 0,
        visual: { type: 'equation', lines: ['A = l × w', '8 × 5 = ?'], badge: 'Area' },
      },
    },
    {
      minLevel: 1,
      value: {
        prompt: 'A rectangle is 6 cm long and 4 cm wide. What is its perimeter?',
        sublabel: 'Add first, then double.',
        options: ['20 cm', '10 cm', '24 cm', '18 cm'],
        answerIndex: 0,
        visual: { type: 'equation', lines: ['P = 2(l + w)', '2(6 + 4) = ?'], badge: 'Perimeter' },
      },
    },
    {
      minLevel: 2,
      value: {
        prompt: 'Use A = (b × h) ÷ 2. Find the area for b = 12 cm, h = 5 cm.',
        sublabel: 'Multiply then halve.',
        options: ['30 cm²', '60 cm²', '17 cm²', '24 cm²'],
        answerIndex: 0,
        visual: { type: 'equation', lines: ['A = (b × h) ÷ 2', '(12 × 5) ÷ 2 = ?'], badge: 'Triangle' },
      },
    },
    {
      minLevel: 2,
      value: {
        prompt: 'A number machine multiplies by 4, then subtracts 3. The input is 6. What is the output?',
        sublabel: 'Follow the two operations in order.',
        options: ['21', '27', '15', '9'],
        answerIndex: 0,
        visual: { type: 'equation', lines: ['y = 4x − 3', 'x = 6'], badge: 'Substitute' },
      },
    },
    {
      minLevel: 3,
      value: {
        prompt: 'A number machine multiplies by 2, then adds 5. The output is 19. What was the input?',
        sublabel: 'Work backwards through the rule.',
        options: ['7', '9', '12', '14'],
        answerIndex: 0,
        visual: { type: 'equation', lines: ['y = 2x + 5', 'y = 19'], badge: 'Reverse' },
      },
    },
    {
      minLevel: 3,
      value: {
        prompt: 'A cuboid is 4 cm long, 3 cm wide and 5 cm high. What is its volume in cm³?',
        sublabel: 'Multiply all three values.',
        options: ['60 cm³', '12 cm³', '20 cm³', '75 cm³'],
        answerIndex: 0,
        visual: { type: 'equation', lines: ['V = l × w × h', '4 × 3 × 5 = ?'], badge: 'Volume' },
      },
    },
    {
      minLevel: 3,
      value: {
        prompt: 'A triangle has area 36 cm² and base 9 cm. What is the perpendicular height?',
        sublabel: 'Use the triangle area formula and work backwards.',
        options: ['4 cm', '6 cm', '8 cm', '9 cm'],
        answerIndex: 2,
        visual: { type: 'equation', lines: ['A = (b × h) ÷ 2', '36 = (9 × h) ÷ 2'], badge: 'Reverse' },
      },
    },
    {
      minLevel: 3,
      value: {
        prompt: 'A rectangle has perimeter 34 cm and length 10 cm. What is the width?',
        sublabel: 'Subtract the two lengths first, then halve the result.',
        options: ['5 cm', '6 cm', '7 cm', '8 cm'],
        answerIndex: 2,
        visual: { type: 'equation', lines: ['P = 2(l + w)', '34 = 2(10 + w)'], badge: 'Perimeter' },
      },
    },
  ],
  rule_runner: [
    {
      minLevel: 1,
      value: {
        prompt: 'What comes next?',
        sublabel: 'Look for the constant step between terms.',
        options: ['24', '26', '28', '30'],
        answerIndex: 1,
        visual: { type: 'sequence', values: ['8', '14', '20', '?', '32'], caption: 'Rule: +6' },
      },
    },
    {
      minLevel: 1,
      value: {
        prompt: 'Function machine: ×3, then +2. What is the output for 7?',
        sublabel: 'Apply the operations in the given order.',
        options: ['21', '23', '27', '16'],
        answerIndex: 1,
        visual: { type: 'ratio', leftLabel: 'Input', leftValue: '7', rightLabel: 'Output', rightValue: '?', caption: '×3 then +2' },
      },
    },
    {
      minLevel: 2,
      value: {
        prompt: 'A multiple of 7 has a digit 8. Which could it be?',
        sublabel: 'Check that your number is a multiple of 7 and contains the digit 8.',
        options: ['28', '38', '68', '86'],
        answerIndex: 0,
        visual: { type: 'sequence', values: ['Two digits', 'Multiple of 7', 'One digit is 8'], caption: 'Use all of the clues.' },
      },
    },
    {
      minLevel: 3,
      value: {
        prompt: 'What comes next in 120, 108, 96, 84, ...?',
        sublabel: 'Keep the subtraction rule going.',
        options: ['74', '72', '70', '68'],
        answerIndex: 1,
        visual: { type: 'sequence', values: ['120', '108', '96', '84', '?'], caption: 'Rule: −12' },
      },
    },
    {
      minLevel: 2,
      value: {
        prompt: 'A number machine multiplies by 2, then adds 5. The input is 9. What is the output?',
        sublabel: 'Multiply first, then add.',
        options: ['21', '22', '23', '24'],
        answerIndex: 2,
        visual: { type: 'ratio', leftLabel: 'Input', leftValue: '9', rightLabel: 'Output', rightValue: '?', caption: 'x2 then +5' },
      },
    },
    {
      minLevel: 3,
      value: {
        prompt: 'Write the next number in this sequence: 3, 7, 11, 15, ...',
        sublabel: 'Find the amount added each time.',
        options: ['17', '18', '21', '19'],
        answerIndex: 3,
        visual: { type: 'sequence', values: ['3', '7', '11', '15', '?'], caption: 'Add the same amount each time.' },
      },
    },
  ],
};

const DATA_DUNGEON_BANK: BankEntry<DataDungeonPuzzle>[] = [
  {
    minLevel: 1,
    value: {
      id: 'sat-mean-1',
      type: 'mean',
      question: 'Find the mean.',
      options: [12, 10, 11, 44],
      answer: 11,
      data: [8, 10, 12, 14],
    },
  },
  {
    minLevel: 1,
    value: {
      id: 'sat-mean-4',
      type: 'mean',
      question: 'What is the mean of these numbers?',
      options: [9, 10, 13, 20],
      answer: 10,
      data: [4, 8, 10, 12, 16],
    },
  },
  {
    minLevel: 1,
    value: {
      id: 'sat-mean-5',
      type: 'mean',
      question: 'What is the mean of these numbers?',
      options: [6, 7, 8, 9],
      answer: 8,
      data: [7, 5, 7, 9, 12],
    },
  },
  {
    minLevel: 1,
    value: {
      id: 'sat-range-1',
      type: 'range',
      question: 'What is the difference between the greatest and least numbers shown?',
      options: [11, 12, 13, 31],
      answer: 13,
      data: [13, 9, 22, 17, 11],
    },
  },
  {
    minLevel: 2,
    value: {
      id: 'sat-barchart-1',
      type: 'barchart',
      question: 'How many blue gems are shown in the chart?',
      options: [5, 6, 7, 8],
      answer: 7,
      data: [],
      chartData: [
        { label: 'Red', value: 5, color: '#ef4444' },
        { label: 'Blue', value: 7, color: '#3b82f6' },
        { label: 'Green', value: 4, color: '#10b981' },
        { label: 'Gold', value: 6, color: '#f59e0b' },
      ],
    },
  },
  {
    minLevel: 2,
    value: {
      id: 'sat-barchart-2',
      type: 'barchart',
      question: 'How many more green gems than red gems are shown?',
      options: [1, 2, 3, 4],
      answer: 2,
      data: [],
      chartData: [
        { label: 'Red', value: 4, color: '#ef4444' },
        { label: 'Blue', value: 6, color: '#3b82f6' },
        { label: 'Green', value: 6, color: '#10b981' },
        { label: 'Gold', value: 5, color: '#f59e0b' },
      ],
    },
  },
  {
    minLevel: 3,
    value: {
      id: 'sat-mean-2',
      type: 'mean',
      question: 'Find the mean.',
      options: [14, 15, 16, 75],
      answer: 15,
      data: [9, 12, 15, 18, 21],
    },
  },
  {
    minLevel: 3,
    value: {
      id: 'sat-range-2',
      type: 'range',
      question: 'What is the difference between the greatest and least numbers shown?',
      options: [18, 19, 20, 21],
      answer: 19,
      data: [6, 10, 17, 25],
    },
  },
  {
    minLevel: 2,
    value: {
      id: 'sat-mean-3',
      type: 'mean',
      question: 'Find the mean.',
      options: [8, 9, 10, 12],
      answer: 9,
      data: [6, 0, 12, 18],
    },
  },
  {
    minLevel: 2,
    value: {
      id: 'sat-mean-6',
      type: 'mean',
      question: 'What is the mean of these numbers?',
      options: [9, 10, 11, 12],
      answer: 11,
      data: [4, 10, 12, 18],
    },
  },
  {
    minLevel: 3,
    value: {
      id: 'sat-range-3',
      type: 'range',
      question: 'What is the difference between the greatest and least numbers shown?',
      options: [14, 15, 16, 17],
      answer: 15,
      data: [3, 18, 14, 11, 6],
    },
  },
  {
    minLevel: 3,
    value: {
      id: 'sat-barchart-3',
      type: 'barchart',
      question: 'How many more blue gems than gold gems are shown?',
      options: [0, 1, 2, 3],
      answer: 1,
      data: [],
      chartData: [
        { label: 'Red', value: 4, color: '#ef4444' },
        { label: 'Blue', value: 8, color: '#3b82f6' },
        { label: 'Green', value: 6, color: '#10b981' },
        { label: 'Gold', value: 7, color: '#f59e0b' },
      ],
    },
  },
];

const MEASUREMENT_FORGE_BANK: BankEntry<MeasurementProblem>[] = [
  {
    minLevel: 1,
    value: {
      question: '3.6 m = how many cm?',
      options: ['36 cm', '360 cm', '3,600 cm', '0.36 cm'],
      answer: '360 cm',
      itemType: 'sword',
    },
  },
  {
    minLevel: 1,
    value: {
      question: '2.35 kg = how many g?',
      options: ['235 g', '2350 g', '23500 g', '0.235 g'],
      answer: '2350 g',
      itemType: 'armor',
    },
  },
  {
    minLevel: 2,
    value: {
      question: '750 ml = how many l?',
      options: ['7.5 l', '0.75 l', '75 l', '0.075 l'],
      answer: '0.75 l',
      itemType: 'potion',
    },
  },
  {
    minLevel: 2,
    value: {
      question: '1.8 l = how many ml?',
      options: ['180 ml', '1,080 ml', '1800 ml', '18,000 ml'],
      answer: '1800 ml',
      itemType: 'potion',
    },
  },
  {
    minLevel: 3,
    value: {
      question: '4.08 kg = how many g?',
      options: ['408 g', '4080 g', '40800 g', '0.408 g'],
      answer: '4080 g',
      itemType: 'shield',
    },
  },
  {
    minLevel: 3,
    value: {
      question: '0.85 m = how many mm?',
      options: ['85 mm', '850 mm', '8,500 mm', '0.85 mm'],
      answer: '850 mm',
      itemType: 'sword',
    },
  },
  {
    minLevel: 2,
    value: {
      question: '0.75 kg = how many g?',
      options: ['75 g', '750 g', '7,500 g', '0.075 g'],
      answer: '750 g',
      itemType: 'armor',
    },
  },
  {
    minLevel: 3,
    value: {
      question: '2.04 l = how many ml?',
      options: ['204 ml', '2,040 ml', '20,400 ml', '24 ml'],
      answer: '2,040 ml',
      itemType: 'potion',
    },
  },
  {
    minLevel: 3,
    value: {
      question: '5,600 g = how many kg?',
      options: ['0.56 kg', '5.06 kg', '5.6 kg', '56 kg'],
      answer: '5.6 kg',
      itemType: 'shield',
    },
  },
];

const TIMEKEEPER_BANK: BankEntry<TimeProblem>[] = [
  {
    minLevel: 1,
    value: {
      question: 'Write 7:20 pm using the 24-hour clock.',
      options: ['07:20', '17:20', '19:20', '21:20'],
      answer: '19:20',
    },
  },
  {
    minLevel: 1,
    value: {
      question: 'Write 12:35 am using the 24-hour clock.',
      options: ['00:35', '12:35', '01:35', '23:35'],
      answer: '00:35',
    },
  },
  {
    minLevel: 2,
    value: {
      question: 'What time is 1 hour 25 minutes after 4:15 pm?',
      options: ['5:30 PM', '5:40 PM', '6:40 PM', '5:50 PM'],
      answer: '5:40 PM',
    },
  },
  {
    minLevel: 2,
    value: {
      question: 'What time is 2 hours 10 minutes before 9:05 am?',
      options: ['6:55 AM', '7:15 AM', '7:55 AM', '6:45 AM'],
      answer: '6:55 AM',
    },
  },
  {
    minLevel: 3,
    value: {
      question: 'How much time is there between 08:35 and 11:20?',
      options: ['2h 35m', '2h 45m', '3h 45m', '2h 55m'],
      answer: '2h 45m',
    },
  },
  {
    minLevel: 3,
    value: {
      question: 'What time is 150 minutes after 10:40 am?',
      options: ['12:50 PM', '1:10 PM', '1:20 PM', '12:10 PM'],
      answer: '1:10 PM',
    },
  },
  {
    minLevel: 2,
    value: {
      question: 'Write 11:45 pm using the 24-hour clock.',
      options: ['11:45', '23:45', '00:45', '12:45'],
      answer: '23:45',
    },
  },
  {
    minLevel: 3,
    value: {
      question: 'What time is 45 minutes before 1:20 pm?',
      options: ['12:35 PM', '12:45 PM', '1:05 PM', '12:25 PM'],
      answer: '12:35 PM',
    },
  },
  {
    minLevel: 3,
    value: {
      question: 'How much time is there between 09:50 and 12:15?',
      options: ['2h 15m', '2h 25m', '2h 35m', '2h 45m'],
      answer: '2h 25m',
    },
  },
];

export const getSatsInspiredChallengeQuestion = (
  gameType: SupportedChallengeGameType,
  levelId: number,
): ChallengeQuestion | null => selectBankValue(
  CHALLENGE_BANKS[gameType],
  levelId,
  `challenge:${gameType}`,
  shuffleChallengeOptions,
);

export const getSatsInspiredDataDungeonPuzzle = (levelId: number): DataDungeonPuzzle | null =>
  selectBankValue(DATA_DUNGEON_BANK, levelId, 'data_dungeon', shuffleAnswerOptions);

export const getSatsInspiredMeasurementProblem = (levelId: number): MeasurementProblem | null =>
  selectBankValue(MEASUREMENT_FORGE_BANK, levelId, 'measurement_forge', shuffleAnswerOptions);

export const getSatsInspiredTimeProblem = (levelId: number): TimeProblem | null =>
  selectBankValue(TIMEKEEPER_BANK, levelId, 'timekeeper', shuffleAnswerOptions);




