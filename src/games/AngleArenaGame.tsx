import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useIsPresent } from 'motion/react';
import {
  emitMiniGameSessionEvent,
  MiniGameShellContractProps,
} from '../app/gameplaySessionContract';
import { triggerHaptic } from '../haptics';
import { GAME_AUDIO_STORAGE_KEY } from '../gameHudEvents';
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
import { GAME_SCENE_META } from '../gameSceneMeta';
import angleArenaLaunchSfxSrc from '../AngryBirdsRemakeUnity-main/AngryBirdsRemakeUnity-main/Assets/Sounds/bird shot-a1.wav';
import angleArenaHitSfxSrc from '../AngryBirdsRemakeUnity-main/AngryBirdsRemakeUnity-main/Assets/Sounds/pig/piglette destroyed.wav';
import angleArenaWoodSfxSrc from '../AngryBirdsRemakeUnity-main/AngryBirdsRemakeUnity-main/Assets/Sounds/8d82b5_Angry_Birds_Wood_Damage_Sound_Effect.mp3';
import angleArenaFailSfxSrc from '../AngryBirdsRemakeUnity-main/AngryBirdsRemakeUnity-main/Assets/Sounds/Level/level failed piglets a1.mp3';
import angleArenaCompleteSfxSrc from '../AngryBirdsRemakeUnity-main/AngryBirdsRemakeUnity-main/Assets/Sounds/Level/level clear military 1.mp3';
import goblinMonster from '../assets/enemies/cohesive/goblin.webp';
import MonsterMindActor, { type MonsterMindReaction } from '../components/game-ui/MonsterMindActor';
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

type AngleArenaSfxKey = 'launch' | 'hit' | 'wood' | 'fail' | 'complete';

type ProjectileState = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  active: boolean;
  trail: { x: number; y: number; alpha: number }[];
};

const AIM_DELAY = 360;
const HIT_SHAKE_DURATION = 520;
const PROJECTILE_RADIUS = 10;
const TARGET_RADIUS = 34;
const INITIAL_TIMER = 90;
const INITIAL_LIVES = 3;
const POINTS_PER_HIT = 250;
const WORLD_RADIUS = 720;
const ENEMY_DISTANCE = 520;
const CAMERA_LERP = 0.08;
const RETURN_LERP = 0.12;
const PROJECTILE_SPEED = 520;
const MAX_FLIGHT_DISTANCE = 980;
const CANNON_ANCHOR_X_RATIO = 0.5;
const CANNON_ANCHOR_Y_RATIO = 0.5;
const CAMERA_LEAD_DISTANCE = 340;
const CAMERA_ACTIVE_LERP = 0.22;
const ENEMY_FOREGROUND_LEAD = 110;
const SKY_DRIFT_FACTOR = 0.14;
const GROUND_DRIFT_FACTOR = 0.28;

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

const makeImage = (src: string) => {
  const img = new Image();
  img.decoding = 'async';
  img.src = src;
  return img;
};

