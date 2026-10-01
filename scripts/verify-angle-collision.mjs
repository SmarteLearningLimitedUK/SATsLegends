import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import ts from 'typescript';

const anglePath = 'src/games/AngleArenaGame.tsx';
const mathPath = 'src/games/angleArena/math.ts';
const source = await readFile(anglePath, 'utf8');
const mathSource = await readFile(mathPath, 'utf8');
const tree = ts.createSourceFile(anglePath, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
const names = ['buildProjectile', 'stepProjectile', 'segmentHitsTarget'];
const statements = tree.statements.filter((statement) => ts.isVariableStatement(statement)
  && statement.declarationList.declarations.some((declaration) => names.includes(declaration.name.getText(tree))));
assert.equal(statements.length, names.length, 'Extract the current production helpers, without copies.');
const mathExports = {};
vm.runInNewContext(ts.transpileModule(mathSource, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText, { exports: mathExports });
const helperModule = { exports: {} };
vm.runInNewContext(ts.transpileModule(statements.map((statement) => statement.getText(tree)).join('\n')
  + '\nmodule.exports = { buildProjectile, stepProjectile, segmentHitsTarget };', {
  compilerOptions: { module: ts.ModuleKind.CommonJS },
}).outputText, { ...mathExports, module: helperModule });
const { buildProjectile, stepProjectile, segmentHitsTarget } = helperModule.exports;
const radius = 44;
const rows = [];
let cases = 0;
const check = (name, run) => { const before = cases; run(); rows.push({ name, samples: cases - before, passed: true }); };

check('A correct ray crossing the target survives a dropped frame without changing travel', () => {
  for (let angle = 1; angle < 180; angle += 1) {
    for (const targetDistance of [520, 560, 600]) {
      const direction = mathExports.angleToVector(angle);
      const from = { ...buildProjectile(angle, 520), x: direction.x * (targetDistance - 45), y: direction.y * (targetDistance - 45) };
      const to = stepProjectile(from, 90 / 520 * 1000);
      const target = { x: direction.x * targetDistance, y: direction.y * targetDistance };
      assert.ok(Math.hypot(from.x - target.x, from.y - target.y) > radius);
      assert.ok(Math.hypot(to.x - target.x, to.y - target.y) > radius);
      assert.equal(segmentHitsTarget(from, to, target, radius), true);
      assert.ok(Math.abs(Math.hypot(to.x - from.x, to.y - from.y) - 90) < 1e-9);
      assert.equal(to.vx, from.vx); assert.equal(to.vy, from.vy);
      cases += 1;
    }
  }
});
check('Native-speed stepping retains full real delta across short and slow frames', () => {
  for (const angle of [30, 75, 105, 120, 135, 150]) {
    for (const delta of [16, 33, 120, 248, 500]) {
      const from = buildProjectile(angle, 520);
      const to = stepProjectile(from, delta);
      assert.ok(Math.abs(Math.hypot(to.x, to.y) - 520 * delta / 1000) < 1e-9);
      assert.equal(to.vx, from.vx); assert.equal(to.vy, from.vy);
      cases += 1;
    }
  }
});
check('Endpoint, tangent, zero-length and off-path cases use the bounded segment', () => {
  const fixtures = [
    [{ x: 0, y: 0 }, { x: 100, y: 0 }, { x: 50, y: 44 }, true],
    [{ x: 0, y: 0 }, { x: 100, y: 0 }, { x: 50, y: 44.001 }, false],
    [{ x: 0, y: 0 }, { x: 100, y: 0 }, { x: -44, y: 0 }, true],
    [{ x: 0, y: 0 }, { x: 100, y: 0 }, { x: -44.001, y: 0 }, false],
    [{ x: 0, y: 0 }, { x: 100, y: 0 }, { x: 144.001, y: 0 }, false],
    [{ x: 0, y: 0 }, { x: 0, y: 0 }, { x: 44, y: 0 }, true],
    [{ x: 0, y: 0 }, { x: 0, y: 0 }, { x: 44.001, y: 0 }, false],
    [{ x: 501.28, y: 0 }, { x: 626.6, y: 0 }, { x: 560, y: 0 }, true],
  ];
  for (const [from, to, target, expected] of fixtures) { assert.equal(segmentHitsTarget(from, to, target, radius), expected); cases += 1; }
});
assert.match(source, /const hit = allowHit && previousProjectilePosition !== null\s*&& segmentHitsTarget\(previousProjectilePosition, projectile, enemyWorld, TARGET_RADIUS \+ PROJECTILE_RADIUS\)/);
const report = { capturedAt: new Date().toISOString(), browserContextsOpened: 0, sourceFiles: { [anglePath]: createHash('sha256').update(source).digest('hex'), [mathPath]: createHash('sha256').update(mathSource).digest('hex') }, checks: rows, totalSamples: cases, correctAnswerGatePreserved: true };
const output = 'qa-artifacts/gameplay-refinements/monster-current/angle-collision-properties.json';
await mkdir('qa-artifacts/gameplay-refinements/monster-current', { recursive: true });
await writeFile(output, JSON.stringify(report, null, 2));
console.log(`Angle actual-source collision/travel: ${rows.length}/${rows.length} checks, ${cases} samples PASS; ${output}`);
