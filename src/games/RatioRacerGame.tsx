import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import confetti from 'canvas-confetti';
import { motion, AnimatePresence, useIsPresent, useReducedMotion } from 'motion/react';
import { Flag, Zap } from 'lucide-react';
import {
  GameUiShell,
  GameQuestionCard,
} from '../components/game-ui/GameUiKit';
import { emitMiniGameSessionEvent, MiniGameShellContractProps } from '../app/gameplaySessionContract';
import { DEFAULT_RACE_DIFFICULTY, RACE_TUNING, RaceDifficulty } from './ratioFractionsRace/constants';
import { QuestionTier } from './ratioFractionsRace/questionSelector';
import { RatioFractionQuestion } from './ratioFractionsRace/types';
import courseBackground from '../assets/maps/teen/race-course-crowd.webp';
import racingPaddock from '../assets/maps/teen/racing-paddock.webp';
import kartBarratt from '../assets/gokarts/karts/1.png';
import kartBran from '../assets/gokarts/karts/2.png';
import kartMochi from '../assets/gokarts/karts/3.png';
import kartVex from '../assets/gokarts/karts/4.png';
import { buildPraiseMessage, shouldShowPraise } from '../utils/praiseFeedback';
import {
  reshuffleAvoidingRepeat,
  shuffleOptionsWithCorrect,
} from '../utils/questionShuffle';
import './ratioFractionsRace/ratio-racer.css';

