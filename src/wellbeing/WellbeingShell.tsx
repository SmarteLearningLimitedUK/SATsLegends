import React from 'react';
import { motion } from 'motion/react';
import { Sparkles } from 'lucide-react';

interface WellbeingShellProps {
  title: string;
  subtitle?: string;
  type?: string;
  progress?: number;
  onExit: () => void;
  children: React.ReactNode;
}

const WellbeingShell: React.FC<WellbeingShellProps> = ({ title, subtitle, type, progress, onExit, children }) => (
  <div className="relative flex h-full min-h-0 w-full flex-col overflow-hidden bg-[radial-gradient(circle_at_top,rgba(123,211,255,0.2),transparent_34%),linear-gradient(180deg,#061326_0%,#0a2043_48%,#0c1f39_100%)] text-white">
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      <motion.div
        className="absolute left-[12%] top-[10%] h-24 w-24 rounded-full bg-cyan-300/12 blur-3xl"
        animate={{ y: [0, -10, 0], opacity: [0.35, 0.7, 0.35] }}
        transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.div
        className="absolute right-[8%] top-[22%] h-20 w-20 rounded-full bg-emerald-300/10 blur-3xl"
        animate={{ y: [0, 12, 0], opacity: [0.25, 0.55, 0.25] }}
        transition={{ duration: 7.5, repeat: Infinity, ease: 'easeInOut' }}
      />
      {Array.from({ length: 9 }).map((_, index) => (
        <motion.span
          key={`wellbeing-particle-${index}`}
          className="absolute h-1.5 w-1.5 rounded-full bg-white/40"
          style={{ left: `${12 + index * 9}%`, top: `${18 + (index % 4) * 16}%` }}
          animate={{ y: [0, -10, 0], opacity: [0.15, 0.6, 0.15], scale: [0.8, 1.2, 0.8] }}
          transition={{ duration: 4.8 + index * 0.24, delay: index * 0.18, repeat: Infinity, ease: 'easeInOut' }}
        />
      ))}
    </div>

    <div className="relative z-10 flex items-center justify-between gap-3 px-4 pb-3 pt-[calc(env(safe-area-inset-top)+0.7rem)]">
      <button
        type="button"
        onClick={onExit}
        className="ui-icon-button inline-flex h-11 w-11 items-center justify-center text-white"
        aria-label="Exit calm activity"
      >
        <span className="text-lg font-black">×</span>
      </button>

      <div className="flex-1 text-center">
        {type ? (
          <div className="inline-flex items-center gap-1 rounded-full border border-cyan-100/25 bg-cyan-400/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-cyan-100/85">
            <Sparkles className="h-3 w-3" />
            {type}
          </div>
        ) : null}
        <div className="mt-1 text-2xl font-black tracking-tight text-cyan-50">{title}</div>
        {subtitle ? <div className="mt-1 text-sm font-semibold text-cyan-100/78">{subtitle}</div> : null}
      </div>

      <div className="h-11 w-11" aria-hidden />
    </div>

    {typeof progress === 'number' ? (
      <div className="relative z-10 px-4 pb-2">
        <div className="h-2 overflow-hidden rounded-full border border-white/15 bg-slate-950/45">
          <motion.div
            className="h-full rounded-full bg-[linear-gradient(90deg,#8ff7da_0%,#7dd3fc_55%,#c4b5fd_100%)]"
            animate={{ width: `${Math.max(0, Math.min(100, progress))}%` }}
            transition={{ duration: 0.35, ease: 'easeOut' }}
          />
        </div>
      </div>
    ) : null}

    <div className="relative z-10 min-h-0 flex-1 px-4 pb-[calc(env(safe-area-inset-bottom)+1rem)]">
      <div className="flex h-full min-h-0 flex-col overflow-hidden rounded-[1.9rem] border border-cyan-100/14 bg-[linear-gradient(180deg,rgba(13,33,65,0.68),rgba(8,20,42,0.76))] shadow-[0_20px_40px_rgba(2,6,23,0.32)] backdrop-blur-sm">
        {children}
      </div>
    </div>
  </div>
);

export default WellbeingShell;

