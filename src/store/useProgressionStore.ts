import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { DEFAULT_AVATAR_ID } from '../assets/characters';
import {
  CompleteLevelArgs,
  CompleteLevelResult,
  LevelProgress,
  PlayerProfile,
  StarCount,
} from '../lib/progression/types';
import { completeLevel } from '../lib/progression/completeLevel';
import { applyXpGain } from '../lib/progression/applyXpGain';

const STORAGE_KEY = 'sats-legends-save';

type ProgressionState = {
  player: PlayerProfile;
  levels: Record<string, LevelProgress>;
  totalStars: number;
  completeLevel: (args: CompleteLevelArgs) => CompleteLevelResult;
  getLevelProgress: (levelId: string) => LevelProgress | undefined;
  setAvatarId: (avatarId: string) => void;
  grantXp: (amount: number) => void;
  hydrateFromLegacy: (payload: {
    levelStars: Record<string, number>;
    completedLevels: Record<number, number[]>;
    playerLevel: number;
    playerXp: number;
  }) => void;
  totalStarsEarned: () => number;
  hasLevelCompleted: (levelId: string) => boolean;
  getBestStars: (levelId: string) => StarCount;
  canUnlockBossIsland: (requiredStars: number) => boolean;
};

const createDefaultPlayer = (): PlayerProfile => ({
  avatarId: DEFAULT_AVATAR_ID,
  level: 1,
  currentXp: 0,
  totalXpEarned: 0,
});

const sumStars = (levels: Record<string, LevelProgress>) =>
  Object.values(levels).reduce((total, progress) => total + progress.bestStars, 0);

export const useProgressionStore = create<ProgressionState>()(
  persist(
    (set, get) => ({
      player: createDefaultPlayer(),
      levels: {},
      totalStars: 0,
      completeLevel: (args) => {
        const { player, levels } = get();
        const existingProgress = levels[args.levelId];
        const outcome = completeLevel(args, player, existingProgress);
        const nextLevels = { ...levels, [args.levelId]: outcome.updatedProgress };
        const totalStars = sumStars(nextLevels);

        set({
          player: outcome.updatedPlayer,
          levels: nextLevels,
          totalStars,
        });

        return outcome.result;
      },
      getLevelProgress: (levelId) => get().levels[levelId],
      setAvatarId: (avatarId) => {
        set((state) => ({
          player: {
            ...state.player,
            avatarId,
          },
        }));
      },
      grantXp: (amount) => {
        if (amount <= 0) return;
        set((state) => {
          const outcome = applyXpGain(state.player, amount);
          return {
            player: outcome.player,
            totalStars: state.totalStars,
          };
        });
      },
      hydrateFromLegacy: ({ levelStars, completedLevels, playerLevel, playerXp }) => {
        if (Object.keys(get().levels).length > 0) return;
        const nextLevels: Record<string, LevelProgress> = {};
        Object.entries(levelStars).forEach(([key, stars]) => {
          nextLevels[key] = {
            levelId: key,
            unlocked: true,
            completed: true,
            bestStars: Math.min(3, Math.max(0, Math.round(stars))) as StarCount,
            bestScore: 0,
            bestAccuracy: 0,
            bestTimeMs: null,
            timesPlayed: 0,
            firstClearXpAwarded: true,
          };
        });
        Object.entries(completedLevels).forEach(([islandId, levels]) => {
          levels.forEach((levelId) => {
            const key = `${islandId}-${levelId}`;
            if (!nextLevels[key]) {
              nextLevels[key] = {
                levelId: key,
                unlocked: true,
                completed: true,
                bestStars: 1,
                bestScore: 0,
                bestAccuracy: 0,
                bestTimeMs: null,
                timesPlayed: 0,
                firstClearXpAwarded: true,
              };
            }
          });
        });
        set({
          levels: nextLevels,
          totalStars: sumStars(nextLevels),
          player: {
            ...get().player,
            level: Math.max(1, playerLevel || 1),
            currentXp: Math.max(0, playerXp || 0),
          },
        });
      },
      totalStarsEarned: () => sumStars(get().levels),
      hasLevelCompleted: (levelId) => Boolean(get().levels[levelId]?.completed),
      getBestStars: (levelId) => get().levels[levelId]?.bestStars ?? 0,
      canUnlockBossIsland: (requiredStars) => sumStars(get().levels) >= requiredStars,
    }),
    {
      name: STORAGE_KEY,
      version: 1,
      partialize: (state) => ({
        player: state.player,
        levels: state.levels,
        totalStars: state.totalStars,
      }),
    },
  ),
);
