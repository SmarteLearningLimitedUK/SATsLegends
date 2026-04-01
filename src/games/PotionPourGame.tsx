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
import {
  FeedbackStrip,
  GameUiShell,
  GameTopBar,
  PrimaryButton,
  SecondaryButton,
  StoryCard,
  TaskCard,
} from '../components/game-ui/GameUiKit';
import GameRulesModal from '../components/GameRulesModal';
import cauldrenAndPotionArt from '../assets/coul.png';
import potionPanicBackdrop from '../assets/level_backgrounds/potion-panic.png';
import azureBottle from '../assets/potion_bottles/azure.png';
import mossBottle from '../assets/potion_bottles/moss.png';
import nightBottle from '../assets/potion_bottles/night.png';
import rubyBottle from '../assets/potion_bottles/ruby.png';
import sunBottle from '../assets/potion_bottles/sun.png';

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
  mode: 'direct_recipe' | 'scale_recipe' | 'missing_value' | 'fix_mistake' | 'word_problem' | 'multi_step';
  activeIndices: number[];
  baseRatio: number[];
  scale: number;
  targetCounts: number[];
  startCounts: number[];
  totalDrops: number;
  revealTargets: boolean;
  cardHint?: string;
}

type ChallengeMode = Challenge['mode'];

const INGREDIENTS: Ingredient[] = [
  { id: 'red', name: 'Ruby', short: 'R', color: '#ff4d6d', glow: 'rgba(255,77,109,0.82)', rgb: [255, 77, 109] },
  { id: 'blue', name: 'Azure', short: 'B', color: '#38bdf8', glow: 'rgba(56,189,248,0.82)', rgb: [56, 189, 248] },
  { id: 'green', name: 'Moss', short: 'G', color: '#22c55e', glow: 'rgba(34,197,94,0.82)', rgb: [34, 197, 94] },
  { id: 'gold', name: 'Sun', short: 'Y', color: '#facc15', glow: 'rgba(250,204,21,0.82)', rgb: [250, 204, 21] },
  { id: 'violet', name: 'Night', short: 'P', color: '#a855f7', glow: 'rgba(168,85,247,0.82)', rgb: [168, 85, 247] },
];

