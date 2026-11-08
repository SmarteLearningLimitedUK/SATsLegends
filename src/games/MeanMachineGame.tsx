import {statisticsErrorPattern} from '../systems/learning/misconceptions';
import {currentLearningPolicy} from '../systems/learning/learningSupport';
import ArcadeJourney from '../components/game-ui/ArcadeJourney';
import { playGameSound } from '../audio/gameAudio';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import {
  AlertTriangle,
  CheckCircle2,
  RotateCcw,
  Trophy,
  WandSparkles,
} from 'lucide-react';
import { GAME_HUD_RESTART_EVENT } from '../gameHudEvents';
import MeanPowerEngine from './MeanPowerEngine';
import meanPortrait from '../assets/mean-machine-reference/bg_acropolis_portrait@2x.png';
import meanLandscape from '../assets/mean-machine-reference/bg_acropolis_landscape@2x.png';
import './game-refinements.css';
import './mean-machine.css';
import { GameplaySessionEventHandlers, GameplaySessionState, MiniGamePracticeBriefing } from '../app/gameplaySessionContract';
import { GameQuestionCard } from '../components/game-ui/GameUiKit';
import PracticeIntroPopup from '../components/game-ui/PracticeIntroPopup';

type RoundMode = 'mean' | 'median' | 'mode' | 'missing';
type GameState = 'idle' | 'spinning' | 'answering' | 'resolved';

interface RoundData {
  mode: RoundMode;
  kind: 'fluency' | 'reasoning';
  visibleValues: Array<number | null>;
  actualValues: number[];
  targetMean: number;
  correctAnswer: number;
  options: number[];
  activeReelIndexes: number[];
}

interface MeanMachineGameProps {
  levelId: number;
  avatarId: string;
  useSharedTopHud?: boolean;
  isPractice?: boolean;
  practiceBriefing?: MiniGamePracticeBriefing | null;
  onVictory: (stars: number, XP: number) => void;
  onGameOver: (XP: number) => void;
  onBack: () => void;
  sessionState?: GameplaySessionState;
  sessionEvents?: GameplaySessionEventHandlers;
}

const TOTAL_LEVELS = 10;
const REEL_COUNT = 8;
const REEL_LAYOUT = [
  { left: 28, top: 40, width: 9.5, height: 10.2 },
  { left: 39.5, top: 40, width: 9.5, height: 10.2 },
  { left: 51, top: 40, width: 9.5, height: 10.2 },
  { left: 62.5, top: 40, width: 9.5, height: 10.2 },
  { left: 28, top: 52, width: 9.5, height: 10.2 },
  { left: 39.5, top: 52, width: 9.5, height: 10.2 },
  { left: 51, top: 52, width: 9.5, height: 10.2 },
  { left: 62.5, top: 52, width: 9.5, height: 10.2 },
] as const;

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

const getActiveReelCount = (level: number) => {
  return [0, 2, 3, 4, 5, 6][Math.max(1, Math.min(5, level))];
};

const getActiveReelIndexes = (activeCount: number) => {
  if (activeCount <= 4) return Array.from({ length: activeCount }, (_, index) => index);
  const topRow = [0, 1, 2, 3];
  const remaining = activeCount - 4;
  return topRow.concat(Array.from({ length: remaining }, (_, index) => 4 + index));
};

const clampOddCount = (count: number) => {
  if (count < 3) return 3;
  return count % 2 === 0 ? count - 1 : count;
};

// Every level practises the three averages; later tiers also include missing values.
const ROUND_MODES_BY_TIER: Record<number, RoundMode[]> = {
  1: ['mean', 'median', 'mode'],
  2: ['mean', 'median', 'mode'],
  3: ['mean', 'median', 'mode', 'missing'],
  4: ['mean', 'median', 'mode', 'missing'],
  5: ['mean', 'median', 'mode', 'missing'],
};

// Each draw leaves a total the remaining readings can reach within their bounds.
const valuesWithMean = (target: number, count: number, min: number, max: number, zero = false): number[] => {
  const values = zero ? [0] : [];
  let remaining = target * count;
  while (values.length < count) {
    const slotsAfter = count - values.length - 1;
    const low = Math.max(min, remaining - slotsAfter * max);
    const high = Math.min(max, remaining - slotsAfter * min);
    const value = randomInt(low, high);
    values.push(value);
    remaining -= value;
  }
  return values;
};
const averageOptions = (answer: number, spread: number): number[] => {
  const values = new Set<number>([answer]);
  for (let attempt = 0; attempt < 32 && values.size < 4; attempt += 1) {
    const candidate = answer + randomInt(-spread, spread);
    if (candidate > 0) values.add(candidate);
  }
  for (let delta = 1; values.size < 4; delta += 1) values.add(answer + delta);
  return shuffle([...values]);
};

