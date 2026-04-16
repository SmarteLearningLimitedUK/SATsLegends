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
    title: 'Tower Of Factors',
    glowClass: 'from-lime-300/22 via-emerald-300/10 to-transparent',
    chipClass: 'border-lime-200/35 bg-lime-100/14 text-lime-100',
  },
  crystal_core: {
    assetId: 'jelly',
    name: 'SATs Paper 1: Arithmetic',
    title: 'SATs Paper 1: Arithmetic',
    glowClass: 'from-cyan-300/24 via-sky-300/12 to-transparent',
    chipClass: 'border-cyan-200/35 bg-cyan-100/14 text-cyan-100',
  },
  mirror_gate: {
    assetId: 'cyclops_slime',
    name: 'SATs Paper 2: Reasoning',
    title: 'SATs Paper 2: Reasoning',
    glowClass: 'from-amber-300/24 via-orange-300/12 to-transparent',
    chipClass: 'border-amber-200/35 bg-amber-100/14 text-amber-100',
  },
  scales_of_the_sun: {
    assetId: 'hydra',
    name: 'Sunscale Hydra',
    title: 'Scales Of The Sun',
    glowClass: 'from-cyan-300/24 via-lime-300/12 to-transparent',
    chipClass: 'border-cyan-200/35 bg-cyan-100/14 text-cyan-100',
  },
  observatory_overload: {
    assetId: 'croc_boss',
    name: 'Constelligator',
    title: 'Observatory Overload',
    glowClass: 'from-sky-300/22 via-indigo-300/12 to-transparent',
    chipClass: 'border-sky-200/35 bg-sky-100/14 text-sky-100',
  },
  matrix_match: {
    assetId: 'cyclops_slime',
    name: 'SATs Paper 3: Reasoning',
    title: 'SATs Paper 3: Reasoning',
    glowClass: 'from-sky-300/22 via-cyan-300/10 to-transparent',
    chipClass: 'border-sky-200/35 bg-sky-100/14 text-sky-100',
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
