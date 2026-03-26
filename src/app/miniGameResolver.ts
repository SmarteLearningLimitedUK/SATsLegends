import { MiniGameRegistryKey } from '../games';
import { isBossEncounterGameType } from '../games/BossEncounterGame';
import { LevelData } from '../types';

export const resolveMiniGameRegistryKey = (level: LevelData): MiniGameRegistryKey | null => {
  if (level.isBoss && isBossEncounterGameType(level.gameType)) {
    return 'BossEncounterGame';
  }

  switch (level.gameType) {
    case 'cloud_collapse':
      if (level.blueprintKey === 'fraction_flow') {
        return 'FractionFlowGame';
      }
    case 'fraction_match':
      if (level.blueprintKey === 'simplify_sprint') {
        return 'SimplifySprintGame';
      }
      return 'FractionMatchGame';
    case 'potion_pour':
      return 'PotionPourGame';
    case 'take_out_rush':
      if (level.blueprintKey === 'fraction_forge') {
        return 'FractionForgeGame';
      }
      return 'TakeOutRushGame';
    case 'prime_pop':
      return 'PrimePopGame';
    case 'angle_arena':
      return 'AngleArenaGame';
    case 'polygon_palace':
      return 'PolygonPalaceGame';
    case 'data_dungeon':
      if (level.blueprintKey === 'data_dash' || level.blueprintKey === 'mode_miner') {
        return 'ModeMinerGame';
      }
      if (level.blueprintKey === 'table_trouble') {
        return 'LineGraphLabGame';
      }
      if (level.blueprintKey === 'data_detective') {
        return 'DataDetectiveGame';
      }
      return 'DataDungeonGame';
    case 'monster_market':
      return 'MonsterMarketGame';
    case 'ratio_rapids':
      if (level.blueprintKey === 'share_splitter') {
        return 'ShareSplitterGame';
      }
      if (level.blueprintKey === 'maths_vs_zombies') {
        return 'MathsVsZombiesGame';
      }
      return 'RatioRapidsGame';
    case 'timekeeper_temple':
      return 'TimekeeperTempleGame';
    case 'measurement_forge':
      if (level.blueprintKey === 'perimeter_path') {
        return 'PerimeterPathGame';
      }
      if (level.blueprintKey === 'volume_vault') {
        return 'VolumeVaultGame';
      }
      return 'MeasurementForgeGame';
    case 'tower_of_factors':
      if (level.blueprintKey === 'factor_frenzy') {
        return 'FactorFrenzyGame';
      }
      return 'TowerOfFactorsGame';
    case 'place_value_peaks':
      if (level.blueprintKey === 'place_value_panic') {
        return 'PlaceValuePanicGame';
      }
      if (level.blueprintKey === 'rounding_rampage') {
        return 'RoundingRocketGame';
      }
      return 'DecimalSniperGame';
    case 'chart_chase':
      if (level.blueprintKey === 'line_graph_lab') {
        return 'LineGraphLabGame';
      }
      if (level.blueprintKey === 'chart_challenge' || level.blueprintKey === 'median_mountain') {
        return 'MedianMountainGame';
      }
      return 'TreasureChartCoveGame';
    case 'equation_grove':
      return level.blueprintKey === 'order_ops_arena' ? 'OrderOpsArenaGame' : 'RuneLockDungeonsGame';
    case 'coordinate_quest':
      if (level.blueprintKey === 'number_line_ninja') {
        return 'NumberLineNinjaGame';
      }
      return 'CoordinateTranslationGame';
    case 'calculation_clash':
      if (level.blueprintKey === 'arithmetic_gauntlet') {
        return 'ArithmeticGauntletGame';
      }
      if (level.blueprintKey === 'multiplication_mine') {
        return 'MultiplicationMineGame';
      }
      if (level.blueprintKey === 'remainder_run') {
        return 'RemainderRunGame';
      }
      return level.blueprintKey === 'division_dock' ? 'DivisionDockGame' : 'CalculationCrashGame';
    case 'percent_pulse':
      return 'CurriculumChallengeGame';
    case 'transform_temple':
      return 'CurriculumChallengeGame';
    case 'scale_safari':
      if (level.blueprintKey === 'scale_builder') {
        return 'ScaleBuilderGame';
      }
    case 'mean_machine':
      if (level.blueprintKey === 'mean_machine') {
        return 'MeanMachineGame';
      }
      if (level.blueprintKey === 'median_mountain') {
        return 'MedianMountainGame';
      }
    case 'rule_runner':
      if (level.blueprintKey === 'median_mountain') {
        return 'MedianMountainGame';
      }
      return 'CurriculumChallengeGame';
    case 'sequence_sprint':
    case 'logic_sort':
    case 'shape_shift':
      if (level.blueprintKey === 'rotation_relay') {
        return 'RotationReflectionGame';
      }
      return 'ReasoningGame';
    case 'matrix_match':
      return 'ReasoningGame';
    default:
      return null;
  }
};