const buildMeanRound = (level: number): RoundData => {
  const useDoubleDigits = level >= 3;
  const minValue = useDoubleDigits ? 8 : 1;
  const maxValue = useDoubleDigits ? 26 + level : 9 + level;
  const activeCount = getActiveReelCount(level);
  const activeReelIndexes = getActiveReelIndexes(activeCount);
  const targetMean = useDoubleDigits ? randomInt(10, 18 + level) : randomInt(3, 10);

  const includeZero = level >= 4 && Math.random() < .3;
  const values = valuesWithMean(targetMean, activeCount, minValue, maxValue, includeZero);
  // Half-integer means are represented exactly; each displayed reading stays in range.
  const fractional = level >= 3 && activeCount % 2 === 0 && Math.random() < .5;
  const delta = fractional ? activeCount / 2 : 0;
  if (delta) {
    const index = values.findIndex(value => value !== 0 && value + delta <= maxValue);
    if (index >= 0) values[index] += delta;
  }
  const activeValues = shuffle(values);
  const answerMean = activeValues.reduce((sum, value) => sum + value, 0) / activeCount;
  const actualValues = Array.from({ length: REEL_COUNT }, (_, index) => {
    const activeIndex = activeReelIndexes.indexOf(index);
    return activeIndex >= 0 ? activeValues[activeIndex] : 0;
  });
  const visibleValues = Array.from({ length: REEL_COUNT }, (_, index) => {
    const activeIndex = activeReelIndexes.indexOf(index);
    return activeIndex >= 0 ? activeValues[activeIndex] : null;
  });

  return {
    mode: 'mean',
    kind: 'fluency',
    visibleValues,
    actualValues,
    targetMean: answerMean,
    correctAnswer: answerMean,
    options: averageOptions(answerMean, useDoubleDigits ? 6 : 3),
    activeReelIndexes,
  };
};

const buildMedianRound = (level: number): RoundData => {
  const useDoubleDigits = level >= 3;
  const minValue = useDoubleDigits ? 8 : 2;
  const maxValue = useDoubleDigits ? 28 + level : 14 + level;
  const baseCount = getActiveReelCount(level);
  const activeCount = clampOddCount(Math.min(REEL_COUNT, Math.max(3, baseCount)));
  const activeReelIndexes = getActiveReelIndexes(activeCount);
  const activeValues = Array.from({ length: activeCount }, () => randomInt(minValue, maxValue));
  const sorted = [...activeValues].sort((a, b) => a - b);
  const median = sorted[Math.floor(sorted.length / 2)];

  const actualValues = Array.from({ length: REEL_COUNT }, (_, index) => {
    const activeIndex = activeReelIndexes.indexOf(index);
    return activeIndex >= 0 ? activeValues[activeIndex] : 0;
  });
  const visibleValues = Array.from({ length: REEL_COUNT }, (_, index) => {
    const activeIndex = activeReelIndexes.indexOf(index);
    return activeIndex >= 0 ? activeValues[activeIndex] : null;
  });


  return {
    mode: 'median',
    kind: 'fluency',
    visibleValues,
    actualValues,
    targetMean: median,
    correctAnswer: median,
    options: averageOptions(median, useDoubleDigits ? 8 : 4),
    activeReelIndexes,
  };
};

