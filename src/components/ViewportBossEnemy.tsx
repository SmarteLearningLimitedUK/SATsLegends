import React, { useEffect, useMemo, useState } from 'react';
import { motion } from 'motion/react';
import { MiniGameType } from '../types';
import { getBossVisualForLevel } from '../bossVisuals';

interface ViewportBossEnemyProps {
  gameType?: MiniGameType | null;
  levelId?: number;
  resultType?: 'victory' | 'gameover' | null;
  className?: string;
}

const ViewportBossEnemy: React.FC<ViewportBossEnemyProps> = ({
  gameType,
  levelId,
  resultType = null,
  className = '',
}) => {
  const [viewport, setViewport] = useState(() => ({
    width: window.innerWidth,
    height: window.innerHeight,
  }));

  useEffect(() => {
    const handleResize = () => {
      setViewport({
        width: window.innerWidth,
        height: window.innerHeight,
      });
    };

    window.addEventListener('resize', handleResize);
    window.addEventListener('orientationchange', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleResize);
    };
  }, []);

  const hasRoom = viewport.width >= 360 && viewport.height >= 640;
  const bossArt = useMemo(
    () => getBossVisualForLevel(gameType, levelId),
    [gameType, levelId],
  );

  if (!hasRoom || !bossArt) return null;

  const isDefeated = resultType === 'victory';

  return (
    <motion.div
      initial={{ opacity: 0, x: 18 }}
      animate={{
        opacity: isDefeated ? 0.72 : 1,
        x: 0,
        y: isDefeated ? 20 : [0, -6, 0],
        rotate: isDefeated ? 12 : 0,
        scale: isDefeated ? 0.9 : 1,
      }}
      transition={{
        x: { duration: 0.26, ease: 'easeOut' },
        y: isDefeated
          ? { duration: 0.22, ease: 'easeOut' }
          : { duration: 3.1, repeat: Infinity, ease: 'easeInOut' },
        rotate: { duration: 0.24, ease: 'easeOut' },
        scale: { duration: 0.24, ease: 'easeOut' },
      }}
      className={`pointer-events-none absolute right-2 z-20 ${className}`}
      style={{ top: 'calc(env(safe-area-inset-top) + 7rem)' }}
      aria-hidden="true"
    >
      <div className="relative rounded-[1.05rem] border border-white/28 bg-[linear-gradient(180deg,rgba(15,23,42,0.58),rgba(2,6,23,0.82))] p-1.5 shadow-[0_18px_32px_rgba(2,6,23,0.46)] backdrop-blur-[2px]">
        <div className="pointer-events-none absolute inset-0 rounded-[inherit] bg-[radial-gradient(circle_at_50%_0%,rgba(125,211,252,0.2),rgba(125,211,252,0)_42%),linear-gradient(180deg,rgba(255,255,255,0.08),rgba(255,255,255,0)_20%)]" />
        <img
          src={bossArt}
          alt=""
          draggable={false}
          className={`relative z-10 h-[6.4rem] w-[5.2rem] rounded-[0.82rem] object-cover drop-shadow-[0_12px_22px_rgba(0,0,0,0.46)] ${
            isDefeated ? 'grayscale contrast-90 saturate-75' : ''
          }`}
        />
        <span className="absolute -bottom-2 left-1/2 z-20 -translate-x-1/2 rounded-full border border-amber-100/45 bg-slate-900/82 px-2 py-0.5 text-[9px] font-black uppercase tracking-[0.14em] text-amber-100 shadow-[0_6px_14px_rgba(2,6,23,0.36)]">
          {isDefeated ? 'Defeated' : 'Enemy'}
        </span>
      </div>
    </motion.div>
  );
};

export default ViewportBossEnemy;
