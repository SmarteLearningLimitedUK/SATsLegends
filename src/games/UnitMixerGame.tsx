import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import confetti from 'canvas-confetti';
import { motion } from 'motion/react';
import GameplaySceneBackdrop from '../components/GameplaySceneBackdrop';
import { GameScreenShell, PuzzleStage } from '../layout/ScreenPrimitives';
import { FeedbackStrip, StoryCard, TaskCard } from '../components/game-ui/GameUiKit';
import { getSatsInspiredChallengeQuestion } from '../systems/content/satsInspiredQuestionBanks';
import { triggerHaptic } from '../haptics';
import { GameplaySessionEventHandlers, GameplaySessionState } from '../app/gameplaySessionContract';

interface UnitMixerGameProps {
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
  kind: 'fluency' | 'reasoning';
  prompt: string;
  sublabel: string;
  options: string[];
  answerIndex: number;
  visualLines: string[];
}

type FeedbackTone = 'neutral' | 'success' | 'warning';

const MAX_LIVES = 3;
const TOTAL_ROUNDS = 6;

const fallbackQuestions: UnitMixerQuestion[] = [
  {
    kind: 'fluency',
    prompt: 'Convert 3.5 km to metres.',
    sublabel: 'Remember that 1 km = 1000 m.',
    options: ['3,500 m', '350 m', '35,000 m', '3.5 m'],
    answerIndex: 0,
    visualLines: ['3.5 km', 'x 1000 = ? m'],
  },
  {
    kind: 'fluency',
    prompt: 'Convert 420 cm to metres.',
    sublabel: 'Divide by 100 to move from cm to m.',
    options: ['4.2 m', '42 m', '0.42 m', '420 m'],
    answerIndex: 0,
    visualLines: ['420 cm', '/ 100 = ? m'],
  },
  {
    kind: 'fluency',
    prompt: 'A bottle holds 1.2 litres. How many millilitres is that?',
    sublabel: 'Litres to millilitres is x1000.',
    options: ['1,200 ml', '120 ml', '12,000 ml', '0.12 ml'],
    answerIndex: 0,
    visualLines: ['1.2 l', 'x 1000 = ? ml'],
  },
  {
    kind: 'fluency',
    prompt: 'Convert 2.75 kg to grams.',
    sublabel: 'Kilograms to grams is x1000.',
    options: ['2,750 g', '275 g', '27,500 g', '2.75 g'],
    answerIndex: 0,
    visualLines: ['2.75 kg', 'x 1000 = ? g'],
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
    .replace(/Ã—/g, 'x')
    .replace(/Ã·/g, '/')
    .replace(/Â°/g, '°')
);

const resolveQuestion = (levelId: number): UnitMixerQuestion => {
  const question = getSatsInspiredChallengeQuestion('unit_mixer', levelId);
  if (!question) return fallbackQuestions[Math.floor(Math.random() * fallbackQuestions.length)];
  const visualLines = question.visual.type === 'equation'
    ? question.visual.lines.map(sanitizeText)
    : [sanitizeText(question.prompt)];
  const options = shuffle(question.options);
  const correct = question.options[question.answerIndex];
  return {
    kind: 'fluency',
    prompt: sanitizeText(question.prompt),
    sublabel: sanitizeText(question.sublabel),
    options,
    answerIndex: Math.max(0, options.indexOf(correct)),
    visualLines,
  };
};

const starsForRun = (correct: number, rounds: number, lives: number) => {
  const accuracy = rounds > 0 ? correct / rounds : 1;
  if (accuracy >= 0.9 && lives >= 2) return 3;
  if (accuracy >= 0.7) return 2;
  return 1;
};

const UnitMixerGame: React.FC<UnitMixerGameProps> = ({
  levelId,
  avatarId: _avatarId,
  useSharedTopHud = true,
  onVictory,
  onGameOver,
  onBack: _onBack,
  sessionState: _sessionState,
  sessionEvents,
}) => {
  const resolvedLevel = useMemo(() => Math.max(1, Math.min(8, levelId || 1)), [levelId]);
  const [roundIndex, setRoundIndex] = useState(0);
  const [question, setQuestion] = useState<UnitMixerQuestion>(() => resolveQuestion(resolvedLevel));
  const [lives, setLives] = useState(MAX_LIVES);
  const [score, setScore] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [feedbackTone, setFeedbackTone] = useState<FeedbackTone>('neutral');
  const [feedbackText, setFeedbackText] = useState('Convert the unit carefully before you answer.');
  const [locked, setLocked] = useState(false);
  const timersRef = useRef<number[]>([]);

  const clearTimers = () => {
    timersRef.current.forEach((timerId) => window.clearTimeout(timerId));
    timersRef.current = [];
  };

  useEffect(() => () => clearTimers(), []);

  useEffect(() => {
    clearTimers();
    setRoundIndex(0);
    setQuestion(resolveQuestion(resolvedLevel));
    setLives(MAX_LIVES);
    setScore(0);
    setCorrectCount(0);
    setSelectedIndex(null);
    setFeedbackTone('neutral');
    setFeedbackText('Convert the unit carefully before you answer.');
    setLocked(false);
  }, [resolvedLevel]);

  const advanceRound = useCallback((nextCorrectCount: number, nextScore: number, nextLives: number) => {
    if (roundIndex + 1 >= TOTAL_ROUNDS) {
      const stars = starsForRun(nextCorrectCount, TOTAL_ROUNDS, nextLives);
      confetti({
        particleCount: 90,
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
      setQuestion(resolveQuestion(resolvedLevel));
      setSelectedIndex(null);
      setFeedbackTone('neutral');
      setFeedbackText('Convert the unit carefully before you answer.');
      setLocked(false);
    }, 520);
    timersRef.current.push(timeoutId);
  }, [onVictory, roundIndex, resolvedLevel, sessionEvents]);

  const handleAnswer = (index: number) => {
    if (locked) return;
    setSelectedIndex(index);
    setLocked(true);

    if (index === question.answerIndex) {
      const gained = 140 + resolvedLevel * 12;
      const updatedScore = score + gained;
      const nextCorrect = correctCount + 1;
      setScore(updatedScore);
      setCorrectCount(nextCorrect);
      setFeedbackTone('success');
      setFeedbackText(`Correct. +${gained} XP`);
      triggerHaptic('success');
      sessionEvents?.onCorrectAnswer?.({ score: updatedScore, metadata: { prompt: question.prompt } });
      sessionEvents?.onPuzzleComplete?.({ score: updatedScore });
      advanceRound(nextCorrect, updatedScore, lives);
      return;
    }

    const nextLives = lives - 1;
    setLives(nextLives);
    setFeedbackTone('warning');
    setFeedbackText(`Not quite. Correct answer: ${question.options[question.answerIndex]}`);
    triggerHaptic('error');
    sessionEvents?.onIncorrectAnswer?.({
      score,
      metadata: { correctAnswer: question.options[question.answerIndex] },
    });

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
      setFeedbackText('Convert the unit carefully before you answer.');
      setLocked(false);
    }, 520);
    timersRef.current.push(timeoutId);
  };

  return (
    <GameScreenShell className="overflow-hidden">
      <GameplaySceneBackdrop gameType="unit_mixer" />

      <div className={`relative z-10 flex h-full min-h-0 w-full flex-1 flex-col px-3 pb-[calc(env(safe-area-inset-bottom)+2.1rem)] ${useSharedTopHud ? 'pt-[calc(env(safe-area-inset-top)+4.6rem)] md:pt-[calc(env(safe-area-inset-top)+4.9rem)]' : 'pt-[calc(env(safe-area-inset-top)+2.4rem)]'}`}>
        <PuzzleStage className="flex h-full min-h-0 flex-1 flex-col gap-2 md:gap-3">
          <StoryCard className="bg-white/8 text-white">
            <p className="text-sm font-semibold text-white/90 md:text-base">
              Keep the expedition supplies safe by converting each unit accurately.
            </p>
          </StoryCard>

          <TaskCard className="bg-black/25 text-slate-100">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-[10px] font-black uppercase tracking-[0.18em] text-amber-200/90">Unit Mixer</div>
                <div className="mt-1 text-base font-black text-white md:text-lg">{question.prompt}</div>
              </div>
              <div className="rounded-full bg-amber-200/25 px-3 py-1 text-[10px] font-black uppercase tracking-[0.12em] text-amber-100">
                Round {roundIndex + 1}/{TOTAL_ROUNDS}
              </div>
            </div>
            <div className="mt-2 text-[11px] font-semibold text-cyan-100/85 md:text-sm">{question.sublabel}</div>
          </TaskCard>

          <div className="flex min-h-0 flex-1 flex-col gap-2 md:gap-3">
            <div className="rounded-[1.2rem] border border-white/14 bg-white/10 p-3 text-center text-white shadow-[0_16px_30px_rgba(15,23,42,0.28)] md:p-4">
              <div className="text-[11px] font-black uppercase tracking-[0.16em] text-cyan-100/80">Conversion steps</div>
              <div className="mt-2 flex flex-col gap-1 text-[15px] font-black text-white md:text-xl">
                {question.visualLines.map((line, index) => (
                  <span key={`${question.prompt}-${index}`}>{line}</span>
                ))}
              </div>
            </div>

            <div className="grid flex-1 grid-cols-2 gap-2 md:gap-3">
              {question.options.map((option, index) => (
                <motion.button
                  key={`${question.prompt}-${option}`}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => handleAnswer(index)}
                  disabled={locked}
                  className={`flex min-h-[3.5rem] items-center justify-center rounded-[1.1rem] border text-base font-black shadow-[0_12px_20px_rgba(2,6,23,0.2)] transition md:min-h-[3.9rem] md:text-xl ${
                    selectedIndex === index
                      ? index === question.answerIndex
                        ? 'border-emerald-200/70 bg-emerald-300/50 text-emerald-950'
                        : 'border-rose-200/70 bg-rose-300/50 text-amber-950'
                      : 'border-white/40 bg-white/88 text-slate-900 hover:bg-white'
                  }`}
                >
                  {option}
                </motion.button>
              ))}
            </div>
          </div>

          <FeedbackStrip tone={feedbackTone}>
            {feedbackText}
          </FeedbackStrip>
        </PuzzleStage>
      </div>

      <motion.div
        className="pointer-events-none absolute top-4 right-4 text-xs font-black text-white/70"
        animate={{ opacity: lives <= 1 ? [0.65, 1, 0.65] : 0.6 }}
        transition={{ duration: 1.2, repeat: lives <= 1 ? Infinity : 0 }}
      >
        Lives: {lives}
      </motion.div>
    </GameScreenShell>
  );
};

export default UnitMixerGame;
