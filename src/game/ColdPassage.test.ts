import { describe, expect, it } from 'vitest';
import { CAMPAIGN_MISSIONS } from './Missions';
import { MissionDirector } from './MissionDirector';
import { instantiateMission } from './missionRuntime';
import { updateContactIdentification } from './ContactIdentification';
import { PlayerAircraft } from './PlayerAircraft';
import { DefendedAssetState } from '../types/game';

const missionTemplate = CAMPAIGN_MISSIONS.find((mission) => mission.id === 'm11_cold_passage')!;

describe('Mission 11 — Cold Passage', () => {
  it('uses the Arctic sea toolkit and requires fleet survival plus recovery', () => {
    expect(missionTemplate.terrainProfile).toBe('ARCTIC_OPEN_SEA');
    expect(missionTemplate.presentation?.backdropAsset).toContain('arctic-open-sea');
    expect(missionTemplate.arcticWeather?.kind).toBe('LOW_WINTER_SUN');
    expect(missionTemplate.mapLength).toBe(12000);
    expect(missionTemplate.defendedAsset).toEqual({ type: 'CARRIER', worldX: 11000, startingIntegrity: 100, failureThreshold: 0 });
    expect(missionTemplate.objectives.filter((objective) => objective.isPrimary).map((objective) => objective.targetType)).toEqual(['HEAVY_BOMBER', 'DEFEND_ASSET', 'LANDING']);
  });

  it('keeps Tu-16K contacts protected until positive identification completes', () => {
    const contact = missionTemplate.spawnEnemies().find((enemy) => enemy.id === 'm11_tu16_lead')!;
    expect(contact.isTargetable).toBe(false);
    let result = updateContactIdentification([contact], { x: contact.x - 760, y: contact.y }, null);
    for (let tick = 0; tick < 110; tick++) {
      result = updateContactIdentification([contact], { x: contact.x - 760, y: contact.y }, null);
    }
    expect(contact.identified).toBe(true);
    expect(contact.isTargetable).toBe(true);
    expect(result.unidentifiedContacts).toBe(0);
  });

  it('spawns the second contact exactly once and resets it on retry', () => {
    const mission = instantiateMission(missionTemplate);
    const director = new MissionDirector(mission);
    const context = { player: new PlayerAircraft().stats, objectives: mission.objectives, enemies: mission.spawnEnemies(), defendedAsset: null };
    const spawned: string[] = [];
    for (let tick = 0; tick < 300; tick++) {
      for (const action of director.update(context)) {
        if (action.type === 'SPAWN') spawned.push(...action.enemies.map((enemy) => enemy.id));
      }
    }
    expect(spawned).not.toContain('m11_tu16_second');
    context.enemies.find((enemy) => enemy.id === 'm11_tu16_lead')!.isAlive = false;
    for (const action of director.update(context)) {
      if (action.type === 'SPAWN') spawned.push(...action.enemies.map((enemy) => enemy.id));
    }
    for (let tick = 0; tick < 300; tick++) {
      for (const action of director.update(context)) {
        if (action.type === 'SPAWN') spawned.push(...action.enemies.map((enemy) => enemy.id));
      }
    }
    expect(spawned.filter((id) => id === 'm11_tu16_second')).toHaveLength(1);
    expect(instantiateMission(missionTemplate).spawnEnemies().some((enemy) => enemy.id === 'm11_tu16_second')).toBe(false);
  });

  it('makes two completed targeting tracks fatal to the protected fleet', () => {
    const first = missionTemplate.spawnEnemies().find((enemy) => enemy.id === 'm11_tu16_lead')!;
    const second = missionTemplate.events?.find((event) => event.id === 'm11_second_contact')?.actions.find((action) => action.type === 'SPAWN');
    if (!second || second.type !== 'SPAWN') throw new Error('Second contact missing');
    const secondRuntime = { ...second.enemies[0] };
    first.targetingTrackProgress = (first.targetingTrackTicksRequired ?? 1) - 1;
    secondRuntime.targetingTrackProgress = (secondRuntime.targetingTrackTicksRequired ?? 1) - 1;
    const defendedAsset: DefendedAssetState = { type: 'CARRIER', worldX: 12600, integrity: 100, maxIntegrity: 100, failureThreshold: 0, incomingMissiles: 0 };
    updateContactIdentification([first, secondRuntime], { x: 0, y: 600 }, defendedAsset);
    expect(defendedAsset.integrity).toBe(0);
    expect(first.targetingTrackEstablished).toBe(true);
    expect(secondRuntime.targetingTrackEstablished).toBe(true);
  });
});
