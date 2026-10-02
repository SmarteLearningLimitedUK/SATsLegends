import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import confetti from 'canvas-confetti';
import { motion, useIsPresent, useReducedMotion } from 'motion/react';
import { AVATARS } from '../constants';
import { GameQuestionCard } from '../components/game-ui/GameUiKit';
import PracticeIntroPopup from '../components/game-ui/PracticeIntroPopup';
import { GameScreenShell } from '../layout/ScreenPrimitives';
import { triggerHaptic } from '../haptics';
import lavaPathBackground from '../assets/maps/premium/lava-path.webp';
import { MiniGameShellContractProps } from '../app/gameplaySessionContract';
import './game-refinements.css';

interface LavaPathGameProps extends MiniGameShellContractProps {
  levelId: number; avatarId: string; useSharedTopHud?: boolean;
  onVictory: (stars: number, XP: number) => void;
  onGameOver: (XP: number) => void; onBack: () => void;
}
interface LavaPathQuestion {
  prompt: string;
  sublabel: string;
  options: string[];
  answerIndex: number;
  conversion: {
    amount: number;
    sourceUnit: string;
    targetUnit: string;
    factor: number;
    extraInTargetUnit?: number;
  };
}
const TOTAL_STEPS = 10;
const MAX_WRONGS = 3;
const STEP_XP = 140;
const STONES = [
  { x: 50, y: 90 }, { x: 25, y: 83.2 }, { x: 65, y: 76.4 }, { x: 36, y: 69.6 },
  { x: 75, y: 62.8 }, { x: 42, y: 56 }, { x: 24, y: 49.2 }, { x: 63, y: 42.4 },
  { x: 37, y: 35.6 }, { x: 70, y: 28.8 }, { x: 50, y: 22 },
];
const randInt = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;
const formatQuantity = (value: number) => Number(value.toFixed(4)).toLocaleString('en-GB', { maximumFractionDigits: 4 });
const shuffle = <T,>(items: T[]) => {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i -= 1) { const j = Math.floor(Math.random() * (i + 1)); [copy[i], copy[j]] = [copy[j], copy[i]]; }
  return copy;
};
const conversionQuestion = (
  prompt: string,
  sublabel: string,
  answer: number,
  unit: string,
  conversion: LavaPathQuestion['conversion'],
): LavaPathQuestion => {
  const value = Number(answer.toFixed(4));
  const wrong = Array.from(new Set([value * 10, value / 10, value * 100, value + 1].map((item) => Number(item.toFixed(4)))))
    .filter((item) => item > 0 && item !== value).slice(0, 3);
  const correct = `${formatQuantity(value)} ${unit}`;
  const options = shuffle([correct, ...wrong.map((item) => `${formatQuantity(item)} ${unit}`)]);
  return { prompt, sublabel, options, answerIndex: options.indexOf(correct), conversion };
};
const resolveQuestion = (tier: number): LavaPathQuestion => {
  if (tier === 5) {
    const category = randInt(0, 2);
    const first = randInt(5, 24) / 4;
    const second = randInt(1, 18) * (category === 0 ? 5 : 50);
    const source = category === 0 ? 'm' : category === 1 ? 'kg' : 'l';
    const target = category === 0 ? 'cm' : category === 1 ? 'g' : 'ml';
    const factor = category === 0 ? 100 : 1000;
    return conversionQuestion(`Combine ${formatQuantity(first)} ${source} and ${second} ${target}. What is the total in ${target}?`,
      `Convert to ${target} first, then add.`, first * factor + second, target,
      { amount: first, sourceUnit: source, targetUnit: target, factor, extraInTargetUnit: second });
  }
  const categories = tier === 1 ? [['m', 'cm', 100]] : tier === 2 ? [['kg', 'g', 1000], ['l', 'ml', 1000]]
    : [['m', 'cm', 100], ['km', 'm', 1000], ['kg', 'g', 1000], ['l', 'ml', 1000]];
  const [large, small, scale] = categories[randInt(0, categories.length - 1)];
  const factor = Number(scale);
  const reverse = Math.random() < .5;
  const amount = tier <= 2 ? randInt(1, 9) : tier === 3 ? randInt(2, 49) / 10 : randInt(5, 495) / 100;
  const sourceAmount = reverse ? amount * factor : amount;
  return conversionQuestion(`Convert ${formatQuantity(sourceAmount)} ${reverse ? small : large} into ${reverse ? large : small}.`,
    `1 ${large} = ${factor.toLocaleString('en-GB')} ${small}.`, reverse ? sourceAmount / factor : sourceAmount * factor, String(reverse ? large : small),
    { amount: sourceAmount, sourceUnit: String(reverse ? small : large), targetUnit: String(reverse ? large : small), factor });
};
const starsForRun = (mistakes: number) => mistakes === 0 ? 3 : mistakes === 1 ? 2 : 1;

