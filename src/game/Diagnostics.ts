import { DiagnosticSession, DiagnosticSessionV1, DiagnosticSessionV2, DiagnosticSessionV3, DifficultyPreset, OperationArchetype, WeaponType } from '../types/game';
import { getPlatformStorage } from './PlatformRuntime';

export const DIAGNOSTICS_STORAGE_KEY = 'STRIKE_VECTOR_DIAGNOSTICS_V3';
export const LEGACY_DIAGNOSTICS_V2_STORAGE_KEY = 'STRIKE_VECTOR_DIAGNOSTICS_V2';
export const LEGACY_DIAGNOSTICS_STORAGE_KEY = 'STRIKE_VECTOR_DIAGNOSTICS_V1';
export const MAX_DIAGNOSTIC_SESSIONS = 100;

export interface MissionDiagnosticAggregate {
  missionId: string; sorties: number; victories: number; averageSeconds: number;
  accuracyPercent: number; damageReceived: number; survivalPercent: number;
  landingGrades: Record<string, number>; deathCauses: Record<string, number>;
}

export interface DifficultyDiagnosticAggregate {
  difficulty: DifficultyPreset; sorties: number; victoryPercent: number;
  accuracyPercent: number; averageDamage: number; averageCombatSeconds: number;
  warningAcknowledgementPercent: number;
}

export interface BalanceCoverageByDifficulty {
  difficulty: DifficultyPreset;
  campaignVictories: number;
  campaignRequired: number;
  completedDeployments: number;
  deploymentsRequired: number;
  coveredArchetypes: OperationArchetype[];
  archetypesRequired: number;
  complete: boolean;
}

export function sanitiseDiagnosticSession(value: unknown): DiagnosticSession | null {
  if (!value || typeof value !== 'object') return null;
  const item = value as Partial<Omit<DiagnosticSessionV1, 'version'>> & Partial<Omit<DiagnosticSessionV2, 'version'>> & Partial<Omit<DiagnosticSessionV3, 'version'>> & { version?: number };
  if (![1, 2, 3].includes(item.version ?? 0) || typeof item.missionId !== 'string') return null;
  if (!['ARCADE', 'PILOT', 'VETERAN'].includes(item.difficulty || '')) return null;
  if (!['VICTORY', 'FAILURE', 'ABORTED'].includes(item.result || '')) return null;
  const weaponsUsed = sanitiseWeaponRecord(item.weaponsUsed, true);
  const weaponHits = sanitiseWeaponRecord(item.version === 3 ? item.weaponHits : undefined, false);
  const damage = item.version === 3 && item.damageReceived && typeof item.damageReceived === 'object' ? item.damageReceived : undefined;
  return {
    version: 3,
    buildId: typeof item.buildId === 'string' && item.buildId.length > 0 ? item.buildId : null,
    missionId: item.missionId,
    difficulty: item.difficulty as DifficultyPreset,
    simulationTicks: positiveInteger(item.simulationTicks),
    result: item.result as DiagnosticSessionV1['result'],
    completedObjectiveIds: Array.isArray(item.completedObjectiveIds) ? item.completedObjectiveIds.filter((id): id is string => typeof id === 'string') : [],
    deathCause: ['TERRAIN', 'ENEMY_FIRE', 'DEFENDED_ASSET_LOST', 'FUEL', 'OTHER'].includes(item.deathCause || '') ? item.deathCause as DiagnosticSessionV1['deathCause'] : null,
    weaponsUsed,
    landingGrade: ['PERFECT', 'SAFE', 'HARD', 'FAILED'].includes(item.landingGrade || '') ? item.landingGrade as DiagnosticSessionV1['landingGrade'] : null,
    tutorialStepsCompleted: Math.max(0, Math.min(9, positiveInteger(item.tutorialStepsCompleted))),
    tutorialSkipped: Boolean(item.tutorialSkipped),
    operationSeed: item.version >= 2 && Number.isFinite(item.operationSeed) ? Number(item.operationSeed) >>> 0 : null,
    operationArchetype: item.version >= 2 && isOperationArchetype(item.operationArchetype) ? item.operationArchetype : null,
    operationSortieIndex: item.version >= 2 && Number.isFinite(item.operationSortieIndex) ? Math.max(0, Math.min(2, Math.round(Number(item.operationSortieIndex)))) : null,
    operationRetryCount: item.version >= 2 ? positiveInteger(item.operationRetryCount) : 0,
    damageReceived: {
      AIRCRAFT_GUN: positiveNumber(damage?.AIRCRAFT_GUN), SAM_MISSILE: positiveNumber(damage?.SAM_MISSILE),
      FLAK: positiveNumber(damage?.FLAK), GROUND_FIRE: positiveNumber(damage?.GROUND_FIRE), IMPACT: positiveNumber(damage?.IMPACT),
    },
    weaponHits: { CANNON: weaponHits.CANNON, MISSILE: weaponHits.MISSILE, BOMB: weaponHits.BOMB, ROCKET: weaponHits.ROCKET },
    enemyAircraftDestroyed: item.version === 3 ? positiveInteger(item.enemyAircraftDestroyed) : 0,
    missileWarnings: item.version === 3 ? positiveInteger(item.missileWarnings) : 0,
    warningAcknowledgements: item.version === 3 ? positiveInteger(item.warningAcknowledgements) : 0,
    countermeasureSuccesses: item.version === 3 ? positiveInteger(item.countermeasureSuccesses) : 0,
    combatTicks: item.version === 3 ? positiveInteger(item.combatTicks) : 0,
    aircraftLossPhase: item.version === 3 && ['NONE', 'EJECTION', 'LOW_ALTITUDE_IMPACT'].includes(item.aircraftLossPhase || '') ? item.aircraftLossPhase as DiagnosticSessionV3['aircraftLossPhase'] : 'NONE',
  };
}

