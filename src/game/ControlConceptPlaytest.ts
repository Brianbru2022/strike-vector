import { InputDevice, PlaytestRunResult, ValidationScenario } from '../types/game';
import { getPlatformStorage } from './PlatformRuntime';
import { RELEASE_INFO } from './Release';
import { sanitisePlaytestRunResult, STANDARD_ACCESSIBILITY } from './Validation';

export const CONTROL_CONCEPT_STORAGE_KEY = 'IRON_KESTREL_CONTROL_CONCEPT_PLAYTEST_V1';
export const CONTROL_CONCEPT_BUILD_ID = RELEASE_INFO.buildId;
export const MAX_CONTROL_CONCEPT_EVIDENCE = 25;

export type ControlConceptExperience = 'NOVICE' | 'EXPERIENCED';
export type ControlConceptRating = 'INDEPENDENT' | 'HESITANT' | 'NOT_UNDERSTOOD';
export type ControlConceptId = 'PITCH' | 'DIRECTION' | 'ALTITUDE' | 'VTOL' | 'TARGET_AND_FIRE' | 'THREATS' | 'COUNTERMEASURES' | 'FUEL_AND_DAMAGE' | 'RECOVERY' | 'FAILURE_REASON';
export type ControlConceptConfusion = 'PITCH_VS_ALTITUDE' | 'DIRECTION_VS_THROTTLE' | 'VTOL_TRANSITION' | 'TARGET_LOCK' | 'WEAPON_SELECTION' | 'THREAT_WARNING' | 'COUNTERMEASURE_TIMING' | 'FUEL_OR_DAMAGE' | 'RECOVERY_APPROACH' | 'OTHER';

export interface ControlConceptSlot {
  id: 'P01' | 'P02' | 'P03' | 'P04' | 'P05';
  order: number;
  experience: ControlConceptExperience;
}

export interface ControlConceptObservation {
  rating: ControlConceptRating;
  comprehensionSeconds: number | null;
}

export interface ControlConceptResponseV1 {
  observations: Record<ControlConceptId, ControlConceptObservation>;
  confusionPoints: ControlConceptConfusion[];
  wantedAnotherSortie: boolean;
  requestedAnotherSortieWithoutPrompt: boolean;
  outsideHelpGiven: boolean;
}

export interface ControlConceptEvidenceV1 {
  version: 1;
  buildId: string;
  slotId: ControlConceptSlot['id'];
  experience: ControlConceptExperience;
  completedAt: string;
  cleanSnapshot: true;
  guidedMission: true;
  run: PlaytestRunResult;
  response: ControlConceptResponseV1;
}

export interface ControlConceptSummary {
  buildId: string;
  currentBuildCount: number;
  historicalCount: number;
  completedSlotIds: string[];
  noviceCount: number;
  experiencedCount: number;
  wantsAnotherSortieCount: number;
  unpromptedAnotherSortieCount: number;
  independentlyUnderstoodCounts: Record<ControlConceptId, number>;
  confusionCounts: Partial<Record<ControlConceptConfusion, number>>;
  complete: boolean;
  issues: string[];
}

export const CONTROL_CONCEPT_SLOTS: readonly ControlConceptSlot[] = Object.freeze([
  { id: 'P01', order: 1, experience: 'NOVICE' },
  { id: 'P02', order: 2, experience: 'NOVICE' },
  { id: 'P03', order: 3, experience: 'NOVICE' },
  { id: 'P04', order: 4, experience: 'EXPERIENCED' },
  { id: 'P05', order: 5, experience: 'EXPERIENCED' },
]);

export const CONTROL_CONCEPT_LABELS: Record<ControlConceptId, string> = {
  PITCH: 'Pitch control',
  DIRECTION: 'Left/right flight direction and low-speed reversal',
  ALTITUDE: 'Altitude control',
  VTOL: 'VTOL transition',
  TARGET_AND_FIRE: 'Target acquisition and firing',
  THREATS: 'Incoming-threat recognition',
  COUNTERMEASURES: 'Countermeasure use',
  FUEL_AND_DAMAGE: 'Fuel and damage interpretation',
  RECOVERY: 'Carrier recovery',
  FAILURE_REASON: 'Reason for failure',
};

export const CONTROL_CONCEPT_IDS = Object.freeze(Object.keys(CONTROL_CONCEPT_LABELS) as ControlConceptId[]);

