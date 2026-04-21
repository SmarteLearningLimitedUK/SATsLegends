import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import confetti from 'canvas-confetti';
import { ChevronLeft, CircleDollarSign, Zap } from 'lucide-react';
import GameplaySceneBackdrop from '../components/GameplaySceneBackdrop';
import percentPowerBackground from '../assets/maps/backgroundsforgames/percent power.jpg';
import { triggerHaptic } from '../haptics';
import { GameQuestionCard } from '../components/game-ui/GameUiKit';
import PracticeIntroPopup from '../components/game-ui/PracticeIntroPopup';
import {
  emitMiniGameSessionEvent,
  MiniGameShellContractProps,
} from '../app/gameplaySessionContract';

interface PercentPowerGameProps extends MiniGameShellContractProps {
  levelId: number;
  miniGameLevel?: number;
  avatarId: string;
  useSharedTopHud?: boolean;
  onVictory: (stars: number, XP: number) => void;
  onGameOver: (XP: number) => void;
  onBack: () => void;
}

interface PercentPowerQuestion {
  id: string;
  kind: 'fluency' | 'reasoning';
  prompt: string;
  helper: string;
  options: string[];
  answerIndex: number;
  coreLabel: string;
  sideLabel: string;
}

const FALLBACK_LIVES = 3;
const FALLBACK_TIMER = 80;

const randomInt = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;

const shuffle = <T,>(items: T[]): T[] => {
  const clone = [...items];
  for (let index = clone.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [clone[index], clone[swapIndex]] = [clone[swapIndex], clone[index]];
  }
  return clone;
};

const makeOptions = (correct: string, wrongValues: string[]) => {
  const unique = Array.from(new Set([correct, ...wrongValues]));
  const filtered = unique.filter((value) => value !== correct);
  const options = [correct, ...filtered.slice(0, 3)];

  let pad = 1;
  while (options.length < 4) {
    const candidate = `${Number(correct) + pad}`;
    if (!options.includes(candidate)) {
      options.push(candidate);
    }
    pad += 1;
  }

  const shuffled = shuffle(options);
  return {
    options: shuffled,
    answerIndex: shuffled.indexOf(correct),
  };
};

const scoreToStars = (accuracy: number, remainingLives: number) => {
  if (accuracy >= 0.9 && remainingLives >= 2) return 3;
  if (accuracy >= 0.7 && remainingLives >= 1) return 2;
  return 1;
};

const buildDirectQuestion = (): PercentPowerQuestion => {
  const percent = [10, 20, 25, 40, 50, 75][randomInt(0, 5)];
  const amount = [40, 60, 80, 100, 120, 160, 200][randomInt(0, 6)];
  const answer = (amount * percent) / 100;
  const { options, answerIndex } = makeOptions(
    `${answer}`,
    [`${answer + amount / 10}`, `${Math.max(1, answer - amount / 20)}`, `${amount - answer}`],
  );

  return {
    id: `direct-${percent}-${amount}-${Math.random().toString(36).slice(2, 7)}`,
    kind: 'fluency',
    prompt: `What is ${percent}% of ${amount}?`,
    helper: 'Use 10%, 25%, 50% or known fraction facts to build the answer.',
    options,
    answerIndex,
    coreLabel: `${percent}%`,
    sideLabel: `Whole ${amount}`,
  };
};

const buildReverseQuestion = (): PercentPowerQuestion => {
  const percent = [10, 20, 25, 40, 50][randomInt(0, 4)];
  const whole = [80, 120, 160, 200, 240, 320][randomInt(0, 5)];
  const part = (whole * percent) / 100;
  const { options, answerIndex } = makeOptions(
    `${whole}`,
    [`${whole + 40}`, `${Math.max(10, whole - 40)}`, `${whole + 20}`],
  );

  return {
    id: `reverse-${percent}-${whole}-${Math.random().toString(36).slice(2, 7)}`,
    kind: 'fluency',
    prompt: `${percent}% of a number is ${part}. What is the whole number?`,
    helper: 'Find 1% or 10%, then scale up to the full amount.',
    options,
    answerIndex,
    coreLabel: `${part}`,
    sideLabel: `${percent}% chunk`,
  };
};

