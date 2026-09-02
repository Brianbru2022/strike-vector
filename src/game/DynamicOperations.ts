import {
  DifficultyPreset,
  EnemyType,
  EnemyUnit,
  LoadoutPreset,
  MissionDefinition,
  MissionEvent,
  OperationArchetype,
  OperationBlueprint,
  OperationBlueprintV1,
  OperationBlueprintV2,
  OperationBlueprintV3,
  OperationContentSet,
  OperationGenerationVersion,
  OperationLength,
  OperationalModifier,
  OperationSortie,
  TerrainProfile,
  TimeOfDay,
  WeatherEffect,
} from '../types/game';
import { GAME_CONSTANTS } from './constants';
import { CAMPAIGN_MISSIONS } from './Missions';
import { createSeededRandom } from './SeededRandom';

interface ArchetypeConfig {
  templateIndex: number;
  presentationTemplateIndex?: number;
  label: string;
  terrain: TerrainProfile;
  expectedThreats: string[];
  recommendedLoadout: LoadoutPreset;
  optionalType: EnemyType;
  optionalLabel: string;
}

export const OPERATION_ARCHETYPES: Record<OperationArchetype, ArchetypeConfig> = {
  FLEET_CAP: { templateIndex: 5, label: 'Fleet Combat Air Patrol', terrain: 'OPEN_SEA', expectedThreats: ['MiG-29A', 'missile corvettes', 'sea-skimming missiles'], recommendedLoadout: 'FLEET_CAP', optionalType: 'PATROL_BOAT', optionalLabel: 'Sink the escort patrol boat' },
  SEAD: { templateIndex: 1, label: 'Air Defence Suppression', terrain: 'FJORD_PASS', expectedThreats: ['SA-8 batteries', 'early-warning radar', 'fighter cover'], recommendedLoadout: 'STRIKE', optionalType: 'AA_FLAK_GUN', optionalLabel: 'Silence the supporting flak position' },
  ARMOURED_INTERDICTION: { templateIndex: 6, label: 'Armoured Interdiction', terrain: 'ISLAND_CAUSEWAY', expectedThreats: ['T-72 armour', 'command vehicles', 'mobile SAM escort'], recommendedLoadout: 'CLOSE_SUPPORT', optionalType: 'SAM_LAUNCHER', optionalLabel: 'Destroy the convoy SAM escort' },
  PILOT_RESCUE: { templateIndex: 4, label: 'Combat Search and Rescue', terrain: 'BEACHHEAD', expectedThreats: ['Mi-24D patrol', 'shore flak', 'armoured search parties'], recommendedLoadout: 'CLOSE_SUPPORT', optionalType: 'ATTACK_HELI', optionalLabel: 'Destroy the hostile rescue hunter' },
  FARP_DEFENCE: { templateIndex: 8, label: 'Forward Base Defence', terrain: 'FORWARD_BASE', expectedThreats: ['low-level strike aircraft', 'MiG escorts', 'SA-8 support'], recommendedLoadout: 'FLEET_CAP', optionalType: 'ATTACK_HELI', optionalLabel: 'Destroy the attack helicopter leader' },
  DEEP_STRIKE: { templateIndex: 9, label: 'Hardened Target Strike', terrain: 'FORTRESS', expectedThreats: ['layered SA-8 belt', 'command radar', 'hardened targets'], recommendedLoadout: 'STRIKE', optionalType: 'AA_FLAK_GUN', optionalLabel: 'Neutralise the fortress flak battery' },
};

