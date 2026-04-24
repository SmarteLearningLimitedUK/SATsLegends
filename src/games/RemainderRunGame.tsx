import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import confetti from 'canvas-confetti';
import GameplaySceneBackdrop from '../components/GameplaySceneBackdrop';
import { GameQuestionCard } from '../components/game-ui/GameUiKit';
import { triggerHaptic } from '../haptics';
import { buildPraiseMessage, shouldShowPraise } from '../utils/praiseFeedback';

interface RemainderRunGameProps {
  levelId: number;
  miniGameLevel?: number;
  avatarId: string;
  useSharedTopHud?: boolean;
  onVictory: (stars: number, XP: number) => void;
  onGameOver: (XP: number) => void;
  onBack: () => void;
}

interface RemainderProblem {
  id: string;
  dividend: number;
  displayDividend: string;
  divisor: number;
  quotient: number;
  remainder: number;
  answerMode: 'remainder' | 'decimal';
  answerLabel: string;
  options: string[];
  stage: number;
}

type FeedbackState = null | {
  tone: 'success' | 'error' | 'praise';
  title: string;
  subtitle: string;
};

interface DecimalTemplate {
  numerator: number;
  denominator: number;
}

const randomInt = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;
const shuffle = <T,>(items: T[]) => [...items].sort(() => Math.random() - 0.5);
const formatDecimalAnswer = (value: number, decimalPlaces: number) => value.toFixed(decimalPlaces).replace(/\.?0+$/, '');

const roundSecondsForLevel = (level: number) => {
  if (level <= 3) return 90;
  if (level <= 7) return 75;
  return 60;
};

const stageFromProgress = (baseLevel: number, solvedCount: number, timeLeft: number) => {
  const solvedBoost = Math.floor(solvedCount / 4);
  const urgencyBoost = timeLeft <= 15 ? 1 : 0;
  return Math.max(1, Math.min(12, baseLevel + solvedBoost + urgencyBoost));
};

const makeAnswerLabel = (quotient: number, remainder: number) => `${quotient} r${remainder}`;

const ONE_DP_TEMPLATES: DecimalTemplate[] = [
  { numerator: 1, denominator: 2 },
  { numerator: 1, denominator: 5 },
  { numerator: 2, denominator: 5 },
  { numerator: 3, denominator: 5 },
  { numerator: 4, denominator: 5 },
  { numerator: 1, denominator: 10 },
  { numerator: 3, denominator: 10 },
  { numerator: 7, denominator: 10 },
  { numerator: 9, denominator: 10 },
];

const TWO_DP_TEMPLATES: DecimalTemplate[] = [
  { numerator: 1, denominator: 4 },
  { numerator: 3, denominator: 4 },
  { numerator: 1, denominator: 20 },
  { numerator: 3, denominator: 20 },
  { numerator: 7, denominator: 20 },
  { numerator: 9, denominator: 20 },
  { numerator: 11, denominator: 20 },
  { numerator: 13, denominator: 20 },
  { numerator: 17, denominator: 20 },
  { numerator: 19, denominator: 20 },
];

const buildRemainderOptions = (quotient: number, remainder: number, stage: number) => {
  const correct = makeAnswerLabel(quotient, remainder);
  const pool = new Set<string>([correct]);
  const offsets = stage <= 3
    ? [1, -1, 2, -2]
    : stage <= 6
      ? [1, -1, 2, -2, 4, -4, 5, -5]
      : [1, -1, 2, -2, 3, -3, 6, -6];

  let guard = 0;
  while (pool.size < 4 && guard < 60) {
    guard += 1;
    const quotientDelta = offsets[randomInt(0, offsets.length - 1)];
    const remainderDelta = randomInt(-2, 2);
    const nextQuotient = Math.max(0, quotient + quotientDelta);
    const nextRemainder = Math.max(0, remainder + remainderDelta);
    const candidate = makeAnswerLabel(nextQuotient, nextRemainder);
    if (candidate !== correct) {
      pool.add(candidate);
    }
  }

  return shuffle(Array.from(pool).slice(0, 4));
};

