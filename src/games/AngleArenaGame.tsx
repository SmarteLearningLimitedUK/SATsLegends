<<<<<<< HEAD
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
  StoryCard,
  TaskCard,
} from '../components/game-ui/GameUiKit';
import { buildAngleQuestions, AngleQuestion } from './angleArena/questions';
import { clamp, computeLaunchVector, stepProjectile, ProjectileState } from './angleArena/physics';
=======
import React from 'react';
import { MiniGameShellContractProps } from '../app/gameplaySessionContract';
import SlingShotGame from './SlingShotGame';
>>>>>>> b33d9a4cc27c7320b7a529f090ae8976a0f2736c

interface AngleArenaGameProps {
  levelId: number;
  avatarId: string;
  onVictory: (stars: number, XP: number) => void;
  onGameOver: (XP: number) => void;
  onBack: () => void;
}

type AngleArenaGameShellProps = AngleArenaGameProps & MiniGameShellContractProps;

<<<<<<< HEAD
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

type CameraMode = 'start' | 'follow' | 'hold' | 'return';

type ImpactResult = 'hit' | 'miss';

type WorldConfig = {
  width: number;
  height: number;
  groundY: number;
  launcherX: number;
  launcherY: number;
};

const WORLD: WorldConfig = {
  width: 2200,
  height: 360,
  groundY: 280,
  launcherX: 160,
  launcherY: 248,
};

const GRAVITY = 980;
const AIM_DELAY = 380;
const POST_IMPACT_HOLD = 900;
const CAMERA_RETURN_TIME = 600;
const PROJECTILE_RADIUS = 10;
const TARGET_RADIUS = 34;
const INITIAL_TIMER = 90;
const INITIAL_LIVES = 3;
const POINTS_PER_HIT = 250;

