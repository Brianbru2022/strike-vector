import { describe, expect, it } from 'vitest';
import { DefendedAssetState } from '../types/game';
import { CAMPAIGN_MISSIONS } from './Missions';
import { MissionDirector } from './MissionDirector';
import { instantiateMission } from './missionRuntime';
import { PlayerAircraft } from './PlayerAircraft';
import { EnemyManager } from './EnemyManager';
import { WeaponsSystem } from './WeaponsSystem';
import { ParticleAndEffects } from './ParticleAndEffects';

const missionTemplate = CAMPAIGN_MISSIONS.find((mission) => mission.id === 'm13_troms_bridgehead')!;

const defendedAsset = (): DefendedAssetState => ({
  type: 'LANDING_FORCE',
  worldX: 4200,
  integrity: 100,
  maxIntegrity: 100,
  failureThreshold: 0,
  incomingMissiles: 0,
});

describe('Mission 13 — Troms Bridgehead', () => {
  it('authors the amphibious threat, demolition targets and expeditionary recovery', () => {
    expect(missionTemplate.terrainProfile).toBe('ARCTIC_BRIDGEHEAD');
    expect(missionTemplate.arcticWeather?.kind).toBe('FREEZING_RAIN');
    expect(missionTemplate.defendedAsset?.type).toBe('LANDING_FORCE');
    expect(missionTemplate.recoverySite).toBe('FORWARD_BASE');
    const enemies = missionTemplate.spawnEnemies();
    expect(enemies.filter((enemy) => enemy.type === 'TANK')).toHaveLength(4);
    expect(enemies.filter((enemy) => enemy.type === 'COASTAL_ARTILLERY')).toHaveLength(2);
    expect(enemies.filter((enemy) => enemy.type === 'BRIDGE_SEGMENT')).toHaveLength(2);
  });

  it('spawns both friendly landing waves exactly once', () => {
    const mission = instantiateMission(missionTemplate);
    const director = new MissionDirector(mission);
    const context = { player: new PlayerAircraft().stats, objectives: mission.objectives, enemies: mission.spawnEnemies(), defendedAsset: defendedAsset() };
    const spawned: string[] = [];
    for (let tick = 0; tick < 420; tick++) {
      for (const action of director.update(context)) {
        if (action.type === 'SPAWN') spawned.push(...action.enemies.map((enemy) => enemy.id));
      }
    }
    expect(spawned.filter((id) => id.startsWith('m13_landing_craft_'))).toEqual(['m13_landing_craft_alpha', 'm13_landing_craft_bravo']);
  });

  it('moves the landing craft to their deterministic beach contact', () => {
    const firstWave = missionTemplate.events?.find((event) => event.id === 'm13_first_wave')?.actions.find((action) => action.type === 'SPAWN');
    if (!firstWave || firstWave.type !== 'SPAWN') throw new Error('First landing wave missing');
    const craft = { ...firstWave.enemies[0] };
    const manager = new EnemyManager();
    manager.reset([craft]);
    const args = [new PlayerAircraft(), new WeaponsSystem(), new ParticleAndEffects()] as const;
    for (let tick = 0; tick < 1500; tick++) manager.update(...args);
    expect(craft.x).toBe(3820);
    expect(craft.vx).toBe(0);
    expect(craft.state).toBe('BEACHED');
  });

  it('opens the FARP only after artillery, armour and bridge objectives are complete', () => {
    const mission = instantiateMission(missionTemplate);
    const director = new MissionDirector(mission);
    const context = { player: new PlayerAircraft().stats, objectives: mission.objectives, enemies: mission.spawnEnemies(), defendedAsset: defendedAsset() };
    for (const objectiveId of ['m13_artillery', 'm13_armour', 'm13_bridges']) {
      context.objectives.find((objective) => objective.id === objectiveId)!.completed = true;
    }
    const actions = director.update(context);
    expect(actions).toContainEqual({ type: 'COMPLETE_OBJECTIVE', objectiveId: 'm13_landing_force' });
    expect(actions).toContainEqual({ type: 'UNLOCK_OBJECTIVE', objectiveId: 'm13_recover' });
    expect(actions).toContainEqual({ type: 'SET_PHASE', phaseId: 'FARP_CAPTURE' });
    expect(actions.some((action) => action.type === 'SPAWN' && action.enemies.some((enemy) => enemy.id === 'm13_farp_stores'))).toBe(true);
  });

  it('allows coastal batteries and surviving armour to damage the landing force', () => {
    const player = new PlayerAircraft();
    const weapons = new WeaponsSystem();
    const effects = new ParticleAndEffects();
    const artillery = missionTemplate.spawnEnemies().find((enemy) => enemy.id === 'm13_artillery_alpha')!;
    artillery.fireCooldown = 0;
    const artilleryManager = new EnemyManager();
    artilleryManager.reset([artillery]);
    const bombardmentTarget = defendedAsset();
    artilleryManager.update(player, weapons, effects, undefined, bombardmentTarget, () => 565);
    expect(bombardmentTarget.integrity).toBe(96);

    const force = missionTemplate.spawnEnemies();
    const command = force.find((enemy) => enemy.id === 'm13_command_vehicle')!;
    const tank = force.find((enemy) => enemy.id === 'm13_t72_1')!;
    tank.x = 4210;
    tank.fireCooldown = 0;
    const armourManager = new EnemyManager();
    armourManager.reset([command, tank]);
    const assaultTarget = defendedAsset();
    armourManager.update(player, weapons, effects, undefined, assaultTarget, () => 565);
    expect(assaultTarget.integrity).toBe(92);
    expect(tank.state).toBe('ASSAULT');
  });
});