export const NORWEGIAN_OPERATION_ARCHETYPES: Record<OperationArchetype, ArchetypeConfig> = {
  FLEET_CAP: { templateIndex: 14, label: 'Arctic Fleet Combat Air Patrol', terrain: 'ARCTIC_OPEN_SEA', expectedThreats: ['MiG fighter screen', 'missile corvettes', 'sea-skimming missiles'], recommendedLoadout: 'CLOSE_SUPPORT', optionalType: 'PATROL_BOAT', optionalLabel: 'Sink the North Cape escort boat' },
  SEAD: { templateIndex: 11, label: 'Fjord Air Defence Suppression', terrain: 'ARCTIC_DEEP_FJORD', expectedThreats: ['SA-6 and SA-8 corridor', 'radar relays', 'coastal guns'], recommendedLoadout: 'STRIKE', optionalType: 'COASTAL_ARTILLERY', optionalLabel: 'Silence the fjord coastal battery' },
  ARMOURED_INTERDICTION: { templateIndex: 12, label: 'Arctic Bridgehead Interdiction', terrain: 'ARCTIC_BRIDGEHEAD', expectedThreats: ['T-72 reserve', 'coastal artillery', 'bridge defences'], recommendedLoadout: 'CLOSE_SUPPORT', optionalType: 'COMMAND_VEHICLE', optionalLabel: 'Destroy the reserve command vehicle' },
  PILOT_RESCUE: { templateIndex: 13, label: 'Whiteout Combat Search and Rescue', terrain: 'POLAR_NIGHT_PLATEAU', expectedThreats: ['whiteout conditions', 'Mi-24D search patrol', 'MiG interceptor'], recommendedLoadout: 'CLOSE_SUPPORT', optionalType: 'ATTACK_HELI', optionalLabel: 'Destroy the hostile rescue hunter' },
  FARP_DEFENCE: { templateIndex: 8, presentationTemplateIndex: 12, label: 'Troms Forward Base Defence', terrain: 'ARCTIC_BRIDGEHEAD', expectedThreats: ['low-level fighter waves', 'ridge SAM', 'FARP attack runs'], recommendedLoadout: 'FLEET_CAP', optionalType: 'ATTACK_HELI', optionalLabel: 'Destroy the Arctic raid leader' },
  DEEP_STRIKE: { templateIndex: 15, label: 'North Cape Hardened Strike', terrain: 'NORTH_CAPE_FORTRESS', expectedThreats: ['missile picket', 'layered SAM belt', 'hardened command targets'], recommendedLoadout: 'STRIKE', optionalType: 'COASTAL_ARTILLERY', optionalLabel: 'Neutralise the North Cape coastal guns' },
};

const ARCHETYPES = Object.keys(OPERATION_ARCHETYPES) as OperationArchetype[];
const CODE_NAMES = ['COLD ANVIL', 'GREY LANTERN', 'NORTH SABRE', 'IRON CURRENT', 'SILENT TRIDENT', 'WINTER SPEAR'];
const THEATRES = ['NORTHERN ARCHIPELAGO', 'FAROE APPROACHES', 'JANUS LITTORAL', 'SKELD DEFENCE ZONE', 'BASTION OUTER REACH'];
const NORWEGIAN_CODE_NAMES = ['ICE CROWN', 'POLAR LANCE', 'FROZEN CURRENT', 'ARCTIC HAMMER', 'MIDNIGHT SHIELD', 'NORTH STAR'];
const NORWEGIAN_THEATRES = ['VESTFJORD PATROL BOX', 'HAMMERFALL CORRIDOR', 'TROMS BRIDGEHEAD', 'LYNGEN RESCUE ZONE', 'NORTH CAPE APPROACHES'];
const WEATHER: WeatherEffect['condition'][] = ['CLEAR', 'OVERCAST', 'RAIN', 'MIST', 'THUNDERSTORM'];
const TIMES: TimeOfDay['time'][] = ['DAWN', 'DAY', 'SUNSET', 'NIGHT'];

export function seedToCode(seed: number): string {
  return `IK-${(seed >>> 0).toString(36).toUpperCase().padStart(7, '0')}`;
}

export function seedFromCode(value: string): number {
  const normalised = value.trim().toUpperCase().replace(/^(?:IK|SV)-/, '');
  if (/^[0-9A-Z]+$/.test(normalised)) {
    const parsed = Number.parseInt(normalised, 36);
    if (Number.isFinite(parsed)) return parsed >>> 0;
  }
  return hashString(value.trim() || 'IRON-KESTREL');
}

export function getDailyOperationSeeds(date = new Date(), version: OperationGenerationVersion = 1): number[] {
  const day = date.toISOString().slice(0, 10);
  return [0, 1, 2].map((slot) => hashString(`${day}:${version === 1 ? 'NORTH-ATLANTIC' : version === 2 ? 'NORWEGIAN-SEA-V2' : 'DYNAMIC-OPERATIONS-V3'}:${slot}`));
}

