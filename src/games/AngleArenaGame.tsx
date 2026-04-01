import React, { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Crosshair } from 'lucide-react';
import GameplaySceneBackdrop from '../components/GameplaySceneBackdrop';
import {
  emitMiniGameSessionEvent,
  MiniGameShellContractProps,
} from '../app/gameplaySessionContract';
import { triggerHaptic } from '../haptics';

interface AngleArenaGameProps {
  levelId: number;
  avatarId: string;
  useSharedTopHud?: boolean;
  onVictory: (stars: number, XP: number) => void;
  onGameOver: (XP: number) => void;
  onBack: () => void;
}

type AngleArenaGameShellProps = AngleArenaGameProps & MiniGameShellContractProps;

type ShotOutcome = 'hit' | 'near' | 'miss';
type ShotState = 'idle' | 'launching';

type ChallengeKind = 'direct_degree' | 'angle_type' | 'reasoning';

interface AngleChallenge {
  id: number;
  prompt: string;
  targetAngle: number;
  kind: ChallengeKind;
  options: number[];
}

interface ActiveShot {
  id: number;
  outcome: ShotOutcome;
  endY: string;
  travelX: string;
}

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));
const randomInt = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;

const scoreToStars = (XP: number, correct: number, attempts: number) => {
  const accuracy = attempts > 0 ? correct / attempts : 0;
  if (XP >= 2600 && accuracy >= 0.85) return 3;
  if (XP >= 1600 && accuracy >= 0.65) return 2;
  return 1;
};

const targetCorrectByLevel = (levelId: number) => Math.min(12, Math.max(6, 6 + Math.floor(levelId / 2)));

const angleTypePrompt = (target: number) => {
  if (target < 90) {
    return {
      prompt: target < 50
        ? `Choose the acute angle of ${target} degrees.`
        : 'Choose an acute angle from the options.',
      kind: 'angle_type' as const,
    };
  }

  if (target === 90) {
    return {
      prompt: 'Select the right angle (90 degrees).',
      kind: 'angle_type' as const,
    };
  }

  return {
    prompt: target > 130
      ? `Choose the obtuse angle of ${target} degrees.`
      : 'Pick an obtuse angle from the options.',
    kind: 'angle_type' as const,
  };
};

const buildReasoningPrompt = (difficulty: number) => {
  const base = randomInt(25, 145);

  if (difficulty % 2 === 0) {
    const supplement = 180 - base;
    return {
      prompt: `The marked angle is ${base} degrees. Choose the angle on the same straight line.`,
      targetAngle: supplement,
      kind: 'reasoning' as const,
    };
  }

  const extra = randomInt(10, 40);
  const answer = clamp(base + extra, 10, 170);
  return {
    prompt: `Choose the angle that is ${extra} degrees more than ${base} degrees.`,
    targetAngle: answer,
    kind: 'reasoning' as const,
  };
};

const challengeKindForLevel = (levelId: number): ChallengeKind => {
  if (levelId <= 2) return 'direct_degree';
  if (levelId <= 4) return 'angle_type';
  return 'reasoning';
};

const buildChallenge = (levelId: number, solvedCount: number): AngleChallenge => {
  const difficulty = Math.max(1, levelId + Math.floor(solvedCount / 2));
  const challengeKind = challengeKindForLevel(levelId);

  let targetAngle = randomInt(20, 160);
  let prompt = `Choose the angle of ${targetAngle} degrees.`;
  let kind: ChallengeKind = challengeKind;

  if (challengeKind === 'reasoning') {
    const reasoning = buildReasoningPrompt(difficulty);
    targetAngle = reasoning.targetAngle;
    prompt = reasoning.prompt;
    kind = reasoning.kind;
  } else if (challengeKind === 'angle_type') {
    if (difficulty >= 8) {
      const options = [30, 45, 60, 75, 90, 105, 120, 135, 150];
      targetAngle = options[randomInt(0, options.length - 1)];
    }

    const typePrompt = angleTypePrompt(targetAngle);
    prompt = typePrompt.prompt;
    kind = typePrompt.kind;
  }

  const optionPool = new Set<number>([targetAngle]);
  const offsets = [10, 15, 20, 25, 30, 35];
  while (optionPool.size < 4) {
    const offset = offsets[randomInt(0, offsets.length - 1)];
    const direction = Math.random() > 0.5 ? 1 : -1;
    const candidate = clamp(targetAngle + (offset * direction), 10, 170);
    optionPool.add(candidate);
  }
  const options = Array.from(optionPool).sort(() => Math.random() - 0.5).slice(0, 4);

  return {
    id: Date.now() + Math.floor(Math.random() * 1000),
    prompt,
    targetAngle,
    kind,
    options,
  };
};

