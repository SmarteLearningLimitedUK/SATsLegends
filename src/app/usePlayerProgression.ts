import { Dispatch, SetStateAction, useEffect, useMemo, useRef, useState } from 'react';
import { DEFAULT_AVATAR_ID } from '../assets/characters';
import { AVATARS, INITIAL_DAILY_QUESTS, ISLANDS } from '../constants';
import { IslandData, LevelData, PlayerData } from '../types';
import { LevelResultState } from './types';
import { getLevelGameTitle } from '../utils/gameNames';
import { createTelemetryState } from '../systems/progression/telemetry';
import { getStarterItemIds } from '../systems/progression/shopCatalog';
import { useProgressionStore } from '../store/useProgressionStore';
import { useGameSave } from '../website/GameSaveContext';

export const PLAYER_STORAGE_KEY = 'maths_quest_player_v2';
const ALL_ISLAND_IDS = ISLANDS.map(island => island.id);

export const getLocalQuestDate = (now = new Date()) => (
  `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
);

const freshDailyQuests = () => INITIAL_DAILY_QUESTS.map(quest => ({
  ...quest,
  reward: { ...quest.reward },
  current: 0,
  isClaimed: false,
}));

export const refreshDailyQuests = (player: PlayerData, now = new Date()): PlayerData => {
  const date = getLocalQuestDate(now);
  return player.dailyQuestDate === date
    ? player
    : { ...player, dailyQuestDate: date, dailyQuests: freshDailyQuests() };
};

const resolveAvatarId = (avatarId?: string) => (
  AVATARS.some(avatar => avatar.id === avatarId) ? avatarId! : DEFAULT_AVATAR_ID
);

export const createDefaultPlayer = (parsed?: Partial<PlayerData> | null, now = new Date()): PlayerData => ({
  playerName: parsed?.playerName || '',
  avatarId: resolveAvatarId(parsed?.avatarId),
  level: parsed?.level || 1,
  xp: parsed?.xp || 0,
  coins: parsed?.coins ?? 100,
  gems: parsed?.gems ?? 10,
  unlockedIslands: ALL_ISLAND_IDS,
  completedLevels: parsed?.completedLevels || {},
  levelStars: parsed?.levelStars || {},
  dailyQuests: parsed?.dailyQuestDate === getLocalQuestDate(now) && parsed.dailyQuests
    ? parsed.dailyQuests
    : freshDailyQuests(),
  dailyQuestDate: getLocalQuestDate(now),
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

export interface PlayerProgressionController {
  player: PlayerData;
  setPlayer: Dispatch<SetStateAction<PlayerData>>;
  draftName: string;
  setDraftName: Dispatch<SetStateAction<string>>;
  hasCompletedProfile: boolean;
  saveProfileName: () => void;
  claimQuest: (questId: string) => void;
  recordShopVisit: () => void;
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
      accuracyMeasured: boolean;
      hintsUsed: number;
      mistakes: number;
      timeMs: number;
    },
    totalStarsEarned: number,
  ) => LevelResultState | null;
}

export const usePlayerProgression = (): PlayerProgressionController => {
  const cloudSave = useGameSave();
  const grantProgressionXp = useProgressionStore((state) => state.grantXp);
  const [player, setPlayer] = useState<PlayerData>(() => {
    if (cloudSave) return refreshDailyQuests(cloudSave.initialPlayer);
    const saved = localStorage.getItem(PLAYER_STORAGE_KEY);
    const parsed = saved ? JSON.parse(saved) : null;
    return createDefaultPlayer(parsed);
  });
  const [draftName, setDraftName] = useState('');
  const claimedQuestKeysRef = useRef(new Set<string>());

  const hasCompletedProfile = useMemo(
    () => Boolean(player.playerName.trim() && player.avatarId),
    [player.playerName, player.avatarId],
  );

  useEffect(() => {
    localStorage.setItem(cloudSave?.storageKey ?? PLAYER_STORAGE_KEY, JSON.stringify(player));
    if (cloudSave) {
      const { player: progressionPlayer, levels, totalStars } = useProgressionStore.getState();
      cloudSave.queue({ player, progression: { player: progressionPlayer, levels, totalStars } });
    }
  }, [player]);

  useEffect(() => {
    if (!AVATARS.some((avatar) => avatar.id === player.avatarId)) {
      setPlayer((prev) => ({
        ...prev,
        avatarId: resolveAvatarId(prev.avatarId),
      }));
    }
  }, [player.avatarId, setPlayer]);

  useEffect(() => {
    const refresh = () => setPlayer(prev => refreshDailyQuests(prev));
    const now = new Date();
    const nextMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1).getTime();
    const timer = window.setTimeout(refresh, Math.max(1000, nextMidnight - now.getTime() + 100));
    window.addEventListener('focus', refresh);
    document.addEventListener('visibilitychange', refresh);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener('focus', refresh);
      document.removeEventListener('visibilitychange', refresh);
    };
  }, [player.dailyQuestDate, setPlayer]);

  const saveProfileName = () => {
    const sanitizedName = draftName.trim() || 'Explorer';
    setPlayer(prev => ({ ...prev, playerName: sanitizedName }));
  };

  const claimQuest = (questId: string) => {
    const visibleQuests = refreshDailyQuests(player);
    const visibleQuest = visibleQuests.dailyQuests.find((quest) => quest.id === questId);
    const claimKey = `${visibleQuests.dailyQuestDate}:${questId}`;
    if (!visibleQuest || visibleQuest.isClaimed || visibleQuest.current < visibleQuest.target
      || claimedQuestKeysRef.current.has(claimKey)) return;
    claimedQuestKeysRef.current.add(claimKey);

    setPlayer(prev => {
      const current = refreshDailyQuests(prev);
      const quest = current.dailyQuests.find(q => q.id === questId);
      if (!quest || quest.isClaimed || quest.current < quest.target) return current;
      return {
        ...current,
        coins: quest.reward.type === 'coins' ? current.coins + quest.reward.amount : current.coins,
        gems: quest.reward.type === 'gems' ? current.gems + quest.reward.amount : current.gems,
        xp: quest.reward.type === 'xp' ? current.xp + quest.reward.amount : current.xp,
        stats: {
          ...current.stats,
          totalCoinsEarned: (current.stats?.totalCoinsEarned || 0) + (quest.reward.type === 'coins' ? quest.reward.amount : 0),
        },
        dailyQuests: current.dailyQuests.map(q =>
          q.id === questId ? { ...q, isClaimed: true } : q,
        ),
      };
    });
    // React may replay state updaters; award progression XP once per claim event.
    if (visibleQuest.reward.type === 'xp') grantProgressionXp(visibleQuest.reward.amount);
  };

  const recordShopVisit = () => setPlayer(prev => {
    const current = refreshDailyQuests(prev);
    if (current.dailyQuests.find(quest => quest.id === 'q3')?.current) return current;
    return {
      ...current,
      dailyQuests: current.dailyQuests.map(quest => quest.id === 'q3'
        ? { ...quest, current: Math.min(quest.target, quest.current + 1) }
        : quest),
    };
  });

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
      accuracyMeasured: boolean;
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
      const current = refreshDailyQuests(prev);
      const updatedQuests = current.dailyQuests.map(quest => {
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
        totalGamesPlayed: (current.stats?.totalGamesPlayed || 0) + 1,
        totalCoinsEarned: (current.stats?.totalCoinsEarned || 0) + earnedCoins,
      };

      const nextCoinTotal = current.coins + earnedCoins;
      const unlockedIslands = current.unlockedIslands.includes(nextIslandId) || !selectedLevel.isBoss
        ? current.unlockedIslands
        : [...current.unlockedIslands, nextIslandId].filter(id => id <= ISLANDS.length);

      return {
        ...current,
        coins: nextCoinTotal,
        xp: progressionResult.currentXp,
        level: progressionResult.newLevel,
        unlockedIslands,
        dailyQuests: updatedQuests,
        stats,
        achievements: current.achievements || [],
      };
    });

    const levelTitle = getLevelGameTitle(selectedLevel) || '';

    return {
      type: 'victory',
      title: levelTitle || (stars === 3 ? 'Flawless clear' : stars === 2 ? 'Strong finish' : 'Level cleared'),
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
      accuracyMeasured: metrics.accuracyMeasured,
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
    saveProfileName,
    claimQuest,
    recordShopVisit,
    applyGameVictory,
  };
};
