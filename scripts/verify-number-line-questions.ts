import assert from 'node:assert/strict';
import { buildNumberLineQuestion } from '../src/games/numberLineQuestions';

function value(text: string): number {
  const mixed = text.match(/^(\d+) (\d+)\/(\d+)$/);
  if (mixed) return Number(mixed[1]) + Number(mixed[2]) / Number(mixed[3]);
  const fraction = text.match(/^(-?\d+)\/(\d+)$/);
  return fraction ? Number(fraction[1]) / Number(fraction[2]) : Number(text);
}
let samples = 0;
for (const practice of [true, false]) {
  for (let tier = 1; tier <= (practice ? 1 : 5); tier += 1) {
    const families = new Set<string>();
    const questions = new Set<string>();
    for (let seed = 1; seed <= 200; seed += 1) {
      let state = seed;
      const random = () => ((state = (Math.imul(state, 1664525) + 1013904223) >>> 0) / 2 ** 32);
      for (let round = 0; round < 12; round += 1) {
        const q = buildNumberLineQuestion(tier, round, practice, random);
        families.add(q.family);
        questions.add(JSON.stringify([q.labels, q.focusIndex]));
        assert.equal(q.labels.length, 5);
        assert.equal(q.labels.filter(label => label === '?').length, 1);
        assert.equal(q.labels[q.focusIndex], '?');
        assert.equal(q.options.length, 4);
        assert.equal(new Set(q.options).size, 4);
        assert.equal(q.options.filter(choice => choice === q.answer).length, 1);
        const labelled = q.labels.flatMap((text, index) => text && text !== '?' ? [{ index, value: value(text) }] : []);
        assert(labelled.length >= 2, 'A scale must be inferable from at least two labels');
        const [first, second] = labelled;
        const step = (second.value - first.value) / (second.index - first.index);
        const inferred = first.value + step * (q.focusIndex - first.index);
        assert(step > 0);
        assert(Math.abs(inferred - value(q.answer)) < 1e-9, 'The labelled scale must give exactly the marked answer');
        assert.equal(q.options.filter(choice => Math.abs(value(choice) - inferred) < 1e-9).length, 1, 'Only one option may be mathematically correct');
        q.values.forEach((n, index) => assert(Math.abs(n - (q.values[0] + step * index)) < 1e-9));
        if (!practice && tier <= 2) assert(![1, 5, 10].includes(step), 'Scored early levels must move beyond routine counting');
        if (!practice && tier >= 2) assert.equal(labelled.length, 2);
        if (!practice && tier >= 2 && round % 3 === 2) assert([0, 4].includes(q.focusIndex));
        if (q.family === 'negative') assert(q.values[0] < 0 && q.values[4] > 0);
        samples += 1;
      }
    }
    assert(questions.size > (practice ? 80 : 150), 'Question variety is too small');
    if (!practice && tier === 3) assert(families.has('decimal'));
    if (!practice && tier >= 4) assert(families.has('fraction') && families.has('negative'));
    if (!practice && tier === 5) assert(families.has('decimal'));
    console.log(`PASS ${practice ? 'practice' : `level ${tier}`}: solvable scales, unique correct answers, ${questions.size} distinct layouts, ${[...families].join('/')}`);
  }
}
console.log(`PASS ${samples} generated number-line questions`);
