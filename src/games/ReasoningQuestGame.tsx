import React, { useEffect, useMemo, useRef, useState } from 'react';
import confetti from 'canvas-confetti';
import { motion } from 'motion/react';
import GameplaySceneBackdrop from '../components/GameplaySceneBackdrop';
import { GameScreenShell, PuzzleStage } from '../layout/ScreenPrimitives';
import { FeedbackStrip, TaskCard } from '../components/game-ui/GameUiKit';
import PracticeIntroPopup from '../components/game-ui/PracticeIntroPopup';
import { triggerHaptic } from '../haptics';
import {
  GameplaySessionEventHandlers,
  GameplaySessionState,
  MiniGameShellContractProps,
} from '../app/gameplaySessionContract';
import {
  reshuffleAvoidingRepeat,
  shuffleOptionsWithAnswerIndex,
} from '../utils/questionShuffle';

interface ReasoningQuestGameProps extends MiniGameShellContractProps {
  levelId: number;
  avatarId: string;
  useSharedTopHud?: boolean;
  onVictory: (stars: number, XP: number) => void;
  onGameOver: (XP: number) => void;
  onBack: () => void;
  sessionState?: GameplaySessionState;
  sessionEvents?: GameplaySessionEventHandlers;
}

type QuestionKind = 'reasoning';
type QuestionTopic = 'fractions' | 'ratio' | 'measurement' | 'multi_step' | 'data';

interface ReasoningQuestion {
  id: string;
  kind: QuestionKind;
  topic: QuestionTopic;
  prompt: string;
  options: string[];
  correctIndex: number;
  shortHint: string;
}

type FeedbackTone = 'neutral' | 'success' | 'warning';

const MAX_LIVES = 3;
const TOTAL_ROUNDS = 5;

const QUESTION_BANK: ReasoningQuestion[] = [
  {
    id: 'rq-1',
    kind: 'reasoning',
    topic: 'fractions',
    prompt: 'A potion uses 3/4 cup of water and 1/6 cup of spark. How much liquid in total?',
    options: ['11/12', '5/10', '7/12', '5/6'],
    correctIndex: 0,
    shortHint: 'Find a common denominator before you add.',
  },
  {
    id: 'rq-2',
    kind: 'reasoning',
    topic: 'fractions',
    prompt: 'A shield is 2/3 gold and 1/5 silver. What fraction is gold plus silver?',
    options: ['13/15', '7/15', '5/6', '3/5'],
    correctIndex: 0,
    shortHint: 'Add the fractions with a common denominator.',
  },
  {
    id: 'rq-3',
    kind: 'reasoning',
    topic: 'ratio',
    prompt: 'A map ink mix is 2:5. You already have 8 parts of ink. How many parts of solvent?',
    options: ['10', '12', '16', '20'],
    correctIndex: 2,
    shortHint: 'Scale the ratio so 2 parts become 8.',
  },
  {
    id: 'rq-4',
    kind: 'reasoning',
    topic: 'ratio',
    prompt: 'A crew is split in the ratio 3:2. There are 25 sailors in total. How many are in the larger group?',
    options: ['10', '12', '15', '20'],
    correctIndex: 2,
    shortHint: 'Find one part, then multiply.',
  },
  {
    id: 'rq-5',
    kind: 'reasoning',
    topic: 'measurement',
    prompt: 'A trail is 2.4 km long. The team already walked 900 m. How many metres remain?',
    options: ['1,500 m', '1,400 m', '1,300 m', '2,100 m'],
    correctIndex: 0,
    shortHint: 'Convert to metres, then subtract.',
  },
  {
    id: 'rq-6',
    kind: 'reasoning',
    topic: 'measurement',
    prompt: 'A lantern costs £3.75. You pay with £5.00. What change is needed?',
    options: ['£1.25', '£1.75', '£2.25', '£0.75'],
    correctIndex: 0,
    shortHint: 'Subtract the cost from the amount paid.',
  },
  {
    id: 'rq-7',
    kind: 'reasoning',
    topic: 'multi_step',
    prompt: 'A ship carries 6 crates. Each crate has 24 items. 30 items are damaged. How many good items?',
    options: ['114', '144', '120', '150'],
    correctIndex: 1,
    shortHint: 'Find the total first, then subtract.',
  },
  {
    id: 'rq-8',
    kind: 'reasoning',
    topic: 'multi_step',
    prompt: 'A vault needs 3 keys. Each key costs 45 gems. The team already has 60 gems. How many more?',
    options: ['45', '60', '75', '120'],
    correctIndex: 2,
    shortHint: 'Total cost minus what you have.',
  },
  {
    id: 'rq-9',
    kind: 'reasoning',
    topic: 'data',
    prompt: 'A chart shows gems: Red 6, Blue 9, Green 4, Gold 7. How many more blue than green?',
    options: ['3', '4', '5', '6'],
    correctIndex: 1,
    shortHint: 'Subtract green from blue.',
  },
  {
    id: 'rq-10',
    kind: 'reasoning',
    topic: 'data',
    prompt: 'Scores are 7, 8, 10, 10, 11. What is the mean score?',
    options: ['9.2', '9.0', '10.0', '8.5'],
    correctIndex: 1,
    shortHint: 'Add and divide by 5.',
  },
  {
    id: 'rq-11',
    kind: 'reasoning',
    topic: 'measurement',
    prompt: 'A ride starts at 14:25 and lasts 1 hour 35 minutes. What time does it end?',
    options: ['15:50', '16:00', '16:05', '16:15'],
    correctIndex: 2,
    shortHint: 'Add 1 hour, then 35 minutes.',
  },
  {
    id: 'rq-12',
    kind: 'reasoning',
    topic: 'fractions',
    prompt: 'A potion uses 5/6 cup total. 1/3 is essence. What fraction is the rest?',
    options: ['1/2', '1/3', '2/3', '1/6'],
    correctIndex: 0,
    shortHint: 'Subtract the fraction from the whole.',
  },
];

