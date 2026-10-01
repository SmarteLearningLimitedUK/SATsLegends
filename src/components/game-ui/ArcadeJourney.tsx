import React from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { useTrimmedImageSource } from '../../utils/trimTransparentImage';
import { AVATARS } from '../../constants';
import './arcade-amendments.css';

interface Props {
  kind: 'bridge' | 'vault' | 'power' | 'expedition';
  completed: number;
  total: number;
  avatarId?: string;
  danger?: boolean;
}

/** A view of actual puzzle progress: the world follows the learner's journey. */
export default function ArcadeJourney({ kind, completed, total, avatarId, danger = false }: Props) {
  const reduced = useReducedMotion();
  const progress = Math.min(1, Math.max(0, completed / Math.max(1, total)));
  const avatar = AVATARS.find((entry) => entry.id === avatarId) ?? AVATARS[0];
  const heroImage = useTrimmedImageSource(avatar.image);
  const labels = { bridge: 'Forge the lava crossing', vault: 'Unlock the escape route', power: 'Restore island power', expedition: 'Treasure expedition' };
  return (
    <div className={`arcade-journey arcade-journey--${kind}`} data-arcade-journey={kind} data-completed={completed} data-danger={danger}>
      <div className="arcade-journey-caption"><span>{labels[kind]}</span><strong>{completed} / {total}</strong></div>
      <div className="arcade-journey-window" aria-hidden="true">
        <motion.div className="arcade-journey-world" animate={{ x: `${-progress * 30}%` }} transition={{ duration: reduced ? 0 : .65 }}>
          {Array.from({ length: total }, (_, index) => (
            <motion.div key={index} className={`arcade-journey-section ${index < completed ? 'is-restored' : ''}`}
              animate={danger && !reduced ? { y: [0, 3, -2, 0] } : { y: 0 }} transition={{ duration: .4 }}>
              <span className="arcade-journey-core">{kind === 'vault' ? (index < completed ? '✓' : '⌁') : kind === 'power' ? 'ϟ' : index + 1}</span>
            </motion.div>
          ))}
        </motion.div>
        <motion.img src={heroImage} alt="" className="arcade-journey-hero" draggable={false}
          animate={reduced ? {} : danger ? { rotate: [0, -8, 7, 0], y: [0, -5, 0] } : { y: [0, -3, 0] }}
          transition={danger ? { duration: .4 } : { duration: 2.4, repeat: Infinity, ease: 'easeInOut' }} />
        <div className="arcade-journey-hazard" />
      </div>
    </div>
  );
}
