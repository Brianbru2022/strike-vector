import type { EnemyType, EnemyUnit, MissionAction, MissionDefinition, MissionEvent, MissionObjective } from '../types/game';
import { missionPresentationArtwork } from './MissionPresentation';

export const MISSION_AUTHORING_DOCUMENT_VERSION = 1 as const;

export interface MissionAuthoringDocumentV1 {
  version: 1;
  mission: Omit<MissionDefinition, 'spawnEnemies'>;
  enemies: EnemyUnit[];
}

export interface MissionAuthoringIssue {
  severity: 'ERROR' | 'WARNING';
  code: string;
  path: string;
  message: string;
}

const SUPPORTED_ENEMY_TYPES: ReadonlySet<EnemyType> = new Set([
  'RADAR_STATION', 'SAM_LAUNCHER', 'AA_FLAK_GUN', 'TANK', 'APC', 'COMMAND_VEHICLE', 'FUEL_DEPOT',
  'BRIDGE_SEGMENT', 'COMMAND_BUNKER', 'PATROL_FIGHTER', 'INTERCEPTOR', 'ATTACK_HELI', 'COMBAT_DRONE',
  'HEAVY_BOMBER', 'LANDING_CRAFT', 'COASTAL_ARTILLERY', 'SEARCHLIGHT', 'PROTECTED_SETTLEMENT',
  'SUBMARINE_PEN', 'PATROL_BOAT', 'MISSILE_CORVETTE', 'ANTI_SHIP_MISSILE', 'CIVILIAN_CARGO_SHIP',
  'CIVILIAN_HARBOUR_BUILDING', 'DOWNED_PILOT',
]);

const NON_ENEMY_OBJECTIVES = new Set(['RESCUE', 'LANDING', 'DAMAGE_ALL', 'DEFEND_ASSET']);

export function createMissionAuthoringDocument(mission: MissionDefinition): MissionAuthoringDocumentV1 {
  const { spawnEnemies, ...design } = mission;
  const presentation = design.presentation ?? { id: `${mission.id}_authoring`, backdropAsset: missionPresentationArtwork(mission), backdropFilter: 'saturate(.85) contrast(1.05)', overlayColour: 'rgba(2, 8, 12, .18)', vignetteStrength: 0.35, parallax: 0.08, overscan: 0.03, seaState: 'MODERATE' as const, hazeDensity: 0.2, sprayIntensity: 0.1, rainDensity: 0 };
  return clone({ version: 1, mission: { ...design, presentation }, enemies: spawnEnemies() });
}

export function createBlankMissionDocument(base: MissionDefinition): MissionAuthoringDocumentV1 {
  const document = createMissionAuthoringDocument(base);
  const landingX = 6200;
  return {
    ...document,
    mission: {
      ...document.mission,
      id: 'authoring_test_mission',
      codeName: 'DRAFT LANCE',
      title: 'AUTHORING TEST MISSION',
      theater: 'MISSION TOOLKIT RANGE',
      dayNumber: 1,
      timeString: 'DAY 1 — 0900',
      threatLevel: 'MODERATE',
      briefingText: 'Development-only mission assembled through the external authoring document.',
      tacticalNotes: ['Destroy the radar station.', 'Recover at the marked carrier landing surface.'],
      rulesOfEngagement: 'Development range rules apply.',
      mapLength: 7000,
      carrierX: 200,
      carrierLandingX: landingX,
      launchSite: 'CARRIER',
      recoverySite: 'CARRIER',
      hasCarrierLaunch: true,
      hasCarrierRecovery: true,
      defendedAsset: undefined,
      objectives: [
        objective('destroy_radar', 'Destroy the range radar', 'RADAR_STATION', 1, 1000),
        objective('recover', 'Recover aboard the carrier', 'LANDING', 1, 1000),
      ],
      phases: [{ id: 'INGRESS', label: 'RANGE INGRESS' }, { id: 'RECOVERY', label: 'RETURN TO CARRIER' }],
      events: [{ id: 'range_contact', trigger: { type: 'PLAYER_X', worldX: 1500 }, actions: [{ type: 'RADIO', message: 'RANGE CONTROL: AUTHORING TARGET IS ACTIVE.' }] }],
    },
    enemies: [createRangeRadar()],
  };
}

