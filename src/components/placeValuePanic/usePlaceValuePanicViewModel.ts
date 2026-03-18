import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  PlaceValuePanicLevelConfig,
  getPlaceValuePanicLevelConfig,
} from '../../content/island1NumberBaseCamp';
import { triggerHaptic } from '../../haptics';

export type PlaceValueSlotKey =
  | 'thousands'
  | 'hundreds'
  | 'tens'
  | 'ones'
  | 'tenths'
  | 'hundredths';

export interface PlaceValueSlot {
  id: string;
  key: PlaceValueSlotKey;
  label: string;
  acceptedDigit: number;
  isFilled: boolean;
}

export interface DigitTile {
  id: string;
  digitValue: number;
  originalTrayIndex: number;
  isPlaced: boolean;
  correctSlotKey: PlaceValueSlotKey | 'distractor';
}

export interface PlaceValueRound {
  id: string;
  targetNumberDisplay: string;
  digits: DigitTile[];
  slots: PlaceValueSlot[];
  difficultyTier: number;
  skillTags: string[];
}

export interface RoundResult {
  success: boolean;
  scoreEarned: number;
  accuracy: number;
  comboPeak: number;
  starsAwarded: number;
}

type FeedbackTone = 'success' | 'warning' | 'error';

interface FeedbackState {
  id: number;
  title: string;
  detail: string;
  tone: FeedbackTone;
}

interface UsePlaceValuePanicViewModelArgs {
  levelId: number;
  miniGameLevel?: number;
  onVictory: (stars: number, score: number) => void;
  onGameOver: (score: number) => void;
}

interface DropResult {
  result: 'correct' | 'incorrect' | 'ignored';
  correctSlotKey?: PlaceValueSlotKey;
}

const SLOT_LABELS: Record<PlaceValueSlotKey, string> = {
  thousands: 'Thousands',
  hundreds: 'Hundreds',
  tens: 'Tens',
  ones: 'Ones',
  tenths: 'Tenths',
  hundredths: 'Hundredths',
};

const SLOT_ORDER: PlaceValueSlotKey[] = [
  'thousands',
  'hundreds',
  'tens',
  'ones',
  'tenths',
  'hundredths',
];

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

const randomInt = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;

const shuffle = <T,>(items: T[]): T[] => {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
};

