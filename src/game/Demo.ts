import { CampaignSave, DemoManifest, DemoProgress, DemoTransferV1 } from '../types/game';
import { DEMO_STORAGE_NAMESPACE, getPlatformStorage } from './PlatformRuntime';
import { RELEASE_INFO } from './Release';

export { DEMO_STORAGE_NAMESPACE };
export const DEMO_PROGRESS_STORAGE_KEY = 'PROGRESS_V1';

export const DEMO_MANIFEST: DemoManifest = Object.freeze({
  version: 1,
  buildId: RELEASE_INFO.buildId,
  title: "IRON KESTREL '87 DEMO",
  storageNamespace: DEMO_STORAGE_NAMESPACE,
  initialDownloadBudgetBytes: 15 * 1024 * 1024,
  missionIds: ['m1_coastal_strike', 'm6_fleet_defence'],
  entries: [
    { missionId: 'm1_coastal_strike', strapline: 'Guided carrier qualification and coastal interception', artwork: '/assets/backgrounds/mission-1-dawn-showcase-v2.webp', accent: 'CYAN', loadout: 'FLEET_CAP' },
    { missionId: 'm6_fleet_defence', strapline: 'Replayable storm-bound Fleet Defence challenge', artwork: '/assets/backgrounds/mission-6-storm-showcase-v2.webp', accent: 'AMBER', loadout: 'FLEET_CAP' },
  ],
  commercialEditionUrl: '/commercial-edition.html',
} as DemoManifest);

export function createDemoProgress(): DemoProgress {
  return { version: 1, completedMissionIds: [], bestScores: {}, guidedTrainingCompleted: false, completedAt: null };
}

export function sanitiseDemoProgress(value: unknown): DemoProgress {
  if (!value || typeof value !== 'object' || (value as { version?: number }).version !== 1) return createDemoProgress();
  const source = value as Partial<DemoProgress>;
  const completedMissionIds = Array.isArray(source.completedMissionIds)
    ? [...new Set(source.completedMissionIds.filter((id): id is string => DEMO_MANIFEST.missionIds.includes(id as never)))]
    : [];
  const bestScores = source.bestScores && typeof source.bestScores === 'object'
    ? Object.fromEntries(Object.entries(source.bestScores).filter(([id, score]) => DEMO_MANIFEST.missionIds.includes(id as never) && Number.isFinite(score)).map(([id, score]) => [id, Math.max(0, Number(score))]))
    : {};
  return { version: 1, completedMissionIds, bestScores, guidedTrainingCompleted: Boolean(source.guidedTrainingCompleted), completedAt: typeof source.completedAt === 'string' ? source.completedAt : null };
}

export function loadDemoProgress(storage: Pick<Storage, 'getItem'> = getPlatformStorage()): DemoProgress {
  try { return sanitiseDemoProgress(JSON.parse(storage.getItem(DEMO_PROGRESS_STORAGE_KEY) || 'null')); }
  catch { return createDemoProgress(); }
}

export function persistDemoProgress(progress: DemoProgress, storage: Pick<Storage, 'setItem'> = getPlatformStorage()): void {
  try { storage.setItem(DEMO_PROGRESS_STORAGE_KEY, JSON.stringify(sanitiseDemoProgress(progress))); } catch { /* Demo progress must never interrupt play. */ }
}

export function recordDemoVictory(progress: DemoProgress, missionId: string, score: number, trainingCompleted = false): DemoProgress {
  if (!DEMO_MANIFEST.missionIds.includes(missionId as never)) return progress;
  return {
    version: 1,
    completedMissionIds: progress.completedMissionIds.includes(missionId) ? progress.completedMissionIds : [...progress.completedMissionIds, missionId],
    bestScores: { ...progress.bestScores, [missionId]: Math.max(progress.bestScores[missionId] || 0, score) },
    guidedTrainingCompleted: progress.guidedTrainingCompleted || trainingCompleted,
    completedAt: DEMO_MANIFEST.missionIds.every((id) => (progress.completedMissionIds.includes(id) || id === missionId)) ? progress.completedAt ?? new Date().toISOString() : null,
  };
}

export function exportDemoTransfer(progress: DemoProgress, exportedAt = new Date().toISOString()): string {
  const transfer: DemoTransferV1 = { format: 'IRON_KESTREL_DEMO_TRANSFER', version: 1, exportedAt, progress: sanitiseDemoProgress(progress) };
  return JSON.stringify(transfer, null, 2);
}

export function parseDemoTransfer(json: string): DemoTransferV1 | null {
  try {
    const source = JSON.parse(json) as Partial<DemoTransferV1>;
    if (source.format !== 'IRON_KESTREL_DEMO_TRANSFER' || source.version !== 1) return null;
    return { format: source.format, version: 1, exportedAt: typeof source.exportedAt === 'string' ? source.exportedAt : '', progress: sanitiseDemoProgress(source.progress) };
  } catch { return null; }
}

/** Merges only explicitly compatible evidence; it never unlocks missions or replaces paid settings. */
export function importCompatibleDemoProgress(save: CampaignSave, transfer: DemoTransferV1): CampaignSave {
  const progress = sanitiseDemoProgress(transfer.progress);
  const bestScores = { ...save.bestScores };
  for (const missionId of DEMO_MANIFEST.missionIds) {
    if (Number.isFinite(progress.bestScores[missionId])) bestScores[missionId] = Math.max(bestScores[missionId] || 0, progress.bestScores[missionId]);
  }
  return { ...save, bestScores, tutorialCompleted: save.tutorialCompleted || progress.guidedTrainingCompleted };
}
