import { AvatarData, IslandData, LevelData, ShopItem, DailyQuest, MathFamily, CloudCollapseLevelConfig, PotionPourLevelConfig, Achievement } from "./types";
import { CHARACTER_AVATARS } from './assets/characters';
import world01Map from './assets/maps/forect.jpg';
import world02Map from './assets/maps/reef2.jpg';
import world03Map from './assets/maps/castle.jpg';
import world04Map from './assets/maps/harbour.jpg';
import world05Map from './assets/maps/desert.jpg';
import world06Map from './assets/maps/volcano2.jpg';
import { NUMBER_BASE_CAMP_LEVELS } from './systems/content/island1NumberBaseCamp';

const mergeIslandLevels = (...groups: LevelData[][]): LevelData[] => (
  groups
    .flat()
    .map((level, index) => ({
      ...level,
      id: index + 1,
    }))
);

const pickLevelsByBlueprint = (levels: LevelData[], blueprintKeys: string[]): LevelData[] => (
  levels
    .filter((level) => !!level.blueprintKey && blueprintKeys.includes(level.blueprintKey))
    .map((level) => ({ ...level }))
);

export const ACHIEVEMENTS: Achievement[] = [
  { id: 'first_win', title: 'First Victory', description: 'Complete your first level', icon: '\u{1F3C6}', type: 'levels', target: 1 },
  { id: 'star_collector', title: 'Star Collector', description: 'Earn 10 total stars', icon: '\u2B50', type: 'stars', target: 10 },
  { id: 'rich', title: 'Money Maker', description: 'Accumulate 1000 coins', icon: '\u{1F4B0}', type: 'coins', target: 1000 },
  { id: 'streak_3', title: 'Dedicated Scholar', description: 'Reach a 3-day login streak', icon: '\u{1F525}', type: 'streak', target: 3 },
  { id: 'math_master', title: 'Math Master', description: 'Complete 10 levels', icon: '\u{1F9E0}', type: 'levels', target: 10 },
  { id: 'star_champion', title: 'Star Champion', description: 'Earn 50 total stars', icon: '\u{1F31F}', type: 'stars', target: 50 },
  { id: 'streak_7', title: 'Unstoppable', description: 'Reach a 7-day login streak', icon: '\u26A1', type: 'streak', target: 7 },
  { id: 'gem_hoarder', title: 'Gem Hoarder', description: 'Accumulate 100 gems', icon: '\u{1F48E}', type: 'coins', target: 100 },
];

export const DAILY_REWARDS = [
  { day: 1, reward: { type: 'coins', amount: 100 }, icon: '\u{1F4B0}' },
  { day: 2, reward: { type: 'coins', amount: 200 }, icon: '\u{1F4B0}' },
  { day: 3, reward: { type: 'gems', amount: 5 }, icon: '\u{1F48E}' },
  { day: 4, reward: { type: 'coins', amount: 500 }, icon: '\u{1F4B0}' },
  { day: 5, reward: { type: 'gems', amount: 10 }, icon: '\u{1F48E}' },
  { day: 6, reward: { type: 'coins', amount: 1000 }, icon: '\u{1F4B0}' },
  { day: 7, reward: { type: 'gems', amount: 25 }, icon: '\u{1F381}' },
];

export const INITIAL_DAILY_QUESTS: DailyQuest[] = [
  { id: 'q1', description: 'Complete 2 levels', target: 2, current: 0, reward: { type: 'coins', amount: 150 }, isClaimed: false },
  { id: 'q2', description: 'Earn 3 stars in a level', target: 1, current: 0, reward: { type: 'xp', amount: 50 }, isClaimed: false },
  { id: 'q3', description: 'Visit the shop', target: 1, current: 0, reward: { type: 'gems', amount: 2 }, isClaimed: false },
];
export const AVATARS: AvatarData[] = CHARACTER_AVATARS;

