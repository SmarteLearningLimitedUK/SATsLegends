import { MiniGameType } from './types';

export interface GameRuleSet {
  title: string;
  summary: string;
  bullets: string[];
}

export interface GameMeta {
  label: string;
  focus: string;
  mode?: 'standard' | 'boss' | 'special';
  rules: GameRuleSet;
}

const makeBossRules = (title: string, summary: string, closingLine: string): GameRuleSet => ({
  title,
  summary,
  bullets: [
    'Each correct answer damages the boss health bar.',
    'You need at least 8 correct answers out of 10 to win.',
    closingLine,
  ],
});

export const GAME_META: Record<MiniGameType, GameMeta> = {
  quiz: {
    label: 'Quiz',
    focus: 'Mixed SATs fluency',
    mode: 'special',
    rules: {
      title: 'Quiz',
      summary: 'A flexible revision mode for mixed SATs questions and practice runs.',
      bullets: [
        'Use it for daily review, warm-ups, or catch-up revision.',
        'Questions can mix domains instead of staying on one island topic.',
        'It is best suited to side modes rather than the core campaign route.',
      ],
    },
  },
  potion_pour: {
    label: 'Potion Pour',
    focus: 'Ratio, proportion and capacity',
    rules: {
      title: 'Potion Pour',
      summary: 'Mix ingredients to hit the correct ratio or measure target.',
      bullets: [
        'Use the clues to decide the correct amount for each part.',
        'Stay inside the target measure to keep the brew stable.',
        'Faster accurate pours lead to higher scores.',
      ],
    },
  },
  cloud_collapse: {
    label: 'Cloud Collapse',
    focus: 'Rapid equivalence cluster clearing',
    rules: {
      title: 'Cloud Collapse',
      summary: 'Clear connected clouds of matching equivalent values before the board fills your path.',
      bullets: [
        'Tap connected matching answers to clear bigger groups.',
        'Large clears trigger better score bonuses than small taps.',
        'Reach the target before the timer expires.',
      ],
    },
  },
  sequence_sprint: {
    label: 'Sequence Sprint',
    focus: 'Next-term sequence spotting',
    rules: {
      title: 'Sequence Sprint',
      summary: 'Read the pattern quickly and choose the next value before the route closes.',
      bullets: [
        'Look for the rule linking each term to the next.',
        'This game is about continuing number patterns at speed.',
        'Keep streaks alive to score faster.',
      ],
    },
  },
  logic_sort: {
    label: 'Logic Sort',
    focus: 'Classification and reasoning',
    rules: {
      title: 'Logic Sort',
      summary: 'Sort the items into the correct groups before time runs out.',
      bullets: [
        'Read the hidden rule from the clues on screen.',
        'Move pieces only when you are confident of the pattern.',
        'Clean runs without errors build bigger rewards.',
      ],
    },
  },
  shape_shift: {
    label: 'Shape Shift',
    focus: 'Spatial reasoning',
    mode: 'special',
    rules: {
      title: 'Shape Shift',
      summary: 'Transform the shape until it matches the target pattern.',
      bullets: [
        'Rotate, reflect or flip the shape as needed.',
        'Compare your build to the target before locking it in.',
        'This reads more like a side challenge than a core island lane right now.',
      ],
    },
  },
  matrix_match: {
    label: 'Matrix Match',
    focus: 'Reasoning matrices',
    mode: 'boss',
    rules: makeBossRules(
      'Matrix Match',
      'Enter the final logic matrix and complete each pattern before the Oracle Slime overwhelms the forest.',
      'Look for colour, size, number and rotation rules before you commit.'
    ),
  },
  burger_builder: {
    label: 'Burger Bar',
    focus: 'Fractions and mixed numbers',
    rules: {
      title: 'Burger Bar',
      summary: 'Build the burger so the total equals the customer order.',
      bullets: [
        'Each ingredient has a fraction value.',
        'Match the exact total and include required ingredients.',
        'You have 45 seconds before the customer leaves.',
      ],
    },
  },
  fraction_match: {
    label: 'Crystal Match',
    focus: 'Equivalent values match-3 play',
    rules: {
      title: 'Crystal Match',
      summary: 'Swap tiles to line up equivalent fractions and decimals in clean match-3 chains.',
      bullets: [
        'Only adjacent tiles can be swapped.',
        'A valid match needs 3 or more equivalent values in a line.',
        'The board reshuffles when no moves remain.',
      ],
    },
  },
  crystal_core: {
    label: 'Crystal Core',
    focus: 'Fractions, decimals and percentages boss duel',
    mode: 'boss',
    rules: makeBossRules(
      'Crystal Core',
      'Stabilise the heart of Crystal Cave by proving equivalence across fractions, decimals and percentages.',
      'Wrong answers feed the unstable core, so accuracy matters more than rushing.'
    ),
  },
  prime_pop: {
    label: 'Prime Pop',
    focus: 'Prime numbers',
    rules: {
      title: 'Prime Pop',
      summary: 'Pop prime numbers and avoid composite traps.',
      bullets: [
        'Check factors before tapping.',
        'Streaks boost your score multiplier.',
        'Tricky composite numbers are designed to catch rushed answers.',
      ],
    },
  },
  angle_arena: {
    label: 'Angle Arena',
    focus: 'Angles',
    rules: {
      title: 'Angle Arena',
      summary: 'Aim for the target angle as accurately as possible.',
      bullets: [
        'Compare the target with the live angle indicator.',
        'Closer answers score more points.',
        'Tight streaks unlock the best star ratings.',
      ],
    },
  },
  polygon_palace: {
    label: 'Polygon Palace',
    focus: 'Shape properties',
    rules: {
      title: 'Polygon Palace',
      summary: 'Identify and classify shapes using their properties.',
      bullets: [
        'Look at sides, angles and symmetry.',
        'Some questions focus on families of polygons.',
        'Fast correct selections keep the palace glowing.',
      ],
    },
  },
  data_dungeon: {
    label: 'Data Dungeon',
    focus: 'Tables, sets and summary statistics',
    rules: {
      title: 'Data Dungeon',
      summary: 'Read number sets, tables and summary clues to unlock each chamber.',
      bullets: [
        'Use the data table or values shown on screen.',
        'Questions may ask for mean, median, mode or range.',
        'Clear rooms quickly to hit the target score.',
      ],
    },
  },
  monster_market: {
    label: 'Monster Market',
    focus: 'Money and decimals',
    rules: {
      title: 'Monster Market',
      summary: 'Give the exact change for each customer order.',
      bullets: [
        'Read the item price and amount paid.',
        'Build the exact change in the tray.',
        'Mistakes cost points, so check before submitting.',
      ],
    },
  },
  tower_of_factors: {
    label: 'Factor Forge',
    focus: 'Factors, multiples and factor fluency',
    mode: 'boss',
    rules: makeBossRules(
      'Factor Forge',
      'Smash the correct factor enemies in the forge before they overrun your line.',
      'Wrong hits cost hearts, so speed matters only when your factor fluency is solid.'
    ),
  },
  measurement_forge: {
    label: 'Measurement Forge',
    focus: 'Metric conversions',
    rules: {
      title: 'Measurement Forge',
      summary: 'Convert the measure exactly to forge the right item.',
      bullets: [
        'Watch the unit in the question carefully.',
        'Use metric conversion facts accurately.',
        'Quick exact answers score the best rewards.',
      ],
    },
  },
  timekeeper_temple: {
    label: 'Timekeeper Temple',
    focus: 'Time and timetables',
    rules: {
      title: 'Timekeeper Temple',
      summary: 'Solve time and timetable problems before the clock runs down.',
      bullets: [
        'Read times carefully in 12-hour and 24-hour form.',
        'Work out durations, intervals or start and end times.',
        'Temple rounds get harder as the clock speeds up.',
      ],
    },
  },
  ratio_rapids: {
    label: 'Ratio Rapids',
    focus: 'Ratio and proportion',
    rules: {
      title: 'Ratio Rapids',
      summary: 'Use the given ratio to complete each river challenge.',
      bullets: [
        'Match parts to wholes or scale quantities up and down.',
        'Simplify where needed before choosing.',
        'Accurate scaling keeps your raft moving.',
      ],
    },
  },
  place_value_peaks: {
    label: 'Place Value Peaks',
    focus: 'Place value and rounding',
    rules: {
      title: 'Place Value Peaks',
      summary: 'Choose the number, order or rounding answer that best fits the climb.',
      bullets: [
        'Compare numbers up to millions and beyond.',
        'Look carefully at digit value, ordering and rounding clues.',
        'Keep your climb clean to build streak bonuses.',
      ],
    },
  },
  calculation_clash: {
    label: 'Calculation Clash',
    focus: 'Four operations and multi-step arithmetic',
    rules: {
      title: 'Calculation Clash',
      summary: 'Solve each arithmetic challenge before the next wave arrives.',
      bullets: [
        'Use addition, subtraction, multiplication and division accurately.',
        'Some rounds include brackets and multi-step reasoning.',
        'Fast precise answers power your combo meter.',
      ],
    },
  },
  percent_pulse: {
    label: 'Percent Pulse',
    focus: 'Fractions, decimals and percentages',
    rules: {
      title: 'Percent Pulse',
      summary: 'Convert between percentages, fractions and decimals in a rhythm-like equivalence run.',
      bullets: [
        'Switch between % symbols, decimals and fractions confidently.',
        'Some rounds ask for a percentage of a quantity.',
        'Rhythm-like streaks increase your score gain.',
      ],
    },
  },
  coordinate_quest: {
    label: 'Coordinate Quest',
    focus: 'Coordinates and plotting',
    rules: {
      title: 'Coordinate Quest',
      summary: 'Guide the scout across the quest grid and lock in the right coordinates.',
      bullets: [
        'Start from the centre and read x first, then y.',
        'Use the beacon marker and route line to track the target point.',
        'Plot carefully because near-misses still count as wrong.',
      ],
    },
  },
  transform_temple: {
    label: 'Transform Temple',
    focus: 'Transformations and movement rules',
    rules: {
      title: 'Transform Temple',
      summary: 'Track how a shape moves across the temple grid using translation and reflection clues.',
      bullets: [
        'Follow translation and reflection clues closely.',
        'Track how each vertex changes position.',
        'Correct movement rules unlock the next gate.',
      ],
    },
  },
  mirror_gate: {
    label: 'Mirror Gate',
    focus: 'Geometry boss duel',
    mode: 'boss',
    rules: makeBossRules(
      'Mirror Gate',
      'Survive the ruins guardian by mastering transformations, shape properties and coordinate thinking.',
      'Mirror errors give the warden control of the gate, so read each move carefully.'
    ),
  },
  scale_safari: {
    label: 'Scale Safari',
    focus: 'Scale factors, conversions and proportional thinking',
    rules: {
      title: 'Scale Safari',
      summary: 'Resize, convert or scale quantities to match the safari target.',
      bullets: [
        'Use scale factors and conversion facts together.',
        'Recipe and map-style questions appear in later rounds.',
        'Efficient scaling gives bigger score bonuses.',
      ],
    },
  },
  scales_of_the_sun: {
    label: 'Scales Of The Sun',
    focus: 'Measure and proportion boss duel',
    mode: 'boss',
    rules: makeBossRules(
      'Scales Of The Sun',
      'Balance the desert trial by scaling recipes, converting measures and holding every ratio steady.',
      'The sun scales punish rushed estimates, so measure with precision.'
    ),
  },
  chart_chase: {
    label: 'Chart Chase',
    focus: 'Graphs and chart interpretation',
    rules: {
      title: 'Chart Chase',
      summary: 'Read the graph fast and answer before the trail goes cold.',
      bullets: [
        'Use the bars, lines or pie sections shown on screen.',
        'Compare values, totals and differences accurately.',
        'Fast reads keep the chase multiplier high.',
      ],
    },
  },
  observatory_overload: {
    label: 'Observatory Overload',
    focus: 'Statistics and data boss duel',
    mode: 'boss',
    rules: makeBossRules(
      'Observatory Overload',
      'Calm the Starlight City observatory by mastering graphs, averages and high-pressure data reads.',
      'Bad reads scramble the signals, so slow down and interpret the evidence carefully.'
    ),
  },
  mean_machine: {
    label: 'Mean Machine',
    focus: 'Mean and averages',
    rules: {
      title: 'Mean Machine',
      summary: 'Balance the machine by finding the correct mean or missing value.',
      bullets: [
        'Add the full data set before dividing carefully.',
        'Some rounds ask for the missing number needed to make a target mean.',
        'Steady accuracy powers the machine faster.',
      ],
    },
  },
  equation_grove: {
    label: 'Equation Grove',
    focus: 'Simple algebra',
    rules: {
      title: 'Equation Grove',
      summary: 'Solve the missing value or formula clue to grow the grove.',
      bullets: [
        'Treat the symbol as an unknown number.',
        'Check both sides of the equation balance.',
        'Later rounds use simple formula rules and function machines.',
      ],
    },
  },
  rule_runner: {
    label: 'Rule Runner',
    focus: 'Input-output rules and function patterns',
    rules: {
      title: 'Rule Runner',
      summary: 'Decode the rule machine or sequence gate and choose the correct result.',
      bullets: [
        'Some rounds use input-output rules instead of raw next-term sequences.',
        'Work out the rule before you race for the answer.',
        'Fast accurate rule reading keeps the run alive.',
      ],
    },
  },
};

export const getGameLabel = (gameType?: MiniGameType | null) => (
  gameType ? GAME_META[gameType]?.label || gameType.replace(/_/g, ' ') : ''
);
