import { GameScreen, MiniGameType } from '../types';

export const MAP_LAYOUT_SCREENS: GameScreen[] = ['world_map', 'island_levels'];

export const QUESTION_MATCH_FRAME_GAMES: MiniGameType[] = [
  'cloud_collapse',
  'fraction_match',
  'potion_pour',
  'take_out_rush',
  'prime_pop',
  'angle_arena',
  'polygon_palace',
  'data_dungeon',
  'monster_market',
  'ratio_rapids',
  'timekeeper_temple',
  'measurement_forge',
  'tower_of_factors',
  'place_value_peaks',
  'chart_chase',
  'equation_grove',
  'coordinate_quest',
  'calculation_clash',
  'percent_pulse',
  'percent_power',
  'transform_temple',
  'scale_safari',
  'unit_mixer',
  'mean_machine',
  'rule_runner',
  'formula_forge',
  'area_architect',
  'coordinate_cross',
  'ratio_fractions',
  'sequence_sprint',
  'logic_sort',
  'shape_shift',
  'matrix_match',
];

export const SCREEN_BEHAVIOR: Record<GameScreen, {
  scrollable: boolean;
  shell: 'splash' | 'compact' | 'playfield';
  family: 'hub' | 'game' | 'overlay';
}> = {
  splash: { scrollable: false, shell: 'splash', family: 'hub' },
  profile_setup: { scrollable: false, shell: 'compact', family: 'hub' },
  avatar_selection: { scrollable: false, shell: 'playfield', family: 'hub' },
  world_map: { scrollable: true, shell: 'playfield', family: 'hub' },
  island_levels: { scrollable: true, shell: 'playfield', family: 'hub' },
  gameplay: { scrollable: false, shell: 'playfield', family: 'game' },
  wellbeing_hub: { scrollable: false, shell: 'playfield', family: 'hub' },
  wellbeing_activity: { scrollable: false, shell: 'playfield', family: 'hub' },
  level_result: { scrollable: false, shell: 'playfield', family: 'overlay' },
  shop: { scrollable: false, shell: 'compact', family: 'hub' },
  profile: { scrollable: false, shell: 'compact', family: 'hub' },
  settings: { scrollable: false, shell: 'compact', family: 'hub' },
  parent_dashboard: { scrollable: true, shell: 'playfield', family: 'hub' },
};

export const IPHONE_STAGE_WIDTH = 390;
export const IPHONE_STAGE_HEIGHT = 844;
