import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import confetti from 'canvas-confetti';
import { AvatarData } from '../types';
import { AVATARS } from '../constants';
import { getSatsInspiredMeasurementProblem, type MeasurementProblem } from '../content/satsInspiredQuestionBanks';
import GameplayHUD from './GameplayHUD';
import GameActionDock from './GameActionDock';
import { Home, HelpCircle, Star, Timer, Flame, Hammer } from './GameIcons';

interface MeasurementForgeGameProps {
  levelId: number;
  avatarId: string;
  onVictory: (stars: number, score: number) => void;
  onGameOver: (score: number) => void;
  onBack: () => void;
}

const ITEMS = {
  sword: { icon: '⚔️', color: 'text-slate-300' },
  shield: { icon: '🛡️', color: 'text-amber-600' },
  potion: { icon: '🧪', color: 'text-emerald-400' },
  armor: { icon: '🛡️', color: 'text-slate-400' },
};

const generateMeasurementProblem = (levelId: number): MeasurementProblem => {
  const satsInspiredProblem = Math.random() < 0.7
    ? getSatsInspiredMeasurementProblem(levelId)
    : null;

  if (satsInspiredProblem) {
    return satsInspiredProblem;
  }

  const types = ['length', 'mass', 'volume'];
  const type = types[Math.floor(Math.random() * types.length)];
  
  let question = '';
  let answer = '';
  let options = new Set<string>();
  let itemType: 'sword' | 'shield' | 'potion' | 'armor' = 'sword';

  const randomValue = (min: number, max: number, decimals = 0) => {
    // SATs loves specific decimals like 1.5, 1.25, 0.75, 2.5
    if (decimals > 0 && Math.random() > 0.5) {
      const trickyDecimals = [1.5, 1.25, 0.75, 2.5, 3.5, 0.25, 0.5];
      return trickyDecimals[Math.floor(Math.random() * trickyDecimals.length)];
    }
    const val = Math.random() * (max - min) + min;
    return Number(val.toFixed(decimals));
  };

  if (type === 'length') {
    itemType = 'sword';
    const conversions = [
      { from: 'm', to: 'cm', factor: 100 },
      { from: 'cm', to: 'mm', factor: 10 },
      { from: 'm', to: 'mm', factor: 1000 },
      { from: 'km', to: 'm', factor: 1000 },
    ];
    // Limit complexity based on level
    const availableConversions = conversions.slice(0, Math.min(conversions.length, 1 + levelId));
    const conv = availableConversions[Math.floor(Math.random() * availableConversions.length)];
    
    const val = randomValue(1, 10, levelId > 2 ? 1 : 0);
    question = `Forge a sword that is ${val} ${conv.from} long. What is this in ${conv.to}?`;
    answer = `${val * conv.factor} ${conv.to}`;
    options.add(answer);

    while (options.size < 4) {
      const wrongFactors = [10, 100, 1000, 0.1, 0.01];
      const wFactor = wrongFactors[Math.floor(Math.random() * wrongFactors.length)];
      if (wFactor !== conv.factor) {
        options.add(`${val * wFactor} ${conv.to}`);
      } else {
        options.add(`${(val + Math.floor(Math.random() * 5) + 1) * conv.factor} ${conv.to}`);
      }
    }
  } else if (type === 'mass') {
    itemType = Math.random() > 0.5 ? 'shield' : 'armor';
    const conversions = [
      { from: 'kg', to: 'g', factor: 1000 },
      { from: 'g', to: 'kg', factor: 0.001 },
    ];
    const conv = conversions[Math.floor(Math.random() * conversions.length)];
    
    const val = conv.from === 'kg' ? randomValue(1, 20, levelId > 2 ? 2 : 0) : randomValue(1000, 5000, 0);
    question = `Forge a ${itemType} weighing ${val} ${conv.from}. What is this in ${conv.to}?`;
    
    // Handle floating point weirdness
    const ansVal = Number((val * conv.factor).toPrecision(5));
    answer = `${ansVal} ${conv.to}`;
    options.add(answer);

    while (options.size < 4) {
      const wrongFactors = [10, 100, 1000, 0.1, 0.01, 0.001];
      const wFactor = wrongFactors[Math.floor(Math.random() * wrongFactors.length)];
      if (wFactor !== conv.factor) {
        options.add(`${Number((val * wFactor).toPrecision(5))} ${conv.to}`);
      } else {
        options.add(`${Number(((val + Math.floor(Math.random() * 5) + 1) * conv.factor).toPrecision(5))} ${conv.to}`);
      }
    }
  } else {
    itemType = 'potion';
    const conversions = [
      { from: 'l', to: 'ml', factor: 1000 },
      { from: 'ml', to: 'l', factor: 0.001 },
    ];
    const conv = conversions[Math.floor(Math.random() * conversions.length)];
    
    const val = conv.from === 'l' ? randomValue(0.5, 5, levelId > 2 ? 2 : 1) : randomValue(500, 5000, 0);
    question = `Brew a potion with ${val} ${conv.from} of liquid. What is this in ${conv.to}?`;
    
    const ansVal = Number((val * conv.factor).toPrecision(5));
    answer = `${ansVal} ${conv.to}`;
    options.add(answer);

    while (options.size < 4) {
      const wrongFactors = [10, 100, 1000, 0.1, 0.01, 0.001];
      const wFactor = wrongFactors[Math.floor(Math.random() * wrongFactors.length)];
      if (wFactor !== conv.factor) {
        options.add(`${Number((val * wFactor).toPrecision(5))} ${conv.to}`);
      } else {
        options.add(`${Number(((val + Math.floor(Math.random() * 5) + 1) * conv.factor).toPrecision(5))} ${conv.to}`);
      }
    }
  }

  return {
    question,
    answer,
    options: Array.from(options).sort(() => Math.random() - 0.5),
    itemType
  };
};

