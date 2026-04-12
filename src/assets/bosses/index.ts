import goblinBoss from './goblin.png';

export type BossPose = 'neutral' | 'attack' | 'happy' | 'victory' | 'defeat' | 'dazed';

export const BOSS_ASSETS = {
  croc_boss: {
    id: 'croc_boss',
    poses: {
      neutral: goblinBoss,
      attack: goblinBoss,
      happy: goblinBoss,
      victory: goblinBoss,
      defeat: goblinBoss,
      dazed: goblinBoss,
    },
  },
  jelly: {
    id: 'jelly',
    poses: {
      neutral: goblinBoss,
      attack: goblinBoss,
      happy: goblinBoss,
      victory: goblinBoss,
      defeat: goblinBoss,
      dazed: goblinBoss,
    },
  },
  hydra: {
    id: 'hydra',
    poses: {
      neutral: goblinBoss,
      attack: goblinBoss,
      happy: goblinBoss,
      victory: goblinBoss,
      defeat: goblinBoss,
      dazed: goblinBoss,
    },
  },
  cyclops_slime: {
    id: 'cyclops_slime',
    poses: {
      neutral: goblinBoss,
      attack: goblinBoss,
      happy: goblinBoss,
      victory: goblinBoss,
      defeat: goblinBoss,
      dazed: goblinBoss,
    },
  },
};

export type BossAssetId = keyof typeof BOSS_ASSETS;
