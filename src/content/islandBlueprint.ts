export type MiniGameRole =
  | 'concept_visualisation'
  | 'fluency'
  | 'strategy'
  | 'pressure_timing'
  | 'application'
  | 'mixed_mastery';

export type FractionSkillTag =
  | 'FRACTION_EQUIVALENCE'
  | 'FRACTION_SIMPLIFY'
  | 'FRACTION_COMPARE'
  | 'FRACTION_ORDER'
  | 'FRACTION_ADD'
  | 'FRACTION_SUBTRACT'
  | 'FRACTION_OF_AMOUNT'
  | 'FDP_EQUIVALENCE';

export interface TierFrameworkStep {
  tier: 1 | 2 | 3 | 4 | 5;
  label: string;
  notes: string[];
}

export interface ContentWeighting {
  area: string;
  percentage: number;
}

export interface MiniGameBlueprint {
  key: string;
  name: string;
  role: MiniGameRole;
  gameplayRoles?: MiniGameRole[];
  mechanicSummary?: string;
  curriculumObjectives: string[];
  skillTags?: string[];
  keySystems?: string[];
  questionTypes: string[];
  difficultyCurve: string;
  failureState: string;
  replayValue: string;
}

export interface IslandBlueprint {
  id: number;
  name: string;
  domain: string;
  purpose: string;
  satsCoverage?: string[];
  tierFramework?: TierFrameworkStep[];
  contentDistribution?: ContentWeighting[];
  crossGameReinforcement?: string[];
  designRules?: string[];
  successCriteria?: string[];
  islandSkillTags?: string[];
  miniGames: MiniGameBlueprint[];
}

export const STANDARD_TIER_FRAMEWORK: TierFrameworkStep[] = [
  {
    tier: 1,
    label: 'Guided',
    notes: ['visual support', 'limited choices', 'no time pressure'],
  },
  {
    tier: 2,
    label: 'Basic Fluency',
    notes: ['simple numbers', 'no constraints', 'light timing'],
  },
  {
    tier: 3,
    label: 'Multi-Step',
    notes: ['combining values', 'multiple valid answers', 'more choices'],
  },
  {
    tier: 4,
    label: 'Constraint',
    notes: ['blocked options', 'forced alternatives', 'tighter timing'],
  },
  {
    tier: 5,
    label: 'Mastery',
    notes: ['SATs-level challenge', 'mixed representations', 'minimal margin for error'],
  },
];

