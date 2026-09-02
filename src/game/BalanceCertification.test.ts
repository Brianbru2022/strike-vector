import { describe, expect, it } from 'vitest';
import { runBalanceCertification } from './BalanceCertification';

describe('release balance certification matrix', () => {
  const report = runBalanceCertification('1987-01-01T00:00:00.000Z');

  it('audits every campaign mission on every difficulty', () => {
    expect(report.campaignEntries).toHaveLength(48);
    expect(new Set(report.campaignEntries.map((entry) => `${entry.difficulty}/${entry.missionId}`)).size).toBe(48);
  });

  it('selects two deployments per difficulty covering all six archetypes', () => {
    expect(report.deployments).toHaveLength(6);
    expect(Object.values(report.coveredArchetypes).every((items) => items.length === 6)).toBe(true);
  });

  it('certifies fighter, SAM and combined encounters at every difficulty', () => {
    expect(report.encounters).toHaveLength(9);
    expect(report.encounters.every((entry) => entry.deterministic)).toBe(true);
    expect(report.encounters.every((entry) => entry.maximumPitchDegrees <= 24.01)).toBe(true);
  });

  it('has no automated release blocker', () => {
    expect(report.issues.filter((issue) => issue.severity === 'ERROR')).toEqual([]);
    expect(report.passed).toBe(true);
  });
});
