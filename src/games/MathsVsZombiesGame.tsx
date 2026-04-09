import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Timer as TimerIcon, Heart, Target, Brain } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { CHARACTER_AVATARS, DEFAULT_AVATAR_ID } from '../assets/characters';
import zombieFallback from '../assets/zombies/zombie.png';
import zombieGardenBackground from '../assets/maps/forect.jpg';

interface MathsVsZombiesGameProps {
  levelId: number;
  avatarId: string;
  useSharedTopHud?: boolean;
  onVictory: (stars: number, XP: number) => void;
  onGameOver: (XP: number) => void;
  onBack: () => void;
}

type ZombieState = 'appear' | 'walk' | 'hit' | 'attack' | 'die';

interface Zombie {
  id: number;
  lane: number;
  x: number; // 0..100
  health: number;
  maxHealth: number;
  speed: number; // percent per second
  state: ZombieState;
  frameIndex: number;
  frameTime: number;
  stateTime: number;
}

interface Question {
  prompt: string;
  options: number[];
  correctIndex: number;
}

const LANES = 4;
const SPAWN_X = 96;
const TARGET_X = 8;
const ZOMBIE_SIZE = 52;
const ANIM_FPS = 8;

const loadFrames = (record: Record<string, string>) => (
  Object.entries(record)
    .sort(([a], [b]) => {
      const anum = Number(a.match(/(\d+)/)?.[1] ?? 0);
      const bnum = Number(b.match(/(\d+)/)?.[1] ?? 0);
      return anum - bnum;
    })
    .map(([, value]) => value)
);

const ensureFrames = (frames: string[]) => (frames.length ? frames : [zombieFallback]);

const zombieAppearFrames = ensureFrames(loadFrames(import.meta.glob('../assets/zombies/appear/*.png', { eager: true, import: 'default' }) as Record<string, string>));
const zombieWalkFrames = ensureFrames(loadFrames(import.meta.glob('../assets/zombies/walk/*.png', { eager: true, import: 'default' }) as Record<string, string>));
const zombieHitFrames = ensureFrames(loadFrames(import.meta.glob('../assets/zombies/attack/*.png', { eager: true, import: 'default' }) as Record<string, string>));
const zombieDieFrames = ensureFrames(loadFrames(import.meta.glob('../assets/zombies/die/*.png', { eager: true, import: 'default' }) as Record<string, string>));
const zombieIdleFrames = ensureFrames(loadFrames(import.meta.glob('../assets/zombies/idle/*.png', { eager: true, import: 'default' }) as Record<string, string>));

const FRAMES_BY_STATE: Record<ZombieState, string[]> = {
  appear: zombieAppearFrames,
  walk: zombieWalkFrames,
  hit: zombieHitFrames,
  attack: zombieHitFrames,
  die: zombieDieFrames,
};

const stateDuration = (state: ZombieState) => {
  const frameCount = FRAMES_BY_STATE[state]?.length || 1;
  return frameCount / ANIM_FPS;
};

const maxZombiesForLevel = (levelId: number) => {
  if (levelId <= 2) return 1;
  if (levelId <= 4) return 2;
  if (levelId <= 6) return 3;
  return 4;
};

