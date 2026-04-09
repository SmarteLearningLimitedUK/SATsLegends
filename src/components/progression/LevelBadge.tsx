import React from 'react';
import { motion } from 'motion/react';

interface LevelBadgeProps {
  level: number;
  highlight?: boolean;
}

const LevelBadge: React.FC<LevelBadgeProps> = ({ level, highlight }) => (
  <motion.div
    animate={highlight ? { scale: [1, 1.15, 1], boxShadow: '0 0 18px rgba(251,191,36,0.75)' } : {}}
    transition={{ duration: 0.5, ease: 'easeOut' }}
    className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-black uppercase tracking-[0.16em] ${highlight ? 'border-amber-200/60 bg-amber-300/20 text-amber-100' : 'border-white/20 bg-white/10 text-white/80'}`}
  >
    Level {level}
  </motion.div>
);

export default LevelBadge;
