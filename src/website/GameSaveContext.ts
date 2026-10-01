import { createContext, useContext } from 'react';
import type { PlayerData } from '../types';
import type { LevelProgress, PlayerProfile } from '../lib/progression/types';
export type ProgressionSnapshot = { player: PlayerProfile; levels: Record<string, LevelProgress>; totalStars: number };
export type ProgressSnapshot = { player: PlayerData; progression: ProgressionSnapshot };
export type GameSave = { initialPlayer: PlayerData; storageKey: string; queue: (snapshot: ProgressSnapshot) => void };
export const GameSaveContext = createContext<GameSave | null>(null);
export const useGameSave = () => useContext(GameSaveContext);
