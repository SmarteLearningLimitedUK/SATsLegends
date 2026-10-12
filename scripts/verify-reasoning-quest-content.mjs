import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const source = readFileSync(new URL('../src/games/ReasoningQuestGame.tsx', import.meta.url), 'utf8');
const expectedAnswers = new Map([
  ['rq-1', '11/12'],
  ['rq-2', '13/15'],
  ['rq-3', '20'],
  ['rq-4', '15'],
  ['rq-5', '1,500 m'],
  ['rq-6', '£1.25'],
  ['rq-7', '114'],
  ['rq-8', '75'],
  ['rq-9', '5'],
  ['rq-10', '9.2'],
  ['rq-11', '16:00'],
  ['rq-12', '1/2'],
]);

const entries = [...source.matchAll(/id: '(rq-\d+)'[\s\S]*?options: \[([^\]]+)\],[\s\S]*?correctIndex: (\d+)/g)];
assert.equal(entries.length, expectedAnswers.size, 'Reasoning Quest question count changed; review every answer key');
for (const [, id, rawOptions, rawIndex] of entries) {
  const expected = expectedAnswers.get(id);
  assert.ok(expected, `Unexpected Reasoning Quest question ${id}`);
  const options = [...rawOptions.matchAll(/'([^']+)'/g)].map((match) => match[1]);
  assert.equal(options.length, 4, `${id} must have four answer choices`);
  assert.equal(new Set(options).size, options.length, `${id} has duplicate choices`);
  assert.equal(options[Number(rawIndex)], expected, `${id} marks the wrong mathematical answer`);
  expectedAnswers.delete(id);
}
assert.equal(expectedAnswers.size, 0, `Missing Reasoning Quest questions: ${[...expectedAnswers.keys()].join(', ')}`);
console.log(`PASS ${entries.length} Reasoning Quest answer keys`);
