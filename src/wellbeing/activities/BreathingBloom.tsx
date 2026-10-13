import React, { useEffect, useState } from 'react';
import { useReducedMotion } from 'motion/react';
import { Pause, Play } from 'lucide-react';
import WellbeingShell from '../WellbeingShell';
import { WellbeingActivityComponentProps } from '../types';
import { useWellbeingCompletion } from '../useWellbeingCompletion';

const paces = [
  { id: 'easy', label: 'Easy', inMs: 3000, outMs: 4000 },
  { id: 'steady', label: 'Steady', inMs: 4000, outMs: 5000 },
  { id: 'unhurried', label: 'Unhurried', inMs: 5000, outMs: 6000 },
] as const;
const totalCycles = 4;
const flowers = [
  { x: 50, y: 44, size: 1, hue: 160 },
  { x: 27, y: 57, size: .7, hue: 185 },
  { x: 74, y: 53, size: .76, hue: 320 },
  { x: 12, y: 34, size: .53, hue: 220 },
  { x: 89, y: 31, size: .57, hue: 35 },
];
type BreathStep = 'ready' | 'in' | 'out' | 'checkin';

const BreathingBloom: React.FC<WellbeingActivityComponentProps> = ({ onComplete, onExit }) => {
  const [paceId, setPaceId] = useState<(typeof paces)[number]['id']>('steady');
  const [step, setStep] = useState<BreathStep>('ready');
  const [completedCycles, setCompletedCycles] = useState(0);
  const [remainingMs, setRemainingMs] = useState(0);
  const [paused, setPaused] = useState(false);
  const reducedMotion = useReducedMotion();
  const { finished, finish, cancel } = useWellbeingCompletion(onComplete);
  const pace = paces.find((option) => option.id === paceId) ?? paces[1];
  const running = step === 'in' || step === 'out';

  useEffect(() => {
    if (!running || paused || finished) return undefined;
    let previous = performance.now();
    const interval = window.setInterval(() => {
      const now = performance.now();
      const elapsed = Math.min(100, now - previous);
      previous = now;
      if (document.hidden) return;
      setRemainingMs((current) => Math.max(0, current - elapsed));
    }, 50);
    return () => window.clearInterval(interval);
  }, [finished, paused, running]);

  useEffect(() => {
    if (remainingMs > 0 || paused || finished) return;
    if (step === 'in') {
      setRemainingMs(pace.outMs);
      setStep('out');
    } else if (step === 'out') {
      setCompletedCycles((current) => current + 1);
      setStep('checkin');
    }
  }, [finished, pace.outMs, paused, remainingMs, step]);

  const startCycle = () => {
    if (finished || running || completedCycles >= totalCycles) return;
    setRemainingMs(pace.inMs);
    setPaused(false);
    setStep('in');
  };
  const progressWithinCycle = step === 'in'
    ? (1 - remainingMs / pace.inMs) * .5
    : step === 'out' ? .5 + (1 - remainingMs / pace.outMs) * .5 : 0;
  const progress = finished ? 100 : (completedCycles + progressWithinCycle) / totalCycles * 100;
  const bloomScale = reducedMotion ? 1 : step === 'in'
    ? .9 + .22 * (1 - remainingMs / pace.inMs)
    : step === 'out' ? 1.12 - .22 * (1 - remainingMs / pace.outMs) : .9;
  const cue = finished ? 'Your reset is complete'
    : paused ? 'Pause for as long as you need'
      : step === 'in' ? 'Breathe in, if comfortable'
        : step === 'out' ? 'Breathe out, gently'
          : step === 'checkin' ? 'Notice how you feel now'
            : 'Choose a rhythm to begin';
  const status = finished ? 'Four cycles complete'
    : completedCycles >= totalCycles ? 'Four breaths complete. Finish when ready.'
      : step === 'checkin' ? `Cycle ${completedCycles} of ${totalCycles} complete. Continue when ready.`
      : running ? `Cycle ${completedCycles + 1} of ${totalCycles}` : 'Start whenever you are ready';

  return (
    <WellbeingShell title="Breath Bloom" activityId="breathing_bloom" type="Breathing"
      subtitle="Choose a comfortable pace. Begin each breath when you are ready."
      purpose="Let your garden grow with each completed guided breath."
      fact="A longer, gentle exhale can help some people feel more settled. Never force a breath or hold it."
      affirmation="Your pace is enough." status={status} progress={progress} paused={paused}
      onExit={() => { cancel(); onExit(); }}>
      <div className="wellbeing-scene" data-breathing-phase={finished ? 'complete' : step}>
        <div className="wellbeing-pace-picker" role="group" aria-label="Choose a comfortable visual pace">
          <span>Visual pace</span>
          <div className="wellbeing-pace-options">
            {paces.map((option) => <button key={option.id} type="button" className="wellbeing-pace-option"
              data-button-skin="none" aria-pressed={paceId === option.id} disabled={running || finished || completedCycles >= totalCycles}
              onClick={() => setPaceId(option.id)}>
              <strong>{option.label}</strong><span>{option.inMs / 1000}s in · {option.outMs / 1000}s out</span>
            </button>)}
          </div>
        </div>
        <div className="wellbeing-bloom-garden" aria-hidden="true" data-bloom-flower-count={Math.min(flowers.length, completedCycles + 1)} style={{ '--bloom-scale': bloomScale } as React.CSSProperties}>
          {flowers.slice(0, completedCycles + 1).map((flower, flowerIndex) => <div key={flowerIndex} className="wellbeing-garden-flower"
            data-bloom-flower={flowerIndex + 1} style={{ left: `${flower.x}%`, top: `${flower.y}%`, '--flower-size': flower.size, '--flower-hue': flower.hue } as React.CSSProperties}>
            <span className="wellbeing-flower-stem"/>
            <div className="wellbeing-bloom" style={{ transform: `scale(${bloomScale})` }}>
              {Array.from({ length: 8 }, (_, index) => <span key={index} className="wellbeing-bloom-petal" style={{ '--petal-angle': index * 45 + 'deg' } as React.CSSProperties}/>)}
              <span className="wellbeing-bloom-core"/>
            </div>
          </div>)}
        </div>
        <div className="wellbeing-breath-cue" role="status" aria-live="polite">
          <strong>{cue}</strong><span>{completedCycles >= totalCycles ? 'Take a moment to enjoy the garden you have grown.' : step === 'checkin' ? 'No right answer. Take a moment before the next cycle.' : 'The rhythm is only a guide; comfort comes first.'}</span>
        </div>
        <div className="wellbeing-controlbar wellbeing-breath-actions">
          {running ? <button type="button" onClick={() => setPaused((value) => !value)} className="wellbeing-quiet-action"
            data-button-skin="none" aria-pressed={paused}>
            {paused ? <Play size={16} aria-hidden="true" /> : <Pause size={16} aria-hidden="true" />}
            {paused ? 'Resume' : 'Pause'}
          </button> : !finished ? <button type="button" className="wellbeing-action" data-button-skin="none"
            onClick={completedCycles >= totalCycles ? () => finish(1200) : startCycle}>
            {completedCycles >= totalCycles ? 'Finish reset' : step === 'ready' ? 'Begin first cycle' : 'Begin next cycle'}
          </button> : null}
        </div>
      </div>
    </WellbeingShell>
  );
};

export default BreathingBloom;
