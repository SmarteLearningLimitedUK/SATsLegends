import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import confetti from 'canvas-confetti';
import { AvatarData } from '../types';
import { AVATARS } from '../constants';
import GameplayHUD from './GameplayHUD';
import GameActionDock from './GameActionDock';
import { Home, HelpCircle, Star, Timer } from './GameIcons';

interface BurgerBuilderGameProps {
  levelId: number;
  avatarId: string;
  onVictory: (stars: number, score: number) => void;
  onGameOver: (score: number) => void;
  onBack: () => void;
}

interface Ingredient {
  id: string;
  name: string;
  fraction: number; // e.g., 0.5 for 1/2
  display: string;
  color: string;
  emoji: string;
}

interface OrderItem {
  id: string;
  name: string;
  targetFraction: number;
  display: string;
  currentFraction: number;
  emoji: string;
}

const INGREDIENT_TYPES = [
  { name: 'Lettuce', emoji: '🥬', color: 'bg-green-400' },
  { name: 'Tomato', emoji: '🍅', color: 'bg-red-500' },
  { name: 'Cheese', emoji: '🧀', color: 'bg-yellow-400' },
  { name: 'Patty', emoji: '🥩', color: 'bg-amber-800' },
  { name: 'Pickles', emoji: '🥒', color: 'bg-green-600' },
  { name: 'Onion', emoji: '🧅', color: 'bg-purple-300' },
];

const FRACTIONS = [
  { value: 1, display: '1' },
  { value: 0.5, display: '1/2' },
  { value: 0.25, display: '1/4' },
  { value: 0.75, display: '3/4' },
  { value: 0.2, display: '1/5' },
  { value: 0.1, display: '1/10' },
];

