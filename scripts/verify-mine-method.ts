import assert from 'node:assert/strict';
import { multiplicationSteps, multiplicationWorking } from '../src/games/multiplicationMineMath';

const value = (row: Record<number, string>) => Object.entries(row).reduce((sum, [place, digit]) => sum + Number(digit) * 10 ** Number(place), 0);
let cases = 0;
for (const a of [1, 9, 12, 17, 99, 103, 125, 251, 908, 1001, 2007, 4050, 8765, 9999]) {
  for (let b = 1; b <= 99; b++) {
    const steps = multiplicationSteps(a, b), working = multiplicationWorking(a, b, steps.length);
    assert.equal(value(working.rows[0]), a * (b % 10 || (b < 10 ? b : 0)));
    if (b >= 10) {
      assert.equal(value(working.rows[1]), a * Math.floor(b / 10) * 10);
      assert.equal(value(working.rows[2]), a * b);
      assert.equal(working.rows[1][0], '0', 'tens row retains its ones placeholder');
      const placeholder = steps.findIndex(s => s.kind === 'placeholder');
      assert.ok(placeholder > 0 && steps.slice(0, placeholder).every(s => s.row === 0), 'ones row is completed before tens');
    } else assert.equal(value(working.rows[0]), a * b);
    for (let i = 0; i < steps.length; i++) {
      const step = steps[i];
      if (step.kind === 'column') assert.equal(step.answer, step.digit! * step.multiplier! + step.carry);
      assert.deepEqual(multiplicationWorking(a, b, 0).rows, [{}, {}, {}], 'no working is revealed before solving');
    }
    cases++;
  }
}
const example = multiplicationSteps(251, 15);
assert.deepEqual(example.map(s => s.answer), [5, 25, 12, 0, 1, 5, 2, 3765]);
assert.equal(multiplicationWorking(251, 15, 2).carries[0][2], 2);
console.log(`PASS ${cases} products: column carries, ones-first order, tens placeholders, aligned rows and final totals.`);
