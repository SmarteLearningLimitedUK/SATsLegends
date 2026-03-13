import React, { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { AnimationState, AvatarData } from '../types';

interface AnimatedAvatarProps {
  avatar?: AvatarData;
  pose?: AnimationState;
  className?: string;
  imageClassName?: string;
  alt?: string;
  frameDurationMs?: number;
  floating?: boolean;
}

const POSE_FALLBACKS: Partial<Record<AnimationState, AnimationState[]>> = {
  idle: ['thinking', 'victory'],
  attack: ['special', 'idle'],
  hit: ['sad', 'idle'],
  victory: ['idle'],
  sad: ['hit', 'idle'],
  sleeping: ['idle'],
  thinking: ['idle'],
  special: ['attack', 'idle'],
};

const resolveFrames = (avatar?: AvatarData, pose: AnimationState = 'idle'): string[] => {
  if (!avatar) return [];

  const states = Array.from(new Set<AnimationState>([pose, ...(POSE_FALLBACKS[pose] || []), 'idle']));
  const poseFrames = states.flatMap(state => avatar.poses?.[state] || []);

  if (poseFrames.length > 0) {
    return poseFrames;
  }

  return [avatar.portrait || avatar.image].filter((frame): frame is string => Boolean(frame));
};

const AnimatedAvatar: React.FC<AnimatedAvatarProps> = ({
  avatar,
  pose = 'idle',
  className = '',
  imageClassName = '',
  alt,
  frameDurationMs = 1400,
  floating = true,
}) => {
  const frames = useMemo(() => resolveFrames(avatar, pose as AnimationState), [avatar, pose]);
  const [frameIndex, setFrameIndex] = useState(0);

  useEffect(() => {
    setFrameIndex(0);
  }, [avatar?.id, pose, frames.length]);

  useEffect(() => {
    if (frames.length <= 1) return undefined;

    const intervalId = window.setInterval(() => {
      setFrameIndex(current => (current + 1) % frames.length);
    }, frameDurationMs);

    return () => window.clearInterval(intervalId);
  }, [frameDurationMs, frames]);

  const activeFrame = frames[frameIndex];

  if (!avatar || !activeFrame) {
    return <div className={className} />;
  }

  return (
    <motion.div
      className={`relative overflow-visible ${className}`.trim()}
      animate={
        floating
          ? { y: [0, -5, -2, 0], x: [0, 1, 0, -1, 0], scale: [1, 1.018, 1.012, 1] }
          : { y: [0, -1.5, 0], scale: [1, 1.01, 1] }
      }
      transition={
        floating
          ? { duration: 4.8, repeat: Infinity, ease: 'easeInOut' }
          : { duration: 4.4, repeat: Infinity, ease: 'easeInOut' }
      }
    >
      <motion.div
        className="pointer-events-none absolute inset-[14%] rounded-full bg-white/20 blur-xl"
        animate={{ opacity: [0.12, 0.28, 0.12], scale: [0.94, 1.08, 0.94] }}
        transition={{ duration: 3.8, repeat: Infinity, ease: 'easeInOut' }}
      />
      <AnimatePresence initial={false} mode="wait">
        <motion.img
          key={`${avatar.id}-${pose}-${frameIndex}`}
          src={activeFrame}
          alt={alt || avatar.name}
          initial={{ opacity: 0, scale: 0.94, y: 4 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 1.03, y: -4 }}
          transition={{ duration: 0.28, ease: 'easeOut' }}
          className={`relative z-10 h-full w-full object-contain drop-shadow-[0_10px_18px_rgba(0,0,0,0.24)] ${imageClassName}`.trim()}
          draggable={false}
        />
      </AnimatePresence>
    </motion.div>
  );
};

export default AnimatedAvatar;
