import React, { useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'motion/react';
import {
  emitMiniGameSessionEvent,
  MiniGameShellContractProps,
} from '../app/gameplaySessionContract';
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
}

type SlingShotGameShellProps = SlingShotGameProps & MiniGameShellContractProps;

type Target = {
  id: string;
  label: string;
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

const CANVAS_WIDTH = 900;
const CANVAS_HEIGHT = 520;
const SLING_POS = { x: 130, y: 420 };
const MAX_PULL = 120;
const GRAVITY = 980;
const LAUNCH_SCALE = 4.5;
const ROUNDS_TO_WIN = 5;

const FRACTIONS = ['1/2', '1/3', '2/3', '3/4', '1/4', '2/5', '4/5', '3/5'];

const pickUnique = (count: number) => {
  const pool = [...FRACTIONS];
  const chosen: string[] = [];
  while (chosen.length < count && pool.length > 0) {
    const index = Math.floor(Math.random() * pool.length);
    chosen.push(pool.splice(index, 1)[0]);
  }
  return chosen;
};

const createTargets = () => {
  const options = pickUnique(3);
  const correctIndex = Math.floor(Math.random() * options.length);
  const positions = [
    { x: 560, y: 340 },
    { x: 690, y: 280 },
    { x: 800, y: 360 },
  ];

  return options.map((label, index) => ({
    id: `${label}-${index}`,
    label,
    x: positions[index].x,
    y: positions[index].y,
    radius: 26,
    isCorrect: index === correctIndex,
  }));
};

const SlingShotGame: React.FC<SlingShotGameShellProps> = ({
  levelId,
  onVictory,
  onGameOver,
  onBack,
  sessionState,
  sessionEvents,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number | null>(null);
  const [roundSolved, setRoundSolved] = useState(0);
  const [attempts, setAttempts] = useState(0);
  const [targets, setTargets] = useState<Target[]>(() => createTargets());
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

  const correctTarget = useMemo(
    () => targets.find((target) => target.isCorrect),
    [targets],
  );

  const roundsToWin = ROUNDS_TO_WIN + Math.floor((levelId - 1) / 3);

  useEffect(() => {
    setTargets(createTargets());
    setRoundSolved(0);
    setAttempts(0);
    setShot({
      x: SLING_POS.x,
      y: SLING_POS.y,
      vx: 0,
      vy: 0,
      active: false,
    });
    setFeedback('Pull back the sling and aim for the correct fraction.');
    setFeedbackTone('neutral');
    setLocked(false);
  }, [levelId]);

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
  };

  const advanceRound = (wasCorrect: boolean) => {
    const nextSolved = wasCorrect ? roundSolved + 1 : roundSolved;
    setRoundSolved(nextSolved);
    setTargets(createTargets());
    resetShot();
    setLocked(false);

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
      setFeedback('That was the wrong fraction. Try again.');
      setFeedbackTone('warning');
      window.setTimeout(() => advanceRound(false), 650);
    }
  };

  const stepPhysics = (delta: number) => {
    if (!shot.active) return;
    const dt = Math.min(0.032, delta / 1000);
    setShot((prev) => {
      const nextVx = prev.vx;
      const nextVy = prev.vy + GRAVITY * dt;
      const nextX = prev.x + nextVx * dt;
      const nextY = prev.y + nextVy * dt;

      const hitTarget = targets.find((target) => {
        const dx = nextX - target.x;
        const dy = nextY - target.y;
        return Math.hypot(dx, dy) <= target.radius + 12;
      });

      if (hitTarget) {
        handleHit(hitTarget);
        return { ...prev, x: nextX, y: nextY, active: false };
      }

      if (nextY > CANVAS_HEIGHT + 80 || nextX > CANVAS_WIDTH + 80 || nextX < -80) {
        if (!locked) {
          setFeedback('Missed! Pull back and try again.');
          setFeedbackTone('warning');
          emitMiniGameSessionEvent(sessionEvents, 'incorrect_answer', {
            XP: roundSolved * 120,
          });
        }
        return { ...prev, x: SLING_POS.x, y: SLING_POS.y, vx: 0, vy: 0, active: false };
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
      stepPhysics(delta);
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
    ctx.fillStyle = 'rgba(15, 23, 42, 0.3)';
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    ctx.strokeStyle = 'rgba(148, 163, 184, 0.45)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(40, 444);
    ctx.lineTo(860, 444);
    ctx.stroke();

    targets.forEach((target) => {
      ctx.fillStyle = target.isCorrect ? 'rgba(52, 211, 153, 0.8)' : 'rgba(56, 189, 248, 0.8)';
      ctx.beginPath();
      ctx.arc(target.x, target.y, target.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,0.7)';
      ctx.lineWidth = 2;
      ctx.stroke();

      ctx.fillStyle = '#0f172a';
      ctx.font = 'bold 16px Nunito, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(target.label, target.x, target.y);
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

    ctx.fillStyle = 'rgba(248, 113, 113, 0.9)';
    ctx.beginPath();
    ctx.arc(shotX, shotY, 12, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.6)';
    ctx.stroke();
  }, [dragPoint, dragging, shot, targets]);

  const handlePointerDown = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (shot.active || locked) return;
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
    if (!dragging || !dragPoint) return;
    const dx = SLING_POS.x - dragPoint.x;
    const dy = SLING_POS.y - dragPoint.y;
    const vx = dx * LAUNCH_SCALE;
    const vy = dy * LAUNCH_SCALE;
    setDragging(false);
    setDragPoint(null);
    setShot({
      x: SLING_POS.x,
      y: SLING_POS.y,
      vx,
      vy,
      active: true,
    });
    setFeedback('Watch the arc and see which fraction you hit.');
    setFeedbackTone('neutral');
  };

  return (
    <GameUiShell>
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

        <section className="shrink-0">
          <StoryCard className="mx-auto max-w-[780px]">
            <p className="text-[clamp(13px,2vh,18px)] font-semibold text-white/90">
              A village ranger needs the right potion crate delivered.
            </p>
          </StoryCard>
        </section>

        <section className="shrink-0">
          <TaskCard className="mx-auto w-full max-w-[780px]">
            <div className="text-[10px] font-black uppercase tracking-[0.18em] text-amber-900/80">Task Card</div>
            <div className="mt-1 text-[clamp(15px,2.2vh,20px)] font-black">Hit the correct fraction</div>
            <div className="mt-2 rounded-[1rem] border border-amber-200/35 bg-white/80 px-3 py-2 text-slate-900">
              <div className="text-[10px] font-black uppercase tracking-[0.14em] text-amber-900/70">Target</div>
              <div className="mt-1 text-lg font-black text-slate-900">{correctTarget?.label ?? '—'}</div>
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
        </section>
      </div>
    </GameUiShell>
  );
};

export default SlingShotGame;
