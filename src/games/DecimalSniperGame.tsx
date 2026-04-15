import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { AVATARS } from '../constants';
import { triggerHaptic } from '../haptics';
import GameContainerView from '../components/GameContainerView';
import { MiniGameShellContractProps } from '../app/gameplaySessionContract';
import { formatFantasyPrompt } from '../utils/fantasyPrompt';
import {
  buildAimVector,
  computeArenaLayout,
  createProjectile,
  findProjectileCollision,
  isProjectileOutOfPlayfield,
  ProjectileModel,
  spawnTargetsWithSpacing,
  toPercentX,
  toPercentY,
  updateProjectile,
  updateTargetsInBounds,
  Vec2,
  MovingTarget,
  DroneTargetSeed,
} from './decimalSniper/decimalSniperEngine';

interface DecimalSniperGameProps extends MiniGameShellContractProps {
  levelId: number;
  avatarId: string;
  isBoss?: boolean;
  onVictory: (stars: number, XP: number) => void;
  onGameOver: (XP: number) => void;
  onBack: () => void;
}

type PromptMode = 'largest' | 'smallest' | 'closest';

interface SniperRound {
  id: string;
  prompt: string;
  sublabel: string;
  correctTargetId: string;
  seeds: DroneTargetSeed[];
}

interface FeedbackState {
  id: number;
  title: string;
  detail: string;
  tone: 'success' | 'warning' | 'error';
}

const MAX_LIVES = 3;
const TARGET_PALETTES: DroneTargetSeed['palette'][] = ['cyan', 'sky', 'amber', 'emerald'];

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));
const randomBetween = (min: number, max: number) => Math.random() * (max - min) + min;
const randomInt = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;
const pick = <T,>(items: T[]): T => items[randomInt(0, items.length - 1)];

const formatDecimal = (value: number) => value.toFixed(2);

const buildDecimalSet = (count: number, min: number, max: number): number[] => {
  const unique = new Set<number>();
  while (unique.size < count) {
    const value = Number(randomBetween(min, max).toFixed(2));
    unique.add(value);
  }
  return Array.from(unique);
};

const buildRound = (levelId: number, roundNumber: number, isBoss: boolean): SniperRound => {
  const targetCount = clamp(isBoss ? 6 : 4 + Math.floor((levelId + roundNumber) / 5), 4, isBoss ? 7 : 6);
  const minValue = levelId >= 5 ? -1.5 : 0.05;
  const maxValue = levelId >= 4 ? 9.95 : 6.95;
  const modePool: PromptMode[] = levelId <= 2
    ? ['largest', 'smallest']
    : ['largest', 'smallest', 'closest'];
  const mode = pick(modePool);

  let values = buildDecimalSet(targetCount, minValue, maxValue);
  let prompt = '';
  let sublabel = '';
  let correctValue = values[0];

  if (mode === 'largest') {
    correctValue = Math.max(...values);
    prompt = 'Hit the greatest decimal value';
    sublabel = 'Scan all targets before firing.';
  } else if (mode === 'smallest') {
    correctValue = Math.min(...values);
    prompt = 'Hit the smallest decimal value';
    sublabel = 'Avoid decoys with similar leading digits.';
  } else {
    let anchor = Number(randomBetween(minValue, maxValue).toFixed(2));
    let attempts = 0;
    while (attempts < 30) {
      values = buildDecimalSet(targetCount, minValue, maxValue);
      const ordered = [...values].sort((a, b) => Math.abs(a - anchor) - Math.abs(b - anchor));
      if (Math.abs(Math.abs(ordered[0] - anchor) - Math.abs(ordered[1] - anchor)) > 0.03) {
        correctValue = ordered[0];
        break;
      }
      anchor = Number(randomBetween(minValue, maxValue).toFixed(2));
      attempts += 1;
    }

    prompt = `Hit the value closest to ${formatDecimal(anchor)}`;
    sublabel = 'Closest means smallest distance, not largest number.';
  }

  const seeds: DroneTargetSeed[] = values.map((value, index) => ({
    id: `target-${roundNumber}-${index}-${Math.round(value * 100)}`,
    label: formatDecimal(value),
    value,
    palette: TARGET_PALETTES[index % TARGET_PALETTES.length],
  }));

  const correctSeed = seeds.find((seed) => seed.value === correctValue) || seeds[0];

  return {
    id: `round-${levelId}-${roundNumber}-${mode}`,
    prompt,
    sublabel,
    correctTargetId: correctSeed.id,
    seeds,
  };
};

