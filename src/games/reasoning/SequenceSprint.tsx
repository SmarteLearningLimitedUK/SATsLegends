import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Trophy, Heart, Timer, ArrowLeft, ArrowRight } from '../../components/GameIcons';

interface SequenceSprintProps {
  onVictory: (stars: number, XP: number) => void;
  onGameOver: (XP: number) => void;
  onBack: () => void;
}

interface SequenceRound {
  sequence: number[];
  correct: number;
  options: number[];
}

const SequenceSprint: React.FC<SequenceSprintProps> = ({ onVictory, onGameOver, onBack }) => {
  const [XP, setScore] = useState(0);
  const [lives, setLives] = useState(3);
  const [timeLeft, setTimeLeft] = useState(60);
  const [round, setRound] = useState<SequenceRound | null>(null);
  const [lane, setLane] = useState(1); // 0, 1, 2
  const [items, setItems] = useState<{ id: number; value: number; lane: number; y: number }[]>([]);
  const [gameActive, setGameActive] = useState(true);
  const [speed, setSpeed] = useState(3);
  
  const gameLoopRef = useRef<number | null>(null);
  const lastSpawnRef = useRef(0);
  const itemIdRef = useRef(0);

  // Generate a new sequence
  const generateRound = (): SequenceRound => {
    const start = Math.floor(Math.random() * 10);
    const step = Math.floor(Math.random() * 5) + 1;
    const newSeq = Array.from({ length: 4 }, (_, i) => start + (i * step));
    
    const correct = start + (4 * step);
    const wrong1 = correct + step + (Math.random() > 0.5 ? 1 : -1);
    const wrong2 = correct - step + (Math.random() > 0.5 ? 1 : -1);
    
    const newOptions = [correct, wrong1, wrong2].sort(() => Math.random() - 0.5);
    return { sequence: newSeq, correct, options: newOptions };
  };

  useEffect(() => {
    if (!round) return;
    
    const gameLoop = (time: number) => {
      if (!gameActive) return;

      // Update items
      setItems(prev => {
        const updated = prev.map(item => ({ ...item, y: item.y + speed }))
          .filter(item => item.y < 800);
        
        // Check collisions
        const collision = updated.find(item => item.y > 550 && item.y < 650 && item.lane === lane);
        if (collision) {
          if (collision.value === round.correct) {
            setScore(s => s + 100);
            setSpeed(prev => Math.min(prev + 0.1, 8)); // Gradual speed up
            setRound(generateRound());
            return []; // Clear items on correct hit
          } else {
            setLives(l => l - 1);
            return updated.filter(i => i.id !== collision.id);
          }
        }
        
        return updated;
      });

      // Spawn items
      const spawnRate = Math.max(1500, 3000 - (XP / 10));
      if (time - lastSpawnRef.current > spawnRate) {
        const newItems = round.options.map((val, idx) => ({
          id: itemIdRef.current++,
          value: val,
          lane: idx,
          y: -100
        }));
        setItems(prev => [...prev, ...newItems]);
        lastSpawnRef.current = time;
      }

      gameLoopRef.current = requestAnimationFrame(gameLoop);
    };

    gameLoopRef.current = requestAnimationFrame(gameLoop);
    return () => {
      if (gameLoopRef.current) cancelAnimationFrame(gameLoopRef.current);
    };
  }, [gameActive, lane, round, XP, speed]);

  useEffect(() => {
    if (timeLeft > 0 && gameActive) {
      const timer = setInterval(() => setTimeLeft(t => t - 1), 1000);
      return () => clearInterval(timer);
    } else if (timeLeft === 0) {
      setGameActive(false);
      onVictory(3, XP);
    }
  }, [timeLeft, gameActive]);

  useEffect(() => {
    if (lives <= 0) {
      setGameActive(false);
      onGameOver(XP);
    }
  }, [lives]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowLeft') setLane(l => Math.max(0, l - 1));
    if (e.key === 'ArrowRight') setLane(l => Math.min(2, l + 1));
  };

  const startGame = () => {
    setRound(generateRound());
    setItems([]);
    setLane(1);
    setLives(3);
    setTimeLeft(60);
    setScore(0);
    setSpeed(3);
    lastSpawnRef.current = 0;
    setGameActive(true);
  };

  useEffect(() => {
    startGame();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div 
      className="relative h-full w-full rounded-[2rem] md:rounded-[3rem] overflow-hidden shadow-[0_40px_100px_rgba(0,0,0,0.3)] border-[6px] md:border-[10px] border-white/50 outline-none licensed-playfield-bg"
      onKeyDown={handleKeyDown}
      tabIndex={0}
    >
      {/* Header */}
      <div className="absolute top-0 left-0 right-0 p-3 md:p-6 flex justify-between items-center z-20 bg-black/20 backdrop-blur-xl border-b border-white/10">
        <div className="flex items-center gap-2 md:gap-3 bg-white/20 px-4 md:px-6 py-2 md:py-3 rounded-xl md:rounded-2xl border border-white/20">
          <Trophy className="text-yellow-400 w-4 h-4 md:w-6 md:h-6 filter drop-shadow-md" />
          <span className="text-white text-lg md:text-2xl font-black">{XP}</span>
        </div>
        <div className="flex items-center gap-3 md:gap-6">
          <div className="flex gap-1 md:gap-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <motion.div
                key={i}
                animate={i < lives ? { scale: [1, 1.2, 1] } : {}}
                transition={{ duration: 0.5 }}
              >
                <Heart className={`w-6 h-6 md:w-8 md:h-8 ${i < lives ? 'text-red-500 fill-red-500 filter drop-shadow-md' : 'text-white/20'}`} />
              </motion.div>
            ))}
          </div>
          <div className="flex items-center gap-2 md:gap-3 bg-white/20 px-4 md:px-6 py-2 md:py-3 rounded-xl md:rounded-2xl border border-white/20">
            <Timer className="text-white w-4 h-4 md:w-6 md:h-6" />
            <span className="text-white text-lg md:text-2xl font-black">{timeLeft}s</span>
          </div>
        </div>
      </div>

      {/* Sequence Display */}
      <div className="absolute top-20 md:top-28 left-1/2 -translate-x-1/2 z-20 w-full px-4 md:px-10">
        <div className="bg-white/95 backdrop-blur-xl p-3 md:p-5 rounded-[1.6rem] md:rounded-[2.2rem] shadow-2xl flex justify-center gap-2 md:gap-5 items-center border-b-[4px] md:border-b-[8px] border-gray-200">
          {(round?.sequence || []).map((num, i) => (
            <motion.div 
              key={i}
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="w-10 h-10 md:w-16 md:h-16 rounded-xl md:rounded-2xl flex items-center justify-center text-white font-black text-lg md:text-2xl licensed-answer-button"
            >
              {num}
            </motion.div>
          ))}
          <div className="w-10 h-10 md:w-16 md:h-16 bg-gray-100 rounded-xl md:rounded-2xl flex items-center justify-center text-gray-400 font-black text-lg md:text-2xl border-2 md:border-4 border-dashed border-gray-300 animate-pulse">
            ?
          </div>
        </div>
      </div>

      {/* Lanes */}
      <div className="absolute inset-0 flex">
        {[0, 1, 2].map(i => (
          <div key={i} className={`flex-1 border-x border-white/5 transition-colors duration-300 ${lane === i ? 'bg-white/10' : ''}`} />
        ))}
      </div>

      {/* Items */}
      <AnimatePresence>
        {items.map(item => (
          <motion.div
            key={item.id}
            initial={{ scale: 0.5, opacity: 0, y: -100 }}
            animate={{ scale: 1, opacity: 1, y: item.y }}
            exit={{ scale: 0.5, opacity: 0 }}
            className="absolute w-1/3 flex justify-center"
            style={{ left: `${item.lane * 33.33}%` }}
          >
            <div className="w-24 h-24 bg-gradient-to-b from-yellow-300 to-yellow-500 rounded-3xl flex items-center justify-center text-white font-black text-4xl shadow-2xl border-b-[8px] border-yellow-600">
              {item.value}
            </div>
          </motion.div>
        ))}
      </AnimatePresence>

      {/* Player */}
      <motion.div
        animate={{ x: (lane - 1) * 26 }}
        transition={{ type: 'spring', stiffness: 300, damping: 20 }}
        className="absolute bottom-20 md:bottom-24 left-1/2 -translate-x-1/2 w-20 h-20 md:w-24 md:h-24 bg-white rounded-[1.5rem] shadow-[0_20px_50px_rgba(0,0,0,0.3)] flex items-center justify-center text-4xl md:text-5xl border-4 border-blue-100 z-10"
      >
        🏃‍♂️
      </motion.div>

      {/* Controls Overlay (Mobile) */}
      <div className="absolute bottom-0 left-0 right-0 p-4 md:p-8 flex justify-between z-30 pointer-events-none">
        <button 
          onClick={() => setLane(l => Math.max(0, l - 1))}
          className="ui-button-secondary pointer-events-auto flex h-14 w-14 items-center justify-center p-0 text-white md:h-18 md:w-18"
        >
          <ArrowLeft size={28} />
        </button>
        <button 
          onClick={() => setLane(l => Math.min(2, l + 1))}
          className="ui-button-secondary pointer-events-auto flex h-14 w-14 items-center justify-center p-0 text-white md:h-18 md:w-18"
        >
          <ArrowRight size={28} />
        </button>
      </div>

      {/* Road Markings */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="h-[200%] w-full flex flex-col gap-24 animate-road-move">
          {Array.from({ length: 10 }).map((_, i) => (
            <div key={i} className="w-full flex justify-around opacity-10">
              <div className="w-3 h-32 bg-white rounded-full" />
              <div className="w-3 h-32 bg-white rounded-full" />
            </div>
          ))}
        </div>
      </div>

      <style>{`
        @keyframes road-move {
          from { transform: translateY(-50%); }
          to { transform: translateY(0); }
        }
        .animate-road-move {
          animation: road-move 3s linear infinite;
        }
      `}</style>
    </div>
  );
};

export default SequenceSprint;
