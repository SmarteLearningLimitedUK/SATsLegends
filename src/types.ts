
export interface LevelData {
  id: number;
  stars: number;
  isLocked: boolean;
  isBoss?: boolean;
  gameType?: 'quiz' | 'potion_pour' | 'burger_bar' | 'cloud_collapse' | 'sequence_sprint' | 'logic_sort' | 'shape_shift' | 'matrix_match' | 'burger_builder' | 'fraction_match' | 'prime_pop' | 'angle_arena' | 'polygon_palace' | 'data_dungeon' | 'monster_market' | 'tower_of_factors' | 'measurement_forge' | 'timekeeper_temple' | 'ratio_rapids';
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
  stats: {
    totalStars: number;
    totalGamesPlayed: number;
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
  | 'level_result'
  | 'shop'
  | 'profile'
  | 'settings'
  | 'parent_dashboard';

// Sats Mastery Specific Types
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
