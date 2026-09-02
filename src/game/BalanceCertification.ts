import { DifficultyPreset, LoadoutPreset, MissionDefinition, OperationArchetype } from '../types/game';
import { CAMPAIGN_MISSIONS } from './Missions';
import { generateOperation, generateOperationMission } from './DynamicOperations';
import { runEncounterHarness } from './EncounterHarness';
import { assessMissionLoadout, getOfferedLoadouts, LOADOUT_PRESETS } from './ServiceSystem';

const DIFFICULTIES: DifficultyPreset[] = ['ARCADE', 'PILOT', 'VETERAN'];
const ARCHETYPES: OperationArchetype[] = ['FLEET_CAP', 'SEAD', 'ARMOURED_INTERDICTION', 'PILOT_RESCUE', 'FARP_DEFENCE', 'DEEP_STRIKE'];
const AIR_TARGETS = new Set<string>(['PATROL_FIGHTER', 'INTERCEPTOR', 'ATTACK_HELI']);
const NON_COMBAT_TARGETS = new Set<string>(['LANDING', 'DEFEND_ASSET', 'DOWNED_PILOT']);
const HARD_TARGETS = new Set<string>(['BRIDGE_SEGMENT', 'COMMAND_BUNKER', 'FUEL_DEPOT', 'RADAR_STATION', 'MISSILE_CORVETTE']);

export interface BalanceCertificationIssue {
  severity: 'ERROR' | 'WARNING';
  scope: string;
  message: string;
}

export interface SortieCertification {
  missionId: string;
  difficulty: DifficultyPreset;
  recommendedLoadout: LoadoutPreset;
  offeredLoadouts: LoadoutPreset[];
  airTargets: number;
  groundTargets: number;
  airOrdnanceCapacity: number;
  groundOrdnanceCapacity: number;
  openingAirSeparation: number | null;
  recoveryValid: boolean;
  issues: BalanceCertificationIssue[];
}

export interface DeploymentCertification {
  difficulty: DifficultyPreset;
  seed: number;
  archetypes: OperationArchetype[];
  sorties: SortieCertification[];
}

export interface EncounterCertification {
  difficulty: DifficultyPreset;
  scenario: 'FIGHTER' | 'SAM' | 'COMBINED';
  deterministic: boolean;
  firingEvents: number;
  samLaunches: number;
  maximumPitchDegrees: number;
  minimumTerrainClearance: number;
}

export interface BalanceCertificationReport {
  version: 1;
  generatedAt: string;
  campaignEntries: SortieCertification[];
  deployments: DeploymentCertification[];
  encounters: EncounterCertification[];
  coveredArchetypes: Record<DifficultyPreset, OperationArchetype[]>;
  issues: BalanceCertificationIssue[];
  passed: boolean;
}

export function runBalanceCertification(generatedAt = new Date().toISOString()): BalanceCertificationReport {
  const campaignEntries = DIFFICULTIES.flatMap((difficulty) => CAMPAIGN_MISSIONS.map((mission) => auditSortie(mission, difficulty)));
  const deployments = DIFFICULTIES.flatMap((difficulty) => findCoveringDeployments(difficulty).map((seed) => {
    const blueprint = generateOperation(seed, difficulty);
    return {
      difficulty,
      seed,
      archetypes: blueprint.sorties.map((sortie) => sortie.archetype),
      sorties: blueprint.sorties.map((sortie, index) => auditSortie(generateOperationMission(blueprint, index), difficulty, sortie.recommendedLoadout)),
    };
  }));
  const encounters = DIFFICULTIES.flatMap((difficulty) => (['FIGHTER', 'SAM', 'COMBINED'] as const).map((scenario) => auditEncounter(difficulty, scenario)));
  const coveredArchetypes = Object.fromEntries(DIFFICULTIES.map((difficulty) => [
    difficulty,
    ARCHETYPES.filter((archetype) => deployments.some((deployment) => deployment.difficulty === difficulty && deployment.archetypes.includes(archetype))),
  ])) as Record<DifficultyPreset, OperationArchetype[]>;
  const issues = [
    ...campaignEntries.flatMap((entry) => entry.issues),
    ...deployments.flatMap((deployment) => deployment.sorties.flatMap((sortie) => sortie.issues)),
    ...encounters.flatMap(encounterIssues),
    ...DIFFICULTIES.flatMap((difficulty) => coveredArchetypes[difficulty].length === ARCHETYPES.length ? [] : [{ severity: 'ERROR' as const, scope: difficulty, message: 'The two selected deployments do not cover all six archetypes.' }]),
  ];
  return { version: 1, generatedAt, campaignEntries, deployments, encounters, coveredArchetypes, issues, passed: !issues.some((issue) => issue.severity === 'ERROR') };
}

