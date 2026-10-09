import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Timer as TimerIcon, Heart, Target, Brain } from 'lucide-react';
import { AnimatePresence, motion, useIsPresent } from 'motion/react';
import { CHARACTER_AVATARS, DEFAULT_AVATAR_ID } from '../assets/characters';
import zombieEnemy from '../assets/enemies/cohesive/zombie.webp';
import PracticeIntroPopup from '../components/game-ui/PracticeIntroPopup';
import { GameQuestionCard } from '../components/game-ui/GameUiKit';
import { MiniGameShellContractProps, emitMiniGameSessionEvent } from '../app/gameplaySessionContract';
import { formatMultiplicationDisplay } from '../utils/mathDisplay';
import MonsterMindActor from '../components/game-ui/MonsterMindActor';
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
  lane: number;
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
const ZOMBIE_SIZE = 'clamp(52px, 5vw, 80px)';

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

const buildQuestion = (levelId: number): Question => {
  const roll = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;

  let opPool: Array<'+' | '-' | '×' | '÷'> = ['+', '-'];
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
    opPool = ['×', '÷'];
    a = roll(2, 8);
    b = roll(2, 8);
  } else {
    opPool = ['+', '-', '×', '÷'];
    a = roll(2, 12);
    b = roll(2, 12);
  }

  const op = opPool[Math.floor(Math.random() * opPool.length)];
  if (levelId === 5 && (op === '+' || op === '-')) {
    a = roll(-20, 30); b = roll(-20, 20);
  }

  if (op === '+') {
    answer = a + b;
    equation = `${a} + ${b}`;
  } else if (op === '-') {
    if (levelId <= 3) {
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
    if (candidate !== answer && (levelId === 5 || candidate >= 0)) options.add(candidate);
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
  sessionState,
  sessionEvents,
  onVictory,
  onGameOver,
  onBack,
}) => {
  const tier = Math.max(1, Math.min(5, levelId || 1));
  const isPresent = useIsPresent();
  const roundSeconds = useMemo(() => [90, 85, 80, 75, 70][tier - 1], [tier]);
  const victoryTargetScore = useMemo(() => (isPractice ? 4 : tier + 3) * 220, [isPractice, tier]);
  const baseZombieHealth = useMemo(() => 1, []);
  const spawnDelayMs = useMemo(() => [6000, 5200, 4400, 3600, 3000][tier - 1], [tier]);

  const [XP, setScore] = useState(0);
  const [zombiesDefeated, setZombiesDefeated] = useState(0);
  const [health, setHealth] = useState(3);
  const [timeLeft, setTimeLeft] = useState(roundSeconds);
  const [zombies, setZombies] = useState<Zombie[]>([]);
  const [question, setQuestion] = useState<Question>(() => buildQuestion(tier));
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [feedback, setFeedback] = useState('');
  const [locked, setLocked] = useState(false);
  const [gameActive, setGameActive] = useState(true);
  const [showPracticeIntro, setShowPracticeIntro] = useState(Boolean(isPractice));
  const paused = Boolean(sessionState?.paused || showPracticeIntro);
  const usesSharedLives = Boolean(sessionState && !isPractice);
  const pausedRef = useRef(paused); pausedRef.current = paused;

  const rafRef = useRef<number | null>(null);
  const lastTimeRef = useRef(0);
  const spawnTimerRef = useRef(0);
  const endedRef = useRef(false);
  const idRef = useRef(1);
  const answerLockRef = useRef(false);
  const answerTimerRef = useRef<number | null>(null);
  const scoreRef = useRef(0);
  const attemptsRef = useRef(0);
  const onVictoryRef = useRef(onVictory); onVictoryRef.current = onVictory;
  const onGameOverRef = useRef(onGameOver); onGameOverRef.current = onGameOver;
  const presentRef = useRef(isPresent); presentRef.current = isPresent;

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
    const maxZombies = isPractice ? 1 : maxZombiesForLevel(tier);
    if (zombiesRef.current.filter((enemy) => enemy.state !== 'die').length >= maxZombies) return;
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
      speed: isPractice ? 0 : [0.9, 1.2, 1.6, 2, 2.4][tier - 1],
      state: 'appear',
      stateTime: 0,
    };

    const next = [...zombiesRef.current, zombie];
    zombiesRef.current = next;
    setZombies(next);
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
    setZombiesDefeated(0);
    setHealth(3);
    setTimeLeft(roundSeconds);
    setZombies([]);
    zombiesRef.current = [];
    setQuestion(buildQuestion(tier));
    setSelectedAnswer(null);
    setFeedback('');
    setLocked(false);
    idRef.current = 1;
    spawnTimerRef.current = 0;
    lastTimeRef.current = 0;
    spawnZombie();
  }, [tier, roundSeconds, spawnDelayMs, spawnZombie]);

  useEffect(() => () => {
    endedRef.current = true;
    if (answerTimerRef.current !== null) window.clearTimeout(answerTimerRef.current);
    if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
  }, []);
  useEffect(() => {
    if (isPresent) return;
    endedRef.current = true;
    if (answerTimerRef.current !== null) window.clearTimeout(answerTimerRef.current);
    if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
  }, [isPresent]);

  useEffect(() => {
    if (paused || !isPresent || isPractice || !gameActive || endedRef.current) return;
    const timerInterval = window.setInterval(() => {
      setTimeLeft((previous) => Math.max(0, previous - 1));
    }, 1000);

    return () => window.clearInterval(timerInterval);
  }, [gameActive, isPractice, isPresent, paused]);

  useEffect(() => {
    if (paused || isPractice || !gameActive || timeLeft > 0) return;
    finishGame(health > 0 && scoreRef.current >= victoryTargetScore, 'timer');
  }, [finishGame, gameActive, health, isPractice, paused, timeLeft, victoryTargetScore]);

  const updateFrame = useCallback((timestamp: number) => {
    if (!presentRef.current || paused || !gameActive || endedRef.current) return;

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
        stateTime: nextStateTime,
      } as Zombie;
    }).filter(Boolean) as Zombie[];

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

  const handleAnswer = (index: number) => {
    if (!presentRef.current || paused || !gameActive || endedRef.current || locked || answerLockRef.current) return;
    answerLockRef.current = true;
    attemptsRef.current += 1;
    setLocked(true);
    setSelectedAnswer(index);
    if (index === question.correctIndex) {
      setFeedback('Zombie down!');
      const targetZombie = zombiesRef.current.filter((enemy) => enemy.state !== 'die' && enemy.state !== 'attack').reduce((closest, zombie) => (
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
          };
        });
        zombiesRef.current = next;
        setZombies(next);
        setZombiesDefeated((value) => value + 1);
      }
      scoreRef.current += 220;
      setScore(scoreRef.current);
      spawnTimerRef.current = spawnDelayMs;
      emitMiniGameSessionEvent(sessionEvents, 'correct_answer', { score: scoreRef.current, metadata: { tier, equation: question.prompt, answer: question.options[index] } });
      emitMiniGameSessionEvent(sessionEvents, 'puzzle_complete', { score: scoreRef.current });
    } else {
      setFeedback('Close! Try the next one.');
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
      if (scoreRef.current >= victoryTargetScore) { finishGame(true); return; }
      setQuestion(buildQuestion(tier));
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

  return (
    <div
      className="maths-vs-zombies relative flex h-full w-full flex-col items-center overflow-hidden font-sans text-white select-none"
      data-zombies-game data-zombies-tier={tier} data-zombies-score={XP} data-zombies-target={victoryTargetScore} data-zombies-time={timeLeft}
    >
      <PracticeIntroPopup
        open={showPracticeIntro}
        title={gameTitle || 'Maths vs Zombies'}
        body="The Monster Minds have sent their minions.\nSolve four sums at your own pace to push them back.\nPractice minions wait while you work."
        briefing={practiceBriefing}
        onAction={() => setShowPracticeIntro(false)}
      />

      <div className="relative z-10 flex h-full w-full flex-col gap-2">
        {!useSharedTopHud ? (
          <TopBar XP={XP} brainPoints={zombiesDefeated} health={health} timer={timerLabel} onBack={onBack} />
        ) : null}

        <GameQuestionCard className="zombies-question-card" title={gameTitle || 'Maths vs Zombies'} subtitle={`Push back ${victoryTargetScore / 220} minions. ${XP / 220} cleared.`} style={{ position: 'relative', top: '5px', width: 'min(92%, 920px)', transform: 'none' }}>
          {question.prompt.split('\n\n').slice(-1)[0]}
        </GameQuestionCard>

        <div
          className={`zombies-playfield relative mx-4 flex-1 overflow-hidden rounded-3xl border-4 border-blue-400/30 shadow-2xl ${useSharedTopHud ? 'mt-2' : 'mt-4'}`}
        >
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_85%,rgba(56,189,248,0.06),transparent_48%)]" />
          <div className="zombies-player absolute flex flex-col items-center">
            <div className="text-[11px] font-black uppercase tracking-[0.18em] text-cyan-100">You</div>
            {avatarImage ? (
              <img
                src={avatarImage}
                alt=""
                className="zombies-player-avatar w-auto object-contain drop-shadow-[0_10px_20px_rgba(2,6,23,0.45)]"
                draggable={false}
              />
            ) : null}
          </div>

          <AnimatePresence>
            {zombies.map((zombie) => {
              return (
                <motion.div
                  key={zombie.id}
                  initial={{ opacity: 1 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.2 }}
                  exit={{ opacity: 1 }}
                  className="absolute flex flex-col items-center gap-1"
                  style={{
                    top: `min(${zombie.y}%, calc(100% - ${ZOMBIE_SIZE} - 12px))`,
                    left: `min(${zombie.x}%, calc(100% - ${ZOMBIE_SIZE}))`,
                    width: ZOMBIE_SIZE,
                  }}
                >
                  <MonsterMindActor src={zombieEnemy} alt="Cartoon zombie minion" reaction={zombie.state === 'die' ? 'defeated' : zombie.state === 'attack' ? 'taunt' : zombie.state === 'hit' ? 'hit' : 'idle'} reactionKey={`${zombie.id}-${zombie.state}`} style={{ width: ZOMBIE_SIZE, height: ZOMBIE_SIZE }} />
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

        <div className="zombies-answer-board licensed-board-frame mx-4 mt-1 rounded-[1.35rem] px-4 py-3">
          <div
            className={`zombies-feedback min-h-[16px] text-center text-[11px] font-semibold uppercase tracking-[0.14em] text-cyan-100/80 ${feedback ? 'opacity-100' : 'opacity-0'}`}
            aria-hidden={!feedback}
          >
            {feedback || '\u00A0'}
          </div>
          <div className="zombies-answer-label mt-3 text-center text-[0.68rem] font-black uppercase tracking-[0.24em] text-amber-100/90">
            Choose the correct answer
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







