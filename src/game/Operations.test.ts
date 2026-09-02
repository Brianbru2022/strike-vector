import { describe, expect, it } from 'vitest';
import { generateOperation, generateOperationV3 } from './DynamicOperations';
import { ACTIVE_OPERATION_STORAGE_KEY, LEGACY_ACTIVE_OPERATION_STORAGE_KEY, LEGACY_OPERATIONS_PROFILE_STORAGE_KEY, OPERATIONS_PROFILE_STORAGE_KEY, advanceOperation, awardOperationMedal, createOperationRecord, createOperationRun, incrementOperationRetry, loadActiveOperation, loadOperationsProfile, medalCeiling, persistActiveOperation, recordAbandonedOperation, recordCompletedOperation, recordOperationSelection, toggleOperationFavourite } from './Operations';
import { OperationSortieResultV1 } from '../types/game';

const result = (index: number, optional = 1, landing: OperationSortieResultV1['landingGrade'] = 'SAFE', integrity = 80): OperationSortieResultV1 => ({ sortieIndex: index, archetype: ['SEAD', 'FLEET_CAP', 'DEEP_STRIKE', 'FARP_DEFENCE', 'PILOT_RESCUE'][index] as OperationSortieResultV1['archetype'], score: 1000 + index, simulationTicks: 3600, optionalObjectivesCompleted: optional, landingGrade: landing, pilotSurvived: true, defendedAssetIntegrity: integrity });

const memoryStorage = () => {
  const memory = new Map<string, string>();
  return { memory, storage: { getItem: (key: string) => memory.get(key) ?? null, setItem: (key: string, value: string) => { memory.set(key, value); }, removeItem: (key: string) => { memory.delete(key); } } };
};

