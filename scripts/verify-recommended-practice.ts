import assert from 'node:assert/strict';
import { getRecommendedPractice } from '../src/systems/content/recommendedPractice';
import type { IslandData, PlayerData } from '../src/types';

const islands = [
  { id: 1, name: 'Number Base Camp', levels: [
    { id: 1, isPractice: true, miniGameKey: 'multiplication_mine', displayName: 'Multiplication Mine', gameType: 'calculation_clash' },
    { id: 2, isPractice: false, miniGameKey: 'multiplication_mine', displayName: 'Multiplication Mine L1', gameType: 'calculation_clash' },
    { id: 3, isPractice: true, miniGameKey: 'remainder_run', displayName: 'Remainder Run', gameType: 'calculation_clash' },
    { id: 4, isPractice: false, miniGameKey: 'remainder_run', displayName: 'Remainder Run L1', gameType: 'calculation_clash' },
  ] },
  { id: 2, name: 'Measurement Mountain', levels: [
    { id: 1, isPractice: true, miniGameKey: 'chrono_dash', displayName: 'Chrono Dash', gameType: 'timekeeper_temple' },
    { id: 2, isPractice: false, miniGameKey: 'chrono_dash', displayName: 'Chrono Dash L1', gameType: 'timekeeper_temple' },
  ] },
] as IslandData[];

const cleanPlayer = {
  completedLevels: {},
  levelStars: {},
  telemetry: { gameStats: {} },
} as unknown as PlayerData;
assert.deepEqual(getRecommendedPractice(cleanPlayer, islands), [], 'Clean profiles should not invent weaknesses');

const player = {
  completedLevels: { 1: [2] },
  levelStars: { '1-2': 1 },
  telemetry: { gameStats: {
    calculation_clash: { attempts: 10, accuracy: 0.5 },
    timekeeper_temple: { attempts: 10, accuracy: 0.6 },
  } },
} as unknown as PlayerData;
const picks = getRecommendedPractice(player, islands);
assert.deepEqual(picks.map((item) => item.href), ['/game/1/1', '/game/2/1']);
assert.match(picks[0].reason, /best 1 of 3 stars/);
assert.match(picks[1].reason, /60% accuracy/);
assert.equal(getRecommendedPractice(player, islands, 1).length, 1);

console.log('Recommended practice routes and evidence: OK');
