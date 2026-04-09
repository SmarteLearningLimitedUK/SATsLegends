import { Dispatch, SetStateAction, useEffect, useMemo, useState } from 'react';
import { DEFAULT_AVATAR_ID } from '../assets/characters';
import { AVATARS, INITIAL_DAILY_QUESTS, ISLANDS } from '../constants';
import { IslandData, LevelData, PlayerData } from '../types';
import { LevelResultState } from './types';
import { createTelemetryState } from '../systems/progression/telemetry';
import { getStarterItemIds } from '../systems/progression/shopCatalog';
import { useProgressionStore } from '../store/useProgressionStore';

export const PLAYER_STORAGE_KEY = 'maths_quest_player';
const ALL_ISLAND_IDS = ISLANDS.map(island => island.id);

const resolveAvatarId = (avatarId?: string) => (
  AVATARS.some(avatar => avatar.id === avatarId) ? avatarId! : DEFAULT_AVATAR_ID
);

const createDefaultPlayer = (parsed?: Partial<PlayerData> | null): PlayerData => ({
  playerName: parsed?.playerName || '',
  avatarId: resolveAvatarId(parsed?.avatarId),
  level: parsed?.level || 1,
  xp: parsed?.xp || 0,
  coins: parsed?.coins || 100,
  gems: parsed?.gems || 10,
  unlockedIslands: ALL_ISLAND_IDS,
  completedLevels: parsed?.completedLevels || {},
  levelStars: parsed?.levelStars || {},
  lastLoginDate: parsed?.lastLoginDate,
  dailyStreak: parsed?.dailyStreak || 1,
  claimedDailyRewardToday: parsed?.claimedDailyRewardToday || false,
  dailyQuests: parsed?.dailyQuests || INITIAL_DAILY_QUESTS,
  achievements: parsed?.achievements || [],
  customSpriteUrl: parsed?.customSpriteUrl,
  calmTokens: parsed?.calmTokens || 0,
  shopState: {
    ownedItemIds: Array.from(new Set([
      ...getStarterItemIds(),
      ...(parsed?.shopState?.ownedItemIds || []),
    ])),
    equippedByCategory: parsed?.shopState?.equippedByCategory || {
      outfit: null,
      hat: null,
      accessory: null,
      handheld: null,
      trail: null,
      skin: null,
    },
  },
  telemetry: createTelemetryState(parsed?.telemetry),
  achievementState: parsed?.achievementState || {
    earned: parsed?.achievements || [],
    progress: {},
    claimed: [],
    updatedAt: Date.now(),
  },
  stats: {
    totalStars: parsed?.stats?.totalStars || 0,
    totalGamesPlayed: parsed?.stats?.totalGamesPlayed || 0,
    totalCoinsEarned: parsed?.stats?.totalCoinsEarned || 0,
  },
});

interface ClaimRewardPayload {
  type: string;
  amount: number;
}

export interface PlayerProgressionController {
  player: PlayerData;
  setPlayer: Dispatch<SetStateAction<PlayerData>>;
  draftName: string;
  setDraftName: Dispatch<SetStateAction<string>>;
  hasCompletedProfile: boolean;
  dailyRewardsNudge: number;
  saveProfileName: () => void;
  claimDailyReward: (reward: ClaimRewardPayload) => void;
  claimQuest: (questId: string) => void;
  applyGameVictory: (
    selectedIsland: IslandData | null,
    selectedLevel: LevelData | null,
    progressionResult: {
      stars: number;
      xpGained: number;
      leveledUp: boolean;
      newLevel: number;
      currentXp: number;
      xpRequiredForNextLevel: number;
      previousLevel: number;
      previousXp: number;
      bonuses: { label: string; amount: number }[];
    },
    metrics: {
      score: number;
      accuracy: number;
      hintsUsed: number;
      mistakes: number;
      timeMs: number;
    },
    totalStarsEarned: number,
  ) => LevelResultState | null;
}

