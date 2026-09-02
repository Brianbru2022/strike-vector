import { describe, expect, it } from 'vitest';
import { CAMPAIGN_MISSIONS } from './Missions';
import { MissionDirector } from './MissionDirector';
import { instantiateMission } from './missionRuntime';
import { PlayerAircraft } from './PlayerAircraft';
import { sampleAuthoredTerrainHeight } from './ArcticToolkit';

const missionTemplate = CAMPAIGN_MISSIONS.find((mission) => mission.id === 'm12_hammerfall_fjord')!;

const runtimeContext = () => {
  const mission = instantiateMission(missionTemplate);
  return {
    mission,
    context: {
      player: new PlayerAircraft().stats,
      objectives: mission.objectives,
      enemies: mission.spawnEnemies(),
      defendedAsset: null,
    },
  };
};

describe('Mission 12 — Hammerfall Fjord', () => {
  it('uses the authored deep-fjord terrain and complete corridor threat set', () => {
    expect(missionTemplate.terrainProfile).toBe('ARCTIC_DEEP_FJORD');
    expect(missionTemplate.presentation?.backdropAsset).toContain('arctic-deep-fjord');
    expect(missionTemplate.arcticWeather?.kind).toBe('SNOW');
    expect(missionTemplate.terrainContact?.heightProfile).toBeDefined();
    expect(sampleAuthoredTerrainHeight(missionTemplate.terrainContact!.heightProfile!, 9000)).not.toBeNull();
    const enemies = missionTemplate.spawnEnemies();
    expect(enemies.filter((enemy) => enemy.type === 'RADAR_STATION')).toHaveLength(2);
    expect(enemies.filter((enemy) => enemy.type === 'SAM_LAUNCHER')).toHaveLength(4);
    expect(enemies.filter((enemy) => enemy.type === 'COASTAL_ARTILLERY')).toHaveLength(2);
    expect(enemies.filter((enemy) => enemy.type === 'SEARCHLIGHT')).toHaveLength(2);
  });

  it('keeps Relay Bravo protected until Relay Alpha is destroyed', () => {
    const { mission, context } = runtimeContext();
    const director = new MissionDirector(mission);
    const bravo = context.enemies.find((enemy) => enemy.id === 'm12_relay_bravo_target')!;
    expect(bravo.isTargetable).toBe(false);
    expect(context.objectives.find((objective) => objective.id === 'm12_relay_bravo')?.active).toBe(false);
    context.objectives.find((objective) => objective.id === 'm12_relay_alpha')!.completed = true;
    const actions = director.update(context);
    expect(actions).toContainEqual({ type: 'UNLOCK_OBJECTIVE', objectiveId: 'm12_relay_bravo' });
    expect(actions).toContainEqual({ type: 'ACTIVATE_TARGETS', enemyIds: ['m12_relay_bravo_target'] });
    expect(actions).not.toContainEqual({ type: 'SET_PHASE', phaseId: 'RECOVER' });
  });

  it('opens the bridgehead route only after both relays and every SAM are suppressed', () => {
    const { mission, context } = runtimeContext();
    const director = new MissionDirector(mission);
    for (const objectiveId of ['m12_relay_alpha', 'm12_relay_bravo', 'm12_sams']) {
      const objective = context.objectives.find((item) => item.id === objectiveId)!;
      objective.active = true;
      objective.completed = true;
    }
    const actions = director.update(context);
    expect(actions).toContainEqual({ type: 'SET_PHASE', phaseId: 'RECOVER' });
    expect(actions).toContainEqual({ type: 'RADIO', message: 'HAMMERFALL CORRIDOR DISMANTLED. ROUTE TO THE BRIDGEHEAD IS OPEN. RECOVER INVINCIBLE.' });
  });

  it('fails immediately after the protected Hammarvik settlement is destroyed', () => {
    const { mission, context } = runtimeContext();
    const director = new MissionDirector(mission);
    context.enemies.find((enemy) => enemy.id === 'm12_hammarvik')!.isAlive = false;
    expect(director.update(context)).toContainEqual({ type: 'FAIL_MISSION', message: 'RULES OF ENGAGEMENT VIOLATION. HAMMARVIK SETTLEMENT STRUCK.' });
  });
});
