import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowUpRight,
  Check,
  FlipHorizontal,
  Ghost,
  Play,
  RotateCcw,
  RotateCw,
  Shapes,
  Skull,
  Timer as TimerIcon,
  Triangle,
  Trophy,
  X,
  Zap,
} from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import GameActionDock from '../components/GameActionDock';

interface RotationReflectionGameProps {
  levelId: number;
  avatarId: string;
  onVictory: (stars: number, score: number) => void;
  onGameOver: (score: number) => void;
  onBack: () => void;
}

interface GameState {
  rotation: number;
  isFlipped: boolean;
}

interface ShapeItem {
  id: string;
  name: string;
  icon: React.ReactNode;
}

const SHAPES: ShapeItem[] = [
  { id: 'tri', name: 'Triangle', icon: <Triangle className="h-24 w-24" /> },
  { id: 'arrow', name: 'Arrow', icon: <ArrowUpRight className="h-24 w-24" /> },
  { id: 'ghost', name: 'Ghost', icon: <Ghost className="h-24 w-24" /> },
  { id: 'skull', name: 'Skull', icon: <Skull className="h-24 w-24" /> },
  { id: 'zap', name: 'Bolt', icon: <Zap className="h-24 w-24" /> },
];

const ROTATION_STEPS = [0, 45, 90, 135, 180, 225, 270, 315];

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

