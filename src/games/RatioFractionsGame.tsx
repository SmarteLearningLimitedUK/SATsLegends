import React, { useEffect, useMemo, useRef, useState } from 'react';
import confetti from 'canvas-confetti';
import { motion } from 'motion/react';
import {
  GameUiShell,
} from '../components/game-ui/GameUiKit';
import GameScreenLayout from '../components/game-ui/GameScreenLayout';
import { MiniGameShellContractProps } from '../app/gameplaySessionContract';
import { DEFAULT_RACE_DIFFICULTY, RACE_TUNING, RaceDifficulty } from './ratioFractionsRace/constants';
import { getQuestionTier, pickQuestionForTier } from './ratioFractionsRace/questionSelector';
import { RatioFractionQuestion } from './ratioFractionsRace/types';
import ratioBackdrop from '../assets/gokarts/bkgroundmapratiofrac.png';
import kartBarratt from '../assets/gokarts/8.png';
import kartBran from '../assets/gokarts/9.png';
import kartMochi from '../assets/gokarts/10.png';
import kartVex from '../assets/gokarts/11.png';
import enemyKart from '../assets/gokarts/15.png';

interface RatioFractionsGameProps extends MiniGameShellContractProps {
  levelId: number;
  avatarId: string;
  onVictory: (stars: number, XP: number) => void;
  onGameOver: (XP: number) => void;
  onBack: () => void;
}

type RaceState =
  | 'introCountdown'
  | 'showingQuestion'
  | 'evaluatingAnswer'
  | 'correctBoost'
  | 'incorrectStall'
  | 'enemyAdvance'
  | 'resolvingTurn'
  | 'nextQuestion'
  | 'playerWin'
  | 'enemyWin';

const START_OFFSET = 0;
const RACER_LERP = 0.16;
const BASE_XP = 160;
const BACKDROP_WIDTH = 4000;
const BACKDROP_HEIGHT = 500;
const BACKDROP_Y_OFFSET = 60;
const TRACK_LINE_FROM_BOTTOM = 177;
const CART_Y_SHIFT = 0;
const FINISH_Y_SHIFT = -200;
const FINISH_X_SHIFT = -100;

const PLAYER_KARTS: Record<string, string> = {
  barratt: kartBarratt,
  bran: kartBran,
  mochi: kartMochi,
  vex: kartVex,
};

const shuffle = <T,>(items: T[]) => {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
};

