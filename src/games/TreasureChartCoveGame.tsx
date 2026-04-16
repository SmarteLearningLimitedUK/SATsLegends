import React, { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import confetti from 'canvas-confetti';
import cargoShipImage from '../assets/boats/7.png';
import PracticeIntroPopup from '../components/game-ui/PracticeIntroPopup';
import { formatFantasyPrompt } from '../utils/fantasyPrompt';

interface TreasureChartCoveGameProps {
  levelId: number;
  avatarId: string;
  isPractice?: boolean;
  onVictory: (stars: number, XP: number) => void;
  onGameOver: (XP: number) => void;
  onBack: () => void;
}

type ChartRoundMode = 'basic' | 'comparison' | 'difference' | 'total';

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
  { id: 'number-wave', label: 'Number Wave', color: 'from-sky-400 to-cyan-300', solidColor: '#38bdf8' },
  { id: 'logic-tide', label: 'Logic Tide', color: 'from-indigo-400 to-blue-300', solidColor: '#818cf8' },
  { id: 'brain-voyager', label: 'Brain Voyager', color: 'from-emerald-400 to-lime-300', solidColor: '#34d399' },
  { id: 'data-current', label: 'Data Current', color: 'from-amber-300 to-yellow-300', solidColor: '#fbbf24' },
];

const CARGO_ROUNDS: Record<ChartRoundMode, number[]> = {
  basic: [6, 9, 7, 4],
  comparison: [5, 11, 8, 6],
  difference: [6, 12, 9, 4],
  total: [7, 8, 5, 6],
};

const modeForLevel = (_levelId: number, roundIndex: number): ChartRoundMode => {
  const cycle: ChartRoundMode[] = ['basic', 'comparison', 'difference', 'total'];
  return cycle[roundIndex % cycle.length];
};

type BoatAnimation = {
  id: number;
  outcome: 'success' | 'failure';
};

const createRound = (levelId: number, roundIndex: number): ChartRound => {
  const mode = modeForLevel(levelId, roundIndex);
  const values = CARGO_ROUNDS[mode];
  const ships = SHIP_POOL.map((ship, index) => ({
    ...ship,
    value: values[index],
  }));

  if (mode === 'basic') {
    const target = ships[0];
    return {
      mode,
      title: 'Basic Reading',
      prompt: 'The records show the number of crates delivered by each ship. How many crates did The Number Wave deliver?',
      support: 'Read the bar for Number Wave carefully.',
      boardLabel: 'Crates by ship',
      ships,
      options: [String(target.value - 2), String(target.value), String(target.value + 1), String(target.value + 3)],
      answer: String(target.value),
    };
  }

  if (mode === 'comparison') {
    const winner = ships[1];
    return {
      mode,
      title: 'Most Crates',
      prompt: 'The records show the number of crates delivered by each ship. Which ship delivered the most crates?',
      support: 'Compare every ship before you answer.',
      boardLabel: 'Crates by ship',
      ships,
      options: ships.map((ship) => ship.label),
      answer: winner.label,
    };
  }

  if (mode === 'difference') {
    const first = ships[1];
    const second = ships[2];
    const difference = first.value - second.value;
    return {
      mode,
      title: 'Find The Difference',
      prompt: 'The records show the number of crates delivered by each ship. How many more crates did The Logic Tide deliver than The Brain Voyager?',
      support: 'Subtract the Brain Voyager bar from the Logic Tide bar.',
      boardLabel: 'Crates by ship',
      ships,
      options: [String(difference - 1), String(difference), String(difference + 1), String(difference + 2)],
      answer: String(difference),
    };
  }

  const total = ships.reduce((sum, ship) => sum + ship.value, 0);
  return {
    mode: 'total',
    title: 'Total Crates',
    prompt: 'The records show the number of crates delivered by each ship. What is the total number of crates delivered by all four ships?',
    support: 'Add every bar together to get the final total.',
    boardLabel: 'Crates by ship',
    ships,
    options: [String(total - 4), String(total - 2), String(total), String(total + 2)],
    answer: String(total),
  };
};

const CoinBarBoard: React.FC<{ ships: ShipDatum[]; label: string }> = ({ ships, label }) => {
  const maxValue = Math.max(...ships.map((ship) => ship.value));
  return (
    <div className="w-full">
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
      <div className="mt-3 text-center text-[9px] font-black uppercase tracking-[0.2em] text-white/62 md:text-[10px]">
        {label}
      </div>
    </div>
  );
};

