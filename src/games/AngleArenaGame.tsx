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
import catapultAsset from '../assets/angle_arena/catapultfinal.png';
import battleBackground from '../assets/angle_arena/angle arenabkground.png';
import { BOSS_ASSETS } from '../assets/bosses';
import { buildAngleQuestions, AngleQuestion } from './angleArena/questions';
import { computeLaunchVector, stepProjectile, ProjectileState } from './angleArena/physics';
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

const AIM_DELAY = 380;
const HIT_SHAKE_DURATION = 520;
const PROJECTILE_RADIUS = 10;
const TARGET_RADIUS = 30;
const INITIAL_TIMER = 90;
const INITIAL_LIVES = 3;
const POINTS_PER_HIT = 250;
const ENEMY_DISTANCE_RATIO = 0.34;

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
  const hitShakeRef = useRef<number | null>(null);
  const desiredAngleRef = useRef(40);
  const selectedAnswerRef = useRef<number | null>(null);
  const catapultImageRef = useRef<HTMLImageElement | null>(null);
  const backgroundImageRef = useRef<HTMLImageElement | null>(null);
  const bossImageRef = useRef<HTMLImageElement | null>(null);
  const bossProcessedRef = useRef<HTMLCanvasElement | null>(null);
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
    if (result === 'hit') {
      const nextScore = score + POINTS_PER_HIT;
      setScore(nextScore);
      setStars(Math.min(3, Math.max(stars, Math.floor(nextScore / 450))));
      setFeedback('Great shot!');
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
      setFeedback('Missed target. Try again.');
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
    const canvas = canvasRef.current;
    const viewWidth = canvas ? canvas.width / window.devicePixelRatio : 320;
    const viewHeight = canvas ? canvas.height / window.devicePixelRatio : 320;
    const originX = viewWidth / 2;
    const originY = viewHeight / 2;
    const resolvedAngle = Number.isFinite(angleDeg) ? (angleDeg as number) : desiredAngleRef.current;
    const { vx, vy } = computeLaunchVector(resolvedAngle, activeQuestion.launchSpeed);
    projectileRef.current = {
      x: originX,
      y: originY,
      vx,
      vy,
      active: true,
      trail: [],
    };
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

      if (projectileRef.current?.active) {
        projectileRef.current = stepProjectile(projectileRef.current, delta, 0);
      }

      const projectile = projectileRef.current;
      const correctAnswer = activeQuestion?.correctAnswer ?? 0;
      const enemyAngle = ((correctAnswer % 360) + 360) % 360;
      const allowHit = selectedAnswerRef.current === correctAnswer;

      const centerX = viewWidth / 2;
      const centerY = viewHeight / 2;
      const enemyDistance = Math.min(viewWidth, viewHeight) * ENEMY_DISTANCE_RATIO;
      const enemyRadians = (enemyAngle * Math.PI) / 180;
      const targetX = centerX + Math.cos(enemyRadians) * enemyDistance;
      const targetY = centerY - Math.sin(enemyRadians) * enemyDistance;

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

        if (projectile.active && (
          projectile.x < -PROJECTILE_RADIUS
          || projectile.x > viewWidth + PROJECTILE_RADIUS
          || projectile.y < -PROJECTILE_RADIUS
          || projectile.y > viewHeight + PROJECTILE_RADIUS
        )) {
          projectile.active = false;
          handleResolve('miss');
        }
      }

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
      const scrollX = projectile?.active ? projectile.x - centerX : 0;
      if (backgroundImg && backgroundImg.complete) {
        const scale = Math.max(
          viewWidth / backgroundImg.width,
          viewHeight / backgroundImg.height,
        ) * 1.18;
        const tileW = backgroundImg.width * scale;
        const tileH = backgroundImg.height * scale;
        const parallax = -scrollX * 0.25;
        const offsetX = ((viewWidth - tileW) / 2) + parallax;
        const offsetY = (viewHeight - tileH) / 2;
        const startX = offsetX - tileW;
        for (let x = startX; x < viewWidth + tileW; x += tileW) {
          ctx.drawImage(backgroundImg, x, offsetY, tileW, tileH);
        }
      } else {
        ctx.fillStyle = '#0b1731';
        ctx.fillRect(0, 0, viewWidth, viewHeight);
      }

      const catapult = catapultImageRef.current;
      const launcherX = centerX;
      if (catapult && catapult.complete) {
        const rocketWidth = 120;
        const rocketHeight = 84;
        ctx.drawImage(
          catapult,
          launcherX - rocketWidth / 2,
          centerY - rocketHeight / 2,
          rocketWidth,
          rocketHeight,
        );
      } else {
        ctx.fillStyle = '#f59e0b';
        ctx.fillRect(launcherX - 48, centerY - 10, 72, 18);
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(launcherX - 58, centerY + 6, 30, 24);
      }

      // Boss enemy anchored at the target point
      ctx.save();
      ctx.translate(targetX, targetY);
      ctx.fillStyle = 'rgba(15,23,42,0.5)';
      ctx.beginPath();
      ctx.ellipse(0, 40, 52, 16, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#734b22';
      ctx.fillRect(-42, 18, 84, 22);
      ctx.fillStyle = '#5b3717';
      ctx.fillRect(-46, 34, 92, 12);
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
          ctx.fillStyle = `rgba(125,211,252,${0.35 * point.alpha})`;
          ctx.beginPath();
          ctx.arc(point.x, point.y, 6 * point.alpha, 0, Math.PI * 2);
          ctx.fill();
        });

        ctx.fillStyle = '#f8fafc';
        ctx.beginPath();
        ctx.arc(projectile.x, projectile.y, PROJECTILE_RADIUS, 0, Math.PI * 2);
        ctx.fill();
      }

      if (impactResultRef.current === 'hit') {
        ctx.fillStyle = 'rgba(250,204,21,0.45)';
        ctx.beginPath();
        ctx.arc(targetX, targetY, 34, 0, Math.PI * 2);
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
            className={`relative z-20 w-full transition-all duration-300 ${gameState === 'firing' || gameState === 'projectileFlight' || gameState === 'resolvedCorrect' || gameState === 'resolvedIncorrect' ? 'pointer-events-none max-h-0 opacity-0' : 'max-h-[240px] opacity-100'}`}
          >
            <div className="game-question-card">
              <div className="question-title">{formatFantasyPrompt(activeQuestion?.prompt ?? 'Choose the correct launch angle.')}</div>
            </div>
            {isBeginnerLevel ? (
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
            ) : null}
          </div>
        </section>

        <section className="min-h-0 flex-[1.8]">
          <div className="relative flex h-full w-full min-h-[34vh] items-center justify-center overflow-hidden rounded-[1.6rem] shadow-[0_18px_32px_rgba(2,6,23,0.4)]">
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



