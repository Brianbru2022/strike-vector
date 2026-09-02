import { describe, expect, it } from 'vitest';
import { createDefaultCampaignSave, recordMissionVictory, recordPilotSortie, sanitiseCampaignSave, setActiveCampaignChapter } from './Campaign';
import { CAMPAIGN_CHAPTERS } from './CampaignChapters';

describe('campaign save', () => {
  it('recovers safely from corrupt or unknown data', () => {
    expect(sanitiseCampaignSave(null)).toEqual(createDefaultCampaignSave());
    expect(sanitiseCampaignSave({ version: 99 })).toEqual(createDefaultCampaignSave());
  });

  it('defaults new saves to adaptive quality while retaining manual legacy choices', () => {
    expect(createDefaultCampaignSave().renderQuality).toBe('AUTO');
    expect(sanitiseCampaignSave({ ...createDefaultCampaignSave(), version: 3, renderQuality: 'LOW' }).renderQuality).toBe('LOW');
    expect(sanitiseCampaignSave({ ...createDefaultCampaignSave(), renderQuality: 'INVALID' }).renderQuality).toBe('AUTO');
  });

  it('migrates V1 progress while supplying safe V4 defaults', () => {
    const current = createDefaultCampaignSave();
    const legacy = {
      ...current,
      version: 1,
      unlockedMission: 4,
      completedMissionIds: ['m1_coastal_strike'],
      bestScores: { m1_coastal_strike: 4321 },
      aircraftCondition: undefined,
      selectedLoadout: undefined,
    };
    const migrated = sanitiseCampaignSave(legacy);
    expect(migrated.version).toBe(4);
    expect(migrated.unlockedMission).toBe(4);
    expect(migrated.bestScores.m1_coastal_strike).toBe(4321);
    expect(migrated.aircraftCondition.health).toBe(100);
    expect(migrated.selectedLoadout).toBe('FLEET_CAP');
    expect(migrated.inputBindings.keyboard.PRIMARY_FIRE).toContain('Space');
    expect(migrated.accessibility.radioCaptions).toBe(true);
    expect(migrated.diagnosticsEnabled).toBe(true);
    expect(migrated.activeChapter).toBe('NORTHERN_LANCE');
    expect(migrated.chapterProgress.NORTHERN_LANCE.unlocked).toBe(true);
    expect(migrated.chapterProgress.NORWEGIAN_SEA.unlocked).toBe(false);
    expect(migrated.pilotRecord).toEqual({ sorties: 0, victories: 0, ejections: 0, losses: 0 });
    expect(migrated).toMatchObject({ touchSafeInset: 12, touchLift: 0, touchClearView: true });
    expect(migrated.accessibility).toMatchObject({ hudContrast: 'STANDARD', textContrast: 'STANDARD' });
  });

  it('migrates V2 aircraft condition without losing progress', () => {
    const current = createDefaultCampaignSave();
    const migrated = sanitiseCampaignSave({ ...current, version: 2, tutorialCompleted: undefined, inputBindings: undefined, accessibility: undefined, diagnosticsEnabled: undefined });
    expect(migrated.version).toBe(4);
    expect(migrated.aircraftCondition).toEqual(current.aircraftCondition);
    expect(migrated.selectedLoadout).toBe(current.selectedLoadout);
  });

  it('migrates a completed V3 campaign and unlocks the Norwegian Sea without losing condition or settings', () => {
    const current = createDefaultCampaignSave();
    const completedMissionIds = CAMPAIGN_CHAPTERS.NORTHERN_LANCE.missionIds;
    const migrated = sanitiseCampaignSave({
      ...current,
      version: 3,
      completedMissionIds,
      bestScores: { m10_hq_assault: 9876 },
      aircraftCondition: { ...current.aircraftCondition, health: 73, fuel: 42 },
      selectedLoadout: 'STRIKE',
      accessibility: { ...current.accessibility, highContrastHud: true },
      chapterProgress: undefined,
      pilotRecord: undefined,
    });

    expect(migrated.version).toBe(4);
    expect(migrated.chapterProgress.NORWEGIAN_SEA.unlocked).toBe(true);
    expect(migrated.chapterProgress.NORTHERN_LANCE.completedMissionIds).toHaveLength(10);
    expect(migrated.aircraftCondition).toMatchObject({ health: 73, fuel: 42 });
    expect(migrated.selectedLoadout).toBe('STRIKE');
    expect(migrated.accessibility.highContrastHud).toBe(true);
    expect(migrated.accessibility.hudContrast).toBe('HIGH');
  });

  it('clamps touch safe areas and preserves independent contrast settings', () => {
    const migrated = sanitiseCampaignSave({
      ...createDefaultCampaignSave(),
      touchSafeInset: 200,
      touchLift: -10,
      touchClearView: false,
      accessibility: { ...createDefaultCampaignSave().accessibility, hudContrast: 'STANDARD', textContrast: 'HIGH' },
    });
    expect(migrated).toMatchObject({ touchSafeInset: 40, touchLift: 0, touchClearView: false });
    expect(migrated.accessibility).toMatchObject({ hudContrast: 'STANDARD', textContrast: 'HIGH' });
  });

  it('rejects a locked chapter and permits it after Mission 10', () => {
    const fresh = createDefaultCampaignSave();
    expect(setActiveCampaignChapter(fresh, 'NORWEGIAN_SEA')).toBe(fresh);
    const completed = recordMissionVictory(fresh, 'm10_hq_assault', 9, 5000);
    const selected = setActiveCampaignChapter(completed, 'NORWEGIAN_SEA');
    expect(selected.activeChapter).toBe('NORWEGIAN_SEA');
    expect(selected.chapterProgress.NORWEGIAN_SEA.unlocked).toBe(true);
  });

  it('records pilot history without changing the pre-sortie aircraft snapshot', () => {
    const save = createDefaultCampaignSave();
    const condition = save.aircraftCondition;
    const failed = recordPilotSortie(save, false, true);
    const lost = recordPilotSortie(failed, false, false);
    const victory = recordPilotSortie(lost, true, true);

    expect(victory.pilotRecord).toEqual({ sorties: 3, victories: 1, ejections: 1, losses: 1 });
    expect(victory.aircraftCondition).toBe(condition);
    expect(victory.selectedLoadout).toBe('FLEET_CAP');
  });

  it('publishes all six Norwegian Sea missions', () => {
    const chapter = CAMPAIGN_CHAPTERS.NORWEGIAN_SEA;
    expect(chapter.missions).toHaveLength(6);
    expect(chapter.missions.map((mission) => mission.number)).toEqual([11, 12, 13, 14, 15, 16]);
    expect(chapter.missions.every((mission) => mission.status === 'PLAYABLE')).toBe(true);
    expect(Object.isFrozen(chapter)).toBe(true);
    expect(Object.isFrozen(chapter.missions)).toBe(true);
    expect(Object.isFrozen(chapter.missions[0])).toBe(true);
  });

  it('marks the Norwegian Sea chapter complete after North Cape Assault', () => {
    let save = recordMissionVictory(createDefaultCampaignSave(), 'm10_hq_assault', 9, 10000);
    CAMPAIGN_CHAPTERS.NORWEGIAN_SEA.missionIds.forEach((missionId, index) => {
      save = recordMissionVictory(save, missionId, index + 10, 11000 + index * 1000);
    });
    expect(save.chapterProgress.NORWEGIAN_SEA.completedMissionIds).toHaveLength(6);
    expect(save.chapterProgress.NORWEGIAN_SEA.completedAt).not.toBeNull();
    expect(save.completedMissionIds).toContain('m16_north_cape_assault');
  });

  it('unlocks the next mission and secures a completed sector', () => {
    const first = recordMissionVictory(createDefaultCampaignSave(), 'm1_coastal_strike', 0, 1000);
    const second = recordMissionVictory(first, 'm2_valley_run', 1, 2000);
    expect(second.unlockedMission).toBe(2);
    expect(second.sectors[0].secured).toBe(true);
    expect(second.bestScores.m2_valley_run).toBe(2000);
    expect(second.campaignFlags).toEqual([
      'carrier_qualified',
      'fjord_air_defences_suppressed',
    ]);
  });

  it('establishes the forward base after the vertical-slice capture mission', () => {
    const first = recordMissionVictory(createDefaultCampaignSave(), 'm1_coastal_strike', 0, 1000);
    const second = recordMissionVictory(first, 'm2_valley_run', 1, 2000);
    const third = recordMissionVictory(second, 'm3_convoy_hunter', 2, 3000);

    expect(third.campaignFlags).toContain('skeld_farp_secured');
    expect(third.sectors.find((sector) => sector.id === 'faroe')?.forwardBase).toBe(true);
    expect(third.unlockedMission).toBe(3);
  });

  it('persists the Forward War consequences through mission six', () => {
    let save = createDefaultCampaignSave();
    const missionIds = [
      'm1_coastal_strike',
      'm2_valley_run',
      'm3_convoy_hunter',
      'm4_night_raid',
      'm5_pilot_rescue',
      'm6_fleet_defence',
    ];
    missionIds.forEach((missionId, index) => {
      save = recordMissionVictory(save, missionId, index, (index + 1) * 1000);
    });

    expect(save.campaignFlags).toEqual([
      'carrier_qualified',
      'fjord_air_defences_suppressed',
      'skeld_farp_secured',
      'armoured_route_broken',
      'viper_one_rescued',
      'carrier_group_defended',
    ]);
    expect(save.sectors[1].secured).toBe(true);
    expect(save.sectors[2].secured).toBe(true);
    expect(save.unlockedMission).toBe(6);
  });
});
