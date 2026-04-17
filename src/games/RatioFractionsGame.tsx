import React, { useEffect, useMemo, useRef, useState } from 'react';
import confetti from 'canvas-confetti';
import { motion, AnimatePresence } from 'motion/react';
import {
  GameUiShell,
  GameQuestionCard,
} from '../components/game-ui/GameUiKit';
import GameScreenLayout from '../components/game-ui/GameScreenLayout';
import { MiniGameShellContractProps } from '../app/gameplaySessionContract';
import { DEFAULT_RACE_DIFFICULTY, RACE_TUNING, RaceDifficulty } from './ratioFractionsRace/constants';
import { getQuestionTier, QuestionTier } from './ratioFractionsRace/questionSelector';
import { RatioFractionQuestion } from './ratioFractionsRace/types';
import ratioBackdrop from '../assets/gokarts/bkgroundratiofractionkarts.png';
import kartBarratt from '../assets/gokarts/8.png';
import kartBran from '../assets/gokarts/9.png';
import kartMochi from '../assets/gokarts/10.png';
import kartVex from '../assets/gokarts/11.png';
import enemyKart from '../assets/gokarts/15.png';
import { buildPraiseMessage, shouldShowPraise } from '../utils/praiseFeedback';
import {
  reshuffleAvoidingRepeat,
  shuffleOptionsWithCorrect,
} from '../utils/questionShuffle';

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
const KART_SCALE = 1.3125;
const PLAYER_KART_SCALE = 1.6875;
const PLAYER_KART_RAISE = '30pt';
const PLAYER_TRACK_LINE_Y = 80.8;
const ENEMY_TRACK_LINE_Y = 88.6;
const FINISH_Y_SHIFT = -200;
const FINISH_X_SHIFT = -100;
const PLAYER_BOB_BASE_SPEED = 5.1;
const PLAYER_BOB_AMPLITUDE = 4.5;
const PLAYER_ROLL_MAX = 5;
const ENEMY_ROLL_MAX = 4;
const ENEMY_VIBRATE_SPEED = 18;
const ENEMY_VIBRATE_X_AMPLITUDE = 1.8;
const ENEMY_VIBRATE_Y_AMPLITUDE = 0.9;
const PLAYER_KARTS: Record<string, string> = {
  barratt: kartBran,
  bran: kartBarratt,
  mochi: kartVex,
  vex: kartMochi,
};

const MIXTURE_LABELS_BY_PART_COUNT: Record<number, string[]> = {
  2: ['Fuel', 'Oxygen'],
  3: ['Fuel', 'Oxygen', 'Magic Dust'],
  4: ['Fuel', 'Oxygen', 'Magic Dust', 'Spark Dust'],
};

const joinLabelList = (labels: string[]) => {
  const lowered = labels.map((label) => label.toLowerCase());
  if (lowered.length <= 1) return lowered[0] || '';
  if (lowered.length === 2) return `${lowered[0]} and ${lowered[1]}`;
  return `${lowered.slice(0, -1).join(', ')}, and ${lowered[lowered.length - 1]}`;
};

const themeRatioQuestion = (question: RatioFractionQuestion): RatioFractionQuestion => {
  const labels = MIXTURE_LABELS_BY_PART_COUNT[question.ratio.length]
    || question.labels.map((_, index) => `Resource ${index + 1}`);
  const targetIndex = Math.max(0, question.labels.indexOf(question.target));
  const targetLabel = labels[targetIndex] || labels[0] || question.target;
  const totalParts = question.ratio.reduce((sum, value) => sum + value, 0);
  const ratioText = question.ratio.join(':');

  return {
    ...question,
    labels,
    target: targetLabel,
    prompt: `Sneaky Monster Minds mixed ${joinLabelList(labels)} in a ${ratioText} ratio. What fraction of the whole is ${targetLabel.toLowerCase()}?`,
    explanation: `Total parts = ${totalParts}. ${targetLabel} is ${question.ratio[targetIndex]} parts -> ${question.correctAnswer}.`,
  };
};

