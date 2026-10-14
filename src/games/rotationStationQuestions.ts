export type GridPoint = {
    x: number;
    y: number;
};
export const stageFromProgress = (level: number, _solved = 0, _time = 0) => [1, 4, 6, 8, 11][Math.max(0, Math.min(4, level - 1))];
const integer = (min: number, max: number) => min + Math.floor(Math.random() * (max - min + 1));
export const movementLabel = (dx: number, dy: number) => [dx ? `${Math.abs(dx)} ${Math.abs(dx) === 1 ? 'square' : 'squares'} ${dx > 0 ? 'right' : 'left'}` : '', dy ? `${Math.abs(dy)} ${Math.abs(dy) === 1 ? 'square' : 'squares'} ${dy > 0 ? 'up' : 'down'}` : ''].filter(Boolean).join(' and ');
export const sameVertices = (placed: (GridPoint | null)[], target: GridPoint[]) => placed.length === target.length && placed.every(Boolean) && new Set(placed.map(p => `${p?.x},${p?.y}`)).size === target.length && target.every(t => placed.some(p => p?.x === t.x && p.y === t.y));
export const createQuestion = (level: number, solved = 0, _time = 0) => {
    const tier = Math.max(1, Math.min(5, level)), min = tier >= 4 ? -5 : 0, max = tier >= 4 ? 5 : tier === 1 ? 6 : 8;
    const mode = tier === 1 ? 'translate' : tier === 2 ? 'reflect' : tier === 5 && solved % 3 === 2 ? 'describe' : solved % 2 ? 'reflect' : 'translate';
    const axis: 'x' | 'y' = tier === 2 ? 'x' : Math.random() < .5 ? 'x' : 'y', mirror = tier >= 4 ? 0 : 4;
    const w = integer(1, tier === 1 ? 2 : 3), h = integer(1, tier === 1 ? 2 : 3);
    let x = integer(min + 1, max - w - 1), y = integer(min + 1, max - h - 1);
    if (mode === 'reflect') {
        if (axis === 'x')
            x = tier >= 4 ? integer(-4, -w - 1) : integer(0, 3 - w);
        else
            y = tier >= 4 ? integer(-4, -h - 1) : integer(0, 3 - h);
    }
    const source = [{ x, y }, { x: x + w, y }, { x, y: y + h }];
    let dx = 0, dy = 0;
    if (mode !== 'reflect')
        do {
            dx = integer(Math.max(min - x, tier === 1 ? -3 : -10), Math.min(max - x - w, tier === 1 ? 3 : 10));
            dy = tier === 1 ? 0 : integer(min - y, max - y - h);
        } while (!dx && !dy);
    const target = source.map(p => mode === 'reflect' ? axis === 'x' ? { x: 2 * mirror - p.x, y: p.y } : { x: p.x, y: 2 * mirror - p.y } : { x: p.x + dx, y: p.y + dy });
    const line = tier >= 4 ? `${axis === 'x' ? 'y' : 'x'}-axis` : `${axis} = ${mirror}`, move = movementLabel(dx, dy);
    const options = mode === 'describe' ? [{ id: 'correct', label: move }, { id: 'reverse', label: movementLabel(-dx, -dy) }, { id: 'swap', label: movementLabel(dy, dx) }, { id: 'other', label: movementLabel(dx, dy > 0 ? dy + 1 : dy - 1) }].filter((o, i, a) => a.findIndex(v => v.label === o.label) === i) : [];
    for (let i = options.length - 1; i > 0; i--) {
        const j = integer(0, i);
        [options[i], options[j]] = [options[j], options[i]];
    }
    return { id: `${Date.now()}-${Math.random()}`, stage: stageFromProgress(tier), mode, min, max, source, target, dx, dy, axis, mirror, options, correctOptionIds: mode === 'describe' ? ['correct'] : [],
        instruction: mode === 'reflect' ? `Make a mirror image of the blue triangle across the pink line${tier >= 4 ? ` (${line})` : ''}.` : mode === 'describe' ? 'How did the blue triangle slide to the gold triangle?' : `Slide the blue triangle ${move}.`,
        explanation: mode === 'reflect' ? `Each image vertex is the same distance from ${line}, on the opposite side.` : `Every vertex moves ${move}. The shape keeps its size and orientation.` };
};
