export type SupportedChallengeGameType =
  | 'place_value_peaks'
  | 'calculation_clash'
  | 'percent_pulse'
  | 'coordinate_quest'
  | 'transform_temple'
  | 'scale_safari'
  | 'chart_chase'
  | 'mean_machine'
  | 'equation_grove'
  | 'rule_runner';

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
  prompt: string;
  sublabel: string;
  options: string[];
  answerIndex: number;
  visual: VisualData;
}

export type DataDungeonPuzzleType = 'mean' | 'median' | 'mode' | 'range' | 'barchart';

export interface DataDungeonPuzzle {
  id: string;
  type: DataDungeonPuzzleType;
  question: string;
  options: number[];
  answer: number;
  data: number[];
  chartData?: { label: string; value: number; color: string }[];
}

export interface MeasurementProblem {
  question: string;
  options: string[];
  answer: string;
  itemType: 'sword' | 'shield' | 'potion' | 'armor';
}

export interface TimeProblem {
  question: string;
  options: string[];
  answer: string;
}

interface BankEntry<T> {
  minLevel: number;
  value: T;
}

const cloneBankEntry = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T;

const pick = <T>(items: T[]): T => items[Math.floor(Math.random() * items.length)];

const selectBankValue = <T>(bank: BankEntry<T>[], levelId: number): T | null => {
  const eligible = bank.filter(entry => entry.minLevel <= levelId);
  if (!eligible.length) return null;
  return cloneBankEntry(pick(eligible).value);
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
        sublabel: 'This SATs-style question is about place value, not the digit itself.',
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
        prompt: 'What number is 10,000 more than 589,432?',
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
        prompt: 'Calculate 84 + 6 × 7',
        sublabel: 'Use the order of operations just like in Paper 1.',
        options: ['630', '126', '90', '588'],
        answerIndex: 1,
        visual: { type: 'equation', lines: ['84 + 6 × 7', 'Multiply first, then add.'], badge: 'BODMAS', variant: 'clash' },
      },
    },
    {
      minLevel: 1,
      value: {
        prompt: 'Work out (960 ÷ 12) + 37',
        sublabel: 'Solve the bracket first.',
        options: ['117', '80', '73', '127'],
        answerIndex: 0,
        visual: { type: 'equation', lines: ['(960 ÷ 12) + 37', 'Division before addition.'], badge: 'Clash', variant: 'clash' },
      },
    },
    {
      minLevel: 2,
      value: {
        prompt: 'A concert sells 248 tickets on Friday and 317 on Saturday. 85 are refunded. How many tickets count in total?',
        sublabel: 'This is a multi-step SATs story problem.',
        options: ['650', '565', '480', '563'],
        answerIndex: 2,
        visual: { type: 'ratio', leftLabel: 'Friday', leftValue: '248', rightLabel: 'Saturday', rightValue: '317', caption: 'Add the two totals, then subtract 85 refunds.' },
      },
    },
    {
      minLevel: 3,
      value: {
        prompt: '35 boxes each hold 48 packets. The shop sells 56 packets a day. How many days for all packets to be sold?',
        sublabel: 'Find the total first, then divide.',
        options: ['28', '30', '32', '35'],
        answerIndex: 1,
        visual: { type: 'ratio', leftLabel: 'Boxes', leftValue: '35', rightLabel: 'Packets each', rightValue: '48', caption: 'Total packets ÷ 56 each day' },
      },
    },
  ],
  percent_pulse: [
    {
      minLevel: 1,
      value: {
        prompt: 'Which answer is equivalent to 0.375?',
        sublabel: 'Link the decimal to its percentage form.',
        options: ['3.75%', '37.5%', '35%', '75%'],
        answerIndex: 1,
        visual: {
          type: 'pulse',
          centerLabel: '0.375',
          orbitLabels: ['fraction', 'decimal', 'percentage'],
          meterValue: 37.5,
          meterLabel: '37.5%',
          caption: 'Find the matching form.',
        },
      },
    },
    {
      minLevel: 1,
      value: {
        prompt: 'What is 15% of 80?',
        sublabel: 'Use 10% and 5% to build the answer.',
        options: ['12', '8', '15', '20'],
        answerIndex: 0,
        visual: {
          type: 'pulse',
          centerLabel: '15%',
          orbitLabels: ['10% = 8', '5% = 4', 'Combine both'],
          meterValue: 15,
          meterLabel: '15% target',
          caption: 'Charge the pulse by combining known percentages.',
        },
      },
    },
    {
      minLevel: 2,
      value: {
        prompt: 'Three out of four equal parts are shaded. What percentage is shaded?',
        sublabel: 'Convert the fraction of the whole into a percentage.',
        options: ['25%', '50%', '75%', '80%'],
        answerIndex: 2,
        visual: {
          type: 'pulse',
          centerLabel: '3/4',
          orbitLabels: ['0.75', '75%', 'whole shape'],
          meterValue: 75,
          meterLabel: '75%',
          caption: 'A SATs-style percentage-of-shape prompt.',
        },
      },
    },
    {
      minLevel: 3,
      value: {
        prompt: '30 pupils out of 120 chose the trip. What percentage chose the trip?',
        sublabel: 'Turn the fraction into an equivalent percentage.',
        options: ['20%', '25%', '30%', '40%'],
        answerIndex: 1,
        visual: {
          type: 'pulse',
          centerLabel: '30 out of 120',
          orbitLabels: ['quarter of the whole', 'fraction to %', 'same proportion'],
          meterValue: 25,
          meterLabel: '25%',
          caption: 'Reduce the proportion before converting.',
        },
      },
    },
  ],
  coordinate_quest: [
    {
      minLevel: 1,
      value: {
        prompt: 'Guide the scout to beacon C. Which coordinates lock in the route?',
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
            { label: 'C', x: 0, y: 3, tone: 'bg-violet-300' },
            { label: 'D', x: 8, y: 8, tone: 'bg-amber-300' },
          ],
        },
      },
    },
    {
      minLevel: 2,
      value: {
        prompt: 'Point P starts at (5, 8). Move 4 right, 6 down and 2 left. Where does P finish?',
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
        prompt: 'Which point is located at (4, 7)?',
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
            { label: 'C', x: 3, y: 6, tone: 'bg-violet-300' },
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
        prompt: 'A shape moves 8 units right. Which description matches the transformation?',
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
        prompt: 'A recipe uses 150 g of flour for 3 portions. How much flour is needed for 9 portions?',
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
        prompt: 'Convert 5.4 km to metres.',
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
        prompt: 'Convert 35.5 cm to metres.',
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
        prompt: 'A shorter tower is half the height of a 22 cm tower. How tall is the shorter tower?',
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
  chart_chase: [
    {
      minLevel: 1,
      value: {
        prompt: 'How many were recorded in the green bar?',
        sublabel: 'Read the exact bar height.',
        options: ['4', '5', '6', '7'],
        answerIndex: 2,
        visual: {
          type: 'bars',
          caption: 'Gem survey',
          bars: [
            { label: 'Red', value: 5, color: 'from-rose-400 to-orange-300' },
            { label: 'Blue', value: 4, color: 'from-sky-400 to-cyan-300' },
            { label: 'Green', value: 6, color: 'from-emerald-400 to-lime-300' },
            { label: 'Gold', value: 3, color: 'from-amber-300 to-yellow-300' },
          ],
        },
      },
    },
    {
      minLevel: 2,
      value: {
        prompt: 'Which bar shows the greatest value?',
        sublabel: 'Compare all bar heights before you answer.',
        options: ['Red', 'Blue', 'Green', 'Gold'],
        answerIndex: 1,
        visual: {
          type: 'bars',
          caption: 'Treasure tally',
          bars: [
            { label: 'Red', value: 7, color: 'from-rose-400 to-orange-300' },
            { label: 'Blue', value: 9, color: 'from-sky-400 to-cyan-300' },
            { label: 'Green', value: 6, color: 'from-emerald-400 to-lime-300' },
            { label: 'Gold', value: 8, color: 'from-amber-300 to-yellow-300' },
          ],
        },
      },
    },
    {
      minLevel: 2,
      value: {
        prompt: 'How many more does the purple bar show than the orange bar?',
        sublabel: 'Find the difference between the two bar heights.',
        options: ['2', '3', '4', '5'],
        answerIndex: 1,
        visual: {
          type: 'bars',
          caption: 'Potion orders',
          bars: [
            { label: 'Orange', value: 5, color: 'from-amber-300 to-orange-400' },
            { label: 'Purple', value: 8, color: 'from-violet-300 to-fuchsia-400' },
            { label: 'Teal', value: 6, color: 'from-cyan-300 to-sky-400' },
            { label: 'Green', value: 4, color: 'from-emerald-300 to-lime-400' },
          ],
        },
      },
    },
  ],
  mean_machine: [
    {
      minLevel: 1,
      value: {
        prompt: 'What is the mean of 8, 10, 12 and 14?',
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
        prompt: 'Five scores have a mean of 18. What is their total?',
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
        prompt: 'A rule says black = (white × 3) + 4. If white = 9, how many black beads are needed?',
        sublabel: 'Substitute the value and then calculate.',
        options: ['27', '31', '36', '13'],
        answerIndex: 1,
        visual: { type: 'equation', lines: ['black = (white × 3) + 4', 'white = 9'], badge: 'Rule' },
      },
    },
    {
      minLevel: 3,
      value: {
        prompt: 'A rule says black = (white × 3) + 4. If black = 25, what is white?',
        sublabel: 'Work backwards through the rule.',
        options: ['5', '6', '7', '8'],
        answerIndex: 2,
        visual: { type: 'equation', lines: ['black = (white × 3) + 4', 'black = 25'], badge: 'Inverse' },
      },
    },
  ],
  rule_runner: [
    {
      minLevel: 1,
      value: {
        prompt: 'What number completes the sequence?',
        sublabel: 'Look for the constant step between terms.',
        options: ['24', '26', '28', '30'],
        answerIndex: 1,
        visual: { type: 'sequence', values: ['8', '14', '20', '?', '32'], caption: 'Rule: +6' },
      },
    },
    {
      minLevel: 1,
      value: {
        prompt: 'A function machine does ×3, then +2. What is the output for 7?',
        sublabel: 'Apply the operations in the given order.',
        options: ['21', '23', '27', '16'],
        answerIndex: 1,
        visual: { type: 'ratio', leftLabel: 'Input', leftValue: '7', rightLabel: 'Output', rightValue: '?', caption: '×3 then +2' },
      },
    },
    {
      minLevel: 2,
      value: {
        prompt: 'A two-digit number is a multiple of 7 and one of its digits is 8. Which number could it be?',
        sublabel: 'Test the clue against each option like a SATs reasoning item.',
        options: ['28', '38', '68', '86'],
        answerIndex: 0,
        visual: { type: 'sequence', values: ['Two digits', 'Multiple of 7', 'One digit is 8'], caption: 'Use all of the clues.' },
      },
    },
    {
      minLevel: 3,
      value: {
        prompt: 'What is the next term in the pattern 120, 108, 96, 84, ... ?',
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
      question: 'What is the mean of these numbers?',
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
      question: 'What is the MEDIAN of these numbers?',
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
      question: 'What is the MODE of these numbers?',
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
      question: 'What is the RANGE of these numbers?',
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
      question: 'How many blue gems were found?',
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
      question: 'How many more green gems were found than red gems?',
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
      question: 'What is the MEAN of these scores?',
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
      question: 'What is the RANGE of these numbers?',
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
      question: 'Forge a sword that is 3.6 m long. What is this in cm?',
      options: ['36 cm', '360 cm', '3,600 cm', '0.36 cm'],
      answer: '360 cm',
      itemType: 'sword',
    },
  },
  {
    minLevel: 1,
    value: {
      question: 'Forge an armor plate weighing 2.35 kg. What is this in g?',
      options: ['235 g', '2350 g', '23500 g', '0.235 g'],
      answer: '2350 g',
      itemType: 'armor',
    },
  },
  {
    minLevel: 2,
    value: {
      question: 'Brew a potion with 750 ml of liquid. What is this in l?',
      options: ['7.5 l', '0.75 l', '75 l', '0.075 l'],
      answer: '0.75 l',
      itemType: 'potion',
    },
  },
  {
    minLevel: 2,
    value: {
      question: 'Brew a potion with 1.8 l of liquid. What is this in ml?',
      options: ['180 ml', '1,080 ml', '1800 ml', '18,000 ml'],
      answer: '1800 ml',
      itemType: 'potion',
    },
  },
  {
    minLevel: 3,
    value: {
      question: 'Forge a shield weighing 4.08 kg. What is this in g?',
      options: ['408 g', '4080 g', '40800 g', '0.408 g'],
      answer: '4080 g',
      itemType: 'shield',
    },
  },
  {
    minLevel: 3,
    value: {
      question: 'Forge a sword that is 0.85 m long. What is this in mm?',
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
      question: 'What time is 7:20 PM in 24-hour format?',
      options: ['07:20', '17:20', '19:20', '21:20'],
      answer: '19:20',
    },
  },
  {
    minLevel: 1,
    value: {
      question: 'What time is 12:35 AM in 24-hour format?',
      options: ['00:35', '12:35', '01:35', '23:35'],
      answer: '00:35',
    },
  },
  {
    minLevel: 2,
    value: {
      question: 'What time is 1 hour and 25 minutes after 4:15 PM?',
      options: ['5:30 PM', '5:40 PM', '6:40 PM', '5:50 PM'],
      answer: '5:40 PM',
    },
  },
  {
    minLevel: 2,
    value: {
      question: 'What time is 2 hours and 10 minutes before 9:05 AM?',
      options: ['6:55 AM', '7:15 AM', '7:55 AM', '6:45 AM'],
      answer: '6:55 AM',
    },
  },
  {
    minLevel: 3,
    value: {
      question: 'How long is it from 08:35 to 11:20?',
      options: ['2h 35m', '2h 45m', '3h 45m', '2h 55m'],
      answer: '2h 45m',
    },
  },
  {
    minLevel: 3,
    value: {
      question: 'What time is 150 minutes after 10:40 AM?',
      options: ['12:50 PM', '1:10 PM', '1:20 PM', '12:10 PM'],
      answer: '1:10 PM',
    },
  },
];

export const getSatsInspiredChallengeQuestion = (
  gameType: SupportedChallengeGameType,
  levelId: number,
): ChallengeQuestion | null => selectBankValue(CHALLENGE_BANKS[gameType], levelId);

export const getSatsInspiredDataDungeonPuzzle = (levelId: number): DataDungeonPuzzle | null =>
  selectBankValue(DATA_DUNGEON_BANK, levelId);

export const getSatsInspiredMeasurementProblem = (levelId: number): MeasurementProblem | null =>
  selectBankValue(MEASUREMENT_FORGE_BANK, levelId);

export const getSatsInspiredTimeProblem = (levelId: number): TimeProblem | null =>
  selectBankValue(TIMEKEEPER_BANK, levelId);