export function parseMissionAuthoringJson(value: string): MissionAuthoringDocumentV1 {
  const parsed = JSON.parse(value) as unknown;
  if (!parsed || typeof parsed !== 'object' || (parsed as { version?: unknown }).version !== 1 || !(parsed as { mission?: unknown }).mission || !Array.isArray((parsed as { enemies?: unknown }).enemies)) {
    throw new Error('Expected a MissionAuthoringDocumentV1 object.');
  }
  const document = parsed as MissionAuthoringDocumentV1;
  if (typeof document.mission !== 'object' || typeof document.mission.id !== 'string' || typeof document.mission.title !== 'string' || !Array.isArray(document.mission.objectives)) {
    throw new Error('Mission data requires string id/title fields and an objectives array.');
  }
  if (document.mission.phases !== undefined && !Array.isArray(document.mission.phases)) throw new Error('Mission phases must be an array.');
  if (document.mission.events !== undefined && !Array.isArray(document.mission.events)) throw new Error('Mission events must be an array.');
  return clone(document);
}

export function exportMissionAuthoringJson(document: MissionAuthoringDocumentV1): string {
  return `${JSON.stringify(document, null, 2)}\n`;
}

export function compileMissionAuthoringDocument(document: MissionAuthoringDocumentV1, knownAssets: ReadonlySet<string> = new Set()): MissionDefinition {
  const issues = validateMissionAuthoringDocument(document, knownAssets);
  const blockers = issues.filter((issue) => issue.severity === 'ERROR');
  if (blockers.length) throw new Error(blockers.map((issue) => `${issue.path}: ${issue.message}`).join('\n'));
  const snapshot = deepFreeze(clone(document));
  const definition: MissionDefinition = {
    ...snapshot.mission,
    spawnEnemies: () => snapshot.enemies.map((enemy) => clone(enemy)),
  };
  return deepFreeze(definition);
}

