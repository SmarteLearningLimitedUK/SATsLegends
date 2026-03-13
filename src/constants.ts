import { AvatarData, IslandData, ShopItem, DailyQuest, MathFamily, CloudCollapseLevelConfig, PotionPourLevelConfig, Achievement } from "./types";
import { CHARACTER_AVATARS } from './assets/characters';
import world01Map from './assets/maps/world_01.png';
import world02Map from './assets/maps/world_02.png';
import world03Map from './assets/maps/world_03.png';
import world04Map from './assets/maps/world_04.png';
import world05Map from './assets/maps/world_05.png';
import world06Map from './assets/maps/world_06.png';

export const ACHIEVEMENTS: Achievement[] = [
  { id: 'first_win', title: 'First Victory', description: 'Complete your first level', icon: '🏆', type: 'levels', target: 1 },
  { id: 'star_collector', title: 'Star Collector', description: 'Earn 10 total stars', icon: '⭐', type: 'stars', target: 10 },
  { id: 'rich', title: 'Money Maker', description: 'Accumulate 1000 coins', icon: '💰', type: 'coins', target: 1000 },
  { id: 'streak_3', title: 'Dedicated Scholar', description: 'Reach a 3-day login streak', icon: '🔥', type: 'streak', target: 3 },
  { id: 'math_master', title: 'Math Master', description: 'Complete 10 levels', icon: '🧠', type: 'levels', target: 10 },
  { id: 'star_champion', title: 'Star Champion', description: 'Earn 50 total stars', icon: '🌟', type: 'stars', target: 50 },
  { id: 'streak_7', title: 'Unstoppable', description: 'Reach a 7-day login streak', icon: '⚡', type: 'streak', target: 7 },
  { id: 'gem_hoarder', title: 'Gem Hoarder', description: 'Accumulate 100 gems', icon: '💎', type: 'coins', target: 100 },
];

export const DAILY_REWARDS = [
  { day: 1, reward: { type: 'coins', amount: 100 }, icon: '💰' },
  { day: 2, reward: { type: 'coins', amount: 200 }, icon: '💰' },
  { day: 3, reward: { type: 'gems', amount: 5 }, icon: '💎' },
  { day: 4, reward: { type: 'coins', amount: 500 }, icon: '💰' },
  { day: 5, reward: { type: 'gems', amount: 10 }, icon: '💎' },
  { day: 6, reward: { type: 'coins', amount: 1000 }, icon: '💰' },
  { day: 7, reward: { type: 'gems', amount: 25 }, icon: '🎁' },
];

export const INITIAL_DAILY_QUESTS: DailyQuest[] = [
  { id: 'q1', description: 'Complete 2 levels', target: 2, current: 0, reward: { type: 'coins', amount: 150 }, isClaimed: false },
  { id: 'q2', description: 'Earn 3 stars in a level', target: 1, current: 0, reward: { type: 'xp', amount: 50 }, isClaimed: false },
  { id: 'q3', description: 'Visit the shop', target: 1, current: 0, reward: { type: 'gems', amount: 2 }, isClaimed: false },
];
export const AVATARS: AvatarData[] = CHARACTER_AVATARS;

