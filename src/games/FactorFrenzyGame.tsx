import React, { useCallback, useContext, useEffect, useRef, useState } from 'react';
import { playGameSound, playMonsterSound } from '../audio/gameAudio';
import confetti from 'canvas-confetti';
import { motion, useReducedMotion } from 'motion/react';
import {
  Trophy,
  RotateCcw,
  CheckCircle2,
} from 'lucide-react';
import { GAME_HUD_RESTART_EVENT } from '../gameHudEvents';
import { emitMiniGameSessionEvent, MiniGameShellContractProps } from '../app/gameplaySessionContract';
import factorFrenzyBackground from '../assets/maps/premium/factor-frenzy.webp';
import factorEnemy from '../assets/reskin/factor-sentinel.webp';
import { GameQuestionCard } from '../components/game-ui/GameUiKit';
import MonsterMindActor from '../components/game-ui/MonsterMindActor';
import { buildPraiseMessage, shouldShowPraise } from '../utils/praiseFeedback';
import './factor-frenzy.css';
import SceneEnvironment from '../components/SceneEnvironment';
import { VisionSceneContext } from './visionScene';

type FactorProblemType = 'missing_factor' | 'all_factors' | 'common_factors' | 'prime_factors';

interface FactorProblem {
  id: number;
  type: FactorProblemType;
  number: number;
  number2?: number;
  options: number[];
  correctAnswers: number[];
  question: string;
}

interface FrenzyLevel {
  name: string;
  threshold: number;
  timeLimit: number;
}

interface FactorFrenzyGameProps extends MiniGameShellContractProps {
  levelId: number;
  avatarId: string;
  useSharedTopHud?: boolean;
  onVictory: (stars: number, XP: number) => void;
  onGameOver: (XP: number) => void;
  onBack: () => void;
}

interface LocalState {
  XP: number;
  level: number;
  currentProblem: FactorProblem | null;
  status: 'playing' | 'correct' | 'incorrect' | 'complete';
  timeLeft: number;
  enemyHealth: number;
}

const FRENZY_LEVELS: FrenzyLevel[] = [
  { name: 'Rookie', threshold: 0, timeLimit: 30 },
  { name: 'Pro', threshold: 1000, timeLimit: 25 },
  { name: 'Elite', threshold: 3000, timeLimit: 20 },
  { name: 'Master', threshold: 6000, timeLimit: 15 },
  { name: 'Legend', threshold: 10000, timeLimit: 10 },
];

const ENEMY_MAX_HEALTH = 10;

const INITIAL_STATE: LocalState = {
  XP: 0,
  level: 1,
  currentProblem: null,
  status: 'playing',
  timeLeft: 30,
  enemyHealth: ENEMY_MAX_HEALTH,
};

const scoreToStars = (XP: number, roundTimeLimit: number) => {
  const attainableScore = ENEMY_MAX_HEALTH * (500 + roundTimeLimit * 10);
  if (XP >= attainableScore * .9) return 3;
  if (XP >= attainableScore * .7) return 2;
  return 1;
};

const shuffle = <T,>(items: T[]): T[] => {
  const clone = [...items];
  for (let index = clone.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [clone[index], clone[swapIndex]] = [clone[swapIndex], clone[index]];
  }
  return clone;
};

const buildOptions = (correctAnswers: number[], distractors: number[], minimumCount = 4) => {
  const options = [...new Set([...correctAnswers, ...shuffle(distractors).slice(0, 3)])];
  let offset = 1;

  while (options.length < minimumCount) {
    const base = correctAnswers[0] ?? 1;
    const candidate = Math.max(1, base + offset * 2);
    if (!options.includes(candidate)) {
      options.push(candidate);
    }
    offset += 1;
  }

  return shuffle(options);
};

