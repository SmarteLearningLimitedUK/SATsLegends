import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import ts from 'typescript';

const sourcePath = path.resolve(import.meta.dirname, '../src/games/MathsVsZombiesGame.tsx');
const source = readFileSync(sourcePath, 'utf8');
const compiled = ts.transpileModule(`${source}\nexport const __varietyQA = { buildFreshQuestion, questionSignature, ROUND_SECONDS };`, {
  fileName: sourcePath,
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
}).outputText;
const module = { exports: {} };
const inertImport = (name) => name.endsWith('/mathDisplay')
  ? { formatMultiplicationDisplay: (equation) => equation.replaceAll('×', 'x') }
  : {};
new Function('require', 'module', 'exports', compiled)(inertImport, module, module.exports);
const { buildFreshQuestion, questionSignature, ROUND_SECONDS } = module.exports.__varietyQA;

assert.equal(ROUND_SECONDS, 60);
for (let tier = 1; tier <= 5; tier += 1) {
  const used = new Set();
  const drawCount = tier === 1 ? 36 : 60;
  for (let index = 0; index < drawCount; index += 1) {
    const question = buildFreshQuestion(tier, used);
    assert.equal(question.options.length, 4);
    assert.equal(new Set(question.options).size, 4);
    assert.ok(question.correctIndex >= 0 && question.correctIndex < 4);
    const equation = question.prompt.split('\n\n').at(-1);
    const operands = equation.match(/^(-?\d+)\s*([+\-x÷])\s*\(?(-?\d+)\)?$/);
    assert.ok(operands, `Unreadable equation: ${equation}`);
    const a = Number(operands[1]), b = Number(operands[3]);
    const expected = operands[2] === '+' ? a + b : operands[2] === '-' ? a - b : operands[2] === 'x' ? a * b : a / b;
    assert.equal(question.options[question.correctIndex], expected, `Incorrect marking: ${equation}`);
    if (tier <= 2) assert.ok(a >= 0 && b >= 0 && expected >= 0, 'Opening levels stay non-negative');
    assert.equal(used.size, index + 1, `tier ${tier} repeated a question on draw ${index + 1}`);
    assert.ok(used.has(questionSignature(question)));
  }
  if (tier === 1) {
    const last = Array.from(used).at(-1);
    const recycled = buildFreshQuestion(tier, used);
    assert.notEqual(questionSignature(recycled), last, 'a recycled tier-one pool repeated immediately');
  }
}
console.log('PASS Maths vs Zombies 60-second round: unique questions within each tier pool and safe tier-one recycle');