export function generateOperation(seed: number, difficulty: DifficultyPreset, version?: 1): OperationBlueprintV1;
export function generateOperation(seed: number, difficulty: DifficultyPreset, version: 2): OperationBlueprintV2;
export function generateOperation(seed: number, difficulty: DifficultyPreset, version: OperationGenerationVersion = 1): OperationBlueprint {
  const stableSeed = seed >>> 0;
  const random = createSeededRandom(stableSeed);
  const configs = version === 1 ? OPERATION_ARCHETYPES : NORWEGIAN_OPERATION_ARCHETYPES;
  const codeNames = version === 1 ? CODE_NAMES : NORWEGIAN_CODE_NAMES;
  const theatres = version === 1 ? THEATRES : NORWEGIAN_THEATRES;
  const available = [...ARCHETYPES];
  const sorties: OperationSortie[] = [];
  for (let index = 0; index < 3; index++) {
    const preferred = index === 0
      ? (['FLEET_CAP', 'SEAD', 'ARMOURED_INTERDICTION'] as OperationArchetype[])
      : index === 1
        ? (['FARP_DEFENCE', 'PILOT_RESCUE', 'ARMOURED_INTERDICTION'] as OperationArchetype[])
        : available;
    const candidates = preferred.filter((archetype) => available.includes(archetype));
    const archetype = candidates[Math.floor(random() * candidates.length)];
    available.splice(available.indexOf(archetype), 1);
    const config = configs[archetype];
    const missionSeed = Math.floor(random() * 0xffffffff) >>> 0;
    const weather = WEATHER[Math.floor(random() * WEATHER.length)];
    const timeOfDay = TIMES[Math.floor(random() * TIMES.length)];
    const template = CAMPAIGN_MISSIONS[config.templateIndex];
    sorties.push({
      index,
      missionSeed,
      archetype,
      title: `${index + 1}. ${config.label}`,
      terrainProfile: config.terrain,
      weather,
      timeOfDay,
      recoverySite: template.recoverySite || 'CARRIER',
      expectedThreats: [...config.expectedThreats],
      recommendedLoadout: config.recommendedLoadout,
    });
  }
  const blueprint = {
    version,
    ...(version === 2 ? { contentSet: 'NORWEGIAN_SEA' as const } : {}),
    seed: stableSeed,
    seedCode: seedToCode(stableSeed),
    codeName: codeNames[Math.floor(random() * codeNames.length)],
    theater: theatres[Math.floor(random() * theatres.length)],
    difficulty,
    sorties,
  } as OperationBlueprint;
  return deepFreeze(blueprint);
}

export function generateOperationV3(seed: number, difficulty: DifficultyPreset, contentSet: OperationContentSet, sortieCount: OperationLength): OperationBlueprintV3 {
  const stableSeed = seed >>> 0;
  const random = createSeededRandom(hashString(`OPS3:${stableSeed}:${difficulty}:${contentSet}:${sortieCount}`));
  const configs = contentSet === 'NORWEGIAN_SEA' ? NORWEGIAN_OPERATION_ARCHETYPES : OPERATION_ARCHETYPES;
  const codeNames = contentSet === 'NORWEGIAN_SEA' ? NORWEGIAN_CODE_NAMES : CODE_NAMES;
  const theatres = contentSet === 'NORWEGIAN_SEA' ? NORWEGIAN_THEATRES : THEATRES;
  const available = [...ARCHETYPES];
  const sorties: OperationSortie[] = [];
  for (let index = 0; index < sortieCount; index++) {
    const preferred = index === 0
      ? (['FLEET_CAP', 'SEAD', 'ARMOURED_INTERDICTION'] as OperationArchetype[])
      : index === 1
        ? (['FARP_DEFENCE', 'PILOT_RESCUE', 'ARMOURED_INTERDICTION'] as OperationArchetype[])
        : available;
    const candidates = preferred.filter((archetype) => available.includes(archetype));
    const archetype = candidates[Math.floor(random() * candidates.length)];
    available.splice(available.indexOf(archetype), 1);
    const config = configs[archetype];
    const template = CAMPAIGN_MISSIONS[config.templateIndex];
    const recoverySite = template.recoverySite || 'CARRIER';
    const compatibleModifiers: OperationalModifier[] = ['LIMITED_VISIBILITY', 'RADAR_DISRUPTION', 'THREATENED_RECOVERY'];
    if (recoverySite === 'FORWARD_BASE') compatibleModifiers.push('DAMAGED_RUNWAY');
    const modifiers = [compatibleModifiers[Math.floor(random() * compatibleModifiers.length)]];
    if (index === sortieCount - 1 && !modifiers.includes('THREATENED_RECOVERY')) modifiers.push('THREATENED_RECOVERY');
    sorties.push({
      index,
      missionSeed: Math.floor(random() * 0xffffffff) >>> 0,
      archetype,
      title: `${index + 1}. ${config.label}`,
      terrainProfile: config.terrain,
      weather: WEATHER[Math.floor(random() * WEATHER.length)],
      timeOfDay: TIMES[Math.floor(random() * TIMES.length)],
      recoverySite,
      expectedThreats: [...config.expectedThreats],
      recommendedLoadout: config.recommendedLoadout,
      modifiers,
    });
  }
  return deepFreeze({
    version: 3,
    contentSet,
    sortieCount,
    seed: stableSeed,
    seedCode: seedToCode(stableSeed),
    codeName: codeNames[Math.floor(random() * codeNames.length)],
    theater: theatres[Math.floor(random() * theatres.length)],
    difficulty,
    sorties,
  });
}

