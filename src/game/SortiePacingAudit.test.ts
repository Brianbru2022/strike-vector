import { describe, expect, it } from 'vitest';
import { CAMPAIGN_MISSIONS } from './Missions';
import { auditSortiePacing } from './SortiePacingAudit';

describe('sortie pacing audit', () => {
  it('audits every authored mission without mutating it', () => {
    const before = CAMPAIGN_MISSIONS[0].objectives[0].completed;
    const entries = CAMPAIGN_MISSIONS.map(auditSortiePacing);
    expect(entries).toHaveLength(16);
    expect(entries.every((entry) => entry.largestContactGap >= 0)).toBe(true);
    expect(CAMPAIGN_MISSIONS[0].objectives[0].completed).toBe(before);
  });

  it('keeps the compressed Cold Passage and Whiteout Rescue routes below the dead-travel threshold', () => {
    const entries = CAMPAIGN_MISSIONS
      .filter((mission) => mission.id === 'm11_cold_passage' || mission.id === 'm14_whiteout_rescue')
      .map(auditSortiePacing);
    expect(entries).toHaveLength(2);
    expect(entries.every((entry) => entry.deadTravelRisk === false)).toBe(true);
    expect(entries.every((entry) => entry.largestContactGap <= 3200)).toBe(true);
  });
});