export function auditSortie(mission: MissionDefinition, difficulty: DifficultyPreset, requestedLoadout?: LoadoutPreset): SortieCertification {
  const primaryTargets = mission.objectives.filter((objective) => objective.isPrimary);
  const airTargets = primaryTargets.filter((objective) => AIR_TARGETS.has(objective.targetType)).reduce((sum, objective) => sum + objective.requiredCount, 0);
  const groundTargets = primaryTargets.filter((objective) => !AIR_TARGETS.has(objective.targetType) && !NON_COMBAT_TARGETS.has(objective.targetType)).reduce((sum, objective) => sum + objective.requiredCount, 0);
  const recommendedLoadout = requestedLoadout ?? chooseCampaignLoadout(mission, airTargets, groundTargets);
  const offeredLoadouts = getOfferedLoadouts(mission);
  const loadout = LOADOUT_PRESETS[recommendedLoadout];
  const airOrdnanceCapacity = loadout.missiles + Math.floor(loadout.rockets / 2);
  const groundOrdnanceCapacity = loadout.bombs + Math.floor(loadout.rockets / 2);
  const enemies = mission.spawnEnemies();
  const launchX = mission.carrierX + (mission.launchSite === 'FORWARD_BASE' ? 245 : 120);
  const openingAircraft = enemies.filter((enemy) => enemy.category === 'AIR');
  const openingAirSeparation = openingAircraft.length ? Math.min(...openingAircraft.map((enemy) => Math.abs(enemy.x - launchX))) : null;
  const recoveryValid = mission.hasCarrierRecovery && mission.carrierLandingX >= 0 && mission.carrierLandingX <= mission.mapLength;
  const issues: BalanceCertificationIssue[] = [];
  if (!offeredLoadouts.includes(recommendedLoadout)) issues.push({ severity: 'ERROR', scope: `${difficulty}/${mission.id}`, message: `${recommendedLoadout} is recommended but is not certified for this sortie.` });
  for (const preset of offeredLoadouts) {
    const assessment = assessMissionLoadout(mission, preset);
    if (!assessment.suitable) issues.push({ severity: 'ERROR', scope: `${difficulty}/${mission.id}`, message: `${preset} is offered without sufficient ammunition capacity.` });
  }
  if (airOrdnanceCapacity < airTargets) issues.push({ severity: 'ERROR', scope: `${difficulty}/${mission.id}`, message: `${recommendedLoadout} supports ${airOrdnanceCapacity} air engagements for ${airTargets} required air targets.` });
  if (groundOrdnanceCapacity < groundTargets) issues.push({ severity: 'ERROR', scope: `${difficulty}/${mission.id}`, message: `${recommendedLoadout} supports ${groundOrdnanceCapacity} ground engagements for ${groundTargets} required ground targets.` });
  if (openingAirSeparation !== null && openingAirSeparation < 800) issues.push({ severity: 'ERROR', scope: `${difficulty}/${mission.id}`, message: `Opening aircraft begins only ${Math.round(openingAirSeparation)} world units from launch.` });
  if (!recoveryValid) issues.push({ severity: 'ERROR', scope: `${difficulty}/${mission.id}`, message: 'Recovery site lies outside the playable mission bounds.' });
  return { missionId: mission.id, difficulty, recommendedLoadout, offeredLoadouts, airTargets, groundTargets, airOrdnanceCapacity, groundOrdnanceCapacity, openingAirSeparation, recoveryValid, issues };
}

function chooseCampaignLoadout(mission: MissionDefinition, airTargets: number, groundTargets: number): LoadoutPreset {
  const targetTypes = new Set(mission.objectives.filter((objective) => objective.isPrimary).map((objective) => objective.targetType));
  if (airTargets >= 3 && groundTargets <= 2) return 'FLEET_CAP';
  if ([...targetTypes].some((type) => HARD_TARGETS.has(type)) || groundTargets >= 5) return 'STRIKE';
  return 'CLOSE_SUPPORT';
}

function findCoveringDeployments(difficulty: DifficultyPreset): number[] {
  const candidates = Array.from({ length: 512 }, (_, index) => index + 1).map((seed) => ({ seed, archetypes: generateOperation(seed, difficulty).sorties.map((sortie) => sortie.archetype) }));
  for (let first = 0; first < candidates.length; first++) {
    for (let second = first + 1; second < candidates.length; second++) {
      if (new Set([...candidates[first].archetypes, ...candidates[second].archetypes]).size === ARCHETYPES.length) return [candidates[first].seed, candidates[second].seed];
    }
  }
  throw new Error(`Unable to find two ${difficulty} deployments covering every operation archetype.`);
}

function auditEncounter(difficulty: DifficultyPreset, scenario: 'FIGHTER' | 'SAM' | 'COMBINED'): EncounterCertification {
  const results = ([30, 60, 120] as const).map((renderHz) => runEncounterHarness({ scenario, difficulty, renderHz }));
  const signature = (index: number) => JSON.stringify({ states: results[index].stateSequence, firing: results[index].firingTicks, sams: results[index].samLaunchTicks, snapshots: results[index].finalSnapshots });
  return {
    difficulty,
    scenario,
    deterministic: signature(0) === signature(1) && signature(0) === signature(2),
    firingEvents: results[1].firingTicks.length,
    samLaunches: results[1].samLaunchTicks.length,
    maximumPitchDegrees: results[1].maximumDisplayedPitch * 180 / Math.PI,
    minimumTerrainClearance: results[1].minimumTerrainClearance,
  };
}

function encounterIssues(encounter: EncounterCertification): BalanceCertificationIssue[] {
  const issues: BalanceCertificationIssue[] = [];
  const scope = `${encounter.difficulty}/${encounter.scenario}`;
  if (!encounter.deterministic) issues.push({ severity: 'ERROR', scope, message: 'Encounter outcome changes with render refresh rate.' });
  if (encounter.maximumPitchDegrees > 24.01) issues.push({ severity: 'ERROR', scope, message: `Displayed aircraft pitch reached ${encounter.maximumPitchDegrees.toFixed(1)} degrees.` });
  if (encounter.scenario !== 'SAM' && encounter.firingEvents === 0) issues.push({ severity: 'ERROR', scope, message: 'Aircraft doctrine never reached a firing solution.' });
  if (encounter.scenario !== 'FIGHTER' && encounter.samLaunches === 0) issues.push({ severity: 'ERROR', scope, message: 'SAM scenario never reached its telegraphed launch.' });
  return issues;
}
