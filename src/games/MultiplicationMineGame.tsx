import React, { useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { MAIN_PNG_SKIN } from '../assets/reskin/mainPng';
import GameplaySceneBackdrop from '../components/GameplaySceneBackdrop';
import mineBackground from '../assets/maps/backgroundsforgames/multiplication mine background.jpg';
import rockAsset from '../assets/mine/18.png';
import { GameQuestionCard } from '../components/game-ui/GameUiKit';
import { triggerHaptic } from '../haptics';
import { buildPraiseMessage, shouldShowPraise } from '../utils/praiseFeedback';

interface MultiplicationMineGameProps {
  levelId: number;
  avatarId: string;
  useSharedTopHud?: boolean;
  isBoss?: boolean;
  onVictory: (stars: number, XP: number) => void;
  onGameOver: (XP: number) => void;
  onBack: () => void;
}

interface MultiplicationQuestion {
  kind: 'fluency' | 'reasoning';
  a: number;
  b: number;
  answer: number;
  options: number[];
}

type Phase = 'playing' | 'exploding' | 'treasure';

const ROCK_MAX_HEALTH = 4;

const makeOptions = (correct: number) => {
  const spread = Math.max(3, Math.round(correct * 0.18));
  const wrongs = new Set<number>();

  while (wrongs.size < 3) {
    const candidate = Math.max(0, correct + Math.floor(Math.random() * (spread * 2 + 1)) - spread);
    if (candidate !== correct) {
      wrongs.add(candidate);
    }
  }

  return [...wrongs, correct].sort(() => Math.random() - 0.5);
};

const makeQuestion = (level: number, solved: number): MultiplicationQuestion => {
  const progression = Math.min(12, 6 + level + Math.floor(solved / 2));
  const a = 2 + Math.floor(Math.random() * (progression - 1));
  const b = 2 + Math.floor(Math.random() * (progression - 1));
  const answer = a * b;
  return { kind: 'fluency', a, b, answer, options: makeOptions(answer) };
};

const starsForMistakes = (mistakes: number) => {
  if (mistakes <= 1) return 3;
  if (mistakes <= 3) return 2;
  return 1;
};

const MultiplicationMineGame: React.FC<MultiplicationMineGameProps> = ({
  levelId,
  avatarId: _avatarId,
  useSharedTopHud = false,
  isBoss: _isBoss = false,
  onVictory,
  onGameOver: _onGameOver,
  onBack,
}) => {
  const resolvedLevel = useMemo(() => Math.max(1, Math.min(10, levelId || 1)), [levelId]);
  const [question, setQuestion] = useState<MultiplicationQuestion>(() => makeQuestion(resolvedLevel, 0));
  const [rockHealth, setRockHealth] = useState(ROCK_MAX_HEALTH);
  const [correctCount, setCorrectCount] = useState(0);
  const [mistakes, setMistakes] = useState(0);
  const [XP, setScore] = useState(0);
  const [phase, setPhase] = useState<Phase>('playing');
  const [feedback, setFeedback] = useState<{ tone: 'ok' | 'error' | 'praise'; text: string } | null>(null);
  const [impactTick, setImpactTick] = useState(0);
  const [selectedChoice, setSelectedChoice] = useState<number | null>(null);
  const completedRef = useRef(false);
  const questionStartRef = useRef<number>(Date.now());
  const questionAttemptRef = useRef(0);

  const solveQuestion = (selectedAnswer: number) => {
    if (phase !== 'playing') return;
    setSelectedChoice(selectedAnswer);
    questionAttemptRef.current += 1;

    if (selectedAnswer === question.answer) {
      const nextCorrect = correctCount + 1;
      const nextHealth = Math.max(0, rockHealth - 1);
      const gained = 120 + (resolvedLevel * 18);
      const nextScore = XP + gained;
      const elapsedMs = Date.now() - questionStartRef.current;
      const isPraise = shouldShowPraise(questionAttemptRef.current, elapsedMs);

      setCorrectCount(nextCorrect);
      setRockHealth(nextHealth);
      setScore(nextScore);
      setImpactTick((prev) => prev + 1);
        setFeedback({
          tone: isPraise ? 'praise' : 'ok',
          text: isPraise
            ? buildPraiseMessage()
            : nextHealth <= 0
              ? 'Rock shattered! Numbers recovered!'
              : 'Rock cracked!',
        });
      triggerHaptic('success');

      if (nextHealth <= 0 && !completedRef.current) {
        completedRef.current = true;
        setPhase('exploding');
        window.setTimeout(() => setPhase('treasure'), 650);
        window.setTimeout(() => {
          const finalScore = nextScore + 500;
          const stars = starsForMistakes(mistakes);
          onVictory(stars, finalScore);
        }, 1250);
        return;
      }

      window.setTimeout(() => {
        setQuestion(makeQuestion(resolvedLevel, nextCorrect));
        setFeedback(null);
        setSelectedChoice(null);
        questionAttemptRef.current = 0;
        questionStartRef.current = Date.now();
      }, 320);
      return;
    }

    setMistakes((prev) => prev + 1);
    setFeedback({ tone: 'error', text: 'The rock is still sealed. Try again.' });
    setImpactTick((prev) => prev + 1);
    triggerHaptic('error');
    window.setTimeout(() => {
      setFeedback(null);
      setSelectedChoice(null);
    }, 700);
  };

  return (
    <div className="relative h-full w-full overflow-hidden text-white">
      <GameplaySceneBackdrop gameType="calculation_clash" backgroundOverride={mineBackground} />
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(8,15,32,0.14),rgba(3,7,18,0.34))]" />

      <div className={`relative z-20 flex h-full w-full flex-col items-center px-4 pb-[calc(env(safe-area-inset-bottom)+1rem)] ${useSharedTopHud ? 'pt-[calc(env(safe-area-inset-top)+3.2rem)]' : 'pt-[calc(env(safe-area-inset-top)+4.2rem)]'}`}>
        <div className="w-full max-w-[760px]">
            <GameQuestionCard
              title="Multiplication Mine"
              subtitle="The Monster Minds locked the numbers in rock. Solve the multiplication to break it open."
              className="mx-auto w-full"
              bodyClassName="text-[clamp(1.7rem,6vw,3rem)] font-black tracking-wide text-white"
            >
            {question.a} x {question.b} = ?
          </GameQuestionCard>
        </div>

        <div className="mt-4 w-full max-w-[520px]">
          <div className="answer-choice-surface grid grid-cols-2 gap-2.5">
            {question.options.map((option) => (
              <motion.button
                key={`${question.a}x${question.b}-${option}`}
                type="button"
                onClick={() => solveQuestion(option)}
                disabled={phase !== 'playing'}
                whileTap={{ scale: 0.96, y: 2 }}
                animate={selectedChoice === option ? (feedback?.tone === 'ok' || feedback?.tone === 'praise' ? { scale: [1, 1.12, 0.98, 1.05, 1], rotate: [0, -2, 2, 0] } : { scale: [1, 1.05, 1] }) : { scale: 1 }}
                className={`h-16 rounded-2xl border px-3 text-center text-[clamp(1.35rem,5vw,2.1rem)] font-black shadow-[0_8px_16px_rgba(0,0,0,0.35)] transition ${
                  selectedChoice === option
                    ? feedback?.tone === 'ok' || feedback?.tone === 'praise'
                      ? 'ui-button-success'
                      : 'ui-button-primary'
                    : 'ui-button-secondary'
                } disabled:opacity-60`}
              >
                {option}
              </motion.button>
            ))}
          </div>
        </div>

        <div className="relative mt-5 flex flex-1 w-full items-center justify-center">
          <AnimatePresence mode="wait">
            {phase !== 'treasure' ? (
              <motion.div
                key="rock"
                animate={{
                  scale: phase === 'exploding' ? [1, 1.1, 0.9, 0] : [1, 1.02, 1],
                  rotate: phase === 'exploding' ? [0, -7, 7, 0] : 0,
                  x: phase === 'playing' && (feedback?.tone === 'ok' || feedback?.tone === 'praise') ? [0, -6, 6, -3, 3, 0] : 0,
                }}
                transition={{
                  duration: phase === 'exploding' ? 0.58 : 0.7,
                  repeat: phase === 'playing' ? Infinity : 0,
                  repeatDelay: 1.2,
                }}
                className="relative h-[240px] w-[240px] overflow-hidden bg-transparent"
              >
                <img
                  src={rockAsset}
                  alt="Multiplication Mine rock"
                  draggable={false}
                  className={`absolute inset-0 h-full w-full object-contain object-center drop-shadow-[0_18px_28px_rgba(0,0,0,0.28)] ${
                    feedback?.tone === 'praise' ? 'animate-pulse saturate-125' : ''
                  }`}
                />

                <div className="absolute -bottom-10 left-1/2 flex -translate-x-1/2 gap-2">
                  {Array.from({ length: ROCK_MAX_HEALTH }).map((_, idx) => (
                    <span
                      key={`rock-hp-${idx}`}
                      className={`h-3 w-7 rounded-full border ${
                        idx < rockHealth
                          ? 'border-[#ffd36e] bg-gradient-to-b from-[#ffe79a] to-[#f8b937]'
                          : 'border-white/20 bg-white/10'
                      }`}
                    />
                  ))}
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="treasure"
                initial={{ scale: 0.5, opacity: 0, y: 30 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                className="relative flex flex-col items-center"
              >
                <motion.div
                  animate={{ opacity: [0.45, 0.9, 0.45], scale: [0.9, 1.08, 0.9] }}
                  transition={{ duration: 1.15, repeat: Infinity }}
                  className="absolute h-[230px] w-[230px] rounded-full bg-yellow-300/35 blur-3xl"
                />
                <img
                  src={MAIN_PNG_SKIN.treasureChest}
                  alt="Treasure chest"
                  className="relative z-10 w-[230px] max-w-[65vw] object-contain drop-shadow-[0_18px_24px_rgba(0,0,0,0.65)]"
                  draggable={false}
                />
                  <p className="relative z-10 mt-3 text-xl font-black uppercase tracking-[0.1em] text-[#ffe590]">
                    Mine Cleared
                  </p>
              </motion.div>
            )}
          </AnimatePresence>

          <AnimatePresence>
            {phase === 'exploding' && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="pointer-events-none absolute inset-0"
              >
                {Array.from({ length: 18 }).map((_, idx) => {
                  const angle = (idx / 18) * Math.PI * 2;
                  const dx = Math.cos(angle) * (120 + (idx % 3) * 26);
                  const dy = Math.sin(angle) * (120 + (idx % 4) * 18);
                  return (
                    <motion.span
                      key={`spark-${idx}`}
                      initial={{ x: 0, y: 0, scale: 1, opacity: 1 }}
                      animate={{ x: dx, y: dy, scale: 0.2, opacity: 0 }}
                      transition={{ duration: 0.6, ease: 'easeOut' }}
                      className="absolute left-1/2 top-1/2 h-3 w-3 rounded-full bg-yellow-300 shadow-[0_0_12px_rgba(255,230,120,0.9)]"
                    />
                  );
                })}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <AnimatePresence mode="wait">
          {feedback ? (
            <motion.div
              key={`feedback-${impactTick}`}
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.95 }}
              className={`mb-1 rounded-full border px-4 py-2 text-xs font-black uppercase tracking-[0.11em] ${
                feedback.tone === 'ok'
                  ? 'border-emerald-300/60 bg-emerald-300/15 text-emerald-100'
                  : feedback.tone === 'praise'
                    ? 'border-amber-100/65 bg-[linear-gradient(135deg,rgba(255,241,166,0.96),rgba(125,211,252,0.9))] text-slate-950 shadow-[0_0_22px_rgba(251,191,36,0.55)]'
                    : 'border-rose-300/60 bg-rose-300/15 text-amber-100'
              }`}
            >
              {feedback.text}
            </motion.div>
          ) : (
            <div className="mb-1 h-9" />
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default MultiplicationMineGame;
