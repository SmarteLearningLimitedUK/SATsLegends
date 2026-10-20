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
import { useDialogFocus } from '../game-ui/useDialogFocus';
import './level-results.css';

interface LevelResultsModalProps {
  isOpen: boolean;
  gameKey?: string;
  islandName?: string;
  result: {
    type: 'victory' | 'gameover';
    title: string;
    subtitle: string;
    stars: StarCount;
    xpGained: number;
    practice?: boolean;
    mockAttempt?: boolean;
    bonuses: BonusBreakdownType[];
    previousLevel: number;
    newLevel: number;
    previousXp: number;
    currentXp: number;
    xpRequiredForNextLevel: number;
    leveledUp: boolean;
    accuracy: number;
    accuracyMeasured?: boolean;
    timeMs: number;
  } | null;
  onRetry: () => void;
  onPractice?: () => void;
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

const formatAccuracy = (accuracy: number): string => `${Math.round(Math.max(0, Math.min(1, accuracy)) * 100)}%`;

const formatTime = (timeMs: number): string => {
  const totalSeconds = Math.max(0, Math.round(timeMs / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
};

const ResultStatTile: React.FC<{ label: string; value: React.ReactNode; tone?: 'cyan' | 'emerald' | 'amber' }> = ({
  label,
  value,
  tone = 'cyan',
}) => {
  const toneClass =
    tone === 'emerald'
      ? 'border-emerald-200/25 bg-emerald-400/8 text-emerald-100'
      : tone === 'amber'
        ? 'border-amber-200/25 bg-amber-400/8 text-amber-100'
        : 'border-cyan-200/25 bg-cyan-400/8 text-cyan-100';

  return (
    <div className={`legend-result-stat rounded-[1rem] border px-3 py-2.5 text-center ${toneClass}`}>
      <div className="text-[11px] font-black uppercase tracking-[0.12em] text-white/80">{label}</div>
      <div className="mt-1 text-base font-black md:text-lg">{value}</div>
    </div>
  );
};

const LevelResultsModal: React.FC<LevelResultsModalProps> = ({
  isOpen,
  gameKey,
  islandName,
  result,
  onRetry,
  onPractice,
  onNext,
  onMap,
  calmBreakLabel,
  onCalmBreak,
}) => {
  const reducedMotion = useReducedMotion();
  const dialogRef = useDialogFocus(isOpen && Boolean(result), onMap);
  const [playStars, setPlayStars] = useState(false);
  const [playXp, setPlayXp] = useState(false);
  const [levelUpPulse, setLevelUpPulse] = useState(false);
  const isPractice = Boolean(result?.practice);
  const isMockAttempt = Boolean(result?.mockAttempt);
  const handleXpLevelUp = useCallback(() => setLevelUpPulse(true), []);

  useEffect(() => {
    if (!isOpen || !result) return;
    setPlayStars(false);
    setPlayXp(false);
    setLevelUpPulse(false);

    const starDelay = reducedMotion ? 0 : 180;
    const xpDelay = reducedMotion ? 0 : 540;

    if (isPractice) return;

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
  const resultBackground = isVictory || isMockAttempt ? successRoundBackground : failureRoundBackground;
  const celebrationMessage = isPractice
    ? 'Practice Complete!'
    : result.stars === 3
      ? 'Brilliant!'
      : result.stars === 2
        ? 'Great Work!'
        : 'Nice Job!';
  const celebrationDuration = (result.stars === 3 ? 0.82 : result.stars === 2 ? 0.96 : 1.08) * 1.7;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className={`level-result-overlay fixed inset-0 z-[140] flex items-center justify-center overflow-hidden ${gameKey?'level-result-overlay--themed':'bg-slate-950/88'}`}
          data-result-game={gameKey}
          data-result-scene={gameKey==='rounding_rocket'&&isVictory?'orbit':'level'}
          data-result-outcome={result.type}
        >
          <div className="pointer-events-none absolute inset-0">
            {!gameKey && <img
              src={resultBackground}
              alt=""
              className="h-full w-full object-cover object-center"
              draggable={false}
            />}
            <div
              className={`absolute inset-0 ${
                isVictory || isMockAttempt
                  ? 'bg-[linear-gradient(180deg,rgba(7,26,39,0.22),rgba(2,6,23,0.72))]'
                  : 'bg-[linear-gradient(180deg,rgba(45,12,24,0.2),rgba(2,6,23,0.76))]'
              }`}
            />
            <div className="absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-black/40 to-transparent" />
            <div className="absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-black/55 to-transparent" />
          </div>

          {isVictory && !isPractice && !reducedMotion && !gameKey ? (
            <CelebrationSplash active message={celebrationMessage} theme="victory" sweepDuration={celebrationDuration} />
          ) : null}

          <motion.div
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            aria-label="Mission results"
            tabIndex={-1}
            initial={reducedMotion?false:{ y: 24, scale: 0.96, opacity: 0 }}
            animate={{ y: 0, scale: 1, opacity: 1 }}
            exit={{ y: 16, scale: 0.98, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 220, damping: 20 }}
            className="legend-dialog level-result-card relative z-10 flex h-[min(92vh,58rem)] w-full max-w-md flex-col overflow-hidden p-4 md:max-w-2xl md:p-6"
          >
            <div className="level-result-sheen pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(56,189,248,0.18),transparent_55%),radial-gradient(circle_at_50%_100%,rgba(251,191,36,0.18),transparent_60%)]" />
            <div className={gameKey?'level-result-toolbar':undefined}>
            {gameKey&&islandName?<p className="level-result-location">{islandName}</p>:null}
            <button
              onClick={onMap}
              className="ui-close-button absolute right-4 top-4 z-20 md:right-5 md:top-5"
              aria-label="Close results"
            >
              <span aria-hidden="true">×</span>
            </button>
            </div>

            <div className="level-result-layout relative z-10 flex h-full min-h-0 flex-col gap-4">
              <div className="level-result-scroll flex-1 min-h-0 overflow-y-auto pr-1">
              <div className="level-result-heading flex flex-col items-center text-center">
                <span className={`level-result-status rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-[0.2em] ${isPractice ? 'border-cyan-200/50 bg-cyan-400/20 text-cyan-100' : isVictory || isMockAttempt ? 'border-emerald-200/50 bg-emerald-400/20 text-emerald-100' : 'border-rose-200/45 bg-rose-400/20 text-amber-100'}`}>
                  {isPractice ? (isVictory ? 'Practice Complete' : 'Practice Run Over') : isMockAttempt ? 'Core Run Logged' : isVictory ? 'Level Complete' : 'Try Again'}
                </span>
                <h2 className="mt-2 text-2xl font-black text-amber-100 md:text-3xl">{result.title}</h2>
                <p className="mt-1 text-sm font-semibold text-white/80 md:text-base">{result.subtitle}</p>
              </div>

              <div className="level-result-stats grid grid-cols-2 gap-2 md:grid-cols-4">
                <ResultStatTile label="Accuracy" value={result.accuracyMeasured === false ? 'Not tracked' : formatAccuracy(result.accuracy)} tone="emerald" />
                <ResultStatTile
                  label="Time Taken"
                  value={isVictory || isMockAttempt ? formatTime(result.timeMs) : 'N/A'}
                  tone="amber"
                />
                <ResultStatTile
                  label="XP Earned"
                  value={`+${result.xpGained}`}
                  tone="cyan"
                />
                <ResultStatTile
                  label="Stars"
                  value={`${result.stars}/3`}
                  tone="emerald"
                />
              </div>

              {isPractice ? (
                <div className="rounded-[1.2rem] border border-cyan-200/18 bg-cyan-400/10 px-4 py-3 text-center">
                  <div className="text-xs font-black uppercase tracking-[0.18em] text-cyan-100/85">
                    No XP or brainpower awarded
                  </div>
                </div>
                ) : (
                  <>
                  <div className="level-result-medals flex flex-col items-center gap-2">
                    <AnimatedStarDisplay stars={result.stars} play={playStars} />
                    {result.stars === 3 ? (
                      <span className="rounded-full border border-amber-200/60 bg-amber-300/20 px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-amber-100">
                        Three-Star Clear
                      </span>
                    ) : null}
                  </div>

                  <div className="level-result-progression rounded-[1.2rem] border border-white/12 bg-white/5 p-3 md:p-4">
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
                      />
                    </div>
                  </div>

                    <div className="level-result-bonuses"><BonusBreakdown bonuses={result.bonuses} /></div>
                  </>
                )}
              </div>

              <div className="level-result-actions mt-auto grid grid-cols-2 gap-2 pt-2">
                {isPractice ? (
                  <>
                    <button
                      type="button"
                      data-dialog-primary
                      className="ui-button-primary py-3 text-sm font-black uppercase tracking-[0.18em]"
                      onClick={onRetry}
                    >
                      Retry Practice
                    </button>
                  </>
                ) : isVictory ? (
                  <button
                    type="button"
                    data-dialog-primary
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
                    {isMockAttempt ? 'Run Core Again' : 'Retry'}
                  </button>
                )}
                <button
                  type="button"
                  className="ui-button-secondary py-2 text-xs font-black uppercase tracking-[0.18em]"
                  onClick={onMap}
                >
                  Map
                </button>
                {!isVictory && !isPractice && onPractice ? (
                  <button
                    type="button"
                    className="ui-button-secondary col-span-2 py-2 text-xs font-black uppercase tracking-[0.18em]"
                    onClick={onPractice}
                  >
                    Practise This Skill
                  </button>
                ) : null}
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
