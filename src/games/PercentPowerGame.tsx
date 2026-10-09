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
import './percent-power.css';

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
    helper: 'Find a useful part first: 10%, 25% or 50%.',
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
    helper: 'Find 1% or 10%, then work back to the whole.',
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
    helper: 'Find the gain, then add it to the start.',
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
    setStatusText('');
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
  const chargePercent = Math.round(coreFill * 100);

  return (
    <div className="reactor-game pp-game relative h-full w-full overflow-hidden text-white">
      <GameplaySceneBackdrop
        gameType="percent_power"
        backgroundOverride={percentPowerBackground}
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

      <main
        className="reactor-layout pp-layout"
        data-reactor-game
        data-reactor-tier={resolvedLevel}
        data-reactor-reaction={feedback || 'idle'}
        data-reactor-charge={correctAnswers}
      >
        <div className="pp-head">
          <GameQuestionCard
            title="Power grid / mission"
            className="pp-question"
            style={{ position: 'relative', top: 'auto', left: 'auto', right: 'auto', width: '100%', transform: 'none' }}
          >
            {question.prompt}
          </GameQuestionCard>
        </div>

        <div className="pp-main">
          <div className="reactor-playfield pp-reactor-panel" data-reactor-playfield>
            <div className="pp-panel-topline">
              <span>CORE STATUS</span>
              <strong>{correctAnswers} / {totalRounds} CELLS ONLINE</strong>
            </div>
            <motion.div
              className="reactor-machine pp-reactor-machine"
              animate={!reducedMotion && feedback === 'incorrect' ? { x: [0, -6, 5, -3, 0] } : { x: 0 }}
              transition={{ duration: .36 }}
            >
              <svg
                className="pp-machine-svg"
                viewBox="0 0 420 280"
                role="img"
                aria-label={'Reactor at ' + chargePercent + ' percent charge. ' + correctAnswers + ' of ' + totalRounds + ' power cells restored.'}
              >
                <defs>
                  <linearGradient id={chamberId + '-steel'} x1="0" y1="0" x2="1" y2="1">
                    <stop stopColor="#81939a" />
                    <stop offset=".28" stopColor="#354957" />
                    <stop offset=".72" stopColor="#152633" />
                    <stop offset="1" stopColor="#6d8186" />
                  </linearGradient>
                  <radialGradient id={chamberId + '-energy'}>
                    <stop stopColor="#8bf5ed" stopOpacity=".95" />
                    <stop offset=".42" stopColor="#1c8391" stopOpacity=".78" />
                    <stop offset="1" stopColor="#052b39" />
                  </radialGradient>
                </defs>
                <ellipse cx="210" cy="263" rx="143" ry="12" fill="#071821" opacity=".62" />
                <path d="M102 125H35V180H6M318 125H385V180H414" fill="none" stroke="#091d28" strokeWidth="28" strokeLinejoin="round" />
                <path d="M102 125H35V180H6M318 125H385V180H414" fill="none" stroke="#65777b" strokeWidth="15" strokeLinejoin="round" />
                <path d="M102 125H35V180H6M318 125H385V180H414" fill="none" stroke={feedback === 'incorrect' ? '#e48571' : '#54c9c9'} strokeWidth="5" strokeLinejoin="round" />
                <rect x="96" y="13" width="228" height="242" rx="33" fill={'url(#' + chamberId + '-steel)'} stroke="#0a1b27" strokeWidth="7" />
                <rect x="109" y="26" width="202" height="215" rx="25" fill="#0c2230" stroke="#708b8d" strokeWidth="2" />
                <path d="M135 27V241M285 27V241" stroke="#9db6aa" strokeWidth="3" opacity=".35" />
                <circle cx="210" cy="133" r="97" fill="#071c29" stroke="#a5b4a1" strokeWidth="8" />
                <circle data-reactor-ring cx="210" cy="133" r="87" fill="none" stroke="#294b58" strokeWidth="9" strokeDasharray="4 11" />
                <circle cx="210" cy="133" r="75" fill="#062330" stroke="#0d4d59" strokeWidth="8" />
                <motion.circle
                  data-reactor-pulse
                  cx="210" cy="133" r="59"
                  fill={'url(#' + chamberId + '-energy)'}
                  animate={!reducedMotion ? { opacity: [.52 + coreFill * .3, .75 + coreFill * .2, .52 + coreFill * .3], scale: [1, 1.035, 1] } : { opacity: .68 + coreFill * .2, scale: 1 }}
                  transition={{ duration: 2.2, repeat: reducedMotion ? 0 : Infinity, ease: 'easeInOut' }}
                  style={{ transformOrigin: '210px 133px' }}
                />
                <circle cx="210" cy="133" r="66" fill="none" stroke="#244b55" strokeWidth="10" />
                <motion.circle
                  data-reactor-charge-ring
                  cx="210" cy="133" r="66" fill="none" stroke={feedback === 'incorrect' ? '#f1a17e' : '#82f3de'}
                  strokeWidth="10" strokeLinecap="round" strokeDasharray="415"
                  animate={{ strokeDashoffset: 415 * (1 - coreFill) }}
                  transition={{ duration: reducedMotion ? 0 : .65, ease: 'easeOut' }}
                  transform="rotate(-90 210 133)"
                />
                <circle cx="210" cy="133" r="49" fill="#071923" opacity=".88" stroke="#90c9ba" strokeWidth="2" />
                <path d="M147 48L157 57M273 48L263 57M147 218L157 209M273 218L263 209" stroke="#d7d3a5" strokeWidth="6" strokeLinecap="round" />
                {[{ x: 121, y: 38 }, { x: 299, y: 38 }, { x: 121, y: 229 }, { x: 299, y: 229 }].map((bolt, index) => (
                  <g key={index}>
                    <circle cx={bolt.x} cy={bolt.y} r="6" fill="#bfc5ad" stroke="#122e39" strokeWidth="2" />
                    <path d={'M' + (bolt.x - 3) + ' ' + bolt.y + 'h6'} stroke="#566b69" strokeWidth="2" />
                  </g>
                ))}
                {feedback === 'incorrect' ? (
                  <motion.g data-reactor-vent animate={!reducedMotion ? { opacity: [1, 0], y: [0, -12] } : { opacity: .8 }} transition={{ duration: .55 }}>
                    <path d="M34 104q-12-16 2-29q-5-12 9-20M386 104q12-16-2-29q5-12-9-20" fill="none" stroke="#ffc4a9" strokeWidth="7" strokeLinecap="round" />
                  </motion.g>
                ) : null}
              </svg>
              <div className="pp-core-readout" aria-hidden="true">
                <span className="pp-readout-label">GRID CHARGE</span>
                <strong className="pp-readout-value">{chargePercent}%</strong>
                <span className="pp-readout-foot">{feedback === 'incorrect' ? 'VENTING' : feedback === 'correct' ? 'CELL ONLINE' : 'STANDBY'}</span>
              </div>
            </motion.div>
            <div className="pp-charge-bar" aria-label={correctAnswers + ' of ' + totalRounds + ' cells restored'}>
              {Array.from({ length: 10 }, (_, index) => (
                <span
                  key={index}
                  data-reactor-segment={index}
                  data-charged={index < Math.round(coreFill * 10)}
                  aria-hidden="true"
                />
              ))}
            </div>
          </div>

          <section className="pp-controls" aria-label="Reactor calculation controls">
            <div className="pp-console-head">
              <span>CALCULATION CONSOLE</span>
              <strong>ROUND {roundNumber} / {totalRounds}</strong>
            </div>
            <div className="pp-values">
              <div className="pp-value">
                <span className="pp-value-label">FOCUS</span>
                <strong>{question.coreLabel}</strong>
              </div>
              <div className="pp-value">
                <span className="pp-value-label">REFERENCE</span>
                <strong>{question.sideLabel}</strong>
              </div>
            </div>
            <div className="pp-answer-caption">SELECT THE CORRECT OUTPUT</div>
            <div className="answer-choice-surface reactor-answers pp-answers">
              {question.options.map((option, index) => (
                <motion.button
                  key={question.id + '-' + option}
                  type="button"
                  data-button-skin="none"
                  data-reactor-option={index}
                  onClick={() => handleAnswer(index)}
                  disabled={isLocked || didEndRef.current || Boolean(sessionState?.paused)}
                  whileTap={reducedMotion ? undefined : { scale: .98 }}
                  className={'pp-answer ' + (index === selectedIndex ? feedback === 'correct' ? 'is-correct' : 'is-incorrect' : '')}
                  aria-label={'Output option ' + (index + 1) + ': ' + option}
                >
                  <span className="pp-answer-index">{String(index + 1).padStart(2, '0')}</span>
                  <strong className="pp-answer-value">{option}</strong>
                </motion.button>
              ))}
            </div>
            <div className="refinement-feedback pp-feedback" data-tone={feedback || 'info'} role="status" aria-live="polite">
              {statusText || question.helper}
            </div>
          </section>
        </div>
      </main>
    </div>
  );
};

export default PercentPowerGame;
