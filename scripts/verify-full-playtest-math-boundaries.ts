import assert from 'node:assert/strict';
import { writeFileSync, readFileSync } from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import { buildNumberLineQuestion } from '../src/games/numberLineQuestions';
import { clockRoman, clockQuestion, clockLabels } from '../src/games/chronoDashQuestions';
import { multiplicationSteps, multiplicationWorking } from '../src/games/multiplicationMineMath';
import { createQuestion } from '../src/games/rotationStationQuestions';

let seed = 0x23102026;
const random = () => ((seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 2 ** 32);
Math.random = random;
const number = (text: string): number => {
  const mixed = text.match(/^(\d+) (\d+)\/(\d+)$/);
  if (mixed) return +mixed[1] + +mixed[2] / +mixed[3];
  const fraction = text.match(/^(-?\d+)\/(\d+)$/);
  return fraction ? +fraction[1] / +fraction[2] : Number(text);
};
const report = { numberLines: 0, romanValues: 0, clockQuestions: 0, multiplication: 0, transforms: 0, rounding: 0 };
for (let tier = 1; tier <= 5; tier++) for (let round = 0; round < 300; round++) {
  const q = buildNumberLineQuestion(tier, round, false, random);
  const visible = q.labels.map((label, i) => ({ label, i })).filter(x => x.label && x.label !== '?');
  const a = visible[0], b = visible[1];
  const step = (number(b.label) - number(a.label)) / (b.i - a.i);
  const expected = number(a.label) + step * (q.focusIndex - a.i);
  assert(Math.abs(expected - number(q.answer)) < 1e-9, JSON.stringify(q));
  assert.equal(q.options.filter(o => Math.abs(number(o) - expected) < 1e-9).length, 1);
  assert.equal(new Set(q.options.map(number)).size, 4);
  q.labels.forEach((label, i) => { if (label && label !== '?') assert(Math.abs(number(label) - q.values[i]) < 1e-9); });
  report.numberLines++;
  const t = createQuestion(tier, round);
  for (let i = 0; i < t.source.length; i++) {
    const source = t.source[i], target = t.target[i];
    assert(target.x >= t.min && target.x <= t.max && target.y >= t.min && target.y <= t.max);
    if (t.mode === 'reflect') {
      assert.equal(t.axis === 'x' ? target.y : target.x, t.axis === 'x' ? source.y : source.x);
      assert.equal((t.axis === 'x' ? target.x + source.x : target.y + source.y) / 2, t.mirror);
    } else { assert.equal(target.x - source.x, t.dx); assert.equal(target.y - source.y, t.dy); }
  }
  assert.equal(new Set(t.options.map(o => o.label)).size, t.options.length);
  if (t.mode === 'describe') assert.equal(t.options.filter(o => o.id === 'correct').length, 1);
  report.transforms++;
}
// Decode by subtractive adjacency, independently of the production lookup.
const romanValue = (text: string) => [...text].reduce((sum, c, i, all) => {
  const values: Record<string, number> = { I: 1, V: 5, X: 10, L: 50 };
  return sum + (values[c] < values[all[i + 1]] ? -values[c] : values[c]);
}, 0);
for (let n = 1; n <= 59; n++) { assert.equal(romanValue(clockRoman(n)), n); report.romanValues++; }
for (const n of [0, -1, 60, .5, NaN, Infinity]) assert.throws(() => clockRoman(n), RangeError);
assert.deepEqual(clockLabels('roman'), ['XII','I','II','III','IV','V','VI','VII','VIII','IX','X','XI']);
for (let hours = 1; hours <= 12; hours++) for (let minutes = 0; minutes < 60; minutes++) {
  const prompt = clockQuestion({ hours, minutes }, 'roman');
  if (!minutes) assert(prompt.endsWith('o’clock.'));
  else { const nums = prompt.match(/\b[IVXL]+\b/g)!; assert.equal(romanValue(nums[0]), hours); assert.equal(romanValue(nums[1]), minutes); }
  report.clockQuestions++;
}
for (const a of [1,9,10,19,99,100,109,199,999,1000,9999]) for (let b = 1; b <= 99; b++) {
  const steps = multiplicationSteps(a, b), working = multiplicationWorking(a, b, steps.length);
  const rowValue = (row: Record<number, string>) => Object.entries(row).reduce((sum,[place,digit]) => sum + +digit * 10 ** +place, 0);
  assert.equal(b < 10 ? rowValue(working.rows[0]) : rowValue(working.rows[2]), a * b);
  if (b >= 10) assert.equal(rowValue(working.rows[0]) + rowValue(working.rows[1]), a * b);
  report.multiplication++;
}
// Extract only local pure generator declarations; React/assets never execute.
const file = 'src/games/RoundingRocketGame.tsx', text = readFileSync(file, 'utf8');
const source = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
const declarations = source.statements.filter(n => !ts.isImportDeclaration(n) && n.getStart(source) < text.indexOf('const RoundingRocketGame:')).map(n => n.getText(source)).join('\n');
const code = ts.transpileModule(declarations + '\nglobalThis.audit={generateRound,buildPadOptions}', { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS } }).outputText;
const context: any = { exports: {}, Math, Date }; vm.runInNewContext(code, context);
for (let tier = 1; tier <= 5; tier++) for (let i = 0; i < 1000; i++) {
  const q = context.audit.generateRound(tier, tier);
  const lower = q.value - q.value % q.target;
  const expected = q.value - lower < q.target / 2 ? lower : lower + q.target;
  assert.equal(q.correctAnswer, expected); assert.equal(q.pads.filter((x: number) => x === expected).length, 1); assert.equal(new Set(q.pads).size, 3);
  report.rounding++;
}
writeFileSync('qa-artifacts/full-playtest/content/independent-boundaries.json', JSON.stringify({ passed: true, seed: '0x23102026', ...report }, null, 2));
console.log('PASS independent boundary calculations', JSON.stringify(report));

