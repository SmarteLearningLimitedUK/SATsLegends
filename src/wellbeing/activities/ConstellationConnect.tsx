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

const ConstellationConnect: React.FC<WellbeingActivityComponentProps> = ({ onComplete, onExit }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const lines = useMemo(() => stars.slice(0, currentIndex), [currentIndex]);

  const handleSelect = (index: number) => {
    if (index !== currentIndex) return;
    if (index === stars.length - 1) {
      setCurrentIndex(stars.length);
      window.setTimeout(() => onComplete(), 500);
      return;
    }
    setCurrentIndex((value) => value + 1);
  };

  return (
    <WellbeingShell title="Constellation Connect" subtitle="Trace the stars in order" type="Focus" progress={(currentIndex / stars.length) * 100} onExit={onExit}>
      <div className="relative flex flex-1 items-center justify-center overflow-hidden p-5">
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
      </div>
    </WellbeingShell>
  );
};

export default ConstellationConnect;
