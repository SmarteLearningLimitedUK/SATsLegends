import React, { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Sparkles, WandSparkles } from 'lucide-react';
import {
  emitMiniGameSessionEvent,
  MiniGameShellContractProps,
} from '../app/gameplaySessionContract';
import mapBackground from '../assets/maps/inside dojo.jpg';
import panelMain from '../assets/casual_ui/dialogs_panels/panel.png';
import buttonIdle from '../assets/casual_ui/inputs/btn_6a.png';
import buttonSelected from '../assets/casual_ui/inputs/btn_6b.png';
import buttonPrimary from '../assets/casual_ui/inputs/btn_1.png';

interface NumberLineNinjaGameProps {
  levelId: number;
  avatarId: string;
  onVictory: (stars: number, score: number) => void;
  onGameOver: (score: number) => void;
  onBack: () => void;
}

type NumberLineNinjaGameShellProps = NumberLineNinjaGameProps & MiniGameShellContractProps;
type FeedbackState = 'default' | 'selected' | 'correct' | 'incorrect';

interface NumberLineQuestion {
  id: string;
  eyebrow: string;
  prompt: string;
  ticks: readonly string[];
  missingIndex: number;
  options: readonly string[];
  correct: string;
}

const QUESTIONS_PER_ROUND = 5;
const SCORE_PER_CORRECT = 120;

const QUESTION_BANK: readonly NumberLineQuestion[] = [
  {
    id: 'line-0-20',
    eyebrow: 'Missing Number',
    prompt: 'A number line goes from 0 to 20. Which number is missing?',
    ticks: ['0', '5', '?', '15', '20'],
    missingIndex: 2,
    options: ['8', '10', '12', '14'],
    correct: '10',
  },
  {
    id: 'line-0-30',
    eyebrow: 'Missing Number',
    prompt: 'A number line goes from 0 to 30. Which number is missing?',
    ticks: ['0', '10', '?', '30'],
    missingIndex: 2,
    options: ['15', '18', '20', '24'],
    correct: '20',
  },
  {
    id: 'line-step-20',
    eyebrow: 'Step Size',
    prompt: '40, 60, ?, 100 are equally spaced. What is the missing value?',
    ticks: ['40', '60', '?', '100'],
    missingIndex: 2,
    options: ['70', '75', '80', '90'],
    correct: '80',
  },
  {
    id: 'line-negative',
    eyebrow: 'Negative Numbers',
    prompt: 'A number line shows -10, ?, 0, 5. What number is missing?',
    ticks: ['-10', '?', '0', '5'],
    missingIndex: 1,
    options: ['-7', '-6', '-5', '-4'],
    correct: '-5',
  },
  {
    id: 'line-fractions',
    eyebrow: 'Fractions',
    prompt: 'From 0 to 1 in equal quarters: 0, 1/4, 1/2, ?, 1. Fill the gap.',
    ticks: ['0', '1/4', '1/2', '?', '1'],
    missingIndex: 3,
    options: ['2/3', '3/4', '4/5', '5/6'],
    correct: '3/4',
  },
  {
    id: 'line-decimals',
    eyebrow: 'Decimals',
    prompt: 'A decimal number line shows 0.1, 0.2, ?, 0.4. What is missing?',
    ticks: ['0.1', '0.2', '?', '0.4'],
    missingIndex: 2,
    options: ['0.25', '0.3', '0.35', '0.5'],
    correct: '0.3',
  },
  {
    id: 'line-decimal-midpoint',
    eyebrow: 'Midpoint',
    prompt: 'A point is halfway between 0.6 and 1.0. Which value belongs there?',
    ticks: ['0.6', '?', '1.0'],
    missingIndex: 1,
    options: ['0.7', '0.75', '0.8', '0.9'],
    correct: '0.8',
  },
];

const shuffle = <T,>(values: readonly T[]): T[] => {
  const output = [...values];
  for (let index = output.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    const tmp = output[index];
    output[index] = output[swapIndex];
    output[swapIndex] = tmp;
  }
  return output;
};

