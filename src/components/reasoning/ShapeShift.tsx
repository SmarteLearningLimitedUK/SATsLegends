import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Trophy, RotateCw, FlipHorizontal, CheckCircle2 } from '../GameIcons';

interface ShapeShiftProps {
  onVictory: (stars: number, score: number) => void;
  onGameOver: (score: number) => void;
  onBack: () => void;
}

interface Shape {
  id: number;
  grid: number[][];
  rotation: number;
  isFlipped: boolean;
  color: string;
}

const ShapeShift: React.FC<ShapeShiftProps> = ({ onVictory, onGameOver, onBack }) => {
  const [targetGrid, setTargetGrid] = useState<number[][]>([]);
  const [playerGrid, setPlayerGrid] = useState<number[][]>([]);
  const [score, setScore] = useState(0);
  const [level, setLevel] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);

  const generateLevel = (lvl: number) => {
    const size = lvl + 2;
    const grid = Array(size).fill(0).map(() => Array(size).fill(0));
    
    // Create a random shape
    for (let i = 0; i < size * 2; i++) {
      const r = Math.floor(Math.random() * size);
      const c = Math.floor(Math.random() * size);
      grid[r][c] = 1;
    }

    setTargetGrid(grid);
    setPlayerGrid(grid.map(row => [...row])); // Start with target, then transform it
    
    // Apply random transformations to player grid
    const randomRot = Math.floor(Math.random() * 4) * 90;
    const randomFlip = Math.random() > 0.5;
    setRotation(randomRot);
    setIsFlipped(randomFlip);
  };

  useEffect(() => {
    generateLevel(level);
  }, [level]);

  const rotate = () => setRotation(r => (r + 90) % 360);
  const flip = () => setIsFlipped(f => !f);

  const checkVictory = () => {
    if (rotation === 0 && !isFlipped) {
      setScore(s => s + 500);
      if (level < 5) {
        setLevel(l => l + 1);
      } else {
        onVictory(3, score + 1000);
      }
    } else {
      // Shake animation or feedback
    }
  };

  return (
    <div className="relative h-full w-full bg-[#fdfcf0] rounded-[2rem] md:rounded-[3rem] p-4 md:p-8 flex flex-col items-center gap-5 md:gap-8 shadow-2xl border-8 border-[#e6e2cf] overflow-hidden">
      {/* Header */}
      <div className="w-full flex justify-between items-center">
        <div className="flex items-center gap-2 bg-black/5 px-4 py-2 rounded-full">
          <Trophy className="text-yellow-600 w-5 h-5" />
          <span className="text-gray-800 font-black">{score}</span>
        </div>
        <h2 className="text-3xl font-black text-gray-800 tracking-tight">Shape Shift</h2>
        <div className="bg-black/5 px-4 py-2 rounded-full">
          <span className="text-gray-800 font-black">Lvl {level}</span>
        </div>
      </div>

      <div className="flex flex-1 min-h-0 w-full items-center justify-center gap-6 md:gap-12">
        {/* Target (Ghost) */}
        <div className="flex flex-col items-center gap-4">
          <span className="text-gray-400 text-xs font-bold uppercase tracking-widest">Target</span>
          <div className="grid gap-1 p-2 bg-gray-100 rounded-2xl opacity-30">
            {targetGrid.map((row, r) => (
              <div key={r} className="flex gap-1">
                {row.map((cell, c) => (
                  <div 
                    key={c} 
                    className={`w-5 h-5 md:w-8 md:h-8 rounded-md ${cell ? 'bg-gray-800' : 'bg-transparent'}`} 
                  />
                ))}
              </div>
            ))}
          </div>
        </div>

        {/* Player Shape */}
        <div className="flex flex-col items-center gap-4">
          <span className="text-gray-800 text-xs font-bold uppercase tracking-widest">Your Shape</span>
          <motion.div 
            animate={{ 
              rotate: rotation,
              scaleX: isFlipped ? -1 : 1
            }}
            transition={{ type: 'spring', stiffness: 200, damping: 20 }}
            className="grid gap-1.5 md:gap-2 p-3 md:p-4 bg-white rounded-3xl shadow-xl border-2 border-gray-100"
          >
            {playerGrid.map((row, r) => (
              <div key={r} className="flex gap-1.5 md:gap-2">
                {row.map((cell, c) => (
                  <div 
                    key={c} 
                    className={`w-8 h-8 md:w-12 md:h-12 rounded-xl transition-colors duration-500 ${cell ? 'bg-indigo-500 shadow-lg shadow-indigo-200' : 'bg-gray-50'}`} 
                  />
                ))}
              </div>
            ))}
          </motion.div>
        </div>
      </div>

      {/* Controls */}
      <div className="flex gap-3 md:gap-6 mt-1 md:mt-2">
        <button 
          onClick={rotate}
          className="flex flex-col items-center gap-2 p-4 md:p-6 bg-white rounded-3xl shadow-lg hover:shadow-xl hover:-translate-y-1 transition-all border-b-4 border-gray-200 active:border-b-0 active:translate-y-0"
        >
          <RotateCw size={28} className="text-indigo-500" />
          <span className="text-[10px] font-black text-gray-400 uppercase">Rotate</span>
        </button>
        <button 
          onClick={flip}
          className="flex flex-col items-center gap-2 p-4 md:p-6 bg-white rounded-3xl shadow-lg hover:shadow-xl hover:-translate-y-1 transition-all border-b-4 border-gray-200 active:border-b-0 active:translate-y-0"
        >
          <FlipHorizontal size={28} className="text-indigo-500" />
          <span className="text-[10px] font-black text-gray-400 uppercase">Flip</span>
        </button>
        <button 
          onClick={checkVictory}
          className="flex flex-col items-center gap-2 p-4 md:p-6 bg-emerald-500 rounded-3xl shadow-lg hover:shadow-xl hover:-translate-y-1 transition-all border-b-4 border-emerald-700 active:border-b-0 active:translate-y-0"
        >
          <CheckCircle2 size={28} className="text-white" />
          <span className="text-[10px] font-black text-emerald-100 uppercase">Submit</span>
        </button>
      </div>

      {/* Background Texture */}
      <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{ backgroundImage: 'radial-gradient(#000 1px, transparent 1px)', backgroundSize: '20px 20px' }} />
    </div>
  );
};

export default ShapeShift;
