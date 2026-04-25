import React, { lazy } from 'react';
const AngleArenaGame = lazy(() => import('./AngleArenaGame'));
const AreaArchitectGame = lazy(() => import('./AreaArchitectGame'));
const BossEncounterGame = lazy(() => import('./BossEncounterGame'));
const CalculationCrashGame = lazy(() => import('./CalculationCrashGame'));
const CloudCollapseGame = lazy(() => import('./CloudCollapseGame'));
const ChangeCounterGame = lazy(() => import('./ChangeCounterGame'));
const CoordinatesQuestGame = lazy(() => import('./CoordinatesQuestGame'));
const CurriculumChallengeGame = lazy(() => import('./CurriculumChallengeGame'));
const DataDungeonGame = lazy(() => import('./DataDungeonGame'));
const DataDetectiveGame = lazy(() => import('./DataDetectiveGame'));
const DecimalSniperGame = lazy(() => import('./DecimalSniperGame'));
const FactorFrenzyGame = lazy(() => import('./FactorFrenzyGame'));
const FormulaForgeGame = lazy(() => import('./FormulaForgeGame'));
const FractionForgeGame = lazy(() => import('./FractionForgeGame'));
const FractionMatchGame = lazy(() => import('./FractionMatchGame'));
const LineGraphLabGame = lazy(() => import('./LineGraphLabGame'));
const MathsVsZombiesGame = lazy(() => import('./MathsVsZombiesGame'));
const MeanMachineGame = lazy(() => import('./MeanMachineGame'));
const MedianMountainGame = lazy(() => import('./MedianMountainGame'));
const ConversionCanyonGame = lazy(() => import('./ConversionCanyonGame'));
const MultiplicationMineGame = lazy(() => import('./MultiplicationMineGame'));
const MonsterMarketGame = lazy(() => import('./MonsterMarketGame'));
const NumberLineNinjaGame = lazy(() => import('./NumberLineNinjaGame'));
const OrderOpsArenaGame = lazy(() => import('./OrderOpsArenaGame'));
const PerimeterPathGame = lazy(() => import('./PerimeterPathGame'));
const PercentPowerGame = lazy(() => import('./PercentPowerGame'));
const PlaceValuePanicGame = lazy(() => import('./PlaceValuePanicGame'));
const PolygonPalaceGame = lazy(() => import('./PolygonPalaceGame'));
const ProblemPyramidGame = lazy(() => import('./ProblemPyramidGame'));
const PotionPanicGame = lazy(() => import('./PotionPanicGame'));
const PrimePopGame = lazy(() => import('./PrimePopGame'));
const RatioRacerGame = lazy(() => import('./RatioRacerGame'));
const RemainderRunGame = lazy(() => import('./RemainderRunGame'));
const RoundingRocketGame = lazy(() => import('./RoundingRocketGame'));
const RotationStationGame = lazy(() => import('./RotationStationGame'));
const ReasoningQuestGame = lazy(() => import('./ReasoningQuestGame'));
const ScaleBuilderGame = lazy(() => import('./ScaleBuilderGame'));
const ShareSplitterGame = lazy(() => import('./ShareSplitterGame'));
const SimplifySprintGame = lazy(() => import('./SimplifySprintGame'));
const TakeOutRushGame = lazy(() => import('./TakeOutRushGame'));
const ChronoDashGame = lazy(() => import('./ChronoDashGame'));
const TowerOfFactorsGame = lazy(() => import('./TowerOfFactorsGame'));
const GraphGrabberGame = lazy(() => import('./GraphGrabberGame'));
const TreasurePathGame = lazy(() => import('./TreasurePathGame'));
const LavaPathGame = lazy(() => import('./LavaPathGame'));
const LogicSort = lazy(() => import('./reasoning/LogicSort'));
const MatrixMatch = lazy(() => import('./reasoning/MatrixMatch'));
const ReasoningGame = lazy(() => import('./reasoning/ReasoningGame'));
const RangeRodeoGame = lazy(() => import('./RangeRodeoGame'));
import { createMiniGame, MiniGame } from './MiniGame';

