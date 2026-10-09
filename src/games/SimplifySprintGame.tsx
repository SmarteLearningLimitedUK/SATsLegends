import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ChevronLeft, Heart, Timer, Zap } from 'lucide-react';
import GameplaySceneBackdrop from '../components/GameplaySceneBackdrop';
import PracticeIntroPopup from '../components/game-ui/PracticeIntroPopup';
import { GameQuestionCard } from '../components/game-ui/GameUiKit';
import { MiniGameShellContractProps } from '../app/gameplaySessionContract';
import { AVATARS } from '../constants';
import { useTrimmedImageSource } from '../utils/trimTransparentImage';
import { triggerHaptic } from '../haptics';
import simplifySprintBackground from '../assets/maps/premium/simplify-sprint.webp';
import './simplify-sprint.css';

interface SimplifySprintGameProps extends MiniGameShellContractProps {
  levelId: number;
  miniGameLevel?: number;
  avatarId: string;
  useSharedTopHud?: boolean;
  isBoss?: boolean;
  onVictory: (stars: number, XP: number) => void;
  onGameOver: (XP: number) => void;
  onBack: () => void;
}

interface FractionPair {
  numerator: number;
  denominator: number;
}

interface SprintQuestion {
  id: string;
  prompt: FractionPair;
  answer: FractionPair;
}

type SprintPhase = 'idle' | 'dash' | 'burst' | 'crash' | 'checkpoint';
type FeedbackTone = 'info' | 'success' | 'error';

const BASES: readonly (readonly FractionPair[])[] = [
  [{ numerator: 1, denominator: 2 }, { numerator: 1, denominator: 3 }, { numerator: 2, denominator: 3 }, { numerator: 1, denominator: 4 }, { numerator: 3, denominator: 4 }],
  [{ numerator: 1, denominator: 2 }, { numerator: 2, denominator: 3 }, { numerator: 1, denominator: 4 }, { numerator: 3, denominator: 4 }, { numerator: 2, denominator: 5 }, { numerator: 3, denominator: 5 }, { numerator: 4, denominator: 5 }, { numerator: 5, denominator: 6 }],
  [{ numerator: 2, denominator: 3 }, { numerator: 3, denominator: 4 }, { numerator: 2, denominator: 5 }, { numerator: 3, denominator: 5 }, { numerator: 5, denominator: 6 }, { numerator: 3, denominator: 7 }, { numerator: 4, denominator: 7 }, { numerator: 5, denominator: 8 }, { numerator: 7, denominator: 8 }, { numerator: 7, denominator: 10 }],
  [{ numerator: 3, denominator: 5 }, { numerator: 5, denominator: 6 }, { numerator: 4, denominator: 7 }, { numerator: 7, denominator: 8 }, { numerator: 5, denominator: 9 }, { numerator: 7, denominator: 9 }, { numerator: 7, denominator: 12 }, { numerator: 11, denominator: 12 }, { numerator: 9, denominator: 16 }, { numerator: 11, denominator: 16 }],
  [{ numerator: 5, denominator: 4 }, { numerator: 7, denominator: 5 }, { numerator: 9, denominator: 7 }, { numerator: 11, denominator: 8 }, { numerator: 5, denominator: 9 }, { numerator: 7, denominator: 12 }, { numerator: 11, denominator: 12 }, { numerator: 13, denominator: 16 }, { numerator: 17, denominator: 20 }, { numerator: 19, denominator: 24 }, { numerator: 7, denominator: 10 }, { numerator: 13, denominator: 18 }],
];
const MULTIPLIERS: readonly (readonly number[])[] = [
  [2, 3, 4],
  [2, 3, 4, 5],
  [3, 4, 5, 6],
  [4, 5, 6, 8, 9],
  [5, 6, 8, 9, 10, 12],
];
const ROUNDS_PER_TIER = [5, 5, 6, 6, 7];

const gcd = (a: number, b: number): number => {
  let x = Math.abs(a);
  let y = Math.abs(b);
  while (y !== 0) {
    const remainder = x % y;
    x = y;
    y = remainder;
  }
  return Math.max(1, x);
};
const fractionLabel = (pair: FractionPair) => pair.numerator + '/' + pair.denominator;
const sameFraction = (a: FractionPair, b: FractionPair) => a.numerator === b.numerator && a.denominator === b.denominator;

