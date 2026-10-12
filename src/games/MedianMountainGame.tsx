import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertCircle,
  ArrowUpDown,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  RotateCcw,
  Trophy,
} from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import {
  emitMiniGameSessionEvent,
  MiniGameShellContractProps,
} from '../app/gameplaySessionContract';
import { GAME_HUD_RESTART_EVENT } from '../gameHudEvents';
import { GameQuestionCard } from '../components/game-ui/GameUiKit';

interface NumberItem {
  id: number;
  value: number;
}

interface LevelData {
  numbers: NumberItem[];
  median: number;
  isEven: boolean;
  middleIndices: number[];
}

interface MedianMountainGameProps {
  levelId: number;
  avatarId: string;
  useSharedTopHud?: boolean;
  onVictory: (stars: number, XP: number) => void;
  onGameOver: (XP: number) => void;
  onBack: () => void;
}

type MedianMountainGameShellProps = MedianMountainGameProps & MiniGameShellContractProps;

const MAX_LEVEL = 10;
const FEEDBACK_HIDE_MS = 1500;

const scoreToStars = (XP: number) => {
  if (XP >= 3500) return 3;
  if (XP >= 2500) return 2;
  return 1;
};

const formatMedian = (value: number) => (Number.isInteger(value) ? `${value}` : value.toFixed(1));

