import { describe, expect, it } from 'vitest';
import { aggregateStage7Metrics, createStage7Evidence, verifyStage7Evidence } from './Stage7Balance';
import { RELEASE_INFO } from './Release';
import { DiagnosticSessionV3 } from '../types/game';

describe('Stage 7 balance evidence', () => {
  it('does not accept historical or automated-empty evidence', () => {
    const evidence = createStage7Evidence([]);
    expect(evidence.buildId).toBe(RELEASE_INFO.buildId);
    expect(verifyStage7Evidence(evidence, ['m1']).passed).toBe(false);
  });

  it('exports one human-review template for each unique current-build run', () => {
    const run = makeRun();
    const evidence = createStage7Evidence([run, { ...run, simulationTicks: 900 }]);
    expect(evidence.runs).toHaveLength(2);
    expect(evidence.humanReviews).toEqual([expect.objectContaining({ runKey: 'campaign:PILOT:m1', openingAttackFair: null })]);
  });

  it('aggregates the release balance measurements without wall-clock time', () => {
    const metrics = aggregateStage7Metrics([makeRun(), { ...makeRun(), result: 'FAILURE', simulationTicks: 1800, combatTicks: 600 }]);
    expect(metrics).toMatchObject({ attempts: 2, victories: 1, completionRate: 50, averageSortieSeconds: 20, averageCombatSeconds: 8, missileWarnings: 2 });
    expect(metrics.ammunitionUsed.MISSILE).toBe(4);
    expect(metrics.damageBySource.SAM_MISSILE).toBe(20);
  });
});

function makeRun(): DiagnosticSessionV3 {
  return {
    version: 3, buildId: RELEASE_INFO.buildId, missionId: 'm1', difficulty: 'PILOT', simulationTicks: 600,
    result: 'VICTORY', completedObjectiveIds: ['objective'], deathCause: null,
    weaponsUsed: { CANNON: 20, MISSILE: 2, BOMB: 0, ROCKET: 0, FLARE: 1 }, landingGrade: 'SAFE', tutorialStepsCompleted: 0, tutorialSkipped: false,
    operationSeed: null, operationArchetype: null, operationSortieIndex: null, operationRetryCount: 0,
    damageReceived: { AIRCRAFT_GUN: 2, SAM_MISSILE: 10, FLAK: 0, GROUND_FIRE: 0, IMPACT: 0 },
    weaponHits: { CANNON: 3, MISSILE: 1, BOMB: 0, ROCKET: 0 }, enemyAircraftDestroyed: 1,
    missileWarnings: 1, warningAcknowledgements: 1, countermeasureSuccesses: 1, combatTicks: 300, aircraftLossPhase: 'NONE',
  };
}
