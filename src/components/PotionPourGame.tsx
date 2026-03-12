import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import confetti from 'canvas-confetti';
import {
  PotionPourLevelConfig,
  AvatarData,
  MathType
} from '../types';
import { POTION_POUR_LEVELS, AVATARS, MATH_FAMILIES } from '../constants';
import GameplayHUD from './GameplayHUD';
import GameActionDock from './GameActionDock';
import { Home, HelpCircle, Star, RotateCcw, CheckCircle2, FlaskConical, Beaker, Droplets } from './GameIcons';

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
  color: string;
}

const PotionPourGame: React.FC<PotionPourGameProps> = ({
  levelId,
  avatarId,
  onVictory,
  onGameOver,
  onBack
}) => {
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(0);
  const [isGameOver, setIsGameOver] = useState(false);
  const [isVictory, setIsVictory] = useState(false);

  const [targetValue, setTargetValue] = useState(0);
  const [targetDisplay, setTargetDisplay] = useState('');
  const [currentValue, setCurrentValue] = useState(0);
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [cauldronColor, setCauldronColor] = useState('bg-purple-500');
  const [isExploding, setIsExploding] = useState(false);

  const level = POTION_POUR_LEVELS.find(l => l.id === levelId) || POTION_POUR_LEVELS[0];
  const avatar = AVATARS.find(a => a.id === avatarId) || AVATARS[0];

  const generateNewOrder = useCallback(() => {
    const families = MATH_FAMILIES.filter(f =>
      f.expressions.some(e => level.mathTypes.includes(e.type))
    );
    const family = families[Math.floor(Math.random() * families.length)];
    const expressions = family.expressions.filter(e => level.mathTypes.includes(e.type));
    const expression = expressions[Math.floor(Math.random() * expressions.length)];

    setTargetValue(family.targetValue);
    setTargetDisplay(expression.display);
    setCurrentValue(0);

    // Generate 4 ingredients, at least one must be part of the solution
    // For simplicity, we'll pick 4 random values from MATH_FAMILIES
    const availableIngredients: Ingredient[] = [];
    const colors = ['bg-blue-500', 'bg-red-500', 'bg-green-500', 'bg-yellow-500', 'bg-pink-500', 'bg-orange-500'];

    const usedIndices = new Set<number>();
    while (availableIngredients.length < 4) {
      const randFamily = MATH_FAMILIES[Math.floor(Math.random() * MATH_FAMILIES.length)];
      if (!usedIndices.has(MATH_FAMILIES.indexOf(randFamily))) {
        const randExpr = randFamily.expressions[Math.floor(Math.random() * randFamily.expressions.length)];
        availableIngredients.push({
          id: Math.random().toString(36).substr(2, 9),
          display: randExpr.display,
          value: randFamily.targetValue,
          color: colors[availableIngredients.length % colors.length]
        });
        usedIndices.add(MATH_FAMILIES.indexOf(randFamily));
      }
    }
    setIngredients(availableIngredients);
    setCauldronColor('bg-purple-500');
  }, [level]);

  useEffect(() => {
    setTimeLeft(level.duration);
    setScore(0);
    setIsGameOver(false);
    setIsVictory(false);
    generateNewOrder();
  }, [level, generateNewOrder]);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (timeLeft > 0 && !isGameOver && !isVictory) {
      timer = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            handleTimeUp();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [timeLeft, isGameOver, isVictory]);

  const handleTimeUp = () => {
    if (score >= level.targetScore) {
      handleWin();
    } else {
      setIsGameOver(true);
      onGameOver(score);
    }
  };

  const handleWin = () => {
    const stars = score >= level.targetScore * 2 ? 3 : score >= level.targetScore * 1.5 ? 2 : 1;
    setIsVictory(true);
    confetti({
      particleCount: 150,
      spread: 70,
      origin: { y: 0.6 },
      colors: ['#FFD700', '#FFFFFF', '#87CEEB']
    });
    onVictory(stars, score);
  };

  const addIngredient = (ingredient: Ingredient) => {
    if (isExploding || isGameOver || isVictory) return;

    const newValue = currentValue + ingredient.value;
    setCurrentValue(newValue);
    setCauldronColor(ingredient.color);

    if (Math.abs(newValue - targetValue) < 0.001) {
      // Success!
      setScore(prev => prev + 100);
      confetti({
        particleCount: 30,
        spread: 40,
        origin: { y: 0.8 },
        colors: [ingredient.color.replace('bg-', '#')]
      });
      setTimeout(generateNewOrder, 500);
    } else if (newValue > targetValue + 0.001) {
      // Explode!
      setIsExploding(true);
      setTimeout(() => {
        setIsExploding(false);
        setCurrentValue(0);
        setCauldronColor('bg-gray-400');
      }, 1000);
    }
  };

  const resetCauldron = () => {
    setCurrentValue(0);
    setCauldronColor('bg-purple-500');
  };

  const progress = Math.min((score / level.targetScore) * 100, 100);
  const cauldronFill = Math.min((currentValue / targetValue) * 100, 110);

  return (
    <div className="h-full w-full flex flex-col items-center p-4 relative overflow-y-auto overflow-x-hidden licensed-playfield-bg">
      {/* Magical Background Particles */}
      <div className="absolute inset-0 pointer-events-none">
        {Array.from({ length: 20 }).map((_, i) => (
          <motion.div
            key={i}
            animate={{
              y: [-20, 1000],
              x: [Math.random() * 1000, Math.random() * 1000],
              opacity: [0, 0.5, 0],
              scale: [0, 1, 0]
            }}
            transition={{
              duration: 5 + Math.random() * 10,
              repeat: Infinity,
              delay: Math.random() * 5
            }}
            className="absolute w-2 h-2 bg-blue-400 rounded-full blur-sm"
          />
        ))}
      </div>

      <div className="z-10 w-full max-w-4xl flex flex-col items-center gap-8">
        <GameplayHUD
          title="Potion Pour"
          avatar={avatar}
          score={score}
          targetScore={level.targetScore}
          timeLeft={timeLeft}
          progress={progress}
          accentText="text-purple-900"
          accentSoftBg="bg-purple-100/80"
          accentBorder="border-purple-200/80"
          progressBar="bg-gradient-to-r from-blue-400 via-purple-500 to-fuchsia-500"
          statLabel="Combo"
          statValue={1}
        />

        {/* Main Game Area */}
        <div className="w-full grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
          {/* Left: Target & Cauldron */}
          <div className="flex flex-col items-center gap-8">
            <div className="relative">
              <motion.div
                animate={{ y: [0, -10, 0] }}
                transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                className="licensed-game-card p-8 text-center relative"
              >
                <div className="text-white/60 font-black uppercase tracking-widest text-xs mb-2">Order Request</div>
                <div className="text-6xl font-black text-white drop-shadow-lg">{targetDisplay}</div>
                <div className="absolute -top-4 -right-4 bg-yellow-400 text-white p-3 rounded-2xl shadow-lg rotate-12">
                  <FlaskConical className="w-6 h-6" />
                </div>
              </motion.div>
            </div>

            <div className="relative w-64 h-64">
              {/* Cauldron Body */}
              <div className="absolute inset-0 bg-gray-800 rounded-full border-8 border-gray-700 shadow-2xl overflow-hidden">
                {/* Liquid Fill */}
                <motion.div
                  className={`absolute bottom-0 left-0 right-0 ${cauldronColor} transition-colors duration-500`}
                  animate={{
                    height: `${cauldronFill}%`,
                    scale: isExploding ? [1, 1.2, 1] : 1
                  }}
                >
                  {/* Bubbles */}
                  <div className="absolute top-0 left-0 right-0 h-4 flex justify-around">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <motion.div
                        key={i}
                        animate={{ y: [0, -20], opacity: [1, 0] }}
                        transition={{ duration: 1, repeat: Infinity, delay: i * 0.2 }}
                        className="w-2 h-2 bg-white/40 rounded-full"
                      />
                    ))}
                  </div>
                </motion.div>

                {/* Explosion Overlay */}
                <AnimatePresence>
                  {isExploding && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0 }}
                      animate={{ opacity: 1, scale: 2 }}
                      exit={{ opacity: 0, scale: 3 }}
                      className="absolute inset-0 bg-orange-500 flex items-center justify-center z-20"
                    >
                      <Droplets className="w-12 h-12 text-white animate-ping" />
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Cauldron Rim */}
              <div className="absolute -top-4 left-1/2 -translate-x-1/2 w-[110%] h-8 bg-gray-700 rounded-full border-4 border-gray-600 z-10" />

              {/* Reset Button */}
              <button
                onClick={resetCauldron}
                className="absolute -bottom-4 left-1/2 -translate-x-1/2 bg-red-500 text-white p-3 rounded-full shadow-lg hover:bg-red-600 transition-all z-20"
              >
                <RotateCcw className="w-6 h-6" />
              </button>
            </div>
          </div>

          {/* Right: Ingredients */}
          <div className="grid grid-cols-2 gap-4">
            {ingredients.map((ing, idx) => (
              <motion.button
                key={ing.id}
                whileHover={{ scale: 1.05, y: -5 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => addIngredient(ing)}
                className={`${ing.color} p-6 rounded-[2rem] border-b-8 border-black/20 shadow-xl flex flex-col items-center gap-4 relative overflow-hidden group`}
              >
                <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity" />
                <Beaker className="w-10 h-10 text-white drop-shadow-md" />
                <span className="text-2xl font-black text-white drop-shadow-md">{ing.display}</span>
              </motion.button>
            ))}
          </div>
        </div>

        <GameActionDock
          onBack={onBack}
          accentClass="text-purple-700"
        />
      </div>

      {/* Game Over / Victory Modals */}
      <AnimatePresence>
        {(isGameOver || isVictory) && (
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md"
          >
            <div className="licensed-overlay-card p-12 flex flex-col items-center gap-8 max-w-md w-full">
              <div className={`text-6xl font-black ${isVictory ? 'text-yellow-400' : 'text-red-500'} drop-shadow-[0_4px_10px_rgba(0,0,0,0.5)]`}>
                {isVictory ? 'MASTER!' : 'PANIC!'}
              </div>

              {isVictory && (
                <div className="flex gap-2">
                  {[1, 2, 3].map(s => (
                    <motion.div
                      key={s}
                      initial={{ scale: 0, rotate: -20 }}
                      animate={{ scale: 1, rotate: 0 }}
                      transition={{ delay: s * 0.2, type: 'spring' }}
                    >
                      <Star className={`w-16 h-16 ${s <= (score >= level.targetScore * 2 ? 3 : score >= level.targetScore * 1.5 ? 2 : 1) ? 'fill-yellow-400 text-yellow-400' : 'text-white/20'}`} />
                    </motion.div>
                  ))}
                </div>
              )}

              <div className="text-center">
                <div className="text-white/60 font-black uppercase tracking-widest text-sm">Final Brew Score</div>
                <div className="text-7xl font-black text-white drop-shadow-lg">{score}</div>
              </div>

              <button
                onClick={onBack}
                className="w-full py-6 text-white text-3xl font-black rounded-3xl transition-all licensed-submit-button"
              >
                CONTINUE
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default PotionPourGame;
