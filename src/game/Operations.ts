import {
  AircraftCondition,
  DifficultyPreset,
  GameScoreBreakdown,
  LoadoutPreset,
  MedalTier,
  OperationBlueprint,
  OperationContentSet,
  OperationGenerationVersion,
  OperationHistoryEntryV1,
  OperationLength,
  OperationRecordV1,
  OperationRecordV2,
  OperationRunState,
  OperationRunStateV1,
  OperationsProfileV2,
  OperationSortieResultV1,
} from '../types/game';
import { generateOperation, generateOperationV3 } from './DynamicOperations';
import { DEFAULT_AIRCRAFT_CONDITION, sanitiseAircraftCondition, sanitiseLoadout } from './ServiceSystem';
import { getPlatformStorage } from './PlatformRuntime';

export const ACTIVE_OPERATION_STORAGE_KEY = 'STRIKE_VECTOR_ACTIVE_OPERATION_V2';
export const OPERATIONS_PROFILE_STORAGE_KEY = 'STRIKE_VECTOR_OPERATIONS_PROFILE_V2';
export const LEGACY_ACTIVE_OPERATION_STORAGE_KEY = 'STRIKE_VECTOR_ACTIVE_OPERATION_V1';
export const LEGACY_OPERATIONS_PROFILE_STORAGE_KEY = 'STRIKE_VECTOR_OPERATIONS_PROFILE_V1';
const MAX_OPERATION_RECORDS = 100;
const MAX_OPERATION_HISTORY = 50;

const DEFAULT_PROFILE: OperationsProfileV2 = { version: 2, records: [], history: [], abandonedRuns: 0 };

export function createOperationRun(blueprint: OperationBlueprint, condition: AircraftCondition = DEFAULT_AIRCRAFT_CONDITION, loadout: LoadoutPreset = 'FLEET_CAP'): OperationRunState {
  return { version: 2, blueprint, currentSortieIndex: 0, aircraftCondition: sanitiseAircraftCondition(condition), selectedLoadout: sanitiseLoadout(loadout), retries: 0, results: [], defendedAssets: { CARRIER: 100, FORWARD_BASE: 100 } };
}

export function loadActiveOperation(storage: Pick<Storage, 'getItem'> = getPlatformStorage()): OperationRunState | null {
  try {
    const parsed = JSON.parse(storage.getItem(ACTIVE_OPERATION_STORAGE_KEY) || storage.getItem(LEGACY_ACTIVE_OPERATION_STORAGE_KEY) || 'null');
    return sanitiseOperationRun(parsed);
  } catch {
    return null;
  }
}

export function persistActiveOperation(run: OperationRunState, storage: Pick<Storage, 'setItem'> = getPlatformStorage()): void {
  try { storage.setItem(ACTIVE_OPERATION_STORAGE_KEY, JSON.stringify(run)); } catch { /* Storage failure must not block play. */ }
}

export function clearActiveOperation(storage: Pick<Storage, 'removeItem'> = getPlatformStorage()): void {
  try {
    storage.removeItem(ACTIVE_OPERATION_STORAGE_KEY);
    storage.removeItem(LEGACY_ACTIVE_OPERATION_STORAGE_KEY);
  } catch { /* Ignore restricted storage. */ }
}

export function sanitiseOperationRun(value: unknown): OperationRunState | null {
  if (!value || typeof value !== 'object') return null;
  const source = value as Partial<OperationRunState> & Partial<OperationRunStateV1>;
  const savedBlueprint = source.blueprint as Partial<OperationBlueprint> | undefined;
  if ((source.version !== 1 && source.version !== 2) || !isGenerationVersion(savedBlueprint?.version) || !Number.isFinite(savedBlueprint.seed) || !isDifficulty(savedBlueprint.difficulty)) return null;
  const blueprint = regenerateBlueprint(savedBlueprint as OperationBlueprint);
  const currentSortieIndex = Math.max(0, Math.min(blueprint.sorties.length - 1, Math.round(Number(source.currentSortieIndex) || 0)));
  const results = Array.isArray(source.results) ? source.results.map(sanitiseResult).filter((result): result is OperationSortieResultV1 => result !== null).slice(0, currentSortieIndex) : [];
  return {
    version: 2,
    blueprint,
    currentSortieIndex,
    aircraftCondition: sanitiseAircraftCondition(source.aircraftCondition),
    selectedLoadout: sanitiseLoadout(source.selectedLoadout),
    retries: Math.max(0, Math.round(Number(source.retries) || 0)),
    results,
    defendedAssets: sanitiseDefendedAssets(source.version === 2 ? source.defendedAssets : undefined),
  };
}

