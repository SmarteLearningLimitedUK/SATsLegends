import React, { useMemo, useState } from 'react';
import { motion } from 'motion/react';
import WellbeingShell from '../WellbeingShell';
import { WellbeingActivityComponentProps } from '../types';

type BedroomItem = {
  id: string;
  label: string;
  left: string;
  top: string;
  rotate: number;
  size?: string;
};

const clutterItems: BedroomItem[] = [
  { id: 'toy', label: 'Toy', left: '16%', top: '18%', rotate: -14, size: '3.2rem' },
  { id: 'book', label: 'Book', left: '30%', top: '28%', rotate: 8, size: '3rem' },
  { id: 'sock', label: 'Sock', left: '68%', top: '20%', rotate: 18, size: '2.7rem' },
  { id: 'cup', label: 'Cup', left: '76%', top: '42%', rotate: -10, size: '2.8rem' },
  { id: 'blocks', label: 'Blocks', left: '18%', top: '54%', rotate: 6, size: '3.4rem' },
  { id: 'tablet', label: 'Screen', left: '50%', top: '14%', rotate: -8, size: '3.1rem' },
];

const sleepFacts = [
  {
    title: 'Sleep fact',
    text: 'A tidy bedtime routine can help your brain switch off stress and settle more easily.',
  },
  {
    title: 'Sleep fact',
    text: 'Good sleep supports memory, focus, and mood the next day.',
  },
  {
    title: 'Sleep fact',
    text: 'A calm, clutter-free bedroom can make it easier to drift off and rest well.',
  },
];