const BurgerBuilderGame: React.FC<BurgerBuilderGameProps> = ({ 
  levelId, 
  avatarId, 
  onVictory, 
  onGameOver, 
  onBack 
}) => {
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(60);
  const [isGameOver, setIsGameOver] = useState(false);
  const [isVictory, setIsVictory] = useState(false);
  
  const [currentOrder, setCurrentOrder] = useState<OrderItem[]>([]);
  const [burgerStack, setBurgerStack] = useState<Ingredient[]>([]);
  const [availableIngredients, setAvailableIngredients] = useState<Ingredient[]>([]);
  const [combo, setCombo] = useState(0);

  const avatar = AVATARS.find(a => a.id === avatarId) || AVATARS[0];
  const targetScore = 1000 + (levelId * 500);

  const generateOrder = useCallback(() => {
    const numItems = Math.min(3 + Math.floor(levelId / 2), 5);
    const order: OrderItem[] = [];
    const available = [...INGREDIENT_TYPES].sort(() => Math.random() - 0.5);
    
    for (let i = 0; i < numItems; i++) {
      const type = available[i];
      // Pick a random fraction that makes sense for the level
      const fractionObj = FRACTIONS[Math.floor(Math.random() * Math.min(levelId + 2, FRACTIONS.length))];
      
      order.push({
        id: Math.random().toString(36).substr(2, 9),
        name: type.name,
        targetFraction: fractionObj.value,
        display: `${fractionObj.display} ${type.name}`,
        currentFraction: 0,
        emoji: type.emoji
      });
    }
    setCurrentOrder(order);
    setBurgerStack([]);
    
    // Generate draggable ingredients
    const draggables: Ingredient[] = [];
    // Ensure we have the right ingredients
    order.forEach(item => {
      const type = INGREDIENT_TYPES.find(t => t.name === item.name)!;
      // Add pieces that sum up to the target or just exact pieces
      // For simplicity, let's just add exact pieces and some random ones
      draggables.push({
        id: Math.random().toString(36).substr(2, 9),
        name: type.name,
        fraction: item.targetFraction,
        display: FRACTIONS.find(f => f.value === item.targetFraction)?.display || String(item.targetFraction),
        color: type.color,
        emoji: type.emoji
      });
    });
    
    // Add some random distractors
    for (let i = 0; i < 4; i++) {
      const type = INGREDIENT_TYPES[Math.floor(Math.random() * INGREDIENT_TYPES.length)];
      const fractionObj = FRACTIONS[Math.floor(Math.random() * FRACTIONS.length)];
      draggables.push({
        id: Math.random().toString(36).substr(2, 9),
        name: type.name,
        fraction: fractionObj.value,
        display: fractionObj.display,
        color: type.color,
        emoji: type.emoji
      });
    }
    
    setAvailableIngredients(draggables.sort(() => Math.random() - 0.5));
  }, [levelId]);

  useEffect(() => {
    setTimeLeft(60 + levelId * 10);
    setScore(0);
    setIsGameOver(false);
    setIsVictory(false);
    generateOrder();
  }, [levelId, generateOrder]);

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
    if (score >= targetScore) {
      handleWin();
    } else {
      setIsGameOver(true);
      onGameOver(score);
    }
  };

  const handleWin = () => {
    const stars = score >= targetScore * 2 ? 3 : score >= targetScore * 1.5 ? 2 : 1;
    setIsVictory(true);
    confetti({
      particleCount: 150,
      spread: 70,
      origin: { y: 0.6 },
      colors: ['#FFD700', '#FFFFFF', '#87CEEB']
    });
    onVictory(stars, score);
  };

  const addIngredientToBurger = (ingredient: Ingredient) => {
    if (isGameOver || isVictory) return;

    setBurgerStack(prev => [...prev, ingredient]);
    
    // Check if it matches any order item
    setCurrentOrder(prevOrder => {
      const newOrder = [...prevOrder];
      const orderItem = newOrder.find(item => item.name === ingredient.name);
      
      if (orderItem) {
        orderItem.currentFraction += ingredient.fraction;
        // Float point math fix
        orderItem.currentFraction = Math.round(orderItem.currentFraction * 100) / 100;
      }
      return newOrder;
    });
  };

  const submitBurger = () => {
    let isPerfect = true;
    let isAcceptable = true;
    let pointsEarned = 0;

    currentOrder.forEach(item => {
      if (item.currentFraction === item.targetFraction) {
        pointsEarned += 100;
      } else {
        isPerfect = false;
        if (item.currentFraction > item.targetFraction) {
          isAcceptable = false;
        }
      }
    });

    if (isPerfect) {
      const comboMultiplier = 1 + (combo * 0.1);
      const finalPoints = Math.round(pointsEarned * comboMultiplier);
      setScore(prev => prev + finalPoints);
      setCombo(prev => prev + 1);
      confetti({
        particleCount: 50,
        spread: 60,
        origin: { y: 0.7 }
      });
      generateOrder();
    } else if (!isAcceptable) {
      // Penalty for over-adding
      setScore(prev => Math.max(0, prev - 50));
      setCombo(0);
      // Reset burger stack but keep order
      setBurgerStack([]);
      setCurrentOrder(prev => prev.map(item => ({ ...item, currentFraction: 0 })));
    } else {
      // Incomplete, do nothing or show message
    }
  };

  const progress = Math.min((score / targetScore) * 100, 100);

  return (
    <div className="h-full w-full flex flex-col items-center p-2 md:p-4 relative overflow-hidden bg-amber-50">
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-10 pointer-events-none" style={{ backgroundImage: 'radial-gradient(#d97706 2px, transparent 2px)', backgroundSize: '30px 30px' }} />

      <div className="z-10 w-full max-w-5xl flex h-full min-h-0 flex-1 flex-col items-center gap-3 md:gap-6">
        <GameplayHUD
          title="Burger Builder"
          avatar={avatar}
          score={score}
          targetScore={targetScore}
          timeLeft={timeLeft}
          progress={progress}
          accentText="text-amber-900"
          accentSoftBg="bg-amber-100/80"
          accentBorder="border-amber-200/80"
          progressBar="bg-gradient-to-r from-yellow-400 via-orange-400 to-amber-500"
          statLabel="Combo"
          statValue={`x${(1 + combo * 0.1).toFixed(1)}`}
        />

        {/* Game Area */}
        <div className="w-full flex-1 min-h-0 grid grid-cols-1 gap-3 md:gap-4 lg:grid-cols-3 lg:gap-6">
          {/* Left: Order Ticket */}
          <div className="bg-white p-4 md:p-6 rounded-[1.5rem] md:rounded-[2rem] shadow-xl border-t-4 md:border-t-8 border-amber-400 relative min-h-0 overflow-hidden">
            <div className="absolute -top-4 left-1/2 -translate-x-1/2 w-16 h-8 bg-gray-300 rounded-full shadow-inner" />
            <h3 className="text-lg md:text-2xl font-black text-gray-800 mb-3 md:mb-6 text-center border-b-2 border-dashed border-gray-300 pb-3 md:pb-4">
              Order Ticket
            </h3>
            <div className="space-y-2 md:space-y-4">
              {currentOrder.map(item => (
                <div key={item.id} className="flex items-center justify-between gap-2 p-2 md:p-3 licensed-answer-chip">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl md:text-3xl">{item.emoji}</span>
                    <span className="font-bold text-gray-700 text-sm md:text-lg">{item.display}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`font-black ${item.currentFraction === item.targetFraction ? 'text-green-500' : item.currentFraction > item.targetFraction ? 'text-red-500' : 'text-amber-500'}`}>
                      {item.currentFraction} / {item.targetFraction}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Center: Burger Stack */}
          <div className="relative flex min-h-[260px] flex-col items-center justify-end rounded-[2rem] border-2 md:border-4 border-amber-200 bg-white/50 p-4 shadow-inner backdrop-blur-sm md:min-h-[420px] md:rounded-[3rem] md:p-8">
            <div className="w-32 h-10 md:w-48 md:h-16 bg-amber-200 rounded-t-full border-4 border-amber-300 shadow-md mb-2 flex items-center justify-center">
              <span className="text-amber-600 font-bold opacity-50">Top Bun</span>
            </div>
            
            <div className="flex w-full flex-1 flex-col-reverse items-center justify-start gap-1 overflow-visible py-2 md:py-4">
              <AnimatePresence>
                {burgerStack.map((ing, idx) => (
                  <motion.div
                    key={`${ing.id}-${idx}`}
                    initial={{ y: -50, opacity: 0, scale: 1.2 }}
                    animate={{ y: 0, opacity: 1, scale: 1 }}
                    className={`${ing.color} w-32 h-6 md:w-48 md:h-8 rounded-full border-2 border-black/20 shadow-md flex items-center justify-center relative z-${idx}`}
                  >
                    <span className="text-[10px] md:text-sm font-black text-white drop-shadow-md">{ing.display}</span>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>

            <div className="w-32 h-9 md:w-48 md:h-12 bg-amber-200 rounded-b-full border-4 border-amber-300 shadow-md mt-2 flex items-center justify-center">
              <span className="text-amber-600 font-bold opacity-50">Bottom Bun</span>
            </div>

            <button
              onClick={submitBurger}
              className="absolute -bottom-4 md:-bottom-6 bg-green-500 text-white px-5 py-2.5 md:px-8 md:py-4 rounded-full font-black text-sm md:text-xl shadow-[0_8px_0_#16a34a] hover:translate-y-1 hover:shadow-[0_4px_0_#16a34a] active:translate-y-2 active:shadow-none transition-all"
            >
              SERVE BURGER
            </button>
          </div>

          {/* Right: Ingredients */}
          <div className="bg-white/80 backdrop-blur-md p-4 md:p-6 rounded-[1.5rem] md:rounded-[2rem] shadow-xl border-2 md:border-4 border-amber-200 min-h-0 overflow-hidden">
            <h3 className="text-lg md:text-xl font-black text-amber-900 mb-3 md:mb-4 text-center">Ingredients</h3>
            <div className="grid grid-cols-2 gap-2 md:gap-4">
              {availableIngredients.map(ing => (
                <motion.button
                  key={ing.id}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => addIngredientToBurger(ing)}
                  className={`${ing.color} p-3 md:p-4 rounded-[1.25rem] md:rounded-2xl border-b-4 border-black/20 flex flex-col items-center gap-2 licensed-answer-button`}
                >
                  <span className="text-2xl md:text-4xl filter drop-shadow-md">{ing.emoji}</span>
                  <span className="bg-white/90 px-2 py-1 rounded-full text-[10px] md:text-sm font-black text-gray-800 shadow-sm">
                    {ing.display}
                  </span>
                </motion.button>
              ))}
            </div>
          </div>
        </div>

        <GameActionDock
          onBack={onBack}
          accentClass="text-amber-700"
        />

        {/* Game Over / Victory Modals */}
        <AnimatePresence>
        {(isGameOver || isVictory) && (
          <motion.div 
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md"
          >
            <div className="app-modal-panel w-full max-w-md rounded-[2rem] border-4 border-amber-400 bg-white p-6 shadow-2xl flex flex-col items-center gap-5 md:rounded-[3rem] md:border-8 md:gap-8 md:p-12">
              <div className={`text-5xl font-black ${isVictory ? 'text-green-500' : 'text-red-500'} drop-shadow-md text-center`}>
                {isVictory ? 'ORDER UP!' : 'SHIFT OVER!'}
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
                      <Star className={`w-16 h-16 ${s <= (score >= targetScore * 2 ? 3 : score >= targetScore * 1.5 ? 2 : 1) ? 'fill-yellow-400 text-yellow-400' : 'text-gray-200'}`} />
                    </motion.div>
                  ))}
                </div>
              )}

              <div className="text-center">
                <div className="text-gray-500 font-black uppercase tracking-widest text-sm">Final Score</div>
                <div className="text-6xl font-black text-amber-500 drop-shadow-sm">{score}</div>
              </div>

              <button 
                onClick={onBack}
                className="w-full py-5 text-white text-2xl font-black rounded-2xl transition-all licensed-submit-button"
              >
                CONTINUE
              </button>
            </div>
          </motion.div>
        )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default BurgerBuilderGame;