const buildQuestion = (levelId: number): Question => {
  const roll = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;

  let opPool: Array<'+' | '-' | '×' | '÷'> = ['+', '-'];
  let a = 0;
  let b = 0;
  let c = 0;
  let answer = 0;
  let prompt = '';

  if (levelId <= 2) {
    // Two-number add/sub within small range.
    opPool = ['+', '-'];
    a = roll(3, 18);
    b = roll(2, 15);
  } else if (levelId === 3) {
    // Two-number add/sub with three-digit values.
    opPool = ['+', '-'];
    a = roll(120, 980);
    b = roll(110, 890);
  } else if (levelId <= 5) {
    // Introduce multiplication/division with manageable factors.
    opPool = ['×', '÷'];
    a = roll(2, 12);
    b = roll(2, 12);
  } else if (levelId <= 7) {
    // Negatives appear with add/sub in a tighter range.
    opPool = ['+', '-'];
    a = roll(-20, 20);
    b = roll(-18, 18);
  } else {
    // Larger numbers into thousands with mixed add/sub.
    opPool = ['+', '-'];
    a = roll(350, 1900);
    b = roll(220, 1600);
  }

  const op = opPool[Math.floor(Math.random() * opPool.length)];

  if (op === '+') {
    answer = a + b;
    prompt = `${a} + ${b}`;
  } else if (op === '-') {
    if (levelId <= 2 || levelId === 3 || levelId >= 8) {
      if (a < b) [a, b] = [b, a];
    }
    answer = a - b;
    prompt = `${a} - ${b}`;
  } else if (op === '×') {
    answer = a * b;
    prompt = `${a} × ${b}`;
  } else {
    // Build a clean division question.
    const product = a * b;
    answer = a;
    prompt = `${product} ÷ ${b}`;
  }

  const options = new Set<number>([answer]);
  while (options.size < 4) {
    const delta = Math.floor(Math.random() * 8) + 1;
    const candidate = Math.random() < 0.5 ? answer + delta : answer - delta;
    if (candidate !== answer) options.add(candidate);
  }
  const shuffled = Array.from(options).sort(() => Math.random() - 0.5);
  return {
    prompt,
    options: shuffled,
    correctIndex: shuffled.indexOf(answer),
  };
};

const TopBar = ({ XP, brainPoints, health, timer, onBack }: { XP: number; brainPoints: number; health: number; timer: string; onBack: () => void }) => (
  <div className="z-50 w-full px-4 pt-4">
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-3 rounded-xl border border-blue-400/30 bg-blue-900/60 p-2 shadow-lg">
        <button
          type="button"
          onClick={onBack}
          className="flex h-8 w-8 items-center justify-center rounded-lg border border-blue-300/55 bg-blue-500/85 text-white shadow active:scale-95"
          aria-label="Back"
        >
          <Target className="h-4 w-4" />
        </button>
        <div className="flex flex-col items-center">
          <div className="flex items-center gap-1">
            {Array.from({ length: 3 }).map((_, index) => (
              <Heart key={index} className={`h-4 w-4 ${index < health ? 'fill-red-500 text-amber-500' : 'text-gray-600'}`} />
            ))}
          </div>
          <span className="mt-1 text-[10px] font-black uppercase text-blue-200">Base Health</span>
        </div>
        <div className="h-8 w-[2px] bg-blue-400/20" />
        <div className="flex flex-col">
          <span className="text-[10px] font-bold uppercase tracking-tighter text-blue-200">XP</span>
          <span className="text-xl font-black leading-none text-white">{XP.toLocaleString()}</span>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2 rounded-xl border border-cyan-400/50 bg-blue-900/80 px-4 py-2 shadow-lg">
          <Brain className="h-5 w-5 animate-pulse text-cyan-300" />
          <span className="text-xl font-black text-white">{brainPoints}</span>
        </div>
        <div className="flex items-center gap-2 rounded-xl border border-yellow-400/50 bg-blue-900/80 px-4 py-2 shadow-lg">
          <TimerIcon className="h-5 w-5 text-yellow-400" />
          <span className="text-xl font-black text-white">{timer}</span>
        </div>
      </div>
    </div>
  </div>
);

