import barratt from './premium/barratt-v2.png';
import bran from './premium/bran-v2.png';
import mochi from './premium/mochi-v2.png';
import vex from './premium/vex-v2.png';

/** Original identities only. Enemy identities are deliberately not remapped. */
export const ORIGINAL_HEROES = { barratt, bran, mochi, vex } as const;
export type OriginalHeroId = keyof typeof ORIGINAL_HEROES;
export function originalHeroId(identity: unknown): OriginalHeroId {
  return typeof identity === 'string' && Object.hasOwn(ORIGINAL_HEROES, identity)
    ? identity as OriginalHeroId : 'barratt';
}
export function originalHeroSource(identity: string): string | undefined {
  const key = identity === 'deer' ? 'barratt' : identity;
  return Object.hasOwn(ORIGINAL_HEROES, key) ? ORIGINAL_HEROES[key as OriginalHeroId] : undefined;
}
