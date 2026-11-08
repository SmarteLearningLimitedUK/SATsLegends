import {compositionFor} from './compositions';
const png = import.meta.glob('../assets/png/{backgrounds,heroes,portraits,map,branding,characters,props,food,illustrated_ui,frames,gameplay,buttons,runes,icons}/*.{png,webp}', { eager: true, query:'?url', import:'default' }) as Record<string,string>;
export const asset = (group:string,name:string) => png[`../assets/png/${group}/${name}@2x.webp`] ?? png[`../assets/png/${group}/${name}@2x.png`];
const islandArtwork:Record<number,string>={1:'island_arithmetic_acropolis',2:'island_fraction_forest',3:'island_geometry_glacier',4:'island_data_desert',5:'island_operations_outpost',6:'island_measurement_mountain',7:'island_ratio_rapids',8:'island_calculation_core'};
export const islandArtworkFor=(islandId:number)=>asset('map',islandArtwork[islandId]);
export const heroFor = (identity:string) => identity==='vex'||/rhino|burt/.test(identity)?'hero_rhino_idle': identity==='mochi'||/chef|dragon/.test(identity)?'hero_dragon_chef':identity==='bran'||/mage|goblin|wizard/.test(identity)?'hero_mage_idle':'hero_bran_idle';
export const backgroundFor=(key:string,_wide=false)=>asset('backgrounds',compositionFor(key).background);
/** Selection artwork can be more illustrative than the quiet gameplay scenery. */
const headingBackgrounds:Record<string,string>={
  match3_equivalence:'heading_match_mastery_v1',
  percent_power:'heading_percent_power_v1',
  time_keeper_cove:'heading_chrono_v1',
};
export const headingBackgroundFor=(key:string)=>asset('backgrounds',headingBackgrounds[key]??compositionFor(key).background);
const selectionThumbnails:Record<string,string>={shape_secrets:'heading_shape_secrets_v1',angle_arena:'heading_angle_arena_v1',polygon_palace:'heading_polygon_palace_v1'};
export const selectionThumbnailFor=(key:string)=>selectionThumbnails[key]?asset('backgrounds',selectionThumbnails[key]):headingBackgroundFor(key);