const FRACTION_FOREST_LEVELS: LevelData[] = [
  { id: 1, stars: 0, isLocked: false, blueprintKey: 'take_out_rush', displayName: 'Take-Out Rush', gameType: 'take_out_rush' },
  { id: 2, stars: 0, isLocked: false, blueprintKey: 'fraction_forge', displayName: 'Fraction Forge', gameType: 'take_out_rush' },
  { id: 3, stars: 0, isLocked: false, blueprintKey: 'match3_equivalence', displayName: 'Match-3 Equivalence', gameType: 'fraction_match' },
  { id: 4, stars: 0, isLocked: false, blueprintKey: 'fraction_flow', displayName: 'Fraction Flow', gameType: 'cloud_collapse' },
  { id: 5, stars: 0, isLocked: false, blueprintKey: 'fraction_of_amount', displayName: 'Fraction of Amount', gameType: 'percent_pulse' },
  { id: 6, stars: 0, isLocked: false, blueprintKey: 'percent_power', displayName: 'Percent Power', gameType: 'percent_power' },
  { id: 7, stars: 0, isLocked: false, blueprintKey: 'simplify_sprint', displayName: 'Simplify Sprint', gameType: 'fraction_match' },
];

const RATIO_RAPIDS_LEVELS: LevelData[] = [
  { id: 1, stars: 0, isLocked: false, blueprintKey: 'potion_panic', displayName: 'Potion Panic', gameType: 'potion_pour' },
  { id: 2, stars: 0, isLocked: false, blueprintKey: 'potion_panic', displayName: 'Potion Panic', gameType: 'potion_pour' },
  { id: 3, stars: 0, isLocked: false, blueprintKey: 'share_splitter', displayName: 'Share Splitter', gameType: 'ratio_rapids' },
  { id: 4, stars: 0, isLocked: false, blueprintKey: 'ratio_fractions', displayName: 'Ratio Fractions', gameType: 'ratio_fractions' },
  { id: 5, stars: 0, isLocked: false, blueprintKey: 'scale_builder', displayName: 'Scale Builder', gameType: 'scale_safari' },
];

