import React, { useEffect, useMemo, useRef, useState } from 'react';
import confetti from 'canvas-confetti';
import { motion } from 'motion/react';
import GameplaySceneBackdrop from '../components/GameplaySceneBackdrop';
import { AVATARS } from '../constants';
import { GameQuestionCard, FeedbackStrip } from '../components/game-ui/GameUiKit';
import PracticeIntroPopup from '../components/game-ui/PracticeIntroPopup';
import { GameScreenShell } from '../layout/ScreenPrimitives';
import { getSatsInspiredChallengeQuestion } from '../systems/content/satsInspiredQuestionBanks';
import { triggerHaptic } from '../haptics';
import lavaPathBackground from '../assets/maps/backgroundsforgames/lava-path.jpg';
import {
  GameplaySessionEventHandlers,
  GameplaySessionState,
  MiniGameShellContractProps,
} from '../app/gameplaySessionContract';

interface UnitMixerGameProps extends MiniGameShellContractProps {
  levelId: number;
  avatarId: string;
  useSharedTopHud?: boolean;
  onVictory: (stars: number, XP: number) => void;
  onGameOver: (XP: number) => void;
  onBack: () => void;
  sessionState?: GameplaySessionState;
  sessionEvents?: GameplaySessionEventHandlers;
}

interface UnitMixerQuestion {
  prompt: string;
  sublabel: string;
  options: string[];
  answerIndex: number;
}

type FeedbackTone = 'neutral' | 'success' | 'warning';

const TOTAL_STEPS = 10;
const MAX_WRONGS = 3;
const STEP_XP = 140;

const LAVA_PATH_STOPS = [
  { x: 50.5, y: 91.5 },
  { x: 58.5, y: 82.5 },
  { x: 43.5, y: 74.5 },
  { x: 57.5, y: 65.5 },
  { x: 42.5, y: 56.5 },
  { x: 58.0, y: 47.5 },
  { x: 44.0, y: 38.5 },
  { x: 59.0, y: 29.5 },
  { x: 45.5, y: 20.5 },
  { x: 56.0, y: 11.5 },
  { x: 51.5, y: 4.5 },
] as const;

const getLavaPathPosition = (stepIndex: number) => {
  const clampedIndex = Math.max(0, Math.min(stepIndex, LAVA_PATH_STOPS.length - 1));
  return LAVA_PATH_STOPS[clampedIndex];
};

const fallbackQuestions: UnitMixerQuestion[] = [
  {
    prompt: 'Convert 3.5 km to metres.',
    sublabel: 'Remember that 1 km = 1000 m.',
    options: ['3,500 m', '350 m', '35,000 m', '3.5 m'],
    answerIndex: 0,
  },
  {
    prompt: 'Convert 420 cm to metres.',
    sublabel: 'Divide by 100 to move from cm to m.',
    options: ['4.2 m', '42 m', '0.42 m', '420 m'],
    answerIndex: 0,
  },
  {
    prompt: 'A bottle holds 1.2 litres. How many millilitres is that?',
    sublabel: 'Litres to millilitres is x1000.',
    options: ['1,200 ml', '120 ml', '12,000 ml', '0.12 ml'],
    answerIndex: 0,
  },
  {
    prompt: 'Convert 2.75 kg to grams.',
    sublabel: 'Kilograms to grams is x1000.',
    options: ['2,750 g', '275 g', '27,500 g', '2.75 g'],
    answerIndex: 0,
  },
];

const shuffle = <T,>(items: T[]) => {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
};

const sanitizeText = (text: string) => (
  text
    .replace(/Ãƒâ€”/g, 'x')
    .replace(/ÃƒÂ·/g, '/')
    .replace(/Ã‚Â°/g, 'Â°')
);

const resolveQuestion = (levelId: number): UnitMixerQuestion => {
  const question = getSatsInspiredChallengeQuestion('unit_mixer', levelId);
  if (!question) return fallbackQuestions[Math.floor(Math.random() * fallbackQuestions.length)];

  const options = shuffle(question.options);
  const correct = question.options[question.answerIndex];

  return {
    prompt: sanitizeText(question.prompt),
    sublabel: sanitizeText(question.sublabel),
    options,
    answerIndex: Math.max(0, options.indexOf(correct)),
  };
};

