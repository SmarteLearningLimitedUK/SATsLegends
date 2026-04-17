import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  emitMiniGameSessionEvent,
  MiniGameShellContractProps,
} from '../app/gameplaySessionContract';
import { triggerHaptic } from '../haptics';
import {
  FeedbackStrip,
  GameTopBar,
  GameUiShell,
  PrimaryButton,
  SecondaryButton,
  GameQuestionCard,
} from '../components/game-ui/GameUiKit';
import GameScreenLayout from '../components/game-ui/GameScreenLayout';
import cannonFacingLeftSrc from '../assets/angle_arena/cannonanglearena/1.png';
import cannonFacingRightSrc from '../assets/angle_arena/cannonanglearena/2.png';
import cannonFacingUpSrc from '../assets/angle_arena/cannonanglearena/3.png';
import enemyGoblinSrc from '../assets/bosses/goblin.png';
import enemyGoblinWizardSrc from '../assets/bosses/goblinwiz.jpg';
import enemyKrakenSrc from '../assets/bosses/gemini-2.5-flash-image_in_the_same_aesthetic_create_me_a_kracken-1.jpg';
import enemyZombie0Src from '../assets/bosses/gemini-2.5-flash-image_in_the_same_aesthetic_create_me_a_zombie-0.jpg';
import enemyZombie1Src from '../assets/bosses/gemini-2.5-flash-image_in_the_same_aesthetic_create_me_a_zombie-1.jpg';
import enemySnakeSrc from '../assets/bosses/gemini-2.5-flash-image_in_the_same_aesthetic_but_different_colours_create_me_a_snake-2.jpg';
import { buildAngleQuestions, AngleQuestion } from './angleArena/questions';
import { angleToVector, clamp, degreesToRadians, distance, lerp, worldToScreen } from './angleArena/math';

interface AngleArenaGameProps {
  levelId: number;
  avatarId: string;
  onVictory: (stars: number, XP: number) => void;
  onGameOver: (XP: number) => void;
  onBack: () => void;
}

type AngleArenaGameShellProps = AngleArenaGameProps & MiniGameShellContractProps;

type GameState =
  | 'intro'
  | 'awaitingAnswer'
  | 'aiming'
  | 'firing'
  | 'projectileFlight'
  | 'resolvedCorrect'
  | 'resolvedIncorrect'
  | 'levelComplete'
  | 'gameOver';

type ImpactResult = 'hit' | 'miss';

type ProjectileState = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  active: boolean;
  trail: { x: number; y: number; alpha: number }[];
};

const AIM_DELAY = 360;
const HIT_SHAKE_DURATION = 520;
const PROJECTILE_RADIUS = 10;
const TARGET_RADIUS = 34;
const INITIAL_TIMER = 90;
const INITIAL_LIVES = 3;
const POINTS_PER_HIT = 250;
const WORLD_RADIUS = 720;
const ENEMY_DISTANCE = 520;
const CAMERA_LERP = 0.08;
const RETURN_LERP = 0.12;
const PROJECTILE_SPEED = 520;
const MAX_FLIGHT_DISTANCE = 980;
const CANNON_ANCHOR_X_RATIO = 0.5;
const CANNON_ANCHOR_Y_RATIO = 0.58;

type CloudLayer = {
  x: number;
  y: number;
  scale: number;
  speed: number;
  alpha: number;
};

const ANGLE_CLOUDS: CloudLayer[] = [
  { x: 40, y: 0.16, scale: 1.12, speed: 0.45, alpha: 0.68 },
  { x: 220, y: 0.12, scale: 0.92, speed: 0.28, alpha: 0.52 },
  { x: 420, y: 0.18, scale: 1.28, speed: 0.36, alpha: 0.62 },
  { x: 680, y: 0.24, scale: 0.82, speed: 0.22, alpha: 0.48 },
  { x: 940, y: 0.14, scale: 1.05, speed: 0.31, alpha: 0.58 },
  { x: 1180, y: 0.21, scale: 1.34, speed: 0.18, alpha: 0.66 },
];

