/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useCallback, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { RotateCcw, Play, Clock, Plus, Minus } from 'lucide-react';
import GameActionDock from '../components/GameActionDock';
import clockFaceImage from '../assets/maps/clockfaceblank.png';
import missionBackground from '../assets/maps/harbour.jpg';

interface TimekeeperTempleGameProps {
  levelId: number;
  avatarId: string;
  onVictory: (stars: number, score: number) => void;
  onGameOver: (score: number) => void;
  onBack: () => void;
}

interface Time {
  hours: number;
  minutes: number;
}

const ROUND_DURATION_SECONDS = 90;

const scoreToStars = (score: number) => {
  if (score >= 1800) return 3;
  if (score >= 1100) return 2;
  return 1;
};

const TimekeeperTempleGame: React.FC<TimekeeperTempleGameProps> = ({
  levelId: _levelId,
  avatarId: _avatarId,
  onVictory,
  onGameOver: _onGameOver,
  onBack,
}) => {
  const [gameState, setGameState] = useState<'start' | 'playing' | 'complete'>('start');
  const [targetTime, setTargetTime] = useState<Time>({ hours: 10, minutes: 10 });
  const [currentTime, setCurrentTime] = useState<Time>({ hours: 12, minutes: 0 });
  const [rotationHours, setRotationHours] = useState(360);
  const [rotationMinutes, setRotationMinutes] = useState(0);
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(ROUND_DURATION_SECONDS);
  const [feedback, setFeedback] = useState<string | null>(null);
  const finishedRef = useRef(false);

  const generateRandomTime = useCallback((): Time => {
    const hours = Math.floor(Math.random() * 12) || 12;
    const minutes = Math.floor(Math.random() * 12) * 5;
    return { hours, minutes };
  }, []);

  const loadNextQuestion = useCallback(() => {
    const newTarget = generateRandomTime();
    setTargetTime(newTarget);
    setCurrentTime({ hours: 12, minutes: 0 });
    setRotationHours(360);
    setRotationMinutes(0);
    setFeedback(null);
  }, [generateRandomTime]);

  const startGame = () => {
    finishedRef.current = false;
    setScore(0);
    setTimeLeft(ROUND_DURATION_SECONDS);
    setGameState('playing');
    loadNextQuestion();
  };

  const resetRun = () => {
    finishedRef.current = false;
    setTargetTime({ hours: 10, minutes: 10 });
    setCurrentTime({ hours: 12, minutes: 0 });
    setRotationHours(360);
    setRotationMinutes(0);
    setScore(0);
    setTimeLeft(ROUND_DURATION_SECONDS);
    setFeedback(null);
    setGameState('start');
  };

  useEffect(() => {
    if (gameState !== 'playing') return undefined;
    const timerId = window.setInterval(() => {
      setTimeLeft((previous) => {
        if (previous <= 1) {
          return 0;
        }
        return previous - 1;
      });
    }, 1000);
    return () => window.clearInterval(timerId);
  }, [gameState]);

  useEffect(() => {
    if (gameState !== 'playing' || timeLeft > 0 || finishedRef.current) return;
    finishedRef.current = true;
    setGameState('complete');
    onVictory(scoreToStars(score), score);
  }, [gameState, onVictory, score, timeLeft]);

  const checkTime = () => {
    if (gameState !== 'playing') return;
    const targetH = targetTime.hours % 12;
    const currentH = currentTime.hours % 12;

    if (targetH === currentH && targetTime.minutes === currentTime.minutes) {
      const nextScore = score + 100 + Math.floor(timeLeft / 6);
      setScore(nextScore);
      setFeedback('Perfect Match!');
      window.setTimeout(() => {
        if (!finishedRef.current) {
          loadNextQuestion();
        }
      }, 260);
      return;
    }

    setFeedback('Not quite right. Try again!');
    window.setTimeout(() => setFeedback(null), 2000);
  };

  const adjustTime = (type: 'hours' | 'minutes', amount: number) => {
    if (gameState !== 'playing') return;

    if (type === 'hours') {
      setRotationHours((prev) => prev + (amount * 30));
      setCurrentTime((prev) => {
        let newHours = prev.hours + amount;
        if (newHours > 12) newHours = 1;
        if (newHours < 1) newHours = 12;
        return { ...prev, hours: newHours };
      });
      return;
    }

    setRotationMinutes((prev) => prev + (amount * 6));
    setCurrentTime((prev) => {
      let newMinutes = prev.minutes + amount;
      if (newMinutes >= 60) newMinutes = 0;
      if (newMinutes < 0) newMinutes = 55;
      return { ...prev, minutes: newMinutes };
    });
  };

  const topPadding = 'pt-[calc(env(safe-area-inset-top)+0.85rem)]';

  return (
    <div className="fixed inset-0 overflow-hidden bg-[#0f172a] font-sans text-white select-none">
      <img
        src={missionBackground}
        alt=""
        aria-hidden="true"
        draggable={false}
        className="pointer-events-none absolute inset-0 h-full w-full object-cover object-center"
      />
      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(15,23,42,0.72),rgba(15,23,42,0.35)_45%,rgba(15,23,42,0.72))]" />

      <div className={`relative z-10 flex h-full w-full flex-col items-center ${topPadding} px-4 pb-[max(6.2rem,calc(env(safe-area-inset-bottom)+5.2rem))]`}>
        <div className="w-full max-w-md">
          <main className="flex w-full flex-col items-center gap-3">
            <motion.div
              initial={{ y: -20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              className="relative flex h-[4.8rem] w-full max-w-[18rem] items-center justify-center"
            >
              <div className="absolute inset-0 overflow-hidden rounded-2xl border-4 border-[#334155] bg-[#1e293b] shadow-[0_0_30px_rgba(59,130,246,0.2)]">
                <div className="absolute inset-0 bg-gradient-to-b from-white/5 to-transparent" />
                <div className="absolute inset-0 m-1 rounded-xl border border-white/10" />
              </div>

              <div className="relative flex items-center gap-2">
                <span className="text-4xl font-black tracking-tighter text-blue-400 drop-shadow-[0_0_10px_rgba(96,165,250,0.5)]">
                  {targetTime.hours.toString().padStart(2, '0')}
                </span>
                <motion.span
                  animate={{ opacity: [1, 0.3, 1] }}
                  transition={{ repeat: Infinity, duration: 1 }}
                  className="text-3xl font-black text-blue-400/50"
                >
                  :
                </motion.span>
                <span className="text-4xl font-black tracking-tighter text-blue-400 drop-shadow-[0_0_10px_rgba(96,165,250,0.5)]">
                  {targetTime.minutes.toString().padStart(2, '0')}
                </span>
              </div>
            </motion.div>

            <div className="relative">
              <div className="relative flex h-[14.4rem] w-[14.4rem] items-center justify-center rounded-full">
                <div className="absolute inset-0 rounded-full bg-blue-900/20 blur-[2px]" />
                <div className="absolute inset-0 overflow-hidden rounded-full">
                  <img
                    src={clockFaceImage}
                    alt="Clock Face"
                    className="h-full w-full object-cover"
                  />
                </div>

                <motion.div
                  animate={{ rotate: rotationHours }}
                  transition={{ type: 'spring', stiffness: 100, damping: 15 }}
                  className="absolute left-1/2 top-1/2 z-20 h-[23%] w-[2.4%] origin-bottom -translate-x-1/2 -translate-y-full rounded-full bg-gradient-to-t from-white to-gray-300 shadow-lg"
                />

                <motion.div
                  animate={{ rotate: rotationMinutes }}
                  transition={{ type: 'spring', stiffness: 120, damping: 12 }}
                  className="absolute left-1/2 top-1/2 z-30 h-[33%] w-[1.2%] origin-bottom -translate-x-1/2 -translate-y-full rounded-full bg-gradient-to-t from-blue-400 to-blue-200 shadow-lg"
                />

                <div className="absolute left-1/2 top-1/2 z-40 h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full border border-black/20 bg-gradient-to-br from-slate-100 to-slate-400 shadow-lg" />
              </div>
            </div>

            <div className="grid w-full grid-cols-2 gap-4">
              <div className="flex flex-col items-center gap-2">
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-300">Hours</p>
                <div className="flex items-center gap-3">
                  <ControlButton onClick={() => adjustTime('hours', -1)} icon={<Minus size={20} />} color="blue" />
                  <ControlButton onClick={() => adjustTime('hours', 1)} icon={<Plus size={20} />} color="blue" />
                </div>
              </div>

              <div className="flex flex-col items-center gap-2">
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-purple-300">Minutes</p>
                <div className="flex items-center gap-3">
                  <ControlButton onClick={() => adjustTime('minutes', -5)} icon={<Minus size={20} />} color="purple" />
                  <ControlButton onClick={() => adjustTime('minutes', 5)} icon={<Plus size={20} />} color="purple" />
                </div>
              </div>
            </div>

            <div className="flex h-6 items-center justify-center">
              <AnimatePresence>
                {feedback && (
                  <motion.p
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className={`text-sm font-black tracking-wide ${feedback.includes('Perfect') ? 'text-green-400' : 'text-red-400'}`}
                  >
                    {feedback}
                  </motion.p>
                )}
              </AnimatePresence>
            </div>

            <div className="flex w-full flex-col gap-2">
              {gameState === 'playing' && (
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={checkTime}
                  className="w-full rounded-2xl border border-blue-400/20 bg-gradient-to-r from-blue-600 to-blue-500 py-3 text-lg font-black shadow-[0_8px_0_rgb(30,58,138)] transition-all active:translate-y-1 active:shadow-none"
                >
                  SUBMIT TIME
                </motion.button>
              )}

              <button
                onClick={resetRun}
                className="flex items-center justify-center gap-2 text-xs font-bold tracking-widest text-gray-500 transition-colors hover:text-white"
              >
                <RotateCcw size={14} /> RESET CLOCK
              </button>
            </div>
          </main>
        </div>
      </div>

      <AnimatePresence>
        {gameState === 'start' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-50 flex items-center justify-center bg-black/80 p-8 backdrop-blur-xl"
          >
            <div className="flex flex-col items-center gap-8 text-center">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
                className="relative"
              >
                <Clock size={100} className="text-blue-500 opacity-20" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <Play size={40} className="ml-1 text-white" />
                </div>
              </motion.div>

              <div>
                <h1 className="mb-2 bg-gradient-to-b from-white to-gray-400 bg-clip-text text-4xl font-black tracking-tighter text-transparent">
                  CHRONO DASH
                </h1>
                <p className="mx-auto max-w-[220px] text-sm leading-relaxed font-medium text-blue-300">
                  Use the buttons to sync the analogue clock with the digital display.
                </p>
              </div>

              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={startGame}
                className="rounded-full border-b-4 border-blue-800 bg-blue-600 px-12 py-5 text-xl font-black shadow-2xl shadow-blue-500/40"
              >
                START DASH
              </motion.button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="pointer-events-none absolute inset-x-0 bottom-[max(0.45rem,env(safe-area-inset-bottom))] z-40 flex justify-center">
        <div className="pointer-events-auto">
          <GameActionDock onBack={onBack} compact />
        </div>
      </div>
    </div>
  );
};

function ControlButton({
  onClick,
  icon,
  color,
}: {
  onClick: () => void;
  icon: React.ReactNode;
  color: 'blue' | 'purple';
}) {
  const baseColor = color === 'blue' ? 'from-blue-500 to-blue-700' : 'from-purple-500 to-purple-700';
  const borderColor = color === 'blue' ? 'border-blue-400/30' : 'border-purple-400/30';

  return (
    <motion.button
      whileHover={{ scale: 1.1 }}
      whileTap={{ scale: 0.9 }}
      onClick={onClick}
      className={`flex h-12 w-12 items-center justify-center rounded-xl border ${borderColor} bg-gradient-to-b ${baseColor} shadow-[0_4px_0_rgba(0,0,0,0.5)] transition-all active:translate-y-1 active:shadow-none`}
    >
      <div className="text-white drop-shadow-md">{icon}</div>
    </motion.button>
  );
}

export default TimekeeperTempleGame;
