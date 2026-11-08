import type {SatsMission} from '../../../../src/systems/content/satsAdventure';

export interface PaperQuestionScene {
 kind:string;
 label:string;
 /** Existing Matharia artwork; never generated from an answer or a score. */
 objects:{group:string;name:string}[];
}
const prop=(name:string)=>({group:'props',name});
const fuel=['red','blue','gold','violet'].map(colour=>prop(`race_canister_${colour}_v3`));
const potions=['red','blue','gold','violet'].map(colour=>prop(`potion_bottle_${colour}_v3`));

/** Context comes from the question, not its revision-game tag or answer key.
 * Accurate diagrams and construction tasks keep their full existing workspace.
 * The illustrated object is a subject reference, not a countable quantity model.
 */
export function paperQuestionScene(q:SatsMission):PaperQuestionScene|null {
 if(q.visual.type!=='equation'&&q.visual.type!=='ratio')return null;
 const response=q.assessment?.response.kind;
 if(response&&['construction','matching','ordering','select-one','select-many'].includes(response))return null;
 const text=q.prompt.toLowerCase();
 if(/\bfuel\b/.test(text))return {kind:'fuel',label:'Fuel reading',objects:fuel};
 if(/\b(?:racers?|racing|races?|win rate)\b/.test(text))return {kind:'racing',label:'Race record',objects:[prop('prop_race_kart')]};
 if(/\bpotions?\b/.test(text))return {kind:'potion',label:'Potion recipe',objects:potions};
 if(/\b(?:crates?|cargo)\b/.test(text))return {kind:'cargo',label:'Cargo record',objects:[prop('remainder_crate_v3')]};
 if(/\b(?:ribbon|rope)\b/.test(text))return {kind:'rope',label:'Length record',objects:[prop('remainder_rope_v3')]};
 if(/\bbottles?\b/.test(text)&&!(/\btank\b/.test(text)))return {kind:'bottle',label:'Bottle record',objects:[prop('potion_bottle_blue_v3')]};
 if(/\bdrinks?\b/.test(text))return {kind:'drink',label:'Recipe measure',objects:[{group:'food',name:'food_juice'}]};
 if(/\b(?:tank|litres?)\b/.test(text))return {kind:'liquid',label:'Liquid measure',objects:[prop('prop_mix_tank')]};
 if(/\b(?:power|reactor|charge)\b/.test(text))return {kind:'power',label:'Power reading',objects:[prop('percent_reactor_v3')]};
 if(/\b(?:crystals?|counters?)\b/.test(text)&&!(/\b(?:digit|place)\b/.test(text)))return {kind:'crystal',label:'Collection record',objects:[{group:'gameplay',name:'match_gem_cyan'}]};
 if(/\b(?:cakes?|portions?|meals?|snacks?)\b/.test(text))return {kind:'food',label:'Order record',objects:[{group:'food',name:/\bcakes?\b/.test(text)?'share_cake_v3':'food_cookie'}]};
 if(/£|\b(?:money|costs?|change|pays?|paid|sale|reduced by|voucher|income)\b/.test(text))return {kind:'money',label:'Trade record',objects:[{group:'icons',name:'evidence_coins_v3'}]};
 return null;
}