// Seven is coprime to every deck length, so a run visits distinct prompts.
const makeQuestion = (level: number, round: number, runOffset = 0): SprintQuestion => {
  const tier = Math.max(1, Math.min(5, level));
  const bases = BASES[tier - 1];
  const multipliers = MULTIPLIERS[tier - 1];
  const deckLength = bases.length * multipliers.length;
  const index = ((runOffset + (round - 1) * 7) % deckLength + deckLength) % deckLength;
  const base = bases[Math.floor(index / multipliers.length)];
  const multiplier = multipliers[index % multipliers.length];
  return {
    id: 'sprint-' + tier + '-' + index,
    prompt: { numerator: base.numerator * multiplier, denominator: base.denominator * multiplier },
    answer: { ...base },
  };
};

// Every junction has a safe route and a trap. Later tiers can offer two valid
// routes: the greatest common factor is the one-step shortcut.
const getFactorChoices = (pair: FractionPair, tier: number, seed: number): number[] => {
  const greatest = gcd(pair.numerator, pair.denominator);
  if (greatest <= 1) return [2, 3, 4];
  const valid = Array.from({ length: greatest - 1 }, (_, index) => index + 2)
    .filter((factor) => pair.numerator % factor === 0 && pair.denominator % factor === 0);
  const smaller = valid.filter((factor) => factor < greatest);
  const safe = [greatest];
  if (tier >= 2 && smaller.length > 0 && (tier >= 4 || seed % 3 === 0)) {
    safe.push(smaller[Math.abs(seed) % smaller.length]);
  }
  const decoys = Array.from({ length: Math.max(18, greatest + 7) - 1 }, (_, index) => index + 2)
    .filter((factor) => pair.numerator % factor !== 0 || pair.denominator % factor !== 0)
    .sort((a, b) => Math.abs(a - greatest) - Math.abs(b - greatest) || a - b);
  const selected = [...safe];
  for (let index = 0; selected.length < 3; index++) {
    const decoy = decoys[(Math.abs(seed) + index) % decoys.length];
    if (!selected.includes(decoy)) selected.push(decoy);
  }
  const rotation = Math.abs(seed) % 3;
  return [...selected.slice(rotation), ...selected.slice(0, rotation)];
};