const paletteStyles: Record<DroneTargetSeed['palette'], string> = {
  cyan: 'border-cyan-200/75 bg-cyan-500/30 text-cyan-50',
  sky: 'border-sky-200/75 bg-sky-500/28 text-sky-50',
  amber: 'border-amber-200/75 bg-amber-500/28 text-amber-50',
  emerald: 'border-emerald-200/75 bg-emerald-500/30 text-emerald-50',
};

const DecimalSniperGame: React.FC<DecimalSniperGameProps> = ({
  levelId,
  avatarId,
  isBoss = false,
  isPractice,
  onVictory,
  onGameOver,
  onBack,
}) => {
  const avatar = useMemo(() => AVATARS.find((item) => item.id === avatarId) || AVATARS[0], [avatarId]);
  const totalRounds = useMemo(() => (isBoss ? 8 : clamp(4 + levelId, 5, 8)), [isBoss, levelId]);
  const initialTime = useMemo(() => (isBoss ? 94 : 64 + levelId * 6), [isBoss, levelId]);
  const targetScore = useMemo(() => 780 + (levelId * 220) + (isBoss ? 420 : 0), [isBoss, levelId]);

  const [XP, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(initialTime);
  const [roundIndex, setRoundIndex] = useState(1);
  const [lives, setLives] = useState(MAX_LIVES);
  const [combo, setCombo] = useState(0);
  const [round, setRound] = useState<SniperRound>(() => buildRound(levelId, 1, isBoss));
  const [targets, setTargets] = useState<MovingTarget[]>([]);
  const [projectile, setProjectile] = useState<ProjectileModel | null>(null);
  const [shotsFired, setShotsFired] = useState(0);
  const [correctHits, setCorrectHits] = useState(0);
  const [feedback, setFeedback] = useState<FeedbackState | null>(null);
  const [showInstruction, setShowInstruction] = useState(Boolean(isPractice));
  const [showHint, setShowHint] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [resultState, setResultState] = useState<'running' | 'victory' | 'gameover'>('running');
  const [isAiming, setIsAiming] = useState(false);
  const [aimPointer, setAimPointer] = useState<Vec2 | null>(null);
  const [aimVector, setAimVector] = useState<Vec2>({ x: 0, y: -1 });
  const [arenaSize, setArenaSize] = useState({ width: 0, height: 0 });

  const arenaRef = useRef<HTMLDivElement | null>(null);
  const roundStartedAtRef = useRef<number>(Date.now());
  const activeAimPointerIdRef = useRef<number | null>(null);

  const scoreRef = useRef(XP);
  const livesRef = useRef(lives);
  const comboRef = useRef(combo);
  const shotsFiredRef = useRef(shotsFired);
  const correctHitsRef = useRef(correctHits);
  const timeLeftRef = useRef(timeLeft);
  const roundRef = useRef(round);
  const roundIndexRef = useRef(roundIndex);
  const resultStateRef = useRef(resultState);
  const isPausedRef = useRef(isPaused);
  const projectileRef = useRef<ProjectileModel | null>(projectile);
  const targetsRef = useRef<MovingTarget[]>(targets);
  const aimVectorRef = useRef<Vec2>(aimVector);

  const arenaLayout = useMemo(
    () => computeArenaLayout(arenaSize.width, arenaSize.height),
    [arenaSize.height, arenaSize.width],
  );
  const layoutRef = useRef(arenaLayout);

  useEffect(() => { scoreRef.current = XP; }, [XP]);
  useEffect(() => { livesRef.current = lives; }, [lives]);
  useEffect(() => { comboRef.current = combo; }, [combo]);
  useEffect(() => { shotsFiredRef.current = shotsFired; }, [shotsFired]);
  useEffect(() => { correctHitsRef.current = correctHits; }, [correctHits]);
  useEffect(() => { timeLeftRef.current = timeLeft; }, [timeLeft]);
  useEffect(() => { roundRef.current = round; }, [round]);
  useEffect(() => { roundIndexRef.current = roundIndex; }, [roundIndex]);
  useEffect(() => { resultStateRef.current = resultState; }, [resultState]);
  useEffect(() => { isPausedRef.current = isPaused; }, [isPaused]);
  useEffect(() => { projectileRef.current = projectile; }, [projectile]);
  useEffect(() => { targetsRef.current = targets; }, [targets]);
  useEffect(() => { aimVectorRef.current = aimVector; }, [aimVector]);
  useEffect(() => { layoutRef.current = arenaLayout; }, [arenaLayout]);

  const setFeedbackState = useCallback((title: string, detail: string, tone: FeedbackState['tone']) => {
    setFeedback({
      id: Date.now(),
      title,
      detail,
      tone,
    });
  }, []);

  const resolveVictory = useCallback((finalScore: number) => {
    if (resultStateRef.current !== 'running') return;

    setResultState('victory');
    setFeedbackState('Target sequence complete', 'Great tracking and precision under pressure.', 'success');
    triggerHaptic('success');

    const accuracy = shotsFiredRef.current > 0 ? correctHitsRef.current / shotsFiredRef.current : 1;
    const speedRatio = timeLeftRef.current / initialTime;
    const stars = accuracy >= 0.72 && speedRatio >= 0.2 && livesRef.current >= 2
      ? 3
      : accuracy >= 0.45
        ? 2
        : 1;

    window.setTimeout(() => onVictory(stars, Math.max(0, Math.round(finalScore))), 420);
  }, [initialTime, onVictory, setFeedbackState]);

  const resolveGameOver = useCallback((title: string, detail: string) => {
    if (resultStateRef.current !== 'running') return;

    setResultState('gameover');
    setFeedbackState(title, detail, 'error');
    triggerHaptic('error');

    window.setTimeout(() => onGameOver(Math.max(0, Math.round(scoreRef.current))), 360);
  }, [onGameOver, setFeedbackState]);

  const spawnCurrentRoundTargets = useCallback(() => {
    const layout = layoutRef.current;
    if (layout.playfieldRect.width <= 0 || layout.playfieldRect.height <= 0) return;

    const targetRadius = clamp(layout.playfieldRect.width * 0.06, 24, 38);
    const spawned = spawnTargetsWithSpacing(roundRef.current.seeds, layout.playfieldRect, targetRadius);
    setTargets(spawned);
    targetsRef.current = spawned;
  }, []);

  const queueNextRound = useCallback((updatedScore: number) => {
    const nextRoundIndex = roundIndexRef.current + 1;
    if (nextRoundIndex > totalRounds) {
      resolveVictory(updatedScore);
      return;
    }

    setRoundIndex(nextRoundIndex);
    setRound(buildRound(levelId, nextRoundIndex, isBoss));
    roundStartedAtRef.current = Date.now();
    setProjectile(null);
    projectileRef.current = null;
  }, [isBoss, levelId, resolveVictory, totalRounds]);

  const resolveShotMiss = useCallback(() => {
    if (resultStateRef.current !== 'running') return;

    setProjectile(null);
    projectileRef.current = null;
    setCombo(0);
    comboRef.current = 0;

    const remainingLives = livesRef.current - 1;
    setLives(remainingLives);
    livesRef.current = remainingLives;

    if (remainingLives <= 0) {
      resolveGameOver('Launcher disabled', 'No lives remaining. Reset and try a cleaner run.');
      return;
    }

    setFeedbackState('Missed shot', 'No target hit before the projectile left the lane.', 'warning');
    triggerHaptic('warning');
  }, [resolveGameOver, setFeedbackState]);

  const resolveProjectileHit = useCallback((hitTarget: MovingTarget) => {
    if (resultStateRef.current !== 'running') return;

    setProjectile(null);
    projectileRef.current = null;

    const activeRound = roundRef.current;
    if (hitTarget.id === activeRound.correctTargetId) {
      const elapsedSeconds = (Date.now() - roundStartedAtRef.current) / 1000;
      const speedBonus = Math.max(20, Math.round(120 - elapsedSeconds * 14));
      const points = 150 + comboRef.current * 24 + speedBonus;
      const nextScore = scoreRef.current + points;

      setScore(nextScore);
      scoreRef.current = nextScore;
      setCombo((previous) => previous + 1);
      comboRef.current += 1;
      setCorrectHits((previous) => previous + 1);
      correctHitsRef.current += 1;

      setFeedbackState('Correct target', `+${points} points`, 'success');
      triggerHaptic('success');

      window.setTimeout(() => queueNextRound(nextScore), 420);
      return;
    }

    const remainingLives = livesRef.current - 1;
    setLives(remainingLives);
    livesRef.current = remainingLives;
    setCombo(0);
    comboRef.current = 0;

    setFeedbackState('Wrong target', `${hitTarget.label} was not the required decimal.`, 'error');
    triggerHaptic('error');

    if (remainingLives <= 0) {
      resolveGameOver('Mission failed', 'All lives lost from incorrect shots.');
      return;
    }

    window.setTimeout(() => spawnCurrentRoundTargets(), 240);
  }, [queueNextRound, resolveGameOver, setFeedbackState, spawnCurrentRoundTargets]);

  const fireProjectile = useCallback(() => {
    if (resultStateRef.current !== 'running' || isPausedRef.current) return;
    if (projectileRef.current) return;

    const layout = layoutRef.current;
    if (layout.playfieldRect.width <= 0) return;

    const shot = createProjectile(layout.launcherOrigin, aimVectorRef.current, 760);
    projectileRef.current = shot;
    setProjectile(shot);
    setShotsFired((previous) => previous + 1);
    shotsFiredRef.current += 1;
    triggerHaptic('selection');
  }, []);

  const getLocalPoint = useCallback((clientX: number, clientY: number): Vec2 | null => {
    const rect = arenaRef.current?.getBoundingClientRect();
    if (!rect || rect.width <= 0 || rect.height <= 0) return null;
    return {
      x: clamp(clientX - rect.left, 0, rect.width),
      y: clamp(clientY - rect.top, 0, rect.height),
    };
  }, []);

  const handleLauncherPointerDown = useCallback((event: React.PointerEvent<HTMLButtonElement>) => {
    if (resultState !== 'running' || isPaused || projectileRef.current) return;
    event.preventDefault();

    const nextPoint = getLocalPoint(event.clientX, event.clientY);
    if (!nextPoint) return;

    activeAimPointerIdRef.current = event.pointerId;
    const nextAim = buildAimVector(layoutRef.current.launcherOrigin, nextPoint);
    setAimPointer(nextPoint);
    setAimVector(nextAim);
    setIsAiming(true);
  }, [getLocalPoint, isPaused, resultState]);

  const dismissInstruction = useCallback(() => {
    setShowInstruction(false);
    setShowHint(true);
  }, []);

  useEffect(() => {
    setShowInstruction(Boolean(isPractice));
    setShowHint(false);
  }, [isPractice, round.id]);

  useEffect(() => {
    setScore(0);
    setTimeLeft(initialTime);
    setRoundIndex(1);
    setLives(MAX_LIVES);
    setCombo(0);
    setRound(buildRound(levelId, 1, isBoss));
    setTargets([]);
    setProjectile(null);
    setShotsFired(0);
    setCorrectHits(0);
    scoreRef.current = 0;
    livesRef.current = MAX_LIVES;
    comboRef.current = 0;
    shotsFiredRef.current = 0;
    correctHitsRef.current = 0;
    timeLeftRef.current = initialTime;
    setFeedback(null);
    setShowInstruction(Boolean(isPractice));
    setShowHint(false);
    setIsPaused(false);
    setResultState('running');
    setIsAiming(false);
    setAimPointer(null);
    activeAimPointerIdRef.current = null;
    roundStartedAtRef.current = Date.now();
  }, [initialTime, isBoss, isPractice, levelId]);

  useEffect(() => {
    const arenaNode = arenaRef.current;
    if (!arenaNode) return undefined;

    const updateSize = () => {
      const rect = arenaNode.getBoundingClientRect();
      setArenaSize({ width: rect.width, height: rect.height });
    };

    updateSize();

    const observer = new ResizeObserver(() => updateSize());
    observer.observe(arenaNode);

    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (round.id.length === 0) return undefined;
    if (!isPractice) {
      setShowInstruction(false);
      setShowHint(true);
      return undefined;
    }
    setShowInstruction(true);
    setShowHint(false);

    const timerId = window.setTimeout(() => {
      setShowInstruction(false);
      setShowHint(true);
    }, 2000);

    return () => window.clearTimeout(timerId);
  }, [round.id]);

  useEffect(() => {
    if (resultState !== 'running' || isPaused) return undefined;

    const timerId = window.setInterval(() => {
      setTimeLeft((previous) => {
        if (previous <= 1) {
          window.clearInterval(timerId);
          resolveGameOver('Time expired', 'You ran out of time before clearing all rounds.');
          return 0;
        }
        return previous - 1;
      });
    }, 1000);

    return () => window.clearInterval(timerId);
  }, [isPaused, resolveGameOver, resultState]);

  useEffect(() => {
    if (!feedback) return undefined;

    const timeoutId = window.setTimeout(() => setFeedback(null), 1300);
    return () => window.clearTimeout(timeoutId);
  }, [feedback]);

  useEffect(() => {
    if (arenaLayout.playfieldRect.width <= 0 || arenaLayout.playfieldRect.height <= 0) return;
    spawnCurrentRoundTargets();
  }, [arenaLayout.playfieldRect.height, arenaLayout.playfieldRect.width, round.id, spawnCurrentRoundTargets]);

  useEffect(() => {
    if (!isAiming) return undefined;

    const handlePointerMove = (event: PointerEvent) => {
      if (activeAimPointerIdRef.current !== null && event.pointerId !== activeAimPointerIdRef.current) return;
      const point = getLocalPoint(event.clientX, event.clientY);
      if (!point) return;
      setAimPointer(point);
      setAimVector(buildAimVector(layoutRef.current.launcherOrigin, point));
    };

    const handlePointerUp = (event: PointerEvent) => {
      if (activeAimPointerIdRef.current !== null && event.pointerId !== activeAimPointerIdRef.current) return;
      activeAimPointerIdRef.current = null;
      setIsAiming(false);
      setAimPointer(null);
      fireProjectile();
    };

    const handlePointerCancel = (event: PointerEvent) => {
      if (activeAimPointerIdRef.current !== null && event.pointerId !== activeAimPointerIdRef.current) return;
      activeAimPointerIdRef.current = null;
      setIsAiming(false);
      setAimPointer(null);
    };

    const handleWindowBlur = () => {
      activeAimPointerIdRef.current = null;
      setIsAiming(false);
      setAimPointer(null);
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
    window.addEventListener('pointercancel', handlePointerCancel);
    window.addEventListener('blur', handleWindowBlur);

    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
      window.removeEventListener('pointercancel', handlePointerCancel);
      window.removeEventListener('blur', handleWindowBlur);
    };
  }, [fireProjectile, getLocalPoint, isAiming]);

  useEffect(() => {
    let rafId = 0;
    let previousTime = performance.now();

    const tick = (timestamp: number) => {
      const deltaSeconds = Math.min(0.032, (timestamp - previousTime) / 1000);
      previousTime = timestamp;

      if (resultStateRef.current === 'running' && !isPausedRef.current && layoutRef.current.playfieldRect.width > 0) {
        const movedTargets = updateTargetsInBounds(targetsRef.current, layoutRef.current.playfieldRect, deltaSeconds);
        targetsRef.current = movedTargets;
        setTargets(movedTargets);

        const activeProjectile = projectileRef.current;
        if (activeProjectile) {
          const movedProjectile = updateProjectile(activeProjectile, deltaSeconds);
          const hitTarget = findProjectileCollision(movedProjectile, movedTargets);

          if (hitTarget) {
            resolveProjectileHit(hitTarget);
          } else if (isProjectileOutOfPlayfield(movedProjectile, layoutRef.current.playfieldRect)) {
            resolveShotMiss();
          } else {
            projectileRef.current = movedProjectile;
            setProjectile(movedProjectile);
          }
        }
      }

      rafId = window.requestAnimationFrame(tick);
    };

    rafId = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(rafId);
  }, [resolveProjectileHit, resolveShotMiss]);

  const accuracy = shotsFired > 0 ? Math.round((correctHits / shotsFired) * 100) : 100;
  const progress = Math.min(
    100,
    Math.max(((roundIndex - 1) / totalRounds) * 100, (XP / targetScore) * 100),
  );

  const aimAngle = Math.atan2(aimVector.y, aimVector.x) * (180 / Math.PI);

  const objectiveArea = (
    <div className="licensed-board-frame structured-playfield-frame flex flex-col gap-2 p-3 md:gap-3 md:p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-[10px] font-black uppercase tracking-[0.2em] text-cyan-100/75">Objective</div>
          <div className="game-question-copy text-white md:text-lg">{formatFantasyPrompt(round.prompt)}</div>
          <p className="mt-1 text-[11px] font-semibold text-white/75 md:text-xs">{round.sublabel}</p>
        </div>
        <button
          type="button"
          onClick={() => setIsPaused((previous) => !previous)}
          className="ui-button-primary rounded-lg px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.14em] text-white md:px-4 md:py-2 md:text-xs"
        >
          {isPaused ? 'Resume' : 'Pause'}
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-2 text-[10px] font-black uppercase tracking-[0.14em] md:text-xs">
        <span className="licensed-slice-cyan-pill rounded-full px-2.5 py-1 text-white">Accuracy {accuracy}%</span>
      </div>
    </div>
  );

  const playFieldArea = (
    <div ref={arenaRef} className="relative h-full w-full overflow-hidden">
      <div className="pointer-events-none absolute inset-0">
        <div
          className="absolute left-0 right-0 border-b border-white/10 bg-slate-900/36"
          style={{ height: `${arenaLayout.topZoneHeight}px` }}
        />
        <div
          className="absolute left-0 right-0 border-t border-white/12 bg-slate-950/42"
          style={{
            top: `${Math.max(0, arenaSize.height - arenaLayout.bottomZoneHeight)}px`,
            height: `${arenaLayout.bottomZoneHeight}px`,
          }}
        />
        <div
          className="absolute rounded-[1.2rem] border border-cyan-100/20 bg-[linear-gradient(180deg,rgba(14,116,144,0.08),rgba(8,47,73,0.08))] licensed-grid-backdrop"
          style={{
            left: `${arenaLayout.playfieldRect.x}px`,
            top: `${arenaLayout.playfieldRect.y}px`,
            width: `${arenaLayout.playfieldRect.width}px`,
            height: `${arenaLayout.playfieldRect.height}px`,
          }}
        />
      </div>

      <AnimatePresence>
        {showInstruction && (
          <motion.button
            key="instruction-card"
            type="button"
            onClick={dismissInstruction}
            initial={{ opacity: 0, y: -8, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.96 }}
            className="absolute left-1/2 z-20 w-[min(92%,30rem)] -translate-x-1/2 rounded-2xl border border-cyan-100/30 bg-slate-900/85 px-4 py-3 text-center shadow-[0_12px_30px_rgba(2,6,23,0.45)]"
            style={{ top: `${Math.max(8, arenaLayout.sidePadding * 0.8)}px` }}
          >
            <div className="text-[10px] font-black uppercase tracking-[0.18em] text-cyan-100/80">Mission Briefing</div>
            <div className="mt-1 text-sm font-black text-white">Drag to aim, release to fire.</div>
            <p className="mt-1 text-[11px] font-semibold text-white/75">Hit the decimal that matches the objective.</p>
          </motion.button>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showHint && !showInstruction && (
          <motion.div
            key="floating-hint"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="pointer-events-none absolute z-10 rounded-full border border-white/12 bg-slate-900/52 px-3 py-1 text-[10px] font-black uppercase tracking-[0.12em] text-white/75"
            style={{ top: `${Math.max(10, arenaLayout.topZoneHeight - 34)}px`, left: `${arenaLayout.sidePadding + 4}px` }}
          >
            Drag launcher to aim
          </motion.div>
        )}
      </AnimatePresence>

      {targets.map((target) => {
        const left = toPercentX(target.x, arenaSize.width);
        const top = toPercentY(target.y, arenaSize.height);

        return (
          <motion.div
            key={target.id}
            className={`absolute z-10 flex select-none items-center justify-center rounded-full border text-sm font-black shadow-[0_8px_24px_rgba(2,6,23,0.35)] md:text-base ${paletteStyles[target.palette]}`}
            style={{
              left: `${left}%`,
              top: `${top}%`,
              width: `${target.radius * 2}px`,
              height: `${target.radius * 2}px`,
              transform: 'translate(-50%, -50%)',
            }}
            animate={{ scale: [1, 1.03, 1] }}
            transition={{ duration: 1.3, repeat: Infinity, ease: 'easeInOut' }}
          >
            {target.label}
          </motion.div>
        );
      })}

      {projectile && (
        <div
          className="absolute z-20 rounded-full border border-amber-100/80 bg-amber-300/85 shadow-[0_0_20px_rgba(251,191,36,0.55)]"
          style={{
            left: `${toPercentX(projectile.x, arenaSize.width)}%`,
            top: `${toPercentY(projectile.y, arenaSize.height)}%`,
            width: `${projectile.radius * 2}px`,
            height: `${projectile.radius * 2}px`,
            transform: 'translate(-50%, -50%)',
          }}
        />
      )}

      {isAiming && aimPointer && (
        <div
          className="pointer-events-none absolute z-20 origin-left border-t-2 border-dashed border-cyan-100/75"
          style={{
            left: `${arenaLayout.launcherOrigin.x}px`,
            top: `${arenaLayout.launcherOrigin.y}px`,
            width: `${Math.hypot(aimPointer.x - arenaLayout.launcherOrigin.x, aimPointer.y - arenaLayout.launcherOrigin.y)}px`,
            transform: `rotate(${aimAngle}deg)`,
          }}
        />
      )}

      <div
        className="absolute z-20"
        style={{
          left: `${arenaLayout.launcherOrigin.x}px`,
          top: `${arenaLayout.launcherOrigin.y}px`,
          transform: 'translate(-50%, -50%)',
        }}
      >
        <div
          className="pointer-events-none absolute left-1/2 top-1/2 h-16 w-3 -translate-x-1/2 -translate-y-[92%] rounded-full bg-[linear-gradient(180deg,rgba(125,211,252,0.96),rgba(2,132,199,0.9))] shadow-[0_8px_20px_rgba(14,116,144,0.4)]"
          style={{ transform: `translate(-50%, -92%) rotate(${aimAngle + 90}deg)` }}
        />

        <button
          type="button"
          onPointerDown={handleLauncherPointerDown}
          disabled={resultState !== 'running' || isPaused || Boolean(projectile)}
          className="relative h-20 w-20 touch-none rounded-full border border-cyan-100/45 bg-[radial-gradient(circle_at_35%_28%,rgba(186,230,253,0.95),rgba(14,116,144,0.9)_58%,rgba(8,47,73,0.96))] shadow-[0_10px_24px_rgba(3,37,65,0.45)] disabled:opacity-50"
          aria-label="Drag to aim and release to fire"
        >
          <div className="absolute inset-[22%] rounded-full border border-white/35" />
          <div className="absolute inset-0 flex items-center justify-center text-cyan-50">
            <span className="text-sm font-black">+</span>
          </div>
        </button>

        <div className="pointer-events-none mt-2 text-center text-[10px] font-black uppercase tracking-[0.14em] text-white/75">
          Drag and release
        </div>
      </div>
    </div>
  );

  const feedbackLayer = (
    <AnimatePresence>
      {feedback && (
        <motion.div
          key={feedback.id}
          initial={{ opacity: 0, y: 12, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -8, scale: 0.96 }}
          className="pointer-events-none absolute inset-x-0 bottom-3 z-30 flex justify-center px-3 md:bottom-4"
        >
          <div
            className={`max-w-xl rounded-full border px-4 py-2 text-center shadow-[0_14px_28px_rgba(2,6,23,0.45)] md:px-5 md:py-2.5 ${
              feedback.tone === 'success'
                ? 'border-emerald-200/55 bg-emerald-500/32 text-emerald-50'
                : feedback.tone === 'error'
                  ? 'border-rose-200/55 bg-rose-500/30 text-amber-50'
                  : 'border-amber-200/55 bg-amber-500/28 text-amber-50'
            }`}
          >
            <div className="text-xs font-black uppercase tracking-[0.16em]">{feedback.title}</div>
            <div className="text-[11px] font-semibold md:text-xs">{feedback.detail}</div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );

  return (
    <GameContainerView
      gameType="place_value_peaks"
      title="Decimal Sniper"
      avatar={avatar}
      XP={XP}
      targetScore={targetScore}
      timeLeft={timeLeft}
      progress={progress}
      statLabel="Accuracy"
      statValue={`${accuracy}%`}
      objectiveArea={objectiveArea}
      playFieldArea={playFieldArea}
      feedbackLayer={feedbackLayer}
      isPaused={isPaused}
      onResume={() => setIsPaused(false)}
      onBack={onBack}
    />
  );
};

export default DecimalSniperGame;
