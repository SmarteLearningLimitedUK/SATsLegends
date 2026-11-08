import React, {useEffect, useId, useLayoutEffect, useRef, useState} from 'react';
import {Check, type LucideIcon} from 'lucide-react';
import ArtworkFrame from './ArtworkFrame';
import {asset} from './assets';

interface Props {
 items: readonly {id: string; label: string; icon: LucideIcon}[];
 cue: string;
 packed: string[]; brightness: number; ready: boolean; finished: boolean;
 onPack: (id: string) => void;
 onDim: React.ChangeEventHandler<HTMLInputElement>;
 onFinish: () => void;
}

export default function LanternCampScene(p: Props) {
 const flameId = useId().replace(/:/g, '');
 const root = useRef<HTMLDivElement>(null), advanceFocus = useRef(false);
 const [hidden, setHidden] = useState(() => document.hidden);
 useEffect(() => {
  const update = () => setHidden(document.hidden);
  document.addEventListener('visibilitychange', update);
  return () => document.removeEventListener('visibilitychange', update);
 }, []);
 useLayoutEffect(() => {
  if (!advanceFocus.current) return;
  advanceFocus.current = false;
  (root.current?.querySelector<HTMLElement>('[data-camp-item]') ?? root.current?.querySelector<HTMLElement>('input'))?.focus({preventScroll: true});
 }, [p.packed.length]);
 return <div ref={root} className="lantern-camp" data-camp-packed={p.packed.length}
  data-camp-ready={p.ready} data-camp-finished={p.finished} data-camp-motion-paused={hidden || p.finished}>
  <div className="lantern-focus" role="status" aria-live="polite">
   <ArtworkFrame name="frames/glacier_panel_v3" corner={.13}/>
   <p>{p.cue}</p>
  </div>
  <div className="lantern-hero-space" aria-hidden="true">
   <div className="lantern-fireflies">{Array.from({length: 7}, (_, i) => <i key={i} style={{left: `${9 + i * 13}%`, top: `${22 + i % 3 * 21}%`, animationDelay: `${-i * 1.1}s`}}/>)}</div>
   <div className="lantern-object" data-lantern-brightness={p.brightness} style={{'--lantern-light': p.brightness / 100} as React.CSSProperties}>
    <span className="lantern-ground-light"/>
    <div className="lantern-assembly">
     <span className="lantern-window-light"/>
     <svg className="lantern-flame" viewBox="0 0 100 120" style={{opacity: Math.max(.2, p.brightness / 100)}}>
      <defs><radialGradient id={flameId}><stop stopColor="#fffce1"/><stop offset=".58" stopColor="#ffe591"/><stop offset="1" stopColor="#e8a33c" stopOpacity=".1"/></radialGradient></defs>
      <ellipse cx="50" cy="72" rx="48" ry="46" fill={`url(#${flameId})`}/>
      <g className="lantern-flame-flicker">
       <path d="M50 108C24 91 29 69 42 45c9-17 13-29 9-42 29 29 39 57 29 81-5 13-16 21-30 24Z" fill="#ffdd79"/>
       <path d="M51 104C37 93 39 79 52 59c13 23 14 34-1 45Z" fill="#fff8d8"/>
      </g>
     </svg>
     <img className="lantern-metalwork" src={asset('props', 'camp_lantern_v1')} alt="" draggable={false}/>
    </div>
   </div>
  </div>
  <div className="lantern-camp-actions">
   {!p.ready ? <div className="lantern-gear-grid" role="group" aria-label="Six pieces of camp gear">
    {p.items.map(item => {
     const Icon = item.icon, packed = p.packed.includes(item.id);
     const content = <><ArtworkFrame name="buttons/scale_key_v4" corner={.07} fit="height"/><span className="lantern-gear-content">{packed ? <Check aria-hidden="true"/> : <Icon aria-hidden="true"/>}<span>{item.label}</span></span></>;
     return packed ? <div className="lantern-gear is-packed" key={item.id} data-packed-item={item.id} aria-label={`${item.label} packed`}>{content}</div>
      : <button className="lantern-gear" key={item.id} type="button" data-button-skin="none" data-camp-item={item.id} aria-label={`Pack ${item.label}`} onClick={event => {advanceFocus.current = event.detail === 0;p.onPack(item.id);}} disabled={p.finished}>{content}</button>;
    })}
   </div> : <div className="lantern-dimmer">
    <ArtworkFrame name="frames/glacier_panel_v3" corner={.13}/>
    <label htmlFor="camp-lantern-brightness">Lantern brightness</label>
    <input id="camp-lantern-brightness" type="range" min="0" max="100" step="5" value={p.brightness}
     onChange={p.onDim} disabled={p.finished} aria-valuetext={`${p.brightness}% brightness`}/>
    <button type="button" className="wellbeing-action lantern-finish" data-button-skin="none" disabled={p.finished} onClick={p.onFinish}>
     <ArtworkFrame name="buttons/paper_gold_v3" corner={.1} fit="height"/>
     Finish
    </button>
   </div>}
  </div>
 </div>;
}
