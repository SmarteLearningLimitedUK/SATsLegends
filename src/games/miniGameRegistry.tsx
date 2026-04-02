import React from 'react';
import AngleArenaGame from './AngleArenaGame';
import ArithmeticGauntletGame from './ArithmeticGauntletGame';
import AreaArchitectGame from './AreaArchitectGame';
import BossEncounterGame from './BossEncounterGame';
import CalculationCrashGame from './CalculationCrashGame';
import CloudCollapseGame from './CloudCollapseGame';
import CoordinateTranslationGame from './CoordinateTranslationGame';
import CurriculumChallengeGame from './CurriculumChallengeGame';
import DataDungeonGame from './DataDungeonGame';
import DataDetectiveGame from './DataDetectiveGame';
import DecimalSniperGame from './DecimalSniperGame';
import DivisionDockGame from './DivisionDockGame';
import FactorFrenzyGame from './FactorFrenzyGame';
import FractionForgeGame from './FractionForgeGame';
import FractionFlowGame from './FractionFlowGame';
import FractionMatchGame from './FractionMatchGame';
import LineGraphLabGame from './LineGraphLabGame';
import MathsVsZombiesGame from './MathsVsZombiesGame';
import MeanMachineGame from './MeanMachineGame';
import MedianMountainGame from './MedianMountainGame';
import MeasurementForgeGame from './MeasurementForgeGame';
import MultiplicationMineGame from './MultiplicationMineGame';
import MonsterMarketGame from './MonsterMarketGame';
import ModeMinerGame from './ModeMinerGame';
import NumberLineNinjaGame from './NumberLineNinjaGame';
import OrderOpsArenaGame from './OrderOpsArenaGame';
import PerimeterPathGame from './PerimeterPathGame';
import PlaceValuePanicGame from './PlaceValuePanicGame';
import PolygonPalaceGame from './PolygonPalaceGame';
import PotionPourGame from './PotionPourGame';
import PrimePopGame from './PrimePopGame';
import RatioRapidsGame from './RatioRapidsGame';
import RatioFractionsGame from './RatioFractionsGame';
import RemainderRunGame from './RemainderRunGame';
import RoundingRocketGame from './RoundingRocketGame';
import RotationReflectionGame from './RotationReflectionGame';
import RuneLockDungeonsGame from './RuneLockDungeonsGame';
import ScaleBuilderGame from './ScaleBuilderGame';
import ShareSplitterGame from './ShareSplitterGame';
import SimplifySprintGame from './SimplifySprintGame';
import TakeOutRushGame from './TakeOutRushGame';
import TimekeeperTempleGame from './TimekeeperTempleGame';
import TowerOfFactorsGame from './TowerOfFactorsGame';
import TreasureChartCoveGame from './TreasureChartCoveGame';
import TreasurePathGame from './TreasurePathGame';
import WhodunnitDataGame from './WhodunnitDataGame';
import LogicSort from './reasoning/LogicSort';
import MatrixMatch from './reasoning/MatrixMatch';
import ReasoningGame from './reasoning/ReasoningGame';
import SequenceSprint from './reasoning/SequenceSprint';
import ShapeShift from './reasoning/ShapeShift';
import { createMiniGame, MiniGame } from './MiniGame';

