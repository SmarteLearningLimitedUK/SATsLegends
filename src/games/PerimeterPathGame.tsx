import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { motion, useIsPresent, useReducedMotion } from 'motion/react';
import confetti from 'canvas-confetti';
import perimeterBackground from '../assets/maps/premium/perimeter-path.webp';
import { GameQuestionCard } from '../components/game-ui/GameUiKit';
import { stripLegacyWorldPrefix } from '../utils/fantasyPrompt';
import { MiniGameShellContractProps } from '../app/gameplaySessionContract';
import './game-refinements.css';

interface PerimeterPathGameProps extends MiniGameShellContractProps {
  levelId: number;
  avatarId: string;
  onVictory: (stars: number, XP: number) => void;
  onGameOver: (XP: number) => void;
  onBack: () => void;
}

type AnswerUnit = 'm' | 'cm';
type Point = { x: number; y: number };
type QuestionKind = 'fluency' | 'reasoning';

interface ShapeEdge {
  id: string;
  from: Point;
  to: Point;
  label: string;
}

interface ShapeModel {
  points: Point[];
  edges: ShapeEdge[];
}

interface PerimeterQuestion {
  id: string;
  level: number;
  prompt: string;
  hint: string;
  answerUnit: AnswerUnit;
  correctPerimeter: number;
  shape: ShapeModel;
  options: number[];
  kind: QuestionKind;
}

interface FeedbackState {
  type: 'correct' | 'incorrect';
  message: string;
}

const TARGET_CORRECT = 12;

const randInt = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;

const shuffle = <T,>(arr: T[]) => {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
};

const makeOptions = (correct: number) => {
  const step = Math.max(2, Math.round(correct * 0.08));
  const candidates = [
    correct + step,
    correct - step,
    correct + step * 2,
    correct - step * 2,
    correct + Math.max(1, Math.round(step / 2)),
    Math.max(1, correct - Math.max(1, Math.round(step / 2))),
    Math.max(1, Math.round(correct * 0.75)),
    Math.round(correct * 1.25),
  ].filter((value) => value > 0 && value !== correct);

  const unique = Array.from(new Set(candidates));
  const picks = shuffle(unique).slice(0, 3);
  return shuffle([correct, ...picks]);
};

const formatMixedLength = (cmValue: number) => {
  if (cmValue % 100 === 0 && Math.random() > 0.35) {
    return `${cmValue / 100} m`;
  }
  return `${cmValue} cm`;
};

const makeRectangleShape = (
  length: number,
  width: number,
  unit: AnswerUnit,
  hiddenEdgeId?: string,
): { shape: ShapeModel; perimeter: number } => {
  const points: Point[] = [
    { x: 8, y: 12 },
    { x: 92, y: 12 },
    { x: 92, y: 88 },
    { x: 8, y: 88 },
  ];

  const perimeter = 2 * (length + width);
  const topBottom = `${length} ${unit}`;
  const leftRight = `${width} ${unit}`;

  const edges: ShapeEdge[] = [
    { id: 'top', from: points[0], to: points[1], label: hiddenEdgeId === 'top' ? '?' : topBottom },
    { id: 'right', from: points[1], to: points[2], label: hiddenEdgeId === 'right' ? '?' : leftRight },
    { id: 'bottom', from: points[2], to: points[3], label: hiddenEdgeId === 'bottom' ? '?' : topBottom },
    { id: 'left', from: points[3], to: points[0], label: hiddenEdgeId === 'left' ? '?' : leftRight },
  ];

  return { shape: { points, edges }, perimeter };
};

const makeCompoundShape = (
  values: {
    top: number;
    rightTop: number;
    notch: number;
    innerDown: number;
    rightBottom: number;
    left: number;
  },
  labels: string[],
): { shape: ShapeModel; perimeter: number } => {
  const points: Point[] = [
    { x: 8, y: 10 },
    { x: 92, y: 10 },
    { x: 92, y: 33 },
    { x: 59, y: 33 },
    { x: 59, y: 61 },
    { x: 92, y: 61 },
    { x: 92, y: 90 },
    { x: 8, y: 90 },
  ];

  const edges: ShapeEdge[] = [
    { id: 'e1', from: points[0], to: points[1], label: labels[0] },
    { id: 'e2', from: points[1], to: points[2], label: labels[1] },
    { id: 'e3', from: points[2], to: points[3], label: labels[2] },
    { id: 'e4', from: points[3], to: points[4], label: labels[3] },
    { id: 'e5', from: points[4], to: points[5], label: labels[4] },
    { id: 'e6', from: points[5], to: points[6], label: labels[5] },
    { id: 'e7', from: points[6], to: points[7], label: labels[6] },
    { id: 'e8', from: points[7], to: points[0], label: labels[7] },
  ];

  const perimeter = (
    values.top +
    values.rightTop +
    values.notch +
    values.innerDown +
    values.notch +
    values.rightBottom +
    values.top +
    values.left
  );

  return { shape: { points, edges }, perimeter };
};

