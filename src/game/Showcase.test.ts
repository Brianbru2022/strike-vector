import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createShowcaseProgress, loadShowcaseProgress, persistShowcaseProgress, recordShowcaseVictory, SHOWCASE_MANIFEST, SHOWCASE_STORAGE_KEY } from './Showcase';

describe('isolated showcase progress', () => {
  const storage = new Map<string, string>();

  beforeEach(() => {
    storage.clear();
    vi.stubGlobal('localStorage', {
      getItem: (key: string) => storage.get(key) ?? null,
      setItem: (key: string, value: string) => storage.set(key, value),
    });
  });

  it('records all three signature missions without campaign data', () => {
    const completed = SHOWCASE_MANIFEST.missionIds.reduce(
      (progress, missionId, index) => recordShowcaseVictory(progress, missionId, 1000 + index * 200),
      createShowcaseProgress(),
    );
    expect(completed.completedMissionIds).toEqual(SHOWCASE_MANIFEST.missionIds);
    expect(completed.completedAt).not.toBeNull();
    expect(completed.bestScores.m10_hq_assault).toBe(1400);
    expect(JSON.stringify(completed)).not.toContain('unlockedMission');
  });

  it('retains the best score and recovers corrupt storage', () => {
    let progress = recordShowcaseVictory(createShowcaseProgress(), 'm1_coastal_strike', 1700);
    progress = recordShowcaseVictory(progress, 'm1_coastal_strike', 900);
    expect(progress.bestScores.m1_coastal_strike).toBe(1700);
    persistShowcaseProgress(progress);
    expect(loadShowcaseProgress()).toEqual(progress);
    storage.set(SHOWCASE_STORAGE_KEY, '{bad json');
    expect(loadShowcaseProgress()).toEqual(createShowcaseProgress());
  });
});

