import { describe, expect, it } from 'vitest';
import { COMBAT_DIFFICULTY_PROFILES, getCombatDifficultyProfile } from './CombatBalance';

describe('combat difficulty authority', () => {
  it('retains the approved release multipliers', () => {
    expect(COMBAT_DIFFICULTY_PROFILES.ARCADE).toMatchObject({ detection: 0.78, accuracy: 0.72, reloadTime: 1.28, incomingDamage: 0.65, aircraftTurnRate: 0.85, decisionDelay: 1.25 });
    expect(COMBAT_DIFFICULTY_PROFILES.PILOT).toMatchObject({ detection: 1, accuracy: 1, reloadTime: 1, incomingDamage: 1 });
    expect(COMBAT_DIFFICULTY_PROFILES.VETERAN).toMatchObject({ detection: 1.15, accuracy: 1.12, reloadTime: 0.82, incomingDamage: 1.25, aircraftTurnRate: 1.08, decisionDelay: 0.8 });
  });

  it('returns immutable shared profiles', () => {
    expect(Object.isFrozen(getCombatDifficultyProfile('PILOT'))).toBe(true);
  });
});
