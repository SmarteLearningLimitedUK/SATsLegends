
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
  | 'remainder_run'
  | 'place_value_peaks'
  | 'calculation_clash'
  | 'coordinate_quest'
  | 'transform_temple'
  | 'mirror_gate'
  | 'scale_safari'
  | 'scales_of_the_sun'
  | 'graph_grabber'
  | 'observatory_overload'
  | 'mean_machine'
  | 'equation_grove'
  | 'rule_runner'
  | 'percent_power'
  | 'area_architect'
  | 'ratio_fractions'
  | 'formula_forge'
  | 'unit_mixer'
  | 'change_counter'
  | 'reasoning_quest';

export interface LevelData {
  id: number;
  stars: number;
  isLocked: boolean;
  isPractice?: boolean;
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
  backgroundLabel?: string;
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

export interface TopicStat {
  topicId: string;
  attempts: number;
  completions: number;
  accuracy: number;
  avgTimeSec: number;
  lastPlayed: number | null;
}

export interface GameStat {
  gameId: string;
  attempts: number;
  correct: number;
  incorrect: number;
  sessions: number;
  completions: number;
  accuracy: number;
  avgScore: number;
  totalTimeSec: number;
  avgTimeSec: number;
  lastPlayed: number | null;
}

export interface PlayerTelemetry {
  sessionsPlayed: number;
  totalPlayTimeSec: number;
  correctAnswers: number;
  incorrectAnswers: number;
  currentCorrectStreak: number;
  bestCorrectStreak: number;
  topicStats: Record<string, TopicStat>;
  gameStats: Record<string, GameStat>;
}

export interface PlayerAchievementState {
  earned: string[];
  progress: Record<string, number>;
  claimed: string[];
  updatedAt?: number;
}

export interface ParentReportSummary {
  favoriteGame: ParentGameSummary | null;
  leastPlayedGame: ParentGameSummary | null;
  fastestGame: ParentGameSummary | null;
  slowestGame: ParentGameSummary | null;
  overallAccuracy: number;
  averageSessionTimeSec: number;
  needsPractice: string[];
  mostPlayed: string[];
  nextFocus: string[];
  excelling: string[];
  updatedAt: number;
}

export interface ParentGameSummary {
  gameId: string;
  label: string;
  sessions: number;
  accuracy: number;
  avgTimeSec: number;
  totalTimeSec: number;
}

export interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  type: 'stars' | 'streak' | 'levels' | 'brainpower';
  target: number;
}

export interface DailyQuest {
  id: string;
  description: string;
  target: number;
  current: number;
  reward: { type: 'brainpower' | 'xp', amount: number };
  isClaimed: boolean;
}

export interface PlayerData {
  playerName: string;
  avatarId: string;
  level: number;
  xp: number;
  brainpowerTokens: number;
  unlockedIslands: number[];
  completedLevels: Record<number, number[]>; // islandId -> levelIds
  levelStars: Record<string, number>; // islandId-levelId -> best stars
  dailyQuests: DailyQuest[];
  customSpriteUrl?: string;
  achievements: string[];
  // Legacy save key (pre-Brainpower rename). Keep optional for backwards compatibility.
  calmTokens?: number;
  telemetry?: PlayerTelemetry;
  achievementState?: PlayerAchievementState;
  reportCache?: ParentReportSummary;
  stats: {
    totalStars: number;
    totalGamesPlayed: number;
    totalBrainpowerTokensEarned: number;
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
  | 'ratio_racer'
  | 'scale_builder'
  | 'share_splitter'
    | 'wellbeing_hub'
    | 'wellbeing_activity'
    | 'maths_help_hub'
    | 'level_result'
  | 'achievements_tracker'
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

export interface PotionPanicLevelConfig {
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
