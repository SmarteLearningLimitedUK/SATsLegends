import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useIsPresent, useReducedMotion } from 'motion/react';
import GameplaySceneBackdrop from '../components/GameplaySceneBackdrop';
import PracticeIntroPopup from '../components/game-ui/PracticeIntroPopup';
import mineBackground from '../assets/maps/premium/multiplication-mine.webp';
import intactOre from '../assets/mine/ore/ore-intact.webp';
import crackedOre from '../assets/mine/ore/ore-cracked.webp';
import splitOre from '../assets/mine/ore/ore-split.webp';
import openOre from '../assets/mine/ore/ore-open.webp';
import { GameQuestionCard } from '../components/game-ui/GameUiKit';
import { emitMiniGameSessionEvent, type MiniGameShellContractProps } from '../app/gameplaySessionContract';
import { GAME_HUD_RESTART_EVENT } from '../gameHudEvents';
import { triggerHaptic } from '../haptics';
import { buildPraiseMessage, shouldShowPraise } from '../utils/praiseFeedback';
import './multiplication-mine.css';

interface MultiplicationMineGameProps extends MiniGameShellContractProps {
  levelId: number;
  avatarId: string;
  useSharedTopHud?: boolean;
  isBoss?: boolean;
  onVictory: (stars: number, XP: number) => void;
  onGameOver: (XP: number) => void;
  onBack: () => void;
}

interface MultiplicationQuestion {
  a: number;
  b: number;
  answer: number;
  options: number[];
}

type Phase = 'playing' | 'exploding' | 'treasure';
const ROCK_MAX_HEALTH = 4;
const ORE_STATES = [intactOre, crackedOre, splitOre, openOre];

const shuffle = <T,>(values: T[]) => {
  const result = [...values];
  for (let index = result.length - 1; index > 0; index -= 1) {
    const swap = Math.floor(Math.random() * (index + 1));
    [result[index], result[swap]] = [result[swap], result[index]];
  }
  return result;
};

const makeOptions = (correct: number) => {
  const spread = Math.max(3, Math.round(correct * .18));
  const wrongs = new Set<number>();
  while (wrongs.size < 3) {
    const candidate = Math.max(0, correct + Math.floor(Math.random() * (spread * 2 + 1)) - spread);
    if (candidate !== correct) wrongs.add(candidate);
  }
  return shuffle([...wrongs, correct]);
};

/** Four distinct facts and products, selected from the chosen tier's factor band. */
const makeQuestionDeck = (tier: number): MultiplicationQuestion[] => {
  const [minimum, maximum, challengingFactor] = [
    [2, 5, 2], [2, 7, 6], [3, 9, 8], [4, 12, 10], [7, 12, 11],
  ][Math.max(1, Math.min(5, tier)) - 1];
  const pairs: [number, number][] = [];
  for (let a = minimum; a <= maximum; a += 1) for (let b = a; b <= maximum; b += 1) {
    if (b >= challengingFactor) pairs.push([a, b]);
  }
  const seenProducts = new Set<number>();
  return shuffle(pairs).filter(([a, b]) => {
    if (seenProducts.has(a * b)) return false;
    seenProducts.add(a * b);
    return true;
  }).slice(0, ROCK_MAX_HEALTH).map(([a, b]) => ({ a, b, answer: a * b, options: makeOptions(a * b) }));
};

const starsForMistakes = (mistakes: number) => mistakes <= 1 ? 3 : mistakes <= 3 ? 2 : 1;