const buildDecimalOptions = (answerValue: number, stage: number, decimalPlaces: number) => {
  const correct = formatDecimalAnswer(answerValue, decimalPlaces);
  const pool = new Set<string>([correct]);
  const offsets = stage < 10
    ? [0.1, -0.1, 0.2, -0.2, 0.3, -0.3, 0.4, -0.4]
    : [0.01, -0.01, 0.02, -0.02, 0.05, -0.05, 0.1, -0.1];

  let guard = 0;
  while (pool.size < 4 && guard < 60) {
    guard += 1;
    const delta = offsets[randomInt(0, offsets.length - 1)];
    const candidate = Math.max(0, answerValue + delta);
    const formatted = formatDecimalAnswer(candidate, decimalPlaces);
    if (formatted !== correct) {
      pool.add(formatted);
    }
  }

  return shuffle(Array.from(pool).slice(0, 4));
};

const createDecimalProblem = (stage: number): RemainderProblem => {
  const decimalPlaces = stage < 10 ? 1 : 2;
  const templatePool = stage < 10 ? ONE_DP_TEMPLATES : TWO_DP_TEMPLATES;
  const template = templatePool[randomInt(0, templatePool.length - 1)];
  const multiplier = randomInt(stage < 10 ? 2 : 3, stage < 10 ? 9 : 12);
  const divisor = template.denominator * multiplier;
  const remainder = template.numerator * multiplier;
  const quotient = randomInt(stage < 10 ? 10 : 18, stage < 10 ? 49 : 84);
  const dividend = (divisor * quotient) + remainder;
  const answerValue = quotient + (template.numerator / template.denominator);

  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    dividend,
    displayDividend: `${dividend}.0`,
    divisor,
    quotient,
    remainder,
    answerMode: 'decimal',
    answerLabel: formatDecimalAnswer(answerValue, decimalPlaces),
    options: buildDecimalOptions(answerValue, stage, decimalPlaces),
    stage,
  };
};

const createProblem = (stage: number): RemainderProblem => {
  if (stage >= 7) {
    return createDecimalProblem(stage);
  }

  let divisorMin = 2;
  let divisorMax = 6;
  let quotientMin = 2;
  let quotientMax = 9;
  let remainderMaxOffset = 1;

  if (stage <= 2) {
    divisorMin = 2;
    divisorMax = 4;
    quotientMin = 1;
    quotientMax = 4;
    remainderMaxOffset = 1;
  } else if (stage <= 3) {
    divisorMin = 2;
    divisorMax = 6;
    quotientMin = 2;
    quotientMax = 6;
    remainderMaxOffset = 1;
  } else if (stage >= 4) {
    divisorMin = 3;
    divisorMax = 9;
    quotientMin = 3;
    quotientMax = 16;
    remainderMaxOffset = 2;
  }

  const divisor = randomInt(divisorMin, divisorMax);
  const quotient = randomInt(quotientMin, quotientMax);
  const useZeroRemainder = randomInt(0, 9) < (stage <= 2 ? 3 : 2);
  const remainder = useZeroRemainder ? 0 : randomInt(1, Math.max(1, Math.min(divisor - 1, remainderMaxOffset)));
  const dividend = (divisor * quotient) + remainder;

  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    dividend,
    displayDividend: String(dividend),
    divisor,
    quotient,
    remainder,
    answerMode: 'remainder',
    answerLabel: makeAnswerLabel(quotient, remainder),
    options: buildRemainderOptions(quotient, remainder, stage),
    stage,
  };
};

const starsFromPerformance = (XP: number, correct: number, attempts: number, stage: number) => {
  const accuracy = attempts > 0 ? correct / attempts : 0;
  const target = 1200 + (stage * 150);

  if (XP >= target * 1.2 && accuracy >= 0.8) return 3;
  if (XP >= target * 0.8 && accuracy >= 0.6) return 2;
  return 1;
};

const digitColors = ['text-violet-500', 'text-emerald-500', 'text-blue-500', 'text-pink-500', 'text-amber-500', 'text-cyan-500'];

