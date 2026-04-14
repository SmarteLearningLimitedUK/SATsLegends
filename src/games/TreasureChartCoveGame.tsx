import React, { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import confetti from 'canvas-confetti';
import { formatFantasyPrompt } from '../utils/fantasyPrompt';
import chartCoveBackground from '../assets/maps/reef2.jpg';

interface TreasureChartCoveGameProps {
  levelId: number;
  avatarId: string;
  onVictory: (stars: number, XP: number) => void;
  onGameOver: (XP: number) => void;
  onBack: () => void;
}

type ChartRoundMode = 'highest' | 'difference' | 'line' | 'table' | 'pie';

interface ShipDatum {
  id: string;
  label: string;
  value: number;
  color: string;
  solidColor: string;
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
  { id: 'sun', label: 'Sunfin', color: 'from-amber-300 to-yellow-500', solidColor: '#fbbf24' },
  { id: 'mist', label: 'Mistwake', color: 'from-sky-300 to-cyan-500', solidColor: '#38bdf8' },
  { id: 'jade', label: 'Jadehook', color: 'from-emerald-300 to-green-500', solidColor: '#34d399' },
  { id: 'ruby', label: 'Ruby Tide', color: 'from-rose-300 to-red-500', solidColor: '#fb7185' },
];

const randomInt = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;

const pickShips = (count: number) => {
  const pool = [...SHIP_POOL].sort(() => Math.random() - 0.5);
  return pool.slice(0, count).map((ship, index) => ({
    ...ship,
    value: randomInt(3, 9) + index,
  }));
};

const modeForLevel = (levelId: number, roundIndex: number): ChartRoundMode => {
  if (levelId <= 1) return 'highest';
  if (levelId === 2) return 'difference';
  if (levelId === 3) return 'line';
  if (levelId === 4) return 'pie';
  if (levelId === 5) return 'table';
  const cycle: ChartRoundMode[] = ['difference', 'line', 'pie', 'table', 'highest'];
  return cycle[roundIndex % cycle.length];
};

const createRound = (levelId: number, roundIndex: number): ChartRound => {
  const mode = modeForLevel(levelId, roundIndex);

  if (mode === 'highest') {
    const ships = pickShips(4);
    const winner = ships.reduce((best, ship) => (ship.value > best.value ? ship : best), ships[0]);
    return {
      mode,
      title: 'Most Crates',
      prompt: 'Which ship has the most crates?',
      support: 'Use the bar chart to compare each ship.',
      boardLabel: 'Crates by ship',
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
      prompt: `How many more crates did ${first.label} have than ${second.label}?`,
      support: 'Compare just those two bars on the chart.',
      boardLabel: 'Crates by ship',
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
    const targetDay = days[randomInt(0, days.length - 1)];
    const options = Array.from(new Set([
      targetDay.value.toString(),
      Math.max(1, targetDay.value + 1).toString(),
      Math.max(1, targetDay.value + 2).toString(),
      Math.max(1, targetDay.value - 1).toString(),
    ])).slice(0, 4);
    while (options.length < 4) options.push((targetDay.value + options.length + 1).toString());

    return {
      mode,
      title: 'Line Read',
      prompt: `How many crates were logged on ${targetDay.label}?`,
      support: 'Trace the line up from the day label.',
      boardLabel: 'Crates over five days',
      ships: [],
      lineDays: days,
      options: options.sort(() => Math.random() - 0.5),
      answer: targetDay.value.toString(),
    };
  }

  if (mode === 'pie') {
    const ships = pickShips(4);
    const winner = ships.reduce((best, ship) => (ship.value > best.value ? ship : best), ships[0]);

    return {
      mode,
      title: 'Largest Share',
      prompt: 'Which ship owns the largest slice?',
      support: 'Compare the pie slices to find the biggest share.',
      boardLabel: 'Share of crates',
      ships,
      options: ships.map((ship) => ship.label),
      answer: winner.label,
    };
  }

  const ships = pickShips(4);
  const target = ships[randomInt(0, ships.length - 1)];
  return {
    mode: 'table',
    title: 'Dock Match',
    prompt: `Which ship matches ${target.value} crates?`,
    support: 'Use the ledger to match the exact value.',
    boardLabel: 'Harbour ledger',
    ships,
    options: ships.map((ship) => ship.label),
    answer: target.label,
  };
};

const CoinBarBoard: React.FC<{ ships: ShipDatum[]; label: string }> = ({ ships, label }) => {
  const maxValue = Math.max(...ships.map((ship) => ship.value));
  return (
    <div className="w-full">
      <div className="text-[9px] font-black uppercase tracking-[0.2em] text-white/62 md:text-[10px]">{label}</div>
      <div className="mt-3 grid grid-cols-4 items-end gap-2 md:gap-3">
        {ships.map((ship) => (
          <div key={ship.id} className="flex flex-col items-center gap-1.5">
            <div className="flex h-20 w-full items-end justify-center md:h-24">
              <div className="relative flex w-full max-w-[4rem] flex-col justify-end gap-1">
                {Array.from({ length: ship.value }).map((_, index) => (
                  <div
                    key={`${ship.id}-coin-${index}`}
                    className={`h-2.5 rounded-full bg-gradient-to-r ${ship.color} shadow-[0_3px_8px_rgba(15,23,42,0.16)]`}
                    style={{ opacity: 0.4 + ((index + 1) / (maxValue + 2)) }}
                  />
                ))}
              </div>
            </div>
            <div className="text-center">
              <div className="mx-auto text-[8px] font-black leading-tight text-white md:text-[9px]">
                {ship.label.split(' ')[0].slice(0, 4)}
              </div>
              <div className="text-[7px] font-bold leading-tight text-amber-100/80 md:text-[8px]">
                {ship.value}
              </div>
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
    <div className="w-full">
      <div className="text-[9px] font-black uppercase tracking-[0.2em] text-white/62 md:text-[10px]">{label}</div>
      <svg viewBox="0 0 100 100" className="mt-3 h-24 w-full md:h-28">
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

const PieShareBoard: React.FC<{ ships: ShipDatum[]; label: string }> = ({ ships, label }) => {
  const total = ships.reduce((sum, ship) => sum + ship.value, 0);
  let current = 0;
  const gradientStops = ships.map((ship) => {
    const start = current;
    const share = (ship.value / total) * 100;
    current += share;
    return `${ship.solidColor} ${start.toFixed(2)}% ${current.toFixed(2)}%`;
  });

  return (
    <div className="w-full">
      <div className="text-[9px] font-black uppercase tracking-[0.2em] text-white/70 md:text-[10px]">{label}</div>
      <div className="mt-3 flex items-center justify-between gap-3">
        <div
          className="h-24 w-24 rounded-full border border-white/12 shadow-[inset_0_0_0_8px_rgba(15,23,42,0.22)] md:h-28 md:w-28"
          style={{
            background: `conic-gradient(${gradientStops.join(', ')})`,
          }}
        />
        <div className="flex flex-1 flex-col gap-1.5">
          {ships.map((ship) => (
            <div key={ship.id} className="flex items-center justify-between rounded-lg border border-white/10 bg-white/6 px-2 py-1">
              <div className="flex items-center gap-2">
                <span className={`h-3 w-3 rounded-full bg-gradient-to-r ${ship.color}`} />
                <span className="max-w-[5.5rem] truncate text-[10px] font-bold text-white">{ship.label}</span>
              </div>
              <span className="text-[10px] font-black text-amber-100">{ship.value}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

const TableBoard: React.FC<{ ships: ShipDatum[]; label: string }> = ({ ships, label }) => (
  <div className="w-full">
    <div className="text-[9px] font-black uppercase tracking-[0.2em] text-white/70 md:text-[10px]">{label}</div>
    <div className="mt-3 space-y-1.5">
      {ships.map((ship) => (
        <div key={ship.id} className="grid grid-cols-[minmax(0,1fr)_auto] items-center rounded-[1rem] border border-white/10 bg-black/14 px-2.5 py-1.5">
          <div className="truncate text-[10px] font-black text-white md:text-[11px]">{ship.label}</div>
          <div className="rounded-full border border-amber-200/20 bg-amber-400/10 px-3 py-1 text-[10px] font-black text-amber-50">
            {ship.value} chests
          </div>
        </div>
      ))}
    </div>
  </div>
);

const TreasureChartCoveGame: React.FC<TreasureChartCoveGameProps> = ({
  levelId,
  avatarId: _avatarId,
  onVictory,
  onGameOver,
  onBack: _onBack,
}) => {
  const totalRounds = ROUND_GOAL_BY_LEVEL[levelId] || 5;
  const targetScore = 860 + (levelId * 220);
  const timeoutsRef = useRef<number[]>([]);

  const [XP, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(84 + (levelId * 8));
  const [hearts, setHearts] = useState(MAX_HEARTS);
  const [roundNumber, setRoundNumber] = useState(1);
  const [Combo, setStreak] = useState(0);
  const [round, setRound] = useState<ChartRound>(() => createRound(levelId, 0));
  const [feedback, setFeedback] = useState<null | { type: 'success' | 'error'; title: string; subtitle: string }>(null);
  const [isFinished, setIsFinished] = useState(false);

  const progress = Math.min((XP / targetScore) * 100, 100);

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
    setRound(createRound(levelId, 0));
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
          onGameOver(XP);
          return 0;
        }
        return previous - 1;
      });
    }, 1000);
    return () => window.clearInterval(timerId);
  }, [isFinished, onGameOver, XP]);

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
      const nextRoundNumber = roundNumber + 1;
      setRoundNumber(nextRoundNumber);
      setRound(createRound(levelId, nextRoundNumber - 1));
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
        onGameOver(XP);
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

    const points = 155 + (Combo * 24) + (round.mode === 'line' ? 28 : 0);
    const updatedScore = XP + points;
    setScore(updatedScore);
    setStreak((previous) => previous + 1);
    setFeedback({ type: 'success', title: 'Treasure Found!', subtitle: `+${points} XP` });
    confetti({
      particleCount: 42,
      spread: 48,
      origin: { y: 0.72 },
      colors: ['#fcd34d', '#ffffff', '#60a5fa'],
    });
    nextRound(updatedScore);
  };

  return (
    <div
      className="relative flex h-full w-full flex-col overflow-hidden bg-cover bg-center bg-no-repeat"
      style={{ backgroundImage: `url(${chartCoveBackground})` }}
    >
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute inset-x-[-10%] top-[-12%] h-[42%] rounded-full bg-cyan-200/14 blur-3xl" />
        <div className="absolute inset-x-0 top-0 h-[58%] bg-[linear-gradient(180deg,rgba(125,211,252,0.26),rgba(96,165,250,0.08),transparent)]" />
        <div className="absolute inset-x-0 bottom-0 h-[38%] bg-[linear-gradient(180deg,rgba(8,47,73,0),rgba(8,47,73,0.18),rgba(15,23,42,0.94))]" />
        <div className="absolute inset-x-0 bottom-[14%] h-[20%] bg-[radial-gradient(circle_at_center,rgba(125,211,252,0.18),rgba(59,130,246,0.08),transparent_72%)]" />
      </div>

      <div className="relative z-10 flex h-full min-h-0 w-full flex-1 flex-col items-center gap-2 px-2 pb-[calc(env(safe-area-inset-bottom)+0.6rem)] pt-2 md:gap-3 md:px-4 md:pb-[calc(env(safe-area-inset-bottom)+0.8rem)] md:pt-3">
      <div className="licensed-board-frame structured-playfield-frame relative flex w-full max-w-6xl min-h-0 flex-1 overflow-hidden rounded-[2rem] border border-white/12 bg-[linear-gradient(180deg,rgba(255,255,255,0.06),rgba(255,255,255,0.02))] shadow-[0_28px_64px_rgba(0,0,0,0.34)] md:rounded-[2.6rem]">
          <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.08),rgba(255,255,255,0.02)_28%,rgba(15,23,42,0.16)_100%)]" />
          <div className="absolute inset-x-[6%] bottom-[14%] h-[22%] rounded-[50%] bg-[radial-gradient(circle_at_center,rgba(251,191,36,0.22),rgba(59,130,246,0.12),transparent_72%)]" />

          <div className="relative z-10 flex h-full w-full flex-col px-3 pb-3 pt-4 md:px-5 md:pb-4 md:pt-5">
            <div className="flex justify-center">
              <div className="game-question-card w-full max-w-[96%]">
                <div className="question-title">{round.title}</div>
                <div className="question-subtitle">{formatFantasyPrompt(round.prompt)}</div>
              </div>
            </div>

            <div className="mt-2 grid min-h-0 flex-1 grid-cols-1 gap-2 md:mt-2 md:grid-cols-[1.02fr_0.98fr] md:gap-2">
                <div className="flex min-h-0 flex-1 flex-col justify-between gap-2 rounded-[2rem] border border-white/12 bg-[linear-gradient(180deg,rgba(8,47,73,0.34),rgba(15,23,42,0.26))] p-2.5 shadow-[0_24px_40px_rgba(2,6,23,0.22)] md:p-3">
                  <div className="mt-auto">
                    {round.mode === 'line' && round.lineDays ? (
                      <LineGraphBoard days={round.lineDays} label={round.boardLabel} />
                    ) : round.mode === 'table' ? (
                      <TableBoard ships={round.ships} label={round.boardLabel} />
                    ) : round.mode === 'pie' ? (
                      <PieShareBoard ships={round.ships} label={round.boardLabel} />
                    ) : (
                      <CoinBarBoard ships={round.ships} label={round.boardLabel} />
                    )}
                  </div>
                </div>

              <div className="flex min-h-0 flex-1 flex-col justify-between gap-2 rounded-[2rem] border border-white/12 bg-[linear-gradient(180deg,rgba(15,23,42,0.84),rgba(30,41,59,0.92))] p-2.5 shadow-[0_24px_40px_rgba(2,6,23,0.24)] md:p-3">
                <div className="grid grid-cols-4 gap-1.5">
                  {round.options.map((choice, index) => (
                    <motion.button
                      key={`${choice}-${index}`}
                      whileTap={{ scale: 0.97 }}
                      onClick={() => handleChoice(choice)}
                      disabled={feedback !== null || isFinished}
                      className="relative overflow-hidden rounded-[1rem] border border-white/12 bg-[linear-gradient(180deg,rgba(255,255,255,0.12),rgba(15,23,42,0.48))] px-2 py-2 text-left shadow-[0_14px_22px_rgba(15,23,42,0.22)] disabled:opacity-45"
                    >
                      <div className="absolute inset-x-[10%] top-[10%] h-[18%] rounded-full bg-white/10 blur-md" />
                      <div className="relative">
                        <div className="mt-1.5 text-[0.85rem] font-black tracking-tight text-amber-50 md:text-base">{choice}</div>
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
                  <div className={`text-4xl font-black uppercase tracking-[0.12em] md:text-6xl ${feedback.type === 'success' ? 'text-emerald-100' : 'text-amber-100'}`}>
                    {feedback.title}
                  </div>
                  <div className="mt-2 text-lg font-bold text-white/92 md:text-2xl">{feedback.subtitle}</div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

      </div>
    </div>
  );
};

export default TreasureChartCoveGame;