export function generateOperationMission(blueprint: OperationBlueprint, sortieIndex: number, defendedAssets?: { CARRIER: number; FORWARD_BASE: number }): MissionDefinition {
  const sortie = blueprint.sorties[sortieIndex];
  if (!sortie) throw new Error(`Invalid operation sortie index ${sortieIndex}`);
  const norwegianContent = blueprint.version === 2 || (blueprint.version === 3 && blueprint.contentSet === 'NORWEGIAN_SEA');
  const configs = norwegianContent ? NORWEGIAN_OPERATION_ARCHETYPES : OPERATION_ARCHETYPES;
  const config = configs[sortie.archetype];
  const template = CAMPAIGN_MISSIONS[config.templateIndex];
  const presentationTemplate = CAMPAIGN_MISSIONS[config.presentationTemplateIndex ?? config.templateIndex];
  const random = createSeededRandom(sortie.missionSeed);
  const stage = sortie.index + 1;
  const optionalId = `op_${blueprint.seed}_${stage}_optional`;
  const totalSorties = blueprint.sorties.length;
  const modifiers = sortie.modifiers || [];
  const reinforcementTick = 780 + stage * 180 + Math.floor(random() * 360) + (modifiers.includes('RADAR_DISRUPTION') ? 240 : 0);
  const reinforcementX = Math.round(template.mapLength * (0.48 + random() * 0.2));
  const reinforcements = Array.from({ length: stage }, (_, index) => createReinforcement(config.optionalType, `op_${blueprint.seed}_${stage}_reinforcement_${index}`, reinforcementX + index * 170, random));
  const generatedEvent: MissionEvent = {
    id: `op_${blueprint.seed}_${stage}_contact`,
    trigger: { type: 'ELAPSED_TICKS', ticks: reinforcementTick },
    actions: [
      { type: 'RADIO', message: `OPERATIONS CONTROL: ${config.label.toUpperCase()} REINFORCEMENTS COMMITTED.` },
      { type: 'SPAWN', enemies: reinforcements },
    ],
  };
  const timeOfDay = buildTimeOfDay(sortie.timeOfDay);
  const weather = buildWeather(modifiers.includes('LIMITED_VISIBILITY') ? 'MIST' : sortie.weather, random);
  const threatLevel = stage === 1 ? 'MODERATE' : stage < totalSorties ? 'HIGH' : 'CRITICAL';
  const prefix = `op_${blueprint.seed}_${stage}`;
  const spawnedEnemies = template.spawnEnemies().map((enemy, index) => ({
    ...enemy,
    id: `${prefix}_${enemy.id}`,
    x: Math.max(900, Math.min(template.mapLength - 650, enemy.x + Math.round((random() - 0.5) * 260))),
    health: Math.round(enemy.health * (1 + (stage - 1) * 0.08)),
    maxHealth: Math.round(enemy.maxHealth * (1 + (stage - 1) * 0.08)),
    fireCooldown: enemy.fireCooldown + index % 3,
  }));

  return {
    ...template,
    id: prefix,
    codeName: blueprint.codeName,
    title: sortie.title,
    dayNumber: 1 + (blueprint.seed % 28),
    timeString: `DEPLOYMENT ${stage}/3 — ${sortie.timeOfDay}`,
    theater: blueprint.theater,
    terrainProfile: sortie.terrainProfile,
    terrainContact: presentationTemplate.terrainContact ? { ...presentationTemplate.terrainContact, heightProfile: presentationTemplate.terrainContact.heightProfile ? { ...presentationTemplate.terrainContact.heightProfile, samples: [...presentationTemplate.terrainContact.heightProfile.samples] } : undefined } : template.terrainContact,
    presentation: presentationTemplate.presentation ? { ...presentationTemplate.presentation } : template.presentation,
    arcticWeather: norwegianContent && presentationTemplate.arcticWeather ? { ...presentationTemplate.arcticWeather } : template.arcticWeather,
    operationModifiers: [...modifiers],
    weather,
    timeOfDay,
    threatLevel,
    briefingText: `${config.label} tasking for Operation ${blueprint.codeName}. Complete the designated objectives, exploit any secondary opportunity and recover at the assigned ${sortie.recoverySite === 'CARRIER' ? 'carrier group' : 'forward base'}. Exact hostile dispositions remain unconfirmed.`,
    tacticalNotes: [
      `Deployment stage ${stage} of ${totalSorties}. Aircraft and defended-asset condition carry forward.`,
      `Expected threats: ${sortie.expectedThreats.join(', ')}.`,
      `Recommended fit: ${formatLoadout(sortie.recommendedLoadout)}.`,
      ...(modifiers.length ? [`Operational modifiers: ${modifiers.map(formatModifier).join(', ')}.`] : []),
    ],
    rulesOfEngagement: template.rulesOfEngagement,
    objectives: [
      ...template.objectives.map((objective) => ({ ...objective, id: `${prefix}_${objective.id}`, completed: false, currentCount: 0 })),
      { id: optionalId, description: config.optionalLabel, isPrimary: false, completed: false, requiredCount: 1, currentCount: 0, targetType: config.optionalType, points: 900 + stage * 250 },
    ],
    phases: template.phases?.map((phase) => ({ ...phase })) || [
      { id: 'INGRESS', label: 'TACTICAL INGRESS' },
      { id: 'CONTACT', label: 'HOSTILE CONTACT' },
    ],
    events: [...cloneEvents(template.events || [], prefix), generatedEvent, ...(blueprint.version === 3 && stage >= 4 ? [{ id: `${prefix}_late_contact`, trigger: { type: 'ELAPSED_TICKS' as const, ticks: reinforcementTick + 540 }, actions: [{ type: 'RADIO' as const, message: 'OPERATIONS CONTROL: SECOND HOSTILE FORMATION ENTERING THE BATTLESPACE.' }, { type: 'SPAWN' as const, enemies: [createReinforcement(config.optionalType, `${prefix}_late_reinforcement`, Math.min(template.mapLength - 650, reinforcementX + 420), random)] }] }] : [])],
    defendedAsset: modifiers.includes('THREATENED_RECOVERY')
      ? { type: sortie.recoverySite, worldX: template.carrierLandingX, startingIntegrity: defendedAssets?.[sortie.recoverySite] ?? 100, failureThreshold: 0 }
      : template.defendedAsset ? { ...template.defendedAsset, startingIntegrity: template.defendedAsset.type === 'CARRIER' || template.defendedAsset.type === 'FORWARD_BASE' ? defendedAssets?.[template.defendedAsset.type] ?? template.defendedAsset.startingIntegrity : template.defendedAsset.startingIntegrity } : undefined,
    spawnEnemies: () => spawnedEnemies.map((enemy) => ({ ...enemy })),
  };
}

