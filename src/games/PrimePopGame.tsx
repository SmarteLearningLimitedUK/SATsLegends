import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import confetti from 'canvas-confetti';
import { AvatarData } from '../types';
import { AVATARS } from '../constants';
import GameplayHUD from '../components/GameplayHUD';
import GameActionDock from '../components/GameActionDock';
import { Home, HelpCircle, Star, Timer, Crosshair } from '../components/GameIcons';

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
  expiresAt: number;
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

const BUBBLE_LANES = [10, 22, 34, 46, 58, 70, 82, 90];

const PRIME_PALETTES = [
  {
    background: 'radial-gradient(circle at 30% 28%, rgba(255,255,255,0.98), rgba(255,243,163,0.95) 20%, rgba(255,224,53,0.92) 48%, rgba(255,193,7,0.88) 72%, rgba(245,158,11,0.86) 100%)',
    ring: 'rgba(255,211,64,0.9)',
    glow: '0 0 26px rgba(251,191,36,0.42)',
    sparkle: 'rgba(255,255,255,0.9)',
    text: '#7a3e00',
  },
  {
    background: 'radial-gradient(circle at 30% 28%, rgba(255,255,255,0.98), rgba(255,239,140,0.95) 20%, rgba(255,220,40,0.9) 48%, rgba(255,183,0,0.86) 72%, rgba(217,119,6,0.84) 100%)',
    ring: 'rgba(255,224,130,0.92)',
    glow: '0 0 24px rgba(250,204,21,0.44)',
    sparkle: 'rgba(255,255,255,0.88)',
    text: '#7a3e00',
  },
  {
    background: 'radial-gradient(circle at 30% 28%, rgba(255,255,255,0.99), rgba(255,245,180,0.95) 18%, rgba(255,223,66,0.92) 46%, rgba(251,191,36,0.88) 70%, rgba(234,88,12,0.82) 100%)',
    ring: 'rgba(255,232,160,0.92)',
    glow: '0 0 24px rgba(245,158,11,0.42)',
    sparkle: 'rgba(255,255,255,0.9)',
    text: '#6b3300',
  },
];