const SimplifySprintGame: React.FC<SimplifySprintGameProps> = ({
  levelId, miniGameLevel, avatarId, useSharedTopHud = false, isBoss: _isBoss = false,
  isPractice = false, practiceBriefing, gameTitle, sessionState, sessionEvents,
  onVictory, onGameOver, onBack,
}) => {
  const tier = Math.max(1, Math.min(5, miniGameLevel || levelId || 1));
  const totalRounds = ROUNDS_PER_TIER[tier - 1];
  const runOffsetRef = useRef(Math.floor(Math.random() * 70));
  const [question, setQuestion] = useState(() => makeQuestion(tier, 1, runOffsetRef.current));
  const [currentPair, setCurrentPair] = useState<FractionPair>(() => question.prompt);
  const [roundIndex, setRoundIndex] = useState(1);
  const [stepIndex, setStepIndex] = useState(0);
  const [cleared, setCleared] = useState(0);
  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(0);
  const [mistakes, setMistakes] = useState(0);
  const [localLives, setLocalLives] = useState(3);
  const [localTimeLeft, setLocalTimeLeft] = useState(90);
  const [phase, setPhase] = useState<SprintPhase>('idle');
  const [selectedLane, setSelectedLane] = useState(2);
  const [locked, setLocked] = useState(false);
  const [feedback, setFeedback] = useState<{ tone: FeedbackTone; text: string }>({
    tone: 'info', text: 'Find a common factor. Biggest one = shortcut!',
  });
  const [showPracticeIntro, setShowPracticeIntro] = useState(Boolean(isPractice));
  const endedRef = useRef(false);
  const pendingRef = useRef<number[]>([]);
  const scoreRef = useRef(score);
  scoreRef.current = score;
  const timeLeft = sessionState?.timeLeft ?? localTimeLeft;
  const lives = sessionState?.lives ?? localLives;
  const totalTime = sessionState?.totalTime ?? 90;
  const dangerPercent = isPractice ? Math.min(42, 8 + mistakes * 8) : Math.min(88, 8 + (1 - timeLeft / Math.max(1, totalTime)) * 62 + mistakes * 8);
  const gates = useMemo(
    () => getFactorChoices(currentPair, tier, roundIndex * 17 + stepIndex * 31),
    [currentPair, tier, roundIndex, stepIndex],
  );
  const avatar = AVATARS.find((entry) => entry.id === avatarId) ?? AVATARS[0];
  const heroImage = useTrimmedImageSource(avatar.image);

  const clearPending = useCallback(() => {
    pendingRef.current.forEach((id) => window.clearTimeout(id));
    pendingRef.current = [];
  }, []);
  const delay = useCallback((callback: () => void, milliseconds: number) => {
    pendingRef.current.push(window.setTimeout(callback, milliseconds));
  }, []);

  useEffect(() => {
    clearPending();
    endedRef.current = false;
    runOffsetRef.current = Math.floor(Math.random() * 70);
    const first = makeQuestion(tier, 1, runOffsetRef.current);
    setQuestion(first);
    setCurrentPair(first.prompt);
    setRoundIndex(1);
    setStepIndex(0);
    setCleared(0);
    setScore(0);
    setCombo(0);
    setMistakes(0);
    setLocalLives(3);
    setLocalTimeLeft(90);
    setPhase('idle');
    setSelectedLane(2);
    setLocked(false);
    setFeedback({ tone: 'info', text: 'Find a common factor. Biggest one = shortcut!' });
    return clearPending;
  }, [tier, clearPending]);
  useEffect(() => setShowPracticeIntro(Boolean(isPractice)), [isPractice]);
  useEffect(() => {
    if (sessionState || isPractice || showPracticeIntro) return undefined;
    const timer = window.setInterval(() => {
      if (!document.hidden) setLocalTimeLeft((previous) => Math.max(0, previous - 1));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [sessionState, isPractice, showPracticeIntro]);
  useEffect(() => {
    if (sessionState || isPractice || localTimeLeft > 0 || endedRef.current) return;
    endedRef.current = true;
    sessionEvents?.onGameFailed?.({ type: 'game_failed', score: scoreRef.current, reason: 'time' });
    onGameOver(scoreRef.current);
  }, [sessionState, isPractice, localTimeLeft, onGameOver, sessionEvents]);

  const chooseGate = useCallback((lane: number) => {
    if (locked || endedRef.current || showPracticeIntro || sessionState?.paused) return;
    const factor = gates[lane - 1];
    if (!factor) return;
    setSelectedLane(lane);
    setLocked(true);
    setPhase('dash');
    setFeedback({ tone: 'info', text: 'Running for ÷' + factor + '…' });
    triggerHaptic('selection');
    delay(() => {
      const safe = currentPair.numerator % factor === 0 && currentPair.denominator % factor === 0;
      if (!safe) {
        setPhase('crash');
        setMistakes((previous) => previous + 1);
        setCombo(0);
        setFeedback({ tone: 'error', text: '÷' + factor + ' cannot divide both ' + currentPair.numerator + ' and ' + currentPair.denominator + '. Try another gate.' });
        triggerHaptic('error');
        sessionEvents?.onIncorrectAnswer?.({
          type: 'incorrect_answer', score,
          metadata: { prompt: fractionLabel(currentPair), factor },
        });
        if (!sessionState && !isPractice) {
          const nextLives = localLives - 1;
          setLocalLives(nextLives);
          if (nextLives <= 0) {
            endedRef.current = true;
            delay(() => {
              sessionEvents?.onGameFailed?.({ type: 'game_failed', score, reason: 'lives' });
              onGameOver(score);
            }, 620);
            return;
          }
        }
        delay(() => { setPhase('idle'); setLocked(false); }, 690);
        return;
      }

      const reduced = {
        numerator: currentPair.numerator / factor,
        denominator: currentPair.denominator / factor,
      };
      const fastest = factor === gcd(currentPair.numerator, currentPair.denominator);
      const nextCombo = combo + 1;
      const checkpoint = sameFraction(reduced, question.answer);
      const gained = 45 + factor * 5 + (fastest ? 35 : 0) + Math.min(5, combo) * 8 + (checkpoint ? 70 : 0);
      const nextScore = score + gained;
      setCurrentPair(reduced);
      setScore(nextScore);
      setCombo(nextCombo);
      setPhase(checkpoint ? 'checkpoint' : 'burst');
      setFeedback({
        tone: 'success',
        text: checkpoint
          ? fractionLabel(question.prompt) + ' → ' + fractionLabel(reduced) + '. Checkpoint clear! +' + gained + ' XP'
          : 'Both numbers ÷' + factor + '. ' + (fastest ? 'Fast route!' : 'Keep reducing!') + ' +' + gained + ' XP',
      });
      triggerHaptic('success');
      sessionEvents?.onCorrectAnswer?.({
        type: 'correct_answer', score: nextScore,
        metadata: { factor, reduced: fractionLabel(reduced), fastest },
      });

      if (!checkpoint) {
        setStepIndex((previous) => previous + 1);
        delay(() => { setPhase('idle'); setLocked(false); }, 680);
        return;
      }
      const nextCleared = cleared + 1;
      setCleared(nextCleared);
      sessionEvents?.onPuzzleComplete?.({ type: 'puzzle_complete', score: nextScore });
      if (nextCleared >= totalRounds) {
        endedRef.current = true;
        const stars = mistakes === 0 ? 3 : mistakes <= 2 ? 2 : 1;
        const finish = () => {
          sessionEvents?.onGameComplete?.({ type: 'game_complete', score: nextScore, stars });
          onVictory(stars, nextScore);
        };
        if (timeLeft <= 2) finish();
        else delay(finish, 750);
        return;
      }
      delay(() => {
        const nextRound = roundIndex + 1;
        const nextQuestion = makeQuestion(tier, nextRound, runOffsetRef.current);
        setRoundIndex(nextRound);
        setQuestion(nextQuestion);
        setCurrentPair(nextQuestion.prompt);
        setStepIndex(0);
        setSelectedLane(2);
        setPhase('idle');
        setLocked(false);
        setFeedback({ tone: 'info', text: 'New checkpoint. Pick a common factor.' });
      }, 870);
    }, 380);
  }, [
    locked, showPracticeIntro, sessionState, gates, delay, currentPair, score, combo,
    question, cleared, totalRounds, timeLeft, mistakes, localLives, isPractice,
    sessionEvents, onGameOver, onVictory, roundIndex, tier,
  ]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.repeat || event.altKey || event.ctrlKey || event.metaKey) return;
      if (event.target instanceof HTMLElement && event.target.closest('input, textarea, select, [contenteditable="true"]')) return;
      const lane = Number(event.key);
      if (lane >= 1 && lane <= 3) chooseGate(lane);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [chooseGate]);

  return (
    <div
      className="simplify-sprint-game ss-game"
      data-simplify-sprint
      data-phase={phase}
      data-tier={tier}
      style={{ '--ss-background': 'url(' + simplifySprintBackground + ')' } as React.CSSProperties}
    >
      <GameplaySceneBackdrop gameType="fraction_match" backgroundOverride={simplifySprintBackground} />
      <div className="ss-scrim" aria-hidden="true" />
      <PracticeIntroPopup
        open={showPracticeIntro}
        title={gameTitle || 'Simplify Sprint'}
        body="The forest route is blocked by factor gates. Choose a number that divides both parts of the fraction to sprint through."
        briefing={practiceBriefing}
        onAction={() => setShowPracticeIntro(false)}
      />
      <div className="ss-layout">
        <div className="ss-top">
          <GameQuestionCard
            title={gameTitle || 'Simplify Sprint'}
            className="ss-question"
            style={{ position: 'relative', top: 'auto', left: 'auto', right: 'auto', width: '100%', transform: 'none' }}
          >
            Reduce <strong>{fractionLabel(currentPair)}</strong>. Pick a gate that divides the top and bottom.
          </GameQuestionCard>
          <div className="ss-stats" aria-label={'Checkpoint ' + roundIndex + ' of ' + totalRounds + ', combo ' + combo + ', ' + score + ' XP'}>
            {!useSharedTopHud && <button type="button" className="ss-back" data-button-skin="none" onClick={onBack} aria-label="Back"><ChevronLeft /></button>}
            <div className="ss-stat"><span>CHECKPOINT</span><strong className="ss-stat-value">{roundIndex} / {totalRounds}</strong></div>
            <div className="ss-stat"><span><Zap aria-hidden="true" /> COMBO</span><strong className="ss-stat-value">×{combo}</strong></div>
            <div className="ss-stat"><span>XP</span><strong className="ss-stat-value">{score}</strong></div>
            <div className="ss-stat ss-stat-clock"><span>{isPractice ? <Heart aria-hidden="true" /> : <Timer aria-hidden="true" />}{isPractice ? 'PRACTICE' : 'TIME'}</span><strong className="ss-stat-value">{isPractice ? '∞' : timeLeft + 's'}</strong></div>
            {!useSharedTopHud && <div className="ss-stat"><span>LIVES</span><strong className="ss-stat-value">{lives}</strong></div>}
          </div>
        </div>
        <div className="ss-arena" data-sprint-arena data-sprint-scene>
          <div className="ss-scene" aria-hidden="true" />
          <div className="ss-speedlines" aria-hidden="true" />
          <div className="ss-arch" aria-hidden="true" />
          <div className="ss-track" aria-hidden="true" />
          <div className="ss-fraction-display" aria-label={'Current fraction ' + fractionLabel(currentPair)}>
            <span className="ss-fraction-label">CARRYING</span>
            <span className="ss-fraction" data-sprint-fraction data-numerator={currentPair.numerator} data-denominator={currentPair.denominator}>
              <span>{currentPair.numerator}</span><span className="ss-bar" /><span>{currentPair.denominator}</span>
            </span>
            <span className="ss-fraction-note">Reduce to lowest terms</span>
          </div>
          <div className="ss-gates" role="group" aria-label="Choose a factor gate">
            {gates.map((factor, index) => (
              <button
                key={question.id + '-' + stepIndex + '-' + factor}
                type="button"
                className="ss-gate"
                data-sprint-gate={factor}
                data-button-skin="none"
                disabled={locked || showPracticeIntro || gcd(currentPair.numerator, currentPair.denominator) === 1}
                onClick={() => chooseGate(index + 1)}
                aria-label={'Run through gate ' + (index + 1) + ': divide both numbers by ' + factor}
              >
                <span className="ss-gate-index">GATE {index + 1}</span>
                <strong className="ss-gate-factor">÷{factor}</strong>
                <span className="ss-gate-label">RUN</span>
              </button>
            ))}
          </div>
          <div className="ss-runner" data-lane={selectedLane} aria-hidden="true">
            <div className="ss-runner-shadow" />
            <img className="ss-runner-image" src={heroImage} alt="" draggable={false} />
            <span className="ss-dust ss-dust-one" /><span className="ss-dust ss-dust-two" />
          </div>
          <div className="ss-slime-front" style={{ width: dangerPercent + '%' }} aria-hidden="true" />
        </div>
        <div className="ss-bottom">
          <div className="ss-feedback" data-sprint-feedback data-tone={feedback.tone} role="status" aria-live="polite">{feedback.text}</div>
          <div className="ss-progress" data-sprint-progress data-cleared={cleared} aria-label={cleared + ' of ' + totalRounds + ' checkpoints cleared'}>
            {Array.from({ length: totalRounds }, (_, index) => <span key={index} className="ss-progress-mark" data-done={index < cleared ? 'true' : 'false'} />)}
          </div>
          <div className="ss-hint">Tap a gate · or press 1, 2, 3</div>
        </div>
      </div>
    </div>
  );
};

export default SimplifySprintGame;
