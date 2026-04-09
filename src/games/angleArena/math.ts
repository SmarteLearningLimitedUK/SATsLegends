export const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

export const lerp = (start: number, end: number, t: number) => start + (end - start) * t;

export const degreesToRadians = (angleDeg: number) => (angleDeg * Math.PI) / 180;

// Angle convention: 0° = right, 90° = up, 180° = left, 270° = down.
// Screen Y axis points downward, so we invert the Y component.
export const angleToVector = (angleDeg: number) => {
  const radians = degreesToRadians(angleDeg);
  return {
    x: Math.cos(radians),
    y: -Math.sin(radians),
  };
};

export const distance = (x1: number, y1: number, x2: number, y2: number) =>
  Math.hypot(x1 - x2, y1 - y2);

export const worldToScreen = (
  worldX: number,
  worldY: number,
  cameraX: number,
  cameraY: number,
  viewWidth: number,
  viewHeight: number,
) => ({
  x: worldX - cameraX + viewWidth / 2,
  y: worldY - cameraY + viewHeight / 2,
});