const drawCloud = (
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  scale: number,
  alpha: number,
) => {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = 'rgba(255,255,255,0.98)';
  ctx.shadowColor = 'rgba(255,255,255,0.3)';
  ctx.shadowBlur = 18 * scale;
  ctx.beginPath();
  ctx.ellipse(x, y, 54 * scale, 26 * scale, 0, 0, Math.PI * 2);
  ctx.ellipse(x + (28 * scale), y - (16 * scale), 42 * scale, 24 * scale, 0, 0, Math.PI * 2);
  ctx.ellipse(x + (62 * scale), y, 58 * scale, 28 * scale, 0, 0, Math.PI * 2);
  ctx.ellipse(x + (22 * scale), y + (10 * scale), 38 * scale, 20 * scale, 0, 0, Math.PI * 2);
  ctx.ellipse(x + (72 * scale), y + (10 * scale), 42 * scale, 20 * scale, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
};

const drawSkyBackground = (ctx: CanvasRenderingContext2D, width: number, height: number, timestamp: number) => {
  const sky = ctx.createLinearGradient(0, 0, 0, height);
  sky.addColorStop(0, '#cfefff');
  sky.addColorStop(0.42, '#8fd7ff');
  sky.addColorStop(0.72, '#5db2ee');
  sky.addColorStop(1, '#2d6cb8');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, width, height);

  ctx.fillStyle = 'rgba(255, 242, 175, 0.24)';
  ctx.beginPath();
  ctx.arc(width * 0.8, height * 0.14, Math.min(width, height) * 0.11, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = 'rgba(255,255,255,0.08)';
  ctx.fillRect(0, height * 0.75, width, height * 0.25);

  const wrapWidth = width + 280;
  ANGLE_CLOUDS.forEach((cloud, index) => {
    const drift = ((timestamp * 0.012 * cloud.speed) % wrapWidth) - 140;
    const baseX = cloud.x + drift;
    const y = height * cloud.y + Math.sin((timestamp * 0.00045) + index) * 5;
    drawCloud(ctx, baseX, y, cloud.scale, cloud.alpha);
  });
};

const drawRoundedRectPath = (
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) => {
  const radius = Math.max(0, Math.min(r, w / 2, h / 2));
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + w, y, x + w, y + h, radius);
  ctx.arcTo(x + w, y + h, x, y + h, radius);
  ctx.arcTo(x, y + h, x, y, radius);
  ctx.arcTo(x, y, x + w, y, radius);
  ctx.closePath();
};

type CannonSpriteKey = 'left' | 'right' | 'up';

type CannonSprites = Partial<Record<CannonSpriteKey, CanvasImageSource>>;

const CANNON_BASELINE_DEG: Record<CannonSpriteKey, number> = {
  left: 155,
  right: 25,
  up: 90,
};

const toPositiveAngle = (angleDeg: number) => ((angleDeg % 360) + 360) % 360;

const pickCannonSpriteKey = (angleDeg: number): CannonSpriteKey => {
  const angle = toPositiveAngle(angleDeg);
  const dir = angleToVector(angle);
  if (Math.abs(dir.y) >= Math.abs(dir.x) * 0.92) return 'up';
  return dir.x >= 0 ? 'right' : 'left';
};

const alphaKeyNearWhite = (img: HTMLImageElement, threshold = 240, saturationBand = 35) => {
  const canvas = document.createElement('canvas');
  canvas.width = img.naturalWidth || img.width;
  canvas.height = img.naturalHeight || img.height;
  const ctx = canvas.getContext('2d');
  if (!ctx || !canvas.width || !canvas.height) return img;

  ctx.drawImage(img, 0, 0);
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imageData.data;
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const brightness = (r + g + b) / 3;
    const lowSaturation = max - min <= saturationBand;

    if (brightness >= threshold && lowSaturation) {
      data[i + 3] = 0;
    }
  }
  ctx.putImageData(imageData, 0, 0);
  return canvas;
};