export function loadDiagnostics(storage: Pick<Storage, 'getItem'> = getPlatformStorage()): DiagnosticSession[] {
  try {
    const parsed = JSON.parse(storage.getItem(DIAGNOSTICS_STORAGE_KEY) || storage.getItem(LEGACY_DIAGNOSTICS_V2_STORAGE_KEY) || storage.getItem(LEGACY_DIAGNOSTICS_STORAGE_KEY) || '[]');
    if (!Array.isArray(parsed)) return [];
    return parsed.map(sanitiseDiagnosticSession).filter((item): item is DiagnosticSession => item !== null).slice(-MAX_DIAGNOSTIC_SESSIONS);
  } catch { return []; }
}

export function appendDiagnostic(session: DiagnosticSessionV1 | DiagnosticSessionV2 | DiagnosticSessionV3, storage: Pick<Storage, 'getItem' | 'setItem'> = getPlatformStorage()): DiagnosticSession[] {
  const normalised = sanitiseDiagnosticSession(session);
  const sessions = normalised ? [...loadDiagnostics(storage as Storage), normalised].slice(-MAX_DIAGNOSTIC_SESSIONS) : loadDiagnostics(storage as Storage);
  try { storage.setItem(DIAGNOSTICS_STORAGE_KEY, JSON.stringify(sessions)); } catch { /* Storage failure must never interrupt play. */ }
  return sessions;
}

export function clearDiagnostics(storage: Pick<Storage, 'removeItem'> = getPlatformStorage()): void {
  try { storage.removeItem(DIAGNOSTICS_STORAGE_KEY); storage.removeItem(LEGACY_DIAGNOSTICS_V2_STORAGE_KEY); storage.removeItem(LEGACY_DIAGNOSTICS_STORAGE_KEY); } catch { /* Ignore restricted storage. */ }
}

export function aggregateDiagnostics(sessions: DiagnosticSession[]): MissionDiagnosticAggregate[] {
  const byMission = new Map<string, DiagnosticSession[]>();
  for (const session of sessions) byMission.set(session.missionId, [...(byMission.get(session.missionId) || []), session]);
  return [...byMission.entries()].map(([missionId, items]) => ({
    missionId, sorties: items.length, victories: items.filter((item) => item.result === 'VICTORY').length,
    averageSeconds: Math.round(items.reduce((sum, item) => sum + item.simulationTicks / 60, 0) / items.length),
    accuracyPercent: calculateAccuracy(items), damageReceived: Math.round(totalDamage(items)),
    survivalPercent: Math.round(items.filter((item) => item.aircraftLossPhase === 'NONE').length / items.length * 100),
    landingGrades: countValues(items.map((item) => item.landingGrade).filter(Boolean).map(String)),
    deathCauses: countValues(items.map((item) => item.deathCause).filter(Boolean).map(String)),
  })).sort((a, b) => a.missionId.localeCompare(b.missionId));
}

export function aggregateDifficultyDiagnostics(sessions: DiagnosticSession[]): DifficultyDiagnosticAggregate[] {
  return (['ARCADE', 'PILOT', 'VETERAN'] as DifficultyPreset[]).map((difficulty) => {
    const items = sessions.filter((session) => session.difficulty === difficulty);
    if (!items.length) return { difficulty, sorties: 0, victoryPercent: 0, accuracyPercent: 0, averageDamage: 0, averageCombatSeconds: 0, warningAcknowledgementPercent: 0 };
    const warned = items.filter((item) => item.missileWarnings > 0);
    return {
      difficulty, sorties: items.length,
      victoryPercent: Math.round(items.filter((item) => item.result === 'VICTORY').length / items.length * 100),
      accuracyPercent: calculateAccuracy(items), averageDamage: Math.round(totalDamage(items) / items.length),
      averageCombatSeconds: Math.round(items.reduce((sum, item) => sum + item.combatTicks / 60, 0) / items.length),
      warningAcknowledgementPercent: warned.length ? Math.round(warned.filter((item) => item.warningAcknowledgements > 0).length / warned.length * 100) : 0,
    };
  });
}

