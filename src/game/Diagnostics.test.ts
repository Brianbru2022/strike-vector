import { describe, expect, it } from 'vitest';
import { aggregateDifficultyDiagnostics, aggregatePlayabilityDiagnostics, appendDiagnostic, buildBalanceCoverage, DIAGNOSTICS_STORAGE_KEY, exportDiagnosticsJson, LEGACY_DIAGNOSTICS_STORAGE_KEY, LEGACY_DIAGNOSTICS_V2_STORAGE_KEY, LEGACY_DIAGNOSTICS_V3_STORAGE_KEY, loadDiagnostics, MAX_DIAGNOSTIC_SESSIONS } from './Diagnostics';
import { DiagnosticSessionV1, DiagnosticSessionV2, DiagnosticSessionV3, DiagnosticSessionV4 } from '../types/game';

const makeSession = (missionId: string): DiagnosticSessionV1 => ({
  version: 1, missionId, difficulty: 'PILOT', simulationTicks: 600, result: 'VICTORY',
  completedObjectiveIds: [], deathCause: null, weaponsUsed: { CANNON: 1, MISSILE: 0, BOMB: 0, ROCKET: 0, FLARE: 0 },
  landingGrade: 'SAFE', tutorialStepsCompleted: 0, tutorialSkipped: false,
});

