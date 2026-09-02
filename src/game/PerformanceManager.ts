import { PerformanceSnapshot, RenderQuality, RenderQualityPreference } from '../types/game';

export interface DeviceCapability {
  mobile: boolean;
  hardwareConcurrency: number;
  deviceMemoryGb: number | null;
  viewportPixels: number;
  devicePixelRatio: number;
}

export const QUALITY_BUDGETS: Readonly<Record<RenderQuality, { resolutionScale: number; particleBudget: number }>> = Object.freeze({
  LOW: Object.freeze({ resolutionScale: 0.72, particleBudget: 260 }),
  MEDIUM: Object.freeze({ resolutionScale: 0.86, particleBudget: 480 }),
  HIGH: Object.freeze({ resolutionScale: 1, particleBudget: 720 }),
});

export const detectDeviceCapability = (): DeviceCapability => {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') {
    return { mobile: false, hardwareConcurrency: 8, deviceMemoryGb: null, viewportPixels: 1920 * 1080, devicePixelRatio: 1 };
  }
  const nav = navigator as Navigator & { deviceMemory?: number };
  return {
    mobile: window.matchMedia?.('(pointer: coarse)').matches ?? window.innerWidth < 900,
    hardwareConcurrency: Math.max(1, nav.hardwareConcurrency || 4),
    deviceMemoryGb: Number.isFinite(nav.deviceMemory) ? Number(nav.deviceMemory) : null,
    viewportPixels: Math.max(1, window.innerWidth * window.innerHeight),
    devicePixelRatio: Math.max(1, window.devicePixelRatio || 1),
  };
};

export const chooseInitialRenderQuality = (device: DeviceCapability): RenderQuality => {
  const pressure = device.viewportPixels * device.devicePixelRatio * device.devicePixelRatio;
  if (device.hardwareConcurrency <= 4 || (device.deviceMemoryGb !== null && device.deviceMemoryGb <= 3) || pressure > 7_000_000) return 'LOW';
  if (device.mobile || device.hardwareConcurrency <= 6 || (device.deviceMemoryGb !== null && device.deviceMemoryGb <= 6) || pressure > 4_000_000) return 'MEDIUM';
  return 'HIGH';
};

const degrade = (quality: RenderQuality): RenderQuality => quality === 'HIGH' ? 'MEDIUM' : 'LOW';
const upgrade = (quality: RenderQuality): RenderQuality => quality === 'LOW' ? 'MEDIUM' : 'HIGH';

export class AdaptiveQualityController {
  private preference: RenderQualityPreference = 'AUTO';
  private quality: RenderQuality;
  private samples: number[] = [];
  private observationsSinceChange = 0;
  private readonly device: DeviceCapability;

  constructor(device: DeviceCapability = detectDeviceCapability()) {
    this.device = device;
    this.quality = chooseInitialRenderQuality(device);
  }

  setPreference(preference: RenderQualityPreference): RenderQuality {
    this.preference = preference;
    this.quality = preference === 'AUTO' ? chooseInitialRenderQuality(this.device) : preference;
    this.samples = [];
    this.observationsSinceChange = 0;
    return this.quality;
  }

  observeFrame(frameMs: number): RenderQuality | null {
    if (!Number.isFinite(frameMs) || frameMs <= 0 || frameMs >= 250) return null;
    this.samples.push(frameMs);
    if (this.samples.length > 240) this.samples.shift();
    this.observationsSinceChange++;
    if (this.preference !== 'AUTO' || this.samples.length < 120 || this.observationsSinceChange < 180) return null;
    const snapshot = this.getSnapshot();
    let next = this.quality;
    if (snapshot.p95FrameMs > 27 || snapshot.averageFrameMs > 21) next = degrade(this.quality);
    else if (this.observationsSinceChange >= 720 && snapshot.p95FrameMs < 17 && snapshot.averageFrameMs < 13.5) next = upgrade(this.quality);
    if (next === this.quality) return null;
    this.quality = next;
    this.observationsSinceChange = 0;
    this.samples = this.samples.slice(-60);
    return next;
  }

  getSnapshot(): PerformanceSnapshot {
    const ordered = [...this.samples].sort((a, b) => a - b);
    const average = this.samples.length ? this.samples.reduce((sum, value) => sum + value, 0) / this.samples.length : 0;
    const p95 = ordered.length ? ordered[Math.min(ordered.length - 1, Math.floor(ordered.length * 0.95))] : 0;
    const budget = QUALITY_BUDGETS[this.quality];
    return {
      preference: this.preference,
      activeQuality: this.quality,
      averageFrameMs: Number(average.toFixed(2)),
      p95FrameMs: Number(p95.toFixed(2)),
      effectiveFps: average > 0 ? Math.min(60, Math.round(1000 / average)) : 0,
      longFramePercent: this.samples.length ? Number((this.samples.filter((value) => value > 33.4).length / this.samples.length * 100).toFixed(1)) : 0,
      sampleCount: this.samples.length,
      deviceClass: this.device.mobile ? 'MOBILE' : 'DESKTOP',
      resolutionScale: budget.resolutionScale,
      particleBudget: budget.particleBudget,
    };
  }
}
