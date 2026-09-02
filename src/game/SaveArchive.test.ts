import { describe, expect, it } from 'vitest';
import { CAMPAIGN_STORAGE_KEY, createDefaultCampaignSave } from './Campaign';
import { BEST_SCORE_STORAGE_KEY } from './CombatFlow';
import { ACTIVE_OPERATION_STORAGE_KEY, OPERATIONS_PROFILE_STORAGE_KEY } from './Operations';
import { applySaveArchive, createSaveArchive, exportSaveArchiveJson, loadImportBackup, parseSaveArchiveJson, SAVE_IMPORT_BACKUP_STORAGE_KEY } from './SaveArchive';
import { SHOWCASE_STORAGE_KEY } from './Showcase';

class MemoryStorage {
  readonly values = new Map<string, string>();
  getItem(key: string) { return this.values.get(key) ?? null; }
  setItem(key: string, value: string) { this.values.set(key, value); }
  removeItem(key: string) { this.values.delete(key); }
}

function populatedStorage(): MemoryStorage {
  const storage = new MemoryStorage();
  const campaign = { ...createDefaultCampaignSave(), completedMissionIds: ['m1_coastal_strike'], bestScores: { m1_coastal_strike: 4200 } };
  storage.setItem(CAMPAIGN_STORAGE_KEY, JSON.stringify(campaign));
  storage.setItem(OPERATIONS_PROFILE_STORAGE_KEY, JSON.stringify({ version: 2, records: [], history: [], abandonedRuns: 2 }));
  storage.setItem(SHOWCASE_STORAGE_KEY, JSON.stringify({ version: 1, completedMissionIds: ['m1_coastal_strike'], bestScores: { m1_coastal_strike: 3000 }, completedAt: null }));
  storage.setItem(BEST_SCORE_STORAGE_KEY, '4200');
  return storage;
}

describe('save archive', () => {
  it('round-trips consumer progression without internal evidence', () => {
    const storage = populatedStorage();
    storage.setItem('STRIKE_VECTOR_DIAGNOSTICS_V3', '[{"private":"not exported"}]');
    storage.setItem('STRIKE_VECTOR_PLAYTEST_EVIDENCE_V1', '[{"internal":true}]');
    const json = exportSaveArchiveJson(createSaveArchive(storage as unknown as Storage, '2026-08-30T18:00:00.000Z'));
    const result = parseSaveArchiveJson(json);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.preview).toMatchObject({ completedMissions: 1, operationRecords: 0, showcaseMissions: 1, bestScore: 4200 });
    expect(json).not.toContain('STRIKE_VECTOR_DIAGNOSTICS');
    expect(json).not.toContain('PLAYTEST_EVIDENCE');
    expect(json).not.toContain('not exported');
  });

  it('rejects malformed, oversized and modified archives before writing', () => {
    expect(parseSaveArchiveJson('{broken')).toEqual({ ok: false, error: 'The selected file is not valid JSON.' });
    expect(parseSaveArchiveJson('x'.repeat(1024 * 1024 + 1)).ok).toBe(false);
    const json = exportSaveArchiveJson(createSaveArchive(populatedStorage() as unknown as Storage));
    expect(parseSaveArchiveJson(json.replace('4200', '9200')).ok).toBe(false);
  });

  it('backs up current progress, applies validated data and preserves excluded stores', () => {
    const destination = populatedStorage();
    destination.setItem('STRIKE_VECTOR_DIAGNOSTICS_V3', '[1]');
    const source = populatedStorage();
    const importedCampaign = { ...createDefaultCampaignSave(), completedMissionIds: ['m1_coastal_strike', 'm2_valley_run'] };
    source.setItem(CAMPAIGN_STORAGE_KEY, JSON.stringify(importedCampaign));
    source.setItem(BEST_SCORE_STORAGE_KEY, '8800');
    const archive = createSaveArchive(source as unknown as Storage);
    expect(applySaveArchive(archive, destination as unknown as Storage)).toEqual({ ok: true });
    expect(JSON.parse(destination.getItem(CAMPAIGN_STORAGE_KEY)!).completedMissionIds).toHaveLength(2);
    expect(destination.getItem(BEST_SCORE_STORAGE_KEY)).toBe('8800');
    expect(destination.getItem('STRIKE_VECTOR_DIAGNOSTICS_V3')).toBe('[1]');
    expect(destination.getItem(SAVE_IMPORT_BACKUP_STORAGE_KEY)).toBeTruthy();
    const backup = loadImportBackup(destination as unknown as Storage);
    expect(backup?.ok).toBe(true);
    if (backup?.ok) expect(backup.preview.completedMissions).toBe(1);
  });

  it('removes an active deployment when the imported archive has none', () => {
    const destination = populatedStorage();
    destination.setItem(ACTIVE_OPERATION_STORAGE_KEY, '{"stale":true}');
    expect(applySaveArchive(createSaveArchive(populatedStorage() as unknown as Storage), destination as unknown as Storage)).toEqual({ ok: true });
    expect(destination.getItem(ACTIVE_OPERATION_STORAGE_KEY)).toBeNull();
  });

  it('rolls back progression when browser storage fails during replacement', () => {
    const destination = populatedStorage();
    const originalCampaign = destination.getItem(CAMPAIGN_STORAGE_KEY);
    let failed = false;
    const failingStorage = {
      getItem: (key: string) => destination.getItem(key),
      removeItem: (key: string) => destination.removeItem(key),
      setItem: (key: string, value: string) => {
        if (key === OPERATIONS_PROFILE_STORAGE_KEY && !failed) { failed = true; throw new Error('quota'); }
        destination.setItem(key, value);
      },
    };
    const source = populatedStorage();
    source.setItem(CAMPAIGN_STORAGE_KEY, JSON.stringify({ ...createDefaultCampaignSave(), completedMissionIds: ['m1_coastal_strike', 'm2_valley_run', 'm3_convoy_hunter'] }));
    const result = applySaveArchive(createSaveArchive(source as unknown as Storage), failingStorage as unknown as Storage);
    expect(result.ok).toBe(false);
    expect(destination.getItem(CAMPAIGN_STORAGE_KEY)).toBe(originalCampaign);
  });
});
