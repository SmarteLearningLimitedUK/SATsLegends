import React, { useMemo, useState } from 'react';
import { motion } from 'motion/react';
import leaf15 from '../../assets/calm/leaves/15.png';
import leaf16 from '../../assets/calm/leaves/16.png';
import leaf17 from '../../assets/calm/leaves/17.png';
import leaf18 from '../../assets/calm/leaves/18.png';
import leaf19 from '../../assets/calm/leaves/19.png';
import leaf20 from '../../assets/calm/leaves/20.png';
import leaf21 from '../../assets/calm/leaves/21.png';
import WellbeingShell from '../WellbeingShell';
import { WellbeingActivityComponentProps } from '../types';

type LeafNode = {
  id: number;
  x: number;
  y: number;
  src: string;
  size: number;
  rotation: number;
};

const LEAF_ASSETS = [leaf15, leaf16, leaf17, leaf18, leaf19, leaf20, leaf21];

const INITIAL_LEAVES: LeafNode[] = [
  { id: 1, x: 18, y: 18, src: leaf15, size: 62, rotation: -12 },
  { id: 2, x: 38, y: 26, src: leaf16, size: 58, rotation: 16 },
  { id: 3, x: 62, y: 17, src: leaf17, size: 64, rotation: -8 },
  { id: 4, x: 78, y: 30, src: leaf18, size: 60, rotation: 10 },
  { id: 5, x: 28, y: 48, src: leaf19, size: 70, rotation: -18 },
  { id: 6, x: 72, y: 58, src: leaf20, size: 66, rotation: 14 },
  { id: 7, x: 48, y: 64, src: leaf21, size: 68, rotation: -10 },
];

const LeafDrift: React.FC<WellbeingActivityComponentProps> = ({ onComplete, onExit }) => {
  const [leaves, setLeaves] = useState(INITIAL_LEAVES);
  const [guided, setGuided] = useState(0);

  const message = useMemo(() => {
    if (guided >= INITIAL_LEAVES.length) return 'The leaves have settled into the golden glow';
    if (guided >= 4) return 'Lovely. A few more leaves and the grove will feel still';
    return 'Guide each leaf into the warm glow at the bottom of the grove';
  }, [guided]);

  const guideLeaf = (id: number) => {
    if (!leaves.some((leaf) => leaf.id === id)) return;
    setLeaves((current) => current.filter((leaf) => leaf.id !== id));
    setGuided((value) => {
      const next = value + 1;
      if (next >= INITIAL_LEAVES.length) {
        window.setTimeout(() => onComplete(), 700);
      }
      return next;
    });
  };

  return (
    <WellbeingShell title="Leaf Drift" subtitle={message} type="Grounding" progress={(guided / INITIAL_LEAVES.length) * 100} onExit={onExit}>
      <div className="relative flex flex-1 items-center justify-center overflow-hidden p-5">
        <div className="absolute inset-0 bg-[linear-gradient(180deg,#89d7ff_0%,#dff6ff_40%,#fef3c7_100%)]" />
        <div className="absolute inset-x-0 top-0 h-[44%] bg-[radial-gradient(circle_at_20%_18%,rgba(255,255,255,0.9),transparent_14%),radial-gradient(circle_at_62%_14%,rgba(255,255,255,0.85),transparent_12%),radial-gradient(circle_at_84%_24%,rgba(255,255,255,0.82),transparent_10%)]" />
        <div className="absolute inset-x-0 bottom-0 h-[38%] bg-[linear-gradient(180deg,rgba(58,123,54,0),rgba(58,123,54,0.2)_28%,rgba(58,123,54,0.55)_70%,rgba(33,78,36,0.82)_100%)]" />
        <div className="absolute bottom-[9%] left-1/2 h-36 w-36 -translate-x-1/2 rounded-full bg-amber-200/45 blur-2xl" />
        <div className="absolute bottom-[10%] left-1/2 h-32 w-32 -translate-x-1/2 rounded-full border border-amber-100/55 bg-[radial-gradient(circle,rgba(255,251,235,0.86),rgba(253,224,71,0.38)_56%,rgba(250,204,21,0.04)_100%)]" />

        {Array.from({ length: 10 }).map((_, index) => (
          <motion.span
            key={`leaf-particle-${index}`}
            className="absolute rounded-full bg-amber-100/65"
            style={{
              left: `${12 + (index * 8) % 76}%`,
              top: `${10 + (index * 9) % 72}%`,
              width: `${2 + (index % 3)}px`,
              height: `${2 + (index % 3)}px`,
            }}
            animate={{ y: [0, 14, 30], opacity: [0.2, 0.85, 0], scale: [0.9, 1.1, 0.8] }}
            transition={{ duration: 3.8 + (index % 4) * 0.35, repeat: Infinity, ease: 'easeInOut' }}
          />
        ))}

        {leaves.map((leaf, index) => (
          <motion.button
            key={leaf.id}
            type="button"
            onPointerDown={() => guideLeaf(leaf.id)}
            className="absolute -translate-x-1/2 -translate-y-1/2"
            style={{ left: `${leaf.x}%`, top: `${leaf.y}%`, width: `${leaf.size}px` }}
            animate={{
              y: [0, 20, 44],
              x: [0, index % 2 === 0 ? 18 : -16, 0],
              rotate: [leaf.rotation, leaf.rotation + 18, leaf.rotation - 8],
            }}
            transition={{ duration: 4.5 + index * 0.24, repeat: Infinity, ease: 'easeInOut' }}
            whileTap={{ scale: 0.92 }}
          >
            <img src={leaf.src} alt="" className="pointer-events-none block w-full select-none drop-shadow-[0_12px_14px_rgba(76,29,149,0.16)]" draggable={false} />
          </motion.button>
        ))}

        <div className="absolute left-4 top-4 rounded-full border border-white/20 bg-slate-950/25 px-3 py-1.5 text-[11px] font-black uppercase tracking-[0.18em] text-white/88">
          Leaves settled {guided}/{INITIAL_LEAVES.length}
        </div>

        <div className="absolute bottom-4 left-1/2 w-[min(92%,34rem)] -translate-x-1/2 rounded-[1.4rem] border border-white/12 bg-slate-950/22 px-4 py-3 text-center text-sm font-semibold text-slate-900 shadow-[0_12px_28px_rgba(255,255,255,0.12)] backdrop-blur-md">
          Tap the drifting leaves and guide them gently into the golden resting place.
        </div>
      </div>
    </WellbeingShell>
  );
};

export default LeafDrift;
