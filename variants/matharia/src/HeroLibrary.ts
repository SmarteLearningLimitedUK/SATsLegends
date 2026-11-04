import {asset} from './assets';

/** Retain the existing selectable identities and unlock data with independent art. */
export const ORIGINAL_HEROES = {
  barratt:asset('heroes','hero_bran_idle'),
  bran:asset('heroes','hero_mage_idle'),
  mochi:asset('heroes','hero_dragon_chef'),
  vex:asset('heroes','hero_rhino_idle'),
} as const;
export type OriginalHeroId=keyof typeof ORIGINAL_HEROES;
export function originalHeroId(identity:unknown):OriginalHeroId {
  return typeof identity==='string'&&Object.hasOwn(ORIGINAL_HEROES,identity)?identity as OriginalHeroId:'barratt';
}
export function originalHeroSource(identity:string):string|undefined {
  const key=identity==='deer'?'barratt':identity;
  return Object.hasOwn(ORIGINAL_HEROES,key)?ORIGINAL_HEROES[key as OriginalHeroId]:undefined;
}
