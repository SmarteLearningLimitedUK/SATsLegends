import share from '../reference/share-assets.json';
import potion from '../reference/potion-assets.json';
import wizard from '../reference/wizard-activities.json';
import detective from '../reference/detective-activities.json';
import miner from '../reference/miner-activities.json';
import {asset} from './assets';
/** Exact original identity; wardrobe never changes the player's saved character. */
export function wizardArt(identity:string|undefined){
 const entry=wizard.assets.find(a=>a.identity===identity)??wizard.assets[0];
 return{...entry,source:asset('heroes',entry.name),box:entry.avatarBounds.join(' ')};
}
export function detectiveArt(identity:string|undefined){
 const entry=detective.assets.find(a=>a.identity===identity)??detective.assets[0];
 return{...entry,source:asset('heroes',entry.name),box:entry.avatarBounds.join(' ')};
}

export function minerArt(identity:string|undefined){const entry=miner.assets.find(a=>a.identity===identity)??miner.assets[0];return{...entry,source:asset('heroes',entry.name),box:entry.avatarBounds.join(' ')}}

export function readerArt(identity:string|undefined){const entry=potion.assets.find(a=>a.identity===identity)??potion.assets.find(a=>a.identity==='barratt')!;return{...entry,source:asset('heroes',entry.name.split('/').pop()!),box:entry.avatarBounds!.join(' ')}}

export function hostArt(identity:string|undefined){const entry=share.assets.find(a=>a.identity===identity)??share.assets.find(a=>a.identity==='barratt')!;return{...entry,source:asset('heroes',entry.name.split('/').pop()!),box:entry.avatarBounds!.join(' ')}}
