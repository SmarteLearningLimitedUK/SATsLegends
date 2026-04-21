import React, { useEffect, useMemo, useState } from 'react';
import { motion } from 'motion/react';
import WellbeingShell from '../WellbeingShell';
import { WellbeingActivityComponentProps } from '../types';

const phases = [
  { label: 'Breathe in', beats: 4 },
  { label: 'Hold', beats: 2 },
  { label: 'Breathe out', beats: 4 },
];
const totalCycles = 4;
const breathingFact = {
  title: 'Breathing fact',
  text: 'Slow breathing can help your heart rate settle and make your body feel calmer.',
};

const BreathingBloom: React.FC<WellbeingActivityComponentProps> = ({ onComplete, onExit }) => {
  const [stepIndex, setStepIndex] = useState(0);
  const [cycle, setCycle] = useState(0);
  const [finished, setFinished] = useState(false);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      if (stepIndex === phases.length - 1) {
        if (cycle === totalCycles - 1) {
          setFinished(true);
          window.setTimeout(() => onComplete(), 1800);
          return;
        }
        setCycle((value) => value + 1);
        setStepIndex(0);
        return;
      }
      setStepIndex((value) => value + 1);
    }, phases[stepIndex].beats * 700);

    return () => window.clearTimeout(timeoutId);
  }, [cycle, onComplete, stepIndex]);

  const progress = ((cycle * phases.length) + stepIndex + 1) / (totalCycles * phases.length) * 100;
  const bloomScale = useMemo(() => {
    if (phases[stepIndex].label === 'Breathe in') return 1.12;
    if (phases[stepIndex].label === 'Hold') return 1.18;
    return 0.92;
  }, [stepIndex]);

  return (
    <WellbeingShell
      title="Breathing Bloom"
      subtitle={phases[stepIndex].label === 'Hold' ? 'Lovely and slow' : phases[stepIndex].label}
      type="Breathing"
      progress={progress}
      onExit={onExit}
    >
      <div className="relative flex flex-1 items-center justify-center overflow-hidden px-6">
        {Array.from({ length: 12 }).map((_, index) => (
          <motion.span
            key={`petal-spark-${index}`}
            className="absolute h-2 w-2 rounded-full bg-cyan-100/45"
            animate={{ y: [0, -18, -6], opacity: [0, 0.7, 0], scale: [0.6, 1, 0.4] }}
            transition={{ duration: 3.2, repeat: Infinity, delay: index * 0.16, ease: 'easeInOut' }}
            style={{ left: `${22 + (index % 4) * 14}%`, top: `${24 + Math.floor(index / 4) * 16}%` }}
          />
        ))}

        <motion.div
          animate={{ scale: bloomScale, filter: ['drop-shadow(0 0 18px rgba(125,211,252,0.22))', 'drop-shadow(0 0 34px rgba(167,243,208,0.42))', 'drop-shadow(0 0 18px rgba(125,211,252,0.22))'] }}
          transition={{ duration: phases[stepIndex].beats * 0.7, ease: 'easeInOut' }}
          className="relative flex h-[18rem] w-[18rem] items-center justify-center"
        >
          {Array.from({ length: 8 }).map((_, index) => (
            <motion.span
              key={`petal-${index}`}
              className="absolute h-28 w-16 rounded-full bg-[linear-gradient(180deg,rgba(191,219,254,0.95),rgba(192,132,252,0.45))] opacity-85"
              style={{ transform: `rotate(${index * 45}deg) translateY(-58px)` }}
              animate={{ scaleY: phases[stepIndex].label === 'Breathe out' ? 0.88 : 1.08 }}
              transition={{ duration: phases[stepIndex].beats * 0.7, ease: 'easeInOut' }}
            />
          ))}
          <div className="absolute h-28 w-28 rounded-full bg-[radial-gradient(circle,rgba(253,224,71,0.95),rgba(250,204,21,0.65)_40%,rgba(125,211,252,0.28)_100%)] shadow-[0_0_44px_rgba(250,204,21,0.28)]" />
        </motion.div>
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
          <div className="mt-1 text-lg font-black text-emerald-50">Well done</div>
          <div className="mt-2 text-sm font-semibold leading-relaxed text-cyan-50/84">
            {breathingFact.text}
          </div>
        </motion.div>
      ) : null}
    </WellbeingShell>
  );
};

export default BreathingBloom;