export const ratioFractionsQuestions: RatioFractionQuestion[] = [
  // ---------------- EASY ----------------
  { id: 'rf-001', prompt: 'Fuel to oxygen is 1:2. What fraction is oxygen?', ratio: [1, 2], labels: ['Fuel', 'Oxygen'], target: 'Oxygen', correctAnswer: '2/3', options: ['1/3', '2/3', '1/2', '2/1'], explanation: 'Total parts = 3. Oxygen is 2 parts -> 2/3.' },
  { id: 'rf-002', prompt: 'Fuel to oxygen is 2:1. What fraction is fuel?', ratio: [2, 1], labels: ['Fuel', 'Oxygen'], target: 'Fuel', correctAnswer: '2/3', options: ['1/3', '2/3', '2/1', '3/2'], explanation: 'Total parts = 3. Fuel is 2 parts -> 2/3.' },
  { id: 'rf-003', prompt: 'Fuel to oxygen is 1:3. What fraction is oxygen?', ratio: [1, 3], labels: ['Fuel', 'Oxygen'], target: 'Oxygen', correctAnswer: '3/4', options: ['1/4', '3/4', '1/3', '4/3'], explanation: 'Total = 4. Oxygen = 3 -> 3/4.' },
  { id: 'rf-004', prompt: 'Fuel to oxygen is 3:1. What fraction is oxygen?', ratio: [3, 1], labels: ['Fuel', 'Oxygen'], target: 'Oxygen', correctAnswer: '1/4', options: ['1/4', '3/4', '1/3', '4/1'], explanation: 'Total = 4. Oxygen = 1 -> 1/4.' },
  { id: 'rf-005', prompt: 'Fuel to oxygen is 2:2. What fraction is fuel?', ratio: [2, 2], labels: ['Fuel', 'Oxygen'], target: 'Fuel', correctAnswer: '2/4', options: ['1/2', '2/4', '2/2', '4/2'], explanation: 'Total = 4. Fuel = 2 -> 2/4.' },
  { id: 'rf-006', prompt: 'Fuel to oxygen is 4:1. What fraction is oxygen?', ratio: [4, 1], labels: ['Fuel', 'Oxygen'], target: 'Oxygen', correctAnswer: '1/5', options: ['1/5', '4/5', '1/4', '5/1'], explanation: 'Total = 5. Oxygen = 1 -> 1/5.' },
  { id: 'rf-007', prompt: 'Fuel to oxygen is 3:2. What fraction is oxygen?', ratio: [3, 2], labels: ['Fuel', 'Oxygen'], target: 'Oxygen', correctAnswer: '2/5', options: ['3/5', '2/5', '2/3', '5/2'], explanation: 'Total = 5. Oxygen = 2 -> 2/5.' },
  { id: 'rf-008', prompt: 'Fuel to oxygen is 5:1. What fraction is fuel?', ratio: [5, 1], labels: ['Fuel', 'Oxygen'], target: 'Fuel', correctAnswer: '5/6', options: ['1/6', '5/6', '5/1', '6/5'], explanation: 'Total = 6. Fuel = 5 -> 5/6.' },
  { id: 'rf-009', prompt: 'Fuel to oxygen is 1:5. What fraction is oxygen?', ratio: [1, 5], labels: ['Fuel', 'Oxygen'], target: 'Oxygen', correctAnswer: '5/6', options: ['1/6', '5/6', '1/5', '6/5'], explanation: 'Total = 6. Oxygen = 5 -> 5/6.' },
  { id: 'rf-010', prompt: 'Fuel to oxygen is 2:3. What fraction is fuel?', ratio: [2, 3], labels: ['Fuel', 'Oxygen'], target: 'Fuel', correctAnswer: '2/5', options: ['3/5', '2/5', '2/3', '5/2'], explanation: 'Total = 5. Fuel = 2 -> 2/5.' },
  // ---------------- MEDIUM ----------------
  { id: 'rf-016', prompt: 'Fuel to oxygen is 4:3. What fraction is oxygen?', ratio: [4, 3], labels: ['Fuel', 'Oxygen'], target: 'Oxygen', correctAnswer: '3/7', options: ['4/7', '3/7', '3/4', '7/3'], explanation: 'Total = 7. Oxygen = 3 -> 3/7.' },
  { id: 'rf-017', prompt: 'Fuel to oxygen is 5:2. What fraction is fuel?', ratio: [5, 2], labels: ['Fuel', 'Oxygen'], target: 'Fuel', correctAnswer: '5/7', options: ['2/7', '5/7', '5/2', '7/5'], explanation: 'Total = 7. Fuel = 5 -> 5/7.' },
  { id: 'rf-018', prompt: 'Fuel to oxygen is 6:3. What fraction is oxygen?', ratio: [6, 3], labels: ['Fuel', 'Oxygen'], target: 'Oxygen', correctAnswer: '3/9', options: ['6/9', '3/9', '1/3', '3/6'], explanation: 'Total = 9. Oxygen = 3 -> 3/9.' },
  { id: 'rf-019', prompt: 'Fuel to oxygen is 7:3. What fraction is oxygen?', ratio: [7, 3], labels: ['Fuel', 'Oxygen'], target: 'Oxygen', correctAnswer: '3/10', options: ['7/10', '3/10', '3/7', '10/3'], explanation: 'Total = 10. Oxygen = 3 -> 3/10.' },
  { id: 'rf-020', prompt: 'Fuel to oxygen is 8:2. What fraction is fuel?', ratio: [8, 2], labels: ['Fuel', 'Oxygen'], target: 'Fuel', correctAnswer: '8/10', options: ['2/10', '8/10', '4/5', '10/8'], explanation: 'Total = 10. Fuel = 8 -> 8/10.' },
  // ---------------- HARD (3-PART RATIOS) ----------------
  {
    id: 'rf-036',
    prompt: 'Fuel, oxygen, and additive are in the ratio 2:3:1. What fraction is oxygen?',
    ratio: [2, 3, 1],
    labels: ['Fuel', 'Oxygen', 'Additive'],
    target: 'Oxygen',
    correctAnswer: '3/6',
    options: ['2/6', '3/6', '1/6', '3/5'],
    explanation: 'Total parts = 6. Oxygen = 3 -> 3/6.',
  },
  {
    id: 'rf-037',
    prompt: 'Fuel, oxygen, and additive are in the ratio 4:2:2. What fraction is fuel?',
    ratio: [4, 2, 2],
    labels: ['Fuel', 'Oxygen', 'Additive'],
    target: 'Fuel',
    correctAnswer: '4/8',
    options: ['2/8', '4/8', '1/2', '4/6'],
    explanation: 'Total = 8. Fuel = 4 -> 4/8.',
  },
  {
    id: 'rf-038',
    prompt: 'Fuel, oxygen, and additive are in the ratio 3:3:3. What fraction is oxygen?',
    ratio: [3, 3, 3],
    labels: ['Fuel', 'Oxygen', 'Additive'],
    target: 'Oxygen',
    correctAnswer: '3/9',
    options: ['3/9', '1/3', '3/3', '9/3'],
    explanation: 'Total = 9. Oxygen = 3 -> 3/9.',
  },
];

