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
} from '../components/game-ui/GameUiKit';
import GameScreenLayout from '../components/game-ui/GameScreenLayout';
import catapultAsset from '../assets/angle_arena/catapultfinal.png';
import angleArenaBackgroundA from '../assets/angle_arena/angle arenabkground.png';
import { BOSS_ASSETS } from '../assets/bosses';
import { buildAngleQuestions, AngleQuestion } from './angleArena/questions';
import { angleToVector, clamp, degreesToRadians, distance, lerp, worldToScreen } from './angleArena/math';
import { formatFantasyPrompt } from '../utils/fantasyPrompt';

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
const ANGLE_BACKGROUND = angleArenaBackgroundA;

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
  const catapultImageRef = useRef<HTMLImageElement | null>(null);
  const backgroundImageRef = useRef<HTMLImageElement | null>(null);
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
  const [backgroundAsset] = useState(() => ANGLE_BACKGROUND);

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
    const img = new Image();
    img.src = catapultAsset;
    catapultImageRef.current = img;
  }, []);

  useEffect(() => {
    const img = new Image();
    img.src = backgroundAsset;
    backgroundImageRef.current = img;
  }, [backgroundAsset]);

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

      const backgroundImg = backgroundImageRef.current;
      if (backgroundImg && backgroundImg.complete) {
        const scale = Math.max(viewWidth / backgroundImg.width, viewHeight / backgroundImg.height);
        const drawW = backgroundImg.width * scale;
        const drawH = backgroundImg.height * scale;
        const drawX = (viewWidth - drawW) / 2;
        const drawY = (viewHeight - drawH) / 2;
        ctx.drawImage(backgroundImg, drawX, drawY, drawW, drawH);
      }

      const originScreen = worldToScreen(0, 0, camera.x, camera.y, viewWidth, viewHeight);
      const enemyScreen = worldToScreen(enemyWorld.x, enemyWorld.y, camera.x, camera.y, viewWidth, viewHeight);

      ctx.strokeStyle = 'rgba(148,163,184,0.4)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(originScreen.x, originScreen.y, WORLD_RADIUS * 0.35, 0, Math.PI * 2);
      ctx.stroke();

      if ((gameState === 'aiming' || gameState === 'awaitingAnswer') && selectedAnswerRef.current !== null) {
        const aimingAngle = selectedAnswerRef.current ?? desiredAngleRef.current;
        const aimVector = angleToVector(aimingAngle);
        const aimEndWorld = { x: aimVector.x * 160, y: aimVector.y * 160 };
        const aimEndScreen = worldToScreen(aimEndWorld.x, aimEndWorld.y, camera.x, camera.y, viewWidth, viewHeight);
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

      const catapult = catapultImageRef.current;
      if (catapult && catapult.complete) {
        const angleRad = degreesToRadians(desiredAngleRef.current);
        const rocketWidth = 120;
        const rocketHeight = 84;
        ctx.save();
        ctx.translate(originScreen.x, originScreen.y);
        ctx.rotate(-angleRad);
        ctx.drawImage(catapult, -rocketWidth / 2, -rocketHeight / 2, rocketWidth, rocketHeight);
        ctx.restore();
      } else {
        ctx.fillStyle = '#f59e0b';
        ctx.fillRect(originScreen.x - 48, originScreen.y - 10, 72, 18);
      }

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
          const trailScreen = worldToScreen(point.x, point.y, camera.x, camera.y, viewWidth, viewHeight);
          ctx.fillStyle = `rgba(125,211,252,${0.35 * point.alpha})`;
          ctx.beginPath();
          ctx.arc(trailScreen.x, trailScreen.y, 6 * point.alpha, 0, Math.PI * 2);
          ctx.fill();
        });

        const projectileScreen = worldToScreen(projectile.x, projectile.y, camera.x, camera.y, viewWidth, viewHeight);
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

              <div
                className={`relative z-20 w-full transition-all duration-300 ${gameState === 'firing' || gameState === 'projectileFlight' || gameState === 'resolvedCorrect' || gameState === 'resolvedIncorrect' ? 'pointer-events-none max-h-0 opacity-0' : 'max-h-[320px] opacity-100'}`}
              >
                <div className="game-question-card">
                  <div className="question-title">{formatFantasyPrompt(activeQuestion?.prompt ?? 'Choose the correct launch angle.')}</div>
                </div>
                <div className="mt-1.5 grid grid-cols-2 gap-1.5">
                  {(activeQuestion?.options ?? []).map((option) => (
                    <button
                      key={option}
                      type="button"
                      onClick={() => handleAnswer(option)}
                      disabled={gameState !== 'awaitingAnswer'}
                      className="licensed-answer-button inline-flex min-h-[2.35rem] items-center justify-center px-3 text-[clamp(12px,1.9vh,16px)] font-black text-slate-100 transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-55"
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
            </div>
          )}
          main={<div className="min-h-0 flex-1" />}
          bottom={(
            <div className="flex flex-col gap-2">
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



