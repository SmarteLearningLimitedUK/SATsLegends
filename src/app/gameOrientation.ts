import type { LevelData } from '../types';

export type GameOrientation = 'portrait' | 'landscape';

// Phone compositions in the current production UI brief. Paper layouts are
// portrait preferred, with a separate adaptive policy below.
const PORTRAIT_GAMES = new Set([
  'place_value_panic','prime_pop','rounding_rocket','take_out_rush',
  'match3_equivalence','percent_power','angle_arena','polygon_palace',
  'area_architect','coordinates_quest','conversion_canyon','mean_machine',
  'factor_frenzy','order_ops_arena','formula_forge','time_keeper_cove',
  'problem_pyramid','change_counter','potion_panic',
  'crystal_core','mirror_gate','matrix_match',
]);

/** The papers favour portrait but wide diagrams can use either orientation. */
export function allowsAdaptiveGameOrientation(level: Pick<LevelData, 'blueprintKey' | 'gameType'> | null | undefined): boolean {
  return ['crystal_core', 'mirror_gate', 'matrix_match'].includes(level?.blueprintKey ?? level?.gameType ?? '');
}

export function getGameOrientation(level: Pick<LevelData, 'blueprintKey' | 'gameType'> | null | undefined): GameOrientation {
  // A shared legacy gameType must not override a game's explicit blueprint.
  return PORTRAIT_GAMES.has(level?.blueprintKey ?? level?.gameType ?? '') ? 'portrait' : 'landscape';
}

export function needsGameRotation(orientation: GameOrientation, width: number, height: number): boolean {
  if (width <= 0 || height <= 0) return false;
  return orientation === 'landscape'
    ? width < 700 && height > width
    : height < 700 && width < 1100 && width > height;
}
