import React from 'react';
import { AnimatePresence, motion } from 'motion/react';
import AssetIcon from './AssetIcon';
import { triggerHaptic } from '../haptics';
import { MAIN_PNG_SKIN } from '../assets/reskin/mainPng';
import {
  FramedPanel,
  OverlaySurface,
  PrimaryActionButton,
  RewardPanel,
  SecondaryActionButton,
} from '../layout/ScreenPrimitives';

interface LevelResultModalProps {
  isOpen: boolean;
  result: {
    type: 'victory' | 'gameover';
    title: string;
    subtitle: string;
    score: number;
    stars: number;
    coinsEarned: number;
    xpEarned: number;
    islandUnlockedName?: string;
    achievementsUnlocked?: string[];
    primaryLabel: string;
    onPrimary: () => void;
    secondaryLabel?: string;
    onSecondary?: () => void;
  } | null;
}

const cn = (...parts: Array<string | false | null | undefined>) => parts.filter(Boolean).join(' ');

const StatTile: React.FC<{ label: string; value: React.ReactNode; tone?: 'score' | 'coins' | 'xp' }> = ({
  label,
  value,
  tone = 'score',
}) => {
  const valueClass = tone === 'coins'
    ? 'text-amber-200'
    : tone === 'xp'
      ? 'text-cyan-200'
      : 'text-white';

  return (
    <FramedPanel className="rounded-[1rem] p-2.5 text-center md:rounded-[1.2rem] md:p-3.5">
      <div className="text-[9px] font-black uppercase tracking-[0.18em] text-white/50">{label}</div>
      <div className={cn('mt-1 text-lg font-black md:text-2xl', valueClass)}>{value}</div>
    </FramedPanel>
  );
};

