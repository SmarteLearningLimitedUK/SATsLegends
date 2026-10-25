import React, { useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { Timer as TimerIcon, Heart, Target, Brain } from 'lucide-react';
import { AnimatePresence, motion, useIsPresent, useReducedMotion } from 'motion/react';
import { CHARACTER_AVATARS, DEFAULT_AVATAR_ID } from '../assets/characters';
import zombieEnemy from '../assets/enemies/cohesive/zombie.webp';
import PracticeIntroPopup from '../components/game-ui/PracticeIntroPopup';
import { GameQuestionCard } from '../components/game-ui/GameUiKit';
import { ReferenceArt } from '../components/game-ui/ReferenceScreenArt';
import { MiniGameShellContractProps, emitMiniGameSessionEvent } from '../app/gameplaySessionContract';
import { formatMultiplicationDisplay } from '../utils/mathDisplay';
import MonsterMindActor from '../components/game-ui/MonsterMindActor';
import ZombieHeroActor from './ZombieHeroActor';
import SceneEnvironment from '../components/SceneEnvironment';
import { getVisionEnvironment, VisionSceneContext } from './visionScene';
import { playGameSound, playMonsterSound } from '../audio/gameAudio';
import { LEVEL_TIMERS_DISABLED } from '../app/testingFlags';
import './maths-vs-zombies.css';

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
  x: number; // 0..100
  y: number; // 0..100
  health: number;
  maxHealth: number;
  speed: number; // percent per second
  state: ZombieState;
  stateTime: number;
}

interface Question {
  prompt: string;
  equation: string;
  options: number[];
  correctIndex: number;
}

type Operation = '+' | '-' | '×' | '÷';
type QuestionOperands = { a: number; b: number; op: Operation };

interface SpellShot {
  id: number;
  targetId: number;
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  phase: 'flight' | 'impact';
}

const SPAWN_RIGHT_X = 94;
const TARGET_Y = 90;
const TARGET_X = 20;
const ZOMBIE_SIZE = 'var(--zombie-size, 96px)';
const ROUND_SECONDS = 60;
const SPELL_FLIGHT_MS = 460;
const SPELL_IMPACT_MS = 290;
const displayZombieX = (x: number) => x;

const stateDuration = (state: ZombieState) => {
  if (state === 'attack') return 1.8;
  if (state === 'appear') return 0.6;
  if (state === 'die') return 0.7;
  return 0.9;
};

const maxZombiesForLevel = (levelId: number) => {
  return [1, 2, 2, 3, 4][Math.max(0, Math.min(4, levelId - 1))];
};

const starsFromAccuracy = (correct: number, attempts: number) => {
  const accuracy = correct / Math.max(1, attempts);
  return accuracy >= 0.9 ? 3 : accuracy >= 0.7 ? 2 : 1;
};

const formatZombieQuestion = (equation: string, variant: number): string => {
  const words = equation.replace(/ ([+\-×÷]) /g, (_, operation: string) => ` ${{'+':'plus','-':'minus','×':'multiplied by','÷':'divided by'}[operation]} `)
    .replace(/\((-\d+)\)/g, (_, value: string) => `negative ${Math.abs(Number(value))}`);
  if (variant % 3 === 1) return `${words} = ?`;
  if (variant % 3 === 2) return `What is ${words}?`;
  return `${formatMultiplicationDisplay(equation)} = ?`;
};

const buildQuestion = (levelId: number, forced?: QuestionOperands, wordingVariant = 1): Question => {
  const roll = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;

  let opPool: Operation[] = ['+', '-'];
  let a = 0;
  let b = 0;
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
    // Confident two-digit addition/subtraction before times-table questions.
    opPool = ['+', '-'];
    a = roll(10, 50);
    b = roll(10, 40);
  } else if (levelId === 4) {
    // Introduce multiplication/division with manageable factors.
    opPool = ['×', '÷', '+', '-'];
    a = roll(2, 8);
    b = roll(2, 8);
  } else {
    opPool = ['+', '-', '×', '÷'];
    a = roll(2, 12);
    b = roll(2, 12);
  }

  const op = forced?.op ?? opPool[Math.floor(Math.random() * opPool.length)];
  if (!forced && levelId === 3 && Math.random() < 1 / 3) {
    a = roll(-10, -1); b = roll(1, 10);
  }
  if (!forced && levelId === 4 && (op === '+' || op === '-')) {
    a = roll(-15, 15); b = roll(1, 12);
  }
  if (!forced && levelId === 5 && (op === '+' || op === '-')) {
    a = roll(-20, 30); b = roll(1, 20);
  }
  if (forced) { a = forced.a; b = forced.b; }

  if (op === '+') {
    answer = a + b;
    equation = `${a} + ${b < 0 ? `(${b})` : b}`;
  } else if (op === '-') {
    if (levelId <= 2) {
      if (a < b) [a, b] = [b, a];
    }
    answer = a - b;
    equation = `${a} - ${b < 0 ? `(${b})` : b}`;
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
    if (candidate !== answer && (levelId >= 3 || candidate >= 0)) options.add(candidate);
  }
  const shuffled = Array.from(options).sort(() => Math.random() - 0.5);
  return {
    prompt: formatZombieQuestion(equation, wordingVariant),
    equation: formatMultiplicationDisplay(equation),
    options: shuffled,
    correctIndex: shuffled.indexOf(answer),
  };
};

