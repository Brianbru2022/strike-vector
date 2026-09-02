import { CampaignSaveV4, OperationRunState, OperationsProfileV2, ShowcaseProgress } from '../types/game';
import { CAMPAIGN_STORAGE_KEY, loadCampaign, sanitiseCampaignSave } from './Campaign';
import { BEST_SCORE_STORAGE_KEY } from './CombatFlow';
import { ACTIVE_OPERATION_STORAGE_KEY, loadActiveOperation, loadOperationsProfile, OPERATIONS_PROFILE_STORAGE_KEY, sanitiseOperationRun, sanitiseOperationsProfile } from './Operations';
import { RELEASE_INFO } from './Release';
import { SHOWCASE_STORAGE_KEY, loadShowcaseProgress, sanitiseShowcaseProgress } from './Showcase';
import { getPlatformStorage } from './PlatformRuntime';

export const SAVE_ARCHIVE_FORMAT = 'IRON_KESTREL_SAVE_ARCHIVE';
export const SAVE_ARCHIVE_VERSION = 1;
export const SAVE_IMPORT_BACKUP_STORAGE_KEY = 'IRON_KESTREL_SAVE_IMPORT_BACKUP_V1';
export const MAX_SAVE_ARCHIVE_BYTES = 1024 * 1024;

export interface SaveArchiveDataV1 {
  campaign: CampaignSaveV4;
  activeOperation: OperationRunState | null;
  operationsProfile: OperationsProfileV2;
  showcase: ShowcaseProgress;
  bestScore: number;
}

export interface SaveArchiveV1 {
  format: typeof SAVE_ARCHIVE_FORMAT;
  version: typeof SAVE_ARCHIVE_VERSION;
  exportedAt: string;
  build: { version: string; buildId: string };
  data: SaveArchiveDataV1;
  checksum: string;
}

export interface SaveArchivePreview {
  exportedAt: string;
  buildVersion: string;
  completedMissions: number;
  operationRecords: number;
  activeDeployment: boolean;
  showcaseMissions: number;
  bestScore: number;
}

export type SaveArchiveParseResult =
  | { ok: true; archive: SaveArchiveV1; preview: SaveArchivePreview }
  | { ok: false; error: string };

type SaveStorage = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

export function createSaveArchive(storage: Pick<Storage, 'getItem'> = getPlatformStorage(), exportedAt = new Date().toISOString()): SaveArchiveV1 {
  const data: SaveArchiveDataV1 = {
    campaign: loadCampaign(storage),
    activeOperation: loadActiveOperation(storage),
    operationsProfile: loadOperationsProfile(storage),
    showcase: loadShowcaseProgress(storage),
    bestScore: sanitiseBestScore(storage.getItem(BEST_SCORE_STORAGE_KEY)),
  };
  const unsigned = {
    format: SAVE_ARCHIVE_FORMAT,
    version: SAVE_ARCHIVE_VERSION,
    exportedAt,
    build: { version: RELEASE_INFO.version, buildId: RELEASE_INFO.buildId },
    data,
  } as const;
  return { ...unsigned, checksum: checksumFor(unsigned) };
}

export function exportSaveArchiveJson(archive: SaveArchiveV1): string {
  return JSON.stringify(archive, null, 2);
}

export function parseSaveArchiveJson(json: string): SaveArchiveParseResult {
  if (new TextEncoder().encode(json).byteLength > MAX_SAVE_ARCHIVE_BYTES) return { ok: false, error: 'The save file is larger than the supported 1 MB limit.' };
  let parsed: unknown;
  try { parsed = JSON.parse(json); } catch { return { ok: false, error: 'The selected file is not valid JSON.' }; }
  if (!parsed || typeof parsed !== 'object') return { ok: false, error: 'The selected file is not an Iron Kestrel save archive.' };
  const source = parsed as Partial<SaveArchiveV1>;
  if (source.format !== SAVE_ARCHIVE_FORMAT || source.version !== SAVE_ARCHIVE_VERSION) return { ok: false, error: 'This save format or version is not supported.' };
  if (typeof source.exportedAt !== 'string' || !Number.isFinite(Date.parse(source.exportedAt))) return { ok: false, error: 'The save archive has an invalid export date.' };
  if (!source.build || typeof source.build.version !== 'string' || typeof source.build.buildId !== 'string') return { ok: false, error: 'The save archive has invalid build information.' };
  if (!source.data || typeof source.data !== 'object') return { ok: false, error: 'The save archive does not contain progression data.' };
  if (!source.data.campaign || ![1, 2, 3, 4].includes((source.data.campaign as { version?: number }).version ?? 0)) return { ok: false, error: 'The campaign save is missing or unsupported.' };
  if (!source.data.operationsProfile || ![1, 2].includes((source.data.operationsProfile as { version?: number }).version ?? 0) || !Array.isArray((source.data.operationsProfile as { records?: unknown[] }).records)) return { ok: false, error: 'The operations profile is missing or unsupported.' };
  if (!source.data.showcase || (source.data.showcase as { version?: number }).version !== 1) return { ok: false, error: 'The showcase save is missing or unsupported.' };
  if (source.data.activeOperation !== null && !sanitiseOperationRun(source.data.activeOperation)) return { ok: false, error: 'The active deployment is corrupt or unsupported.' };
  if (!Number.isFinite(Number(source.data.bestScore)) || Number(source.data.bestScore) < 0) return { ok: false, error: 'The top score is invalid.' };
  if (typeof source.checksum !== 'string') return { ok: false, error: 'The save archive checksum is missing.' };
  const unsigned = { format: source.format, version: source.version, exportedAt: source.exportedAt, build: source.build, data: source.data };
  if (checksumFor(unsigned) !== source.checksum) return { ok: false, error: 'The save archive checksum does not match. The file may be incomplete or modified.' };

  const archive = normaliseArchive(source as SaveArchiveV1);
  return { ok: true, archive, preview: previewSaveArchive(archive) };
}