const buildModeRound = (level: number): RoundData => {
  const useDoubleDigits = level >= 3;
  const minValue = useDoubleDigits ? 9 : 2;
  const maxValue = useDoubleDigits ? 30 + level : 16 + level;
  const baseCount = getActiveReelCount(level);
  const activeCount = clampOddCount(Math.min(REEL_COUNT, Math.max(3, baseCount)));
  const activeReelIndexes = getActiveReelIndexes(activeCount);
  const modeValue = randomInt(minValue, maxValue);
  const modeCopies = activeCount >= 5 ? 3 : 2;
  const distinctCount = Math.max(1, activeCount - modeCopies);

  const distinctValues = shuffle(Array.from({ length: maxValue - minValue + 1 }, (_, i) => minValue + i)
    .filter(value => value !== modeValue)).slice(0, distinctCount);

  const activeValues = shuffle([
    ...Array.from({ length: modeCopies }, () => modeValue),
    ...distinctValues,
  ]).slice(0, activeCount);
  const actualValues = Array.from({ length: REEL_COUNT }, (_, index) => {
    const activeIndex = activeReelIndexes.indexOf(index);
    return activeIndex >= 0 ? activeValues[activeIndex] : 0;
  });
  const visibleValues = Array.from({ length: REEL_COUNT }, (_, index) => {
    const activeIndex = activeReelIndexes.indexOf(index);
    return activeIndex >= 0 ? activeValues[activeIndex] : null;
  });


  return {
    mode: 'mode',
    kind: 'fluency',
    visibleValues,
    actualValues,
    targetMean: modeValue,
    correctAnswer: modeValue,
    options: averageOptions(modeValue, useDoubleDigits ? 7 : 4),
    activeReelIndexes,
  };
};

const buildMissingRound = (level: number): RoundData => {
  const useDoubleDigits = level >= 4;
  const minValue = useDoubleDigits ? 12 : 4;
  const maxValue = useDoubleDigits ? 34 : 18 + level * 2;
  const activeCount = getActiveReelCount(level);
  const activeReelIndexes = getActiveReelIndexes(activeCount);
  const targetMean = useDoubleDigits ? randomInt(14, 24) : randomInt(6, 15);
  const missingActiveIndex = randomInt(1, Math.max(1, activeCount - 2));
  const missingIndex = activeReelIndexes[missingActiveIndex];

  const activeActualValues = valuesWithMean(targetMean, activeCount, minValue, maxValue);
  const missingValue = activeActualValues[missingActiveIndex];
  const actualValues = Array.from({ length: REEL_COUNT }, (_, index) => {
    const activeIndex = activeReelIndexes.indexOf(index);
    return activeIndex >= 0 ? activeActualValues[activeIndex] : 0;
  });
  const visible = Array.from({ length: REEL_COUNT }, (_, index) => {
    const activeIndex = activeReelIndexes.indexOf(index);
    if (activeIndex < 0) return null;
    return index === missingIndex ? null : activeActualValues[activeIndex];
  });


  return {
    mode: 'missing',
    kind: 'reasoning',
    visibleValues: visible,
    actualValues,
    targetMean,
    correctAnswer: missingValue,
    options: averageOptions(missingValue, 7),
    activeReelIndexes,
  };
};

const buildRound = (level: number, roundNumber: number, previousMode: RoundMode | null = null) => {
  const modes = ROUND_MODES_BY_TIER[Math.max(1, Math.min(5, level))];
  const preferredMode = modes[(roundNumber - 1) % modes.length];
  const mode = preferredMode === previousMode
    ? modes[(modes.indexOf(preferredMode) + 1) % modes.length]
    : preferredMode;

  if (mode === 'mean') return buildMeanRound(level);
  if (mode === 'median') return buildMedianRound(level);
  if (mode === 'mode') return buildModeRound(level);
  return buildMissingRound(level);
};

const roundSignature = (data: RoundData) => {
  const visibleKey = data.visibleValues.map((value) => (value === null ? 'x' : value)).join('|');
  return `${data.mode}:${data.correctAnswer}:${visibleKey}`;
};

const ReelWindow: React.FC<{
  value: number | string;
  spinning: boolean;
  isInactive?: boolean;
  isMissing?: boolean;
  isCorrectPulse?: boolean;
  isErrorPulse?: boolean;
}> = ({ value, spinning, isInactive = false, isMissing = false, isCorrectPulse = false, isErrorPulse = false }) => (
  <motion.div
    animate={spinning
      ? { y: [0, -5, 0, 5, 0], scale: [1, 1.02, 1] }
      : isCorrectPulse
        ? { y: [0, -4, 0], scale: [1, 1.08, 1] }
        : isErrorPulse
          ? { x: [0, -5, 5, -4, 4, 0], scale: [1, 0.98, 1] }
          : { y: 0, scale: 1 }}
    transition={spinning ? { duration: 0.16, repeat: Infinity, ease: 'linear' } : { duration: 0.35 }}
    data-mean-reel data-inactive={isInactive} className={`mean-reel-window relative flex h-full w-full items-center justify-center overflow-hidden rounded-[0.9rem] border border-slate-200/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(241,245,249,0.98))] shadow-[inset_0_1px_0_rgba(255,255,255,0.95),0_2px_8px_rgba(15,23,42,0.18)] ${
      isInactive ? 'opacity-50 saturate-0' : ''
    }`}
  >
    <div className={`relative z-10 text-[clamp(1.7rem,4.1vw,2.5rem)] font-bold tracking-[-0.02em] ${isInactive ? 'text-[#163a7a]/55' : 'text-[#163a7a]'}`}>
      {isInactive ? '' : value}
    </div>
  </motion.div>
);

