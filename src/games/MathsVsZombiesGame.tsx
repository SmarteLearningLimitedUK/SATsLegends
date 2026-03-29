import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Zap,
  CircleDollarSign,
  Timer as TimerIcon,
  Shield,
  Sword,
  Skull,
  Flame,
  Heart,
  Crosshair,
  Target,
  Brain,
} from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';

interface MathsVsZombiesGameProps {
  levelId: number;
  avatarId: string;
  useSharedTopHud?: boolean;
  onVictory: (stars: number, XP: number) => void;
  onGameOver: (XP: number) => void;
  onBack: () => void;
}

interface Ratio {
  numerator: number;
  denominator: number;
  label: string;
  value: number;
}

type DefenderIcon = 'shield' | 'zap' | 'sword' | 'flame' | 'target';

interface DefenderType {
  id: number;
  ratio: Ratio;
  color: string;
  icon: DefenderIcon;
  cost: number;
}

interface Zombie {
  id: number;
  lane: number;
  x: number; // 0..100
  fraction: { n: number; d: number };
  ratioValue: number;
  health: number;
  speed: number; // percent per second
}

interface Projectile {
  id: number;
  lane: number;
  x: number;
  ratioValue: number;
  color: string;
}

interface Defender {
  id: number;
  lane: number;
  slot: number;
  ratioValue: number;
  color: string;
  icon: DefenderIcon;
  lastShot: number;
}

const LANES = 5;
const SLOTS = 5;
const SLOT_WIDTH = 12;
const SPAWN_X = 102;
const ZOMBIE_HIT_THRESHOLD = 3.8;
const PROJECTILE_SPEED = 30;

const RATIOS: Ratio[] = [
  { numerator: 1, denominator: 2, label: '1:2', value: 0.5 },
  { numerator: 1, denominator: 3, label: '1:3', value: 1 / 3 },
  { numerator: 2, denominator: 3, label: '2:3', value: 2 / 3 },
  { numerator: 1, denominator: 1, label: '1:1', value: 1.0 },
  { numerator: 3, denominator: 4, label: '3:4', value: 0.75 },
];

const DEFENDER_TYPES: DefenderType[] = [
  { id: 1, ratio: RATIOS[0], color: 'bg-blue-500', icon: 'shield', cost: 50 },
  { id: 2, ratio: RATIOS[1], color: 'bg-cyan-500', icon: 'zap', cost: 50 },
  { id: 3, ratio: RATIOS[2], color: 'bg-emerald-500', icon: 'sword', cost: 50 },
  { id: 4, ratio: RATIOS[3], color: 'bg-amber-500', icon: 'flame', cost: 50 },
  { id: 5, ratio: RATIOS[4], color: 'bg-rose-500', icon: 'target', cost: 50 },
];

