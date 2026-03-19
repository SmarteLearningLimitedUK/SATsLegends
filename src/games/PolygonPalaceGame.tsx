import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Check,
  Hexagon,
  Pentagon,
  Shapes,
  Square,
  Timer as TimerIcon,
  Trophy,
  Triangle,
  X,
  Zap,
} from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import GameActionDock from '../components/GameActionDock';

interface PolygonPalaceGameProps {
  levelId: number;
  avatarId: string;
  onVictory: (stars: number, score: number) => void;
  onGameOver: (score: number) => void;
  onBack: () => void;
}

interface ShapeProperty {
  id: string;
  label: string;
  check: (shape: ShapeData) => boolean;
}

interface ShapeData {
  id: string;
  name: string;
  type: '2D' | '3D';
  sides?: number;
  vertices: number;
  faces?: number;
  isRegular: boolean;
  hasParallelSides: boolean;
  hasRightAngles: boolean;
  color: string;
  icon: React.ReactNode;
}

const SHAPES: ShapeData[] = [
  { id: 'sq', name: 'Square', type: '2D', sides: 4, vertices: 4, isRegular: true, hasParallelSides: true, hasRightAngles: true, color: 'bg-blue-500', icon: <Square className="h-10 w-10" /> },
  { id: 'rect', name: 'Rectangle', type: '2D', sides: 4, vertices: 4, isRegular: false, hasParallelSides: true, hasRightAngles: true, color: 'bg-indigo-500', icon: <div className="h-8 w-14 rounded-sm bg-current" /> },
  { id: 'tri-eq', name: 'Equilateral Triangle', type: '2D', sides: 3, vertices: 3, isRegular: true, hasParallelSides: false, hasRightAngles: false, color: 'bg-emerald-500', icon: <Triangle className="h-10 w-10" /> },
  { id: 'tri-rt', name: 'Right-angled Triangle', type: '2D', sides: 3, vertices: 3, isRegular: false, hasParallelSides: false, hasRightAngles: true, color: 'bg-teal-500', icon: <div className="h-10 w-10 border-b-4 border-l-4 border-current" /> },
  { id: 'pent', name: 'Pentagon', type: '2D', sides: 5, vertices: 5, isRegular: true, hasParallelSides: false, hasRightAngles: false, color: 'bg-amber-500', icon: <Pentagon className="h-10 w-10" /> },
  { id: 'hex', name: 'Hexagon', type: '2D', sides: 6, vertices: 6, isRegular: true, hasParallelSides: true, hasRightAngles: false, color: 'bg-orange-500', icon: <Hexagon className="h-10 w-10" /> },
  { id: 'oct', name: 'Octagon', type: '2D', sides: 8, vertices: 8, isRegular: true, hasParallelSides: true, hasRightAngles: false, color: 'bg-rose-500', icon: <div className="flex h-10 w-10 items-center justify-center rounded-full border-4 border-current text-[10px] font-black">8</div> },
  { id: 'circ', name: 'Circle', type: '2D', sides: 1, vertices: 0, isRegular: true, hasParallelSides: false, hasRightAngles: false, color: 'bg-sky-500', icon: <div className="h-10 w-10 rounded-full bg-current" /> },
  { id: 'para', name: 'Parallelogram', type: '2D', sides: 4, vertices: 4, isRegular: false, hasParallelSides: true, hasRightAngles: false, color: 'bg-violet-500', icon: <div className="h-8 w-12 skew-x-12 rounded-sm bg-current" /> },
  { id: 'trap', name: 'Trapezium', type: '2D', sides: 4, vertices: 4, isRegular: false, hasParallelSides: true, hasRightAngles: false, color: 'bg-fuchsia-500', icon: <div className="h-8 w-12 rounded-sm bg-current [clip-path:polygon(20%_0%,80%_0%,100%_100%,0%_100%)]" /> },
  { id: 'cube', name: 'Cube', type: '3D', faces: 6, vertices: 8, isRegular: true, hasParallelSides: true, hasRightAngles: true, color: 'bg-pink-600', icon: <div className="h-10 w-10 rounded-md border-2 border-current" /> },
  { id: 'pyr', name: 'Square-based Pyramid', type: '3D', faces: 5, vertices: 5, isRegular: false, hasParallelSides: false, hasRightAngles: false, color: 'bg-red-600', icon: <div className="h-10 w-10 border-2 border-current [clip-path:polygon(50%_0%,100%_100%,0%_100%)]" /> },
];