export const ISLAND_BLUEPRINTS: IslandBlueprint[] = [
  {
    id: 1,
    name: 'Number Base Camp',
    domain: 'Number',
    purpose: 'Foundational number confidence and speed.',
    miniGames: [
      {
        key: 'place_value_panic',
        name: 'Place Value Panic',
        role: 'concept_visualisation',
        curriculumObjectives: ['place_value', 'digit_value'],
        questionTypes: ['column placement', 'value identification'],
        difficultyCurve: 'larger values, then decimals',
        failureState: 'queue overflow',
        replayValue: 'randomised digit sets',
      },
      {
        key: 'number_line_ninja',
        name: 'Number Line Ninja',
        role: 'application',
        curriculumObjectives: ['compare_order', 'negative_numbers'],
        questionTypes: ['land on value', 'interval steps'],
        difficultyCurve: 'wider ranges and tighter timing',
        failureState: 'missed targets',
        replayValue: 'dynamic range generation',
      },
      {
        key: 'prime_pop',
        name: 'Prime Pop',
        role: 'pressure_timing',
        curriculumObjectives: ['prime_numbers', 'factors_multiples'],
        questionTypes: ['prime selection', 'composite traps'],
        difficultyCurve: 'faster waves and trick values',
        failureState: 'wrong hit streak',
        replayValue: 'procedural target waves',
      },
      {
        key: 'rounding_rampage',
        name: 'Rounding Rampage',
        role: 'fluency',
        curriculumObjectives: ['rounding_10_100_1000'],
        questionTypes: ['round to target place'],
        difficultyCurve: 'mixed place values under pressure',
        failureState: 'wrong gate routing',
        replayValue: 'variable gate layouts',
      },
      {
        key: 'calculation_clash',
        name: 'Calculation Clash',
        role: 'pressure_timing',
        curriculumObjectives: ['basic_arithmetic_fluency'],
        questionTypes: ['rapid operations'],
        difficultyCurve: 'faster and multi-step rounds',
        failureState: 'timer out',
        replayValue: 'high-score chasing',
      },
      {
        key: 'factor_frenzy',
        name: 'Factor Frenzy',
        role: 'mixed_mastery',
        curriculumObjectives: ['factors', 'multiples', 'divisibility'],
        questionTypes: ['common factors', 'divisible checks'],
        difficultyCurve: 'multi-condition filtering',
        failureState: 'error threshold',
        replayValue: 'rotating rule sets',
      },
    ],
  },
  {
    id: 2,
    name: 'Fraction Lagoon',
    domain: 'Fractions and FDP',
    purpose: 'Make fractions intuitive, combinable, visual, fast, and solvable under pressure.',
    satsCoverage: [
      'equivalent fractions',
      'simplifying fractions',
      'comparing fractions',
      'ordering fractions',
      'adding fractions (same and different denominators)',
      'subtracting fractions',
      'fractions of amounts',
      'FDP equivalence',
    ],
    tierFramework: STANDARD_TIER_FRAMEWORK,
    contentDistribution: [
      { area: 'equivalence', percentage: 30 },
      { area: 'addition_subtraction', percentage: 25 },
      { area: 'comparison_ordering', percentage: 20 },
      { area: 'fractions_of_amount', percentage: 15 },
      { area: 'simplification', percentage: 10 },
    ],
    crossGameReinforcement: [
      'equivalence appears in Take-Out Rush, Match-3 Equivalence, and Fraction Flow',
      'composition appears in Take-Out Rush and Fraction Forge',
      'application appears in Fraction of Amount and transfer rounds',
    ],
    designRules: [
      'No static question-answer loops.',
      'Use drag/combine/sort/build/select under pressure.',
      'Prefer multiple solution paths in Take-Out Rush and Fraction Forge.',
      'Visual representation first; avoid symbol-only presentation.',
      'Mistakes should teach via mismatch, overflow, instability, or missed targets.',
    ],
    successCriteria: [
      'Players stop fearing fractions.',
      'Players improve speed naturally.',
      'Players recognise equivalence quickly.',
      'Players combine fractions with reduced cognitive load.',
      'Gameplay reads as puzzle-first, not worksheet-first.',
    ],
    islandSkillTags: [
      'FRACTION_EQUIVALENCE',
      'FRACTION_SIMPLIFY',
      'FRACTION_COMPARE',
      'FRACTION_ORDER',
      'FRACTION_ADD',
      'FRACTION_SUBTRACT',
      'FRACTION_OF_AMOUNT',
      'FDP_EQUIVALENCE',
    ],
    miniGames: [
      {
        key: 'take_out_rush',
        name: 'Take-Out Rush',
        role: 'concept_visualisation',
        gameplayRoles: ['concept_visualisation', 'strategy', 'pressure_timing'],
        mechanicSummary: 'Drag portion pieces into an order tray and build an exact target fraction.',
        curriculumObjectives: ['equivalent_fractions', 'fraction_addition', 'fraction_composition'],
        skillTags: ['FRACTION_EQUIVALENCE', 'FRACTION_ADD'],
        keySystems: [
          'exact match required',
          'blocked items at higher levels',
          'multiple valid solutions',
        ],
        questionTypes: ['fraction composition', 'equivalent completion'],
        difficultyCurve: 'single piece -> multi-piece -> constrained -> timed multi-order',
        failureState: 'overflow or patience timeout',
        replayValue: 'multiple valid compositions',
      },
      {
        key: 'fraction_forge',
        name: 'Fraction Forge',
        role: 'strategy',
        gameplayRoles: ['strategy', 'application'],
        mechanicSummary: 'Combine fraction pieces in a forge to craft the target value.',
        curriculumObjectives: ['fraction_addition', 'fraction_subtraction', 'common_denominators'],
        skillTags: ['FRACTION_ADD', 'FRACTION_SUBTRACT'],
        keySystems: ['construction logic', 'unstable-result penalty for incorrect combinations'],
        questionTypes: ['build target total', 'two-step fraction build'],
        difficultyCurve: 'guided -> free build -> multi-step -> timed',
        failureState: 'unstable forge result',
        replayValue: 'varied target sets',
      },
      {
        key: 'match3_equivalence',
        name: 'Match-3 Equivalence',
        role: 'fluency',
        gameplayRoles: ['fluency', 'pressure_timing'],
        mechanicSummary: 'Match equivalent fraction, decimal, and percentage values on a dynamic board.',
        curriculumObjectives: ['fdp_equivalence', 'rapid_equivalence_recognition'],
        skillTags: ['FRACTION_EQUIVALENCE', 'FDP_EQUIVALENCE'],
        keySystems: ['chain reactions', 'combo scoring'],
        questionTypes: ['equivalent set matching'],
        difficultyCurve: 'larger boards, denser values, faster cascade windows',
        failureState: 'move starvation',
        replayValue: 'board randomisation',
      },
      {
        key: 'fraction_flow',
        name: 'Fraction Flow',
        role: 'strategy',
        gameplayRoles: ['strategy', 'pressure_timing'],
        mechanicSummary: 'Sort moving values into correct order in a live flow stream.',
        curriculumObjectives: ['compare_fractions', 'order_fractions_decimals_percentages'],
        skillTags: ['FRACTION_COMPARE', 'FRACTION_ORDER', 'FDP_EQUIVALENCE'],
        keySystems: ['conveyor speed increase'],
        questionTypes: ['ascending/descending ordering'],
        difficultyCurve: 'mixed representations and increasing stream speed',
        failureState: 'misordered chain',
        replayValue: 'dynamic stream values',
      },
      {
        key: 'fraction_of_amount',
        name: 'Fraction of Amount',
        role: 'application',
        gameplayRoles: ['application', 'strategy'],
        mechanicSummary: 'Split or collect exact portions of sets to meet quantity targets.',
        curriculumObjectives: ['fractions_of_quantities', 'multiply_divide_link'],
        skillTags: ['FRACTION_OF_AMOUNT'],
        keySystems: ['limited moves', 'multi-step tasks at higher tiers'],
        questionTypes: ['portion of set', 'target quantity extraction'],
        difficultyCurve: 'larger sets and multi-step',
        failureState: 'incorrect split or move exhaustion',
        replayValue: 'varied quantity targets',
      },
      {
        key: 'simplify_sprint',
        name: 'Simplify Sprint',
        role: 'fluency',
        gameplayRoles: ['fluency', 'pressure_timing'],
        mechanicSummary: 'Reduce fractions to simplest form in rapid-fire sequences.',
        curriculumObjectives: ['simplifying_fractions', 'common_factors'],
        skillTags: ['FRACTION_SIMPLIFY'],
        keySystems: ['rapid rounds', 'streak bonuses'],
        questionTypes: ['simplify fraction', 'equivalent simplification'],
        difficultyCurve: 'faster rounds with tighter error tolerance',
        failureState: 'timer out or streak collapse',
        replayValue: 'broad fraction pool',
      },
    ],
  },
  {
    id: 3,
    name: 'Operations Outpost',
    domain: 'Arithmetic Methods',
    purpose: 'Build speed, accuracy, method confidence, and multi-step control.',
    satsCoverage: [
      'addition and subtraction (formal methods)',
      'multiplication (including long multiplication)',
      'division (including long division)',
      'order of operations (BODMAS)',
      'multi-step arithmetic problems',
      'remainders and interpretation',
    ],
    tierFramework: [
      {
        tier: 1,
        label: 'Guided',
        notes: ['single-step', 'small numbers', 'visual support'],
      },
      {
        tier: 2,
        label: 'Fluency',
        notes: ['faster pace', 'larger numbers', 'less support'],
      },
      {
        tier: 3,
        label: 'Multi-Step',
        notes: ['chained operations', 'intermediate results required'],
      },
      {
        tier: 4,
        label: 'Constraint',
        notes: ['limited time', 'distractors', 'incorrect paths punished'],
      },
      {
        tier: 5,
        label: 'Mastery',
        notes: ['SATs-level complexity', 'minimal support', 'high pressure'],
      },
    ],
    contentDistribution: [
      { area: 'multiplication_division', percentage: 30 },
      { area: 'addition_subtraction', percentage: 25 },
      { area: 'multi_step_problems', percentage: 20 },
      { area: 'order_of_operations', percentage: 15 },
      { area: 'remainder_interpretation', percentage: 10 },
    ],
    crossGameReinforcement: [
      'multiplication appears in Calculation Clash (Advanced), Multiplication Mine, and Arithmetic Gauntlet',
      'division and remainder logic appears in Division Dock and Remainder Run',
      'multi-step chaining appears in Order Ops Arena and Arithmetic Gauntlet',
    ],
    designRules: [
      'Avoid worksheet-like vertical method UI and long explanation text.',
      'Prioritise interaction, movement, and chained actions.',
      'Speed matters: streak systems, time pressure, and efficiency bonuses.',
      'Mistakes should cost flow (combo breaks, slows, delays) more than hard-fail loops.',
      'Multi-step thinking should emerge through chained decision sequences.',
    ],
    successCriteria: [
      'Players become faster without feeling repetitive drill.',
      'Players stop relying on manual counting strategies.',
      'Players apply order of operations instinctively.',
      'Players handle multi-step arithmetic fluidly under pressure.',
      'Gameplay feels intense but fair.',
    ],
    islandSkillTags: [
      'ADDITION',
      'SUBTRACTION',
      'MULTIPLICATION',
      'DIVISION',
      'LONG_MULTIPLICATION',
      'LONG_DIVISION',
      'ORDER_OF_OPERATIONS',
      'MULTI_STEP_ARITHMETIC',
      'REMAINDERS',
    ],
    miniGames: [
      {
        key: 'calculation_clash_advanced',
        name: 'Calculation Clash Advanced',
        role: 'pressure_timing',
        gameplayRoles: ['fluency', 'pressure_timing'],
        mechanicSummary: 'Solve calculations in active lanes to defeat incoming targets.',
        curriculumObjectives: ['addition', 'subtraction', 'multiplication', 'division', 'rapid_recall'],
        skillTags: ['ADDITION', 'SUBTRACTION', 'MULTIPLICATION', 'DIVISION'],
        keySystems: ['approach lanes', 'wrong answers slow player', 'streak power boosts'],
        questionTypes: ['rapid mixed arithmetic', 'lane priority calculation'],
        difficultyCurve: 'guided pace -> dense mixed waves -> high-speed lane pressure',
        failureState: 'flow collapse from repeated misses',
        replayValue: 'combo optimisation',
      },
      {
        key: 'multiplication_mine',
        name: 'Multiplication Mine',
        role: 'fluency',
        gameplayRoles: ['fluency', 'concept_visualisation'],
        mechanicSummary: 'Break mine blocks by selecting correct multiplication outcomes.',
        curriculumObjectives: ['multiplication', 'long_multiplication_progression'],
        skillTags: ['MULTIPLICATION', 'LONG_MULTIPLICATION'],
        keySystems: ['block breaking loop', 'grid-style breakdown for larger numbers'],
        questionTypes: ['times facts', 'expanded product structure'],
        difficultyCurve: 'facts -> larger factors -> structured long-multiplication forms',
        failureState: 'mine route collapse',
        replayValue: 'procedural routes',
      },
      {
        key: 'division_dock',
        name: 'Division Dock',
        role: 'application',
        gameplayRoles: ['application', 'strategy'],
        mechanicSummary: 'Load and split cargo correctly so ships can dispatch on time.',
        curriculumObjectives: ['division', 'long_division', 'remainders'],
        skillTags: ['DIVISION', 'LONG_DIVISION', 'REMAINDERS'],
        keySystems: ['cargo split validation', 'departure delays on incorrect distribution'],
        questionTypes: ['quotient grouping', 'remainder handling'],
        difficultyCurve: 'exact division -> remainder cases -> long-division style dispatches',
        failureState: 'dispatch delay buildup',
        replayValue: 'rotating cargo sets',
      },
      {
        key: 'order_ops_arena',
        name: 'Order Ops Arena',
        role: 'strategy',
        gameplayRoles: ['strategy', 'mixed_mastery'],
        mechanicSummary: 'Resolve expressions using the correct operation order through decision paths.',
        curriculumObjectives: ['order_of_operations', 'multi_step_expressions'],
        skillTags: ['ORDER_OF_OPERATIONS', 'MULTI_STEP_ARITHMETIC'],
        keySystems: ['sequence resolution', 'trap paths for common wrong order choices'],
        questionTypes: ['BODMAS sequence', 'expression traps'],
        difficultyCurve: 'simple precedence -> nested multi-step -> trap-heavy branching',
        failureState: 'sequence trap lock',
        replayValue: 'expression variations',
      },
      {
        key: 'arithmetic_gauntlet',
        name: 'Arithmetic Gauntlet',
        role: 'mixed_mastery',
        gameplayRoles: ['mixed_mastery', 'pressure_timing'],
        mechanicSummary: 'Maintain a continuous chain of calculations with no pause between prompts.',
        curriculumObjectives: ['mixed_arithmetic', 'multi_step_arithmetic'],
        skillTags: ['ADDITION', 'SUBTRACTION', 'MULTIPLICATION', 'DIVISION', 'MULTI_STEP_ARITHMETIC'],
        keySystems: ['continuous chain', 'mistakes break streak', 'speed ramps over time'],
        questionTypes: ['linked operation chains', 'carry-forward result steps'],
        difficultyCurve: 'short chains -> extended mixed chains -> high-speed endurance',
        failureState: 'streak and pace collapse',
        replayValue: 'survival scoring',
      },
      {
        key: 'remainder_run',
        name: 'Remainder Run',
        role: 'application',
        gameplayRoles: ['application', 'strategy'],
        mechanicSummary: 'Route values by quotient and remainder outcomes to the correct destination.',
        curriculumObjectives: ['remainders', 'division_interpretation'],
        skillTags: ['DIVISION', 'REMAINDERS'],
        keySystems: ['path routing by result class'],
        questionTypes: ['quotient/remainder route selection'],
        difficultyCurve: 'single-route checks -> multi-lane routing -> tight timing constraints',
        failureState: 'misroute penalties',
        replayValue: 'variable remainder goals',
      },
    ],
  },
  {
    id: 4,
    name: 'Ratio Reef',
    domain: 'Ratio and Proportion',
    purpose: 'Build strong proportional reasoning through system gameplay.',
    miniGames: [
      {
        key: 'potion_panic',
        name: 'Potion Panic',
        role: 'concept_visualisation',
        curriculumObjectives: ['ratio_language', 'proportion'],
        questionTypes: ['mix to ratio target'],
        difficultyCurve: 'faster fills with constraints',
        failureState: 'ratio mismatch',
        replayValue: 'recipe variation',
      },
      {
        key: 'ratio_recipes',
        name: 'Ratio Recipes',
        role: 'application',
        curriculumObjectives: ['scale_up_down'],
        questionTypes: ['scaled ingredients'],
        difficultyCurve: 'larger scale factors',
        failureState: 'incorrect scale conversion',
        replayValue: 'dynamic recipe cards',
      },
      {
        key: 'share_splitter',
        name: 'Share Splitter',
        role: 'strategy',
        curriculumObjectives: ['sharing_in_ratio'],
        questionTypes: ['resource allocation'],
        difficultyCurve: 'higher totals and uneven splits',
        failureState: 'allocation error',
        replayValue: 'procedural share sets',
      },
      {
        key: 'proportion_puzzle',
        name: 'Proportion Puzzle',
        role: 'mixed_mastery',
        curriculumObjectives: ['equivalent_ratio'],
        questionTypes: ['missing proportional values'],
        difficultyCurve: 'multi-step relations',
        failureState: 'logic mismatch',
        replayValue: 'generated value systems',
      },
      {
        key: 'scale_builder',
        name: 'Scale Builder',
        role: 'application',
        curriculumObjectives: ['scale_factor_reasoning'],
        questionTypes: ['resize plans'],
        difficultyCurve: 'compound scaling',
        failureState: 'incorrect dimensions',
        replayValue: 'varied build specs',
      },
      {
        key: 'ratio_rush',
        name: 'Ratio Rush',
        role: 'pressure_timing',
        curriculumObjectives: ['applied_ratio_fluency'],
        questionTypes: ['rapid ratio checks'],
        difficultyCurve: 'speed escalation',
        failureState: 'timer out',
        replayValue: 'endless challenge mode potential',
      },
    ],
  },
  {
    id: 5,
    name: 'Geometry Gorge',
    domain: 'Geometry and Position',
    purpose: 'Shape and angle fluency via movement and spatial interaction.',
    miniGames: [
      {
        key: 'angle_arena',
        name: 'Angle Arena',
        role: 'concept_visualisation',
        curriculumObjectives: ['angles'],
        questionTypes: ['target angle matching'],
        difficultyCurve: 'missing-angle integration',
        failureState: 'miss tolerance exceeded',
        replayValue: 'variable target sets',
      },
      {
        key: 'polygon_palace',
        name: 'Polygon Palace',
        role: 'fluency',
        curriculumObjectives: ['shape_properties', 'polygons'],
        questionTypes: ['classify by properties'],
        difficultyCurve: 'more subtle distinctions',
        failureState: 'classification streak break',
        replayValue: 'broad shape pools',
      },
      {
        key: 'rotation_relay',
        name: 'Rotation Relay',
        role: 'strategy',
        curriculumObjectives: ['rotation'],
        questionTypes: ['rotate to match target'],
        difficultyCurve: 'multi-turn and direction traps',
        failureState: 'misorientation',
        replayValue: 'procedural orientation targets',
      },
      {
        key: 'reflection_rescue',
        name: 'Reflection Rescue',
        role: 'application',
        curriculumObjectives: ['reflection'],
        questionTypes: ['mirror line mapping'],
        difficultyCurve: 'offset mirror lines',
        failureState: 'mirror mismatch',
        replayValue: 'dynamic grid patterns',
      },
      {
        key: 'translation_tracker',
        name: 'Translation Tracker',
        role: 'application',
        curriculumObjectives: ['translation', 'coordinates'],
        questionTypes: ['move by vector instruction'],
        difficultyCurve: 'longer movement chains',
        failureState: 'wrong final coordinate',
        replayValue: 'generated movement tasks',
      },
      {
        key: 'coordinates_quest',
        name: 'Coordinates Quest',
        role: 'mixed_mastery',
        curriculumObjectives: ['plotting_points', 'position'],
        questionTypes: ['plot/read coordinate pairs'],
        difficultyCurve: 'higher grid complexity',
        failureState: 'plotting accuracy threshold',
        replayValue: 'new coordinate maps each run',
      },
    ],
  },
  {
    id: 6,
    name: 'Measure Mountain',
    domain: 'Measurement',
    purpose: 'Practical measurement, conversion, and construction reasoning.',
    miniGames: [
      {
        key: 'time_keeper_cove',
        name: 'Time Keeper Cove',
        role: 'concept_visualisation',
        curriculumObjectives: ['time', 'elapsed_time'],
        questionTypes: ['clock setting and duration'],
        difficultyCurve: 'mixed analog/digital and intervals',
        failureState: 'dispatch delays',
        replayValue: 'rotating schedule scenarios',
      },
      {
        key: 'conversion_canyon',
        name: 'Conversion Canyon',
        role: 'fluency',
        curriculumObjectives: ['unit_conversion'],
        questionTypes: ['metric conversion'],
        difficultyCurve: 'multi-step unit jumps',
        failureState: 'conversion mismatch',
        replayValue: 'broad conversion pool',
      },
      {
        key: 'perimeter_path',
        name: 'Perimeter Path',
        role: 'application',
        curriculumObjectives: ['perimeter'],
        questionTypes: ['boundary totals'],
        difficultyCurve: 'composite shapes',
        failureState: 'incorrect length total',
        replayValue: 'generated path shapes',
      },
      {
        key: 'builder_bay',
        name: 'Builder Bay',
        role: 'concept_visualisation',
        curriculumObjectives: ['area'],
        questionTypes: ['construct to target area'],
        difficultyCurve: 'non-trivial layouts',
        failureState: 'area mismatch',
        replayValue: 'layout randomisation',
      },
      {
        key: 'volume_vault',
        name: 'Volume Vault',
        role: 'strategy',
        curriculumObjectives: ['volume'],
        questionTypes: ['cube packing'],
        difficultyCurve: 'larger cuboids with constraints',
        failureState: 'target volume miss',
        replayValue: 'variable vault dimensions',
      },
      {
        key: 'measure_mix_up',
        name: 'Measure Mix-Up',
        role: 'mixed_mastery',
        curriculumObjectives: ['measurement_reasoning'],
        questionTypes: ['mixed measure scenarios'],
        difficultyCurve: 'multi-step mixed tasks',
        failureState: 'error threshold',
        replayValue: 'mixed challenge rotations',
      },
    ],
  },
  {
    id: 7,
    name: 'Data Desert',
    domain: 'Statistics',
    purpose: 'Fast, accurate interpretation of data displays.',
    miniGames: [
      {
        key: 'data_dash',
        name: 'Data Dash',
        role: 'pressure_timing',
        curriculumObjectives: ['chart_reading'],
        questionTypes: ['pick correct lane from chart'],
        difficultyCurve: 'faster reveal windows',
        failureState: 'wrong lane streak',
        replayValue: 'generated chart values',
      },
      {
        key: 'graph_grabber',
        name: 'Graph Grabber',
        role: 'fluency',
        curriculumObjectives: ['bar_charts', 'line_graphs'],
        questionTypes: ['extract chart values'],
        difficultyCurve: 'denser charts and tighter timers',
        failureState: 'timeout',
        replayValue: 'random chart sets',
      },
      {
        key: 'table_trouble',
        name: 'Table Trouble',
        role: 'application',
        curriculumObjectives: ['table_interpretation'],
        questionTypes: ['lookup and compare'],
        difficultyCurve: 'multi-column tables',
        failureState: 'lookup errors',
        replayValue: 'procedural tables',
      },
      {
        key: 'line_graph_lab',
        name: 'Line Graph Lab',
        role: 'concept_visualisation',
        curriculumObjectives: ['line_graph_interpretation'],
        questionTypes: ['trend/value questions'],
        difficultyCurve: 'more complex trends',
        failureState: 'misread trend',
        replayValue: 'new graph patterns',
      },
      {
        key: 'chart_challenge',
        name: 'Chart Challenge',
        role: 'mixed_mastery',
        curriculumObjectives: ['multi_format_statistics'],
        questionTypes: ['identify and interpret format'],
        difficultyCurve: 'rapid format switching',
        failureState: 'accuracy drop',
        replayValue: 'mixed-format pools',
      },
      {
        key: 'data_detective',
        name: 'Data Detective',
        role: 'strategy',
        curriculumObjectives: ['data_inference'],
        questionTypes: ['comparison and inference'],
        difficultyCurve: 'multi-clue deductions',
        failureState: 'reasoning miss',
        replayValue: 'case-style puzzle sets',
      },
    ],
  },
  {
    id: 8,
    name: 'SATs Summit',
    domain: 'Mixed Reasoning',
    purpose: 'Endgame transfer across all domains under pressure.',
    miniGames: [
      {
        key: 'market_mayhem',
        name: 'Market Mayhem',
        role: 'application',
        curriculumObjectives: ['money', 'multi_step_operations'],
        questionTypes: ['shop calculation scenarios'],
        difficultyCurve: 'stacked constraints',
        failureState: 'order mismatch',
        replayValue: 'dynamic market scenarios',
      },
      {
        key: 'problem_pyramid',
        name: 'Problem Pyramid',
        role: 'strategy',
        curriculumObjectives: ['multi_step_reasoning'],
        questionTypes: ['linked-step problems'],
        difficultyCurve: 'longer chains and less scaffolding',
        failureState: 'chain break',
        replayValue: 'generated puzzle paths',
      },
      {
        key: 'mixed_mastery',
        name: 'Mixed Mastery',
        role: 'mixed_mastery',
        curriculumObjectives: ['cross_domain_recall'],
        questionTypes: ['rapid mixed rounds'],
        difficultyCurve: 'broader domain switching',
        failureState: 'accuracy threshold',
        replayValue: 'large mixed pool',
      },
      {
        key: 'strategy_survival',
        name: 'Strategy Survival',
        role: 'pressure_timing',
        curriculumObjectives: ['transfer_under_pressure'],
        questionTypes: ['mixed challenge waves'],
        difficultyCurve: 'escalating wave pressure',
        failureState: 'lives depleted',
        replayValue: 'survival scoring',
      },
      {
        key: 'timed_test_trials',
        name: 'Timed Test Trials',
        role: 'fluency',
        curriculumObjectives: ['speed_and_confidence'],
        questionTypes: ['sat-style timed sets'],
        difficultyCurve: 'tighter time budgets',
        failureState: 'time out',
        replayValue: 'new timed packs',
      },
      {
        key: 'multi_step_marathon',
        name: 'Multi-Step Marathon',
        role: 'application',
        curriculumObjectives: ['advanced_problem_solving'],
        questionTypes: ['long-form mixed reasoning'],
        difficultyCurve: 'higher complexity chains',
        failureState: 'completion failure',
        replayValue: 'scenario-driven variation',
      },
    ],
  },
];

export const getIslandBlueprintById = (id?: number | null) => (
  typeof id === 'number' ? ISLAND_BLUEPRINTS.find((island) => island.id === id) : undefined
);

export const getMiniGameBlueprintByKey = (blueprintKey?: string | null) => {
  if (!blueprintKey) return undefined;
  for (const island of ISLAND_BLUEPRINTS) {
    const game = island.miniGames.find((miniGame) => miniGame.key === blueprintKey);
    if (game) return game;
  }
  return undefined;
};

export const getBlueprintRuleSet = (blueprintKey?: string | null) => {
  const miniGame = getMiniGameBlueprintByKey(blueprintKey);
  if (!miniGame) return null;

  return {
    title: miniGame.name,
    summary: miniGame.mechanicSummary || miniGame.difficultyCurve,
    bullets: miniGame.keySystems?.length
      ? miniGame.keySystems.slice(0, 3)
      : [
          miniGame.questionTypes[0] || 'Solve the objective shown on screen.',
          miniGame.difficultyCurve,
          `Failure state: ${miniGame.failureState}.`,
        ],
  };
};