const formatTime = (seconds: number) => {
  const clamped = Math.max(0, Math.floor(seconds));
  const mins = Math.floor(clamped / 60);
  const secs = clamped % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

const AngleArenaGame: React.FC<AngleArenaGameShellProps> = ({
  levelId,
  avatarId: _avatarId,
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
  const cameraXRef = useRef(0);
  const cameraModeRef = useRef<CameraMode>('start');
  const cameraHoldUntilRef = useRef<number | null>(null);
  const desiredAngleRef = useRef(40);
  const launcherAngleRef = useRef(40);
  const projectileRef = useRef<ProjectileState | null>(null);
  const impactResultRef = useRef<ImpactResult | null>(null);
  const aimTimeoutRef = useRef<number | null>(null);

  const [gameState, setGameState] = useState<GameState>('intro');
  const [questionIndex, setQuestionIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [feedback, setFeedback] = useState('');
  const [score, setScore] = useState(0);
  const [localLives, setLocalLives] = useState(INITIAL_LIVES);
  const [localTimer, setLocalTimer] = useState(INITIAL_TIMER);
  const [stars, setStars] = useState(0);

  const questions = useMemo(
    () => buildAngleQuestions({
      launcherX: WORLD.launcherX,
      groundY: WORLD.groundY,
      gravity: GRAVITY,
    }),
    [],
  );
  const activeQuestion = questions[questionIndex];

  const lives = sessionState?.lives ?? localLives;
  const timeLeft = sessionState?.timeLeft ?? localTimer;

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
        XP: score,
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
    };
  }, []);

  const resetForNext = () => {
    setSelectedAnswer(null);
    setFeedback('');
    impactResultRef.current = null;
    projectileRef.current = null;
    cameraModeRef.current = 'return';
    cameraHoldUntilRef.current = performance.now() + CAMERA_RETURN_TIME;
    setGameState('awaitingAnswer');
  };

  const finishLevel = (finalScore: number) => {
    const earnedStars = Math.min(3, Math.max(1, Math.floor(finalScore / 450)));
    setStars(earnedStars);
    setGameState('levelComplete');
    emitMiniGameSessionEvent(sessionEvents, 'game_complete', {
      XP: finalScore,
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
    if (result === 'hit') {
      const nextScore = score + POINTS_PER_HIT;
      setScore(nextScore);
      setStars(Math.min(3, Math.max(stars, Math.floor(nextScore / 450))));
      setFeedback('Great shot!');
      triggerHaptic('success');
      emitMiniGameSessionEvent(sessionEvents, 'correct_answer', {
        XP: nextScore,
        metadata: {
          questionId: activeQuestion?.id,
          selected: selectedAnswer,
        },
      });
      setGameState('resolvedCorrect');
    } else {
      setFeedback('Missed target. Try again.');
      triggerHaptic('error');
      emitMiniGameSessionEvent(sessionEvents, 'incorrect_answer', {
        XP: score,
        metadata: {
          questionId: activeQuestion?.id,
          selected: selectedAnswer,
        },
      });
      if (!sessionState) {
        setLocalLives((prev) => Math.max(0, prev - 1));
      }
      setGameState('resolvedIncorrect');
    }

    cameraModeRef.current = 'hold';
    cameraHoldUntilRef.current = performance.now() + POST_IMPACT_HOLD;
  };

  const fireProjectile = (angleDeg: number) => {
    if (!activeQuestion) return;
    const { vx, vy } = computeLaunchVector(angleDeg, activeQuestion.launchSpeed);
    projectileRef.current = {
      x: WORLD.launcherX,
      y: WORLD.launcherY,
      vx,
      vy,
      active: true,
      trail: [],
    };
    cameraModeRef.current = 'follow';
    setGameState('projectileFlight');
  };

  const handleAnswer = (answer: number) => {
    if (gameState !== 'awaitingAnswer' || !activeQuestion) return;
    setSelectedAnswer(answer);
    setFeedback('');
    desiredAngleRef.current = answer;
    setGameState('aiming');
    aimTimeoutRef.current = window.setTimeout(() => {
      setGameState('firing');
      fireProjectile(answer);
    }, AIM_DELAY);
  };

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

      const desiredAngle = desiredAngleRef.current;
      launcherAngleRef.current += (desiredAngle - launcherAngleRef.current) * 0.12;

      if (projectileRef.current?.active) {
        projectileRef.current = stepProjectile(projectileRef.current, delta, GRAVITY);
      }

      const projectile = projectileRef.current;
      const targetX = activeQuestion?.targetX ?? WORLD.width - 260;
      const targetY = activeQuestion?.targetY ?? WORLD.groundY - 42;
      const correctAnswer = activeQuestion?.correctAnswer ?? 0;
      const allowHit = selectedAnswer === correctAnswer;

      if (projectile?.active) {
        if (allowHit) {
          const dx = projectile.x - targetX;
          const dy = projectile.y - targetY;
          const hit = Math.hypot(dx, dy) <= TARGET_RADIUS + PROJECTILE_RADIUS;
          if (hit) {
            projectile.active = false;
            handleResolve('hit');
          }
        }

        if (projectile.active && projectile.y >= WORLD.groundY) {
          projectile.active = false;
          handleResolve('miss');
        }

        if (projectile.active && (projectile.x > WORLD.width || projectile.y < 0)) {
          projectile.active = false;
          handleResolve('miss');
        }
      }

      const cameraX = cameraXRef.current;
      let targetCameraX = 0;
      if (cameraModeRef.current === 'follow' && projectile) {
        targetCameraX = clamp(projectile.x - viewWidth * 0.35, 0, WORLD.width - viewWidth);
      } else if (cameraModeRef.current === 'hold') {
        targetCameraX = clamp(targetX - viewWidth * 0.5, 0, WORLD.width - viewWidth);
        if (cameraHoldUntilRef.current && timestamp >= cameraHoldUntilRef.current) {
          cameraModeRef.current = 'return';
          cameraHoldUntilRef.current = timestamp + CAMERA_RETURN_TIME;
        }
      } else if (cameraModeRef.current === 'return') {
        targetCameraX = 0;
        if (cameraHoldUntilRef.current && timestamp >= cameraHoldUntilRef.current) {
          cameraModeRef.current = 'start';
          cameraHoldUntilRef.current = null;
        }
      }
      cameraXRef.current += (targetCameraX - cameraX) * 0.08;

      ctx.save();
      ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
      ctx.clearRect(0, 0, viewWidth, viewHeight);

      const parallaxFar = cameraXRef.current * 0.2;
      const parallaxMid = cameraXRef.current * 0.4;
      const parallaxNear = cameraXRef.current * 0.6;

      ctx.fillStyle = '#0b1731';
      ctx.fillRect(0, 0, viewWidth, viewHeight);

      ctx.fillStyle = '#16305f';
      ctx.fillRect(-parallaxFar, 30, WORLD.width, 80);

      ctx.fillStyle = '#1f3d7a';
      ctx.fillRect(-parallaxMid, 100, WORLD.width, 120);

      ctx.fillStyle = '#1b2b4f';
      ctx.fillRect(-parallaxNear, WORLD.groundY, WORLD.width, viewHeight - WORLD.groundY + 40);

      const cameraOffsetX = -cameraXRef.current;

      ctx.fillStyle = '#2d4a2f';
      ctx.fillRect(cameraOffsetX, WORLD.groundY - 6, WORLD.width, 12);

      ctx.save();
      ctx.translate(cameraOffsetX + WORLD.launcherX, WORLD.launcherY);
      ctx.rotate(-launcherAngleRef.current * (Math.PI / 180));
      ctx.fillStyle = '#f59e0b';
      ctx.fillRect(0, -6, 70, 12);
      ctx.restore();

      ctx.fillStyle = '#0f172a';
      ctx.fillRect(cameraOffsetX + WORLD.launcherX - 20, WORLD.launcherY + 8, 40, 32);

      ctx.fillStyle = '#6b21a8';
      ctx.fillRect(cameraOffsetX + targetX - 30, targetY - 40, 60, 40);
      ctx.fillStyle = '#a855f7';
      ctx.fillRect(cameraOffsetX + targetX - 26, targetY - 76, 52, 36);

      if (projectile) {
        projectile.trail.forEach((point) => {
          ctx.fillStyle = `rgba(125,211,252,${0.35 * point.alpha})`;
          ctx.beginPath();
          ctx.arc(cameraOffsetX + point.x, point.y, 6 * point.alpha, 0, Math.PI * 2);
          ctx.fill();
        });

        ctx.fillStyle = '#f8fafc';
        ctx.beginPath();
        ctx.arc(cameraOffsetX + projectile.x, projectile.y, PROJECTILE_RADIUS, 0, Math.PI * 2);
        ctx.fill();
      }

      if (impactResultRef.current === 'hit' && cameraModeRef.current === 'hold') {
        ctx.fillStyle = 'rgba(250,204,21,0.65)';
        ctx.beginPath();
        ctx.arc(cameraOffsetX + targetX, targetY - 30, 36, 0, Math.PI * 2);
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

  return (
    <GameUiShell>
      <div className="flex h-full min-h-0 flex-col gap-2 px-3 pb-[calc(env(safe-area-inset-bottom)+1rem)] pt-3 text-white">
        <section className="shrink-0">
          <GameTopBar
            onBack={onBack}
            progressLabel={`Question ${questionIndex + 1} / ${questions.length}`}
            lives={lives}
            audioEnabled
            className="mx-auto w-full max-w-[760px]"
          />
        </section>

        <section className="shrink-0">
          <div className="mx-auto grid w-full max-w-[760px] grid-cols-3 gap-2 text-center text-[11px] font-black uppercase tracking-[0.12em]">
            <div className="rounded-full border border-cyan-100/25 bg-slate-950/55 px-3 py-2">Time {formatTime(timeLeft)}</div>
            <div className="rounded-full border border-cyan-100/25 bg-slate-950/55 px-3 py-2">Score {score}</div>
            <div className="rounded-full border border-cyan-100/25 bg-slate-950/55 px-3 py-2">Stars {stars}</div>
          </div>
        </section>

        <section className="shrink-0">
          <StoryCard className="mx-auto max-w-[760px]">
            <p className="text-[clamp(13px,2vh,18px)] font-semibold text-white/90">
              The academy wants a perfect launch to defend the training grounds.
            </p>
          </StoryCard>
        </section>

        <section className="shrink-0">
          <TaskCard className="mx-auto w-full max-w-[760px]">
            <div className="text-[10px] font-black uppercase tracking-[0.18em] text-amber-900/80">Angle Task</div>
            <div className="mt-1 text-[clamp(14px,2.1vh,18px)] font-black text-slate-900">
              {activeQuestion?.prompt ?? 'Choose the correct launch angle.'}
            </div>
          </TaskCard>
        </section>

        <section className="shrink-0">
          <div className="mx-auto grid w-full max-w-[760px] grid-cols-2 gap-2">
            {(activeQuestion?.options ?? []).map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => handleAnswer(option)}
                disabled={gameState !== 'awaitingAnswer'}
                className="inline-flex min-h-[3.4rem] items-center justify-center rounded-[1.4rem] border border-cyan-100/40 bg-[linear-gradient(180deg,rgba(56,189,248,0.3),rgba(15,23,42,0.8))] px-3 text-[clamp(14px,2.2vh,18px)] font-black text-cyan-50 shadow-[0_14px_24px_rgba(2,6,23,0.4)] transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-55"
              >
                {option} deg
              </button>
            ))}
          </div>
        </section>

        <section className="min-h-0 flex-1">
          <div className="mx-auto flex h-full w-full max-w-[840px] items-center justify-center rounded-[1.6rem] border border-white/12 bg-slate-950/30 shadow-[0_18px_32px_rgba(2,6,23,0.4)]">
            <canvas
              ref={canvasRef}
              className="h-full w-full rounded-[1.6rem]"
            />
          </div>
        </section>

        <section className="shrink-0">
          <FeedbackStrip className="mx-auto w-full max-w-[760px]" tone={gameState === 'resolvedCorrect' ? 'success' : gameState === 'resolvedIncorrect' ? 'warning' : 'neutral'}>
            {feedback || 'Choose an angle to fire the launcher.'}
          </FeedbackStrip>
        </section>

        <section className="shrink-0">
          {gameState === 'resolvedCorrect' || gameState === 'resolvedIncorrect' ? (
            <div className="mx-auto flex w-full max-w-[760px] items-center gap-2">
              <PrimaryButton onClick={handleNext} className="flex-1">
                Next
              </PrimaryButton>
              <SecondaryButton onClick={resetForNext}>
                Reset View
              </SecondaryButton>
            </div>
          ) : null}
        </section>
      </div>
    </GameUiShell>
  );
};
=======
const AngleArenaGame: React.FC<AngleArenaGameShellProps> = (props) => (
  <SlingShotGame
    {...props}
    questionType="angles"
    interactionMode="select"
  />
);
>>>>>>> b33d9a4cc27c7320b7a529f090ae8976a0f2736c

export default AngleArenaGame;
