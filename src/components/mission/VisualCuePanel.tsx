import React from 'react';
import { motion } from 'motion/react';

type VisualCuePanelProps = {
  children: React.ReactNode;
  className?: string;
};

const cn = (...parts: Array<string | false | null | undefined>) => parts.filter(Boolean).join(' ');

const VisualCuePanel: React.FC<VisualCuePanelProps> = ({ children, className }) => (
  <div
    className={cn(
      'relative overflow-hidden rounded-[1.1rem] border border-white/10',
      'bg-[radial-gradient(circle_at_30%_20%,rgba(56,189,248,0.22),transparent_55%),radial-gradient(circle_at_80%_85%,rgba(251,191,36,0.18),transparent_60%),linear-gradient(180deg,rgba(6,16,36,0.62),rgba(2,6,23,0.74))]',
      'shadow-[0_18px_44px_rgba(2,6,23,0.42),inset_0_1px_0_rgba(255,255,255,0.12)]',
      className,
    )}
  >
    <div className="pointer-events-none absolute inset-0 opacity-25 mix-blend-screen">
      <div className="absolute -left-10 top-3 h-24 w-24 rounded-full bg-cyan-200/35 blur-[26px]" />
      <div className="absolute -right-12 bottom-6 h-28 w-28 rounded-full bg-amber-200/28 blur-[28px]" />
      <motion.div
        className="absolute inset-x-0 top-0 h-16 bg-[linear-gradient(90deg,transparent,rgba(255,255,255,0.22),transparent)]"
        animate={{ x: ['-40%', '40%'] }}
        transition={{ duration: 6.8, repeat: Infinity, ease: 'linear' }}
      />
    </div>
    <div className="relative z-10 flex h-full w-full items-center justify-center p-4">
      {children}
    </div>
  </div>
);

export default VisualCuePanel;

