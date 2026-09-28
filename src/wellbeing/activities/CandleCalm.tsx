import React, { useRef, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { Backpack, BookOpen, Compass, CupSoda, Shirt, Tablet, type LucideIcon } from 'lucide-react';
import WellbeingShell from '../WellbeingShell';
import { WellbeingActivityComponentProps } from '../types';
import { useWellbeingCompletion } from '../useWellbeingCompletion';

type CampItem = { id: string; label: string; x: number; y: number; icon: LucideIcon };
const campItems: CampItem[] = [
  { id: 'toy', label: 'Backpack', x: 18, y: 27, icon: Backpack },
  { id: 'book', label: 'Book', x: 39, y: 17, icon: BookOpen },
  { id: 'sock', label: 'Jacket', x: 62, y: 30, icon: Shirt },
  { id: 'cup', label: 'Cup', x: 82, y: 18, icon: CupSoda },
  { id: 'blocks', label: 'Compass', x: 18, y: 58, icon: Compass },
  { id: 'tablet', label: 'Screen', x: 82, y: 53, icon: Tablet },
];

const CandleCalm: React.FC<WellbeingActivityComponentProps> = ({ onComplete, onExit }) => {
  const [packed, setPacked] = useState<string[]>([]);
  const packedRef = useRef(new Set<string>());
  const reducedMotion = useReducedMotion();
  const { finished, finish, cancel } = useWellbeingCompletion(onComplete);
  const ready = packed.length === campItems.length;
  const packItem = (id: string) => {
    if (finished || packedRef.current.has(id)) return;
    packedRef.current.add(id);
    setPacked((current) => [...current, id]);
  };

  return (
    <WellbeingShell title="Lantern Camp" activityId="candle_calm" type="Grounding"
      subtitle="Tap the six pieces of camp gear to put them away. Then dim the lantern."
      purpose="A few small actions make space for a quiet pause." affirmation="Rest is part of the adventure."
      status={finished ? 'The camp is ready for a quiet evening' : ready ? 'Everything is packed. Dim the lantern when you are ready.' : 'Camp gear packed ' + packed.length + ' of 6'}
      progress={finished ? 100 : packed.length / (campItems.length + 1) * 100} onExit={() => { cancel(); onExit(); }}>
      <div className="wellbeing-scene" data-camp-packed={packed.length}>
        <button type="button" onClick={() => { if (ready) finish(2200); }} disabled={!ready || finished}
          className={'camp-lantern' + (ready ? ' is-ready' : '') + (finished ? ' is-finished' : '')} data-button-skin="none" aria-label="Dim the lantern">
          <svg viewBox="0 0 120 160" aria-hidden="true">
            <ellipse cx="60" cy="145" rx="35" ry="8" fill="#05253266" />
            <path d="M42 30V18Q60-3 78 18V30" fill="none" stroke="#e6c587" strokeWidth="6" />
            <path d="M29 41 40 28H80L91 41Z" fill="#7b7251" stroke="#243c43" strokeWidth="4" />
            <path d="M31 46H89L84 132H36Z" fill={finished ? '#8ba39a' : '#f3cf83'} stroke="#27414a" strokeWidth="4" />
            <path d="M43 50V127M77 50V127" stroke="#716447" strokeWidth="6" />
            <ellipse cx="60" cy="89" rx="13" ry="28" fill={finished ? '#b4bf9c' : '#fff2b9'} />
            <path d="M28 136H92V145H28Z" fill="#7f7357" stroke="#2a4047" strokeWidth="4" />
            <path d="M26 42H94V50H26Z" fill="#b4a77b" stroke="#2a4047" strokeWidth="4" />
          </svg>
          <strong>{finished ? 'Evening glow' : ready ? 'Dim the lantern' : 'Pack the camp first'}</strong>
        </button>
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
