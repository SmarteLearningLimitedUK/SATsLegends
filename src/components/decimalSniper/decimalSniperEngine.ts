export interface Vec2 {
  x: number;
  y: number;
}

export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface ArenaLayout {
  topZoneHeight: number;
  bottomZoneHeight: number;
  sidePadding: number;
  playfieldRect: Rect;
  launcherOrigin: Vec2;
}

export interface DroneTargetSeed {
  id: string;
  label: string;
  value: number;
  palette: 'cyan' | 'violet' | 'amber' | 'emerald';
}

export interface MovingTarget extends DroneTargetSeed {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
}

export interface ProjectileModel {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
}

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

const randomBetween = (min: number, max: number) => Math.random() * (max - min) + min;

const randomSign = () => (Math.random() < 0.5 ? -1 : 1);

export const computeArenaLayout = (width: number, height: number): ArenaLayout => {
  const sidePadding = clamp(width * 0.035, 12, 30);
  const topZoneHeight = clamp(height * 0.21, 96, 168);
  const bottomZoneHeight = clamp(height * 0.24, 116, 220);

  const topEdge = topZoneHeight + 8;
  const bottomEdge = height - bottomZoneHeight - 8;
  const effectiveHeight = Math.max(120, bottomEdge - topEdge);

  const playfieldRect: Rect = {
    x: sidePadding,
    y: topEdge,
    width: Math.max(140, width - sidePadding * 2),
    height: effectiveHeight,
  };

  const launcherOrigin: Vec2 = {
    x: width * 0.5,
    y: height - bottomZoneHeight * 0.38,
  };

  return {
    topZoneHeight,
    bottomZoneHeight,
    sidePadding,
    playfieldRect,
    launcherOrigin,
  };
};

const pointDistance = (a: Vec2, b: Vec2) => Math.hypot(a.x - b.x, a.y - b.y);

const chooseSpawnPoint = (
  rect: Rect,
  radius: number,
  minSeparation: number,
  existing: MovingTarget[],
  retries: number,
): Vec2 => {
  const fallbackCols = Math.max(2, Math.ceil(Math.sqrt(existing.length + 1)));
  for (let attempt = 0; attempt < retries; attempt += 1) {
    const candidate: Vec2 = {
      x: randomBetween(rect.x + radius, rect.x + rect.width - radius),
      y: randomBetween(rect.y + radius, rect.y + rect.height - radius),
    };
    const hasOverlap = existing.some((target) => (
      pointDistance(candidate, target) < minSeparation
    ));
    if (!hasOverlap) {
      return candidate;
    }
  }

  const slot = existing.length;
  const col = slot % fallbackCols;
  const row = Math.floor(slot / fallbackCols);
  const colWidth = rect.width / fallbackCols;
  const rowHeight = rect.height / Math.max(2, fallbackCols);
  return {
    x: rect.x + colWidth * (col + 0.5),
    y: rect.y + rowHeight * (row + 0.5),
  };
};

export const spawnTargetsWithSpacing = (
  seeds: DroneTargetSeed[],
  playfieldRect: Rect,
  targetRadius: number,
): MovingTarget[] => {
  const created: MovingTarget[] = [];
  const minSeparation = targetRadius * 2.2;
  for (const seed of seeds) {
    const spawnPoint = chooseSpawnPoint(playfieldRect, targetRadius, minSeparation, created, 40);
    created.push({
      ...seed,
      x: spawnPoint.x,
      y: spawnPoint.y,
      radius: targetRadius,
      vx: randomBetween(24, 52) * randomSign(),
      vy: randomBetween(18, 44) * randomSign(),
    });
  }
  return created;
};

export const updateTargetsInBounds = (
  targets: MovingTarget[],
  playfieldRect: Rect,
  deltaSeconds: number,
): MovingTarget[] => {
  if (!targets.length) return targets;
  return targets.map((target) => {
    let nextX = target.x + target.vx * deltaSeconds;
    let nextY = target.y + target.vy * deltaSeconds;
    let nextVx = target.vx;
    let nextVy = target.vy;

    const minX = playfieldRect.x + target.radius;
    const maxX = playfieldRect.x + playfieldRect.width - target.radius;
    const minY = playfieldRect.y + target.radius;
    const maxY = playfieldRect.y + playfieldRect.height - target.radius;

    if (nextX < minX) {
      nextX = minX;
      nextVx = Math.abs(nextVx);
    } else if (nextX > maxX) {
      nextX = maxX;
      nextVx = -Math.abs(nextVx);
    }

    if (nextY < minY) {
      nextY = minY;
      nextVy = Math.abs(nextVy);
    } else if (nextY > maxY) {
      nextY = maxY;
      nextVy = -Math.abs(nextVy);
    }

    return {
      ...target,
      x: nextX,
      y: nextY,
      vx: nextVx,
      vy: nextVy,
    };
  });
};

export const buildAimVector = (origin: Vec2, pointer: Vec2): Vec2 => {
  let dx = pointer.x - origin.x;
  let dy = pointer.y - origin.y;
  const length = Math.hypot(dx, dy) || 1;
  dx /= length;
  dy /= length;

  // Keep shots in a playable arc by preventing downward fire.
  if (dy > -0.08) {
    dy = -0.08;
    const horizontal = Math.sign(dx || 1) * Math.sqrt(Math.max(0, 1 - dy * dy));
    dx = horizontal;
  }

  return { x: dx, y: dy };
};

export const createProjectile = (
  origin: Vec2,
  aimVector: Vec2,
  speed = 760,
): ProjectileModel => ({
  x: origin.x,
  y: origin.y,
  vx: aimVector.x * speed,
  vy: aimVector.y * speed,
  radius: 9,
});

export const updateProjectile = (
  projectile: ProjectileModel,
  deltaSeconds: number,
): ProjectileModel => ({
  ...projectile,
  x: projectile.x + projectile.vx * deltaSeconds,
  y: projectile.y + projectile.vy * deltaSeconds,
});

export const findProjectileCollision = (
  projectile: ProjectileModel,
  targets: MovingTarget[],
): MovingTarget | null => {
  for (const target of targets) {
    const distance = Math.hypot(projectile.x - target.x, projectile.y - target.y);
    // Slightly forgiving collision keeps touch/aim gameplay fair on smaller screens.
    if (distance <= projectile.radius + target.radius * 0.92) {
      return target;
    }
  }
  return null;
};

export const isProjectileOutOfPlayfield = (
  projectile: ProjectileModel,
  playfieldRect: Rect,
  extraMargin = 70,
): boolean => {
  return (
    projectile.x < playfieldRect.x - extraMargin
    || projectile.x > playfieldRect.x + playfieldRect.width + extraMargin
    || projectile.y < playfieldRect.y - extraMargin
    || projectile.y > playfieldRect.y + playfieldRect.height + extraMargin
  );
};

export const toPercentX = (x: number, width: number) => (x / Math.max(width, 1)) * 100;

export const toPercentY = (y: number, height: number) => (y / Math.max(height, 1)) * 100;
