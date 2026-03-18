import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Trophy, Timer, HelpCircle, CheckCircle2, XCircle, Lightbulb } from '../GameIcons';
import BossPortrait from '../BossPortrait';
import { getBossEncounter } from '../../bossMeta';

interface MatrixMatchProps {
  onVictory: (stars: number, score: number) => void;
  onGameOver: (score: number) => void;
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
  const [score, setScore] = useState(0);
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
      onGameOver(score);
    }
  }, [timeLeft, gameActive]);

  const checkAnswer = (item: MatrixItem) => {
    if (feedback || !correctItem) return;

    if (item.shape === correctItem.shape && item.color === correctItem.color) {
      setFeedback('correct');
      setScore(s => s + 200);
      setTimeout(() => {
        if (level >= 5) {
          onVictory(3, score + 200);
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
    if (showHint || score < 100) return;
    setScore(s => s - 100);
    setShowHint(true);
  };

  return (
    <div className="relative h-full w-full bg-white rounded-[2rem] md:rounded-[3rem] p-4 md:p-8 shadow-[0_40px_100px_rgba(0,0,0,0.1)] border-8 border-gray-100 overflow-hidden">
      {/* Header */}
      <div className="flex justify-between items-center mb-4 md:mb-6">
        <div className="flex items-center gap-3 px-6 py-3 rounded-2xl licensed-answer-chip">
          <Trophy className="text-yellow-500 w-6 h-6" />
          <span className="text-2xl font-black text-gray-800">{score}</span>
        </div>
        <div className="text-center">
          <h2 className="text-3xl font-black text-gray-800 tracking-tight">MATRIX MATCH</h2>
          <div className="text-xs font-bold text-gray-400 uppercase tracking-widest mt-1">Level {level} / 5</div>
        </div>
        <div className="flex items-center gap-3 px-6 py-3 rounded-2xl licensed-answer-chip">
          <Timer className="text-blue-500 w-6 h-6" />
          <span className="text-2xl font-black text-gray-800">{timeLeft}s</span>
        </div>
      </div>

      {bossEncounter && (
        <div className="mb-4 md:mb-5">
          <BossPortrait encounter={bossEncounter} pose={bossPose} compact className="mx-auto max-w-sm" />
        </div>
      )}

      {/* Visual Timer Bar */}
      <div className="w-full h-3 bg-gray-100 rounded-full mb-5 md:mb-8 overflow-hidden">
        <motion.div 
          initial={{ width: '100%' }}
          animate={{ width: `${(timeLeft / 60) * 100}%` }}
          className={`h-full transition-colors duration-500 ${timeLeft < 15 ? 'bg-red-500' : 'bg-blue-500'}`}
        />
      </div>

      {/* Matrix Grid */}
      <motion.div 
        animate={shake ? { x: [-10, 10, -10, 10, 0] } : {}}
        className="grid grid-cols-3 gap-3 md:gap-5 mb-6 md:mb-8 aspect-square max-w-[min(100%,24rem)] mx-auto"
      >
        {grid.map((item, i) => (
          <motion.div
            key={i}
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className={`
              aspect-square rounded-[2rem] flex items-center justify-center text-4xl md:text-5xl shadow-lg border-b-8 transition-all
              ${item ? `${item.color} border-black/10` : 'bg-gray-100 border-dashed border-4 border-gray-300 shadow-inner'}
            `}
          >
            {item ? (
              <span className="filter drop-shadow-md">{item.shape}</span>
            ) : (
              <HelpCircle className="w-12 h-12 text-gray-300 animate-pulse" />
            )}
          </motion.div>
        ))}
      </motion.div>

      {/* Options */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mb-5 md:mb-6">
        {options.map((option, i) => {
          const isCorrect = correctItem && option.shape === correctItem.shape && option.color === correctItem.color;
          return (
            <motion.button
              key={option.id}
              whileHover={{ scale: 1.05, y: -5 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => checkAnswer(option)}
              className={`
                aspect-square rounded-3xl flex items-center justify-center text-4xl shadow-xl border-b-8 transition-all relative
                ${option.color} border-black/10
                ${showHint && isCorrect ? 'ring-8 ring-yellow-400 ring-offset-4 scale-110 z-10' : ''}
              `}
            >
              <span className="filter drop-shadow-md">{option.shape}</span>
              {showHint && isCorrect && (
                <motion.div 
                  animate={{ scale: [1, 1.2, 1] }}
                  transition={{ repeat: Infinity, duration: 1 }}
                  className="absolute -top-4 -right-4 bg-yellow-400 p-2 rounded-full shadow-lg"
                >
                  <Lightbulb className="text-white w-4 h-4" />
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
          disabled={showHint || score < 100}
          className={`ui-button-secondary flex items-center gap-3 px-6 py-3 font-black transition-all ${showHint || score < 100 ? 'cursor-not-allowed opacity-50' : ''}`}
        >
          <Lightbulb size={24} />
          <span>HINT (-100)</span>
        </button>
      </div>

      {/* Feedback Overlay */}
      <AnimatePresence>
        {feedback && (
          <motion.div
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.5 }}
            className="absolute inset-0 z-50 flex items-center justify-center pointer-events-none"
          >
            {feedback === 'correct' ? (
              <div className="bg-emerald-500 p-12 rounded-full shadow-2xl border-8 border-white">
                <CheckCircle2 size={100} className="text-white" />
              </div>
            ) : (
              <div className="bg-red-500 p-12 rounded-full shadow-2xl border-8 border-white">
                <XCircle size={100} className="text-white" />
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Background Decor */}
      <div className="absolute top-0 left-0 w-full h-full pointer-events-none opacity-[0.02]">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] border-[100px] border-black rounded-full" />
      </div>
    </div>
  );
};

export default MatrixMatch;