const AngleArenaGame: React.FC<AngleArenaGameShellProps> = ({
  levelId,
  avatarId: _avatarId,
  useSharedTopHud: _useSharedTopHud = true,
  onVictory,
  onGameOver,
  onBack: _onBack,
  sessionState,
  sessionEvents,
}) => {
  const [challenge, setChallenge] = useState<AngleChallenge>(() => buildChallenge(levelId, 0));
  const [shotState, setShotState] = useState<ShotState>('idle');
  const [activeShot, setActiveShot] = useState<ActiveShot | null>(null);
  const [feedback, setFeedback] = useState<ShotOutcome | null>(null);
  const [correctCount, setCorrectCount] = useState(0);
  const [attempts, setAttempts] = useState(0);
  const [XP, setScore] = useState(0);
  const [Combo, setStreak] = useState(0);
  const [didComplete, setDidComplete] = useState(false);
  const [didFail, setDidFail] = useState(false);
  const [selectedAngle, setSelectedAngle] = useState<number | null>(null);

  const playfieldRef = useRef<HTMLDivElement | null>(null);
  const timeoutIdsRef = useRef<number[]>([]);
  const shotIdRef = useRef(0);

  const targetCorrect = useMemo(() => targetCorrectByLevel(levelId), [levelId]);
  const timeLeft = sessionState?.timeLeft ?? 1;
  const lives = sessionState?.lives ?? 3;
  const isSessionActive = sessionState ? timeLeft > 0 && lives > 0 : true;

  const clearQueuedTimeouts = () => {
    timeoutIdsRef.current.forEach((timeoutId) => window.clearTimeout(timeoutId));
    timeoutIdsRef.current = [];
  };

  const queueTimeout = (fn: () => void, delay: number) => {
    const timeoutId = window.setTimeout(fn, delay);
    timeoutIdsRef.current.push(timeoutId);
  };

  const advanceChallenge = (nextSolvedCount: number) => {
    setChallenge(buildChallenge(levelId, nextSolvedCount));
    setShotState('idle');
    setActiveShot(null);
    setFeedback(null);
    setSelectedAngle(null);
  };

  const completeRun = (finalScore: number, finalCorrect: number, finalAttempts: number) => {
    if (didComplete) return;
    setDidComplete(true);
    const stars = scoreToStars(finalScore, finalCorrect, finalAttempts);

    emitMiniGameSessionEvent(sessionEvents, 'game_complete', {
      XP: finalScore,
      stars,
      metadata: {
        correctCount: finalCorrect,
        attempts: finalAttempts,
      },
    });

    onVictory(stars, finalScore);
  };

  useEffect(() => () => clearQueuedTimeouts(), []);

  useEffect(() => {
    if (!sessionState) return;
    if (sessionState.timeLeft !== sessionState.totalTime) return;

    clearQueuedTimeouts();
    setChallenge(buildChallenge(levelId, 0));
    setShotState('idle');
    setActiveShot(null);
    setFeedback(null);
    setCorrectCount(0);
    setAttempts(0);
    setScore(0);
    setStreak(0);
    setDidComplete(false);
    setDidFail(false);
    setSelectedAngle(null);
  }, [levelId, sessionState, sessionState?.timeLeft, sessionState?.totalTime]);

  useEffect(() => {
    if (!sessionState || didComplete || didFail) return;
    if (isSessionActive) return;

    setDidFail(true);
    emitMiniGameSessionEvent(sessionEvents, 'game_failed', {
      XP,
      reason: lives <= 0 ? 'lives' : 'time',
    });
    onGameOver(XP);
  }, [didComplete, didFail, isSessionActive, lives, onGameOver, XP, sessionEvents, sessionState]);

  const handleFire = (angleChoice: number) => {
    if (!isSessionActive || didComplete || didFail || shotState === 'launching') return;

    setSelectedAngle(angleChoice);
    const error = Math.abs(angleChoice - challenge.targetAngle);
    const isCorrect = angleChoice === challenge.targetAngle;
    const isNear = !isCorrect && error <= 5;
    const outcome: ShotOutcome = isCorrect ? 'hit' : isNear ? 'near' : 'miss';

    shotIdRef.current += 1;
    const shot: ActiveShot = {
      id: shotIdRef.current,
      outcome,
      endY: outcome === 'hit' ? '44%' : outcome === 'near' ? '56%' : '63%',
      travelX: outcome === 'hit' ? '82%' : outcome === 'near' ? '77%' : '71%',
    };

    setShotState('launching');
    setActiveShot(shot);
    setFeedback(null);

    queueTimeout(() => {
      const nextAttempts = attempts + 1;
      setAttempts(nextAttempts);

      if (outcome === 'hit') {
        const nextCorrect = correctCount + 1;
        const bonus = Math.min(5, Combo + 1) * 22;
        const gained = 150 + (levelId * 8) + bonus;
        const nextScore = XP + gained;

        setCorrectCount(nextCorrect);
        setScore(nextScore);
        setStreak((previous) => previous + 1);
        setFeedback('hit');

        emitMiniGameSessionEvent(sessionEvents, 'correct_answer', {
          XP,
          metadata: {
            scoreAfter: nextScore,
            scoreDelta: gained,
            selectedAngle: angleChoice,
            targetAngle: challenge.targetAngle,
          },
        });

        emitMiniGameSessionEvent(sessionEvents, 'puzzle_complete', {
          XP: nextScore,
          metadata: {
            challengeKind: challenge.kind,
            selectedAngle: angleChoice,
            targetAngle: challenge.targetAngle,
          },
        });

        triggerHaptic('success');

        queueTimeout(() => {
          if (nextCorrect >= targetCorrect) {
            completeRun(nextScore, nextCorrect, nextAttempts);
            return;
          }
          advanceChallenge(nextCorrect);
        }, 620);

        return;
      }

      setFeedback(outcome);
      setStreak(0);
      emitMiniGameSessionEvent(sessionEvents, 'incorrect_answer', {
        XP,
        metadata: {
          challengeKind: challenge.kind,
          selectedAngle: angleChoice,
          targetAngle: challenge.targetAngle,
          missBy: error,
        },
      });
      triggerHaptic('error');

      queueTimeout(() => {
        advanceChallenge(correctCount);
      }, 560);
    }, 760);
  };

  const parallaxDrive = shotState === 'launching' ? 1 : 0;

  return (
    <div className="relative h-full w-full overflow-hidden">
      <GameplaySceneBackdrop gameType="angle_arena" />
      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(4,12,30,0.24)_0%,rgba(4,12,30,0.3)_58%,rgba(4,12,30,0.45)_100%)]" />

      <div className="relative z-10 flex h-full min-h-0 flex-col px-3 pb-2 pt-1.5 md:px-4">
        <div className="shrink-0 pt-1 text-center">
          <div className="mx-auto inline-flex max-w-[98%] items-center justify-center rounded-full border border-cyan-200/45 bg-slate-900/52 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.18em] text-cyan-50 shadow-[0_8px_20px_rgba(8,145,178,0.34)] md:text-xs">
            {challenge.prompt}
          </div>
          <div className="mt-1 inline-flex items-center gap-2 rounded-full border border-white/20 bg-slate-950/45 px-3 py-1 text-[10px] font-black uppercase tracking-[0.13em] text-white/90 md:text-[11px]">
            <span>Shots solved {correctCount}/{targetCorrect}</span>
            <span className="text-amber-200">
              {challenge.kind === 'direct_degree' ? 'Direct aim' : challenge.kind === 'angle_type' ? 'Angle type' : 'Reasoning'}
            </span>
          </div>
        </div>

        <div className="relative mt-2 flex min-h-0 flex-1 flex-col">
          <div
            ref={playfieldRef}
            className="relative min-h-0 flex-1 overflow-hidden rounded-[1.45rem] border border-cyan-200/18 bg-[linear-gradient(180deg,rgba(4,14,42,0.22),rgba(4,14,42,0.32))]"
          >
            <motion.div
              animate={{ x: parallaxDrive ? -18 : 0 }}
              transition={{ duration: 0.72, ease: 'easeOut' }}
              className="absolute inset-x-0 bottom-[51%] h-[24%] bg-[radial-gradient(ellipse_at_center,rgba(125,211,252,0.45),rgba(30,58,138,0)_72%)]"
            />
            <motion.div
              animate={{ x: parallaxDrive ? -34 : 0 }}
              transition={{ duration: 0.72, ease: 'easeOut' }}
              className="absolute inset-x-[-12%] bottom-[18%] h-[34%] bg-[linear-gradient(180deg,rgba(30,64,175,0.0),rgba(30,64,175,0.28)_44%,rgba(15,23,42,0.3)_100%)]"
            />
            <motion.div
              animate={{ x: parallaxDrive ? -66 : 0 }}
              transition={{ duration: 0.72, ease: 'easeOut' }}
              className="absolute inset-x-[-14%] bottom-[8%] h-[18%] bg-[linear-gradient(180deg,rgba(56,189,248,0.12),rgba(14,116,144,0.34))]"
            />

            <div className="absolute inset-x-[6%] bottom-[19%] h-[2px] rounded-full bg-cyan-100/28" />

            <div className="absolute left-[4.5%] bottom-[11.5%] h-[27%] w-[26%] rounded-t-[1.4rem] border border-amber-200/30 bg-[linear-gradient(180deg,rgba(51,65,85,0.84),rgba(15,23,42,0.94))] shadow-[0_12px_22px_rgba(2,6,23,0.4)]" />

            <div className="absolute left-[15%] bottom-[13.5%] h-[40%] w-[40%]">
              <div
                className="pointer-events-none absolute inset-0 rounded-full border border-cyan-200/45"
                style={{ clipPath: 'inset(0 0 50% 0)' }}
              />
              {[30, 60, 90, 120, 150].map((mark) => {
                const rad = (mark * Math.PI) / 180;
                const radius = 45;
                const x = 50 + (Math.cos(rad) * radius);
                const y = 50 - (Math.sin(rad) * radius);
                return (
                  <div
                    key={mark}
                    className="pointer-events-none absolute h-3 w-[2px] -translate-x-1/2 -translate-y-1/2 rounded bg-cyan-100/80"
                    style={{ left: `${x}%`, top: `${y}%` }}
                  />
                );
              })}

              <motion.div
                animate={{ rotate: -Math.max(10, Math.min(170, selectedAngle ?? 60)) }}
                transition={{ type: 'spring', stiffness: 220, damping: 26 }}
                className="pointer-events-none absolute left-1/2 top-1/2 h-[10px] w-[58%] -translate-x-[2px] -translate-y-1/2 rounded-full border border-amber-300/58 bg-[linear-gradient(90deg,rgba(217,119,6,0.95),rgba(251,191,36,0.98),rgba(254,243,199,0.96))] shadow-[0_0_12px_rgba(251,191,36,0.4)]"
                style={{ transformOrigin: '0% 50%' }}
              />

              <div className="pointer-events-none absolute left-1/2 top-1/2 h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full border border-amber-200/70 bg-amber-300" />
            </div>

            <div className="absolute left-[10%] bottom-[3.5%] inline-flex items-center gap-1 rounded-full border border-cyan-100/35 bg-slate-950/58 px-3 py-1.5 text-xs font-black text-cyan-100 shadow-[0_8px_16px_rgba(2,6,23,0.38)] md:text-sm">
              <Crosshair className="h-4 w-4 text-cyan-200" />
              {selectedAngle ?? '--'}{"\u00B0"}
            </div>

            <div className="absolute right-[7.5%] bottom-[11%] flex h-[26%] w-[17%] items-end justify-center">
              <motion.div
                animate={feedback === 'hit' ? { scale: [1, 1.15, 0.98, 1], y: [0, -4, 0] } : { scale: 1, y: 0 }}
                transition={{ duration: 0.45 }}
                className="relative flex h-full w-full items-end justify-center rounded-[1.2rem] border-2 border-rose-200/65 bg-[linear-gradient(180deg,rgba(127,29,29,0.7),rgba(69,10,10,0.84))] shadow-[0_0_24px_rgba(244,63,94,0.35)]"
              >
                <div className="mb-2 text-center text-[10px] font-black uppercase tracking-[0.12em] text-rose-100/90">Enemy</div>
                {feedback === 'hit' ? (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.5 }}
                    animate={{ opacity: 1, scale: 1.1 }}
                    className="pointer-events-none absolute -top-3 rounded-full border border-amber-200/70 bg-amber-300/85 px-2 py-1 text-[9px] font-black uppercase tracking-[0.12em] text-amber-900"
                  >
                    Knockout!
                  </motion.div>
                ) : null}
              </motion.div>
            </div>

            <AnimatePresence>
              {activeShot ? (
                <motion.div
                  key={activeShot.id}
                  initial={{ left: '21%', top: '72%', scale: 0.95, opacity: 0.9 }}
                  animate={{
                    left: activeShot.travelX,
                    top: ['72%', '40%', activeShot.endY],
                    scale: [0.95, 1.05, 0.9],
                    opacity: [0.92, 1, 0.98],
                  }}
                  exit={{ opacity: 0, scale: 0.65 }}
                  transition={{ duration: 0.75, ease: 'easeOut' }}
                  className="pointer-events-none absolute z-30 h-4 w-4 rounded-full border border-cyan-50 bg-cyan-100 shadow-[0_0_14px_rgba(186,230,253,0.95)]"
                >
                  <motion.div
                    animate={{ opacity: [0.15, 0.6, 0.15], scale: [0.6, 1.1, 0.6] }}
                    transition={{ duration: 0.55, repeat: Infinity, ease: 'easeOut' }}
                    className="absolute -inset-1 rounded-full bg-cyan-200/45 blur-[2px]"
                  />
                </motion.div>
              ) : null}
            </AnimatePresence>

            <AnimatePresence>
              {feedback ? (
                <motion.div
                  initial={{ opacity: 0, y: -8, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -8, scale: 0.95 }}
                  className={`pointer-events-none absolute left-1/2 top-[8%] -translate-x-1/2 rounded-full border px-3 py-1.5 text-[11px] font-black uppercase tracking-[0.13em] shadow-[0_10px_20px_rgba(2,6,23,0.36)] md:text-xs ${feedback === 'hit' ? 'border-emerald-100/70 bg-emerald-500 text-white' : feedback === 'near' ? 'border-amber-100/70 bg-amber-500 text-slate-950' : 'border-rose-100/70 bg-rose-500 text-white'}`}
                >
                  {feedback === 'hit' ? 'Perfect shot' : feedback === 'near' ? 'Near miss' : 'Missed'}
                </motion.div>
              ) : null}
            </AnimatePresence>
          </div>
        </div>

        <div className="mt-2 shrink-0">
          <div className="mx-auto grid w-full max-w-[44rem] grid-rows-[auto_auto] gap-2 rounded-[1.15rem] border border-cyan-100/22 bg-slate-950/54 px-2.5 py-2 md:gap-3 md:px-3">
            <div className="text-center text-[10px] font-black uppercase tracking-[0.14em] text-cyan-100 md:text-[11px]">
              Choose the correct angle to fire
            </div>
            <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
              {challenge.options.map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => handleFire(option)}
                  disabled={shotState === 'launching' || !isSessionActive || didComplete || didFail}
                  className="inline-flex min-h-[2.6rem] items-center justify-center rounded-full border border-cyan-100/32 bg-[linear-gradient(180deg,rgba(14,116,144,0.55),rgba(15,23,42,0.85))] px-3 py-2 text-[0.78rem] font-black uppercase tracking-[0.12em] text-cyan-50 shadow-[0_10px_18px_rgba(2,6,23,0.4)] transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-55 md:min-h-[3rem] md:text-sm"
                >
                  {option}{"\u00B0"}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AngleArenaGame;
