import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Shield,
  Zap,
  Trophy,
  RotateCcw,
  Flame,
  Skull,
  Play,
  Activity,
  Target,
  Ghost,
  ChevronRight,
  AlertCircle,
} from 'lucide-react';
import GameActionDock from '../components/GameActionDock';
import MiniGameTopBar from '../components/MiniGameTopBar';

type Operation = '+' | '-' | '*' | '/';
type MonsterType = 'slime' | 'ghost' | 'demon' | 'boss';
type GameStatus = 'start' | 'playing' | 'wave_complete' | 'gameover' | 'complete';

interface Monster {
  id: string;
  x: number;
  y: number;
  speed: number;
  problem: string;
  answer: number;
  type: MonsterType;
  health: number;
  maxHealth: number;
}

interface GameState {
  score: number;
  health: number;
  wave: number;
  monsters: Monster[];
  status: GameStatus;
  inputValue: string;
}

interface CalculationCrashGameProps {
  levelId: number;
  avatarId: string;
  onVictory: (stars: number, score: number) => void;
  onGameOver: (score: number) => void;
  onBack: () => void;
}

type AnswerFeedback = {
  type: 'hit' | 'miss' | 'clear';
  message: string;
};

const INITIAL_HEALTH = 100;
const SPAWN_INTERVAL_BASE = 3000;
const WAVE_MONSTER_COUNT_BASE = 5;
const MAX_WAVES = 10;

const MONSTER_TYPES: Record<MonsterType, {
  health: number;
  speed: number;
  reward: number;
  color: string;
  ring: string;
}> = {
  slime: {
    health: 1,
    speed: 0.09,
    reward: 100,
    color: 'from-emerald-400 to-green-600',
    ring: 'ring-emerald-300/40',
  },
  ghost: {
    health: 2,
    speed: 0.11,
    reward: 180,
    color: 'from-cyan-300 to-sky-600',
    ring: 'ring-cyan-300/40',
  },
  demon: {
    health: 3,
    speed: 0.13,
    reward: 300,
    color: 'from-orange-400 to-rose-600',
    ring: 'ring-orange-300/50',
  },
  boss: {
    health: 5,
    speed: 0.08,
    reward: 700,
    color: 'from-fuchsia-500 to-violet-700',
    ring: 'ring-fuchsia-300/60',
  },
};

const scoreToStars = (score: number) => {
  if (score >= 12000) return 3;
  if (score >= 8000) return 2;
  return 1;
};

const monsterIcon = (type: MonsterType) => {
  if (type === 'boss') return Skull;
  if (type === 'demon') return Flame;
  if (type === 'ghost') return Ghost;
  return Activity;
};

