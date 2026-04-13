import { LevelData, MiniGameType } from '../../types';

export type NumberBaseCampMiniGameKey =
  | 'place_value_panic'
  | 'number_line_ninja'
  | 'prime_pop'
  | 'rounding_rocket'
  | 'factor_frenzy'
  | 'chart_challenge'
  | 'mean_machine'
  | 'mode_miner';

export type NumberBaseCampDifficultyTier = 1 | 2 | 3 | 4 | 5;

export interface NumberBaseCampLevelMetadata {
  globalLevelId: number;
  miniGameLevel: number;
  difficultyTier: NumberBaseCampDifficultyTier;
  skillTags: string[];
}

export interface NumberBaseCampMiniGameLevel extends NumberBaseCampLevelMetadata {
  objective: string;
}

export interface NumberBaseCampMiniGamePack {
  key: NumberBaseCampMiniGameKey;
  name: string;
  gameType: MiniGameType;
  levels: NumberBaseCampMiniGameLevel[];
}

export interface PlaceValuePanicLevelConfig extends NumberBaseCampMiniGameLevel {
  queueLimit: number;
  timeLimitSec: number;
  promptsToClear: number;
  spawnIntervalMs: number;
  decoyChance: number;
  activeColumns: Array<'ones' | 'tens' | 'hundreds' | 'thousands'>;
  targetScore: number;
}

const LEVELS_PER_MINIGAME = 10;

const toTier = (miniGameLevel: number): NumberBaseCampDifficultyTier => (
  Math.min(5, Math.floor((miniGameLevel - 1) / 2) + 1) as NumberBaseCampDifficultyTier
);

const basePackDefs: Array<{
  key: NumberBaseCampMiniGameKey;
  name: string;
  gameType: MiniGameType;
  skillTags: string[];
  objectiveForLevel: (miniGameLevel: number, tier: NumberBaseCampDifficultyTier) => string;
}> = [
  {
    key: 'place_value_panic',
    name: 'Place Value Panic',
    gameType: 'place_value_peaks',
    skillTags: ['PLACE_VALUE', 'DIGIT_VALUE', 'NUMBER_COMPOSITION'],
    objectiveForLevel: (miniGameLevel, tier) => (
      tier <= 2
        ? `Sort digits into tens and ones before the queue overflows (L${miniGameLevel}).`
        : `Build target values across place columns under pressure (L${miniGameLevel}).`
    ),
  },
  {
    key: 'number_line_ninja',
    name: 'Number Line Ninja',
    gameType: 'coordinate_quest',
    skillTags: ['NUMBER_COMPARE', 'NUMBER_ORDER', 'NEGATIVE_NUMBERS'],
    objectiveForLevel: (miniGameLevel) => `Track and land on exact number-line targets (L${miniGameLevel}).`,
  },
  {
    key: 'prime_pop',
    name: 'Prime Pop',
    gameType: 'prime_pop',
    skillTags: ['PRIME_NUMBERS', 'FACTORS', 'MULTIPLES'],
    objectiveForLevel: (miniGameLevel) => `Pop prime targets and avoid composite traps (L${miniGameLevel}).`,
  },
  {
    key: 'rounding_rocket',
    name: 'Rounding Rocket',
    gameType: 'place_value_peaks',
    skillTags: ['ROUNDING', 'PLACE_VALUE', 'ESTIMATION'],
    objectiveForLevel: (miniGameLevel) => `Round mission values accurately to fuel deeper space jumps (L${miniGameLevel}).`,
  },
  {
    key: 'factor_frenzy',
    name: 'Factor Frenzy',
    gameType: 'tower_of_factors',
    skillTags: ['FACTORS', 'MULTIPLES', 'DIVISIBILITY'],
    objectiveForLevel: (miniGameLevel) => `Identify factor and multiple links under growing pressure (L${miniGameLevel}).`,
  },
  {
    key: 'chart_challenge',
    name: 'Median Master',
    gameType: 'graph_grabber',
    skillTags: ['MEDIAN', 'DATA_INTERPRETATION', 'ORDERING'],
    objectiveForLevel: (miniGameLevel) => `Sort and analyse data sets to find the median quickly (L${miniGameLevel}).`,
  },
  {
    key: 'mean_machine',
    name: 'Mean Machine',
    gameType: 'mean_machine',
    skillTags: ['MEAN', 'TOTALS', 'DIVISION'],
    objectiveForLevel: (miniGameLevel) => `Calculate means from increasingly tricky sets (L${miniGameLevel}).`,
  },
  {
    key: 'mode_miner',
    name: 'Mode Miner',
    gameType: 'data_dungeon',
    skillTags: ['MODE', 'FREQUENCY', 'DATA_HANDLING'],
    objectiveForLevel: (miniGameLevel) => `Find the most frequent value before time runs out (L${miniGameLevel}).`,
  },
];

