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

const CANVAS_WIDTH = 900;
const CANVAS_HEIGHT = 520;
const SLING_POS = { x: 130, y: 420 };
const MAX_PULL = 120;
const GRAVITY = 980;
const LAUNCH_SCALE = 4.5;
const ROUNDS_TO_WIN = 5;

const FRACTIONS = ['1/2', '1/3', '2/3', '3/4', '1/4', '2/5', '4/5', '3/5'];
const ANGLES = [30, 45, 60, 75, 90, 105, 120, 135, 150];

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

const createTargets = (questionType: 'fractions' | 'angles', angleChallenge: AngleChallenge | null) => {
  const options = questionType === 'angles'
    ? (angleChallenge?.options ?? ANGLES.slice(0, 3))
    : pickUnique(3, FRACTIONS);
  const correctIndex = questionType === 'angles'
    ? Math.max(0, options.findIndex((option) => option === angleChallenge?.correctAngle))
    : Math.floor(Math.random() * options.length);
  const positions = [
    { x: 560, y: 340 },
    { x: 690, y: 280 },
    { x: 800, y: 360 },
  ];

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
  const initialAngleChallenge = questionType === 'angles' ? buildAngleChallenge(levelId) : null;
  const [roundSolved, setRoundSolved] = useState(0);
  const [attempts, setAttempts] = useState(0);
  const [angleChallenge, setAngleChallenge] = useState<AngleChallenge | null>(initialAngleChallenge);
  const [targets, setTargets] = useState<Target[]>(
    () => createTargets(questionType, initialAngleChallenge),
  );
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

  const correctTarget = useMemo(
    () => targets.find((target) => target.isCorrect),
    [targets],
  );

  const roundsToWin = ROUNDS_TO_WIN + Math.floor((levelId - 1) / 3);

  useEffect(() => {
    const nextAngleChallenge = questionType === 'angles' ? buildAngleChallenge(levelId) : null;
    setAngleChallenge(nextAngleChallenge);
    setTargets(createTargets(questionType, nextAngleChallenge));
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
    setFeedback(questionType === 'angles'
      ? 'Choose the correct angle to fire the sling.'
      : 'Pull back the sling and aim for the correct fraction.');
    setFeedbackTone('neutral');
    setLocked(false);
  }, [levelId, questionType]);

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

  const advanceRound = (wasCorrect: boolean) => {
    const nextSolved = wasCorrect ? roundSolved + 1 : roundSolved;
    setRoundSolved(nextSolved);
    const nextAngleChallenge = questionType === 'angles' ? buildAngleChallenge(levelId) : null;
    setAngleChallenge(nextAngleChallenge);
    setTargets(createTargets(questionType, nextAngleChallenge));
    resetShot();
    setLocked(false);
    setSelectedAngle(null);
    setForcedTargetId(null);

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
      setFeedback(questionType === 'angles' ? 'That was the wrong angle. Try again.' : 'That was the wrong fraction. Try again.');
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

      if (hitTarget && (!forcedTargetId || hitTarget.id === forcedTargetId)) {
        handleHit(hitTarget);
        return { ...prev, x: nextX, y: nextY, active: false };
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
    if (interactionMode === 'select') return;
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
    if (interactionMode === 'select') return;
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
    setFeedback(questionType === 'angles'
      ? 'Watch the sling and see which target you hit.'
      : 'Watch the arc and see which fraction you hit.');
    setFeedbackTone('neutral');
  };

  const fireAtAngle = (angleChoice: number) => {
    if (interactionMode !== 'select') return;
    if (shot.active || locked) return;
    const target = targets.find((candidate) => candidate.value === angleChoice);
    if (!target) return;

    setSelectedAngle(angleChoice);
    const dx = target.x - SLING_POS.x;
    const dy = target.y - SLING_POS.y;
    const travelTime = 0.9;
    const vx = dx / travelTime;
    const vy = (dy - 0.5 * GRAVITY * travelTime * travelTime) / travelTime;
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
