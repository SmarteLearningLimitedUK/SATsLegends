import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { triggerHaptic } from '../haptics';
import gameplayBackground from '../assets/maps/backgroundsforgames/rotationstation.jpg';
import { GameQuestionCard } from '../components/game-ui/GameUiKit';

interface RotationStationGameProps {
  levelId: number;
  miniGameLevel?: number;
  avatarId: string;
  useSharedTopHud?: boolean;
  onVictory: (stars: number, XP: number) => void;
  onGameOver: (XP: number) => void;
  onBack: () => void;
}

type RotationMode = 'rotate_match' | 'predict_result' | 'identify_turn';
type TurnDirection = 'cw' | 'acw';
type ShapeId = 'arrow' | 'lshape' | 'tshape' | 'flag' | 'hook';
type QuestionKind = 'fluency' | 'reasoning';

interface ShapeDef {
  id: ShapeId;
  name: string;
  points: string;
  fill: string;
  stroke: string;
}

interface RotationQuestion {
  id: string;
  stage: number;
  mode: RotationMode;
  shape: ShapeDef;
  startOrientation: number;
  targetOrientation: number;
  direction: TurnDirection;
  quarterTurns: number;
  instruction: string;
  subInstruction: string;
  options: Array<{ id: string; label: string; orientation?: number }>;
  correctOptionIds: string[];
  speedRound: boolean;
  difficultyWeight: number;
  kind: QuestionKind;
}

interface FeedbackState {
  tone: 'success' | 'error';
  title: string;
  subtitle: string;
}

const SHAPES: ShapeDef[] = [
  {
    id: 'arrow',
    name: 'Arrow',
    points: '-10,-40 10,-40 10,-8 30,-8 0,40 -30,-8 -10,-8',
    fill: '#38bdf8',
    stroke: '#e0f2fe',
  },
  {
    id: 'lshape',
    name: 'L Shape',
    points: '-34,-34 0,-34 0,10 28,10 28,34 -34,34',
    fill: '#34d399',
    stroke: '#dcfce7',
  },
  {
    id: 'tshape',
    name: 'T Shape',
    points: '-34,-34 34,-34 34,-10 10,-10 10,34 -10,34 -10,-10 -34,-10',
    fill: '#a78bfa',
    stroke: '#ede9fe',
  },
  {
    id: 'flag',
    name: 'Flag',
    points: '-26,-38 -10,-38 -10,36 -26,36 -26,-4 24,-18 24,2 -26,18',
    fill: '#f97316',
    stroke: '#ffedd5',
  },
  {
    id: 'hook',
    name: 'Hook',
    points: '-30,-34 12,-34 12,-16 -8,-16 -8,4 20,4 20,34 -30,34 -30,16 0,16 0,4 -30,4',
    fill: '#f43f5e',
    stroke: '#ffe4e6',
  },
];

const randomInt = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;

