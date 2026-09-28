import { MiniGameType } from './types';
import angleArenaBackground from './assets/maps/premium/angle-arena.webp';
import matchMasteryBackground from './assets/maps/premium/match-mastery.webp';
import mirrorGateBackground from './assets/maps/premium/mirror-gate.webp';
import remainderRunBackground from './assets/maps/premium/remainder-run.webp';
import shareSplitterBackground from './assets/maps/premium/share-splitter.webp';
import areaArchitectBackground from './assets/maps/premium/area-architect.webp';
import calculationCupBackground from './assets/maps/premium/formula-forge.webp';
import changeCounterBackground from './assets/maps/teen/monster-market-shop.webp';
import chronoDashTimeTrialBackground from './assets/maps/premium/chrono-dash.webp';
import cloudCollapseBackground from './assets/maps/premium/match-mastery.webp';
import coordinateQuestBackground from './assets/maps/premium/coordinates-quest.webp';
import crystalCoreBackground from './assets/maps/premium/crystal-core.webp';
import dataDetectiveBackground from './assets/maps/premium/data-detective.webp';
import matrixMatchBackground from './assets/maps/premium/matrix-match.webp';
import graphGrabberBackground from './assets/maps/premium/graph-grabber.webp';
import lineGraphLabBackground from './assets/maps/premium/line-graph-lab.webp';
import meanMachineBackground from './assets/maps/premium/mean-machine.webp';
import mixedMasteryBackground from './assets/maps/premium/matrix-match.webp';
import monsterMarketBackground from './assets/maps/premium/take-out-rush.webp';
import multiStepMarathonBackground from './assets/maps/premium/problem-pyramid.webp';
import orderOpsArenaBackground from './assets/maps/premium/order-ops-arena.webp';
import percentPowerBackground from './assets/maps/premium/percent-power.webp';
import placeValuePanicBackground from './assets/maps/premium/place-value-panic.webp';
import polygonPalaceBackground from './assets/maps/premium/polygon-palace.webp';
import potionPanicBackground from './assets/maps/premium/potion-panic.webp';
import primePopBackground from './assets/maps/premium/prime-pop.webp';
import problemPyramidBackground from './assets/maps/premium/problem-pyramid.webp';
import rotationStationBackground from './assets/maps/premium/rotation-station.webp';
import scaleBuilderBackground from './assets/maps/premium/scale-builder.webp';
import scaleMasterBackground from './assets/maps/premium/conversion-canyon.webp';
import ratioRacerBackground from './assets/maps/teen/racing-paddock.webp';
import takeOutRushBackground from './assets/maps/teen/restaurant-rush.webp';
import takeOutRushWideBackground from './assets/maps/teen/restaurant-rush-wide.webp';
import changeCounterWideBackground from './assets/maps/teen/monster-market-shop-wide.webp';
import lavaPathBackground from './assets/maps/premium/lava-path.webp';
import towerOfFactorsBackground from './assets/maps/premium/factor-frenzy.webp';

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

export const getWideEnvironment = (background: string): string | undefined => {
  if (background === takeOutRushBackground) return takeOutRushWideBackground;
  if (background === changeCounterBackground) return changeCounterWideBackground;
  return undefined;
};

export const GAME_SCENE_META: Record<MiniGameType, GameSceneMeta> = {
  quiz: withBackground(NUMBER_SCENE, mixedMasteryBackground),
  potion_pour: withBackground(RATIO_SCENE, potionPanicBackground),
  cloud_collapse: withBackground(FRACTION_SCENE, cloudCollapseBackground),
  logic_sort: withBackground(REASONING_SCENE, mixedMasteryBackground),
  matrix_match: withBackground(REASONING_SCENE, matrixMatchBackground),
  take_out_rush: withBackground(FRACTION_SCENE, takeOutRushBackground),
  fraction_match: withBackground(FRACTION_SCENE, matchMasteryBackground),
  crystal_core: withBackground(FRACTION_SCENE, crystalCoreBackground),
  prime_pop: withBackground(NUMBER_SCENE, primePopBackground),
  angle_arena: withBackground(GEOMETRY_SCENE, angleArenaBackground),
  polygon_palace: withBackground(GEOMETRY_SCENE, polygonPalaceBackground),
  data_dungeon: withBackground(DATA_SCENE, dataDetectiveBackground),
  monster_market: withBackground(NUMBER_SCENE, monsterMarketBackground),
  tower_of_factors: withBackground(NUMBER_SCENE, towerOfFactorsBackground),
  measurement_forge: withBackground(RATIO_SCENE, scaleMasterBackground),
  timekeeper_temple: withBackground(DATA_SCENE, chronoDashTimeTrialBackground),
  ratio_rapids: withBackground(RATIO_SCENE, shareSplitterBackground),
  remainder_run: withBackground(RATIO_SCENE, remainderRunBackground),
  place_value_peaks: withBackground(NUMBER_SCENE, placeValuePanicBackground),
  calculation_clash: withBackground(NUMBER_SCENE, calculationCupBackground),
  coordinate_quest: withBackground(GEOMETRY_SCENE, coordinateQuestBackground),
  transform_temple: withBackground(GEOMETRY_SCENE, rotationStationBackground),
  mirror_gate: withBackground(REASONING_SCENE, mirrorGateBackground),
  scale_safari: withBackground(SCALE_BUILDER_SCENE, scaleBuilderBackground),
  scales_of_the_sun: withBackground(SCALE_SCENE, scaleMasterBackground),
  graph_grabber: withBackground(CHART_CHASE_SCENE, graphGrabberBackground),
  observatory_overload: withBackground(DATA_SCENE, lineGraphLabBackground),
  mean_machine: withBackground(DATA_SCENE, meanMachineBackground),
  percent_power: withBackground(RATIO_SCENE, percentPowerBackground),
  area_architect: withBackground(GEOMETRY_SCENE, areaArchitectBackground),
  ratio_fractions: withBackground(RATIO_SCENE, ratioRacerBackground),
  equation_grove: withBackground(REASONING_SCENE, orderOpsArenaBackground),
  rule_runner: withBackground(REASONING_SCENE, problemPyramidBackground),
  formula_forge: withBackground(NUMBER_SCENE, calculationCupBackground),
  unit_mixer: withBackground(REASONING_SCENE, lavaPathBackground),
  change_counter: withBackground(CHANGE_COUNTER_SCENE, changeCounterBackground),
  reasoning_quest: withBackground(REASONING_SCENE, multiStepMarathonBackground),
};
