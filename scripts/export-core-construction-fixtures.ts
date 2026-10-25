import {writeFileSync,mkdirSync} from 'node:fs';
import {buildSatsPaper} from '../src/systems/content/satsAdventure';
const wanted=new Set(['draw-rectangle','draw-angle','depth-line-build','depth-pie-build','depth-angle-draw','depth-symmetry-axes','depth-rectangle-build','revision-fraction-shade','revision-pictogram-build']);
const fixtures:unknown[]=[];
for(let seed=0;seed<2000&&wanted.size;seed++)for(const key of ['mirror_gate','matrix_match']){
 const paper=buildSatsPaper(key,seed);
 for(let index=0;index<paper.missions.length;index++){
  const q=paper.missions[index];if(!wanted.has(q.id))continue;
  fixtures.push({key,paper:paper.number,seed,index,seconds:paper.seconds,question:q});wanted.delete(q.id);
 }
}
if(wanted.size)throw Error('No selected paper found for '+[...wanted].join(','));
mkdirSync('qa-artifacts/full-playtest/core-constructions',{recursive:true});
writeFileSync('qa-artifacts/full-playtest/core-constructions/fixtures.json',JSON.stringify(fixtures,null,2));
console.log('Exported',fixtures.length,'actual selected-paper construction fixtures');