export function validateMissionAuthoringDocument(document: MissionAuthoringDocumentV1, knownAssets: ReadonlySet<string> = new Set()): MissionAuthoringIssue[] {
  const issues: MissionAuthoringIssue[] = [];
  if (document.version !== 1) error(issues, 'VERSION', 'version', 'Unsupported authoring document version.');
  const mission = document.mission;
  if (!mission || typeof mission !== 'object') {
    error(issues, 'MISSION_REQUIRED', 'mission', 'Mission design is required.');
    return issues;
  }
  if (!/^[a-z0-9_]+$/.test(mission.id || '')) error(issues, 'MISSION_ID', 'mission.id', 'Use a stable lowercase identifier containing letters, numbers and underscores.');
  if (!Number.isFinite(mission.mapLength) || mission.mapLength < 3000) error(issues, 'MAP_LENGTH', 'mission.mapLength', 'Map length must be at least 3,000 world units.');
  if (!inBounds(mission.carrierX, mission.mapLength)) error(issues, 'LAUNCH_BOUNDS', 'mission.carrierX', 'Launch site is outside the mission bounds.');
  if (!inBounds(mission.carrierLandingX, mission.mapLength)) error(issues, 'RECOVERY_BOUNDS', 'mission.carrierLandingX', 'Recovery surface is outside the mission bounds.');
  if (!mission.hasCarrierRecovery) error(issues, 'RECOVERY_REQUIRED', 'mission.hasCarrierRecovery', 'Authored missions require a reachable recovery surface.');

  const baseEnemies = Array.isArray(document.enemies) ? document.enemies : [];
  const eventEnemies = (mission.events || []).flatMap((event) => event.actions.flatMap((action) => action.type === 'SPAWN' ? action.enemies : []));
  const enemies = [...baseEnemies, ...eventEnemies];
  uniqueIds(enemies, 'enemies', issues);
  for (const [index, enemy] of enemies.entries()) {
    if (!SUPPORTED_ENEMY_TYPES.has(enemy.type)) error(issues, 'ENEMY_TYPE', `enemies[${index}].type`, `Unsupported enemy type ${String(enemy.type)}.`);
    if (!inBounds(enemy.x, mission.mapLength)) error(issues, 'ENEMY_BOUNDS', `enemies[${index}].x`, `${enemy.id} is outside the playable map.`);
    if (!Number.isFinite(enemy.y)) error(issues, 'ENEMY_Y', `enemies[${index}].y`, `${enemy.id} has no valid contact altitude.`);
  }
  const launchX = mission.carrierX + (mission.launchSite === 'FORWARD_BASE' ? 245 : 120);
  for (const enemy of baseEnemies.filter((item) => item.category === 'AIR' && item.isAlive)) {
    if (Math.abs(enemy.x - launchX) < 800) error(issues, 'UNSAFE_OPENING', `enemies.${enemy.id}.x`, `${enemy.id} begins within the protected 800-unit launch envelope.`);
  }

  const objectives = Array.isArray(mission.objectives) ? mission.objectives : [];
  uniqueIds(objectives, 'mission.objectives', issues);
  const availableTypes = new Map<string, number>();
  for (const enemy of enemies) availableTypes.set(enemy.type, (availableTypes.get(enemy.type) || 0) + 1);
  const launchedMissiles = enemies.filter((enemy) => enemy.type === 'MISSILE_CORVETTE').reduce((sum, enemy) => sum + Math.max(0, enemy.salvosRemaining || 0), 0);
  if (launchedMissiles) availableTypes.set('ANTI_SHIP_MISSILE', (availableTypes.get('ANTI_SHIP_MISSILE') || 0) + launchedMissiles);
  for (const [index, objective] of objectives.entries()) {
    if (objective.requiredCount < 1 || !Number.isInteger(objective.requiredCount)) error(issues, 'OBJECTIVE_COUNT', `mission.objectives[${index}].requiredCount`, 'Required count must be a positive integer.');
    if (!NON_ENEMY_OBJECTIVES.has(objective.targetType) && (availableTypes.get(objective.targetType) || 0) < objective.requiredCount) error(issues, 'UNREACHABLE_OBJECTIVE', `mission.objectives[${index}]`, `${objective.id} needs ${objective.requiredCount} ${objective.targetType} targets but only ${availableTypes.get(objective.targetType) || 0} exist.`);
  }
  if (!objectives.some((objective) => objective.targetType === 'LANDING')) warning(issues, 'LANDING_OBJECTIVE', 'mission.objectives', 'Mission has no explicit landing objective.');

  const phases = mission.phases || [];
  uniqueIds(phases, 'mission.phases', issues);
  const objectiveIds = new Set(objectives.map((objective) => objective.id));
  const enemyIds = new Set(enemies.map((enemy) => enemy.id));
  const phaseIds = new Set(phases.map((phase) => phase.id));
  uniqueIds(mission.events || [], 'mission.events', issues);
  for (const [index, event] of (mission.events || []).entries()) validateEvent(event, index, objectiveIds, enemyIds, phaseIds, mission.mapLength, issues);

  const profile = mission.terrainContact?.heightProfile;
  if (!mission.terrainContact) warning(issues, 'TERRAIN_CONTACT', 'mission.terrainContact', 'Mission uses the generic terrain profile; add authored contact samples for final release.');
  if (profile) {
    if (profile.samples.length < 2) error(issues, 'TERRAIN_SAMPLES', 'mission.terrainContact.heightProfile.samples', 'Terrain contact requires at least two samples.');
    if (profile.endWorldX <= profile.startWorldX) error(issues, 'TERRAIN_RANGE', 'mission.terrainContact.heightProfile', 'Terrain sample coverage must be ordered.');
    else if (profile.startWorldX > 0 || profile.endWorldX < mission.mapLength) warning(issues, 'TERRAIN_COVERAGE', 'mission.terrainContact.heightProfile', 'Terrain samples do not cover the complete playable route; generic contact fills the uncovered area.');
    if (profile.samples.some((sample) => sample !== null && !Number.isFinite(sample))) error(issues, 'TERRAIN_VALUE', 'mission.terrainContact.heightProfile.samples', 'Terrain samples must be finite numbers or null water gaps.');
  }

  const backdrop = mission.presentation?.backdropAsset;
  if (!backdrop?.startsWith('/assets/')) error(issues, 'BACKDROP_REQUIRED', 'mission.presentation.backdropAsset', 'Select a bundled /assets/ panorama.');
  else if (knownAssets.size && !knownAssets.has(backdrop)) error(issues, 'UNSUPPORTED_ASSET', 'mission.presentation.backdropAsset', `${backdrop} is not in the bundled mission-art catalogue.`);
  if ((mission.presentation?.overscan ?? 0) < 0.02) warning(issues, 'PANORAMA_COVERAGE', 'mission.presentation.overscan', 'Use at least 0.02 overscan to protect wide viewport edges.');
  return issues;
}

