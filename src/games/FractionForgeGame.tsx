import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Hammer, RotateCcw } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import GameplaySceneBackdrop from '../components/GameplaySceneBackdrop';
import PracticeIntroPopup from '../components/game-ui/PracticeIntroPopup';
import { GameQuestionCard } from '../components/game-ui/GameUiKit';
import fractionForgeBackground from '../assets/maps/premium/fraction-forge.webp';
import { triggerHaptic } from '../haptics';
import { MiniGameShellContractProps } from '../app/gameplaySessionContract';
import './fraction-forge.css';

interface FractionForgeGameProps extends MiniGameShellContractProps {
  levelId: number;
  miniGameLevel?: number;
  avatarId: string;
  useSharedTopHud?: boolean;
  isBoss?: boolean;
  onVictory: (stars: number, XP: number) => void;
  onGameOver: (XP: number) => void;
  onBack: () => void;
}

type Operation = '+' | '-';
type Fraction = { numerator: number; denominator: number };
type FractionCard = Fraction & { id: string };
interface ForgeRound {
  id: string;
  target: Fraction;
  cards: FractionCard[];
  operators: Operation[];
  solutionIds: string[];
  prompt: string;
}

// A commission is written as the actual calculation used to cast its target.
// Cycling through eight recipes per tier prevents repeats within a run.
const RECIPES: readonly (readonly string[])[] = [
  ['1/4+2/4', '1/5+2/5', '2/7+3/7', '1/8+4/8', '2/6+3/6', '3/8+4/8', '2/9+3/9', '1/10+6/10'],
  ['3/4-1/4', '4/5-1/5', '5/6-2/6', '6/7-2/7', '7/8-3/8', '5/9+2/9', '3/10+4/10', '7/12-5/12'],
  ['1/2+1/4', '1/3+1/6', '2/5+1/10', '1/4+3/8', '2/3+1/6', '1/5+1/2', '1/3+1/4', '3/5+1/4'],
  ['2/3+1/4', '5/6-1/3', '3/4+2/3', '7/8-1/4', '5/4-1/2', '2/5+3/4', '7/6-1/3', '5/8+2/3'],
  ['1/2+2/3-1/4', '5/4+1/3-1/2', '3/4+5/6-1/3', '7/8+2/3-1/4', '5/6+3/4-1/2', '2/3+5/8-1/6', '3/2-1/4+2/3', '7/6+3/5-1/2'],
];
const DISTRACTORS = ['1/8', '1/6', '1/5', '1/4', '1/3', '3/8', '2/5', '1/2', '3/5', '2/3', '3/4', '4/5', '5/6', '7/8', '5/4', '4/3', '3/2', '1/10', '3/10', '5/8', '7/10', '7/12', '2/9', '5/9'];
const gcd = (a: number, b: number): number => b === 0 ? Math.abs(a) : gcd(b, a % b);
const simplify = (value: Fraction): Fraction => {
  const divisor = gcd(value.numerator, value.denominator);
  return { numerator: value.numerator / divisor, denominator: value.denominator / divisor };
};
const fractionKey = (value: Fraction) => {
  const result = simplify(value);
  return `${result.numerator}/${result.denominator}`;
};
const fractionLabel = (value: Fraction) => value.denominator === 1 ? String(value.numerator) : `${value.numerator}/${value.denominator}`;
const parseFraction = (text: string): Fraction => {
  const [numerator, denominator] = text.split('/').map(Number);
  return { numerator, denominator };
};
const calculateRecipe = (parts: readonly Fraction[], operators: readonly Operation[]): Fraction => (
  parts.slice(1).reduce((value, part, index) => simplify({
    numerator: value.numerator * part.denominator + (operators[index] === '+' ? 1 : -1) * part.numerator * value.denominator,
    denominator: value.denominator * part.denominator,
  }), parts[0])
);
const shuffle = <T,>(items: readonly T[]): T[] => {
  const copy = [...items];
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const other = Math.floor(Math.random() * (index + 1));
    [copy[index], copy[other]] = [copy[other], copy[index]];
  }
  return copy;
};

