import { MiniGameType } from '../types';

export type SupportedBossGameType =
  | 'crystal_core'
  | 'mirror_gate'
  | 'matrix_match';

export const isBossEncounterGameType = (gameType?: MiniGameType | null): gameType is SupportedBossGameType => (
  ['crystal_core', 'mirror_gate', 'matrix_match'].includes(gameType || '')
);
