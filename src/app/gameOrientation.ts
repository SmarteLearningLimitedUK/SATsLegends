import type { LevelData } from '../types';

export type GameOrientation = 'portrait' | 'landscape';

export function getGameOrientation(level: Pick<LevelData, 'blueprintKey' | 'gameType'> | null | undefined): GameOrientation {
  // A shared legacy gameType must not override a game's explicit blueprint.
  return level?.blueprintKey === 'take_out_rush' || (!level?.blueprintKey && level?.gameType === 'take_out_rush') || level?.blueprintKey === 'place_value_panic' || level?.blueprintKey === 'rounding_rocket' || level?.blueprintKey === 'prime_pop' || level?.gameType === 'prime_pop'
    ? 'portrait' : 'landscape';
}

export function needsGameRotation(orientation: GameOrientation, width: number, height: number): boolean {
  if (width <= 0 || height <= 0) return false;
  return orientation === 'landscape'
    ? width < 700 && height > width
    : height < 700 && width < 1100 && width > height;
}
