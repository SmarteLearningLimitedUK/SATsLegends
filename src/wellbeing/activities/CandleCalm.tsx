import React, { useRef, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { Backpack, BookOpen, Compass, CupSoda, Shirt, Tablet, type LucideIcon } from 'lucide-react';
import WellbeingShell from '../WellbeingShell';
import { WellbeingActivityComponentProps } from '../types';
import { useWellbeingCompletion } from '../useWellbeingCompletion';

type CampItem = { id: string; label: string; x: number; y: number; icon: LucideIcon };
const campItems: CampItem[] = [
  { id: 'backpack', label: 'Backpack', x: 18, y: 27, icon: Backpack },
  { id: 'book', label: 'Book', x: 39, y: 17, icon: BookOpen },
  { id: 'jacket', label: 'Jacket', x: 62, y: 30, icon: Shirt },
  { id: 'cup', label: 'Cup', x: 82, y: 18, icon: CupSoda },
  { id: 'compass', label: 'Compass', x: 18, y: 58, icon: Compass },
  { id: 'tablet', label: 'Screen', x: 82, y: 53, icon: Tablet },
];
const focusPrompts = [
  'Notice one colour as you pack an item.',
  'Follow the outline of something in the scene.',
  'Notice where your hand meets the screen or mouse.',
  'Listen for a nearby sound, or a moment of quiet.',
  'Notice your shoulders and let them rest if you like.',
  'Look at one detail near the lantern.',
] as const;

const CandleCalm: React.FC<WellbeingActivityComponentProps> = ({ onComplete, onExit }) => {
  const [packed, setPacked] = useState<string[]>([]);
  const [brightness, setBrightness] = useState(100);
  const packedRef = useRef(new Set<string>());
  const reducedMotion = useReducedMotion();
  const { finished, finish, cancel } = useWellbeingCompletion(onComplete);
  const ready = packed.length === campItems.length;
  const packItem = (id: string) => {
    if (finished || packedRef.current.has(id)) return;
    packedRef.current.add(id);
    setPacked((current) => [...current, id]);
  };
  const dimLantern = (event: React.ChangeEvent<HTMLInputElement>) => {
    const nextBrightness = Number(event.currentTarget.value);
    setBrightness(nextBrightness);
    if (ready && nextBrightness <= 20) finish(1800);
  };

  return (
    <WellbeingShell title="Lantern Camp" activityId="candle_calm" type="Grounding"
      subtitle="Pack the six pieces of camp gear while noticing the scene, then slide the lantern light down."
      purpose="Give your attention to one small detail at a time."
      fact="Paying attention to sights, sounds, and touch is one way to practise grounding in the present."
      affirmation="Rest is part of the adventure."
      status={finished ? 'The camp is ready for a quiet evening' : ready ? `Lantern brightness ${brightness}%. Dim it to 20% or lower.` : `Camp gear packed ${packed.length} of 6`}
      progress={finished ? 100 : (packed.length + (ready ? (100 - brightness) / 100 : 0)) / (campItems.length + 1) * 100}
      onExit={() => { cancel(); onExit(); }}>
      <div className="wellbeing-scene" data-camp-packed={packed.length}>
        <div className="camp-focus" role="status" aria-live="polite">
          <span>{ready ? 'Last step · light' : `Focus ${packed.length + 1} of 6`}</span>
          <p>{ready ? 'Watch the glow soften as you slide the light down.' : focusPrompts[packed.length]}</p>
        </div>
        <div className={'camp-lantern' + (ready ? ' is-ready' : '') + (finished ? ' is-finished' : '')}
          data-lantern-brightness={brightness} style={{ '--lantern-light': brightness / 100 } as React.CSSProperties}>
          <svg viewBox="0 0 120 160" aria-hidden="true">
            <ellipse cx="60" cy="145" rx="35" ry="8" fill="#05253266" />
            <path d="M42 30V18Q60-3 78 18V30" fill="none" stroke="#e6c587" strokeWidth="6" />
            <path d="M29 41 40 28H80L91 41Z" fill="#7b7251" stroke="#243c43" strokeWidth="4" />
            <path d="M31 46H89L84 132H36Z" fill={brightness <= 20 ? '#8ba39a' : '#f3cf83'} stroke="#27414a" strokeWidth="4" />
            <path d="M43 50V127M77 50V127" stroke="#716447" strokeWidth="6" />
            <g className="camp-lantern-flame" opacity={Math.max(.2, brightness / 100)}>
              <path d="M60 115C48 106 49 94 56 81c4-8 6-14 4-20 12 12 18 27 14 39-2 8-8 13-14 15Z" fill="#ffe4a0" />
              <path d="M61 109c-6-6-5-13 1-21 6 9 6 16-1 21Z" fill="#fff9da" />
            </g>
            <path d="M28 136H92V145H28Z" fill="#7f7357" stroke="#2a4047" strokeWidth="4" />
            <path d="M26 42H94V50H26Z" fill="#b4a77b" stroke="#2a4047" strokeWidth="4" />
          </svg>
          <strong>{finished ? 'Evening glow' : ready ? 'Dim the lantern' : 'Pack the camp first'}</strong>
        </div>
        {ready ? <div className="camp-dimmer">
          <label htmlFor="camp-lantern-brightness">Lantern brightness <span>{brightness}%</span></label>
          <input id="camp-lantern-brightness" type="range" min="0" max="100" step="5" value={brightness}
            onChange={dimLantern} disabled={finished} aria-valuetext={`${brightness}% brightness`} />
          <p>Slide to 20% or lower when you are ready.</p>
        </div> : null}
        <AnimatePresence>
          {campItems.filter((item) => !packed.includes(item.id)).map((item) => {
            const Icon = item.icon;
            return <motion.button key={item.id} type="button" onClick={() => packItem(item.id)} className="camp-gear" data-button-skin="none" data-camp-item={item.id} aria-label={'Pack ' + item.label}
              style={{ left: item.x + '%', top: item.y + '%' }} initial={false} exit={reducedMotion ? { opacity: 0 } : { y: 12, opacity: 0, scale: .92 }} transition={{ duration: reducedMotion ? 0 : .26 }}>
              <Icon size={31} strokeWidth={1.7} aria-hidden="true" /><span>{item.label}</span>
            </motion.button>;
          })}
        </AnimatePresence>
      </div>
    </WellbeingShell>
  );
};

export default CandleCalm;
