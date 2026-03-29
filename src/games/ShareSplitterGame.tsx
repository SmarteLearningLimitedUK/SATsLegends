import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import confetti from 'canvas-confetti';
import { Check, RefreshCcw, Timer as TimerIcon, Trophy } from 'lucide-react';
import FoodGameShell from '../components/FoodGameShell';
import GameActionDock from '../components/GameActionDock';
import AssetIcon from '../components/AssetIcon';
import { TAKE_OUT_ASSETS } from '../assets/take_out';
import { BOSS_ASSETS } from '../assets/bosses';
import goblinAsset from '../assets/bosses/goblin.png';
import takeOutLevelBg from '../assets/level_backgrounds/take_out.png';
import coinAsset from '../assets/fantasy_hero/ui/coin.png';

interface ShareSplitterGameProps {
  levelId: number;
  avatarId: string;
  onVictory: (stars: number, XP: number) => void;
  onGameOver: (XP: number) => void;
  onBack: () => void;
}

interface ShareChallenge {
  totalSlices: number;
  prompt: string;
  requiredPerMonster: number[];
}

type FeedbackTone = 'good' | 'bad' | 'neutral';

type MonsterSeat = {
  left: string;
  top: string;
};

const ROUND_DURATION_SECONDS = 90;
const BASE_TARGET_SCORE = 1200;
const TARGET_SCORE_PER_LEVEL = 180;
const MONSTER_COUNT = 5;

const MONSTER_SEATS: MonsterSeat[] = [
  { left: '50%', top: '14%' },
  { left: '80%', top: '36%' },
  { left: '68%', top: '74%' },
  { left: '32%', top: '74%' },
  { left: '20%', top: '36%' },
];

const MONSTER_AVATARS: string[] = [
  goblinAsset,
  BOSS_ASSETS.cyclops_slime.poses.neutral || goblinAsset,
  BOSS_ASSETS.jelly.poses.neutral || goblinAsset,
  BOSS_ASSETS.hydra.poses.neutral || goblinAsset,
  BOSS_ASSETS.croc_boss.poses.neutral || goblinAsset,
];

const createEmptyPlates = () => Array.from({ length: MONSTER_COUNT }, () => [] as string[]);

const createSlicePool = (totalSlices: number) =>
  Array.from({ length: totalSlices }, (_, index) => `slice-${Date.now()}-${index}`);

const formatTimer = (seconds: number) => {
  const safe = Math.max(0, seconds);
  const mins = Math.floor(safe / 60);
  const secs = safe % 60;
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
};

const createChallenge = (levelId: number): ShareChallenge => {
  const equalShareMode = levelId <= 3;

  if (equalShareMode) {
    const eachGets = Math.min(2 + Math.floor(levelId / 2), 4);
    const totalSlices = eachGets * MONSTER_COUNT;
    return {
      totalSlices,
      prompt: `Share equally: each monster must get ${eachGets} slice${eachGets === 1 ? '' : 's'}.`,
      requiredPerMonster: Array.from({ length: MONSTER_COUNT }, () => eachGets),
    };
  }

  const maxPerMonster = levelId <= 6 ? 4 : 5;
  const minPerMonster = 1;
  const requiredPerMonster = Array.from(
    { length: MONSTER_COUNT },
    () => Math.floor(Math.random() * (maxPerMonster - minPerMonster + 1)) + minPerMonster,
  );

  if (requiredPerMonster.every((value) => value === requiredPerMonster[0])) {
    const randomIndex = Math.floor(Math.random() * MONSTER_COUNT);
    requiredPerMonster[randomIndex] = Math.min(maxPerMonster, requiredPerMonster[randomIndex] + 1);
  }

  const totalSlices = requiredPerMonster.reduce((sum, value) => sum + value, 0);

  return {
    totalSlices,
    prompt: 'Select a cake slice, then place slices onto each monster plate to match the required counts.',
    requiredPerMonster,
  };
};