export const CONTROL_CONFUSION_LABELS: Record<ControlConceptConfusion, string> = {
  PITCH_VS_ALTITUDE: 'Pitch versus altitude',
  DIRECTION_VS_THROTTLE: 'Flight direction versus speed expectation',
  VTOL_TRANSITION: 'VTOL transition',
  TARGET_LOCK: 'Target lock',
  WEAPON_SELECTION: 'Weapon selection',
  THREAT_WARNING: 'Threat warning',
  COUNTERMEASURE_TIMING: 'Countermeasure timing',
  FUEL_OR_DAMAGE: 'Fuel or damage display',
  RECOVERY_APPROACH: 'Recovery approach',
  OTHER: 'Other observed confusion',
};

const ratingValues: ControlConceptRating[] = ['INDEPENDENT', 'HESITANT', 'NOT_UNDERSTOOD'];
const confusionValues = Object.keys(CONTROL_CONFUSION_LABELS) as ControlConceptConfusion[];

export function createControlConceptScenario(slot: ControlConceptSlot, inputDevice: InputDevice): ValidationScenario {
  return {
    id: `CC-${slot.id}`,
    order: slot.order,
    title: `${slot.experience === 'NOVICE' ? 'Novice' : 'Experienced'} guided control test`,
    missionId: 'm1_coastal_strike',
    difficulty: 'PILOT',
    deviceClass: inputDevice === 'TOUCH' ? 'MOBILE_TOUCH' : inputDevice === 'GAMEPAD' ? 'DESKTOP_GAMEPAD' : 'DESKTOP_KEYBOARD',
    inputProfile: 'DEFAULT',
    guidedTraining: true,
    loadout: 'FLEET_CAP',
    accessibility: STANDARD_ACCESSIBILITY,
    instruction: 'Start from the clean isolated snapshot. Give no control coaching beyond the game itself.',
    requiresCombatDamage: false,
  };
}

const sanitiseObservation = (value: unknown): ControlConceptObservation | null => {
  if (!value || typeof value !== 'object') return null;
  const source = value as Partial<ControlConceptObservation>;
  if (!ratingValues.includes(source.rating as ControlConceptRating)) return null;
  const comprehensionSeconds = source.comprehensionSeconds === null
    ? null
    : Number.isFinite(source.comprehensionSeconds) ? Math.max(0, Math.min(3600, Math.round(source.comprehensionSeconds!))) : null;
  return { rating: source.rating as ControlConceptRating, comprehensionSeconds };
};

export function sanitiseControlConceptResponse(value: unknown): ControlConceptResponseV1 | null {
  if (!value || typeof value !== 'object') return null;
  const source = value as Partial<ControlConceptResponseV1>;
  if (!source.observations || typeof source.observations !== 'object') return null;
  const observations = {} as Record<ControlConceptId, ControlConceptObservation>;
  for (const id of CONTROL_CONCEPT_IDS) {
    const observation = sanitiseObservation(source.observations[id]);
    if (!observation) return null;
    observations[id] = observation;
  }
  const confusionPoints = Array.isArray(source.confusionPoints)
    ? [...new Set(source.confusionPoints.filter((item): item is ControlConceptConfusion => confusionValues.includes(item as ControlConceptConfusion)))].slice(0, confusionValues.length)
    : [];
  if (typeof source.wantedAnotherSortie !== 'boolean' || typeof source.requestedAnotherSortieWithoutPrompt !== 'boolean' || typeof source.outsideHelpGiven !== 'boolean') return null;
  return { observations, confusionPoints, wantedAnotherSortie: source.wantedAnotherSortie, requestedAnotherSortieWithoutPrompt: source.requestedAnotherSortieWithoutPrompt, outsideHelpGiven: source.outsideHelpGiven };
}

export function sanitiseControlConceptEvidence(value: unknown): ControlConceptEvidenceV1 | null {
  if (!value || typeof value !== 'object') return null;
  const source = value as Partial<ControlConceptEvidenceV1>;
  const slot = CONTROL_CONCEPT_SLOTS.find((item) => item.id === source.slotId);
  const response = sanitiseControlConceptResponse(source.response);
  const run = sanitisePlaytestRunResult(source.run);
  if (source.version !== 1 || !slot || source.experience !== slot.experience || typeof source.buildId !== 'string' || !response || !run) return null;
  if (typeof source.completedAt !== 'string' || Number.isNaN(Date.parse(source.completedAt))) return null;
  return { version: 1, buildId: source.buildId, slotId: slot.id, experience: slot.experience, completedAt: source.completedAt, cleanSnapshot: true, guidedMission: true, run, response };
}

