import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import WellbeingShell from '../WellbeingShell';
import { WellbeingActivityComponentProps } from '../types';

const breathingFact = {
  title: 'Breathing fact',
  text: 'Long, steady breaths give your brain a little more time to slow down and reset.',
};

const FeatherFloat: React.FC<WellbeingActivityComponentProps> = ({ onComplete, onExit }) => {
  const [holding, setHolding] = useState(false);
  const [position, setPosition] = useState(54);
  const [targetTime, setTargetTime] = useState(0);
  const [finished, setFinished] = useState(false);

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      setPosition((value) => {
        const next = Math.max(18, Math.min(82, value + (holding ? -1.4 : 1.1)));
        const inTarget = next >= 43 && next <= 57;
        if (inTarget) {
          setTargetTime((current) => {
            const updated = current + 0.12;
            if (updated >= 3) {
              setFinished(true);
              window.setTimeout(() => onComplete(), 1800);
            }
            return Math.min(updated, 3);
          });
        }
        return next;
      });
    }, 120);

    return () => window.clearInterval(intervalId);
  }, [holding, onComplete]);

  return (
    <WellbeingShell title="Feather Float" subtitle="Hold to lift, release to drift" type="Breathing" progress={(targetTime / 3) * 100} onExit={onExit}>
      <div className="relative flex flex-1 items-center justify-center overflow-hidden px-6">
        <div className="relative h-full w-full max-w-xs">
          <div className="absolute inset-x-0 top-[43%] h-[14%] rounded-[1.5rem] border border-emerald-200/20 bg-emerald-300/10 shadow-[0_0_24px_rgba(110,231,183,0.12)]" />
          <motion.div
            className="absolute left-1/2 -translate-x-1/2"
            style={{ top: `${position}%` }}
            animate={{ rotate: holding ? [0, -5, 2, 0] : [0, 4, -2, 0] }}
            transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
          >
            <div className="relative h-28 w-16">
              <div className="absolute left-1/2 top-0 h-24 w-10 -translate-x-1/2 rounded-[60%_40%_60%_40%/70%_55%_45%_30%] bg-[linear-gradient(180deg,rgba(248,250,252,0.96),rgba(186,230,253,0.78))] shadow-[0_0_24px_rgba(186,230,253,0.18)]" />
              <div className="absolute left-1/2 top-3 h-20 w-[2px] -translate-x-1/2 rounded-full bg-cyan-100/70" />
            </div>
          </motion.div>

          <button
            type="button"
            onPointerDown={() => setHolding(true)}
            onPointerUp={() => setHolding(false)}
            onPointerCancel={() => setHolding(false)}
            onPointerLeave={() => setHolding(false)}
            className="ui-button-primary absolute bottom-5 left-1/2 w-[72%] -translate-x-1/2 px-4 py-3 text-sm font-black uppercase tracking-[0.14em]"
          >
            Hold gently
          </button>
        </div>

        {finished ? (
          <motion.div
            initial={{ opacity: 0, y: 12, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            className="absolute bottom-5 left-1/2 z-20 w-[min(92%,30rem)] -translate-x-1/2 rounded-[1.6rem] border border-emerald-100/18 bg-[linear-gradient(180deg,rgba(6,78,59,0.82),rgba(8,47,73,0.86))] px-4 py-4 text-center shadow-[0_18px_40px_rgba(2,6,23,0.35)]"
          >
            <div className="text-[10px] font-black uppercase tracking-[0.18em] text-emerald-100/65">
              {breathingFact.title}
            </div>
            <div className="mt-1 text-lg font-black text-emerald-50">Balloon released</div>
            <div className="mt-2 text-sm font-semibold leading-relaxed text-cyan-50/84">
              {breathingFact.text}
            </div>
          </motion.div>
        ) : null}
      </div>
    </WellbeingShell>
  );
};

export default FeatherFloat;
