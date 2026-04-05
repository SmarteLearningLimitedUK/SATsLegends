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
  | 'topic_mastery'
  | 'game_mastery'
  | 'island_completion'
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
    id: 'first-session',
    name: 'First Signal',
    description: 'Play your first session.',
    category: 'sessions',
    metric: 'sessions_played',
    target: 1,
    iconKey: 'star',
  },
  {
    id: 'ten-sessions',
    name: 'Seasoned Explorer',
    description: 'Play 10 sessions.',
    category: 'sessions',
    metric: 'sessions_played',
    target: 10,
    iconKey: 'medal',
  },
  {
    id: 'streak-5',
    name: 'Combo Keeper',
    description: 'Reach a 5-answer correct streak.',
    category: 'streak',
    metric: 'best_streak',
    target: 5,
    iconKey: 'trophy',
  },
  {
    id: 'streak-10',
    name: 'Unbroken Chain',
    description: 'Reach a 10-answer correct streak.',
    category: 'streak',
    metric: 'best_streak',
    target: 10,
    iconKey: 'trophy',
  },
  {
    id: 'correct-100',
    name: 'Hundred Hits',
    description: 'Answer 100 questions correctly.',
    category: 'accuracy',
    metric: 'total_correct',
    target: 100,
    iconKey: 'star',
  },
  {
    id: 'topic-fractions',
    name: 'Fraction Focus',
    description: 'Reach 80% accuracy in fractions.',
    category: 'topic',
    metric: 'topic_mastery',
    target: 80,
    topicId: 'fractions',
    iconKey: 'gem',
  },
  {
    id: 'topic-ratio',
    name: 'Ratio Ready',
    description: 'Reach 80% accuracy in ratio.',
    category: 'topic',
    metric: 'topic_mastery',
    target: 80,
    topicId: 'ratio',
    iconKey: 'gem',
  },
  {
    id: 'island-1',
    name: 'Acropolis Clear',
    description: 'Complete every level in Arithmetic Acropolis.',
    category: 'island',
    metric: 'island_completion',
    target: 100,
    islandId: 1,
    iconKey: 'trophy',
  },
  {
    id: 'shop-first',
    name: 'First Outfit',
    description: 'Own your first cosmetic item.',
    category: 'shop',
    metric: 'shop_items_owned',
    target: 1,
    iconKey: 'coin',
  },
  {
    id: 'coins-2000',
    name: 'Coin Collector',
    description: 'Earn 2000 coins total.',
    category: 'currency',
    metric: 'coins_earned',
    target: 2000,
    iconKey: 'coin',
  },
];

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

export const computeAchievementProgress = (player: PlayerData, achievement: AchievementDefinition): number => {
  const telemetry = getTelemetry(player);

  switch (achievement.metric) {
    case 'sessions_played':
      return telemetry?.sessionsPlayed ?? 0;
    case 'best_streak':
      return telemetry?.bestCorrectStreak ?? 0;
    case 'total_correct':
      return telemetry?.correctAnswers ?? 0;
    case 'topic_mastery':
      return computeTopicAccuracy(telemetry, achievement.topicId);
    case 'game_mastery':
      if (!telemetry || !achievement.gameId) return 0;
      return telemetry.gameStats[achievement.gameId]?.accuracy
        ? Math.round(telemetry.gameStats[achievement.gameId].accuracy * 100)
        : 0;
    case 'island_completion':
      return computeGameCompletion(player, achievement.islandId);
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
  const next: PlayerAchievementState = {
    ...current,
    earned: [...current.earned],
    progress: { ...current.progress },
    claimed: [...current.claimed],
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
