// Auto-generated Angle Arena game utilities for SATs Legends
export type AngleQuestion = {
  id: number;
  prompt: string;
  options: number[];
  correctAnswer: number;
  targetX: number;
  targetY: number;
  launchSpeed: number;
  explanation: string;
};

type BuildConfig = {
  launcherX: number;
  groundY: number;
  gravity: number;
};

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

const buildTarget = (launcherX: number, angleDeg: number, speed: number, gravity: number) => {
  const radians = (angleDeg * Math.PI) / 180;
  const range = (speed * speed * Math.sin(2 * radians)) / gravity;
  const targetX = clamp(launcherX + range * 0.9, launcherX + 320, launcherX + 1400);
  return targetX;
};

const makeQuestion = (
  id: number,
  prompt: string,
  options: number[],
  correctAnswer: number,
  speed: number,
  launcherX: number,
  groundY: number,
  gravity: number,
  targetHeight = 46,
  explanation = 'Choose the angle that best matches the target.',
): AngleQuestion => {
  const targetX = buildTarget(launcherX, correctAnswer, speed, gravity);
  const targetY = groundY - targetHeight;
  return {
    id,
    prompt,
    options,
    correctAnswer,
    targetX,
    targetY,
    launchSpeed: speed,
    explanation,
  };
};

export const buildAngleQuestions = ({ launcherX, groundY, gravity }: BuildConfig): AngleQuestion[] => {
  const speed = 520;
  return [
    makeQuestion(
      1,
      'Which angle should the launcher use to hit the target?',
      [30, 45, 60, 75],
      45,
      speed,
      launcherX,
      groundY,
      gravity,
      50,
      'A 45 degree angle creates a balanced arc for this distance.',
    ),
    makeQuestion(
      2,
      'Which angle is acute?',
      [35, 95, 120, 150],
      35,
      speed,
      launcherX,
      groundY,
      gravity,
      54,
      'Acute angles are less than 90 degrees.',
    ),
    makeQuestion(
      3,
      'Which angle is obtuse?',
      [110, 45, 70, 90],
      110,
      speed,
      launcherX,
      groundY,
      gravity,
      58,
      'Obtuse angles are greater than 90 degrees.',
    ),
    makeQuestion(
      4,
      'Which angle is closest to a right angle?',
      [85, 50, 120, 150],
      85,
      speed,
      launcherX,
      groundY,
      gravity,
      52,
      'A right angle is 90 degrees, so 85 degrees is closest here.',
    ),
    makeQuestion(
      5,
      'Which angle gives the highest arc?',
      [30, 45, 60, 75],
      75,
      speed,
      launcherX,
      groundY,
      gravity,
      62,
      'Larger angles launch higher but travel less distance.',
    ),
  ];
};
