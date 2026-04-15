import React from 'react';
import { AnimatePresence, motion } from 'motion/react';

type CelebrationTheme = 'takeout' | 'party' | 'forge';

interface CelebrationSplashProps {
  active: boolean;
  message: string;
  theme: CelebrationTheme;
  sweepDuration?: number;
}

const THEME_STYLES: Record<CelebrationTheme, { backdrop: string; ribbon: string; glow: string }> = {
  takeout: {
    backdrop: 'bg-[radial-gradient(circle_at_50%_36%,rgba(74,222,128,0.22),rgba(15,23,42,0.14)_34%,rgba(2,6,23,0.58)_76%)]',
    ribbon: 'border-emerald-200/70 bg-[linear-gradient(90deg,rgba(34,197,94,0.98),rgba(74,222,128,0.98),rgba(16,185,129,0.98))]',
    glow: 'bg-emerald-300/30',
  },
  party: {
    backdrop: 'bg-[radial-gradient(circle_at_50%_36%,rgba(168,85,247,0.22),rgba(15,23,42,0.14)_34%,rgba(2,6,23,0.55)_76%)]',
    ribbon: 'border-sky-200/70 bg-[linear-gradient(90deg,rgba(59,130,246,0.98),rgba(168,85,247,0.98),rgba(236,72,153,0.98))]',
    glow: 'bg-sky-300/28',
  },
  forge: {
    backdrop: 'bg-[radial-gradient(circle_at_50%_36%,rgba(251,146,60,0.28),rgba(127,29,29,0.16)_38%,rgba(2,6,23,0.65)_82%)]',
    ribbon: 'border-orange-100/70 bg-[linear-gradient(90deg,rgba(245,158,11,0.98),rgba(251,146,60,0.98),rgba(239,68,68,0.98))]',
    glow: 'bg-orange-300/32',
  },
};

const FlameField: React.FC = () => (
  <div className="absolute inset-x-0 bottom-0 h-[42%] overflow-hidden">
    <div className="absolute inset-x-0 bottom-0 h-[52%] bg-[radial-gradient(circle_at_50%_100%,rgba(253,224,71,0.46),rgba(253,224,71,0)_52%),radial-gradient(circle_at_50%_100%,rgba(251,146,60,0.42),rgba(251,146,60,0)_66%)]" />
    <div className="absolute inset-x-0 bottom-0 flex items-end justify-around px-[4%]">
      {Array.from({ length: 11 }).map((_, index) => {
        const height = 84 + ((index % 4) * 12);
        const width = 18 + ((index % 3) * 6);

        return (
          <motion.span
            key={`flame-${index}`}
            className="origin-bottom rounded-t-full border border-yellow-100/20 shadow-[0_0_18px_rgba(251,191,36,0.32)]"
            style={{
              width: `${width}px`,
              height: `${height}px`,
              background: 'linear-gradient(180deg, rgba(255,255,255,0.92) 0%, rgba(253,224,71,0.88) 18%, rgba(251,146,60,0.95) 56%, rgba(185,28,28,0.96) 100%)',
            }}
            animate={{
              scaleY: [0.78, 1.12, 0.84],
              y: [0, -10, 0],
              opacity: [0.45, 1, 0.72],
            }}
            transition={{
              duration: 0.95 + ((index % 3) * 0.1),
              repeat: Infinity,
              repeatType: 'mirror',
              ease: 'easeInOut',
              delay: index * 0.05,
            }}
          />
        );
      })}
    </div>
  </div>
);

const CelebrationSplash: React.FC<CelebrationSplashProps> = ({ active, message, theme, sweepDuration }) => {
  const styles = THEME_STYLES[theme];
  const duration = sweepDuration ?? (theme === 'takeout' ? 1.25 : theme === 'party' ? 0.72 : 0.82);

  return (
    <AnimatePresence>
      {active ? (
        <motion.div
          aria-hidden="true"
          className={`pointer-events-none fixed inset-0 z-[90] overflow-hidden ${styles.backdrop}`}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18, ease: 'easeOut' }}
        >
          <motion.div
            className={`absolute inset-0 ${styles.glow}`}
            animate={{ opacity: [0.35, 0.75, 0.42] }}
            transition={{ duration: 1.1, repeat: Infinity, ease: 'easeInOut' }}
          />

          {theme === 'forge' ? <FlameField /> : null}

          <motion.div
            className={`absolute left-1/2 top-1/2 flex w-[min(190vw,82rem)] -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border px-5 py-4 text-center shadow-[0_26px_52px_rgba(2,6,23,0.45)] ${styles.ribbon}`}
            initial={{ x: '-138%', rotate: -8, scale: 0.96 }}
            animate={{ x: '138%', rotate: -8, scale: 1 }}
            exit={{ x: '168%', opacity: 0 }}
            transition={{ duration, ease: 'easeInOut' }}
          >
            <span className="text-[clamp(1.85rem,7.1vw,4.5rem)] font-black uppercase tracking-[0.16em] text-white drop-shadow-[0_4px_10px_rgba(7,15,35,0.56)]">
              {message}
            </span>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
};

export default CelebrationSplash;
