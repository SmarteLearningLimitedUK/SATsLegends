import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Brain,
  Check,
  Flame,
  Play,
  Skull,
  Target,
  Timer as TimerIcon,
  Trophy,
  X,
  Zap,
} from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import GameActionDock from '../components/GameActionDock';

interface AngleArenaGameProps {
  levelId: number;
  avatarId: string;
  onVictory: (stars: number, score: number) => void;
  onGameOver: (score: number) => void;
  onBack: () => void;
}

interface MathProblem {
  id: string;
  question: string;
  answer: number;
  type: 'line' | 'point' | 'triangle' | 'opposite';
}

const PROBLEMS: MathProblem[] = [
  { id: '1', question: 'Angles on a straight line: 180° - 45° = ?', answer: 135, type: 'line' },
  { id: '2', question: 'Angles on a straight line: 180° - 120° = ?', answer: 60, type: 'line' },
  { id: '3', question: 'Angles around a point: 360° - 270° = ?', answer: 90, type: 'point' },
  { id: '4', question: 'Angles in a triangle: 180° - (60° + 60°) = ?', answer: 60, type: 'triangle' },
  { id: '5', question: 'Angles in a triangle: 180° - (90° + 45°) = ?', answer: 45, type: 'triangle' },
  { id: '6', question: 'Angles on a straight line: 180° - 155° = ?', answer: 25, type: 'line' },
  { id: '7', question: 'Angles around a point: 360° - 315° = ?', answer: 45, type: 'point' },
  { id: '8', question: 'Angles in a triangle: 180° - (30° + 120°) = ?', answer: 30, type: 'triangle' },
  { id: '9', question: 'Angles on a straight line: 180° - 72° = ?', answer: 108, type: 'line' },
  { id: '10', question: 'Angles around a point: 360° - 180° - 90° = ?', answer: 90, type: 'point' },
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

const AngleArenaGame: React.FC<AngleArenaGameProps> = ({
  levelId,
  avatarId: _avatarId,
  onVictory,
  onGameOver,
  onBack,
}) => {
  const roundTime = 90 + (levelId * 6);
  const targetScore = 2600 + (levelId * 280);

  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [timer, setTimer] = useState(roundTime);
  const [currentProblem, setCurrentProblem] = useState<MathProblem>(PROBLEMS[0]);
  const [userAngle, setUserAngle] = useState(45);
  const [isFiring, setIsFiring] = useState(false);
  const [projectilePath, setProjectilePath] = useState<{ x: number; y: number }[]>([]);
  const [feedback, setFeedback] = useState<'hit' | 'miss' | null>(null);
  const [gameActive, setGameActive] = useState(true);

  const endedRef = useRef(false);

  const generateProblem = useCallback(() => {
    setCurrentProblem((previous) => {
      const available = PROBLEMS.filter((problem) => problem.id !== previous.id);
      return available[Math.floor(Math.random() * available.length)];
    });
    setFeedback(null);
    setIsFiring(false);
    setProjectilePath([]);
  }, []);

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

  useEffect(() => {
    endedRef.current = false;
    setScore(0);
    setStreak(0);
    setTimer(roundTime);
    setCurrentProblem(PROBLEMS[0]);
    setUserAngle(45);
    setIsFiring(false);
    setProjectilePath([]);
    setFeedback(null);
    setGameActive(true);
  }, [roundTime]);

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

  const fire = () => {
    if (isFiring || !gameActive || endedRef.current) return;
    setIsFiring(true);

    const isCorrect = userAngle === currentProblem.answer;
    const steps = 30;
    const targetX = 80;
    const targetY = 60;
    const startX = 15;
    const startY = 70;
    const nextPath: { x: number; y: number }[] = [];

    for (let index = 0; index <= steps; index += 1) {
      const t = index / steps;
      const angleDiff = userAngle - currentProblem.answer;
      const x = startX + ((targetX - startX) * t);
      const peakHeight = 40;
      const arcY = startY + ((targetY - startY) * t) - (Math.sin(t * Math.PI) * peakHeight);
      const errorY = angleDiff * 0.5;
      nextPath.push({ x, y: arcY + (t * errorY) });
    }

    setProjectilePath(nextPath);

    window.setTimeout(() => {
      if (endedRef.current) return;
      if (isCorrect) {
        setFeedback('hit');
        setScore((value) => {
          const earned = 1000 + (streak * 100);
          const next = value + earned;
          if (next >= targetScore) {
            window.setTimeout(() => finishRound(true, next), 900);
          } else {
            window.setTimeout(generateProblem, 1200);
          }
          return next;
        });
        setStreak((value) => value + 1);
      } else {
        setFeedback('miss');
        setStreak(0);
        window.setTimeout(() => {
          if (endedRef.current) return;
          setIsFiring(false);
          setFeedback(null);
        }, 1200);
      }
    }, 1000);
  };

  const timerLabel = useMemo(() => timer.toString().padStart(2, '0'), [timer]);

  return (
    <div className="fixed inset-0 flex flex-col items-center overflow-hidden bg-[#050a1a] font-sans text-white select-none">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_40%,#1e3a8a_0%,#050a1a_100%)]" />

      <div className="relative z-10 flex h-full w-full max-w-[1000px] flex-col">
        <TopBar score={score} streak={streak} timer={timerLabel} />

        <div className="relative mx-4 mt-4 flex-1 overflow-hidden rounded-3xl border-4 border-blue-400/30 bg-blue-900/20 shadow-2xl">
          <div className="absolute bottom-0 left-0 right-0 h-16 border-t border-blue-400/20 bg-gradient-to-t from-blue-950 to-blue-900/40" />

          <div className="absolute bottom-16 left-[10%] flex flex-col items-center">
            <div className="relative h-20 w-12 rounded-t-full border-x-4 border-t-4 border-blue-400/50 bg-blue-800">
              <motion.div
                animate={{ rotate: isFiring ? -20 : -userAngle }}
                transition={{ type: 'spring', stiffness: 100 }}
                className="absolute bottom-4 left-1/2 h-24 w-2 origin-bottom -translate-x-1/2 rounded-full border-2 border-amber-800 bg-amber-600"
              >
                <div className="absolute left-1/2 top-0 flex h-8 w-8 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-2 border-amber-900 bg-amber-700">
                  <div className="h-4 w-4 rounded-full bg-gray-300 shadow-inner" />
                </div>
              </motion.div>
            </div>
            <span className="mt-2 text-[10px] font-black uppercase tracking-widest text-blue-300">Siege Engine</span>
          </div>

          <div className="absolute bottom-16 right-[15%] flex flex-col items-center">
            <AnimatePresence>
              {feedback !== 'hit' && (
                <motion.div exit={{ scale: 0, rotate: 180, opacity: 0 }} className="relative">
                  <div className="flex h-20 w-20 items-center justify-center rounded-2xl border-4 border-rose-500 bg-rose-900/60 shadow-[0_0_30px_rgba(244,63,94,0.3)]">
                    <Skull className="h-12 w-12 animate-pulse text-rose-400" />
                  </div>
                  <div className="absolute -top-12 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full border-2 border-blue-400 bg-white px-3 py-1 text-sm font-black text-blue-900 shadow-xl">
                    TARGET ACQUIRED
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
            {feedback === 'hit' && (
              <motion.div initial={{ scale: 0 }} animate={{ scale: 1.5 }} className="text-orange-500">
                <Flame className="h-16 w-16 fill-current" />
              </motion.div>
            )}
          </div>

          {isFiring && projectilePath.length > 0 && (
            <motion.div
              className="absolute z-50 h-6 w-6 rounded-full border-2 border-gray-500 bg-gray-300 shadow-[0_0_15px_white]"
              animate={{
                left: projectilePath.map((point) => `${point.x}%`),
                top: projectilePath.map((point) => `${point.y}%`),
              }}
              transition={{ duration: 1, ease: 'linear' }}
            />
          )}

          <div className="absolute left-1/2 top-8 w-full max-w-md -translate-x-1/2 px-4">
            <motion.div
              key={currentProblem.id}
              initial={{ y: -50, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              className="rounded-2xl border-2 border-blue-400 bg-blue-950/90 p-6 text-center shadow-2xl"
            >
              <div className="mb-2 flex items-center justify-center gap-2">
                <Brain className="h-4 w-4 text-purple-400" />
                <span className="text-[10px] font-black uppercase tracking-widest text-blue-300">Calculate Trajectory</span>
              </div>
              <h3 className="mb-1 text-xl font-black text-white md:text-2xl">
                {currentProblem.question}
              </h3>
              <p className="text-xs italic text-blue-300">Solve for the angle to hit the target!</p>
            </motion.div>
          </div>

          <AnimatePresence>
            {feedback && (
              <motion.div
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0, opacity: 0 }}
                className={`absolute left-1/2 top-1/2 z-[60] -translate-x-1/2 -translate-y-1/2 rounded-3xl border-4 px-10 py-4 text-4xl font-black text-white shadow-2xl ${
                  feedback === 'hit' ? 'border-emerald-300 bg-emerald-500' : 'border-rose-300 bg-rose-500'
                }`}
              >
                {feedback === 'hit' ? 'DIRECT HIT!' : 'MISCALCULATED!'}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="flex h-48 flex-col items-center justify-between gap-6 border-t-4 border-blue-400/50 bg-blue-950/80 p-6 md:flex-row">
          <div className="w-full max-w-md flex-1">
            <div className="mb-2 flex items-end justify-between">
              <div className="flex flex-col">
                <span className="text-[10px] font-black uppercase tracking-widest text-blue-300">Angle Meter</span>
                <span className="text-3xl font-black leading-none text-yellow-400">{userAngle}°</span>
              </div>
              <div className="flex items-center gap-2 rounded-lg border border-blue-400/20 bg-blue-900/40 px-3 py-1">
                <Target className="h-4 w-4 text-blue-400" />
                <span className="text-xs font-bold text-blue-200">Required: ???°</span>
              </div>
            </div>
            <input
              type="range"
              min="0"
              max="180"
              value={userAngle}
              onChange={(event) => setUserAngle(parseInt(event.target.value, 10))}
              disabled={isFiring || !gameActive}
              className="h-4 w-full cursor-pointer appearance-none rounded-full border-2 border-blue-400/30 bg-blue-900 accent-yellow-400"
            />
            <div className="mt-1 flex justify-between text-[10px] font-bold text-blue-400">
              <span>0°</span>
              <span>45°</span>
              <span>90°</span>
              <span>135°</span>
              <span>180°</span>
            </div>
          </div>

          <button
            onClick={fire}
            disabled={isFiring || !gameActive}
            className={`flex h-20 items-center gap-4 rounded-2xl px-12 text-2xl font-black tracking-tight transition-all shadow-xl ${
              !isFiring && gameActive
                ? 'border-b-8 border-orange-800 bg-gradient-to-b from-orange-400 to-orange-600 text-white active:translate-y-2 active:border-b-0'
                : 'cursor-not-allowed border-2 border-blue-400/10 bg-blue-900/40 text-blue-400/40'
            }`}
          >
            <Play className="h-8 w-8 fill-current" />
            FIRE!
          </button>
        </div>

        <GameActionDock onBack={onBack} accentClass="text-white" />
      </div>

      {!gameActive && (
        <div className="absolute inset-0 z-[100] flex flex-col items-center justify-center bg-blue-950/95 p-8 text-center">
          <Trophy className="mb-6 h-32 w-32 animate-bounce text-yellow-400" />
          <h2 className="mb-4 text-6xl font-black italic tracking-tight">SIEGE COMPLETE!</h2>
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
  );
};

export default AngleArenaGame;