const questionSignature = (question: Question) => `${question.equation}\u0000${question.options[question.correctIndex]}`;

const buildFreshQuestion = (levelId: number, used: Set<string>): Question => {
  const claim = (candidate: Question) => {
    const signature = questionSignature(candidate);
    if (used.has(signature)) return false;
    used.add(signature);
    return true;
  };

  for (let attempt = 0; attempt < 32; attempt += 1) {
    const candidate = buildQuestion(levelId, undefined, (used.size + 1) % 3);
    if (claim(candidate)) return candidate;
  }

  // Near the end of a small tier's question pool, random retries can keep
  // finding used sums. Search its existing operand range before recycling.
  const pools: { ops: Operation[]; minA: number; maxA: number; minB: number; maxB: number }[] = [
    { ops: ['+'], minA: 0, maxA: 5, minB: 0, maxB: 5 },
    { ops: ['+', '-'], minA: 0, maxA: 10, minB: 0, maxB: 8 },
    { ops: ['+', '-'], minA: -10, maxA: 50, minB: 1, maxB: 40 },
    { ops: ['×', '÷', '+', '-'], minA: 2, maxA: 8, minB: 2, maxB: 8 },
    { ops: ['+', '-', '×', '÷'], minA: 2, maxA: 12, minB: 2, maxB: 12 },
  ];
  const pool = pools[Math.max(0, Math.min(4, levelId - 1))];
  for (const op of pool.ops) {
    const minA = levelId >= 4 && (op === '+' || op === '-') ? (levelId === 4 ? -15 : -20) : pool.minA;
    const maxA = levelId >= 5 && (op === '+' || op === '-') ? 30 : pool.maxA;
    const minB = levelId >= 5 && (op === '+' || op === '-') ? 1 : pool.minB;
    const maxB = levelId >= 5 && (op === '+' || op === '-') ? 20 : pool.maxB;
    for (let a = minA; a <= maxA; a += 1) {
      for (let b = minB; b <= maxB; b += 1) {
        const candidate = buildQuestion(levelId, { a, b, op }, (used.size + 1) % 3);
        if (claim(candidate)) return candidate;
      }
    }
  }

  // The level-one pool is finite. If a very fast player sees every sum in
  // one minute, begin another cycle without immediately repeating the last.
  const lastSignature = Array.from(used).at(-1);
  used.clear();
  if (lastSignature) used.add(lastSignature);
  return buildFreshQuestion(levelId, used);
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
          <span className="mt-1 text-[12px] font-black uppercase text-blue-200">Base Health</span>
        </div>
        <div className="h-8 w-[2px] bg-blue-400/20" />
        <div className="flex flex-col">
          <span className="text-[12px] font-bold uppercase tracking-tighter text-blue-200">XP</span>
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
  sessionState,
  sessionEvents,
  onVictory,
  onGameOver,
  onBack,
}) => {
  const tier = Math.max(1, Math.min(5, levelId || 1));
  const isPresent = useIsPresent();
  const reducedMotion = useReducedMotion();
  const canSelectTarget = !isPractice && tier >= 3;
  const victoryTargetScore = useMemo(() => (isPractice ? 4 : tier + 3) * 220, [isPractice, tier]);
  const baseZombieHealth = useMemo(() => 1, []);
  const spawnDelayMs = useMemo(() => [6000, 5200, 4400, 3600, 3000][tier - 1], [tier]);

  const [XP, setScore] = useState(0);
  const [zombiesDefeated, setZombiesDefeated] = useState(0);
  const [health, setHealth] = useState(3);
  const [localTimeLeft, setLocalTimeLeft] = useState(ROUND_SECONDS);
  const [zombies, setZombies] = useState<Zombie[]>([]);
  const [selectedTargetId, setSelectedTargetId] = useState<number | null>(null);
  const [spellShot, setSpellShot] = useState<SpellShot | null>(null);
  const [isCasting, setIsCasting] = useState(false);
  const [question, setQuestion] = useState<Question>(() => buildQuestion(tier));
  const usedQuestionsRef = useRef<Set<string>>(new Set([questionSignature(question)]));
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [feedback, setFeedback] = useState('');
  const [locked, setLocked] = useState(false);
  const [gameActive, setGameActive] = useState(true);
  const [showPracticeIntro, setShowPracticeIntro] = useState(Boolean(isPractice));
  const paused = Boolean(sessionState?.paused || showPracticeIntro);
  const scene = useContext(VisionSceneContext);
  // Enemies react to their own hits/attacks, not the player's celebration cue.
  const enemyScene = useMemo(() => ({key:scene.key,cue:'idle' as const,sequence:0,paused:scene.paused}), [scene.key,scene.paused]);
  const usesSharedLives = Boolean(sessionState && !isPractice);
  const timeLeft = sessionState && !LEVEL_TIMERS_DISABLED && !isPractice ? sessionState.timeLeft : localTimeLeft;
  const pausedRef = useRef(paused); pausedRef.current = paused;

  const rafRef = useRef<number | null>(null);
  const lastTimeRef = useRef(0);
  const spawnTimerRef = useRef(0);
  const endedRef = useRef(false);
  const idRef = useRef(1);
  const queueSpacingRef = useRef(0);
  const answerLockRef = useRef(false);
  const answerTimerRef = useRef<number | null>(null);
  const spellImpactTimerRef = useRef<number | null>(null);
  const spellClearTimerRef = useRef<number | null>(null);
  const spellIdRef = useRef(0);
  const playfieldRef = useRef<HTMLDivElement | null>(null);
  const playerRef = useRef<HTMLDivElement | null>(null);
  const scoreRef = useRef(0);
  const attemptsRef = useRef(0);
  const onVictoryRef = useRef(onVictory); onVictoryRef.current = onVictory;
  const onGameOverRef = useRef(onGameOver); onGameOverRef.current = onGameOver;
  const presentRef = useRef(isPresent); presentRef.current = isPresent;

  const zombiesRef = useRef<Zombie[]>([]);
  const selectedTargetRef = useRef<number | null>(null);
  // The frame loop, spawn and hit paths own this live state. Copying a
  // delayed React commit back here rewinds positions when a new enemy enters.

  useEffect(() => {
    if (selectedTargetId === null || zombies.some((enemy) => enemy.id === selectedTargetId && enemy.state !== 'die')) return;
    selectedTargetRef.current = null;
    setSelectedTargetId(null);
  }, [selectedTargetId, zombies]);

  const clearSpellTimers = useCallback(() => {
    if (spellImpactTimerRef.current !== null) window.clearTimeout(spellImpactTimerRef.current);
    if (spellClearTimerRef.current !== null) window.clearTimeout(spellClearTimerRef.current);
    spellImpactTimerRef.current = null;
    spellClearTimerRef.current = null;
  }, []);

  useEffect(() => {
    setShowPracticeIntro(Boolean(isPractice));
  }, [isPractice]);

  const avatarImage = useMemo(() => (
    CHARACTER_AVATARS.find((avatar) => avatar.id === avatarId)?.image
      ?? CHARACTER_AVATARS.find((avatar) => avatar.id === DEFAULT_AVATAR_ID)?.image
      ?? CHARACTER_AVATARS[0].image
  ), [avatarId]);

  const spawnZombie = useCallback((): Zombie | null => {
    const maxZombies = isPractice ? 1 : maxZombiesForLevel(tier);
    if (zombiesRef.current.filter((enemy) => enemy.state !== 'die').length >= maxZombies) return null;
    // Queue at the lawn's right edge, with a full target-width gap between
    // entrances. All approach along the same grounded route.
    const field = playfieldRef.current;
    const actor = field?.querySelector<HTMLElement>('.zombies-target');
    const actorWidth = actor?.offsetWidth ?? field?.querySelector<HTMLElement>('.zombies-player-avatar')?.offsetWidth ?? 96;
    const spawnX = Math.min(SPAWN_RIGHT_X, 100 - (actorWidth / 2 + 12) / Math.max(1, field?.clientWidth ?? 800) * 100);
    const spacing = (actorWidth + 12) / Math.max(1, field?.clientWidth ?? 800) * 100;
    queueSpacingRef.current = spacing;
    if (zombiesRef.current.some(enemy => enemy.state !== 'die' && spawnX - enemy.x < spacing)) return null;
    const zombie: Zombie = {
      id: idRef.current++,
      x: spawnX,
      y: TARGET_Y,
      health: baseZombieHealth,
      maxHealth: baseZombieHealth,
      speed: isPractice ? 0.7 : [1.6, 1.9, 2.2, 2.5, 2.8][tier - 1],
      state: 'appear',
      stateTime: 0,
    };

    const next = [...zombiesRef.current, zombie];
    zombiesRef.current = next;
    setZombies(next);
    playMonsterSound('monster_growl');
    return zombie;
  }, [baseZombieHealth, isPractice, tier]);

  const finishGame = useCallback((won: boolean, reason = 'lives') => {
    if (!presentRef.current || endedRef.current) return;
    endedRef.current = true;
    setGameActive(false);

    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }

    if (won) {
      const finalScore = scoreRef.current;
      const stars = starsFromAccuracy(finalScore / 220, attemptsRef.current);
      emitMiniGameSessionEvent(sessionEvents, 'game_complete', { score: finalScore, stars });
      onVictoryRef.current(stars, finalScore);
      return;
    }
    emitMiniGameSessionEvent(sessionEvents, 'game_failed', { score: scoreRef.current, reason });
    if (reason === 'timer' || !usesSharedLives) onGameOverRef.current(scoreRef.current);
  }, [sessionEvents, usesSharedLives]);

  useEffect(() => {
    endedRef.current = false;
    setGameActive(true);
    setScore(0);
    scoreRef.current = 0;
    attemptsRef.current = 0;
    answerLockRef.current = false;
    if (answerTimerRef.current !== null) window.clearTimeout(answerTimerRef.current);
    clearSpellTimers();
    setSpellShot(null);
    setIsCasting(false);
    setZombiesDefeated(0);
    setHealth(3);
    setLocalTimeLeft(ROUND_SECONDS);
    setZombies([]);
    zombiesRef.current = [];
    selectedTargetRef.current = null;
    setSelectedTargetId(null);
    usedQuestionsRef.current.clear();
    setQuestion(buildFreshQuestion(tier, usedQuestionsRef.current));
    setSelectedAnswer(null);
    setFeedback('');
    setLocked(false);
    idRef.current = 1;
    spawnTimerRef.current = 0;
    lastTimeRef.current = 0;
    spawnZombie();
  }, [tier, spawnDelayMs, spawnZombie, clearSpellTimers]);

  useEffect(() => () => {
    endedRef.current = true;
    if (answerTimerRef.current !== null) window.clearTimeout(answerTimerRef.current);
    clearSpellTimers();
    if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
  }, [clearSpellTimers]);
  useEffect(() => {
    if (isPresent) return;
    endedRef.current = true;
    if (answerTimerRef.current !== null) window.clearTimeout(answerTimerRef.current);
    clearSpellTimers();
    if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
  }, [isPresent, clearSpellTimers]);

  useEffect(() => {
    if (paused || !isPresent || isPractice || !gameActive || endedRef.current || (sessionState && !LEVEL_TIMERS_DISABLED)) return;
    const timerInterval = window.setInterval(() => {
      if (document.hidden) return;
      setLocalTimeLeft((previous) => Math.max(0, previous - 1));
    }, 1000);

    return () => window.clearInterval(timerInterval);
  }, [gameActive, isPractice, isPresent, paused, sessionState]);

  useEffect(() => {
    if (paused || isPractice || !gameActive || timeLeft > 0) return;
    finishGame(health > 0 && scoreRef.current >= victoryTargetScore, 'timer');
  }, [finishGame, gameActive, health, isPractice, paused, timeLeft, victoryTargetScore]);

  const updateFrame = useCallback((timestamp: number) => {
    if (!presentRef.current || paused || !gameActive || endedRef.current) return;

    if (document.hidden) {
      lastTimeRef.current = 0;
      rafRef.current = requestAnimationFrame(updateFrame);
      return;
    }

    if (!lastTimeRef.current) {
      lastTimeRef.current = timestamp;
      rafRef.current = requestAnimationFrame(updateFrame);
      return;
    }

    // A background tab can suspend animation frames for seconds or minutes.
    // Never turn that elapsed time into a sudden zombie advance on return.
    const deltaMs = Math.min(100, Math.max(0, timestamp - lastTimeRef.current));
    const dt = deltaMs / 1000;
    lastTimeRef.current = timestamp;

    spawnTimerRef.current += deltaMs;
    if (spawnTimerRef.current >= spawnDelayMs) {
      // Retry as soon as the entrance clears, without waiting another interval.
      if (spawnZombie()) spawnTimerRef.current = 0;
    }

    let breaches = 0;
    let leadX: number | undefined;
    const zombiesNext = [...zombiesRef.current].sort((a,b)=>a.x-b.x).map((zombie) => {
      const nextY = TARGET_Y;
      let nextX = zombie.x;
      if (zombie.state !== 'attack' && zombie.state !== 'die') {
        const clearance = leadX === undefined ? TARGET_X : leadX + queueSpacingRef.current;
        nextX = Math.max(TARGET_X, zombie.x - zombie.speed * dt, Math.min(zombie.x, clearance));
      }

      let nextState = zombie.state;
      let nextStateTime = zombie.stateTime + dt;
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

      if (Math.hypot(nextX - TARGET_X, nextY - TARGET_Y) <= 2 && nextState !== 'attack' && nextState !== 'die') {
        nextState = 'attack';
        nextStateTime = 0;
        breaches += 1;
      }

      if (nextState === 'attack' && nextStateTime >= stateDuration('attack')) {
        return null;
      }

      if (nextState !== 'die') leadX = nextX;

      return {
        ...zombie,
        x: nextX,
        y: nextY,
        state: nextState,
        stateTime: nextStateTime,
      } as Zombie;
    }).filter(Boolean) as Zombie[];

    if (breaches > 0) playGameSound('impact');
    if (breaches > 0 && !isPractice) {
      attemptsRef.current += breaches;
      for (let index = 0; index < breaches; index += 1) emitMiniGameSessionEvent(sessionEvents, 'incorrect_answer', { score: scoreRef.current, metadata: { breach: timestamp, index } });
      setHealth((value) => Math.max(0, value - breaches));
    }

    zombiesRef.current = zombiesNext;
    setZombies(zombiesNext);

    if (!isPractice && health - breaches <= 0 && !endedRef.current) {
      finishGame(false);
      return;
    }

    rafRef.current = requestAnimationFrame(updateFrame);
  }, [finishGame, gameActive, health, isPractice, paused, sessionEvents, spawnDelayMs, spawnZombie]);

  useEffect(() => {
    lastTimeRef.current = 0;
    if (!isPresent || paused || !gameActive || endedRef.current) return;
    rafRef.current = requestAnimationFrame(updateFrame);
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  }, [gameActive, isPresent, paused, updateFrame]);

  const castSpellAt = (target: Zombie) => {
    clearSpellTimers();
    const field = playfieldRef.current;
    const fieldBounds = field?.getBoundingClientRect();
    const avatarBounds = playerRef.current?.querySelector('img')?.getBoundingClientRect();
    const targetBounds = field?.querySelector<HTMLElement>(`[data-zombie-id="${target.id}"]`)?.getBoundingClientRect();
    const width = fieldBounds?.width ?? 800;
    const height = fieldBounds?.height ?? 450;
    const inside = (value: number, limit: number) => Math.max(12, Math.min(limit - 12, value));
    const startX = inside(avatarBounds && fieldBounds
      ? avatarBounds.left - fieldBounds.left + avatarBounds.width * 0.76 : width * 0.13, width);
    const startY = inside(avatarBounds && fieldBounds
      ? avatarBounds.top - fieldBounds.top + avatarBounds.height * 0.65 : height * 0.72, height);
    const endX = inside(targetBounds && fieldBounds
      ? targetBounds.left - fieldBounds.left + targetBounds.width * 0.5 : width * displayZombieX(target.x) / 100 + 30, width);
    const endY = inside(targetBounds && fieldBounds
      ? targetBounds.top - fieldBounds.top + targetBounds.height * 0.46 : height * target.y / 100 + 30, height);
    const shotId = ++spellIdRef.current;
    playGameSound('cast');
    setIsCasting(!reducedMotion);
    setSpellShot({ id: shotId, targetId: target.id, startX, startY, endX, endY, phase: reducedMotion ? 'impact' : 'flight' });

    const impact = () => {
      spellImpactTimerRef.current = null;
      if (!presentRef.current || endedRef.current) return;
      if (pausedRef.current || document.hidden) { spellImpactTimerRef.current = window.setTimeout(impact, 100); return; }
      const hit = zombiesRef.current.some((zombie) => zombie.id === target.id && zombie.state !== 'die');
      if (hit) {
        playGameSound('impact');
        playMonsterSound('monster_defeat');
        const next = zombiesRef.current.map((zombie) => zombie.id === target.id
          ? { ...zombie, health: 0, state: 'die' as ZombieState, stateTime: 0 }
          : zombie);
        zombiesRef.current = next;
        setZombies(next);
        setZombiesDefeated((value) => value + 1);
      }
      if (selectedTargetRef.current === target.id) {
        selectedTargetRef.current = null;
        setSelectedTargetId(null);
      }
      setFeedback('Zombie down!');
      setIsCasting(false);
      setSpellShot((current) => current?.id === shotId ? { ...current, phase: 'impact' } : current);
      spawnTimerRef.current = spawnDelayMs;
      const clearImpact = () => {
        if (!presentRef.current || endedRef.current) return;
        if (pausedRef.current || document.hidden) { spellClearTimerRef.current = window.setTimeout(clearImpact, 100); return; }
        setSpellShot((current) => current?.id === shotId ? null : current);
        spellClearTimerRef.current = null;
      };
      spellClearTimerRef.current = window.setTimeout(clearImpact, SPELL_IMPACT_MS);
    };
    if (reducedMotion) impact();
    else spellImpactTimerRef.current = window.setTimeout(impact, SPELL_FLIGHT_MS);
  };

  const handleAnswer = (index: number) => {
    if (!presentRef.current || paused || !gameActive || endedRef.current || locked || answerLockRef.current) return;
    answerLockRef.current = true;
    attemptsRef.current += 1;
    setLocked(true);
    setSelectedAnswer(index);
    if (index === question.correctIndex) {
      setFeedback('Spell cast!');
      const available = zombiesRef.current.filter((enemy) => enemy.state !== 'die');
      const targetZombie = (canSelectTarget
        ? available.find((enemy) => enemy.id === selectedTargetRef.current)
        : null) ?? available.reduce((closest, zombie) => (
        !closest || Math.hypot(zombie.x - TARGET_X, zombie.y - TARGET_Y)
          < Math.hypot(closest.x - TARGET_X, closest.y - TARGET_Y)
          ? zombie : closest
      ), null as Zombie | null) ?? spawnZombie();

      if (targetZombie) castSpellAt(targetZombie);
      scoreRef.current += 220;
      setScore(scoreRef.current);
      emitMiniGameSessionEvent(sessionEvents, 'correct_answer', { score: scoreRef.current, metadata: { tier, equation: question.prompt, answer: question.options[index] } });
      emitMiniGameSessionEvent(sessionEvents, 'puzzle_complete', { score: scoreRef.current });
    } else {
      setFeedback('Close! Try the next one.');
      playMonsterSound('monster_laugh');
      emitMiniGameSessionEvent(sessionEvents, 'incorrect_answer', { score: scoreRef.current, metadata: { tier, equation: question.prompt } });
      if (!isPractice) setHealth((value) => Math.max(0, value - 1));
      if (!isPractice && health <= 1) {
        finishGame(false);
      }
    }
    const settleAnswer = () => {
      answerTimerRef.current = null;
      if (!presentRef.current || endedRef.current) return;
      if (pausedRef.current) { answerTimerRef.current = window.setTimeout(settleAnswer, 100); return; }
      if (isPractice && scoreRef.current >= victoryTargetScore) { finishGame(true); return; }
      setQuestion(buildFreshQuestion(tier, usedQuestionsRef.current));
      setSelectedAnswer(null);
      setFeedback('');
      setLocked(false);
      answerLockRef.current = false;
    };
    answerTimerRef.current = window.setTimeout(settleAnswer, 750);
  };

  const timerLabel = useMemo(() => {
    const mins = Math.floor(timeLeft / 60);
    const secs = timeLeft % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }, [timeLeft]);
  const spellStyle = spellShot ? {
    '--spell-start-x': `${spellShot.startX}px`,
    '--spell-start-y': `${spellShot.startY}px`,
    '--spell-end-x': `${spellShot.endX}px`,
    '--spell-end-y': `${spellShot.endY}px`,
    '--spell-dx': `${spellShot.endX - spellShot.startX}px`,
    '--spell-dy': `${spellShot.endY - spellShot.startY}px`,
    '--spell-distance': `${Math.hypot(spellShot.endX - spellShot.startX, spellShot.endY - spellShot.startY)}px`,
    '--spell-angle': `${Math.atan2(spellShot.endY - spellShot.startY, spellShot.endX - spellShot.startX)}rad`,
    '--spell-flight-duration': `${SPELL_FLIGHT_MS}ms`,
  } as React.CSSProperties : undefined;

  return (
    <div
      className="maths-vs-zombies relative flex h-full w-full flex-col items-center overflow-hidden font-sans text-white select-none"
      data-paused={paused}
      data-zombies-game data-zombies-equation={question.equation} data-zombies-tier={tier} data-zombies-score={XP} data-zombies-target={victoryTargetScore} data-zombies-time={timeLeft}
    >
      <SceneEnvironment className="zombies-scene-backdrop" src={getVisionEnvironment('maths_vs_zombies')??''} fit="cover" />
      <PracticeIntroPopup
        open={showPracticeIntro}
        title={gameTitle || 'Maths vs Zombies'}
        body="The Monster Minds have sent their minions.\nSolve four sums at your own pace to push them back.\nPractice minions wait while you work."
        briefing={practiceBriefing}
        onAction={() => setShowPracticeIntro(false)}
      />

      <div className="zombies-layout relative z-10 flex h-full w-full flex-col gap-2">
        {!useSharedTopHud ? (
          <TopBar XP={XP} brainPoints={zombiesDefeated} health={health} timer={timerLabel} onBack={onBack} />
        ) : null}

        <GameQuestionCard context="" className="zombies-question-card" title={gameTitle || 'Maths vs Zombies'} subtitle={<><span data-game-tip="true">Choose an answer to cast a spell. Stop {victoryTargetScore / 220} zombies {isPractice ? 'to finish practice.' : 'before time runs out.'} </span><span>{zombiesDefeated} / {victoryTargetScore / 220} stopped.</span></>} style={{ position: 'relative', top: '5px', width: 'min(92%, 920px)', transform: 'none' }}>
          {question.prompt}
        </GameQuestionCard>

        <div
          ref={playfieldRef}
          style={{'--zombies-ground': `${TARGET_Y}%`} as React.CSSProperties}
          className={`zombies-playfield relative mx-4 flex-1 overflow-hidden rounded-3xl border-4 border-blue-400/30 shadow-2xl ${useSharedTopHud ? 'mt-2' : 'mt-4'}`}
        >
          <div className="zombies-battle-runes" aria-hidden="true"/><div className="zombies-mist" aria-hidden="true"/>
          <div className="zombies-hero-footing" aria-hidden="true" />
          <div ref={playerRef} className="zombies-player absolute flex flex-col items-center" data-player-character="true" data-hero-ground={TARGET_Y} data-casting={isCasting}>
            <div className="zombies-player-label text-[13px] font-black uppercase tracking-[0.18em] text-cyan-100">You</div>
            <ZombieHeroActor source={avatarImage} avatarId={avatarId} casting={isCasting}/>
          </div>

          <VisionSceneContext.Provider value={enemyScene}>
          <AnimatePresence>
            {zombies.map((zombie) => {
              return (
                <motion.button
                  key={zombie.id}
                  type="button"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.2 }}
                  exit={{ opacity: 1 }}
                  className={`zombies-target absolute flex flex-col items-center gap-1 ${selectedTargetId === zombie.id ? 'zombies-target-selected' : ''}`}
                  data-button-skin="none"
                  data-zombie-state={zombie.state}
                  onClick={() => {
                    if (!canSelectTarget || zombie.state === 'die' || paused || locked || !gameActive) return;
                    selectedTargetRef.current = zombie.id;
                    setSelectedTargetId(zombie.id);
                  }}
                  disabled={!canSelectTarget || zombie.state === 'die' || paused || locked || !gameActive}
                  aria-label={canSelectTarget ? `Aim at minion ${zombie.id}` : undefined}
                  aria-pressed={canSelectTarget ? selectedTargetId === zombie.id : undefined}
                  data-zombie-id={zombie.id}
                  data-zombie-x={zombie.x}
                  data-zombie-ground={TARGET_Y}
                  style={{
                    ['--zombie-y' as string]: `${zombie.y}%`,
                    top: `clamp(0px, calc(${TARGET_Y}% - ${ZOMBIE_SIZE} * .95), max(0px, calc(100% - ${ZOMBIE_SIZE} - 10px)))`,
                    // Positions describe the feet on the lawn, including entrances beyond its edge.
                    left: `calc(${displayZombieX(zombie.x)}% - ${ZOMBIE_SIZE} * .5)`,
                    width: ZOMBIE_SIZE,
                  }}
                >
                  <MonsterMindActor soundMode="off" src={zombieEnemy} walking={zombie.state==='walk'||zombie.state==='appear'} alt="Cartoon zombie minion" reaction={zombie.state === 'die' ? 'defeated' : zombie.state === 'attack' ? 'taunt' : zombie.state === 'hit' ? 'hit' : 'idle'} reactionKey={`${zombie.id}-${zombie.state}`} style={{ width: ZOMBIE_SIZE, height: ZOMBIE_SIZE }} />
                  <div className="zombies-enemy-health h-2 w-full overflow-hidden rounded-full bg-black/40">
                    <div
                      className="h-full bg-emerald-300"
                      style={{ width: `${Math.max(0, Math.min(100, (zombie.health / zombie.maxHealth) * 100))}%` }}
                    />
                  </div>
                </motion.button>
              );
            })}
          </AnimatePresence>
          </VisionSceneContext.Provider>

          {spellShot ? (
            <div className="zombies-spell-layer" data-spell-shot={spellShot.id} data-spell-target={spellShot.targetId} data-spell-phase={spellShot.phase} style={spellStyle} aria-hidden="true">
              {spellShot.phase === 'flight' ? (
                <>
                  <span className="zombies-spell-trail" />
                  <span className="zombies-spell-projectile"><i /><i /><i /></span>
                </>
              ) : <span className="zombies-spell-impact"><i /><i />{Array.from({length: 8}, (_, index) => <b key={index} className="zombies-impact-spark" style={{ '--spark-angle': `${index * 45}deg` } as React.CSSProperties}/>)}</span>}
            </div>
          ) : null}

        </div>

        <div className="zombies-answer-board licensed-board-frame mx-4 mt-1 rounded-[1.35rem] px-4 py-3">
          <ReferenceArt part="answer-panel" />
          <div
            className={`zombies-feedback min-h-[16px] text-center text-[13px] font-semibold uppercase tracking-[0.14em] text-cyan-100/80 ${feedback ? 'opacity-100' : 'opacity-0'}`}
            aria-hidden={!feedback}
          >
            {feedback || '\u00A0'}
          </div>
          <div className="zombies-response-header">
          <div className="zombies-answer-label mt-3 text-center font-black uppercase text-amber-100/90" role="status" aria-live="polite">
            {canSelectTarget
              ? selectedTargetId === null
                ? 'Tap a minion to aim, or answer for auto-aim'
                : `Minion ${selectedTargetId} targeted · answer to fire`
              : 'Choose the correct answer'}
          </div>
          {!isPractice ? (
            <div className="zombies-countdown" data-urgent={timeLeft <= 15} role="timer" aria-label={`${timeLeft} seconds remaining`}>
              <TimerIcon aria-hidden="true" />
              <span>{timerLabel}</span>
            </div>
          ) : null}
          </div>
          <div className="zombies-answer-options mt-2 grid grid-cols-4 gap-2">
            {question.options.map((option, index) => (
              <button
                key={`${option}-${index}`}
                type="button"
                onClick={() => handleAnswer(index)}
                disabled={locked || paused || !isPresent || !gameActive}
                className={`h-[clamp(2.6rem,6.5vh,3.15rem)] rounded-[0.95rem] px-2 text-[clamp(0.88rem,3vw,1.12rem)] font-black shadow-[0_10px_18px_rgba(2,6,23,0.24)] ${
                  locked && selectedAnswer === index
                    ? index === question.correctIndex
                      ? 'ui-button-success'
                      : 'ui-button-primary'
                    : 'ui-button-secondary'
                }`}
              >
                <ReferenceArt part="green-answer" /><span>{option}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default MathsVsZombiesGame;