const createId = () => `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

const normalizeOrientation = (orientation: number) => ((orientation % 4) + 4) % 4;

const orientationToDegrees = (orientation: number) => normalizeOrientation(orientation) * 90;

const orientationLabel = (orientation: number) => {
  const normalized = normalizeOrientation(orientation);
  if (normalized === 0) return 'Up';
  if (normalized === 1) return 'Right';
  if (normalized === 2) return 'Down';
  return 'Left';
};

const applyQuarterTurns = (orientation: number, direction: TurnDirection, turns: number) => {
  const delta = direction === 'cw' ? turns : -turns;
  return normalizeOrientation(orientation + delta);
};

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

const modeForStage = (stage: number): RotationMode => {
  const roll = Math.random();
  if (stage <= 3) return roll < 0.72 ? 'rotate_match' : 'predict_result';
  if (stage <= 7) {
    if (roll < 0.38) return 'rotate_match';
    if (roll < 0.74) return 'predict_result';
    return 'identify_turn';
  }
  if (roll < 0.2) return 'rotate_match';
  if (roll < 0.55) return 'predict_result';
  return 'identify_turn';
};

const speedRoundForState = (solvedCount: number, stage: number) => solvedCount > 0 && solvedCount % 6 === 0 && stage >= 4;

const buildTurnLabel = (turns: number, direction: TurnDirection) => {
  if (turns === 2) return '180 deg';
  const degrees = turns * 90;
  const dirLabel = direction === 'cw' ? 'clockwise' : 'anticlockwise';
  return `${degrees} deg ${dirLabel}`;
};

const createPredictOptions = (correctOrientation: number): Array<{ id: string; label: string; orientation: number }> => {
  const candidates = [0, 1, 2, 3];
  const shuffled = candidates.sort(() => Math.random() - 0.5);
  const selected = [...new Set([correctOrientation, ...shuffled])].slice(0, 4);
  return selected.map((orientation) => ({
    id: `o-${orientation}`,
    label: orientationLabel(orientation),
    orientation,
  }));
};

const createIdentifyTurnOptions = (direction: TurnDirection, turns: number) => {
  const correct = buildTurnLabel(turns, direction);
  const pool = [
    '90 deg clockwise',
    '90 deg anticlockwise',
    '180 deg',
    '270 deg clockwise',
    '270 deg anticlockwise',
  ];
  const distractors = pool.filter((item) => item !== correct).sort(() => Math.random() - 0.5).slice(0, 3);
  const options = [correct, ...distractors].sort(() => Math.random() - 0.5);
  return { correct, options };
};

const createQuestion = (baseLevel: number, solvedCount: number, timeLeft: number): RotationQuestion => {
  const stage = stageFromProgress(baseLevel, solvedCount, timeLeft);
  const speedRound = speedRoundForState(solvedCount, stage);
  const mode = modeForStage(stage);
  const shape = SHAPES[randomInt(0, SHAPES.length - 1)];

  const startOrientation = randomInt(0, 3);
  const direction: TurnDirection = Math.random() < 0.5 ? 'cw' : 'acw';
  const allowedTurns = stage <= 3 ? [1] : stage <= 7 ? [1, 2, 3] : [1, 2, 3];
  const quarterTurns = speedRound ? 1 : allowedTurns[randomInt(0, allowedTurns.length - 1)];
  const targetOrientation = applyQuarterTurns(startOrientation, direction, quarterTurns);
  const turnText = buildTurnLabel(quarterTurns, direction);

  if (mode === 'rotate_match') {
      return {
        id: createId(),
        stage,
        mode,
        shape,
      startOrientation,
        targetOrientation,
        direction,
        quarterTurns,
        instruction: 'Rotate the shape to match the correct position and restore alignment.',
        subInstruction: speedRound ? 'Speed mode: choose the correct rotation to realign the system' : `Choose the correct rotation to realign the system. Hint: target is ${turnText} from start.`,
        options: [],
        correctOptionIds: ['match'],
        speedRound,
        difficultyWeight: 38 + (stage * 10) + (quarterTurns * 10),
        kind: 'fluency',
    };
  }

  if (mode === 'predict_result') {
    const options = createPredictOptions(targetOrientation);
    return {
      id: createId(),
      stage,
      mode,
      shape,
      startOrientation,
      targetOrientation,
      direction,
      quarterTurns,
      instruction: `After a ${turnText}, which orientation is correct?`,
      subInstruction: speedRound ? 'Choose the correct rotation to realign the system' : 'Choose the correct rotation to realign the system before tapping.',
      options,
      correctOptionIds: [`o-${targetOrientation}`],
      speedRound,
      difficultyWeight: 44 + (stage * 11) + (quarterTurns * 8),
      kind: 'fluency',
    };
  }

  const identify = createIdentifyTurnOptions(direction, quarterTurns);
  return {
    id: createId(),
    stage,
    mode,
    shape,
    startOrientation,
    targetOrientation,
    direction,
    quarterTurns,
    instruction: 'What turn restores the shape to the correct position?',
    subInstruction: speedRound ? 'Choose the correct rotation to realign the system' : 'Choose the correct rotation to realign the system.',
    options: identify.options.map((label, idx) => ({ id: `turn-${idx}`, label })),
    correctOptionIds: identify.options
      .map((label, idx) => ({ label, id: `turn-${idx}` }))
      .filter((entry) => entry.label === identify.correct)
      .map((entry) => entry.id),
    speedRound,
    difficultyWeight: 50 + (stage * 11) + (quarterTurns * 10),
    kind: 'fluency',
  };
};

const starsFromPerformance = (XP: number, correct: number, attempts: number, stage: number) => {
  const accuracy = attempts > 0 ? correct / attempts : 0;
  const target = 1200 + (stage * 170);
  if (XP >= target * 1.2 && accuracy >= 0.78) return 3;
  if (XP >= target * 0.82 && accuracy >= 0.6) return 2;
  return 1;
};

const ShapeCard: React.FC<{
  shape: ShapeDef;
  orientation: number;
  tone?: 'target' | 'player' | 'neutral';
  showPivot?: boolean;
  className?: string;
  svgClassName?: string;
}> = ({ shape, orientation, tone = 'neutral', showPivot = true }) => {
  const borderClass = tone === 'target'
    ? 'border-cyan-100/34 bg-blue-950/48'
    : tone === 'player'
      ? 'border-amber-100/34 bg-slate-950/48'
      : 'border-cyan-100/26 bg-slate-950/46';

  return (
    <div className={`relative flex h-[8.6rem] w-[8.6rem] items-center justify-center rounded-[1.05rem] border ${borderClass}`}>
      <motion.svg
        viewBox="-64 -64 128 128"
        animate={{ rotate: orientationToDegrees(orientation) }}
        transition={{ type: 'spring', stiffness: 220, damping: 23 }}
        className="h-[6.2rem] w-[6.2rem]"
        style={{ filter: 'drop-shadow(0 10px 14px rgba(2,6,23,0.48))' }}
      >
        <defs>
          <linearGradient id={`shape-grad-${shape.id}`} x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor={shape.fill} stopOpacity={0.98} />
            <stop offset="100%" stopColor={shape.fill} stopOpacity={0.62} />
          </linearGradient>
        </defs>
        <polygon points={shape.points} fill={`url(#shape-grad-${shape.id})`} stroke={shape.stroke} strokeWidth="4" />
      </motion.svg>
      {showPivot ? <span className="absolute h-1.5 w-1.5 rounded-full bg-white/70" /> : null}
    </div>
  );
};

