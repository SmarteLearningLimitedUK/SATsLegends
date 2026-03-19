import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Lock,
  Unlock,
  RotateCcw,
  Trophy,
  ChevronRight,
  AlertCircle,
  Box,
  Layers,
  Maximize,
  Settings,
  ShieldCheck,
  History,
  ChevronLeft,
  CheckCircle2,
} from 'lucide-react';

type ShapeType = 'cube' | 'cuboid';

interface VolumeProblem {
  id: number;
  type: ShapeType;
  length: number;
  width: number;
  height: number;
  unit: string;
  volume: number;
}

type VaultStatus = 'start' | 'playing' | 'unlocked' | 'failed' | 'complete';

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
  message: 'READY TO UNLOCK THE VAULT?',
};

const VAULT_LEVELS = [
  { name: 'Bronze Vault', threshold: 0, difficulty: 1 },
  { name: 'Silver Vault', threshold: 1000, difficulty: 2 },
  { name: 'Gold Vault', threshold: 3000, difficulty: 3 },
  { name: 'Platinum Vault', threshold: 6000, difficulty: 4 },
  { name: 'Diamond Vault', threshold: 10000, difficulty: 5 },
];

const MAX_LEVEL = 10;

const scoreToStars = (score: number) => {
  if (score >= 12000) return 3;
  if (score >= 8000) return 2;
  return 1;
};

