import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import ts from 'typescript';

const root = path.resolve(import.meta.dirname, '..');
const functionsFrom = (filename, names) => {
  const source = fs.readFileSync(path.join(root, 'src/games', filename), 'utf8');
  const output = ts.transpileModule(`${source}\nexport const __qa = { ${names.join(', ')} };`, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
  }).outputText;
  const module = { exports: {} };
  const inert = () => null;
  new Function('require', 'module', 'exports', output)(() => new Proxy({ __esModule: true, default: inert }, { get: (target, key) => key in target ? target[key] : inert }), module, module.exports);
  return module.exports.__qa;
};

const ops = functionsFrom('OrderOpsArenaGame.tsx', ['createOpsRound', 'legalOperationIndices', 'resolveOperation', 'expressionText']);
for (let tier = 1; tier <= 5; tier++) for (let sample = 0; sample < 300; sample++) {
  const original = ops.createOpsRound(tier);
  let working = original;
  assert.ok(ops.expressionText(working).length > 0);
  while (working.operators.length) {
    const legal = ops.legalOperationIndices(working);
    assert.ok(legal.length > 0);
    working = ops.resolveOperation(working, legal[legal.length - 1]);
  }
  assert.equal(working.terms.length, 1);
  assert.equal(working.terms[0], original.answer);
}

const remainder = functionsFrom('RemainderRunGame.tsx', ['createProblem', 'podChoices', 'leftoverChoices', 'correctLeftover']);
for (const stage of [1, 3, 5, 7, 10]) for (let sample = 0; sample < 300; sample++) {
  const problem = remainder.createProblem(stage);
  assert.ok(remainder.podChoices(problem).includes(problem.quotient));
  assert.ok(remainder.leftoverChoices(problem).includes(remainder.correctLeftover(problem)));
  assert.equal(problem.quotient * problem.divisor + problem.remainder, problem.dividend);
}

console.log('Variety phase one: 3,000 generated rounds passed math and choice checks');
