import React, { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { BOSS_ASSETS, BossPose } from '../assets/bosses';
import { BossEncounter, resolveBossPose } from '../bossMeta';

interface BossPortraitProps {
  encounter: BossEncounter;
  pose: BossPose;
  className?: string;
  compact?: boolean;
}

const BossPortrait: React.FC<BossPortraitProps> = ({ encounter, pose, className = '', compact = false }) => {
  const availablePoses = useMemo(
    () => Object.keys(BOSS_ASSETS[encounter.assetId].poses) as BossPose[],
    [encounter.assetId],
  );
  const poseSequence = useMemo(() => {
    const sequence = [pose];

    if (pose === 'neutral') {
      if (availablePoses.includes('attack')) sequence.push('attack');
      if (availablePoses.includes('happy')) sequence.push('happy');
      else if (availablePoses.includes('dazed')) sequence.push('dazed');
      sequence.push('neutral');
    } else if (pose === 'attack' && availablePoses.includes('neutral')) {
      sequence.push('neutral');
    } else if (pose === 'dazed' && availablePoses.includes('neutral')) {
      sequence.push('neutral');
    } else if (pose === 'victory' && availablePoses.includes('happy')) {
      sequence.push('happy');
    }

    return sequence.filter((item, index) => sequence.indexOf(item) === index || item === pose);
  }, [availablePoses, pose]);
  const [poseIndex, setPoseIndex] = useState(0);
  const displayedPose = poseSequence[Math.min(poseIndex, poseSequence.length - 1)] || pose;
  const image = resolveBossPose(encounter.assetId, displayedPose);

  useEffect(() => {
    setPoseIndex(0);
  }, [encounter.assetId, pose, poseSequence.length]);

  useEffect(() => {
    if (poseSequence.length <= 1) return undefined;

    const timeoutId = window.setInterval(() => {
      setPoseIndex((current) => (current + 1) % poseSequence.length);
    }, pose === 'neutral' ? 1450 : 900);

    return () => window.clearInterval(timeoutId);
  }, [pose, poseSequence]);

  return (
    <div className={`relative overflow-hidden rounded-[1.5rem] border border-white/16 bg-[linear-gradient(180deg,rgba(12,18,28,0.9),rgba(5,10,18,0.96))] shadow-[0_18px_38px_rgba(0,0,0,0.34)] ${className}`}>
      <div className={`pointer-events-none absolute inset-0 bg-gradient-to-br ${encounter.glowClass}`} />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_18%,rgba(255,255,255,0.2),rgba(255,255,255,0)_40%),linear-gradient(180deg,rgba(255,255,255,0.06),rgba(255,255,255,0)_22%,rgba(2,6,23,0.16))]" />
      <motion.div
        className="pointer-events-none absolute inset-x-5 top-0 h-12 rounded-full bg-white/12 blur-2xl"
        animate={{ opacity: [0.28, 0.6, 0.28], scaleX: [0.96, 1.08, 0.96] }}
        transition={{ duration: 3.2, repeat: Infinity, ease: 'easeInOut' }}
      />
      <div className="relative flex h-full min-h-0 items-center gap-3 p-2.5 md:p-3.5">
        <motion.div
          animate={{
            y: [0, compact ? -4 : -6, 0],
            rotate: [0, compact ? -1.5 : -2.5, 0],
            scale: [1, displayedPose === 'attack' ? 1.06 : 1.02, 1],
          }}
          transition={{ duration: compact ? 3.4 : 4.2, repeat: Infinity, ease: 'easeInOut' }}
          className="relative flex h-full min-h-[4rem] w-[4.5rem] shrink-0 items-end justify-center rounded-[1.2rem] bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.18),rgba(255,255,255,0.02))]"
        >
          <motion.div
            className="pointer-events-none absolute inset-[10%] rounded-full bg-white/14 blur-xl"
            animate={{ opacity: [0.14, 0.32, 0.14], scale: [0.92, 1.08, 0.92] }}
            transition={{ duration: 2.8, repeat: Infinity, ease: 'easeInOut' }}
          />
          <AnimatePresence mode="wait" initial={false}>
            <motion.img
              key={`${encounter.assetId}-${displayedPose}-${poseIndex}`}
              src={image}
              alt={encounter.name}
              initial={{ opacity: 0, y: 4, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -4, scale: 1.03 }}
              transition={{ duration: 0.26, ease: 'easeOut' }}
              className="relative z-10 h-full max-h-[7rem] w-full object-contain drop-shadow-[0_14px_24px_rgba(0,0,0,0.42)]"
              draggable={false}
            />
          </AnimatePresence>
        </motion.div>
        <div className="min-w-0">
          <div className={`inline-flex rounded-full border px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.24em] ${encounter.chipClass}`}>
            {encounter.title}
          </div>
          <div className="mt-1.5 truncate text-sm font-black text-white md:text-lg">{encounter.name}</div>
          <div className="mt-1 text-[10px] font-bold uppercase tracking-[0.2em] text-white/65 md:text-[11px]">
            {displayedPose === 'defeat' ? 'Boss broken' : displayedPose === 'victory' ? 'Boss dominant' : displayedPose === 'dazed' ? 'Boss staggered' : displayedPose === 'attack' ? 'Boss attacking' : 'Boss waiting'}
          </div>
        </div>
      </div>
    </div>
  );
};

export default BossPortrait;
