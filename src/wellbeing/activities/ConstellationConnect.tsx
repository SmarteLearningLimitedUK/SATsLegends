import React, { useMemo, useState } from 'react';
import { motion } from 'motion/react';
import WellbeingShell from '../WellbeingShell';
import { WellbeingActivityComponentProps } from '../types';

const stars = [
  { x: 20, y: 55 },
  { x: 36, y: 35 },
  { x: 56, y: 28 },
  { x: 74, y: 44 },
  { x: 64, y: 66 },
];

const constellationFacts = [
  {
    name: 'The Lantern Path',
    fact: 'This constellation is used as a sky guide in many old sea stories.',
  },
  {
    name: 'The Grove Crown',
    fact: 'Some islanders say this pattern marks the beginning of a calm night.',
  },
  {
    name: 'The Wave Walker',
    fact: 'Constellations were often used to help travellers keep their bearings at night.',
  },
];

const ConstellationConnect: React.FC<WellbeingActivityComponentProps> = ({ onComplete, onExit }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showFact, setShowFact] = useState(false);
  const [factIndex] = useState(() => Math.floor(Math.random() * constellationFacts.length));
  const lines = useMemo(() => stars.slice(0, currentIndex), [currentIndex]);
  const constellation = constellationFacts[factIndex];

  const handleSelect = (index: number) => {
    if (index !== currentIndex) return;
    if (index === stars.length - 1) {
      setCurrentIndex(stars.length);
      setShowFact(true);
      window.setTimeout(() => onComplete(), 2200);
      return;
    }
    setCurrentIndex((value) => value + 1);
  };

  return (
    <WellbeingShell title="Constellation Connect" subtitle="Trace the stars and uncover the sky fact" type="Focus" progress={(currentIndex / stars.length) * 100} onExit={onExit}>
      <div className="relative flex flex-1 items-center justify-center overflow-hidden p-5">
        <div className="pointer-events-none absolute left-4 right-4 top-4 z-10 flex justify-center">
          <div className="rounded-full border border-cyan-100/14 bg-slate-950/35 px-4 py-2 text-center text-xs font-bold tracking-[0.14em] text-cyan-50/84 backdrop-blur-sm">
            Trace the stars in order
          </div>
        </div>
        <svg viewBox="0 0 100 100" className="h-full w-full max-w-sm overflow-visible">
          {lines.map((_, index) => {
            const from = stars[index];
            const to = stars[index + 1];
            if (!to) return null;
            return <line key={`line-${index}`} x1={from.x} y1={from.y} x2={to.x} y2={to.y} stroke="rgba(165,243,252,0.9)" strokeWidth="2.2" strokeLinecap="round" />;
          })}
          {stars.map((star, index) => (
            <g key={`star-${index}`}>
              <motion.circle cx={star.x} cy={star.y} r={currentIndex >= index ? 4.6 : 3.6} fill={currentIndex >= index ? '#fef3c7' : 'rgba(191,219,254,0.7)'} animate={{ scale: index === currentIndex ? [1, 1.08, 1] : 1 }} transition={{ duration: 1.6, repeat: Infinity }} />
              <circle
                cx={star.x}
                cy={star.y}
                r={8}
                fill="transparent"
                onPointerDown={() => handleSelect(index)}
                style={{ cursor: 'pointer' }}
              />
            </g>
          ))}
        </svg>

        {showFact ? (
          <motion.div
            initial={{ opacity: 0, y: 12, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            className="absolute bottom-5 left-1/2 z-20 w-[min(92%,28rem)] -translate-x-1/2 rounded-[1.6rem] border border-emerald-100/18 bg-[linear-gradient(180deg,rgba(6,78,59,0.82),rgba(8,47,73,0.86))] px-4 py-4 text-center shadow-[0_18px_40px_rgba(2,6,23,0.35)]"
          >
            <div className="text-[10px] font-black uppercase tracking-[0.18em] text-emerald-100/65">
              Constellation complete
            </div>
            <div className="mt-1 text-lg font-black text-emerald-50">{constellation.name}</div>
            <div className="mt-2 text-sm font-semibold leading-relaxed text-cyan-50/84">
              {constellation.fact}
            </div>
          </motion.div>
        ) : null}
      </div>
    </WellbeingShell>
  );
};

export default ConstellationConnect;
