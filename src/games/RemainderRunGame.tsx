import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import confetti from 'canvas-confetti';
import { triggerHaptic } from '../haptics';
import gameplayBackground from '../assets/maps/backgroundsforgames/Remainder Run.png';

interface RemainderRunGameProps {
  levelId: number;
  miniGameLevel?: number;
  avatarId: string;
  useSharedTopHud?: boolean;
  onVictory: (stars: number, XP: number) => void;
  onGameOver: (XP: number) => void;
  onBack: () => void;
}

type InputMode = 'mcq' | 'split' | 'manual';
type PromptStyle = 'equation' | 'leftover';

interface RemainderProblem {
  id: string;
  dividend: number;
  divisor: number;
  quotient: number;
  remainder: number;
  mode: InputMode;
  style: PromptStyle;
  stage: number;
  speedRound: boolean;
  mcqOptions: Array<{ q: number; r: number }>;
  quotientOptions: number[];
  remainderOptions: number[];
}

interface FeedbackState {
  tone: 'success' | 'error';
  title: string;
  subtitle: string;
}

const randomInt = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;

const shuffle = <T,>(items: T[]): T[] => {
  const next = [...items];
  for (let i = next.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [next[i], next[j]] = [next[j], next[i]];
  }
  return next;
};

const uniqueSortedNumbers = (numbers: number[]) => [...new Set(numbers)].sort((a, b) => a - b);

