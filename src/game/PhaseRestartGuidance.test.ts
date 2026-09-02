import { describe, expect, it } from 'vitest';
import { CAMPAIGN_MISSIONS } from './Missions';
import { buildPhaseRestartGuidance } from './PhaseRestartGuidance';

describe('phase restart guidance', () => {
  it('rebriefs the reached phase without implying a checkpoint', () => {
    const mission = CAMPAIGN_MISSIONS.find((item) => (item.phases?.length ?? 0) > 1)!;
    const phase = mission.phases![1];
    const guidance = buildPhaseRestartGuidance(mission, {
      elapsedTicks: 900, phaseId: phase.id, phaseLabel: phase.label,
      firedEventIds: [], alertLevel: 0, nextWaveTicks: null, failureMessage: null,
    });
    expect(guidance).toMatchObject({ phaseId: phase.id, phaseNumber: 2, wholeSortieRestart: true });
  });

  it('does not add phase advice to an unstaged sortie', () => {
    const mission = { ...CAMPAIGN_MISSIONS[0], phases: undefined };
    expect(buildPhaseRestartGuidance(mission, {
      elapsedTicks: 0, phaseId: 'ACTIVE', phaseLabel: 'MISSION ACTIVE',
      firedEventIds: [], alertLevel: 0, nextWaveTicks: null, failureMessage: null,
    })).toBeNull();
  });
});