const MeanMachineGame: React.FC<MeanMachineGameProps> = ({
  levelId,
  avatarId: _avatarId,
  useSharedTopHud: _useSharedTopHud = true,
  isPractice,
  practiceBriefing,
  onVictory,
  onGameOver,
  onBack: _onBack,
  sessionState,
  sessionEvents,
}) => {
  const reducedMotion = useReducedMotion();
  const difficulty = Math.max(1, Math.min(5, levelId));
  const [level, setLevel] = useState(1);
  const [XP, setXP] = useState(0);
  const [gameState, setGameState] = useState<GameState>('idle');
  const [showPracticeIntro, setShowPracticeIntro] = useState(Boolean(isPractice));
  const [round, setRound] = useState<RoundData | null>(null);
  const reelDisplay = round?.visibleValues.map(value => value ?? '?')
    ?? Array.from({ length: REEL_COUNT }, () => '');
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [repairStreak, setRepairStreak] = useState(0);
  const [showJackpot, setShowJackpot] = useState(false);
  const [showGlitch, setShowGlitch] = useState(false);
  const [spinPulse, setSpinPulse] = useState(false);
  const [machineShake, setMachineShake] = useState(false);
  const [reelSettled, setReelSettled] = useState(false);
  const [wrongPulse, setWrongPulse] = useState(false);
  const timersRef = useRef<number[]>([]);
  const completionLockedRef = useRef(false);
  const failureLockedRef = useRef(false);
  const answerLockedRef = useRef(false);
  const lastRoundRef = useRef<string[]>([]);

  const lives = sessionState?.lives ?? 3;
  const sessionActive = lives > 0;

  useEffect(() => {
    setShowPracticeIntro(Boolean(isPractice));
  }, [isPractice]);

  const clearTimers = useCallback(() => {
    timersRef.current.forEach((id) => window.clearTimeout(id));
    timersRef.current = [];
  }, []);

  const queueTimeout = useCallback((callback: () => void, delay: number) => {
    const id = window.setTimeout(callback, delay);
    timersRef.current.push(id);
  }, []);

  const initialiseRound = useCallback((targetLevel: number, previousMode: RoundMode | null = null) => {
    clearTimers();
    answerLockedRef.current = false;
    let nextRound = buildRound(difficulty, targetLevel, previousMode);
    let nextSignature = roundSignature(nextRound);
    let guard = 0;
    while (lastRoundRef.current.includes(nextSignature) && guard < 10) {
      nextRound = buildRound(difficulty, targetLevel, previousMode);
      nextSignature = roundSignature(nextRound);
      guard += 1;
    }
    lastRoundRef.current = [...lastRoundRef.current.slice(-4), nextSignature];
    setRound(nextRound);
    setGameState('answering');
    setFeedback(null);
    setSelectedAnswer(null);
    setShowJackpot(false);
    setShowGlitch(false);
    setSpinPulse(false);
    setMachineShake(false);
    setReelSettled(false);
    setWrongPulse(false);
  }, [clearTimers, difficulty]);

  useEffect(() => {
    initialiseRound(1);
    return () => clearTimers();
  }, [clearTimers, initialiseRound]);

  useEffect(() => {
    if (!sessionState || completionLockedRef.current || failureLockedRef.current) return;
    if (lives > 0) return;
    failureLockedRef.current = true;
    sessionEvents?.onGameFailed?.({
      gameType: 'mean_machine',
      levelId: level,
      reason: 'lives',
      XP,
    });
    onGameOver(XP);
  }, [XP, level, lives, onGameOver, sessionEvents, sessionState]);

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
    initialiseRound(nextLevel, round?.mode ?? null);
  }, [finishAdventure, initialiseRound, level, round?.mode]);

  const handleSpin = useCallback(() => {
    if (!round || gameState !== 'answering' || !sessionActive) return;
    playGameSound('cast');
    if (reducedMotion || currentLearningPolicy().workingMemorySupport) return;

    clearTimers();
    setSpinPulse(true);
    setMachineShake(true);
    setGameState('spinning');

    queueTimeout(() => setSpinPulse(false), 320);
    queueTimeout(() => setMachineShake(false), 420);
    queueTimeout(() => {
      setReelSettled(true);
      setGameState('answering');
    }, 900);
    queueTimeout(() => setReelSettled(false), 1280);
  }, [clearTimers, gameState, queueTimeout, reducedMotion, round, sessionActive]);

  const handleAnswer = useCallback((answer: number) => {
    if (!round || gameState !== 'answering' || !sessionActive || answerLockedRef.current) return;
    answerLockedRef.current = true;
    setSelectedAnswer(answer);

    if (answer === round.correctAnswer) {
      const nextStreak = repairStreak + 1;
      setRepairStreak(nextStreak);
      const earnedXP = XP + 150 + level * 35 + (nextStreak % 3 === 0 ? 75 : 0);
      setXP(earnedXP);
      setShowJackpot(true);
      setMachineShake(true);
      setReelSettled(true);
      setFeedback({
        type: 'success',
        message: round.mode === 'mean'
          ? 'Machine recalibrated! Mean restored.'
          : round.mode === 'median'
            ? 'Machine recalibrated! Median restored.'
            : round.mode === 'mode'
              ? 'Machine recalibrated! Mode restored.'
              : 'Machine repaired! Missing reel restored.',
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

    setRepairStreak(0);
    setShowGlitch(true);
    setMachineShake(true);
    setWrongPulse(true);
    setFeedback({
      type: 'error',
      message: round.mode === 'mean'
        ? `The machine is still unstable. Add them, then divide by ${round.activeReelIndexes.length} to find the mean.`
        : round.mode === 'median'
          ? 'The machine is still unstable. Order the numbers, then pick the middle value.'
          : round.mode === 'mode'
            ? 'The machine is still unstable. Pick the value that appears most often.'
            : 'The repair is still off. Choose the missing value that fixes the target mean.',
    });
    setGameState('resolved');
    sessionEvents?.onIncorrectAnswer?.({
      gameType: 'mean_machine',
      levelId: level,
      metadata: { mode: round.mode, answer, correctAnswer: round.correctAnswer, misconceptionCode:statisticsErrorPattern(round.mode,round.activeReelIndexes.map(i=>round.actualValues[i]),answer) },
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
  }, [XP, gameState, goToNextRound, level, queueTimeout, repairStreak, round, sessionActive, sessionEvents]);

  const restart = useCallback(() => {
    completionLockedRef.current = false;
    failureLockedRef.current = false;
    setLevel(1);
    setXP(0);
    setRepairStreak(0);
    initialiseRound(1);
  }, [initialiseRound]);

  const modeCopy = useMemo(() => {
    if (!round) return { title: 'Power cells', prompt: 'Preparing the readings…' };
    if (round.mode === 'mean') {
      return {
        title: `What is the mean of the ${round.activeReelIndexes.length} readings?`,
        prompt: `Add them, then divide by ${round.activeReelIndexes.length} to get the MEAN.`,
      };
    }
    if (round.mode === 'median') {
      return {
        title: 'Order the values. Find the MEDIAN.',
        prompt: 'Pick the middle number when the reels are ordered.',
      };
    }
    if (round.mode === 'mode') {
      return {
        title: 'Find the most frequent number. (MODE)',
        prompt: 'The MODE appears more than any other value.',
      };
    }
    return {
      title: `The mean of ${round.activeReelIndexes.length} readings is ${round.targetMean}. Find the missing reading.`,
      prompt: `Choose the number that repairs the MEAN of ${round.activeReelIndexes.length} reels.`,
    };
  }, [round]);

  return (
    <div className="relative h-full w-full overflow-hidden select-none text-white" data-mean-game data-mean-paused={Boolean(sessionState?.paused)}>
      <PracticeIntroPopup
        open={showPracticeIntro}
        title="Mean Machine"
        body="The Monster Minds have sabotaged the island machine.\nRead the power cells and restore the island grid. Three clean repairs earn 75 bonus XP.\nUse the right method for each round."
        briefing={practiceBriefing}
        onAction={() => setShowPracticeIntro(false)}
      />
      <picture className="pointer-events-none absolute inset-0 block" aria-hidden="true">
        <source media="(orientation: landscape)" srcSet={meanLandscape} />
        <img src={meanPortrait} alt="" draggable={false} data-game-scene-image className="h-full w-full object-cover" />
      </picture>

      <div className="mean-machine-content relative z-10 flex h-full min-h-0 flex-col px-3 pb-[calc(env(safe-area-inset-bottom)+4.45rem)] pt-2 md:px-4">
        <div className="flex h-full min-h-0 flex-col gap-2.5">
          <section className="mean-machine-question shrink-0">
            <GameQuestionCard title="Mean Machine" subtitle={modeCopy.prompt}>
              {modeCopy.title}
            </GameQuestionCard>
          </section>

          <main className="mean-machine-main flex min-h-0 flex-1 flex-col gap-2.5">
            <section className="mean-machine-playfield relative min-h-0 flex-1 overflow-hidden rounded-[1.6rem] border border-transparent bg-transparent px-2 py-2 shadow-none">

              <div className="mean-power-panel mean-power-panel-mobile"><ArcadeJourney kind="power" completed={level - 1 + (feedback?.type === 'success' ? 1 : 0)} total={TOTAL_LEVELS} danger={showGlitch} /></div>
              <div className="relative flex h-full min-h-0 flex-col gap-2.5">
                <div className="relative flex min-h-0 flex-1 items-center justify-center overflow-hidden rounded-[1.35rem] border border-transparent bg-transparent px-1 py-1">
                  <motion.div
                    animate={machineShake ? { x: [0, -6, 6, -4, 4, 0] } : { x: 0 }}
                    transition={{ duration: 0.34 }}
                    className="mean-machine-figure relative mx-auto flex h-full w-full max-w-[32rem] items-center justify-center md:max-w-[34rem]"
                  >

                      <div
                        className="mean-machine-stage relative isolate"
                        style={{ aspectRatio: '4 / 5', transformOrigin: 'center' }}
                      >
                      <MeanPowerEngine mode={round?.mode === 'missing' ? 'Repair' : round?.mode ?? 'Mean'} scanning={gameState === 'spinning'} repaired={showJackpot} fault={showGlitch} paused={Boolean(sessionState?.paused)} />

                      {reelDisplay.map((value, index) => (
                        <div
                          key={`reel-shell-${index}`}
                          className="absolute z-20"
                          style={{
                            left: `${REEL_LAYOUT[index].left}%`,
                            top: `${REEL_LAYOUT[index].top}%`,
                            width: `${REEL_LAYOUT[index].width}%`,
                            height: `${REEL_LAYOUT[index].height}%`,
                          }}
                        >
                          <ReelWindow
                            key={`reel-${index}-${String(value)}`}
                            value={value}
                            spinning={gameState === 'spinning' && round?.activeReelIndexes.includes(index)}
                            isInactive={Boolean(round && !round.activeReelIndexes.includes(index))}
                            isMissing={Boolean(round && round.mode === 'missing' && round.visibleValues[index] === null)}
                            isCorrectPulse={showJackpot || reelSettled}
                            isErrorPulse={wrongPulse}
                          />
                        </div>
                      ))}

                      <motion.button
                        type="button"
                        onClick={handleSpin}
                        disabled={gameState !== 'answering' || !sessionActive}
                        animate={spinPulse && !reducedMotion ? { scale: [1, 0.94, 1.06, 1], y: [0, 2, -1, 0] } : { scale: 1, y: 0 }}
                        transition={{ duration: reducedMotion ? 0 : .34 }}
                        className="mean-engine-scan-button absolute z-30 flex items-center justify-center rounded-[1.2rem] bg-transparent text-[0.98rem] font-black uppercase tracking-[0.18em] text-cyan-50 disabled:cursor-not-allowed disabled:opacity-65 md:text-[1.05rem]"
                        aria-label="Scan the power cells"
                        style={{
                          left: '33%',
                          top: '78.8%',
                          width: '34%',
                          height: 'max(6.9%, calc(44px / var(--game-stage-scale, 1)))',
                        }}
                      >
                        <span className="relative z-10">
                          {gameState === 'spinning' ? 'Scanning' : 'Scan'}
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
                    </div>
                  </motion.div>
                </div>
              </div>
            </section>

            <section className="mean-machine-answer-rail shrink-0 rounded-[1.35rem] border border-cyan-100/22 bg-[linear-gradient(180deg,rgba(10,31,83,0.92),rgba(7,21,58,0.96))] p-2.5 shadow-[0_16px_26px_rgba(2,6,23,0.34)]">
              <div className="mean-power-panel mean-power-panel-desktop"><ArcadeJourney kind="power" completed={level - 1 + (feedback?.type === 'success' ? 1 : 0)} total={TOTAL_LEVELS} danger={showGlitch} /></div>
              <div className="mb-2 flex items-center justify-start gap-2">
                <div className="text-[13px] font-black uppercase tracking-[0.16em] text-cyan-100/74">
                  <span className="mean-repair-streak">{repairStreak > 0 ? `${repairStreak} clean repairs · ${3 - repairStreak % 3} to bonus` : 'Three clean repairs earn +75 XP'} · </span>
                  {round?.mode === 'mean' ? (
                    <>
                      Pick the <span className="underline decoration-amber-200/90 underline-offset-[3px]">MEAN</span>
                    </>
                  ) : round?.mode === 'median' ? (
                    <>
                      Pick the <span className="underline decoration-amber-200/90 underline-offset-[3px]">MEDIAN</span>
                    </>
                  ) : round?.mode === 'mode' ? (
                    <>
                      Pick the <span className="underline decoration-amber-200/90 underline-offset-[3px]">MODE</span>
                    </>
                  ) : (
                    'Pick the number'
                  )}
                </div>
              </div>
              <div className="answer-choice-surface grid grid-cols-2 gap-2">
                {round?.options.map((option, index) => {
                  const isSelected = selectedAnswer === option;
                  const isCorrect = feedback?.type === 'success' && isSelected;
                  return (
                    <motion.button
                      data-mean-answer={option}
                      key={`${option}-${index}`}
                      whileTap={{ scale: 0.97 }}
                      type="button"
                      onClick={() => handleAnswer(option)}
                      disabled={gameState !== 'answering' || !sessionActive}
                      animate={isCorrect ? { scale: [1, 1.1, 0.98, 1.05, 1], rotate: [0, -2, 2, 0] } : selectedAnswer === option && wrongPulse ? { x: [0, -6, 6, -4, 4, 0] } : { x: 0 }}
                      transition={{ duration: 0.28 }}
                      className={`rounded-[0.9rem] px-3 py-2 text-sm font-black transition-all ${
                        isCorrect
                          ? 'ui-button-success'
                          : isSelected
                            ? 'ui-button-primary'
                            : 'ui-button-secondary'
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
                <div className="text-[12px] font-black uppercase tracking-[0.18em] text-cyan-100/75">Island Machine</div>
                <h2 className="mt-1 text-2xl font-black uppercase tracking-[0.04em] text-amber-100">Machine Restored</h2>
                <p className="mt-2 text-sm font-semibold leading-relaxed text-cyan-100/82">
                  The sabotaged machine has been fully recalibrated.
                </p>
                <div className="mt-4 rounded-[1.25rem] border border-cyan-100/18 bg-slate-950/24 px-4 py-4">
                  <div className="text-[11px] font-black uppercase tracking-[0.18em] text-cyan-100/72">Final XP</div>
                  <div className="mt-1 text-4xl font-black text-amber-100">{XP}</div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    window.dispatchEvent(new Event(GAME_HUD_RESTART_EVENT));
                    restart();
                  }}
                  className="mx-auto mt-5 flex min-h-[3rem] items-center gap-2 rounded-full bg-[linear-gradient(180deg,#f8d66b_0%,#f2a82c_100%)] px-7 py-3 text-[13px] font-black uppercase tracking-[0.16em] text-slate-950 shadow-[0_8px_0_rgba(146,87,8,0.72),0_16px_24px_rgba(2,6,23,0.22)]"
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
                  : 'border-rose-200/55 bg-rose-500/24 text-amber-50'
              }`}
            >
              {feedback.type === 'success' ? <CheckCircle2 className="h-4 w-4 shrink-0" /> : <WandSparkles className="h-4 w-4 shrink-0" />}
              <span className="text-[13px] font-black uppercase tracking-[0.12em]">{feedback.message}</span>
            </motion.div>
          ) : null}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default MeanMachineGame;