const LevelResultModal: React.FC<LevelResultModalProps> = ({ isOpen, result }) => {
  if (!result) return null;

  const isVictory = result.type === 'victory';
  const rewardChest = MAIN_PNG_SKIN.treasureChest;
  const rewardStash = MAIN_PNG_SKIN.skull;
  const statusPill = isVictory ? 'Victory' : 'Round Ended';
  const statusPillTone = isVictory
    ? 'bg-emerald-400/20 text-emerald-100 border-emerald-200/45'
    : 'bg-rose-400/18 text-rose-100 border-rose-200/45';
  const fallbackFailureSupport =
    'Great effort. Shake it off, retry quickly, and push your streak on the next run.';

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-950/78 p-3 backdrop-blur-xl md:p-4"
        >
          <motion.div
            initial={{ y: 28, scale: 0.94, opacity: 0 }}
            animate={{ y: 0, scale: 1, opacity: 1 }}
            exit={{ y: 18, scale: 0.97, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 220, damping: 22 }}
            className="app-modal-panel premium-modal-shell licensed-game-card-dark relative flex w-full max-w-md flex-col overflow-hidden rounded-[1.45rem] border border-white/15 shadow-[0_32px_95px_rgba(0,0,0,0.48)] md:max-w-lg md:rounded-[1.9rem]"
            role="dialog"
            aria-modal="true"
            aria-label={isVictory ? 'Victory result' : 'Round result'}
          >
            <div className={cn(
              'pointer-events-none absolute inset-0',
              isVictory
                ? 'bg-[radial-gradient(circle_at_50%_0%,rgba(16,185,129,0.2),transparent_52%),radial-gradient(circle_at_50%_100%,rgba(59,130,246,0.22),transparent_60%)]'
                : 'bg-[radial-gradient(circle_at_50%_0%,rgba(244,63,94,0.18),transparent_54%),radial-gradient(circle_at_50%_100%,rgba(245,158,11,0.16),transparent_60%)]',
            )} />

            {isVictory && (
              <div className="pointer-events-none absolute inset-0 overflow-hidden">
                {[0, 1, 2, 3, 4, 5].map((index) => (
                  <motion.div
                    // eslint-disable-next-line react/no-array-index-key
                    key={`result-spark-${index}`}
                    className="absolute h-2 w-2 rounded-full bg-amber-200/90 shadow-[0_0_12px_rgba(251,191,36,0.9)]"
                    style={{
                      left: `${14 + (index * 13)}%`,
                      top: `${20 + ((index % 2) * 14)}%`,
                    }}
                    animate={{
                      y: [0, -16, -28],
                      opacity: [0.2, 1, 0],
                      scale: [0.7, 1.2, 0.55],
                    }}
                    transition={{
                      duration: 1.55,
                      repeat: Infinity,
                      delay: index * 0.13,
                    }}
                  />
                ))}
              </div>
            )}

            <div className="relative z-10 flex flex-col gap-3 p-3.5 md:gap-5 md:p-7">
              <div className="mx-auto flex flex-col items-center gap-2 text-center md:gap-3">
                <span className={cn(
                  'inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-[0.14em] md:text-[11px]',
                  statusPillTone,
                )}>
                  <AssetIcon name={isVictory ? 'trophy' : 'refresh'} className="h-3.5 w-3.5" />
                  {statusPill}
                </span>

                <motion.div
                  initial={{ scale: 0.78, rotate: isVictory ? -10 : 8, opacity: 0 }}
                  animate={{ scale: 1, rotate: 0, opacity: 1 }}
                  transition={{ type: 'spring', stiffness: 250, damping: 18, delay: 0.05 }}
                  className={cn(
                    'licensed-slice-paper-panel relative mx-auto flex h-16 w-16 items-center justify-center rounded-[1.05rem] p-2 shadow-inner md:h-24 md:w-24 md:rounded-[1.4rem]',
                    isVictory ? 'ring-2 ring-amber-300/40' : 'ring-2 ring-rose-300/35',
                  )}
                >
                  <img
                    src={isVictory ? rewardChest : rewardStash}
                    alt={isVictory ? 'Victory reward' : 'Retry challenge'}
                    className="h-full w-full object-contain drop-shadow-xl"
                  />
                </motion.div>

                <h2 className={cn(
                  'text-2xl font-black tracking-tight md:text-4xl',
                  isVictory ? 'text-amber-100' : 'text-rose-100',
                )}>
                  {result.title}
                </h2>
                <p className="mx-auto max-w-md text-center text-[11px] leading-relaxed text-white/78 md:text-sm">
                  {isVictory ? result.subtitle : (result.subtitle || fallbackFailureSupport)}
                </p>
              </div>

              <div className="flex items-center justify-center gap-1.5 md:gap-2">
                {[1, 2, 3].map((star, index) => (
                  <motion.div
                    key={star}
                    initial={{ scale: 0, rotate: -18, y: 10 }}
                    animate={{ scale: 1, rotate: 0, y: 0 }}
                    transition={{ delay: 0.12 + index * 0.11, type: 'spring', stiffness: 250, damping: 16 }}
                    className={`rounded-full p-1.5 md:p-2 ${star <= result.stars ? 'bg-yellow-300/18 ring-1 ring-amber-200/45' : 'bg-white/5 ring-1 ring-white/10'}`}
                  >
                    <AssetIcon name={star <= result.stars ? 'star' : 'starOutline'} className="h-7 w-7 md:h-10 md:w-10" />
                  </motion.div>
                ))}
              </div>

              <div className="grid grid-cols-3 gap-2 md:gap-3">
                <StatTile label="Score" value={result.score} tone="score" />
                <StatTile
                  label="Coins"
                  value={<span className="inline-flex items-center gap-1"><AssetIcon name="coin" className="h-4 w-4" /> +{result.coinsEarned}</span>}
                  tone="coins"
                />
                <StatTile
                  label="XP"
                  value={<span className="inline-flex items-center gap-1"><AssetIcon name="star" className="h-4 w-4" /> +{result.xpEarned}</span>}
                  tone="xp"
                />
              </div>

              {(result.islandUnlockedName || (result.achievementsUnlocked?.length || 0) > 0) && (
                <div className="space-y-2 md:space-y-3">
                  {result.islandUnlockedName && (
                    <RewardPanel className="rounded-[1.2rem] text-sm md:rounded-[1.5rem]">
                      <div className="flex items-center gap-2 text-[9px] font-black uppercase tracking-[0.2em] text-emerald-700 md:text-[10px]">
                        <AssetIcon name="trophy" className="h-3.5 w-3.5" /> New island unlocked
                      </div>
                      <div className="mt-1 text-sm font-bold text-amber-950 md:text-base">{result.islandUnlockedName}</div>
                    </RewardPanel>
                  )}

                  {(result.achievementsUnlocked?.length || 0) > 0 && (
                    <RewardPanel className="rounded-[1.2rem] text-sm md:rounded-[1.5rem]">
                      <div className="text-[9px] font-black uppercase tracking-[0.2em] text-cyan-700 md:text-[10px]">Achievements unlocked</div>
                      <div className="mt-1 flex flex-wrap gap-2">
                        {result.achievementsUnlocked?.slice(0, 3).map((achievement) => (
                          <span key={achievement} className="licensed-slice-cyan-pill rounded-full px-3 py-1 text-[10px] font-bold text-white md:text-xs">
                            {achievement}
                          </span>
                        ))}
                      </div>
                    </RewardPanel>
                  )}
                </div>
              )}

              {!isVictory && (
                <OverlaySurface variant="surface" className="rounded-[1.1rem] p-3 text-center md:rounded-[1.35rem] md:p-4">
                  <div className="inline-flex items-center justify-center gap-1.5 text-[10px] font-black uppercase tracking-[0.18em] text-rose-100/90 md:text-[11px]">
                    <AssetIcon name="heart" className="h-3.5 w-3.5" />
                    Keep The Run Going
                  </div>
                  <p className="mt-1.5 text-[11px] leading-relaxed text-white/78 md:text-sm">
                    Retry now while the route is fresh. One strong answer chain can flip the whole level.
                  </p>
                </OverlaySurface>
              )}

              <div className="mt-1 flex flex-col gap-2 sm:flex-row">
                {result.onSecondary && result.secondaryLabel && (
                  <SecondaryActionButton
                    onClick={() => {
                      triggerHaptic('selection');
                      result.onSecondary?.();
                    }}
                    className="flex-1 gap-2 py-3 md:py-4"
                  >
                    <AssetIcon name="refresh" className="h-4 w-4" />
                    {result.secondaryLabel}
                  </SecondaryActionButton>
                )}
                <PrimaryActionButton
                  onClick={() => {
                    triggerHaptic(isVictory ? 'success' : 'selection');
                    result.onPrimary();
                  }}
                  className={cn(
                    'flex-1 gap-2 py-3 md:py-4',
                    isVictory ? 'shadow-[0_0_28px_rgba(34,211,238,0.26)]' : 'shadow-[0_0_24px_rgba(244,63,94,0.2)]',
                  )}
                >
                  {isVictory ? <AssetIcon name="trophy" className="h-4 w-4" /> : <AssetIcon name="refresh" className="h-4 w-4" />}
                  {result.primaryLabel}
                </PrimaryActionButton>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default LevelResultModal;
