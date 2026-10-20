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
  answerMode: 'remainder' | 'decimal' | 'group_board';
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
  return 180; // Four-digit division has an on-screen working board.
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

const createWrittenProblem = (stage: number): RemainderProblem => {
  const divisor = randomInt(12, 25);
  const quotient = randomInt(90, 150);
  const remainder = randomInt(0, divisor - 1);
  const dividend = divisor * quotient + remainder;
  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    dividend,
    displayDividend: String(dividend),
    divisor,
    quotient,
    remainder,
    answerMode: 'group_board',
    answerLabel: makeAnswerLabel(quotient, remainder),
    options: [],
    stage,
  };
};

const createProblem = (stage: number, questionNumber = 0): RemainderProblem => {
  if (stage >= 10 && questionNumber % 3 === 0) return createWrittenProblem(stage);
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

const DIVISION_GROUPS = [100, 50, 20, 10, 5, 2, 1] as const;
interface DivisionWorking {
  remaining: number;
  quotient: number;
  steps: { groups: number; amount: number }[];
}

const CargoDeck: React.FC<{ problem: RemainderProblem; working: DivisionWorking; reduced: boolean; departing: boolean }> = ({ problem, working, reduced, departing }) => {
 const guided = problem.answerMode === 'group_board';
 const steps = working.steps;
 return <div className="cargo-deck" data-cargo-deck data-cargo-remaining={working.remaining} data-cargo-loaded={working.quotient}>
  <div className="cargo-scoreboard" aria-live="polite">
   <div><span>{problem.answerMode === 'decimal' ? 'Rope to share' : 'On the dock'}</span><strong>{guided ? working.remaining : problem.displayDividend}{problem.answerMode === 'decimal' ? ' m' : ''}</strong></div>
   <div><span>{guided ? 'Boxes loaded' : problem.answerMode === 'decimal' ? 'Boats' : 'In each box'}</span><strong>{guided ? working.quotient : problem.divisor}</strong></div>
  </div>
  <div className="cargo-loading-bay" aria-hidden="true">
   <div className="cargo-capacity">{problem.answerMode === 'decimal' ? 'Equal shares for every boat' : `${problem.divisor} crates fill one box`}</div>
   <motion.div className="cargo-pallet" animate={departing && !reduced ? {x:100,opacity:0} : {x:0,opacity:1}} transition={{duration:.65,ease:'easeIn'}}>
    {problem.answerMode === 'decimal' ? <div className="cargo-rope" /> : Array.from({length:guided ? Math.min(6,steps.length) : 3},(_,i)=><motion.div key={`${problem.id}-${i}`} className="cargo-box" initial={reduced ? false : {y:-55,opacity:0,rotate:-5}} animate={{y:0,opacity:1,rotate:0}} transition={{type:'spring',stiffness:170,damping:20}}><span>✦</span></motion.div>)}
    <div className="cargo-pallet-base" />
   </motion.div>
   {guided && steps.length===0 ? <div className="cargo-empty">Load your first batch</div> : null}
   <AnimatePresence>{guided && steps.length>0 && !reduced ? <motion.div key={`${problem.id}-${steps.length}`} className="cargo-lift" initial={{x:-65,y:-55,opacity:0}} animate={{x:0,y:5,opacity:[0,1,1,0]}} exit={{opacity:0}} transition={{duration:.65,ease:'easeInOut'}}>+{steps.at(-1)?.groups} boxes</motion.div> : null}</AnimatePresence>
  </div>
  <div className="cargo-manifest" aria-live="polite">{guided ? steps.length ? steps.slice(-4).map((step,i)=><span key={`${steps.length-i}-${step.groups}`}>{step.groups} boxes · {step.amount} crates</span>) : <span>Choose a batch to load →</span> : <span>{problem.displayDividend} ÷ {problem.divisor} · Ready to send?</span>}</div>
 </div>;
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
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [isLocked, setIsLocked] = useState(false);
  const [showPracticeIntro, setShowPracticeIntro] = useState(Boolean(isPractice));

  const [problem, setProblem] = useState<RemainderProblem>(() => {
    return createProblem(difficultyStage);
  });
  const [working, setWorking] = useState<DivisionWorking>(() => ({ remaining: problem.dividend, quotient: 0, steps: [] }));

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
    setSelectedAnswer(null);
    setIsLocked(false);
    const firstProblem = createProblem(difficultyStage);
    setProblem(firstProblem);
    setWorking({ remaining: firstProblem.dividend, quotient: 0, steps: [] });
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

  const moveToNextProblem = useCallback((nextSolvedCount: number, delayMs: number) => {
    const timer = window.setTimeout(() => {
      if (!presentRef.current || finishGuardRef.current) return;
      const nextProblem = createProblem(difficultyStage, nextSolvedCount);
      setProblem(nextProblem);
      setWorking({ remaining: nextProblem.dividend, quotient: 0, steps: [] });
      setFeedback(null);
      setSelectedAnswer(null);
      setIsLocked(false);
      answerLockRef.current = false;
      questionStartRef.current = Date.now();
    }, delayMs);
    timeoutRefs.current.push(timer);
  }, [difficultyStage]);

  const evaluateAnswer = useCallback((choice: string) => {
    if (!presentRef.current || showPracticeIntro || sessionState?.paused || roundOver || isLocked || answerLockRef.current || finishGuardRef.current) return;
    answerLockRef.current = true;
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
      emitMiniGameSessionEvent(sessionEvents, 'correct_answer', { score: XP + points, metadata: { problemId: problem.id, tier: baseLevel } });
      emitMiniGameSessionEvent(sessionEvents, 'puzzle_complete', { score: XP + points });
      setCorrectCount((prev) => prev + 1);
      setCombo((prev) => prev + 1);
      setFeedback({
        tone: isPraise ? 'praise' : 'success',
        title: isPraise ? buildPraiseMessage() : 'Shipment away!',
        subtitle: isPraise ? 'Fast first try bonus!' : `+${points} points`,
      });

      if (!reducedMotion) confetti({
        particleCount: 24,
        spread: 32,
        origin: { y: 0.72 },
        colors: ['#4ade80', '#facc15', '#ffffff'],
      });

      moveToNextProblem(nextSolved, 1000);
      return;
    }

    triggerHaptic('error');
    setCombo(0);
    setScore((prev) => Math.max(0, prev - 25));
    if (!isPractice) setTimeLeft((prev) => Math.max(0, prev - 2));
    emitMiniGameSessionEvent(sessionEvents, 'incorrect_answer', { score: Math.max(0, XP - 25), metadata: { problemId: problem.id, tier: baseLevel } });
    setFeedback({
      tone: 'error',
      title: 'Not quite',
      subtitle: `Check: ${problem.quotient} × ${problem.divisor} + ${problem.remainder} = ${problem.dividend}.`,
    });
    moveToNextProblem(nextSolved, 1100);
  }, [attemptCount, baseLevel, combo, isLocked, isPractice, moveToNextProblem, problem, reducedMotion, roundOver, sessionEvents, sessionState?.paused, showPracticeIntro, solvedCount, XP]);

  const takeGroups = useCallback((groups: number) => {
    if (problem.answerMode !== 'group_board' || !presentRef.current || showPracticeIntro || sessionState?.paused || roundOver || isLocked || answerLockRef.current || finishGuardRef.current) return;
    const amount = groups * problem.divisor;
    if (amount > working.remaining) return;

    const remaining = working.remaining - amount;
    const quotient = working.quotient + groups;
    setWorking({ remaining, quotient, steps: [...working.steps, { groups, amount }] });
    triggerHaptic('light');
  }, [isLocked, problem, roundOver, sessionState?.paused, showPracticeIntro, working]);

  const showTopHud = !useSharedTopHud;
  const timeLabel = `${Math.floor(timeLeft / 60)}:${String(timeLeft % 60).padStart(2, '0')}`;

  const title = 'Remainder Run';

  return (
    <div className="remainder-harbour relative z-20 h-full w-full overflow-hidden select-none bg-slate-950" data-remainder-game data-remainder-tier={baseLevel} data-remainder-stage={difficultyStage} data-remainder-correct={correctCount}>
      <GameplaySceneBackdrop gameType="remainder_run" />
      <PracticeIntroPopup open={showPracticeIntro} title="Remainder Run" body="Get the harbour supplies moving! Choose the right shipment. On harder orders, load batches of full boxes, leave fewer crates than one box holds, then send the shipment." briefing={practiceBriefing} onAction={() => setShowPracticeIntro(false)} />

      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.12),rgba(15,23,42,0.06)_32%,rgba(2,6,23,0.36)_100%)]" />

      <main
        data-group-board={problem.answerMode === 'group_board'}
        className={`remainder-main relative z-20 flex h-full w-full flex-col overflow-y-auto ${useSharedTopHud ? 'pt-[calc(env(safe-area-inset-top)+5.3rem)]' : 'pt-[calc(env(safe-area-inset-top)+4.9rem)]'} px-[max(0.75rem,env(safe-area-inset-left))] pb-[max(0.85rem,env(safe-area-inset-bottom))]`}
      >
        <div className={`remainder-layout mx-auto flex w-full min-h-0 flex-col gap-1.5 ${problem.answerMode === 'group_board' ? 'is-group-board' : 'max-w-[27rem] h-full'}`}>
          {showTopHud ? (
            <header className="rounded-[0.95rem] border border-violet-200/24 bg-[linear-gradient(180deg,rgba(50,14,94,0.94),rgba(19,8,44,0.92))] px-3 py-1.5 shadow-[0_10px_18px_rgba(2,6,23,0.18)] backdrop-blur-sm">
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <div className="text-[11px] font-black uppercase tracking-[0.18em] text-violet-500/70">Time</div>
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
                  <div className="text-[10px] font-black uppercase tracking-[0.16em] text-violet-500/70">XP</div>
                  <div className="text-sm font-black text-white">{XP}</div>
                </div>
              </div>
            </header>
          ) : null}

          <GameQuestionCard
            title={title}
            subtitle={problem.answerMode === 'decimal'
              ? 'Give your answer as a decimal.'
              : problem.answerMode === 'group_board' ? 'Load full boxes, then send your shipment.' : 'Choose the shipment with the right boxes and leftovers.'}
            className={`mx-auto w-full shrink-0 ${problem.answerMode === 'group_board' ? '' : 'max-w-[27rem]'}`}
            style={{ position: 'relative', top: 0, transform: 'none' }}
          >
            {problem.answerMode === 'decimal'
              ? `Share ${problem.displayDividend} metres of rope equally between ${problem.divisor} boats. How many metres does each boat get?`
              : `There are ${problem.displayDividend} crates. Each box holds ${problem.divisor} crates. How many full boxes can be filled, and how many crates are left over?`}
          </GameQuestionCard>

          <section data-division-playfield="true" className={`relative flex min-h-0 ${problem.answerMode === 'group_board' ? 'flex-col gap-2' : 'flex-1 items-center justify-center'}`}>
            <div data-division-problem="true" data-problem-id={problem.id} className="cargo-stage">
              <CargoDeck problem={problem} working={working} reduced={Boolean(reducedMotion || sessionState?.paused)} departing={Boolean(feedback && feedback.tone !== 'error')} />
            </div>
            {problem.answerMode === 'group_board' ? (
              <div data-division-working className="remainder-working cargo-console">
                <div className="cargo-console-heading"><strong>Load the shipment</strong><div className="remainder-board-actions">
                  {useSharedTopHud && !isPractice ? <span className="remainder-time" data-remainder-time data-urgent={timeLeft <= 15}>{timeLabel}</span> : null}
                  <button type="button" className="cargo-reset" onClick={() => setWorking({remaining:problem.dividend,quotient:0,steps:[]})} disabled={isLocked || roundOver || sessionState?.paused}>Unload</button>
                </div></div>
                <div className="cargo-batch-grid" aria-label="Choose groups to subtract">
                  {DIVISION_GROUPS.map(groups => <motion.button key={groups} type="button" data-cargo-batch={groups} aria-label={`Load ${groups} boxes, ${groups * problem.divisor} crates`} disabled={groups * problem.divisor > working.remaining || isLocked || roundOver || sessionState?.paused || showPracticeIntro} onClick={() => takeGroups(groups)} whileTap={reducedMotion ? undefined : {scale:.95}} className="cargo-batch">
                    <span>{groups} <small>{groups===1 ? 'box' : 'boxes'}</small></span><span>{groups * problem.divisor} <small>crates</small></span>
                  </motion.button>)}
                <button type="button" data-cargo-send className="ui-button-primary cargo-send" disabled={working.remaining>=problem.divisor || isLocked || roundOver || sessionState?.paused || showPracticeIntro} onClick={()=>evaluateAnswer(makeAnswerLabel(working.quotient,working.remaining))}>Ship it!</button>
                </div>
                <div className="remainder-track" role="progressbar" aria-label="Amount divided" aria-valuemin={0} aria-valuemax={problem.dividend} aria-valuenow={problem.dividend-working.remaining}><motion.span initial={false} animate={{width:`${100*(problem.dividend-working.remaining)/problem.dividend}%`}} transition={{duration:reducedMotion ? 0 : .4}} /></div>
                <p className="cargo-instruction" aria-live="polite">{working.remaining < problem.divisor ? `${working.quotient} full boxes · ${working.remaining} crates left over` : `Fill boxes of ${problem.divisor}. Leave fewer than ${problem.divisor} crates.`}</p>

              </div>
            ) : null}
          </section>

          {problem.answerMode !== 'group_board' ? <section className="cargo-answer-panel shrink-0 rounded-[1.1rem] border border-white/16 bg-[linear-gradient(180deg,rgba(16,25,49,0.8),rgba(8,12,25,0.9))] p-1.5 shadow-[0_10px_18px_rgba(2,6,23,0.16)] backdrop-blur-sm">
            <div className="remainder-answer-header text-xs font-black uppercase tracking-[0.12em] text-amber-100">
              <span>{problem.answerMode === 'decimal' ? 'Choose the decimal answer' : 'Choose full boxes and leftovers'}</span>
              {useSharedTopHud && !isPractice ? <span className="remainder-time" data-remainder-time data-urgent={timeLeft <= 15} aria-label={`${timeLeft} seconds left`}>{timeLabel}</span> : null}
            </div>
            <div className="answer-choice-surface mt-1.5 grid grid-cols-2 gap-2">
              {problem.options.map((option, index) => (
                <button
                  key={`${problem.id}-${option}-${index}`}
                  type="button"
                  disabled={!isPresent || showPracticeIntro || isLocked || roundOver || sessionState?.paused}
                  onClick={() => evaluateAnswer(option)}
                  className={`relative min-h-[2.65rem] rounded-[0.85rem] border px-2 py-1.5 text-center shadow-[0_8px_18px_rgba(2,6,23,0.16)] transition-transform duration-150 hover:scale-[1.01] disabled:opacity-55 ${
                    selectedAnswer === option
                      ? feedback?.tone === 'success' || feedback?.tone === 'praise'
                        ? 'ui-button-success'
                        : 'ui-button-primary'
                      : 'ui-button-secondary'
                  }`}
                >
                  <span className="font-black text-white" style={{ fontSize: 'max(18px, calc(15px / var(--game-stage-scale, 1)))' }}>{problem.answerMode === 'decimal' ? `${option} m each` : option.replace(' r', ' boxes · ') + ' left'}</span>
                </button>
              ))}
            </div>
          </section> : null}
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
            <div className="text-[13px] font-black uppercase tracking-[0.12em]">{feedback.title}</div>
            <div className="mt-0.5 text-[12px] font-bold">{feedback.subtitle}</div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
};

export default RemainderRunGame;
