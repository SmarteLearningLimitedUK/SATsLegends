import React, { useMemo, useState } from 'react';
import { motion } from 'motion/react';
import WellbeingShell from '../WellbeingShell';
import { WellbeingActivityComponentProps } from '../types';

const thoughts = [
  { text: 'I might get it wrong', target: 'let_go' as const },
  { text: 'I can try one step at a time', target: 'keep' as const },
  { text: 'It is okay to take a breath', target: 'keep' as const },
  { text: 'One hard question does not ruin the whole test', target: 'keep' as const },
];

const ThoughtSort: React.FC<WellbeingActivityComponentProps> = ({ onComplete, onExit }) => {
  const [index, setIndex] = useState(0);
  const [message, setMessage] = useState('Sort each thought gently');
  const thought = thoughts[index];
  const progress = (index / thoughts.length) * 100;

  const handleDrop = (target: 'let_go' | 'keep') => {
    if (!thought) return;
    const isMatch = thought.target === target;
    setMessage(isMatch ? 'That helps' : 'Try that one again gently');
    if (!isMatch) return;
    if (index === thoughts.length - 1) {
      window.setTimeout(() => onComplete(), 420);
      setIndex(thoughts.length);
      return;
    }
    setIndex((value) => value + 1);
  };

  const visibleThought = useMemo(() => thought, [thought]);

  return (
    <WellbeingShell title="Thought Sort" subtitle={message} type="Thought Reset" progress={progress} onExit={onExit}>
      <div className="flex flex-1 flex-col items-center justify-center gap-5 px-5 py-4">
        {visibleThought ? (
          <motion.div
            key={visibleThought.text}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-full rounded-[1.7rem] border border-cyan-100/16 bg-[linear-gradient(180deg,rgba(30,64,175,0.2),rgba(14,30,57,0.5))] px-5 py-6 text-center text-lg font-black text-cyan-50 shadow-[0_14px_28px_rgba(2,6,23,0.22)]"
          >
            {visibleThought.text}
          </motion.div>
        ) : null}

        <div className="grid w-full grid-cols-2 gap-3">
          <button type="button" onClick={() => handleDrop('let_go')} className="rounded-[1.5rem] border border-cyan-100/14 bg-[linear-gradient(180deg,rgba(103,232,249,0.12),rgba(14,116,144,0.18))] px-4 py-5 text-center text-sm font-black uppercase tracking-[0.14em] text-cyan-50">
            Let Go Cloud
          </button>
          <button type="button" onClick={() => handleDrop('keep')} className="rounded-[1.5rem] border border-emerald-100/14 bg-[linear-gradient(180deg,rgba(110,231,183,0.16),rgba(6,95,70,0.18))] px-4 py-5 text-center text-sm font-black uppercase tracking-[0.14em] text-emerald-50">
            Keep Box
          </button>
        </div>
      </div>
    </WellbeingShell>
  );
};

export default ThoughtSort;