export function resultFromScore(run: OperationRunState, score: GameScoreBreakdown, completedObjectiveIds: string[]): OperationSortieResultV1 {
  const sortie = run.blueprint.sorties[run.currentSortieIndex];
  return {
    sortieIndex: run.currentSortieIndex,
    archetype: sortie.archetype,
    score: Math.max(0, Math.round(score.finalScore)),
    simulationTicks: Math.max(0, Math.round(score.timeTakenSeconds * 60)),
    optionalObjectivesCompleted: completedObjectiveIds.filter((id) => id.endsWith('_optional')).length,
    landingGrade: score.carrierLandingGrade,
    pilotSurvived: score.pilotSurvived !== false,
    defendedAssetIntegrity: score.carrierIntegrity,
  };
}

export function advanceOperation(run: OperationRunState, result: OperationSortieResultV1, condition: AircraftCondition, loadout: LoadoutPreset): OperationRunState {
  const sortie = run.blueprint.sorties[run.currentSortieIndex];
  const defendedAssets = { ...run.defendedAssets };
  if (result.defendedAssetIntegrity !== null) defendedAssets[sortie.recoverySite] = Math.min(defendedAssets[sortie.recoverySite], result.defendedAssetIntegrity);
  return { ...run, currentSortieIndex: Math.min(run.blueprint.sorties.length, run.currentSortieIndex + 1), results: [...run.results, result], aircraftCondition: sanitiseAircraftCondition(condition), selectedLoadout: sanitiseLoadout(loadout), defendedAssets };
}

export function incrementOperationRetry(run: OperationRunState): OperationRunState {
  return { ...run, retries: run.retries + 1 };
}

export function medalCeiling(retries: number): MedalTier {
  return retries === 0 ? 'GOLD' : retries === 1 ? 'SILVER' : 'BRONZE';
}

export function awardOperationMedal(run: OperationRunState): MedalTier {
  const optionalTotal = run.results.reduce((sum, result) => sum + result.optionalObjectivesCompleted, 0);
  const safeRecoveries = run.results.every((result) => result.landingGrade === 'SAFE' || result.landingGrade === 'PERFECT');
  const assetsSafe = run.results.every((result) => result.defendedAssetIntegrity === null || result.defendedAssetIntegrity > 50);
  const pilotsSafe = run.results.every((result) => result.pilotSurvived);
  if (run.retries === 0 && optionalTotal >= run.blueprint.sorties.length && safeRecoveries && assetsSafe && pilotsSafe) return 'GOLD';
  if (run.retries <= 1 && optionalTotal >= Math.ceil(run.blueprint.sorties.length * 0.6)) return 'SILVER';
  return 'BRONZE';
}

export function createOperationRecord(run: OperationRunState): OperationRecordV2 {
  return {
    version: 2,
    generationVersion: run.blueprint.version,
    seed: run.blueprint.seed,
    seedCode: run.blueprint.seedCode,
    difficulty: run.blueprint.difficulty,
    medal: awardOperationMedal(run),
    totalScore: run.results.reduce((sum, result) => sum + result.score, 0),
    simulationTicks: run.results.reduce((sum, result) => sum + result.simulationTicks, 0),
    retries: run.retries,
    landingGrades: run.results.map((result) => result.landingGrade),
    sortieCount: normaliseSortieCount(run.blueprint.sorties.length),
    contentSet: contentSetForBlueprint(run.blueprint),
  };
}

