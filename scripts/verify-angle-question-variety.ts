import assert from 'node:assert/strict';
import { buildAngleQuestions } from '../src/games/angleArena/questions';

const expectedAnswer = (prompt: string): number => {
  const direct = prompt.match(/One angle on a straight line is (\d+)°/);
  if (direct) return 180 - Number(direct[1]);

  const ratio = prompt.match(/ratio (\d+):(\d+) on a straight line\. What is the (larger|smaller) angle/);
  if (ratio) {
    const first = Number(ratio[1]);
    const second = Number(ratio[2]);
    return 180 * (ratio[3] === 'larger' ? Math.max(first, second) : Math.min(first, second)) / (first + second);
  }

  const difference = prompt.match(/(?:smaller angle is (\d+)° less than the larger|larger angle is (\d+)° more than the smaller) angle\. What is the (larger|smaller) angle/);
  if (difference) {
    const amount = Number(difference[1] ?? difference[2]);
    return (180 + (difference[3] === 'larger' ? amount : -amount)) / 2;
  }

  throw new Error(`Unrecognised angle prompt: ${prompt}`);
};

for (let level = 1; level <= 5; level += 1) {
  const sequences = new Set<string>();
  const prompts = new Set<string>();
  for (let seed = 1; seed <= 80; seed += 1) {
    const config = { level, launcherX: 0, groundY: 0, gravity: 0, seed };
    const questions = buildAngleQuestions(config);
    assert.deepEqual(questions, buildAngleQuestions(config), 'A seeded run must be stable.');
    assert.equal(questions.length, 6);
    assert.equal(new Set(questions.map((question) => question.prompt)).size, 6);
    assert.equal(new Set(questions.map((question) => question.correctAnswer)).size, 6);
    assert.equal(questions.filter((question) => question.kind === 'reasoning').length, level === 1 ? 0 : level === 2 ? 3 : 5);
    if (level > 1) assert.equal(questions[0].kind, 'fluency', 'A direct warm-up should begin each later tier.');
    sequences.add(questions.map((question) => question.prompt).join('|'));
    for (const question of questions) {
      prompts.add(question.prompt);
      assert.equal(question.correctAnswer, expectedAnswer(question.prompt), question.prompt);
      assert.equal(question.options.length, 4);
      assert.equal(new Set(question.options).size, 4);
      assert.ok(question.options.includes(question.correctAnswer));
      assert.ok(question.options.every((option) => Number.isInteger(option) && option > 0 && option < 180));
      assert.ok(Number.isFinite(question.targetX) && Number.isFinite(question.targetY));
      assert.equal(question.difficulty, level);
    }
  }
  assert.ok(sequences.size > 20, `Tier ${level} needs genuinely varied runs.`);
  assert.ok(prompts.size > 6, `Tier ${level} needs more prompts than one six-question run.`);
  console.log(`PASS Angle Arena tier ${level}: ${prompts.size} valid prompts, ${sequences.size} distinct seeded runs`);
}
