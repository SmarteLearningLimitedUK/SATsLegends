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
  GameQuestionCard,
  GameUiShell,
  GameTopBar,
  PrimaryButton,
  SecondaryButton,
} from '../components/game-ui/GameUiKit';
import GameScreenLayout from '../components/game-ui/GameScreenLayout';
import cauldrenAndPotionArt from '../assets/coul.png';
import potionPanicBackdrop from '../assets/maps/backgroundsforgames/potionpanic.jpg';
import azureBottle from '../assets/potion_bottles/azure.png';
import mossBottle from '../assets/potion_bottles/moss.png';
import nightBottle from '../assets/potion_bottles/night.png';
import rubyBottle from '../assets/potion_bottles/ruby.png';
import sunBottle from '../assets/potion_bottles/sun.png';

interface PotionPanicGameProps {
  levelId: number;
  avatarId: string;
  onVictory: (stars: number, XP: number) => void;
  onGameOver: (XP: number) => void;
  onBack: () => void;
}

type PotionPanicProps = PotionPanicGameProps & MiniGameShellContractProps;
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
  orderTitle: string;
  orderPrompt: string;
  orderFlavor: string;
  stage: number;
  mode: 'direct_recipe' | 'scale_recipe' | 'missing_value' | 'fix_mistake' | 'word_problem' | 'multi_step';
  activeIndices: number[];
  baseRatio: number[];
  scale: number;
  targetCounts: number[];
  availableCounts: number[];
  startCounts: number[];
  totalDrops: number;
  revealTargets: boolean;
  cardHint?: string;
  batchLabel?: 'single' | 'double' | 'triple' | 'half';
}

type ChallengeMode = Challenge['mode'];

