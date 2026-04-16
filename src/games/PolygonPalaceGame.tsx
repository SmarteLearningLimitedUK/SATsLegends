import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { triggerHaptic } from '../haptics';
import gameplayBackground from '../assets/maps/backgroundsforgames/polygon palace.jpg';

interface PolygonPalaceGameProps {
  levelId: number;
  miniGameLevel?: number;
  avatarId: string;
  useSharedTopHud?: boolean;
  onVictory: (stars: number, XP: number) => void;
  onGameOver: (XP: number) => void;
  onBack: () => void;
}

type ShapeFamily = 'triangle' | 'quadrilateral' | 'polygon' | 'circle';
type EqualSideMode = 'none' | 'twoPairs' | 'all';
type QuestionMode = 'name' | 'properties' | 'sort';
type QuestionKind = 'fluency' | 'reasoning';

interface ShapeDefinition {
  id: string;
  name: string;
  family: ShapeFamily;
  sides: number;
  rightAngles: number;
  parallelPairs: number;
  equalSideMode: EqualSideMode;
  regular: boolean;
  symmetryLines: number;
  kind: 'polygon' | 'circle';
  points?: string;
  defaultRotation: number;
  fill: string;
  stroke: string;
}

interface PropertyDefinition {
  id: string;
  label: string;
  minStage: number;
  maxStage?: number;
  check: (shape: ShapeDefinition) => boolean;
}

interface SortCriterion {
  id: string;
  prompt: string;
  trueLabel: string;
  falseLabel: string;
  minStage: number;
  check: (shape: ShapeDefinition) => boolean;
}

interface Choice {
  id: string;
  label: string;
}

interface PolygonQuestion {
  id: string;
  stage: number;
  mode: QuestionMode;
  prompt: string;
  subPrompt: string;
  shape: ShapeDefinition;
  shapeRotation: number;
  choices: Choice[];
  correctChoiceIds: string[];
  multiSelect: boolean;
  difficultyWeight: number;
  speedRound: boolean;
  kind: QuestionKind;
}

const randomInt = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;

