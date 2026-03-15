import React, { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import confetti from 'canvas-confetti';
import GameplayHUD from './GameplayHUD';
import GameActionDock from './GameActionDock';
import { AVATARS, POTION_POUR_LEVELS } from '../constants';
import potionLevelBg from '../assets/level_backgrounds/potion-panic.png';
import { triggerHaptic } from '../haptics';

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
    <div className="relative flex h-full w-full flex-col items-center overflow-hidden p-2 md:p-4">
      <div className="absolute inset-0 bg-cover bg-center opacity-[0.82]" style={{ backgroundImage: `url(${potionLevelBg})` }} />
      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(12,18,34,0.18),rgba(12,18,34,0.4)_30%,rgba(8,12,24,0.74)_100%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(196,181,253,0.34),rgba(196,181,253,0)_26%),radial-gradient(circle_at_bottom,rgba(103,232,249,0.24),rgba(103,232,249,0)_30%)]" />

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

        <div className="casual-panel-strong relative flex min-h-0 flex-1 flex-col overflow-hidden rounded-[1.65rem] px-2 py-2 md:rounded-[2.4rem] md:px-4 md:py-4">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(103,232,249,0.16),transparent_28%),radial-gradient(circle_at_50%_56%,rgba(74,222,128,0.12),transparent_20%)]" />

          <div className="relative z-10 shrink-0 text-center">
            <div className="casual-ribbon-chip mx-auto inline-flex items-center gap-2 rounded-full px-3 py-1 text-[9px] font-black uppercase tracking-[0.2em] md:px-4 md:py-1.5 md:text-[10px]">
              Recipe Board
            </div>
            <div className="mx-auto mt-2 max-w-[22rem] rounded-[1.2rem] border border-amber-200/40 bg-[linear-gradient(180deg,rgba(255,248,220,0.96),rgba(254,240,180,0.9))] px-4 py-3 text-center shadow-[0_14px_30px_rgba(0,0,0,0.22)] md:max-w-[32rem] md:rounded-[1.6rem] md:px-6 md:py-4">
              <div className="text-[1.05rem] font-black leading-tight text-amber-900 md:text-[1.7rem]">{round.title}</div>
              <div className="mt-1 text-xs font-bold text-amber-950/76 md:text-base">{round.prompt}</div>
            </div>
          </div>

          <div className="relative z-10 mt-2 grid min-h-0 flex-1 gap-3 xl:grid-cols-[minmax(0,1.2fr)_minmax(16rem,0.8fr)]">
            <div className="relative flex min-h-[22rem] flex-col overflow-hidden rounded-[1.35rem] border border-white/12 bg-[linear-gradient(180deg,rgba(8,15,30,0.24),rgba(8,15,30,0.06))] p-3 md:min-h-[26rem] md:rounded-[1.8rem] md:p-4">
              <div className="pointer-events-none absolute inset-x-[22%] top-[28%] h-[18%] rounded-full bg-emerald-300/20 blur-3xl" />
              <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
                <div className="rounded-[1.25rem] border border-white/12 bg-white/8 p-3 shadow-[0_16px_24px_rgba(0,0,0,0.18)]">
                  <div className="text-[10px] font-black uppercase tracking-[0.16em] text-white/56 md:text-xs">Recipe</div>
                  <div className="mt-3 flex flex-wrap justify-center gap-2">
                    {round.recipe.map((part) => (
                      round.hiddenIngredientId === part.ingredientId
                        ? <IngredientToken key={`recipe-${part.ingredientId}`} ingredient={ingredientById[part.ingredientId]} count={part.count} ghost />
                        : <IngredientToken key={`recipe-${part.ingredientId}`} ingredient={ingredientById[part.ingredientId]} count={part.count} />
                    ))}
                  </div>
                  <div className="mt-3 text-center text-xs font-bold text-white/72 md:text-sm">{round.support}</div>
                </div>

                <div className="rounded-[1.25rem] border border-white/12 bg-white/8 p-3 shadow-[0_16px_24px_rgba(0,0,0,0.18)]">
                  <div className="text-[10px] font-black uppercase tracking-[0.16em] text-white/56 md:text-xs">Cauldron mix</div>
                  <div className="mt-3 flex flex-wrap justify-center gap-2">
                    {INGREDIENTS.filter((ingredient) => (currentCounts[ingredient.id] || 0) > 0).length ? (
                      INGREDIENTS.filter((ingredient) => (currentCounts[ingredient.id] || 0) > 0).map((ingredient) => (
                        <IngredientToken key={`mix-${ingredient.id}`} ingredient={ingredient} count={currentCounts[ingredient.id]} />
                      ))
                    ) : (
                      <div className="rounded-[1rem] border border-dashed border-white/14 px-6 py-5 text-sm font-black text-white/46">
                        Empty cauldron
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="relative mt-4 flex flex-1 items-center justify-center">
                {round.mode === 'compare' && round.compareOptions ? (
                  <div className="grid w-full gap-3 md:grid-cols-2">
                    {round.compareOptions.map((option) => (
                      <PotionBottle
                        key={option.id}
                        recipe={option.recipe}
                        highlight={false}
                        onClick={() => handleComparePick(option.id)}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="relative flex h-[15rem] w-[18rem] items-end justify-center md:h-[18rem] md:w-[22rem]">
                    <div className="absolute inset-x-[10%] top-[16%] h-[22%] rounded-full bg-emerald-200/28 blur-3xl" />
                    <div className="absolute inset-x-[10%] bottom-[10%] h-8 rounded-full bg-black/30 blur-xl" />
                    <div className="absolute bottom-[18%] h-[46%] w-[82%] rounded-[2rem] border-[5px] border-slate-500 bg-[linear-gradient(180deg,rgba(20,32,51,0.94),rgba(54,65,88,0.96))] shadow-[0_24px_42px_rgba(0,0,0,0.35)] md:border-[6px]">
                      <div className="absolute inset-x-[10%] top-[20%] h-[52%] rounded-[1.4rem] border border-white/10 bg-[linear-gradient(180deg,rgba(52,211,153,0.7),rgba(45,212,191,0.42))]" />
                      <div className="absolute inset-x-[18%] top-[28%] h-[18%] rounded-full bg-white/28 blur-md" />
                      {INGREDIENTS.filter((ingredient) => (currentCounts[ingredient.id] || 0) > 0).length > 0 && (
                        <div
                          className="absolute inset-x-[16%] bottom-[18%] h-[24%] rounded-full"
                          style={{
                            background: `linear-gradient(90deg, ${INGREDIENTS.filter((ingredient) => (currentCounts[ingredient.id] || 0) > 0).map((ingredient) => ingredient.colors[0]).join(', ')})`,
                          }}
                        />
                      )}
                    </div>
                    <div className="absolute bottom-[18%] h-[14%] w-[72%] rounded-[1.25rem] border border-stone-500/55 bg-[linear-gradient(180deg,rgba(71,85,105,0.95),rgba(51,65,85,0.98))]" />
                  </div>
                )}
              </div>
            </div>

            <div className="grid gap-3 xl:grid-rows-[minmax(0,1fr)_auto]">
              {round.mode !== 'compare' ? (
                <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-2">
                  {INGREDIENTS.map((ingredient) => (
                    <ConveyorCard
                      key={ingredient.id}
                      ingredient={ingredient}
                      amount={currentCounts[ingredient.id] || 0}
                      onAdd={() => handleIngredientAdd(ingredient.id)}
                    />
                  ))}
                </div>
              ) : (
                <div className="rounded-[1.35rem] border border-white/12 bg-[linear-gradient(180deg,rgba(255,255,255,0.08),rgba(255,255,255,0.03))] p-4 shadow-[0_16px_24px_rgba(0,0,0,0.22)]">
                  <div className="text-[10px] font-black uppercase tracking-[0.16em] text-white/56 md:text-xs">Compare brews</div>
                  <div className="mt-2 text-sm font-bold text-white/80 md:text-base">Choose the bottle that matches the recipe ratio exactly.</div>
                  <div className="mt-4 rounded-[1.2rem] border border-white/10 bg-black/14 px-4 py-3 text-center text-sm font-black text-amber-100 md:text-lg">
                    Target ratio {formatRatio(round.recipe)}
                  </div>
                </div>
              )}

              <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)] gap-2 md:gap-3">
                <div className="flex flex-col items-center justify-end gap-2 rounded-[1.15rem] border border-white/12 bg-[linear-gradient(180deg,rgba(255,255,255,0.08),rgba(255,255,255,0.03))] p-2.5 shadow-[0_16px_24px_rgba(0,0,0,0.22)]">
                  <div className="text-[10px] font-black uppercase tracking-[0.16em] text-white/56 md:text-xs">Batch size</div>
                  <div className="text-3xl font-black text-white md:text-4xl">{activeRecipeCount}</div>
                </div>

                <div className="flex flex-col items-center justify-end gap-2 rounded-[1.15rem] border border-white/12 bg-[linear-gradient(180deg,rgba(255,255,255,0.08),rgba(255,255,255,0.03))] p-2.5 shadow-[0_16px_24px_rgba(0,0,0,0.22)]">
                  <button
                    onClick={resetBrew}
                    disabled={round.mode === 'compare'}
                    className="fantasy-cta-button w-full px-3 py-2.5 text-[0.78rem] uppercase tracking-[0.16em] disabled:opacity-45 md:px-4 md:py-3 md:text-sm"
                  >
                    Reset Brew
                  </button>
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
        </div>

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
                className="fantasy-cta-button w-full px-6 py-3 text-sm uppercase tracking-[0.18em] md:px-8 md:py-4 md:text-base"
              >
                Continue
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default PotionPourGame;
