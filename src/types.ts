
export type MiniGameType =
  | 'quiz'
  | 'potion_pour'
  | 'cloud_collapse'
  | 'logic_sort'
  | 'matrix_match'
  | 'take_out_rush'
  | 'fraction_match'
  | 'crystal_core'
  | 'prime_pop'
  | 'angle_arena'
  | 'polygon_palace'
  | 'data_dungeon'
  | 'monster_market'
  | 'tower_of_factors'
  | 'measurement_forge'
  | 'timekeeper_temple'
  | 'ratio_rapids'
  | 'place_value_peaks'
  | 'calculation_clash'
  | 'coordinate_quest'
  | 'transform_temple'
  | 'mirror_gate'
  | 'scale_safari'
  | 'scales_of_the_sun'
  | 'chart_chase'
  | 'observatory_overload'
  | 'mean_machine'
  | 'equation_grove'
  | 'rule_runner'
  | 'percent_power'
  | 'area_architect'
  | 'ratio_fractions';

export interface LevelData {
  id: number;
  stars: number;
  isLocked: boolean;
  // Stable content-planning key for curriculum and design mapping.
  blueprintKey?: string;
  // Optional display override for island-specific mini-game naming.
  displayName?: string;
  // Optional campaign lane metadata for multi-level mini-game packs.
  miniGameKey?: string;
  miniGameLevel?: number;
  difficultyTier?: 1 | 2 | 3 | 4 | 5;
  skillTags?: string[];
  isBoss?: boolean;
  bossUnlockCoins?: number;
  gameType?: MiniGameType;
}

export interface IslandData {
  id: number;
  name: string;
  category: string;
  isLocked: boolean;
  levels: LevelData[];
  color: string;
  themeName?: string;
  bgGradient?: string;
  groundColor?: string;
  mapImage?: string;
  decorations?: string[];
}

export interface AvatarData {
  id: string;
  name: string;
  image: string;
  portrait?: string;
  color: string;
  rarity: 'Common' | 'Rare' | 'Epic' | 'Legendary';
  level: number;
  imagePrompt?: string;
  sprite?: {
    row: number;
    colStart: number;
    frames: number;
  };
  poses?: Partial<Record<AnimationState, string[]>>;
}

export interface ShopItem {
  id: string;
  name: string;
  type: 'costume' | 'hat' | 'accessory' | 'effect';
  price: number;
  currency: 'coins' | 'gems';
  isLocked: boolean;
  levelRequired?: number;
}

export interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  type: 'stars' | 'streak' | 'levels' | 'coins';
  target: number;
}

export interface DailyQuest {
  id: string;
  description: string;
  target: number;
  current: number;
  reward: { type: 'coins' | 'gems' | 'xp', amount: number };
  isClaimed: boolean;
}

export interface PlayerData {
  playerName: string;
  avatarId: string;
  level: number;
  xp: number;
  coins: number;
  gems: number;
  unlockedIslands: number[];
  completedLevels: Record<number, number[]>; // islandId -> levelIds
  levelStars: Record<string, number>; // islandId-levelId -> best stars
  lastLoginDate?: string;
  dailyStreak: number;
  claimedDailyRewardToday: boolean;
  dailyQuests: DailyQuest[];
  customSpriteUrl?: string;
  achievements: string[];
  calmTokens?: number;
  stats: {
    totalStars: number;
    totalGamesPlayed: number;
    totalCoinsEarned: number;
  };
}

export type AnimationState =
  | 'idle'
  | 'walk'
  | 'jump'
  | 'attack'
  | 'hit'
  | 'victory'
  | 'sad'
  | 'special'
  | 'sitting'
  | 'waving'
  | 'casting'
  | 'sleeping'
  | 'thinking';

export type GameScreen =
  | 'splash'
  | 'profile_setup'
  | 'avatar_selection'
  | 'world_map'
  | 'island_levels'
  | 'gameplay'
  | 'wellbeing_hub'
  | 'wellbeing_activity'
  | 'level_result'
  | 'shop'
  | 'profile'
  | 'settings'
  | 'parent_dashboard';

// SATs Legends specific types
export type MathType = 'ADDITION' | 'SUBTRACTION' | 'MULTIPLICATION' | 'DIVISION' | 'FRACTIONS' | 'DECIMALS';
export type PowerUpType = 'ROW_CLEAR' | 'COLUMN_CLEAR' | 'BOMB';

export interface TileData {
  id: string;
  value: number;
  display: string;
  mathType: MathType;
  familyId: string;
  powerUp?: PowerUpType;
  isMatched: boolean;
  x: number;
  y: number;
}

export type Grid = (TileData | null)[][];

export interface CloudCollapseLevelConfig {
  id: number;
  targetScore: number;
  duration: number;
  gridSize: number;
  mathTypes: MathType[];
}

export interface PotionPourLevelConfig {
  id: number;
  targetScore: number;
  duration: number;
  mathTypes: MathType[];
}

export interface MathFamily {
  id: string;
  targetValue: number;
  expressions: { display: string; type: MathType }[];
}