const drawGlowingBallProjectile = (ctx: CanvasRenderingContext2D, radius: number, pulse = 0) => {
  ctx.save();
  const glow = ctx.createRadialGradient(0, 0, radius * 0.08, 0, 0, radius * 2.1);
  glow.addColorStop(0, 'rgba(255,255,255,0.98)');
  glow.addColorStop(0.28 + pulse * 0.04, 'rgba(236,255,170,0.95)');
  glow.addColorStop(0.58, 'rgba(74,222,128,0.85)');
  glow.addColorStop(1, 'rgba(20,83,45,0)');
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(0, 0, radius * 2.1, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#f8fafc';
  ctx.beginPath();
  ctx.arc(0, 0, radius, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = 'rgba(255,255,255,0.42)';
  ctx.beginPath();
  ctx.arc(-radius * 0.3, -radius * 0.28, radius * 0.42, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = 'rgba(34,197,94,0.55)';
  ctx.beginPath();
  ctx.moveTo(radius * 0.72, -radius * 0.16);
  ctx.lineTo(radius * 1.28, 0);
  ctx.lineTo(radius * 0.72, radius * 0.18);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = '#0f172a';
  ctx.beginPath();
  ctx.arc(radius * 0.06, -radius * 0.22, radius * 0.1, 0, Math.PI * 2);
  ctx.arc(radius * 0.32, -radius * 0.22, radius * 0.1, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = 'rgba(34,197,94,0.58)';
  ctx.lineWidth = Math.max(1.5, radius * 0.08);
  ctx.beginPath();
  ctx.arc(-radius * 0.1, radius * 0.22, radius * 0.42, Math.PI * 0.08, Math.PI * 0.92);
  ctx.stroke();

  ctx.globalAlpha = 0.45 + pulse * 0.2;
  ctx.fillStyle = '#a7f3d0';
  ctx.beginPath();
  ctx.arc(0, 0, radius * 1.12, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
};

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

  ctx.save();
  ctx.translate(0, sizePx * 0.36);
  ctx.fillStyle = 'rgba(2,6,23,0.3)';
  ctx.beginPath();
  ctx.ellipse(0, sizePx * 0.22, sizePx * 0.42, sizePx * 0.12, 0, 0, Math.PI * 2);
  ctx.fill();

  const pedestalGradient = ctx.createLinearGradient(0, -sizePx * 0.35, 0, sizePx * 0.45);
  pedestalGradient.addColorStop(0, 'rgba(148,163,184,0.55)');
  pedestalGradient.addColorStop(0.55, 'rgba(71,85,105,0.72)');
  pedestalGradient.addColorStop(1, 'rgba(15,23,42,0.9)');
  ctx.fillStyle = pedestalGradient;
  drawRoundedRectPath(ctx, -sizePx * 0.42, -sizePx * 0.18, sizePx * 0.84, sizePx * 0.34, sizePx * 0.14);
  ctx.fill();

  ctx.fillStyle = 'rgba(255,255,255,0.16)';
  drawRoundedRectPath(ctx, -sizePx * 0.38, -sizePx * 0.14, sizePx * 0.76, sizePx * 0.08, sizePx * 0.08);
  ctx.fill();
  ctx.restore();
};

const drawWoodenTower = (
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  accent = 1,
) => {
  ctx.save();
  ctx.translate(-width / 2, -height);

  const woodGrad = ctx.createLinearGradient(0, 0, 0, height);
  woodGrad.addColorStop(0, '#d79a52');
  woodGrad.addColorStop(0.35, '#b57032');
  woodGrad.addColorStop(0.75, '#7a461c');
  woodGrad.addColorStop(1, '#4a2a11');

  // Main timber stack.
  ctx.fillStyle = woodGrad;
  drawRoundedRectPath(ctx, width * 0.18, height * 0.08, width * 0.64, height * 0.74, width * 0.06);
  ctx.fill();

  // Cross braces.
  ctx.strokeStyle = 'rgba(77, 39, 14, 0.88)';
  ctx.lineWidth = Math.max(2, width * 0.04);
  ctx.beginPath();
  ctx.moveTo(width * 0.22, height * 0.2);
  ctx.lineTo(width * 0.78, height * 0.68);
  ctx.moveTo(width * 0.78, height * 0.2);
  ctx.lineTo(width * 0.22, height * 0.68);
  ctx.stroke();

  // Side posts.
  ctx.fillStyle = 'rgba(97, 56, 22, 0.95)';
  ctx.fillRect(width * 0.12, height * 0.1, width * 0.08, height * 0.7);
  ctx.fillRect(width * 0.8, height * 0.1, width * 0.08, height * 0.7);

  // Planks.
  ctx.fillStyle = 'rgba(158, 92, 38, 0.96)';
  for (let i = 0; i < 4; i += 1) {
    const plankY = height * (0.16 + i * 0.16);
    ctx.fillRect(width * 0.16, plankY, width * 0.68, height * 0.06);
  }

  // Top platform.
  ctx.fillStyle = 'rgba(191, 124, 63, 0.98)';
  ctx.fillRect(width * 0.1, height * 0.04, width * 0.8, height * 0.08);
  ctx.fillStyle = 'rgba(85, 48, 19, 0.8)';
  ctx.fillRect(width * 0.14, height * 0.01, width * 0.72, height * 0.04);

  // Decorative rope / lashings to sell the timber look.
  ctx.strokeStyle = 'rgba(245, 220, 173, 0.42)';
  ctx.lineWidth = Math.max(1.5, width * 0.018);
  for (let i = 0; i < 3; i += 1) {
    const wrapY = height * (0.2 + i * 0.2);
    ctx.beginPath();
    ctx.moveTo(width * 0.2, wrapY);
    ctx.lineTo(width * 0.8, wrapY);
    ctx.stroke();
  }

  // Keep the tower readable without drawing full sprite sheets over the playfield.
  ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
  ctx.fillRect(width * 0.22, height * 0.12, width * 0.1, height * 0.62);
  ctx.fillRect(width * 0.66, height * 0.18, width * 0.08, height * 0.52);

  ctx.fillStyle = `rgba(34, 20, 12, ${0.18 * accent})`;
  ctx.fillRect(width * 0.1, height * 0.86, width * 0.8, height * 0.1);

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
const buildProjectile = (angleDeg: number, speed: number): ProjectileState => {
  const dir = angleToVector(angleDeg);
  return {
    x: 0,
    y: 0,
    vx: dir.x * speed,
    vy: dir.y * speed,
    active: true,
    trail: [],
  };
};

const stepProjectile = (projectile: ProjectileState, dt: number) => {
  if (!projectile.active) return projectile;
  const nextX = projectile.x + projectile.vx * (dt / 1000);
  const nextY = projectile.y + projectile.vy * (dt / 1000);
  const trail = [...projectile.trail, { x: nextX, y: nextY, alpha: 1 }].slice(-18);
  const faded = trail.map((point, index) => ({
    ...point,
    alpha: (index + 1) / trail.length,
  }));
  return { ...projectile, x: nextX, y: nextY, trail: faded };
};

const segmentHitsTarget = (
  from: { x: number; y: number },
  to: { x: number; y: number },
  target: { x: number; y: number },
  radius: number,
) => {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const lengthSquared = dx * dx + dy * dy;
  const progress = lengthSquared === 0
    ? 0
    : clamp(((target.x - from.x) * dx + (target.y - from.y) * dy) / lengthSquared, 0, 1);
  return distance(from.x + progress * dx, from.y + progress * dy, target.x, target.y) <= radius;
};

const normalizeVector = (x: number, y: number) => {
  const magnitude = Math.hypot(x, y);
  if (magnitude <= 0) return { x: 0, y: 0 };
  return { x: x / magnitude, y: y / magnitude };
};

const playAngleArenaSfx = (audioRefs: Partial<Record<AngleArenaSfxKey, HTMLAudioElement>>, key: AngleArenaSfxKey) => {
  const audio = audioRefs[key];
  if (!audio) return;
  try {
    const isMuted = localStorage.getItem(GAME_AUDIO_STORAGE_KEY) === 'true';
    // These Audio instances are not in the DOM, so the shared HUD cannot update
    // their muted property when the player unmutes during a game.
    audio.muted = isMuted;
    if (isMuted) return;
    audio.currentTime = 0;
    void audio.play().catch(() => undefined);
  } catch {
    // Ignore autoplay failures; the level still works without SFX.
  }
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
  const isPresent = useIsPresent();
  const presentRef = useRef(isPresent);
  presentRef.current = isPresent;
  const terminalRef = useRef(false);
  const advancedQuestionRef = useRef<number | null>(null);
  const nextCallbackRef = useRef<(() => void) | null>(null);
  const callbacksRef = useRef({ onVictory, onGameOver, onRoundComplete, sessionEvents });
  callbacksRef.current = { onVictory, onGameOver, onRoundComplete, sessionEvents };
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationRef = useRef<number | null>(null);
  const lastFrameRef = useRef<number | null>(null);
  const hitShakeRef = useRef<number | null>(null);
  const desiredAngleRef = useRef(40);
  const selectedAnswerRef = useRef<number | null>(null);
  const scoreRef = useRef(0);
  const cameraRef = useRef({ x: 0, y: 0 });
  const cameraTargetRef = useRef({ x: 0, y: 0 });
  const settleTimeoutRef = useRef<number | null>(null);
  const autoAdvanceTimeoutRef = useRef<number | null>(null);
  const projectileRef = useRef<ProjectileState | null>(null);
  const impactResultRef = useRef<ImpactResult | null>(null);
  const impactPositionRef = useRef({ x: 0, y: 0 });
  const aimTimeoutRef = useRef<number | null>(null);
  const cannonSpritesRef = useRef<CannonSprites>({});
  const enemyActorFrameRef = useRef<HTMLDivElement | null>(null);
  const arenaBackdropRef = useRef<HTMLImageElement | null>(null);
  const angleArenaSfxRef = useRef<Partial<Record<AngleArenaSfxKey, HTMLAudioElement>>>({});

  const [gameState, setGameState] = useState<GameState>('intro');
  const [questionIndex, setQuestionIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [feedback, setFeedback] = useState('');
  const [enemyReaction, setEnemyReaction] = useState<MonsterMindReaction>('idle');
  const [enemyReactionKey, setEnemyReactionKey] = useState(0);
  const [score, setScore] = useState(0);
  const [localLives, setLocalLives] = useState(INITIAL_LIVES);
  const [localTimer, setLocalTimer] = useState(INITIAL_TIMER);
  const [stars, setStars] = useState(0);
  const questionIndexRef = useRef(questionIndex);
  questionIndexRef.current = questionIndex;

  const clearRoundTimers = useCallback(() => {
    if (aimTimeoutRef.current !== null) window.clearTimeout(aimTimeoutRef.current);
    if (settleTimeoutRef.current !== null) window.clearTimeout(settleTimeoutRef.current);
    if (autoAdvanceTimeoutRef.current !== null) window.clearTimeout(autoAdvanceTimeoutRef.current);
    aimTimeoutRef.current = null;
    settleTimeoutRef.current = null;
    autoAdvanceTimeoutRef.current = null;
  }, []);

  const stopScheduledWork = useCallback(() => {
    clearRoundTimers();
    if (animationRef.current !== null) cancelAnimationFrame(animationRef.current);
    animationRef.current = null;
  }, [clearRoundTimers]);

  useLayoutEffect(() => {
    if (isPresent) return;
    terminalRef.current = true;
    stopScheduledWork();
  }, [isPresent, stopScheduledWork]);

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
    if (!presentRef.current || terminalRef.current) return;
    setGameState('awaitingAnswer');
  }, []);

  useEffect(() => {
    if (sessionState) return;
    setLocalTimer(INITIAL_TIMER);
    const interval = window.setInterval(() => {
      if (!presentRef.current || terminalRef.current) return;
      setLocalTimer((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => window.clearInterval(interval);
  }, [sessionState]);

  useEffect(() => {
    if (!presentRef.current || terminalRef.current || !sessionState) return;
    if (sessionState.timeLeft <= 0 || sessionState.lives <= 0) {
      terminalRef.current = true;
      stopScheduledWork();
      setGameState('gameOver');
      emitMiniGameSessionEvent(callbacksRef.current.sessionEvents, 'game_failed', {
        score: scoreRef.current,
        reason: sessionState.timeLeft <= 0 ? 'time' : 'lives',
      });
      callbacksRef.current.onGameOver(scoreRef.current);
    }
  }, [onGameOver, sessionEvents, sessionState, stopScheduledWork]);

  useEffect(() => {
    if (!presentRef.current || terminalRef.current || sessionState) return;
    if (timeLeft <= 0 || lives <= 0) {
      terminalRef.current = true;
      stopScheduledWork();
      setGameState('gameOver');
      callbacksRef.current.onGameOver(scoreRef.current);
    }
  }, [lives, onGameOver, sessionState, stopScheduledWork, timeLeft]);

  useEffect(() => {
    return stopScheduledWork;
  }, [stopScheduledWork]);

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
    const image = new Image();
    image.decoding = 'async';
    image.onload = () => { arenaBackdropRef.current = image; };
    image.src = GAME_SCENE_META.angle_arena.background ?? '';
    return () => { image.onload = null; };

  }, []);

  useEffect(() => {
    const isMuted = localStorage.getItem(GAME_AUDIO_STORAGE_KEY) === 'true';
    const loadAudio = (key: AngleArenaSfxKey, src: string, volume = 0.8) => {
      const audio = new Audio(src);
      audio.preload = 'auto';
      audio.volume = volume;
      audio.muted = isMuted;
      angleArenaSfxRef.current[key] = audio;
    };

    loadAudio('launch', angleArenaLaunchSfxSrc, 0.85);
    loadAudio('wood', angleArenaWoodSfxSrc, 0.65);
    loadAudio('hit', angleArenaHitSfxSrc, 0.8);
    loadAudio('fail', angleArenaFailSfxSrc, 0.75);
    loadAudio('complete', angleArenaCompleteSfxSrc, 0.75);
  }, []);

  const resetForNext = () => {
    if (!presentRef.current || terminalRef.current) return;
    clearRoundTimers();
    advancedQuestionRef.current = questionIndex;
    setEnemyReaction('idle');
    setSelectedAnswer(null);
    selectedAnswerRef.current = null;
    setFeedback('');
    impactResultRef.current = null;
    projectileRef.current = null;
    cameraRef.current = { x: 0, y: 0 };
    cameraTargetRef.current = { x: 0, y: 0 };
    setGameState('awaitingAnswer');
  };

  const finishLevel = (finalScore: number) => {
    if (!presentRef.current || terminalRef.current) return;
    terminalRef.current = true;
    stopScheduledWork();
    const earnedStars = Math.min(3, Math.max(1, Math.floor(finalScore / 450)));
    setStars(earnedStars);
    setGameState('levelComplete');
    playAngleArenaSfx(angleArenaSfxRef.current, 'complete');
    emitMiniGameSessionEvent(callbacksRef.current.sessionEvents, 'game_complete', {
      score: finalScore,
      stars: earnedStars,
      metadata: {
        correct: finalScore / POINTS_PER_HIT,
      },
    });
    callbacksRef.current.onVictory(earnedStars, finalScore);
  };

  const handleResolve = (result: ImpactResult) => {
    if (!presentRef.current || terminalRef.current || impactResultRef.current) return;
    impactResultRef.current = result;
    setEnemyReaction(result === 'hit' ? 'hit' : 'taunt');
    setEnemyReactionKey((value) => value + 1);
    cameraTargetRef.current = impactPositionRef.current;
    if (settleTimeoutRef.current) window.clearTimeout(settleTimeoutRef.current);
    settleTimeoutRef.current = window.setTimeout(() => {
      settleTimeoutRef.current = null;
      if (!presentRef.current || terminalRef.current) return;
      cameraTargetRef.current = { x: 0, y: 0 };
    }, 680);

    if (result === 'hit') {
      playAngleArenaSfx(angleArenaSfxRef.current, 'hit');
      playAngleArenaSfx(angleArenaSfxRef.current, 'wood');
      const nextScore = scoreRef.current + POINTS_PER_HIT;
      scoreRef.current = nextScore;
      setScore(nextScore);
      setStars((prev) => Math.min(3, Math.max(prev, Math.floor(nextScore / 450))));
      setFeedback('Lookout cleared!');
      triggerHaptic('success');
      callbacksRef.current.onRoundComplete?.(true);
      setGameState('resolvedCorrect');
    } else {
      const correctAngle = activeQuestion?.correctAnswer;
      setFeedback(`Missed! The correct angle was ${correctAngle ?? '--'}°.`);
      triggerHaptic('error');
      callbacksRef.current.onRoundComplete?.(false);
      if (!sessionState) {
        setLocalLives((prev) => Math.max(0, prev - 1));
      }
      playAngleArenaSfx(angleArenaSfxRef.current, 'fail');
      setGameState('resolvedIncorrect');
    }

    if (result === 'hit') {
      hitShakeRef.current = performance.now() + HIT_SHAKE_DURATION;
    }
  };

  const fireProjectile = (angleDeg?: number) => {
    if (!presentRef.current || terminalRef.current || !activeQuestion) return;
    const resolvedAngle = Number.isFinite(angleDeg) ? (angleDeg as number) : desiredAngleRef.current;
    const speed = activeQuestion.launchSpeed || PROJECTILE_SPEED;
    projectileRef.current = buildProjectile(resolvedAngle, speed);
    playAngleArenaSfx(angleArenaSfxRef.current, 'launch');
    cameraTargetRef.current = { x: 0, y: 0 };
    setGameState('projectileFlight');
  };

  const handleAnswer = (answer: number) => {
    if (!presentRef.current || terminalRef.current || gameState !== 'awaitingAnswer' || selectedAnswerRef.current !== null || !activeQuestion) return;
    advancedQuestionRef.current = null;
    selectedAnswerRef.current = answer;
    setSelectedAnswer(answer);
    setFeedback('');
    desiredAngleRef.current = answer;
    setGameState('aiming');
    if (aimTimeoutRef.current) window.clearTimeout(aimTimeoutRef.current);
    aimTimeoutRef.current = window.setTimeout(() => {
      aimTimeoutRef.current = null;
      if (!presentRef.current || terminalRef.current) return;
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
      if (!presentRef.current || terminalRef.current) return;
      if (lastFrameRef.current === null) lastFrameRef.current = timestamp;
      const delta = timestamp - lastFrameRef.current;
      lastFrameRef.current = timestamp;

      const viewWidth = canvas.width / window.devicePixelRatio;
      const viewHeight = canvas.height / window.devicePixelRatio;

      const previousProjectilePosition = projectileRef.current?.active
        ? { x: projectileRef.current.x, y: projectileRef.current.y }
        : null;
      if (projectileRef.current?.active) {
        projectileRef.current = stepProjectile(projectileRef.current, delta);
      }

      const projectile = projectileRef.current;
      const correctAnswer = activeQuestion?.correctAnswer ?? 0;
      const enemyAngle = ((correctAnswer % 360) + 360) % 360;
      const allowHit = selectedAnswerRef.current === correctAnswer;
      const enemyRadius = ENEMY_DISTANCE + ((questionIndex % 3) * 40);
      const enemyVector = angleToVector(enemyAngle);
      const enemyWorld = { x: enemyVector.x * enemyRadius, y: enemyVector.y * enemyRadius };

      if (projectile?.active) {
        const hit = allowHit && previousProjectilePosition !== null
          && segmentHitsTarget(previousProjectilePosition, projectile, enemyWorld, TARGET_RADIUS + PROJECTILE_RADIUS);
        if (hit) {
          projectile.active = false;
          impactPositionRef.current = { ...enemyWorld };
          handleResolve('hit');
        }

        const flightDistance = Math.hypot(projectile.x, projectile.y);
        if (projectile.active && flightDistance > MAX_FLIGHT_DISTANCE) {
          projectile.active = false;
          impactPositionRef.current = { x: projectile.x, y: projectile.y };
          handleResolve('miss');
        }
      }

      if (projectile?.active) {
        cameraTargetRef.current = {
          x: projectile.x,
          y: projectile.y,
        };
      }

      const camera = cameraRef.current;
      const followStrength = projectile?.active ? CAMERA_ACTIVE_LERP : RETURN_LERP;
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
      const bg = arenaBackdropRef.current;
      if (bg?.naturalWidth) {
        // Fit the complete environment. The world projection below remains
        // independent so scenery framing does not change aiming or physics.
        ctx.fillStyle = '#0c2135';
        ctx.fillRect(0, 0, viewWidth, viewHeight);
        const scale = Math.min(viewWidth / bg.naturalWidth, viewHeight / bg.naturalHeight);
        const width = bg.naturalWidth * scale;
        const height = bg.naturalHeight * scale;
        ctx.drawImage(bg, (viewWidth - width) / 2, (viewHeight - height) / 2, width, height);
        // Record the source only once it has actually been painted. Canvas
        // scenery has no image element for the shared visual checks to inspect.
        if (canvas.dataset.renderedBackgroundSrc !== bg.currentSrc) canvas.dataset.renderedBackgroundSrc = bg.currentSrc;
        canvas.dataset.backgroundFit = 'contain';
        canvas.dataset.backgroundPaintWidth = String(width);
        canvas.dataset.backgroundPaintHeight = String(height);
        const shade = ctx.createLinearGradient(0, 0, 0, viewHeight);
        shade.addColorStop(0, 'rgba(8, 26, 53, .14)');
        shade.addColorStop(1, 'rgba(8, 26, 53, .4)');
        ctx.fillStyle = shade;
        ctx.fillRect(0, 0, viewWidth, viewHeight);
      } else {
        drawSkyBackground(ctx, viewWidth, viewHeight, timestamp, camera.x, camera.y, Boolean(projectile?.active));
      }

      const cannonAnchor = { x: viewWidth * CANNON_ANCHOR_X_RATIO, y: viewHeight * CANNON_ANCHOR_Y_RATIO };
      const screenOffset = projectile?.active ? { x: 0, y: 0 } : { x: cannonAnchor.x - viewWidth / 2, y: cannonAnchor.y - viewHeight / 2 };
      const toScreen = (x: number, y: number) => {
        const base = worldToScreen(x, y, camera.x, camera.y, viewWidth, viewHeight);
        return { x: base.x + screenOffset.x, y: base.y + screenOffset.y };
      };

      const originScreen = toScreen(0, 0);
      const travel = projectile?.active ? normalizeVector(projectile.vx, projectile.vy) : { x: 0, y: 0 };
      const enemyVisualWorld = projectile?.active
        ? {
            x: enemyWorld.x + (travel.x * ENEMY_FOREGROUND_LEAD),
            y: enemyWorld.y + (travel.y * ENEMY_FOREGROUND_LEAD),
          }
        : enemyWorld;
      const enemyScreen = toScreen(enemyVisualWorld.x, enemyVisualWorld.y);
      const groundOffsetX = camera.x * GROUND_DRIFT_FACTOR;
      const groundOffsetY = camera.y * GROUND_DRIFT_FACTOR * 0.2;

      ctx.strokeStyle = 'rgba(148,163,184,0.4)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(originScreen.x, originScreen.y, WORLD_RADIUS * 0.35, 0, Math.PI * 2);
      ctx.stroke();

      const cannonTowerWidth = viewWidth * 0.17;
      const cannonTowerHeight = viewHeight * 0.24;
      const cannonTowerPos = {
        x: originScreen.x,
        y: originScreen.y + (cannonTowerHeight * 0.96),
      };
      ctx.save();
      ctx.translate(cannonTowerPos.x, cannonTowerPos.y);
      drawWoodenTower(ctx, cannonTowerWidth, cannonTowerHeight, 1);
      ctx.restore();

      if ((gameState === 'aiming' || gameState === 'awaitingAnswer') && selectedAnswerRef.current !== null) {
        const aimingAngle = selectedAnswerRef.current ?? desiredAngleRef.current;
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
      ctx.translate(originScreen.x, originScreen.y - (cannonTowerHeight * 0.08));
      drawCannonSprite(ctx, desiredAngleRef.current, cannonSpritesRef.current, Math.min(viewWidth, viewHeight) * 0.22);
      ctx.restore();

      ctx.save();
      if (projectile?.active) {
        ctx.translate(Math.sin(timestamp * 0.02) * 2, Math.cos(timestamp * 0.018) * 1.5);
      }
      const enemySize = Math.min(viewWidth, viewHeight) * 0.26;
      const enemyTowerWidth = enemySize * 0.7;
      const enemyTowerHeight = enemySize * 0.8;
      ctx.save();
      ctx.translate(enemyScreen.x, enemyScreen.y + (enemyTowerHeight * 0.96));
      drawWoodenTower(ctx, enemyTowerWidth, enemyTowerHeight, 0.95);
      ctx.restore();
      if (questionIndex % 2 === 1) {
        ctx.save();
        ctx.translate(enemyScreen.x, enemyScreen.y + enemySize * 0.08);
        drawEnemyPlatform(ctx, 'cloud', enemySize);
        ctx.restore();
      }

      // One stable DOM actor follows the canvas projection; percentages retain stage scaling.
      const enemyFrame = enemyActorFrameRef.current;
      if (enemyFrame) {
        enemyFrame.style.left = `${enemyScreen.x / viewWidth * 100}%`;
        enemyFrame.style.top = `${(enemyScreen.y - enemyTowerHeight * .04) / viewHeight * 100}%`;
        enemyFrame.style.width = `${enemySize * .82 / viewWidth * 100}%`;
        enemyFrame.style.height = `${enemySize * 1.16 / viewHeight * 100}%`;
        enemyFrame.style.visibility = 'visible';
      }
      ctx.restore();

      if (projectile) {
        projectile.trail.forEach((point) => {
          const trailScreen = toScreen(point.x, point.y);
          ctx.fillStyle = `rgba(248,113,113,${0.34 * point.alpha})`;
          ctx.beginPath();
          ctx.arc(trailScreen.x, trailScreen.y, 5.5 * point.alpha, 0, Math.PI * 2);
          ctx.fill();
        });

        const projectileScreen = toScreen(projectile.x, projectile.y);
        const pulse = Math.sin(timestamp * 0.012) * 0.5 + 0.5;
        ctx.save();
        ctx.translate(projectileScreen.x, projectileScreen.y);
        drawGlowingBallProjectile(ctx, PROJECTILE_RADIUS + 2, pulse);
        ctx.restore();

        ctx.save();
        ctx.globalAlpha = projectile.active ? 0.16 : 0.08;
        ctx.strokeStyle = 'rgba(255,255,255,0.5)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(projectileScreen.x, projectileScreen.y, 28, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      }

      if (impactResultRef.current === 'hit') {
        ctx.fillStyle = 'rgba(250,204,21,0.45)';
        ctx.beginPath();
        ctx.arc(enemyScreen.x, enemyScreen.y, 34, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.restore();

      if (presentRef.current && !terminalRef.current) animationRef.current = requestAnimationFrame(draw);
    };

    if (presentRef.current && !terminalRef.current) animationRef.current = requestAnimationFrame(draw);
    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
      animationRef.current = null;
    };
  }, [activeQuestion, gameState, selectedAnswer]);

  const handleNext = () => {
    if (!presentRef.current || terminalRef.current || advancedQuestionRef.current === questionIndex) return;
    if (gameState !== 'resolvedCorrect' && gameState !== 'resolvedIncorrect') return;
    advancedQuestionRef.current = questionIndex;
    clearRoundTimers();
    if (gameState === 'resolvedIncorrect' && !sessionState && lives <= 0) {
      terminalRef.current = true;
      stopScheduledWork();
      setGameState('gameOver');
      callbacksRef.current.onGameOver(scoreRef.current);
      return;
    }
    if (questionIndex >= questions.length - 1) {
      finishLevel(scoreRef.current);
      return;
    }
    setQuestionIndex((prev) => prev + 1);
    resetForNext();
  };
  nextCallbackRef.current = handleNext;

  useEffect(() => {
    if (!presentRef.current || terminalRef.current || (gameState !== 'resolvedCorrect' && gameState !== 'resolvedIncorrect')) {
      if (autoAdvanceTimeoutRef.current) window.clearTimeout(autoAdvanceTimeoutRef.current);
      autoAdvanceTimeoutRef.current = null;
      return;
    }

    if (autoAdvanceTimeoutRef.current) window.clearTimeout(autoAdvanceTimeoutRef.current);
    autoAdvanceTimeoutRef.current = window.setTimeout(() => {
      autoAdvanceTimeoutRef.current = null;
      if (!presentRef.current || terminalRef.current || questionIndexRef.current !== questionIndex) return;
      nextCallbackRef.current?.();
    }, 900);
  }, [gameState, questionIndex]);

  const showPromptAndAnswers = gameState === 'awaitingAnswer';

  return (
    <GameUiShell className="bg-transparent !bg-none ![background-image:none] ![background-color:transparent]" overlayDisabled>
      <div data-angle-game="true" data-angle-present={isPresent} className="relative h-full w-full overflow-hidden text-white">
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
        <div ref={enemyActorFrameRef} data-angle-enemy-frame="true" className="pointer-events-none absolute z-[15]" style={{ width: 0, height: 0, translate: '-50% -100%', visibility: 'hidden' }}>
          <MonsterMindActor src={goblinMonster} alt="Goblin guarding the angle target" reaction={gameState === 'levelComplete' ? 'defeated' : enemyReaction} reactionKey={enemyReactionKey} className="h-full w-full drop-shadow-[0_5px_5px_rgba(2,6,23,0.35)]" />
        </div>
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
                subtitle="Choose the correct angle and fire the glowing ball."
                className="w-full"
              >
                {activeQuestion?.prompt ?? 'Choose the correct angle for the glowing ball.'}
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
                {feedback || (selectedAnswer !== null ? `Angle ${selectedAnswer}° locked in.` : 'Choose an angle to fire the cannon.')}
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



