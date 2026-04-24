import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  emitMiniGameSessionEvent,
  MiniGameShellContractProps,
} from '../app/gameplaySessionContract';
import { triggerHaptic } from '../haptics';
import {
  FeedbackStrip,
  GameTopBar,
  GameUiShell,
  PrimaryButton,
  SecondaryButton,
  GameQuestionCard,
} from '../components/game-ui/GameUiKit';
import GameScreenLayout from '../components/game-ui/GameScreenLayout';
import cannonFacingLeftSrc from '../assets/angle_arena/cannonanglearena/1.png';
import cannonFacingRightSrc from '../assets/angle_arena/cannonanglearena/2.png';
import cannonFacingUpSrc from '../assets/angle_arena/cannonanglearena/3.png';
import { BOSS_ART_LIBRARY } from '../assets/bosses/library';
import { buildAngleQuestions, AngleQuestion } from './angleArena/questions';
import { angleToVector, clamp, degreesToRadians, distance, lerp, worldToScreen } from './angleArena/math';

interface AngleArenaGameProps {
  levelId: number;
  avatarId: string;
  onVictory: (stars: number, XP: number) => void;
  onGameOver: (XP: number) => void;
  onBack: () => void;
  questions?: AngleQuestion[];
  onRoundComplete?: (correct: boolean) => void;
}

type AngleArenaGameShellProps = AngleArenaGameProps & MiniGameShellContractProps;

type GameState =
  | 'intro'
  | 'awaitingAnswer'
  | 'aiming'
  | 'firing'
  | 'projectileFlight'
  | 'resolvedCorrect'
  | 'resolvedIncorrect'
  | 'levelComplete'
  | 'gameOver';

type ImpactResult = 'hit' | 'miss';

type ProjectileState = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  active: boolean;
  shouldHit: boolean;
  targetX: number;
  targetY: number;
  trail: { x: number; y: number; alpha: number }[];
};

const AIM_DELAY = 360;
const HIT_SHAKE_DURATION = 520;
const PROJECTILE_RADIUS = 10;
const TARGET_RADIUS = 34;
const INITIAL_TIMER = 90;
const INITIAL_LIVES = 3;
const POINTS_PER_HIT = 250;
const WORLD_RADIUS = 2600;
const CAMERA_LERP = 0.14;
const RETURN_LERP = 0.12;
const MAX_FLIGHT_DISTANCE = 2800;
const CAMERA_LEAD_DISTANCE = 120;
const LAUNCHER_SCREEN_X_RATIO = 0.2;
const LAUNCHER_SCREEN_Y_RATIO = 0.76;
const SKY_DRIFT_FACTOR = 0.14;
const GROUND_DRIFT_FACTOR = 0.28;
const PROJECTILE_GRAVITY = 760;
const MIN_SIDE_LAUNCH_ANGLE = 18;
const MAX_SIDE_LAUNCH_ANGLE = 72;

type CloudLayer = {
  x: number;
  y: number;
  scale: number;
  speed: number;
  alpha: number;
};

const ANGLE_CLOUDS: CloudLayer[] = [
  { x: 40, y: 0.16, scale: 1.12, speed: 0.45, alpha: 0.68 },
  { x: 220, y: 0.12, scale: 0.92, speed: 0.28, alpha: 0.52 },
  { x: 420, y: 0.18, scale: 1.28, speed: 0.36, alpha: 0.62 },
  { x: 680, y: 0.24, scale: 0.82, speed: 0.22, alpha: 0.48 },
  { x: 940, y: 0.14, scale: 1.05, speed: 0.31, alpha: 0.58 },
  { x: 1180, y: 0.21, scale: 1.34, speed: 0.18, alpha: 0.66 },
];

