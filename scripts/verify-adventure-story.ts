import assert from 'node:assert/strict';
import {ADVENTURE_STORIES,MATHARIA_STORY,adventureBriefing,adventureQuestion,adventureTask,getAdventureStory,shareMissionQuestion} from '../src/systems/content/adventureStory';
import {getLearnerGuide} from '../src/systems/content/learnerGuides';
import {mathematicalSpeech} from '../src/systems/learning/mathematicalSpeech';
import {COMPOSITIONS} from '../variants/matharia/src/compositions';

const assessments=new Set(['crystal_core','mirror_gate','matrix_match']);
const games=Object.keys(COMPOSITIONS).filter(key=>!assessments.has(key));
for(const key of games){
 const story=getAdventureStory(key);
 assert.ok(story,`Missing adventure mission: ${key}`);
 assert.equal(new Set(story.tasks).size,story.tasks.length,`Repeated task copy: ${key}`);
 assert.equal(story.tasks.length,8);
 assert.ok(adventureBriefing(key,'fallback').startsWith(MATHARIA_STORY));
 assert.ok(adventureBriefing(key,'').split(/\s+/).length<=32,`Long briefing: ${key}`);
 assert.ok(getLearnerGuide(key)?.summary.includes(MATHARIA_STORY),`Guide not connected: ${key}`);
 for(let step=0;step<32;step++){
  const task=adventureTask(key,step);
  assert.ok(task.split(/\s+/).length<=6,`Long task: ${key}`);
  assert.notEqual(task,adventureTask(key,step+1),`Adjacent repetition: ${key}`);
  const maths='From (−3, 2), move 4 units right. What is −3 + 4?';
  assert.ok(adventureQuestion(key,step,maths).endsWith(maths),'Mathematical information was changed');
  assert.equal(adventureTask(key,step),task,'Re-render changed the task');
 }
}
for(const key of ['crystal_core','mirror_gate','matrix_match','unknown','__proto__','toString']){
 assert.equal(adventureQuestion(key,3,'Complete 324 + 140.'),'Complete 324 + 140.');
 assert.equal(adventureBriefing(key,'Original assessment briefing'),'Original assessment briefing');
}
for(const [alias,key] of [['fraction_match','match3_equivalence'],['rotation_station','rotation_relay'],['potion_pour','potion_panic'],['timekeeper_temple','time_keeper_cove']]){
 assert.equal(getAdventureStory(alias),getAdventureStory(key));
}
assert.equal(adventureTask('number_line_ninja',NaN),adventureTask('number_line_ninja',0));
assert.equal(adventureTask('number_line_ninja',-1),adventureTask('number_line_ninja',0));
for(const cakes of [5,36,99,999])for(const crew of [2,3,5])for(let step=0;step<8;step++){
 const prompt=shareMissionQuestion(step,cakes,crew);
 assert.ok(prompt.includes(String(cakes))&&prompt.includes(String(crew)));
 assert.ok(prompt.length<=35,`Long banquet heading: ${prompt}`);
 assert.notEqual(prompt,shareMissionQuestion(step+1,cakes,crew));
}
const spoken=mathematicalSpeech(adventureQuestion('conversion_canyon',2,'Find 3/4 of 2.5 kg.'));
assert.ok(spoken.includes('3 over 4')&&spoken.includes('2 point 5 kilograms'),spoken);
console.log(JSON.stringify({passed:true,games:games.length,missions:Object.keys(ADVENTURE_STORIES).length,taskVariants:games.length*8,checks:'coverage, copy length, task variation, stable retries, preserved maths, aliases, assessment exclusions and mathematical speech'}));
