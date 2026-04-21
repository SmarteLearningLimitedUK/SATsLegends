import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Timer as TimerIcon, Heart, Target, Brain } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { CHARACTER_AVATARS, DEFAULT_AVATAR_ID } from '../assets/characters';
import zombieFallback from '../assets/zombies/zombie.png';
import zombiePlayfield from '../assets/zombies/zombiebkground.png';
import PracticeIntroPopup from '../components/game-ui/PracticeIntroPopup';
import { GameQuestionCard } from '../components/game-ui/GameUiKit';
import { MiniGameShellContractProps } from '../app/gameplaySessionContract';
import { formatMultiplicationDisplay } from '../utils/mathDisplay';

interface MathsVsZombiesGameProps extends MiniGameShellContractProps {
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
  y: number; // 0..100
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
const SPAWN_Y = 6;
const SPAWN_RIGHT_X = 96;
const RIGHT_SPAWN_MIN_Y = 18;
const RIGHT_SPAWN_MAX_Y = 62;
const TARGET_Y = 78;
const TARGET_X = 22;
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
  if (state === 'attack') return 1.8;
  if (state === 'appear') return 0.6;
  if (state === 'die') return 0.7;
  const frameCount = FRAMES_BY_STATE[state]?.length || 1;
  return frameCount / ANIM_FPS;
};

const maxZombiesForLevel = (levelId: number) => {
  if (levelId <= 2) return 1;
  if (levelId <= 4) return 2;
  if (levelId <= 6) return 3 + (levelId > 5 ? 1 : 0);
  return 4 + (levelId > 5 ? 1 : 0);
};