const RAW_RATIO_FRACTIONS_QUESTIONS: RatioFractionQuestion[] = [
  // ---------------- EASY ----------------
  { id: 'rf-001', prompt: 'Element ratio 1:2. Which fraction is Element B?', ratio: [1, 2], labels: ['Element A', 'Element B'], target: 'Element B', correctAnswer: '2/3', options: ['1/3', '2/3', '1/2', '2/1'], explanation: 'Total parts = 3. Element B is 2 parts -> 2/3.' },
  { id: 'rf-002', prompt: 'Element ratio 2:1. Which fraction is Element A?', ratio: [2, 1], labels: ['Element A', 'Element B'], target: 'Element A', correctAnswer: '2/3', options: ['1/3', '2/3', '2/1', '3/2'], explanation: 'Total parts = 3. Element A is 2 parts -> 2/3.' },
  { id: 'rf-003', prompt: 'Element ratio 1:3. Which fraction is Element B?', ratio: [1, 3], labels: ['Element A', 'Element B'], target: 'Element B', correctAnswer: '3/4', options: ['1/4', '3/4', '1/3', '4/3'], explanation: 'Total = 4. Element B = 3 -> 3/4.' },
  { id: 'rf-004', prompt: 'Element ratio 3:1. Which fraction is Element B?', ratio: [3, 1], labels: ['Element A', 'Element B'], target: 'Element B', correctAnswer: '1/4', options: ['1/4', '3/4', '1/3', '4/1'], explanation: 'Total = 4. Element B = 1 -> 1/4.' },
  { id: 'rf-005', prompt: 'Element ratio 2:2. Which fraction is Element A?', ratio: [2, 2], labels: ['Element A', 'Element B'], target: 'Element A', correctAnswer: '2/4', options: ['1/2', '2/4', '2/2', '4/2'], explanation: 'Total = 4. Element A = 2 -> 2/4.' },
  { id: 'rf-006', prompt: 'Element ratio 4:1. Which fraction is Element B?', ratio: [4, 1], labels: ['Element A', 'Element B'], target: 'Element B', correctAnswer: '1/5', options: ['1/5', '4/5', '1/4', '5/1'], explanation: 'Total = 5. Element B = 1 -> 1/5.' },
  { id: 'rf-007', prompt: 'Element ratio 3:2. Which fraction is Element B?', ratio: [3, 2], labels: ['Element A', 'Element B'], target: 'Element B', correctAnswer: '2/5', options: ['3/5', '2/5', '2/3', '5/2'], explanation: 'Total = 5. Element B = 2 -> 2/5.' },
  { id: 'rf-008', prompt: 'Element ratio 5:1. Which fraction is Element A?', ratio: [5, 1], labels: ['Element A', 'Element B'], target: 'Element A', correctAnswer: '5/6', options: ['1/6', '5/6', '5/1', '6/5'], explanation: 'Total = 6. Element A = 5 -> 5/6.' },
  { id: 'rf-009', prompt: 'Element ratio 1:5. Which fraction is Element B?', ratio: [1, 5], labels: ['Element A', 'Element B'], target: 'Element B', correctAnswer: '5/6', options: ['1/6', '5/6', '1/5', '6/5'], explanation: 'Total = 6. Element B = 5 -> 5/6.' },
  { id: 'rf-010', prompt: 'Element ratio 2:3. Which fraction is Element A?', ratio: [2, 3], labels: ['Element A', 'Element B'], target: 'Element A', correctAnswer: '2/5', options: ['3/5', '2/5', '2/3', '5/2'], explanation: 'Total = 5. Element A = 2 -> 2/5.' },
  // ---------------- MEDIUM ----------------
  { id: 'rf-016', prompt: 'Element ratio 4:3. Which fraction is Element B?', ratio: [4, 3], labels: ['Element A', 'Element B'], target: 'Element B', correctAnswer: '3/7', options: ['4/7', '3/7', '3/4', '7/3'], explanation: 'Total = 7. Element B = 3 -> 3/7.' },
  { id: 'rf-017', prompt: 'Element ratio 5:2. Which fraction is Element A?', ratio: [5, 2], labels: ['Element A', 'Element B'], target: 'Element A', correctAnswer: '5/7', options: ['2/7', '5/7', '5/2', '7/5'], explanation: 'Total = 7. Element A = 5 -> 5/7.' },
  { id: 'rf-018', prompt: 'Element ratio 6:3. Which fraction is Element B?', ratio: [6, 3], labels: ['Element A', 'Element B'], target: 'Element B', correctAnswer: '3/9', options: ['6/9', '3/9', '1/3', '3/6'], explanation: 'Total = 9. Element B = 3 -> 3/9.' },
  { id: 'rf-019', prompt: 'Element ratio 7:3. Which fraction is Element B?', ratio: [7, 3], labels: ['Element A', 'Element B'], target: 'Element B', correctAnswer: '3/10', options: ['7/10', '3/10', '3/7', '10/3'], explanation: 'Total = 10. Element B = 3 -> 3/10.' },
  { id: 'rf-020', prompt: 'Element ratio 8:2. Which fraction is Element A?', ratio: [8, 2], labels: ['Element A', 'Element B'], target: 'Element A', correctAnswer: '8/10', options: ['2/10', '8/10', '4/5', '10/8'], explanation: 'Total = 10. Element A = 8 -> 8/10.' },
  // ---------------- MID (3-PART RATIOS) ----------------
  {
    id: 'rf-036',
    prompt: 'Element ratio 2:3:1. Which fraction is Element B?',
    ratio: [2, 3, 1],
    labels: ['Element A', 'Element B', 'Element C'],
    target: 'Element B',
    correctAnswer: '3/6',
    options: ['2/6', '3/6', '1/6', '3/5'],
    explanation: 'Total parts = 6. Element B = 3 -> 3/6.',
  },
  {
    id: 'rf-037',
    prompt: 'Element ratio 4:2:2. Which fraction is Element A?',
    ratio: [4, 2, 2],
    labels: ['Element A', 'Element B', 'Element C'],
    target: 'Element A',
    correctAnswer: '4/8',
    options: ['2/8', '4/8', '1/2', '4/6'],
    explanation: 'Total = 8. Element A = 4 -> 4/8.',
  },
  {
    id: 'rf-038',
    prompt: 'Element ratio 3:3:3. Which fraction is Element B?',
    ratio: [3, 3, 3],
    labels: ['Element A', 'Element B', 'Element C'],
    target: 'Element B',
    correctAnswer: '3/9',
    options: ['3/9', '1/3', '3/3', '9/3'],
    explanation: 'Total = 9. Element B = 3 -> 3/9.',
  },
  // ---------------- HARD (4-PART RATIOS) ----------------
  {
    id: 'rf-039',
    prompt: 'Element ratio 2:1:3:4. Which fraction is Element D?',
    ratio: [2, 1, 3, 4],
    labels: ['Element A', 'Element B', 'Element C', 'Element D'],
    target: 'Element D',
    correctAnswer: '4/10',
    options: ['1/10', '4/10', '2/5', '5/4'],
    explanation: 'Total = 10. Element D = 4 -> 4/10.',
  },
  {
    id: 'rf-040',
    prompt: 'Element ratio 3:2:1:4. Which fraction is Element C?',
    ratio: [3, 2, 1, 4],
    labels: ['Element A', 'Element B', 'Element C', 'Element D'],
    target: 'Element C',
    correctAnswer: '1/10',
    options: ['1/10', '1/4', '3/10', '4/10'],
    explanation: 'Total = 10. Element C = 1 -> 1/10.',
  },
  {
    id: 'rf-041',
    prompt: 'Element ratio 5:1:2:2. Which fraction is Element A?',
    ratio: [5, 1, 2, 2],
    labels: ['Element A', 'Element B', 'Element C', 'Element D'],
    target: 'Element A',
    correctAnswer: '5/10',
    options: ['1/10', '5/10', '1/2', '10/5'],
    explanation: 'Total = 10. Element A = 5 -> 5/10.',
  },
  {
    id: 'rf-042',
    prompt: 'Element ratio 1:4:2:3. Which fraction is Element B?',
    ratio: [1, 4, 2, 3],
    labels: ['Element A', 'Element B', 'Element C', 'Element D'],
    target: 'Element B',
    correctAnswer: '4/10',
    options: ['1/10', '4/10', '2/10', '3/10'],
    explanation: 'Total = 10. Element B = 4 -> 4/10.',
  },
];

