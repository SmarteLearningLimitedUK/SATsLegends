import React, { useEffect, useMemo, useState } from 'react';
import { motion } from 'motion/react';
import AssetIcon from '../AssetIcon';
import { StarCount } from '../../lib/progression/types';

interface AnimatedStarDisplayProps {
  stars: StarCount;
  play?: boolean;
  sizeClassName?: string;
  staggerMs?: number;
}

const useReducedMotion = () => {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setReduced(media.matches);
    update();
    media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  }, []);
  return reduced;
};

const AnimatedStarDisplay: React.FC<AnimatedStarDisplayProps> = ({
  stars,
  play = true,
  sizeClassName = 'h-10 w-10 md:h-12 md:w-12',
  staggerMs = 180,
}) => {
  const reducedMotion = useReducedMotion();
  const [revealed, setRevealed] = useState(0);

  useEffect(() => {
    if (!play) {
      setRevealed(stars);
      return;
    }
    setRevealed(0);
    const timers: number[] = [];
    const count = reducedMotion ? stars : stars;
    for (let i = 0; i < count; i += 1) {
      const delay = reducedMotion ? 0 : i * staggerMs;
      timers.push(
        window.setTimeout(() => {
          setRevealed((prev) => Math.max(prev, i + 1));
        }, delay),
      );
    }
    return () => timers.forEach((timer) => window.clearTimeout(timer));
  }, [play, reducedMotion, staggerMs, stars]);

  const starSlots = useMemo(() => [1, 2, 3], []);

  return (
    <div className="flex items-center justify-center gap-2">
      {starSlots.map((slot) => {
        const isFilled = slot <= revealed;
        const isEarned = slot <= stars;
        return (
          <motion.div
            key={`star-slot-${slot}`}
            initial={false}
            animate={{
              scale: isFilled ? [0.8, 1.15, 1] : 1,
              opacity: isEarned ? 1 : 0.35,
            }}
            transition={{ duration: reducedMotion ? 0 : 0.28, ease: 'easeOut' }}
            className={`rounded-full p-2 ${isEarned ? 'bg-amber-200/20 ring-1 ring-amber-300/60' : 'bg-white/10 ring-1 ring-white/15'}`}
          >
            <AssetIcon
              name={isEarned ? 'star' : 'starOutline'}
              className={`${sizeClassName} ${isEarned ? 'text-amber-200' : 'text-white/45'}`}
            />
          </motion.div>
        );
      })}
    </div>
  );
};

export default AnimatedStarDisplay;
