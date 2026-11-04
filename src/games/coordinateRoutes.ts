export type CoordinatePoint = { x: number; y: number };
export type CoordinateMove = { direction: 'right' | 'left' | 'up' | 'down'; distance: number };

const directions = [
  { direction: 'right' as const, dx: 1, dy: 0 },
  { direction: 'left' as const, dx: -1, dy: 0 },
  { direction: 'up' as const, dx: 0, dy: 1 },
  { direction: 'down' as const, dx: 0, dy: -1 },
];

/** Build a route whose every intermediate point is a selectable grid intersection. */
export function buildCoordinateRoute(minimum: number, maximum: number, difficulty: number) {
  const tier = Math.max(1, Math.min(5, difficulty));
  const randomIndex = (length: number) => Math.floor(Math.random() * length);
  const start = { x: minimum + randomIndex(maximum - minimum + 1), y: minimum + randomIndex(maximum - minimum + 1) };
  let target = { ...start };
  const moves: CoordinateMove[] = [];
  const stepCount = [2, 3, 3, 4, 5][tier - 1];
  const maxDistance = [1, 2, 2, 3, 4][tier - 1];
  for (let index = 0; index < stepCount; index += 1) {
    const candidates = directions.flatMap(direction => Array.from({ length: maxDistance }, (_, i) => {
      const distance = i + 1;
      return { ...direction, distance, x: target.x + direction.dx * distance, y: target.y + direction.dy * distance };
    })).filter(move => move.x >= minimum && move.x <= maximum && move.y >= minimum && move.y <= maximum);
    const previous = moves[moves.length - 1]?.direction;
    const opposite = { left: 'right', right: 'left', up: 'down', down: 'up' } as const;
    const varied = candidates.filter(move => move.direction !== previous && (!previous || move.direction !== opposite[previous]));
    let choices = varied.length ? varied : candidates;
    if (index === stepCount - 1) {
      const endingElsewhere = choices.filter(move => move.x !== start.x || move.y !== start.y);
      if (endingElsewhere.length) choices = endingElsewhere;
    }
    const move = choices[randomIndex(choices.length)];
    target = { x: move.x, y: move.y };
    moves.push({ direction: move.direction, distance: move.distance });
  }
  return { start, target, moves };
}
