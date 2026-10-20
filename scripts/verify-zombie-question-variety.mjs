import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import ts from 'typescript';

const sourcePath = path.resolve(import.meta.dirname, '../src/games/MathsVsZombiesGame.tsx');
const source = readFileSync(sourcePath, 'utf8');
const compiled = ts.transpileModule(`${source}\nexport const __varietyQA = { buildQuestion, buildFreshQuestion, questionSignature, formatZombieQuestion, ROUND_SECONDS };`, {
  fileName: sourcePath,
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
}).outputText;
const module = { exports: {} };
const inertImport = (name) => name.endsWith('/mathDisplay')
  ? { formatMultiplicationDisplay: (equation) => equation.replaceAll('×', 'x') }
  : {};
new Function('require', 'module', 'exports', compiled)(inertImport, module, module.exports);
const { buildQuestion, buildFreshQuestion, questionSignature, formatZombieQuestion, ROUND_SECONDS } = module.exports.__varietyQA;

assert.equal(ROUND_SECONDS, 60);
assert.equal(formatZombieQuestion('-8 - 1', 1), '-8 minus 1 = ?');
assert.equal(formatZombieQuestion('-8 - 1', 0), '-8 - 1 = ?');
assert.equal(formatZombieQuestion('-8 - 1', 2), 'What is -8 minus 1?');
assert.equal(formatZombieQuestion('-8 - (-1)', 1), '-8 minus negative 1 = ?');
const example=buildQuestion(3,{a:-8,b:1,op:'-'},1);
assert.equal(example.prompt,'-8 minus 1 = ?');assert.equal(example.options[example.correctIndex],-9);

for (let tier = 1; tier <= 5; tier += 1) {
  const used = new Set(),wording=new Set();
  const drawCount = tier === 1 ? 36 : 60;
  for (let index = 0; index < drawCount; index += 1) {
    const question = buildFreshQuestion(tier, used);
    assert(/[=?]/.test(question.prompt), 'Every question explicitly asks for an answer');
    wording.add(question.prompt.startsWith('What is')?'question':/plus|minus|multiplied|divided/.test(question.prompt)?'words':'symbols');
    assert.equal(question.options.length, 4);
    assert.equal(new Set(question.options).size, 4);
    assert.ok(question.correctIndex >= 0 && question.correctIndex < 4);
    const equation = question.equation;
    const operands = equation.match(/^(-?\d+)\s*([+\-x÷])\s*\(?(-?\d+)\)?$/);
    assert.ok(operands, `Unreadable equation: ${equation}`);
    const a = Number(operands[1]), b = Number(operands[3]);
    const expected = operands[2] === '+' ? a + b : operands[2] === '-' ? a - b : operands[2] === 'x' ? a * b : a / b;
    assert.equal(question.options[question.correctIndex], expected, `Incorrect marking: ${equation}`);
    if(tier>=3&&(operands[2]==='+'||operands[2]==='-'))assert(b>0,'Generated signed questions use a positive step');
    if (tier <= 2) assert.ok(a >= 0 && b >= 0 && expected >= 0, 'Opening levels stay non-negative');
    assert.equal(used.size, index + 1, `tier ${tier} repeated a question on draw ${index + 1}`);
    assert.ok(used.has(questionSignature(question)));
  }
  assert.equal(wording.size,3,`Tier ${tier} uses symbols, operation words and question wording`);
  if (tier === 1) {
    const last = Array.from(used).at(-1);
    const recycled = buildFreshQuestion(tier, used);
    assert.notEqual(questionSignature(recycled), last, 'a recycled tier-one pool repeated immediately');
  }
}
console.log('PASS Maths vs Zombies 60-second round: unique questions within each tier pool and safe tier-one recycle');
