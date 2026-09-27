import { describe, expect, it } from 'vitest';
import { calculateCanvasBackingStore } from './CanvasResolution';

describe('canvas backing resolution', () => {
  it('matches a 1080p desktop display without stretching 720p pixels', () => {
    expect(calculateCanvasBackingStore(1920, 1080, 1, 1)).toEqual({
      width: 1920,
      height: 1080,
      renderScale: 1.5,
    });
  });

  it('caps ultrawide and high-density rendering to the performance-safe limit', () => {
    expect(calculateCanvasBackingStore(2560, 1440, 2, 1)).toEqual({
      width: 2560,
      height: 1440,
      renderScale: 2,
    });
  });

  it('respects adaptive resolution scaling', () => {
    const result = calculateCanvasBackingStore(1920, 1080, 1, 0.72);
    expect(result.width).toBe(1382);
    expect(result.height).toBe(778);
    expect(result.renderScale).toBeCloseTo(1.08);
  });
});
