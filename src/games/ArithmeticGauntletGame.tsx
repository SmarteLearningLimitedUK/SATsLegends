import React, { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import confetti from 'canvas-confetti';
import placeValueBackground from '../assets/maps/gemini-2.5-flash-image_using_the_same_aesthetic_-_create_a_dark_and_mysterious_forest_path_with_dense_f-1.jpg';
import medButton from '../assets/bluedialoague/med button cropped.png';
import { triggerHaptic } from '../haptics';
import { GameScreenShell, PuzzleStage } from '../layout/ScreenPrimitives';

interface ArithmeticGauntletGameProps {
  levelId: number;
  avatarId: string;
  onVictory: (stars: number, XP: number) => void;
  onGameOver: (XP: number) => void;
  onBack: () => void;
}

type Operation = '+' | '-' | '*' | '/';

interface ArithmeticQuestion {
  prompt: string;
  answer: number;
}

type FeedbackState = null | {
  type: 'success' | 'error';
  title: string;
  subtitle: string;
};

const ROUND_SECONDS = 60;
const MAX_LIVES = 3;

const randomInt = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;

const createQuestion = (levelId: number): ArithmeticQuestion => {
  const resolvedLevel = Math.max(1, Math.min(10, levelId || 1));
  const availableOps: Operation[] = resolvedLevel <= 2
    ? ['+', '-']
    : resolvedLevel <= 5
      ? ['+', '-', '*']
      : ['+', '-', '*', '/'];

  const op = availableOps[randomInt(0, availableOps.length - 1)];

  if (op === '+') {
    const max = 20 + (resolvedLevel * 8);
    const a = randomInt(4, max);
    const b = randomInt(3, max);
    return { prompt: `${a} + ${b}`, answer: a + b };
  }

  if (op === '-') {
    const max = 24 + (resolvedLevel * 9);
    const a = randomInt(8, max);
    const b = randomInt(2, a - 1);
    return { prompt: `${a} - ${b}`, answer: a - b };
  }

  if (op === '*') {
    const maxFactor = Math.min(14, 7 + Math.floor(resolvedLevel / 2));
    const a = randomInt(2, maxFactor);
    const b = randomInt(2, maxFactor);
    return { prompt: `${a} * ${b}`, answer: a * b };
  }

  const divisor = randomInt(2, Math.min(12, 5 + Math.floor(resolvedLevel / 2)));
  const quotient = randomInt(2, Math.min(14, 7 + Math.floor(resolvedLevel / 2)));
  const dividend = divisor * quotient;
  return { prompt: `${dividend} / ${divisor}`, answer: quotient };
};

const starsForScore = (XP: number, targetScore: number, accuracy: number) => {
  if (XP >= targetScore * 0.9 && accuracy >= 0.82) return 3;
  if (XP >= targetScore * 0.55 && accuracy >= 0.62) return 2;
  return 1;
};

const ArithmeticGauntletGame: React.FC<ArithmeticGauntletGameProps> = ({
  levelId,
  avatarId: _avatarId,
  onVictory,
  onGameOver,
  onBack: _onBack,
}) => {
  const resolvedLevel = useMemo(() => Math.max(1, Math.min(10, levelId || 1)), [levelId]);
  const targetScore = useMemo(() => 1800 + (resolvedLevel * 240), [resolvedLevel]);

  const [XP, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(ROUND_SECONDS);
  const [Combo, setStreak] = useState(0);
  const [lives, setLives] = useState(MAX_LIVES);
  const [questionCount, setQuestionCount] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [question, setQuestion] = useState<ArithmeticQuestion>(() => createQuestion(resolvedLevel));
  const [inputValue, setInputValue] = useState('');
  const [feedback, setFeedback] = useState<FeedbackState>(null);
  const [isFinished, setIsFinished] = useState(false);

  const timersRef = useRef<number[]>([]);
  const scoreRef = useRef(0);

  const clearTimers = () => {
    timersRef.current.forEach((timerId) => window.clearTimeout(timerId));
    timersRef.current = [];
  };

  useEffect(() => {
    scoreRef.current = XP;
  }, [XP]);

  useEffect(() => () => clearTimers(), []);

  useEffect(() => {
    clearTimers();
    setScore(0);
    scoreRef.current = 0;
    setTimeLeft(ROUND_SECONDS);
    setStreak(0);
    setLives(MAX_LIVES);
    setQuestionCount(0);
    setCorrectCount(0);
    setQuestion(createQuestion(resolvedLevel));
    setInputValue('');
    setFeedback(null);
    setIsFinished(false);
  }, [resolvedLevel]);

  useEffect(() => {
    if (isFinished) return undefined;

    const interval = window.setInterval(() => {
      setTimeLeft((previous) => {
        if (previous <= 1) {
          window.clearInterval(interval);
          setIsFinished(true);
          const attempts = Math.max(1, questionCount);
          const accuracy = correctCount / attempts;
          const stars = starsForScore(scoreRef.current, targetScore, accuracy);

          confetti({
            particleCount: 95,
            spread: 64,
            origin: { y: 0.66 },
            colors: ['#fcd34d', '#67e8f9', '#ffffff'],
          });
          onVictory(stars, scoreRef.current);
          return 0;
        }
        return previous - 1;
      });
    }, 1000);

    return () => window.clearInterval(interval);
  }, [correctCount, isFinished, onVictory, questionCount, targetScore]);

  const queueNextQuestion = () => {
    const timerId = window.setTimeout(() => {
      setQuestion(createQuestion(resolvedLevel));
      setInputValue('');
      setFeedback(null);
    }, 280);
    timersRef.current.push(timerId);
  };

  const handleKeyPress = (key: string) => {
    if (isFinished) return;

    if (key === 'DEL') {
      setInputValue((previous) => previous.slice(0, -1));
      return;
    }

    if (key === 'CLR') {
      setInputValue('');
      return;
    }

    if (key === '-') {
      setInputValue((previous) => {
        if (previous.startsWith('-')) return previous.slice(1);
        return `-${previous}`;
      });
      return;
    }

    if (!/^[0-9]$/.test(key)) return;

    setInputValue((previous) => {
      const maxChars = previous.startsWith('-') ? 6 : 5;
      if (previous.length >= maxChars) return previous;
      return `${previous}${key}`;
    });
  };

  const submitAnswer = () => {
    if (isFinished) return;

    const trimmed = inputValue.trim();
    if (!trimmed || trimmed === '-') {
      setFeedback({
        type: 'error',
        title: 'No Input',
        subtitle: 'Enter an answer first.',
      });
      triggerHaptic('error');
      return;
    }

    const parsed = Number(trimmed);
    if (Number.isNaN(parsed)) {
      setFeedback({
        type: 'error',
        title: 'Invalid',
        subtitle: 'Answer must be numeric.',
      });
      triggerHaptic('error');
      return;
    }

    setQuestionCount((previous) => previous + 1);

    if (parsed === question.answer) {
      const gained = 110 + (Combo * 18);
      const updatedScore = XP + gained;
      setScore(updatedScore);
      scoreRef.current = updatedScore;
      setStreak((previous) => previous + 1);
      setCorrectCount((previous) => previous + 1);
      setFeedback({
        type: 'success',
        title: 'Correct',
        subtitle: `+${gained} XP`,
      });
      triggerHaptic('success');
      queueNextQuestion();
      return;
    }

    const nextLives = lives - 1;
    setLives(nextLives);
    setStreak(0);
    setFeedback({
      type: 'error',
      title: 'Miss',
      subtitle: `Correct: ${question.answer}`,
    });
    triggerHaptic('error');

    if (nextLives <= 0) {
      const timerId = window.setTimeout(() => {
        setIsFinished(true);
        onGameOver(scoreRef.current);
      }, 650);
      timersRef.current.push(timerId);
      return;
    }

    queueNextQuestion();
  };

  const keypadRows = [
    ['7', '8', '9', 'DEL'],
    ['4', '5', '6', 'CLR'],
    ['1', '2', '3', '-'],
    ['0'],
  ];

  return (
    <GameScreenShell className="overflow-hidden">
      <img
        src={placeValueBackground}
        alt=""
        aria-hidden="true"
        className="absolute inset-0 h-full w-full object-cover object-center"
        draggable={false}
      />
      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(6,16,34,0.2),rgba(6,16,34,0.34)_56%,rgba(6,16,34,0.52))]" />

      <div className="relative z-10 flex h-full min-h-0 w-full flex-1 flex-col items-center px-2 pb-[calc(env(safe-area-inset-bottom)+2.1rem)] pt-[calc(env(safe-area-inset-top)+4.8rem)] md:px-4 md:pb-[calc(env(safe-area-inset-bottom)+2.4rem)] md:pt-[calc(env(safe-area-inset-top)+5.1rem)]">
        <PuzzleStage className="w-full max-w-5xl min-h-0 flex-1 rounded-[1.7rem] p-2 md:rounded-[2rem] md:p-3">
          <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.08),rgba(255,255,255,0.02)_24%,rgba(15,23,42,0.2)_100%)]" />

          <div className="relative z-10 flex h-full w-full min-h-0 flex-col px-2 pb-2 pt-2 md:px-4 md:pb-4">
            <div className="flex justify-center">
              <div className="licensed-slice-paper-panel max-w-[96%] px-3 py-1.5 text-center shadow-[0_10px_22px_rgba(15,23,42,0.14)] md:px-6 md:py-2.5">
                <div className="text-sm font-black tracking-tight text-amber-900 md:text-[1.18rem]">Arithmetic Gauntlet</div>
                <div className="mt-0.5 text-[11px] font-bold text-amber-950/76 md:text-sm">Solve fast. Type answers on the calculator.</div>
              </div>
            </div>

            <div className="mt-2 grid grid-cols-4 gap-2 md:mt-3 md:gap-3">
              <div className="rounded-xl border border-white/20 bg-slate-950/42 px-2 py-1 text-center">
                <div className="text-[9px] font-black uppercase tracking-[0.12em] text-cyan-100/70">Time</div>
                <div className="text-lg font-black text-white md:text-xl">{timeLeft}s</div>
              </div>
              <div className="rounded-xl border border-white/20 bg-slate-950/42 px-2 py-1 text-center">
                <div className="text-[9px] font-black uppercase tracking-[0.12em] text-cyan-100/70">Lives</div>
                <div className="text-lg font-black text-white md:text-xl">{lives}/3</div>
              </div>
              <div className="rounded-xl border border-white/20 bg-slate-950/42 px-2 py-1 text-center">
                <div className="text-[9px] font-black uppercase tracking-[0.12em] text-cyan-100/70">Combo</div>
                <div className="text-lg font-black text-white md:text-xl">x{Combo}</div>
              </div>
              <div className="rounded-xl border border-white/20 bg-slate-950/42 px-2 py-1 text-center">
                <div className="text-[9px] font-black uppercase tracking-[0.12em] text-cyan-100/70">XP</div>
                <div className="text-lg font-black text-white md:text-xl">{XP}</div>
              </div>
            </div>

            <div className="mt-2 min-h-0 flex-1 md:mt-3">
              <div className="licensed-game-card-dark flex h-full min-h-0 flex-col rounded-[1.3rem] border border-white/14 p-2 shadow-[0_12px_22px_rgba(2,6,23,0.2)] md:rounded-[1.6rem] md:p-3">
                <div className="text-[11px] font-black uppercase tracking-[0.16em] text-cyan-100/75 md:text-xs">Question {questionCount + 1}</div>
                <div className="mt-2 rounded-[1rem] border border-sky-200/22 bg-[linear-gradient(180deg,rgba(14,116,144,0.2),rgba(15,23,42,0.5))] p-2.5 text-center shadow-[0_10px_18px_rgba(2,6,23,0.18)] md:p-3">
                  <div className="text-2xl font-black tracking-tight text-white md:text-4xl">{question.prompt}</div>
                </div>

                <div className="mt-2 rounded-[1rem] border border-amber-200/30 bg-slate-950/48 px-3 py-2 text-center shadow-[inset_0_0_0_1px_rgba(255,255,255,0.05)]">
                  <div className="text-[10px] font-black uppercase tracking-[0.16em] text-amber-200/80">Answer</div>
                  <div className="mt-0.5 min-h-[1.85rem] text-2xl font-black text-white md:text-3xl">{inputValue || '--'}</div>
                </div>

                <div className="mt-2 grid grid-cols-4 gap-2 md:mt-3 md:gap-2.5">
                  {keypadRows.flat().map((key) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => handleKeyPress(key)}
                      disabled={isFinished}
                      className={`rounded-[0.95rem] border border-sky-200/28 bg-[linear-gradient(180deg,rgba(15,23,42,0.7),rgba(15,23,42,0.54))] px-2 py-2 text-center font-black text-white shadow-[0_8px_16px_rgba(2,6,23,0.22)] transition active:scale-[0.98] disabled:opacity-55 md:rounded-[1.08rem] md:py-2.5 ${key === '0' ? 'col-span-4 text-2xl md:text-[1.7rem]' : 'text-xl md:text-[1.5rem]'}`}
                    >
                      {key}
                    </button>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={submitAnswer}
                  disabled={isFinished}
                  className="relative mt-2 h-12 overflow-hidden rounded-[1rem] transition active:scale-[0.985] disabled:opacity-60 md:mt-3 md:h-14"
                >
                  <img src={medButton} alt="" aria-hidden="true" draggable={false} className="absolute inset-0 h-full w-full object-fill" />
                  <span className="relative z-10 text-base font-black uppercase tracking-[0.14em] text-white [text-shadow:0_2px_4px_rgba(2,6,23,0.7)] md:text-lg">Submit</span>
                </button>
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
                <div className="rounded-[1.4rem] border border-white/14 bg-slate-950/62 px-5 py-4 text-center shadow-[0_16px_24px_rgba(0,0,0,0.24)] md:rounded-[2rem] md:px-8 md:py-6">
                  <div className={`text-3xl font-black uppercase tracking-[0.12em] md:text-6xl ${feedback.type === 'success' ? 'text-emerald-100' : 'text-red-100'}`}>{feedback.title}</div>
                  <div className="mt-1 text-sm font-bold text-white/92 md:mt-2 md:text-2xl">{feedback.subtitle}</div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </PuzzleStage>
      </div>
    </GameScreenShell>
  );
};

export default ArithmeticGauntletGame;
