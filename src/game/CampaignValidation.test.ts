import { describe, expect, it } from 'vitest';
import { PlaytestResponse } from '../types/game';
import {
  aggregateCampaignValidationEvidence,
  appendCampaignValidationEvidence,
  CAMPAIGN_VALIDATION_BUILD_ID,
  CAMPAIGN_VALIDATION_SCENARIOS,
  CAMPAIGN_VALIDATION_STORAGE_KEY,
  CampaignValidationEvidenceV1,
  clearCampaignValidationEvidence,
  exportCampaignValidationJson,
  loadCampaignValidationEvidence,
  verifyCampaignValidationExport,
} from './CampaignValidation';

const positiveResponse: PlaytestResponse = {
  warningNoticed: true, controlsClear: true, objectivesClear: true, failureReasonUnderstood: true,
  targetsReadable: true, ammunitionSufficient: true, recoveryAchievable: true, openingAttackFair: true,
  aircraftMovementNatural: true, externalHelpUsed: false, physicalInputConfirmed: true, hardwareDescription: 'Test hardware', observations: '',
  blockers: { unavoidableAttack: false, objectiveBlocker: false, impossibleRecovery: false, terrainPenetration: false, inputFailure: false },
};

function makeEvidence(scenarioId: string, overrides: Partial<CampaignValidationEvidenceV1> = {}): CampaignValidationEvidenceV1 {
  return {
    version: 1,
    buildId: CAMPAIGN_VALIDATION_BUILD_ID,
    completedAt: '2026-08-31T12:00:00.000Z',
    scenarioId,
    run: {
      result: 'VICTORY', simulationTicks: 5400, completedObjectiveIds: ['primary'], retries: 0,
      observedInputDevice: 'KEYBOARD', fighterWarnings: 1, missileWarnings: 1,
      damageReceived: { AIRCRAFT_GUN: 0, SAM_MISSILE: 0, FLAK: 0, GROUND_FIRE: 0, IMPACT: 0 },
      weaponsUsed: { CANNON: 20, MISSILE: 2, BOMB: 2, ROCKET: 4, FLARE: 1 },
      weaponHits: { CANNON: 8, MISSILE: 2, BOMB: 1, ROCKET: 2 },
      ammunitionRemaining: { missiles: 2, bombs: 2, rockets: 6, flares: 5 },
      landingGrade: 'SAFE', tutorialStepsCompleted: 0, tutorialSkipped: false, aircraftLossPhase: 'NONE',
    },
    response: positiveResponse,
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

describe('Stage 2 campaign validation', () => {
  it('defines all sixteen Pilot missions and five targeted passes on each other difficulty', () => {
    expect(CAMPAIGN_VALIDATION_SCENARIOS).toHaveLength(26);
    const pilot = CAMPAIGN_VALIDATION_SCENARIOS.filter((scenario) => scenario.difficulty === 'PILOT');
    expect(pilot).toHaveLength(16);
    expect(new Set(pilot.map((scenario) => scenario.missionId)).size).toBe(16);
    expect(CAMPAIGN_VALIDATION_SCENARIOS.filter((scenario) => scenario.difficulty === 'ARCADE')).toHaveLength(5);
    expect(CAMPAIGN_VALIDATION_SCENARIOS.filter((scenario) => scenario.difficulty === 'VETERAN')).toHaveLength(5);
  });

  it('keeps Stage 2 evidence isolated and recovers from corrupt storage', () => {
    const { memory, storage } = memoryStorage({ STRIKE_VECTOR_PLAYTEST_EVIDENCE_V1: '[{"stage":1}]', STRIKE_VECTOR_HARRIER_87_CAMPAIGN_V4: '{"version":4}' });
    appendCampaignValidationEvidence(makeEvidence('CV-P01'), storage);
    expect(memory.get(CAMPAIGN_VALIDATION_STORAGE_KEY)).toContain('CV-P01');
    expect(memory.get('STRIKE_VECTOR_PLAYTEST_EVIDENCE_V1')).toBe('[{"stage":1}]');
    expect(memory.get('STRIKE_VECTOR_HARRIER_87_CAMPAIGN_V4')).toBe('{"version":4}');
    clearCampaignValidationEvidence(storage);
    expect(memory.has(CAMPAIGN_VALIDATION_STORAGE_KEY)).toBe(false);
    expect(loadCampaignValidationEvidence({ getItem: () => '{broken' } as unknown as Storage)).toEqual([]);
  });

  it('binds sign-off to the current build and the latest attempt per scenario', () => {
    const complete = CAMPAIGN_VALIDATION_SCENARIOS.map((scenario) => makeEvidence(scenario.id));
    expect(aggregateCampaignValidationEvidence(complete)).toMatchObject({
      pilotMissionsCovered: 16, arcadeStressCovered: 5, veteranStressCovered: 5,
      victories: 26, blockers: 0, repeatedIssues: [], signOffReady: true,
    });
    const stale = makeEvidence('CV-P01', { buildId: 'older-build' });
    expect(aggregateCampaignValidationEvidence([...complete, stale])).toMatchObject({ historicalEvidenceCount: 1, signOffReady: true });
    const failedLatest = makeEvidence('CV-P01', { completedAt: '2026-08-31T13:00:00.000Z', run: { ...makeEvidence('CV-P01').run, result: 'FAILURE' } });
    expect(aggregateCampaignValidationEvidence([...complete, failedLatest])).toMatchObject({ victories: 25, signOffReady: false });
  });

  it('rejects blockers, repeated defects and incomplete or duplicated exports', () => {
    const complete = CAMPAIGN_VALIDATION_SCENARIOS.map((scenario) => makeEvidence(scenario.id));
    const repeated = complete.map((item, index) => index < 2 ? { ...item, response: { ...item.response, openingAttackFair: false } } : item);
    expect(aggregateCampaignValidationEvidence(repeated)).toMatchObject({ repeatedIssues: ['Opening attack unfair'], signOffReady: false });
    const blocked = complete.map((item, index) => index === 4 ? { ...item, response: { ...item.response, blockers: { ...item.response.blockers, objectiveBlocker: true } } } : item);
    expect(aggregateCampaignValidationEvidence(blocked)).toMatchObject({ blockers: 1, signOffReady: false });
    const exported = JSON.parse(exportCampaignValidationJson(complete));
    expect(verifyCampaignValidationExport(exported)).toEqual({ passed: true, issues: [] });
    exported.evidence.push(exported.evidence[0]);
    expect(verifyCampaignValidationExport(exported).issues.join(' ')).toMatch(/Duplicate/);
  });

  it('exports anonymous metrics including remaining ammunition without raw input or identity', () => {
    const exported = exportCampaignValidationJson([makeEvidence('CV-P01')]);
    expect(exported).toContain('"ammunitionRemaining"');
    expect(exported).not.toMatch(/rawInput|email|playerName|ipAddress|networkIdentifier/i);
  });
});