export function loadOperationsProfile(storage: Pick<Storage, 'getItem'> = getPlatformStorage()): OperationsProfileV2 {
  try {
    const parsed = JSON.parse(storage.getItem(OPERATIONS_PROFILE_STORAGE_KEY) || storage.getItem(LEGACY_OPERATIONS_PROFILE_STORAGE_KEY) || 'null');
    return sanitiseOperationsProfile(parsed);
  } catch {
    return { ...DEFAULT_PROFILE, records: [], history: [] };
  }
}

export function sanitiseOperationsProfile(value: unknown): OperationsProfileV2 {
  if (!value || typeof value !== 'object') return { ...DEFAULT_PROFILE, records: [], history: [] };
  const parsed = value as { version?: number; records?: unknown[]; history?: unknown[]; abandonedRuns?: unknown };
  if ((parsed.version !== 1 && parsed.version !== 2) || !Array.isArray(parsed.records)) return { ...DEFAULT_PROFILE, records: [], history: [] };
  const records = parsed.records.map(sanitiseRecord).filter((record: OperationRecordV2 | null): record is OperationRecordV2 => record !== null).slice(-MAX_OPERATION_RECORDS);
  const history = parsed.version === 2 && Array.isArray(parsed.history) ? parsed.history.map(sanitiseHistoryEntry).filter((entry: OperationHistoryEntryV1 | null): entry is OperationHistoryEntryV1 => entry !== null).slice(-MAX_OPERATION_HISTORY) : [];
  return { version: 2, records, history, abandonedRuns: Math.max(0, Math.round(Number(parsed.abandonedRuns) || 0)) };
}

export function recordCompletedOperation(record: OperationRecordV2, storage: Pick<Storage, 'getItem' | 'setItem'> = getPlatformStorage()): OperationsProfileV2 {
  const profile = loadOperationsProfile(storage as Storage);
  const rank: Record<MedalTier, number> = { BRONZE: 1, SILVER: 2, GOLD: 3 };
  const matchingIndex = profile.records.findIndex((item) => item.seed === record.seed && item.difficulty === record.difficulty && (item.generationVersion ?? 1) === (record.generationVersion ?? 1) && item.sortieCount === record.sortieCount && item.contentSet === record.contentSet);
  let records = [...profile.records];
  if (matchingIndex < 0) records.push(record);
  else {
    const prior = records[matchingIndex];
    records[matchingIndex] = {
      ...record,
      medal: rank[prior.medal] > rank[record.medal] ? prior.medal : record.medal,
      totalScore: Math.max(prior.totalScore, record.totalScore),
      simulationTicks: Math.min(prior.simulationTicks, record.simulationTicks),
      retries: Math.min(prior.retries, record.retries),
      landingGrades: landingSequenceScore(prior.landingGrades) > landingSequenceScore(record.landingGrades) ? prior.landingGrades : record.landingGrades,
    };
  }
  records = records.slice(-MAX_OPERATION_RECORDS);
  const next = { ...profile, records };
  try { storage.setItem(OPERATIONS_PROFILE_STORAGE_KEY, JSON.stringify(next)); } catch { /* Ignore storage failure. */ }
  return next;
}

export function recordAbandonedOperation(storage: Pick<Storage, 'getItem' | 'setItem'> = getPlatformStorage()): OperationsProfileV2 {
  const profile = loadOperationsProfile(storage as Storage);
  const next = { ...profile, abandonedRuns: profile.abandonedRuns + 1 };
  try { storage.setItem(OPERATIONS_PROFILE_STORAGE_KEY, JSON.stringify(next)); } catch { /* Ignore storage failure. */ }
  return next;
}

