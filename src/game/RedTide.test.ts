import { describe, expect, it } from 'vitest';
import { MissionDirector } from './MissionDirector';
import { CAMPAIGN_MISSIONS } from './Missions';
import { instantiateMission } from './missionRuntime';
import { PlayerAircraft } from './PlayerAircraft';

describe('Mission 15 — Red Tide', () => {
  const template = CAMPAIGN_MISSIONS.find((mission) => mission.id === 'm15_red_tide');

  it('authors two finite corvette groups and two fighter screens', () => {
    expect(template).toBeDefined();
    expect(template?.terrainProfile).toBe('ARCTIC_OPEN_SEA');
    expect(template?.defendedAsset).toEqual({ type: 'CARRIER', worldX: 16400, startingIntegrity: 100, failureThreshold: 0 });
    const eventEnemies = template?.events?.flatMap((event) => event.actions.flatMap((action) => action.type === 'SPAWN' ? action.enemies : [])) ?? [];
    const corvettes = eventEnemies.filter((enemy) => enemy.type === 'MISSILE_CORVETTE');
    expect(corvettes).toHaveLength(4);
    expect(corvettes.every((enemy) => enemy.salvosRemaining === 2)).toBe(true);
    expect(eventEnemies.filter((enemy) => enemy.aircraftVariant === 'MIG_21BIS')).toHaveLength(2);
    expect(eventEnemies.filter((enemy) => enemy.aircraftVariant === 'MIG_23ML')).toHaveLength(2);
  });

  it('fires each timed wave exactly once at deterministic director ticks', () => {
    const mission = instantiateMission(template!);
    const director = new MissionDirector(mission);
    const player = new PlayerAircraft().stats;
    const firedSpawnIds: string[] = [];
    for (let tick = 1; tick <= 3200; tick++) {
      const actions = director.update({ player, objectives: mission.objectives, enemies: mission.spawnEnemies(), defendedAsset: null });
      if (actions.some((action) => action.type === 'SPAWN')) firedSpawnIds.push(director.state.firedEventIds.at(-1)!);
    }
    expect(firedSpawnIds).toEqual(['m15_group_one', 'm15_fighter_screen_one', 'm15_group_two', 'm15_fighter_screen_two']);
    expect(new Set(firedSpawnIds).size).toBe(4);
  });

  it('requires surface launchers, fighter screen, carrier survival and recovery', () => {
    const primary = template?.objectives.filter((objective) => objective.isPrimary).map((objective) => objective.targetType);
    expect(primary).toEqual(['MISSILE_CORVETTE', 'PATROL_FIGHTER', 'DEFEND_ASSET', 'LANDING']);
    expect(template?.objectives.find((objective) => objective.targetType === 'ANTI_SHIP_MISSILE')?.isPrimary).toBe(false);
    expect(template?.events?.find((event) => event.id === 'm15_recovery')?.trigger).toEqual({ type: 'OBJECTIVES_COMPLETE', objectiveIds: ['m15_corvettes', 'm15_fighters'] });
  });
});