const buildQuestion = (levelId: number): Question => {
  const roll = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;

  let opPool: Array<'+' | '-' | '×' | '÷'> = ['+', '-'];
  let a = 0;
  let b = 0;
  let c = 0;
  let answer = 0;
  let equation = '';

  if (levelId <= 1) {
    // Level 1: very gentle one-digit addition.
    opPool = ['+'];
    a = roll(0, 5);
    b = roll(0, 5);
  } else if (levelId === 2) {
    // Level 2: small addition, with an occasional subtraction.
    opPool = ['+', '-'];
    a = roll(0, 10);
    b = roll(0, 8);
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
    equation = `${a} + ${b}`;
  } else if (op === '-') {
    if (levelId <= 2 || levelId === 3 || levelId >= 8) {
      if (a < b) [a, b] = [b, a];
    }
    answer = a - b;
    equation = `${a} - ${b}`;
  } else if (op === '×') {
    answer = a * b;
    equation = `${a} × ${b}`;
  } else {
    // Build a clean division question.
    const product = a * b;
    answer = a;
    equation = `${product} ÷ ${b}`;
  }

  const options = new Set<number>([answer]);
  while (options.size < 4) {
    const delta = Math.floor(Math.random() * 8) + 1;
    const candidate = Math.random() < 0.5 ? answer + delta : answer - delta;
    if (candidate !== answer) options.add(candidate);
  }
  const shuffled = Array.from(options).sort(() => Math.random() - 0.5);
  return {
    prompt: `the monster minds have sent their minions - solve the sum to defeat them\n\n${formatMultiplicationDisplay(equation)}`,
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
  gameTitle,
  isPractice,
  practiceBriefing,
  onVictory,
  onGameOver,
  onBack,
}) => {
  const roundSeconds = useMemo(() => 70 + (levelId * 6), [levelId]);
  const victoryTargetScore = useMemo(() => 1200 + (levelId * 220), [levelId]);
  const baseZombieHealth = useMemo(() => 1, []);
  const spawnDelayMs = useMemo(() => Math.max(2600, 5200 - (levelId * 220)), [levelId]);

  const [XP, setScore] = useState(0);
  const [zombiesDefeated, setZombiesDefeated] = useState(0);
  const [health, setHealth] = useState(3);
  const [timeLeft, setTimeLeft] = useState(roundSeconds);
  const [zombies, setZombies] = useState<Zombie[]>([]);
  const [question, setQuestion] = useState<Question>(() => buildQuestion(levelId));
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [feedback, setFeedback] = useState('');
  const [locked, setLocked] = useState(false);
  const [gameActive, setGameActive] = useState(true);
  const [showPracticeIntro, setShowPracticeIntro] = useState(Boolean(isPractice));

  const rafRef = useRef<number | null>(null);
  const lastTimeRef = useRef(0);
  const spawnTimerRef = useRef(0);
  const endedRef = useRef(false);
  const idRef = useRef(1);

  const zombiesRef = useRef<Zombie[]>([]);
  useEffect(() => { zombiesRef.current = zombies; }, [zombies]);

  useEffect(() => {
    setShowPracticeIntro(Boolean(isPractice));
  }, [isPractice]);

  const avatarImage = useMemo(() => (
    CHARACTER_AVATARS.find((avatar) => avatar.id === avatarId)?.image
      ?? CHARACTER_AVATARS.find((avatar) => avatar.id === DEFAULT_AVATAR_ID)?.image
  ), [avatarId]);

  const spawnZombie = useCallback(() => {
    const lane = Math.floor(Math.random() * LANES);
    const maxZombies = maxZombiesForLevel(levelId);
    if (zombiesRef.current.length >= maxZombies) return;
    const spawnSide = Math.random() < 0.5 ? 'top' : 'right';
    const laneX = 18 + lane * 20;
    const startX = spawnSide === 'right' ? SPAWN_RIGHT_X : laneX;
    const startY = spawnSide === 'right'
      ? RIGHT_SPAWN_MIN_Y + Math.random() * (RIGHT_SPAWN_MAX_Y - RIGHT_SPAWN_MIN_Y)
      : SPAWN_Y;
    const zombie: Zombie = {
      id: idRef.current++,
      lane,
      x: startX,
      y: startY,
      health: baseZombieHealth,
      maxHealth: baseZombieHealth,
      speed: 0.12 + (levelId * 0.035),
      state: 'appear',
      frameIndex: 0,
      frameTime: 0,
      stateTime: 0,
    };

    const next = [...zombiesRef.current, zombie];
    zombiesRef.current = next;
    setZombies(next);
  }, [baseZombieHealth, levelId]);

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
    setZombies([]);
    zombiesRef.current = [];
    setQuestion(buildQuestion(levelId));
    setSelectedAnswer(null);
    setFeedback('');
    setLocked(false);
    idRef.current = 1;
    spawnTimerRef.current = spawnDelayMs;
    lastTimeRef.current = 0;
  }, [levelId, roundSeconds, spawnDelayMs]);

  useEffect(() => {
    if (isPractice || !gameActive || endedRef.current) return;
    const timerInterval = window.setInterval(() => {
      setTimeLeft((previous) => {
        if (previous <= 1) {
          window.clearInterval(timerInterval);
          finishGame(health > 0);
          return 0;
        }
        const next = previous - 1;
        return next;
      });
    }, 1000);

    return () => window.clearInterval(timerInterval);
  }, [finishGame, gameActive, health, isPractice]);

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
      let nextY = zombie.y;
      let nextX = zombie.x;
      if (zombie.state !== 'attack' && zombie.state !== 'die') {
        const dx = TARGET_X - zombie.x;
        const dy = TARGET_Y - zombie.y;
        const distance = Math.max(0.001, Math.hypot(dx, dy));
        const step = zombie.speed * dt;
        nextX += (dx / distance) * step;
        nextY += (dy / distance) * step;
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

      if (nextY >= TARGET_Y && nextState !== 'attack' && nextState !== 'die') {
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
        y: nextY,
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
        zombie.y > (closest?.y ?? -Infinity) ? zombie : closest
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
      className="relative flex h-full w-full flex-col items-center overflow-hidden font-sans text-white select-none"
    >
      <PracticeIntroPopup
        open={showPracticeIntro}
        title={gameTitle || 'Maths vs Zombies'}
        body="Solve the sums to stop the monster minions.\nEach correct answer pushes them back."
        briefing={practiceBriefing}
        onAction={() => setShowPracticeIntro(false)}
      />

      <div className={`relative z-10 flex h-full w-full max-w-[1000px] flex-col ${useSharedTopHud ? 'pt-[max(3.7rem,calc(env(safe-area-inset-top)+3.1rem))]' : ''}`}>
        {!useSharedTopHud ? (
          <TopBar XP={XP} brainPoints={zombiesDefeated} health={health} timer={timerLabel} onBack={onBack} />
        ) : null}

        <div
          className={`relative mx-4 flex-1 overflow-hidden rounded-3xl border-4 border-blue-400/30 bg-blue-900/10 shadow-2xl ${useSharedTopHud ? 'mt-2' : 'mt-4'}`}
          style={{ backgroundImage: `url(${zombiePlayfield})`, backgroundSize: 'cover', backgroundPosition: 'center', backgroundRepeat: 'no-repeat' }}
        >
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_85%,rgba(56,189,248,0.06),transparent_48%)]" />
          <div className="absolute bottom-4 left-6 flex -translate-x-2.5 flex-col items-center gap-2">
            <div className="text-[11px] font-black uppercase tracking-[0.18em] text-cyan-100">You</div>
            {avatarImage ? (
              <img
                src={avatarImage}
                alt=""
                className="h-[168px] w-auto object-contain drop-shadow-[0_10px_20px_rgba(2,6,23,0.45)]"
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
                  initial={{ opacity: 1 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.2 }}
                  exit={{ opacity: 1 }}
                  className="absolute flex flex-col items-center gap-1"
                  style={{
                    top: `${zombie.y}%`,
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

        </div>

        <div className="mx-4 mt-4 rounded-3xl border border-blue-400/40 bg-blue-950/70 p-4 shadow-xl">
          <div className="my-3 h-px w-full bg-white/10" />
          <GameQuestionCard title="Mission" style={{ ['--question-card-width' as any]: '100%' }}>
            {question.prompt}
          </GameQuestionCard>
          <div
            className={`mt-2 min-h-[16px] text-center text-[11px] font-semibold uppercase tracking-[0.14em] text-cyan-100/80 ${feedback ? 'opacity-100' : 'opacity-0'}`}
            aria-hidden={!feedback}
          >
            {feedback || '\u00A0'}
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2">
            {question.options.map((option, index) => (
              <button
                key={`${option}-${index}`}
                type="button"
                onClick={() => handleAnswer(index)}
                disabled={locked}
                className={`rounded-2xl px-3 py-3 text-lg font-black ${
                  locked && selectedAnswer === index
                    ? index === question.correctIndex
                      ? 'ui-button-success'
                      : 'ui-button-primary'
                    : 'ui-button-secondary'
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







