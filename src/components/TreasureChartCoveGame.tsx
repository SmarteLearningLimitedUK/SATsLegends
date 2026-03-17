import React, { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import confetti from 'canvas-confetti';
import GameplayHUD from './GameplayHUD';
import GameActionDock from './GameActionDock';
import { AVATARS } from '../constants';

interface TreasureChartCoveGameProps {
  levelId: number;
  avatarId: string;
  onVictory: (stars: number, score: number) => void;
  onGameOver: (score: number) => void;
  onBack: () => void;
}

type ChartRoundMode = 'highest' | 'difference' | 'line' | 'table';

interface ShipDatum {
  id: string;
  label: string;
  value: number;
  color: string;
}

interface ChartRound {
  mode: ChartRoundMode;
  title: string;
  prompt: string;
  support: string;
  boardLabel: string;
  ships: ShipDatum[];
  lineDays?: Array<{ label: string; value: number }>;
  options: string[];
  answer: string;
}

const MAX_HEARTS = 4;
const ROUND_GOAL_BY_LEVEL = [0, 4, 5, 5, 6];
const SHIP_POOL = [
  { id: 'sun', label: 'Sunfin', color: 'from-amber-300 to-yellow-500' },
  { id: 'mist', label: 'Mistwake', color: 'from-sky-300 to-cyan-500' },
  { id: 'jade', label: 'Jadehook', color: 'from-emerald-300 to-green-500' },
  { id: 'ruby', label: 'Ruby Tide', color: 'from-rose-300 to-red-500' },
];

const randomInt = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;

const pickShips = (count: number) => {
  const pool = [...SHIP_POOL].sort(() => Math.random() - 0.5);
  return pool.slice(0, count).map((ship, index) => ({
    ...ship,
    value: randomInt(3, 9) + index,
  }));
};

const createRound = (levelId: number): ChartRound => {
  const modes: ChartRoundMode[] = ['highest', 'difference', 'line'];
  if (levelId >= 2) modes.push('table');
  const mode = modes[randomInt(0, modes.length - 1)];

  if (mode === 'highest') {
    const ships = pickShips(4);
    const winner = ships.reduce((best, ship) => (ship.value > best.value ? ship : best), ships[0]);
    return {
      mode,
      title: 'Most Treasure',
      prompt: 'Tap the ship with the highest treasure haul.',
      support: 'Read the coin-stack chart, then pick the richest ship.',
      boardLabel: 'Treasure haul chart',
      ships,
      options: ships.map((ship) => ship.label),
      answer: winner.label,
    };
  }

  if (mode === 'difference') {
    const ships = pickShips(4);
    const first = ships[0];
    const second = ships[1];
    const difference = Math.abs(first.value - second.value);
    const options = Array.from(new Set([
      difference.toString(),
      Math.max(1, difference + 1).toString(),
      Math.max(1, difference + 2).toString(),
      Math.max(1, difference - 1).toString(),
    ])).slice(0, 4);
    while (options.length < 4) options.push((difference + options.length + 1).toString());

    return {
      mode,
      title: 'Find The Difference',
      prompt: `How many more chests did ${first.label} bring than ${second.label}?`,
      support: 'Compare the two chart values, then choose the right treasure pile.',
      boardLabel: 'Dock inventory chart',
      ships,
      options: options.sort(() => Math.random() - 0.5),
      answer: difference.toString(),
    };
  }

  if (mode === 'line') {
    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'].map((label, index) => ({
      label,
      value: randomInt(2, 8) + (index % 2 === 0 ? 1 : 0),
    }));
    const peak = days.reduce((best, day) => (day.value > best.value ? day : best), days[0]);
    const ships = pickShips(3);

    return {
      mode,
      title: 'Best Treasure Day',
      prompt: 'Which day had the highest treasure count?',
      support: 'Read the rope line and pick the day where the treasure peaked.',
      boardLabel: 'Treasure over five days',
      ships,
      lineDays: days,
      options: days.map((day) => day.label),
      answer: peak.label,
    };
  }

  const ships = pickShips(4);
  const target = ships[randomInt(0, ships.length - 1)];
  return {
    mode: 'table',
    title: 'Sort To The Correct Dock',
    prompt: `Which ship should dock at the ${target.value}-chest marker?`,
    support: 'Use the harbour ledger to match the ship to the correct dock value.',
    boardLabel: 'Harbour ledger',
    ships,
    options: ships.map((ship) => ship.label),
    answer: target.label,
  };
};

