import { ISLANDS } from '../../../../src/constants';
import type { LevelData } from '../../../../src/types';

// Campaign order is the source of truth. Route IDs also preserve existing saves.
export const FREE_PRACTICE_LEVELS = ISLANDS.flatMap(island =>
  island.levels.filter(level => level.isPractice).map(level => ({ island, level })),
).slice(0, 3);

export function isFreePractice(islandId: number, level: LevelData) {
  return FREE_PRACTICE_LEVELS.some(entry => entry.island.id === islandId && entry.level.id === level.id && level.isPractice === true);
}

export function canAccessLevel(fullAccess: boolean, islandId: number, level: LevelData) {
  return fullAccess || isFreePractice(islandId, level);
}
