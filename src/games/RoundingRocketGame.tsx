import React, { useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'motion/react';
import {
  emitMiniGameSessionEvent,
  MiniGameShellContractProps,
} from '../app/gameplaySessionContract';
import { GameQuestionCard } from '../components/game-ui/GameUiKit';
import { ReferenceArt } from '../components/game-ui/ReferenceScreenArt';
import PracticeIntroPopup from '../components/game-ui/PracticeIntroPopup';
import RoundingRocketScene, { ROCKET_PART_NAMES } from './RoundingRocketScene';
import { GAME_HUD_CINEMATIC_EVENT } from '../gameHudEvents';
import { playGameSound } from '../audio/gameAudio';

interface RoundingRocketGameProps {
  levelId: number;
  avatarId: string;
  useSharedTopHud?: boolean;
  onVictory: (stars: number, XP: number) => void;
  onGameOver: (XP: number) => void;
  onBack: () => void;
}

type RoundingRocketGameShellProps = RoundingRocketGameProps & MiniGameShellContractProps;

type RoundTarget = 10 | 100 | 1000;

type RocketState =
  | 'idle'
  | 'arming'
  | 'launching'
  | 'failed';

interface RocketRound {
  id: number;
  value: number;
  target: RoundTarget;
  correctAnswer: number;
  pads: [number, number, number];
}

const CORRECT_RESET_MS = 850;
const FAILED_RESET_MS = 1600;

const randomInt = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;

const shuffle = <T,>(items: T[]): T[] => {
  const next = [...items];
  for (let index = next.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [next[index], next[swapIndex]] = [next[swapIndex], next[index]];
  }
  return next;
};

const scoreToStars = (XP: number, correct: number, attempts: number) => {
  const accuracy = attempts > 0 ? correct / attempts : 0;
  if (accuracy >= 0.86) return 3;
  if (accuracy >= 0.65) return 2;
  return 1;
};

const targetForLevel = (levelId: number): RoundTarget => {
  return levelId <= 2 ? 10 : levelId <= 4 ? 100 : 1000;
};

const createFuelNumber = (target: RoundTarget, difficultyLevel: number) => {
  const tier = Math.max(1, Math.min(5, difficultyLevel));
  const upper = [99, 499, 999, 4999, 9999][tier - 1];
  const lower = target === 10 ? 12 : target + 20;
  let value = randomInt(lower, upper);
  while (value % target === 0) value = randomInt(lower, upper);
  return value;
};

const buildPadOptions = (value: number, target: RoundTarget, correctAnswer: number): [number, number, number] => {
  const remainder = value % target;
  const wrongDirection = remainder >= target / 2 ? correctAnswer - target : correctAnswer + target;

  const candidatePool = [
    wrongDirection,
    correctAnswer - target,
    correctAnswer + target,
    correctAnswer - (target * 2),
    correctAnswer + (target * 2),
    correctAnswer + (target * 3),
  ].filter((candidate) => candidate >= 0 && candidate !== correctAnswer);

  const uniquePool = Array.from(new Set(candidatePool));
  const selected = shuffle(uniquePool).slice(0, 2);

  while (selected.length < 2) {
    const fallback = Math.max(0, correctAnswer + (target * (selected.length + 1)));
    if (!selected.includes(fallback) && fallback !== correctAnswer) selected.push(fallback);
    else selected.push(Math.max(0, correctAnswer - (target * (selected.length + 2))));
  }

  return shuffle([correctAnswer, selected[0], selected[1]]) as [number, number, number];
};

const generateRound = (levelId: number, magnitudeLevel: number): RocketRound => {
  const target = targetForLevel(levelId);
  const value = createFuelNumber(target, magnitudeLevel);
  const correctAnswer = Math.round(value / target) * target;
  const pads = buildPadOptions(value, target, correctAnswer);

  return {
    id: Date.now() + Math.floor(Math.random() * 1000),
    value,
    target,
    correctAnswer,
    pads,
  };
};

const RoundingRocketGame: React.FC<RoundingRocketGameShellProps> = ({
  levelId, avatarId: _avatarId, useSharedTopHud: _useSharedTopHud = false,
  onVictory, onGameOver: _onGameOver, onBack: _onBack,
  sessionState, sessionEvents, isPractice, practiceBriefing,
}) => {
  const [round, setRound] = useState<RocketRound>(() => generateRound(Math.max(1, levelId), Math.max(1, levelId)));
  const [rocketState, setRocketState] = useState<RocketState>('idle');
  const [selectedPad, setSelectedPad] = useState<number | null>(null);
  const [feedbackText, setFeedbackText] = useState<string | null>(null);
  const [XP, setScore] = useState(0);
  const [attempts, setAttempts] = useState(0);
  const [correctAnswers, setCorrectAnswers] = useState(0);
  const [didComplete, setDidComplete] = useState(false);
  const [showPracticeIntro, setShowPracticeIntro] = useState(Boolean(isPractice));
  const locked = useRef(false);
  const completed = useRef(false);
  const pendingResult = useRef<{ score: number; correct: number; attempts: number } | null>(null);
  const goalCorrect = useMemo(() => Math.min(8, Math.max(7, 6 + Math.floor(levelId / 2))), [levelId]);
  const isSessionActive = !sessionState || (sessionState.timeLeft > 0 && sessionState.lives > 0);
  const paused = Boolean(sessionState?.paused || showPracticeIntro);

  useEffect(() => {
    setRound(generateRound(Math.max(1, levelId), Math.max(1, levelId)));
    setRocketState('idle'); setSelectedPad(null); setFeedbackText(null);
    setScore(0); setAttempts(0); setCorrectAnswers(0); setDidComplete(false);
    setShowPracticeIntro(Boolean(isPractice));
    locked.current = false; completed.current = false; pendingResult.current = null;
  }, [levelId, isPractice]);

  useEffect(() => {
    if (rocketState !== 'launching') return;
    window.dispatchEvent(new CustomEvent(GAME_HUD_CINEMATIC_EVENT, { detail: { playing: true } }));
    return () => { window.dispatchEvent(new CustomEvent(GAME_HUD_CINEMATIC_EVENT, { detail: { playing: false } })); };
  }, [rocketState]);

  useEffect(() => {
    if (rocketState !== 'arming' && rocketState !== 'failed') return;
    let frame = 0;
    let elapsed = 0;
    let previous = performance.now();
    const delay = rocketState === 'arming' ? CORRECT_RESET_MS : FAILED_RESET_MS;
    const tick = (now: number) => {
      if (!paused && !document.hidden) elapsed += Math.min(100, now - previous);
      previous = now;
      if (elapsed >= delay) {
        if (rocketState === 'arming') setRound(generateRound(Math.max(1, levelId), Math.max(1, levelId)));
        setRocketState('idle'); setSelectedPad(null); setFeedbackText(null); locked.current = false;
      } else frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [rocketState, paused, levelId]);

  const completeRun = () => {
    const result = pendingResult.current;
    if (completed.current || !result) return;
    completed.current = true;
    setDidComplete(true);
    const stars = scoreToStars(result.score, result.correct, result.attempts);
    emitMiniGameSessionEvent(sessionEvents, 'game_complete', {
      score: result.score, stars,
      metadata: { correctAnswers: result.correct, attempts: result.attempts },
    });
    onVictory(stars, result.score);
  };

  const handlePadTap = (padValue: number) => {
    if (!isSessionActive || paused || locked.current || completed.current) return;
    locked.current = true;
    const nextAttempts = attempts + 1;
    setAttempts(nextAttempts); setSelectedPad(padValue);
    if (padValue === round.correctAnswer) {
      const pointGain = round.target === 100 ? 170 : 130;
      const streakBonus = correctAnswers > 0 && (correctAnswers + 1) % 4 === 0 ? 40 : 0;
      const nextScore = XP + pointGain + streakBonus;
      const nextCorrect = correctAnswers + 1;
      setScore(nextScore); setCorrectAnswers(nextCorrect);
      setFeedbackText(`${ROCKET_PART_NAMES[nextCorrect - 1]} installed!`);
      playGameSound('place');
      emitMiniGameSessionEvent(sessionEvents, 'correct_answer', {
        score: XP,
        metadata: { scoreAfter: nextScore, scoreDelta: pointGain + streakBonus, roundedTo: round.target, selected: padValue, expected: round.correctAnswer },
      });
      emitMiniGameSessionEvent(sessionEvents, 'puzzle_complete', {
        score: nextScore, metadata: { roundedTo: round.target, selected: padValue, expected: round.correctAnswer },
      });
      if (nextCorrect >= goalCorrect) {
        pendingResult.current = { score: nextScore, correct: nextCorrect, attempts: nextAttempts };
        window.dispatchEvent(new CustomEvent(GAME_HUD_CINEMATIC_EVENT, { detail: { playing: true } }));
        setRocketState('launching'); setFeedbackText(null);
      } else setRocketState('arming');
      return;
    }
    setRocketState('failed');
    setFeedbackText(`Not quite. ${round.value} rounds to ${round.correctAnswer}.`);
    emitMiniGameSessionEvent(sessionEvents, 'incorrect_answer', {
      score: XP,
      metadata: { roundedTo: round.target, selected: padValue, expected: round.correctAnswer, livesBefore: sessionState?.lives ?? 3, livesLost: 1 },
    });
  };

  const launching = rocketState === 'launching';
  const inputLocked = rocketState !== 'idle';
  return <div className="rr-game" data-rounding-rocket="true">
    <RoundingRocketScene installed={correctAnswers} total={goalCorrect} launch={launching} paused={paused} failed={rocketState === 'failed'} onLaunchComplete={completeRun}/>
    <PracticeIntroPopup open={showPracticeIntro} title="Rounding Rocket"
      body="Choose the rounded answer to install a rocket part. Build the whole rocket, then watch it launch into space. Check the digit just after the requested place: 5 or more rounds up."
      briefing={practiceBriefing} onAction={() => setShowPracticeIntro(false)}/>
    {!launching && <>
      <div className="rr-question">
        <GameQuestionCard title={`Nearest ${round.target}`} className="mx-auto max-w-[31rem]" bodyClassName="flex flex-col items-center gap-1">
          <span data-rocket-question-value="true" className="text-[clamp(2rem,5vw,3rem)] font-bold leading-none tabular-nums">{round.value}</span>
          <span className="rr-rounding-target">Round to the <span className="reference-emphasis">nearest {round.target}</span>.</span>
        </GameQuestionCard>
      </div>
      {feedbackText && <div role="status" className={`rr-feedback ${rocketState === 'failed' ? 'rr-feedback--error' : ''}`}>{feedbackText}</div>}
      <section className="rr-answers" aria-label="Rounding answers">
        <ReferenceArt part="rocket-answers" />
        <div className="rr-answer-label" data-game-tip="true">Choose the nearest {round.target}</div>
        <div className="rr-answer-buttons">
          {round.pads.map(padValue => <motion.button key={`${round.id}-${padValue}`} type="button" onClick={() => handlePadTap(padValue)}
            disabled={inputLocked || !isSessionActive || didComplete || paused}
            whileTap={!inputLocked ? { scale: .96 } : undefined}
            className={selectedPad === padValue && rocketState === 'arming' ? 'ui-button-success' : selectedPad === padValue && rocketState === 'failed' ? 'ui-button-secondary ring-2 ring-rose-300' : 'ui-button-secondary'}
            aria-label={`Landing pad ${padValue}`}><ReferenceArt part="green-answer" /><span>{padValue}</span></motion.button>)}
        </div>
      </section>
    </>}
  </div>;
};
export default RoundingRocketGame;
