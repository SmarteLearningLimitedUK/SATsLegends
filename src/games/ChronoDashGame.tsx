/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useCallback, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { RotateCcw, Plus, Minus } from 'lucide-react';
import missionBackground from '../assets/maps/backgroundsforgames/Chrono Dash Time Trial.jpg';

interface ChronoDashGameProps {
  levelId: number;
  avatarId: string;
  onVictory: (stars: number, XP: number) => void;
  onGameOver: (XP: number) => void;
  onBack: () => void;
}

interface Time {
  hours: number;
  minutes: number;
}

const ROUND_DURATION_SECONDS = 90;

const scoreToStars = (XP: number) => {
  if (XP >= 1800) return 3;
  if (XP >= 1100) return 2;
  return 1;
};

const ROMAN_NUMERALS = ['XII', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI'];

const RomanNumeralFace: React.FC = () => (
  <div className="pointer-events-none absolute inset-0">
    {ROMAN_NUMERALS.map((label, index) => {
      const angle = ((index * 30) - 90) * (Math.PI / 180);
      const radius = 43;
      const x = 50 + (Math.cos(angle) * radius);
      const y = 50 + (Math.sin(angle) * radius);

      return (
        <div
          key={label}
          className="absolute -translate-x-1/2 -translate-y-1/2 text-[0.95rem] font-black tracking-[0.18em] text-orange-50 drop-shadow-[0_0_10px_rgba(255,180,64,0.45)] md:text-[1.08rem]"
          style={{
            left: `${x}%`,
            top: `${y}%`,
          }}
        >
          {label}
        </div>
      );
    })}
  </div>
);

const LavaClockFace: React.FC = () => (
  <div className="absolute inset-0 overflow-hidden rounded-full border border-orange-200/20 bg-[radial-gradient(circle_at_50%_28%,rgba(255,248,200,0.7),rgba(255,173,38,0.54)_16%,rgba(255,103,0,0.66)_36%,rgba(107,16,0,0.92)_72%,rgba(28,8,5,1)_100%)] shadow-[inset_0_0_24px_rgba(255,180,64,0.28),0_0_30px_rgba(255,98,0,0.22)]">
    <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,transparent_38%,rgba(255,120,20,0.22)_39%,rgba(255,120,20,0.12)_53%,transparent_54%)]" />
    <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(255,255,255,0.22)_0%,transparent_22%,transparent_48%,rgba(255,255,255,0.12)_49%,transparent_72%,rgba(255,255,255,0.12)_73%,transparent_100%)] opacity-60" />
    <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_18%,rgba(255,255,255,0.18),transparent_18%),radial-gradient(circle_at_80%_28%,rgba(255,255,255,0.14),transparent_16%),radial-gradient(circle_at_26%_76%,rgba(255,180,0,0.22),transparent_15%),radial-gradient(circle_at_74%_78%,rgba(255,145,0,0.18),transparent_14%)] opacity-80" />
    <div className="absolute inset-2 rounded-full border border-orange-100/14" />
    <div className="absolute inset-[18%] rounded-full border border-orange-200/14 bg-[radial-gradient(circle_at_50%_50%,rgba(255,220,120,0.12),rgba(255,120,0,0.06)_52%,transparent_100%)] blur-[0.5px]" />
  </div>
);