const createUniqueId = (prefix: string) => `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

const columnsForTier = (tier: number): PlaceValueSlotKey[] => {
  if (tier <= 1) return ['tens', 'ones'];
  if (tier === 2) return ['hundreds', 'tens', 'ones'];
  if (tier <= 4) return ['thousands', 'hundreds', 'tens', 'ones'];
  return ['tens', 'ones', 'tenths', 'hundredths'];
};

const buildRound = (levelConfig: PlaceValuePanicLevelConfig, roundIndex: number): PlaceValueRound => {
  const tier = levelConfig.difficultyTier;
  const slotKeys = columnsForTier(tier);
  const slotDigits: Record<PlaceValueSlotKey, number> = {
    thousands: 0,
    hundreds: 0,
    tens: 0,
    ones: 0,
    tenths: 0,
    hundredths: 0,
  };

  for (let i = 0; i < slotKeys.length; i += 1) {
    const slotKey = slotKeys[i];
    const needsNonZero =
      (slotKey === 'thousands' || slotKey === 'hundreds' || slotKey === 'tens')
      && i === 0;
    slotDigits[slotKey] = randomInt(needsNonZero ? 1 : 0, 9);
  }

  if (tier >= 5 && slotDigits.tenths === 0 && slotDigits.hundredths === 0) {
    slotDigits.tenths = randomInt(1, 9);
  }

  let targetNumberDisplay = '';
  if (tier >= 5) {
    const integerPart = slotDigits.tens * 10 + slotDigits.ones;
    targetNumberDisplay = `${integerPart}.${slotDigits.tenths}${slotDigits.hundredths}`;
  } else {
    const value = (slotDigits.thousands * 1000)
      + (slotDigits.hundreds * 100)
      + (slotDigits.tens * 10)
      + slotDigits.ones;
    targetNumberDisplay = new Intl.NumberFormat('en-GB').format(value);
  }

  const slots: PlaceValueSlot[] = slotKeys.map((slotKey) => ({
    id: `${createUniqueId('slot')}-${slotKey}`,
    key: slotKey,
    label: SLOT_LABELS[slotKey],
    acceptedDigit: slotDigits[slotKey],
    isFilled: false,
  }));

  const baseTiles: DigitTile[] = slots.map((slot, index) => ({
    id: createUniqueId('tile'),
    digitValue: slot.acceptedDigit,
    originalTrayIndex: index,
    isPlaced: false,
    correctSlotKey: slot.key,
  }));

  const withDistractors = tier >= 4
    ? [
      ...baseTiles,
      {
        id: createUniqueId('tile'),
        digitValue: randomInt(0, 9),
        originalTrayIndex: baseTiles.length,
        isPlaced: false,
        correctSlotKey: 'distractor' as const,
      },
    ]
    : baseTiles;

  return {
    id: createUniqueId(`round-${roundIndex}`),
    targetNumberDisplay,
    digits: shuffle(withDistractors).map((tile, index) => ({ ...tile, originalTrayIndex: index })),
    slots,
    difficultyTier: tier,
    skillTags: levelConfig.skillTags,
  };
};

const pressureRatePerSecond = (tier: number) => {
  switch (tier) {
    case 1: return 1.4;
    case 2: return 1.8;
    case 3: return 2.4;
    case 4: return 3.0;
    default: return 3.6;
  }
};

export const usePlaceValuePanicViewModel = ({
  levelId,
  miniGameLevel,
  onVictory,
  onGameOver,
}: UsePlaceValuePanicViewModelArgs) => {
  const resolvedMiniGameLevel = clamp(miniGameLevel || levelId, 1, 10);
  const levelConfig = useMemo(
    () => getPlaceValuePanicLevelConfig(resolvedMiniGameLevel),
    [resolvedMiniGameLevel],
  );

  const [round, setRound] = useState<PlaceValueRound>(() => buildRound(levelConfig, 1));
  const [roundNumber, setRoundNumber] = useState(1);
  const [roundsCleared, setRoundsCleared] = useState(0);
  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(0);
  const [comboPeak, setComboPeak] = useState(0);
  const [attempts, setAttempts] = useState(0);
  const [correctPlacements, setCorrectPlacements] = useState(0);
  const [mistakes, setMistakes] = useState(0);
  const [pressure, setPressure] = useState(0);
  const [timeLeft, setTimeLeft] = useState(levelConfig.timeLimitSec);
  const [feedback, setFeedback] = useState<FeedbackState | null>(null);
  const [isPaused, setIsPaused] = useState(false);
  const [isResolved, setIsResolved] = useState(false);
  const [hintSlotKey, setHintSlotKey] = useState<PlaceValueSlotKey | null>(null);
  const [lastRejectedTileId, setLastRejectedTileId] = useState<string | null>(null);

  const onVictoryRef = useRef(onVictory);
  const onGameOverRef = useRef(onGameOver);
  const roundTimerRef = useRef<number | null>(null);

  useEffect(() => { onVictoryRef.current = onVictory; }, [onVictory]);
  useEffect(() => { onGameOverRef.current = onGameOver; }, [onGameOver]);

  const setFeedbackState = useCallback((title: string, detail: string, tone: FeedbackTone) => {
    setFeedback({
      id: Date.now(),
      title,
      detail,
      tone,
    });
  }, []);

  const clearRoundTimer = useCallback(() => {
    if (roundTimerRef.current !== null) {
      window.clearTimeout(roundTimerRef.current);
      roundTimerRef.current = null;
    }
  }, []);

  const resetAll = useCallback(() => {
    clearRoundTimer();
    setRound(buildRound(levelConfig, 1));
    setRoundNumber(1);
    setRoundsCleared(0);
    setScore(0);
    setCombo(0);
    setComboPeak(0);
    setAttempts(0);
    setCorrectPlacements(0);
    setMistakes(0);
    setPressure(0);
    setTimeLeft(levelConfig.timeLimitSec);
    setIsPaused(false);
    setIsResolved(false);
    setHintSlotKey(null);
    setLastRejectedTileId(null);
    setFeedbackState('Stabilise the number system', 'Drag each digit into the correct place.', 'warning');
  }, [clearRoundTimer, levelConfig, setFeedbackState]);

  useEffect(() => {
    resetAll();
  }, [resetAll]);

  useEffect(() => {
    if (!feedback) return undefined;
    const timeout = window.setTimeout(() => setFeedback(null), 900);
    return () => window.clearTimeout(timeout);
  }, [feedback]);

  useEffect(() => {
    if (isResolved || isPaused) return undefined;
    const interval = window.setInterval(() => {
      setPressure((prev) => {
        const next = prev + (pressureRatePerSecond(levelConfig.difficultyTier) / 5);
        if (next >= 100) {
          setIsResolved(true);
          setFeedbackState('System Overload', 'Queue pressure reached critical level.', 'error');
          triggerHaptic('error');
          window.setTimeout(() => onGameOverRef.current(Math.max(0, Math.round(score))), 320);
          return 100;
        }
        return next;
      });
    }, 200);
    return () => window.clearInterval(interval);
  }, [isPaused, isResolved, levelConfig.difficultyTier, score, setFeedbackState]);

  useEffect(() => {
    if (isResolved || isPaused) return undefined;
    const interval = window.setInterval(() => {
      setTimeLeft((prev) => {
        const next = prev - 1;
        if (next <= 0) {
          setIsResolved(true);
          setFeedbackState('Time Out', 'You ran out of time before stabilising the queue.', 'error');
          triggerHaptic('error');
          window.setTimeout(() => onGameOverRef.current(Math.max(0, Math.round(score))), 320);
          return 0;
        }
        return next;
      });
    }, 1000);
    return () => window.clearInterval(interval);
  }, [isPaused, isResolved, score, setFeedbackState]);

  const placedBySlot = useMemo(() => {
    const placed = new Map<PlaceValueSlotKey, DigitTile>();
    round.digits.forEach((tile) => {
      if (!tile.isPlaced || tile.correctSlotKey === 'distractor') return;
      placed.set(tile.correctSlotKey, tile);
    });
    return placed;
  }, [round.digits]);

  const trayTiles = useMemo(
    () => round.digits.filter((tile) => !tile.isPlaced),
    [round.digits],
  );

  const slots = useMemo(
    () => round.slots.map((slot) => ({
      ...slot,
      isFilled: placedBySlot.has(slot.key),
    })),
    [placedBySlot, round.slots],
  );

  const progress = useMemo(
    () => Math.round((roundsCleared / Math.max(1, levelConfig.promptsToClear)) * 100),
    [levelConfig.promptsToClear, roundsCleared],
  );

  const accuracy = useMemo(
    () => (attempts > 0 ? correctPlacements / attempts : 1),
    [attempts, correctPlacements],
  );

  const roundComplete = useMemo(
    () => slots.every((slot) => slot.isFilled),
    [slots],
  );

  const moveToNextRound = useCallback(() => {
    const nextRoundIndex = roundNumber + 1;
    setRound(buildRound(levelConfig, nextRoundIndex));
    setRoundNumber(nextRoundIndex);
    setHintSlotKey(null);
  }, [levelConfig, roundNumber]);

  const resolveVictory = useCallback((finalScore: number) => {
    setIsResolved(true);
    const speedRatio = timeLeft / Math.max(1, levelConfig.timeLimitSec);
    const stars = accuracy >= 0.9 && speedRatio >= 0.32 ? 3 : accuracy >= 0.75 ? 2 : 1;
    const _result: RoundResult = {
      success: true,
      scoreEarned: finalScore,
      accuracy,
      comboPeak,
      starsAwarded: stars,
    };
    setFeedbackState('System Stable', `Run complete. Accuracy ${Math.round(accuracy * 100)}%.`, 'success');
    triggerHaptic('success');
    window.setTimeout(() => onVictoryRef.current(stars, Math.round(finalScore)), 360);
  }, [accuracy, comboPeak, levelConfig.timeLimitSec, setFeedbackState, timeLeft]);

  useEffect(() => {
    if (!roundComplete || isResolved) return;
    clearRoundTimer();
    const completionBonus = 80 + levelConfig.difficultyTier * 30;
    const speedBonus = Math.max(25, Math.round((100 - pressure) * 1.3));
    const perfectBonus = mistakes === 0 ? 120 : 0;
    const totalBonus = completionBonus + speedBonus + perfectBonus;
    const nextScore = score + totalBonus;
    const nextCleared = roundsCleared + 1;

    setScore(nextScore);
    setRoundsCleared(nextCleared);
    setPressure((prev) => Math.max(0, prev - 14));
    setFeedbackState('Board Complete', `+${totalBonus} (combo + speed + clear)`, 'success');

    if (nextCleared >= levelConfig.promptsToClear) {
      resolveVictory(nextScore);
      return;
    }

    roundTimerRef.current = window.setTimeout(() => {
      moveToNextRound();
    }, 280);

    return clearRoundTimer;
  }, [
    clearRoundTimer,
    isResolved,
    levelConfig.difficultyTier,
    levelConfig.promptsToClear,
    mistakes,
    moveToNextRound,
    pressure,
    resolveVictory,
    roundComplete,
    roundsCleared,
    score,
    setFeedbackState,
  ]);

  useEffect(() => () => clearRoundTimer(), [clearRoundTimer]);

  const onTileGrab = useCallback((tileId: string) => {
    if (isResolved || isPaused) return;
    const tile = round.digits.find((item) => item.id === tileId);
    if (!tile || tile.isPlaced) return;
    if (resolvedMiniGameLevel <= 2 && tile.correctSlotKey !== 'distractor') {
      setHintSlotKey(tile.correctSlotKey);
    } else {
      setHintSlotKey(null);
    }
  }, [isPaused, isResolved, resolvedMiniGameLevel, round.digits]);

  const onDropTile = useCallback((tileId: string, slotKey: PlaceValueSlotKey | null): DropResult => {
    if (isResolved || isPaused) return { result: 'ignored' };
    const tile = round.digits.find((item) => item.id === tileId);
    if (!tile || tile.isPlaced) return { result: 'ignored' };

    setAttempts((prev) => prev + 1);
    setHintSlotKey(null);

    const isValidDrop = Boolean(
      slotKey
      && tile.correctSlotKey !== 'distractor'
      && tile.correctSlotKey === slotKey
      && !placedBySlot.has(slotKey),
    );

    if (isValidDrop && slotKey) {
      setRound((prev) => ({
        ...prev,
        digits: prev.digits.map((digitTile) => (
          digitTile.id === tileId ? { ...digitTile, isPlaced: true } : digitTile
        )),
      }));
      const comboNext = combo + 1;
      const points = Math.round(90 + levelConfig.difficultyTier * 22 + comboNext * 12);
      setScore((prev) => prev + points);
      setCombo(comboNext);
      setComboPeak((prev) => Math.max(prev, comboNext));
      setCorrectPlacements((prev) => prev + 1);
      setPressure((prev) => Math.max(0, prev - 6));
      setFeedbackState('Correct Placement', `+${points}`, 'success');
      triggerHaptic('selection');
      return { result: 'correct' };
    }

    setCombo(0);
    setMistakes((prev) => prev + 1);
    setPressure((prev) => Math.min(100, prev + 10));
    setScore((prev) => Math.max(0, prev - 25));
    setLastRejectedTileId(tileId);
    setFeedbackState('Incorrect Slot', 'Tile returned to tray.', 'error');
    triggerHaptic('error');
    window.setTimeout(() => {
      setLastRejectedTileId((current) => (current === tileId ? null : current));
    }, 260);

    return {
      result: 'incorrect',
      correctSlotKey: tile.correctSlotKey === 'distractor' ? undefined : tile.correctSlotKey,
    };
  }, [
    combo,
    isPaused,
    isResolved,
    levelConfig.difficultyTier,
    placedBySlot,
    round.digits,
    setFeedbackState,
  ]);

  return {
    levelConfig,
    resolvedMiniGameLevel,
    round,
    roundNumber,
    slots,
    trayTiles,
    placedBySlot,
    score,
    combo,
    comboPeak,
    pressure: clamp(pressure, 0, 100),
    timeLeft,
    progress,
    roundsCleared,
    accuracy,
    feedback,
    isPaused,
    setIsPaused,
    hintSlotKey,
    lastRejectedTileId,
    onTileGrab,
    onDropTile,
  };
};
