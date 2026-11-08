import {asset,selectionThumbnailFor} from './assets';

/** Island scenery stays independent of whichever game is focused. */
const worlds:Record<number,string>={
  "1": "bg_selection_acropolis_v1",
  "2": "bg_selection_fraction_forest_v1",
  "3": "bg_geometry_selection_v1",
  "4": "bg_selection_data_desert_v1",
  "5": "bg_selection_operations_outpost_v1",
  "6": "bg_selection_measurement_mountain_v1",
  "7": "bg_selection_ratio_rapids_v1",
  "8": "bg_selection_calculation_core_v1"
};
const illustrations:Record<string,string>={
  "place_value_panic": "selection_place_value_panic_v1",
  "number_line_ninja": "selection_number_line_ninja_v1",
  "prime_pop": "selection_prime_pop_v2",
  "rounding_rocket": "selection_rounding_rocket_v1",
  "maths_vs_zombies": "selection_maths_vs_zombies_v1",
  "acropolis_clearout": "selection_acropolis_clearout_v1",
  "take_out_rush": "selection_take_out_rush_v1",
  "fraction_forge": "selection_fraction_forge_v1",
  "simplify_sprint": "selection_simplify_sprint_v1",
  "shattered_whole": "selection_shattered_whole_v1",
  "mean_machine": "selection_mean_machine_v1",
  "graph_grabber": "selection_graph_grabber_v1",
  "line_graph_lab": "selection_line_graph_lab_v1",
  "data_detective": "selection_data_detective_v1",
  "factor_frenzy": "selection_factor_frenzy_v1",
  "multiplication_mine": "selection_multiplication_mine_v1",
  "order_ops_arena": "selection_order_ops_arena_v1",
  "formula_forge": "selection_formula_forge_v1",
  "remainder_run": "selection_remainder_run_v1",
  "rune_relations": "selection_rune_relations_v1",
  "divide_conquer": "selection_divide_conquer_v1",
  "problem_pyramid": "selection_problem_pyramid_v1",
  "unit_mixer": "selection_unit_mixer_v1",
  "change_counter": "selection_change_counter_v1",
  "calendar_quest": "selection_calendar_quest_v1",
  "potion_panic": "selection_potion_panic_v1",
  "share_splitter": "selection_share_splitter_v1",
  "ratio_fractions": "selection_ratio_fractions_v1",
  "scale_builder": "selection_scale_builder_v1",
  "crystal_core": "selection_crystal_core_v1",
  "mirror_gate": "selection_mirror_gate_v1",
  "matrix_match": "selection_matrix_match_v1"
};
export const islandSelectionBackgroundFor=(islandId:number)=>asset('backgrounds',worlds[islandId]);
/** Retain the existing game-specific headings when they already depict the activity. */
export const islandSelectionThumbnailFor=(key:string)=>illustrations[key]?asset('backgrounds',illustrations[key]):selectionThumbnailFor(key);
