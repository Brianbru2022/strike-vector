import { describe, expect, it } from 'vitest';
import { RELEASE_INFO } from './Release';
import { STAGE_3_READABILITY_SCENARIOS, Stage3ReadabilityEvidenceV1, verifyStage3ReadabilityEvidence } from './Stage3ReadabilityEvidence';

function completeEvidence(): Stage3ReadabilityEvidenceV1 {
  return {
    version: 1,
    buildId: RELEASE_INFO.buildId,
    completedAt: '2026-08-31T12:00:00.000Z',
    runs: STAGE_3_READABILITY_SCENARIOS.map((scenario) => ({ scenario, aircraftTypeRecognised: true, threatDirectionRecognised: true, missileLaunchRecognised: true, largeTargetCircleRequired: false, notes: '' })),
  };
}

describe('Stage 3 readability evidence', () => {
  it('accepts one complete current-build review per scenario', () => {
    expect(verifyStage3ReadabilityEvidence(completeEvidence())).toEqual({ passed: true, issues: [] });
  });

  it('rejects incomplete, duplicated and stale evidence', () => {
    const evidence = completeEvidence();
    evidence.buildId = 'STALE';
    evidence.completedAt = null;
    evidence.runs.push({ ...evidence.runs[0] });
    evidence.runs[1].missileLaunchRecognised = false;
    const result = verifyStage3ReadabilityEvidence(evidence);
    expect(result.passed).toBe(false);
    expect(result.issues.join(' ')).toContain('does not match');
    expect(result.issues.join(' ')).toContain('exactly one');
    expect(result.issues.join(' ')).toContain('missile launch');
  });
});

