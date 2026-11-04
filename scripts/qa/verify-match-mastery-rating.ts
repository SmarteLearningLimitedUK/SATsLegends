import assert from 'node:assert/strict';
import { resolveVictoryStars } from '../../src/lib/progression/matchMasteryRating';
import { completeLevel } from '../../src/lib/progression/completeLevel';
import { reportedAccuracy, victoryHasEarnedProgress } from '../../src/app/scoreLevelOutcome';
import { PlayerProfile } from '../../src/lib/progression/types';

const base = {
  blueprintKey: 'match3_equivalence', reportedStars: 1,
  accuracy: 1, hintsUsed: 0, mistakes: 0, livesRemaining: 3,
};
const cases = [
  ['perfect clear at the exact target', {}, 3],
  ['lucky score overshoot gives no extra rating', { reportedStars: 3 }, 3],
  ['perfect clear using Tips', { hintsUsed: 1 }, 2],
  ['one incorrect swap among ten attempts', { accuracy: reportedAccuracy(9, 1), mistakes: 1, livesRemaining: 2 }, 2],
  ['80 percent accuracy boundary', { accuracy: reportedAccuracy(4, 1), mistakes: 1, livesRemaining: 2 }, 2],
  ['below 80 percent accuracy', { accuracy: reportedAccuracy(3, 1), mistakes: 1, livesRemaining: 2 }, 1],
  ['valid clear below 60 percent retains its clear star', { accuracy: reportedAccuracy(2, 2), mistakes: 2, livesRemaining: 1 }, 1],
  ['missing attempts never imply perfect accuracy', { accuracy: null }, 1],
] as const;
for (const [name, overrides, expected] of cases) {
  assert.equal(resolveVictoryStars({ ...base, ...overrides }), expected, name);
}

// These can share a game type or renderer with Match Mastery, but must retain
// their own reported ratings rather than inheriting its accuracy policy.
for (const blueprintKey of ['simplify_sprint', 'cloud_collapse', 'fraction_forge', undefined]) {
  for (const reportedStars of [1, 2, 3]) {
    assert.equal(resolveVictoryStars({ ...base, blueprintKey, reportedStars }), reportedStars);
  }
}

const player: PlayerProfile = { avatarId: 'deer', level: 10, currentXp: 76, totalXpEarned: 2000 };
const playerBefore = structuredClone(player);
for (let level = 16; level <= 20; level += 1) {
  const args = {
    levelId: `2-${level}`, completed: true, score: 1040 + (level - 16) * 140,
    accuracy: 1, accuracyMeasured: true, hintsUsed: 0, mistakes: 0,
    livesRemaining: 3, timeMs: 49_000, reportedStars: resolveVictoryStars(base),
  };
  const first = completeLevel(args, player);
  assert.equal(first.result.stars, 3);
  assert.equal(first.result.xpGained, 95, '60 base + 10 level bonus + 15 first clear + 10 perfect');
  assert.deepEqual(first.result.bonuses, [
    { label: 'First Clear Bonus', amount: 15 }, { label: 'Perfect Accuracy Bonus', amount: 10 },
  ]);
  const replay = completeLevel(args, first.updatedPlayer, first.updatedProgress);
  assert.equal(replay.result.xpGained, 80, 'a perfect replay must not repeat its first-clear bonus');
  assert.equal(replay.result.firstClear, false);
  assert.equal(replay.updatedProgress.timesPlayed, 2);
  assert.equal(replay.updatedPlayer.totalXpEarned, player.totalXpEarned + 175);
  const lowerReplay = completeLevel({
    ...args, score: args.score - 10, accuracy: 0.5, mistakes: 2, livesRemaining: 1,
    reportedStars: resolveVictoryStars({ ...base, accuracy: 0.5, mistakes: 2, livesRemaining: 1 }),
  }, replay.updatedPlayer, replay.updatedProgress);
  assert.equal(lowerReplay.result.stars, 1);
  assert.equal(lowerReplay.result.xpGained, 35, '25 base + 10 level bonus without a perfect bonus');
  assert.equal(lowerReplay.updatedProgress.bestStars, 3, 'a later weaker clear cannot remove saved stars');
  assert.equal(lowerReplay.updatedProgress.bestScore, args.score);
  assert.equal(lowerReplay.updatedProgress.bestAccuracy, 1);
  const failure = completeLevel({ ...args, completed: false, reportedStars: undefined }, player);
  assert.equal(failure.result.stars, 0, 'failed rounds must not use the accepted-clear minimum');
  assert.equal(failure.updatedProgress.completed, false);
}
assert.deepEqual(player, playerBefore, 'pure progression calculations must not mutate the supplied player');
assert.equal(victoryHasEarnedProgress(1, 1040, 20), true);
assert.equal(victoryHasEarnedProgress(0, 1040, 20), false);
assert.equal(victoryHasEarnedProgress(1, 0, 0), false);
assert.equal(victoryHasEarnedProgress(1, Number.NaN, 20), false);

console.log(JSON.stringify({
  pass: true, ratingCases: cases.length, otherGameRatings: 12, progressionLevels: 5,
  checks: ['existing accuracy and hint policy', 'valid-clear minimum', 'separate score and XP',
    'first-clear and replay XP', 'saved best rewards retained', 'failure has no clear stars', 'invalid victory rejected'],
}));
