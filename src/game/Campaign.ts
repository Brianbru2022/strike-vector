import { AccessibilitySettings, CampaignChapterId, CampaignChapterProgress, CampaignSave, CampaignSaveV4, DifficultyPreset, PilotRecordV1, RenderQualityPreference } from '../types/game';
import { DEFAULT_AIRCRAFT_CONDITION, sanitiseAircraftCondition, sanitiseLoadout } from './ServiceSystem';
import { DEFAULT_INPUT_BINDINGS, sanitiseInputBindings } from './inputBindings';
import { CAMPAIGN_CHAPTERS, createChapterProgress, isChapterUnlocked } from './CampaignChapters';
import { getPlatformStorage } from './PlatformRuntime';

// These legacy keys are intentionally stable across the Iron Kestrel '87 rename.
// Changing them would make existing campaign progress appear to be lost.
export const CAMPAIGN_STORAGE_KEY = 'STRIKE_VECTOR_HARRIER_87_CAMPAIGN_V4';
export const V3_CAMPAIGN_STORAGE_KEY = 'STRIKE_VECTOR_HARRIER_87_CAMPAIGN_V3';
export const V2_CAMPAIGN_STORAGE_KEY = 'STRIKE_VECTOR_HARRIER_87_CAMPAIGN_V2';
export const LEGACY_CAMPAIGN_STORAGE_KEY = 'STRIKE_VECTOR_HARRIER_87_CAMPAIGN_V1';

export const DEFAULT_ACCESSIBILITY: AccessibilitySettings = {
  radioCaptions: true,
  highContrastHud: false,
  hudContrast: 'STANDARD',
  textContrast: 'STANDARD',
  reducedEffects: false,
  screenShake: 1,
  hudScale: 'AUTO',
  combatZoom: 'OFF',
};

const SECTOR_BLUEPRINT = [
  { id: 'carrier', name: 'NATO Carrier Group', missionIds: ['m1_coastal_strike', 'm2_valley_run'] },
  { id: 'faroe', name: 'Faroe Approaches', missionIds: ['m3_convoy_hunter', 'm4_night_raid'] },
  { id: 'skeld', name: 'Skeld Forward Strip', missionIds: ['m5_pilot_rescue', 'm6_fleet_defence'] },
  { id: 'janus', name: 'Janus Island', missionIds: ['m7_bridge_strike', 'm8_airbase_raid'] },
  { id: 'bastion', name: 'Bastion Command Sector', missionIds: ['m9_forward_defence', 'm10_hq_assault'] },
];

export function createDefaultCampaignSave(): CampaignSaveV4 {
  const completedMissionIds: string[] = [];
  const bestScores: Record<string, number> = {};
  return {
    version: 4,
    unlockedMission: 0,
    completedMissionIds,
    bestScores,
    campaignFlags: [],
    sectors: SECTOR_BLUEPRINT.map((sector, index) => ({
      ...sector,
      secured: false,
      forwardBase: index === 0,
    })),
    difficulty: 'PILOT',
    renderQuality: 'AUTO',
    controlScale: 1,
    controlOpacity: 0.82,
    leftHanded: false,
    touchSafeInset: 12,
    touchLift: 0,
    touchClearView: true,
    aircraftCondition: { ...DEFAULT_AIRCRAFT_CONDITION, subsystems: { ...DEFAULT_AIRCRAFT_CONDITION.subsystems } },
    selectedLoadout: 'FLEET_CAP',
    tutorialCompleted: false,
    tutorialDismissed: false,
    inputBindings: sanitiseInputBindings(DEFAULT_INPUT_BINDINGS),
    accessibility: { ...DEFAULT_ACCESSIBILITY },
    diagnosticsEnabled: true,
    activeChapter: 'NORTHERN_LANCE',
    chapterProgress: {
      NORTHERN_LANCE: createChapterProgress('NORTHERN_LANCE', completedMissionIds, bestScores),
      NORWEGIAN_SEA: createChapterProgress('NORWEGIAN_SEA', completedMissionIds, bestScores),
    },
    pilotRecord: { sorties: 0, victories: 0, ejections: 0, losses: 0 },
  };
}