const buildQuestionDeck = (previousLast: ReasoningQuestion | null) => (
  reshuffleAvoidingRepeat(QUESTION_BANK, previousLast, (question) => question.id).map((question) => {
    const shuffled = shuffleOptionsWithAnswerIndex(question.options, question.correctIndex);
    return {
      ...question,
      options: shuffled.options,
      correctIndex: shuffled.answerIndex,
    };
  })
);

const starsForRun = (correct: number, rounds: number, lives: number) => {
  const accuracy = rounds > 0 ? correct / rounds : 1;
  if (accuracy >= 0.9 && lives >= 2) return 3;
  if (accuracy >= 0.7) return 2;
  return 1;
};

const ReasoningQuestGame: React.FC<ReasoningQuestGameProps> = ({
  levelId,
  avatarId: _avatarId,
  useSharedTopHud = true,
  isPractice,
  practiceBriefing,
  onVictory,
  onGameOver,
  onBack: _onBack,
  sessionState: _sessionState,
  sessionEvents,
}) => {
  const resolvedLevel = useMemo(() => Math.max(1, Math.min(10, levelId || 1)), [levelId]);
  const [roundIndex, setRoundIndex] = useState(0);
  const [questionOrder, setQuestionOrder] = useState<ReasoningQuestion[]>(() => buildQuestionDeck(null));
  const [lives, setLives] = useState(MAX_LIVES);
  const [score, setScore] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [feedbackTone, setFeedbackTone] = useState<FeedbackTone>('neutral');
  const [feedbackText, setFeedbackText] = useState('');
  const [locked, setLocked] = useState(false);
  const [showPracticeIntro, setShowPracticeIntro] = useState(Boolean(isPractice));
  const timersRef = useRef<number[]>([]);

  const activeQuestion = questionOrder[roundIndex % questionOrder.length];
  const lastQuestion = questionOrder.length ? questionOrder[questionOrder.length - 1] : null;

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
    setQuestionOrder(buildQuestionDeck(null));
    setRoundIndex(0);
    setLives(MAX_LIVES);
    setScore(0);
    setCorrectCount(0);
    setSelectedIndex(null);
    setFeedbackTone('neutral');
    setFeedbackText('');
    setLocked(false);
  }, [resolvedLevel]);

  useEffect(() => {
    if (!questionOrder.length) return;
    if (roundIndex > 0 && roundIndex % questionOrder.length === 0) {
      setQuestionOrder(buildQuestionDeck(lastQuestion));
    }
  }, [lastQuestion, questionOrder.length, roundIndex]);

  const advanceRound = (nextCorrect: number, nextScore: number, nextLives: number) => {
    if (roundIndex + 1 >= TOTAL_ROUNDS) {
      const stars = starsForRun(nextCorrect, TOTAL_ROUNDS, nextLives);
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.65 },
        colors: ['#38bdf8', '#facc15', '#34d399'],
      });
      sessionEvents?.onGameComplete?.({ score: nextScore, stars });
      onVictory(stars, nextScore);
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setRoundIndex((prev) => prev + 1);
      setSelectedIndex(null);
      setFeedbackTone('neutral');
      setFeedbackText('');
      setLocked(false);
    }, 640);
    timersRef.current.push(timeoutId);
  };

  const handleAnswer = (index: number) => {
    if (locked) return;
    setSelectedIndex(index);
    setLocked(true);

    if (index === activeQuestion.correctIndex) {
      const gained = 180 + resolvedLevel * 18;
      const updatedScore = score + gained;
      const nextCorrect = correctCount + 1;
      setScore(updatedScore);
      setCorrectCount(nextCorrect);
      setFeedbackTone('success');
      setFeedbackText(`Correct. ${activeQuestion.shortHint}`);
      triggerHaptic('success');
      sessionEvents?.onCorrectAnswer?.({ score: updatedScore, metadata: { topic: activeQuestion.topic } });
      sessionEvents?.onPuzzleComplete?.({ score: updatedScore });
      advanceRound(nextCorrect, updatedScore, lives);
      return;
    }

    const nextLives = lives - 1;
    setLives(nextLives);
    setFeedbackTone('warning');
    setFeedbackText('Not quite. Try again.');
    triggerHaptic('error');
    sessionEvents?.onIncorrectAnswer?.({ score, metadata: { topic: activeQuestion.topic } });

    if (nextLives <= 0) {
      const timeoutId = window.setTimeout(() => {
        sessionEvents?.onGameFailed?.({ score, reason: 'lives' });
        onGameOver(score);
      }, 620);
      timersRef.current.push(timeoutId);
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setSelectedIndex(null);
      setFeedbackTone('neutral');
      setFeedbackText('');
      setLocked(false);
    }, 520);
    timersRef.current.push(timeoutId);
  };

  return (
    <GameScreenShell className="overflow-hidden">
      <GameplaySceneBackdrop gameType="reasoning_quest" />

      <PracticeIntroPopup
        open={showPracticeIntro}
        title="Reasoning Quest"
        body="Read the clue and choose the best plan.\nPick the answer that clears the path."
        briefing={practiceBriefing}
        onAction={() => setShowPracticeIntro(false)}
      />

      <div className={`relative z-10 flex h-full min-h-0 w-full flex-1 flex-col px-3 pb-[calc(env(safe-area-inset-bottom)+2.1rem)] ${useSharedTopHud ? 'pt-[calc(env(safe-area-inset-top)+4.6rem)] md:pt-[calc(env(safe-area-inset-top)+4.9rem)]' : 'pt-[calc(env(safe-area-inset-top)+2.4rem)]'}`}>
        <PuzzleStage className="flex h-full min-h-0 flex-1 flex-col gap-2 md:gap-3">
          <TaskCard>
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="question-title">Reasoning Quest</div>
                <div className="game-question-copy mt-1 text-white md:text-lg">{activeQuestion.prompt}</div>
              </div>
            </div>
            <div className="mt-2 text-[11px] font-semibold text-cyan-100/85 md:text-sm">
              Think it through before you answer.
            </div>
          </TaskCard>

          <div className="grid flex-1 grid-cols-2 gap-2 md:gap-3">
            {activeQuestion.options.map((option, index) => (
              <motion.button
                key={`${activeQuestion.id}-${option}`}
                whileTap={{ scale: 0.97 }}
                onClick={() => handleAnswer(index)}
                disabled={locked}
              className={`flex min-h-[3.6rem] items-center justify-center rounded-[1.1rem] text-base font-black md:min-h-[4.1rem] md:text-xl ${
                selectedIndex === index
                  ? index === activeQuestion.correctIndex
                    ? 'ui-button-success'
                    : 'ui-button-primary'
                  : 'ui-button-secondary'
              }`}
            >
                {option}
              </motion.button>
            ))}
          </div>

          <FeedbackStrip tone={feedbackTone}>
            {feedbackText}
          </FeedbackStrip>
        </PuzzleStage>
      </div>
    </GameScreenShell>
  );
};

export default ReasoningQuestGame;
