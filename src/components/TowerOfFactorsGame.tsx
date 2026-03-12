import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import confetti from 'canvas-confetti';
import { AvatarData } from '../types';
import { AVATARS } from '../constants';
import GameplayHUD from './GameplayHUD';
import GameActionDock from './GameActionDock';
import { Home, HelpCircle, Star, Timer, Castle } from './GameIcons';

interface TowerOfFactorsGameProps {
  levelId: number;
  avatarId: string;
  onVictory: (stars: number, score: number) => void;
  onGameOver: (score: number) => void;
  onBack: () => void;
}

interface FactorProblem {
  target: number;
  factors: number[];
  options: number[];
}

const generateFactorProblem = (levelId: number): FactorProblem => {
  // Higher levels = larger target numbers
  const maxTarget = levelId === 1 ? 24 : levelId === 2 ? 48 : levelId === 3 ? 72 : 100;
  const minTarget = levelId === 1 ? 12 : 24;
  
  let target = 0;
  let factors: number[] = [];
  
  // Ensure we pick a number with a decent amount of factors (not prime)
  while (factors.length < 4) {
    target = Math.floor(Math.random() * (maxTarget - minTarget + 1)) + minTarget;
    factors = [];
    for (let i = 1; i <= target; i++) {
      if (target % i === 0) factors.push(i);
    }
  }

  // Generate options (some factors, some non-factors)
  const options = new Set<number>();
  
  // Add 3-5 correct factors
  const numCorrect = Math.min(factors.length, Math.floor(Math.random() * 3) + 3);
  const shuffledFactors = [...factors].sort(() => Math.random() - 0.5);
  for (let i = 0; i < numCorrect; i++) {
    options.add(shuffledFactors[i]);
  }

  // Fill the rest with non-factors (up to 12 total options)
  while (options.size < 12) {
    const wrong = Math.floor(Math.random() * target) + 1;
    if (!factors.includes(wrong)) {
      options.add(wrong);
    }
  }

  return {
    target,
    factors,
    options: Array.from(options).sort(() => Math.random() - 0.5)
  };
};

