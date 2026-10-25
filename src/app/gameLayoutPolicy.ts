import type { LevelData } from '../types';

/** Campaign migration boundary. Source-only/dormant games retain the legacy
 * contract until separately exercised; every listed game is in the QA catalog. */
const FLOW_GAMES = new Set([
  'place_value_panic',
  'number_line_ninja',
  'prime_pop',
  'rounding_rocket',
  'maths_vs_zombies',
  'take_out_rush',
  'fraction_forge',
  'match3_equivalence',
  'percent_power',
  'simplify_sprint',
  'angle_arena',
  'polygon_palace',
  'area_architect',
  'rotation_relay',
  'coordinates_quest',
  'conversion_canyon',
  'perimeter_path',
  'mean_machine',
  'graph_grabber',
  'line_graph_lab',
  'data_detective',
  'factor_frenzy',
  'multiplication_mine',
  'order_ops_arena',
  'formula_forge',
  'remainder_run',
  'time_keeper_cove',
  'problem_pyramid',
  'unit_mixer',
  'change_counter',
  'crystal_core',
  'mirror_gate',
  'matrix_match',
  'potion_panic',
  'share_splitter',
  'ratio_fractions',
  'scale_builder',
]);

export function usesFlowGameLayout(level: Pick<LevelData, 'blueprintKey'> | null | undefined): boolean {
  return FLOW_GAMES.has(level?.blueprintKey ?? '');
}
