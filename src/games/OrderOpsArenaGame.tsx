import React, { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import confetti from 'canvas-confetti';
import GameplaySceneBackdrop from '../components/GameplaySceneBackdrop';
import { GameQuestionCard, GameUiShell } from '../components/game-ui/GameUiKit';
import MonsterMindActor from '../components/game-ui/MonsterMindActor';
import { triggerHaptic } from '../haptics';
import goblinMonster from '../assets/enemies/cohesive/goblin.webp';
import { buildPraiseMessage, shouldShowPraise } from '../utils/praiseFeedback';
import { applyOperation, createOpsRound, formatOpsTokens, getOperationChoices, type OpsChoice, type OpsRound, type OpsToken } from './orderOpsEngine';
import { emitMiniGameSessionEvent, type MiniGameShellContractProps } from '../app/gameplaySessionContract';
import { playGameSound } from '../audio/gameAudio';

interface OrderOpsArenaGameProps extends MiniGameShellContractProps {
  levelId: number;
  avatarId: string;
  onVictory: (stars: number, XP: number) => void;
  onGameOver: (XP: number) => void;
  onBack: () => void;
}

type FeedbackState = null | {
  type: 'success' | 'error' | 'praise';
  title: string;
  subtitle: string;
};

const HEARTS_MAX = 3;
const ENEMY_HEALTH_BY_LEVEL: Record<number, number> = {
  1: 5,
  2: 6,
  3: 7,
  4: 8,
  5: 9,
};

const OrderOpsArenaGame: React.FC<OrderOpsArenaGameProps> = ({
  levelId,
  avatarId,
  isPractice,
  sessionState,
  sessionEvents,
  onVictory,
  onGameOver,
  onBack: _onBack,
}) => {
  const tier = Math.max(1, Math.min(5, levelId));
  const maxEnemyHealth = ENEMY_HEALTH_BY_LEVEL[tier];
  const targetScore = maxEnemyHealth * 210;
  const timersRef = useRef<number[]>([]);
  const scoreRef = useRef(0);
  const sessionRef = useRef(sessionState);
  sessionRef.current = sessionState;

  const [XP, setScore] = useState(0);
  const [localHearts, setLocalHearts] = useState(HEARTS_MAX);
  const hearts = sessionState?.lives ?? localHearts;
  const [Combo, setStreak] = useState(0);
  const [enemyHealth, setEnemyHealth] = useState(maxEnemyHealth);
  const [questionCount, setQuestionCount] = useState(1);
  const [round, setRound] = useState<OpsRound>(() => createOpsRound(levelId));
  const [tokens, setTokens] = useState<OpsToken[]>(() => round.tokens);
  const [stepNotice, setStepNotice] = useState('Pick the operation that should happen next.');
  const [feedback, setFeedback] = useState<FeedbackState>(null);
  const [isFinished, setIsFinished] = useState(false);
  const orderOpsEnemy = goblinMonster;
  const roundStartRef = useRef<number>(Date.now());


  const displayExpression = formatOpsTokens(tokens);
  const operationChoices = useMemo(() => getOperationChoices(tokens), [tokens]);

  const clearTimers = () => {
    timersRef.current.forEach((timerId) => window.clearTimeout(timerId));
    timersRef.current = [];
  };

  useEffect(() => {
    scoreRef.current = XP;
  }, [XP]);

  useEffect(() => () => clearTimers(), []);

  useEffect(() => {
    clearTimers();
    setScore(0);
    scoreRef.current = 0;
    setLocalHearts(HEARTS_MAX);
    setStreak(0);
    setEnemyHealth(maxEnemyHealth);
    setQuestionCount(1);
    const first = createOpsRound(levelId);
    setRound(first);
    setTokens(first.tokens);
    setStepNotice('Pick the operation that should happen next.');
    roundStartRef.current = Date.now();
    setFeedback(null);
    setIsFinished(false);
  }, [levelId, maxEnemyHealth]);

  const finishVictory = (finalScore: number, heartsLeft: number) => {
    if (isFinished || (!isPractice && sessionRef.current && (sessionRef.current.lives <= 0 || sessionRef.current.timeLeft <= 0))) return;
    setIsFinished(true);
    const stars = finalScore >= targetScore * 1.2 && heartsLeft >= 2
      ? 3
      : finalScore >= targetScore * 0.9
        ? 2
        : 1;

    confetti({
      disableForReducedMotion: true,
      particleCount: 120,
      spread: 70,
      origin: { y: 0.64 },
      colors: ['#fcd34d', '#67e8f9', '#ffffff'],
    });

    emitMiniGameSessionEvent(sessionEvents, 'game_complete', { score: finalScore, stars });
    onVictory(stars, finalScore);
  };

  const moveToNextQuestion = () => {
    const timeoutId = window.setTimeout(() => {
      setQuestionCount((previous) => previous + 1);
      const next = createOpsRound(levelId);
      setRound(next);
      setTokens(next.tokens);
      setStepNotice('Pick the operation that should happen next.');
      roundStartRef.current = Date.now();
      setFeedback(null);
    }, 620);
    timersRef.current.push(timeoutId);
  };

  const loseHeart = (subtitle: string) => {
    if (feedback || isFinished) return;
    const nextHearts = isPractice ? hearts : hearts - 1;
    if (!sessionState && !isPractice) setLocalHearts(nextHearts);
    setStreak(0);
    setFeedback({
      type: 'error',
      title: 'Order Broken',
      subtitle: `The Monster Mind disrupted the order. ${subtitle}`,
    });
    emitMiniGameSessionEvent(sessionEvents, 'incorrect_answer', { score: scoreRef.current, metadata: { expression: formatOpsTokens(tokens) } });
    triggerHaptic('error');

    if (nextHearts <= 0 && !sessionState) {
      const timeoutId = window.setTimeout(() => {
        setIsFinished(true);
        emitMiniGameSessionEvent(sessionEvents, 'game_failed', { score: scoreRef.current, reason: 'hearts' });
        onGameOver(scoreRef.current);
      }, 860);
      timersRef.current.push(timeoutId);
      return;
    }

    const timeoutId = window.setTimeout(() => setFeedback(null), 820);
    timersRef.current.push(timeoutId);
  };

  const handleAnswer = (choice: OpsChoice) => {
    if (feedback || isFinished || sessionState?.paused || (!isPractice && sessionState && (sessionState.lives <= 0 || sessionState.timeLeft <= 0))) return;

    if (!choice.correct) {
      loseHeart(`${round.hint} Check the calculation before trying again.`);
      return;
    }

    const nextTokens = applyOperation(tokens, choice.operationIndex);
    setTokens(nextTokens);
    setStepNotice(`${choice.label}. ${nextTokens.length === 1 ? 'Expression solved — hit landed!' : 'Now choose the next operation.'}`);
    if (nextTokens.length > 1) {
      playGameSound('cast');
      triggerHaptic('success');
      return;
    }

    playGameSound('impact');

    const points = 210 + (Combo * 24);
    const updatedScore = XP + points;
    const nextEnemyHealth = Math.max(0, enemyHealth - 1);
    const elapsedMs = Date.now() - roundStartRef.current;
    const isPraise = shouldShowPraise(1, elapsedMs);

    setScore(updatedScore);
    scoreRef.current = updatedScore;
    emitMiniGameSessionEvent(sessionEvents, 'correct_answer', { score: updatedScore, metadata: { expression: formatOpsTokens(round.tokens) } });
    setStreak((previous) => previous + 1);
    setEnemyHealth(nextEnemyHealth);
    setFeedback({
      type: isPraise ? 'praise' : 'success',
      title: isPraise ? buildPraiseMessage() : 'Order Restored',
      subtitle: isPraise ? 'Fast first try bonus!' : `Correct order restored - +${points} XP`,
    });
    triggerHaptic('success');

    if (nextEnemyHealth <= 0) {
      const timeoutId = window.setTimeout(() => {
        finishVictory(updatedScore, hearts);
      }, 720);
      timersRef.current.push(timeoutId);
      return;
    }

    moveToNextQuestion();
  };

  return (
    <GameUiShell overlayDisabled className="bg-transparent">
      <GameplaySceneBackdrop gameType="equation_grove" />
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(10,16,31,0.22),rgba(3,7,18,0.4))]" />

      <div className="relative z-10 flex h-full min-h-0 w-full flex-1 flex-col items-center px-2 pb-[calc(env(safe-area-inset-bottom)+1.25rem)] pt-[calc(env(safe-area-inset-top)+1rem)] md:px-4 md:pb-[calc(env(safe-area-inset-bottom)+1.5rem)] md:pt-[calc(env(safe-area-inset-top)+1.25rem)]">
        <div className="flex h-full min-h-0 w-full max-w-6xl flex-1 flex-col gap-3 md:gap-4">
          <div className="flex justify-center">
            <GameQuestionCard
              title="Order Ops Arena"
              subtitle="Choose a correct operation and its result. Resolve the expression to land a hit."
              className="w-full max-w-[860px] border border-amber-200/35 bg-[linear-gradient(180deg,rgba(251,191,36,0.28),rgba(15,23,42,0.18))] px-4 py-2 text-center shadow-[0_12px_26px_rgba(15,23,42,0.14)] md:px-6 md:py-2.5"
              bodyClassName="text-[clamp(1.15rem,2.9vw,2.7rem)] font-black tracking-tight text-white"
            >
              {displayExpression}
            </GameQuestionCard>
          </div>

          <div className="relative min-h-0 flex-1 overflow-hidden rounded-[1.5rem] border border-white/10 bg-transparent">
            <div className="relative z-10 flex h-full min-h-0 flex-col gap-3 p-3 md:p-4">
              <div className="flex min-h-[13rem] flex-1 items-center justify-center">
                <div className="relative flex h-full w-full max-w-[24rem] items-center justify-center p-3 md:min-h-[18rem]">
                    <div className="absolute left-3 top-3 rounded-full border border-rose-200/14 bg-slate-950/35 px-2.5 py-1 text-[11px] font-black uppercase tracking-[0.16em] text-rose-100/82">
                      {Math.max(0, maxEnemyHealth - enemyHealth)} orders restored
                    </div>
                  <MonsterMindActor
                    src={orderOpsEnemy}
                    alt="Order Ops enemy"
                    reaction={enemyHealth <= 0 ? 'defeated' : feedback ? feedback.type === 'error' ? 'taunt' : 'hit' : 'idle'}
                    reactionKey={questionCount}
                    className="h-full w-full max-w-[18rem] object-contain object-center drop-shadow-[0_18px_28px_rgba(0,0,0,0.24)]"
                  />
                </div>
              </div>

              <div className="mx-auto w-full max-w-[640px] shrink-0 rounded-[1.45rem] border border-white/10 bg-[linear-gradient(180deg,rgba(9,16,31,0.66),rgba(6,10,20,0.82))] p-3 shadow-[0_14px_28px_rgba(2,6,23,0.14)] backdrop-blur-sm md:p-4">
                <p className="mb-2 text-center text-sm font-bold text-cyan-50 md:text-base" role="status">{stepNotice}</p>
                <div className="grid grid-cols-2 gap-2 md:gap-3" data-order-ops-choices>
                  {operationChoices.map((option) => (
                    <button
                      key={`${displayExpression}-${option.id}`}
                      type="button"
                      onClick={() => handleAnswer(option)}
                      disabled={Boolean(feedback) || isFinished}
                      className="ui-button-primary min-h-[44px] rounded-xl px-2 py-2 text-base font-black text-white shadow-[0_12px_20px_rgba(2,6,23,0.2)] disabled:opacity-60 md:text-lg"
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        <AnimatePresence>
          {feedback && (
            <motion.div
              initial={{ opacity: 0, scale: 0.82 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.08 }}
                className={`pointer-events-none absolute inset-0 z-40 flex items-center justify-center backdrop-blur-md ${
                  feedback.type === 'praise'
                    ? 'bg-[radial-gradient(circle_at_center,rgba(255,230,138,0.34),rgba(56,189,248,0.14))]'
                    : feedback.type === 'success'
                      ? 'bg-emerald-500/16'
                      : 'bg-red-500/16'
                }`}
              >
                <div className={`rounded-[2rem] border px-8 py-6 text-center shadow-[0_24px_36px_rgba(0,0,0,0.24)] ${
                  feedback.type === 'praise'
                    ? 'border-amber-100/70 bg-[linear-gradient(180deg,rgba(255,248,214,0.98),rgba(125,211,252,0.92))]'
                    : 'border-white/14 bg-slate-950/60'
                }`}>
                  <div className={`text-4xl font-black uppercase tracking-[0.12em] md:text-6xl ${
                    feedback.type === 'success'
                      ? 'text-emerald-100'
                      : feedback.type === 'praise'
                        ? 'text-slate-950'
                        : 'text-amber-100'
                  }`}>
                    {feedback.title}
                  </div>
                  <div className={`mt-2 text-lg font-bold md:text-2xl ${feedback.type === 'praise' ? 'text-slate-950/90' : 'text-white/92'}`}>
                    {feedback.subtitle}
                  </div>
                </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </GameUiShell>
  );
};

export default OrderOpsArenaGame;