const drawCannonVector = (ctx: CanvasRenderingContext2D, angleDeg: number) => {
  ctx.save();
  ctx.rotate(-degreesToRadians(angleDeg));

  ctx.fillStyle = 'rgba(2,6,23,0.22)';
  ctx.beginPath();
  ctx.ellipse(-12, 34, 66, 14, 0, 0, Math.PI * 2);
  ctx.fill();

  // Base (simple cannon carriage)
  ctx.fillStyle = '#0f172a';
  drawRoundedRectPath(ctx, -44, 18, 72, 28, 14);
  ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.12)';
  drawRoundedRectPath(ctx, -40, 22, 64, 8, 8);
  ctx.fill();

  // Barrel
  const barrelGradient = ctx.createLinearGradient(-6, -10, 88, -10);
  barrelGradient.addColorStop(0, '#1f2937');
  barrelGradient.addColorStop(0.5, '#374151');
  barrelGradient.addColorStop(1, '#111827');
  ctx.fillStyle = barrelGradient;
  drawRoundedRectPath(ctx, -6, -12, 96, 24, 12);
  ctx.fill();

  ctx.fillStyle = 'rgba(255,255,255,0.18)';
  drawRoundedRectPath(ctx, 0, -8, 78, 6, 6);
  ctx.fill();

  // Muzzle rim
  ctx.fillStyle = '#0b1224';
  ctx.beginPath();
  ctx.ellipse(90, 0, 13, 12, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = 'rgba(148,163,184,0.5)';
  ctx.beginPath();
  ctx.ellipse(90, 0, 7, 6.5, 0, 0, Math.PI * 2);
  ctx.fill();

  // Pivot bolt
  ctx.fillStyle = '#0b1224';
  ctx.beginPath();
  ctx.arc(-6, 0, 10, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#cbd5e1';
  ctx.beginPath();
  ctx.arc(-6, 0, 4.5, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
};

const drawCannonSprite = (
  ctx: CanvasRenderingContext2D,
  angleDeg: number,
  sprites: CannonSprites,
  sizePx: number,
) => {
  const spriteKey = pickCannonSpriteKey(angleDeg);
  const image = sprites[spriteKey];
  if (!image) {
    drawCannonVector(ctx, angleDeg);
    return;
  }

  const normalizedAngle = toPositiveAngle(angleDeg);
  const baselineAngle = CANNON_BASELINE_DEG[spriteKey];

  ctx.save();
  ctx.rotate(degreesToRadians(baselineAngle - normalizedAngle));

  ctx.globalAlpha = 0.22;
  ctx.fillStyle = 'rgba(2,6,23,0.9)';
  ctx.beginPath();
  ctx.ellipse(-8, sizePx * 0.26, sizePx * 0.34, sizePx * 0.08, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.globalAlpha = 1;
  const anchorX = sizePx * 0.5;
  const anchorY = sizePx * 0.66;
  ctx.drawImage(image, -anchorX, -anchorY, sizePx, sizePx);
  ctx.restore();
};

type EnemyPlatform = 'podium' | 'cloud';

const drawEnemyPlatform = (ctx: CanvasRenderingContext2D, platform: EnemyPlatform, sizePx: number) => {
  if (platform === 'cloud') {
    const scale = Math.max(0.65, Math.min(1.25, sizePx / 220));
    drawCloud(ctx, 0, sizePx * 0.38, scale, 0.86);
    return;
  }

  ctx.save();
  ctx.translate(0, sizePx * 0.36);
  ctx.fillStyle = 'rgba(2,6,23,0.3)';
  ctx.beginPath();
  ctx.ellipse(0, sizePx * 0.22, sizePx * 0.42, sizePx * 0.12, 0, 0, Math.PI * 2);
  ctx.fill();

  const pedestalGradient = ctx.createLinearGradient(0, -sizePx * 0.35, 0, sizePx * 0.45);
  pedestalGradient.addColorStop(0, 'rgba(148,163,184,0.55)');
  pedestalGradient.addColorStop(0.55, 'rgba(71,85,105,0.72)');
  pedestalGradient.addColorStop(1, 'rgba(15,23,42,0.9)');
  ctx.fillStyle = pedestalGradient;
  drawRoundedRectPath(ctx, -sizePx * 0.42, -sizePx * 0.18, sizePx * 0.84, sizePx * 0.34, sizePx * 0.14);
  ctx.fill();

  ctx.fillStyle = 'rgba(255,255,255,0.16)';
  drawRoundedRectPath(ctx, -sizePx * 0.38, -sizePx * 0.14, sizePx * 0.76, sizePx * 0.08, sizePx * 0.08);
  ctx.fill();
  ctx.restore();
};

const drawEnemyPortrait = (ctx: CanvasRenderingContext2D, image: HTMLImageElement, sizePx: number) => {
  if (!image.complete) return;
  const diameter = sizePx * 0.62;
  const radius = diameter / 2;

  ctx.save();
  ctx.shadowColor = 'rgba(2,6,23,0.65)';
  ctx.shadowBlur = 18;
  ctx.shadowOffsetY = 10;
  ctx.beginPath();
  ctx.arc(0, 0, radius, 0, Math.PI * 2);
  ctx.closePath();
  ctx.fillStyle = 'rgba(15,23,42,0.35)';
  ctx.fill();
  ctx.restore();

  ctx.save();
  ctx.beginPath();
  ctx.arc(0, 0, radius, 0, Math.PI * 2);
  ctx.closePath();
  ctx.clip();

  const iw = image.naturalWidth || image.width;
  const ih = image.naturalHeight || image.height;
  const scale = Math.max(diameter / iw, diameter / ih);
  const dw = iw * scale;
  const dh = ih * scale;
  ctx.drawImage(image, -dw / 2, -dh / 2, dw, dh);
  ctx.restore();

  ctx.save();
  ctx.strokeStyle = 'rgba(226,232,240,0.9)';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(0, 0, radius, 0, Math.PI * 2);
  ctx.stroke();

  ctx.strokeStyle = 'rgba(56,189,248,0.5)';
  ctx.lineWidth = 8;
  ctx.beginPath();
  ctx.arc(0, 0, radius + 6, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
};

const formatTime = (seconds: number) => {
  const clamped = Math.max(0, Math.floor(seconds));
  const mins = Math.floor(clamped / 60);
  const secs = clamped % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

// Angle convention: 0° = right, 90° = up, 180° = left, 270° = down.
// Uses screen-space Y axis (down is positive), so we invert Y in vector conversion.
const buildProjectile = (angleDeg: number, speed: number): ProjectileState => {
  const dir = angleToVector(angleDeg);
  return {
    x: 0,
    y: 0,
    vx: dir.x * speed,
    vy: dir.y * speed,
    active: true,
    trail: [],
  };
};

const stepProjectile = (projectile: ProjectileState, dt: number) => {
  if (!projectile.active) return projectile;
  const nextX = projectile.x + projectile.vx * (dt / 1000);
  const nextY = projectile.y + projectile.vy * (dt / 1000);
  const trail = [...projectile.trail, { x: nextX, y: nextY, alpha: 1 }].slice(-18);
  const faded = trail.map((point, index) => ({
    ...point,
    alpha: (index + 1) / trail.length,
  }));
  return { ...projectile, x: nextX, y: nextY, trail: faded };
};

const AngleArenaGame: React.FC<AngleArenaGameShellProps> = ({
  levelId,
  useSharedTopHud: _useSharedTopHud = true,
  onVictory,
  onGameOver,
  onBack,
  sessionState,
  sessionEvents,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationRef = useRef<number | null>(null);
  const lastFrameRef = useRef<number | null>(null);
  const hitShakeRef = useRef<number | null>(null);
  const desiredAngleRef = useRef(40);
  const selectedAnswerRef = useRef<number | null>(null);
  const cameraRef = useRef({ x: 0, y: 0 });
  const cameraTargetRef = useRef({ x: 0, y: 0 });
  const settleTimeoutRef = useRef<number | null>(null);
  const autoAdvanceTimeoutRef = useRef<number | null>(null);
  const projectileRef = useRef<ProjectileState | null>(null);
  const impactResultRef = useRef<ImpactResult | null>(null);
  const impactPositionRef = useRef({ x: 0, y: 0 });
  const aimTimeoutRef = useRef<number | null>(null);
  const cannonSpritesRef = useRef<CannonSprites>({});
  const enemySpritesRef = useRef<HTMLImageElement[]>([]);

  const [gameState, setGameState] = useState<GameState>('intro');
  const [questionIndex, setQuestionIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [feedback, setFeedback] = useState('');
  const [score, setScore] = useState(0);
  const [localLives, setLocalLives] = useState(INITIAL_LIVES);
  const [localTimer, setLocalTimer] = useState(INITIAL_TIMER);
  const [stars, setStars] = useState(0);

  const rawQuestions = useMemo(
    () => buildAngleQuestions({
      level: levelId,
      launcherX: 0,
      groundY: 0,
      gravity: 0,
    }),
    [levelId],
  );
  const questions = useMemo(() => rawQuestions, [rawQuestions]);
  const activeQuestion = questions[questionIndex];

  const lives = sessionState?.lives ?? localLives;
  const timeLeft = sessionState?.timeLeft ?? localTimer;
  const totalTime = sessionState?.totalTime ?? INITIAL_TIMER;

  useEffect(() => {
    setGameState('awaitingAnswer');
  }, []);

  useEffect(() => {
    if (sessionState) return;
    setLocalTimer(INITIAL_TIMER);
    const interval = window.setInterval(() => {
      setLocalTimer((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => window.clearInterval(interval);
  }, [sessionState]);

  useEffect(() => {
    if (!sessionState) return;
    if (sessionState.timeLeft <= 0 || sessionState.lives <= 0) {
      setGameState('gameOver');
      emitMiniGameSessionEvent(sessionEvents, 'game_failed', {
        score,
        reason: sessionState.timeLeft <= 0 ? 'time' : 'lives',
      });
      onGameOver(score);
    }
  }, [onGameOver, score, sessionEvents, sessionState]);

  useEffect(() => {
    if (sessionState) return;
    if (timeLeft <= 0 || lives <= 0) {
      setGameState('gameOver');
      onGameOver(score);
    }
  }, [lives, onGameOver, score, sessionState, timeLeft]);

  useEffect(() => {
    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
      if (aimTimeoutRef.current) window.clearTimeout(aimTimeoutRef.current);
      if (settleTimeoutRef.current) window.clearTimeout(settleTimeoutRef.current);
      if (autoAdvanceTimeoutRef.current) window.clearTimeout(autoAdvanceTimeoutRef.current);
    };
  }, []);

  useEffect(() => {
    const load = (key: CannonSpriteKey, src: string) => {
      const img = new Image();
      img.src = src;
      img.onload = () => {
        const processed = alphaKeyNearWhite(img);
        cannonSpritesRef.current = { ...cannonSpritesRef.current, [key]: processed };
      };
    };
    load('left', cannonFacingLeftSrc);
    load('right', cannonFacingRightSrc);
    load('up', cannonFacingUpSrc);
  }, []);

  useEffect(() => {
    const sources = [
      enemyGoblinSrc,
      enemyGoblinWizardSrc,
      enemyKrakenSrc,
      enemyZombie0Src,
      enemyZombie1Src,
      enemySnakeSrc,
    ];
    sources.forEach((src, index) => {
      const img = new Image();
      img.src = src;
      img.onload = () => {
        const next = [...enemySpritesRef.current];
        next[index] = img;
        enemySpritesRef.current = next;
      };
    });
  }, []);

  const resetForNext = () => {
    setSelectedAnswer(null);
    setFeedback('');
    impactResultRef.current = null;
    projectileRef.current = null;
    cameraRef.current = { x: 0, y: 0 };
    cameraTargetRef.current = { x: 0, y: 0 };
    setGameState('awaitingAnswer');
  };

  const finishLevel = (finalScore: number) => {
    const earnedStars = Math.min(3, Math.max(1, Math.floor(finalScore / 450)));
    setStars(earnedStars);
    setGameState('levelComplete');
    emitMiniGameSessionEvent(sessionEvents, 'game_complete', {
      score: finalScore,
      stars: earnedStars,
      metadata: {
        correct: finalScore / POINTS_PER_HIT,
      },
    });
    onVictory(earnedStars, finalScore);
  };

  const handleResolve = (result: ImpactResult) => {
    if (impactResultRef.current) return;
    impactResultRef.current = result;
    cameraTargetRef.current = impactPositionRef.current;
    if (settleTimeoutRef.current) window.clearTimeout(settleTimeoutRef.current);
    settleTimeoutRef.current = window.setTimeout(() => {
      cameraTargetRef.current = { x: 0, y: 0 };
    }, 680);

    if (result === 'hit') {
      const nextScore = score + POINTS_PER_HIT;
      setScore(nextScore);
      setStars(Math.min(3, Math.max(stars, Math.floor(nextScore / 450))));
      setFeedback('Direct hit!');
      triggerHaptic('success');
      emitMiniGameSessionEvent(sessionEvents, 'correct_answer', {
        score: nextScore,
        metadata: {
          questionId: activeQuestion?.id,
          selected: selectedAnswerRef.current,
        },
      });
      setGameState('resolvedCorrect');
    } else {
      const correctAngle = activeQuestion?.correctAnswer;
      setFeedback(`Missed! Correct angle: ${correctAngle ?? '--'}°`);
      triggerHaptic('error');
      emitMiniGameSessionEvent(sessionEvents, 'incorrect_answer', {
        score,
        metadata: {
          questionId: activeQuestion?.id,
          selected: selectedAnswerRef.current,
        },
      });
      if (!sessionState) {
        setLocalLives((prev) => Math.max(0, prev - 1));
      }
      setGameState('resolvedIncorrect');
    }

    if (result === 'hit') {
      hitShakeRef.current = performance.now() + HIT_SHAKE_DURATION;
    }
  };

  const fireProjectile = (angleDeg?: number) => {
    if (!activeQuestion) return;
    const resolvedAngle = Number.isFinite(angleDeg) ? (angleDeg as number) : desiredAngleRef.current;
    const speed = activeQuestion.launchSpeed || PROJECTILE_SPEED;
    projectileRef.current = buildProjectile(resolvedAngle, speed);
    cameraTargetRef.current = { x: 0, y: 0 };
    setGameState('projectileFlight');
  };

  const handleAnswer = (answer: number) => {
    if (gameState !== 'awaitingAnswer' || !activeQuestion) return;
    selectedAnswerRef.current = answer;
    setSelectedAnswer(answer);
    setFeedback('');
    desiredAngleRef.current = answer;
    setGameState('aiming');
    if (aimTimeoutRef.current) window.clearTimeout(aimTimeoutRef.current);
    aimTimeoutRef.current = window.setTimeout(() => {
      setGameState('firing');
      fireProjectile(answer);
    }, AIM_DELAY);
  };

  useEffect(() => {
    if (selectedAnswer) {
      desiredAngleRef.current = selectedAnswer;
      selectedAnswerRef.current = selectedAnswer;
    }
  }, [selectedAnswer]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const resizeCanvas = () => {
      const parent = canvas.parentElement;
      if (!parent) return;
      const { width, height } = parent.getBoundingClientRect();
      canvas.width = Math.max(1, Math.floor(width * window.devicePixelRatio));
      canvas.height = Math.max(1, Math.floor(height * window.devicePixelRatio));
    };
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    return () => window.removeEventListener('resize', resizeCanvas);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const draw = (timestamp: number) => {
      if (lastFrameRef.current === null) lastFrameRef.current = timestamp;
      const delta = timestamp - lastFrameRef.current;
      lastFrameRef.current = timestamp;

      const viewWidth = canvas.width / window.devicePixelRatio;
      const viewHeight = canvas.height / window.devicePixelRatio;

      if (projectileRef.current?.active) {
        projectileRef.current = stepProjectile(projectileRef.current, delta);
      }

      const projectile = projectileRef.current;
      const correctAnswer = activeQuestion?.correctAnswer ?? 0;
      const enemyAngle = ((correctAnswer % 360) + 360) % 360;
      const allowHit = selectedAnswerRef.current === correctAnswer;
      const enemyRadius = ENEMY_DISTANCE + (activeQuestion?.id ? (activeQuestion.id % 3) * 40 : 0);
      const enemyVector = angleToVector(enemyAngle);
      const enemyWorld = { x: enemyVector.x * enemyRadius, y: enemyVector.y * enemyRadius };

      if (projectile?.active) {
        const hit = allowHit && distance(projectile.x, projectile.y, enemyWorld.x, enemyWorld.y) <= TARGET_RADIUS + PROJECTILE_RADIUS;
        if (hit) {
          projectile.active = false;
          impactPositionRef.current = { ...enemyWorld };
          handleResolve('hit');
        }

        const flightDistance = Math.hypot(projectile.x, projectile.y);
        if (projectile.active && flightDistance > MAX_FLIGHT_DISTANCE) {
          projectile.active = false;
          impactPositionRef.current = { x: projectile.x, y: projectile.y };
          handleResolve('miss');
        }
      }

      if (projectile?.active) {
        cameraTargetRef.current = { x: projectile.x, y: projectile.y };
      }

      const camera = cameraRef.current;
      const followStrength = projectile?.active ? CAMERA_LERP : RETURN_LERP;
      camera.x = lerp(camera.x, cameraTargetRef.current.x, followStrength);
      camera.y = lerp(camera.y, cameraTargetRef.current.y, followStrength);
      camera.x = clamp(camera.x, -WORLD_RADIUS, WORLD_RADIUS);
      camera.y = clamp(camera.y, -WORLD_RADIUS, WORLD_RADIUS);

      let shakeX = 0;
      let shakeY = 0;
      if (hitShakeRef.current && timestamp < hitShakeRef.current) {
        const phase = (hitShakeRef.current - timestamp) / HIT_SHAKE_DURATION;
        const strength = 4 * phase;
        shakeX = Math.sin(timestamp * 0.04) * strength;
        shakeY = Math.cos(timestamp * 0.05) * strength;
      }

      ctx.save();
      ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
      ctx.translate(shakeX, shakeY);
      ctx.clearRect(0, 0, viewWidth, viewHeight);

      const cannonAnchor = { x: viewWidth * CANNON_ANCHOR_X_RATIO, y: viewHeight * CANNON_ANCHOR_Y_RATIO };
      const originBase = worldToScreen(0, 0, camera.x, camera.y, viewWidth, viewHeight);
      const screenOffset = { x: cannonAnchor.x - originBase.x, y: cannonAnchor.y - originBase.y };
      const toScreen = (x: number, y: number) => {
        const base = worldToScreen(x, y, camera.x, camera.y, viewWidth, viewHeight);
        return { x: base.x + screenOffset.x, y: base.y + screenOffset.y };
      };

      const originScreen = cannonAnchor;
      const enemyScreen = toScreen(enemyWorld.x, enemyWorld.y);

      ctx.strokeStyle = 'rgba(148,163,184,0.4)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(originScreen.x, originScreen.y, WORLD_RADIUS * 0.35, 0, Math.PI * 2);
      ctx.stroke();

      if ((gameState === 'aiming' || gameState === 'awaitingAnswer') && selectedAnswerRef.current !== null) {
        const aimingAngle = selectedAnswerRef.current ?? desiredAngleRef.current;
        const aimVector = angleToVector(aimingAngle);
        const aimEndWorld = { x: aimVector.x * 160, y: aimVector.y * 160 };
        const aimEndScreen = toScreen(aimEndWorld.x, aimEndWorld.y);
        ctx.strokeStyle = 'rgba(125,211,252,0.8)';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(originScreen.x, originScreen.y);
        ctx.lineTo(aimEndScreen.x, aimEndScreen.y);
        ctx.stroke();
        ctx.fillStyle = 'rgba(125,211,252,0.9)';
        ctx.beginPath();
        ctx.arc(aimEndScreen.x, aimEndScreen.y, 6, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.save();
      ctx.translate(originScreen.x, originScreen.y + 6);
      drawCannonSprite(ctx, desiredAngleRef.current, cannonSpritesRef.current, Math.min(viewWidth, viewHeight) * 0.22);
      ctx.restore();

      ctx.save();
      ctx.translate(enemyScreen.x, enemyScreen.y);
      const enemySize = Math.min(viewWidth, viewHeight) * 0.26;
      const platform: EnemyPlatform = (questionIndex + (activeQuestion?.id ?? 0)) % 2 === 0 ? 'podium' : 'cloud';
      drawEnemyPlatform(ctx, platform, enemySize);

      const enemies = enemySpritesRef.current;
      const enemyIndex = enemies.length ? (questionIndex % enemies.length) : 0;
      const enemy = enemies[enemyIndex];
      if (enemy) {
        ctx.save();
        ctx.translate(0, -enemySize * 0.12);
        drawEnemyPortrait(ctx, enemy, enemySize);
        ctx.restore();
      } else {
        ctx.fillStyle = 'rgba(250,204,21,0.85)';
        ctx.beginPath();
        ctx.arc(0, -enemySize * 0.1, enemySize * 0.12, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();

      if (projectile) {
        projectile.trail.forEach((point) => {
          const trailScreen = toScreen(point.x, point.y);
          ctx.fillStyle = `rgba(125,211,252,${0.35 * point.alpha})`;
          ctx.beginPath();
          ctx.arc(trailScreen.x, trailScreen.y, 6 * point.alpha, 0, Math.PI * 2);
          ctx.fill();
        });

        const projectileScreen = toScreen(projectile.x, projectile.y);
        ctx.fillStyle = '#f8fafc';
        ctx.beginPath();
        ctx.arc(projectileScreen.x, projectileScreen.y, PROJECTILE_RADIUS, 0, Math.PI * 2);
        ctx.fill();
      }

      if (impactResultRef.current === 'hit') {
        ctx.fillStyle = 'rgba(250,204,21,0.45)';
        ctx.beginPath();
        ctx.arc(enemyScreen.x, enemyScreen.y, 34, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.restore();

      animationRef.current = requestAnimationFrame(draw);
    };

    animationRef.current = requestAnimationFrame(draw);
    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
      animationRef.current = null;
    };
  }, [activeQuestion, gameState, selectedAnswer]);

  const handleNext = () => {
    if (gameState !== 'resolvedCorrect' && gameState !== 'resolvedIncorrect') return;
    if (gameState === 'resolvedIncorrect' && !sessionState && lives <= 0) {
      setGameState('gameOver');
      onGameOver(score);
      return;
    }
    if (questionIndex >= questions.length - 1) {
      finishLevel(score + (gameState === 'resolvedCorrect' ? 0 : 0));
      return;
    }
    setQuestionIndex((prev) => prev + 1);
    resetForNext();
  };

  useEffect(() => {
    if (gameState !== 'resolvedCorrect' && gameState !== 'resolvedIncorrect') {
      if (autoAdvanceTimeoutRef.current) window.clearTimeout(autoAdvanceTimeoutRef.current);
      autoAdvanceTimeoutRef.current = null;
      return;
    }

    if (autoAdvanceTimeoutRef.current) window.clearTimeout(autoAdvanceTimeoutRef.current);
    autoAdvanceTimeoutRef.current = window.setTimeout(() => {
      handleNext();
    }, 900);
  }, [gameState]);

  const showPromptAndAnswers = gameState === 'awaitingAnswer';

  return (
    <GameUiShell className="bg-transparent !bg-none ![background-image:none] ![background-color:transparent]" overlayDisabled>
      <div className="relative h-full w-full overflow-hidden text-white">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 z-0 bg-[linear-gradient(180deg,#bfeaff_0%,#7dd3fc_36%,#60a5fa_66%,#1e3a8a_100%)]"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 z-0 bg-[radial-gradient(circle_at_14%_16%,rgba(255,255,255,0.75),transparent_22%),radial-gradient(circle_at_36%_10%,rgba(255,255,255,0.55),transparent_18%),radial-gradient(circle_at_72%_18%,rgba(255,255,255,0.62),transparent_24%),radial-gradient(circle_at_86%_14%,rgba(255,255,255,0.45),transparent_18%)] opacity-70"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute left-1/2 top-[58%] z-0 -translate-x-1/2 -translate-y-1/2"
        >
          <div className="relative h-[8.25rem] w-[19rem] rounded-[999px] bg-[radial-gradient(ellipse_at_center,rgba(34,197,94,0.9),rgba(21,128,61,0.95)_55%,rgba(15,23,42,0.0)_72%)]">
            <div className="absolute inset-0 rounded-[999px] bg-[radial-gradient(circle_at_30%_35%,rgba(253,230,138,0.22),transparent_30%),radial-gradient(circle_at_70%_45%,rgba(167,243,208,0.18),transparent_36%)]" />
            <div className="absolute inset-x-6 bottom-6 h-8 rounded-[999px] bg-[linear-gradient(180deg,rgba(74,222,128,0.55),rgba(21,128,61,0.0))] blur-[0.5px]" />
          </div>
        </div>
        <canvas
          ref={canvasRef}
          className="absolute inset-0 z-10 h-full w-full"
         />
        <GameScreenLayout
          className="relative z-20 px-3 pb-[calc(env(safe-area-inset-bottom)+0.6rem)] pt-2"
          topClassName="flex flex-col items-center gap-2 px-0 pt-[calc(env(safe-area-inset-top)+0.15rem)]"
          top={(
            <div className="flex flex-col gap-1.5">
              <GameTopBar
                onBack={onBack}
                progressLabel={`Question ${questionIndex + 1} / ${questions.length}`}
                lives={lives}
                audioEnabled
                className="w-full"
              />

              <div className="relative z-20 w-full">
                <div className="mx-auto w-full">
                  <GameQuestionCard
                    title="Angle Arena"
                    subtitle="Choose the angle, then fire."
                  >
                    {activeQuestion?.prompt ?? 'Choose the correct launch angle.'}
                  </GameQuestionCard>
                </div>
              </div>
            </div>
          )}
          main={<div className="min-h-0 flex-1" />}
          bottom={(
            <div className="flex flex-col gap-2">
              <div className={`w-full transition-all duration-300 ${showPromptAndAnswers ? 'max-h-[320px] opacity-100' : 'pointer-events-none max-h-0 opacity-0'}`}>
                <div className="mx-auto grid w-full max-w-[44rem] grid-cols-4 gap-1.5">
                  {(activeQuestion?.options ?? []).map((option) => (
                    <button
                      key={option}
                      type="button"
                      onClick={() => handleAnswer(option)}
                      disabled={gameState !== 'awaitingAnswer'}
                      className="ui-button-primary inline-flex min-h-[2.8rem] items-center justify-center rounded-[1rem] px-2 py-2 text-[clamp(11px,1.6vh,15px)] font-black whitespace-nowrap disabled:cursor-not-allowed disabled:opacity-55"
                    >
                      {option}°
                    </button>
                  ))}
                </div>
                {selectedAnswer !== null ? (
                  <div className="mt-1 text-center text-[11px] font-bold uppercase tracking-[0.16em] text-cyan-100/80">
                    Selected angle: {selectedAnswer}°
                  </div>
                ) : null}
              </div>
              <FeedbackStrip className="w-full" tone={gameState === 'resolvedCorrect' ? 'success' : gameState === 'resolvedIncorrect' ? 'warning' : 'neutral'}>
                {feedback || (selectedAnswer !== null ? `Angle ${selectedAnswer}° locked in.` : 'Choose an angle to fire the launcher.')}
              </FeedbackStrip>
              {gameState === 'resolvedCorrect' || gameState === 'resolvedIncorrect' ? (
                <div className="flex w-full items-center gap-2">
                  <PrimaryButton onClick={handleNext} className="flex-1">
                    Next
                  </PrimaryButton>
                  <SecondaryButton onClick={resetForNext}>
                    Reset View
                  </SecondaryButton>
                </div>
              ) : null}
            </div>
          )}
        />
      </div>
    </GameUiShell>
  );
};

export default AngleArenaGame;



