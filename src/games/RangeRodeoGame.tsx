import React, { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import {
  emitMiniGameSessionEvent,
  MiniGameShellContractProps,
} from '../app/gameplaySessionContract';
import PracticeIntroPopup from '../components/game-ui/PracticeIntroPopup';
import { GameQuestionCard } from '../components/game-ui/GameUiKit';
import sceneBackground from '../assets/maps/backgroundsforgames/Place Value Panic.png';
import enemySprite from '../assets/maps/ezgif-261d69e7ae90ee8c.webp';

interface RangeRodeoGameProps {
  levelId: number;
  avatarId: string;
  onVictory: (stars: number, XP: number) => void;
  onGameOver: (XP: number) => void;
  onBack: () => void;
}

type RangeRodeoGameShellProps = RangeRodeoGameProps & MiniGameShellContractProps;

interface RangeQuestion {
  id: string;
  values: number[];
  correct: number;
  options: number[];
}

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

const randomInt = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;

const shuffle = <T,>(items: T[]): T[] => {
  const next = [...items];
  for (let index = next.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [next[index], next[swapIndex]] = [next[swapIndex], next[index]];
  }
  return next;
};

const starsFromAccuracy = (correct: number, attempts: number) => {
  const accuracy = attempts > 0 ? correct / attempts : 0;
  if (accuracy >= 0.86) return 3;
  if (accuracy >= 0.64) return 2;
  return 1;
};

const buildRangeQuestion = (levelId: number, usedSignatures: Set<string>): RangeQuestion => {
  for (let attempt = 0; attempt < 80; attempt += 1) {
    const count = clamp(4 + Math.floor(levelId / 3), 4, 7);
    const minBase = randomInt(6, 48 + (levelId * 3));
    const rangeTarget = randomInt(6, 24 + (levelId * 2));
    const maxBase = minBase + rangeTarget;
    const values = Array.from({ length: count }, () => randomInt(minBase, maxBase));
    values[0] = minBase;
    values[1] = maxBase;

    const minValue = Math.min(...values);
    const maxValue = Math.max(...values);
    const range = maxValue - minValue;
    if (range <= 0) continue;

    const signature = `${values.slice().sort((a, b) => a - b).join(',')}|${range}`;
    if (usedSignatures.has(signature)) continue;

    const offsets = shuffle([-8, -6, -4, -3, -2, 2, 3, 4, 5, 6, 8]);
    const distractors: number[] = [];
    for (const offset of offsets) {
      const candidate = range + offset;
      if (candidate > 0 && candidate !== range && !distractors.includes(candidate)) {
        distractors.push(candidate);
      }
      if (distractors.length >= 3) break;
    }
    while (distractors.length < 3) {
      const fallback = range + (distractors.length + 2);
      if (fallback !== range && !distractors.includes(fallback)) distractors.push(fallback);
    }

    usedSignatures.add(signature);
    return {
      id: `range-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      values: shuffle(values),
      correct: range,
      options: shuffle([range, ...distractors.slice(0, 3)]),
    };
  }

  const fallbackValues = [12, 18, 26, 29, 34];
  const fallbackRange = 22;
  return {
    id: `range-fallback-${Date.now()}`,
    values: fallbackValues,
    correct: fallbackRange,
    options: shuffle([fallbackRange, 18, 24, 28]),
  };
};

const RangeRodeoGame: React.FC<RangeRodeoGameShellProps> = ({
  levelId,
  avatarId: _avatarId,
  onVictory,
  onGameOver: _onGameOver,
  onBack: _onBack,
  sessionState,
  sessionEvents,
  isPractice,
  practiceBriefing,
}) => {
  const [showPracticeIntro, setShowPracticeIntro] = useState(Boolean(isPractice));
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [feedback, setFeedback] = useState<{ tone: 'success' | 'error'; text: string } | null>(null);
  const [correctAnswers, setCorrectAnswers] = useState(0);
  const [attempts, setAttempts] = useState(0);
  const [XP, setXP] = useState(0);
  const [roundIndex, setRoundIndex] = useState(0);
  const [didComplete, setDidComplete] = useState(false);
  const [hasSignalledFailure, setHasSignalledFailure] = useState(false);
  const [inputLocked, setInputLocked] = useState(false);
  const usedSignaturesRef = useRef<Set<string>>(new Set());
  const timeoutRef = useRef<number | null>(null);

  const roundsGoal = useMemo(() => clamp(6 + Math.floor(levelId / 2), 6, 10), [levelId]);
  const question = useMemo(
    () => buildRangeQuestion(Math.max(1, levelId), usedSignaturesRef.current),
    [levelId, roundIndex],
  );

  const lives = sessionState?.lives ?? 3;
  const timeLeft = sessionState?.timeLeft ?? 1;
  const isSessionActive = sessionState ? timeLeft > 0 && lives > 0 : true;

  useEffect(() => () => {
    if (timeoutRef.current) {
      window.clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  useEffect(() => {
    setShowPracticeIntro(Boolean(isPractice));
  }, [isPractice]);

  useEffect(() => {
    if (!sessionState) return;
    if (sessionState.timeLeft !== sessionState.totalTime) return;
    usedSignaturesRef.current.clear();
    setSelectedOption(null);
    setFeedback(null);
    setCorrectAnswers(0);
    setAttempts(0);
    setXP(0);
    setRoundIndex(0);
    setDidComplete(false);
    setHasSignalledFailure(false);
    setInputLocked(false);
  }, [levelId, sessionState, sessionState?.timeLeft, sessionState?.totalTime]);

  useEffect(() => {
    if (!sessionState) return;
    if (didComplete || hasSignalledFailure || isSessionActive) return;

    setHasSignalledFailure(true);
    emitMiniGameSessionEvent(sessionEvents, 'game_failed', {
      score: XP,
      reason: lives <= 0 ? 'lives' : 'time',
      metadata: {
        correctAnswers,
        attempts,
      },
    });
  }, [attempts, correctAnswers, didComplete, hasSignalledFailure, isSessionActive, lives, XP, sessionEvents, sessionState]);

  const moveToNextQuestion = () => {
    setRoundIndex((current) => current + 1);
    setSelectedOption(null);
    setFeedback(null);
    setInputLocked(false);
  };

  const completeGame = (finalXP: number, totalCorrect: number, totalAttempts: number) => {
    if (didComplete) return;
    setDidComplete(true);
    const stars = starsFromAccuracy(totalCorrect, totalAttempts);
    emitMiniGameSessionEvent(sessionEvents, 'game_complete', {
      score: finalXP,
      stars,
      metadata: {
        correctAnswers: totalCorrect,
        attempts: totalAttempts,
      },
    });
    onVictory(stars, finalXP);
  };

  const handleOptionTap = (option: number) => {
    if (inputLocked || didComplete || !isSessionActive) return;

    const isCorrect = option === question.correct;
    const nextAttempts = attempts + 1;
    const nextCorrect = correctAnswers + (isCorrect ? 1 : 0);
    const nextXP = XP + (isCorrect ? 120 : 20);

    setInputLocked(true);
    setSelectedOption(option);
    setAttempts(nextAttempts);
    setCorrectAnswers(nextCorrect);
    setXP(nextXP);

    emitMiniGameSessionEvent(sessionEvents, isCorrect ? 'correct_answer' : 'incorrect_answer', {
      score: nextXP,
      metadata: {
        selected: option,
        correct: question.correct,
        numbers: question.values,
      },
    });

    setFeedback(
      isCorrect
        ? { tone: 'success', text: 'Correct. Range = highest number - lowest number.' }
        : { tone: 'error', text: `Not quite. The range is ${question.correct}.` },
    );

    timeoutRef.current = window.setTimeout(() => {
      timeoutRef.current = null;
      if (isCorrect && roundIndex + 1 >= roundsGoal) {
        completeGame(nextXP, nextCorrect, nextAttempts);
        return;
      }
      moveToNextQuestion();
    }, isCorrect ? 720 : 820);
  };

  return (
    <div className="relative h-full w-full overflow-hidden bg-[#050914] text-white">
      <AnimatePresence>
        {showPracticeIntro ? (
          <PracticeIntroPopup
            title="Range Rodeo"
            body="The Monster Minds scrambled the score cards.\nFind the range of each number set.\nRemember: range = largest - smallest."
            briefing={practiceBriefing}
            onAction={() => setShowPracticeIntro(false)}
          />
        ) : null}
      </AnimatePresence>

      <div className="game-background absolute inset-0">
        <img src={sceneBackground} alt="" className="h-full w-full object-cover" />
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(2,6,23,0.18)_0%,rgba(2,6,23,0.34)_100%)]" />
      </div>

      <div className="relative z-[1] flex h-full min-h-0 flex-col px-3 pb-2 pt-2 sm:px-4">
        <GameQuestionCard className="shrink-0">
          <div className="space-y-1 text-center">
            <div className="text-[clamp(14px,2.4vh,20px)] font-black">
              Find the range of these numbers.
            </div>
            <div className="text-[clamp(11px,1.9vh,14px)] font-semibold text-cyan-100/90">
              Range = highest value - lowest value
            </div>
          </div>
        </GameQuestionCard>

        <div className="relative mt-2 flex min-h-0 flex-1 flex-col justify-between">
          <div className="mx-auto flex w-full max-w-[520px] shrink-0 flex-wrap items-center justify-center gap-2 rounded-[1rem] border border-white/25 bg-slate-900/55 px-3 py-3 shadow-[0_14px_28px_rgba(2,6,23,0.34)]">
            {question.values.map((value, index) => (
              <div
                key={`${question.id}-${index}-${value}`}
                className="min-w-[60px] rounded-[0.72rem] border border-cyan-100/28 bg-white/12 px-3 py-2 text-center text-[clamp(18px,3.2vh,30px)] font-black text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.18)]"
              >
                {value}
              </div>
            ))}
          </div>

          <div className="pointer-events-none relative mx-auto mt-3 flex h-[30%] min-h-[120px] w-full max-w-[520px] items-end justify-center">
            <img
              src={enemySprite}
              alt=""
              className="max-h-full w-auto object-contain drop-shadow-[0_14px_18px_rgba(2,6,23,0.55)]"
              draggable={false}
            />
          </div>

          <div className="mx-auto mb-1 mt-2 grid w-full max-w-[520px] grid-cols-2 gap-2">
            {question.options.map((option) => {
              const isSelected = selectedOption === option;
              const isCorrectSelection = isSelected && feedback?.tone === 'success';
              const buttonClass = isCorrectSelection
                ? 'ui-button-success'
                : isSelected
                  ? 'ui-button-primary'
                  : 'ui-button-secondary';

              return (
                <motion.button
                  key={`${question.id}-option-${option}`}
                  type="button"
                  whileTap={{ scale: 0.97 }}
                  onClick={() => handleOptionTap(option)}
                  disabled={inputLocked || didComplete || !isSessionActive}
                  className={`min-h-[3.1rem] rounded-[0.95rem] px-2 py-2 text-[clamp(15px,2.5vh,22px)] font-black ${buttonClass} disabled:opacity-55`}
                >
                  {option}
                </motion.button>
              );
            })}
          </div>
        </div>

        <div className="shrink-0 pb-1 text-center">
          <p className={`text-[clamp(11px,1.9vh,14px)] font-black ${feedback?.tone === 'success' ? 'text-emerald-200' : feedback?.tone === 'error' ? 'text-rose-200' : 'text-cyan-100/85'}`}>
            {feedback?.text || `Question ${Math.min(roundIndex + 1, roundsGoal)} of ${roundsGoal}`}
          </p>
        </div>
      </div>
    </div>
  );
};

export default RangeRodeoGame;