export const usePlayerProgression = (): PlayerProgressionController => {
  const grantProgressionXp = useProgressionStore((state) => state.grantXp);
  const [player, setPlayer] = useState<PlayerData>(() => {
    const saved = localStorage.getItem(PLAYER_STORAGE_KEY);
    const parsed = saved ? JSON.parse(saved) : null;
    return createDefaultPlayer(parsed);
  });
  const [draftName, setDraftName] = useState('');
  const [dailyRewardsNudge, setDailyRewardsNudge] = useState(0);

  const hasCompletedProfile = useMemo(
    () => Boolean(player.playerName.trim() && player.avatarId),
    [player.playerName, player.avatarId],
  );

  useEffect(() => {
    const today = new Date().toISOString().split('T')[0];
    if (player.lastLoginDate !== today) {
      setPlayer(prev => {
        const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
        const wasYesterday = prev.lastLoginDate === yesterday;

        return {
          ...prev,
          lastLoginDate: today,
          dailyStreak: wasYesterday ? prev.dailyStreak + 1 : 1,
          claimedDailyRewardToday: false,
          dailyQuests: INITIAL_DAILY_QUESTS.map(quest => ({ ...quest })),
        };
      });
      setDailyRewardsNudge(prev => prev + 1);
    }
  }, [player.lastLoginDate]);

  useEffect(() => {
    localStorage.setItem(PLAYER_STORAGE_KEY, JSON.stringify(player));
  }, [player]);

  const saveProfileName = () => {
    const sanitizedName = draftName.trim() || 'Explorer';
    setPlayer(prev => ({ ...prev, playerName: sanitizedName }));
  };

  const claimDailyReward = (reward: ClaimRewardPayload) => {
    setPlayer(prev => ({
      ...prev,
      coins: reward.type === 'coins' ? prev.coins + reward.amount : prev.coins,
      gems: reward.type === 'gems' ? prev.gems + reward.amount : prev.gems,
      stats: {
        ...prev.stats,
        totalCoinsEarned: (prev.stats?.totalCoinsEarned || 0) + (reward.type === 'coins' ? reward.amount : 0),
      },
      claimedDailyRewardToday: true,
    }));
  };

  const claimQuest = (questId: string) => {
    setPlayer(prev => {
      const quest = prev.dailyQuests.find(q => q.id === questId);
      if (!quest || quest.isClaimed || quest.current < quest.target) return prev;

      if (quest.reward.type === 'xp') {
        grantProgressionXp(quest.reward.amount);
      }

      return {
        ...prev,
        coins: quest.reward.type === 'coins' ? prev.coins + quest.reward.amount : prev.coins,
        gems: quest.reward.type === 'gems' ? prev.gems + quest.reward.amount : prev.gems,
        xp: quest.reward.type === 'xp' ? prev.xp + quest.reward.amount : prev.xp,
        stats: {
          ...prev.stats,
          totalCoinsEarned: (prev.stats?.totalCoinsEarned || 0) + (quest.reward.type === 'coins' ? quest.reward.amount : 0),
        },
        dailyQuests: prev.dailyQuests.map(q =>
          q.id === questId ? { ...q, isClaimed: true } : q,
        ),
      };
    });
  };

  const applyGameVictory = (
    selectedIsland: IslandData | null,
    selectedLevel: LevelData | null,
    progressionResult: {
      stars: number;
      xpGained: number;
      leveledUp: boolean;
      newLevel: number;
      currentXp: number;
      xpRequiredForNextLevel: number;
      previousLevel: number;
      previousXp: number;
      bonuses: { label: string; amount: number }[];
    },
    metrics: {
      score: number;
      accuracy: number;
      hintsUsed: number;
      mistakes: number;
      timeMs: number;
    },
    totalStarsEarned: number,
  ): LevelResultState | null => {
    if (!selectedIsland || !selectedLevel) return null;

    const stars = progressionResult.stars;
    const earnedCoins = stars * 50;
    const islandId = selectedIsland.id;
    const levelId = selectedLevel.id;
    const nextIslandId = islandId + 1;
    const islandUnlockedName = selectedLevel.isBoss && nextIslandId <= ISLANDS.length
      ? ISLANDS.find(island => island.id === nextIslandId)?.name
      : undefined;
    const achievementsUnlocked: string[] = [];

    setPlayer(prev => {
      const updatedQuests = prev.dailyQuests.map(quest => {
        if (quest.id === 'q1') {
          return { ...quest, current: Math.min(quest.target, quest.current + 1) };
        }
        if (quest.id === 'q2' && stars === 3) {
          return { ...quest, current: Math.min(quest.target, quest.current + 1) };
        }
        return quest;
      });

      const stats = {
        totalStars: totalStarsEarned,
        totalGamesPlayed: (prev.stats?.totalGamesPlayed || 0) + 1,
        totalCoinsEarned: (prev.stats?.totalCoinsEarned || 0) + earnedCoins,
      };

      const nextCoinTotal = prev.coins + earnedCoins;
      const unlockedIslands = prev.unlockedIslands.includes(nextIslandId) || !selectedLevel.isBoss
        ? prev.unlockedIslands
        : [...prev.unlockedIslands, nextIslandId].filter(id => id <= ISLANDS.length);

      return {
        ...prev,
        coins: nextCoinTotal,
        xp: progressionResult.currentXp,
        level: progressionResult.newLevel,
        unlockedIslands,
        dailyQuests: updatedQuests,
        stats,
        achievements: prev.achievements || [],
      };
    });

    return {
      type: 'victory',
      title: stars === 3 ? 'Flawless clear' : stars === 2 ? 'Strong finish' : 'Level cleared',
      subtitle: stars === 3
        ? 'You nailed the target, banked the rewards, and pushed your run forward.'
        : 'Rewards are locked in. Keep the momentum going into the next challenge.',
      score: metrics.score,
      stars,
      xpGained: progressionResult.xpGained,
      bonuses: progressionResult.bonuses,
      previousLevel: progressionResult.previousLevel,
      newLevel: progressionResult.newLevel,
      previousXp: progressionResult.previousXp,
      currentXp: progressionResult.currentXp,
      xpRequiredForNextLevel: progressionResult.xpRequiredForNextLevel,
      leveledUp: progressionResult.leveledUp,
      accuracy: metrics.accuracy,
      hintsUsed: metrics.hintsUsed,
      mistakes: metrics.mistakes,
      timeMs: metrics.timeMs,
      completed: true,
      coinsEarned: earnedCoins,
      xpEarned: progressionResult.xpGained,
      islandUnlockedName,
      achievementsUnlocked,
    };
  };

  return {
    player,
    setPlayer,
    draftName,
    setDraftName,
    hasCompletedProfile,
    dailyRewardsNudge,
    saveProfileName,
    claimDailyReward,
    claimQuest,
    applyGameVictory,
  };
};
