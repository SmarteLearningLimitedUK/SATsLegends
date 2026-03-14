import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import confetti from 'canvas-confetti';
import { AvatarData } from '../types';
import { AVATARS } from '../constants';
import GameplayHUD from './GameplayHUD';
import GameActionDock from './GameActionDock';
import { Home, HelpCircle, Star, Timer, Key, Lock, Unlock } from './GameIcons';

interface DataDungeonGameProps {
  levelId: number;
  avatarId: string;
  onVictory: (stars: number, score: number) => void;
  onGameOver: (score: number) => void;
  onBack: () => void;
}

type PuzzleType = 'mean' | 'median' | 'mode' | 'range' | 'barchart';

interface Puzzle {
  id: string;
  type: PuzzleType;
  question: string;
  options: number[];
  answer: number;
  data: number[];
  chartData?: { label: string; value: number; color: string }[];
}

const generatePuzzle = (levelId: number): Puzzle => {
  const types: PuzzleType[] = ['mean', 'median', 'mode', 'range', 'barchart'];
  // Higher levels unlock more complex types
  const availableTypes = types.slice(0, Math.min(types.length, 2 + levelId));
  const type = availableTypes[Math.floor(Math.random() * availableTypes.length)];

  let data: number[] = [];
  let answer = 0;
  let question = '';
  let chartData: { label: string; value: number; color: string }[] = [];

  const dataSize = 5 + Math.floor(levelId / 2);
  const maxVal = 10 + levelId * 5;

  if (type === 'barchart') {
    const colors = ['#ef4444', '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6'];
    const labels = ['Red', 'Blue', 'Green', 'Gold', 'Purple'];
    const numBars = Math.min(3 + Math.floor(levelId / 2), 5);
    
    for (let i = 0; i < numBars; i++) {
      chartData.push({
        label: labels[i],
        value: Math.floor(Math.random() * maxVal) + 1,
        color: colors[i]
      });
    }
    
    const targetBar = chartData[Math.floor(Math.random() * chartData.length)];
    question = `How many ${targetBar.label} gems were found?`;
    answer = targetBar.value;
  } else {
    // Generate array of numbers
    for (let i = 0; i < dataSize; i++) {
      data.push(Math.floor(Math.random() * maxVal) + 1);
    }

    if (type === 'mode') {
      // Ensure there is a mode
      const modeVal = Math.floor(Math.random() * maxVal) + 1;
      data[0] = modeVal;
      data[1] = modeVal;
      if (levelId > 2) data[2] = modeVal;
    }

    // Shuffle
    data.sort(() => Math.random() - 0.5);

    switch (type) {
      case 'mean':
        // Adjust data to ensure integer mean
        const sum = data.reduce((a, b) => a + b, 0);
        const remainder = sum % dataSize;
        if (remainder !== 0) {
          data[0] += (dataSize - remainder);
        }
        answer = data.reduce((a, b) => a + b, 0) / dataSize;
        question = `What is the MEAN (average) of these numbers?`;
        break;
      case 'median':
        const sorted = [...data].sort((a, b) => a - b);
        if (dataSize % 2 === 0) {
          // Ensure integer median
          if ((sorted[dataSize/2 - 1] + sorted[dataSize/2]) % 2 !== 0) {
            sorted[dataSize/2] += 1;
          }
          answer = (sorted[dataSize/2 - 1] + sorted[dataSize/2]) / 2;
        } else {
          answer = sorted[Math.floor(dataSize / 2)];
        }
        data = sorted.sort(() => Math.random() - 0.5); // reshuffle for display
        question = `What is the MEDIAN (middle) of these numbers?`;
        break;
      case 'mode':
        const counts: Record<number, number> = {};
        let maxCount = 0;
        data.forEach(n => {
          counts[n] = (counts[n] || 0) + 1;
          if (counts[n] > maxCount) {
            maxCount = counts[n];
            answer = n;
          }
        });
        question = `What is the MODE (most common) of these numbers?`;
        break;
      case 'range':
        const max = Math.max(...data);
        const min = Math.min(...data);
        answer = max - min;
        question = `What is the RANGE (difference between highest and lowest) of these numbers?`;
        break;
    }
  }

  // Generate options
  const options = new Set<number>([answer]);
  while (options.size < 4) {
    let offset = Math.floor(Math.random() * 10) - 5;
    if (offset === 0) offset = 1;
    let wrongAnswer = answer + offset;
    if (wrongAnswer >= 0) options.add(wrongAnswer);
  }

  return {
    id: Math.random().toString(36).substr(2, 9),
    type,
    question,
    options: Array.from(options).sort(() => Math.random() - 0.5),
    answer,
    data,
    chartData
  };
};

