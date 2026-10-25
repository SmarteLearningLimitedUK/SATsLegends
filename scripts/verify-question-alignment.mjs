import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
const root=process.env.LEGEND_ALIGNMENT_OUTPUT||'qa-artifacts/question-alignment/after';
const manifest=JSON.parse(await readFile(root+'/manifest.json','utf8'));
assert.equal(manifest.games,37);assert.equal(manifest.results.length,37*manifest.profiles.length);
const failures=[];
for(const row of manifest.results){
 const label=`${row.profile}/${row.key}`,cards=row.questionAlignment?.cards||[];
 if(!row.captured||row.runtimeErrors.length||row.layout?.overflow)failures.push({label,reason:'Capture, runtime or viewport-overflow failure'});
 if(cards.length!==1||cards.some(c=>Math.abs(c.offset)>1))failures.push({label,reason:'Primary question must be centred within one pixel',cards});
 const collisions=(row.layout?.issues||[]).filter(i=>i.kind==='question-chrome'||(i.kind==='label-outside-owner'&&cards.some(c=>Math.abs(c.left-i.bRect.left)<1&&Math.abs(c.top-i.bRect.top)<1))||i.kind==='control-overlap');
 if(collisions.length)failures.push({label,reason:'Question/chrome, text containment or control collision',collisions});
}
const report={passed:!failures.length,gameTypes:manifest.games,profiles:manifest.profiles,screenshots:manifest.results.length,maxCentreOffset:Math.max(...manifest.results.flatMap(r=>r.questionAlignment?.cards.map(c=>Math.abs(c.offset))||[])),failures};
await writeFile(root+'/alignment-verification.json',JSON.stringify(report,null,2));
assert.deepEqual(failures,[]);console.log(`PASS: ${report.screenshots} screenshots, ${report.gameTypes} game types; maximum question offset ${report.maxCentreOffset.toFixed(3)}px.`);
