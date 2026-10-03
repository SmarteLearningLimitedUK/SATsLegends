import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion, useIsPresent, useReducedMotion } from 'motion/react';
import confetti from 'canvas-confetti';
import GameplaySceneBackdrop from '../components/GameplaySceneBackdrop';
import { GameQuestionCard } from '../components/game-ui/GameUiKit';
import { triggerHaptic } from '../haptics';
import { buildPraiseMessage, shouldShowPraise } from '../utils/praiseFeedback';
import PracticeIntroPopup from '../components/game-ui/PracticeIntroPopup';
import { MiniGameShellContractProps, emitMiniGameSessionEvent } from '../app/gameplaySessionContract';
import './remainder-run.css';

interface RemainderRunGameProps extends MiniGameShellContractProps {
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
  if (level <= 2) return 90;
  if (level <= 4) return 75;
  return 60;
};

// A round never promotes itself beyond the difficulty the player selected.
const stageForTier = (tier: number) => [1, 3, 5, 7, 10][Math.max(0, Math.min(4, tier - 1))];

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
  const multiplier = randomInt(1, stage < 10 ? 1 : 3);
  const divisor = template.denominator * multiplier;
  const remainder = template.numerator * multiplier;
  const quotient = randomInt(stage < 10 ? 1 : 3, stage < 10 ? 12 : 25);
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

const podChoices = (problem: RemainderProblem) => shuffle(Array.from(new Set([
  problem.quotient, Math.max(0, problem.quotient - 1), problem.quotient + 1,
  problem.quotient + 2, Math.max(0, problem.quotient - 2),
])).slice(0, 4));

const leftoverChoices = (problem: RemainderProblem) => {
  if (problem.answerMode === 'remainder') {
    return shuffle(Array.from({ length: Math.min(4, problem.divisor) }, (_, index) => String((problem.remainder + index) % problem.divisor)));
  }
  const step = problem.stage < 10 ? 0.1 : 0.05;
  const places = problem.stage < 10 ? 1 : 2;
  const correct = Math.round((problem.remainder / problem.divisor) / step);
  const max = Math.round(1 / step) - 1;
  const values = new Set<number>([correct]);
  for (const offset of [1, -1, 2, -2, 3, -3, 4, -4]) {
    if (values.size >= 4) break;
    const candidate = correct + offset;
    if (candidate >= 1 && candidate <= max) values.add(candidate);
  }
  return shuffle(Array.from(values).map(value => formatDecimalAnswer(value * step, places)));
};