let globalCounter = 1;

export const NUMBER_BASE_CAMP_MINIGAME_PACKS: NumberBaseCampMiniGamePack[] = basePackDefs.map((packDef) => {
  const levels: NumberBaseCampMiniGameLevel[] = Array.from({ length: LEVELS_PER_MINIGAME }, (_, index) => {
    const miniGameLevel = index + 1;
    const difficultyTier = toTier(miniGameLevel);
    const globalLevelId = globalCounter++;

    return {
      globalLevelId,
      miniGameLevel,
      difficultyTier,
      skillTags: [...packDef.skillTags],
      objective: packDef.objectiveForLevel(miniGameLevel, difficultyTier),
    };
  });

  return {
    key: packDef.key,
    name: packDef.name,
    gameType: packDef.gameType,
    levels,
  };
});

const PLACE_VALUE_PANIC_COLUMNS_BY_TIER: Record<NumberBaseCampDifficultyTier, Array<'ones' | 'tens' | 'hundreds' | 'thousands'>> = {
  1: ['ones', 'tens'],
  2: ['ones', 'tens', 'hundreds'],
  3: ['ones', 'tens', 'hundreds'],
  4: ['ones', 'tens', 'hundreds', 'thousands'],
  5: ['ones', 'tens', 'hundreds', 'thousands'],
};

export const PLACE_VALUE_PANIC_LEVELS: PlaceValuePanicLevelConfig[] = (
  NUMBER_BASE_CAMP_MINIGAME_PACKS.find((pack) => pack.key === 'place_value_panic')?.levels || []
).map((levelMeta) => {
  // Combined pacing groups requested:
  // 1-2, 3-4, 5-7, 8-10
  const combinedReferenceLevel = (
    levelMeta.miniGameLevel <= 2 ? 2
      : levelMeta.miniGameLevel <= 4 ? 4
      : levelMeta.miniGameLevel <= 7 ? 7
      : 10
  );
  const combinedTier = toTier(combinedReferenceLevel);
  const queueLimit = Math.max(4, 8 - (combinedTier - 1) - (combinedReferenceLevel % 2 === 0 ? 1 : 0));
  const timeLimitSec = 60;
  const promptsToClear = 3 + combinedTier;
  const spawnIntervalMs = Math.max(650, 1680 - combinedReferenceLevel * 92);
  const decoyChance = Math.min(0.6, 0.22 + combinedReferenceLevel * 0.035);
  const targetScore = 900 + combinedReferenceLevel * 250;

  return {
    ...levelMeta,
    queueLimit,
    timeLimitSec,
    promptsToClear,
    spawnIntervalMs,
    decoyChance,
    activeColumns: PLACE_VALUE_PANIC_COLUMNS_BY_TIER[combinedTier],
    targetScore,
  };
});

export const getPlaceValuePanicLevelConfig = (miniGameLevel: number): PlaceValuePanicLevelConfig => {
  return PLACE_VALUE_PANIC_LEVELS.find((level) => level.miniGameLevel === miniGameLevel)
    || PLACE_VALUE_PANIC_LEVELS[0];
};

export const NUMBER_BASE_CAMP_LEVELS: LevelData[] = (() => {
  const ordered: LevelData[] = [];

  for (let miniGameLevel = 1; miniGameLevel <= LEVELS_PER_MINIGAME; miniGameLevel += 1) {
    for (const miniGamePack of NUMBER_BASE_CAMP_MINIGAME_PACKS) {
      const levelMeta = miniGamePack.levels.find((level) => level.miniGameLevel === miniGameLevel);
      if (!levelMeta) continue;

      ordered.push({
        id: ordered.length + 1,
        stars: 0,
        // Unlock the first level for each mini-game lane so every core game is testable.
        isLocked: levelMeta.miniGameLevel !== 1,
        blueprintKey: miniGamePack.key,
        displayName: `${miniGamePack.name} L${levelMeta.miniGameLevel}`,
        gameType: miniGamePack.gameType,
        miniGameKey: miniGamePack.key,
        miniGameLevel: levelMeta.miniGameLevel,
        difficultyTier: levelMeta.difficultyTier,
        skillTags: levelMeta.skillTags,
      });
    }
  }

  return ordered;
})();