export function recordOperationSelection(blueprint: OperationBlueprint, storage: Pick<Storage, 'getItem' | 'setItem'> = getPlatformStorage(), playedAt = new Date().toISOString()): OperationsProfileV2 {
  const profile = loadOperationsProfile(storage as Storage);
  const signature = operationSignature(blueprint.seed, blueprint.version, contentSetForBlueprint(blueprint), blueprint.sorties.length, blueprint.difficulty);
  const previous = profile.history.find((entry) => operationSignature(entry.seed, entry.generationVersion, entry.contentSet, entry.sortieCount, entry.difficulty) === signature);
  const entry: OperationHistoryEntryV1 = { seed: blueprint.seed, seedCode: blueprint.seedCode, generationVersion: blueprint.version, contentSet: contentSetForBlueprint(blueprint), sortieCount: normaliseSortieCount(blueprint.sorties.length), difficulty: blueprint.difficulty, codeName: blueprint.codeName, lastPlayedAt: playedAt, favourite: previous?.favourite ?? false };
  const history = [...profile.history.filter((item) => operationSignature(item.seed, item.generationVersion, item.contentSet, item.sortieCount, item.difficulty) !== signature), entry].slice(-MAX_OPERATION_HISTORY);
  const next = { ...profile, history };
  try { storage.setItem(OPERATIONS_PROFILE_STORAGE_KEY, JSON.stringify(next)); } catch { /* Ignore storage failure. */ }
  return next;
}

export function toggleOperationFavourite(entry: OperationHistoryEntryV1, storage: Pick<Storage, 'getItem' | 'setItem'> = getPlatformStorage()): OperationsProfileV2 {
  const profile = loadOperationsProfile(storage as Storage);
  const signature = operationSignature(entry.seed, entry.generationVersion, entry.contentSet, entry.sortieCount, entry.difficulty);
  const history = profile.history.map((item) => operationSignature(item.seed, item.generationVersion, item.contentSet, item.sortieCount, item.difficulty) === signature ? { ...item, favourite: !item.favourite } : item);
  const next = { ...profile, history };
  try { storage.setItem(OPERATIONS_PROFILE_STORAGE_KEY, JSON.stringify(next)); } catch { /* Ignore storage failure. */ }
  return next;
}

function sanitiseResult(value: unknown): OperationSortieResultV1 | null {
  if (!value || typeof value !== 'object') return null;
  const source = value as Partial<OperationSortieResultV1>;
  if (!Number.isFinite(source.sortieIndex) || !isArchetype(source.archetype)) return null;
  return {
    sortieIndex: Math.max(0, Math.min(4, Math.round(Number(source.sortieIndex)))),
    archetype: source.archetype,
    score: Math.max(0, Math.round(Number(source.score) || 0)),
    simulationTicks: Math.max(0, Math.round(Number(source.simulationTicks) || 0)),
    optionalObjectivesCompleted: Math.max(0, Math.round(Number(source.optionalObjectivesCompleted) || 0)),
    landingGrade: source.landingGrade || null,
    pilotSurvived: source.pilotSurvived !== false,
    defendedAssetIntegrity: source.defendedAssetIntegrity === null ? null : Math.max(0, Math.min(100, Number(source.defendedAssetIntegrity) || 0)),
  };
}

function sanitiseRecord(value: unknown): OperationRecordV2 | null {
  if (!value || typeof value !== 'object') return null;
  const source = value as Partial<OperationRecordV2> & Partial<OperationRecordV1>;
  if ((source.version !== 1 && source.version !== 2) || !Number.isFinite(source.seed) || !isDifficulty(source.difficulty) || !['BRONZE', 'SILVER', 'GOLD'].includes(source.medal || '')) return null;
  const generationVersion = isGenerationVersion(source.generationVersion) ? source.generationVersion : 1;
  const sortieCount = source.version === 2 ? normaliseSortieCount(source.sortieCount) : 3;
  return { version: 2, generationVersion, seed: Number(source.seed) >>> 0, seedCode: String(source.seedCode || ''), difficulty: source.difficulty, medal: source.medal as MedalTier, totalScore: Math.max(0, Math.round(Number(source.totalScore) || 0)), simulationTicks: Math.max(0, Math.round(Number(source.simulationTicks) || 0)), retries: Math.max(0, Math.round(Number(source.retries) || 0)), landingGrades: Array.isArray(source.landingGrades) ? source.landingGrades.slice(0, sortieCount) : [], sortieCount, contentSet: source.version === 2 && isContentSet(source.contentSet) ? source.contentSet : generationVersion === 2 ? 'NORWEGIAN_SEA' : 'NORTH_ATLANTIC' };
}

