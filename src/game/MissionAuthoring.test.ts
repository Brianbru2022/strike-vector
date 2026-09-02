import { describe, expect, it } from 'vitest';
import { CAMPAIGN_MISSIONS } from './Missions';
import {
  compileMissionAuthoringDocument,
  createBlankMissionDocument,
  createMissionAuthoringDocument,
  exportMissionAuthoringJson,
  parseMissionAuthoringJson,
  validateMissionAuthoringDocument,
} from './MissionAuthoring';

const knownAssets = new Set(CAMPAIGN_MISSIONS.map((mission) => createMissionAuthoringDocument(mission).mission.presentation!.backdropAsset));

describe('mission authoring toolkit', () => {
  it('round-trips and deterministically compiles every campaign mission', () => {
    for (const mission of CAMPAIGN_MISSIONS) {
      const document = createMissionAuthoringDocument(mission);
      const parsed = parseMissionAuthoringJson(exportMissionAuthoringJson(document));
      expect(validateMissionAuthoringDocument(parsed, knownAssets).filter((issue) => issue.severity === 'ERROR'), mission.id).toEqual([]);
      const compiled = compileMissionAuthoringDocument(parsed, knownAssets);
      expect(compiled.id).toBe(mission.id);
      expect(compiled.spawnEnemies()).toEqual(compiled.spawnEnemies());
      expect(compiled.spawnEnemies()).not.toBe(compiled.spawnEnemies());
      expect(Object.isFrozen(compiled)).toBe(true);
    }
  });

  it('builds a valid playable test mission without editing the engine', () => {
    const document = createBlankMissionDocument(CAMPAIGN_MISSIONS[0]);
    expect(validateMissionAuthoringDocument(document, knownAssets).filter((issue) => issue.severity === 'ERROR')).toEqual([]);
    const mission = compileMissionAuthoringDocument(document, knownAssets);
    expect(mission).toMatchObject({ id: 'authoring_test_mission', mapLength: 7000, carrierLandingX: 6200 });
    expect(mission.spawnEnemies().map((enemy) => enemy.id)).toEqual(['range_radar']);
  });

  it('rejects unsafe openings, unreachable objectives and unsupported assets', () => {
    const document = createBlankMissionDocument(CAMPAIGN_MISSIONS[0]);
    document.enemies.push({ ...document.enemies[0], id: 'unsafe_fighter', type: 'PATROL_FIGHTER', category: 'AIR', x: document.mission.carrierX + 150 });
    document.mission.objectives.push({ ...document.mission.objectives[0], id: 'missing_tanks', targetType: 'TANK', requiredCount: 3 });
    document.mission.presentation = { ...document.mission.presentation!, backdropAsset: '/assets/backgrounds/not-bundled.webp' };
    const codes = validateMissionAuthoringDocument(document, knownAssets).map((issue) => issue.code);
    expect(codes).toContain('UNSAFE_OPENING');
    expect(codes).toContain('UNREACHABLE_OBJECTIVE');
    expect(codes).toContain('UNSUPPORTED_ASSET');
    expect(() => compileMissionAuthoringDocument(document, knownAssets)).toThrow(/launch envelope/);
  });

  it('validates event references, radio captions and terrain-contact ordering', () => {
    const document = createBlankMissionDocument(CAMPAIGN_MISSIONS[0]);
    document.mission.events = [{ id: 'invalid_event', trigger: { type: 'OBJECTIVE_COMPLETE', objectiveId: 'missing' }, actions: [{ type: 'SET_PHASE', phaseId: 'missing' }, { type: 'RADIO', message: '' }] }];
    document.mission.terrainContact = { heightProfile: { startWorldX: 5000, endWorldX: 1000, samples: [560] } };
    const codes = validateMissionAuthoringDocument(document, knownAssets).map((issue) => issue.code);
    expect(codes).toEqual(expect.arrayContaining(['EVENT_OBJECTIVE', 'ACTION_PHASE', 'RADIO_MESSAGE', 'TERRAIN_SAMPLES', 'TERRAIN_RANGE']));
  });

  it('rejects corrupt or unsupported JSON documents', () => {
    expect(() => parseMissionAuthoringJson('{broken')).toThrow();
    expect(() => parseMissionAuthoringJson(JSON.stringify({ version: 2, mission: {}, enemies: [] }))).toThrow(/MissionAuthoringDocumentV1/);
  });
});