export const ISLANDS: IslandData[] = [
  {
    id: 1,
    name: 'Number & Arithmetic',
    category: 'Maths',
    isLocked: false,
    color: 'bg-[#7ED321]',
    themeName: 'Lush Grove',
    bgGradient: 'from-sky-300 to-sky-100',
    groundColor: 'bg-green-500',
    mapImage: world01Map,
    decorations: [],
    levels: [
      { id: 1, stars: 3, isLocked: false, gameType: 'place_value_peaks' },
      { id: 2, stars: 2, isLocked: false, gameType: 'calculation_clash' },
      { id: 3, stars: 0, isLocked: false, gameType: 'monster_market' },
      { id: 4, stars: 0, isLocked: false, gameType: 'prime_pop' },
      { id: 5, stars: 0, isLocked: false, isBoss: true, gameType: 'tower_of_factors' },
    ]
  },
  {
    id: 2,
    name: 'Fractions, Decimals & %',
    category: 'Maths',
    isLocked: false,
    color: 'bg-[#4B9EFF]',
    themeName: 'Crystal Cave',
    bgGradient: 'from-indigo-900 to-purple-800',
    groundColor: 'bg-fuchsia-900',
    mapImage: world02Map,
    decorations: [],
    levels: [
      { id: 1, stars: 0, isLocked: false, gameType: 'burger_builder' },
      { id: 2, stars: 0, isLocked: false, gameType: 'percent_pulse' },
      { id: 3, stars: 0, isLocked: false, gameType: 'fraction_match' },
      { id: 4, stars: 0, isLocked: false, gameType: 'cloud_collapse' },
      { id: 5, stars: 0, isLocked: false, isBoss: true, gameType: 'fraction_match' },
    ]
  },
  {
    id: 3,
    name: 'Geometry & Measure',
    category: 'Maths',
    isLocked: false,
    color: 'bg-[#B04BFF]',
    themeName: 'Marble Ruins',
    bgGradient: 'from-orange-200 to-rose-200',
    groundColor: 'bg-stone-400',
    mapImage: world03Map,
    decorations: [],
    levels: [
      { id: 1, stars: 0, isLocked: false, gameType: 'angle_arena' },
      { id: 2, stars: 0, isLocked: false, gameType: 'polygon_palace' },
      { id: 3, stars: 0, isLocked: false, gameType: 'coordinate_quest' },
      { id: 4, stars: 0, isLocked: false, gameType: 'transform_temple' },
      { id: 5, stars: 0, isLocked: false, isBoss: true, gameType: 'transform_temple' },
    ]
  },
  {
    id: 4,
    name: 'Ratio & Proportion',
    category: 'Maths',
    isLocked: false,
    color: 'bg-[#FFD700]',
    themeName: 'Desert Oasis',
    bgGradient: 'from-yellow-200 to-orange-300',
    groundColor: 'bg-yellow-600',
    mapImage: world04Map,
    decorations: [],
    levels: [
      { id: 1, stars: 0, isLocked: false, gameType: 'measurement_forge' },
      { id: 2, stars: 0, isLocked: false, gameType: 'potion_pour' },
      { id: 3, stars: 0, isLocked: false, gameType: 'ratio_rapids' },
      { id: 4, stars: 0, isLocked: false, gameType: 'scale_safari' },
      { id: 5, stars: 0, isLocked: false, isBoss: true, gameType: 'scale_safari' },
    ]
  },
  {
    id: 5,
    name: 'Statistics & Time',
    category: 'Maths',
    isLocked: false,
    color: 'bg-[#FF4B4B]',
    themeName: 'Starlight City',
    bgGradient: 'from-slate-900 to-blue-900',
    groundColor: 'bg-slate-800',
    mapImage: world05Map,
    decorations: [],
    levels: [
      { id: 1, stars: 0, isLocked: false, gameType: 'data_dungeon' },
      { id: 2, stars: 0, isLocked: false, gameType: 'timekeeper_temple' },
      { id: 3, stars: 0, isLocked: false, gameType: 'chart_chase' },
      { id: 4, stars: 0, isLocked: false, gameType: 'mean_machine' },
      { id: 5, stars: 0, isLocked: false, isBoss: true, gameType: 'chart_chase' },
    ]
  },
  {
    id: 6,
    name: 'Reasoning & Algebra',
    category: 'Logic',
    isLocked: false,
    color: 'bg-[#FF8C00]',
    themeName: 'Magic Forest',
    bgGradient: 'from-emerald-800 to-teal-900',
    groundColor: 'bg-emerald-950',
    mapImage: world06Map,
    decorations: [],
    levels: [
      { id: 1, stars: 0, isLocked: false, gameType: 'equation_grove' },
      { id: 2, stars: 0, isLocked: false, gameType: 'rule_runner' },
      { id: 3, stars: 0, isLocked: false, gameType: 'sequence_sprint' },
      { id: 4, stars: 0, isLocked: false, gameType: 'logic_sort' },
      { id: 5, stars: 0, isLocked: false, isBoss: true, gameType: 'matrix_match' },
    ]
  },
];

export const SHOP_ITEMS: ShopItem[] = [
  { id: 'hat_1', name: 'Wizard Hat', type: 'hat', price: 100, currency: 'coins', isLocked: false },
  { id: 'costume_1', name: 'Hero Cape', type: 'costume', price: 50, currency: 'gems', isLocked: false },
  { id: 'acc_1', name: 'Magic Wand', type: 'accessory', price: 250, currency: 'coins', isLocked: true, levelRequired: 5 },
  { id: 'effect_1', name: 'Sparkle Trail', type: 'effect', price: 100, currency: 'gems', isLocked: true, levelRequired: 10 },
];

// Sats Mastery Specific Constants
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
