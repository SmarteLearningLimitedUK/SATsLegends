import React, { useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'motion/react';
import WellbeingShell from '../WellbeingShell';
import { WellbeingActivityComponentProps } from '../types';

type Fish = {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
};

type Pad = {
  id: number;
  x: number;
  y: number;
  targetX: number;
  targetY: number;
  placed: boolean;
  dragging: boolean;
};

const pondColors = ['#60a5fa', '#f472b6', '#f59e0b', '#34d399', '#a78bfa', '#f87171', '#22d3ee', '#fde047'];

const makeFish = (id: number): Fish => ({
  id,
  x: 10 + (id % 5) * 15 + (id * 7) % 11,
  y: 12 + (id % 6) * 11 + (id * 5) % 9,
  vx: (id % 2 === 0 ? 0.16 : -0.14) * (1 + (id % 3) * 0.15),
  vy: (id % 3 === 0 ? 0.08 : -0.07) * (1 + (id % 4) * 0.1),
  color: pondColors[id % pondColors.length],
});

const PeacefulPond: React.FC<WellbeingActivityComponentProps> = ({ onComplete, onExit }) => {
  const [message, setMessage] = useState('Drag the lilypads or tap the water to guide the fish');
  const [pulse, setPulse] = useState({ x: 50, y: 50, dx: 0, dy: 0, active: false });
  const [fish, setFish] = useState<Fish[]>(() => Array.from({ length: 16 }, (_, index) => makeFish(index)));
  const [pads, setPads] = useState<Pad[]>(() => [
    { id: 0, x: 18, y: 26, targetX: 16, targetY: 24, placed: false, dragging: false },
    { id: 1, x: 72, y: 22, targetX: 78, targetY: 21, placed: false, dragging: false },
    { id: 2, x: 38, y: 66, targetX: 34, targetY: 70, placed: false, dragging: false },
    { id: 3, x: 66, y: 64, targetX: 69, targetY: 72, placed: false, dragging: false },
  ]);
  const pondRef = useRef<HTMLDivElement | null>(null);
  const dragRef = useRef<{ id: number | null; offsetX: number; offsetY: number }>({ id: null, offsetX: 0, offsetY: 0 });
  const finishedRef = useRef(false);

  const completeCount = useMemo(() => pads.filter((pad) => pad.placed).length, [pads]);
  const progress = Math.round(((completeCount * 2) + fish.filter((item) => Math.abs(item.vx) + Math.abs(item.vy) > 0.12).length / 4) * 10);

  useEffect(() => {
    if (finishedRef.current) return undefined;
    const interval = window.setInterval(() => {
      setFish((current) => current.map((item) => {
        let nx = item.x + item.vx;
        let ny = item.y + item.vy;
        let vx = item.vx;
        let vy = item.vy;

        if (pulse.active) {
          const dx = nx - pulse.x;
          const dy = ny - pulse.y;
          const dist = Math.max(1, Math.hypot(dx, dy));
          const influence = Math.max(0, 11 - dist) / 11;
          vx += (pulse.dx * 0.08 + dx / dist * 0.03) * influence;
          vy += (pulse.dy * 0.08 + dy / dist * 0.03) * influence;
        }

        pads.forEach((pad) => {
          const dx = nx - pad.x;
          const dy = ny - pad.y;
          const dist = Math.max(1, Math.hypot(dx, dy));
          if (dist < 8) {
            vx += dx / dist * 0.04;
            vy += dy / dist * 0.04;
          }
        });

        if (nx < 3 || nx > 97) vx *= -1;
        if (ny < 3 || ny > 97) vy *= -1;
        nx = Math.max(3, Math.min(97, nx));
        ny = Math.max(3, Math.min(97, ny));

        vx *= 0.99;
        vy *= 0.99;
        return { ...item, x: nx, y: ny, vx, vy };
      }));
    }, 30);
    return () => window.clearInterval(interval);
  }, [pads, pulse.active, pulse.dx, pulse.dy, pulse.x, pulse.y]);

  useEffect(() => {
    if (finishedRef.current) return;
    if (pads.every((pad) => pad.placed) && fish.length > 0) {
      setMessage('The pond has settled beautifully');
      finishedRef.current = true;
      window.setTimeout(() => onComplete(), 1200);
    }
  }, [fish.length, onComplete, pads]);

  const getPoint = (event: React.PointerEvent<HTMLDivElement>) => {
    const rect = pondRef.current?.getBoundingClientRect() ?? event.currentTarget.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width) * 100;
    const y = ((event.clientY - rect.top) / rect.height) * 100;
    return { x: Math.max(0, Math.min(100, x)), y: Math.max(0, Math.min(100, y)) };
  };

  const handlePondPointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    const target = event.target as HTMLElement;
    if (target.closest('[data-pad]')) return;
    const point = getPoint(event);
    setPulse({ x: point.x, y: point.y, dx: 0, dy: 0, active: true });
    setMessage('A gentle current is moving through the pond');
    setTimeout(() => setPulse((current) => ({ ...current, active: false })), 800);
  };

  const handleDragStart = (event: React.PointerEvent<HTMLButtonElement>, id: number) => {
    const point = getPoint(event);
    dragRef.current = { id, offsetX: 0, offsetY: 0 };
    setPads((current) => current.map((pad) => (pad.id === id ? { ...pad, dragging: true } : pad)));
    setMessage('Move the lilypads into their calm places');
    const rect = (event.currentTarget.parentElement?.parentElement ?? event.currentTarget).getBoundingClientRect();
    dragRef.current.offsetX = ((event.clientX - rect.left) / rect.width) * 100 - point.x;
    dragRef.current.offsetY = ((event.clientY - rect.top) / rect.height) * 100 - point.y;
  };

  const handleDragMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (dragRef.current.id === null) return;
    const point = getPoint(event);
    const nextX = Math.max(8, Math.min(92, point.x + dragRef.current.offsetX));
    const nextY = Math.max(8, Math.min(92, point.y + dragRef.current.offsetY));
    setPads((current) => current.map((pad) => {
      if (pad.id !== dragRef.current.id) return pad;
      const placed = Math.abs(nextX - pad.targetX) < 4 && Math.abs(nextY - pad.targetY) < 4;
      return { ...pad, x: nextX, y: nextY, placed };
    }));
  };

  const handleDragEnd = () => {
    if (dragRef.current.id === null) return;
    setPads((current) => current.map((pad) => {
      if (pad.id !== dragRef.current.id) return pad;
      const placed = Math.abs(pad.x - pad.targetX) < 4 && Math.abs(pad.y - pad.targetY) < 4;
      return placed ? { ...pad, x: pad.targetX, y: pad.targetY, placed, dragging: false } : { ...pad, dragging: false };
    }));
    dragRef.current = { id: null, offsetX: 0, offsetY: 0 };
  };

  const calmFish = fish.filter((item) => Math.hypot(item.vx, item.vy) < 0.18).length;

  return (
    <WellbeingShell title="Peaceful Pond" subtitle={message} type="Grounding" progress={Math.min(100, completeCount * 25 + calmFish * 2)} onExit={onExit}>
      <div className="relative flex flex-1 items-center justify-center overflow-hidden p-5">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_18%,rgba(59,130,246,0.2),transparent_28%),linear-gradient(180deg,#0b3b4d_0%,#0e5561_40%,#0f766e_100%)]" />
        <div className="absolute inset-0 opacity-55 [background-image:radial-gradient(rgba(255,255,255,0.14)_1px,transparent_1px)] [background-size:28px_28px]" />
        <div
          ref={pondRef}
          className="relative h-full w-full overflow-hidden rounded-[2rem] border border-cyan-100/14 bg-[radial-gradient(circle_at_50%_42%,rgba(45,212,191,0.28),rgba(6,95,70,0.76)_55%,rgba(8,47,73,0.96)_100%)] shadow-[0_18px_40px_rgba(2,6,23,0.35)]"
          onPointerDown={handlePondPointerDown}
          onPointerMove={handleDragMove}
          onPointerUp={handleDragEnd}
          onPointerLeave={handleDragEnd}
        >
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_12%_16%,rgba(255,255,255,0.12),transparent_12%),radial-gradient(circle_at_84%_20%,rgba(255,255,255,0.1),transparent_10%),radial-gradient(circle_at_24%_78%,rgba(255,255,255,0.08),transparent_10%),radial-gradient(circle_at_74%_74%,rgba(255,255,255,0.08),transparent_9%)]" />

          <div className="absolute inset-0">
            {Array.from({ length: 22 }).map((_, index) => (
              <motion.span
                key={`spark-${index}`}
                className="absolute rounded-full bg-white/80"
                style={{ left: `${6 + (index * 17) % 88}%`, top: `${8 + (index * 11) % 76}%`, width: `${1 + (index % 3)}px`, height: `${1 + (index % 3)}px` }}
                animate={{ opacity: [0.18, 0.85, 0.2], scale: [1, 1.4, 1] }}
                transition={{ duration: 2.5 + (index % 5) * 0.4, repeat: Infinity, ease: 'easeInOut' }}
              />
            ))}
          </div>

          {pads.map((pad) => (
            <button
              key={pad.id}
              type="button"
              data-pad
              onPointerDown={(event) => handleDragStart(event, pad.id)}
              className="absolute h-14 w-14 -translate-x-1/2 -translate-y-1/2 rounded-full border border-emerald-100/24 bg-[radial-gradient(circle_at_40%_35%,rgba(190,242,100,0.7),rgba(22,101,52,0.92)_60%,rgba(5,46,22,1)_100%)] shadow-[0_0_22px_rgba(134,239,172,0.22)]"
              style={{ left: `${pad.x}%`, top: `${pad.y}%` }}
            >
              <span className="absolute inset-2 rounded-full border border-white/10" />
              <span className="absolute left-1/2 top-1/2 h-7 w-7 -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/8 bg-[radial-gradient(circle_at_35%_32%,rgba(255,255,255,0.55),rgba(34,197,94,0.16)_45%,transparent_72%)]" />
            </button>
          ))}

          {fish.map((item) => (
            <motion.div
              key={item.id}
              className="absolute h-3.5 w-5 -translate-x-1/2 -translate-y-1/2 rounded-full"
              style={{ left: `${item.x}%`, top: `${item.y}%`, background: item.color }}
              animate={{ rotate: [0, item.vx >= 0 ? 8 : -8, 0], scale: [1, 1.05, 1] }}
              transition={{ duration: 1.6 + (item.id % 4) * 0.25, repeat: Infinity, ease: 'easeInOut' }}
            >
              <span className="absolute -right-1 top-1/2 h-2 w-2 -translate-y-1/2 rounded-full" style={{ background: item.color }} />
              <span className="absolute left-0 top-1/2 h-1.5 w-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white/80" />
            </motion.div>
          ))}

          {pulse.active ? (
            <motion.div
              className="pointer-events-none absolute -translate-x-1/2 -translate-y-1/2 rounded-full border border-cyan-50/60 bg-cyan-100/10"
              style={{ left: `${pulse.x}%`, top: `${pulse.y}%` }}
              initial={{ width: 0, height: 0, opacity: 0.8 }}
              animate={{ width: 210, height: 210, opacity: 0 }}
              transition={{ duration: 0.8, ease: 'easeOut' }}
            />
          ) : null}

          <div className="absolute left-4 top-4 rounded-full border border-white/12 bg-black/25 px-3 py-1.5 text-[11px] font-black uppercase tracking-[0.18em] text-white/80">
            Lilypads placed {completeCount}/4
          </div>

          <div className="absolute bottom-4 left-1/2 w-[min(90%,34rem)] -translate-x-1/2 rounded-[1.4rem] border border-white/10 bg-black/30 px-4 py-3 text-center text-sm font-semibold text-white/88 backdrop-blur-sm">
            {completeCount < 4 ? 'Place the lilypads, then tap or drag the water to nudge the fish into calm patterns.' : 'The pond is settling. Watch the fish drift together.'}
          </div>
        </div>
      </div>
    </WellbeingShell>
  );
};

export default PeacefulPond;