const buildQuestionRun = () => {
  const shuffled = shuffle(QUESTION_BANK);
  return shuffled.slice(0, Math.min(QUESTIONS_PER_ROUND, shuffled.length));
};

const scoreToStars = (score: number, maxScore: number) => {
  if (maxScore <= 0) return 1;
  const ratio = score / maxScore;
  if (ratio >= 0.92) return 3;
  if (ratio >= 0.7) return 2;
  return 1;
};

interface AssetButtonProps {
  label: string;
  variant: 'idle' | 'selected' | 'correct' | 'incorrect' | 'primary';
  disabled?: boolean;
  onClick?: () => void;
  className?: string;
}

const AssetButton: React.FC<AssetButtonProps> = ({
  label,
  variant,
  disabled = false,
  onClick,
  className = '',
}) => {
  const backgroundImage = variant === 'selected' || variant === 'correct'
    ? buttonSelected
    : variant === 'primary'
      ? buttonPrimary
      : buttonIdle;

  const textClass = variant === 'incorrect'
    ? 'text-rose-100'
    : variant === 'primary'
      ? 'text-amber-900'
      : 'text-white';

  return (
    <motion.button
      type="button"
      onClick={onClick}
      disabled={disabled}
      whileTap={disabled ? undefined : { scale: 0.98 }}
      whileHover={disabled ? undefined : { scale: 1.01 }}
      className={`relative flex h-14 w-full items-center justify-center bg-transparent px-4 text-lg font-black ${textClass} disabled:opacity-60 ${className}`}
      style={{
        backgroundImage: `url(${backgroundImage})`,
        backgroundSize: '100% 100%',
        backgroundRepeat: 'no-repeat',
        backgroundPosition: 'center',
      }}
    >
      <span className="relative z-10 [text-shadow:0_2px_1px_rgba(0,0,0,0.35)]">{label}</span>
    </motion.button>
  );
};