const DataDungeonGame: React.FC<DataDungeonGameProps> = ({ 
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
  
  const [puzzle, setPuzzle] = useState<Puzzle | null>(null);
  const [streak, setStreak] = useState(0);
  const [doorState, setDoorState] = useState<'locked' | 'opening' | 'open'>('locked');
  const [feedback, setFeedback] = useState<'correct' | 'incorrect' | null>(null);

  const avatar = AVATARS.find(a => a.id === avatarId) || AVATARS[0];
  const targetScore = 1000 + (levelId * 300);

  useEffect(() => {
    setTimeLeft(90 + levelId * 15);
    setScore(0);
    setIsGameOver(false);
    setIsVictory(false);
    setStreak(0);
    setPuzzle(generatePuzzle(levelId));
  }, [levelId]);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (timeLeft > 0 && !isGameOver && !isVictory && doorState === 'locked') {
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
  }, [timeLeft, isGameOver, isVictory, doorState]);

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

  const handleAnswer = (selectedAnswer: number) => {
    if (doorState !== 'locked' || !puzzle) return;

    if (selectedAnswer === puzzle.answer) {
      setFeedback('correct');
      setDoorState('opening');
      
      const points = 150 + (streak * 30);
      setScore(prev => prev + points);
      setStreak(prev => prev + 1);

      setTimeout(() => {
        setDoorState('open');
        setTimeout(() => {
          setPuzzle(generatePuzzle(levelId));
          setDoorState('locked');
          setFeedback(null);
        }, 800);
      }, 1000);

    } else {
      setFeedback('incorrect');
      setStreak(0);
      setScore(prev => Math.max(0, prev - 50));
      
      setTimeout(() => {
        setFeedback(null);
      }, 1000);
    }
  };

  const progress = Math.min((score / targetScore) * 100, 100);

  return (
    <div className="h-full w-full flex flex-col items-center p-2 md:p-4 relative overflow-hidden bg-stone-900 font-sans">
      {/* Dungeon Background */}
      <div className="absolute inset-0 opacity-40 pointer-events-none" style={{ 
        backgroundImage: `
          linear-gradient(to right, #1c1917 2px, transparent 2px),
          linear-gradient(to bottom, #1c1917 2px, transparent 2px)
        `, 
        backgroundSize: '60px 60px' 
      }} />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,transparent_20%,#0c0a09_100%)] pointer-events-none" />

      <div className="z-10 w-full max-w-5xl flex flex-col items-center gap-3 md:gap-6 h-full flex-1 min-h-0">
        <GameplayHUD
          title="Data Dungeon"
          avatar={avatar}
          score={score}
          targetScore={targetScore}
          timeLeft={timeLeft}
          progress={progress}
          accentText="text-amber-500"
          accentSoftBg="bg-stone-900/80"
          accentBorder="border-stone-700/90"
          progressBar="bg-gradient-to-r from-amber-600 via-yellow-500 to-yellow-300"
          statLabel="Streak"
          statValue={streak}
        />

        {/* Game Area */}
        <div className="relative flex w-full flex-1 min-h-0 flex-col items-center justify-center perspective-1000">
          
          {/* The Door */}
          <div className="relative flex w-full max-w-2xl flex-1 min-h-[260px] items-end justify-center md:min-h-[420px]">
            {/* Door Frame */}
            <div className="absolute inset-0 border-[8px] md:border-[16px] border-b-0 border-stone-800 rounded-t-[2.5rem] md:rounded-t-[4rem] shadow-[inset_0_0_50px_rgba(0,0,0,0.8)] bg-black overflow-hidden flex justify-center">
              
              {/* Left Door Panel */}
              <motion.div 
                className="absolute left-0 top-0 bottom-0 w-1/2 bg-stone-700 border-r-4 border-stone-900 flex items-center justify-end pr-4"
                animate={{ x: doorState === 'open' ? '-100%' : 0 }}
                transition={{ duration: 0.8, ease: "easeInOut" }}
                style={{ backgroundImage: 'linear-gradient(45deg, #444 25%, transparent 25%, transparent 75%, #444 75%, #444), linear-gradient(45deg, #444 25%, transparent 25%, transparent 75%, #444 75%, #444)', backgroundSize: '20px 20px', backgroundPosition: '0 0, 10px 10px' }}
              >
                {doorState === 'locked' ? <Lock className="w-8 h-8 text-stone-900" /> : <Unlock className="w-8 h-8 text-stone-900" />}
              </motion.div>
              
              {/* Right Door Panel */}
              <motion.div 
                className="absolute right-0 top-0 bottom-0 w-1/2 bg-stone-700 border-l-4 border-stone-900 flex items-center justify-start pl-4"
                animate={{ x: doorState === 'open' ? '100%' : 0 }}
                transition={{ duration: 0.8, ease: "easeInOut" }}
                style={{ backgroundImage: 'linear-gradient(45deg, #444 25%, transparent 25%, transparent 75%, #444 75%, #444), linear-gradient(45deg, #444 25%, transparent 25%, transparent 75%, #444 75%, #444)', backgroundSize: '20px 20px', backgroundPosition: '0 0, 10px 10px' }}
              >
                {doorState === 'locked' ? <Lock className="w-8 h-8 text-stone-900" /> : <Unlock className="w-8 h-8 text-stone-900" />}
              </motion.div>

              {/* Puzzle Tablet (Only visible when door is locked/opening) */}
              <AnimatePresence>
                {doorState !== 'open' && puzzle && (
                  <motion.div 
                    initial={{ opacity: 0, y: 50 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    className="absolute top-3 md:top-8 z-20 flex w-[86%] flex-col items-center gap-3 p-3 md:w-[80%] md:gap-4 md:p-6 licensed-game-card"
                  >
                    <h3 className="text-sm md:text-xl font-black text-stone-800 text-center">
                      {puzzle.question}
                    </h3>

                    {/* Data Visualization */}
                    <div className="flex min-h-[84px] w-full items-center justify-center rounded-lg border-2 border-stone-300 bg-stone-100 p-2 md:min-h-[120px] md:p-4">
                      {puzzle.type === 'barchart' && puzzle.chartData ? (
                        <div className="flex h-24 w-full items-end justify-around gap-1 px-2 md:h-32 md:gap-2 md:px-4">
                          {puzzle.chartData.map((bar, i) => (
                            <div key={i} className="flex flex-col items-center gap-2 flex-1">
                              <div className="w-full relative flex items-end justify-center h-24 bg-stone-200 rounded-t-md overflow-hidden">
                                <motion.div 
                                  initial={{ height: 0 }}
                                  animate={{ height: `${(bar.value / 25) * 100}%` }}
                                  className="w-full absolute bottom-0"
                                  style={{ backgroundColor: bar.color }}
                                />
                              </div>
                              <span className="text-xs font-bold text-stone-600">{bar.label}</span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="flex flex-wrap justify-center gap-3">
                          {puzzle.data.map((num, i) => (
                            <div key={i} className="flex h-9 w-9 md:h-12 md:w-12 items-center justify-center rounded-lg border-2 border-stone-600 bg-stone-800 text-sm md:text-xl font-black text-amber-400 shadow-inner">
                              {num}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Feedback Overlay */}
                    {feedback && (
                      <div className={`absolute inset-0 flex items-center justify-center rounded-xl backdrop-blur-sm ${feedback === 'correct' ? 'bg-green-500/20' : 'bg-red-500/20'}`}>
                        <span className={`text-2xl md:text-4xl font-black drop-shadow-lg ${feedback === 'correct' ? 'text-green-500' : 'text-red-500'}`}>
                          {feedback === 'correct' ? 'CORRECT!' : 'INCORRECT!'}
                        </span>
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>

            </div>
          </div>

          {/* Answer Runes */}
          <div className="z-20 mt-3 md:mt-8 grid w-full max-w-2xl grid-cols-2 gap-2 md:grid-cols-4 md:gap-4">
            {puzzle?.options.map((opt, i) => (
              <button
                key={i}
                onClick={() => handleAnswer(opt)}
                disabled={doorState !== 'locked'}
                className="relative group p-3 md:p-4 rounded-[1rem] md:rounded-2xl transition-all disabled:opacity-50 disabled:cursor-not-allowed licensed-answer-button"
              >
                <div className="absolute inset-0 bg-gradient-to-b from-white/10 to-transparent rounded-xl pointer-events-none" />
                <span className="text-xl md:text-3xl font-black text-amber-500 drop-shadow-[0_0_8px_rgba(245,158,11,0.5)] group-hover:text-amber-400">
                  {opt}
                </span>
              </button>
            ))}
          </div>

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
            <div className="app-modal-panel w-full max-w-md rounded-[2rem] border-4 border-stone-600 bg-stone-800 p-6 shadow-2xl flex flex-col items-center gap-5 md:rounded-[3rem] md:border-8 md:gap-8 md:p-12">
              <div className={`text-5xl font-black ${isVictory ? 'text-amber-400' : 'text-red-500'} drop-shadow-md text-center`}>
                {isVictory ? 'DUNGEON CLEARED!' : 'TRAPPED!'}
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
                      <Star className={`w-16 h-16 ${s <= (score >= targetScore * 2 ? 3 : score >= targetScore * 1.5 ? 2 : 1) ? 'fill-amber-400 text-amber-400' : 'text-stone-600'}`} />
                    </motion.div>
                  ))}
                </div>
              )}

              <div className="text-center">
                <div className="text-stone-400 font-black uppercase tracking-widest text-sm">Final Score</div>
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

export default DataDungeonGame;
