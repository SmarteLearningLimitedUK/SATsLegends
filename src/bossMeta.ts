import { BOSS_ASSETS, BossAssetId, BossPose } from './assets/bosses';
import { MiniGameType } from './types';

export interface BossEncounter {
  assetId: BossAssetId;
  name: string;
  title: string;
  glowClass: string;
  chipClass: string;
}

export const BOSS_ENCOUNTERS: Partial<Record<MiniGameType, BossEncounter>> = {
  tower_of_factors: {
    assetId: 'croc_boss',
    name: 'Bogjaw Brute',
    title: 'Factors Boss',
    glowClass: 'from-lime-300/22 via-emerald-300/10 to-transparent',
    chipClass: 'border-lime-200/35 bg-lime-100/14 text-lime-100',
  },
  fraction_match: {
    assetId: 'jelly',
    name: 'Mirror Jelly',
    title: 'Crystal Boss',
    glowClass: 'from-fuchsia-300/24 via-violet-300/12 to-transparent',
    chipClass: 'border-fuchsia-200/35 bg-fuchsia-100/14 text-fuchsia-100',
  },
  transform_temple: {
    assetId: 'cyclops_slime',
    name: 'Cyclops Sentinel',
    title: 'Temple Boss',
    glowClass: 'from-amber-300/24 via-orange-300/12 to-transparent',
    chipClass: 'border-amber-200/35 bg-amber-100/14 text-amber-100',
  },
  scale_safari: {
    assetId: 'hydra',
    name: 'Scale Hydra',
    title: 'Oasis Boss',
    glowClass: 'from-cyan-300/24 via-lime-300/12 to-transparent',
    chipClass: 'border-cyan-200/35 bg-cyan-100/14 text-cyan-100',
  },
  chart_chase: {
    assetId: 'croc_boss',
    name: 'Ledgermaw',
    title: 'City Boss',
    glowClass: 'from-sky-300/22 via-indigo-300/12 to-transparent',
    chipClass: 'border-sky-200/35 bg-sky-100/14 text-sky-100',
  },
  matrix_match: {
    assetId: 'cyclops_slime',
    name: 'Oracle Slime',
    title: 'Final Boss',
    glowClass: 'from-violet-300/22 via-fuchsia-300/10 to-transparent',
    chipClass: 'border-violet-200/35 bg-violet-100/14 text-violet-100',
  },
};

export const getBossEncounter = (gameType?: MiniGameType | null) => (
  gameType ? BOSS_ENCOUNTERS[gameType] : undefined
);

export const resolveBossPose = (assetId: BossAssetId, pose: BossPose) => (
  BOSS_ASSETS[assetId].poses[pose]
    || BOSS_ASSETS[assetId].poses.neutral
    || BOSS_ASSETS[assetId].poses.victory
    || Object.values(BOSS_ASSETS[assetId].poses)[0]
    || ''
);

