import { angleToVector } from './math';

export interface AngleQuestion {
  id: string;
  topic: 'straight_line';
  kind: 'fluency' | 'reasoning';
  difficulty: number;
  prompt: string;
  options: number[];
  correctAnswer: number;
  targetX: number;
  targetY: number;
  launchSpeed?: number;
}

interface BuildConfig {
  level: number;
  launcherX: number;
  groundY: number;
  gravity: number;
  seed?: number;
}

type QuestionSpec = {
  prompt: string;
  correctAnswer: number;
  kind?: 'fluency' | 'reasoning';
  difficulty: number;
};

type Rng = () => number;

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

const createRng = (seed: number): Rng => {
  let state = (seed >>> 0) || 1;
  return () => {
    state += 0x6D2B79F5;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

const shuffle = <T>(items: T[], rng: Rng) => {
  const result = [...items];
  for (let index = result.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(rng() * (index + 1));
    [result[index], result[swapIndex]] = [result[swapIndex], result[index]];
  }
  return result;
};

const buildOptions = (correctAnswer: number, rng: Rng, band: number) => {
  const bandDeltas: Record<number, number[]> = {
    0: [12, 18, 24, 30, 36, 45],
    1: [8, 10, 14, 16, 20, 26],
    2: [6, 8, 10, 12, 18, 22],
    3: [4, 6, 8, 10, 12, 14],
    4: [2, 4, 6, 8, 10, 12],
  };

  const deltas = bandDeltas[band] || bandDeltas[4];
  const pool = new Set<number>();

  for (const delta of shuffle(deltas, rng)) {
    pool.add(clamp(correctAnswer + delta, 1, 179));
    pool.add(clamp(correctAnswer - delta, 1, 179));
    pool.add(clamp(180 - correctAnswer, 1, 179));
    if (pool.size >= 6) break;
  }

  if (pool.size < 6) {
    const fallbackOffsets = [5, 7, 9, 11, 13, 15, 17];
    for (const offset of fallbackOffsets) {
      if (pool.size >= 6) break;
      pool.add(clamp(correctAnswer + offset, 1, 179));
      if (pool.size >= 6) break;
      pool.add(clamp(correctAnswer - offset, 1, 179));
    }
  }

  const wrongAnswers = shuffle([...pool].filter((value) => value !== correctAnswer), rng).slice(0, 3);
  while (wrongAnswers.length < 3) {
    const next = clamp(correctAnswer + ((wrongAnswers.length + 1) * 7), 1, 179);
    if (next !== correctAnswer && !wrongAnswers.includes(next)) {
      wrongAnswers.push(next);
    } else {
      wrongAnswers.push(clamp(correctAnswer - ((wrongAnswers.length + 2) * 5), 1, 179));
    }
  }

  return shuffle([correctAnswer, ...wrongAnswers], rng);
};

const buildTargetPoint = (correctAnswer: number, config: BuildConfig, band: number) => {
  const direction = angleToVector(correctAnswer);
  const launchDistance = 320 + (band * 22) + Math.min(6, Math.max(0, config.level - 1)) * 10;
  const gravityOffset = Math.max(0, config.gravity) * 0.015;

  return {
    targetX: config.launcherX + (direction.x * launchDistance),
    targetY: config.groundY + (direction.y * launchDistance) + gravityOffset,
  };
};

const buildQuestion = (
  spec: QuestionSpec,
  index: number,
  config: BuildConfig,
  band: number,
  runSeed: number,
): AngleQuestion => {
  const rng = createRng(
    (runSeed * 53)
    + (config.level * 997)
    + ((band + 1) * 149)
    + (index * 43)
    + spec.correctAnswer,
  );
  const options = buildOptions(spec.correctAnswer, rng, band);
  const target = buildTargetPoint(spec.correctAnswer, config, band);

  return {
    id: `angle-arena-${config.level}-${band}-${index + 1}`,
    topic: 'straight_line',
    kind: spec.kind ?? 'fluency',
    difficulty: spec.difficulty,
    prompt: spec.prompt,
    options,
    correctAnswer: spec.correctAnswer,
    targetX: target.targetX,
    targetY: target.targetY,
  };
};

const QUESTION_BANK: QuestionSpec[][] = [
  [
    { prompt: 'One angle on a straight line is 30°. What is the other angle?', correctAnswer: 150, difficulty: 1 },
    { prompt: 'One angle on a straight line is 45°. What is the other angle?', correctAnswer: 135, difficulty: 1 },
    { prompt: 'One angle on a straight line is 60°. What is the other angle?', correctAnswer: 120, difficulty: 1 },
    { prompt: 'One angle on a straight line is 75°. What is the other angle?', correctAnswer: 105, difficulty: 1 },
    { prompt: 'One angle on a straight line is 90°. What is the other angle?', correctAnswer: 90, difficulty: 1 },
    { prompt: 'One angle on a straight line is 54°. What is the other angle?', correctAnswer: 126, difficulty: 1 },
  ],
  [
    { prompt: 'The smaller angle is 18° less than the larger angle. What is the smaller angle?', correctAnswer: 81, difficulty: 2 },
    { prompt: 'One angle on a straight line is 68°. What is the other angle?', correctAnswer: 112, difficulty: 2 },
    { prompt: 'The larger angle is 34° more than the smaller angle. What is the larger angle?', correctAnswer: 107, difficulty: 2 },
    { prompt: 'The angles are in the ratio 1:2 on a straight line. What is the larger angle?', correctAnswer: 120, difficulty: 2 },
    { prompt: 'The angles are in the ratio 2:1 on a straight line. What is the smaller angle?', correctAnswer: 60, difficulty: 2 },
    { prompt: 'One angle on a straight line is 77°. What is the other angle?', correctAnswer: 103, difficulty: 2 },
  ],
  [
    { prompt: 'The angles are in the ratio 2:7 on a straight line. What is the smaller angle?', correctAnswer: 20, difficulty: 3 },
    { prompt: 'The angles are in the ratio 4:5 on a straight line. What is the larger angle?', correctAnswer: 100, difficulty: 3 },
    { prompt: 'The smaller angle is 26° less than the larger angle. What is the larger angle?', correctAnswer: 103, difficulty: 3 },
    { prompt: 'The angles are in the ratio 3:6 on a straight line. What is the smaller angle?', correctAnswer: 60, difficulty: 3 },
    { prompt: 'One angle on a straight line is 83°. What is the other angle?', correctAnswer: 97, difficulty: 3 },
    { prompt: 'The larger angle is 52° more than the smaller angle. What is the smaller angle?', correctAnswer: 64, difficulty: 3 },
  ],
  [
    { prompt: 'The angles are in the ratio 3:7 on a straight line. What is the smaller angle?', correctAnswer: 54, difficulty: 4 },
    { prompt: 'The angles are in the ratio 5:7 on a straight line. What is the larger angle?', correctAnswer: 105, difficulty: 4 },
    { prompt: 'The smaller angle is 38° less than the larger angle. What is the larger angle?', correctAnswer: 109, difficulty: 4 },
    { prompt: 'One angle on a straight line is 94°. What is the other angle?', correctAnswer: 86, difficulty: 4 },
    { prompt: 'The angles are in the ratio 4:5 on a straight line. What is the smaller angle?', correctAnswer: 80, difficulty: 4 },
    { prompt: 'The larger angle is 70° more than the smaller angle. What is the smaller angle?', correctAnswer: 55, difficulty: 4 },
  ],
  [
    { prompt: 'The angles are in the ratio 7:8 on a straight line. What is the smaller angle?', correctAnswer: 84, difficulty: 5 },
    { prompt: 'The angles are in the ratio 6:9 on a straight line. What is the larger angle?', correctAnswer: 108, difficulty: 5 },
    { prompt: 'The smaller angle is 56° less than the larger angle. What is the smaller angle?', correctAnswer: 62, difficulty: 5 },
    { prompt: 'One angle on a straight line is 101°. What is the other angle?', correctAnswer: 79, difficulty: 5 },
    { prompt: 'The angles are in the ratio 4:11 on a straight line. What is the smaller angle?', correctAnswer: 48, difficulty: 5 },
    { prompt: 'The larger angle is 82° more than the smaller angle. What is the larger angle?', correctAnswer: 131, difficulty: 5 },
  ],
];

const selectBand = (level: number) => clamp(Math.floor((Math.max(1, level) - 1) / 1), 0, QUESTION_BANK.length - 1);

export const buildAngleQuestions = (config: BuildConfig): AngleQuestion[] => {
  const level = Math.max(1, Math.floor(config.level || 1));
  const band = selectBand(level);
  const runSeed = Number.isFinite(config.seed)
    ? Math.floor(config.seed as number)
    : Math.floor(Math.random() * 1_000_000_000);
  const rng = createRng((runSeed * 19) + (level * 71) + (band * 31));

  return shuffle([...QUESTION_BANK[band]], rng).map((spec, index) =>
    buildQuestion(spec, index, { ...config, level }, band, runSeed),
  );
};
