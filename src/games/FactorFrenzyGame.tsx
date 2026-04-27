import React, { useCallback, useEffect, useRef, useState } from 'react';
import confetti from 'canvas-confetti';
import { AnimatePresence, motion } from 'motion/react';
import {
  Trophy,
  RotateCcw,
  CheckCircle2,
} from 'lucide-react';
import { GAME_HUD_RESTART_EVENT } from '../gameHudEvents';
import factorFrenzyBackground from '../assets/maps/backgroundsforgames/Factor Frenzy.jpg';
import factorFrenzyBoss from '../assets/bosses/gemini-2.5-flash-image_in_the_same_aesthetic_but_different_colours_create_me_an_evil_pink_and_light_pur-2.jpg';
import { GameQuestionCard } from '../components/game-ui/GameUiKit';
import { buildPraiseMessage, shouldShowPraise } from '../utils/praiseFeedback';
import { generateValidatedProblem } from './factorFrenzy/generator';
import type { FactorProblem } from './factorFrenzy/generator';

interface FrenzyLevel {
  name: string;
  threshold: number;
  timeLimit: number;
}

interface FactorFrenzyGameProps {
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

const scoreToStars = (XP: number) => {
  if (XP >= 14000) return 3;
  if (XP >= 10000) return 2;
  return 1;
};

const createTransparentBossFrame = (src: string): Promise<string> =>
  new Promise((resolve) => {
    const image = new Image();
    image.crossOrigin = 'anonymous';
    image.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = image.naturalWidth;
        canvas.height = image.naturalHeight;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(src);
          return;
        }

        ctx.drawImage(image, 0, 0);
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const { data } = imageData;
        for (let index = 0; index < data.length; index += 4) {
          const r = data[index];
          const g = data[index + 1];
          const b = data[index + 2];
          const brightness = Math.max(r, g, b);
          const spread = brightness - Math.min(r, g, b);
          if (brightness < 26 && spread < 20) {
            data[index + 3] = 0;
          } else if (brightness < 46 && spread < 28) {
            data[index + 3] = Math.round(data[index + 3] * 0.18);
          }
        }
        ctx.putImageData(imageData, 0, 0);
        resolve(canvas.toDataURL('image/png'));
      } catch {
        resolve(src);
      }
    };
    image.onerror = () => resolve(src);
    image.src = src;
  });

