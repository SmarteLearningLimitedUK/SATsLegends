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
        key: 'rounding_rocket',
        name: 'Rounding Rocket',
        role: 'fluency',
        gameplayRoles: ['fluency', 'pressure_timing'],
        mechanicSummary: 'Use mission control to round navigation values and keep a rocket fueled through the solar system.',
        curriculumObjectives: ['rounding_10_100_1000', 'rounding_large_whole_numbers', 'rounding_decimals'],
        skillTags: ['ROUNDING', 'PLACE_VALUE', 'ESTIMATION'],
        keySystems: ['custom numeric keypad input', 'fuel and distance progression', 'instant calculation feedback'],
        questionTypes: ['nearest power-of-ten rounding', 'nearest whole and decimal-place rounding'],
        difficultyCurve: '3-digit rounding -> 6-7 digit place-value rounding -> decimal precision stages',
        failureState: 'fuel depletion from repeated incorrect calculations',
        replayValue: 'randomized targets with progressive mission scaling',
      },
      {
        key: 'factor_frenzy',
        name: 'Factor Frenzy',
        role: 'mixed_mastery',
        gameplayRoles: ['fluency', 'pressure_timing', 'mixed_mastery'],
        mechanicSummary: 'Solve neon-speed factor missions including missing, full-set, common and prime factor challenges.',
        curriculumObjectives: ['factors', 'common_factors', 'prime_factors', 'divisibility'],
        skillTags: ['FACTORS', 'MULTIPLES', 'DIVISIBILITY'],
        keySystems: ['countdown timer per challenge', 'streak multipliers', 'adaptive problem type progression'],
        questionTypes: ['missing factor equations', 'all factors selection', 'common factors selection', 'prime factors selection'],
        difficultyCurve: 'single missing factors -> complete factor sets -> common factors -> prime factor filtering under pressure',
        failureState: 'security failure after repeated incorrect attempts',
        replayValue: 'randomized number banks with escalating urgency',
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
      'equivalence appears in Take-Out Rush and Match Mastery',
      'composition appears in Take-Out Rush and Fraction Forge',
      'application appears in transfer stages and composition challenges',
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
        name: 'Match Mastery',
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
        key: 'simplify_sprint',
        name: 'Simplify Sprint',
        role: 'fluency',
        gameplayRoles: ['fluency', 'pressure_timing'],
        mechanicSummary: 'Reduce fractions to simplest form in rapid-fire sequences.',
        curriculumObjectives: ['simplifying_fractions', 'common_factors'],
        skillTags: ['FRACTION_SIMPLIFY'],
        keySystems: ['rapid stages', 'streak bonuses'],
        questionTypes: ['simplify fraction', 'equivalent simplification'],
        difficultyCurve: 'faster stages with tighter error tolerance',
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
    crossGameReinforcement: [      'division and remainder logic appears in Division Dock and Remainder Run',    ],
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
      },      {
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
    purpose: 'Build balancing, scaling, and distribution instincts through precision-driven gameplay.',
    satsCoverage: [
      'ratio notation (a:b)',
      'simplifying ratios',
      'equivalent ratios',
      'sharing in a ratio',
      'scaling up and down',
      'proportion problems',
      'implicit ratio to fraction links through play',
    ],
    tierFramework: [
      {
        tier: 1,
        label: 'Guided',
        notes: ['simple ratios (1:1, 2:1)', 'visual cues', 'no pressure'],
      },
      {
        tier: 2,
        label: 'Controlled',
        notes: ['slightly larger numbers', 'clear mapping'],
      },
      {
        tier: 3,
        label: 'Multi-Step',
        notes: ['scaling required', 'conversion between forms'],
      },
      {
        tier: 4,
        label: 'Constraint',
        notes: ['blocked resources', 'limited options', 'time pressure'],
      },
      {
        tier: 5,
        label: 'Mastery',
        notes: ['multi-part ratios (3:5:2)', 'chained reasoning', 'minimal guidance'],
      },
    ],
    contentDistribution: [
      { area: 'sharing_in_ratio', percentage: 30 },
      { area: 'scaling', percentage: 25 },
      { area: 'equivalent_ratios', percentage: 20 },
      { area: 'proportion_problems', percentage: 15 },
      { area: 'mixed_ratio_skills', percentage: 10 },
    ],
    crossGameReinforcement: [
      'scaling is reinforced across Potion Panic, Ratio Recipes, and Scale Builder',
      'sharing is reinforced across Share Splitter and Ratio Rush',
      'equivalent ratio reasoning appears in Proportion Puzzle and Ratio Rush',
    ],
    designRules: [
      'No text-first question loops.',
      'Ratio must feel physical through filling, splitting, resizing, and balancing interactions.',
      'Precision over approximation: exact outcomes only.',
      'Use hidden multi-step thinking through act-adjust-refine loops instead of calculate-then-input flow.',
    ],
    successCriteria: [
      'Players stop guessing with ratios.',
      'Players scale values instinctively.',
      'Players understand part structures without explicit explanation.',
      'Players handle ratio-sharing problems with confidence.',
      'Gameplay feels controlled and reactive rather than procedural.',
    ],
    islandSkillTags: [
      'RATIO_SIMPLIFY',
      'RATIO_SHARE',
      'RATIO_SCALE',
      'RATIO_EQUIVALENT',
      'PROPORTION',
      'RATIO_MULTI_PART',
    ],
    miniGames: [
      {
        key: 'potion_panic',
        name: 'Potion Panic',
        role: 'concept_visualisation',
        gameplayRoles: ['concept_visualisation', 'strategy', 'pressure_timing'],
        mechanicSummary: 'Drag liquid into containers and balance the mixture to exact ratio targets.',
        curriculumObjectives: ['ratio_notation', 'proportion', 'ratio_scaling'],
        skillTags: ['RATIO_SCALE', 'RATIO_EQUIVALENT', 'PROPORTION'],
        keySystems: ['precision fill controls', 'exact ratio validation', 'instability on overfill'],
        questionTypes: ['mix to ratio target', 'scale ratio mixtures'],
        difficultyCurve: 'guided balancing -> constrained balancing -> timed multi-order balancing',
        failureState: 'overfill instability or incomplete mix',
        replayValue: 'variable formulas with changing capacity constraints',
      },
      {
        key: 'ratio_recipes',
        name: 'Ratio Recipes',
        role: 'application',
        gameplayRoles: ['application', 'strategy'],
        mechanicSummary: 'Adjust ingredient quantities to match new serving sizes without breaking proportions.',
        curriculumObjectives: ['scale_up_down', 'equivalent_ratios', 'ratio_multipliers'],
        skillTags: ['RATIO_SCALE', 'RATIO_EQUIVALENT'],
        keySystems: ['ingredient scaling controls', 'target-serving remap', 'proportion lock checks'],
        questionTypes: ['scaled ingredient sets', 'serving-size transformations'],
        difficultyCurve: 'fixed multipliers -> mixed scale up/down -> constrained rapid scaling',
        failureState: 'incorrect scale conversion',
        replayValue: 'recipe card variation with rotating scale factors',
      },
      {
        key: 'share_splitter',
        name: 'Share Splitter',
        role: 'concept_visualisation',
        gameplayRoles: ['concept_visualisation', 'application', 'strategy'],
        mechanicSummary: 'Allocate items into groups based on part ratios to maintain fair distribution.',
        curriculumObjectives: ['sharing_in_ratio', 'ratio_parts', 'ratio_simplification'],
        skillTags: ['RATIO_SHARE', 'RATIO_SIMPLIFY'],
        keySystems: ['group allocation tray', 'leftover detection', 'ratio-part balancing'],
        questionTypes: ['split totals by ratio', 'fairness allocation checks'],
        difficultyCurve: 'two-group sharing -> larger totals -> multi-group constrained sharing',
        failureState: 'uneven distribution or leftover items',
        replayValue: 'procedural allocation sets with varied totals',
      },
      {
        key: 'maths_vs_zombies',
        name: 'Maths vs Zombies',
        role: 'mixed_mastery',
        gameplayRoles: ['strategy', 'pressure_timing', 'mixed_mastery'],
        mechanicSummary: 'Hold off zombie waves by deploying defenders in correct ratio and proportion combinations.',
        curriculumObjectives: ['equivalent_ratios', 'missing_value_proportion', 'ratio_reasoning', 'applied_ratio_fluency'],
        skillTags: ['RATIO_EQUIVALENT', 'PROPORTION', 'RATIO_SHARE', 'RATIO_SCALE'],
        keySystems: ['wave pressure', 'ratio slot deployment', 'streak and chain validation'],
        questionTypes: ['missing proportional values', 'ratio composition under pressure', 'equivalent chain completion'],
        difficultyCurve: 'guided waves -> mixed ratio/proportion waves -> high-pressure mastery defence',
        failureState: 'incorrect deployments break the defence line',
        replayValue: 'procedural wave and target variation',
      },
      {
        key: 'scale_builder',
        name: 'Scale Builder',
        role: 'concept_visualisation',
        gameplayRoles: ['concept_visualisation', 'application'],
        mechanicSummary: 'Resize structures to exact target scale factors with visual feedback.',
        curriculumObjectives: ['scale_factor_reasoning', 'ratio_to_structure_mapping', 'multi_part_scaling'],
        skillTags: ['RATIO_SCALE', 'RATIO_MULTI_PART'],
        keySystems: ['structure resize controls', 'target overlay comparison', 'scale factor checkpoints'],
        questionTypes: ['resize to target scale', 'match scaled blueprint'],
        difficultyCurve: 'single-step scaling -> multi-stage scaling -> constrained precision scaling',
        failureState: 'incorrect dimensions',
        replayValue: 'varied structure blueprints and scale goals',
      },
      
    ],
  },
  {
    id: 5,
    name: 'Geometry Gorge',
    domain: 'Geometry and Position',
    purpose: 'Develop position, movement, and spatial control through tactile, precise interaction.',
    satsCoverage: [
      'angles (acute, obtuse, reflex, right)',
      'measuring angles',
      'shape properties',
      'polygons',
      'coordinates',
      'reflection',
      'translation',
      'rotation',
    ],
    tierFramework: [
      {
        tier: 1,
        label: 'Guided',
        notes: ['simple shapes', 'single transformations', 'no time pressure'],
      },
      {
        tier: 2,
        label: 'Basic',
        notes: ['more shapes', 'simple angles', 'clear targets'],
      },
      {
        tier: 3,
        label: 'Multi-Step',
        notes: ['combined transformations', 'more complex shapes'],
      },
      {
        tier: 4,
        label: 'Constraint',
        notes: ['time pressure', 'obstacles', 'limited moves'],
      },
      {
        tier: 5,
        label: 'Mastery',
        notes: ['precise angles', 'multi-step transformations', 'minimal guidance'],
      },
    ],
    contentDistribution: [
      { area: 'angles', percentage: 25 },
      { area: 'transformations', percentage: 20 },
      { area: 'coordinates', percentage: 20 },
      { area: 'shape_properties', percentage: 20 },
      { area: 'mixed', percentage: 15 },
    ],
    crossGameReinforcement: [
      'transformation fluency is reinforced across Rotation Station and Coordinates Quest',
      'positioning skills are reinforced across Coordinates Quest and rotation tasks',
      'angle precision from Angle Arena supports rotational control in Rotation Station',
    ],
    designRules: [
      'No static diagrams; players must manipulate geometry directly.',
      'Movement must feel physical through smooth rotation, direct dragging, and immediate feedback.',
      'Precision matters: small errors should produce visible misses and exact alignment checks.',
      'Progress from single transformations to combined actions at higher tiers.',
    ],
    successCriteria: [
      'Players stop guessing angles.',
      'Players understand transformations instinctively.',
      'Players improve spatial awareness.',
      'Players react quickly to position tasks.',
      'Gameplay feels like control, not worksheet maths.',
    ],
    islandSkillTags: [
      'ANGLES_IDENTIFY',
      'ANGLES_MEASURE',
      'SHAPE_PROPERTIES',
      'POLYGONS',
      'ROTATION',
      'REFLECTION',
      'TRANSLATION',
      'COORDINATES',
    ],
    miniGames: [
      {
        key: 'angle_arena',
        name: 'Angle Arena',
        role: 'concept_visualisation',
        gameplayRoles: ['concept_visualisation', 'pressure_timing'],
        mechanicSummary: 'Adjust launcher angle and release to hit precision targets.',
        curriculumObjectives: ['angle_identification', 'angle_measurement', 'angle_types'],
        skillTags: ['ANGLES_IDENTIFY', 'ANGLES_MEASURE'],
        keySystems: ['angle calibration control', 'target impact validation', 'immediate trajectory feedback'],
        questionTypes: ['target angle matching', 'angle type targeting'],
        difficultyCurve: 'single-shot guided aiming -> tighter windows -> chained precision shots',
        failureState: 'target missed due to incorrect angle',
        replayValue: 'rotating target paths and angle windows',
      },
      {
        key: 'polygon_palace',
        name: 'Polygon Palace',
        role: 'fluency',
        gameplayRoles: ['fluency', 'strategy'],
        mechanicSummary: 'Sort and select shapes quickly based on visible geometric properties.',
        curriculumObjectives: ['shape_properties', 'polygon_classification', 'regular_irregular'],
        skillTags: ['SHAPE_PROPERTIES', 'POLYGONS'],
        keySystems: ['rapid sort lanes', 'property-based filters', 'classification streak system'],
        questionTypes: ['classify by sides/angles', 'regular vs irregular sorting'],
        difficultyCurve: 'clear property sets -> subtle distinctions -> high-speed mixed property sorting',
        failureState: 'incorrect classification',
        replayValue: 'broad procedural shape pools',
      },
      {
        key: 'rotation_relay',
        name: 'Rotation Station',
        role: 'strategy',
        gameplayRoles: ['strategy', 'application'],
        mechanicSummary: 'Rotate objects to exact target orientation with snappy directional controls.',
        curriculumObjectives: ['rotation', 'quarter_turns', 'half_turns'],
        skillTags: ['ROTATION'],
        keySystems: ['step rotation controls (90/180/270)', 'orientation snap checks', 'sequence relay timing'],
        questionTypes: ['rotate to match target', 'multi-step rotation sequence'],
        difficultyCurve: 'single-turn alignment -> mixed turn values -> multi-step rotation chains',
        failureState: 'incorrect orientation alignment',
        replayValue: 'procedural orientation targets and relay patterns',
      },
      {
        key: 'coordinates_quest',
        name: 'Coordinates Quest',
        role: 'concept_visualisation',
        gameplayRoles: ['concept_visualisation', 'fluency'],
        mechanicSummary: 'Plot and identify coordinates quickly on an interactive grid.',
        curriculumObjectives: ['coordinate_plotting', 'coordinate_identification', 'grid_positioning'],
        skillTags: ['COORDINATES'],
        keySystems: ['interactive point plotting', 'target coordinate reveals', 'accuracy threshold checks'],
        questionTypes: ['plot coordinate pairs', 'identify coordinate positions'],
        difficultyCurve: 'small grids -> denser grids -> timed multi-point plotting',
        failureState: 'incorrect coordinate selection',
        replayValue: 'procedural coordinate maps and target sets',
      },
    ],
  },
  {
    id: 6,
    name: 'Measure Mountain',
    domain: 'Measurement',
    purpose: 'Build practical measuring, building, and converting instincts through grounded problem-solving loops.',
    satsCoverage: [
      'telling time (analogue and digital)',
      'elapsed time',
      'unit conversions (mm/cm/m/km, g/kg, ml/l)',
      'money and change',
      'perimeter',
      'area (rectangles and compound shapes)',
      'volume (cuboids)',
      'multi-step measurement problems',
    ],
    tierFramework: [
      {
        tier: 1,
        label: 'Guided',
        notes: ['simple units', 'basic shapes', 'no pressure'],
      },
      {
        tier: 2,
        label: 'Basic',
        notes: ['straightforward conversions', 'simple time tasks'],
      },
      {
        tier: 3,
        label: 'Multi-Step',
        notes: ['elapsed time', 'compound area', 'multi-stage builds'],
      },
      {
        tier: 4,
        label: 'Constraint',
        notes: ['limited space/resources', 'tighter time', 'distractions'],
      },
      {
        tier: 5,
        label: 'Mastery',
        notes: ['complex conversions', 'multi-step reasoning', 'minimal guidance'],
      },
    ],
    contentDistribution: [
      { area: 'area_perimeter', percentage: 25 },
      { area: 'time', percentage: 20 },
      { area: 'conversion', percentage: 20 },
      { area: 'volume', percentage: 15 },
      { area: 'mixed', percentage: 20 },
    ],
    crossGameReinforcement: [
      'spatial reasoning is reinforced across Perimeter Path and Volume Vault',
      'conversion skills are reinforced across Conversion Canyon and Perimeter Path',
      'multi-step applied measurement is reinforced across Chrono Dash and Volume Vault',
    ],
    designRules: [
      'Interactions must feel real-world: building, measuring, filling, and timing.',
      'Avoid formula-first presentation; show quantity change through direct manipulation.',
      'Visual feedback is critical: area fills space, volume fills containers, perimeter traces boundaries.',
      'Multi-step reasoning should emerge naturally through action chains such as convert -> build -> verify.',
    ],
    successCriteria: [
      'Players understand area visually rather than procedurally.',
      'Players handle conversions with growing instinct and speed.',
      'Players calculate elapsed time quickly and accurately.',
      'Players solve practical measurement problems confidently.',
      'Gameplay feels grounded and practical, not worksheet-like.',
    ],
    islandSkillTags: [
      'TIME',
      'ELAPSED_TIME',
      'UNIT_CONVERSION',
      'PERIMETER',
      'AREA',
      'COMPOUND_AREA',
      'VOLUME',
      'MEASURE_MULTI_STEP',
    ],
    miniGames: [
      {
        key: 'time_keeper_cove',
        name: 'Chrono Dash: Time Trial',
        role: 'application',
        gameplayRoles: ['application', 'pressure_timing'],
        mechanicSummary: 'Convert digital timestamps into analogue clock settings in rapid-fire bursts.',
        curriculumObjectives: ['analogue_time', 'digital_time', 'elapsed_time'],
        skillTags: ['TIME', 'ELAPSED_TIME'],
        keySystems: ['interactive hand controls', 'combo-driven scoring', 'time-extension milestones'],
        questionTypes: ['digital-to-analogue conversion', 'AM/PM precision checks'],
        difficultyCurve: 'hour/half-hour targets -> 5-minute precision -> sustained high-speed streak play',
        failureState: 'incorrect clock setting breaks combo momentum',
        replayValue: 'endless randomized timestamps with escalating tempo',
      },
      {
        key: 'conversion_canyon',
        name: 'Conversion Canyon',
        role: 'fluency',
        gameplayRoles: ['fluency', 'application'],
        mechanicSummary: 'Convert units correctly to unlock routes, bridges, and system activations.',
        curriculumObjectives: ['metric_conversion', 'scale_units', 'measurement_equivalence'],
        skillTags: ['UNIT_CONVERSION'],
        keySystems: ['conversion gate checks', 'path unlocking', 'multi-unit routing'],
        questionTypes: ['mm-cm-m-km', 'g-kg', 'ml-l conversion checks'],
        difficultyCurve: 'single-step conversions -> mixed unit chains -> constrained conversion routes',
        failureState: 'incorrect conversion blocks progress',
        replayValue: 'broad conversion pools with dynamic route setups',
      },
      {
        key: 'perimeter_path',
        name: 'Perimeter Path',
        role: 'concept_visualisation',
        gameplayRoles: ['concept_visualisation', 'strategy'],
        mechanicSummary: 'Trace and construct boundaries to match exact required perimeter lengths.',
        curriculumObjectives: ['perimeter', 'boundary_measurement', 'irregular_shape_perimeter'],
        skillTags: ['PERIMETER'],
        keySystems: ['boundary tracing', 'live perimeter tally', 'irregular layout progression'],
        questionTypes: ['trace perimeter target', 'construct matching boundary'],
        difficultyCurve: 'rectangles -> irregular outlines -> constrained perimeter builds',
        failureState: 'incorrect total boundary length',
        replayValue: 'generated path layouts and length targets',
      },
      {
        key: 'volume_vault',
        name: 'Volume Vault',
        role: 'concept_visualisation',
        gameplayRoles: ['concept_visualisation', 'strategy'],
        mechanicSummary: 'Stack and pack cubes to fill vaults to exact cuboid volume targets.',
        curriculumObjectives: ['volume_cuboids', '3d_space_filling', 'capacity_reasoning'],
        skillTags: ['VOLUME'],
        keySystems: ['3D stack validation', 'capacity meters', 'overflow/underfill detection'],
        questionTypes: ['fill to target volume', 'cuboid dimension-volume matching'],
        difficultyCurve: 'small cuboids -> larger dimensions -> constrained packing challenges',
        failureState: 'underfill or overflow',
        replayValue: 'variable vault dimensions and packing constraints',
      },
    ],
  },
  {
    id: 7,
    name: 'Data Desert',
    domain: 'Statistics',
    purpose: 'Build fast, reactive, pattern-based decision making from data displays.',
    satsCoverage: [
      'reading tables',
      'bar charts',
      'line graphs',
      'comparing values',
      'finding totals and differences',
      'interpreting trends',
      'simple data reasoning',
    ],
    tierFramework: [
      {
        tier: 1,
        label: 'Guided',
        notes: ['simple charts', 'single-step questions', 'no time pressure'],
      },
      {
        tier: 2,
        label: 'Basic',
        notes: ['clear data sets', 'small comparisons'],
      },
      {
        tier: 3,
        label: 'Multi-Step',
        notes: ['totals and comparisons', 'multiple data points'],
      },
      {
        tier: 4,
        label: 'Constraint',
        notes: ['time pressure', 'distracting data', 'similar values'],
      },
      {
        tier: 5,
        label: 'Mastery',
        notes: ['dense data', 'rapid decisions', 'multi-step reasoning'],
      },
    ],
    contentDistribution: [
      { area: 'chart_reading', percentage: 30 },
      { area: 'table_reading', percentage: 25 },
      { area: 'comparison', percentage: 20 },
      { area: 'trend_interpretation', percentage: 15 },
      { area: 'reasoning', percentage: 10 },
    ],
    crossGameReinforcement: [
        'comparison is reinforced across Data Detective and Median Master',
      'extraction speed is reinforced across Graph Grabber and Table Trouble',
      'trend interpretation in Line Graph Lab supports mixed stages in Median Master',
    ],
    designRules: [
      'Speed is critical: reward quick reading and penalise hesitation.',
      'Avoid long text prompts; use short prompts and visual focus.',
      'Train scanning as the core skill: scan, compare, decide.',
      'Increase visual density over time from clean charts to crowded, similar-value datasets.',
    ],
    successCriteria: [
      'Players read graphs faster.',
      'Players reduce over-checking behavior.',
      'Players compare values more instantly.',
      'Players improve decision speed under pressure.',
      'Gameplay feels sharp and reactive.',
    ],
    islandSkillTags: [
      'DATA_TABLES',
      'DATA_BAR_CHART',
      'DATA_LINE_GRAPH',
      'DATA_COMPARE',
      'DATA_TRENDS',
      'DATA_REASONING',
    ],
    miniGames: [
      {
        key: 'graph_grabber',
        name: 'Graph Grabber',
        role: 'fluency',
        gameplayRoles: ['fluency', 'pressure_timing'],
        mechanicSummary: 'Extract exact values from graphs before they disappear.',
        curriculumObjectives: ['bar_charts', 'line_graphs', 'value_extraction'],
        skillTags: ['DATA_BAR_CHART', 'DATA_LINE_GRAPH'],
        keySystems: ['timed value reveal', 'tap-to-capture values', 'accuracy streak tracking'],
        questionTypes: ['extract chart values', 'point value identification'],
        difficultyCurve: 'single graph pulls -> mixed graph pulls -> rapid dense graph scanning',
        failureState: 'missed or incorrect value selection',
        replayValue: 'randomized graph decks',
      },
      {
        key: 'table_trouble',
        name: 'Table Trouble',
        role: 'application',
        gameplayRoles: ['application', 'strategy'],
        mechanicSummary: 'Scan multi-column tables under pressure to answer compact data prompts.',
        curriculumObjectives: ['table_interpretation', 'multi_column_reading', 'table_comparison'],
        skillTags: ['DATA_TABLES', 'DATA_COMPARE'],
        keySystems: ['table scan timer', 'target-row highlighting cues', 'misread penalties'],
        questionTypes: ['lookup value', 'row/column comparisons'],
        difficultyCurve: 'simple rows -> denser tables -> near-match distractor tables',
        failureState: 'wrong value selection',
        replayValue: 'procedural table layouts',
      },
      {
        key: 'line_graph_lab',
        name: 'Line Graph Lab',
        role: 'strategy',
        gameplayRoles: ['strategy', 'concept_visualisation'],
        mechanicSummary: 'Interpret trend direction, change, and interval values on line graphs quickly.',
        curriculumObjectives: ['line_graph_interpretation', 'trend_analysis', 'interval_reading'],
        skillTags: ['DATA_LINE_GRAPH', 'DATA_TRENDS'],
        keySystems: ['trend cue overlays', 'interval pick prompts', 'change-rate challenge stages'],
        questionTypes: ['increasing/decreasing trend', 'between-point value interpretation'],
        difficultyCurve: 'clear trends -> mixed trend shifts -> dense interval interpretation',
        failureState: 'incorrect trend interpretation',
        replayValue: 'generated trend patterns',
      },
      {
        key: 'chart_challenge',
        name: 'Median Master',
        role: 'mixed_mastery',
        gameplayRoles: ['mixed_mastery', 'pressure_timing', 'fluency'],
        mechanicSummary: 'Respond to mixed chart formats in rapid succession without breaking flow.',
        curriculumObjectives: ['multi_format_statistics', 'fast_format_switching', 'comparison_reasoning'],
        skillTags: ['DATA_BAR_CHART', 'DATA_LINE_GRAPH', 'DATA_TABLES', 'DATA_COMPARE'],
        keySystems: ['rapid format swaps', 'combo streak system', 'accuracy decay penalties'],
        questionTypes: ['identify and interpret mixed formats', 'quick comparison challenges'],
        difficultyCurve: 'single-format bursts -> mixed bursts -> high-density rapid switching',
        failureState: 'wrong answer breaks streak',
        replayValue: 'mixed-format challenge pools',
      },
      {
        key: 'data_detective',
        name: 'Data Detective',
        role: 'strategy',
        gameplayRoles: ['strategy', 'application'],
        mechanicSummary: 'Solve short reasoning prompts by comparing totals, differences, and values from displays.',
        curriculumObjectives: ['data_reasoning', 'comparison', 'totals_and_differences'],
        skillTags: ['DATA_REASONING', 'DATA_COMPARE', 'DATA_TABLES', 'DATA_BAR_CHART'],
        keySystems: ['short prompt cards', 'multi-source data references', 'reasoning accuracy checks'],
        questionTypes: ['how many more/less', 'total and difference reasoning'],
        difficultyCurve: 'single comparison clues -> multi-clue prompts -> timed chained reasoning',
        failureState: 'incorrect reasoning result',
        replayValue: 'case-style reasoning sets',
      },
      {
        key: 'whodunnit_data',
        name: 'Data Detective: Whodunnit',
        role: 'strategy',
        gameplayRoles: ['strategy', 'application', 'mixed_mastery'],
        mechanicSummary: 'Use the Data Detective case format for suspect-solving stages built from chart clues and comparisons.',
        curriculumObjectives: ['bar_chart_interpretation', 'line_graph_interpretation', 'pie_chart_reasoning', 'multi_condition_data_reasoning'],
        skillTags: ['DATA_BAR_CHART', 'DATA_LINE_GRAPH', 'DATA_REASONING', 'DATA_COMPARE'],
        keySystems: ['suspect evidence matching', 'case clue comparison', 'instant accusation feedback'],
        questionTypes: ['direct value lookup', 'most/fewest comparisons', 'multi-clue suspect identification'],
        difficultyCurve: 'single chart clues -> comparison language -> fuller detective case reasoning',
        failureState: 'wrong suspect accusation',
        replayValue: 'procedural detective cases inside the shared Data Detective flow',
      },
    ],
  },
  {
    id: 8,
    name: 'Core of Calculation',
    domain: 'Boss Papers',
    purpose: 'Run three SATs paper-style boss trials under pressure.',
    satsCoverage: [
      'SATs Paper 1 arithmetic',
      'SATs Paper 2 reasoning',
      'SATs Paper 3 reasoning',
    ],
    tierFramework: [
      {
        tier: 1,
        label: 'Guided',
        notes: ['short problems', 'minimal steps'],
      },
      {
        tier: 2,
        label: 'Basic',
        notes: ['simple multi-step', 'clear structure'],
      },
      {
        tier: 3,
        label: 'Mixed',
        notes: ['multiple domains combined'],
      },
      {
        tier: 4,
        label: 'Constraint',
        notes: ['time pressure', 'distractions', 'tighter margins'],
      },
      {
        tier: 5,
        label: 'Mastery',
        notes: ['SATs-level complexity', 'minimal support', 'high cognitive load'],
      },
    ],
    contentDistribution: [
      { area: 'paper_1_arithmetic', percentage: 34 },
      { area: 'paper_2_reasoning', percentage: 33 },
      { area: 'paper_3_reasoning', percentage: 33 },
    ],
    crossGameReinforcement: [
      'Paper 1 focuses on fast arithmetic accuracy.',
      'Paper 2 focuses on structured reasoning and method choice.',
      'Paper 3 combines mixed reasoning under pressure.',
    ],
    designRules: [
      'Each boss should read like a SATs paper trial.',
      'Keep prompts short, direct and exam-like.',
      'Pressure must be real but fair: clear goals, rising speed, no unclear traps.',
    ],
    successCriteria: [
      'Players recognise the three paper formats.',
      'Players improve speed and accuracy across all papers.',
      'Boss trials feel like exam practice, not filler.',
    ],
    islandSkillTags: [
      'ARITHMETIC',
      'REASONING',
      'MIXED_REASONING',
    ],
    miniGames: [
      {
        key: 'crystal_core',
        name: 'SATs Paper 1: Arithmetic',
        role: 'fluency',
        gameplayRoles: ['fluency', 'application'],
        mechanicSummary: 'Fast arithmetic paper trial focused on calculation accuracy and steady control.',
        curriculumObjectives: ['arithmetic_fluency', 'number_operations', 'calculation_accuracy'],
        skillTags: ['MIXED_ARITHMETIC', 'MULTI_STEP_REASONING'],
        keySystems: ['paper-style prompt flow', 'accuracy streaks', 'pressure pacing'],
        questionTypes: ['arithmetic paper questions', 'short calculation chains'],
        difficultyCurve: 'single-step arithmetic -> mixed calculation -> timed paper-style sets',
        failureState: 'paper score drops',
        replayValue: 'randomised arithmetic paper sets',
      },
      {
        key: 'mirror_gate',
        name: 'SATs Paper 2: Reasoning',
        role: 'strategy',
        gameplayRoles: ['strategy', 'mixed_mastery'],
        mechanicSummary: 'Reasoning paper trial built from transformations, shape properties and coordinate thinking.',
        curriculumObjectives: ['reasoning', 'geometry', 'transformations'],
        skillTags: ['MIXED_ARITHMETIC', 'MULTI_STEP_REASONING'],
        keySystems: ['reasoning checkpoints', 'branching decision paths', 'paper-style constraint pressure'],
        questionTypes: ['reasoning paper questions', 'geometry and movement clues'],
        difficultyCurve: 'guided reasoning -> combined clues -> high-pressure paper stages',
        failureState: 'reasoning gate lock',
        replayValue: 'variable reasoning paper sets',
      },
      {
        key: 'matrix_match',
        name: 'SATs Paper 3: Reasoning',
        role: 'mixed_mastery',
        gameplayRoles: ['mixed_mastery', 'pressure_timing'],
        mechanicSummary: 'Mixed reasoning paper trial that blends clues, patterns and data under pressure.',
        curriculumObjectives: ['mixed_reasoning', 'pattern_reasoning', 'data_reasoning'],
        skillTags: ['MULTI_STEP_REASONING', 'MIXED_ARITHMETIC'],
        keySystems: ['paper three challenge loops', 'combined clue sets', 'timed response windows'],
        questionTypes: ['mixed reasoning paper questions', 'pattern and data clues'],
        difficultyCurve: 'single clue sets -> combined reasoning -> mastery-style paper flow',
        failureState: 'paper chain break',
        replayValue: 'variable reasoning paper pools',
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