const MultiplicationMineGame: React.FC<MultiplicationMineGameProps> = ({
  levelId, useSharedTopHud = false, isPractice, practiceBriefing,
  sessionState, sessionEvents, onVictory,
}) => {
  const tier = useMemo(() => Math.max(1, Math.min(5, levelId || 1)), [levelId]);
  const isPresent = useIsPresent();
  const reducedMotion = useReducedMotion();
  const questionDeckRef = useRef<MultiplicationQuestion[]>([]);
  if (questionDeckRef.current.length === 0) questionDeckRef.current = makeQuestionDeck(tier);
  const [question, setQuestion] = useState(() => questionDeckRef.current[0]);
  const [rockHealth, setRockHealth] = useState(ROCK_MAX_HEALTH);
  const [correctCount, setCorrectCount] = useState(0);
  const [phase, setPhase] = useState<Phase>('playing');
  const [feedback, setFeedback] = useState<{ tone: 'ok' | 'error' | 'praise'; text: string } | null>(null);
  const [impactTick, setImpactTick] = useState(0);
  const [selectedChoice, setSelectedChoice] = useState<number | null>(null);
  const [locked, setLocked] = useState(false);
  const [runEnded, setRunEnded] = useState(false);
  const [showPracticeIntro, setShowPracticeIntro] = useState(Boolean(isPractice));
  const timersRef = useRef(new Set<number>());
  const answerLockRef = useRef(false);
  const endedRef = useRef(false);
  const mountedRef = useRef(true);
  const scoreRef = useRef(0);
  const correctRef = useRef(0);
  const mistakesRef = useRef(0);
  const healthRef = useRef(ROCK_MAX_HEALTH);
  const questionStartRef = useRef(Date.now());
  const questionAttemptRef = useRef(0);
  const presentRef = useRef(isPresent);
  const sessionRef = useRef(sessionState);
  const victoryRef = useRef(onVictory);
  const oreRef = useRef<HTMLDivElement | null>(null);
  presentRef.current = isPresent;
  sessionRef.current = sessionState;
  victoryRef.current = onVictory;

  const clearTimers = useCallback(() => {
    timersRef.current.forEach((timer) => window.clearTimeout(timer));
    timersRef.current.clear();
  }, []);
  const canContinue = () => mountedRef.current && presentRef.current && !endedRef.current
    && (!sessionRef.current || (sessionRef.current.lives > 0 && sessionRef.current.timeLeft > 0));

  const schedule = (callback: () => void, delay: number) => {
    const invoke = () => {
      timersRef.current.delete(timer);
      if (!canContinue()) return;
      if (sessionRef.current?.paused) {
        timer = window.setTimeout(invoke, 80);
        timersRef.current.add(timer);
        return;
      }
      callback();
    };
    let timer = window.setTimeout(invoke, delay);
    timersRef.current.add(timer);
  };

  useLayoutEffect(() => {
    if (isPresent) return;
    endedRef.current = true;
    answerLockRef.current = true;
    clearTimers();
  }, [clearTimers, isPresent]);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; clearTimers(); };
  }, [clearTimers]);

  useEffect(() => {
    // Static states share one registered canvas; prepare them before the first strike.
    const images = ORE_STATES.map((src) => { const image = new Image(); image.src = src; return image; });
    return () => images.forEach((image) => { image.onload = null; image.onerror = null; });
  }, []);

  useEffect(() => {
    if (!sessionState || (sessionState.lives > 0 && sessionState.timeLeft > 0)) return;
    endedRef.current = true;
    answerLockRef.current = true;
    clearTimers();
    setRunEnded(true);
    setLocked(true);
  }, [clearTimers, sessionState?.lives, sessionState?.timeLeft]);

  useEffect(() => {
    const reset = () => {
      if (!presentRef.current) return;
      clearTimers();
      endedRef.current = false;
      answerLockRef.current = false;
      scoreRef.current = 0;
      correctRef.current = 0;
      mistakesRef.current = 0;
      healthRef.current = ROCK_MAX_HEALTH;
      questionAttemptRef.current = 0;
      questionStartRef.current = Date.now();
      questionDeckRef.current = makeQuestionDeck(tier);
      setQuestion(questionDeckRef.current[0]);
      setRockHealth(ROCK_MAX_HEALTH);
      setCorrectCount(0);
      setPhase('playing');
      setFeedback(null);
      setSelectedChoice(null);
      setLocked(false);
      setRunEnded(false);
    };
    window.addEventListener(GAME_HUD_RESTART_EVENT, reset);
    return () => window.removeEventListener(GAME_HUD_RESTART_EVENT, reset);
  }, [clearTimers, tier]);

  useEffect(() => {
    if (!impactTick || feedback?.tone === 'error' || reducedMotion || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const animation = oreRef.current?.animate([
      { transform: 'translate(0,0) rotate(0deg)', offset: 0, easing: 'ease-out' },
      { transform: 'translate(-4px,2px) rotate(-1.2deg)', offset: .24, easing: 'ease-in-out' },
      { transform: 'translate(2px,0) rotate(.5deg)', offset: .6, easing: 'ease-out' },
      { transform: 'translate(0,0) rotate(0deg)', offset: 1 },
    ], { duration: 390, easing: 'linear' });
    return () => animation?.cancel();
  }, [feedback?.tone, impactTick, reducedMotion]);

  const solveQuestion = (selectedAnswer: number) => {
    if (!canContinue() || answerLockRef.current || phase !== 'playing' || sessionRef.current?.paused || showPracticeIntro) return;
    answerLockRef.current = true;
    setLocked(true);
    setSelectedChoice(selectedAnswer);
    questionAttemptRef.current += 1;

    if (selectedAnswer !== question.answer) {
      mistakesRef.current += 1;
      emitMiniGameSessionEvent(sessionEvents, 'incorrect_answer', { score: scoreRef.current });
      setFeedback({ tone: 'error', text: 'The ore is holding. Check the multiplication and try again.' });
      triggerHaptic('error');
      schedule(() => {
        setFeedback(null);
        setSelectedChoice(null);
        answerLockRef.current = false;
        setLocked(false);
      }, 700);
      return;
    }

    const nextCorrect = correctRef.current + 1;
    const nextHealth = Math.max(0, healthRef.current - 1);
    const nextScore = scoreRef.current + 120 + tier * 18;
    correctRef.current = nextCorrect;
    healthRef.current = nextHealth;
    scoreRef.current = nextScore;
    setCorrectCount(nextCorrect);
    setRockHealth(nextHealth);
    setImpactTick((value) => value + 1);
    const praise = shouldShowPraise(questionAttemptRef.current, Date.now() - questionStartRef.current);
    setFeedback({ tone: praise ? 'praise' : 'ok', text: nextHealth === 0 ? 'Crystal recovered. Mine cleared!' : praise ? buildPraiseMessage() : 'Clean strike. The crystal seam is opening.' });
    emitMiniGameSessionEvent(sessionEvents, 'correct_answer', { score: nextScore });
    triggerHaptic('success');

    if (nextHealth === 0) {
      setPhase('exploding');
      schedule(() => setPhase('treasure'), 650);
      schedule(() => {
        if (!canContinue()) return;
        endedRef.current = true;
        setRunEnded(true);
        victoryRef.current(starsForMistakes(mistakesRef.current), nextScore + 500);
      }, 1250);
      return;
    }
    schedule(() => {
      setQuestion(questionDeckRef.current[nextCorrect]);
      setFeedback(null);
      setSelectedChoice(null);
      questionAttemptRef.current = 0;
      questionStartRef.current = Date.now();
      answerLockRef.current = false;
      setLocked(false);
    }, 320);
  };

  const oreSource = ORE_STATES[Math.min(ORE_STATES.length - 1, ROCK_MAX_HEALTH - rockHealth)];
  const struck = feedback?.tone === 'ok' || feedback?.tone === 'praise';

  return (
    <div className="multiplication-mine" data-mine-game="true" data-mine-tier={tier} data-mine-state={runEnded ? 'ended' : phase} data-mine-correct={correctCount} data-mine-present={isPresent} data-mine-paused={Boolean(sessionState?.paused)} data-mine-reduced={Boolean(reducedMotion)}>
      <GameplaySceneBackdrop gameType="calculation_clash" backgroundOverride={mineBackground} />
      <PracticeIntroPopup open={showPracticeIntro} title={practiceBriefing?.title ?? 'Multiplication Mine'} body={practiceBriefing?.summary ?? 'Solve each multiplication and choose the result.\nFour accurate strikes open the ore and reveal its crystal.'} briefing={practiceBriefing} onAction={() => { setShowPracticeIntro(false); questionStartRef.current = Date.now(); }} />
      <div className="mine-layout" data-mine-shared-hud={useSharedTopHud}>
        <GameQuestionCard title="Multiplication Mine" subtitle="Solve the multiplication. Four accurate strikes uncover the crystal." className="mine-mission" bodyClassName="mine-equation" style={{ position: 'relative', top: 0, transform: 'none' }}>
          {question.a} × {question.b} = ?
        </GameQuestionCard>
        <div className="mine-playfield" data-mine-playfield="true">
          <div className="mine-ground" aria-hidden="true" />
          <div ref={oreRef} className={`mine-ore ${phase === 'treasure' ? 'is-recovered' : ''}`}>
            <img data-mine-rock="true" data-rock-health={rockHealth} src={oreSource} alt={phase === 'treasure' ? 'The recovered crystal inside its opened ore boulder' : 'A heavy crystal ore boulder developing cracks with each accurate strike'} draggable={false} />
            <span className="mine-seam-light" aria-hidden="true" />
            {struck && !reducedMotion && !sessionState?.paused && <div key={impactTick} className="mine-impact" aria-hidden="true">
              <svg className="mine-pick-strike" viewBox="0 0 120 120"><path d="M27 94 86 29" stroke="#132b40" strokeWidth="13" strokeLinecap="round" /><path d="M27 94 86 29" stroke="#bd813b" strokeWidth="7" strokeLinecap="round" /><path d="M52 27 Q82 6 111 37 L101 42 Q79 26 56 37Z" fill="#c8e6f0" stroke="#173449" strokeWidth="5" strokeLinejoin="round" /><path d="M85 17 87 34" stroke="#f4d58b" strokeWidth="7" /></svg>
              {Array.from({ length: phase === 'exploding' ? 12 : 7 }, (_, index) => <span key={index} className={index % 3 === 0 ? 'mine-spark' : 'mine-chip'} style={{ '--chip-x': `${Math.cos(index * 2.3) * (64 + index * 5)}px`, '--chip-y': `${-32 - (index % 4) * 17}px`, '--chip-turn': `${index * 41 - 90}deg` } as React.CSSProperties} />)}
            </div>}
            {phase === 'treasure' && <div className="mine-recovered-label">Crystal recovered</div>}
          </div>
          <div className="mine-strength" role="progressbar" aria-label="Ore strength remaining" aria-valuemin={0} aria-valuemax={ROCK_MAX_HEALTH} aria-valuenow={rockHealth} data-mine-strength={rockHealth}>
            <span>{rockHealth === 0 ? 'Seam cleared' : `${rockHealth} ${rockHealth === 1 ? 'strike' : 'strikes'} to clear`}</span>
            <div aria-hidden="true">{Array.from({ length: ROCK_MAX_HEALTH }, (_, index) => <i key={index} className={index < rockHealth ? 'is-solid' : ''} />)}</div>
          </div>
        </div>
        <div className="answer-choice-surface mine-answers" data-mine-answers="true">
          {question.options.map((option) => <button key={`${question.a}x${question.b}-${option}`} type="button" data-mine-answer={option} aria-label={`Strike with ${option}`} onClick={() => solveQuestion(option)} disabled={locked || phase !== 'playing' || runEnded || !isPresent || Boolean(sessionState?.paused)} className={selectedChoice === option ? struck ? 'ui-button-success' : 'mine-answer-error ui-button-secondary' : 'ui-button-secondary'}>{option}</button>)}
        </div>
        <p className={`mine-feedback ${feedback?.tone ?? ''}`} role="status" aria-live="polite" data-mine-feedback="true">{feedback?.text ?? 'Choose the result to strike the ore.'}</p>
      </div>
    </div>
  );
};

export default MultiplicationMineGame;