export type MiniGameRegistryKey =
  | 'AngleArenaGame'
  | 'ArithmeticGauntletGame'
  | 'AreaArchitectGame'
  | 'BossEncounterGame'
  | 'CalculationCrashGame'
  | 'CloudCollapseGame'
  | 'CoordinateTranslationGame'
  | 'CurriculumChallengeGame'
  | 'DataDungeonGame'
  | 'DataDetectiveGame'
  | 'DecimalSniperGame'
  | 'DivisionDockGame'
  | 'FactorFrenzyGame'
  | 'FractionForgeGame'
  | 'FractionFlowGame'
  | 'FractionMatchGame'
  | 'LineGraphLabGame'
  | 'MathsVsZombiesGame'
  | 'MeanMachineGame'
  | 'MedianMountainGame'
  | 'MeasurementForgeGame'
  | 'MultiplicationMineGame'
  | 'MonsterMarketGame'
  | 'ModeMinerGame'
  | 'NumberLineNinjaGame'
  | 'OrderOpsArenaGame'
  | 'PerimeterPathGame'
  | 'PlaceValuePanicGame'
  | 'PolygonPalaceGame'
  | 'PotionPourGame'
  | 'PrimePopGame'
  | 'RatioRapidsGame'
  | 'RatioFractionsGame'
  | 'RemainderRunGame'
  | 'RoundingRocketGame'
  | 'RotationReflectionGame'
  | 'RuneLockDungeonsGame'
  | 'ScaleBuilderGame'
  | 'ShareSplitterGame'
  | 'SimplifySprintGame'
  | 'TakeOutRushGame'
  | 'TimekeeperTempleGame'
  | 'TowerOfFactorsGame'
  | 'TreasureChartCoveGame'
  | 'TreasurePathGame'
  | 'WhodunnitDataGame'
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
  ArithmeticGauntletGame: asMiniGame('arithmetic_gauntlet', ArithmeticGauntletGame),
  AreaArchitectGame: asMiniGame('area_architect', AreaArchitectGame),
  BossEncounterGame: asMiniGame('boss_encounter', BossEncounterGame),
  CalculationCrashGame: asMiniGame('calculation_crash', CalculationCrashGame),
  CloudCollapseGame: asMiniGame('cloud_collapse', CloudCollapseGame),
  CoordinateTranslationGame: asMiniGame('coordinate_translation', CoordinateTranslationGame),
  CurriculumChallengeGame: asMiniGame('curriculum_challenge', CurriculumChallengeGame),
  DataDungeonGame: asMiniGame('data_dungeon', DataDungeonGame),
  DataDetectiveGame: asMiniGame('data_detective', DataDetectiveGame),
  DecimalSniperGame: asMiniGame('decimal_sniper', DecimalSniperGame),
  DivisionDockGame: asMiniGame('division_dock', DivisionDockGame),
  FactorFrenzyGame: asMiniGame('factor_frenzy', FactorFrenzyGame),
  FractionForgeGame: asMiniGame('fraction_forge', FractionForgeGame),
  FractionFlowGame: asMiniGame('fraction_flow', FractionFlowGame),
  FractionMatchGame: asMiniGame('fraction_match', FractionMatchGame),
  LineGraphLabGame: asMiniGame('line_graph_lab', LineGraphLabGame),
  MathsVsZombiesGame: asMiniGame('maths_vs_zombies', MathsVsZombiesGame),
  MeanMachineGame: asMiniGame('mean_machine', MeanMachineGame),
  MedianMountainGame: asMiniGame('median_mountain', MedianMountainGame),
  MeasurementForgeGame: asMiniGame('measurement_forge', MeasurementForgeGame),
  MultiplicationMineGame: asMiniGame('multiplication_mine', MultiplicationMineGame),
  MonsterMarketGame: asMiniGame('monster_market', MonsterMarketGame),
  ModeMinerGame: asMiniGame('mode_miner', ModeMinerGame),
  NumberLineNinjaGame: asMiniGame('number_line_ninja', NumberLineNinjaGame),
  OrderOpsArenaGame: asMiniGame('order_ops_arena', OrderOpsArenaGame),
  PerimeterPathGame: asMiniGame('perimeter_path', PerimeterPathGame),
  PlaceValuePanicGame: asMiniGame('place_value_panic', PlaceValuePanicGame),
  PolygonPalaceGame: asMiniGame('polygon_palace', PolygonPalaceGame),
  PotionPourGame: asMiniGame('potion_pour', PotionPourGame),
  PrimePopGame: asMiniGame('prime_pop', PrimePopGame),
  RatioRapidsGame: asMiniGame('ratio_rapids', RatioRapidsGame),
  RatioFractionsGame: asMiniGame('ratio_fractions', RatioFractionsGame),
  RemainderRunGame: asMiniGame('remainder_run', RemainderRunGame),
  RoundingRocketGame: asMiniGame('rounding_rocket', RoundingRocketGame),
  RotationReflectionGame: asMiniGame('rotation_reflection', RotationReflectionGame),
  RuneLockDungeonsGame: asMiniGame('rune_lock_dungeons', RuneLockDungeonsGame),
  ScaleBuilderGame: asMiniGame('scale_builder', ScaleBuilderGame),
  ShareSplitterGame: asMiniGame('share_splitter', ShareSplitterGame),
  SimplifySprintGame: asMiniGame('simplify_sprint', SimplifySprintGame),
  TakeOutRushGame: asMiniGame('take_out_rush', TakeOutRushGame),
  TimekeeperTempleGame: asMiniGame('timekeeper_temple', TimekeeperTempleGame),
  TowerOfFactorsGame: asMiniGame('tower_of_factors', TowerOfFactorsGame),
  TreasureChartCoveGame: asMiniGame('treasure_chart_cove', TreasureChartCoveGame),
  TreasurePathGame: asMiniGame('treasure_path', TreasurePathGame),
  WhodunnitDataGame: asMiniGame('whodunnit_data', WhodunnitDataGame),
  ReasoningGame: asMiniGame('reasoning', ReasoningGame),
  SequenceSprint: asMiniGame('sequence_sprint', SequenceSprint),
  LogicSort: asMiniGame('logic_sort', LogicSort),
  ShapeShift: asMiniGame('shape_shift', ShapeShift),
  MatrixMatch: asMiniGame('matrix_match', MatrixMatch),
};

export const getMiniGame = (key: MiniGameRegistryKey): MiniGame<any> => MINI_GAME_REGISTRY[key];