describe('local diagnostics', () => {
  it('retains only the latest one hundred sessions', () => {
    const memory = new Map<string, string>();
    const storage = { getItem: (key: string) => memory.get(key) ?? null, setItem: (key: string, value: string) => { memory.set(key, value); } };
    for (let index = 0; index < 105; index++) appendDiagnostic(makeSession(`m${index}`), storage);
    const sessions = loadDiagnostics(storage as Storage);
    expect(sessions).toHaveLength(MAX_DIAGNOSTIC_SESSIONS);
    expect(sessions[0].missionId).toBe('m5');
  });

  it('exports only the documented anonymous session fields', () => {
    const exported = exportDiagnosticsJson([makeSession('m1')]);
    expect(exported).toContain('"missionId": "m1"');
    expect(exported).not.toMatch(/key|email|name|timestamp/i);
    expect(exported).toContain('"version": 4');
  });

  it('migrates V1 and V2 records into V4 while retaining operation context', () => {
    const memory = new Map<string, string>([[LEGACY_DIAGNOSTICS_STORAGE_KEY, JSON.stringify([makeSession('m1')])]]);
    const storage = { getItem: (key: string) => memory.get(key) ?? null, setItem: (key: string, value: string) => { memory.set(key, value); } };
    const operationSession: DiagnosticSessionV2 = { ...makeSession('op_1987_1'), version: 2, operationSeed: 1987, operationArchetype: 'SEAD', operationSortieIndex: 0, operationRetryCount: 1 };
    appendDiagnostic(operationSession, storage);
    const sessions = loadDiagnostics(storage as Storage);
    expect(sessions[0]).toMatchObject({ version: 4, operationSeed: null, operationRetryCount: 0, enemyAircraftDestroyed: 0, aircraftLossPhase: 'NONE', reversalsCompleted: 0 });
    expect(sessions[1]).toMatchObject({ version: 4, operationSeed: 1987, operationArchetype: 'SEAD', operationSortieIndex: 0, operationRetryCount: 1 });
    expect(memory.has(DIAGNOSTICS_STORAGE_KEY)).toBe(true);
  });

  it('loads a legacy V2 store and aggregates V3 difficulty evidence', () => {
    const legacy: DiagnosticSessionV2 = { ...makeSession('m2'), version: 2, difficulty: 'ARCADE', operationSeed: null, operationArchetype: null, operationSortieIndex: null, operationRetryCount: 0 };
    const memory = new Map<string, string>([[LEGACY_DIAGNOSTICS_V2_STORAGE_KEY, JSON.stringify([legacy])]]);
    const storage = { getItem: (key: string) => memory.get(key) ?? null };
    const sessions = loadDiagnostics(storage as Storage);
    expect(aggregateDifficultyDiagnostics(sessions).find((item) => item.difficulty === 'ARCADE')).toMatchObject({ sorties: 1, victoryPercent: 100 });
  });

  it('preserves V3 combat metrics without accepting negative values', () => {
    const session: DiagnosticSessionV3 = {
      ...makeSession('m3'), version: 3, operationSeed: null, operationArchetype: null, operationSortieIndex: null, operationRetryCount: 0,
      damageReceived: { AIRCRAFT_GUN: 12, SAM_MISSILE: -5, FLAK: 4, GROUND_FIRE: 0, IMPACT: 0 },
      weaponHits: { CANNON: 3, MISSILE: 1, BOMB: 0, ROCKET: 0 }, enemyAircraftDestroyed: 2,
      missileWarnings: 1, warningAcknowledgements: 1, countermeasureSuccesses: 1, combatTicks: 600, aircraftLossPhase: 'EJECTION',
    };
    expect(loadDiagnostics({ getItem: () => JSON.stringify([session]) } as unknown as Storage)[0]).toMatchObject({
      damageReceived: { AIRCRAFT_GUN: 12, SAM_MISSILE: 0 }, enemyAircraftDestroyed: 2, aircraftLossPhase: 'EJECTION',
    });
  });

  it('migrates the legacy V3 store and preserves bounded V4 playability metrics', () => {
    const legacy: DiagnosticSessionV3 = {
      ...makeSession('m4'), version: 3, operationSeed: null, operationArchetype: null, operationSortieIndex: null, operationRetryCount: 0,
      damageReceived: { AIRCRAFT_GUN: 0, SAM_MISSILE: 0, FLAK: 0, GROUND_FIRE: 0, IMPACT: 0 },
      weaponHits: { CANNON: 0, MISSILE: 0, BOMB: 0, ROCKET: 0 }, enemyAircraftDestroyed: 0, missileWarnings: 0,
      warningAcknowledgements: 0, countermeasureSuccesses: 0, combatTicks: 0, aircraftLossPhase: 'NONE',
    };
    expect(loadDiagnostics({ getItem: (key: string) => key === LEGACY_DIAGNOSTICS_V3_STORAGE_KEY ? JSON.stringify([legacy]) : null } as unknown as Storage)[0]).toMatchObject({ version: 4, reversalsCompleted: 0, recoveryFailureReason: null });
    const current: DiagnosticSessionV4 = { ...loadDiagnostics({ getItem: () => JSON.stringify([legacy]) } as unknown as Storage)[0], reversalsCompleted: 3, averageReversalTicks: 24, controlDeviceTransitions: 2, recoveryFailureReason: 'MISALIGNED', warningResponsePercent: 175, encounterIdleTicks: 900 };
    expect(loadDiagnostics({ getItem: () => JSON.stringify([current]) } as unknown as Storage)[0]).toMatchObject({ reversalsCompleted: 3, averageReversalTicks: 24, controlDeviceTransitions: 2, recoveryFailureReason: 'MISALIGNED', warningResponsePercent: 100, encounterIdleTicks: 900 });
  });

  it('tracks the required human campaign and deployment coverage independently by difficulty', () => {
    const missionIds = ['m1', 'm2'];
    const base = loadDiagnostics({ getItem: () => JSON.stringify([{
      ...makeSession('m1'), version: 3, operationSeed: null, operationArchetype: null, operationSortieIndex: null, operationRetryCount: 0,
      damageReceived: { AIRCRAFT_GUN: 0, SAM_MISSILE: 0, FLAK: 0, GROUND_FIRE: 0, IMPACT: 0 },
      weaponHits: { CANNON: 0, MISSILE: 0, BOMB: 0, ROCKET: 0 }, enemyAircraftDestroyed: 0, missileWarnings: 0, warningAcknowledgements: 0,
      countermeasureSuccesses: 0, combatTicks: 0, aircraftLossPhase: 'NONE',
    }]) } as unknown as Storage)[0];
    const campaign = missionIds.map((missionId) => ({ ...base, missionId, difficulty: 'ARCADE' as const }));
    const archetypes = ['FLEET_CAP', 'SEAD', 'ARMOURED_INTERDICTION', 'PILOT_RESCUE', 'FARP_DEFENCE', 'DEEP_STRIKE'] as const;
    const operations = archetypes.map((operationArchetype, index) => ({ ...base, missionId: `op_${index}`, difficulty: 'ARCADE' as const, operationSeed: index < 3 ? 100 : 200, operationSortieIndex: index % 3, operationArchetype }));
    const coverage = buildBalanceCoverage([...campaign, ...operations], missionIds);
    expect(coverage[0]).toMatchObject({ campaignVictories: 2, completedDeployments: 2, archetypesRequired: 6, complete: true });
    expect(coverage[1].complete).toBe(false);
  });

  it('aggregates current playability diagnostics without raw input data', () => {
    const base = loadDiagnostics({ getItem: () => JSON.stringify([makeSession('m1')]) } as unknown as Storage)[0];
    const sessions = [
      { ...base, reversalsCompleted: 2, averageReversalTicks: 30, controlDeviceTransitions: 1, warningResponsePercent: 100, encounterIdleTicks: 600, recoveryFailureReason: null },
      { ...base, reversalsCompleted: 1, averageReversalTicks: 60, controlDeviceTransitions: 2, warningResponsePercent: 50, encounterIdleTicks: 1200, recoveryFailureReason: 'MISALIGNED' as const },
    ];
    expect(aggregatePlayabilityDiagnostics(sessions)).toMatchObject({ reversals: 3, averageReversalTicks: 40, deviceTransitions: 3, warningResponsePercent: 75, averageIdleSeconds: 15, recoveryFailures: { MISALIGNED: 1 } });
  });
});
