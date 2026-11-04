import assert from 'node:assert/strict';
import { buildCoordinateRoute } from '../../src/games/coordinateRoutes';
const vectors = { right: [1,0], left: [-1,0], up: [0,1], down: [0,-1] } as const;
for (let tier = 1; tier <= 5; tier++) {
  const minimum = tier <= 2 ? 1 : -3, maximum = tier <= 2 ? 5 : 3;
  for (let sample = 0; sample < 1000; sample++) {
    const route = buildCoordinateRoute(minimum, maximum, tier);
    assert.equal(route.moves.length, [2,3,3,4,5][tier - 1]);
    const point = { ...route.start };
    for (const move of route.moves) {
      const [x,y] = vectors[move.direction]; point.x += x * move.distance; point.y += y * move.distance;
      assert.ok(point.x >= minimum && point.x <= maximum && point.y >= minimum && point.y <= maximum);
    }
    assert.deepEqual(point, route.target);
    assert.notDeepEqual(route.target, route.start);
  }
}
console.log('5,000 generated routes stay on the grid and reach their stated targets.');
