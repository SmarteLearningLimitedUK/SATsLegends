import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import confetti from 'canvas-confetti';
import { Check, RefreshCcw, Timer as TimerIcon, Trophy } from 'lucide-react';
import FoodGameShell from '../components/FoodGameShell';
import GameActionDock from '../components/GameActionDock';
import AssetIcon from '../components/AssetIcon';
import takeOutLevelBg from '../assets/level_backgrounds/take_out.png';
import coinAsset from '../assets/fantasy_hero/ui/coin.png';

interface ShareSplitterGameProps {
  levelId: number;
  avatarId: string;
  onVictory: (stars: number, score: number) => void;
  onGameOver: (score: number) => void;
  onBack: () => void;
}

interface RatioChallenge {
  ratioA: number;
  ratioB: number;
  totalSlices: number;
  requiredA: number;
  requiredB: number;
}

type FeedbackTone = 'good' | 'bad' | 'neutral';

const ROUND_DURATION_SECONDS = 90;
const BASE_TARGET_SCORE = 1200;
const TARGET_SCORE_PER_LEVEL = 180;
const RATIO_POOL: Array<[number, number]> = [
  [1, 1],
  [2, 1],
  [3, 2],
  [4, 1],
  [3, 1],
  [5, 2],
  [5, 3],
];

const randomFrom = <T,>(items: T[]) => items[Math.floor(Math.random() * items.length)];

const createChallenge = (levelId: number): RatioChallenge => {
  const maxRatioIndex = levelId <= 2 ? 3 : levelId <= 5 ? 5 : RATIO_POOL.length - 1;
  const ratioSelection = randomFrom(RATIO_POOL.slice(0, maxRatioIndex + 1));
  const [ratioA, ratioB] = ratioSelection;
  const ratioSum = ratioA + ratioB;
  const minMultiplier = 2;
  const maxMultiplier = levelId <= 2 ? 4 : levelId <= 5 ? 5 : 6;
  const multiplier = Math.floor(Math.random() * (maxMultiplier - minMultiplier + 1)) + minMultiplier;
  const totalSlices = ratioSum * multiplier;

  return {
    ratioA,
    ratioB,
    totalSlices,
    requiredA: ratioA * multiplier,
    requiredB: ratioB * multiplier,
  };
};

const formatTimer = (seconds: number) => {
  const safe = Math.max(0, seconds);
  const mins = Math.floor(safe / 60);
  const secs = safe % 60;
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
};