const starsForRun = (mistakes: number) => {
  if (mistakes === 0) return 3;
  if (mistakes === 1) return 2;
  return 1;
};

const UnitMixerGame: React.FC<UnitMixerGameProps> = ({
  levelId,
  avatarId,
  useSharedTopHud = true,
  isPractice,
  practiceBriefing,
  onVictory,
  onGameOver,
  onBack: _onBack,
  sessionState: _sessionState,
  sessionEvents,
}) => {
  const resolvedLevel = useMemo(() => Math.max(1, Math.min(8, levelId || 1)), [levelId]);
  const [question, setQuestion] = useState<UnitMixerQuestion>(() => resolveQuestion(resolvedLevel));
  const [score, setScore] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [wrongCount, setWrongCount] = useState(0);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [feedbackTone, setFeedbackTone] = useState<FeedbackTone>('neutral');
  const [feedbackText, setFeedbackText] = useState('');
  const [locked, setLocked] = useState(false);
  const [showPracticeIntro, setShowPracticeIntro] = useState(Boolean(isPractice));

  const timersRef = useRef<number[]>([]);
  const finishedRef = useRef(false);

  const playerAvatar = useMemo(
    () => AVATARS.find((entry) => entry.id === avatarId) ?? AVATARS[0],
    [avatarId],
  );
  const playerAvatarImage = playerAvatar.portrait || playerAvatar.image;

  const clearTimers = () => {
    timersRef.current.forEach((timerId) => window.clearTimeout(timerId));
    timersRef.current = [];
  };

  useEffect(() => () => clearTimers(), []);

  useEffect(() => {
    setShowPracticeIntro(Boolean(isPractice));
  }, [isPractice]);

  useEffect(() => {
    clearTimers();
    setQuestion(resolveQuestion(resolvedLevel));
    setScore(0);
    setCorrectCount(0);
    setWrongCount(0);
    setSelectedIndex(null);
    setFeedbackTone('neutral');
    setFeedbackText('');
    setLocked(false);
    finishedRef.current = false;
  }, [resolvedLevel]);

  const loadNextQuestion = () => {
    const timeoutId = window.setTimeout(() => {
      setQuestion(resolveQuestion(resolvedLevel));
      setSelectedIndex(null);
      setFeedbackTone('neutral');
      setFeedbackText('');
      setLocked(false);
    }, 560);
    timersRef.current.push(timeoutId);
  };

  const finishVictory = (finalScore: number, mistakes: number) => {
    if (finishedRef.current) return;
    finishedRef.current = true;
    setLocked(true);
    setFeedbackTone('success');
    setFeedbackText('Lava Path cleared!');

    const stars = starsForRun(mistakes);
    confetti({
      particleCount: 90,
      spread: 70,
      origin: { y: 0.64 },
      colors: ['#38bdf8', '#facc15', '#34d399'],
    });

    sessionEvents?.onGameComplete?.({ score: finalScore, stars });
    onVictory(stars, finalScore);
  };

  const finishGameOver = (finalScore: number) => {
    if (finishedRef.current) return;
    finishedRef.current = true;
    setLocked(true);
    setFeedbackTone('warning');
    setFeedbackText('The lava path has beaten you.');
    sessionEvents?.onGameFailed?.({ score: finalScore, reason: 'mistakes' });
    onGameOver(finalScore);
  };

  const handleAnswer = (index: number) => {
    if (locked || finishedRef.current) return;

    setSelectedIndex(index);
    setLocked(true);

    if (index === question.answerIndex) {
      const gained = STEP_XP + resolvedLevel * 12;
      const updatedScore = score + gained;
      const nextCorrect = correctCount + 1;

      setScore(updatedScore);
      setCorrectCount(nextCorrect);
      setFeedbackTone('success');
      setFeedbackText(`Correct. +${gained} XP`);
      triggerHaptic('success');
      sessionEvents?.onCorrectAnswer?.({ score: updatedScore, metadata: { prompt: question.prompt } });
      sessionEvents?.onPuzzleComplete?.({ score: updatedScore });

      if (nextCorrect >= TOTAL_STEPS) {
        const timeoutId = window.setTimeout(() => finishVictory(updatedScore, wrongCount), 720);
        timersRef.current.push(timeoutId);
        return;
      }

      loadNextQuestion();
      return;
    }

    const nextWrong = wrongCount + 1;
    setWrongCount(nextWrong);
    setFeedbackTone('warning');
    setFeedbackText(`Not quite. ${MAX_WRONGS - nextWrong} mistakes left.`);
    triggerHaptic('error');
    sessionEvents?.onIncorrectAnswer?.({
      score,
      metadata: { correctAnswer: question.options[question.answerIndex] },
    });

    if (nextWrong >= MAX_WRONGS) {
      const timeoutId = window.setTimeout(() => finishGameOver(score), 720);
      timersRef.current.push(timeoutId);
      return;
    }

    loadNextQuestion();
  };

  const currentStep = Math.min(correctCount, LAVA_PATH_STOPS.length - 1);
  const currentPosition = getLavaPathPosition(currentStep);

  return (
    <GameScreenShell className="overflow-hidden" backgroundImage={lavaPathBackground} backgroundOpacity={1}>
      <GameplaySceneBackdrop gameType="unit_mixer" />

      <PracticeIntroPopup
        open={showPracticeIntro}
        title="Lava Path"
        body="Answer correctly to move the hero up the path.\nThree mistakes ends the run."
        briefing={practiceBriefing}
        onAction={() => setShowPracticeIntro(false)}
      />

      <div className={`relative z-10 flex h-full min-h-0 w-full flex-1 flex-col px-3 pb-[calc(env(safe-area-inset-bottom)+2.1rem)] ${useSharedTopHud ? 'pt-[calc(env(safe-area-inset-top)+4.6rem)] md:pt-[calc(env(safe-area-inset-top)+4.9rem)]' : 'pt-[calc(env(safe-area-inset-top)+2.4rem)]'}`}>
        <div className="flex justify-center">
          <GameQuestionCard
            title=""
            className="w-full max-w-[860px] border border-amber-200/35 bg-[linear-gradient(180deg,rgba(251,191,36,0.24),rgba(15,23,42,0.16))] px-4 py-2 text-center shadow-[0_12px_26px_rgba(15,23,42,0.14)] md:px-6 md:py-2.5"
            bodyClassName="text-[clamp(1.1rem,3vw,2.35rem)] font-black leading-tight tracking-tight text-white"
          >
            {question.prompt}
          </GameQuestionCard>
        </div>

        <div className="relative min-h-0 flex-1">
          <motion.div
            key={currentStep}
            animate={{ left: `${currentPosition.x}%`, top: `${currentPosition.y}%` }}
            transition={{ type: 'tween', duration: 0.42, ease: 'easeOut' }}
            className="absolute z-20 -translate-x-1/2 -translate-y-1/2"
          >
            <div className="relative h-[clamp(3rem,6vw,4.8rem)] w-[clamp(3rem,6vw,4.8rem)]">
              <div className="absolute inset-0 rounded-full bg-amber-300/16 blur-xl" />
              <img
                src={playerAvatarImage}
                alt={playerAvatar.name}
                className="relative z-10 h-full w-full object-contain drop-shadow-[0_16px_22px_rgba(0,0,0,0.32)]"
                draggable={false}
              />
            </div>
          </motion.div>
        </div>

        <div className="shrink-0">
          <div className="answer-choice-surface grid grid-cols-2 gap-2 md:gap-3">
            {question.options.map((option, index) => (
              <motion.button
                key={`${question.prompt}-${option}`}
                whileTap={{ scale: 0.97 }}
                onClick={() => handleAnswer(index)}
                disabled={locked || finishedRef.current}
                className={`flex min-h-[3.4rem] items-center justify-center rounded-[1.05rem] px-2 py-2 text-base font-black md:min-h-[3.85rem] md:text-xl ${
                  selectedIndex === index
                    ? index === question.answerIndex
                      ? 'ui-button-success'
                      : 'ui-button-primary'
                    : 'ui-button-secondary'
                }`}
              >
                {option}
              </motion.button>
            ))}
          </div>

          {feedbackText ? (
            <div className="mt-2">
            <FeedbackStrip tone={feedbackTone}>
              {feedbackText}
            </FeedbackStrip>
          </div>
          ) : null}
        </div>
      </div>
    </GameScreenShell>
  );
};

export default UnitMixerGame;
