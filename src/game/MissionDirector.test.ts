import { describe, expect, it } from 'vitest';
import { CAMPAIGN_MISSIONS } from './Missions';
import { FixedStepClock } from './FixedStepClock';
import { MissionDirector } from './MissionDirector';
import { PlayerAircraft } from './PlayerAircraft';

const contextFor = (missionIndex: number) => {
  const mission = CAMPAIGN_MISSIONS[missionIndex];
  return {
    mission,
    context: {
      player: new PlayerAircraft().stats,
      objectives: mission.objectives.map((objective) => ({ ...objective })),
      enemies: mission.spawnEnemies(),
      defendedAsset: mission.defendedAsset ? {
        type: mission.defendedAsset.type,
        worldX: mission.defendedAsset.worldX,
        integrity: mission.defendedAsset.startingIntegrity,
        maxIntegrity: mission.defendedAsset.startingIntegrity,
        failureThreshold: mission.defendedAsset.failureThreshold,
        incomingMissiles: 0,
      } : null,
    },
  };
};

describe('mission director', () => {
  it.each([30, 60, 120])('fires the first Skeld wave once at tick 300 with %i Hz rendering', (displayHz) => {
    const { mission, context } = contextFor(8);
    const director = new MissionDirector(mission);
    const clock = new FixedStepClock(1 / 60);
    let spawnActions = 0;
    for (let frame = 0; frame < displayHz * 6; frame++) {
      clock.advance(1 / displayHz, () => {
        spawnActions += director.update(context).filter((action) => action.type === 'SPAWN').length;
      });
    }
    expect(spawnActions).toBe(1);
    expect(director.state.firedEventIds).toContain('m9_wave_one');
  });

  it('constructs a clean event state for every retry', () => {
    const { mission, context } = contextFor(8);
    const first = new MissionDirector(mission);
    for (let tick = 0; tick < 301; tick++) first.update(context);
    const retry = new MissionDirector(mission);
    expect(first.state.firedEventIds).toContain('m9_wave_one');
    expect(retry.state.firedEventIds).toEqual([]);
    expect(retry.state.elapsedTicks).toBe(0);
  });

  it('slows Janus alert accumulation after the GCI radar is destroyed', () => {
    const live = contextFor(7);
    const blind = contextFor(7);
    live.context.player.x = 7500;
    blind.context.player.x = 7500;
    blind.context.enemies.find((enemy) => enemy.type === 'RADAR_STATION')!.isAlive = false;
    const liveDirector = new MissionDirector(live.mission);
    const blindDirector = new MissionDirector(blind.mission);
    for (let tick = 0; tick < 100; tick++) {
      liveDirector.update(live.context);
      blindDirector.update(blind.context);
    }
    expect(liveDirector.state.alertLevel).toBeGreaterThan(blindDirector.state.alertLevel * 4);
  });

  it('unlocks Bastion phases only after their required objectives', () => {
    const { mission, context } = contextFor(9);
    const director = new MissionDirector(mission);
    expect(director.update(context)).toEqual([]);
    context.objectives.find((objective) => objective.id === 'm10_sams')!.completed = true;
    const radarActions = director.update(context);
    expect(radarActions).toContainEqual({ type: 'UNLOCK_OBJECTIVE', objectiveId: 'm10_radar' });
    expect(radarActions).not.toContainEqual({ type: 'UNLOCK_OBJECTIVE', objectiveId: 'm10_hq' });
  });

  it('fails the bridge mission when surviving armour crosses the settlement threshold', () => {
    const { mission, context } = contextFor(6);
    const director = new MissionDirector(mission);
    context.enemies.find((enemy) => enemy.id === 'm7_tank_1')!.x = 8100;
    expect(director.update(context)).toContainEqual({ type: 'FAIL_MISSION', message: 'SURVIVING ARMOUR REACHED THE JANUS SETTLEMENT.' });
  });
});
