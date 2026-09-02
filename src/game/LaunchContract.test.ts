import { describe, expect, it } from 'vitest';
import { PlayerAircraft } from './PlayerAircraft';
import { applyMissionLaunchState, shouldEnableGuidedTraining } from './LaunchContract';
import { DEFAULT_AIRCRAFT_CONDITION, LOADOUT_PRESETS } from './ServiceSystem';

describe('mission launch contract', () => {
  it.each(['FLEET_CAP', 'STRIKE', 'CLOSE_SUPPORT'] as const)('applies %s even when a clean condition is implicit', (preset) => {
    const stats = new PlayerAircraft().getDefaultStats();
    applyMissionLaunchState(stats, undefined, preset);
    const expected = LOADOUT_PRESETS[preset];
    expect(stats).toMatchObject({
      health: DEFAULT_AIRCRAFT_CONDITION.health,
      fuel: DEFAULT_AIRCRAFT_CONDITION.fuel,
      missiles: expected.missiles,
      bombs: expected.bombs,
      rockets: expected.rockets,
      flares: expected.flares,
    });
  });

  it('preserves supplied campaign damage while applying the declared loadout', () => {
    const stats = new PlayerAircraft().getDefaultStats();
    applyMissionLaunchState(stats, { health: 72, fuel: 41, subsystems: { ...DEFAULT_AIRCRAFT_CONDITION.subsystems, engine: 0.76 } }, 'STRIKE');
    expect(stats).toMatchObject({ health: 72, fuel: 41, missiles: 2, bombs: 8, rockets: 0 });
    expect(stats.subsystems.engine).toBe(0.76);
  });

  it('enables guided training only for Mission 1 when requested', () => {
    expect(shouldEnableGuidedTraining('m1_coastal_strike', true)).toBe(true);
    expect(shouldEnableGuidedTraining('m6_fleet_defence', true)).toBe(false);
    expect(shouldEnableGuidedTraining('m1_coastal_strike', false)).toBe(false);
  });
});
