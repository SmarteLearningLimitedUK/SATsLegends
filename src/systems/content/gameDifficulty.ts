import { IslandData, LevelData } from '../../types';

export type GameDifficulty = 1 | 2 | 3 | 4 | 5;

interface CampaignLevel extends LevelData {
  // These are former routes in this repository, retained as progress aliases.
  retiredLevelIds?: number[];
}

export const GAME_DIFFICULTY_LABELS: Record<GameDifficulty, string> = {
  1: 'Guided',
  2: 'Basic fluency',
  3: 'Multi-step',
  4: 'Constraint',
  5: 'Mastery',
};

export const getGameDifficulty = (level: LevelData): GameDifficulty => (
  Math.max(1, Math.min(5, level.isPractice ? 1 : level.difficultyTier ?? level.miniGameLevel ?? 1)) as GameDifficulty
);

export const getLevelProgressIds = (level: LevelData): number[] => (
  [...new Set([level.id, ...((level as CampaignLevel).retiredLevelIds || [])])]
);

export const resolveIslandLevel = (island: IslandData, routeId: number): LevelData | undefined => (
  island.levels.find((level) => level.id === routeId)
  || island.levels.find((level) => getLevelProgressIds(level).includes(routeId))
);

/** Build the five-tier menu after assigning the existing island route IDs. */
export const buildFiveTierCampaign = (seedLevels: LevelData[]): LevelData[] => {
  let nextId = Math.max(0, ...seedLevels.map((level) => level.id)) + 1;
  const groups = new Map<string, LevelData[]>();
  for (const level of seedLevels) {
    const key = level.miniGameKey || level.blueprintKey || level.gameType || String(level.id);
    const group = groups.get(key) || [];
    group.push(level);
    groups.set(key, group);
  }

  const result: CampaignLevel[] = [];
  for (const [key, group] of groups) {
    if (group.some((level) => level.isBoss)) {
      result.push(...group.map((level) => ({ ...level })));
      continue;
    }

    const base = group[0];
    const name = (base.displayName || key).replace(/\s+L\d+$/i, '').trim();
    const practice = group.find((level) => level.isPractice);
    result.push({
      ...(practice || base),
      id: practice?.id ?? nextId++,
      displayName: name,
      miniGameKey: key,
      miniGameLevel: 0,
      difficultyTier: 1,
      isPractice: true,
      isLocked: false,
    });

    const scored = group.filter((level) => !level.isPractice);
    for (let tier = 1; tier <= 5; tier += 1) {
      const candidates = scored.filter((level, index) => (level.difficultyTier || index + 1) === tier);
      // Existing ten-step packs have two variants per tier: retain the later
      // route, and count either former sibling toward that same tier's progress.
      const existing = candidates.at(-1);
      result.push({
        ...(existing || base),
        id: existing?.id ?? nextId++,
        displayName: `${name} L${tier}`,
        miniGameKey: key,
        miniGameLevel: tier,
        difficultyTier: tier as GameDifficulty,
        isPractice: false,
        isLocked: tier > 1,
        retiredLevelIds: candidates.filter((level) => level.id !== existing?.id).map((level) => level.id),
      });
    }
  }
  return result.sort((a, b) => a.id - b.id);
};
