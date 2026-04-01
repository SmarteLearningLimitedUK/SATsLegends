import React, { useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'motion/react';
import {
  emitMiniGameSessionEvent,
  MiniGameShellContractProps,
} from '../app/gameplaySessionContract';
import { GAME_SCENE_META } from '../gameSceneMeta';
import angryBirdBackground from '../assets/angry_birds/background3.png';
import angryBirdSling from '../assets/angry_birds/sling-3.png';
import angryBirdBird from '../assets/angry_birds/red-bird3.png';
import angryBirdPig from '../assets/angry_birds/pig_failed.png';
import angryBirdWood from '../assets/angry_birds/wood.png';
import angryBirdWoodTall from '../assets/angry_birds/wood2.png';
import angryBirdColumn from '../assets/angry_birds/column.png';
import angryBirdStars from '../assets/angry_birds/stars-edited.png';
import angryBirdButtons from '../assets/angry_birds/selected-buttons.png';
import angryBirdWalls from '../assets/angry_birds/walls.png';
import angryBirdZeroGravity from '../assets/angry_birds/gravity-zero.png';
import {
  FeedbackStrip,
  GameTopBar,
  GameUiShell,
  PrimaryButton,
  SecondaryButton,
  StoryCard,
  TaskCard,
} from '../components/game-ui/GameUiKit';

interface SlingShotGameProps {
  levelId: number;
  avatarId: string;
  onVictory: (stars: number, XP: number) => void;
  onGameOver: (XP: number) => void;
  onBack: () => void;
  questionType?: 'fractions' | 'angles';
  interactionMode?: 'drag' | 'select';
}

type SlingShotGameShellProps = SlingShotGameProps & MiniGameShellContractProps;

type Target = {
  id: string;
  label: string;
  value?: number;
  x: number;
  y: number;
  radius: number;
  isCorrect: boolean;
};

type ShotState = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  active: boolean;
};

type BlockKind = 'column' | 'beam';

type Block = {
  id: string;
  kind: BlockKind;
  x: number;
  y: number;
  width: number;
  height: number;
  hp: number;
};

const CANVAS_WIDTH = 900;
const CANVAS_HEIGHT = 520;
const SLING_POS = { x: 130, y: 420 };
const MAX_PULL = 120;
const GRAVITY = 980;
const LAUNCH_SCALE = 4.5;
const ROUNDS_TO_WIN = 5;
const BASE_BIRDS = 4;
const ZERO_GRAVITY_BONUS = 4;

const FRACTIONS = ['1/2', '1/3', '2/3', '3/4', '1/4', '2/5', '4/5', '3/5'];
const ANGLES = [30, 45, 60, 75, 90, 105, 120, 135, 150];
const BIRD_RADIUS = 12;

const pickUnique = (count: number, pool: string[]) => {
  const available = [...pool];
  const chosen: string[] = [];
  while (chosen.length < count && available.length > 0) {
    const index = Math.floor(Math.random() * available.length);
    chosen.push(available.splice(index, 1)[0]);
  }
  return chosen;
};

type AngleChallenge = {
  prompt: string;
  correctAngle: number;
  options: number[];
};

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));
const randomInt = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;

const buildAngleChallenge = (levelId: number): AngleChallenge => {
  const kind = levelId <= 2 ? 'direct' : levelId <= 4 ? 'type' : 'reasoning';
  let correctAngle = ANGLES[randomInt(0, ANGLES.length - 1)];
  let prompt = `Choose the angle of ${correctAngle} degrees.`;

  if (kind === 'type') {
    if (correctAngle < 90) {
      prompt = correctAngle < 50
        ? `Choose the acute angle of ${correctAngle} degrees.`
        : 'Choose an acute angle from the options.';
    } else if (correctAngle === 90) {
      prompt = 'Select the right angle (90 degrees).';
    } else {
      prompt = correctAngle > 130
        ? `Choose the obtuse angle of ${correctAngle} degrees.`
        : 'Pick an obtuse angle from the options.';
    }
  }

  if (kind === 'reasoning') {
    const base = randomInt(25, 145);
    if (levelId % 2 === 0) {
      correctAngle = clamp(180 - base, 10, 170);
      prompt = `The marked angle is ${base} degrees. Choose the angle on the same straight line.`;
    } else {
      const extra = randomInt(10, 40);
      correctAngle = clamp(base + extra, 10, 170);
      prompt = `Choose the angle that is ${extra} degrees more than ${base} degrees.`;
    }
  }

  const optionPool = new Set<number>([correctAngle]);
  const offsets = [10, 15, 20, 25, 30, 35];
  while (optionPool.size < 4) {
    const offset = offsets[randomInt(0, offsets.length - 1)];
    const direction = Math.random() > 0.5 ? 1 : -1;
    optionPool.add(clamp(correctAngle + (offset * direction), 10, 170));
  }
  const options = Array.from(optionPool).sort(() => Math.random() - 0.5).slice(0, 4);

  return { prompt, correctAngle, options };
};

