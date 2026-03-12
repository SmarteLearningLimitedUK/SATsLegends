import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Trophy, Timer, RefreshCw } from '../GameIcons';

interface LogicSortProps {
  onVictory: (stars: number, score: number) => void;
  onGameOver: (score: number) => void;
  onBack: () => void;
}

interface Tube {
  id: number;
  label: string;
  items: number[];
  capacity: number;
  condition: (val: number) => boolean;
}

const LogicSort: React.FC<LogicSortProps> = ({ onVictory, onGameOver, onBack }) => {
  const [tubes, setTubes] = useState<Tube[]>([]);
  const [selectedTube, setSelectedTube] = useState<number | null>(null);
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(90);
  const [level, setLevel] = useState(1);

  const generateLevel = (lvl: number) => {
    const conditions = [
      { label: 'Even', fn: (n: number) => n % 2 === 0 },
      { label: 'Odd', fn: (n: number) => n % 2 !== 0 },
      { label: 'Multiples of 3', fn: (n: number) => n % 3 === 0 },
      { label: 'Multiples of 5', fn: (n: number) => n % 5 === 0 },
      { label: 'Prime', fn: (n: number) => {
        for(let i = 2, s = Math.sqrt(n); i <= s; i++) if(n % i === 0) return false; 
        return n > 1;
      }},
      { label: 'Square Numbers', fn: (n: number) => Math.sqrt(n) % 1 === 0 },
    ];

    const selectedConditions = conditions.sort(() => Math.random() - 0.5).slice(0, 3);
    const allNumbers: number[] = [];
    
    selectedConditions.forEach(cond => {
      let count = 0;
      while (count < 3) {
        const n = Math.floor(Math.random() * 50) + 1;
        if (cond.fn(n) && !allNumbers.includes(n)) {
          allNumbers.push(n);
          count++;
        }
      }
    });

    const shuffledNumbers = allNumbers.sort(() => Math.random() - 0.5);
    
    const newTubes: Tube[] = [
      { id: 0, label: 'Source', items: shuffledNumbers, capacity: 12, condition: () => true },
      ...selectedConditions.map((cond, i) => ({
        id: i + 1,
        label: cond.label,
        items: [],
        capacity: 4,
        condition: cond.fn
      }))
    ];

    setTubes(newTubes);
  };

  useEffect(() => {
    generateLevel(level);
  }, [level]);

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(t => {
        if (t <= 1) {
          clearInterval(timer);
          onGameOver(score);
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const handleTubeClick = (id: number) => {
    if (selectedTube === null) {
      if (tubes[id].items.length > 0) {
        setSelectedTube(id);
      }
    } else {
      if (selectedTube === id) {
        setSelectedTube(null);
        return;
      }

      const fromTube = tubes[selectedTube];
      const toTube = tubes[id];
      const item = fromTube.items[fromTube.items.length - 1];

      if (toTube.items.length < toTube.capacity) {
        // Check condition if it's not the source tube
        if (id !== 0 && !toTube.condition(item)) {
          // Wrong sort!
          setScore(s => Math.max(0, s - 50));
          setSelectedTube(null);
          return;
        }

        const newTubes = [...tubes];
        newTubes[selectedTube].items.pop();
        newTubes[id].items.push(item);
        setTubes(newTubes);
        setScore(s => s + 20);

        // Check victory
        if (newTubes[0].items.length === 0) {
          if (level < 3) {
            setLevel(l => l + 1);
            setScore(s => s + 500);
          } else {
            onVictory(3, score + 1000);
          }
        }
      }
      setSelectedTube(null);
    }
  };

  return (
    <div className="relative w-full max-w-2xl h-[600px] licensed-playfield-bg rounded-[3rem] p-8 flex flex-col items-center gap-8 shadow-2xl border-8 border-white/10 overflow-hidden">
      {/* Header */}
      <div className="w-full flex justify-between items-center">
        <div className="flex items-center gap-2 bg-white/10 px-4 py-2 rounded-full border border-white/20">
          <Trophy className="text-yellow-400 w-5 h-5" />
          <span className="text-white font-black">{score}</span>
        </div>
        <h2 className="text-2xl font-black text-white tracking-widest uppercase">Logic Sort</h2>
        <div className="flex items-center gap-2 bg-white/10 px-4 py-2 rounded-full border border-white/20">
          <Timer className="text-blue-400 w-5 h-5" />
          <span className="text-white font-black">{timeLeft}s</span>
        </div>
      </div>

      {/* Source Tube */}
      <div className="flex flex-col items-center gap-2">
        <span className="text-white/50 text-xs font-bold uppercase tracking-tighter">Source</span>
        <div 
          onClick={() => handleTubeClick(0)}
          className={`w-64 h-24 bg-white/5 rounded-3xl border-2 flex items-center justify-center gap-2 p-4 transition-all cursor-pointer ${selectedTube === 0 ? 'border-yellow-400 shadow-[0_0_20px_rgba(250,204,21,0.3)]' : 'border-white/10'}`}
        >
          <AnimatePresence>
            {tubes[0]?.items.map((item, i) => (
              <motion.div
                key={`${item}-${i}`}
                layout
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0 }}
                className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-black text-xs licensed-answer-button"
              >
                {item}
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </div>

      {/* Target Tubes */}
      <div className="flex gap-6 mt-8">
        {tubes.slice(1).map((tube) => (
          <div key={tube.id} className="flex flex-col items-center gap-4">
            <div 
              onClick={() => handleTubeClick(tube.id)}
              className={`w-24 h-64 bg-white/5 rounded-t-none rounded-b-[2rem] border-2 border-t-0 flex flex-col-reverse items-center gap-2 p-4 transition-all cursor-pointer ${selectedTube === tube.id ? 'border-yellow-400 shadow-[0_0_20px_rgba(250,204,21,0.3)]' : 'border-white/10'}`}
            >
              <AnimatePresence>
                {tube.items.map((item, i) => (
                  <motion.div
                    key={`${item}-${i}`}
                    layout
                    initial={{ y: -100, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    className="w-16 h-12 rounded-xl flex items-center justify-center text-white font-black text-lg licensed-answer-button"
                  >
                    {item}
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
            <div className="bg-white/10 px-3 py-1 rounded-full border border-white/20">
              <span className="text-white text-[10px] font-black uppercase text-center block leading-tight">
                {tube.label}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Reset Button */}
      <button 
        onClick={() => generateLevel(level)}
        className="absolute bottom-8 right-8 p-4 bg-white/10 rounded-full text-white hover:bg-white/20 transition-all"
      >
        <RefreshCw size={24} />
      </button>

      {/* Background Decor */}
      <div className="absolute top-0 left-0 w-full h-full pointer-events-none opacity-10">
        <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-blue-500 rounded-full blur-[100px]" />
        <div className="absolute bottom-1/4 right-1/4 w-64 h-64 bg-purple-500 rounded-full blur-[100px]" />
      </div>
    </div>
  );
};

export default LogicSort;
