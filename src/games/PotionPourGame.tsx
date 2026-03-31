import React, { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import {
  AlertTriangle,
  CheckCircle2,
  RotateCcw,
  Wand2,
} from 'lucide-react';
import {
  emitMiniGameSessionEvent,
  MiniGameShellContractProps,
} from '../app/gameplaySessionContract';
import potionBackground from '../assets/maps/tablekitchen.jpg';

interface PotionPourGameProps {
  levelId: number;
  avatarId: string;
  onVictory: (stars: number, XP: number) => void;
  onGameOver: (XP: number) => void;
  onBack: () => void;
}

type PotionPanicProps = PotionPourGameProps & MiniGameShellContractProps;
type FeedbackKind = 'success' | 'error' | null;

interface Ingredient {
  id: string;
  name: string;
  short: string;
  color: string;
  glow: string;
  rgb: [number, number, number];
}

interface Challenge {
  id: string;
  prompt: string;
  helperText: string;
  stage: number;
  activeIndices: number[];
  baseRatio: number[];
  scale: number;
  targetCounts: number[];
}

const INGREDIENTS: Ingredient[] = [
  { id: 'red', name: 'Ruby', short: 'R', color: '#ff4d6d', glow: 'rgba(255,77,109,0.82)', rgb: [255, 77, 109] },
  { id: 'blue', name: 'Azure', short: 'B', color: '#38bdf8', glow: 'rgba(56,189,248,0.82)', rgb: [56, 189, 248] },
  { id: 'green', name: 'Moss', short: 'G', color: '#22c55e', glow: 'rgba(34,197,94,0.82)', rgb: [34, 197, 94] },
  { id: 'gold', name: 'Sun', short: 'Y', color: '#facc15', glow: 'rgba(250,204,21,0.82)', rgb: [250, 204, 21] },
  { id: 'violet', name: 'Night', short: 'P', color: '#a855f7', glow: 'rgba(168,85,247,0.82)', rgb: [168, 85, 247] },
];

const SUCCESS_DELAY_MS = 760;
const ERROR_DELAY_MS = 820;
const BUMP_CLEAR_MS = 220;

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

const gcd = (a: number, b: number): number => {
  let x = Math.abs(a);
  let y = Math.abs(b);
  while (y !== 0) {
    const t = y;
    y = x % y;
    x = t;
  }
  return x || 1;
};

const simplifyRatio = (values: number[]) => {
  const positives = values.filter((v) => v > 0);
  if (!positives.length) return values;
  const divisor = positives.reduce((acc, v) => gcd(acc, v), positives[0] || 1);
  return values.map((v) => (v > 0 ? v / divisor : 0));
};

const randomPick = <T,>(list: T[]) => list[Math.floor(Math.random() * list.length)];

const shuffled = <T,>(list: T[]) => {
  const next = [...list];
  for (let i = next.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [next[i], next[j]] = [next[j], next[i]];
  }
  return next;
};

const SIMPLE_PAIR_RATIOS = [
  [1, 1],
  [2, 1],
  [3, 1],
  [3, 2],
] as const;

const SIMPLE_TRIPLE_RATIOS = [
  [1, 1, 1],
  [2, 1, 1],
  [2, 2, 1],
  [3, 1, 2],
] as const;

const HARDER_TRIPLE_RATIOS = [
  [3, 2, 1],
  [4, 2, 1],
  [3, 2, 2],
] as const;

const SCALE_FOUR_RATIOS = [
  [1, 1, 2, 2],
  [2, 1, 1, 2],
  [3, 2, 1, 2],
] as const;

let challengeSeed = 0;
const nextChallengeId = () => {
  challengeSeed += 1;
  return `potion-panic-${challengeSeed}`;
};

const stageFor = (levelId: number, solved: number) => clamp(1 + Math.floor((levelId - 1) / 3) + Math.floor(solved / 3), 1, 6);
const roundsToWinForLevel = (levelId: number) => 5 + Math.floor((levelId - 1) / 2);

const buildPrompt = (stage: number, active: Ingredient[], ratio: number[], scale: number, target: number[]) => {
  const total = target.reduce((a, b) => a + b, 0);
  const joinedNames = active.map((ingredient) => ingredient.name).join(':');
  const joinedRatio = ratio.join(':');

  if (stage === 1) {
    return `Add exactly ${target[0]} ${active[0].name} and ${target[1]} ${active[1].name} drops. This makes a ${joinedRatio} mix.`;
  }
  if (stage === 2) {
    return `Make ${total} drops altogether. Keep ${active[0].name}:${active[1].name} at ${ratio[0]}:${ratio[1]}.`;
  }
  if (stage === 3) {
    return `Make ${total} drops altogether. Keep ${joinedNames} at ${joinedRatio}.`;
  }
  if (stage === 4) {
    const knownIndex = 0;
    return `${active[knownIndex].name} must be ${target[knownIndex]} drops. Use the ratio ${joinedRatio} to work out the rest of ${joinedNames}.`;
  }
  if (stage === 5) {
    const knownIndex = 1;
    return `${active[knownIndex].name} is already ${target[knownIndex]} drops. Use the ratio ${joinedRatio} to finish the ${joinedNames} potion.`;
  }
  return `Scale the ratio ${joinedRatio} by x${scale}. Then brew the exact ${joinedNames} potion.`;
};

const buildHelperText = (stage: number) => {
  if (stage === 1) return 'Copy the exact drops named in the prompt, then press Brew.';
  if (stage <= 3) return 'Match both the total number of drops and the target ratio.';
  if (stage <= 5) return 'Use the known ingredient amount to work out one ratio part, then fill the rest.';
  return 'Multiply every part of the ratio by the scale so the final drop counts are exact.';
};

const pickRatioForStage = (stage: number): number[] => {
  if (stage === 1 || stage === 2) return [...randomPick(SIMPLE_PAIR_RATIOS)];
  if (stage === 3 || stage === 4) return [...randomPick(SIMPLE_TRIPLE_RATIOS)];
  if (stage === 5) return [...randomPick(HARDER_TRIPLE_RATIOS)];
  return [...randomPick(SCALE_FOUR_RATIOS)];
};

const generateChallenge = (levelId: number, solved: number): Challenge => {
  const stage = stageFor(levelId, solved);
  const ingredientCount = stage <= 2 ? 2 : stage <= 5 ? 3 : 4;
  const activeIndices = shuffled([0, 1, 2, 3, 4]).slice(0, ingredientCount).sort((a, b) => a - b);
  const baseRatio = pickRatioForStage(stage);
  const scale =
    stage === 1 ? 1
      : stage === 2 ? randomPick([2, 3])
        : stage === 3 ? randomPick([1, 2])
          : stage === 4 ? randomPick([2, 3])
            : stage === 5 ? randomPick([2, 3])
              : randomPick([2, 3]);
  const targetCounts = baseRatio.map((value) => value * scale);
  const activeIngredients = activeIndices.map((index) => INGREDIENTS[index]);

  return {
    id: nextChallengeId(),
    prompt: buildPrompt(stage, activeIngredients, baseRatio, scale, targetCounts),
    helperText: buildHelperText(stage),
    stage,
    activeIndices,
    baseRatio,
    scale,
    targetCounts,
  };
};

const starsForAccuracy = (correct: number, attempts: number) => {
  if (correct === 0) return 0;
  const accuracy = correct / Math.max(1, attempts);
  if (accuracy >= 0.9) return 3;
  if (accuracy >= 0.72) return 2;
  if (accuracy >= 0.55) return 1;
  return 0;
};

const PotionPourGame: React.FC<PotionPanicProps> = ({
  levelId,
  avatarId: _avatarId,
  onVictory,
  onGameOver,
  onBack: _onBack,
  sessionState,
  sessionEvents,
}) => {
  const [challenge, setChallenge] = useState<Challenge>(() => generateChallenge(levelId, 0));
  const [counts, setCounts] = useState<number[]>(() => Array.from({ length: INGREDIENTS.length }, () => 0));
  const [correctSolved, setCorrectSolved] = useState(0);
  const [attempts, setAttempts] = useState(0);
  const [feedback, setFeedback] = useState<FeedbackKind>(null);
  const [locked, setLocked] = useState(false);
  const [pressedIndex, setPressedIndex] = useState<number | null>(null);
  const [droplets, setDroplets] = useState<Array<{ id: string; index: number }>>([]);

  const endedRef = useRef(false);
  const feedbackTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const bumpTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (feedbackTimerRef.current) clearTimeout(feedbackTimerRef.current);
      if (bumpTimerRef.current) clearTimeout(bumpTimerRef.current);
    };
  }, []);

  const activeSet = useMemo(() => new Set(challenge.activeIndices), [challenge.activeIndices]);
  const targetByIngredient = useMemo(() => {
    const map = new Map<number, number>();
    challenge.activeIndices.forEach((index, ratioIndex) => {
      map.set(index, challenge.targetCounts[ratioIndex] || 0);
    });
    return map;
  }, [challenge.activeIndices, challenge.targetCounts]);

  const currentTotal = useMemo(() => counts.reduce((a, b) => a + b, 0), [counts]);
  const targetTotal = useMemo(() => challenge.targetCounts.reduce((a, b) => a + b, 0), [challenge.targetCounts]);
  const remainingTotal = Math.max(0, targetTotal - currentTotal);
  const activeIngredientSummary = useMemo(
    () => challenge.activeIndices.map((idx) => `${INGREDIENTS[idx].name} ${targetByIngredient.get(idx) ?? 0}`).join(' | '),
    [challenge.activeIndices, targetByIngredient],
  );
  const activeTargets = useMemo(
    () => challenge.activeIndices.map((idx) => ({
      index: idx,
      ingredient: INGREDIENTS[idx],
      current: counts[idx] || 0,
      target: targetByIngredient.get(idx) ?? 0,
    })),
    [challenge.activeIndices, counts, targetByIngredient],
  );

  const currentRatioForActive = useMemo(
    () => simplifyRatio(challenge.activeIndices.map((idx) => counts[idx] || 0)),
    [challenge.activeIndices, counts],
  );
  const targetRatioForActive = useMemo(() => simplifyRatio(challenge.targetCounts), [challenge.targetCounts]);

  const mixColor = useMemo(() => {
    const total = counts.reduce((a, b) => a + b, 0);
    if (total <= 0) return 'rgba(71,85,105,0.9)';
    let r = 0;
    let g = 0;
    let b = 0;
    counts.forEach((amount, idx) => {
      if (amount <= 0) return;
      const [cr, cg, cb] = INGREDIENTS[idx].rgb;
      const weight = amount / total;
      r += cr * weight;
      g += cg * weight;
      b += cb * weight;
    });
    return `rgba(${Math.round(r)}, ${Math.round(g)}, ${Math.round(b)}, 0.96)`;
  }, [counts]);

  useEffect(() => {
    if (!sessionState || endedRef.current) return;
    if (sessionState.timeLeft <= 0 || sessionState.lives <= 0) {
      endedRef.current = true;
      emitMiniGameSessionEvent(sessionEvents, 'game_failed', {
        XP: correctSolved * 100,
        reason: sessionState.timeLeft <= 0 ? 'time_up' : 'no_lives',
      });
      onGameOver(correctSolved * 100);
    }
  }, [correctSolved, onGameOver, sessionEvents, sessionState]);

  const handleTapIngredient = (index: number) => {
    if (locked || endedRef.current || !activeSet.has(index)) return;

    setCounts((prev) => {
      const next = [...prev];
      next[index] += 1;
      return next;
    });

    setPressedIndex(index);
    if (bumpTimerRef.current) clearTimeout(bumpTimerRef.current);
    bumpTimerRef.current = setTimeout(() => setPressedIndex(null), BUMP_CLEAR_MS);

    const dropId = `${Date.now()}-${index}-${Math.random()}`;
    setDroplets((prev) => [...prev, { id: dropId, index }]);
    setTimeout(() => {
      setDroplets((prev) => prev.filter((drop) => drop.id !== dropId));
    }, 550);
  };

  const resetCurrent = () => {
    if (locked || endedRef.current) return;
    setCounts(Array.from({ length: INGREDIENTS.length }, () => 0));
    setFeedback(null);
  };

  const onBrew = () => {
    if (locked || endedRef.current || currentTotal <= 0) return;

    setAttempts((prev) => prev + 1);
    const isCorrect = challenge.activeIndices.every((idx) => (counts[idx] || 0) === (targetByIngredient.get(idx) || 0))
      && counts.every((value, idx) => (activeSet.has(idx) ? true : value === 0));

    if (isCorrect) {
      const nextCorrect = correctSolved + 1;
      const scoreNow = nextCorrect * 100;
      const roundsGoal = roundsToWinForLevel(levelId);

      setLocked(true);
      setFeedback('success');
      setCorrectSolved(nextCorrect);
      emitMiniGameSessionEvent(sessionEvents, 'correct_answer', {
        XP: scoreNow,
        metadata: { round: nextCorrect, roundsGoal },
      });
      emitMiniGameSessionEvent(sessionEvents, 'puzzle_complete', {
        XP: scoreNow,
        metadata: { challengeId: challenge.id, stage: challenge.stage },
      });

      feedbackTimerRef.current = setTimeout(() => {
        if (endedRef.current) return;
        if (nextCorrect >= roundsGoal) {
          endedRef.current = true;
          const totalAttempts = attempts + 1;
          const stars = starsForAccuracy(nextCorrect, totalAttempts);
          emitMiniGameSessionEvent(sessionEvents, 'game_complete', {
            XP: scoreNow,
            stars,
            metadata: { totalAttempts, roundsGoal },
          });
          onVictory(stars, scoreNow);
          return;
        }
        setChallenge(generateChallenge(levelId, nextCorrect));
        setCounts(Array.from({ length: INGREDIENTS.length }, () => 0));
        setFeedback(null);
        setLocked(false);
      }, SUCCESS_DELAY_MS);
      return;
    }

    setLocked(true);
    setFeedback('error');
    emitMiniGameSessionEvent(sessionEvents, 'incorrect_answer', {
      XP: correctSolved * 100,
      metadata: { challengeId: challenge.id, stage: challenge.stage },
    });
    feedbackTimerRef.current = setTimeout(() => {
      if (endedRef.current) return;
      setCounts(Array.from({ length: INGREDIENTS.length }, () => 0));
      setFeedback(null);
      setLocked(false);
    }, ERROR_DELAY_MS);
  };

  return (
    <div className="relative h-full w-full overflow-hidden text-white">
      <img
        src={potionBackground}
        alt=""
        aria-hidden="true"
        draggable={false}
        className="absolute inset-0 h-full w-full object-cover"
      />
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(5,14,40,0.14)_0%,rgba(5,14,40,0.24)_42%,rgba(5,14,40,0.34)_100%)]" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_28%,rgba(56,189,248,0.12)_0%,rgba(56,189,248,0)_55%)]" />

      <div className="relative z-10 flex h-full min-h-0 flex-col px-3 pb-[calc(env(safe-area-inset-bottom)+4.4rem)] pt-2">
        <section className="shrink-0">
          <div className="mx-auto max-w-[760px] rounded-[1.35rem] border border-cyan-100/35 bg-slate-900/60 px-4 py-3 text-center shadow-[0_14px_28px_rgba(2,6,23,0.42)]">
            <p className="text-[11px] font-black uppercase tracking-[0.14em] text-cyan-200">
              Round {correctSolved + 1}/{roundsToWinForLevel(levelId)}
            </p>
            <p className="mt-1.5 text-[clamp(0.9rem,2.15vw,1.15rem)] font-black leading-snug text-cyan-50">
              {challenge.prompt}
            </p>
            <p className="mt-2 text-[10px] font-black uppercase tracking-[0.12em] text-cyan-100/80">
              Tap bottles to add drops. Match the target mix. Press Brew to check.
            </p>
            <p className="mt-1 text-[10px] font-black text-amber-100/90">
              {challenge.helperText}
            </p>
          </div>
        </section>

        <section className="relative mt-2 flex min-h-0 flex-[0_0_33%] items-center justify-center">
          <div className="pointer-events-none absolute left-1/2 top-[56%] h-[52%] w-[62%] -translate-x-1/2 -translate-y-1/2 rounded-full bg-cyan-300/30 blur-[24px]" />
          <motion.div
            animate={feedback === 'error' ? { x: [0, -8, 8, -5, 5, 0] } : { x: 0 }}
            transition={{ duration: 0.35 }}
            className="relative h-[clamp(194px,29vh,252px)] w-[clamp(246px,68vw,350px)]"
          >
            <div className="absolute left-1/2 top-0 h-[18%] w-[78%] -translate-x-1/2 rounded-full border-4 border-slate-700/95 bg-slate-800/95 shadow-[0_10px_16px_rgba(2,6,23,0.45)]" />
            <div className="absolute inset-x-[9%] top-[14%] bottom-[14%] overflow-hidden rounded-[42%] border-[5px] border-slate-700/95 bg-slate-900/70 shadow-[inset_0_10px_24px_rgba(2,6,23,0.55)]">
              <motion.div
                className="absolute inset-x-[4%] bottom-[4%] rounded-[40%]"
                style={{
                  background: `linear-gradient(180deg, rgba(255,255,255,0.34) 0%, ${mixColor} 18%, rgba(15,23,42,0.18) 100%)`,
                  boxShadow: `0 0 30px ${mixColor}`,
                }}
                animate={{ height: `${Math.min(95, Math.max(12, (currentTotal / Math.max(1, targetTotal * 1.15)) * 100))}%` }}
                transition={{ duration: 0.32, ease: 'easeOut' }}
              />
              {Array.from({ length: 9 }).map((_, idx) => (
                <motion.span
                  key={`bubble-${idx}`}
                  className="absolute bottom-0 h-3.5 w-3.5 rounded-full bg-white/55"
                  style={{ left: `${10 + idx * 9}%` }}
                  animate={{ y: [0, -22 - (idx % 3) * 10, -4], opacity: [0, 0.9, 0], scale: [0.7, 1.15, 0.8] }}
                  transition={{ repeat: Infinity, duration: 1.2 + (idx % 4) * 0.2, delay: idx * 0.08, ease: 'easeOut' }}
                />
              ))}
            </div>
            <div className="absolute bottom-0 left-1/2 h-[16%] w-[52%] -translate-x-1/2 rounded-[999px] bg-slate-900/85 blur-[0.5px]" />

            <AnimatePresence>
              {feedback === 'success' ? (
                <motion.div
                  initial={{ opacity: 0, scale: 0.85 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 1.08 }}
                  className="absolute left-1/2 top-[42%] -translate-x-1/2 -translate-y-1/2 rounded-full border border-emerald-200/80 bg-emerald-400/90 px-4 py-1.5 text-[11px] font-black uppercase tracking-[0.14em] text-slate-900 shadow-[0_0_26px_rgba(52,211,153,0.7)]"
                >
                  Potion Stable
                </motion.div>
              ) : null}
            </AnimatePresence>
          </motion.div>
        </section>

        <section className="mt-1.5 shrink-0">
          <div className="mx-auto w-full max-w-[760px] rounded-2xl border border-cyan-100/35 bg-slate-900/58 p-2.5">
            <div className="rounded-xl border border-cyan-100/30 bg-slate-950/52 px-3 py-2 text-center">
              <p className="text-[10px] font-black uppercase tracking-[0.14em] text-cyan-100">
                Need: {activeIngredientSummary}
              </p>
              <div className="mt-2 flex items-center justify-between gap-2 text-[10px] font-black uppercase tracking-[0.12em] text-cyan-100">
                <span>Total {currentTotal}/{targetTotal}</span>
                <span>{remainingTotal === 0 ? 'Ready to brew' : `${remainingTotal} drops left`}</span>
              </div>
            </div>
            <div className="mt-2 grid grid-cols-2 gap-1.5 sm:grid-cols-4">
              {activeTargets.map(({ ingredient, current, target }) => {
                const progress = target <= 0 ? 0 : Math.min(100, (current / target) * 100);
                return (
                  <div
                    key={`goal-${ingredient.id}`}
                    className="rounded-xl border border-cyan-100/30 bg-slate-950/52 px-2 py-2"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[9px] font-black uppercase tracking-[0.08em] text-cyan-100">
                        {ingredient.name}
                      </span>
                      <span className="text-[9px] font-black uppercase tracking-[0.08em] text-amber-100">
                        {current}/{target}
                      </span>
                    </div>
                    <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-slate-800/85">
                      <div
                        className="h-full rounded-full transition-[width] duration-300"
                        style={{
                          width: `${progress}%`,
                          background: `linear-gradient(90deg, ${ingredient.color} 0%, rgba(255,255,255,0.92) 100%)`,
                          boxShadow: `0 0 12px ${ingredient.glow}`,
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="mt-2 flex items-center justify-between rounded-xl border border-cyan-100/30 bg-slate-950/52 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.12em] text-cyan-100">
              <span>You made {currentRatioForActive.join(':')}</span>
              <span>Need {targetRatioForActive.join(':')}</span>
            </div>
            <div className="grid grid-cols-5 gap-1.5">
              {INGREDIENTS.map((ingredient, index) => {
                const active = activeSet.has(index);
                const targetCount = targetByIngredient.get(index) ?? 0;
                const currentCount = counts[index] || 0;
                const remainingCount = Math.max(0, targetCount - currentCount);
                return (
                  <div
                    key={`tracker-${ingredient.id}`}
                    className={`rounded-xl border px-1.5 py-1 text-center ${
                      active ? 'border-cyan-100/35 bg-slate-950/55' : 'border-slate-500/25 bg-slate-900/35 opacity-45'
                    }`}
                  >
                    <p className="text-[9px] font-black uppercase tracking-[0.1em] text-cyan-200">
                      {ingredient.name}
                    </p>
                    <p className="text-sm font-black text-white">{currentCount}/{targetCount}</p>
                    {active ? (
                      <p className="text-[9px] font-black text-amber-100/85">
                        {remainingCount === 0 ? 'Done' : `${remainingCount} left`}
                      </p>
                    ) : (
                      <p className="text-[9px] font-black text-slate-300/70">Not used</p>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        <section className="mt-2 flex shrink-0 flex-[0_0_22%] items-center">
          <div className="mx-auto grid w-full max-w-[760px] grid-cols-5 gap-2">
            {INGREDIENTS.map((ingredient, index) => {
              const active = activeSet.has(index);
              const count = counts[index] || 0;
              const targetCount = targetByIngredient.get(index) ?? 0;
              return (
                <motion.button
                  key={ingredient.id}
                  type="button"
                  whileTap={active ? { scale: 0.94 } : {}}
                  animate={pressedIndex === index ? { y: [-1, -6, 0], scale: [1, 1.06, 1] } : { y: 0, scale: 1 }}
                  transition={{ duration: 0.2 }}
                  onClick={() => handleTapIngredient(index)}
                  disabled={!active || locked}
                  className={`relative h-[clamp(84px,12.2vh,108px)] rounded-[1.25rem] border p-1.5 text-left transition ${
                      active
                        ? 'border-cyan-100/50 bg-slate-900/74 shadow-[0_12px_18px_rgba(2,6,23,0.38)]'
                        : 'border-slate-500/30 bg-slate-900/35 opacity-45 grayscale'
                  }`}
                  style={{ boxShadow: active ? `0 10px 18px rgba(2,6,23,0.36), 0 0 26px ${ingredient.glow}` : undefined }}
                >
                  <div className="pointer-events-none absolute inset-x-2 top-2 h-2 rounded-full bg-white/14 blur-[1px]" />
                  <div className="mx-auto h-[74%] w-[72%] rounded-[0.95rem] border border-white/35 bg-slate-950/45 p-1.5">
                    <div
                      className="h-full w-full rounded-[0.75rem]"
                      style={{
                        background: `linear-gradient(180deg, rgba(255,255,255,0.38) 0%, ${ingredient.color} 24%, rgba(15,23,42,0.28) 100%)`,
                        boxShadow: `0 0 18px ${ingredient.glow}, inset 0 0 16px rgba(255,255,255,0.16)`,
                      }}
                    />
                  </div>
                  <span className="pointer-events-none absolute bottom-1 left-1/2 -translate-x-1/2 text-[10px] font-black uppercase tracking-[0.07em] text-cyan-50">
                    Add {ingredient.name}
                  </span>
                  <span className="pointer-events-none absolute right-1.5 top-1.5 flex h-5 min-w-5 items-center justify-center rounded-full border border-white/45 bg-slate-950/80 px-1 text-[10px] font-black text-white">
                    {count}
                  </span>
                  {active ? (
                    <span className="pointer-events-none absolute left-1.5 top-1.5 rounded-full border border-amber-200/50 bg-slate-950/80 px-1.5 py-[1px] text-[9px] font-black uppercase tracking-[0.04em] text-amber-100">
                      Goal {targetCount}
                    </span>
                  ) : null}
                </motion.button>
              );
            })}
          </div>
        </section>

        <section className="mt-2 flex shrink-0 flex-col gap-2">
          <div className="mx-auto flex w-full max-w-[760px] items-center gap-2">
            <motion.button
              type="button"
              whileTap={{ scale: 0.97 }}
              onClick={resetCurrent}
              disabled={locked}
              className="inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-full border border-cyan-100/45 bg-slate-900/70 text-xs font-black uppercase tracking-[0.12em] text-cyan-50 disabled:opacity-50"
            >
              <RotateCcw className="h-4 w-4" />
              Reset
            </motion.button>
            <motion.button
              type="button"
              whileTap={{ scale: 0.97 }}
              onClick={onBrew}
              disabled={locked || currentTotal <= 0}
              className={`inline-flex h-12 flex-[1.6] items-center justify-center gap-2 rounded-full border px-4 text-sm font-black uppercase tracking-[0.13em] transition ${
                locked || currentTotal <= 0
                  ? 'border-slate-500/40 bg-slate-900/52 text-slate-400'
                  : 'border-amber-100/85 bg-[linear-gradient(180deg,#fde68a_0%,#f59e0b_100%)] text-amber-950 shadow-[0_12px_20px_rgba(180,83,9,0.48)]'
              }`}
            >
              <Wand2 className="h-5 w-5" />
              Brew
            </motion.button>
          </div>
        </section>
      </div>

      <AnimatePresence>
        {feedback ? (
          <motion.div
            key={feedback}
            initial={{ opacity: 0, scale: 0.85, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: -10 }}
            className="pointer-events-none absolute left-1/2 top-[36%] z-40 -translate-x-1/2"
          >
            <div
              className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-[11px] font-black uppercase tracking-[0.13em] ${
                feedback === 'success'
                  ? 'border-emerald-200/80 bg-emerald-400/95 text-slate-950 shadow-[0_0_28px_rgba(52,211,153,0.75)]'
                  : 'border-rose-200/80 bg-rose-500/95 text-white shadow-[0_0_28px_rgba(244,63,94,0.75)]'
              }`}
            >
              {feedback === 'success' ? <CheckCircle2 className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />}
              {feedback === 'success' ? 'Perfect Brew' : 'Unstable Mix'}
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>

      {droplets.map((drop) => {
        const ingredient = INGREDIENTS[drop.index];
        const left = `${12 + drop.index * 19}%`;
        return (
          <motion.span
            key={drop.id}
            className="pointer-events-none absolute z-30 h-3.5 w-3.5 rounded-full"
            style={{
              left,
              bottom: '33%',
              backgroundColor: ingredient.color,
              boxShadow: `0 0 10px ${ingredient.glow}`,
            }}
            initial={{ y: 0, opacity: 0.9, scale: 0.9 }}
            animate={{ y: -140, x: 14 - drop.index * 3, opacity: 0, scale: 0.55 }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
          />
        );
      })}

    </div>
  );
};

export default PotionPourGame;

