import { describe, expect, it } from 'vitest';
import {
  ARCTIC_PRESENTATION_PROFILES,
  ARCTIC_TERRAIN_HEIGHT_PROFILES,
  ARCTIC_WEATHER_PROFILES,
  getArcticWeatherState,
  sampleAuthoredTerrainHeight,
} from './ArcticToolkit';

describe('Norwegian visual and gameplay toolkit', () => {
  it('provides five distinct continuous environment families', () => {
    const profiles = Object.values(ARCTIC_PRESENTATION_PROFILES);
    expect(profiles).toHaveLength(5);
    expect(new Set(profiles.map((profile) => profile.backdropAsset)).size).toBe(5);
    expect(profiles.every((profile) => profile.backdropAsset.endsWith('.webp'))).toBe(true);
  });

  it('produces deterministic bounded weather at simulation ticks', () => {
    for (const profile of Object.values(ARCTIC_WEATHER_PROFILES)) {
      const atThirtyFps = getArcticWeatherState(profile, 600);
      const atSixtyFps = getArcticWeatherState(profile, 600);
      const atOneTwentyFps = getArcticWeatherState(profile, 600);
      expect(atThirtyFps).toEqual(atSixtyFps);
      expect(atSixtyFps).toEqual(atOneTwentyFps);
      expect(atThirtyFps.visibility).toBeGreaterThanOrEqual(profile.visibilityFloor);
      expect(atThirtyFps.visibility).toBeLessThanOrEqual(1);
      expect(atThirtyFps.precipitation).toBeGreaterThanOrEqual(0);
      expect(atThirtyFps.precipitation).toBeLessThanOrEqual(1);
    }
  });

  it('samples the authored contact surface rather than a visual offset', () => {
    const profile = ARCTIC_TERRAIN_HEIGHT_PROFILES.ARCTIC_BRIDGEHEAD!;
    const firstLand = sampleAuthoredTerrainHeight(profile, profile.endWorldX * 0.125);
    const centre = sampleAuthoredTerrainHeight(profile, profile.endWorldX * 0.5);
    expect(firstLand).not.toBeNull();
    expect(centre).not.toBeNull();
    expect(sampleAuthoredTerrainHeight(profile, -1)).toBeNull();
    expect(sampleAuthoredTerrainHeight(ARCTIC_TERRAIN_HEIGHT_PROFILES.ARCTIC_OPEN_SEA!, 9000)).toBeNull();
  });
});
