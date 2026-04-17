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
    label: 'Potion Pour Panic',
    focus: 'Magical ratio brewing under time pressure',
    rules: {
      title: 'Potion Pour Panic',
      summary: 'Brew spells by pouring potion ingredients into the cauldron in the exact ratio before the 90-second clock runs out.',
      bullets: [
        'Each recipe shows a ratio and total units for the current brew.',
        'Use plus and minus controls to pour exact amounts for each ingredient.',
        'Only exact proportions cast successfully, so avoid overfilling one side of the ratio.',
      ],
    },
  },
  cloud_collapse: {
    label: 'Crystal Match',
    focus: 'Equivalent values match-3 play',
    rules: {
      title: 'Crystal Match',
      summary: 'This lane now shares the same crystal-board match-3 gameplay as Crystal Match.',
      bullets: [
        'Swap adjacent tiles to line up 3 or more equivalent values.',
        'Fractions and decimals can match when they represent the same amount.',
        'Keep chaining clears to raise your score faster.',
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
  matrix_match: {
    label: 'SATs Paper 3',
    focus: 'Reasoning paper boss duel',
    mode: 'boss',
    rules: makeBossRules(
      'SATs Paper 3: Reasoning',
      'Enter the final reasoning paper and complete each pattern before the Oracle Slime overwhelms the forest.',
      'Look for colour, size, number and rotation rules before you commit.'
    ),
  },
  take_out_rush: {
    label: 'Take-Out Rush',
    focus: 'Fractions, equivalence and exact composition',
    rules: {
      title: 'Take-Out Rush',
      summary: 'Fill each take-out order to the exact target total before patience runs out.',
      bullets: [
        'Each portion piece has a fraction value.',
        'Match the target exactly using available pieces.',
        'Speed and accuracy both improve your result.',
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
    label: 'SATs Paper 1',
    focus: 'Arithmetic paper boss duel',
    mode: 'boss',
    rules: makeBossRules(
      'SATs Paper 1: Arithmetic',
      'Stabilise the arithmetic paper by proving calculation fluency under pressure.',
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
    label: 'Angle Siege',
    focus: 'Angles, missing angles and angle reasoning',
    rules: {
      title: 'Angle Siege',
      summary: 'Solve the angle prompt, select the correct angle, and watch the sling fire at the target.',
      bullets: [
        'Some challenges ask for a direct angle, while others hide the answer inside a geometry clue.',
        'Select the angle choice that matches the prompt to launch the sling.',
        'Later stages include missing-angle reasoning and larger numbers.',
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
    focus: 'Money, totals and exact change',
    rules: {
      title: 'Monster Market',
      summary: 'Run the fantasy stall, total each order, and hand back the exact change before the next shopper reaches the counter.',
      bullets: [
        'Some customers buy one item while later orders bundle several items together.',
        'Use the till to build the exact tray total that matches the change due.',
        'Fast accurate service builds streaks and keeps the market queue moving.',
      ],
    },
  },
  tower_of_factors: {
    label: 'Factor Forge',
    focus: 'Factors and multiples',
    rules: {
      title: 'Factor Forge',
      summary: 'Solve factor and multiple questions with clear arithmetic reasoning.',
      bullets: [
        'Check divisibility carefully before choosing an answer.',
        'Look for shared factors, multiples and exact fits.',
        'Accuracy matters more than rushing.',
      ],
    },
  },
  measurement_forge: {
    label: 'Scale Master',
    focus: 'Mass, volume and unit conversion',
    rules: {
      title: 'Scale Master',
      summary: "We're ready to advance - we're working out the weights needed for the catapaults. Select the weights to meet the target to help us balance the catapault.",
      bullets: [
        'Prompts can swap between mass and liquid capacity, so watch the unit before you load anything.',
        'Some targets are shown in kilograms or litres even when the cargo is labelled in grams or millilitres.',
        'Perfect balances score the best rewards, but overshooting the target will cost time.',
      ],
    },
  },
  timekeeper_temple: {
    label: 'Chrono Dash: Time Trial',
    focus: 'Rapid digital-to-analogue time conversion under pressure',
    rules: {
      title: 'Chrono Dash: Time Trial',
      summary: 'Race against a 60-second clock by matching analogue hands to fast-changing digital timestamps.',
      bullets: [
        'Drag or tap the clock face to move hour and minute hands quickly and accurately.',
        'Keep a streak alive to build combo multipliers and trigger bonus time extensions.',
        'Difficulty ramps from simple hour and half-hour targets to precise 5-minute intervals.',
      ],
    },
  },
  ratio_rapids: {
    label: 'Ratio Raiders',
    focus: 'Ratios, scaling and proportional defence',
    rules: {
      title: 'Ratio Raiders',
      summary: 'Deploy sword and cannon pirates in the correct ratio to stop each attack wave before it hits the island.',
      bullets: [
        'Fill every defender slot using the ratio and total defenders shown at the top.',
        'Sword pirates hold the line while cannon pirates power the island bombardment.',
        'The final boss challenge asks for a perfect 4 : 1 dragon-cannon deployment.',
      ],
    },
  },
  remainder_run: {
    label: 'Remainder Run',
    focus: 'Division and decimal remainders',
    rules: {
      title: 'Remainder Run',
      summary: 'Work through division questions and move toward decimal remainders as the lane progresses.',
      bullets: [
        'Start with whole-number division before stepping into decimal answers.',
        'Read each quotient carefully and keep your working clean.',
        'Later stages ask you to handle decimal remainders with confidence.',
      ],
    },
  },
  place_value_peaks: {
    label: 'Decimal Sniper',
    focus: 'Decimals, place value and rounding',
    rules: {
      title: 'Decimal Sniper',
      summary: 'Track the moving decimal targets and fire at the one that matches the rule.',
      bullets: [
        'Prompts can ask for the largest, smallest, closest or correctly rounded decimal.',
        'Read each decimal place carefully before you fire, especially in the later stages.',
        'Final stages may require you to hit decimals in order from smallest to largest.',
      ],
    },
  },
  calculation_clash: {
    label: 'Calculation Cup',
    focus: 'Arithmetic race under pressure',
    rules: {
      title: 'Calculation Cup',
      summary: 'Race an enemy to the finish line by solving each calculation correctly.',
      bullets: [
        'Every correct answer advances your car one stage down the track.',
        'Wrong answers give the rival racer momentum.',
        'Use fast, accurate arithmetic to win the cup before the enemy crosses first.',
      ],
    },
  },
  coordinate_quest: {
    label: 'Treasure Path',
    focus: 'Coordinates, direction and movement reasoning',
    rules: {
      title: 'Treasure Path',
      summary: 'Guide the explorer across the jungle grid by plotting the right coordinate or following the route instructions exactly.',
      bullets: [
        'Read x first, then y whenever the treasure is given as a coordinate pair.',
        'Later stages start from a marked square and ask you to follow movement clues to the final tile.',
        'Trap tiles punish rushed guesses, so think through the path before you tap.',
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
    label: 'SATs Paper 2',
    focus: 'Reasoning paper boss duel',
    mode: 'boss',
    rules: makeBossRules(
      'SATs Paper 2: Reasoning',
      'Survive the reasoning paper by mastering transformations, shape properties and coordinate thinking.',
      'Paper errors give the warden control of the gate, so read each move carefully.'
    ),
  },
  scale_safari: {
    label: 'Scale Builder',
    focus: 'Architectural scaling, proportions and dimension precision',
    rules: {
      title: 'Scale Builder',
      summary: 'Resize blueprint structures to exact scale factors and verify precision before moving to the next project phase.',
      bullets: [
        'Use slider and step controls to hit the exact target scale.',
        'Reference overlays show the original footprint for comparison.',
        'Only exact scale verification unlocks the next structure.',
      ],
    },
  },
  scales_of_the_sun: {
    label: 'Scale Master',
    focus: 'Measure and proportion',
    rules: {
      title: 'Scale Master',
      summary: 'Convert measures and scale quantities accurately.',
      bullets: [
        'Use the correct unit before you answer.',
        'Scale both sides by the same factor.',
        'Keep conversions exact and tidy.',
      ],
    },
  },
  graph_grabber: {
    label: 'Graph Grabber',
    focus: 'Bar charts, line graphs and table interpretation',
    rules: {
      title: 'Graph Grabber',
      summary: 'Four supply caravans are carrying stolen brainpower. Read the graph to track where it went.',
      bullets: [
        'Read the bar chart carefully before you choose an answer.',
        'Some questions ask for a single caravan, some ask for a comparison, and some ask for a total.',
        'The practice briefing shows the full story before the level starts.',
      ],
    },
  },
  observatory_overload: {
    label: 'Data Observatory',
    focus: 'Statistics and data reasoning',
    rules: {
      title: 'Data Observatory',
      summary: 'Interpret graphs, averages and data clues accurately.',
      bullets: [
        'Read the chart values carefully before choosing.',
        'Check totals, differences and averages step by step.',
        'Slow down when several clues are combined.',
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
        'Some questions ask for the missing number needed to make a target mean.',
        'Steady accuracy powers the machine faster.',
      ],
    },
  },
  equation_grove: {
    label: 'Order Ops Arena',
    focus: 'Missing numbers, simple algebra and inverse operations',
    rules: {
      title: 'Order Ops Arena',
      summary: 'Resolve each expression using the correct operation order to unlock the arena gate.',
      bullets: [
        'Use brackets first, then multiplication/division, then addition/subtraction.',
        'Challenges mix single and multi-step expressions with close distractor answers.',
        'Fast accurate decisions build streaks and keep the arena under control.',
      ],
    },
  },
  formula_forge: {
    label: 'Formula Forge',
    focus: 'Algebra substitution and formula use',
    rules: {
      title: 'Formula Forge',
      summary: 'Substitute values into rules and formulae, then calculate accurately.',
      bullets: [
        'Replace the letter with the given number before you solve.',
        'Use area and rule formulas exactly as written.',
        'Work backwards when the formula gives the answer first.',
      ],
    },
  },
  percent_power: {
    label: 'Percent Power',
    focus: 'Percentage of amount and reverse percentage',
    rules: {
      title: 'Percent Power',
      summary: 'Find percentages of amounts and work backwards to the whole.',
      bullets: [
        'Break percentages into simple parts like 10%, 25%, and 50%.',
        'Use the unitary method for reverse percentage questions.',
        'Check that your answer is sensible for the whole amount.',
      ],
    },
  },
  area_architect: {
    label: 'Area Architect',
    focus: 'Area and perimeter of composite shapes',
    rules: {
      title: 'Area Architect',
      summary: 'Calculate area and perimeter for compound shapes step by step.',
      bullets: [
        'Split shapes into rectangles and add their areas.',
        'Subtract cut-outs carefully when shapes have holes.',
        'Perimeter counts the outside edges only.',
      ],
    },
  },
  unit_mixer: {
    label: 'Lava Path',
    focus: 'Mixed unit conversions',
    rules: {
      title: 'Lava Path',
      summary: 'Convert between length, mass, and capacity units accurately.',
      bullets: [
        'Remember key conversions like 1 km = 1000 m.',
        'Move the decimal the correct number of places.',
        'Check units and labels before you answer.',
      ],
    },
  },
  change_counter: {
    label: 'Change Counter',
    focus: 'Money, totals, and giving change',
    rules: {
      title: 'Change Counter',
      summary: 'Work out the exact change after each purchase.',
      bullets: [
        'Subtract the cost from the amount paid.',
        'Use pounds and pence carefully.',
        'Double-check the change makes sense before you commit.',
      ],
    },
  },
  reasoning_quest: {
    label: 'Reasoning Quest',
    focus: 'Multi-step reasoning across key topics',
    rules: {
      title: 'Reasoning Quest',
      summary: 'Solve multi-step puzzles to unlock the next path.',
      bullets: [
        'Each question is a short scenario.',
        'Work through the steps before choosing an answer.',
        'Correct answers unlock the next challenge.',
      ],
    },
  },
  ratio_fractions: {
    label: 'Ratio Fractions',
    focus: 'Ratio to fraction and part-to-whole reasoning',
    rules: {
      title: 'Ratio Fractions',
      summary: 'Turn ratios into fractions of the whole.',
      bullets: [
        'Add the ratio parts to find the total.',
        'Write the fraction as part over total.',
        'Check that the fraction is less than 1.',
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
        'Some challenges use input-output rules instead of raw next-term sequences.',
        'Work out the rule before you race for the answer.',
        'Fast accurate rule reading keeps the run alive.',
      ],
    },
  },
};

export const getGameLabel = (gameType?: MiniGameType | null) => (
  gameType ? GAME_META[gameType]?.label || gameType.replace(/_/g, ' ') : ''
);
