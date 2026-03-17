import React, { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import confetti from 'canvas-confetti';
import AssetIcon from './AssetIcon';
import GameplayHUD from './GameplayHUD';
import GameActionDock from './GameActionDock';
import GameplaySceneBackdrop from './GameplaySceneBackdrop';
import { AVATARS, POTION_POUR_LEVELS } from '../constants';
import { triggerHaptic } from '../haptics';
import { GameScreenShell, PuzzleStage } from './layout/ScreenPrimitives';

interface PotionPourGameProps {
  levelId: number;
  avatarId: string;
  onVictory: (stars: number, score: number) => void;
  onGameOver: (score: number) => void;
  onBack: () => void;
}

type PotionRoundMode = 'simple' | 'scaled' | 'missing' | 'compare';

interface IngredientType {
  id: string;
  label: string;
  short: string;
  colors: [string, string];
}

interface RecipePart {
  ingredientId: string;
  count: number;
}

interface PotionRound {
  mode: PotionRoundMode;
  title: string;
  prompt: string;
  support: string;
  recipe: RecipePart[];
  hiddenIngredientId?: string;
  prefilled: RecipePart[];
  compareOptions?: Array<{ id: string; recipe: RecipePart[]; correct: boolean }>;
}

const INGREDIENTS: IngredientType[] = [
  { id: 'crystal', label: 'Blue Crystal', short: 'BC', colors: ['#38bdf8', '#2563eb'] },
  { id: 'mushroom', label: 'Red Mushroom', short: 'RM', colors: ['#fb7185', '#be123c'] },
  { id: 'herb', label: 'Green Herb', short: 'GH', colors: ['#4ade80', '#15803d'] },
  { id: 'gem', label: 'Purple Gem', short: 'PG', colors: ['#c084fc', '#7c3aed'] },
  { id: 'flower', label: 'Yellow Flower', short: 'YF', colors: ['#facc15', '#f59e0b'] },
];

const ingredientById = Object.fromEntries(INGREDIENTS.map((ingredient) => [ingredient.id, ingredient])) as Record<string, IngredientType>;

const randomInt = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;
const pickTwo = () => [...INGREDIENTS].sort(() => Math.random() - 0.5).slice(0, 2);
const formatRatio = (recipe: RecipePart[]) => recipe.map((part) => part.count).join(' : ');

const createRound = (levelId: number): PotionRound => {
  const availableModes: PotionRoundMode[] = ['simple'];
  if (levelId >= 2) availableModes.push('scaled');
  if (levelId >= 3) availableModes.push('missing');
  if (levelId >= 4) availableModes.push('compare');
  const mode = availableModes[randomInt(0, availableModes.length - 1)];

  const [first, second] = pickTwo();
  const baseRatioA = randomInt(1, 3);
  const baseRatioB = randomInt(1, 2);
  const baseRecipe = [
    { ingredientId: first.id, count: baseRatioA },
    { ingredientId: second.id, count: baseRatioB },
  ];

  if (mode === 'simple') {
    return {
      mode,
      title: 'Simple Ratio Brew',
      prompt: 'Match the recipe exactly and brew the potion.',
      support: 'Add the same number of ingredients shown on the recipe board.',
      recipe: baseRecipe,
      prefilled: [],
    };
  }

  if (mode === 'scaled') {
    const scale = randomInt(2, 3);
    return {
      mode,
      title: 'Scaled Batch',
      prompt: `Double or scale the recipe to make a larger batch.`,
      support: `Brew the recipe at ${scale}x size before the order bell rings.`,
      recipe: baseRecipe.map((part) => ({ ...part, count: part.count * scale })),
      prefilled: [],
    };
  }

  if (mode === 'missing') {
    return {
      mode,
      title: 'Missing Ingredient',
      prompt: `Complete the ${baseRatioA} : ${baseRatioB} potion ratio.`,
      support: 'One ingredient is already in the cauldron. Add the missing side of the recipe.',
      recipe: baseRecipe,
      prefilled: [{ ...baseRecipe[0] }],
      hiddenIngredientId: second.id,
    };
  }

  const correctRecipe = baseRecipe;
  const wrongRecipe = [
    { ingredientId: first.id, count: baseRatioA + 1 },
    { ingredientId: second.id, count: baseRatioB },
  ];

  return {
    mode,
    title: 'Choose The Correct Brew',
    prompt: `Pick the potion that keeps the ratio ${formatRatio(baseRecipe)}.`,
    support: 'Compare both brews and tap the one that matches the recipe exactly.',
    recipe: correctRecipe,
    prefilled: [],
    compareOptions: [
      { id: 'left', recipe: Math.random() > 0.5 ? correctRecipe : wrongRecipe, correct: false },
      { id: 'right', recipe: Math.random() > 0.5 ? wrongRecipe : correctRecipe, correct: false },
    ],
  };
};

const normalizeCompareOptions = (round: PotionRound): PotionRound => {
  if (!round.compareOptions) return round;
  const options = [...round.compareOptions];
  const correctIndex = Math.random() > 0.5 ? 0 : 1;
  options[correctIndex] = { ...options[correctIndex], recipe: round.recipe, correct: true };
  options[1 - correctIndex] = {
    ...options[1 - correctIndex],
    recipe: round.compareOptions[1 - correctIndex].recipe[0].count === round.recipe[0].count && round.compareOptions[1 - correctIndex].recipe[1].count === round.recipe[1].count
      ? [
          { ...round.recipe[0], count: round.recipe[0].count + 1 },
          { ...round.recipe[1] },
        ]
      : round.compareOptions[1 - correctIndex].recipe,
    correct: false,
  };
  return { ...round, compareOptions: options };
};

const IngredientToken: React.FC<{
  ingredient: IngredientType;
  count?: number;
  compact?: boolean;
  ghost?: boolean;
}> = ({ ingredient, count, compact = false, ghost = false }) => (
  <div className={`relative overflow-hidden rounded-[1.2rem] border px-3 py-2 shadow-[0_12px_20px_rgba(15,23,42,0.18)] ${ghost ? 'border-white/12 bg-white/6' : 'border-white/14'} ${compact ? 'min-w-[4.5rem]' : 'min-w-[5.6rem]'} `}
    style={ghost ? undefined : { background: `linear-gradient(180deg, ${ingredient.colors[0]}, ${ingredient.colors[1]})` }}>
    <div className="absolute inset-x-[14%] top-[10%] h-[20%] rounded-full bg-white/16 blur-md" />
    <div className="relative text-center">
      <div className={`font-black tracking-tight ${ghost ? 'text-white/48' : 'text-white'} ${compact ? 'text-sm' : 'text-base md:text-lg'}`}>
        {ghost ? '?' : ingredient.short}
      </div>
      {typeof count === 'number' && (
        <div className={`mt-1 font-black ${ghost ? 'text-white/48' : 'text-amber-50'} ${compact ? 'text-xs' : 'text-sm md:text-base'}`}>
          x{count}
        </div>
      )}
    </div>
  </div>
);

const ConveyorCard: React.FC<{
  ingredient: IngredientType;
  amount: number;
  onAdd: () => void;
}> = ({ ingredient, amount, onAdd }) => (
  <button
    type="button"
    onClick={onAdd}
    className="relative overflow-hidden rounded-[1.5rem] border border-white/14 px-3 py-3 text-left shadow-[0_18px_28px_rgba(15,23,42,0.22)] transition-transform active:scale-[0.97]"
    style={{ background: `linear-gradient(180deg, ${ingredient.colors[0]}, ${ingredient.colors[1]})` }}
  >
    <div className="absolute inset-x-[12%] top-[10%] h-[18%] rounded-full bg-white/18 blur-md" />
    <div className="relative">
      <div className="text-[10px] font-black uppercase tracking-[0.16em] text-white/72">Conveyor</div>
      <div className="mt-1 text-lg font-black tracking-tight text-white md:text-2xl">{ingredient.label}</div>
      <div className="mt-1 text-xs font-bold text-amber-50/90 md:text-sm">Add to brew</div>
      <div className="mt-3 inline-flex rounded-full border border-white/16 bg-black/16 px-3 py-1 text-xs font-black text-white md:text-sm">
        {amount} in cauldron
      </div>
    </div>
  </button>
);

const PotionBottle: React.FC<{
  recipe: RecipePart[];
  highlight?: boolean;
  onClick?: () => void;
}> = ({ recipe, highlight = false, onClick }) => (
  <button
    type="button"
    onClick={onClick}
    className={`relative flex min-h-[12rem] flex-col items-center justify-end overflow-hidden rounded-[2rem] border px-4 pb-4 pt-5 shadow-[0_24px_34px_rgba(15,23,42,0.22)] transition-transform active:scale-[0.98] ${highlight ? 'border-amber-200/70 bg-[linear-gradient(180deg,rgba(251,191,36,0.2),rgba(255,255,255,0.08),rgba(15,23,42,0.14))]' : 'border-white/12 bg-[linear-gradient(180deg,rgba(255,255,255,0.08),rgba(15,23,42,0.22))]'}`}
  >
    <div className="absolute inset-x-[18%] top-[8%] h-[14%] rounded-full bg-white/18 blur-md" />
    <div className="absolute left-1/2 top-[15%] h-[10%] w-[18%] -translate-x-1/2 rounded-full border border-white/24 bg-[linear-gradient(180deg,rgba(226,232,240,0.92),rgba(148,163,184,0.95))]" />
    <div className="absolute bottom-[16%] left-1/2 h-[52%] w-[58%] -translate-x-1/2 rounded-[46%_46%_34%_34%/36%_36%_64%_64%] border border-white/18 bg-[linear-gradient(180deg,rgba(255,255,255,0.18),rgba(255,255,255,0.04))]" />
    <div className="absolute bottom-[18%] left-1/2 h-[40%] w-[48%] -translate-x-1/2 rounded-[46%_46%_34%_34%/36%_36%_64%_64%]" style={{ background: `linear-gradient(180deg, ${recipe.map((part) => ingredientById[part.ingredientId].colors[0]).join(', ')})` }} />
    <div className="absolute bottom-[30%] left-1/2 h-[10%] w-[34%] -translate-x-1/2 rounded-full bg-white/18 blur-md" />
    <div className="relative z-10 mt-auto flex flex-wrap items-center justify-center gap-2">
      {recipe.map((part) => (
        <IngredientToken key={`${part.ingredientId}-${part.count}`} ingredient={ingredientById[part.ingredientId]} count={part.count} compact />
      ))}
    </div>
  </button>
);

const RecipeGem: React.FC<{ ingredient: IngredientType; count: number; ghost?: boolean }> = ({ ingredient, count, ghost = false }) => (
  <div
    className={`relative flex min-h-[4.6rem] min-w-[4.8rem] flex-col items-center justify-center rounded-[1.2rem] border px-2 py-2 shadow-[0_12px_18px_rgba(0,0,0,0.18)] ${ghost ? 'border-white/14 bg-white/8' : 'border-white/18'}`}
    style={ghost ? undefined : { background: `linear-gradient(180deg, ${ingredient.colors[0]}, ${ingredient.colors[1]})` }}
  >
    <div className="absolute inset-x-[18%] top-[12%] h-[18%] rounded-full bg-white/20 blur-sm" />
    <div className={`text-base font-black tracking-tight ${ghost ? 'text-white/54' : 'text-white'}`}>{ghost ? '?' : ingredient.short}</div>
    <div className={`mt-1 rounded-full px-2 py-0.5 text-[10px] font-black ${ghost ? 'bg-white/8 text-white/50' : 'bg-black/14 text-amber-50'}`}>x{count}</div>
  </div>
);

const PotionPourGame: React.FC<PotionPourGameProps> = ({
  levelId,
  avatarId,
  onVictory,
  onGameOver,
  onBack,
}) => {
  const level = POTION_POUR_LEVELS.find((entry) => entry.id === levelId) || POTION_POUR_LEVELS[0];
  const avatar = useMemo(() => AVATARS.find((entry) => entry.id === avatarId) || AVATARS[0], [avatarId]);
  const timeoutsRef = useRef<number[]>([]);

  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(level.duration);
  const [hearts, setHearts] = useState(4);
  const [brewCount, setBrewCount] = useState(0);
  const [round, setRound] = useState<PotionRound>(() => normalizeCompareOptions(createRound(levelId)));
  const [currentCounts, setCurrentCounts] = useState<Record<string, number>>({});
  const [feedback, setFeedback] = useState<null | { type: 'success' | 'error'; title: string; subtitle: string }>(null);
  const [isFinished, setIsFinished] = useState(false);
  const [didWin, setDidWin] = useState(false);

  const progress = Math.min((score / level.targetScore) * 100, 100);

  const clearTimers = () => {
    timeoutsRef.current.forEach((timeoutId) => window.clearTimeout(timeoutId));
    timeoutsRef.current = [];
  };

  useEffect(() => () => clearTimers(), []);

  useEffect(() => {
    clearTimers();
    const initialRound = normalizeCompareOptions(createRound(levelId));
    const initialCounts = Object.fromEntries(INGREDIENTS.map((ingredient) => [ingredient.id, 0]));
    initialRound.prefilled.forEach((part) => {
      initialCounts[part.ingredientId] = part.count;
    });
    setScore(0);
    setTimeLeft(level.duration);
    setHearts(4);
    setBrewCount(0);
    setRound(initialRound);
    setCurrentCounts(initialCounts);
    setFeedback(null);
    setIsFinished(false);
    setDidWin(false);
  }, [level.duration, levelId]);

  useEffect(() => {
    if (isFinished) return undefined;
    const timerId = window.setInterval(() => {
      setTimeLeft((previous) => {
        if (previous <= 1) {
          window.clearInterval(timerId);
          setIsFinished(true);
          setDidWin(false);
          onGameOver(score);
          return 0;
        }
        return previous - 1;
      });
    }, 1000);
    return () => window.clearInterval(timerId);
  }, [isFinished, onGameOver, score]);

  const resetForNewRound = () => {
    const nextRound = normalizeCompareOptions(createRound(levelId));
    const nextCounts = Object.fromEntries(INGREDIENTS.map((ingredient) => [ingredient.id, 0]));
    nextRound.prefilled.forEach((part) => {
      nextCounts[part.ingredientId] = part.count;
    });
    setRound(nextRound);
    setCurrentCounts(nextCounts);
    setFeedback(null);
  };

  const finishVictory = (finalScore: number) => {
    if (isFinished) return;
    setIsFinished(true);
    setDidWin(true);
    const stars = finalScore >= level.targetScore * 2 ? 3 : finalScore >= level.targetScore * 1.5 ? 2 : 1;
    confetti({
      particleCount: 150,
      spread: 72,
      origin: { y: 0.62 },
      colors: ['#a78bfa', '#67e8f9', '#86efac', '#fde047'],
    });
    onVictory(stars, finalScore);
  };

  const loseHeart = (subtitle: string) => {
    if (feedback || isFinished) return;
    const nextHearts = hearts - 1;
    setHearts(nextHearts);
    setFeedback({ type: 'error', title: 'Brew Spoiled', subtitle });
    triggerHaptic('warning');
    if (nextHearts <= 0) {
      const timeoutId = window.setTimeout(() => {
        setIsFinished(true);
        setDidWin(false);
        onGameOver(score);
      }, 900);
      timeoutsRef.current.push(timeoutId);
      return;
    }
    const timeoutId = window.setTimeout(() => {
      resetForNewRound();
    }, 1000);
    timeoutsRef.current.push(timeoutId);
  };

  const rewardSuccess = (points: number, subtitle: string) => {
    const updatedScore = score + points;
    setScore(updatedScore);
    setBrewCount((previous) => previous + 1);
    setFeedback({ type: 'success', title: 'Potion Ready!', subtitle });
    triggerHaptic('success');
    confetti({
      particleCount: 42,
      spread: 48,
      origin: { y: 0.72 },
      colors: ['#a78bfa', '#67e8f9', '#86efac'],
    });

    const timeoutId = window.setTimeout(() => {
      if (updatedScore >= level.targetScore) {
        finishVictory(updatedScore);
        return;
      }
      resetForNewRound();
    }, 1050);
    timeoutsRef.current.push(timeoutId);
  };

  const recipeMatches = () =>
    round.recipe.every((part) => (currentCounts[part.ingredientId] || 0) === part.count)
    && INGREDIENTS.every((ingredient) => !round.recipe.some((part) => part.ingredientId === ingredient.id) ? (currentCounts[ingredient.id] || 0) === 0 : true);

  const handleIngredientAdd = (ingredientId: string) => {
    if (feedback || isFinished || round.mode === 'compare') return;
    const nextCounts = { ...currentCounts, [ingredientId]: (currentCounts[ingredientId] || 0) + 1 };
    setCurrentCounts(nextCounts);
    triggerHaptic('light');

    const targetPart = round.recipe.find((part) => part.ingredientId === ingredientId);
    if (!targetPart || nextCounts[ingredientId] > targetPart.count) {
      loseHeart('That ingredient tipped the brew out of ratio.');
      return;
    }

    const isComplete = round.recipe.every((part) => nextCounts[part.ingredientId] === part.count);
    if (isComplete) {
      rewardSuccess(140 + (round.mode === 'scaled' ? 30 : round.mode === 'missing' ? 24 : 0), 'The cauldron matched the recipe exactly.');
    }
  };

  const handleComparePick = (optionId: string) => {
    if (feedback || isFinished || round.mode !== 'compare' || !round.compareOptions) return;
    const option = round.compareOptions.find((entry) => entry.id === optionId);
    if (!option) return;
    if (!option.correct) {
      loseHeart('That bottle does not keep the correct ratio.');
      return;
    }
    rewardSuccess(170, 'You spotted the correct scaled brew.');
  };

  const resetBrew = () => {
    if (feedback || isFinished || round.mode === 'compare') return;
    const nextCounts = Object.fromEntries(INGREDIENTS.map((ingredient) => [ingredient.id, 0]));
    round.prefilled.forEach((part) => {
      nextCounts[part.ingredientId] = part.count;
    });
    setCurrentCounts(nextCounts);
    triggerHaptic('selection');
  };

  const activeRecipeCount = round.recipe.reduce((sum, part) => sum + part.count, 0);

  return (
    <GameScreenShell className="items-center overflow-hidden p-2 pt-[env(safe-area-inset-top)] pb-[calc(env(safe-area-inset-bottom)+0.35rem)] md:p-4">
      <GameplaySceneBackdrop gameType="potion_pour" />

      <div className="relative z-10 flex h-full min-h-0 w-full max-w-5xl flex-1 flex-col gap-2 md:gap-3">
        <GameplayHUD
          title="Potion Brewery"
          avatar={avatar}
          score={score}
          targetScore={level.targetScore}
          timeLeft={timeLeft}
          progress={progress}
          accentText="text-purple-950"
          accentSoftBg="bg-purple-100/85"
          accentBorder="border-purple-200/80"
          progressBar="bg-gradient-to-r from-cyan-400 via-violet-400 to-fuchsia-400"
          statLabel="Brews"
          statValue={brewCount}
          compact
        />

        <PuzzleStage className="rounded-[2rem] px-2 py-2 md:px-4 md:py-4">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_10%,rgba(103,232,249,0.18),transparent_18%),radial-gradient(circle_at_18%_22%,rgba(192,132,252,0.16),transparent_14%),radial-gradient(circle_at_82%_18%,rgba(74,222,128,0.16),transparent_16%),linear-gradient(180deg,rgba(255,255,255,0.08),rgba(5,10,22,0.14)_34%,rgba(5,10,22,0.28)_100%)]" />

          <div className="relative z-10 grid min-h-0 flex-1 grid-rows-[auto,minmax(0,1fr)] gap-3 md:gap-4">
            <div className="flex flex-col items-center gap-2 text-center">
              <div className="licensed-slice-purple-banner inline-flex min-h-[2rem] items-center gap-2 rounded-full px-4 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-white md:text-xs">
                <AssetIcon name="gem" className="h-4 w-4" />
                Recipe board
              </div>
              <div className="relative w-full max-w-[20rem] rounded-[1.75rem] border border-amber-100/28 bg-[linear-gradient(180deg,rgba(94,43,145,0.96),rgba(84,33,132,0.98))] px-4 py-3 shadow-[0_16px_34px_rgba(15,23,42,0.28)] md:max-w-[28rem] md:px-5 md:py-4">
                <div className="text-[10px] font-black uppercase tracking-[0.28em] text-yellow-100/82 md:text-xs">{round.title}</div>
                <div className="mt-1 text-sm font-black text-white md:text-[1.45rem]">{round.prompt}</div>
                <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
                  {round.recipe.map((part) => (
                    <RecipeGem
                      key={`recipe-${part.ingredientId}`}
                      ingredient={ingredientById[part.ingredientId]}
                      count={part.count}
                      ghost={round.hiddenIngredientId === part.ingredientId}
                    />
                  ))}
                </div>
                <div className="mt-2 text-xs font-bold text-white/78 md:text-sm">{round.support}</div>
              </div>
            </div>
            <div className="grid min-h-0 gap-3 md:grid-cols-[minmax(0,1.18fr)_18rem] md:gap-4">
              <div className="relative min-h-[17.5rem] overflow-hidden rounded-[1.8rem] border border-white/14 bg-[linear-gradient(180deg,rgba(255,255,255,0.08),rgba(255,255,255,0.02)_18%,rgba(8,15,30,0.18)_100%)] p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.12),0_18px_34px_rgba(0,0,0,0.22)] md:min-h-0 md:p-5">
                <div className="pointer-events-none absolute inset-x-[18%] top-[10%] h-[18%] rounded-full bg-emerald-300/18 blur-3xl" />
                <div className="pointer-events-none absolute inset-x-[20%] bottom-[20%] h-[14%] rounded-full bg-cyan-300/16 blur-3xl" />
                {round.mode === 'compare' && round.compareOptions ? (
                  <div className="relative z-10 grid h-full items-center gap-3 md:grid-cols-2">
                    {round.compareOptions.map((option) => (
                      <PotionBottle
                        key={option.id}
                        recipe={option.recipe}
                        highlight={option.correct}
                        onClick={() => handleComparePick(option.id)}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="relative z-10 flex h-full flex-col items-center justify-between">
                    <div className="flex w-full items-center justify-center gap-2">
                      <div className="licensed-slice-cyan-pill rounded-full px-4 py-2 text-[10px] font-black uppercase tracking-[0.14em] text-white md:text-xs">
                        Mix {activeRecipeCount}
                      </div>
                      <div className="licensed-slice-green-pill rounded-full px-4 py-2 text-[10px] font-black uppercase tracking-[0.14em] text-white md:text-xs">
                        {INGREDIENTS.filter((ingredient) => (currentCounts[ingredient.id] || 0) > 0).length || 0} ingredients
                      </div>
                    </div>

                    <div className="relative flex h-[14.5rem] w-full max-w-[24rem] items-end justify-center md:h-[18rem] md:max-w-[28rem]">
                      <div className="absolute bottom-[12%] h-[12%] w-[70%] rounded-full bg-black/24 blur-xl" />
                      <div className="absolute bottom-[18%] h-[16%] w-[72%] rounded-[1.4rem] border border-stone-200/12 bg-[linear-gradient(180deg,#8b5a24,#5b3717)] shadow-[inset_0_2px_0_rgba(255,255,255,0.12),0_18px_34px_rgba(0,0,0,0.24)]" />
                      <div className="absolute bottom-[24%] h-[40%] w-[78%] rounded-[2.2rem] border-[5px] border-slate-500/90 bg-[linear-gradient(180deg,#334155,#0f172a_78%)] shadow-[0_24px_42px_rgba(0,0,0,0.34)] md:border-[6px]">
                        <div className="absolute inset-x-[10%] top-[18%] h-[52%] rounded-[1.5rem] border border-white/10 bg-[linear-gradient(180deg,rgba(52,211,153,0.74),rgba(45,212,191,0.42))]" />
                        <div className="absolute inset-x-[18%] top-[26%] h-[18%] rounded-full bg-white/28 blur-md" />
                        {INGREDIENTS.filter((ingredient) => (currentCounts[ingredient.id] || 0) > 0).length > 0 && (
                          <div
                            className="absolute inset-x-[16%] bottom-[18%] h-[24%] rounded-full"
                            style={{
                              background: `linear-gradient(90deg, ${INGREDIENTS.filter((ingredient) => (currentCounts[ingredient.id] || 0) > 0).map((ingredient) => ingredient.colors[0]).join(', ')})`,
                            }}
                          />
                        )}
                      </div>
                      <div className="absolute bottom-[52%] left-[22%] flex h-12 w-12 items-center justify-center rounded-full bg-[radial-gradient(circle,#dbeafe,#38bdf8)] shadow-[0_10px_18px_rgba(56,189,248,0.24)] md:h-14 md:w-14">
                        <AssetIcon name="gem" className="h-5 w-5" />
                      </div>
                      <div className="absolute bottom-[55%] right-[22%] flex h-12 w-12 items-center justify-center rounded-full bg-[radial-gradient(circle,#f5d0fe,#c084fc)] shadow-[0_10px_18px_rgba(192,132,252,0.24)] md:h-14 md:w-14">
                        <AssetIcon name="gem" className="h-5 w-5" />
                      </div>
                    </div>

                    <div className="w-full rounded-[1.55rem] border border-amber-100/18 bg-[linear-gradient(180deg,rgba(129,74,28,0.96),rgba(84,48,18,0.98))] p-3 shadow-[inset_0_2px_0_rgba(255,255,255,0.08),0_16px_28px_rgba(0,0,0,0.2)]">
                      <div className="mb-2 flex items-center justify-between gap-2">
                        <div className="licensed-slice-yellow-plank rounded-full px-3 py-1 text-[9px] font-black uppercase tracking-[0.16em] text-amber-950 md:text-[10px]">
                          Ingredient conveyor
                        </div>
                        <button
                          onClick={resetBrew}
                          className="ui-button-secondary licensed-slice-orange-pill px-4 py-2 text-[10px] font-black uppercase tracking-[0.14em] text-white"
                        >
                          Reset
                        </button>
                      </div>
                      <div className="grid grid-cols-2 gap-2 md:grid-cols-5">
                        {INGREDIENTS.map((ingredient) => (
                          <ConveyorCard
                            key={ingredient.id}
                            ingredient={ingredient}
                            amount={currentCounts[ingredient.id] || 0}
                            onAdd={() => handleIngredientAdd(ingredient.id)}
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex min-h-0 flex-col gap-3">
                <div className="rounded-[1.55rem] border border-white/14 bg-[linear-gradient(180deg,rgba(15,23,42,0.72),rgba(15,23,42,0.9))] p-3 shadow-[0_16px_28px_rgba(0,0,0,0.2)]">
                  <div className="text-[10px] font-black uppercase tracking-[0.16em] text-white/58 md:text-xs">Current brew</div>
                  <div className="mt-3 flex flex-wrap justify-center gap-2">
                    {INGREDIENTS.filter((ingredient) => (currentCounts[ingredient.id] || 0) > 0).length ? (
                      INGREDIENTS.filter((ingredient) => (currentCounts[ingredient.id] || 0) > 0).map((ingredient) => (
                        <RecipeGem key={`mix-${ingredient.id}`} ingredient={ingredient} count={currentCounts[ingredient.id]} />
                      ))
                    ) : (
                      <div className="rounded-[1rem] border border-dashed border-white/14 px-6 py-5 text-sm font-black text-white/46">
                        Empty cauldron
                      </div>
                    )}
                  </div>
                </div>

                <div className="mt-auto rounded-[1.55rem] border border-amber-100/18 bg-[linear-gradient(180deg,rgba(84,49,18,0.96),rgba(60,34,14,0.98))] p-3 shadow-[inset_0_2px_0_rgba(255,255,255,0.08),0_16px_28px_rgba(0,0,0,0.2)]">
                  <div className="mb-3 flex items-center gap-2">
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[linear-gradient(180deg,#fde68a,#f59e0b)] shadow-[0_8px_14px_rgba(0,0,0,0.22)]">
                      <AssetIcon name="check" className="h-4 w-4" />
                    </div>
                    <div>
                      <div className="text-[10px] font-black uppercase tracking-[0.18em] text-amber-50/64">Brew status</div>
                      <div className="text-sm font-black text-white">{round.mode === 'compare' ? `Target ${formatRatio(round.recipe)}` : 'Build the exact potion ratio'}</div>
                    </div>
                  </div>
                  <div className="licensed-slice-cyan-pill flex min-h-[2.8rem] items-center justify-center rounded-[1.25rem] px-4 py-2 text-sm font-black uppercase tracking-[0.14em] text-white md:text-base">
                    Batch size {activeRecipeCount}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <AnimatePresence>
            {feedback && (
              <motion.div
                initial={{ opacity: 0, scale: 0.7 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 1.18 }}
                className={`pointer-events-none absolute inset-0 z-30 flex items-center justify-center ${feedback.type === 'success' ? 'bg-[radial-gradient(circle,rgba(52,211,153,0.18),rgba(52,211,153,0)_48%)]' : 'bg-[radial-gradient(circle,rgba(251,113,133,0.18),rgba(251,113,133,0)_48%)]'}`}
              >
                <div className={`rounded-full px-6 py-4 text-xl font-black text-white shadow-[0_20px_40px_rgba(0,0,0,0.28)] md:text-3xl ${feedback.type === 'success' ? 'bg-[radial-gradient(circle,#34d399,#0f766e)]' : 'bg-[radial-gradient(circle,#fb7185,#be123c)]'}`}>
                  {feedback.title}
                  <div className="mt-1 text-sm font-bold md:text-lg">{feedback.subtitle}</div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </PuzzleStage>

        <GameActionDock onBack={onBack} accentClass="text-white" />
      </div>

      <AnimatePresence>
        {isFinished && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/72 p-4 backdrop-blur-md"
          >
            <motion.div
              initial={{ scale: 0.9, y: 16 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.94, y: 10 }}
              className="app-modal-panel casual-modal-panel flex w-full max-w-md flex-col items-center gap-5 rounded-[2rem] p-6 text-center md:max-w-lg md:rounded-[2.6rem] md:p-8"
            >
              <div className={`text-4xl font-black md:text-5xl ${didWin ? 'text-emerald-200' : 'text-rose-200'}`}>
                {didWin ? 'Master Brewer' : 'Brew Failed'}
              </div>
              <div className="grid w-full grid-cols-2 gap-3">
                <div className="casual-panel-surface rounded-[1.2rem] p-3 md:rounded-[1.4rem] md:p-4">
                  <div className="text-[9px] font-black uppercase tracking-[0.18em] text-white/56 md:text-[10px]">Score</div>
                  <div className="mt-1 text-2xl font-black text-white md:text-4xl">{score}</div>
                </div>
                <div className="casual-panel-surface rounded-[1.2rem] p-3 md:rounded-[1.4rem] md:p-4">
                  <div className="text-[9px] font-black uppercase tracking-[0.18em] text-white/56 md:text-[10px]">Brews</div>
                  <div className="mt-1 text-2xl font-black text-white md:text-4xl">{brewCount}</div>
                </div>
              </div>
              <button
                onClick={onBack}
                className="ui-button-primary fantasy-cta-button w-full px-6 py-3 text-sm uppercase tracking-[0.18em] md:px-8 md:py-4 md:text-base"
              >
                Continue
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </GameScreenShell>
  );
};

export default PotionPourGame;