const iconFor = (icon: DefenderIcon) => {
  switch (icon) {
    case 'shield':
      return <Shield className="h-6 w-6" />;
    case 'zap':
      return <Zap className="h-6 w-6" />;
    case 'sword':
      return <Sword className="h-6 w-6" />;
    case 'flame':
      return <Flame className="h-6 w-6" />;
    case 'target':
    default:
      return <Target className="h-6 w-6" />;
  }
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
              <Heart key={index} className={`h-4 w-4 ${index < health ? 'fill-red-500 text-red-500' : 'text-gray-600'}`} />
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
  avatarId: _avatarId,
  useSharedTopHud = false,
  onVictory,
  onGameOver,
  onBack,
}) => {
  const roundSeconds = useMemo(() => 70 + (levelId * 6), [levelId]);
  const victoryTargetScore = useMemo(() => 1900 + (levelId * 300), [levelId]);
  const baseZombieHealth = useMemo(() => 100 + (levelId * 12), [levelId]);
  const fireCooldownMs = useMemo(() => Math.max(900, 1450 - (levelId * 65)), [levelId]);
  const projectileDamage = useMemo(() => 42 + (levelId * 3), [levelId]);

  const [XP, setScore] = useState(0);
  const [brainPoints, setBrainPoints] = useState(150);
  const [health, setHealth] = useState(3);
  const [timeLeft, setTimeLeft] = useState(roundSeconds);
  const [zombies, setZombies] = useState<Zombie[]>([]);
  const [defenders, setDefenders] = useState<Defender[]>([]);
  const [projectiles, setProjectiles] = useState<Projectile[]>([]);
  const [selectedDefenderId, setSelectedDefenderId] = useState<number | null>(null);
  const [wave, setWave] = useState(1);
  const [gameActive, setGameActive] = useState(true);

  const rafRef = useRef<number | null>(null);
  const lastTimeRef = useRef(0);
  const spawnTimerRef = useRef(0);
  const brainTimerRef = useRef(0);
  const endedRef = useRef(false);
  const idRef = useRef(1);

  const defendersRef = useRef<Defender[]>([]);
  const zombiesRef = useRef<Zombie[]>([]);
  const projectilesRef = useRef<Projectile[]>([]);

  useEffect(() => { defendersRef.current = defenders; }, [defenders]);
  useEffect(() => { zombiesRef.current = zombies; }, [zombies]);
  useEffect(() => { projectilesRef.current = projectiles; }, [projectiles]);

  const selectedDefender = DEFENDER_TYPES.find((type) => type.id === selectedDefenderId) || null;

  const spawnZombie = useCallback(() => {
    const lane = Math.floor(Math.random() * LANES);
    const ratio = RATIOS[Math.floor(Math.random() * RATIOS.length)];
    const multiplier = Math.floor(Math.random() * 4) + 1;
    const n = ratio.numerator * multiplier;
    const d = ratio.denominator * multiplier;

    const zombie: Zombie = {
      id: idRef.current++,
      lane,
      x: SPAWN_X,
      fraction: { n, d },
      ratioValue: ratio.value,
      health: baseZombieHealth,
      speed: 2.6 + (wave * 0.36),
    };

    const next = [...zombiesRef.current, zombie];
    zombiesRef.current = next;
    setZombies(next);
  }, [baseZombieHealth, wave]);

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
    setBrainPoints(150);
    setHealth(3);
    setTimeLeft(roundSeconds);
    setWave(1);
    setSelectedDefenderId(null);
    setDefenders([]);
    setZombies([]);
    setProjectiles([]);
    defendersRef.current = [];
    zombiesRef.current = [];
    projectilesRef.current = [];
    idRef.current = 1;
    spawnTimerRef.current = 0;
    brainTimerRef.current = 0;
    lastTimeRef.current = 0;
  }, [roundSeconds]);

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

    // brain points generation
    brainTimerRef.current += deltaMs;
    if (brainTimerRef.current >= 950) {
      brainTimerRef.current = 0;
      setBrainPoints((value) => value + 12);
    }

    // spawn pacing
    spawnTimerRef.current += deltaMs;
    const spawnRate = Math.max(900, 3000 - (wave * 190));
    if (spawnTimerRef.current >= spawnRate) {
      spawnTimerRef.current = 0;
      spawnZombie();
    }

    const now = Date.now();
    const defendersWork = defendersRef.current.map((defender) => ({ ...defender }));
    const zombiesWork = zombiesRef.current.map((zombie) => ({ ...zombie }));
    const projectilesWork = projectilesRef.current.map((projectile) => ({ ...projectile }));

    // defenders shoot if zombie in lane and cooldown complete
    for (const defender of defendersWork) {
      if (now - defender.lastShot < fireCooldownMs) continue;
      const laneZombieExists = zombiesWork.some(
        (zombie) => zombie.lane === defender.lane && zombie.x > ((defender.slot * SLOT_WIDTH) + 4),
      );
      if (!laneZombieExists) continue;

      projectilesWork.push({
        id: idRef.current++,
        lane: defender.lane,
        x: (defender.slot * SLOT_WIDTH) + 6,
        ratioValue: defender.ratioValue,
        color: defender.color,
      });
      defender.lastShot = now;
    }

    // move projectiles
    for (const projectile of projectilesWork) {
      projectile.x += PROJECTILE_SPEED * dt;
    }

    // move zombies
    for (const zombie of zombiesWork) {
      zombie.x -= zombie.speed * dt;
    }

    // collisions
    let scoreDelta = 0;
    const projectileRemove = new Set<number>();
    const zombieRemove = new Set<number>();
    for (const projectile of projectilesWork) {
      for (const zombie of zombiesWork) {
        if (projectile.lane !== zombie.lane) continue;
        if (zombieRemove.has(zombie.id)) continue;
        if (Math.abs(zombie.x - projectile.x) > ZOMBIE_HIT_THRESHOLD) continue;

        projectileRemove.add(projectile.id);
        if (Math.abs(zombie.ratioValue - projectile.ratioValue) < 0.001) {
          zombie.health -= projectileDamage;
          if (zombie.health <= 0) {
            zombieRemove.add(zombie.id);
            scoreDelta += 260;
          }
        }
        break;
      }
    }

    // base breaches
    let breaches = 0;
    for (const zombie of zombiesWork) {
      if (zombie.x <= 0 && !zombieRemove.has(zombie.id)) {
        zombieRemove.add(zombie.id);
        breaches += 1;
      }
    }

    let nextHealth = health;
    if (breaches > 0) {
      nextHealth = Math.max(0, health - breaches);
      setHealth(nextHealth);
    }

    const zombiesNext = zombiesWork.filter((zombie) => !zombieRemove.has(zombie.id));
    const projectilesNext = projectilesWork.filter((projectile) => !projectileRemove.has(projectile.id) && projectile.x < 110);

    defendersRef.current = defendersWork;
    zombiesRef.current = zombiesNext;
    projectilesRef.current = projectilesNext;
    setDefenders(defendersWork);
    setZombies(zombiesNext);
    setProjectiles(projectilesNext);

    if (scoreDelta > 0) {
      setScore((value) => {
        const next = value + scoreDelta;
        if (next >= victoryTargetScore && !endedRef.current) {
          window.setTimeout(() => finishGame(true), 0);
        }
        return next;
      });
    }

    if (nextHealth <= 0 && !endedRef.current) {
      finishGame(false);
      return;
    }

    rafRef.current = requestAnimationFrame(updateFrame);
  }, [fireCooldownMs, finishGame, gameActive, health, projectileDamage, spawnZombie, victoryTargetScore, wave]);

  useEffect(() => {
    if (!gameActive || endedRef.current) return;
    rafRef.current = requestAnimationFrame(updateFrame);
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  }, [gameActive, updateFrame]);

  const handleGridClick = (lane: number, slot: number) => {
    if (!selectedDefender || !gameActive || endedRef.current) return;
    if (defendersRef.current.some((defender) => defender.lane === lane && defender.slot === slot)) return;
    if (brainPoints < selectedDefender.cost) return;

    setBrainPoints((value) => value - selectedDefender.cost);
    const defender: Defender = {
      id: idRef.current++,
      lane,
      slot,
      ratioValue: selectedDefender.ratio.value,
      color: selectedDefender.color,
      icon: selectedDefender.icon,
      lastShot: Date.now(),
    };
    const next = [...defendersRef.current, defender];
    defendersRef.current = next;
    setDefenders(next);
    setSelectedDefenderId(null);
  };

  const timerLabel = useMemo(() => {
    const mins = Math.floor(timeLeft / 60);
    const secs = timeLeft % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }, [timeLeft]);

  return (
    <div className="fixed inset-0 flex flex-col items-center overflow-hidden bg-[#050a1a] font-sans text-white select-none">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_40%,#1e3a8a_0%,#050a1a_100%)]" />

      <div className={`relative z-10 flex h-full w-full max-w-[1000px] flex-col ${useSharedTopHud ? 'pt-[max(3.7rem,calc(env(safe-area-inset-top)+3.1rem))]' : ''}`}>
        {!useSharedTopHud ? (
          <TopBar XP={XP} brainPoints={brainPoints} health={health} timer={timerLabel} onBack={onBack} />
        ) : null}

        <div className={`relative mx-4 flex-1 overflow-hidden rounded-3xl border-4 border-blue-400/30 bg-blue-900/20 shadow-2xl ${useSharedTopHud ? 'mt-2' : 'mt-4'}`}>
          {Array.from({ length: LANES }).map((_, laneIndex) => (
            <div
              key={`lane-${laneIndex}`}
              className="absolute left-0 right-0 flex h-[20%] items-center border-b border-blue-400/10"
              style={{ top: `${laneIndex * 20}%` }}
            >
              {Array.from({ length: SLOTS }).map((__, slotIndex) => (
                <div
                  key={`slot-${laneIndex}-${slotIndex}`}
                  onClick={() => handleGridClick(laneIndex, slotIndex)}
                  className="h-full cursor-pointer border-r border-blue-400/10 transition-colors hover:bg-white/5"
                  style={{ width: `${SLOT_WIDTH}%` }}
                />
              ))}
            </div>
          ))}

          {defenders.map((defender) => (
            <motion.div
              key={defender.id}
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className={`absolute ${defender.color} flex items-center justify-center rounded-xl border-2 border-white/30 shadow-lg`}
              style={{
                top: `${(defender.lane * 20) + 2}%`,
                left: `${(defender.slot * SLOT_WIDTH) + 1}%`,
                width: '10%',
                height: '16%',
              }}
            >
              {iconFor(defender.icon)}
            </motion.div>
          ))}

          {projectiles.map((projectile) => (
            <div
              key={projectile.id}
              className={`absolute h-4 w-4 rounded-full ${projectile.color} border border-white shadow-[0_0_10px_white]`}
              style={{ top: `${(projectile.lane * 20) + 8}%`, left: `${projectile.x}%` }}
            />
          ))}

          <AnimatePresence>
            {zombies.map((zombie) => (
              <motion.div
                key={zombie.id}
                initial={{ x: 45, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ scale: 0, opacity: 0 }}
                className="absolute flex flex-col items-center"
                style={{
                  top: `${(zombie.lane * 20) + 2}%`,
                  left: `${zombie.x}%`,
                  width: '12%',
                  height: '16%',
                }}
              >
                <div className="mb-1 whitespace-nowrap rounded-md border-2 border-blue-400 bg-white px-2 py-0.5 text-xs font-black text-blue-900 shadow-lg">
                  {zombie.fraction.n}/{zombie.fraction.d}
                </div>
                <div className="flex h-12 w-12 items-center justify-center rounded-full border-2 border-gray-400 bg-gradient-to-b from-gray-600 to-gray-900 shadow-xl">
                  <Skull className="h-8 w-8 text-gray-300" />
                </div>
                <div className="mt-1 h-1 w-10 overflow-hidden rounded-full bg-black/40">
                  <div className="h-full bg-red-500" style={{ width: `${Math.max(0, Math.min(100, zombie.health / baseZombieHealth * 100))}%` }} />
                </div>
              </motion.div>
            ))}
          </AnimatePresence>

          <div className="absolute right-3 top-3 rounded-full border border-amber-200/70 bg-[linear-gradient(180deg,rgba(251,191,36,0.98),rgba(245,158,11,0.98))] px-3 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-amber-950 shadow-[0_8px_16px_rgba(2,6,23,0.24)]">
            Wave {wave}
          </div>
        </div>

        <div className="flex h-32 items-center justify-center gap-4 border-t-4 border-blue-400/50 bg-blue-950/80 px-8">
          {DEFENDER_TYPES.map((type) => (
            <button
              key={type.id}
              onClick={() => setSelectedDefenderId(type.id)}
              className={`relative flex flex-col items-center rounded-2xl p-2 transition-all ${selectedDefenderId === type.id ? 'scale-110 border-2 border-white bg-white/20' : 'hover:bg-white/10'} ${brainPoints < type.cost ? 'opacity-50 grayscale' : ''}`}
            >
              <div className={`${type.color} flex h-14 w-14 items-center justify-center rounded-xl border-2 border-white/20 shadow-xl`}>
                {iconFor(type.icon)}
              </div>
              <span className="mt-1 text-xs font-black text-yellow-400">{type.ratio.label}</span>
              <div className="mt-0.5 flex items-center gap-1">
                <Brain className="h-3 w-3 text-cyan-300" />
                <span className="text-[10px] font-bold">{type.cost}</span>
              </div>
            </button>
          ))}

          <div className="ml-8 flex flex-col gap-1 border-l border-white/10 pl-8">
            <span className="text-[10px] font-bold uppercase tracking-widest text-blue-300">Selected</span>
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl border-2 border-dashed border-blue-400/50">
              {selectedDefender ? (
                <div className={`${selectedDefender.color} flex h-12 w-12 items-center justify-center rounded-lg`}>
                  {iconFor(selectedDefender.icon)}
                </div>
              ) : (
                <Crosshair className="h-6 w-6 text-blue-400/30" />
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MathsVsZombiesGame;
