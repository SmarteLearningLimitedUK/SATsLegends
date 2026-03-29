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
  stage: number;
  activeIndices: number[];
  baseRatio: number[];
  scale: number;
  targetCounts: number[];
}

const INGREDIENTS: Ingredient[] = [
  { id: 'red', name: 'Ruby', short: 'R', color: '#fb7185', glow: 'rgba(251,113,133,0.55)', rgb: [251, 113, 133] },
  { id: 'blue', name: 'Azure', short: 'B', color: '#60a5fa', glow: 'rgba(96,165,250,0.55)', rgb: [96, 165, 250] },
  { id: 'green', name: 'Moss', short: 'G', color: '#34d399', glow: 'rgba(52,211,153,0.55)', rgb: [52, 211, 153] },
  { id: 'gold', name: 'Sun', short: 'Y', color: '#fbbf24', glow: 'rgba(251,191,36,0.55)', rgb: [251, 191, 36] },
  { id: 'violet', name: 'Night', short: 'P', color: '#a78bfa', glow: 'rgba(167,139,250,0.55)', rgb: [167, 139, 250] },
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

let challengeSeed = 0;
const nextChallengeId = () => {
  challengeSeed += 1;
  return `potion-panic-${challengeSeed}`;
};

const stageFor = (levelId: number, solved: number) => clamp(Math.floor((levelId - 1) / 2) + 1 + Math.floor(solved / 2), 1, 6);
const roundsToWinForLevel = (levelId: number) => 5 + Math.floor((levelId - 1) / 2);

const buildPrompt = (stage: number, active: Ingredient[], ratio: number[], scale: number, target: number[]) => {
  if (stage <= 2) {
    return `Brew ${active[0].name}:${active[1].name} in ratio ${ratio[0]}:${ratio[1]}.`;
  }
  if (stage === 3) {
    const total = target.reduce((a, b) => a + b, 0);
    const joinedRatio = ratio.join(':');
    return `Use ${total} drops total in ratio ${joinedRatio} (${active.map((i) => i.name).join(':')}).`;
  }
  if (stage === 4) {
    const knownIndex = 0;
    return `The ratio is ${ratio.join(':')} for ${active.map((i) => i.name).join(':')}. If ${active[knownIndex].name} is ${target[knownIndex]}, complete the brew.`;
  }
  if (stage === 5) {
    const idxA = 0;
    const idxB = 1;
    const total = target.reduce((a, b) => a + b, 0);
    return `SATs challenge: ${active[idxA].name}:${active[idxB].name} is ${ratio[idxA]}:${ratio[idxB]} and the potion uses ${total} drops. Build the correct mix.`;
  }
  return `Master brew: match ${active.map((ingredient, index) => `${ingredient.name} ${ratio[index]}`).join(' : ')} scaled by x${scale}.`;
};

const generateChallenge = (levelId: number, solved: number): Challenge => {
  const stage = stageFor(levelId, solved);
  const ingredientCount = stage <= 2 ? 2 : stage <= 4 ? 3 : stage <= 5 ? 4 : 5;
  const activeIndices = shuffled([0, 1, 2, 3, 4]).slice(0, ingredientCount).sort((a, b) => a - b);
  const baseRatio = Array.from({ length: ingredientCount }, () => Math.floor(Math.random() * 4) + 1);
  const scale = stage <= 2 ? randomPick([1, 2]) : stage <= 4 ? randomPick([2, 3, 4]) : randomPick([3, 4, 5]);
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

  const currentRatioForActive = useMemo(
    () => simplifyRatio(challenge.activeIndices.map((idx) => counts[idx] || 0)),
    [challenge.activeIndices, counts],
  );
  const targetRatioForActive = useMemo(() => simplifyRatio(challenge.targetCounts), [challenge.targetCounts]);

  const mixColor = useMemo(() => {
    const total = counts.reduce((a, b) => a + b, 0);
    if (total <= 0) return 'rgba(71,85,105,0.82)';
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
    return `rgba(${Math.round(r)}, ${Math.round(g)}, ${Math.round(b)}, 0.88)`;
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
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(5,14,40,0.24)_0%,rgba(5,14,40,0.34)_42%,rgba(5,14,40,0.45)_100%)]" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_28%,rgba(56,189,248,0.2)_0%,rgba(56,189,248,0)_55%)]" />

      <div className="relative z-10 flex h-full min-h-0 flex-col px-3 pb-[calc(env(safe-area-inset-bottom)+4.4rem)] pt-2">
        <section className="shrink-0">
          <div className="mx-auto max-w-[760px] rounded-[1.35rem] border border-cyan-100/35 bg-slate-900/60 px-4 py-3 text-center shadow-[0_14px_28px_rgba(2,6,23,0.42)]">
            <p className="text-[11px] font-black uppercase tracking-[0.14em] text-cyan-200">
              Round {correctSolved + 1}/{roundsToWinForLevel(levelId)}
            </p>
            <p className="mt-1.5 text-[clamp(0.9rem,2.15vw,1.15rem)] font-black leading-snug text-cyan-50">
              {challenge.prompt}
            </p>
          </div>
        </section>

        <section className="relative mt-2 flex min-h-0 flex-[0_0_33%] items-center justify-center">
          <div className="pointer-events-none absolute left-1/2 top-[56%] h-[52%] w-[62%] -translate-x-1/2 -translate-y-1/2 rounded-full bg-cyan-300/22 blur-[24px]" />
          <motion.div
            animate={feedback === 'error' ? { x: [0, -8, 8, -5, 5, 0] } : { x: 0 }}
            transition={{ duration: 0.35 }}
            className="relative h-[clamp(194px,29vh,252px)] w-[clamp(246px,68vw,350px)]"
          >
            <div className="absolute left-1/2 top-0 h-[18%] w-[78%] -translate-x-1/2 rounded-full border-4 border-slate-700/95 bg-slate-800/95 shadow-[0_10px_16px_rgba(2,6,23,0.45)]" />
            <div className="absolute inset-x-[9%] top-[14%] bottom-[14%] overflow-hidden rounded-[42%] border-[5px] border-slate-700/95 bg-slate-900/70 shadow-[inset_0_10px_24px_rgba(2,6,23,0.55)]">
              <motion.div
                className="absolute inset-x-[4%] bottom-[4%] rounded-[40%]"
                style={{ backgroundColor: mixColor }}
                animate={{ height: `${Math.min(95, Math.max(12, (currentTotal / Math.max(1, targetTotal * 1.15)) * 100))}%` }}
                transition={{ duration: 0.32, ease: 'easeOut' }}
              />
              {Array.from({ length: 9 }).map((_, idx) => (
                <motion.span
                  key={`bubble-${idx}`}
                  className="absolute bottom-0 h-3.5 w-3.5 rounded-full bg-white/35"
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
            <div className="mt-0.5 flex items-center justify-between rounded-xl border border-cyan-100/30 bg-slate-950/52 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.12em] text-cyan-100">
              <span>Current ratio {currentRatioForActive.join(':')}</span>
              <span>Target {targetRatioForActive.join(':')}</span>
            </div>
            <div className="grid grid-cols-5 gap-1.5">
              {INGREDIENTS.map((ingredient, index) => {
                const active = activeSet.has(index);
                return (
                  <div
                    key={`tracker-${ingredient.id}`}
                    className={`rounded-xl border px-1.5 py-1 text-center ${
                      active ? 'border-cyan-100/35 bg-slate-950/55' : 'border-slate-500/25 bg-slate-900/35 opacity-45'
                    }`}
                  >
                    <p className="text-[9px] font-black uppercase tracking-[0.1em] text-cyan-200">{ingredient.short}</p>
                    <p className="text-sm font-black text-white">{counts[index]}/{targetByIngredient.get(index) ?? 0}</p>
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
                  style={{ boxShadow: active ? `0 10px 18px rgba(2,6,23,0.36), 0 0 18px ${ingredient.glow}` : undefined }}
                >
                  <div className="pointer-events-none absolute inset-x-2 top-2 h-2 rounded-full bg-white/14 blur-[1px]" />
                  <div className="mx-auto h-[74%] w-[72%] rounded-[0.95rem] border border-white/35 bg-slate-950/45 p-1.5">
                    <div
                      className="h-full w-full rounded-[0.75rem]"
                      style={{
                        background: `linear-gradient(180deg, ${ingredient.color}, rgba(15,23,42,0.42))`,
                      }}
                    />
                  </div>
                  <span className="pointer-events-none absolute bottom-1 left-1/2 -translate-x-1/2 text-[10px] font-black uppercase tracking-[0.07em] text-cyan-50">
                    {ingredient.short}
                  </span>
                  <span className="pointer-events-none absolute right-1.5 top-1.5 flex h-5 min-w-5 items-center justify-center rounded-full border border-white/45 bg-slate-950/80 px-1 text-[10px] font-black text-white">
                    {count}
                  </span>
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