const ShipCard: React.FC<{
  label: string;
  color: string;
  active?: boolean;
  small?: boolean;
}> = ({ label, color, active = false, small = false }) => (
  <div className={`relative overflow-hidden rounded-[1.4rem] border px-3 py-3 shadow-[0_18px_28px_rgba(15,23,42,0.22)] ${active ? 'border-amber-200/55 bg-[linear-gradient(180deg,rgba(251,191,36,0.24),rgba(15,23,42,0.28))]' : 'border-white/12 bg-[linear-gradient(180deg,rgba(255,255,255,0.08),rgba(15,23,42,0.5))]'} ${small ? 'min-h-[6rem]' : 'min-h-[7rem]'}`}>
    <div className="absolute inset-x-[12%] top-[10%] h-[18%] rounded-full bg-white/12 blur-md" />
    <div className="relative flex flex-col items-center">
      <div className={`relative ${small ? 'h-10 w-16' : 'h-12 w-20'}`}>
        <div className={`absolute bottom-0 left-[6%] right-[6%] h-[44%] rounded-[40%_60%_45%_55%/42%_38%_62%_58%] bg-gradient-to-b ${color} shadow-[0_10px_16px_rgba(15,23,42,0.16)]`} />
        <div className="absolute left-1/2 top-[6%] h-[38%] w-[5%] -translate-x-1/2 rounded-full bg-amber-300" />
        <div className="absolute left-[44%] top-[10%] h-[22%] w-[26%] -skew-x-[12deg] rounded-[0.35rem] bg-[linear-gradient(180deg,#f8fafc,#dbeafe)]" />
      </div>
      <div className={`mt-2 text-center font-black tracking-tight text-white ${small ? 'text-sm' : 'text-base md:text-lg'}`}>{label}</div>
    </div>
  </div>
);

