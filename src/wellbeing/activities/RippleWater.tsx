import React, { useMemo, useState } from 'react';
import { motion } from 'motion/react';
import WellbeingShell from '../WellbeingShell';
import { WellbeingActivityComponentProps } from '../types';

type Ripple = { id: number; x: number; y: number; calm: boolean };

const RippleWater: React.FC<WellbeingActivityComponentProps> = ({ onComplete, onExit }) => {
  const [ripples, setRipples] = useState<Ripple[]>([]);
  const [calmCount, setCalmCount] = useState(0);
  const [message, setMessage] = useState('Tap gently to make a ripple');
  const [lastTapAt, setLastTapAt] = useState(0);

  const progress = Math.min(100, (calmCount / 5) * 100);
  const shimmer = useMemo(() => Array.from({ length: 10 }), []);

  const handleTap = (event: React.PointerEvent<HTMLDivElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const now = Date.now();
    const calm = now - lastTapAt > 850;
    const nextCount = calm ? calmCount + 1 : calmCount;
    const x = ((event.clientX - rect.left) / rect.width) * 100;
    const y = ((event.clientY - rect.top) / rect.height) * 100;
    const ripple = { id: now, x, y, calm };
    setRipples((current) => [...current.slice(-2), ripple]);
    setLastTapAt(now);
    setCalmCount(nextCount);
    setMessage(calm ? 'Nice and calm' : 'Slower taps feel better');
    window.setTimeout(() => {
      setRipples((current) => current.filter((item) => item.id !== ripple.id));
    }, 1800);
    if (nextCount >= 5) {
      window.setTimeout(() => onComplete(), 600);
    }
  };

  return (
    <WellbeingShell title="Ripple Water" subtitle={message} type="Grounding" progress={progress} onExit={onExit}>
      <div className="relative flex flex-1 items-center justify-center overflow-hidden p-5">
        <div
          onPointerDown={handleTap}
          className="relative h-full w-full overflow-hidden rounded-[2rem] border border-cyan-100/16 bg-[radial-gradient(circle_at_top,rgba(125,211,252,0.22),rgba(15,23,42,0.15)_28%),linear-gradient(180deg,rgba(14,116,144,0.55),rgba(8,47,73,0.7)_54%,rgba(7,26,46,0.92)_100%)]"
        >
          {shimmer.map((_, index) => (
            <motion.span
              key={`water-shimmer-${index}`}
              className="absolute h-20 w-20 rounded-full bg-white/8 blur-2xl"
              style={{ left: `${8 + (index % 4) * 22}%`, top: `${10 + Math.floor(index / 4) * 22}%` }}
              animate={{ x: [0, 8, -4, 0], opacity: [0.08, 0.2, 0.1, 0.08] }}
              transition={{ duration: 5 + index * 0.45, repeat: Infinity, ease: 'easeInOut' }}
            />
          ))}

          {ripples.map((ripple) => (
            <motion.div
              key={ripple.id}
              className={`absolute rounded-full border ${ripple.calm ? 'border-cyan-100/85' : 'border-cyan-100/35'}`}
              style={{ left: `${ripple.x}%`, top: `${ripple.y}%` }}
              initial={{ width: 0, height: 0, opacity: 0.85, x: '-50%', y: '-50%' }}
              animate={{ width: 180, height: 180, opacity: 0 }}
              transition={{ duration: 1.5, ease: 'easeOut' }}
            />
          ))}
        </div>
      </div>
    </WellbeingShell>
  );
};

export default RippleWater;
