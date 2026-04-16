import { MiniGameType } from './types';
import crystalCoreBackground from './assets/maps/backgroundsforgames/crystal core.jpg';
import mirrorGateBackground from './assets/maps/backgroundsforgames/Multi Step Marathon.jpg';
import matrixMatchBackground from './assets/maps/backgroundsforgames/End Trial.jpg';

export interface GameSceneMeta {
  background?: string;
  glow: string;
  tint: string;
  panelTint: string;
}

const NUMBER_SCENE: GameSceneMeta = {
  glow: 'from-lime-300/24 via-cyan-300/12 to-transparent',
  tint: 'from-emerald-300/18 via-cyan-300/10 to-slate-950/92',
  panelTint: 'from-emerald-200/16 via-sky-300/10 to-transparent',
};

const FRACTION_SCENE: GameSceneMeta = {
  glow: 'from-cyan-300/22 via-sky-300/12 to-transparent',
  tint: 'from-sky-300/16 via-indigo-300/10 to-slate-950/92',
  panelTint: 'from-cyan-200/16 via-sky-300/10 to-transparent',
};

const GEOMETRY_SCENE: GameSceneMeta = {
  glow: 'from-amber-300/22 via-orange-300/12 to-transparent',
  tint: 'from-amber-200/16 via-rose-300/10 to-slate-950/92',
  panelTint: 'from-yellow-200/14 via-orange-300/10 to-transparent',
};

const RATIO_SCENE: GameSceneMeta = {
  glow: 'from-yellow-200/24 via-orange-300/12 to-transparent',
  tint: 'from-yellow-200/16 via-amber-300/10 to-slate-950/92',
  panelTint: 'from-yellow-100/16 via-amber-200/10 to-transparent',
};

const DATA_SCENE: GameSceneMeta = {
  glow: 'from-sky-300/22 via-indigo-300/12 to-transparent',
  tint: 'from-sky-300/14 via-blue-300/10 to-slate-950/92',
  panelTint: 'from-cyan-200/16 via-sky-300/10 to-transparent',
};

const REASONING_SCENE: GameSceneMeta = {
  glow: 'from-emerald-300/22 via-sky-300/12 to-transparent',
  tint: 'from-emerald-200/16 via-teal-300/10 to-slate-950/92',
  panelTint: 'from-emerald-200/16 via-sky-300/10 to-transparent',
};

const CHANGE_COUNTER_SCENE: GameSceneMeta = REASONING_SCENE;

const SCALE_SCENE: GameSceneMeta = RATIO_SCENE;

const SCALE_BUILDER_SCENE: GameSceneMeta = RATIO_SCENE;

const CHART_CHASE_SCENE: GameSceneMeta = DATA_SCENE;

export const GAME_SCENE_META: Record<MiniGameType, GameSceneMeta> = {
  quiz: NUMBER_SCENE,
  potion_pour: RATIO_SCENE,
  cloud_collapse: FRACTION_SCENE,
  logic_sort: REASONING_SCENE,
  matrix_match: {
    ...REASONING_SCENE,
    background: matrixMatchBackground,
  },
  take_out_rush: FRACTION_SCENE,
  fraction_match: FRACTION_SCENE,
  crystal_core: {
    ...FRACTION_SCENE,
    background: crystalCoreBackground,
  },
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
  coordinate_quest: GEOMETRY_SCENE,
  transform_temple: GEOMETRY_SCENE,
  mirror_gate: {
    ...REASONING_SCENE,
    background: mirrorGateBackground,
  },
  scale_safari: SCALE_BUILDER_SCENE,
  scales_of_the_sun: SCALE_SCENE,
  graph_grabber: CHART_CHASE_SCENE,
  observatory_overload: DATA_SCENE,
  mean_machine: DATA_SCENE,
  percent_power: RATIO_SCENE,
  area_architect: GEOMETRY_SCENE,
  ratio_fractions: RATIO_SCENE,
  equation_grove: REASONING_SCENE,
  rule_runner: REASONING_SCENE,
  formula_forge: NUMBER_SCENE,
  unit_mixer: REASONING_SCENE,
  change_counter: CHANGE_COUNTER_SCENE,
  reasoning_quest: REASONING_SCENE,
};