export const ratioFractionsQuestions = RAW_RATIO_FRACTIONS_QUESTIONS.map(themeRatioQuestion);

const buildTierPools = (questions: RatioFractionQuestion[]) => {
  const early = questions.filter((q) => q.ratio.length === 2 && (q.ratio[0] + q.ratio[1]) <= 6);
  const mid = questions.filter((q) => q.ratio.length === 3);
  const final = questions.filter((q) => q.ratio.length >= 4);
  return { early, mid, final };
};

const TIER_POOLS = buildTierPools(ratioFractionsQuestions);
const FALLBACK_POOL = ratioFractionsQuestions;

const buildTierDeck = (pool: RatioFractionQuestion[], previousLast: RatioFractionQuestion | null) => (
  reshuffleAvoidingRepeat(pool.length ? pool : FALLBACK_POOL, previousLast, (question) => question.id).map((question) => ({
    ...question,
    options: shuffleOptionsWithCorrect(question.options, question.correctAnswer).options,
  }))
);

const buildTierDecks = (previousLasts: Partial<Record<QuestionTier, RatioFractionQuestion | null>> = {}) => ({
  early: buildTierDeck(TIER_POOLS.early, previousLasts.early ?? null),
  mid: buildTierDeck(TIER_POOLS.mid, previousLasts.mid ?? null),
  final: buildTierDeck(TIER_POOLS.final, previousLasts.final ?? null),
});

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
  const initialDecks = useMemo(() => buildTierDecks(), []);
  const [tierDecks, setTierDecks] = useState(initialDecks);
  const tierDecksRef = useRef(initialDecks);
  const tierIndexRef = useRef<Record<QuestionTier, number>>({ early: 0, mid: 0, final: 0 });
  const [question, setQuestion] = useState<RatioFractionQuestion>(() => {
    const deck = initialDecks.early;
    tierIndexRef.current.early = deck.length ? 1 : 0;
    return deck[0] ?? ratioFractionsQuestions[0];
  });
  const questionStartRef = useRef<number>(Date.now());

  const raceDifficulty: RaceDifficulty = levelId <= 3 ? 'easy' : levelId <= 6 ? 'standard' : 'hard';
  const tuning = RACE_TUNING[raceDifficulty] || RACE_TUNING[DEFAULT_RACE_DIFFICULTY];

  const raceViewportRef = useRef<HTMLDivElement | null>(null);
  const playerPosRef = useRef(START_OFFSET);
  const enemyPosRef = useRef(START_OFFSET);
  const playerTargetRef = useRef(START_OFFSET);
  const enemyTargetRef = useRef(START_OFFSET);
  const enemyMoveTimerRef = useRef<number | null>(null);
  const reportedResultRef = useRef(false);
  const raceStateRef = useRef(raceState);
  const playerBobPhaseRef = useRef(0);
  const enemyVibratePhaseRef = useRef(0);

  const lives = sessionState?.lives ?? 3;
  const playerKart = PLAYER_KARTS[avatarId] || kartBarratt;

  useEffect(() => {
    raceStateRef.current = raceState;
  }, [raceState]);

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
    tierDecksRef.current = tierDecks;
  }, [tierDecks]);

  useEffect(() => {
    const resetDecks = buildTierDecks();
    setTierDecks(resetDecks);
    tierDecksRef.current = resetDecks;
    tierIndexRef.current = { early: 0, mid: 0, final: 0 };
    const deck = resetDecks.early;
    tierIndexRef.current.early = deck.length ? 1 : 0;
    setQuestion(deck[0] ?? ratioFractionsQuestions[0]);
    questionStartRef.current = Date.now();
    playerPosRef.current = START_OFFSET;
    enemyPosRef.current = START_OFFSET;
    playerTargetRef.current = START_OFFSET;
    enemyTargetRef.current = START_OFFSET;
    playerBobPhaseRef.current = 0;
    enemyVibratePhaseRef.current = 0;
  }, [levelId]);

  useEffect(() => {
    let frameId: number;
    let lastTime: number | null = null;
    const tick = (timestamp: number) => {
      const last = lastTime ?? timestamp;
      const dt = Math.min(0.12, Math.max(0, (timestamp - last) / 1000));
      lastTime = timestamp;

      const currentRaceState = raceStateRef.current;
      const playerX = playerPosRef.current;
      const enemyX = enemyPosRef.current;
      const playerTarget = playerTargetRef.current;
      const enemyTarget = enemyTargetRef.current;

      playerPosRef.current = playerX + (playerTarget - playerX) * RACER_LERP;
      enemyPosRef.current = enemyX + (enemyTarget - enemyX) * RACER_LERP;
      playerBobPhaseRef.current += dt * (PLAYER_BOB_BASE_SPEED + Math.abs(playerTarget - playerX) * 0.14);
      enemyVibratePhaseRef.current += dt * ENEMY_VIBRATE_SPEED;

      setRenderTick((prev) => prev + 1);
      frameId = requestAnimationFrame(tick);
    };

    frameId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frameId);
  }, [tuning.trackLength, viewport.width]);

  useEffect(() => {
    if (enemyMoveTimerRef.current !== null) {
      window.clearInterval(enemyMoveTimerRef.current);
      enemyMoveTimerRef.current = null;
    }

    if (raceState !== 'showingQuestion') {
      return undefined;
    }

    const tickEnemy = () => {
      enemyTargetRef.current = Math.min(
        tuning.trackLength,
        enemyTargetRef.current + tuning.enemyAdvanceDistance,
      );
      if (enemyTargetRef.current >= tuning.trackLength && raceStateRef.current !== 'enemyWin') {
        setRaceState('enemyWin');
      }
    };

    enemyMoveTimerRef.current = window.setInterval(tickEnemy, tuning.enemyMoveIntervalMs);
    return () => {
      if (enemyMoveTimerRef.current !== null) {
        window.clearInterval(enemyMoveTimerRef.current);
        enemyMoveTimerRef.current = null;
      }
    };
  }, [raceState, tuning.enemyAdvanceDistance, tuning.enemyMoveIntervalMs, tuning.trackLength]);

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

  const advanceQuestionForTier = (tier: QuestionTier) => {
    const decks = tierDecksRef.current;
    const deck = decks[tier];
    if (!deck.length) return ratioFractionsQuestions[0];
    const index = tierIndexRef.current[tier];
    const nextQuestion = deck[index % deck.length];
    const nextIndex = index + 1;
    if (nextIndex % deck.length === 0) {
      const previousLast = deck[deck.length - 1] ?? null;
      const nextDeck = buildTierDeck(TIER_POOLS[tier], previousLast);
      const nextDecks = { ...decks, [tier]: nextDeck };
      setTierDecks(nextDecks);
      tierDecksRef.current = nextDecks;
      tierIndexRef.current[tier] = 0;
    } else {
      tierIndexRef.current[tier] = nextIndex;
    }
    return nextQuestion;
  };

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
      const elapsedMs = Date.now() - questionStartRef.current;
      const isPraise = shouldShowPraise(1, elapsedMs);
      setFeedback(isPraise ? buildPraiseMessage() : 'Correct!');
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

        const nextTier = getQuestionTier(Math.min(1, playerPosRef.current / tuning.trackLength));
        setQuestion(advanceQuestionForTier(nextTier));
        questionStartRef.current = Date.now();
        setSelected(null);
        setLocked(false);
        setRoundIndex((prev) => prev + 1);
        setFeedback('');
        setRaceState('showingQuestion');
      }, moveDuration);
      return;
    }

    setFeedback('Wrong.');
    setRaceState('incorrectStall');
    if (stumble > 0) {
      playerTargetRef.current = Math.min(tuning.trackLength, playerTargetRef.current + stumble);
    }
    window.setTimeout(() => {
      const nextTier = getQuestionTier(Math.min(1, playerPosRef.current / tuning.trackLength));
      setQuestion(advanceQuestionForTier(nextTier));
      questionStartRef.current = Date.now();
      setSelected(null);
      setLocked(false);
      setRoundIndex((prev) => prev + 1);
      setFeedback('');
      setRaceState('showingQuestion');
    }, tuning.incorrectFeedbackMs);
  };

  const trackSpan = Math.max(1, tuning.trackLength);
  const cameraWorldPosition = playerPosRef.current;
  const playerLeft = 50;
  const enemyLeft = 50 + ((enemyPosRef.current - cameraWorldPosition) / trackSpan) * 100;
  const finishLeft = 50 + ((tuning.trackLength - cameraWorldPosition) / trackSpan) * 100;
  const showBoost = raceState === 'correctBoost';
  const showStall = raceState === 'incorrectStall';
  const playerLineY = PLAYER_TRACK_LINE_Y;
  const enemyLineY = ENEMY_TRACK_LINE_Y;
  const finishLineY = clamp(
    playerLineY + (FINISH_Y_SHIFT / Math.max(1, viewport.height)) * 100,
    0,
    100,
  );
  const backgroundPositionX = Math.round(clamp(18 + ((playerPosRef.current / trackSpan) * 64), 18, 82));
  const playerBobOffset = Math.sin(playerBobPhaseRef.current) * PLAYER_BOB_AMPLITUDE;
  const playerLean = clamp((playerTargetRef.current - playerPosRef.current) * 0.9, -PLAYER_ROLL_MAX, PLAYER_ROLL_MAX);
  const enemyLean = clamp((enemyTargetRef.current - enemyPosRef.current) * 0.85, -ENEMY_ROLL_MAX, ENEMY_ROLL_MAX);
  const enemyVibrateOffsetX =
    (Math.sin(enemyVibratePhaseRef.current * 1.2) * ENEMY_VIBRATE_X_AMPLITUDE) +
    (Math.sin(enemyVibratePhaseRef.current * 2.3 + 0.7) * 0.7);
  const enemyVibrateOffsetY =
    (Math.cos(enemyVibratePhaseRef.current * 1.6 + 0.4) * ENEMY_VIBRATE_Y_AMPLITUDE) +
    (Math.sin(enemyVibratePhaseRef.current * 3.1) * 0.35);

  const playerStyle = {
    transform: `translate3d(-50%, calc(-100% + ${playerBobOffset}px - ${PLAYER_KART_RAISE}), 0) rotate(${playerLean}deg) scale(${PLAYER_KART_SCALE})`,
    transformOrigin: '50% 100%',
    top: `${playerLineY}%`,
    left: `${playerLeft}%`,
  };

  const enemyStyle = {
    transform: `translate3d(calc(-50% + ${enemyVibrateOffsetX}px), calc(-100% + ${enemyVibrateOffsetY}px), 0) rotate(${enemyLean}deg) scale(${KART_SCALE})`,
    transformOrigin: '50% 100%',
    top: `${enemyLineY}%`,
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
          }}
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 select-none bg-cover bg-center bg-no-repeat"
          style={{
            backgroundImage: `url(${ratioBackdrop})`,
            backgroundPosition: `${backgroundPositionX}% center`,
          }}
        />

        <div ref={raceViewportRef} className="pointer-events-none absolute inset-0 z-[5]">
          <div className="relative h-full w-full">
            <div
              className="absolute z-30 flex items-center gap-2 overflow-visible rounded-full border border-amber-100 bg-[linear-gradient(180deg,rgba(255,243,179,0.98),rgba(251,191,36,0.98))] px-5 py-2 text-[11px] font-black uppercase tracking-[0.12em] text-slate-900 shadow-[0_0_0_1px_rgba(255,255,255,0.2),0_0_22px_rgba(253,224,71,0.85),0_0_42px_rgba(245,158,11,0.45)]"
              style={finishStyle}
            >
              <span>Finish</span>
              <span className="text-sm leading-none">→</span>
            </div>

            <motion.div
              className="absolute z-40 flex h-28 w-48 items-end justify-center overflow-visible sm:h-32 sm:w-56 md:h-40 md:w-64"
              style={playerStyle}
              animate={showBoost ? { scale: [1, 1.08, 1] } : showStall ? { x: [0, -4, 4, -3, 3, 0] } : { scale: 1 }}
              transition={{ duration: 0.35 }}
            >
              <div className="absolute bottom-0 left-1/2 h-[36%] w-[74%] -translate-x-1/2 rounded-[1.15rem] border border-sky-100/40 bg-[linear-gradient(180deg,rgba(248,250,252,0.1),rgba(15,23,42,0.7))] shadow-[0_10px_20px_rgba(2,6,23,0.42)]" />
              <span className="absolute bottom-[4%] left-[18%] h-4 w-4 rounded-full border border-slate-200/65 bg-slate-950 shadow-[0_0_0_2px_rgba(14,165,233,0.22)]" />
              <span className="absolute bottom-[4%] right-[18%] h-4 w-4 rounded-full border border-slate-200/65 bg-slate-950 shadow-[0_0_0_2px_rgba(14,165,233,0.22)]" />
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
              <img
                src={playerKart}
                alt="Player kart"
                className="relative z-10 h-[95%] w-[95%] object-contain drop-shadow-[0_0_18px_rgba(56,189,248,0.65)]"
                style={{ imageRendering: 'auto' }}
              />
              {showStall ? (
                <span className="absolute -left-2 top-1/2 h-2.5 w-2.5 -translate-y-1/2 rounded-full bg-slate-400/80" />
              ) : null}
            </motion.div>

            <motion.div
              className="absolute z-30 flex h-22 w-34 items-center justify-center overflow-visible sm:h-26 sm:w-40 md:h-28 md:w-44"
              style={enemyStyle}
            >
              <img
                src={enemyKart}
                alt="Enemy kart"
                className="h-full w-full object-contain drop-shadow-[0_0_12px_rgba(251,113,133,0.45)]"
                style={{ imageRendering: 'auto' }}
              />
            </motion.div>

            {raceState === 'introCountdown' ? (
              <div className="absolute inset-0 flex items-center justify-center bg-slate-950/60 text-5xl font-black text-amber-100">
                {countdown || 'Go!'}
              </div>
            ) : null}

            <AnimatePresence>
              {raceState === 'playerWin' ? (
                <motion.div
                  key="winner"
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  className="absolute inset-0 z-40 flex items-center justify-center bg-slate-950/55"
                >
                  <div className="rounded-full border border-emerald-200/60 bg-emerald-400/25 px-6 py-3 text-2xl font-black uppercase tracking-[0.2em] text-emerald-100 shadow-[0_12px_24px_rgba(16,185,129,0.35)]">
                    Winner!
                  </div>
                </motion.div>
              ) : null}
              {raceState === 'enemyWin' ? (
                <motion.div
                  key="loser"
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  className="absolute inset-0 z-40 flex items-center justify-center bg-slate-950/55"
                >
                  <div className="rounded-full border border-rose-200/60 bg-rose-400/25 px-6 py-3 text-2xl font-black uppercase tracking-[0.2em] text-rose-100 shadow-[0_12px_24px_rgba(244,63,94,0.35)]">
                    You Lose
                  </div>
                </motion.div>
              ) : null}
            </AnimatePresence>
          </div>
        </div>

        <div className="pointer-events-none fixed left-0 right-0 z-[60]" style={{ top: '4px' }}>
          <GameQuestionCard
            title="Ratio Racer"
            className="mx-auto w-full max-w-[56rem] px-2 sm:px-3 md:px-4"
            style={{
              ['--question-card-width' as any]: 'min(100%, 56rem)',
              ['--question-card-padding' as any]: '16px 18px',
            }}
            subtitle={feedback ? (
              <div className={`text-[11px] font-semibold md:text-[13px] ${
                ['Great!', 'Amazing!', 'Awesome!', 'Fantastic!'].includes(feedback)
                  ? 'rounded-full border border-amber-100/70 bg-[linear-gradient(135deg,rgba(255,241,166,0.96),rgba(125,211,252,0.9))] px-3 py-1 text-slate-950 shadow-[0_0_22px_rgba(251,191,36,0.55)]'
                  : 'text-amber-100'
              }`}>{feedback}</div>
            ) : null}
            titleClassName="text-[12px] md:text-[14px] tracking-[0.28em]"
            bodyClassName="text-[clamp(1.15rem,4vw,1.7rem)] font-black leading-[1.08] tracking-tight md:text-[clamp(1.3rem,2.4vw,2rem)]"
          >
            {question.prompt}
          </GameQuestionCard>
        </div>

        <GameScreenLayout
          className="relative z-10 px-3 pb-[calc(env(safe-area-inset-bottom)+0.7rem)] pt-0 text-white"
          main={<div className="min-h-0 flex-1" />}
          bottom={(
            <div className="answer-choice-surface grid grid-cols-4 gap-2">
              {question.options.map((option) => (
                <motion.button
                  key={option}
                  whileTap={{ scale: 0.96 }}
                  onClick={() => handleAnswer(option)}
                  disabled={locked || raceState !== 'showingQuestion'}
                  className={`min-h-[3.1rem] rounded-[1rem] px-2 py-2 text-center text-base font-black ${
                    selected === option
                      ? option === question.correctAnswer
                        ? 'ui-button-success'
                        : 'ui-button-primary'
                      : 'ui-button-secondary'
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



