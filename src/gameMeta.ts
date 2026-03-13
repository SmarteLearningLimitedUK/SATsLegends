import { MiniGameType } from './types';

export interface GameRuleSet {
  title: string;
  summary: string;
  bullets: string[];
}

export interface GameMeta {
  label: string;
  focus: string;
  rules: GameRuleSet;
}

export const BOSS_BATTLE_RULES: GameRuleSet = {
  title: 'Boss Battle',
  summary: 'Face the island boss in a 10-question SATs duel built from that island topic.',
  bullets: [
    'Each correct answer damages the boss health bar.',
    'You need at least 8 correct answers out of 10 to win.',
    'Wrong answers boost the boss, so accuracy matters more than rushing.',
  ],
};

export const GAME_META: Record<MiniGameType, GameMeta> = {
  quiz: {
    label: 'Quiz',
    focus: 'Mixed maths fluency',
    rules: {
      title: 'Quiz',
      summary: 'Read the question carefully and choose the best answer.',
      bullets: [
        'Solve each prompt before time runs out.',
        'Correct answers build score and stars.',
        'Wrong answers slow your progress, so accuracy matters.',
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
  burger_bar: {
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
  cloud_collapse: {
    label: 'Cloud Collapse',
    focus: 'Fraction and decimal matching',
    rules: {
      title: 'Cloud Collapse',
      summary: 'Clear matching maths clouds to build score quickly.',
      bullets: [
        'Tap connected matching answers to clear bigger groups.',
        'Large clears give better score bonuses.',
        'Reach the target before the timer expires.',
      ],
    },
  },
  sequence_sprint: {
    label: 'Sequence Sprint',
    focus: 'Sequences and reasoning',
    rules: {
      title: 'Sequence Sprint',
      summary: 'Spot the pattern fast and choose the missing value.',
      bullets: [
        'Look for the rule linking each term.',
        'Use both increase and decrease patterns.',
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
    rules: {
      title: 'Shape Shift',
      summary: 'Transform the shape until it matches the target pattern.',
      bullets: [
        'Rotate, reflect or flip the shape as needed.',
        'Compare your build to the target before locking it in.',
        'Efficient solutions score more highly.',
      ],
    },
  },
  matrix_match: {
    label: 'Matrix Match',
    focus: 'Reasoning matrices',
    rules: {
      title: 'Matrix Match',
      summary: 'Find the missing piece that completes the logic grid.',
      bullets: [
        'Check rows and columns for matching rules.',
        'Look at colour, number, size and rotation changes.',
        'Choose carefully to avoid losing momentum.',
      ],
    },
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
    focus: 'Equivalent fractions and decimals',
    rules: {
      title: 'Crystal Match',
      summary: 'Swap tiles to make matches of equivalent values.',
      bullets: [
        'Only adjacent tiles can be swapped.',
        'A valid match needs 3 or more equivalent values in a line.',
        'The board reshuffles when no moves remain.',
      ],
    },
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
    focus: 'Data handling',
    rules: {
      title: 'Data Dungeon',
      summary: 'Read charts and number sets to unlock each door.',
      bullets: [
        'Use the graph or data table shown on screen.',
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
    label: 'Tower Of Factors',
    focus: 'Factors and multiples',
    rules: {
      title: 'Tower Of Factors',
      summary: 'Choose numbers that are true factors of the target.',
      bullets: [
        'Every correct factor builds the tower.',
        'Wrong choices knock your tower back down.',
        'Complete factor sets to move to the next round.',
      ],
    },
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
        'Work out durations, intervals or start/end times.',
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
      summary: 'Match percentages to equivalent fractions, decimals or values of amounts.',
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
      summary: 'Read the grid and choose the correct coordinate or missing point.',
      bullets: [
        'Use x first, then y.',
        'Watch for all four quadrants on tougher rounds.',
        'Plot carefully because near-misses still count as wrong.',
      ],
    },
  },
  transform_temple: {
    label: 'Transform Temple',
    focus: 'Translation and reflection',
    rules: {
      title: 'Transform Temple',
      summary: 'Work out how the shape moves across the temple grid.',
      bullets: [
        'Follow translation and reflection clues closely.',
        'Track how each vertex changes position.',
        'Correct movement rules unlock the next gate.',
      ],
    },
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
  chart_chase: {
    label: 'Chart Chase',
    focus: 'Graphs and chart interpretation',
    rules: {
      title: 'Chart Chase',
      summary: 'Read the chart quickly and answer the question before the trail goes cold.',
      bullets: [
        'Use the bars, lines or pie sections shown on screen.',
        'Compare values, totals and differences accurately.',
        'Fast reads keep the chase multiplier high.',
      ],
    },
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
    focus: 'Sequences and function rules',
    rules: {
      title: 'Rule Runner',
      summary: 'Spot the sequence rule and pick the next correct gate.',
      bullets: [
        'Find the increase, decrease or step pattern first.',
        'Some rounds use input-output rules instead of raw sequences.',
        'Keep moving by choosing the next correct value quickly.',
      ],
    },
  },
};