const COMPOSITE_PALETTES = [
  {
    background: 'radial-gradient(circle at 30% 28%, rgba(255,255,255,0.96), rgba(191,232,255,0.95) 20%, rgba(125,211,252,0.9) 48%, rgba(59,130,246,0.86) 72%, rgba(30,64,175,0.84) 100%)',
    ring: 'rgba(147,197,253,0.88)',
    glow: '0 0 22px rgba(56,189,248,0.34)',
    sparkle: 'rgba(224,242,254,0.86)',
    text: '#f8fafc',
  },
  {
    background: 'radial-gradient(circle at 30% 28%, rgba(255,255,255,0.96), rgba(186,230,253,0.94) 18%, rgba(96,165,250,0.9) 46%, rgba(37,99,235,0.86) 72%, rgba(30,58,138,0.82) 100%)',
    ring: 'rgba(191,219,254,0.86)',
    glow: '0 0 22px rgba(59,130,246,0.34)',
    sparkle: 'rgba(239,246,255,0.82)',
    text: '#f8fafc',
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
  const bubbleNodeRefs = useRef<Record<string, HTMLDivElement | null>>({});

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
      const laneJitter = (Math.random() * 2.4) - 1.2;
      const palette = palettePool[Math.floor(Math.random() * palettePool.length)];
      const bubbleSpeed = 4.6 + Math.random() * 2.8 + (levelId * 0.36);

      const newBubble: Bubble = {
        id: Math.random().toString(36).substr(2, 9),
        number: finalNum,
        isPrime: bubbleIsPrime,
        x: selectedLane + laneJitter,
        lane: selectedLane,
        createdAt: now,
        expiresAt: now + (bubbleSpeed * 1000) + 800,
        speed: bubbleSpeed,
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
    bubbleNodeRefs.current = {};
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

  // Cleanup popped and expired bubbles.
  useEffect(() => {
    const cleanupTimer = setInterval(() => {
      const now = Date.now();
      setBubbles(prev => prev.filter(b => !b.isPopped && b.expiresAt > now));
    }, 220);
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

  const resolveBubbleFromPointer = useCallback((clientX: number, clientY: number) => {
    let nearest: { id: string; isPrime: boolean; distance: number } | null = null;

    for (const bubble of bubbles) {
      if (bubble.isPopped) continue;
      const node = bubbleNodeRefs.current[bubble.id];
      if (!node) continue;
      const rect = node.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) continue;

      const centerX = rect.left + (rect.width / 2);
      const centerY = rect.top + (rect.height / 2);
      const distance = Math.hypot(clientX - centerX, clientY - centerY);
      const forgivingHitRadius = Math.max(rect.width / 2, 28) + 14;

      if (distance > forgivingHitRadius) continue;
      if (!nearest || distance < nearest.distance) {
        nearest = { id: bubble.id, isPrime: bubble.isPrime, distance };
      }
    }

    return nearest;
  }, [bubbles]);

  const handlePlayfieldPointerDown = (clientX: number, clientY: number) => {
    const targetBubble = resolveBubbleFromPointer(clientX, clientY);
    if (!targetBubble) return;
    popBubble(targetBubble.id, targetBubble.isPrime, clientX, clientY);
  };

  const progress = Math.min((score / targetScore) * 100, 100);

  return (
    <div
      className="h-full w-full flex flex-col items-center p-2 md:p-4 relative overflow-hidden md:cursor-none"
      style={{
        background:
          'linear-gradient(180deg, #0f2f6c 0%, #1f4f9f 46%, #2b67b6 100%)',
      }}
    >
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute left-[-12%] top-[6%] h-[38%] w-[48%] rounded-full bg-cyan-200/18 blur-3xl" />
        <div className="absolute left-[16%] top-[18%] h-[34%] w-[44%] rounded-full bg-sky-100/16 blur-3xl" />
        <div className="absolute right-[-8%] top-[12%] h-[42%] w-[46%] rounded-full bg-blue-100/14 blur-3xl" />
        <div className="absolute left-[-8%] bottom-[-18%] h-[52%] w-[66%] rounded-full bg-amber-200/14 blur-3xl" />
        <div className="absolute right-[-6%] bottom-[-12%] h-[48%] w-[58%] rounded-full bg-yellow-100/12 blur-3xl" />
      </div>

      <div className="z-10 w-full max-w-6xl aaa-game-stage flex h-full min-h-0 flex-1 flex-col items-center gap-2 md:gap-5">
        <GameplayHUD
          title="Prime Pop"
          avatar={avatar}
          score={score}
          targetScore={targetScore}
          timeLeft={timeLeft}
          progress={progress}
          compact
          accentText="text-sky-900"
          accentSoftBg="bg-sky-100/80"
          accentBorder="border-sky-200/80"
          progressBar="bg-gradient-to-r from-yellow-400 via-amber-300 to-sky-400"
          statLabel="Combo"
          statValue={combo}
        />

        {/* Game Area */}
        <div 
          ref={gameAreaRef}
          onPointerMove={handlePointerMove}
          onPointerDown={(event) => handlePlayfieldPointerDown(event.clientX, event.clientY)}
          className="w-full flex-1 min-h-[23rem] md:min-h-[31rem] relative licensed-board-frame structured-playfield-frame overflow-hidden touch-none touch-manipulation"
        >
          <div className="absolute inset-0 bg-[linear-gradient(180deg,#1894d1_0%,#2ca9da_38%,#52c4e5_76%,#80daf2_100%)]" />
          <div className="absolute left-[-12%] top-[8%] h-[38%] w-[52%] rounded-full bg-sky-100/28 blur-2xl" />
          <div className="absolute left-[18%] top-[14%] h-[30%] w-[46%] rounded-full bg-cyan-100/20 blur-2xl" />
          <div className="absolute right-[-10%] top-[10%] h-[42%] w-[54%] rounded-full bg-blue-100/24 blur-2xl" />
          <div className="absolute left-[-14%] bottom-[-18%] h-[48%] w-[68%] rounded-full bg-amber-100/20 blur-2xl" />
          <div className="absolute right-[-12%] bottom-[-14%] h-[44%] w-[62%] rounded-full bg-yellow-100/20 blur-2xl" />
          <div className="absolute inset-x-[2.2%] top-[3.6%] bottom-[4.2%] rounded-[1.2rem] md:rounded-[1.8rem] border border-white/24 bg-transparent shadow-[inset_0_0_0_1px_rgba(255,255,255,0.14)] pointer-events-none" />

          <div className="absolute left-3 right-3 top-3 z-20 flex flex-wrap items-center justify-between gap-2 md:left-4 md:right-4 md:top-4">
            <div className="rounded-full border border-cyan-100/60 bg-[linear-gradient(180deg,rgba(37,99,235,0.95),rgba(30,64,175,0.95))] px-3 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-cyan-50 shadow-[0_8px_16px_rgba(2,6,23,0.26)] md:text-xs">
              Pop Prime Numbers
            </div>
            <div className="rounded-full border border-amber-200/70 bg-[linear-gradient(180deg,rgba(251,191,36,0.98),rgba(245,158,11,0.98))] px-3 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-amber-950 shadow-[0_8px_16px_rgba(2,6,23,0.24)] md:text-xs">
              Prime +75 | Composite -50
            </div>
          </div>

          {/* Custom Crosshair */}
          <div 
            className="absolute hidden md:block w-12 h-12 pointer-events-none z-50 -translate-x-1/2 -translate-y-1/2 text-cyan-400 opacity-80"
            style={{ left: `${crosshairPos.x}%`, top: `${crosshairPos.y}%` }}
          >
            <Crosshair className="w-full h-full" />
          </div>

          <div className="absolute inset-x-[2.2%] top-[3.6%] bottom-[4.2%] z-10 overflow-hidden rounded-[1.2rem] md:rounded-[1.8rem]">
            <AnimatePresence>
              {bubbles.map(bubble => !bubble.isPopped && (
                <motion.div
                  key={bubble.id}
                  ref={(node) => {
                    bubbleNodeRefs.current[bubble.id] = node;
                  }}
                  initial={{ bottom: '-18%', opacity: 0, scale: 0.72 }}
                  animate={{ bottom: '104%', opacity: [0, 1, 1], scale: [0.72, 1, 1] }}
                  exit={{ scale: 1.5, opacity: 0 }}
                  transition={{ 
                    bottom: { duration: bubble.speed, ease: 'linear' },
                    opacity: { duration: 0.45, times: [0, 0.1, 1] },
                    scale: { duration: 0.35 }
                  }}
                  onPointerDown={(e) => {
                    e.stopPropagation();
                    handlePlayfieldPointerDown(e.clientX, e.clientY);
                  }}
                  className="absolute z-20 -translate-x-1/2 flex items-center justify-center rounded-full backdrop-blur-md md:cursor-none"
                  style={{
                    background: bubble.palette.background,
                    border: `2px solid ${bubble.palette.ring}`,
                    boxShadow: `${bubble.palette.glow}, inset 0 -10px 18px rgba(120,53,15,0.22), inset 0 10px 16px rgba(255,255,255,0.3)`,
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
                    className="pointer-events-none text-2xl md:text-3xl font-black drop-shadow-[0_3px_8px_rgba(120,53,15,0.42)]"
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
