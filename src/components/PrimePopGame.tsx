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
  lane: number;
  createdAt: number;
  speed: number;
  isPopped: boolean;
  size: number;
  palette: {
    background: string;
    ring: string;
    glow: string;
    sparkle: string;
    text: string;
  };
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

const BUBBLE_LANES = [12, 24, 36, 48, 60, 72, 84];

const PRIME_PALETTES = [
  {
    background: 'radial-gradient(circle at 30% 28%, rgba(255,255,255,0.96), rgba(125,211,252,0.92) 18%, rgba(56,189,248,0.78) 45%, rgba(14,165,233,0.7) 68%, rgba(8,47,73,0.74) 100%)',
    ring: 'rgba(186,230,253,0.75)',
    glow: '0 0 26px rgba(56,189,248,0.35)',
    sparkle: 'rgba(255,255,255,0.7)',
    text: '#effbff',
  },
  {
    background: 'radial-gradient(circle at 30% 28%, rgba(255,255,255,0.96), rgba(134,239,172,0.92) 18%, rgba(52,211,153,0.8) 45%, rgba(16,185,129,0.72) 68%, rgba(6,78,59,0.8) 100%)',
    ring: 'rgba(209,250,229,0.74)',
    glow: '0 0 26px rgba(52,211,153,0.35)',
    sparkle: 'rgba(255,255,255,0.72)',
    text: '#f3fff9',
  },
  {
    background: 'radial-gradient(circle at 30% 28%, rgba(255,255,255,0.97), rgba(196,181,253,0.92) 18%, rgba(167,139,250,0.8) 45%, rgba(139,92,246,0.72) 68%, rgba(76,29,149,0.82) 100%)',
    ring: 'rgba(233,213,255,0.74)',
    glow: '0 0 26px rgba(167,139,250,0.34)',
    sparkle: 'rgba(255,255,255,0.76)',
    text: '#fbf7ff',
  },
];

