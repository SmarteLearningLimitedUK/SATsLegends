import assert from 'node:assert/strict';
import { mkdirSync, writeFileSync } from 'node:fs';
import { revisionGapMissions } from '../src/systems/content/satsRevisionGapMissions';
import { buildSatsPaper, getRevisionMissions, markMission } from '../src/systems/content/satsAdventure';
import { LEARNER_GUIDES } from '../src/systems/content/learnerGuides';
import { depthConstruction } from '../src/systems/content/satsDepthModels';
const reachable = new Set<string>(), ids = new Set<string>();
const samples: unknown[] = [];
for (let seed = 0; seed < 1000; seed++) {
  const missions = revisionGapMissions(seed);
  assert.equal(missions.length,10);
  for (const q of missions) {
    ids.add(q.id);
    if(q.id==='revision-combinations'){
      assert(q.visual.type==='depth' && q.visual.model.kind==='choice-pairs');
      const groups=q.visual.model.groups;
      assert.equal(groups.length,2);
      for(const group of groups)assert.equal(new Set(group.choices).size,group.choices.length);
      assert.equal(Number(q.fields[0].answer),groups[0].choices.length*groups[1].choices.length);
      assert(q.prompt.includes('How many different'));
    }
    assert.equal(markMission(q,q.fields.map(f=>f.answer)),q.marks,q.id);
    assert.equal(markMission(q,[]),0,q.id);
    assert.equal(markMission(q,q.fields.map(()=> 'wrong')),0,q.id);
    assert(LEARNER_GUIDES[q.game]?.revisionKey);
    assert(getRevisionMissions(q.game,seed-1).some(m=>m.id===q.id));
    if(q.visual.type==='depth' && (q.visual.model.kind==='pictogram-build'||q.visual.model.kind==='fraction-grid'&&q.visual.model.construct)) assert(depthConstruction(q.visual.model));
    if(q.id==='revision-pictogram-build'){
      assert(q.marking?.kind==='plot');
      assert.equal(markMission(q,['pictogram:'+q.marking.expected.slice(0,2).join(':')+':_']),1);
      assert.equal(markMission(q,[q.fields[0].answer+':9']),0);
      assert.equal(markMission(q,['pictogram:NaN:1:2']),0);
    }
    if(q.id==='revision-fraction-shade'){
      assert.equal(markMission(q,['shade:101']),0);assert.equal(markMission(q,['shade:-1']),0);
      assert.equal(markMission(q,['shade:50:garbage']),0);
    }
    if(q.id==='revision-context-round') assert.equal(markMission(q,[String(Number(q.fields[0].answer)+1)]),0);
    if(seed<125)samples.push(q);
  }
  for(const key of ['mirror_gate','matrix_match']){
    const paper=buildSatsPaper(key,seed);assert.equal(paper.missions.length,25);assert.equal(paper.missions.reduce((sum,q)=>sum+q.marks,0),35);
    paper.missions.filter(q=>q.id.startsWith('revision-')).forEach(q=>reachable.add(q.id));
  }
}
assert.deepEqual(reachable,ids,'All added families must be selected into Core papers');
const out='qa-artifacts/sats-topic-changes';mkdirSync(out,{recursive:true});
writeFileSync(out+'/samples.json',JSON.stringify(samples,null,2));
writeFileSync(out+'/content-checks.json',JSON.stringify({passed:true,seeds:1000,families:ids.size,reachable:[...reachable],checks:['Correct, empty and incorrect answers','Pictogram partial credit and malformed input','Bounded shading','Rounding to specified accuracy','Guided practice access','Core reachability and 35-mark papers']},null,2));
console.log('PASS: 10 new families across 1,000 seeds; all reachable in Core and island practice.');
