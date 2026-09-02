import {
  AircraftCondition,
  AircraftSubsystems,
  LoadoutPreset,
  MissionDefinition,
  PlayerStats,
  ServiceResult,
} from '../types/game';

export const DEFAULT_AIRCRAFT_CONDITION: AircraftCondition = {
  health: 100,
  fuel: 100,
  subsystems: {
    engine: 1,
    flightControls: 1,
    targeting: 1,
    weapons: 1,
    hydraulics: 1,
    fuelTank: 1,
  },
};

export const LOADOUT_PRESETS: Record<LoadoutPreset, {
  label: string;
  description: string;
  missiles: number;
  bombs: number;
  rockets: number;
  flares: number;
}> = {
  FLEET_CAP: { label: 'Fleet CAP', description: 'Maximum Sidewinder fit for fleet interception.', missiles: 6, bombs: 0, rockets: 4, flares: 6 },
  STRIKE: { label: 'Strike', description: 'Heavy bomb fit for hardened ground targets.', missiles: 2, bombs: 8, rockets: 0, flares: 6 },
  CLOSE_SUPPORT: { label: 'Close Support', description: 'Rocket-heavy fit for armour and mobile targets.', missiles: 2, bombs: 2, rockets: 16, flares: 6 },
};

const AIR_TARGETS = new Set(['PATROL_FIGHTER', 'INTERCEPTOR', 'ATTACK_HELI', 'HEAVY_BOMBER']);
const NON_COMBAT_TARGETS = new Set(['LANDING', 'DEFEND_ASSET', 'DOWNED_PILOT']);
const HARD_TARGETS = new Set(['BRIDGE_SEGMENT', 'COMMAND_BUNKER', 'FUEL_DEPOT', 'RADAR_STATION', 'MISSILE_CORVETTE']);

export interface MissionLoadoutAssessment {
  preset: LoadoutPreset;
  suitable: boolean;
  airTargets: number;
  groundTargets: number;
  hardTargets: number;
  airCapacity: number;
  groundCapacity: number;
  hardTargetCapacity: number;
}

export function assessMissionLoadout(mission: MissionDefinition, preset: LoadoutPreset): MissionLoadoutAssessment {
  const objectives = mission.objectives.filter((objective) => objective.isPrimary);
  const count = (predicate: (targetType: string) => boolean) => objectives.filter((objective) => predicate(objective.targetType)).reduce((sum, objective) => sum + objective.requiredCount, 0);
  const airTargets = count((type) => AIR_TARGETS.has(type));
  const groundTargets = count((type) => !AIR_TARGETS.has(type) && !NON_COMBAT_TARGETS.has(type));
  const hardTargets = count((type) => HARD_TARGETS.has(type));
  const loadout = LOADOUT_PRESETS[preset];
  // One target in each category may be defeated with the unlimited but riskier cannon.
  const airCapacity = loadout.missiles + Math.floor(loadout.rockets / 2) + 1;
  const groundCapacity = loadout.bombs + Math.floor(loadout.rockets / 2) + 1;
  const hardTargetCapacity = loadout.bombs + Math.floor(loadout.rockets / 2);
  return { preset, suitable: airCapacity >= airTargets && groundCapacity >= groundTargets && hardTargetCapacity >= hardTargets, airTargets, groundTargets, hardTargets, airCapacity, groundCapacity, hardTargetCapacity };
}

export function getOfferedLoadouts(mission: MissionDefinition): LoadoutPreset[] {
  const presets: LoadoutPreset[] = ['FLEET_CAP', 'STRIKE', 'CLOSE_SUPPORT'];
  const suitable = presets.filter((preset) => assessMissionLoadout(mission, preset).suitable);
  return suitable.length ? suitable : [presets.sort((a, b) => {
    const left = assessMissionLoadout(mission, a);
    const right = assessMissionLoadout(mission, b);
    return (right.airCapacity + right.groundCapacity + right.hardTargetCapacity) - (left.airCapacity + left.groundCapacity + left.hardTargetCapacity);
  })[0]];
}

const subsystemKeys: Array<keyof AircraftSubsystems> = [
  'engine', 'flightControls', 'targeting', 'weapons', 'hydraulics', 'fuelTank',
];

const clamp01 = (value: unknown, fallback = 1) => Math.max(0.1, Math.min(1, Number(value) || fallback));
const cloneSubsystems = (subsystems: AircraftSubsystems): AircraftSubsystems => ({ ...subsystems });

export function sanitiseAircraftCondition(value: unknown): AircraftCondition {
  if (!value || typeof value !== 'object') return { ...DEFAULT_AIRCRAFT_CONDITION, subsystems: cloneSubsystems(DEFAULT_AIRCRAFT_CONDITION.subsystems) };
  const condition = value as Partial<AircraftCondition>;
  const rawSubsystems = condition.subsystems as Partial<AircraftSubsystems> | undefined;
  const subsystems = cloneSubsystems(DEFAULT_AIRCRAFT_CONDITION.subsystems);
  for (const key of subsystemKeys) subsystems[key] = clamp01(rawSubsystems?.[key]);
  return {
    health: Math.max(1, Math.min(100, Number(condition.health) || 100)),
    fuel: Math.max(0, Math.min(100, Number(condition.fuel) || 100)),
    subsystems,
  };
}

export function sanitiseLoadout(value: unknown): LoadoutPreset {
  return value === 'STRIKE' || value === 'CLOSE_SUPPORT' || value === 'FLEET_CAP' ? value : 'FLEET_CAP';
}

export function conditionFromStats(stats: PlayerStats): AircraftCondition {
  return {
    health: stats.health,
    fuel: stats.fuel,
    subsystems: cloneSubsystems(stats.subsystems),
  };
}

export function serviceAircraft(
  incomingValue: AircraftCondition,
  siteType: 'CARRIER' | 'FORWARD_BASE',
  loadout: LoadoutPreset
): ServiceResult {
  const incoming = sanitiseAircraftCondition(incomingValue);
  const outgoing = siteType === 'CARRIER'
    ? sanitiseAircraftCondition(DEFAULT_AIRCRAFT_CONDITION)
    : {
        health: Math.min(100, Math.max(70, incoming.health + 35)),
        fuel: 100,
        subsystems: subsystemKeys.reduce((result, key) => {
          result[key] = Math.min(1, Math.max(0.7, incoming.subsystems[key] + 0.25));
          return result;
        }, {} as AircraftSubsystems),
      };
  return { siteType, incoming, outgoing, loadout };
}

export function applyConditionAndLoadout(stats: PlayerStats, conditionValue: AircraftCondition, preset: LoadoutPreset): void {
  const condition = sanitiseAircraftCondition(conditionValue);
  const loadout = LOADOUT_PRESETS[sanitiseLoadout(preset)];
  stats.health = condition.health;
  stats.fuel = condition.fuel;
  stats.subsystems = cloneSubsystems(condition.subsystems);
  stats.missiles = loadout.missiles;
  stats.maxMissiles = loadout.missiles;
  stats.bombs = loadout.bombs;
  stats.maxBombs = loadout.bombs;
  stats.rockets = loadout.rockets;
  stats.maxRockets = loadout.rockets;
  stats.flares = loadout.flares;
  stats.maxFlares = loadout.flares;
  stats.selectedWeapon = loadout.missiles > 0 ? 'MISSILE' : loadout.bombs > 0 ? 'BOMB' : 'ROCKET';
}