const starsForAccuracy = (correct: number, attempts: number) => {
  if (attempts === 0) return 0;
  const accuracy = correct / attempts;
  if (accuracy >= 0.9) return 3;
  if (accuracy >= 0.7) return 2;
  return 1;
};

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

const RatioFractionsGame: React.FC<RatioFractionsGameProps> = ({
  levelId,
  avatarId,
  onVictory,
  onGameOver,
  onBack,
  sessionState,
}) => {
  const [roundIndex, setRoundIndex] = useState(0);
  const [attempts, setAttempts] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [feedback, setFeedback] = useState('');
  const [selected, setSelected] = useState<string | null>(null);
  const [locked, setLocked] = useState(false);
  const [raceState, setRaceState] = useState<RaceState>('introCountdown');
  const [countdown, setCountdown] = useState(3);
  const [, setRenderTick] = useState(0);
  const [viewport, setViewport] = useState({ width: 320, height: 480 });

  const raceDifficulty: RaceDifficulty = levelId <= 3 ? 'easy' : levelId <= 6 ? 'standard' : 'hard';
  const tuning = RACE_TUNING[raceDifficulty] || RACE_TUNING[DEFAULT_RACE_DIFFICULTY];

  const raceViewportRef = useRef<HTMLDivElement | null>(null);
  const playerPosRef = useRef(START_OFFSET);
  const enemyPosRef = useRef(START_OFFSET);
  const playerTargetRef = useRef(START_OFFSET);
  const enemyTargetRef = useRef(START_OFFSET);
  const enemyAdvanceQueueRef = useRef(0);
  const reportedResultRef = useRef(false);

  const trackProgress = Math.min(1, playerPosRef.current / tuning.trackLength);
  const difficultyTier = getQuestionTier(trackProgress);
  const question = useMemo(
    () => pickQuestionForTier(ratioFractionsQuestions, difficultyTier, roundIndex),
    [difficultyTier, roundIndex],
  );
  const lives = sessionState?.lives ?? 3;
  const buildExplanation = (q: RatioFractionQuestion) => q.explanation;
  const playerKart = PLAYER_KARTS[avatarId] || kartBarratt;
  

  useEffect(() => {
    if (!raceViewportRef.current || typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(() => {
      const node = raceViewportRef.current;
      if (!node) return;
      setViewport({ width: node.clientWidth, height: node.clientHeight });
    });
    observer.observe(raceViewportRef.current);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    let frameId: number;
    const tick = () => {
      const playerX = playerPosRef.current;
      const enemyX = enemyPosRef.current;
      const playerTarget = playerTargetRef.current;
      const enemyTarget = enemyTargetRef.current;

      playerPosRef.current = playerX + (playerTarget - playerX) * RACER_LERP;
      enemyPosRef.current = enemyX + (enemyTarget - enemyX) * RACER_LERP;

      setRenderTick((prev) => prev + 1);
      frameId = requestAnimationFrame(tick);
    };

    frameId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frameId);
  }, [viewport.width]);

  useEffect(() => {
    const pace = tuning.enemyMoveIntervalMs;
    const enemyStep = tuning.enemyAdvanceDistance;

    const interval = window.setInterval(() => {
      if (raceState === 'enemyWin' || raceState === 'playerWin') return;
      if (raceState !== 'showingQuestion' || locked) {
        enemyAdvanceQueueRef.current += 1;
        return;
      }
      enemyTargetRef.current = Math.min(tuning.trackLength, enemyTargetRef.current + enemyStep);
      if (enemyTargetRef.current >= tuning.trackLength) {
        setRaceState('enemyWin');
      }
    }, pace);

    return () => window.clearInterval(interval);
  }, [locked, raceState, tuning.enemyAdvanceDistance, tuning.enemyMoveIntervalMs, tuning.trackLength]);

  const applyQueuedEnemyAdvance = () => {
    const queued = enemyAdvanceQueueRef.current;
    if (queued <= 0) return false;
    enemyAdvanceQueueRef.current = 0;
    enemyTargetRef.current = Math.min(
      tuning.trackLength,
      enemyTargetRef.current + tuning.enemyAdvanceDistance * queued,
    );
    if (enemyTargetRef.current >= tuning.trackLength) {
      setRaceState('enemyWin');
      return true;
    }
    return false;
  };

  useEffect(() => {
    if (raceState === 'playerWin' && !reportedResultRef.current) {
      reportedResultRef.current = true;
      const xp = BASE_XP + correctCount * 45 + levelId * 30;
      onVictory(starsForAccuracy(correctCount, attempts || 1), xp);
    }

    if ((raceState === 'enemyWin' || (sessionState && lives <= 0)) && !reportedResultRef.current) {
      reportedResultRef.current = true;
      const xp = Math.max(20, BASE_XP * 0.35 + correctCount * 20);
      onGameOver(xp);
    }
  }, [attempts, correctCount, levelId, lives, onGameOver, onVictory, raceState, sessionState]);

  useEffect(() => {
    reportedResultRef.current = false;
  }, [levelId]);

  useEffect(() => {
    if (raceState !== 'introCountdown') return;
    setCountdown(3);
    const interval = window.setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          window.clearInterval(interval);
          setRaceState('showingQuestion');
          return 0;
        }
        return prev - 1;
      });
    }, 650);
    return () => window.clearInterval(interval);
  }, [raceState]);

  const handleAnswer = (option: string) => {
    if (locked || raceState !== 'showingQuestion') return;

    setSelected(option);
    setAttempts((prev) => prev + 1);
    setLocked(true);
    setRaceState('evaluatingAnswer');

    const playerStep = tuning.playerAdvanceDistance;
    const stumble = tuning.playerStumbleDistance;
    const boostDelay = tuning.playerBoostAnticipationMs;
    const moveDuration = tuning.playerMoveDurationMs + boostDelay;

    if (option === question.correctAnswer) {
      setCorrectCount((prev) => prev + 1);
      setFeedback(`Correct mix! ${buildExplanation(question)}`);
      setRaceState('correctBoost');
      window.setTimeout(() => {
        playerTargetRef.current = Math.min(tuning.trackLength, playerTargetRef.current + playerStep);
      }, boostDelay);

      window.setTimeout(() => {
        if (playerTargetRef.current >= tuning.trackLength) {
          setRaceState('playerWin');
          confetti({
            particleCount: 60,
            spread: 55,
            origin: { y: 0.6 },
            colors: ['#facc15', '#38bdf8', '#4ade80'],
          });
          return;
        }

        const enemyWon = applyQueuedEnemyAdvance();
        if (enemyWon) return;

        setSelected(null);
        setLocked(false);
        setRoundIndex((prev) => prev + 1);
        setFeedback('');
        setRaceState('showingQuestion');
      }, moveDuration);
      return;
    }

    setFeedback(`Wrong mix! ${buildExplanation(question)}`);
    setRaceState('incorrectStall');
    if (stumble > 0) {
      playerTargetRef.current = Math.min(tuning.trackLength, playerTargetRef.current + stumble);
    }
    window.setTimeout(() => {
      const enemyWon = applyQueuedEnemyAdvance();
      if (enemyWon) return;

      setSelected(null);
      setLocked(false);
      setRoundIndex((prev) => prev + 1);
      setFeedback('');
      setRaceState('showingQuestion');
    }, tuning.incorrectFeedbackMs);
  };

  const playerLeft = clamp((playerPosRef.current / tuning.trackLength) * 100, 4, 96);
  const enemyLeft = clamp((enemyPosRef.current / tuning.trackLength) * 100, 4, 96);
  const finishLeft = 96;
  const showBoost = raceState === 'correctBoost';
  const showStall = raceState === 'incorrectStall';
  const trackLineY = clamp(
    ((viewport.height - TRACK_LINE_FROM_BOTTOM + CART_Y_SHIFT) / Math.max(1, viewport.height)) * 100,
    0,
    100,
  );
  const finishLineY = clamp(
    trackLineY + (FINISH_Y_SHIFT / Math.max(1, viewport.height)) * 100,
    0,
    100,
  );
  const maxBackdropScroll = Math.max(0, BACKDROP_WIDTH - viewport.width);
  const backgroundOffset = Math.round(clamp(trackProgress * maxBackdropScroll, 0, maxBackdropScroll));

  const playerStyle = {
    transform: 'translate(-50%, -50%) scale(2.2)',
    top: `${trackLineY}%`,
    left: `${playerLeft}%`,
  };

  const enemyStyle = {
    transform: 'translate(-50%, -50%) scale(1.5)',
    top: `${trackLineY}%`,
    left: `${enemyLeft}%`,
  };

  const finishStyle = {
    transform: 'translate(-50%, -50%)',
    top: `${finishLineY}%`,
    left: `calc(${finishLeft}% + ${FINISH_X_SHIFT}px)`,
  };

  return (
    <GameUiShell overlayDisabled className="bg-transparent">
      <div className="relative h-full w-full">
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            backgroundColor: '#0b0f1c',
            backgroundImage: `url(${ratioBackdrop})`,
            backgroundRepeat: 'no-repeat',
            backgroundSize: `${BACKDROP_WIDTH}px ${BACKDROP_HEIGHT}px`,
            backgroundPosition: `${-backgroundOffset}px calc(100% - ${BACKDROP_Y_OFFSET}px)`,
          }}
        />

        <div ref={raceViewportRef} className="pointer-events-none absolute inset-0 z-[5]">
          <div className="relative h-full w-full">
            <div
              className="absolute z-30 flex items-center gap-1 rounded-full border border-amber-200 bg-amber-400 px-3 py-1 text-[10px] font-black uppercase text-slate-900"
              style={finishStyle}
            >
              <span>Finish</span>
              <span className="text-sm leading-none">→</span>
            </div>

            <motion.div
              className="absolute z-30 flex h-24 w-36 items-center justify-center sm:h-28 sm:w-40 md:h-44 md:w-64"
              style={playerStyle}
              animate={showBoost ? { scale: [1, 1.08, 1] } : showStall ? { x: [0, -4, 4, -3, 3, 0] } : { scale: 1 }}
              transition={{ duration: 0.35 }}
            >
              {showBoost ? (
                <motion.span
                  className="absolute -left-10 top-1/2 z-0 h-10 w-16 -translate-y-1/2 rounded-full blur-[0.5px]"
                  style={{
                    background: 'radial-gradient(circle at 75% 50%, rgba(255,255,255,0.6) 0%, rgba(253,224,71,0.9) 35%, rgba(251,146,60,0.95) 62%, rgba(239,68,68,0.2) 100%)',
                  }}
                  animate={{ scaleX: [0.9, 1.15, 0.95], opacity: [0.8, 1, 0.7] }}
                  transition={{ duration: 0.25, repeat: Infinity, repeatType: 'mirror' }}
                />
              ) : null}
              <img src={playerKart} alt="Player kart" className="relative z-10 h-full w-full object-contain drop-shadow-[0_0_18px_rgba(56,189,248,0.65)]" />
              {showStall ? (
                <span className="absolute -left-2 top-1/2 h-2.5 w-2.5 -translate-y-1/2 rounded-full bg-slate-400/80" />
              ) : null}
            </motion.div>

            <motion.div
              className="absolute z-30 flex h-24 w-36 items-center justify-center sm:h-28 sm:w-40 md:h-44 md:w-64"
              style={enemyStyle}
            >
              <img src={enemyKart} alt="Enemy kart" className="h-full w-full object-contain drop-shadow-[0_0_18px_rgba(251,113,133,0.6)]" />
            </motion.div>

            {raceState === 'introCountdown' ? (
              <div className="absolute inset-0 flex items-center justify-center bg-slate-950/60 text-5xl font-black text-amber-100">
                {countdown || 'Go!'}
              </div>
            ) : null}
          </div>
        </div>

        <GameScreenLayout
          className="relative z-10 px-3 pb-[calc(env(safe-area-inset-bottom)+0.7rem)] pt-0 text-white"
          top={(
            <div className="flex flex-col gap-1.5">
              <div className="rounded-[1rem] border border-slate-700 bg-slate-900 px-3 py-2 text-center shadow-[0_12px_24px_rgba(2,6,23,0.25)]">
                <div className="text-[11px] font-black uppercase tracking-[0.18em] text-amber-200">Fuel Mix Question</div>
                <div className="mt-1 text-[clamp(1rem,3.6vw,1.35rem)] font-black text-white">{question.prompt}</div>
                <div className="mt-1 flex flex-wrap items-center justify-center gap-2 text-[11px] font-black uppercase tracking-[0.12em] text-slate-100/90">
                  {question.labels.map((label, index) => (
                    <span key={`${label}-${index}`}>
                      {label} {question.ratio[index]}
                      {index < question.labels.length - 1 ? ' : ' : ''}
                    </span>
                  ))}
                </div>
                {feedback ? (
                  <div className="mt-1 text-[11px] font-semibold text-amber-100">{feedback}</div>
                ) : null}
              </div>
            </div>
          )}
          main={<div className="min-h-0 flex-1" />}
          bottom={(
            <div className="grid grid-cols-4 gap-2">
              {question.options.map((option) => (
                <motion.button
                  key={option}
                  whileTap={{ scale: 0.96 }}
                  onClick={() => handleAnswer(option)}
                  disabled={locked || raceState !== 'showingQuestion'}
                  className={`min-h-[3.1rem] rounded-[1rem] border px-2 py-2 text-center text-base font-black shadow-[0_12px_20px_rgba(2,6,23,0.25)] transition ${
                    selected === option
                      ? option === question.correctAnswer
                        ? 'border-emerald-200 bg-emerald-300 text-emerald-950'
                        : 'border-rose-200 bg-rose-300 text-rose-950'
                      : 'border-amber-200 bg-amber-400 text-slate-900'
                  }`}
                >
                  {option}
                </motion.button>
              ))}
            </div>
          )}
        />
      </div>
    </GameUiShell>
  );
};

export default RatioFractionsGame;



