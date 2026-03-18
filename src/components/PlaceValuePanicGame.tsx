import React, { useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { AVATARS } from '../constants';
import { triggerHaptic } from '../haptics';
import { getPlaceValuePanicLevelConfig } from '../content/island1NumberBaseCamp';
import GameContainerView from './GameContainerView';

interface PlaceValuePanicGameProps {
  levelId: number;
  miniGameLevel?: number;
  avatarId: string;
  onVictory: (stars: number, score: number) => void;
  onGameOver: (score: number) => void;
  onBack: () => void;
}

type PlaceColumn = 'ones' | 'tens' | 'hundreds' | 'thousands';

interface QueueDigitToken {
  id: string;
  digit: number;
}

interface PlaceValuePrompt {
  id: string;
  digits: Record<PlaceColumn, number>;
  targetValue: number;
}

interface FeedbackState {
  id: number;
  title: string;
  detail: string;
  tone: 'success' | 'warning' | 'error';
}

const COLUMN_ORDER: PlaceColumn[] = ['thousands', 'hundreds', 'tens', 'ones'];
const COLUMN_VALUES: Record<PlaceColumn, number> = {
  ones: 1,
  tens: 10,
  hundreds: 100,
  thousands: 1000,
};

const COLUMN_LABELS: Record<PlaceColumn, string> = {
  ones: 'Ones',
  tens: 'Tens',
  hundreds: 'Hundreds',
  thousands: 'Thousands',
};

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

const randomInt = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;

const buildPrompt = (activeColumns: PlaceColumn[]): PlaceValuePrompt => {
  const sortedColumns = [...activeColumns].sort((a, b) => COLUMN_VALUES[b] - COLUMN_VALUES[a]);
  const digits: Record<PlaceColumn, number> = {
    ones: 0,
    tens: 0,
    hundreds: 0,
    thousands: 0,
  };
  const usedDigits = new Set<number>();

  sortedColumns.forEach((column, index) => {
    const needsNonZero = index === 0 && COLUMN_VALUES[column] >= 10;
    let digit = randomInt(needsNonZero ? 1 : 0, 9);
    while (usedDigits.has(digit)) {
      digit = randomInt(needsNonZero ? 1 : 0, 9);
    }
    usedDigits.add(digit);
    digits[column] = digit;
  });

  const targetValue = sortedColumns.reduce((sum, column) => sum + (digits[column] * COLUMN_VALUES[column]), 0);
  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    digits,
    targetValue,
  };
};

const makeToken = (digit: number): QueueDigitToken => ({
  id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
  digit,
});

const seedQueueFromPrompt = (
  prompt: PlaceValuePrompt,
  activeColumns: PlaceColumn[],
  queueLimit: number,
): QueueDigitToken[] => {
  const desiredCount = clamp(Math.min(4, queueLimit), 2, 4);
  const mustHaveDigits = activeColumns.map((column) => prompt.digits[column]);
  const seededDigits: number[] = [];

  for (const digit of mustHaveDigits) {
    if (seededDigits.length >= desiredCount) break;
    seededDigits.push(digit);
  }

  while (seededDigits.length < desiredCount) {
    seededDigits.push(randomInt(0, 9));
  }

  return seededDigits
    .sort(() => Math.random() - 0.5)
    .map((digit) => makeToken(digit));
};