function formatModifier(modifier: OperationalModifier): string {
  return modifier.toLowerCase().replaceAll('_', ' ');
}

function createReinforcement(type: EnemyType, id: string, x: number, random: () => number): EnemyUnit {
  const air = type === 'PATROL_FIGHTER' || type === 'ATTACK_HELI';
  const naval = type === 'PATROL_BOAT';
  const category = air ? 'AIR' : naval ? 'NAVAL' : 'GROUND';
  const health = type === 'PATROL_FIGHTER' ? 80 : type === 'ATTACK_HELI' ? 90 : type === 'SAM_LAUNCHER' ? 190 : 125;
  return {
    id, type, category, name: `Operation reinforcement ${id.slice(-1)}`,
    x, y: air ? 190 + random() * 190 : naval ? GAME_CONSTANTS.SEA_LEVEL_Y - 13 : GAME_CONSTANTS.GROUND_SURFACE_Y,
    vx: air ? -5.5 - random() * 1.5 : naval ? -0.35 : 0, vy: 0,
    width: air ? 58 : naval ? 118 : 48, height: air ? 24 : naval ? 34 : 31,
    health, maxHealth: health, isAlive: true, isTargetable: true, isSecondaryObjective: true,
    pointsValue: air ? 700 : naval ? 650 : 600, rotation: air ? Math.PI : 0,
    fireCooldown: 35, reloadTime: air ? 62 : 100, detectionRange: air ? 780 : 820,
    accuracy: 0.78, stateTimer: 0, state: air ? 'PATROL' : 'ACTIVE',
    aircraftVariant: type === 'PATROL_FIGHTER' ? 'MIG_23ML' : type === 'ATTACK_HELI' ? 'MI_24D' : undefined,
  };
}