const SUCCESS_DELAY_MS = 760;
const POTION_BOTTLE_ART: Record<string, string> = {
  gold: sunBottle,
  blue: azureBottle,
  green: mossBottle,
  violet: nightBottle,
  red: rubyBottle,
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

const WORD_PAIR_RATIOS = [
  [2, 3],
  [3, 2],
  [4, 3],
] as const;

let challengeSeed = 0;
const nextChallengeId = () => {
  challengeSeed += 1;
  return `potion-panic-${challengeSeed}`;
};

const modeForLevel = (levelId: number): ChallengeMode => {
  if (levelId <= 1) return 'direct_recipe';
  if (levelId === 2) return 'scale_recipe';
  if (levelId === 3) return 'missing_value';
  if (levelId === 4) return 'fix_mistake';
  if (levelId === 5) return 'word_problem';
  if (levelId === 6) return 'multi_step';

  const advancedCycle: ChallengeMode[] = [
    'fix_mistake',
    'missing_value',
    'scale_recipe',
    'word_problem',
    'multi_step',
  ];
  return advancedCycle[(levelId - 7) % advancedCycle.length];
};

const stageForMode = (mode: ChallengeMode): number => {
  switch (mode) {
    case 'direct_recipe':
      return 1;
    case 'scale_recipe':
      return 2;
    case 'missing_value':
      return 3;
    case 'fix_mistake':
      return 4;
    case 'word_problem':
      return 5;
    case 'multi_step':
    default:
      return 6;
  }
};
const roundsToWinForLevel = (levelId: number) => 5 + Math.floor((levelId - 1) / 2);

const buildPotionName = (stage: number, active: Ingredient[]) => {
  const lead = active[0]?.name || 'Star';
  const support = active[1]?.name || 'Moon';
  if (stage <= 2) return `${lead} Frog's Breath`;
  if (stage === 3) return `${support} Moonmist Draught`;
  if (stage === 4) return `${lead} Dragonfire Elixir`;
  if (stage === 5) return `${support} Phoenix Whisper Tonic`;
  return `${lead} Starlight Hexbrew`;
};

const buildOrderPrompt = (
  potionName: string,
  stage: number,
  ratioText: string,
  totalDrops: number,
  revealTargets: boolean,
  cardHint?: string,
) => {
  if (revealTargets) {
    return `Brew a ${potionName} by following the recipe card.`;
  }
  if (stage === 2) return `Brew ${potionName} using ${totalDrops} drops in the ratio ${ratioText}.`;
  if (stage === 3) return `${cardHint || 'Some drops are already in the cauldron.'} Work out the rest using the ratio ${ratioText}.`;
  if (stage === 4) return `An apprentice mixed this potion wrongly. Fix it so the ratio is ${ratioText}.`;
  if (stage === 5) return `A village healer needs ${potionName}. ${cardHint || `Use the ratio ${ratioText}.`}`;
  return `A master brewer needs ${totalDrops} drops of ${potionName}. Solve the ratio ${ratioText} to finish it.`;
};

const cardLabelsForMode = (mode: ChallengeMode) => {
  switch (mode) {
    case 'direct_recipe':
      return {
        header: 'Recipe',
        totalLabel: 'Total Drops',
        ratioLabel: 'Ratio',
        clueLabel: 'Guide',
      };
    case 'scale_recipe':
      return {
        header: 'Ratio Challenge',
        totalLabel: 'Use Altogether',
        ratioLabel: 'Target Ratio',
        clueLabel: 'Think',
      };
    case 'missing_value':
      return {
        header: 'Missing Part',
        totalLabel: 'Potion Total',
        ratioLabel: 'Target Ratio',
        clueLabel: 'Already Given',
      };
    case 'fix_mistake':
      return {
        header: 'Repair Recipe',
        totalLabel: 'Potion Total',
        ratioLabel: 'Correct Ratio',
        clueLabel: 'What Is Wrong',
      };
    case 'word_problem':
      return {
        header: 'Story Recipe',
        totalLabel: 'Potion Total',
        ratioLabel: 'Ratio To Use',
        clueLabel: 'Story Clue',
      };
    case 'multi_step':
    default:
      return {
        header: 'Master Recipe',
        totalLabel: 'Potion Total',
        ratioLabel: 'Ratio To Solve',
        clueLabel: 'Challenge',
      };
  }
};

const buildOrderFlavor = (stage: number) => {
  if (stage === 1) return 'Follow the recipe carefully.';
  if (stage === 2) return 'Use the total and the ratio to work out each ingredient.';
  if (stage === 3) return 'Some of the potion is already made. Work out what is missing.';
  if (stage === 4) return 'Something is wrong. Add the missing drops to repair the potion.';
  if (stage === 5) return 'Turn the story into the right ratio before you brew.';
  return 'This one takes more than one step. Think carefully about the ratio.';
};

const generateChallenge = (levelId: number, solved: number): Challenge => {
  const mode = modeForLevel(levelId);
  const stage = stageForMode(mode);
  const activeIndices =
    stage <= 5
      ? shuffled([0, 1, 2, 3, 4]).slice(0, 2).sort((a, b) => a - b)
      : shuffled([0, 1, 2, 3, 4]).slice(0, 3).sort((a, b) => a - b);
  const activeIngredients = activeIndices.map((index) => INGREDIENTS[index]);

  let baseRatio: number[] = [...randomPick(SIMPLE_PAIR_RATIOS)];
  let scale = 1;
  let revealTargets = false;
  let startCounts = Array.from({ length: INGREDIENTS.length }, () => 0);
  let cardHint: string | undefined;

  if (mode === 'direct_recipe') {
    baseRatio = [...randomPick(SIMPLE_PAIR_RATIOS)];
    scale = 1;
    revealTargets = true;
  } else if (mode === 'scale_recipe') {
    baseRatio = [...randomPick(SIMPLE_PAIR_RATIOS)];
    scale = randomPick([2, 3, 4]);
  } else if (mode === 'missing_value') {
    baseRatio = [...randomPick(WORD_PAIR_RATIOS)];
    scale = randomPick([2, 3, 4]);
  } else if (mode === 'fix_mistake') {
    baseRatio = [...randomPick(SIMPLE_PAIR_RATIOS.filter((ratio) => ratio[0] !== ratio[1]))];
    scale = randomPick([2, 3]);
  } else if (mode === 'word_problem') {
    baseRatio = [...randomPick(WORD_PAIR_RATIOS)];
    scale = randomPick([2, 3, 4]);
  } else {
    baseRatio = [...randomPick(SIMPLE_TRIPLE_RATIOS)];
    scale = randomPick([2, 3, 4]);
  }

  const targetCounts = baseRatio.map((value) => value * scale);
  const totalDrops = targetCounts.reduce((sum, value) => sum + value, 0);

  if (mode === 'missing_value') {
    const givenRatioIndex = 1;
    const givenIngredient = activeIngredients[givenRatioIndex];
    startCounts[activeIndices[givenRatioIndex]] = targetCounts[givenRatioIndex];
    cardHint = `${givenIngredient.name} already has ${targetCounts[givenRatioIndex]} drops in the cauldron.`;
  } else if (mode === 'fix_mistake') {
    const shortIndex = targetCounts[1] > targetCounts[0] ? 1 : 0;
    startCounts[activeIndices[0]] = targetCounts[0];
    startCounts[activeIndices[1]] = Math.max(0, targetCounts[1] - baseRatio[shortIndex === 1 ? 1 : 0]);
    const shortIngredient = activeIngredients[shortIndex];
    cardHint = `${shortIngredient.name} is too low. Add the missing drops.`;
  } else if (mode === 'word_problem') {
    const givenRatioIndex = 1;
    const givenIngredient = activeIngredients[givenRatioIndex];
    startCounts[activeIndices[givenRatioIndex]] = targetCounts[givenRatioIndex];
    const leadIngredient = activeIngredients[0];
    cardHint = `The healer has already poured ${targetCounts[givenRatioIndex]} ${givenIngredient.name} drops. How many ${leadIngredient.name} drops are needed?`;
  } else if (mode === 'multi_step') {
    cardHint = `Use ${totalDrops} drops altogether and keep the ratio balanced.`;
  }

  const orderTitle = buildPotionName(stage, activeIngredients);
  const ratioText = baseRatio.join(':');

  return {
    id: nextChallengeId(),
    orderTitle,
    orderPrompt: buildOrderPrompt(orderTitle, stage, ratioText, totalDrops, revealTargets, cardHint),
    orderFlavor: buildOrderFlavor(stage),
    stage,
    mode,
    activeIndices,
    baseRatio,
    scale,
    targetCounts,
    startCounts,
    totalDrops,
    revealTargets,
    cardHint,
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
  onBack,
  sessionState,
  sessionEvents,
}) => {
  const [challenge, setChallenge] = useState<Challenge>(() => generateChallenge(levelId, 0));
  const [counts, setCounts] = useState<number[]>(() => [...challenge.startCounts]);
  const [correctSolved, setCorrectSolved] = useState(0);
  const [attempts, setAttempts] = useState(0);
  const [feedback, setFeedback] = useState<FeedbackKind>(null);
  const [locked, setLocked] = useState(false);
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [showRules, setShowRules] = useState(false);
  const [droplets, setDroplets] = useState<Array<{ id: string; index: number }>>([]);

  const endedRef = useRef(false);
  const feedbackTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (feedbackTimerRef.current) clearTimeout(feedbackTimerRef.current);
    };
  }, []);

  const activeSet = useMemo(() => new Set(challenge.activeIndices), [challenge.activeIndices]);
  const cardLabels = useMemo(() => cardLabelsForMode(challenge.mode), [challenge.mode]);
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
  const ratioUnitTotal = useMemo(
    () => challenge.baseRatio.reduce((sum, value) => sum + value, 0),
    [challenge.baseRatio],
  );
  const ratioUnitValue = useMemo(
    () => (ratioUnitTotal > 0 ? Math.round((challenge.totalDrops / ratioUnitTotal) * 10) / 10 : 0),
    [challenge.totalDrops, ratioUnitTotal],
  );
  const isRecipeComplete = useMemo(
    () => activeTargets.length > 0 && activeTargets.every(({ current, target }) => current === target),
    [activeTargets],
  );
  const overfilledTargets = useMemo(
    () => activeTargets.filter(({ current, target }) => current > target),
    [activeTargets],
  );
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
    setCounts([...challenge.startCounts]);
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
      const nextChallenge = generateChallenge(levelId, nextCorrect);
      setChallenge(nextChallenge);
      setCounts([...nextChallenge.startCounts]);
      setFeedback(null);
      setLocked(false);
    }, SUCCESS_DELAY_MS);
  };

  const feedbackMessage = feedback === 'success'
    ? 'Perfect brew. Ready to deliver.'
    : overfilledTargets.length > 0
      ? `Too much ${joinWithAnd(overfilledTargets.map(({ ingredient }) => ingredient.name))}.`
      : isRecipeComplete
        ? 'Ratio complete. Brew the potion.'
        : currentTotal > 0
          ? 'Good start. Keep the ratio balanced.'
          : 'Add drops to begin.';

  const feedbackTone: FeedbackKind | 'hint' | 'neutral' =
    feedback === 'success'
      ? 'success'
      : overfilledTargets.length > 0
        ? 'hint'
        : 'neutral';

  const rules = useMemo(() => ({
    title: 'Potion Panic',
    summary: 'Use the task card to brew the exact ratio before you press Brew.',
    bullets: [
      'Tap ingredient bottles to add drops to the cauldron.',
      'Use the ratio and total on the task card to plan your mix.',
      'Press Brew only when the recipe is complete.',
    ],
  }), []);

  return (
    <GameUiShell backgroundImage={potionPanicBackdrop}>
      <div className="flex h-full min-h-0 flex-col gap-2 px-3 pb-[calc(env(safe-area-inset-bottom)+4rem)] pt-3 text-white">
        <section className="shrink-0">
          <GameTopBar
            onBack={onBack}
            progressLabel={`Round ${roundSolved + 1} / ${roundsToWin}`}
            lives={sessionState?.lives}
            className="mx-auto w-full max-w-[780px]"
            audioEnabled={audioEnabled}
            onToggleAudio={() => setAudioEnabled((previous) => !previous)}
            onHelp={() => setShowRules(true)}
          />
        </section>

        <section className="shrink-0">
          <StoryCard className="mx-auto max-w-[780px]">
            <p className="text-[clamp(13px,2vh,18px)] font-semibold text-white/90">
              The village apothecary needs a {challenge.orderTitle.toLowerCase()}.
            </p>
          </StoryCard>
        </section>

        <section className="shrink-0">
          <TaskCard className="mx-auto w-full max-w-[780px]">
            <div className="text-[10px] font-black uppercase tracking-[0.18em] text-amber-900/80">Task Card</div>
            <div className="mt-1 text-[clamp(15px,2.2vh,20px)] font-black">{challenge.orderTitle}</div>
            <div className="mt-2 grid grid-cols-2 gap-2">
              <div className="rounded-[1rem] border border-amber-200/40 bg-white/70 px-3 py-2">
                <div className="text-[10px] font-black uppercase tracking-[0.14em] text-amber-900/70">{cardLabels.totalLabel}</div>
                <div className="mt-0.5 text-lg font-black text-slate-900">{challenge.totalDrops}</div>
              </div>
              <div className="rounded-[1rem] border border-amber-200/40 bg-white/70 px-3 py-2">
                <div className="text-[10px] font-black uppercase tracking-[0.14em] text-amber-900/70">{cardLabels.ratioLabel}</div>
                <div className="mt-0.5 text-lg font-black text-slate-900">{challenge.baseRatio.join(' : ')}</div>
              </div>
            </div>
            {ratioUnitTotal > 0 ? (
              <div className="mt-2 rounded-[1rem] border border-amber-200/35 bg-white/70 px-3 py-2">
                <div className="text-[10px] font-black uppercase tracking-[0.14em] text-amber-900/70">Unit Value</div>
                <div className="mt-1 flex flex-wrap items-center gap-1">
                  {Array.from({ length: Math.min(ratioUnitTotal, 12) }).map((_, index) => (
                    <span
                      key={`unit-${index}`}
                      className="h-2.5 w-2.5 rounded-full border border-amber-400/60 bg-amber-200/90"
                    />
                  ))}
                  <span className="ml-1 text-[11px] font-black text-slate-900">
                    1 unit = {ratioUnitValue} drop{ratioUnitValue === 1 ? '' : 's'}
                  </span>
                </div>
              </div>
            ) : null}
            {challenge.cardHint ? (
              <div className="mt-2 rounded-[1rem] border border-amber-200/30 bg-white/70 px-3 py-2 text-[11px] font-semibold text-slate-700">
                {challenge.cardHint}
              </div>
            ) : null}
            <div className="mt-2 grid gap-1.5">
              {activeTargets.map(({ ingredient, target }) => (
                <div key={`recipe-${ingredient.id}`} className="flex items-center justify-between rounded-[0.95rem] border border-amber-200/30 bg-white/80 px-2.5 py-2">
                  <div className="flex items-center gap-2">
                    <span
                      aria-hidden="true"
                      className="h-3.5 w-3.5 rounded-full border border-white/45"
                      style={{ backgroundColor: ingredient.color, boxShadow: `0 0 8px ${ingredient.glow}` }}
                    />
                    <span className="text-[11px] font-black text-slate-800">{ingredient.name}</span>
                  </div>
                  <span className="text-[11px] font-black text-amber-900">
                    {challenge.revealTargets ? `x${target}` : ingredient.short}
                  </span>
                </div>
              ))}
            </div>
          </TaskCard>
        </section>

        <section className="min-h-0 flex-1">
          <div className="mx-auto grid h-full w-full max-w-[780px] min-h-0 grid-rows-[minmax(0,1fr)_auto] gap-2">
            <div className="relative min-h-0 overflow-hidden rounded-[1.6rem] border border-white/12 bg-slate-950/16 shadow-[0_16px_30px_rgba(15,23,42,0.2)]">
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
                className="pointer-events-none absolute left-1/2 top-[6%] h-[72%] max-w-none -translate-x-1/2 object-contain"
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
              <AnimatePresence mode="wait">
                {feedback === 'success' ? (
                  <motion.div
                    key="success"
                    initial={{ opacity: 0, scale: 0.82 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    className="pointer-events-none absolute right-4 top-4 flex flex-col items-center gap-1.5"
                  >
                    <div className="flex h-14 w-14 items-center justify-center rounded-full border border-emerald-200/80 bg-emerald-400/92 shadow-[0_0_28px_rgba(52,211,153,0.7)]">
                      <CheckCircle2 className="h-7 w-7 text-slate-950" />
                    </div>
                    <p className="text-[10px] font-black uppercase tracking-[0.14em] text-emerald-100">Perfect Brew</p>
                  </motion.div>
                ) : null}
              </AnimatePresence>
            </div>

            <div className="grid shrink-0 grid-cols-5 gap-1.5">
              {INGREDIENTS.map((ingredient, index) => {
                const isActive = activeSet.has(index);
                const bottleArt = POTION_BOTTLE_ART[ingredient.id];
                return (
                  <motion.button
                    key={ingredient.id}
                    type="button"
                    whileTap={isActive ? { scale: 0.96, y: 2 } : undefined}
                    onClick={() => addIngredient(index)}
                    disabled={locked || !isActive}
                    aria-label={isActive ? `Add ${ingredient.name} to the potion` : `${ingredient.name} is not needed for this recipe`}
                    className={`relative flex h-[clamp(84px,11vh,104px)] flex-col items-center justify-between rounded-[1.25rem] border border-white/10 bg-[linear-gradient(180deg,rgba(15,23,42,0.12),rgba(15,23,42,0.24))] px-1 py-1.5 shadow-[0_10px_14px_rgba(2,6,23,0.24)] transition ${locked || !isActive ? 'opacity-65' : ''}`}
                    style={isActive ? { boxShadow: `0 12px 22px rgba(2,6,23,0.28), 0 0 18px ${ingredient.glow}` } : undefined}
                  >
                    <div className="pointer-events-none flex h-[48px] w-full items-center justify-center">
                      {bottleArt ? (
                        <img
                          src={bottleArt}
                          alt=""
                          aria-hidden="true"
                          className="h-full w-auto object-contain select-none"
                          style={{
                            filter: isActive ? 'none' : 'grayscale(0.45) saturate(0.7) opacity(0.8)',
                          }}
                        />
                      ) : null}
                    </div>
                    <span className="relative z-10 text-[9px] font-black uppercase tracking-[0.02em] text-cyan-50">{ingredient.name}</span>
                  </motion.button>
                );
              })}
            </div>
          </div>
        </section>

        <section className="shrink-0">
          <FeedbackStrip
            tone={feedbackTone === 'success' ? 'success' : feedbackTone === 'hint' ? 'warning' : 'neutral'}
            className="mx-auto w-full max-w-[780px]"
          >
            {feedbackMessage}
          </FeedbackStrip>
        </section>

        <section className="shrink-0">
          <div className="mx-auto flex w-full max-w-[780px] items-center gap-2">
            <PrimaryButton onClick={onBrew} disabled={locked || !isRecipeComplete} className="flex-1">
              <Wand2 className="h-4.5 w-4.5" />
              Brew Potion
            </PrimaryButton>
            <SecondaryButton onClick={resetCurrent} disabled={locked}>
              Reset
            </SecondaryButton>
          </div>
        </section>
      </div>

      <GameRulesModal
        isOpen={showRules}
        onClose={() => setShowRules(false)}
        rules={rules}
      />

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

    </GameUiShell>
  );
};

export default PotionPourGame;

