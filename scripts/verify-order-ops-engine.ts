import assert from 'node:assert/strict';
import { applyOperation, createOpsRound, getOperationChoices, nextValidOperationIndices } from '../src/games/orderOpsEngine';

assert.deepEqual(nextValidOperationIndices([2, '+', 3, '×', 4]), [3]);
assert.deepEqual(nextValidOperationIndices(['(', 2, '+', 3, ')', '×', 4]), [2]);
assert.deepEqual(nextValidOperationIndices([2, '×', 3, '+', 4, '×', 5]), [1, 5]);

for (let tier = 1; tier <= 5; tier += 1) {
  for (let run = 0; run < 150; run += 1) {
    const round = createOpsRound(tier);
    let tokens = round.tokens;
    let steps = 0;
    while (tokens.length > 1) {
      const choices = getOperationChoices(tokens);
      assert.ok(choices.length >= 2 && choices.length <= 4, `tier ${tier}: missing choices`);
      assert.equal(new Set(choices.map(choice => choice.id)).size, choices.length, `tier ${tier}: duplicate choice ID`);
      assert.equal(new Set(choices.map(choice => choice.label)).size, choices.length, `tier ${tier}: visually identical choices`);
      const correct = choices.filter(choice => choice.correct);
      assert.ok(correct.length >= 1, `tier ${tier}: no valid next operation`);
      tokens = applyOperation(tokens, correct[run % correct.length].operationIndex);
      steps += 1;
      assert.ok(steps <= 4, `tier ${tier}: expression did not resolve`);
    }
    assert.equal(tokens[0], round.answer, `tier ${tier}: expression resolves to wrong answer`);
  }
  console.log(`PASS Order Ops tier ${tier}: 150 variable expressions resolve in legal BIDMAS steps`);
}
