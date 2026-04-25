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

const AFFIRMATIONS = [
  'I am calm',
  'I can do hard things',
  'I am learning every day',
  'I can take my time',
  'I am brave',
  'I can try again',
  'I am growing stronger',
  'I notice my breath',
  'I can start small',
  'I belong here',
  'I am enough',
  'I can reset and continue',
];

const makeBubble = (id: number): AffirmationBubble => ({
  id,
  text: AFFIRMATIONS[id % AFFIRMATIONS.length],
  x: 14 + ((id * 11) % 72),
  delay: (id % 4) * 0.35,
  duration: 6.8 + (id % 5) * 0.45,
  size: 108 + (id % 4) * 14,
});

const createAmbientLoop = () => {
  if (typeof window === 'undefined') return null;
  const Ctor = window.AudioContext || (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctor) return null;

  const context = new Ctor();
  const master = context.createGain();
  master.gain.value = 0.04;
  master.connect(context.destination);

  const notes = [261.63, 329.63, 392.0, 523.25];
  let noteIndex = 0;

  const playNote = () => {
    const osc = context.createOscillator();
    const gain = context.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(notes[noteIndex % notes.length], context.currentTime);
    gain.gain.setValueAtTime(0.0001, context.currentTime);
    gain.gain.linearRampToValueAtTime(0.08, context.currentTime + 0.18);
    gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + 1.6);
    osc.connect(gain);
    gain.connect(master);
    osc.start();
    osc.stop(context.currentTime + 1.7);
    noteIndex += 1;
  };

  playNote();
  const interval = window.setInterval(playNote, 1400);

  return {
    resume: () => {
      if (context.state === 'suspended') void context.resume().catch(() => {});
    },
    stop: () => {
      window.clearInterval(interval);
      void context.close().catch(() => {});
    },
  };
};

const AffirmationStation: React.FC<WellbeingActivityComponentProps> = ({ onComplete, onExit }) => {
  const [bubbles, setBubbles] = useState(() => Array.from({ length: 8 }, (_, index) => makeBubble(index)));
  const [popped, setPopped] = useState(0);
  const [nextId, setNextId] = useState(8);
  const audioRef = useRef<ReturnType<typeof createAmbientLoop> | null>(null);

  useEffect(() => {
    const audio = createAmbientLoop();
    audioRef.current = audio;
    audio?.resume();
    return () => {
      audio?.stop();
      audioRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (popped < 10) return undefined;
    const timer = window.setTimeout(() => onComplete(), 900);
    return () => window.clearTimeout(timer);
  }, [onComplete, popped]);

  const popBubble = (id: number) => {
    setBubbles((current) => current.filter((bubble) => bubble.id !== id));
    setPopped((value) => value + 1);
    if (popped + 1 < 10) {
      const newId = nextId;
      setNextId((value) => value + 1);
      window.setTimeout(() => {
        setBubbles((current) => [...current, makeBubble(newId)]);
      }, 220);
    }
  };

  const subtitle = useMemo(() => {
    if (popped >= 10) return 'Beautiful. The whole station is glowing with calm words';
    if (popped >= 6) return 'Keep popping the affirmations as they drift by';
    return 'Pop the positive affirmations as they float upward';
  }, [popped]);

  return (
    <WellbeingShell title="Affirmation Station" subtitle={subtitle} type="Focus" progress={(popped / 10) * 100} onExit={onExit}>
      <div
        className="relative flex flex-1 items-center justify-center overflow-hidden p-5"
        onPointerDown={() => audioRef.current?.resume()}
      >
        <div className="absolute inset-0 bg-[linear-gradient(180deg,#7dd3fc_0%,#dbeafe_40%,#eff6ff_100%)]" />
        <div className="absolute inset-x-0 bottom-0 h-[26%] bg-[linear-gradient(180deg,rgba(34,197,94,0),rgba(34,197,94,0.18)_36%,rgba(21,128,61,0.46)_100%)]" />
        <div className="absolute inset-x-0 top-[10%] h-[26%] bg-[radial-gradient(circle_at_18%_22%,rgba(255,255,255,0.95),transparent_12%),radial-gradient(circle_at_42%_18%,rgba(255,255,255,0.88),transparent_10%),radial-gradient(circle_at_74%_22%,rgba(255,255,255,0.9),transparent_12%)]" />

        <div className="absolute left-4 top-4 rounded-full border border-white/22 bg-slate-950/22 px-3 py-1.5 text-[11px] font-black uppercase tracking-[0.18em] text-white/88">
          Affirmations popped {popped}/10
        </div>

        <AnimatePresence>
          {bubbles.map((bubble) => (
            <motion.button
              key={bubble.id}
              type="button"
              onPointerDown={() => popBubble(bubble.id)}
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

        <div className="absolute bottom-4 left-1/2 w-[min(92%,32rem)] -translate-x-1/2 rounded-[1.5rem] border border-white/45 bg-white/36 px-4 py-4 text-center shadow-[0_18px_40px_rgba(2,6,23,0.16)] backdrop-blur-md">
          <div className="text-[10px] font-black uppercase tracking-[0.18em] text-sky-900/58">Calm music on</div>
          <div className="mt-2 text-sm font-semibold leading-relaxed text-slate-900/82">
            Tap each affirmation bubble as it floats upward, just like a calm version of Prime Pop.
          </div>
        </div>
      </div>
    </WellbeingShell>
  );
};

export default AffirmationStation;