const RotationReflectionGame: React.FC<RotationReflectionGameProps> = ({
  levelId,
  avatarId: _avatarId,
  onVictory,
  onGameOver,
  onBack,
}) => {
  const roundTime = 60 + (levelId * 6);
  const targetScore = 2200 + (levelId * 260);

  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [timer, setTimer] = useState(roundTime);
  const [gameActive, setGameActive] = useState(true);
  const [currentShape, setCurrentShape] = useState<ShapeItem>(SHAPES[0]);
  const [targetState, setTargetState] = useState<GameState>({ rotation: 90, isFlipped: false });
  const [userState, setUserState] = useState<GameState>({ rotation: 0, isFlipped: false });
  const [moves, setMoves] = useState(0);
  const [feedback, setFeedback] = useState<'correct' | 'wrong' | null>(null);

  const endedRef = useRef(false);

  const finishRound = useCallback((won: boolean, finalScore: number) => {
    if (endedRef.current) return;
    endedRef.current = true;
    setGameActive(false);
    if (won) {
      const stars = finalScore >= targetScore * 1.8 ? 3 : finalScore >= targetScore * 1.35 ? 2 : 1;
      onVictory(stars, finalScore);
      return;
    }
    onGameOver(finalScore);
  }, [onGameOver, onVictory, targetScore]);

  const generateProblem = useCallback(() => {
    const shape = SHAPES[Math.floor(Math.random() * SHAPES.length)];
    let targetRotation = 0;
    let targetFlip = false;

    do {
      targetRotation = ROTATION_STEPS[Math.floor(Math.random() * ROTATION_STEPS.length)];
      targetFlip = Math.random() > 0.5;
    } while (targetRotation === 0 && !targetFlip);

    setCurrentShape(shape);
    setTargetState({ rotation: targetRotation, isFlipped: targetFlip });
    setUserState({ rotation: 0, isFlipped: false });
    setMoves(0);
    setFeedback(null);
  }, []);

  useEffect(() => {
    endedRef.current = false;
    setScore(0);
    setStreak(0);
    setTimer(roundTime);
    setGameActive(true);
    setCurrentShape(SHAPES[0]);
    setTargetState({ rotation: 90, isFlipped: false });
    setUserState({ rotation: 0, isFlipped: false });
    setMoves(0);
    setFeedback(null);
    generateProblem();
  }, [generateProblem, roundTime]);

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

  const rotate = (direction: 'left' | 'right') => {
    if (!gameActive || feedback) return;
    setMoves((value) => value + 1);
    setUserState((previous) => {
      let nextRotation = previous.rotation + (direction === 'right' ? 45 : -45);
      if (nextRotation >= 360) nextRotation -= 360;
      if (nextRotation < 0) nextRotation += 360;
      return { ...previous, rotation: nextRotation };
    });
  };

  const flip = () => {
    if (!gameActive || feedback) return;
    setMoves((value) => value + 1);
    setUserState((previous) => ({ ...previous, isFlipped: !previous.isFlipped }));
  };

  const submit = () => {
    if (!gameActive || feedback) return;

    const isCorrect = userState.rotation === targetState.rotation && userState.isFlipped === targetState.isFlipped;
    if (isCorrect) {
      setFeedback('correct');
      const moveBonus = Math.max(0, 10 - moves) * 20;
      const earned = 500 + moveBonus + (streak * 50);
      const newScore = score + earned;
      setScore(newScore);
      setStreak((value) => value + 1);

      window.setTimeout(() => {
        if (newScore >= targetScore) {
          finishRound(true, newScore);
          return;
        }
        generateProblem();
      }, 900);
      return;
    }

    setFeedback('wrong');
    setStreak(0);
    window.setTimeout(() => {
      if (endedRef.current) return;
      setFeedback(null);
    }, 900);
  };

  const timerLabel = useMemo(() => timer.toString().padStart(2, '0'), [timer]);

  return (
    <div className="fixed inset-0 flex flex-col items-center overflow-hidden bg-[#050a1a] font-sans text-white select-none">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_40%,#1e3a8a_0%,#050a1a_100%)]" />

      <div className="relative z-10 flex h-full w-full max-w-[1000px] flex-col">
        <TopBar score={score} streak={streak} timer={timerLabel} />

        <div className="mx-4 mb-4 mt-4 flex flex-1 flex-col gap-4 md:flex-row">
          <div className="relative flex flex-1 flex-col items-center justify-center overflow-hidden rounded-3xl border-4 border-blue-400/30 bg-blue-900/20 p-8 shadow-2xl">
            <div className="absolute left-4 top-4 flex items-center gap-2 rounded-full border border-blue-400/30 bg-blue-400/20 px-3 py-1">
              <Target className="h-4 w-4 text-blue-300" />
              <span className="text-[10px] font-black uppercase tracking-widest text-blue-200">Target Orientation</span>
            </div>

            <div className="relative">
              <motion.div
                animate={{ rotate: targetState.rotation, scaleX: targetState.isFlipped ? -1 : 1 }}
                className="text-white drop-shadow-[0_0_15px_rgba(255,255,255,0.3)]"
              >
                {currentShape.icon}
              </motion.div>
              <div className="pointer-events-none absolute inset-0 -m-8 rounded-full border-2 border-dashed border-blue-400/10" />
            </div>

            <div className="mt-8 flex gap-4">
              <div className="rounded-lg border border-blue-400/20 bg-blue-950/60 px-4 py-1 text-[10px] font-bold text-blue-300">
                ROT: {targetState.rotation}°
              </div>
              <div className="rounded-lg border border-blue-400/20 bg-blue-950/60 px-4 py-1 text-[10px] font-bold text-blue-300">
                FLIP: {targetState.isFlipped ? 'YES' : 'NO'}
              </div>
            </div>
          </div>

          <div className="relative flex flex-1 flex-col items-center justify-center overflow-hidden rounded-3xl border-4 border-yellow-400/30 bg-blue-950/40 p-8 shadow-2xl">
            <div className="absolute left-4 top-4 flex items-center gap-2 rounded-full border border-yellow-400/30 bg-yellow-400/10 px-3 py-1">
              <Shapes className="h-4 w-4 text-yellow-300" />
              <span className="text-[10px] font-black uppercase tracking-widest text-yellow-200">Your Workspace</span>
            </div>

            <div className="absolute right-4 top-4 rounded-full border border-blue-400/20 bg-blue-900/60 px-3 py-1">
              <span className="text-[10px] font-black uppercase text-blue-300">Moves: {moves}</span>
            </div>

            <div className="relative">
              <motion.div
                animate={{ rotate: userState.rotation, scaleX: userState.isFlipped ? -1 : 1 }}
                transition={{ type: 'spring', stiffness: 200, damping: 20 }}
                className={`text-yellow-400 drop-shadow-[0_0_20px_rgba(250,204,21,0.4)] ${feedback === 'wrong' ? 'animate-rr-shake' : ''}`}
              >
                {currentShape.icon}
              </motion.div>
              <div className="pointer-events-none absolute inset-0 -m-8 rounded-full border-2 border-dashed border-yellow-400/10" />
            </div>

            <AnimatePresence>
              {feedback && (
                <motion.div
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0, opacity: 0 }}
                  className={`absolute inset-0 z-50 flex items-center justify-center rounded-2xl backdrop-blur-sm ${
                    feedback === 'correct' ? 'bg-emerald-500/20' : 'bg-rose-500/20'
                  }`}
                >
                  <div className={`rounded-full p-6 shadow-2xl ${feedback === 'correct' ? 'bg-emerald-500' : 'bg-rose-500'}`}>
                    {feedback === 'correct' ? <Check className="h-12 w-12 text-white" /> : <X className="h-12 w-12 text-white" />}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        <div className="flex h-40 items-center justify-center gap-4 border-t-4 border-blue-400/50 bg-blue-950/80 p-6 md:gap-8">
          <div className="flex gap-2">
            <button
              onClick={() => rotate('left')}
              className="flex h-16 w-16 flex-col items-center justify-center rounded-2xl border-b-4 border-blue-700 bg-blue-900/60 transition-all hover:bg-blue-800 active:translate-y-1 active:border-b-0"
            >
              <RotateCcw className="h-6 w-6 text-blue-300" />
              <span className="mt-1 text-[10px] font-black">-45°</span>
            </button>
            <button
              onClick={() => rotate('right')}
              className="flex h-16 w-16 flex-col items-center justify-center rounded-2xl border-b-4 border-blue-700 bg-blue-900/60 transition-all hover:bg-blue-800 active:translate-y-1 active:border-b-0"
            >
              <RotateCw className="h-6 w-6 text-blue-300" />
              <span className="mt-1 text-[10px] font-black">+45°</span>
            </button>
          </div>

          <button
            onClick={flip}
            className="flex h-16 w-24 flex-col items-center justify-center rounded-2xl border-b-4 border-indigo-700 bg-indigo-900/60 transition-all hover:bg-indigo-800 active:translate-y-1 active:border-b-0"
          >
            <FlipHorizontal className="h-8 w-8 text-indigo-300" />
            <span className="mt-1 text-[10px] font-black uppercase">Mirror</span>
          </button>

          <div className="mx-2 h-16 w-[2px] bg-white/10" />

          <button
            onClick={submit}
            disabled={feedback !== null || !gameActive}
            className={`flex h-20 items-center gap-4 rounded-2xl px-12 text-2xl font-black tracking-widest transition-all shadow-xl ${
              feedback === null && gameActive
                ? 'border-b-8 border-emerald-800 bg-gradient-to-b from-emerald-400 to-emerald-600 text-white active:translate-y-2 active:border-b-0'
                : 'cursor-not-allowed border-2 border-blue-400/10 bg-blue-900/40 text-blue-400/40'
            }`}
          >
            <Play className="h-8 w-8 fill-current" />
            SUBMIT
          </button>
        </div>

        <GameActionDock onBack={onBack} accentClass="text-white" />
      </div>

      {!gameActive && (
        <div className="absolute inset-0 z-[100] flex flex-col items-center justify-center bg-blue-950/95 p-8 text-center">
          <Trophy className="mb-6 h-32 w-32 animate-bounce text-yellow-400" />
          <h2 className="mb-4 text-6xl font-black italic tracking-tight">TIME'S UP!</h2>
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

      <style>{`
        @keyframes rr-shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-10px); }
          75% { transform: translateX(10px); }
        }
        .animate-rr-shake {
          animation: rr-shake 0.2s ease-in-out 0s 2;
        }
      `}</style>
    </div>
  );
};

export default RotationReflectionGame;
