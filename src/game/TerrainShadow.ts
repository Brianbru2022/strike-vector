export interface TerrainShadowGeometry {
  contactY: number;
  rotation: number;
  offsetX: number;
  halfWidth: number;
  depth: number;
  alpha: number;
}

type GroundSampler = (worldX: number) => number | null;

const clamp = (value: number, minimum: number, maximum: number) => Math.max(minimum, Math.min(maximum, value));

/**
 * Projects a shadow onto the same sampled terrain used by collision and sprite
 * placement. The width samples make the shadow follow the local visible slope.
 */
export function calculateTerrainShadow(
  worldX: number,
  footprintHalfWidth: number,
  groundYAt: GroundSampler,
  altitude = 0,
): TerrainShadowGeometry | null {
  const offsetX = clamp(altitude * 0.12, 0, 92);
  const projectedX = worldX + offsetX;
  const sampleSpan = Math.max(12, footprintHalfWidth * 0.72);
  const centreY = groundYAt(projectedX);
  const leftY = groundYAt(projectedX - sampleSpan);
  const rightY = groundYAt(projectedX + sampleSpan);
  if (centreY === null || leftY === null || rightY === null) return null;

  const heightScale = clamp(1 - altitude / 900, 0.42, 1);
  return {
    contactY: centreY + 1,
    rotation: clamp(Math.atan2(rightY - leftY, sampleSpan * 2), -0.18, 0.18),
    offsetX,
    halfWidth: Math.max(12, footprintHalfWidth * heightScale),
    depth: Math.max(1.6, (altitude > 0 ? 5.5 : 3.2) * heightScale),
    alpha: clamp((altitude > 0 ? 0.34 : 0.3) - altitude / 2400, 0.08, 0.3),
  };
}

/** Draws a soft, irregular contact patch rather than a detached oval decal. */
export function drawTerrainShadow(
  ctx: CanvasRenderingContext2D,
  screenX: number,
  geometry: TerrainShadowGeometry,
): void {
  const { halfWidth: width, depth, alpha } = geometry;
  ctx.save();
  ctx.translate(screenX + geometry.offsetX, geometry.contactY);
  ctx.rotate(geometry.rotation);

  const gradient = ctx.createLinearGradient(0, -depth, 0, depth * 1.4);
  gradient.addColorStop(0, `rgba(1, 4, 6, ${alpha * 0.18})`);
  gradient.addColorStop(0.42, `rgba(1, 4, 6, ${alpha})`);
  gradient.addColorStop(1, 'rgba(1, 4, 6, 0)');
  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.moveTo(-width, 0);
  ctx.bezierCurveTo(-width * 0.62, -depth, -width * 0.2, -depth * 0.72, 0, -depth * 0.42);
  ctx.bezierCurveTo(width * 0.34, -depth * 0.9, width * 0.78, -depth * 0.48, width, 0);
  ctx.bezierCurveTo(width * 0.58, depth * 0.85, width * 0.08, depth * 0.62, -width * 0.18, depth * 0.48);
  ctx.bezierCurveTo(-width * 0.55, depth * 0.75, -width * 0.84, depth * 0.42, -width, 0);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}
