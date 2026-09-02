import { ShowcaseManifest, ShowcaseProgress } from '../types/game';
import { getPlatformStorage } from './PlatformRuntime';

// Retained for compatibility with showcase progress created before the rename.
export const SHOWCASE_STORAGE_KEY = 'STRIKE_VECTOR_HARRIER_87_SHOWCASE_V1';

export const SHOWCASE_MANIFEST: ShowcaseManifest = {
  version: 1,
  title: 'NORTH ATLANTIC SHOWCASE',
  missionIds: ['m1_coastal_strike', 'm6_fleet_defence', 'm10_hq_assault'],
  entries: [
    { missionId: 'm1_coastal_strike', strapline: 'Carrier qualification at first light', artwork: '/assets/backgrounds/mission-1-dawn-showcase-v2.webp', accent: 'CYAN', loadout: 'FLEET_CAP' },
    { missionId: 'm6_fleet_defence', strapline: 'Defend the fleet inside a North Atlantic storm', artwork: '/assets/backgrounds/mission-6-storm-showcase-v2.webp', accent: 'AMBER', loadout: 'FLEET_CAP' },
    { missionId: 'm10_hq_assault', strapline: 'Break the Bastion defence layers and withdraw', artwork: '/assets/backgrounds/mission-10-bastion-hero-v3.webp', accent: 'RED', loadout: 'STRIKE' },
  ],
};

export function createShowcaseProgress(): ShowcaseProgress {
  return { version: 1, completedMissionIds: [], bestScores: {}, completedAt: null };
}

export function sanitiseShowcaseProgress(value: unknown): ShowcaseProgress {
  const fallback = createShowcaseProgress();
  if (!value || typeof value !== 'object' || (value as { version?: number }).version !== 1) return fallback;
  const source = value as Partial<ShowcaseProgress>;
  const completedMissionIds = Array.isArray(source.completedMissionIds)
    ? source.completedMissionIds.filter((id): id is string => SHOWCASE_MANIFEST.missionIds.includes(id as never))
    : [];
  const bestScores = source.bestScores && typeof source.bestScores === 'object'
    ? Object.fromEntries(Object.entries(source.bestScores).filter(([id, score]) => SHOWCASE_MANIFEST.missionIds.includes(id as never) && Number.isFinite(score)).map(([id, score]) => [id, Math.max(0, Number(score))]))
    : {};
  return {
    version: 1,
    completedMissionIds: [...new Set(completedMissionIds)],
    bestScores,
    completedAt: typeof source.completedAt === 'string' ? source.completedAt : null,
  };
}

export function loadShowcaseProgress(storage: Pick<Storage, 'getItem'> = getPlatformStorage()): ShowcaseProgress {
  try {
    return sanitiseShowcaseProgress(JSON.parse(storage.getItem(SHOWCASE_STORAGE_KEY) || 'null'));
  } catch {
    return createShowcaseProgress();
  }
}

export function persistShowcaseProgress(progress: ShowcaseProgress, storage: Pick<Storage, 'setItem'> = getPlatformStorage()): void {
  try {
    storage.setItem(SHOWCASE_STORAGE_KEY, JSON.stringify(progress));
  } catch {
    // Showcase persistence must never prevent play.
  }
}

export function recordShowcaseVictory(progress: ShowcaseProgress, missionId: string, score: number): ShowcaseProgress {
  const completedMissionIds = progress.completedMissionIds.includes(missionId)
    ? progress.completedMissionIds
    : [...progress.completedMissionIds, missionId];
  const complete = SHOWCASE_MANIFEST.missionIds.every((id) => completedMissionIds.includes(id));
  return {
    version: 1,
    completedMissionIds,
    bestScores: { ...progress.bestScores, [missionId]: Math.max(progress.bestScores[missionId] || 0, score) },
    completedAt: complete ? progress.completedAt ?? new Date().toISOString() : null,
  };
}