const VolumeVaultGame: React.FC<VolumeVaultGameProps> = ({
  levelId: _levelId,
  avatarId: _avatarId,
  onVictory,
  onGameOver,
  onBack,
}) => {
  const [state, setState] = useState<VaultState>(INITIAL_STATE);
  const [inputValue, setInputValue] = useState('');
  const [isDialRotating, setIsDialRotating] = useState(false);

  const endedRef = useRef(false);
  const timeoutsRef = useRef<number[]>([]);

  const clearTimers = () => {
    timeoutsRef.current.forEach((id) => window.clearTimeout(id));
    timeoutsRef.current = [];
  };

  useEffect(() => () => clearTimers(), []);

  const generateProblem = useCallback((level: number): VolumeProblem => {
    const type: ShapeType = Math.random() > 0.5 ? 'cube' : 'cuboid';
    let length: number;
    let width: number;
    let height: number;
    const unit = 'cm';

    if (type === 'cube') {
      length = width = height = Math.floor(Math.random() * (level + 4)) + 2;
    } else {
      length = Math.floor(Math.random() * (level + 5)) + 2;
      width = Math.floor(Math.random() * (level + 3)) + 2;
      height = Math.floor(Math.random() * (level + 4)) + 2;
    }

    return {
      id: Date.now() + Math.floor(Math.random() * 1000),
      type,
      length,
      width,
      height,
      unit,
      volume: length * width * height,
    };
  }, []);

  const startMission = useCallback((level: number) => {
    const problem = generateProblem(level);
    setState((previous) => ({
      ...previous,
      level,
      currentProblem: problem,
      status: 'playing',
      message: 'CALCULATE VOLUME TO UNLOCK',
    }));
    setInputValue('');
  }, [generateProblem]);

  const startExpedition = () => {
    clearTimers();
    endedRef.current = false;
    setState(INITIAL_STATE);
    startMission(1);
  };

  const handleKeypad = (value: string) => {
    if (state.status !== 'playing') return;

    if (value === 'DEL') {
      setInputValue((previous) => previous.slice(0, -1));
      return;
    }

    if (inputValue.length < 8) {
      setInputValue((previous) => `${previous}${value}`);
    }
  };

  const failMission = () => {
    setState((previous) => {
      const nextAttempts = previous.attempts + 1;
      return {
        ...previous,
        attempts: nextAttempts,
        status: 'failed',
        message: `ACCESS DENIED. CORRECT VOLUME: ${previous.currentProblem?.volume}`,
      };
    });
  };

  const checkAnswer = () => {
    if (!state.currentProblem || state.status !== 'playing') return;

    setIsDialRotating(true);

    const timeoutId = window.setTimeout(() => {
      setIsDialRotating(false);
      const isCorrect = Number(inputValue) === state.currentProblem?.volume;

      if (isCorrect) {
        const points = 500 + (state.level * 100);
        setState((previous) => ({
          ...previous,
          score: previous.score + points,
          status: 'unlocked',
          message: 'VAULT UNLOCKED! ACCESS GRANTED.',
        }));
        return;
      }

      failMission();
    }, 900);

    timeoutsRef.current.push(timeoutId);
  };

  const retryCurrent = () => {
    if (!state.currentProblem) {
      startMission(state.level);
      return;
    }

    setState((previous) => ({
      ...previous,
      status: 'playing',
      message: 'CALCULATE VOLUME TO UNLOCK',
    }));
    setInputValue('');
  };

  const nextLevel = () => {
    const nextLevelValue = state.level + 1;
    if (nextLevelValue > MAX_LEVEL) {
      setState((previous) => ({
        ...previous,
        status: 'complete',
        message: 'ALL VAULTS BREACHED.',
      }));
      return;
    }

    startMission(nextLevelValue);
  };

  useEffect(() => {
    if (state.status !== 'failed' || state.attempts < 3 || endedRef.current) return;

    endedRef.current = true;
    const timeoutId = window.setTimeout(() => {
      onGameOver(state.score);
    }, 800);

    timeoutsRef.current.push(timeoutId);
  }, [onGameOver, state.attempts, state.score, state.status]);

  const completeMission = () => {
    if (endedRef.current) return;
    endedRef.current = true;
    onVictory(scoreToStars(state.score), state.score);
  };

  const currentVault = useMemo(
    () => [...VAULT_LEVELS].reverse().find((vault) => state.score >= vault.threshold) || VAULT_LEVELS[0],
    [state.score],
  );

  return (
    <div className="relative h-full w-full overflow-hidden bg-zinc-950 text-white selection:bg-yellow-500/30">
      <div
        className="pointer-events-none absolute inset-0 opacity-10"
        style={{ backgroundImage: 'radial-gradient(#ffffff 1px, transparent 1px)', backgroundSize: '40px 40px' }}
      />

      <div className="relative z-10 flex h-full flex-col p-6 lg:flex-row lg:gap-8">
        <div className="flex flex-1 flex-col gap-6">
          <header className="vault-panel flex items-center justify-between p-4">
            <div className="flex items-center gap-4">
              <button
                type="button"
                onClick={onBack}
                className="flex h-10 w-10 items-center justify-center rounded-xl border border-zinc-700 bg-zinc-900 text-zinc-300 transition hover:bg-zinc-800"
                aria-label="Back to levels"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-zinc-700 bg-zinc-800 text-yellow-500">
                <ShieldCheck className="h-7 w-7" />
              </div>
              <div>
                <h1 className="text-xl font-black tracking-tighter text-white italic">VOLUME VAULT</h1>
                <p className="text-[10px] font-bold tracking-[0.3em] text-zinc-500 uppercase">{currentVault.name}</p>
              </div>
            </div>
            <div className="flex gap-8 text-right">
              <div>
                <p className="text-[10px] font-black tracking-widest text-zinc-500 uppercase">Level</p>
                <p className="font-mono text-2xl font-black text-yellow-500">{state.level}</p>
              </div>
              <div>
                <p className="text-[10px] font-black tracking-widest text-zinc-500 uppercase">Total Value</p>
                <p className="font-mono text-2xl font-black">${state.score.toLocaleString()}</p>
              </div>
            </div>
          </header>

          <div className="vault-panel relative flex flex-1 items-center justify-center overflow-hidden">
            <AnimatePresence mode="wait">
              {state.status === 'start' ? (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 1.1 }}
                  className="flex flex-col items-center p-8 text-center"
                >
                  <div className="mb-8 rounded-full border-4 border-zinc-800 bg-zinc-900 p-8 shadow-2xl">
                    <Lock className="h-24 w-24 text-zinc-600" />
                  </div>
                  <h2 className="mb-4 text-4xl font-black tracking-tighter text-white uppercase italic">Secure Storage</h2>
                  <p className="mb-8 max-w-md font-medium text-zinc-400">
                    Calculate the volume of 3D shapes to crack the code and unlock the treasure vaults.
                  </p>
                  <button
                    onClick={startExpedition}
                    className="group flex items-center gap-3 rounded-full bg-yellow-500 px-10 py-4 font-black text-black transition-all hover:scale-105 hover:bg-yellow-400 active:scale-95"
                  >
                    INITIALIZE BREACH
                    <ChevronRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
                  </button>
                </motion.div>
              ) : (
                <div className="relative flex h-full w-full items-center justify-center">
                  <div className="shape-container flex h-64 w-64 items-center justify-center">
                    {state.currentProblem && (
                      <motion.div
                        animate={{ rotateY: [0, 360], rotateX: [0, 360] }}
                        transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
                        className="relative"
                        style={{
                          width: state.currentProblem.width * 20,
                          height: state.currentProblem.height * 20,
                          transformStyle: 'preserve-3d',
                        }}
                      >
                        <div className="cube-face" style={{ width: '100%', height: '100%', transform: `translateZ(${state.currentProblem.length * 10}px)` }}>
                          <span className="text-xs">{state.currentProblem.width}{state.currentProblem.unit}</span>
                        </div>
                        <div className="cube-face" style={{ width: '100%', height: '100%', transform: `rotateY(180deg) translateZ(${state.currentProblem.length * 10}px)` }} />
                        <div className="cube-face" style={{ width: `${state.currentProblem.length * 20}px`, height: '100%', left: '50%', transform: `translateX(-50%) rotateY(90deg) translateZ(${state.currentProblem.width * 10}px)` }}>
                          <span className="text-xs">{state.currentProblem.length}{state.currentProblem.unit}</span>
                        </div>
                        <div className="cube-face" style={{ width: `${state.currentProblem.length * 20}px`, height: '100%', left: '50%', transform: `translateX(-50%) rotateY(-90deg) translateZ(${state.currentProblem.width * 10}px)` }} />
                        <div className="cube-face" style={{ width: '100%', height: `${state.currentProblem.length * 20}px`, top: '50%', transform: `translateY(-50%) rotateX(90deg) translateZ(${state.currentProblem.height * 10}px)` }}>
                          <span className="text-xs">{state.currentProblem.height}{state.currentProblem.unit}</span>
                        </div>
                        <div className="cube-face" style={{ width: '100%', height: `${state.currentProblem.length * 20}px`, top: '50%', transform: `translateY(-50%) rotateX(-90deg) translateZ(${state.currentProblem.height * 10}px)` }} />
                      </motion.div>
                    )}
                  </div>

                  <div className="absolute left-8 top-8 space-y-4">
                    <div className="flex items-center gap-3 rounded-lg border border-white/10 bg-black/60 p-3 backdrop-blur-md">
                      <Maximize className="h-4 w-4 text-yellow-500" />
                      <span className="text-xs font-bold tracking-widest uppercase">Length: {state.currentProblem?.length}{state.currentProblem?.unit}</span>
                    </div>
                    <div className="flex items-center gap-3 rounded-lg border border-white/10 bg-black/60 p-3 backdrop-blur-md">
                      <Layers className="h-4 w-4 text-yellow-500" />
                      <span className="text-xs font-bold tracking-widest uppercase">Width: {state.currentProblem?.width}{state.currentProblem?.unit}</span>
                    </div>
                    <div className="flex items-center gap-3 rounded-lg border border-white/10 bg-black/60 p-3 backdrop-blur-md">
                      <Box className="h-4 w-4 text-yellow-500" />
                      <span className="text-xs font-bold tracking-widest uppercase">Height: {state.currentProblem?.height}{state.currentProblem?.unit}</span>
                    </div>
                  </div>

                  <div className="absolute bottom-8 right-8">
                    <div className={`flex items-center gap-4 rounded-xl border-2 p-4 transition-colors ${
                      state.status === 'unlocked'
                        ? 'border-green-500 bg-green-500/10 text-green-500'
                        : state.status === 'failed'
                          ? 'border-red-500 bg-red-500/10 text-red-500'
                          : 'border-zinc-700 bg-black/60 text-zinc-400'
                    }`}>
                      {state.status === 'unlocked' ? <Unlock className="h-6 w-6" /> : <Lock className="h-6 w-6" />}
                      <span className="text-sm font-black tracking-widest uppercase">{state.message}</span>
                    </div>
                  </div>
                </div>
              )}
            </AnimatePresence>
          </div>
        </div>

        <div className="flex w-full flex-col gap-6 lg:w-[400px]">
          <div className="vault-panel flex flex-1 flex-col p-8">
            <div className="mb-8 flex items-center justify-between border-b border-zinc-800 pb-4">
              <div className="flex items-center gap-2">
                <Settings className="h-4 w-4 text-zinc-500" />
                <span className="text-xs font-bold tracking-widest text-zinc-500 uppercase">Manual Override</span>
              </div>
              <History className="h-4 w-4 text-zinc-500" />
            </div>

            <div className="flex flex-1 flex-col gap-8">
              <div className="vault-display flex h-24 items-center justify-end rounded-xl px-8 text-5xl">
                {inputValue || '0'}
                <motion.span
                  animate={{ opacity: [1, 0] }}
                  transition={{ repeat: Infinity, duration: 0.8 }}
                  className="ml-2 h-10 w-1 bg-green-500"
                />
              </div>

              <div className="flex justify-center py-4">
                <div className="relative flex h-40 w-40 items-center justify-center">
                  <motion.div
                    animate={{ rotate: isDialRotating ? 360 : 0 }}
                    transition={{ duration: 0.9, ease: 'easeInOut' }}
                    className="vault-dial flex h-full w-full items-center justify-center"
                  >
                    <div className="h-12 w-2 -translate-y-8 rounded-full bg-zinc-600" />
                    <div className="absolute inset-4 rounded-full border-2 border-zinc-700/50" />
                  </motion.div>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full border-2 border-zinc-700 bg-zinc-900">
                      <div className="h-2 w-2 rounded-full bg-yellow-500 shadow-[0_0_10px_#d4af37]" />
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                {['1', '2', '3', '4', '5', '6', '7', '8', '9', '0', 'DEL'].map((key) => (
                  <button
                    key={key}
                    onClick={() => handleKeypad(key)}
                    className={`vault-button h-14 text-xl font-black ${key === 'DEL' ? 'text-red-500' : ''}`}
                  >
                    {key}
                  </button>
                ))}
                <button
                  onClick={checkAnswer}
                  disabled={!inputValue || state.status !== 'playing'}
                  className="vault-button col-span-2 h-14 bg-yellow-500/10 text-sm font-black text-yellow-500 hover:bg-yellow-500/20 disabled:opacity-50"
                >
                  ENGAGE LOCK
                </button>
              </div>

              <div className="mt-auto pt-6">
                {state.status === 'unlocked' ? (
                  <button
                    onClick={nextLevel}
                    className="flex w-full items-center justify-center gap-3 rounded-xl bg-green-500 py-5 font-black text-black transition-all hover:bg-green-400"
                  >
                    PROCEED TO NEXT VAULT
                    <ChevronRight className="h-5 w-5" />
                  </button>
                ) : state.status === 'failed' ? (
                  <button
                    onClick={retryCurrent}
                    className="flex w-full items-center justify-center gap-3 rounded-xl bg-red-500 py-5 font-black text-white transition-all hover:bg-red-400"
                  >
                    <RotateCcw className="h-5 w-5" />
                    RETRY BREACH
                  </button>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {state.status === 'complete' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="absolute inset-0 z-50 flex items-center justify-center bg-black/95 p-12 text-center backdrop-blur-xl"
          >
            <div className="flex max-w-md flex-col items-center">
              <div className="mb-8 flex h-32 w-32 items-center justify-center rounded-full bg-yellow-500 shadow-[0_0_50px_rgba(212,175,55,0.4)]">
                <Trophy className="h-16 w-16 text-black" />
              </div>
              <h2 className="mb-4 text-5xl font-black tracking-tighter text-white uppercase italic">Master Cracker</h2>
              <p className="mb-12 leading-relaxed font-medium text-zinc-400">
                You have successfully breached all high-security vaults. Your spatial calculation skills are legendary.
              </p>
              <div className="vault-panel mb-6 w-full p-8">
                <p className="mb-2 text-[10px] font-black tracking-widest text-zinc-500 uppercase">Final Loot Value</p>
                <p className="text-5xl font-black text-yellow-500">${state.score.toLocaleString()}</p>
              </div>
              <div className="flex w-full flex-col gap-3">
                <button
                  onClick={completeMission}
                  className="flex items-center justify-center gap-3 rounded-full bg-white px-12 py-5 font-black text-black transition-all hover:bg-zinc-200"
                >
                  <CheckCircle2 className="h-5 w-5" /> SUBMIT VAULT REPORT
                </button>
                <button
                  onClick={startExpedition}
                  className="flex items-center justify-center gap-3 rounded-full bg-yellow-500 px-12 py-5 font-black text-black transition-all hover:bg-yellow-400"
                >
                  <RotateCcw className="h-5 w-5" /> NEW EXPEDITION
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
            className="absolute bottom-12 left-1/2 z-40 flex -translate-x-1/2 items-center gap-3 rounded-2xl border border-red-500/20 bg-red-500/10 px-8 py-4 text-red-400 shadow-2xl"
          >
            <AlertCircle className="h-5 w-5" />
            <span className="text-sm font-black tracking-wide uppercase">SECURITY LOCKDOWN. EXTRACTION IN PROGRESS.</span>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="absolute bottom-2 left-1/2 -translate-x-1/2 text-[8px] font-bold tracking-[0.4em] text-zinc-700 uppercase">
        INDUSTRIAL SECURITY PROTOCOL // V-VAULT 2.0.1
      </div>

      <style>{`
        .vault-panel {
          background: linear-gradient(145deg, #2a2a2a, #1a1a1a);
          border: 2px solid #4a4a4a;
          box-shadow: 10px 10px 20px #0d0d0d, -10px -10px 20px #272727;
          border-radius: 20px;
        }

        .vault-display {
          font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace;
          background: #000;
          border: 4px solid #333;
          color: #00ff00;
          text-shadow: 0 0 5px #00ff00;
          box-shadow: inset 0 0 10px rgba(0, 255, 0, 0.2);
        }

        .vault-button {
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 0.5rem;
          border: 2px solid #3f3f46;
          background: #27272a;
          transition: all 0.2s ease;
          box-shadow: 4px 4px 8px #0d0d0d, -2px -2px 4px #272727;
        }

        .vault-button:hover {
          background: #3f3f46;
        }

        .vault-button:active {
          transform: scale(0.95);
          background: #18181b;
        }

        .vault-dial {
          border-radius: 9999px;
          border: 8px solid #3f3f46;
          background: #27272a;
          box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
        }

        .shape-container {
          perspective: 1000px;
        }

        .cube-face {
          position: absolute;
          border: 2px solid rgba(255, 255, 255, 0.2);
          background: rgba(100, 100, 100, 0.1);
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: bold;
          color: white;
        }
      `}</style>
    </div>
  );
};

export default VolumeVaultGame;