const generateQuestion = (level: number): PerimeterQuestion => {
  const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

  if (level <= 2) {
    const isSquare = level === 1;
    const sideA = level === 1 ? randInt(2, 9) : randInt(4, 15);
    const sideB = isSquare ? sideA : randInt(3, 11);
    const model = makeRectangleShape(sideA, sideB, 'm');
    return {
      id,
      level,
      prompt: isSquare ? 'The Monster Minds damaged this square boundary. Find the perimeter to restore it.' : 'The Monster Minds damaged this rectangle boundary. Find the perimeter to restore it.',
      hint: 'Trace the full outside boundary once.',
      answerUnit: 'm',
      correctPerimeter: model.perimeter,
      shape: model.shape,
      options: makeOptions(model.perimeter),
      kind: 'fluency',
    };
  }

  if (level === 3) {
    const sideA = randInt(8, 24);
    const sideB = randInt(5, 16);
    const hidden = randomFrom(['top', 'right', 'bottom', 'left']);
    const model = makeRectangleShape(sideA, sideB, 'm', hidden);
    return {
      id,
      level,
      prompt: 'One side of the damaged boundary is hidden. Work it out, then calculate the perimeter.',
      hint: 'Use matching sides to rebuild the missing boundary edge.',
      answerUnit: 'm',
      correctPerimeter: model.perimeter,
      shape: model.shape,
      options: makeOptions(model.perimeter),
      kind: 'fluency',
    };
  }

  if (level === 4) {
    const top = randInt(12, 30);
    const rightTop = randInt(2, 7);
    const innerDown = randInt(2, 7);
    const rightBottom = randInt(2, 7);
    const left = rightTop + innerDown + rightBottom;
    const notch = randInt(2, Math.min(8, top - 2));
    const labels = [
      `${top} m`,
      `${rightTop} m`,
      `${notch} m`,
      `${innerDown} m`,
      `${notch} m`,
      `${rightBottom} m`,
      `${top} m`,
      `${left} m`,
    ];
    const model = makeCompoundShape({ top, rightTop, notch, innerDown, rightBottom, left }, labels);
    return {
      id,
      level,
      prompt: 'Trace the damaged outer boundary, then calculate the perimeter of this compound shape.',
      hint: 'Follow the whole outside edge of the damaged path.',
      answerUnit: 'm',
      correctPerimeter: model.perimeter,
      shape: model.shape,
      options: makeOptions(model.perimeter),
      kind: 'fluency',
    };
  }

  const top = randInt(9, 26) * 100;
  const rightTop = randInt(3, 9) * 50;
  const innerDown = randInt(3, 9) * 50;
  const rightBottom = randInt(3, 9) * 50;
  const left = rightTop + innerDown + rightBottom;
  const notch = randInt(2, 7) * 100;
  const edgeCm = [top, rightTop, notch, innerDown, notch, rightBottom, top, left];
  const labels = edgeCm.map((value) => formatMixedLength(value));
  const model = makeCompoundShape({ top, rightTop, notch, innerDown, rightBottom, left }, labels);
  return {
    id,
    level,
    prompt: 'Mixed units challenge: restore the full boundary and find the perimeter in cm.',
    hint: 'Convert each edge to cm before restoring the full boundary total.',
    answerUnit: 'cm',
    correctPerimeter: model.perimeter,
    shape: model.shape,
    options: makeOptions(model.perimeter),
    kind: 'fluency',
  };
};

const randomFrom = <T,>(items: T[]) => items[Math.floor(Math.random() * items.length)];

const scoreToStars = (XP: number) => {
  if (XP >= 3200) return 3;
  if (XP >= 2200) return 2;
  return 1;
};

