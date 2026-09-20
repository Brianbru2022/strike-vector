import { describe, expect, it } from 'vitest';
import { BETA_EVIDENCE_STORAGE_KEY, exportBetaEvidenceJson, loadBetaEvidence, MAX_BETA_EVENTS, recordBetaEvent } from './BetaEvidence';

const memoryStorage = () => {
  const memory = new Map<string, string>();
  return { memory, storage: { getItem: (key: string) => memory.get(key) ?? null, setItem: (key: string, value: string) => { memory.set(key, value); } } };
};

describe('external beta evidence', () => {
  it('records only coarse local behaviour and exports useful continuation evidence', () => {
    const { storage } = memoryStorage();
    recordBetaEvent('SESSION_STARTED', {}, storage, new Date('2026-09-02T10:00:00Z'));
    recordBetaEvent('MISSION_STARTED', { missionId: 'm1_coastal_strike', difficulty: 'ARCADE' }, storage, new Date('2026-09-02T10:01:00Z'));
    recordBetaEvent('SORTIE_ENDED', { missionId: 'm1_coastal_strike', difficulty: 'ARCADE', result: 'VICTORY', simulationTicks: 3600 }, storage, new Date('2026-09-02T10:02:00Z'));
    recordBetaEvent('CONTINUE_REQUESTED', { missionId: 'm1_coastal_strike' }, storage, new Date('2026-09-02T10:03:00Z'));
    recordBetaEvent('MISSION_STARTED', { missionId: 'm2_valley_run', difficulty: 'ARCADE' }, storage, new Date('2026-09-02T10:04:00Z'));
    const exported = JSON.parse(exportBetaEvidenceJson(storage));
    expect(exported.summary).toMatchObject({ sessions: 1, missionOneAttempts: 1, missionOneVictories: 1, continueRequests: 1, missionTwoStarts: 1 });
    expect(Object.keys(exported.events[0]).sort()).toEqual(['difficulty', 'missionId', 'result', 'sequence', 'simulationTicks', 'type', 'utcDay'].sort());
  });

  it('recovers from corrupt data and retains only the latest events', () => {
    const { memory, storage } = memoryStorage();
    memory.set(BETA_EVIDENCE_STORAGE_KEY, '{bad');
    expect(loadBetaEvidence(storage).events).toEqual([]);
    for (let index = 0; index < MAX_BETA_EVENTS + 5; index++) recordBetaEvent('SESSION_STARTED', {}, storage, new Date('2026-09-02T10:00:00Z'));
    expect(loadBetaEvidence(storage).events).toHaveLength(MAX_BETA_EVENTS);
  });
});
