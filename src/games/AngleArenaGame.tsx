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
import { BOSS_ASSETS } from '../assets/bosses';
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

const drawCannon = (ctx: CanvasRenderingContext2D, angleDeg: number) => {
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
  const bossImageRef = useRef<HTMLImageElement | null>(null);
  const bossProcessedRef = useRef<HTMLCanvasElement | null>(null);
  const projectileRef = useRef<ProjectileState | null>(null);
  const impactResultRef = useRef<ImpactResult | null>(null);
  const impactPositionRef = useRef({ x: 0, y: 0 });
  const aimTimeoutRef = useRef<number | null>(null);

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
      launcherX: 0,
      groundY: 0,
      gravity: 0,
    }),
    [],
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
    const bossImage = BOSS_ASSETS.croc_boss?.poses?.neutral || BOSS_ASSETS.croc_boss?.poses?.attack;
    if (!bossImage) return;
    const img = new Image();
    img.src = bossImage;
    bossImageRef.current = img;
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      ctx.drawImage(img, 0, 0);
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imageData.data;
      for (let i = 0; i < data.length; i += 4) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        if (r > 245 && g > 245 && b > 245) {
          data[i + 3] = 0;
        }
      }
      ctx.putImageData(imageData, 0, 0);
      bossProcessedRef.current = canvas;
    };
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

      drawSkyBackground(ctx, viewWidth, viewHeight, timestamp);

      const screenOffset = { x: 0, y: viewHeight * 0.18 };
      const toScreen = (x: number, y: number) => {
        const base = worldToScreen(x, y, camera.x, camera.y, viewWidth, viewHeight);
        return { x: base.x + screenOffset.x, y: base.y + screenOffset.y };
      };

      const originScreen = toScreen(0, 0);
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
      drawCannon(ctx, desiredAngleRef.current);
      ctx.restore();

      ctx.save();
      ctx.translate(enemyScreen.x, enemyScreen.y);
      ctx.fillStyle = 'rgba(15,23,42,0.5)';
      ctx.beginPath();
      ctx.ellipse(0, 42, 54, 16, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#734b22';
      ctx.fillRect(-44, 18, 88, 22);
      ctx.fillStyle = '#5b3717';
      ctx.fillRect(-48, 34, 96, 12);
      const boss = bossProcessedRef.current;
      if (boss) {
        const bossSize = Math.min(viewWidth, viewHeight) * 0.24;
        ctx.drawImage(boss, -bossSize / 2, -bossSize / 2 - 12, bossSize, bossSize);
      } else {
        ctx.fillStyle = '#f43f5e';
        ctx.beginPath();
        ctx.arc(0, 0, 24, 0, Math.PI * 2);
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
        <canvas
          ref={canvasRef}
          className="absolute inset-0 h-full w-full"
        />
        <GameScreenLayout
          className="relative z-10 px-3 pb-[calc(env(safe-area-inset-bottom)+0.6rem)] pt-2"
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
                <div className="mx-auto w-full max-w-[44rem]">
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
                <div className="mx-auto grid w-full max-w-[44rem] grid-cols-2 gap-2">
                  {(activeQuestion?.options ?? []).map((option) => (
                    <button
                      key={option}
                      type="button"
                      onClick={() => handleAnswer(option)}
                      disabled={gameState !== 'awaitingAnswer'}
                      className="ui-button-primary inline-flex min-h-[2.6rem] items-center justify-center rounded-[1rem] px-3 py-2.5 text-[clamp(12px,1.9vh,16px)] font-black disabled:cursor-not-allowed disabled:opacity-55"
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



