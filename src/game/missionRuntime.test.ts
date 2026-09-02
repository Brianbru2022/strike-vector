import { describe, expect, it } from 'vitest';
import { CAMPAIGN_MISSIONS } from './Missions';
import { instantiateMission } from './missionRuntime';

describe('mission runtime', () => {
  it('creates fresh objective and enemy state for every replay', () => {
    const first = instantiateMission(CAMPAIGN_MISSIONS[0]);
    first.objectives[0].completed = true;
    first.objectives[0].currentCount = 9;
    const firstEnemies = first.spawnEnemies();
    firstEnemies[0].health = 0;

    const replay = instantiateMission(CAMPAIGN_MISSIONS[0]);
    expect(replay.objectives[0].completed).toBe(false);
    expect(replay.objectives[0].currentCount).toBe(0);
    expect(replay.spawnEnemies()[0].health).toBeGreaterThan(0);
  });
});
