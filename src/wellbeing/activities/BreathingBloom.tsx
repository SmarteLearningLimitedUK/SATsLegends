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
        <div className="absolute inset-0 bg-[linear-gradient(180deg,#4fb6ff_0%,#2392ef_46%,#176dd3_100%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_22%,rgba(255,255,255,0.34),transparent_18%),radial-gradient(circle_at_74%_16%,rgba(255,255,255,0.26),transparent_20%),radial-gradient(circle_at_52%_68%,rgba(56,189,248,0.22),transparent_38%)]" />
        <div className="absolute inset-x-0 top-0 h-[42%] bg-[radial-gradient(circle_at_18%_20%,rgba(255,255,255,0.9),transparent_12%),radial-gradient(circle_at_42%_16%,rgba(255,255,255,0.86),transparent_11%),radial-gradient(circle_at_70%_22%,rgba(255,255,255,0.84),transparent_12%),radial-gradient(circle_at_86%_18%,rgba(255,255,255,0.78),transparent_10%)]" />
        <div className="absolute inset-x-0 bottom-0 h-[26%] bg-[linear-gradient(180deg,rgba(14,116,144,0),rgba(14,116,144,0.22)_42%,rgba(8,47,73,0.44)_100%)]" />

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
              'drop-shadow(0 0 20px rgba(125,211,252,0.38))',
              'drop-shadow(0 0 38px rgba(186,230,253,0.58))',
              'drop-shadow(0 0 20px rgba(125,211,252,0.38))',
            ],
          }}
          transition={{ duration: currentPhase.beats * 0.76, ease: 'easeInOut' }}
          className="relative flex h-[18rem] w-[18rem] items-center justify-center"
        >
          <div className="absolute inset-0 rounded-full border border-white/72 bg-[radial-gradient(circle_at_30%_26%,rgba(255,255,255,0.96),rgba(255,255,255,0.42)_18%,rgba(224,242,254,0.34)_38%,rgba(191,219,254,0.26)_62%,rgba(125,211,252,0.2)_100%)]" />
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
