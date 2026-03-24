import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import confetti from 'canvas-confetti';
import {
  AlertCircle,
  Box,
  CheckCircle2,
  ChevronRight,
  Layers,
  Lock,
  Maximize,
  RotateCcw,
  ShieldCheck,
  Trophy,
  Unlock,
} from 'lucide-react';
import GameplayHUD from '../components/GameplayHUD';
import GameActionDock from '../components/GameActionDock';
import GameplaySceneBackdrop from '../components/GameplaySceneBackdrop';
import { AVATARS } from '../constants';

type ShapeType = 'cube' | 'cuboid';
type VaultStatus = 'start' | 'playing' | 'unlocked' | 'failed' | 'complete';

interface VolumeProblem {
  id: number;
  type: ShapeType;
  length: number;
  width: number;
  height: number;
  unit: string;
  volume: number;
}

interface VaultState {
  score: number;
  level: number;
  currentProblem: VolumeProblem | null;
  status: VaultStatus;
  attempts: number;
  message: string;
}

interface VolumeVaultGameProps {
  levelId: number;
  avatarId: string;
  onVictory: (stars: number, score: number) => void;
  onGameOver: (score: number) => void;
  onBack: () => void;
}

const INITIAL_STATE: VaultState = {
  score: 0,
  level: 1,
  currentProblem: null,
  status: 'start',
  attempts: 0,
  message: 'Compute the correct volume to lock the cage.',
};

const MAX_LEVEL = 10;

const scoreToStars = (score: number) => {
  if (score >= 12000) return 3;
  if (score >= 8000) return 2;
  return 1;
};

const vaultTier = (score: number) => {
  if (score >= 10000) return 'Diamond';
  if (score >= 6000) return 'Platinum';
  if (score >= 3000) return 'Gold';
  if (score >= 1000) return 'Silver';
  return 'Bronze';
};

const generateProblem = (level: number): VolumeProblem => {
  const type: ShapeType = Math.random() > 0.45 ? 'cuboid' : 'cube';
  let length: number;
  let width: number;
  let height: number;

  if (type === 'cube') {
    length = width = height = Math.floor(Math.random() * (level + 4)) + 2;
  } else {
    length = Math.floor(Math.random() * (level + 5)) + 2;
    width = Math.floor(Math.random() * (level + 4)) + 2;
    height = Math.floor(Math.random() * (level + 4)) + 2;
  }

  return {
    id: Date.now() + Math.floor(Math.random() * 1000),
    type,
    length,
    width,
    height,
    unit: 'cm',
    volume: length * width * height,
  };
};

