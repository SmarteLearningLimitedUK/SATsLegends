import React, { useCallback, useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { motion, useIsPresent, useReducedMotion } from 'motion/react';
import confetti from 'canvas-confetti';
import { ChevronLeft, CircleDollarSign } from 'lucide-react';
import GameplaySceneBackdrop from '../components/GameplaySceneBackdrop';
import percentPowerBackground from '../assets/maps/premium/percent-power.webp';
import { triggerHaptic } from '../haptics';
import { GameQuestionCard } from '../components/game-ui/GameUiKit';
import PracticeIntroPopup from '../components/game-ui/PracticeIntroPopup';
import {
  emitMiniGameSessionEvent,
  MiniGameShellContractProps,
} from '../app/gameplaySessionContract';
import './game-refinements.css';

interface PercentPowerGameProps extends MiniGameShellContractProps {
  levelId: number;
  miniGameLevel?: number;
  avatarId: string;
  useSharedTopHud?: boolean;
  onVictory: (stars: number, XP: number) => void;
  onGameOver: (XP: number) => void;
  onBack: () => void;
}

interface PercentPowerQuestion {
  id: string;
  kind: 'fluency' | 'reasoning';
  prompt: string;
  helper: string;
  options: string[];
  answerIndex: number;
  coreLabel: string;
  sideLabel: string;
}

const FALLBACK_LIVES = 3;
const FALLBACK_TIMER = 80;

const shuffle = <T,>(items: T[]): T[] => {
  const clone = [...items];
  for (let index = clone.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [clone[index], clone[swapIndex]] = [clone[swapIndex], clone[index]];
  }
  return clone;
};

const makeOptions = (correct: string, wrongValues: string[]) => {
  const unique = Array.from(new Set([correct, ...wrongValues]));
  const filtered = unique.filter((value) => value !== correct);
  const options = [correct, ...filtered.slice(0, 3)];

  let pad = 1;
  while (options.length < 4) {
    const candidate = `${Number(correct) + pad}`;
    if (!options.includes(candidate)) {
      options.push(candidate);
    }
    pad += 1;
  }

  const shuffled = shuffle(options);
  return {
    options: shuffled,
    answerIndex: shuffled.indexOf(correct),
  };
};

const scoreToStars = (accuracy: number, remainingLives: number) => {
  if (accuracy >= 0.9 && remainingLives >= 2) return 3;
  if (accuracy >= 0.7 && remainingLives >= 1) return 2;
  return 1;
};

const directPercentages = (tier: number) => tier === 1 ? [10, 50] : tier === 2 ? [10, 25, 50, 75] : [10, 20, 25, 40, 50, 75];
const directAmounts = (tier: number) => tier === 1 ? [20, 40, 60, 80, 100] : tier === 2 ? [40, 80, 100, 120, 160] : [60, 120, 160, 200, 240, 320];
const reversePercentages = (tier: number) => tier === 3 ? [10, 25, 50] : [10, 20, 25, 40, 50];
const reverseWholes = [80, 120, 160, 200, 240, 320];
const increaseBases = [40, 60, 80, 120, 160];
const increasePercentages = [10, 20, 25, 50];

const buildDirectQuestion = (percent: number, amount: number): PercentPowerQuestion => {
  const answer = (amount * percent) / 100;
  const { options, answerIndex } = makeOptions(
    `${answer}`,
    [`${answer + amount / 10}`, `${Math.max(1, answer - amount / 20)}`, `${amount - answer}`],
  );

  return {
    id: `direct-${percent}-${amount}-${Math.random().toString(36).slice(2, 7)}`,
    kind: 'fluency',
    prompt: `What is ${percent}% of ${amount}?`,
    helper: 'Use 10%, 25%, 50% or known fraction facts to build the answer.',
    options,
    answerIndex,
    coreLabel: `${percent}%`,
    sideLabel: `Whole ${amount}`,
  };
};

const buildReverseQuestion = (percent: number, whole: number): PercentPowerQuestion => {
  const part = (whole * percent) / 100;
  const { options, answerIndex } = makeOptions(
    `${whole}`,
    [`${whole + 40}`, `${Math.max(10, whole - 40)}`, `${whole + 20}`],
  );

  return {
    id: `reverse-${percent}-${whole}-${Math.random().toString(36).slice(2, 7)}`,
    kind: 'fluency',
    prompt: `${percent}% of a number is ${part}. What is the whole number?`,
    helper: 'Find 1% or 10%, then scale up to the full amount.',
    options,
    answerIndex,
    coreLabel: `${part}`,
    sideLabel: `${percent}% chunk`,
  };
};

const buildIncreaseQuestion = (base: number, percent: number): PercentPowerQuestion => {
  const answer = base + ((base * percent) / 100);
  const { options, answerIndex } = makeOptions(
    `${answer}`,
    [`${base - ((base * percent) / 100)}`, `${base + percent}`, `${base + ((base * 10) / 100)}`],
  );

  return {
    id: `increase-${base}-${percent}-${Math.random().toString(36).slice(2, 7)}`,
    kind: 'fluency',
    prompt: `A power crystal has ${base} units. It gains ${percent}%. What is the new total?`,
    helper: 'Work out the percentage gain first, then add it to the original amount.',
    options,
    answerIndex,
    coreLabel: `+${percent}%`,
    sideLabel: `Start ${base}`,
  };
};

const buildQuestion = (level: number, round: number, previous: readonly PercentPowerQuestion[] = []): PercentPowerQuestion => {
  const mode = level <= 2 || (level <= 4 && round % 2 !== 0) || (level === 5 && round % 3 === 0)
    ? 'direct' : level === 5 && round % 3 === 1 ? 'increase' : 'reverse';
  const candidates = mode === 'direct'
    ? directPercentages(level).flatMap((percent) => directAmounts(level).map((amount) => buildDirectQuestion(percent, amount)))
    : mode === 'reverse'
      ? reversePercentages(level).flatMap((percent) => reverseWholes.map((whole) => buildReverseQuestion(percent, whole)))
      : increasePercentages.flatMap((percent) => increaseBases.map((base) => buildIncreaseQuestion(base, percent)));
  const seenPrompts = new Set(previous.map((question) => question.prompt));
  const seenAnswers = new Set(previous.map((question) => question.options[question.answerIndex]));
  const order = shuffle(candidates);
  return order.find((question) => !seenPrompts.has(question.prompt) && !seenAnswers.has(question.options[question.answerIndex]))
    ?? order.find((question) => !seenPrompts.has(question.prompt))
    ?? order[0];
};

const PercentPowerGame: React.FC<PercentPowerGameProps> = ({
  levelId,
  miniGameLevel,
  useSharedTopHud = false,
  onVictory,
  onGameOver,
  onBack,
  sessionState,
  sessionEvents,
  isPractice,
  practiceBriefing,
  gameTitle,
}) => {
  const resolvedLevel = useMemo(() => Math.max(1, Math.min(5, miniGameLevel || levelId || 1)), [levelId, miniGameLevel]);
  const reducedMotion = useReducedMotion();
  const isPresent = useIsPresent();
  const presentRef = useRef(isPresent);
  presentRef.current = isPresent;
  const chamberId = useId().replace(/:/g, '');
  const totalRounds = useMemo(() => Math.min(10, 5 + Math.floor(resolvedLevel / 2)), [resolvedLevel]);
  const [roundNumber, setRoundNumber] = useState(1);
  const usedQuestionsRef = useRef<PercentPowerQuestion[]>([]);
  const [question, setQuestion] = useState<PercentPowerQuestion>(() => {
    const first = buildQuestion(resolvedLevel, 1);
    usedQuestionsRef.current = [first];
    return first;
  });
  const [XP, setScore] = useState(0);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [feedback, setFeedback] = useState<'correct' | 'incorrect' | null>(null);
  const [statusText, setStatusText] = useState('');
  const [attempts, setAttempts] = useState(0);
  const [correctAnswers, setCorrectAnswers] = useState(0);
  const [localLives, setLocalLives] = useState(FALLBACK_LIVES);
  const [localTimer, setLocalTimer] = useState(FALLBACK_TIMER);
  const [isLocked, setLocked] = useState(false);
  const [showPracticeIntro, setShowPracticeIntro] = useState(Boolean(isPractice));
  const scoreRef = useRef(0);
  const didEndRef = useRef(false);
  const answerLockRef = useRef(false);
  const timersRef = useRef<number[]>([]);
  const victoryPendingRef = useRef(false);
  const observedPositiveLives = useRef((sessionState?.lives ?? 0) > 0);
  const victoryRef = useRef(onVictory); victoryRef.current = onVictory;
  const gameOverRef = useRef(onGameOver); gameOverRef.current = onGameOver;
  const sessionRef = useRef(sessionState); sessionRef.current = sessionState;
  const clearTimers = () => { timersRef.current.forEach(window.clearTimeout); timersRef.current = []; };
  useLayoutEffect(() => {
    if (!isPresent) { didEndRef.current = true; answerLockRef.current = true; victoryPendingRef.current = false; clearTimers(); }
    return () => clearTimers();
  }, [isPresent]);

  const lives = sessionState?.lives ?? localLives;
  const timeLeft = sessionState?.timeLeft ?? localTimer;

  useEffect(() => {
    if (!presentRef.current) return;
    scoreRef.current = XP;
  }, [XP]);

  useEffect(() => {
    if (!presentRef.current) return;
    clearTimers(); answerLockRef.current = false; victoryPendingRef.current = false;
    didEndRef.current = false;
    scoreRef.current = 0;
    setRoundNumber(1);
    const first = buildQuestion(resolvedLevel, 1);
    usedQuestionsRef.current = [first];
    setQuestion(first);
    setScore(0);
    setSelectedIndex(null);
    setFeedback(null);
    setStatusText('');
    setAttempts(0);
    setCorrectAnswers(0);
    setLocalLives(FALLBACK_LIVES);
    setLocalTimer(FALLBACK_TIMER);
    setLocked(false);
  }, [resolvedLevel]);

  useEffect(() => {
    setShowPracticeIntro(Boolean(isPractice));
  }, [isPractice]);

  useEffect(() => {
    if (sessionState || didEndRef.current || !isPresent) return undefined;
    const timerId = window.setInterval(() => {
      if (!presentRef.current || didEndRef.current) return;
      setLocalTimer((previous) => {
        if (previous <= 1) {
          window.clearInterval(timerId);
          return 0;
        }
        return previous - 1;
      });
    }, 1000);
    return () => window.clearInterval(timerId);
  }, [isPresent, sessionState]);

  useEffect(() => {
    if ((sessionState?.lives ?? 0) > 0) observedPositiveLives.current = true;
    if (!isPresent || didEndRef.current || (sessionState && !observedPositiveLives.current)) return;
    if (timeLeft > 0 && lives > 0) return;
    didEndRef.current = true;
    answerLockRef.current = true; clearTimers(); setLocked(true);
    emitMiniGameSessionEvent(sessionEvents, 'game_failed', {
      score: scoreRef.current,
      reason: timeLeft <= 0 ? 'time' : 'lives',
    });
    if (!sessionState) gameOverRef.current(scoreRef.current);
  }, [isPresent, lives, sessionEvents, sessionState, timeLeft]);

  const finishVictory = useCallback((finalScore: number, finalAttempts: number, finalCorrect: number, remainingLives: number) => {
    if (didEndRef.current || !presentRef.current) return;
    didEndRef.current = true;
    const accuracy = finalAttempts > 0 ? finalCorrect / finalAttempts : 1;
    const stars = scoreToStars(accuracy, remainingLives);
    emitMiniGameSessionEvent(sessionEvents, 'game_complete', {
      score: finalScore,
      stars,
      metadata: { accuracy },
    });
    if (!reducedMotion) confetti({
      particleCount: 90,
      spread: 54,
      origin: { y: 0.62 },
      colors: ['#67e8f9', '#fef08a', '#ffffff'],
    });
    victoryPendingRef.current = true;
    timersRef.current.push(window.setTimeout(() => {
      if (!presentRef.current || !victoryPendingRef.current || (sessionRef.current && sessionRef.current.lives <= 0 && !isPractice)) return;
      victoryPendingRef.current = false; victoryRef.current(stars, finalScore);
    }, 320));
  }, [isPractice, reducedMotion, sessionEvents]);

  const advanceQuestion = useCallback((nextRound: number) => {
    if (!presentRef.current || didEndRef.current) return;
    const nextQuestion = buildQuestion(resolvedLevel, nextRound, usedQuestionsRef.current);
    usedQuestionsRef.current.push(nextQuestion);
    setRoundNumber(nextRound);
    setQuestion(nextQuestion);
    setSelectedIndex(null);
    setFeedback(null);
    setLocked(false);
    answerLockRef.current = false;
  }, [resolvedLevel]);

  const handleAnswer = (index: number) => {
    if (answerLockRef.current || didEndRef.current || !presentRef.current || sessionState?.paused || timeLeft <= 0 || (sessionState && !isPractice && lives <= 0)) return;
    answerLockRef.current = true;
    setLocked(true);
    setSelectedIndex(index);

    const isCorrect = index === question.answerIndex;
    const nextAttempts = attempts + 1;
    setAttempts(nextAttempts);

    if (isCorrect) {
      const award = 110 + (resolvedLevel * 14) + Math.max(0, Math.floor(timeLeft * 0.35));
      const nextScore = XP + award;
      const nextCorrect = correctAnswers + 1;
      setFeedback('correct');
      setScore(nextScore);
      setCorrectAnswers(nextCorrect);
      setStatusText(`Power cell restored. +${award} XP.`);
      triggerHaptic('success');
      emitMiniGameSessionEvent(sessionEvents, 'correct_answer', {
        score: nextScore,
        metadata: { round: roundNumber, questionId: question.id },
      });
      emitMiniGameSessionEvent(sessionEvents, 'puzzle_complete', {
        score: nextScore,
        metadata: { round: roundNumber, totalRounds },
      });

      if (roundNumber >= totalRounds) {
        finishVictory(nextScore, nextAttempts, nextCorrect, lives);
        return;
      }

      timersRef.current.push(window.setTimeout(() => {
        advanceQuestion(roundNumber + 1);
      }, 540));
      return;
    }

    setFeedback('incorrect');
    setStatusText('Pressure vented. Recheck the percentage clue.');
    triggerHaptic('warning');
    emitMiniGameSessionEvent(sessionEvents, 'incorrect_answer', {
      score: XP,
      metadata: { round: roundNumber, questionId: question.id, selectedIndex: index },
    });

    if (!sessionState) {
      setLocalLives((previous) => Math.max(0, previous - 1));
    }

    if (roundNumber >= totalRounds && !sessionState && lives - 1 <= 0) {
      return;
    }

    timersRef.current.push(window.setTimeout(() => {
      if (didEndRef.current) return;
      advanceQuestion(Math.min(totalRounds, roundNumber + 1));
    }, 620));
  };

  const coreFill = Math.max(0, Math.min(1, correctAnswers / Math.max(1, totalRounds)));

  return (
    <div className="reactor-game relative h-full w-full overflow-hidden text-white">
      <GameplaySceneBackdrop
        gameType="percent_power"
        backgroundOverride={percentPowerBackground}
        className="opacity-[0.98]"
      />

      <PracticeIntroPopup
        open={showPracticeIntro}
        title={gameTitle || 'Percent Power'}
        body="The Monster Minds have disabled the power cells. Use percentage clues to find parts of a whole, or work backwards to rebuild the full amount."
        briefing={practiceBriefing}
        onAction={() => setShowPracticeIntro(false)}
      />

      {!useSharedTopHud ? (
        <div data-local-top-hud="true" className="absolute left-0 right-0 top-[calc(env(safe-area-inset-top)+2px)] z-30 flex items-center justify-between px-3">
          <button
            type="button"
            onClick={onBack}
            className="flex h-11 w-11 items-center justify-center rounded-xl border border-cyan-200/45 bg-[#0a1f56]/88 shadow-[0_8px_20px_rgba(0,0,0,0.45)]"
            aria-label="Back"
          >
            <ChevronLeft className="h-5 w-5 text-cyan-100" />
          </button>
          <div className="flex items-center gap-2 rounded-xl border border-cyan-200/45 bg-[#0a1f56]/92 px-3 py-2 shadow-[0_8px_20px_rgba(0,0,0,0.45)]">
            <span className="text-xs font-black tabular-nums text-cyan-50">{timeLeft}s</span>
            <span className="h-4 w-px bg-cyan-100/35" />
            <CircleDollarSign className="h-4 w-4 text-yellow-300" />
            <span className="text-xs font-black tabular-nums text-yellow-100">{XP}</span>
          </div>
        </div>
      ) : null}

      <main className="reactor-layout" data-reactor-game data-reactor-tier={resolvedLevel} data-reactor-reaction={feedback || 'idle'} data-reactor-charge={correctAnswers}>
        <GameQuestionCard title="Restore the reactor" style={{ position: 'relative', top: 0, transform: 'none' }}>
          {question.prompt}
        </GameQuestionCard>
        <div className="reactor-playfield" data-reactor-playfield>
          <motion.div className="reactor-machine"
            animate={!reducedMotion && feedback === 'incorrect' ? { x: [0,-5,5,-3,0] } : { x: 0 }} transition={{ duration: .35 }}>
            <svg viewBox="0 0 360 310" role="img" aria-label={`Reactor. ${correctAnswers} of ${totalRounds} power cells restored. ${question.sideLabel}. ${question.coreLabel}.`}>
              <defs>
                <clipPath id={`${chamberId}-chamber`}><rect x="115" y="65" width="130" height="170" rx="34" /></clipPath>
                <linearGradient id={`${chamberId}-steel`} x1="0" x2="1"><stop stopColor="#526665"/><stop offset=".5" stopColor="#8caca0"/><stop offset="1" stopColor="#425655"/></linearGradient>
                <linearGradient id={`${chamberId}-power`} x1="0" y1="0" x2="0" y2="1"><stop stopColor="#dbffa4"/><stop offset="1" stopColor="#48b992"/></linearGradient>
              </defs>
              <ellipse cx="180" cy="288" rx="132" ry="12" fill="#05191b" opacity=".55"/>
              <path d="M117 93H67V165H35V233H114M243 93H293V165H325V233H246" fill="none" stroke="#102c30" strokeWidth="25" strokeLinejoin="round"/>
              <path d="M117 93H67V165H35V233H114M243 93H293V165H325V233H246" fill="none" stroke="#899785" strokeWidth="15" strokeLinejoin="round"/>
              <path d="M117 93H67V165H35V233H114M243 93H293V165H325V233H246" fill="none" stroke={feedback === 'incorrect' ? '#f2a353' : '#69dcb1'} strokeWidth="5" strokeLinejoin="round"/>
              <rect x="94" y="37" width="172" height="237" rx="38" fill={`url(#${chamberId}-steel)`} stroke="#132f33" strokeWidth="7"/>
              <rect x="111" y="61" width="138" height="178" rx="38" fill="#092c31" stroke="#1e4448" strokeWidth="6"/>
              <g clipPath={`url(#${chamberId}-chamber)`}>
                <rect x="115" y="65" width="130" height="170" fill="#103c41"/>
                <motion.rect x="115" y={235 - (38 + coreFill * 132)} width="130" height={38 + coreFill * 132}
                  fill={`url(#${chamberId}-power)`} animate={!reducedMotion && feedback === 'correct' ? { opacity: [.65,1] } : { opacity: .9 }} transition={{ duration: .4 }}/>
                <path d="M148 63V235M215 63V235" stroke="#e3ffff" strokeWidth="7" opacity=".15"/>
                {[0,1,2].map((index) => <motion.circle key={index} cx={150+index*31} cy={205-index*22} r={5+index}
                  fill="#eeffc0" opacity=".6" animate={!reducedMotion ? { y: [0,-10,0] } : { y: 0 }} transition={{ duration: 2.3 + index*.4, repeat: Infinity }}/>) }
                <circle cx="180" cy="143" r="33" fill="#102f37" stroke="#cdf6bb" strokeWidth="3"/>
                <path d="M183 119L166 145H178L174 167L196 138H182Z" fill={feedback === 'incorrect' ? '#f7ac67' : '#d6ff94'}/>
              </g>
              {[{x:104,y:54},{x:256,y:54},{x:104,y:255},{x:256,y:255}].map((bolt,index) => <g key={index}><circle cx={bolt.x} cy={bolt.y} r="7" fill="#d7d2a7" stroke="#203a3c" strokeWidth="2"/><path d={`M${bolt.x-3} ${bolt.y}h6`} stroke="#526758" strokeWidth="2"/></g>)}
              <rect x="105" y="12" width="150" height="40" rx="8" fill="#10363b" stroke="#dfc278" strokeWidth="3"/>
              <text x="180" y="39" textAnchor="middle" className="reactor-plaque">POWER CELLS</text>
              <rect x="106" y="249" width="148" height="26" rx="6" fill="#0d2d32" stroke="#213e3f" strokeWidth="2"/>
              {Array.from({length:10},(_,index) => <rect key={index} data-reactor-segment={index} data-charged={index < Math.round(coreFill*10)}
                x={114+index*13.6} y="255" width="9" height="13" rx="2" fill={index < Math.round(coreFill*10) ? '#abec78' : '#3d5955'}/>) }
              <rect x="124" y="78" width="112" height="27" rx="7" fill="#0c3037"/>
              <text x="180" y="97" textAnchor="middle" className="reactor-core-caption">{question.coreLabel}</text>
              <text x="180" y="224" textAnchor="middle" className="reactor-plaque">{question.sideLabel}</text>
              <text x="180" y="304" textAnchor="middle" className="reactor-plaque">{correctAnswers}/{totalRounds} cells restored</text>
              {feedback === 'incorrect' ? <motion.g data-reactor-vent animate={!reducedMotion ? { y: [0,-14], opacity: [1,0] } : { opacity: .75 }} transition={{ duration: .55 }}>
                <path d="M40 167q-14-15 0-24q-5-10 7-13M320 167q14-15 0-24q5-10-7-13" fill="none" stroke="#fbdda9" strokeWidth="6" strokeLinecap="round"/>
              </motion.g> : null}
            </svg>
          </motion.div>
        </div>
        <div className="answer-choice-surface reactor-answers">
          {question.options.map((option,index) => <motion.button key={`${question.id}-${option}`} type="button"
            onClick={() => handleAnswer(index)} disabled={isLocked || didEndRef.current || Boolean(sessionState?.paused)}
            whileTap={reducedMotion ? undefined : {scale:.98}}
            className={index === selectedIndex ? feedback === 'correct' ? 'ui-button-success' : 'ui-button-primary' : 'ui-button-secondary'}>{option}</motion.button>)}
        </div>
        <div className="refinement-feedback" role="status" aria-live="polite">{statusText || question.helper}</div>
      </main>
    </div>
  );
};

export default PercentPowerGame;