describe('operation persistence and medals', () => {
  it('persists a serialisable run and regenerates its immutable blueprint', () => {
    const { storage, memory } = memoryStorage();
    const run = createOperationRun(generateOperation(1987, 'PILOT'));
    persistActiveOperation(run, storage);
    const loaded = loadActiveOperation(storage as Storage)!;
    expect(loaded.blueprint).toEqual(run.blueprint);
    expect(Object.isFrozen(loaded.blueprint)).toBe(true);
    expect(memory.get(ACTIVE_OPERATION_STORAGE_KEY)).not.toContain('spawnEnemies');
  });

  it('persists V2 Norwegian runs while legacy records remain V1', () => {
    const { storage } = memoryStorage();
    const norwegian = createOperationRun(generateOperation(1987, 'VETERAN', 2));
    persistActiveOperation(norwegian, storage);
    expect(loadActiveOperation(storage as Storage)?.blueprint).toEqual(norwegian.blueprint);
    const v2Record = createOperationRecord({ ...norwegian, currentSortieIndex: 3, results: [result(0), result(1), result(2)] });
    expect(v2Record).toMatchObject({ version: 2, generationVersion: 2, contentSet: 'NORWEGIAN_SEA', sortieCount: 3 });

    const legacyRecord = { ...v2Record, generationVersion: undefined };
    storage.setItem(LEGACY_OPERATIONS_PROFILE_STORAGE_KEY, JSON.stringify({ version: 1, records: [legacyRecord], abandonedRuns: 0 }));
    expect(loadOperationsProfile(storage as Storage).records[0].generationVersion).toBe(1);
  });

  it('recovers safely from corrupt active and profile data', () => {
    const { storage, memory } = memoryStorage();
    memory.set(ACTIVE_OPERATION_STORAGE_KEY, '{broken');
    memory.set(OPERATIONS_PROFILE_STORAGE_KEY, '{broken');
    expect(loadActiveOperation(storage as Storage)).toBeNull();
    expect(loadOperationsProfile(storage as Storage)).toEqual({ version: 2, records: [], history: [], abandonedRuns: 0 });
  });

  it('restores the pre-sortie aircraft snapshot while retries lower the medal ceiling', () => {
    const run = createOperationRun(generateOperation(77, 'PILOT'));
    const damaged = { ...run, aircraftCondition: { ...run.aircraftCondition, health: 72 } };
    const retried = incrementOperationRetry(damaged);
    expect(retried.aircraftCondition.health).toBe(72);
    expect(medalCeiling(retried.retries)).toBe('SILVER');
    expect(medalCeiling(incrementOperationRetry(retried).retries)).toBe('BRONZE');
  });

  it('awards gold, silver and bronze from documented criteria', () => {
    const base = createOperationRun(generateOperation(9, 'PILOT'));
    const gold = { ...base, currentSortieIndex: 3, results: [result(0), result(1), result(2)] };
    expect(awardOperationMedal(gold)).toBe('GOLD');
    expect(awardOperationMedal({ ...gold, retries: 1, results: [result(0), result(1), result(2, 0)] })).toBe('SILVER');
    expect(awardOperationMedal({ ...gold, retries: 2 })).toBe('BRONZE');
  });

  it('advances three sorties and retains the best record per seed and difficulty', () => {
    const { storage } = memoryStorage();
    let run = createOperationRun(generateOperation(42, 'PILOT'));
    for (let index = 0; index < 3; index++) run = advanceOperation(run, result(index), run.aircraftCondition, run.selectedLoadout);
    const first = createOperationRecord({ ...run, retries: 1 });
    recordCompletedOperation(first, storage);
    recordCompletedOperation({ ...first, medal: 'BRONZE', totalScore: first.totalScore - 500, simulationTicks: first.simulationTicks + 600, retries: 2 }, storage);
    const profile = loadOperationsProfile(storage as Storage);
    expect(profile.records).toHaveLength(1);
    expect(profile.records[0]).toMatchObject({ medal: 'SILVER', totalScore: first.totalScore, simulationTicks: first.simulationTicks, retries: 1 });
    expect(recordAbandonedOperation(storage).abandonedRuns).toBe(1);
  });

  it('migrates a V1 active run and persists five-sortie asset attrition', () => {
    const { storage } = memoryStorage();
    const legacy = { ...createOperationRun(generateOperation(1987, 'PILOT')), version: 1, defendedAssets: undefined };
    storage.setItem(LEGACY_ACTIVE_OPERATION_STORAGE_KEY, JSON.stringify(legacy));
    expect(loadActiveOperation(storage as Storage)).toMatchObject({ version: 2, defendedAssets: { CARRIER: 100, FORWARD_BASE: 100 } });

    let run = createOperationRun(generateOperationV3(77, 'VETERAN', 'NORWEGIAN_SEA', 5));
    for (let index = 0; index < 5; index++) run = advanceOperation(run, result(index, 1, 'SAFE', 90 - index * 5), run.aircraftCondition, run.selectedLoadout);
    expect(run.currentSortieIndex).toBe(5);
    expect(run.results).toHaveLength(5);
    expect(Math.min(run.defendedAssets.CARRIER, run.defendedAssets.FORWARD_BASE)).toBeLessThan(100);
    expect(createOperationRecord(run)).toMatchObject({ version: 2, generationVersion: 3, sortieCount: 5, contentSet: 'NORWEGIAN_SEA' });
  });

  it('stores bounded seed history and favourites independently from records', () => {
    const { storage } = memoryStorage();
    const blueprint = generateOperationV3(1987, 'PILOT', 'NORTH_ATLANTIC', 5);
    let profile = recordOperationSelection(blueprint, storage, '2026-08-30T12:00:00.000Z');
    expect(profile.history[0]).toMatchObject({ seed: 1987, sortieCount: 5, favourite: false });
    profile = toggleOperationFavourite(profile.history[0], storage);
    expect(profile.history[0].favourite).toBe(true);
    expect(profile.records).toHaveLength(0);
  });
});