const LavaPathGame: React.FC<LavaPathGameProps> = ({ levelId, avatarId, isPractice, practiceBriefing, onVictory, onGameOver, sessionState, sessionEvents }) => {
  const tier = Math.max(1, Math.min(5, levelId || 1));
  const reducedMotion = useReducedMotion();
  const isPresent = useIsPresent();
  const presentRef = useRef(isPresent); presentRef.current = isPresent;
  const [question, setQuestion] = useState(() => resolveQuestion(tier));
  const [score, setScore] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [wrongCount, setWrongCount] = useState(0);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [lensOperation, setLensOperation] = useState<'multiply' | 'divide' | null>(null);
  const [feedback, setFeedback] = useState<'correct' | 'incorrect' | null>(null);
  const [locked, setLocked] = useState(false);
  const [showPracticeIntro, setShowPracticeIntro] = useState(Boolean(isPractice));
  const timersRef = useRef<number[]>([]);
  const finishedRef = useRef(false);
  const answerLockRef = useRef(false);
  const observedPositiveLives = useRef((sessionState?.lives ?? 0) > 0);
  const victoryRef = useRef(onVictory); victoryRef.current = onVictory;
  const gameOverRef = useRef(onGameOver); gameOverRef.current = onGameOver;
  const scoreRef = useRef(score); scoreRef.current = score;
  const sessionRef = useRef(sessionState); sessionRef.current = sessionState;
  const playerAvatar = useMemo(() => AVATARS.find((entry) => entry.id === avatarId) ?? AVATARS[0], [avatarId]);
  const clearTimers = () => { timersRef.current.forEach(window.clearTimeout); timersRef.current = []; };
  const active = () => presentRef.current && !finishedRef.current && !sessionRef.current?.paused;
  useLayoutEffect(() => {
    if (!isPresent) { finishedRef.current = true; answerLockRef.current = true; clearTimers(); }
    return () => clearTimers();
  }, [isPresent]);
  useEffect(() => { setShowPracticeIntro(Boolean(isPractice)); }, [isPractice]);
  useEffect(() => {
    if (!presentRef.current) return;
    clearTimers(); finishedRef.current = false; answerLockRef.current = false;
    setQuestion(resolveQuestion(tier)); setScore(0); setCorrectCount(0); setWrongCount(0);
    setSelectedIndex(null); setLensOperation(null); setFeedback(null); setLocked(false);
  }, [tier]);
  useEffect(() => {
    if ((sessionState?.lives ?? 0) > 0) observedPositiveLives.current = true;
    if (!isPresent || isPractice || !sessionState || !observedPositiveLives.current || sessionState.lives > 0 || finishedRef.current) return;
    finishedRef.current = true; answerLockRef.current = true; clearTimers(); setLocked(true);
    sessionEvents?.onGameFailed?.({ score: scoreRef.current, reason: 'lives' });
  }, [isPresent, isPractice, sessionState, sessionEvents]);
  const finishVictory = (finalScore: number, mistakes: number) => {
    if (!presentRef.current || finishedRef.current) return;
    finishedRef.current = true; setLocked(true);
    const stars = starsForRun(mistakes);
    if (!reducedMotion) confetti({ particleCount: 70, spread: 60, origin: { y: .64 }, colors: ['#ffd577', '#77d7ba'] });
    sessionEvents?.onGameComplete?.({ score: finalScore, stars }); victoryRef.current(stars, finalScore);
  };
  const loadNextQuestion = () => {
    timersRef.current.push(window.setTimeout(() => {
      if (!presentRef.current || finishedRef.current) return;
      setQuestion(resolveQuestion(tier)); setSelectedIndex(null); setLensOperation(null); setFeedback(null);
      setLocked(false); answerLockRef.current = false;
    }, 560));
  };
  const handleAnswer = (index: number) => {
    if (!active() || answerLockRef.current || (sessionState && !isPractice && sessionState.lives <= 0)) return;
    answerLockRef.current = true; setSelectedIndex(index); setLocked(true);
    const correct = index === question.answerIndex;
    setFeedback(correct ? 'correct' : 'incorrect'); triggerHaptic(correct ? 'success' : 'error');
    if (correct) {
      const nextScore = score + STEP_XP + tier * 12;
      const nextCorrect = correctCount + 1;
      setScore(nextScore); scoreRef.current = nextScore; setCorrectCount(nextCorrect);
      sessionEvents?.onCorrectAnswer?.({ score: nextScore, metadata: { step: nextCorrect } });
      sessionEvents?.onPuzzleComplete?.({ score: nextScore, metadata: { step: nextCorrect, totalSteps: TOTAL_STEPS } });
      if (nextCorrect >= TOTAL_STEPS) timersRef.current.push(window.setTimeout(() => finishVictory(nextScore, wrongCount), 720));
      else loadNextQuestion();
      return;
    }
    const nextWrong = wrongCount + 1; setWrongCount(nextWrong);
    sessionEvents?.onIncorrectAnswer?.({ score, metadata: { step: correctCount, attempt: nextWrong } });
    // In campaign the shell owns life depletion; practice/standalone retain this game's existing three-mistake fallback.
    if ((!sessionState || isPractice) && nextWrong >= MAX_WRONGS) {
      timersRef.current.push(window.setTimeout(() => {
        if (!presentRef.current || finishedRef.current) return;
        finishedRef.current = true;
        sessionEvents?.onGameFailed?.({ score: scoreRef.current, reason: 'mistakes' }); gameOverRef.current(scoreRef.current);
      }, 720));
    } else loadNextQuestion();
  };
  const currentStep = Math.min(correctCount, TOTAL_STEPS);
  const point = STONES[currentStep];
  const { conversion } = question;
  const convertedValue = lensOperation === null ? null
    : lensOperation === 'multiply' ? conversion.amount * conversion.factor : conversion.amount / conversion.factor;
  const lensTotal = convertedValue === null ? null : convertedValue + (conversion.extraInTargetUnit ?? 0);
  return (
    <GameScreenShell className="lava-crossing-game overflow-hidden" backgroundImage={lavaPathBackground} backgroundOpacity={1}>
      <PracticeIntroPopup open={showPracticeIntro} title="Lava Path" body="Convert the units to stabilise the next stone. Cross ten stones to escape the lava."
        briefing={practiceBriefing} onAction={() => setShowPracticeIntro(false)} />
      <main className="lava-crossing-layout" data-lava-game data-lava-tier={tier} data-lava-step={currentStep} data-lava-reaction={feedback || 'idle'}>
        <GameQuestionCard title="Stabilise the crossing" style={{ position: 'relative', top: 0, transform: 'none' }}>
          {question.prompt}
        </GameQuestionCard>
        <div className="lava-crossing-playfield" data-lava-playfield>
          <div className="lava-crossing-status">{currentStep}/{TOTAL_STEPS} safe crossings</div>
          <section className="lava-conversion-lens" aria-label="Conversion lens" data-lava-lens>
            <span className="lava-conversion-lens-title">Conversion lens</span>
            <div className="lava-conversion-lens-equation">
              <strong>{formatQuantity(conversion.amount)} {conversion.sourceUnit}</strong>
              <span>→ {conversion.targetUnit}</span>
            </div>
            <div className="lava-conversion-lens-controls" aria-label="Try a conversion operation">
              <button type="button" aria-pressed={lensOperation === 'multiply'}
                onClick={() => setLensOperation('multiply')} disabled={locked || finishedRef.current || Boolean(sessionState?.paused)}
                data-lava-operation="multiply">× {conversion.factor.toLocaleString('en-GB')}</button>
              <button type="button" aria-pressed={lensOperation === 'divide'}
                onClick={() => setLensOperation('divide')} disabled={locked || finishedRef.current || Boolean(sessionState?.paused)}
                data-lava-operation="divide">÷ {conversion.factor.toLocaleString('en-GB')}</button>
            </div>
            <output className="lava-conversion-lens-output" aria-live="polite" data-lava-preview>
              {lensTotal === null ? 'Try a gear to preview the crossing.' : (
                <>{formatQuantity(convertedValue!)} {conversion.targetUnit}
                  {conversion.extraInTargetUnit !== undefined ? ` + ${formatQuantity(conversion.extraInTargetUnit)} ${conversion.targetUnit} = ${formatQuantity(lensTotal)} ${conversion.targetUnit}` : ''}</>
              )}
            </output>
          </section>
          <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="lava-crossing-art" aria-hidden="true">
            <path d="M0 0H100V9L84 7 74 10 58 8 49 12 31 8 17 10 0 7Z" fill="#574335" stroke="#251f22" strokeWidth="1.5" />
            <path d="M0 94L18 91 33 96 50 92 65 96 83 91 100 94V100H0Z" fill="#6f4c37" stroke="#251f22" strokeWidth="1.5" />
            {[{x:13,y:24},{x:85,y:40},{x:14,y:65},{x:85,y:85}].map((bubble, index) => <motion.g key={index}
              animate={!reducedMotion ? { opacity: [.35,.8,.35] } : { opacity: .55 }} transition={{ duration: 2.7 + index * .2, repeat: Infinity }}>
              <ellipse cx={bubble.x} cy={bubble.y} rx="3.4" ry="1.2" fill="#ffd267" stroke="#b33c19" strokeWidth=".6" />
              <path d={`M${bubble.x-1.6} ${bubble.y-.3}q1.3-1.6 3.2-.2`} fill="none" stroke="#fff5bf" strokeWidth=".6" />
            </motion.g>)}
            {STONES.map((stone, index) => {
              const safe = index <= currentStep;
              const unstable = index === currentStep + 1;
              const radius = 5.1 + (TOTAL_STEPS - index) * .18;
              return <motion.g key={index} data-lava-stone={index} data-stone-safe={safe}
                animate={!reducedMotion && unstable && feedback === 'incorrect' ? { x: [0,-1.2,1.2,-.6,0] } : { x: 0 }} transition={{ duration: .4 }}>
                <ellipse cx={stone.x} cy={stone.y+2.4} rx={radius+1.3} ry="3.2" fill="#b23316" opacity=".65" />
                <path d={`M${stone.x-radius} ${stone.y-.3}L${stone.x-radius*.7} ${stone.y-2.4}L${stone.x+radius*.65} ${stone.y-2.6}L${stone.x+radius} ${stone.y-.4}L${stone.x+radius*.72} ${stone.y+3}L${stone.x-radius*.65} ${stone.y+3.2}Z`}
                  fill={safe ? '#566c5c' : '#735a47'} stroke="#26312f" strokeWidth=".9" />
                <path d={`M${stone.x-radius*.9} ${stone.y-.3}L${stone.x-radius*.65} ${stone.y-2.1}L${stone.x+radius*.6} ${stone.y-2.3}L${stone.x+radius*.9} ${stone.y-.4}L${stone.x+radius*.55} ${stone.y+1}L${stone.x-radius*.55} ${stone.y+1.2}Z`}
                  fill={safe ? '#a7b899' : '#b29772'} stroke={safe ? '#dce7b2' : '#d3b68b'} strokeWidth=".5" />
                {!safe && <path d={`M${stone.x-2} ${stone.y-2}l1.8 1.2-1.2 1.1 2.4.7`} fill="none" stroke={unstable && feedback === 'incorrect' ? '#ffbb4a' : '#564134'} strokeWidth=".8" />}
                {safe && <path d={`M${stone.x-1.5} ${stone.y-.1}l1 1 2-1.8`} fill="none" stroke="#e9ffc5" strokeWidth=".7" />}
              </motion.g>;
            })}
          </svg>
          <motion.div className="lava-crossing-hero" data-lava-hero
            animate={{ left: `${point.x}%`, top: `${point.y}%`, x: '-50%', y: '-88%' }}
            transition={reducedMotion ? { duration: 0 } : { duration: .42, ease: 'easeInOut' }}>
            <div className="lava-crossing-hero-shadow" />
            <motion.img src={playerAvatar.portrait || playerAvatar.image} alt={playerAvatar.name} draggable={false}
              animate={!reducedMotion && feedback === 'correct' ? { y: [0,-18,0], rotate: [0,-4,0] } : !reducedMotion && feedback === 'incorrect' ? { rotate: [0,-7,7,0] } : { y: 0, rotate: 0 }} transition={{ duration: .42 }} />
          </motion.div>
        </div>
        <div className="answer-choice-surface lava-crossing-answers">
          {question.options.map((option, index) => <motion.button key={`${question.prompt}-${option}`} type="button"
            onClick={() => handleAnswer(index)} disabled={locked || finishedRef.current || Boolean(sessionState?.paused)}
            whileTap={reducedMotion ? undefined : { scale: .98 }}
            className={selectedIndex === index ? feedback === 'correct' ? 'ui-button-success' : 'ui-button-primary' : 'ui-button-secondary'}>{option}</motion.button>)}
        </div>
        <div className="refinement-feedback" role="status" aria-live="polite">
          {feedback === 'correct' ? 'Stone secured. Hot feet, cool maths!' : feedback === 'incorrect' ? 'That stone is wobbling. Check the conversion.' : question.sublabel}
        </div>
      </main>
    </GameScreenShell>
  );
};
export default LavaPathGame;
