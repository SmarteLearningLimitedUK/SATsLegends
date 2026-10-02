import React, { useEffect, useMemo, useRef, useState } from 'react';
import confetti from 'canvas-confetti';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import PracticeIntroPopup from '../components/game-ui/PracticeIntroPopup';
import { GameQuestionCard } from '../components/game-ui/GameUiKit';
import {
  FeedbackStrip,
  GameUiShell,
} from '../components/game-ui/GameUiKit';
import GameplaySceneBackdrop from '../components/GameplaySceneBackdrop';
import { MiniGameShellContractProps } from '../app/gameplaySessionContract';
import problemPyramidBackground from '../assets/maps/premium/problem-pyramid.webp';
import { triggerHaptic } from '../haptics';

interface ProblemPyramidGameProps extends MiniGameShellContractProps {
  levelId: number;
  avatarId: string;
  useSharedTopHud?: boolean;
  isBoss?: boolean;
  onVictory: (stars: number, XP: number) => void;
  onGameOver: (XP: number) => void;
  onBack: () => void;
}

interface PyramidRound {
  id: string;
  base: [number, number, number];
  middle: [number, number];
  top: number;
  middleOptions: [number[], number[]];
  options: number[];
}

const ROUNDS_TO_WIN = 6;
const BASE_XP = 140;

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

const shuffle = <T,>(items: T[]) => {
  const next = [...items];
  for (let i = next.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [next[i], next[j]] = [next[j], next[i]];
  }
  return next;
};

const makeChoices = (answer: number, spread: number) => {
  const choices = new Set<number>([answer]);
  for (const offset of shuffle([-spread, -3, -2, -1, 1, 2, 3, spread])) {
    if (choices.size >= 4) break;
    if (answer + offset > 0) choices.add(answer + offset);
  }
  for (let next = 1; choices.size < 4; next++) choices.add(answer + next + spread);
  return shuffle([...choices]);
};