export function sanitiseCampaignSave(value: unknown): CampaignSaveV4 {
  const fallback = createDefaultCampaignSave();
  if (!value || typeof value !== 'object') return fallback;
  const version = (value as { version?: number }).version;
  if (version !== 1 && version !== 2 && version !== 3 && version !== 4) return fallback;
  const saved = value as Partial<Omit<CampaignSaveV4, 'version'>> & { version?: number };
  const difficulty: DifficultyPreset = ['ARCADE', 'PILOT', 'VETERAN'].includes(saved.difficulty || '')
    ? saved.difficulty as DifficultyPreset
    : fallback.difficulty;
  const renderQuality: RenderQualityPreference = ['AUTO', 'LOW', 'MEDIUM', 'HIGH'].includes(saved.renderQuality || '')
    ? saved.renderQuality as RenderQualityPreference
    : fallback.renderQuality;
  const completedMissionIds = Array.isArray(saved.completedMissionIds) ? saved.completedMissionIds.filter((id): id is string => typeof id === 'string') : [];
  const bestScores = sanitiseScores(saved.bestScores);
  const northernProgress = sanitiseChapterProgress(saved.chapterProgress?.NORTHERN_LANCE, 'NORTHERN_LANCE', completedMissionIds, bestScores);
  const norwegianProgress = sanitiseChapterProgress(saved.chapterProgress?.NORWEGIAN_SEA, 'NORWEGIAN_SEA', completedMissionIds, bestScores);
  const requestedChapter = saved.activeChapter === 'NORWEGIAN_SEA' ? 'NORWEGIAN_SEA' : 'NORTHERN_LANCE';
  const activeChapter = requestedChapter === 'NORWEGIAN_SEA' && !norwegianProgress.unlocked ? 'NORTHERN_LANCE' : requestedChapter;
  return {
    ...fallback,
    ...saved,
    version: 4,
    difficulty,
    renderQuality,
    completedMissionIds,
    campaignFlags: Array.isArray(saved.campaignFlags) ? saved.campaignFlags.filter((flag): flag is string => typeof flag === 'string') : [],
    bestScores,
    sectors: fallback.sectors.map((sector) => ({
      ...sector,
      ...(Array.isArray(saved.sectors) ? saved.sectors.find((item) => item?.id === sector.id) : undefined),
    })),
    unlockedMission: Math.max(0, Math.min(9, Number(saved.unlockedMission) || 0)),
    controlScale: Math.max(0.8, Math.min(1.3, Number(saved.controlScale) || 1)),
    controlOpacity: Math.max(0.45, Math.min(1, Number(saved.controlOpacity) || 0.82)),
    leftHanded: Boolean(saved.leftHanded),
    touchSafeInset: Math.max(8, Math.min(40, Number(saved.touchSafeInset) || 12)),
    touchLift: Math.max(0, Math.min(72, Number(saved.touchLift) || 0)),
    touchClearView: saved.touchClearView !== false,
    aircraftCondition: sanitiseAircraftCondition(version >= 2 ? saved.aircraftCondition : fallback.aircraftCondition),
    selectedLoadout: sanitiseLoadout(version >= 2 ? saved.selectedLoadout : fallback.selectedLoadout),
    tutorialCompleted: version >= 3 ? Boolean(saved.tutorialCompleted) : false,
    tutorialDismissed: version >= 3 ? Boolean(saved.tutorialDismissed) : false,
    inputBindings: sanitiseInputBindings(version >= 3 ? saved.inputBindings : fallback.inputBindings),
    accessibility: sanitiseAccessibility(version >= 3 ? saved.accessibility : fallback.accessibility),
    diagnosticsEnabled: version >= 3 ? saved.diagnosticsEnabled !== false : true,
    activeChapter,
    chapterProgress: { NORTHERN_LANCE: northernProgress, NORWEGIAN_SEA: norwegianProgress },
    pilotRecord: sanitisePilotRecord(version === 4 ? saved.pilotRecord : undefined),
  };
}