const FactorFrenzyGame: React.FC<FactorFrenzyGameProps> = ({
  levelId: _levelId,
  avatarId: _avatarId,
  useSharedTopHud: _useSharedTopHud,
  onVictory,
  onGameOver: _onGameOver,
  onBack: _onBack,
}) => {
  const [state, setState] = useState<LocalState>(INITIAL_STATE);
  const [selectedOptions, setSelectedOptions] = useState<number[]>([]);
  const [showHitFx, setShowHitFx] = useState(false);
  const [successTone, setSuccessTone] = useState<'success' | 'praise'>('success');
  const [successMessage, setSuccessMessage] = useState('Direct hit!');
  const problemStartRef = useRef<number>(Date.now());
  const [factorFrenzyEnemy, setFactorFrenzyEnemy] = useState(factorFrenzyBoss);

  const timerRef = useRef<number | null>(null);
  const advanceRef = useRef<number | null>(null);
  const endedRef = useRef(false);

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

  useEffect(() => {
    let mounted = true;
    createTransparentBossFrame(factorFrenzyBoss).then((source) => {
      if (mounted) setFactorFrenzyEnemy(source);
    });
    return () => {
      mounted = false;
    };
  }, []);

  const getLevelFromScore = useCallback((XP: number) => {
    const currentLevel = [...FRENZY_LEVELS].reverse().find((level) => XP >= level.threshold) || FRENZY_LEVELS[0];
    return {
      levelConfig: currentLevel,
      levelIndex: FRENZY_LEVELS.indexOf(currentLevel) + 1,
    };
  }, []);

  const startGame = () => {
    endedRef.current = false;
    const firstProblem = generateValidatedProblem(1, null);
    problemStartRef.current = Date.now();
    setSuccessTone('success');
    setSuccessMessage('Direct hit!');
    setState({
      ...INITIAL_STATE,
      currentProblem: firstProblem,
      status: 'playing',
      timeLeft: FRENZY_LEVELS[0].timeLimit,
      enemyHealth: ENEMY_MAX_HEALTH,
    });
    setSelectedOptions([]);
  };

  useEffect(() => {
    if (state.currentProblem) return;
    const firstProblem = generateValidatedProblem(1, null);
    problemStartRef.current = Date.now();
    setSuccessTone('success');
    setSuccessMessage('Direct hit!');
    setState((previous) => ({
      ...previous,
      currentProblem: firstProblem,
      status: 'playing',
      timeLeft: FRENZY_LEVELS[0].timeLimit,
      enemyHealth: ENEMY_MAX_HEALTH,
    }));
  }, [state.currentProblem]);

  useEffect(() => {
    clearTimer();

    if (state.status !== 'playing') return;

    timerRef.current = window.setInterval(() => {
      setState((previous) => {
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
  }, [state.status]);

  const toggleOption = (value: number) => {
    if (state.status !== 'playing') return;

    setSelectedOptions((previous) => (
      previous.includes(value)
        ? previous.filter((item) => item !== value)
        : [...previous, value]
    ));
  };

  const checkAnswer = () => {
    if (!state.currentProblem || state.status !== 'playing') return;

    const correct = state.currentProblem.options
      .filter((option) => option.isCorrect)
      .map((option) => option.value)
      .sort((a, b) => a - b);
    const selected = [...selectedOptions].sort((a, b) => a - b);
    const isCorrect = correct.length === selected.length && correct.every((value, index) => value === selected[index]);

    if (isCorrect) {
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
        particleCount: finished ? 160 : 120,
        spread: 80,
        origin: { y: 0.62 },
        colors: ['#fbbf24', '#f59e0b', '#38bdf8', '#34d399'],
      });
      return;
    }

    setState((previous) => ({
      ...previous,
      status: 'incorrect',
    }));
  };

  const nextProblem = () => {
    const { levelConfig, levelIndex } = getLevelFromScore(state.XP);
    const problem = generateValidatedProblem(levelIndex, state.currentProblem);
    problemStartRef.current = Date.now();
    setSuccessTone('success');
    setSuccessMessage('Direct hit!');

    setState((previous) => ({
      ...previous,
      level: levelIndex,
      currentProblem: problem,
      status: 'playing',
      timeLeft: levelConfig.timeLimit,
    }));
    setSelectedOptions([]);
  };

  useEffect(() => {
    clearAdvanceTimer();
    if (state.status !== 'correct' && state.status !== 'incorrect') return;

    const delay = state.status === 'correct' ? 620 : 880;
    advanceRef.current = window.setTimeout(() => {
      nextProblem();
    }, delay);

    return () => clearAdvanceTimer();
  }, [state.status]);

  useEffect(() => {
    if (!showHitFx) return;
    const timeout = window.setTimeout(() => setShowHitFx(false), 520);
    return () => window.clearTimeout(timeout);
  }, [showHitFx]);

  const submitRun = () => {
    if (endedRef.current) return;
    endedRef.current = true;
    onVictory(scoreToStars(state.XP), state.XP);
  };

  const enemyHealthPercent = (state.enemyHealth / ENEMY_MAX_HEALTH) * 100;

  return (
    <div
      className="relative h-full w-full overflow-hidden bg-cover bg-center bg-no-repeat text-white"
      style={{ backgroundImage: `url(${factorFrenzyBackground})` }}
    >
      <div className="pointer-events-none absolute left-0 right-0 top-[clamp(5px,1vh,10px)] z-50 flex justify-center px-3">
        <div className="w-full max-w-[780px]">
          <GameQuestionCard
            title="Factor Frenzy"
            subtitle={`Level ${state.level}`}
            className="mx-auto w-full"
            bodyClassName="text-[clamp(0.95rem,2.9vw,1.3rem)] font-black leading-snug tracking-[0.01em] text-white md:text-[1.4rem]"
          >
            {state.currentProblem?.question}
          </GameQuestionCard>
        </div>
      </div>

      <div className="relative z-10 flex h-full flex-col px-3 pb-[calc(env(safe-area-inset-bottom)+11rem)] pt-[calc(env(safe-area-inset-top)+7.9rem)] sm:px-4 sm:pb-[calc(env(safe-area-inset-bottom)+11.5rem)] sm:pt-[calc(env(safe-area-inset-top)+8.2rem)] md:px-5 md:pb-[calc(env(safe-area-inset-bottom)+12rem)] md:pt-[calc(env(safe-area-inset-top)+8.4rem)]">
        <main className="relative flex min-h-0 flex-1 flex-col">
          <AnimatePresence mode="wait">
            {state.status === 'complete' ? (
              <motion.div
                key="complete"
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                className="my-auto mx-auto w-full max-w-xl rounded-3xl border border-amber-200/40 bg-[#16356f]/88 p-6 text-center shadow-[0_20px_40px_rgba(2,6,23,0.5)]"
              >
                <Trophy className="mx-auto h-14 w-14 text-amber-200" />
                <h2 className="mt-3 text-3xl font-black uppercase text-amber-50 sm:text-4xl">Monster Mind Defeated</h2>
                <p className="mt-2 text-sm font-semibold text-cyan-50/85">The Monster Minds have been pushed back.</p>
                <div className="mt-4 rounded-2xl border border-cyan-100/30 bg-[#0d2a5a]/80 px-4 py-3">
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-cyan-100/80">Final XP</p>
                  <p className="mt-1 text-4xl font-black text-amber-100">{state.XP.toLocaleString()}</p>
                </div>
                <div className="mt-5 flex flex-col gap-2.5">
                  <button
                    onClick={submitRun}
                    className="ui-button-success inline-flex items-center justify-center gap-2 rounded-2xl px-5 py-3 text-sm font-black uppercase tracking-[0.12em]"
                  >
                    <CheckCircle2 className="h-4 w-4" /> Claim Victory
                  </button>
                  <button
                    onClick={() => {
                      window.dispatchEvent(new Event(GAME_HUD_RESTART_EVENT));
                      startGame();
                    }}
                    className="ui-button-primary inline-flex items-center justify-center gap-2 rounded-2xl px-5 py-3 text-sm font-black uppercase tracking-[0.12em]"
                  >
                    <RotateCcw className="h-4 w-4" /> Restart
                  </button>
                </div>
              </motion.div>
            ) : (
              <motion.div
                key={state.currentProblem?.id}
                initial={{ opacity: 0, x: 16 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -16 }}
                className="flex min-h-0 flex-1 flex-col"
              >
                <div className="relative min-h-0 flex-1 overflow-hidden rounded-3xl border border-cyan-100/16 bg-transparent p-3 sm:p-4">
                  <div className="flex h-full min-h-0 flex-col">
                    <div className="flex items-start justify-end gap-3">
                      <div className="rounded-full border border-cyan-100/25 bg-slate-950/50 px-3 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-cyan-100/90">
                        {state.timeLeft}s left
                      </div>
                    </div>

                    <div className="relative mt-3 flex min-h-0 flex-1 flex-col items-center justify-center">
                      <div className="w-full max-w-[17rem] rounded-2xl border border-amber-200/24 bg-[linear-gradient(180deg,rgba(15,23,42,0.22),rgba(15,23,42,0.1))] px-3 py-2 shadow-[0_12px_24px_rgba(2,6,23,0.18)]">
                        <div className="mb-1 text-center text-[8px] font-black uppercase tracking-[0.18em] text-amber-200">
                          Monster Mind
                        </div>
                        <div className="h-2 overflow-hidden rounded-full border border-slate-700/80 bg-slate-950/70">
                          <motion.div
                            className="h-full rounded-full bg-gradient-to-r from-rose-500 via-rose-400 to-orange-300 shadow-[0_0_12px_rgba(251,113,133,0.75)]"
                            animate={{ width: `${enemyHealthPercent}%` }}
                            transition={{ type: 'spring', stiffness: 210, damping: 26 }}
                          />
                        </div>
                      </div>

                      <div className="mt-3 flex w-full justify-center">
                        <motion.div
                          className="relative w-[min(56vw,15rem)] max-w-full"
                          animate={
                            showHitFx
                              ? { x: [0, -8, 8, -6, 6, 0], rotate: [0, -2, 2, -1, 1, 0] }
                              : { x: 0, rotate: 0 }
                          }
                          transition={{ duration: 0.42, ease: 'easeInOut' }}
                        >
                          <motion.img
                            src={factorFrenzyEnemy}
                            alt=""
                            aria-hidden="true"
                            draggable={false}
                            className="relative h-auto w-full object-contain drop-shadow-[0_18px_26px_rgba(2,6,23,0.38)]"
                            animate={{ opacity: showHitFx ? 0.92 : 1, scale: showHitFx ? [1, 1.03, 1] : 1 }}
                            transition={{ duration: 0.42, ease: 'easeInOut' }}
                          />
                        </motion.div>
                      </div>

                      <AnimatePresence>
                        {state.status === 'correct' || state.status === 'incorrect' ? (
                          <motion.div
                            initial={{ opacity: 0, scale: 0.92 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 1.06 }}
                            className={`pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-6xl font-black uppercase tracking-tight sm:text-7xl ${
                              state.status === 'correct'
                                ? successTone === 'praise'
                                  ? 'text-amber-100 drop-shadow-[0_0_24px_rgba(251,191,36,0.75)]'
                                  : 'text-emerald-200/35'
                                : 'text-amber-200/35'
                            }`}
                          >
                            {state.status === 'correct' ? successMessage : 'Miss'}
                          </motion.div>
                        ) : null}
                      </AnimatePresence>
                    </div>

                    <div className="mt-auto flex items-center justify-center">
                      {state.status === 'playing' ? (
                        <button
                          onClick={checkAnswer}
                          disabled={selectedOptions.length === 0}
                          className="ui-button-primary inline-flex w-full max-w-sm items-center justify-center rounded-2xl px-4 py-3 text-sm font-black uppercase tracking-[0.14em] disabled:opacity-45"
                        >
                          Strike
                        </button>
                      ) : (
                        <div className="inline-flex w-full max-w-sm items-center justify-center rounded-2xl border border-cyan-100/45 bg-[#0d2a5a]/70 px-4 py-3 text-xs font-black uppercase tracking-[0.14em] text-cyan-100/95">
                          {state.status === 'correct' ? 'Direct hit • loading next challenge' : 'The swarm is still active • loading next challenge'}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </main>

        {state.status !== 'complete' && (
      <div className="fixed inset-x-0 bottom-[calc(env(safe-area-inset-bottom)+4.5rem)] z-40 px-3">
            <div className="answer-choice-surface mx-auto grid w-full max-w-[780px] grid-cols-4 gap-2.5 sm:gap-3 md:gap-4">
              {state.currentProblem?.options.map((option, idx) => (
                <motion.button
                  type="button"
                  key={option.id}
                  initial={{ opacity: 0, y: 6, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  transition={{ delay: idx * 0.03 }}
                  onClick={() => toggleOption(option.value)}
                  className={`relative flex h-[clamp(54px,7.4vh,72px)] items-center justify-center rounded-xl border text-[clamp(0.95rem,3.1vw,1.55rem)] font-black transition ${
                    state.status === 'correct' && selectedOptions.includes(option.value)
                      ? 'ui-button-success'
                      : selectedOptions.includes(option.value)
                        ? 'ui-button-primary'
                        : 'ui-button-secondary'
                  }`}
                >
                  {option.label}
                </motion.button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default FactorFrenzyGame;