const PROPERTIES: ShapeProperty[] = [
  { id: 'p1', label: 'Has exactly 4 vertices', check: (shape) => shape.vertices === 4 },
  { id: 'p2', label: 'Is a regular polygon', check: (shape) => shape.isRegular && shape.type === '2D' },
  { id: 'p3', label: 'Has at least one pair of parallel sides', check: (shape) => shape.hasParallelSides },
  { id: 'p4', label: 'Has at least one right angle', check: (shape) => shape.hasRightAngles },
  { id: 'p5', label: 'Has more than 4 sides', check: (shape) => (shape.sides || 0) > 4 },
  { id: 'p6', label: 'Is a 3D shape', check: (shape) => shape.type === '3D' },
  { id: 'p7', label: 'Has fewer than 4 vertices', check: (shape) => shape.vertices < 4 },
  { id: 'p8', label: 'Has exactly 6 faces', check: (shape) => shape.faces === 6 },
];

const TopBar: React.FC<{ score: number; streak: number; timer: string }> = ({ score, streak, timer }) => (
  <div className="z-50 w-full px-4 pt-4">
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-3 rounded-xl border border-blue-400/30 bg-blue-900/60 p-2 shadow-lg">
        <div className="flex flex-col items-center px-2">
          <div className="flex items-center gap-1 text-yellow-400">
            <Zap className="h-4 w-4 fill-current" />
            <span className="text-lg font-black">{streak}</span>
          </div>
          <span className="text-[10px] font-black uppercase text-blue-200">Streak</span>
        </div>
        <div className="h-8 w-[2px] bg-blue-400/20" />
        <div className="flex flex-col">
          <span className="text-[10px] font-bold uppercase tracking-tight text-blue-200">Score</span>
          <span className="text-xl font-black leading-none text-white">{score.toLocaleString()}</span>
        </div>
      </div>

      <div className="flex items-center gap-2 rounded-xl border border-yellow-400/50 bg-blue-900/80 px-4 py-2 shadow-lg">
        <TimerIcon className="h-5 w-5 text-yellow-400" />
        <span className="text-xl font-black text-white">{timer}</span>
      </div>
    </div>
  </div>
);

