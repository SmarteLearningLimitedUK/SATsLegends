import { SupportedBossGameType } from '../../games/bossEncounterTypes';

export type BossThemeVariant =
  | 'fire'
  | 'ice'
  | 'forest'
  | 'crystal'
  | 'electric'
  | 'dark';

export const getBossThemeVariant = (gameType?: SupportedBossGameType | null): BossThemeVariant => {
  switch (gameType) {
    case 'crystal_core':
      return 'crystal';
    case 'mirror_gate':
      return 'fire';
    case 'matrix_match':
      return 'electric';
    default:
      return 'dark';
  }
};

