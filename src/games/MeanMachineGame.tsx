import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import {
  AlertTriangle,
  CheckCircle2,
  RotateCcw,
  Trophy,
  WandSparkles,
} from 'lucide-react';
import slotMachineImage from '../assets/redoslot.png';
import { GameplaySessionEventHandlers, GameplaySessionState } from '../app/gameplaySessionContract';

type RoundMode = 'mean' | 'missing';
type GameState = 'idle' | 'spinning' | 'answering' | 'resolved';

interface RoundData {
  mode: RoundMode;
  visibleValues: Array<number | null>;
  actualValues: number[];
  targetMean: number;
  correctAnswer: number;
  options: number[];
  supportText: string;
}

interface MeanMachineGameProps {
  levelId: number;
  avatarId: string;
  useSharedTopHud?: boolean;
  onVictory: (stars: number, XP: number) => void;
  onGameOver: (XP: number) => void;
  onBack: () => void;
  sessionState?: GameplaySessionState;
  sessionEvents?: GameplaySessionEventHandlers;
}

const TOTAL_LEVELS = 10;
const REEL_COUNT = 5;

const shuffle = <T,>(values: T[]): T[] => {
  const next = [...values];
  for (let index = next.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [next[index], next[swapIndex]] = [next[swapIndex], next[index]];
  }
  return next;
};

const randomInt = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;

const scoreToStars = (XP: number) => {
  if (XP >= 2400) return 3;
  if (XP >= 1700) return 2;
  return 1;
};

const buildMeanRound = (level: number): RoundData => {
  const useDoubleDigits = level >= 3;
  const minValue = useDoubleDigits ? 8 : 1;
  const maxValue = useDoubleDigits ? 26 + level : 9 + level;
  const targetMean = useDoubleDigits ? randomInt(10, 18 + level) : randomInt(3, 10);

  let coreValues: number[] = [];
  let total = 0;
  for (let index = 0; index < REEL_COUNT - 1; index += 1) {
    const value = randomInt(minValue, maxValue);
    coreValues.push(value);
    total += value;
  }

  let finalValue = targetMean * REEL_COUNT - total;
  while (finalValue < minValue || finalValue > maxValue) {
    coreValues = [];
    total = 0;
    for (let index = 0; index < REEL_COUNT - 1; index += 1) {
      const value = randomInt(minValue, maxValue);
      coreValues.push(value);
      total += value;
    }
    finalValue = targetMean * REEL_COUNT - total;
  }

  const actualValues = shuffle([...coreValues, finalValue]);
  const optionCount = level <= 2 ? 3 : 4;
  const options = new Set<number>([targetMean]);
  while (options.size < optionCount) {
    const candidate = targetMean + randomInt(useDoubleDigits ? -6 : -3, useDoubleDigits ? 6 : 3);
    if (candidate > 0) options.add(candidate);
  }

  return {
    mode: 'mean',
    visibleValues: actualValues,
    actualValues,
    targetMean,
    correctAnswer: targetMean,
    options: shuffle(Array.from(options)),
    supportText: 'Spin 5 reels, add the numbers, then divide by 5.',
  };
};

const buildMissingRound = (level: number): RoundData => {
  const useDoubleDigits = level >= 8;
  const minValue = useDoubleDigits ? 12 : 4;
  const maxValue = useDoubleDigits ? 34 : 18 + level * 2;
  const targetMean = useDoubleDigits ? randomInt(14, 24) : randomInt(6, 15);
  const missingIndex = randomInt(1, REEL_COUNT - 2);

  let visibleValues: number[] = [];
  let total = 0;
  for (let index = 0; index < REEL_COUNT - 1; index += 1) {
    const value = randomInt(minValue, maxValue);
    visibleValues.push(value);
    total += value;
  }

  let missingValue = targetMean * REEL_COUNT - total;
  while (missingValue < minValue || missingValue > maxValue) {
    visibleValues = [];
    total = 0;
    for (let index = 0; index < REEL_COUNT - 1; index += 1) {
      const value = randomInt(minValue, maxValue);
      visibleValues.push(value);
      total += value;
    }
    missingValue = targetMean * REEL_COUNT - total;
  }

  const actualValues = [...visibleValues];
  actualValues.splice(missingIndex, 0, missingValue);
  const visible = actualValues.map((value, index) => (index === missingIndex ? null : value));

  const options = new Set<number>([missingValue]);
  while (options.size < 4) {
    const candidate = missingValue + randomInt(-7, 7);
    if (candidate > 0) options.add(candidate);
  }

  return {
    mode: 'missing',
    visibleValues: visible,
    actualValues,
    targetMean,
    correctAnswer: missingValue,
    options: shuffle(Array.from(options)),
    supportText: 'One reel is missing. Pick the value that repairs the target mean.',
  };
};

