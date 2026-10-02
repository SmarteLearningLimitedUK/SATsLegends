import assert from 'node:assert/strict';
import { safeReturnPath } from '../src/website/services/returnPath';

const childId = '20000000-0000-4000-8000-000000000001';
for (const path of ['/parent', '/subscriptions', '/admin', `/parent/progress/${childId}`, `/parent/progress/${childId}?game=english`]) {
  assert.equal(safeReturnPath(path), path);
}
for (const path of [null, 'https://example.com', '//example.com', '/english/play', '/parent?next=//example.com',
  `/parent/progress/${childId}?game=english&next=//example.com`, `/parent/progress/${childId}?game=unexpected`]) {
  assert.equal(safeReturnPath(path), '/parent');
}
console.log('PASS authenticated return links retain Lexcoria reports and reject unsafe destinations');