const correctLeftover = (problem: RemainderProblem) => problem.answerMode === 'remainder'
  ? String(problem.remainder)
  : formatDecimalAnswer(problem.remainder / problem.divisor, problem.stage < 10 ? 1 : 2);

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
      <div className="relative mt-2.5 flex items-center justify-center">
        <div className="relative mr-2.5 text-[clamp(2rem,9vw,3.9rem)] font-black leading-none text-sky-100 md:mr-3">
          {problem.divisor}
        </div>

        <div className="relative flex items-start">
          <div className="absolute left-[0.18rem] top-[-0.25rem] h-[2.35rem] w-[0.3rem] rounded-full bg-violet-200/90 md:h-[3.1rem]" />
          <div className="absolute left-[0.4rem] top-[-0.25rem] h-[0.3rem] w-[clamp(6.8rem,35vw,12.3rem)] rounded-full bg-violet-200/90 md:w-[clamp(8rem,36vw,13.8rem)]" />
          <div className="pl-[clamp(0.95rem,4vw,1.35rem)] pt-[clamp(0rem,0.5vw,0.16rem)]">
            <div className="flex items-end gap-[0.05em] text-[clamp(2.05rem,9.3vw,4.1rem)] font-black leading-none md:gap-[0.06em]">
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
  isPractice,
  practiceBriefing,
  sessionState,
  sessionEvents,
  onVictory,
  onGameOver: _onGameOver,
  onBack: _onBack,
}) => {
  const baseLevel = Math.max(1, Math.min(5, miniGameLevel || levelId || 1));
  const difficultyStage = stageForTier(baseLevel);
  const isPresent = useIsPresent();
  const reducedMotion = useReducedMotion();
  const initialRoundTime = useMemo(() => roundSecondsForLevel(baseLevel), [baseLevel]);

  const [timeLeft, setTimeLeft] = useState(initialRoundTime);
  const [XP, setScore] = useState(0);
  const [combo, setCombo] = useState(0);
  const [solvedCount, setSolvedCount] = useState(0);
  const [attemptCount, setAttemptCount] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [roundOver, setRoundOver] = useState(false);
  const [feedback, setFeedback] = useState<FeedbackState>(null);
  const [selectedPods, setSelectedPods] = useState<number | null>(null);
  const [selectedLeftover, setSelectedLeftover] = useState<string | null>(null);
  const [isLocked, setIsLocked] = useState(false);
  const [showPracticeIntro, setShowPracticeIntro] = useState(Boolean(isPractice));

  const [problem, setProblem] = useState<RemainderProblem>(() => {
    return createProblem(difficultyStage);
  });
  const pods = useMemo(() => podChoices(problem), [problem]);
  const leftovers = useMemo(() => leftoverChoices(problem), [problem]);

  const questionStartRef = useRef<number>(Date.now());
  const finishGuardRef = useRef(false);
  const timeoutRefs = useRef<number[]>([]);
  const answerLockRef = useRef(false);
  const presentRef = useRef(isPresent);
  presentRef.current = isPresent;
  const onVictoryRef = useRef(onVictory);
  onVictoryRef.current = onVictory;

  const clearTimeouts = () => {
    timeoutRefs.current.forEach((timer) => window.clearTimeout(timer));
    timeoutRefs.current = [];
  };

  useEffect(() => () => { finishGuardRef.current = true; clearTimeouts(); }, []);
  useEffect(() => { if (!isPresent) { finishGuardRef.current = true; clearTimeouts(); } }, [isPresent]);
  useEffect(() => setShowPracticeIntro(Boolean(isPractice)), [isPractice]);

  useEffect(() => {
    clearTimeouts();
    finishGuardRef.current = false;
    answerLockRef.current = false;
    setTimeLeft(initialRoundTime);
    setScore(0);
    setCombo(0);
    setSolvedCount(0);
    setAttemptCount(0);
    setCorrectCount(0);
    setRoundOver(false);
    setFeedback(null);
    setSelectedPods(null);
    setSelectedLeftover(null);
    setIsLocked(false);
    setProblem(createProblem(difficultyStage));
    questionStartRef.current = Date.now();
  }, [baseLevel, difficultyStage, initialRoundTime]);

  useEffect(() => {
    if (roundOver || isPractice || showPracticeIntro || sessionState?.paused || !isPresent) return undefined;
    const interval = window.setInterval(() => {
      setTimeLeft((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => window.clearInterval(interval);
  }, [isPractice, isPresent, roundOver, sessionState?.paused, showPracticeIntro]);

  useEffect(() => {
    if (!isPresent || sessionState?.paused || finishGuardRef.current || (isPractice ? correctCount < 5 : timeLeft > 0)) return;
    finishGuardRef.current = true;
    setRoundOver(true);
    setIsLocked(true);

    const stars = starsFromPerformance(XP, correctCount, attemptCount, difficultyStage);
    if (!reducedMotion) confetti({
      particleCount: 120,
      spread: 64,
      origin: { y: 0.68 },
      colors: ['#facc15', '#60a5fa', '#34d399', '#ffffff'],
    });
    emitMiniGameSessionEvent(sessionEvents, 'game_complete', { score: XP, stars });
    onVictoryRef.current(stars, XP);
  }, [attemptCount, correctCount, difficultyStage, isPractice, isPresent, reducedMotion, sessionEvents, sessionState?.paused, timeLeft, XP]);

  const timerProgress = Math.max(0, Math.min(1, timeLeft / initialRoundTime));
  const timerFillColor = useMemo(() => {
    const hue = Math.round(timerProgress * 120);
    return `hsl(${hue} 88% 50%)`;
  }, [timerProgress]);

  const moveToNextProblem = useCallback((delayMs: number) => {
    const timer = window.setTimeout(() => {
      if (!presentRef.current || finishGuardRef.current) return;
      setProblem(createProblem(difficultyStage));
      setFeedback(null);
      setSelectedPods(null);
      setSelectedLeftover(null);
      setIsLocked(false);
      answerLockRef.current = false;
      questionStartRef.current = Date.now();
    }, delayMs);
    timeoutRefs.current.push(timer);
  }, [difficultyStage]);

  const evaluateAnswer = useCallback(() => {
    if (!presentRef.current || showPracticeIntro || sessionState?.paused || roundOver || isLocked || answerLockRef.current || finishGuardRef.current || selectedPods === null || selectedLeftover === null) return;
    answerLockRef.current = true;
    setIsLocked(true);

    const nextAttempts = attemptCount + 1;
    const nextSolved = solvedCount + 1;
    const isCorrect = selectedPods === problem.quotient && selectedLeftover === correctLeftover(problem);

    setAttemptCount(nextAttempts);

    if (isCorrect) {
      const elapsedMs = Math.max(250, Date.now() - questionStartRef.current);
      const speedBonus = Math.max(20, Math.round(160 - (elapsedMs / 18)));
      const difficultyBonus = 80 + (problem.stage * 14);
      const streakMultiplier = 1 + Math.min(0.9, combo * 0.08);
      const points = Math.round((difficultyBonus + speedBonus) * streakMultiplier);
      const isPraise = shouldShowPraise(nextAttempts, elapsedMs);

      triggerHaptic('success');
      setScore((prev) => prev + points);
      emitMiniGameSessionEvent(sessionEvents, 'correct_answer', { score: XP + points, metadata: { problemId: problem.id, tier: baseLevel } });
      emitMiniGameSessionEvent(sessionEvents, 'puzzle_complete', { score: XP + points });
      setCorrectCount((prev) => prev + 1);
      setSolvedCount(nextSolved);
      setCombo((prev) => prev + 1);
      setFeedback({
        tone: isPraise ? 'praise' : 'success',
        title: isPraise ? buildPraiseMessage() : 'Correct',
        subtitle: isPraise ? 'Fast first try bonus!' : `+${points} points`,
      });

      if (!reducedMotion) confetti({
        particleCount: 24,
        spread: 32,
        origin: { y: 0.72 },
        colors: ['#4ade80', '#facc15', '#ffffff'],
      });

      moveToNextProblem(680);
      return;
    }

    triggerHaptic('error');
    setCombo(0);
    setScore((prev) => Math.max(0, prev - 25));
    if (!isPractice) setTimeLeft((prev) => Math.max(0, prev - 2));
    emitMiniGameSessionEvent(sessionEvents, 'incorrect_answer', { score: Math.max(0, XP - 25), metadata: { problemId: problem.id, tier: baseLevel } });
    setFeedback({
      tone: 'error',
      title: 'Cargo check',
      subtitle: selectedPods * problem.divisor > problem.dividend ? 'Too many full pods. Try fewer.' : 'The cargo does not balance yet. Adjust and retry.',
    });
    const timer = window.setTimeout(() => {
      if (!presentRef.current || finishGuardRef.current) return;
      setFeedback(null);
      setIsLocked(false);
      answerLockRef.current = false;
    }, 700);
    timeoutRefs.current.push(timer);
  }, [attemptCount, baseLevel, combo, isLocked, isPractice, moveToNextProblem, problem, reducedMotion, roundOver, selectedLeftover, selectedPods, sessionEvents, sessionState?.paused, showPracticeIntro, solvedCount, XP]);

  const showTopHud = !useSharedTopHud;

  const title = 'Remainder Run';

  return (
    <div className="relative z-20 h-full w-full overflow-hidden select-none bg-slate-950" data-remainder-game data-remainder-tier={baseLevel} data-remainder-stage={difficultyStage} data-remainder-correct={correctCount}>
      <GameplaySceneBackdrop gameType="remainder_run" />
      <PracticeIntroPopup open={showPracticeIntro} title="Remainder Run" body="Load equal cargo pods, then choose what is left over. Try five deliveries at your own pace." briefing={practiceBriefing} onAction={() => setShowPracticeIntro(false)} />

      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.12),rgba(15,23,42,0.06)_32%,rgba(2,6,23,0.36)_100%)]" />

      <main
        className={`relative z-20 flex h-full w-full flex-col ${useSharedTopHud ? 'pt-[calc(env(safe-area-inset-top)+5.3rem)]' : 'pt-[calc(env(safe-area-inset-top)+4.9rem)]'} px-[max(0.75rem,env(safe-area-inset-left))] pb-[max(0.85rem,env(safe-area-inset-bottom))]`}
      >
        <div className="mx-auto flex h-full w-full max-w-[27rem] min-h-0 flex-col gap-1.5">
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

          <GameQuestionCard
            title={title}
            subtitle={problem.answerMode === 'decimal'
              ? 'Pack full pods, then value the leftover as a decimal.'
              : 'Pack full pods, then place the remainder in the bay.'}
            className="mx-auto w-full max-w-[27rem] shrink-0"
            style={{ position: 'relative', top: 0, transform: 'none' }}
          >
            {problem.displayDividend} ÷ {problem.divisor} = ?
          </GameQuestionCard>

          <section data-division-playfield="true" className="remainder-playfield relative flex shrink-0 flex-col items-center justify-center gap-2">
            <div data-division-problem="true" data-problem-id={problem.id} className="w-full shrink-0">
              <LongDivisionVisual problem={problem} />
            </div>
            <div className="remainder-cargo" aria-label="Cargo loading preview">
              <div className="remainder-cargo-heading"><strong>Full pods</strong><span>Each holds {problem.divisor}</span></div>
              <div className="remainder-pods" data-remainder-pods={selectedPods ?? 0}>
                <AnimatePresence initial={false}>{selectedPods === null ? <span className="remainder-empty" key="empty">Choose a pod count</span>
                  : <React.Fragment key="loaded">{Array.from({ length: Math.min(selectedPods, 5) }, (_, index) => <motion.span key={`pod-${index}`}
                    initial={reducedMotion ? false : { y: 16, opacity: 0, scale: .7 }} animate={{ y: 0, opacity: 1, scale: 1 }} exit={reducedMotion ? undefined : { y: -8, opacity: 0 }}
                    transition={{ duration: .22, delay: reducedMotion ? 0 : index * .045 }} className="remainder-pod">{problem.divisor}</motion.span>)}
                    {selectedPods > 5 && <span className="remainder-more">+{selectedPods - 5}</span>}</React.Fragment>}</AnimatePresence>
              </div>
              <div className="remainder-cargo-foot"><span>{selectedPods === null ? 'Cargo waiting' : `${selectedPods} × ${problem.divisor} = ${selectedPods * problem.divisor} packed`}</span>
                <strong>{selectedPods === null ? '— left' : selectedPods * problem.divisor > problem.dividend ? 'Overfilled' : `${problem.dividend - selectedPods * problem.divisor} left`}</strong></div>
            </div>
          </section>

          <section className="remainder-controls shrink-0" aria-label="Load cargo">
            <div className="remainder-choice-label">1. How many full pods?</div>
            <div className="remainder-choices" role="group" aria-label="Full pod count">{pods.map(count => <motion.button key={`${problem.id}-pods-${count}`} type="button"
              data-remainder-pod-choice={count} aria-pressed={selectedPods === count}
              whileTap={reducedMotion ? undefined : { scale: .92 }}
              disabled={!isPresent || showPracticeIntro || isLocked || roundOver || sessionState?.paused}
              onClick={() => { setSelectedPods(count); triggerHaptic('selection'); }}>{count}</motion.button>)}</div>
            <div className="remainder-choice-label">2. {problem.answerMode === 'decimal' ? 'What is the leftover worth?' : 'How many are left over?'}</div>
            <div className="remainder-choices" role="group" aria-label="Leftover cargo">{leftovers.map(value => <motion.button key={`${problem.id}-leftover-${value}`} type="button"
              data-remainder-leftover-choice={value} aria-pressed={selectedLeftover === value}
              whileTap={reducedMotion ? undefined : { scale: .92 }}
              disabled={!isPresent || showPracticeIntro || isLocked || roundOver || sessionState?.paused}
              onClick={() => { setSelectedLeftover(value); triggerHaptic('selection'); }}>{value}</motion.button>)}</div>
            <button type="button" className="remainder-submit ui-button-primary" data-remainder-submit onClick={evaluateAnswer}
              disabled={!isPresent || showPracticeIntro || isLocked || roundOver || sessionState?.paused || selectedPods === null || selectedLeftover === null}>Seal the cargo</button>
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
