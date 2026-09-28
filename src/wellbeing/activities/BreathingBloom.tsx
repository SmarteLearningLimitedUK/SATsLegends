import React, { useEffect, useState } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { Pause, Play } from 'lucide-react';
import WellbeingShell from '../WellbeingShell';
import { WellbeingActivityComponentProps } from '../types';
import { useWellbeingCompletion } from '../useWellbeingCompletion';

const phases = [
  { id: 'in', label: 'Gentle breath in', duration: 4000 },
  { id: 'out', label: 'Easy breath out', duration: 5000 },
] as const;
const totalCycles = 4;

const BreathingBloom: React.FC<WellbeingActivityComponentProps> = ({ onComplete, onExit }) => {
  const [phaseIndex, setPhaseIndex] = useState(0);
  const [cycle, setCycle] = useState(0);
  const [paused, setPaused] = useState(false);
  const reducedMotion = useReducedMotion();
  const { finished, finish, cancel } = useWellbeingCompletion(onComplete);
  const phase = phases[phaseIndex];

  useEffect(() => {
    if (paused || finished) return undefined;
    const timeout = window.setTimeout(() => {
      if (phaseIndex === phases.length - 1) {
        if (cycle === totalCycles - 1) { finish(1800); return; }
        setCycle((value) => value + 1);
        setPhaseIndex(0);
      } else setPhaseIndex((value) => value + 1);
    }, phase.duration);
    return () => window.clearTimeout(timeout);
  }, [cycle, finish, finished, paused, phase.duration, phaseIndex]);

  const progress = finished ? 100 : ((cycle * phases.length + phaseIndex) / (totalCycles * phases.length)) * 100;
  const cue = finished ? 'A moment just for you' : paused ? 'Pause as long as you like' : phase.label;

  return (
    <WellbeingShell title="Bubble Breath" activityId="breathing_bloom" type="Breathing"
      subtitle="Follow the bloom if it feels comfortable. Breathe normally or pause whenever you like."
      purpose="A gentle rhythm to focus on between adventures."
      affirmation="Your pace is enough." status={finished ? 'Four gentle cycles complete' : 'Cycle ' + (cycle + 1) + ' of ' + totalCycles}
      progress={progress} paused={paused} onExit={() => { cancel(); onExit(); }}>
      <div className="wellbeing-scene" data-breathing-phase={finished ? 'complete' : phase.id}>
        <motion.div className="wellbeing-bloom" aria-hidden="true"
          initial={false} animate={{ scale: reducedMotion || paused || finished ? 1 : phase.id === 'in' ? 1.1 : .9 }}
          transition={{ duration: reducedMotion ? 0 : paused || finished ? .3 : phase.duration / 1000, ease: 'easeInOut' }}>
          {Array.from({ length: 8 }, (_, index) => <span key={index} className="wellbeing-bloom-petal" style={{ '--petal-angle': index * 45 + 'deg' } as React.CSSProperties} />)}
          <span className="wellbeing-bloom-core" />
        </motion.div>
        <div className="wellbeing-breath-cue" role="status" aria-live="polite"><strong>{cue}</strong><span>Follow your own comfortable rhythm.</span></div>
        <div className="wellbeing-controlbar">
          <button type="button" disabled={finished} onClick={() => setPaused((value) => !value)} className="wellbeing-quiet-action" data-button-skin="none" aria-pressed={paused}>
            {paused ? <Play size={15} className="inline-block mr-2" aria-hidden="true" /> : <Pause size={15} className="inline-block mr-2" aria-hidden="true" />}
            {paused ? 'Resume breathing' : 'Pause breathing'}
          </button>
        </div>
      </div>
    </WellbeingShell>
  );
};

export default BreathingBloom;
