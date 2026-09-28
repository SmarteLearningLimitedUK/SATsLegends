import React, { useEffect, useRef, useState } from 'react';
import { useReducedMotion } from 'motion/react';
import WellbeingShell from '../WellbeingShell';
import { WellbeingActivityComponentProps } from '../types';
import { useWellbeingCompletion } from '../useWellbeingCompletion';

type Fish = { id: number; x: number; y: number; vx: number; vy: number; color: string };
type Pad = { id: number; x: number; y: number; targetX: number; targetY: number; placed: boolean };
type PadDrag = { id: number; pointerId: number; startX: number; startY: number; originX: number; originY: number; offsetX: number; offsetY: number };
const colors = ['#edc36e', '#9dd7d7', '#e8a88a', '#bbe3a4'];
const initialPads: Pad[] = [
  { id: 0, x: 18, y: 31, targetX: 18, targetY: 68, placed: false },
  { id: 1, x: 40, y: 22, targetX: 40, targetY: 77, placed: false },
  { id: 2, x: 62, y: 31, targetX: 63, targetY: 67, placed: false },
  { id: 3, x: 83, y: 22, targetX: 84, targetY: 57, placed: false },
];
const makeFish = (id: number): Fish => ({
  id, x: 10 + (id % 5) * 16 + (id * 7) % 9, y: 30 + (id % 6) * 10 + (id * 5) % 7,
  vx: id % 2 === 0 ? .08 : -.07, vy: id % 3 === 0 ? .035 : -.025, color: colors[id % colors.length],
});
const clamp = (value: number) => Math.max(9, Math.min(91, value));

