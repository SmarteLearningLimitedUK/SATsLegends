import { MiniGameType } from '../types';

export type SupportedBossGameType =
  | 'tower_of_factors'
  | 'crystal_core'
  | 'mirror_gate'
  | 'scales_of_the_sun'
  | 'observatory_overload'
  | 'matrix_match';

export const isBossEncounterGameType = (gameType?: MiniGameType | null): gameType is SupportedBossGameType => (
  ['tower_of_factors', 'crystal_core', 'mirror_gate', 'scales_of_the_sun', 'observatory_overload', 'matrix_match'].includes(gameType || '')
);