function sanitiseScores(value: unknown): Record<string, number> {
  if (!value || typeof value !== 'object') return {};
  return Object.fromEntries(Object.entries(value).filter((entry): entry is [string, number] => typeof entry[1] === 'number' && Number.isFinite(entry[1]) && entry[1] >= 0));
}

function sanitiseChapterProgress(value: unknown, chapterId: CampaignChapterId, completedMissionIds: string[], bestScores: Record<string, number>): CampaignChapterProgress {
  const derived = createChapterProgress(chapterId, completedMissionIds, bestScores);
  if (!value || typeof value !== 'object') return derived;
  const source = value as Partial<CampaignChapterProgress>;
  const chapterMissionIds = new Set(CAMPAIGN_CHAPTERS[chapterId].missionIds);
  const completed = Array.isArray(source.completedMissionIds)
    ? source.completedMissionIds.filter((missionId): missionId is string => typeof missionId === 'string' && chapterMissionIds.has(missionId))
    : derived.completedMissionIds;
  const mergedCompleted = [...new Set([...derived.completedMissionIds, ...completed])];
  const chapterScores = Object.fromEntries(Object.entries(sanitiseScores(source.bestScores)).filter(([missionId]) => chapterMissionIds.has(missionId)));
  return {
    chapterId,
    unlocked: derived.unlocked,
    completedMissionIds: mergedCompleted,
    bestScores: { ...derived.bestScores, ...chapterScores },
    completedAt: typeof source.completedAt === 'string' ? source.completedAt : null,
  };
}

function sanitisePilotRecord(value: unknown): PilotRecordV1 {
  const source = value && typeof value === 'object' ? value as Partial<PilotRecordV1> : {};
  const count = (candidate: unknown) => Math.max(0, Math.floor(Number(candidate) || 0));
  return { sorties: count(source.sorties), victories: count(source.victories), ejections: count(source.ejections), losses: count(source.losses) };
}

function sanitiseAccessibility(value: unknown): AccessibilitySettings {
  const source = value && typeof value === 'object' ? value as Partial<AccessibilitySettings> : {};
  const hudContrast = source.hudContrast === 'HIGH' || source.highContrastHud ? 'HIGH' : 'STANDARD';
  return {
    radioCaptions: source.radioCaptions !== false,
    highContrastHud: hudContrast === 'HIGH',
    hudContrast,
    textContrast: source.textContrast === 'HIGH' ? 'HIGH' : 'STANDARD',
    reducedEffects: Boolean(source.reducedEffects),
    screenShake: Math.max(0, Math.min(1, Number(source.screenShake ?? 1))),
    hudScale: ['AUTO', 'COMPACT', 'STANDARD', 'LARGE'].includes(source.hudScale || '') ? source.hudScale! : 'AUTO',
    combatZoom: source.combatZoom === 'SMART' ? 'SMART' : 'OFF',
  };
}

export function loadCampaign(storage: Pick<Storage, 'getItem'> = getPlatformStorage()): CampaignSaveV4 {
  try {
    const current = storage.getItem(CAMPAIGN_STORAGE_KEY);
    const v3 = storage.getItem(V3_CAMPAIGN_STORAGE_KEY);
    const v2 = storage.getItem(V2_CAMPAIGN_STORAGE_KEY);
    const legacy = storage.getItem(LEGACY_CAMPAIGN_STORAGE_KEY);
    return sanitiseCampaignSave(JSON.parse(current || v3 || v2 || legacy || 'null'));
  } catch {
    return createDefaultCampaignSave();
  }
}

export function persistCampaign(save: CampaignSave, storage: Pick<Storage, 'setItem'> = getPlatformStorage()): void {
  try {
    storage.setItem(CAMPAIGN_STORAGE_KEY, JSON.stringify(save));
  } catch {
    // Private browsing or a full storage quota must not block play.
  }
}