const PlaceValuePanicGame: React.FC<PlaceValuePanicGameProps> = ({
  levelId,
  miniGameLevel,
  avatarId,
  onVictory,
  onGameOver,
  onBack,
}) => {
  const avatar = useMemo(() => AVATARS.find((item) => item.id === avatarId) || AVATARS[0], [avatarId]);
  const resolvedMiniGameLevel = clamp(miniGameLevel || levelId, 1, 10);
  const levelConfig = useMemo(() => getPlaceValuePanicLevelConfig(resolvedMiniGameLevel), [resolvedMiniGameLevel]);
  const activeColumns = useMemo(
    () => [...levelConfig.activeColumns].sort((a, b) => COLUMN_VALUES[b] - COLUMN_VALUES[a]),
    [levelConfig.activeColumns],
  );

  const [queue, setQueue] = useState<QueueDigitToken[]>([]);
  const [selectedTokenId, setSelectedTokenId] = useState<string | null>(null);
  const [placed, setPlaced] = useState<Partial<Record<PlaceColumn, QueueDigitToken>>>({});
  const [prompt, setPrompt] = useState<PlaceValuePrompt>(() => buildPrompt(levelConfig.activeColumns));
  const [promptsCleared, setPromptsCleared] = useState(0);
  const [score, setScore] = useState(0);
  const [attempts, setAttempts] = useState(0);
  const [correctPlacements, setCorrectPlacements] = useState(0);
  const [timeLeft, setTimeLeft] = useState(levelConfig.timeLimitSec);
  const [feedback, setFeedback] = useState<FeedbackState | null>(null);
  const [isPaused, setIsPaused] = useState(false);
  const [resultState, setResultState] = useState<'running' | 'victory' | 'gameover'>('running');

  const promptStartedAtRef = useRef(Date.now());
  const hasResolvedRef = useRef(false);
  const scoreRef = useRef(score);
  const attemptsRef = useRef(attempts);
  const correctPlacementsRef = useRef(correctPlacements);

  useEffect(() => { scoreRef.current = score; }, [score]);
  useEffect(() => { attemptsRef.current = attempts; }, [attempts]);
  useEffect(() => { correctPlacementsRef.current = correctPlacements; }, [correctPlacements]);

  const setFeedbackState = (title: string, detail: string, tone: FeedbackState['tone']) => {
    setFeedback({
      id: Date.now(),
      title,
      detail,
      tone,
    });
  };

  const resetRound = (nextPrompt: PlaceValuePrompt) => {
    setPrompt(nextPrompt);
    setPlaced({});
    setSelectedTokenId(null);
    setQueue(seedQueueFromPrompt(nextPrompt, activeColumns, levelConfig.queueLimit));
    promptStartedAtRef.current = Date.now();
  };

  const resolveVictory = (projectedScore?: number) => {
    if (hasResolvedRef.current) return;
    hasResolvedRef.current = true;
    setResultState('victory');

    const finalScore = Math.max(0, Math.round(projectedScore ?? scoreRef.current));
    const accuracy = attemptsRef.current > 0 ? correctPlacementsRef.current / attemptsRef.current : 1;
    const speedRatio = timeLeft / levelConfig.timeLimitSec;
    const stars = accuracy >= 0.9 && speedRatio >= 0.25
      ? 3
      : accuracy >= 0.72
        ? 2
        : 1;

    setFeedbackState('Order Complete', `Run finished with ${Math.round(accuracy * 100)}% accuracy.`, 'success');
    triggerHaptic('success');
    window.setTimeout(() => onVictory(stars, finalScore), 420);
  };

  const resolveGameOver = (title: string, detail: string) => {
    if (hasResolvedRef.current) return;
    hasResolvedRef.current = true;
    setResultState('gameover');
    setFeedbackState(title, detail, 'error');
    triggerHaptic('error');
    window.setTimeout(() => onGameOver(Math.max(0, Math.round(scoreRef.current))), 380);
  };

  useEffect(() => {
    const initialPrompt = buildPrompt(levelConfig.activeColumns);
    hasResolvedRef.current = false;
    setQueue(seedQueueFromPrompt(initialPrompt, activeColumns, levelConfig.queueLimit));
    setSelectedTokenId(null);
    setPlaced({});
    setPrompt(initialPrompt);
    setPromptsCleared(0);
    setScore(0);
    setAttempts(0);
    setCorrectPlacements(0);
    setTimeLeft(levelConfig.timeLimitSec);
    setFeedback({
      id: Date.now(),
      title: 'Match the target value',
      detail: 'Place digits into the correct place-value columns.',
      tone: 'warning',
    });
    setIsPaused(false);
    setResultState('running');
    promptStartedAtRef.current = Date.now();
  }, [activeColumns, levelConfig.activeColumns, levelConfig.queueLimit, levelConfig.timeLimitSec]);

  useEffect(() => {
    if (queue.length > 0 || resultState !== 'running') return;
    setQueue(seedQueueFromPrompt(prompt, activeColumns, levelConfig.queueLimit));
  }, [activeColumns, levelConfig.queueLimit, prompt, queue.length, resultState]);

  useEffect(() => {
    if (resultState !== 'running' || isPaused) return undefined;
    const timerId = window.setInterval(() => {
      setTimeLeft((previous) => {
        if (previous <= 1) {
          window.clearInterval(timerId);
          resolveGameOver('Time Out', 'You ran out of time before clearing the target queue.');
          return 0;
        }
        return previous - 1;
      });
    }, 1000);
    return () => window.clearInterval(timerId);
  }, [isPaused, resultState]);

  useEffect(() => {
    if (resultState !== 'running' || isPaused) return undefined;
    const spawnTimer = window.setInterval(() => {
      setQueue((previous) => {
        const unresolvedColumns = activeColumns.filter((column) => !placed[column]);
        const spawnHelpful = unresolvedColumns.length > 0 && Math.random() > levelConfig.decoyChance;
        let nextDigit: number;

        if (spawnHelpful) {
          const column = unresolvedColumns[randomInt(0, unresolvedColumns.length - 1)];
          nextDigit = prompt.digits[column];
        } else {
          const blockedDigits = new Set(unresolvedColumns.map((column) => prompt.digits[column]));
          nextDigit = randomInt(0, 9);
          let attemptsForDecoy = 0;
          while (blockedDigits.has(nextDigit) && attemptsForDecoy < 12) {
            nextDigit = randomInt(0, 9);
            attemptsForDecoy += 1;
          }
        }

        return [...previous, makeToken(nextDigit)];
      });
    }, levelConfig.spawnIntervalMs);

    return () => window.clearInterval(spawnTimer);
  }, [activeColumns, isPaused, levelConfig.decoyChance, levelConfig.spawnIntervalMs, placed, prompt, resultState]);

  useEffect(() => {
    if (resultState !== 'running') return;
    if (queue.length > levelConfig.queueLimit) {
      resolveGameOver('Queue Overflow', 'Too many digits stacked up. Clear placements faster.');
    }
  }, [levelConfig.queueLimit, queue.length, resultState]);

  useEffect(() => {
    if (!feedback) return undefined;
    const timeoutId = window.setTimeout(() => setFeedback(null), 1400);
    return () => window.clearTimeout(timeoutId);
  }, [feedback]);

  const handlePromptClear = (projectedScore: number) => {
    const elapsedSeconds = (Date.now() - promptStartedAtRef.current) / 1000;
    const speedBonus = Math.max(20, Math.round(180 - elapsedSeconds * 18));
    const clearedNext = promptsCleared + 1;
    const nextScore = projectedScore + speedBonus;

    setPromptsCleared(clearedNext);
    setScore(nextScore);
    setFeedbackState('Order Built', `+${speedBonus} speed bonus`, 'success');
    triggerHaptic('success');

    if (clearedNext >= levelConfig.promptsToClear) {
      resolveVictory(nextScore);
      return;
    }

    window.setTimeout(() => {
      resetRound(buildPrompt(levelConfig.activeColumns));
    }, 360);
  };

  const attemptPlacement = (column: PlaceColumn, tokenId: string) => {
    if (resultState !== 'running' || isPaused) return;
    const token = queue.find((item) => item.id === tokenId);
    if (!token) return;

    if (placed[column]) {
      setFeedbackState('Column Locked', 'That column already has a digit. Choose another lane.', 'warning');
      return;
    }

    setAttempts((previous) => previous + 1);
    setQueue((previous) => previous.filter((item) => item.id !== tokenId));
    setSelectedTokenId(null);

    const requiredDigit = prompt.digits[column];
    if (token.digit !== requiredDigit) {
      setScore((previous) => Math.max(0, previous - 30));
      setFeedbackState('Incorrect Placement', 'That digit does not match this column.', 'error');
      triggerHaptic('error');
      return;
    }

    const placementPoints = 110 + levelConfig.difficultyTier * 20;
    const nextPlaced: Partial<Record<PlaceColumn, QueueDigitToken>> = { ...placed, [column]: token };
    const projectedScore = score + placementPoints;

    setPlaced(nextPlaced);
    setCorrectPlacements((previous) => previous + 1);
    setScore(projectedScore);
    setFeedbackState('Correct', `+${placementPoints} points`, 'success');
    triggerHaptic('selection');

    const isPromptComplete = activeColumns.every((activeColumn) => Boolean(nextPlaced[activeColumn]));
    if (isPromptComplete) {
      handlePromptClear(projectedScore);
    }
  };

  const handleColumnTap = (column: PlaceColumn) => {
    if (!selectedTokenId) return;
    attemptPlacement(column, selectedTokenId);
  };

  const accuracy = attempts > 0 ? correctPlacements / attempts : 1;
  const progress = Math.min(
    100,
    Math.max(
      (promptsCleared / levelConfig.promptsToClear) * 100,
      (score / levelConfig.targetScore) * 100,
    ),
  );

  const objectiveArea = (
    <div className="licensed-board-frame structured-playfield-frame flex flex-col gap-2 p-3 md:gap-3 md:p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <div className="text-[10px] font-black uppercase tracking-[0.2em] text-cyan-100/75">Objective</div>
          <div className="text-sm font-black text-white md:text-lg">
            Place digits to build {new Intl.NumberFormat('en-GB').format(prompt.targetValue)}
          </div>
        </div>
        <button
          type="button"
          onClick={() => setIsPaused((previous) => !previous)}
          className="ui-button-primary rounded-lg px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.14em] text-white md:px-4 md:py-2 md:text-xs"
        >
          {isPaused ? 'Resume' : 'Pause'}
        </button>
      </div>
      <div className="flex flex-wrap items-center gap-2 text-[10px] font-black uppercase tracking-[0.12em] md:text-xs">
        <span className="licensed-slice-cyan-pill rounded-full px-2.5 py-1 text-white">
          Level {resolvedMiniGameLevel} / 10
        </span>
        <span className="licensed-slice-cyan-pill rounded-full px-2.5 py-1 text-white">
          Tier {levelConfig.difficultyTier}
        </span>
        <span className="licensed-slice-cyan-pill rounded-full px-2.5 py-1 text-white">
          Prompt {promptsCleared + 1} / {levelConfig.promptsToClear}
        </span>
        <span className="licensed-slice-cyan-pill rounded-full px-2.5 py-1 text-white">
          Accuracy {Math.round(accuracy * 100)}%
        </span>
      </div>
    </div>
  );

  const playFieldArea = (
    <div className="relative flex h-full w-full flex-col gap-3 p-3 md:gap-4 md:p-4">
      <div className="grid grid-cols-2 gap-2 md:grid-cols-4 md:gap-3">
        {COLUMN_ORDER.filter((column) => activeColumns.includes(column)).map((column) => {
          const placedToken = placed[column];

          return (
            <button
              key={column}
              type="button"
              onClick={() => handleColumnTap(column)}
              disabled={resultState !== 'running' || isPaused}
              className={`relative flex h-28 flex-col items-center justify-center overflow-hidden rounded-[1rem] border text-center shadow-[0_12px_24px_rgba(2,6,23,0.34)] transition md:h-36 md:rounded-[1.2rem] ${
                placedToken
                  ? 'border-emerald-200/55 bg-emerald-500/25'
                  : selectedTokenId
                    ? 'border-cyan-200/60 bg-cyan-500/20'
                    : 'border-white/16 bg-slate-900/55'
              }`}
            >
              <div className="text-[10px] font-black uppercase tracking-[0.18em] text-white/75 md:text-xs">
                {COLUMN_LABELS[column]}
              </div>
              <div className="text-[10px] font-bold uppercase tracking-[0.14em] text-white/45 md:text-xs">
                {COLUMN_VALUES[column]}
              </div>
              <div className="mt-1 text-4xl font-black text-white md:text-5xl">
                {placedToken ? placedToken.digit : '?'}
              </div>
            </button>
          );
        })}
      </div>

      <div className="licensed-board-frame structured-playfield-frame relative flex min-h-0 flex-1 flex-col gap-2 overflow-hidden p-3 md:gap-3 md:p-4">
        <div className="flex items-center justify-between">
          <div className="text-[10px] font-black uppercase tracking-[0.18em] text-cyan-100/75 md:text-xs">
            Digit Queue
          </div>
          <div className={`text-[10px] font-black uppercase tracking-[0.14em] md:text-xs ${
            queue.length >= levelConfig.queueLimit ? 'text-rose-200' : 'text-white/75'
          }`}>
            {queue.length} / {levelConfig.queueLimit}
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto pr-1">
          <div className="grid grid-cols-5 gap-2 md:grid-cols-8">
            <AnimatePresence mode="popLayout">
              {queue.map((token) => {
                const isSelected = selectedTokenId === token.id;
                return (
                  <motion.button
                    key={token.id}
                    layout
                    type="button"
                    disabled={resultState !== 'running' || isPaused}
                    onClick={() => setSelectedTokenId((previous) => previous === token.id ? null : token.id)}
                    aria-pressed={isSelected}
                    className={`flex h-14 min-h-[56px] items-center justify-center rounded-xl border text-2xl font-black transition touch-manipulation md:h-16 md:text-3xl ${
                      isSelected
                        ? 'border-cyan-200 bg-cyan-500/45 text-white shadow-[0_0_20px_rgba(34,211,238,0.35)]'
                        : 'border-white/20 bg-slate-900/60 text-white/90'
                    }`}
                    initial={{ opacity: 0, y: 8, scale: 0.86 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -10, scale: 0.7 }}
                    transition={{ type: 'spring', stiffness: 210, damping: 20 }}
                  >
                    {token.digit}
                  </motion.button>
                );
              })}
            </AnimatePresence>
          </div>
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
          <div className={`max-w-xl rounded-full border px-4 py-2 text-center shadow-[0_14px_28px_rgba(2,6,23,0.45)] md:px-5 md:py-2.5 ${
            feedback.tone === 'success'
              ? 'border-emerald-200/55 bg-emerald-500/32 text-emerald-50'
              : feedback.tone === 'error'
                ? 'border-rose-200/55 bg-rose-500/30 text-rose-50'
                : 'border-amber-200/55 bg-amber-500/28 text-amber-50'
          }`}>
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
      title="Place Value Panic"
      avatar={avatar}
      score={score}
      targetScore={levelConfig.targetScore}
      timeLeft={timeLeft}
      progress={progress}
      statLabel="Queue"
      statValue={`${queue.length}/${levelConfig.queueLimit}`}
      objectiveArea={objectiveArea}
      playFieldArea={playFieldArea}
      feedbackLayer={feedbackLayer}
      isPaused={isPaused}
      onResume={() => setIsPaused(false)}
      onBack={onBack}
    />
  );
};

export default PlaceValuePanicGame;