const makeRound = (level: number, roundIndex: number, runOffset = 0): ForgeRound => {
  const tier = Math.max(1, Math.min(5, level));
  const recipes = RECIPES[tier - 1];
  const recipe = recipes[(roundIndex - 1 + runOffset) % recipes.length];
  const pieces = recipe.split(/([+-])/);
  const solution = pieces.filter((_, index) => index % 2 === 0).map(parseFraction);
  const operators = pieces.filter((_, index) => index % 2 === 1) as Operation[];
  const bankSize = [4, 5, 5, 6, 7][tier - 1];
  const denominator = solution[0].denominator;
  const sameDenominator = Array.from({ length: denominator }, (_, index) => `${index + 1}/${denominator}`);
  const pool = tier <= 2 ? [...sameDenominator, ...DISTRACTORS] : [...DISTRACTORS, ...recipes.flatMap((entry) => entry.split(/[+-]/))];
  const chosen = [...solution];
  const seen = new Set(chosen.map(fractionKey));
  const offset = (roundIndex + runOffset) % pool.length;
  for (const text of [...pool.slice(offset), ...pool.slice(0, offset)]) {
    if (chosen.length >= bankSize) break;
    const candidate = parseFraction(text);
    const key = fractionKey(candidate);
    if (seen.has(key)) continue;
    seen.add(key);
    chosen.push(candidate);
  }
  const indexed = chosen.map((value, index) => ({ ...value, id: `ff-${tier}-${roundIndex}-${index}-${value.numerator}-${value.denominator}` }));
  const target = calculateRecipe(solution, operators);
  return {
    id: `forge-${tier}-${roundIndex}-${runOffset}`,
    target,
    cards: shuffle(indexed),
    operators,
    solutionIds: indexed.slice(0, solution.length).map((card) => card.id),
    prompt: `Choose ${solution.length} fraction ingots to make ${fractionLabel(target)}.`,
  };
};

const FractionGlyph: React.FC<{ value: Fraction }> = ({ value }) => (
  <span className="ff-fraction" aria-hidden="true"><span>{value.numerator}</span><span className="ff-fraction-bar" /><span>{value.denominator}</span></span>
);