const TowerOfFactorsGame: React.FC<TowerOfFactorsGameProps> = ({ 
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
  
  const [problem, setProblem] = useState<FactorProblem | null>(null);
  const [tower, setTower] = useState<number[]>([]);
  const [streak, setStreak] = useState(0);
  const [feedback, setFeedback] = useState<'correct' | 'incorrect' | null>(null);
  const [shake, setShake] = useState(false);

  const avatar = AVATARS.find(a => a.id === avatarId) || AVATARS[0];
  const targetScore = 800 + (levelId * 200);

  useEffect(() => {
    setTimeLeft(60 + levelId * 10);
    setScore(0);
    setIsGameOver(false);
    setIsVictory(false);
    setStreak(0);
    setTower([]);
    setProblem(generateFactorProblem(levelId));
  }, [levelId]);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (timeLeft > 0 && !isGameOver && !isVictory && !feedback) {
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
  }, [timeLeft, isGameOver, isVictory, feedback]);

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

  const handleSelect = (num: number) => {
    if (feedback || isGameOver || isVictory || !problem) return;

    // Check if already in tower
    if (tower.includes(num)) return;

    if (problem.factors.includes(num)) {
      setFeedback('correct');
      setTower(prev => [...prev, num]);
      
      const points = 50 + (streak * 10);
      setScore(prev => prev + points);
      setStreak(prev => prev + 1);
      
      confetti({
        particleCount: 30,
        spread: 40,
        origin: { y: 0.8 },
        colors: ['#a3e635', '#84cc16']
      });

      // Check if all correct factors from options are found
      const correctOptions = problem.options.filter(o => problem.factors.includes(o));
      if (tower.length + 1 === correctOptions.length) {
        setTimeout(() => {
          setProblem(generateFactorProblem(levelId));
          setTower([]);
          setFeedback(null);
        }, 1500);
      } else {
        setTimeout(() => setFeedback(null), 500);
      }

    } else {
      setFeedback('incorrect');
      setShake(true);
      setStreak(0);
      setScore(prev => Math.max(0, prev - 20));
      
      // Tower falls down!
      setTimeout(() => {
        setTower([]);
        setShake(false);
        setFeedback(null);
      }, 1000);
    }
  };

  const progress = Math.min((score / targetScore) * 100, 100);

  return (
    <div className="h-full w-full flex flex-col items-center p-4 relative overflow-y-auto overflow-x-hidden licensed-playfield-bg font-sans">
      {/* Night Sky Background */}
      <div className="absolute inset-0 opacity-30 pointer-events-none" style={{ 
        backgroundImage: 'radial-gradient(circle at 50% 0%, #1e293b 0%, transparent 70%)', 
      }} />
      {/* Stars */}
      {Array.from({ length: 20 }).map((_, i) => (
        <div key={i} className="absolute bg-white rounded-full animate-pulse" style={{
          width: Math.random() * 3 + 1 + 'px',
          height: Math.random() * 3 + 1 + 'px',
          top: Math.random() * 50 + '%',
          left: Math.random() * 100 + '%',
          animationDuration: Math.random() * 3 + 2 + 's'
        }} />
      ))}

      <div className="z-10 w-full max-w-5xl flex flex-col items-center gap-6 h-full flex-1">
        <GameplayHUD
          title="Tower of Factors"
          avatar={avatar}
          score={score}
          targetScore={targetScore}
          timeLeft={timeLeft}
          progress={progress}
          accentText="text-slate-900"
          accentSoftBg="bg-slate-100/80"
          accentBorder="border-slate-200/80"
          progressBar="bg-gradient-to-r from-slate-400 via-blue-400 to-indigo-500"
          statLabel="Streak"
          statValue={streak}
        />

        {/* Game Area */}
        <div className="w-full flex-1 relative flex flex-col md:flex-row items-center justify-center gap-12">
          
          {problem && (
            <>
              {/* Tower Building Area */}
              <div className="flex-1 flex flex-col items-center justify-end h-full min-h-[400px] relative">
                
                {/* Target Number Cloud */}
                <div className="absolute top-0 licensed-overlay-card p-6 text-center z-20">
                  <h3 className="text-xl text-slate-300 font-bold mb-2">Build a tower for</h3>
                  <div className="text-6xl font-black text-lime-400 drop-shadow-lg">{problem.target}</div>
                </div>

                {/* The Tower */}
                <motion.div 
                  className="flex flex-col-reverse items-center gap-1 z-10 w-48"
                  animate={shake ? { x: [-10, 10, -10, 10, 0], rotate: [-5, 5, -5, 5, 0] } : {}}
                  transition={{ duration: 0.5 }}
                >
                  {/* Base */}
                  <div className="w-64 h-8 licensed-panel-plank rounded-t-xl flex items-center justify-center">
                    <Castle className="w-6 h-6 text-slate-400" />
                  </div>
                  
                  {/* Blocks */}
                  <AnimatePresence>
                    {tower.map((num, i) => (
                      <motion.div
                        key={`${num}-${i}`}
                        initial={{ y: -200, opacity: 0, scale: 0.5 }}
                        animate={{ y: 0, opacity: 1, scale: 1 }}
                        exit={{ y: 200, opacity: 0, rotate: Math.random() * 90 - 45 }}
                        transition={{ type: 'spring', bounce: 0.5 }}
                        className="w-full h-16 rounded-lg flex items-center justify-center licensed-answer-button"
                      >
                        <span className="text-3xl font-black text-lime-950">{num}</span>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </motion.div>
              </div>

              {/* Block Selection Grid */}
              <div className="flex-1 licensed-board-frame p-8 w-full max-w-md">
                <h3 className="text-2xl text-slate-300 font-bold mb-6 text-center">Select the factors!</h3>
                <div className="grid grid-cols-3 gap-4">
                  {problem.options.map((opt, i) => {
                    const isSelected = tower.includes(opt);
                    return (
                      <button
                        key={i}
                        onClick={() => handleSelect(opt)}
                        disabled={isSelected || !!feedback}
                        className={`
                          relative aspect-square rounded-2xl border-4 shadow-lg flex items-center justify-center transition-all
                          ${isSelected 
                            ? 'bg-slate-700 border-slate-600 opacity-50 scale-95' 
                            : 'bg-slate-600 border-slate-500 hover:bg-slate-500 hover:-translate-y-1 hover:shadow-xl active:translate-y-1 active:shadow-sm'}
                        `}
                      >
                        <span className={`text-3xl font-black ${isSelected ? 'text-slate-500' : 'text-white'}`}>
                          {opt}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </>
          )}

          {/* Feedback Overlay */}
          <AnimatePresence>
            {feedback === 'incorrect' && (
              <motion.div 
                initial={{ opacity: 0, scale: 0.5 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 1.5 }}
                className={`absolute inset-0 flex items-center justify-center z-30 pointer-events-none`}
              >
                <div className="px-12 py-6 rounded-full backdrop-blur-md border-4 bg-red-500/20 border-red-400">
                  <span className="text-6xl font-black drop-shadow-lg text-red-500">
                    TIMBER!
                  </span>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

        </div>

        <GameActionDock
          onBack={onBack}
          accentClass="text-slate-700"
        />

        {/* Game Over / Victory Modals */}
        <AnimatePresence>
        {(isGameOver || isVictory) && (
          <motion.div 
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md"
          >
            <div className="licensed-overlay-card p-12 flex flex-col items-center gap-8 max-w-md w-full">
              <div className={`text-5xl font-black ${isVictory ? 'text-lime-400' : 'text-red-500'} drop-shadow-md text-center`}>
                {isVictory ? 'MASTER BUILDER!' : 'RUINS!'}
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
                      <Star className={`w-16 h-16 ${s <= (score >= targetScore * 2 ? 3 : score >= targetScore * 1.5 ? 2 : 1) ? 'fill-yellow-400 text-yellow-400' : 'text-slate-600'}`} />
                    </motion.div>
                  ))}
                </div>
              )}

              <div className="text-center">
                <div className="text-slate-400 font-black uppercase tracking-widest text-sm">Final Score</div>
                <div className="text-6xl font-black text-white drop-shadow-sm">{score}</div>
              </div>

              <button 
                onClick={onBack}
                className="w-full py-5 text-slate-900 text-2xl font-black rounded-2xl transition-all licensed-submit-button"
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

export default TowerOfFactorsGame;