const CoinBarBoard: React.FC<{ ships: ShipDatum[]; label: string }> = ({ ships, label }) => {
  const maxValue = Math.max(...ships.map((ship) => ship.value));
  return (
    <div className="rounded-[1.8rem] border border-white/12 bg-[linear-gradient(180deg,rgba(255,255,255,0.08),rgba(15,23,42,0.24))] p-4 shadow-[0_18px_28px_rgba(15,23,42,0.22)]">
      <div className="text-[11px] font-black uppercase tracking-[0.18em] text-white/62 md:text-xs">{label}</div>
      <div className="mt-3 grid grid-cols-4 items-end gap-3 md:gap-4">
        {ships.map((ship) => (
          <div key={ship.id} className="flex flex-col items-center gap-2">
            <div className="flex h-36 w-full items-end justify-center md:h-44">
              <div className="relative flex w-full max-w-[4rem] flex-col justify-end gap-1">
                {Array.from({ length: ship.value }).map((_, index) => (
                  <div
                    key={`${ship.id}-coin-${index}`}
                    className={`h-3 rounded-full bg-gradient-to-r ${ship.color} shadow-[0_3px_8px_rgba(15,23,42,0.16)]`}
                    style={{ opacity: 0.4 + ((index + 1) / (maxValue + 2)) }}
                  />
                ))}
              </div>
            </div>
            <div className="text-center">
              <div className="text-sm font-black text-white md:text-base">{ship.label}</div>
              <div className="text-xs font-bold text-amber-100/80 md:text-sm">{ship.value} chests</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

const LineGraphBoard: React.FC<{ days: Array<{ label: string; value: number }>; label: string }> = ({ days, label }) => {
  const maxValue = Math.max(...days.map((day) => day.value));
  const points = days.map((day, index) => {
    const x = 14 + (index * (72 / Math.max(days.length - 1, 1)));
    const y = 78 - ((day.value / maxValue) * 54);
    return { ...day, x, y };
  });
  const path = points.map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`).join(' ');

  return (
    <div className="rounded-[1.8rem] border border-white/12 bg-[linear-gradient(180deg,rgba(255,255,255,0.08),rgba(15,23,42,0.24))] p-4 shadow-[0_18px_28px_rgba(15,23,42,0.22)]">
      <div className="text-[11px] font-black uppercase tracking-[0.18em] text-white/62 md:text-xs">{label}</div>
      <svg viewBox="0 0 100 100" className="mt-3 h-48 w-full md:h-56">
        <rect x="6" y="8" width="88" height="80" rx="8" fill="rgba(15,23,42,0.18)" stroke="rgba(255,255,255,0.12)" />
        {Array.from({ length: 4 }).map((_, index) => (
          <line
            key={`grid-${index}`}
            x1="10"
            x2="90"
            y1={24 + (index * 16)}
            y2={24 + (index * 16)}
            stroke="rgba(255,255,255,0.1)"
            strokeDasharray="3 3"
          />
        ))}
        <path d={path} fill="none" stroke="rgba(250,204,21,0.95)" strokeWidth="3.6" strokeLinecap="round" strokeLinejoin="round" />
        {points.map((point) => (
          <g key={point.label}>
            <circle cx={point.x} cy={point.y} r="4.6" fill="#38bdf8" stroke="#ecfeff" strokeWidth="2" />
            <text x={point.x} y="94" textAnchor="middle" fontSize="6.4" fontWeight="800" fill="#e0f2fe">
              {point.label}
            </text>
          </g>
        ))}
      </svg>
    </div>
  );
};

const TableBoard: React.FC<{ ships: ShipDatum[]; label: string }> = ({ ships, label }) => (
  <div className="rounded-[1.8rem] border border-white/12 bg-[linear-gradient(180deg,rgba(255,255,255,0.08),rgba(15,23,42,0.24))] p-4 shadow-[0_18px_28px_rgba(15,23,42,0.22)]">
    <div className="text-[11px] font-black uppercase tracking-[0.18em] text-white/62 md:text-xs">{label}</div>
    <div className="mt-3 space-y-2">
      {ships.map((ship) => (
        <div key={ship.id} className="grid grid-cols-[1fr_auto] items-center rounded-[1rem] border border-white/10 bg-black/14 px-4 py-3">
          <div className="text-sm font-black text-white md:text-base">{ship.label}</div>
          <div className="rounded-full border border-amber-200/20 bg-amber-400/10 px-3 py-1 text-sm font-black text-amber-50">{ship.value} chests</div>
        </div>
      ))}
    </div>
  </div>
);

const TreasureChartCoveGame: React.FC<TreasureChartCoveGameProps> = ({
  levelId,
  avatarId,
  onVictory,
  onGameOver,
  onBack,
}) => {
  const avatar = useMemo(() => AVATARS.find((item) => item.id === avatarId) || AVATARS[0], [avatarId]);
  const totalRounds = ROUND_GOAL_BY_LEVEL[levelId] || 5;
  const targetScore = 860 + (levelId * 220);
  const timeoutsRef = useRef<number[]>([]);

  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(84 + (levelId * 8));
  const [hearts, setHearts] = useState(MAX_HEARTS);
  const [roundNumber, setRoundNumber] = useState(1);
  const [streak, setStreak] = useState(0);
  const [round, setRound] = useState<ChartRound>(() => createRound(levelId));
  const [feedback, setFeedback] = useState<null | { type: 'success' | 'error'; title: string; subtitle: string }>(null);
  const [isFinished, setIsFinished] = useState(false);

  const progress = Math.min((score / targetScore) * 100, 100);

  const clearTimers = () => {
    timeoutsRef.current.forEach((timeoutId) => window.clearTimeout(timeoutId));
    timeoutsRef.current = [];
  };

  useEffect(() => () => clearTimers(), []);

  useEffect(() => {
    clearTimers();
    setScore(0);
    setTimeLeft(84 + (levelId * 8));
    setHearts(MAX_HEARTS);
    setRoundNumber(1);
    setStreak(0);
    setRound(createRound(levelId));
    setFeedback(null);
    setIsFinished(false);
  }, [levelId]);

  useEffect(() => {
    if (isFinished) return undefined;
    const timerId = window.setInterval(() => {
      setTimeLeft((previous) => {
        if (previous <= 1) {
          window.clearInterval(timerId);
          setIsFinished(true);
          onGameOver(score);
          return 0;
        }
        return previous - 1;
      });
    }, 1000);
    return () => window.clearInterval(timerId);
  }, [isFinished, onGameOver, score]);

  const finishVictory = (finalScore: number) => {
    if (isFinished) return;
    setIsFinished(true);
    const stars = finalScore >= targetScore * 1.45 && hearts >= 3
      ? 3
      : finalScore >= targetScore && hearts >= 2
        ? 2
        : 1;
    confetti({
      particleCount: 165,
      spread: 70,
      origin: { y: 0.62 },
      colors: ['#fcd34d', '#ffffff', '#60a5fa', '#34d399'],
    });
    onVictory(stars, finalScore);
  };

  const nextRound = (updatedScore: number) => {
    if (roundNumber >= totalRounds) {
      finishVictory(updatedScore);
      return;
    }
    const timeoutId = window.setTimeout(() => {
      setRoundNumber((previous) => previous + 1);
      setRound(createRound(levelId));
      setFeedback(null);
    }, 1150);
    timeoutsRef.current.push(timeoutId);
  };

  const loseHeart = (subtitle: string) => {
    if (feedback || isFinished) return;
    const nextHearts = hearts - 1;
    setHearts(nextHearts);
    setStreak(0);
    setFeedback({ type: 'error', title: 'Wrong Read', subtitle });
    if (nextHearts <= 0) {
      const timeoutId = window.setTimeout(() => {
        setIsFinished(true);
        onGameOver(score);
      }, 950);
      timeoutsRef.current.push(timeoutId);
      return;
    }
    const timeoutId = window.setTimeout(() => setFeedback(null), 950);
    timeoutsRef.current.push(timeoutId);
  };

  const handleChoice = (choice: string) => {
    if (feedback || isFinished) return;
    if (choice !== round.answer) {
      loseHeart(`The correct answer was ${round.answer}.`);
      return;
    }

    const points = 155 + (streak * 24) + (round.mode === 'line' ? 28 : 0);
    const updatedScore = score + points;
    setScore(updatedScore);
    setStreak((previous) => previous + 1);
    setFeedback({ type: 'success', title: 'Treasure Found!', subtitle: `+${points} score` });
    confetti({
      particleCount: 42,
      spread: 48,
      origin: { y: 0.72 },
      colors: ['#fcd34d', '#ffffff', '#60a5fa'],
    });
    nextRound(updatedScore);
  };

  return (
    <div className="relative flex h-full w-full flex-col overflow-hidden bg-[linear-gradient(180deg,#05294d_0%,#0b4f7d_42%,#072037_100%)]">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute inset-x-[-10%] top-[-12%] h-[42%] rounded-full bg-cyan-200/14 blur-3xl" />
        <div className="absolute inset-x-0 top-0 h-[58%] bg-[linear-gradient(180deg,rgba(125,211,252,0.26),rgba(96,165,250,0.08),transparent)]" />
        <div className="absolute inset-x-0 bottom-0 h-[38%] bg-[linear-gradient(180deg,rgba(8,47,73,0),rgba(8,47,73,0.18),rgba(15,23,42,0.94))]" />
        <div className="absolute inset-x-0 bottom-[14%] h-[20%] bg-[radial-gradient(circle_at_center,rgba(125,211,252,0.18),rgba(59,130,246,0.08),transparent_72%)]" />
      </div>

      <div className="relative z-10 flex h-full min-h-0 w-full flex-1 flex-col items-center gap-2 p-2 md:gap-4 md:p-4">
        <div className="w-full max-w-6xl">
          <GameplayHUD
            title="Treasure Chart Cove"
            avatar={avatar}
            score={score}
            targetScore={targetScore}
            timeLeft={timeLeft}
            progress={progress}
            compact
            accentText="text-amber-950"
            accentSoftBg="bg-amber-100/84"
            accentBorder="border-amber-200/88"
            progressBar="bg-gradient-to-r from-cyan-300 via-sky-400 to-emerald-300"
            statLabel="Round"
            statValue={`${roundNumber}/${totalRounds}`}
          />
        </div>

      <div className="licensed-board-frame relative flex w-full max-w-6xl min-h-0 flex-1 overflow-hidden rounded-[2rem] border border-white/12 bg-[linear-gradient(180deg,rgba(255,255,255,0.06),rgba(255,255,255,0.02))] shadow-[0_28px_64px_rgba(0,0,0,0.34)] md:rounded-[2.6rem]">
          <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.08),rgba(255,255,255,0.02)_28%,rgba(15,23,42,0.16)_100%)]" />
          <div className="absolute inset-x-[6%] bottom-[14%] h-[22%] rounded-[50%] bg-[radial-gradient(circle_at_center,rgba(251,191,36,0.22),rgba(59,130,246,0.12),transparent_72%)]" />

          <div className="absolute left-4 top-3 z-20 flex items-center gap-2 rounded-full border border-white/12 bg-slate-950/42 px-3 py-2 shadow-[0_10px_24px_rgba(2,6,23,0.24)] md:left-5 md:top-5 md:px-4">
            {Array.from({ length: MAX_HEARTS }).map((_, index) => (
              <div key={index} className={`h-5 w-5 rounded-full ${index < hearts ? 'bg-[radial-gradient(circle_at_30%_25%,#fca5a5,#ef4444_60%,#991b1b)] shadow-[0_6px_12px_rgba(239,68,68,0.35)]' : 'bg-white/12'} md:h-6 md:w-6`} />
            ))}
          </div>

          <div className="relative z-10 flex h-full w-full flex-col px-3 pb-4 pt-20 md:px-6 md:pb-6 md:pt-24">
            <div className="flex justify-center">
              <div className="max-w-[94%] rounded-[1.5rem] border border-orange-200/22 bg-[linear-gradient(180deg,rgba(146,64,14,0.96),rgba(120,53,15,0.98))] px-5 py-3 text-center shadow-[inset_0_1px_0_rgba(255,255,255,0.16),0_16px_30px_rgba(120,53,15,0.24)] md:px-7 md:py-4">
                <div className="text-base font-black tracking-tight text-amber-50 md:text-[1.9rem]">{round.title}</div>
                <div className="mt-1 text-xs font-bold text-amber-100/84 md:text-base">{round.prompt}</div>
              </div>
            </div>

            <div className="mt-3 grid min-h-0 flex-1 grid-cols-1 gap-4 md:mt-4 md:grid-cols-[1.02fr_0.98fr] md:gap-6">
              <div className="flex min-h-[23rem] flex-col justify-between gap-4 rounded-[2rem] border border-white/12 bg-[linear-gradient(180deg,rgba(8,47,73,0.34),rgba(15,23,42,0.26))] p-4 shadow-[0_24px_40px_rgba(2,6,23,0.22)] md:min-h-[31rem] md:p-5">
                {round.mode === 'line' && round.lineDays ? (
                  <LineGraphBoard days={round.lineDays} label={round.boardLabel} />
                ) : round.mode === 'table' ? (
                  <TableBoard ships={round.ships} label={round.boardLabel} />
                ) : (
                  <CoinBarBoard ships={round.ships} label={round.boardLabel} />
                )}

                <div className="rounded-[1.4rem] border border-white/12 bg-black/14 px-4 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
                  <div className="text-[11px] font-black uppercase tracking-[0.16em] text-white/62">Captain note</div>
                  <div className="mt-2 text-sm font-bold leading-relaxed text-white/88 md:text-base">{round.support}</div>
                </div>
              </div>

              <div className="flex min-h-[23rem] flex-col justify-between gap-4 rounded-[2rem] border border-white/12 bg-[linear-gradient(180deg,rgba(15,23,42,0.84),rgba(30,41,59,0.92))] p-4 shadow-[0_24px_40px_rgba(2,6,23,0.24)] md:min-h-[31rem] md:p-5">
                <div className="grid grid-cols-2 gap-3">
                  {round.ships.map((ship) => (
                    <ShipCard key={`ship-${ship.id}`} label={ship.label} color={ship.color} active={round.answer === ship.label} />
                  ))}
                </div>

                <div className={`grid gap-3 ${round.options.length <= 2 ? 'grid-cols-2' : 'grid-cols-2 md:grid-cols-2'}`}>
                  {round.options.map((choice, index) => (
                    <motion.button
                      key={`${choice}-${index}`}
                      whileTap={{ scale: 0.97 }}
                      onClick={() => handleChoice(choice)}
                      disabled={feedback !== null || isFinished}
                      className="relative overflow-hidden rounded-[1.5rem] border border-white/12 bg-[linear-gradient(180deg,rgba(255,255,255,0.12),rgba(15,23,42,0.48))] px-4 py-4 text-left shadow-[0_18px_28px_rgba(15,23,42,0.22)] disabled:opacity-45"
                    >
                      <div className="absolute inset-x-[10%] top-[10%] h-[18%] rounded-full bg-white/10 blur-md" />
                      <div className="relative">
                        <div className="text-[10px] font-black uppercase tracking-[0.16em] text-white/58">Choice</div>
                        <div className="mt-2 text-xl font-black tracking-tight text-amber-50 md:text-2xl">{choice}</div>
                      </div>
                    </motion.button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <AnimatePresence>
            {feedback && (
              <motion.div
                initial={{ opacity: 0, scale: 0.82 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 1.08 }}
                className={`pointer-events-none absolute inset-0 z-40 flex items-center justify-center backdrop-blur-md ${feedback.type === 'success' ? 'bg-emerald-500/16' : 'bg-red-500/16'}`}
              >
                <div className="rounded-[2rem] border border-white/14 bg-slate-950/60 px-8 py-6 text-center shadow-[0_24px_36px_rgba(0,0,0,0.24)]">
                  <div className={`text-4xl font-black uppercase tracking-[0.12em] md:text-6xl ${feedback.type === 'success' ? 'text-emerald-100' : 'text-red-100'}`}>
                    {feedback.title}
                  </div>
                  <div className="mt-2 text-lg font-bold text-white/92 md:text-2xl">{feedback.subtitle}</div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="w-full max-w-6xl">
          <GameActionDock onBack={onBack} accentClass="text-white" />
        </div>
      </div>
    </div>
  );
};

export default TreasureChartCoveGame;
