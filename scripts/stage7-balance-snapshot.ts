import { createHash } from 'node:crypto';
import { CAMPAIGN_MISSIONS } from '../src/game/Missions';
import { COMBAT_DIFFICULTY_PROFILES } from '../src/game/CombatBalance';
import { LOADOUT_PRESETS } from '../src/game/ServiceSystem';

export function createStage7BalanceSnapshot() {
  return {
    missions: CAMPAIGN_MISSIONS.map((mission) => ({
      id: mission.id,
      mapLength: mission.mapLength,
      launchSite: mission.launchSite ?? 'CARRIER',
      recoverySite: mission.recoverySite ?? 'CARRIER',
      carrierX: mission.carrierX,
      carrierLandingX: mission.carrierLandingX,
      objectives: mission.objectives.map(({ id, description, isPrimary, requiredCount, targetType, points, active }) => ({ id, description, isPrimary, requiredCount, targetType, points, active: active ?? true })),
      phases: mission.phases ?? [],
    })),
    difficultyProfiles: COMBAT_DIFFICULTY_PROFILES,
    loadouts: LOADOUT_PRESETS,
  };
}

export function stage7BalanceChecksum(): string {
  return createHash('sha256').update(JSON.stringify(createStage7BalanceSnapshot())).digest('hex');
}
