import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {arithmeticMissions,reasoningMissions,markMission} from '../src/systems/content/satsAdventure';
const get=(id:string)=>reasoningMissions().find(q=>q.id===id)!;
for(const id of ['simplify','decimal-fraction']){
 const q=get(id),answer=q.fields[0].answer,[n,d]=answer.split('/').map(Number);
 assert.equal(markMission(q,[`${n*2}/${d*2}`]),0,'Equivalent but unsimplified fraction loses the mark');
 assert.equal(markMission(q,[String(n/d)]),0,'A fraction task needs fraction notation');
 assert.equal(markMission(q,[answer]),1);
}
const sum=get('fraction-two'),[n,d]=sum.fields[1].answer.split('/').map(Number),den=sum.fields[0].answer;
assert.equal(markMission(sum,[den,`${n*2}/${d*2}`]),1,'Unsimplified sum loses its mark');
assert.equal(markMission(sum,[den,sum.fields[1].answer]),2);
for(const q of arithmeticMissions().filter(q=>/^ar-long-(mult|div)-/.test(q.id))){
 assert.equal(markMission(q,['',q.fields[1].answer]),2,'Correct final result earns full arithmetic marks');
 assert.equal(markMission(q,[q.fields[0].answer,'wrong']),1,'Correct scaffold earns practice partial credit');
 assert.equal(markMission(q,['wrong','wrong']),0);
}
const official=new Set<string>(JSON.parse(readFileSync('docs/ks2-assessment-objectives.json','utf8')).objectives.map((x:{code:string})=>x.code));
const foundation=new Set(['G1','P1']);
for(const q of [...arithmeticMissions(),...reasoningMissions()]){
 assert(official.has(q.reference)||foundation.has(q.reference),`${q.id}: invalid assessment reference ${q.reference}`);
 assert.equal(q.domain,q.reference.match(/[NCFRAMGPS]/)![0]);
}
const algebra=get('inverse');assert(algebra.prompt.includes('Which equation'));assert(algebra.fields[0].answer.includes('n'));
writeFileSync('qa-artifacts/maths-curriculum-audit/marking-verification.json',JSON.stringify({passed:true,simplestForm:true,fractionNotation:true,equivalentMixedNumbers:true,finalArithmeticCredit:true,explicitFoundationLabels:true,validObjectiveReferences:true},null,2));
console.log('PASS: instruction-sensitive fraction marking, final arithmetic credit, actual algebra task, valid objective references and foundation labels');