const ChronoDashGame: React.FC<ChronoDashGameProps> = ({
  levelId,
  avatarId: _avatarId,
  onVictory,
  onGameOver: _onGameOver,
  onBack,
}) => {
  const [gameState, setGameState] = useState<'playing' | 'complete'>('playing');
  const [targetTime, setTargetTime] = useState<Time>({ hours: 10, minutes: 10 });
  const [currentTime, setCurrentTime] = useState<Time>({ hours: 12, minutes: 0 });
  const [rotationHours, setRotationHours] = useState(360);
  const [rotationMinutes, setRotationMinutes] = useState(0);
  const [XP, setScore] = useState(0);
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
    startGame();
  };

  useEffect(() => {
    startGame();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
    onVictory(scoreToStars(XP), XP);
  }, [gameState, onVictory, XP, timeLeft]);

  const checkTime = () => {
    if (gameState !== 'playing') return;
    const targetH = targetTime.hours % 12;
    const currentH = currentTime.hours % 12;

    if (targetH === currentH && targetTime.minutes === currentTime.minutes) {
      const nextScore = XP + 100 + Math.floor(timeLeft / 6);
      setScore(nextScore);
      setFeedback('Time restored!');
      window.setTimeout(() => {
        if (!finishedRef.current) {
          loadNextQuestion();
        }
      }, 260);
      return;
    }

    setFeedback('Still out of sync. Try again!');
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

  const topPadding = 'pt-[calc(env(safe-area-inset-top)+0.35rem)]';
  const showRomanNumerals = levelId >= 4;

  return (
    <div className="relative h-full w-full overflow-hidden bg-[#0f172a] font-sans text-white select-none">
      <img
        src={missionBackground}
        alt=""
        aria-hidden="true"
        draggable={false}
        className="pointer-events-none absolute inset-0 h-full w-full object-cover object-center"
      />

      <div className={`relative z-10 flex h-full min-h-0 w-full flex-col items-center ${topPadding} px-4 pb-[calc(env(safe-area-inset-bottom)+4.8rem)]`}>
        <div className="w-full max-w-md min-h-0">
          <main className="flex w-full flex-col items-center gap-3">
            <motion.div
              initial={{ y: -20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              className="relative flex h-[4.2rem] w-full max-w-[16rem] items-center justify-center md:h-[4.8rem] md:max-w-[18rem]"
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

              <p className="mx-auto mt-2 max-w-[16rem] text-center text-[11px] font-bold leading-tight text-orange-100/90 md:max-w-[18rem] md:text-[12px]">
                The Monster Minds have disrupted the island timekeeper. Match the clock to restore the correct time.
              </p>
            </motion.div>

            <div className="relative">
              <div className="relative flex h-[12rem] w-[12rem] items-center justify-center rounded-full md:h-[14.4rem] md:w-[14.4rem]">
                <div className="absolute inset-0 rounded-full bg-[radial-gradient(circle_at_50%_50%,rgba(255,166,0,0.18),transparent_64%)] blur-[4px]" />
                <LavaClockFace />
                {showRomanNumerals && <RomanNumeralFace />}
                <div className="pointer-events-none absolute inset-[8%] rounded-full border border-orange-100/10 shadow-[inset_0_0_18px_rgba(255,255,255,0.05)]">
                  <div className="absolute inset-[6%] rounded-full border border-yellow-100/8" />
                </div>

                <motion.div
                  animate={{ rotate: rotationHours }}
                  transition={{ type: 'spring', stiffness: 100, damping: 15 }}
                  className="absolute left-1/2 top-1/2 z-20 h-[23%] w-[2.4%] origin-bottom -translate-x-1/2 -translate-y-full rounded-full bg-[linear-gradient(180deg,rgba(255,248,200,0.95),rgba(255,180,64,0.9)_42%,rgba(255,106,0,0.95)_82%,rgba(110,20,0,0.98))] shadow-[0_0_16px_rgba(255,162,55,0.4)]"
                />

                <motion.div
                  animate={{ rotate: rotationMinutes }}
                  transition={{ type: 'spring', stiffness: 120, damping: 12 }}
                  className="absolute left-1/2 top-1/2 z-30 h-[33%] w-[1.2%] origin-bottom -translate-x-1/2 -translate-y-full rounded-full bg-[linear-gradient(180deg,rgba(255,250,210,0.98),rgba(255,198,86,0.96)_34%,rgba(255,122,24,0.98)_72%,rgba(135,24,0,0.98))] shadow-[0_0_18px_rgba(255,138,0,0.46)]"
                />

                <div className="absolute left-1/2 top-1/2 z-40 h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full border border-yellow-100/20 bg-[radial-gradient(circle_at_35%_35%,rgba(255,255,255,0.9),rgba(255,223,154,0.9)_34%,rgba(255,140,0,0.96)_74%,rgba(112,24,0,1)_100%)] shadow-[0_0_14px_rgba(255,166,0,0.55)]" />
              </div>
            </div>

            <div className="grid w-full grid-cols-2 gap-3 md:gap-4">
              <div className="flex flex-col items-center gap-2">
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-300">Hour Hand</p>
                <div className="flex items-center gap-3">
                  <ControlButton onClick={() => adjustTime('hours', -1)} icon={<Minus size={20} />} color="blue" />
                  <ControlButton onClick={() => adjustTime('hours', 1)} icon={<Plus size={20} />} color="blue" />
                </div>
              </div>

              <div className="flex flex-col items-center gap-2">
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-purple-300">Minute Hand</p>
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
                    className={`text-sm font-black tracking-wide ${feedback.includes('Perfect') ? 'text-green-400' : 'text-amber-400'}`}
                  >
                    {feedback}
                  </motion.p>
                )}
              </AnimatePresence>
            </div>

            <div className="flex w-full flex-col gap-3">
              {gameState === 'playing' && (
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={checkTime}
                  className="ui-button-primary w-full rounded-2xl py-2.5 text-base font-black md:py-3 md:text-lg"
                >
                  RESTORE TIME
                </motion.button>
              )}

              <button
                onClick={resetRun}
                className="ui-button-secondary mt-2.5 flex min-h-[1.8rem] items-center justify-center gap-2 px-4 py-2 text-[10px] font-bold tracking-widest"
              >
                <RotateCcw size={14} /> RESET TIMEKEEPER
              </button>
            </div>
          </main>
        </div>
      </div>

      <div className="pointer-events-none absolute inset-x-0 bottom-[max(0.45rem,env(safe-area-inset-bottom))] z-40 flex justify-center">
        <div className="pointer-events-auto">
        </div>
      </div>
    </div>
  );
};

function ControlButton({
  onClick,
  icon,
}: {
  onClick: () => void;
  icon: React.ReactNode;
  color: 'blue' | 'purple';
}) {
  return (
    <motion.button
      whileHover={{ scale: 1.1 }}
      whileTap={{ scale: 0.9 }}
      onClick={onClick}
      className="ui-icon-button flex h-12 w-12 items-center justify-center rounded-xl"
    >
      <div className="text-white drop-shadow-md">{icon}</div>
    </motion.button>
  );
}

export default ChronoDashGame;