const buildRound = (level: number) => (level <= 4 ? buildMeanRound(level) : buildMissingRound(level));

const ReelWindow: React.FC<{
  value: number | string;
  spinning: boolean;
  isMissing?: boolean;
  isCorrectPulse?: boolean;
  isErrorPulse?: boolean;
}> = ({ value, spinning, isMissing = false, isCorrectPulse = false, isErrorPulse = false }) => (
  <motion.div
    animate={spinning
      ? { y: [0, -5, 0, 5, 0], scale: [1, 1.02, 1] }
      : isCorrectPulse
        ? { y: [0, -4, 0], scale: [1, 1.08, 1] }
        : isErrorPulse
          ? { x: [0, -5, 5, -4, 4, 0], scale: [1, 0.98, 1] }
          : { y: 0, scale: 1 }}
    transition={spinning ? { duration: 0.16, repeat: Infinity, ease: 'linear' } : { duration: 0.35 }}
    className={`relative flex h-[2.8rem] items-center justify-center overflow-hidden rounded-[0.8rem] border shadow-[inset_0_1px_0_rgba(255,255,255,0.1),0_10px_18px_rgba(2,6,23,0.24)] md:h-[3rem] ${
      isMissing
        ? 'border-amber-200/70 bg-[linear-gradient(180deg,rgba(250,204,21,0.22),rgba(245,158,11,0.1))]'
        : 'border-cyan-100/24 bg-[linear-gradient(180deg,rgba(3,14,38,0.92),rgba(6,18,48,0.98))]'
    }`}
  >
    <div className="absolute inset-x-[10%] top-[12%] h-[35%] rounded-full bg-white/10 blur-sm" />
    <div className={`relative z-10 text-[1rem] font-black tracking-[-0.03em] md:text-[1.18rem] ${isMissing ? 'text-amber-100' : 'text-white'}`}>
      {value}
    </div>
  </motion.div>
);