const MedianMountainGame: React.FC<MedianMountainGameShellProps> = ({
  levelId,
  avatarId: _avatarId,
  useSharedTopHud = false,
  onVictory,
  onGameOver,
  onBack,
  sessionState,
  sessionEvents,
}) => {
  const difficulty = Math.max(1, Math.min(5, levelId));
  const [gameState, setGameState] = useState<'playing' | 'success' | 'complete'>('playing');
  const [XP, setScore] = useState(0);
  const [level, setLevel] = useState(1);
  const [currentLevelData, setCurrentLevelData] = useState<LevelData | null>(null);
  const [userAnswer, setUserAnswer] = useState<number | null>(null);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [isSorted, setIsSorted] = useState(false);
  const [didFail, setDidFail] = useState(false);
  const feedbackTimeoutRef = useRef<number | null>(null);

  const timeLeft = sessionState?.timeLeft ?? 1;
  const lives = sessionState?.lives ?? 3;
  const isSessionActive = sessionState ? timeLeft > 0 && lives > 0 : true;

  const clearFeedbackTimeout = () => {
    if (feedbackTimeoutRef.current !== null) {
      window.clearTimeout(feedbackTimeoutRef.current);
      feedbackTimeoutRef.current = null;
    }
  };

  useEffect(() => () => clearFeedbackTimeout(), []);

  const generateLevel = useCallback((_roundNumber: number) => {
    const count = [0, 3, 5, 7, 4, 6][difficulty];
    const maxValue = [0, 10, 20, 35, 50, 80][difficulty];

    const rawNumbers: number[] = [];
    for (let i = 0; i < count; i += 1) {
      rawNumbers.push(Math.floor(Math.random() * maxValue) + 1);
    }

    const sorted = [...rawNumbers].sort((a, b) => a - b);
    const isEven = count % 2 === 0;

    let medianValue: number;
    let middleIndices: number[];
    if (isEven) {
      const mid1 = count / 2 - 1;
      const mid2 = count / 2;
      medianValue = (sorted[mid1] + sorted[mid2]) / 2;
      middleIndices = [mid1, mid2];
    } else {
      const mid = Math.floor(count / 2);
      medianValue = sorted[mid];
      middleIndices = [mid];
    }

    const numbers: NumberItem[] = rawNumbers.map((value, index) => ({ id: index, value }));

    setCurrentLevelData({
      numbers,
      median: medianValue,
      isEven,
      middleIndices,
    });
    setUserAnswer(null);
    setFeedback(null);
    setIsSorted(false);
  }, [difficulty]);

  useEffect(() => {
    generateLevel(1);
  }, [generateLevel]);

  useEffect(() => {
    if (!sessionState || didFail || !currentLevelData) return;
    if (isSessionActive) return;

    setDidFail(true);
    emitMiniGameSessionEvent(sessionEvents, 'game_failed', {
      score: XP,
      reason: lives <= 0 ? 'lives' : 'time',
    });
    onGameOver(XP);
  }, [
    currentLevelData,
    didFail,
    isSessionActive,
    lives,
    onGameOver,
    XP,
    sessionEvents,
    sessionState,
  ]);

  const startGame = () => {
    clearFeedbackTimeout();
    setScore(0);
    setLevel(1);
    setGameState('playing');
    setDidFail(false);
    generateLevel(1);
  };

  const toggleSort = () => {
    if (!currentLevelData || gameState !== 'playing') return;
    setIsSorted((value) => !value);
  };

  const queueFeedbackHide = () => {
    clearFeedbackTimeout();
    feedbackTimeoutRef.current = window.setTimeout(() => {
      setFeedback(null);
      feedbackTimeoutRef.current = null;
    }, FEEDBACK_HIDE_MS);
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!currentLevelData || gameState !== 'playing' || !isSessionActive) return;

    if (userAnswer === null) return;

    const isCorrect = Math.abs(userAnswer - currentLevelData.median) < 0.001;

    if (isCorrect) {
      const gained = 200 + (level * 40);
      const nextScore = XP + gained;
      setScore(nextScore);
      setFeedback({ type: 'success', message: 'Correct median found.' });
      setGameState('success');

      emitMiniGameSessionEvent(sessionEvents, 'correct_answer', {
        score: XP,
        metadata: {
          scoreDelta: gained,
          scoreAfter: nextScore,
          answer: userAnswer,
        },
      });
      emitMiniGameSessionEvent(sessionEvents, 'puzzle_complete', {
        score: nextScore,
        metadata: {
          median: currentLevelData.median,
          level,
        },
      });
      return;
    }

    setFeedback({ type: 'error', message: 'Not the median yet. Re-check the middle values.' });
    emitMiniGameSessionEvent(sessionEvents, 'incorrect_answer', {
      score: XP,
      metadata: {
        submitted: userAnswer,
        median: currentLevelData.median,
        level,
      },
    });
    queueFeedbackHide();
  };

  const finishGame = (finalScore: number) => {
    const stars = scoreToStars(finalScore);
    emitMiniGameSessionEvent(sessionEvents, 'game_complete', {
      score: finalScore,
      stars,
      metadata: { levelReached: MAX_LEVEL },
    });
    onVictory(stars, finalScore);
  };

  const nextLevel = () => {
    clearFeedbackTimeout();
    if (level >= MAX_LEVEL) {
      setGameState('complete');
      finishGame(XP);
      return;
    }

    const next = level + 1;
    setLevel(next);
    setGameState('playing');
    generateLevel(next);
  };

  const displayNumbers = useMemo(() => {
    if (!currentLevelData) return [] as NumberItem[];
    if (!isSorted) return currentLevelData.numbers;
    return [...currentLevelData.numbers].sort((a, b) => a.value - b.value);
  }, [currentLevelData, isSorted]);

  const medianChoices = useMemo(() => {
    if (!currentLevelData) return [];
    const sorted = currentLevelData.numbers.map(item => item.value).sort((a, b) => a - b);
    const target = currentLevelData.median;
    const middle = Math.floor(sorted.length / 2);
    const step = Number.isInteger(target) ? 1 : 0.5;
    const candidates = [target, sorted[middle - 1], sorted[middle], sorted[0], sorted[sorted.length - 1], target - step, target + step, target - step * 2, target + step * 2];
    const choices = [...new Set(candidates.filter(value => value > 0))].slice(0, 4);
    for (let n = 3; choices.length < 4; n += 1) choices.push(target + step * n);
    const offset = currentLevelData.numbers.reduce((sum, item) => sum + item.value, 0) % choices.length;
    return [...choices.slice(offset), ...choices.slice(0, offset)];
  }, [currentLevelData]);

  return (
    <div className="relative h-full w-full overflow-hidden text-white">
      <div
        className={`relative z-10 flex h-full min-h-0 flex-col px-3 pb-[calc(env(safe-area-inset-bottom)+4.9rem)] ${
          useSharedTopHud
            ? 'pt-[calc(env(safe-area-inset-top)+4.15rem)]'
            : 'pt-[max(0.75rem,env(safe-area-inset-top))]'
        } sm:px-4 md:px-5`}
      >
        {!useSharedTopHud && (
          <div className="mb-2 flex items-center justify-between">
            <button
              type="button"
              onClick={onBack}
              className="ui-icon-button inline-flex h-9 w-9 items-center justify-center text-cyan-100"
              aria-label="Back to levels"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <div className="rounded-full border border-amber-200/55 bg-[#123062]/75 px-3 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-amber-100">
              Median Master
            </div>
          </div>
        )}

        <GameQuestionCard title="Median Mountain" style={{ position: 'relative', top: 0, transform: 'none', width: '100%' }}
          subtitle={currentLevelData?.isEven ? 'With two middle values, add them and divide by 2.' : 'The middle value in an ordered list is the median.'}>
          Sort the stones, then choose the median.
        </GameQuestionCard>
        <main className="relative flex min-h-0 flex-1 items-center justify-center">
          <AnimatePresence mode="wait">
            {(gameState === 'playing' || gameState === 'success') && currentLevelData && (
              <motion.div
                key={level}
                initial={{ opacity: 0, y: 10, scale: 0.985 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -8, scale: 0.99 }}
                className="mx-auto flex w-full max-w-[840px] min-h-0 flex-col gap-3"
              >

                <div className="relative overflow-hidden rounded-[2rem] border border-cyan-100/35 bg-[#0f2e61]/70 px-3 py-4 shadow-[0_14px_30px_rgba(2,6,23,0.45)] sm:px-4">
                  <div className="pointer-events-none absolute inset-x-8 top-0 h-14 bg-[radial-gradient(circle_at_50%_0%,rgba(56,189,248,0.24),transparent_72%)]" />

                  <div className="mb-3 flex items-center justify-between gap-3">
                    <p className="text-[10px] font-black uppercase tracking-[0.16em] text-cyan-100/90">
                      {currentLevelData.isEven ? 'Even set: average the middle two' : 'Odd set: choose the middle value'}
                    </p>
                    <button
                      type="button"
                      onClick={toggleSort}
                      className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.12em] ${
                        isSorted
                          ? 'ui-button-primary'
                          : 'ui-button-secondary'
                      }`}
                    >
                      <ArrowUpDown className="h-3.5 w-3.5" />
                      {isSorted ? 'Sorted' : 'Sort'}
                    </button>
                  </div>

                  <div className="flex flex-wrap justify-center gap-2.5 sm:gap-3">
                    {displayNumbers.map((item, index) => {
                      const isMiddle = isSorted && gameState === 'success' && currentLevelData.middleIndices.includes(index);
                      return (
                        <motion.div
                          layout
                          key={item.id}
                          initial={{ opacity: 0, y: 12 }}
                          animate={{
                            opacity: 1,
                            y: 0,
                            scale: isMiddle && gameState === 'success' ? 1.12 : 1,
                          }}
                          className={`flex h-14 w-14 items-center justify-center rounded-2xl border-2 text-xl font-black transition-all sm:h-16 sm:w-16 sm:text-2xl ${
                            isMiddle
                              ? gameState === 'success'
                                ? 'border-amber-100 bg-[linear-gradient(180deg,#f7d47c_0%,#f5b72e_100%)] text-slate-900 shadow-[0_10px_20px_rgba(251,191,36,0.35)]'
                                : 'border-cyan-100 bg-[linear-gradient(180deg,#39c4f4_0%,#1278bb_100%)] text-white shadow-[0_10px_20px_rgba(14,116,144,0.35)]'
                              : 'border-cyan-100/45 bg-[#0d2a5a]/88 text-cyan-50 shadow-[0_10px_20px_rgba(2,6,23,0.3)]'
                          }`}
                        >
                          {item.value}
                        </motion.div>
                      );
                    })}
                  </div>
                </div>

                <form
                  onSubmit={handleSubmit}
                  className="mx-auto flex w-full max-w-[700px] flex-col gap-2.5 rounded-2xl border border-cyan-100/30 bg-[#123062]/70 p-3 shadow-[0_12px_24px_rgba(2,6,23,0.4)]"
                >
                  <fieldset disabled={gameState === 'success' || !isSessionActive} className="min-w-0 border-0 p-0">
                    <legend className="mb-2 text-sm font-bold text-cyan-50">Choose the middle value</legend>
                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                      {medianChoices.map(choice => <button
                        key={choice}
                        type="button"
                        aria-pressed={userAnswer === choice}
                        onClick={() => setUserAnswer(choice)}
                        className={`min-h-12 rounded-xl border-2 px-2 py-2 text-lg font-black focus-visible:outline focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-amber-200 ${userAnswer === choice ? 'border-amber-200 bg-amber-300 text-slate-950' : 'border-cyan-100/50 bg-[#0d2a5a]/88 text-cyan-50 hover:border-cyan-100'}`}
                      >{formatMedian(choice)}</button>)}
                    </div>
                  </fieldset>

                  {gameState === 'success' ? (
                    <button
                      type="button"
                      onClick={nextLevel}
                      className="ui-button-primary inline-flex h-12 min-w-[148px] items-center justify-center gap-2 rounded-2xl px-5 text-sm font-black uppercase tracking-[0.12em]"
                    >
                      Next
                      <ChevronRight className="h-4 w-4" />
                    </button>
                  ) : (
                    <button
                      type="submit"
                      disabled={userAnswer === null || !isSessionActive}
                      className="ui-button-primary inline-flex h-12 min-w-[148px] items-center justify-center rounded-2xl px-5 text-sm font-black uppercase tracking-[0.12em] disabled:opacity-55"
                    >
                      Verify Median
                    </button>
                  )}
                </form>

                {isSorted && (
                  <p className="text-center text-[11px] font-bold uppercase tracking-[0.08em] text-cyan-100/90">
                    {currentLevelData.isEven ? 'Read inward from both ends. Add the two middle stones and halve.' : 'Read inward from both ends to find the middle stone.'}
                  </p>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </main>
      </div>

      <AnimatePresence>
        {gameState === 'complete' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="absolute inset-0 z-40 flex items-center justify-center bg-[#061635]/80 p-6 text-center backdrop-blur-[3px]"
          >
            <div className="w-full max-w-md rounded-3xl border border-cyan-100/45 bg-[#123062]/92 p-6 shadow-[0_20px_44px_rgba(2,6,23,0.5)]">
              <div className="mx-auto mb-4 inline-flex h-20 w-20 items-center justify-center rounded-full border border-amber-100/80 bg-[linear-gradient(180deg,#f7d47c_0%,#f5b72e_100%)] text-slate-900">
                <Trophy className="h-10 w-10" />
              </div>
              <h2 className="text-3xl font-black uppercase tracking-tight text-amber-100">Challenge Complete</h2>
              <p className="mt-2 text-sm font-semibold text-cyan-100/85">You mastered the median route.</p>
              <div className="mt-4 rounded-2xl border border-cyan-100/35 bg-[#0d2a5a]/82 p-4">
                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-cyan-100/75">Final XP</p>
                <p className="mt-1 text-4xl font-black text-amber-100">{XP}</p>
              </div>
              <button
                type="button"
                onClick={() => {
                  window.dispatchEvent(new Event(GAME_HUD_RESTART_EVENT));
                  startGame();
                }}
                className="ui-button-primary mt-5 inline-flex items-center gap-2 rounded-2xl px-6 py-3 text-sm font-black uppercase tracking-[0.12em]"
              >
                <RotateCcw className="h-4 w-4" />
                Replay
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {feedback && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className={`absolute bottom-[calc(env(safe-area-inset-bottom)+5.4rem)] left-1/2 z-30 flex -translate-x-1/2 items-center gap-2 rounded-2xl border px-5 py-2.5 text-xs font-black uppercase tracking-[0.12em] shadow-[0_14px_28px_rgba(2,6,23,0.45)] ${
              feedback.type === 'success'
                ? 'border-emerald-200/70 bg-emerald-500/30 text-emerald-50'
                : 'border-rose-200/70 bg-rose-500/28 text-amber-50'
            }`}
          >
            {feedback.type === 'success' ? <CheckCircle2 className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
            <span>{feedback.message}</span>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="pointer-events-none absolute inset-x-0 bottom-[max(0.35rem,env(safe-area-inset-bottom))] z-50 flex justify-center px-3">
        <div className="pointer-events-auto">
        </div>
      </div>
    </div>
  );
};

export default MedianMountainGame;