const PolygonPalaceGame: React.FC<PolygonPalaceGameProps> = ({
  levelId,
  avatarId: _avatarId,
  onVictory,
  onGameOver,
  onBack,
}) => {
  const roundSeconds = 60 + (levelId * 6);
  const targetScore = 2100 + (levelId * 300);

  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [timer, setTimer] = useState(roundSeconds);
  const [currentProperty, setCurrentProperty] = useState<ShapeProperty>(PROPERTIES[0]);
  const [options, setOptions] = useState<ShapeData[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [feedback, setFeedback] = useState<'correct' | 'wrong' | null>(null);
  const [gameActive, setGameActive] = useState(true);

  const endedRef = useRef(false);

  const finishRound = useCallback((won: boolean, finalScore: number) => {
    if (endedRef.current) return;
    endedRef.current = true;
    setGameActive(false);
    if (won) {
      const stars = finalScore >= targetScore * 1.85 ? 3 : finalScore >= targetScore * 1.35 ? 2 : 1;
      onVictory(stars, finalScore);
      return;
    }
    onGameOver(finalScore);
  }, [onGameOver, onVictory, targetScore]);

  const generateRound = useCallback(() => {
    const property = PROPERTIES[Math.floor(Math.random() * PROPERTIES.length)];
    const shuffled = [...SHAPES].sort(() => Math.random() - 0.5);
    const matching = shuffled.filter((shape) => property.check(shape));
    const nonMatching = shuffled.filter((shape) => !property.check(shape));

    const matchCount = Math.floor(Math.random() * 2) + 1;
    const roundOptions = [
      ...matching.slice(0, Math.min(matchCount, matching.length || 1)),
      ...nonMatching.slice(0, 6 - Math.min(matchCount, matching.length || 1)),
    ].sort(() => Math.random() - 0.5);

    setCurrentProperty(property);
    setOptions(roundOptions.slice(0, 6));
    setSelectedIds([]);
    setFeedback(null);
  }, []);

  useEffect(() => {
    endedRef.current = false;
    setScore(0);
    setStreak(0);
    setTimer(roundSeconds);
    setFeedback(null);
    setSelectedIds([]);
    setGameActive(true);
    generateRound();
  }, [generateRound, roundSeconds]);

  useEffect(() => {
    if (!gameActive || endedRef.current) return undefined;
    const interval = window.setInterval(() => {
      setTimer((previous) => {
        if (previous <= 1) {
          window.clearInterval(interval);
          finishRound(score >= targetScore, score);
          return 0;
        }
        return previous - 1;
      });
    }, 1000);
    return () => window.clearInterval(interval);
  }, [finishRound, gameActive, score, targetScore]);

  const handleShapeClick = (id: string) => {
    if (!gameActive || feedback) return;
    setSelectedIds((previous) => (
      previous.includes(id)
        ? previous.filter((current) => current !== id)
        : [...previous, id]
    ));
  };

  const handleCheck = () => {
    if (!gameActive || feedback || selectedIds.length === 0) return;

    const correctIds = options.filter((shape) => currentProperty.check(shape)).map((shape) => shape.id);
    const isCorrect = selectedIds.length === correctIds.length && selectedIds.every((id) => correctIds.includes(id));

    if (isCorrect) {
      setFeedback('correct');
      const earned = 500 + (streak * 50);
      const newScore = score + earned;
      setScore(newScore);
      setStreak((value) => value + 1);
      window.setTimeout(() => {
        if (newScore >= targetScore) {
          finishRound(true, newScore);
          return;
        }
        generateRound();
      }, 900);
      return;
    }

    setFeedback('wrong');
    setStreak(0);
    setScore((value) => Math.max(0, value - 150));
    window.setTimeout(() => {
      if (endedRef.current) return;
      setFeedback(null);
      setSelectedIds([]);
    }, 1200);
  };

  const feedbackLabel = useMemo(() => {
    if (!feedback) return '';
    return feedback === 'correct' ? 'EXCELLENT!' : 'TRY AGAIN!';
  }, [feedback]);

  return (
    <div className="fixed inset-0 flex flex-col items-center overflow-hidden bg-[#050a1a] font-sans text-white select-none">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_40%,#1e3a8a_0%,#050a1a_100%)]" />

      <div className="relative z-10 flex h-full w-full max-w-[600px] flex-col">
        <TopBar score={score} streak={streak} timer={timer.toString().padStart(2, '0')} />

        <div className="flex flex-1 flex-col items-center justify-center px-6 py-8">
          <motion.div
            key={currentProperty.id}
            initial={{ y: -20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="relative w-full overflow-hidden rounded-3xl border-2 border-blue-400/30 bg-blue-900/40 p-8 text-center shadow-2xl"
          >
            <div className="absolute left-0 top-0 h-1 w-full bg-blue-400/20" />
            <span className="mb-4 block text-xs font-black uppercase tracking-[0.2em] text-blue-300">Classification Goal</span>
            <h2 className="text-2xl font-black leading-tight text-white md:text-3xl">
              Select all shapes that:
              <span className="mt-2 block italic text-yellow-400 underline decoration-blue-400/50 underline-offset-8">
                {currentProperty.label}
              </span>
            </h2>
          </motion.div>

          <div className="mt-4 flex h-12 items-center justify-center">
            <AnimatePresence>
              {feedback && (
                <motion.div
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0, opacity: 0 }}
                  className={`flex items-center gap-2 rounded-full px-6 py-2 text-lg font-black shadow-xl ${
                    feedback === 'correct' ? 'bg-emerald-500 text-white' : 'bg-rose-500 text-white'
                  }`}
                >
                  {feedback === 'correct' ? <Check className="h-6 w-6" /> : <X className="h-6 w-6" />}
                  {feedbackLabel}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <div className="mt-4 grid w-full grid-cols-3 gap-4">
            {options.map((shape) => {
              const selected = selectedIds.includes(shape.id);
              return (
                <motion.button
                  key={shape.id}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => handleShapeClick(shape.id)}
                  className={`group relative aspect-square overflow-hidden rounded-2xl border-4 transition-all ${
                    selected
                      ? 'border-yellow-400 bg-white/10 shadow-[0_0_20px_rgba(250,204,21,0.3)]'
                      : 'border-blue-400/20 bg-blue-900/20 hover:border-blue-400/40'
                  }`}
                >
                  <div className={`${shape.color} text-white drop-shadow-lg transition-transform group-hover:scale-110`}>
                    {shape.icon}
                  </div>
                  <span className="absolute bottom-2 text-[10px] font-black uppercase tracking-tight text-blue-200 opacity-0 transition-opacity group-hover:opacity-100">
                    {shape.name}
                  </span>
                  {selected && (
                    <div className="absolute right-2 top-2 rounded-full bg-yellow-400 p-0.5 shadow-lg">
                      <Check className="h-3 w-3 font-black text-blue-900" />
                    </div>
                  )}
                </motion.button>
              );
            })}
          </div>

          <button
            onClick={handleCheck}
            disabled={selectedIds.length === 0 || feedback !== null || !gameActive}
            className={`mt-8 flex h-16 w-full items-center justify-center gap-3 rounded-2xl text-xl font-black tracking-widest transition-all shadow-xl ${
              selectedIds.length > 0 && !feedback && gameActive
                ? 'border-b-4 border-emerald-800 bg-gradient-to-b from-emerald-400 to-emerald-600 text-white active:translate-y-1 active:border-b-0'
                : 'cursor-not-allowed border-2 border-blue-400/10 bg-blue-900/40 text-blue-400/40'
            }`}
          >
            <Shapes className="h-6 w-6" />
            SUBMIT SELECTION
          </button>
        </div>

        <GameActionDock onBack={onBack} accentClass="text-white" />

        {!gameActive && (
          <div className="absolute inset-0 z-[100] flex flex-col items-center justify-center bg-blue-950/95 p-8 text-center">
            <Trophy className="mb-6 h-32 w-32 animate-bounce text-yellow-400" />
            <h2 className="mb-4 text-6xl font-black italic tracking-tighter">TIME'S UP!</h2>
            <div className="w-full max-w-sm rounded-3xl border-4 border-blue-400 bg-blue-900/60 p-8 shadow-2xl">
              <p className="mb-2 text-sm font-bold uppercase tracking-widest text-blue-200">Final Score</p>
              <p className="mb-4 text-6xl font-black text-white">{score.toLocaleString()}</p>
              <div className="flex justify-between border-t border-white/10 pt-4 text-sm font-bold text-blue-300">
                <span>BEST STREAK</span>
                <span>{streak}</span>
              </div>
            </div>
            <button
              onClick={onBack}
              className="mt-10 rounded-full bg-white px-12 py-4 text-2xl font-black text-blue-900 transition-transform hover:scale-105 shadow-[0_0_20px_rgba(255,255,255,0.4)]"
            >
              CONTINUE
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default PolygonPalaceGame;