const CandleCalm: React.FC<WellbeingActivityComponentProps> = ({ onComplete, onExit }) => {
  const [clearedItems, setClearedItems] = useState<string[]>([]);
  const [factIndex] = useState(() => Math.floor(Math.random() * sleepFacts.length));
  const [showFact, setShowFact] = useState(false);
  const [sleepy, setSleepy] = useState(false);

  const remainingItems = clutterItems.filter((item) => !clearedItems.includes(item.id));
  const progress = ((clearedItems.length + (sleepy ? 1 : 0)) / (clutterItems.length + 1)) * 100;
  const bedroomFact = useMemo(() => sleepFacts[factIndex], [factIndex]);

  const clearItem = (id: string) => {
    if (showFact) return;
    setClearedItems((current) => {
      if (current.includes(id)) return current;
      const next = [...current, id];
      if (next.length === clutterItems.length) {
        setSleepy(true);
      }
      return next;
    });
  };

  const handleCribTap = () => {
    if (!sleepy || showFact) return;
    setShowFact(true);
    window.setTimeout(() => onComplete(), 2200);
  };

  return (
    <WellbeingShell title="Sleepy Room" subtitle={sleepy ? 'Tap the crib to send the baby monster to sleep' : 'Clear the bedroom clutter first'} type="Grounding" progress={progress} onExit={onExit}>
      <div className="relative flex flex-1 flex-col overflow-hidden px-4 py-4">
        <div className="relative flex-1 overflow-hidden rounded-[1.8rem] border border-emerald-100/12 bg-[radial-gradient(circle_at_50%_18%,rgba(147,197,253,0.18),transparent_26%),linear-gradient(180deg,rgba(7,22,40,0.92),rgba(8,30,24,0.96))]">
          <div className="absolute inset-0 opacity-30 [background-image:radial-gradient(rgba(255,255,255,0.08)_1px,transparent_1px)] [background-size:22px_22px]" />
          <div className="absolute left-4 top-4 rounded-full border border-cyan-100/12 bg-slate-950/35 px-3 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-cyan-50/80 backdrop-blur-sm">
            Clear the clutter
          </div>

          <div className="absolute left-[50%] top-[16%] -translate-x-1/2 text-5xl">🌙</div>
          <div className="absolute bottom-[10%] left-1/2 h-24 w-[78%] -translate-x-1/2 rounded-[2rem] border border-cyan-100/14 bg-[linear-gradient(180deg,rgba(30,41,59,0.94),rgba(15,23,42,0.96))] shadow-[0_24px_50px_rgba(2,6,23,0.4)]">
            <div className="absolute left-4 top-4 h-16 w-20 rounded-t-[1.1rem] rounded-b-[0.9rem] bg-[linear-gradient(180deg,#cde7ff_0%,#94c7ff_100%)] shadow-[0_12px_24px_rgba(15,23,42,0.22)]" />
            <div className="absolute left-16 top-5 h-14 w-10 rounded-t-[1rem] rounded-b-[0.8rem] bg-[linear-gradient(180deg,#f0f9ff_0%,#c9dfff_100%)]" />
            <div className="absolute right-16 top-5 h-14 w-10 rounded-t-[1rem] rounded-b-[0.8rem] bg-[linear-gradient(180deg,#f0f9ff_0%,#c9dfff_100%)]" />
            <div className="absolute left-1/2 top-0 h-6 w-40 -translate-x-1/2 rounded-full bg-emerald-200/12 blur-xl" />
          </div>
          <div className="absolute bottom-[13%] left-1/2 w-[26%] -translate-x-1/2">
            <button
              type="button"
              onClick={handleCribTap}
              className={`relative w-full rounded-[1.4rem] border px-4 py-5 text-center shadow-[0_12px_28px_rgba(2,6,23,0.26)] transition ${
                sleepy ? 'border-emerald-100/35 bg-[linear-gradient(180deg,rgba(16,185,129,0.2),rgba(15,23,42,0.65))]' : 'border-white/12 bg-[linear-gradient(180deg,rgba(250,204,21,0.18),rgba(15,23,42,0.72))]'
              }`}
            >
              <div className="text-[10px] font-black uppercase tracking-[0.18em] text-emerald-50/70">
                Crib
              </div>
              <div className="mt-1 text-4xl">{sleepy ? '😴' : '🍼'}</div>
              <div className="mt-1 text-sm font-black text-cyan-50">Baby monster</div>
              <div className="mt-1 text-[11px] font-semibold text-cyan-50/72">
                {sleepy ? 'Tap to tuck in' : 'Clear clutter first'}
              </div>
            </button>
          </div>

          {remainingItems.map((item, index) => (
            <motion.button
              key={item.id}
              type="button"
              onClick={() => clearItem(item.id)}
              initial={{ scale: 0.9, opacity: 0, rotate: item.rotate - 8 }}
              animate={{ scale: 1, opacity: 1, rotate: item.rotate }}
              transition={{ duration: 0.25, delay: index * 0.04 }}
              className="absolute flex items-center justify-center rounded-[1.2rem] border border-white/14 bg-[linear-gradient(180deg,rgba(255,255,255,0.18),rgba(148,163,184,0.12))] text-xs font-black text-white shadow-[0_10px_20px_rgba(2,6,23,0.18)] backdrop-blur-sm"
              style={{ left: item.left, top: item.top, width: item.size, height: item.size }}
            >
              <div className="pointer-events-none text-center leading-tight">
                <div className="text-lg">🧸</div>
                <div className="text-[10px] uppercase tracking-[0.12em]">{item.label}</div>
              </div>
            </motion.button>
          ))}

          {showFact ? (
            <motion.div
              initial={{ opacity: 0, y: 12, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              className="absolute bottom-5 left-1/2 z-20 w-[min(92%,30rem)] -translate-x-1/2 rounded-[1.6rem] border border-emerald-100/18 bg-[linear-gradient(180deg,rgba(6,78,59,0.82),rgba(8,47,73,0.86))] px-4 py-4 text-center shadow-[0_18px_40px_rgba(2,6,23,0.35)]"
            >
              <div className="text-[10px] font-black uppercase tracking-[0.18em] text-emerald-100/65">
                {bedroomFact.title}
              </div>
              <div className="mt-1 text-lg font-black text-emerald-50">Good night</div>
              <div className="mt-2 text-sm font-semibold leading-relaxed text-cyan-50/84">
                {bedroomFact.text}
              </div>
            </motion.div>
          ) : null}
        </div>
      </div>
    </WellbeingShell>
  );
};

export default CandleCalm;
