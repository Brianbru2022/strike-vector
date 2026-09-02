import { describe, expect, it } from 'vitest';
import { createDefaultCampaignSave } from './Campaign';
import { createDemoProgress, DEMO_MANIFEST, exportDemoTransfer, importCompatibleDemoProgress, parseDemoTransfer, recordDemoVictory, sanitiseDemoProgress } from './Demo';
import { RELEASE_INFO } from './Release';

describe('focused browser demo', () => {
  it('contains only Guided Mission 1 and Fleet Defence', () => {
    expect(DEMO_MANIFEST.missionIds).toEqual(['m1_coastal_strike', 'm6_fleet_defence']);
    expect(DEMO_MANIFEST.buildId).toBe(RELEASE_INFO.buildId);
    expect(DEMO_MANIFEST.storageNamespace).toBe('IRON_KESTREL_DEMO_');
    expect(DEMO_MANIFEST.initialDownloadBudgetBytes).toBe(15 * 1024 * 1024);
    expect(sanitiseDemoProgress({ version: 1, completedMissionIds: ['m10_hq_assault'] }).completedMissionIds).toEqual([]);
  });

  it('uses a narrow transfer that cannot overwrite paid progression or settings', () => {
    const paid = { ...createDefaultCampaignSave(), unlockedMission: 8, completedMissionIds: ['m1_coastal_strike'], difficulty: 'VETERAN' as const, bestScores: { m1_coastal_strike: 5000 } };
    const progress = recordDemoVictory({ ...createDemoProgress(), guidedTrainingCompleted: true }, 'm1_coastal_strike', 4200, true);
    const transfer = parseDemoTransfer(exportDemoTransfer(progress, '2026-08-31T12:00:00.000Z'))!;
    const imported = importCompatibleDemoProgress(paid, transfer);
    expect(imported).toMatchObject({ unlockedMission: 8, completedMissionIds: ['m1_coastal_strike'], difficulty: 'VETERAN', tutorialCompleted: true });
    expect(imported.bestScores.m1_coastal_strike).toBe(5000);
  });

  it('rejects paid-save JSON as a demo transfer', () => {
    expect(parseDemoTransfer(JSON.stringify(createDefaultCampaignSave()))).toBeNull();
  });
});
