import {originalHeroSource} from './originalHeroes';
import goblin from '../enemies/premium/goblin-v2.png';
import rhino from '../enemies/premium/rhino-v2.png';
import zombie from '../enemies/premium/zombie-v2.png';
import jelly from '../enemies/premium/jelly-v2.png';
import slime from '../enemies/premium/slime-v2.png';
import sentinel from '../enemies/premium/sentinel-v2.png';

export const COHESIVE_ENEMIES = {goblin,rhino,zombie,jelly,slime,sentinel} as const;
export function cohesiveCharacterSource(identity:string):string|undefined {
  return originalHeroSource(identity) ?? COHESIVE_ENEMIES[identity as keyof typeof COHESIVE_ENEMIES];
}
