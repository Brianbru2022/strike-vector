import { describe, expect, it } from 'vitest';
import { assessMissionLoadout, DEFAULT_AIRCRAFT_CONDITION, getOfferedLoadouts, LOADOUT_PRESETS, serviceAircraft } from './ServiceSystem';
import { CAMPAIGN_MISSIONS } from './Missions';

describe('aircraft servicing', () => {
  const damaged = {
    health: 32,
    fuel: 18,
    subsystems: { engine: 0.4, flightControls: 0.62, targeting: 0.5, weapons: 0.8, hydraulics: 0.3, fuelTank: 0.9 },
  };

  it('fully repairs an aircraft aboard the carrier', () => {
    expect(serviceAircraft(damaged, 'CARRIER', 'FLEET_CAP').outgoing).toEqual(DEFAULT_AIRCRAFT_CONDITION);
  });

  it('applies bounded field repairs and full fuel at a FARP', () => {
    const result = serviceAircraft(damaged, 'FORWARD_BASE', 'CLOSE_SUPPORT').outgoing;
    expect(result.health).toBe(70);
    expect(result.fuel).toBe(100);
    expect(result.subsystems.engine).toBe(0.7);
    expect(result.subsystems.flightControls).toBe(0.87);
    expect(result.subsystems.fuelTank).toBe(1);
  });

  it('defines the three approved period loadouts', () => {
    expect(LOADOUT_PRESETS.FLEET_CAP).toMatchObject({ missiles: 6, bombs: 0, rockets: 4 });
    expect(LOADOUT_PRESETS.STRIKE).toMatchObject({ missiles: 2, bombs: 8, rockets: 0 });
    expect(LOADOUT_PRESETS.CLOSE_SUPPORT).toMatchObject({ missiles: 2, bombs: 2, rockets: 16 });
  });

  it('offers only loadouts with sufficient certified mission capacity', () => {
    for (const mission of CAMPAIGN_MISSIONS) {
      const offered = getOfferedLoadouts(mission);
      expect(offered.length).toBeGreaterThan(0);
      expect(offered.every((preset) => assessMissionLoadout(mission, preset).suitable)).toBe(true);
    }
  });
});