const FactorFrenzyGame: React.FC<FactorFrenzyGameProps> = ({
  levelId,
  avatarId: _avatarId,
  useSharedTopHud: _useSharedTopHud,
  onVictory,
  onGameOver: _onGameOver,
  onBack: _onBack,
  sessionEvents,
  sessionState,
}) => {
  const scene = useContext(VisionSceneContext);
  const paused = Boolean(sessionState?.paused || scene.paused);
  const reducedMotion = useReducedMotion();
  const difficultyTier = Math.max(1, Math.min(5, levelId));
  const levelConfig = FRENZY_LEVELS[difficultyTier - 1];
  const [state, setState] = useState<LocalState>(INITIAL_STATE);
  const [selectedOptions, setSelectedOptions] = useState<number[]>([]);
  const [showHitFx, setShowHitFx] = useState(false);
  const [successTone, setSuccessTone] = useState<'success' | 'praise'>('success');
  const [successMessage, setSuccessMessage] = useState('Direct hit!');
  const problemStartRef = useRef<number>(Date.now());

  const timerRef = useRef<number | null>(null);
  const advanceRef = useRef<number | null>(null);
  const endedRef = useRef(false);
  const reportedProblemRef = useRef<number | null>(null);

  const clearTimer = () => {
    if (timerRef.current !== null) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  const clearAdvanceTimer = () => {
    if (advanceRef.current !== null) {
      window.clearTimeout(advanceRef.current);
      advanceRef.current = null;
    }
  };

  const getFactors = (number: number): number[] => {
    const factors: number[] = [];
    for (let factor = 1; factor <= number; factor += 1) {
      if (number % factor === 0) factors.push(factor);
    }
    return factors;
  };

  const getPrimeFactors = (number: number): number[] => {
    const factors: number[] = [];
    let divisor = 2;
    let remaining = number;

    while (remaining > 1) {
      while (remaining % divisor === 0) {
        factors.push(divisor);
        remaining /= divisor;
      }
      divisor += 1;
    }

    return [...new Set(factors)];
  };

  const generateProblem = useCallback((level: number): FactorProblem => {
    const tier = Math.max(1, Math.min(5, level));
    const problemTypes: FactorProblemType[] = ['missing_factor', 'all_factors', 'common_factors', 'prime_factors'];
    const type = tier === 5 ? Math.random() < .5 ? 'common_factors' : 'prime_factors' : problemTypes[tier - 1];
    const id = Date.now() + Math.floor(Math.random() * 1000);

    if (type === 'missing_factor') {
      const factor = 2 + Math.floor(Math.random() * 4);
      const answer = 2 + Math.floor(Math.random() * 4);
      const number = factor * answer;
      const distractors = [answer + 2, answer - 1, answer + 5, answer - 3].filter((value) => value > 0);
      const options = buildOptions([answer], distractors, 4);

      return {
        id,
        type,
        number,
        question: `Complete the factor chain: ${factor} × ? = ${number}`,
        options,
        correctAnswers: [answer],
      };
    }

    if (type === 'all_factors') {
      const number = [6, 8, 10, 12][Math.floor(Math.random() * 4)];
      const correctAnswers = getFactors(number);
      const extras = [number + 1, number - 2, 7, 9, 11, 13, 14, 15].filter((value) => value > 0 && !correctAnswers.includes(value));
      const options = buildOptions(correctAnswers, extras, Math.max(4, correctAnswers.length));

      return {
        id,
        type,
        number,
        question: `Select all the factors of ${number}.`,
        options,
        correctAnswers,
      };
    }

    if (type === 'common_factors') {
      const pairs: Array<[number, number]> = tier === 5
        ? [[24, 36], [30, 45], [36, 60], [42, 70]]
        : [[12, 18], [16, 24], [18, 30], [20, 30]];
      const [number, number2] = pairs[Math.floor(Math.random() * pairs.length)];
      const factorsOne = getFactors(number);
      const factorsTwo = getFactors(number2);
      const commonAnswers = factorsOne.filter((value) => factorsTwo.includes(value));
      const extras = [5, 7, 9, 11, 13, 14, 15].filter((value) => !commonAnswers.includes(value));
      const options = buildOptions(commonAnswers, extras, Math.max(4, commonAnswers.length));

      return {
        id,
        type,
        number,
        number2,
        question: `Select all the common factors of ${number} and ${number2}.`,
        options,
        correctAnswers: commonAnswers,
      };
    }

    const numbers = tier === 5 ? [60, 72, 84, 90, 120] : [12, 18, 20, 24, 30, 36, 42];
    const number = numbers[Math.floor(Math.random() * numbers.length)];
    const correctAnswers = getPrimeFactors(number);
    const options = buildOptions(correctAnswers, [2, 3, 5, 7, 11, 13, 4, 6, 8, 9], 4);

    return {
      id,
      type,
      number,
      question: `Select all the prime factors of ${number}.`,
      options,
      correctAnswers,
    };
  }, []);

  const startGame = () => {
    endedRef.current = false;
    reportedProblemRef.current = null;
    const firstProblem = generateProblem(difficultyTier);
    problemStartRef.current = Date.now();
    setSuccessTone('success');
    setSuccessMessage('Direct hit!');
    setState({
      ...INITIAL_STATE,
      currentProblem: firstProblem,
      status: 'playing',
      level: difficultyTier,
      timeLeft: levelConfig.timeLimit,
      enemyHealth: ENEMY_MAX_HEALTH,
    });
    setSelectedOptions([]);
  };

  useEffect(() => {
    if (state.currentProblem) return;
    const firstProblem = generateProblem(difficultyTier);
    problemStartRef.current = Date.now();
    setSuccessTone('success');
    setSuccessMessage('Direct hit!');
    setState((previous) => ({
      ...previous,
      currentProblem: firstProblem,
      status: 'playing',
      level: difficultyTier,
      timeLeft: levelConfig.timeLimit,
      enemyHealth: ENEMY_MAX_HEALTH,
    }));
  }, [state.currentProblem, generateProblem, difficultyTier, levelConfig.timeLimit]);

  useEffect(() => {
    clearTimer();

    if (state.status !== 'playing' || paused) return;

    timerRef.current = window.setInterval(() => {
      setState((previous) => {
        if (previous.status !== 'playing') return previous;
        if (previous.timeLeft <= 1) {
          return {
            ...previous,
            status: 'incorrect',
            timeLeft: 0,
          };
        }

        return {
          ...previous,
          timeLeft: previous.timeLeft - 1,
        };
      });
    }, 1000);

    return () => clearTimer();
  }, [state.status, paused]);

  useEffect(() => {
    const problem = state.currentProblem;
    if (state.status !== 'incorrect' || state.timeLeft !== 0 || !problem || reportedProblemRef.current === problem.id) return;
    reportedProblemRef.current = problem.id;
    emitMiniGameSessionEvent(sessionEvents, 'incorrect_answer', {
      reason: 'time_expired',
      score: state.XP,
      metadata: { problemId: problem.id, type: problem.type, correctAnswers: problem.correctAnswers },
    });
  }, [sessionEvents, state.currentProblem, state.status, state.timeLeft, state.XP]);

  const toggleOption = (value: number) => {
    if (state.status !== 'playing' || paused) return;
    if (state.currentProblem?.type === 'missing_factor') {
      setSelectedOptions(previous => previous.includes(value) ? [] : [value]);
      return;
    }

    setSelectedOptions((previous) => (
      previous.includes(value)
        ? previous.filter((item) => item !== value)
        : [...previous, value]
    ));
  };

  const checkAnswer = () => {
    if (paused || !state.currentProblem || state.status !== 'playing' || reportedProblemRef.current === state.currentProblem.id) return;

    const correct = [...state.currentProblem.correctAnswers].sort((a, b) => a - b);
    const selected = [...selectedOptions].sort((a, b) => a - b);
    const isCorrect = correct.length === selected.length && correct.every((value, index) => value === selected[index]);
    reportedProblemRef.current = state.currentProblem.id;
    emitMiniGameSessionEvent(sessionEvents, isCorrect ? 'correct_answer' : 'incorrect_answer', {
      score: state.XP,
      metadata: {
        problemId: state.currentProblem.id,
        type: state.currentProblem.type,
        selectedAnswers: selected,
        correctAnswers: correct,
        timeLeft: state.timeLeft,
      },
    });

    if (isCorrect) {
      playGameSound('impact');
      playMonsterSound('monster_hurt');
      const timeBonus = state.timeLeft * 10;
      const points = 500 + timeBonus;
      const newScore = state.XP + points;
      const remainingHealth = Math.max(0, state.enemyHealth - 1);
      const finished = remainingHealth <= 0;
      const elapsedMs = Date.now() - problemStartRef.current;
      const isPraise = shouldShowPraise(1, elapsedMs);

      setState((previous) => ({
        ...previous,
        XP: newScore,
        enemyHealth: remainingHealth,
        status: finished ? 'complete' : 'correct',
      }));
      setSuccessTone(isPraise ? 'praise' : 'success');
      setSuccessMessage(isPraise ? buildPraiseMessage() : 'Direct hit!');

      setShowHitFx(true);
      confetti({
        disableForReducedMotion: true,
        particleCount: finished ? 160 : 120,
        spread: 80,
        origin: { y: 0.62 },
        colors: ['#fbbf24', '#f59e0b', '#38bdf8', '#34d399'],
      });
      return;
    }

    playMonsterSound('monster_growl');
    setState((previous) => ({
      ...previous,
      status: 'incorrect',
    }));
  };

  const nextProblem = () => {
    const problem = generateProblem(difficultyTier);
    reportedProblemRef.current = null;
    problemStartRef.current = Date.now();
    setSuccessTone('success');
    setSuccessMessage('Direct hit!');

    setState((previous) => ({
      ...previous,
      level: difficultyTier,
      currentProblem: problem,
      status: 'playing',
      timeLeft: levelConfig.timeLimit,
    }));
    setSelectedOptions([]);
  };

  useEffect(() => {
    clearAdvanceTimer();
    if (paused || (state.status !== 'correct' && state.status !== 'incorrect')) return;

    const delay = state.status === 'correct' ? 900 : 2200;
    advanceRef.current = window.setTimeout(() => {
      nextProblem();
    }, delay);

    return () => clearAdvanceTimer();
  }, [state.status, paused]);

  useEffect(() => {
    if (!showHitFx) return;
    const timeout = window.setTimeout(() => setShowHitFx(false), 520);
    return () => window.clearTimeout(timeout);
  }, [showHitFx]);

  const submitRun = () => {
    if (endedRef.current) return;
    endedRef.current = true;
    onVictory(scoreToStars(state.XP, levelConfig.timeLimit), state.XP);
  };

  const problem = state.currentProblem;
  const openedLocks = ENEMY_MAX_HEALTH - state.enemyHealth;
  const instruction = !problem ? '' : problem.type === 'missing_factor'
    ? 'Choose one rune to complete the multiplication.'
    : problem.type === 'common_factors'
      ? `Choose every number that divides both ${problem.number} and ${problem.number2}.`
      : problem.type === 'prime_factors'
        ? `Choose every prime number that divides ${problem.number}.`
        : `Choose every number that divides ${problem.number} exactly.`;
  const feedback = state.status === 'correct' ? `${successMessage} One lock opened.`
    : state.status === 'incorrect' ? `${state.timeLeft === 0 ? 'Time up.' : 'Not quite.'} Correct: ${problem?.correctAnswers.join(', ')}.`
    : selectedOptions.length ? `Loaded: ${selectedOptions.join(' · ')}` : 'Tap the runes to load your pulse.';

  return (
    <div className="factor-frenzy-game frenzy-arena" data-factor-id={problem?.id} data-factor-type={problem?.type} data-factor-number={problem?.number} data-factor-number2={problem?.number2} data-factor-health={state.enemyHealth} data-factor-status={state.status} data-paused={paused}>
      <SceneEnvironment src={factorFrenzyBackground} />
      <div className="frenzy-scene-shade" aria-hidden="true" />
      {state.status === 'complete' ? (
        <section className="frenzy-complete">
          <Trophy aria-hidden="true" />
          <h2>Sentinel unlocked!</h2>
          <p>All ten factor locks opened.</p>
          <strong>{state.XP.toLocaleString()} XP</strong>
          <button className="ui-button-success" onClick={submitRun}><CheckCircle2 aria-hidden="true" /> Claim Victory</button>
          <button className="ui-button-secondary" onClick={() => { window.dispatchEvent(new Event(GAME_HUD_RESTART_EVENT)); startGame(); }}><RotateCcw aria-hidden="true" /> Restart</button>
        </section>
      ) : (
        <div className="frenzy-workspace">
          <header className="frenzy-question">
            <GameQuestionCard title="Factor Frenzy" context="" className="frenzy-question-card">{problem?.question}</GameQuestionCard>
            <div className="frenzy-clock" role="timer" aria-label={`${state.timeLeft} seconds left`} data-urgent={state.timeLeft <= 5}>
              <strong>{state.timeLeft}s</strong><span>this pulse</span>
            </div>
            <div className="frenzy-time-track" aria-hidden="true"><div style={{ width: `${state.timeLeft / levelConfig.timeLimit * 100}%` }} /></div>
          </header>
          <section className="frenzy-stage" aria-label="Factor sentinel">
            <div className="frenzy-lock-panel">
              <div><strong>Sentinel locks</strong><span>{openedLocks} / {ENEMY_MAX_HEALTH} open</span></div>
              <div className="frenzy-locks" role="progressbar" aria-label="Sentinel locks opened" aria-valuenow={openedLocks} aria-valuemin={0} aria-valuemax={ENEMY_MAX_HEALTH}>
                {Array.from({ length: ENEMY_MAX_HEALTH }, (_, i) => <span key={i} data-open={i < openedLocks} />)}
              </div>
            </div>
            <div className="frenzy-shield" data-charged={selectedOptions.length > 0} aria-hidden="true"><i /><i /></div>
            <div className="frenzy-ground-glow" aria-hidden="true" />
            <div className="frenzy-sentinel">
              <MonsterMindActor soundMode="off" src={factorEnemy} alt="Factor sentinel" reaction={showHitFx ? 'hit' : state.status === 'incorrect' ? 'taunt' : 'idle'} reactionKey={problem?.id} className="frenzy-sentinel-actor" />
            </div>
            <div className="frenzy-target-label">{problem?.type === 'missing_factor' ? 'Complete the chain' : 'Target'} <strong>{problem?.number}{problem?.number2 ? ` & ${problem.number2}` : ''}</strong></div>
            {showHitFx && !reducedMotion && !paused && <svg className="frenzy-pulse" viewBox="0 0 600 400" preserveAspectRatio="none" aria-hidden="true">
              <motion.path d="M590 340 Q430 90 300 225" fill="none" stroke="#b4ffff" strokeWidth="7" strokeLinecap="round" initial={{ pathLength: 0, opacity: 1 }} animate={{ pathLength: 1, opacity: [1, 1, 0] }} transition={{ duration: .5 }} />
            </svg>}
            {showHitFx && <span className="frenzy-impact" aria-hidden="true" />}
          </section>
          <section className="frenzy-console" aria-label="Load factor runes">
            <div className="frenzy-console-heading"><span>Load your pulse</span><strong>{problem?.type === 'missing_factor' ? 'Choose 1 rune' : 'Select all that apply'}</strong></div>
            <p className="frenzy-instruction">{instruction}</p>
            <div className="frenzy-runes" data-many={Boolean(problem && problem.options.length > 6)}>
              {problem?.options.map(option => <motion.button key={`${problem.id}-${option}`} type="button" data-factor-option={option} aria-label={`Factor ${option}`} aria-pressed={selectedOptions.includes(option)} disabled={state.status !== 'playing' || paused} whileTap={reducedMotion ? undefined : { scale: .95 }} onClick={() => toggleOption(option)} data-answer={state.status !== 'playing' && problem.correctAnswers.includes(option)}>
                <span>{option}</span><i aria-hidden="true">{selectedOptions.includes(option) ? '✓' : '◆'}</i>
              </motion.button>)}
            </div>
            <div className="frenzy-loaded" role="status" aria-live="polite" data-tone={state.status}>{feedback}</div>
            <button type="button" className="frenzy-fire ui-button-primary" onClick={checkAnswer} disabled={state.status !== 'playing' || selectedOptions.length === 0 || paused}>
              {state.status === 'correct' ? 'Pulse connected!' : state.status === 'incorrect' ? 'Recharging…' : selectedOptions.length ? 'Fire pulse' : 'Select runes above'}
            </button>
            <p className="frenzy-goal">Correct set = one pulse. Open all 10 locks.</p>
          </section>
        </div>
      )}
    </div>
  );
};

export default FactorFrenzyGame;
