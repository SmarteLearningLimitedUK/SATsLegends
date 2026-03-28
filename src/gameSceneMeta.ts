import { MiniGameType } from './types';
import world01Map from './assets/maps/forect.jpg';
import world02Map from './assets/maps/reef2.jpg';
import world03Map from './assets/maps/castle.jpg';
import world04Map from './assets/maps/harbour.jpg';
import world05Map from './assets/maps/desert.jpg';
import world06Map from './assets/maps/volcano2.jpg';

export interface GameSceneMeta {
  background: string;
  glow: string;
  tint: string;
  panelTint: string;
}

const NUMBER_SCENE: GameSceneMeta = {
  background: world01Map,
  glow: 'from-lime-300/24 via-cyan-300/12 to-transparent',
  tint: 'from-emerald-300/18 via-cyan-300/10 to-slate-950/92',
  panelTint: 'from-emerald-200/16 via-sky-300/10 to-transparent',
};

const FRACTION_SCENE: GameSceneMeta = {
  background: world02Map,
  glow: 'from-cyan-300/22 via-sky-300/12 to-transparent',
  tint: 'from-sky-300/16 via-indigo-300/10 to-slate-950/92',
  panelTint: 'from-cyan-200/16 via-sky-300/10 to-transparent',
};

const GEOMETRY_SCENE: GameSceneMeta = {
  background: world03Map,
  glow: 'from-amber-300/22 via-orange-300/12 to-transparent',
  tint: 'from-amber-200/16 via-rose-300/10 to-slate-950/92',
  panelTint: 'from-yellow-200/14 via-orange-300/10 to-transparent',
};

const RATIO_SCENE: GameSceneMeta = {
  background: world04Map,
  glow: 'from-yellow-200/24 via-orange-300/12 to-transparent',
  tint: 'from-yellow-200/16 via-amber-300/10 to-slate-950/92',
  panelTint: 'from-yellow-100/16 via-amber-200/10 to-transparent',
};

const DATA_SCENE: GameSceneMeta = {
  background: world05Map,
  glow: 'from-sky-300/22 via-indigo-300/12 to-transparent',
  tint: 'from-sky-300/14 via-blue-300/10 to-slate-950/92',
  panelTint: 'from-cyan-200/16 via-sky-300/10 to-transparent',
};

const REASONING_SCENE: GameSceneMeta = {
  background: world06Map,
  glow: 'from-emerald-300/22 via-sky-300/12 to-transparent',
  tint: 'from-emerald-200/16 via-teal-300/10 to-slate-950/92',
  panelTint: 'from-emerald-200/16 via-sky-300/10 to-transparent',
};

export const GAME_SCENE_META: Record<MiniGameType, GameSceneMeta> = {
  quiz: NUMBER_SCENE,
  potion_pour: RATIO_SCENE,
  cloud_collapse: FRACTION_SCENE,
  sequence_sprint: REASONING_SCENE,
  logic_sort: REASONING_SCENE,
  shape_shift: REASONING_SCENE,
  matrix_match: REASONING_SCENE,
  take_out_rush: FRACTION_SCENE,
  fraction_match: FRACTION_SCENE,
  crystal_core: FRACTION_SCENE,
  prime_pop: NUMBER_SCENE,
  angle_arena: GEOMETRY_SCENE,
  polygon_palace: GEOMETRY_SCENE,
  data_dungeon: DATA_SCENE,
  monster_market: NUMBER_SCENE,
  tower_of_factors: NUMBER_SCENE,
  measurement_forge: RATIO_SCENE,
  timekeeper_temple: DATA_SCENE,
  ratio_rapids: RATIO_SCENE,
  place_value_peaks: NUMBER_SCENE,
  calculation_clash: NUMBER_SCENE,
  percent_pulse: FRACTION_SCENE,
  coordinate_quest: GEOMETRY_SCENE,
  transform_temple: GEOMETRY_SCENE,
  mirror_gate: GEOMETRY_SCENE,
  scale_safari: RATIO_SCENE,
  scales_of_the_sun: RATIO_SCENE,
  chart_chase: DATA_SCENE,
  observatory_overload: DATA_SCENE,
  mean_machine: DATA_SCENE,
  equation_grove: REASONING_SCENE,
  rule_runner: REASONING_SCENE,
};
