import React from 'react';
import AngleArenaGame from './AngleArenaGame';
import BossEncounterGame from './BossEncounterGame';
import CloudCollapseGame from './CloudCollapseGame';
import CurriculumChallengeGame from './CurriculumChallengeGame';
import DataDungeonGame from './DataDungeonGame';
import DecimalSniperGame from './DecimalSniperGame';
import DivisionDockGame from './DivisionDockGame';
import FractionMatchGame from './FractionMatchGame';
import MathsVsZombiesGame from './MathsVsZombiesGame';
import MeasurementForgeGame from './MeasurementForgeGame';
import MonsterMarketGame from './MonsterMarketGame';
import OrderOpsArenaGame from './OrderOpsArenaGame';
import PerimeterPathGame from './PerimeterPathGame';
import PlaceValuePanicGame from './PlaceValuePanicGame';
import PolygonPalaceGame from './PolygonPalaceGame';
import PotionPourGame from './PotionPourGame';
import PrimePopGame from './PrimePopGame';
import RatioRapidsGame from './RatioRapidsGame';
import RotationReflectionGame from './RotationReflectionGame';
import RuneLockDungeonsGame from './RuneLockDungeonsGame';
import TakeOutRushGame from './TakeOutRushGame';
import TimekeeperTempleGame from './TimekeeperTempleGame';
import TowerOfFactorsGame from './TowerOfFactorsGame';
import TreasureChartCoveGame from './TreasureChartCoveGame';
import TreasurePathGame from './TreasurePathGame';
import LogicSort from './reasoning/LogicSort';
import MatrixMatch from './reasoning/MatrixMatch';
import ReasoningGame from './reasoning/ReasoningGame';
import SequenceSprint from './reasoning/SequenceSprint';
import ShapeShift from './reasoning/ShapeShift';
import { createMiniGame, MiniGame } from './MiniGame';

export type MiniGameRegistryKey =
  | 'AngleArenaGame'
  | 'BossEncounterGame'
  | 'CloudCollapseGame'
  | 'CurriculumChallengeGame'
  | 'DataDungeonGame'
  | 'DecimalSniperGame'
  | 'DivisionDockGame'
  | 'FractionMatchGame'
  | 'MathsVsZombiesGame'
  | 'MeasurementForgeGame'
  | 'MonsterMarketGame'
  | 'OrderOpsArenaGame'
  | 'PerimeterPathGame'
  | 'PlaceValuePanicGame'
  | 'PolygonPalaceGame'
  | 'PotionPourGame'
  | 'PrimePopGame'
  | 'RatioRapidsGame'
  | 'RotationReflectionGame'
  | 'RuneLockDungeonsGame'
  | 'TakeOutRushGame'
  | 'TimekeeperTempleGame'
  | 'TowerOfFactorsGame'
  | 'TreasureChartCoveGame'
  | 'TreasurePathGame'
  | 'ReasoningGame'
  | 'SequenceSprint'
  | 'LogicSort'
  | 'ShapeShift'
  | 'MatrixMatch';

const asMiniGame = <P extends Record<string, unknown>>(
  id: string,
  Component: React.ComponentType<P>,
): MiniGame<P> => createMiniGame(id, Component);

/**
 * Single source of truth: every game in src/games is adapted to the standard
 * MiniGame interface (init/update/handleInput/getState/render).
 */
export const MINI_GAME_REGISTRY: Record<MiniGameRegistryKey, MiniGame<any>> = {
  AngleArenaGame: asMiniGame('angle_arena', AngleArenaGame),
  BossEncounterGame: asMiniGame('boss_encounter', BossEncounterGame),
  CloudCollapseGame: asMiniGame('cloud_collapse', CloudCollapseGame),
  CurriculumChallengeGame: asMiniGame('curriculum_challenge', CurriculumChallengeGame),
  DataDungeonGame: asMiniGame('data_dungeon', DataDungeonGame),
  DecimalSniperGame: asMiniGame('decimal_sniper', DecimalSniperGame),
  DivisionDockGame: asMiniGame('division_dock', DivisionDockGame),
  FractionMatchGame: asMiniGame('fraction_match', FractionMatchGame),
  MathsVsZombiesGame: asMiniGame('maths_vs_zombies', MathsVsZombiesGame),
  MeasurementForgeGame: asMiniGame('measurement_forge', MeasurementForgeGame),
  MonsterMarketGame: asMiniGame('monster_market', MonsterMarketGame),
  OrderOpsArenaGame: asMiniGame('order_ops_arena', OrderOpsArenaGame),
  PerimeterPathGame: asMiniGame('perimeter_path', PerimeterPathGame),
  PlaceValuePanicGame: asMiniGame('place_value_panic', PlaceValuePanicGame),
  PolygonPalaceGame: asMiniGame('polygon_palace', PolygonPalaceGame),
  PotionPourGame: asMiniGame('potion_pour', PotionPourGame),
  PrimePopGame: asMiniGame('prime_pop', PrimePopGame),
  RatioRapidsGame: asMiniGame('ratio_rapids', RatioRapidsGame),
  RotationReflectionGame: asMiniGame('rotation_reflection', RotationReflectionGame),
  RuneLockDungeonsGame: asMiniGame('rune_lock_dungeons', RuneLockDungeonsGame),
  TakeOutRushGame: asMiniGame('take_out_rush', TakeOutRushGame),
  TimekeeperTempleGame: asMiniGame('timekeeper_temple', TimekeeperTempleGame),
  TowerOfFactorsGame: asMiniGame('tower_of_factors', TowerOfFactorsGame),
  TreasureChartCoveGame: asMiniGame('treasure_chart_cove', TreasureChartCoveGame),
  TreasurePathGame: asMiniGame('treasure_path', TreasurePathGame),
  ReasoningGame: asMiniGame('reasoning', ReasoningGame),
  SequenceSprint: asMiniGame('sequence_sprint', SequenceSprint),
  LogicSort: asMiniGame('logic_sort', LogicSort),
  ShapeShift: asMiniGame('shape_shift', ShapeShift),
  MatrixMatch: asMiniGame('matrix_match', MatrixMatch),
};

export const getMiniGame = (key: MiniGameRegistryKey): MiniGame<any> => MINI_GAME_REGISTRY[key];
