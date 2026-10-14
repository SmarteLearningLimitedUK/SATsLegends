import assert from 'node:assert/strict';
import { createQuestion, sameVertices } from '../src/games/rotationStationQuestions';
for (let level = 1; level <= 5; level++)
    for (let n = 0; n < 2000; n++) {
        const q = createQuestion(level, n);
        assert.equal(q.source.length, 3);
        if (level === 1) { assert.equal(q.max, 6); assert.ok(Math.abs(q.dx) >= 1 && Math.abs(q.dx) <= 3); assert.equal(q.dy, 0); }
        assert.equal(q.target.length, 3);
        for (let i = 0; i < 3; i++) {
            const p = q.source[i], t = q.target[i];
            assert.ok(t.x >= q.min && t.x <= q.max && t.y >= q.min && t.y <= q.max);
            if (q.mode === 'reflect') {
                assert.equal(q.axis === 'x' ? t.x + p.x : t.y + p.y, 2 * q.mirror);
                assert.equal(q.axis === 'x' ? t.y : t.x, q.axis === 'x' ? p.y : p.x);
            }
            else {
                assert.equal(t.x - p.x, q.dx);
                assert.equal(t.y - p.y, q.dy);
                assert.ok(q.dx || q.dy);
            }
        }
        assert.ok(sameVertices(q.target, q.target));
        assert.ok(sameVertices([...q.target].reverse(), q.target));
        assert.ok(!sameVertices([q.target[0], q.target[0], q.target[2]], q.target));
        if (q.mode === 'describe') {
            assert.equal(new Set(q.options.map(o => o.label)).size, q.options.length);
            assert.equal(q.options.filter(o => o.id === 'correct').length, 1);
        }
    }
console.log('PASS 10,000 questions: bounds, exact transforms, unordered vertices, duplicate rejection and unique choices');
