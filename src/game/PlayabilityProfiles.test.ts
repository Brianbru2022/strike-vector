import { describe, expect, it } from 'vitest';
import {
  COMBAT_FEEDBACK_PROFILE,
  ENCOUNTER_PACING_PROFILE,
  getRecoveryAssistProfile,
  PLAYER_FLIGHT_PROFILE,
} from './PlayabilityProfiles';

describe('shared playability profiles', () => {
  it('keeps reversal and pitch response bounded', () => {
    expect(PLAYER_FLIGHT_PROFILE.reversalThresholdCtol).toBeLessThan(PLAYER_FLIGHT_PROFILE.reversalThresholdVtol);
    expect(PLAYER_FLIGHT_PROFILE.visualHeadingStep).toBeGreaterThan(0);
    expect(PLAYER_FLIGHT_PROFILE.maximumPitchRadians).toBeLessThanOrEqual(0.42);
  });

  it('orders recovery tolerance without changing recovery rules', () => {
    expect(getRecoveryAssistProfile('ARCADE').toleranceMultiplier).toBeGreaterThan(getRecoveryAssistProfile('PILOT').toleranceMultiplier);
    expect(getRecoveryAssistProfile('VETERAN').toleranceMultiplier).toBeLessThan(getRecoveryAssistProfile('PILOT').toleranceMultiplier);
    expect(getRecoveryAssistProfile('ARCADE').safeForwardSpeed).toBe(getRecoveryAssistProfile('VETERAN').safeForwardSpeed);
  });

  it('retains readable combat cue and attack timing windows', () => {
    expect(COMBAT_FEEDBACK_PROFILE.fighterDetectedTicks).toBeGreaterThan(COMBAT_FEEDBACK_PROFILE.fighterFiringTicks);
    expect(ENCOUNTER_PACING_PROFILE.maximumAttackPassTicks).toBeGreaterThan(ENCOUNTER_PACING_PROFILE.attackCommitTicks);
    expect(ENCOUNTER_PACING_PROFILE.minimumDecisionDelayTicks).toBeGreaterThanOrEqual(18);
  });
});