const PeacefulPond: React.FC<WellbeingActivityComponentProps> = ({ onComplete, onExit }) => {
  const [pads, setPads] = useState(initialPads);
  const [fish, setFish] = useState(() => Array.from({ length: 16 }, (_, index) => makeFish(index)));
  const [pulse, setPulse] = useState<{ x: number; y: number; key: number } | null>(null);
  const pondRef = useRef<HTMLDivElement | null>(null);
  const dragRef = useRef<PadDrag | null>(null);
  const placedRef = useRef(new Set<number>());
  const pulseTimer = useRef<number | null>(null);
  const reducedMotion = useReducedMotion();
  const { finished, finish, cancel } = useWellbeingCompletion(onComplete);
  const completeCount = pads.filter((pad) => pad.placed).length;

  useEffect(() => {
    if (reducedMotion || finished) return undefined;
    const interval = window.setInterval(() => {
      setFish((current) => current.map((item) => {
        let vx = item.vx;
        let vy = item.vy;
        if (pulse) {
          const dx = item.x - pulse.x;
          const dy = item.y - pulse.y;
          const distance = Math.max(1, Math.hypot(dx, dy));
          const influence = Math.max(0, 16 - distance) / 16;
          vx += dx / distance * .012 * influence;
          vy += dy / distance * .012 * influence;
        }
        if (item.x < 5 || item.x > 95) vx *= -1;
        if (item.y < 8 || item.y > 92) vy *= -1;
        return { ...item, x: Math.max(4, Math.min(96, item.x + vx)), y: Math.max(7, Math.min(93, item.y + vy)), vx: vx * .999, vy: vy * .999 };
      }));
    }, 110);
    return () => window.clearInterval(interval);
  }, [finished, pulse, reducedMotion]);

  useEffect(() => { if (completeCount === initialPads.length) finish(1200); }, [completeCount, finish]);
  useEffect(() => () => { if (pulseTimer.current !== null) window.clearTimeout(pulseTimer.current); dragRef.current = null; }, []);

  const getPoint = (clientX: number, clientY: number) => {
    const rect = pondRef.current?.getBoundingClientRect();
    return rect ? { x: (clientX - rect.left) / rect.width * 100, y: (clientY - rect.top) / rect.height * 100 } : { x: 50, y: 50 };
  };
  const placePad = (id: number) => {
    if (finished || placedRef.current.has(id)) return;
    placedRef.current.add(id);
    setPads((current) => current.map((pad) => pad.id === id ? { ...pad, x: pad.targetX, y: pad.targetY, placed: true } : pad));
  };
  const beginDrag = (event: React.PointerEvent<HTMLButtonElement>, pad: Pad) => {
    if (finished || pad.placed || dragRef.current) return;
    const point = getPoint(event.clientX, event.clientY);
    event.currentTarget.setPointerCapture(event.pointerId);
    dragRef.current = { id: pad.id, pointerId: event.pointerId, startX: event.clientX, startY: event.clientY, originX: pad.x, originY: pad.y, offsetX: point.x - pad.x, offsetY: point.y - pad.y };
  };
  const moveDrag = (event: React.PointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    const point = getPoint(event.clientX, event.clientY);
    setPads((current) => current.map((pad) => pad.id === drag.id ? { ...pad, x: clamp(point.x - drag.offsetX), y: clamp(point.y - drag.offsetY) } : pad));
  };
  const endDrag = (event: React.PointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    dragRef.current = null;
    const point = getPoint(event.clientX, event.clientY);
    const pad = pads.find((item) => item.id === drag.id);
    const distance = Math.hypot(event.clientX - drag.startX, event.clientY - drag.startY);
    if (pad && (distance < 8 || (Math.abs(clamp(point.x - drag.offsetX) - pad.targetX) < 6 && Math.abs(clamp(point.y - drag.offsetY) - pad.targetY) < 6))) placePad(pad.id);
  };
  const cancelDrag = (event: React.PointerEvent<HTMLElement>) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    dragRef.current = null;
    setPads((current) => current.map((pad) => pad.id === drag.id ? { ...pad, x: drag.originX, y: drag.originY } : pad));
  };
  const ripple = (event: React.PointerEvent<HTMLDivElement>) => {
    if (finished || (event.target instanceof Element && event.target.closest('[data-pond-pad]'))) return;
    const point = getPoint(event.clientX, event.clientY);
    if (pulseTimer.current !== null) window.clearTimeout(pulseTimer.current);
    setPulse({ ...point, key: Date.now() });
    pulseTimer.current = window.setTimeout(() => { setPulse(null); pulseTimer.current = null; }, 1100);
  };

  return (
    <WellbeingShell title="Peaceful Pond" activityId="peaceful_pond" type="Grounding"
      subtitle="Tap a lily pad to guide it to its numbered ring, or drag it. Tap the water for a ripple."
      purpose="Give one small movement your attention." affirmation="No rush. One thing at a time."
      status={finished ? 'All four lily pads are home' : 'Lily pads placed ' + completeCount + ' of 4'} progress={completeCount * 25} onExit={() => { cancel(); onExit(); }}>
      <div className="wellbeing-scene">
        <div ref={pondRef} className="pond-playfield" data-pond-playfield onPointerDown={ripple} onPointerMove={moveDrag} onPointerUp={endDrag} onPointerCancel={cancelDrag}>
          {pads.map((pad) => <div key={'target-' + pad.id} className={'pond-target' + (pad.placed ? ' is-placed' : '')} style={{ left: pad.targetX + '%', top: pad.targetY + '%' }} data-pond-target={pad.id + 1} aria-hidden="true">{pad.id + 1}</div>)}
          {fish.map((item) => (
            <div key={item.id} className="pond-fish" data-wellbeing-fish style={{ left: item.x + '%', top: item.y + '%', transform: item.vx < 0 ? 'scaleX(-1)' : 'none' }} aria-hidden="true">
              <svg viewBox="0 0 48 24"><path d="M10 12 2 3 2 21Z" fill={item.color} stroke="#315d66" strokeWidth="1.5" /><ellipse cx="28" cy="12" rx="17" ry="10" fill={item.color} stroke="#315d66" strokeWidth="1.5" /><path d="M18 6Q27 1 34 6" stroke="#ffffff60" strokeWidth="2" fill="none" /><circle cx="38" cy="10" r="2.5" fill="#f7f2dc" /><circle cx="39" cy="10" r="1.3" fill="#294251" /></svg>
            </div>
          ))}
          {pads.map((pad) => (
            <button key={pad.id} type="button" className="pond-pad" data-button-skin="none" data-pond-pad={pad.id + 1} aria-label={'Lily pad ' + (pad.id + 1)} aria-pressed={pad.placed} disabled={finished}
              style={{ left: pad.x + '%', top: pad.y + '%' }} onPointerDown={(event) => beginDrag(event, pad)} onLostPointerCapture={cancelDrag}
              onClick={(event) => { if (event.detail === 0) placePad(pad.id); }}>
              <span>{pad.id + 1}</span>
            </button>
          ))}
          {pulse ? <div key={pulse.key} className="pond-ripple" style={{ left: pulse.x + '%', top: pulse.y + '%' }} aria-hidden="true" /> : null}
        </div>
      </div>
    </WellbeingShell>
  );
};

export default PeacefulPond;
