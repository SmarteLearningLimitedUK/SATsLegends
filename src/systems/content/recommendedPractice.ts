import type { IslandData, LevelData, PlayerData } from '../../types';
import { getLevelProgressIds } from './gameDifficulty';
import { getLevelGameTitle, getLevelGroupKey } from '../../utils/gameNames';
import type {LearningState} from '../learning/types';
import {skillProgress} from '../learning/mastery';
import {buildRevisionQuest} from '../learning/revisionQuest';
import {REVISION_GAMES} from '../learning/revisionSkills';
import {revisionMissionsForSkill} from '../learning/revisionTargets';

export interface PracticeRecommendation {
  key: string;
  name: string;
  islandName: string;
  href: string;
  reason: string;
  priority: number;
}

/** A skill-specific workshop opens before the ordinary practice game. */
export function revisionPracticeHref(skill:string,islands:IslandData[]):string|null {
 const game=REVISION_GAMES[skill];
 if(!game||!revisionMissionsForSkill(skill,42,game).length)return null;
 for(const island of islands){const level=island.levels.find(l=>l.isPractice&&(l.blueprintKey===game||l.miniGameKey===game));
  if(level)return `/game/${island.id}/${level.id}?revisionSkill=${encodeURIComponent(skill)}`;
 }
 return null;
}

const bestStarsFor = (player: PlayerData, islandId: number, level: LevelData) =>
  Math.max(0, ...getLevelProgressIds(level).map((id) => player.levelStars?.[`${islandId}-${id}`] ?? 0));

/** Suggest an existing practice route only when saved work identifies a skill to revisit. */
export const getRecommendedPractice = (
  player: PlayerData,
  islands: IslandData[],
  limit = 3,
  learning?:LearningState,
): PracticeRecommendation[] => {
  const candidates: PracticeRecommendation[] = [];
  if(learning?.events.length){
    for(const segment of buildRevisionQuest(skillProgress(learning.events))){
      const href=revisionPracticeHref(segment.skillId,islands);
      for(const island of islands){const level=island.levels.find(level=>level.isPractice&&(level.blueprintKey===segment.gameKey||level.miniGameKey===segment.gameKey));if(level&&href)candidates.push({key:`${island.id}:${segment.skillId}`,name:getLevelGameTitle(level),islandName:island.name,href,reason:segment.reason,priority:1000-candidates.length});}
    }
    if(candidates.length)return candidates.slice(0,limit);
  }
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
      const canonicalStat=practice.blueprintKey?player.telemetry?.gameStats?.[practice.blueprintKey]:undefined;
      const stat = canonicalStat??player.telemetry?.gameStats?.[practice.gameType];
      const uniqueGameType = Boolean(canonicalStat)||gameTypeUseCount.get(practice.gameType) === 1;
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
