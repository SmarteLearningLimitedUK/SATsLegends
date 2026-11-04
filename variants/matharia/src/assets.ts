import {compositionFor} from './compositions';
const png = import.meta.glob('../assets/png/{backgrounds,heroes,portraits,map,branding,characters,props,food,illustrated_ui,frames,gameplay,buttons,runes,icons}/*.{png,webp}', { eager: true, query:'?url', import:'default' }) as Record<string,string>;
export const asset = (group:string,name:string) => png[`../assets/png/${group}/${name}@2x.webp`] ?? png[`../assets/png/${group}/${name}@2x.png`];
export const heroFor = (identity:string) => identity==='vex'||/rhino|burt/.test(identity)?'hero_rhino_idle': identity==='mochi'||/chef|dragon/.test(identity)?'hero_dragon_chef':identity==='bran'||/mage|goblin|wizard/.test(identity)?'hero_mage_idle':'hero_bran_idle';
export const backgroundFor=(key:string,_wide=false)=>asset('backgrounds',compositionFor(key).background);
/** Selection artwork can be more illustrative than the quiet gameplay scenery. */
const headingBackgrounds:Record<string,string>={
  match3_equivalence:'heading_match_mastery_v1',
  percent_power:'heading_percent_power_v1',
  time_keeper_cove:'heading_chrono_v1',
};
export const headingBackgroundFor=(key:string)=>asset('backgrounds',headingBackgrounds[key]??compositionFor(key).background);
