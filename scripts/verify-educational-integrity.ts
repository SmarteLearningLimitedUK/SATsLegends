import {mathematicalFingerprint} from '../src/systems/learning/fingerprint';
import {validateAnswerEntry,finiteDecimalAnswer} from '../src/systems/content/answerEntry';
import assert from 'node:assert/strict';
import { arithmeticMissions, reasoningMissions, markMission, answersMatch, buildSatsPaper } from '../src/systems/content/satsAdventure';
import { calculationEvidence } from '../src/systems/content/calculationEvidence';
import { parsePaperCheckpoint, SATS_CONTENT_VERSION, SATS_MARKING_VERSION } from '../src/systems/content/satsPaperPersistence';

assert.deepEqual(calculationEvidence('.5 * 2'), [1]);
assert.deepEqual(calculationEvidence('2..5 * 2'), []);
assert.deepEqual(calculationEvidence('1 / 0'), []);
assert.deepEqual(calculationEvidence('globalThis.process.exit()'), []);
assert(!answersMatch('1,2', '12'));
assert(answersMatch('1,234', '1234'));
assert(answersMatch('.5', '1/2'));
assert(answersMatch('−0.5', '-1/2'));
assert(!answersMatch('1/0', '0'));
for (let seed = 0; seed < 200; seed++) {
  const missions = reasoningMissions(seed);
  const comparison = missions.find(q => q.id === 'fraction-compare')!;
  assert(!comparison.prompt.includes('are equal'), `seed ${seed}: false equivalence prompt`);
  const values = comparison.visual.type === 'fractions' ? comparison.visual.values : [];
  const ratios = values.map(v => { const [a, b] = v.split('/').map(Number); return a / b; });
  assert.equal(Number(comparison.fields[0].answer.split('/')[0]) / Number(comparison.fields[0].answer.split('/')[1]), Math.max(...ratios));
  const shaded = missions.find(q => q.id === 'ext-shaded-area')!;
  assert.equal(markMission(shaded, ['0'], `${shaded.marking?.kind === 'method' ? shaded.marking.intermediates[0] : 0} * 1`), 0);
  assert.equal(markMission(shaded, [shaded.fields[0].answer]), shaded.marks);
  assert(markMission(shaded, ['0'], shaded.fields[1].answer) > 0, 'authored method remains valid');
  const estimate = missions.find(q => q.id === 'depth-angle-estimate')!;
  assert.equal(markMission(estimate, [estimate.fields[0].answer + '°']), estimate.marks);
  for (const game of ['crystal_core', 'mirror_gate', 'matrix_match'] as const) {
    const paper = buildSatsPaper(game, seed);
    assert.equal(paper.missions.reduce((sum, q) => sum + q.marks, 0), paper.marks);
    const saved = { version: 2, contentVersion: SATS_CONTENT_VERSION, markingVersion: SATS_MARKING_VERSION,
      paper, paperFingerprint:mathematicalFingerprint(JSON.stringify(paper)), seed, deadline: Date.now() + 10000, index: 0, answers: {}, workpad: {}, draft: [], draftWorkpad: '' };
    const restored = parsePaperCheckpoint(JSON.stringify(saved));
    assert.equal(JSON.stringify(restored?.paper), JSON.stringify(paper));
    assert.equal(parsePaperCheckpoint(JSON.stringify({ ...saved, version: 1 })), null);
    assert.equal(parsePaperCheckpoint(JSON.stringify({ ...saved, paper: { ...paper, marks: 999 } })), null);
  }
  for (const q of arithmeticMissions(seed)) assert.equal(markMission(q, q.fields.map(f => f.answer)), q.marks);
}
console.log('PASS: 600 paper snapshots, arithmetic keys, fraction comparison, exact answers, method and unit regressions');

for(const raw of ['3/','1/0','1,2','2..5','','1 2','NaN','Infinity','1e3'])assert.equal(validateAnswerEntry(raw,{kind:'number'}).ok,false,raw);
for(const raw of ['−2','.5','1,234','1 2/3','-3/4'])assert.equal(validateAnswerEntry(raw,{kind:'number'}).ok,true,raw);
assert.deepEqual(validateAnswerEntry('24 cm²',{kind:'number',expectedUnit:'cm²'}),{ok:true,value:'24'});
assert.equal(validateAnswerEntry('24 cm',{kind:'number',expectedUnit:'cm²'}).ok,false);
assert.equal(validateAnswerEntry('2/4',{kind:'fraction',simplest:true}).ok,false);
assert.equal(validateAnswerEntry('1 2/4',{kind:'fraction',simplest:true}).ok,false);
assert.equal(validateAnswerEntry('1/2',{kind:'fraction',simplest:true}).ok,true);
assert.equal(validateAnswerEntry('.5',{kind:'fraction'}).ok,false);
assert.deepEqual(validateAnswerEntry('3 R 1',{kind:'quotient-remainder'}),{ok:true,value:'3 r1'});
console.log('PASS: independent response format, mixed/simplest fractions, negatives, grouping, units and quotient/remainder validation');

assert.equal(finiteDecimalAnswer('1/2'),.5);assert.equal(finiteDecimalAnswer('.1'),.1);
assert(Number.isNaN(finiteDecimalAnswer('13.0000000000000001')));
assert(Number.isNaN(finiteDecimalAnswer('1000000000000000001/1000000000000000000')));
console.log('PASS: rounded floating-point values cannot impersonate exact numeric answers');