const CalculationCrashGame: React.FC<CalculationCrashGameProps> = ({
  levelId: _levelId,
  avatarId: _avatarId,
  onVictory,
  onGameOver,
  onBack,
}) => {
  const [state, setState] = useState<GameState>({
    score: 0,
    health: INITIAL_HEALTH,
    wave: 1,
    monsters: [],
    status: 'start',
    inputValue: '',
  });
  const [answerFeedback, setAnswerFeedback] = useState<AnswerFeedback | null>(null);

  const monstersSpawnedInWaveRef = useRef(0);
  const gameLoopRef = useRef<number | null>(null);
  const lastSpawnTimeRef = useRef<number>(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const endedRef = useRef(false);

  const generateProblem = useCallback((wave: number) => {
    const ops: Operation[] = ['+', '-', '*', '/'];
    let op: Operation;
    let a: number;
    let b: number;
    let answer: number;
    let type: MonsterType = 'slime';

    if (wave < 3) op = ops[Math.floor(Math.random() * 2)];
    else if (wave < 5) op = ops[Math.floor(Math.random() * 3)];
    else op = ops[Math.floor(Math.random() * 4)];

    const rand = Math.random();
    if (wave > 8 && rand < 0.12) type = 'boss';
    else if (wave > 5 && rand < 0.32) type = 'demon';
    else if (wave > 2 && rand < 0.56) type = 'ghost';

    switch (op) {
      case '+':
        a = Math.floor(Math.random() * (10 * wave)) + 5;
        b = Math.floor(Math.random() * (10 * wave)) + 5;
        answer = a + b;
        return { problem: `${a} + ${b}`, answer, type };
      case '-':
        a = Math.floor(Math.random() * (10 * wave)) + 10;
        b = Math.floor(Math.random() * a) + 1;
        answer = a - b;
        return { problem: `${a} - ${b}`, answer, type };
      case '*':
        a = Math.floor(Math.random() * 12) + 2;
        b = Math.floor(Math.random() * 12) + 2;
        answer = a * b;
        return { problem: `${a} x ${b}`, answer, type };
      case '/':
      default:
        b = Math.floor(Math.random() * 10) + 2;
        answer = Math.floor(Math.random() * 10) + 2;
        a = b * answer;
        return { problem: `${a} / ${b}`, answer, type };
    }
  }, []);

  const createMonster = useCallback((wave: number): Monster => {
    const { problem, answer, type } = generateProblem(wave);
    const profile = MONSTER_TYPES[type];

    return {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      x: 100,
      y: 10 + Math.random() * 78,
      speed: profile.speed + (wave * 0.005),
      problem,
      answer,
      type,
      health: profile.health,
      maxHealth: profile.health,
    };
  }, [generateProblem]);

  const resetWaveCounters = () => {
    monstersSpawnedInWaveRef.current = 0;
    lastSpawnTimeRef.current = performance.now();
  };

  const startGame = () => {
    endedRef.current = false;
    resetWaveCounters();
    setAnswerFeedback(null);
    setState({
      score: 0,
      health: INITIAL_HEALTH,
      wave: 1,
      monsters: [],
      status: 'playing',
      inputValue: '',
    });
    window.setTimeout(() => inputRef.current?.focus(), 30);
  };

  const submitVictory = () => {
    if (endedRef.current) return;
    endedRef.current = true;
    onVictory(scoreToStars(state.score), state.score);
  };

  const submitDefeat = () => {
    if (endedRef.current) return;
    endedRef.current = true;
    onGameOver(state.score);
  };

  const updateGame = useCallback((time: number) => {
    setState((previous) => {
      if (previous.status !== 'playing') return previous;

      let updatedMonsters = previous.monsters.map((monster) => ({
        ...monster,
        x: monster.x - monster.speed,
      }));

      const reachedBase = updatedMonsters.filter((monster) => monster.x <= 5);
      updatedMonsters = updatedMonsters.filter((monster) => monster.x > 5);

      const newHealth = Math.max(0, previous.health - (reachedBase.length * 10));
      let nextStatus: GameStatus = newHealth <= 0 ? 'gameover' : 'playing';

      const monstersInWave = WAVE_MONSTER_COUNT_BASE + (previous.wave * 2);
      const spawnInterval = Math.max(900, SPAWN_INTERVAL_BASE - (previous.wave * 200));

      if (
        nextStatus === 'playing'
        && monstersSpawnedInWaveRef.current < monstersInWave
        && time - lastSpawnTimeRef.current > spawnInterval
      ) {
        updatedMonsters = [...updatedMonsters, createMonster(previous.wave)];
        monstersSpawnedInWaveRef.current += 1;
        lastSpawnTimeRef.current = time;
      }

      if (
        nextStatus === 'playing'
        && monstersSpawnedInWaveRef.current >= monstersInWave
        && updatedMonsters.length === 0
      ) {
        nextStatus = previous.wave >= MAX_WAVES ? 'complete' : 'wave_complete';
      }

      return {
        ...previous,
        health: newHealth,
        monsters: updatedMonsters,
        status: nextStatus,
      };
    });

    gameLoopRef.current = requestAnimationFrame(updateGame);
  }, [createMonster]);

  useEffect(() => {
    if (state.status !== 'playing') {
      if (gameLoopRef.current) {
        cancelAnimationFrame(gameLoopRef.current);
        gameLoopRef.current = null;
      }
      return undefined;
    }

    gameLoopRef.current = requestAnimationFrame(updateGame);

    return () => {
      if (gameLoopRef.current) {
        cancelAnimationFrame(gameLoopRef.current);
        gameLoopRef.current = null;
      }
    };
  }, [state.status, updateGame]);

  const continueWave = () => {
    const nextWave = state.wave + 1;
    resetWaveCounters();
    setAnswerFeedback(null);
    setState((previous) => ({
      ...previous,
      wave: nextWave,
      monsters: [],
      status: 'playing',
      inputValue: '',
    }));
    window.setTimeout(() => inputRef.current?.focus(), 30);
  };

  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const cleaned = event.target.value.replace(/[^\d-]/g, '');
    const value = cleaned.startsWith('-')
      ? `-${cleaned.slice(1).replace(/-/g, '')}`
      : cleaned.replace(/-/g, '');
    setState((previous) => ({ ...previous, inputValue: value }));
    if (answerFeedback) setAnswerFeedback(null);
  };

  const submitAnswer = (event: React.FormEvent) => {
    event.preventDefault();
    if (state.status !== 'playing') return;

    const rawValue = state.inputValue.trim();
    if (!rawValue || rawValue === '-') {
      setAnswerFeedback({ type: 'miss', message: 'Enter an answer first.' });
      return;
    }

    const numVal = Number(rawValue);
    if (Number.isNaN(numVal)) {
      setAnswerFeedback({ type: 'miss', message: 'Answer must be a number.' });
      return;
    }

    const targetMonster = [...state.monsters]
      .filter((monster) => monster.answer === numVal)
      .sort((a, b) => a.x - b.x)[0];

    if (!targetMonster) {
      setState((previous) => ({ ...previous, inputValue: '' }));
      setAnswerFeedback({ type: 'miss', message: 'No monster matches that answer.' });
      window.setTimeout(() => inputRef.current?.focus(), 0);
      return;
    }

    const eliminated = targetMonster.health <= 1;
    setState((previous) => {
      const monsters: Monster[] = [];
      let scoreGain = 0;

      for (const monster of previous.monsters) {
        if (monster.id !== targetMonster.id) {
          monsters.push(monster);
          continue;
        }

        const nextHealth = monster.health - 1;
        if (nextHealth > 0) {
          monsters.push({ ...monster, health: nextHealth });
        } else {
          scoreGain += MONSTER_TYPES[monster.type].reward;
        }
      }

      return {
        ...previous,
        monsters,
        score: previous.score + scoreGain,
        inputValue: '',
      };
    });

    setAnswerFeedback({
      type: eliminated ? 'clear' : 'hit',
      message: eliminated ? 'Target neutralized.' : 'Direct hit.',
    });

    window.setTimeout(() => {
      setAnswerFeedback(null);
      inputRef.current?.focus();
    }, 900);
  };

  const healthPercent = Math.max(0, Math.min(100, state.health));

  const waveSpawnGoal = useMemo(
    () => WAVE_MONSTER_COUNT_BASE + (state.wave * 2),
    [state.wave],
  );

  return (
    <div className="relative h-full w-full overflow-hidden bg-[#050505] text-white">
      <div className="battlefield-grid" />

      <MiniGameTopBar
        onBack={onBack}
        score={state.score}
        scoreLabel="Score"
        metaLabel="Wave"
        metaValue={`${state.wave}/${MAX_WAVES}`}
      />

      <div className="relative z-10 flex h-full flex-col p-5 pb-[calc(env(safe-area-inset-bottom)+4.8rem)] pt-[calc(env(safe-area-inset-top)+3.55rem)]">
        <div className="mb-3 flex items-center justify-end gap-2">
          <div className="pvp-hud-chip pvp-hud-chip-alt">
            Threat {Math.min(monstersSpawnedInWaveRef.current, waveSpawnGoal)}/{waveSpawnGoal}
          </div>
          <div className="pvp-hud-chip">
            Core {state.health}%
          </div>
        </div>

        <main className="relative flex min-h-0 flex-1 overflow-hidden rounded-2xl border border-white/10 bg-[radial-gradient(circle_at_50%_50%,#111_0%,#050505_100%)]">
          <section className="base-station">
            <Shield className="h-9 w-9 text-cyan-300" />
            <span className="vertical-text mt-5 text-[10px] font-black tracking-[0.24em] text-zinc-400 uppercase">Base Core</span>
            <div className="mt-6 h-48 w-4 overflow-hidden rounded-full border border-red-500/30 bg-zinc-900">
              <motion.div
                initial={{ height: '100%' }}
                animate={{ height: `${healthPercent}%` }}
                className="w-full bg-gradient-to-t from-red-600 via-orange-500 to-emerald-400"
              />
            </div>
            <p className="mt-3 font-mono text-sm font-black text-red-300">{state.health}%</p>
          </section>

          <section className="relative flex-1">
            <AnimatePresence>
              {state.monsters.map((monster) => {
                const Icon = monsterIcon(monster.type);
                const palette = MONSTER_TYPES[monster.type];

                return (
                  <motion.div
                    key={monster.id}
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.7, opacity: 0 }}
                    className="absolute"
                    style={{ left: `${monster.x}%`, top: `${monster.y}%`, transform: 'translate(-50%, -50%)' }}
                  >
                    <div className={`monster-shell bg-gradient-to-br ${palette.color} ring-2 ${palette.ring}`}>
                      <Icon className="h-7 w-7 text-white drop-shadow" />
                    </div>

                    <div className="monster-label">
                      {monster.problem}
                    </div>

                    <div className="mt-1.5 flex justify-center gap-1">
                      {Array.from({ length: monster.maxHealth }).map((_, idx) => (
                        <span
                          key={`${monster.id}-${idx}`}
                          className={`h-1.5 w-4 rounded-full ${idx < monster.health ? 'bg-emerald-300' : 'bg-zinc-700'}`}
                        />
                      ))}
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </section>
        </main>

        <section className="mt-4 rounded-2xl border border-white/10 bg-black/60 p-4 backdrop-blur-md">
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Target className="h-4 w-4 text-cyan-300" />
              <p className="text-xs font-black tracking-[0.18em] text-zinc-400 uppercase">Intercept Answer Input</p>
            </div>
            <p className="text-xs font-black tracking-[0.18em] text-zinc-500 uppercase">
              Type full answer, then fire
            </p>
          </div>

          <form onSubmit={submitAnswer} className="flex gap-3">
            <input
              ref={inputRef}
              value={state.inputValue}
              onChange={handleInputChange}
              disabled={state.status !== 'playing'}
              className="w-full rounded-xl border border-cyan-500/30 bg-[#0b0f16] px-4 py-4 font-mono text-3xl font-black tracking-wider text-cyan-300 outline-none placeholder:text-zinc-600 focus:border-cyan-300"
              placeholder="ENTER ANSWER"
              inputMode="numeric"
              autoFocus
            />
            <button
              type="submit"
              disabled={state.status !== 'playing'}
              className="min-w-[120px] rounded-xl border border-cyan-400/40 bg-cyan-400/15 px-5 py-4 text-sm font-black uppercase tracking-[0.16em] text-cyan-200 transition hover:bg-cyan-400/25 disabled:opacity-40"
            >
              Fire
            </button>
          </form>

          {answerFeedback && (
            <div
              className={`mt-3 rounded-xl border px-3 py-2 text-xs font-black uppercase tracking-[0.14em] ${
                answerFeedback.type === 'clear'
                  ? 'border-emerald-400/40 bg-emerald-500/10 text-emerald-200'
                  : answerFeedback.type === 'hit'
                    ? 'border-cyan-400/40 bg-cyan-500/10 text-cyan-200'
                    : 'border-rose-400/40 bg-rose-500/10 text-rose-200'
              }`}
            >
              {answerFeedback.message}
            </div>
          )}
        </section>
      </div>

      {state.status === 'playing' && (
        <div className="pointer-events-none absolute inset-x-0 bottom-[max(0.4rem,env(safe-area-inset-bottom))] z-40 flex justify-center px-3">
          <div className="pointer-events-auto">
            <GameActionDock onBack={onBack} compact accentClass="text-slate-100" />
          </div>
        </div>
      )}

      <AnimatePresence>
        {state.status === 'start' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-40 flex items-center justify-center bg-black/85 p-10 backdrop-blur-md"
          >
            <div className="w-full max-w-xl rounded-3xl border border-cyan-400/30 bg-[#090d14]/95 p-10 text-center shadow-[0_0_50px_rgba(0,242,255,0.12)]">
              <div className="mx-auto mb-6 flex h-24 w-24 items-center justify-center rounded-full border border-cyan-400/40 bg-cyan-500/10">
                <Zap className="h-12 w-12 text-cyan-300" />
              </div>
              <h2 className="mb-3 text-4xl font-black tracking-tight uppercase">Calculation Crash</h2>
              <p className="mb-8 text-zinc-400">
                Defend the base by solving equations faster than monsters can advance.
                Clear all 10 waves to complete the mission.
              </p>
              <button
                onClick={startGame}
                className="inline-flex items-center gap-2 rounded-full bg-cyan-400 px-10 py-4 font-black text-black transition hover:bg-cyan-300"
              >
                <Play className="h-5 w-5" /> Start Defense
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {state.status === 'wave_complete' && (
          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.04 }}
            className="absolute inset-0 z-40 flex items-center justify-center bg-black/75 p-8 backdrop-blur-sm"
          >
            <div className="w-full max-w-lg rounded-3xl border border-emerald-400/30 bg-[#09140f]/95 p-8 text-center">
              <h3 className="mb-2 text-3xl font-black uppercase text-emerald-300">Wave Cleared</h3>
              <p className="mb-6 text-zinc-300">Prepare for wave {state.wave + 1}. Enemy logic cores are escalating.</p>
              <button
                onClick={continueWave}
                className="inline-flex items-center gap-2 rounded-full bg-emerald-400 px-8 py-3 font-black text-black transition hover:bg-emerald-300"
              >
                Continue <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {state.status === 'gameover' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-50 flex items-center justify-center bg-black/90 p-10 backdrop-blur-md"
          >
            <div className="w-full max-w-xl rounded-3xl border border-red-400/30 bg-[#140909]/95 p-10 text-center">
              <AlertCircle className="mx-auto mb-4 h-16 w-16 text-red-400" />
              <h2 className="mb-2 text-4xl font-black uppercase text-red-300">Base Overrun</h2>
              <p className="mb-6 text-zinc-300">Your defense fell at wave {state.wave}. Final score: {state.score.toLocaleString()}.</p>
              <div className="flex justify-center gap-3">
                <button
                  onClick={startGame}
                  className="inline-flex items-center gap-2 rounded-full bg-zinc-200 px-7 py-3 font-black text-black"
                >
                  <RotateCcw className="h-4 w-4" /> Retry
                </button>
                <button
                  onClick={submitDefeat}
                  className="inline-flex items-center gap-2 rounded-full bg-red-500 px-7 py-3 font-black text-white"
                >
                  Submit Defeat
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {state.status === 'complete' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-50 flex items-center justify-center bg-black/90 p-10 backdrop-blur-md"
          >
            <div className="w-full max-w-xl rounded-3xl border border-amber-300/35 bg-[#15120a]/95 p-10 text-center">
              <Trophy className="mx-auto mb-4 h-16 w-16 text-amber-300" />
              <h2 className="mb-2 text-4xl font-black uppercase text-amber-200">Defense Complete</h2>
              <p className="mb-6 text-zinc-300">All 10 waves repelled. Final score: {state.score.toLocaleString()}.</p>
              <div className="flex justify-center gap-3">
                <button
                  onClick={startGame}
                  className="inline-flex items-center gap-2 rounded-full bg-zinc-200 px-7 py-3 font-black text-black"
                >
                  <RotateCcw className="h-4 w-4" /> New Run
                </button>
                <button
                  onClick={submitVictory}
                  className="inline-flex items-center gap-2 rounded-full bg-amber-400 px-7 py-3 font-black text-black"
                >
                  <Trophy className="h-4 w-4" /> Submit Victory
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <style>{`
        .battlefield-grid {
          position: absolute;
          inset: 0;
          background-image:
            linear-gradient(to right, rgba(255, 255, 255, 0.05) 1px, transparent 1px),
            linear-gradient(to bottom, rgba(255, 255, 255, 0.05) 1px, transparent 1px);
          background-size: 50px 50px;
          pointer-events: none;
        }

        .base-station {
          position: relative;
          width: 84px;
          border-right: 4px solid #3f3f46;
          background: linear-gradient(to right, #1f2937, #0b1220);
          display: flex;
          flex-direction: column;
          justify-content: center;
          align-items: center;
          z-index: 10;
        }

        .monster-shell {
          height: 3.5rem;
          width: 3.5rem;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 9999px;
          box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4);
        }

        .monster-label {
          margin-top: 8px;
          background: rgba(0, 0, 0, 0.86);
          padding: 4px 12px;
          border-radius: 9999px;
          font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace;
          font-weight: 800;
          font-size: 14px;
          white-space: nowrap;
          border: 1px solid rgba(255, 255, 255, 0.22);
          text-align: center;
          color: #ffffff;
          transform: translateX(-50%);
          margin-left: 50%;
        }

        .vertical-text {
          writing-mode: vertical-rl;
          text-orientation: mixed;
        }
      `}</style>
    </div>
  );
};

export default CalculationCrashGame;

