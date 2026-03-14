import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import confetti from 'canvas-confetti';
import { PotionPourLevelConfig } from '../types';
import { POTION_POUR_LEVELS, AVATARS, MATH_FAMILIES } from '../constants';
import potionLevelBg from '../assets/level_backgrounds/potion-panic.png';
import GameplayHUD from './GameplayHUD';
import GameActionDock from './GameActionDock';
import AssetIcon from './AssetIcon';
import { triggerHaptic } from '../haptics';

interface PotionPourGameProps {
  levelId: number;
  avatarId: string;
  onVictory: (stars: number, score: number) => void;
  onGameOver: (score: number) => void;
  onBack: () => void;
}

interface Ingredient {
  id: string;
  display: string;
  value: number;
  familyId: string;
  palette: string[];
}

interface BrewLayer {
  id: string;
  palette: string[];
  display: string;
}

const INGREDIENT_PALETTES: Record<string, string[]> = {
  half: ['#8b5cf6', '#a855f7', '#c084fc', '#ddd6fe'],
  quarter: ['#0ea5e9', '#38bdf8', '#7dd3fc', '#dbeafe'],
  'three-quarters': ['#22c55e', '#4ade80', '#86efac', '#dcfce7'],
  'one-fifth': ['#f97316', '#fb923c', '#fdba74', '#ffedd5'],
  ten: ['#ef4444', '#f87171', '#fca5a5', '#fee2e2'],
  twelve: ['#eab308', '#facc15', '#fde047', '#fef9c3'],
  twenty: ['#06b6d4', '#22d3ee', '#67e8f9', '#cffafe'],
  one: ['#ec4899', '#f472b6', '#f9a8d4', '#fce7f3'],
};

const formatMixValue = (value: number) => {
  if (Number.isInteger(value)) return String(value);
  return value.toFixed(3).replace(/0+$/, '').replace(/\.$/, '');
};

const PotionTube: React.FC<{
  label?: string;
  layers: string[];
  onClick?: () => void;
  selected?: boolean;
  disabled?: boolean;
  ghost?: boolean;
  empty?: boolean;
  tilt?: boolean;
  footer?: React.ReactNode;
}> = ({ label, layers, onClick, selected = false, disabled = false, ghost = false, empty = false, tilt = false, footer }) => {
  const Component = onClick ? motion.button : motion.div;

  return (
    <div className="flex flex-col items-center gap-1.5">
      <Component
        type={onClick ? 'button' : undefined}
        onClick={onClick}
        whileTap={onClick && !disabled ? { scale: 0.97 } : undefined}
        animate={tilt ? { rotate: [-2, 12, -2], x: [0, 8, 0], y: [0, -4, 0] } : { rotate: selected ? [0, -2, 2, 0] : 0, y: selected ? [0, -3, 0] : 0 }}
        transition={tilt ? { duration: 0.72, ease: 'easeInOut' } : selected ? { duration: 1.8, repeat: Infinity, ease: 'easeInOut' } : { duration: 0.25 }}
        className={`relative flex h-[7.4rem] w-[3.15rem] shrink-0 items-end justify-center rounded-[1.15rem] border-2 px-[0.28rem] pb-[0.34rem] pt-[0.45rem] shadow-[0_16px_28px_rgba(0,0,0,0.26)] md:h-[9.2rem] md:w-[3.8rem] md:rounded-[1.35rem] ${ghost ? 'border-white/18 bg-white/6' : 'border-[#bbd8ff]/45 bg-[linear-gradient(180deg,rgba(255,255,255,0.24),rgba(255,255,255,0.08))]'} ${disabled ? 'opacity-55' : ''}`}
      >
        <div className="pointer-events-none absolute inset-[2px] rounded-[1rem] border border-white/22 bg-[linear-gradient(180deg,rgba(255,255,255,0.18),rgba(255,255,255,0.02))] md:rounded-[1.2rem]" />
        <div className="pointer-events-none absolute left-1/2 top-[0.42rem] h-[0.48rem] w-[68%] -translate-x-1/2 rounded-full border border-white/30 bg-[linear-gradient(180deg,rgba(74,85,160,0.9),rgba(49,56,121,0.96))] md:h-[0.56rem]" />
        <div className="pointer-events-none absolute left-[18%] top-[0.95rem] bottom-[0.85rem] w-[18%] rounded-full bg-white/14 blur-[1px]" />

        <div className={`relative z-10 flex h-full w-full flex-col-reverse overflow-hidden rounded-[0.78rem] border border-white/18 md:rounded-[0.95rem] ${empty ? 'bg-[linear-gradient(180deg,rgba(17,24,39,0.14),rgba(17,24,39,0.04))]' : 'bg-[linear-gradient(180deg,rgba(9,14,28,0.1),rgba(9,14,28,0.02))]'}`}>
          {!empty && layers.map((color, index) => (
            <div
              key={`${color}-${index}`}
              className="relative flex-1 border-t border-white/14"
              style={{ background: `linear-gradient(180deg, rgba(255,255,255,0.18), ${color})` }}
            >
              <div className="absolute inset-x-[10%] top-[12%] h-[28%] rounded-full bg-white/16 blur-[2px]" />
            </div>
          ))}
        </div>
      </Component>
      {label && <div className="max-w-[4rem] text-center text-[0.56rem] font-black leading-tight tracking-[-0.02em] text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.45)] md:max-w-[4.5rem] md:text-[0.68rem]">{label}</div>}
      {footer}
    </div>
  );
};