const createTargets = (
  questionType: 'fractions' | 'angles',
  angleChallenge: AngleChallenge | null,
  pigPositions?: { x: number; y: number }[],
) => {
  const options = questionType === 'angles'
    ? (angleChallenge?.options ?? ANGLES.slice(0, 3))
    : pickUnique(3, FRACTIONS);
  const correctIndex = questionType === 'angles'
    ? Math.max(0, options.findIndex((option) => option === angleChallenge?.correctAngle))
    : Math.floor(Math.random() * options.length);
  const fallbackPositions = [
    { x: 560, y: 340 },
    { x: 690, y: 280 },
    { x: 800, y: 360 },
  ];
  const mappedPositions = pigPositions?.map((pos) => ({
    x: mapX(pos.x),
    y: mapY(pos.y),
  })) ?? [];
  const positions = mappedPositions.length >= options.length ? mappedPositions : fallbackPositions;

  return options.map((option, index) => ({
    id: `${option}-${index}`,
    label: questionType === 'angles' ? `${option}°` : option,
    value: questionType === 'angles' ? option : undefined,
    x: positions[index].x,
    y: positions[index].y,
    radius: 26,
    isCorrect: index === correctIndex,
  }));
};

type Layout = {
  pigs: { x: number; y: number }[];
  blocks: Block[];
};

const SCALE_X = 900 / 1200;
const SCALE_Y = 520 / 600;

const mapX = (x: number) => x * SCALE_X;
const mapY = (y: number) => (600 - y) * SCALE_Y;

const addBlock = (blocks: Block[], kind: BlockKind, centerX: number, centerY: number, width: number, height: number, id: string) => {
  const scaledWidth = width * SCALE_X;
  const scaledHeight = height * SCALE_Y;
  blocks.push({
    id,
    kind,
    x: mapX(centerX) - scaledWidth / 2,
    y: mapY(centerY) - scaledHeight / 2,
    width: scaledWidth,
    height: scaledHeight,
    hp: 2,
  });
};