const createId = () => `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

const roundSecondsForLevel = (level: number) => {
  if (level <= 3) return 90;
  if (level <= 7) return 75;
  return 60;
};

const stageFromProgress = (baseLevel: number, solvedCount: number, timeLeft: number) => {
  const rampFromSolved = Math.floor(solvedCount / 4);
  const urgencyBoost = timeLeft <= 15 ? 1 : 0;
  return Math.max(1, Math.min(12, baseLevel + rampFromSolved + urgencyBoost));
};

const modeForStage = (stage: number): InputMode => {
  if (stage <= 3) return 'mcq';
  if (stage <= 7) return 'split';
  return Math.random() < 0.68 ? 'manual' : 'split';
};

const speedRoundForState = (solvedCount: number, stage: number) => {
  return solvedCount > 0 && solvedCount % 6 === 0 && stage >= 4;
};

const createChoiceOptions = (q: number, r: number, divisor: number): Array<{ q: number; r: number }> => {
  const options: Array<{ q: number; r: number }> = [{ q, r }];
  let guard = 0;
  while (options.length < 4 && guard < 120) {
    guard += 1;
    const deltaQ = randomInt(-3, 3);
    const deltaR = randomInt(-2, 2);
    const nextQ = Math.max(0, q + deltaQ);
    let nextR = r + deltaR;
    nextR = Math.max(0, Math.min(divisor - 1, nextR));
    if (nextQ === q && nextR === r) continue;
    if (options.some((item) => item.q === nextQ && item.r === nextR)) continue;
    options.push({ q: nextQ, r: nextR });
  }
  return shuffle(options);
};

const createSplitOptions = (target: number, min: number, max: number): number[] => {
  const options = [target];
  let guard = 0;
  while (options.length < 4 && guard < 100) {
    guard += 1;
    const delta = randomInt(-4, 4);
    const candidate = Math.max(min, Math.min(max, target + delta));
    if (candidate === target) continue;
    if (options.includes(candidate)) continue;
    options.push(candidate);
  }
  return uniqueSortedNumbers(shuffle(options).slice(0, 4));
};

const createProblem = (stage: number, solvedCount: number): RemainderProblem => {
  const mode = modeForStage(stage);
  const speedRound = speedRoundForState(solvedCount, stage);

  let divisorMin = 2;
  let divisorMax = 5;
  let quotientMin = 2;
  let quotientMax = 10;

  if (stage >= 4 && stage <= 7) {
    divisorMin = 3;
    divisorMax = 9;
    quotientMin = 3;
    quotientMax = 16;
  } else if (stage >= 8) {
    divisorMin = 4;
    divisorMax = 12;
    quotientMin = 4;
    quotientMax = 24;
  }

  if (speedRound) {
    divisorMin = 2;
    divisorMax = 6;
    quotientMin = 2;
    quotientMax = 9;
  }

  const divisor = randomInt(divisorMin, divisorMax);
  const quotient = randomInt(quotientMin, quotientMax);
  const useZeroRemainder = randomInt(0, 9) < (stage <= 2 ? 3 : 2);
  const remainder = useZeroRemainder ? 0 : randomInt(1, divisor - 1);
  const dividend = (divisor * quotient) + remainder;
  const style: PromptStyle = stage >= 9 && randomInt(0, 1) === 1 ? 'leftover' : 'equation';

  const mcqOptions = mode === 'mcq' ? createChoiceOptions(quotient, remainder, divisor) : [];
  const quotientOptions = mode === 'split'
    ? createSplitOptions(quotient, 0, Math.max(quotient + 4, 18))
    : [];
  const remainderOptions = mode === 'split'
    ? createSplitOptions(remainder, 0, Math.max(divisor - 1, 6))
    : [];

  return {
    id: createId(),
    dividend,
    divisor,
    quotient,
    remainder,
    mode,
    style,
    stage,
    speedRound,
    mcqOptions,
    quotientOptions,
    remainderOptions,
  };
};

const starsFromPerformance = (XP: number, correct: number, attempts: number, stage: number) => {
  const accuracy = attempts > 0 ? correct / attempts : 0;
  const target = 1200 + (stage * 150);

  if (XP >= target * 1.2 && accuracy >= 0.8) return 3;
  if (XP >= target * 0.8 && accuracy >= 0.6) return 2;
  return 1;
};

const problemPromptTitle = (problem: RemainderProblem) => {
  if (problem.style === 'leftover') return 'How many left over?';
  return 'Solve the division';
};

const problemPromptBody = (problem: RemainderProblem) => {
  if (problem.style === 'leftover') {
    return `${problem.dividend} sweets shared between ${problem.divisor} boxes.`;
  }
  return `${problem.dividend} / ${problem.divisor} = ? r ?`;
};

const RemainderRunGame: React.FC<RemainderRunGameProps> = ({
  levelId,
  miniGameLevel,
  useSharedTopHud = false,
  onVictory,
  onGameOver: _onGameOver,
  onBack,
}) => {
  const baseLevel = Math.max(1, Math.min(12, miniGameLevel || levelId || 1));
  const initialRoundTime = useMemo(() => roundSecondsForLevel(baseLevel), [baseLevel]);

  const [timeLeft, setTimeLeft] = useState(initialRoundTime);
  const [XP, setScore] = useState(0);
  const [Combo, setStreak] = useState(0);
  const [solvedCount, setSolvedCount] = useState(0);
  const [attemptCount, setAttemptCount] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [roundOver, setRoundOver] = useState(false);
  const [feedback, setFeedback] = useState<FeedbackState | null>(null);
  const [isLocked, setIsLocked] = useState(false);
  const [selectedSplitQ, setSelectedSplitQ] = useState<number | null>(null);
  const [selectedSplitR, setSelectedSplitR] = useState<number | null>(null);
  const [manualQ, setManualQ] = useState('');
  const [manualR, setManualR] = useState('');
  const [manualField, setManualField] = useState<'q' | 'r'>('q');

  const [problem, setProblem] = useState<RemainderProblem>(() => {
    const startStage = stageFromProgress(baseLevel, 0, initialRoundTime);
    return createProblem(startStage, 0);
  });

  const questionStartRef = useRef<number>(Date.now());
  const finishGuardRef = useRef(false);
  const timeoutRefs = useRef<number[]>([]);

  const clearTimeouts = () => {
    timeoutRefs.current.forEach((timer) => window.clearTimeout(timer));
    timeoutRefs.current = [];
  };

  useEffect(() => clearTimeouts, []);

  useEffect(() => {
    clearTimeouts();
    finishGuardRef.current = false;
    setTimeLeft(initialRoundTime);
    setScore(0);
    setStreak(0);
    setSolvedCount(0);
    setAttemptCount(0);
    setCorrectCount(0);
    setRoundOver(false);
    setFeedback(null);
    setIsLocked(false);
    setSelectedSplitQ(null);
    setSelectedSplitR(null);
    setManualQ('');
    setManualR('');
    setManualField('q');
    const nextStage = stageFromProgress(baseLevel, 0, initialRoundTime);
    setProblem(createProblem(nextStage, 0));
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
      setProblem(createProblem(nextStage, nextSolvedCount));
      setSelectedSplitQ(null);
      setSelectedSplitR(null);
      setManualQ('');
      setManualR('');
      setManualField('q');
      setFeedback(null);
      setIsLocked(false);
      questionStartRef.current = Date.now();
    }, delayMs);
    timeoutRefs.current.push(timer);
  }, [baseLevel, timeLeft]);

  const evaluateAnswer = useCallback((answerQ: number, answerR: number) => {
    if (roundOver || isLocked) return;
    setIsLocked(true);

    const nextAttempts = attemptCount + 1;
    const nextSolved = solvedCount + 1;
    const isCorrect = answerQ === problem.quotient && answerR === problem.remainder;

    setAttemptCount(nextAttempts);
    setSolvedCount(nextSolved);

    if (isCorrect) {
      const elapsedMs = Math.max(250, Date.now() - questionStartRef.current);
      const speedBonus = Math.max(20, Math.round(160 - (elapsedMs / 18)));
      const difficultyBonus = 80 + (problem.stage * 14);
      const streakMultiplier = 1 + Math.min(0.9, Combo * 0.08);
      const speedRoundBonus = problem.speedRound ? 70 : 0;
      const points = Math.round((difficultyBonus + speedBonus + speedRoundBonus) * streakMultiplier);

      triggerHaptic('success');
      setScore((prev) => prev + points);
      setCorrectCount((prev) => prev + 1);
      setStreak((prev) => prev + 1);
      setFeedback({
        tone: 'success',
        title: 'Correct',
        subtitle: `+${points} points`,
      });

      confetti({
        particleCount: 24,
        spread: 32,
        origin: { y: 0.72 },
        colors: ['#4ade80', '#facc15', '#ffffff'],
      });

      moveToNextProblem(nextSolved, 280);
      return;
    }

    triggerHaptic('error');
    setStreak(0);
    setScore((prev) => Math.max(0, prev - 25));
    setTimeLeft((prev) => Math.max(0, prev - 2));
    setFeedback({
      tone: 'error',
      title: 'Not quite',
      subtitle: `Answer: ${problem.quotient} r ${problem.remainder}`,
    });
    moveToNextProblem(nextSolved, 520);
  }, [attemptCount, isLocked, moveToNextProblem, problem, roundOver, solvedCount, Combo]);

  const submitManual = () => {
    if (roundOver || isLocked) return;
    const q = Number.parseInt(manualQ || '', 10);
    const r = Number.parseInt(manualR || '', 10);
    if (Number.isNaN(q) || Number.isNaN(r)) {
      triggerHaptic('warning');
      setFeedback({ tone: 'error', title: 'Need both values', subtitle: 'Enter quotient and remainder.' });
      const t = window.setTimeout(() => setFeedback(null), 420);
      timeoutRefs.current.push(t);
      return;
    }
    evaluateAnswer(q, r);
  };

  const handleManualKeypad = (value: string) => {
    if (roundOver || isLocked) return;
    if (value === 'DEL') {
      if (manualField === 'q') {
        setManualQ((prev) => prev.slice(0, -1));
      } else {
        setManualR((prev) => prev.slice(0, -1));
      }
      return;
    }

    if (manualField === 'q') {
      setManualQ((prev) => (prev.length >= 2 ? prev : `${prev}${value}`));
    } else {
      setManualR((prev) => (prev.length >= 2 ? prev : `${prev}${value}`));
    }
  };

  useEffect(() => {
    if (problem.mode !== 'split' || roundOver || isLocked) return;
    if (selectedSplitQ === null || selectedSplitR === null) return;
    const timer = window.setTimeout(() => evaluateAnswer(selectedSplitQ, selectedSplitR), 90);
    timeoutRefs.current.push(timer);
  }, [evaluateAnswer, isLocked, problem.mode, roundOver, selectedSplitQ, selectedSplitR]);

  const topPaddingClass = useSharedTopHud
    ? 'pt-[calc(env(safe-area-inset-top)+5.8rem)]'
    : 'pt-[max(0.25rem,env(safe-area-inset-top))]';

  const showVisualAid = problem.stage <= 2;
  const visualAidGroups = useMemo(() => {
    if (!showVisualAid) return [];
    const groups: Array<{ id: string; count: number }> = [];
    let remaining = problem.dividend;
    let idx = 0;
    while (remaining > 0 && idx < 24) {
      const count = Math.min(problem.divisor, remaining);
      groups.push({ id: `g-${idx}`, count });
      remaining -= count;
      idx += 1;
    }
    return groups;
  }, [problem.dividend, problem.divisor, showVisualAid]);

  return (
    <div className="relative z-20 h-full w-full overflow-hidden bg-[#08162c] select-none">
      <img
        src={gameplayBackground}
        alt=""
        aria-hidden="true"
        draggable={false}
        className="pointer-events-none absolute inset-0 h-full w-full object-cover object-center"
      />

      <main
        className={`relative z-20 flex h-full w-full flex-col ${topPaddingClass} px-[max(0.75rem,env(safe-area-inset-left))] pb-[max(7.25rem,calc(env(safe-area-inset-bottom)+6.2rem))]`}
      >
        <div className="mx-auto flex h-full w-full max-w-[30rem] min-h-0 flex-col gap-2.5">
          {!useSharedTopHud ? (
            <header className="rounded-[1.25rem] border border-cyan-100/20 bg-slate-950/58 px-3 py-2.5 shadow-[0_12px_22px_rgba(2,6,23,0.46)]">
              <div className="grid grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-2.5">
                <div>
                  <div className="text-[9px] font-black uppercase tracking-[0.18em] text-cyan-100/75">Time Attack</div>
                  <div className="relative mt-1 h-3.5 overflow-hidden rounded-full border border-cyan-100/26 bg-blue-950/58">
                    <motion.div
                      className="absolute inset-y-0 left-0 rounded-full"
                      animate={{ width: `${timerProgress * 100}%`, backgroundColor: timerFillColor }}
                      transition={{ duration: 0.24, ease: 'easeOut' }}
                      style={{ boxShadow: '0 0 12px rgba(34,197,94,0.45)' }}
                    />
                    <div className="absolute inset-[1px] rounded-full bg-[linear-gradient(to_right,rgba(255,255,255,0.1)_1px,transparent_1px)] bg-[length:12%_100%]" />
                  </div>
                </div>

                <div className="rounded-full border border-white/18 bg-slate-900/54 px-3 py-1 text-center">
                  <div className="text-[8px] font-black uppercase tracking-[0.16em] text-cyan-100/65">XP</div>
                  <div className="text-sm font-black text-white">{XP}</div>
                </div>

              </div>
            </header>
          ) : null}

          <section className="min-h-0 rounded-[1.5rem] border border-cyan-100/18 bg-slate-950/54 p-3 shadow-[0_12px_24px_rgba(2,6,23,0.45)]">
            <div className="text-center">
              <div className="text-[10px] font-black uppercase tracking-[0.2em] text-cyan-100/75">
                {problem.speedRound ? 'Speed Round' : 'Remainder Rush'}
              </div>
              <div className="game-question-copy mt-1 text-white">{problemPromptTitle(problem)}</div>
              <div className="mt-1 text-[clamp(0.95rem,4.1vw,1.16rem)] font-semibold text-cyan-50/92">{problemPromptBody(problem)}</div>
            </div>

            {showVisualAid ? (
              <div className="mt-2.5 rounded-[1rem] border border-cyan-100/16 bg-blue-950/40 p-2">
                <div className="text-[9px] font-black uppercase tracking-[0.15em] text-cyan-100/70">Grouping aid</div>
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  {visualAidGroups.map((group, groupIndex) => (
                    <div key={group.id} className="flex items-center gap-1 rounded-full border border-white/12 bg-white/8 px-2 py-1">
                      <span className="text-[9px] font-black text-cyan-100/78">{groupIndex + 1}</span>
                      <div className="flex gap-0.5">
                        {Array.from({ length: group.count }).map((_, idx) => (
                          <span key={`${group.id}-${idx}`} className="h-1.5 w-1.5 rounded-full bg-cyan-200/90" />
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
          </section>

          <section className="min-h-0 flex-1 rounded-[1.5rem] border border-cyan-100/18 bg-slate-950/54 p-3 shadow-[0_12px_24px_rgba(2,6,23,0.45)]">
            {problem.mode === 'mcq' ? (
              <div className="grid h-full grid-rows-[auto_1fr] gap-2.5">
                <div className="text-center text-[10px] font-black uppercase tracking-[0.16em] text-cyan-100/74">Tap the correct quotient and remainder</div>
                <div className="grid grid-cols-2 gap-2.5">
                  {problem.mcqOptions.map((option, idx) => (
                    <button
                      key={`mcq-${idx}-${option.q}-${option.r}`}
                      type="button"
                      disabled={isLocked || roundOver}
                      onClick={() => evaluateAnswer(option.q, option.r)}
                      className="rounded-[1rem] border border-amber-100/72 bg-[linear-gradient(180deg,#f7d47c_0%,#f5b72e_100%)] p-3 text-center text-slate-900 shadow-[0_10px_18px_rgba(2,6,23,0.34)] transition active:scale-[0.98] disabled:opacity-55"
                    >
                      <div className="text-[11px] font-black uppercase tracking-[0.12em]">Option {idx + 1}</div>
                      <div className="mt-1 text-[clamp(1.1rem,5vw,1.65rem)] font-black">{option.q} r {option.r}</div>
                    </button>
                  ))}
                </div>
              </div>
            ) : null}

            {problem.mode === 'split' ? (
              <div className="grid h-full grid-rows-[auto_auto_1fr] gap-2.5">
                <div className="grid grid-cols-2 gap-2">
                  <div className="rounded-[0.95rem] border border-cyan-200/32 bg-cyan-950/24 p-2.5 text-center">
                    <div className="text-[9px] font-black uppercase tracking-[0.14em] text-cyan-100/76">Quotient</div>
                    <div className="mt-1 text-[clamp(1.35rem,5.5vw,2rem)] font-black text-white">
                      {selectedSplitQ === null ? '--' : selectedSplitQ}
                    </div>
                  </div>
                  <div className="rounded-[0.95rem] border border-amber-200/32 bg-amber-950/24 p-2.5 text-center">
                    <div className="text-[9px] font-black uppercase tracking-[0.14em] text-amber-100/76">Remainder</div>
                    <div className="mt-1 text-[clamp(1.35rem,5.5vw,2rem)] font-black text-white">
                      {selectedSplitR === null ? '--' : selectedSplitR}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="text-center text-[10px] font-black uppercase tracking-[0.16em] text-cyan-100/74">Choose quotient</div>
                  <div className="text-center text-[10px] font-black uppercase tracking-[0.16em] text-cyan-100/74">Choose remainder</div>
                </div>

                <div className="grid grid-cols-2 gap-2.5">
                  <div className="grid grid-cols-2 gap-2">
                    {problem.quotientOptions.map((value) => (
                      <button
                        key={`split-q-${value}`}
                        type="button"
                        disabled={isLocked || roundOver}
                        onClick={() => setSelectedSplitQ(value)}
                        className={`rounded-[0.95rem] border p-2 text-[clamp(1rem,4.5vw,1.4rem)] font-black transition active:scale-[0.98] ${
                          selectedSplitQ === value
                            ? 'border-cyan-100 bg-cyan-400/34 text-white'
                            : 'border-cyan-100/24 bg-blue-950/44 text-cyan-50'
                        } disabled:opacity-55`}
                      >
                        {value}
                      </button>
                    ))}
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {problem.remainderOptions.map((value) => (
                      <button
                        key={`split-r-${value}`}
                        type="button"
                        disabled={isLocked || roundOver}
                        onClick={() => setSelectedSplitR(value)}
                        className={`rounded-[0.95rem] border p-2 text-[clamp(1rem,4.5vw,1.4rem)] font-black transition active:scale-[0.98] ${
                          selectedSplitR === value
                            ? 'border-amber-100 bg-amber-400/34 text-white'
                            : 'border-amber-100/24 bg-blue-950/44 text-amber-50'
                        } disabled:opacity-55`}
                      >
                        {value}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            ) : null}

            {problem.mode === 'manual' ? (
              <div className="grid h-full grid-rows-[auto_auto_1fr_auto] gap-2.5">
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setManualField('q')}
                    className={`rounded-[0.95rem] border p-2.5 text-center ${
                      manualField === 'q' ? 'border-cyan-100 bg-cyan-400/26' : 'border-cyan-100/22 bg-blue-950/42'
                    }`}
                  >
                    <div className="text-[9px] font-black uppercase tracking-[0.14em] text-cyan-100/78">Quotient</div>
                    <div className="mt-1 text-[clamp(1.25rem,5.5vw,1.85rem)] font-black text-white">{manualQ || '--'}</div>
                  </button>
                  <button
                    type="button"
                    onClick={() => setManualField('r')}
                    className={`rounded-[0.95rem] border p-2.5 text-center ${
                      manualField === 'r' ? 'border-amber-100 bg-amber-400/26' : 'border-amber-100/22 bg-blue-950/42'
                    }`}
                  >
                    <div className="text-[9px] font-black uppercase tracking-[0.14em] text-amber-100/78">Remainder</div>
                    <div className="mt-1 text-[clamp(1.25rem,5.5vw,1.85rem)] font-black text-white">{manualR || '--'}</div>
                  </button>
                </div>

                <div className="text-center text-[10px] font-black uppercase tracking-[0.16em] text-cyan-100/74">
                  Tap digits, then submit
                </div>

                <div className="grid grid-cols-3 gap-2">
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 0, 'DEL'].map((key) => (
                    <button
                      key={`key-${key}`}
                      type="button"
                      disabled={isLocked || roundOver}
                      onClick={() => handleManualKeypad(String(key))}
                      className={`rounded-[0.92rem] border border-cyan-100/24 bg-blue-950/44 p-2.5 text-[clamp(0.95rem,4.4vw,1.35rem)] font-black text-white ${
                        key === 'DEL' ? 'col-span-2' : ''
                      } transition active:scale-[0.98] disabled:opacity-55`}
                    >
                      {key}
                    </button>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={submitManual}
                  disabled={isLocked || roundOver}
                  className="rounded-[1rem] border border-amber-100/72 bg-[linear-gradient(180deg,#f7d47c_0%,#f5b72e_100%)] py-2.5 text-sm font-black uppercase tracking-[0.14em] text-slate-900 shadow-[0_10px_18px_rgba(2,6,23,0.34)] transition active:scale-[0.98] disabled:opacity-55"
                >
                  Submit Answer
                </button>
              </div>
            ) : null}
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
            className={`pointer-events-none absolute left-1/2 top-[calc(env(safe-area-inset-top)+5.1rem)] z-50 -translate-x-1/2 rounded-[1rem] border px-4 py-2 text-center shadow-[0_14px_24px_rgba(2,6,23,0.45)] ${
              feedback.tone === 'success'
                ? 'border-emerald-100/62 bg-emerald-500/28 text-emerald-50'
                : 'border-rose-100/62 bg-rose-500/30 text-amber-50'
            }`}
          >
            <div className="text-xs font-black uppercase tracking-[0.12em]">{feedback.title}</div>
            <div className="mt-0.5 text-[11px] font-bold">{feedback.subtitle}</div>
          </motion.div>
        ) : null}
      </AnimatePresence>

      <div className="pointer-events-none absolute inset-x-0 bottom-[max(0.45rem,env(safe-area-inset-bottom))] z-40 flex justify-center px-3">
        <div className="pointer-events-auto">
        </div>
      </div>
    </div>
  );
};

export default RemainderRunGame;