export const ISLANDS: IslandData[] = [
  {
    id: 1,
    name: 'Arithmetic Acropolis',
    category: 'Number',
    isLocked: false,
    color: 'bg-[#7ED321]',
    themeName: 'Arithmetic Acropolis',
    bgGradient: 'from-sky-300 to-sky-100',
    groundColor: 'bg-green-500',
    mapImage: world01Map,
    decorations: [],
    levels: mergeIslandLevels(
      pickLevelsByBlueprint(NUMBER_BASE_CAMP_LEVELS, [
        'place_value_panic',
        'number_line_ninja',
        'prime_pop',
        'rounding_rampage',
      ]),
      [
        { id: 1, stars: 0, isLocked: false, blueprintKey: 'maths_vs_zombies', displayName: 'Maths vs Zombies', gameType: 'ratio_rapids' },
      ],
    ),
  },
  {
    id: 2,
    name: 'Fraction Forest',
    category: 'Fractions',
    isLocked: false,
    color: 'bg-[#4B9EFF]',
    themeName: 'Fraction Forest',
    bgGradient: 'from-emerald-700 to-cyan-700',
    groundColor: 'bg-emerald-900',
    mapImage: world01Map,
    decorations: [],
    levels: mergeIslandLevels(FRACTION_FOREST_LEVELS),
  },
  {
    id: 3,
    name: 'Geometry Glacier',
    category: 'Geometry & Measure',
    isLocked: false,
    color: 'bg-[#8AD7FF]',
    themeName: 'Glacier',
    bgGradient: 'from-sky-200 to-cyan-100',
    groundColor: 'bg-cyan-700',
    mapImage: world02Map,
    decorations: [],
    levels: mergeIslandLevels(
      [
        { id: 1, stars: 0, isLocked: false, blueprintKey: 'angle_arena', displayName: 'Angle Arena', gameType: 'angle_arena' },
        { id: 2, stars: 0, isLocked: false, blueprintKey: 'polygon_palace', displayName: 'Polygon Palace', gameType: 'polygon_palace' },
        { id: 3, stars: 0, isLocked: false, blueprintKey: 'area_architect', displayName: 'Area Architect', gameType: 'area_architect' },
        { id: 3, stars: 0, isLocked: false, blueprintKey: 'rotation_relay', displayName: 'Rotation Station', gameType: 'shape_shift' },
        { id: 4, stars: 0, isLocked: false, blueprintKey: 'coordinates_quest', displayName: 'Coordinates Quest', gameType: 'coordinate_quest' },
      ],
      [
        { id: 1, stars: 0, isLocked: false, blueprintKey: 'time_keeper_cove', displayName: 'Chrono Dash: Time Trial', gameType: 'timekeeper_temple' },
        { id: 2, stars: 0, isLocked: false, blueprintKey: 'conversion_canyon', displayName: 'Conversion Canyon', gameType: 'measurement_forge' },
        { id: 3, stars: 0, isLocked: false, blueprintKey: 'perimeter_path', displayName: 'Perimeter Path', gameType: 'measurement_forge' },
      ],
    ),
  },
  {
    id: 4,
    name: 'Data Desert',
    category: 'Data',
    isLocked: false,
    color: 'bg-[#FFB14B]',
    themeName: 'Desert',
    bgGradient: 'from-amber-200 to-orange-300',
    groundColor: 'bg-amber-700',
    mapImage: world05Map,
    decorations: [],
    levels: mergeIslandLevels(
      pickLevelsByBlueprint(NUMBER_BASE_CAMP_LEVELS, [
        'chart_challenge',
        'mean_machine',
        'mode_miner',
      ]),
      [
        { id: 1, stars: 0, isLocked: false, blueprintKey: 'data_dash', displayName: 'Data Dash', gameType: 'data_dungeon' },
        { id: 2, stars: 0, isLocked: false, blueprintKey: 'graph_grabber', displayName: 'Graph Grabber', gameType: 'chart_chase' },
        { id: 3, stars: 0, isLocked: false, blueprintKey: 'line_graph_lab', displayName: 'Line Graph Lab', gameType: 'chart_chase' },
        { id: 4, stars: 0, isLocked: false, blueprintKey: 'data_detective', displayName: 'Data Detective', gameType: 'data_dungeon' },
        { id: 5, stars: 0, isLocked: false, blueprintKey: 'whodunnit_data', displayName: 'Whodunnit Data', gameType: 'data_dungeon' },
      ],
    ),
  },
  {
    id: 5,
    name: 'Operations Outpost',
    category: 'Arithmetic',
    isLocked: false,
    color: 'bg-[#B04BFF]',
    themeName: 'Outpost',
    bgGradient: 'from-orange-200 to-rose-200',
    groundColor: 'bg-stone-400',
    mapImage: world03Map,
    decorations: [],
    levels: mergeIslandLevels(
      pickLevelsByBlueprint(NUMBER_BASE_CAMP_LEVELS, [
        'calculation_clash',
        'factor_frenzy',
      ]),
      [
        { id: 1, stars: 0, isLocked: false, blueprintKey: 'multiplication_mine', displayName: 'Multiplication Mine', gameType: 'calculation_clash' },
        { id: 2, stars: 0, isLocked: false, blueprintKey: 'division_dock', displayName: 'Division Dock', gameType: 'calculation_clash' },
        { id: 3, stars: 0, isLocked: false, blueprintKey: 'order_ops_arena', displayName: 'Order Ops Arena', gameType: 'equation_grove' },
        { id: 4, stars: 0, isLocked: false, blueprintKey: 'formula_forge', displayName: 'Formula Forge', gameType: 'formula_forge' },
        { id: 4, stars: 0, isLocked: false, blueprintKey: 'arithmetic_gauntlet', displayName: 'Arithmetic Gauntlet', gameType: 'calculation_clash' },
        { id: 5, stars: 0, isLocked: false, blueprintKey: 'remainder_run', displayName: 'Remainder Run', gameType: 'calculation_clash' },
      ],
      [
        { id: 1, stars: 0, isLocked: false, blueprintKey: 'market_mayhem', displayName: 'Market Mayhem', gameType: 'monster_market' },
      ],
    ),
  },
  {
    id: 6,
    name: 'Measurement Mountain',
    category: 'Final Test',
    isLocked: false,
    color: 'bg-[#8F76FF]',
    themeName: 'Measurement Mountain',
    bgGradient: 'from-indigo-900 to-sky-900',
    groundColor: 'bg-indigo-950',
    mapImage: world06Map,
    decorations: [],
    levels: [
      { id: 1, stars: 0, isLocked: false, blueprintKey: 'problem_pyramid', displayName: 'Problem Pyramid', gameType: 'rule_runner' },
      { id: 2, stars: 0, isLocked: false, blueprintKey: 'unit_mixer', displayName: 'Unit Mixer', gameType: 'unit_mixer' },
      { id: 2, stars: 0, isLocked: false, blueprintKey: 'mixed_mastery', displayName: 'Mixed Mastery', gameType: 'calculation_clash' },
      { id: 3, stars: 0, isLocked: false, blueprintKey: 'strategy_survival', displayName: 'Strategy Survival', gameType: 'logic_sort' },
      { id: 4, stars: 0, isLocked: false, blueprintKey: 'timed_test_trials', displayName: 'Timed Test Trials', gameType: 'calculation_clash' },
      { id: 5, stars: 0, isLocked: false, blueprintKey: 'multi_step_marathon', displayName: 'Multi-Step Marathon', gameType: 'equation_grove' },
    ],
  },
  {
    id: 7,
    name: 'Ratio Rapids',
    category: 'Ratio',
    isLocked: false,
    color: 'bg-[#2CC7D9]',
    themeName: 'Ratio Rapids',
    bgGradient: 'from-cyan-300 to-sky-200',
    groundColor: 'bg-cyan-700',
    mapImage: world04Map,
    decorations: [],
    levels: mergeIslandLevels(RATIO_RAPIDS_LEVELS),
  },
];

