import React, { lazy } from 'react';
const AngleArenaGame = lazy(() => import('./AngleArenaGame'));
const ArithmeticGauntletGame = lazy(() => import('./ArithmeticGauntletGame'));
const AreaArchitectGame = lazy(() => import('./AreaArchitectGame'));
const BossEncounterGame = lazy(() => import('./BossEncounterGame'));
const CalculationCrashGame = lazy(() => import('./CalculationCrashGame'));
const CloudCollapseGame = lazy(() => import('./CloudCollapseGame'));
const ChangeCounterGame = lazy(() => import('./ChangeCounterGame'));
const CoordinateTranslationGame = lazy(() => import('./CoordinateTranslationGame'));
const CurriculumChallengeGame = lazy(() => import('./CurriculumChallengeGame'));
const DataDungeonGame = lazy(() => import('./DataDungeonGame'));
const DataDetectiveGame = lazy(() => import('./DataDetectiveGame'));
const DecimalSniperGame = lazy(() => import('./DecimalSniperGame'));
const DivisionDockGame = lazy(() => import('./DivisionDockGame'));
const FactorFrenzyGame = lazy(() => import('./FactorFrenzyGame'));
const FormulaForgeGame = lazy(() => import('./FormulaForgeGame'));
const FractionForgeGame = lazy(() => import('./FractionForgeGame'));
const FractionMatchGame = lazy(() => import('./FractionMatchGame'));
const LineGraphLabGame = lazy(() => import('./LineGraphLabGame'));
const MathsVsZombiesGame = lazy(() => import('./MathsVsZombiesGame'));
const MeanMachineGame = lazy(() => import('./MeanMachineGame'));
const MedianMountainGame = lazy(() => import('./MedianMountainGame'));
const MeasurementForgeGame = lazy(() => import('./MeasurementForgeGame'));
const MultiplicationMineGame = lazy(() => import('./MultiplicationMineGame'));
const MonsterMarketGame = lazy(() => import('./MonsterMarketGame'));
const ModeMinerGame = lazy(() => import('./ModeMinerGame'));
const NumberLineNinjaGame = lazy(() => import('./NumberLineNinjaGame'));
const OrderOpsArenaGame = lazy(() => import('./OrderOpsArenaGame'));
const PerimeterPathGame = lazy(() => import('./PerimeterPathGame'));
const PercentPowerGame = lazy(() => import('./PercentPowerGame'));
const PlaceValuePanicGame = lazy(() => import('./PlaceValuePanicGame'));
const PolygonPalaceGame = lazy(() => import('./PolygonPalaceGame'));
const PotionPourGame = lazy(() => import('./PotionPourGame'));
const PrimePopGame = lazy(() => import('./PrimePopGame'));
const RatioRapidsGame = lazy(() => import('./RatioRapidsGame'));
const RatioFractionsGame = lazy(() => import('./RatioFractionsGame'));
const RemainderRunGame = lazy(() => import('./RemainderRunGame'));
const RoundingRocketGame = lazy(() => import('./RoundingRocketGame'));
const RotationReflectionGame = lazy(() => import('./RotationReflectionGame'));
const RuneLockDungeonsGame = lazy(() => import('./RuneLockDungeonsGame'));
const ReasoningQuestGame = lazy(() => import('./ReasoningQuestGame'));
const ScaleBuilderGame = lazy(() => import('./ScaleBuilderGame'));
const ShareSplitterGame = lazy(() => import('./ShareSplitterGame'));
const SimplifySprintGame = lazy(() => import('./SimplifySprintGame'));
const TakeOutRushGame = lazy(() => import('./TakeOutRushGame'));
const TimekeeperTempleGame = lazy(() => import('./TimekeeperTempleGame'));
const TowerOfFactorsGame = lazy(() => import('./TowerOfFactorsGame'));
const TreasureChartCoveGame = lazy(() => import('./TreasureChartCoveGame'));
const TreasurePathGame = lazy(() => import('./TreasurePathGame'));
const UnitMixerGame = lazy(() => import('./UnitMixerGame'));
const LogicSort = lazy(() => import('./reasoning/LogicSort'));
const MatrixMatch = lazy(() => import('./reasoning/MatrixMatch'));
const ReasoningGame = lazy(() => import('./reasoning/ReasoningGame'));
import { createMiniGame, MiniGame } from './MiniGame';

