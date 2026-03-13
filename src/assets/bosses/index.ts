import crocAttack from './croc boss/attack.png';
import crocDazed from './croc boss/dazed.png';
import crocDefeat from './croc boss/defeat.png';
import crocHappy from './croc boss/happy.png';
import crocNeutral from './croc boss/neutral.png';
import crocSad from './croc boss/sad.png';
import crocVictory from './croc boss/victory.png';
import cyclopsAttack from './cyclops slime/attack.png';
import cyclopsDazed from './cyclops slime/dazed.png';
import cyclopsDefeated from './cyclops slime/defeated.png';
import cyclopsHappy from './cyclops slime/happy.png';
import cyclopsNeutral from './cyclops slime/neutral.png';
import cyclopsVictory from './cyclops slime/victory.png';
import hydraDazed from './hydra/dazed.png';
import hydraDefeat from './hydra/defeat.png';
import hydraHappy from './hydra/happy.png';
import hydraNeutral from './hydra/neutral.png';
import hydraVictory from './hydra/victory.png';
import jellyAttack from './jelly/attack.png';
import jellyDazed from './jelly/dazed.png';
import jellyDefeat from './jelly/defeat.png';
import jellyNeutral from './jelly/neutral.png';
import jellyVictory from './jelly/victory.png';

export type BossAssetId = 'croc_boss' | 'cyclops_slime' | 'hydra' | 'jelly';
export type BossPose = 'neutral' | 'attack' | 'dazed' | 'happy' | 'sad' | 'defeat' | 'victory';

export interface BossAssetSet {
  poses: Partial<Record<BossPose, string>>;
}

export const BOSS_ASSETS: Record<BossAssetId, BossAssetSet> = {
  croc_boss: {
    poses: {
      attack: crocAttack,
      dazed: crocDazed,
      defeat: crocDefeat,
      happy: crocHappy,
      neutral: crocNeutral,
      sad: crocSad,
      victory: crocVictory,
    },
  },
  cyclops_slime: {
    poses: {
      attack: cyclopsAttack,
      dazed: cyclopsDazed,
      defeat: cyclopsDefeated,
      happy: cyclopsHappy,
      neutral: cyclopsNeutral,
      victory: cyclopsVictory,
    },
  },
  hydra: {
    poses: {
      dazed: hydraDazed,
      defeat: hydraDefeat,
      happy: hydraHappy,
      neutral: hydraNeutral,
      victory: hydraVictory,
    },
  },
  jelly: {
    poses: {
      attack: jellyAttack,
      dazed: jellyDazed,
      defeat: jellyDefeat,
      neutral: jellyNeutral,
      victory: jellyVictory,
    },
  },
};