const ShareSplitterGame: React.FC<ShareSplitterGameProps> = ({
  levelId,
  avatarId: _avatarId,
  onVictory,
  onGameOver,
  onBack,
}) => {
  const [XP, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(ROUND_DURATION_SECONDS);
  const [Combo, setStreak] = useState(0);
  const [challengesSolved, setChallengesSolved] = useState(0);
  const [challenge, setChallenge] = useState<ShareChallenge>(() => createChallenge(levelId));
  const [plates, setPlates] = useState<string[][]>(() => createEmptyPlates());
  const [availableSlices, setAvailableSlices] = useState<string[]>(() => createSlicePool(challenge.totalSlices));
  const [selectedSliceId, setSelectedSliceId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string>('Select cake slices and share them between all five monsters.');
  const [feedbackTone, setFeedbackTone] = useState<FeedbackTone>('neutral');
  const [submitting, setSubmitting] = useState(false);
  const [finished, setFinished] = useState(false);

  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const endedRef = useRef(false);

  const targetScore = BASE_TARGET_SCORE + (levelId * TARGET_SCORE_PER_LEVEL);
  const usedSlices = plates.reduce((sum, plate) => sum + plate.length, 0);
  const slicesRemaining = Math.max(0, challenge.totalSlices - usedSlices);
  const progressPct = Math.min((XP / targetScore) * 100, 100);

  const resultStars = useMemo(() => {
    if (XP >= targetScore * 1.8) return 3;
    if (XP >= targetScore * 1.35) return 2;
    if (XP >= targetScore) return 1;
    return 0;
  }, [XP, targetScore]);

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
    const next = createChallenge(levelId);
    setChallenge(next);
    setPlates(createEmptyPlates());
    setAvailableSlices(createSlicePool(next.totalSlices));
    setSelectedSliceId(null);
    setSubmitting(false);
  }, [levelId]);

  useEffect(() => {
    endedRef.current = false;
    clearTransitionTimer();
    const firstChallenge = createChallenge(levelId);
    setScore(0);
    setTimeLeft(ROUND_DURATION_SECONDS);
    setStreak(0);
    setChallengesSolved(0);
    setChallenge(firstChallenge);
    setPlates(createEmptyPlates());
    setAvailableSlices(createSlicePool(firstChallenge.totalSlices));
    setSelectedSliceId(null);
    setSubmitting(false);
    setFeedback('Select cake slices and share them between all five monsters.');
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
          finishRun(XP);
          return 0;
        }
        return previous - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [finishRun, finished, XP, submitting]);

  const selectPoolSlice = (sliceId: string) => {
    if (finished || submitting) return;
    setSelectedSliceId(sliceId);
  };

  const placeOnPlate = (plateIndex: number) => {
    if (!selectedSliceId || finished || submitting) return;

    if (!availableSlices.includes(selectedSliceId)) {
      setSelectedSliceId(null);
      return;
    }

    setAvailableSlices((previous) => previous.filter((sliceId) => sliceId !== selectedSliceId));
    setPlates((previous) => previous.map((plate, index) => (
      index === plateIndex ? [...plate, selectedSliceId] : plate
    )));
    setSelectedSliceId(null);
  };

  const removeFromPlate = (plateIndex: number, sliceId: string) => {
    if (finished || submitting) return;

    setPlates((previous) => previous.map((plate, index) => (
      index === plateIndex ? plate.filter((entry) => entry !== sliceId) : plate
    )));
    setAvailableSlices((previous) => [...previous, sliceId]);
    if (selectedSliceId === sliceId) {
      setSelectedSliceId(null);
    }
  };

  const resetAllocation = () => {
    if (submitting || finished) return;
    const allPlaced = plates.flat();
    setPlates(createEmptyPlates());
    setAvailableSlices((previous) => [...previous, ...allPlaced]);
    setSelectedSliceId(null);
    setFeedback('Slices reset. Re-serve the table.');
    setFeedbackTone('neutral');
  };

  const submitAllocation = () => {
    if (submitting || finished) return;

    if (availableSlices.length > 0) {
      setFeedback(`Serve all ${challenge.totalSlices} cake slices before confirming.`);
      setFeedbackTone('bad');
      setStreak(0);
      setScore((previous) => Math.max(0, previous - 40));
      return;
    }

    setSubmitting(true);

    const correct = plates.every((plate, index) => plate.length === challenge.requiredPerMonster[index]);

    if (correct) {
      const gain = 180 + Math.floor(timeLeft * 1.4) + (Combo * 35);
      const nextScore = XP + gain;
      const nextSolved = challengesSolved + 1;
      setScore(nextScore);
      setStreak((previous) => previous + 1);
      setChallengesSolved(nextSolved);
      setFeedback(`Perfect sharing! +${gain} points.`);
      setFeedbackTone('good');

      confetti({
        particleCount: 42,
        spread: 54,
        origin: { y: 0.64 },
        colors: ['#facc15', '#38bdf8', '#4ade80'],
      });

      clearTransitionTimer();
      timeoutRef.current = setTimeout(() => {
        if (timeLeft <= 1) {
          finishRun(nextScore);
          return;
        }
        nextChallenge();
      }, 700);
      return;
    }

    setStreak(0);
    setScore((previous) => Math.max(0, previous - 70));
    setFeedback('Some plates are incorrect. Match each monster\'s required slices.');
    setFeedbackTone('bad');

    clearTransitionTimer();
    timeoutRef.current = setTimeout(() => {
      nextChallenge();
    }, 820);
  };

  return (
    <FoodGameShell gameType="take_out_rush" backgroundImage={takeOutLevelBg}>
      <div className="ui-panel-unified flex items-center justify-between gap-2 rounded-[1.2rem] border border-white/16 bg-[linear-gradient(180deg,rgba(14,116,144,0.82),rgba(30,64,175,0.84))] px-3 py-2 text-white shadow-[0_10px_22px_rgba(15,23,42,0.3)] md:px-4">
        <div className="flex items-center gap-2 rounded-full bg-black/20 px-2 py-1">
          <img src={coinAsset} alt="" className="h-4 w-4 md:h-5 md:w-5" draggable={false} />
          <span className="text-xs font-black md:text-sm">{XP}</span>
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
        <div className="text-[11px] font-black uppercase tracking-[0.14em] text-slate-800/75">Share Splitter: Monster Feast</div>
        <div className="mt-1 text-lg font-black leading-tight md:text-2xl">{challenge.prompt}</div>
        <div className="mt-1 text-xs font-bold text-slate-700 md:text-sm">Total cake slices to serve: {challenge.totalSlices}</div>
      </div>

      <div className="ui-panel-unified flex min-h-0 flex-1 flex-col rounded-[1.5rem] border border-white/14 bg-[linear-gradient(180deg,rgba(30,64,175,0.78),rgba(8,47,73,0.82))] p-3 shadow-[0_16px_30px_rgba(15,23,42,0.3)] md:p-4">
        <div className="mb-3 h-3 overflow-hidden rounded-full bg-black/26">
          <motion.div
            className="h-full rounded-full bg-[linear-gradient(90deg,#22d3ee,#facc15)]"
            animate={{ width: `${progressPct}%` }}
            transition={{ duration: 0.35, ease: 'easeOut' }}
          />
        </div>

        <div className="relative min-h-0 flex-1 overflow-hidden rounded-[1.4rem] border border-white/14 bg-[radial-gradient(circle_at_center,rgba(14,165,233,0.18),rgba(15,23,42,0.58)_66%)] p-2 md:p-4">
          <div className="pointer-events-none absolute left-1/2 top-1/2 h-[42%] w-[60%] -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/18 bg-[radial-gradient(circle,rgba(250,204,21,0.18),rgba(15,23,42,0.12)_72%)]" />

          {MONSTER_SEATS.map((seat, index) => {
            const target = challenge.requiredPerMonster[index] ?? 0;
            const served = plates[index]?.length ?? 0;
            const avatar = MONSTER_AVATARS[index % MONSTER_AVATARS.length];
            const meetsTarget = served === target;

            return (
              <div
                key={`monster-seat-${index + 1}`}
                className="absolute -translate-x-1/2 -translate-y-1/2"
                style={{ left: seat.left, top: seat.top }}
              >
                <div className="flex flex-col items-center gap-1">
                  <img
                    src={avatar}
                    alt={`Monster ${index + 1}`}
                    className="h-12 w-12 object-contain drop-shadow-[0_8px_12px_rgba(15,23,42,0.35)] md:h-14 md:w-14"
                    draggable={false}
                  />

                  <button
                    type="button"
                    onClick={() => placeOnPlate(index)}
                    className={`min-h-[3.4rem] min-w-[4.3rem] rounded-[1rem] border px-1.5 py-1 transition-all md:min-h-[3.8rem] md:min-w-[4.8rem] ${
                      selectedSliceId
                        ? 'border-amber-200/65 bg-[linear-gradient(180deg,rgba(251,191,36,0.3),rgba(245,158,11,0.2))] shadow-[0_10px_16px_rgba(217,119,6,0.28)]'
                        : 'border-white/20 bg-[linear-gradient(180deg,rgba(30,41,59,0.72),rgba(15,23,42,0.72))]'
                    }`}
                  >
                    <div className="grid max-h-11 grid-cols-4 justify-items-center gap-0.5 overflow-hidden md:max-h-12">
                      {plates[index].slice(0, 8).map((sliceId) => (
                        <button
                          key={sliceId}
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation();
                            removeFromPlate(index, sliceId);
                          }}
                          className="rounded-md p-[1px] transition-transform hover:scale-110"
                          title="Return slice"
                        >
                          <img
                            src={TAKE_OUT_ASSETS.portionQuarter}
                            alt="Cake slice"
                            className="h-3.5 w-3.5 object-contain md:h-4 md:w-4"
                            draggable={false}
                          />
                        </button>
                      ))}
                    </div>
                  </button>

                  <div className={`rounded-full px-2 py-0.5 text-[10px] font-black uppercase tracking-[0.12em] ${
                    meetsTarget
                      ? 'bg-emerald-500/24 text-emerald-100'
                      : 'bg-black/26 text-cyan-100'
                  }`}>
                    Need {target} • Have {served}
                  </div>
                </div>
              </div>
            );
          })}

          <div className="absolute left-1/2 top-1/2 flex -translate-x-1/2 -translate-y-1/2 flex-col items-center gap-1 rounded-[1rem] border border-white/16 bg-black/24 px-3 py-2 text-center">
            <img src={TAKE_OUT_ASSETS.trayBase} alt="Cake tray" className="h-8 w-14 object-contain md:h-9 md:w-16" draggable={false} />
            <div className="text-[10px] font-black uppercase tracking-[0.12em] text-cyan-100">Table Center</div>
          </div>
        </div>

        <div className="mt-3 rounded-[1.2rem] border border-white/14 bg-black/22 px-3 py-2">
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
            <div className="text-[11px] font-black uppercase tracking-[0.12em] text-cyan-100">Cake Supply</div>
            <div className="rounded-full bg-black/24 px-2 py-0.5 text-[11px] font-black text-white">
              Remaining: <span className={slicesRemaining === 0 ? 'text-emerald-300' : 'text-amber-200'}>{slicesRemaining}</span>
              <span className="ml-3 text-cyan-100/90">Combo: {Combo}</span>
            </div>
          </div>

          <div className="max-h-[5.7rem] overflow-hidden pr-1">
            <div className="flex flex-wrap gap-1.5">
              {availableSlices.map((sliceId) => (
                <button
                  key={sliceId}
                  type="button"
                  onClick={() => selectPoolSlice(sliceId)}
                  className={`rounded-lg border p-1 transition-all ${
                    selectedSliceId === sliceId
                      ? 'border-amber-200/70 bg-[linear-gradient(180deg,rgba(250,204,21,0.38),rgba(217,119,6,0.28))] shadow-[0_10px_16px_rgba(217,119,6,0.3)]'
                      : 'border-white/18 bg-[linear-gradient(180deg,rgba(15,23,42,0.62),rgba(30,41,59,0.6))] hover:border-cyan-200/55'
                  }`}
                  title="Select slice"
                >
                  <img
                    src={TAKE_OUT_ASSETS.portionQuarter}
                    alt="Cake slice"
                    className="h-5 w-5 object-contain md:h-6 md:w-6"
                    draggable={false}
                  />
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-3 grid grid-cols-1 gap-2 md:grid-cols-[1fr_auto_auto] md:items-center">
          <div className="rounded-[1rem] border border-white/14 bg-black/20 px-3 py-2 text-xs font-black text-cyan-100 md:text-sm">
            Tap a slice, then tap a monster plate. Tap a placed slice to return it.
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
            Serve Table
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
            <div className="mt-1 text-sm font-bold text-cyan-100">XP: {XP}</div>
            <div className="mt-1 text-sm font-bold text-cyan-100">Solved: {challengesSolved}</div>
            <div className="mt-3 inline-flex items-center gap-2 rounded-full bg-black/22 px-3 py-1 text-xs font-black uppercase tracking-[0.14em] text-yellow-200">
              <AssetIcon name="star" className="h-4 w-4" />
              {resultStars > 0 ? `${resultStars} Star${resultStars > 1 ? 's' : ''}` : 'No Stars'}
            </div>
            <div className="mt-3 text-xs font-bold text-white/80">
              {resultStars > 0 ? 'Great serving run.' : 'Target XP not reached this time.'}
            </div>
          </div>
        </div>
      ) : null}
    </FoodGameShell>
  );
};

export default ShareSplitterGame;

