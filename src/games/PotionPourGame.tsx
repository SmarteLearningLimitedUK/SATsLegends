import React, { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import {
  CheckCircle2,
  RotateCcw,
  Wand2,
} from 'lucide-react';
import {
  emitMiniGameSessionEvent,
  MiniGameShellContractProps,
} from '../app/gameplaySessionContract';

interface PotionPourGameProps {
  levelId: number;
  avatarId: string;
  onVictory: (stars: number, XP: number) => void;
  onGameOver: (XP: number) => void;
  onBack: () => void;
}

type PotionPanicProps = PotionPourGameProps & MiniGameShellContractProps;
type FeedbackKind = 'success' | null;

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
    return `${active[0].name} ${target[0]}, ${active[1].name} ${target[1]}.`;
  }
  if (stage === 2) {
    return `${total} drops total. ${active[0].name}:${active[1].name} = ${ratio[0]}:${ratio[1]}.`;
  }
  if (stage === 3) {
    return `${total} drops total. ${joinedNames} = ${joinedRatio}.`;
  }
  if (stage === 4) {
    const knownIndex = 0;
    return `${active[knownIndex].name} is ${target[knownIndex]}. Finish ${joinedNames}.`;
  }
  if (stage === 5) {
    const knownIndex = 1;
    return `${active[knownIndex].name} is ${target[knownIndex]}. Finish ${joinedNames}.`;
  }
  return `Scale ${joinedRatio} by x${scale}.`;
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

const joinWithAnd = (parts: string[]) => {
  if (parts.length <= 1) return parts[0] || '';
  if (parts.length === 2) return `${parts[0]} and ${parts[1]}`;
  return `${parts.slice(0, -1).join(', ')}, and ${parts[parts.length - 1]}`;
};

