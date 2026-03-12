import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import confetti from 'canvas-confetti';
import { AvatarData } from '../types';
import { AVATARS } from '../constants';
import GameplayHUD from './GameplayHUD';
import GameActionDock from './GameActionDock';
import { Home, HelpCircle, Star, Timer, Droplets, Anchor } from './GameIcons';

interface RatioRapidsGameProps {
  levelId: number;
  avatarId: string;
  onVictory: (stars: number, score: number) => void;
  onGameOver: (score: number) => void;
  onBack: () => void;
}

interface RatioProblem {
  ratioA: number;
  ratioB: number;
  givenA: number | null;
  givenB: number | null;
  targetA: number;
  targetB: number;
  itemA: string;
  itemB: string;
  colorA: string;
  colorB: string;
}

const ITEMS = [
  { name: 'Red Gems', color: 'bg-red-500' },
  { name: 'Blue Gems', color: 'bg-blue-500' },
  { name: 'Gold Coins', color: 'bg-yellow-400' },
  { name: 'Silver Coins', color: 'bg-slate-300' },
  { name: 'Green Potions', color: 'bg-green-500' },
  { name: 'Purple Potions', color: 'bg-purple-500' },
];

const RatioRapidsGame: React.FC<RatioRapidsGameProps> = ({ 
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
  
  const [problem, setProblem] = useState<RatioProblem | null>(null);
  const [playerA, setPlayerA] = useState(0);
  const [playerB, setPlayerB] = useState(0);
  const [streak, setStreak] = useState(0);
  const [feedback, setFeedback] = useState<'correct' | 'incorrect' | null>(null);

  const avatar = AVATARS.find(a => a.id === avatarId) || AVATARS[0];
  const targetScore = 800 + (levelId * 200);

  const generateProblem = useCallback(() => {
    const maxMultiplier = 2 + levelId * 2;
    const ratioA = Math.floor(Math.random() * 5) + 1;
    let ratioB = Math.floor(Math.random() * 5) + 1;
    while (ratioA === ratioB) {
      ratioB = Math.floor(Math.random() * 5) + 1;
    }

    const multiplier = Math.floor(Math.random() * maxMultiplier) + 2;
    const targetA = ratioA * multiplier;
    const targetB = ratioB * multiplier;

    const itemIdx1 = Math.floor(Math.random() * ITEMS.length);
    let itemIdx2 = Math.floor(Math.random() * ITEMS.length);
    while (itemIdx1 === itemIdx2) itemIdx2 = Math.floor(Math.random() * ITEMS.length);

    const isMissingA = Math.random() > 0.5;

    setProblem({
      ratioA,
      ratioB,
      givenA: isMissingA ? null : targetA,
      givenB: isMissingA ? targetB : null,
      targetA,
      targetB,
      itemA: ITEMS[itemIdx1].name,
      itemB: ITEMS[itemIdx2].name,
      colorA: ITEMS[itemIdx1].color,
      colorB: ITEMS[itemIdx2].color,
    });

    setPlayerA(isMissingA ? 0 : targetA);
    setPlayerB(isMissingA ? targetB : 0);
    setFeedback(null);
  }, [levelId]);

  useEffect(() => {
    setTimeLeft(60 + levelId * 15);
    setScore(0);
    setIsGameOver(false);
    setIsVictory(false);
    setStreak(0);
    generateProblem();
  }, [levelId, generateProblem]);

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

  const handleSubmit = () => {
    if (feedback || isGameOver || isVictory || !problem) return;

    if (playerA === problem.targetA && playerB === problem.targetB) {
      setFeedback('correct');
      const points = 100 + (streak * 20);
      setScore(prev => prev + points);
      setStreak(prev => prev + 1);
      
      confetti({
        particleCount: 50,
        spread: 60,
        origin: { y: 0.5 },
        colors: ['#3b82f6', '#60a5fa']
      });

      setTimeout(generateProblem, 1500);
    } else {
      setFeedback('incorrect');
      setStreak(0);
      setScore(prev => Math.max(0, prev - 30));
      
      setTimeout(() => {
        setFeedback(null);
      }, 1500);
    }
  };

  const progress = Math.min((score / targetScore) * 100, 100);

  return (
    <div className="h-full w-full flex flex-col items-center p-4 relative overflow-y-auto overflow-x-hidden bg-cyan-900 font-sans">
      {/* River Background */}
      <div className="absolute inset-0 opacity-30 pointer-events-none" style={{ 
        backgroundImage: 'radial-gradient(circle at 50% 50%, #0891b2 2px, transparent 2px)', 
        backgroundSize: '40px 40px' 
      }} />
      
      {/* Animated waves */}
      <motion.div 
        className="absolute bottom-0 left-0 right-0 h-32 bg-cyan-500/20 rounded-t-[100%]"
        animate={{ y: [0, -20, 0], scaleX: [1, 1.05, 1] }}
        transition={{ repeat: Infinity, duration: 4, ease: "easeInOut" }}
      />
      <motion.div 
        className="absolute bottom-0 left-0 right-0 h-24 bg-cyan-400/30 rounded-t-[100%]"
        animate={{ y: [0, -15, 0], scaleX: [1.05, 1, 1.05] }}
        transition={{ repeat: Infinity, duration: 3, ease: "easeInOut", delay: 0.5 }}
      />

      <div className="z-10 w-full max-w-5xl flex flex-col items-center gap-6 h-full flex-1">
        <GameplayHUD
          title="Ratio Rapids"
          avatar={avatar}
          score={score}
          targetScore={targetScore}
          timeLeft={timeLeft}
          progress={progress}
          accentText="text-cyan-900"
          accentSoftBg="bg-cyan-100/80"
          accentBorder="border-cyan-200/80"
          progressBar="bg-gradient-to-r from-cyan-400 via-sky-400 to-blue-500"
          statLabel="Streak"
          statValue={streak}
        />

        {/* Game Area */}
        <div className="w-full flex-1 relative flex flex-col items-center justify-center gap-8">
          
          {problem && (
            <>
              {/* Instruction Panel */}
              <div className="bg-cyan-950/80 backdrop-blur-md p-8 rounded-[3rem] border-4 border-cyan-700 shadow-2xl text-center max-w-2xl w-full">
                <h3 className="text-2xl text-cyan-100 font-bold mb-4">
                  The river demands a ratio of:
                </h3>
                <div className="text-4xl font-black text-white flex items-center justify-center gap-4">
                  <span className={problem.colorA.replace('bg-', 'text-')}>{problem.ratioA} {problem.itemA}</span>
                  <span className="text-cyan-500">:</span>
                  <span className={problem.colorB.replace('bg-', 'text-')}>{problem.ratioB} {problem.itemB}</span>
                </div>
              </div>

              {/* Interactive Area */}
              <div className="flex flex-col md:flex-row gap-8 items-center justify-center w-full max-w-4xl">
                
                {/* Item A */}
                <div className="bg-cyan-900/60 p-6 rounded-3xl border-2 border-cyan-700 flex flex-col items-center gap-4 flex-1 w-full">
                  <div className="text-xl font-bold text-cyan-200">{problem.itemA}</div>
                  <div className="flex items-center gap-4">
                    <button 
                      onClick={() => setPlayerA(Math.max(0, playerA - 1))}
                      disabled={problem.givenA !== null || !!feedback}
                      className="w-12 h-12 rounded-full bg-cyan-800 text-white font-black text-2xl hover:bg-cyan-700 disabled:opacity-50"
                    >-</button>
                    <div className={`text-6xl font-black w-24 text-center ${problem.givenA !== null ? 'text-cyan-400' : 'text-white'}`}>
                      {playerA}
                    </div>
                    <button 
                      onClick={() => setPlayerA(playerA + 1)}
                      disabled={problem.givenA !== null || !!feedback}
                      className="w-12 h-12 rounded-full bg-cyan-800 text-white font-black text-2xl hover:bg-cyan-700 disabled:opacity-50"
                    >+</button>
                  </div>
                </div>

                <div className="text-6xl font-black text-cyan-600">:</div>

                {/* Item B */}
                <div className="bg-cyan-900/60 p-6 rounded-3xl border-2 border-cyan-700 flex flex-col items-center gap-4 flex-1 w-full">
                  <div className="text-xl font-bold text-cyan-200">{problem.itemB}</div>
                  <div className="flex items-center gap-4">
                    <button 
                      onClick={() => setPlayerB(Math.max(0, playerB - 1))}
                      disabled={problem.givenB !== null || !!feedback}
                      className="w-12 h-12 rounded-full bg-cyan-800 text-white font-black text-2xl hover:bg-cyan-700 disabled:opacity-50"
                    >-</button>
                    <div className={`text-6xl font-black w-24 text-center ${problem.givenB !== null ? 'text-cyan-400' : 'text-white'}`}>
                      {playerB}
                    </div>
                    <button 
                      onClick={() => setPlayerB(playerB + 1)}
                      disabled={problem.givenB !== null || !!feedback}
                      className="w-12 h-12 rounded-full bg-cyan-800 text-white font-black text-2xl hover:bg-cyan-700 disabled:opacity-50"
                    >+</button>
                  </div>
                </div>

              </div>

              <button
                onClick={handleSubmit}
                disabled={!!feedback || (playerA === 0 && playerB === 0)}
                className="px-12 py-6 bg-blue-500 text-white text-3xl font-black rounded-3xl shadow-[0_8px_0_#2563eb] hover:translate-y-1 hover:shadow-[0_4px_0_#2563eb] active:translate-y-2 active:shadow-none transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-4"
              >
                <Anchor className="w-8 h-8" /> ROW!
              </button>
            </>
          )}

          {/* Feedback Overlay */}
          <AnimatePresence>
            {feedback && (
              <motion.div 
                initial={{ opacity: 0, scale: 0.5 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 1.5 }}
                className={`absolute inset-0 flex items-center justify-center z-20 pointer-events-none`}
              >
                <div className={`px-12 py-6 rounded-full backdrop-blur-md border-4 ${feedback === 'correct' ? 'bg-green-500/20 border-green-400' : 'bg-red-500/20 border-red-400'}`}>
                  <span className={`text-6xl font-black drop-shadow-lg ${feedback === 'correct' ? 'text-green-400' : 'text-red-500'}`}>
                    {feedback === 'correct' ? 'SAFE PASSAGE!' : 'CRASH!'}
                  </span>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

        </div>

        <GameActionDock
          onBack={onBack}
          accentClass="text-cyan-700"
        />

        {/* Game Over / Victory Modals */}
        <AnimatePresence>
        {(isGameOver || isVictory) && (
          <motion.div 
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md"
          >
            <div className="bg-cyan-950 p-12 rounded-[3rem] border-8 border-cyan-700 shadow-2xl flex flex-col items-center gap-8 max-w-md w-full">
              <div className={`text-5xl font-black ${isVictory ? 'text-cyan-400' : 'text-red-500'} drop-shadow-md text-center`}>
                {isVictory ? 'RIVER MASTER!' : 'SUNK!'}
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
                      <Star className={`w-16 h-16 ${s <= (score >= targetScore * 2 ? 3 : score >= targetScore * 1.5 ? 2 : 1) ? 'fill-yellow-400 text-yellow-400' : 'text-cyan-800'}`} />
                    </motion.div>
                  ))}
                </div>
              )}

              <div className="text-center">
                <div className="text-cyan-600 font-black uppercase tracking-widest text-sm">Final Score</div>
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

export default RatioRapidsGame;
