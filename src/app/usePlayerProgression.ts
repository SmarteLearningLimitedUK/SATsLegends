import { Dispatch, SetStateAction, useEffect, useMemo, useState } from 'react';
import { DEFAULT_AVATAR_ID } from '../assets/characters';
import { AVATARS, INITIAL_DAILY_QUESTS, ISLANDS } from '../constants';
import { IslandData, LevelData, PlayerData } from '../types';
import { LevelResultState } from './types';
import { getLevelGameTitle } from '../utils/gameNames';
import { createTelemetryState } from '../systems/progression/telemetry';
import { reconcileAchievementState } from '../systems/progression/achievementCatalog';
import { useProgressionStore } from '../store/useProgressionStore';
import { localFirstStorage } from '../storage/localFirstStorage';

export const PLAYER_STORAGE_KEY = 'maths_quest_player_v2';
const ALL_ISLAND_IDS = ISLANDS.map(island => island.id);

const resolveAvatarId = (avatarId?: string) => (
  AVATARS.some(avatar => avatar.id === avatarId) ? avatarId! : DEFAULT_AVATAR_ID
);

const createDefaultPlayer = (parsed?: Partial<PlayerData> | null): PlayerData => ({
  playerName: parsed?.playerName || '',
  avatarId: resolveAvatarId(parsed?.avatarId),
  level: parsed?.level || 1,
  xp: parsed?.xp || 0,
  brainpowerTokens: parsed?.brainpowerTokens ?? parsed?.calmTokens ?? 0,
  unlockedIslands: ALL_ISLAND_IDS,
  completedLevels: parsed?.completedLevels || {},
  levelStars: parsed?.levelStars || {},
  dailyQuests: parsed?.dailyQuests || INITIAL_DAILY_QUESTS,
  achievements: parsed?.achievements || [],
  customSpriteUrl: parsed?.customSpriteUrl,
  // Legacy save field. Keep in sync for older stored profiles.
  calmTokens: parsed?.calmTokens,
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
    totalBrainpowerTokensEarned: parsed?.stats?.totalBrainpowerTokensEarned || 0,
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
    const saved = localFirstStorage.getItem(PLAYER_STORAGE_KEY);
    const parsed = saved ? JSON.parse(saved) : null;
    return createDefaultPlayer(parsed);
  });
  const [draftName, setDraftName] = useState('');

  const hasCompletedProfile = useMemo(
    () => Boolean(player.playerName.trim() && player.avatarId),
    [player.playerName, player.avatarId],
  );

  useEffect(() => {
    localFirstStorage.setItem(PLAYER_STORAGE_KEY, JSON.stringify(player));
  }, [player]);

  useEffect(() => {
    if (!AVATARS.some((avatar) => avatar.id === player.avatarId)) {
      setPlayer((prev) => ({
        ...prev,
        avatarId: resolveAvatarId(prev.avatarId),
      }));
    }
  }, [player.avatarId, setPlayer]);

  const saveProfileName = () => {
    const sanitizedName = draftName.trim() || 'Explorer';
    setPlayer(prev => ({ ...prev, playerName: sanitizedName }));
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
        brainpowerTokens: quest.reward.type === 'brainpower'
          ? prev.brainpowerTokens + quest.reward.amount
          : prev.brainpowerTokens,
        // Maintain legacy key for existing wellbeing screens until they are fully renamed.
        calmTokens: quest.reward.type === 'brainpower'
          ? (prev.calmTokens ?? prev.brainpowerTokens) + quest.reward.amount
          : prev.calmTokens,
        xp: quest.reward.type === 'xp' ? prev.xp + quest.reward.amount : prev.xp,
        stats: {
          ...prev.stats,
          totalBrainpowerTokensEarned: (prev.stats?.totalBrainpowerTokensEarned || 0)
            + (quest.reward.type === 'brainpower' ? quest.reward.amount : 0),
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
    const earnedBrainpowerTokens = selectedLevel.isPractice ? 0 : stars;
    const islandId = selectedIsland.id;
    const levelId = selectedLevel.id;
    const nextIslandId = islandId + 1;
    const islandUnlockedName = selectedLevel.isBoss && nextIslandId <= ISLANDS.length
      ? ISLANDS.find(island => island.id === nextIslandId)?.name
      : undefined;
    const achievementsUnlocked: string[] = [];

    setPlayer(prev => {
      const previousEarned = prev.achievementState?.earned ?? prev.achievements ?? [];
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
        totalBrainpowerTokensEarned: (prev.stats?.totalBrainpowerTokensEarned || 0) + earnedBrainpowerTokens,
      };

      const unlockedIslands = prev.unlockedIslands.includes(nextIslandId) || !selectedLevel.isBoss
        ? prev.unlockedIslands
        : [...prev.unlockedIslands, nextIslandId].filter(id => id <= ISLANDS.length);
      const completedLevelsForIsland = prev.completedLevels[islandId] || [];
      const nextCompletedLevels = {
        ...prev.completedLevels,
        [islandId]: completedLevelsForIsland.includes(levelId)
          ? completedLevelsForIsland
          : [...completedLevelsForIsland, levelId],
      };
      const levelStarKey = `${islandId}-${levelId}`;
      const nextLevelStars = {
        ...prev.levelStars,
        [levelStarKey]: Math.max(prev.levelStars[levelStarKey] || 0, stars),
      };

      const nextBase: PlayerData = {
        ...prev,
        xp: progressionResult.currentXp,
        level: progressionResult.newLevel,
        brainpowerTokens: prev.brainpowerTokens + earnedBrainpowerTokens,
        calmTokens: (prev.calmTokens ?? prev.brainpowerTokens) + earnedBrainpowerTokens,
        unlockedIslands,
        completedLevels: nextCompletedLevels,
        levelStars: nextLevelStars,
        dailyQuests: updatedQuests,
        stats,
        achievements: prev.achievements || [],
      };

      const achievementState = reconcileAchievementState(nextBase);
      const newlyUnlocked = achievementState.earned.filter((id) => !previousEarned.includes(id));
      achievementsUnlocked.splice(0, achievementsUnlocked.length, ...newlyUnlocked);

      return {
        ...nextBase,
        achievementState,
        achievements: achievementState.earned,
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
      hintsUsed: metrics.hintsUsed,
      mistakes: metrics.mistakes,
      timeMs: metrics.timeMs,
      completed: true,
      brainpowerTokensEarned: earnedBrainpowerTokens,
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
    applyGameVictory,
  };
};