export const SHOP_ITEMS: ShopItem[] = [
  { id: 'hat_1', name: 'Wizard Hat', type: 'hat', price: 100, currency: 'coins', isLocked: false },
  { id: 'costume_1', name: 'Hero Cape', type: 'costume', price: 50, currency: 'gems', isLocked: false },
  { id: 'acc_1', name: 'Magic Wand', type: 'accessory', price: 250, currency: 'coins', isLocked: true, levelRequired: 5 },
  { id: 'effect_1', name: 'Sparkle Trail', type: 'effect', price: 100, currency: 'gems', isLocked: true, levelRequired: 10 },
];

// SATs Legends specific constants
export const CLOUD_COLLAPSE_LEVELS: CloudCollapseLevelConfig[] = [
  { id: 1, targetScore: 300, duration: 60, gridSize: 5, mathTypes: ['FRACTIONS'] },
  { id: 2, targetScore: 600, duration: 75, gridSize: 5, mathTypes: ['DECIMALS'] },
  { id: 3, targetScore: 1000, duration: 90, gridSize: 6, mathTypes: ['FRACTIONS', 'DECIMALS'] },
  { id: 4, targetScore: 1200, duration: 90, gridSize: 6, mathTypes: ['ADDITION', 'FRACTIONS'] },
  { id: 5, targetScore: 1500, duration: 100, gridSize: 6, mathTypes: ['DECIMALS', 'SUBTRACTION'] },
  { id: 6, targetScore: 1800, duration: 120, gridSize: 7, mathTypes: ['FRACTIONS', 'DECIMALS', 'ADDITION'] },
  { id: 7, targetScore: 2200, duration: 120, gridSize: 7, mathTypes: ['MULTIPLICATION', 'FRACTIONS'] },
  { id: 8, targetScore: 2500, duration: 150, gridSize: 8, mathTypes: ['FRACTIONS', 'DECIMALS', 'DIVISION'] },
  { id: 9, targetScore: 3000, duration: 180, gridSize: 8, mathTypes: ['ADDITION', 'SUBTRACTION', 'FRACTIONS', 'DECIMALS'] },
  { id: 10, targetScore: 5000, duration: 200, gridSize: 9, mathTypes: ['ADDITION', 'SUBTRACTION', 'MULTIPLICATION', 'DIVISION', 'FRACTIONS', 'DECIMALS'] },
];

