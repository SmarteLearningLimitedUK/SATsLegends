/** A compact sound palette, shared by every playable minigame. */
export type SoundMaterial = 'arcane' | 'metal' | 'stone' | 'water' | 'wood' | 'engine' | 'digital' | 'organic' | 'paper';

export interface GameSoundProfile {
  id: string;
  material: SoundMaterial;
  /** Frequency multiplier for the shared effects. */
  pitch: number;
  /** Timbre/attack emphasis, from restrained (0) to bright (1). */
  accent: number;
}

// Blueprint keys distinguish games that intentionally share the same gameType.
// These timbres remain the fallback if a recorded cue cannot load. Recorded
// effects are selected separately by blueprint in gameSampleLibrary.ts.
const profiles: Record<string, GameSoundProfile> = {
  angle_arena:        { id: 'angle_arena',        material: 'metal',   pitch: 1.07, accent: .55 },
  area_architect:     { id: 'area_architect',     material: 'wood',    pitch: .91, accent: .59 },
  change_counter:     { id: 'change_counter',     material: 'metal',   pitch: 1.21, accent: .38 },
  chart_challenge:    { id: 'chart_challenge',    material: 'paper',   pitch: 1.15, accent: .36 },
  conversion_canyon:  { id: 'conversion_canyon',  material: 'metal',   pitch: .78, accent: .70 },
  coordinates_quest:  { id: 'coordinates_quest',  material: 'arcane',  pitch: 1.16, accent: .48 },
  crystal_core:       { id: 'crystal_core',       material: 'arcane',  pitch: .80, accent: .90 },
  data_detective:     { id: 'data_detective',     material: 'paper',   pitch: .82, accent: .47 },
  factor_frenzy:      { id: 'factor_frenzy',      material: 'digital', pitch: 1.26, accent: .62 },
  formula_forge:      { id: 'formula_forge',      material: 'metal',   pitch: .81, accent: .63 },
  fraction_forge:     { id: 'fraction_forge',     material: 'metal',   pitch: .76, accent: .85 },
  graph_grabber:      { id: 'graph_grabber',      material: 'paper',   pitch: 1.20, accent: .30 },
  line_graph_lab:     { id: 'line_graph_lab',     material: 'digital', pitch: .98, accent: .47 },
  match3_equivalence: { id: 'match3_equivalence', material: 'digital', pitch: 1.12, accent: .55 },
  maths_vs_zombies:   { id: 'maths_vs_zombies',   material: 'arcane',  pitch: .86, accent: .68 },
  matrix_match:       { id: 'matrix_match',       material: 'digital', pitch: 1.05, accent: .65 },
  mean_machine:       { id: 'mean_machine',       material: 'metal',   pitch: .90, accent: .52 },
  mirror_gate:        { id: 'mirror_gate',        material: 'arcane',  pitch: 1.12, accent: .75 },
  multiplication_mine:{ id: 'multiplication_mine',material:'stone',   pitch: .75, accent: .85 },
  number_line_ninja:  { id: 'number_line_ninja',  material: 'metal',   pitch: 1.18, accent: .49 },
  order_ops_arena:    { id: 'order_ops_arena',    material: 'metal',   pitch: 1.18, accent: .73 },
  percent_power:      { id: 'percent_power',      material: 'digital', pitch: .82, accent: .82 },
  perimeter_path:     { id: 'perimeter_path',     material: 'stone',   pitch: 1.06, accent: .41 },
  place_value_panic:  { id: 'place_value_panic',  material: 'digital', pitch: 1.04, accent: .54 },
  polygon_palace:     { id: 'polygon_palace',     material: 'stone',   pitch: .86, accent: .67 },
  potion_panic:       { id: 'potion_panic',       material: 'water',   pitch: .91, accent: .73 },
  prime_pop:          { id: 'prime_pop',          material: 'organic', pitch: 1.16, accent: .62 },
  problem_pyramid:    { id: 'problem_pyramid',    material: 'stone',   pitch: .87, accent: .54 },
  ratio_fractions:    { id: 'ratio_fractions',    material: 'engine',  pitch: 1.01, accent: .70 },
  remainder_run:      { id: 'remainder_run',      material: 'engine',  pitch: 1.23, accent: .64 },
  rotation_relay:     { id: 'rotation_relay',     material: 'digital', pitch: 1.20, accent: .58 },
  rounding_rocket:    { id: 'rounding_rocket',    material: 'engine',  pitch: .90, accent: .76 },
  scale_builder:      { id: 'scale_builder',      material: 'metal',   pitch: .95, accent: .60 },
  share_splitter:     { id: 'share_splitter',     material: 'wood',    pitch: .98, accent: .44 },
  simplify_sprint:    { id: 'simplify_sprint',    material: 'engine',  pitch: 1.26, accent: .52 },
  take_out_rush:      { id: 'take_out_rush',      material: 'wood',    pitch: 1.08, accent: .47 },
  time_keeper_cove:   { id: 'time_keeper_cove',   material: 'metal',   pitch: 1.10, accent: .36 },
  unit_mixer:         { id: 'unit_mixer',         material: 'stone',   pitch: .77, accent: .88 },
};

const defaultProfile: GameSoundProfile = { id: 'default', material: 'digital', pitch: 1, accent: .5 };

export const getGameSoundProfile = (blueprintKey: string | null | undefined): GameSoundProfile =>
  (blueprintKey && profiles[blueprintKey]) || defaultProfile;
