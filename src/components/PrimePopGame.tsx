import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import confetti from 'canvas-confetti';
import { AvatarData } from '../types';
import { AVATARS } from '../constants';
import GameplayHUD from './GameplayHUD';
import GameActionDock from './GameActionDock';
import { Home, HelpCircle, Star, Timer, Crosshair } from './GameIcons';

interface PrimePopGameProps {
  levelId: number;
  avatarId: string;
  onVictory: (stars: number, score: number) => void;
  onGameOver: (score: number) => void;
  onBack: () => void;
}

interface Bubble {
  id: string;
  number: number;
  isPrime: boolean;
  x: number; // percentage 0-100
  speed: number;
  isPopped: boolean;
}

const isPrime = (num: number) => {
  if (num <= 1) return false;
  if (num <= 3) return true;
  if (num % 2 === 0 || num % 3 === 0) return false;
  let i = 5;
  while (i * i <= num) {
    if (num % i === 0 || num % (i + 2) === 0) return false;
    i += 6;
  }
  return true;
};

const PrimePopGame: React.FC<PrimePopGameProps> = ({ 
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
  
  const [bubbles, setBubbles] = useState<Bubble[]>([]);
  const [combo, setCombo] = useState(0);
  const [crosshairPos, setCrosshairPos] = useState({ x: 50, y: 50 });
  const gameAreaRef = useRef<HTMLDivElement>(null);

  const avatar = AVATARS.find(a => a.id === avatarId) || AVATARS[0];
  const targetScore = 1000 + (levelId * 500);

  const spawnBubble = useCallback(() => {
    if (isGameOver || isVictory) return;

    const maxNum = levelId === 1 ? 30 : levelId === 2 ? 50 : 100;
    const minNum = 2;
    let num = Math.floor(Math.random() * (maxNum - minNum + 1)) + minNum;
    
    // SATs tricky composites
    const trickyComposites = [51, 57, 87, 91, 39, 69, 93].filter(n => n <= maxNum);
    
    // 40% chance of prime, 20% chance of tricky composite, 40% chance of random
    const rand = Math.random();
    let finalNum = num;
    
    if (rand < 0.4) {
      const primes = [2, 3, 5, 7, 11, 13, 17, 19, 23, 29, 31, 37, 41, 43, 47, 53, 59, 61, 67, 71, 73, 79, 83, 89, 97].filter(n => n <= maxNum);
      finalNum = primes[Math.floor(Math.random() * primes.length)] || num;
    } else if (rand < 0.6 && trickyComposites.length > 0) {
      finalNum = trickyComposites[Math.floor(Math.random() * trickyComposites.length)];
    }

    const newBubble: Bubble = {
      id: Math.random().toString(36).substr(2, 9),
      number: finalNum,
      isPrime: isPrime(finalNum),
      x: 10 + Math.random() * 80, // 10% to 90% width
      speed: 4 + Math.random() * 4 + (levelId * 0.5), // seconds to reach top
      isPopped: false
    };

    setBubbles(prev => [...prev, newBubble]);
  }, [levelId, isGameOver, isVictory]);

  useEffect(() => {
    setTimeLeft(60 + levelId * 10);
    setScore(0);
    setIsGameOver(false);
    setIsVictory(false);
    setBubbles([]);
    setCombo(0);
  }, [levelId]);

  useEffect(() => {
    let spawnTimer: NodeJS.Timeout;
    if (!isGameOver && !isVictory) {
      spawnTimer = setInterval(spawnBubble, Math.max(800 - (levelId * 50), 400));
    }
    return () => clearInterval(spawnTimer);
  }, [spawnBubble, isGameOver, isVictory, levelId]);

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

  // Cleanup bubbles that reached the top
  useEffect(() => {
    const cleanupTimer = setInterval(() => {
      setBubbles(prev => prev.filter(b => !b.isPopped));
    }, 5000);
    return () => clearInterval(cleanupTimer);
  }, []);

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

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!gameAreaRef.current) return;
    const rect = gameAreaRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    setCrosshairPos({ x, y });
  };

  const popBubble = (id: string, isPrimeBubble: boolean, e: React.MouseEvent) => {
    e.stopPropagation();
    if (isGameOver || isVictory) return;

    setBubbles(prev => prev.map(b => b.id === id ? { ...b, isPopped: true } : b));

    if (isPrimeBubble) {
      const comboMultiplier = 1 + (combo * 0.1);
      const pointsEarned = Math.round(75 * comboMultiplier);
      setScore(prev => prev + pointsEarned);
      setCombo(prev => prev + 1);
      
      confetti({
        particleCount: 30,
        spread: 50,
        origin: { 
          x: e.clientX / window.innerWidth, 
          y: e.clientY / window.innerHeight 
        },
        colors: ['#34d399', '#10b981', '#059669']
      });
    } else {
      setScore(prev => Math.max(0, prev - 50));
      setCombo(0);
      
      confetti({
        particleCount: 20,
        spread: 40,
        origin: { 
          x: e.clientX / window.innerWidth, 
          y: e.clientY / window.innerHeight 
        },
        colors: ['#ef4444', '#b91c1c']
      });
    }
  };

  const progress = Math.min((score / targetScore) * 100, 100);

  return (
    <div className="h-full w-full flex flex-col items-center p-2 md:p-4 relative overflow-hidden licensed-playfield-bg cursor-none">
      {/* Background Grid */}
      <div className="absolute inset-0 opacity-20 pointer-events-none licensed-grid-backdrop" />

      <div className="z-10 w-full max-w-5xl flex h-full min-h-0 flex-1 flex-col items-center gap-3 md:gap-6">
        <GameplayHUD
          title="Prime Pop"
          avatar={avatar}
          score={score}
          targetScore={targetScore}
          timeLeft={timeLeft}
          progress={progress}
          accentText="text-emerald-900"
          accentSoftBg="bg-emerald-100/80"
          accentBorder="border-emerald-200/80"
          progressBar="bg-gradient-to-r from-emerald-400 via-teal-400 to-cyan-400"
          statLabel="Combo"
          statValue={combo}
        />

        {/* Game Area */}
        <div 
          ref={gameAreaRef}
          onMouseMove={handleMouseMove}
          className="w-full flex-1 min-h-0 relative licensed-board-frame overflow-hidden"
        >
          {/* Custom Crosshair */}
          <div 
            className="absolute w-12 h-12 pointer-events-none z-50 -translate-x-1/2 -translate-y-1/2 text-cyan-400 opacity-80"
            style={{ left: `${crosshairPos.x}%`, top: `${crosshairPos.y}%` }}
          >
            <Crosshair className="w-full h-full" />
          </div>

          <AnimatePresence>
            {bubbles.map(bubble => !bubble.isPopped && (
              <motion.div
                key={bubble.id}
                initial={{ y: '100%', x: `${bubble.x}%`, opacity: 0, scale: 0.5 }}
                animate={{ y: '-100%', opacity: 1, scale: 1 }}
                exit={{ scale: 1.5, opacity: 0 }}
                transition={{ 
                  y: { duration: bubble.speed, ease: 'linear' },
                  opacity: { duration: 0.2 },
                  scale: { duration: 0.2 }
                }}
                onMouseDown={(e) => popBubble(bubble.id, bubble.isPrime, e)}
                className="absolute flex h-16 w-16 items-center justify-center rounded-full border border-white/30 backdrop-blur-md cursor-none shadow-[inset_0_-10px_20px_rgba(0,0,0,0.2),_0_0_15px_rgba(255,255,255,0.2)] md:h-20 md:w-20"
                style={{
                  background: 'radial-gradient(circle at 30% 30%, rgba(255,255,255,0.8), rgba(255,255,255,0.2) 20%, rgba(255,255,255,0.1) 60%, rgba(255,255,255,0.4))',
                  left: `${bubble.x}%`,
                  bottom: '-10%'
                }}
              >
                <span className="text-3xl font-black text-white drop-shadow-md pointer-events-none">
                  {bubble.number}
                </span>
                
                {/* Bubble reflection */}
                <div className="absolute top-[15%] left-[20%] w-[30%] h-[20%] bg-white/60 rounded-full rotate-[-45deg] blur-[1px] pointer-events-none" />
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        <GameActionDock
          onBack={onBack}
          accentClass="text-emerald-700"
        />

        {/* Game Over / Victory Modals */}
        <AnimatePresence>
        {(isGameOver || isVictory) && (
          <motion.div 
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md cursor-default"
          >
            <div className="app-modal-panel licensed-overlay-card w-full max-w-md flex flex-col items-center gap-5 p-6 md:gap-8 md:p-12">
              <div className={`text-5xl font-black ${isVictory ? 'text-emerald-400' : 'text-red-500'} drop-shadow-md text-center`}>
                {isVictory ? 'PRIME MASTER!' : 'OUT OF TIME!'}
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

export default PrimePopGame;