const COMPOSITE_PALETTES = [
  {
    background: 'radial-gradient(circle at 30% 28%, rgba(255,255,255,0.95), rgba(253,224,71,0.9) 18%, rgba(251,191,36,0.76) 45%, rgba(249,115,22,0.7) 68%, rgba(120,53,15,0.82) 100%)',
    ring: 'rgba(254,240,138,0.72)',
    glow: '0 0 24px rgba(251,191,36,0.34)',
    sparkle: 'rgba(255,247,200,0.72)',
    text: '#fffdf3',
  },
  {
    background: 'radial-gradient(circle at 30% 28%, rgba(255,255,255,0.95), rgba(253,186,116,0.9) 18%, rgba(251,146,60,0.78) 45%, rgba(239,68,68,0.68) 68%, rgba(127,29,29,0.82) 100%)',
    ring: 'rgba(254,215,170,0.72)',
    glow: '0 0 24px rgba(249,115,22,0.32)',
    sparkle: 'rgba(255,242,214,0.72)',
    text: '#fffaf5',
  },
];

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

    const bubbleIsPrime = isPrime(finalNum);
    const palettePool = bubbleIsPrime ? PRIME_PALETTES : COMPOSITE_PALETTES;
    const now = Date.now();
    const laneCooldown = Math.max(1050, 1500 - (levelId * 110));

    setBubbles(prev => {
      const occupiedLanes = new Set(
        prev
          .filter(bubble => !bubble.isPopped && now - bubble.createdAt < laneCooldown)
          .map(bubble => bubble.lane)
      );
      const availableLanes = BUBBLE_LANES.filter(lane => !occupiedLanes.has(lane));
      const lanePool = availableLanes.length > 0 ? availableLanes : BUBBLE_LANES;
      const selectedLane = lanePool[Math.floor(Math.random() * lanePool.length)];
      const laneJitter = (Math.random() * 3.2) - 1.6;
      const palette = palettePool[Math.floor(Math.random() * palettePool.length)];

      const newBubble: Bubble = {
        id: Math.random().toString(36).substr(2, 9),
        number: finalNum,
        isPrime: bubbleIsPrime,
        x: selectedLane + laneJitter,
        lane: selectedLane,
        createdAt: now,
        speed: 4.6 + Math.random() * 2.8 + (levelId * 0.36),
        isPopped: false,
        size: 58 + Math.random() * 18,
        palette,
      };

      return [...prev, newBubble];
    });
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

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!gameAreaRef.current) return;
    const rect = gameAreaRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    setCrosshairPos({ x, y });
  };

  const popBubble = (id: string, isPrimeBubble: boolean, clientX: number, clientY: number) => {
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
          x: clientX / window.innerWidth, 
          y: clientY / window.innerHeight 
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
          x: clientX / window.innerWidth, 
          y: clientY / window.innerHeight 
        },
        colors: ['#ef4444', '#b91c1c']
      });
    }
  };

  const progress = Math.min((score / targetScore) * 100, 100);

  return (
    <div className="h-full w-full flex flex-col items-center p-2 md:p-4 relative overflow-hidden licensed-playfield-bg md:cursor-none">
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute left-[-8%] top-[10%] h-[32%] w-[42%] rounded-full bg-cyan-400/18 blur-3xl" />
        <div className="absolute right-[-10%] top-[20%] h-[40%] w-[44%] rounded-full bg-fuchsia-500/14 blur-3xl" />
        <div className="absolute left-[18%] bottom-[-8%] h-[34%] w-[48%] rounded-full bg-emerald-400/16 blur-3xl" />
        <div className="absolute right-[12%] bottom-[8%] h-[24%] w-[28%] rounded-full bg-amber-300/12 blur-3xl" />
      </div>

      {/* Background Grid */}
      <div className="absolute inset-0 opacity-20 pointer-events-none licensed-grid-backdrop" />

      <div className="z-10 w-full max-w-5xl flex h-full min-h-0 flex-1 flex-col items-center gap-2 md:gap-6">
        <GameplayHUD
          title="Prime Pop"
          avatar={avatar}
          score={score}
          targetScore={targetScore}
          timeLeft={timeLeft}
          progress={progress}
          compact
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
          onPointerMove={handlePointerMove}
          className="w-full flex-1 min-h-0 relative licensed-board-frame overflow-hidden touch-none"
        >
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(34,211,238,0.25),transparent_28%),radial-gradient(circle_at_78%_18%,rgba(192,132,252,0.22),transparent_26%),radial-gradient(circle_at_50%_88%,rgba(74,222,128,0.2),transparent_30%),linear-gradient(180deg,rgba(7,20,45,0.2),rgba(2,6,23,0.55))]" />
          <div className="absolute inset-x-[6%] top-[7%] h-[14%] rounded-full bg-white/8 blur-3xl opacity-70" />
          <div className="absolute inset-x-0 bottom-0 h-[28%] bg-gradient-to-t from-slate-950/30 via-transparent to-transparent" />

          {/* Custom Crosshair */}
          <div 
            className="absolute hidden md:block w-12 h-12 pointer-events-none z-50 -translate-x-1/2 -translate-y-1/2 text-cyan-400 opacity-80"
            style={{ left: `${crosshairPos.x}%`, top: `${crosshairPos.y}%` }}
          >
            <Crosshair className="w-full h-full" />
          </div>

          <AnimatePresence>
            {bubbles.map(bubble => !bubble.isPopped && (
              <motion.div
                key={bubble.id}
                initial={{ bottom: '-22%', opacity: 0, scale: 0.72 }}
                animate={{ bottom: '108%', opacity: [0, 1, 1], scale: [0.72, 1, 1] }}
                exit={{ scale: 1.5, opacity: 0 }}
                transition={{ 
                  bottom: { duration: bubble.speed, ease: 'linear' },
                  opacity: { duration: 0.45, times: [0, 0.1, 1] },
                  scale: { duration: 0.35 }
                }}
                onAnimationComplete={() => {
                  setBubbles(prev => prev.filter(item => item.id !== bubble.id || item.isPopped));
                }}
                onPointerDown={(e) => {
                  e.stopPropagation();
                  popBubble(bubble.id, bubble.isPrime, e.clientX, e.clientY);
                }}
                className="absolute -translate-x-1/2 flex items-center justify-center rounded-full backdrop-blur-md md:cursor-none"
                style={{
                  background: bubble.palette.background,
                  border: `2px solid ${bubble.palette.ring}`,
                  boxShadow: `${bubble.palette.glow}, inset 0 -14px 26px rgba(15,23,42,0.28), inset 0 10px 18px rgba(255,255,255,0.18)`,
                  left: `${bubble.x}%`,
                  width: `${bubble.size}px`,
                  height: `${bubble.size}px`,
                }}
              >
                <div
                  className="absolute inset-[6%] rounded-full opacity-70"
                  style={{
                    border: `1px solid ${bubble.palette.sparkle}`,
                    boxShadow: bubble.isPrime ? `0 0 20px ${bubble.palette.sparkle}` : 'none',
                  }}
                />
                <div
                  className="absolute inset-[16%] rounded-full opacity-55"
                  style={{
                    background: 'radial-gradient(circle at 30% 28%, rgba(255,255,255,0.42), transparent 62%)',
                  }}
                />
                <span
                  className="pointer-events-none text-2xl md:text-3xl font-black drop-shadow-[0_5px_14px_rgba(15,23,42,0.46)]"
                  style={{ color: bubble.palette.text }}
                >
                  {bubble.number}
                </span>
                
                {/* Bubble reflection */}
                <div
                  className="absolute top-[15%] left-[18%] w-[30%] h-[20%] rounded-full rotate-[-45deg] blur-[1px] pointer-events-none"
                  style={{ background: bubble.palette.sparkle }}
                />
                {bubble.isPrime && (
                  <motion.div
                    className="absolute inset-[-10%] rounded-full pointer-events-none"
                    animate={{ scale: [0.96, 1.08, 0.96], opacity: [0.22, 0.42, 0.22] }}
                    transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
                    style={{ border: `2px solid ${bubble.palette.ring}` }}
                  />
                )}
              </motion.div>
            ))}
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
                className="ui-button-primary licensed-submit-button w-full py-5 text-white text-2xl font-black transition-all"
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
