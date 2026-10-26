import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
const read=async p=>JSON.parse(await readFile(p,'utf8'));
const {games}=await read('native/production-rebuild/game-inventory.json');
const rows=await read('qa-artifacts/production-rebuild/after/report.json');
const failures=[],reviews=[];
const gridAnnotation=i=>/^Marker at x=/.test(i.b||'')&&(
 i.kind==='label-control'&&/^(-?\d+|x|y|●|Start \(|,|\))$/.test(i.a)
 ||i.kind==='label-outside-owner'&&i.a==='S');
for(const game of games)for(const profile of ['compact','standard','large','tablet']){
 const row=rows.find(r=>r.key===game.key&&r.profile===profile);
 if(!row){failures.push({key:game.key,profile,reason:'Missing screenshot'});continue;}
 const issues=row.geometry.issues.filter(i=>!(game.key==='coordinates_quest'&&gridAnnotation(i)));
 const directGrid=row.presentation.controls.filter(c=>/^Marker at x=/.test(c.name));
 const small=row.presentation.controls.filter(c=>Math.min(c.rect.width,c.rect.height)<43.9&&!/^Marker at x=/.test(c.name));
 if(directGrid.some(c=>Math.min(c.rect.width,c.rect.height)<44)){
  for(const name of ['Decrease x','Increase x','Decrease y','Increase y','Choose point']){
   const alternative=row.presentation.controls.find(c=>c.name===name);
   if(!alternative||Math.min(alternative.rect.width,alternative.rect.height)<43.9)issues.push({kind:'missing-large-grid-alternative',name});
  }
 }
 const clipped=row.presentation.questions.filter(q=>q.clipped);
 const passed=row.passed&&!issues.length&&!small.length&&!clipped.length;
 const review={key:game.key,profile,file:row.file,passed,intentionalGridAnnotations:row.geometry.issues.length-issues.length};
 reviews.push(review);if(!passed)failures.push({...review,issues,small,clipped,error:row.error});
}
const luminance=hex=>{const rgb=hex.match(/\w\w/g).map(s=>parseInt(s,16)/255).map(n=>n<=.04045?n/12.92:((n+.055)/1.055)**2.4);return rgb[0]*.2126+rgb[1]*.7152+rgb[2]*.0722;};
const contrast=(a,b)=>{const l=[luminance(a),luminance(b)].sort((a,b)=>b-a);return (l[0]+.05)/(l[1]+.05);};
const contrastPairs=[['body','fff6de','20544a'],['supporting','d3e6dc','20544a'],['action','17392e','efb947'],['success','83e5a0','082d30'],['error','ffb2ac','082d30']].map(([name,a,b])=>({name,ratio:contrast(a,b),passed:contrast(a,b)>=4.5}));
assert(contrastPairs.every(x=>x.passed),'Semantic text/control colours need 4.5:1 contrast');
await writeFile('qa-artifacts/production-rebuild/visual-quality.json',JSON.stringify({scope:'Chromium rendered openings; geometry, questions, touch alternatives and token contrast. Human art review and native validation are separate gates.',cases:reviews.length,passed:reviews.filter(x=>x.passed).length,reviews,contrastPairs,failures},null,2));
console.log(JSON.stringify({cases:reviews.length,passed:reviews.filter(x=>x.passed).length,failures:failures.map(x=>({key:x.key,profile:x.profile,small:x.small?.map(c=>c.name),issues:x.issues?.map(i=>i.kind),clipped:x.clipped?.length}))}));
if(failures.length)process.exitCode=1;