const LongDivisionVisual: React.FC<{ problem: RemainderProblem }> = ({ problem }) => {
  const digits = problem.displayDividend.split('');

  return (
    <div className="relative overflow-hidden rounded-[1.3rem] border border-violet-200/24 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.12),rgba(255,255,255,0)_44%),linear-gradient(180deg,rgba(26,54,124,0.96),rgba(10,17,40,0.98))] px-3 py-3 shadow-[0_18px_34px_rgba(2,6,23,0.22)] md:rounded-[1.7rem] md:px-4 md:py-4">
      <div className="relative mt-4 flex items-center justify-center">
        <div className="relative mr-3 text-[clamp(2.2rem,10vw,4.3rem)] font-black leading-none text-sky-100 md:mr-4">
          {problem.divisor}
        </div>

        <div className="relative flex items-start">
          <div className="absolute left-[0.18rem] top-[-0.3rem] h-[2.9rem] w-[0.34rem] rounded-full bg-violet-200/90 md:h-[3.8rem]" />
          <div className="absolute left-[0.42rem] top-[-0.3rem] h-[0.34rem] w-[clamp(7.5rem,38vw,13.5rem)] rounded-full bg-violet-200/90 md:w-[clamp(9rem,40vw,15rem)]" />
          <div className="pl-[clamp(1.1rem,4.6vw,1.6rem)] pt-[clamp(0.05rem,0.7vw,0.22rem)]">
            <div className="flex items-end gap-[0.05em] text-[clamp(2.4rem,10.8vw,4.8rem)] font-black leading-none md:gap-[0.06em]">
              {digits.map((digit, index) => {
                if (digit === '.') {
                  return (
                    <span key={`${problem.id}-${index}`} className="relative mx-[0.06em] inline-flex items-center">
                      <span className="mt-[0.36em] inline-block h-[0.22em] w-[0.22em] rounded-full bg-violet-200 shadow-[0_1px_0_rgba(255,255,255,0.42)]" />
                    </span>
                  );
                }

                return (
                  <span
                    key={`${problem.id}-${index}`}
                    className={`${digitColors[index % digitColors.length]} drop-shadow-[0_1px_0_rgba(255,255,255,0.36)]`}
                  >
                    {digit}
                  </span>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const RemainderRunGame: React.FC<RemainderRunGameProps> = ({
  levelId,
  miniGameLevel,
  useSharedTopHud = false,
  onVictory,
  onGameOver: _onGameOver,
  onBack: _onBack,
}) => {
  const baseLevel = Math.max(1, Math.min(12, miniGameLevel || levelId || 1));
  const initialRoundTime = useMemo(() => roundSecondsForLevel(baseLevel), [baseLevel]);

  const [timeLeft, setTimeLeft] = useState(initialRoundTime);
  const [XP, setScore] = useState(0);
  const [combo, setCombo] = useState(0);
  const [solvedCount, setSolvedCount] = useState(0);
  const [attemptCount, setAttemptCount] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [roundOver, setRoundOver] = useState(false);
  const [feedback, setFeedback] = useState<FeedbackState>(null);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [isLocked, setIsLocked] = useState(false);

  const [problem, setProblem] = useState<RemainderProblem>(() => {
    const startStage = stageFromProgress(baseLevel, 0, initialRoundTime);
    return createProblem(startStage);
  });

  const questionStartRef = useRef<number>(Date.now());
  const finishGuardRef = useRef(false);
  const timeoutRefs = useRef<number[]>([]);

  const clearTimeouts = () => {
    timeoutRefs.current.forEach((timer) => window.clearTimeout(timer));
    timeoutRefs.current = [];
  };

  useEffect(() => () => clearTimeouts(), []);

  useEffect(() => {
    clearTimeouts();
    finishGuardRef.current = false;
    setTimeLeft(initialRoundTime);
    setScore(0);
    setCombo(0);
    setSolvedCount(0);
    setAttemptCount(0);
    setCorrectCount(0);
    setRoundOver(false);
    setFeedback(null);
    setSelectedAnswer(null);
    setIsLocked(false);
    const nextStage = stageFromProgress(baseLevel, 0, initialRoundTime);
    setProblem(createProblem(nextStage));
    questionStartRef.current = Date.now();
  }, [baseLevel, initialRoundTime]);

  useEffect(() => {
    if (roundOver) return undefined;
    const interval = window.setInterval(() => {
      setTimeLeft((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => window.clearInterval(interval);
  }, [roundOver]);

  useEffect(() => {
    if (timeLeft > 0 || finishGuardRef.current) return;
    finishGuardRef.current = true;
    setRoundOver(true);
    setIsLocked(true);

    const finalStage = stageFromProgress(baseLevel, solvedCount, 0);
    const stars = starsFromPerformance(XP, correctCount, attemptCount, finalStage);
    confetti({
      particleCount: 120,
      spread: 64,
      origin: { y: 0.68 },
      colors: ['#facc15', '#60a5fa', '#34d399', '#ffffff'],
    });
    onVictory(stars, XP);
  }, [attemptCount, baseLevel, correctCount, onVictory, XP, solvedCount, timeLeft]);

  const timerProgress = Math.max(0, Math.min(1, timeLeft / initialRoundTime));
  const timerFillColor = useMemo(() => {
    const hue = Math.round(timerProgress * 120);
    return `hsl(${hue} 88% 50%)`;
  }, [timerProgress]);

  const moveToNextProblem = useCallback((nextSolvedCount: number, delayMs: number) => {
    const timer = window.setTimeout(() => {
      if (finishGuardRef.current) return;
      const nextStage = stageFromProgress(baseLevel, nextSolvedCount, timeLeft);
      setProblem(createProblem(nextStage));
      setFeedback(null);
      setSelectedAnswer(null);
      setIsLocked(false);
      questionStartRef.current = Date.now();
    }, delayMs);
    timeoutRefs.current.push(timer);
  }, [baseLevel, timeLeft]);

  const evaluateAnswer = useCallback((choice: string) => {
    if (roundOver || isLocked) return;
    setIsLocked(true);
    setSelectedAnswer(choice);

    const nextAttempts = attemptCount + 1;
    const nextSolved = solvedCount + 1;
    const isCorrect = choice === problem.answerLabel;

    setAttemptCount(nextAttempts);
    setSolvedCount(nextSolved);

    if (isCorrect) {
      const elapsedMs = Math.max(250, Date.now() - questionStartRef.current);
      const speedBonus = Math.max(20, Math.round(160 - (elapsedMs / 18)));
      const difficultyBonus = 80 + (problem.stage * 14);
      const streakMultiplier = 1 + Math.min(0.9, combo * 0.08);
      const points = Math.round((difficultyBonus + speedBonus) * streakMultiplier);
      const isPraise = shouldShowPraise(nextAttempts, elapsedMs);

      triggerHaptic('success');
      setScore((prev) => prev + points);
      setCorrectCount((prev) => prev + 1);
      setCombo((prev) => prev + 1);
      setFeedback({
        tone: isPraise ? 'praise' : 'success',
        title: isPraise ? buildPraiseMessage() : 'Correct',
        subtitle: isPraise ? 'Fast first try bonus!' : `+${points} points`,
      });

      confetti({
        particleCount: 24,
        spread: 32,
        origin: { y: 0.72 },
        colors: ['#4ade80', '#facc15', '#ffffff'],
      });

      moveToNextProblem(nextSolved, 320);
      return;
    }

    triggerHaptic('error');
    setCombo(0);
    setScore((prev) => Math.max(0, prev - 25));
    setTimeLeft((prev) => Math.max(0, prev - 2));
    setFeedback({
      tone: 'error',
      title: 'Not quite',
      subtitle: 'Check your working and try the next one.',
    });
    moveToNextProblem(nextSolved, 620);
  }, [attemptCount, combo, isLocked, moveToNextProblem, problem, roundOver, solvedCount]);

  const showTopHud = !useSharedTopHud;

  const title = 'Remainder Run';

  return (
    <div className="relative z-20 h-full w-full overflow-hidden select-none bg-slate-950">
      <GameplaySceneBackdrop gameType="remainder_run" />

      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.12),rgba(15,23,42,0.06)_32%,rgba(2,6,23,0.36)_100%)]" />

      <main
        className={`relative z-20 flex h-full w-full flex-col ${useSharedTopHud ? 'pt-[calc(env(safe-area-inset-top)+5.3rem)]' : 'pt-[max(0.25rem,env(safe-area-inset-top))]'} px-[max(0.75rem,env(safe-area-inset-left))] pb-[max(0.85rem,env(safe-area-inset-bottom))]`}
      >
        <div className="mx-auto flex h-full w-full max-w-[27rem] min-h-0 flex-col gap-2">
          {showTopHud ? (
            <header className="rounded-[0.95rem] border border-violet-200/24 bg-[linear-gradient(180deg,rgba(50,14,94,0.94),rgba(19,8,44,0.92))] px-3 py-1.5 shadow-[0_10px_18px_rgba(2,6,23,0.18)] backdrop-blur-sm">
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <div className="text-[9px] font-black uppercase tracking-[0.18em] text-violet-500/70">Time</div>
                  <div className="relative mt-1 h-3 overflow-hidden rounded-full border border-violet-200/30 bg-violet-50">
                    <motion.div
                      className="absolute inset-y-0 left-0 rounded-full"
                      animate={{ width: `${timerProgress * 100}%`, backgroundColor: timerFillColor }}
                      transition={{ duration: 0.24, ease: 'easeOut' }}
                      style={{ boxShadow: '0 0 12px rgba(168,85,247,0.22)' }}
                    />
                  </div>
                </div>
                <div className="shrink-0 rounded-full border border-violet-100/20 bg-[linear-gradient(180deg,rgba(104,39,255,0.22),rgba(31,12,68,0.82))] px-3 py-1 text-center">
                  <div className="text-[8px] font-black uppercase tracking-[0.16em] text-violet-500/70">XP</div>
                  <div className="text-sm font-black text-white">{XP}</div>
                </div>
              </div>
            </header>
          ) : null}

          <section className="shrink-0 rounded-[1.1rem] border border-white/16 bg-[linear-gradient(180deg,rgba(16,25,49,0.74),rgba(8,12,25,0.86))] p-2 shadow-[0_10px_18px_rgba(2,6,23,0.16)] backdrop-blur-sm">
            <GameQuestionCard
              title={title}
              subtitle="Use the division setup shown below."
              className="mx-auto max-w-[27rem] border border-violet-200/26 bg-[linear-gradient(180deg,rgba(60,16,144,0.92),rgba(27,11,74,0.88))] shadow-[0_12px_24px_rgba(2,6,23,0.16)]"
              titleClassName="text-violet-100"
            >
              Work out the quotient or decimal shown by the division spell.
            </GameQuestionCard>

            <div className="mt-2">
              <LongDivisionVisual problem={problem} />
            </div>
          </section>

          <section className="answer-choice-surface shrink-0 rounded-[1.1rem] border border-white/16 bg-[linear-gradient(180deg,rgba(16,25,49,0.72),rgba(8,12,25,0.84))] p-2 shadow-[0_10px_18px_rgba(2,6,23,0.16)] backdrop-blur-sm">
            <div className="text-center text-[9px] font-black uppercase tracking-[0.16em] text-amber-100/80">
              Tap the correct quotient and remainder
            </div>
            <div className="mt-2 grid grid-cols-4 gap-1.5">
              {problem.options.map((option, index) => (
                <button
                  key={`${problem.id}-${option}-${index}`}
                  type="button"
                  disabled={isLocked || roundOver}
                  onClick={() => evaluateAnswer(option)}
                  className={`relative min-h-[3rem] rounded-[0.85rem] border px-2 py-2 text-center shadow-[0_8px_18px_rgba(2,6,23,0.16)] transition-transform duration-150 hover:scale-[1.01] disabled:opacity-55 ${
                    selectedAnswer === option
                      ? feedback?.tone === 'success' || feedback?.tone === 'praise'
                        ? 'ui-button-success'
                        : 'ui-button-primary'
                      : 'ui-button-secondary'
                  }`}
                >
                  <span className="text-[clamp(0.92rem,3.6vw,1.28rem)] font-black text-white">{option}</span>
                </button>
              ))}
            </div>
          </section>
        </div>
      </main>

      <AnimatePresence>
        {feedback ? (
          <motion.div
            key={`${feedback.tone}-${feedback.title}-${feedback.subtitle}`}
            initial={{ opacity: 0, scale: 0.88 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.08 }}
            className={`pointer-events-none absolute left-1/2 top-[calc(env(safe-area-inset-top)+4.8rem)] z-50 -translate-x-1/2 rounded-[0.95rem] border px-3 py-1.5 text-center shadow-[0_14px_24px_rgba(2,6,23,0.35)] ${
              feedback.tone === 'praise'
                ? 'border-amber-100/64 bg-[linear-gradient(135deg,rgba(255,241,166,0.96),rgba(125,211,252,0.9))] text-slate-950 shadow-[0_0_22px_rgba(251,191,36,0.55)]'
                : feedback.tone === 'success'
                ? 'border-emerald-100/62 bg-emerald-500/28 text-emerald-50'
                : 'border-rose-100/62 bg-rose-500/30 text-amber-50'
            }`}
          >
            <div className="text-[11px] font-black uppercase tracking-[0.12em]">{feedback.title}</div>
            <div className="mt-0.5 text-[10px] font-bold">{feedback.subtitle}</div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
};

export default RemainderRunGame;
