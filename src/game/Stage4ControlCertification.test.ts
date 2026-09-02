import { describe, expect, it } from 'vitest';
import { RELEASE_INFO } from './Release';
import { STAGE_4_CONTROL_SCENARIOS, Stage4ControlEvidenceV1, verifyStage4ControlEvidence } from './Stage4ControlCertification';

function completedEvidence(): Stage4ControlEvidenceV1 {
  return {
    version: 1,
    buildId: RELEASE_INFO.buildId,
    completedAt: '2026-08-31T12:00:00.000Z',
    runs: STAGE_4_CONTROL_SCENARIOS.map(({ id, device }) => ({
      scenarioId: id, observedDevice: device, hardware: `${device} test hardware`, promptCorrectBeforeFirstAction: true,
      launchCompleted: true, combatCompleted: true, vtolCompleted: true, recoveryCompleted: true,
      guidedMissionVictory: true, inputLossObserved: false, outsideHelpUsed: false, notes: '',
    })),
  };
}

describe('Stage 4 control certification', () => {
  it('accepts three complete current-build hardware runs', () => {
    expect(verifyStage4ControlEvidence(completedEvidence())).toEqual({ passed: true, issues: [] });
  });

  it('rejects stale, incomplete or failed control evidence', () => {
    const evidence = completedEvidence();
    evidence.buildId = 'STALE';
    evidence.runs[1].promptCorrectBeforeFirstAction = false;
    evidence.runs[2].inputLossObserved = true;
    const result = verifyStage4ControlEvidence(evidence);
    expect(result.passed).toBe(false);
    expect(result.issues.join(' ')).toContain('does not match');
    expect(result.issues.join(' ')).toContain('promptCorrectBeforeFirstAction');
    expect(result.issues.join(' ')).toContain('input loss');
  });
});

