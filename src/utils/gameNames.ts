import { LevelData } from '../types';
import { getGameLabel } from '../gameMeta';

const stripLevelSuffix = (name: string) => name.replace(/\s+L\d+$/i, '').trim();

const toTitleCaseFromKey = (key: string) => key
  .split(/[_-]/g)
  .filter(Boolean)
  .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
  .join(' ');

export const getLevelGameTitle = (level?: LevelData | null) => {
  if (!level) return '';
  if (level.displayName) return stripLevelSuffix(level.displayName);
  if (level.miniGameKey) return toTitleCaseFromKey(level.miniGameKey);
  if (level.blueprintKey) return toTitleCaseFromKey(level.blueprintKey);
  if (level.gameType) return getGameLabel(level.gameType);
  return '';
};

export const getLevelGroupKey = (level: LevelData) => (
  level.miniGameKey
  || level.blueprintKey
  || level.gameType
  || level.displayName
  || `${level.id}`
);
