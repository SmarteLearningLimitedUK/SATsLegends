import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import {
  AlertTriangle,
  CheckCircle2,
  RotateCcw,
  Trophy,
  WandSparkles,
} from 'lucide-react';
import { GAME_HUD_RESTART_EVENT } from '../gameHudEvents';
import meanMachineImage from '../assets/mean.png';
import meanMachineBackground from '../assets/maps/backgroundsforgames/mean.jpg';
import medianMachineImage from '../assets/median.png';
import modeMachineImage from '../assets/mode.png';
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
  { left: 23.5, top: 39.6, width: 10.7, height: 13.2 },
  { left: 36.4, top: 39.6, width: 10.7, height: 13.2 },
  { left: 49.4, top: 39.6, width: 10.7, height: 13.2 },
  { left: 62.3, top: 39.6, width: 10.7, height: 13.2 },
  { left: 23.5, top: 54.1, width: 10.7, height: 12.6 },
  { left: 36.4, top: 54.1, width: 10.7, height: 12.6 },
  { left: 49.4, top: 54.1, width: 10.7, height: 12.6 },
  { left: 62.3, top: 54.1, width: 10.7, height: 12.6 },
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

const useAlphaKeyImage = (src: string, threshold = 220) => {
  const [processed, setProcessed] = useState(src);

  useEffect(() => {
    if (typeof window === 'undefined' || typeof Image === 'undefined') {
      setProcessed(src);
      return;
    }
    let isActive = true;
    const image = new Image();
    image.crossOrigin = 'anonymous';
    image.src = src;

    image.onload = () => {
      if (!isActive) return;
      const canvas = document.createElement('canvas');
      const width = image.naturalWidth || image.width;
      const height = image.naturalHeight || image.height;
      if (!width || !height) {
        setProcessed(src);
        return;
      }
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        setProcessed(src);
        return;
      }
      try {
        ctx.drawImage(image, 0, 0);
        const imageData = ctx.getImageData(0, 0, width, height);
        const data = imageData.data;
        for (let i = 0; i < data.length; i += 4) {
          const red = data[i];
          const green = data[i + 1];
          const blue = data[i + 2];
          const max = Math.max(red, green, blue);
          const min = Math.min(red, green, blue);
          const brightness = (red + green + blue) / 3;
          const lowSaturation = max - min <= 18;

          if (brightness >= threshold && lowSaturation) {
            data[i + 3] = 0;
          }
        }
        ctx.putImageData(imageData, 0, 0);
        setProcessed(canvas.toDataURL('image/png'));
      } catch {
        setProcessed(src);
      }
    };

    image.onerror = () => {
      if (isActive) setProcessed(src);
    };

    return () => {
      isActive = false;
    };
  }, [src, threshold]);

  return processed;
};

const scoreToStars = (XP: number) => {
  if (XP >= 2400) return 3;
  if (XP >= 1700) return 2;
  return 1;
};

