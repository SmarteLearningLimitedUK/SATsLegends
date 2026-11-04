import type { RevisionGapModel } from '../../systems/content/satsRevisionGapMissions';
import { useState } from 'react';
import SatsRevisionGapVisual from './SatsRevisionGapVisual';
import './sats-revision-gaps.css';

export default function SatsRevisionGapConstruction({ model, value, onChange, part = 'all' }: {
  model: RevisionGapModel; value: string; onChange: (value: string) => void; part?: 'all' | 'model' | 'controls';
}) {
  const [active, setActive] = useState(0);
  if (model.kind === 'fraction-grid') {
    const shaded = Math.max(0, Math.min(100, Number(value.match(/^shade:(\d+)$/)?.[1] ?? 0)));
    const change = (n: number) => onChange(`shade:${Math.max(0, Math.min(100, n))}`);
    return <div className="sats-gap-build" aria-label="Shade an equivalent fraction">
      {part !== 'controls' && <SatsRevisionGapVisual model={model} shaded={shaded} />}
      {part !== 'model' && <><label>Shaded squares: {shaded} of 100<input aria-label="Shaded squares" type="range" min="0" max="100" step="1" value={shaded} onChange={e => change(Number(e.target.value))} /></label>
        <div className="sats-gap-steps">{[-10,-1,1,10].map(delta => <button type="button" key={delta} onClick={() => change(shaded + delta)}>{delta > 0 ? '+' : '−'}{Math.abs(delta)}</button>)}</div></>}
    </div>;
  }
  if (model.kind !== 'pictogram-build') return null;
  const raw = value.startsWith('pictogram:') ? value.split(':').slice(1) : [];
  const symbols = model.labels.map((_, i) => /^\d+$/.test(raw[i] ?? '') ? Math.max(0, Math.min(8, Number(raw[i]))) : null);
  const change = (index: number, next: number) => {
    const values = [...symbols]; values[index] = Math.max(0, Math.min(8, next));
    onChange(`pictogram:${values.map(n => n === null ? '_' : n).join(':')}`);
  };
  return <div className="sats-gap-build" aria-label="Complete the pictogram">
    {part !== 'controls' && <SatsRevisionGapVisual model={model} symbols={symbols} />}
    {part !== 'model' && <div className="sats-gap-pictogram-controls">
      <div className="sats-gap-categories" aria-label="Table of items: choose a row">{model.labels.map((label, i) => <button type="button" key={label} aria-label={`Choose ${label} row`} aria-pressed={i === active} onClick={() => setActive(i)}><span>{label}</span><strong>{model.counts[i]} items</strong></button>)}</div>
      <div className="sats-gap-symbol-step"><output aria-live="polite">{model.labels[active]}: {symbols[active] === null ? '—' : symbols[active]! / 2} {symbols[active] === 2 ? 'symbol' : 'symbols'}</output>
        <button type="button" aria-label={`Remove half symbol for ${model.labels[active]}`} onClick={() => change(active, (symbols[active] ?? 0) - 1)}>− ½</button>
        <button type="button" aria-label={`Add half symbol for ${model.labels[active]}`} onClick={() => change(active, (symbols[active] ?? 0) + 1)}>+ ½</button>
      </div>
    </div>}
  </div>;
}
