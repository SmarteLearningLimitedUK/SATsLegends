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
        prompt: 'Which number is biggest?',
        sublabel: 'Compare the highest-value digits first, then scan across.',
        options: ['4,305,019', '4,350,190', '4,305,901', '4,305,109'],
        answerIndex: 1,
        visual: { type: 'tokens', items: ['4,305,019', '4,350,190', '4,305,901', '4,305,109'], accent: 'amber' },
      },
    },
    {
      minLevel: 1,
      value: {
        prompt: 'What is the value of 6 in 3,674,215?',
        sublabel: 'This SATs-style question is about place value, not the digit itself.',
        options: ['6', '60,000', '600,000', '6,000'],
        answerIndex: 2,
        visual: { type: 'tokens', items: ['3', '6', '7', '4', '2', '1', '5'], accent: 'emerald' },
      },
    },
    {
      minLevel: 2,
      value: {
        prompt: 'Which number rounds to 340,000?',
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
  ],
  calculation_clash: [
    {
      minLevel: 1,
      value: {
        prompt: 'Work out 84 + 67',
        sublabel: 'Add the two numbers.',
        options: ['141', '151', '161', '171'],
        answerIndex: 0,
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
        answerIndex: 1,
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
  ],
  coordinate_quest: [
    {
      minLevel: 1,
      value: {
        prompt: 'Find beacon C. Which coordinates are correct?',
        sublabel: 'Read across the x-axis first, then up the y-axis.',
        options: ['(6, 2)', '(2, 6)', '(0, 3)', '(8, 8)'],
        answerIndex: 2,
        visual: {
          type: 'coordinates',
          min: 0,
          max: 8,
          targetLabel: 'C',
          caption: 'Inspired by the SATs coordinate matching layout.',
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
        prompt: 'Point P starts at (5, 8). Where does it finish?',
        sublabel: 'Combine the translations carefully.',
        options: ['(7, 2)', '(7, 4)', '(9, 2)', '(3, 2)'],
        answerIndex: 0,
        visual: {
          type: 'equation',
          lines: ['Start at (5, 8)', '+4 on x, -6 on y, -2 on x', 'Final position = ?'],
          badge: 'Route',
        },
      },
    },
    {
      minLevel: 2,
      value: {
        prompt: 'Which point is at (4, 7)?',
        sublabel: 'Match the coordinates to the labelled point.',
        options: ['A', 'B', 'C', 'D'],
        answerIndex: 3,
        visual: {
          type: 'coordinates',
          min: 0,
          max: 8,
          targetLabel: 'D',
          caption: 'Find the labelled point at the given coordinates.',
          points: [
            { label: 'A', x: 1, y: 4, tone: 'bg-cyan-300' },
            { label: 'B', x: 6, y: 1, tone: 'bg-emerald-300' },
            { label: 'C', x: 3, y: 6, tone: 'bg-sky-300' },
            { label: 'D', x: 4, y: 7, tone: 'bg-amber-300' },
          ],
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
          caption: 'SATs-style translation from an original point to its image.',
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
        sublabel: 'This mirrors the one-step translation prompts in the papers.',
        options: ['translation 8 units right', 'reflection in a vertical line', 'translation 8 units left', 'rotation 90° clockwise'],
        answerIndex: 0,
        visual: {
          type: 'equation',
          lines: ['Original shape → image', 'Every point moves +8 on the x-axis'],
          badge: 'Transform',
        },
      },
    },
  ],
  scale_safari: [
    {
      minLevel: 1,
      value: {
        prompt: '150 g makes 3 portions. How much for 9?',
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
        prompt: 'Half of a 22 cm tower is how tall?',
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
  ],
  graph_grabber: [
    {
      minLevel: 1,
      value: {
        prompt: 'The records show the number of crates delivered by each ship. How many crates did The Number Wave deliver?',
        sublabel: 'Read the Number Wave bar carefully.',
        options: ['4', '6', '7', '9'],
        answerIndex: 1,
        visual: {
          type: 'bars',
          caption: 'Cargo ships',
          bars: [
            { label: 'Number Wave', value: 6, color: 'from-sky-400 to-cyan-300' },
            { label: 'Logic Tide', value: 9, color: 'from-indigo-400 to-blue-300' },
            { label: 'Brain Voyager', value: 7, color: 'from-emerald-400 to-lime-300' },
            { label: 'Data Current', value: 4, color: 'from-amber-300 to-yellow-300' },
          ],
        },
      },
    },
    {
      minLevel: 2,
      value: {
        prompt: 'The records show the number of crates delivered by each ship. Which ship delivered the most crates?',
        sublabel: 'Compare every bar before you answer.',
        options: ['Number Wave', 'Logic Tide', 'Brain Voyager', 'Data Current'],
        answerIndex: 1,
        visual: {
          type: 'bars',
          caption: 'Cargo ships',
          bars: [
            { label: 'Number Wave', value: 6, color: 'from-sky-400 to-cyan-300' },
            { label: 'Logic Tide', value: 9, color: 'from-indigo-400 to-blue-300' },
            { label: 'Brain Voyager', value: 7, color: 'from-emerald-400 to-lime-300' },
            { label: 'Data Current', value: 4, color: 'from-amber-300 to-yellow-300' },
          ],
        },
      },
    },
    {
      minLevel: 2,
      value: {
        prompt: 'The records show the number of crates delivered by each ship. How many more crates did The Logic Tide deliver than The Brain Voyager?',
        sublabel: 'Subtract the Brain Voyager bar from the Logic Tide bar.',
        options: ['2', '3', '4', '5'],
        answerIndex: 1,
        visual: {
          type: 'bars',
          caption: 'Cargo ships',
          bars: [
            { label: 'Number Wave', value: 5, color: 'from-sky-400 to-cyan-300' },
            { label: 'Logic Tide', value: 12, color: 'from-indigo-400 to-blue-300' },
            { label: 'Brain Voyager', value: 9, color: 'from-emerald-400 to-lime-300' },
            { label: 'Data Current', value: 4, color: 'from-amber-300 to-yellow-300' },
          ],
        },
      },
    },
    {
      minLevel: 3,
      value: {
        prompt: 'The records show the number of crates delivered by each ship. What is the total number of crates delivered by all four ships?',
        sublabel: 'Add all four bars together.',
        options: ['22', '24', '26', '28'],
        answerIndex: 2,
        visual: {
          type: 'bars',
          caption: 'Cargo ships',
          bars: [
            { label: 'Number Wave', value: 7, color: 'from-sky-400 to-cyan-300' },
            { label: 'Logic Tide', value: 8, color: 'from-indigo-400 to-blue-300' },
            { label: 'Brain Voyager', value: 5, color: 'from-emerald-400 to-lime-300' },
            { label: 'Data Current', value: 6, color: 'from-amber-300 to-yellow-300' },
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
  ],
  equation_grove: [
    {
      minLevel: 1,
      value: {
        prompt: 'Solve x + 17 = 53',
        sublabel: 'Find the number that balances the equation.',
        options: ['34', '36', '70', '17'],
        answerIndex: 1,
        visual: { type: 'equation', lines: ['x + 17 = 53', 'Balance both sides.'], badge: 'Equation' },
      },
    },
    {
      minLevel: 2,
      value: {
        prompt: 'Solve 4n = 36',
        sublabel: 'Undo the multiplication to find n.',
        options: ['8', '9', '12', '32'],
        answerIndex: 1,
        visual: { type: 'equation', lines: ['4n = 36', 'n = ?'], badge: 'Grove' },
      },
    },
    {
      minLevel: 2,
      value: {
        prompt: 'Rule: black = (white ? 3) + 4. White = 9. Find black beads.',
        sublabel: 'Substitute the value and then calculate.',
        options: ['27', '31', '36', '13'],
        answerIndex: 1,
        visual: { type: 'equation', lines: ['black = (white × 3) + 4', 'white = 9'], badge: 'Rule' },
      },
    },
    {
      minLevel: 3,
      value: {
        prompt: 'Rule: black = (white ? 3) + 4. Black = 25. What is white?',
        sublabel: 'Work backwards through the rule.',
        options: ['5', '6', '7', '8'],
        answerIndex: 2,
        visual: { type: 'equation', lines: ['black = (white × 3) + 4', 'black = 25'], badge: 'Inverse' },
      },
    },
  ],
  unit_mixer: [
    {
      minLevel: 1,
      value: {
        prompt: 'Convert 3.5 km to m.',
        sublabel: 'Remember that 1 km = 1000 m.',
        options: ['3,500 m', '350 m', '35,000 m', '3.5 m'],
        answerIndex: 0,
        visual: { type: 'equation', lines: ['3.5 km', '× 1000 = ? m'], badge: 'Convert' },
      },
    },
    {
      minLevel: 1,
      value: {
        prompt: 'Convert 420 cm to m.',
        sublabel: 'Divide by 100 to move from cm to m.',
        options: ['4.2 m', '42 m', '0.42 m', '420 m'],
        answerIndex: 0,
        visual: { type: 'equation', lines: ['420 cm', '÷ 100 = ? m'], badge: 'Length' },
      },
    },
    {
      minLevel: 2,
      value: {
        prompt: '1.2 litres = how many millilitres?',
        sublabel: 'Litres to millilitres is ×1000.',
        options: ['1,200 ml', '120 ml', '12,000 ml', '0.12 ml'],
        answerIndex: 0,
        visual: { type: 'equation', lines: ['1.2 l', '× 1000 = ? ml'], badge: 'Capacity' },
      },
    },
    {
      minLevel: 2,
      value: {
        prompt: 'Convert 2.75 kg to g.',
        sublabel: 'Kilograms to grams is ×1000.',
        options: ['2,750 g', '275 g', '27,500 g', '2.75 g'],
        answerIndex: 0,
        visual: { type: 'equation', lines: ['2.75 kg', '× 1000 = ? g'], badge: 'Mass' },
      },
    },
    {
      minLevel: 3,
      value: {
        prompt: '1.8 m = how many cm?',
        sublabel: 'Multiply by 100.',
        options: ['180 cm', '18 cm', '1,800 cm', '1.8 cm'],
        answerIndex: 0,
        visual: { type: 'equation', lines: ['1.8 m', '× 100 = ? cm'], badge: 'Length' },
      },
    },
    {
      minLevel: 3,
      value: {
        prompt: '450 ml = how many litres?',
        sublabel: 'Millilitres to litres is ÷1000.',
        options: ['0.45 l', '4.5 l', '45 l', '0.045 l'],
        answerIndex: 0,
        visual: { type: 'equation', lines: ['450 ml', '÷ 1000 = ? l'], badge: 'Capacity' },
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
        prompt: 'Find perimeter when l = 6 cm and w = 4 cm.',
        sublabel: 'Add first, then double.',
        options: ['20 cm', '10 cm', '24 cm', '18 cm'],
        answerIndex: 0,
        visual: { type: 'equation', lines: ['P = 2(l + w)', '2(6 + 4) = ?'], badge: 'Perimeter' },
      },
    },
    {
      minLevel: 2,
      value: {
        prompt: 'Use A = (b ? h) ? 2. Find the area for b = 12 cm, h = 5 cm.',
        sublabel: 'Multiply then halve.',
        options: ['30 cm²', '60 cm²', '17 cm²', '24 cm²'],
        answerIndex: 0,
        visual: { type: 'equation', lines: ['A = (b × h) ÷ 2', '(12 × 5) ÷ 2 = ?'], badge: 'Triangle' },
      },
    },
    {
      minLevel: 2,
      value: {
        prompt: 'A rule says y = 4x − 3. What is y when x = 6?',
        sublabel: 'Substitute, then calculate.',
        options: ['21', '27', '15', '9'],
        answerIndex: 0,
        visual: { type: 'equation', lines: ['y = 4x − 3', 'x = 6'], badge: 'Substitute' },
      },
    },
    {
      minLevel: 3,
      value: {
        prompt: 'Rule: y = 2x + 5. If y = 19, what is x?',
        sublabel: 'Work backwards through the rule.',
        options: ['7', '9', '12', '14'],
        answerIndex: 0,
        visual: { type: 'equation', lines: ['y = 2x + 5', 'y = 19'], badge: 'Reverse' },
      },
    },
    {
      minLevel: 3,
      value: {
        prompt: 'Use V = l ? w ? h. Find volume for 4, 3, 5.',
        sublabel: 'Multiply all three values.',
        options: ['60 cm³', '12 cm³', '20 cm³', '75 cm³'],
        answerIndex: 0,
        visual: { type: 'equation', lines: ['V = l × w × h', '4 × 3 × 5 = ?'], badge: 'Volume' },
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
        prompt: 'Function machine: ?3, then +2. What is the output for 7?',
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
        sublabel: 'Test the clue against each option like a SATs reasoning item.',
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
      id: 'sat-median-1',
      type: 'median',
      question: 'Find the median.',
      options: [9, 11, 13, 20],
      answer: 11,
      data: [20, 11, 4, 15, 9],
    },
  },
  {
    minLevel: 1,
    value: {
      id: 'sat-mode-1',
      type: 'mode',
      question: 'Find the mode.',
      options: [5, 7, 9, 12],
      answer: 7,
      data: [7, 5, 7, 9, 12],
    },
  },
  {
    minLevel: 1,
    value: {
      id: 'sat-range-1',
      type: 'range',
      question: 'Find the range.',
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
      question: 'How many blue gems?',
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
      question: 'How many more green than red?',
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
      question: 'Find the range.',
      options: [18, 19, 20, 21],
      answer: 19,
      data: [6, 10, 17, 25],
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
];

const TIMEKEEPER_BANK: BankEntry<TimeProblem>[] = [
  {
    minLevel: 1,
    value: {
      question: '7:20 PM in 24-hour time?',
      options: ['07:20', '17:20', '19:20', '21:20'],
      answer: '19:20',
    },
  },
  {
    minLevel: 1,
    value: {
      question: '12:35 AM in 24-hour time?',
      options: ['00:35', '12:35', '01:35', '23:35'],
      answer: '00:35',
    },
  },
  {
    minLevel: 2,
    value: {
      question: '1 hour 25 minutes after 4:15 PM?',
      options: ['5:30 PM', '5:40 PM', '6:40 PM', '5:50 PM'],
      answer: '5:40 PM',
    },
  },
  {
    minLevel: 2,
    value: {
      question: '2 hours 10 minutes before 9:05 AM?',
      options: ['6:55 AM', '7:15 AM', '7:55 AM', '6:45 AM'],
      answer: '6:55 AM',
    },
  },
  {
    minLevel: 3,
    value: {
      question: 'How long from 08:35 to 11:20?',
      options: ['2h 35m', '2h 45m', '3h 45m', '2h 55m'],
      answer: '2h 45m',
    },
  },
  {
    minLevel: 3,
    value: {
      question: '150 minutes after 10:40 AM?',
      options: ['12:50 PM', '1:10 PM', '1:20 PM', '12:10 PM'],
      answer: '1:10 PM',
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




