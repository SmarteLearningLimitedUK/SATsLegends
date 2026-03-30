import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import WellbeingShell from '../WellbeingShell';
import { WellbeingActivityComponentProps } from '../types';

const CandleCalm: React.FC<WellbeingActivityComponentProps> = ({ onComplete, onExit }) => {
  const [steadyCount, setSteadyCount] = useState(0);
  const [holding, setHolding] = useState(false);

  useEffect(() => {
    if (!holding) return undefined;
    const timeoutId = window.setTimeout(() => {
      setSteadyCount((value) => {
        const next = value + 1;
        if (next >= 4) window.setTimeout(() => onComplete(), 400);
        return next;
      });
    }, 900);
    return () => window.clearTimeout(timeoutId);
  }, [holding, onComplete]);

  return (
    <WellbeingShell title="Candle Calm" subtitle="Hold softly to steady the flame" type="Grounding" progress={(steadyCount / 4) * 100} onExit={onExit}>
      <div className="relative flex flex-1 items-center justify-center overflow-hidden px-6">
        <div className="relative flex h-full w-full flex-col items-center justify-center">
          <motion.div
            className="absolute h-36 w-36 rounded-full bg-amber-300/14 blur-3xl"
            animate={{ opacity: holding ? [0.3, 0.6, 0.3] : [0.2, 0.34, 0.2], scale: holding ? [0.94, 1.08, 0.94] : [0.9, 1, 0.9] }}
            transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut' }}
          />
          <div className="relative h-56 w-40">
            <motion.div
              className="absolute left-1/2 top-10 h-24 w-12 -translate-x-1/2 rounded-[55%_45%_60%_40%/70%_55%_45%_30%] bg-[linear-gradient(180deg,#fde68a_0%,#fb923c_55%,rgba(251,146,60,0.18)_100%)]"
              animate={holding ? { scaleX: [0.96, 1.02, 0.98], scaleY: [1, 1.06, 1] } : { rotate: [-4, 4, -2, 2, 0], scaleY: [1, 0.92, 1.06, 0.98, 1] }}
              transition={{ duration: holding ? 2.4 : 0.65, repeat: Infinity, ease: 'easeInOut' }}
            />
            <div className="absolute bottom-10 left-1/2 h-24 w-20 -translate-x-1/2 rounded-t-[1.4rem] rounded-b-[0.8rem] bg-[linear-gradient(180deg,#f8fafc_0%,#dbeafe_100%)] shadow-[0_12px_24px_rgba(15,23,42,0.28)]" />
          </div>

          <button
            type="button"
            onPointerDown={() => setHolding(true)}
            onPointerUp={() => setHolding(false)}
            onPointerCancel={() => setHolding(false)}
            onPointerLeave={() => setHolding(false)}
            className="rounded-full border border-amber-100/25 bg-[linear-gradient(180deg,rgba(251,191,36,0.95),rgba(245,158,11,0.92))] px-5 py-3 text-sm font-black uppercase tracking-[0.14em] text-slate-950 shadow-[0_14px_26px_rgba(245,158,11,0.22)]"
          >
            Steady the flame
          </button>
        </div>
      </div>
    </WellbeingShell>
  );
};

export default CandleCalm;
