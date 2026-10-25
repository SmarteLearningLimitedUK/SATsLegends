import assert from 'node:assert/strict';
import { calculationEvidence, markExtendedMission } from '../src/systems/content/satsResponseMarking';
import type { SatsMission } from '../src/systems/content/satsAdventure';

// Constants are independently worked expected results, not calls to the parser.
const cases: Array<[string, number[]]> = [
  ['.5 + .5', [1]], ['0.5 + 0.5', [1]], ['-.5 + 1', [.5]],
  ['1 ÷ .5', [2]], ['1 ÷ 0.5', [2]], ['.25 × 4', [1]],
  ['(-.5 + 1) × 4', [.5, 2]], ['.5 × .5 + 2', [.25, 2.25]],
  ['1. + .5', [1.5]], ['2 + 3 × 4', [12, 14]], ['.5 + .5 = 1', [1]],
];
for (const [working, expected] of cases) assert.deepEqual(calculationEvidence(working), expected, working);
const invalid = ['..5 + 1', '. + 1', '1.2.3 + 4', '. 5 + 1', '1 +', '1 ÷ 0', '1 ÷ .0', '1 ** 2', '1e3 + 2', 'Infinity + 1', 'NaN + 1', 'alert(1)', '(1 + 2', '1 + 2)', `${'9'.repeat(400)} + 1`];
for (const working of invalid) assert.deepEqual(calculationEvidence(working), [], working);

// Exercise real method-credit routing independently of a generated answer key.
const question = { marks: 2, fields: [{ answer: '1' }], marking: { kind: 'method', intermediates: [] } } as unknown as SatsMission;
const compare = (a: string, b: string) => a === b;
assert.equal(markExtendedMission(question, ['wrong', '.5 + .5'], compare), 1);
assert.equal(markExtendedMission(question, ['wrong', '..5 + .5'], compare), 0);
assert.equal(markExtendedMission(question, ['1'], compare), 2);
const ten = { ...question, fields: [{ answer: '10' }] } as unknown as SatsMission;
assert.equal(markExtendedMission(ten, ['wrong', '.5 + .5'], compare), 0, 'Half plus half must not earn credit for ten');
console.log(`PASS ${cases.length} explicit decimal/precedence cases, ${invalid.length} malformed/unsafe cases and four method-credit routes`);