const FractionForgeGame: React.FC<FractionForgeGameProps> = ({
  levelId, miniGameLevel, avatarId: _avatarId, useSharedTopHud: _useSharedTopHud = false,
  isBoss: _isBoss = false, isPractice = false, practiceBriefing, gameTitle,
  sessionState, sessionEvents, onVictory, onGameOver, onBack: _onBack,
}) => {
  const tier = Math.max(1, Math.min(5, miniGameLevel || levelId || 1));
  const runOffsetRef = useRef(Math.floor(Math.random() * 8));
  const [roundIndex, setRoundIndex] = useState(1);
  const [round, setRound] = useState(() => makeRound(tier, 1, runOffsetRef.current));
  const [slots, setSlots] = useState<Array<string | null>>(() => Array(round.solutionIds.length).fill(null));
  const [score, setScore] = useState(0);
  const [completed, setCompleted] = useState(0);
  const [wrongCount, setWrongCount] = useState(0);
  const [streak, setStreak] = useState(0);
  const [localLives, setLocalLives] = useState(3);
  const [localTimeLeft, setLocalTimeLeft] = useState(90);
  const [resolving, setResolving] = useState(false);
  const [feedback, setFeedback] = useState<{ tone: 'success' | 'error' | 'info'; message: string } | null>(null);
  const [strikeState, setStrikeState] = useState<'idle' | 'success' | 'error'>('idle');
  const [strikeTick, setStrikeTick] = useState(0);
  const [showPracticeIntro, setShowPracticeIntro] = useState(Boolean(isPractice));
  const endedRef = useRef(false);
  const pendingRef = useRef<number[]>([]);
  const totalRounds = [4, 4, 5, 5, 6][tier - 1];
  const timeLeft = sessionState?.timeLeft ?? localTimeLeft;
  const totalTime = sessionState?.totalTime ?? 90;
  const heatPercent = Math.max(0, Math.min(100, timeLeft / Math.max(1, totalTime) * 100));

  const clearPending = useCallback(() => {
    pendingRef.current.forEach((id) => window.clearTimeout(id));
    pendingRef.current = [];
  }, []);
  const delay = useCallback((callback: () => void, milliseconds: number) => {
    pendingRef.current.push(window.setTimeout(callback, milliseconds));
  }, []);
  const beginRound = useCallback((next: ForgeRound) => {
    setRound(next);
    setSlots(Array(next.solutionIds.length).fill(null));
    setFeedback(null);
    setStrikeState('idle');
    setResolving(false);
  }, []);

  useEffect(() => {
    clearPending();
    endedRef.current = false;
    runOffsetRef.current = Math.floor(Math.random() * 8);
    setRoundIndex(1);
    setScore(0);
    setCompleted(0);
    setWrongCount(0);
    setStreak(0);
    setLocalLives(3);
    setLocalTimeLeft(90);
    beginRound(makeRound(tier, 1, runOffsetRef.current));
    return clearPending;
  }, [beginRound, clearPending, tier]);
  useEffect(() => setShowPracticeIntro(Boolean(isPractice)), [isPractice]);
  useEffect(() => {
    if (sessionState || isPractice) return;
    const id = window.setInterval(() => setLocalTimeLeft((previous) => Math.max(0, previous - 1)), 1000);
    return () => window.clearInterval(id);
  }, [isPractice, sessionState]);
  useEffect(() => {
    if (sessionState || localTimeLeft > 0 || endedRef.current) return;
    endedRef.current = true;
    onGameOver(score);
  }, [localTimeLeft, onGameOver, score, sessionState]);

  const addIngredient = (cardId: string) => {
    if (endedRef.current || resolving || slots.includes(cardId)) return;
    const openIndex = slots.findIndex((id) => id === null);
    if (openIndex < 0) {
      setFeedback({ tone: 'info', message: 'Tap an ingot on the anvil to make room.' });
      return;
    }
    setSlots((previous) => previous.map((id, index) => index === openIndex ? cardId : id));
    setFeedback(null);
    setStrikeState('idle');
    triggerHaptic('selection');
  };
  const removeIngredient = (index: number) => {
    if (endedRef.current || resolving || slots[index] === null) return;
    setSlots((previous) => previous.map((id, position) => position === index ? null : id));
    setFeedback(null);
    setStrikeState('idle');
    triggerHaptic('selection');
  };
  const strike = () => {
    if (endedRef.current || resolving || slots.some((id) => id === null)) return;
    const selected = slots.map((id) => round.cards.find((card) => card.id === id)).filter((card): card is FractionCard => Boolean(card));
    if (selected.length !== slots.length) return;
    const result = calculateRecipe(selected, round.operators);
    const correct = fractionKey(result) === fractionKey(round.target);
    setResolving(true);
    setStrikeState(correct ? 'success' : 'error');
    setStrikeTick((previous) => previous + 1);
    if (correct) {
      const nextStreak = streak + 1;
      const gained = 130 + Math.floor(heatPercent / 3) + (nextStreak % 3 === 0 ? 50 : 0);
      const nextScore = score + gained;
      const nextCompleted = completed + 1;
      setStreak(nextStreak);
      setScore(nextScore);
      setCompleted(nextCompleted);
      setFeedback({ tone: 'success', message: nextStreak % 3 === 0 ? `Perfect run! +${gained} XP.` : `Clean strike! +${gained} XP.` });
      triggerHaptic('success');
      sessionEvents?.onCorrectAnswer?.({ type: 'correct_answer', score: nextScore, metadata: { target: fractionLabel(round.target) } });
      sessionEvents?.onPuzzleComplete?.({ type: 'puzzle_complete', score: nextScore });
      if (nextCompleted >= totalRounds) {
        endedRef.current = true;
        const stars = wrongCount === 0 ? 3 : wrongCount === 1 ? 2 : 1;
        delay(() => {
          sessionEvents?.onGameComplete?.({ type: 'game_complete', score: nextScore, stars });
          onVictory(stars, nextScore);
        }, 850);
      } else {
        delay(() => {
          const nextIndex = roundIndex + 1;
          setRoundIndex(nextIndex);
          beginRound(makeRound(tier, nextIndex, runOffsetRef.current));
        }, 900);
      }
      return;
    }
    setWrongCount((previous) => previous + 1);
    setStreak(0);
    setFeedback({ tone: 'error', message: `That makes ${fractionLabel(result)}. Target: ${fractionLabel(round.target)}. Recut an ingot.` });
    triggerHaptic('error');
    sessionEvents?.onIncorrectAnswer?.({ type: 'incorrect_answer', score, metadata: { result: fractionLabel(result), target: fractionLabel(round.target) } });
    if (!sessionState && !isPractice) {
      const nextLives = localLives - 1;
      setLocalLives(nextLives);
      if (nextLives <= 0) {
        endedRef.current = true;
        delay(() => onGameOver(score), 650);
        return;
      }
    }
    delay(() => setResolving(false), 560);
  };

  return (
    <div className="fraction-forge-game relative h-full w-full select-none overflow-hidden" data-fraction-forge data-fraction-tier={tier} data-strike-state={strikeState}>
      <GameplaySceneBackdrop gameType="take_out_rush" backgroundOverride={fractionForgeBackground} />
      <div className="ff-scrim" aria-hidden="true" />
      <PracticeIntroPopup open={showPracticeIntro} title={gameTitle || 'Fraction Forge'} body="The workshop needs a precise fraction alloy. Choose the ingots, then strike the anvil to test your recipe." briefing={practiceBriefing} onAction={() => setShowPracticeIntro(false)} />
      <div className="ff-ui">
        <div className="ff-brief">
          <GameQuestionCard title={gameTitle || 'Fraction Forge'} className="ff-question" style={{ position: 'relative', top: 'auto', left: 'auto', right: 'auto', width: '100%', transform: 'none' }}>{round.prompt}</GameQuestionCard>
        </div>
        <div className="ff-meta" aria-label={`Commission ${roundIndex} of ${totalRounds}; ${score} XP`}>
          <span>COMMISSION {roundIndex} / {totalRounds}</span>
          <div className="ff-heat-track" role="progressbar" aria-label="Forge heat" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(heatPercent)}><div className="ff-heat-fill" style={{ width: `${heatPercent}%` }} /></div>
          <span>XP {score}</span>
        </div>
        <div className="ff-workspace">
          <div className="ff-anvil-zone">
            <div className="ff-target"><span>FORGE TARGET</span><strong className="ff-target-value" data-forge-target>{fractionLabel(round.target)}</strong></div>
            <motion.div key={strikeTick} className="ff-hammer" data-strike-state={strikeState} aria-hidden="true"><Hammer /></motion.div>
            <div className="ff-anvil">
              <div className="ff-recipe" aria-label="Fraction recipe">
                {slots.map((cardId, index) => {
                  const card = round.cards.find((entry) => entry.id === cardId);
                  return (
                    <React.Fragment key={`${round.id}-slot-${index}`}>
                      {index > 0 ? <span className="ff-operator" aria-label={round.operators[index - 1] === '+' ? 'plus' : 'minus'}>{round.operators[index - 1]}</span> : null}
                      <button type="button" data-forge-slot={index + 1} data-button-skin="none" className={`ff-slot ${card ? 'ff-slot-filled' : ''}`} disabled={!card || resolving} onClick={() => removeIngredient(index)} aria-label={card ? `Remove fraction ${card.numerator} over ${card.denominator} from mould ${index + 1}` : `Empty forge mould ${index + 1}`}>
                        {card ? <FractionGlyph value={card} /> : <span className="ff-slot-number">{index + 1}</span>}
                      </button>
                    </React.Fragment>
                  );
                })}
              </div>
              <div className="ff-anvil-base" aria-hidden="true" />
              <AnimatePresence>{strikeState === 'success' ? <motion.div key={`sparks-${strikeTick}`} className="ff-spark-burst" aria-hidden="true" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>{Array.from({ length: 10 }, (_, index) => <span key={index} className="ff-spark" style={{ '--spark-index': index } as React.CSSProperties} />)}</motion.div> : null}</AnimatePresence>
            </div>
            <div className="ff-progress" aria-label={`${completed} of ${totalRounds} commissions forged`}>
              {Array.from({ length: totalRounds }, (_, index) => <span key={index} className="ff-progress-mark" data-complete={index < completed ? 'true' : 'false'} aria-hidden="true" />)}
            </div>
          </div>
          <div className="ff-tray">
            <div className="ff-tray-title"><strong>INGOT RACK</strong><span>Tap pieces in equation order</span></div>
            <div className="ff-bank">
              {round.cards.map((card) => {
                const used = slots.includes(card.id);
                return <button type="button" key={card.id} data-forge-ingredient={card.id} data-button-skin="none" className={`ff-ingredient ${used ? 'ff-ingredient-used' : ''}`} disabled={used || resolving} onClick={() => addIngredient(card.id)} aria-label={`Add fraction ${card.numerator} over ${card.denominator} to the anvil`} aria-pressed={used}><FractionGlyph value={card} /></button>;
              })}
            </div>
            <div className="ff-controls">
              <button type="button" data-button-skin="none" className="ff-reset" onClick={() => { setSlots(Array(round.solutionIds.length).fill(null)); setFeedback(null); setStrikeState('idle'); }} disabled={resolving || slots.every((id) => id === null)} aria-label="Clear the anvil"><RotateCcw aria-hidden="true" />Clear</button>
              <button type="button" data-button-skin="none" className="ff-strike" data-forge-strike onClick={strike} disabled={resolving || slots.some((id) => id === null)}><Hammer aria-hidden="true" />Strike</button>
            </div>
            <div className="ff-feedback" data-forge-feedback data-tone={feedback?.tone || 'info'} role="status" aria-live="polite">{feedback?.message || (tier <= 2 ? 'Same denominator? Work with the numerators.' : 'Find common-sized parts before you strike.')}</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FractionForgeGame;
