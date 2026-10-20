import React, { useEffect, useMemo, useRef, useState } from 'react';
import confetti from 'canvas-confetti';
import { motion, useReducedMotion } from 'motion/react';
import PracticeIntroPopup from '../components/game-ui/PracticeIntroPopup';
import { GameQuestionCard } from '../components/game-ui/GameUiKit';
import {
  FeedbackStrip,
  GameUiShell,
} from '../components/game-ui/GameUiKit';
import GameplaySceneBackdrop from '../components/GameplaySceneBackdrop';
import { emitMiniGameSessionEvent, MiniGameShellContractProps } from '../app/gameplaySessionContract';
import problemPyramidBackground from '../assets/maps/premium/problem-pyramid.webp';
import pyramidTablets from '../assets/game-visions/instruments/pyramid-tablets-v1.png';
import './problem-pyramid.css';

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

const buildRound = (level: number, round: number, isPractice = false): PyramidRound => {
  const tier = Math.max(1, Math.min(5, level));
  const min = isPractice ? 1 : [12, 25, 50, 100, 200][tier - 1];
  const max = isPractice ? 4 : [39, 75, 150, 350, 999][tier - 1];
  const base: [number, number, number] = [
    clamp(min + Math.floor(Math.random() * (max - min + 1)), min, max),
    clamp(min + Math.floor(Math.random() * (max - min + 1)), min, max),
    clamp(min + Math.floor(Math.random() * (max - min + 1)), min, max),
  ];
  const middle: [number, number] = [base[0] + base[1], base[1] + base[2]];
  const top = middle[0] + middle[1];

  const candidates = [
    top - 10, top + 10, top - 1, top + 1,
    base[0] + base[1] + base[2],
    middle[0], middle[1], top - 2, top + 2,
  ];
  const distractors = shuffle([...new Set(candidates.filter(value => value > 0 && value !== top))]).slice(0, 3);

  return {
    id: `pyr-${round}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    base,
    middle,
    top,
    options: shuffle([top, ...distractors]),
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
  sessionEvents,
}) => {
  const reducedMotion = useReducedMotion();
  const [roundIndex, setRoundIndex] = useState(0);
  const [attempts, setAttempts] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [locked, setLocked] = useState(false);
  const [glow, setGlow] = useState(false);
  const [feedback, setFeedback] = useState('');
  const [feedbackTone, setFeedbackTone] = useState<'neutral' | 'good' | 'bad'>('neutral');
  const [showPracticeIntro, setShowPracticeIntro] = useState(Boolean(isPractice));
  const answerPendingRef = useRef(false);

  useEffect(() => {
    setShowPracticeIntro(Boolean(isPractice));
  }, [isPractice]);

  const round = useMemo(() => buildRound(levelId, roundIndex + 1, Boolean(isPractice)), [levelId, roundIndex, isPractice]);

  const handleAnswer = (option: number) => {
    if (locked || answerPendingRef.current) return;
    answerPendingRef.current = true;
    setSelected(option);
    setAttempts((prev) => prev + 1);
    emitMiniGameSessionEvent(sessionEvents, option === round.top ? 'correct_answer' : 'incorrect_answer', {
      metadata: { questionId: round.id, selected: option, target: round.top, roundIndex },
    });

    if (option === round.top) {
      setCorrectCount((prev) => prev + 1);
      setFeedback('Brilliant! Pyramid locked in.');
      setFeedbackTone('good');
      setLocked(true);
      setGlow(true);
      confetti({
        particleCount: 40,
        spread: 55,
        origin: { y: 0.62 },
        colors: ['#facc15', '#60a5fa', '#34d399'],
      });
      window.setTimeout(() => {
        const nextRound = roundIndex + 1;
        if (nextRound >= ROUNDS_TO_WIN) {
          const xp = BASE_XP * ROUNDS_TO_WIN + levelId * 40;
          onVictory(starsForAccuracy(correctCount + 1, attempts + 1), xp);
          return;
        }
        setRoundIndex(nextRound);
        setSelected(null);
        setLocked(false);
        setGlow(false);
        setFeedback('');
        setFeedbackTone('neutral');
        answerPendingRef.current = false;
      }, 750);
      return;
    }

    setFeedback(`The top is ${round.middle[0]} + ${round.middle[1]}. Add those two middle stones and try again.`);
    setFeedbackTone('bad');
    setLocked(true);
    window.setTimeout(() => {
      setLocked(false);
      setSelected(null);
      setFeedback('');
      setFeedbackTone('neutral');
      answerPendingRef.current = false;
    }, 1600);
  };

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
      <div className="pyramid-composition relative z-10 flex h-full min-h-0 flex-col gap-1.5 px-3 pb-[calc(env(safe-area-inset-bottom)+2.8rem)] pt-2 text-white">
        <section className="shrink-0">
          <div className="pointer-events-none fixed left-0 right-0 z-[60]" style={{ top: '4px' }}>
            <GameQuestionCard title="Problem Pyramid">
              Find the missing top number to restore the pyramid.
            </GameQuestionCard>
          </div>
        </section>

        <section className="pyramid-playfield min-h-0 flex-1">
          <motion.svg viewBox="0 0 1536 1024" className="pyramid-puzzle" data-pyramid-puzzle data-pyramid-round={roundIndex}
            role="img" aria-label={`Number pyramid. Bottom: ${round.base.join(', ')}. Middle: ${round.middle.join(', ')}. Find the missing top number.`}
            animate={!reducedMotion && glow ? { scale: [1, 1.02, 1] } : { scale: 1 }}
            transition={{ duration: reducedMotion ? 0 : .6, ease: 'easeInOut' }}>
            <image href={pyramidTablets} width="1536" height="1024" aria-hidden="true" />
            {[
              { x: 768, y: 264, value: glow ? round.top : '?', row: 'top' },
              { x: 548, y: 514, value: round.middle[0], row: 'middle' },
              { x: 986, y: 514, value: round.middle[1], row: 'middle' },
              { x: 334, y: 770, value: round.base[0], row: 'base' },
              { x: 768, y: 770, value: round.base[1], row: 'base' },
              { x: 1200, y: 770, value: round.base[2], row: 'base' },
            ].map(({x,y,value,row},index) => <text key={index} x={x} y={y} textAnchor="middle" dominantBaseline="central"
              data-pyramid-value={row} className={`pyramid-tablet-value${glow ? ' is-restored' : ''}`}>{value}</text>)}
          </motion.svg>
        </section>

        <section className="shrink-0">
          <div className="answer-choice-surface grid grid-cols-4 gap-2">
            {round.options.map((option) => (
              <motion.button
                key={option}
                whileTap={{ scale: 0.96 }}
                onClick={() => handleAnswer(option)}
                disabled={locked}
                className={`flex min-h-[2.6rem] items-center justify-center rounded-[0.95rem] text-[0.98rem] font-black ${
                  selected === option
                    ? option === round.top
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