const getEdgeLabelPosition = (edge: ShapeEdge) => {
  const compoundPositions: Record<string, Point> = {
    e1: { x: 50, y: 12.5 }, e2: { x: 83, y: 25 }, e3: { x: 49, y: 37.5 }, e4: { x: 83, y: 50 },
    e5: { x: 49, y: 62.5 }, e6: { x: 83, y: 75 }, e7: { x: 50, y: 87.5 }, e8: { x: 16, y: 50 },
  };
  if (compoundPositions[edge.id]) return compoundPositions[edge.id];
  const x = (edge.from.x + edge.to.x) / 2;
  const y = (edge.from.y + edge.to.y) / 2;
  const horizontal = Math.abs(edge.to.x - edge.from.x) >= Math.abs(edge.to.y - edge.from.y);
  return horizontal
    ? { x, y: y < 20 ? 12.5 : y > 80 ? 87.5 : y }
    : { x: x > 80 ? 83 : x < 20 ? 16 : x + 6, y };
};

const PerimeterShapeRenderer: React.FC<{
  shape: ShapeModel;
  selectedEdgeIds: string[];
  disabled: boolean;
  onSelectEdge: (id: string) => void;
}> = ({ shape, selectedEdgeIds, disabled, onSelectEdge }) => (
  <>
    <svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
      <defs>
        <pattern id="perimeter-floor-grid" width="8" height="8" patternUnits="userSpaceOnUse">
          <path d="M 8 0 H 0 V 8" fill="none" stroke="#78a58e" strokeWidth=".25" opacity=".25" />
        </pattern>
      </defs>
      <rect width="100" height="100" fill="url(#perimeter-floor-grid)" />
      <polygon points={shape.points.map((point) => `${point.x},${point.y}`).join(' ')} fill="#2d6158" />
      {shape.edges.map((edge) => {
        const selected = selectedEdgeIds.includes(edge.id);
        const label = getEdgeLabelPosition(edge);
        return <g key={edge.id}>
          <line x1={(edge.from.x + edge.to.x) / 2} y1={(edge.from.y + edge.to.y) / 2} x2={label.x} y2={label.y}
            stroke={selected ? '#f6c75d' : '#b4d0bd'} strokeWidth=".4" opacity=".65" />
          <line x1={edge.from.x} y1={edge.from.y} x2={edge.to.x} y2={edge.to.y} stroke="#071b20" strokeWidth="4.2" />
          <line data-perimeter-edge-line={edge.id} x1={edge.from.x} y1={edge.from.y} x2={edge.to.x} y2={edge.to.y}
            stroke={selected ? '#f6c75d' : '#9ecabd'} strokeWidth={selected ? '2.5' : '1.6'}
            strokeDasharray={selected ? undefined : '2 1'} />
        </g>;
      })}
    </svg>
    {shape.edges.map((edge, index) => {
      const position = getEdgeLabelPosition(edge);
      const selected = selectedEdgeIds.includes(edge.id);
      return <button key={edge.id} type="button" data-perimeter-edge={edge.id} data-edge-value={edge.label}
        className="perimeter-edge-control" style={{ left: `${position.x}%`, top: `${position.y}%` }}
        aria-pressed={selected} aria-label={`Edge ${index + 1}: ${edge.label}. ${selected ? 'Checked' : 'Unchecked'}`}
        disabled={disabled} onClick={() => onSelectEdge(edge.id)}>
        <span className="perimeter-edge-check" aria-hidden="true">{selected ? '✓' : '○'}</span>
        <span>{edge.label}</span>
      </button>;
    })}
  </>
);

