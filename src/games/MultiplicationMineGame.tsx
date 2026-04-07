import React, { useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { MAIN_PNG_SKIN } from '../assets/reskin/mainPng';
import rockSprite from '../assets/rocksprite.png';
import GameplaySceneBackdrop from '../components/GameplaySceneBackdrop';
import MiniGameTopBar from '../components/MiniGameTopBar';
import { triggerHaptic } from '../haptics';

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

const ROCK_MAX_HEALTH = 5;
const ROCK_SPRITE_GRID = { columns: 3, rows: 3 } as const;
const ROCK_SPRITE_FRAMES = 9;
const ROCK_DAMAGE_SEQUENCE = [0, 1, 4, 7, 8, 8] as const;

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
  const [feedback, setFeedback] = useState<{ tone: 'ok' | 'error'; text: string } | null>(null);
  const [impactTick, setImpactTick] = useState(0);
  const [selectedChoice, setSelectedChoice] = useState<number | null>(null);
  const completedRef = useRef(false);

  const rockFrameIndex = useMemo(() => {
    const damage = ROCK_MAX_HEALTH - rockHealth;
    const clampedDamage = Math.max(0, Math.min(ROCK_MAX_HEALTH, damage));
    const sequenceFrame = ROCK_DAMAGE_SEQUENCE[clampedDamage] ?? ROCK_SPRITE_FRAMES - 1;
    return phase === 'exploding' ? ROCK_SPRITE_FRAMES - 1 : sequenceFrame;
  }, [phase, rockHealth]);

  const rockFramePosition = useMemo(() => {
    const column = rockFrameIndex % ROCK_SPRITE_GRID.columns;
    const row = Math.floor(rockFrameIndex / ROCK_SPRITE_GRID.columns);
    return {
      x: -column * 100,
      y: -row * 100,
    };
  }, [rockFrameIndex]);

  const solveQuestion = (selectedAnswer: number) => {
    if (phase !== 'playing') return;
    setSelectedChoice(selectedAnswer);

    if (selectedAnswer === question.answer) {
      const nextCorrect = correctCount + 1;
      const nextHealth = Math.max(0, rockHealth - 1);
      const gained = 120 + (resolvedLevel * 18);
      const nextScore = XP + gained;

      setCorrectCount(nextCorrect);
      setRockHealth(nextHealth);
      setScore(nextScore);
      setImpactTick((prev) => prev + 1);
      setFeedback({
        tone: 'ok',
        text: nextHealth <= 0 ? 'Rock shattered!' : 'Direct hit!',
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
      }, 320);
      return;
    }

    setMistakes((prev) => prev + 1);
    setFeedback({ tone: 'error', text: 'Not quite. Try again.' });
    setImpactTick((prev) => prev + 1);
    triggerHaptic('error');
    window.setTimeout(() => {
      setFeedback(null);
      setSelectedChoice(null);
    }, 700);
  };

  return (
    <div className="relative h-full w-full overflow-hidden text-white">
      <GameplaySceneBackdrop gameType="calculation_clash" className="opacity-[0.97]" />
      <div className="absolute inset-0 bg-gradient-to-b from-[#06132ad4] via-[#081733cf] to-[#030816ec]" />

      {!useSharedTopHud ? (
        <MiniGameTopBar
          onBack={onBack}
          XP={XP}
          scoreLabel="XP"
          metaLabel="Rock"
          metaValue={`${rockHealth}/${ROCK_MAX_HEALTH}`}
        />
      ) : null}

      <div className={`relative z-20 flex h-full w-full flex-col items-center px-4 pb-[calc(env(safe-area-inset-bottom)+1rem)] ${useSharedTopHud ? 'pt-[calc(env(safe-area-inset-top)+3.2rem)]' : 'pt-[calc(env(safe-area-inset-top)+4.2rem)]'}`}>
        <div className="w-full max-w-[760px] rounded-[1.2rem] border border-[#89c8ff66] bg-[#0c2a5dd6] px-4 py-3 text-center shadow-[0_12px_30px_rgba(0,0,0,0.5)]">
          <p className="text-[clamp(0.95rem,2.8vw,1.45rem)] font-black uppercase tracking-[0.07em] text-[#ffefb1]">
            Complete multiplication answers to break the rock
          </p>
        </div>

        <div className="mt-4 rounded-2xl border border-white/20 bg-[#102f62d1] px-6 py-4 shadow-[0_10px_24px_rgba(0,0,0,0.45)]">
          <p className="text-[clamp(1.7rem,6vw,3rem)] font-black tracking-wide text-white">
            {question.a} x {question.b} = ?
          </p>
        </div>

        <div className="mt-4 w-full max-w-[520px]">
          <div className="grid grid-cols-2 gap-2.5">
            {question.options.map((option) => (
              <motion.button
                key={`${question.prompt}-${option}`}
                type="button"
                onClick={() => solveQuestion(option)}
                disabled={phase !== 'playing'}
                whileTap={{ scale: 0.96, y: 2 }}
                animate={selectedChoice === option ? { scale: [1, 1.05, 1] } : { scale: 1 }}
                className={`h-16 rounded-2xl border px-3 text-center text-[clamp(1.35rem,5vw,2.1rem)] font-black shadow-[0_8px_16px_rgba(0,0,0,0.35)] transition ${
                  selectedChoice === option
                    ? 'border-[#ffe08a] bg-gradient-to-b from-[#ffe082] to-[#f5a524] text-[#3e2700]'
                    : 'border-[#95d3ff88] bg-[#0b254ecc] text-white hover:bg-[#103468]'
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
                  x: phase === 'playing' && feedback?.tone === 'ok' ? [0, -6, 6, -3, 3, 0] : 0,
                }}
                transition={{
                  duration: phase === 'exploding' ? 0.58 : 0.7,
                  repeat: phase === 'playing' ? Infinity : 0,
                  repeatDelay: 1.2,
                }}
                className="relative h-[240px] w-[240px] overflow-hidden bg-transparent shadow-[0_30px_55px_rgba(0,0,0,0.6)]"
              >
                <div
                  className="absolute inset-0 bg-transparent"
                  style={{
                    backgroundImage: `url(${rockSprite})`,
                    backgroundSize: `${ROCK_SPRITE_GRID.columns * 100}% ${ROCK_SPRITE_GRID.rows * 100}%`,
                    backgroundPosition: `${rockFramePosition.x}% ${rockFramePosition.y}%`,
                    backgroundRepeat: 'no-repeat',
                  }}
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
                  Treasure Unlocked
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
