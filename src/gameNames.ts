import { MiniGameType } from './types';

export const CANONICAL_GAME_LABELS: Partial<Record<MiniGameType, string>> = {
  potion_pour: 'Potion Panic',
  cloud_collapse: 'Crystal Match',
  logic_sort: 'Logic Sort',
  matrix_match: 'Reasoning 2',
  take_out_rush: 'Take-Out Rush',
  fraction_match: 'Crystal Match',
  crystal_core: 'SATs Paper 1',
  prime_pop: 'Prime Pop',
  angle_arena: 'Angle Arena',
  polygon_palace: 'Polygon Palace',
  data_dungeon: 'Data Dungeon',
  monster_market: 'Monster Market',
  tower_of_factors: 'Factor Forge',
  measurement_forge: 'Conversion Canyon',
  timekeeper_temple: 'Chrono Dash: Time Trial',
  ratio_rapids: 'Ratio Racer',
  remainder_run: 'Remainder Run',
  place_value_peaks: 'Decimal Sniper',
  calculation_clash: 'Calculation Cup',
  coordinate_quest: 'Coordinates Quest',
  transform_temple: 'Rotation Station',
  mirror_gate: 'SATs Paper 2',
  scale_safari: 'Scale Builder',
  scales_of_the_sun: 'Scale Master',
  graph_grabber: 'Graph Grabber',
  observatory_overload: 'Data Observatory',
  mean_machine: 'Mean Machine',
  equation_grove: 'Order Ops Arena',
  rule_runner: 'Rule Runner',
  percent_power: 'Percent Power',
  area_architect: 'Area Architect',
  ratio_fractions: 'Ratio Racer',
  formula_forge: 'Formula Forge',
  unit_mixer: 'Lava Path',
  change_counter: 'Change Counter',
  reasoning_quest: 'Reasoning Quest',
};

export const getCanonicalGameLabel = (gameType?: MiniGameType | null) => (
  gameType ? CANONICAL_GAME_LABELS[gameType] ?? gameType.replace(/_/g, ' ') : ''
);

