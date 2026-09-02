import { describe, expect, it } from 'vitest';
import { createLandingPracticeMission, LANDING_PRACTICES } from './LandingPractice';
import { PlayerAircraft } from './PlayerAircraft';

describe('landing practice', () => {
  it('provides three sterile recovery circuits without campaign objectives or enemies', () => {
    expect(LANDING_PRACTICES.map((practice) => practice.id)).toEqual(['CARRIER_ROLLING', 'CARRIER_VERTICAL', 'FARP_VERTICAL']);
    for (const practice of LANDING_PRACTICES) {
      const mission = createLandingPracticeMission(practice.id);
      expect(mission.id).toMatch(/^practice_/);
      expect(mission.spawnEnemies()).toEqual([]);
      expect(mission.objectives).toHaveLength(1);
      expect(mission.objectives[0].targetType).toBe('LANDING');
      expect(mission.events).toBeUndefined();
      expect(mission.defendedAsset).toBeUndefined();
    }
  });

  it('starts established on a stable vertical approach', () => {
    const mission = createLandingPracticeMission('CARRIER_VERTICAL');
    const aircraft = new PlayerAircraft();
    aircraft.beginLandingPractice('CARRIER', 'VERTICAL', mission.carrierLandingX, 570);
    expect(aircraft.stats.isTakingOff).toBe(false);
    expect(aircraft.stats.isLanding).toBe(true);
    expect(aircraft.stats.gearDown).toBe(true);
    expect(aircraft.stats.x).toBeLessThan(mission.carrierLandingX);
    expect(aircraft.stats.vtolTransition).toBeGreaterThan(0.8);
  });
});
