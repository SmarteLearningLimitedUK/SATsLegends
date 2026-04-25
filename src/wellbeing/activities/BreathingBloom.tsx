import React, { useEffect, useMemo, useState } from 'react';
import { motion } from 'motion/react';
import WellbeingShell from '../WellbeingShell';
import { WellbeingActivityComponentProps } from '../types';

const phases = [
  { label: 'Breathe in', beats: 4, scale: 1.16 },
  { label: 'Hold', beats: 2, scale: 1.18 },
  { label: 'Breathe out', beats: 4, scale: 0.9 },
];

const totalCycles = 4;

const BreathingBloom: React.FC<WellbeingActivityComponentProps> = ({ onComplete, onExit }) => {
  const [stepIndex, setStepIndex] = useState(0);
  const [cycle, setCycle] = useState(0);
  const [finished, setFinished] = useState(false);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      if (stepIndex === phases.length - 1) {
        if (cycle === totalCycles - 1) {
          setFinished(true);
          window.setTimeout(() => onComplete(), 1200);
          return;
        }
        setCycle((value) => value + 1);
        setStepIndex(0);
        return;
      }
      setStepIndex((value) => value + 1);
    }, phases[stepIndex].beats * 760);

    return () => window.clearTimeout(timeoutId);
  }, [cycle, onComplete, stepIndex]);

  const progress = (((cycle * phases.length) + stepIndex + 1) / (totalCycles * phases.length)) * 100;
  const currentPhase = phases[stepIndex];
  const subtitle = useMemo(() => (currentPhase.label === 'Hold' ? 'Hold softly' : currentPhase.label), [currentPhase.label]);

  return (
    <WellbeingShell title="Bubble Breath" subtitle={subtitle} type="Breathing" progress={progress} onExit={onExit}>
      <div className="relative flex flex-1 items-center justify-center overflow-hidden px-6 py-5">
        <div className="absolute inset-0 bg-[linear-gradient(180deg,#86d8ff_0%,#bdeeff_40%,#eef8ff_100%)]" />
        <div className="absolute inset-x-0 top-0 h-[42%] bg-[radial-gradient(circle_at_18%_20%,rgba(255,255,255,0.95),transparent_12%),radial-gradient(circle_at_42%_16%,rgba(255,255,255,0.9),transparent_11%),radial-gradient(circle_at_70%_22%,rgba(255,255,255,0.9),transparent_12%),radial-gradient(circle_at_86%_18%,rgba(255,255,255,0.82),transparent_10%)]" />
        <div className="absolute inset-x-0 bottom-0 h-[26%] bg-[linear-gradient(180deg,rgba(249,250,251,0),rgba(255,255,255,0.36)_42%,rgba(226,232,240,0.66)_100%)]" />

        {Array.from({ length: 12 }).map((_, index) => (
          <motion.span
            key={`bubble-speck-${index}`}
            className="absolute rounded-full bg-white/75"
            style={{
              left: `${18 + (index * 7) % 64}%`,
              bottom: `${4 + (index % 4) * 12}%`,
              width: `${4 + (index % 3)}px`,
              height: `${4 + (index % 3)}px`,
            }}
            animate={{ y: [0, -150 - (index % 5) * 18], opacity: [0, 0.8, 0], scale: [0.9, 1.15, 0.85] }}
            transition={{ duration: 4 + (index % 4) * 0.5, repeat: Infinity, delay: index * 0.18, ease: 'easeOut' }}
          />
        ))}

        <motion.div
          animate={{
            scale: currentPhase.scale,
            filter: [
              'drop-shadow(0 0 18px rgba(147,197,253,0.22))',
              'drop-shadow(0 0 34px rgba(191,219,254,0.36))',
              'drop-shadow(0 0 18px rgba(147,197,253,0.22))',
            ],
          }}
          transition={{ duration: currentPhase.beats * 0.76, ease: 'easeInOut' }}
          className="relative flex h-[18rem] w-[18rem] items-center justify-center"
        >
          <div className="absolute inset-0 rounded-full border border-white/55 bg-[radial-gradient(circle_at_30%_26%,rgba(255,255,255,0.9),rgba(255,255,255,0.28)_20%,rgba(191,219,254,0.22)_42%,rgba(186,230,253,0.16)_64%,rgba(125,211,252,0.12)_100%)]" />
          <div className="absolute inset-[8%] rounded-full border border-white/28" />
          <div className="absolute inset-[16%] rounded-full border border-sky-100/24" />
          <div className="absolute left-[24%] top-[20%] h-14 w-14 rounded-full bg-white/38 blur-lg" />
          <div className="absolute right-[24%] bottom-[22%] h-10 w-10 rounded-full bg-sky-100/24 blur-lg" />
          <div className="relative z-10 text-center">
            <div className="text-[10px] font-black uppercase tracking-[0.18em] text-sky-900/65">Cycle {cycle + 1} of {totalCycles}</div>
            <div className="mt-2 text-2xl font-black text-sky-950">{currentPhase.label}</div>
            <div className="mt-2 text-sm font-semibold text-sky-900/72">
              {currentPhase.beats} slow counts
            </div>
          </div>
        </motion.div>

        {finished ? (
          <motion.div
            initial={{ opacity: 0, y: 12, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            className="absolute bottom-4 left-1/2 w-[min(92%,30rem)] -translate-x-1/2 rounded-[1.5rem] border border-white/45 bg-white/48 px-4 py-4 text-center shadow-[0_18px_40px_rgba(2,6,23,0.18)] backdrop-blur-md"
          >
            <div className="text-[10px] font-black uppercase tracking-[0.18em] text-sky-900/58">
              Breathing fact
            </div>
            <div className="mt-1 text-lg font-black text-sky-950">Well done</div>
            <div className="mt-2 text-sm font-semibold leading-relaxed text-sky-900/80">
              Slow breathing can help your heart rate settle and make your body feel calmer.
            </div>
          </motion.div>
        ) : null}
      </div>
    </WellbeingShell>
  );
};

export default BreathingBloom;
