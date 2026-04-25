import React, { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import {
  emitMiniGameSessionEvent,
  MiniGameShellContractProps,
} from '../app/gameplaySessionContract';
import PracticeIntroPopup from '../components/game-ui/PracticeIntroPopup';
import { GameQuestionCard } from '../components/game-ui/GameUiKit';
import sceneBackground from '../../range rodeo.jpg';
import rodeoStaticOverlay from '../assets/rodeo static.png';
import rodeoSuccessAnim from '../assets/rodeo anim.gif';
import enemySprite from '../assets/maps/ezgif-261d69e7ae90ee8c.webp';
import {
  generateRangeRodeoRound,
  isRangeRodeoAnswerCorrect,
  RangeRodeoQuestion,
} from './rangeRodeoGenerator';

interface RangeRodeoGameProps {
  levelId: number;
  avatarId: string;
  onVictory: (stars: number, XP: number) => void;
  onGameOver: (XP: number) => void;
  onBack: () => void;
}

type RangeRodeoGameShellProps = RangeRodeoGameProps & MiniGameShellContractProps;

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

const starsFromAccuracy = (correct: number, attempts: number) => {
  const accuracy = attempts > 0 ? correct / attempts : 0;
  if (accuracy >= 0.86) return 3;
  if (accuracy >= 0.64) return 2;
  return 1;
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
  const [question, setQuestion] = useState<RangeRodeoQuestion>(() => generateRangeRodeoRound(0, 0));
  const [selectedOptionIndex, setSelectedOptionIndex] = useState<number | null>(null);
  const [feedback, setFeedback] = useState<{ tone: 'success' | 'error'; text: string } | null>(null);
  const [correctAnswers, setCorrectAnswers] = useState(0);
  const [correctStreak, setCorrectStreak] = useState(0);
  const [attempts, setAttempts] = useState(0);
  const [XP, setXP] = useState(0);
  const [roundIndex, setRoundIndex] = useState(0);
  const [didComplete, setDidComplete] = useState(false);
  const [hasSignalledFailure, setHasSignalledFailure] = useState(false);
  const [inputLocked, setInputLocked] = useState(false);
  const [showCorrectAnimation, setShowCorrectAnimation] = useState(false);
  const previousLivesRef = useRef<number | null>(null);
  const lostLifeRecentlyRef = useRef(false);
  const timeoutRef = useRef<number | null>(null);

  const roundsGoal = useMemo(() => clamp(6 + Math.floor(levelId / 2), 6, 10), [levelId]);

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
    setQuestion(generateRangeRodeoRound(0, 0));
    setSelectedOptionIndex(null);
    setFeedback(null);
    setCorrectAnswers(0);
    setCorrectStreak(0);
    setAttempts(0);
    setXP(0);
    setRoundIndex(0);
    setDidComplete(false);
    setHasSignalledFailure(false);
    setInputLocked(false);
    setShowCorrectAnimation(false);
    previousLivesRef.current = sessionState.lives;
    lostLifeRecentlyRef.current = false;
  }, [levelId, sessionState, sessionState?.timeLeft, sessionState?.totalTime]);

  useEffect(() => {
    if (!sessionState) return;
    const previousLives = previousLivesRef.current;
    if (previousLives !== null && sessionState.lives < previousLives) {
      lostLifeRecentlyRef.current = true;
    }
    previousLivesRef.current = sessionState.lives;
  }, [sessionState, sessionState?.lives]);

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
    setSelectedOptionIndex(null);
    setFeedback(null);
    setInputLocked(false);
    setShowCorrectAnimation(false);
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

  const handleOptionTap = (answerIndex: number) => {
    if (inputLocked || didComplete || !isSessionActive) return;

    const isCorrect = isRangeRodeoAnswerCorrect(question, answerIndex);
    const nextAttempts = attempts + 1;
    const nextCorrect = correctAnswers + (isCorrect ? 1 : 0);
    const nextStreak = isCorrect ? correctStreak + 1 : 0;
    const nextXP = XP + (isCorrect ? 120 : 20);

    setInputLocked(true);
    setSelectedOptionIndex(answerIndex);
    setAttempts(nextAttempts);
    setCorrectAnswers(nextCorrect);
    setCorrectStreak(nextStreak);
    setXP(nextXP);
    setShowCorrectAnimation(isCorrect);

    emitMiniGameSessionEvent(sessionEvents, isCorrect ? 'correct_answer' : 'incorrect_answer', {
      score: nextXP,
      metadata: {
        selected: question.answers[answerIndex] ?? null,
        correct: question.correctAnswer,
        numbers: question.values,
      },
    });

    setFeedback(
      isCorrect
        ? { tone: 'success', text: question.explanation }
        : { tone: 'error', text: `Not quite. ${question.explanation}` },
    );

    const lostLifeForNextRound = !isCorrect || lostLifeRecentlyRef.current;

    timeoutRef.current = window.setTimeout(() => {
      timeoutRef.current = null;
      setShowCorrectAnimation(false);
      if (isCorrect && roundIndex + 1 >= roundsGoal) {
        completeGame(nextXP, nextCorrect, nextAttempts);
        return;
      }
      setQuestion(generateRangeRodeoRound(nextXP, roundIndex + 1, {
        correctStreak: nextStreak,
        lostLifeRecently: lostLifeForNextRound,
      }));
      lostLifeRecentlyRef.current = false;
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
              {question.question}
            </div>
            <div className="text-[clamp(11px,1.9vh,14px)] font-semibold text-cyan-100/90">
              Range = highest value - lowest value
            </div>
          </div>
        </GameQuestionCard>

        <div className="relative mt-2 flex min-h-0 flex-1 flex-col justify-between">
          {showCorrectAnimation ? (
            <div className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center">
              <img
                src={rodeoSuccessAnim}
                alt="Correct answer celebration"
                className="h-[36%] min-h-[130px] max-h-[260px] w-auto object-contain drop-shadow-[0_12px_24px_rgba(2,6,23,0.45)]"
                draggable={false}
              />
            </div>
          ) : null}

          <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden rounded-[1rem]">
            <img
              src={rodeoStaticOverlay}
              alt=""
              draggable={false}
              className="h-full w-full object-cover opacity-95"
            />
          </div>

          {question.values && question.questionType !== 'word_problem' ? (
            <div className="relative z-[1] mx-auto flex w-full max-w-[520px] shrink-0 flex-wrap items-center justify-center gap-2 rounded-[1rem] border border-white/25 bg-slate-900/55 px-3 py-3 shadow-[0_14px_28px_rgba(2,6,23,0.34)]">
              {question.values.map((value, index) => (
                <div
                  key={`${question.id}-${index}-${value}`}
                  className="min-w-[60px] rounded-[0.72rem] border border-cyan-100/28 bg-white/12 px-3 py-2 text-center text-[clamp(18px,3.2vh,30px)] font-black text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.18)]"
                >
                  {value}
                </div>
              ))}
            </div>
          ) : null}

          <div className="pointer-events-none relative z-[1] mx-auto mt-3 flex h-[30%] min-h-[120px] w-full max-w-[520px] items-end justify-center">
            <img
              src={enemySprite}
              alt=""
              className="max-h-full w-auto object-contain drop-shadow-[0_14px_18px_rgba(2,6,23,0.55)]"
              draggable={false}
            />
          </div>

          <div className="relative z-[1] mx-auto mb-1 mt-2 grid w-full max-w-[520px] grid-cols-2 gap-2">
            {question.answers.map((answer, answerIndex) => {
              const isSelected = selectedOptionIndex === answerIndex;
              const isCorrectSelection = isSelected && feedback?.tone === 'success';
              const buttonClass = isCorrectSelection
                ? 'ui-button-success'
                : isSelected
                  ? 'ui-button-primary'
                  : 'ui-button-secondary';

              return (
                <motion.button
                  key={`${question.id}-option-${answer}`}
                  type="button"
                  whileTap={{ scale: 0.97 }}
                  onClick={() => handleOptionTap(answerIndex)}
                  disabled={inputLocked || didComplete || !isSessionActive}
                  className={`min-h-[3.1rem] rounded-[0.95rem] px-2 py-2 text-[clamp(15px,2.5vh,22px)] font-black ${buttonClass} disabled:opacity-55`}
                >
                  {answer}
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