export function recordMissionVictory(save: CampaignSave, missionId: string, missionIndex: number, score: number): CampaignSave {
  const completedMissionIds = save.completedMissionIds.includes(missionId)
    ? save.completedMissionIds
    : [...save.completedMissionIds, missionId];
  const unlockedMission = Math.max(save.unlockedMission, Math.min(9, missionIndex + 1));
  const milestoneFlag = missionId === 'm1_coastal_strike'
    ? 'carrier_qualified'
    : missionId === 'm2_valley_run'
      ? 'fjord_air_defences_suppressed'
      : missionId === 'm3_convoy_hunter'
        ? 'skeld_farp_secured'
        : missionId === 'm4_night_raid'
          ? 'armoured_route_broken'
          : missionId === 'm5_pilot_rescue'
            ? 'viper_one_rescued'
            : missionId === 'm6_fleet_defence'
              ? 'carrier_group_defended'
              : null;
  const campaignFlags = milestoneFlag && !save.campaignFlags.includes(milestoneFlag)
    ? [...save.campaignFlags, milestoneFlag]
    : save.campaignFlags;
  const sectors = save.sectors.map((sector) => {
    const secured = sector.missionIds.every((id) => completedMissionIds.includes(id));
    const capturedInVerticalSlice = missionId === 'm3_convoy_hunter' && sector.id === 'faroe';
    return { ...sector, secured, forwardBase: sector.forwardBase || secured || capturedInVerticalSlice };
  });
  const bestScores = { ...save.bestScores, [missionId]: Math.max(save.bestScores[missionId] || 0, score) };
  const chapterId: CampaignChapterId = CAMPAIGN_CHAPTERS.NORWEGIAN_SEA.missionIds.includes(missionId) ? 'NORWEGIAN_SEA' : 'NORTHERN_LANCE';
  const previousProgress = save.chapterProgress[chapterId];
  const chapterCompleted = previousProgress.completedMissionIds.includes(missionId)
    ? previousProgress.completedMissionIds
    : [...previousProgress.completedMissionIds, missionId];
  const chapterProgress: CampaignChapterProgress = {
    ...previousProgress,
    completedMissionIds: chapterCompleted,
    bestScores: { ...previousProgress.bestScores, [missionId]: bestScores[missionId] },
    completedAt: chapterCompleted.length === CAMPAIGN_CHAPTERS[chapterId].missionIds.length ? previousProgress.completedAt ?? new Date().toISOString() : null,
  };
  const norwegianUnlocked = isChapterUnlocked('NORWEGIAN_SEA', completedMissionIds);
  const nextChapterProgress = {
    ...save.chapterProgress,
    [chapterId]: chapterProgress,
  };
  nextChapterProgress.NORWEGIAN_SEA = {
    ...nextChapterProgress.NORWEGIAN_SEA,
    unlocked: norwegianUnlocked,
  };
  return {
    ...save,
    completedMissionIds,
    campaignFlags,
    unlockedMission,
    sectors,
    bestScores,
    chapterProgress: nextChapterProgress,
  };
}

export function setActiveCampaignChapter(save: CampaignSave, chapterId: CampaignChapterId): CampaignSave {
  if (!save.chapterProgress[chapterId].unlocked) return save;
  return { ...save, activeChapter: chapterId };
}

export function recordPilotSortie(save: CampaignSave, victory: boolean, pilotSurvived: boolean | null): CampaignSave {
  return {
    ...save,
    pilotRecord: {
      sorties: save.pilotRecord.sorties + 1,
      victories: save.pilotRecord.victories + (victory ? 1 : 0),
      ejections: save.pilotRecord.ejections + (!victory && pilotSurvived === true ? 1 : 0),
      losses: save.pilotRecord.losses + (pilotSurvived === false ? 1 : 0),
    },
  };
}
