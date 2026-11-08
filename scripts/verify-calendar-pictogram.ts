import assert from 'node:assert/strict';
import {mkdirSync,writeFileSync} from 'node:fs';
import {buildCalendarQuestion,isLeapYear,daysInMonth,addDays,dayDifference} from '../src/systems/content/calendarQuestions';
import {buildPictogramQuestion} from '../src/systems/content/pictogramQuestions';
import {markMission} from '../src/systems/content/satsAdventure';
import {mathematicalFingerprint} from '../src/systems/learning/fingerprint';
const rows=[];
assert.equal(isLeapYear(1900),false);assert.equal(isLeapYear(2000),true);assert.equal(isLeapYear(2100),false);
assert.equal(daysInMonth(2024,1),29);assert.equal(daysInMonth(2025,1),28);
assert.equal(addDays('2024-02-28',2),'2024-03-01');assert.equal(addDays('2025-12-31',1),'2026-01-01');
assert.equal(dayDifference('2026-03-28','2026-03-30'),2);assert.equal(dayDifference('2026-10-24','2026-10-26'),2);
for(let seed=0;seed<1000;seed++)for(let tier=1;tier<=5;tier++){
 assert.equal(new Set(Array.from({length:5},(_,round)=>mathematicalFingerprint(buildPictogramQuestion(tier,seed,round).mission))).size,5,`repeated pictogram: ${seed}/${tier}`);
 const c=buildCalendarQuestion(tier,seed,seed%5);
 assert.equal(markMission(c.mission,[c.answer]),1);assert.equal(markMission(c.mission,['wrong']),0);
 assert(c.mission.skillId?.startsWith('time.calendar-'));
 const p=buildPictogramQuestion(tier,seed,seed%5);
 assert.equal(markMission(p.mission,[p.mission.fields[0].answer]),1);
 if(p.build){assert.equal(markMission(p.mission,['pictogram:_:_:_']),0);assert(p.model.counts.every(count=>Number.isInteger(count)));}
 rows.push({tier,seed,calendar:c,pictogram:p});
}
mkdirSync('qa-artifacts/calendar-pictogram-2026-11-04',{recursive:true});
writeFileSync('qa-artifacts/calendar-pictogram-2026-11-04/question-samples.json',JSON.stringify(rows));
console.log('PASS: 5,000 calendar and 5,000 pictogram questions; marking, leap centuries, month/year boundaries and DST-independent day arithmetic.');
