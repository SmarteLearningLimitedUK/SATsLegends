import { MiniGameType } from './types';
import { BOSS_ART_LIBRARY } from './assets/bosses/library';

export const BOSS_VIEWPORT_VISUALS: string[] = BOSS_ART_LIBRARY;

const hashSeed = (value: string): number => {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = ((hash << 5) - hash) + value.charCodeAt(index);
    hash |= 0;
  }
  return Math.abs(hash);
};

export const getBossVisualForLevel = (
  gameType?: MiniGameType | null,
  levelId?: number,
): string | null => {
  if (gameType === 'timekeeper_temple') return null;
  if (!BOSS_VIEWPORT_VISUALS.length) return null;
  const seed = `${gameType || 'unknown'}-${levelId || 0}`;
  const index = hashSeed(seed) % BOSS_VIEWPORT_VISUALS.length;
  return BOSS_VIEWPORT_VISUALS[index];
};