const drawCloud = (
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  scale: number,
  alpha: number,
) => {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = 'rgba(255,255,255,0.98)';
  ctx.shadowColor = 'rgba(255,255,255,0.3)';
  ctx.shadowBlur = 18 * scale;
  ctx.beginPath();
  ctx.ellipse(x, y, 54 * scale, 26 * scale, 0, 0, Math.PI * 2);
  ctx.ellipse(x + (28 * scale), y - (16 * scale), 42 * scale, 24 * scale, 0, 0, Math.PI * 2);
  ctx.ellipse(x + (62 * scale), y, 58 * scale, 28 * scale, 0, 0, Math.PI * 2);
  ctx.ellipse(x + (22 * scale), y + (10 * scale), 38 * scale, 20 * scale, 0, 0, Math.PI * 2);
  ctx.ellipse(x + (72 * scale), y + (10 * scale), 42 * scale, 20 * scale, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
};

const drawSkyBackground = (
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  timestamp: number,
  cameraX: number,
  cameraY: number,
  projectileActive: boolean,
) => {
  const sky = ctx.createLinearGradient(0, 0, 0, height);
  sky.addColorStop(0, '#d9f4ff');
  sky.addColorStop(0.28, '#8bd9ff');
  sky.addColorStop(0.56, '#4da7f0');
  sky.addColorStop(1, '#173d86');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, width, height);

  const skyGlow = ctx.createRadialGradient(width * 0.74, height * 0.16, 20, width * 0.74, height * 0.16, height * 0.42);
  skyGlow.addColorStop(0, 'rgba(255,255,255,0.8)');
  skyGlow.addColorStop(0.2, 'rgba(255,241,153,0.5)');
  skyGlow.addColorStop(0.45, 'rgba(255,196,61,0.18)');
  skyGlow.addColorStop(1, 'rgba(255,196,61,0)');
  ctx.fillStyle = skyGlow;
  ctx.fillRect(0, 0, width, height);

  const haze = ctx.createLinearGradient(0, height * 0.58, 0, height);
  haze.addColorStop(0, 'rgba(255,255,255,0)');
  haze.addColorStop(1, 'rgba(232,245,255,0.22)');
  ctx.fillStyle = haze;
  ctx.fillRect(0, height * 0.5, width, height * 0.5);

  const starDrift = cameraX * 0.04;
  ctx.save();
  ctx.globalAlpha = 0.55;
  for (let i = 0; i < 10; i += 1) {
    const starX = ((i * 137) + starDrift * 0.7) % (width + 140) - 70;
    const starY = (height * 0.08) + ((i % 4) * 28) + Math.sin((timestamp * 0.0004) + i) * 3;
    ctx.fillStyle = i % 3 === 0 ? 'rgba(255,255,255,0.95)' : 'rgba(253,224,71,0.72)';
    ctx.beginPath();
    ctx.arc(starX, starY, 1.4 + (i % 3) * 0.4, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();

  const wrapWidth = width + 320;
  ANGLE_CLOUDS.forEach((cloud, index) => {
    const drift = ((timestamp * 0.012 * cloud.speed) % wrapWidth) - 160 - (cameraX * 0.12 * cloud.speed);
    const baseX = cloud.x + drift;
    const y = height * cloud.y + Math.sin((timestamp * 0.00045) + index) * 5 - (cameraY * 0.03 * cloud.speed);
    drawCloud(ctx, baseX, y, cloud.scale, cloud.alpha);
  });

  const mountainShift = cameraX * 0.08;
  const farRidgeY = height * 0.56 + (cameraY * 0.02);
  ctx.save();
  ctx.fillStyle = '#15315f';
  ctx.globalAlpha = 0.9;
  ctx.beginPath();
  ctx.moveTo(-80 - mountainShift, farRidgeY);
  ctx.lineTo(width * 0.12 - mountainShift, height * 0.42);
  ctx.lineTo(width * 0.26 - mountainShift, height * 0.54);
  ctx.lineTo(width * 0.38 - mountainShift, height * 0.35);
  ctx.lineTo(width * 0.52 - mountainShift, height * 0.57);
  ctx.lineTo(width * 0.68 - mountainShift, height * 0.4);
  ctx.lineTo(width * 0.82 - mountainShift, height * 0.53);
  ctx.lineTo(width + 80 - mountainShift, farRidgeY);
  ctx.lineTo(width + 80 - mountainShift, height);
  ctx.lineTo(-80 - mountainShift, height);
  ctx.closePath();
  ctx.fill();
  ctx.restore();

  ctx.save();
  ctx.fillStyle = 'rgba(59,130,246,0.18)';
  ctx.beginPath();
  ctx.moveTo(-60 - mountainShift * 0.6, height * 0.64);
  ctx.lineTo(width * 0.16 - mountainShift * 0.6, height * 0.5);
  ctx.lineTo(width * 0.34 - mountainShift * 0.6, height * 0.66);
  ctx.lineTo(width * 0.55 - mountainShift * 0.6, height * 0.48);
  ctx.lineTo(width * 0.73 - mountainShift * 0.6, height * 0.63);
  ctx.lineTo(width + 60 - mountainShift * 0.6, height * 0.58);
  ctx.lineTo(width + 60 - mountainShift * 0.6, height * 0.88);
  ctx.lineTo(-60 - mountainShift * 0.6, height * 0.88);
  ctx.closePath();
  ctx.fill();
  ctx.restore();

  const groundTop = height * 0.7 + (cameraY * 0.04);
  const groundShift = cameraX * 0.22;
  const groundGrad = ctx.createLinearGradient(0, groundTop, 0, height);
  groundGrad.addColorStop(0, 'rgba(32,101,71,0.0)');
  groundGrad.addColorStop(0.1, 'rgba(27,110,79,0.7)');
  groundGrad.addColorStop(0.5, 'rgba(19,78,61,0.95)');
  groundGrad.addColorStop(1, 'rgba(9,35,31,1)');
  ctx.fillStyle = groundGrad;
  ctx.fillRect(0, groundTop, width, height - groundTop);

  ctx.save();
  ctx.globalAlpha = projectileActive ? 0.45 : 0.2;
  ctx.fillStyle = 'rgba(255,255,255,0.14)';
  for (let i = -1; i < 7; i += 1) {
    const ridgeX = (i * (width / 3.4)) - (groundShift % (width / 1.6));
    ctx.beginPath();
    ctx.moveTo(ridgeX - 80, height);
    ctx.quadraticCurveTo(ridgeX + 60, groundTop + 34, ridgeX + 180, height);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();

  ctx.save();
  ctx.globalAlpha = 0.35;
  ctx.fillStyle = 'rgba(14, 94, 70, 0.95)';
  for (let i = -1; i < 6; i += 1) {
    const hillX = (i * (width / 2.4)) - (groundShift * 0.75 % (width / 1.2));
    ctx.beginPath();
    ctx.moveTo(hillX - 120, height);
    ctx.quadraticCurveTo(hillX + 20, height * 0.83, hillX + 180, height * 0.93);
    ctx.quadraticCurveTo(hillX + 330, height * 1.0, hillX + 480, height);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();

  ctx.save();
  ctx.globalAlpha = 0.22;
  ctx.fillStyle = 'rgba(163,230,53,0.45)';
  for (let i = 0; i < 18; i += 1) {
    const tuftX = ((i * 91) + groundShift * 0.9) % (width + 120) - 60;
    const tuftY = height * 0.86 + ((i % 4) * 12);
    ctx.beginPath();
    ctx.ellipse(tuftX, tuftY, 12, 5, (i % 5) * 0.12, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();

  ctx.save();
  ctx.globalAlpha = 0.24;
  ctx.fillStyle = 'rgba(255,255,255,0.12)';
  ctx.fillRect(0, height * 0.72, width, 2);
  ctx.fillStyle = 'rgba(251,191,36,0.28)';
  ctx.fillRect(0, height * 0.78, width, 2);
  ctx.restore();
};

const drawRoundedRectPath = (
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) => {
  const radius = Math.max(0, Math.min(r, w / 2, h / 2));
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + w, y, x + w, y + h, radius);
  ctx.arcTo(x + w, y + h, x, y + h, radius);
  ctx.arcTo(x, y + h, x, y, radius);
  ctx.arcTo(x, y, x + w, y, radius);
  ctx.closePath();
};

type CannonSpriteKey = 'left' | 'right' | 'up';

type CannonSprites = Partial<Record<CannonSpriteKey, CanvasImageSource>>;

const CANNON_BASELINE_DEG: Record<CannonSpriteKey, number> = {
  left: 155,
  right: 25,
  up: 90,
};

const toPositiveAngle = (angleDeg: number) => ((angleDeg % 360) + 360) % 360;

const pickCannonSpriteKey = (angleDeg: number): CannonSpriteKey => {
  const angle = toPositiveAngle(angleDeg);
  const dir = angleToVector(angle);
  if (Math.abs(dir.y) >= Math.abs(dir.x) * 0.92) return 'up';
  return dir.x >= 0 ? 'right' : 'left';
};

const alphaKeyNearWhite = (img: HTMLImageElement, threshold = 240, saturationBand = 35) => {
  const canvas = document.createElement('canvas');
  canvas.width = img.naturalWidth || img.width;
  canvas.height = img.naturalHeight || img.height;
  const ctx = canvas.getContext('2d');
  if (!ctx || !canvas.width || !canvas.height) return img;

  ctx.drawImage(img, 0, 0);
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imageData.data;
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const brightness = (r + g + b) / 3;
    const lowSaturation = max - min <= saturationBand;

    if (brightness >= threshold && lowSaturation) {
      data[i + 3] = 0;
    }
  }
  ctx.putImageData(imageData, 0, 0);
  return canvas;
};

const drawCannonVector = (ctx: CanvasRenderingContext2D, angleDeg: number) => {
  ctx.save();
  ctx.rotate(-degreesToRadians(angleDeg));

  ctx.fillStyle = 'rgba(2,6,23,0.22)';
  ctx.beginPath();
  ctx.ellipse(-12, 34, 66, 14, 0, 0, Math.PI * 2);
  ctx.fill();

  // Base (simple cannon carriage)
  ctx.fillStyle = '#0f172a';
  drawRoundedRectPath(ctx, -44, 18, 72, 28, 14);
  ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.12)';
  drawRoundedRectPath(ctx, -40, 22, 64, 8, 8);
  ctx.fill();

  // Barrel
  const barrelGradient = ctx.createLinearGradient(-6, -10, 88, -10);
  barrelGradient.addColorStop(0, '#1f2937');
  barrelGradient.addColorStop(0.5, '#374151');
  barrelGradient.addColorStop(1, '#111827');
  ctx.fillStyle = barrelGradient;
  drawRoundedRectPath(ctx, -6, -12, 96, 24, 12);
  ctx.fill();

  ctx.fillStyle = 'rgba(255,255,255,0.18)';
  drawRoundedRectPath(ctx, 0, -8, 78, 6, 6);
  ctx.fill();

  // Muzzle rim
  ctx.fillStyle = '#0b1224';
  ctx.beginPath();
  ctx.ellipse(90, 0, 13, 12, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = 'rgba(148,163,184,0.5)';
  ctx.beginPath();
  ctx.ellipse(90, 0, 7, 6.5, 0, 0, Math.PI * 2);
  ctx.fill();

  // Pivot bolt
  ctx.fillStyle = '#0b1224';
  ctx.beginPath();
  ctx.arc(-6, 0, 10, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#cbd5e1';
  ctx.beginPath();
  ctx.arc(-6, 0, 4.5, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
};

const drawCannonSprite = (
  ctx: CanvasRenderingContext2D,
  angleDeg: number,
  sprites: CannonSprites,
  sizePx: number,
) => {
  const spriteKey = pickCannonSpriteKey(angleDeg);
  const image = sprites[spriteKey];
  if (!image) {
    drawCannonVector(ctx, angleDeg);
    return;
  }

  const normalizedAngle = toPositiveAngle(angleDeg);
  const baselineAngle = CANNON_BASELINE_DEG[spriteKey];

  ctx.save();
  ctx.rotate(degreesToRadians(baselineAngle - normalizedAngle));

  ctx.globalAlpha = 0.22;
  ctx.fillStyle = 'rgba(2,6,23,0.9)';
  ctx.beginPath();
  ctx.ellipse(-8, sizePx * 0.26, sizePx * 0.34, sizePx * 0.08, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.globalAlpha = 1;
  const anchorX = sizePx * 0.5;
  const anchorY = sizePx * 0.66;
  ctx.drawImage(image, -anchorX, -anchorY, sizePx, sizePx);
  ctx.restore();
};

type EnemyPlatform = 'podium' | 'cloud';

const drawEnemyPlatform = (ctx: CanvasRenderingContext2D, platform: EnemyPlatform, sizePx: number) => {
  if (platform === 'cloud') {
    const scale = Math.max(0.65, Math.min(1.25, sizePx / 220));
    drawCloud(ctx, 0, sizePx * 0.38, scale, 0.86);
    return;
  }

  drawWoodTower(ctx, sizePx);
};

const drawWoodTower = (ctx: CanvasRenderingContext2D, sizePx: number) => {
  ctx.save();
  ctx.translate(0, sizePx * 0.24);

  ctx.fillStyle = 'rgba(2,6,23,0.28)';
  ctx.beginPath();
  ctx.ellipse(0, sizePx * 0.23, sizePx * 0.43, sizePx * 0.11, 0, 0, Math.PI * 2);
  ctx.fill();

  const woodTop = ctx.createLinearGradient(0, -sizePx * 0.28, 0, sizePx * 0.48);
  woodTop.addColorStop(0, '#b66b24');
  woodTop.addColorStop(0.28, '#8f4e19');
  woodTop.addColorStop(0.58, '#6d3811');
  woodTop.addColorStop(1, '#40210b');
  ctx.fillStyle = woodTop;
  drawRoundedRectPath(ctx, -sizePx * 0.44, -sizePx * 0.18, sizePx * 0.88, sizePx * 0.18, sizePx * 0.08);
  ctx.fill();

  const towerGradient = ctx.createLinearGradient(0, -sizePx * 0.08, 0, sizePx * 0.58);
  towerGradient.addColorStop(0, '#c47a2c');
  towerGradient.addColorStop(0.4, '#9c5b1b');
  towerGradient.addColorStop(1, '#5b3010');
  ctx.fillStyle = towerGradient;
  drawRoundedRectPath(ctx, -sizePx * 0.26, -sizePx * 0.06, sizePx * 0.52, sizePx * 0.52, sizePx * 0.12);
  ctx.fill();

  ctx.fillStyle = 'rgba(255,255,255,0.2)';
  drawRoundedRectPath(ctx, -sizePx * 0.21, -sizePx * 0.02, sizePx * 0.08, sizePx * 0.42, sizePx * 0.05);
  drawRoundedRectPath(ctx, sizePx * 0.13, -sizePx * 0.02, sizePx * 0.08, sizePx * 0.42, sizePx * 0.05);
  ctx.fill();

  ctx.strokeStyle = 'rgba(255,226,170,0.26)';
  ctx.lineWidth = Math.max(2, sizePx * 0.028);
  for (let i = -1; i <= 2; i += 1) {
    const y = -sizePx * 0.02 + (i * sizePx * 0.14);
    ctx.beginPath();
    ctx.moveTo(-sizePx * 0.22, y);
    ctx.lineTo(sizePx * 0.22, y);
    ctx.stroke();
  }

  ctx.strokeStyle = 'rgba(45,18,7,0.35)';
  ctx.lineWidth = Math.max(2, sizePx * 0.024);
  ctx.beginPath();
  ctx.moveTo(-sizePx * 0.22, sizePx * 0.28);
  ctx.lineTo(-sizePx * 0.08, sizePx * 0.05);
  ctx.lineTo(sizePx * 0.08, sizePx * 0.05);
  ctx.lineTo(sizePx * 0.22, sizePx * 0.28);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(-sizePx * 0.22, sizePx * 0.16);
  ctx.lineTo(sizePx * 0.22, sizePx * 0.16);
  ctx.stroke();

  ctx.fillStyle = 'rgba(255,255,255,0.12)';
  drawRoundedRectPath(ctx, -sizePx * 0.44, sizePx * 0.28, sizePx * 0.88, sizePx * 0.16, sizePx * 0.08);
  ctx.fill();
  ctx.restore();
};

const drawEnemyPortrait = (ctx: CanvasRenderingContext2D, image: HTMLImageElement, sizePx: number) => {
  if (!image.complete) return;
  const diameter = sizePx * 0.62;
  const radius = diameter / 2;

  ctx.save();
  ctx.shadowColor = 'rgba(2,6,23,0.65)';
  ctx.shadowBlur = 18;
  ctx.shadowOffsetY = 10;
  ctx.beginPath();
  ctx.arc(0, 0, radius, 0, Math.PI * 2);
  ctx.closePath();
  ctx.fillStyle = 'rgba(15,23,42,0.35)';
  ctx.fill();
  ctx.restore();

  ctx.save();
  ctx.beginPath();
  ctx.arc(0, 0, radius, 0, Math.PI * 2);
  ctx.closePath();
  ctx.clip();

  const iw = image.naturalWidth || image.width;
  const ih = image.naturalHeight || image.height;
  const scale = Math.max(diameter / iw, diameter / ih);
  const dw = iw * scale;
  const dh = ih * scale;
  ctx.drawImage(image, -dw / 2, -dh / 2, dw, dh);
  ctx.restore();

  ctx.save();
  ctx.strokeStyle = 'rgba(226,232,240,0.9)';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(0, 0, radius, 0, Math.PI * 2);
  ctx.stroke();

  ctx.strokeStyle = 'rgba(56,189,248,0.5)';
  ctx.lineWidth = 8;
  ctx.beginPath();
  ctx.arc(0, 0, radius + 6, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
};

const formatTime = (seconds: number) => {
  const clamped = Math.max(0, Math.floor(seconds));
  const mins = Math.floor(clamped / 60);
  const secs = clamped % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

// Angle convention: 0° = right, 90° = up, 180° = left, 270° = down.
// Uses screen-space Y axis (down is positive), so we invert Y in vector conversion.
const getSideLaunchAngle = (angleDeg: number) => {
  const foldedAngle = angleDeg > 90 ? 180 - angleDeg : angleDeg;
  return clamp(foldedAngle, MIN_SIDE_LAUNCH_ANGLE, MAX_SIDE_LAUNCH_ANGLE);
};

const solveSideLaunchSpeed = (angleDeg: number, targetX: number, targetY: number) => {
  const radians = degreesToRadians(angleDeg);
  const cos = Math.max(0.18, Math.cos(radians));
  const tan = Math.tan(radians);
  const denominator = 2 * cos * cos * ((targetX * tan) - targetY);
  if (denominator <= 0) return 520;
  return Math.sqrt((PROJECTILE_GRAVITY * targetX * targetX) / denominator);
};

const getSideTargetWorld = (viewWidth: number, viewHeight: number) => ({
  x: clamp(viewWidth * 3.65, 1280, 2200),
  y: -clamp(viewHeight * 0.2, 96, 170),
});

const buildProjectile = (
  answerAngleDeg: number,
  targetX: number,
  targetY: number,
  shouldHit: boolean,
): ProjectileState => {
  const launchAngle = getSideLaunchAngle(answerAngleDeg);
  const dir = angleToVector(launchAngle);
  const solvedSpeed = solveSideLaunchSpeed(launchAngle, targetX, targetY);
  const missBias = answerAngleDeg % 2 === 0 ? 0.78 : 1.18;
  const speed = shouldHit ? solvedSpeed : solvedSpeed * missBias;
  return {
    x: 0,
    y: 0,
    vx: dir.x * speed,
    vy: dir.y * speed,
    active: true,
    shouldHit,
    targetX,
    targetY,
    trail: [],
  };
};

const stepProjectile = (projectile: ProjectileState, dt: number) => {
  if (!projectile.active) return projectile;
  const seconds = dt / 1000;
  const nextVY = projectile.vy + (PROJECTILE_GRAVITY * seconds);
  const nextX = projectile.x + projectile.vx * seconds;
  const nextY = projectile.y + projectile.vy * seconds + (0.5 * PROJECTILE_GRAVITY * seconds * seconds);
  const trail = [...projectile.trail, { x: nextX, y: nextY, alpha: 1 }].slice(-18);
  const faded = trail.map((point, index) => ({
    ...point,
    alpha: (index + 1) / trail.length,
  }));
  return { ...projectile, x: nextX, y: nextY, vy: nextVY, trail: faded };
};

const normalizeVector = (x: number, y: number) => {
  const magnitude = Math.hypot(x, y);
  if (magnitude <= 0) return { x: 0, y: 0 };
  return { x: x / magnitude, y: y / magnitude };
};

const AngleArenaGame: React.FC<AngleArenaGameShellProps> = ({
  levelId,
  useSharedTopHud: _useSharedTopHud = true,
  onVictory,
  onGameOver,
  onBack,
  sessionState,
  sessionEvents,
  questions: questionsProp,
  onRoundComplete,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationRef = useRef<number | null>(null);
  const lastFrameRef = useRef<number | null>(null);
  const hitShakeRef = useRef<number | null>(null);
  const desiredAngleRef = useRef(40);
  const selectedAnswerRef = useRef<number | null>(null);
  const scoreRef = useRef(0);
  const cameraRef = useRef({ x: 0, y: 0 });
  const cameraTargetRef = useRef({ x: 0, y: 0 });
  const isFollowingProjectileRef = useRef(false);
  const settleTimeoutRef = useRef<number | null>(null);
  const autoAdvanceTimeoutRef = useRef<number | null>(null);
  const projectileRef = useRef<ProjectileState | null>(null);
  const impactResultRef = useRef<ImpactResult | null>(null);
  const impactPositionRef = useRef({ x: 0, y: 0 });
  const aimTimeoutRef = useRef<number | null>(null);
  const cannonSpritesRef = useRef<CannonSprites>({});
  const enemySpritesRef = useRef<HTMLImageElement[]>([]);

  const [gameState, setGameState] = useState<GameState>('intro');
  const [questionIndex, setQuestionIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [feedback, setFeedback] = useState('');
  const [score, setScore] = useState(0);
  const [localLives, setLocalLives] = useState(INITIAL_LIVES);
  const [localTimer, setLocalTimer] = useState(INITIAL_TIMER);
  const [stars, setStars] = useState(0);
  const cameraHomeRef = useRef({ x: 0, y: 0 });

  const rawQuestions = useMemo(
    () => questionsProp || buildAngleQuestions({
      level: levelId,
      launcherX: 0,
      groundY: 0,
      gravity: 0,
    }),
    [levelId, questionsProp],
  );
  const questions = useMemo(() => rawQuestions, [rawQuestions]);
  const activeQuestion = questions[questionIndex];

  const lives = sessionState?.lives ?? localLives;
  const timeLeft = sessionState?.timeLeft ?? localTimer;
  const totalTime = sessionState?.totalTime ?? INITIAL_TIMER;

  useEffect(() => {
    setGameState('awaitingAnswer');
  }, []);

  useEffect(() => {
    if (sessionState) return;
    setLocalTimer(INITIAL_TIMER);
    const interval = window.setInterval(() => {
      setLocalTimer((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => window.clearInterval(interval);
  }, [sessionState]);

  useEffect(() => {
    if (!sessionState) return;
    if (sessionState.timeLeft <= 0 || sessionState.lives <= 0) {
      setGameState('gameOver');
      emitMiniGameSessionEvent(sessionEvents, 'game_failed', {
        score: scoreRef.current,
        reason: sessionState.timeLeft <= 0 ? 'time' : 'lives',
      });
      onGameOver(scoreRef.current);
    }
  }, [onGameOver, sessionEvents, sessionState]);

  useEffect(() => {
    if (sessionState) return;
    if (timeLeft <= 0 || lives <= 0) {
      setGameState('gameOver');
      onGameOver(scoreRef.current);
    }
  }, [lives, onGameOver, sessionState, timeLeft]);

  useEffect(() => {
    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
      if (aimTimeoutRef.current) window.clearTimeout(aimTimeoutRef.current);
      if (settleTimeoutRef.current) window.clearTimeout(settleTimeoutRef.current);
      if (autoAdvanceTimeoutRef.current) window.clearTimeout(autoAdvanceTimeoutRef.current);
    };
  }, []);

  useEffect(() => {
    const load = (key: CannonSpriteKey, src: string) => {
      const img = new Image();
      img.src = src;
      img.onload = () => {
        const processed = alphaKeyNearWhite(img);
        cannonSpritesRef.current = { ...cannonSpritesRef.current, [key]: processed };
      };
    };
    load('left', cannonFacingLeftSrc);
    load('right', cannonFacingRightSrc);
    load('up', cannonFacingUpSrc);
  }, []);

  useEffect(() => {
    const sources = BOSS_ART_LIBRARY;
    sources.forEach((src, index) => {
      const img = new Image();
      img.src = src;
      img.onload = () => {
        const next = [...enemySpritesRef.current];
        next[index] = img;
        enemySpritesRef.current = next;
      };
    });
  }, []);

  const resetForNext = () => {
    setSelectedAnswer(null);
    selectedAnswerRef.current = null;
    setFeedback('');
    impactResultRef.current = null;
    projectileRef.current = null;
    cameraRef.current = { ...cameraHomeRef.current };
    cameraTargetRef.current = { ...cameraHomeRef.current };
    isFollowingProjectileRef.current = false;
    setGameState('awaitingAnswer');
  };

  const finishLevel = (finalScore: number) => {
    const earnedStars = Math.min(3, Math.max(1, Math.floor(finalScore / 450)));
    setStars(earnedStars);
    setGameState('levelComplete');
    emitMiniGameSessionEvent(sessionEvents, 'game_complete', {
      score: finalScore,
      stars: earnedStars,
      metadata: {
        correct: finalScore / POINTS_PER_HIT,
      },
    });
    onVictory(earnedStars, finalScore);
  };

  const handleResolve = (result: ImpactResult) => {
    if (impactResultRef.current) return;
    impactResultRef.current = result;
    cameraTargetRef.current = {
      x: impactPositionRef.current.x + cameraHomeRef.current.x,
      y: impactPositionRef.current.y + cameraHomeRef.current.y,
    };
    if (settleTimeoutRef.current) window.clearTimeout(settleTimeoutRef.current);
    settleTimeoutRef.current = window.setTimeout(() => {
      cameraTargetRef.current = { ...cameraHomeRef.current };
      isFollowingProjectileRef.current = false;
    }, result === 'hit' ? 1350 : 680);

    if (result === 'hit') {
      const nextScore = scoreRef.current + POINTS_PER_HIT;
      scoreRef.current = nextScore;
      setScore(nextScore);
      setStars((prev) => Math.min(3, Math.max(prev, Math.floor(nextScore / 450))));
      setFeedback('Lookout cleared!');
      triggerHaptic('success');
      onRoundComplete?.(true);
      setGameState('resolvedCorrect');
    } else {
      const correctAngle = activeQuestion?.correctAnswer;
      setFeedback(`Missed! The correct angle was ${correctAngle ?? '--'}°.`);
      triggerHaptic('error');
      onRoundComplete?.(false);
      if (!sessionState) {
        setLocalLives((prev) => Math.max(0, prev - 1));
      }
      setGameState('resolvedIncorrect');
    }

    if (result === 'hit') {
      hitShakeRef.current = performance.now() + HIT_SHAKE_DURATION;
    }
  };

  const fireProjectile = (angleDeg?: number) => {
    if (!activeQuestion) return;
    const resolvedAngle = Number.isFinite(angleDeg) ? (angleDeg as number) : desiredAngleRef.current;
    const canvas = canvasRef.current;
    const viewWidth = canvas ? canvas.width / window.devicePixelRatio : 390;
    const viewHeight = canvas ? canvas.height / window.devicePixelRatio : 560;
    const targetWorld = getSideTargetWorld(viewWidth, viewHeight);
    projectileRef.current = buildProjectile(
      resolvedAngle,
      targetWorld.x,
      targetWorld.y,
      resolvedAngle === activeQuestion.correctAnswer,
    );
    cameraTargetRef.current = { ...cameraHomeRef.current };
    isFollowingProjectileRef.current = true;
    setGameState('projectileFlight');
  };

  const handleAnswer = (answer: number) => {
    if (gameState !== 'awaitingAnswer' || !activeQuestion) return;
    selectedAnswerRef.current = answer;
    setSelectedAnswer(answer);
    setFeedback('');
    desiredAngleRef.current = answer;
    setGameState('aiming');
    if (aimTimeoutRef.current) window.clearTimeout(aimTimeoutRef.current);
    aimTimeoutRef.current = window.setTimeout(() => {
      setGameState('firing');
      fireProjectile(answer);
    }, AIM_DELAY);
  };

  useEffect(() => {
    if (selectedAnswer !== null) {
      desiredAngleRef.current = selectedAnswer;
      selectedAnswerRef.current = selectedAnswer;
    } else {
      selectedAnswerRef.current = null;
    }
  }, [selectedAnswer]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const resizeCanvas = () => {
      const parent = canvas.parentElement;
      if (!parent) return;
      const { width, height } = parent.getBoundingClientRect();
      canvas.width = Math.max(1, Math.floor(width * window.devicePixelRatio));
      canvas.height = Math.max(1, Math.floor(height * window.devicePixelRatio));
    };
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    return () => window.removeEventListener('resize', resizeCanvas);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const draw = (timestamp: number) => {
      if (lastFrameRef.current === null) lastFrameRef.current = timestamp;
      const delta = timestamp - lastFrameRef.current;
      lastFrameRef.current = timestamp;

      const viewWidth = canvas.width / window.devicePixelRatio;
      const viewHeight = canvas.height / window.devicePixelRatio;
      const launcherAnchorScreen = {
        x: viewWidth * LAUNCHER_SCREEN_X_RATIO,
        y: viewHeight * LAUNCHER_SCREEN_Y_RATIO,
      };
      cameraHomeRef.current = {
        x: (viewWidth / 2) - launcherAnchorScreen.x,
        y: (viewHeight / 2) - launcherAnchorScreen.y,
      };

      if (projectileRef.current?.active) {
        projectileRef.current = stepProjectile(projectileRef.current, delta);
      }

      const projectile = projectileRef.current;
      const correctAnswer = activeQuestion?.correctAnswer ?? 0;
      const allowHit = selectedAnswerRef.current === correctAnswer;
      const enemyWorld = getSideTargetWorld(viewWidth, viewHeight);
      const showSideSetup = !projectile?.active && !impactResultRef.current;
      if (showSideSetup) {
        cameraRef.current = { ...cameraHomeRef.current };
        cameraTargetRef.current = { ...cameraHomeRef.current };
      }

      if (projectile?.active) {
        const crossedTarget = projectile.shouldHit && projectile.x >= projectile.targetX;
        if (crossedTarget) {
          projectile.x = projectile.targetX;
          projectile.y = projectile.targetY;
        }
        const hit = allowHit && (
          crossedTarget ||
          distance(projectile.x, projectile.y, enemyWorld.x, enemyWorld.y) <= TARGET_RADIUS + PROJECTILE_RADIUS
        );
        if (hit) {
          projectile.active = false;
          impactPositionRef.current = { ...enemyWorld };
          handleResolve('hit');
        }

        const flightDistance = Math.hypot(projectile.x, projectile.y);
        const hasLandedPastTarget = projectile.x > enemyWorld.x + 130 && projectile.y > 36;
        const hasDroppedBelowGround = projectile.y > Math.max(96, viewHeight * 0.22);
        if (projectile.active && (flightDistance > MAX_FLIGHT_DISTANCE || hasLandedPastTarget || hasDroppedBelowGround)) {
          projectile.active = false;
          impactPositionRef.current = { x: projectile.x, y: projectile.y };
          handleResolve('miss');
        }
      }

      if (projectile?.active && isFollowingProjectileRef.current) {
        const travel = normalizeVector(projectile.vx, projectile.vy);
        cameraTargetRef.current = {
          x: projectile.x - (travel.x * CAMERA_LEAD_DISTANCE) + cameraHomeRef.current.x,
          y: projectile.y - (travel.y * CAMERA_LEAD_DISTANCE) + cameraHomeRef.current.y,
        };
      } else if (!projectile?.active && isFollowingProjectileRef.current && !impactResultRef.current) {
        isFollowingProjectileRef.current = false;
        cameraTargetRef.current = { ...cameraHomeRef.current };
      }

      const camera = cameraRef.current;
      const followStrength = isFollowingProjectileRef.current && projectile?.active ? CAMERA_LERP : RETURN_LERP;
      camera.x = lerp(camera.x, cameraTargetRef.current.x, followStrength);
      camera.y = lerp(camera.y, cameraTargetRef.current.y, followStrength);
      camera.x = clamp(camera.x, -WORLD_RADIUS, WORLD_RADIUS);
      camera.y = clamp(camera.y, -WORLD_RADIUS, WORLD_RADIUS);

      let shakeX = 0;
      let shakeY = 0;
      if (hitShakeRef.current && timestamp < hitShakeRef.current) {
        const phase = (hitShakeRef.current - timestamp) / HIT_SHAKE_DURATION;
        const strength = 4 * phase;
        shakeX = Math.sin(timestamp * 0.04) * strength;
        shakeY = Math.cos(timestamp * 0.05) * strength;
      }

      ctx.save();
      ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
      ctx.translate(shakeX, shakeY);
      ctx.clearRect(0, 0, viewWidth, viewHeight);
      drawSkyBackground(ctx, viewWidth, viewHeight, timestamp, camera.x, camera.y, Boolean(projectile?.active));

      const toScreen = (x: number, y: number) => worldToScreen(x, y, camera.x, camera.y, viewWidth, viewHeight);

      const originScreen = toScreen(0, 0);
      const enemyScreen = toScreen(enemyWorld.x, enemyWorld.y);
      const revealEnemy = Boolean(
        impactResultRef.current === 'hit'
        || (projectile && (projectile.x > enemyWorld.x - (viewWidth * 0.95) || enemyScreen.x < viewWidth * 1.12))
      );
      const skyOffsetX = camera.x * SKY_DRIFT_FACTOR;
      const skyOffsetY = camera.y * SKY_DRIFT_FACTOR * 0.45;
      const groundOffsetX = camera.x * GROUND_DRIFT_FACTOR;
      const groundOffsetY = camera.y * GROUND_DRIFT_FACTOR * 0.2;

      ctx.strokeStyle = 'rgba(148,163,184,0.4)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(originScreen.x, originScreen.y, WORLD_RADIUS * 0.35, 0, Math.PI * 2);
      ctx.stroke();

      ctx.save();
      ctx.globalAlpha = projectile?.active ? 0.32 : 0.14;
      ctx.fillStyle = 'rgba(255,255,255,0.45)';
      ctx.fillRect((viewWidth * 0.1) - skyOffsetX, (viewHeight * 0.11) - skyOffsetY, viewWidth * 0.11, 4);
      ctx.fillRect((viewWidth * 0.44) - (skyOffsetX * 0.7), (viewHeight * 0.17) - (skyOffsetY * 0.6), viewWidth * 0.08, 3);
      ctx.fillRect((viewWidth * 0.75) - (skyOffsetX * 0.55), (viewHeight * 0.22) - (skyOffsetY * 0.45), viewWidth * 0.09, 4);
      ctx.restore();

      ctx.save();
      ctx.globalAlpha = projectile?.active ? 0.28 : 0.12;
      ctx.strokeStyle = 'rgba(255,255,255,0.28)';
      ctx.lineWidth = 1.5;
      for (let i = -1; i <= 5; i += 1) {
        const y = (viewHeight * 0.76) + (i * 18) + groundOffsetY;
        ctx.beginPath();
        ctx.moveTo(((-60 + groundOffsetX) % 120) - 120, y);
        ctx.lineTo(viewWidth + 120, y);
        ctx.stroke();
      }
      ctx.restore();

      if (projectile?.active) {
        ctx.save();
        ctx.globalAlpha = 0.18;
        ctx.strokeStyle = 'rgba(255,255,255,0.55)';
        ctx.lineWidth = 2;
        for (let i = 0; i < 10; i += 1) {
          const streakX = ((timestamp * 0.42) + (i * 97) - (camera.x * 0.9)) % (viewWidth + 260) - 180;
          const streakY = (viewHeight * 0.18) + ((i % 7) * viewHeight * 0.085);
          ctx.beginPath();
          ctx.moveTo(streakX, streakY);
          ctx.lineTo(streakX + 70, streakY - 10);
          ctx.stroke();
        }
        ctx.restore();
      }

      if ((gameState === 'aiming' || gameState === 'awaitingAnswer') && selectedAnswerRef.current !== null) {
        const aimingAngle = getSideLaunchAngle(selectedAnswerRef.current ?? desiredAngleRef.current);
        const aimVector = angleToVector(aimingAngle);
        const aimEndWorld = { x: aimVector.x * 160, y: aimVector.y * 160 };
        const aimEndScreen = toScreen(aimEndWorld.x, aimEndWorld.y);
        ctx.strokeStyle = 'rgba(125,211,252,0.8)';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(originScreen.x, originScreen.y);
        ctx.lineTo(aimEndScreen.x, aimEndScreen.y);
        ctx.stroke();
        ctx.fillStyle = 'rgba(125,211,252,0.9)';
        ctx.beginPath();
        ctx.arc(aimEndScreen.x, aimEndScreen.y, 6, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.save();
      ctx.translate(originScreen.x, originScreen.y + 10);
      drawWoodTower(ctx, Math.min(viewWidth, viewHeight) * 0.28);
      ctx.restore();

      ctx.save();
      ctx.translate(originScreen.x, originScreen.y + 4);
      drawCannonSprite(ctx, getSideLaunchAngle(desiredAngleRef.current), cannonSpritesRef.current, Math.min(viewWidth, viewHeight) * 0.22);
      ctx.restore();

      if (revealEnemy) {
        ctx.save();
        if (projectile?.active) {
          ctx.translate(Math.sin(timestamp * 0.02) * 2, Math.cos(timestamp * 0.018) * 1.5);
        }
        ctx.translate(enemyScreen.x, enemyScreen.y);
        const enemySize = Math.min(viewWidth, viewHeight) * 0.26;
        const platform: EnemyPlatform = questionIndex % 2 === 0 ? 'podium' : 'cloud';
        drawEnemyPlatform(ctx, platform, enemySize);

        const enemies = enemySpritesRef.current;
        const enemyIndex = enemies.length ? (questionIndex % enemies.length) : 0;
        const enemy = enemies[enemyIndex];
        if (enemy) {
          ctx.save();
          ctx.translate(0, -enemySize * 0.12);
          drawEnemyPortrait(ctx, enemy, enemySize);
          ctx.restore();
        } else {
          ctx.fillStyle = 'rgba(250,204,21,0.85)';
          ctx.beginPath();
          ctx.arc(0, -enemySize * 0.1, enemySize * 0.12, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();
      }

      if (projectile) {
        projectile.trail.forEach((point) => {
          const trailScreen = toScreen(point.x, point.y);
          ctx.fillStyle = `rgba(125,211,252,${0.35 * point.alpha})`;
          ctx.beginPath();
          ctx.arc(trailScreen.x, trailScreen.y, 6 * point.alpha, 0, Math.PI * 2);
          ctx.fill();
        });

        const projectileScreen = toScreen(projectile.x, projectile.y);
        ctx.fillStyle = '#f8fafc';
        ctx.beginPath();
        ctx.arc(projectileScreen.x, projectileScreen.y, PROJECTILE_RADIUS, 0, Math.PI * 2);
        ctx.fill();
      }

      if (impactResultRef.current === 'hit' && revealEnemy) {
        ctx.fillStyle = 'rgba(250,204,21,0.45)';
        ctx.beginPath();
        ctx.arc(enemyScreen.x, enemyScreen.y, 34, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.restore();

      animationRef.current = requestAnimationFrame(draw);
    };

    animationRef.current = requestAnimationFrame(draw);
    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
      animationRef.current = null;
    };
  }, [activeQuestion, gameState, selectedAnswer]);

  const handleNext = () => {
    if (gameState !== 'resolvedCorrect' && gameState !== 'resolvedIncorrect') return;
    if (gameState === 'resolvedIncorrect' && !sessionState && lives <= 0) {
      setGameState('gameOver');
      onGameOver(scoreRef.current);
      return;
    }
    if (questionIndex >= questions.length - 1) {
      finishLevel(scoreRef.current);
      return;
    }
    setQuestionIndex((prev) => prev + 1);
    resetForNext();
  };

  useEffect(() => {
    if (gameState !== 'resolvedCorrect' && gameState !== 'resolvedIncorrect') {
      if (autoAdvanceTimeoutRef.current) window.clearTimeout(autoAdvanceTimeoutRef.current);
      autoAdvanceTimeoutRef.current = null;
      return;
    }

    if (autoAdvanceTimeoutRef.current) window.clearTimeout(autoAdvanceTimeoutRef.current);
    autoAdvanceTimeoutRef.current = window.setTimeout(() => {
      handleNext();
    }, gameState === 'resolvedCorrect' ? 1500 : 900);
  }, [gameState]);

  const showPromptAndAnswers = gameState === 'awaitingAnswer';

  return (
    <GameUiShell className="bg-transparent !bg-none ![background-image:none] ![background-color:transparent]" overlayDisabled>
      <div className="relative h-full w-full overflow-hidden text-white">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 z-0 bg-[linear-gradient(180deg,#bfeaff_0%,#7dd3fc_36%,#60a5fa_66%,#1e3a8a_100%)]"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 z-0 bg-[radial-gradient(circle_at_14%_16%,rgba(255,255,255,0.75),transparent_22%),radial-gradient(circle_at_36%_10%,rgba(255,255,255,0.55),transparent_18%),radial-gradient(circle_at_72%_18%,rgba(255,255,255,0.62),transparent_24%),radial-gradient(circle_at_86%_14%,rgba(255,255,255,0.45),transparent_18%)] opacity-70"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute left-1/2 top-[58%] z-0 -translate-x-1/2 -translate-y-1/2"
        >
          <div className="relative h-[8.25rem] w-[19rem] rounded-[999px] bg-[radial-gradient(ellipse_at_center,rgba(34,197,94,0.9),rgba(21,128,61,0.95)_55%,rgba(15,23,42,0.0)_72%)]">
            <div className="absolute inset-0 rounded-[999px] bg-[radial-gradient(circle_at_30%_35%,rgba(253,230,138,0.22),transparent_30%),radial-gradient(circle_at_70%_45%,rgba(167,243,208,0.18),transparent_36%)]" />
            <div className="absolute inset-x-6 bottom-6 h-8 rounded-[999px] bg-[linear-gradient(180deg,rgba(74,222,128,0.55),rgba(21,128,61,0.0))] blur-[0.5px]" />
          </div>
        </div>
        <canvas
          ref={canvasRef}
          className="absolute inset-0 z-10 h-full w-full"
         />
        <GameScreenLayout
          className="relative z-20 px-3 pb-[calc(env(safe-area-inset-bottom)+0.6rem)] pt-2"
          topClassName="!min-h-0 flex flex-col items-center gap-0 px-2 pt-0 sm:px-3 md:px-4"
          top={(
            <div className="flex w-full flex-col gap-1">
              <GameTopBar
                onBack={onBack}
                progressLabel={`Question ${questionIndex + 1} / ${questions.length}`}
                lives={lives}
                audioEnabled
                className="w-full"
              />

              <GameQuestionCard
                title="Angle Arena"
                subtitle="Choose the correct angle to clear the lookout."
                className="w-full"
              >
                {activeQuestion?.prompt ?? 'Choose the correct angle to hit the Monster Mind.'}
              </GameQuestionCard>
            </div>
          )}
          main={<div className="min-h-0 flex-1" />}
          bottom={(
            <div className="flex flex-col gap-2">
              <div className={`w-full transition-all duration-300 ${showPromptAndAnswers ? 'max-h-[320px] opacity-100' : 'pointer-events-none max-h-0 opacity-0'}`}>
                <div className="answer-choice-surface mx-auto grid w-full max-w-[44rem] grid-cols-4 gap-1.5">
                  {(activeQuestion?.options ?? []).map((option) => (
                    <button
                      key={option}
                      type="button"
                      onClick={() => handleAnswer(option)}
                      disabled={gameState !== 'awaitingAnswer'}
                      className={`inline-flex min-h-[2.8rem] items-center justify-center rounded-[1rem] px-2 py-2 text-[clamp(11px,1.6vh,15px)] font-black whitespace-nowrap disabled:cursor-not-allowed disabled:opacity-55 ${
                        gameState === 'resolvedCorrect' && selectedAnswer === option
                          ? 'ui-button-success'
                          : selectedAnswer === option
                            ? 'ui-button-primary'
                            : 'ui-button-secondary'
                      }`}
                    >
                      {option}°
                    </button>
                  ))}
                </div>
                {selectedAnswer !== null ? (
                  <div className="mt-1 text-center text-[11px] font-bold uppercase tracking-[0.16em] text-cyan-100/80">
                    Launch angle locked: {selectedAnswer}°
                  </div>
                ) : null}
              </div>
              <FeedbackStrip className="w-full" tone={gameState === 'resolvedCorrect' ? 'success' : gameState === 'resolvedIncorrect' ? 'warning' : 'neutral'}>
                {feedback || (selectedAnswer !== null ? `Angle ${selectedAnswer}° locked in.` : 'Choose an angle to strike the Monster Mind.')}
              </FeedbackStrip>
              {gameState === 'resolvedCorrect' || gameState === 'resolvedIncorrect' ? (
                <div className="flex w-full items-center gap-2">
                  <PrimaryButton onClick={handleNext} className="flex-1">
                    Next
                  </PrimaryButton>
                  <SecondaryButton onClick={resetForNext}>
                    Reset View
                  </SecondaryButton>
                </div>
              ) : null}
            </div>
          )}
        />
      </div>
    </GameUiShell>
  );
};

export default AngleArenaGame;



