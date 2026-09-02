import { describe, expect, it } from 'vitest';
import { FixedStepClock } from './FixedStepClock';
import { generateOperation, generateOperationMission, generateOperationV3, getDailyOperationSeeds, seedFromCode, seedToCode } from './DynamicOperations';
import { MissionDirector } from './MissionDirector';
import { DEFAULT_AIRCRAFT_CONDITION } from './ServiceSystem';
import { PlayerAircraft } from './PlayerAircraft';
import { LOADOUT_PRESETS } from './ServiceSystem';

describe('dynamic operation generation', () => {
  it('reproduces immutable operation and force definitions from a seed', () => {
    const first = generateOperation(1987, 'PILOT');
    const second = generateOperation(1987, 'PILOT');
    expect(first).toEqual(second);
    expect(Object.isFrozen(first)).toBe(true);
    expect(new Set(first.sorties.map((sortie) => sortie.archetype)).size).toBe(3);
    const mission = generateOperationMission(first, 1);
    expect(mission.spawnEnemies()).toEqual(mission.spawnEnemies());
  });

  it('keeps V1 operation content stable while using the Iron Kestrel display prefix', () => {
    const operation = generateOperation(1987, 'PILOT');
    expect(operation).toEqual({
      version: 1,
      seed: 1987,
      seedCode: 'IK-00001J7',
      codeName: 'SILENT TRIDENT',
      theater: 'BASTION OUTER REACH',
      difficulty: 'PILOT',
      sorties: [
        { index: 0, missionSeed: 799216799, archetype: 'FLEET_CAP', title: '1. Fleet Combat Air Patrol', terrainProfile: 'OPEN_SEA', weather: 'RAIN', timeOfDay: 'NIGHT', recoverySite: 'CARRIER', expectedThreats: ['MiG-29A', 'missile corvettes', 'sea-skimming missiles'], recommendedLoadout: 'FLEET_CAP' },
        { index: 1, missionSeed: 3417883247, archetype: 'PILOT_RESCUE', title: '2. Combat Search and Rescue', terrainProfile: 'BEACHHEAD', weather: 'CLEAR', timeOfDay: 'NIGHT', recoverySite: 'FORWARD_BASE', expectedThreats: ['Mi-24D patrol', 'shore flak', 'armoured search parties'], recommendedLoadout: 'CLOSE_SUPPORT' },
        { index: 2, missionSeed: 1535494648, archetype: 'SEAD', title: '3. Air Defence Suppression', terrainProfile: 'FJORD_PASS', weather: 'THUNDERSTORM', timeOfDay: 'DAWN', recoverySite: 'CARRIER', expectedThreats: ['SA-8 batteries', 'early-warning radar', 'fighter cover'], recommendedLoadout: 'STRIKE' },
      ],
    });
    expect(stableHash(JSON.stringify({ ...operation, seedCode: operation.seedCode.replace(/^IK-/, 'SV-') }))).toBe(4001643771);
  });

  it('generates deterministic Norwegian V2 operations from the expansion toolkit', () => {
    const first = generateOperation(1987, 'PILOT', 2);
    const second = generateOperation(1987, 'PILOT', 2);
    expect(first).toEqual(second);
    expect(first).toMatchObject({ version: 2, contentSet: 'NORWEGIAN_SEA' });
    expect(first.sorties.every((sortie) => ['ARCTIC_OPEN_SEA', 'ARCTIC_DEEP_FJORD', 'ARCTIC_BRIDGEHEAD', 'POLAR_NIGHT_PLATEAU', 'NORTH_CAPE_FORTRESS'].includes(sortie.terrainProfile))).toBe(true);
    expect(first.sorties.every((_, index) => generateOperationMission(first, index).presentation?.backdropAsset?.includes('arctic'))).toBe(true);
    expect(getDailyOperationSeeds(new Date('1987-05-01T12:00:00Z'), 2)).not.toEqual(getDailyOperationSeeds(new Date('1987-05-01T12:00:00Z')));
    expect(stableHash(JSON.stringify(first))).toBe(1133989887);
    expect(stableHash(JSON.stringify({ ...first, seedCode: first.seedCode.replace(/^IK-/, 'SV-') }))).toBe(300066680);
  });

  it('generates deterministic three- and five-sortie V3 deployments with compatible modifiers', () => {
    for (const sortieCount of [3, 5] as const) {
      const first = generateOperationV3(1987, 'PILOT', 'NORWEGIAN_SEA', sortieCount);
      expect(first).toEqual(generateOperationV3(1987, 'PILOT', 'NORWEGIAN_SEA', sortieCount));
      expect(first).toMatchObject({ version: 3, contentSet: 'NORWEGIAN_SEA', sortieCount });
      expect(first.sorties).toHaveLength(sortieCount);
      expect(new Set(first.sorties.map((sortie) => sortie.archetype)).size).toBe(sortieCount);
      expect(first.sorties.at(-1)?.modifiers).toContain('THREATENED_RECOVERY');
      expect(first.sorties.filter((sortie) => sortie.modifiers?.includes('DAMAGED_RUNWAY')).every((sortie) => sortie.recoverySite === 'FORWARD_BASE')).toBe(true);
    }
  });

  it('carries defended-asset condition into threatened V3 recovery missions', () => {
    const operation = generateOperationV3(71, 'VETERAN', 'NORTH_ATLANTIC', 5);
    const index = operation.sorties.findIndex((sortie) => sortie.modifiers?.includes('THREATENED_RECOVERY'));
    const sortie = operation.sorties[index];
    const mission = generateOperationMission(operation, index, { CARRIER: 62, FORWARD_BASE: 74 });
    expect(mission.defendedAsset).toMatchObject({ type: sortie.recoverySite, startingIntegrity: sortie.recoverySite === 'CARRIER' ? 62 : 74 });
    expect(mission.operationModifiers).toEqual(sortie.modifiers);
  });

  it('keeps one thousand Norwegian V2 deployments achievable and in bounds', () => {
    for (let seed = 0; seed < 1000; seed++) {
      const operation = generateOperation(seed, seed % 2 ? 'PILOT' : 'VETERAN', 2);
      expect(new Set(operation.sorties.map((sortie) => sortie.archetype)).size).toBe(3);
      for (let index = 0; index < 3; index++) {
        const mission = generateOperationMission(operation, index);
        const enemies = [...mission.spawnEnemies(), ...(mission.events || []).flatMap((event) => event.actions.flatMap((action) => action.type === 'SPAWN' ? action.enemies : []))];
        const sortie = operation.sorties[index];
        const loadout = LOADOUT_PRESETS[sortie.recommendedLoadout];
        const airTargets = mission.objectives.filter((objective) => objective.isPrimary && ['PATROL_FIGHTER', 'INTERCEPTOR', 'ATTACK_HELI'].includes(objective.targetType)).reduce((sum, objective) => sum + objective.requiredCount, 0);
        const groundTargets = mission.objectives.filter((objective) => objective.isPrimary && !['LANDING', 'DEFEND_ASSET', 'PATROL_FIGHTER', 'INTERCEPTOR', 'ATTACK_HELI', 'DOWNED_PILOT'].includes(objective.targetType)).reduce((sum, objective) => sum + objective.requiredCount, 0);
        expect(enemies.every((enemy) => enemy.x >= 0 && enemy.x <= mission.mapLength)).toBe(true);
        expect(mission.carrierLandingX).toBeGreaterThanOrEqual(0);
        expect(mission.carrierLandingX).toBeLessThanOrEqual(mission.mapLength);
        expect(loadout.missiles + Math.floor(loadout.rockets / 2)).toBeGreaterThanOrEqual(airTargets);
        expect(loadout.bombs + Math.floor(loadout.rockets / 2)).toBeGreaterThanOrEqual(groundTargets);
      }
    }
  }, 20_000);

  it('keeps one thousand V3 deployments valid for both lengths and content sets', () => {
    for (let seed = 0; seed < 1000; seed++) {
      const sortieCount = seed % 2 ? 3 : 5;
      const contentSet = seed % 3 ? 'NORTH_ATLANTIC' : 'NORWEGIAN_SEA';
      const operation = generateOperationV3(seed, seed % 2 ? 'PILOT' : 'VETERAN', contentSet, sortieCount);
      expect(operation.sorties).toHaveLength(sortieCount);
      expect(new Set(operation.sorties.map((sortie) => sortie.archetype)).size).toBe(sortieCount);
      for (let index = 0; index < sortieCount; index++) {
        const mission = generateOperationMission(operation, index, { CARRIER: 83, FORWARD_BASE: 76 });
        expect(mission.carrierLandingX).toBeGreaterThanOrEqual(0);
        expect(mission.carrierLandingX).toBeLessThanOrEqual(mission.mapLength);
        expect(mission.spawnEnemies().every((enemy) => enemy.x >= 0 && enemy.x <= mission.mapLength)).toBe(true);
        expect(new Set(mission.events?.map((event) => event.id)).size).toBe(mission.events?.length);
        const loadout = LOADOUT_PRESETS[operation.sorties[index].recommendedLoadout];
        const airTargets = mission.objectives.filter((objective) => objective.isPrimary && ['PATROL_FIGHTER', 'INTERCEPTOR', 'ATTACK_HELI'].includes(objective.targetType)).reduce((sum, objective) => sum + objective.requiredCount, 0);
        const groundTargets = mission.objectives.filter((objective) => objective.isPrimary && !['LANDING', 'DEFEND_ASSET', 'PATROL_FIGHTER', 'INTERCEPTOR', 'ATTACK_HELI', 'DOWNED_PILOT'].includes(objective.targetType)).reduce((sum, objective) => sum + objective.requiredCount, 0);
        expect(loadout.missiles + Math.floor(loadout.rockets / 2)).toBeGreaterThanOrEqual(airTargets);
        expect(loadout.bombs + Math.floor(loadout.rockets / 2)).toBeGreaterThanOrEqual(groundTargets);
      }
    }
  }, 20_000);

  it('round-trips share codes and keeps daily offers stable in UTC', () => {
    const seed = 0xfade1987;
    expect(seedFromCode(seedToCode(seed))).toBe(seed >>> 0);
    expect(seedToCode(seed)).toMatch(/^IK-/);
    expect(seedFromCode(seedToCode(seed).replace(/^IK-/, 'SV-'))).toBe(seed >>> 0);
    expect(getDailyOperationSeeds(new Date('1987-05-01T00:01:00Z'))).toEqual(getDailyOperationSeeds(new Date('1987-05-01T23:59:00Z')));
    expect(getDailyOperationSeeds(new Date('1987-05-01T23:59:00Z'))).not.toEqual(getDailyOperationSeeds(new Date('1987-05-02T00:01:00Z')));
  });

  it('changes force packages, objectives and events rather than labels alone', () => {
    const first = generateOperation(1001, 'PILOT');
    const second = generateOperation(2002, 'PILOT');
    const firstMissions = first.sorties.map((_, index) => generateOperationMission(first, index));
    const secondMissions = second.sorties.map((_, index) => generateOperationMission(second, index));
    expect(first.sorties.map((sortie) => sortie.archetype)).not.toEqual(second.sorties.map((sortie) => sortie.archetype));
    expect(firstMissions.map((mission) => mission.spawnEnemies().map((enemy) => [enemy.type, enemy.x]))).not.toEqual(secondMissions.map((mission) => mission.spawnEnemies().map((enemy) => [enemy.type, enemy.x])));
    expect(firstMissions.every((mission) => mission.events?.some((event) => event.id.endsWith('_contact')))).toBe(true);
  });

  it('produces valid, achievable definitions across one thousand seeds', () => {
    for (let seed = 0; seed < 1000; seed++) {
      const operation = generateOperation(seed, seed % 3 === 0 ? 'ARCADE' : seed % 3 === 1 ? 'PILOT' : 'VETERAN');
      expect(operation.sorties).toHaveLength(3);
      expect(new Set(operation.sorties.map((sortie) => sortie.archetype)).size).toBe(3);
      expect(['FARP_DEFENCE', 'PILOT_RESCUE', 'ARMOURED_INTERDICTION']).toContain(operation.sorties[1].archetype);
      for (let index = 0; index < 3; index++) {
        const sortie = operation.sorties[index];
        const mission = generateOperationMission(operation, index);
        const enemies = [...mission.spawnEnemies(), ...(mission.events || []).flatMap((event) => event.actions.flatMap((action) => action.type === 'SPAWN' ? action.enemies : []))];
        const availableTypes = new Set(enemies.map((enemy) => enemy.type));
        const enemyIds = new Set(enemies.map((enemy) => enemy.id));
        const objectiveIds = new Set(mission.objectives.map((objective) => objective.id));
        expect(mission.terrainProfile).toBe(sortie.terrainProfile);
        expect(mission.carrierLandingX).toBeGreaterThanOrEqual(0);
        expect(mission.carrierLandingX).toBeLessThanOrEqual(mission.mapLength);
        expect(enemies.every((enemy) => enemy.x >= 0 && enemy.x <= mission.mapLength)).toBe(true);
        expect(mission.events?.every((event) => Number.isInteger(event.trigger.type === 'ELAPSED_TICKS' ? event.trigger.ticks : 0))).toBe(true);
        expect(new Set(mission.events?.map((event) => event.id)).size).toBe(mission.events?.length);
        for (const event of mission.events || []) {
          if (event.trigger.type === 'OBJECTIVE_COMPLETE') expect(objectiveIds.has(event.trigger.objectiveId)).toBe(true);
          if (event.trigger.type === 'OBJECTIVES_COMPLETE') expect(event.trigger.objectiveIds.every((id) => objectiveIds.has(id))).toBe(true);
          if (event.trigger.type === 'ENEMY_CROSSED_X') expect(event.trigger.enemyIds.every((id) => enemyIds.has(id))).toBe(true);
          for (const action of event.actions) {
            if (action.type === 'ACTIVATE_TARGETS') expect(action.enemyIds.every((id) => enemyIds.has(id))).toBe(true);
            if (action.type === 'UNLOCK_OBJECTIVE' || action.type === 'COMPLETE_OBJECTIVE') expect(objectiveIds.has(action.objectiveId)).toBe(true);
          }
        }
        for (const objective of mission.objectives.filter((item) => item.targetType !== 'LANDING' && item.targetType !== 'DEFEND_ASSET')) {
          expect(availableTypes.has(objective.targetType as never)).toBe(true);
          expect(enemies.filter((enemy) => enemy.type === objective.targetType).length).toBeGreaterThanOrEqual(objective.requiredCount);
        }
        expect(mission.objectives.some((objective) => !objective.isPrimary && objective.id.endsWith('_optional'))).toBe(true);
        const loadout = LOADOUT_PRESETS[sortie.recommendedLoadout];
        const airTargets = mission.objectives.filter((objective) => objective.isPrimary && ['PATROL_FIGHTER', 'INTERCEPTOR', 'ATTACK_HELI'].includes(objective.targetType)).reduce((sum, objective) => sum + objective.requiredCount, 0);
        const groundTargets = mission.objectives.filter((objective) => objective.isPrimary && !['LANDING', 'DEFEND_ASSET', 'PATROL_FIGHTER', 'INTERCEPTOR', 'ATTACK_HELI', 'DOWNED_PILOT'].includes(objective.targetType)).reduce((sum, objective) => sum + objective.requiredCount, 0);
        expect(loadout.missiles + Math.floor(loadout.rockets / 2)).toBeGreaterThanOrEqual(airTargets);
        expect(loadout.bombs + Math.floor(loadout.rockets / 2)).toBeGreaterThanOrEqual(groundTargets);
      }
    }
  }, 20_000);

  it.each([30, 60, 120])('fires generated reinforcement on the same simulation tick at %i Hz', (renderHz) => {
    const operation = generateOperation(1987, 'PILOT');
    const mission = generateOperationMission(operation, 0);
    const director = new MissionDirector(mission);
    const targetEvent = mission.events!.find((event) => event.id.endsWith('_contact'))!;
    const targetTick = targetEvent.trigger.type === 'ELAPSED_TICKS' ? targetEvent.trigger.ticks : -1;
    const clock = new FixedStepClock();
    const player = new PlayerAircraft().stats;
    let firedAt = -1;
    for (let frame = 0; frame < renderHz * 40 && firedAt < 0; frame++) {
      clock.advance(1 / renderHz, () => {
        const actions = director.update({ player, objectives: mission.objectives, enemies: mission.spawnEnemies(), defendedAsset: null });
        if (actions.some((action) => action.type === 'SPAWN')) firedAt = director.state.elapsedTicks;
      });
    }
    expect(firedAt).toBe(targetTick);
    expect(DEFAULT_AIRCRAFT_CONDITION.health).toBe(100);
  });
});

function stableHash(value: string): number {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index++) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}