const TreasureChartCoveGame: React.FC<TreasureChartCoveGameProps> = ({
  levelId,
  avatarId: _avatarId,
  isPractice,
  practiceBriefing,
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
  const [showPracticeIntro, setShowPracticeIntro] = useState(Boolean(isPractice));
  const [boatAnimation, setBoatAnimation] = useState<BoatAnimation | null>(null);
  const boatAnimationIdRef = useRef(0);

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
    setShowPracticeIntro(Boolean(isPractice));
    setBoatAnimation(null);
  }, [isPractice, levelId]);

  useEffect(() => {
    setShowPracticeIntro(Boolean(isPractice));
  }, [isPractice]);

  useEffect(() => {
    if (isPractice || isFinished) return undefined;
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
  }, [isFinished, isPractice, onGameOver, XP]);

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

  const triggerBoatAnimation = (outcome: BoatAnimation['outcome']) => {
    boatAnimationIdRef.current += 1;
    const id = boatAnimationIdRef.current;
    setBoatAnimation({ id, outcome });
    const clearDelay = outcome === 'success' ? 3000 : 2200;
    const timeoutId = window.setTimeout(() => {
      setBoatAnimation((current) => (current?.id === id ? null : current));
    }, clearDelay);
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
      triggerBoatAnimation('failure');
      loseHeart(`The correct answer was ${round.answer}.`);
      return;
    }

    const points = 155 + (Combo * 24);
    const updatedScore = XP + points;
    setScore(updatedScore);
    setStreak((previous) => previous + 1);
    triggerBoatAnimation('success');
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
    <div className="relative flex h-full w-full flex-col overflow-hidden bg-transparent">
      <PracticeIntroPopup
        open={showPracticeIntro}
        title="Graph Grabber"
        body="Read the graph to track the stolen brainpower.\nAnswer with single values, comparisons and totals."
        briefing={practiceBriefing}
          onAction={() => setShowPracticeIntro(false)}
      />
        <div className="relative z-10 flex h-full min-h-0 w-full flex-1 flex-col items-center gap-2 px-2 pb-[calc(env(safe-area-inset-bottom)+0.6rem)] pt-2 md:gap-3 md:px-4 md:pb-[calc(env(safe-area-inset-bottom)+0.8rem)] md:pt-3">
        <div className="licensed-board-frame structured-playfield-frame relative flex w-full max-w-6xl min-h-0 flex-1 overflow-hidden rounded-[2rem] border border-white/12 bg-[linear-gradient(180deg,rgba(255,255,255,0.06),rgba(255,255,255,0.02))] shadow-[0_28px_64px_rgba(0,0,0,0.34)] md:rounded-[2.6rem]">
          {boatAnimation && (
            <motion.img
              key={boatAnimation.id}
              src={cargoShipImage}
              alt=""
              aria-hidden="true"
              initial={{
                x: '-28vw',
                y: 0,
                opacity: 0,
                rotate: -2,
                scale: 0.96,
              }}
              animate={
                boatAnimation.outcome === 'success'
                  ? {
                      x: '120vw',
                      y: 0,
                      opacity: 1,
                      rotate: 0.5,
                      scale: 1,
                    }
                  : {
                      x: ['-28vw', '54vw', '58vw'],
                      y: [0, 0, 22],
                      opacity: [0, 1, 0],
                      rotate: [-2, 0, 8],
                      scale: [0.96, 1, 0.9],
                    }
              }
              transition={
                boatAnimation.outcome === 'success'
                  ? { duration: 3.1, ease: 'linear' }
                  : { duration: 2.25, times: [0, 0.72, 1], ease: 'easeInOut' }
              }
              className="pointer-events-none absolute bottom-2 left-0 z-20 h-14 w-auto drop-shadow-[0_10px_16px_rgba(0,0,0,0.22)] md:h-20"
            />
          )}

            <div className="relative z-10 flex h-full w-full flex-col px-3 pb-3 pt-2 md:px-5 md:pb-4 md:pt-3">
              <div className="flex justify-center">
                <div className="game-question-card w-full max-w-[780px]">
                  <div className="question-title">{round.title}</div>
                  <div className="question-subtitle game-question-copy">{formatFantasyPrompt(round.prompt)}</div>
                </div>
            </div>

            <div className="mt-2 grid min-h-0 flex-1 grid-cols-1 gap-2 md:mt-2 md:grid-cols-[1.02fr_0.98fr] md:gap-2">
                <div className="flex min-h-0 flex-1 flex-col justify-between gap-2 rounded-[2rem] border border-white/12 bg-[linear-gradient(180deg,rgba(8,47,73,0.34),rgba(15,23,42,0.26))] p-2.5 shadow-[0_24px_40px_rgba(2,6,23,0.22)] md:p-3">
                  <div className="mt-auto">
                    <CoinBarBoard ships={round.ships} label={round.boardLabel} />
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
                className={`pointer-events-none fixed inset-0 z-40 flex items-center justify-center backdrop-blur-md ${feedback.type === 'success' ? 'bg-emerald-500/16' : 'bg-red-500/16'}`}
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