const NumberLineNinjaGame: React.FC<NumberLineNinjaGameShellProps> = ({
  levelId,
  avatarId: _avatarId,
  onVictory,
  onGameOver: _onGameOver,
  onBack: _onBack,
  sessionState,
  sessionEvents,
}) => {
  const [questionRun, setQuestionRun] = useState<NumberLineQuestion[]>(() => buildQuestionRun());
  const [questionIndex, setQuestionIndex] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<FeedbackState>('default');
  const [score, setScore] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [hasSignalledFailure, setHasSignalledFailure] = useState(false);
  const [showCelebration, setShowCelebration] = useState(false);
  const [pendingFinish, setPendingFinish] = useState(false);

  const timeLeft = sessionState?.timeLeft ?? 0;
  const lives = sessionState?.lives ?? 0;
  const isSessionActive = timeLeft > 0 && lives > 0;
  const activeQuestion = questionRun[questionIndex] ?? questionRun[0];
  const totalQuestions = questionRun.length || QUESTIONS_PER_ROUND;
  const maxRoundScore = totalQuestions * SCORE_PER_CORRECT;
  const canSubmit = selected !== null && isSessionActive && !pendingFinish;

  useEffect(() => {
    if (!sessionState) return;
    if (sessionState.timeLeft !== sessionState.totalTime) return;
    setQuestionRun(buildQuestionRun());
    setQuestionIndex(0);
    setSelected(null);
    setFeedback('default');
    setScore(0);
    setCorrectCount(0);
    setShowCelebration(false);
    setPendingFinish(false);
    setHasSignalledFailure(false);
  }, [levelId, sessionState, sessionState?.timeLeft, sessionState?.totalTime]);

  useEffect(() => {
    if (hasSignalledFailure || isSessionActive || pendingFinish) return;
    setHasSignalledFailure(true);
    emitMiniGameSessionEvent(sessionEvents, 'game_failed', {
      score,
      reason: lives <= 0 ? 'lives' : 'time',
    });
  }, [hasSignalledFailure, isSessionActive, lives, pendingFinish, score, sessionEvents]);

  const selectOption = (value: string) => {
    if (!isSessionActive || pendingFinish) return;
    setSelected(value);
    setFeedback('selected');
  };

  const submit = () => {
    if (!activeQuestion || !selected || !isSessionActive || pendingFinish) return;
    if (selected === activeQuestion.correct) {
      const nextScore = score + SCORE_PER_CORRECT;
      const nextCorrectCount = correctCount + 1;
      const isFinalQuestion = questionIndex >= totalQuestions - 1;
      setScore(nextScore);
      setCorrectCount(nextCorrectCount);
      setFeedback('correct');
      setShowCelebration(true);

      emitMiniGameSessionEvent(sessionEvents, 'correct_answer', {
        score,
        metadata: {
          scoreDelta: SCORE_PER_CORRECT,
          scoreAfter: nextScore,
          questionIndex,
          questionId: activeQuestion.id,
        },
      });
      emitMiniGameSessionEvent(sessionEvents, 'puzzle_complete', {
        score: nextScore,
        metadata: {
          scoreDelta: SCORE_PER_CORRECT,
          questionIndex,
          questionId: activeQuestion.id,
        },
      });

      window.setTimeout(() => setShowCelebration(false), 340);
      if (isFinalQuestion) {
        setPendingFinish(true);
        window.setTimeout(() => {
          const stars = scoreToStars(nextScore, maxRoundScore);
          emitMiniGameSessionEvent(sessionEvents, 'game_complete', {
            score: nextScore,
            metadata: {
              totalQuestions,
              correctCount: nextCorrectCount,
            },
          });
          onVictory(stars, nextScore);
        }, 520);
        return;
      }

      window.setTimeout(() => {
        if (!isSessionActive) return;
        setQuestionIndex((current) => Math.min(current + 1, totalQuestions - 1));
        setSelected(null);
        setFeedback('default');
      }, 520);
      return;
    }

    setFeedback('incorrect');
    emitMiniGameSessionEvent(sessionEvents, 'incorrect_answer', {
      score,
      metadata: {
        livesBefore: lives,
        livesLost: 1,
        questionIndex,
        questionId: activeQuestion.id,
      },
    });
    window.setTimeout(() => {
      if (!isSessionActive) return;
      setSelected(null);
      setFeedback('default');
    }, 560);
  };

  const feedbackMessage = useMemo(() => {
    if (feedback === 'correct') return 'Perfect! Keep going!';
    if (feedback === 'incorrect') return 'Try another answer!';
    if (selected) return 'Answer selected';
    return `Question ${Math.min(questionIndex + 1, totalQuestions)} of ${totalQuestions}`;
  }, [feedback, questionIndex, selected, totalQuestions]);

  if (!activeQuestion) return null;

  return (
    <div className="relative h-full w-full overflow-hidden">
      <img
        src={mapBackground}
        alt=""
        aria-hidden="true"
        className="absolute inset-0 h-full w-full object-cover"
        draggable={false}
      />
      <div className="absolute inset-0 bg-slate-950/35" />

      <AnimatePresence>
        {showCelebration ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="pointer-events-none absolute inset-0 z-20"
          >
            <motion.div
              initial={{ opacity: 0.75, scale: 0.8 }}
              animate={{ opacity: 0, scale: 1.55 }}
              transition={{ duration: 0.55, ease: 'easeOut' }}
              className="absolute left-1/2 top-1/2 h-48 w-48 -translate-x-1/2 -translate-y-1/2 rounded-full bg-emerald-300/70 blur-2xl"
            />
          </motion.div>
        ) : null}
      </AnimatePresence>

      <div className="relative z-10 flex h-full w-full min-h-0 flex-col px-3 pb-3 pt-1">
        <div className="relative mx-auto mt-1 flex min-h-0 flex-1 w-full max-w-[640px] flex-col">
          <img
            src={panelMain}
            alt=""
            aria-hidden="true"
            className="absolute inset-0 h-full w-full object-fill"
            draggable={false}
          />

          <div className="relative flex h-full min-h-0 flex-col px-4 pb-4 pt-4">
            <div className="shrink-0 px-2 pb-2 text-center">
              <p className="text-[11px] font-black uppercase tracking-[0.2em] text-amber-200">
                {activeQuestion.eyebrow}
              </p>
              <h1 className="mt-1 text-[clamp(1rem,4.15vw,1.28rem)] font-black leading-tight text-white [text-shadow:0_2px_2px_rgba(0,0,0,0.42)]">
                {activeQuestion.prompt}
              </h1>
              <p className="mt-1.5 text-[11px] font-black uppercase tracking-[0.08em] text-cyan-100">
                {feedbackMessage}
              </p>
            </div>

            <div className="relative h-[34%] shrink-0">
              <div className="absolute left-[7%] right-[7%] top-[42%] h-[8px] -translate-y-1/2 rounded-full bg-gradient-to-r from-cyan-100 via-cyan-200 to-cyan-100 shadow-[0_0_18px_rgba(125,211,252,0.65)]" />

              {activeQuestion.ticks.map((tick, index) => {
                const leftPercent = activeQuestion.ticks.length <= 1
                  ? 50
                  : (index / (activeQuestion.ticks.length - 1)) * 100;
                const missing = index === activeQuestion.missingIndex;
                return (
                  <div
                    key={`${activeQuestion.id}-${tick}-${index}`}
                    className="absolute top-[42%] -translate-x-1/2 -translate-y-1/2"
                    style={{ left: `${leftPercent}%` }}
                  >
                    {missing ? (
                      <motion.div
                        animate={{ scale: [1, 1.08, 1], opacity: [0.55, 0.95, 0.55] }}
                        transition={{ duration: 1.25, repeat: Infinity, ease: 'easeInOut' }}
                        className="absolute left-1/2 top-[22px] h-14 w-14 -translate-x-1/2 rounded-full bg-amber-300/40 blur-xl"
                      />
                    ) : null}
                    <div className={`mx-auto w-[5px] rounded-full ${missing ? 'h-14 bg-amber-300' : 'h-9 bg-white/95'}`} />
                    <div className="absolute left-1/2 top-11 -translate-x-1/2">
                      <span className={`inline-flex items-center justify-center whitespace-nowrap text-[clamp(1.25rem,5vw,1.55rem)] font-black ${missing ? 'text-amber-100' : 'text-white'} [text-shadow:0_2px_1px_rgba(0,0,0,0.4)]`}>
                        {tick}
                      </span>
                    </div>
                    {missing ? (
                      <span className="absolute -top-8 left-1/2 -translate-x-1/2 text-amber-200">
                        <Sparkles className="h-5 w-5" />
                      </span>
                    ) : null}
                  </div>
                );
              })}
            </div>

            <div className="relative mt-1 min-h-0 flex-1">
              <div className="relative grid h-full grid-cols-2 gap-2.5 p-1">
                {activeQuestion.options.map((option) => {
                  const selectedState = selected === option;
                  const isCorrect = feedback === 'correct' && option === activeQuestion.correct;
                  const isWrong = feedback === 'incorrect' && selectedState;
                  const variant: AssetButtonProps['variant'] = isCorrect
                    ? 'correct'
                    : isWrong
                      ? 'incorrect'
                      : selectedState
                        ? 'selected'
                        : 'idle';

                  return (
                    <AssetButton
                      key={`${activeQuestion.id}-${option}`}
                      label={option}
                      variant={variant}
                      disabled={!isSessionActive || pendingFinish}
                      onClick={() => selectOption(option)}
                    />
                  );
                })}
              </div>
            </div>

            <div className="shrink-0 px-1 pt-1">
              <AssetButton
                label={canSubmit ? 'Submit' : 'Pick An Answer'}
                variant="primary"
                disabled={!canSubmit}
                onClick={submit}
                className="h-14 text-[1.02rem]"
              />
            </div>
          </div>
        </div>
      </div>

      <div className="pointer-events-none absolute right-4 top-[30%] z-10 text-amber-100">
        <WandSparkles className="h-5 w-5 opacity-90" />
      </div>
    </div>
  );
};

export default NumberLineNinjaGame;