export type MiniGameRegistryKey =
  | 'AngleArenaGame'
  | 'ArithmeticGauntletGame'
  | 'AreaArchitectGame'
  | 'BossEncounterGame'
  | 'CalculationCrashGame'
  | 'CloudCollapseGame'
  | 'ChangeCounterGame'
  | 'CoordinateTranslationGame'
  | 'CurriculumChallengeGame'
  | 'DataDungeonGame'
  | 'DataDetectiveGame'
  | 'DecimalSniperGame'
  | 'DivisionDockGame'
  | 'FactorFrenzyGame'
  | 'FormulaForgeGame'
  | 'FractionForgeGame'
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
  | 'PercentPowerGame'
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
  | 'ReasoningQuestGame'
  | 'ScaleBuilderGame'
  | 'ShareSplitterGame'
  | 'SimplifySprintGame'
  | 'TakeOutRushGame'
  | 'TimekeeperTempleGame'
  | 'TowerOfFactorsGame'
  | 'TreasureChartCoveGame'
  | 'TreasurePathGame'
  | 'UnitMixerGame'
  | 'ReasoningGame'
  | 'LogicSort'
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
  ChangeCounterGame: asMiniGame('change_counter', ChangeCounterGame),
  CloudCollapseGame: asMiniGame('cloud_collapse', CloudCollapseGame),
  CoordinateTranslationGame: asMiniGame('coordinate_translation', CoordinateTranslationGame),
  CurriculumChallengeGame: asMiniGame('curriculum_challenge', CurriculumChallengeGame),
  DataDungeonGame: asMiniGame('data_dungeon', DataDungeonGame),
  DataDetectiveGame: asMiniGame('data_detective', DataDetectiveGame),
  DecimalSniperGame: asMiniGame('decimal_sniper', DecimalSniperGame),
  DivisionDockGame: asMiniGame('division_dock', DivisionDockGame),
  FactorFrenzyGame: asMiniGame('factor_frenzy', FactorFrenzyGame),
  FormulaForgeGame: asMiniGame('formula_forge', FormulaForgeGame),
  FractionForgeGame: asMiniGame('fraction_forge', FractionForgeGame),
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
  PercentPowerGame: asMiniGame('percent_power', PercentPowerGame),
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
  ReasoningQuestGame: asMiniGame('reasoning_quest', ReasoningQuestGame),
  ScaleBuilderGame: asMiniGame('scale_builder', ScaleBuilderGame),
  ShareSplitterGame: asMiniGame('share_splitter', ShareSplitterGame),
  SimplifySprintGame: asMiniGame('simplify_sprint', SimplifySprintGame),
  TakeOutRushGame: asMiniGame('take_out_rush', TakeOutRushGame),
  TimekeeperTempleGame: asMiniGame('timekeeper_temple', TimekeeperTempleGame),
  TowerOfFactorsGame: asMiniGame('tower_of_factors', TowerOfFactorsGame),
  TreasureChartCoveGame: asMiniGame('treasure_chart_cove', TreasureChartCoveGame),
  TreasurePathGame: asMiniGame('treasure_path', TreasurePathGame),
  UnitMixerGame: asMiniGame('unit_mixer', UnitMixerGame),
  ReasoningGame: asMiniGame('reasoning', ReasoningGame),
  LogicSort: asMiniGame('logic_sort', LogicSort),
  MatrixMatch: asMiniGame('matrix_match', MatrixMatch),
};

export const getMiniGame = (key: MiniGameRegistryKey): MiniGame<any> => MINI_GAME_REGISTRY[key];