export function buildBalanceCoverage(sessions: DiagnosticSession[], campaignMissionIds: string[]): BalanceCoverageByDifficulty[] {
  const campaignIdSet = new Set(campaignMissionIds);
  const allArchetypes: OperationArchetype[] = ['FLEET_CAP', 'SEAD', 'ARMOURED_INTERDICTION', 'PILOT_RESCUE', 'FARP_DEFENCE', 'DEEP_STRIKE'];
  return (['ARCADE', 'PILOT', 'VETERAN'] as DifficultyPreset[]).map((difficulty) => {
    const victories = sessions.filter((session) => session.difficulty === difficulty && session.result === 'VICTORY');
    const campaignVictories = new Set(victories.filter((session) => campaignIdSet.has(session.missionId)).map((session) => session.missionId)).size;
    const operationVictories = victories.filter((session) => session.operationSeed !== null && session.operationSortieIndex !== null);
    const bySeed = new Map<number, DiagnosticSession[]>();
    for (const session of operationVictories) bySeed.set(session.operationSeed!, [...(bySeed.get(session.operationSeed!) || []), session]);
    const completedSeeds = [...bySeed.entries()]
      .filter(([, items]) => new Set(items.map((item) => item.operationSortieIndex)).size === 3)
      .map(([seed]) => seed);
    const completedSeedSet = new Set(completedSeeds);
    const coveredArchetypes = allArchetypes.filter((archetype) => operationVictories.some((session) => completedSeedSet.has(session.operationSeed!) && session.operationArchetype === archetype));
    return {
      difficulty,
      campaignVictories,
      campaignRequired: campaignMissionIds.length,
      completedDeployments: completedSeeds.length,
      deploymentsRequired: 2,
      coveredArchetypes,
      archetypesRequired: allArchetypes.length,
      complete: campaignVictories === campaignMissionIds.length && completedSeeds.length >= 2 && coveredArchetypes.length === allArchetypes.length,
    };
  });
}

export function exportDiagnosticsJson(sessions: Array<DiagnosticSessionV1 | DiagnosticSessionV2 | DiagnosticSessionV3>): string {
  return JSON.stringify({ version: 3, exportedSessions: sessions.map(sanitiseDiagnosticSession).filter((session): session is DiagnosticSession => session !== null) }, null, 2);
}

function calculateAccuracy(items: DiagnosticSession[]): number {
  const shots = items.reduce((sum, item) => sum + item.weaponsUsed.CANNON + item.weaponsUsed.MISSILE + item.weaponsUsed.BOMB + item.weaponsUsed.ROCKET, 0);
  const hits = items.reduce((sum, item) => sum + item.weaponHits.CANNON + item.weaponHits.MISSILE + item.weaponHits.BOMB + item.weaponHits.ROCKET, 0);
  return shots ? Math.round(hits / shots * 100) : 0;
}
function totalDamage(items: DiagnosticSession[]): number { return items.reduce((sum, item) => sum + Object.values(item.damageReceived).reduce((damage, value) => damage + value, 0), 0); }
function sanitiseWeaponRecord(value: unknown, includeFlare: boolean): Record<WeaponType, number> {
  const source = value && typeof value === 'object' ? value as Partial<Record<WeaponType, number>> : {};
  return { CANNON: positiveInteger(source.CANNON), MISSILE: positiveInteger(source.MISSILE), BOMB: positiveInteger(source.BOMB), ROCKET: positiveInteger(source.ROCKET), FLARE: includeFlare ? positiveInteger(source.FLARE) : 0 };
}
function positiveInteger(value: unknown): number { return Math.max(0, Math.round(Number(value) || 0)); }
function positiveNumber(value: unknown): number { return Math.max(0, Number(value) || 0); }
function countValues(values: string[]): Record<string, number> { return values.reduce<Record<string, number>>((result, value) => ({ ...result, [value]: (result[value] || 0) + 1 }), {}); }
function isOperationArchetype(value: unknown): value is OperationArchetype { return value === 'FLEET_CAP' || value === 'SEAD' || value === 'ARMOURED_INTERDICTION' || value === 'PILOT_RESCUE' || value === 'FARP_DEFENCE' || value === 'DEEP_STRIKE'; }