export const POTION_POUR_LEVELS: PotionPourLevelConfig[] = [
  { id: 1, targetScore: 500, duration: 60, mathTypes: ['FRACTIONS'] },
  { id: 2, targetScore: 800, duration: 75, mathTypes: ['DECIMALS'] },
  { id: 3, targetScore: 1200, duration: 90, mathTypes: ['FRACTIONS', 'DECIMALS'] },
  { id: 4, targetScore: 1500, duration: 90, mathTypes: ['ADDITION', 'FRACTIONS'] },
  { id: 5, targetScore: 2000, duration: 100, mathTypes: ['DECIMALS', 'SUBTRACTION'] },
];

export const MATH_FAMILIES: MathFamily[] = [
  {
    id: 'half',
    targetValue: 0.5,
    expressions: [
      { display: '1/2', type: 'FRACTIONS' },
      { display: '2/4', type: 'FRACTIONS' },
      { display: '0.5', type: 'DECIMALS' },
      { display: '50%', type: 'FRACTIONS' },
      { display: '4/8', type: 'FRACTIONS' },
    ]
  },
  {
    id: 'quarter',
    targetValue: 0.25,
    expressions: [
      { display: '1/4', type: 'FRACTIONS' },
      { display: '0.25', type: 'DECIMALS' },
      { display: '25%', type: 'FRACTIONS' },
      { display: '2/8', type: 'FRACTIONS' },
    ]
  },
  {
    id: 'three-quarters',
    targetValue: 0.75,
    expressions: [
      { display: '3/4', type: 'FRACTIONS' },
      { display: '0.75', type: 'DECIMALS' },
      { display: '75%', type: 'FRACTIONS' },
      { display: '6/8', type: 'FRACTIONS' },
    ]
  },
  {
    id: 'one-fifth',
    targetValue: 0.2,
    expressions: [
      { display: '1/5', type: 'FRACTIONS' },
      { display: '0.2', type: 'DECIMALS' },
      { display: '20%', type: 'FRACTIONS' },
      { display: '2/10', type: 'FRACTIONS' },
    ]
  },
  {
    id: 'ten',
    targetValue: 10,
    expressions: [
      { display: '5+5', type: 'ADDITION' },
      { display: '12-2', type: 'SUBTRACTION' },
      { display: '2x5', type: 'MULTIPLICATION' },
      { display: '20/2', type: 'DIVISION' },
      { display: '10', type: 'ADDITION' },
    ]
  },
  {
    id: 'twelve',
    targetValue: 12,
    expressions: [
      { display: '6+6', type: 'ADDITION' },
      { display: '15-3', type: 'SUBTRACTION' },
      { display: '3x4', type: 'MULTIPLICATION' },
      { display: '24/2', type: 'DIVISION' },
      { display: '12', type: 'ADDITION' },
    ]
  },
  {
    id: 'twenty',
    targetValue: 20,
    expressions: [
      { display: '10+10', type: 'ADDITION' },
      { display: '25-5', type: 'SUBTRACTION' },
      { display: '4x5', type: 'MULTIPLICATION' },
      { display: '40/2', type: 'DIVISION' },
      { display: '20', type: 'ADDITION' },
    ]
  },
  {
    id: 'one',
    targetValue: 1,
    expressions: [
      { display: '1/1', type: 'FRACTIONS' },
      { display: '1.0', type: 'DECIMALS' },
      { display: '100%', type: 'FRACTIONS' },
      { display: '0.5+0.5', type: 'ADDITION' },
      { display: '2-1', type: 'SUBTRACTION' },
    ]
  }
];


