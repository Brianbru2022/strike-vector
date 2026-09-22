import {
  CombatFeedbackProfile,
  DifficultyPreset,
  EncounterPacingProfile,
  PlayerFlightProfile,
  RecoveryAssistProfile,
} from '../types/game';
import { GAME_CONSTANTS } from './constants';

export const PLAYER_FLIGHT_PROFILE: Readonly<PlayerFlightProfile> = Object.freeze({
  acceleration: GAME_CONSTANTS.PLAYER.ACCEL,
  deceleration: GAME_CONSTANTS.PLAYER.DECEL,
  reversalBrakeMultiplier: 1.85,
  reversalThresholdCtol: 0.35,
  reversalThresholdVtol: 1.1,
  cruiseSettlingRate: 0.032,
  excessSpeedDrag: 0.0018,
  climbResponse: 0.35,
  diveResponse: 0.38,
  verticalDamping: 0.94,
  hoverHorizontalResponse: 0.09,
  hoverVerticalResponse: 0.12,
  pitchResponse: 0.075,
  maximumPitchRadians: 0.42,
  visualHeadingStep: 0.12,
});

export const RECOVERY_ASSIST_PROFILES: Readonly<Record<DifficultyPreset, Readonly<RecoveryAssistProfile>>> = Object.freeze({
  ARCADE: Object.freeze({ difficulty: 'ARCADE', toleranceMultiplier: 1.25, perfectDescentRate: 1.2, perfectForwardSpeed: 2.8, perfectCentreOffset: 90, safeDescentRate: 2.2, safeForwardSpeed: 4, approachInterceptDistance: 700, alignmentOffset: 230 }),
  PILOT: Object.freeze({ difficulty: 'PILOT', toleranceMultiplier: 1, perfectDescentRate: 1.2, perfectForwardSpeed: 2.8, perfectCentreOffset: 90, safeDescentRate: 2.2, safeForwardSpeed: 4, approachInterceptDistance: 700, alignmentOffset: 230 }),
  VETERAN: Object.freeze({ difficulty: 'VETERAN', toleranceMultiplier: 0.82, perfectDescentRate: 1.2, perfectForwardSpeed: 2.8, perfectCentreOffset: 90, safeDescentRate: 2.2, safeForwardSpeed: 4, approachInterceptDistance: 700, alignmentOffset: 230 }),
});

export const COMBAT_FEEDBACK_PROFILE: Readonly<CombatFeedbackProfile> = Object.freeze({
  hitGlancingTicks: 18,
  hitCriticalTicks: 24,
  hitDestroyedTicks: 32,
  damageWarningTicks: 45,
  radioCaptionTicks: 210,
  fighterDetectedTicks: 90,
  fighterTrackingTicks: 60,
  fighterFiringTicks: 45,
});

export const ENCOUNTER_PACING_PROFILE: Readonly<EncounterPacingProfile> = Object.freeze({
  minimumDecisionDelayTicks: 18,
  attackCommitTicks: 24,
  maximumAttackPassTicks: 72,
  reengageRangeFactor: 0.7,
  baseStrikeEgressTicks: 120,
  activeCombatRange: 1100,
});

export function getRecoveryAssistProfile(difficulty: DifficultyPreset): Readonly<RecoveryAssistProfile> {
  return RECOVERY_ASSIST_PROFILES[difficulty];
}
