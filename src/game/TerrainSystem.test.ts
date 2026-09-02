import { describe, expect, it } from 'vitest';
import { calculateBackdropCrop } from './TerrainSystem';

describe('calculateBackdropCrop', () => {
  it('keeps the level 2 fjord crop inside its 1536 x 1024 painting', () => {
    const crop = calculateBackdropCrop(1536, 1024, 1280, 720, 12_000);

    expect(crop.sourceWidth).toBeCloseTo(1536);
    expect(crop.sourceHeight).toBeCloseTo(864);
    expect(crop.sourceX).toBe(0);
    expect(crop.sourceX + crop.sourceWidth).toBeLessThanOrEqual(1536);
    expect(crop.sourceY + crop.sourceHeight).toBeLessThanOrEqual(1024);
  });

  it('uses only valid source pixels at narrow and portrait aspect ratios', () => {
    const crop = calculateBackdropCrop(1536, 1024, 297, 1925, 8_000);

    expect(crop.sourceWidth).toBeGreaterThan(0);
    expect(crop.sourceHeight).toBeGreaterThan(0);
    expect(crop.sourceX).toBeGreaterThanOrEqual(0);
    expect(crop.sourceX + crop.sourceWidth).toBeLessThanOrEqual(1536);
    expect(crop.sourceY + crop.sourceHeight).toBeLessThanOrEqual(1024);
  });

  it('retains bounded parallax travel for genuinely wide paintings', () => {
    const crop = calculateBackdropCrop(2400, 1024, 1280, 720, 50_000);

    expect(crop.sourceX).toBeGreaterThanOrEqual(0);
    expect(crop.sourceX + crop.sourceWidth).toBeLessThanOrEqual(2400);
  });

  it('uses a bounded focus crop to reduce empty ultrawide composition', () => {
    const standard = calculateBackdropCrop(3000, 1200, 3440, 1440, 9000, 0.9, 0.008, 1);
    const focused = calculateBackdropCrop(3000, 1200, 3440, 1440, 9000, 0.9, 0.008, 1.09);
    expect(focused.sourceWidth).toBeLessThan(standard.sourceWidth);
    expect(focused.sourceHeight).toBeLessThan(standard.sourceHeight);
    expect(focused.sourceX + focused.sourceWidth).toBeLessThanOrEqual(3000);
    expect(focused.sourceY + focused.sourceHeight).toBeLessThanOrEqual(1200);
  });
});
