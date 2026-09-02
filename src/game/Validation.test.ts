import { describe, expect, it } from 'vitest';
import { PlaytestEvidenceV1 } from '../types/game';
import {
  aggregatePlaytestEvidence,
  appendPlaytestEvidence,
  clearPlaytestEvidence,
  exportPlaytestEvidenceJson,
  loadPlaytestEvidence,
  MAX_PLAYTEST_EVIDENCE,
  PLAYTEST_EVIDENCE_STORAGE_KEY,
  sanitisePlaytestEvidence,
  aggregatePriorityInputValidation,
  PRIORITY_INPUT_SCENARIOS,
  VALIDATION_BUILD_ID,
  VALIDATION_SCENARIOS,
  verifyPriorityInputEvidenceExport,
  verifyPlaytestEvidenceExport,
} from './Validation';

function makeEvidence(scenarioId = 'V01', overrides: Partial<PlaytestEvidenceV1> = {}): PlaytestEvidenceV1 {
  const scenario = VALIDATION_SCENARIOS.find((candidate) => candidate.id === scenarioId);
  const observedInputDevice = scenario?.deviceClass === 'DESKTOP_GAMEPAD' ? 'GAMEPAD' : scenario?.deviceClass === 'MOBILE_TOUCH' ? 'TOUCH' : 'KEYBOARD';
  return {
    version: 1,
    buildId: VALIDATION_BUILD_ID,
    completedAt: '2026-08-29T12:00:00.000Z',
    scenarioId,
    run: {
      result: 'VICTORY', simulationTicks: 3600, completedObjectiveIds: ['primary'], retries: 0,
      observedInputDevice, fighterWarnings: 1, missileWarnings: 1,
      damageReceived: { AIRCRAFT_GUN: scenarioId === 'V08' || scenarioId === 'V21' ? 12 : 0, SAM_MISSILE: 0, FLAK: 0, GROUND_FIRE: 0, IMPACT: 0 },
      weaponsUsed: { CANNON: 12, MISSILE: 2, BOMB: 0, ROCKET: 0, FLARE: 1 },
      weaponHits: { CANNON: 4, MISSILE: 1, BOMB: 0, ROCKET: 0 }, landingGrade: 'SAFE',
      tutorialStepsCompleted: scenarioId === 'V01' ? 9 : 0, tutorialSkipped: false, aircraftLossPhase: 'NONE',
    },
    response: {
      warningNoticed: true, controlsClear: true, objectivesClear: true, failureReasonUnderstood: true, targetsReadable: true,
      ammunitionSufficient: true, recoveryAchievable: true, openingAttackFair: true, aircraftMovementNatural: true, externalHelpUsed: false,
      physicalInputConfirmed: true, hardwareDescription: 'Test hardware', observations: '',
      blockers: { unavoidableAttack: false, objectiveBlocker: false, impossibleRecovery: false, terrainPenetration: false, inputFailure: false },
    },
    ...overrides,
  };
}

function memoryStorage(seed: Record<string, string> = {}) {
  const memory = new Map(Object.entries(seed));
  return {
    memory,
    storage: {
      getItem: (key: string) => memory.get(key) ?? null,
      setItem: (key: string, value: string) => { memory.set(key, value); },
      removeItem: (key: string) => { memory.delete(key); },
    },
  };
}