function validateEvent(event: MissionEvent, index: number, objectiveIds: Set<string>, enemyIds: Set<string>, phaseIds: Set<string>, mapLength: number, issues: MissionAuthoringIssue[]): void {
  const path = `mission.events[${index}]`;
  const trigger = event.trigger;
  if (trigger.type === 'ELAPSED_TICKS' && (!Number.isInteger(trigger.ticks) || trigger.ticks < 0)) error(issues, 'EVENT_TICK', `${path}.trigger.ticks`, 'Event tick must be a non-negative simulation tick.');
  if (trigger.type === 'PLAYER_X' && !inBounds(trigger.worldX, mapLength)) error(issues, 'EVENT_X', `${path}.trigger.worldX`, 'Player-position trigger is outside the map.');
  if (trigger.type === 'OBJECTIVE_COMPLETE' && !objectiveIds.has(trigger.objectiveId)) error(issues, 'EVENT_OBJECTIVE', `${path}.trigger.objectiveId`, `Unknown objective ${trigger.objectiveId}.`);
  if (trigger.type === 'OBJECTIVES_COMPLETE') for (const id of trigger.objectiveIds) if (!objectiveIds.has(id)) error(issues, 'EVENT_OBJECTIVE', `${path}.trigger.objectiveIds`, `Unknown objective ${id}.`);
  if (trigger.type === 'ENEMY_DESTROYED' || trigger.type === 'ENEMY_CROSSED_X') for (const id of trigger.enemyIds) if (!enemyIds.has(id)) error(issues, 'EVENT_ENEMY', `${path}.trigger.enemyIds`, `Unknown enemy ${id}.`);
  for (const action of event.actions) validateAction(action, path, objectiveIds, enemyIds, phaseIds, issues);
}

function validateAction(action: MissionAction, path: string, objectiveIds: Set<string>, enemyIds: Set<string>, phaseIds: Set<string>, issues: MissionAuthoringIssue[]): void {
  if ((action.type === 'UNLOCK_OBJECTIVE' || action.type === 'COMPLETE_OBJECTIVE') && !objectiveIds.has(action.objectiveId)) error(issues, 'ACTION_OBJECTIVE', `${path}.actions`, `Unknown objective ${action.objectiveId}.`);
  if (action.type === 'ACTIVATE_TARGETS') for (const id of action.enemyIds) if (!enemyIds.has(id)) error(issues, 'ACTION_ENEMY', `${path}.actions`, `Unknown enemy ${id}.`);
  if (action.type === 'SET_PHASE' && !phaseIds.has(action.phaseId)) error(issues, 'ACTION_PHASE', `${path}.actions`, `Unknown phase ${action.phaseId}.`);
  if (action.type === 'RADIO' && !action.message.trim()) error(issues, 'RADIO_MESSAGE', `${path}.actions`, 'Radio event needs a caption.');
}

function objective(id: string, description: string, targetType: MissionObjective['targetType'], requiredCount: number, points: number): MissionObjective {
  return { id, description, targetType, requiredCount, points, isPrimary: true, completed: false, currentCount: 0 };
}

function createRangeRadar(): EnemyUnit {
  return { id: 'range_radar', type: 'RADAR_STATION', category: 'GROUND', name: 'Range radar', x: 2800, y: 560, vx: 0, vy: 0, width: 64, height: 46, health: 120, maxHealth: 120, isAlive: true, isTargetable: true, isPrimaryObjective: true, pointsValue: 1000, rotation: 0, fireCooldown: 0, reloadTime: 120, detectionRange: 900, accuracy: 0, stateTimer: 0, state: 'ACTIVE' };
}

function uniqueIds(items: Array<{ id: string }>, path: string, issues: MissionAuthoringIssue[]): void {
  const seen = new Set<string>();
  for (const [index, item] of items.entries()) {
    if (!item.id?.trim()) error(issues, 'ID_REQUIRED', `${path}[${index}].id`, 'A stable identifier is required.');
    else if (seen.has(item.id)) error(issues, 'DUPLICATE_ID', `${path}[${index}].id`, `Duplicate identifier ${item.id}.`);
    seen.add(item.id);
  }
}

function inBounds(value: number, mapLength: number): boolean {
  return Number.isFinite(value) && value >= 0 && value <= mapLength;
}

function error(issues: MissionAuthoringIssue[], code: string, path: string, message: string): void {
  issues.push({ severity: 'ERROR', code, path, message });
}

function warning(issues: MissionAuthoringIssue[], code: string, path: string, message: string): void {
  issues.push({ severity: 'WARNING', code, path, message });
}

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function deepFreeze<T>(value: T): T {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const child of Object.values(value as Record<string, unknown>)) deepFreeze(child);
  }
  return value;
}
