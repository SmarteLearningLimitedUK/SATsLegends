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
  TaskCard,
} from '../components/game-ui/GameUiKit';
import catapultAsset from '../assets/rocktlogo.png';
import battleBackground from '../assets/angle_arena/angle arenabkground.png';
import { buildAngleQuestions, AngleQuestion } from './angleArena/questions';
import { clamp, computeLaunchVector, stepProjectile, ProjectileState } from './angleArena/physics';

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
  width: 2400,
  height: 360,
  groundY: 280,
  launcherX: 220,
  launcherY: 248,
};

const GRAVITY = 980;
const AIM_DELAY = 380;
const POST_IMPACT_HOLD = 900;
const HIT_SHAKE_DURATION = 520;
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
  avatarId,
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
  const hitShakeRef = useRef<number | null>(null);
  const desiredAngleRef = useRef(40);
  const launcherAngleRef = useRef(40);
  const selectedAnswerRef = useRef<number | null>(null);
  const catapultImageRef = useRef<HTMLImageElement | null>(null);
  const backgroundImageRef = useRef<HTMLImageElement | null>(null);
  const projectileRef = useRef<ProjectileState | null>(null);
  const impactResultRef = useRef<ImpactResult | null>(null);
  const aimTimeoutRef = useRef<number | null>(null);
  const bgTileOffsetRef = useRef(0);

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
      launcherX: WORLD.launcherX,
      groundY: WORLD.groundY,
      gravity: GRAVITY,
    }),
    [],
  );
  const questions = useMemo(() => (
    rawQuestions.map((question) => {
      const shouldShift = question.correctAnswer >= 120;
      const launcherX = shouldShift ? 460 : 220;
      const { vx, vy } = computeLaunchVector(question.correctAnswer, question.launchSpeed);
      const estimatedRange = Math.max(0, (vx * vx) / (GRAVITY * Math.max(0.2, Math.tan((question.correctAnswer * Math.PI) / 180))));
      const targetX = clamp(launcherX + (Number.isFinite(estimatedRange) ? estimatedRange : 900) * 0.5, launcherX + 320, launcherX + 1400);
      return {
        ...question,
        launcherX,
        targetX,
      };
    })
  ), [rawQuestions]);
  const activeQuestion = questions[questionIndex];
  const isBeginnerLevel = levelId <= 3;
  const optionList = useMemo(() => (activeQuestion?.options ?? []).slice().sort((a, b) => a - b), [activeQuestion]);

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

  useEffect(() => {
    const img = new Image();
    img.src = catapultAsset;
    catapultImageRef.current = img;
  }, []);

  useEffect(() => {
    const img = new Image();
    img.src = battleBackground;
    backgroundImageRef.current = img;
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
          selected: selectedAnswerRef.current,
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
          selected: selectedAnswerRef.current,
        },
      });
      if (!sessionState) {
        setLocalLives((prev) => Math.max(0, prev - 1));
      }
      setGameState('resolvedIncorrect');
    }

    cameraModeRef.current = 'hold';
    cameraHoldUntilRef.current = performance.now() + POST_IMPACT_HOLD;
    if (result === 'hit') {
      hitShakeRef.current = performance.now() + HIT_SHAKE_DURATION;
    }
  };

  const fireProjectile = (angleDeg?: number) => {
    if (!activeQuestion) return;
    const resolvedAngle = Number.isFinite(angleDeg) ? (angleDeg as number) : desiredAngleRef.current;
    const { vx, vy } = computeLaunchVector(resolvedAngle, activeQuestion.launchSpeed);
    const launcherX = activeQuestion.launcherX ?? WORLD.launcherX;
    projectileRef.current = {
      x: launcherX,
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
    selectedAnswerRef.current = answer;
    setSelectedAnswer(answer);
    setFeedback('');
    desiredAngleRef.current = answer;
    setGameState('aiming');
    if (isBeginnerLevel) {
      if (aimTimeoutRef.current) window.clearTimeout(aimTimeoutRef.current);
      setGameState('firing');
      aimTimeoutRef.current = window.setTimeout(() => {
        fireProjectile(answer);
      }, AIM_DELAY);
    }
  };

  useEffect(() => {
    if (selectedAnswer) {
      desiredAngleRef.current = selectedAnswer;
      selectedAnswerRef.current = selectedAnswer;
    }
  }, [selectedAnswer]);

  const handleFire = () => {
    if (!selectedAnswer || !activeQuestion) return;
    if (gameState !== 'aiming' && gameState !== 'awaitingAnswer') return;
    selectedAnswerRef.current = selectedAnswer;
    if (aimTimeoutRef.current) window.clearTimeout(aimTimeoutRef.current);
    setGameState('firing');
    aimTimeoutRef.current = window.setTimeout(() => {
      fireProjectile(selectedAnswer);
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
      const targetX = clamp(activeQuestion?.targetX ?? WORLD.width - 260, 220, WORLD.width - 220);
      const targetY = activeQuestion?.targetY ?? WORLD.groundY - 42;
      const correctAnswer = activeQuestion?.correctAnswer ?? 0;
      const allowHit = selectedAnswerRef.current === correctAnswer;

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
      } else if (cameraModeRef.current === 'start') {
        targetCameraX = clamp((activeQuestion?.launcherX ?? WORLD.launcherX) - viewWidth * 0.35, 0, WORLD.width - viewWidth);
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

      const parallaxFar = cameraXRef.current * 0.2;
      const parallaxMid = cameraXRef.current * 0.4;
      const parallaxNear = cameraXRef.current * 0.6;

      const backgroundImg = backgroundImageRef.current;
      if (backgroundImg && backgroundImg.complete) {
        const scale = Math.max(
          viewWidth / backgroundImg.width,
          viewHeight / backgroundImg.height,
        ) * 1.18;
        const tileW = backgroundImg.width * scale;
        const tileH = backgroundImg.height * scale;
        const tilesNeeded = Math.ceil(viewWidth / tileW) + 3;
        bgTileOffsetRef.current = (cameraXRef.current * 0.2) % tileW;
        for (let i = 0; i < tilesNeeded; i += 1) {
          const x = -bgTileOffsetRef.current + (i - 1) * tileW;
          ctx.drawImage(backgroundImg, x, 0, tileW, tileH);
        }
      } else {
        ctx.fillStyle = '#0b1731';
        ctx.fillRect(0, 0, viewWidth, viewHeight);
      }

      const cameraOffsetX = -cameraXRef.current;

      const catapult = catapultImageRef.current;
      const launcherX = activeQuestion?.launcherX ?? WORLD.launcherX;
      if (catapult && catapult.complete) {
        const rocketWidth = 96;
        const rocketHeight = 56;
        ctx.drawImage(
          catapult,
          cameraOffsetX + launcherX - 48,
          WORLD.launcherY - rocketHeight + 12,
          rocketWidth,
          rocketHeight,
        );
      } else {
        ctx.fillStyle = '#f59e0b';
        ctx.fillRect(cameraOffsetX + launcherX - 48, WORLD.launcherY - 20, 72, 18);
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(cameraOffsetX + launcherX - 58, WORLD.launcherY - 6, 30, 24);
      }

      // Enemy on a podium near the target
      ctx.save();
      ctx.translate(cameraOffsetX + targetX, targetY);
      ctx.fillStyle = '#0f172a';
      ctx.beginPath();
      ctx.roundRect(-34, 10, 68, 26, 12);
      ctx.fill();
      ctx.fillStyle = '#1e3a8a';
      ctx.beginPath();
      ctx.roundRect(-28, 6, 56, 18, 10);
      ctx.fill();
      ctx.fillStyle = '#f43f5e';
      ctx.beginPath();
      ctx.arc(0, -6, 18, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#0f172a';
      ctx.beginPath();
      ctx.arc(-6, -10, 4, 0, Math.PI * 2);
      ctx.arc(6, -10, 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();


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
        ctx.fillStyle = 'rgba(250,204,21,0.45)';
        ctx.beginPath();
        ctx.arc(cameraOffsetX + targetX, targetY - 30, 28, 0, Math.PI * 2);
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
      <div className="flex h-full min-h-0 flex-col gap-1.5 px-3 pb-[calc(env(safe-area-inset-bottom)+0.6rem)] pt-2 text-white">
        <section className="shrink-0">
          <GameTopBar
            onBack={onBack}
            progressLabel={`Question ${questionIndex + 1} / ${questions.length}`}
            lives={lives}
            audioEnabled
            className="w-full"
          />
        </section>

        <section className="shrink-0">
          <div
            className={`relative z-20 w-full overflow-visible transition-all duration-300 ${gameState === 'firing' || gameState === 'projectileFlight' || gameState === 'resolvedCorrect' || gameState === 'resolvedIncorrect' ? 'pointer-events-none max-h-0 opacity-0' : 'max-h-[240px] opacity-100'}`}
          >
            <div className="truncate whitespace-nowrap rounded-full border border-amber-200/55 bg-[linear-gradient(180deg,#f7f1e3,#f1e5cc)] px-3 py-1 text-center text-[clamp(12px,1.4vh,14px)] font-black text-amber-900 shadow-[0_10px_20px_rgba(15,23,42,0.2)]">
              {activeQuestion?.prompt ?? 'Choose the correct launch angle.'}
            </div>
            {isBeginnerLevel ? (
              <div className="mt-1.5 grid grid-cols-2 gap-1.5">
                {(activeQuestion?.options ?? []).map((option) => (
                  <button
                    key={option}
                    type="button"
                    onClick={() => handleAnswer(option)}
                    disabled={gameState !== 'awaitingAnswer'}
                    className="inline-flex min-h-[2.35rem] items-center justify-center rounded-[1.1rem] border border-amber-200/60 bg-[linear-gradient(180deg,rgba(30,64,175,0.45),rgba(15,23,42,0.45))] px-3 text-[clamp(12px,1.9vh,16px)] font-black text-slate-100 shadow-[0_10px_20px_rgba(15,23,42,0.2)] transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-55"
                  >
                    {option}°
                  </button>
                ))}
              </div>
            ) : null}
          </div>
        </section>

        <section className="min-h-0 flex-[1.6]">
          <div className="flex h-full w-full min-h-[30vh] items-center justify-center rounded-[1.6rem] border border-white/12 bg-slate-950/30 shadow-[0_18px_32px_rgba(2,6,23,0.4)]">
            <canvas
              ref={canvasRef}
              className="h-full w-full rounded-[1.6rem]"
            />
          </div>
        </section>

        <section className="shrink-0">
          <FeedbackStrip className="w-full" tone={gameState === 'resolvedCorrect' ? 'success' : gameState === 'resolvedIncorrect' ? 'warning' : 'neutral'}>
            {feedback || 'Choose an angle to fire the launcher.'}
          </FeedbackStrip>
        </section>

        <section className="shrink-0">
          {gameState === 'resolvedCorrect' || gameState === 'resolvedIncorrect' ? (
            <div className="flex w-full items-center gap-2">
              <PrimaryButton onClick={handleNext} className="flex-1">
                Next
              </PrimaryButton>
              <SecondaryButton onClick={resetForNext}>
                Reset View
              </SecondaryButton>
            </div>
          ) : !isBeginnerLevel ? (
            <div className="flex w-full items-center gap-2">
              <div className="flex flex-1 items-center gap-2 rounded-[1.1rem] border border-cyan-100/24 bg-slate-950/60 px-2.5 py-1.5 text-cyan-50">
                <span className="text-[10px] font-black uppercase tracking-[0.14em] text-cyan-100/80">Angle</span>
                <div className="ml-auto flex items-center gap-2">
                  <SecondaryButton
                    onClick={() => {
                      if (!optionList.length) return;
                      setSelectedAnswer((prev) => {
                        if (!prev) return optionList[0];
                        const idx = optionList.indexOf(prev);
                        return optionList[Math.max(0, idx - 1)];
                      });
                      if (gameState === 'awaitingAnswer') setGameState('aiming');
                    }}
                    disabled={(gameState !== 'awaitingAnswer' && gameState !== 'aiming') || optionList.length === 0}
                  >
                    -
                  </SecondaryButton>
                  <div className="min-w-[54px] text-center text-[clamp(14px,2.2vh,18px)] font-black">
                    {selectedAnswer ?? '--'} deg
                  </div>
                  <SecondaryButton
                    onClick={() => {
                      if (!optionList.length) return;
                      setSelectedAnswer((prev) => {
                        if (!prev) return optionList[optionList.length - 1];
                        const idx = optionList.indexOf(prev);
                        return optionList[Math.min(optionList.length - 1, idx + 1)];
                      });
                      if (gameState === 'awaitingAnswer') setGameState('aiming');
                    }}
                    disabled={(gameState !== 'awaitingAnswer' && gameState !== 'aiming') || optionList.length === 0}
                  >
                    +
                  </SecondaryButton>
                </div>
              </div>
              <PrimaryButton
                onClick={handleFire}
                disabled={!selectedAnswer || (gameState !== 'aiming' && gameState !== 'awaitingAnswer')}
                className="w-[34%] min-h-[2.9rem]"
              >
                Fire
              </PrimaryButton>
            </div>
          ) : null}
        </section>
      </div>
    </GameUiShell>
  );
};

export default AngleArenaGame;
