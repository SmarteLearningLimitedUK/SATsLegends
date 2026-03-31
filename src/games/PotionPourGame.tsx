import React, { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import {
  CheckCircle2,
  Wand2,
} from 'lucide-react';
import {
  emitMiniGameSessionEvent,
  MiniGameShellContractProps,
} from '../app/gameplaySessionContract';
import cauldrenAndPotionArt from '../assets/coul.png';
import potionBottleSprites from '../assets/pots.png';

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
  orderTitle: string;
  orderPrompt: string;
  orderFlavor: string;
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
const POTION_SPRITES: Record<string, { x: number; y: number; w: number; h: number }> = {
  gold: { x: 0.22, y: 0.1, w: 0.25, h: 0.36 },
  blue: { x: 0.55, y: 0.1, w: 0.24, h: 0.36 },
  green: { x: 0.08, y: 0.52, w: 0.31, h: 0.43 },
  violet: { x: 0.39, y: 0.5, w: 0.28, h: 0.44 },
  red: { x: 0.65, y: 0.5, w: 0.28, h: 0.44 },
};

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

const buildPotionName = (stage: number, active: Ingredient[]) => {
  const lead = active[0]?.name || 'Star';
  const support = active[1]?.name || 'Moon';
  if (stage <= 2) return `${lead} Health Potion`;
  if (stage === 3) return `${support} Focus Draught`;
  if (stage === 4) return `${lead} Remedy Elixir`;
  if (stage === 5) return `${support} Courage Tonic`;
  return `${lead} Starlight Brew`;
};

const buildOrderPrompt = (potionName: string, stage: number) => {
  if (stage <= 2) return `The village apothecary needs a ${potionName} for an early patient.`;
  if (stage === 3) return `The apothecary wants a ${potionName} before the scholars arrive.`;
  if (stage === 4) return `A tired traveller is waiting outside for this ${potionName}.`;
  if (stage === 5) return `The guard captain has asked for a ${potionName} before sunset.`;
  return `Tonight's lantern rite needs a rare ${potionName} from your cauldron.`;
};

const buildOrderFlavor = (stage: number) => {
  if (stage <= 2) return 'Keep the recipe exact and the potion will shimmer to life.';
  if (stage === 3) return 'A steady hand will help this brew sparkle for the village.';
  if (stage === 4) return 'One careful mix will send the apothecary shelves glowing.';
  if (stage === 5) return 'Brave brews need perfect balance in every drop.';
  return 'Only a precise potion will awaken the old magic tonight.';
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
  const orderTitle = buildPotionName(stage, activeIngredients);

  return {
    id: nextChallengeId(),
    orderTitle,
    orderPrompt: buildOrderPrompt(orderTitle, stage),
    orderFlavor: buildOrderFlavor(stage),
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

  const endedRef = useRef(false);
  const feedbackTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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
  const helperText = useMemo(() => {
    if (isRecipeComplete) return 'Perfect! Your potion is ready to brew.';
    if (overfilledTargets.length > 0) {
      return `Too much ${joinWithAnd(overfilledTargets.map(({ ingredient }) => ingredient.name))}. Reset and try again.`;
    }
    const neededParts = activeTargets
      .filter(({ remaining }) => remaining > 0)
      .map(({ ingredient, remaining }) => `${remaining} ${ingredient.name}`);
    return neededParts.length ? `Add ${joinWithAnd(neededParts)} to brew.` : 'Build the recipe to brew.';
  }, [activeTargets, isRecipeComplete, overfilledTargets]);

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
      <div className="relative z-10 flex h-full min-h-0 flex-col gap-2 px-3 pb-[calc(env(safe-area-inset-bottom)+4rem)] pt-3">
        <section className="shrink-0 text-center">
          <div className="mx-auto max-w-[720px] rounded-[1.25rem] border border-white/12 bg-slate-950/18 px-4 py-2 shadow-[0_12px_24px_rgba(15,23,42,0.18)] backdrop-blur-[2px]">
            <p className="text-[clamp(14px,2.05vh,19px)] font-black leading-tight text-white drop-shadow-[0_3px_8px_rgba(15,23,42,0.55)]">
              {challenge.orderPrompt}
            </p>
            <p className="mt-1 text-[clamp(10px,1.45vh,13px)] font-black text-amber-100/92 drop-shadow-[0_2px_6px_rgba(15,23,42,0.4)]">
              {challenge.orderFlavor}
            </p>
          </div>
        </section>

        <section className="min-h-0 flex-1">
          <div className="mx-auto grid h-full w-full max-w-[780px] min-h-0 grid-rows-[minmax(0,1fr)_auto] gap-2">
            <div className="grid min-h-0 grid-cols-[minmax(0,1fr)_minmax(0,2fr)] gap-2">
              <div className="min-h-0 rounded-[1.2rem] border border-amber-100/15 bg-[linear-gradient(180deg,rgba(31,24,47,0.55),rgba(20,17,34,0.72))] px-3 py-3 shadow-[0_12px_22px_rgba(15,23,42,0.18)]">
                <p className="text-[10px] font-black uppercase tracking-[0.12em] text-amber-100/80">Recipe</p>
                <p className="mt-1 text-[clamp(12px,1.8vh,16px)] font-black leading-tight text-white">
                  {challenge.orderTitle}
                </p>
                <div className="mt-2 rounded-[1rem] border border-white/10 bg-black/18 px-3 py-2">
                  <p className="text-[10px] font-black text-cyan-100">Ratio</p>
                  <p className="mt-0.5 text-[clamp(16px,2.1vh,22px)] font-black text-white">
                    {challenge.baseRatio.join(' : ')}
                  </p>
                </div>
                <div className="mt-2 space-y-2">
                  {activeTargets.map(({ ingredient, target }) => (
                    <div key={`recipe-${ingredient.id}`} className="flex items-center justify-between rounded-[0.95rem] border border-white/8 bg-white/5 px-2.5 py-2">
                      <div className="flex items-center gap-2">
                        <span
                          aria-hidden="true"
                          className="h-3.5 w-3.5 rounded-full border border-white/45"
                          style={{ backgroundColor: ingredient.color, boxShadow: `0 0 8px ${ingredient.glow}` }}
                        />
                        <span className="text-[10px] font-black text-white">{ingredient.name}</span>
                      </div>
                      <span className="text-[10px] font-black text-amber-100">x{target}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="grid min-h-0 grid-rows-[minmax(0,7fr)_minmax(0,1.6fr)] gap-2">
                <div className="relative min-h-0 overflow-hidden rounded-[1.35rem] border border-white/12 bg-slate-950/16 shadow-[0_14px_26px_rgba(15,23,42,0.18)]">
                  <div className="pointer-events-none absolute left-1/2 top-[84%] h-12 w-[68%] -translate-x-1/2 rounded-full bg-black/35 blur-md" />
                  <div className="pointer-events-none absolute left-1/2 top-[76%] h-[24%] w-[58%] -translate-x-1/2 rounded-full bg-[radial-gradient(circle,rgba(255,164,48,0.85)_0%,rgba(255,120,32,0.42)_38%,rgba(255,120,32,0)_75%)] blur-[16px]" />
                  <div className="absolute left-1/2 top-[72%] flex h-[18%] w-[48%] -translate-x-1/2 items-end justify-between px-5">
                    {[0, 1, 2].map((idx) => (
                      <motion.span
                        key={`flame-${idx}`}
                        className="h-12 w-7 rounded-full bg-[radial-gradient(circle at 50% 20%,rgba(255,241,180,0.95)_0%,rgba(255,170,57,0.92)_42%,rgba(255,94,32,0.9)_76%,rgba(255,94,32,0)_100%)] blur-[1px]"
                        animate={{ scaleY: [0.85, 1.1, 0.92], y: [0, -4, 0] }}
                        transition={{ repeat: Infinity, duration: 1 + idx * 0.18, ease: 'easeInOut' }}
                      />
                    ))}
                  </div>
                  <img
                    src={cauldrenAndPotionArt}
                    alt=""
                    aria-hidden="true"
                    className="pointer-events-none absolute left-1/2 top-[4%] h-[74%] max-w-none -translate-x-1/2 object-contain"
                  />
                  <div className="absolute left-[41.5%] top-[20%] h-[26%] w-[50%] -translate-x-1/2 overflow-hidden rounded-[46%]">
                    <motion.div
                      className="absolute inset-x-[8%] bottom-[8%] rounded-[42%]"
                      style={{
                        background: `linear-gradient(180deg, rgba(255,255,255,0.34) 0%, ${mixColor} 18%, rgba(15,23,42,0.18) 100%)`,
                        boxShadow: `0 0 30px ${mixColor}`,
                      }}
                      animate={{ height: `${Math.min(96, Math.max(18, (currentTotal / Math.max(1, targetTotal * 1.1)) * 100))}%` }}
                      transition={{ duration: 0.32, ease: 'easeOut' }}
                    />
                    {Array.from({ length: 10 }).map((_, idx) => (
                      <motion.span
                        key={`bubble-${idx}`}
                        className="absolute bottom-[12%] h-2.5 w-2.5 rounded-full bg-white/60"
                        style={{ left: `${12 + idx * 7}%` }}
                        animate={{ y: [0, -18 - (idx % 3) * 8, -2], opacity: [0, 0.9, 0], scale: [0.7, 1.12, 0.82] }}
                        transition={{ repeat: Infinity, duration: 1.05 + (idx % 4) * 0.18, delay: idx * 0.06, ease: 'easeOut' }}
                      />
                    ))}
                  </div>

                  <AnimatePresence>
                    {feedback === 'success' ? (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.86 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 1.08 }}
                        className="absolute left-1/2 top-[44%] -translate-x-1/2 -translate-y-1/2 rounded-full border border-emerald-200/80 bg-emerald-400/92 px-4 py-2 text-[11px] font-black uppercase tracking-[0.14em] text-slate-900 shadow-[0_0_26px_rgba(52,211,153,0.7)]"
                      >
                        Perfect Brew
                      </motion.div>
                    ) : null}
                  </AnimatePresence>
                </div>

                <div className="flex min-h-0 flex-col justify-center rounded-[1.15rem] border border-white/12 bg-slate-950/22 px-3 py-2 shadow-[0_12px_22px_rgba(15,23,42,0.14)]">
                  <p className={`text-center text-[11px] font-black ${isRecipeComplete ? 'text-emerald-200' : 'text-amber-100'}`}>
                    {helperText}
                  </p>
                  <motion.button
                    type="button"
                    whileTap={{ scale: 0.98 }}
                    onClick={onBrew}
                    disabled={locked || !isRecipeComplete}
                    className={`mt-2 inline-flex h-[44px] w-full items-center justify-center gap-2 rounded-[999px] border px-5 text-[clamp(16px,2.25vh,22px)] font-black tracking-[0.01em] transition ${
                      locked || !isRecipeComplete
                        ? 'border-slate-500/40 bg-[linear-gradient(180deg,rgba(27,44,95,0.62),rgba(14,25,58,0.7))] text-slate-400'
                        : 'border-cyan-100/80 bg-[linear-gradient(180deg,#5b96ff_0%,#2f67ec_62%,#204bc7_100%)] text-white shadow-[0_16px_28px_rgba(37,99,235,0.4)]'
                    }`}
                  >
                    <Wand2 className="h-4.5 w-4.5" />
                    Brew Potion
                  </motion.button>
                  <button
                    type="button"
                    onClick={resetCurrent}
                    disabled={locked}
                    className="mt-1 inline-flex h-7 items-center justify-center rounded-full px-3 text-[10px] font-black uppercase tracking-[0.1em] text-cyan-100/88 disabled:opacity-50"
                  >
                    Reset Mix
                  </button>
                </div>
              </div>
            </div>

            <div className="grid shrink-0 grid-cols-5 gap-1.5">
              {INGREDIENTS.map((ingredient, index) => {
                const current = counts[index] || 0;
                const target = targetByIngredient.get(index) ?? 0;
                const isActive = activeSet.has(index);
                const sprite = POTION_SPRITES[ingredient.id];
                return (
                  <motion.button
                    key={ingredient.id}
                    type="button"
                    whileTap={isActive ? { scale: 0.96, y: 2 } : undefined}
                    onClick={() => addIngredient(index)}
                    disabled={locked || !isActive}
                    aria-label={isActive ? `Add ${ingredient.name} to the potion` : `${ingredient.name} is not needed for this recipe`}
                    className={`relative flex h-[clamp(78px,11vh,102px)] flex-col items-center justify-end rounded-[1rem] border border-white/10 bg-[linear-gradient(180deg,rgba(15,23,42,0.12),rgba(15,23,42,0.24))] px-1 py-1 shadow-[0_10px_14px_rgba(2,6,23,0.24)] transition ${locked || !isActive ? 'opacity-65' : ''}`}
                    style={isActive ? { boxShadow: `0 12px 22px rgba(2,6,23,0.28), 0 0 18px ${ingredient.glow}` } : undefined}
                  >
                    <div className="pointer-events-none absolute inset-x-0 top-0 bottom-5">
                      <div className="relative mx-auto h-full w-full max-w-[92px] overflow-hidden">
                        {sprite ? (
                          <div
                            aria-hidden="true"
                            className="absolute inset-0 bg-no-repeat"
                            style={{
                              backgroundImage: `url(${potionBottleSprites})`,
                              backgroundSize: `${100 / sprite.w}% ${100 / sprite.h}%`,
                              backgroundPosition: `${(sprite.x / (1 - sprite.w)) * 100}% ${(sprite.y / (1 - sprite.h)) * 100}%`,
                              filter: isActive ? 'none' : 'grayscale(0.45) saturate(0.7) opacity(0.8)',
                            }}
                          />
                        ) : null}
                      </div>
                    </div>
                    <span className="relative z-10 text-[9px] font-black uppercase tracking-[0.02em] text-cyan-50">{ingredient.name}</span>
                    <span className="relative z-10 text-[10px] font-black text-amber-100">
                      {isActive ? `x${current}/${target}` : '--'}
                    </span>
                  </motion.button>
                );
              })}
            </div>
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
              bottom: '12%',
              backgroundColor: ingredient.color,
              boxShadow: `0 0 10px ${ingredient.glow}`,
            }}
            initial={{ y: 0, opacity: 0.9, scale: 0.9 }}
            animate={{ y: -220, x: 14 - drop.index * 3, opacity: 0, scale: 0.55 }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
          />
        );
      })}

    </div>
  );
};

export default PotionPourGame;