const buildLayouts = (): Layout[] => {
  const layouts: Layout[] = [];

  const open_flat = (blocks: Block[], x: number, y: number, n: number, tag: string) => {
    const y0 = y;
    for (let i = 0; i < n; i += 1) {
      const yi = y0 + 100 + i * 100;
      addBlock(blocks, 'column', x, yi, 20, 85, `${tag}-open-col-${i}-a`);
      addBlock(blocks, 'column', x + 60, yi, 20, 85, `${tag}-open-col-${i}-b`);
      addBlock(blocks, 'beam', x + 30, yi + 50, 85, 20, `${tag}-open-beam-${i}`);
    }
  };

  const closed_flat = (blocks: Block[], x: number, y: number, n: number, tag: string) => {
    const y0 = y;
    for (let i = 0; i < n; i += 1) {
      const yi = y0 + 100 + i * 125;
      addBlock(blocks, 'column', x + 1, yi + 22, 20, 85, `${tag}-closed-col-${i}-a`);
      addBlock(blocks, 'column', x + 60, yi + 22, 20, 85, `${tag}-closed-col-${i}-b`);
      addBlock(blocks, 'beam', x + 30, yi + 70, 85, 20, `${tag}-closed-beam-${i}-top`);
      addBlock(blocks, 'beam', x + 30, yi - 30, 85, 20, `${tag}-closed-beam-${i}-bottom`);
    }
  };

  const horizontal_pile = (blocks: Block[], x: number, y: number, n: number, tag: string) => {
    let yy = y + 70;
    for (let i = 0; i < n; i += 1) {
      addBlock(blocks, 'beam', x, yy + i * 20, 85, 20, `${tag}-h-${i}`);
    }
  };

  const vertical_pile = (blocks: Block[], x: number, y: number, n: number, tag: string) => {
    let yy = y + 10;
    for (let i = 0; i < n; i += 1) {
      addBlock(blocks, 'column', x, yy + 85 + i * 85, 20, 85, `${tag}-v-${i}`);
    }
  };

  const make = (builder: (blocks: Block[], pigs: { x: number; y: number }[]) => void) => {
    const blocks: Block[] = [];
    const pigs: { x: number; y: number }[] = [];
    builder(blocks, pigs);
    layouts.push({ blocks, pigs });
  };

  // build_0
  make((blocks, pigs) => {
    pigs.push({ x: 980, y: 100 }, { x: 985, y: 182 });
    addBlock(blocks, 'column', 950, 80, 20, 85, 'b0-col-1');
    addBlock(blocks, 'column', 1010, 80, 20, 85, 'b0-col-2');
    addBlock(blocks, 'beam', 980, 150, 85, 20, 'b0-beam-1');
    addBlock(blocks, 'column', 950, 200, 20, 85, 'b0-col-3');
    addBlock(blocks, 'column', 1010, 200, 20, 85, 'b0-col-4');
    addBlock(blocks, 'beam', 980, 240, 85, 20, 'b0-beam-2');
  });

  // build_1
  make((blocks, pigs) => {
    pigs.push({ x: 1000, y: 100 });
    addBlock(blocks, 'column', 900, 80, 20, 85, 'b1-col-1');
    addBlock(blocks, 'column', 850, 80, 20, 85, 'b1-col-2');
    addBlock(blocks, 'column', 850, 150, 20, 85, 'b1-col-3');
    addBlock(blocks, 'column', 1050, 150, 20, 85, 'b1-col-4');
    addBlock(blocks, 'beam', 1105, 210, 85, 20, 'b1-beam-1');
  });

  // build_2
  make((blocks, pigs) => {
    pigs.push({ x: 880, y: 180 }, { x: 1000, y: 230 });
    addBlock(blocks, 'column', 880, 80, 20, 85, 'b2-col-1');
    addBlock(blocks, 'beam', 880, 150, 85, 20, 'b2-beam-1');
    addBlock(blocks, 'column', 1000, 80, 20, 85, 'b2-col-2');
    addBlock(blocks, 'column', 1000, 180, 20, 85, 'b2-col-3');
    addBlock(blocks, 'beam', 1000, 210, 85, 20, 'b2-beam-2');
  });

  // build_3
  make((blocks, pigs) => {
    pigs.push({ x: 950, y: 320 }, { x: 885, y: 225 }, { x: 1005, y: 225 });
    addBlock(blocks, 'column', 1100, 100, 20, 85, 'b3-col-1');
    addBlock(blocks, 'beam', 1070, 152, 85, 20, 'b3-beam-1');
    addBlock(blocks, 'column', 1040, 100, 20, 85, 'b3-col-2');
    addBlock(blocks, 'column', 980, 100, 20, 85, 'b3-col-3');
    addBlock(blocks, 'column', 920, 100, 20, 85, 'b3-col-4');
    addBlock(blocks, 'beam', 950, 152, 85, 20, 'b3-beam-2');
    addBlock(blocks, 'beam', 1010, 180, 85, 20, 'b3-beam-3');
    addBlock(blocks, 'column', 860, 100, 20, 85, 'b3-col-5');
    addBlock(blocks, 'column', 800, 100, 20, 85, 'b3-col-6');
    addBlock(blocks, 'beam', 830, 152, 85, 20, 'b3-beam-4');
    addBlock(blocks, 'beam', 890, 180, 85, 20, 'b3-beam-5');
    addBlock(blocks, 'column', 860, 223, 20, 85, 'b3-col-7');
    addBlock(blocks, 'column', 920, 223, 20, 85, 'b3-col-8');
    addBlock(blocks, 'column', 980, 223, 20, 85, 'b3-col-9');
    addBlock(blocks, 'column', 1040, 223, 20, 85, 'b3-col-10');
    addBlock(blocks, 'beam', 890, 280, 85, 20, 'b3-beam-6');
    addBlock(blocks, 'beam', 1010, 280, 85, 20, 'b3-beam-7');
    addBlock(blocks, 'beam', 950, 300, 85, 20, 'b3-beam-8');
    addBlock(blocks, 'column', 920, 350, 20, 85, 'b3-col-11');
    addBlock(blocks, 'column', 980, 350, 20, 85, 'b3-col-12');
    addBlock(blocks, 'beam', 950, 400, 85, 20, 'b3-beam-9');
  });

  // build_4
  make((blocks, pigs) => {
    pigs.push({ x: 900, y: 300 }, { x: 1000, y: 500 }, { x: 1100, y: 400 });
  });

  // build_5
  make((blocks, pigs) => {
    pigs.push({ x: 900, y: 70 }, { x: 1000, y: 152 });
    for (let i = 0; i < 9; i += 1) {
      addBlock(blocks, 'beam', 800, 70 + i * 21, 85, 20, `b5-beam-left-${i}`);
    }
    for (let i = 0; i < 4; i += 1) {
      addBlock(blocks, 'beam', 1000, 70 + i * 21, 85, 20, `b5-beam-right-${i}`);
    }
    addBlock(blocks, 'column', 970, 176, 20, 85, 'b5-col-1');
    addBlock(blocks, 'column', 1026, 176, 20, 85, 'b5-col-2');
    addBlock(blocks, 'beam', 1000, 230, 85, 20, 'b5-beam-top');
  });

  // build_6
  make((blocks, pigs) => {
    pigs.push({ x: 920, y: 533 }, { x: 820, y: 533 }, { x: 720, y: 633 });
    closed_flat(blocks, 895, 423, 1, 'b6');
    vertical_pile(blocks, 900, 0, 5, 'b6-v1');
    vertical_pile(blocks, 926, 0, 5, 'b6-v2');
    vertical_pile(blocks, 950, 0, 5, 'b6-v3');
  });

  // build_7
  make((blocks, pigs) => {
    pigs.push({ x: 978, y: 180 }, { x: 978, y: 280 }, { x: 978, y: 80 });
    open_flat(blocks, 950, 0, 3, 'b7-open');
    vertical_pile(blocks, 850, 0, 3, 'b7-v1');
    vertical_pile(blocks, 830, 0, 3, 'b7-v2');
  });

  // build_8
  make((blocks, pigs) => {
    pigs.push({ x: 1000, y: 180 }, { x: 1078, y: 280 }, { x: 900, y: 80 });
    open_flat(blocks, 1050, 0, 3, 'b8-open1');
    open_flat(blocks, 963, 0, 2, 'b8-open2');
    open_flat(blocks, 880, 0, 1, 'b8-open3');
  });

  // build_9
  make((blocks, pigs) => {
    pigs.push({ x: 1000, y: 180 }, { x: 900, y: 180 });
    open_flat(blocks, 1050, 0, 3, 'b9-open1');
    open_flat(blocks, 963, 0, 2, 'b9-open2');
    open_flat(blocks, 880, 0, 2, 'b9-open3');
    open_flat(blocks, 790, 0, 3, 'b9-open4');
  });

  // build_10
  make((blocks, pigs) => {
    pigs.push({ x: 960, y: 250 }, { x: 820, y: 160 }, { x: 1100, y: 160 });
    vertical_pile(blocks, 900, 0, 3, 'b10-v1');
    vertical_pile(blocks, 930, 0, 3, 'b10-v2');
    vertical_pile(blocks, 1000, 0, 3, 'b10-v3');
    vertical_pile(blocks, 1030, 0, 3, 'b10-v4');
    horizontal_pile(blocks, 970, 250, 2, 'b10-h1');
    horizontal_pile(blocks, 820, 0, 4, 'b10-h2');
    horizontal_pile(blocks, 1100, 0, 4, 'b10-h3');
  });

  // build_11
  make((blocks, pigs) => {
    pigs.push({ x: 820, y: 177 }, { x: 960, y: 150 }, { x: 1100, y: 130 }, { x: 890, y: 270 });
    horizontal_pile(blocks, 800, 0, 5, 'b11-h1');
    horizontal_pile(blocks, 950, 0, 3, 'b11-h2');
    horizontal_pile(blocks, 1100, 0, 2, 'b11-h3');
    vertical_pile(blocks, 745, 0, 2, 'b11-v1');
    vertical_pile(blocks, 855, 0, 2, 'b11-v2');
    vertical_pile(blocks, 900, 0, 2, 'b11-v3');
    vertical_pile(blocks, 1000, 0, 2, 'b11-v4');
    addBlock(blocks, 'beam', 875, 230, 85, 20, 'b11-beam');
  });

  return layouts;
};

