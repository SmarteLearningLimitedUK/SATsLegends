import type { CSSProperties } from 'react';
import { multiplicationSteps, multiplicationWorking } from './multiplicationMineMath';

export default function MultiplicationColumns({ a, b, completed }: { a: number; b: number; completed: number }) {
  const steps = multiplicationSteps(a, b);
  const active = steps[Math.min(completed, steps.length - 1)];
  const working = multiplicationWorking(a, b, completed);
  const width = Math.max(String(a * b).length, String(a).length + 1);
  const places = Array.from({ length: width }, (_, index) => width - index - 1);
  const labels = ['O', 'T', 'H', 'Th', 'TTh', 'HTh'];
  const digits = (number: number) => Object.fromEntries(String(number).split('').reverse().map((digit, place) => [place, digit]));
  const row = (name: string, values: Record<number, string>, index?: number, symbol = '') => <div className={`mine-written-row ${index === 2 ? 'mine-written-total' : ''}`}>
    <span className="mine-written-label">{name}</span><span className="mine-written-symbol">{symbol}</span>
    {places.map(place => <span key={place} data-written-place={place} data-written-digit={values[place] ?? ''} data-active={completed < steps.length && index === active.row && (active.kind === 'sum' || place === active.place + (active.kind === 'placeholder' ? 0 : active.row))}>{values[place] ?? (index === undefined ? '' : '·')}</span>)}
  </div>;
  return <div className="mine-written-method" data-written-columns style={{ '--written-columns': width } as CSSProperties} role="group" aria-label={`Written method for ${a} multiplied by ${b}`}>
    <div className="mine-written-row mine-place-headings"><span>Place</span><span />{places.map(place => <span key={place}>{labels[place]}</span>)}</div>
    <div className="mine-written-row mine-carries"><span className="mine-written-label">Carry</span><span />{places.map(place => <span key={place}>{active.kind === 'sum' ? '' : working.carries[Math.min(active.row, 1)][place] || ''}</span>)}</div>
    {row('', digits(a))}
    {row('', digits(b), undefined, '×')}
    {row(b >= 10 ? '× ones' : 'Product', working.rows[0], 0)}
    {b >= 10 && row('× tens', working.rows[1], 1, '+')}
    {b >= 10 && row('Total', working.rows[2], 2)}
  </div>;
}
