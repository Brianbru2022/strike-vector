import { describe, expect, it } from 'vitest';
import { PlaytestRunResult } from '../types/game';
import {
  aggregateControlConceptEvidence,
  appendControlConceptEvidence,
  clearControlConceptEvidence,
  CONTROL_CONCEPT_IDS,
  CONTROL_CONCEPT_SLOTS,
  CONTROL_CONCEPT_STORAGE_KEY,
  ControlConceptEvidenceV1,
  exportControlConceptEvidenceJson,
  loadControlConceptEvidence,
  sanitiseControlConceptEvidence,
} from './ControlConceptPlaytest';
import { RELEASE_INFO } from './Release';

const run: PlaytestRunResult = {
  result: 'VICTORY', simulationTicks: 3600, completedObjectiveIds: ['m1_intercept'], retries: 0, observedInputDevice: 'KEYBOARD', fighterWarnings: 1, missileWarnings: 1,
  damageReceived: { FLAK: 0, SAM_MISSILE: 0, AIRCRAFT_GUN: 0, GROUND_FIRE: 0, IMPACT: 0 }, weaponsUsed: { CANNON: 1, MISSILE: 1, BOMB: 0, ROCKET: 0, FLARE: 1 }, weaponHits: { CANNON: 1, MISSILE: 1, BOMB: 0, ROCKET: 0 },
  ammunitionRemaining: { missiles: 5, bombs: 0, rockets: 4, flares: 5 }, landingGrade: 'SAFE', tutorialStepsCompleted: 9, tutorialSkipped: false, aircraftLossPhase: null,
};

const makeEvidence = (index = 0, buildId: string = RELEASE_INFO.buildId): ControlConceptEvidenceV1 => {
  const slot = CONTROL_CONCEPT_SLOTS[index];
  return {
    version: 1, buildId, slotId: slot.id, experience: slot.experience, completedAt: `2026-09-20T12:0${index}:00.000Z`, cleanSnapshot: true, guidedMission: true, run,
    response: {
      observations: Object.fromEntries(CONTROL_CONCEPT_IDS.map((id) => [id, { rating: 'INDEPENDENT', comprehensionSeconds: 30 + index }])) as ControlConceptEvidenceV1['response']['observations'],
      confusionPoints: index === 0 ? ['DIRECTION_VS_THROTTLE'] : [], wantedAnotherSortie: index !== 2, requestedAnotherSortieWithoutPrompt: index < 2, outsideHelpGiven: false,
    },
  };
};

const memoryStorage = () => {
  const memory = new Map<string, string>();
  return { memory, storage: { getItem: (key: string) => memory.get(key) ?? null, setItem: (key: string, value: string) => { memory.set(key, value); }, removeItem: (key: string) => { memory.delete(key); } } };
};

describe('Milestone 5 control-concept evidence', () => {
  it('requires exactly three novice and two experienced human slots', () => {
    const evidence = CONTROL_CONCEPT_SLOTS.map((_, index) => makeEvidence(index));
    expect(aggregateControlConceptEvidence(evidence)).toMatchObject({ complete: true, noviceCount: 3, experiencedCount: 2, wantsAnotherSortieCount: 4, unpromptedAnotherSortieCount: 2 });
  });

  it('excludes stale builds and invalidates coached sessions', () => {
    const current = CONTROL_CONCEPT_SLOTS.map((_, index) => makeEvidence(index));
    const coached = { ...current[0], completedAt: '2026-09-20T13:00:00.000Z', response: { ...current[0].response, outsideHelpGiven: true } };
    const summary = aggregateControlConceptEvidence([...current, makeEvidence(0, 'older-build'), coached]);
    expect(summary).toMatchObject({ complete: false, historicalCount: 1, currentBuildCount: 6 });
    expect(summary.issues).toContain('At least one session received outside control coaching and must be rerun.');
  });

  it('keeps local evidence isolated, recovers corruption and exports no identity fields', () => {
    const { memory, storage } = memoryStorage();
    memory.set(CONTROL_CONCEPT_STORAGE_KEY, '{broken');
    expect(loadControlConceptEvidence(storage)).toEqual([]);
    const saved = appendControlConceptEvidence(makeEvidence(), storage);
    expect(saved).toHaveLength(1);
    const exported = JSON.parse(exportControlConceptEvidenceJson(saved));
    const keys: string[] = [];
    const visit = (value: unknown) => {
      if (!value || typeof value !== 'object') return;
      for (const [key, child] of Object.entries(value)) { keys.push(key); visit(child); }
    };
    visit(exported);
    expect(keys).not.toEqual(expect.arrayContaining(['name', 'email', 'address', 'rawInput']));
    clearControlConceptEvidence(storage);
    expect(memory.has(CONTROL_CONCEPT_STORAGE_KEY)).toBe(false);
  });

  it('rejects mismatched experience and malformed observations', () => {
    expect(sanitiseControlConceptEvidence({ ...makeEvidence(), experience: 'EXPERIENCED' })).toBeNull();
    const malformed = makeEvidence();
    delete (malformed.response.observations as Partial<typeof malformed.response.observations>).PITCH;
    expect(sanitiseControlConceptEvidence(malformed)).toBeNull();
  });
});
