import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';

const source = readFileSync(new URL('../src/games/ReasoningQuestGame.tsx', import.meta.url), 'utf8');
const bankLiteral = source.match(/const QUESTION_BANK: ReasoningQuestion\[\] = (\[[\s\S]*?\n\]);/);
assert.ok(bankLiteral, 'Reasoning Quest question bank must be present');
const bank = runInNewContext(bankLiteral[1]);

const expectedAnswers = new Map([
  ['rq-1', '11/12'], ['rq-2', '13/15'], ['rq-3', '20'], ['rq-4', '15'],
  ['rq-5', '1,500 m'], ['rq-6', '£1.25'], ['rq-7', '114'], ['rq-8', '75'],
  ['rq-9', '5'], ['rq-10', '9.2'], ['rq-11', '16:00'], ['rq-12', '1/2'],
]);

assert.equal(bank.length, expectedAnswers.size, 'Every authored question needs an independently checked answer');
for (const question of bank) {
  assert.ok(expectedAnswers.has(question.id), `Unexpected question ${question.id}`);
  assert.equal(new Set(question.options).size, question.options.length, `Duplicate choices in ${question.id}`);
  assert.equal(question.options[question.correctIndex], expectedAnswers.get(question.id), `Incorrect answer key in ${question.id}`);
}
console.log(`PASS ${bank.length} Reasoning Quest answer keys`);
