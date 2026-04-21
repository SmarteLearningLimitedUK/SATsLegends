import React, { useEffect, useRef, useState } from 'react';
import { motion } from 'motion/react';
import confetti from 'canvas-confetti';
import perimeterBackground from '../assets/maps/backgroundsforgames/Perimeter Path.jpg';
import { GameQuestionCard } from '../components/game-ui/GameUiKit';
import { stripLegacyWorldPrefix } from '../utils/fantasyPrompt';

interface PerimeterPathGameProps {
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

  if (level <= 3) {
    const isSquare = Math.random() > 0.45;
    const sideA = randInt(4 + level, 14 + level * 2);
    const sideB = isSquare ? sideA : randInt(3 + level, 12 + level * 2);
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

  if (level <= 6) {
    const sideA = randInt(8 + level, 18 + level * 2);
    const sideB = randInt(6 + level, 14 + level * 2);
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

  if (level <= 10) {
    const top = randInt(14 + level, 24 + level * 2);
    const rightTop = randInt(4, 10);
    const innerDown = randInt(4, 10);
    const rightBottom = randInt(4, 10);
    const left = rightTop + innerDown + rightBottom;
    const notch = randInt(3, 10);
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

  const top = randInt(900, 2600);
  const rightTop = randInt(250, 1100);
  const innerDown = randInt(280, 1200);
  const rightBottom = randInt(250, 1000);
  const left = rightTop + innerDown + rightBottom;
  const notch = randInt(180, 900);
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
  const mx = (edge.from.x + edge.to.x) / 2;
  const my = (edge.from.y + edge.to.y) / 2;
  const dx = edge.to.x - edge.from.x;
  const dy = edge.to.y - edge.from.y;
  const horizontal = Math.abs(dx) >= Math.abs(dy);
  const offset = horizontal ? 5.2 : 6;

  if (horizontal) {
    return { x: mx, y: my + (my < 50 ? -offset : offset) };
  }
  return { x: mx + (mx < 50 ? -offset : offset), y: my };
};

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

const PerimeterShapeRenderer: React.FC<{
  shape: ShapeModel;
  highlightedEdgeId: string | null;
  tracedEdgeIds: string[];
  onHighlightEdge: (id: string | null) => void;
  onTraceEdge: (id: string) => void;
  onTraceStart: () => void;
  onTraceEnd: () => void;
  zoom: number;
  labelFontSize: number;
}> = ({ shape, highlightedEdgeId, tracedEdgeIds, onHighlightEdge, onTraceEdge, onTraceStart, onTraceEnd, zoom, labelFontSize }) => {
  const pointsAttr = shape.points.map((point) => `${point.x},${point.y}`).join(' ');

  return (
    <svg viewBox="0 0 100 100" className="h-full w-full" onPointerUp={onTraceEnd} onPointerLeave={onTraceEnd}>
      <g transform={`translate(50 50) scale(${zoom}) translate(-50 -50)`}>
        <polygon points={pointsAttr} fill="rgba(56, 189, 248, 0.16)" stroke="rgba(125, 211, 252, 0.42)" strokeWidth="0.4" />
        {shape.edges.map((edge) => {
          const isTraced = tracedEdgeIds.includes(edge.id);
          const isActive = highlightedEdgeId === edge.id || isTraced;
          const labelPos = getEdgeLabelPosition(edge);
          const labelWidth = Math.max(12, Math.min(24, edge.label.length * 2 + 3));
          const labelHeight = 7;
          const safeX = clamp(labelPos.x, (labelWidth / 2) + 1, 100 - (labelWidth / 2) - 1);
          const safeY = clamp(labelPos.y, 7.5, 92.5);
          return (
            <g
              key={edge.id}
              onPointerDown={() => {
                onTraceStart();
                onHighlightEdge(edge.id);
                onTraceEdge(edge.id);
              }}
              onPointerEnter={() => {
                onHighlightEdge(edge.id);
                onTraceEdge(edge.id);
              }}
              onPointerLeave={() => onHighlightEdge(null)}
              onTouchStart={() => {
                onHighlightEdge(edge.id);
                onTraceEdge(edge.id);
              }}
            >
              <line
                x1={edge.from.x}
                y1={edge.from.y}
                x2={edge.to.x}
                y2={edge.to.y}
                stroke={isActive ? '#facc15' : '#7dd3fc'}
                strokeWidth={isTraced ? 4.1 : isActive ? 3.4 : 2.8}
                strokeLinecap="round"
              />
              <rect
                x={safeX - (labelWidth / 2)}
                y={safeY - (labelHeight / 2)}
                width={labelWidth}
                height={labelHeight}
                rx={3.5}
                fill={isTraced ? 'rgba(250, 204, 21, 0.52)' : isActive ? 'rgba(250, 204, 21, 0.36)' : 'rgba(15, 23, 42, 0.66)'}
                stroke={isTraced ? 'rgba(253, 224, 71, 0.95)' : isActive ? 'rgba(250, 204, 21, 0.75)' : 'rgba(255, 255, 255, 0.22)'}
                strokeWidth={0.55}
              />
              <text
                x={safeX}
                y={safeY}
                textAnchor="middle"
                dominantBaseline="middle"
                fill="#ffffff"
                fontSize={labelFontSize}
                fontWeight={800}
                style={{ letterSpacing: '0.01em' }}
              >
                {edge.label}
              </text>
            </g>
          );
        })}
      </g>
    </svg>
  );
};

const PerimeterPathGame: React.FC<PerimeterPathGameProps> = ({
  levelId,
  avatarId: _avatarId,
  onVictory,
  onGameOver,
  onBack,
}) => {
  const [currentLevel, setCurrentLevel] = useState(Math.max(1, levelId));
  const [XP, setScore] = useState(0);
  const [question, setQuestion] = useState<PerimeterQuestion>(() => generateQuestion(Math.max(1, levelId)));
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [Combo, setStreak] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [feedback, setFeedback] = useState<FeedbackState | null>(null);
  const [shakeShape, setShakeShape] = useState(false);
  const [highlightedEdgeId, setHighlightedEdgeId] = useState<string | null>(null);
  const [tracedEdgeIds, setTracedEdgeIds] = useState<string[]>([]);
  const [isTracing, setIsTracing] = useState(false);
  const [locked, setLocked] = useState(false);

  const endedRef = useRef(false);

  useEffect(() => {
    setCurrentLevel(Math.max(1, levelId));
    setScore(0);
    setQuestion(generateQuestion(Math.max(1, levelId)));
    setSelectedOption(null);
    setStreak(0);
    setCorrectCount(0);
    setFeedback(null);
    setShakeShape(false);
    setTracedEdgeIds([]);
    setIsTracing(false);
    setLocked(false);
    endedRef.current = false;
  }, [levelId]);

  const goNextQuestion = () => {
    const nextLevel = currentLevel + 1;
    setCurrentLevel(nextLevel);
    setQuestion(generateQuestion(nextLevel));
    setSelectedOption(null);
    setFeedback(null);
    setLocked(false);
    setHighlightedEdgeId(null);
    setTracedEdgeIds([]);
    setIsTracing(false);
  };

  const traceComplete = tracedEdgeIds.length === question.shape.edges.length;
  const tracingRequired = currentLevel < 7;

  const handleTraceEdge = (edgeId: string) => {
    if (locked || !isTracing) return;
    setTracedEdgeIds((prev) => (prev.includes(edgeId) ? prev : [...prev, edgeId]));
  };

  const handleCorrect = (submitted: number) => {
    void submitted;
    const earned = 220 + (currentLevel * 14) + (Combo * 26);
    const nextScore = XP + earned;
    const nextStreak = Combo + 1;
    const nextCorrect = correctCount + 1;

    setScore(nextScore);
    setStreak(nextStreak);
    setCorrectCount(nextCorrect);
    setFeedback({ type: 'correct', message: 'Boundary restored! Great work.' });
    setLocked(true);

    confetti({
      particleCount: 24,
      spread: 44,
      origin: { y: 0.65 },
      colors: ['#22c55e', '#fde047', '#38bdf8'],
    });

    window.setTimeout(() => {
      if (nextCorrect >= TARGET_CORRECT && !endedRef.current) {
        endedRef.current = true;
        onVictory(scoreToStars(nextScore), nextScore);
        return;
      }
      goNextQuestion();
    }, 520);
  };

  const handleIncorrect = () => {
    setScore((previous) => Math.max(0, previous - 40));
    setStreak(0);
    setFeedback({
      type: 'incorrect',
      message: `Still damaged. Correct perimeter: ${question.correctPerimeter} ${question.answerUnit}`,
    });
    setShakeShape(true);
    setLocked(true);

    window.setTimeout(() => setShakeShape(false), 380);
    window.setTimeout(() => goNextQuestion(), 900);
  };

  const submitAnswer = (rawAnswer: number) => {
    if (locked || feedback || (tracingRequired && !traceComplete)) return;
    if (rawAnswer === question.correctPerimeter) {
      handleCorrect(rawAnswer);
      return;
    }
    handleIncorrect();
  };

  const handleOptionTap = (option: number) => {
    if (locked || (tracingRequired && !traceComplete)) return;
    setSelectedOption(option);
    submitAnswer(option);
  };
  const shapeZoom = currentLevel >= 11 ? 0.92 : currentLevel >= 7 ? 0.88 : 0.84;
  const labelFontSize = currentLevel >= 11 ? 6.2 : 5.5;

  return (
    <div className="relative h-full w-full overflow-hidden bg-[#030817]">
      <img
        src={perimeterBackground}
        alt=""
        aria-hidden="true"
        draggable={false}
        className="pointer-events-none absolute inset-0 h-full w-full object-cover object-center"
      />

      <div className="relative z-10 flex h-full min-h-0 flex-col px-3 pb-[calc(env(safe-area-inset-bottom)+1rem)] pt-[calc(env(safe-area-inset-top)+0.2rem)]">
        <main className="mt-0 flex min-h-0 flex-1 flex-col gap-1.5 sm:gap-2">
              <div className="shrink-0">
                <GameQuestionCard title="Perimeter Path" bodyClassName="sm:text-sm">
                  {stripLegacyWorldPrefix(question.prompt)}
                </GameQuestionCard>
              </div>

          <motion.div
            animate={shakeShape ? { x: [0, -9, 8, -7, 6, -4, 0] } : { x: 0 }}
            transition={{ duration: 0.35 }}
            className="relative min-h-[9rem] flex-1 overflow-hidden rounded-2xl border border-white/22 bg-slate-950/40 sm:min-h-[10.5rem] md:min-h-[13rem] lg:min-h-[14rem]"
          >
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_18%,rgba(56,189,248,0.2),transparent_28%),radial-gradient(circle_at_50%_92%,rgba(250,204,21,0.15),transparent_30%)]" />
            <div className="relative h-full w-full p-0.5 sm:p-1">
              <PerimeterShapeRenderer
                shape={question.shape}
                highlightedEdgeId={tracingRequired ? highlightedEdgeId : null}
                tracedEdgeIds={tracedEdgeIds}
                onHighlightEdge={tracingRequired ? setHighlightedEdgeId : () => undefined}
                onTraceEdge={tracingRequired ? handleTraceEdge : () => undefined}
                onTraceStart={tracingRequired ? () => setIsTracing(true) : () => undefined}
                onTraceEnd={tracingRequired ? () => setIsTracing(false) : () => undefined}
                zoom={shapeZoom}
                labelFontSize={labelFontSize}
              />
            </div>
          </motion.div>

          <div className="answer-choice-surface shrink-0 grid grid-cols-2 gap-1.5 sm:gap-2">
            {question.options.map((option) => (
              <motion.button
                key={option}
                whileTap={{ scale: 0.96 }}
                onClick={() => handleOptionTap(option)}
                disabled={locked || (tracingRequired && !traceComplete)}
                className={`flex h-10 items-center justify-center rounded-[0.7rem] px-3 py-2 text-base font-black leading-none sm:h-11 sm:text-lg md:h-13 md:text-xl ${
                  selectedOption === option
                    ? 'ui-button-primary'
                    : 'ui-button-secondary disabled:opacity-45'
                }`}
              >
                <span className="leading-none">{option}</span>
              </motion.button>
            ))}
          </div>

          <div className={`shrink-0 rounded-xl border px-3 py-2 text-center text-[12px] font-bold leading-tight sm:text-sm ${
            feedback?.type === 'correct'
              ? 'border-emerald-300/45 bg-emerald-400/16 text-emerald-100'
              : feedback?.type === 'incorrect'
              ? 'border-rose-300/45 bg-rose-400/16 text-amber-100'
              : 'border-white/18 bg-slate-950/44 text-white/72'
          }`}>
            {feedback ? feedback.message : tracingRequired
              ? (traceComplete ? 'Boundary traced. Choose the correct perimeter.' : `Trace the full outer boundary first (${tracedEdgeIds.length}/${question.shape.edges.length}).`)
              : 'Choose the correct perimeter to restore the path.'}
          </div>
        </main>
      </div>
    </div>
  );
};

export default PerimeterPathGame;