const PotionPourGame: React.FC<PotionPourGameProps> = ({
  levelId,
  avatarId,
  onVictory,
  onGameOver,
  onBack,
}) => {
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(0);
  const [isGameOver, setIsGameOver] = useState(false);
  const [isVictory, setIsVictory] = useState(false);
  const [targetValue, setTargetValue] = useState(0);
  const [targetDisplay, setTargetDisplay] = useState('');
  const [currentValue, setCurrentValue] = useState(0);
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [brewLayers, setBrewLayers] = useState<BrewLayer[]>([]);
  const [isExploding, setIsExploding] = useState(false);
  const [pouringId, setPouringId] = useState<string | null>(null);
  const [brewCount, setBrewCount] = useState(0);

  const level = POTION_POUR_LEVELS.find((entry) => entry.id === levelId) || POTION_POUR_LEVELS[0];
  const avatar = AVATARS.find((entry) => entry.id === avatarId) || AVATARS[0];

  const generateNewOrder = useCallback(() => {
    const families = MATH_FAMILIES.filter((family) =>
      family.expressions.some((expression) => level.mathTypes.includes(expression.type)),
    );
    const family = families[Math.floor(Math.random() * families.length)];
    const expressions = family.expressions.filter((expression) => level.mathTypes.includes(expression.type));
    const expression = expressions[Math.floor(Math.random() * expressions.length)];

    setTargetValue(family.targetValue);
    setTargetDisplay(expression.display);
    setCurrentValue(0);
    setBrewLayers([]);
    setPouringId(null);

    const pickedFamilies: typeof MATH_FAMILIES = [];
    while (pickedFamilies.length < 6) {
      const candidate = MATH_FAMILIES[Math.floor(Math.random() * MATH_FAMILIES.length)];
      if (!pickedFamilies.includes(candidate)) {
        pickedFamilies.push(candidate);
      }
    }

    if (!pickedFamilies.includes(family)) {
      pickedFamilies[0] = family;
    }

    setIngredients(
      pickedFamilies.map((pickedFamily, index) => {
        const pickedExpressions = pickedFamily.expressions.filter((item) => level.mathTypes.includes(item.type));
        const fallbackExpressions = pickedFamily.expressions;
        const pickedExpression = (pickedExpressions.length ? pickedExpressions : fallbackExpressions)[index % (pickedExpressions.length ? pickedExpressions.length : fallbackExpressions.length)];
        return {
          id: `${pickedFamily.id}-${index}-${Math.random().toString(36).slice(2, 7)}`,
          display: pickedExpression.display,
          value: pickedFamily.targetValue,
          familyId: pickedFamily.id,
          palette: INGREDIENT_PALETTES[pickedFamily.id] || INGREDIENT_PALETTES.half,
        };
      }),
    );
  }, [level]);

  useEffect(() => {
    setTimeLeft(level.duration);
    setScore(0);
    setIsGameOver(false);
    setIsVictory(false);
    setBrewCount(0);
    generateNewOrder();
  }, [level, generateNewOrder]);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (timeLeft > 0 && !isGameOver && !isVictory) {
      timer = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            if (score >= level.targetScore) {
              handleWin();
            } else {
              setIsGameOver(true);
              onGameOver(score);
            }
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [timeLeft, isGameOver, isVictory, score, level.targetScore]);

  const handleWin = () => {
    const stars = score >= level.targetScore * 2 ? 3 : score >= level.targetScore * 1.5 ? 2 : 1;
    setIsVictory(true);
    confetti({
      particleCount: 140,
      spread: 72,
      origin: { y: 0.62 },
      colors: ['#a78bfa', '#67e8f9', '#86efac', '#fde047'],
    });
    onVictory(stars, score);
  };

  const resetBrew = () => {
    if (isGameOver || isVictory) return;
    triggerHaptic('selection');
    setCurrentValue(0);
    setBrewLayers([]);
    setPouringId(null);
  };

  const addIngredient = (ingredient: Ingredient) => {
    if (isExploding || isGameOver || isVictory) return;

    triggerHaptic('light');
    setPouringId(ingredient.id);

    const newValue = currentValue + ingredient.value;
    const nextLayer: BrewLayer = {
      id: `${ingredient.id}-${Date.now()}`,
      palette: ingredient.palette,
      display: ingredient.display,
    };

    setCurrentValue(newValue);
    setBrewLayers((prev) => [...prev.slice(-3), nextLayer]);

    window.setTimeout(() => {
      setPouringId((prev) => (prev === ingredient.id ? null : prev));
    }, 420);

    if (Math.abs(newValue - targetValue) < 0.001) {
      const points = 120;
      setScore((prev) => prev + points);
      setBrewCount((prev) => prev + 1);
      confetti({
        particleCount: 36,
        spread: 42,
        origin: { y: 0.78 },
        colors: ingredient.palette,
      });
      window.setTimeout(() => {
        generateNewOrder();
      }, 650);
      return;
    }

    if (newValue > targetValue + 0.001) {
      triggerHaptic('warning');
      setIsExploding(true);
      window.setTimeout(() => {
        setIsExploding(false);
        setCurrentValue(0);
        setBrewLayers([]);
        setPouringId(null);
      }, 950);
    }
  };

  const progress = Math.min((score / level.targetScore) * 100, 100);
  const brewTubeLayers = brewLayers.length
    ? brewLayers.flatMap((layer) => layer.palette.slice(0, 1))
    : [];

  const ingredientRows = useMemo(() => {
    const top = ingredients.slice(0, 4);
    const bottom = ingredients.slice(4, 6);
    return { top, bottom };
  }, [ingredients]);

  return (
    <div className="relative flex h-full w-full flex-col items-center overflow-hidden p-2 md:p-4">
      <div className="absolute inset-0 bg-cover bg-center opacity-[0.8]" style={{ backgroundImage: `url(${potionLevelBg})` }} />
      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(12,18,34,0.18),rgba(12,18,34,0.4)_30%,rgba(8,12,24,0.74)_100%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(196,181,253,0.34),rgba(196,181,253,0)_26%),radial-gradient(circle_at_bottom,rgba(103,232,249,0.24),rgba(103,232,249,0)_30%)]" />

      <div className="relative z-10 flex h-full min-h-0 w-full max-w-5xl flex-1 flex-col gap-2 md:gap-3">
        <GameplayHUD
          title="Potion Pour"
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
          <div className="relative z-10 shrink-0 text-center">
            <div className="casual-ribbon-chip mx-auto inline-flex items-center gap-2 rounded-full px-3 py-1 text-[9px] font-black uppercase tracking-[0.2em] md:px-4 md:py-1.5 md:text-[10px]">
              <AssetIcon name="question" className="h-4 w-4" />
              Match the target brew
            </div>
            <div className="mt-2 text-[1.65rem] font-black leading-none text-white drop-shadow-[0_8px_18px_rgba(0,0,0,0.42)] md:text-[2.6rem]">
              Brew {targetDisplay}
            </div>
            <div className="mt-1 text-[9px] font-semibold text-white/74 md:text-sm">
              Tap potion tubes to pour into the active flask. Hit the exact value before time runs out.
            </div>
          </div>

          <div className="relative z-10 mt-2 flex min-h-0 flex-1 flex-col justify-center">
            <div className="grid grid-cols-4 justify-items-center gap-x-1.5 gap-y-3 md:gap-x-3 md:gap-y-4">
              {ingredientRows.top.map((ingredient) => (
                <PotionTube
                  key={ingredient.id}
                  label={ingredient.display}
                  layers={ingredient.palette}
                  onClick={() => addIngredient(ingredient)}
                  selected={pouringId === ingredient.id}
                  tilt={pouringId === ingredient.id}
                />
              ))}

              {ingredientRows.bottom.map((ingredient) => (
                <PotionTube
                  key={ingredient.id}
                  label={ingredient.display}
                  layers={ingredient.palette}
                  onClick={() => addIngredient(ingredient)}
                  selected={pouringId === ingredient.id}
                  tilt={pouringId === ingredient.id}
                />
              ))}

              <PotionTube
                label={`Mix ${formatMixValue(currentValue)}`}
                layers={brewTubeLayers}
                ghost={!brewTubeLayers.length}
                empty={!brewTubeLayers.length}
                footer={
                  <div className="rounded-full bg-white/10 px-2 py-0.5 text-[0.5rem] font-black uppercase tracking-[0.14em] text-cyan-100 md:text-[0.58rem]">
                    Active
                  </div>
                }
              />

              <PotionTube
                label="Clear"
                layers={[]}
                empty
                onClick={resetBrew}
                footer={
                  <div className="rounded-full bg-white/10 px-2 py-0.5 text-[0.5rem] font-black uppercase tracking-[0.14em] text-rose-100 md:text-[0.58rem]">
                    Reset
                  </div>
                }
              />
            </div>

            <div className="mt-3 grid grid-cols-2 gap-2 md:mt-4 md:gap-3">
              <div className="casual-panel-surface rounded-[1.1rem] p-2 text-center md:rounded-[1.4rem] md:p-3">
                <div className="text-[8px] font-black uppercase tracking-[0.18em] text-white/56 md:text-[10px]">Target Value</div>
                <div className="mt-1 text-[1.2rem] font-black text-white md:text-[1.65rem]">{formatMixValue(targetValue)}</div>
              </div>
              <div className="casual-panel-surface rounded-[1.1rem] p-2 text-center md:rounded-[1.4rem] md:p-3">
                <div className="text-[8px] font-black uppercase tracking-[0.18em] text-white/56 md:text-[10px]">Current Mix</div>
                <div className={`mt-1 text-[1.2rem] font-black md:text-[1.65rem] ${Math.abs(currentValue - targetValue) < 0.001 ? 'text-emerald-200' : currentValue > targetValue ? 'text-rose-200' : 'text-white'}`}>
                  {formatMixValue(currentValue)}
                </div>
              </div>
            </div>
          </div>

          <AnimatePresence>
            {isExploding && (
              <motion.div
                initial={{ opacity: 0, scale: 0.7 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 1.18 }}
                className="pointer-events-none absolute inset-0 z-30 flex items-center justify-center bg-[radial-gradient(circle,rgba(251,146,60,0.2),rgba(251,146,60,0)_48%)]"
              >
                <div className="rounded-full bg-[radial-gradient(circle,#fb923c,#f97316)] px-6 py-4 text-xl font-black text-white shadow-[0_20px_40px_rgba(249,115,22,0.4)] md:text-3xl">
                  Brew Burst
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

      <GameActionDock onBack={onBack} accentClass="text-white" />
      </div>

      <AnimatePresence>
        {(isGameOver || isVictory) && (
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
              <div className="casual-ribbon-chip inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-[10px] font-black uppercase tracking-[0.18em] md:text-xs">
                <AssetIcon name={isVictory ? 'star' : 'refresh'} className="h-4 w-4" />
                {isVictory ? 'Perfect Mix' : 'Round Over'}
              </div>

              <div className={`text-4xl font-black ${isVictory ? 'text-emerald-200' : 'text-rose-200'} md:text-5xl`}>
                {isVictory ? 'Master Brew' : 'Potion Panic'}
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