const ShareSplitterGame: React.FC<ShareSplitterGameProps> = ({
  levelId,
  avatarId: _avatarId,
  onVictory,
  onGameOver,
  onBack,
}) => {
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(ROUND_DURATION_SECONDS);
  const [streak, setStreak] = useState(0);
  const [challengesSolved, setChallengesSolved] = useState(0);
  const [challenge, setChallenge] = useState<RatioChallenge>(() => createChallenge(levelId));
  const [plateA, setPlateA] = useState(0);
  const [plateB, setPlateB] = useState(0);
  const [feedback, setFeedback] = useState<string>('Split the cake slices to match the ratio.');
  const [feedbackTone, setFeedbackTone] = useState<FeedbackTone>('neutral');
  const [submitting, setSubmitting] = useState(false);
  const [finished, setFinished] = useState(false);

  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const endedRef = useRef(false);

  const targetScore = BASE_TARGET_SCORE + (levelId * TARGET_SCORE_PER_LEVEL);
  const usedSlices = plateA + plateB;
  const slicesRemaining = Math.max(0, challenge.totalSlices - usedSlices);
  const progressPct = Math.min((score / targetScore) * 100, 100);

  const resultStars = useMemo(() => {
    if (score >= targetScore * 1.8) return 3;
    if (score >= targetScore * 1.35) return 2;
    if (score >= targetScore) return 1;
    return 0;
  }, [score, targetScore]);

  const clearTransitionTimer = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  };

  const finishRun = useCallback((finalScore: number) => {
    if (endedRef.current) return;
    endedRef.current = true;
    setFinished(true);

    const stars = finalScore >= targetScore * 1.8
      ? 3
      : finalScore >= targetScore * 1.35
        ? 2
        : finalScore >= targetScore
          ? 1
          : 0;

    if (stars > 0) {
      onVictory(stars, finalScore);
      return;
    }

    onGameOver(finalScore);
  }, [onGameOver, onVictory, targetScore]);

  const nextChallenge = useCallback(() => {
    setChallenge(createChallenge(levelId));
    setPlateA(0);
    setPlateB(0);
    setSubmitting(false);
  }, [levelId]);

  useEffect(() => {
    endedRef.current = false;
    clearTransitionTimer();
    setScore(0);
    setTimeLeft(ROUND_DURATION_SECONDS);
    setStreak(0);
    setChallengesSolved(0);
    setChallenge(createChallenge(levelId));
    setPlateA(0);
    setPlateB(0);
    setSubmitting(false);
    setFeedback('Split the cake slices to match the ratio.');
    setFeedbackTone('neutral');
    setFinished(false);

    return () => clearTransitionTimer();
  }, [levelId]);

  useEffect(() => {
    if (finished || submitting) return undefined;
    const timer = setInterval(() => {
      setTimeLeft((previous) => {
        if (previous <= 1) {
          clearInterval(timer);
          finishRun(score);
          return 0;
        }
        return previous - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [finishRun, finished, score, submitting]);

  const adjustPlate = (plate: 'A' | 'B', delta: number) => {
    if (submitting || finished) return;

    if (plate === 'A') {
      setPlateA((previous) => Math.max(0, Math.min(challenge.totalSlices, previous + delta)));
      return;
    }

    setPlateB((previous) => Math.max(0, Math.min(challenge.totalSlices, previous + delta)));
  };

  const resetAllocation = () => {
    if (submitting || finished) return;
    setPlateA(0);
    setPlateB(0);
    setFeedback('Allocation reset. Build the ratio again.');
    setFeedbackTone('neutral');
  };

  const submitAllocation = () => {
    if (submitting || finished) return;

    const totalUsed = plateA + plateB;
    if (totalUsed !== challenge.totalSlices) {
      setFeedback(`Use all ${challenge.totalSlices} slices before serving.`);
      setFeedbackTone('bad');
      setStreak(0);
      setScore((previous) => Math.max(0, previous - 40));
      return;
    }

    setSubmitting(true);
    const correct = plateA === challenge.requiredA && plateB === challenge.requiredB;

    if (correct) {
      const gain = 140 + Math.floor(timeLeft * 1.2) + (streak * 30);
      const nextScore = score + gain;
      const nextSolved = challengesSolved + 1;
      setScore(nextScore);
      setStreak((previous) => previous + 1);
      setChallengesSolved(nextSolved);
      setFeedback(`Perfect split! +${gain} points.`);
      setFeedbackTone('good');

      confetti({
        particleCount: 36,
        spread: 46,
        origin: { y: 0.65 },
        colors: ['#facc15', '#38bdf8', '#4ade80'],
      });

      clearTransitionTimer();
      timeoutRef.current = setTimeout(() => {
        if (timeLeft <= 1) {
          finishRun(nextScore);
          return;
        }
        nextChallenge();
      }, 680);
      return;
    }

    setStreak(0);
    setScore((previous) => Math.max(0, previous - 60));
    setFeedback(`Not quite. Need ${challenge.requiredA} : ${challenge.requiredB} slices.`);
    setFeedbackTone('bad');

    clearTransitionTimer();
    timeoutRef.current = setTimeout(() => {
      nextChallenge();
    }, 780);
  };

  return (
    <FoodGameShell gameType="take_out_rush" backgroundImage={takeOutLevelBg}>
      <div className="ui-panel-unified flex items-center justify-between gap-2 rounded-[1.2rem] border border-white/16 bg-[linear-gradient(180deg,rgba(14,116,144,0.82),rgba(30,64,175,0.84))] px-3 py-2 text-white shadow-[0_10px_22px_rgba(15,23,42,0.3)] md:px-4">
        <div className="flex items-center gap-2 rounded-full bg-black/20 px-2 py-1">
          <img src={coinAsset} alt="" className="h-4 w-4 md:h-5 md:w-5" draggable={false} />
          <span className="text-xs font-black md:text-sm">{score}</span>
        </div>
        <div className="hidden items-center gap-2 rounded-full bg-black/20 px-2 py-1 md:flex">
          <AssetIcon name="trophy" className="h-4 w-4 md:h-5 md:w-5" />
          <span className="text-xs font-black md:text-sm">Solved {challengesSolved}</span>
        </div>
        <div className="flex items-center gap-2 rounded-full bg-black/20 px-2 py-1">
          <TimerIcon className="h-4 w-4 text-yellow-200 md:h-5 md:w-5" />
          <span className="text-xs font-black md:text-sm">{formatTimer(timeLeft)}</span>
        </div>
      </div>

      <div className="ui-panel-unified rounded-[1.2rem] border border-white/14 bg-[linear-gradient(180deg,rgba(250,204,21,0.9),rgba(245,158,11,0.86))] px-3 py-2 text-slate-900 shadow-[0_14px_22px_rgba(15,23,42,0.22)] md:px-4 md:py-3">
        <div className="text-[11px] font-black uppercase tracking-[0.14em] text-slate-800/75">Cake Share: Ratio Feast</div>
        <div className="mt-1 text-lg font-black leading-tight md:text-2xl">
          Split {challenge.totalSlices} slices in ratio {challenge.ratioA}:{challenge.ratioB}
        </div>
        <div className="mt-1 text-xs font-bold text-slate-700 md:text-sm">
          Plate Sun and Plate Moon must match the ratio exactly.
        </div>
      </div>

      <div className="ui-panel-unified flex min-h-0 flex-1 flex-col rounded-[1.5rem] border border-white/14 bg-[linear-gradient(180deg,rgba(30,64,175,0.78),rgba(8,47,73,0.82))] p-3 shadow-[0_16px_30px_rgba(15,23,42,0.3)] md:p-4">
        <div className="mb-3 h-3 overflow-hidden rounded-full bg-black/26">
          <motion.div
            className="h-full rounded-full bg-[linear-gradient(90deg,#22d3ee,#facc15)]"
            animate={{ width: `${progressPct}%` }}
            transition={{ duration: 0.35, ease: 'easeOut' }}
          />
        </div>

        <div className="grid flex-1 grid-cols-1 gap-3 md:grid-cols-2">
          <div className="rounded-[1.3rem] border border-white/14 bg-[linear-gradient(180deg,rgba(56,189,248,0.3),rgba(14,116,144,0.25))] p-3">
            <div className="flex items-center justify-between">
              <div className="text-xs font-black uppercase tracking-[0.14em] text-cyan-100">Plate Sun</div>
              <div className="rounded-full bg-black/28 px-2 py-0.5 text-[11px] font-black text-cyan-100">Need {challenge.requiredA}</div>
            </div>
            <div className="mt-3 text-center text-4xl font-black text-white md:text-5xl">{plateA}</div>
            <div className="mt-4 grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => adjustPlate('A', -1)}
                className="rounded-xl border border-white/22 bg-[linear-gradient(180deg,#1e293b,#0f172a)] px-3 py-2 text-sm font-black text-white shadow-[0_8px_14px_rgba(15,23,42,0.35)] active:translate-y-[1px]"
              >
                -1
              </button>
              <button
                type="button"
                onClick={() => adjustPlate('A', 1)}
                className="rounded-xl border border-amber-100/40 bg-[linear-gradient(180deg,#facc15,#f59e0b)] px-3 py-2 text-sm font-black text-slate-900 shadow-[0_8px_14px_rgba(217,119,6,0.35)] active:translate-y-[1px]"
              >
                +1
              </button>
            </div>
          </div>

          <div className="rounded-[1.3rem] border border-white/14 bg-[linear-gradient(180deg,rgba(34,197,94,0.28),rgba(22,101,52,0.22))] p-3">
            <div className="flex items-center justify-between">
              <div className="text-xs font-black uppercase tracking-[0.14em] text-emerald-100">Plate Moon</div>
              <div className="rounded-full bg-black/28 px-2 py-0.5 text-[11px] font-black text-emerald-100">Need {challenge.requiredB}</div>
            </div>
            <div className="mt-3 text-center text-4xl font-black text-white md:text-5xl">{plateB}</div>
            <div className="mt-4 grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => adjustPlate('B', -1)}
                className="rounded-xl border border-white/22 bg-[linear-gradient(180deg,#1e293b,#0f172a)] px-3 py-2 text-sm font-black text-white shadow-[0_8px_14px_rgba(15,23,42,0.35)] active:translate-y-[1px]"
              >
                -1
              </button>
              <button
                type="button"
                onClick={() => adjustPlate('B', 1)}
                className="rounded-xl border border-amber-100/40 bg-[linear-gradient(180deg,#facc15,#f59e0b)] px-3 py-2 text-sm font-black text-slate-900 shadow-[0_8px_14px_rgba(217,119,6,0.35)] active:translate-y-[1px]"
              >
                +1
              </button>
            </div>
          </div>
        </div>

        <div className="mt-3 grid grid-cols-1 gap-2 md:grid-cols-[1fr_auto_auto] md:items-center">
          <div className="rounded-[1rem] border border-white/14 bg-black/20 px-3 py-2 text-sm font-black text-white">
            Slices remaining: <span className={slicesRemaining === 0 ? 'text-emerald-300' : 'text-amber-200'}>{slicesRemaining}</span>
            <span className="ml-3 text-xs font-bold text-cyan-100/90">Streak: {streak}</span>
          </div>
          <button
            type="button"
            onClick={resetAllocation}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/18 bg-[linear-gradient(180deg,#1e3a8a,#172554)] px-4 py-2 text-xs font-black uppercase tracking-[0.12em] text-white shadow-[0_8px_14px_rgba(15,23,42,0.35)] active:translate-y-[1px]"
          >
            <RefreshCcw className="h-4 w-4" />
            Reset
          </button>
          <button
            type="button"
            onClick={submitAllocation}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-emerald-200/45 bg-[linear-gradient(180deg,#34d399,#10b981)] px-4 py-2 text-xs font-black uppercase tracking-[0.12em] text-emerald-950 shadow-[0_8px_14px_rgba(5,150,105,0.35)] active:translate-y-[1px]"
          >
            <Check className="h-4 w-4" />
            Serve Split
          </button>
        </div>
      </div>

      <div className="min-h-[2rem]">
        <AnimatePresence mode="wait">
          <motion.div
            key={`${feedback}-${feedbackTone}`}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            className={`ui-panel-unified rounded-[1rem] border px-3 py-2 text-sm font-black shadow-[0_10px_18px_rgba(15,23,42,0.25)] ${
              feedbackTone === 'good'
                ? 'border-emerald-200/50 bg-[linear-gradient(180deg,rgba(16,185,129,0.26),rgba(5,150,105,0.18))] text-emerald-100'
                : feedbackTone === 'bad'
                  ? 'border-rose-200/50 bg-[linear-gradient(180deg,rgba(244,63,94,0.28),rgba(190,24,93,0.18))] text-rose-100'
                  : 'border-white/14 bg-black/22 text-cyan-100'
            }`}
          >
            {feedback}
          </motion.div>
        </AnimatePresence>
      </div>

      <GameActionDock onBack={onBack} compact />

      {finished ? (
        <div className="absolute inset-0 z-40 flex items-center justify-center bg-[radial-gradient(circle,rgba(15,23,42,0.74),rgba(2,6,23,0.9))]">
          <div className="ui-panel-unified w-[min(92vw,26rem)] rounded-[1.6rem] border border-white/18 bg-[linear-gradient(180deg,rgba(30,64,175,0.88),rgba(15,23,42,0.9))] p-5 text-center shadow-[0_24px_40px_rgba(15,23,42,0.45)]">
            <Trophy className="mx-auto h-10 w-10 text-yellow-300" />
            <div className="mt-2 text-xl font-black text-white">Round Complete</div>
            <div className="mt-1 text-sm font-bold text-cyan-100">Score: {score}</div>
            <div className="mt-1 text-sm font-bold text-cyan-100">Solved: {challengesSolved}</div>
            <div className="mt-3 inline-flex items-center gap-2 rounded-full bg-black/22 px-3 py-1 text-xs font-black uppercase tracking-[0.14em] text-yellow-200">
              <AssetIcon name="star" className="h-4 w-4" />
              {resultStars > 0 ? `${resultStars} Star${resultStars > 1 ? 's' : ''}` : 'No Stars'}
            </div>
            <div className="mt-3 text-xs font-bold text-white/80">
              {resultStars > 0 ? 'Great serving run.' : 'Target score not reached this time.'}
            </div>
          </div>
        </div>
      ) : null}
    </FoodGameShell>
  );
};

export default ShareSplitterGame;