const INGREDIENTS: Ingredient[] = [
  { id: 'red', name: 'Ruby', short: 'R', color: '#ff4d6d', glow: 'rgba(255,77,109,0.82)', rgb: [255, 77, 109] },
  { id: 'blue', name: 'Azure', short: 'B', color: '#38bdf8', glow: 'rgba(56,189,248,0.82)', rgb: [56, 189, 248] },
  { id: 'green', name: 'Oak', short: 'O', color: '#22c55e', glow: 'rgba(34,197,94,0.82)', rgb: [34, 197, 94] },
  { id: 'gold', name: 'Clarity', short: 'C', color: '#facc15', glow: 'rgba(250,204,21,0.82)', rgb: [250, 204, 21] },
  { id: 'violet', name: 'Syrup', short: 'S', color: '#a855f7', glow: 'rgba(168,85,247,0.82)', rgb: [168, 85, 247] },
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

const randomPick = <T,>(list: readonly T[]) => list[Math.floor(Math.random() * list.length)];

const shuffled = <T,>(list: readonly T[]) => {
  const next = [...list];
  for (let i = next.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [next[i], next[j]] = [next[j], next[i]];
  }
  return next;
};

type PairRatio = [number, number];
type TripleRatio = [number, number, number];
type QuadRatio = [number, number, number, number];
type Ratio = PairRatio | TripleRatio;

const SIMPLE_PAIR_RATIOS: PairRatio[] = [
  [1, 1],
  [2, 1],
  [3, 1],
  [3, 2],
  [4, 3],
  [5, 2],
  [5, 4],
  [6, 5],
];

const ADVANCED_PAIR_RATIOS: PairRatio[] = [
  [4, 1],
  [5, 1],
  [5, 2],
  [5, 3],
  [6, 1],
  [6, 5],
  [7, 2],
  [7, 3],
  [7, 4],
  [8, 3],
  [8, 5],
  [9, 4],
  [9, 5],
  [10, 3],
  [11, 4],
];

const SIMPLE_TRIPLE_RATIOS: TripleRatio[] = [
  [1, 1, 1],
  [2, 1, 1],
  [2, 2, 1],
  [3, 1, 2],
  [3, 1, 1],
  [3, 2, 1],
  [4, 2, 1],
];

const ADVANCED_TRIPLE_RATIOS: TripleRatio[] = [
  [3, 2, 1],
  [4, 2, 1],
  [4, 3, 2],
  [5, 3, 2],
  [5, 4, 3],
  [6, 4, 2],
  [6, 5, 3],
  [7, 4, 3],
];

const SIMPLE_QUAD_RATIOS: QuadRatio[] = [
  [1, 1, 1, 1],
  [2, 1, 1, 1],
  [2, 2, 1, 1],
  [3, 2, 1, 2],
  [3, 3, 2, 1],
];

const ADVANCED_QUAD_RATIOS: QuadRatio[] = [
  [3, 2, 1, 4],
  [4, 2, 3, 1],
  [5, 3, 2, 4],
  [6, 4, 3, 2],
  [7, 4, 3, 5],
  [8, 5, 4, 3],
];

const WORD_PAIR_RATIOS: PairRatio[] = [
  [2, 3],
  [3, 2],
  [4, 3],
  [5, 3],
  [6, 5],
  [7, 5],
];

const HALF_BATCH_PAIR_RATIOS: PairRatio[] = [
  [4, 10],
  [6, 8],
  [8, 12],
  [6, 14],
  [10, 12],
  [12, 18],
];

const HALF_BATCH_TRIPLE_RATIOS: TripleRatio[] = [
  [4, 6, 2],
  [6, 10, 4],
  [8, 12, 6],
  [10, 14, 6],
  [12, 16, 8],
];

const HALF_BATCH_QUAD_RATIOS: QuadRatio[] = [
  [4, 6, 2, 4],
  [6, 8, 4, 2],
  [8, 10, 6, 4],
  [10, 12, 8, 6],
];

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
const roundsToWinForLevel = (levelId: number) => 7 + Math.floor((levelId - 1) / 2);

const buildPotionName = (active: Ingredient[]) => {
  const lead = active[0]?.name || 'Star';
  if (lead === 'Azure') return 'Azure Cleanse';
  if (lead === 'Oak') return 'Heart of Oak';
  if (lead === 'Ruby') return 'Crimson Courage';
  if (lead === 'Clarity') return 'Solar Clarity';
  if (lead === 'Syrup') return 'Midnight Syrup';
  return `${lead} Elixir`;
};

const buildStoryLead = (
  title: string,
  stage: number,
  batchLabel?: Challenge['batchLabel'],
  mode?: ChallengeMode
) => {
  switch (mode) {
    case 'missing_value':
      return 'The Monster Minds have stolen part of the recipe.';
    case 'fix_mistake':
      return 'The Monster Minds have messed up the mixture.';
    case 'scale_recipe':
      return 'The Monster Minds have tampered with a larger batch.';
    case 'multi_step':
      return 'The apothecary records have been scrambled by the Monster Minds.';
    case 'word_problem':
      return 'The Monster Minds caused chaos in the apothecary orders.';
    case 'direct_recipe':
    default:
      return 'The Monster Minds have pillaged the apothecary supplies.';
  }
};

const buildOrderPrompt = (
  ratioText: string,
  storyLead: string,
  mode?: ChallengeMode
) => {
  const concisePrompt = `The potion is unstable - restore it to the recipe of ${ratioText}.`;

  switch (mode) {
    case 'missing_value':
      return concisePrompt;

    case 'fix_mistake':
      return concisePrompt;

    case 'scale_recipe':
      return concisePrompt;

    case 'multi_step':
      return concisePrompt;

    case 'word_problem':
      return concisePrompt;

    case 'direct_recipe':
    default:
      return concisePrompt;
  }
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
  if (stage <= 2) return 'Easy: Simple doubling/halving';
  if (stage <= 4) return 'Medium: Scaling up';
  return 'Hard: Missing both parts / word problems';
};

const buildAvailableCounts = (
  levelId: number,
  activeIndices: number[],
  targetCounts: number[],
) => {
  const availableCounts = Array.from({ length: INGREDIENTS.length }, () => 0);

  activeIndices.forEach((ingredientIndex, ratioIndex) => {
    availableCounts[ingredientIndex] = targetCounts[ratioIndex] || 0;
  });

  if (levelId < 7) return availableCounts;

  const leftovers: number[] = targetCounts.map((targetCount) => (
    targetCount > 1 ? Math.floor(Math.random() * targetCount) : 0
  ));

  const hasLeftovers = leftovers.some((leftover) => leftover > 0);
  if (!hasLeftovers) {
    const refillIndex = targetCounts.findIndex((targetCount) => targetCount > 1);
    if (refillIndex >= 0) {
      leftovers[refillIndex] = 1;
    }
  }

  activeIndices.forEach((ingredientIndex, ratioIndex) => {
    availableCounts[ingredientIndex] = (targetCounts[ratioIndex] || 0) + (leftovers[ratioIndex] || 0);
  });

  return availableCounts;
};

const generateChallenge = (levelId: number, solved: number, previousTitle?: string): Challenge => {
  let challenge: Challenge;
  let attempts = 0;

  do {
    const mode = modeForLevel(levelId);
    const stage = stageForMode(mode);
    const maxIngredients = INGREDIENTS.length;
    const activeCount = levelId >= 10
      ? Math.min(5, maxIngredients)
      : levelId >= 7
        ? Math.min(4, maxIngredients)
        : levelId >= 4
          ? Math.min(3, maxIngredients)
          : 2;
    let activeIndices =
      shuffled([0, 1, 2, 3, 4]).slice(0, activeCount).sort((a, b) => a - b);
    let baseRatio: number[] = [...randomPick(SIMPLE_PAIR_RATIOS)];
    let scale = 1;
    let revealTargets = false;
    let startCounts = Array.from({ length: INGREDIENTS.length }, () => 0);
    let cardHint: string | undefined;
    let batchLabel: Challenge['batchLabel'] = 'single';

    if (stage >= 4 && Math.random() < 0.45) {
      batchLabel = randomPick(['double', 'triple', 'half']);
    }

    const pickPairRatio = () => [...randomPick(stage >= 4 ? ADVANCED_PAIR_RATIOS : SIMPLE_PAIR_RATIOS)];
    const pickTripleRatio = () => [...randomPick(stage >= 6 ? ADVANCED_TRIPLE_RATIOS : SIMPLE_TRIPLE_RATIOS)];
    const pickQuadRatio = () => [...randomPick(stage >= 7 ? ADVANCED_QUAD_RATIOS : SIMPLE_QUAD_RATIOS)];

    const selectBaseRatio = () => {
      if (activeCount === 4) return pickQuadRatio();
      if (activeCount === 3) return pickTripleRatio();
      return pickPairRatio();
    };

    if (mode === 'direct_recipe') {
      baseRatio = selectBaseRatio();
      scale = 1;
      revealTargets = true;
    } else if (mode === 'scale_recipe') {
      baseRatio = selectBaseRatio();
      scale = randomPick(stage >= 4 ? [3, 4, 5, 6, 7, 8] : [2, 3, 4, 5, 6]);
    } else if (mode === 'missing_value') {
      baseRatio = activeCount === 2
        ? [...randomPick(stage >= 4 ? WORD_PAIR_RATIOS.concat(ADVANCED_PAIR_RATIOS) : WORD_PAIR_RATIOS)]
        : selectBaseRatio();
      scale = randomPick(stage >= 5 ? [3, 4, 5, 6, 7, 8] : [2, 3, 4, 5]);
    } else if (mode === 'fix_mistake') {
      baseRatio = selectBaseRatio();
      scale = randomPick(stage >= 5 ? [3, 4, 5, 6, 7] : [2, 3, 4]);
    } else if (mode === 'word_problem') {
      baseRatio = activeCount === 2
        ? [...randomPick(stage >= 5 ? WORD_PAIR_RATIOS.concat(ADVANCED_PAIR_RATIOS) : WORD_PAIR_RATIOS)]
        : selectBaseRatio();
      scale = randomPick(stage >= 5 ? [3, 4, 5, 6, 7, 8] : [2, 3, 4, 5]);
    } else {
      baseRatio = selectBaseRatio();
      scale = randomPick(stage >= 6 ? [4, 5, 6, 7, 8] : [2, 3, 4, 5]);
    }

    if (batchLabel === 'half') {
      if (activeCount === 4) {
        baseRatio = [...randomPick(HALF_BATCH_QUAD_RATIOS)];
      } else if (activeCount === 3) {
        baseRatio = [...randomPick(HALF_BATCH_TRIPLE_RATIOS)];
      } else {
        baseRatio = [...randomPick(HALF_BATCH_PAIR_RATIOS)];
      }
      scale = 0.5;
    } else if (batchLabel === 'double') {
      scale = Math.max(scale, 2);
    } else if (batchLabel === 'triple') {
      scale = Math.max(scale, 3);
    }

    if (levelId <= 1) {
      activeIndices = [1, 3];
      baseRatio = [2, 5];
      scale = 1;
      batchLabel = 'single';
    }

    const targetCounts = baseRatio.map((value) => Math.round(value * scale));
    const availableCounts = buildAvailableCounts(levelId, activeIndices, targetCounts);
    const totalDrops = targetCounts.reduce((sum, value) => sum + value, 0);
    const activeIngredients = activeIndices.map((index) => INGREDIENTS[index]);

    if (levelId <= 1) {
      startCounts[1] = targetCounts[0] || 0;
      cardHint = `${INGREDIENTS[1].name} has ${targetCounts[0] || 0} drops.`;
    } else if (mode === 'missing_value') {
      const givenRatioIndex = 1;
      startCounts[activeIndices[givenRatioIndex]] = targetCounts[givenRatioIndex];
      const givenIngredient = activeIngredients[givenRatioIndex];
      cardHint = `${givenIngredient.name} has ${targetCounts[givenRatioIndex]} drops.`;
    } else if (mode === 'fix_mistake') {
      const shortIndex = targetCounts[1] > targetCounts[0] ? 1 : 0;
      startCounts[activeIndices[0]] = targetCounts[0];
      startCounts[activeIndices[1]] = Math.max(0, targetCounts[1] - baseRatio[shortIndex === 1 ? 1 : 0]);
      const shortIngredient = activeIngredients[shortIndex];
      cardHint = `${shortIngredient.name} needs fixing.`;
    } else if (mode === 'word_problem') {
      const givenRatioIndex = 1;
      const givenIngredient = activeIngredients[givenRatioIndex];
      startCounts[activeIndices[givenRatioIndex]] = targetCounts[givenRatioIndex];
      const leadIngredient = activeIngredients[0];
      cardHint = `Already have ${targetCounts[givenRatioIndex]} ${givenIngredient.name} drops. Need ${leadIngredient.name}?`;
    } else if (mode === 'multi_step') {
      cardHint = `The potion holds ${totalDrops} drops.`;
    }

    const orderTitle = buildPotionName(activeIngredients);
    const ratioText = simplifyRatio(targetCounts).join(':');
    const storyLead = buildStoryLead(orderTitle, stage, batchLabel, mode);

    challenge = {
      id: nextChallengeId(),
      orderTitle,
      orderPrompt: buildOrderPrompt(ratioText, storyLead, mode),
      orderFlavor: buildOrderFlavor(stage),
      stage,
      mode,
      activeIndices,
      baseRatio,
      scale,
      targetCounts,
      availableCounts,
      startCounts,
      totalDrops,
      revealTargets,
      cardHint,
      batchLabel,
    };
    attempts += 1;
  } while (previousTitle && challenge.orderTitle === previousTitle && attempts < 5);

  return challenge;
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

const PotionPanicGame: React.FC<PotionPanicProps> = ({
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
  const [hasBrewed, setHasBrewed] = useState(false);
  const [locked, setLocked] = useState(false);
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [droplets, setDroplets] = useState<Array<{ id: string; index: number }>>([]);
  const [usesSharedHud, setUsesSharedHud] = useState(false);

  const endedRef = useRef(false);
  const feedbackTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (feedbackTimerRef.current) clearTimeout(feedbackTimerRef.current);
    };
  }, []);

  useEffect(() => {
    if (typeof document === 'undefined') return;
    setUsesSharedHud(Boolean(document.querySelector('[data-unified-minigame-hud="true"]')));
  }, []);

  useEffect(() => {
    setHasBrewed(false);
  }, [challenge.id]);

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
  const ratioText = useMemo(() => simplifyRatio(challenge.targetCounts).join(':'), [challenge.targetCounts]);
  const activeTargets = useMemo(
    () => challenge.activeIndices.map((idx) => ({
      index: idx,
      ingredient: INGREDIENTS[idx],
      current: counts[idx] || 0,
      target: targetByIngredient.get(idx) ?? 0,
      available: challenge.availableCounts[idx] ?? (targetByIngredient.get(idx) ?? 0),
      remaining: Math.max(0, (targetByIngredient.get(idx) ?? 0) - (counts[idx] || 0)),
    })),
    [challenge.activeIndices, challenge.availableCounts, counts, targetByIngredient],
  );
  const lockedIngredientIds = useMemo(() => {
    const locked = new Set<number>();
    activeTargets.forEach(({ available, index }) => {
      if ((challenge.startCounts[index] || 0) >= available && available > 0) {
        locked.add(index);
      }
    });
    return locked;
  }, [activeTargets, challenge.startCounts]);
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

  const recipeTokens = useMemo(
    () => activeTargets.flatMap(({ ingredient, target }) => (
      Array.from({ length: Math.min(8, target) }, (_, idx) => ({
        id: `${ingredient.id}-${idx}`,
        color: ingredient.color,
        glow: ingredient.glow,
      }))
    )),
    [activeTargets],
  );

  const ingredientGridClass = activeTargets.length <= 2
    ? 'grid-cols-2'
    : activeTargets.length === 3
      ? 'grid-cols-3'
      : 'grid-cols-5';

  useEffect(() => {
    if (!sessionState || endedRef.current) return;
    if (sessionState.timeLeft <= 0 || sessionState.lives <= 0) {
      endedRef.current = true;
      emitMiniGameSessionEvent(sessionEvents, 'game_failed', {
        score: correctSolved * 100,
        reason: sessionState.timeLeft <= 0 ? 'time_up' : 'no_lives',
      });
      onGameOver(correctSolved * 100);
    }
  }, [correctSolved, onGameOver, sessionEvents, sessionState]);

  const addIngredient = (index: number) => {
    if (locked || endedRef.current || !activeSet.has(index) || lockedIngredientIds.has(index)) return;

    setCounts((prev) => {
      const available = challenge.availableCounts[index] ?? 0;
      if (available > 0 && (prev[index] || 0) >= available) return prev;

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
    setHasBrewed(false);
  };

  const onBrew = () => {
    if (locked || endedRef.current) return;
    setHasBrewed(true);

    if (!isRecipeComplete) {
      setFeedback('error');
      setAttempts((prev) => prev + 1);
      emitMiniGameSessionEvent(sessionEvents, 'incorrect_answer', {
        score: correctSolved * 100,
        metadata: { challengeId: challenge.id, stage: challenge.stage },
      });
      setLocked(true);
      feedbackTimerRef.current = setTimeout(() => {
        if (endedRef.current) return;
        setFeedback(null);
        setLocked(false);
      }, SUCCESS_DELAY_MS);
      return;
    }

    const nextCorrect = correctSolved + 1;
    const scoreNow = nextCorrect * 100;
    const roundsGoal = roundsToWinForLevel(levelId);

    setLocked(true);
    setFeedback('success');
    setCorrectSolved(nextCorrect);
    emitMiniGameSessionEvent(sessionEvents, 'correct_answer', {
      score: scoreNow,
      metadata: { round: nextCorrect, roundsGoal },
    });
    emitMiniGameSessionEvent(sessionEvents, 'puzzle_complete', {
      score: scoreNow,
      metadata: { challengeId: challenge.id, stage: challenge.stage },
    });

    feedbackTimerRef.current = setTimeout(() => {
      if (endedRef.current) return;
      if (nextCorrect >= roundsGoal) {
        endedRef.current = true;
        const totalAttempts = attempts + 1;
        const stars = starsForAccuracy(nextCorrect, totalAttempts);
        emitMiniGameSessionEvent(sessionEvents, 'game_complete', {
          score: scoreNow,
          stars,
          metadata: { totalAttempts, roundsGoal },
        });
        onVictory(stars, scoreNow);
        return;
      }
      const nextChallenge = generateChallenge(levelId, nextCorrect, challenge.orderTitle);
      setChallenge(nextChallenge);
      setCounts([...nextChallenge.startCounts]);
      setFeedback(null);
      setLocked(false);
    }, SUCCESS_DELAY_MS);
  };

  const feedbackMessage = feedback === 'success'
    ? 'Apothecary restored!'
    : feedback === 'error'
      ? 'Still scrambled — try again.'
      : overfilledTargets.length > 0
        ? 'Too much — the mix is off.'
        : isRecipeComplete
          ? 'That looks right. Brew it.'
          : currentTotal > 0
            ? 'The ratio is still off.'
            : 'Rebuild the potion.';

  const roundsToWin = roundsToWinForLevel(levelId);

  return (
    <GameUiShell backgroundImage={potionPanicBackdrop} backgroundOpacity={1} overlayDisabled>
        <GameScreenLayout
        className="px-3 pb-[calc(env(safe-area-inset-bottom)+0.7rem)] pt-0 text-white"
        mainClassName="relative z-[35] overflow-visible"
        top={(
          <div className="relative">
            <div className="relative z-10">
                <GameTopBar
                  onBack={onBack}
                  lives={sessionState?.lives}
                  className="mx-auto w-full max-w-[780px]"
                  audioEnabled={audioEnabled}
                onToggleAudio={() => setAudioEnabled((previous) => !previous)}
              />
            </div>
          </div>
        )}
        main={(
          <div className="mx-auto grid h-full w-full max-w-[780px] min-h-0 grid-rows-[minmax(0,1fr)_auto] gap-2">
        <div className="relative z-[35] min-h-0 overflow-visible bg-transparent">
          <div
            className="absolute inset-0 z-[70]"
            style={{ transform: 'translateY(calc(var(--potion-cauldron-shift, 0px) + 36px))' }}
          >
            <div className="pointer-events-none absolute left-1/2 top-[84%] z-0 h-14 w-[72%] -translate-x-1/2 rounded-full bg-black/55 blur-md" />
            <div className="pointer-events-none absolute left-1/2 top-[76%] z-10 h-[24%] w-[58%] -translate-x-1/2 rounded-full bg-[radial-gradient(circle,rgba(255,164,48,0.85)_0%,rgba(255,120,32,0.42)_38%,rgba(255,120,32,0)_75%)] blur-[16px]" />
            <div className="absolute left-1/2 top-[72%] z-10 flex h-[18%] w-[48%] -translate-x-1/2 translate-y-[48px] items-end justify-between px-5">
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
              className="pointer-events-none absolute left-1/2 bottom-[13%] z-[90] h-[31%] max-w-none -translate-x-1/2 translate-y-[40px] object-contain md:bottom-[11%]"
            />
            <div className="absolute left-1/2 bottom-[28.5%] z-20 h-[12.5%] w-[27.5%] -translate-x-1/2 translate-y-[45px] overflow-hidden rounded-[46%]">
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
                    <p className="text-[10px] font-black uppercase tracking-[0.14em] text-emerald-100">Perfect brew!</p>
                  </motion.div>
            ) : feedback === 'error' ? (
                  <motion.div
                    key="error"
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.92 }}
                    className="pointer-events-none absolute inset-x-0 bottom-[18%] top-[12%] flex items-end justify-center"
                  >
                    <div className="relative h-full w-full max-w-[420px]">
                      {Array.from({ length: 7 }).map((_, idx) => {
                        const offset = idx - 3;
                        return (
                          <motion.span
                            key={`smoke-${idx}`}
                            className="absolute left-1/2 bottom-[12%] h-14 w-14 rounded-full bg-[radial-gradient(circle,rgba(21,2,36,0.96)_0%,rgba(109,40,217,0.84)_38%,rgba(15,23,42,0)_72%)] blur-[4px]"
                            style={{ marginLeft: `${offset * 14}px` }}
                            initial={{ opacity: 0, scale: 0.25, y: 0 }}
                            animate={{
                              opacity: [0, 0.95, 0],
                              scale: [0.25, 1, 1.4],
                              y: [0, -24 - idx * 4, -72 - idx * 8],
                              x: [0, offset * 9, offset * 18],
                              rotate: [0, offset * 10, offset * 22],
                            }}
                            transition={{
                              duration: 1.15,
                              delay: idx * 0.06,
                              ease: 'easeOut',
                              repeat: Infinity,
                              repeatDelay: 0.25,
                            }}
                          />
                        );
                      })}
                      <motion.div
                        className="absolute left-1/2 bottom-[18%] h-24 w-24 -translate-x-1/2 rounded-full bg-[radial-gradient(circle,rgba(24,2,44,0.9)_0%,rgba(88,28,135,0.48)_38%,rgba(15,23,42,0)_76%)] blur-[6px]"
                        animate={{ scale: [0.85, 1.05, 0.9], opacity: [0.35, 0.82, 0.42] }}
                        transition={{ duration: 1.1, repeat: Infinity, ease: 'easeInOut' }}
                      />
                    </div>
                  </motion.div>
            ) : null}
          </AnimatePresence>
        </div>

          </div>
        )}
        bottom={(
          <div className="flex flex-col gap-2">
            <div className="min-h-[2.6rem]">
              {hasBrewed ? (
                <FeedbackStrip
                  tone={feedback === 'success' ? 'success' : feedback === 'error' || overfilledTargets.length > 0 ? 'warning' : 'neutral'}
                  className="mx-auto w-full max-w-[780px]"
                >
                  {feedbackMessage}
                </FeedbackStrip>
              ) : null}
            </div>

            <div className="mx-auto w-full max-w-[780px] rounded-[1.1rem] border border-white/12 bg-black/38 px-2 py-1.5 shadow-[0_10px_18px_rgba(2,6,23,0.2)]">
              <div className={`grid ${ingredientGridClass} gap-1.5`}>
                {activeTargets.map(({ available, ingredient, index, current, target }) => {
                  const isActive = activeSet.has(index);
                  const isLockedIngredient = lockedIngredientIds.has(index);
                  const isOutOfStock = available > 0 && current >= available;
                  const bottleArt = POTION_BOTTLE_ART[ingredient.id];
                  return (
                    <motion.button
                      key={ingredient.id}
                      type="button"
                      whileTap={isActive ? { scale: 0.96, y: 2 } : undefined}
                      onClick={() => addIngredient(index)}
                      disabled={locked || !isActive || isLockedIngredient || isOutOfStock}
                      aria-label={isActive ? `Add ${ingredient.name} to the potion. ${available - current} available.` : `${ingredient.name} is not needed for this recipe`}
                      className={`relative flex h-[clamp(68px,9.2vh,88px)] flex-col items-center justify-between rounded-[1.1rem] border border-white/10 bg-[linear-gradient(180deg,rgba(15,23,42,0.35),rgba(15,23,42,0.6))] px-1 py-1 shadow-[0_10px_14px_rgba(2,6,23,0.24)] transition ${locked || !isActive || isLockedIngredient || isOutOfStock ? 'opacity-60 grayscale' : ''}`}
                      style={isActive && !isLockedIngredient && !isOutOfStock ? { boxShadow: `0 12px 22px rgba(2,6,23,0.28), 0 0 18px ${ingredient.glow}` } : undefined}
                    >
                      <div className="pointer-events-none flex h-[38px] w-full items-center justify-center">
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
                      <span className="relative z-10 text-[10px] font-black text-cyan-100">
                        {current}/{target}
                        {available > target ? (
                          <span className="ml-1 text-[8px] text-amber-100">stock {available}</span>
                        ) : null}
                      </span>
                    </motion.button>
                  );
                })}
              </div>
            </div>

            <div className="mx-auto flex w-full max-w-[780px] items-center gap-2 pb-[calc(env(safe-area-inset-bottom)+0.2rem)]">
              <PrimaryButton onClick={onBrew} disabled={locked} className="flex-1 potion-brew-button">
                <Wand2 className="h-4.5 w-4.5" />
                {isRecipeComplete ? 'Brew Potion' : 'Brew Potion'}
              </PrimaryButton>
              <SecondaryButton onClick={resetCurrent} disabled={locked}>
                Reset
              </SecondaryButton>
            </div>
          </div>
        )}
        overlay={(
          <>
            <div
              className="pointer-events-none fixed left-0 right-0 z-[60]"
              style={{ top: '6px' }}
            >
              <GameQuestionCard className="mx-auto w-[min(100%-1rem,720px)]" bodyClassName="mt-0.5">
                <div className="text-[clamp(0.95rem,3.4vw,1.18rem)] font-bold text-white">
                  {challenge.orderTitle}
                </div>
                <div className="mt-0.5 text-[11px] font-black text-amber-100">
                  Ratio {ratioText}
                </div>
                <div className="mt-1 whitespace-pre-line text-[10px] font-semibold leading-[1.1] text-cyan-100/90">
                  {challenge.orderPrompt || 'Use the ratio to complete the potion.'}
                </div>
              </GameQuestionCard>
            </div>
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
          </>
        )}
      />
    </GameUiShell>
  );
};

export default PotionPanicGame;