const RotationStationGame: React.FC<RotationStationGameProps> = ({
  levelId,
  miniGameLevel,
  avatarId: _avatarId,
  useSharedTopHud = false,
  onVictory,
  onGameOver: _onGameOver,
  onBack,
}) => {
  const baseLevel = Math.max(1, Math.min(12, miniGameLevel || levelId || 1));
  const initialRoundSeconds = useMemo(() => roundSecondsForLevel(baseLevel), [baseLevel]);

  const [timeLeft, setTimeLeft] = useState(initialRoundSeconds);
  const [XP, setScore] = useState(0);
  const [Combo, setStreak] = useState(0);
  const [attemptCount, setAttemptCount] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [solvedCount, setSolvedCount] = useState(0);
  const [roundOver, setRoundOver] = useState(false);
  const [question, setQuestion] = useState<RotationQuestion>(() => createQuestion(baseLevel, 0, initialRoundSeconds));
  const [playerOrientation, setPlayerOrientation] = useState(0);
  const [isLocked, setIsLocked] = useState(false);
  const [feedback, setFeedback] = useState<FeedbackState | null>(null);
  const [shapePulse, setShapePulse] = useState<'success' | 'error' | null>(null);

  const finishGuardRef = useRef(false);
  const questionStartRef = useRef<number>(Date.now());
  const timeoutRefs = useRef<number[]>([]);

  const clearTimeouts = () => {
    timeoutRefs.current.forEach((timer) => window.clearTimeout(timer));
    timeoutRefs.current = [];
  };

  useEffect(() => clearTimeouts, []);

  useEffect(() => {
    clearTimeouts();
    finishGuardRef.current = false;
    setTimeLeft(initialRoundSeconds);
    setScore(0);
    setStreak(0);
    setAttemptCount(0);
    setCorrectCount(0);
    setSolvedCount(0);
    setRoundOver(false);
    const next = createQuestion(baseLevel, 0, initialRoundSeconds);
    setQuestion(next);
    setPlayerOrientation(next.startOrientation);
    setIsLocked(false);
    setFeedback(null);
    setShapePulse(null);
    questionStartRef.current = Date.now();
  }, [baseLevel, initialRoundSeconds]);

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
    const finalStage = stageFromProgress(baseLevel, solvedCount, 0);
    const stars = starsFromPerformance(XP, correctCount, attemptCount, finalStage);
    onVictory(stars, XP);
  }, [attemptCount, baseLevel, correctCount, onVictory, XP, solvedCount, timeLeft]);

  const timerProgress = Math.max(0, Math.min(1, timeLeft / initialRoundSeconds));
  const timerFillColor = useMemo(() => {
    const hue = Math.round(timerProgress * 120);
    return `hsl(${hue} 88% 50%)`;
  }, [timerProgress]);

  const moveToNextQuestion = useCallback((nextSolvedCount: number, delayMs: number) => {
    const timeout = window.setTimeout(() => {
      if (finishGuardRef.current) return;
      const next = createQuestion(baseLevel, nextSolvedCount, timeLeft);
      setQuestion(next);
      setPlayerOrientation(next.startOrientation);
      setFeedback(null);
      setShapePulse(null);
      setIsLocked(false);
      questionStartRef.current = Date.now();
    }, delayMs);
    timeoutRefs.current.push(timeout);
  }, [baseLevel, timeLeft]);

  const evaluateAnswer = useCallback((isCorrect: boolean, detailText: string) => {
    if (roundOver || isLocked) return;
    setIsLocked(true);
    const nextAttemptCount = attemptCount + 1;
    const nextSolvedCount = solvedCount + 1;
    setAttemptCount(nextAttemptCount);
    setSolvedCount(nextSolvedCount);

    if (isCorrect) {
      const elapsedMs = Math.max(220, Date.now() - questionStartRef.current);
      const speedBonus = Math.max(16, Math.round(165 - (elapsedMs / 16)));
      const streakMultiplier = 1 + Math.min(0.9, Combo * 0.08);
      const speedRoundBonus = question.speedRound ? 90 : 0;
      const points = Math.round((120 + question.difficultyWeight + speedBonus + speedRoundBonus) * streakMultiplier);
      setScore((prev) => prev + points);
      setCorrectCount((prev) => prev + 1);
      setStreak((prev) => prev + 1);
      setShapePulse('success');
      setFeedback({ tone: 'success', title: 'Rotation system restored', subtitle: `+${points} points` });
      triggerHaptic('success');
      moveToNextQuestion(nextSolvedCount, 320);
      return;
    }

    setScore((prev) => Math.max(0, prev - 35));
    setStreak(0);
    setShapePulse('error');
    setFeedback({ tone: 'error', title: 'Still misaligned', subtitle: detailText });
    triggerHaptic('error');
    moveToNextQuestion(nextSolvedCount, 560);
  }, [attemptCount, isLocked, moveToNextQuestion, question.difficultyWeight, question.speedRound, roundOver, solvedCount, Combo]);

  const handleRotate = (direction: TurnDirection) => {
    if (roundOver || isLocked || question.mode !== 'rotate_match') return;
    setPlayerOrientation((prev) => applyQuarterTurns(prev, direction, 1));
    triggerHaptic('selection');
  };

  const submitRotationMatch = () => {
    if (question.mode !== 'rotate_match' || roundOver || isLocked) return;
    const isCorrect = normalizeOrientation(playerOrientation) === normalizeOrientation(question.targetOrientation);
    evaluateAnswer(
      isCorrect,
      `Target was ${orientationLabel(question.targetOrientation)}.`,
    );
  };

  const handleChoiceTap = (choiceId: string) => {
    if (roundOver || isLocked) return;
    if (question.mode === 'predict_result') {
      const selected = question.options.find((option) => option.id === choiceId);
      const isCorrect = question.correctOptionIds.includes(choiceId);
      evaluateAnswer(isCorrect, `Correct was ${orientationLabel(question.targetOrientation)}.`);
      if (selected?.orientation !== undefined) {
        setPlayerOrientation(selected.orientation);
      }
      return;
    }

    if (question.mode === 'identify_turn') {
      const isCorrect = question.correctOptionIds.includes(choiceId);
      const answerLabel = question.options.find((option) => question.correctOptionIds.includes(option.id))?.label || '';
      evaluateAnswer(isCorrect, `Correct turn: ${answerLabel}.`);
    }
  };

  const topPaddingClass = useSharedTopHud
    ? 'pt-[calc(env(safe-area-inset-top)+3.6rem)]'
    : 'pt-[max(0.25rem,env(safe-area-inset-top))]';

  const shapePulseClass = shapePulse === 'success'
    ? 'drop-shadow-[0_0_18px_rgba(74,222,128,0.7)]'
    : shapePulse === 'error'
      ? 'drop-shadow-[0_0_18px_rgba(251,113,133,0.65)]'
      : '';

  return (
    <div className="relative z-20 h-full w-full overflow-hidden bg-[#08162c] select-none">
      <img
        src={gameplayBackground}
        alt=""
        aria-hidden="true"
        draggable={false}
        className="pointer-events-none absolute inset-0 h-full w-full object-contain object-center"
      />

      <main
        className={`relative z-20 flex h-full w-full flex-col items-center ${topPaddingClass} px-[max(0.75rem,env(safe-area-inset-left))] pb-[calc(env(safe-area-inset-bottom)+0.8rem)]`}
      >
        <div className="flex h-full w-full max-w-[30rem] min-h-0 flex-col gap-2">
          {!useSharedTopHud ? (
            <header className="rounded-[1.15rem] border border-cyan-100/26 bg-slate-950/55 px-3 py-2 shadow-[0_12px_22px_rgba(2,6,23,0.44)]">
              <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2.5">
                <div>
                  <div className="text-[9px] font-black uppercase tracking-[0.16em] text-cyan-100/72">Time attack</div>
                  <div className="relative mt-1 h-3.5 overflow-hidden rounded-full border border-cyan-100/26 bg-blue-950/58">
                    <motion.div
                      className="absolute inset-y-0 left-0 rounded-full"
                      animate={{ width: `${timerProgress * 100}%`, backgroundColor: timerFillColor }}
                      transition={{ duration: 0.25, ease: 'easeOut' }}
                      style={{ boxShadow: '0 0 12px rgba(34,197,94,0.45)' }}
                    />
                    <div className="absolute inset-[1px] rounded-full bg-[linear-gradient(to_right,rgba(255,255,255,0.1)_1px,transparent_1px)] bg-[length:12%_100%]" />
                  </div>
                </div>

              </div>
            </header>
          ) : (
            <header className="rounded-[1.15rem] border border-cyan-100/24 bg-slate-950/50 px-3 py-2 shadow-[0_10px_20px_rgba(2,6,23,0.42)]">
              <div className="flex items-center justify-between gap-2.5">
              </div>
            </header>
          )}

          <section>
            <GameQuestionCard title="Rotation Station" subtitle={question.subInstruction}>
              {question.instruction}
            </GameQuestionCard>
          </section>

          <section className="min-h-0 flex-1 rounded-[1.35rem] border border-cyan-100/18 bg-slate-950/46 p-2.5 shadow-[0_10px_20px_rgba(2,6,23,0.38)]">
            <div className="flex h-full min-h-0 flex-col gap-3">
              {question.mode === 'rotate_match' ? (
                <div className={`grid min-h-0 flex-1 grid-cols-2 items-center gap-2.5 ${shapePulseClass}`}>
                  <div className="flex flex-col items-center gap-1.5">
                    <div className="text-[10px] font-black uppercase tracking-[0.14em] text-cyan-100/72">Target</div>
                    <ShapeCard shape={question.shape} orientation={question.targetOrientation} tone="target" />
                    <div className="text-[10px] font-bold text-cyan-100/80">{orientationLabel(question.targetOrientation)}</div>
                  </div>
                  <div className="flex flex-col items-center gap-1.5">
                    <div className="text-[10px] font-black uppercase tracking-[0.14em] text-amber-100/72">Your shape</div>
                    <ShapeCard shape={question.shape} orientation={playerOrientation} tone="player" />
                    <div className="text-[10px] font-bold text-amber-100/80">{orientationLabel(playerOrientation)}</div>
                  </div>
                </div>
              ) : null}

              {question.mode === 'predict_result' ? (
                <div className={`grid min-h-0 flex-1 grid-rows-[auto_1fr] gap-2.5 ${shapePulseClass}`}>
                  <div className="flex items-center justify-center gap-3">
                    <ShapeCard shape={question.shape} orientation={question.startOrientation} tone="neutral" />
                    <span className="text-2xl font-black text-cyan-100/75">?</span>
                  </div>
                  <div className="answer-choice-surface grid grid-cols-2 gap-1.5">
                    {question.options.map((option) => (
                      <button
                        key={option.id}
                        type="button"
                        disabled={isLocked || roundOver}
                        onClick={() => handleChoiceTap(option.id)}
                        className="inline-flex min-h-[7.25rem] flex-col items-center justify-center gap-1.5 rounded-[0.85rem] border border-white/16 bg-slate-950/58 px-1.5 py-1.5 text-center text-[11px] font-black text-white shadow-[0_10px_18px_rgba(2,6,23,0.18)] disabled:opacity-55"
                      >
                        <div className="flex items-center justify-center pb-1.5">
                          <div className="scale-[0.72]">
                            <ShapeCard shape={question.shape} orientation={option.orientation || 0} showPivot={false} />
                          </div>
                        </div>
                        {option.label}
                      </button>
                    ))}
                  </div>
                </div>
              ) : null}

              {question.mode === 'identify_turn' ? (
                <div className={`grid min-h-0 flex-1 grid-rows-[auto_1fr] gap-2.5 ${shapePulseClass}`}>
                  <div className="flex items-center justify-center gap-3">
                    <ShapeCard shape={question.shape} orientation={question.startOrientation} tone="neutral" />
                    <span className="text-2xl font-black text-cyan-100/75">to</span>
                    <ShapeCard shape={question.shape} orientation={question.targetOrientation} tone="target" />
                  </div>
                  <div className="answer-choice-surface grid grid-cols-2 gap-1.5">
                    {question.options.map((option) => (
                      <button
                        key={option.id}
                        type="button"
                        disabled={isLocked || roundOver}
                        onClick={() => handleChoiceTap(option.id)}
                        className="inline-flex min-h-[3.6rem] items-center justify-center rounded-[0.85rem] border border-white/16 bg-slate-950/58 px-2 py-1.5 text-center text-[11px] font-black text-white shadow-[0_10px_18px_rgba(2,6,23,0.18)] disabled:opacity-55"
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
          </section>

          {question.mode === 'rotate_match' ? (
            <section className="shrink-0 rounded-[1.35rem] border border-cyan-100/18 bg-slate-950/48 p-2.5 shadow-[0_10px_20px_rgba(2,6,23,0.38)]">
              <div className="grid grid-cols-3 gap-2.5">
                <button
                  type="button"
                  disabled={isLocked || roundOver}
                  onClick={() => handleRotate('acw')}
                  className="ui-button-secondary rounded-[0.95rem] px-2 py-2.5 text-center text-sm font-black disabled:opacity-55"
                >
                  Rotate left 90
                </button>
                <button
                  type="button"
                  disabled={isLocked || roundOver}
                  onClick={() => handleRotate('cw')}
                  className="ui-button-secondary rounded-[0.95rem] px-2 py-2.5 text-center text-sm font-black disabled:opacity-55"
                >
                  Rotate right 90
                </button>
                <button
                  type="button"
                  disabled={isLocked || roundOver}
                  onClick={submitRotationMatch}
                  className="ui-button-primary rounded-[0.95rem] px-2 py-2.5 text-center text-sm font-black disabled:opacity-55"
                >
                  Submit
                </button>
              </div>
            </section>
          ) : null}
        </div>
      </main>

      <AnimatePresence>
        {feedback ? (
          <motion.div
            key={`${feedback.tone}-${feedback.title}-${feedback.subtitle}`}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.08 }}
            className={`pointer-events-none absolute left-1/2 top-[calc(env(safe-area-inset-top)+5.2rem)] z-50 -translate-x-1/2 rounded-[1rem] border px-4 py-2 text-center shadow-[0_14px_24px_rgba(2,6,23,0.45)] ${
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

export default RotationStationGame;




