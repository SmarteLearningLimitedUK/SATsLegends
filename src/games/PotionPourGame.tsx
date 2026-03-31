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
import potionPanicBackdrop from '../assets/potionpanic.png';
import potionPanicFrame from '../assets/potionpanic2.png';
import blueRecipeFrame from '../assets/bluedialoague/blue socket cropped.png';
import blueRecipeHeader from '../assets/bluedialoague/med button cropped.png';

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
  const statusText = useMemo(() => {
    if (isRecipeComplete) return 'Perfect! Your potion is ready to brew.';
    if (overfilledTargets.length > 0) {
      return `Too much ${joinWithAnd(overfilledTargets.map(({ ingredient }) => ingredient.name))}. Reset and try again.`;
    }
    return '';
  }, [isRecipeComplete, overfilledTargets]);

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
      <div className="absolute inset-0 bg-[linear-gradient(180deg,#1f2e5c_0%,#5a3f66_34%,#9a5d53_58%,#2a2336_100%)]" />
      <img
        src={potionPanicBackdrop}
        alt=""
        aria-hidden="true"
        className="pointer-events-none absolute left-1/2 top-1/2 h-[122%] max-w-none -translate-x-1/2 -translate-y-1/2 object-cover opacity-[0.18] mix-blend-screen"
      />
      <img
        src={potionPanicFrame}
        alt=""
        aria-hidden="true"
        className="pointer-events-none absolute left-1/2 top-1/2 h-[90%] max-w-none -translate-x-1/2 -translate-y-1/2 object-contain opacity-[0.16]"
      />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-[46%] bg-[linear-gradient(180deg,rgba(16,24,40,0)_0%,rgba(8,15,32,0.42)_18%,rgba(6,12,26,0.88)_100%)]" />
      <div className="pointer-events-none absolute left-[-12%] top-[8%] h-[32%] w-[38%] rounded-full bg-[radial-gradient(circle,rgba(17,45,48,0.82)_0%,rgba(17,45,48,0.48)_42%,rgba(17,45,48,0)_72%)] blur-[10px]" />
      <div className="pointer-events-none absolute right-[-10%] top-[10%] h-[34%] w-[40%] rounded-full bg-[radial-gradient(circle,rgba(22,49,54,0.84)_0%,rgba(22,49,54,0.5)_42%,rgba(22,49,54,0)_74%)] blur-[10px]" />
      <div className="pointer-events-none absolute left-1/2 top-[45%] h-[24%] w-[66%] -translate-x-1/2 rounded-full bg-[radial-gradient(circle,rgba(252,191,73,0.34)_0%,rgba(252,191,73,0.18)_30%,rgba(252,191,73,0)_68%)] blur-[24px]" />

      <div className="relative z-10 flex h-full min-h-0 flex-col px-4 pb-[calc(env(safe-area-inset-bottom)+4.2rem)] pt-4">
        <section className="shrink-0 text-center">
          <div className="mx-auto max-w-[720px]">
            <p className="text-[clamp(15px,2.35vh,21px)] font-black leading-tight text-white drop-shadow-[0_3px_8px_rgba(15,23,42,0.55)]">
              {challenge.orderPrompt}
            </p>
            <p className="mt-1.5 text-[clamp(11px,1.65vh,14px)] font-black text-amber-100/92 drop-shadow-[0_2px_6px_rgba(15,23,42,0.4)]">
              {challenge.orderFlavor}
            </p>
          </div>
        </section>

        <section className="mt-2 shrink-0">
          <div className="mx-auto flex w-full max-w-[760px] justify-end">
            <div className="relative h-[138px] w-[248px]">
              <img
                src={blueRecipeFrame}
                alt=""
                aria-hidden="true"
                className="pointer-events-none absolute inset-0 h-full w-full object-fill drop-shadow-[0_10px_18px_rgba(15,23,42,0.28)]"
              />
              <div className="absolute inset-x-[18%] top-[-10px] h-[34px]">
                <img
                  src={blueRecipeHeader}
                  alt=""
                  aria-hidden="true"
                  className="pointer-events-none h-full w-full object-fill"
                />
                <div className="absolute inset-0 flex items-center justify-center px-3">
                  <p className="truncate text-[11px] font-black uppercase tracking-[0.03em] text-white drop-shadow-[0_2px_4px_rgba(15,23,42,0.4)]">
                    {challenge.orderTitle}
                  </p>
                </div>
              </div>
              <div className="relative flex h-full flex-col px-5 pb-4 pt-8">
                <div className="rounded-full border border-cyan-100/18 bg-black/12 px-3 py-1 text-center">
                  <p className="text-[11px] font-black text-cyan-50">Ratio: {challenge.baseRatio.join(' : ')}</p>
                </div>
                <div className="mt-3 space-y-1.5">
                  {activeTargets.map(({ ingredient, target }) => (
                    <div key={`recipe-${ingredient.id}`} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span
                          aria-hidden="true"
                          className="h-3.5 w-3.5 rounded-full border border-white/45"
                          style={{ backgroundColor: ingredient.color, boxShadow: `0 0 10px ${ingredient.glow}` }}
                        />
                        <span className="text-[11px] font-black text-white">{ingredient.name}</span>
                      </div>
                      <span className="text-[11px] font-black text-amber-100">x{target}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="mt-1.5 flex min-h-0 flex-1 flex-col">
          <div className="mx-auto flex w-full max-w-[760px] min-h-0 flex-1 flex-col items-center">
            <div className="relative h-[clamp(150px,20vh,210px)] w-full max-w-[360px] shrink-0">
              <div className="pointer-events-none absolute left-1/2 top-[84%] h-10 w-[62%] -translate-x-1/2 rounded-full bg-black/35 blur-md" />
              <div className="pointer-events-none absolute left-1/2 top-[75%] h-[28%] w-[54%] -translate-x-1/2 rounded-full bg-[radial-gradient(circle,rgba(255,164,48,0.85)_0%,rgba(255,120,32,0.42)_38%,rgba(255,120,32,0)_75%)] blur-[16px]" />
              <div className="absolute left-1/2 top-[72%] flex h-[18%] w-[46%] -translate-x-1/2 items-end justify-between px-5">
                {[0, 1, 2].map((idx) => (
                  <motion.span
                    key={`flame-${idx}`}
                    className="h-12 w-7 rounded-full bg-[radial-gradient(circle at 50% 20%,rgba(255,241,180,0.95)_0%,rgba(255,170,57,0.92)_42%,rgba(255,94,32,0.9)_76%,rgba(255,94,32,0)_100%)] blur-[1px]"
                    animate={{ scaleY: [0.85, 1.1, 0.92], y: [0, -4, 0] }}
                    transition={{ repeat: Infinity, duration: 1 + idx * 0.18, ease: 'easeInOut' }}
                  />
                ))}
              </div>
              <div
                className="absolute left-1/2 top-[8%] h-[78%] w-[96%] -translate-x-1/2 bg-no-repeat"
                style={{
                  backgroundImage: `url(${potionPanicBackdrop})`,
                  backgroundSize: '175%',
                  backgroundPosition: '71% 78%',
                }}
              />
              <div className="absolute left-1/2 top-[18%] h-[30%] w-[58%] -translate-x-1/2 overflow-hidden rounded-[46%]">
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

            <div
              className="mt-2 grid w-full max-w-[620px] shrink-0 gap-1.5"
              style={{ gridTemplateColumns: `repeat(${Math.max(1, activeTargets.length)}, minmax(0, 1fr))` }}
            >
              {activeTargets.map(({ ingredient, current, target }) => {
                const index = INGREDIENTS.findIndex((entry) => entry.id === ingredient.id);
                return (
                  <motion.button
                    key={ingredient.id}
                    type="button"
                    whileTap={{ scale: 0.96, y: 2 }}
                    onClick={() => addIngredient(index)}
                    disabled={locked}
                    aria-label={`Add ${ingredient.name} to the potion`}
                    className="relative flex h-[clamp(64px,8.5vh,84px)] flex-col items-center justify-center rounded-[1.05rem] border border-white/28 bg-[linear-gradient(180deg,rgba(34,53,118,0.9),rgba(16,31,74,0.94))] px-2 py-1.5 shadow-[0_12px_18px_rgba(2,6,23,0.3)] transition disabled:opacity-60"
                    style={{ boxShadow: `0 12px 22px rgba(2,6,23,0.34), 0 0 22px ${ingredient.glow}` }}
                  >
                    <div
                      className="flex h-8 w-8 items-center justify-center rounded-full border border-white/45"
                      style={{
                        background: `radial-gradient(circle at 30% 30%, rgba(255,255,255,0.96) 0%, ${ingredient.color} 44%, rgba(52,18,30,0.96) 100%)`,
                        boxShadow: `0 0 18px ${ingredient.glow}`,
                      }}
                    >
                      <span className="text-[10px] font-black text-white drop-shadow-[0_2px_3px_rgba(0,0,0,0.45)]">
                        {ingredient.short}
                      </span>
                    </div>
                    <span className="mt-1 text-[9px] font-black uppercase tracking-[0.03em] text-cyan-50">{ingredient.name}</span>
                    <span className="text-[10px] font-black text-amber-100">x{current}/{target}</span>
                  </motion.button>
                );
              })}
            </div>

            {statusText ? (
              <div className="mt-3 w-full max-w-[520px] shrink-0 rounded-full border border-cyan-100/18 bg-slate-950/34 px-4 py-2 text-center shadow-[0_10px_18px_rgba(2,6,23,0.16)]">
                <p className={`text-[11px] font-black ${isRecipeComplete ? 'text-emerald-200' : 'text-amber-100'}`}>
                  {statusText}
                </p>
              </div>
            ) : null}

            <div className="mt-2.5 flex w-full max-w-[460px] shrink-0 flex-col items-center gap-1.5">
              <motion.button
                type="button"
                whileTap={{ scale: 0.98 }}
                onClick={onBrew}
                disabled={locked || !isRecipeComplete}
                className={`inline-flex h-[50px] w-full items-center justify-center gap-2 rounded-[999px] border px-5 text-[clamp(18px,2.8vh,28px)] font-black tracking-[0.01em] transition ${
                  locked || !isRecipeComplete
                    ? 'border-slate-500/40 bg-[linear-gradient(180deg,rgba(27,44,95,0.62),rgba(14,25,58,0.7))] text-slate-400'
                    : 'border-cyan-100/80 bg-[linear-gradient(180deg,#5b96ff_0%,#2f67ec_62%,#204bc7_100%)] text-white shadow-[0_16px_28px_rgba(37,99,235,0.4)]'
                }`}
              >
                <Wand2 className="h-5 w-5" />
                Brew Potion
              </motion.button>
              <button
                type="button"
                onClick={resetCurrent}
                disabled={locked}
                className="inline-flex h-9 items-center justify-center rounded-full px-3 text-[11px] font-black uppercase tracking-[0.1em] text-cyan-100/88 disabled:opacity-50"
              >
                Reset Mix
              </button>
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

