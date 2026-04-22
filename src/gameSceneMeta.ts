import { MiniGameType } from './types';
import areaArchitectBackground from './assets/maps/backgroundsforgames/area architect.jpg';
import calculationCupBackground from './assets/maps/backgroundsforgames/Calculation Cup.png';
import changeCounterBackground from './assets/maps/backgroundsforgames/changecounter.jpg';
import chronoDashTimeTrialBackground from './assets/maps/backgroundsforgames/Chrono Dash Time Trial.jpg';
import cloudCollapseBackground from './assets/maps/backgroundsforgames/Cloud Collapse.jpg';
import coordinateQuestBackground from './assets/maps/backgroundsforgames/coordinate quest.jpg';
import crystalCoreBackground from './assets/maps/backgroundsforgames/crystal core.jpg';
import dataDetectiveBackground from './assets/maps/backgroundsforgames/data detective.jpg';
import matrixMatchBackground from './assets/maps/backgroundsforgames/End Trial.jpg';
import fractionForgeBackground from './assets/maps/backgroundsforgames/fraction forge map.jpg';
import graphGrabberBackground from './assets/maps/backgroundsforgames/graph grabber.jpg';
import lineGraphLabBackground from './assets/maps/backgroundsforgames/linegraphlab.jpg';
import meanMachineBackground from './assets/maps/backgroundsforgames/meanmachine.jpg';
import mixedMasteryBackground from './assets/maps/backgroundsforgames/Mixed Mastery.jpg';
import monsterMarketBackground from './assets/maps/backgroundsforgames/Monster Market.png';
import multiStepMarathonBackground from './assets/maps/backgroundsforgames/Multi Step Marathon.jpg';
import orderOpsArenaBackground from './assets/maps/backgroundsforgames/orderopsarena.jpg';
import percentPowerBackground from './assets/maps/backgroundsforgames/percent power.jpg';
import placeValuePanicBackground from './assets/maps/backgroundsforgames/Place Value Panic.png';
import polygonPalaceBackground from './assets/maps/backgroundsforgames/polygon palace.jpg';
import potionPanicBackground from './assets/maps/backgroundsforgames/tableshresplit.png';
import primePopBackground from './assets/maps/backgroundsforgames/primepopbkground.jpg';
import problemPyramidBackground from './assets/maps/backgroundsforgames/problem pyramid.jpg';
import rotationStationBackground from './assets/maps/backgroundsforgames/Rotation Reflection.jpg';
import rotationStationBackground from './assets/maps/backgroundsforgames/rotationstation.jpg';
import scaleBuilderBackground from './assets/maps/backgroundsforgames/scalebuilder-construction.png';
import scaleMasterBackground from './assets/maps/backgroundsforgames/Scale Master.png';
import shareSplitterBackground from './assets/maps/backgroundsforgames/sharesplitterfinal.png';
import takeOutRushBackground from './assets/maps/backgroundsforgames/Take-Out Rush.png';
import lavaPathBackground from './assets/maps/backgroundsforgames/lava-path.jpg';
import towerOfFactorsBackground from './assets/maps/backgroundsforgames/tower of factors.jpg';

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

const withBackground = (scene: GameSceneMeta, background: string): GameSceneMeta => ({
  ...scene,
  background,
});

export const GAME_SCENE_META: Record<MiniGameType, GameSceneMeta> = {
  quiz: withBackground(NUMBER_SCENE, mixedMasteryBackground),
  potion_pour: withBackground(RATIO_SCENE, potionPanicBackground),
  cloud_collapse: withBackground(FRACTION_SCENE, cloudCollapseBackground),
  logic_sort: withBackground(REASONING_SCENE, mixedMasteryBackground),
  matrix_match: withBackground(REASONING_SCENE, matrixMatchBackground),
  take_out_rush: withBackground(FRACTION_SCENE, takeOutRushBackground),
  fraction_match: withBackground(FRACTION_SCENE, fractionForgeBackground),
  crystal_core: withBackground(FRACTION_SCENE, crystalCoreBackground),
  prime_pop: withBackground(NUMBER_SCENE, primePopBackground),
  angle_arena: withBackground(GEOMETRY_SCENE, polygonPalaceBackground),
  polygon_palace: withBackground(GEOMETRY_SCENE, polygonPalaceBackground),
  data_dungeon: withBackground(DATA_SCENE, dataDetectiveBackground),
  monster_market: withBackground(NUMBER_SCENE, monsterMarketBackground),
  tower_of_factors: withBackground(NUMBER_SCENE, towerOfFactorsBackground),
  measurement_forge: withBackground(RATIO_SCENE, scaleMasterBackground),
  timekeeper_temple: withBackground(DATA_SCENE, chronoDashTimeTrialBackground),
  ratio_rapids: withBackground(RATIO_SCENE, scaleMasterBackground),
  remainder_run: withBackground(RATIO_SCENE, primePopBackground),
  place_value_peaks: withBackground(NUMBER_SCENE, placeValuePanicBackground),
  calculation_clash: withBackground(NUMBER_SCENE, calculationCupBackground),
  coordinate_quest: withBackground(GEOMETRY_SCENE, coordinateQuestBackground),
  transform_temple: withBackground(GEOMETRY_SCENE, rotationStationBackground),
  mirror_gate: withBackground(REASONING_SCENE, rotationStationBackground),
  scale_safari: withBackground(SCALE_BUILDER_SCENE, scaleBuilderBackground),
  scales_of_the_sun: withBackground(SCALE_SCENE, scaleMasterBackground),
  graph_grabber: withBackground(CHART_CHASE_SCENE, graphGrabberBackground),
  observatory_overload: withBackground(DATA_SCENE, lineGraphLabBackground),
  mean_machine: withBackground(DATA_SCENE, meanMachineBackground),
  percent_power: withBackground(RATIO_SCENE, percentPowerBackground),
  area_architect: withBackground(GEOMETRY_SCENE, areaArchitectBackground),
  ratio_fractions: withBackground(RATIO_SCENE, shareSplitterBackground),
  equation_grove: withBackground(REASONING_SCENE, orderOpsArenaBackground),
  rule_runner: withBackground(REASONING_SCENE, problemPyramidBackground),
  formula_forge: withBackground(NUMBER_SCENE, calculationCupBackground),
  unit_mixer: withBackground(REASONING_SCENE, lavaPathBackground),
  change_counter: withBackground(CHANGE_COUNTER_SCENE, changeCounterBackground),
  reasoning_quest: withBackground(REASONING_SCENE, multiStepMarathonBackground),
};