interface RatioRacerGameProps extends MiniGameShellContractProps {
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
  | 'resolvingTurn'
  | 'nextQuestion'
  | 'playerWin'
  | 'playerLoss';

const START_OFFSET = 0;
const RACER_LERP = 0.16;
const BASE_XP = 160;
const COURSE_TILE_WIDTH = 2;
const COURSE_TILE_OVERLAP = 0.1;
const COURSE_REPEAT_DISTANCE = COURSE_TILE_WIDTH - COURSE_TILE_OVERLAP;
const COURSE_TILES = [0, 1, 2];
const COURSE_STRIP_WIDTH = COURSE_TILE_WIDTH * COURSE_TILES.length;
const COURSE_START_OFFSET = 0.5;
const COURSE_TRAVEL_PER_ANSWER = 0.9;
const PLAYER_KARTS: Record<string, string> = {
  barratt: kartBran,
  bran: kartMochi,
  mochi: kartBarratt,
  vex: kartVex,
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
    prompt: `The Monster Minds have tampered with the kart fuel mix. It now has ${joinLabelList(labels)} in a ${ratioText} ratio. What fraction of the whole is ${targetLabel.toLowerCase()}?`,
    explanation: `Total parts = ${totalParts}. ${targetLabel} is ${question.ratio[targetIndex]} parts, so the fraction is ${question.correctAnswer}.`,
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

const makeRatioOptions = (numerator: number, denominator: number, suggestions: string[] = []) => {
  const correct = `${numerator}/${denominator}`;
  const candidates = [
    ...suggestions,
    ...Array.from({ length: denominator + 2 }, (_, index) => `${index + 1}/${denominator}`),
    `${numerator}/${denominator + 1}`,
    `${numerator}/${Math.max(1, denominator - 1)}`,
    `${denominator}/${numerator}`,
  ];
  const wrong = candidates.filter((value, index) => {
    const match = value.match(/^(\d+)\/([1-9]\d*)$/);
    return match && candidates.indexOf(value) === index
      && Number(match[1]) * denominator !== numerator * Number(match[2]);
  });
  return [correct, ...wrong.slice(0, 3)];
};

const generatedRatioQuestions = (): RatioFractionQuestion[] => {
  const ratios: number[][] = [];
  for (let a = 1; a <= 8; a++) for (let b = 1; b <= 8; b++) {
    if (a + b <= 12) ratios.push([a, b]);
  }
  for (let a = 1; a <= 3; a++) for (let b = 1; b <= 3; b++) for (let c = 1; c <= 3; c++) {
    if (a + b + c >= 5) ratios.push([a, b, c]);
  }
  for (let a = 1; a <= 3; a++) for (let b = 1; b <= 3; b++) for (let c = 1; c <= 3; c++) for (let d = 1; d <= 3; d++) {
    if (a + b + c + d >= 7) ratios.push([a, b, c, d]);
  }
  return ratios.flatMap((ratio) => ratio.map((part, targetIndex) => {
    const total = ratio.reduce((sum, value) => sum + value, 0);
    const target = `Element ${String.fromCharCode(65 + targetIndex)}`;
    return {
      id: `rf-${ratio.join('-')}-${targetIndex}`,
      prompt: '', ratio,
      labels: ratio.map((_, index) => `Element ${String.fromCharCode(65 + index)}`),
      target,
      correctAnswer: `${part}/${total}`,
      options: makeRatioOptions(part, total),
      explanation: '',
    };
  }));
};

const seenRatios = new Set<string>();
export const ratioFractionsQuestions = [...RAW_RATIO_FRACTIONS_QUESTIONS, ...generatedRatioQuestions()]
  .filter((question) => {
    const key = `${question.ratio.join(':')}:${question.labels.indexOf(question.target)}`;
    if (seenRatios.has(key)) return false;
    seenRatios.add(key);
    return true;
  })
  .map(themeRatioQuestion);

const getDifficultyPool = (level: number) => {
  const tier = Math.max(1, Math.min(5, level));
  return ratioFractionsQuestions.filter((question) => {
    const parts = question.ratio.reduce((total, value) => total + value, 0);
    if (tier === 1) return question.ratio.length === 2 && parts <= 4;
    if (tier === 2) return question.ratio.length === 2 && parts >= 5 && parts <= 6;
    if (tier === 3) return question.ratio.length === 2 && parts >= 7;
    return question.ratio.length === (tier === 4 ? 3 : 4);
  });
};
const FALLBACK_POOL = ratioFractionsQuestions;

const fractionKey = (question: RatioFractionQuestion) => {
  const [numerator, denominator] = question.correctAnswer.split('/').map(Number);
  return numerator / denominator;
};

const buildTierDeck = (pool: RatioFractionQuestion[], previousLast: RatioFractionQuestion | null) => {
  const remaining = reshuffleAvoidingRepeat(pool.length ? pool : FALLBACK_POOL, previousLast, (question) => question.id);
  const frequency = new Map<number, number>();
  remaining.forEach((question) => frequency.set(fractionKey(question), (frequency.get(fractionKey(question)) ?? 0) + 1));
  const ordered: RatioFractionQuestion[] = [];
  let lastAnswer = previousLast ? fractionKey(previousLast) : null;
  while (remaining.length) {
    let pick = 0;
    let highestFrequency = -1;
    remaining.forEach((question, index) => {
      const answer = fractionKey(question);
      if (answer === lastAnswer) return;
      const count = frequency.get(answer) ?? 0;
      if (count > highestFrequency) { pick = index; highestFrequency = count; }
    });
    const [question] = remaining.splice(pick, 1);
    lastAnswer = fractionKey(question);
    frequency.set(lastAnswer, (frequency.get(lastAnswer) ?? 1) - 1);
    ordered.push(question);
  }
  return ordered.map((question) => ({
    ...question,
    options: shuffleOptionsWithCorrect(
      makeRatioOptions(question.ratio[question.labels.indexOf(question.target)],
        question.ratio.reduce((sum, value) => sum + value, 0), question.options),
      question.correctAnswer,
    ).options,
  }));
};

const buildTierDecks = (level: number, previousLasts: Partial<Record<QuestionTier, RatioFractionQuestion | null>> = {}) => ({
  early: buildTierDeck(getDifficultyPool(level), previousLasts.early ?? null),
  mid: buildTierDeck(getDifficultyPool(level), previousLasts.mid ?? null),
  final: buildTierDeck(getDifficultyPool(level), previousLasts.final ?? null),
});

const starsForAccuracy = (correct: number, attempts: number) => {
  if (attempts === 0) return 0;
  const accuracy = correct / attempts;
  if (accuracy >= 0.9) return 3;
  if (accuracy >= 0.7) return 2;
  return 1;
};

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

const equivalentFractions = (answer: string, expected: string) => {
  const value = answer.match(/^(-?\d+)\/([1-9]\d*)$/);
  const target = expected.match(/^(-?\d+)\/([1-9]\d*)$/);
  if (!value || !target) return false;
  return BigInt(value[1]) * BigInt(target[2]) === BigInt(target[1]) * BigInt(value[2]);
};

const RatioRacerGame: React.FC<RatioRacerGameProps> = ({
  levelId,
  avatarId,
  onVictory,
  sessionState,
  sessionEvents,
}) => {
  const [attempts, setAttempts] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [feedback, setFeedback] = useState('');
  const [selected, setSelected] = useState<string | null>(null);
  const [locked, setLocked] = useState(false);
  const [raceState, setRaceState] = useState<RaceState>('introCountdown');
  const [countdown, setCountdown] = useState(3);
  const [raceProgress, setRaceProgress] = useState(0);
  const reducedMotion = useReducedMotion();
  const isPresent = useIsPresent();
  const presentRef = useRef(isPresent);
  presentRef.current = isPresent;
  const initialDecks = useMemo(() => buildTierDecks(levelId), [levelId]);
  const [tierDecks, setTierDecks] = useState(initialDecks);
  const tierDecksRef = useRef(initialDecks);
  const tierIndexRef = useRef<Record<QuestionTier, number>>({ early: 0, mid: 0, final: 0 });
  const [question, setQuestion] = useState<RatioFractionQuestion>(() => {
    const deck = initialDecks.early;
    tierIndexRef.current.early = deck.length ? 1 : 0;
    return deck[0] ?? ratioFractionsQuestions[0];
  });
  const questionStartRef = useRef<number>(Date.now());

  const raceDifficulty: RaceDifficulty = levelId <= 1 ? 'easy' : levelId <= 3 ? 'standard' : 'hard';
  const tuning = RACE_TUNING[raceDifficulty] || RACE_TUNING[DEFAULT_RACE_DIFFICULTY];

  const playerPosRef = useRef(START_OFFSET);
  const playerTargetRef = useRef(START_OFFSET);
  const reportedResultRef = useRef(false);
  const onVictoryRef = useRef(onVictory);
  onVictoryRef.current = onVictory;
  const answerLockedRef = useRef(false);
  const pendingTimeoutsRef = useRef<Set<number>>(new Set());
  const animationFrameRef = useRef<number | null>(null);
  const countdownTimerRef = useRef<number | null>(null);

  const lives = sessionState?.lives ?? 3;
  const livesRef = useRef(lives);
  livesRef.current = lives;
  const hasSharedLivesRef = useRef(Boolean(sessionState));
  hasSharedLivesRef.current = Boolean(sessionState);
  const observedPositiveLifeRef = useRef(Boolean(sessionState && lives > 0));
  const playerKart = PLAYER_KARTS[avatarId] || PLAYER_KARTS.barratt;
  const canContinueRace = () => presentRef.current && !reportedResultRef.current
    && !(hasSharedLivesRef.current && livesRef.current <= 0);

  // AnimatePresence keeps this component alive during the outgoing transition.
  useLayoutEffect(() => {
    if (isPresent) return;
    reportedResultRef.current = true;
    answerLockedRef.current = true;
    playerTargetRef.current = playerPosRef.current;
    pendingTimeoutsRef.current.forEach((timeout) => window.clearTimeout(timeout));
    pendingTimeoutsRef.current.clear();
    if (animationFrameRef.current !== null) cancelAnimationFrame(animationFrameRef.current);
    animationFrameRef.current = null;
    if (countdownTimerRef.current !== null) window.clearInterval(countdownTimerRef.current);
    countdownTimerRef.current = null;
  }, [isPresent]);

  useEffect(() => {
    tierDecksRef.current = tierDecks;
  }, [tierDecks]);

  useEffect(() => {
    if (!presentRef.current) return;
    const resetDecks = buildTierDecks(levelId);
    setTierDecks(resetDecks);
    tierDecksRef.current = resetDecks;
    tierIndexRef.current = { early: 0, mid: 0, final: 0 };
    const deck = resetDecks.early;
    tierIndexRef.current.early = deck.length ? 1 : 0;
    setQuestion(deck[0] ?? ratioFractionsQuestions[0]);
    questionStartRef.current = Date.now();
    playerPosRef.current = START_OFFSET;
    playerTargetRef.current = START_OFFSET;
    setRaceProgress(0);
    setAttempts(0);
    setCorrectCount(0);
    setSelected(null);
    setFeedback('');
    setLocked(false);
    answerLockedRef.current = false;
    observedPositiveLifeRef.current = Boolean(sessionState && lives > 0);
    setRaceState('introCountdown');
    return () => {
      reportedResultRef.current = true;
      answerLockedRef.current = true;
      pendingTimeoutsRef.current.forEach((timeout) => window.clearTimeout(timeout));
      pendingTimeoutsRef.current.clear();
    };
  }, [levelId]);

  useEffect(() => {
    if (!isPresent) return;
    let frameId: number;
    let lastTime: number | null = null;
    const tick = (timestamp: number) => {
      if (!presentRef.current) return;
      const last = lastTime ?? timestamp;
      const dt = Math.min(0.12, Math.max(0, (timestamp - last) / 1000));
      lastTime = timestamp;

      if (!document.hidden && canContinueRace()) {
        const playerX = playerPosRef.current;
        const playerTarget = playerTargetRef.current;
        if (Math.abs(playerTarget - playerX) > 0.01) {
          const blend = reducedMotion ? 1 : 1 - Math.pow(1 - RACER_LERP, dt * 60);
          playerPosRef.current = playerX + (playerTarget - playerX) * blend;
          setRaceProgress(clamp(playerPosRef.current / tuning.trackLength, 0, 1));
        }
      }
      frameId = requestAnimationFrame(tick);
      animationFrameRef.current = frameId;
    };

    frameId = requestAnimationFrame(tick);
    animationFrameRef.current = frameId;
    return () => {
      cancelAnimationFrame(frameId);
      if (animationFrameRef.current === frameId) animationFrameRef.current = null;
    };
  }, [isPresent, reducedMotion, tuning.trackLength]);

  useEffect(() => {
    if (!presentRef.current) return;
    if (sessionState && lives > 0) observedPositiveLifeRef.current = true;
    if (sessionState && lives <= 0 && observedPositiveLifeRef.current && !reportedResultRef.current) {
      reportedResultRef.current = true;
      answerLockedRef.current = true;
      playerTargetRef.current = playerPosRef.current;
      pendingTimeoutsRef.current.forEach((timeout) => window.clearTimeout(timeout));
      pendingTimeoutsRef.current.clear();
      setLocked(true);
      setRaceState('playerLoss');
      const xp = Math.max(20, BASE_XP * 0.35 + correctCount * 20);
      emitMiniGameSessionEvent(sessionEvents, 'game_failed', { score: xp, reason: 'lives' });
      return;
    }

    if (raceState === 'playerWin' && !reportedResultRef.current) {
      reportedResultRef.current = true;
      const xp = BASE_XP + correctCount * 45 + levelId * 30;
      const stars = starsForAccuracy(correctCount, attempts || 1);
      emitMiniGameSessionEvent(sessionEvents, 'game_complete', { score: xp, stars });
      onVictoryRef.current(stars, xp);
    }

  }, [attempts, correctCount, isPresent, levelId, lives, raceState, sessionEvents, sessionState]);

  useEffect(() => {
    if (presentRef.current) reportedResultRef.current = false;
  }, [levelId]);

  useEffect(() => {
    if (!isPresent || raceState !== 'introCountdown') return;
    setCountdown(3);
    const interval = window.setInterval(() => {
      if (!presentRef.current || reportedResultRef.current) return;
      setCountdown((prev) => {
        if (!presentRef.current || reportedResultRef.current) return prev;
        if (prev <= 1) {
          window.clearInterval(interval);
          if (countdownTimerRef.current === interval) countdownTimerRef.current = null;
          setRaceState('showingQuestion');
          return 0;
        }
        return prev - 1;
      });
    }, 650);
    countdownTimerRef.current = interval;
    return () => {
      window.clearInterval(interval);
      if (countdownTimerRef.current === interval) countdownTimerRef.current = null;
    };
  }, [isPresent, raceState]);

  const advanceQuestionForTier = (tier: QuestionTier) => {
    const decks = tierDecksRef.current;
    const deck = decks[tier];
    if (!deck.length) return ratioFractionsQuestions[0];
    const index = tierIndexRef.current[tier];
    const nextQuestion = deck[index % deck.length];
    const nextIndex = index + 1;
    if (nextIndex % deck.length === 0) {
      const previousLast = deck[deck.length - 1] ?? null;
      const nextDeck = buildTierDeck(getDifficultyPool(levelId), previousLast);
      const nextDecks = { ...decks, [tier]: nextDeck };
      setTierDecks(nextDecks);
      tierDecksRef.current = nextDecks;
      tierIndexRef.current[tier] = 0;
    } else {
      tierIndexRef.current[tier] = nextIndex;
    }
    return nextQuestion;
  };

  const schedule = (callback: () => void, delay: number) => {
    if (!canContinueRace()) return;
    const timeout = window.setTimeout(() => {
      pendingTimeoutsRef.current.delete(timeout);
      if (canContinueRace()) callback();
    }, delay);
    pendingTimeoutsRef.current.add(timeout);
  };

  const handleAnswer = (option: string) => {
    if (!canContinueRace() || answerLockedRef.current || locked || raceState !== 'showingQuestion') return;

    answerLockedRef.current = true;
    setSelected(option);
    setAttempts((prev) => prev + 1);
    setLocked(true);
    setRaceState('evaluatingAnswer');

    const playerStep = tuning.playerAdvanceDistance;
    const boostDelay = tuning.playerBoostAnticipationMs;
    const moveDuration = tuning.playerMoveDurationMs + boostDelay;

    if (equivalentFractions(option, question.correctAnswer)) {
      setCorrectCount((prev) => prev + 1);
      emitMiniGameSessionEvent(sessionEvents, 'correct_answer', { metadata: { question: question.id } });
      const elapsedMs = Date.now() - questionStartRef.current;
      const isPraise = shouldShowPraise(1, elapsedMs);
      setFeedback(isPraise ? `${buildPraiseMessage()} Full send!` : 'Fuel fixed. Full send!');
      setRaceState('correctBoost');
      schedule(() => {
        playerTargetRef.current = Math.min(tuning.trackLength, playerTargetRef.current + playerStep);
      }, boostDelay);

      schedule(() => {
        // Finish the boost before unlocking another answer, so the course rests
        // while the player reads and resumes from the exact race distance.
        playerPosRef.current = playerTargetRef.current;
        setRaceProgress(clamp(playerPosRef.current / tuning.trackLength, 0, 1));
        if (playerTargetRef.current >= tuning.trackLength) {
          setRaceState('playerWin');
          if (!reducedMotion) confetti({
            particleCount: 60,
            spread: 55,
            origin: { y: 0.6 },
            colors: ['#facc15', '#38bdf8', '#4ade80'],
          });
          return;
        }

        setQuestion(advanceQuestionForTier('early'));
        questionStartRef.current = Date.now();
        setSelected(null);
        setLocked(false);
        answerLockedRef.current = false;
        setFeedback('');
        setRaceState('showingQuestion');
      }, moveDuration);
      return;
    }

    emitMiniGameSessionEvent(sessionEvents, 'incorrect_answer', { metadata: { question: question.id } });
    setFeedback('Fuel hiccup! Add every ratio part, then retry.');
    setRaceState('incorrectStall');
    schedule(() => {
      setSelected(null);
      setLocked(false);
      answerLockedRef.current = false;
      setRaceState('showingQuestion');
    }, tuning.incorrectFeedbackMs);
  };

  const showBoost = raceState === 'correctBoost';
  const showStall = raceState === 'incorrectStall';
  const progressPercent = Math.round(raceProgress * 100);
  const racePressure = showStall ? 'stall' : showBoost ? 'boost' : lives <= 1 ? 'last-chance' : progressPercent >= 80 ? 'final-stretch' : 'steady';
  const pitMessage = showStall ? 'Fuel hiccup. No refunds.' : showBoost ? 'Full send!' : progressPercent >= 80 ? 'Bring it home!' : 'Pit crew standing by';
  const courseTravel = reducedMotion ? 0 : (
    raceProgress * tuning.trackLength / tuning.playerAdvanceDistance * COURSE_TRAVEL_PER_ANSWER
  );
  // Keep the camera inside the repeated tiles so each wrap shows the same blend.
  const courseOffset = COURSE_REPEAT_DISTANCE + (
    (COURSE_START_OFFSET + courseTravel) % COURSE_REPEAT_DISTANCE
  );

  return (
    <GameUiShell overlayDisabled className="bg-transparent">
      <div className="ratio-racer-layout relative h-full w-full">
        <div
          aria-hidden="true"
          className="ratio-racer-backdrop pointer-events-none absolute inset-0"
          style={{
            backgroundImage: `linear-gradient(180deg, rgba(7,25,45,.64), rgba(7,25,45,.78)), url(${racingPaddock})`,
          }}
        />
        <div className="ratio-racer-content">
          <GameQuestionCard
            title="Fix the fuel mix"
            className="ratio-racer-mission"
            style={{ position: 'relative', top: 0, transform: 'none', width: '100%', padding: '10px 12px', fontSize: 18 }}
          >
            <span className="ratio-racer-ratio">
              {question.labels.join(' : ')} = {question.ratio.join(' : ')}
            </span>
            <span className="ratio-racer-question">What fraction of the mix is {question.target.toLowerCase()}?</span>
          </GameQuestionCard>

          <div className={`ratio-racer-scene${showBoost ? ' is-boost' : showStall ? ' is-stall' : ''}${lives <= 1 ? ' is-last-chance' : ''}`}
            data-race-scene data-race-state={raceState} data-race-pressure={racePressure} data-race-lives={lives} data-race-present={isPresent}>
            <div className="ratio-racer-course" data-race-course data-course-travel={courseTravel} aria-hidden="true">
              <div
                className="ratio-racer-course-strip"
                data-race-course-strip
                style={{ transform: `translate3d(${-courseOffset / COURSE_STRIP_WIDTH * 100}%, 0, 0)` }}
              >
                {COURSE_TILES.map((tile) => (
                  <img
                    key={tile}
                    className="ratio-racer-track"
                    data-race-course-tile={tile}
                    src={courseBackground}
                    alt=""
                    draggable={false}
                    style={{ marginRight: `${-COURSE_TILE_OVERLAP / COURSE_STRIP_WIDTH * 100}%`, zIndex: COURSE_TILES.length - tile }}
                  />
                ))}
              </div>
            </div>
            <div className="ratio-racer-track-shade" aria-hidden="true" />

            <div className="ratio-racer-route">
              <div className="ratio-racer-route-labels">
                <span>{lives <= 1 ? 'One chance. Keep it clean.' : progressPercent >= 80 ? 'Final stretch. Bring it home!' : 'Race to the finish'}</span>
                <span><Flag size={13} aria-hidden="true" /> {progressPercent}%</span>
              </div>
              <div
                className="ratio-racer-progress"
                role="progressbar"
                aria-label="Race distance"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={progressPercent}
                data-race-progress={progressPercent}
              >
                <div style={{ width: `${progressPercent}%` }} />
              </div>
            </div>

            <div className="ratio-racer-pit-board" data-race-pit-board aria-hidden="true">
              <span>Pit wall</span><strong>{pitMessage}</strong>
            </div>
            <div className="ratio-racer-track-flags" aria-hidden="true"><i /><i /></div>

            {raceProgress > .75 ? (
              <div className="ratio-racer-finish" aria-hidden="true" style={{ left: `${125 - raceProgress * 67}%` }}>
                <span />
              </div>
            ) : null}

            <div
              className="ratio-racer-kart-anchor"
              data-player-kart
              style={{ left: `${44 + raceProgress * 12}%` }}
            >
              <div className="ratio-racer-kart-shadow" aria-hidden="true" />
              <div className={`ratio-racer-exhaust${showBoost ? ' is-boost' : showStall ? ' is-stall' : ''}`}
                data-race-exhaust={showBoost ? 'boost' : showStall ? 'stall' : 'idle'} aria-hidden="true">
                <i /><i /><i />
              </div>
              <motion.div
                className="ratio-racer-kart"
                animate={reducedMotion
                  ? { y: 0, rotate: 0 }
                  : showBoost
                    ? { y: [0, -6, 0], rotate: [0, -3, 0] }
                    : showStall
                      ? { x: [0, -4, 4, -2, 0], y: 0, rotate: 0 }
                      : { y: [0, -1.5, 0], x: 0, rotate: 0 }}
                transition={{ duration: showBoost || showStall ? .4 : 1.2, repeat: showBoost || showStall || reducedMotion ? 0 : Infinity, ease: 'easeInOut' }}
              >
                <img src={playerKart} alt="Your racing kart" draggable={false} />
              </motion.div>
              <AnimatePresence>
                {showBoost ? (
                  <motion.div
                    className="ratio-racer-boost"
                    key={`boost-${correctCount}`}
                    initial={reducedMotion ? false : { opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: reducedMotion ? 0 : .15 }}
                    aria-hidden="true"
                  >
                    <Zap size={16} fill="currentColor" /> Boost!
                  </motion.div>
                ) : null}
              </AnimatePresence>
            </div>

            {raceState === 'introCountdown' ? (
              <div className="ratio-racer-countdown" role="status">
                <span>Ready to race?</span>
                <div className="ratio-racer-start-lights" aria-hidden="true">
                  {[3, 2, 1].map((light) => <i key={light} className={countdown <= light ? 'is-lit' : ''} />)}
                </div>
                <strong>{countdown || 'Go!'}</strong>
              </div>
            ) : null}

            <AnimatePresence>
              {raceState === 'playerWin' ? (
                <motion.div
                  key="winner"
                  initial={reducedMotion ? false : { opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={reducedMotion ? { opacity: 0 } : { opacity: 0, scale: 0.9 }}
                  transition={{ duration: reducedMotion ? 0 : .2 }}
                  className="ratio-racer-win"
                >
                  <Flag size={28} aria-hidden="true" /> Finish line reached!
                </motion.div>
              ) : null}
            </AnimatePresence>
          </div>
          <div className="ratio-racer-answers answer-choice-surface">
            <div className={`ratio-racer-feedback${showBoost ? ' is-boost' : showStall ? ' is-stall' : ''}`} role="status" aria-live="polite">
              {feedback || (lives <= 1 ? 'One chance left. Get the fuel fraction right.' : 'Fix the fuel. Launch the boost. Leave the slime behind.')}
            </div>
            <div className="ratio-racer-answer-grid" role="group" aria-label="Fuel fractions">
              {question.options.map((option) => (
                <motion.button
                  key={option}
                  type="button"
                  data-race-answer={option}
                  aria-label={option}
                  aria-pressed={selected === option}
                  whileTap={reducedMotion ? undefined : { scale: 0.96 }}
                  onClick={() => handleAnswer(option)}
                  disabled={!isPresent || locked || raceState !== 'showingQuestion' || (Boolean(sessionState) && lives <= 0)}
                  className={`ratio-racer-answer ${
                    selected === option
                      ? equivalentFractions(option, question.correctAnswer)
                        ? 'ui-button-success'
                        : 'ui-button-secondary is-incorrect'
                      : 'ui-button-secondary'
                  }`}
                >
                  <span className="ratio-racer-fraction" aria-hidden="true">
                    <span>{option.split('/')[0]}</span>
                    <span>{option.split('/')[1]}</span>
                  </span>
                </motion.button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </GameUiShell>
  );
};

export default RatioRacerGame;
