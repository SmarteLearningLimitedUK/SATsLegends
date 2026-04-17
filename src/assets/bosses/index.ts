import { pickBossArt } from './library';

export type BossPose = 'neutral' | 'attack' | 'happy' | 'victory' | 'defeat' | 'dazed';

const makeBossAsset = (id: string) => {
  const art = pickBossArt(id);
  return {
    id,
    poses: {
      neutral: art,
      attack: art,
      happy: art,
      victory: art,
      defeat: art,
      dazed: art,
    },
  };
};

export const BOSS_ASSETS = {
  croc_boss: makeBossAsset('croc_boss'),
  jelly: makeBossAsset('jelly'),
  hydra: makeBossAsset('hydra'),
  cyclops_slime: makeBossAsset('cyclops_slime'),
};

export type BossAssetId = keyof typeof BOSS_ASSETS;
