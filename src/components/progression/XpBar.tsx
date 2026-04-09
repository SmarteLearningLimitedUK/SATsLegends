import React, { useEffect, useRef, useState } from 'react';
import { motion } from 'motion/react';

export type XpSegment = {
  level: number;
  fromXp: number;
  toXp: number;
  requiredXp: number;
};

interface XpBarProps {
  segments: XpSegment[];
  play?: boolean;
  onComplete?: () => void;
  onLevelUp?: (level: number) => void;
}

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

const XpBar: React.FC<XpBarProps> = ({
  segments,
  play = true,
  onComplete,
  onLevelUp,
}) => {
  const [segmentIndex, setSegmentIndex] = useState(0);
  const [fillPercent, setFillPercent] = useState(0);
  const [displayLevel, setDisplayLevel] = useState(1);
  const [displayXp, setDisplayXp] = useState(0);
  const rafRef = useRef<number | null>(null);
  const timeoutRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      if (timeoutRef.current) window.clearTimeout(timeoutRef.current);
    };
  }, []);

  useEffect(() => {
    if (!play || segments.length === 0) return;
    setSegmentIndex(0);
  }, [play, segments.length]);

  useEffect(() => {
    if (!play || segments.length === 0) return;
    const segment = segments[segmentIndex];
    if (!segment) {
      onComplete?.();
      return;
    }

    const startPercent = segment.fromXp / segment.requiredXp;
    const endPercent = segment.toXp / segment.requiredXp;
    const delta = Math.abs(segment.toXp - segment.fromXp);
    const duration = clamp(420 + (delta / segment.requiredXp) * 680, 420, 1100);
    const start = performance.now();

    setDisplayLevel(segment.level);
    setDisplayXp(segment.fromXp);
    setFillPercent(startPercent * 100);

    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(() => {
      setFillPercent(endPercent * 100);
    });

    const tick = (now: number) => {
      const progress = clamp((now - start) / duration, 0, 1);
      const current = segment.fromXp + (segment.toXp - segment.fromXp) * progress;
      setDisplayXp(Math.round(current));
      if (progress < 1) {
        rafRef.current = requestAnimationFrame(tick);
      }
    };
    rafRef.current = requestAnimationFrame(tick);

    if (timeoutRef.current) window.clearTimeout(timeoutRef.current);
    timeoutRef.current = window.setTimeout(() => {
      setDisplayXp(segment.toXp);
      if (segment.toXp >= segment.requiredXp) {
        onLevelUp?.(segment.level + 1);
      }
      if (segmentIndex < segments.length - 1) {
        setSegmentIndex(segmentIndex + 1);
      } else {
        onComplete?.();
      }
    }, duration + 40);
  }, [onComplete, onLevelUp, play, segmentIndex, segments]);

  const currentSegment = segments[Math.min(segmentIndex, segments.length - 1)];

  return (
    <div className="flex w-full flex-col gap-2">
      <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-[0.14em] text-white/70">
        <span>Level {displayLevel}</span>
        {currentSegment ? (
          <span className="text-white/80">{displayXp}/{currentSegment.requiredXp} XP</span>
        ) : null}
      </div>
      <div className="relative h-4 w-full overflow-hidden rounded-full border border-white/10 bg-white/10">
        <motion.div
          className="absolute left-0 top-0 h-full rounded-full bg-[linear-gradient(90deg,#4ade80,#22d3ee,#60a5fa)] shadow-[0_0_18px_rgba(59,130,246,0.65)]"
          style={{ width: `${fillPercent}%` }}
          animate={{ width: `${fillPercent}%` }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
        />
      </div>
    </div>
  );
};

export default XpBar;
