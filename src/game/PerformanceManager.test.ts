import { describe, expect, it } from 'vitest';
import { AdaptiveQualityController, chooseInitialRenderQuality, QUALITY_BUDGETS } from './PerformanceManager';

describe('adaptive render quality', () => {
  it('selects a conservative initial quality for constrained or high-density devices', () => {
    expect(chooseInitialRenderQuality({ mobile: true, hardwareConcurrency: 4, deviceMemoryGb: 3, viewportPixels: 844 * 390, devicePixelRatio: 3 })).toBe('LOW');
    expect(chooseInitialRenderQuality({ mobile: false, hardwareConcurrency: 12, deviceMemoryGb: 16, viewportPixels: 1920 * 1080, devicePixelRatio: 1 })).toBe('HIGH');
  });

  it('degrades sustained slow automatic rendering but never changes a manual override', () => {
    const device = { mobile: false, hardwareConcurrency: 12, deviceMemoryGb: 16, viewportPixels: 1920 * 1080, devicePixelRatio: 1 };
    const adaptive = new AdaptiveQualityController(device);
    adaptive.setPreference('AUTO');
    let changed = null;
    for (let index = 0; index < 180; index++) changed = adaptive.observeFrame(30) ?? changed;
    expect(changed).toBe('MEDIUM');
    adaptive.setPreference('HIGH');
    for (let index = 0; index < 500; index++) adaptive.observeFrame(40);
    expect(adaptive.getSnapshot().activeQuality).toBe('HIGH');
  });

  it('raises a stable mobile fallback gradually and exposes the active budgets', () => {
    const controller = new AdaptiveQualityController({ mobile: true, hardwareConcurrency: 4, deviceMemoryGb: 3, viewportPixels: 844 * 390, devicePixelRatio: 2 });
    controller.setPreference('AUTO');
    for (let index = 0; index < 720; index++) controller.observeFrame(10);
    const snapshot = controller.getSnapshot();
    expect(snapshot.activeQuality).toBe('MEDIUM');
    expect(snapshot.particleBudget).toBe(QUALITY_BUDGETS.MEDIUM.particleBudget);
    expect(snapshot.effectiveFps).toBe(60);
  });
});
