export type Composition = {
  orientation:'portrait'|'landscape'; reference:string; hero:string;
  layout:'bubbles'|'match'|'digits'|'rocket'|'machine'|'chart'|'plot'|'numberline'|'potion'|'cafe'|'sharing'|'race'|'blueprint'|'board'|'instrument'|'paper';
  background:string; ownsHero?:boolean;
};
const c=(layout:Composition['layout'],reference:string,hero='hero_bran_idle',orientation:Composition['orientation']='portrait',background='bg_acropolis_landscape',ownsHero=false):Composition=>({layout,reference,hero,orientation,background,ownsHero});
/** Every activity has an explicit composition; reference identifies direct or related art direction. */
export const COMPOSITIONS:Record<string,Composition>={
 shattered_whole:{layout:"board",reference:"shattered_whole",hero:"hero_bran_idle",orientation:"landscape",background:"bg_shattered_sanctuary_v1",ownsHero:true},
 "place_value_panic": {
  "layout": "digits",
  "reference": "place_value_panic",
  "hero": "hero_rhino_idle",
  "orientation": "portrait",
  "background": "bg_place_value_v2",
  "ownsHero": true
 },
 "number_line_ninja": {
  "layout": "numberline",
  "reference": "number_line_ninja",
  "hero": "hero_mage_idle",
  "orientation": "landscape",
  "background": "bg_ninja_v2",
  "ownsHero": true
 },
 "prime_pop": {
  "layout": "bubbles",
  "reference": "prime_pop",
  "hero": "hero_bran_idle",
  "orientation": "portrait",
  "background": "bg_prime_pop_v2",
  "ownsHero": false
 },
 "rounding_rocket": {
  "layout": "rocket",
  "reference": "rounding_rocket",
  "hero": "hero_mage_idle",
  "orientation": "portrait",
  "background": "bg_rocket_v2",
  "ownsHero": true
 },
 "maths_vs_zombies": {
  "layout": "instrument",
  "reference": "maths_vs_zombies",
  "hero": "hero_bran_idle",
  "orientation": "landscape",
  "background": "bg_zombies_graveyard_v4",
  "ownsHero": true
 },
 "take_out_rush": {
  "layout": "cafe",
  "reference": "take_out_rush",
  "hero": "hero_dragon_chef",
  "orientation": "landscape",
  "background": "bg_takeout_tavern",
  "ownsHero": true
 },
 "fraction_forge": {
  "layout": "instrument",
  "reference": "fraction_forge",
  "hero": "hero_dragon_chef",
  "orientation": "landscape",
  "background": "bg_fraction_forge_v2",
  "ownsHero": true
 },
 "match3_equivalence": {
  "layout": "match",
  "reference": "match3_equivalence",
  "hero": "hero_bran_idle",
  "orientation": "portrait",
  "background": "bg_match_mastery_quiet_v3",
  "ownsHero": false
 },
 "percent_power": {
  "layout": "instrument",
  "reference": "percent_power",
  "hero": "hero_bran_idle",
  "orientation": "portrait",
  "background": "bg_percent_quiet_v4",
  "ownsHero": true
 },
 "simplify_sprint": {
  "layout": "board",
  "reference": "simplify_sprint",
  "hero": "hero_bran_idle",
  "orientation": "landscape",
  "background": "bg_sprint_v3",
  "ownsHero": true
 },
 "angle_arena": {
  "layout": "instrument",
  "reference": "angle_arena",
  "hero": "hero_mage_idle",
  "orientation": "landscape",
  "background": "bg_angle_v3",
  "ownsHero": true
 },
 "polygon_palace": {
  "layout": "board",
  "reference": "polygon_palace",
  "hero": "hero_bran_idle",
  "orientation": "portrait",
  "background": "bg_polygon_v3",
  "ownsHero": true
 },
 "area_architect": {
  "layout": "blueprint",
  "reference": "area_architect",
  "hero": "hero_bran_idle",
  "orientation": "landscape",
  "background": "bg_area_v3",
  "ownsHero": true
 },
 "rotation_relay": {
  "layout": "board",
  "reference": "rotation_relay",
  "hero": "hero_bran_idle",
  "orientation": "landscape",
  "background": "bg_transform_v3",
  "ownsHero": true
 },
 "coordinates_quest": {
  "layout": "board",
  "reference": "coordinates_quest",
  "hero": "hero_bran_idle",
  "orientation": "landscape",
  "background": "bg_coordinates_v3",
  "ownsHero": true
 },
 "conversion_canyon": {
  "layout": "instrument",
  "reference": "conversion_canyon",
  "hero": "hero_bran_idle",
  "orientation": "portrait",
  "background": "bg_conversion_v3",
  "ownsHero": true
 },
 "perimeter_path": {
  "layout": "blueprint",
  "reference": "perimeter_path",
  "hero": "hero_bran_idle",
  "orientation": "landscape",
  "background": "bg_perimeter_v3",
  "ownsHero": true
 },
 "mean_machine": {
  "layout": "machine",
  "reference": "mean_machine",
  "hero": "hero_bran_idle",
  "orientation": "portrait",
  "background": "bg_mean_v3",
  "ownsHero": true
 },
 "graph_grabber": {
  "layout": "chart",
  "reference": "graph_grabber",
  "hero": "hero_bran_idle",
  "orientation": "landscape",
  "background": "bg_graph_v3",
  "ownsHero": true
 },
 "line_graph_lab": {
  "layout": "plot",
  "reference": "line_graph_lab",
  "hero": "hero_bran_idle",
  "orientation": "landscape",
  "background": "bg_line_v3",
  "ownsHero": true
 },
 "data_detective": {
  "layout": "board",
  "reference": "data_detective",
  "hero": "hero_bran_idle",
  "orientation": "landscape",
  "background": "bg_data_v3",
  "ownsHero": true
 },
 "factor_frenzy": {
  "layout": "instrument",
  "reference": "factor_frenzy",
  "hero": "hero_mage_idle",
  "orientation": "portrait",
  "background": "bg_factor_v3",
  "ownsHero": true
 },
 "multiplication_mine": {
  "layout": "instrument",
  "reference": "multiplication_mine",
  "hero": "hero_bran_idle",
  "orientation": "portrait",
  "background": "bg_mine_v3",
  "ownsHero": true
 },
 "order_ops_arena": {
  "layout": "board",
  "reference": "order_ops_arena",
  "hero": "hero_mage_idle",
  "orientation": "portrait",
  "background": "bg_ops_v3",
  "ownsHero": true
 },
 "formula_forge": {
  "layout": "board",
  "reference": "formula_forge",
  "hero": "hero_bran_idle",
  "orientation": "portrait",
  "background": "bg_formula_v3",
  "ownsHero": true
 },
 "remainder_run": {
  "layout": "board",
  "reference": "remainder_run",
  "hero": "hero_bran_idle",
  "orientation": "landscape",
  "background": "bg_remainder_v3",
  "ownsHero": true
 },
 "time_keeper_cove": {
  "layout": "instrument",
  "reference": "time_keeper_cove",
  "hero": "hero_mage_idle",
  "orientation": "portrait",
  "background": "bg_chrono_v4",
  "ownsHero": true
 },
 "problem_pyramid": {
  "layout": "board",
  "reference": "problem_pyramid",
  "hero": "hero_bran_idle",
  "orientation": "portrait",
  "background": "bg_pyramid_v3",
  "ownsHero": true
 },
 "unit_mixer": {
  "layout": "instrument",
  "reference": "unit_mixer",
  "hero": "hero_mage_idle",
  "orientation": "landscape",
  "background": "bg_lava_v3",
  "ownsHero": true
 },
 "change_counter": {
  "layout": "instrument",
  "reference": "change_counter",
  "hero": "hero_mage_idle",
  "orientation": "landscape",
  "background": "bg_change_shop_v3",
  "ownsHero": true
 },
 "potion_panic": {
  "layout": "potion",
  "reference": "potion_panic",
  "hero": "hero_bran_idle",
  "orientation": "landscape",
  "background": "bg_potion_v3",
  "ownsHero": true
 },
 "share_splitter": {
  "layout": "sharing",
  "reference": "share_splitter",
  "hero": "hero_mage_idle",
  "orientation": "landscape",
  "background": "bg_share_v3",
  "ownsHero": true
 },
 "ratio_fractions": {
  "layout": "race",
  "reference": "ratio_fractions",
  "hero": "hero_bran_idle",
  "orientation": "landscape",
  "background": "bg_race_v3",
  "ownsHero": true
 },
 "scale_builder": {
  "layout": "blueprint",
  "reference": "scale_builder",
  "hero": "hero_bran_idle",
  "orientation": "landscape",
  "background": "bg_scale_v3",
  "ownsHero": true
 },
 "crystal_core": {
  "layout": "paper",
  "reference": "crystal_core",
  "hero": "hero_bran_idle",
  "orientation": "portrait",
  "background": "bg_paper1_v3",
  "ownsHero": true
 },
 "mirror_gate": {
  "layout": "paper",
  "reference": "mirror_gate",
  "hero": "hero_mage_idle",
  "orientation": "landscape",
  "background": "bg_paper2_v3",
  "ownsHero": true
 },
 "matrix_match": {
  "layout": "paper",
  "reference": "matrix_match",
  "hero": "hero_rhino_idle",
  "orientation": "landscape",
  "background": "bg_paper3_v3",
  "ownsHero": true
 }
};
// Reuse the approved timekeeping artwork and chart composition for the new mathematical surface.
COMPOSITIONS.shape_secrets={...COMPOSITIONS.polygon_palace,reference:'polygon_palace',orientation:'landscape',ownsHero:true};
COMPOSITIONS.acropolis_clearout={...COMPOSITIONS.place_value_panic,reference:'place_value_panic',ownsHero:true};
COMPOSITIONS.divide_conquer={...COMPOSITIONS.multiplication_mine,reference:'multiplication_mine',background:'bg_remainder_v3',ownsHero:true};
COMPOSITIONS.rune_relations={...COMPOSITIONS.graph_grabber,reference:'graph_grabber',background:'bg_remainder_v3',layout:'chart',orientation:'landscape',ownsHero:true};
COMPOSITIONS.calendar_quest={...COMPOSITIONS.time_keeper_cove,layout:'chart',orientation:'landscape',ownsHero:true};
export function compositionFor(key:string):Composition {return COMPOSITIONS[key]??c('board','scale_builder');}
export function screenOrientationFor(screen:string,key?:string,activityId?:string|null):Composition['orientation'] {
 if(screen==='gameplay'&&key&&COMPOSITIONS[key]?.orientation==='landscape')return 'landscape';
 if(screen==='wellbeing_activity'&&calmOrientationFor(activityId)==='landscape')return 'landscape';
 return 'portrait';
}
export function rotationRequired(key:string|undefined,screen:string,width:number,height:number,activityId?:string|null){
 if(!width||!height)return false;
 return screenOrientationFor(screen,key,activityId)==='portrait'?width>height:height>width;
}
/** Existing Calm Grove layouts: Pond is landscape; the other activities are portrait. */
export function calmOrientationFor(activityId:string|null|undefined):'portrait'|'landscape' {return activityId==='peaceful_pond'?'landscape':'portrait';}
export function measuredLayoutFor(key:string|undefined){return Boolean(key&&['match3_equivalence','prime_pop','fraction_forge','place_value_panic','number_line_ninja','rounding_rocket','maths_vs_zombies','take_out_rush','percent_power','simplify_sprint','polygon_palace','angle_arena','area_architect','rotation_relay','coordinates_quest','perimeter_path','conversion_canyon','mean_machine','graph_grabber','line_graph_lab','data_detective','factor_frenzy','multiplication_mine','order_ops_arena','formula_forge','remainder_run','time_keeper_cove','problem_pyramid','unit_mixer','change_counter','crystal_core','mirror_gate','matrix_match','potion_panic','share_splitter','ratio_fractions','scale_builder','calendar_quest','shattered_whole','rune_relations','divide_conquer','acropolis_clearout','shape_secrets'].includes(key));}

