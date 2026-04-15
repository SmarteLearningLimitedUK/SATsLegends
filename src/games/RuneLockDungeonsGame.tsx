import React, { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import confetti from 'canvas-confetti';
import { AVATARS } from '../constants';
import { formatFantasyPrompt } from '../utils/fantasyPrompt';

interface RuneLockDungeonsGameProps {
  levelId: number;
  avatarId: string;
  onVictory: (stars: number, XP: number) => void;
  onGameOver: (XP: number) => void;
  onBack: () => void;
}

type RuneRoundMode = 'add' | 'multiply' | 'multi' | 'balance';

interface RuneRound {
  mode: RuneRoundMode;
  title: string;
  prompt: string;
  support: string;
  doorLabel: string;
  options: string[];
  answer: string;
}

const MAX_HEARTS = 4;
const ROUND_GOAL_BY_LEVEL = [0, 4, 5, 5, 6];

const randomInt = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;
const shuffle = <T,>(items: T[]) => [...items].sort(() => Math.random() - 0.5);

const createRound = (levelId: number): RuneRound => {
  const modes: RuneRoundMode[] = ['add', 'multiply'];
  if (levelId >= 2) modes.push('multi');
  if (levelId >= 3) modes.push('balance');
  const mode = modes[randomInt(0, modes.length - 1)];

  if (mode === 'add') {
    const answer = randomInt(3, 12);
    const addend = randomInt(4, 11);
    const total = answer + addend;
    const options = shuffle([answer, answer + 1, Math.max(1, answer - 1), answer + 3].map(String));
    return {
      mode,
      title: 'Missing Addend',
      prompt: `? + ${addend} = ${total}`,
      support: 'Drag the rune that balances the door equation.',
      doorLabel: 'Rune Door',
      options,
      answer: String(answer),
    };
  }

  if (mode === 'multiply') {
    const answer = randomInt(3, 9);
    const multiplier = randomInt(3, 6);
    const total = answer * multiplier;
    const options = shuffle([answer, answer + 1, Math.max(1, answer - 1), answer + 2].map(String));
    return {
      mode,
      title: 'Missing Multiplier',
      prompt: `${multiplier} × ? = ${total}`,
      support: 'Use the inverse operation to unlock the gate.',
      doorLabel: 'Rune Gate',
      options,
      answer: String(answer),
    };
  }

  if (mode === 'multi') {
    const answer = randomInt(2, 8);
    const multiplier = randomInt(2, 4);
    const adjust = randomInt(3, 6);
    const total = (answer * multiplier) + adjust;
    const options = shuffle([answer, answer + 1, Math.max(1, answer - 1), answer + 2].map(String));
    return {
      mode,
      title: 'Multi-Step Lock',
      prompt: `(? × ${multiplier}) + ${adjust} = ${total}`,
      support: 'Solve the hidden value before the dungeon trap fires.',
      doorLabel: 'Vault Lock',
      options,
      answer: String(answer),
    };
  }

  const answer = randomInt(4, 11);
  const addend = randomInt(3, 9);
  const total = answer + addend;
  const options = shuffle([answer, answer + 2, Math.max(1, answer - 2), answer + 1].map(String));
  return {
    mode,
    title: 'Balance Puzzle',
    prompt: `? + ${addend} = ${total}`,
    support: 'Place the correct rune on the scale so both sides balance.',
    doorLabel: 'Scale Lock',
    options,
    answer: String(answer),
  };
};

const RuneStone: React.FC<{
  value: string;
  onClick?: () => void;
}> = ({ value, onClick }) => (
  <button
    type="button"
    onClick={onClick}
    className="relative overflow-hidden rounded-[1.05rem] border border-white/14 bg-[linear-gradient(180deg,#d4d4d8,#71717a_62%,#27272a)] px-2 py-1 shadow-[0_12px_20px_rgba(15,23,42,0.2)] transition-transform active:scale-[0.97] sm:py-1.5 lg:px-2.5 lg:py-2"
  >
    <div className="absolute inset-x-[14%] top-[10%] h-[18%] rounded-full bg-white/18 blur-md" />
    <div className="relative text-center">
      <div className="text-[7px] font-black uppercase tracking-[0.14em] text-slate-900/52 lg:text-[8px]">Rune</div>
      <div className="mt-1 text-base font-black tracking-tight text-white lg:text-lg">{value}</div>
    </div>
  </button>
);

const RuneLockDungeonsGame: React.FC<RuneLockDungeonsGameProps> = ({
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

  const [XP, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(82 + (levelId * 8));
  const [hearts, setHearts] = useState(MAX_HEARTS);
  const [roundNumber, setRoundNumber] = useState(1);
  const [Combo, setStreak] = useState(0);
  const [round, setRound] = useState<RuneRound>(() => createRound(levelId));
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
    setTimeLeft(82 + (levelId * 8));
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
      particleCount: 160,
      spread: 70,
      origin: { y: 0.62 },
      colors: ['#fcd34d', '#ffffff', '#a78bfa'],
    });
    onVictory(stars, finalScore);
  };

  const goToNextRound = (updatedScore: number) => {
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

  const loseHeart = () => {
    if (feedback || isFinished) return;
    const nextHearts = hearts - 1;
    setHearts(nextHearts);
    setStreak(0);
    setFeedback({ type: 'error', title: 'Trap Triggered', subtitle: `The rune was ${round.answer}.` });
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

  const handleAnswer = (choice: string) => {
    if (feedback || isFinished) return;
    if (choice !== round.answer) {
      loseHeart();
      return;
    }
    const points = 155 + (Combo * 24) + (round.mode === 'multi' ? 26 : 0);
    const updatedScore = XP + points;
    setScore(updatedScore);
    setStreak((previous) => previous + 1);
    setFeedback({ type: 'success', title: 'Door Opened', subtitle: `+${points} XP` });
    confetti({
      particleCount: 40,
      spread: 46,
      origin: { y: 0.72 },
      colors: ['#fcd34d', '#ffffff', '#c4b5fd'],
    });
    goToNextRound(updatedScore);
  };

  return (
    <div className="relative flex h-full w-full flex-col overflow-hidden bg-[linear-gradient(180deg,#110b1f_0%,#241230_42%,#140913_100%)]">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute inset-x-[-10%] top-[-12%] h-[32%] rounded-full bg-sky-300/10 blur-3xl" />
        <div className="absolute inset-x-0 top-0 h-[56%] bg-[linear-gradient(180deg,rgba(167,139,250,0.14),rgba(167,139,250,0.04),transparent)]" />
        <div className="absolute inset-x-0 bottom-0 h-[40%] bg-[linear-gradient(180deg,rgba(17,24,39,0),rgba(17,24,39,0.22),rgba(9,6,15,0.96))]" />
        <div className="absolute left-[12%] bottom-[16%] h-[7%] w-[18%] rounded-full bg-red-500/12 blur-2xl" />
        <div className="absolute right-[14%] bottom-[20%] h-[7%] w-[18%] rounded-full bg-orange-400/12 blur-2xl" />
      </div>

      <div className="relative z-10 flex h-full min-h-0 w-full flex-1 flex-col items-center gap-2 p-2 lg:gap-4 lg:p-4">
        <div className="w-full max-w-6xl">
        </div>

      <div className="licensed-board-frame structured-playfield-frame relative flex w-full max-w-6xl min-h-0 flex-1 overflow-hidden rounded-[2rem] border border-white/12 bg-[linear-gradient(180deg,rgba(255,255,255,0.06),rgba(255,255,255,0.02))] shadow-[0_28px_64px_rgba(0,0,0,0.34)] lg:rounded-[2.6rem]">
          <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.06),rgba(255,255,255,0.02)_20%,rgba(15,23,42,0.16)_100%)]" />
          <div className="absolute inset-x-0 bottom-0 h-[32%] bg-[linear-gradient(180deg,rgba(17,24,39,0),rgba(17,24,39,0.18),rgba(9,6,15,0.96))]" />
          <div className="absolute inset-x-[22%] top-[30%] h-[18%] rounded-full bg-[radial-gradient(circle_at_center,rgba(167,139,250,0.18),rgba(167,139,250,0.06),transparent_72%)]" />

          <div className="relative z-10 flex h-full w-full flex-col px-3 pb-2 pt-4 lg:px-6 lg:pb-4 lg:pt-8">
            <div className="flex justify-center">
              <div className="max-w-[94%] rounded-[1.35rem] border border-orange-200/22 bg-[linear-gradient(180deg,rgba(146,64,14,0.96),rgba(120,53,15,0.98))] px-3.5 py-2 text-center shadow-[inset_0_1px_0_rgba(255,255,255,0.16),0_12px_22px_rgba(120,53,15,0.2)] lg:px-5 lg:py-2.5">
                <div className="text-[0.9rem] font-black tracking-tight text-amber-50 lg:text-lg">{round.title}</div>
                <div className="mt-1 text-[9px] font-bold text-amber-100/84 lg:text-[11px]">
                  {formatFantasyPrompt(round.prompt)}
                </div>
              </div>
            </div>

            <div className="mt-1.5 grid min-h-0 flex-1 grid-cols-1 gap-2 sm:gap-2.5">
              <div className="flex min-h-[7.5rem] flex-col justify-between gap-2 rounded-[1.6rem] border border-white/12 bg-[linear-gradient(180deg,rgba(24,24,27,0.8),rgba(39,39,42,0.92))] p-2 shadow-[0_24px_40px_rgba(2,6,23,0.22)] sm:min-h-[8.5rem] lg:min-h-[10rem] lg:p-2.5">
                <div className="rounded-[1.1rem] border border-white/10 bg-black/18 p-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] lg:p-2.5">
                  <div className="text-[8px] font-black uppercase tracking-[0.16em] text-white/56 lg:text-xs">Rune puzzle</div>
                  <div className="game-question-copy mt-1 text-center tracking-tight text-white sm:text-[1.35rem] lg:text-[2rem]">
                    {formatFantasyPrompt(round.prompt)}
                  </div>
                  <div className="mt-1 text-center text-[9px] font-bold text-sky-100/82 lg:text-[11px]">{round.support}</div>
                </div>

                <div className="relative flex flex-1 items-center justify-center overflow-hidden rounded-[1.6rem] border border-white/12 bg-[linear-gradient(180deg,rgba(15,23,42,0.22),rgba(9,6,15,0.16))]">
                  <div className="absolute inset-x-[18%] top-[16%] h-[22%] rounded-full bg-sky-300/16 blur-2xl" />
                  <div className="absolute bottom-[12%] left-[14%] h-[10%] w-[14%] rounded-full bg-red-500/12 blur-xl" />
                  <div className="absolute bottom-[12%] right-[14%] h-[10%] w-[14%] rounded-full bg-orange-400/12 blur-xl" />

                  <div className="relative h-[7rem] w-[6.2rem] lg:h-[7.6rem] lg:w-[6.8rem]">
                    <div className="absolute inset-x-[16%] top-[8%] h-[14%] rounded-[1rem] border border-sky-200/20 bg-[linear-gradient(180deg,#4338ca,#312e81)] shadow-[0_18px_26px_rgba(49,46,129,0.24)]" />
                    <div className="absolute inset-x-[10%] top-[18%] bottom-[10%] rounded-[2rem] border-[6px] border-stone-400/55 bg-[linear-gradient(180deg,#4b5563,#1f2937_72%,#111827)] shadow-[0_24px_42px_rgba(0,0,0,0.32)]" />
                    <div className="absolute inset-x-[18%] top-[28%] h-[18%] rounded-full bg-[radial-gradient(circle_at_center,rgba(196,181,253,0.34),rgba(196,181,253,0.06),transparent_72%)]" />
        <div className="absolute left-1/2 top-[34%] h-[20%] w-[20%] -translate-x-1/2 rounded-full border border-sky-200/22 bg-[linear-gradient(180deg,#7dd3fc,#2563eb)] shadow-[0_0_18px_rgba(56,189,248,0.3)]" />
                    <div className="absolute left-1/2 top-[35.5%] -translate-x-1/2 text-lg font-black text-white">?</div>
                    <div className="absolute inset-x-[22%] bottom-[20%] h-[12%] rounded-[1rem] border border-white/10 bg-black/16" />
                    <div className="absolute inset-x-[28%] bottom-[24%] h-[4%] rounded-full bg-sky-200/24 blur-sm" />
                  </div>
                </div>
              </div>

              <div className="flex min-h-[7.5rem] flex-col justify-between gap-2 rounded-[1.6rem] border border-white/12 bg-[linear-gradient(180deg,rgba(15,23,42,0.84),rgba(30,41,59,0.92))] p-2 shadow-[0_24px_40px_rgba(2,6,23,0.24)] sm:min-h-[8.5rem] lg:min-h-[10rem] lg:p-2.5">
                <div className="rounded-[1.1rem] border border-white/12 bg-black/16 px-2 py-1 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] lg:px-2.5 lg:py-1.5">
                  <div className="text-[8px] font-black uppercase tracking-[0.16em] text-white/56">Door type</div>
                  <div className="mt-1 text-[0.95rem] font-black tracking-tight text-white lg:text-[1rem]">{round.doorLabel}</div>
                </div>

                <div className="grid grid-cols-2 gap-1 sm:gap-1.5 lg:gap-2">
                  {round.options.map((choice, index) => (
                    <RuneStone key={`${choice}-${index}`} value={choice} onClick={() => handleAnswer(choice)} />
                  ))}
                </div>

                <div className="rounded-[1.1rem] border border-white/12 bg-black/16 px-2 py-1 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] lg:px-2.5 lg:py-1.5">
                  <div className="text-[8px] font-black uppercase tracking-[0.16em] text-white/56">Dungeon goal</div>
                  <div className="mt-1 text-[8px] font-bold leading-snug text-white/88 lg:text-[9px]">
                    Open each rune door by placing the missing number correctly before the trap cycle completes.
                  </div>
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

        <div className="w-full max-w-6xl">
        </div>
      </div>
    </div>
  );
};

export default RuneLockDungeonsGame;

