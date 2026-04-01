// Simple physics helpers for Angle Arena
export type ProjectileState = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  active: boolean;
  trail: { x: number; y: number; alpha: number }[];
};

export const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

export const degreesToRadians = (angleDeg: number) => (angleDeg * Math.PI) / 180;

export const computeLaunchVector = (angleDeg: number, speed: number) => {
  const radians = degreesToRadians(angleDeg);
  return {
    vx: Math.cos(radians) * speed,
    vy: -Math.sin(radians) * speed,
  };
};

export const stepProjectile = (
  projectile: ProjectileState,
  dt: number,
  gravity: number,
): ProjectileState => {
  if (!projectile.active) return projectile;
  const nextVx = projectile.vx;
  const nextVy = projectile.vy + gravity * (dt / 1000);
  const nextX = projectile.x + nextVx * (dt / 1000);
  const nextY = projectile.y + nextVy * (dt / 1000);
  const trail = [...projectile.trail, { x: nextX, y: nextY, alpha: 1 }].slice(-16);
  const faded = trail.map((point, index) => ({
    ...point,
    alpha: (index + 1) / trail.length,
  }));

  return {
    x: nextX,
    y: nextY,
    vx: nextVx,
    vy: nextVy,
    active: projectile.active,
    trail: faded,
  };
};
