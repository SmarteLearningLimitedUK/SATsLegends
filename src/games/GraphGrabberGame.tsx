import React, { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import confetti from 'canvas-confetti';
import graphGrabberBackground from '../assets/maps/backgroundsforgames/graph grabber.jpg';
import crate1 from '../assets/crates/1.png';
import crate2 from '../assets/crates/2.png';
import crate3 from '../assets/crates/3.png';
import crate4 from '../assets/crates/4.png';
import PracticeIntroPopup from '../components/game-ui/PracticeIntroPopup';
import { GameQuestionCard } from '../components/game-ui/GameUiKit';
import { formatFantasyPrompt } from '../utils/fantasyPrompt';

interface GraphGrabberGameProps {
  levelId: number;
  avatarId: string;
  isPractice?: boolean;
  onVictory: (stars: number, XP: number) => void;
  onGameOver: (XP: number) => void;
  onBack: () => void;
}

type ChartRoundMode = 'basic' | 'comparison' | 'difference' | 'total';

interface CaravanDatum {
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
  caravans: CaravanDatum[];
  lineDays?: Array<{ label: string; value: number }>;
  options: string[];
  answer: string;
}

const MAX_HEARTS = 4;
const ROUND_GOAL_BY_LEVEL = [0, 4, 5, 5, 6];
const CARAVAN_POOL = [
  { id: 'number-caravan', label: 'Number Caravan', color: 'from-sky-400 to-cyan-300', solidColor: '#38bdf8' },
  { id: 'logic-caravan', label: 'Logic Caravan', color: 'from-indigo-400 to-blue-300', solidColor: '#818cf8' },
  { id: 'brain-caravan', label: 'Brain Caravan', color: 'from-emerald-400 to-lime-300', solidColor: '#34d399' },
  { id: 'data-caravan', label: 'Data Caravan', color: 'from-amber-300 to-yellow-300', solidColor: '#fbbf24' },
];
const CARAVAN_CARGO_IMAGES = [crate1, crate2, crate3, crate4];

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

type CaravanAnimation = {
  id: number;
  outcome: 'success' | 'failure';
};

const createRound = (levelId: number, roundIndex: number): ChartRound => {
  const mode = modeForLevel(levelId, roundIndex);
  const values = CARGO_ROUNDS[mode];
  const caravans = CARAVAN_POOL.map((caravan, index) => ({
    ...caravan,
    value: values[index],
  }));

  if (mode === 'basic') {
    const target = caravans[0];
    return {
      mode,
      title: 'Basic Reading',
      prompt: 'How many crates did the Number Caravan deliver?',
      support: 'Read the Number Caravan stack carefully.',
      boardLabel: 'Crates by caravan',
      caravans,
      options: [String(target.value - 2), String(target.value), String(target.value + 1), String(target.value + 3)],
      answer: String(target.value),
    };
  }

  if (mode === 'comparison') {
    const winner = caravans[1];
    return {
      mode,
      title: 'Most Crates',
      prompt: 'Which caravan delivered the most crates?',
      support: 'Compare all four caravans.',
      boardLabel: 'Crates by caravan',
      caravans,
      options: caravans.map((caravan) => caravan.label),
      answer: winner.label,
    };
  }

  if (mode === 'difference') {
    const first = caravans[1];
    const second = caravans[2];
    const difference = first.value - second.value;
    return {
      mode,
      title: 'Find The Difference',
      prompt: 'How many more crates did the Logic Caravan deliver than the Brain Caravan?',
      support: 'Subtract Brain Caravan from Logic Caravan.',
      boardLabel: 'Crates by caravan',
      caravans,
      options: [String(difference - 1), String(difference), String(difference + 1), String(difference + 2)],
      answer: String(difference),
    };
  }

  const total = caravans.reduce((sum, caravan) => sum + caravan.value, 0);
  return {
    mode: 'total',
    title: 'Total Crates',
    prompt: 'What is the total number of crates delivered by all four caravans?',
    support: 'Add all four caravan stacks.',
    boardLabel: 'Crates by caravan',
    caravans,
    options: [String(total - 4), String(total - 2), String(total), String(total + 2)],
    answer: String(total),
  };
};

const CaravanBoard: React.FC<{ caravans: CaravanDatum[]; label: string }> = ({ caravans, label }) => {
  const maxValue = Math.max(...caravans.map((caravan) => caravan.value));
  return (
    <div className="w-full">
      <div className="mt-2 grid grid-cols-4 items-end gap-2 md:gap-3">
        {caravans.map((caravan, caravanIndex) => (
          <div key={caravan.id} className="flex flex-col items-center gap-1.5">
            <div className="flex h-[clamp(11rem,34vh,19rem)] w-full items-end justify-center">
              <div className="relative flex w-full max-w-[6.5rem] flex-col items-center justify-end">
                {Array.from({ length: caravan.value }).map((_, index) => {
                  const crateAsset = CARAVAN_CARGO_IMAGES[(caravanIndex + index) % CARAVAN_CARGO_IMAGES.length];
                  return (
                    <img
                      key={`${caravan.id}-crate-${index}`}
                      src={crateAsset}
                      alt=""
                      aria-hidden="true"
                      className="h-7 w-7 drop-shadow-[0_2px_5px_rgba(15,23,42,0.18)] md:h-8 md:w-8"
                      style={{
                        marginTop: index === 0 ? 0 : '-0.72rem',
                        opacity: 0.42 + ((index + 1) / (maxValue + 2)),
                      }}
                    />
                  );
                })}
              </div>
            </div>
            <div className="text-center">
              <div className="mx-auto text-[8px] font-black leading-tight text-white md:text-[9px]">
                {caravan.label.split(' ')[0].slice(0, 4)}
              </div>
              <div className="text-[7px] font-bold leading-tight text-amber-100/80 md:text-[8px]">
                {caravan.value}
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

const GraphGrabberGame: React.FC<GraphGrabberGameProps> = ({
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
  const [caravanAnimation, setCaravanAnimation] = useState<CaravanAnimation | null>(null);
  const caravanAnimationIdRef = useRef(0);

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
    setCaravanAnimation(null);
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

  const triggerCaravanAnimation = (outcome: CaravanAnimation['outcome']) => {
    caravanAnimationIdRef.current += 1;
    const id = caravanAnimationIdRef.current;
    setCaravanAnimation({ id, outcome });
    const clearDelay = outcome === 'success' ? 3000 : 2200;
    const timeoutId = window.setTimeout(() => {
      setCaravanAnimation((current) => (current?.id === id ? null : current));
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
      triggerCaravanAnimation('failure');
      loseHeart(`The correct answer was ${round.answer}.`);
      return;
    }

    const points = 155 + (Combo * 24);
    const updatedScore = XP + points;
    setScore(updatedScore);
    setStreak((previous) => previous + 1);
    triggerCaravanAnimation('success');
    setFeedback({ type: 'success', title: 'Supply secured', subtitle: `+${points} XP` });
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
      <div
        className="pointer-events-none absolute inset-0 bg-cover bg-center bg-no-repeat opacity-100"
        style={{ backgroundImage: `url(${graphGrabberBackground})` }}
        aria-hidden="true"
      />
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(8,15,32,0.12),rgba(8,15,32,0.22))]" aria-hidden="true" />
      <PracticeIntroPopup
        open={showPracticeIntro}
        title="Graph Grabber"
        body="Read the graph to track the stolen brainpower supply caravans.\nAnswer with single values, comparisons and totals."
        briefing={practiceBriefing}
        onAction={() => setShowPracticeIntro(false)}
      />
      <div className="relative z-10 flex h-full min-h-0 w-full flex-1 flex-col items-center gap-2 px-2 pb-[calc(env(safe-area-inset-bottom)+0.6rem)] pt-2 md:gap-3 md:px-4 md:pb-[calc(env(safe-area-inset-bottom)+0.8rem)] md:pt-3">
        <div className="licensed-board-frame structured-playfield-frame relative flex w-full max-w-6xl min-h-0 flex-1 overflow-hidden rounded-[2rem] border border-white/12 bg-[linear-gradient(180deg,rgba(255,255,255,0.06),rgba(255,255,255,0.02))] shadow-[0_28px_64px_rgba(0,0,0,0.34)] md:rounded-[2.6rem]">
          <div className="relative z-10 flex h-full w-full flex-col px-3 pb-3 pt-2 md:px-5 md:pb-4 md:pt-3">
            <div className="flex min-h-0 flex-1 flex-col gap-2">
              <div className="flex justify-center">
                <GameQuestionCard title={round.title} bodyClassName="tracking-tight">
                  {formatFantasyPrompt(round.prompt)}
                </GameQuestionCard>
              </div>

              <div className="grid min-h-0 flex-1 grid-cols-1 gap-2 md:grid-cols-[1.18fr_0.82fr] md:gap-2">
                <div className="flex min-h-0 flex-1 flex-col justify-between gap-2 rounded-[2rem] border border-white/12 bg-[linear-gradient(180deg,rgba(8,47,73,0.34),rgba(15,23,42,0.26))] p-2.5 shadow-[0_24px_40px_rgba(2,6,23,0.22)] md:p-3">
                  <div className="flex min-h-0 flex-1 items-center justify-center">
                    <CaravanBoard caravans={round.caravans} label={round.boardLabel} />
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

            <div className="relative mt-2 h-[4.5rem] overflow-hidden rounded-[1.35rem] border border-white/12 bg-[linear-gradient(180deg,rgba(6,20,48,0.7),rgba(8,18,40,0.88))] px-3 py-2 shadow-[0_18px_32px_rgba(2,6,23,0.22)]">
              <div className="pointer-events-none absolute inset-x-2 bottom-1 h-1 rounded-full bg-amber-200/10" aria-hidden="true" />
              {caravanAnimation ? (
                <motion.div
                  key={caravanAnimation.id}
                  aria-hidden="true"
                  className="pointer-events-none absolute bottom-0 left-0 z-10"
                  initial={{
                    x: '-24vw',
                    y: 0,
                    opacity: 0,
                    rotate: -1,
                    scale: 0.98,
                  }}
                  animate={
                    caravanAnimation.outcome === 'success'
                      ? {
                          x: '118vw',
                          y: 0,
                          opacity: 1,
                          rotate: 0,
                          scale: 1,
                        }
                      : {
                          x: ['-24vw', '46vw', '50vw'],
                          y: [0, 0, 18],
                          opacity: [0, 1, 0],
                          rotate: [-1, 0, 6],
                          scale: [0.98, 1, 0.92],
                        }
                  }
                  transition={
                    caravanAnimation.outcome === 'success'
                      ? { duration: 3.15, ease: 'linear' }
                      : { duration: 2.25, times: [0, 0.72, 1], ease: 'easeInOut' }
                  }
                >
                  <div className="relative flex items-end gap-1 rounded-[1.1rem] border border-amber-200/16 bg-[linear-gradient(180deg,rgba(120,53,15,0.34),rgba(15,23,42,0.56))] px-3 py-2 shadow-[0_10px_18px_rgba(0,0,0,0.18)]">
                    <div className="absolute -bottom-1 left-3 right-3 h-3 rounded-full bg-slate-950/60 blur-[1px]" />
                    <div className="absolute -bottom-2 left-4 h-3 w-3 rounded-full border border-white/10 bg-slate-900/90" />
                    <div className="absolute -bottom-2 right-4 h-3 w-3 rounded-full border border-white/10 bg-slate-900/90" />
                    <div className="flex items-end gap-1">
                      {[0, 1, 2].map((crateIndex) => (
                        <img
                          key={`${caravanAnimation.id}-crate-${crateIndex}`}
                          src={CARAVAN_CARGO_IMAGES[(crateIndex + caravanAnimation.id) % CARAVAN_CARGO_IMAGES.length]}
                          alt=""
                          className="h-8 w-8 drop-shadow-[0_2px_6px_rgba(0,0,0,0.24)] md:h-9 md:w-9"
                        />
                      ))}
                    </div>
                  </div>
                </motion.div>
              ) : null}

              <AnimatePresence mode="wait">
                {feedback ? (
                  <motion.div
                    key={feedback.title}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 10 }}
                    transition={{ duration: 0.18, ease: 'easeOut' }}
                    className={`relative z-20 flex h-full items-center justify-center text-center ${feedback.type === 'success' ? 'text-emerald-100' : 'text-amber-100'}`}
                  >
                    <div className="rounded-full border border-white/12 bg-slate-950/40 px-4 py-1.5 text-sm font-black uppercase tracking-[0.14em] shadow-[0_10px_18px_rgba(0,0,0,0.2)]">
                      <div>{feedback.title}</div>
                      <div className="mt-0.5 text-[11px] font-semibold normal-case tracking-normal text-white/92">
                        {feedback.subtitle}
                      </div>
                    </div>
                  </motion.div>
                ) : null}
              </AnimatePresence>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};

export default GraphGrabberGame;


