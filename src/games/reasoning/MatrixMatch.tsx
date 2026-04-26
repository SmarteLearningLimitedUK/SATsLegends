import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Trophy, Timer, HelpCircle, Lightbulb } from '../../components/GameIcons';
import BossPortrait from '../../components/BossPortrait';
import { getBossEncounter } from '../../bossMeta';

interface MatrixMatchProps {
  onVictory: (stars: number, XP: number) => void;
  onGameOver: (XP: number) => void;
  onBack: () => void;
  isBoss?: boolean;
}

interface MatrixItem {
  shape: string;
  color: string;
  id: string;
}

const SHAPES = ['⭐', '🌙', '☀️', '☁️', '🌀', '💎'];
const COLORS = [
  'bg-red-400', 
  'bg-blue-400', 
  'bg-green-400', 
  'bg-yellow-400', 
  'bg-blue-400', 
  'bg-pink-400'
];

const MatrixMatch: React.FC<MatrixMatchProps> = ({ onVictory, onGameOver, onBack, isBoss = false }) => {
  const [grid, setGrid] = useState<(MatrixItem | null)[]>([]);
  const [options, setOptions] = useState<MatrixItem[]>([]);
  const [XP, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(60);
  const [level, setLevel] = useState(1);
  const [feedback, setFeedback] = useState<'correct' | 'wrong' | null>(null);
  const [gameActive, setGameActive] = useState(true);
  const [correctItem, setCorrectItem] = useState<MatrixItem | null>(null);
  const [showHint, setShowHint] = useState(false);
  const [shake, setShake] = useState(false);
  const bossEncounter = isBoss ? getBossEncounter('matrix_match') : undefined;
  const bossPose = !bossEncounter
    ? 'neutral'
    : feedback === 'correct'
      ? 'dazed'
      : feedback === 'wrong'
        ? 'attack'
        : timeLeft <= 20 || showHint
          ? 'happy'
          : 'neutral';

  const generateLevel = () => {
    const ruleType = Math.floor(Math.random() * 3);
    const baseShapeIdx = Math.floor(Math.random() * SHAPES.length);
    const baseColorIdx = Math.floor(Math.random() * COLORS.length);
    
    const newGrid: (MatrixItem | null)[] = [];
    let target: MatrixItem | null = null;

    for (let r = 0; r < 3; r++) {
      for (let c = 0; c < 3; c++) {
        let sIdx, cIdx;
        if (ruleType === 0) {
          sIdx = (baseShapeIdx + c) % SHAPES.length;
          cIdx = (baseColorIdx + r) % COLORS.length;
        } else if (ruleType === 1) {
          sIdx = (baseShapeIdx + r) % SHAPES.length;
          cIdx = (baseColorIdx + c) % COLORS.length;
        } else {
          sIdx = (baseShapeIdx + r + c) % SHAPES.length;
          cIdx = (baseColorIdx + r + c) % COLORS.length;
        }
        
        const item = { shape: SHAPES[sIdx], color: COLORS[cIdx], id: `${r}-${c}` };
        if (r === 2 && c === 2) {
          target = item;
          newGrid.push(null);
        } else {
          newGrid.push(item);
        }
      }
    }

    const opts = [target!];
    while (opts.length < 4) {
      const sIdx = Math.floor(Math.random() * SHAPES.length);
      const cIdx = Math.floor(Math.random() * COLORS.length);
      const item = { shape: SHAPES[sIdx], color: COLORS[cIdx], id: `opt-${opts.length}` };
      if (!opts.find(o => o.shape === item.shape && o.color === item.color)) {
        opts.push(item);
      }
    }

    setGrid(newGrid);
    setCorrectItem(target);
    setOptions(opts.sort(() => Math.random() - 0.5));
    setFeedback(null);
    setShowHint(false);
  };

  useEffect(() => {
    generateLevel();
  }, [level]);

  useEffect(() => {
    if (timeLeft > 0 && gameActive) {
      const timer = setInterval(() => setTimeLeft(t => t - 1), 1000);
      return () => clearInterval(timer);
    } else if (timeLeft === 0) {
      onGameOver(XP);
    }
  }, [timeLeft, gameActive]);

  const checkAnswer = (item: MatrixItem) => {
    if (feedback || !correctItem) return;

    if (item.shape === correctItem.shape && item.color === correctItem.color) {
      setFeedback('correct');
      setScore(s => s + 200);
      setTimeout(() => {
        if (level >= 5) {
          onVictory(3, XP + 200);
        } else {
          setLevel(l => l + 1);
        }
      }, 1000);
    } else {
      setFeedback('wrong');
      setShake(true);
      setScore(s => Math.max(0, s - 50));
      setTimeout(() => {
        setFeedback(null);
        setShake(false);
      }, 1000);
    }
  };

  const useHint = () => {
    if (showHint || XP < 100) return;
    setScore(s => s - 100);
    setShowHint(true);
  };

  return (
    <div className="relative flex h-full w-full flex-col overflow-hidden rounded-[2rem] border border-cyan-100/18 bg-[radial-gradient(circle_at_50%_0%,rgba(56,189,248,0.14),transparent_34%),linear-gradient(180deg,rgba(8,21,58,0.92),rgba(5,16,42,0.96))] p-3 shadow-[0_24px_60px_rgba(2,6,23,0.38)] lg:rounded-[3rem] lg:p-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-2.5 lg:mb-4">
        <div className="flex items-center gap-2 rounded-[1.5rem] border border-cyan-100/18 bg-slate-950/42 px-3 py-1.5">
          <Trophy className="text-yellow-500 w-5 h-5" />
          <span className="text-lg font-black text-white">{XP}</span>
        </div>
        <div className="text-center">
          <h2 className="text-lg font-black tracking-tight text-white">MATRIX MATCH</h2>
          <div className="mt-1 text-xs font-bold uppercase tracking-widest text-cyan-100/70">Level {level} / 5</div>
        </div>
        <div className="flex items-center gap-2 rounded-[1.5rem] border border-cyan-100/18 bg-slate-950/42 px-3 py-1.5">
          <Timer className="text-blue-500 w-5 h-5" />
          <span className="text-lg font-black text-white">{timeLeft}s</span>
        </div>
      </div>

      {bossEncounter && (
        <div className="mb-2.5 lg:mb-4">
          <BossPortrait encounter={bossEncounter} pose={bossPose} compact className="mx-auto max-w-xs" />
        </div>
      )}

      {/* Visual Timer Bar */}
      <div className="mb-3 h-2 w-full overflow-hidden rounded-full bg-white/10 lg:mb-5">
        <motion.div 
          initial={{ width: '100%' }}
          animate={{ width: `${(timeLeft / 60) * 100}%` }}
          className={`h-full transition-colors duration-500 ${timeLeft < 15 ? 'bg-red-500' : 'bg-blue-500'}`}
        />
      </div>

      {/* Matrix Grid */}
      <motion.div 
        animate={shake ? { x: [-10, 10, -10, 10, 0] } : {}}
        className="mb-3 grid flex-1 grid-cols-3 grid-rows-3 gap-2 rounded-[1.6rem] border border-cyan-100/14 bg-slate-950/36 p-2 lg:mb-5 lg:gap-3 lg:p-3"
      >
        {grid.map((item, i) => (
          <motion.div
            key={i}
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className={`
              flex min-h-0 items-center justify-center rounded-[1.4rem] text-[clamp(2rem,5.2vw,3.75rem)] shadow-lg transition-all
              ${item ? `${item.color} border border-white/16` : 'border-2 border-dashed border-cyan-100/24 bg-slate-900/55 shadow-inner'}
            `}
          >
            {item ? (
              <span className="filter drop-shadow-md">{item.shape}</span>
            ) : (
              <HelpCircle className="h-8 w-8 animate-pulse text-cyan-100/40" />
            )}
          </motion.div>
        ))}
      </motion.div>

      {/* Options */}
      <div className="mb-3 grid grid-cols-2 gap-2 lg:mb-4 lg:grid-cols-4 lg:gap-3">
        {options.map((option, i) => {
          const isCorrect = correctItem && option.shape === correctItem.shape && option.color === correctItem.color;
          return (
            <motion.button
              key={option.id}
              whileHover={{ scale: 1.05, y: -5 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => checkAnswer(option)}
              className={`
                relative aspect-square rounded-[1.5rem] border border-white/16 text-[clamp(1.9rem,4.6vw,3rem)] shadow-xl transition-all
                ${option.color}
                ${showHint && isCorrect ? 'ring-4 ring-yellow-400 ring-offset-1 scale-110 z-10' : ''}
              `}
            >
              <span className="filter drop-shadow-md">{option.shape}</span>
              {showHint && isCorrect && (
                <motion.div 
                  animate={{ scale: [1, 1.2, 1] }}
                  transition={{ repeat: Infinity, duration: 1 }}
                  className="absolute -top-2.5 -right-2.5 bg-yellow-400 p-1.5 rounded-full shadow-lg"
                >
                  <Lightbulb className="text-white w-3.5 h-3.5" />
                </motion.div>
              )}
            </motion.button>
          );
        })}
      </div>

      {/* Hint Button */}
      <div className="flex justify-center">
        <button
          onClick={useHint}
          disabled={showHint || XP < 100}
          className={`ui-button-secondary flex items-center gap-2 px-4 py-2 font-black transition-all ${showHint || XP < 100 ? 'cursor-not-allowed opacity-50' : ''}`}
        >
          <Lightbulb size={20} />
          <span>HINT (-100)</span>
        </button>
      </div>

      {/* Background Decor */}
      <div className="absolute top-0 left-0 w-full h-full pointer-events-none opacity-[0.02]">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] border-[100px] border-black rounded-full" />
      </div>
    </div>
  );
};

export default MatrixMatch;