const MathsVsZombiesGame: React.FC<MathsVsZombiesGameProps> = ({
  levelId,
  avatarId,
  useSharedTopHud = false,
  onVictory,
  onGameOver,
  onBack,
}) => {
  const roundSeconds = useMemo(() => 70 + (levelId * 6), [levelId]);
  const victoryTargetScore = useMemo(() => 1200 + (levelId * 220), [levelId]);
  const baseZombieHealth = useMemo(() => 1, []);
  const spawnDelayMs = useMemo(() => Math.max(2300, 4200 - (levelId * 150)), [levelId]);

  const [XP, setScore] = useState(0);
  const [zombiesDefeated, setZombiesDefeated] = useState(0);
  const [health, setHealth] = useState(3);
  const [timeLeft, setTimeLeft] = useState(roundSeconds);
  const [zombies, setZombies] = useState<Zombie[]>([]);
  const [question, setQuestion] = useState<Question>(() => buildQuestion(levelId));
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [feedback, setFeedback] = useState('');
  const [locked, setLocked] = useState(false);
  const [wave, setWave] = useState(1);
  const [gameActive, setGameActive] = useState(true);

  const rafRef = useRef<number | null>(null);
  const lastTimeRef = useRef(0);
  const spawnTimerRef = useRef(0);
  const endedRef = useRef(false);
  const idRef = useRef(1);

  const zombiesRef = useRef<Zombie[]>([]);
  useEffect(() => { zombiesRef.current = zombies; }, [zombies]);

  const avatarImage = useMemo(() => (
    CHARACTER_AVATARS.find((avatar) => avatar.id === avatarId)?.image
      ?? CHARACTER_AVATARS.find((avatar) => avatar.id === DEFAULT_AVATAR_ID)?.image
  ), [avatarId]);

  const spawnZombie = useCallback(() => {
    const lane = Math.floor(Math.random() * LANES);
    const maxZombies = maxZombiesForLevel(levelId);
    if (zombiesRef.current.length >= maxZombies) return;
    const zombie: Zombie = {
      id: idRef.current++,
      lane,
      x: SPAWN_X,
      health: baseZombieHealth,
      maxHealth: baseZombieHealth,
      speed: 2.2 + (wave * 0.25) + Math.max(0, levelId - 1) * 0.12,
      state: 'appear',
      frameIndex: 0,
      frameTime: 0,
      stateTime: 0,
    };

    const next = [...zombiesRef.current, zombie];
    zombiesRef.current = next;
    setZombies(next);
  }, [baseZombieHealth, levelId, wave]);

  const finishGame = useCallback((won: boolean) => {
    if (endedRef.current) return;
    endedRef.current = true;
    setGameActive(false);

    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }

    if (won) {
      const finalScore = XP;
      const stars = finalScore >= victoryTargetScore * 1.85 ? 3 : finalScore >= victoryTargetScore * 1.35 ? 2 : 1;
      onVictory(stars, finalScore);
      return;
    }
    onGameOver(XP);
  }, [onGameOver, onVictory, XP, victoryTargetScore]);

  useEffect(() => {
    endedRef.current = false;
    setGameActive(true);
    setScore(0);
    setZombiesDefeated(0);
    setHealth(3);
    setTimeLeft(roundSeconds);
    setWave(1);
    setZombies([]);
    zombiesRef.current = [];
    setQuestion(buildQuestion(levelId));
    setSelectedAnswer(null);
    setFeedback('');
    setLocked(false);
    idRef.current = 1;
    spawnTimerRef.current = 0;
    lastTimeRef.current = 0;
  }, [levelId, roundSeconds]);

  useEffect(() => {
    if (!gameActive || endedRef.current) return;
    const timerInterval = window.setInterval(() => {
      setTimeLeft((previous) => {
        if (previous <= 1) {
          window.clearInterval(timerInterval);
          finishGame(health > 0);
          return 0;
        }
        const next = previous - 1;
        if (next > 0 && next % 15 === 0) {
          setWave((value) => value + 1);
        }
        return next;
      });
    }, 1000);

    return () => window.clearInterval(timerInterval);
  }, [finishGame, gameActive, health]);

  const updateFrame = useCallback((timestamp: number) => {
    if (!gameActive || endedRef.current) return;

    if (!lastTimeRef.current) {
      lastTimeRef.current = timestamp;
      rafRef.current = requestAnimationFrame(updateFrame);
      return;
    }

    const deltaMs = timestamp - lastTimeRef.current;
    const dt = deltaMs / 1000;
    lastTimeRef.current = timestamp;

    spawnTimerRef.current += deltaMs;
    if (spawnTimerRef.current >= spawnDelayMs) {
      spawnTimerRef.current = 0;
      spawnZombie();
    }

    let breaches = 0;
    const zombiesNext = zombiesRef.current.map((zombie) => {
      let nextX = zombie.x;
      if (zombie.state !== 'attack' && zombie.state !== 'die') {
        nextX -= zombie.speed * dt;
      }

      let nextState = zombie.state;
      let nextStateTime = zombie.stateTime + dt;
      let nextFrameTime = zombie.frameTime + dt;
      let nextFrameIndex = zombie.frameIndex;

      const frames = FRAMES_BY_STATE[nextState] ?? zombieWalkFrames;
      const frameCount = frames.length || 1;
      if (nextFrameTime >= 1 / ANIM_FPS) {
        nextFrameIndex = (nextFrameIndex + 1) % frameCount;
        nextFrameTime = 0;
      }

      if (nextState === 'appear' && nextStateTime >= stateDuration('appear')) {
        nextState = 'walk';
        nextStateTime = 0;
      }

      if (nextState === 'hit' && nextStateTime >= stateDuration('hit')) {
        nextState = zombie.health <= 0 ? 'die' : 'walk';
        nextStateTime = 0;
      }

      if (nextState === 'die' && nextStateTime >= stateDuration('die')) {
        return null;
      }

      if (nextX <= TARGET_X && nextState !== 'attack' && nextState !== 'die') {
        nextState = 'attack';
        nextStateTime = 0;
        breaches += 1;
      }

      if (nextState === 'attack' && nextStateTime >= stateDuration('attack')) {
        return null;
      }

      return {
        ...zombie,
        x: nextX,
        state: nextState,
        frameIndex: nextFrameIndex,
        frameTime: nextFrameTime,
        stateTime: nextStateTime,
      } as Zombie;
    }).filter(Boolean) as Zombie[];

    if (breaches > 0) {
      setHealth((value) => Math.max(0, value - breaches));
    }

    zombiesRef.current = zombiesNext;
    setZombies(zombiesNext);

    if (health - breaches <= 0 && !endedRef.current) {
      finishGame(false);
      return;
    }

    rafRef.current = requestAnimationFrame(updateFrame);
  }, [finishGame, gameActive, health, spawnDelayMs, spawnZombie]);

  useEffect(() => {
    if (!gameActive || endedRef.current) return;
    rafRef.current = requestAnimationFrame(updateFrame);
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  }, [gameActive, updateFrame]);

  const handleAnswer = (index: number) => {
    if (!gameActive || endedRef.current || locked) return;
    setLocked(true);
    setSelectedAnswer(index);
    if (index === question.correctIndex) {
      setFeedback('Zombie down!');
      const targetZombie = zombiesRef.current.reduce((closest, zombie) => (
        zombie.x < (closest?.x ?? Infinity) ? zombie : closest
      ), null as Zombie | null);

      if (targetZombie) {
        const next = zombiesRef.current.map((zombie) => {
          if (zombie.id !== targetZombie.id) return zombie;
          return {
            ...zombie,
            health: 0,
            state: 'die',
            stateTime: 0,
            frameIndex: 0,
            frameTime: 0,
          };
        });
        zombiesRef.current = next;
        setZombies(next);
        setScore((value) => {
          const nextScore = value + 220;
          if (nextScore >= victoryTargetScore && !endedRef.current) {
            window.setTimeout(() => finishGame(true), 0);
          }
          return nextScore;
        });
        setZombiesDefeated((value) => value + 1);
      }
    } else {
      setFeedback('Close! Try the next one.');
      setHealth((value) => Math.max(0, value - 1));
      if (health <= 1) {
        finishGame(false);
      }
    }
    window.setTimeout(() => {
      setQuestion(buildQuestion(levelId));
      setSelectedAnswer(null);
      setFeedback('');
      setLocked(false);
    }, 750);
  };

  const timerLabel = useMemo(() => {
    const mins = Math.floor(timeLeft / 60);
    const secs = timeLeft % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }, [timeLeft]);

  return (
    <div
      className="relative flex h-full w-full flex-col items-center overflow-hidden bg-cover bg-center bg-no-repeat font-sans text-white select-none"
      style={{ backgroundImage: `url(${zombieGardenBackground})` }}
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_40%,#1e3a8a_0%,#050a1a_100%)]" />

      <div className={`relative z-10 flex h-full w-full max-w-[1000px] flex-col ${useSharedTopHud ? 'pt-[max(3.7rem,calc(env(safe-area-inset-top)+3.1rem))]' : ''}`}>
        {!useSharedTopHud ? (
          <TopBar XP={XP} brainPoints={zombiesDefeated} health={health} timer={timerLabel} onBack={onBack} />
        ) : null}

        <div className={`relative mx-4 flex-1 overflow-hidden rounded-3xl border-4 border-blue-400/30 bg-blue-900/20 shadow-2xl ${useSharedTopHud ? 'mt-2' : 'mt-4'}`}>
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_85%,rgba(56,189,248,0.16),transparent_48%)]" />
          <div className="absolute bottom-4 left-6 flex flex-col items-center gap-2">
            <div className="text-[11px] font-black uppercase tracking-[0.18em] text-cyan-100">You</div>
            {avatarImage ? (
              <img
                src={avatarImage}
                alt=""
                className="h-[84px] w-auto object-contain drop-shadow-[0_10px_20px_rgba(2,6,23,0.45)]"
                draggable={false}
              />
            ) : null}
          </div>

          <AnimatePresence>
            {zombies.map((zombie) => {
              const frameList = FRAMES_BY_STATE[zombie.state] ?? zombieWalkFrames;
              const safeFrameList = frameList.length ? frameList : [zombieFallback];
              const frame = safeFrameList[zombie.frameIndex % safeFrameList.length];
              return (
                <motion.div
                  key={zombie.id}
                  initial={{ opacity: 0, x: 40 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, scale: 0.7 }}
                  className="absolute flex flex-col items-center gap-1"
                  style={{
                    top: `${10 + zombie.lane * 22}%`,
                    left: `${zombie.x}%`,
                    width: `${ZOMBIE_SIZE}px`,
                  }}
                >
                  <img
                    src={frame}
                    alt=""
                    className="h-[52px] w-auto object-contain drop-shadow-[0_8px_14px_rgba(2,6,23,0.45)]"
                    draggable={false}
                  />
                  <div className="h-2 w-full overflow-hidden rounded-full bg-black/40">
                    <div
                      className="h-full bg-emerald-300"
                      style={{ width: `${Math.max(0, Math.min(100, (zombie.health / zombie.maxHealth) * 100))}%` }}
                    />
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>

          <div className="absolute right-3 top-3 rounded-full border border-amber-200/70 bg-[linear-gradient(180deg,rgba(251,191,36,0.98),rgba(245,158,11,0.98))] px-3 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-amber-950 shadow-[0_8px_16px_rgba(2,6,23,0.24)]">
            Wave {wave}
          </div>
        </div>

        <div className="mx-4 mt-4 rounded-3xl border border-blue-400/40 bg-blue-950/70 p-4 shadow-xl">
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Target className="h-5 w-5 text-yellow-400" />
              <span className="text-lg font-black text-white">Solve the sum</span>
            </div>
            <div className="flex items-center gap-2 rounded-xl border border-blue-400/40 bg-blue-800/60 px-3 py-1">
              <Brain className="h-4 w-4 text-cyan-200" />
              <span className="text-sm font-bold">{feedback || 'Pick the correct answer.'}</span>
            </div>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-center text-2xl font-black text-white">
            {question.prompt} = ?
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2">
            {question.options.map((option, index) => (
              <button
                key={`${option}-${index}`}
                type="button"
                onClick={() => handleAnswer(index)}
                disabled={locked}
                className={`rounded-2xl border-2 px-3 py-3 text-lg font-black transition ${
                  locked && selectedAnswer === index
                    ? index === question.correctIndex
                      ? 'border-emerald-300 bg-emerald-400/40 text-emerald-100'
                      : 'border-rose-300 bg-rose-400/35 text-amber-100'
                    : 'border-blue-300/50 bg-blue-800/60 text-white hover:bg-blue-700/70'
                }`}
              >
                {option}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default MathsVsZombiesGame;