const getActiveReelCount = (level: number) => {
  if (level <= 2) return 2;
  if (level <= 4) return 3;
  if (level <= 7) return 4;
  return 5;
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

const ROUND_MODES: RoundMode[] = ['mean', 'median', 'mode', 'missing'];

const buildMeanRound = (level: number): RoundData => {
  const useDoubleDigits = level >= 3;
  const minValue = useDoubleDigits ? 8 : 1;
  const maxValue = useDoubleDigits ? 26 + level : 9 + level;
  const activeCount = getActiveReelCount(level);
  const activeReelIndexes = getActiveReelIndexes(activeCount);
  const targetMean = useDoubleDigits ? randomInt(10, 18 + level) : randomInt(3, 10);

  let coreValues: number[] = [];
  let total = 0;
  for (let index = 0; index < activeCount - 1; index += 1) {
    const value = randomInt(minValue, maxValue);
    coreValues.push(value);
    total += value;
  }

  let finalValue = targetMean * activeCount - total;
  while (finalValue < minValue || finalValue > maxValue) {
    coreValues = [];
    total = 0;
    for (let index = 0; index < activeCount - 1; index += 1) {
      const value = randomInt(minValue, maxValue);
      coreValues.push(value);
      total += value;
    }
    finalValue = targetMean * activeCount - total;
  }

  const activeValues = shuffle([...coreValues, finalValue]);
  const actualValues = Array.from({ length: REEL_COUNT }, (_, index) => {
    const activeIndex = activeReelIndexes.indexOf(index);
    return activeIndex >= 0 ? activeValues[activeIndex] : 0;
  });
  const visibleValues = Array.from({ length: REEL_COUNT }, (_, index) => {
    const activeIndex = activeReelIndexes.indexOf(index);
    return activeIndex >= 0 ? activeValues[activeIndex] : null;
  });
  const optionCount = level <= 2 ? 3 : 4;
  const options = new Set<number>([targetMean]);
  while (options.size < optionCount) {
    const candidate = targetMean + randomInt(useDoubleDigits ? -6 : -3, useDoubleDigits ? 6 : 3);
    if (candidate > 0) options.add(candidate);
  }

  return {
    mode: 'mean',
    kind: 'fluency',
    visibleValues,
    actualValues,
    targetMean,
    correctAnswer: targetMean,
    options: shuffle(Array.from(options)),
    activeReelIndexes,
  };
};

const buildMedianRound = (level: number): RoundData => {
  const useDoubleDigits = level >= 6;
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

  const options = new Set<number>([median]);
  while (options.size < 4) {
    const candidate = median + randomInt(useDoubleDigits ? -8 : -4, useDoubleDigits ? 8 : 4);
    if (candidate > 0) options.add(candidate);
  }

  return {
    mode: 'median',
    kind: 'fluency',
    visibleValues,
    actualValues,
    targetMean: median,
    correctAnswer: median,
    options: shuffle(Array.from(options)),
    activeReelIndexes,
  };
};

const buildModeRound = (level: number): RoundData => {
  const useDoubleDigits = level >= 7;
  const minValue = useDoubleDigits ? 9 : 2;
  const maxValue = useDoubleDigits ? 30 + level : 16 + level;
  const baseCount = getActiveReelCount(level);
  const activeCount = clampOddCount(Math.min(REEL_COUNT, Math.max(3, baseCount)));
  const activeReelIndexes = getActiveReelIndexes(activeCount);
  const modeValue = randomInt(minValue, maxValue);
  const modeCopies = activeCount >= 5 ? 3 : 2;
  const distinctCount = Math.max(1, activeCount - modeCopies);

  const distinctValues: number[] = [];
  while (distinctValues.length < distinctCount) {
    const candidate = randomInt(minValue, maxValue);
    if (candidate !== modeValue && !distinctValues.includes(candidate)) {
      distinctValues.push(candidate);
    }
  }

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

  const options = new Set<number>([modeValue]);
  while (options.size < 4) {
    const candidate = modeValue + randomInt(useDoubleDigits ? -7 : -4, useDoubleDigits ? 7 : 4);
    if (candidate > 0) options.add(candidate);
  }

  return {
    mode: 'mode',
    kind: 'fluency',
    visibleValues,
    actualValues,
    targetMean: modeValue,
    correctAnswer: modeValue,
    options: shuffle(Array.from(options)),
    activeReelIndexes,
  };
};

const buildMissingRound = (level: number): RoundData => {
  const useDoubleDigits = level >= 8;
  const minValue = useDoubleDigits ? 12 : 4;
  const maxValue = useDoubleDigits ? 34 : 18 + level * 2;
  const activeCount = getActiveReelCount(level);
  const activeReelIndexes = getActiveReelIndexes(activeCount);
  const targetMean = useDoubleDigits ? randomInt(14, 24) : randomInt(6, 15);
  const missingActiveIndex = randomInt(1, Math.max(1, activeCount - 2));
  const missingIndex = activeReelIndexes[missingActiveIndex];

  let visibleValues: number[] = [];
  let total = 0;
  for (let index = 0; index < activeCount - 1; index += 1) {
    const value = randomInt(minValue, maxValue);
    visibleValues.push(value);
    total += value;
  }

  let missingValue = targetMean * activeCount - total;
  while (missingValue < minValue || missingValue > maxValue) {
    visibleValues = [];
    total = 0;
    for (let index = 0; index < activeCount - 1; index += 1) {
      const value = randomInt(minValue, maxValue);
      visibleValues.push(value);
      total += value;
    }
    missingValue = targetMean * activeCount - total;
  }

  const activeActualValues = [...visibleValues];
  activeActualValues.splice(missingActiveIndex, 0, missingValue);
  const actualValues = Array.from({ length: REEL_COUNT }, (_, index) => {
    const activeIndex = activeReelIndexes.indexOf(index);
    return activeIndex >= 0 ? activeActualValues[activeIndex] : 0;
  });
  const visible = Array.from({ length: REEL_COUNT }, (_, index) => {
    const activeIndex = activeReelIndexes.indexOf(index);
    if (activeIndex < 0) return null;
    return index === missingIndex ? null : activeActualValues[activeIndex];
  });

  const options = new Set<number>([missingValue]);
  while (options.size < 4) {
    const candidate = missingValue + randomInt(-7, 7);
    if (candidate > 0) options.add(candidate);
  }

  return {
    mode: 'missing',
    kind: 'reasoning',
    visibleValues: visible,
    actualValues,
    targetMean,
    correctAnswer: missingValue,
    options: shuffle(Array.from(options)),
    activeReelIndexes,
  };
};

const buildRound = (level: number, previousMode: RoundMode | null = null) => {
  const preferredMode = ROUND_MODES[(level - 1) % ROUND_MODES.length];
  const mode = preferredMode === previousMode
    ? ROUND_MODES[(ROUND_MODES.indexOf(preferredMode) + 1) % ROUND_MODES.length]
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
    className={`relative flex h-full w-full items-center justify-center overflow-hidden rounded-[0.9rem] border border-slate-200/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(241,245,249,0.98))] shadow-[inset_0_1px_0_rgba(255,255,255,0.95),0_2px_8px_rgba(15,23,42,0.18)] ${
      isInactive ? 'opacity-50 saturate-0' : ''
    }`}
  >
    <div className={`relative z-10 text-[clamp(1.7rem,4.1vw,2.5rem)] font-bold tracking-[-0.02em] ${isInactive ? 'text-[#163a7a]/55' : 'text-[#163a7a]'}`}>
      {isInactive ? '' : value}
    </div>
  </motion.div>
);

const MeanMachineGame: React.FC<MeanMachineGameProps> = ({
  levelId: _levelId,
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
  const [level, setLevel] = useState(1);
  const [XP, setXP] = useState(0);
  const [gameState, setGameState] = useState<GameState>('idle');
  const [showPracticeIntro, setShowPracticeIntro] = useState(Boolean(isPractice));
  const [round, setRound] = useState<RoundData | null>(null);
  const [reelDisplay, setReelDisplay] = useState<Array<number | string>>(Array.from({ length: REEL_COUNT }, () => '?'));
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
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
    let nextRound = buildRound(targetLevel, previousMode);
    let nextSignature = roundSignature(nextRound);
    let guard = 0;
    while (lastRoundRef.current.includes(nextSignature) && guard < 10) {
      nextRound = buildRound(targetLevel, previousMode);
      nextSignature = roundSignature(nextRound);
      guard += 1;
    }
    lastRoundRef.current = [...lastRoundRef.current.slice(-4), nextSignature];
    setRound(nextRound);
    setGameState('idle');
    setFeedback(null);
    setSelectedAnswer(null);
    setShowJackpot(false);
    setShowGlitch(false);
    setSpinPulse(false);
    setMachineShake(false);
    setReelSettled(false);
    setWrongPulse(false);
    setReelDisplay(Array.from({ length: REEL_COUNT }, () => '?'));
  }, [clearTimers]);

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
    if (!round || gameState === 'spinning' || !sessionActive) return;

    clearTimers();
    answerLockedRef.current = false;
    setFeedback(null);
    setSelectedAnswer(null);
    setShowJackpot(false);
    setShowGlitch(false);
    setSpinPulse(true);
    setMachineShake(true);
    setGameState('spinning');

    queueTimeout(() => setSpinPulse(false), 320);
    queueTimeout(() => setMachineShake(false), 420);

    for (let tick = 0; tick < 10; tick += 1) {
      queueTimeout(() => {
        setReelDisplay(Array.from({ length: REEL_COUNT }, (_, index) => {
          if (!round.activeReelIndexes.includes(index)) return '';
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
    if (!round) return { title: 'Spin the reels', prompt: 'Recalibrate the machine to begin.' };
    if (round.mode === 'mean') {
      return {
        title: `Spin ${round.activeReelIndexes.length} reels. Find the MEAN.`,
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
      title: 'Fix the missing reel.',
      prompt: `Choose the number that repairs the MEAN of ${round.activeReelIndexes.length} reels.`,
    };
  }, [round]);

  const machineImage = useMemo(() => {
    if (round?.mode === 'median') return medianMachineImage;
    if (round?.mode === 'mode') return modeMachineImage;
    return meanMachineImage;
  }, [round?.mode]);
  const alphaKeyedMachineImage = useAlphaKeyImage(machineImage);

  return (
    <div className="relative h-full w-full overflow-hidden select-none text-white">
      <PracticeIntroPopup
        open={showPracticeIntro}
        title="Mean Machine"
        body="The Monster Minds have sabotaged the island machine.\nSpin the reels and solve the clues to recalibrate it.\nUse the right method for each round."
        briefing={practiceBriefing}
        onAction={() => setShowPracticeIntro(false)}
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: `url(${meanMachineBackground})` }}
      />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_10%,rgba(56,189,248,0.18),transparent_34%),radial-gradient(circle_at_12%_82%,rgba(59,130,246,0.14),transparent_28%),radial-gradient(circle_at_88%_78%,rgba(251,191,36,0.12),transparent_30%),linear-gradient(180deg,rgba(3,7,18,0.2),rgba(3,7,18,0.5))]" />
      <div className="pointer-events-none absolute inset-x-[16%] top-[10%] h-24 rounded-full bg-cyan-300/12 blur-3xl" />

      <div className="relative z-10 flex h-full min-h-0 flex-col px-3 pb-[calc(env(safe-area-inset-bottom)+4.45rem)] pt-2 md:px-4">
        <div className="flex h-full min-h-0 flex-col gap-2.5">
          <section className="shrink-0">
            <GameQuestionCard title="Mean Machine" subtitle={modeCopy.prompt}>
              {modeCopy.title}
            </GameQuestionCard>
          </section>

          <main className="flex min-h-0 flex-1 flex-col gap-2.5">
            <section className="relative min-h-0 flex-1 overflow-hidden rounded-[1.6rem] border border-transparent bg-transparent px-2 py-2 shadow-none">

              <div className="relative flex h-full min-h-0 flex-col gap-2.5">
                <div className="relative flex min-h-0 flex-1 items-center justify-center overflow-hidden rounded-[1.35rem] border border-transparent bg-transparent px-1 py-1">
                  <motion.div
                    animate={machineShake ? { x: [0, -6, 6, -4, 4, 0] } : { x: 0 }}
                    transition={{ duration: 0.34 }}
                    className="relative mx-auto flex h-full w-full max-w-[32rem] items-center justify-center md:max-w-[34rem]"
                  >

                      <div
                        className="relative w-full max-w-[34rem] md:max-w-[36.5rem] isolate"
                        style={{ aspectRatio: '4 / 5', transform: 'scale(1)', transformOrigin: 'center' }}
                      >
                      <img
                        src={alphaKeyedMachineImage}
                        alt="MEAN Machine slot machine"
                        draggable={false}
                        className="pointer-events-none absolute inset-0 z-[12] h-full w-full object-cover object-center"
                      />

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
                        disabled={!round || gameState === 'spinning' || !sessionActive}
                        animate={spinPulse ? { scale: [1, 0.94, 1.06, 1], y: [0, 2, -1, 0] } : { scale: [1, 1.03, 1], y: [0, -1, 0] }}
                        transition={spinPulse ? { duration: 0.34 } : { duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
                        className="absolute z-30 flex items-center justify-center rounded-[1.2rem] bg-transparent text-[0.98rem] font-black uppercase tracking-[0.18em] text-cyan-50 disabled:cursor-not-allowed disabled:opacity-65 md:text-[1.05rem]"
                        aria-label="Press the MEAN Machine base button"
                        style={{
                          left: '31.7%',
                          top: '79.6%',
                          width: '31.2%',
                          height: '6.9%',
                        }}
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
                    </div>
                  </motion.div>
                </div>
              </div>
            </section>

            <section className="shrink-0 rounded-[1.35rem] border border-cyan-100/22 bg-[linear-gradient(180deg,rgba(10,31,83,0.92),rgba(7,21,58,0.96))] p-2.5 shadow-[0_16px_26px_rgba(2,6,23,0.34)]">
              <div className="mb-2 flex items-center justify-start gap-2">
                <div className="text-[11px] font-black uppercase tracking-[0.16em] text-cyan-100/74">
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
              <div className={`answer-choice-surface grid gap-2 ${round && round.options.length === 3 ? 'grid-cols-3' : 'grid-cols-4'}`}>
                {round?.options.map((option, index) => {
                  const isSelected = selectedAnswer === option;
                  const isCorrect = feedback?.type === 'success' && isSelected;
                  return (
                    <motion.button
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
                <div className="text-[10px] font-black uppercase tracking-[0.18em] text-cyan-100/75">Island Machine</div>
                <h2 className="mt-1 text-2xl font-black uppercase tracking-[0.04em] text-amber-100">Machine Restored</h2>
                <p className="mt-2 text-sm font-semibold leading-relaxed text-cyan-100/82">
                  The sabotaged machine has been fully recalibrated.
                </p>
                <div className="mt-4 rounded-[1.25rem] border border-cyan-100/18 bg-slate-950/24 px-4 py-4">
                  <div className="text-[9px] font-black uppercase tracking-[0.18em] text-cyan-100/72">Final XP</div>
                  <div className="mt-1 text-4xl font-black text-amber-100">{XP}</div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    window.dispatchEvent(new Event(GAME_HUD_RESTART_EVENT));
                    restart();
                  }}
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
                  : 'border-rose-200/55 bg-rose-500/24 text-amber-50'
              }`}
            >
              {feedback.type === 'success' ? <CheckCircle2 className="h-4 w-4 shrink-0" /> : <WandSparkles className="h-4 w-4 shrink-0" />}
              <span className="text-[11px] font-black uppercase tracking-[0.12em]">{feedback.message}</span>
            </motion.div>
          ) : null}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default MeanMachineGame;