function cloneEvents(events: MissionEvent[], prefix: string): MissionEvent[] {
  return events.map((event) => ({
    ...event,
    id: `${prefix}_${event.id}`,
    trigger: event.trigger.type === 'OBJECTIVE_COMPLETE' ? { ...event.trigger, objectiveId: `${prefix}_${event.trigger.objectiveId}` } : event.trigger.type === 'OBJECTIVES_COMPLETE' ? { ...event.trigger, objectiveIds: event.trigger.objectiveIds.map((id) => `${prefix}_${id}`) } : event.trigger.type === 'ENEMY_CROSSED_X' ? { ...event.trigger, enemyIds: event.trigger.enemyIds.map((id) => `${prefix}_${id}`) } : { ...event.trigger },
    actions: event.actions.map((action) => action.type === 'SPAWN' ? { ...action, enemies: action.enemies.map((enemy) => ({ ...enemy, id: `${prefix}_${enemy.id}` })) } : action.type === 'ACTIVATE_TARGETS' ? { ...action, enemyIds: action.enemyIds.map((id) => `${prefix}_${id}`) } : action.type === 'UNLOCK_OBJECTIVE' || action.type === 'COMPLETE_OBJECTIVE' ? { ...action, objectiveId: `${prefix}_${action.objectiveId}` } : { ...action }),
  }));
}

function buildWeather(condition: WeatherEffect['condition'], random: () => number): WeatherEffect {
  return { condition, windSpeed: 4 + random() * 10, cloudsDensity: condition === 'CLEAR' ? 0.18 : condition === 'MIST' ? 0.55 : 0.72, lightningFrequency: condition === 'THUNDERSTORM' ? 0.018 : 0 };
}

function buildTimeOfDay(time: TimeOfDay['time']): TimeOfDay {
  if (time === 'NIGHT') return { time, ambientLight: 0.4, skyTopColor: '#020617', skyBottomColor: '#0f172a', sunColor: '#94a3b8', fogColor: '#020617' };
  if (time === 'SUNSET') return { time, ambientLight: 0.68, skyTopColor: '#312e81', skyBottomColor: '#f43f5e', sunColor: '#fef08a', fogColor: '#7c2d12' };
  if (time === 'DAWN') return { time, ambientLight: 0.78, skyTopColor: '#1e1b4b', skyBottomColor: '#fb923c', sunColor: '#fde047', fogColor: '#7c2d12' };
  return { time, ambientLight: 0.92, skyTopColor: '#075985', skyBottomColor: '#bae6fd', sunColor: '#fef08a', fogColor: '#e0f2fe' };
}

function formatLoadout(loadout: LoadoutPreset): string {
  return loadout === 'FLEET_CAP' ? 'Fleet CAP' : loadout === 'CLOSE_SUPPORT' ? 'Close Support' : 'Strike';
}

function hashString(value: string): number {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index++) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function deepFreeze<T>(value: T): T {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const child of Object.values(value as Record<string, unknown>)) deepFreeze(child);
  }
  return value;
}