const VolumeVaultGame: React.FC<VolumeVaultGameProps> = ({
  levelId,
  avatarId,
  onVictory,
  onGameOver,
  onBack,
}) => {
  const [state, setState] = useState<VaultState>(INITIAL_STATE);
  const [inputValue, setInputValue] = useState('');
  const [isDialRotating, setIsDialRotating] = useState(false);
  const [timeLeft, setTimeLeft] = useState(95 + (levelId * 5));

  const endedRef = useRef(false);
  const timersRef = useRef<number[]>([]);

  const avatar = AVATARS.find((item) => item.id === avatarId) || AVATARS[0];
  const targetScore = 2200 + (levelId * 240);
  const progress = Math.min(100, (((state.level - 1) + (state.status === 'unlocked' ? 1 : 0)) / MAX_LEVEL) * 100);

  const clearTimers = () => {
    timersRef.current.forEach((id) => window.clearTimeout(id));
    timersRef.current = [];
  };

  const pushTimer = (id: number) => {
    timersRef.current.push(id);
  };

  const startMission = useCallback((level: number) => {
    setState((previous) => ({
      ...previous,
      level,
      currentProblem: generateProblem(level),
      status: 'playing',
      message: 'Calculate the cage volume to capture the enemy.',
    }));
    setInputValue('');
  }, []);

  const startExpedition = useCallback(() => {
    clearTimers();
    endedRef.current = false;
    setTimeLeft(95 + (levelId * 5));
    setState(INITIAL_STATE);
    startMission(1);
  }, [levelId, startMission]);

  useEffect(() => () => clearTimers(), []);

  useEffect(() => {
    startExpedition();
  }, [startExpedition]);

  useEffect(() => {
    if (endedRef.current || state.status === 'complete' || state.status === 'start') return undefined;
    const interval = window.setInterval(() => {
      setTimeLeft((previous) => {
        if (previous <= 1) {
          window.clearInterval(interval);
          if (!endedRef.current) {
            endedRef.current = true;
            if (state.score >= targetScore) {
              onVictory(scoreToStars(state.score), state.score);
            } else {
              onGameOver(state.score);
            }
          }
          return 0;
        }
        return previous - 1;
      });
    }, 1000);
    return () => window.clearInterval(interval);
  }, [onGameOver, onVictory, state.score, state.status, targetScore]);

  useEffect(() => {
    if (state.status !== 'failed' || state.attempts < 3 || endedRef.current) return;
    endedRef.current = true;
    const timeoutId = window.setTimeout(() => onGameOver(state.score), 800);
    pushTimer(timeoutId);
  }, [onGameOver, state.attempts, state.score, state.status]);

  const handleKeypad = (value: string) => {
    if (state.status !== 'playing') return;
    if (value === 'DEL') {
      setInputValue((previous) => previous.slice(0, -1));
      return;
    }
    if (value === 'CLR') {
      setInputValue('');
      return;
    }
    if (inputValue.length >= 8) return;
    setInputValue((previous) => `${previous}${value}`);
  };

  const checkAnswer = () => {
    if (!state.currentProblem || state.status !== 'playing' || !inputValue) return;
    setIsDialRotating(true);

    const timeoutId = window.setTimeout(() => {
      setIsDialRotating(false);
      const guess = Number(inputValue);
      const isCorrect = guess === state.currentProblem?.volume;

      if (isCorrect) {
        const points = 460 + (state.level * 110) + Math.floor(timeLeft / 2);
        setState((previous) => ({
          ...previous,
          score: previous.score + points,
          status: 'unlocked',
          message: 'Vault unlocked. Enemy cage secured.',
        }));
        confetti({
          particleCount: 65,
          spread: 54,
          origin: { y: 0.62 },
          colors: ['#fde047', '#38bdf8', '#4ade80'],
        });
        return;
      }

      setState((previous) => ({
        ...previous,
        attempts: previous.attempts + 1,
        status: 'failed',
        message: `Incorrect. Correct volume: ${previous.currentProblem?.volume}`,
      }));
    }, 700);

    pushTimer(timeoutId);
  };

  const retryCurrent = () => {
    setState((previous) => ({
      ...previous,
      status: 'playing',
      message: 'Try again. Solve the volume exactly.',
    }));
    setInputValue('');
  };

  const nextLevel = () => {
    const next = state.level + 1;
    if (next > MAX_LEVEL) {
      setState((previous) => ({
        ...previous,
        status: 'complete',
        message: 'All vault cages secured.',
      }));
      return;
    }
    startMission(next);
  };

  const completeMission = () => {
    if (endedRef.current) return;
    endedRef.current = true;
    onVictory(scoreToStars(state.score), state.score);
  };

  const problem = state.currentProblem;
  const prism = useMemo(() => {
    if (!problem) return null;
    const width = Math.max(78, Math.min(178, problem.width * 14));
    const height = Math.max(74, Math.min(170, problem.height * 14));
    const depth = Math.max(30, Math.min(72, problem.length * 5));
    return { width, height, depth };
  }, [problem]);

  return (
    <div className="fixed inset-0 z-20 h-screen w-screen overflow-hidden select-none">
      <GameplaySceneBackdrop gameType="measurement_forge" />

      <div className="relative z-10 flex h-full w-full flex-col pt-[env(safe-area-inset-top)]">
        <GameplayHUD
          title="Volume Vault"
          avatar={avatar}
          score={state.score}
          targetScore={targetScore}
          timeLeft={timeLeft}
          progress={progress}
          accentText="text-cyan-900"
          accentSoftBg="bg-cyan-100/80"
          accentBorder="border-cyan-200/80"
          progressBar="bg-gradient-to-r from-cyan-400 via-blue-500 to-indigo-500"
          statLabel="Vault"
          statValue={`${state.level}/${MAX_LEVEL}`}
          compact
        />

        <div className="relative min-h-0 flex-1 px-2 pb-[calc(env(safe-area-inset-bottom)+5.35rem)] md:px-3 md:pb-[calc(env(safe-area-inset-bottom)+5.9rem)]">
          <div className="licensed-board-frame structured-playfield-frame relative h-full overflow-hidden p-2 md:p-4">
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_14%,rgba(56,189,248,0.2),transparent_26%),radial-gradient(circle_at_88%_18%,rgba(250,204,21,0.16),transparent_20%),linear-gradient(180deg,rgba(8,15,30,0.14),rgba(8,15,30,0.36))]" />

            {state.status === 'start' ? (
              <div className="relative z-10 flex h-full items-center justify-center">
                <div className="licensed-game-card w-full max-w-[30rem] px-6 py-6 text-center md:px-8 md:py-8">
                  <div className="mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-full border border-yellow-100/40 bg-blue-950/70">
                    <Lock className="h-10 w-10 text-yellow-300" />
                  </div>
                  <h2 className="text-3xl font-black uppercase tracking-tight text-white">Volume Vault</h2>
                  <p className="mt-3 text-sm font-bold text-white/78 md:text-base">
                    Solve each volume to build perfect cages and lock down the enemy vaults.
                  </p>
                  <button
                    onClick={startExpedition}
                    className="mx-auto mt-6 flex h-12 min-w-[13rem] items-center justify-center gap-2 rounded-[1rem] border border-yellow-100/60 bg-[linear-gradient(180deg,#facc15,#f59e0b)] px-5 text-base font-black uppercase tracking-[0.12em] text-amber-950 shadow-[0_12px_20px_rgba(0,0,0,0.3)] hover:brightness-105"
                  >
                    Start Mission
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ) : (
              <div className="relative z-10 grid h-full min-h-0 grid-cols-1 gap-3 lg:grid-cols-[minmax(0,1.12fr)_minmax(19rem,0.88fr)]">
                <div className="licensed-game-card-dark flex min-h-0 flex-col rounded-[1.5rem] p-3 md:p-4">
                  <div className="flex items-center justify-between gap-2">
                    <div className="rounded-full border border-cyan-100/45 bg-cyan-500/18 px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-cyan-100">
                      {vaultTier(state.score)} Tier
                    </div>
                    <div className={`rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] ${
                      state.status === 'unlocked'
                        ? 'border-emerald-300/60 bg-emerald-500/20 text-emerald-200'
                        : state.status === 'failed'
                          ? 'border-rose-300/60 bg-rose-500/20 text-rose-200'
                          : 'border-yellow-100/55 bg-yellow-500/18 text-yellow-100'
                    }`}>
                      {state.status === 'unlocked' ? 'Captured' : state.status === 'failed' ? 'Missed' : 'Active'}
                    </div>
                  </div>

                  <div className="mt-3 licensed-game-card rounded-[1.15rem] px-3 py-3 text-center md:px-4">
                    <div className="text-[10px] font-black uppercase tracking-[0.2em] text-white/65">Mission</div>
                    <div className="mt-1 text-sm font-black text-white md:text-base">
                      Find the volume to build the exact cage.
                    </div>
                    <div className="mt-2 text-xs font-bold text-white/80">
                      Volume = length x width x height
                    </div>
                  </div>

                  <div className="mt-3 grid grid-cols-3 gap-2">
                    <div className="rounded-[0.9rem] border border-white/14 bg-white/8 p-2 text-center">
                      <div className="flex items-center justify-center gap-1 text-[10px] font-black uppercase tracking-[0.14em] text-cyan-100/75">
                        <Maximize className="h-3.5 w-3.5 text-yellow-300" /> L
                      </div>
                      <div className="mt-1 text-base font-black text-white">{problem?.length} {problem?.unit}</div>
                    </div>
                    <div className="rounded-[0.9rem] border border-white/14 bg-white/8 p-2 text-center">
                      <div className="flex items-center justify-center gap-1 text-[10px] font-black uppercase tracking-[0.14em] text-cyan-100/75">
                        <Layers className="h-3.5 w-3.5 text-yellow-300" /> W
                      </div>
                      <div className="mt-1 text-base font-black text-white">{problem?.width} {problem?.unit}</div>
                    </div>
                    <div className="rounded-[0.9rem] border border-white/14 bg-white/8 p-2 text-center">
                      <div className="flex items-center justify-center gap-1 text-[10px] font-black uppercase tracking-[0.14em] text-cyan-100/75">
                        <Box className="h-3.5 w-3.5 text-yellow-300" /> H
                      </div>
                      <div className="mt-1 text-base font-black text-white">{problem?.height} {problem?.unit}</div>
                    </div>
                  </div>

                  <div className="relative mt-3 min-h-0 flex-1 rounded-[1.25rem] border border-white/14 bg-[linear-gradient(180deg,rgba(255,255,255,0.06),rgba(10,22,44,0.46))]">
                    <div className="pointer-events-none absolute inset-0 rounded-[1.25rem] bg-[radial-gradient(circle_at_50%_26%,rgba(56,189,248,0.2),transparent_26%)]" />
                    <div className="relative flex h-full min-h-[10.5rem] items-center justify-center p-2 md:min-h-[12rem]">
                      {problem && prism && (
                        <motion.div
                          animate={{ rotateY: [0, 360], rotateX: [0, 360] }}
                          transition={{ duration: 18, repeat: Infinity, ease: 'linear' }}
                          className="relative"
                          style={{
                            width: prism.width,
                            height: prism.height,
                            transformStyle: 'preserve-3d',
                          }}
                        >
                          <div className="cube-face" style={{ width: prism.width, height: prism.height, transform: `translateZ(${prism.depth / 2}px)` }} />
                          <div className="cube-face" style={{ width: prism.width, height: prism.height, transform: `rotateY(180deg) translateZ(${prism.depth / 2}px)` }} />
                          <div className="cube-face" style={{ width: prism.depth, height: prism.height, left: '50%', transform: `translateX(-50%) rotateY(90deg) translateZ(${prism.width / 2}px)` }} />
                          <div className="cube-face" style={{ width: prism.depth, height: prism.height, left: '50%', transform: `translateX(-50%) rotateY(-90deg) translateZ(${prism.width / 2}px)` }} />
                          <div className="cube-face" style={{ width: prism.width, height: prism.depth, top: '50%', transform: `translateY(-50%) rotateX(90deg) translateZ(${prism.height / 2}px)` }} />
                          <div className="cube-face" style={{ width: prism.width, height: prism.depth, top: '50%', transform: `translateY(-50%) rotateX(-90deg) translateZ(${prism.height / 2}px)` }} />
                        </motion.div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="licensed-game-card-dark flex min-h-0 flex-col rounded-[1.5rem] p-3 md:p-4">
                  <div className="vault-display rounded-[1rem] px-4 py-3 text-right text-3xl font-black md:text-4xl">
                    {inputValue || '0'}
                  </div>

                  <div className="my-3 flex items-center justify-center">
                    <motion.div
                      animate={{ rotate: isDialRotating ? 360 : 0 }}
                      transition={{ duration: 0.7, ease: 'easeInOut' }}
                      className="vault-dial relative flex h-20 w-20 items-center justify-center md:h-24 md:w-24"
                    >
                      <div className="h-8 w-1.5 -translate-y-3 rounded-full bg-yellow-300/95" />
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="h-3.5 w-3.5 rounded-full bg-yellow-300 shadow-[0_0_10px_rgba(251,191,36,0.9)]" />
                      </div>
                    </motion.div>
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    {['1', '2', '3', '4', '5', '6', '7', '8', '9', 'CLR', '0', 'DEL'].map((key) => (
                      <button
                        key={key}
                        onClick={() => handleKeypad(key)}
                        disabled={state.status !== 'playing'}
                        className={`vault-button h-12 text-lg font-black ${key === 'DEL' || key === 'CLR' ? 'text-yellow-100' : ''}`}
                      >
                        {key}
                      </button>
                    ))}
                  </div>

                  <button
                    onClick={checkAnswer}
                    disabled={!inputValue || state.status !== 'playing'}
                    className="mt-3 flex h-12 w-full items-center justify-center gap-2 rounded-[1rem] border border-yellow-100/70 bg-[linear-gradient(180deg,#facc15,#f59e0b)] text-sm font-black uppercase tracking-[0.14em] text-amber-950 shadow-[0_12px_20px_rgba(0,0,0,0.3)] disabled:opacity-45"
                  >
                    <ShieldCheck className="h-4.5 w-4.5" />
                    Engage Lock
                  </button>

                  <div className="mt-3 min-h-[2.6rem] rounded-[0.95rem] border border-white/14 bg-white/8 px-3 py-2 text-center text-xs font-black uppercase tracking-[0.11em] text-white/84">
                    {state.message}
                  </div>

                  <div className="mt-3 flex gap-2">
                    {state.status === 'unlocked' ? (
                      <button
                        onClick={nextLevel}
                        className="flex h-11 flex-1 items-center justify-center gap-2 rounded-[0.95rem] border border-emerald-200/70 bg-[linear-gradient(180deg,#4ade80,#22c55e)] text-xs font-black uppercase tracking-[0.14em] text-emerald-950"
                      >
                        Next Vault
                        <ChevronRight className="h-4 w-4" />
                      </button>
                    ) : state.status === 'failed' ? (
                      <button
                        onClick={retryCurrent}
                        className="flex h-11 flex-1 items-center justify-center gap-2 rounded-[0.95rem] border border-blue-200/70 bg-[linear-gradient(180deg,#38bdf8,#2563eb)] text-xs font-black uppercase tracking-[0.14em] text-white"
                      >
                        <RotateCcw className="h-4 w-4" />
                        Retry
                      </button>
                    ) : (
                      <div className="h-11 flex-1 rounded-[0.95rem] border border-white/12 bg-white/6" />
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="pointer-events-none absolute inset-x-0 bottom-[max(0.45rem,env(safe-area-inset-bottom))] z-40 flex justify-center">
          <div className="pointer-events-auto">
            <GameActionDock onBack={onBack} compact />
          </div>
        </div>
      </div>

      <AnimatePresence>
        {state.status === 'complete' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="absolute inset-0 z-50 flex items-center justify-center bg-[#060f20]/92 p-6 backdrop-blur-lg"
          >
            <div className="licensed-game-card w-full max-w-[30rem] px-6 py-7 text-center md:px-8 md:py-8">
              <div className="mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-full bg-yellow-400 shadow-[0_0_45px_rgba(251,191,36,0.35)]">
                <Trophy className="h-10 w-10 text-slate-900" />
              </div>
              <h2 className="text-3xl font-black uppercase tracking-tight text-white">Vaults Cleared</h2>
              <p className="mt-2 text-sm font-bold text-white/80">
                Every cage lock is secured. Volume mastery achieved.
              </p>
              <div className="mt-4 rounded-[1rem] border border-yellow-100/25 bg-blue-950/62 p-4">
                <div className="text-[10px] font-black uppercase tracking-[0.2em] text-white/62">Final Score</div>
                <div className="mt-1 text-4xl font-black text-yellow-300">{state.score.toLocaleString()}</div>
              </div>
              <div className="mt-5 flex flex-col gap-2">
                <button
                  onClick={completeMission}
                  className="flex h-11 w-full items-center justify-center gap-2 rounded-[0.95rem] border border-blue-200/70 bg-[linear-gradient(180deg,#38bdf8,#2563eb)] text-sm font-black uppercase tracking-[0.14em] text-white"
                >
                  <CheckCircle2 className="h-4 w-4" />
                  Finish Report
                </button>
                <button
                  onClick={startExpedition}
                  className="flex h-11 w-full items-center justify-center gap-2 rounded-[0.95rem] border border-yellow-100/70 bg-[linear-gradient(180deg,#facc15,#f59e0b)] text-sm font-black uppercase tracking-[0.14em] text-amber-950"
                >
                  <RotateCcw className="h-4 w-4" />
                  Replay
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {state.status === 'failed' && state.attempts >= 3 && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -16 }}
            className="absolute bottom-[calc(env(safe-area-inset-bottom)+5.6rem)] left-1/2 z-40 flex -translate-x-1/2 items-center gap-2 rounded-full border border-rose-300/40 bg-rose-500/22 px-5 py-2 text-xs font-black uppercase tracking-[0.12em] text-rose-100 shadow-[0_12px_20px_rgba(0,0,0,0.3)]"
          >
            <AlertCircle className="h-4 w-4" />
            Lockdown triggered
          </motion.div>
        )}
      </AnimatePresence>

      <style>{`
        .vault-display {
          font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace;
          background: #071934;
          border: 2px solid rgba(59, 130, 246, 0.52);
          color: #fde68a;
          text-shadow: 0 0 8px rgba(251, 191, 36, 0.62);
          box-shadow: inset 0 0 14px rgba(59, 130, 246, 0.2);
        }

        .vault-button {
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 0.75rem;
          border: 2px solid rgba(59, 130, 246, 0.45);
          background: linear-gradient(180deg, #0f2f5d, #0a2346);
          color: #dbeafe;
          transition: all 0.2s ease;
          box-shadow: 0 8px 14px rgba(0, 0, 0, 0.28);
        }

        .vault-button:hover {
          background: linear-gradient(180deg, #144079, #0d2e5e);
        }

        .vault-button:active {
          transform: scale(0.96);
          background: linear-gradient(180deg, #0d2b54, #0a2142);
        }

        .vault-dial {
          border-radius: 9999px;
          border: 5px solid rgba(59, 130, 246, 0.44);
          background: radial-gradient(circle at 30% 30%, #0f3a72, #0a2346);
          box-shadow: 0 16px 28px rgba(0, 0, 0, 0.36);
        }

        .cube-face {
          position: absolute;
          border: 2px solid rgba(251, 191, 36, 0.46);
          background: rgba(30, 64, 175, 0.25);
          box-shadow: inset 0 0 20px rgba(2, 6, 23, 0.22);
        }
      `}</style>
    </div>
  );
};

export default VolumeVaultGame;
