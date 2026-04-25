import { PlayerAchievementState, PlayerData, PlayerTelemetry } from '../../types';
import { ISLANDS } from '../../constants';

export type AchievementCategory =
  | 'sessions'
  | 'streak'
  | 'accuracy'
  | 'topic'
  | 'gameplay'
  | 'island'
  | 'shop'
  | 'currency';

export type AchievementMetric =
  | 'sessions_played'
  | 'best_streak'
  | 'total_correct'
  | 'total_answered'
  | 'topic_mastery'
  | 'game_mastery'
  | 'perfect_levels'
  | 'island_completion'
  | 'islands_completed'
  | 'boss_levels_completed'
  | 'coins_earned'
  | 'shop_items_owned';

export interface AchievementDefinition {
  id: string;
  name: string;
  description: string;
  category: AchievementCategory;
  metric: AchievementMetric;
  target: number;
  iconKey: string;
  topicId?: string;
  gameId?: string;
  islandId?: number;
  hidden?: boolean;
}

export const ACHIEVEMENT_CATALOG: AchievementDefinition[] = [
  {
    id: 'answered-100',
    name: 'Hundred Hero',
    description: 'Answer 100 questions.',
    category: 'gameplay',
    metric: 'total_answered',
    target: 100,
    iconKey: 'star',
  },
  {
    id: 'answered-500',
    name: 'Question Champion',
    description: 'Answer 500 questions.',
    category: 'gameplay',
    metric: 'total_answered',
    target: 500,
    iconKey: 'trophy',
  },
  {
    id: 'answered-1000',
    name: 'Legendary Solver',
    description: 'Answer 1000 questions.',
    category: 'gameplay',
    metric: 'total_answered',
    target: 1000,
    iconKey: 'trophy',
  },
  {
    id: 'island-completed',
    name: 'Island Complete',
    description: 'Complete every level on any island.',
    category: 'island',
    metric: 'islands_completed',
    target: 1,
    iconKey: 'trophy',
  },
  {
    id: 'boss-level-completed',
    name: 'Boss Breaker',
    description: 'Complete a boss level.',
    category: 'gameplay',
    metric: 'boss_levels_completed',
    target: 1,
    iconKey: 'medal',
  },
  {
    id: 'perfect-score',
    name: 'Perfect Score',
    description: 'Earn a 100% score on a level.',
    category: 'accuracy',
    metric: 'perfect_levels',
    target: 1,
    iconKey: 'gem',
  },
];

export const getAchievementDefinition = (achievementId: string) => (
  ACHIEVEMENT_CATALOG.find((achievement) => achievement.id === achievementId) ?? null
);

const defaultAchievementState = (): PlayerAchievementState => ({
  earned: [],
  progress: {},
  claimed: [],
  updatedAt: Date.now(),
});

const getTelemetry = (player: PlayerData): PlayerTelemetry | null => player.telemetry ?? null;

const computeTopicAccuracy = (telemetry: PlayerTelemetry | null, topicId?: string) => {
  if (!telemetry || !topicId) return 0;
  const stat = telemetry.topicStats[topicId];
  if (!stat) return 0;
  return Math.round(stat.accuracy * 100);
};

const computeGameCompletion = (player: PlayerData, islandId?: number) => {
  if (!islandId) return 0;
  const completed = player.completedLevels[islandId]?.length ?? 0;
  const total = ISLANDS.find((island) => island.id === islandId)?.levels.length ?? 0;
  if (!total) return 0;
  return Math.round((completed / total) * 100);
};

const countAnsweredQuestions = (telemetry: PlayerTelemetry | null) => (
  (telemetry?.correctAnswers ?? 0) + (telemetry?.incorrectAnswers ?? 0)
);

const countPerfectLevels = (player: PlayerData) => (
  Object.values(player.levelStars || {}).filter((stars) => stars >= 3).length
);

const countCompletedIslands = (player: PlayerData) => (
  ISLANDS.filter((island) => {
    const completed = new Set(player.completedLevels[island.id] || []);
    return island.levels.length > 0 && island.levels.every((level) => completed.has(level.id));
  }).length
);

const countCompletedBossLevels = (player: PlayerData) => (
  ISLANDS.reduce((total, island) => {
    const completed = new Set(player.completedLevels[island.id] || []);
    const completedBosses = island.levels.filter((level) => level.isBoss && completed.has(level.id)).length;
    return total + completedBosses;
  }, 0)
);

export const computeAchievementProgress = (player: PlayerData, achievement: AchievementDefinition): number => {
  const telemetry = getTelemetry(player);

  switch (achievement.metric) {
    case 'sessions_played':
      return telemetry?.sessionsPlayed ?? 0;
    case 'best_streak':
      return telemetry?.bestCorrectStreak ?? 0;
    case 'total_correct':
      return telemetry?.correctAnswers ?? 0;
    case 'total_answered':
      return countAnsweredQuestions(telemetry);
    case 'topic_mastery':
      return computeTopicAccuracy(telemetry, achievement.topicId);
    case 'game_mastery':
      if (!telemetry || !achievement.gameId) return 0;
      return telemetry.gameStats[achievement.gameId]?.accuracy
        ? Math.round(telemetry.gameStats[achievement.gameId].accuracy * 100)
        : 0;
    case 'perfect_levels':
      return countPerfectLevels(player);
    case 'island_completion':
      return computeGameCompletion(player, achievement.islandId);
    case 'islands_completed':
      return countCompletedIslands(player);
    case 'boss_levels_completed':
      return countCompletedBossLevels(player);
    case 'coins_earned':
      return player.stats?.totalCoinsEarned ?? 0;
    case 'shop_items_owned':
      return player.shopState?.ownedItemIds.length ?? 0;
    default:
      return 0;
  }
};

export const reconcileAchievementState = (player: PlayerData): PlayerAchievementState => {
  const current = player.achievementState ?? defaultAchievementState();
  const catalogIds = new Set(ACHIEVEMENT_CATALOG.map((achievement) => achievement.id));
  const next: PlayerAchievementState = {
    ...current,
    earned: current.earned.filter((id) => catalogIds.has(id)),
    progress: { ...current.progress },
    claimed: current.claimed.filter((id) => catalogIds.has(id)),
    updatedAt: Date.now(),
  };

  ACHIEVEMENT_CATALOG.forEach((achievement) => {
    const progress = computeAchievementProgress(player, achievement);
    next.progress[achievement.id] = progress;
    if (progress >= achievement.target && !next.earned.includes(achievement.id)) {
      next.earned.push(achievement.id);
    }
  });

  return next;
};
