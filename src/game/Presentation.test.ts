import { describe, expect, it } from 'vitest';
import { CAMPAIGN_MISSIONS } from './Missions';
import { getEnvironmentPresentation, SIGNATURE_PRESENTATION } from './Presentation';

describe('showcase presentation profiles', () => {
  it('assigns explicit signature art without changing terrain authority', () => {
    const signatureIds = [0, 5, 9] as const;
    const expected = [SIGNATURE_PRESENTATION.MISSION_1, SIGNATURE_PRESENTATION.MISSION_6, SIGNATURE_PRESENTATION.MISSION_10];
    signatureIds.forEach((missionIndex, index) => {
      const mission = CAMPAIGN_MISSIONS[missionIndex];
      expect(getEnvironmentPresentation(mission)).toEqual(expected[index]);
      expect(mission.terrainProfile).toBeTruthy();
      expect(mission.mapLength).toBeGreaterThan(5000);
    });
  });

  it('gives every campaign mission a complete visual profile', () => {
    for (const mission of CAMPAIGN_MISSIONS) {
      const presentation = getEnvironmentPresentation(mission);
      expect(presentation.backdropAsset).toMatch(/^\/assets\/backgrounds\/.+\.(webp|jpg)$/);
      expect(presentation.parallax).toBeGreaterThanOrEqual(0);
      expect(presentation.overscan).toBeGreaterThan(0);
      expect(presentation.vignetteStrength).toBeGreaterThanOrEqual(0);
    }
  });
});

