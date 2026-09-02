import { AircraftCondition, LoadoutPreset, PlayerStats } from '../types/game';
import { applyConditionAndLoadout, DEFAULT_AIRCRAFT_CONDITION } from './ServiceSystem';

export function applyMissionLaunchState(stats: PlayerStats, condition: AircraftCondition | undefined, loadout: LoadoutPreset): void {
  applyConditionAndLoadout(stats, condition ?? DEFAULT_AIRCRAFT_CONDITION, loadout);
}

export function shouldEnableGuidedTraining(missionId: string, requested: boolean): boolean {
  return requested && missionId === 'm1_coastal_strike';
}
