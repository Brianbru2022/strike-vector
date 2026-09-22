import { CombatDifficultyProfile, DifficultyPreset } from '../types/game';
import { getRecoveryAssistProfile } from './PlayabilityProfiles';

export const COMBAT_DIFFICULTY_PROFILES: Readonly<Record<DifficultyPreset, Readonly<CombatDifficultyProfile>>> = Object.freeze({
  ARCADE: Object.freeze({
    difficulty: 'ARCADE', detection: 0.78, accuracy: 0.72, reloadTime: 1.28,
    incomingDamage: 0.65, landingTolerance: getRecoveryAssistProfile('ARCADE').toleranceMultiplier, aircraftTurnRate: 0.85,
    decisionDelay: 1.25, playerLockTime: 0.72, enemyLaunchWarningTicks: 90,
  }),
  PILOT: Object.freeze({
    difficulty: 'PILOT', detection: 1, accuracy: 1, reloadTime: 1,
    incomingDamage: 1, landingTolerance: getRecoveryAssistProfile('PILOT').toleranceMultiplier, aircraftTurnRate: 1,
    decisionDelay: 1, playerLockTime: 1, enemyLaunchWarningTicks: 60,
  }),
  VETERAN: Object.freeze({
    difficulty: 'VETERAN', detection: 1.15, accuracy: 1.12, reloadTime: 0.82,
    incomingDamage: 1.25, landingTolerance: getRecoveryAssistProfile('VETERAN').toleranceMultiplier, aircraftTurnRate: 1.08,
    decisionDelay: 0.8, playerLockTime: 1.2, enemyLaunchWarningTicks: 45,
  }),
});

export function getCombatDifficultyProfile(difficulty: DifficultyPreset): Readonly<CombatDifficultyProfile> {
  return COMBAT_DIFFICULTY_PROFILES[difficulty];
}
