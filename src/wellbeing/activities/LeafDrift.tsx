import React, { useState } from 'react';
import { motion } from 'motion/react';
import WellbeingShell from '../WellbeingShell';
import { WellbeingActivityComponentProps } from '../types';

const initialLeaves = [
  { id: 1, x: 22, y: 18 },
  { id: 2, x: 48, y: 28 },
  { id: 3, x: 66, y: 16 },
];

const LeafDrift: React.FC<WellbeingActivityComponentProps> = ({ onComplete, onExit }) => {
  const [leaves, setLeaves] = useState(initialLeaves);
  const [guided, setGuided] = useState(0);

  const guideLeaf = (id: number) => {
    if (!leaves.some((leaf) => leaf.id === id)) return;
    setLeaves((current) => current.filter((leaf) => leaf.id !== id));
    setGuided((value) => {
      const next = value + 1;
      if (next >= initialLeaves.length) window.setTimeout(() => onComplete(), 450);
      return next;
    });
  };

  return (
    <WellbeingShell title="Leaf Drift" subtitle="Guide the leaves into the glow" type="Grounding" progress={(guided / initialLeaves.length) * 100} onExit={onExit}>
      <div className="relative flex flex-1 items-center justify-center overflow-hidden p-5">
        <div className="absolute bottom-8 left-1/2 h-28 w-28 -translate-x-1/2 rounded-full bg-emerald-300/18 blur-xl" />
        <div className="absolute bottom-8 left-1/2 h-28 w-28 -translate-x-1/2 rounded-full border border-emerald-200/35" />
        {leaves.map((leaf, index) => (
          <motion.button
            key={leaf.id}
            type="button"
            onPointerDown={() => guideLeaf(leaf.id)}
            initial={{ left: `${leaf.x}%`, top: `${leaf.y}%` }}
            animate={{ y: [0, 14, 28], x: [0, (index % 2 === 0 ? 8 : -8), 0], rotate: [-8, 10, -8] }}
            transition={{ duration: 4 + index * 0.3, repeat: Infinity, ease: 'easeInOut' }}
            className="absolute flex h-14 w-10 items-center justify-center rounded-[65%_35%_65%_35%/60%_40%_60%_40%] bg-[linear-gradient(180deg,#bbf7d0_0%,#34d399_100%)] text-emerald-950 shadow-[0_8px_18px_rgba(16,185,129,0.18)]"
          >
            <span className="h-6 w-[2px] rounded-full bg-emerald-900/45" />
          </motion.button>
        ))}
      </div>
    </WellbeingShell>
  );
};

export default LeafDrift;