export type MiniGameRegistryKey =
  | 'AngleArenaGame'
  | 'AreaArchitectGame'
  | 'BossEncounterGame'
  | 'CalculationCrashGame'
  | 'CloudCollapseGame'
  | 'ChangeCounterGame'
  | 'CoordinatesQuestGame'
  | 'CurriculumChallengeGame'
  | 'DataDungeonGame'
  | 'DataDetectiveGame'
  | 'DecimalSniperGame'
  | 'FactorFrenzyGame'
  | 'FormulaForgeGame'
  | 'FractionForgeGame'
  | 'FractionMatchGame'
  | 'LineGraphLabGame'
  | 'MathsVsZombiesGame'
  | 'MeanMachineGame'
  | 'MedianMountainGame'
  | 'ConversionCanyonGame'
  | 'MultiplicationMineGame'
  | 'MonsterMarketGame'
  | 'NumberLineNinjaGame'
  | 'OrderOpsArenaGame'
  | 'PerimeterPathGame'
  | 'PercentPowerGame'
  | 'PlaceValuePanicGame'
  | 'PolygonPalaceGame'
  | 'ProblemPyramidGame'
  | 'PotionPanicGame'
  | 'PrimePopGame'
  | 'RatioRacerGame'
  | 'RemainderRunGame'
  | 'RoundingRocketGame'
  | 'RotationStationGame'
  | 'ReasoningQuestGame'
  | 'ScaleBuilderGame'
  | 'ShareSplitterGame'
  | 'SimplifySprintGame'
  | 'TakeOutRushGame'
  | 'ChronoDashGame'
  | 'TowerOfFactorsGame'
  | 'GraphGrabberGame'
  | 'TreasurePathGame'
  | 'LavaPathGame'
  | 'ReasoningGame'
  | 'LogicSort'
  | 'MatrixMatch'
  | 'RangeRodeoGame';

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
  AreaArchitectGame: asMiniGame('area_architect', AreaArchitectGame),
  BossEncounterGame: asMiniGame('boss_encounter', BossEncounterGame),
  CalculationCrashGame: asMiniGame('calculation_crash', CalculationCrashGame),
  ChangeCounterGame: asMiniGame('change_counter', ChangeCounterGame),
  CloudCollapseGame: asMiniGame('cloud_collapse', CloudCollapseGame),
  CoordinatesQuestGame: asMiniGame('coordinates_quest', CoordinatesQuestGame),
  CurriculumChallengeGame: asMiniGame('curriculum_challenge', CurriculumChallengeGame),
  DataDungeonGame: asMiniGame('data_dungeon', DataDungeonGame),
  DataDetectiveGame: asMiniGame('data_detective', DataDetectiveGame),
  DecimalSniperGame: asMiniGame('decimal_sniper', DecimalSniperGame),
  FactorFrenzyGame: asMiniGame('factor_frenzy', FactorFrenzyGame),
  FormulaForgeGame: asMiniGame('formula_forge', FormulaForgeGame),
  FractionForgeGame: asMiniGame('fraction_forge', FractionForgeGame),
  FractionMatchGame: asMiniGame('fraction_match', FractionMatchGame),
  LineGraphLabGame: asMiniGame('line_graph_lab', LineGraphLabGame),
  MathsVsZombiesGame: asMiniGame('maths_vs_zombies', MathsVsZombiesGame),
  MeanMachineGame: asMiniGame('mean_machine', MeanMachineGame),
  MedianMountainGame: asMiniGame('median_mountain', MedianMountainGame),
  ConversionCanyonGame: asMiniGame('conversion_canyon', ConversionCanyonGame),
  MultiplicationMineGame: asMiniGame('multiplication_mine', MultiplicationMineGame),
  MonsterMarketGame: asMiniGame('monster_market', MonsterMarketGame),
  NumberLineNinjaGame: asMiniGame('number_line_ninja', NumberLineNinjaGame),
  OrderOpsArenaGame: asMiniGame('order_ops_arena', OrderOpsArenaGame),
  PerimeterPathGame: asMiniGame('perimeter_path', PerimeterPathGame),
  PercentPowerGame: asMiniGame('percent_power', PercentPowerGame),
  PlaceValuePanicGame: asMiniGame('place_value_panic', PlaceValuePanicGame),
  PolygonPalaceGame: asMiniGame('polygon_palace', PolygonPalaceGame),
  ProblemPyramidGame: asMiniGame('problem_pyramid', ProblemPyramidGame),
  PotionPanicGame: asMiniGame('potion_pour', PotionPanicGame),
  PrimePopGame: asMiniGame('prime_pop', PrimePopGame),
  RatioRacerGame: asMiniGame('ratio_fractions', RatioRacerGame),
  RemainderRunGame: asMiniGame('remainder_run', RemainderRunGame),
  RoundingRocketGame: asMiniGame('rounding_rocket', RoundingRocketGame),
  RotationStationGame: asMiniGame('rotation_station', RotationStationGame),
  ReasoningQuestGame: asMiniGame('reasoning_quest', ReasoningQuestGame),
  ScaleBuilderGame: asMiniGame('scale_builder', ScaleBuilderGame),
  ShareSplitterGame: asMiniGame('share_splitter', ShareSplitterGame),
  SimplifySprintGame: asMiniGame('simplify_sprint', SimplifySprintGame),
  TakeOutRushGame: asMiniGame('take_out_rush', TakeOutRushGame),
  ChronoDashGame: asMiniGame('timekeeper_temple', ChronoDashGame),
  TowerOfFactorsGame: asMiniGame('tower_of_factors', TowerOfFactorsGame),
  GraphGrabberGame: asMiniGame('graph_grabber', GraphGrabberGame),
  TreasurePathGame: asMiniGame('treasure_path', TreasurePathGame),
  LavaPathGame: asMiniGame('unit_mixer', LavaPathGame),
  ReasoningGame: asMiniGame('reasoning', ReasoningGame),
  LogicSort: asMiniGame('logic_sort', LogicSort),
  MatrixMatch: asMiniGame('matrix_match', MatrixMatch),
  RangeRodeoGame: asMiniGame('graph_grabber', RangeRodeoGame),
};

export const getMiniGame = (key: MiniGameRegistryKey): MiniGame<any> => MINI_GAME_REGISTRY[key];
