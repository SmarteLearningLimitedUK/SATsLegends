import React, { useEffect, useMemo, useState } from 'react';
import { motion } from 'motion/react';
import WellbeingShell from '../WellbeingShell';
import { WellbeingActivityComponentProps } from '../types';

const feelingWords = [
  'worried',
  'frustrated',
  'tired',
  'nervous',
  'sad',
  'overwhelmed',
  'steady',
  'brave',
];

const ThoughtSort: React.FC<WellbeingActivityComponentProps> = ({ onComplete, onExit }) => {
  const [selected, setSelected] = useState<string[]>([]);
  const [released, setReleased] = useState(false);
  const [balloonRise, setBalloonRise] = useState(false);

  const balloonText = useMemo(() => selected.join(' • ') || 'let it go', [selected]);
  const message = useMemo(() => {
    if (released) return 'Watch the balloon lift your worries into the sunny sky';
    if (selected.length >= 3) return 'When you are ready, send the balloon off';
    return 'Choose a few feelings, then release the balloon when you are ready';
  }, [released, selected.length]);
  const progress = Math.min(100, (selected.length / 4) * 70 + (released ? 30 : 0));

  useEffect(() => {
    if (!released) return undefined;
    const timeout = window.setTimeout(() => {
      setBalloonRise(true);
      window.setTimeout(() => onComplete(), 1300);
    }, 220);
    return () => window.clearTimeout(timeout);
  }, [onComplete, released]);

  const toggleWord = (word: string) => {
    if (released) return;
    setSelected((current) => {
      if (current.includes(word)) {
        return current.filter((item) => item !== word);
      }
      return [...current, word].slice(0, 4);
    });
  };

  return (
    <WellbeingShell title="Worry Balloon" subtitle={message} type="Thought Reset" progress={progress} onExit={onExit}>
      <div className="relative flex flex-1 flex-col overflow-hidden px-4 pb-4 pt-4">
        <div className="absolute inset-0 bg-[linear-gradient(180deg,#7dd3fc_0%,#c7f0ff_44%,#eff8ff_100%)]" />
        <div className="absolute inset-x-0 top-0 h-[48%] bg-[radial-gradient(circle_at_18%_18%,rgba(255,255,255,0.95),transparent_12%),radial-gradient(circle_at_38%_26%,rgba(255,255,255,0.86),transparent_11%),radial-gradient(circle_at_67%_15%,rgba(255,255,255,0.92),transparent_13%),radial-gradient(circle_at_82%_24%,rgba(255,255,255,0.82),transparent_10%)]" />
        <div className="absolute inset-x-0 bottom-0 h-[26%] bg-[linear-gradient(180deg,rgba(34,197,94,0),rgba(34,197,94,0.18)_38%,rgba(21,128,61,0.42)_100%)]" />

        <div className="relative z-10 flex flex-wrap items-center justify-center gap-2">
          {feelingWords.map((word) => {
            const active = selected.includes(word);
            return (
              <motion.button
                key={word}
                type="button"
                onClick={() => toggleWord(word)}
                whileTap={{ scale: 0.96 }}
                className={`rounded-full border px-4 py-2 text-sm font-black uppercase tracking-[0.12em] transition ${
                  active
                    ? 'border-sky-100/65 bg-sky-300/28 text-slate-950'
                    : 'border-white/45 bg-white/34 text-slate-900 hover:bg-white/46'
                }`}
              >
                {word}
              </motion.button>
            );
          })}
        </div>

        <div className="relative z-10 flex min-h-0 flex-1 items-center justify-center overflow-hidden">
          <motion.div
            animate={balloonRise ? { y: [-10, -360], opacity: [1, 0], scale: [1, 1.06, 1.1] } : { y: [0, -10, 0], scale: [1, 1.03, 1] }}
            transition={balloonRise ? { duration: 1.35, ease: 'easeOut' } : { duration: 3.2, repeat: Infinity, ease: 'easeInOut' }}
            className="relative flex flex-col items-center"
          >
            <div className="relative flex h-44 w-40 items-center justify-center rounded-[48%_52%_50%_50%/56%_56%_44%_44%] border border-white/45 bg-[radial-gradient(circle_at_30%_24%,rgba(255,255,255,0.92),rgba(253,186,116,0.48)_18%,rgba(251,146,60,0.58)_46%,rgba(244,114,182,0.78)_100%)] shadow-[0_24px_40px_rgba(15,23,42,0.22)]">
              <div className="absolute inset-5 rounded-[48%_52%_50%_50%/56%_56%_44%_44%] border border-white/24" />
              <div className="relative z-10 max-w-[9rem] text-center text-base font-black leading-tight text-white drop-shadow-[0_2px_10px_rgba(2,6,23,0.36)]">
                {balloonText}
              </div>
            </div>
            <div className="h-16 w-1 rounded-full bg-slate-900/30" />
            <div className="h-4 w-4 rounded-full bg-amber-100/88 shadow-[0_0_12px_rgba(255,255,255,0.4)]" />
          </motion.div>
        </div>

        <div className="relative z-10 flex shrink-0 flex-col items-center gap-3 pb-2">
          <div className="w-full rounded-[1.35rem] border border-white/40 bg-white/34 px-4 py-3 text-center text-sm font-semibold text-slate-900 backdrop-blur-sm">
            Pick up to four feelings, then send the balloon away when you are ready.
          </div>
          <button
            type="button"
            onClick={() => setReleased(true)}
            disabled={released || selected.length === 0}
            className="ui-button-primary min-h-[3.2rem] w-full max-w-[18rem] rounded-full px-6 py-3 text-sm font-black uppercase tracking-[0.14em] disabled:cursor-not-allowed disabled:opacity-55"
          >
            {released ? 'Balloon released' : 'Send balloon'}
          </button>
        </div>
      </div>
    </WellbeingShell>
  );
};

export default ThoughtSort;
