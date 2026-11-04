import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

// Execute the controller's real pure board functions without mounting React or
// loading audio/assets. No production functions are rewritten for this check.
const source = fs.readFileSync(new URL('../../src/games/FractionMatchGame.tsx', import.meta.url), 'utf8');
const start = source.indexOf("type GemType =");
const end = source.indexOf('const BevelledGem:', start);
assert.ok(start >= 0 && end > start, 'controller board-function boundaries');
let random = Math.random;
const seededMath = Object.create(Math);
seededMath.random = () => random();
const sandbox = vm.createContext({ Math: seededMath });
vm.runInContext(ts.transpileModule(source.slice(start, end) + `
globalThis.boardApi = { createInitialBoard, ensurePlayableBoard, buildCell, GEM_TYPES, GEM_VALUE_POOLS };
`, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.None } }).outputText, sandbox);
const api = sandbox.boardApi;

const seedRandom = (seed) => {
  let state = seed >>> 0;
  random = () => ((state = (Math.imul(state, 1664525) + 1013904223) >>> 0) / 4294967296);
};
// Independent oracle: inspect each possible adjacent swap, then every length-3
// row/column window. This does not rely on the controller's legal-swap counter.
const hasLine = board => {
  for (let i = 0; i < 30; i++) {
    const type = board[i]?.type;
    if (!type) continue;
    if (i % 6 <= 3 && type === board[i + 1]?.type && type === board[i + 2]?.type) return true;
    if (i < 18 && type === board[i + 6]?.type && type === board[i + 12]?.type) return true;
  }
  return false;
};
const legalMoves = board => {
  let count = 0;
  for (let i = 0; i < 30; i++) {
    for (const j of [i % 6 < 5 ? i + 1 : -1, i < 24 ? i + 6 : -1]) {
      if (j < 0 || board[i]?.type === board[j]?.type) continue;
      const swapped = [...board];
      [swapped[i], swapped[j]] = [swapped[j], swapped[i]];
      if (hasLine(swapped)) count++;
    }
  }
  return count;
};
const verifyBoard = (board, tier, minimum) => {
  assert.equal(board.length, 30);
  assert.equal(new Set(board.map(cell => cell.id)).size, 30, 'independent tile identities');
  assert.equal(hasLine(board), false, 'reshuffle must not award an unplayed immediate match');
  assert.ok(legalMoves(board) >= minimum, `tier ${tier} must have at least ${minimum} legal choices`);
  for (const cell of board) {
    assert.equal(typeof cell.id, 'number');
    assert.ok(api.GEM_VALUE_POOLS[cell.type].some(value => value.label === cell.label), 'original equivalence values');
    if (tier === 1) assert.equal(cell.label, api.GEM_VALUE_POOLS[cell.type][0].label);
    if (tier === 2) assert.ok(cell.label.includes('/'), 'tier 2 retains fraction-only labels');
  }
  if (tier >= 3) {
    for (const format of ['fraction', 'decimal', 'percentage']) {
      assert.ok(board.some(cell => api.GEM_VALUE_POOLS[cell.type].some(value => value.label === cell.label && value.format === format)), `tier ${tier} retains ${format} content`);
    }
  }
};
const deadBoard = tier => Array.from({ length: 30 }, (_, i) =>
  api.buildCell(api.GEM_TYPES[(Math.floor(i / 6) + i % 6) % 5], tier, true));
let boards = 0;
for (let tier = 1; tier <= 5; tier++) {
  const minimum = tier === 5 ? 5 : 1;
  for (let seed = 0; seed < 100; seed++) {
    seedRandom(seed === 0 ? 72419 : seed);
    const board = api.createInitialBoard(tier, true);
    verifyBoard(board, tier, minimum);
    const snapshot = JSON.stringify(board);
    assert.equal(api.ensurePlayableBoard(board, tier, true), board, 'already playable boards keep their exact tiles and positions');
    assert.equal(JSON.stringify(board), snapshot);
    boards++;
  }

  seedRandom(72419);
  const stalled = deadBoard(tier);
  const snapshot = JSON.stringify(stalled);
  assert.equal(hasLine(stalled), false);
  assert.equal(legalMoves(stalled), 0, 'regression fixture really is stalled');
  const restored = api.ensurePlayableBoard(stalled, tier, true);
  assert.notEqual(restored, stalled, 'all Match Mastery tiers recover a dead board');
  verifyBoard(restored, tier, minimum);
  assert.equal(JSON.stringify(stalled), snapshot, 'recovery does not mutate previous tile metadata');

  // Force all 40 random candidates to the same legal-match-free Latin layout.
  // This exercises the existing deterministic fallback with the actual source.
  let calls = 0;
  random = () => {
    const call = calls++;
    if (call % 2) return 0; // Label selection consumes the second random draw.
    const tile = Math.floor(call / 2) % 30;
    return ((Math.floor(tile / 6) + tile % 6) % 5 + 0.1) / 5;
  };
  const fallback = api.ensurePlayableBoard(stalled, tier, true);
  assert.ok(calls > 40 * 60, 'all 40 random candidates exhausted before fallback labels');
  verifyBoard(fallback, tier, 5);
  assert.equal(JSON.stringify(stalled), snapshot);

  // This component also renders Cloud Collapse: its existing behavior stays put.
  calls = 0;
  assert.equal(api.ensurePlayableBoard(stalled, tier, false), stalled);
  assert.equal(calls, 0, 'Cloud Collapse does not consume randomness or reshuffle');
}
console.log(JSON.stringify({ pass: true, generatedBoards: boards, stalledBoardRecoveries: 5,
  forcedFallbacks: 5, cloudCollapseUnchanged: 5,
  checks: ['independent legal-move oracle', 'no immediate matches', 'original tier value pools',
    'tile identities', 'existing playable boards retained', 'input metadata retained', 'seed 72419'] }));
