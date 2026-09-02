import { describe, expect, it } from 'vitest';
import { MissionDirector } from './MissionDirector';
import { CAMPAIGN_MISSIONS } from './Missions';
import { instantiateMission } from './missionRuntime';
import { PlayerAircraft } from './PlayerAircraft';

describe('Mission 16 — North Cape Assault', () => {
  const template = CAMPAIGN_MISSIONS.find((mission) => mission.id === 'm16_north_cape_assault');

  it('authors a carrier-to-fortress finale with protected sequential targets', () => {
    expect(template).toBeDefined();
    expect(template?.terrainProfile).toBe('NORTH_CAPE_FORTRESS');
    expect(template?.presentation?.backdropAsset).toBe('/assets/backgrounds/arctic-north-cape-assault-operational-v1.webp');
    expect(template?.defendedAsset).toEqual({ type: 'CARRIER', worldX: 16400, startingIntegrity: 100, failureThreshold: 0 });
    expect(template?.phases?.map((phase) => phase.id)).toEqual([
      'SEA_APPROACH', 'OUTER_DEFENCES', 'COMMAND_RADAR', 'FORTRESS_CORE', 'COMMAND_INTERCEPTOR', 'CARRIER_RETURN',
    ]);

    const initial = template!.spawnEnemies();
    expect(initial.find((enemy) => enemy.id === 'm16_picket_corvette')?.salvosRemaining).toBe(2);
    expect(initial.find((enemy) => enemy.id === 'm16_command_radar')?.isTargetable).toBe(false);
    expect(initial.find((enemy) => enemy.id === 'm16_command_bunker')?.isTargetable).toBe(false);
    expect(template?.objectives.find((objective) => objective.id === 'm16_recover')?.active).toBe(false);
  });

  it('unlocks radar, fortress, interceptor and recovery in order', () => {
    const mission = instantiateMission(template!);
    const director = new MissionDirector(mission);
    const player = new PlayerAircraft().stats;
    const enemies = mission.spawnEnemies();
    const run = () => director.update({ player, objectives: mission.objectives, enemies, defendedAsset: null });
    const complete = (id: string) => {
      const objective = mission.objectives.find((item) => item.id === id)!;
      objective.completed = true;
      objective.currentCount = objective.requiredCount;
      return run();
    };

    expect(complete('m16_picket').some((action) => action.type === 'SET_PHASE' && action.phaseId === 'OUTER_DEFENCES')).toBe(true);
    expect(complete('m16_sams')).toEqual(expect.arrayContaining([
      expect.objectContaining({ type: 'SET_PHASE', phaseId: 'COMMAND_RADAR' }),
      expect.objectContaining({ type: 'UNLOCK_OBJECTIVE', objectiveId: 'm16_radar' }),
    ]));
    expect(complete('m16_radar')).toEqual(expect.arrayContaining([
      expect.objectContaining({ type: 'SET_PHASE', phaseId: 'FORTRESS_CORE' }),
      expect.objectContaining({ type: 'UNLOCK_OBJECTIVE', objectiveId: 'm16_hq' }),
    ]));
    expect(complete('m16_hq')).toEqual(expect.arrayContaining([
      expect.objectContaining({ type: 'SET_PHASE', phaseId: 'COMMAND_INTERCEPTOR' }),
      expect.objectContaining({ type: 'SPAWN' }),
    ]));
    expect(complete('m16_fighter')).toEqual(expect.arrayContaining([
      expect.objectContaining({ type: 'SET_PHASE', phaseId: 'CARRIER_RETURN' }),
      expect.objectContaining({ type: 'UNLOCK_OBJECTIVE', objectiveId: 'm16_recover' }),
      expect.objectContaining({ type: 'COMPLETE_OBJECTIVE', objectiveId: 'm16_carrier' }),
    ]));
    expect(new Set(director.state.firedEventIds).size).toBe(director.state.firedEventIds.length);
  });

  it('keeps the primary air requirement to one command interceptor', () => {
    const primary = template!.objectives.filter((objective) => objective.isPrimary);
    expect(primary.filter((objective) => objective.targetType === 'PATROL_FIGHTER').reduce((sum, objective) => sum + objective.requiredCount, 0)).toBe(1);
    expect(primary.filter((objective) => ['MISSILE_CORVETTE', 'SAM_LAUNCHER', 'RADAR_STATION', 'COMMAND_BUNKER'].includes(objective.targetType)).reduce((sum, objective) => sum + objective.requiredCount, 0)).toBe(5);
  });
});
