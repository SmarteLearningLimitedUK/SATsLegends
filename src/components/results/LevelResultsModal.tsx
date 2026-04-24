import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import AnimatedStarDisplay from '../progression/AnimatedStarDisplay';
import BonusBreakdown from '../progression/BonusBreakdown';
import LevelBadge from '../progression/LevelBadge';
import XpBar, { XpSegment } from '../progression/XpBar';
import { getXpRequiredForLevel } from '../../lib/progression/getXpRequiredForLevel';
import { BonusBreakdown as BonusBreakdownType, StarCount } from '../../lib/progression/types';
import CelebrationSplash from '../CelebrationSplash';
import successRoundBackground from '../../assets/end of round screen/success screen.jpg';
import failureRoundBackground from '../../assets/end of round screen/failure screen.jpg';

interface LevelResultsModalProps {
  isOpen: boolean;
  result: {
    type: 'victory' | 'gameover';
    title: string;
    subtitle: string;
    stars: StarCount;
    xpGained: number;
    practice?: boolean;
    bonuses: BonusBreakdownType[];
    previousLevel: number;
    newLevel: number;
    previousXp: number;
    currentXp: number;
    xpRequiredForNextLevel: number;
    leveledUp: boolean;
  } | null;
  onRetry: () => void;
  onNext?: () => void;
  onMap: () => void;
  calmBreakLabel?: string;
  onCalmBreak?: () => void;
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

const buildXpSegments = (
  previousLevel: number,
  previousXp: number,
  xpGained: number,
): XpSegment[] => {
  const segments: XpSegment[] = [];
  let remaining = Math.max(0, xpGained);
  let level = previousLevel;
  let current = previousXp;

  if (remaining === 0) {
    const requiredXp = getXpRequiredForLevel(level);
    return [{ level, fromXp: current, toXp: current, requiredXp }];
  }

  while (remaining > 0) {
    const requiredXp = getXpRequiredForLevel(level);
    const space = requiredXp - current;
    const gain = Math.min(space, remaining);
    segments.push({
      level,
      fromXp: current,
      toXp: current + gain,
      requiredXp,
    });
    remaining -= gain;
    if (current + gain >= requiredXp) {
      level += 1;
      current = 0;
    } else {
      current += gain;
    }
  }

  return segments;
};

const LevelResultsModal: React.FC<LevelResultsModalProps> = ({
  isOpen,
  result,
  onRetry,
  onNext,
  onMap,
  calmBreakLabel,
  onCalmBreak,
}) => {
  const reducedMotion = useReducedMotion();
  const [playStars, setPlayStars] = useState(false);
  const [playXp, setPlayXp] = useState(false);
  const [showButtons, setShowButtons] = useState(false);
  const [levelUpPulse, setLevelUpPulse] = useState(false);
  const isPractice = Boolean(result?.practice);
  const handleXpComplete = useCallback(() => setShowButtons(true), []);
  const handleXpLevelUp = useCallback(() => setLevelUpPulse(true), []);

  useEffect(() => {
    if (!isOpen || !result) return;
    setPlayStars(false);
    setPlayXp(false);
    setShowButtons(false);
    setLevelUpPulse(false);

    const starDelay = reducedMotion ? 0 : 180;
    const xpDelay = reducedMotion ? 0 : 540;

    if (isPractice) {
      const buttonsTimer = window.setTimeout(() => setShowButtons(true), reducedMotion ? 0 : 220);
      return () => window.clearTimeout(buttonsTimer);
    }

    const timers = [
      window.setTimeout(() => setPlayStars(true), starDelay),
      window.setTimeout(() => setPlayXp(true), xpDelay),
    ];

    return () => timers.forEach((timer) => window.clearTimeout(timer));
  }, [isOpen, isPractice, reducedMotion, result]);

  const xpSegments = useMemo(() => {
    if (!result) return [];
    return buildXpSegments(result.previousLevel, result.previousXp, result.xpGained);
  }, [result]);

  if (!result) return null;

  const isVictory = result.type === 'victory';
  const resultBackground = isVictory ? successRoundBackground : failureRoundBackground;
  const celebrationMessage = isPractice
    ? 'Practice Complete!'
    : result.stars === 3
      ? 'Brilliant!'
      : result.stars === 2
        ? 'Great Work!'
        : 'Nice Job!';
  const celebrationDuration = 1.5;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[140] flex items-center justify-center overflow-hidden bg-slate-950/88"
        >
          <div className="pointer-events-none absolute inset-0">
            <img
              src={resultBackground}
              alt=""
              className="h-full w-full object-cover object-center"
              draggable={false}
            />
            <div
              className={`absolute inset-0 ${
                isVictory
                  ? 'bg-[linear-gradient(180deg,rgba(7,26,39,0.22),rgba(2,6,23,0.72))]'
                  : 'bg-[linear-gradient(180deg,rgba(45,12,24,0.2),rgba(2,6,23,0.76))]'
              }`}
            />
            <div className="absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-black/40 to-transparent" />
            <div className="absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-black/55 to-transparent" />
          </div>

          {isVictory ? (
            <CelebrationSplash active message={celebrationMessage} theme="victory" sweepDuration={celebrationDuration} />
          ) : null}

          <motion.div
            initial={{ y: 24, scale: 0.96, opacity: 0 }}
            animate={{ y: 0, scale: 1, opacity: 1 }}
            exit={{ y: 16, scale: 0.98, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 220, damping: 20 }}
            className="relative z-10 w-full max-w-md overflow-visible rounded-[1.6rem] border border-white/15 bg-[linear-gradient(180deg,rgba(7,21,52,0.78),rgba(5,17,45,0.9))] p-4 shadow-[0_28px_80px_rgba(0,0,0,0.5)] backdrop-blur-md md:max-w-lg md:rounded-[2rem] md:p-6"
          >
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(56,189,248,0.18),transparent_55%),radial-gradient(circle_at_50%_100%,rgba(251,191,36,0.18),transparent_60%)]" />
            <button
              onClick={onMap}
              className="ui-close-button absolute right-4 top-4 z-20 md:right-5 md:top-5"
              aria-label="Close results"
            >
              <span aria-hidden="true">×</span>
            </button>

            <div className="relative z-10 flex flex-col gap-4">
              <div className="flex flex-col items-center text-center">
                <span className={`rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-[0.2em] ${isPractice ? 'border-cyan-200/50 bg-cyan-400/20 text-cyan-100' : isVictory ? 'border-emerald-200/50 bg-emerald-400/20 text-emerald-100' : 'border-rose-200/45 bg-rose-400/20 text-amber-100'}`}>
                  {isPractice ? (isVictory ? 'Practice Complete' : 'Practice Run Over') : isVictory ? 'Level Complete' : 'Try Again'}
                </span>
                <h2 className="mt-2 text-2xl font-black text-amber-100 md:text-3xl">{result.title}</h2>
                <p className="mt-1 text-sm font-semibold text-white/80 md:text-base">{result.subtitle}</p>
              </div>

              {isPractice ? (
                <div className="rounded-[1.2rem] border border-cyan-200/18 bg-cyan-400/10 px-4 py-3 text-center">
                  <div className="text-xs font-black uppercase tracking-[0.18em] text-cyan-100/85">
                    No XP or brainpower awarded
                  </div>
                </div>
              ) : (
                <>
                  <div className="flex flex-col items-center gap-2">
                    <AnimatedStarDisplay stars={result.stars} play={playStars} />
                    {result.stars === 3 ? (
                      <span className="rounded-full border border-amber-200/60 bg-amber-300/20 px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-amber-100">
                        Perfect Run
                      </span>
                    ) : null}
                  </div>

                  <div className="rounded-[1.2rem] border border-white/12 bg-white/5 p-3 md:p-4">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold uppercase tracking-[0.18em] text-white/60">XP Earned</span>
                      <span className="text-lg font-black text-cyan-200">+{result.xpGained} XP</span>
                    </div>
                    <div className="mt-3 flex items-center justify-between">
                      <LevelBadge level={result.newLevel} highlight={levelUpPulse} />
                      {result.leveledUp ? (
                        <span className="text-xs font-bold uppercase tracking-[0.16em] text-amber-200">Level Up!</span>
                      ) : null}
                    </div>
                    <div className="mt-3">
                      <XpBar
                        segments={xpSegments}
                        play={playXp}
                        onLevelUp={handleXpLevelUp}
                        onComplete={handleXpComplete}
                      />
                    </div>
                  </div>

                  <BonusBreakdown bonuses={result.bonuses} />
                </>
              )}

              <div className={`mt-2 grid gap-2 ${showButtons ? 'opacity-100' : 'opacity-0 pointer-events-none'} transition-opacity duration-300 ${isVictory ? 'grid-cols-2' : 'grid-cols-2'}`}>
                {isPractice ? (
                  <>
                    <button
                      type="button"
                      className="ui-button-primary py-3 text-sm font-black uppercase tracking-[0.18em]"
                      onClick={onRetry}
                    >
                      Retry Practice
                    </button>
                    <button
                      type="button"
                      className="ui-button-secondary py-2 text-xs font-black uppercase tracking-[0.18em]"
                      onClick={onMap}
                    >
                      Map
                    </button>
                  </>
                ) : isVictory ? (
                  <button
                    type="button"
                    className="ui-button-primary py-3 text-sm font-black uppercase tracking-[0.18em]"
                    onClick={onNext || onMap}
                  >
                    {onNext ? 'Next Level' : 'Return to Map'}
                  </button>
                ) : (
                  <button
                    type="button"
                    className="ui-button-primary py-3 text-sm font-black uppercase tracking-[0.18em]"
                    onClick={onRetry}
                  >
                    Retry
                  </button>
                )}
                <button
                  type="button"
                  className="ui-button-secondary py-2 text-xs font-black uppercase tracking-[0.18em]"
                  onClick={onMap}
                >
                  Map
                </button>
                {calmBreakLabel && onCalmBreak ? (
                  <button
                    type="button"
                    className="ui-button-success py-2 text-xs font-black uppercase tracking-[0.18em]"
                    onClick={onCalmBreak}
                  >
                    {calmBreakLabel}
                  </button>
                ) : null}
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default LevelResultsModal;