export function loadControlConceptEvidence(storage: Pick<Storage, 'getItem'> = getPlatformStorage()): ControlConceptEvidenceV1[] {
  try {
    const value = JSON.parse(storage.getItem(CONTROL_CONCEPT_STORAGE_KEY) ?? '[]');
    if (!Array.isArray(value)) return [];
    return value.map(sanitiseControlConceptEvidence).filter((item): item is ControlConceptEvidenceV1 => item !== null).slice(-MAX_CONTROL_CONCEPT_EVIDENCE);
  } catch { return []; }
}

export function appendControlConceptEvidence(evidence: ControlConceptEvidenceV1, storage: Pick<Storage, 'getItem' | 'setItem'> = getPlatformStorage()): ControlConceptEvidenceV1[] {
  const clean = sanitiseControlConceptEvidence(evidence);
  const current = loadControlConceptEvidence(storage as Storage);
  const next = clean ? [...current, clean].slice(-MAX_CONTROL_CONCEPT_EVIDENCE) : current;
  try { storage.setItem(CONTROL_CONCEPT_STORAGE_KEY, JSON.stringify(next)); } catch { /* Evidence must not interrupt play. */ }
  return next;
}

export function clearControlConceptEvidence(storage: Pick<Storage, 'removeItem'> = getPlatformStorage()): void {
  try { storage.removeItem(CONTROL_CONCEPT_STORAGE_KEY); } catch { /* Ignore restricted storage. */ }
}

export function aggregateControlConceptEvidence(evidence: ControlConceptEvidenceV1[], buildId = CONTROL_CONCEPT_BUILD_ID): ControlConceptSummary {
  const current = evidence.filter((item) => item.buildId === buildId);
  const latest = new Map<string, ControlConceptEvidenceV1>();
  for (const item of current) latest.set(item.slotId, item);
  const runs = [...latest.values()];
  const independentlyUnderstoodCounts = Object.fromEntries(CONTROL_CONCEPT_IDS.map((id) => [id, runs.filter((item) => item.response.observations[id].rating === 'INDEPENDENT').length])) as Record<ControlConceptId, number>;
  const confusionCounts: Partial<Record<ControlConceptConfusion, number>> = {};
  for (const item of runs) for (const point of item.response.confusionPoints) confusionCounts[point] = (confusionCounts[point] ?? 0) + 1;
  const noviceCount = runs.filter((item) => item.experience === 'NOVICE').length;
  const experiencedCount = runs.filter((item) => item.experience === 'EXPERIENCED').length;
  const issues: string[] = [];
  if (runs.length !== CONTROL_CONCEPT_SLOTS.length) issues.push(`Complete all ${CONTROL_CONCEPT_SLOTS.length} current-build participant slots.`);
  if (noviceCount !== 3) issues.push('Three novice-player sessions are required.');
  if (experiencedCount !== 2) issues.push('Two experienced-player sessions are required.');
  if (runs.some((item) => item.response.outsideHelpGiven)) issues.push('At least one session received outside control coaching and must be rerun.');
  return {
    buildId,
    currentBuildCount: current.length,
    historicalCount: evidence.length - current.length,
    completedSlotIds: [...latest.keys()].sort(),
    noviceCount,
    experiencedCount,
    wantsAnotherSortieCount: runs.filter((item) => item.response.wantedAnotherSortie).length,
    unpromptedAnotherSortieCount: runs.filter((item) => item.response.requestedAnotherSortieWithoutPrompt).length,
    independentlyUnderstoodCounts,
    confusionCounts,
    complete: issues.length === 0,
    issues,
  };
}

export function exportControlConceptEvidenceJson(evidence: ControlConceptEvidenceV1[]): string {
  const clean = evidence.map(sanitiseControlConceptEvidence).filter((item): item is ControlConceptEvidenceV1 => item !== null);
  return JSON.stringify({
    version: 1,
    buildId: CONTROL_CONCEPT_BUILD_ID,
    exportedAt: new Date().toISOString(),
    evidence: clean,
    summary: aggregateControlConceptEvidence(clean),
    privacy: 'Observer-coded control concepts only. No names, contact details, raw controls, network identifiers or automatic transmission.',
  }, null, 2);
}