interface DragState {
  index: number;
  pointerId: number;
  x: number;
  y: number;
}

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
  const [droplets, setDroplets] = useState<Array<{ id: string; index: number }>>([]);
  const [dragState, setDragState] = useState<DragState | null>(null);
  const [cauldronArmed, setCauldronArmed] = useState(false);

  const endedRef = useRef(false);
  const feedbackTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cauldronRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    return () => {
      if (feedbackTimerRef.current) clearTimeout(feedbackTimerRef.current);
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
  const activeTargets = useMemo(
    () => challenge.activeIndices.map((idx) => ({
      ingredient: INGREDIENTS[idx],
      current: counts[idx] || 0,
      target: targetByIngredient.get(idx) ?? 0,
      remaining: Math.max(0, (targetByIngredient.get(idx) ?? 0) - (counts[idx] || 0)),
    })),
    [challenge.activeIndices, counts, targetByIngredient],
  );
  const isRecipeComplete = useMemo(
    () => activeTargets.length > 0 && activeTargets.every(({ current, target }) => current === target),
    [activeTargets],
  );
  const overfilledTargets = useMemo(
    () => activeTargets.filter(({ current, target }) => current > target),
    [activeTargets],
  );
  const remainingTargets = useMemo(
    () => activeTargets.filter(({ remaining }) => remaining > 0),
    [activeTargets],
  );
  const helperText = useMemo(() => {
    if (isRecipeComplete) return 'Perfect! You are ready to brew.';
    if (overfilledTargets.length > 0) {
      return `Too much ${joinWithAnd(overfilledTargets.map(({ ingredient }) => ingredient.name))}. Reset and try again.`;
    }
    if (remainingTargets.length > 0) {
      return `Add ${joinWithAnd(remainingTargets.map(({ ingredient, remaining }) => `${remaining} ${ingredient.name}`))} to brew.`;
    }
    return 'Build the recipe to brew.';
  }, [isRecipeComplete, overfilledTargets, remainingTargets]);

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

  const addIngredient = (index: number) => {
    if (locked || endedRef.current || !activeSet.has(index)) return;

    setCounts((prev) => {
      const next = [...prev];
      next[index] += 1;
      return next;
    });

    const dropId = `${Date.now()}-${index}-${Math.random()}`;
    setDroplets((prev) => [...prev, { id: dropId, index }]);
    setTimeout(() => {
      setDroplets((prev) => prev.filter((drop) => drop.id !== dropId));
    }, 550);
  };

  useEffect(() => {
    if (!dragState) return undefined;

    const updateCauldronHover = (clientX: number, clientY: number) => {
      const cauldronBounds = cauldronRef.current?.getBoundingClientRect();
      if (!cauldronBounds) {
        setCauldronArmed(false);
        return false;
      }
      const hovering =
        clientX >= cauldronBounds.left
        && clientX <= cauldronBounds.right
        && clientY >= cauldronBounds.top
        && clientY <= cauldronBounds.bottom;
      setCauldronArmed(hovering);
      return hovering;
    };

    const handlePointerMove = (event: PointerEvent) => {
      if (event.pointerId !== dragState.pointerId) return;
      updateCauldronHover(event.clientX, event.clientY);
      setDragState((prev) => (
        prev && prev.pointerId === event.pointerId
          ? { ...prev, x: event.clientX, y: event.clientY }
          : prev
      ));
    };

    const handlePointerUp = (event: PointerEvent) => {
      if (event.pointerId !== dragState.pointerId) return;
      const droppedInCauldron = updateCauldronHover(event.clientX, event.clientY);
      const draggedIndex = dragState.index;
      setDragState(null);
      setCauldronArmed(false);
      if (droppedInCauldron) addIngredient(draggedIndex);
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
    window.addEventListener('pointercancel', handlePointerUp);

    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
      window.removeEventListener('pointercancel', handlePointerUp);
    };
  }, [activeSet, dragState, locked]);

  const resetCurrent = () => {
    if (locked || endedRef.current) return;
    setCounts(Array.from({ length: INGREDIENTS.length }, () => 0));
    setFeedback(null);
  };

  const onBrew = () => {
    if (locked || endedRef.current || !isRecipeComplete) return;

    setAttempts((prev) => prev + 1);
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
  };

  return (
    <div className="relative h-full w-full overflow-hidden text-white">
      <div className="relative z-10 flex h-full min-h-0 flex-col px-3 pb-[calc(env(safe-area-inset-bottom)+4.4rem)] pt-2">
        <section className="mt-1.5 shrink-0">
          <div className="mx-auto w-full max-w-[760px] rounded-[1rem] border border-cyan-100/24 bg-slate-950/44 px-3 py-2.5 shadow-[0_10px_18px_rgba(2,6,23,0.2)]">
            <p className="text-[10px] font-black uppercase tracking-[0.15em] text-cyan-200">Make this potion</p>
            <div className="mt-1.5 grid gap-1.5 sm:grid-cols-2">
              {activeTargets.map(({ ingredient, target }) => (
                <div
                  key={`recipe-${ingredient.id}`}
                  className="flex items-center justify-between rounded-xl border border-cyan-100/18 bg-slate-900/34 px-3 py-1.5"
                >
                  <div className="flex items-center gap-2">
                    <span
                      className="h-3 w-3 rounded-full"
                      style={{ backgroundColor: ingredient.color, boxShadow: `0 0 12px ${ingredient.glow}` }}
                    />
                    <span className="text-sm font-black text-cyan-50">{ingredient.name}</span>
                  </div>
                  <span className="text-lg font-black text-amber-100">{target}</span>
                </div>
              ))}
            </div>
            <div className="mt-1.5 rounded-xl border border-cyan-100/18 bg-slate-900/34 px-3 py-1.5 text-center">
              <p className="text-[10px] font-black uppercase tracking-[0.12em] text-cyan-200">Ratio</p>
              <p className="mt-0.5 text-base font-black text-cyan-50">{challenge.baseRatio.join(':')}</p>
            </div>
          </div>
        </section>

        <section className="relative mt-1.5 flex min-h-0 flex-[0_0_24%] items-center justify-center">
          <div className="pointer-events-none absolute left-1/2 top-[56%] h-[52%] w-[62%] -translate-x-1/2 -translate-y-1/2 rounded-full bg-cyan-300/30 blur-[24px]" />
          <motion.div
            animate={{ x: 0 }}
            transition={{ duration: 0.2 }}
            className="relative h-[clamp(172px,24vh,218px)] w-[clamp(224px,62vw,318px)]"
          >
            <div className="absolute left-1/2 top-0 h-[18%] w-[78%] -translate-x-1/2 rounded-full border-4 border-slate-700/95 bg-slate-800/95 shadow-[0_10px_16px_rgba(2,6,23,0.45)]" />
            <div
              ref={cauldronRef}
              className={`absolute inset-x-[9%] top-[14%] bottom-[14%] overflow-hidden rounded-[42%] border-[5px] border-slate-700/95 bg-slate-900/70 shadow-[inset_0_10px_24px_rgba(2,6,23,0.55)] ${
                cauldronArmed ? 'ring-4 ring-cyan-300/60' : ''
              }`}
            >
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
          <div className="mx-auto w-full max-w-[760px]">
            <div className="rounded-xl border border-cyan-100/22 bg-slate-950/38 px-3 py-2">
              <p className="text-[10px] font-black uppercase tracking-[0.14em] text-cyan-200">Your potion</p>
              <div className="mt-2 space-y-1.5">
                {activeTargets.map(({ ingredient, current }) => (
                  <div key={`current-${ingredient.id}`} className="flex items-center justify-between text-sm font-black">
                    <span className="text-cyan-50">{ingredient.name}</span>
                    <span className="text-white">{current}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="mt-1.5 flex shrink-0 flex-[0_0_18%] items-center">
          <div
            className="mx-auto grid w-full max-w-[760px] gap-2"
            style={{ gridTemplateColumns: `repeat(${Math.max(1, activeTargets.length)}, minmax(0, 1fr))` }}
          >
            {activeTargets.map(({ ingredient }) => {
              const index = INGREDIENTS.findIndex((entry) => entry.id === ingredient.id);
              const count = counts[index] || 0;
              return (
                <motion.button
                  key={ingredient.id}
                  type="button"
                  whileTap={{ scale: 0.98 }}
                  animate={{ y: 0, scale: 1 }}
                  transition={{ duration: 0.15 }}
                  onPointerDown={(event) => {
                    if (locked) return;
                    event.currentTarget.setPointerCapture(event.pointerId);
                    setDragState({
                      index,
                      pointerId: event.pointerId,
                      x: event.clientX,
                      y: event.clientY,
                    });
                  }}
                  disabled={locked}
                  aria-label={`Drag ${ingredient.name} into the potion`}
                  className="relative h-[clamp(76px,10.6vh,96px)] rounded-[1.1rem] border border-cyan-100/50 bg-slate-900/74 p-1.5 text-left shadow-[0_12px_18px_rgba(2,6,23,0.38)] transition disabled:opacity-60"
                  style={{ boxShadow: `0 10px 18px rgba(2,6,23,0.36), 0 0 26px ${ingredient.glow}` }}
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
                  <span className="pointer-events-none absolute bottom-1 left-1/2 -translate-x-1/2 text-[9px] font-black uppercase tracking-[0.04em] text-cyan-50">
                    Add {ingredient.name}
                  </span>
                  <span className="pointer-events-none absolute right-1.5 top-1.5 flex h-5 min-w-5 items-center justify-center rounded-full border border-white/45 bg-slate-950/80 px-1 text-[10px] font-black text-white">
                    {count}
                  </span>
                </motion.button>
              );
            })}
          </div>
        </section>

        <section className="mt-1.5 flex shrink-0 flex-col gap-2">
          <div className="mx-auto w-full max-w-[760px] rounded-xl border border-cyan-100/25 bg-slate-950/42 px-3 py-2 text-center shadow-[0_10px_18px_rgba(2,6,23,0.18)]">
            <p className={`text-[11px] font-black ${
              isRecipeComplete
                ? 'text-emerald-200'
                : overfilledTargets.length > 0
                  ? 'text-amber-100'
                : 'text-cyan-100'
            }`}>
              {helperText}
            </p>
            <p className="mt-1 text-[10px] font-black text-cyan-50/75">
              Drag the ingredient tiles into the potion.
            </p>
          </div>
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
              disabled={locked || !isRecipeComplete}
              className={`inline-flex h-12 flex-[1.6] items-center justify-center gap-2 rounded-full border px-4 text-sm font-black uppercase tracking-[0.13em] transition ${
                locked || !isRecipeComplete
                  ? 'border-slate-500/40 bg-slate-900/52 text-slate-400'
                  : 'border-amber-100/85 bg-[linear-gradient(180deg,#fde68a_0%,#f59e0b_100%)] text-amber-950 shadow-[0_12px_20px_rgba(180,83,9,0.48)]'
              }`}
            >
              <Wand2 className="h-5 w-5" />
              Brew Potion
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
              className="inline-flex items-center gap-2 rounded-full border border-emerald-200/80 bg-emerald-400/95 px-4 py-2 text-[11px] font-black uppercase tracking-[0.13em] text-slate-950 shadow-[0_0_28px_rgba(52,211,153,0.75)]"
            >
              <CheckCircle2 className="h-4 w-4" />
              Perfect Brew
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

      {dragState ? (
        <div
          className="pointer-events-none absolute inset-0 z-40"
          aria-hidden="true"
        >
          <div
            className="absolute -translate-x-1/2 -translate-y-1/2"
            style={{ left: dragState.x, top: dragState.y }}
          >
            <div
              className="flex h-20 w-20 items-center justify-center rounded-[1.15rem] border border-cyan-100/65 bg-slate-900/88 shadow-[0_14px_24px_rgba(2,6,23,0.42)]"
              style={{
                boxShadow: `0 12px 24px rgba(2,6,23,0.42), 0 0 24px ${INGREDIENTS[dragState.index].glow}`,
              }}
            >
              <div
                className="h-12 w-12 rounded-[0.9rem]"
                style={{
                  background: `linear-gradient(180deg, rgba(255,255,255,0.38) 0%, ${INGREDIENTS[dragState.index].color} 24%, rgba(15,23,42,0.28) 100%)`,
                  boxShadow: `0 0 18px ${INGREDIENTS[dragState.index].glow}, inset 0 0 16px rgba(255,255,255,0.16)`,
                }}
              />
            </div>
          </div>
        </div>
      ) : null}

    </div>
  );
};

export default PotionPourGame;

