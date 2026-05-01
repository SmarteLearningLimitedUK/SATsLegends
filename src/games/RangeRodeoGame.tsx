import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  emitMiniGameSessionEvent,
  MiniGameShellContractProps,
} from '../app/gameplaySessionContract';
import PracticeIntroPopup from '../components/game-ui/PracticeIntroPopup';
import { GameQuestionCard } from '../components/game-ui/GameUiKit';
import sceneBackground from '../assets/maps/backgroundsforgames/range rodeo.jpg';
import rodeoBossOne from '../assets/rodeo boss/rodeo1.png';
import rodeoBossTwo from '../assets/rodeo boss/rodeo2.png';
import rodeoBossThree from '../assets/rodeo boss/rodeo3.png';
import rodeoBossFour from '../assets/rodeo boss/rodeo4.png';
import {
  generateRangeRodeoRound,
  isRangeRodeoAnswerCorrect,
  RangeRodeoQuestion,
} from './rangeRodeoGenerator';
import { pickNextQuestionAvoidingImmediateRepeat } from '../utils/answerOptions';

interface RangeRodeoGameProps {
  levelId: number;
  avatarId: string;
  onVictory: (stars: number, XP: number) => void;
  onGameOver: (XP: number) => void;
  onBack: () => void;
}

type RangeRodeoGameShellProps = RangeRodeoGameProps & MiniGameShellContractProps;

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));
const RODEO_BOSS_IMAGES = [rodeoBossOne, rodeoBossTwo, rodeoBossThree, rodeoBossFour] as const;

const starsFromAccuracy = (correct: number, attempts: number) => {
  const accuracy = attempts > 0 ? correct / attempts : 0;
  if (accuracy >= 0.86) return 3;
  if (accuracy >= 0.64) return 2;
  return 1;
};
const rangeQuestionKey = (question: RangeRodeoQuestion) => `${question.question}|${question.answers.join('|')}`;

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
  const buildNextQuestion = (
    score: number,
    answered: number,
    context: { correctStreak?: number; lostLifeRecently?: boolean } = {},
    previousQuestion?: RangeRodeoQuestion | null,
  ) => pickNextQuestionAvoidingImmediateRepeat(
    () => generateRangeRodeoRound(score, answered, context),
    previousQuestion ?? null,
    rangeQuestionKey,
  );
  const [showPracticeIntro, setShowPracticeIntro] = useState(Boolean(isPractice));
  const [question, setQuestion] = useState<RangeRodeoQuestion>(() => buildNextQuestion(0, 0));
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
  const previousLivesRef = useRef<number | null>(null);
  const lostLifeRecentlyRef = useRef(false);
  const timeoutRef = useRef<number | null>(null);

  const roundsGoal = useMemo(() => clamp(6 + Math.floor(levelId / 2), 6, 10), [levelId]);
  const neutralBossImage = RODEO_BOSS_IMAGES[0];
  const successBossImage = RODEO_BOSS_IMAGES[2] ?? RODEO_BOSS_IMAGES[RODEO_BOSS_IMAGES.length - 1];
  const errorBossImage = RODEO_BOSS_IMAGES[3] ?? RODEO_BOSS_IMAGES[RODEO_BOSS_IMAGES.length - 1];
  const bossImage = feedback?.tone === 'success'
    ? successBossImage
    : feedback?.tone === 'error'
      ? errorBossImage
      : neutralBossImage;

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
    setQuestion(buildNextQuestion(0, 0, {}, null));
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

  const handleOptionTap = (answerIndex: number, answerValue: string) => {
    if (inputLocked || didComplete || !isSessionActive) return;

    const isCorrect = isRangeRodeoAnswerCorrect(question, answerValue);
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
      if (isCorrect && roundIndex + 1 >= roundsGoal) {
        completeGame(nextXP, nextCorrect, nextAttempts);
        return;
      }
      setQuestion((previousQuestion) => buildNextQuestion(nextXP, roundIndex + 1, {
        correctStreak: nextStreak,
        lostLifeRecently: lostLifeForNextRound,
      }, previousQuestion));
      lostLifeRecentlyRef.current = false;
      moveToNextQuestion();
    }, isCorrect ? 720 : 820);
  };

  return (
    <div className="relative h-full w-full overflow-hidden bg-[#050914] text-white">
      {showPracticeIntro ? (
        <PracticeIntroPopup
          title="Range Rodeo"
          body="The Monster Minds scrambled the score cards.\nFind the range of each number set.\nRemember: range = largest - smallest."
          briefing={practiceBriefing}
          onAction={() => setShowPracticeIntro(false)}
        />
      ) : null}

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

        <div className="relative mt-2 flex min-h-0 flex-1 flex-col justify-between gap-2">
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

          <div className="relative z-[1] mx-auto flex min-h-0 w-full max-w-[520px] flex-1 items-end justify-center pb-[5px]">
            <div className="relative h-full min-h-[10rem] w-full max-h-[18.5rem]">
              <div className="absolute left-1/2 top-[34%] z-10 -translate-x-1/2 rounded-lg border border-amber-200/35 bg-slate-900/76 p-1.5 shadow-[0_10px_20px_rgba(2,6,23,0.46)]">
                <div className="mb-1 text-center text-[8px] font-black uppercase tracking-[0.12em] text-amber-200 md:text-[9px]">
                  Range Boss
                </div>
                <div className="relative h-2 w-[clamp(7rem,32vw,12rem)] overflow-hidden rounded-full border border-slate-700/80 bg-slate-950/80">
                  <div
                    className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-rose-500 via-rose-400 to-orange-300 shadow-[0_0_12px_rgba(251,113,133,0.75)]"
                    style={{
                      width: `${Math.max(10, 100 - (correctAnswers / Math.max(1, roundsGoal)) * 100)}%`,
                    }}
                  />
                </div>
              </div>
              <div className="absolute left-1/2 top-[60%] h-[28%] w-[56%] -translate-x-1/2 -translate-y-1/2 rounded-full bg-cyan-400/20 blur-2xl" />
              <img
                src={bossImage}
                alt=""
                aria-hidden="true"
                draggable={false}
                className="absolute left-1/2 bottom-[-30px] h-[108%] max-h-[19.4rem] -translate-x-1/2 object-contain drop-shadow-[0_18px_26px_rgba(2,6,23,0.58)]"
              />
            </div>
          </div>

          <div className="relative z-[1] mx-auto mb-1 grid w-full max-w-[520px] grid-cols-4 gap-2">
            {question.answers.map((answer, answerIndex) => {
              const isSelected = selectedOptionIndex === answerIndex;
              const isCorrectSelection = isSelected && feedback?.tone === 'success';
              const buttonClass = isCorrectSelection
                ? 'ui-button-success'
                : isSelected
                  ? 'ui-button-primary'
                  : 'ui-button-secondary';

              return (
                <button
                  key={`${question.id}-option-${answer}`}
                  type="button"
                  onClick={() => handleOptionTap(answerIndex, answer)}
                  disabled={inputLocked || didComplete || !isSessionActive}
                  className={`min-h-[3.1rem] rounded-[0.95rem] px-1.5 py-2 text-[clamp(14px,2.2vh,20px)] font-black ${buttonClass} disabled:opacity-55`}
                >
                  {answer}
                </button>
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