const buildIncreaseQuestion = (): PercentPowerQuestion => {
  const base = [40, 60, 80, 120, 160][randomInt(0, 4)];
  const percent = [10, 20, 25, 50][randomInt(0, 3)];
  const answer = base + ((base * percent) / 100);
  const { options, answerIndex } = makeOptions(
    `${answer}`,
    [`${base - ((base * percent) / 100)}`, `${base + percent}`, `${base + ((base * 10) / 100)}`],
  );

  return {
    id: `increase-${base}-${percent}-${Math.random().toString(36).slice(2, 7)}`,
    kind: 'fluency',
    prompt: `A power crystal has ${base} units. It gains ${percent}%. What is the new total?`,
    helper: 'Work out the percentage gain first, then add it to the original amount.',
    options,
    answerIndex,
    coreLabel: `+${percent}%`,
    sideLabel: `Start ${base}`,
  };
};

const buildQuestion = (level: number, round: number): PercentPowerQuestion => {
  if (level <= 2) {
    return buildDirectQuestion();
  }
  if (level <= 4) {
    return round % 2 === 0 ? buildReverseQuestion() : buildDirectQuestion();
  }
  return [buildDirectQuestion, buildReverseQuestion, buildIncreaseQuestion][round % 3]();
};

const PercentPowerGame: React.FC<PercentPowerGameProps> = ({
  levelId,
  miniGameLevel,
  useSharedTopHud = false,
  onVictory,
  onGameOver,
  onBack,
  sessionState,
  sessionEvents,
  isPractice,
  practiceBriefing,
  gameTitle,
}) => {
  const resolvedLevel = useMemo(() => Math.max(1, Math.min(10, miniGameLevel || levelId || 1)), [levelId, miniGameLevel]);
  const totalRounds = useMemo(() => Math.min(10, 5 + Math.floor(resolvedLevel / 2)), [resolvedLevel]);
  const [roundNumber, setRoundNumber] = useState(1);
  const [question, setQuestion] = useState<PercentPowerQuestion>(() => buildQuestion(resolvedLevel, 1));
  const [XP, setScore] = useState(0);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [feedback, setFeedback] = useState<'correct' | 'incorrect' | null>(null);
  const [statusText, setStatusText] = useState('');
  const [attempts, setAttempts] = useState(0);
  const [correctAnswers, setCorrectAnswers] = useState(0);
  const [localLives, setLocalLives] = useState(FALLBACK_LIVES);
  const [localTimer, setLocalTimer] = useState(FALLBACK_TIMER);
  const [isLocked, setLocked] = useState(false);
  const [showPracticeIntro, setShowPracticeIntro] = useState(Boolean(isPractice));
  const scoreRef = useRef(0);
  const didEndRef = useRef(false);

  const lives = sessionState?.lives ?? localLives;
  const timeLeft = sessionState?.timeLeft ?? localTimer;
  const totalTime = sessionState?.totalTime ?? FALLBACK_TIMER;

  useEffect(() => {
    scoreRef.current = XP;
  }, [XP]);

  useEffect(() => {
    didEndRef.current = false;
    scoreRef.current = 0;
    setRoundNumber(1);
    setQuestion(buildQuestion(resolvedLevel, 1));
    setScore(0);
    setSelectedIndex(null);
    setFeedback(null);
    setStatusText('');
    setAttempts(0);
    setCorrectAnswers(0);
    setLocalLives(FALLBACK_LIVES);
    setLocalTimer(FALLBACK_TIMER);
    setLocked(false);
  }, [resolvedLevel]);

  useEffect(() => {
    setShowPracticeIntro(Boolean(isPractice));
  }, [isPractice]);

  useEffect(() => {
    if (sessionState || didEndRef.current) return undefined;
    const timerId = window.setInterval(() => {
      setLocalTimer((previous) => {
        if (previous <= 1) {
          window.clearInterval(timerId);
          return 0;
        }
        return previous - 1;
      });
    }, 1000);
    return () => window.clearInterval(timerId);
  }, [sessionState]);

  useEffect(() => {
    if (didEndRef.current) return;
    if (timeLeft > 0 && lives > 0) return;
    didEndRef.current = true;
    emitMiniGameSessionEvent(sessionEvents, 'game_failed', {
      score: scoreRef.current,
      reason: timeLeft <= 0 ? 'time' : 'lives',
    });
    onGameOver(scoreRef.current);
  }, [lives, onGameOver, sessionEvents, timeLeft]);

  const finishVictory = useCallback((finalScore: number, finalAttempts: number, finalCorrect: number, remainingLives: number) => {
    if (didEndRef.current) return;
    didEndRef.current = true;
    const accuracy = finalAttempts > 0 ? finalCorrect / finalAttempts : 1;
    const stars = scoreToStars(accuracy, remainingLives);
    emitMiniGameSessionEvent(sessionEvents, 'game_complete', {
      score: finalScore,
      stars,
      metadata: { accuracy },
    });
    confetti({
      particleCount: 90,
      spread: 54,
      origin: { y: 0.62 },
      colors: ['#67e8f9', '#fef08a', '#ffffff'],
    });
    window.setTimeout(() => onVictory(stars, finalScore), 320);
  }, [onVictory, sessionEvents]);

  const advanceQuestion = useCallback((nextRound: number) => {
    const nextQuestion = buildQuestion(resolvedLevel, nextRound);
    setRoundNumber(nextRound);
    setQuestion(nextQuestion);
    setSelectedIndex(null);
    setFeedback(null);
    setLocked(false);
  }, [resolvedLevel]);

  const handleAnswer = (index: number) => {
    if (isLocked || didEndRef.current) return;
    setLocked(true);
    setSelectedIndex(index);

    const isCorrect = index === question.answerIndex;
    const nextAttempts = attempts + 1;
    setAttempts(nextAttempts);

    if (isCorrect) {
      const award = 110 + (resolvedLevel * 14) + Math.max(0, Math.floor(timeLeft * 0.35));
      const nextScore = XP + award;
      const nextCorrect = correctAnswers + 1;
      setFeedback('correct');
      setScore(nextScore);
      setCorrectAnswers(nextCorrect);
      setStatusText(`Correct. +${award} power added.`);
      triggerHaptic('success');
      emitMiniGameSessionEvent(sessionEvents, 'correct_answer', {
        score: nextScore,
        metadata: { round: roundNumber, questionId: question.id },
      });
      emitMiniGameSessionEvent(sessionEvents, 'puzzle_complete', {
        score: nextScore,
        metadata: { round: roundNumber, totalRounds },
      });

      if (roundNumber >= totalRounds) {
        finishVictory(nextScore, nextAttempts, nextCorrect, lives);
        return;
      }

      window.setTimeout(() => {
        advanceQuestion(roundNumber + 1);
      }, 540);
      return;
    }

    setFeedback('incorrect');
    setStatusText('Not this one. Recheck the percentage clue.');
    triggerHaptic('warning');
    emitMiniGameSessionEvent(sessionEvents, 'incorrect_answer', {
      score: XP,
      metadata: { round: roundNumber, questionId: question.id, selectedIndex: index },
    });

    if (!sessionState) {
      setLocalLives((previous) => Math.max(0, previous - 1));
    }

    if (roundNumber >= totalRounds && !sessionState && lives - 1 <= 0) {
      return;
    }

    window.setTimeout(() => {
      if (didEndRef.current) return;
      advanceQuestion(Math.min(totalRounds, roundNumber + 1));
    }, 620);
  };

  const timerProgress = Math.max(0, Math.min(1, timeLeft / Math.max(1, totalTime)));
  const coreFill = Math.max(0, Math.min(1, correctAnswers / Math.max(1, totalRounds)));

  return (
    <div className="relative h-full w-full overflow-hidden text-white">
      <GameplaySceneBackdrop
        gameType="percent_power"
        backgroundOverride={percentPowerBackground}
        className="opacity-[0.98]"
      />

      <PracticeIntroPopup
        open={showPracticeIntro}
        title={gameTitle || 'Percent Power'}
        body="Those pesky Moster Minds have disabled the power cells. Solve the percentage problem to restore the power"
        briefing={practiceBriefing}
        onAction={() => setShowPracticeIntro(false)}
      />

      {!useSharedTopHud ? (
        <div className="absolute left-0 right-0 top-[calc(env(safe-area-inset-top)+2px)] z-30 flex items-center justify-between px-3">
          <button
            type="button"
            onClick={onBack}
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-cyan-200/45 bg-[#0a1f56]/88 shadow-[0_8px_20px_rgba(0,0,0,0.45)]"
            aria-label="Back"
          >
            <ChevronLeft className="h-5 w-5 text-cyan-100" />
          </button>
          <div className="flex items-center gap-2 rounded-xl border border-cyan-200/45 bg-[#0a1f56]/92 px-3 py-2 shadow-[0_8px_20px_rgba(0,0,0,0.45)]">
            <span className="text-xs font-black tabular-nums text-cyan-50">{timeLeft}s</span>
            <span className="h-4 w-px bg-cyan-100/35" />
            <CircleDollarSign className="h-4 w-4 text-yellow-300" />
            <span className="text-xs font-black tabular-nums text-yellow-100">{XP}</span>
          </div>
        </div>
      ) : null}

      <div
        className={`relative z-20 flex h-full w-full flex-col items-center px-4 pb-[calc(env(safe-area-inset-bottom)+4.4rem)] ${
          useSharedTopHud ? 'pt-[calc(env(safe-area-inset-top)+4.75rem)]' : 'pt-[calc(env(safe-area-inset-top)+3.15rem)]'
        }`}
      >
        <div className="w-full max-w-[44rem] px-1">
          <div className="mt-2">
            <GameQuestionCard title="Percent Power" className="max-w-[44rem] backdrop-blur-sm">
              {question.prompt}
              <span className="block text-xs font-semibold text-cyan-50/80 md:text-sm">{question.helper}</span>
            </GameQuestionCard>
          </div>
        </div>

        <div className="relative mt-2 flex w-full max-w-[44rem] flex-1 min-h-0 flex-col items-center justify-center px-2 py-2">
          <div className="absolute left-1/2 top-[63%] h-[15rem] w-[15rem] -translate-x-1/2 -translate-y-1/2 md:h-[16rem] md:w-[16rem]">
              <motion.div
                className="absolute left-1/2 top-1/2 rounded-full bg-[radial-gradient(circle,rgba(134,239,172,0.96),rgba(34,197,94,0.72)_60%,rgba(16,185,129,0.22)_100%)] shadow-[0_0_20px_rgba(34,197,94,0.55)]"
                animate={{
                  x: '-50%',
                  y: 'calc(-50% + 40px)',
                  width: `${Math.max(30, coreFill * 58)}%`,
                  height: `${Math.max(30, coreFill * 58)}%`,
                  scale: [1, 1.03, 1],
                }}
              transition={{ duration: 0.5, ease: 'easeOut' }}
            />
          </div>

          <AnimatePresence>
            {statusText ? (
              <motion.div
                key={statusText}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                className={`mt-4 rounded-full border px-4 py-2 text-center text-[11px] font-black uppercase tracking-[0.12em] shadow-[0_10px_20px_rgba(2,6,23,0.16)] ${
                  feedback === 'correct'
                    ? 'border-emerald-300/60 bg-emerald-300/18 text-emerald-50'
                    : feedback === 'incorrect'
                      ? 'border-rose-300/60 bg-rose-300/18 text-amber-50'
                      : 'border-cyan-200/26 bg-[#071a38]/72 text-cyan-100/82'
                }`}
              >
                {statusText}
              </motion.div>
            ) : null}
          </AnimatePresence>
        </div>

        <div className="answer-choice-surface mt-4 grid w-full max-w-[44rem] grid-cols-2 gap-3">
          {question.options.map((option, index) => {
            const isSelected = index === selectedIndex;
            const isCorrect = feedback === 'correct' && index === question.answerIndex;
            const isIncorrect = feedback === 'incorrect' && isSelected;

            return (
              <motion.button
                key={`${question.id}-${option}`}
                type="button"
                whileTap={{ scale: 0.985 }}
                onClick={() => handleAnswer(index)}
                disabled={isLocked || didEndRef.current}
                className={`relative min-h-[2.8rem] overflow-hidden rounded-[1rem] px-2.5 py-1.5 text-center ${
                  isCorrect
                    ? 'ui-button-success'
                    : isIncorrect
                      ? 'ui-button-primary'
                      : isSelected
                        ? 'ui-button-primary'
                        : 'ui-button-secondary'
                }`}
              >
                <div className="absolute inset-x-[8%] top-[12%] h-[30%] rounded-full bg-white/12 blur-md" />
                <div className="relative z-10 flex items-center gap-2">
                  <div className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-[0.65rem] border ${
                    isCorrect || isIncorrect || isSelected
                      ? 'border-black/10 bg-white/36 text-slate-900'
                      : 'border-white/16 bg-white/10 text-white'
                  }`}>
                    <Zap className={`h-3.5 w-3.5 ${index === 0 ? 'rotate-12' : index === 1 ? '-rotate-12' : index === 2 ? 'rotate-6' : '-rotate-6'}`} />
                  </div>
                  <div className="flex-1 text-center text-[0.9rem] font-black leading-none text-white md:text-[1.08rem]">
                    {option}
                  </div>
                </div>
              </motion.button>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default PercentPowerGame;
