import { useId, useRef } from 'react';

interface Point { x: number; y: number }
interface Props {
  minimum: number;
  maximum: number;
  start: Point;
  selected: string | null;
  feedback: 'correct' | 'incorrect' | null;
  onSelect: (x: number, y: number) => void;
}

/** Coordinates denote intersections, with equal units on both axes. */
export default function CoordinateGrid({ minimum, maximum, start, selected, feedback, onSelect }: Props) {
  const root = useRef<HTMLDivElement>(null);
  const arrow = useId().replaceAll(':', '');
  const lower = Math.min(0, minimum);
  const range = maximum - lower;
  const xPosition = (value: number) => 12 + (value - lower) / range * 76;
  const yPosition = (value: number) => 88 - (value - lower) / range * 76;
  const ticks = Array.from({ length: range + 1 }, (_, i) => lower + i);
  const points = Array.from({ length: maximum - minimum + 1 }, (_, row) =>
    Array.from({ length: maximum - minimum + 1 }, (_, col) => ({ x: minimum + col, y: maximum - row }))).flat();
  return <div ref={root} className="coordinates-grid-board coordinate-plane" role="group" aria-label="Coordinate grid. Choose a point at a grid intersection. Arrow keys move between points; Enter selects.">
    <svg className="coordinate-grid-lines" viewBox="0 0 100 100" aria-hidden="true">
      <defs><marker id={arrow} viewBox="0 0 10 10" refX="7" refY="5" markerWidth="5" markerHeight="5" orient="auto"><path d="M0 0L10 5L0 10Z" fill="#e7d18e" /></marker></defs>
      {ticks.map(value => <g key={value} data-coordinate-line={value}>
        <line x1={xPosition(value)} x2={xPosition(value)} y1="12" y2="88" />
        <line x1="12" x2="88" y1={yPosition(value)} y2={yPosition(value)} />
      </g>)}
      <line className="coordinate-axis" x1="7" x2="95" y1={yPosition(0)} y2={yPosition(0)} markerEnd={`url(#${arrow})`} />
      <line className="coordinate-axis" x1={xPosition(0)} x2={xPosition(0)} y1="93" y2="5" markerEnd={`url(#${arrow})`} />
    </svg>
    {ticks.filter(value => value !== 0).map(value => <span key={`x-${value}`} data-coordinate-x-label={value} className="coordinate-tick coordinate-tick-x" style={{ left: `${xPosition(value)}%`, top: `${yPosition(0)}%` }}>{value}</span>)}
    {ticks.filter(value => value !== 0).map(value => <span key={`y-${value}`} data-coordinate-y-label={value} className="coordinate-tick coordinate-tick-y" style={{ left: `${xPosition(0)}%`, top: `${yPosition(value)}%` }}>{value}</span>)}
    <span className="coordinate-tick coordinate-origin" style={{ left: `${xPosition(0)}%`, top: `${yPosition(0)}%` }}>0</span>
    <span className="coordinate-axis-title coordinate-axis-x" style={{ top: `${yPosition(0)}%` }}>x</span>
    <span className="coordinate-axis-title coordinate-axis-y" style={{ left: `${xPosition(0)}%` }}>y</span>
    {points.map(point => {
      const key = `${point.x}-${point.y}`;
      const isStart = point.x === start.x && point.y === start.y;
      return <button key={key} type="button" className="coordinate-point" data-coordinate-x={point.x} data-coordinate-y={point.y}
        data-coordinate-start={isStart} data-coordinate-selected={selected === key ? feedback : undefined}
        aria-label={`Marker at x=${point.x}, y=${point.y}${isStart ? ', starting point' : ''}`}
        aria-pressed={selected === key} disabled={Boolean(feedback)} tabIndex={isStart ? 0 : -1}
        style={{ left: `${xPosition(point.x)}%`, top: `${yPosition(point.y)}%`, width: `min(42px, ${76 / range}%)`, height: `min(42px, ${76 / range}%)` }}
        onClick={() => onSelect(point.x, point.y)} onKeyDown={event => {
          const moves: Record<string, Point> = { ArrowLeft: {x:-1,y:0}, ArrowRight: {x:1,y:0}, ArrowUp: {x:0,y:1}, ArrowDown: {x:0,y:-1} };
          const move = moves[event.key];
          if (!move) return;
          event.preventDefault();
          const x = Math.max(minimum, Math.min(maximum, point.x + move.x));
          const y = Math.max(minimum, Math.min(maximum, point.y + move.y));
          root.current?.querySelector<HTMLButtonElement>(`[data-coordinate-x="${x}"][data-coordinate-y="${y}"]`)?.focus();
        }}><span className="coordinate-point-dot" aria-hidden="true" />{isStart && <span className="coordinate-start-label" aria-hidden="true">S</span>}</button>;
    })}
    <div className="coordinate-legend"><span aria-hidden="true">●</span> Start ({start.x}, {start.y})</div>
  </div>;
}
