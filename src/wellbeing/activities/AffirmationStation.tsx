import React, { useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import WellbeingShell from '../WellbeingShell';
import { WellbeingActivityComponentProps } from '../types';

type AffirmationBubble = {
  id: number;
  text: string;
  x: number;
  delay: number;
  duration: number;
  size: number;
};

const TOTAL_TO_POP = 8;
const STARTING_BUBBLES = 5;

const AFFIRMATIONS = [
  'I am calm',
  'I can do hard things',
  'I am strong',
  'I am brave',
  'I can try again',
  'I notice my breath',
  'I belong here',
  'I am enough',
];

const makeBubble = (id: number): AffirmationBubble => ({
  id,
  text: AFFIRMATIONS[id % AFFIRMATIONS.length],
  x: 14 + ((id * 11) % 72),
  delay: (id % 4) * 0.35,
  duration: 10.5 + (id % 5) * 0.85,
  size: 108 + (id % 4) * 14,
});

const affirmationToFeedback = (text: string): string => {
  const trimmed = text.trim();
  if (/^i am\s+/i.test(trimmed)) {
    return `Nice! ${trimmed.replace(/^i am\s+/i, 'You are ')}!`;
  }
  if (/^i can\s+/i.test(trimmed)) {
    return `Nice! ${trimmed.replace(/^i can\s+/i, 'You can ')}!`;
  }
  if (/^i notice\s+/i.test(trimmed)) {
    return `Nice! ${trimmed.replace(/^i\s+/i, 'You ')}!`;
  }
  return `Nice! ${trimmed}!`;
};

const AffirmationStation: React.FC<WellbeingActivityComponentProps> = ({ onComplete, onExit }) => {
  const [bubbles, setBubbles] = useState(() => Array.from({ length: STARTING_BUBBLES }, (_, index) => makeBubble(index)));
  const [popped, setPopped] = useState(0);
  const [nextId, setNextId] = useState(STARTING_BUBBLES);
  const [popFeedback, setPopFeedback] = useState<{ id: number; message: string } | null>(null);
  const feedbackIdRef = useRef(0);
  const feedbackTimerRef = useRef<number | null>(null);

  useEffect(() => {
    if (popped < TOTAL_TO_POP) return undefined;
    const timer = window.setTimeout(() => onComplete(), 900);
    return () => window.clearTimeout(timer);
  }, [onComplete, popped]);

  useEffect(() => () => {
    if (feedbackTimerRef.current) {
      window.clearTimeout(feedbackTimerRef.current);
      feedbackTimerRef.current = null;
    }
  }, []);

  const popBubble = (bubble: AffirmationBubble) => {
    setBubbles((current) => current.filter((candidate) => candidate.id !== bubble.id));
    setPopped((value) => value + 1);

    feedbackIdRef.current += 1;
    setPopFeedback({ id: feedbackIdRef.current, message: affirmationToFeedback(bubble.text) });
    if (feedbackTimerRef.current) {
      window.clearTimeout(feedbackTimerRef.current);
    }
    feedbackTimerRef.current = window.setTimeout(() => {
      setPopFeedback(null);
      feedbackTimerRef.current = null;
    }, 1300);

    setNextId((currentNextId) => {
      if (popped + 1 < TOTAL_TO_POP) {
        const newId = currentNextId;
        window.setTimeout(() => {
          setBubbles((current) => [...current, makeBubble(newId)]);
        }, 220);
      }
      return currentNextId + 1;
    });
  };

  const subtitle = useMemo(() => {
    if (popped >= TOTAL_TO_POP) return 'Beautiful. The whole station is glowing with calm words';
    if (popped >= 5) return 'Keep popping the affirmations as they drift by';
    return 'Pop the positive affirmations as they float upward';
  }, [popped]);

  return (
    <WellbeingShell title="Affirmation Station" subtitle={subtitle} type="Focus" progress={(popped / TOTAL_TO_POP) * 100} onExit={onExit}>
      <div
        className="relative flex flex-1 items-center justify-center overflow-hidden p-5"
      >
        <div className="absolute inset-0 bg-[linear-gradient(180deg,#7dd3fc_0%,#dbeafe_40%,#eff6ff_100%)]" />
        <div className="absolute inset-x-0 bottom-0 h-[26%] bg-[linear-gradient(180deg,rgba(34,197,94,0),rgba(34,197,94,0.18)_36%,rgba(21,128,61,0.46)_100%)]" />
        <div className="absolute inset-x-0 top-[10%] h-[26%] bg-[radial-gradient(circle_at_18%_22%,rgba(255,255,255,0.95),transparent_12%),radial-gradient(circle_at_42%_18%,rgba(255,255,255,0.88),transparent_10%),radial-gradient(circle_at_74%_22%,rgba(255,255,255,0.9),transparent_12%)]" />

        <div className="absolute left-4 top-4 rounded-full border border-white/22 bg-slate-950/22 px-3 py-1.5 text-[11px] font-black uppercase tracking-[0.18em] text-white/88">
          Affirmations popped {popped}/{TOTAL_TO_POP}
        </div>

        <AnimatePresence>
          {bubbles.map((bubble) => (
            <motion.button
              key={bubble.id}
              type="button"
              onPointerDown={() => popBubble(bubble)}
              initial={{ y: 110, opacity: 0 }}
              animate={{ y: -420, opacity: [0, 1, 1, 0.9], x: [0, 10, -8, 6, 0] }}
              exit={{ scale: 1.4, opacity: 0 }}
              transition={{ duration: bubble.duration, delay: bubble.delay, ease: 'linear' }}
              className="absolute flex -translate-x-1/2 items-center justify-center rounded-full border border-white/55 bg-[radial-gradient(circle_at_30%_24%,rgba(255,255,255,0.96),rgba(191,219,254,0.58)_26%,rgba(129,140,248,0.44)_62%,rgba(167,139,250,0.3)_100%)] px-4 text-center shadow-[0_18px_30px_rgba(59,130,246,0.22)]"
              style={{ left: `${bubble.x}%`, bottom: '-10%', width: `${bubble.size}px`, height: `${bubble.size}px` }}
              whileTap={{ scale: 0.92 }}
            >
              <span className="pointer-events-none max-w-[82%] text-sm font-black leading-tight text-slate-900">
                {bubble.text}
              </span>
            </motion.button>
          ))}
        </AnimatePresence>

        <AnimatePresence>
          {popFeedback ? (
            <motion.div
              key={popFeedback.id}
              initial={{ opacity: 0, y: 16, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.98 }}
              className="pointer-events-none absolute top-[18%] left-1/2 z-20 w-[min(92%,26rem)] -translate-x-1/2 rounded-2xl border border-amber-100/50 bg-[linear-gradient(180deg,rgba(254,240,138,0.95),rgba(250,204,21,0.92))] px-4 py-3 text-center shadow-[0_16px_34px_rgba(180,83,9,0.28)]"
            >
              <div className="text-sm font-black leading-tight text-amber-950">
                {popFeedback.message}
              </div>
            </motion.div>
          ) : null}
        </AnimatePresence>

        <div className="absolute bottom-4 left-1/2 w-[min(92%,32rem)] -translate-x-1/2 rounded-[1.5rem] border border-white/45 bg-white/36 px-4 py-4 text-center shadow-[0_18px_40px_rgba(2,6,23,0.16)] backdrop-blur-md">
          <div className="text-[10px] font-black uppercase tracking-[0.18em] text-sky-900/58">Calm music on</div>
          <div className="mt-2 text-sm font-semibold leading-relaxed text-slate-900/82">
            Tap an affirmation to pop it.
          </div>
        </div>
      </div>
    </WellbeingShell>
  );
};

export default AffirmationStation;
