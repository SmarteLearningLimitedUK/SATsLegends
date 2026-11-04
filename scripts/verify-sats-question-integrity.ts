import assert from 'node:assert/strict';
import {formatFantasyPrompt} from '../src/utils/fantasyPrompt.ts';
assert.equal(formatFantasyPrompt('There are 24 pupils on a train. How many groups of 6 pupils are there?'), 'There are 24 pupils on a train. How many groups of 6 pupils are there?');
assert.equal(formatFantasyPrompt('A shop sells 8 books each day. How many books are sold in 5 days?'), 'A shop sells 8 books each day. How many books are sold in 5 days?');
import {
  getSatsInspiredChallengeQuestion,
  getSatsInspiredDataDungeonPuzzle,
  getSatsInspiredMeasurementProblem,
  getSatsInspiredTimeProblem,
  type SupportedChallengeGameType,
} from '../src/systems/content/satsInspiredQuestionBanks.ts';

const challengeGames: SupportedChallengeGameType[] = [
  'place_value_peaks', 'calculation_clash', 'coordinate_quest', 'transform_temple',
  'scale_safari', 'unit_mixer', 'graph_grabber', 'mean_machine', 'equation_grove',
  'formula_forge', 'rule_runner',
];
const seenPrompts = new Set<string>();
let checkedGraphPair = false;
const assertReadable = (value: unknown) => {
  const printed = JSON.stringify(value);
  assert(!/â€|�/.test(printed), `Corrupt text in ${printed}`);
  assert(!/[a-zA-Z0-9)]\s*\?\s*[a-zA-Z0-9(]/.test(printed), `Missing arithmetic operator in ${printed}`);
};

for (const game of challengeGames) {
  for (let attempt = 0; attempt < 80; attempt += 1) {
    const question = getSatsInspiredChallengeQuestion(game, 5);
    assert(question, `${game} must supply a question`);
    assertReadable(question);
    assert(question.answerIndex >= 0 && question.answerIndex < question.options.length);
    assert.equal(new Set(question.options).size, question.options.length, `${game}: duplicate answer tile`);
    seenPrompts.add(question.prompt);
    if (question.prompt.includes('Which two boats deliver 15 crates')) {
      if (question.visual.type !== 'bars') throw new Error('Graph pair question needs displayed bars');
      const bars = new Map(question.visual.bars.map(bar => [bar.label, bar.value]));
      const valid = question.options.filter(option => {
        const [left, right] = option.split(' and ');
        return (bars.get(left) ?? NaN) + (bars.get(right) ?? NaN) === 15;
      });
      assert.deepEqual(valid, [question.options[question.answerIndex]], 'The marked pair must match the displayed bar heights');
      checkedGraphPair = true;
    }
  }
}
assert(checkedGraphPair, 'Exercise the two-boat graph question');

for (const expected of [
  'The number of black beads is 4 more than 3 times the number of white beads. There are 9 white beads. How many black beads are there?',
  'The number of black beads is 4 more than 3 times the number of white beads. There are 25 black beads. How many white beads are there?',
  'Use A = (b × h) ÷ 2. Find the area for b = 12 cm, h = 5 cm.',
  'A cuboid is 4 cm long, 3 cm wide and 5 cm high. What is its volume in cm³?',
  'Function machine: ×3, then +2. What is the output for 7?',
  'Which translation moves A to A′?',
  'Which translation moves B to B′?',
]) assert(seenPrompts.has(expected), `Question bank did not expose ${expected}`);

const sortedMedian = (data: number[]) => {
  const sorted = [...data].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
};
const checkedDataPuzzles = new Set<string>();
for (let attempt = 0; attempt < 80; attempt += 1) {
  const puzzle = getSatsInspiredDataDungeonPuzzle(5);
  assert(puzzle);
  assertReadable(puzzle);
  assert(!['median', 'mode'].includes(puzzle.type), 'KS2 statistics rounds must not assess median or mode');
  assert.equal(puzzle.options.filter(option => option === puzzle.answer).length, 1, puzzle.id);
  checkedDataPuzzles.add(puzzle.id);
  if (puzzle.type === 'mean') assert.equal(puzzle.answer, puzzle.data.reduce((sum, value) => sum + value, 0) / puzzle.data.length, puzzle.id);
  if (puzzle.type === 'median') assert.equal(puzzle.answer, sortedMedian(puzzle.data), puzzle.id);
  if (puzzle.type === 'range') assert.equal(puzzle.answer, Math.max(...puzzle.data) - Math.min(...puzzle.data), puzzle.id);
  if (puzzle.type === 'mode') {
    const counts = puzzle.data.map(value => puzzle.data.filter(item => item === value).length);
    assert.equal(puzzle.data[counts.indexOf(Math.max(...counts))], puzzle.answer, puzzle.id);
  }
}
assert.equal(checkedDataPuzzles.size, 12, 'Exercise every data puzzle');

for (const getProblem of [getSatsInspiredMeasurementProblem, getSatsInspiredTimeProblem]) {
  for (let attempt = 0; attempt < 80; attempt += 1) {
    const problem = getProblem(5);
    assert(problem);
    assertReadable(problem);
    assert.equal(problem.options.filter(option => option === problem.answer).length, 1, problem.question);
  }
}
console.log(`PASS: ${seenPrompts.size} readable challenge prompts, ${checkedDataPuzzles.size} independently checked data puzzles, and unique measurement/time answer tiles.`);