describe('internal playtest evidence', () => {
  it('requires the three physical input runs before the full matrix', () => {
    const pending = aggregatePriorityInputValidation([]);
    expect(pending).toMatchObject({ readyForFullMatrix: false, missingScenarioIds: ['V01', 'V09', 'V06'] });
    const complete = PRIORITY_INPUT_SCENARIOS.map((scenario) => makeEvidence(scenario.id));
    expect(aggregatePriorityInputValidation(complete)).toMatchObject({ readyForFullMatrix: true, passedScenarioIds: ['V01', 'V09', 'V06'], issues: [] });
    const emulated = complete.map((item) => item.scenarioId === 'V06' ? { ...item, response: { ...item.response, physicalInputConfirmed: false } } : item);
    expect(aggregatePriorityInputValidation(emulated)).toMatchObject({ readyForFullMatrix: false });
  });

  it('verifies a build-bound priority input evidence export', () => {
    const evidence = PRIORITY_INPUT_SCENARIOS.map((scenario) => makeEvidence(scenario.id));
    expect(verifyPriorityInputEvidenceExport({ version: 1, buildId: VALIDATION_BUILD_ID, evidence })).toMatchObject({
      passed: true,
      summary: { readyForFullMatrix: true },
      issues: [],
    });
    expect(verifyPriorityInputEvidenceExport({ version: 1, buildId: 'older-build', evidence })).toMatchObject({
      passed: false,
      issues: expect.arrayContaining([expect.stringMatching(/does not match/i)]),
    });
  });
  it('covers every benchmark mission on every difficulty and all control classes', () => {
    const missionIds = ['m1_coastal_strike', 'm6_fleet_defence', 'm10_hq_assault', 'm11_cold_passage', 'm14_whiteout_rescue', 'm16_north_cape_assault'];
    expect(VALIDATION_SCENARIOS).toHaveLength(21);
    for (const missionId of missionIds) {
      const scenarios = VALIDATION_SCENARIOS.filter((scenario) => scenario.missionId === missionId);
      expect(new Set(scenarios.map((scenario) => scenario.difficulty))).toEqual(new Set(['ARCADE', 'PILOT', 'VETERAN']));
      expect(new Set(scenarios.map((scenario) => scenario.deviceClass))).toEqual(new Set(['DESKTOP_KEYBOARD', 'DESKTOP_GAMEPAD', 'MOBILE_TOUCH']));
    }
  });

  it('validates records and recovers from corrupt storage', () => {
    expect(sanitisePlaytestEvidence(makeEvidence())).toMatchObject({ version: 1, scenarioId: 'V01' });
    expect(sanitisePlaytestEvidence({ ...makeEvidence(), scenarioId: 'UNKNOWN' })).toBeNull();
    expect(loadPlaytestEvidence({ getItem: () => '{broken' } as unknown as Storage)).toEqual([]);
  });

  it('keeps validation evidence isolated from every existing save key', () => {
    const campaign = '{"version":3}';
    const { memory, storage } = memoryStorage({ STRIKE_VECTOR_HARRIER_87_CAMPAIGN_V3: campaign, STRIKE_VECTOR_DIAGNOSTICS_V3: '[]' });
    appendPlaytestEvidence(makeEvidence(), storage);
    expect(memory.get(PLAYTEST_EVIDENCE_STORAGE_KEY)).toContain('V01');
    expect(memory.get('STRIKE_VECTOR_HARRIER_87_CAMPAIGN_V3')).toBe(campaign);
    expect(memory.get('STRIKE_VECTOR_DIAGNOSTICS_V3')).toBe('[]');
    clearPlaytestEvidence(storage);
    expect(memory.has(PLAYTEST_EVIDENCE_STORAGE_KEY)).toBe(false);
    expect(memory.get('STRIKE_VECTOR_HARRIER_87_CAMPAIGN_V3')).toBe(campaign);
  });

  it('retains the latest one hundred attempts', () => {
    const { storage } = memoryStorage();
    for (let index = 0; index < 105; index++) appendPlaytestEvidence({ ...makeEvidence(), completedAt: `2026-08-29T12:${String(index).padStart(2, '0')}:00.000Z` }, storage);
    expect(loadPlaytestEvidence(storage as Storage)).toHaveLength(MAX_PLAYTEST_EVIDENCE);
  });

  it('exports only the versioned anonymous evidence contract', () => {
    const exported = exportPlaytestEvidenceJson([makeEvidence()]);
    expect(exported).toContain(`"buildId": "${VALIDATION_BUILD_ID}"`);
    expect(exported).not.toMatch(/rawInput|email|playerName|ipAddress|networkIdentifier/i);
  });

  it('excludes stale builds from current sign-off while retaining their history', () => {
    const current = VALIDATION_SCENARIOS.map((scenario) => makeEvidence(scenario.id));
    const stale = makeEvidence('V01', { buildId: 'older-build', completedAt: '2026-08-28T12:00:00.000Z' });
    expect(aggregatePlaytestEvidence([...current, stale])).toMatchObject({
      currentBuildEvidenceCount: current.length,
      historicalEvidenceCount: 1,
      signOffReady: true,
    });
    const exported = JSON.parse(exportPlaytestEvidenceJson([...current, stale]));
    expect(exported.evidence).toHaveLength(VALIDATION_SCENARIOS.length);
    expect(exported.attemptHistory).toContainEqual(expect.objectContaining({ buildId: 'older-build' }));
    expect(verifyPlaytestEvidenceExport(exported)).toMatchObject({ passed: true, issues: [] });
  });

  it('rejects mismatched, duplicated and incomplete sign-off exports', () => {
    const duplicate = makeEvidence('V01', { completedAt: '2026-08-29T13:00:00.000Z' });
    const result = verifyPlaytestEvidenceExport({ version: 1, buildId: 'older-build', evidence: [makeEvidence(), duplicate] });
    expect(result.passed).toBe(false);
    expect(result.issues.join(' ')).toMatch(/does not match|Duplicate scenario|Missing scenario/);
  });

  it('bounds free-text observations and migrates earlier response records safely', () => {
    const longObservation = 'x'.repeat(1400);
    expect(sanitisePlaytestEvidence({ ...makeEvidence(), response: { ...makeEvidence().response, observations: longObservation } })?.response.observations).toHaveLength(1200);
    const legacyResponse = { ...makeEvidence().response } as Record<string, unknown>;
    delete legacyResponse.objectivesClear;
    delete legacyResponse.ammunitionSufficient;
    delete legacyResponse.observations;
    expect(sanitisePlaytestEvidence({ ...makeEvidence(), response: legacyResponse })?.response).toMatchObject({ objectivesClear: true, ammunitionSufficient: true, observations: '' });
  });

  it('requires complete clean coverage before internal sign-off', () => {
    const complete = VALIDATION_SCENARIOS.map((scenario) => makeEvidence(scenario.id));
    expect(aggregatePlaytestEvidence(complete)).toMatchObject({
      completedScenarioIds: VALIDATION_SCENARIOS.map((scenario) => scenario.id),
      victoryCount: VALIDATION_SCENARIOS.length,
      warningAcknowledgedRuns: VALIDATION_SCENARIOS.length,
      coveredMissionIds: expect.arrayContaining(['m1_coastal_strike', 'm6_fleet_defence', 'm10_hq_assault', 'm11_cold_passage', 'm14_whiteout_rescue', 'm16_north_cape_assault']),
      guidedMissionCompletedWithoutHelp: true,
      blockerCount: 0,
      repeatedIssues: [],
      signOffReady: true,
    });
    const repeated = complete.map((item, index) => index < 2 ? { ...item, response: { ...item.response, targetsReadable: false } } : item);
    expect(aggregatePlaytestEvidence(repeated)).toMatchObject({ repeatedIssues: ['Targets unreadable'], signOffReady: false });
    const failed = complete.map((item, index) => index === 4 ? { ...item, run: { ...item.run, result: 'FAILURE' as const } } : item);
    expect(aggregatePlaytestEvidence(failed)).toMatchObject({ victoryCount: VALIDATION_SCENARIOS.length - 1, signOffReady: false });
  });
});
