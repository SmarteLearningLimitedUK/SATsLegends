import React, { memo, useEffect, useMemo, useRef } from 'react';
import { useReducedMotion } from 'motion/react';
import { useStaticEnemyFrame } from '../../utils/staticEnemyFrame';
import './monster-mind-actor.css';

export type MonsterMindReaction = 'idle' | 'hit' | 'taunt' | 'defeated';

export interface MonsterMindActorProps {
  src: string;
  alt?: string;
  reaction?: MonsterMindReaction;
  reactionKey?: number | string;
  className?: string;
  style?: React.CSSProperties;
}

const EMPTY_FRAME = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="1" height="1"/%3E';
const REACTIONS: Record<Exclude<MonsterMindReaction, 'idle'>, Keyframe[]> = {
  hit: [
    { transform: 'translate(0, 0) rotate(0deg) scale(1)', offset: 0 },
    { transform: 'translate(-5px, 1px) rotate(-2deg) scale(.985, 1.01)', offset: .2 },
    { transform: 'translate(2px, 0) rotate(.8deg) scale(1.006, .997)', offset: .56 },
    { transform: 'translate(0, 0) rotate(0deg) scale(1)', offset: 1 },
  ],
  taunt: [
    { transform: 'translate(0, 0) rotate(0deg) scale(1)', offset: 0 },
    { transform: 'translate(2px, 0) rotate(1.2deg) scale(1.01, .99)', offset: .4 },
    { transform: 'translate(0, 0) rotate(0deg) scale(1)', offset: 1 },
  ],
  defeated: [
    { transform: 'translate(0, 0) rotate(0deg) scale(1)' },
    { transform: 'translate(0, 4px) rotate(6deg) scale(.97)' },
  ],
};

const MonsterMindActor: React.FC<MonsterMindActorProps> = ({
  src,
  alt = 'Monster Mind',
  reaction = 'idle',
  reactionKey,
  className = '',
  style,
}) => {
  const { frame, failed } = useStaticEnemyFrame(src);
  const reducedMotion = useReducedMotion();
  const recoilRef = useRef<HTMLDivElement | null>(null);
  const timing = useMemo(() => {
    const seed = Array.from(src).reduce((value, letter) => (value * 31 + letter.charCodeAt(0)) >>> 0, 0);
    return {
      '--monster-breath-duration': `${3.6 + (seed % 7) * .1}s`,
      '--monster-sway-duration': `${5.7 + (seed % 11) * .1}s`,
      '--monster-breath-delay': `${-(seed % 19) * .13}s`,
      '--monster-sway-delay': `${-(seed % 23) * .17}s`,
    } as React.CSSProperties;
  }, [src]);

  useEffect(() => {
    const node = recoilRef.current;
    if (!node || !frame || reaction === 'idle' || reducedMotion || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return undefined;
    const animation = node.animate(REACTIONS[reaction], {
      duration: reaction === 'hit' ? 440 : reaction === 'taunt' ? 660 : 560,
      easing: 'cubic-bezier(.2,.65,.35,1)',
      fill: reaction === 'defeated' ? 'forwards' : 'none',
    });
    return () => animation.cancel();
  }, [frame, reaction, reactionKey, reducedMotion, src]);

  return (
    <div
      className={`monster-mind-actor ${className}`}
      style={{ ...timing, ...style }}
      data-monster-actor="true"
      data-monster-identity={src}
      data-monster-reaction={reaction}
      data-monster-ready={Boolean(frame)}
      data-monster-status={failed ? 'failed' : frame ? 'ready' : 'preparing'}
    >
      <div ref={recoilRef} className="monster-mind-recoil">
        <div className="monster-mind-sway">
          <div className="monster-mind-breath">
            <img src={frame ?? EMPTY_FRAME} alt={alt} draggable={false} data-monster-image="true" />
          </div>
        </div>
      </div>
    </div>
  );
};

export default memo(MonsterMindActor);
