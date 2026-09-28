import goblin from './goblin.webp';
import rhino from './rhino.webp';
import zombie from './zombie.webp';
import jelly from './jelly.webp';
import cyclopsSlime from './cyclops-slime.webp';

/** Current outlined character cutouts; every reaction keeps the same source. */
export const COHESIVE_ENEMIES = { goblin, rhino, zombie, jelly, cyclopsSlime } as const;

export const resolveEncounterEnemyArt = (assetId: string): string => (
  assetId === 'jelly' ? jelly : assetId === 'cyclops_slime' ? cyclopsSlime : goblin
);