const MeasurementForgeGame: React.FC<MeasurementForgeGameProps> = ({ 
  levelId, 
  avatarId, 
  onVictory, 
  onGameOver, 
  onBack 
}) => {
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(90);
  const [isGameOver, setIsGameOver] = useState(false);
  const [isVictory, setIsVictory] = useState(false);
  
  const [problem, setProblem] = useState<MeasurementProblem | null>(null);
  const [streak, setStreak] = useState(0);
  const [feedback, setFeedback] = useState<'correct' | 'incorrect' | null>(null);
  const [isForging, setIsForging] = useState(false);

  const avatar = AVATARS.find(a => a.id === avatarId) || AVATARS[0];
  const targetScore = 800 + (levelId * 200);

  useEffect(() => {
    setTimeLeft(90 + levelId * 10);
    setScore(0);
    setIsGameOver(false);
    setIsVictory(false);
    setStreak(0);
    setProblem(generateMeasurementProblem(levelId));
  }, [levelId]);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (timeLeft > 0 && !isGameOver && !isVictory && !feedback && !isForging) {
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
  }, [timeLeft, isGameOver, isVictory, feedback, isForging]);

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

  const handleAnswer = (selected: string) => {
    if (feedback || isGameOver || isVictory || !problem || isForging) return;

    setIsForging(true);

    if (selected === problem.answer) {
      setFeedback('correct');
      const points = 100 + (streak * 20);
      setScore(prev => prev + points);
      setStreak(prev => prev + 1);
      
      setTimeout(() => {
        confetti({
          particleCount: 40,
          spread: 50,
          origin: { y: 0.7 },
          colors: ['#f97316', '#fb923c', '#fcd34d']
        });
        
        setTimeout(() => {
          setProblem(generateMeasurementProblem(levelId));
          setFeedback(null);
          setIsForging(false);
        }, 1500);
      }, 1000); // Wait for forge animation

    } else {
      setFeedback('incorrect');
      setStreak(0);
      setScore(prev => Math.max(0, prev - 30));
      
      setTimeout(() => {
        setFeedback(null);
        setIsForging(false);
      }, 1500);
    }
  };

  const progress = Math.min((score / targetScore) * 100, 100);

  return (
    <div className="h-full w-full flex flex-col items-center p-2 md:p-4 relative overflow-hidden bg-stone-950 font-sans">
      {/* Forge Background */}
      <div className="absolute inset-0 opacity-20 pointer-events-none" style={{ 
        backgroundImage: 'radial-gradient(circle at 50% 100%, #ea580c 0%, transparent 60%)', 
      }} />
      <div className="absolute inset-0 opacity-10 pointer-events-none" style={{ 
        backgroundImage: 'linear-gradient(45deg, #292524 25%, transparent 25%, transparent 75%, #292524 75%, #292524), linear-gradient(45deg, #292524 25%, transparent 25%, transparent 75%, #292524 75%, #292524)', 
        backgroundSize: '40px 40px',
        backgroundPosition: '0 0, 20px 20px'
      }} />

      <div className="z-10 w-full max-w-5xl flex flex-col items-center gap-2 md:gap-6 h-full flex-1 min-h-0">
        <GameplayHUD
          title="Measurement Forge"
          avatar={avatar}
          score={score}
          targetScore={targetScore}
          timeLeft={timeLeft}
          progress={progress}
          accentText="text-orange-900"
          accentSoftBg="bg-orange-100/80"
          accentBorder="border-orange-200/80"
          progressBar="bg-gradient-to-r from-orange-400 via-amber-400 to-red-400"
          statLabel="Heat"
          statValue={streak}
        />

        {/* Game Area */}
        <div className="w-full flex-1 relative flex flex-col items-center justify-center gap-4 md:gap-8">
          
          {problem && (
            <>
              {/* Anvil & Item Area */}
              <div className="relative w-full max-w-sm md:max-w-md aspect-[4/3] md:aspect-video flex items-end justify-center mb-4 md:mb-12">
                {/* Anvil */}
                <div className="absolute bottom-0 w-44 h-24 md:w-64 md:h-32 bg-stone-700 rounded-t-xl border-t-8 border-stone-500 shadow-[0_20px_50px_rgba(0,0,0,0.5)] flex flex-col items-center justify-end pb-3 md:pb-4">
                  <div className="w-32 h-12 md:w-48 md:h-16 bg-stone-800 rounded-lg border-2 border-stone-600 flex items-center justify-center">
                    <Flame className="h-6 w-6 md:h-8 md:w-8 text-orange-500 animate-pulse" />
                  </div>
                </div>

                {/* Item being forged */}
                <AnimatePresence>
                  {isForging && feedback === 'correct' && (
                    <motion.div
                      initial={{ y: -50, opacity: 0, scale: 0.5 }}
                      animate={{ y: -100, opacity: 1, scale: 1.5 }}
                      exit={{ opacity: 0, scale: 2, y: -150 }}
                      transition={{ duration: 1 }}
                      className="absolute bottom-12 md:bottom-16 text-4xl md:text-6xl drop-shadow-[0_0_15px_rgba(251,146,60,0.8)]"
                    >
                      {ITEMS[problem.itemType].icon}
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Hammer Animation */}
                <AnimatePresence>
                  {isForging && (
                    <motion.div
                      initial={{ rotate: 45, x: 50, y: -100 }}
                      animate={{ rotate: -45, x: 0, y: -50 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.2, yoyo: 3 }}
                      className="absolute bottom-12 md:bottom-16 right-1/4"
                    >
                      <Hammer className="h-14 w-14 md:h-24 md:w-24 text-stone-400 drop-shadow-xl" />
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Order Scroll */}
              <div className="p-4 md:p-6 text-center max-w-2xl w-full relative transform -rotate-1 licensed-game-card">
                <div className="absolute -top-3 -left-3 md:-top-4 md:-left-4 w-6 h-6 md:w-8 md:h-8 bg-red-700 rounded-full border-2 border-red-900 shadow-sm" />
                <div className="absolute -top-3 -right-3 md:-top-4 md:-right-4 w-6 h-6 md:w-8 md:h-8 bg-red-700 rounded-full border-2 border-red-900 shadow-sm" />
                <h3 className="text-base md:text-2xl text-amber-900 font-bold font-serif leading-tight">
                  {problem.question}
                </h3>
              </div>

              {/* Options Grid */}
              <div className="grid grid-cols-2 gap-3 md:gap-6 w-full max-w-3xl">
                {problem.options.map((opt, i) => (
                  <button
                    key={i}
                    onClick={() => handleAnswer(opt)}
                    disabled={!!feedback || isForging}
                    className="relative group min-h-[4.5rem] md:min-h-[5.5rem] px-3 py-4 md:p-6 rounded-2xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center licensed-answer-button"
                  >
                    <span className="text-xl md:text-3xl font-black text-orange-400 drop-shadow-md group-hover:text-orange-300">
                      {opt}
                    </span>
                  </button>
                ))}
              </div>
            </>
          )}

          {/* Feedback Overlay */}
          <AnimatePresence>
            {feedback && !isForging && (
              <motion.div 
                initial={{ opacity: 0, scale: 0.5 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 1.5 }}
                className={`absolute inset-0 flex items-center justify-center z-20 pointer-events-none`}
              >
                <div className={`px-12 py-6 rounded-full backdrop-blur-md border-4 ${feedback === 'correct' ? 'bg-green-500/20 border-green-400' : 'bg-red-500/20 border-red-400'}`}>
                  <span className={`text-3xl md:text-6xl font-black drop-shadow-lg ${feedback === 'correct' ? 'text-green-400' : 'text-red-500'}`}>
                    {feedback === 'correct' ? 'MASTERPIECE!' : 'RUINED!'}
                  </span>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

        </div>

        <GameActionDock
          onBack={onBack}
          accentClass="text-white"
        />

        {/* Game Over / Victory Modals */}
        <AnimatePresence>
        {(isGameOver || isVictory) && (
          <motion.div 
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md"
          >
            <div className="app-modal-panel w-full max-w-md rounded-[2rem] border-4 border-stone-700 bg-stone-900 p-6 shadow-2xl flex flex-col items-center gap-5 md:rounded-[3rem] md:border-8 md:gap-8 md:p-12">
              <div className={`text-5xl font-black ${isVictory ? 'text-orange-500' : 'text-red-500'} drop-shadow-md text-center`}>
                {isVictory ? 'MASTER SMITH!' : 'FORGE COLD!'}
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
                      <Star className={`w-16 h-16 ${s <= (score >= targetScore * 2 ? 3 : score >= targetScore * 1.5 ? 2 : 1) ? 'fill-orange-500 text-orange-500' : 'text-stone-700'}`} />
                    </motion.div>
                  ))}
                </div>
              )}

              <div className="text-center">
                <div className="text-stone-500 font-black uppercase tracking-widest text-sm">Final Score</div>
                <div className="text-6xl font-black text-white drop-shadow-sm">{score}</div>
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

export default MeasurementForgeGame;