const buildRound = (level: number, round: number): PyramidRound => {
  const tier = Math.max(1, Math.min(5, level));
  const min = [1, 2, 3, 4, 6][tier - 1];
  const max = [4, 8, 12, 18, 30][tier - 1];
  const base: [number, number, number] = [
    clamp(min + Math.floor(Math.random() * (max - min + 1)), min, max),
    clamp(min + Math.floor(Math.random() * (max - min + 1)), min, max),
    clamp(min + Math.floor(Math.random() * (max - min + 1)), min, max),
  ];
  const middle: [number, number] = [base[0] + base[1], base[1] + base[2]];
  const top = middle[0] + middle[1];

  const jitter = level <= 3 ? 6 : 10;

  return {
    id: `pyr-${round}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    base,
    middle,
    top,
    middleOptions: [makeChoices(middle[0], jitter), makeChoices(middle[1], jitter)],
    options: makeChoices(top, jitter),
  };
};

const starsForAccuracy = (correct: number, attempts: number) => {
  if (attempts === 0) return 0;
  const accuracy = correct / attempts;
  if (accuracy >= 0.9) return 3;
  if (accuracy >= 0.7) return 2;
  return 1;
};

const ProblemPyramidGame: React.FC<ProblemPyramidGameProps> = ({
  levelId,
  isPractice,
  practiceBriefing,
  onVictory,
  onGameOver: _onGameOver,
}) => {
  const reducedMotion = useReducedMotion();
  const [roundIndex, setRoundIndex] = useState(0);
  const [attempts, setAttempts] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [stage, setStage] = useState<0 | 1 | 2>(0);
  const [middleStones, setMiddleStones] = useState<[number | null, number | null]>([null, null]);
  const [topStone, setTopStone] = useState<number | null>(null);
  const [selected, setSelected] = useState<number | null>(null);
  const [locked, setLocked] = useState(false);
  const [glow, setGlow] = useState(false);
  const [feedback, setFeedback] = useState('');
  const [feedbackTone, setFeedbackTone] = useState<'neutral' | 'good' | 'bad'>('neutral');
  const [showPracticeIntro, setShowPracticeIntro] = useState(Boolean(isPractice));
  const timersRef = useRef<number[]>([]);

  useEffect(() => () => timersRef.current.forEach(window.clearTimeout), []);

  useEffect(() => {
    setShowPracticeIntro(Boolean(isPractice));
  }, [isPractice]);

  const round = useMemo(() => buildRound(levelId, roundIndex + 1), [levelId, roundIndex]);
  const stageAnswer = stage === 2 ? round.top : round.middle[stage];
  const stageOptions = stage === 2 ? round.options : round.middleOptions[stage];
  const stageLabel = stage === 0 ? 'Build the left middle stone' : stage === 1 ? 'Build the right middle stone' : 'Crown the pyramid';

  const handleAnswer = (option: number) => {
    if (locked) return;
    setSelected(option);
    setAttempts((prev) => prev + 1);

    if (option === stageAnswer) {
      triggerHaptic('success');
      if (stage < 2) {
        setMiddleStones(previous => stage === 0 ? [option, previous[1]] : [previous[0], option]);
        setFeedback(stage === 0 ? 'Left stone restored. Build the right side.' : 'Both middle stones are ready. Crown the pyramid.');
        setFeedbackTone('good');
        setStage(previous => (previous + 1) as 0 | 1 | 2);
        setSelected(null);
        return;
      }
      setTopStone(option);
      setCorrectCount((prev) => prev + 1);
      setFeedback('Brilliant! Pyramid locked in.');
      setFeedbackTone('good');
      setLocked(true);
      setGlow(true);
      confetti({
        disableForReducedMotion: true,
        particleCount: 40,
        spread: 55,
        origin: { y: 0.62 },
        colors: ['#facc15', '#60a5fa', '#34d399'],
      });
      const timer = window.setTimeout(() => {
        const nextRound = roundIndex + 1;
        if (nextRound >= ROUNDS_TO_WIN) {
          const xp = BASE_XP * ROUNDS_TO_WIN + levelId * 40;
          onVictory(starsForAccuracy((correctCount + 1) * 3, attempts + 1), xp);
          return;
        }
        setRoundIndex(nextRound);
        setStage(0);
        setMiddleStones([null, null]);
        setTopStone(null);
        setSelected(null);
        setLocked(false);
        setGlow(false);
        setFeedback('');
        setFeedbackTone('neutral');
      }, 750);
      timersRef.current.push(timer);
      return;
    }

    triggerHaptic('error');
    setFeedback('That stone does not fit. Add the two stones directly below it.');
    setFeedbackTone('bad');
    setLocked(true);
    const timer = window.setTimeout(() => {
      setLocked(false);
      setSelected(null);
      setFeedback(`Try again: ${stageLabel.toLowerCase()}.`);
      setFeedbackTone('neutral');
    }, 650);
    timersRef.current.push(timer);
  };

  const blockClass = (isTop?: boolean) => (
    `flex h-[3.6rem] w-[4.8rem] items-center justify-center rounded-[0.95rem] border text-[1.2rem] font-black shadow-[0_10px_18px_rgba(2,6,23,0.25)] md:h-[4.2rem] md:w-[5.4rem] md:text-[1.5rem] ${
      glow
        ? 'border-emerald-200/80 bg-emerald-300/35 text-emerald-950 shadow-[0_0_18px_rgba(16,185,129,0.55)]'
        : isTop
          ? 'border-cyan-100/28 bg-[linear-gradient(180deg,rgba(15,23,42,0.95),rgba(30,41,59,0.88))] text-white shadow-[0_12px_24px_rgba(2,6,23,0.35)]'
          : 'border-white/18 bg-[linear-gradient(180deg,rgba(9,17,32,0.94),rgba(20,28,45,0.88))] text-white shadow-[0_12px_24px_rgba(2,6,23,0.35)]'
    }`
  );

  return (
    <GameUiShell className="bg-transparent" overlayDisabled>
      <GameplaySceneBackdrop gameType="rule_runner" backgroundOverride={problemPyramidBackground} />
      <PracticeIntroPopup
        open={showPracticeIntro}
        title="Problem Pyramid"
        body="The Monster Minds have scrambled the pyramid stones.\nChoose the value that restores the missing top block.\nWork up layer by layer from the bottom."
        briefing={practiceBriefing}
        onAction={() => setShowPracticeIntro(false)}
      />
      <div className="relative z-10 flex h-full min-h-0 flex-col gap-1.5 px-3 pb-[calc(env(safe-area-inset-bottom)+2.8rem)] pt-2 text-white"
        style={{ height: '80%', flex: '0 0 auto' }}>
        <section className="shrink-0">
          <div className="pointer-events-none fixed left-0 right-0 z-[60]" style={{ top: '4px' }}>
            <GameQuestionCard title="Problem Pyramid">
              Add neighbouring stones to rebuild the pyramid, then find the top.
            </GameQuestionCard>
          </div>
        </section>

        <section className="mt-[clamp(5.25rem,13vh,7rem)] min-h-0 flex-1">
          <div className="relative flex h-full min-h-0 items-center justify-center">
            <div className="relative h-full w-full max-w-[760px]">
              <motion.div
                animate={!reducedMotion && glow ? { scale: [1, 1.03, 1] } : { scale: 1 }}
                transition={{ duration: 0.6, ease: 'easeInOut' }}
                className="absolute inset-0"
              >
                <div className={`absolute left-1/2 top-[17.5%] -translate-x-1/2 ${blockClass(true)}`}>
                  <AnimatePresence mode="wait"><motion.span key={topStone ?? 'empty'} initial={reducedMotion ? false : { y: 10, opacity: 0 }} animate={{ y: 0, opacity: 1 }}>{topStone ?? '?'}</motion.span></AnimatePresence>
                </div>
                <div className={`absolute left-[38.5%] top-[44%] -translate-x-1/2 ${blockClass()}`}>
                  <AnimatePresence mode="wait"><motion.span key={middleStones[0] ?? 'empty'} initial={reducedMotion ? false : { y: 10, opacity: 0 }} animate={{ y: 0, opacity: 1 }}>{middleStones[0] ?? '?'}</motion.span></AnimatePresence>
                </div>
                <div className={`absolute left-[61.5%] top-[44%] -translate-x-1/2 ${blockClass()}`}>
                  <AnimatePresence mode="wait"><motion.span key={middleStones[1] ?? 'empty'} initial={reducedMotion ? false : { y: 10, opacity: 0 }} animate={{ y: 0, opacity: 1 }}>{middleStones[1] ?? '?'}</motion.span></AnimatePresence>
                </div>
                <div data-pyramid-base-index="0" className={`absolute left-[27%] top-[70%] -translate-x-1/2 ${blockClass()}`}>
                  {round.base[0]}
                </div>
                <div data-pyramid-base-index="1" className={`absolute left-1/2 top-[70%] -translate-x-1/2 ${blockClass()}`}>
                  {round.base[1]}
                </div>
                <div data-pyramid-base-index="2" className={`absolute left-[73%] top-[70%] -translate-x-1/2 ${blockClass()}`}>
                  {round.base[2]}
                </div>
              </motion.div>
            </div>
          </div>
        </section>

        <section className="shrink-0">
          <p className="mb-2 text-center text-sm font-black text-amber-100" role="status" data-pyramid-stage={stage}>{stageLabel} · step {stage + 1} of 3</p>
          <div className="answer-choice-surface grid grid-cols-4 gap-2">
            {stageOptions.map((option) => (
              <motion.button
                key={`${round.id}-${stage}-${option}`}
                type="button" data-pyramid-choice={option}
                whileTap={reducedMotion ? undefined : { scale: 0.96 }}
                onClick={() => handleAnswer(option)}
                disabled={locked}
                className={`flex min-h-[2.6rem] items-center justify-center rounded-[0.95rem] text-[0.98rem] font-black ${
                  selected === option
                    ? option === stageAnswer
                      ? 'ui-button-success'
                      : 'ui-button-primary'
                    : 'ui-button-secondary'
                }`}
              >
                {option}
              </motion.button>
            ))}
          </div>
        </section>

        {feedback ? (
          <section className="shrink-0">
            <FeedbackStrip tone={feedbackTone === 'good' ? 'success' : feedbackTone === 'bad' ? 'warning' : 'neutral'}>
              {feedback}
            </FeedbackStrip>
          </section>
        ) : null}
      </div>
    </GameUiShell>
  );
};

export default ProblemPyramidGame;