function isGenerationVersion(value: unknown): value is OperationGenerationVersion {
  return value === 1 || value === 2 || value === 3;
}

function isDifficulty(value: unknown): value is DifficultyPreset {
  return value === 'ARCADE' || value === 'PILOT' || value === 'VETERAN';
}

function isArchetype(value: unknown): value is OperationSortieResultV1['archetype'] {
  return value === 'FLEET_CAP' || value === 'SEAD' || value === 'ARMOURED_INTERDICTION' || value === 'PILOT_RESCUE' || value === 'FARP_DEFENCE' || value === 'DEEP_STRIKE';
}

function landingSequenceScore(grades: OperationRecordV2['landingGrades']): number {
  const scores: Record<string, number> = { PERFECT: 3, SAFE: 2, HARD: 1, FAILED: 0 };
  return grades.reduce((total, grade) => total + (grade ? scores[grade] || 0 : 0), 0);
}

function regenerateBlueprint(saved: OperationBlueprint): OperationBlueprint {
  if (saved.version === 2) return generateOperation(Number(saved.seed), saved.difficulty, 2);
  if (saved.version === 3) return generateOperationV3(Number(saved.seed), saved.difficulty, isContentSet(saved.contentSet) ? saved.contentSet : 'NORTH_ATLANTIC', normaliseSortieCount(saved.sortieCount));
  return generateOperation(Number(saved.seed), saved.difficulty);
}

function sanitiseDefendedAssets(value: unknown): { CARRIER: number; FORWARD_BASE: number } {
  const source = value && typeof value === 'object' ? value as Partial<{ CARRIER: number; FORWARD_BASE: number }> : {};
  const integrity = (candidate: unknown) => Number.isFinite(Number(candidate)) ? Math.max(0, Math.min(100, Number(candidate))) : 100;
  return { CARRIER: integrity(source.CARRIER), FORWARD_BASE: integrity(source.FORWARD_BASE) };
}

function contentSetForBlueprint(blueprint: OperationBlueprint): OperationContentSet {
  return blueprint.version === 2 || (blueprint.version === 3 && blueprint.contentSet === 'NORWEGIAN_SEA') ? 'NORWEGIAN_SEA' : 'NORTH_ATLANTIC';
}

function normaliseSortieCount(value: unknown): OperationLength {
  return Number(value) === 5 ? 5 : 3;
}

function isContentSet(value: unknown): value is OperationContentSet {
  return value === 'NORTH_ATLANTIC' || value === 'NORWEGIAN_SEA';
}

function sanitiseHistoryEntry(value: unknown): OperationHistoryEntryV1 | null {
  if (!value || typeof value !== 'object') return null;
  const source = value as Partial<OperationHistoryEntryV1>;
  if (!Number.isFinite(source.seed) || !isGenerationVersion(source.generationVersion) || !isContentSet(source.contentSet) || !isDifficulty(source.difficulty)) return null;
  return { seed: Number(source.seed) >>> 0, seedCode: String(source.seedCode || ''), generationVersion: source.generationVersion, contentSet: source.contentSet, sortieCount: normaliseSortieCount(source.sortieCount), difficulty: source.difficulty, codeName: String(source.codeName || 'CLASSIFIED'), lastPlayedAt: typeof source.lastPlayedAt === 'string' ? source.lastPlayedAt : '', favourite: Boolean(source.favourite) };
}

function operationSignature(seed: number, version: OperationGenerationVersion, contentSet: OperationContentSet, sortieCount: number, difficulty: DifficultyPreset): string {
  return `${seed >>> 0}:${version}:${contentSet}:${sortieCount}:${difficulty}`;
}