const MeanMachineGame: React.FC<MeanMachineGameProps> = ({
  levelId: _levelId,
  avatarId: _avatarId,
  useSharedTopHud: _useSharedTopHud = true,
  onVictory,
  onGameOver,
  onBack: _onBack,
  sessionState,
  sessionEvents,
}) => {
  const [level, setLevel] = useState(1);
  const [XP, setXP] = useState(0);
  const [gameState, setGameState] = useState<GameState>('idle');
  const [round, setRound] = useState<RoundData | null>(null);
  const [reelDisplay, setReelDisplay] = useState<Array<number | string>>(['?', '?', '?', '?', '?']);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [showJackpot, setShowJackpot] = useState(false);
  const [showGlitch, setShowGlitch] = useState(false);
  const [leverPulse, setLeverPulse] = useState(false);
  const [machineShake, setMachineShake] = useState(false);
  const [reelSettled, setReelSettled] = useState(false);
  const [wrongPulse, setWrongPulse] = useState(false);
  const timersRef = useRef<number[]>([]);
  const completionLockedRef = useRef(false);
  const failureLockedRef = useRef(false);
  const answerLockedRef = useRef(false);

  const timeLeft = sessionState?.timeLeft ?? 90;
  const lives = sessionState?.lives ?? 3;
  const sessionActive = sessionState ? timeLeft > 0 && lives > 0 : true;

  const clearTimers = useCallback(() => {
    timersRef.current.forEach((id) => window.clearTimeout(id));
    timersRef.current = [];
  }, []);

  const queueTimeout = useCallback((callback: () => void, delay: number) => {
    const id = window.setTimeout(callback, delay);
    timersRef.current.push(id);
  }, []);

  const initialiseRound = useCallback((targetLevel: number) => {
    clearTimers();
    answerLockedRef.current = false;
    setRound(buildRound(targetLevel));
    setGameState('idle');
    setFeedback(null);
    setSelectedAnswer(null);
    setShowJackpot(false);
    setShowGlitch(false);
    setLeverPulse(false);
    setMachineShake(false);
    setReelSettled(false);
    setWrongPulse(false);
    setReelDisplay(['?', '?', '?', '?', '?']);
  }, [clearTimers]);

  useEffect(() => {
    initialiseRound(1);
    return () => clearTimers();
  }, [clearTimers, initialiseRound]);

  useEffect(() => {
    if (!sessionState || completionLockedRef.current || failureLockedRef.current) return;
    if (timeLeft > 0 && lives > 0) return;
    failureLockedRef.current = true;
    sessionEvents?.onGameFailed?.({
      gameType: 'mean_machine',
      levelId: level,
      reason: lives <= 0 ? 'lives' : 'time',
      XP,
    });
    onGameOver(XP);
  }, [XP, level, lives, onGameOver, sessionEvents, sessionState, timeLeft]);

  const finishAdventure = useCallback((finalXP: number) => {
    if (completionLockedRef.current) return;
    completionLockedRef.current = true;
    sessionEvents?.onGameComplete?.({
      gameType: 'mean_machine',
      levelId: level,
      XP: finalXP,
      stars: scoreToStars(finalXP),
    });
    queueTimeout(() => onVictory(scoreToStars(finalXP), finalXP), 900);
  }, [level, onVictory, queueTimeout, sessionEvents]);

  const goToNextRound = useCallback((earnedXP: number) => {
    if (level >= TOTAL_LEVELS) {
      finishAdventure(earnedXP);
      return;
    }
    const nextLevel = level + 1;
    setLevel(nextLevel);
    initialiseRound(nextLevel);
  }, [finishAdventure, initialiseRound, level]);

  const handlePullLever = useCallback(() => {
    if (!round || gameState === 'spinning' || !sessionActive) return;

    clearTimers();
    answerLockedRef.current = false;
    setFeedback(null);
    setSelectedAnswer(null);
    setShowJackpot(false);
    setShowGlitch(false);
    setLeverPulse(true);
    setMachineShake(true);
    setGameState('spinning');

    queueTimeout(() => setLeverPulse(false), 320);
    queueTimeout(() => setMachineShake(false), 420);

    for (let tick = 0; tick < 10; tick += 1) {
      queueTimeout(() => {
        setReelDisplay(Array.from({ length: REEL_COUNT }, (_, index) => {
          if (round.mode === 'missing' && round.visibleValues[index] === null) return '?';
          return randomInt(level >= 6 ? 10 : 0, level >= 8 ? 38 : 18);
        }));
      }, tick * 85);
    }

    queueTimeout(() => {
      setReelDisplay(round.visibleValues.map((value) => (value === null ? '?' : value)));
      setReelSettled(true);
      setGameState('answering');
    }, 900);
    queueTimeout(() => setReelSettled(false), 1280);
  }, [clearTimers, gameState, level, queueTimeout, round, sessionActive]);

  const handleAnswer = useCallback((answer: number) => {
    if (!round || gameState !== 'answering' || !sessionActive || answerLockedRef.current) return;
    answerLockedRef.current = true;
    setSelectedAnswer(answer);

    if (answer === round.correctAnswer) {
      const earnedXP = XP + 150 + level * 35;
      setXP(earnedXP);
      setShowJackpot(true);
      setMachineShake(true);
      setReelSettled(true);
      setFeedback({
        type: 'success',
        message: round.mode === 'mean' ? 'Jackpot! Mean solved.' : 'Machine fixed! Missing reel locked in.',
      });
      setGameState('resolved');
      sessionEvents?.onCorrectAnswer?.({
        gameType: 'mean_machine',
        levelId: level,
        metadata: { mode: round.mode, answer },
      });
      sessionEvents?.onPuzzleComplete?.({
        gameType: 'mean_machine',
        levelId: level,
        metadata: { mode: round.mode },
      });
      queueTimeout(() => setMachineShake(false), 320);
      queueTimeout(() => goToNextRound(earnedXP), 1350);
      return;
    }

    setShowGlitch(true);
    setMachineShake(true);
    setWrongPulse(true);
    setFeedback({
      type: 'error',
      message: round.mode === 'mean'
        ? 'Machine glitch. Add all 5 numbers, then divide by 5.'
        : 'Wrong repair. That missing reel misses the target mean.',
    });
    setGameState('resolved');
    sessionEvents?.onIncorrectAnswer?.({
      gameType: 'mean_machine',
      levelId: level,
      metadata: { mode: round.mode, answer, correctAnswer: round.correctAnswer },
    });
    queueTimeout(() => setMachineShake(false), 450);
    queueTimeout(() => {
      setShowGlitch(false);
      setWrongPulse(false);
      setFeedback(null);
      setSelectedAnswer(null);
      answerLockedRef.current = false;
      setGameState('answering');
    }, 1150);
  }, [XP, gameState, goToNextRound, level, queueTimeout, round, sessionActive, sessionEvents]);

  const restart = useCallback(() => {
    completionLockedRef.current = false;
    failureLockedRef.current = false;
    setLevel(1);
    setXP(0);
    initialiseRound(1);
  }, [initialiseRound]);

  const modeCopy = useMemo(() => {
    if (!round) return { eyebrow: 'Mean Machine', title: 'Spin the reels', prompt: 'Pull the lever to begin.' };
    if (round.mode === 'mean') {
      return {
        eyebrow: 'Mean Spin',
        title: 'Spin 5 reels and choose the mean.',
        prompt: 'Add the numbers you land on. Divide by 5.',
      };
    }
    return {
      eyebrow: 'Fix The Machine',
      title: `Target mean = ${round.targetMean}`,
      prompt: 'One reel is missing. Choose the number that repairs the machine.',
    };
  }, [round]);

  const statusLabel = useMemo(() => {
    if (!round) return 'Pull the lever';
    if (gameState === 'idle') return 'Pull the lever to start the round';
    if (gameState === 'spinning') return 'Reels spinning';
    if (round.mode === 'mean') return 'Tap the correct mean';
    return 'Tap the missing reel value';
  }, [gameState, round]);

  return (
    <div className="relative h-full w-full overflow-hidden select-none text-white">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_10%,rgba(56,189,248,0.26),transparent_34%),radial-gradient(circle_at_12%_82%,rgba(59,130,246,0.18),transparent_28%),radial-gradient(circle_at_88%_78%,rgba(251,191,36,0.18),transparent_30%)]" />
      <div className="pointer-events-none absolute inset-x-[16%] top-[10%] h-24 rounded-full bg-cyan-300/12 blur-3xl" />

      <div className="relative z-10 flex h-full min-h-0 flex-col px-3 pb-[calc(env(safe-area-inset-bottom)+4.45rem)] pt-2 md:px-4">
        <div className="flex h-full min-h-0 flex-col gap-2.5">
          <section className="mx-auto w-full max-w-[24rem] shrink-0 rounded-[1.2rem] border border-cyan-100/24 bg-[linear-gradient(180deg,rgba(14,45,103,0.9),rgba(8,26,72,0.96))] px-4 py-2.5 text-center shadow-[0_16px_28px_rgba(2,6,23,0.32)]">
            <div className="text-[10px] font-black uppercase tracking-[0.18em] text-cyan-100/76">
              {modeCopy.eyebrow} · Level {level}/{TOTAL_LEVELS}
            </div>
            <div className="mt-1 text-[clamp(1rem,3.7vw,1.18rem)] font-black leading-tight text-white">
              {modeCopy.title}
            </div>
            <div className="mt-0.5 text-[10px] font-semibold text-cyan-100/82">
              {modeCopy.prompt}
            </div>
          </section>

          <main className="flex min-h-0 flex-1 flex-col gap-2.5">
            <section className="relative min-h-0 flex-1 overflow-hidden rounded-[1.6rem] border border-cyan-100/22 bg-[linear-gradient(180deg,rgba(10,31,83,0.78),rgba(4,17,52,0.92))] px-3 py-2.5 shadow-[0_20px_34px_rgba(2,6,23,0.34)]">
              <div className="pointer-events-none absolute inset-x-0 bottom-0 h-[32%] bg-[linear-gradient(180deg,rgba(15,23,42,0),rgba(15,23,42,0.2),rgba(15,23,42,0.6))]" />

              <div className="relative flex h-full min-h-0 flex-col gap-2.5">
                <div className="grid shrink-0 grid-cols-2 gap-2">
                  <div className="rounded-[0.95rem] border border-cyan-100/24 bg-slate-950/28 px-2.5 py-1.5 text-center shadow-[0_10px_18px_rgba(2,6,23,0.18)]">
                    <div className="text-[9px] font-black uppercase tracking-[0.18em] text-cyan-100/70">Status</div>
                    <div className="mt-0.5 text-[11px] font-black leading-tight text-cyan-50 md:text-[13px]">{statusLabel}</div>
                  </div>
                  <div className="rounded-[0.95rem] border border-amber-100/24 bg-slate-950/28 px-2.5 py-1.5 text-center shadow-[0_10px_18px_rgba(2,6,23,0.18)]">
                    <div className="text-[9px] font-black uppercase tracking-[0.18em] text-amber-100/75">Target Mean</div>
                    <div className="mt-0.5 text-lg font-black text-amber-100 md:text-xl">{round?.targetMean ?? '?'}</div>
                  </div>
                </div>

                <div className="relative flex min-h-0 flex-1 items-center justify-center overflow-hidden rounded-[1.35rem] border border-cyan-100/18 bg-[linear-gradient(180deg,rgba(255,255,255,0.08),rgba(255,255,255,0.02))] px-1 py-0.5">
                  <motion.div
                    animate={machineShake ? { x: [0, -6, 6, -4, 4, 0] } : { x: 0 }}
                    transition={{ duration: 0.34 }}
                    className="relative mx-auto flex h-full w-full max-w-[31rem] items-center justify-center md:max-w-[34rem]"
                  >
                    <div className="absolute inset-x-[12%] bottom-[8.5%] h-[24%] rounded-full bg-[radial-gradient(circle_at_center,rgba(34,211,238,0.14),rgba(34,211,238,0.02),transparent_72%)] blur-2xl" />

                    <img
                      src={slotMachineImage}
                      alt="Mean Machine slot machine"
                      draggable={false}
                      className="pointer-events-none absolute inset-x-0 bottom-[-1.5%] z-[12] h-[134%] w-full object-contain"
                    />

                    <div className="absolute left-[20.2%] right-[20.2%] top-[38.7%] z-20 grid grid-cols-5 gap-[2.4%]">
                      {reelDisplay.map((value, index) => (
                        <ReelWindow
                          key={`reel-${index}-${String(value)}`}
                          value={value}
                          spinning={gameState === 'spinning'}
                          isMissing={Boolean(round && round.mode === 'missing' && round.visibleValues[index] === null)}
                          isCorrectPulse={showJackpot || reelSettled}
                          isErrorPulse={wrongPulse}
                        />
                      ))}
                    </div>

                    <div className="absolute left-[22%] top-[18.8%] z-20 flex h-[8.6%] w-[22%] items-center justify-center rounded-[0.55rem] border border-cyan-200/20 bg-[linear-gradient(180deg,rgba(3,14,38,0.92),rgba(6,18,48,0.98))] px-2 text-center text-[0.46rem] font-black uppercase tracking-[0.14em] text-cyan-100 md:text-[0.54rem]">
                      {round?.mode === 'mean' ? 'Mean Spin' : 'Fix Machine'}
                    </div>
                    <div className="absolute left-[50.5%] top-[18.8%] z-20 flex h-[8.6%] w-[22%] -translate-x-1/2 items-center justify-center rounded-[0.55rem] border border-amber-200/24 bg-[linear-gradient(180deg,rgba(58,27,4,0.92),rgba(41,17,4,0.98))] px-2 text-center text-[0.48rem] font-black uppercase tracking-[0.08em] text-amber-100 md:text-[0.58rem]">
                      Mean {round?.targetMean ?? '?'}
                    </div>

                    <motion.button
                      type="button"
                      onClick={handlePullLever}
                      disabled={!round || gameState === 'spinning' || !sessionActive}
                      animate={leverPulse ? { scale: [1, 0.94, 1.06, 1], y: [0, 2, -1, 0] } : { scale: [1, 1.03, 1], y: [0, -1, 0] }}
                      transition={leverPulse ? { duration: 0.34 } : { duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
                      className="absolute left-1/2 bottom-[5.7%] z-30 flex h-[11.5%] w-[30%] -translate-x-1/2 items-center justify-center rounded-[1.2rem] bg-transparent text-[0.68rem] font-black uppercase tracking-[0.16em] text-cyan-50 disabled:cursor-not-allowed disabled:opacity-65 md:text-[0.78rem]"
                      aria-label="Press the Mean Machine base button"
                    >
                      <span className="absolute inset-[6%] rounded-[1rem] bg-cyan-300/10 blur-md" />
                      <span className="absolute inset-0 rounded-[1.2rem] border border-cyan-200/22 bg-[linear-gradient(180deg,rgba(37,99,235,0.12),rgba(29,78,216,0.04))]" />
                      <span className="relative z-10">
                        {gameState === 'spinning' ? 'Spinning' : 'Spin'}
                      </span>
                    </motion.button>

                    <AnimatePresence>
                      {showJackpot ? (
                        <motion.div
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          className="pointer-events-none absolute inset-0 z-30"
                        >
                          <div className="absolute inset-x-[18%] top-[36.8%] h-[11%] rounded-[1rem] border border-amber-200/35 bg-amber-300/8 shadow-[0_0_30px_rgba(251,191,36,0.45)]" />
                          {Array.from({ length: 18 }).map((_, index) => (
                            <motion.div
                              key={`jackpot-${index}`}
                              initial={{ opacity: 0, y: 0, x: 0, rotate: 0 }}
                              animate={{
                                opacity: [0, 1, 1, 0],
                                y: [0, -20 - index * 5, -70 - index * 6],
                                x: [0, (index % 2 === 0 ? -1 : 1) * (10 + index * 2)],
                                rotate: [0, 80, 160],
                              }}
                              transition={{ duration: 1, ease: 'easeOut' }}
                              className={`absolute bottom-[34%] h-3 w-2 rounded-full ${index % 3 === 0 ? 'bg-amber-300' : index % 3 === 1 ? 'bg-cyan-300' : 'bg-emerald-300'}`}
                              style={{ left: `${24 + index * 2.9}%` }}
                            />
                          ))}
                        </motion.div>
                      ) : null}
                    </AnimatePresence>

                    <AnimatePresence>
                      {showGlitch ? (
                        <motion.div
                          initial={{ opacity: 0 }}
                          animate={{ opacity: [0, 0.85, 0.2, 0.7, 0] }}
                          exit={{ opacity: 0 }}
                          transition={{ duration: 0.85 }}
                          className="pointer-events-none absolute inset-0 z-30"
                        >
                          <div className="absolute inset-x-[18%] top-[36.8%] h-[11%] rounded-[1rem] bg-[linear-gradient(90deg,transparent,rgba(248,113,113,0.12),transparent)]" />
                          {Array.from({ length: 7 }).map((_, index) => (
                            <motion.div
                              key={`spark-${index}`}
                              initial={{ opacity: 0, scale: 0.6 }}
                              animate={{ opacity: [0, 1, 0], scale: [0.6, 1.25, 0.9] }}
                              transition={{ duration: 0.4, delay: index * 0.05 }}
                              className="absolute text-amber-300"
                              style={{ left: `${24 + index * 7}%`, top: `${39 + (index % 2) * 5}%` }}
                            >
                              <AlertTriangle className="h-5 w-5 md:h-6 md:w-6" />
                            </motion.div>
                          ))}
                        </motion.div>
                      ) : null}
                    </AnimatePresence>
                  </motion.div>
                </div>
              </div>
            </section>

            <section className="shrink-0 rounded-[1.35rem] border border-cyan-100/22 bg-[linear-gradient(180deg,rgba(10,31,83,0.92),rgba(7,21,58,0.96))] p-3 shadow-[0_16px_26px_rgba(2,6,23,0.34)]">
              <div className="mb-2 flex items-center justify-between gap-2">
                <div className="text-[10px] font-black uppercase tracking-[0.16em] text-cyan-100/74">
                  {round?.mode === 'mean' ? 'Choose the mean' : 'Choose the missing reel'}
                </div>
                <div className="rounded-full border border-cyan-100/18 bg-slate-950/26 px-3 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-cyan-100/74">
                  Lives {lives}
                </div>
              </div>
              <div className={`grid gap-2.5 ${round && round.options.length === 3 ? 'grid-cols-3' : 'grid-cols-2'}`}>
                {round?.options.map((option, index) => {
                  const isSelected = selectedAnswer === option;
                  return (
                    <motion.button
                      key={`${option}-${index}`}
                      whileTap={{ scale: 0.97 }}
                      type="button"
                      onClick={() => handleAnswer(option)}
                      disabled={gameState !== 'answering' || !sessionActive}
                      animate={selectedAnswer === option && wrongPulse ? { x: [0, -6, 6, -4, 4, 0] } : { x: 0 }}
                      transition={{ duration: 0.28 }}
                      className={`rounded-[1rem] border px-4 py-2.5 text-base font-black transition-all ${
                        isSelected
                          ? 'border-amber-100/85 bg-[linear-gradient(180deg,#fbbf24_0%,#f59e0b_100%)] text-slate-950 shadow-[0_12px_20px_rgba(146,64,14,0.34)]'
                          : 'border-cyan-100/24 bg-[linear-gradient(180deg,#2563eb_0%,#1d4ed8_100%)] text-white shadow-[0_12px_18px_rgba(2,6,23,0.22)]'
                      } disabled:cursor-not-allowed disabled:opacity-45`}
                    >
                      {option}
                    </motion.button>
                  );
                })}
              </div>
            </section>
          </main>
        </div>

        <AnimatePresence>
          {completionLockedRef.current ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="absolute inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-md"
            >
              <div className="w-full max-w-[21rem] rounded-[1.75rem] border border-cyan-100/24 bg-[linear-gradient(180deg,rgba(16,46,107,0.96),rgba(8,25,68,0.98))] px-5 py-6 text-center text-white shadow-[0_22px_36px_rgba(2,6,23,0.46)]">
                <div className="relative mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full border border-amber-200/40 bg-amber-300/18">
                  <Trophy className="h-10 w-10 text-amber-200" />
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 10, repeat: Infinity, ease: 'linear' }}
                    className="absolute inset-[-10px] rounded-full border-2 border-dashed border-amber-200/30"
                  />
                </div>
                <div className="text-[10px] font-black uppercase tracking-[0.18em] text-cyan-100/75">Mean Machine</div>
                <h2 className="mt-1 text-2xl font-black uppercase tracking-[0.04em] text-amber-100">Jackpot Calibrated</h2>
                <p className="mt-2 text-sm font-semibold leading-relaxed text-cyan-100/82">
                  Every reel landed perfectly. Launching rewards now.
                </p>
                <div className="mt-4 rounded-[1.25rem] border border-cyan-100/18 bg-slate-950/24 px-4 py-4">
                  <div className="text-[9px] font-black uppercase tracking-[0.18em] text-cyan-100/72">Final XP</div>
                  <div className="mt-1 text-4xl font-black text-amber-100">{XP}</div>
                </div>
                <button
                  type="button"
                  onClick={restart}
                  className="mx-auto mt-5 flex min-h-[3rem] items-center gap-2 rounded-full bg-[linear-gradient(180deg,#f8d66b_0%,#f2a82c_100%)] px-7 py-3 text-[11px] font-black uppercase tracking-[0.16em] text-slate-950 shadow-[0_8px_0_rgba(146,87,8,0.72),0_16px_24px_rgba(2,6,23,0.22)]"
                >
                  <RotateCcw className="h-4 w-4" /> Restart
                </button>
              </div>
            </motion.div>
          ) : null}
        </AnimatePresence>

        <AnimatePresence>
          {feedback ? (
            <motion.div
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -18 }}
              className={`absolute bottom-[calc(env(safe-area-inset-bottom)+4.45rem)] left-1/2 z-40 flex max-w-[19rem] -translate-x-1/2 items-center gap-2 rounded-full border px-4 py-2 text-center shadow-[0_16px_26px_rgba(2,6,23,0.34)] ${
                feedback.type === 'success'
                  ? 'border-emerald-200/55 bg-emerald-500/24 text-emerald-50'
                  : 'border-rose-200/55 bg-rose-500/24 text-rose-50'
              }`}
            >
              {feedback.type === 'success' ? <CheckCircle2 className="h-4 w-4 shrink-0" /> : <WandSparkles className="h-4 w-4 shrink-0" />}
              <span className="text-[10px] font-black uppercase tracking-[0.12em]">{feedback.message}</span>
            </motion.div>
          ) : null}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default MeanMachineGame;
