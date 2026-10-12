import type { IslandData, LevelData, PlayerData } from '../../types';
import { getLevelProgressIds } from './gameDifficulty';
import { getLevelGameTitle, getLevelGroupKey } from '../../utils/gameNames';

export interface PracticeRecommendation {
  key: string;
  name: string;
  islandName: string;
  href: string;
  reason: string;
  priority: number;
}

const bestStarsFor = (player: PlayerData, islandId: number, level: LevelData) =>
  Math.max(0, ...getLevelProgressIds(level).map((id) => player.levelStars?.[`${islandId}-${id}`] ?? 0));

/** Suggest an existing practice route only when saved work identifies a skill to revisit. */
export const getRecommendedPractice = (
  player: PlayerData,
  islands: IslandData[],
  limit = 3,
): PracticeRecommendation[] => {
  const candidates: PracticeRecommendation[] = [];
  const gameTypeUseCount = new Map<string, number>();

  for (const island of islands) {
    const practiceLevels = island.levels.filter((level) => level.isPractice && level.gameType);
    for (const level of practiceLevels) {
      gameTypeUseCount.set(level.gameType!, (gameTypeUseCount.get(level.gameType!) ?? 0) + 1);
    }
  }

  for (const island of islands) {
    const groups = new Map<string, LevelData[]>();
    for (const level of island.levels) {
      const key = getLevelGroupKey(level);
      groups.set(key, [...(groups.get(key) ?? []), level]);
    }

    for (const [key, levels] of groups) {
      const practice = levels.find((level) => level.isPractice);
      if (!practice || !practice.gameType) continue;
      const completed = levels.filter((level) => !level.isPractice && !level.isBoss &&
        getLevelProgressIds(level).some((id) => player.completedLevels[island.id]?.includes(id)));
      const lowStars = completed.map((level) => bestStarsFor(player, island.id, level)).filter((stars) => stars > 0 && stars < 3);
      const stat = player.telemetry?.gameStats?.[practice.gameType];
      const uniqueGameType = gameTypeUseCount.get(practice.gameType) === 1;
      const lowAccuracy = uniqueGameType && stat && stat.attempts >= 5 && stat.accuracy < 0.8;
      if (!lowStars.length && !lowAccuracy) continue;

      const weakestStars = lowStars.length ? Math.min(...lowStars) : 3;
      const reason = lowStars.length
        ? `${lowStars.length} level${lowStars.length === 1 ? '' : 's'} to strengthen · best ${weakestStars} of 3 stars`
        : `${Math.round(stat!.accuracy * 100)}% accuracy across ${stat!.attempts} answers`;
      candidates.push({
        key: `${island.id}:${key}`,
        name: getLevelGameTitle(practice),
        islandName: island.name,
        href: `/game/${island.id}/${practice.id}`,
        reason,
        priority: lowStars.length ? (3 - weakestStars) * 100 + lowStars.length : (1 - stat!.accuracy) * 100,
      });
    }
  }

  return candidates.sort((a, b) => b.priority - a.priority || a.name.localeCompare(b.name)).slice(0, limit);
};