const PerimeterPathGame: React.FC<PerimeterPathGameProps> = ({ levelId, avatarId: _avatarId, onVictory, onGameOver: _onGameOver, onBack: _onBack, sessionState, sessionEvents }) => {
  const tier = Math.max(1, Math.min(5, levelId));
  const reducedMotion = useReducedMotion();
  const isPresent = useIsPresent();
  const presentRef = useRef(isPresent);
  presentRef.current = isPresent;
  const [XP, setScore] = useState(0);
  const [question, setQuestion] = useState<PerimeterQuestion>(() => generateQuestion(tier));
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [combo, setStreak] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [feedback, setFeedback] = useState<FeedbackState | null>(null);
  const [selectedEdgeIds, setSelectedEdgeIds] = useState<string[]>([]);
  const [locked, setLocked] = useState(false);
  const endedRef = useRef(false);
  const answerLockRef = useRef(false);
  const timersRef = useRef<number[]>([]);
  const victoryRef = useRef(onVictory);
  victoryRef.current = onVictory;

  const clearTimers = () => { timersRef.current.forEach(window.clearTimeout); timersRef.current = []; };
  useLayoutEffect(() => {
    if (!isPresent) { endedRef.current = true; answerLockRef.current = true; clearTimers(); }
    return () => clearTimers();
  }, [isPresent]);
  useEffect(() => {
    if (!presentRef.current) return;
    clearTimers();
    endedRef.current = false;
    answerLockRef.current = false;
    setScore(0); setQuestion(generateQuestion(tier)); setSelectedOption(null);
    setStreak(0); setCorrectCount(0); setFeedback(null); setSelectedEdgeIds([]); setLocked(false);
  }, [tier]);

  const nextQuestion = () => {
    if (endedRef.current || !presentRef.current) return;
    setQuestion(generateQuestion(tier)); setSelectedOption(null); setFeedback(null);
    setSelectedEdgeIds([]); setLocked(false); answerLockRef.current = false;
  };
  const handleAnswer = (option: number) => {
    if (answerLockRef.current || endedRef.current || !presentRef.current || sessionState?.paused) return;
    answerLockRef.current = true; setLocked(true); setSelectedOption(option);
    const correct = option === question.correctPerimeter;
    const nextScore = correct ? XP + 220 + tier * 14 + combo * 26 : Math.max(0, XP - 40);
    const nextCorrect = correctCount + (correct ? 1 : 0);
    setScore(nextScore); setStreak(correct ? combo + 1 : 0); setCorrectCount(nextCorrect);
    setFeedback(correct ? { type: 'correct', message: 'Boundary secured. Slime stays outside!' }
      : { type: 'incorrect', message: `Check every outside edge: ${question.correctPerimeter} ${question.answerUnit}.` });
    if (correct) {
      sessionEvents?.onCorrectAnswer?.({ score: nextScore, metadata: { questionId: question.id } });
      sessionEvents?.onPuzzleComplete?.({ score: nextScore, metadata: { completed: nextCorrect, total: TARGET_CORRECT } });
    }
    if (correct && !reducedMotion) confetti({ particleCount: 20, spread: 40, origin: { y: .65 }, colors: ['#f6c75d', '#77d7ba'] });
    timersRef.current.push(window.setTimeout(() => {
      if (!presentRef.current || endedRef.current) return;
      if (nextCorrect >= TARGET_CORRECT) {
        endedRef.current = true;
        const stars = scoreToStars(nextScore);
        sessionEvents?.onGameComplete?.({ score: nextScore, stars });
        victoryRef.current(stars, nextScore);
      } else nextQuestion();
    }, correct ? 520 : 900));
  };
  const toggleEdge = (id: string) => {
    if (answerLockRef.current || endedRef.current || !presentRef.current || sessionState?.paused) return;
    setSelectedEdgeIds((previous) => previous.includes(id) ? previous.filter((edge) => edge !== id) : [...previous, id]);
  };

  return (
    <div className="perimeter-game relative h-full w-full overflow-hidden bg-[#85a1b9]" data-perimeter-game data-perimeter-tier={tier} data-perimeter-question={question.id}>
      <img src={perimeterBackground} alt="" aria-hidden="true" draggable={false} data-game-scene-image data-background-fit="contain" className="pointer-events-none absolute inset-0 h-full w-full object-contain object-center" />
      <main className="perimeter-layout">
        <GameQuestionCard title="Secure the boundary" style={{ position: 'relative', top: 0, transform: 'none' }}>
          {stripLegacyWorldPrefix(question.prompt)}
        </GameQuestionCard>
        <motion.div data-perimeter-playfield className="perimeter-board"
          animate={!reducedMotion && feedback?.type === 'incorrect' ? { x: [0, -5, 5, -3, 0] } : { x: 0 }} transition={{ duration: .3 }}>
          <PerimeterShapeRenderer shape={question.shape} selectedEdgeIds={selectedEdgeIds} disabled={locked || Boolean(sessionState?.paused)} onSelectEdge={toggleEdge} />
        </motion.div>
        <div className="answer-choice-surface perimeter-responses">
          {question.options.map((option) => <motion.button key={`${question.id}-${option}`} type="button"
            whileTap={reducedMotion ? undefined : { scale: .98 }} onClick={() => handleAnswer(option)} disabled={locked || Boolean(sessionState?.paused)}
            className={selectedOption === option ? feedback?.type === 'correct' ? 'ui-button-success' : 'ui-button-primary' : 'ui-button-secondary'}>
            {option} {question.answerUnit}
          </motion.button>)}
        </div>
        <div className="refinement-feedback" role="status" aria-live="polite">
          {feedback?.message || `Check edges as you count (${selectedEdgeIds.length}/${question.shape.edges.length}). You can answer any time.`}
        </div>
      </main>
    </div>
  );
};

export default PerimeterPathGame;