const createId = () => `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

const shuffle = <T,>(items: T[]): T[] => {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
};

const pickRandom = <T,>(items: T[], count: number): T[] => {
  return shuffle(items).slice(0, Math.max(0, Math.min(count, items.length)));
};

const normalizeAnswers = (answers: string[]) => [...new Set(answers)].sort((a, b) => a.localeCompare(b));

const regularPolygonPoints = (sides: number, radius: number, rotationDeg = -90) => {
  const points: string[] = [];
  for (let i = 0; i < sides; i += 1) {
    const angle = ((rotationDeg + ((360 / sides) * i)) * Math.PI) / 180;
    const x = Math.cos(angle) * radius;
    const y = Math.sin(angle) * radius;
    points.push(`${x.toFixed(2)},${y.toFixed(2)}`);
  }
  return points.join(' ');
};

const SHAPES: ShapeDefinition[] = [
  {
    id: 'square',
    name: 'Square',
    family: 'quadrilateral',
    sides: 4,
    rightAngles: 4,
    parallelPairs: 2,
    equalSideMode: 'all',
    regular: true,
    symmetryLines: 4,
    kind: 'polygon',
    points: '-33,-33 33,-33 33,33 -33,33',
    defaultRotation: 0,
    fill: '#38bdf8',
    stroke: '#e0f2fe',
  },
  {
    id: 'rectangle',
    name: 'Rectangle',
    family: 'quadrilateral',
    sides: 4,
    rightAngles: 4,
    parallelPairs: 2,
    equalSideMode: 'twoPairs',
    regular: false,
    symmetryLines: 2,
    kind: 'polygon',
    points: '-44,-24 44,-24 44,24 -44,24',
    defaultRotation: 0,
    fill: '#60a5fa',
    stroke: '#dbeafe',
  },
  {
    id: 'triangle-equilateral',
    name: 'Equilateral Triangle',
    family: 'triangle',
    sides: 3,
    rightAngles: 0,
    parallelPairs: 0,
    equalSideMode: 'all',
    regular: true,
    symmetryLines: 3,
    kind: 'polygon',
    points: '0,-42 38,24 -38,24',
    defaultRotation: 0,
    fill: '#34d399',
    stroke: '#d1fae5',
  },
  {
    id: 'triangle-right',
    name: 'Right-angled Triangle',
    family: 'triangle',
    sides: 3,
    rightAngles: 1,
    parallelPairs: 0,
    equalSideMode: 'none',
    regular: false,
    symmetryLines: 0,
    kind: 'polygon',
    points: '-38,-26 -38,28 34,28',
    defaultRotation: 0,
    fill: '#14b8a6',
    stroke: '#ccfbf1',
  },
  {
    id: 'triangle-isosceles',
    name: 'Isosceles Triangle',
    family: 'triangle',
    sides: 3,
    rightAngles: 0,
    parallelPairs: 0,
    equalSideMode: 'none',
    regular: false,
    symmetryLines: 1,
    kind: 'polygon',
    points: '0,-40 34,26 -34,26',
    defaultRotation: 0,
    fill: '#22d3ee',
    stroke: '#cffafe',
  },
  {
    id: 'parallelogram',
    name: 'Parallelogram',
    family: 'quadrilateral',
    sides: 4,
    rightAngles: 0,
    parallelPairs: 2,
    equalSideMode: 'twoPairs',
    regular: false,
    symmetryLines: 0,
    kind: 'polygon',
    points: '-40,-24 20,-24 40,24 -20,24',
    defaultRotation: 0,
    fill: '#818cf8',
    stroke: '#e0e7ff',
  },
  {
    id: 'rhombus',
    name: 'Rhombus',
    family: 'quadrilateral',
    sides: 4,
    rightAngles: 0,
    parallelPairs: 2,
    equalSideMode: 'all',
    regular: false,
    symmetryLines: 2,
    kind: 'polygon',
    points: '0,-38 36,0 0,38 -36,0',
    defaultRotation: 0,
    fill: '#a78bfa',
    stroke: '#ede9fe',
  },
  {
    id: 'trapezium',
    name: 'Trapezium',
    family: 'quadrilateral',
    sides: 4,
    rightAngles: 0,
    parallelPairs: 1,
    equalSideMode: 'none',
    regular: false,
    symmetryLines: 0,
    kind: 'polygon',
    points: '-42,-24 42,-24 22,24 -28,24',
    defaultRotation: 0,
    fill: '#f97316',
    stroke: '#ffedd5',
  },
  {
    id: 'kite',
    name: 'Kite',
    family: 'quadrilateral',
    sides: 4,
    rightAngles: 0,
    parallelPairs: 0,
    equalSideMode: 'none',
    regular: false,
    symmetryLines: 1,
    kind: 'polygon',
    points: '0,-42 28,-6 0,38 -24,-8',
    defaultRotation: 0,
    fill: '#f43f5e',
    stroke: '#ffe4e6',
  },
  {
    id: 'pentagon',
    name: 'Pentagon',
    family: 'polygon',
    sides: 5,
    rightAngles: 0,
    parallelPairs: 0,
    equalSideMode: 'all',
    regular: true,
    symmetryLines: 5,
    kind: 'polygon',
    points: regularPolygonPoints(5, 39),
    defaultRotation: 0,
    fill: '#f59e0b',
    stroke: '#fef3c7',
  },
  {
    id: 'hexagon',
    name: 'Hexagon',
    family: 'polygon',
    sides: 6,
    rightAngles: 0,
    parallelPairs: 3,
    equalSideMode: 'all',
    regular: true,
    symmetryLines: 6,
    kind: 'polygon',
    points: regularPolygonPoints(6, 38),
    defaultRotation: 0,
    fill: '#facc15',
    stroke: '#fef9c3',
  },
  {
    id: 'octagon',
    name: 'Octagon',
    family: 'polygon',
    sides: 8,
    rightAngles: 0,
    parallelPairs: 4,
    equalSideMode: 'all',
    regular: true,
    symmetryLines: 8,
    kind: 'polygon',
    points: regularPolygonPoints(8, 36),
    defaultRotation: 0,
    fill: '#eab308',
    stroke: '#fef08a',
  },
  {
    id: 'irregular-pentagon',
    name: 'Irregular Pentagon',
    family: 'polygon',
    sides: 5,
    rightAngles: 0,
    parallelPairs: 0,
    equalSideMode: 'none',
    regular: false,
    symmetryLines: 0,
    kind: 'polygon',
    points: '-33,-30 19,-40 42,0 4,36 -35,17',
    defaultRotation: 0,
    fill: '#fb7185',
    stroke: '#ffe4e6',
  },
  {
    id: 'circle',
    name: 'Circle',
    family: 'circle',
    sides: 0,
    rightAngles: 0,
    parallelPairs: 0,
    equalSideMode: 'none',
    regular: false,
    symmetryLines: 999,
    kind: 'circle',
    defaultRotation: 0,
    fill: '#38bdf8',
    stroke: '#dbeafe',
  },
];
const EARLY_SHAPE_IDS = ['square', 'rectangle', 'triangle-equilateral', 'triangle-right', 'circle', 'pentagon'];
const MID_SHAPE_IDS = [
  ...EARLY_SHAPE_IDS,
  'parallelogram',
  'rhombus',
  'trapezium',
  'kite',
  'hexagon',
  'triangle-isosceles',
];

const PROPERTY_POOL: PropertyDefinition[] = [
  { id: 'triangle', label: 'Has 3 sides', minStage: 1, check: (shape) => shape.sides === 3 },
  { id: 'quadrilateral', label: 'Is a quadrilateral', minStage: 1, check: (shape) => shape.sides === 4 },
  { id: 'more-than-4', label: 'Has more than 4 sides', minStage: 2, check: (shape) => shape.sides > 4 },
  { id: 'right-angle', label: 'Has at least one right angle', minStage: 2, check: (shape) => shape.rightAngles > 0 },
  { id: 'two-parallel', label: 'Has 2 pairs of parallel sides', minStage: 4, check: (shape) => shape.parallelPairs === 2 },
  { id: 'one-parallel', label: 'Has exactly 1 pair of parallel sides', minStage: 5, check: (shape) => shape.parallelPairs === 1 },
  { id: 'no-parallel', label: 'Has no parallel sides', minStage: 6, check: (shape) => shape.parallelPairs === 0 },
  {
    id: 'equal-sides',
    label: 'Has all sides equal',
    minStage: 4,
    check: (shape) => shape.equalSideMode === 'all' && shape.family !== 'circle',
  },
  { id: 'regular', label: 'Is a regular polygon', minStage: 6, check: (shape) => shape.regular && shape.family !== 'circle' },
  { id: 'symmetry', label: 'Has at least 2 lines of symmetry', minStage: 6, check: (shape) => shape.symmetryLines >= 2 },
  { id: 'not-polygon', label: 'Is not a polygon', minStage: 8, check: (shape) => shape.family === 'circle' },
];

const SORT_CRITERIA: SortCriterion[] = [
  {
    id: 'sort-right-angle',
    prompt: 'Sort this shape by right angles',
    trueLabel: 'Has right angles',
    falseLabel: 'No right angles',
    minStage: 4,
    check: (shape) => shape.rightAngles > 0,
  },
  {
    id: 'sort-parallel',
    prompt: 'Sort this shape by parallel sides',
    trueLabel: 'Has parallel sides',
    falseLabel: 'No parallel sides',
    minStage: 5,
    check: (shape) => shape.parallelPairs > 0,
  },
  {
    id: 'sort-regular',
    prompt: 'Sort this shape by regularity',
    trueLabel: 'Regular polygon',
    falseLabel: 'Not regular',
    minStage: 7,
    check: (shape) => shape.regular && shape.family !== 'circle',
  },
  {
    id: 'sort-four-equal',
    prompt: 'Sort this shape by side lengths',
    trueLabel: '4 equal sides',
    falseLabel: 'Not 4 equal sides',
    minStage: 8,
    check: (shape) => shape.sides === 4 && shape.equalSideMode === 'all',
  },
];

const roundSecondsForLevel = (level: number) => {
  if (level <= 3) return 90;
  if (level <= 7) return 75;
  return 60;
};

const stageFromProgress = (baseLevel: number, answeredCount: number, timeLeft: number) => {
  const solvedBoost = Math.floor(answeredCount / 4);
  const urgencyBoost = timeLeft <= 15 ? 1 : 0;
  return Math.max(1, Math.min(12, baseLevel + solvedBoost + urgencyBoost));
};

const modeForStage = (stage: number): QuestionMode => {
  const roll = Math.random();
  if (stage <= 3) return roll < 0.8 ? 'name' : 'properties';
  if (stage <= 7) {
    if (roll < 0.45) return 'name';
    if (roll < 0.84) return 'properties';
    return 'sort';
  }
  if (roll < 0.2) return 'name';
  if (roll < 0.62) return 'properties';
  return 'sort';
};

const speedRoundForState = (answeredCount: number, stage: number) => answeredCount > 0 && answeredCount % 7 === 0 && stage >= 5;

const getShapePool = (stage: number) => {
  if (stage <= 3) return SHAPES.filter((shape) => EARLY_SHAPE_IDS.includes(shape.id));
  if (stage <= 7) return SHAPES.filter((shape) => MID_SHAPE_IDS.includes(shape.id));
  return SHAPES;
};

const buildNameQuestion = (shape: ShapeDefinition, stage: number, speedRound: boolean): PolygonQuestion => {
  const pool = getShapePool(stage).filter((item) => item.id !== shape.id);
  const distractors = pickRandom(pool, 3);
  const choices = shuffle([
    { id: `name-${shape.id}`, label: shape.name },
    ...distractors.map((item) => ({ id: `name-${item.id}`, label: item.name })),
  ]);

  const prompts = [
    'What shape is this?',
    'Choose the best name for this shape.',
    'Name this 2D shape.',
  ];

  return {
    id: createId(),
    stage,
    mode: 'name',
    prompt: prompts[randomInt(0, prompts.length - 1)],
    subPrompt: speedRound ? 'Speed round: answer fast for bonus points' : 'Tap one answer',
    shape,
    shapeRotation: randomInt(-20, 20),
    choices,
    correctChoiceIds: [`name-${shape.id}`],
    multiSelect: false,
    difficultyWeight: 35 + (stage * 8),
    speedRound,
    kind: 'fluency',
  };
};

const buildPropertyQuestion = (shape: ShapeDefinition, stage: number, speedRound: boolean): PolygonQuestion | null => {
  const activeProperties = PROPERTY_POOL.filter((property) => (
    stage >= property.minStage && (property.maxStage === undefined || stage <= property.maxStage)
  ));
  const trueProperties = activeProperties.filter((property) => property.check(shape));
  const falseProperties = activeProperties.filter((property) => !property.check(shape));

  if (trueProperties.length === 0 || falseProperties.length < 2) return null;

  const optionCount = speedRound ? 4 : stage <= 3 ? 4 : stage <= 7 ? 5 : 6;
  const targetTrueCount = stage <= 3 ? 1 : stage <= 6 ? 2 : Math.min(3, trueProperties.length);
  const selectedTrue = pickRandom(trueProperties, targetTrueCount);
  const selectedFalse = pickRandom(falseProperties, Math.max(1, optionCount - selectedTrue.length));

  const choices = shuffle([
    ...selectedTrue.map((property) => ({ id: property.id, label: property.label })),
    ...selectedFalse.map((property) => ({ id: property.id, label: property.label })),
  ]).slice(0, optionCount);

  const correctChoiceIds = normalizeAnswers(
    choices
      .filter((choice) => selectedTrue.some((property) => property.id === choice.id))
      .map((choice) => choice.id),
  );

  return {
    id: createId(),
    stage,
    mode: 'properties',
    prompt: 'Select all properties that match this shape.',
    subPrompt: speedRound ? 'Speed round: keep your Combo alive' : 'Some questions can have multiple answers',
    shape,
    shapeRotation: randomInt(-24, 24),
    choices,
    correctChoiceIds,
    multiSelect: true,
    difficultyWeight: 48 + (stage * 10) + (correctChoiceIds.length * 14),
    speedRound,
    kind: 'fluency',
  };
};

const buildSortQuestion = (shape: ShapeDefinition, stage: number, speedRound: boolean): PolygonQuestion => {
  const criteria = SORT_CRITERIA.filter((criterion) => stage >= criterion.minStage);
  const criterion = criteria[randomInt(0, criteria.length - 1)];
  const isTrue = criterion.check(shape);

  return {
    id: createId(),
    stage,
    mode: 'sort',
    prompt: criterion.prompt,
    subPrompt: speedRound ? 'Speed round: sort instantly' : 'Pick the correct category',
    shape,
    shapeRotation: randomInt(-18, 18),
    choices: [
      { id: 'lane-true', label: criterion.trueLabel },
      { id: 'lane-false', label: criterion.falseLabel },
    ],
    correctChoiceIds: [isTrue ? 'lane-true' : 'lane-false'],
    multiSelect: false,
    difficultyWeight: 45 + (stage * 11),
    speedRound,
    kind: 'fluency',
  };
};

const createQuestion = (baseLevel: number, answeredCount: number, timeLeft: number): PolygonQuestion => {
  const stage = stageFromProgress(baseLevel, answeredCount, timeLeft);
  const speedRound = speedRoundForState(answeredCount, stage);
  const mode = modeForStage(stage);
  const shapePool = getShapePool(stage);
  const shape = shapePool[randomInt(0, shapePool.length - 1)];

  if (mode === 'name') return buildNameQuestion(shape, stage, speedRound);
  if (mode === 'sort') return buildSortQuestion(shape, stage, speedRound);
  const propertyQuestion = buildPropertyQuestion(shape, stage, speedRound);
  return propertyQuestion || buildNameQuestion(shape, stage, speedRound);
};

const starsFromPerformance = (XP: number, correctCount: number, attemptCount: number, stage: number) => {
  const accuracy = attemptCount > 0 ? correctCount / attemptCount : 0;
  const target = 1300 + (stage * 170);
  if (XP >= target * 1.2 && accuracy >= 0.8) return 3;
  if (XP >= target * 0.82 && accuracy >= 0.6) return 2;
  return 1;
};
const ShapePreview: React.FC<{
  question: PolygonQuestion;
  pulseTone: 'success' | 'error' | null;
}> = ({ question, pulseTone }) => {
  const { shape, shapeRotation } = question;

  return (
    <motion.svg
      viewBox="-62 -62 124 124"
      className="h-[10.8rem] w-[10.8rem] md:h-[12.4rem] md:w-[12.4rem]"
      initial={{ opacity: 0, scale: 0.93 }}
      animate={{
        opacity: 1,
        scale: 1,
        rotate: shapeRotation + shape.defaultRotation,
      }}
      transition={{ duration: 0.32, ease: 'easeOut' }}
      style={{
        filter: pulseTone === 'success'
          ? 'drop-shadow(0 0 16px rgba(74,222,128,0.65))'
          : pulseTone === 'error'
            ? 'drop-shadow(0 0 14px rgba(251,113,133,0.62))'
            : 'drop-shadow(0 10px 18px rgba(2,6,23,0.45))',
      }}
    >
      <defs>
        <linearGradient id="shapeFill" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor={shape.fill} stopOpacity={0.98} />
          <stop offset="100%" stopColor={shape.fill} stopOpacity={0.62} />
        </linearGradient>
      </defs>

      {shape.kind === 'circle' ? (
        <circle cx="0" cy="0" r="38" fill="url(#shapeFill)" stroke={shape.stroke} strokeWidth="4.2" />
      ) : (
        <polygon points={shape.points} fill="url(#shapeFill)" stroke={shape.stroke} strokeWidth="4.2" />
      )}
    </motion.svg>
  );
};

const PolygonPalaceGame: React.FC<PolygonPalaceGameProps> = ({
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
  const [answeredCount, setAnsweredCount] = useState(0);
  const [roundOver, setRoundOver] = useState(false);
  const [isLocked, setIsLocked] = useState(false);
  const [selectedChoiceIds, setSelectedChoiceIds] = useState<string[]>([]);
  const [pulseTone, setPulseTone] = useState<'success' | 'error' | null>(null);
  const [feedback, setFeedback] = useState<{ tone: 'success' | 'error'; title: string; subtitle: string } | null>(null);
  const [question, setQuestion] = useState<PolygonQuestion>(() => createQuestion(baseLevel, 0, initialRoundSeconds));

  const endedRef = useRef(false);
  const questionStartRef = useRef<number>(Date.now());
  const timeoutsRef = useRef<number[]>([]);

  const clearTimers = () => {
    timeoutsRef.current.forEach((timer) => window.clearTimeout(timer));
    timeoutsRef.current = [];
  };

  useEffect(() => clearTimers, []);

  useEffect(() => {
    clearTimers();
    endedRef.current = false;
    setTimeLeft(initialRoundSeconds);
    setScore(0);
    setStreak(0);
    setAttemptCount(0);
    setCorrectCount(0);
    setAnsweredCount(0);
    setRoundOver(false);
    setIsLocked(false);
    setSelectedChoiceIds([]);
    setPulseTone(null);
    setFeedback(null);
    setQuestion(createQuestion(baseLevel, 0, initialRoundSeconds));
    questionStartRef.current = Date.now();
  }, [baseLevel, initialRoundSeconds]);

  useEffect(() => {
    if (roundOver) return undefined;
    const interval = window.setInterval(() => {
      setTimeLeft((previous) => Math.max(0, previous - 1));
    }, 1000);
    return () => window.clearInterval(interval);
  }, [roundOver]);

  useEffect(() => {
    if (timeLeft > 0 || endedRef.current) return;
    endedRef.current = true;
    setRoundOver(true);
    const finalStage = stageFromProgress(baseLevel, answeredCount, 0);
    const stars = starsFromPerformance(XP, correctCount, attemptCount, finalStage);
    onVictory(stars, XP);
  }, [answeredCount, attemptCount, baseLevel, correctCount, onVictory, XP, timeLeft]);

  const timerProgress = Math.max(0, Math.min(1, timeLeft / initialRoundSeconds));
  const timerFillColor = useMemo(() => {
    const hue = Math.round(timerProgress * 120);
    return `hsl(${hue} 88% 50%)`;
  }, [timerProgress]);

  const loadNextQuestion = useCallback((nextAnsweredCount: number, delayMs: number) => {
    const timer = window.setTimeout(() => {
      if (endedRef.current) return;
      setQuestion(createQuestion(baseLevel, nextAnsweredCount, timeLeft));
      setSelectedChoiceIds([]);
      setFeedback(null);
      setPulseTone(null);
      setIsLocked(false);
      questionStartRef.current = Date.now();
    }, delayMs);
    timeoutsRef.current.push(timer);
  }, [baseLevel, timeLeft]);

  const evaluateSelection = useCallback((rawSelection: string[]) => {
    if (roundOver || isLocked) return;
    setIsLocked(true);

    const nextAttemptCount = attemptCount + 1;
    const nextAnsweredCount = answeredCount + 1;
    const normalizedSelected = normalizeAnswers(rawSelection);
    const normalizedExpected = normalizeAnswers(question.correctChoiceIds);
    const isCorrect = (
      normalizedSelected.length === normalizedExpected.length
      && normalizedExpected.every((value, index) => normalizedSelected[index] === value)
    );

    setAttemptCount(nextAttemptCount);
    setAnsweredCount(nextAnsweredCount);

    if (isCorrect) {
      const elapsedMs = Math.max(240, Date.now() - questionStartRef.current);
      const speedBonus = Math.max(18, Math.round(170 - (elapsedMs / 16)));
      const streakMultiplier = 1 + Math.min(0.95, Combo * 0.08);
      const speedRoundBonus = question.speedRound ? 85 : 0;
      const points = Math.round((120 + question.difficultyWeight + speedBonus + speedRoundBonus) * streakMultiplier);

      triggerHaptic('success');
      setPulseTone('success');
      setScore((prev) => prev + points);
      setCorrectCount((prev) => prev + 1);
      setStreak((prev) => prev + 1);
      setFeedback({
        tone: 'success',
        title: 'Great classify',
        subtitle: `+${points} points`,
      });
      loadNextQuestion(nextAnsweredCount, 330);
      return;
    }

    const correctLabel = question.correctChoiceIds
      .map((choiceId) => question.choices.find((choice) => choice.id === choiceId)?.label || choiceId)
      .join(' • ');

    triggerHaptic('error');
    setPulseTone('error');
    setStreak(0);
    setScore((prev) => Math.max(0, prev - 40));
    setFeedback({
      tone: 'error',
      title: 'Not this one',
      subtitle: `Correct: ${correctLabel}`,
    });
    loadNextQuestion(nextAnsweredCount, 560);
  }, [answeredCount, attemptCount, isLocked, loadNextQuestion, question, roundOver, Combo]);
  const submitProperties = () => {
    if (isLocked || roundOver || question.mode !== 'properties') return;
    if (selectedChoiceIds.length === 0) {
      triggerHaptic('warning');
      setFeedback({
        tone: 'error',
        title: 'Select properties',
        subtitle: 'Pick at least one property before submit.',
      });
      const timeout = window.setTimeout(() => setFeedback(null), 420);
      timeoutsRef.current.push(timeout);
      return;
    }
    evaluateSelection(selectedChoiceIds);
  };

  const onChoiceTap = (choiceId: string) => {
    if (isLocked || roundOver) return;
    if (!question.multiSelect) {
      evaluateSelection([choiceId]);
      return;
    }

    setSelectedChoiceIds((previous) => (
      previous.includes(choiceId)
        ? previous.filter((current) => current !== choiceId)
        : [...previous, choiceId]
    ));
  };


  const topPaddingClass = useSharedTopHud
    ? 'pt-[calc(env(safe-area-inset-top)+5.75rem)]'
    : 'pt-[max(0.5rem,env(safe-area-inset-top))]';

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
        className={`relative z-20 flex h-full w-full flex-col items-center ${topPaddingClass} px-[max(0.75rem,env(safe-area-inset-left))] pb-[max(7.2rem,calc(env(safe-area-inset-bottom)+6.2rem))]`}
      >
        <div className="flex h-full w-full max-w-[30rem] min-h-0 flex-col gap-3">
          <section className="shrink-0 rounded-[1.45rem] border border-cyan-100/18 bg-slate-950/54 p-3 text-center shadow-[0_12px_24px_rgba(2,6,23,0.45)]">
            <div className="text-[10px] font-black uppercase tracking-[0.2em] text-cyan-100/72">
              {question.speedRound ? 'Challenge Round' : 'Polygon Palace'}
            </div>
            <h2 className="game-question-copy mt-1 text-white">{question.prompt}</h2>
            <p className="mt-1 text-[clamp(0.76rem,3.3vw,0.9rem)] font-semibold text-cyan-100/86">{question.subPrompt}</p>
          </section>

          <section className="min-h-0 flex-1 rounded-[1.45rem] border border-cyan-100/18 bg-slate-950/54 p-3 shadow-[0_12px_24px_rgba(2,6,23,0.45)]">
            <div className="relative flex h-full min-h-0 flex-1 items-center justify-center rounded-[1.15rem] border border-cyan-100/16 bg-blue-950/36 p-2">
              <ShapePreview question={question} pulseTone={pulseTone} />
            </div>
          </section>

          <section className="shrink-0 rounded-[1.45rem] border border-cyan-100/18 bg-slate-950/56 p-3 shadow-[0_12px_24px_rgba(2,6,23,0.45)]">
            {question.mode === 'name' ? (
              <div className="grid grid-cols-2 gap-2.5">
                {question.choices.map((choice) => (
                  <button
                    key={choice.id}
                    type="button"
                    disabled={isLocked || roundOver}
                    onClick={() => onChoiceTap(choice.id)}
                    className="ui-button-primary rounded-[1rem] px-2 py-2.5 text-center text-sm font-black disabled:opacity-55"
                  >
                    {choice.label}
                  </button>
                ))}
              </div>
            ) : null}

            {question.mode === 'sort' ? (
              <div className="grid grid-cols-2 gap-2.5">
                {question.choices.map((choice) => (
                  <button
                    key={choice.id}
                    type="button"
                    disabled={isLocked || roundOver}
                    onClick={() => onChoiceTap(choice.id)}
                    className="ui-button-secondary rounded-[1rem] px-2 py-3 text-center text-sm font-black disabled:opacity-55"
                  >
                    {choice.label}
                  </button>
                ))}
              </div>
            ) : null}

            {question.mode === 'properties' ? (
              <div className="grid gap-2.5">
                <div className="grid grid-cols-2 gap-2">
                  {question.choices.map((choice) => {
                    const selected = selectedChoiceIds.includes(choice.id);
                    return (
                      <button
                        key={choice.id}
                        type="button"
                        disabled={isLocked || roundOver}
                        onClick={() => onChoiceTap(choice.id)}
                        className={`rounded-[0.92rem] px-2 py-2 text-left text-[0.77rem] font-bold disabled:opacity-55 ${
                          selected
                            ? 'ui-button-primary'
                            : 'ui-button-secondary'
                        }`}
                      >
                        {choice.label}
                      </button>
                    );
                  })}
                </div>

                <button
                  type="button"
                  disabled={isLocked || roundOver}
                  onClick={submitProperties}
                  className="ui-button-primary rounded-[1rem] py-2.5 text-sm font-black uppercase tracking-[0.14em] disabled:opacity-55"
                >
                  Submit Properties
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

export default PolygonPalaceGame;