const LEVEL_LAYOUTS = buildLayouts();

const circleRectCollision = (cx: number, cy: number, radius: number, rect: Block) => {
  const closestX = Math.max(rect.x, Math.min(cx, rect.x + rect.width));
  const closestY = Math.max(rect.y, Math.min(cy, rect.y + rect.height));
  const dx = cx - closestX;
  const dy = cy - closestY;
  return (dx * dx + dy * dy) <= radius * radius;
};

const SlingShotGame: React.FC<SlingShotGameShellProps> = ({
  levelId,
  onVictory,
  onGameOver,
  onBack,
  sessionState,
  sessionEvents,
  questionType = 'fractions',
  interactionMode = 'drag',
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number | null>(null);
  const [assetsReady, setAssetsReady] = useState(0);
  const imageAssets = useMemo(() => ({
    background: new Image(),
    sling: new Image(),
    bird: new Image(),
    pig: new Image(),
    wood: new Image(),
    woodTall: new Image(),
    column: new Image(),
    stars: new Image(),
    buttons: new Image(),
    walls: new Image(),
    zeroGravity: new Image(),
  }), []);
  const initialAngleChallenge = questionType === 'angles' ? buildAngleChallenge(levelId) : null;
  const initialLayout = LEVEL_LAYOUTS[0];
  const [roundSolved, setRoundSolved] = useState(0);
  const [attempts, setAttempts] = useState(0);
  const [angleChallenge, setAngleChallenge] = useState<AngleChallenge | null>(initialAngleChallenge);
  const [targets, setTargets] = useState<Target[]>(
    () => createTargets(questionType, initialAngleChallenge, initialLayout?.pigs),
  );
  const [blocks, setBlocks] = useState<Block[]>(() => initialLayout?.blocks ?? []);
  const [shot, setShot] = useState<ShotState>({
    x: SLING_POS.x,
    y: SLING_POS.y,
    vx: 0,
    vy: 0,
    active: false,
  });
  const [dragging, setDragging] = useState(false);
  const [dragPoint, setDragPoint] = useState<{ x: number; y: number } | null>(null);
  const [feedback, setFeedback] = useState('Pull back the sling and aim for the correct fraction.');
  const [feedbackTone, setFeedbackTone] = useState<'neutral' | 'success' | 'warning'>('neutral');
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [showRules, setShowRules] = useState(false);
  const [locked, setLocked] = useState(false);
  const [selectedAngle, setSelectedAngle] = useState<number | null>(null);
  const [forcedTargetId, setForcedTargetId] = useState<string | null>(null);
  const blocksRef = useRef<Block[]>(blocks);
  const [zeroGravity, setZeroGravity] = useState(false);
  const [wallEnabled, setWallEnabled] = useState(false);
  const [birdsRemaining, setBirdsRemaining] = useState(BASE_BIRDS);
  const [paused, setPaused] = useState(false);
  const endedRef = useRef(false);

  useEffect(() => {
    blocksRef.current = blocks;
  }, [blocks]);

  const correctTarget = useMemo(
    () => targets.find((target) => target.isCorrect),
    [targets],
  );

  const roundsToWin = ROUNDS_TO_WIN + Math.floor((levelId - 1) / 3);

  useEffect(() => {
    endedRef.current = false;
    const nextAngleChallenge = questionType === 'angles' ? buildAngleChallenge(levelId) : null;
    setAngleChallenge(nextAngleChallenge);
    const nextLayout = LEVEL_LAYOUTS[0];
    const nextTargets = createTargets(questionType, nextAngleChallenge, nextLayout?.pigs);
    setTargets(nextTargets);
    setBlocks(nextLayout?.blocks ?? []);
    setRoundSolved(0);
    setAttempts(0);
    setShot({
      x: SLING_POS.x,
      y: SLING_POS.y,
      vx: 0,
      vy: 0,
      active: false,
    });
    setSelectedAngle(null);
    setForcedTargetId(null);
    setPaused(false);
    setBirdsRemaining(zeroGravity ? BASE_BIRDS + ZERO_GRAVITY_BONUS : BASE_BIRDS);
    setFeedback(questionType === 'angles'
      ? 'Choose the correct angle to fire the sling.'
      : 'Pull back the sling and aim for the correct fraction.');
    setFeedbackTone('neutral');
    setLocked(false);
  }, [levelId, questionType, zeroGravity]);

  useEffect(() => {
    if (!sessionState) return;
    if (sessionState.lives <= 0 || sessionState.timeLeft <= 0) {
      emitMiniGameSessionEvent(sessionEvents, 'game_failed', {
        XP: roundSolved * 120,
        reason: sessionState.timeLeft <= 0 ? 'time_up' : 'no_lives',
      });
      onGameOver(roundSolved * 120);
    }
  }, [onGameOver, roundSolved, sessionEvents, sessionState]);

  const resetShot = () => {
    setShot({
      x: SLING_POS.x,
      y: SLING_POS.y,
      vx: 0,
      vy: 0,
      active: false,
    });
    setDragging(false);
    setDragPoint(null);
    setForcedTargetId(null);
  };

  const checkOutOfBirds = (score: number) => {
    if (endedRef.current) return;
    if (birdsRemaining > 0) return;
    if (roundSolved >= roundsToWin) return;
    endedRef.current = true;
    emitMiniGameSessionEvent(sessionEvents, 'game_failed', {
      XP: score,
      reason: 'no_birds',
    });
    onGameOver(score);
  };

  const advanceRound = (wasCorrect: boolean) => {
    const nextSolved = wasCorrect ? roundSolved + 1 : roundSolved;
    setRoundSolved(nextSolved);
    const nextAngleChallenge = questionType === 'angles' ? buildAngleChallenge(levelId) : null;
    setAngleChallenge(nextAngleChallenge);
    const nextLayout = LEVEL_LAYOUTS[nextSolved % LEVEL_LAYOUTS.length];
    const nextTargets = createTargets(questionType, nextAngleChallenge, nextLayout?.pigs);
    setTargets(nextTargets);
    setBlocks(nextLayout?.blocks ?? []);
    resetShot();
    setLocked(false);
    setSelectedAngle(null);
    setForcedTargetId(null);
    setBirdsRemaining(zeroGravity ? BASE_BIRDS + ZERO_GRAVITY_BONUS : BASE_BIRDS);

    if (wasCorrect) {
      emitMiniGameSessionEvent(sessionEvents, 'correct_answer', {
        XP: nextSolved * 120,
      });
    } else {
      emitMiniGameSessionEvent(sessionEvents, 'incorrect_answer', {
        XP: nextSolved * 120,
      });
    }

    if (wasCorrect && nextSolved >= roundsToWin) {
      const stars = nextSolved >= roundsToWin ? 3 : 2;
      endedRef.current = true;
      emitMiniGameSessionEvent(sessionEvents, 'game_complete', {
        XP: nextSolved * 120,
        stars,
      });
      onVictory(stars, nextSolved * 120);
    }
  };

  const handleHit = (target: Target) => {
    if (locked) return;
    setLocked(true);
    setAttempts((prev) => prev + 1);

    if (target.isCorrect) {
      setFeedback('Direct hit! Nice aim.');
      setFeedbackTone('success');
      emitMiniGameSessionEvent(sessionEvents, 'puzzle_complete', {
        XP: (roundSolved + 1) * 120,
      });
      window.setTimeout(() => advanceRound(true), 700);
    } else {
      setFeedback(questionType === 'angles' ? 'That was the wrong angle. Try again.' : 'That was the wrong fraction. Try again.');
      setFeedbackTone('warning');
      checkOutOfBirds(roundSolved * 120);
      window.setTimeout(() => advanceRound(false), 650);
    }
  };

  const stepPhysics = (delta: number) => {
    if (!shot.active) return;
    const dt = Math.min(0.032, delta / 1000);
    const gravityScale = zeroGravity ? 0.12 : 1;
    setShot((prev) => {
      const nextVx = prev.vx;
      const nextVy = prev.vy + GRAVITY * gravityScale * dt;
      const nextX = prev.x + nextVx * dt;
      const nextY = prev.y + nextVy * dt;

      const hitTarget = targets.find((target) => {
        const dx = nextX - target.x;
        const dy = nextY - target.y;
        return Math.hypot(dx, dy) <= target.radius + 12;
      });

      if (hitTarget && (!forcedTargetId || hitTarget.id === forcedTargetId)) {
        handleHit(hitTarget);
        return { ...prev, x: nextX, y: nextY, active: false };
      }

      const blockHit = blocksRef.current.find((block) => circleRectCollision(nextX, nextY, BIRD_RADIUS, block));
      if (blockHit) {
        setBlocks((current) => current
          .map((block) => (block.id === blockHit.id ? { ...block, hp: block.hp - 1 } : block))
          .filter((block) => block.hp > 0));
        const bounceVx = prev.vx * 0.55;
        const bounceVy = -prev.vy * 0.4;
        return {
          ...prev,
          x: nextX,
          y: nextY,
          vx: bounceVx,
          vy: bounceVy,
        };
      }

      if (nextY > CANVAS_HEIGHT + 80 || nextX > CANVAS_WIDTH + 80 || nextX < -80) {
        if (!locked) {
          setFeedback(questionType === 'angles' ? 'Missed! Try another angle.' : 'Missed! Pull back and try again.');
          setFeedbackTone('warning');
          emitMiniGameSessionEvent(sessionEvents, 'incorrect_answer', {
            XP: roundSolved * 120,
          });
        }
        setForcedTargetId(null);
        checkOutOfBirds(roundSolved * 120);
        return { ...prev, x: SLING_POS.x, y: SLING_POS.y, vx: 0, vy: 0, active: false };
      }

      if (wallEnabled && nextX > CANVAS_WIDTH - 24) {
        return { ...prev, x: CANVAS_WIDTH - 24, y: nextY, vx: -Math.abs(nextVx) * 0.6, vy: nextVy };
      }
      if (wallEnabled && nextX < 24) {
        return { ...prev, x: 24, y: nextY, vx: Math.abs(nextVx) * 0.6, vy: nextVy };
      }

      return {
        ...prev,
        x: nextX,
        y: nextY,
        vx: nextVx,
        vy: nextVy,
      };
    });
  };

  useEffect(() => {
    const tick = (timestamp: number) => {
      if (lastTimeRef.current === null) {
        lastTimeRef.current = timestamp;
      }
      const delta = timestamp - lastTimeRef.current;
      lastTimeRef.current = timestamp;
      if (!paused) {
        stepPhysics(delta);
      }
      animationRef.current = requestAnimationFrame(tick);
    };

    animationRef.current = requestAnimationFrame(tick);
    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
      animationRef.current = null;
      lastTimeRef.current = null;
    };
  });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    if (imageAssets.background.complete) {
      ctx.drawImage(imageAssets.background, 0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    } else {
      ctx.fillStyle = 'rgba(15, 23, 42, 0.3)';
      ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    }

    ctx.strokeStyle = 'rgba(148, 163, 184, 0.45)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(40, 444);
    ctx.lineTo(860, 444);
    ctx.stroke();

    if (wallEnabled && imageAssets.walls.complete) {
      ctx.drawImage(imageAssets.walls, CANVAS_WIDTH - 70, 80, 60, 360);
    }

    const starsEarned = roundsToWin > 0
      ? (roundSolved / roundsToWin >= 0.9 ? 3 : roundSolved / roundsToWin >= 0.6 ? 2 : roundSolved / roundsToWin >= 0.3 ? 1 : 0)
      : 0;

    if (imageAssets.stars.complete) {
      const starRects = [
        { sx: 0, sy: 0, sw: 200, sh: 200 },
        { sx: 204, sy: 0, sw: 200, sh: 200 },
        { sx: 426, sy: 0, sw: 200, sh: 200 },
      ];
      starRects.forEach((rect, index) => {
        ctx.globalAlpha = starsEarned > index ? 1 : 0.35;
        ctx.drawImage(imageAssets.stars, rect.sx, rect.sy, rect.sw, rect.sh, 18 + index * 46, 16, 40, 40);
      });
      ctx.globalAlpha = 1;
    }

    if (imageAssets.buttons.complete) {
      ctx.drawImage(imageAssets.buttons, 164, 10, 60, 60, 18, 66, 32, 32);
    }

    if (imageAssets.bird.complete) {
      const birdSize = 26;
      const maxIcons = Math.min(6, birdsRemaining);
      for (let i = 0; i < maxIcons; i += 1) {
        ctx.drawImage(imageAssets.bird, 18 + i * 26, CANVAS_HEIGHT - 54, birdSize, birdSize);
      }
    }

    if (zeroGravity && imageAssets.zeroGravity.complete) {
      ctx.drawImage(imageAssets.zeroGravity, 60, 12, 48, 48);
    }

    blocksRef.current.forEach((block) => {
      const sprite = block.kind === 'column'
        ? imageAssets.column
        : block.height > 22
          ? imageAssets.woodTall
          : imageAssets.wood;
      if (sprite.complete) {
        ctx.drawImage(sprite, block.x, block.y, block.width, block.height);
      } else {
        ctx.fillStyle = 'rgba(125, 211, 252, 0.35)';
        ctx.fillRect(block.x, block.y, block.width, block.height);
      }
    });

    targets.forEach((target) => {
      if (imageAssets.pig.complete) {
        const size = target.radius * 2.1;
        ctx.drawImage(imageAssets.pig, target.x - size / 2, target.y - size / 2, size, size);
      } else {
        ctx.fillStyle = target.isCorrect ? 'rgba(52, 211, 153, 0.8)' : 'rgba(56, 189, 248, 0.8)';
        ctx.beginPath();
        ctx.arc(target.x, target.y, target.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = 'rgba(255,255,255,0.7)';
        ctx.lineWidth = 2;
        ctx.stroke();
      }

      ctx.fillStyle = '#0f172a';
      ctx.font = 'bold 16px Nunito, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(target.label, target.x, target.y + (target.radius + 18));
    });

    const shotX = dragging && dragPoint ? dragPoint.x : shot.x;
    const shotY = dragging && dragPoint ? dragPoint.y : shot.y;

    if (dragging && dragPoint) {
      ctx.strokeStyle = 'rgba(203, 213, 225, 0.6)';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(SLING_POS.x, SLING_POS.y);
      ctx.lineTo(dragPoint.x, dragPoint.y);
      ctx.stroke();
    }

    if (imageAssets.sling.complete) {
      const slingWidth = 120;
      const slingHeight = 180;
      ctx.drawImage(
        imageAssets.sling,
        SLING_POS.x - slingWidth * 0.45,
        SLING_POS.y - slingHeight * 0.8,
        slingWidth,
        slingHeight,
      );
    }

    ctx.strokeStyle = 'rgba(15, 23, 42, 0.85)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(SLING_POS.x - 12, SLING_POS.y - 42);
    ctx.lineTo(shotX, shotY);
    ctx.moveTo(SLING_POS.x + 12, SLING_POS.y - 42);
    ctx.lineTo(shotX, shotY);
    ctx.stroke();

    if (imageAssets.bird.complete) {
      const birdSize = 32;
      ctx.drawImage(imageAssets.bird, shotX - birdSize / 2, shotY - birdSize / 2, birdSize, birdSize);
    } else {
      ctx.fillStyle = 'rgba(248, 113, 113, 0.9)';
      ctx.beginPath();
      ctx.arc(shotX, shotY, 12, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,0.6)';
      ctx.stroke();
    }
  }, [assetsReady, dragPoint, dragging, shot, targets, imageAssets]);

  const handlePointerDown = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (paused) return;
    if (interactionMode === 'select') return;
    if (shot.active || locked) return;
    if (birdsRemaining <= 0) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width) * CANVAS_WIDTH;
    const y = ((event.clientY - rect.top) / rect.height) * CANVAS_HEIGHT;
    const dx = x - SLING_POS.x;
    const dy = y - SLING_POS.y;
    if (Math.hypot(dx, dy) > MAX_PULL + 18) return;

    setDragging(true);
    setDragPoint({ x, y });
  };

  const handlePointerMove = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (paused) return;
    if (interactionMode === 'select') return;
    if (!dragging) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const rawX = ((event.clientX - rect.left) / rect.width) * CANVAS_WIDTH;
    const rawY = ((event.clientY - rect.top) / rect.height) * CANVAS_HEIGHT;
    const dx = rawX - SLING_POS.x;
    const dy = rawY - SLING_POS.y;
    const distance = Math.hypot(dx, dy);
    if (distance <= MAX_PULL) {
      setDragPoint({ x: rawX, y: rawY });
      return;
    }
    const scale = MAX_PULL / distance;
    setDragPoint({ x: SLING_POS.x + dx * scale, y: SLING_POS.y + dy * scale });
  };

  const handlePointerUp = () => {
    if (paused) return;
    if (interactionMode === 'select') return;
    if (!dragging || !dragPoint) return;
    if (birdsRemaining <= 0) return;
    const dx = SLING_POS.x - dragPoint.x;
    const dy = SLING_POS.y - dragPoint.y;
    const vx = dx * LAUNCH_SCALE;
    const vy = dy * LAUNCH_SCALE;
    setDragging(false);
    setDragPoint(null);
    setBirdsRemaining((prev) => Math.max(0, prev - 1));
    setShot({
      x: SLING_POS.x,
      y: SLING_POS.y,
      vx,
      vy,
      active: true,
    });
    setFeedback(questionType === 'angles'
      ? 'Watch the sling and see which target you hit.'
      : 'Watch the arc and see which fraction you hit.');
    setFeedbackTone('neutral');
  };

  const fireAtAngle = (angleChoice: number) => {
    if (paused) return;
    if (interactionMode !== 'select') return;
    if (shot.active || locked) return;
    if (birdsRemaining <= 0) return;
    const target = targets.find((candidate) => candidate.value === angleChoice);
    if (!target) return;

    setSelectedAngle(angleChoice);
    const dx = target.x - SLING_POS.x;
    const dy = target.y - SLING_POS.y;
    const travelTime = 0.9;
    const gravityScale = zeroGravity ? 0.12 : 1;
    const vx = dx / travelTime;
    const vy = (dy - 0.5 * GRAVITY * gravityScale * travelTime * travelTime) / travelTime;
    setBirdsRemaining((prev) => Math.max(0, prev - 1));
    setShot({
      x: SLING_POS.x,
      y: SLING_POS.y,
      vx,
      vy,
      active: true,
    });
    setForcedTargetId(target.id);
    setFeedback('Launching...');
    setFeedbackTone('neutral');
  };

  useEffect(() => {
    const images = [
      { img: imageAssets.background, src: angryBirdBackground },
      { img: imageAssets.sling, src: angryBirdSling },
      { img: imageAssets.bird, src: angryBirdBird },
      { img: imageAssets.pig, src: angryBirdPig },
      { img: imageAssets.wood, src: angryBirdWood },
      { img: imageAssets.woodTall, src: angryBirdWoodTall },
      { img: imageAssets.column, src: angryBirdColumn },
      { img: imageAssets.stars, src: angryBirdStars },
      { img: imageAssets.buttons, src: angryBirdButtons },
      { img: imageAssets.walls, src: angryBirdWalls },
      { img: imageAssets.zeroGravity, src: angryBirdZeroGravity },
    ];
    images.forEach(({ img, src }) => {
      if (img.src !== src) {
        img.src = src;
      }
    });

    const handleLoad = () => setAssetsReady((prev) => prev + 1);
    images.forEach(({ img }) => {
      if (img.complete) return;
      img.addEventListener('load', handleLoad);
    });
    return () => {
      images.forEach(({ img }) => img.removeEventListener('load', handleLoad));
    };
  }, [imageAssets]);

  return (
    <GameUiShell
      backgroundImage={questionType === 'angles' ? angryBirdBackground : GAME_SCENE_META.angle_arena.background}
    >
      <div className="flex h-full min-h-0 flex-col gap-2 px-3 pb-[calc(env(safe-area-inset-bottom)+4rem)] pt-3 text-white">
        <section className="shrink-0">
          <GameTopBar
            onBack={onBack}
            progressLabel={`Round ${Math.min(roundSolved + 1, roundsToWin)} / ${roundsToWin}`}
            lives={sessionState?.lives}
            className="mx-auto w-full max-w-[780px]"
            audioEnabled={audioEnabled}
            onToggleAudio={() => setAudioEnabled((prev) => !prev)}
            onHelp={() => setShowRules(true)}
          />
        </section>

        <section className="shrink-0 flex items-center justify-center gap-2">
          <SecondaryButton onClick={() => setPaused((prev) => !prev)} disabled={locked}>
            {paused ? 'Resume' : 'Pause'}
          </SecondaryButton>
          <SecondaryButton onClick={() => setZeroGravity((prev) => !prev)} disabled={locked}>
            {zeroGravity ? 'Gravity On' : 'Zero Gravity'}
          </SecondaryButton>
          <SecondaryButton onClick={() => setWallEnabled((prev) => !prev)} disabled={locked}>
            {wallEnabled ? 'Wall Off' : 'Wall On'}
          </SecondaryButton>
        </section>

        <section className="shrink-0">
          <StoryCard className="mx-auto max-w-[780px]">
            <p className="text-[clamp(13px,2vh,18px)] font-semibold text-white/90">
              {questionType === 'angles'
                ? 'The castle ranger needs the correct launch angle for the signal.'
                : 'A village ranger needs the right supply crate delivered.'}
            </p>
          </StoryCard>
        </section>

        <section className="shrink-0">
          <TaskCard className="mx-auto w-full max-w-[780px]">
            <div className="text-[10px] font-black uppercase tracking-[0.18em] text-amber-900/80">Task Card</div>
            <div className="mt-1 text-[clamp(15px,2.2vh,20px)] font-black">
              {questionType === 'angles' ? 'Choose the correct angle' : 'Hit the correct fraction'}
            </div>
            <div className="mt-2 rounded-[1rem] border border-amber-200/35 bg-white/80 px-3 py-2 text-slate-900">
              <div className="text-[10px] font-black uppercase tracking-[0.14em] text-amber-900/70">Target</div>
              <div className="mt-1 text-lg font-black text-slate-900">
                {questionType === 'angles'
                  ? (angleChallenge?.prompt ?? 'Choose the correct angle.')
                  : (correctTarget?.label ?? '—')}
              </div>
            </div>
          </TaskCard>
        </section>

        <section className="min-h-0 flex-1">
          <div className="mx-auto flex h-full w-full max-w-[900px] items-center justify-center rounded-[1.6rem] border border-white/12 bg-slate-950/20 shadow-[0_16px_30px_rgba(15,23,42,0.2)]">
            <canvas
              ref={canvasRef}
              width={CANVAS_WIDTH}
              height={CANVAS_HEIGHT}
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onPointerLeave={handlePointerUp}
              className="h-full w-full touch-none rounded-[1.6rem]"
            />
          </div>
        </section>

        <section className="shrink-0">
          <FeedbackStrip
            tone={feedbackTone}
            className="mx-auto w-full max-w-[780px]"
          >
            {feedback}
          </FeedbackStrip>
        </section>

        <section className="shrink-0">
          {interactionMode === 'select' && questionType === 'angles' ? (
            <div className="mx-auto grid w-full max-w-[780px] grid-rows-[auto_auto] gap-2">
              <div className="text-center text-[10px] font-black uppercase tracking-[0.14em] text-cyan-100 md:text-[11px]">
                Choose the angle to fire
              </div>
              <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
                {(angleChallenge?.options ?? []).map((option) => (
                  <button
                    key={option}
                    type="button"
                    onClick={() => fireAtAngle(option)}
                    disabled={shot.active || locked}
                    className="inline-flex min-h-[2.6rem] items-center justify-center rounded-full border border-cyan-100/32 bg-[linear-gradient(180deg,rgba(14,116,144,0.55),rgba(15,23,42,0.85))] px-3 py-2 text-[0.78rem] font-black uppercase tracking-[0.12em] text-cyan-50 shadow-[0_10px_18px_rgba(2,6,23,0.4)] transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-55 md:min-h-[3rem] md:text-sm"
                  >
                    {option}°
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="mx-auto flex w-full max-w-[780px] items-center gap-2">
              <PrimaryButton
                onClick={resetShot}
                disabled={shot.active || locked}
                className="flex-1"
              >
                Reset Sling
              </PrimaryButton>
              <SecondaryButton onClick={resetShot} disabled={shot.active || locked}>
                Reset
              </SecondaryButton>
            </div>
          )}
        </section>
      </div>
    </GameUiShell>
  );
};

export default SlingShotGame;