export function previewSaveArchive(archive: SaveArchiveV1): SaveArchivePreview {
  return {
    exportedAt: archive.exportedAt,
    buildVersion: archive.build.version,
    completedMissions: archive.data.campaign.completedMissionIds.length,
    operationRecords: archive.data.operationsProfile.records.length,
    activeDeployment: archive.data.activeOperation !== null,
    showcaseMissions: archive.data.showcase.completedMissionIds.length,
    bestScore: archive.data.bestScore,
  };
}

export function loadImportBackup(storage: Pick<Storage, 'getItem'> = getPlatformStorage()): SaveArchiveParseResult | null {
  const backup = storage.getItem(SAVE_IMPORT_BACKUP_STORAGE_KEY);
  return backup ? parseSaveArchiveJson(backup) : null;
}

export function applySaveArchive(archive: SaveArchiveV1, storage: SaveStorage = getPlatformStorage()): { ok: true } | { ok: false; error: string } {
  const validation = parseSaveArchiveJson(exportSaveArchiveJson(archive));
  if (!validation.ok) return validation;
  const primaryKeys = [CAMPAIGN_STORAGE_KEY, ACTIVE_OPERATION_STORAGE_KEY, OPERATIONS_PROFILE_STORAGE_KEY, SHOWCASE_STORAGE_KEY, BEST_SCORE_STORAGE_KEY] as const;
  const previous = new Map(primaryKeys.map((key) => [key, storage.getItem(key)]));
  const backup = exportSaveArchiveJson(createSaveArchive(storage));
  try {
    storage.setItem(SAVE_IMPORT_BACKUP_STORAGE_KEY, backup);
    storage.setItem(CAMPAIGN_STORAGE_KEY, JSON.stringify(validation.archive.data.campaign));
    if (validation.archive.data.activeOperation) storage.setItem(ACTIVE_OPERATION_STORAGE_KEY, JSON.stringify(validation.archive.data.activeOperation));
    else storage.removeItem(ACTIVE_OPERATION_STORAGE_KEY);
    storage.setItem(OPERATIONS_PROFILE_STORAGE_KEY, JSON.stringify(validation.archive.data.operationsProfile));
    storage.setItem(SHOWCASE_STORAGE_KEY, JSON.stringify(validation.archive.data.showcase));
    storage.setItem(BEST_SCORE_STORAGE_KEY, String(validation.archive.data.bestScore));
    return { ok: true };
  } catch {
    for (const [key, value] of previous) {
      try { if (value === null) storage.removeItem(key); else storage.setItem(key, value); } catch { /* Best-effort rollback after storage failure. */ }
    }
    return { ok: false, error: 'The browser could not replace the current save. Existing progress was restored where possible.' };
  }
}

function normaliseArchive(source: SaveArchiveV1): SaveArchiveV1 {
  const data: SaveArchiveDataV1 = {
    campaign: sanitiseCampaignSave(source.data.campaign),
    activeOperation: source.data.activeOperation ? sanitiseOperationRun(source.data.activeOperation) : null,
    operationsProfile: sanitiseOperationsProfile(source.data.operationsProfile),
    showcase: sanitiseShowcaseProgress(source.data.showcase),
    bestScore: sanitiseBestScore(source.data.bestScore),
  };
  const unsigned = { format: SAVE_ARCHIVE_FORMAT, version: SAVE_ARCHIVE_VERSION, exportedAt: source.exportedAt, build: { version: source.build.version, buildId: source.build.buildId }, data } as const;
  return { ...unsigned, checksum: checksumFor(unsigned) };
}

function sanitiseBestScore(value: unknown): number {
  return Math.max(0, Math.min(Number.MAX_SAFE_INTEGER, Math.floor(Number(value) || 0)));
}

function checksumFor(value: unknown): string {
  const text = canonicalJson(value);
  let hash = 0x811c9dc5;
  for (let index = 0; index < text.length; index++) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(16).padStart(8, '0');
}

function canonicalJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(',')}]`;
  if (value && typeof value === 'object') return `{${Object.keys(value as Record<string, unknown>).sort().map((key) => `${JSON.stringify(key)}:${canonicalJson((value as Record<string, unknown>)[key])}`).join(',')}}`;
  return JSON.stringify(value);
}
